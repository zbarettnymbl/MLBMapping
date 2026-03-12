# Mock BigQuery Connection Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mock BigQuery service that serves realistic MLB data from local JSON files when `MOCK_BIGQUERY=true`, with a seeded demo credential for full end-to-end testing in local dev.

**Architecture:** A `MockBigQueryService` class mirrors the real `BigQueryService` interface but reads from JSON files instead of querying GCP. The BigQuery routes use a factory function to choose real vs mock based on the env var and credential ID. A demo credential is seeded into the DB so the Connections page shows a working entry.

**Tech Stack:** TypeScript, Express 5, Drizzle ORM, Vitest

---

## Chunk 1: Mock Data JSON Files

### Task 1: Create team_rosters mock data

**Files:**
- Create: `server/src/db/seeds/mock-bigquery/bigquery-response-rosters.json`

- [ ] **Step 1: Create the rosters JSON file**

Follow the existing BigQuery query response format. ~60 rows of MLB player data across multiple teams.

Schema fields:
- `player_id` (STRING, REQUIRED) - e.g., "PLR-001"
- `first_name` (STRING) - e.g., "Aaron"
- `last_name` (STRING) - e.g., "Judge"
- `team_name` (STRING) - e.g., "New York Yankees"
- `team_id` (STRING) - e.g., "TM-NYY"
- `position` (STRING) - e.g., "RF", "SP", "C"
- `jersey_number` (INTEGER)
- `status` (STRING) - "active", "injured_list", "minors"
- `bats` (STRING) - "R", "L", "S"
- `throws` (STRING) - "R", "L"
- `debut_date` (DATE) - e.g., "2016-08-13"
- `birth_country` (STRING) - e.g., "USA", "Dominican Republic"
- `updated_at` (TIMESTAMP)

Include players from at least 6 teams: NYY, NYM, LAD, BOS, ATL, HOU, CHC, TEX. Mix of positions (pitchers, catchers, infielders, outfielders, DH). Include some IL and minors status entries.

```json
{
  "kind": "bigquery#queryResponse",
  "schema": {
    "fields": [
      { "name": "player_id", "type": "STRING", "mode": "REQUIRED" },
      { "name": "first_name", "type": "STRING", "mode": "NULLABLE" },
      { "name": "last_name", "type": "STRING", "mode": "NULLABLE" },
      { "name": "team_name", "type": "STRING", "mode": "NULLABLE" },
      { "name": "team_id", "type": "STRING", "mode": "NULLABLE" },
      { "name": "position", "type": "STRING", "mode": "NULLABLE" },
      { "name": "jersey_number", "type": "INTEGER", "mode": "NULLABLE" },
      { "name": "status", "type": "STRING", "mode": "NULLABLE" },
      { "name": "bats", "type": "STRING", "mode": "NULLABLE" },
      { "name": "throws", "type": "STRING", "mode": "NULLABLE" },
      { "name": "debut_date", "type": "DATE", "mode": "NULLABLE" },
      { "name": "birth_country", "type": "STRING", "mode": "NULLABLE" },
      { "name": "updated_at", "type": "TIMESTAMP", "mode": "NULLABLE" }
    ]
  },
  "jobReference": { "projectId": "mlb-broadcast-analytics", "jobId": "job_rosters_001", "location": "US" },
  "totalRows": "60",
  "rows": [ ... ]
}
```

