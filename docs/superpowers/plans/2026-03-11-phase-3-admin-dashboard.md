# Phase 3: Admin Dashboard

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the admin dashboard that provides organization-wide visibility into all exercises, assigned users, progress tracking, and the ability to drill into per-user progress via a slide-in drawer.

**Architecture:** The admin dashboard is a single page (`/admin`) composed of a stats bar, a tabbed exercise table, and a slide-in progress drawer. React Query hooks fetch data from admin-only Express endpoints that aggregate exercise and user progress data. The drawer opens on row click and fetches per-user progress detail for the selected exercise.

**Tech Stack:** React 19, Zustand 5, TanStack React Query 5, Tailwind CSS 4, Axios, react-hot-toast, lucide-react, Express 5, Drizzle ORM, Vitest, React Testing Library

**Depends on:** Phase 1 (foundations: common components, design system, types, API client), Phase 2 (server endpoints for exercises/records, database schema)

**Spec reference:** `docs/superpowers/specs/2026-03-11-mapforge-user-facing-screens-design.md` Section 4

---

## Task 1: Admin React Query Hooks

**Files:**
- `client/src/api/admin.ts`
- `client/src/hooks/useAdmin.ts`
- `client/src/hooks/__tests__/useAdmin.test.ts`

### Steps

- [ ] Create `client/src/api/admin.ts` with Axios-based API functions:
  ```typescript
  import { apiClient } from './client';
  import type { AdminExerciseListItem, ExerciseProgressDetail } from '../types';

  export async function fetchAllExercises(): Promise<AdminExerciseListItem[]> {
    const { data } = await apiClient.get('/api/v1/admin/exercises');
    return data.exercises;
  }

  export async function fetchExerciseProgress(id: string): Promise<ExerciseProgressDetail> {
    const { data } = await apiClient.get(`/api/v1/admin/exercises/${id}/progress`);
    return data;
  }

  export async function sendReminder(exerciseId: string, userId: string): Promise<void> {
    await apiClient.post(`/api/v1/admin/exercises/${exerciseId}/remind/${userId}`);
  }

  export async function exportProgressCsv(exerciseId: string): Promise<Blob> {
    const { data } = await apiClient.get(
      `/api/v1/admin/exercises/${exerciseId}/progress/export`,
      { responseType: 'blob' }
    );
    return data;
  }
  ```

- [ ] Create `client/src/hooks/useAdmin.ts` with three hooks:
  ```typescript
  import { useQuery, useMutation } from '@tanstack/react-query';
  import toast from 'react-hot-toast';
  import { fetchAllExercises, fetchExerciseProgress, sendReminder } from '../api/admin';

  export function useAllExercises() {
    return useQuery({
      queryKey: ['admin-exercises'],
      queryFn: fetchAllExercises,
      staleTime: 30_000,
    });
  }

  export function useExerciseProgress(exerciseId: string | null) {
    return useQuery({
      queryKey: ['exercise-progress', exerciseId],
      queryFn: () => fetchExerciseProgress(exerciseId!),
      enabled: exerciseId !== null,
      staleTime: 15_000,
    });
  }

  export function useSendReminder() {
    return useMutation({
      mutationFn: ({ exerciseId, userId }: { exerciseId: string; userId: string }) =>
        sendReminder(exerciseId, userId),
      onSuccess: () => {
        toast.success('Reminder sent');
      },
      onError: () => {
        toast.error('Failed to send reminder');
      },
    });
  }
  ```

- [ ] Create `client/src/hooks/__tests__/useAdmin.test.ts`:
  - Mock `client/src/api/admin.ts` with `vi.mock`
  - Test `useAllExercises` returns exercise list and respects staleTime
  - Test `useExerciseProgress` is disabled when `exerciseId` is null, enabled when set
  - Test `useSendReminder` calls `sendReminder` and triggers success toast
  - Test `useSendReminder` triggers error toast on failure
  - Use `@tanstack/react-query` test utilities (`QueryClient`, `renderHook` wrapper)
  - Provide mock data matching `AdminExerciseListItem` and `ExerciseProgressDetail` types

