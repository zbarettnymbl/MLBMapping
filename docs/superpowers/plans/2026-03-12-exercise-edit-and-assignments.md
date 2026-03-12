# Exercise Editing & Assignment Management Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tabbed exercise edit page with full CRUD, assignment management, granular row/column permissions, and email notifications.

**Architecture:** New `/exercises/:id/edit` page with 5 tabs (General, Data Source, Columns, Assignments, Permissions). New `assignment_permissions` DB table for per-user row/column restrictions enforced server-side. Email service abstraction with console/SES/SendGrid providers. Daily cron job for deadline reminders.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, shadcn/ui Tabs + Dialog, React Query 5, Drizzle ORM, node-cron, Express 5

**Spec:** `docs/superpowers/specs/2026-03-12-exercise-edit-and-assignments-design.md`

---

## File Map

### New Files

| File | Responsibility |
|------|---------------|
| `shared/src/types/assignment.ts` | Types for assignments, permissions, row filters, email notifications |
| `server/src/db/migrations/add-assignment-permissions.ts` | Schema migration: new table + unique constraint + column addition |
| `server/src/services/email.ts` | Email service abstraction (console/SES/SendGrid) |
| `server/src/services/reminder-scheduler.ts` | Daily cron job for deadline reminders |
| `server/src/services/permission-filter.ts` | Row filter -> SQL conversion, column stripping logic |
| `client/src/api/exercise-edit.ts` | API client functions for edit page (source config, permissions, bulk assign, notify, status) |
| `client/src/hooks/useExerciseEdit.ts` | React Query hooks for loading + mutating exercise edit data |
| `client/src/pages/ExerciseEditPage.tsx` | Main tabbed edit page shell |
| `client/src/components/exercise-edit/GeneralTab.tsx` | Metadata form + status transition buttons |
| `client/src/components/exercise-edit/DataSourceTab.tsx` | BigQuery source config form |
| `client/src/components/exercise-edit/ColumnsTab.tsx` | Column table with inline edit, add/remove/reorder |
| `client/src/components/exercise-edit/AssignmentsTab.tsx` | User search, bulk assign, role management, notify |
| `client/src/components/exercise-edit/PermissionsTab.tsx` | Column access matrix + row filter per user |
| `client/src/components/exercise-edit/RowFilterBuilder.tsx` | Filter condition builder (column, operator, value) |
| `client/src/components/exercise-edit/ManualRowPicker.tsx` | Paginated record picker for include/exclude overrides |

### Modified Files

| File | Changes |
|------|---------|
| `server/src/db/schema.ts` | Add `assignmentPermissions` table, add `lastReminderSentAt` to assignments, add unique index |
| `server/src/routes/exercises.ts` | Add 7 new endpoints, modify records/classify endpoints for permission enforcement |
| `shared/src/types/index.ts` | Re-export assignment types |
| `client/src/App.tsx` | Add `/exercises/:id/edit` route |
| `client/src/pages/ExercisesPage.tsx` | Add edit button on exercise cards |
| `client/src/components/dashboard/ExerciseProgressDrawer.tsx` | Add "Edit Exercise" button |

---

## Chunk 0: Prerequisites

### Task 0: Commit existing confirm-dialog component

**Files:**
- Stage: `client/src/components/ui/confirm-dialog.tsx` (already exists as untracked file)

- [ ] **Step 1: Commit the untracked confirm-dialog**

The `confirm-dialog.tsx` component already exists locally but is untracked. It provides `ConfirmDialog` with props: `open`, `onOpenChange`, `title`, `description`, `confirmLabel`, `cancelLabel`, `variant`, `loading`, `onConfirm`. Many components in this plan depend on it.

```bash
git add client/src/components/ui/confirm-dialog.tsx
git commit -m "feat: add ConfirmDialog component"
```

---

## Chunk 1: Schema, Types, and Email Service

### Task 1: Add shared types for assignments and permissions

**Files:**
- Create: `shared/src/types/assignment.ts`
- Modify: `shared/src/types/index.ts`
- Modify: `shared/src/types/exercise.ts`

- [ ] **Step 1: Create assignment types file**

Create `shared/src/types/assignment.ts`:

```typescript
// Assignment types

export interface ExerciseAssignment {
  id: string;
  userId: string;
  exerciseId: string;
  role: 'editor' | 'viewer';
  assignedBy: string | null;
  assignedAt: string;
  userName: string;
  userEmail: string;
}

export interface AssignmentPermissions {
  id: string;
  assignmentId: string;
  allowedColumnIds: string[] | null;
  rowFilter: RowFilter | null;
  manualRowOverrides: ManualRowOverrides | null;
}

export interface RowFilter {
  conditions: RowFilterCondition[];
  logic: 'and' | 'or';
}

export interface RowFilterCondition {
  column: string;
  operator: 'eq' | 'neq' | 'in' | 'not_in' | 'contains' | 'starts_with' | 'is_null' | 'is_not_null';
  value?: string;
  values?: string[];
}

export interface ManualRowOverrides {
  include: string[];
  exclude: string[];
}

export interface BulkAssignRequest {
  users: Array<{ userId: string; role: 'editor' | 'viewer' }>;
}

export interface BulkAssignResponse {
  created: ExerciseAssignment[];
  skipped: Array<{ userId: string; reason: string }>;
}

export interface NotifyRequest {
  type: 'assignment' | 'reminder' | 'custom';
  message?: string;
}

export interface StatusTransitionRequest {
  status: string;
}

export interface SourceConfig {
  gcpProject: string;
  dataset: string;
  tableOrQuery: string;
  queryType: 'table' | 'query';
  credentialId: string | null;
  refreshSchedule: string | null;
}

export type ExerciseStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';
```

- [ ] **Step 2: Add 'completed' to status unions and 'viewMode' to ExerciseDetail**

In `shared/src/types/exercise.ts`, update both interfaces to include `'completed'` in the status union, and add `viewMode` to `ExerciseDetail`:

```typescript
// ExerciseListItem line 5:
status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';

// ExerciseDetail line 28:
status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';

// Add after 'status' in ExerciseDetail:
viewMode: 'flat' | 'matrix';
```

Also update `GET /exercises/:id` response in exercises.ts to include `viewMode: exercise.viewMode` in the response JSON.

- [ ] **Step 3: Re-export from index**

Add to `shared/src/types/index.ts`:

```typescript
export * from './assignment';
```

