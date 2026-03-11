# Phase 2: Enrichment Spreadsheet View

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core classification screen where business users view source records in a spreadsheet and fill in classification columns, with dependent dropdowns, client-side validation, auto-save, bulk edit, and pagination.

**Architecture:** The page is composed of a Zustand store driving React Query hooks that feed an AG Grid instance. Cell edits flow through client-side validation for instant feedback, then debounce into a mutation that optimistically updates the React Query cache and persists server-side. The server returns canonical validation results and updated stats, which merge back into the cache.

**Tech Stack:** AG Grid 35 (`ag-grid-react`, `themeQuartz.withPart(colorSchemeDarkBlue)`), Zustand, React Query 5 (`useQuery`, `useMutation`, `queryClient.setQueriesData`), Axios, `lodash-es/debounce`, `react-hot-toast`, `lucide-react`, Express 5, Drizzle ORM, PostgreSQL 16

**Depends on:** Phase 1 (shared foundations, types, auth, API client, common components)

**Spec reference:** `docs/superpowers/specs/2026-03-11-mapforge-user-facing-screens-design.md` Section 3

---

## Task 1: Spreadsheet Zustand Store

**Files:**
- `client/src/stores/spreadsheetStore.ts`
- `client/src/stores/__tests__/spreadsheetStore.test.ts`

### Steps

- [ ] **1.1** Create `client/src/stores/spreadsheetStore.ts`

```typescript
// client/src/stores/spreadsheetStore.ts
import { create } from 'zustand';
import type { ClassificationPayload } from '@mapforge/shared/types';

type QuickFilter = 'all' | 'unclassified' | 'classified' | 'errors' | 'new';

interface SpreadsheetState {
  // Query state
  activeFilter: QuickFilter;
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
  pendingSaves: Map<string, ClassificationPayload>;

  // Actions
  setFilter: (filter: QuickFilter) => void;
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

const initialState = {
  activeFilter: 'all' as QuickFilter,
  searchQuery: '',
  sortColumn: null,
  sortDirection: 'asc' as const,
  page: 1,
  pageSize: 50,
  selectedRecordIds: new Set<string>(),
  bulkEditOpen: false,
  pendingSaves: new Map<string, ClassificationPayload>(),
};

export const useSpreadsheetStore = create<SpreadsheetState>((set) => ({
  ...initialState,

  setFilter: (filter) => set({ activeFilter: filter, page: 1 }),

  setSearch: (query) => set({ searchQuery: query, page: 1 }),

  setSort: (column, direction) =>
    set({ sortColumn: column, sortDirection: direction, page: 1 }),

  setPage: (page) => set({ page }),

  toggleRecordSelection: (recordId) =>
    set((state) => {
      const next = new Set(state.selectedRecordIds);
      if (next.has(recordId)) {
        next.delete(recordId);
      } else {
        next.add(recordId);
      }
      return { selectedRecordIds: next };
    }),

  selectAllRecords: (recordIds) =>
    set({ selectedRecordIds: new Set(recordIds) }),

  clearSelection: () => set({ selectedRecordIds: new Set() }),

  setBulkEditOpen: (open) => set({ bulkEditOpen: open }),

  addPendingSave: (recordId, payload) =>
    set((state) => {
      const next = new Map(state.pendingSaves);
      next.set(recordId, payload);
      return { pendingSaves: next };
    }),

  removePendingSave: (recordId) =>
    set((state) => {
      const next = new Map(state.pendingSaves);
      next.delete(recordId);
      return { pendingSaves: next };
    }),

  reset: () => set({ ...initialState }),
}));

export type { SpreadsheetState, QuickFilter };
```

- [ ] **1.2** Create store tests

```typescript
// client/src/stores/__tests__/spreadsheetStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useSpreadsheetStore } from '../spreadsheetStore';

describe('spreadsheetStore', () => {
  beforeEach(() => {
    useSpreadsheetStore.getState().reset();
  });

  it('initializes with default values', () => {
    const state = useSpreadsheetStore.getState();
    expect(state.activeFilter).toBe('all');
    expect(state.searchQuery).toBe('');
    expect(state.page).toBe(1);
    expect(state.pageSize).toBe(50);
    expect(state.sortColumn).toBeNull();
    expect(state.sortDirection).toBe('asc');
    expect(state.selectedRecordIds.size).toBe(0);
    expect(state.pendingSaves.size).toBe(0);
  });

  it('setFilter resets page to 1', () => {
    useSpreadsheetStore.getState().setPage(3);
    useSpreadsheetStore.getState().setFilter('errors');
    const state = useSpreadsheetStore.getState();
    expect(state.activeFilter).toBe('errors');
    expect(state.page).toBe(1);
  });

  it('setSearch resets page to 1', () => {
    useSpreadsheetStore.getState().setPage(5);
    useSpreadsheetStore.getState().setSearch('baseball');
    const state = useSpreadsheetStore.getState();
    expect(state.searchQuery).toBe('baseball');
    expect(state.page).toBe(1);
  });

  it('setSort resets page to 1', () => {
    useSpreadsheetStore.getState().setPage(2);
    useSpreadsheetStore.getState().setSort('programName', 'desc');
    const state = useSpreadsheetStore.getState();
    expect(state.sortColumn).toBe('programName');
    expect(state.sortDirection).toBe('desc');
    expect(state.page).toBe(1);
  });

  it('toggleRecordSelection adds and removes', () => {
    useSpreadsheetStore.getState().toggleRecordSelection('r1');
    expect(useSpreadsheetStore.getState().selectedRecordIds.has('r1')).toBe(true);
    useSpreadsheetStore.getState().toggleRecordSelection('r1');
    expect(useSpreadsheetStore.getState().selectedRecordIds.has('r1')).toBe(false);
  });

  it('selectAllRecords replaces selection', () => {
    useSpreadsheetStore.getState().toggleRecordSelection('r1');
    useSpreadsheetStore.getState().selectAllRecords(['r2', 'r3']);
    const ids = useSpreadsheetStore.getState().selectedRecordIds;
    expect(ids.has('r1')).toBe(false);
    expect(ids.has('r2')).toBe(true);
    expect(ids.has('r3')).toBe(true);
  });

  it('clearSelection empties the set', () => {
    useSpreadsheetStore.getState().selectAllRecords(['r1', 'r2']);
    useSpreadsheetStore.getState().clearSelection();
    expect(useSpreadsheetStore.getState().selectedRecordIds.size).toBe(0);
  });

  it('addPendingSave and removePendingSave', () => {
    const payload = { values: [{ columnKey: 'sport', value: 'Baseball' }] };
    useSpreadsheetStore.getState().addPendingSave('r1', payload);
    expect(useSpreadsheetStore.getState().pendingSaves.get('r1')).toEqual(payload);
    useSpreadsheetStore.getState().removePendingSave('r1');
    expect(useSpreadsheetStore.getState().pendingSaves.has('r1')).toBe(false);
  });

  it('reset restores initial state', () => {
    useSpreadsheetStore.getState().setFilter('errors');
    useSpreadsheetStore.getState().setPage(5);
    useSpreadsheetStore.getState().selectAllRecords(['r1']);
    useSpreadsheetStore.getState().reset();
    const state = useSpreadsheetStore.getState();
    expect(state.activeFilter).toBe('all');
    expect(state.page).toBe(1);
    expect(state.selectedRecordIds.size).toBe(0);
  });
});
```

- [ ] **1.3** Run tests: `cd client && npx vitest run src/stores/__tests__/spreadsheetStore.test.ts`

**Commit:** `feat(store): add spreadsheet Zustand store with query, selection, and pending-save state`

---

## Task 2: useExerciseRecords Hook

**Files:**
- `client/src/hooks/useExerciseRecords.ts`
- `client/src/hooks/__tests__/useExerciseRecords.test.ts`

### Steps

- [ ] **2.1** Create `client/src/hooks/useExerciseRecords.ts`

```typescript
// client/src/hooks/useExerciseRecords.ts
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchExerciseRecords } from '../api/exercises';
import { useSpreadsheetStore } from '../stores/spreadsheetStore';
import type { RecordQueryParams, PaginatedRecords } from '@mapforge/shared/types';

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

  return useQuery<PaginatedRecords>({
    queryKey: ['records', exerciseId, queryParams],
    queryFn: () => fetchExerciseRecords(exerciseId, queryParams),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

/** Partial key for optimistic cache updates via setQueriesData */
export function recordsKeyPrefix(exerciseId: string) {
  return ['records', exerciseId];
}
```

- [ ] **2.2** Create hook test with mocked API and store

```typescript
// client/src/hooks/__tests__/useExerciseRecords.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useExerciseRecords } from '../useExerciseRecords';
import { useSpreadsheetStore } from '../../stores/spreadsheetStore';

vi.mock('../../api/exercises', () => ({
  fetchExerciseRecords: vi.fn().mockResolvedValue({
    records: [{ id: 'r1', sourceData: {}, classifications: {}, recordState: 'new', validationErrors: [], isFullyClassified: false }],
    total: 1,
    page: 1,
    pageSize: 50,
    stats: { totalRecords: 1, classifiedRecords: 0, unclassifiedRecords: 1, errorCount: 0, warningCount: 0, newRecordCount: 1, completionPercentage: 0, columnStats: [] },
  }),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

describe('useExerciseRecords', () => {
  beforeEach(() => {
    useSpreadsheetStore.getState().reset();
  });

  it('returns paginated records', async () => {
    const { result } = renderHook(() => useExerciseRecords('ex1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.records).toHaveLength(1);
    expect(result.current.data?.total).toBe(1);
  });

  it('includes store params in query key', async () => {
    useSpreadsheetStore.getState().setFilter('errors');
    useSpreadsheetStore.getState().setPage(2);
    const { result } = renderHook(() => useExerciseRecords('ex1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
```

- [ ] **2.3** Run tests: `cd client && npx vitest run src/hooks/__tests__/useExerciseRecords.test.ts`

**Commit:** `feat(hooks): add useExerciseRecords hook with store-driven query params and keepPreviousData`

---

## Task 3: Client-Side Validation Service

**Files:**
- `client/src/services/validation.ts`
- `client/src/services/__tests__/validation.test.ts`

### Steps

- [ ] **3.1** Create `client/src/services/validation.ts`

