# Enhanced Reference Tables Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build full reference table management: CRUD with real DB queries, CSV import, BigQuery refresh, hierarchical column relationships, versioning, and cross-exercise sharing.

**Architecture:** Replace the current mock reference table route with a full REST API backed by Drizzle queries against `reference_tables` and `reference_table_rows`. CSV import uses `csv-parse`. BigQuery refresh reuses the BigQuery service from Plan 1. Hierarchical relationships are expressed as parent-child column pairs within a reference table's `columns` JSONB config. Versioning snapshots reference table state before each modification.

**Tech Stack:** Drizzle ORM, csv-parse, multer (file upload), BigQuery service, Vitest

**Depends on:** BigQuery Integration (Plan 1) for BQ refresh feature.

---

## File Structure

| File | Responsibility |
|------|---------------|
| `server/src/routes/reference-tables.ts` | Full CRUD + CSV import + BQ refresh routes (replaces current mock) |
| `server/src/services/csv-import.ts` | Parse CSV buffer into reference table rows |
| `server/src/services/reference-table-sync.ts` | Pull reference data from BigQuery on schedule |
| `server/src/__tests__/csv-import.test.ts` | Unit tests for CSV parsing |
| `server/src/__tests__/routes/reference-tables.test.ts` | Integration tests for reference table routes |
| `shared/src/types/reference-table.ts` | Shared types for reference tables |
| `client/src/api/reference-tables.ts` | Client API functions (replace/expand existing) |

---

## Chunk 1: Reference Table CRUD

### Task 1: Shared Reference Table Types

**Files:**
- Create: `shared/src/types/reference-table.ts`
- Modify: `shared/src/types/index.ts`

- [ ] **Step 1: Define reference table types**

```typescript
// shared/src/types/reference-table.ts
export interface ReferenceTableColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean';
  parentColumnKey?: string; // for hierarchical relationships
}

export interface ReferenceTableListItem {
  id: string;
  name: string;
  description: string | null;
  rowCount: number;
  columns: ReferenceTableColumn[];
  refreshSource: 'manual' | 'url' | 'sftp' | 'bigquery';
  lastRefreshedAt: string | null;
  createdAt: string;
}

export interface ReferenceTableDetail {
  id: string;
  name: string;
  description: string | null;
  columns: ReferenceTableColumn[];
  rows: ReferenceTableRow[];
  primaryKeyColumn: string | null;
  displayColumn: string | null;
  refreshSource: 'manual' | 'url' | 'sftp' | 'bigquery';
  refreshConfig: Record<string, unknown> | null;
  lastRefreshedAt: string | null;
}

export interface ReferenceTableRow {
  id: string;
  data: Record<string, unknown>;
  ordinal: number;
}

export interface CreateReferenceTablePayload {
  name: string;
  description?: string;
  columns: ReferenceTableColumn[];
  primaryKeyColumn?: string;
  displayColumn?: string;
}

export interface UpdateReferenceTablePayload {
  name?: string;
  description?: string;
  columns?: ReferenceTableColumn[];
  primaryKeyColumn?: string;
  displayColumn?: string;
}

export interface ReferenceTableVersion {
  id: string;
  referenceTableId: string;
  version: number;
  snapshot: { columns: ReferenceTableColumn[]; rows: ReferenceTableRow[] };
  createdAt: string;
  createdBy: string;
}
```

- [ ] **Step 2: Export from shared index**

Add `export * from './reference-table';` to `shared/src/types/index.ts`.

- [ ] **Step 3: Commit**

```bash
git add shared/src/types/reference-table.ts shared/src/types/index.ts
git commit -m "feat: add shared reference table types"
```

---

### Task 2: Add Version History Table to Schema

**Files:**
- Modify: `server/src/db/schema.ts`

- [ ] **Step 1: Add reference_table_versions table**

Add to `server/src/db/schema.ts`:

```typescript
export const referenceTableVersions = pgTable("reference_table_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  referenceTableId: uuid("reference_table_id").references(() => referenceTables.id).notNull(),
  version: integer("version").notNull(),
  snapshot: jsonb("snapshot").notNull(), // { columns, rows }
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
});
```

- [ ] **Step 2: Commit**

```bash
git add server/src/db/schema.ts
git commit -m "feat: add reference_table_versions table to schema"
```

---

### Task 3: Full Reference Table CRUD Routes