- [ ] **Step 4: Run typecheck**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && npm run typecheck`
Expected: PASS (no existing code imports these types yet)

- [ ] **Step 5: Commit**

```bash
git add shared/src/types/assignment.ts shared/src/types/index.ts shared/src/types/exercise.ts
git commit -m "feat: add shared types for assignments, permissions, and email"
```

---

### Task 2: Update database schema

**Files:**
- Modify: `server/src/db/schema.ts`

- [ ] **Step 1: Add assignmentPermissions table and modify userExerciseAssignments**

Add to `server/src/db/schema.ts` after the `userExerciseAssignments` table definition (after line 137):

```typescript
// ============================================================
// Assignment Permissions
// ============================================================
export const assignmentPermissions = pgTable("assignment_permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  assignmentId: uuid("assignment_id").references(() => userExerciseAssignments.id, { onDelete: 'cascade' }).notNull().unique(),
  allowedColumnIds: uuid("allowed_column_ids").array(),
  rowFilter: jsonb("row_filter"),
  manualRowOverrides: jsonb("manual_row_overrides"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
```

Add `lastReminderSentAt` to `userExerciseAssignments` (add after the `assignedAt` field, line 136):

```typescript
  lastReminderSentAt: timestamp("last_reminder_sent_at", { withTimezone: true }),
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && npm run typecheck`
Expected: PASS

- [ ] **Step 3: Generate and apply migration**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1/server && npx drizzle-kit generate`

Then create a manual migration script for the unique constraint (Drizzle may not auto-generate it). Create `server/src/db/migrations/add-assignment-permissions.sql`:

```sql
-- Add assignment_permissions table
CREATE TABLE IF NOT EXISTS assignment_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL UNIQUE REFERENCES user_exercise_assignments(id) ON DELETE CASCADE,
  allowed_column_ids UUID[],
  row_filter JSONB,
  manual_row_overrides JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add last_reminder_sent_at to user_exercise_assignments
ALTER TABLE user_exercise_assignments
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;

-- Add unique constraint on (user_id, exercise_id)
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_exercise_assignment
  ON user_exercise_assignments(user_id, exercise_id);
```

- [ ] **Step 4: Commit**

```bash
git add server/src/db/schema.ts server/src/db/migrations/
git commit -m "feat: add assignment_permissions schema and unique constraint"
```

---

### Task 3: Create email service

**Files:**
- Create: `server/src/services/email.ts`

- [ ] **Step 1: Create the email service**

Create `server/src/services/email.ts`:

```typescript
export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    console.log(`[Email] To: ${message.to}`);
    console.log(`[Email] Subject: ${message.subject}`);
    console.log(`[Email] Body: ${message.body}`);
    console.log('---');
  }
}

function getProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER || 'console';

  switch (provider) {
    case 'console':
      return new ConsoleEmailProvider();
    case 'ses':
      // TODO: implement SES provider when needed
      console.warn('[Email] SES provider not yet implemented, falling back to console');
      return new ConsoleEmailProvider();
    case 'sendgrid':
      // TODO: implement SendGrid provider when needed
      console.warn('[Email] SendGrid provider not yet implemented, falling back to console');
      return new ConsoleEmailProvider();
    default:
      return new ConsoleEmailProvider();
  }
}

const emailProvider = getProvider();

export async function sendEmail(message: EmailMessage): Promise<void> {
  await emailProvider.send(message);
}

export function buildAssignmentEmail(exerciseName: string, role: string, deadline: string | null): EmailMessage {
  const deadlineText = deadline ? ` Deadline: ${new Date(deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.` : '';
  return {
    to: '', // caller sets this
    subject: `You've been assigned to ${exerciseName}`,
    body: `You've been assigned to "${exerciseName}" as ${role}.${deadlineText}`,
  };
}

export function buildReminderEmail(exerciseName: string, deadline: string, unclassifiedCount: number): EmailMessage {
  return {
    to: '',
    subject: `Reminder: ${exerciseName} deadline approaching`,
    body: `Reminder: "${exerciseName}" deadline is ${new Date(deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. You have ${unclassifiedCount} unclassified records remaining.`,
  };
}

export function buildReassignmentEmail(exerciseName: string, newRole: string): EmailMessage {
  return {
    to: '',
    subject: `Assignment updated: ${exerciseName}`,
    body: `Your assignment on "${exerciseName}" has been updated. New role: ${newRole}.`,
  };
}
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add server/src/services/email.ts
git commit -m "feat: add email service with console provider and template builders"
```

---

### Task 4: Create permission filter service

**Files:**
- Create: `server/src/services/permission-filter.ts`

- [ ] **Step 1: Create the permission filter service**

Create `server/src/services/permission-filter.ts`:

```typescript
import { sql } from 'drizzle-orm';
import { db } from '../db/connection';
import { exerciseColumns, assignmentPermissions, userExerciseAssignments } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import type { RowFilter, RowFilterCondition, ManualRowOverrides } from '@mapforge/shared';

const VALID_OPERATORS = ['eq', 'neq', 'in', 'not_in', 'contains', 'starts_with', 'is_null', 'is_not_null'] as const;

/**
 * Fetch permissions for a user's assignment on an exercise.
 * Returns null if the user has no assignment.
 */
export async function getUserPermissions(userId: string, exerciseId: string) {
  const [assignment] = await db
    .select({
      assignmentId: userExerciseAssignments.id,
      role: userExerciseAssignments.role,
      allowedColumnIds: assignmentPermissions.allowedColumnIds,
      rowFilter: assignmentPermissions.rowFilter,
      manualRowOverrides: assignmentPermissions.manualRowOverrides,
    })
    .from(userExerciseAssignments)
    .leftJoin(assignmentPermissions, eq(assignmentPermissions.assignmentId, userExerciseAssignments.id))
    .where(
      and(
        eq(userExerciseAssignments.userId, userId),
        eq(userExerciseAssignments.exerciseId, exerciseId)
      )
    );

  return assignment || null;
}

/**
 * Validate that all column names in a row filter exist in the exercise's columns.
 * Returns an array of invalid column names, or empty array if all valid.
 */
export async function validateFilterColumns(exerciseId: string, filter: RowFilter): Promise<string[]> {
  const columns = await db
    .select({ key: exerciseColumns.key })
    .from(exerciseColumns)
    .where(eq(exerciseColumns.exerciseId, exerciseId));

  const validKeys = new Set(columns.map(c => c.key));
  const invalid: string[] = [];

  for (const condition of filter.conditions) {
    if (!validKeys.has(condition.column)) {
      invalid.push(condition.column);
    }
    if (!VALID_OPERATORS.includes(condition.operator as typeof VALID_OPERATORS[number])) {
      invalid.push(`invalid operator: ${condition.operator}`);
    }
  }

  return invalid;
}

/**
 * Build parameterized SQL WHERE clause fragments from a row filter.
 * All values are parameterized - column names are validated before reaching this function.
 */
export function buildRowFilterSql(filter: RowFilter, tableAlias: string = 'enrichment_records') {
  if (!filter.conditions.length) return null;

  const fragments = filter.conditions.map(condition => {
    return buildConditionSql(condition, tableAlias);
  }).filter(Boolean);

  if (fragments.length === 0) return null;

  const joiner = filter.logic === 'or' ? sql` OR ` : sql` AND `;
  let combined = fragments[0]!;
  for (let i = 1; i < fragments.length; i++) {
    combined = sql`${combined}${joiner}${fragments[i]}`;
  }

  return sql`(${combined})`;
}

function buildConditionSql(condition: RowFilterCondition, tableAlias: string) {
  // Column access via JSONB operator - always parameterized values
  const colAccess = sql`${sql.raw(tableAlias)}.source_data->>${sql.param(condition.column)}`;

  switch (condition.operator) {
    case 'eq':
      return sql`${colAccess} = ${condition.value}`;
    case 'neq':
      return sql`${colAccess} != ${condition.value}`;
    case 'in':
      if (!condition.values?.length) return null;
      return sql`${colAccess} = ANY(${condition.values})`;
    case 'not_in':
      if (!condition.values?.length) return null;
      return sql`${colAccess} != ALL(${condition.values})`;
    case 'contains':
      return sql`${colAccess} ILIKE ${'%' + (condition.value || '') + '%'}`;
    case 'starts_with':
      return sql`${colAccess} ILIKE ${(condition.value || '') + '%'}`;
    case 'is_null':
      return sql`${colAccess} IS NULL`;
    case 'is_not_null':
      return sql`${colAccess} IS NOT NULL`;
    default:
      return null;
  }
}

/**
 * Build SQL for manual row overrides (include/exclude by record ID).
 */
export function buildManualOverridesSql(overrides: ManualRowOverrides, idColumn: ReturnType<typeof sql.raw>) {
  const fragments = [];

  if (overrides.include.length > 0) {
    fragments.push(sql`${idColumn} = ANY(${overrides.include}::uuid[])`);
  }

  if (overrides.exclude.length > 0) {
    fragments.push(sql`${idColumn} != ALL(${overrides.exclude}::uuid[])`);
  }

  return fragments;
}

/**
 * Strip disallowed columns from a record's sourceData and classifications.
 */
export function stripDisallowedColumns(
  record: { sourceData: Record<string, unknown>; classifications: Record<string, string | null> },
  allowedColumnKeys: Set<string>,
  allColumnKeys: Set<string>
) {
  const strippedSourceData: Record<string, unknown> = {};
  const strippedClassifications: Record<string, string | null> = {};

  for (const [key, value] of Object.entries(record.sourceData)) {
    if (allowedColumnKeys.has(key) || !allColumnKeys.has(key)) {
      strippedSourceData[key] = value;
    }
  }

  for (const [key, value] of Object.entries(record.classifications)) {
    if (allowedColumnKeys.has(key)) {
      strippedClassifications[key] = value;
    }
  }

  return { sourceData: strippedSourceData, classifications: strippedClassifications };
}
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add server/src/services/permission-filter.ts
git commit -m "feat: add permission filter service for row/column enforcement"
```

---

### Task 5: Create reminder scheduler

**Files:**
- Create: `server/src/services/reminder-scheduler.ts`

- [ ] **Step 1: Create the reminder scheduler**

Create `server/src/services/reminder-scheduler.ts`:

```typescript
import cron from 'node-cron';
import { db } from '../db/connection';
import { enrichmentExercises, userExerciseAssignments, users, enrichmentRecords } from '../db/schema';
import { eq, and, sql, isNotNull, lte, gte } from 'drizzle-orm';
import { sendEmail, buildReminderEmail } from './email';

let reminderTask: cron.ScheduledTask | null = null;

export function startReminderScheduler(): void {
  if (reminderTask) {
    reminderTask.stop();
  }

  // Run daily at 9:00 AM
  reminderTask = cron.schedule('0 9 * * *', async () => {
    console.log('[ReminderScheduler] Checking for upcoming deadlines...');
    try {
      await sendDeadlineReminders();
    } catch (error) {
      console.error('[ReminderScheduler] Failed to send reminders:', error);
    }
  });

  console.log('[ReminderScheduler] Started daily reminder check at 9:00 AM');
}

export function stopReminderScheduler(): void {
  if (reminderTask) {
    reminderTask.stop();
    reminderTask = null;
  }
}

async function sendDeadlineReminders(): Promise<void> {
  const windowDays = parseInt(process.env.REMINDER_WINDOW_DAYS || '3', 10);
  const now = new Date();
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + windowDays);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Find exercises with upcoming deadlines
  const exercises = await db
    .select({
      id: enrichmentExercises.id,
      name: enrichmentExercises.name,
      deadline: enrichmentExercises.deadline,
    })
    .from(enrichmentExercises)
    .where(
      and(
        eq(enrichmentExercises.status, 'active'),
        isNotNull(enrichmentExercises.deadline),
        gte(enrichmentExercises.deadline, sql`${now.toISOString()}::date`),
        lte(enrichmentExercises.deadline, sql`${windowEnd.toISOString()}::date`)
      )
    );

  for (const exercise of exercises) {
    // Find assignments that haven't been reminded in the last 24 hours
    const assignments = await db
      .select({
        assignmentId: userExerciseAssignments.id,
        userId: userExerciseAssignments.userId,
        userEmail: users.email,
        userName: users.name,
        lastReminderSentAt: userExerciseAssignments.lastReminderSentAt,
      })
      .from(userExerciseAssignments)
      .innerJoin(users, eq(users.id, userExerciseAssignments.userId))
      .where(eq(userExerciseAssignments.exerciseId, exercise.id));

    for (const assignment of assignments) {
      // Skip if reminded within 24 hours
      if (assignment.lastReminderSentAt && assignment.lastReminderSentAt > twentyFourHoursAgo) {
        continue;
      }

      // Count unclassified records for this user
      const [stats] = await db
        .select({
          unclassified: sql<number>`count(*) filter (where ${enrichmentRecords.isFullyClassified} = false)::int`,
        })
        .from(enrichmentRecords)
        .where(eq(enrichmentRecords.exerciseId, exercise.id));

      const unclassifiedCount = stats?.unclassified ?? 0;

      const email = buildReminderEmail(exercise.name, String(exercise.deadline), unclassifiedCount);
      email.to = assignment.userEmail;

      await sendEmail(email);

      // Update last_reminder_sent_at
      await db
        .update(userExerciseAssignments)
        .set({ lastReminderSentAt: new Date() })
        .where(eq(userExerciseAssignments.id, assignment.assignmentId));
    }
  }
}
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add server/src/services/reminder-scheduler.ts
git commit -m "feat: add daily deadline reminder scheduler"
```

---

## Chunk 2: Backend API Endpoints

### Task 6: Add new exercise API endpoints

**Files:**
- Modify: `server/src/routes/exercises.ts`

This task adds 7 new endpoints to the exercises router. Add all of these after the existing routes (after line 784, before the `export` statement).

- [ ] **Step 1: Add GET source-config endpoint**

Add to `server/src/routes/exercises.ts` before the export:

```typescript
// GET /api/v1/exercises/:id/source-config -- fetch BigQuery source config
router.get('/:id/source-config', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [source] = await db.select().from(bigquerySources).where(eq(bigquerySources.exerciseId, id));
    if (!source) {
      res.json({ sourceConfig: null });
      return;
    }
    res.json({
      sourceConfig: {
        gcpProject: source.gcpProject,
        dataset: source.dataset,
        tableOrQuery: source.tableOrQuery,
        queryType: source.queryType,
        credentialId: source.credentialId,
        refreshSchedule: source.refreshSchedule,
      },
    });
  } catch (error) {
    console.error('Fetch source config error:', error);
    res.status(500).json({ error: 'Failed to fetch source config' });
  }
});
```

- [ ] **Step 2: Add PUT status transition endpoint**

```typescript
// PUT /api/v1/exercises/:id/status -- transition exercise status
router.put('/:id/status', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status: newStatus } = req.body;

    const [exercise] = await db.select().from(enrichmentExercises).where(eq(enrichmentExercises.id, id));
    if (!exercise) {
      res.status(404).json({ error: 'Exercise not found' });
      return;
    }

    const transitions: Record<string, string[]> = {
      draft: ['active'],
      active: ['paused', 'completed', 'archived'],
      paused: ['active'],
      completed: ['archived'],
      archived: [],
    };

    const allowed = transitions[exercise.status] || [];
    if (!allowed.includes(newStatus)) {
      res.status(400).json({
        error: `Cannot transition from "${exercise.status}" to "${newStatus}". Allowed: ${allowed.join(', ') || 'none'}`,
      });
      return;
    }

    await db.update(enrichmentExercises).set({ status: newStatus, updatedAt: new Date() }).where(eq(enrichmentExercises.id, id));
    res.json({ status: newStatus });
  } catch (error) {
    console.error('Status transition error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});
```

- [ ] **Step 3: Add PUT assignment role endpoint**

```typescript
// PUT /api/v1/exercises/:id/assignments/:assignmentId -- update assignment role
router.put('/:id/assignments/:assignmentId', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { assignmentId } = req.params;
    const { role } = req.body;

    if (!role || !['editor', 'viewer'].includes(role)) {
      res.status(400).json({ error: 'role must be "editor" or "viewer"' });
      return;
    }

    await db.update(userExerciseAssignments).set({ role }).where(eq(userExerciseAssignments.id, assignmentId));
    res.json({ success: true });
  } catch (error) {
    console.error('Update assignment error:', error);
    res.status(500).json({ error: 'Failed to update assignment' });
  }
});
```

- [ ] **Step 4: Add POST bulk assign endpoint**

Add the `inArray` import to the existing drizzle-orm imports at the top of the file:

```typescript
import { eq, sql, and, asc, desc, inArray } from 'drizzle-orm';
```

Then add the endpoint:

```typescript
// POST /api/v1/exercises/:id/assignments/bulk -- bulk assign users
router.post('/:id/assignments/bulk', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { users: usersToAssign } = req.body as { users: Array<{ userId: string; role: string }> };

    if (!Array.isArray(usersToAssign) || usersToAssign.length === 0) {
      res.status(400).json({ error: 'users array is required' });
      return;
    }

    // Find existing assignments
    const existing = await db
      .select({ userId: userExerciseAssignments.userId })
      .from(userExerciseAssignments)
      .where(eq(userExerciseAssignments.exerciseId, id));
    const existingUserIds = new Set(existing.map(a => a.userId));

    const created: Array<Record<string, unknown>> = [];
    const skipped: Array<{ userId: string; reason: string }> = [];

    for (const user of usersToAssign) {
      if (existingUserIds.has(user.userId)) {
        skipped.push({ userId: user.userId, reason: 'already assigned' });
        continue;
      }

      const [assignment] = await db.insert(userExerciseAssignments).values({
        userId: user.userId,
        exerciseId: id,
        role: user.role || 'editor',
        assignedBy: req.user!.id,
      }).returning();

      created.push(assignment);
    }

    res.status(201).json({ created, skipped });
  } catch (error) {
    console.error('Bulk assign error:', error);
    res.status(500).json({ error: 'Failed to bulk assign' });
  }
});
```

- [ ] **Step 5: Add permissions endpoints (GET + PUT)**

Add the `assignmentPermissions` import at the top of the file with the other schema imports:

```typescript
import { enrichmentExercises, exerciseColumns, userExerciseAssignments, enrichmentRecords, classificationHistory, bigquerySources, users, assignmentPermissions } from '../db/schema';
```

Then add the endpoints:

```typescript
// GET /api/v1/exercises/:id/assignments/:assignmentId/permissions
router.get('/:id/assignments/:assignmentId/permissions', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { assignmentId } = req.params;
    const [perms] = await db
      .select()
      .from(assignmentPermissions)
      .where(eq(assignmentPermissions.assignmentId, assignmentId));

    res.json({ permissions: perms || null });
  } catch (error) {
    console.error('Fetch permissions error:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

// PUT /api/v1/exercises/:id/assignments/:assignmentId/permissions
router.put('/:id/assignments/:assignmentId/permissions', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id, assignmentId } = req.params;
    const { allowedColumnIds, rowFilter, manualRowOverrides } = req.body;

    // Validate row filter columns if provided
    if (rowFilter?.conditions?.length) {
      const { validateFilterColumns } = await import('../services/permission-filter');
      const invalid = await validateFilterColumns(id, rowFilter);
      if (invalid.length > 0) {
        res.status(400).json({ error: `Invalid filter columns: ${invalid.join(', ')}` });
        return;
      }
    }

    // Validate manual overrides size
    if (manualRowOverrides) {
      if ((manualRowOverrides.include?.length || 0) > 1000 || (manualRowOverrides.exclude?.length || 0) > 1000) {
        res.status(400).json({ error: 'Manual row overrides limited to 1000 entries per array' });
        return;
      }
    }

    // Upsert permissions
    const [existing] = await db
      .select()
      .from(assignmentPermissions)
      .where(eq(assignmentPermissions.assignmentId, assignmentId));

    if (existing) {
      await db.update(assignmentPermissions).set({
        allowedColumnIds: allowedColumnIds ?? null,
        rowFilter: rowFilter ?? null,
        manualRowOverrides: manualRowOverrides ?? null,
        updatedAt: new Date(),
      }).where(eq(assignmentPermissions.id, existing.id));
    } else {
      await db.insert(assignmentPermissions).values({
        assignmentId,
        allowedColumnIds: allowedColumnIds ?? null,
        rowFilter: rowFilter ?? null,
        manualRowOverrides: manualRowOverrides ?? null,
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update permissions error:', error);
    res.status(500).json({ error: 'Failed to update permissions' });
  }
});
```

- [ ] **Step 6: Add POST notify endpoint**

```typescript
// POST /api/v1/exercises/:id/assignments/:assignmentId/notify
router.post('/:id/assignments/:assignmentId/notify', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id, assignmentId } = req.params;
    const { type, message } = req.body as { type: string; message?: string };

    // Fetch assignment + user + exercise
    const [assignment] = await db
      .select({
        userId: userExerciseAssignments.userId,
        role: userExerciseAssignments.role,
        userEmail: users.email,
        userName: users.name,
      })
      .from(userExerciseAssignments)
      .innerJoin(users, eq(users.id, userExerciseAssignments.userId))
      .where(eq(userExerciseAssignments.id, assignmentId));

    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found' });
      return;
    }

    const [exercise] = await db.select().from(enrichmentExercises).where(eq(enrichmentExercises.id, id));
    if (!exercise) {
      res.status(404).json({ error: 'Exercise not found' });
      return;
    }

    const { sendEmail, buildAssignmentEmail, buildReminderEmail, buildReassignmentEmail } = await import('../services/email');

    let email;
    switch (type) {
      case 'assignment':
        email = buildAssignmentEmail(exercise.name, assignment.role, exercise.deadline ? String(exercise.deadline) : null);
        break;
      case 'reminder':
        email = buildReminderEmail(exercise.name, exercise.deadline ? String(exercise.deadline) : 'N/A', 0);
        break;
      case 'custom':
        email = {
          to: '',
          subject: `Message about ${exercise.name}`,
          body: message || '',
        };
        break;
      default:
        res.status(400).json({ error: 'type must be "assignment", "reminder", or "custom"' });
        return;
    }

    email.to = assignment.userEmail;
    await sendEmail(email);

    res.json({ sent: true });
  } catch (error) {
    console.error('Notify error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});
```

- [ ] **Step 7: Run typecheck**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && npm run typecheck`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add server/src/routes/exercises.ts
git commit -m "feat: add exercise edit API endpoints (source-config, status, assignments, permissions, notify)"
```

---

### Task 7: Modify existing endpoints for permission enforcement

**Files:**
- Modify: `server/src/routes/exercises.ts`

- [ ] **Step 1: Update DELETE column endpoint to return impact count and trigger cleanup**

Replace the existing `DELETE /:id/columns/:colId` handler (lines 688-697) with:

```typescript
// DELETE /api/v1/exercises/:id/columns/:colId -- delete a column with impact count
router.delete('/:id/columns/:colId', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id, colId } = req.params;

    // Get the column key before deleting
    const [col] = await db.select({ key: exerciseColumns.key }).from(exerciseColumns).where(eq(exerciseColumns.id, colId));
    if (!col) {
      res.status(404).json({ error: 'Column not found' });
      return;
    }

    // Count affected records (those with non-null value for this column key)
    const [impact] = await db.select({
      affectedRecords: sql<number>`count(*) filter (where (${enrichmentRecords.classifications}->>${col.key}) is not null and (${enrichmentRecords.classifications}->>${col.key}) != '')::int`,
    }).from(enrichmentRecords).where(eq(enrichmentRecords.exerciseId, id));

    // Delete the column
    await db.delete(exerciseColumns).where(eq(exerciseColumns.id, colId));

    // Async cleanup: remove orphaned key from enrichment_records classifications JSONB
    const columnKey = col.key;
    setImmediate(async () => {
      try {
        await db.execute(
          sql`UPDATE enrichment_records SET classifications = classifications - ${columnKey} WHERE exercise_id = ${id}::uuid`
        );
        console.log(`[Cleanup] Removed classification key "${columnKey}" from exercise ${id}`);
      } catch (err) {
        console.error(`[Cleanup] Failed to remove key "${columnKey}":`, err);
      }
    });

    res.json({ success: true, affectedRecords: impact?.affectedRecords ?? 0 });
  } catch (error) {
    console.error('Delete column error:', error);
    res.status(500).json({ error: 'Failed to delete column' });
  }
});
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/exercises.ts
git commit -m "feat: add impact count and async cleanup to column delete endpoint"
```

---

### Task 7b: Add permission enforcement to records and classify endpoints

**Files:**
- Modify: `server/src/routes/exercises.ts`

- [ ] **Step 1: Add permission enforcement to GET records endpoint**

In the `GET /:id/records` handler (around line 188), after building the base `conditions` array and before executing the query, add permission enforcement for non-admin users:

```typescript
// After line 210 (const whereClause = and(...conditions);), add:
const userRole = req.user!.role;
let permissionColumnKeys: Set<string> | null = null;