```typescript
// client/src/services/validation.ts
import type { ExerciseColumn, EnrichmentRecord, CellError } from '@mapforge/shared/types';

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
        if (column.config.minValue !== undefined && num < column.config.minValue) {
          errors.push({
            columnKey: column.key,
            severity: 'error',
            message: `Minimum value is ${column.config.minValue}`,
            ruleType: 'range',
          });
        }
        if (column.config.maxValue !== undefined && num > column.config.maxValue) {
          errors.push({
            columnKey: column.key,
            severity: 'error',
            message: `Maximum value is ${column.config.maxValue}`,
            ruleType: 'range',
          });
        }
      }
      break;
    }
    case 'picklist': {
      if (
        column.config.picklistValues &&
        !column.config.picklistValues.includes(value)
      ) {
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
      if (
        column.config.regexPattern &&
        !new RegExp(column.config.regexPattern).test(value)
      ) {
        errors.push({
          columnKey: column.key,
          severity: 'error',
          message:
            column.validationRules.find((r) => r.type === 'regex')?.message ||
            'Invalid format',
          ruleType: 'regex',
        });
      }
      break;
    }
  }

  return errors;
}
```

- [ ] **3.2** Create comprehensive unit tests

```typescript
// client/src/services/__tests__/validation.test.ts
import { describe, it, expect } from 'vitest';
import { validateCell } from '../validation';
import type { ExerciseColumn, EnrichmentRecord } from '@mapforge/shared/types';

const baseRecord: EnrichmentRecord = {
  id: 'r1',
  uniqueKey: {},
  sourceData: {},
  classifications: {},
  recordState: 'new',
  validationErrors: [],
  isFullyClassified: false,
};

function makeColumn(overrides: Partial<ExerciseColumn>): ExerciseColumn {
  return {
    id: 'c1',
    key: 'testCol',
    label: 'Test Column',
    description: null,
    dataType: 'text',
    columnRole: 'classification',
    required: false,
    defaultValue: null,
    config: {},
    validationRules: [],
    referenceLink: null,
    dependentConfig: null,
    visible: true,
    ordinal: 0,
    ...overrides,
  };
}

describe('validateCell', () => {
  describe('required', () => {
    const col = makeColumn({ required: true, label: 'Sport' });

    it('returns error for null', () => {
      const errors = validateCell(null, col, baseRecord);
      expect(errors).toHaveLength(1);
      expect(errors[0].ruleType).toBe('required');
      expect(errors[0].message).toBe('Sport is required');
    });

    it('returns error for empty string', () => {
      const errors = validateCell('', col, baseRecord);
      expect(errors).toHaveLength(1);
      expect(errors[0].ruleType).toBe('required');
    });

    it('passes for non-empty value', () => {
      const errors = validateCell('Baseball', col, baseRecord);
      expect(errors).toHaveLength(0);
    });
  });

  describe('number range', () => {
    const col = makeColumn({
      dataType: 'number',
      config: { minValue: 1, maxValue: 100 },
    });

    it('returns error for non-numeric', () => {
      const errors = validateCell('abc', col, baseRecord);
      expect(errors[0].ruleType).toBe('type');
    });

    it('returns error for below min', () => {
      const errors = validateCell('0', col, baseRecord);
      expect(errors[0].ruleType).toBe('range');
      expect(errors[0].message).toContain('Minimum');
    });

    it('returns error for above max', () => {
      const errors = validateCell('101', col, baseRecord);
      expect(errors[0].ruleType).toBe('range');
      expect(errors[0].message).toContain('Maximum');
    });

    it('passes for valid number', () => {
      expect(validateCell('50', col, baseRecord)).toHaveLength(0);
    });

    it('passes at boundary values', () => {
      expect(validateCell('1', col, baseRecord)).toHaveLength(0);
      expect(validateCell('100', col, baseRecord)).toHaveLength(0);
    });
  });

  describe('picklist enum', () => {
    const col = makeColumn({
      dataType: 'picklist',
      config: { picklistValues: ['Baseball', 'Softball', 'T-Ball'] },
    });

    it('returns error for invalid option', () => {
      const errors = validateCell('Hockey', col, baseRecord);
      expect(errors[0].ruleType).toBe('enum');
      expect(errors[0].message).toContain('"Hockey" is not a valid option');
    });

    it('passes for valid option', () => {
      expect(validateCell('Baseball', col, baseRecord)).toHaveLength(0);
    });
  });

  describe('regex', () => {
    const col = makeColumn({
      dataType: 'text',
      config: { regexPattern: '^[A-Z]{3}-\\d{4}$' },
      validationRules: [
        { type: 'regex', config: {}, severity: 'error', message: 'Must match format XXX-0000' },
      ],
    });

    it('returns error for non-matching value', () => {
      const errors = validateCell('abc', col, baseRecord);
      expect(errors[0].ruleType).toBe('regex');
      expect(errors[0].message).toBe('Must match format XXX-0000');
    });

    it('passes for matching value', () => {
      expect(validateCell('ABC-1234', col, baseRecord)).toHaveLength(0);
    });
  });

  describe('non-required empty', () => {
    it('skips type checks for null on optional column', () => {
      const col = makeColumn({ dataType: 'number', config: { minValue: 1 } });
      expect(validateCell(null, col, baseRecord)).toHaveLength(0);
    });

    it('skips type checks for empty string on optional column', () => {
      const col = makeColumn({ dataType: 'picklist', config: { picklistValues: ['A'] } });
      expect(validateCell('', col, baseRecord)).toHaveLength(0);
    });
  });
});
```

- [ ] **3.3** Run tests: `cd client && npx vitest run src/services/__tests__/validation.test.ts`

**Commit:** `feat(validation): add client-side validateCell service with required, range, enum, and regex rules`

---

## Task 4: AG Grid Column Definition Builder

**Files:**
- `client/src/components/grid/buildColumnDefs.ts`
- `client/src/components/grid/__tests__/buildColumnDefs.test.ts`
- `client/src/components/grid/grid.css`

### Steps

- [ ] **4.1** Create `client/src/components/grid/grid.css`

```css
/* client/src/components/grid/grid.css */

/* Source columns (read-only) */
.source-cell {
  background-color: var(--color-forge-900);
  color: var(--color-forge-400);
}
.source-header {
  background-color: var(--color-forge-900);
  color: var(--color-forge-400);
}

/* Classification columns (editable) */
.classification-cell {
  background-color: var(--color-forge-950);
  color: var(--color-forge-50);
}
.classification-header {
  background-color: var(--color-forge-900);
  border-bottom: 2px solid var(--color-amber-500);
}

/* Separator */
.separator-cell {
  background-color: var(--color-forge-700);
}
.separator-header {
  background-color: var(--color-forge-700);
}

/* Row states */
.row-new {
  background-color: rgba(8, 145, 178, 0.08);
}
.row-changed {
  background-color: rgba(234, 179, 8, 0.06);
}
.row-error .classification-cell {
  border-left: 2px solid var(--color-status-error);
}
.row-classified {
  border-left: 2px solid var(--color-status-clean);
}
```

- [ ] **4.2** Create `client/src/components/grid/buildColumnDefs.ts`

```typescript
// client/src/components/grid/buildColumnDefs.ts
import type { ColDef } from 'ag-grid-community';
import type { ExerciseDetail } from '@mapforge/shared/types';

export function buildColumnDefs(exercise: ExerciseDetail): ColDef[] {
  const cols: ColDef[] = [];

  // 1. Row status column (pinned left)
  // Note: Checkbox selection is handled by gridOptions.rowSelection object (AG Grid 31+).
  // No explicit checkbox column def needed.
  cols.push({
    headerName: '',
    field: '__status',
    width: 44,
    pinned: 'left',
    cellRenderer: 'rowStatusRenderer',
    suppressMovable: true,
    lockPosition: true,
    sortable: false,
    filter: false,
    resizable: false,
  });

  // 2. Source columns (read-only)
  for (const col of exercise.sourceColumns.filter((c) => c.visible)) {
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

  // 3. Visual separator column
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

  // 4. Classification columns (editable, unless computed)
  for (const col of exercise.classificationColumns.filter((c) => c.visible)) {
    const isEditable = col.columnRole === 'classification';
    const colDef: ColDef = {
      headerName: col.label,
      field: `classifications.${col.key}`,
      editable: isEditable,
      sortable: true,
      filter: true,
      resizable: true,
      cellClass: isEditable ? 'classification-cell' : 'source-cell',
      headerClass: 'classification-header',
      headerComponent: 'classificationColumnHeader',
      headerComponentParams: { column: col },
    };

    if (isEditable) {
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

      // Validation renderer (except for boolean which has its own renderer)
      if (col.dataType !== 'boolean') {
        colDef.cellRenderer = 'validationCellRenderer';
        colDef.cellRendererParams = { column: col };
      }
    }

    cols.push(colDef);
  }

  return cols;
}
```

- [ ] **4.3** Create unit tests for column builder

