# Schema Editor Grid Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Columns, Assignments, and Permissions tabs on the Exercise Edit page with a single AG Grid-based schema editor that lets admins manage columns, preview data, and assign rows to users.

**Architecture:** New `SchemaEditorGrid` component with custom column headers, context menu for row assignment, and a slide-out `ColumnConfigPanel` for column CRUD. Three new backend endpoints (single-column add, column reorder, batch permissions). Existing cell editors and assignment hooks reused.

**Tech Stack:** React 19, TypeScript, AG Grid 33, React Query 5, Tailwind CSS 4, Radix UI, Express 5, Drizzle ORM

**Spec:** `docs/superpowers/specs/2026-03-12-schema-editor-grid-design.md`

---

## File Map

### New Files

| File | Responsibility |
|------|---------------|
| `client/src/components/exercise-edit/SchemaEditorGrid.tsx` | Main grid component with toolbar, AG Grid, context menu integration |
| `client/src/components/exercise-edit/ColumnConfigPanel.tsx` | Slide-out panel for add/edit column with reference table linking |
| `client/src/components/exercise-edit/SchemaColumnHeader.tsx` | Custom AG Grid header with type badge, click-to-edit |
| `client/src/components/exercise-edit/AssignmentContextMenu.tsx` | Right-click menu for assign/unassign rows |
| `client/src/components/exercise-edit/AssignmentColorBar.tsx` | Cell renderer for assignment indicator dots |
| `client/src/components/exercise-edit/AssignmentSummaryDropdown.tsx` | Toolbar dropdown for user management |
| `client/src/components/exercise-edit/schema-editor-utils.ts` | Pure utility functions: buildSchemaColumnDefs, buildAssignmentColorMap, user color palette |

### Modified Files

| File | Changes |
|------|---------|
| `shared/src/types/assignment.ts` | Add `BatchPermissionsResponse`, `AddColumnRequest` types |
| `server/src/routes/exercises.ts` | Add 3 new endpoints: POST columns/add, PUT columns/reorder, GET assignments/permissions |
| `client/src/api/exercise-edit.ts` | Add `addColumn`, `reorderColumns`, `fetchBatchPermissions`, `fetchRecords` functions |
| `client/src/hooks/useExerciseEdit.ts` | Add `useAddColumn`, `useReorderColumns`, `useBatchPermissions`, `useExerciseRecords` hooks |
| `client/src/pages/ExerciseEditPage.tsx` | Replace 5 tabs with 3 (General, Data Source, Data & Assignments) |

---

## Chunk 0: Shared Types and Backend Endpoints

### Task 1: Add shared types for schema editor

**Files:**
- Modify: `shared/src/types/assignment.ts`

- [ ] **Step 1: Add BatchPermissionsResponse and AddColumnRequest types**

