# Schema Editor Grid - Design Spec

## Overview

Replace the Columns, Assignments, and Permissions tabs on the Exercise Edit page with a single "Data & Assignments" tab containing an AG Grid-based schema editor. This grid shows real exercise records as rows and exercise columns as grid columns, with admin powers layered on: add/edit/delete columns via header interaction, drag-select rows to assign to users, and inline reference table linking.

The General and Data Source tabs remain unchanged.

## Goals

- Provide a spreadsheet-like admin experience for managing exercise columns, data preview, and user assignments in one view
- Make column configuration tangible by showing it alongside real data
- Enable intuitive row-level assignment via drag-select and right-click
- Support adding reference-table-linked picklist columns inline

## Architecture

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `SchemaEditorGrid` | `client/src/components/exercise-edit/SchemaEditorGrid.tsx` | Main AG Grid instance with admin toolbar, column defs, context menu, assignment indicators |
| `ColumnConfigPanel` | `client/src/components/exercise-edit/ColumnConfigPanel.tsx` | Slide-out right panel for add/edit column metadata, reference table linking, delete |
| `SchemaColumnHeader` | `client/src/components/exercise-edit/SchemaColumnHeader.tsx` | Custom AG Grid header component with type badge, reference indicator, click-to-edit |
| `AssignmentContextMenu` | `client/src/components/exercise-edit/AssignmentContextMenu.tsx` | Right-click context menu for row assignment/unassignment |
| `AssignmentColorBar` | `client/src/components/exercise-edit/AssignmentColorBar.tsx` | Cell renderer for assignment indicator column (colored dots per user) |

### Modified Components

| Component | Change |
|-----------|--------|
| `ExerciseEditPage.tsx` | Replace 5 tabs with 3: General, Data Source, Data & Assignments |

### Removed Components

| Component | Reason |
|-----------|--------|
| `ColumnsTab.tsx` | Replaced by SchemaEditorGrid |
| `AssignmentsTab.tsx` | Replaced by SchemaEditorGrid |
| `PermissionsTab.tsx` | Replaced by SchemaEditorGrid |

### Retained Components (moved to advanced assignment dialog)

| Component | New Usage |
|-----------|-----------|
| `RowFilterBuilder.tsx` | Used inside the "Advanced" assignment config dialog for condition-based row filters |
| `ManualRowPicker.tsx` | Used inside the "Advanced" assignment config dialog for manual include/exclude overrides that don't fit drag-select (e.g., specific record IDs by paste) |

### Data Flow

```
ExerciseEditPage
  -> useExerciseDetail(id)          // columns, metadata
  -> useExerciseAssignments(id)     // user list with roles
  -> passes both to SchemaEditorGrid
      -> fetches records (paginated, GET /exercises/:id/records)
      -> fetches batch permissions (GET /exercises/:id/assignments/permissions)
      -> builds column defs from exercise.sourceColumns + exercise.classificationColumns
      -> builds assignment color map: Map<recordId, userId[]>
      -> renders AG Grid with toolbar, headers, context menu
```

No new Zustand stores needed. React Query handles all server state. Local component state within SchemaEditorGrid: selected row IDs, context menu position/visibility, active ColumnConfigPanel state (open/closed, target column).

## Grid Layout

### Toolbar

- **Left side:** "Add Column" button (opens ColumnConfigPanel in add mode), column count summary ("4 source, 2 classification")
- **Right side:** Assignment summary badges ("3 users assigned" -- clickable to open assignment summary dropdown), pagination controls (page size 50)

### Grid Columns

| Position | Column | Width | Behavior |
|----------|--------|-------|----------|
| Pinned left | Row number | 40px | Sequential row index |
| Pinned left | Checkbox | 44px | Multi-select for assignment drag |
| Main area | Source columns | auto | Grey header background, read-only cells, SchemaColumnHeader, click header to edit metadata |
| Main area | Visual separator | 4px | Divider between source and classification |
| Main area | Classification columns | auto | Blue-tinted header background, editable cells (same editors as existing grid), SchemaColumnHeader, click header to edit metadata and config |
| Pinned right | Assignment indicator | 60px | Colored dots per assigned user, tooltip with names |