- [ ] **Step 2: Verify JSON is valid**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && node -e "JSON.parse(require('fs').readFileSync('server/src/db/seeds/mock-bigquery/bigquery-response-rosters.json','utf8')); console.log('Valid JSON')"`
Expected: "Valid JSON"

---

### Task 2: Create player_development_stats mock data

**Files:**
- Create: `server/src/db/seeds/mock-bigquery/bigquery-response-dev-stats.json`

- [ ] **Step 1: Create the dev stats JSON file**

~80 rows of player development/minor league stats.

Schema fields:
- `stat_id` (STRING, REQUIRED) - e.g., "STAT-001"
- `player_id` (STRING) - FK to rosters
- `season` (INTEGER) - e.g., 2025, 2026
- `level` (STRING) - "MLB", "AAA", "AA", "A+", "A", "Rookie"
- `team_name` (STRING) - minor league or MLB team
- `games_played` (INTEGER)
- `at_bats` (INTEGER) - null for pitchers
- `batting_avg` (FLOAT) - null for pitchers
- `home_runs` (INTEGER) - null for pitchers
- `rbi` (INTEGER) - null for pitchers
- `stolen_bases` (INTEGER) - null for pitchers
- `innings_pitched` (FLOAT) - null for batters
- `era` (FLOAT) - null for batters
- `strikeouts` (INTEGER) - null for batters
- `wins` (INTEGER) - null for batters
- `losses` (INTEGER) - null for batters
- `updated_at` (TIMESTAMP)

Include a mix of batters and pitchers, multiple seasons, various minor league levels. Some players should appear at multiple levels to show progression.

- [ ] **Step 2: Verify JSON is valid**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && node -e "JSON.parse(require('fs').readFileSync('server/src/db/seeds/mock-bigquery/bigquery-response-dev-stats.json','utf8')); console.log('Valid JSON')"`

---

### Task 3: Create venues mock data

**Files:**
- Create: `server/src/db/seeds/mock-bigquery/bigquery-response-venues.json`

- [ ] **Step 1: Create the venues JSON file**

~30 rows of MLB stadiums and development facilities.

Schema fields:
- `venue_id` (STRING, REQUIRED) - e.g., "VEN-001"
- `venue_name` (STRING) - e.g., "Yankee Stadium"
- `city` (STRING) - e.g., "Bronx"
- `state` (STRING) - e.g., "NY"
- `country` (STRING) - e.g., "USA"
- `capacity` (INTEGER) - e.g., 46537
- `surface_type` (STRING) - "natural_grass", "artificial_turf"
- `roof_type` (STRING) - "open", "retractable", "fixed"
- `year_opened` (INTEGER) - e.g., 2009
- `team_id` (STRING) - e.g., "TM-NYY" (null for non-MLB facilities)
- `facility_type` (STRING) - "mlb_stadium", "spring_training", "development_center", "minor_league"
- `latitude` (FLOAT)
- `longitude` (FLOAT)
- `updated_at` (TIMESTAMP)

Include all 30 MLB stadiums plus a few spring training and development facilities.

- [ ] **Step 2: Verify JSON is valid**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && node -e "JSON.parse(require('fs').readFileSync('server/src/db/seeds/mock-bigquery/bigquery-response-venues.json','utf8')); console.log('Valid JSON')"`

---

### Task 4: Create youth_programs mock data

**Files:**
- Create: `server/src/db/seeds/mock-bigquery/bigquery-response-youth.json`

- [ ] **Step 1: Create the youth programs JSON file**

~40 rows of youth baseball/softball development programs.

Schema fields:
- `program_id` (STRING, REQUIRED) - e.g., "YP-001"
- `program_name` (STRING) - e.g., "Play Ball 2026 - Northeast"
- `program_type` (STRING) - "play_ball", "rbi_league", "clinic", "camp", "academy", "showcase"
- `sport` (STRING) - "baseball", "softball", "both"
- `age_group` (STRING) - "5-8", "9-12", "13-15", "16-18"
- `region` (STRING) - "Northeast", "Southeast", "Midwest", "West", "Southwest", "International"
- `state` (STRING) - nullable for international
- `city` (STRING)
- `registration_count` (INTEGER)
- `max_capacity` (INTEGER)
- `start_date` (DATE) - e.g., "2026-03-15"
- `end_date` (DATE) - e.g., "2026-08-30"
- `status` (STRING) - "upcoming", "active", "completed"
- `partner_org` (STRING) - nullable, e.g., "Boys & Girls Clubs", "YMCA"
- `created_at` (TIMESTAMP)

Include a mix of Play Ball, RBI, clinics, camps across regions. Both baseball and softball.

- [ ] **Step 2: Verify JSON is valid**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && node -e "JSON.parse(require('fs').readFileSync('server/src/db/seeds/mock-bigquery/bigquery-response-youth.json','utf8')); console.log('Valid JSON')"`

---

### Task 5: Create participation_metrics mock data

**Files:**
- Create: `server/src/db/seeds/mock-bigquery/bigquery-response-participation.json`

- [ ] **Step 1: Create the participation metrics JSON file**

~50 rows of participation data tied to youth programs.