```typescript
// client/src/components/grid/__tests__/buildColumnDefs.test.ts
import { describe, it, expect } from 'vitest';
import { buildColumnDefs } from '../buildColumnDefs';
import type { ExerciseDetail, ExerciseColumn } from '@mapforge/shared/types';

function makeCol(overrides: Partial<ExerciseColumn>): ExerciseColumn {
  return {
    id: 'c1', key: 'col1', label: 'Col 1', description: null,
    dataType: 'text', columnRole: 'source', required: false,
    defaultValue: null, config: {}, validationRules: [],
    referenceLink: null, dependentConfig: null, visible: true, ordinal: 0,
    ...overrides,
  };
}

function makeExercise(
  sourceColumns: ExerciseColumn[],
  classificationColumns: ExerciseColumn[]
): ExerciseDetail {
  return {
    id: 'ex1', name: 'Test', description: '', status: 'active',
    sourceColumns, classificationColumns,
    deadline: null, lastRefreshedAt: '2026-01-01',
  };
}

describe('buildColumnDefs', () => {
  it('starts with status column pinned left', () => {
    const defs = buildColumnDefs(makeExercise([], []));
    expect(defs[0].field).toBe('__status');
    expect(defs[0].pinned).toBe('left');
    expect(defs[0].cellRenderer).toBe('rowStatusRenderer');
  });

  it('generates source columns as read-only', () => {
    const src = makeCol({ key: 'siteId', label: 'Site ID', visible: true });
    const defs = buildColumnDefs(makeExercise([src], []));
    const srcDef = defs.find((d) => d.field === 'sourceData.siteId');
    expect(srcDef).toBeDefined();
    expect(srcDef!.editable).toBe(false);
    expect(srcDef!.cellClass).toBe('source-cell');
    expect(srcDef!.headerComponent).toBe('sourceColumnHeader');
  });

  it('inserts separator column between source and classification', () => {
    const src = makeCol({ key: 's1', visible: true });
    const cls = makeCol({ key: 'c1', columnRole: 'classification', visible: true });
    const defs = buildColumnDefs(makeExercise([src], [cls]));
    // status, source, separator, classification
    expect(defs[2].cellClass).toBe('separator-cell');
    expect(defs[2].width).toBe(4);
  });

  it('maps picklist to dependentPicklistEditor', () => {
    const cls = makeCol({ key: 'sport', dataType: 'picklist', columnRole: 'classification', visible: true });
    const defs = buildColumnDefs(makeExercise([], [cls]));
    const col = defs.find((d) => d.field === 'classifications.sport');
    expect(col!.cellEditor).toBe('dependentPicklistEditor');
    expect(col!.cellEditorPopup).toBe(true);
  });

  it('maps number to agNumberCellEditor with min/max', () => {
    const cls = makeCol({
      key: 'weight', dataType: 'number', columnRole: 'classification',
      config: { minValue: 0, maxValue: 10 }, visible: true,
    });
    const defs = buildColumnDefs(makeExercise([], [cls]));
    const col = defs.find((d) => d.field === 'classifications.weight');
    expect(col!.cellEditor).toBe('agNumberCellEditor');
    expect(col!.cellEditorParams).toEqual({ min: 0, max: 10 });
  });

  it('maps date to dateCellEditor popup', () => {
    const cls = makeCol({ key: 'd1', dataType: 'date', columnRole: 'classification', visible: true });
    const defs = buildColumnDefs(makeExercise([], [cls]));
    const col = defs.find((d) => d.field === 'classifications.d1');
    expect(col!.cellEditor).toBe('dateCellEditor');
    expect(col!.cellEditorPopup).toBe(true);
  });

  it('maps boolean to custom renderer and editor', () => {
    const cls = makeCol({ key: 'b1', dataType: 'boolean', columnRole: 'classification', visible: true });
    const defs = buildColumnDefs(makeExercise([], [cls]));
    const col = defs.find((d) => d.field === 'classifications.b1');
    expect(col!.cellEditor).toBe('booleanCellEditor');
    expect(col!.cellRenderer).toBe('booleanCellRenderer');
  });

  it('maps multi_select to multiSelectEditor popup', () => {
    const cls = makeCol({ key: 'm1', dataType: 'multi_select', columnRole: 'classification', visible: true });
    const defs = buildColumnDefs(makeExercise([], [cls]));
    const col = defs.find((d) => d.field === 'classifications.m1');
    expect(col!.cellEditor).toBe('multiSelectEditor');
    expect(col!.cellEditorPopup).toBe(true);
  });

  it('excludes hidden columns', () => {
    const hidden = makeCol({ key: 'secret', visible: false });
    const defs = buildColumnDefs(makeExercise([hidden], []));
    expect(defs.find((d) => d.field === 'sourceData.secret')).toBeUndefined();
  });

  it('renders computed columns as read-only with source-cell style', () => {
    const computed = makeCol({ key: 'comp', columnRole: 'computed', visible: true });
    const defs = buildColumnDefs(makeExercise([], [computed]));
    const col = defs.find((d) => d.field === 'classifications.comp');
    expect(col!.editable).toBe(false);
    expect(col!.cellClass).toBe('source-cell');
  });
});
```

- [ ] **4.4** Run tests: `cd client && npx vitest run src/components/grid/__tests__/buildColumnDefs.test.ts`

**Commit:** `feat(grid): add column definition builder and grid CSS classes`

---

## Task 5: Row Status Renderer

**Files:**
- `client/src/components/grid/RowStatusRenderer.tsx`

### Steps

- [ ] **5.1** Create `client/src/components/grid/RowStatusRenderer.tsx`

```typescript
// client/src/components/grid/RowStatusRenderer.tsx
import { forwardRef } from 'react';
import type { ICellRendererParams } from 'ag-grid-community';
import { Circle, Check, Minus, AlertTriangle, XCircle } from 'lucide-react';
import type { EnrichmentRecord } from '@mapforge/shared/types';

interface RowStatusRendererProps extends ICellRendererParams {
  data: EnrichmentRecord;
}

export const RowStatusRenderer = forwardRef<HTMLDivElement, RowStatusRendererProps>(
  function RowStatusRenderer(props, ref) {
    const record = props.data;
    if (!record) return null;

    const hasErrors = record.validationErrors.length > 0;

    let icon: React.ReactNode;
    let tooltip: string;

    if (hasErrors) {
      icon = <XCircle size={16} className="text-status-error" />;
      tooltip = `${record.validationErrors.length} validation error(s)`;
    } else if (record.recordState === 'new') {
      icon = <Circle size={16} className="text-cyan-400 fill-cyan-400" />;
      tooltip = 'New record';
    } else if (record.recordState === 'changed') {
      icon = <AlertTriangle size={16} className="text-amber-400" />;
      tooltip = 'Source data changed since last classification';
    } else if (record.isFullyClassified) {
      icon = <Check size={16} className="text-status-clean" />;
      tooltip = 'Fully classified';
    } else {
      icon = <Minus size={16} className="text-forge-600" />;
      tooltip = 'Unclassified';
    }

    return (
      <div
        ref={ref}
        className={['flex items-center justify-center w-full h-full'].join(' ')}
        title={tooltip}
      >
        {icon}
      </div>
    );
  }
);
```

**Commit:** `feat(grid): add RowStatusRenderer with status icons and tooltips`

---

## Task 6: Source and Classification Column Headers

**Files:**
- `client/src/components/grid/SourceColumnHeader.tsx`
- `client/src/components/grid/ClassificationColumnHeader.tsx`

### Steps

- [ ] **6.1** Create `client/src/components/grid/SourceColumnHeader.tsx`

```typescript
// client/src/components/grid/SourceColumnHeader.tsx
import { forwardRef } from 'react';
import type { IHeaderParams } from 'ag-grid-community';
import { Lock } from 'lucide-react';
import type { ExerciseColumn } from '@mapforge/shared/types';

interface SourceColumnHeaderProps extends IHeaderParams {
  column: ExerciseColumn;
}

export const SourceColumnHeader = forwardRef<HTMLDivElement, SourceColumnHeaderProps>(
  function SourceColumnHeader(props, ref) {
    const col = props.column;

    return (
      <div
        ref={ref}
        className={[
          'flex items-center gap-1.5 px-2 w-full h-full',
          'text-forge-400 text-xs font-medium uppercase tracking-wide',
        ].join(' ')}
        title={col.description || col.label}
      >
        <Lock size={12} className="text-forge-500 shrink-0" />
        <span className="truncate">{props.displayName}</span>
      </div>
    );
  }
);
```

- [ ] **6.2** Create `client/src/components/grid/ClassificationColumnHeader.tsx`

```typescript
// client/src/components/grid/ClassificationColumnHeader.tsx
import { forwardRef } from 'react';
import type { IHeaderParams } from 'ag-grid-community';
import { List, Hash, Calendar, Type, ToggleLeft, CheckSquare } from 'lucide-react';
import type { ExerciseColumn } from '@mapforge/shared/types';

const DATA_TYPE_ICONS: Record<string, React.ElementType> = {
  picklist: List,
  number: Hash,
  date: Calendar,
  text: Type,
  boolean: ToggleLeft,
  multi_select: CheckSquare,
};

interface ClassificationColumnHeaderProps extends IHeaderParams {
  column: ExerciseColumn;
}

export const ClassificationColumnHeader = forwardRef<
  HTMLDivElement,
  ClassificationColumnHeaderProps
>(function ClassificationColumnHeader(props, ref) {
  const col = props.column;
  const Icon = DATA_TYPE_ICONS[col.dataType] || Type;

  const tooltipLines = [col.description || col.label, `Type: ${col.dataType}`];
  if (col.required) tooltipLines.push('Required');
  if (col.validationRules.length > 0) {
    tooltipLines.push(
      `Validation: ${col.validationRules.map((r) => r.type).join(', ')}`
    );
  }

  return (
    <div
      ref={ref}
      className={[
        'flex items-center gap-1.5 px-2 w-full h-full',
        'text-forge-50 text-xs font-semibold',
      ].join(' ')}
      title={tooltipLines.join('\n')}
    >
      <Icon size={12} className="text-forge-400 shrink-0" />
      <span className="truncate">{props.displayName}</span>
      {col.required && (
        <span className="text-amber-400 text-[10px] font-bold shrink-0">*</span>
      )}
    </div>
  );
});
```

**Commit:** `feat(grid): add SourceColumnHeader and ClassificationColumnHeader components`

---

## Task 7: Validation Cell Renderer

**Files:**
- `client/src/components/grid/ValidationCellRenderer.tsx`
- `client/src/components/grid/CellErrorPopover.tsx`

### Steps

- [ ] **7.1** Create `client/src/components/grid/CellErrorPopover.tsx`

```typescript
// client/src/components/grid/CellErrorPopover.tsx
import { forwardRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { CellError } from '@mapforge/shared/types';

interface CellErrorPopoverProps {
  errors: CellError[];
  style?: React.CSSProperties;
}

export const CellErrorPopover = forwardRef<HTMLDivElement, CellErrorPopoverProps>(
  function CellErrorPopover({ errors, style }, ref) {
    if (errors.length === 0) return null;

    return (
      <div
        ref={ref}
        style={style}
        className={[
          'bg-forge-800 border rounded-md p-2 shadow-lg z-50',
          'border-status-error/30',
        ].join(' ')}
      >
        {errors.map((err, i) => (
          <div key={i} className="flex gap-2 items-start py-0.5">
            <AlertTriangle
              size={12}
              className={[
                'shrink-0 mt-0.5',
                err.severity === 'error' ? 'text-status-error' : 'text-amber-400',
              ].join(' ')}
            />
            <span className="text-sm text-forge-200">{err.message}</span>
          </div>
        ))}
      </div>
    );
  }
);
```

- [ ] **7.2** Create `client/src/components/grid/ValidationCellRenderer.tsx`