### Test Command

```bash
npx vitest run client/src/hooks/__tests__/useAdmin.test.ts
```

### Commit Message

```
feat(admin): add React Query hooks for admin dashboard API
```

---

## Task 2: AdminStatsBar

**Files:**
- `client/src/components/dashboard/AdminStatsBar.tsx`
- `client/src/components/dashboard/__tests__/AdminStatsBar.test.tsx`

### Steps

- [ ] Create `client/src/components/dashboard/AdminStatsBar.tsx`:
  ```typescript
  import { forwardRef } from 'react';
  import type { AdminExerciseListItem } from '../../types';
  import { Card } from '../common/Card';

  interface AdminStatsBarProps {
    exercises: AdminExerciseListItem[];
  }

  function computeStats(exercises: AdminExerciseListItem[]) {
    const total = exercises.length;
    const active = exercises.filter((e) => e.status === 'active').length;

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const atRisk = exercises.filter((e) => {
      if (e.status !== 'active') return false;
      const deadlineRisk =
        e.deadline &&
        new Date(e.deadline) <= sevenDaysFromNow &&
        e.totalRecords > 0 &&
        (e.classifiedRecords / e.totalRecords) * 100 < 90;
      const userInactiveRisk = e.assignedUsers.some(
        (u) => u.lastActiveAt && new Date(u.lastActiveAt) < sevenDaysAgo
      );
      return deadlineRisk || userInactiveRisk;
    }).length;

    const totalClassified = exercises.reduce((sum, e) => sum + e.classifiedRecords, 0);

    return { total, active, atRisk, totalClassified };
  }

  export const AdminStatsBar = forwardRef<HTMLDivElement, AdminStatsBarProps>(
    function AdminStatsBar({ exercises }, ref) {
      const { total, active, atRisk, totalClassified } = computeStats(exercises);

      const stats = [
        { label: 'Total Exercises', value: total },
        { label: 'Active', value: active },
        { label: 'At Risk', value: atRisk, highlight: atRisk > 0 },
        { label: 'Records Classified', value: totalClassified.toLocaleString() },
      ];

      return (
        <div ref={ref} className={['grid grid-cols-4 gap-4 px-6 py-4'].join(' ')}>
          {stats.map((stat) => (
            <Card
              key={stat.label}
              padding="sm"
              className={[
                stat.highlight ? 'border-amber-500/30' : '',
              ].join(' ')}
            >
              <div className={['text-xs text-forge-400 uppercase tracking-wide'].join(' ')}>
                {stat.label}
              </div>
              <div
                className={[
                  'text-2xl font-semibold',
                  stat.highlight ? 'text-amber-400' : 'text-forge-50',
                ].join(' ')}
              >
                {stat.value}
              </div>
            </Card>
          ))}
        </div>
      );
    }
  );
  ```

- [ ] Create `client/src/components/dashboard/__tests__/AdminStatsBar.test.tsx`:
  - Render with an array of mock exercises covering active, draft, archived, at-risk states
  - Assert total count matches `exercises.length`
  - Assert active count filters correctly
  - Assert at-risk count highlights in amber when > 0
  - Assert at-risk section has no amber styling when count is 0
  - Assert totalClassified is the sum of all `classifiedRecords`

### Test Command

```bash
npx vitest run client/src/components/dashboard/__tests__/AdminStatsBar.test.tsx
```

### Commit Message

```
feat(admin): add AdminStatsBar component with computed aggregate stats
```

---

## Task 3: StatusBadge

**Files:**
- `client/src/components/dashboard/StatusBadge.tsx`
- `client/src/components/dashboard/__tests__/StatusBadge.test.tsx`

### Steps

