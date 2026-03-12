# Source Data Sync Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the engine that pulls data from BigQuery into MapForge's PostgreSQL cache, tracks record state (new/existing/changed/removed), and preserves existing classifications across refreshes.

**Architecture:** A sync service compares incoming BigQuery rows against existing `enrichment_records` by composite unique key. It implements the record state machine from the PRD (NEW -> EXISTING/CHANGED/REMOVED -> ARCHIVED). Schema drift detection alerts admins when BigQuery columns change. The sync runs as a background operation triggered manually or by cron schedule.

**Tech Stack:** Drizzle ORM, `@google-cloud/bigquery` (via BigQuery service from Plan 1), node-cron, Vitest

**Depends on:** BigQuery Integration (Plan 1) must be complete.

---

## File Structure

| File | Responsibility |
|------|---------------|
| `server/src/services/source-sync.ts` | Core sync logic: pull from BQ, diff against local, update states |
| `server/src/services/schema-drift.ts` | Detect and report schema changes between refreshes |
| `server/src/services/sync-scheduler.ts` | Cron-based scheduling for automatic refreshes |
| `server/src/__tests__/source-sync.test.ts` | Unit tests for sync logic |
| `server/src/__tests__/schema-drift.test.ts` | Unit tests for schema drift detection |
| `shared/src/types/sync.ts` | Shared types for sync results and status |

---

## Chunk 1: Core Sync Engine

### Task 1: Shared Sync Types

**Files:**
- Create: `shared/src/types/sync.ts`
- Modify: `shared/src/types/index.ts`

- [ ] **Step 1: Define sync types**

```typescript
// shared/src/types/sync.ts
export type RecordState = 'new' | 'existing' | 'changed' | 'removed' | 'archived';

export interface SyncResult {
  exerciseId: string;
  startedAt: string;
  completedAt: string;
  newRecords: number;
  existingRecords: number;
  changedRecords: number;
  removedRecords: number;
  totalSourceRows: number;
  errors: string[];
}

export interface SchemaDriftReport {
  exerciseId: string;
  addedColumns: string[];
  removedColumns: string[];
  typeChanges: Array<{ column: string; oldType: string; newType: string }>;
  hasDrift: boolean;
}

export interface SyncStatus {
  exerciseId: string;
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  schedule: string | null; // cron expression
  isRunning: boolean;
}
```

- [ ] **Step 2: Export from shared index**

Add `export * from './sync';` to `shared/src/types/index.ts`.

- [ ] **Step 3: Commit**

```bash
git add shared/src/types/sync.ts shared/src/types/index.ts
git commit -m "feat: add shared sync types"
```

---

### Task 2: Source Sync Service

**Files:**
- Create: `server/src/services/source-sync.ts`
- Create: `server/src/__tests__/source-sync.test.ts`

- [ ] **Step 1: Write failing tests for sync logic**

```typescript
// server/src/__tests__/source-sync.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { diffRecords } from '../services/source-sync';

describe('source-sync diffRecords', () => {
  const uniqueKeyColumns = ['siteId', 'programId'];

  it('identifies new records not in local store', () => {
    const sourceRows = [
      { siteId: '1', programId: 'A', name: 'Program A' },
      { siteId: '2', programId: 'B', name: 'Program B' },
    ];
    const existingRecords: Array<{ uniqueKey: Record<string, string>; sourceData: Record<string, unknown>; id: string }> = [];

    const diff = diffRecords(sourceRows, existingRecords, uniqueKeyColumns);
    expect(diff.newRecords).toHaveLength(2);
    expect(diff.changedRecords).toHaveLength(0);
    expect(diff.removedRecords).toHaveLength(0);
    expect(diff.unchangedRecords).toHaveLength(0);
  });

  it('identifies unchanged records', () => {
    const sourceRows = [{ siteId: '1', programId: 'A', name: 'Same' }];
    const existingRecords = [{
      id: 'r1',
      uniqueKey: { siteId: '1', programId: 'A' },
      sourceData: { siteId: '1', programId: 'A', name: 'Same' },
    }];

    const diff = diffRecords(sourceRows, existingRecords, uniqueKeyColumns);
    expect(diff.newRecords).toHaveLength(0);
    expect(diff.unchangedRecords).toHaveLength(1);
  });

  it('identifies changed records when source data differs', () => {
    const sourceRows = [{ siteId: '1', programId: 'A', name: 'Updated' }];
    const existingRecords = [{
      id: 'r1',
      uniqueKey: { siteId: '1', programId: 'A' },
      sourceData: { siteId: '1', programId: 'A', name: 'Old' },
    }];

    const diff = diffRecords(sourceRows, existingRecords, uniqueKeyColumns);
    expect(diff.changedRecords).toHaveLength(1);
    expect(diff.changedRecords[0].id).toBe('r1');
  });

  it('identifies removed records not in source', () => {
    const sourceRows: Record<string, unknown>[] = [];
    const existingRecords = [{
      id: 'r1',
      uniqueKey: { siteId: '1', programId: 'A' },
      sourceData: { siteId: '1', programId: 'A', name: 'Gone' },
    }];

    const diff = diffRecords(sourceRows, existingRecords, uniqueKeyColumns);
    expect(diff.removedRecords).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npx vitest run src/__tests__/source-sync.test.ts`