Schema fields:
- `metric_id` (STRING, REQUIRED) - e.g., "PM-001"
- `program_id` (STRING) - FK to youth_programs
- `report_date` (DATE) - monthly snapshots
- `region` (STRING)
- `total_registered` (INTEGER)
- `total_attended` (INTEGER)
- `completion_rate` (FLOAT) - 0.0-1.0
- `new_participants` (INTEGER) - first-time players
- `returning_participants` (INTEGER)
- `female_participants` (INTEGER)
- `male_participants` (INTEGER)
- `avg_age` (FLOAT)
- `equipment_distributed` (INTEGER) - bats, gloves, balls given out
- `volunteer_count` (INTEGER)
- `updated_at` (TIMESTAMP)

Multiple monthly snapshots across different programs/regions.

- [ ] **Step 2: Verify JSON is valid**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && node -e "JSON.parse(require('fs').readFileSync('server/src/db/seeds/mock-bigquery/bigquery-response-participation.json','utf8')); console.log('Valid JSON')"`

---

### Task 6: Create international_events mock data

**Files:**
- Create: `server/src/db/seeds/mock-bigquery/bigquery-response-international.json`

- [ ] **Step 1: Create the international events JSON file**

~25 rows of international tournaments and showcases.

Schema fields:
- `event_id` (STRING, REQUIRED) - e.g., "INT-001"
- `event_name` (STRING) - e.g., "2026 World Baseball Classic Qualifier"
- `event_type` (STRING) - "tournament", "showcase", "qualifier", "exhibition", "development_tour"
- `sport` (STRING) - "baseball", "softball"
- `country` (STRING) - e.g., "Japan", "Dominican Republic"
- `city` (STRING)
- `start_date` (DATE)
- `end_date` (DATE)
- `level` (STRING) - "professional", "amateur", "youth", "collegiate"
- `participating_countries` (INTEGER)
- `total_participants` (INTEGER)
- `mlb_affiliated` (BOOLEAN)
- `broadcast_partner` (STRING) - nullable
- `notes` (STRING) - nullable
- `updated_at` (TIMESTAMP)

Include WBC qualifiers, international showcases, youth tournaments, softball events across multiple countries.

- [ ] **Step 2: Verify JSON is valid**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && node -e "JSON.parse(require('fs').readFileSync('server/src/db/seeds/mock-bigquery/bigquery-response-international.json','utf8')); console.log('Valid JSON')"`

---

## Chunk 2: MockBigQueryService

### Task 7: Create the MockBigQueryService class

**Files:**
- Create: `server/src/services/mock-bigquery.ts`
- Reference: `server/src/services/bigquery.ts` (real service interface)
- Reference: `shared/src/types/bigquery.ts` (type definitions)

- [ ] **Step 1: Write the failing test**