```typescript
// client/src/components/grid/ValidationCellRenderer.tsx
import { forwardRef, useState, useRef } from 'react';
import type { ICellRendererParams } from 'ag-grid-community';
import { AlertTriangle } from 'lucide-react';
import { CellErrorPopover } from './CellErrorPopover';
import type { ExerciseColumn, EnrichmentRecord, CellError } from '@mapforge/shared/types';

interface ValidationCellRendererProps extends ICellRendererParams {
  column: ExerciseColumn;
  data: EnrichmentRecord;
  value: string | null;
}

export const ValidationCellRenderer = forwardRef<HTMLDivElement, ValidationCellRendererProps>(
  function ValidationCellRenderer(props, ref) {
    const { value, column, data } = props;
    const [showPopover, setShowPopover] = useState(false);
    const cellRef = useRef<HTMLDivElement>(null);

    const cellErrors: CellError[] = data?.validationErrors?.filter(
      (e) => e.columnKey === column.key
    ) || [];

    const hasErrors = cellErrors.length > 0;
    const isEmpty = value === null || value === '';

    return (
      <div
        ref={(node) => {
          (cellRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        className={[
          'flex items-center w-full h-full px-2 relative',
          hasErrors ? 'ring-1 ring-status-error rounded-sm' : '',
        ].join(' ')}
        onMouseEnter={() => hasErrors && setShowPopover(true)}
        onMouseLeave={() => setShowPopover(false)}
      >
        {isEmpty && column.required ? (
          <span className="text-forge-600 text-sm italic">
            {column.dataType === 'picklist' || column.dataType === 'multi_select'
              ? 'Select...'
              : 'Enter...'}
          </span>
        ) : (
          <span className="truncate text-sm">{value}</span>
        )}

        {hasErrors && (
          <AlertTriangle
            size={12}
            className="text-status-error shrink-0 ml-auto"
          />
        )}

        {showPopover && hasErrors && (
          <div className="absolute top-full left-0 mt-1">
            <CellErrorPopover errors={cellErrors} />
          </div>
        )}
      </div>
    );
  }
);
```

**Commit:** `feat(grid): add ValidationCellRenderer and CellErrorPopover components`

---

## Task 8: DependentPicklistEditor

**Files:**
- `client/src/components/grid/DependentPicklistEditor.tsx`
- `client/src/hooks/useDependentOptions.ts`

### Steps

- [ ] **8.1** Create `client/src/hooks/useDependentOptions.ts`

```typescript
// client/src/hooks/useDependentOptions.ts
import { useQuery } from '@tanstack/react-query';
import { fetchReferenceTableValues } from '../api/reference-tables';
import type { ExerciseColumn } from '@mapforge/shared/types';

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

- [ ] **8.2** Create `client/src/components/grid/DependentPicklistEditor.tsx`

```typescript
// client/src/components/grid/DependentPicklistEditor.tsx
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ICellEditorParams } from 'ag-grid-community';
import { useDependentOptions } from '../../hooks/useDependentOptions';
import type { ExerciseColumn, EnrichmentRecord } from '@mapforge/shared/types';

interface DependentPicklistEditorProps extends ICellEditorParams {
  column: ExerciseColumn;
  data: EnrichmentRecord;
  value: string | null;
}

export const DependentPicklistEditor = forwardRef<unknown, DependentPicklistEditorProps>(
  function DependentPicklistEditor(props, ref) {
    const { column, data, value: initialValue, stopEditing } = props;
    const [value, setValue] = useState<string | null>(initialValue);
    const [search, setSearch] = useState('');
    const [highlightIndex, setHighlightIndex] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Determine parent value for dependent picklists
    const parentColumnKey = column.dependentConfig?.parentColumnKey;
    const parentValue = parentColumnKey
      ? (data.classifications[parentColumnKey] as string | null) ?? null
      : null;

    const hasDependency = !!column.dependentConfig;
    const parentMissing = hasDependency && !parentValue;

    // Fetch dependent options (only if dependency exists and parent has a value)
    const { data: dependentData, isLoading } = useDependentOptions(column, parentValue);

    // Resolve available options
    const options = useMemo(() => {
      if (hasDependency) {
        return dependentData?.values ?? [];
      }
      return column.config.picklistValues ?? [];
    }, [hasDependency, dependentData, column.config.picklistValues]);

    const filtered = useMemo(() => {
      if (!search) return options;
      const lower = search.toLowerCase();
      return options.filter((opt) => opt.toLowerCase().includes(lower));
    }, [options, search]);

    // Expose getValue for AG Grid
    useImperativeHandle(ref, () => ({
      getValue: () => value,
    }));

    // Focus search input on mount
    useEffect(() => {
      inputRef.current?.focus();
    }, []);

    // Reset highlight when filtered list changes
    useEffect(() => {
      setHighlightIndex(0);
    }, [filtered.length]);

    const selectOption = useCallback(
      (opt: string | null) => {
        setValue(opt);
        // Defer stopEditing to let AG Grid pick up the new value
        setTimeout(() => stopEditing(), 0);
      },
      [stopEditing]
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setHighlightIndex((prev) => Math.min(prev + 1, filtered.length - 1));
            break;
          case 'ArrowUp':
            e.preventDefault();
            setHighlightIndex((prev) => Math.max(prev - 1, 0));
            break;
          case 'Enter':
            e.preventDefault();
            if (filtered[highlightIndex]) {
              selectOption(filtered[highlightIndex]);
            }
            break;
          case 'Escape':
            e.preventDefault();
            stopEditing();
            break;
        }
      },
      [filtered, highlightIndex, selectOption, stopEditing]
    );

    // Scroll highlighted item into view
    useEffect(() => {
      const container = listRef.current;
      if (!container) return;
      const items = container.querySelectorAll('[data-option]');
      items[highlightIndex]?.scrollIntoView({ block: 'nearest' });
    }, [highlightIndex]);

    // Parent missing state
    if (parentMissing) {
      const parentLabel = parentColumnKey || 'parent';
      return (
        <div
          className={[
            'bg-forge-850 border border-forge-700 rounded-md shadow-xl',
            'min-w-[200px] max-w-[320px] p-4',
          ].join(' ')}
        >
          <p className="text-sm text-forge-400">
            Select <span className="text-forge-200 font-medium">{parentLabel}</span> first
          </p>
        </div>
      );
    }

    return (
      <div
        className={[
          'bg-forge-850 border border-forge-700 rounded-md shadow-xl',
          'min-w-[200px] max-w-[320px] flex flex-col',
        ].join(' ')}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="sticky top-0 border-b border-forge-700 p-1.5">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className={[
              'w-full px-2 py-1 text-sm rounded',
              'bg-forge-900 border border-forge-700 text-forge-100',
              'placeholder:text-forge-500',
              'focus:outline-none focus:ring-1 focus:ring-amber-500/40',
            ].join(' ')}
          />
        </div>

        {/* Options list */}
        <div ref={listRef} className="max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="px-3 py-2 text-sm text-forge-500">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-forge-500">No matches</div>
          ) : (
            filtered.map((opt, i) => (
              <div
                key={opt}
                data-option
                onClick={() => selectOption(opt)}
                className={[
                  'px-3 py-1.5 text-sm cursor-pointer',
                  i === highlightIndex ? 'bg-forge-800' : '',
                  opt === value
                    ? 'bg-amber-600/10 text-amber-400'
                    : 'text-forge-200 hover:bg-forge-800',
                ].join(' ')}
              >
                {opt}
              </div>
            ))
          )}
        </div>

        {/* Clear button */}
        {value && !column.required && (
          <div className="border-t border-forge-700 p-1.5">
            <button
              onClick={() => selectOption(null)}
              className={[
                'w-full px-2 py-1 text-xs text-forge-400 rounded',
                'hover:bg-forge-800 hover:text-forge-200',
              ].join(' ')}
            >
              Clear selection
            </button>
          </div>
        )}
      </div>
    );
  }
);
```

**Commit:** `feat(grid): add DependentPicklistEditor with parent-driven option filtering and keyboard navigation`

---

## Task 9: Additional Cell Editors

**Files:**
- `client/src/components/grid/MultiSelectEditor.tsx`
- `client/src/components/grid/DateCellEditor.tsx`
- `client/src/components/grid/BooleanCellRenderer.tsx`
- `client/src/components/grid/BooleanCellEditor.tsx`

### Steps

- [ ] **9.1** Create `client/src/components/grid/MultiSelectEditor.tsx`

```typescript
// client/src/components/grid/MultiSelectEditor.tsx
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ICellEditorParams } from 'ag-grid-community';
import type { ExerciseColumn } from '@mapforge/shared/types';

interface MultiSelectEditorProps extends ICellEditorParams {
  column: ExerciseColumn;
  value: string | null;
}

export const MultiSelectEditor = forwardRef<unknown, MultiSelectEditorProps>(
  function MultiSelectEditor(props, ref) {
    const { column, value: initialValue, stopEditing } = props;
    const options = column.config.picklistValues ?? [];
    const [selected, setSelected] = useState<Set<string>>(() => {
      if (!initialValue) return new Set();
      return new Set(initialValue.split(',').map((s) => s.trim()).filter(Boolean));
    });
    const [search, setSearch] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      getValue: () => {
        const arr = Array.from(selected);
        return arr.length > 0 ? arr.join(', ') : null;
      },
    }));

    useEffect(() => {
      inputRef.current?.focus();
    }, []);

    const filtered = useMemo(() => {
      if (!search) return options;
      const lower = search.toLowerCase();
      return options.filter((opt) => opt.toLowerCase().includes(lower));
    }, [options, search]);

    const toggle = (opt: string) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(opt)) next.delete(opt);
        else next.add(opt);
        return next;
      });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        stopEditing();
      }
    };

    return (
      <div
        className={[
          'bg-forge-850 border border-forge-700 rounded-md shadow-xl',
          'min-w-[200px] max-w-[320px] flex flex-col',
        ].join(' ')}
        onKeyDown={handleKeyDown}
      >
        {/* Search */}
        <div className="sticky top-0 border-b border-forge-700 p-1.5">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className={[
              'w-full px-2 py-1 text-sm rounded',
              'bg-forge-900 border border-forge-700 text-forge-100',
              'placeholder:text-forge-500',
              'focus:outline-none focus:ring-1 focus:ring-amber-500/40',
            ].join(' ')}
          />
        </div>

        {/* Select All / Clear All */}
        <div className="flex gap-2 px-3 py-1.5 border-b border-forge-700">
          <button
            onClick={() => setSelected(new Set(options))}
            className="text-xs text-amber-400 hover:text-amber-300"
          >
            Select All
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-forge-400 hover:text-forge-300"
          >
            Clear All
          </button>
        </div>

        {/* Options */}
        <div className="max-h-60 overflow-y-auto">
          {filtered.map((opt) => (
            <label
              key={opt}
              className={[
                'flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer',
                'hover:bg-forge-800',
                selected.has(opt) ? 'text-amber-400' : 'text-forge-200',
              ].join(' ')}
            >
              <input
                type="checkbox"
                checked={selected.has(opt)}
                onChange={() => toggle(opt)}
                className="accent-amber-500"
              />
              {opt}
            </label>
          ))}
        </div>

        {/* Done button */}
        <div className="border-t border-forge-700 p-1.5">
          <button
            onClick={() => stopEditing()}
            className={[
              'w-full px-2 py-1 text-xs font-medium rounded',
              'bg-amber-600/20 text-amber-400 hover:bg-amber-600/30',
            ].join(' ')}
          >
            Done ({selected.size} selected)
          </button>
        </div>
      </div>
    );
  }
);
```

- [ ] **9.2** Create `client/src/components/grid/DateCellEditor.tsx`

```typescript
// client/src/components/grid/DateCellEditor.tsx
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { ICellEditorParams } from 'ag-grid-community';
import type { ExerciseColumn } from '@mapforge/shared/types';

