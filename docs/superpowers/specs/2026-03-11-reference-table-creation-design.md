# Reference Table Creation & Inline Editing

**Date:** 2026-03-11
**Status:** Approved

## Overview

Add the ability to create new reference tables and edit their rows inline on the Reference Tables page. Currently the page only displays a read-only list with delete. This spec adds a creation wizard modal (Manual, CSV, BigQuery sources) and expandable inline row editing via AG Grid.

## Constraints

- Admin-only for all write operations (create, edit rows, import, delete)
- Regular users can view tables and their rows (read-only grid)
- Reference tables have low column counts; wide modal is sufficient for all flows
- Mostly UI-only, with minor backend changes to support `refreshSource`/`refreshConfig` on creation

## Design

### 1. Reference Tables Page Updates

- **"Create Reference Table" button** in the page header, visible to admins only
- **Delete button** gated to admin-only using `useAuth()` from `@/contexts/AuthContext` (fix existing bug where it renders for all users)
- **Expandable table rows** -- clicking a row expands it to reveal an inline AG Grid showing the table's rows. On expand, fetch full table data via `GET /api/v1/reference-tables/:id` (returns `ReferenceTableDetail` with rows).
- Existing metadata display (name, columns, row count, refresh source) unchanged
- Refactor page from manual `useState`/`useEffect` fetching to React Query for consistency with the rest of the app

### 2. Creation Wizard Modal

Wide modal (`max-w-4xl`), 2-step flow with step indicator in the header.

#### Step 1: Table Info + Source Selection

- **Name** (text input, required)
- **Description** (text input, optional)
- **Source selector:** three card-style buttons -- "Manual", "CSV Upload", "BigQuery"
- **Next** button disabled until name and source are selected

#### Step 2: Source-Specific Configuration

**Manual:**
- Column definition table: key, label, type (text/number/boolean) per row
- Add/remove column buttons
- `parentColumnKey` is omitted from the wizard (only relevant for dependent dropdowns, can be configured later)
- `primaryKeyColumn` and `displayColumn` are omitted from the wizard (default to null); can be set later via table metadata editing if needed
- Optional: add initial rows inline
- "Create" button

**CSV Upload:**
- File dropzone (accepts .csv files)
- On upload: parse CSV client-side using `papaparse` (add as dependency) to generate preview
- Display preview table (first ~10 rows)
- Clickable rows in the preview to select which row is the header (selected row highlighted, defaults to row 0). A "No header row" checkbox option generates "Column 1", "Column 2", etc.
- Columns auto-detected from selected header row
- "Create" button: creates the table via POST (passing papaparse-detected columns), then uploads the raw file to `/:id/import-csv` for server-side parsing and storage. The import overwrites the initially-passed columns with server-parsed ones.
- Create button shows loading spinner and is disabled during the multi-step async flow (create + import)

**BigQuery:**
- Dropdown to select from stored credentials
- Text input for table name or SQL query
- "Preview" button calls existing `GET /api/v1/bigquery/preview` (with credentialId and query params) to fetch sample rows and displays them in a preview table
- On creation: POST to create table with `refreshSource: 'bigquery'` and `refreshConfig: { credentialId, query }`, then call `/:id/refresh-bigquery` to populate rows
- Create button shows loading spinner and is disabled during the multi-step async flow
- Server POST handler change: destructure `refreshSource` and `refreshConfig` from `req.body`, use `refreshSource ?? 'manual'` as fallback, persist `refreshConfig` if provided

Back button returns to step 1. Modal closes on successful creation.

### 3. Inline Row Editing

When a table row is expanded on the list page:

- **AG Grid** displays all columns and rows for that table
- **Read-only** for regular users
- **Editable for admins:**
  - Click cell to edit inline, save on blur/Enter
  - Admin toolbar above grid: "Add Row", "Import CSV" (re-import with confirmation), "Delete Row" (deletes selected rows sequentially via individual DELETE calls)
  - If table has `refreshSource === 'bigquery'`, show "Refresh from BigQuery" button

### 4. Data Flow & Error Handling