- [ ] Create `client/src/components/dashboard/StatusBadge.tsx`:
  ```typescript
  import { forwardRef } from 'react';
  import type { AdminExerciseListItem } from '../../types';
  import { Badge } from '../common/Badge';

  interface StatusBadgeProps {
    exercise: AdminExerciseListItem;
  }

  type DisplayStatus = 'Complete' | 'On Track' | 'At Risk' | 'Overdue' | 'Not Started' | 'Paused';
  type BadgeVariant = 'clean' | 'default' | 'warning' | 'error' | 'outline';

  const statusVariantMap: Record<DisplayStatus, BadgeVariant> = {
    Complete: 'clean',
    'On Track': 'default',
    'At Risk': 'warning',
    Overdue: 'error',
    'Not Started': 'outline',
    Paused: 'outline',
  };

  function deriveStatus(exercise: AdminExerciseListItem): DisplayStatus {
    if (exercise.status === 'paused') return 'Paused';

    const pct =
      exercise.totalRecords > 0
        ? (exercise.classifiedRecords / exercise.totalRecords) * 100
        : 0;

    if (pct === 100 && exercise.errorCount === 0) return 'Complete';
    if (pct === 0) return 'Not Started';

    if (exercise.deadline) {
      const now = new Date();
      const deadline = new Date(exercise.deadline);
      const daysUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      if (daysUntil < 0 && pct < 100) return 'Overdue';
      if (daysUntil <= 7 && pct < 90) return 'At Risk';
    }

    return 'On Track';
  }

  export const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
    function StatusBadge({ exercise }, ref) {
      const status = deriveStatus(exercise);
      return (
        <Badge ref={ref} variant={statusVariantMap[status]}>
          {status}
        </Badge>
      );
    }
  );
  ```

- [ ] Create `client/src/components/dashboard/__tests__/StatusBadge.test.tsx`:
  - Test "Complete" when classifiedRecords === totalRecords and errorCount === 0
  - Test "On Track" for active exercise with progress and deadline > 7 days away
  - Test "At Risk" when deadline within 7 days and < 90% complete
  - Test "Overdue" when deadline is past and < 100% complete
  - Test "Not Started" when 0% progress
  - Test "Paused" when status is paused
  - Verify each case maps to the correct Badge variant

### Test Command

```bash
npx vitest run client/src/components/dashboard/__tests__/StatusBadge.test.tsx
```

### Commit Message

```
feat(admin): add StatusBadge component with derived exercise status logic
```

---

## Task 4: UserAvatarStack

**Files:**
- `client/src/components/dashboard/UserAvatarStack.tsx`
- `client/src/components/dashboard/__tests__/UserAvatarStack.test.tsx`

### Steps

- [ ] Create `client/src/components/dashboard/UserAvatarStack.tsx`:
  ```typescript
  import { forwardRef } from 'react';
  import type { AssignedUserSummary } from '../../types';
  import { Tooltip } from '../common/Tooltip';

  interface UserAvatarStackProps {
    users: AssignedUserSummary[];
    maxVisible?: number;
  }

  function getInitials(name: string): string {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  export const UserAvatarStack = forwardRef<HTMLDivElement, UserAvatarStackProps>(
    function UserAvatarStack({ users, maxVisible = 3 }, ref) {
      const visible = users.slice(0, maxVisible);
      const overflow = users.length - maxVisible;
      const allNames = users.map((u) => u.name).join(', ');

      return (
        <Tooltip content={allNames}>
          <div ref={ref} className={['flex items-center'].join(' ')}>
            {visible.map((user, index) => (
              <div
                key={user.id}
                className={[
                  'w-7 h-7 rounded-full border-2 border-forge-900',
                  'bg-forge-700 text-forge-200 text-xs font-medium',
                  'flex items-center justify-center',
                  index > 0 ? '-ml-2' : '',
                ].join(' ')}
              >
                {getInitials(user.name)}
              </div>
            ))}
            {overflow > 0 && (
              <div
                className={[
                  'w-7 h-7 rounded-full border-2 border-forge-900',
                  'bg-forge-700 text-forge-300 text-xs font-medium',
                  'flex items-center justify-center -ml-2',
                ].join(' ')}
              >
                +{overflow}
              </div>
            )}
          </div>
        </Tooltip>
      );
    }
  );
  ```