interface DateCellEditorProps extends ICellEditorParams {
  column: ExerciseColumn;
  value: string | null;
}

export const DateCellEditor = forwardRef<unknown, DateCellEditorProps>(
  function DateCellEditor(props, ref) {
    const { column, value: initialValue, stopEditing } = props;
    const [value, setValue] = useState(initialValue ?? '');
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      getValue: () => value || null,
    }));

    useEffect(() => {
      inputRef.current?.focus();
    }, []);

    return (
      <div
        className={[
          'bg-forge-850 border border-forge-700 rounded-md shadow-xl p-2',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="date"
          value={value}
          min={column.config.minDate}
          max={column.config.maxDate}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              stopEditing();
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              stopEditing();
            }
          }}
          className={[
            'px-2 py-1 text-sm rounded',
            'bg-forge-900 border border-forge-700 text-forge-100',
            'focus:outline-none focus:ring-1 focus:ring-amber-500/40',
          ].join(' ')}
        />
        {!column.required && value && (
          <button
            onClick={() => {
              setValue('');
              setTimeout(() => stopEditing(), 0);
            }}
            className="mt-1 text-xs text-forge-400 hover:text-forge-200"
          >
            Clear
          </button>
        )}
      </div>
    );
  }
);
```

- [ ] **9.3** Create `client/src/components/grid/BooleanCellRenderer.tsx`

```typescript
// client/src/components/grid/BooleanCellRenderer.tsx
import { forwardRef } from 'react';
import type { ICellRendererParams } from 'ag-grid-community';

export const BooleanCellRenderer = forwardRef<HTMLDivElement, ICellRendererParams>(
  function BooleanCellRenderer(props, ref) {
    const value = props.value;
    const isTrue = value === 'true' || value === true;

    return (
      <div
        ref={ref}
        className="flex items-center justify-center w-full h-full"
      >
        <div
          className={[
            'w-8 h-4 rounded-full relative transition-colors',
            isTrue ? 'bg-amber-500' : 'bg-forge-700',
          ].join(' ')}
        >
          <div
            className={[
              'w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform',
              isTrue ? 'translate-x-4' : 'translate-x-0.5',
            ].join(' ')}
          />
        </div>
      </div>
    );
  }
);
```

- [ ] **9.4** Create `client/src/components/grid/BooleanCellEditor.tsx`

```typescript
// client/src/components/grid/BooleanCellEditor.tsx
import { forwardRef, useImperativeHandle, useState } from 'react';
import type { ICellEditorParams } from 'ag-grid-community';

export const BooleanCellEditor = forwardRef<unknown, ICellEditorParams>(
  function BooleanCellEditor(props, ref) {
    const { value: initialValue, stopEditing } = props;
    const isTrue = initialValue === 'true' || initialValue === true;
    const [value] = useState(!isTrue); // Toggle immediately on edit start

    useImperativeHandle(ref, () => ({
      getValue: () => String(value),
    }));

    // Immediately stop editing after toggle
    setTimeout(() => stopEditing(), 0);

    return null; // No visible editor -- toggle happens instantly
  }
);
```

**Commit:** `feat(grid): add MultiSelectEditor, DateCellEditor, BooleanCellRenderer, and BooleanCellEditor`

---

## Task 10: Auto-Save System

**Files:**
- `client/src/hooks/useAutoSave.ts`
- `client/src/hooks/__tests__/useAutoSave.test.ts`

### Steps

- [ ] **10.1** Create `client/src/hooks/useAutoSave.ts`

```typescript
// client/src/hooks/useAutoSave.ts
import { useEffect, useMemo, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import debounce from 'lodash-es/debounce';
import toast from 'react-hot-toast';
import { classifyRecord } from '../api/exercises';
import { useSpreadsheetStore } from '../stores/spreadsheetStore';
import type {
  ClassificationPayload,
  ClassificationResult,
  PaginatedRecords,
} from '@mapforge/shared/types';

export function useAutoSave(exerciseId: string) {
  const queryClient = useQueryClient();
  const { addPendingSave, removePendingSave } = useSpreadsheetStore();

  const mutation = useMutation<
    ClassificationResult,
    Error,
    { recordId: string; values: ClassificationPayload }
  >({
    mutationFn: (args) =>
      classifyRecord(exerciseId, args.recordId, args.values),
    retry: 1,

    onMutate: async ({ recordId, values }) => {
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

      queryClient.setQueriesData<PaginatedRecords>(
        { queryKey: ['records', exerciseId] },
        updateRecords
      );
    },

    onSuccess: (result, { recordId }) => {
      removePendingSave(recordId);
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

    onError: (_err, { recordId }) => {
      removePendingSave(recordId);
      queryClient.invalidateQueries({ queryKey: ['records', exerciseId] });
      toast.error('Failed to save classification. Retrying...');
    },
  });

  // Stable debounced save using useRef pattern
  const mutateRef = useRef(mutation.mutate);
  mutateRef.current = mutation.mutate;

  const debouncedSave = useMemo(
    () =>
      debounce((recordId: string, values: ClassificationPayload) => {
        mutateRef.current({ recordId, values });
      }, 300),
    []
  );

  // Cleanup on unmount
  useEffect(() => () => debouncedSave.cancel(), [debouncedSave]);

  return { save: debouncedSave, isPending: mutation.isPending };
}
```

- [ ] **10.2** Create hook test

```typescript
// client/src/hooks/__tests__/useAutoSave.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useAutoSave } from '../useAutoSave';
import { useSpreadsheetStore } from '../../stores/spreadsheetStore';

const mockClassify = vi.fn().mockResolvedValue({
  validationErrors: [],
  isFullyClassified: true,
  updatedStats: {
    totalRecords: 10, classifiedRecords: 5, unclassifiedRecords: 5,
    errorCount: 0, warningCount: 0, newRecordCount: 0,
    completionPercentage: 50, columnStats: [],
  },
});

vi.mock('../../api/exercises', () => ({
  classifyRecord: (...args: unknown[]) => mockClassify(...args),
}));

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn() },
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSpreadsheetStore.getState().reset();
    vi.useFakeTimers();
  });

  it('debounces save calls by 300ms', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => useAutoSave('ex1'), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.save('r1', { values: [{ columnKey: 'sport', value: 'Baseball' }] });
    });

    // Should not fire immediately
    expect(mockClassify).not.toHaveBeenCalled();

    // Wait for debounce
    await waitFor(() => expect(mockClassify).toHaveBeenCalledTimes(1), { timeout: 1000 });
  });

  it('returns isPending status', () => {
    vi.useRealTimers();
    const { result } = renderHook(() => useAutoSave('ex1'), {
      wrapper: createWrapper(),
    });
    expect(result.current.isPending).toBe(false);
  });
});
```

- [ ] **10.3** Run tests: `cd client && npx vitest run src/hooks/__tests__/useAutoSave.test.ts`

**Commit:** `feat(hooks): add useAutoSave hook with debounced mutation and optimistic cache updates`

---

## Task 11: SpreadsheetHeader

**Files:**
- `client/src/components/grid/SpreadsheetHeader.tsx`
- `client/src/components/grid/QuickFilterBar.tsx`

### Steps

- [ ] **11.1** Create `client/src/components/grid/QuickFilterBar.tsx`

```typescript
// client/src/components/grid/QuickFilterBar.tsx
import type { QuickFilter } from '../../stores/spreadsheetStore';

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

const FILTERS: Array<{ key: QuickFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'unclassified', label: 'Unclassified' },
  { key: 'classified', label: 'Classified' },
  { key: 'errors', label: 'Has Errors' },
  { key: 'new', label: 'New Records' },
];

