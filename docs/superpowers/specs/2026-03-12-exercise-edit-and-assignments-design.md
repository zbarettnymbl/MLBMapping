# Exercise Editing & Assignment Management Design

## Problem

Once an exercise is published, there is no UI to edit it or manage user assignments. Admins cannot change exercise metadata, modify columns, update assignments, or configure per-user permissions on active exercises.

## Solution

A dedicated tabbed edit page at `/exercises/:id/edit` with full exercise editing, assignment management, granular permissions (row + column level), and email notifications.

## Page Structure & Routing

- **Route**: `/exercises/:id/edit` (admin only)
- **Layout**: Tabbed page with 5 tabs: General, Data Source, Columns, Assignments, Permissions
- **Entry points**:
  - Edit button on each exercise card in `ExercisesPage`
  - Edit button in `ExerciseProgressDrawer` on the admin dashboard

**Note**: The backend uses `:id` as the route param; the frontend currently uses `:exerciseId` in some routes. Standardize on `:id` across both for this feature. Existing frontend routes that use `:exerciseId` are out of scope but should be migrated in a follow-up.

### Tabs

1. **General** - name, description, deadline, view mode. Status displayed as read-only badge; status transitions via dedicated actions (see Status Transitions below).
2. **Data Source** - BigQuery connection settings (gcpProject, dataset, table/query, credentials, refresh schedule)
3. **Columns** - source columns (read-only display) + classification columns (editable: add/remove/reorder, change type, validation rules, reference links)
4. **Assignments** - search & add users, set roles, bulk assign, remove, send email notifications
5. **Permissions** - per-user column access (checkbox matrix: user x column) + row filters (filter builder per user with manual override)

Destructive structural changes (removing columns, changing data source) show confirmation dialogs with impact counts.

### Status Transitions

Allowed transitions (enforced server-side):

- `draft` -> `active` (via existing publish endpoint)
- `active` -> `paused`
- `paused` -> `active`
- `active` -> `completed`
- `completed` -> `archived`
- `active` -> `archived`

The General tab shows the current status as a badge with action buttons for valid transitions only (e.g., "Pause", "Complete", "Archive"). No free-form status dropdown.

### Unsaved Changes Guard

Uses React Router's `useBlocker` hook to intercept navigation away from the page. Also intercepts tab switches within the page. Shows a dialog: "You have unsaved changes. Discard or stay?" Discarding reverts the tab's form state to the last saved values.

## Database Schema Changes

### New table: `assignment_permissions`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| assignment_id | uuid (FK -> user_exercise_assignments.id, unique) | One permission record per assignment |
| allowed_column_ids | uuid[] (nullable) | References exerciseColumns.id. null = all columns. Uses IDs not keys to survive column renames. |
| row_filter | jsonb (nullable) | null = all rows |
| manual_row_overrides | jsonb (nullable) | explicit include/exclude row IDs, max 1000 entries per array |
| created_at | timestamp | |
| updated_at | timestamp | |

**`row_filter` shape:**

```json
{
  "conditions": [
    { "column": "region", "operator": "eq", "value": "East" },
    { "column": "sport", "operator": "in", "values": ["Baseball", "Softball"] }
  ],
  "logic": "and"
}
```

The `column` field in conditions refers to a source data column key. **Server must validate** that the column key exists in the exercise's `exerciseColumns` before converting to SQL. Invalid column names are rejected with a 400 error. Column values are always parameterized (never interpolated via `sql.raw()`).

Supported operators: `eq`, `neq`, `in`, `not_in`, `contains`, `starts_with`, `is_null`, `is_not_null`.

**`manual_row_overrides` shape:**

```json
{
  "include": ["row-uuid-1", "row-uuid-2"],
  "exclude": ["row-uuid-3"]
}
```

Max 1000 entries per array. In the Permissions tab UI, admins select rows via a searchable record picker (paginated, using the existing records endpoint with filters). Stale UUIDs (deleted/archived rows) are silently ignored at query time.

### New unique constraint: `user_exercise_assignments`

Add unique index on `(user_id, exercise_id)` to prevent duplicate assignments.

### Modified table: `user_exercise_assignments`

- Add `last_reminder_sent_at: timestamp (nullable)` - prevents duplicate deadline reminders

### Classification data cleanup on column delete

When a classification column is deleted, a background cleanup removes the orphaned key from `enrichmentRecords.classifications` JSONB for all records in that exercise. This runs asynchronously after the delete response is sent. Orphaned keys don't break anything functionally (they're ignored), but cleanup keeps the data clean.

## API Changes

### New endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/exercises/:id/assignments/:assignmentId/permissions` | Fetch permissions for an assignment |
| PUT | `/exercises/:id/assignments/:assignmentId/permissions` | Update column/row permissions |
| PUT | `/exercises/:id/assignments/:assignmentId` | Update assignment role |
| POST | `/exercises/:id/assignments/bulk` | Bulk assign multiple users (accepts `{ users: [{ userId, role }] }`). Skips users already assigned; returns `{ created: [...], skipped: [...] }`. |
| POST | `/exercises/:id/assignments/:assignmentId/notify` | Send email notification. Body: `{ type: "assignment" | "reminder" | "custom", message?: string }` |
| GET | `/exercises/:id/source-config` | Fetch BigQuery source config (gcpProject, dataset, tableOrQuery, queryType, credentialId, refreshSchedule) |
| PUT | `/exercises/:id/status` | Transition exercise status. Body: `{ status: string }`. Validates allowed transitions server-side. |