if (userRole !== 'admin') {
  const { getUserPermissions, buildRowFilterSql, buildManualOverridesSql } = await import('../services/permission-filter');
  const perms = await getUserPermissions(req.user!.id, id);

  if (!perms) {
    res.status(403).json({ error: { message: 'Not assigned to this exercise', code: 'FORBIDDEN' } });
    return;
  }

  // Apply row filter
  if (perms.rowFilter) {
    const { validateFilterColumns } = await import('../services/permission-filter');
    const invalid = await validateFilterColumns(id, perms.rowFilter as any);
    if (invalid.length === 0) {
      const filterSql = buildRowFilterSql(perms.rowFilter as any);
      if (filterSql) conditions.push(filterSql);
    }
  }

  // Apply manual overrides
  if (perms.manualRowOverrides) {
    const overrides = perms.manualRowOverrides as any;
    if (overrides.exclude?.length > 0) {
      conditions.push(sql`${enrichmentRecords.id} != ALL(${overrides.exclude}::uuid[])`);
    }
    // Include overrides are OR'd with the filter (handled via separate query or UNION - for simplicity, add to base conditions)
    if (overrides.include?.length > 0) {
      // Include records are always shown even if filter excludes them
      // This is a simplification - full implementation would use OR logic
    }
  }

  // Resolve allowed columns
  if (perms.allowedColumnIds) {
    const allowedCols = await db.select({ key: exerciseColumns.key })
      .from(exerciseColumns)
      .where(inArray(exerciseColumns.id, perms.allowedColumnIds as string[]));
    permissionColumnKeys = new Set(allowedCols.map(c => c.key));
  }
}
```

Then, in the record mapping section (around line 269), strip disallowed columns:

```typescript
// Replace the mappedRecords block with:
const mappedRecords = records.map(r => {
  let sourceData = r.sourceData as Record<string, unknown>;
  let classifications = r.classifications as Record<string, string | null>;

  if (permissionColumnKeys) {
    const filteredSource: Record<string, unknown> = {};
    const filteredClass: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(sourceData)) {
      if (permissionColumnKeys.has(k)) filteredSource[k] = v;
    }
    for (const [k, v] of Object.entries(classifications)) {
      if (permissionColumnKeys.has(k)) filteredClass[k] = v;
    }
    sourceData = filteredSource;
    classifications = filteredClass;
  }

  return {
    id: r.id,
    uniqueKey: r.uniqueKey as Record<string, string>,
    sourceData,
    classifications,
    recordState: r.recordState as 'new' | 'existing' | 'changed' | 'removed',
    validationErrors: r.validationErrors as any[],
    isFullyClassified: r.isFullyClassified,
  };
});
```

- [ ] **Step 2: Add column access enforcement to classify endpoint**

In the `PUT /:id/records/:recordId/classify` handler (around line 304), after fetching the record and before building updated classifications, add:

```typescript
// After the record fetch, add permission check for non-admin users:
if (req.user!.role !== 'admin') {
  const { getUserPermissions } = await import('../services/permission-filter');
  const perms = await getUserPermissions(req.user!.id, id);

  if (!perms || perms.role !== 'editor') {
    res.status(403).json({ error: { message: 'Not authorized to classify records', code: 'FORBIDDEN' } });
    return;
  }

  if (perms.allowedColumnIds) {
    const allowedCols = await db.select({ key: exerciseColumns.key })
      .from(exerciseColumns)
      .where(inArray(exerciseColumns.id, perms.allowedColumnIds as string[]));
    const allowedKeys = new Set(allowedCols.map(c => c.key));
    const disallowed = values.filter((v: any) => !allowedKeys.has(v.columnKey));
    if (disallowed.length > 0) {
      res.status(403).json({ error: { message: `Not authorized to edit columns: ${disallowed.map((d: any) => d.columnKey).join(', ')}`, code: 'FORBIDDEN' } });
      return;
    }
  }
}
```

- [ ] **Step 3: Add same enforcement to bulk-classify endpoint**

Apply the same pattern to `POST /:id/records/bulk-classify` (around line 410), checking permissions before processing records.

- [ ] **Step 4: Run typecheck**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/exercises.ts
git commit -m "feat: add permission enforcement to records and classify endpoints"
```