### Column Headers (SchemaColumnHeader)

Each column header displays:
- Column label (primary text)
- Small type badge ("text", "picklist", "date", etc.)
- Required asterisk (*) if applicable
- Reference table link icon if linked to a reference table
- Hover state: subtle edit icon appears
- Click: opens ColumnConfigPanel for that column

Source column headers: same interactive header but the config panel restricts editable fields (no delete, no type change).

## ColumnConfigPanel

Slide-out panel from the right side (max-w-md). Opens for both "Add Column" and "Edit Column" flows.

### Fields by Context

| Field | Add | Edit (Classification) | Edit (Source) |
|-------|-----|----------------------|---------------|
| Label | required | editable | editable |
| Key | auto-generated from label | read-only | read-only |
| Description | optional | editable | editable |
| Data Type | dropdown | editable (with warning -- see below) | read-only |
| Required | checkbox | editable | editable |
| Default Value | optional | editable | n/a |
| Ordinal / Position | auto (appended to end) | editable (number input) | editable (number input) |
| Picklist Values | textarea, one per line (if picklist/multi_select) | editable | n/a |
| Reference Table | dropdown of available tables (if picklist/multi_select) | editable | n/a |
| Reference Column | dropdown of columns in selected table | editable | n/a |
| Dependent Config | parent column picker (optional) | editable | n/a |
| Delete button | n/a | yes, with impact count + confirmation | no |

### Data Type Change Safety

Changing a classification column's data type is a potentially destructive operation. When the admin changes the type:
- Show a warning: "Changing data type may invalidate existing classification values. N records have data for this column."
- If changing away from `picklist`/`multi_select`: clear `config.picklistValues`, `referenceLink`, and `dependentConfig` after confirmation
- If changing to `picklist`/`multi_select`: prompt to configure picklist values or reference table before saving
- The impact count (records with existing data) is shown alongside the warning

### Computed Columns

Columns with `columnRole: 'computed'` are displayed in the grid after classification columns with a distinct header style (purple-tinted background). They are read-only in both cells and header config (no delete, no type change, no edit -- computed columns are system-managed). The ColumnConfigPanel does not support adding computed columns; they are created by pipeline/system processes.

### Reference Table Linking Flow

1. User selects `picklist` or `multi_select` data type
2. Two options appear: "Enter values manually" (textarea) or "Link reference table" (toggle)
3. If reference table:
   - Dropdown of available reference tables (fetched from `GET /api/v1/reference-tables`)
   - After table selected: dropdown of columns in that table for value source
   - Optional: pick display column (if different from value column)
4. If dependent picklist:
   - Additional "Parent column" dropdown listing other picklist columns in the exercise
   - Parent reference column mapping fields

### Save Behavior

- **Add:** `POST /exercises/:id/columns/add` (new single-column endpoint) -> invalidate exercise detail query -> grid rebuilds column defs with new column
- **Edit:** `PUT /exercises/:id/columns/:colId` (existing endpoint) -> invalidate exercise detail query -> grid refreshes
- **Delete:** shows impact count ("will clear classification data from N records"), confirmation dialog, then `DELETE /exercises/:id/columns/:colId` -> invalidate exercise detail query

Note: The existing `POST /exercises/:id/columns` endpoint is a bulk-replace (deletes all columns and re-inserts). A new single-column-add endpoint is needed to avoid destroying existing columns.

## Assignment System

### Default State

All users with exercise assignments see all rows and all editable columns. No per-row or per-column restrictions exist until an admin explicitly creates them.

### Assignment Flow

1. Admin selects rows via checkboxes (click, shift+click for range, or click-drag)
2. Right-click on selection opens `AssignmentContextMenu`
3. Menu items:
   - "Assign to..." -> submenu listing all users assigned to the exercise
   - "Unassign from..." -> submenu listing users assigned to any of the selected rows (union -- shows all users who have at least one selected row)