- [ ] Create `client/src/components/dashboard/__tests__/UserAvatarStack.test.tsx`:
  - Render with 2 users, verify 2 avatar circles and no overflow
  - Render with 5 users (default maxVisible=3), verify 3 avatars + "+2" overflow circle
  - Render with custom `maxVisible={1}`, verify 1 avatar + "+4" for 5 users
  - Verify initials are derived correctly from user names
  - Verify tooltip content lists all user names

### Test Command

```bash
npx vitest run client/src/components/dashboard/__tests__/UserAvatarStack.test.tsx
```

### Commit Message

```
feat(admin): add UserAvatarStack component with overflow and tooltip
```

---

## Task 5: ExerciseTable

**Files:**
- `client/src/components/dashboard/ExerciseTable.tsx`
- `client/src/components/dashboard/__tests__/ExerciseTable.test.tsx`

### Steps

- [ ] Create `client/src/components/dashboard/ExerciseTable.tsx`:
  ```typescript
  import { forwardRef, useMemo, useState } from 'react';
  import { ArrowUpDown } from 'lucide-react';
  import type { AdminExerciseListItem } from '../../types';
  import { Tabs } from '../common/Tabs';
  import { Table } from '../common/Table';
  import { Badge } from '../common/Badge';
  import { ProgressBar } from '../common/ProgressBar';
  import { StatusBadge } from './StatusBadge';
  import { UserAvatarStack } from './UserAvatarStack';

  interface ExerciseTableProps {
    exercises: AdminExerciseListItem[];
    activeTab: 'active' | 'completed' | 'draft' | 'archived';
    onTabChange: (tab: string) => void;
    selectedExerciseId: string | null;
    onSelectExercise: (id: string | null) => void;
  }
  ```
  - Implement tab filter logic:
    - "Active": `status === 'active'` AND NOT fully classified (classifiedRecords < totalRecords OR errorCount > 0)
    - "Completed": `status === 'active'` AND `classifiedRecords === totalRecords` AND `errorCount === 0`
    - "Drafts": `status === 'draft'`
    - "Archived": `status === 'archived'`
  - Compute tab badge counts from the exercises array using `useMemo`
  - Implement sortable columns with `useState` for `sortColumn` and `sortDirection`
  - Sortable columns: Name (alphabetical), Progress (by completion percentage), Errors (numeric), Deadline (date), Status (priority order)
  - Default sort: status priority (At Risk first, then On Track, then Not Started) then deadline ascending
  - Render Tabs with count badges: `[Active (3)] [Completed (2)] [Drafts (1)] [Archived (6)]`
  - Render Table with columns:
    - **Name**: exercise name + truncated description (max 60 chars)
    - **Assigned**: `UserAvatarStack` with `exercise.assignedUsers`
    - **Progress**: inline thin ProgressBar (h-1) + percentage text
    - **Errors**: `Badge variant="error"` if > 0, plain text "0" in `text-forge-500` otherwise
    - **Deadline**: formatted date string or "--" if null
    - **Status**: `StatusBadge`
  - Row styling:
    - Default: `hover:bg-forge-850 cursor-pointer`
    - Selected: `bg-forge-850 border-l-2 border-amber-500`
  - Row click calls `onSelectExercise(exercise.id)`, clicking again deselects (passes null)

- [ ] Create `client/src/components/dashboard/__tests__/ExerciseTable.test.tsx`:
  - Render with mixed exercises across all tab states
  - Verify "Active" tab filters out completed and draft exercises
  - Verify "Completed" tab shows only fully classified + 0 error exercises
  - Verify "Drafts" and "Archived" filter by status field
  - Verify tab badge counts are correct
  - Verify clicking a row calls `onSelectExercise` with the exercise id
  - Verify clicking the same row again calls `onSelectExercise(null)` to deselect
  - Verify selected row has `border-amber-500` class
  - Verify clicking a sortable column header changes sort order

### Test Command

```bash
npx vitest run client/src/components/dashboard/__tests__/ExerciseTable.test.tsx
```

### Commit Message

```
feat(admin): add ExerciseTable with tabs, sorting, and row selection
```

---

## Task 6: UserProgressCard