Expected: FAIL -- diffRecords not found

- [ ] **Step 3: Implement sync service**

```typescript
// server/src/services/source-sync.ts
import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection';
import { enrichmentRecords, enrichmentExercises, bigquerySources, exerciseColumns } from '../db/schema';
import { BigQueryService } from './bigquery';
import { decryptCredential } from './credentials';
import { storedCredentials } from '../db/schema';
import type { SyncResult } from '@mapforge/shared';

interface ExistingRecord {
  id: string;
  uniqueKey: Record<string, string>;
  sourceData: Record<string, unknown>;
}

interface DiffResult {
  newRecords: Record<string, unknown>[];
  changedRecords: Array<ExistingRecord & { newSourceData: Record<string, unknown> }>;
  removedRecords: ExistingRecord[];
  unchangedRecords: ExistingRecord[];
}

export function buildUniqueKey(row: Record<string, unknown>, keyColumns: string[]): string {
  return keyColumns.map(k => String(row[k] ?? '')).join('::');
}

export function diffRecords(
  sourceRows: Record<string, unknown>[],
  existingRecords: ExistingRecord[],
  uniqueKeyColumns: string[]
): DiffResult {
  const existingByKey = new Map<string, ExistingRecord>();
  for (const rec of existingRecords) {
    const key = uniqueKeyColumns.map(k => String(rec.uniqueKey[k] ?? '')).join('::');
    existingByKey.set(key, rec);
  }

  const newRecords: Record<string, unknown>[] = [];
  const changedRecords: DiffResult['changedRecords'] = [];
  const unchangedRecords: ExistingRecord[] = [];
  const seenKeys = new Set<string>();

  for (const row of sourceRows) {
    const key = buildUniqueKey(row, uniqueKeyColumns);
    seenKeys.add(key);
    const existing = existingByKey.get(key);

    if (!existing) {
      newRecords.push(row);
    } else {
      const sourceChanged = JSON.stringify(existing.sourceData) !== JSON.stringify(row);
      if (sourceChanged) {
        changedRecords.push({ ...existing, newSourceData: row });
      } else {
        unchangedRecords.push(existing);
      }
    }
  }

  const removedRecords = existingRecords.filter(rec => {
    const key = uniqueKeyColumns.map(k => String(rec.uniqueKey[k] ?? '')).join('::');
    return !seenKeys.has(key);
  });

  return { newRecords, changedRecords, removedRecords, unchangedRecords };
}

export async function syncExerciseData(exerciseId: string): Promise<SyncResult> {
  const startedAt = new Date().toISOString();
  const errors: string[] = [];

  // 1. Get exercise config
  const [exercise] = await db
    .select()
    .from(enrichmentExercises)
    .where(eq(enrichmentExercises.id, exerciseId));

  if (!exercise) throw new Error(`Exercise ${exerciseId} not found`);

  // 2. Get BigQuery source config
  const [source] = await db
    .select()
    .from(bigquerySources)
    .where(eq(bigquerySources.exerciseId, exerciseId));

  if (!source) throw new Error(`No BigQuery source configured for exercise ${exerciseId}`);

  // 3. Get credential and create BQ client
  const [cred] = await db
    .select()
    .from(storedCredentials)
    .where(eq(storedCredentials.id, source.credentialId!));

  if (!cred) throw new Error('Credential not found');

  const encryptionKey = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!encryptionKey) throw new Error('Encryption key not configured');

  const credJson = decryptCredential(cred.encryptedValue, encryptionKey);
  const bq = new BigQueryService(credJson);

  // 4. Pull source data from BigQuery
  const query = source.queryType === 'table'
    ? `SELECT * FROM \`${source.gcpProject}.${source.dataset}.${source.tableOrQuery}\``
    : source.tableOrQuery;

  const sourceRows = await bq.executeQuery(query);

  // 5. Get existing records from local DB
  const existingRecords = await db
    .select({
      id: enrichmentRecords.id,
      uniqueKey: enrichmentRecords.uniqueKey,
      sourceData: enrichmentRecords.sourceData,
    })
    .from(enrichmentRecords)
    .where(eq(enrichmentRecords.exerciseId, exerciseId));

  const typedExisting = existingRecords.map(r => ({
    id: r.id,
    uniqueKey: r.uniqueKey as Record<string, string>,
    sourceData: r.sourceData as Record<string, unknown>,
  }));

  // 6. Diff
  const uniqueKeyColumns = exercise.uniqueKeyColumns ?? [];
  const diff = diffRecords(sourceRows, typedExisting, uniqueKeyColumns);

  // 7. Apply changes

  // Insert new records
  for (const row of diff.newRecords) {
    const uniqueKey: Record<string, string> = {};
    for (const k of uniqueKeyColumns) {
      uniqueKey[k] = String(row[k] ?? '');
    }
    await db.insert(enrichmentRecords).values({
      exerciseId,
      uniqueKey,
      sourceData: row,
      classifications: {},
      recordState: 'new',
      validationErrors: [],
      isFullyClassified: false,
    });
  }

  // Update changed records
  for (const rec of diff.changedRecords) {
    await db
      .update(enrichmentRecords)
      .set({
        sourceData: rec.newSourceData,
        recordState: 'changed',
        updatedAt: new Date(),
      })
      .where(eq(enrichmentRecords.id, rec.id));
  }

  // Mark removed records
  for (const rec of diff.removedRecords) {
    await db
      .update(enrichmentRecords)
      .set({
        recordState: 'removed',
        updatedAt: new Date(),
      })
      .where(eq(enrichmentRecords.id, rec.id));
  }

  // Mark unchanged as existing (in case they were previously 'new' or 'changed')
  for (const rec of diff.unchangedRecords) {
    await db
      .update(enrichmentRecords)
      .set({ recordState: 'existing', updatedAt: new Date() })
      .where(eq(enrichmentRecords.id, rec.id));
  }

  // 8. Update source last refreshed
  await db
    .update(bigquerySources)
    .set({
      lastRefreshedAt: new Date(),
      lastRowCount: sourceRows.length,
    })
    .where(eq(bigquerySources.exerciseId, exerciseId));

  return {
    exerciseId,
    startedAt,
    completedAt: new Date().toISOString(),
    newRecords: diff.newRecords.length,
    existingRecords: diff.unchangedRecords.length,
    changedRecords: diff.changedRecords.length,
    removedRecords: diff.removedRecords.length,
    totalSourceRows: sourceRows.length,
    errors,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npx vitest run src/__tests__/source-sync.test.ts`
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/services/source-sync.ts server/src/__tests__/source-sync.test.ts
git commit -m "feat: add source data sync engine with record state diffing"
```

---

## Chunk 2: Schema Drift Detection

### Task 3: Schema Drift Service

**Files:**
- Create: `server/src/services/schema-drift.ts`
- Create: `server/src/__tests__/schema-drift.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// server/src/__tests__/schema-drift.test.ts
import { describe, it, expect } from 'vitest';
import { detectSchemaDrift } from '../services/schema-drift';
import type { BigQueryColumnInfo } from '@mapforge/shared';

describe('schema drift detection', () => {
  it('detects no drift when schemas match', () => {
    const previous: BigQueryColumnInfo[] = [
      { name: 'id', type: 'STRING', mode: 'REQUIRED' },
      { name: 'name', type: 'STRING', mode: 'NULLABLE' },
    ];
    const current = [...previous];
    const report = detectSchemaDrift('ex1', previous, current);
    expect(report.hasDrift).toBe(false);
  });

  it('detects added columns', () => {
    const previous: BigQueryColumnInfo[] = [{ name: 'id', type: 'STRING', mode: 'REQUIRED' }];
    const current: BigQueryColumnInfo[] = [
      { name: 'id', type: 'STRING', mode: 'REQUIRED' },
      { name: 'email', type: 'STRING', mode: 'NULLABLE' },
    ];
    const report = detectSchemaDrift('ex1', previous, current);
    expect(report.hasDrift).toBe(true);
    expect(report.addedColumns).toContain('email');
  });

  it('detects removed columns', () => {
    const previous: BigQueryColumnInfo[] = [
      { name: 'id', type: 'STRING', mode: 'REQUIRED' },
      { name: 'legacy', type: 'STRING', mode: 'NULLABLE' },
    ];
    const current: BigQueryColumnInfo[] = [{ name: 'id', type: 'STRING', mode: 'REQUIRED' }];
    const report = detectSchemaDrift('ex1', previous, current);
    expect(report.hasDrift).toBe(true);
    expect(report.removedColumns).toContain('legacy');
  });

  it('detects type changes', () => {
    const previous: BigQueryColumnInfo[] = [{ name: 'count', type: 'STRING', mode: 'NULLABLE' }];
    const current: BigQueryColumnInfo[] = [{ name: 'count', type: 'INTEGER', mode: 'NULLABLE' }];
    const report = detectSchemaDrift('ex1', previous, current);
    expect(report.hasDrift).toBe(true);
    expect(report.typeChanges).toHaveLength(1);
    expect(report.typeChanges[0]).toEqual({ column: 'count', oldType: 'STRING', newType: 'INTEGER' });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npx vitest run src/__tests__/schema-drift.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement schema drift detection**

```typescript
// server/src/services/schema-drift.ts
import type { BigQueryColumnInfo, SchemaDriftReport } from '@mapforge/shared';

export function detectSchemaDrift(
  exerciseId: string,
  previousSchema: BigQueryColumnInfo[],
  currentSchema: BigQueryColumnInfo[]
): SchemaDriftReport {
  const prevByName = new Map(previousSchema.map(c => [c.name, c]));
  const currByName = new Map(currentSchema.map(c => [c.name, c]));

  const addedColumns: string[] = [];
  const removedColumns: string[] = [];
  const typeChanges: SchemaDriftReport['typeChanges'] = [];

  for (const [name, col] of currByName) {
    if (!prevByName.has(name)) {
      addedColumns.push(name);
    } else {
      const prev = prevByName.get(name)!;
      if (prev.type !== col.type) {
        typeChanges.push({ column: name, oldType: prev.type, newType: col.type });
      }
    }
  }

  for (const name of prevByName.keys()) {
    if (!currByName.has(name)) {
      removedColumns.push(name);
    }
  }

  const hasDrift = addedColumns.length > 0 || removedColumns.length > 0 || typeChanges.length > 0;

  return { exerciseId, addedColumns, removedColumns, typeChanges, hasDrift };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npx vitest run src/__tests__/schema-drift.test.ts`
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/services/schema-drift.ts server/src/__tests__/schema-drift.test.ts
git commit -m "feat: add schema drift detection for BigQuery source columns"
```

---

## Chunk 3: Sync Scheduler & API

### Task 4: Sync Scheduler

**Files:**
- Create: `server/src/services/sync-scheduler.ts`

- [ ] **Step 1: Install node-cron**

```bash
cd server && npm install node-cron && npm install -D @types/node-cron
```

- [ ] **Step 2: Implement scheduler**

```typescript
// server/src/services/sync-scheduler.ts
import cron from 'node-cron';
import { db } from '../db/connection';
import { bigquerySources, enrichmentExercises } from '../db/schema';
import { isNotNull } from 'drizzle-orm';
import { syncExerciseData } from './source-sync';

const activeJobs = new Map<string, cron.ScheduledTask>();

export function startSyncScheduler(): void {
  // On startup, load all exercises with refresh schedules and register cron jobs
  loadScheduledSyncs().catch(err => console.error('Failed to load sync schedules:', err));
}

async function loadScheduledSyncs(): Promise<void> {
  const sources = await db
    .select({
      exerciseId: bigquerySources.exerciseId,
      schedule: bigquerySources.refreshSchedule,
    })
    .from(bigquerySources)
    .where(isNotNull(bigquerySources.refreshSchedule));

  for (const source of sources) {
    if (source.exerciseId && source.schedule) {
      scheduleSync(source.exerciseId, source.schedule);
    }
  }
}

export function scheduleSync(exerciseId: string, cronExpression: string): void {
  // Remove existing job if any
  cancelSync(exerciseId);

  if (!cron.validate(cronExpression)) {
    console.error(`Invalid cron expression for exercise ${exerciseId}: ${cronExpression}`);
    return;
  }

  const task = cron.schedule(cronExpression, async () => {
    console.log(`Running scheduled sync for exercise ${exerciseId}`);
    try {
      const result = await syncExerciseData(exerciseId);
      console.log(`Sync complete for ${exerciseId}:`, result);
    } catch (error) {
      console.error(`Sync failed for ${exerciseId}:`, error);
    }
  });

  activeJobs.set(exerciseId, task);
}

export function cancelSync(exerciseId: string): void {
  const existing = activeJobs.get(exerciseId);
  if (existing) {
    existing.stop();
    activeJobs.delete(exerciseId);
  }
}

export function getActiveSchedules(): Array<{ exerciseId: string }> {
  return Array.from(activeJobs.keys()).map(id => ({ exerciseId: id }));
}
```

- [ ] **Step 3: Commit**

```bash
git add server/src/services/sync-scheduler.ts
git commit -m "feat: add cron-based sync scheduler for automatic data refresh"
```

---

### Task 5: Sync API Route

**Files:**
- Modify: `server/src/routes/exercises.ts` (add refresh endpoint)

- [ ] **Step 1: Add refresh endpoint to exercises router**

Add to `server/src/routes/exercises.ts`:

```typescript
// POST /api/v1/exercises/:id/refresh -- trigger manual data refresh
router.post('/:id/refresh', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { syncExerciseData } = await import('../services/source-sync');
    const result = await syncExerciseData(id);
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    console.error('Sync error:', error);
    res.status(500).json({ error: message });
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/exercises.ts
git commit -m "feat: add manual data refresh endpoint for exercises"
```

---

### Task 6: Wire Up Real DB Queries for Exercise Records

**Files:**
- Modify: `server/src/routes/exercises.ts` (replace mock data in `GET /:id` and `GET /:id/records`)

- [ ] **Step 1: Replace mock exercise detail with real DB query**

Replace the `GET /:id` handler with a real Drizzle query that fetches the exercise, its source columns, and classification columns from the `enrichment_exercises` and `exercise_columns` tables.

- [ ] **Step 2: Replace mock records with real DB query**

Replace the `GET /:id/records` handler with a real Drizzle query against `enrichment_records`, with pagination, filtering, and search.

- [ ] **Step 3: Replace mock classify with real DB upsert**

Replace the `PUT /:id/records/:recordId/classify` handler with a real upsert to `enrichment_records.classifications` JSONB field, plus insert into `classification_history`.

- [ ] **Step 4: Replace mock bulk-classify with real DB batch operation**

Replace the `POST /:id/records/bulk-classify` handler with a real batch update, generating a `bulk_operation_id` for audit trail grouping.

- [ ] **Step 5: Run existing tests**

Run: `cd server && npx vitest run`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/exercises.ts
git commit -m "feat: replace mock exercise/record routes with real Drizzle queries"
```