4. Selecting a user updates that user's `manualRowOverrides.include` via `PUT /exercises/:id/assignments/:assignmentId/permissions`
5. Assignment indicator column updates to show colored dot for that user

### Assignment Indicator Column (AssignmentColorBar)

- Each assigned user gets a consistent color from a fixed palette (assigned by user index order)
- Cell renderer shows stacked colored dots (max 3 visible, "+N" overflow tooltip)
- Tooltip on hover lists user names assigned to that row
- When no explicit row assignments exist (default state), column shows a subtle "all" indicator (grey dot)

### Unassign Flow

- Select rows -> right-click -> "Unassign from..." -> pick user
- Removes those record IDs from the user's `manualRowOverrides.include`

### Assignment Summary (Toolbar)

Click the "N users assigned" badge to open a dropdown panel:
- Lists each user: name, email, role (editor/viewer), row scope ("all rows" or "47 rows")
- Per-user actions: change role, remove assignment, send notification
- "Add User" button with search (same as current AssignmentsTab flow)
- "Advanced..." link per user opens a dialog with RowFilterBuilder for complex row filters and column-level restrictions

### Edge Cases

- Assigning only works on currently visible (paginated) rows. Toolbar shows "Showing rows 1-50 of 200"
- For large-range assignments, admin uses the "Advanced" RowFilterBuilder via assignment summary
- Users with no explicit row restrictions see everything -- colored dots only appear for users with explicit scoping

## API Changes

### New Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/v1/exercises/:id/columns/add` | Add a single column. Body: `{ key, label, description?, dataType, columnRole, required?, defaultValue?, config?, referenceLink?, dependentConfig?, ordinal? }`. Auto-assigns ordinal to end if not provided. Returns the created column. |
| `PUT` | `/api/v1/exercises/:id/columns/reorder` | Batch update column ordinals. Body: `{ columns: [{ id: string, ordinal: number }] }` |
| `GET` | `/api/v1/exercises/:id/assignments/permissions` | Batch fetch all assignment permissions for the exercise. Joins through `userExerciseAssignments` to include userId. Returns `{ permissions: [{ assignmentId, userId, allowedColumnIds, rowFilter, manualRowOverrides }] }` |

### New Shared Types

Add to `shared/src/types/assignment.ts`:

```typescript
export interface BatchPermissionsResponse {
  permissions: Array<{
    assignmentId: string;
    userId: string;
    allowedColumnIds: string[] | null;
    rowFilter: RowFilter | null;
    manualRowOverrides: ManualRowOverrides | null;
  }>;
}

export interface AddColumnRequest {
  key: string;
  label: string;
  description?: string;
  dataType: string;
  columnRole: 'classification';
  required?: boolean;
  defaultValue?: string | null;
  config?: Record<string, unknown>;
  referenceLink?: Record<string, unknown> | null;
  dependentConfig?: Record<string, unknown> | null;
  ordinal?: number;
}
```

### New API Client Functions

Add to `client/src/api/exercise-edit.ts`:

- `addColumn(exerciseId, column)` -- POST to `/exercises/:id/columns/add`
- `reorderColumns(exerciseId, columns)` -- PUT to `/exercises/:id/columns/reorder`
- `fetchBatchPermissions(exerciseId)` -- GET `/exercises/:id/assignments/permissions`

Add corresponding React Query hooks to `client/src/hooks/useExerciseEdit.ts`:

- `useAddColumn(exerciseId)` -- mutation, invalidates exercise-detail
- `useReorderColumns(exerciseId)` -- mutation, invalidates exercise-detail
- `useBatchPermissions(exerciseId)` -- query, returns assignment color map data

### Existing Endpoints Used

