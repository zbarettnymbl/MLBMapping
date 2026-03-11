# MapForge User-Facing Screens -- Design Specification

**Date**: 2026-03-11
**Scope**: Business User Dashboard, Enrichment Spreadsheet View, Admin Dashboard
**Stack**: React 19, Vite 7, Tailwind CSS 4, AG Grid Community, Zustand, React Query, Express 5, Drizzle ORM, PostgreSQL 16
**Design System**: "Industrial Precision" -- carried from existing codebase (forge color palette, amber/cyan accents, DM Sans / JetBrains Mono typography, 4px spacing grid, sharp border radii)

---

## Table of Contents

1. [Shared Foundations](#1-shared-foundations)
2. [Business User Dashboard](#2-business-user-dashboard)
3. [Enrichment Spreadsheet View](#3-enrichment-spreadsheet-view)
4. [Admin Dashboard](#4-admin-dashboard)

---

## 1. Shared Foundations

### 1.1 Project Structure

```
mapforge/
  client/
    src/
      components/
        common/          # Button, Card, Input, Select, Modal, Badge, ProgressBar, etc.
        layout/          # AppLayout, Sidebar, TopBar
        grid/            # SpreadsheetGrid, cell renderers, cell editors
        dashboard/       # Shared dashboard widgets
      pages/
        BusinessDashboardPage.tsx
        EnrichmentSpreadsheetPage.tsx
        AdminDashboardPage.tsx
      hooks/             # useExercises, useRecords, useClassifications, useAuth
      stores/            # Zustand stores
      api/               # API client functions
      types/             # Shared TypeScript types
      contexts/          # AuthContext
      index.css          # Design system
  server/
    src/
      routes/            # Express route handlers
      db/
        schema.ts        # Drizzle ORM schema
  shared/
    src/
      types/             # Types shared between client and server
```

### 1.2 Auth Context and Routing

Follows the existing `AuthContext` pattern. The user object includes role:

```typescript
interface AuthUser {
  id: string;
  orgId: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  avatarUrl: string | null;
}
```

Routes:

- `/` -- redirects to `/dashboard` (business user) or `/admin` (admin)
- `/dashboard` -- `BusinessDashboardPage` (role: user)
- `/exercises/:exerciseId` -- `EnrichmentSpreadsheetPage` (role: user, must be assigned)
- `/admin` -- `AdminDashboardPage` (role: admin)
- `/login` -- login page

### 1.3 Shared API Client

Thin fetch wrappers consumed by React Query hooks:

```typescript
// api/exercises.ts
export async function fetchMyExercises(): Promise<ExerciseListItem[]>
export async function fetchExerciseDetail(id: string): Promise<ExerciseDetail>
export async function fetchExerciseRecords(id: string, params: RecordQueryParams): Promise<PaginatedRecords>
export async function classifyRecord(exerciseId: string, recordId: string, values: ClassificationPayload): Promise<ClassificationResult>
export async function bulkClassify(exerciseId: string, payload: BulkClassificationPayload): Promise<BulkClassificationResult>
export async function fetchExerciseStats(id: string): Promise<ExerciseStats>

// api/admin.ts
export async function fetchAllExercises(): Promise<AdminExerciseListItem[]>
export async function fetchExerciseProgress(id: string): Promise<ExerciseProgressDetail>
export async function sendReminder(exerciseId: string, userId: string): Promise<void>

// api/reference-tables.ts
export async function fetchReferenceTableValues(
  tableId: string,
  params: { filterColumn: string; filterValue: string; valueColumn: string }
): Promise<{ values: string[] }>
```

**Toast notifications**: Uses `react-hot-toast` (already in the existing codebase). Import `toast` from `react-hot-toast`. Global `<Toaster />` mounted in `App.tsx`, positioned top-right.

**Debounce utility**: Uses `lodash-es/debounce`. Import as `import debounce from 'lodash-es/debounce'`.

### 1.4 Core Shared Types

```typescript
// Exercise as seen by business users
interface ExerciseListItem {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  totalRecords: number;
  classifiedRecords: number;
  errorCount: number;
  lastUpdatedAt: string;
  deadline: string | null;
  hasNewRecords: boolean;
  newRecordCount: number;
  columnStats: Array<{
    columnKey: string;
    label: string;
    filledCount: number;
    totalCount: number;
    percentage: number;
  }>;
}

// Exercise detail (full config for the spreadsheet view)
interface ExerciseDetail {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  sourceColumns: ExerciseColumn[];
  classificationColumns: ExerciseColumn[];
  deadline: string | null;
  lastRefreshedAt: string;
}

interface ExerciseColumn {
  id: string;
  key: string;
  label: string;
  description: string | null;
  dataType: 'text' | 'number' | 'date' | 'boolean' | 'picklist' | 'multi_select';
  columnRole: 'source' | 'classification' | 'computed';
  required: boolean;
  defaultValue: string | null;
  config: ColumnConfig;
  validationRules: ValidationRule[];
  referenceLink: ReferenceLink | null;
  dependentConfig: DependentPicklistConfig | null;
  visible: boolean;
  ordinal: number;
}

interface ColumnConfig {
  picklistValues?: string[];
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;
  regexPattern?: string;
  dateFormat?: string;
  minDate?: string;
  maxDate?: string;
}

interface DependentPicklistConfig {
  parentColumnKey: string;
  referenceTableId: string;
  parentReferenceColumn: string;
  childReferenceColumn: string;
}

interface ReferenceLink {
  referenceTableId: string;
  referenceColumnKey: string;
  displayColumnKey: string;
}

interface ValidationRule {
  type: 'required' | 'enum' | 'range' | 'date_range' | 'regex' | 'dependent' | 'relational';
  config: Record<string, unknown>;
  severity: 'error' | 'warning';
  message: string;
}

// Record + classification data
interface EnrichmentRecord {
  id: string;
  uniqueKey: Record<string, string>;
  sourceData: Record<string, unknown>;
  classifications: Record<string, string | null>; // columnKey -> value
  recordState: 'new' | 'existing' | 'changed' | 'removed';
  validationErrors: CellError[];
  isFullyClassified: boolean;
}

interface CellError {
  columnKey: string;
  severity: 'error' | 'warning';
  message: string;
  ruleType: string;
}

interface ClassificationPayload {
  values: Array<{ columnKey: string; value: string | null }>;
}

interface ClassificationResult {
  validationErrors: CellError[];
  isFullyClassified: boolean;
  updatedStats: ExerciseStats;
}

interface BulkClassificationPayload {
  recordIds: string[];
  values: Array<{ columnKey: string; value: string | null }>;
}

interface BulkClassificationResult {
  updatedCount: number;
  errors: Array<{ recordId: string; errors: CellError[] }>;
  updatedStats: ExerciseStats;
}

interface RecordQueryParams {
  page: number;
  pageSize: number;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  filter?: 'all' | 'unclassified' | 'classified' | 'errors' | 'new';
  search?: string;
}

interface PaginatedRecords {
  records: EnrichmentRecord[];
  total: number;
  page: number;
  pageSize: number;
  stats: ExerciseStats;
}

interface ExerciseStats {
  totalRecords: number;
  classifiedRecords: number;
  unclassifiedRecords: number;
  errorCount: number;
  warningCount: number;
  newRecordCount: number;
  completionPercentage: number;
  columnStats: Array<{
    columnKey: string;
    label: string;
    filledCount: number;
    totalCount: number;
    percentage: number;
  }>;
}

// Admin types
interface AdminExerciseListItem extends ExerciseListItem {
  assignedUsers: AssignedUserSummary[];
  createdBy: string;
  createdAt: string;
}

interface AssignedUserSummary {
  id: string;
  name: string;
  email: string;
  role: 'editor' | 'viewer';
  classifiedCount: number;
  lastActiveAt: string | null;
}

interface ExerciseProgressDetail {
  exercise: AdminExerciseListItem;
  userProgress: UserProgress[];
}

interface UserProgress {
  user: AssignedUserSummary;
  assignedRecords: number;
  classifiedRecords: number;
  errorCount: number;
  lastActiveAt: string | null;
  completionPercentage: number;
}
```

### 1.5 Design System

Carried directly from the existing `index.css`. The "Industrial Precision" theme with forge color palette, amber/cyan accents, DM Sans / JetBrains Mono typography, 4px spacing grid, and sharp border radii. No changes needed -- copy the file.

### 1.6 Common Components

All carried from the existing codebase with no modifications needed for these screens: `Button`, `Card` (+ `CardHeader`, `CardTitle`, `CardDescription`), `Badge`, `Input`, `Select`, `MultiSelect`, `Modal`, `Tabs`, `ProgressBar`, `Tooltip`, `Spinner`, `EmptyState`, `Table`.

---

## 2. Business User Dashboard

Landing page for business users after login. Shows assigned exercises with progress.

**Page**: `BusinessDashboardPage.tsx`
**Route**: `/dashboard`
**Access**: `role === 'user'`

### 2.1 Layout

```
+------------------------------------------------------------------+
| TopBar: "My Assignments"                    [NotificationBell] [Avatar] |
+------------------------------------------------------------------+
| StatusSummaryBar                                                  |
| [3 Total]  [1 Needs Attention]  [2 In Progress]  [0 Complete]    |
+------------------------------------------------------------------+
| ExerciseCard                                                      |
| +--------------------------------------------------------------+ |
| | [Badge: Active]  [Badge: 12 New Records]          Due: Apr 15| |
| | Development Programming 2026                                  | |
| | Classify program registrations by sport and category          | |
| |                                                               | |
| | [ProgressBar: 267/342 (78%)]                                  | |
| | Column breakdown:                                             | |
| |   sportCategory: 95% | categorization: 80%                   | |
| |                                                               | |
| | Last active: 2 days ago          [Continue Classifying ->]    | |
| +--------------------------------------------------------------+ |
|                                                                   |
| ExerciseCard                                                      |
| +--------------------------------------------------------------+ |
| | [Badge: Active]  [Badge: NEW]                     Due: Mar 31| |
| | Draft Ranking Weights 2026                                    | |
| | Assign weights by tier, rank, and position                    | |
| |                                                               | |
| | [ProgressBar: 0/24 (0%)]                                      | |
| |                                                               | |
| | Not started                      [Start Classifying ->]       | |
| +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
```

### 2.2 Components

#### TopBar

```typescript
// components/layout/TopBar.tsx
interface TopBarProps {
  title: string;
  children?: React.ReactNode; // right-side slot
}
// Styling: h-14 bg-forge-900 border-b border-forge-700 px-6
//          flex items-center justify-between
// Title:   text-lg font-semibold text-forge-100 (DM Sans)
// Right:   flex items-center gap-3
```

#### NotificationBell

```typescript
// components/common/NotificationBell.tsx
// Carried from existing codebase
// Shows unread count badge (amber) when > 0
// Clicking opens notification dropdown
```

#### UserAvatar

```typescript
// components/common/UserAvatar.tsx
interface UserAvatarProps {
  user: { name: string; avatarUrl: string | null };
  size?: 'sm' | 'md';  // sm: w-8 h-8, md: w-10 h-10
}
// Renders avatar image or initials fallback
// bg-forge-700 text-forge-300 rounded-full font-medium
// Clicking opens dropdown: profile, theme toggle, logout
```

#### StatusSummaryBar

```typescript
// components/dashboard/StatusSummaryBar.tsx
interface StatusSummaryBarProps {
  exercises: ExerciseListItem[];
}
// Computes counts from exercises array:
//   total, needsAttention (hasNewRecords || errorCount > 0),
//   inProgress (classified > 0 && < total), complete (classified === total)
// Renders 4 stat pills in a horizontal row
// Styling: flex gap-3 px-6 py-3 bg-forge-950 border-b border-forge-800
// Each pill:
//   px-3 py-1.5 rounded-md bg-forge-850 border border-forge-750
//   text-xs font-medium text-forge-300
//   Count number: text-sm font-semibold text-forge-100
//   "Needs Attention" pill: border-amber-500/30 when count > 0
```

#### ExerciseCard

```typescript
// components/dashboard/ExerciseCard.tsx
interface ExerciseCardProps {
  exercise: ExerciseListItem;
}
// Uses the common Card component with hover and onClick -> navigate(/exercises/:id)
//
// Structure:
//   Header row (flex justify-between):
//     Left: Badge(status) + Badge("X New Records", variant="cyan") if hasNewRecords
//     Right: deadline text (text-forge-400 text-xs)
//             - if deadline within 7 days: text-amber-400
//             - if deadline past: text-status-error
//
//   Title: text-lg font-semibold text-forge-50 mt-2
//   Description: text-sm text-forge-400 mt-1 line-clamp-2
//
//   ProgressBar (mt-4):
//     variant="amber"
//     label="{classifiedRecords} of {totalRecords} ({percentage}%)"
//
//   Column breakdown (mt-2, only if exercise has columnStats):
//     flex gap-4, each: text-xs text-forge-400
//     "{columnLabel}: {percentage}%"
//     Percentage text color:
//       < 50%: text-forge-400
//       50-99%: text-amber-400
//       100%: text-status-clean
//
//   Footer row (flex justify-between items-center mt-4 pt-3 border-t border-forge-800):
//     Left: "Last active: {relative time}" or "Not started" (text-xs text-forge-500)
//     Right: Button variant="primary" size="sm"
//            Text: "Continue Classifying" if classifiedRecords > 0, else "Start Classifying"
//            Icon: ArrowRight (lucide-react)
//
// Card styling: padding="md" hover glow="amber"
// Entire card is clickable (navigates to exercise)
```

#### DeadlineIndicator

```typescript
// components/dashboard/DeadlineIndicator.tsx
interface DeadlineIndicatorProps {
  deadline: string | null;
}
// Returns null if no deadline
// Computes days remaining
// Renders: Calendar icon (lucide) + text
//   > 7 days: text-forge-400 "Due {formatted date}"
//   <= 7 days: text-amber-400 "Due in {n} days"
//   Past due: text-status-error "Overdue by {n} days"
```

### 2.3 React Query Hook

```typescript
// hooks/useExercises.ts
export function useMyExercises() {
  return useQuery({
    queryKey: ['my-exercises'],
    queryFn: fetchMyExercises,
    staleTime: 30_000, // 30s
  });
}
```

### 2.4 API Contract

```
GET /api/exercises
Authorization: Bearer <token>

Response 200:
{
  exercises: ExerciseListItem[]
}

// Server filters to only exercises assigned to the authenticated user
// Includes columnStats for each exercise (aggregated server-side)
// Sorted by: exercises with errors first, then by deadline ASC, then name ASC
```

### 2.5 Loading, Empty, and Error States

**Loading**: Render 3 skeleton `ExerciseCard` placeholders (pulsing `bg-forge-850` blocks matching the card layout -- title bar, progress bar, footer). No `StatusSummaryBar` while loading. Use the `Spinner` component inside each skeleton card area.

**Error**: Full-width error card with `text-status-error` icon (AlertTriangle), message "Failed to load exercises", and a `Button variant="secondary" size="sm"` labeled "Retry" that calls `refetch()`.

**Empty (zero exercises)**: `EmptyState` component centered on the page. Icon: `ClipboardList` (lucide). Heading: "No exercises assigned". Body: "Contact your administrator to get assigned to an enrichment exercise." No action button (business users cannot self-assign).

---

## 3. Enrichment Spreadsheet View

The core screen where business users classify records. Most complex of the three screens.

**Page**: `EnrichmentSpreadsheetPage.tsx`
**Route**: `/exercises/:exerciseId`
**Access**: `role === 'user'`, must be assigned to this exercise

### 3.1 Layout

```
+------------------------------------------------------------------------+
| TopBar: [<- Back] "Development Programming 2026"   [NotificationBell] [Avatar] |
+------------------------------------------------------------------------+
| SpreadsheetHeader                                                       |
| [ProgressBar: 267/342 (78%)]                                           |
| Quick Filters: [All (342)] [Unclassified (75)] [Classified (267)]      |
|                [Has Errors (3)] [New Records (12)]                      |
| [Search: _______________]                    [Bulk Edit] [Export CSV]   |
+------------------------------------------------------------------------+
| SpreadsheetGrid (AG Grid)                                              |
| +--------------------------------------------------------------------+ |
| |St| siteId | programId | programName          || sportCategory | cat| |
| |--+--------+-----------+----------------------++---------------+----| |
| |* | 22044  | 3998508   | 2023 Girls Baseball  || Girls Baseball| Gi.| |
| |  | 22044  | 4036238   | 2023 World Series    || [  v  ]       | [  | |
| |! | 22044  | 3998628   | 2023 BREAKTHROUGH    || Softball      | Bo.| |
| |N | 22044  | 4100123   | 2024 MLB TOUR        || [  v  ]       | [  | |
| +--------------------------------------------------------------------+ |
+------------------------------------------------------------------------+
| SpreadsheetFooter                                                       |
| Showing 1-50 of 342 records        [< Prev] Page 1 of 7 [Next >]      |
+------------------------------------------------------------------------+
```

Key: `St` = status column. `*` = classified, blank = unclassified, `!` = has error, `N` = new record. `||` = visual separator between source and classification columns.

### 3.2 Zustand Store

```typescript
// stores/spreadsheetStore.ts
interface SpreadsheetState {
  // Query state
  activeFilter: 'all' | 'unclassified' | 'classified' | 'errors' | 'new';
  searchQuery: string;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  page: number;
  pageSize: number;

  // Selection state
  selectedRecordIds: Set<string>;

  // Bulk edit state
  bulkEditOpen: boolean;

  // Pending saves (optimistic updates waiting for server confirmation)
  pendingSaves: Map<string, ClassificationPayload>; // recordId -> payload

  // Actions
  setFilter: (filter: SpreadsheetState['activeFilter']) => void;
  setSearch: (query: string) => void;
  setSort: (column: string, direction: 'asc' | 'desc') => void;
  setPage: (page: number) => void;
  toggleRecordSelection: (recordId: string) => void;
  selectAllRecords: (recordIds: string[]) => void;
  clearSelection: () => void;
  setBulkEditOpen: (open: boolean) => void;
  addPendingSave: (recordId: string, payload: ClassificationPayload) => void;
  removePendingSave: (recordId: string) => void;
  reset: () => void;
}
```

### 3.3 AG Grid Configuration

#### EnrichmentGrid Component

```typescript
// components/grid/EnrichmentGrid.tsx
interface EnrichmentGridProps {
  exercise: ExerciseDetail;
  records: EnrichmentRecord[];
  stats: ExerciseStats;
  onClassify: (recordId: string, values: ClassificationPayload) => void;
  onSelectionChanged: (selectedIds: string[]) => void;
  selectedIds: Set<string>;
}
```

#### Column Definitions

```typescript
function buildColumnDefs(exercise: ExerciseDetail): ColDef[] {
  const cols: ColDef[] = [];

  // 1. Checkbox selection column
  // Note: With AG Grid 31+, selection is configured via gridOptions.rowSelection object.
  // The checkbox column is auto-generated by the grid when using rowSelection config.
  // No explicit checkbox column def needed.

  // 2. Row status column (pinned left)
  cols.push({
    headerName: '',
    field: '__status',
    width: 44,
    pinned: 'left',
    cellRenderer: 'rowStatusRenderer',
    suppressMovable: true,
    lockPosition: true,
  });

  // 3. Source columns (read-only)
  for (const col of exercise.sourceColumns.filter(c => c.visible)) {
    cols.push({
      headerName: col.label,
      field: `sourceData.${col.key}`,
      editable: false,
      sortable: true,
      filter: true,
      resizable: true,
      cellClass: 'source-cell',
      headerClass: 'source-header',
      headerComponent: 'sourceColumnHeader',
      headerComponentParams: { column: col },
    });
  }

  // 4. Visual separator column
  cols.push({
    headerName: '',
    width: 4,
    suppressMovable: true,
    lockPosition: true,
    cellClass: 'separator-cell',
    headerClass: 'separator-header',
    resizable: false,
    sortable: false,
    filter: false,
  });

  // 5. Classification columns (editable)
  for (const col of exercise.classificationColumns.filter(c => c.visible)) {
    const colDef: ColDef = {
      headerName: col.label,
      field: `classifications.${col.key}`,
      editable: col.columnRole === 'classification',
      sortable: true,
      filter: true,
      resizable: true,
      cellClass: 'classification-cell',
      headerClass: 'classification-header',
      headerComponent: 'classificationColumnHeader',
      headerComponentParams: { column: col },
    };

    // Cell editor based on data type
    switch (col.dataType) {
      case 'picklist':
        colDef.cellEditor = 'dependentPicklistEditor';
        colDef.cellEditorParams = { column: col };
        colDef.cellEditorPopup = true;
        break;
      case 'multi_select':
        colDef.cellEditor = 'multiSelectEditor';
        colDef.cellEditorParams = { column: col };
        colDef.cellEditorPopup = true;
        break;
      case 'number':
        colDef.cellEditor = 'agNumberCellEditor';
        colDef.cellEditorParams = {
          min: col.config.minValue,
          max: col.config.maxValue,
        };
        break;
      case 'date':
        colDef.cellEditor = 'dateCellEditor';
        colDef.cellEditorParams = { column: col };
        colDef.cellEditorPopup = true;
        break;
      case 'boolean':
        colDef.cellEditor = 'booleanCellEditor';
        colDef.cellRenderer = 'booleanCellRenderer';
        break;
      case 'text':
      default:
        colDef.cellEditor = 'agTextCellEditor';
        break;
    }

    colDef.cellRenderer = 'validationCellRenderer';
    colDef.cellRendererParams = { column: col };

    cols.push(colDef);
  }

  return cols;
}
```

#### Grid Options

```typescript
const gridOptions: GridOptions = {
  rowHeight: 32,
  headerHeight: 36,
  rowSelection: {
    mode: 'multiRow',
    headerCheckbox: true,
    checkboxes: true,
    enableClickSelection: false,
  },
  enableCellChangeFlash: true,
  animateRows: true,
  pagination: false,  // server-side pagination via SpreadsheetFooter
  domLayout: 'normal',
  stopEditingWhenCellsLoseFocus: true,

  rowClassRules: {
    'row-new': (params) => params.data?.recordState === 'new',
    'row-changed': (params) => params.data?.recordState === 'changed',
    'row-error': (params) => params.data?.validationErrors?.length > 0,
    'row-classified': (params) => params.data?.isFullyClassified,
  },

  onCellValueChanged: (event: CellValueChangedEvent) => {
    const record = event.data as EnrichmentRecord;
    const field = event.colDef.field as string; // e.g., "classifications.sportCategory"
    const columnKey = field.replace('classifications.', '');
    const column = exercise.classificationColumns.find((c) => c.key === columnKey);
    if (!column) return;

    // Run client-side validation immediately for instant feedback
    const errors = validateCell(event.newValue, column, record);
    // Update local validation state on the row (AG Grid refreshCells handles re-render)

    // Trigger debounced auto-save
    debouncedSave(record.id, { values: [{ columnKey, value: event.newValue }] });
  },

  // Tab key skips source columns and separator, moves only between editable classification cells
  tabToNextCell: (params) => {
    const { nextCellPosition, backwards } = params;
    if (!nextCellPosition) return null;

    const colDef = nextCellPosition.column.getColDef();
    const cellClass = colDef.cellClass;
    const isEditable = cellClass === 'classification-cell' && colDef.editable;

    if (isEditable) return nextCellPosition;

    // Skip non-editable cells by recursing (AG Grid handles this via returning next position)
    return null; // AG Grid will continue to the next cell automatically
  },
};
```

#### CSS Classes

```css
/* Source columns (read-only) */
.source-cell { background-color: var(--color-forge-900); color: var(--color-forge-400); }
.source-header { background-color: var(--color-forge-900); color: var(--color-forge-400); }

/* Classification columns (editable) */
.classification-cell { background-color: var(--color-forge-950); color: var(--color-forge-50); }
.classification-header { background-color: var(--color-forge-900); border-bottom: 2px solid var(--color-amber-500); }

/* Separator */
.separator-cell { background-color: var(--color-forge-700); }

/* Row states */
.row-new { background-color: rgba(8, 145, 178, 0.08); }
.row-changed { background-color: rgba(234, 179, 8, 0.06); }
.row-error .classification-cell { border-left: 2px solid var(--color-status-error); }
.row-classified { border-left: 2px solid var(--color-status-clean); }
```

### 3.4 Custom Cell Renderers and Editors

#### RowStatusRenderer

```typescript
// components/grid/RowStatusRenderer.tsx
// Renders a small icon in the pinned-left status column:
//   new:        cyan dot + "N" tooltip "New record"
//   existing + classified: green check
//   existing + unclassified: empty (subtle dash)
//   changed:    amber triangle + tooltip "Source data changed since last classification"
//   error:      red circle-x + tooltip showing error count
// Size: 16x16 icon centered in 44px cell
```

#### SourceColumnHeader

```typescript
// components/grid/SourceColumnHeader.tsx
interface SourceColumnHeaderProps {
  column: ExerciseColumn;
  displayName: string;
}
// Renders: Lock icon (12px, text-forge-500) + column label
// Tooltip on hover: column.description
// Styling: text-forge-400 text-xs font-medium uppercase tracking-wide
```

#### ClassificationColumnHeader

```typescript
// components/grid/ClassificationColumnHeader.tsx
interface ClassificationColumnHeaderProps {
  column: ExerciseColumn;
  displayName: string;
}
// Renders: column label + required badge (if required)
// Required badge: Badge variant="amber" size dot, text "*"
// Data type icon: small icon (12px) indicating picklist/number/date/text
// Tooltip on hover: column.description + data type + validation rules summary
// Styling: text-forge-50 text-xs font-semibold, amber-500 bottom border (2px)
```

#### ValidationCellRenderer

```typescript
// components/grid/ValidationCellRenderer.tsx
interface ValidationCellRendererProps {
  value: string | null;
  column: ExerciseColumn;
  data: EnrichmentRecord;
}
// Checks data.validationErrors for errors matching this column
// If no errors: render value as plain text
// If errors:
//   - Red border on cell (ring-1 ring-status-error)
//   - Small error icon (AlertTriangle, 12px) at right edge of cell
//   - On hover: CellErrorPopover shows error messages
// If value is null and column is required:
//   - Subtle placeholder text: "Select..." or "Enter..." in text-forge-600
```

#### CellErrorPopover

```typescript
// components/grid/CellErrorPopover.tsx
// Carried from existing codebase
// Positioned popover showing validation error messages for a cell
// Styling: bg-forge-800 border border-status-error/30 rounded-md p-2 shadow-lg
// Each error: flex gap-2, AlertTriangle icon (status-error), message text (text-sm)
// Warnings: same but with amber icon
```

#### DependentPicklistEditor

```typescript
// components/grid/DependentPicklistEditor.tsx
// The key new component -- the dependent dropdown

interface DependentPicklistEditorProps {
  column: ExerciseColumn;
  value: string | null;
  data: EnrichmentRecord;  // full record, to read parent column value
  onValueChange: (value: string | null) => void;
  stopEditing: () => void;
}

// Behavior:
// 1. On open, check if column has dependentConfig
// 2. If yes: read parent column value from data.classifications[parentColumnKey]
//    - If parent has value: fetch filtered options from reference table
//      GET /api/reference-tables/:id/values?parentColumn=:col&parentValue=:val&childColumn=:col
//    - If parent has no value: show message "Select {parentColumnLabel} first"
//    - Cache resolved options in React Query (keyed by parentValue)
// 3. If no dependentConfig: use column.config.picklistValues directly
//
// UI:
//   Popup dropdown (cellEditorPopup: true)
//   Search input at top: Input size="sm" placeholder="Search..."
//   Filtered options list: max-h-60 overflow-y-auto
//   Each option: px-3 py-1.5 text-sm hover:bg-forge-800 cursor-pointer
//   Selected option: bg-amber-600/10 text-amber-400
//   Clear button at bottom if value is set and column is not required
//   Keyboard: ArrowUp/Down to navigate, Enter to select, Escape to close
//
// Styling:
//   Container: bg-forge-850 border border-forge-700 rounded-md shadow-xl
//              min-w-[200px] max-w-[320px]
//   Search: sticky top-0, border-b border-forge-700
//   Focus ring: ring-amber-500/40
```

#### MultiSelectEditor

```typescript
// components/grid/MultiSelectEditor.tsx
// Similar to DependentPicklistEditor but with checkboxes
// Shows checked state per option
// Renders selected values as comma-separated in the cell
// "Select All" / "Clear All" actions at top
```

#### DateCellEditor

```typescript
// components/grid/DateCellEditor.tsx
// Wraps the common DatePicker component
// Popup calendar, respects min/max date from column.config
```

#### BooleanCellRenderer / BooleanCellEditor

```typescript
// components/grid/BooleanCellRenderer.tsx
// Renders a toggle switch (carried from Toggle component)
// Click toggles value and triggers auto-save
```

### 3.5 React Query Hooks

```typescript
// hooks/useExerciseRecords.ts
export function useExerciseRecords(exerciseId: string) {
  const { page, pageSize, activeFilter, searchQuery, sortColumn, sortDirection } =
    useSpreadsheetStore();

  const queryParams: RecordQueryParams = {
    page,
    pageSize,
    filter: activeFilter,
    search: searchQuery,
    sortColumn: sortColumn ?? undefined,
    sortDirection,
  };

  return useQuery({
    queryKey: ['records', exerciseId, queryParams],
    queryFn: () => fetchExerciseRecords(exerciseId, queryParams),
    placeholderData: keepPreviousData, // keep stale data visible during page transitions
    staleTime: 10_000,
  });
}

// Helper to build partial query key for optimistic updates
function recordsKeyPrefix(exerciseId: string) {
  return ['records', exerciseId];
}
```

### 3.6 Auto-Save System

```typescript
// hooks/useAutoSave.ts
export function useAutoSave(exerciseId: string) {
  const queryClient = useQueryClient();
  const { addPendingSave, removePendingSave } = useSpreadsheetStore();

  const mutation = useMutation({
    mutationFn: (args: { recordId: string; values: ClassificationPayload }) =>
      classifyRecord(exerciseId, args.recordId, args.values),
    onMutate: async ({ recordId, values }) => {
      // Optimistic update: update the record in the React Query cache
      // Use partial key match since the full key includes pagination/filter params
      addPendingSave(recordId, values);
      await queryClient.cancelQueries({ queryKey: ['records', exerciseId] });

      const updateRecords = (old: PaginatedRecords | undefined) => {
        if (!old) return old;
        return {
          ...old,
          records: old.records.map((r) =>
            r.id === recordId
              ? {
                  ...r,
                  classifications: {
                    ...r.classifications,
                    ...Object.fromEntries(
                      values.values.map((v) => [v.columnKey, v.value])
                    ),
                  },
                }
              : r
          ),
        };
      };

      // setQueriesData matches all queries starting with ['records', exerciseId]
      queryClient.setQueriesData<PaginatedRecords>(
        { queryKey: ['records', exerciseId] },
        updateRecords
      );
    },
    onSuccess: (result, { recordId }) => {
      removePendingSave(recordId);
      // Server returns updated validation errors -- merge into cache
      queryClient.setQueriesData<PaginatedRecords>(
        { queryKey: ['records', exerciseId] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            records: old.records.map((r) =>
              r.id === recordId
                ? {
                    ...r,
                    validationErrors: result.validationErrors,
                    isFullyClassified: result.isFullyClassified,
                  }
                : r
            ),
            stats: result.updatedStats,
          };
        }
      );
    },
    onError: (err, { recordId }) => {
      removePendingSave(recordId);
      queryClient.invalidateQueries({ queryKey: ['records', exerciseId] });
      toast.error('Failed to save classification. Retrying...');
    },
  });

  // Debounce: 300ms after last keystroke
  // Use useRef to keep a stable reference to mutate, avoiding debounce re-creation
  const mutateRef = useRef(mutation.mutate);
  mutateRef.current = mutation.mutate;

  const debouncedSave = useMemo(
    () =>
      debounce((recordId: string, values: ClassificationPayload) => {
        mutateRef.current({ recordId, values });
      }, 300),
    [] // stable -- never re-created
  );

  // Cleanup on unmount
  useEffect(() => () => debouncedSave.cancel(), [debouncedSave]);

  return { save: debouncedSave, isPending: mutation.isPending };
}
```

### 3.7 Dependent Dropdown Resolution

```typescript
// hooks/useDependentOptions.ts
export function useDependentOptions(
  column: ExerciseColumn,
  parentValue: string | null
) {
  const hasDependency = !!column.dependentConfig;
  const enabled = hasDependency && parentValue !== null;

  return useQuery({
    queryKey: [
      'dependent-options',
      column.dependentConfig?.referenceTableId,
      column.dependentConfig?.parentReferenceColumn,
      parentValue,
      column.dependentConfig?.childReferenceColumn,
    ],
    queryFn: () =>
      fetchReferenceTableValues(
        column.dependentConfig!.referenceTableId,
        {
          filterColumn: column.dependentConfig!.parentReferenceColumn,
          filterValue: parentValue!,
          valueColumn: column.dependentConfig!.childReferenceColumn,
        }
      ),
    enabled,
    staleTime: 5 * 60_000, // 5 min cache -- reference data changes infrequently
  });
}
```

### 3.8 SpreadsheetHeader

```typescript
// components/grid/SpreadsheetHeader.tsx
type QuickFilter = 'all' | 'unclassified' | 'classified' | 'errors' | 'new';

interface SpreadsheetHeaderProps {
  exercise: ExerciseDetail;
  stats: ExerciseStats;
  activeFilter: QuickFilter;
  searchQuery: string;
  selectedCount: number;
  onFilterChange: (filter: QuickFilter) => void;
  onSearchChange: (query: string) => void;
  onBulkEdit: () => void;
  onExportCsv: () => void;
}

// Structure:
//   Row 1: ProgressBar (full width)
//     variant="amber"
//     label="267 of 342 records classified (78%)"
//     Below: column-level stats as small text pills
//       Each: "{label}: {pct}%" with color coding (forge-400 / amber-400 / status-clean)
//
//   Row 2: flex justify-between items-center
//     Left: QuickFilterBar
//     Right: flex gap-2
//       Input (search, icon=Search, size="sm", w-64)
//       Button (variant="secondary", size="sm", disabled if selectedCount === 0)
//         "Bulk Edit ({selectedCount})"
//       Button (variant="ghost", size="sm", icon=Download)
//         "Export CSV"
//
// Styling: px-6 py-3 bg-forge-900 border-b border-forge-800 space-y-3
```

#### QuickFilterBar

```typescript
// components/grid/QuickFilterBar.tsx
interface QuickFilterBarProps {
  activeFilter: QuickFilter;
  counts: {
    all: number;
    unclassified: number;
    classified: number;
    errors: number;
    new: number;
  };
  onChange: (filter: QuickFilter) => void;
}

// Renders a row of filter pills
// Each pill:
//   Inactive: bg-forge-850 text-forge-400 border border-forge-750
//   Active: bg-amber-600/10 text-amber-400 border border-amber-500/30
//   Count in parentheses: text-forge-500 (inactive) or text-amber-300 (active)
// "Has Errors" pill: uses status-error color when active and count > 0
// "New Records" pill: uses cyan color when active and count > 0
// Styling: flex gap-2, each pill: px-3 py-1 rounded-full text-xs font-medium cursor-pointer
```

### 3.9 BulkEditPanel

```typescript
// components/grid/BulkEditPanel.tsx
interface BulkEditPanelProps {
  exercise: ExerciseDetail;
  selectedRecordIds: Set<string>;
  records: EnrichmentRecord[];
  onApply: (payload: BulkClassificationPayload) => void;
  onClose: () => void;
}

// Modal (size="md") that opens when "Bulk Edit" is clicked
// Title: "Apply to {n} selected records"
//
// Body: list of classification columns, each as a form row:
//   Label + Select/Input depending on data type
//   Only columns with values set will be applied
//   Each field has a checkbox: "Apply this field" (unchecked by default)
//   Dependent dropdowns work the same as in the grid
//
// Footer:
//   Left: text-xs text-forge-400 "Only checked fields will be updated"
//   Right: Button variant="ghost" "Cancel" + Button variant="primary" "Apply to {n} Records"
//
// On apply: confirmation if > 50 records
// After apply: close modal, clear selection, show toast "{n} records updated"
```

### 3.10 SpreadsheetFooter

```typescript
// components/grid/SpreadsheetFooter.tsx
interface SpreadsheetFooterProps {
  page: number;
  pageSize: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
}

// Renders: "Showing {start}-{end} of {total} records"
// Pagination: [< Prev] Page {n} of {totalPages} [Next >]
// Styling: px-6 py-2 bg-forge-900 border-t border-forge-800
//          flex items-center justify-between text-xs text-forge-400
// Buttons: Button variant="ghost" size="sm"
```

### 3.11 Client-Side Validation

```typescript
// services/validation.ts
export function validateCell(
  value: string | null,
  column: ExerciseColumn,
  record: EnrichmentRecord
): CellError[] {
  const errors: CellError[] = [];

  // Required check
  if (column.required && (value === null || value === '')) {
    errors.push({
      columnKey: column.key,
      severity: 'error',
      message: `${column.label} is required`,
      ruleType: 'required',
    });
  }

  if (value === null || value === '') return errors;

  // Type-specific checks
  switch (column.dataType) {
    case 'number': {
      const num = parseFloat(value);
      if (isNaN(num)) {
        errors.push({
          columnKey: column.key,
          severity: 'error',
          message: 'Must be a number',
          ruleType: 'type',
        });
      } else {
        if (column.config.minValue !== undefined && num < column.config.minValue)
          errors.push({
            columnKey: column.key,
            severity: 'error',
            message: `Minimum value is ${column.config.minValue}`,
            ruleType: 'range',
          });
        if (column.config.maxValue !== undefined && num > column.config.maxValue)
          errors.push({
            columnKey: column.key,
            severity: 'error',
            message: `Maximum value is ${column.config.maxValue}`,
            ruleType: 'range',
          });
      }
      break;
    }
    case 'picklist': {
      if (column.config.picklistValues && !column.config.picklistValues.includes(value)) {
        errors.push({
          columnKey: column.key,
          severity: 'error',
          message: `"${value}" is not a valid option`,
          ruleType: 'enum',
        });
      }
      break;
    }
    case 'text': {
      if (column.config.regexPattern && !new RegExp(column.config.regexPattern).test(value))
        errors.push({
          columnKey: column.key,
          severity: 'error',
          message:
            column.validationRules.find((r) => r.type === 'regex')?.message ||
            'Invalid format',
          ruleType: 'regex',
        });
      break;
    }
  }

  return errors;
}
```

### 3.12 API Contracts

```
GET /api/exercises/:id
Authorization: Bearer <token>
Response 200: ExerciseDetail

GET /api/exercises/:id/records?page=1&pageSize=50&filter=all&search=&sortColumn=&sortDirection=asc
Authorization: Bearer <token>
Response 200: PaginatedRecords

PUT /api/exercises/:id/records/:recordId/classify
Authorization: Bearer <token>
Body: ClassificationPayload
Response 200: ClassificationResult

POST /api/exercises/:id/records/bulk-classify
Authorization: Bearer <token>
Body: BulkClassificationPayload
Response 200: BulkClassificationResult

GET /api/reference-tables/:id/values?filterColumn=sport&filterValue=Girls+Baseball&valueColumn=categorization
Authorization: Bearer <token>
Response 200: {
  values: string[];
}

GET /api/exercises/:id/records/export?filter=all
Authorization: Bearer <token>
Response 200: text/csv
// Server-side CSV export of all records (respects current filter)
// Columns: all visible source columns + all classification columns
// Includes a "status" column (new/existing/changed/classified/unclassified)
```

### 3.13 Loading, Empty, and Error States

**Page loading** (exercise detail fetch): Full-page `Spinner` centered below `TopBar`. `TopBar` shows back button but no exercise name until loaded.

**Records loading** (records fetch while exercise is loaded): Show the `SpreadsheetHeader` with exercise info immediately. Grid area shows a skeleton shimmer (6 rows of `bg-forge-850` pulsing blocks matching the column layout).

**Records empty** (exercise has zero records): `EmptyState` in the grid area. Icon: `Database` (lucide). Heading: "No records yet". Body: "Source data has not been loaded. Contact your administrator."

**Records error**: Inline error banner above the grid. `bg-status-error/10 border border-status-error/30 rounded-md p-3`. AlertTriangle icon + message + "Retry" button.

**Auto-save error** (single cell save fails): `toast.error('Failed to save. Retrying...')`. The system retries once automatically (built into React Query mutation `retry: 1`). If retry fails, cell shows a subtle amber border indicating unsaved state. The `pendingSaves` map in the store tracks these.

### 3.14 Computed Columns

Columns with `columnRole: 'computed'` are rendered as read-only classification columns (same styling as source columns but positioned on the right side with classification columns). They display values computed server-side (e.g., rollup lookups). When a parent classification value changes, the server returns updated computed values in the `ClassificationResult`. Implementation of the computation engine itself is out of scope for this spec -- it is handled server-side.

---

## 4. Admin Dashboard

The admin's overview of all exercises, assigned users, and progress with drill-down capability.

**Page**: `AdminDashboardPage.tsx`
**Route**: `/admin`
**Access**: `role === 'admin'`

### 4.1 Layout

```
+------------------------------------------------------------------------+
| TopBar: "Admin Dashboard"                       [NotificationBell] [Avatar] |
+------------------------------------------------------------------------+
| AdminStatsBar                                                           |
| [12 Total Exercises] [3 Active] [1 At Risk] [847 Records Classified]   |
+------------------------------------------------------------------------+
| Tabs: [Active Exercises] [Completed] [Drafts] [Archived]               |
+------------------------------------------------------------------------+
| ExerciseTable                                                           |
| +--------------------------------------------------------------------+ |
| | Name              | Assigned | Progress | Errors | Deadline | St   | |
| +-------------------+----------+----------+--------+----------+------+ |
| | Dev Programming   | Sarah,+1 | #### 78% |   3    | Apr 15   | On.. | |
| | Draft Weights     | Dave     | .... 0%  |   0    | Mar 31   | At.. | |
| | Scouting Events   | 3 users  | ##.. 45% |   1    | May 01   | On.. | |
| +--------------------------------------------------------------------+ |
+------------------------------------------------------------------------+

-- When a row is clicked, ExerciseProgressDrawer slides in from right --

+----------------------------------------------+-------------------------+
| ExerciseTable (narrowed)                     | ExerciseProgressDrawer  |
|                                              | "Dev Programming 2026"  |
|                                              | 267/342 (78%)           |
|                                              |                         |
|                                              | User Progress:          |
|                                              | +---------------------+ |
|                                              | | Sarah               | |
|                                              | | 180/200 (90%)       | |
|                                              | | Last active: 2d ago | |
|                                              | | [Send Reminder]     | |
|                                              | +---------------------+ |
|                                              | | Mike                | |
|                                              | | 87/142 (61%)        | |
|                                              | | Last active: 5d ago | |
|                                              | | [Send Reminder]     | |
|                                              | +---------------------+ |
|                                              |                         |
|                                              | [Export Progress CSV]    |
|                                              | [View Audit Log]        |
+----------------------------------------------+-------------------------+
```

### 4.2 Components

#### AdminStatsBar

```typescript
// components/dashboard/AdminStatsBar.tsx
interface AdminStatsBarProps {
  exercises: AdminExerciseListItem[];
}

// Computes aggregate stats from exercises array:
//   totalExercises: exercises.length
//   activeCount: exercises.filter(e => e.status === 'active').length
//   atRiskCount: exercises with deadline within 7 days AND completionPercentage < 90%
//               OR exercises with any user who has lastActiveAt > 7 days ago
//   totalClassified: sum of all classifiedRecords across exercises
//
// Renders 4 stat cards in a row
// Each card:
//   Card padding="sm" (no hover, no glow)
//   Top: label text-xs text-forge-400 uppercase tracking-wide
//   Bottom: value text-2xl font-semibold text-forge-50
//   "At Risk" card: value in text-amber-400 if count > 0, border-amber-500/30
//
// Styling: grid grid-cols-4 gap-4 px-6 py-4
```

#### ExerciseTable

```typescript
// components/dashboard/ExerciseTable.tsx
interface ExerciseTableProps {
  exercises: AdminExerciseListItem[];
  activeTab: 'active' | 'completed' | 'draft' | 'archived';
  onTabChange: (tab: string) => void;
  selectedExerciseId: string | null;
  onSelectExercise: (id: string | null) => void;
}

// Tabs filter exercises by status
// Tab counts shown as badges: [Active (3)] [Completed (2)] [Drafts (1)] [Archived (6)]
// Uses the common Tabs component
//
// Tab -> filter logic:
//   "Active":    status === 'active' AND NOT fully classified
//   "Completed": status === 'active' AND classifiedRecords === totalRecords AND errorCount === 0
//   "Drafts":    status === 'draft'
//   "Archived":  status === 'archived'
// Note: "Completed" is a derived display state, not a database status
//
// Table columns:
//   Name:       exercise name + description (truncated), click selects row
//   Assigned:   UserAvatarStack + count if > 3
//   Progress:   inline progress bar (thin, 4px height) + percentage text
//   Errors:     Badge variant="error" if > 0, else text-forge-500 "0"
//   Deadline:   DeadlineIndicator component
//   Status:     StatusBadge
//
// Table row styling:
//   Default: hover:bg-forge-850 cursor-pointer
//   Selected: bg-forge-850 border-l-2 border-amber-500
//   At risk: subtle left border border-l-2 border-amber-500/40
//
// Sort: clickable column headers, default sort by status priority then deadline
// Uses the common Table component
```

#### StatusBadge

```typescript
// components/dashboard/StatusBadge.tsx
interface StatusBadgeProps {
  exercise: AdminExerciseListItem;
}

// Derives a display status from exercise data:
//   "Complete"      -> Badge variant="clean"      (all records classified, 0 errors)
//   "On Track"      -> Badge variant="default"    (progress > 0, deadline > 7 days or no deadline)
//   "At Risk"       -> Badge variant="warning"    (deadline within 7 days and < 90% complete)
//   "Overdue"       -> Badge variant="error"      (deadline past and < 100% complete)
//   "Not Started"   -> Badge variant="outline"    (0% progress)
//   "Paused"        -> Badge variant="outline"    (status === 'paused')
```

#### UserAvatarStack

```typescript
// components/dashboard/UserAvatarStack.tsx
interface UserAvatarStackProps {
  users: AssignedUserSummary[];
  maxVisible?: number; // default 3
}

// Renders overlapping avatar circles (negative margin: -ml-2 on each after first)
// If users.length > maxVisible: show "+{n}" circle at the end
// Each avatar: w-7 h-7 rounded-full border-2 border-forge-900
// "+n" circle: bg-forge-700 text-forge-300 text-xs font-medium
// Tooltip on hover over stack: lists all user names
```

#### ExerciseProgressDrawer

```typescript
// components/dashboard/ExerciseProgressDrawer.tsx
interface ExerciseProgressDrawerProps {
  exerciseId: string;
  onClose: () => void;
}

// Slides in from the right side of the screen
// Width: w-96 (384px)
// Animation: translate-x-full -> translate-x-0, 200ms ease-out
// Background: bg-forge-900 border-l border-forge-700
// Full height below TopBar
//
// Uses: useExerciseProgress(exerciseId)
//
// Structure:
//
// Header:
//   flex justify-between items-center px-5 py-4 border-b border-forge-800
//   Exercise name: text-lg font-semibold text-forge-50
//   Close button: Button variant="ghost" size="sm" icon=X
//
// Stats section (px-5 py-4):
//   ProgressBar variant="amber" label="267 of 342 (78%)"
//   Below: grid grid-cols-3 gap-3 mt-3
//     Stat: "Classified" -> 267 (text-status-clean)
//     Stat: "Remaining"  -> 75  (text-forge-400)
//     Stat: "Errors"     -> 3   (text-status-error if > 0)
//   Deadline line: DeadlineIndicator
//   Last refreshed: text-xs text-forge-500 "Source data refreshed 2 hours ago"
//
// User Progress section (px-5 py-4 border-t border-forge-800):
//   Section title: text-sm font-semibold text-forge-200 uppercase tracking-wide
//   List of UserProgressCard components
//
// Actions section (px-5 py-4 border-t border-forge-800 mt-auto):
//   Button variant="secondary" size="sm" icon=Download "Export Progress CSV" (full width)
//   Button variant="ghost" size="sm" icon=FileText "View Audit Log" (full width, mt-2)
```

#### UserProgressCard

```typescript
// components/dashboard/UserProgressCard.tsx
interface UserProgressCardProps {
  progress: UserProgress;
  onSendReminder: (userId: string) => void;
}

// Card-like row for each assigned user
// Styling: bg-forge-850 rounded-md p-3 mb-2
//
// Row 1: flex justify-between items-center
//   Left: flex items-center gap-2
//     UserAvatar size="sm"
//     div:
//       Name: text-sm font-medium text-forge-100
//       Email: text-xs text-forge-500
//   Right: Role badge (Badge variant="outline" size small) "editor" or "viewer"
//
// Row 2: mt-2
//   ProgressBar variant="amber" size thin (h-1.5)
//   Below bar: flex justify-between text-xs
//     Left: "{classified}/{assigned} ({pct}%)" text-forge-300
//     Right: last active relative time text-forge-500
//            If never active: text-amber-400 "Never logged in"
//            If > 7 days: text-amber-400 "{n} days inactive"
//
// Row 3 (conditional): mt-2, only shown if user is behind
//   Button variant="ghost" size="sm" icon=Send "Send Reminder"
//   "Behind" = completion % is below exercise average OR last active > 5 days
//   On click: calls sendReminder mutation, shows toast "Reminder sent to {name}"
```

#### ExerciseProgressDrawer Loading and Error States

**Loading**: Drawer opens immediately with the header (exercise name from the table row data). Body shows a centered `Spinner` component.

**Error**: Inline error message in the drawer body. "Failed to load progress details." with a "Retry" `Button variant="ghost" size="sm"`.

**Empty users** (exercise has no assigned users): UserProgress section shows `EmptyState` with message "No users assigned to this exercise."

### 4.3 React Query Hooks

```typescript
// hooks/useAdmin.ts
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

### 4.4 API Contracts

```
GET /api/admin/exercises
Authorization: Bearer <token> (admin only)
Response 200: {
  exercises: AdminExerciseListItem[]
}
// Returns ALL exercises across the org with assigned user summaries
// Each exercise includes aggregated stats + assignedUsers array

GET /api/admin/exercises/:id/progress
Authorization: Bearer <token> (admin only)
Response 200: ExerciseProgressDetail
// Returns per-user progress breakdown

POST /api/admin/exercises/:id/remind/:userId
Authorization: Bearer <token> (admin only)
Body: {} (empty)
Response 200: { sent: true }
// Sends email + in-app notification to the user
// Rate limited: max 1 reminder per user per exercise per 24 hours
// Returns 429 if rate limited

GET /api/admin/exercises/:id/progress/export
Authorization: Bearer <token> (admin only)
Response 200: text/csv
// Columns: user_name, user_email, role, assigned_records, classified_records,
//          error_count, completion_percentage, last_active_at
```