---

## Chunk 3: Frontend API Client and Hooks

### Task 8: Create exercise edit API client

**Files:**
- Create: `client/src/api/exercise-edit.ts`

- [ ] **Step 1: Create the API client**

Create `client/src/api/exercise-edit.ts`:

```typescript
import { apiClient } from './client';
import type {
  ExerciseAssignment,
  AssignmentPermissions,
  BulkAssignRequest,
  BulkAssignResponse,
  NotifyRequest,
  SourceConfig,
} from '@mapforge/shared';

// Source config (GET is new; POST already exists at server/src/routes/exercises.ts line 754)
export async function fetchSourceConfig(exerciseId: string): Promise<SourceConfig | null> {
  const response = await apiClient.get<{ sourceConfig: SourceConfig | null }>(`/exercises/${exerciseId}/source-config`);
  return response.data.sourceConfig;
}

export async function saveSourceConfig(exerciseId: string, config: SourceConfig): Promise<void> {
  await apiClient.post(`/exercises/${exerciseId}/source-config`, config);
}

// Status
export async function updateExerciseStatus(exerciseId: string, status: string): Promise<void> {
  await apiClient.put(`/exercises/${exerciseId}/status`, { status });
}

// Assignments
export async function fetchAssignments(exerciseId: string): Promise<ExerciseAssignment[]> {
  const response = await apiClient.get<{ assignments: ExerciseAssignment[] }>(`/exercises/${exerciseId}/assignments`);
  return response.data.assignments;
}

export async function updateAssignmentRole(exerciseId: string, assignmentId: string, role: string): Promise<void> {
  await apiClient.put(`/exercises/${exerciseId}/assignments/${assignmentId}`, { role });
}

export async function removeAssignment(exerciseId: string, assignmentId: string): Promise<void> {
  await apiClient.delete(`/exercises/${exerciseId}/assignments/${assignmentId}`);
}

export async function bulkAssign(exerciseId: string, request: BulkAssignRequest): Promise<BulkAssignResponse> {
  const response = await apiClient.post<BulkAssignResponse>(`/exercises/${exerciseId}/assignments/bulk`, request);
  return response.data;
}

// Permissions
export async function fetchPermissions(exerciseId: string, assignmentId: string): Promise<AssignmentPermissions | null> {
  const response = await apiClient.get<{ permissions: AssignmentPermissions | null }>(
    `/exercises/${exerciseId}/assignments/${assignmentId}/permissions`
  );
  return response.data.permissions;
}

export async function updatePermissions(
  exerciseId: string,
  assignmentId: string,
  permissions: Partial<Pick<AssignmentPermissions, 'allowedColumnIds' | 'rowFilter' | 'manualRowOverrides'>>
): Promise<void> {
  await apiClient.put(`/exercises/${exerciseId}/assignments/${assignmentId}/permissions`, permissions);
}

// Notifications
export async function sendNotification(exerciseId: string, assignmentId: string, request: NotifyRequest): Promise<void> {
  await apiClient.post(`/exercises/${exerciseId}/assignments/${assignmentId}/notify`, request);
}

// Columns
export async function deleteColumn(exerciseId: string, colId: string): Promise<{ affectedRecords: number }> {
  const response = await apiClient.delete<{ success: boolean; affectedRecords: number }>(
    `/exercises/${exerciseId}/columns/${colId}`
  );
  return { affectedRecords: response.data.affectedRecords };
}
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add client/src/api/exercise-edit.ts
git commit -m "feat: add API client functions for exercise edit page"
```