- **Creation flow:** POST `/api/v1/reference-tables` to create the table (with `refreshSource`/`refreshConfig` if BigQuery, with papaparse-detected columns if CSV), then immediately import data (CSV via `/:id/import-csv`, BigQuery via `/:id/refresh-bigquery`). If import fails after creation, show error toast but keep the empty table for retry.
- **Inline edits:** Optimistic UI updates, rollback on API error with toast notification.
- **CSV re-import:** Confirmation dialog warning all existing rows will be replaced. Backend creates version snapshot before replacement.
- **CSV preview:** Client-side parsing with `papaparse` for preview only. The raw file is sent to the server for actual import, keeping the server as the source of truth for parsing.
- **Multi-row delete:** Sequential DELETE calls per selected row. No batch endpoint needed.
- **Validation:** Name required, CSV must parse successfully, BigQuery credentials must be selected. No column-level data type validation.
- **State management:** React Query for server state (refactoring existing manual fetching). No new Zustand store -- grid state is local to the expanded row component.
- **Cache invalidation:** Invalidate `['reference-tables']` query key after create, delete, CSV import, or BigQuery refresh. Invalidate `['reference-tables', id]` after row add/edit/delete.
- **Loading states:** Create button disabled with spinner during async creation + import. Refresh/Import buttons in the inline toolbar also show loading states during operations.

### 5. API Endpoints Used

**Existing (no changes):**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/reference-tables` | List tables |
| GET | `/api/v1/reference-tables/:id` | Get table with rows (used on expand) |
| PUT | `/api/v1/reference-tables/:id` | Update metadata |
| DELETE | `/api/v1/reference-tables/:id` | Delete table |
| POST | `/api/v1/reference-tables/:id/rows` | Add rows |
| PUT | `/api/v1/reference-tables/:id/rows/:rowId` | Update row |
| DELETE | `/api/v1/reference-tables/:id/rows/:rowId` | Delete row |
| POST | `/api/v1/reference-tables/:id/import-csv` | CSV import |
| POST | `/api/v1/reference-tables/:id/refresh-bigquery` | BigQuery refresh |
| GET | `/api/v1/reference-tables/:id/values` | Query filtered values |
| GET | `/api/v1/reference-tables/:id/versions` | Version history |
| GET | `/api/v1/bigquery/preview` | Preview BigQuery query results |

**Modified:**

| Method | Endpoint | Change |
|--------|----------|--------|
| POST | `/api/v1/reference-tables` | Destructure optional `refreshSource` and `refreshConfig` from body; use `refreshSource ?? 'manual'` fallback instead of hardcoding |

**Type changes:**

- Extend `CreateReferenceTablePayload` in `shared/src/types/reference-table.ts` to include optional `refreshSource` and `refreshConfig`

### 6. Components to Create/Modify

All new components go in `client/src/components/reference-tables/` (new directory).

- **Modify:** `client/src/pages/ReferenceTablesPage.tsx` -- add create button, admin-gate delete via `useAuth()`, refactor to React Query, make rows expandable with inline grid
- **Modify:** `server/src/routes/reference-tables.ts` -- destructure `refreshSource`/`refreshConfig` on POST, fallback to `'manual'`
- **Modify:** `shared/src/types/reference-table.ts` -- extend `CreateReferenceTablePayload`
- **Create:** `client/src/components/reference-tables/CreateReferenceTableModal.tsx` -- 2-step wizard modal
- **Create:** `client/src/components/reference-tables/ReferenceTableGrid.tsx` -- AG Grid component for inline viewing/editing of rows
- **Create:** `client/src/components/reference-tables/ManualColumnEditor.tsx` -- column definition UI for manual creation
- **Create:** `client/src/components/reference-tables/CsvUploadStep.tsx` -- file upload + header selection + preview
- **Create:** `client/src/components/reference-tables/BigQuerySourceStep.tsx` -- credential picker + query input + preview

### 7. New Dependency

- `papaparse` (+ `@types/papaparse`) -- client-side CSV parsing for preview in the wizard