**Files:**
- `client/src/components/dashboard/UserProgressCard.tsx`
- `client/src/components/dashboard/__tests__/UserProgressCard.test.tsx`

### Steps

- [ ] Create `client/src/components/dashboard/UserProgressCard.tsx`:
  ```typescript
  import { forwardRef } from 'react';
  import { Send } from 'lucide-react';
  import type { UserProgress } from '../../types';
  import { Badge } from '../common/Badge';
  import { Button } from '../common/Button';
  import { ProgressBar } from '../common/ProgressBar';

  interface UserProgressCardProps {
    progress: UserProgress;
    exerciseAvgCompletion: number;
    onSendReminder: (userId: string) => void;
    reminderLoading?: boolean;
  }
  ```
  - Compute completion percentage: `classifiedRecords / assignedRecords * 100` (handle zero division)
  - Compute relative time for `lastActiveAt`:
    - null: display "Never logged in" in `text-amber-400`
    - More than 7 days ago: display "{n} days inactive" in `text-amber-400`
    - Otherwise: display relative time (e.g., "2d ago", "5h ago") in `text-forge-500`
  - Determine "behind" status: completion % is below `exerciseAvgCompletion` OR `lastActiveAt` is null or > 5 days ago
  - Row 1: avatar with initials (w-8 h-8 rounded-full bg-forge-700), name (`text-sm font-medium text-forge-100`), email (`text-xs text-forge-500`), role badge (`Badge variant="outline"`)
  - Row 2: thin ProgressBar (`variant="amber"`, h-1.5), below bar flex between `{classified}/{assigned} ({pct}%)` and last active text
  - Row 3 (conditional, only when behind): `Button variant="ghost" size="sm"` with Send icon and "Send Reminder" label
  - On button click: call `onSendReminder(progress.user.id)`

- [ ] Create `client/src/components/dashboard/__tests__/UserProgressCard.test.tsx`:
  - Render with user who is on track (above average, recently active) -- verify no reminder button
  - Render with user who is behind (below average completion) -- verify reminder button shown
  - Render with user who has never logged in -- verify "Never logged in" in amber, reminder button shown
  - Render with user inactive > 7 days -- verify "{n} days inactive" in amber
  - Click "Send Reminder" button, verify `onSendReminder` called with correct userId
  - Verify role badge displays correctly for "editor" and "viewer"

### Test Command

```bash
npx vitest run client/src/components/dashboard/__tests__/UserProgressCard.test.tsx
```

### Commit Message

```
feat(admin): add UserProgressCard with activity tracking and reminder action
```

---

## Task 7: ExerciseProgressDrawer

**Files:**
- `client/src/components/dashboard/ExerciseProgressDrawer.tsx`
- `client/src/components/dashboard/__tests__/ExerciseProgressDrawer.test.tsx`

### Steps