| Endpoint | Usage |
|----------|-------|
| `GET /exercises/:id` | Exercise detail with columns |
| `GET /exercises/:id/records` | Paginated record data for grid |
| `POST /exercises/:id/columns` | Bulk-replace columns (used by wizard only, NOT used by schema editor) |
| `PUT /exercises/:id/columns/:colId` | Update column metadata |
| `DELETE /exercises/:id/columns/:colId` | Delete column (returns impact count) |
| `GET /exercises/:id/assignments` | List assigned users |
| `POST /exercises/:id/assignments/bulk` | Add user assignments |
| `DELETE /exercises/:id/assignments/:id` | Remove assignment |
| `PUT /exercises/:id/assignments/:id` | Update role |
| `PUT /exercises/:id/assignments/:id/permissions` | Update row/column permissions |
| `POST /exercises/:id/assignments/:id/notify` | Send notification |
| `GET /reference-tables` | List available reference tables |
| `GET /reference-tables/:id` | Get table columns for linking |

## Component Interactions

```
SchemaEditorGrid
  |-- Toolbar
  |     |-- "Add Column" button -> opens ColumnConfigPanel (add mode)
  |     |-- Column count summary
  |     |-- Assignment summary badge -> dropdown with user list, add user, advanced config
  |     |-- Pagination controls
  |
  |-- AG Grid
  |     |-- SchemaColumnHeader (per column)
  |     |     |-- Click -> opens ColumnConfigPanel (edit mode, pre-populated)
  |     |
  |     |-- Source cells (read-only, grey)
  |     |-- Classification cells (editable, existing cell editors)
  |     |-- AssignmentColorBar (pinned right, colored dots per user)
  |     |
  |     |-- Row selection (checkboxes + shift-click range)
  |     |-- Right-click -> AssignmentContextMenu
  |           |-- "Assign to [user]" -> updates permissions
  |           |-- "Unassign from [user]" -> updates permissions
  |
  |-- ColumnConfigPanel (slide-out right)
        |-- Column metadata fields
        |-- Reference table linking (conditional on picklist type)
        |-- Delete with impact count (classification columns only)
```

## Pagination

The grid uses **server-side pagination** via the existing `GET /exercises/:id/records` endpoint (supports `page` and `pageSize` query params). Page size defaults to 50. The toolbar shows "Showing rows 1-50 of N" with prev/next controls.

The `assignmentColorMap` is built from the batch permissions endpoint which returns all permissions (not paginated). This map is computed once on load and updated optimistically on assign/unassign. It maps record IDs to user IDs, so only records on the current page are rendered with dots, but the full map is available for any page.

## Visual Separator

Instead of a 4px separator column (which is awkward in AG Grid), use a CSS `border-left: 2px solid var(--border)` on the first classification column header and cells. This achieves the same visual effect as the existing enrichment grid's separator without a fake column.

## State Management

All server state managed via React Query. Local state within SchemaEditorGrid:

| State | Type | Purpose |
|-------|------|---------|
| `selectedRowIds` | `Set<string>` | Currently selected record IDs for assignment |
| `contextMenu` | `{ x: number, y: number, visible: boolean }` | Context menu position |
| `configPanel` | `{ open: boolean, column: ExerciseColumn \| null, mode: 'add' \| 'edit' }` | ColumnConfigPanel state |
| `assignmentColorMap` | `Map<string, string[]>` | recordId -> userId[] mapping built from batch permissions |
| `userColorPalette` | `Map<string, string>` | userId -> CSS color for consistent assignment dots |

### Optimistic Updates

Assignment operations (assign/unassign) use optimistic updates on the `assignmentColorMap` to make the interaction feel instant:
1. On assign: immediately add the userId to the selected record IDs in the local map, update grid
2. On mutation success: no-op (already reflected)
3. On mutation error: roll back the map to previous state, show error toast

Column operations (add/edit/delete) do NOT use optimistic updates -- they invalidate the exercise detail query and let the grid rebuild naturally, since column changes affect the grid structure itself.

## Testing Considerations

- Column config panel: unit test form validation, reference table linking toggle behavior
- Assignment context menu: test menu visibility, user list rendering
- Assignment color map: unit test the mapping logic from permissions to per-row colors
- Integration: test that column add/edit/delete triggers grid refresh
- No new server tests needed beyond the two new endpoints (reorder, batch permissions)