export function QuickFilterBar({ activeFilter, counts, onChange }: QuickFilterBarProps) {
  return (
    <div className="flex gap-2">
      {FILTERS.map(({ key, label }) => {
        const isActive = activeFilter === key;
        const count = counts[key];

        // Special color for errors and new when active
        let activeClasses = 'bg-amber-600/10 text-amber-400 border-amber-500/30';
        if (isActive && key === 'errors' && count > 0) {
          activeClasses = 'bg-status-error/10 text-status-error border-status-error/30';
        } else if (isActive && key === 'new' && count > 0) {
          activeClasses = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
        }

        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={[
              'px-3 py-1 rounded-full text-xs font-medium cursor-pointer border transition-colors',
              isActive
                ? activeClasses
                : 'bg-forge-850 text-forge-400 border-forge-750 hover:border-forge-600',
            ].join(' ')}
          >
            {label}{' '}
            <span
              className={[
                isActive ? 'opacity-80' : 'text-forge-500',
              ].join(' ')}
            >
              ({count})
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **11.2** Create `client/src/components/grid/SpreadsheetHeader.tsx`

```typescript
// client/src/components/grid/SpreadsheetHeader.tsx
import { Search, Pencil, Download } from 'lucide-react';
import { QuickFilterBar } from './QuickFilterBar';
import type { QuickFilter } from '../../stores/spreadsheetStore';
import type { ExerciseDetail, ExerciseStats } from '@mapforge/shared/types';

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

export function SpreadsheetHeader({
  stats,
  activeFilter,
  searchQuery,
  selectedCount,
  onFilterChange,
  onSearchChange,
  onBulkEdit,
  onExportCsv,
}: SpreadsheetHeaderProps) {
  const pct = stats.completionPercentage;

  return (
    <div className="px-6 py-3 bg-forge-900 border-b border-forge-800 space-y-3">
      {/* Row 1: Progress */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-forge-200">
            {stats.classifiedRecords} of {stats.totalRecords} records classified ({pct}%)
          </span>
        </div>
        <div className="w-full h-2 bg-forge-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        {/* Column-level stats */}
        {stats.columnStats.length > 0 && (
          <div className="flex gap-4 mt-2">
            {stats.columnStats.map((cs) => {
              let colorClass = 'text-forge-400';
              if (cs.percentage >= 100) colorClass = 'text-status-clean';
              else if (cs.percentage >= 50) colorClass = 'text-amber-400';
              return (
                <span key={cs.columnKey} className="text-xs">
                  <span className="text-forge-400">{cs.label}: </span>
                  <span className={colorClass}>{cs.percentage}%</span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Row 2: Filters + Actions */}
      <div className="flex items-center justify-between">
        <QuickFilterBar
          activeFilter={activeFilter}
          counts={{
            all: stats.totalRecords,
            unclassified: stats.unclassifiedRecords,
            classified: stats.classifiedRecords,
            errors: stats.errorCount,
            new: stats.newRecordCount,
          }}
          onChange={onFilterChange}
        />

        <div className="flex gap-2 items-center">
          {/* Search */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-forge-500"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search records..."
              className={[
                'w-64 pl-8 pr-3 py-1.5 text-sm rounded',
                'bg-forge-850 border border-forge-750 text-forge-100',
                'placeholder:text-forge-500',
                'focus:outline-none focus:ring-1 focus:ring-amber-500/40',
              ].join(' ')}
            />
          </div>

          {/* Bulk Edit */}
          <button
            onClick={onBulkEdit}
            disabled={selectedCount === 0}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border',
              selectedCount === 0
                ? 'bg-forge-850 text-forge-600 border-forge-750 cursor-not-allowed'
                : 'bg-forge-850 text-forge-200 border-forge-700 hover:bg-forge-800',
            ].join(' ')}
          >
            <Pencil size={12} />
            Bulk Edit ({selectedCount})
          </button>

          {/* Export CSV */}
          <button
            onClick={onExportCsv}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded',
              'text-forge-400 hover:text-forge-200 hover:bg-forge-850',
            ].join(' ')}
          >
            <Download size={12} />
            Export CSV
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Commit:** `feat(grid): add SpreadsheetHeader with progress bar, QuickFilterBar, search, and action buttons`

---

## Task 12: BulkEditPanel

**Files:**
- `client/src/components/grid/BulkEditPanel.tsx`

### Steps

- [ ] **12.1** Create `client/src/components/grid/BulkEditPanel.tsx`

```typescript
// client/src/components/grid/BulkEditPanel.tsx
import { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import type {
  ExerciseDetail,
  EnrichmentRecord,
  BulkClassificationPayload,
  ExerciseColumn,
} from '@mapforge/shared/types';

interface BulkEditPanelProps {
  exercise: ExerciseDetail;
  selectedRecordIds: Set<string>;
  records: EnrichmentRecord[];
  onApply: (payload: BulkClassificationPayload) => void;
  onClose: () => void;
}

interface FieldState {
  apply: boolean;
  value: string | null;
}

export function BulkEditPanel({
  exercise,
  selectedRecordIds,
  onApply,
  onClose,
}: BulkEditPanelProps) {
  const classificationCols = exercise.classificationColumns.filter(
    (c) => c.columnRole === 'classification' && c.visible
  );

  const [fields, setFields] = useState<Record<string, FieldState>>(() => {
    const init: Record<string, FieldState> = {};
    for (const col of classificationCols) {
      init[col.key] = { apply: false, value: null };
    }
    return init;
  });

  const [confirming, setConfirming] = useState(false);
  const count = selectedRecordIds.size;
  const needsConfirmation = count > 50;

  const updateField = useCallback((key: string, updates: Partial<FieldState>) => {
    setFields((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...updates },
    }));
  }, []);

  const handleApply = useCallback(() => {
    if (needsConfirmation && !confirming) {
      setConfirming(true);
      return;
    }

    const values = Object.entries(fields)
      .filter(([, f]) => f.apply)
      .map(([columnKey, f]) => ({ columnKey, value: f.value }));

    if (values.length === 0) return;

    onApply({
      recordIds: Array.from(selectedRecordIds),
      values,
    });
  }, [fields, selectedRecordIds, needsConfirmation, confirming, onApply]);

  const appliedCount = Object.values(fields).filter((f) => f.apply).length;

  function renderFieldInput(col: ExerciseColumn) {
    const field = fields[col.key];
    switch (col.dataType) {
      case 'picklist': {
        const options = col.config.picklistValues ?? [];
        return (
          <select
            value={field.value ?? ''}
            onChange={(e) => updateField(col.key, { value: e.target.value || null })}
            disabled={!field.apply}
            className={[
              'w-full px-2 py-1.5 text-sm rounded',
              'bg-forge-900 border border-forge-700 text-forge-100',
              !field.apply ? 'opacity-40' : '',
            ].join(' ')}
          >
            <option value="">-- Select --</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      }
      case 'boolean':
        return (
          <select
            value={field.value ?? ''}
            onChange={(e) => updateField(col.key, { value: e.target.value || null })}
            disabled={!field.apply}
            className={[
              'w-full px-2 py-1.5 text-sm rounded',
              'bg-forge-900 border border-forge-700 text-forge-100',
              !field.apply ? 'opacity-40' : '',
            ].join(' ')}
          >
            <option value="">-- Select --</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        );
      case 'number':
        return (
          <input
            type="number"
            value={field.value ?? ''}
            min={col.config.minValue}
            max={col.config.maxValue}
            onChange={(e) => updateField(col.key, { value: e.target.value || null })}
            disabled={!field.apply}
            className={[
              'w-full px-2 py-1.5 text-sm rounded',
              'bg-forge-900 border border-forge-700 text-forge-100',
              !field.apply ? 'opacity-40' : '',
            ].join(' ')}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            value={field.value ?? ''}
            min={col.config.minDate}
            max={col.config.maxDate}
            onChange={(e) => updateField(col.key, { value: e.target.value || null })}
            disabled={!field.apply}
            className={[
              'w-full px-2 py-1.5 text-sm rounded',
              'bg-forge-900 border border-forge-700 text-forge-100',
              !field.apply ? 'opacity-40' : '',
            ].join(' ')}
          />
        );
      default:
        return (
          <input
            type="text"
            value={field.value ?? ''}
            onChange={(e) => updateField(col.key, { value: e.target.value || null })}
            disabled={!field.apply}
            className={[
              'w-full px-2 py-1.5 text-sm rounded',
              'bg-forge-900 border border-forge-700 text-forge-100',
              !field.apply ? 'opacity-40' : '',
            ].join(' ')}
          />
        );
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={[
          'relative bg-forge-900 border border-forge-700 rounded-lg shadow-2xl',
          'w-full max-w-lg max-h-[80vh] flex flex-col',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-forge-800">
          <h2 className="text-lg font-semibold text-forge-50">
            Apply to {count} selected record{count !== 1 ? 's' : ''}
          </h2>
          <button onClick={onClose} className="text-forge-400 hover:text-forge-200">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {classificationCols.map((col) => (
            <div key={col.key} className="space-y-1.5">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={fields[col.key].apply}
                  onChange={(e) => updateField(col.key, { apply: e.target.checked })}
                  className="accent-amber-500"
                />
                <span className="text-sm font-medium text-forge-200">{col.label}</span>
                {col.required && (
                  <span className="text-amber-400 text-xs">*</span>
                )}
              </label>
              {renderFieldInput(col)}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-forge-800">
          <span className="text-xs text-forge-400">
            Only checked fields will be updated
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className={[
                'px-3 py-1.5 text-sm rounded',
                'text-forge-400 hover:text-forge-200 hover:bg-forge-800',
              ].join(' ')}
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={appliedCount === 0}
              className={[
                'px-3 py-1.5 text-sm font-medium rounded',
                appliedCount === 0
                  ? 'bg-forge-800 text-forge-600 cursor-not-allowed'
                  : confirming
                    ? 'bg-status-error text-white'
                    : 'bg-amber-600 text-white hover:bg-amber-500',
              ].join(' ')}
            >
              {confirming
                ? `Confirm: Apply to ${count} Records`
                : `Apply to ${count} Record${count !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Commit:** `feat(grid): add BulkEditPanel modal with per-field apply checkboxes and confirmation for large sets`

---

## Task 13: SpreadsheetFooter

**Files:**
- `client/src/components/grid/SpreadsheetFooter.tsx`

### Steps

- [ ] **13.1** Create `client/src/components/grid/SpreadsheetFooter.tsx`

```typescript
// client/src/components/grid/SpreadsheetFooter.tsx
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SpreadsheetFooterProps {
  page: number;
  pageSize: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
}

export function SpreadsheetFooter({
  page,
  pageSize,
  totalRecords,
  onPageChange,
}: SpreadsheetFooterProps) {
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const start = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalRecords);

  return (
    <div
      className={[
        'px-6 py-2 bg-forge-900 border-t border-forge-800',
        'flex items-center justify-between text-xs text-forge-400',
      ].join(' ')}
    >
      <span>
        Showing {start}-{end} of {totalRecords} records
      </span>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={[
            'flex items-center gap-1 px-2 py-1 rounded',
            page <= 1
              ? 'text-forge-600 cursor-not-allowed'
              : 'text-forge-300 hover:bg-forge-800 hover:text-forge-100',
          ].join(' ')}
        >
          <ChevronLeft size={14} />
          Prev
        </button>

        <span className="text-forge-300">
          Page {page} of {totalPages}
        </span>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className={[
            'flex items-center gap-1 px-2 py-1 rounded',
            page >= totalPages
              ? 'text-forge-600 cursor-not-allowed'
              : 'text-forge-300 hover:bg-forge-800 hover:text-forge-100',
          ].join(' ')}
        >
          Next
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
```

**Commit:** `feat(grid): add SpreadsheetFooter with pagination controls`

---

## Task 14: EnrichmentGrid Component Assembly

**Files:**
- `client/src/components/grid/EnrichmentGrid.tsx`

### Steps

- [ ] **14.1** Create `client/src/components/grid/EnrichmentGrid.tsx`

```typescript
// client/src/components/grid/EnrichmentGrid.tsx
import { useCallback, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { themeQuartz, colorSchemeDarkBlue } from 'ag-grid-community';
import type { CellValueChangedEvent, GridReadyEvent, GridApi } from 'ag-grid-community';
import { buildColumnDefs } from './buildColumnDefs';
import { RowStatusRenderer } from './RowStatusRenderer';
import { SourceColumnHeader } from './SourceColumnHeader';
import { ClassificationColumnHeader } from './ClassificationColumnHeader';
import { ValidationCellRenderer } from './ValidationCellRenderer';
import { DependentPicklistEditor } from './DependentPicklistEditor';
import { MultiSelectEditor } from './MultiSelectEditor';
import { DateCellEditor } from './DateCellEditor';
import { BooleanCellRenderer } from './BooleanCellRenderer';
import { BooleanCellEditor } from './BooleanCellEditor';
import { validateCell } from '../../services/validation';
import type {
  ExerciseDetail,
  EnrichmentRecord,
  ExerciseStats,
  ClassificationPayload,
} from '@mapforge/shared/types';
import './grid.css';

interface EnrichmentGridProps {
  exercise: ExerciseDetail;
  records: EnrichmentRecord[];
  stats: ExerciseStats;
  onClassify: (recordId: string, values: ClassificationPayload) => void;
  onSelectionChanged: (selectedIds: string[]) => void;
  selectedIds: Set<string>;
}

const agTheme = themeQuartz.withPart(colorSchemeDarkBlue);

export function EnrichmentGrid({
  exercise,
  records,
  onClassify,
  onSelectionChanged,
}: EnrichmentGridProps) {
  const gridRef = useRef<GridApi | null>(null);

  const columnDefs = useMemo(() => buildColumnDefs(exercise), [exercise]);

  const components = useMemo(
    () => ({
      rowStatusRenderer: RowStatusRenderer,
      sourceColumnHeader: SourceColumnHeader,
      classificationColumnHeader: ClassificationColumnHeader,
      validationCellRenderer: ValidationCellRenderer,
      dependentPicklistEditor: DependentPicklistEditor,
      multiSelectEditor: MultiSelectEditor,
      dateCellEditor: DateCellEditor,
      booleanCellRenderer: BooleanCellRenderer,
      booleanCellEditor: BooleanCellEditor,
    }),
    []
  );

  const onGridReady = useCallback((event: GridReadyEvent) => {
    gridRef.current = event.api;
  }, []);

  const onCellValueChanged = useCallback(
    (event: CellValueChangedEvent) => {
      const record = event.data as EnrichmentRecord;
      const field = event.colDef.field as string;
      if (!field.startsWith('classifications.')) return;

      const columnKey = field.replace('classifications.', '');
      const column = exercise.classificationColumns.find((c) => c.key === columnKey);
      if (!column) return;

      // Client-side validation for instant feedback
      const errors = validateCell(event.newValue, column, record);
      // Merge client errors into record (AG Grid will re-render via refreshCells)
      const otherErrors = record.validationErrors.filter((e) => e.columnKey !== columnKey);
      record.validationErrors = [...otherErrors, ...errors];

      if (gridRef.current) {
        gridRef.current.refreshCells({
          rowNodes: [event.node],
          force: true,
        });
      }

      // Trigger auto-save
      onClassify(record.id, { values: [{ columnKey, value: event.newValue }] });
    },
    [exercise.classificationColumns, onClassify]
  );

  const handleSelectionChanged = useCallback(() => {
    if (!gridRef.current) return;
    const selected = gridRef.current.getSelectedRows() as EnrichmentRecord[];
    onSelectionChanged(selected.map((r) => r.id));
  }, [onSelectionChanged]);

  const tabToNextCell = useCallback(
    (params: { nextCellPosition: { column: { getColDef: () => { cellClass?: string; editable?: boolean } } } | null }) => {
      const { nextCellPosition } = params;
      if (!nextCellPosition) return null;

      const colDef = nextCellPosition.column.getColDef();
      const isEditable =
        colDef.cellClass === 'classification-cell' && colDef.editable;

      if (isEditable) return nextCellPosition;
      return null;
    },
    []
  );

  return (
    <div className="flex-1 ag-theme-quartz-dark-blue">
      <AgGridReact
        theme={agTheme}
        columnDefs={columnDefs}
        rowData={records}
        components={components}
        getRowId={(params) => params.data.id}
        rowHeight={32}
        headerHeight={36}
        rowSelection={{
          mode: 'multiRow',
          headerCheckbox: true,
          checkboxes: true,
          enableClickSelection: false,
        }}
        enableCellChangeFlash={true}
        animateRows={true}
        pagination={false}
        domLayout="normal"
        stopEditingWhenCellsLoseFocus={true}
        rowClassRules={{
          'row-new': (params) => params.data?.recordState === 'new',
          'row-changed': (params) => params.data?.recordState === 'changed',
          'row-error': (params) => (params.data?.validationErrors?.length ?? 0) > 0,
          'row-classified': (params) => params.data?.isFullyClassified === true,
        }}
        onGridReady={onGridReady}
        onCellValueChanged={onCellValueChanged}
        onSelectionChanged={handleSelectionChanged}
        tabToNextCell={tabToNextCell}
      />
    </div>
  );
}
```

**Commit:** `feat(grid): assemble EnrichmentGrid wiring renderers, editors, validation, and selection`

---

## Task 15: EnrichmentSpreadsheetPage Assembly

**Files:**
- `client/src/pages/EnrichmentSpreadsheetPage.tsx`

### Steps

- [ ] **15.1** Create `client/src/pages/EnrichmentSpreadsheetPage.tsx`

```typescript
// client/src/pages/EnrichmentSpreadsheetPage.tsx
import { useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, AlertTriangle, Database } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchExerciseDetail, bulkClassify } from '../api/exercises';
import { useExerciseRecords } from '../hooks/useExerciseRecords';
import { useAutoSave } from '../hooks/useAutoSave';
import { useSpreadsheetStore } from '../stores/spreadsheetStore';
import { SpreadsheetHeader } from '../components/grid/SpreadsheetHeader';
import { EnrichmentGrid } from '../components/grid/EnrichmentGrid';
import { SpreadsheetFooter } from '../components/grid/SpreadsheetFooter';
import { BulkEditPanel } from '../components/grid/BulkEditPanel';
import type { BulkClassificationPayload, PaginatedRecords } from '@mapforge/shared/types';

export function EnrichmentSpreadsheetPage() {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    activeFilter,
    searchQuery,
    page,
    pageSize,
    selectedRecordIds,
    bulkEditOpen,
    setFilter,
    setSearch,
    setPage,
    selectAllRecords,
    clearSelection,
    setBulkEditOpen,
    reset,
  } = useSpreadsheetStore();

  // Reset store when exercise changes
  useEffect(() => {
    reset();
  }, [exerciseId, reset]);

  // Fetch exercise detail
  const {
    data: exercise,
    isLoading: exerciseLoading,
    error: exerciseError,
  } = useQuery({
    queryKey: ['exercise-detail', exerciseId],
    queryFn: () => fetchExerciseDetail(exerciseId!),
    enabled: !!exerciseId,
  });

  // Fetch records
  const {
    data: recordsData,
    isLoading: recordsLoading,
    error: recordsError,
    refetch: refetchRecords,
  } = useExerciseRecords(exerciseId!);

  // Auto-save
  const { save: debouncedSave } = useAutoSave(exerciseId!);

  // Bulk classify mutation
  const bulkMutation = useMutation({
    mutationFn: (payload: BulkClassificationPayload) =>
      bulkClassify(exerciseId!, payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['records', exerciseId] });
      clearSelection();
      setBulkEditOpen(false);
      toast.success(`${result.updatedCount} records updated`);
    },
    onError: () => {
      toast.error('Bulk edit failed. Please try again.');
    },
  });

  // Handlers
  const handleClassify = useCallback(
    (recordId: string, values: { values: Array<{ columnKey: string; value: string | null }> }) => {
      debouncedSave(recordId, values);
    },
    [debouncedSave]
  );

  const handleSelectionChanged = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) clearSelection();
      else selectAllRecords(ids);
    },
    [selectAllRecords, clearSelection]
  );

  const handleExportCsv = useCallback(() => {
    if (!exerciseId) return;
    const url = `/api/v1/exercises/${exerciseId}/records/export?filter=${activeFilter}`;
    window.open(url, '_blank');
  }, [exerciseId, activeFilter]);

  const records = recordsData?.records ?? [];
  const stats = recordsData?.stats ?? {
    totalRecords: 0,
    classifiedRecords: 0,
    unclassifiedRecords: 0,
    errorCount: 0,
    warningCount: 0,
    newRecordCount: 0,
    completionPercentage: 0,
    columnStats: [],
  };
  const totalRecords = recordsData?.total ?? 0;

  // --- Page Loading State ---
  if (exerciseLoading) {
    return (
      <div className="flex flex-col h-screen bg-forge-950">
        <div className="h-14 bg-forge-900 border-b border-forge-700 px-6 flex items-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-forge-400 hover:text-forge-200 mr-3"
          >
            <ArrowLeft size={18} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // --- Exercise Error State ---
  if (exerciseError || !exercise) {
    return (
      <div className="flex flex-col h-screen bg-forge-950">
        <div className="h-14 bg-forge-900 border-b border-forge-700 px-6 flex items-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-forge-400 hover:text-forge-200 mr-3"
          >
            <ArrowLeft size={18} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle size={48} className="text-status-error mx-auto mb-4" />
            <p className="text-forge-200 mb-2">Failed to load exercise</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-sm text-amber-400 hover:text-amber-300"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-forge-950">
      {/* TopBar */}
      <div className="h-14 bg-forge-900 border-b border-forge-700 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-forge-400 hover:text-forge-200"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-semibold text-forge-100">{exercise.name}</h1>
        </div>
      </div>

      {/* Header */}
      <SpreadsheetHeader
        exercise={exercise}
        stats={stats}
        activeFilter={activeFilter}
        searchQuery={searchQuery}
        selectedCount={selectedRecordIds.size}
        onFilterChange={setFilter}
        onSearchChange={setSearch}
        onBulkEdit={() => setBulkEditOpen(true)}
        onExportCsv={handleExportCsv}
      />

      {/* Grid Area */}
      {recordsLoading ? (
        <div className="flex-1 px-6 py-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-8 bg-forge-850 rounded animate-pulse"
            />
          ))}
        </div>
      ) : recordsError ? (
        <div className="mx-6 mt-4 bg-status-error/10 border border-status-error/30 rounded-md p-3 flex items-center gap-3">
          <AlertTriangle size={16} className="text-status-error shrink-0" />
          <span className="text-sm text-forge-200">Failed to load records.</span>
          <button
            onClick={() => refetchRecords()}
            className="text-sm text-amber-400 hover:text-amber-300 ml-auto"
          >
            Retry
          </button>
        </div>
      ) : records.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Database size={48} className="text-forge-600 mx-auto mb-4" />
            <p className="text-lg font-medium text-forge-300 mb-1">No records yet</p>
            <p className="text-sm text-forge-500">
              Source data has not been loaded. Contact your administrator.
            </p>
          </div>
        </div>
      ) : (
        <EnrichmentGrid
          exercise={exercise}
          records={records}
          stats={stats}
          onClassify={handleClassify}
          onSelectionChanged={handleSelectionChanged}
          selectedIds={selectedRecordIds}
        />
      )}

      {/* Footer */}
      <SpreadsheetFooter
        page={page}
        pageSize={pageSize}
        totalRecords={totalRecords}
        onPageChange={setPage}
      />

      {/* Bulk Edit Modal */}
      {bulkEditOpen && (
        <BulkEditPanel
          exercise={exercise}
          selectedRecordIds={selectedRecordIds}
          records={records}
          onApply={(payload) => bulkMutation.mutate(payload)}
          onClose={() => setBulkEditOpen(false)}
        />
      )}
    </div>
  );
}
```

**Commit:** `feat(pages): assemble EnrichmentSpreadsheetPage with loading, empty, and error states`

---

## Task 16: Server - Records API Endpoints

**Files:**
- `server/src/db/schema.ts` (additions)
- `server/src/routes/exercises.ts` (additions)
- `server/src/routes/reference-tables.ts` (new)

### Steps

- [ ] **16.1** Add Drizzle schema tables for source records, classification values, and classification history

```typescript
// Additions to server/src/db/schema.ts

import { pgTable, uuid, text, jsonb, timestamp, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';

export const recordStateEnum = pgEnum('record_state', ['new', 'existing', 'changed', 'removed']);

export const sourceRecords = pgTable('source_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  exerciseId: uuid('exercise_id').notNull().references(() => exercises.id),
  uniqueKey: jsonb('unique_key').notNull(), // Record<string, string>
  sourceData: jsonb('source_data').notNull(), // Record<string, unknown>
  recordState: recordStateEnum('record_state').notNull().default('new'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const classificationValues = pgTable('classification_values', {
  id: uuid('id').defaultRandom().primaryKey(),
  recordId: uuid('record_id').notNull().references(() => sourceRecords.id),
  exerciseId: uuid('exercise_id').notNull().references(() => exercises.id),
  columnKey: text('column_key').notNull(),
  value: text('value'),
  classifiedBy: uuid('classified_by').references(() => users.id),
  classifiedAt: timestamp('classified_at').defaultNow(),
});

export const classificationHistory = pgTable('classification_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  recordId: uuid('record_id').notNull().references(() => sourceRecords.id),
  exerciseId: uuid('exercise_id').notNull().references(() => exercises.id),
  columnKey: text('column_key').notNull(),
  previousValue: text('previous_value'),
  newValue: text('new_value'),
  changedBy: uuid('changed_by').references(() => users.id),
  changedAt: timestamp('changed_at').defaultNow().notNull(),
});

export const referenceTables = pgTable('reference_tables', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  orgId: uuid('org_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const referenceTableRows = pgTable('reference_table_rows', {
  id: uuid('id').defaultRandom().primaryKey(),
  tableId: uuid('table_id').notNull().references(() => referenceTables.id),
  data: jsonb('data').notNull(), // Record<string, string>
});
```

- [ ] **16.2** Add exercise detail endpoint

```typescript
// GET /api/v1/exercises/:id
// Returns ExerciseDetail with sourceColumns and classificationColumns
// Server reads exercise config from DB, resolves column definitions
```

- [ ] **16.3** Add paginated records endpoint

```typescript
// GET /api/v1/exercises/:id/records
// Query params: page, pageSize, filter, search, sortColumn, sortDirection
// Returns PaginatedRecords
// - Joins source_records with classification_values
// - Applies filter (all/unclassified/classified/errors/new)
// - Applies text search across source data columns
// - Applies sort
// - Computes stats aggregates
// - Runs server-side validation on each record
```

- [ ] **16.4** Add classify record endpoint

```typescript
// PUT /api/v1/exercises/:id/records/:recordId/classify
// Body: ClassificationPayload
// - Upserts classification_values
// - Inserts classification_history entries
// - Runs server-side validation
// - Computes updated stats
// - Returns ClassificationResult
```

- [ ] **16.5** Add bulk classify endpoint

```typescript
// POST /api/v1/exercises/:id/records/bulk-classify
// Body: BulkClassificationPayload
// - Iterates recordIds, applies values to each
// - Returns BulkClassificationResult with per-record errors
```

- [ ] **16.6** Add reference table values endpoint

```typescript
// server/src/routes/reference-tables.ts
// GET /api/v1/reference-tables/:id/values
// Query params: filterColumn, filterValue, valueColumn
// - Queries reference_table_rows where data[filterColumn] = filterValue
// - Returns distinct values from data[valueColumn]
// - Returns { values: string[] }
```

- [ ] **16.7** Add CSV export endpoint

```typescript
// GET /api/v1/exercises/:id/records/export
// Query params: filter
// - Streams CSV with all visible source + classification columns
// - Includes status column
// - Sets Content-Type: text/csv, Content-Disposition: attachment
```

- [ ] **16.8** Generate Drizzle migration: `cd server && npx drizzle-kit generate`

- [ ] **16.9** Apply migration: `cd server && npx drizzle-kit push`

**Commit:** `feat(server): add records API endpoints with Drizzle schema for source records, classifications, and reference tables`

---

## Task 17: Integration Test

**Files:**
- `e2e/enrichment-spreadsheet.spec.ts`

### Steps

- [ ] **17.1** Create seed data for the Development Programming exercise

```typescript
// e2e/fixtures/seed-enrichment.ts
// Seeds:
// - 1 exercise "Development Programming 2026" with status 'active'
// - 3 source columns: siteId, programId, programName
// - 2 classification columns: sportCategory (picklist, required), categorization (dependent picklist)
// - 1 reference table mapping sportCategory -> categorization options
// - 10 source records (mix of new/existing states)
// - 2 records pre-classified, 1 with validation error
```

- [ ] **17.2** Write test: navigate to exercise, verify grid loads

```typescript
// e2e/enrichment-spreadsheet.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Enrichment Spreadsheet', () => {
  test.beforeEach(async ({ page }) => {
    // Seed data and login
    await page.goto('/exercises/test-exercise-id');
  });

  test('displays exercise name in top bar', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('Development Programming 2026');
  });

  test('shows progress bar with stats', async ({ page }) => {
    await expect(page.getByText(/records classified/)).toBeVisible();
  });

  test('renders source and classification columns', async ({ page }) => {
    await expect(page.getByText('siteId')).toBeVisible();
    await expect(page.getByText('sportCategory')).toBeVisible();
  });
});
```

- [ ] **17.3** Write test: classify a record via cell edit, verify auto-save

```typescript
test('auto-saves classification on cell edit', async ({ page }) => {
  // Click an unclassified cell in the sportCategory column
  const cell = page.locator('.classification-cell').first();
  await cell.dblclick();

  // Select from dependent picklist
  await page.getByPlaceholder('Search...').fill('Baseball');
  await page.getByText('Girls Baseball').click();

  // Wait for auto-save indicator to resolve
  await expect(page.getByText(/records classified/)).toContainText(/1/);
});
```

- [ ] **17.4** Write test: dependent dropdown shows "Select parent first" when parent empty

```typescript
test('dependent dropdown shows parent-first message', async ({ page }) => {
  // Find a row where sportCategory is empty, double-click categorization
  const categorizationCell = page
    .locator('[col-id="classifications.categorization"]')
    .nth(1);
  await categorizationCell.dblclick();

  await expect(page.getByText(/Select.*first/)).toBeVisible();
});
```

- [ ] **17.5** Write test: validation error displays red border and popover

```typescript
test('shows validation error popover on hover', async ({ page }) => {
  // Find a cell with a validation error (seeded)
  const errorCell = page.locator('.ring-status-error').first();
  await errorCell.hover();

  await expect(page.locator('.bg-forge-800.border')).toBeVisible();
});
```

- [ ] **17.6** Write test: bulk edit applies to selected records

```typescript
test('bulk edit updates multiple records', async ({ page }) => {
  // Select first 3 rows via header checkbox
  await page.locator('.ag-header-cell .ag-checkbox-input').first().click();

  // Click Bulk Edit
  await page.getByText(/Bulk Edit/).click();

  // Check sportCategory, select value
  await page.getByText('sportCategory').click();
  await page.locator('select').first().selectOption('Girls Baseball');

  // Apply
  await page.getByText(/Apply to/).click();

  // Verify toast
  await expect(page.getByText(/records updated/)).toBeVisible();
});
```

- [ ] **17.7** Write test: pagination navigates between pages

```typescript
test('pagination works', async ({ page }) => {
  await expect(page.getByText(/Showing 1-/)).toBeVisible();
  // If total > pageSize, test next button
});
```

- [ ] **17.8** Run integration tests: `npx playwright test e2e/enrichment-spreadsheet.spec.ts`

**Commit:** `test(e2e): add enrichment spreadsheet integration tests covering classify, dependent dropdown, validation, and bulk edit`

---

## Summary

| Task | Component | Files | Est. Size |
|------|-----------|-------|-----------|
| 1 | Spreadsheet Store | 2 | S |
| 2 | useExerciseRecords | 2 | S |
| 3 | Validation Service | 2 | S |
| 4 | Column Def Builder | 3 | M |
| 5 | RowStatusRenderer | 1 | S |
| 6 | Column Headers | 2 | S |
| 7 | ValidationCellRenderer | 2 | M |
| 8 | DependentPicklistEditor | 2 | L |
| 9 | Additional Editors | 4 | M |
| 10 | Auto-Save | 2 | M |
| 11 | SpreadsheetHeader | 2 | M |
| 12 | BulkEditPanel | 1 | M |
| 13 | SpreadsheetFooter | 1 | S |
| 14 | EnrichmentGrid Assembly | 1 | M |
| 15 | Page Assembly | 1 | L |
| 16 | Server Endpoints | 3 | L |
| 17 | Integration Tests | 2 | M |

**Total: 33 files, 17 tasks, 17 commits**
