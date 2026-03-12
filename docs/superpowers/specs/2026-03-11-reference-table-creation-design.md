# Reference Table Creation & Inline Editing

**Date:** 2026-03-11
**Status:** Approved

## Overview

Add the ability to create new reference tables and edit their rows inline on the Reference Tables page. Currently the page only displays a read-only list with delete. This spec adds a creation wizard modal (Manual, CSV, BigQuery sources) and expandable inline row editing via AG Grid.

## Constraints

- Admin-only for all write operations (create, edit rows, import, delete)
- Regular users can view tables and their rows (read-only grid)
- Backend API already supports all required operations -- this is a UI-only feature
- Reference tables have low column counts; wide modal is sufficient for all flows

## Design

### 1. Reference Tables Page Updates

- **"Create Reference Table" button** in the page header, visible to admins only
- **Expandable table rows** -- clicking a row expands it to reveal an inline AG Grid showing the table's rows
- Existing metadata display (name, columns, row count, refresh source) and delete button unchanged

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
- Optional: add initial rows inline
- "Create" button

**CSV Upload:**
- File dropzone (accepts .csv files)
- On upload: parse file, display preview table (first ~10 rows)
- Toggle to select which row is the header (defaults to row 0)
- Columns auto-detected from selected header row
- "Create" button imports all rows

**BigQuery:**
- Dropdown to select from stored credentials
- Text input for table name or SQL query
- "Preview" button fetches sample rows and displays them
- "Create" button creates table and populates from query results

Back button returns to step 1. Modal closes on successful creation.

### 3. Inline Row Editing

When a table row is expanded on the list page:

- **AG Grid** displays all columns and rows for that table
- **Read-only** for regular users
- **Editable for admins:**
  - Click cell to edit inline, save on blur/Enter
  - Admin toolbar above grid: "Add Row", "Import CSV" (re-import with confirmation), "Delete Row" (selected rows)
  - If table has a BigQuery refresh source, show "Refresh from BigQuery" button

### 4. Data Flow & Error Handling

- **Creation flow:** POST `/api/v1/reference-tables` to create the table, then immediately import data (CSV via `/:id/import-csv`, BigQuery via `/:id/refresh-bigquery`). If import fails after creation, show error toast but keep the empty table for retry.
- **Inline edits:** Optimistic UI updates, rollback on API error with toast notification.
- **CSV re-import:** Confirmation dialog warning all existing rows will be replaced. Backend creates version snapshot before replacement.
- **Validation:** Name required, CSV must parse successfully, BigQuery credentials must be selected. No column-level data type validation.
- **State management:** React Query for server state. No new Zustand store -- grid state is local to the expanded row component.

### 5. API Endpoints Used (all existing)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/reference-tables` | Create table |
| GET | `/api/v1/reference-tables` | List tables |
| GET | `/api/v1/reference-tables/:id` | Get table with rows |
| PUT | `/api/v1/reference-tables/:id` | Update metadata |
| DELETE | `/api/v1/reference-tables/:id` | Delete table |
| POST | `/api/v1/reference-tables/:id/rows` | Add rows |
| PUT | `/api/v1/reference-tables/:id/rows/:rowId` | Update row |
| DELETE | `/api/v1/reference-tables/:id/rows/:rowId` | Delete row |
| POST | `/api/v1/reference-tables/:id/import-csv` | CSV import |
| POST | `/api/v1/reference-tables/:id/refresh-bigquery` | BigQuery refresh |

### 6. Components to Create/Modify

- **Modify:** `ReferenceTablesPage.tsx` -- add create button, make rows expandable with inline grid
- **Create:** `CreateReferenceTableModal.tsx` -- 2-step wizard modal
- **Create:** `ReferenceTableGrid.tsx` -- AG Grid component for inline viewing/editing of rows
- **Create:** `ManualColumnEditor.tsx` -- column definition UI for manual creation
- **Create:** `CsvUploadStep.tsx` -- file upload + header selection + preview
- **Create:** `BigQuerySourceStep.tsx` -- credential picker + query input + preview