Add to the end of `shared/src/types/assignment.ts` (after the `ExerciseStatus` type alias, currently line 67):

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

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && npm run typecheck`
Expected: PASS (no existing code imports these types yet)

- [ ] **Step 3: Commit**

```bash
git add shared/src/types/assignment.ts
git commit -m "feat: add shared types for schema editor (BatchPermissionsResponse, AddColumnRequest)"
```

---

### Task 2: Add single-column-add endpoint

**Files:**
- Modify: `server/src/routes/exercises.ts`

- [ ] **Step 1: Add POST /:id/columns/add endpoint**

Add before the router export (line 1182) in `server/src/routes/exercises.ts`:

```typescript
// POST /api/v1/exercises/:id/columns/add -- add a single column
router.post('/:id/columns/add', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { key, label, description, dataType, columnRole, required, defaultValue, config, validationRules, referenceLink, dependentConfig, ordinal, visible } = req.body;

    if (!key || !label || !dataType || !columnRole) {
      res.status(400).json({ error: 'key, label, dataType, and columnRole are required' });
      return;
    }

    // Auto-assign ordinal if not provided (append to end)
    let finalOrdinal = ordinal;
    if (finalOrdinal === undefined || finalOrdinal === null) {
      const [maxOrd] = await db.select({ max: sql<number>`coalesce(max(${exerciseColumns.ordinal}), -1)` })
        .from(exerciseColumns)
        .where(eq(exerciseColumns.exerciseId, id));
      finalOrdinal = (maxOrd?.max ?? -1) + 1;
    }

    const [column] = await db.insert(exerciseColumns).values({
      exerciseId: id,
      key,
      label,
      description: description || null,
      dataType,
      ordinal: finalOrdinal,
      columnRole,
      required: required ?? false,
      defaultValue: defaultValue ?? null,
      config: config ?? {},
      validationRules: validationRules ?? [],
      referenceLink: referenceLink ?? null,
      dependentConfig: dependentConfig ?? null,
      visible: visible ?? true,
    }).returning();

    // If this is a classification column, add the key to all existing enrichment_records classifications
    if (columnRole === 'classification') {
      setImmediate(async () => {
        try {
          await db.execute(
            sql`UPDATE enrichment_records SET classifications = classifications || jsonb_build_object(${key}, null) WHERE exercise_id = ${id}::uuid AND NOT (classifications ? ${key})`
          );
        } catch (err) {
          console.error(`[AddColumn] Failed to initialize classification key "${key}":`, err);
        }
      });
    }

    res.status(201).json({ column });
  } catch (error) {
    console.error('Add column error:', error);
    res.status(500).json({ error: 'Failed to add column' });
  }
});
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/exercises.ts
git commit -m "feat: add single-column-add endpoint (POST /exercises/:id/columns/add)"
```

---

### Task 3: Add column reorder endpoint

**Files:**
- Modify: `server/src/routes/exercises.ts`

- [ ] **Step 1: Add PUT /:id/columns/reorder endpoint**

Add before the router export in `server/src/routes/exercises.ts`:

```typescript
// PUT /api/v1/exercises/:id/columns/reorder -- batch update column ordinals
router.put('/:id/columns/reorder', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { columns } = req.body as { columns: Array<{ id: string; ordinal: number }> };

    if (!Array.isArray(columns) || columns.length === 0) {
      res.status(400).json({ error: 'columns array is required' });
      return;
    }

    // Update all ordinals in a transaction
    await db.transaction(async (tx) => {
      for (const col of columns) {
        await tx.update(exerciseColumns)
          .set({ ordinal: col.ordinal })
          .where(and(eq(exerciseColumns.id, col.id), eq(exerciseColumns.exerciseId, id)));
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Reorder columns error:', error);
    res.status(500).json({ error: 'Failed to reorder columns' });
  }
});
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/exercises.ts
git commit -m "feat: add column reorder endpoint (PUT /exercises/:id/columns/reorder)"
```

---

### Task 4: Add batch permissions endpoint

**Files:**
- Modify: `server/src/routes/exercises.ts`

- [ ] **Step 1: Add GET /:id/assignments/permissions endpoint**

Add before the router export in `server/src/routes/exercises.ts`:

```typescript
// GET /api/v1/exercises/:id/assignments/permissions -- batch fetch all assignment permissions
router.get('/:id/assignments/permissions', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const results = await db
      .select({
        assignmentId: userExerciseAssignments.id,
        userId: userExerciseAssignments.userId,
        allowedColumnIds: assignmentPermissions.allowedColumnIds,
        rowFilter: assignmentPermissions.rowFilter,
        manualRowOverrides: assignmentPermissions.manualRowOverrides,
      })
      .from(userExerciseAssignments)
      .leftJoin(assignmentPermissions, eq(assignmentPermissions.assignmentId, userExerciseAssignments.id))
      .where(eq(userExerciseAssignments.exerciseId, id));

    res.json({
      permissions: results.map(r => ({
        assignmentId: r.assignmentId,
        userId: r.userId,
        allowedColumnIds: r.allowedColumnIds ?? null,
        rowFilter: r.rowFilter ?? null,
        manualRowOverrides: r.manualRowOverrides ?? null,
      })),
    });
  } catch (error) {
    console.error('Batch permissions fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/exercises.ts
git commit -m "feat: add batch permissions endpoint (GET /exercises/:id/assignments/permissions)"
```

---

## Chunk 1: API Client and Hooks

### Task 5: Add API client functions for schema editor

**Files:**
- Modify: `client/src/api/exercise-edit.ts`

- [ ] **Step 1: Add new API functions**

Add the following imports and functions to the end of `client/src/api/exercise-edit.ts` (after the `deleteColumn` function, currently line 73):

```typescript
import type { BatchPermissionsResponse, AddColumnRequest } from '@mapforge/shared';

// Add single column
export async function addColumn(exerciseId: string, column: AddColumnRequest): Promise<{ column: Record<string, unknown> }> {
  const response = await apiClient.post<{ column: Record<string, unknown> }>(`/exercises/${exerciseId}/columns/add`, column);
  return response.data;
}

// Update column metadata
export async function updateColumn(exerciseId: string, colId: string, updates: Record<string, unknown>): Promise<void> {
  await apiClient.put(`/exercises/${exerciseId}/columns/${colId}`, updates);
}

// Reorder columns
export async function reorderColumns(exerciseId: string, columns: Array<{ id: string; ordinal: number }>): Promise<void> {
  await apiClient.put(`/exercises/${exerciseId}/columns/reorder`, { columns });
}

// Batch fetch all assignment permissions
export async function fetchBatchPermissions(exerciseId: string): Promise<BatchPermissionsResponse> {
  const response = await apiClient.get<BatchPermissionsResponse>(`/exercises/${exerciseId}/assignments/permissions`);
  return response.data;
}

// Fetch paginated records (reuse existing endpoint)
export async function fetchRecords(exerciseId: string, page: number, pageSize: number): Promise<{ records: Record<string, unknown>[]; total: number; page: number; pageSize: number }> {
  const response = await apiClient.get(`/exercises/${exerciseId}/records`, { params: { page, pageSize } });
  return response.data;
}
```

Also add `BatchPermissionsResponse` and `AddColumnRequest` to the existing type imports at the top of the file:

```typescript
import type {
  ExerciseAssignment,
  AssignmentPermissions,
  BulkAssignRequest,
  BulkAssignResponse,
  NotifyRequest,
  SourceConfig,
  BatchPermissionsResponse,
  AddColumnRequest,
} from '@mapforge/shared';
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add client/src/api/exercise-edit.ts
git commit -m "feat: add API client functions for schema editor (addColumn, reorderColumns, fetchBatchPermissions, fetchRecords)"
```

---

### Task 6: Add React Query hooks for schema editor

**Files:**
- Modify: `client/src/hooks/useExerciseEdit.ts`

- [ ] **Step 1: Add new hooks**

Add the following import to the top of `client/src/hooks/useExerciseEdit.ts`, updating the existing import from `@/api/exercise-edit`:

```typescript
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
  addColumn,
  updateColumn,
  reorderColumns,
  fetchBatchPermissions,
  fetchRecords,
} from '@/api/exercise-edit';
import type { AddColumnRequest } from '@mapforge/shared';
```

Then add these hooks after the existing hooks (after `useDeleteColumn`, currently line 189):

```typescript
export function useAddColumn(exerciseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (column: AddColumnRequest) => addColumn(exerciseId, column),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-detail', exerciseId] });
      toast.success('Column added');
    },
    onError: () => {
      toast.error('Failed to add column');
    },
  });
}

export function useUpdateColumn(exerciseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ colId, updates }: { colId: string; updates: Record<string, unknown> }) =>
      updateColumn(exerciseId, colId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-detail', exerciseId] });
      toast.success('Column updated');
    },
    onError: () => {
      toast.error('Failed to update column');
    },
  });
}

export function useReorderColumns(exerciseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (columns: Array<{ id: string; ordinal: number }>) => reorderColumns(exerciseId, columns),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-detail', exerciseId] });
    },
    onError: () => {
      toast.error('Failed to reorder columns');
    },
  });
}

export function useBatchPermissions(exerciseId: string) {
  return useQuery({
    queryKey: ['batch-permissions', exerciseId],
    queryFn: () => fetchBatchPermissions(exerciseId),
    staleTime: 30_000,
    enabled: !!exerciseId,
  });
}

export function useExerciseRecords(exerciseId: string, page: number, pageSize: number) {
  return useQuery({
    queryKey: ['exercise-records', exerciseId, page, pageSize],
    queryFn: () => fetchRecords(exerciseId, page, pageSize),
    staleTime: 15_000,
    enabled: !!exerciseId,
  });
}
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/useExerciseEdit.ts
git commit -m "feat: add React Query hooks for schema editor (addColumn, updateColumn, reorderColumns, batchPermissions, records)"
```

---

## Chunk 2: Utility Functions and Column Header

### Task 7: Create schema editor utility functions

**Files:**
- Create: `client/src/components/exercise-edit/schema-editor-utils.ts`

- [ ] **Step 1: Create the utility module**

Create `client/src/components/exercise-edit/schema-editor-utils.ts`:

```typescript
import type { ColDef } from 'ag-grid-community';
import type { ExerciseDetail, ExerciseColumn } from '@mapforge/shared';
import type { BatchPermissionsResponse } from '@mapforge/shared';