**Files:**
- Modify: `server/src/routes/reference-tables.ts` (complete rewrite)

- [ ] **Step 1: Rewrite reference-tables route with full CRUD**

Replace the mock implementation with real Drizzle queries:

```typescript
// server/src/routes/reference-tables.ts
import { Router } from 'express';
import type { Request, Response } from 'express';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/connection';
import { referenceTables, referenceTableRows, referenceTableVersions } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();
router.use(authMiddleware);

// GET /api/v1/reference-tables -- list all reference tables
router.get('/', async (req: Request, res: Response) => {
  const tables = await db.select().from(referenceTables)
    .where(eq(referenceTables.orgId, req.user!.orgId));
  res.json({ tables });
});

// POST /api/v1/reference-tables -- create
router.post('/', requireAdmin, async (req: Request, res: Response) => {
  const { name, description, columns, primaryKeyColumn, displayColumn } = req.body;

  const [table] = await db.insert(referenceTables).values({
    orgId: req.user!.orgId,
    name,
    description,
    columns,
    primaryKeyColumn,
    displayColumn,
    rowCount: 0,
    refreshSource: 'manual',
  }).returning();

  res.status(201).json(table);
});

// GET /api/v1/reference-tables/:id -- get with rows
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const [table] = await db.select().from(referenceTables)
    .where(eq(referenceTables.id, id));

  if (!table) {
    res.status(404).json({ error: 'Reference table not found' });
    return;
  }

  const rows = await db.select().from(referenceTableRows)
    .where(eq(referenceTableRows.referenceTableId, id))
    .orderBy(referenceTableRows.ordinal);

  res.json({ ...table, rows });
});

// PUT /api/v1/reference-tables/:id -- update metadata
router.put('/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const [updated] = await db.update(referenceTables)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(referenceTables.id, id))
    .returning();

  res.json(updated);
});

// DELETE /api/v1/reference-tables/:id
router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  await db.delete(referenceTableRows).where(eq(referenceTableRows.referenceTableId, id));
  await db.delete(referenceTableVersions).where(eq(referenceTableVersions.referenceTableId, id));
  await db.delete(referenceTables).where(eq(referenceTables.id, id));
  res.status(204).send();
});

// POST /api/v1/reference-tables/:id/rows -- add rows
router.post('/:id/rows', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { rows } = req.body; // Array<{ data: Record<string, unknown> }>

  // Get current max ordinal
  const [maxOrd] = await db.select({
    max: sql<number>`coalesce(max(${referenceTableRows.ordinal}), 0)::int`
  }).from(referenceTableRows)
    .where(eq(referenceTableRows.referenceTableId, id));

  let ordinal = (maxOrd?.max ?? 0) + 1;
  const inserted = [];

  for (const row of rows) {
    const [r] = await db.insert(referenceTableRows).values({
      referenceTableId: id,
      data: row.data,
      ordinal: ordinal++,
    }).returning();
    inserted.push(r);
  }

  // Update row count
  await db.update(referenceTables)
    .set({ rowCount: sql`(select count(*)::int from reference_table_rows where reference_table_id = ${id})` })
    .where(eq(referenceTables.id, id));

  res.status(201).json({ rows: inserted });
});

// PUT /api/v1/reference-tables/:id/rows/:rowId -- update a row
router.put('/:id/rows/:rowId', requireAdmin, async (req: Request, res: Response) => {
  const { rowId } = req.params;
  const { data } = req.body;

  const [updated] = await db.update(referenceTableRows)
    .set({ data })
    .where(eq(referenceTableRows.id, rowId))
    .returning();

  res.json(updated);
});

// DELETE /api/v1/reference-tables/:id/rows/:rowId
router.delete('/:id/rows/:rowId', requireAdmin, async (req: Request, res: Response) => {
  const { id, rowId } = req.params;
  await db.delete(referenceTableRows).where(eq(referenceTableRows.id, rowId));

  await db.update(referenceTables)
    .set({ rowCount: sql`(select count(*)::int from reference_table_rows where reference_table_id = ${id})` })
    .where(eq(referenceTables.id, id));

  res.status(204).send();
});

// GET /api/v1/reference-tables/:id/values -- filtered values for dependent picklists
router.get('/:id/values', async (req: Request, res: Response) => {
  const { id } = req.params;
  const filterColumn = req.query.filterColumn as string;
  const filterValue = req.query.filterValue as string;
  const valueColumn = req.query.valueColumn as string;

  const rows = await db.select().from(referenceTableRows)
    .where(eq(referenceTableRows.referenceTableId, id));

  let values: string[];
  if (filterColumn && filterValue) {
    values = rows
      .filter(r => {
        const data = r.data as Record<string, unknown>;
        return String(data[filterColumn]) === filterValue;
      })
      .map(r => String((r.data as Record<string, unknown>)[valueColumn ?? 'value']))
      .filter(Boolean);
  } else {
    values = rows
      .map(r => String((r.data as Record<string, unknown>)[valueColumn ?? 'value']))
      .filter(Boolean);
  }

  res.json({ values: [...new Set(values)] });
});

// GET /api/v1/reference-tables/:id/versions -- version history
router.get('/:id/versions', async (req: Request, res: Response) => {
  const { id } = req.params;
  const versions = await db.select().from(referenceTableVersions)
    .where(eq(referenceTableVersions.referenceTableId, id))
    .orderBy(referenceTableVersions.version);
  res.json({ versions });
});

export { router as referenceTableRoutes };
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/reference-tables.ts
git commit -m "feat: replace mock reference table routes with full Drizzle CRUD"
```