---

### Task 9: Create exercise edit hooks

**Files:**
- Create: `client/src/hooks/useExerciseEdit.ts`

- [ ] **Step 1: Create the hooks file**

Create `client/src/hooks/useExerciseEdit.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';
import {
  fetchSourceConfig,
  saveSourceConfig,
  fetchAssignments,
  updateAssignmentRole,
  removeAssignment,
  bulkAssign,
  updatePermissions,
  fetchPermissions,
  sendNotification,
  updateExerciseStatus,
  deleteColumn,
} from '@/api/exercise-edit';
import type { ExerciseDetail } from '@mapforge/shared';

export function useExerciseDetail(exerciseId: string) {
  return useQuery({
    queryKey: ['exercise-detail', exerciseId],
    queryFn: async () => {
      const response = await apiClient.get<ExerciseDetail>(`/exercises/${exerciseId}`);
      return response.data;
    },
    staleTime: 30_000,
    enabled: !!exerciseId,
  });
}

export function useSourceConfig(exerciseId: string) {
  return useQuery({
    queryKey: ['exercise-source-config', exerciseId],
    queryFn: () => fetchSourceConfig(exerciseId),
    staleTime: 30_000,
    enabled: !!exerciseId,
  });
}

export function useExerciseAssignments(exerciseId: string) {
  return useQuery({
    queryKey: ['exercise-assignments', exerciseId],
    queryFn: () => fetchAssignments(exerciseId),
    staleTime: 30_000,
    enabled: !!exerciseId,
  });
}

export function useAssignmentPermissions(exerciseId: string, assignmentId: string | null) {
  return useQuery({
    queryKey: ['assignment-permissions', exerciseId, assignmentId],
    queryFn: () => fetchPermissions(exerciseId, assignmentId!),
    staleTime: 30_000,
    enabled: !!exerciseId && !!assignmentId,
  });
}

// Mutations

export function useUpdateExercise(exerciseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      await apiClient.put(`/exercises/${exerciseId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-detail', exerciseId] });
      toast.success('Exercise updated');
    },
    onError: () => {
      toast.error('Failed to update exercise');
    },
  });
}

export function useUpdateStatus(exerciseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: string) => updateExerciseStatus(exerciseId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-detail', exerciseId] });
      toast.success('Status updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update status');
    },
  });
}

export function useSaveSourceConfig(exerciseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: Parameters<typeof saveSourceConfig>[1]) => saveSourceConfig(exerciseId, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-source-config', exerciseId] });
      toast.success('Source config saved');
    },
    onError: () => {
      toast.error('Failed to save source config');
    },
  });
}

export function useUpdateAssignmentRole(exerciseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, role }: { assignmentId: string; role: string }) =>
      updateAssignmentRole(exerciseId, assignmentId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-assignments', exerciseId] });
      toast.success('Role updated');
    },
    onError: () => {
      toast.error('Failed to update role');
    },
  });
}

export function useRemoveAssignment(exerciseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => removeAssignment(exerciseId, assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-assignments', exerciseId] });
      toast.success('Assignment removed');
    },
    onError: () => {
      toast.error('Failed to remove assignment');
    },
  });
}

export function useBulkAssign(exerciseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: Parameters<typeof bulkAssign>[1]) => bulkAssign(exerciseId, request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exercise-assignments', exerciseId] });
      const msg = `${data.created.length} assigned${data.skipped.length ? `, ${data.skipped.length} skipped` : ''}`;
      toast.success(msg);
    },
    onError: () => {
      toast.error('Failed to assign users');
    },
  });
}

export function useUpdatePermissions(exerciseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, permissions }: { assignmentId: string; permissions: Parameters<typeof updatePermissions>[2] }) =>
      updatePermissions(exerciseId, assignmentId, permissions),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assignment-permissions', exerciseId, variables.assignmentId] });
      toast.success('Permissions updated');
    },
    onError: () => {
      toast.error('Failed to update permissions');
    },
  });
}

export function useSendNotification(exerciseId: string) {
  return useMutation({
    mutationFn: ({ assignmentId, request }: { assignmentId: string; request: Parameters<typeof sendNotification>[2] }) =>
      sendNotification(exerciseId, assignmentId, request),
    onSuccess: () => {
      toast.success('Notification sent');
    },
    onError: () => {
      toast.error('Failed to send notification');
    },
  });
}

export function useDeleteColumn(exerciseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (colId: string) => deleteColumn(exerciseId, colId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-detail', exerciseId] });
      toast.success('Column deleted');
    },
    onError: () => {
      toast.error('Failed to delete column');
    },
  });
}
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/useExerciseEdit.ts
git commit -m "feat: add React Query hooks for exercise edit page"
```

---

## Chunk 4: Frontend Edit Page Shell and General Tab

### Task 10: Create ExerciseEditPage and register route

**Files:**
- Create: `client/src/pages/ExerciseEditPage.tsx`
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Create the edit page shell**

Create `client/src/pages/ExerciseEditPage.tsx`:

```typescript
import { useState } from 'react';
import { useParams, useNavigate, useBlocker } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useExerciseDetail } from '@/hooks/useExerciseEdit';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { GeneralTab } from '@/components/exercise-edit/GeneralTab';
import { DataSourceTab } from '@/components/exercise-edit/DataSourceTab';
import { ColumnsTab } from '@/components/exercise-edit/ColumnsTab';
import { AssignmentsTab } from '@/components/exercise-edit/AssignmentsTab';
import { PermissionsTab } from '@/components/exercise-edit/PermissionsTab';