// Fixed color palette for assignment dots
const ASSIGNMENT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

export function buildUserColorPalette(userIds: string[]): Map<string, string> {
  const palette = new Map<string, string>();
  userIds.forEach((id, index) => {
    palette.set(id, ASSIGNMENT_COLORS[index % ASSIGNMENT_COLORS.length]);
  });
  return palette;
}

export function buildAssignmentColorMap(
  permissions: BatchPermissionsResponse['permissions'],
  recordIds: string[]
): Map<string, string[]> {
  const map = new Map<string, string[]>();

  // Initialize all records with empty arrays
  for (const id of recordIds) {
    map.set(id, []);
  }

  for (const perm of permissions) {
    if (!perm.manualRowOverrides?.include?.length) continue;

    const includeSet = new Set(perm.manualRowOverrides.include);
    for (const recordId of recordIds) {
      if (includeSet.has(recordId)) {
        const existing = map.get(recordId) || [];
        existing.push(perm.userId);
        map.set(recordId, existing);
      }
    }
  }

  return map;
}

export interface SchemaColumnDefOptions {
  onHeaderClick: (column: ExerciseColumn) => void;
}

export function buildSchemaColumnDefs(exercise: ExerciseDetail, options: SchemaColumnDefOptions): ColDef[] {
  const defs: ColDef[] = [];

  // Row number column
  defs.push({
    headerName: '#',
    valueGetter: (params) => params.node ? params.node.rowIndex! + 1 : '',
    width: 40,
    pinned: 'left',
    sortable: false,
    filter: false,
    suppressMovable: true,
    cellClass: 'text-xs text-muted-foreground text-center',
  });

  // Checkbox column
  defs.push({
    headerCheckboxSelection: true,
    checkboxSelection: true,
    width: 44,
    pinned: 'left',
    sortable: false,
    filter: false,
    suppressMovable: true,
    headerClass: 'ag-checkbox-header',
  });

  // Source columns (read-only, grey headers)
  for (const col of exercise.sourceColumns) {
    defs.push({
      headerName: col.label,
      field: `sourceData.${col.key}`,
      editable: false,
      sortable: true,
      filter: true,
      headerComponent: 'schemaColumnHeader',
      headerComponentParams: { exerciseColumn: col, onHeaderClick: options.onHeaderClick },
      headerClass: 'schema-source-header',
      cellClass: 'schema-source-cell',
    });
  }

  // Classification columns (editable, blue headers)
  const classificationCols = exercise.classificationColumns || [];
  classificationCols.forEach((col, index) => {
    const def: ColDef = {
      headerName: col.label,
      field: `classifications.${col.key}`,
      editable: true,
      sortable: true,
      filter: true,
      headerComponent: 'schemaColumnHeader',
      headerComponentParams: { exerciseColumn: col, onHeaderClick: options.onHeaderClick },
      headerClass: index === 0 ? 'schema-classification-header schema-separator-left' : 'schema-classification-header',
      cellClass: index === 0 ? 'schema-classification-cell schema-separator-left' : 'schema-classification-cell',
    };

    // Add cell editor based on data type
    switch (col.dataType) {
      case 'picklist':
        def.cellEditor = 'dependentPicklistEditor';
        def.cellEditorParams = { column: col };
        def.cellEditorPopup = true;
        break;
      case 'multi_select':
        def.cellEditor = 'multiSelectEditor';
        def.cellEditorParams = { column: col };
        def.cellEditorPopup = true;
        break;
      case 'number':
        def.cellEditor = 'agNumberCellEditor';
        break;
      case 'date':
        def.cellEditor = 'dateCellEditor';
        def.cellEditorParams = { column: col };
        def.cellEditorPopup = true;
        break;
      case 'boolean':
        def.cellEditor = 'booleanCellEditor';
        def.cellRenderer = 'booleanCellRenderer';
        break;
      default:
        def.cellEditor = 'agTextCellEditor';
        break;
    }

    defs.push(def);
  });

  // Assignment indicator column (pinned right)
  defs.push({
    headerName: 'Assigned',
    field: '_assignments',
    width: 60,
    pinned: 'right',
    sortable: false,
    filter: false,
    suppressMovable: true,
    cellRenderer: 'assignmentColorBar',
    headerClass: 'text-xs text-center',
  });

  return defs;
}
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add client/src/components/exercise-edit/schema-editor-utils.ts
git commit -m "feat: add schema editor utility functions (column defs, assignment color map, user palette)"
```

---

### Task 8: Create SchemaColumnHeader component

**Files:**
- Create: `client/src/components/exercise-edit/SchemaColumnHeader.tsx`

- [ ] **Step 1: Create the header component**

Create `client/src/components/exercise-edit/SchemaColumnHeader.tsx`. This follows the pattern from `client/src/components/grid/ClassificationColumnHeader.tsx` (forwardRef with IHeaderParams):

```typescript
import { forwardRef } from 'react';
import type { IHeaderParams } from 'ag-grid-community';
import { List, Hash, Calendar, Type, ToggleLeft, Layers, Pencil, Link } from 'lucide-react';
import type { ExerciseColumn } from '@mapforge/shared';

const DATA_TYPE_ICONS: Record<string, typeof Type> = {
  picklist: List,
  multi_select: Layers,
  number: Hash,
  date: Calendar,
  boolean: ToggleLeft,
  text: Type,
};

interface SchemaColumnHeaderParams extends IHeaderParams {
  exerciseColumn: ExerciseColumn;
  onHeaderClick: (column: ExerciseColumn) => void;
}

export const SchemaColumnHeader = forwardRef<HTMLDivElement, SchemaColumnHeaderParams>(
  function SchemaColumnHeader(props, ref) {
    const { exerciseColumn: col, onHeaderClick } = props;
    const Icon = DATA_TYPE_ICONS[col.dataType] || Type;
    const hasReferenceLink = !!col.referenceLink;

    return (
      <div
        ref={ref}
        className="flex items-center gap-1.5 w-full cursor-pointer group px-1"
        onClick={() => onHeaderClick(col)}
        title={`Click to edit "${col.label}"`}
      >
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate text-xs font-medium">{col.label}</span>
        {col.required && <span className="text-destructive text-xs">*</span>}
        {hasReferenceLink && <Link className="h-3 w-3 shrink-0 text-blue-400" />}
        <Pencil className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
      </div>
    );
  }
);
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add client/src/components/exercise-edit/SchemaColumnHeader.tsx
git commit -m "feat: add SchemaColumnHeader component with type badge, edit icon, reference link indicator"
```

---

### Task 9: Create AssignmentColorBar cell renderer

**Files:**
- Create: `client/src/components/exercise-edit/AssignmentColorBar.tsx`

- [ ] **Step 1: Create the cell renderer**

Create `client/src/components/exercise-edit/AssignmentColorBar.tsx`:

```typescript
import type { ICellRendererParams } from 'ag-grid-community';