---

## Chunk 2: CSV Import

### Task 4: CSV Import Service

**Files:**
- Create: `server/src/services/csv-import.ts`
- Create: `server/src/__tests__/csv-import.test.ts`

- [ ] **Step 1: Install csv-parse and multer**

```bash
cd server && npm install csv-parse multer && npm install -D @types/multer
```

- [ ] **Step 2: Write failing tests**

```typescript
// server/src/__tests__/csv-import.test.ts
import { describe, it, expect } from 'vitest';
import { parseCsvBuffer } from '../services/csv-import';

describe('CSV import', () => {
  it('parses a simple CSV into rows with auto-detected columns', async () => {
    const csv = Buffer.from('name,code,parent\nBaseball,BB,\nSoftball,SB,\n');
    const result = await parseCsvBuffer(csv);
    expect(result.columns).toEqual([
      { key: 'name', label: 'name', type: 'text' },
      { key: 'code', label: 'code', type: 'text' },
      { key: 'parent', label: 'parent', type: 'text' },
    ]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].data).toEqual({ name: 'Baseball', code: 'BB', parent: '' });
  });

  it('handles empty CSV gracefully', async () => {
    const csv = Buffer.from('');
    const result = await parseCsvBuffer(csv);
    expect(result.columns).toEqual([]);
    expect(result.rows).toEqual([]);
  });

  it('trims whitespace from headers and values', async () => {
    const csv = Buffer.from(' name , code \n Baseball , BB \n');
    const result = await parseCsvBuffer(csv);
    expect(result.columns[0].key).toBe('name');
    expect(result.rows[0].data.name).toBe('Baseball');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd server && npx vitest run src/__tests__/csv-import.test.ts`
Expected: FAIL

- [ ] **Step 4: Implement CSV import service**

```typescript
// server/src/services/csv-import.ts
import { parse } from 'csv-parse/sync';
import type { ReferenceTableColumn } from '@mapforge/shared';

interface CsvImportResult {
  columns: ReferenceTableColumn[];
  rows: Array<{ data: Record<string, unknown>; ordinal: number }>;
}

export function parseCsvBuffer(buffer: Buffer): CsvImportResult {
  const content = buffer.toString('utf-8').trim();
  if (!content) {
    return { columns: [], rows: [] };
  }

  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  if (records.length === 0) {
    return { columns: [], rows: [] };
  }

  const headers = Object.keys(records[0]);
  const columns: ReferenceTableColumn[] = headers.map(h => ({
    key: h,
    label: h,
    type: 'text' as const,
  }));

  const rows = records.map((record: Record<string, unknown>, i: number) => ({
    data: record,
    ordinal: i + 1,
  }));

  return { columns, rows };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd server && npx vitest run src/__tests__/csv-import.test.ts`
Expected: 3 tests PASS

- [ ] **Step 6: Commit**

```bash
git add server/src/services/csv-import.ts server/src/__tests__/csv-import.test.ts
git commit -m "feat: add CSV import service for reference tables"
```

---

### Task 5: CSV Upload Route

**Files:**
- Modify: `server/src/routes/reference-tables.ts`

- [ ] **Step 1: Add CSV upload endpoint**

