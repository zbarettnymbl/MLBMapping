# BigQuery Explorer - Design Spec

**Date**: 2026-03-11
**Status**: Draft
**Feature**: Admin-only BigQuery data browser and inspector

## Overview

A new page that lets admins browse BigQuery datasets and tables, inspect schemas, preview data, and perform light actions (CSV export, create exercise from table). Built on top of existing BigQuery API endpoints and credential management.

## Audience

Admin users only. The page is gated behind `ProtectedRoute` with `allowedRoles={['admin']}`.

## Route

`/bigquery-explorer` -- added to the app router and sidebar navigation.

## Layout

Two-panel design inside `AppLayout`:

### Left Sidebar (~280px, collapsible)

- **Credential selector**: Dropdown at the top listing stored credentials from `fetchCredentials()`. Shows credential name/label.
- **Dataset/table tree**: Expandable tree view. Top-level nodes are datasets, child nodes are tables. Clicking a dataset expands it and loads its tables. Clicking a table selects it and loads data in the main panel. Active table is visually highlighted.

### Right Main Panel

Three vertically stacked zones:

1. **Header bar**: Selected table name (formatted as `dataset.table`), row count badge, limit selector dropdown (50 / 100 / 500), action buttons (Export CSV, Create Exercise).
2. **Schema section**: Collapsible (collapsed by default). Displays each column as a row with name, BigQuery type (STRING, INTEGER, TIMESTAMP, etc.), and mode (NULLABLE, REQUIRED, REPEATED). Lightweight table layout, not AG Grid.
3. **Data grid**: AG Grid instance showing the preview data. Column sorting and filtering via AG Grid's built-in column header features. No custom sort/filter implementation needed.

## Data Flow

### Sidebar Loading (cascading, React Query)

1. On page mount: `fetchCredentials()` populates the credential dropdown.
2. On credential selection: `fetchBigQueryDatasets(credentialId)` loads datasets into the tree.
3. On dataset expand: `fetchBigQueryTables(credentialId, dataset)` loads tables under that dataset node.
4. All responses cached by React Query. Re-expanding a previously loaded dataset does not re-fetch.

### Main Panel Loading (on table selection)

When a table is selected, build a `BigQueryConnectionConfig` from the current state:
```typescript
{
  gcpProject,        // from fetchBigQueryDatasets response
  dataset,           // selected dataset
  tableOrQuery,      // selected table name
  queryType: 'table',
  credentialId
}
```

1. `fetchBigQuerySchema(config)` and `previewBigQueryData(config)` called in parallel using this config.
2. Schema renders in the collapsible section.
3. Preview rows populate the AG Grid.
4. Default limit: 50 rows.

Note: `previewBigQueryData` uses `BigQueryConnectionConfig` which has `tableOrQuery` (not `table`) and requires `queryType: 'table'`. The component builds this config from the tree selection state.

### Limit Selector

Dropdown in the header bar with options: 50, 100, 500. Changing the limit re-fetches preview data with the new limit. No server-side pagination -- the preview endpoint returns up to N rows, which is sufficient for an inspection tool.

## State Management

### Zustand Store (`bigqueryExplorerStore`)

- `selectedCredentialId: string | null`
- `gcpProject: string | null` -- set from `fetchBigQueryDatasets` response when a credential is selected
- `selectedDataset: string | null`
- `selectedTable: string | null`
- `previewLimit: number` (default 50)
- `sidebarCollapsed: boolean`
- `schemaCollapsed: boolean` (default true)
- Actions to update each field. Selecting a new credential resets `gcpProject`, `selectedDataset`, and `selectedTable`.

### React Query

All data fetching uses React Query with appropriate query keys:
- `['credentials']`
- `['bigquery', 'datasets', credentialId]`
- `['bigquery', 'tables', credentialId, dataset]`
- `['bigquery', 'schema', credentialId, dataset, table]`
- `['bigquery', 'preview', credentialId, dataset, table, limit]`

Queries use `enabled` flag to only fire when dependencies are available (e.g., `enabled: !!credentialId`).

## Actions

### Export CSV

- Button in the header bar, enabled when preview data is loaded.
- Uses AG Grid's built-in `exportDataAsCsv()` API -- no custom CSV generation.
- Filename: `{dataset}_{table}_{YYYY-MM-DD}.csv`.

### Create Exercise from Table

- Button in the header bar, navigates to the Exercise Wizard page.
- Passes BigQuery source config (credentialId, gcpProject, dataset, table) via React Router state.
- If the wizard does not yet support pre-population from route state, the button simply navigates to `/exercises/new`. Pre-population is a follow-up enhancement, not part of this spec.

## Empty States

| Condition | Display |
|---|---|
| No credentials configured | Full-page empty state: "No BigQuery credentials configured" with link to Credentials page |
| No credential selected | Main panel: "Select a credential to browse BigQuery data" |
| No table selected | Main panel: "Select a table from the sidebar to preview its data" |
| Dataset has no tables | Tree node: "No tables found" (disabled text) |
| Table has no rows | Schema section renders, grid area shows "This table has no data" |

## Error Handling

- **Connection failure** (expired credential, wrong permissions): Inline error below the credential selector with "Test Connection" retry action.
- **Dataset/table fetch failure**: Error message replaces the tree content below the failing node, with retry option.
- **Preview/schema fetch failure**: Error message in the main panel with retry button.
- **Stale credential** (deleted while page is open): React Query error handling catches 404, prompts to select a different credential.

## Loading States

- **Sidebar**: Skeleton loaders while datasets and tables load.
- **Main panel**: Spinner overlay on the grid while preview data loads.
- **Schema**: Skeleton rows while schema loads.

## Components

### New Components (in `client/src/components/bigquery/`)

- `BigQueryExplorerPage` -- page component in `client/src/pages/BigQueryExplorerPage.tsx`
- `BigQuerySidebar` -- credential selector + dataset/table tree
- `BigQueryDatasetTree` -- tree view of datasets and tables
- `BigQueryTableView` -- header bar + schema section + AG Grid
- `BigQuerySchemaPanel` -- collapsible schema display

### New Store (in `client/src/stores/bigqueryExplorerStore.ts`)

- `bigqueryExplorerStore` -- Zustand store for UI state

### Reused

- `AppLayout` -- page wrapper
- AG Grid -- data display
- React Query -- data fetching
- Existing `client/src/api/bigquery.ts` functions -- no new API endpoints needed
- Existing `client/src/api/credentials.ts` -- credential listing

## API Changes

None. All required endpoints already exist:
- `GET /api/v1/credentials` -- list credentials
- `GET /api/v1/bigquery/datasets` -- list datasets
- `GET /api/v1/bigquery/tables` -- list tables
- `POST /api/v1/bigquery/schema` -- get schema
- `POST /api/v1/bigquery/preview` -- preview data

## Testing

- **Unit tests**: BigQuery explorer store (Zustand) -- selection state, limit changes, reset behavior.
- **Component tests**: Sidebar renders credentials, tree expands datasets/tables, table selection triggers data load. Main panel renders schema and grid with mock data. Empty states render correctly.
- **Integration**: MSW handlers mock BigQuery API responses returning `BigQueryPreviewResult` and `BigQueryColumnInfo[]` from `@mapforge/shared`. Full page render with credential selection through to data display. Reference `server/src/services/mock-bigquery.ts` for realistic test fixture shapes.

## Out of Scope

- Server-side pagination or infinite scroll
- Custom SQL query execution
- Table/column search within the sidebar
- Data editing or write-back from the explorer
- Exercise wizard pre-population from route state (follow-up)