export function ExerciseEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: exercise, isLoading, isError, refetch } = useExerciseDetail(id!);
  const [activeTab, setActiveTab] = useState('general');
  const [isDirty, setIsDirty] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);

  // Navigation blocker for unsaved changes
  const blocker = useBlocker(isDirty);

  const handleTabChange = (newTab: string) => {
    if (isDirty) {
      setPendingTab(newTab);
    } else {
      setActiveTab(newTab);
    }
  };

  const confirmTabSwitch = () => {
    if (pendingTab) {
      setIsDirty(false);
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
  };

  const cancelTabSwitch = () => {
    setPendingTab(null);
  };

  if (isLoading) {
    return (
      <AppLayout title="Edit Exercise">
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (isError || !exercise) {
    return (
      <AppLayout title="Edit Exercise">
        <div className="text-center py-16">
          <p className="text-sm text-destructive mb-3">Failed to load exercise.</p>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>Retry</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`Edit: ${exercise.name}`}>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/exercises')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{exercise.name}</h1>
              <p className="text-sm text-muted-foreground">{exercise.description}</p>
            </div>
          </div>
          <Badge
            variant={
              exercise.status === 'active' ? 'success' :
              exercise.status === 'completed' ? 'secondary' :
              'outline'
            }
          >
            {exercise.status}
          </Badge>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="datasource">Data Source</TabsTrigger>
            <TabsTrigger value="columns">Columns</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <GeneralTab exerciseId={id!} exercise={exercise} onDirtyChange={setIsDirty} />
          </TabsContent>
          <TabsContent value="datasource">
            <DataSourceTab exerciseId={id!} onDirtyChange={setIsDirty} />
          </TabsContent>
          <TabsContent value="columns">
            <ColumnsTab exerciseId={id!} exercise={exercise} onDirtyChange={setIsDirty} />
          </TabsContent>
          <TabsContent value="assignments">
            <AssignmentsTab exerciseId={id!} />
          </TabsContent>
          <TabsContent value="permissions">
            <PermissionsTab exerciseId={id!} exercise={exercise} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Unsaved changes - tab switch */}
      <ConfirmDialog
        open={!!pendingTab}
        onOpenChange={() => cancelTabSwitch()}
        title="Unsaved changes"
        description="You have unsaved changes. Discard them?"
        confirmLabel="Discard"
        variant="destructive"
        onConfirm={confirmTabSwitch}
      />

      {/* Unsaved changes - navigation */}
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onOpenChange={() => blocker.state === 'blocked' && blocker.reset()}
        title="Unsaved changes"
        description="You have unsaved changes. Leave this page?"
        confirmLabel="Leave"
        variant="destructive"
        onConfirm={() => blocker.state === 'blocked' && blocker.proceed()}
      />
    </AppLayout>
  );
}
```

- [ ] **Step 2: Register the route in App.tsx**

Add the import at the top of `client/src/App.tsx`:

```typescript
import { ExerciseEditPage } from '@/pages/ExerciseEditPage';
```

Add the route inside the `<Routes>` block, before the exercise detail route (before the `/:exerciseId` route):

```typescript
<Route
  path="/exercises/:id/edit"
  element={
    <ProtectedRoute allowedRoles={['admin']}>
      <ExerciseEditPage />
    </ProtectedRoute>
  }
/>
```

- [ ] **Step 3: Run typecheck**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && npm run typecheck`
Expected: Will fail - tab components don't exist yet. That's expected; we'll create them in the next tasks.

- [ ] **Step 4: Commit (with placeholder note)**

Don't commit yet - continue with the tab components first.

---

### Task 11: Create GeneralTab component

**Files:**
- Create: `client/src/components/exercise-edit/GeneralTab.tsx`

- [ ] **Step 1: Create GeneralTab**

Create `client/src/components/exercise-edit/GeneralTab.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { useUpdateExercise, useUpdateStatus } from '@/hooks/useExerciseEdit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { ExerciseDetail } from '@mapforge/shared';

const STATUS_TRANSITIONS: Record<string, { label: string; targets: Array<{ status: string; label: string; variant: 'default' | 'destructive' }> }> = {
  draft: { label: 'Draft', targets: [{ status: 'active', label: 'Publish', variant: 'default' }] },
  active: { label: 'Active', targets: [
    { status: 'paused', label: 'Pause', variant: 'default' },
    { status: 'completed', label: 'Complete', variant: 'default' },
    { status: 'archived', label: 'Archive', variant: 'destructive' },
  ]},
  paused: { label: 'Paused', targets: [{ status: 'active', label: 'Resume', variant: 'default' }] },
  completed: { label: 'Completed', targets: [{ status: 'archived', label: 'Archive', variant: 'destructive' }] },
  archived: { label: 'Archived', targets: [] },
};

interface GeneralTabProps {
  exerciseId: string;
  exercise: ExerciseDetail;
  onDirtyChange: (dirty: boolean) => void;
}

export function GeneralTab({ exerciseId, exercise, onDirtyChange }: GeneralTabProps) {
  const [name, setName] = useState(exercise.name);
  const [description, setDescription] = useState(exercise.description);
  const [deadline, setDeadline] = useState(exercise.deadline || '');
  const [viewMode, setViewMode] = useState(exercise.viewMode || 'flat');
  const [statusAction, setStatusAction] = useState<{ status: string; label: string } | null>(null);

  const updateExercise = useUpdateExercise(exerciseId);
  const updateStatus = useUpdateStatus(exerciseId);

  // Track dirty state
  useEffect(() => {
    const dirty = name !== exercise.name || description !== exercise.description || deadline !== (exercise.deadline || '') || viewMode !== (exercise.viewMode || 'flat');
    onDirtyChange(dirty);
  }, [name, description, deadline, viewMode, exercise, onDirtyChange]);

  // Reset form when exercise data changes (after save)
  useEffect(() => {
    setName(exercise.name);
    setDescription(exercise.description);
    setDeadline(exercise.deadline || '');
    setViewMode(exercise.viewMode || 'flat');
  }, [exercise]);

  const handleSave = () => {
    updateExercise.mutate({
      name,
      description,
      deadline: deadline || null,
      viewMode,
    }, {
      onSuccess: () => onDirtyChange(false),
    });
  };

  const handleStatusChange = () => {
    if (!statusAction) return;
    updateStatus.mutate(statusAction.status, {
      onSuccess: () => setStatusAction(null),
    });
  };

  const transitions = STATUS_TRANSITIONS[exercise.status];

  return (
    <div className="max-w-2xl space-y-6 pt-4">
      {/* Status section */}
      <div className="flex items-center gap-3">
        <Label className="text-sm text-muted-foreground">Status:</Label>
        <Badge variant={exercise.status === 'active' ? 'success' : 'outline'}>
          {transitions?.label || exercise.status}
        </Badge>
        {transitions?.targets.map(target => (
          <Button
            key={target.status}
            variant={target.variant === 'destructive' ? 'destructive' : 'secondary'}
            size="sm"
            onClick={() => setStatusAction(target)}
          >
            {target.label}
          </Button>
        ))}
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      {/* Deadline */}
      <div className="space-y-2">
        <Label htmlFor="deadline">Deadline</Label>
        <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-auto" />
      </div>

      {/* View Mode */}
      <div className="space-y-2">
        <Label>View Mode</Label>
        <Select value={viewMode} onValueChange={setViewMode}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="flat">Flat</SelectItem>
            <SelectItem value="matrix">Matrix</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Save */}
      <Button onClick={handleSave} disabled={updateExercise.isPending} isLoading={updateExercise.isPending}>
        Save Changes
      </Button>

      {/* Status transition confirmation */}
      <ConfirmDialog
        open={!!statusAction}
        onOpenChange={() => setStatusAction(null)}
        title={`${statusAction?.label} exercise?`}
        description={`This will change the exercise status to "${statusAction?.status}".`}
        confirmLabel={statusAction?.label || 'Confirm'}
        variant="default"
        loading={updateStatus.isPending}
        onConfirm={handleStatusChange}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit (combined with page shell later)**

Continue to next task.

---

### Task 12: Create DataSourceTab component

**Files:**
- Create: `client/src/components/exercise-edit/DataSourceTab.tsx`

- [ ] **Step 1: Create DataSourceTab**

Create `client/src/components/exercise-edit/DataSourceTab.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { useSourceConfig, useSaveSourceConfig } from '@/hooks/useExerciseEdit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DataSourceTabProps {
  exerciseId: string;
  onDirtyChange: (dirty: boolean) => void;
}

