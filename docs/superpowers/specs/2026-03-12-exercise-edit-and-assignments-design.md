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

### Tabs

1. **General** - name, description, deadline, status, view mode
2. **Data Source** - BigQuery connection settings (gcpProject, dataset, table/query, credentials, refresh schedule)
3. **Columns** - source columns (read-only display) + classification columns (editable: add/remove/reorder, change type, validation rules, reference links)
4. **Assignments** - search & add users, set roles, bulk assign, remove, send email notifications
5. **Permissions** - per-user column access (checkbox matrix: user x column) + row filters (filter builder per user with manual override)

Destructive structural changes (removing columns, changing data source) show confirmation dialogs with impact counts.

## Database Schema Changes

### New table: `assignment_permissions`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| assignment_id | uuid (FK -> user_exercise_assignments.id) | |
| allowed_columns | text[] (nullable) | null = all columns |
| row_filter | jsonb (nullable) | null = all rows |
| manual_row_overrides | jsonb (nullable) | explicit include/exclude row IDs |
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

**`manual_row_overrides` shape:**

```json
{
  "include": ["row-uuid-1", "row-uuid-2"],
  "exclude": ["row-uuid-3"]
}
```

### Modified table: `user_exercise_assignments`

- Add `last_reminder_sent_at: timestamp (nullable)` - prevents duplicate deadline reminders

### No other existing table changes.

## API Changes

### New endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/exercises/:id/assignments/:assignmentId/permissions` | Fetch permissions for an assignment |
| PUT | `/exercises/:id/assignments/:assignmentId/permissions` | Update column/row permissions |
| POST | `/exercises/:id/assignments/bulk` | Bulk assign multiple users (accepts array of `{ userId, role }`) |
| POST | `/exercises/:id/assignments/:assignmentId/notify` | Send email notification to assigned user |

### Modified endpoints

- **`GET /exercises/:id/records`** - Join `assignment_permissions` for non-admin users. Apply `row_filter` as WHERE clauses, apply `manual_row_overrides` (includes as OR, excludes as AND NOT), strip disallowed columns from `sourceData` and `classifications` in response.
- **`PUT /exercises/:id/records/:recordId/classify`** - Reject writes to columns not in user's `allowed_columns`.
- **`POST /exercises/:id/records/bulk-classify`** - Same column access enforcement.
- **`PUT /exercises/:id`** - Extend to accept structural updates with impact calculation.
- **`DELETE /exercises/:id/columns/:colId`** - Return impact count: `{ success: true, affectedRecords: N }`.

## Frontend Components

### New files

| File | Description |
|------|-------------|
| `client/src/pages/ExerciseEditPage.tsx` | Main edit page with tab navigation, loads exercise data on mount |
| `client/src/components/exercise-edit/GeneralTab.tsx` | Name, description, deadline, status, view mode form |
| `client/src/components/exercise-edit/DataSourceTab.tsx` | BigQuery config form |
| `client/src/components/exercise-edit/ColumnsTab.tsx` | Column table with inline edit, add/remove/reorder, validation rule editor |
| `client/src/components/exercise-edit/AssignmentsTab.tsx` | User search, bulk assign, role management, email notification buttons |
| `client/src/components/exercise-edit/PermissionsTab.tsx` | Column access matrix + row filter builder per user |
| `client/src/components/exercise-edit/RowFilterBuilder.tsx` | Reusable filter condition builder with AND/OR logic |
| `client/src/components/exercise-edit/ImpactConfirmDialog.tsx` | Confirmation dialog showing affected record counts |

### New hooks

- `useExerciseEdit(exerciseId)` - React Query hook fetching exercise detail, assignments, permissions, and source config in parallel
- `useExerciseUpdate(exerciseId)` - Mutation hooks for saving each tab's changes independently

### Modified files

- `ExercisesPage.tsx` - Add edit icon button on each exercise card
- `ExerciseProgressDrawer.tsx` - Add "Edit Exercise" button linking to edit page
- Router config - Add `/exercises/:id/edit` route

### State management

No new Zustand store. Each tab manages its own form state locally, saves via React Query mutations. Unsaved changes trigger a "You have unsaved changes" prompt on tab switch or navigation away.

## Permission Enforcement

### Server-side (security boundary)

For non-admin users on `GET /exercises/:id/records`:
1. Look up assignment + permissions for this exercise
2. If `allowed_columns` set: strip disallowed columns from `sourceData` and `classifications`
3. If `row_filter` set: convert conditions to SQL WHERE clauses
4. If `manual_row_overrides` set: apply includes (OR with filter) and excludes (AND NOT)
5. If no assignment exists: return 403

On classify endpoints:
1. Verify assignment with `editor` role
2. Reject values targeting disallowed columns
3. Verify target records fall within allowed rows

### Client-side (UX polish)

- AG Grid column definitions filtered to allowed columns only
- Disallowed classification columns rendered as read-only cells
- Records query automatically scoped by server response

Admin users bypass all permission checks.

## Email Notification System

### Service: `server/src/services/email.ts`

Thin abstraction with `sendEmail(to, subject, body)`. Configurable provider via `EMAIL_PROVIDER` env var.

- **Dev mode**: Logs to console
- **Production**: SES or SendGrid (swappable via env config)

### Email templates

| Trigger | Content |
|---------|---------|
| Assignment | "You've been assigned to [Exercise] as [role]. Deadline: [date]." |
| Deadline reminder | "Reminder: [Exercise] deadline is [date]. You have [X] unclassified records." |
| Reassignment | "Your assignment on [Exercise] has been updated. New role: [role]." |
| Admin manual | Free-form message from Assignments tab |

### Deadline reminder scheduling

A daily cron job (using existing `node-cron`) checks for exercises with deadlines within a configurable reminder window (default 3 days). Sends one reminder per user per deadline period, tracked via `last_reminder_sent_at` on the assignment.
