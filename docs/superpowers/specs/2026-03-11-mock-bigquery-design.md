# Mock BigQuery Connection -- Design Spec

## Overview

A mock BigQuery service that replaces the real `@google-cloud/bigquery` client when `MOCK_BIGQUERY=true` is set in the server environment. It serves realistic MLB data from local JSON files across two datasets, with a seeded demo credential so the full BigQuery flow (test connection, preview data, schema detection, export) works out of the box in local development.

## Motivation

Developers and stakeholders need to demo and test BigQuery-dependent features without real GCP credentials. The mock provides a realistic stand-in with MLB-relevant data across broadcast and player development domains.

## Mock Activation

- Controlled by `MOCK_BIGQUERY=true` in `server/.env`
- Only intended for local development
- When enabled, the demo credential is seeded and the mock service is used for that credential
- Real credentials still work alongside the mock if `CREDENTIAL_ENCRYPTION_KEY` is also set

## Datasets and Tables

### Dataset: `broadcast_data`

| Table | Rows | Description |
|-------|------|-------------|
| `broadcast_programs` | 25 | Games and studio shows -- program ID, teams, network, air date/time, venue, type, duration |
| `broadcast_schedule` | 30 | Schedule entries -- broadcast date/time (ET/PT), network, feed type, teams, venue, blackout regions |

These two tables already exist as mock JSON files.

### Dataset: `development_data`

| Table | Rows | Description |
|-------|------|-------------|
| `team_rosters` | ~60 | Player name, position, team, jersey number, status (active/IL/minors), debut date, bats/throws |
| `player_development_stats` | ~80 | Player performance in development contexts -- batting avg, ERA, games played, level, season |
| `venues` | ~30 | Stadium/facility name, city, state, capacity, surface type, roof type, lat/lng coordinates |
| `youth_programs` | ~40 | Play Ball events, RBI leagues, clinics, camps -- program name, region, type, age group, registration count, dates |
| `participation_metrics` | ~50 | Event attendance, registrations, completion rates tied to youth programs by region and date |
| `international_events` | ~25 | Tournaments, showcases, qualifiers -- event name, country, sport (baseball/softball), level, participant count |

## MockBigQueryService

Located at `server/src/services/mock-bigquery.ts`. Implements the same public interface as `BigQueryService`.

### Methods

- **`testConnection(project, dataset, tableOrQuery, queryType)`** -- Returns `{ success: true, rowCount, sampleColumns }` for known tables. Returns `{ success: false, error }` for unknown tables.
- **`getSchema(project, dataset, table)`** -- Returns `BigQueryColumnInfo[]` from the JSON file's schema section.
- **`previewData(project, dataset, tableOrQuery, queryType, limit)`** -- Returns rows from the JSON file, converted to flat objects. Respects `limit` parameter.
- **`executeQuery(query)`** -- Basic SQL parsing: extracts table name from query, returns that table's data.
- **`writeRows(project, dataset, tableName, rows, writeMode)`** -- Returns `{ success: true, rowsWritten: rows.length }`. Data is not persisted.
- **`listDatasets()`** -- Returns `['broadcast_data', 'development_data']`.
- **`listTables(dataset)`** -- Returns table names for the given dataset.

### Data loading

Mock JSON files are loaded lazily on first access and cached in memory. Each file follows the existing BigQuery query response format:

```json
{
  "kind": "bigquery#queryResponse",
  "schema": { "fields": [...] },
  "totalRows": "25",
  "rows": [{ "f": [{ "v": "value" }, ...] }, ...]
}
```

The mock service converts the `{ f: [{ v }] }` row format into flat `Record<string, unknown>` objects using the schema field names.

## Route Changes

### `server/src/routes/bigquery.ts`

Add a factory function that checks `MOCK_BIGQUERY`:

```typescript
const DEMO_CREDENTIAL_ID = 'bq000000-0000-0000-0000-000000000001';

async function createBigQueryService(credentialId: string): Promise<BigQueryService | MockBigQueryService> {
  if (process.env.MOCK_BIGQUERY === 'true' && credentialId === DEMO_CREDENTIAL_ID) {
    return new MockBigQueryService();
  }
  // existing real credential flow
  const credJson = await getCredentialJson(credentialId);
  return new BigQueryService(credJson);
}
```

### New endpoints

- `GET /api/v1/bigquery/datasets?credentialId=...` -- List available datasets for a credential. Mock returns the two datasets; real implementation queries BigQuery metadata.
- `GET /api/v1/bigquery/tables?credentialId=...&dataset=...` -- List tables in a dataset. Mock returns known table names; real implementation queries BigQuery metadata.

## Seeded Demo Credential

In `server/src/db/seed.ts`, when `MOCK_BIGQUERY=true`:

- Insert a credential with ID `bq000000-0000-0000-0000-000000000001`
- Name: "Demo BigQuery Connection"
- Type: `gcp_service_account`
- Encrypted value: `mock-credential-no-real-key` (placeholder)
- Organization: default org

This credential appears on the Connections page alongside any real credentials.

## File Structure

```
server/src/services/
  mock-bigquery.ts                          # MockBigQueryService class

server/src/db/seeds/mock-bigquery/
  bigquery-response-programs.json           # (existing, 25 rows)
  bigquery-response-schedule.json           # (existing, 30 rows)
  bigquery-response-rosters.json            # new, ~60 rows
  bigquery-response-dev-stats.json          # new, ~80 rows
  bigquery-response-venues.json             # new, ~30 rows
  bigquery-response-youth.json              # new, ~40 rows
  bigquery-response-participation.json      # new, ~50 rows
  bigquery-response-international.json      # new, ~25 rows
```

## Client Changes

### `client/src/api/bigquery.ts`

Add two new API functions:
- `fetchBigQueryDatasets(credentialId)` -- GET `/bigquery/datasets`
- `fetchBigQueryTables(credentialId, dataset)` -- GET `/bigquery/tables`

No other client changes needed -- the existing test connection, preview, and schema flows work as-is since the mock is transparent at the API level.

## Environment Setup

Add to `server/.env.example`:
```
# Set to 'true' to enable mock BigQuery with sample data (dev only)
MOCK_BIGQUERY=false
```

## Testing

- Mock service unit tests: verify each method returns correct data for known tables, errors for unknown
- Route integration tests: verify mock mode activates correctly with env var
- Verify real credential flow is unaffected when `MOCK_BIGQUERY` is unset or false