- [ ] Create `client/src/components/dashboard/ExerciseProgressDrawer.tsx`:
  ```typescript
  import { forwardRef, useCallback } from 'react';
  import { X, Download, FileText } from 'lucide-react';
  import { useExerciseProgress, useSendReminder } from '../../hooks/useAdmin';
  import { exportProgressCsv } from '../../api/admin';
  import { Button } from '../common/Button';
  import { ProgressBar } from '../common/ProgressBar';
  import { Spinner } from '../common/Spinner';
  import { EmptyState } from '../common/EmptyState';
  import { UserProgressCard } from './UserProgressCard';

  interface ExerciseProgressDrawerProps {
    exerciseId: string;
    onClose: () => void;
  }
  ```
  - Outer container: fixed positioning on the right, `w-96`, full height below TopBar, `bg-forge-900 border-l border-forge-700`
  - Slide-in animation: transition from `translate-x-full` to `translate-x-0`, `duration-200 ease-out`
  - Use `useExerciseProgress(exerciseId)` hook to fetch data
  - **Header** (`px-5 py-4 border-b border-forge-800`):
    - Exercise name: `text-lg font-semibold text-forge-50`
    - Close button: `Button variant="ghost" size="sm"` with X icon
  - **Stats section** (`px-5 py-4`):
    - `ProgressBar variant="amber"` with label showing `"{classified} of {total} ({pct}%)"`
    - Grid `grid-cols-3 gap-3 mt-3`:
      - "Classified" value in `text-status-clean`
      - "Remaining" value in `text-forge-400`
      - "Errors" value in `text-status-error` if > 0
    - Deadline line using formatted date
    - "Last refreshed" line: `text-xs text-forge-500`
  - **User Progress section** (`px-5 py-4 border-t border-forge-800`):
    - Section title: `text-sm font-semibold text-forge-200 uppercase tracking-wide` "User Progress"
    - Compute exercise average completion from all `userProgress` entries
    - Map over `userProgress` array, render `UserProgressCard` for each
    - Pass `exerciseAvgCompletion` and wire `onSendReminder` to the `useSendReminder` mutation
  - **Actions section** (`px-5 py-4 border-t border-forge-800 mt-auto`):
    - "Export Progress CSV": `Button variant="secondary" size="sm"` with Download icon, full width
      - On click: call `exportProgressCsv(exerciseId)`, create a download link from the Blob
    - "View Audit Log": `Button variant="ghost" size="sm"` with FileText icon, full width, `mt-2`
  - **Loading state**: Drawer header renders immediately. Body shows centered `Spinner`
  - **Error state**: Inline error text "Failed to load progress details." with "Retry" `Button variant="ghost" size="sm"` that calls `refetch()`
  - **Empty state**: When `userProgress` is an empty array, render `EmptyState` with message "No users assigned to this exercise."

- [ ] Create `client/src/components/dashboard/__tests__/ExerciseProgressDrawer.test.tsx`:
  - Mock `useExerciseProgress` and `useSendReminder` hooks
  - Test loading state: verify Spinner is rendered, header shows exercise name
  - Test success state: verify stats section renders correct classified/remaining/error counts
  - Test user progress cards render for each user in the response
  - Test "Send Reminder" calls mutation with correct exerciseId and userId
  - Test error state: verify error message and retry button, click retry calls refetch
  - Test empty users state: verify EmptyState message
  - Test close button calls `onClose`
  - Test "Export Progress CSV" button triggers download

### Test Command

```bash
npx vitest run client/src/components/dashboard/__tests__/ExerciseProgressDrawer.test.tsx
```

### Commit Message

```
feat(admin): add ExerciseProgressDrawer with user progress and actions
```

---

## Task 8: AdminDashboardPage Assembly

**Files:**
- `client/src/pages/AdminDashboardPage.tsx`
- `client/src/pages/__tests__/AdminDashboardPage.test.tsx`

### Steps