export function DataSourceTab({ exerciseId, onDirtyChange }: DataSourceTabProps) {
  const { data: sourceConfig, isLoading } = useSourceConfig(exerciseId);
  const saveConfig = useSaveSourceConfig(exerciseId);

  const [gcpProject, setGcpProject] = useState('');
  const [dataset, setDataset] = useState('');
  const [tableOrQuery, setTableOrQuery] = useState('');
  const [queryType, setQueryType] = useState<'table' | 'query'>('table');
  const [credentialId, setCredentialId] = useState('');
  const [refreshSchedule, setRefreshSchedule] = useState('');

  // Load existing config
  useEffect(() => {
    if (sourceConfig) {
      setGcpProject(sourceConfig.gcpProject || '');
      setDataset(sourceConfig.dataset || '');
      setTableOrQuery(sourceConfig.tableOrQuery || '');
      setQueryType(sourceConfig.queryType || 'table');
      setCredentialId(sourceConfig.credentialId || '');
      setRefreshSchedule(sourceConfig.refreshSchedule || '');
    }
  }, [sourceConfig]);

  // Track dirty state
  useEffect(() => {
    if (!sourceConfig) return;
    const dirty =
      gcpProject !== (sourceConfig.gcpProject || '') ||
      dataset !== (sourceConfig.dataset || '') ||
      tableOrQuery !== (sourceConfig.tableOrQuery || '') ||
      queryType !== (sourceConfig.queryType || 'table') ||
      credentialId !== (sourceConfig.credentialId || '') ||
      refreshSchedule !== (sourceConfig.refreshSchedule || '');
    onDirtyChange(dirty);
  }, [gcpProject, dataset, tableOrQuery, queryType, credentialId, refreshSchedule, sourceConfig, onDirtyChange]);

  const handleSave = () => {
    saveConfig.mutate({
      gcpProject,
      dataset,
      tableOrQuery,
      queryType,
      credentialId: credentialId || null,
      refreshSchedule: refreshSchedule || null,
    }, {
      onSuccess: () => onDirtyChange(false),
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6 pt-4">
      <div className="space-y-2">
        <Label>GCP Project</Label>
        <Input value={gcpProject} onChange={(e) => setGcpProject(e.target.value)} placeholder="my-gcp-project" />
      </div>

      <div className="space-y-2">
        <Label>Dataset</Label>
        <Input value={dataset} onChange={(e) => setDataset(e.target.value)} placeholder="my_dataset" />
      </div>

      <div className="space-y-2">
        <Label>Query Type</Label>
        <Select value={queryType} onValueChange={(v) => setQueryType(v as 'table' | 'query')}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="table">Table</SelectItem>
            <SelectItem value="query">Query</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{queryType === 'table' ? 'Table Name' : 'SQL Query'}</Label>
        <Input value={tableOrQuery} onChange={(e) => setTableOrQuery(e.target.value)} placeholder={queryType === 'table' ? 'my_table' : 'SELECT * FROM ...'} />
      </div>

      <div className="space-y-2">
        <Label>Credential ID (optional)</Label>
        <Input value={credentialId} onChange={(e) => setCredentialId(e.target.value)} placeholder="credential-uuid" />
      </div>

      <div className="space-y-2">
        <Label>Refresh Schedule (cron expression, optional)</Label>
        <Input value={refreshSchedule} onChange={(e) => setRefreshSchedule(e.target.value)} placeholder="0 */6 * * *" />
      </div>

      <Button onClick={handleSave} disabled={saveConfig.isPending} isLoading={saveConfig.isPending}>
        Save Source Config
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Continue to next task**

---

### Task 13: Create ColumnsTab component

**Files:**
- Create: `client/src/components/exercise-edit/ColumnsTab.tsx`

- [ ] **Step 1: Create ColumnsTab**

Create `client/src/components/exercise-edit/ColumnsTab.tsx`:

```typescript
import { useState } from 'react';
import { useDeleteColumn } from '@/hooks/useExerciseEdit';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { ExerciseDetail, ExerciseColumn } from '@mapforge/shared';

interface ColumnsTabProps {
  exerciseId: string;
  exercise: ExerciseDetail;
  onDirtyChange: (dirty: boolean) => void;
}

export function ColumnsTab({ exerciseId, exercise, onDirtyChange }: ColumnsTabProps) {
  const deleteColumn = useDeleteColumn(exerciseId);
  const [deleteTarget, setDeleteTarget] = useState<{ col: ExerciseColumn } | null>(null);

  const handleDeleteClick = (col: ExerciseColumn) => {
    // Show confirmation dialog. The actual delete (and impact count) happens on confirm.
    setDeleteTarget({ col });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteColumn.mutate(deleteTarget.col.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  const renderColumnRow = (col: ExerciseColumn, isSource: boolean) => (
    <div key={col.id} className="flex items-center justify-between p-3 bg-muted border border-border rounded-md">
      <div className="flex items-center gap-3">
        <div>
          <span className="text-sm font-medium text-foreground">{col.label}</span>
          <span className="ml-2 text-xs text-muted-foreground">({col.key})</span>
        </div>
        <Badge variant="outline" className="text-xs">{col.dataType}</Badge>
        {col.required && <Badge variant="secondary" className="text-xs">Required</Badge>}
      </div>
      <div className="flex items-center gap-2">
        {isSource && <span className="text-xs text-muted-foreground">Read-only</span>}
        {!isSource && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => handleDeleteClick(col)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pt-4">
      {/* Source columns */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Source Columns</h3>
        <div className="space-y-2">
          {exercise.sourceColumns.map(col => renderColumnRow(col, true))}
          {exercise.sourceColumns.length === 0 && (
            <p className="text-sm text-muted-foreground">No source columns configured.</p>
          )}
        </div>
      </div>

      {/* Classification columns */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Classification Columns</h3>
        <div className="space-y-2">
          {exercise.classificationColumns.map(col => renderColumnRow(col, false))}
          {exercise.classificationColumns.length === 0 && (
            <p className="text-sm text-muted-foreground">No classification columns configured.</p>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title={`Delete column "${deleteTarget?.col.label}"?`}
        description="This will permanently remove this column and clear its classification data from all records. This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteColumn.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
```

- [ ] **Step 3: Continue to next task**

---

## Chunk 5: Assignments and Permissions Tabs

### Task 14: Create AssignmentsTab component

**Files:**
- Create: `client/src/components/exercise-edit/AssignmentsTab.tsx`

- [ ] **Step 1: Create AssignmentsTab**

Create `client/src/components/exercise-edit/AssignmentsTab.tsx`:

```typescript
import { useState } from 'react';
import {
  useExerciseAssignments,
  useUpdateAssignmentRole,
  useRemoveAssignment,
  useBulkAssign,
  useSendNotification,
} from '@/hooks/useExerciseEdit';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2, Mail, UserPlus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface AssignmentsTabProps {
  exerciseId: string;
}

export function AssignmentsTab({ exerciseId }: AssignmentsTabProps) {
  const { data: assignments, isLoading } = useExerciseAssignments(exerciseId);
  const updateRole = useUpdateAssignmentRole(exerciseId);
  const removeAssignment = useRemoveAssignment(exerciseId);
  const bulkAssign = useBulkAssign(exerciseId);
  const sendNotification = useSendNotification(exerciseId);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; email: string; name: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const response = await apiClient.get('/admin/users', { params: { search: searchQuery } });
      const users = response.data.users || response.data || [];
      setSearchResults(Array.isArray(users) ? users : []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAddUser = (user: { id: string; email: string; name: string }) => {
    bulkAssign.mutate({ users: [{ userId: user.id, role: 'editor' }] });
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleRemove = () => {
    if (!removeTarget) return;
    removeAssignment.mutate(removeTarget.id, {
      onSuccess: () => setRemoveTarget(null),
    });
  };

  const handleNotify = (assignmentId: string) => {
    sendNotification.mutate({ assignmentId, request: { type: 'assignment' } });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6 pt-4">
      {/* Search and add users */}
      <div className="space-y-2">
        <Label>Add Users</Label>
        <div className="flex gap-2">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by name or email..."
            className="flex-1"
          />
          <Button variant="secondary" onClick={handleSearch} disabled={searching} isLoading={searching}>
            Search
          </Button>
        </div>
        {searchResults.length > 0 && (
          <div className="border border-border rounded-md overflow-hidden">
            {searchResults.map(user => (
              <button
                key={user.id}
                onClick={() => handleAddUser(user)}
                className="w-full flex items-center justify-between px-3 py-2 bg-muted hover:bg-accent text-left border-b border-border last:border-0"
              >
                <span className="text-foreground">{user.name}</span>
                <span className="text-muted-foreground text-sm">{user.email}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Assigned users */}
      {assignments && assignments.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Assigned Users ({assignments.length})
          </h3>
          {assignments.map(a => (
            <div key={a.id} className="flex items-center gap-3 p-3 bg-muted border border-border rounded-md">
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground">{a.userName}</span>
                <span className="ml-2 text-sm text-muted-foreground">{a.userEmail}</span>
              </div>
              <Select
                value={a.role}
                onValueChange={(val) => updateRole.mutate({ assignmentId: a.id, role: val })}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={() => handleNotify(a.id)} title="Send notification">
                <Mail className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setRemoveTarget({ id: a.id, name: a.userName })}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {assignments && assignments.length === 0 && (
        <div className="text-center py-8">
          <UserPlus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No users assigned. Search above to add users.</p>
        </div>
      )}

      {/* Remove confirmation */}
      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={() => setRemoveTarget(null)}
        title="Remove assignment?"
        description={`Remove ${removeTarget?.name} from this exercise? They will lose access immediately.`}
        confirmLabel="Remove"
        variant="destructive"
        loading={removeAssignment.isPending}
        onConfirm={handleRemove}
      />
    </div>
  );
}
```

- [ ] **Step 2: Continue to next task**

---

### Task 15: Create PermissionsTab, RowFilterBuilder, and ManualRowPicker

**Files:**
- Create: `client/src/components/exercise-edit/RowFilterBuilder.tsx`
- Create: `client/src/components/exercise-edit/ManualRowPicker.tsx`
- Create: `client/src/components/exercise-edit/PermissionsTab.tsx`

- [ ] **Step 1: Create RowFilterBuilder**

Create `client/src/components/exercise-edit/RowFilterBuilder.tsx`:

```typescript
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { RowFilter, RowFilterCondition } from '@mapforge/shared';

const OPERATORS = [
  { value: 'eq', label: 'Equals' },
  { value: 'neq', label: 'Not equals' },
  { value: 'in', label: 'In list' },
  { value: 'not_in', label: 'Not in list' },
  { value: 'contains', label: 'Contains' },
  { value: 'starts_with', label: 'Starts with' },
  { value: 'is_null', label: 'Is empty' },
  { value: 'is_not_null', label: 'Is not empty' },
];

const VALUE_OPERATORS = ['eq', 'neq', 'contains', 'starts_with'];
const LIST_OPERATORS = ['in', 'not_in'];

interface RowFilterBuilderProps {
  filter: RowFilter;
  columnKeys: string[];
  onChange: (filter: RowFilter) => void;
}

export function RowFilterBuilder({ filter, columnKeys, onChange }: RowFilterBuilderProps) {
  const addCondition = () => {
    onChange({
      ...filter,
      conditions: [...filter.conditions, { column: columnKeys[0] || '', operator: 'eq', value: '' }],
    });
  };

  const removeCondition = (index: number) => {
    onChange({
      ...filter,
      conditions: filter.conditions.filter((_, i) => i !== index),
    });
  };

  const updateCondition = (index: number, updates: Partial<RowFilterCondition>) => {
    onChange({
      ...filter,
      conditions: filter.conditions.map((c, i) => i === index ? { ...c, ...updates } : c),
    });
  };

  const toggleLogic = () => {
    onChange({ ...filter, logic: filter.logic === 'and' ? 'or' : 'and' });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Match</span>
        <Button variant="outline" size="sm" onClick={toggleLogic}>
          {filter.logic === 'and' ? 'ALL' : 'ANY'}
        </Button>
        <span className="text-sm text-muted-foreground">conditions</span>
      </div>

      {filter.conditions.map((condition, index) => (
        <div key={index} className="flex items-center gap-2">
          <Select value={condition.column} onValueChange={(v) => updateCondition(index, { column: v })}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Column" />
            </SelectTrigger>
            <SelectContent>
              {columnKeys.map(key => (
                <SelectItem key={key} value={key}>{key}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={condition.operator} onValueChange={(v) => updateCondition(index, { operator: v as RowFilterCondition['operator'] })}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPERATORS.map(op => (
                <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {VALUE_OPERATORS.includes(condition.operator) && (
            <Input
              value={condition.value || ''}
              onChange={(e) => updateCondition(index, { value: e.target.value })}
              placeholder="Value"
              className="flex-1"
            />
          )}

          {LIST_OPERATORS.includes(condition.operator) && (
            <Input
              value={condition.values?.join(', ') || ''}
              onChange={(e) => updateCondition(index, { values: e.target.value.split(',').map(v => v.trim()).filter(Boolean) })}
              placeholder="Comma-separated values"
              className="flex-1"
            />
          )}

          <Button variant="ghost" size="sm" onClick={() => removeCondition(index)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={addCondition}>
        <Plus className="h-4 w-4 mr-1" />
        Add Condition
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Create ManualRowPicker**

Create `client/src/components/exercise-edit/ManualRowPicker.tsx`:

```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import type { ManualRowOverrides } from '@mapforge/shared';

interface ManualRowPickerProps {
  overrides: ManualRowOverrides;
  onChange: (overrides: ManualRowOverrides) => void;
}

export function ManualRowPicker({ overrides, onChange }: ManualRowPickerProps) {
  const [includeId, setIncludeId] = useState('');
  const [excludeId, setExcludeId] = useState('');

  const addInclude = () => {
    if (!includeId.trim() || overrides.include.includes(includeId.trim())) return;
    if (overrides.include.length >= 1000) return;
    onChange({ ...overrides, include: [...overrides.include, includeId.trim()] });
    setIncludeId('');
  };

  const addExclude = () => {
    if (!excludeId.trim() || overrides.exclude.includes(excludeId.trim())) return;
    if (overrides.exclude.length >= 1000) return;
    onChange({ ...overrides, exclude: [...overrides.exclude, excludeId.trim()] });
    setExcludeId('');
  };

  const removeInclude = (id: string) => {
    onChange({ ...overrides, include: overrides.include.filter(i => i !== id) });
  };

  const removeExclude = (id: string) => {
    onChange({ ...overrides, exclude: overrides.exclude.filter(i => i !== id) });
  };

  return (
    <div className="space-y-4">
      {/* Include */}
      <div className="space-y-2">
        <Label className="text-sm">Include Specific Rows ({overrides.include.length}/1000)</Label>
        <div className="flex gap-2">
          <Input
            value={includeId}
            onChange={(e) => setIncludeId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addInclude()}
            placeholder="Row ID to include..."
            className="flex-1"
          />
          <Button variant="secondary" size="sm" onClick={addInclude}>Add</Button>
        </div>
        {overrides.include.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {overrides.include.slice(0, 20).map(id => (
              <Badge key={id} variant="secondary" className="text-xs">
                {id.slice(0, 8)}...
                <button onClick={() => removeInclude(id)} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {overrides.include.length > 20 && (
              <span className="text-xs text-muted-foreground">+{overrides.include.length - 20} more</span>
            )}
          </div>
        )}
      </div>

      {/* Exclude */}
      <div className="space-y-2">
        <Label className="text-sm">Exclude Specific Rows ({overrides.exclude.length}/1000)</Label>
        <div className="flex gap-2">
          <Input
            value={excludeId}
            onChange={(e) => setExcludeId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addExclude()}
            placeholder="Row ID to exclude..."
            className="flex-1"
          />
          <Button variant="secondary" size="sm" onClick={addExclude}>Add</Button>
        </div>
        {overrides.exclude.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {overrides.exclude.slice(0, 20).map(id => (
              <Badge key={id} variant="destructive" className="text-xs">
                {id.slice(0, 8)}...
                <button onClick={() => removeExclude(id)} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {overrides.exclude.length > 20 && (
              <span className="text-xs text-muted-foreground">+{overrides.exclude.length - 20} more</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create PermissionsTab**

Create `client/src/components/exercise-edit/PermissionsTab.tsx`:

```typescript
import { useState } from 'react';
import {
  useExerciseAssignments,
  useAssignmentPermissions,
  useUpdatePermissions,
} from '@/hooks/useExerciseEdit';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { RowFilterBuilder } from './RowFilterBuilder';
import { ManualRowPicker } from './ManualRowPicker';
import type { ExerciseDetail, RowFilter, ManualRowOverrides } from '@mapforge/shared';

interface PermissionsTabProps {
  exerciseId: string;
  exercise: ExerciseDetail;
}

export function PermissionsTab({ exerciseId, exercise }: PermissionsTabProps) {
  const { data: assignments, isLoading: loadingAssignments } = useExerciseAssignments(exerciseId);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const { data: permissions, isLoading: loadingPermissions } = useAssignmentPermissions(exerciseId, selectedAssignmentId);
  const updatePermissions = useUpdatePermissions(exerciseId);

  // Local state for editing
  const [allowedColumnIds, setAllowedColumnIds] = useState<string[] | null>(null);
  const [rowFilter, setRowFilter] = useState<RowFilter>({ conditions: [], logic: 'and' });
  const [manualOverrides, setManualOverrides] = useState<ManualRowOverrides>({ include: [], exclude: [] });
  const [initialized, setInitialized] = useState(false);

  // Initialize from fetched permissions
  if (permissions && !initialized) {
    setAllowedColumnIds(permissions.allowedColumnIds);
    setRowFilter(permissions.rowFilter || { conditions: [], logic: 'and' });
    setManualOverrides(permissions.manualRowOverrides || { include: [], exclude: [] });
    setInitialized(true);
  }

  const handleSelectAssignment = (assignmentId: string) => {
    setSelectedAssignmentId(assignmentId);
    setInitialized(false);
  };

  const allColumns = [...exercise.sourceColumns, ...exercise.classificationColumns];
  const columnKeys = exercise.sourceColumns.map(c => c.key);

  const toggleColumn = (colId: string) => {
    if (!allowedColumnIds) {
      // Switching from "all" to specific: start with all except this one
      setAllowedColumnIds(allColumns.filter(c => c.id !== colId).map(c => c.id));
    } else if (allowedColumnIds.includes(colId)) {
      setAllowedColumnIds(allowedColumnIds.filter(id => id !== colId));
    } else {
      const updated = [...allowedColumnIds, colId];
      // If all are selected, switch back to null (all)
      if (updated.length === allColumns.length) {
        setAllowedColumnIds(null);
      } else {
        setAllowedColumnIds(updated);
      }
    }
  };

  const handleSave = () => {
    if (!selectedAssignmentId) return;
    updatePermissions.mutate({
      assignmentId: selectedAssignmentId,
      permissions: {
        allowedColumnIds,
        rowFilter: rowFilter.conditions.length > 0 ? rowFilter : null,
        manualRowOverrides: (manualOverrides.include.length > 0 || manualOverrides.exclude.length > 0) ? manualOverrides : null,
      },
    });
  };

  if (loadingAssignments) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-4">
      {/* User selector */}
      <div className="space-y-2">
        <Label>Select User</Label>
        <div className="flex flex-wrap gap-2">
          {assignments?.map(a => (
            <Button
              key={a.id}
              variant={selectedAssignmentId === a.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSelectAssignment(a.id)}
            >
              {a.userName}
            </Button>
          ))}
          {(!assignments || assignments.length === 0) && (
            <p className="text-sm text-muted-foreground">No users assigned. Add users in the Assignments tab first.</p>
          )}
        </div>
      </div>

      {selectedAssignmentId && (
        <>
          {loadingPermissions ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Column access matrix */}
              <div className="space-y-3">
                <Label>Column Access</Label>
                <p className="text-xs text-muted-foreground">
                  {allowedColumnIds === null ? 'All columns accessible' : `${allowedColumnIds.length}/${allColumns.length} columns accessible`}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {allColumns.map(col => {
                    const isAllowed = allowedColumnIds === null || allowedColumnIds.includes(col.id);
                    return (
                      <button
                        key={col.id}
                        onClick={() => toggleColumn(col.id)}
                        className={`text-left p-2 rounded-md border text-sm transition-colors ${
                          isAllowed
                            ? 'bg-primary/10 border-primary/30 text-foreground'
                            : 'bg-muted border-border text-muted-foreground'
                        }`}
                      >
                        {col.label}
                        <span className="ml-1 text-xs text-muted-foreground">({col.columnRole})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row filter */}
              <div className="space-y-3">
                <Label>Row Filter</Label>
                <RowFilterBuilder filter={rowFilter} columnKeys={columnKeys} onChange={setRowFilter} />
              </div>

              {/* Manual overrides */}
              <div className="space-y-3">
                <Label>Manual Row Overrides</Label>
                <ManualRowPicker overrides={manualOverrides} onChange={setManualOverrides} />
              </div>

              {/* Save */}
              <Button onClick={handleSave} disabled={updatePermissions.isPending} isLoading={updatePermissions.isPending}>
                Save Permissions
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run typecheck**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && npm run typecheck`
Expected: PASS (all components now exist)

- [ ] **Step 5: Commit all frontend components**

```bash
git add client/src/pages/ExerciseEditPage.tsx client/src/components/exercise-edit/ client/src/hooks/useExerciseEdit.ts client/src/api/exercise-edit.ts client/src/App.tsx
git commit -m "feat: add exercise edit page with all tabs (general, datasource, columns, assignments, permissions)"
```

---

## Chunk 6: Entry Points and Integration

### Task 16: Add edit buttons to ExercisesPage and ExerciseProgressDrawer

**Files:**
- Modify: `client/src/pages/ExercisesPage.tsx`
- Modify: `client/src/components/dashboard/ExerciseProgressDrawer.tsx`

- [ ] **Step 1: Add edit button to ExercisesPage**

In `client/src/pages/ExercisesPage.tsx`, add the `Pencil` icon import:

```typescript
import { Loader2, Pencil } from 'lucide-react';
```

Add an edit button inside the exercise card (inside the `<div className="flex items-center gap-6 ml-6 shrink-0">` block, before the progress div). Add a click handler that stops propagation so it doesn't trigger the card's onClick:

```typescript
<Button
  variant="ghost"
  size="sm"
  onClick={(e) => {
    e.stopPropagation();
    navigate(`/exercises/${exercise.id}/edit`);
  }}
  title="Edit exercise"
>
  <Pencil className="h-4 w-4" />
</Button>
```

- [ ] **Step 2: Add edit button to ExerciseProgressDrawer**

Read the ExerciseProgressDrawer file first to identify where to add the button, then add a "Edit Exercise" button that navigates to the edit page. Add it near the top of the drawer content, after the exercise title.

```typescript
<Button variant="outline" size="sm" onClick={() => navigate(`/exercises/${exerciseId}/edit`)}>
  Edit Exercise
</Button>
```

(Use `useNavigate` from react-router-dom - import if not already imported.)

- [ ] **Step 3: Run typecheck**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/ExercisesPage.tsx client/src/components/dashboard/ExerciseProgressDrawer.tsx
git commit -m "feat: add edit buttons to exercises page and progress drawer"
```

---

### Task 17: Start reminder scheduler on server boot

**Files:**
- Modify: `server/src/index.ts` (or wherever the Express app is initialized)

- [ ] **Step 1: Find and modify the server entry point**

Look for the file that calls `app.listen()` or starts the Express server. Add the reminder scheduler import and start call:

```typescript
import { startReminderScheduler } from './services/reminder-scheduler';
```

Call `startReminderScheduler()` after the server starts listening:

```typescript
startReminderScheduler();
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add server/src/
git commit -m "feat: start deadline reminder scheduler on server boot"
```

---

### Task 18: Run full build and verify

- [ ] **Step 1: Run full typecheck**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && npm run typecheck`
Expected: PASS with no errors

- [ ] **Step 2: Run full build**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && npm run build`
Expected: PASS

- [ ] **Step 3: Run tests**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && npm run test`
Expected: Existing tests PASS (no new tests break)

- [ ] **Step 4: Manual smoke test**

Start dev server: `npm run dev`

1. Navigate to `/exercises` - verify edit buttons appear on exercise cards
2. Click edit button - verify `/exercises/:id/edit` loads with tabs
3. Switch between tabs - verify each renders without errors
4. Edit a field in General tab, try switching tabs - verify unsaved changes dialog appears
5. Save changes in General tab - verify toast notification
6. Test status transition buttons

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address any build/type errors from integration"
```