interface AssignmentColorBarParams extends ICellRendererParams {
  assignmentColorMap: Map<string, string[]>;
  userColorPalette: Map<string, string>;
  userNames: Map<string, string>;
}

export function AssignmentColorBar(props: AssignmentColorBarParams) {
  const { data, assignmentColorMap, userColorPalette, userNames } = props;
  if (!data) return null;

  const recordId = data.id as string;
  const assignedUserIds = assignmentColorMap?.get(recordId) || [];

  if (assignedUserIds.length === 0) {
    return (
      <div className="flex items-center justify-center h-full" title="All users (default)">
        <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
      </div>
    );
  }

  const maxVisible = 3;
  const visible = assignedUserIds.slice(0, maxVisible);
  const overflow = assignedUserIds.length - maxVisible;

  const tooltip = assignedUserIds
    .map(id => userNames?.get(id) || 'Unknown')
    .join(', ');

  return (
    <div className="flex items-center justify-center gap-0.5 h-full" title={tooltip}>
      {visible.map(userId => (
        <div
          key={userId}
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: userColorPalette?.get(userId) || '#6b7280' }}
        />
      ))}
      {overflow > 0 && (
        <span className="text-[10px] text-muted-foreground ml-0.5">+{overflow}</span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add client/src/components/exercise-edit/AssignmentColorBar.tsx
git commit -m "feat: add AssignmentColorBar cell renderer for assignment indicator dots"
```

---

## Chunk 3: Context Menu and Assignment Summary

### Task 10: Create AssignmentContextMenu component

**Files:**
- Create: `client/src/components/exercise-edit/AssignmentContextMenu.tsx`

- [ ] **Step 1: Create the context menu**

Create `client/src/components/exercise-edit/AssignmentContextMenu.tsx`:

```typescript
import { useEffect, useRef } from 'react';
import type { ExerciseAssignment } from '@mapforge/shared';

interface AssignmentContextMenuProps {
  x: number;
  y: number;
  visible: boolean;
  assignments: ExerciseAssignment[];
  selectedRowIds: Set<string>;
  assignmentColorMap: Map<string, string[]>;
  userColorPalette: Map<string, string>;
  onAssign: (assignmentId: string, userId: string) => void;
  onUnassign: (assignmentId: string, userId: string) => void;
  onClose: () => void;
}

export function AssignmentContextMenu({
  x, y, visible, assignments, selectedRowIds, assignmentColorMap, userColorPalette, onAssign, onUnassign, onClose,
}: AssignmentContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [visible, onClose]);

  if (!visible || selectedRowIds.size === 0) return null;

  // Find users assigned to any of the selected rows (union)
  const assignedToSelected = new Set<string>();
  for (const recordId of selectedRowIds) {
    const userIds = assignmentColorMap.get(recordId) || [];
    for (const uid of userIds) assignedToSelected.add(uid);
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-48 bg-popover border border-border rounded-md shadow-lg py-1"
      style={{ left: x, top: y }}
    >
      <div className="px-3 py-1.5 text-xs text-muted-foreground border-b border-border">
        {selectedRowIds.size} row{selectedRowIds.size > 1 ? 's' : ''} selected
      </div>

      {/* Assign to */}
      <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">Assign to</div>
      {assignments.map(a => (
        <button
          key={`assign-${a.id}`}
          className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent flex items-center gap-2"
          onClick={() => { onAssign(a.id, a.userId); onClose(); }}
        >
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: userColorPalette.get(a.userId) || '#6b7280' }}
          />
          {a.userName}
        </button>
      ))}
      {assignments.length === 0 && (
        <div className="px-3 py-1.5 text-xs text-muted-foreground">No users assigned to exercise</div>
      )}

      {/* Unassign from (only show users assigned to selected rows) */}
      {assignedToSelected.size > 0 && (
        <>
          <div className="border-t border-border my-1" />
          <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">Unassign from</div>
          {assignments.filter(a => assignedToSelected.has(a.userId)).map(a => (
            <button
              key={`unassign-${a.id}`}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent text-destructive flex items-center gap-2"
              onClick={() => { onUnassign(a.id, a.userId); onClose(); }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: userColorPalette.get(a.userId) || '#6b7280' }}
              />
              {a.userName}
            </button>
          ))}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add client/src/components/exercise-edit/AssignmentContextMenu.tsx
git commit -m "feat: add AssignmentContextMenu for row assign/unassign via right-click"
```

---

### Task 11: Create AssignmentSummaryDropdown component

**Files:**
- Create: `client/src/components/exercise-edit/AssignmentSummaryDropdown.tsx`

- [ ] **Step 1: Create the dropdown**

Create `client/src/components/exercise-edit/AssignmentSummaryDropdown.tsx`:

```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Trash2, Mail, Search, ChevronDown, Settings } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { apiClient } from '@/api/client';
import {
  useExerciseAssignments,
  useUpdateAssignmentRole,
  useRemoveAssignment,
  useBulkAssign,
  useSendNotification,
} from '@/hooks/useExerciseEdit';
import type { ExerciseAssignment } from '@mapforge/shared';

interface AssignmentSummaryDropdownProps {
  exerciseId: string;
  userColorPalette: Map<string, string>;
  permissionRowCounts: Map<string, number | null>; // userId -> row count (null = all)
  onAdvancedClick: (assignment: ExerciseAssignment) => void;
}

export function AssignmentSummaryDropdown({
  exerciseId, userColorPalette, permissionRowCounts, onAdvancedClick,
}: AssignmentSummaryDropdownProps) {
  const { data: assignments } = useExerciseAssignments(exerciseId);
  const updateRole = useUpdateAssignmentRole(exerciseId);
  const removeAssignment = useRemoveAssignment(exerciseId);
  const bulkAssign = useBulkAssign(exerciseId);
  const sendNotification = useSendNotification(exerciseId);

  const [open, setOpen] = useState(false);
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

  const handleAddUser = (user: { id: string }) => {
    bulkAssign.mutate({ users: [{ userId: user.id, role: 'editor' }] });
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleRemove = () => {
    if (!removeTarget) return;
    removeAssignment.mutate(removeTarget.id, { onSuccess: () => setRemoveTarget(null) });
  };

  const count = assignments?.length ?? 0;

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen(!open)}>
        <Badge variant="secondary" className="mr-1.5">{count}</Badge>
        user{count !== 1 ? 's' : ''} assigned
        <ChevronDown className="h-3.5 w-3.5 ml-1" />
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-96 bg-popover border border-border rounded-md shadow-lg z-50">
          {/* Search */}
          <div className="p-3 border-b border-border">
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search users to add..."
                className="flex-1 h-8 text-sm"
              />
              <Button variant="secondary" size="sm" onClick={handleSearch} disabled={searching}>
                <Search className="h-3.5 w-3.5" />
              </Button>
            </div>
            {searchResults.length > 0 && (
              <div className="mt-2 border border-border rounded-md overflow-hidden">
                {searchResults.map(user => (
                  <button
                    key={user.id}
                    onClick={() => handleAddUser(user)}
                    className="w-full flex items-center justify-between px-2 py-1.5 text-sm hover:bg-accent border-b border-border last:border-0"
                  >
                    <span>{user.name}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User list */}
          <div className="max-h-64 overflow-y-auto">
            {assignments?.map(a => {
              const rowCount = permissionRowCounts.get(a.userId);
              const rowLabel = rowCount === null ? 'all rows' : `${rowCount} rows`;
              return (
                <div key={a.id} className="flex items-center gap-2 px-3 py-2 border-b border-border last:border-0">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: userColorPalette.get(a.userId) || '#6b7280' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{a.userName}</div>
                    <div className="text-xs text-muted-foreground">{rowLabel}</div>
                  </div>
                  <Select
                    value={a.role}
                    onValueChange={(val) => updateRole.mutate({ assignmentId: a.id, role: val })}
                  >
                    <SelectTrigger className="w-24 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => sendNotification.mutate({ assignmentId: a.id, request: { type: 'assignment' } })} title="Notify">
                    <Mail className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onAdvancedClick(a)} title="Advanced permissions">
                    <Settings className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => setRemoveTarget({ id: a.id, name: a.userName })} title="Remove">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
            {count === 0 && (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">No users assigned</div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={() => setRemoveTarget(null)}
        title="Remove assignment?"
        description={`Remove ${removeTarget?.name} from this exercise?`}
        confirmLabel="Remove"
        variant="destructive"
        loading={removeAssignment.isPending}
        onConfirm={handleRemove}
      />
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add client/src/components/exercise-edit/AssignmentSummaryDropdown.tsx
git commit -m "feat: add AssignmentSummaryDropdown for toolbar user management"
```

---

## Chunk 4: ColumnConfigPanel

### Task 12: Create ColumnConfigPanel component

**Files:**
- Create: `client/src/components/exercise-edit/ColumnConfigPanel.tsx`

- [ ] **Step 1: Create the panel**

Create `client/src/components/exercise-edit/ColumnConfigPanel.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { apiClient } from '@/api/client';
import { useAddColumn, useUpdateColumn, useDeleteColumn } from '@/hooks/useExerciseEdit';
import type { ExerciseColumn, ExerciseDetail } from '@mapforge/shared';

interface ColumnConfigPanelProps {
  exerciseId: string;
  exercise: ExerciseDetail;
  column: ExerciseColumn | null; // null = add mode
  onClose: () => void;
}

const DATA_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'picklist', label: 'Picklist' },
  { value: 'multi_select', label: 'Multi Select' },
];

function toKey(label: string): string {
  return label
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^\w/, c => c.toLowerCase());
}

export function ColumnConfigPanel({ exerciseId, exercise, column, onClose }: ColumnConfigPanelProps) {
  const isEdit = !!column;
  const isSource = column?.columnRole === 'source';

  const addColumn = useAddColumn(exerciseId);
  const updateColumn = useUpdateColumn(exerciseId);
  const deleteColumn = useDeleteColumn(exerciseId);

  // Form state
  const [label, setLabel] = useState(column?.label || '');
  const [key, setKey] = useState(column?.key || '');
  const [description, setDescription] = useState(column?.description || '');
  const [dataType, setDataType] = useState(column?.dataType || 'text');
  const [required, setRequired] = useState(column?.required ?? false);
  const [defaultValue, setDefaultValue] = useState(column?.defaultValue || '');
  const [picklistValues, setPicklistValues] = useState(
    (column?.config as any)?.picklistValues?.join('\n') || ''
  );
  const [useRefTable, setUseRefTable] = useState(!!column?.referenceLink);
  const [refTableId, setRefTableId] = useState(
    (column?.referenceLink as any)?.referenceTableId || ''
  );
  const [refColumnKey, setRefColumnKey] = useState(
    (column?.referenceLink as any)?.referenceColumnKey || ''
  );
  const [refDisplayKey, setRefDisplayKey] = useState(
    (column?.referenceLink as any)?.displayColumnKey || ''
  );
  const [parentColumnKey, setParentColumnKey] = useState(
    (column?.dependentConfig as any)?.parentColumnKey || ''
  );
  const [showDelete, setShowDelete] = useState(false);
  const [showTypeWarning, setShowTypeWarning] = useState(false);
  const [pendingDataType, setPendingDataType] = useState('');

  // Auto-generate key from label in add mode
  useEffect(() => {
    if (!isEdit && label) {
      setKey(toKey(label));
    }
  }, [label, isEdit]);

  // Fetch reference tables
  const { data: refTables } = useQuery({
    queryKey: ['reference-tables'],
    queryFn: async () => {
      const res = await apiClient.get('/reference-tables');
      return res.data.tables || res.data || [];
    },
    staleTime: 60_000,
    enabled: useRefTable,
  });

  // Fetch selected reference table columns
  const { data: refTableDetail } = useQuery({
    queryKey: ['reference-table-detail', refTableId],
    queryFn: async () => {
      const res = await apiClient.get(`/reference-tables/${refTableId}`);
      return res.data;
    },
    staleTime: 60_000,
    enabled: !!refTableId,
  });

  const isPicklistType = dataType === 'picklist' || dataType === 'multi_select';
  const otherPicklistColumns = [...exercise.classificationColumns]
    .filter(c => c.id !== column?.id && (c.dataType === 'picklist' || c.dataType === 'multi_select'));

  const handleDataTypeChange = (newType: string) => {
    if (isEdit && column && dataType !== newType) {
      const isBreaking =
        (isPicklistType && newType !== 'picklist' && newType !== 'multi_select') ||
        (!isPicklistType && (newType === 'picklist' || newType === 'multi_select'));
      if (isBreaking) {
        setPendingDataType(newType);
        setShowTypeWarning(true);
        return;
      }
    }
    setDataType(newType);
  };

  const confirmTypeChange = () => {
    setDataType(pendingDataType);
    if (pendingDataType !== 'picklist' && pendingDataType !== 'multi_select') {
      setPicklistValues('');
      setUseRefTable(false);
      setRefTableId('');
      setRefColumnKey('');
      setRefDisplayKey('');
      setParentColumnKey('');
    }
    setShowTypeWarning(false);
  };

  const handleSave = () => {
    if (!label.trim() || !key.trim()) return;

    const config: Record<string, unknown> = {};
    if (isPicklistType && !useRefTable && picklistValues.trim()) {
      config.picklistValues = picklistValues.split('\n').map(v => v.trim()).filter(Boolean);
    }

    const referenceLink = useRefTable && refTableId && refColumnKey
      ? { referenceTableId: refTableId, referenceColumnKey: refColumnKey, displayColumnKey: refDisplayKey || refColumnKey }
      : null;

    const dependentConfig = parentColumnKey && refTableId
      ? { parentColumnKey, referenceTableId: refTableId, parentReferenceColumn: refColumnKey, childReferenceColumn: refColumnKey }
      : null;

    if (isEdit && column) {
      const updates: Record<string, unknown> = {
        label, description: description || null, required,
      };
      if (!isSource) {
        updates.dataType = dataType;
        updates.defaultValue = defaultValue || null;
        updates.config = config;
        updates.referenceLink = referenceLink;
        updates.dependentConfig = dependentConfig;
      }
      updateColumn.mutate({ colId: column.id, updates }, { onSuccess: onClose });
    } else {
      addColumn.mutate({
        key, label, description: description || undefined, dataType,
        columnRole: 'classification', required, defaultValue: defaultValue || null,
        config, referenceLink, dependentConfig,
      }, { onSuccess: onClose });
    }
  };

  const handleDelete = () => {
    if (!column) return;
    deleteColumn.mutate(column.id, { onSuccess: () => { setShowDelete(false); onClose(); } });
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-background border-l border-border shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-sm font-semibold">{isEdit ? `Edit: ${column?.label}` : 'Add Column'}</h2>
        <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Label</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Column label" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Key</Label>
          <Input value={key} disabled={isEdit} className={isEdit ? 'bg-muted' : ''} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Description</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
        </div>

        {!isSource && (
          <div className="space-y-1.5">
            <Label className="text-xs">Data Type</Label>
            <Select value={dataType} onValueChange={handleDataTypeChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DATA_TYPES.map(dt => (
                  <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input type="checkbox" id="required" checked={required} onChange={(e) => setRequired(e.target.checked)} className="rounded" />
          <Label htmlFor="required" className="text-xs">Required</Label>
        </div>

        {!isSource && (
          <div className="space-y-1.5">
            <Label className="text-xs">Default Value</Label>
            <Input value={defaultValue} onChange={(e) => setDefaultValue(e.target.value)} placeholder="Optional" />
          </div>
        )}

        {/* Picklist / Reference Table section */}
        {!isSource && isPicklistType && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="useRefTable" checked={useRefTable} onChange={(e) => setUseRefTable(e.target.checked)} className="rounded" />
              <Label htmlFor="useRefTable" className="text-xs">Link to Reference Table</Label>
            </div>

            {!useRefTable && (
              <div className="space-y-1.5">
                <Label className="text-xs">Picklist Values (one per line)</Label>
                <Textarea value={picklistValues} onChange={(e) => setPicklistValues(e.target.value)} rows={6} placeholder="Option 1&#10;Option 2&#10;Option 3" />
              </div>
            )}

            {useRefTable && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Reference Table</Label>
                  <Select value={refTableId} onValueChange={setRefTableId}>
                    <SelectTrigger><SelectValue placeholder="Select table..." /></SelectTrigger>
                    <SelectContent>
                      {(refTables || []).map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {refTableDetail && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Value Column</Label>
                      <Select value={refColumnKey} onValueChange={setRefColumnKey}>
                        <SelectTrigger><SelectValue placeholder="Select column..." /></SelectTrigger>
                        <SelectContent>
                          {(refTableDetail.columns || []).map((c: any) => (
                            <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Display Column (optional)</Label>
                      <Select value={refDisplayKey} onValueChange={setRefDisplayKey}>
                        <SelectTrigger><SelectValue placeholder="Same as value" /></SelectTrigger>
                        <SelectContent>
                          {(refTableDetail.columns || []).map((c: any) => (
                            <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* Dependent picklist */}
                {otherPicklistColumns.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Parent Column (for dependent picklist, optional)</Label>
                    <Select value={parentColumnKey} onValueChange={setParentColumnKey}>
                      <SelectTrigger><SelectValue placeholder="None (independent)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {otherPicklistColumns.map(c => (
                          <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t border-border">
        <div>
          {isEdit && !isSource && (
            <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!label.trim() || !key.trim() || addColumn.isPending || updateColumn.isPending}>
            {isEdit ? 'Save' : 'Add Column'}
          </Button>
        </div>
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={showDelete}
        onOpenChange={() => setShowDelete(false)}
        title={`Delete "${column?.label}"?`}
        description="This will permanently remove this column and clear its classification data from all records."
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteColumn.isPending}
        onConfirm={handleDelete}
      />

      {/* Type change warning */}
      <ConfirmDialog
        open={showTypeWarning}
        onOpenChange={() => setShowTypeWarning(false)}
        title="Change data type?"
        description="Changing data type may invalidate existing classification values. Picklist configuration will be cleared."
        confirmLabel="Change Type"
        variant="destructive"
        onConfirm={confirmTypeChange}
      />
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add client/src/components/exercise-edit/ColumnConfigPanel.tsx
git commit -m "feat: add ColumnConfigPanel with reference table linking, type safety, delete"
```

---

## Chunk 5: SchemaEditorGrid and Page Integration

### Task 13: Create SchemaEditorGrid component

**Files:**
- Create: `client/src/components/exercise-edit/SchemaEditorGrid.tsx`

- [ ] **Step 1: Create the grid component**

Create `client/src/components/exercise-edit/SchemaEditorGrid.tsx`:

```typescript
import { useState, useCallback, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useExerciseAssignments,
  useBatchPermissions,
  useExerciseRecords,
  useUpdatePermissions,
} from '@/hooks/useExerciseEdit';
import { SchemaColumnHeader } from './SchemaColumnHeader';
import { AssignmentColorBar } from './AssignmentColorBar';
import { AssignmentContextMenu } from './AssignmentContextMenu';
import { AssignmentSummaryDropdown } from './AssignmentSummaryDropdown';
import { ColumnConfigPanel } from './ColumnConfigPanel';
import { buildSchemaColumnDefs, buildAssignmentColorMap, buildUserColorPalette } from './schema-editor-utils';
import type { ExerciseDetail, ExerciseColumn, ExerciseAssignment } from '@mapforge/shared';
import type { CellContextMenuEvent, SelectionChangedEvent } from 'ag-grid-community';

// Import existing cell editors for classification columns
import { DependentPicklistEditor } from '@/components/grid/DependentPicklistEditor';
import { MultiSelectEditor } from '@/components/grid/MultiSelectEditor';
import { DateCellEditor } from '@/components/grid/DateCellEditor';
import { BooleanCellRenderer } from '@/components/grid/BooleanCellRenderer';
import { BooleanCellEditor } from '@/components/grid/BooleanCellEditor';

interface SchemaEditorGridProps {
  exerciseId: string;
  exercise: ExerciseDetail;
}

export function SchemaEditorGrid({ exerciseId, exercise }: SchemaEditorGridProps) {
  const gridRef = useRef<AgGridReact>(null);

  // Data fetching
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const { data: recordsData, isLoading: loadingRecords } = useExerciseRecords(exerciseId, page, pageSize);
  const { data: assignments } = useExerciseAssignments(exerciseId);
  const { data: batchPerms } = useBatchPermissions(exerciseId);
  const updatePermissions = useUpdatePermissions(exerciseId);

  // Local state
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
  const [configPanel, setConfigPanel] = useState<{ open: boolean; column: ExerciseColumn | null }>({ open: false, column: null });
  const [assignmentColorMap, setAssignmentColorMap] = useState<Map<string, string[]>>(new Map());

  // Build color palette from assignments
  const userColorPalette = useMemo(() => {
    const userIds = (assignments || []).map(a => a.userId);
    return buildUserColorPalette(userIds);
  }, [assignments]);

  const userNames = useMemo(() => {
    const map = new Map<string, string>();
    (assignments || []).forEach(a => map.set(a.userId, a.userName));
    return map;
  }, [assignments]);

  // Build assignment color map from permissions + current records
  useMemo(() => {
    if (!batchPerms || !recordsData) return;
    const recordIds = (recordsData.records || []).map((r: any) => r.id);
    const map = buildAssignmentColorMap(batchPerms.permissions, recordIds);
    setAssignmentColorMap(map);
  }, [batchPerms, recordsData]);

  // Permission row counts for summary dropdown
  const permissionRowCounts = useMemo(() => {
    const counts = new Map<string, number | null>();
    if (!batchPerms) return counts;
    for (const perm of batchPerms.permissions) {
      if (perm.manualRowOverrides?.include?.length) {
        counts.set(perm.userId, perm.manualRowOverrides.include.length);
      } else {
        counts.set(perm.userId, null); // null = all rows
      }
    }
    return counts;
  }, [batchPerms]);

  // Column defs
  const columnDefs = useMemo(() => {
    return buildSchemaColumnDefs(exercise, {
      onHeaderClick: (col) => setConfigPanel({ open: true, column: col }),
    });
  }, [exercise]);

  // AG Grid components
  const components = useMemo(() => ({
    schemaColumnHeader: SchemaColumnHeader,
    assignmentColorBar: (params: any) => (
      <AssignmentColorBar {...params} assignmentColorMap={assignmentColorMap} userColorPalette={userColorPalette} userNames={userNames} />
    ),
    dependentPicklistEditor: DependentPicklistEditor,
    multiSelectEditor: MultiSelectEditor,
    dateCellEditor: DateCellEditor,
    booleanCellRenderer: BooleanCellRenderer,
    booleanCellEditor: BooleanCellEditor,
  }), [assignmentColorMap, userColorPalette, userNames]);

  // Event handlers
  const onSelectionChanged = useCallback((event: SelectionChangedEvent) => {
    const selected = event.api.getSelectedRows();
    setSelectedRowIds(new Set(selected.map((r: any) => r.id)));
  }, []);

  const onCellContextMenu = useCallback((event: CellContextMenuEvent) => {
    event.event?.preventDefault();
    const mouseEvent = event.event as MouseEvent;
    setContextMenu({ x: mouseEvent.clientX, y: mouseEvent.clientY, visible: true });
  }, []);

  // Assignment handlers
  const handleAssign = useCallback((assignmentId: string, userId: string) => {
    const newMap = new Map(assignmentColorMap);
    for (const recordId of selectedRowIds) {
      const existing = newMap.get(recordId) || [];
      if (!existing.includes(userId)) {
        newMap.set(recordId, [...existing, userId]);
      }
    }
    setAssignmentColorMap(newMap);

    // Find existing manual overrides and merge
    const perm = batchPerms?.permissions.find(p => p.assignmentId === assignmentId);
    const existingIncludes = perm?.manualRowOverrides?.include || [];
    const mergedIncludes = Array.from(new Set([...existingIncludes, ...selectedRowIds]));

    updatePermissions.mutate({
      assignmentId,
      permissions: {
        manualRowOverrides: { include: mergedIncludes, exclude: perm?.manualRowOverrides?.exclude || [] },
      },
    });
    gridRef.current?.api?.refreshCells({ force: true });
  }, [assignmentColorMap, selectedRowIds, batchPerms, updatePermissions]);

  const handleUnassign = useCallback((assignmentId: string, userId: string) => {
    const newMap = new Map(assignmentColorMap);
    for (const recordId of selectedRowIds) {
      const existing = newMap.get(recordId) || [];
      newMap.set(recordId, existing.filter(id => id !== userId));
    }
    setAssignmentColorMap(newMap);

    const perm = batchPerms?.permissions.find(p => p.assignmentId === assignmentId);
    const existingIncludes = perm?.manualRowOverrides?.include || [];
    const filtered = existingIncludes.filter((id: string) => !selectedRowIds.has(id));

    updatePermissions.mutate({
      assignmentId,
      permissions: {
        manualRowOverrides: { include: filtered, exclude: perm?.manualRowOverrides?.exclude || [] },
      },
    });
    gridRef.current?.api?.refreshCells({ force: true });
  }, [assignmentColorMap, selectedRowIds, batchPerms, updatePermissions]);

  const records = recordsData?.records || [];
  const total = recordsData?.total || 0;
  const totalPages = Math.ceil(total / pageSize);
  const sourceCount = exercise.sourceColumns.length;
  const classCount = exercise.classificationColumns.length;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-1 py-2">
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={() => setConfigPanel({ open: true, column: null })}>
            <Plus className="h-4 w-4 mr-1" /> Add Column
          </Button>
          <span className="text-xs text-muted-foreground">
            {sourceCount} source, {classCount} classification
          </span>
        </div>
        <div className="flex items-center gap-3">
          <AssignmentSummaryDropdown
            exerciseId={exerciseId}
            userColorPalette={userColorPalette}
            permissionRowCounts={permissionRowCounts}
            onAdvancedClick={() => {}}
          />
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Rows {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}</span>
            <Button variant="ghost" size="sm" className="h-6 px-1" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
            <Button variant="ghost" size="sm" className="h-6 px-1" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 ag-theme-quartz">
        <AgGridReact
          ref={gridRef}
          rowData={records}
          columnDefs={columnDefs}
          components={components}
          rowSelection="multiple"
          suppressRowClickSelection
          rowHeight={32}
          headerHeight={36}
          onSelectionChanged={onSelectionChanged}
          onCellContextMenu={onCellContextMenu}
          getRowId={(params) => params.data.id}
          loading={loadingRecords}
          suppressContextMenu
        />
      </div>

      {/* Context menu */}
      <AssignmentContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        visible={contextMenu.visible}
        assignments={assignments || []}
        selectedRowIds={selectedRowIds}
        assignmentColorMap={assignmentColorMap}
        userColorPalette={userColorPalette}
        onAssign={handleAssign}
        onUnassign={handleUnassign}
        onClose={() => setContextMenu(prev => ({ ...prev, visible: false }))}
      />

      {/* Column config panel */}
      {configPanel.open && (
        <ColumnConfigPanel
          exerciseId={exerciseId}
          exercise={exercise}
          column={configPanel.column}
          onClose={() => setConfigPanel({ open: false, column: null })}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && npm run typecheck`
Expected: PASS (may need minor adjustments for AG Grid type imports)

- [ ] **Step 3: Commit**

```bash
git add client/src/components/exercise-edit/SchemaEditorGrid.tsx
git commit -m "feat: add SchemaEditorGrid with toolbar, pagination, assignments, column config"
```

---

### Task 14: Add schema editor CSS

**Files:**
- Modify: `client/src/components/grid/grid.css`

- [ ] **Step 1: Add schema editor styles**

Add to the end of `client/src/components/grid/grid.css`:

```css
/* Schema Editor Grid */
.schema-source-header {
  background-color: var(--muted) !important;
}
.schema-source-cell {
  background-color: color-mix(in srgb, var(--muted) 30%, transparent) !important;
}
.schema-classification-header {
  background-color: color-mix(in srgb, var(--primary) 10%, var(--background)) !important;
}
.schema-classification-cell {
  background-color: color-mix(in srgb, var(--primary) 5%, transparent) !important;
}
.schema-separator-left {
  border-left: 2px solid var(--border) !important;
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/grid/grid.css
git commit -m "feat: add schema editor grid CSS styles (source/classification header tints, separator)"
```

---

### Task 15: Update ExerciseEditPage to use SchemaEditorGrid

**Files:**
- Modify: `client/src/pages/ExerciseEditPage.tsx`

- [ ] **Step 1: Replace 5 tabs with 3**

Read `client/src/pages/ExerciseEditPage.tsx` and make the following changes:

1. Replace the imports: remove ColumnsTab, AssignmentsTab, PermissionsTab. Add SchemaEditorGrid.

Replace the import block:
```typescript
import { GeneralTab } from '@/components/exercise-edit/GeneralTab';
import { DataSourceTab } from '@/components/exercise-edit/DataSourceTab';
import { ColumnsTab } from '@/components/exercise-edit/ColumnsTab';
import { AssignmentsTab } from '@/components/exercise-edit/AssignmentsTab';
import { PermissionsTab } from '@/components/exercise-edit/PermissionsTab';
```

With:
```typescript
import { GeneralTab } from '@/components/exercise-edit/GeneralTab';
import { DataSourceTab } from '@/components/exercise-edit/DataSourceTab';
import { SchemaEditorGrid } from '@/components/exercise-edit/SchemaEditorGrid';
import '@/components/grid/grid.css';
```

2. Replace the Tabs section (TabsList and TabsContent blocks) with 3 tabs:

```typescript
<Tabs value={activeTab} onValueChange={handleTabChange}>
  <TabsList>
    <TabsTrigger value="general">General</TabsTrigger>
    <TabsTrigger value="datasource">Data Source</TabsTrigger>
    <TabsTrigger value="data-assignments">Data & Assignments</TabsTrigger>
  </TabsList>

  <TabsContent value="general">
    <GeneralTab exerciseId={id!} exercise={exercise} onDirtyChange={setIsDirty} />
  </TabsContent>
  <TabsContent value="datasource">
    <DataSourceTab exerciseId={id!} onDirtyChange={setIsDirty} />
  </TabsContent>
  <TabsContent value="data-assignments" className="h-[calc(100vh-220px)]">
    <SchemaEditorGrid exerciseId={id!} exercise={exercise} />
  </TabsContent>
</Tabs>
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && npm run typecheck`
Expected: PASS

- [ ] **Step 3: Build client**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1/client && npx vite build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/ExerciseEditPage.tsx
git commit -m "feat: replace Columns/Assignments/Permissions tabs with Data & Assignments schema editor grid"
```

---

## Chunk 6: Final Build Verification

### Task 16: Full build and verify

- [ ] **Step 1: Run full typecheck**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && npm run typecheck`
Expected: No new errors beyond pre-existing ones

- [ ] **Step 2: Build client**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1/client && npx vite build`
Expected: Build succeeds

- [ ] **Step 3: Run tests**

Run: `cd /Users/zackbarett/Documents/MLBMapping-1 && npm run test`
Expected: Existing tests pass (no regressions)

- [ ] **Step 4: Verify removed components are not imported elsewhere**

Search for imports of removed tab components to ensure nothing else references them:

```bash
grep -r "ColumnsTab\|AssignmentsTab\|PermissionsTab" client/src/ --include="*.tsx" --include="*.ts"
```

Expected: Only the component definition files themselves (which remain on disk but are unused). If any other files import them, update those imports.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: address any build/type errors from schema editor integration"
```