### Modified endpoints

- **`GET /exercises/:id/records`** - Join `assignment_permissions` for non-admin users. Apply `row_filter` as parameterized WHERE clauses (column names validated against exerciseColumns), apply `manual_row_overrides` (includes as OR, excludes as AND NOT), strip disallowed columns from `sourceData` and `classifications` in response.
- **`PUT /exercises/:id/records/:recordId/classify`** - Reject writes to columns not in user's `allowed_column_ids`.
- **`POST /exercises/:id/records/bulk-classify`** - Same column access enforcement.
- **`PUT /exercises/:id`** - Extend to accept structural updates with impact calculation.
- **`DELETE /exercises/:id/columns/:colId`** - Count records with non-null values for the column, return `{ success: true, affectedRecords: N }`. Triggers async JSONB cleanup of orphaned classification keys.

## Frontend Components

### New files

| File | Description |
|------|-------------|
| `client/src/pages/ExerciseEditPage.tsx` | Main edit page with tab navigation, loads exercise data on mount |
| `client/src/components/exercise-edit/GeneralTab.tsx` | Name, description, deadline, view mode form + status transition buttons |
| `client/src/components/exercise-edit/DataSourceTab.tsx` | BigQuery config form |
| `client/src/components/exercise-edit/ColumnsTab.tsx` | Column table with inline edit, add/remove/reorder, validation rule editor |
| `client/src/components/exercise-edit/AssignmentsTab.tsx` | User search, bulk assign, role management, email notification buttons |
| `client/src/components/exercise-edit/PermissionsTab.tsx` | Column access matrix + row filter builder per user |
| `client/src/components/exercise-edit/RowFilterBuilder.tsx` | Reusable filter condition builder with AND/OR logic toggle |
| `client/src/components/exercise-edit/ManualRowPicker.tsx` | Searchable, paginated record picker for manual include/exclude overrides |
| `client/src/components/exercise-edit/ImpactConfirmDialog.tsx` | Confirmation dialog showing affected record counts |

### New hooks

- `useExerciseEdit(exerciseId)` - React Query hook fetching exercise detail, assignments, permissions, and source config in parallel
- `useExerciseUpdate(exerciseId)` - Mutation hooks for saving each tab's changes independently

### Modified files

- `ExercisesPage.tsx` - Add edit icon button on each exercise card
- `ExerciseProgressDrawer.tsx` - Add "Edit Exercise" button linking to edit page
- Router config - Add `/exercises/:id/edit` route

### State management

No new Zustand store. Each tab manages its own form state locally, saves via React Query mutations. Unsaved changes use the guard described above.

## Permission Enforcement

### Server-side (security boundary)

For non-admin users on `GET /exercises/:id/records`:
1. Look up assignment + permissions for this exercise
2. If `allowed_column_ids` set: resolve to column keys, strip disallowed columns from `sourceData` and `classifications`
3. If `row_filter` set: validate column names against exerciseColumns, convert to parameterized SQL WHERE clauses
4. If `manual_row_overrides` set: apply includes (OR with filter) and excludes (AND NOT), silently skip stale UUIDs
5. If no assignment exists: return 403

On classify endpoints:
1. Verify assignment with `editor` role
2. Reject values targeting columns not in `allowed_column_ids`
3. Verify target records fall within allowed rows

### Client-side (UX polish)

- AG Grid column definitions filtered to allowed columns only
- Disallowed classification columns rendered as read-only cells
- Records query automatically scoped by server response

Admin users bypass all permission checks.

## Email Notification System

### Service: `server/src/services/email.ts`

Thin abstraction with `sendEmail(to, subject, body)`. Configurable provider via env vars.

- **Dev mode** (default): Logs to console
- **Production**: SES or SendGrid

### New environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `EMAIL_PROVIDER` | `console`, `ses`, or `sendgrid` | `console` |
| `EMAIL_FROM_ADDRESS` | Sender address for outgoing emails | `noreply@mapforge.dev` |
| `SENDGRID_API_KEY` | SendGrid API key (when provider = sendgrid) | - |
| `AWS_SES_REGION` | AWS SES region (when provider = ses) | `us-east-1` |
| `REMINDER_WINDOW_DAYS` | Days before deadline to send reminder | `3` |

### Email templates

| Trigger | Content |
|---------|---------|
| Assignment | "You've been assigned to [Exercise] as [role]. Deadline: [date]." |
| Deadline reminder | "Reminder: [Exercise] deadline is [date]. You have [X] unclassified records." |
| Reassignment | "Your assignment on [Exercise] has been updated. New role: [role]." |
| Admin manual | Free-form message passed via `POST .../notify` with `type: "custom"` and `message` body param |

### Deadline reminder scheduling

A daily cron job (using existing `node-cron`) checks for exercises with deadlines within `REMINDER_WINDOW_DAYS`. Sends one reminder per user per deadline period, tracked via `last_reminder_sent_at` on the assignment. Rate limited to 1 notification per user per assignment per 24 hours.