Create: `server/src/__tests__/mock-bigquery.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { MockBigQueryService } from '../services/mock-bigquery';

describe('MockBigQueryService', () => {
  const service = new MockBigQueryService();

  describe('listDatasets', () => {
    it('returns both datasets', () => {
      const datasets = service.listDatasets();
      expect(datasets).toEqual(['broadcast_data', 'development_data']);
    });
  });

  describe('listTables', () => {
    it('returns broadcast_data tables', () => {
      const tables = service.listTables('broadcast_data');
      expect(tables).toEqual(['broadcast_programs', 'broadcast_schedule']);
    });

    it('returns development_data tables', () => {
      const tables = service.listTables('development_data');
      expect(tables).toContain('team_rosters');
      expect(tables).toContain('player_development_stats');
      expect(tables).toContain('venues');
      expect(tables).toContain('youth_programs');
      expect(tables).toContain('participation_metrics');
      expect(tables).toContain('international_events');
    });

    it('returns empty array for unknown dataset', () => {
      const tables = service.listTables('nonexistent');
      expect(tables).toEqual([]);
    });
  });

  describe('testConnection', () => {
    it('succeeds for known table', async () => {
      const result = await service.testConnection('mlb-broadcast-analytics', 'broadcast_data', 'broadcast_programs', 'table');
      expect(result.success).toBe(true);
      expect(result.rowCount).toBeGreaterThan(0);
      expect(result.sampleColumns).toBeDefined();
      expect(result.sampleColumns!.length).toBeGreaterThan(0);
    });

    it('fails for unknown table', async () => {
      const result = await service.testConnection('mlb-broadcast-analytics', 'broadcast_data', 'nonexistent', 'table');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('succeeds for query type referencing known table', async () => {
      const result = await service.testConnection(
        'mlb-broadcast-analytics', 'broadcast_data',
        'SELECT * FROM `mlb-broadcast-analytics.broadcast_data.broadcast_programs`', 'query'
      );
      expect(result.success).toBe(true);
    });
  });

  describe('getSchema', () => {
    it('returns column info for known table', async () => {
      const columns = await service.getSchema('mlb-broadcast-analytics', 'broadcast_data', 'broadcast_programs');
      expect(columns.length).toBeGreaterThan(0);
      expect(columns[0]).toHaveProperty('name');
      expect(columns[0]).toHaveProperty('type');
      expect(columns[0]).toHaveProperty('mode');
    });

    it('throws for unknown table', async () => {
      await expect(
        service.getSchema('mlb-broadcast-analytics', 'broadcast_data', 'nonexistent')
      ).rejects.toThrow();
    });
  });

  describe('previewData', () => {
    it('returns rows for known table', async () => {
      const result = await service.previewData('mlb-broadcast-analytics', 'broadcast_data', 'broadcast_programs', 'table', 5);
      expect(result.columns.length).toBeGreaterThan(0);
      expect(result.rows.length).toBeLessThanOrEqual(5);
      expect(result.totalRows).toBeGreaterThan(0);
      // Rows should be flat objects, not BigQuery { f: [{ v }] } format
      const firstRow = result.rows[0];
      expect(firstRow).toHaveProperty('program_id');
    });

    it('respects limit parameter', async () => {
      const result = await service.previewData('mlb-broadcast-analytics', 'broadcast_data', 'broadcast_programs', 'table', 3);
      expect(result.rows.length).toBeLessThanOrEqual(3);
    });
  });

  describe('executeQuery', () => {
    it('extracts table name from simple SELECT', async () => {
      const rows = await service.executeQuery('SELECT * FROM `mlb-broadcast-analytics.development_data.venues` LIMIT 10');
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.length).toBeLessThanOrEqual(10);
      expect(rows[0]).toHaveProperty('venue_id');
    });
  });

  describe('writeRows', () => {
    it('returns success without persisting', async () => {
      const result = await service.writeRows('mlb-broadcast-analytics', 'broadcast_data', 'broadcast_programs', [{ test: 1 }], 'append');
      expect(result.success).toBe(true);
      expect(result.rowsWritten).toBe(1);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1/server && npx vitest run src/__tests__/mock-bigquery.test.ts`
Expected: FAIL -- module not found

- [ ] **Step 3: Implement MockBigQueryService**

Create `server/src/services/mock-bigquery.ts`:

```typescript
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type { BigQueryColumnInfo, BigQueryTestResult, BigQueryPreviewResult, BigQueryWriteResult } from '@mapforge/shared';

interface BigQueryRow {
  f: Array<{ v: string | null }>;
}

interface BigQueryResponse {
  schema: { fields: BigQueryColumnInfo[] };
  totalRows: string;
  rows: BigQueryRow[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MOCK_DATA_DIR = join(__dirname, '../db/seeds/mock-bigquery');

const TABLE_FILE_MAP: Record<string, Record<string, string>> = {
  broadcast_data: {
    broadcast_programs: 'bigquery-response-programs.json',
    broadcast_schedule: 'bigquery-response-schedule.json',
  },
  development_data: {
    team_rosters: 'bigquery-response-rosters.json',
    player_development_stats: 'bigquery-response-dev-stats.json',
    venues: 'bigquery-response-venues.json',
    youth_programs: 'bigquery-response-youth.json',
    participation_metrics: 'bigquery-response-participation.json',
    international_events: 'bigquery-response-international.json',
  },
};

export class MockBigQueryService {
  private cache: Map<string, BigQueryResponse> = new Map();

  private loadTable(dataset: string, table: string): BigQueryResponse {
    const cacheKey = `${dataset}.${table}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const fileName = TABLE_FILE_MAP[dataset]?.[table];
    if (!fileName) throw new Error(`Table not found: ${dataset}.${table}`);

    const filePath = join(MOCK_DATA_DIR, fileName);
    const data: BigQueryResponse = JSON.parse(readFileSync(filePath, 'utf8'));
    this.cache.set(cacheKey, data);
    return data;
  }

  private flattenRows(response: BigQueryResponse): Record<string, unknown>[] {
    const fieldNames = response.schema.fields.map(f => f.name);
    return response.rows.map(row =>
      Object.fromEntries(row.f.map((cell, i) => [fieldNames[i], cell.v]))
    );
  }

  private extractTableFromQuery(query: string): { dataset: string; table: string } | null {
    // Match `project.dataset.table` or just `dataset.table`
    const match = query.match(/FROM\s+`?(?:[\w-]+\.)?([\w-]+)\.([\w-]+)`?/i);
    if (match) return { dataset: match[1], table: match[2] };
    return null;
  }

  private extractLimitFromQuery(query: string): number | null {
    const match = query.match(/LIMIT\s+(\d+)/i);
    return match ? parseInt(match[1], 10) : null;
  }

  listDatasets(): string[] {
    return Object.keys(TABLE_FILE_MAP);
  }

  listTables(dataset: string): string[] {
    return Object.keys(TABLE_FILE_MAP[dataset] ?? {});
  }

  async testConnection(
    _project: string, dataset: string, tableOrQuery: string, queryType: 'table' | 'query'
  ): Promise<BigQueryTestResult> {
    try {
      let targetDataset = dataset;
      let targetTable = tableOrQuery;

      if (queryType === 'query') {
        const extracted = this.extractTableFromQuery(tableOrQuery);
        if (!extracted) return { success: false, error: 'Could not parse table from query' };
        targetDataset = extracted.dataset;
        targetTable = extracted.table;
      }

      const response = this.loadTable(targetDataset, targetTable);
      const sampleColumns = response.schema.fields.map(f => ({
        name: f.name, type: f.type, mode: f.mode,
      }));
      return { success: true, rowCount: parseInt(response.totalRows, 10), sampleColumns };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  async getSchema(_project: string, dataset: string, table: string): Promise<BigQueryColumnInfo[]> {
    const response = this.loadTable(dataset, table);
    return response.schema.fields.map(f => ({
      name: f.name, type: f.type, mode: f.mode || 'NULLABLE',
    }));
  }

  async previewData(
    _project: string, dataset: string, tableOrQuery: string, queryType: 'table' | 'query', limit: number = 50
  ): Promise<BigQueryPreviewResult> {
    let targetDataset = dataset;
    let targetTable = tableOrQuery;

    if (queryType === 'query') {
      const extracted = this.extractTableFromQuery(tableOrQuery);
      if (!extracted) throw new Error('Could not parse table from query');
      targetDataset = extracted.dataset;
      targetTable = extracted.table;
      limit = this.extractLimitFromQuery(tableOrQuery) ?? limit;
    }

    const response = this.loadTable(targetDataset, targetTable);
    const allRows = this.flattenRows(response);
    const rows = allRows.slice(0, limit);
    const columns = response.schema.fields.map(f => ({
      name: f.name, type: f.type, mode: f.mode || 'NULLABLE',
    }));
    return { columns, rows, totalRows: parseInt(response.totalRows, 10) };
  }

  async executeQuery(query: string): Promise<Record<string, unknown>[]> {
    const extracted = this.extractTableFromQuery(query);
    if (!extracted) throw new Error('Could not parse table from query');

    const response = this.loadTable(extracted.dataset, extracted.table);
    const allRows = this.flattenRows(response);
    const limit = this.extractLimitFromQuery(query);
    return limit ? allRows.slice(0, limit) : allRows;
  }

  async writeRows(
    _project: string, _dataset: string, _tableName: string,
    rows: Record<string, unknown>[], _writeMode: 'merge' | 'append' | 'overwrite'
  ): Promise<BigQueryWriteResult> {
    return { success: true, rowsWritten: rows.length };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1/server && npx vitest run src/__tests__/mock-bigquery.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/services/mock-bigquery.ts server/src/__tests__/mock-bigquery.test.ts
git commit -m "feat: add MockBigQueryService with tests"
```

---

## Chunk 3: Route Changes and New Endpoints

### Task 8: Update BigQuery routes with mock factory + new endpoints

**Files:**
- Modify: `server/src/routes/bigquery.ts`
- Modify: `client/src/api/bigquery.ts`

- [ ] **Step 1: Write route integration test**

Create: `server/src/__tests__/bigquery-routes-mock.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Set env before importing anything
vi.stubEnv('MOCK_BIGQUERY', 'true');

import express from 'express';
import request from 'supertest';
import { bigqueryRouter } from '../routes/bigquery';

// Mock auth middleware to bypass
vi.mock('../middleware/auth', () => ({
  authMiddleware: (_req: any, _res: any, next: any) => { _req.user = { id: 'test', role: 'admin', orgId: 'org-1' }; next(); },
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

const app = express();
app.use(express.json());
app.use('/api/v1/bigquery', bigqueryRouter);

describe('BigQuery routes (mock mode)', () => {
  it('POST /test-connection succeeds with demo credential for known table', async () => {
    const res = await request(app).post('/api/v1/bigquery/test-connection').send({
      gcpProject: 'mlb-broadcast-analytics',
      dataset: 'broadcast_data',
      tableOrQuery: 'broadcast_programs',
      queryType: 'table',
      credentialId: 'bq000000-0000-0000-0000-000000000001',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /preview returns rows', async () => {
    const res = await request(app).post('/api/v1/bigquery/preview').send({
      gcpProject: 'mlb-broadcast-analytics',
      dataset: 'development_data',
      tableOrQuery: 'venues',
      queryType: 'table',
      credentialId: 'bq000000-0000-0000-0000-000000000001',
      limit: 5,
    });
    expect(res.status).toBe(200);
    expect(res.body.rows.length).toBeLessThanOrEqual(5);
    expect(res.body.columns.length).toBeGreaterThan(0);
  });

  it('GET /datasets returns dataset list', async () => {
    const res = await request(app).get('/api/v1/bigquery/datasets').query({
      credentialId: 'bq000000-0000-0000-0000-000000000001',
    });
    expect(res.status).toBe(200);
    expect(res.body.datasets).toEqual(['broadcast_data', 'development_data']);
  });

  it('GET /tables returns table list for dataset', async () => {
    const res = await request(app).get('/api/v1/bigquery/tables').query({
      credentialId: 'bq000000-0000-0000-0000-000000000001',
      dataset: 'development_data',
    });
    expect(res.status).toBe(200);
    expect(res.body.tables).toContain('venues');
    expect(res.body.tables).toContain('team_rosters');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1/server && npx vitest run src/__tests__/bigquery-routes-mock.test.ts`
Expected: FAIL

- [ ] **Step 3: Update bigquery routes**

Modify `server/src/routes/bigquery.ts` to add:

1. Import `MockBigQueryService`:
```typescript
import { MockBigQueryService } from '../services/mock-bigquery';
```

2. Add factory function (replace direct instantiation in each route):
```typescript
const DEMO_CREDENTIAL_ID = 'bq000000-0000-0000-0000-000000000001';

function isMockMode(credentialId: string): boolean {
  return process.env.MOCK_BIGQUERY === 'true' && credentialId === DEMO_CREDENTIAL_ID;
}

async function createBigQueryService(credentialId: string): Promise<BigQueryService | MockBigQueryService> {
  if (isMockMode(credentialId)) {
    return new MockBigQueryService();
  }
  const credJson = await getCredentialJson(credentialId);
  return new BigQueryService(credJson);
}
```

3. Update existing routes to use `createBigQueryService()` instead of manual instantiation. For the export route (`POST /export/:exerciseId`), add a mock guard since it resolves credentials from the `bigqueryDestinations` table rather than from the request body:

```typescript
// In the export route, after fetching dest:
if (process.env.MOCK_BIGQUERY === 'true' && dest.credentialId === DEMO_CREDENTIAL_ID) {
  const mock = new MockBigQueryService();
  const result = await mock.writeRows(dest.gcpProject, dest.dataset, dest.tableName, classifiedRows, dest.writeMode as 'merge' | 'append' | 'overwrite');
  res.json(result);
  return;
}
```

4. Add new endpoints:
```typescript
// GET /api/v1/bigquery/datasets
router.get('/datasets', async (req: Request, res: Response) => {
  try {
    const credentialId = req.query.credentialId as string;
    if (!credentialId) { res.status(400).json({ error: 'credentialId required' }); return; }

    if (isMockMode(credentialId)) {
      const mock = new MockBigQueryService();
      res.json({ datasets: mock.listDatasets() });
      return;
    }

    // Real BQ: list datasets via API
    const credJson = await getCredentialJson(credentialId);
    const credentials = JSON.parse(credJson);
    const { BigQuery } = await import('@google-cloud/bigquery');
    const bq = new BigQuery({ projectId: credentials.project_id, credentials });
    const [datasets] = await bq.getDatasets();
    res.json({ datasets: datasets.map(d => d.id) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to list datasets';
    res.status(400).json({ error: message });
  }
});

// GET /api/v1/bigquery/tables
router.get('/tables', async (req: Request, res: Response) => {
  try {
    const credentialId = req.query.credentialId as string;
    const dataset = req.query.dataset as string;
    if (!credentialId || !dataset) { res.status(400).json({ error: 'credentialId and dataset required' }); return; }

    if (isMockMode(credentialId)) {
      const mock = new MockBigQueryService();
      res.json({ tables: mock.listTables(dataset) });
      return;
    }

    // Real BQ: list tables via API
    const credJson = await getCredentialJson(credentialId);
    const credentials = JSON.parse(credJson);
    const { BigQuery } = await import('@google-cloud/bigquery');
    const bq = new BigQuery({ projectId: credentials.project_id, credentials });
    const [tables] = await bq.dataset(dataset).getTables();
    res.json({ tables: tables.map(t => t.id) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to list tables';
    res.status(400).json({ error: message });
  }
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1/server && npx vitest run src/__tests__/bigquery-routes-mock.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Add client API functions**

Add to `client/src/api/bigquery.ts`:

```typescript
export async function fetchBigQueryDatasets(credentialId: string): Promise<string[]> {
  const response = await apiClient.get<{ datasets: string[] }>('/bigquery/datasets', {
    params: { credentialId },
  });
  return response.data.datasets;
}

export async function fetchBigQueryTables(credentialId: string, dataset: string): Promise<string[]> {
  const response = await apiClient.get<{ tables: string[] }>('/bigquery/tables', {
    params: { credentialId, dataset },
  });
  return response.data.tables;
}
```

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/bigquery.ts server/src/__tests__/bigquery-routes-mock.test.ts client/src/api/bigquery.ts
git commit -m "feat: add mock BigQuery factory + dataset/table browsing endpoints"
```

---

## Chunk 4: Seed and Environment

### Task 9: Seed demo credential and update env

**Files:**
- Modify: `server/src/db/seed.ts`
- Modify: `server/.env.example`

- [ ] **Step 1: Add demo credential seeding to seed.ts**

Add at the end of the `seed()` function, before the summary log:

```typescript
import { storedCredentials } from './schema';

// ... existing seed code ...

// Seed demo BigQuery credential if mock mode is enabled
if (process.env.MOCK_BIGQUERY === 'true') {
  await db
    .insert(storedCredentials)
    .values({
      id: 'bq000000-0000-0000-0000-000000000001',
      orgId: 'org-00000000-0000-0000-0000-000000000001',
      name: 'Demo BigQuery Connection',
      credentialType: 'gcp_service_account',
      encryptedValue: 'mock-credential-no-real-key',
      createdBy: userId,
    })
    .onConflictDoNothing();

  console.log('  - 1 demo BigQuery credential (mock mode)');
}
```

- [ ] **Step 2: Update .env.example**

Add to `server/.env.example`:

```
# Mock BigQuery (dev only) - set to 'true' to enable mock data without GCP credentials
MOCK_BIGQUERY=false
```

- [ ] **Step 3: Commit**

```bash
git add server/src/db/seed.ts server/.env.example
git commit -m "feat: seed demo BigQuery credential in mock mode"
```

---

## Chunk 5: Verification

### Task 10: Run all tests and verify

- [ ] **Step 1: Run all server tests**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1/server && npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Run all client tests**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1/client && npx vitest run`
Expected: All tests pass

- [ ] **Step 3: Run typecheck**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && npm run typecheck`
Expected: No type errors

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address issues from mock BigQuery verification"
```