- [ ] Create `client/src/pages/AdminDashboardPage.tsx`:
  ```typescript
  import { useState } from 'react';
  import { useAllExercises } from '../hooks/useAdmin';
  import { AdminStatsBar } from '../components/dashboard/AdminStatsBar';
  import { ExerciseTable } from '../components/dashboard/ExerciseTable';
  import { ExerciseProgressDrawer } from '../components/dashboard/ExerciseProgressDrawer';
  import { Spinner } from '../components/common/Spinner';
  import { EmptyState } from '../components/common/EmptyState';
  import { Button } from '../components/common/Button';
  ```
  - State: `activeTab` (default `'active'`), `selectedExerciseId` (default `null`)
  - Fetch exercises via `useAllExercises()`
  - **Loading state**: full-page centered `Spinner`
  - **Error state**: centered error message "Failed to load exercises." with "Retry" button calling `refetch()`
  - **Empty state**: `EmptyState` with message "No exercises found."
  - **Layout**:
    - TopBar is assumed to be provided by the `AppLayout` wrapper (from Phase 1)
    - `AdminStatsBar` at the top, receives `exercises` data
    - Main content area: `flex` container
      - Left: `ExerciseTable` with `flex-1` (shrinks when drawer open via `transition-all duration-200`)
      - Right (conditional): `ExerciseProgressDrawer` when `selectedExerciseId` is not null
  - When table row is clicked, set `selectedExerciseId` to open drawer
  - Close drawer: set `selectedExerciseId` to null (via drawer's `onClose` or by clicking the same row)

- [ ] Create `client/src/pages/__tests__/AdminDashboardPage.test.tsx`:
  - Mock `useAllExercises` hook
  - Test loading state renders Spinner
  - Test error state renders error message and retry button
  - Test exercises render in AdminStatsBar and ExerciseTable
  - Test clicking a table row opens ExerciseProgressDrawer
  - Test clicking drawer close button sets selectedExerciseId to null
  - Test clicking the same row again closes the drawer

### Test Command

```bash
npx vitest run client/src/pages/__tests__/AdminDashboardPage.test.tsx
```

### Commit Message

```
feat(admin): assemble AdminDashboardPage with stats, table, and drawer
```

---

## Task 9: Server - Admin API Endpoints

**Files:**
- `server/src/routes/admin.ts`
- `server/src/middleware/requireAdmin.ts`
- `server/src/__tests__/admin.test.ts`

### Steps

- [ ] Create `server/src/middleware/requireAdmin.ts`:
  ```typescript
  import type { Request, Response, NextFunction } from 'express';

  export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    // Assumes req.user is populated by auth middleware (from Phase 1)
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  }
  ```

- [ ] Create `server/src/routes/admin.ts` with four endpoints:

  - **GET `/api/v1/admin/exercises`**:
    - Query all exercises with Drizzle ORM, include aggregated stats
    - For each exercise, query assigned users with summary data (id, name, email, role, classifiedCount, lastActiveAt)
    - Return `{ exercises: AdminExerciseListItem[] }`

  - **GET `/api/v1/admin/exercises/:id/progress`**:
    - Query exercise by id
    - Return 404 if not found
    - Query per-user progress: assignedRecords, classifiedRecords, errorCount, lastActiveAt, completionPercentage
    - Return `ExerciseProgressDetail`

  - **POST `/api/v1/admin/exercises/:id/remind/:userId`**:
    - Validate exercise and user exist
    - Check rate limit: query last reminder sent for this (exerciseId, userId) pair
    - If within 24 hours, return 429 `{ error: 'Reminder already sent within the last 24 hours' }`
    - Otherwise, insert reminder record with timestamp
    - Trigger notification (email + in-app -- implementation can be a stub/event emission for now)
    - Return `{ sent: true }`

  - **GET `/api/v1/admin/exercises/:id/progress/export`**:
    - Query per-user progress data (same as progress endpoint)
    - Format as CSV with columns: `user_name, user_email, role, assigned_records, classified_records, error_count, completion_percentage, last_active_at`
    - Set response headers: `Content-Type: text/csv`, `Content-Disposition: attachment; filename="exercise-{id}-progress.csv"`
    - Stream CSV response

- [ ] Register routes in the Express app:
  ```typescript
  import { Router } from 'express';
  import { requireAdmin } from '../middleware/requireAdmin';

  const router = Router();
  router.use(requireAdmin);

  router.get('/exercises', getAllExercises);
  router.get('/exercises/:id/progress', getExerciseProgress);
  router.post('/exercises/:id/remind/:userId', sendReminder);
  router.get('/exercises/:id/progress/export', exportProgressCsv);

  export { router as adminRouter };
  ```
  Mount at `/api/v1/admin` in the main Express app.

- [ ] Create `server/src/__tests__/admin.test.ts`:
  - Seed test database with: 3 exercises (active, draft, archived), 4 users with varying roles
  - Assign users to exercises with different progress levels
  - **GET /exercises**: verify returns all exercises with correct assignedUsers arrays
  - **GET /exercises/:id/progress**: verify returns correct per-user breakdown
  - **GET /exercises/:id/progress**: verify returns 404 for non-existent id
  - **POST /exercises/:id/remind/:userId**: verify returns `{ sent: true }` on first call
  - **POST /exercises/:id/remind/:userId**: verify returns 429 on second call within 24 hours
  - **GET /exercises/:id/progress/export**: verify CSV response with correct headers and data rows
  - **All endpoints**: verify 403 when called without admin role

### Test Command

```bash
npx vitest run server/src/__tests__/admin.test.ts
```

### Commit Message

```
feat(admin): add admin API endpoints with rate-limited reminders and CSV export
```

---

## Task 10: Integration Test

**Files:**
- `client/src/__tests__/admin-dashboard.integration.test.tsx`

### Steps

- [ ] Create `client/src/__tests__/admin-dashboard.integration.test.tsx`:
  - Set up MSW (Mock Service Worker) handlers for all admin API endpoints
  - Seed mock data:
    - 5 exercises: 2 active (one at risk, one on track), 1 completed, 1 draft, 1 archived
    - 4 users: varying progress levels, one never logged in, one inactive > 7 days
  - Wrap rendering in `QueryClientProvider` and router context

- [ ] Test: Table renders and tabs filter correctly
  - Render `AdminDashboardPage`
  - Wait for exercises to load (Spinner disappears)
  - Verify AdminStatsBar shows correct counts
  - Verify "Active" tab shows 2 exercises (the at-risk and on-track ones, not the completed one)
  - Click "Completed" tab, verify 1 exercise shown
  - Click "Drafts" tab, verify 1 exercise shown
  - Click "Archived" tab, verify 1 exercise shown

- [ ] Test: Click exercise opens drawer with progress
  - Click on the first active exercise row
  - Verify ExerciseProgressDrawer appears (wait for slide-in)
  - Verify drawer header shows the exercise name
  - Verify progress stats render (classified, remaining, errors)
  - Verify UserProgressCards render for each assigned user

- [ ] Test: Send reminder flow
  - Open drawer for an exercise with a behind user
  - Find the "Send Reminder" button for the behind user
  - Click "Send Reminder"
  - Verify toast success message "Reminder sent" appears
  - Click "Send Reminder" again for the same user
  - Verify toast error for rate limiting (MSW returns 429)

- [ ] Test: Drawer close behavior
  - Open drawer by clicking a row
  - Click the close (X) button
  - Verify drawer is no longer visible
  - Click the same row again, verify drawer reopens

- [ ] Test: Loading and error states
  - Configure MSW to delay response, verify Spinner renders
  - Configure MSW to return 500, verify error message and retry button
  - Click retry, configure MSW to succeed, verify data loads

### Test Command

```bash
npx vitest run client/src/__tests__/admin-dashboard.integration.test.tsx
```

### Commit Message

```
test(admin): add integration tests for admin dashboard end-to-end flows
```

---

## Summary of All Files

| Task | Files Created/Modified |
|------|----------------------|
| 1 | `client/src/api/admin.ts`, `client/src/hooks/useAdmin.ts`, `client/src/hooks/__tests__/useAdmin.test.ts` |
| 2 | `client/src/components/dashboard/AdminStatsBar.tsx`, `client/src/components/dashboard/__tests__/AdminStatsBar.test.tsx` |
| 3 | `client/src/components/dashboard/StatusBadge.tsx`, `client/src/components/dashboard/__tests__/StatusBadge.test.tsx` |
| 4 | `client/src/components/dashboard/UserAvatarStack.tsx`, `client/src/components/dashboard/__tests__/UserAvatarStack.test.tsx` |
| 5 | `client/src/components/dashboard/ExerciseTable.tsx`, `client/src/components/dashboard/__tests__/ExerciseTable.test.tsx` |
| 6 | `client/src/components/dashboard/UserProgressCard.tsx`, `client/src/components/dashboard/__tests__/UserProgressCard.test.tsx` |
| 7 | `client/src/components/dashboard/ExerciseProgressDrawer.tsx`, `client/src/components/dashboard/__tests__/ExerciseProgressDrawer.test.tsx` |
| 8 | `client/src/pages/AdminDashboardPage.tsx`, `client/src/pages/__tests__/AdminDashboardPage.test.tsx` |
| 9 | `server/src/routes/admin.ts`, `server/src/middleware/requireAdmin.ts`, `server/src/__tests__/admin.test.ts` |
| 10 | `client/src/__tests__/admin-dashboard.integration.test.tsx` |