Add to the reference tables router:

```typescript
import multer from 'multer';
import { parseCsvBuffer } from '../services/csv-import';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/v1/reference-tables/:id/import-csv
router.post('/:id/import-csv', requireAdmin, upload.single('file'), async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  // Snapshot current state for versioning
  const currentRows = await db.select().from(referenceTableRows)
    .where(eq(referenceTableRows.referenceTableId, id));
  const [table] = await db.select().from(referenceTables)
    .where(eq(referenceTables.id, id));

  if (table) {
    const [maxVersion] = await db.select({
      max: sql<number>`coalesce(max(${referenceTableVersions.version}), 0)::int`
    }).from(referenceTableVersions)
      .where(eq(referenceTableVersions.referenceTableId, id));

    await db.insert(referenceTableVersions).values({
      referenceTableId: id,
      version: (maxVersion?.max ?? 0) + 1,
      snapshot: { columns: table.columns, rows: currentRows },
      createdBy: req.user!.id,
    });
  }

  // Parse CSV
  const { columns, rows } = parseCsvBuffer(req.file.buffer);

  // Clear existing rows and insert new ones
  await db.delete(referenceTableRows).where(eq(referenceTableRows.referenceTableId, id));

  for (const row of rows) {
    await db.insert(referenceTableRows).values({
      referenceTableId: id,
      data: row.data,
      ordinal: row.ordinal,
    });
  }

  // Update table metadata
  await db.update(referenceTables)
    .set({
      columns,
      rowCount: rows.length,
      lastRefreshedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(referenceTables.id, id));

  res.json({ imported: rows.length, columns });
});
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/reference-tables.ts
git commit -m "feat: add CSV upload endpoint for reference tables with versioning"
```

---

## Chunk 3: BigQuery Refresh for Reference Tables

### Task 6: Reference Table BigQuery Sync

**Files:**
- Create: `server/src/services/reference-table-sync.ts`

- [ ] **Step 1: Implement BQ refresh for reference tables**

```typescript
// server/src/services/reference-table-sync.ts
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/connection';
import { referenceTables, referenceTableRows, referenceTableVersions, storedCredentials } from '../db/schema';
import { BigQueryService } from './bigquery';
import { decryptCredential } from './credentials';

interface RefreshConfig {
  credentialId: string;
  gcpProject: string;
  dataset: string;
  tableOrQuery: string;
  queryType: 'table' | 'query';
}

export async function refreshReferenceTableFromBigQuery(
  referenceTableId: string,
  userId: string
): Promise<{ rowCount: number }> {
  // Get table config
  const [table] = await db.select().from(referenceTables)
    .where(eq(referenceTables.id, referenceTableId));

  if (!table) throw new Error('Reference table not found');
  if (table.refreshSource !== 'bigquery') throw new Error('Table is not configured for BigQuery refresh');

  const config = table.refreshConfig as RefreshConfig;
  if (!config?.credentialId) throw new Error('No credential configured for BigQuery refresh');

  // Get credential
  const [cred] = await db.select().from(storedCredentials)
    .where(eq(storedCredentials.id, config.credentialId));

  if (!cred) throw new Error('Credential not found');

  const encryptionKey = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!encryptionKey) throw new Error('Encryption key not configured');

  const credJson = decryptCredential(cred.encryptedValue, encryptionKey);
  const bq = new BigQueryService(credJson);

  // Query BigQuery
  const query = config.queryType === 'table'
    ? `SELECT * FROM \`${config.gcpProject}.${config.dataset}.${config.tableOrQuery}\``
    : config.tableOrQuery;

  const rows = await bq.executeQuery(query);

  // Snapshot current state
  const currentRows = await db.select().from(referenceTableRows)
    .where(eq(referenceTableRows.referenceTableId, referenceTableId));

  const [maxVersion] = await db.select({
    max: sql<number>`coalesce(max(${referenceTableVersions.version}), 0)::int`
  }).from(referenceTableVersions)
    .where(eq(referenceTableVersions.referenceTableId, referenceTableId));

  await db.insert(referenceTableVersions).values({
    referenceTableId,
    version: (maxVersion?.max ?? 0) + 1,
    snapshot: { columns: table.columns, rows: currentRows },
    createdBy: userId,
  });

  // Replace rows
  await db.delete(referenceTableRows)
    .where(eq(referenceTableRows.referenceTableId, referenceTableId));

  let ordinal = 1;
  for (const row of rows) {
    await db.insert(referenceTableRows).values({
      referenceTableId,
      data: row,
      ordinal: ordinal++,
    });
  }

  // Detect columns from first row
  const columns = rows.length > 0
    ? Object.keys(rows[0]).map(k => ({ key: k, label: k, type: 'text' as const }))
    : table.columns;

  await db.update(referenceTables).set({
    rowCount: rows.length,
    columns,
    lastRefreshedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(referenceTables.id, referenceTableId));

  return { rowCount: rows.length };
}
```

- [ ] **Step 2: Add refresh route**

Add to reference-tables router:

```typescript
// POST /api/v1/reference-tables/:id/refresh-bigquery
router.post('/:id/refresh-bigquery', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { refreshReferenceTableFromBigQuery } = await import('../services/reference-table-sync');
    const result = await refreshReferenceTableFromBigQuery(id, req.user!.id);
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Refresh failed';
    res.status(500).json({ error: message });
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add server/src/services/reference-table-sync.ts server/src/routes/reference-tables.ts
git commit -m "feat: add BigQuery refresh for reference tables with versioning"
```

---

### Task 7: Client API Functions for Reference Tables

**Files:**
- Modify: `client/src/api/reference-tables.ts` (expand from current empty/minimal state)

- [ ] **Step 1: Create full client API for reference tables**

```typescript
// client/src/api/reference-tables.ts
import { apiClient } from './client';
import type {
  ReferenceTableListItem,
  ReferenceTableDetail,
  CreateReferenceTablePayload,
  UpdateReferenceTablePayload,
  ReferenceTableVersion,
} from '@mapforge/shared';

export async function fetchReferenceTables(): Promise<ReferenceTableListItem[]> {
  const response = await apiClient.get<{ tables: ReferenceTableListItem[] }>('/reference-tables');
  return response.data.tables;
}

export async function fetchReferenceTable(id: string): Promise<ReferenceTableDetail> {
  const response = await apiClient.get<ReferenceTableDetail>(`/reference-tables/${id}`);
  return response.data;
}

export async function createReferenceTable(payload: CreateReferenceTablePayload): Promise<ReferenceTableListItem> {
  const response = await apiClient.post<ReferenceTableListItem>('/reference-tables', payload);
  return response.data;
}

export async function updateReferenceTable(id: string, payload: UpdateReferenceTablePayload): Promise<ReferenceTableListItem> {
  const response = await apiClient.put<ReferenceTableListItem>(`/reference-tables/${id}`, payload);
  return response.data;
}

export async function deleteReferenceTable(id: string): Promise<void> {
  await apiClient.delete(`/reference-tables/${id}`);
}

export async function addReferenceTableRows(
  id: string,
  rows: Array<{ data: Record<string, unknown> }>
): Promise<void> {
  await apiClient.post(`/reference-tables/${id}/rows`, { rows });
}

export async function updateReferenceTableRow(
  tableId: string,
  rowId: string,
  data: Record<string, unknown>
): Promise<void> {
  await apiClient.put(`/reference-tables/${tableId}/rows/${rowId}`, { data });
}

export async function deleteReferenceTableRow(tableId: string, rowId: string): Promise<void> {
  await apiClient.delete(`/reference-tables/${tableId}/rows/${rowId}`);
}

export async function importCsv(id: string, file: File): Promise<{ imported: number }> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post<{ imported: number }>(`/reference-tables/${id}/import-csv`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function refreshFromBigQuery(id: string): Promise<{ rowCount: number }> {
  const response = await apiClient.post<{ rowCount: number }>(`/reference-tables/${id}/refresh-bigquery`);
  return response.data;
}

export async function fetchReferenceTableVersions(id: string): Promise<ReferenceTableVersion[]> {
  const response = await apiClient.get<{ versions: ReferenceTableVersion[] }>(`/reference-tables/${id}/versions`);
  return response.data.versions;
}

export async function fetchFilteredValues(
  id: string,
  filterColumn: string,
  filterValue: string,
  valueColumn: string
): Promise<string[]> {
  const response = await apiClient.get<{ values: string[] }>(`/reference-tables/${id}/values`, {
    params: { filterColumn, filterValue, valueColumn },
  });
  return response.data.values;
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/api/reference-tables.ts
git commit -m "feat: add full client API for reference table management"
```
