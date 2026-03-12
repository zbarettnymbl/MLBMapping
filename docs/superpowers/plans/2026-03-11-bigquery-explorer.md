# BigQuery Explorer Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin-only BigQuery data explorer page with sidebar browser, schema viewer, AG Grid data preview, CSV export, and "Create Exercise" navigation.

**Architecture:** Two-panel layout inside AppLayout. Left sidebar browses credentials/datasets/tables via cascading React Query calls. Right panel displays schema + AG Grid preview for the selected table. Zustand store manages UI state (selections, collapse toggles, limit). All backend endpoints already exist -- this is purely a frontend feature.

**Tech Stack:** React 19, TypeScript, Zustand 5, React Query 5, AG Grid 33, Tailwind CSS, lucide-react, Vitest, @testing-library/react

**Spec:** `docs/superpowers/specs/2026-03-11-bigquery-explorer-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|---|---|
| `client/src/stores/bigqueryExplorerStore.ts` | Zustand store: selected credential/dataset/table, gcpProject, previewLimit, collapse states |
| `client/src/components/bigquery/BigQuerySidebar.tsx` | Credential dropdown + dataset/table tree |
| `client/src/components/bigquery/BigQueryDatasetTree.tsx` | Expandable tree of datasets -> tables |
| `client/src/components/bigquery/BigQuerySchemaPanel.tsx` | Collapsible column schema table |
| `client/src/components/bigquery/BigQueryTableView.tsx` | Header bar + schema panel + AG Grid preview |
| `client/src/pages/BigQueryExplorerPage.tsx` | Page component: two-panel layout, orchestrates sidebar + table view |
| `client/src/stores/__tests__/bigqueryExplorerStore.test.ts` | Store unit tests |
| `client/src/pages/__tests__/BigQueryExplorerPage.test.tsx` | Page integration tests with MSW |

### Modified Files
| File | Change |
|---|---|
| `client/src/App.tsx` | Add `/bigquery-explorer` route with ProtectedRoute |
| `client/src/components/layout/Sidebar.tsx` | Add "BigQuery Explorer" nav item under Data section |

---

## Chunk 1: Store + Route Wiring

### Task 1: Zustand Store

**Files:**
- Create: `client/src/stores/bigqueryExplorerStore.ts`
- Test: `client/src/stores/__tests__/bigqueryExplorerStore.test.ts`

- [ ] **Step 1: Write the store test file**

```typescript
// client/src/stores/__tests__/bigqueryExplorerStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useBigQueryExplorerStore } from '../bigqueryExplorerStore';

describe('bigqueryExplorerStore', () => {
  beforeEach(() => {
    useBigQueryExplorerStore.getState().reset();
  });

  it('initializes with default values', () => {
    const state = useBigQueryExplorerStore.getState();
    expect(state.selectedCredentialId).toBeNull();
    expect(state.gcpProject).toBeNull();
    expect(state.selectedDataset).toBeNull();
    expect(state.selectedTable).toBeNull();
    expect(state.previewLimit).toBe(50);
    expect(state.sidebarCollapsed).toBe(false);
    expect(state.schemaCollapsed).toBe(true);
  });

  it('selectCredential resets downstream state', () => {
    const store = useBigQueryExplorerStore.getState();
    store.setGcpProject('my-project');
    store.setSelectedDataset('my_dataset');
    store.setSelectedTable('my_table');
    store.selectCredential('cred-123');

    const state = useBigQueryExplorerStore.getState();
    expect(state.selectedCredentialId).toBe('cred-123');
    expect(state.gcpProject).toBeNull();
    expect(state.selectedDataset).toBeNull();
    expect(state.selectedTable).toBeNull();
  });

  it('selectDataset resets selected table', () => {
    const store = useBigQueryExplorerStore.getState();
    store.setSelectedTable('old_table');
    store.selectDataset('new_dataset');

    const state = useBigQueryExplorerStore.getState();
    expect(state.selectedDataset).toBe('new_dataset');
    expect(state.selectedTable).toBeNull();
  });

  it('setPreviewLimit updates limit', () => {
    useBigQueryExplorerStore.getState().setPreviewLimit(500);
    expect(useBigQueryExplorerStore.getState().previewLimit).toBe(500);
  });

  it('toggleSidebar flips sidebarCollapsed', () => {
    expect(useBigQueryExplorerStore.getState().sidebarCollapsed).toBe(false);
    useBigQueryExplorerStore.getState().toggleSidebar();
    expect(useBigQueryExplorerStore.getState().sidebarCollapsed).toBe(true);
    useBigQueryExplorerStore.getState().toggleSidebar();
    expect(useBigQueryExplorerStore.getState().sidebarCollapsed).toBe(false);
  });

  it('toggleSchema flips schemaCollapsed', () => {
    expect(useBigQueryExplorerStore.getState().schemaCollapsed).toBe(true);
    useBigQueryExplorerStore.getState().toggleSchema();
    expect(useBigQueryExplorerStore.getState().schemaCollapsed).toBe(false);
  });

  it('reset restores initial state', () => {
    const store = useBigQueryExplorerStore.getState();
    store.selectCredential('cred-1');
    store.setGcpProject('proj');
    store.selectDataset('ds');
    store.setSelectedTable('tbl');
    store.setPreviewLimit(500);
    store.toggleSidebar();
    store.toggleSchema();
    store.reset();

    const state = useBigQueryExplorerStore.getState();
    expect(state.selectedCredentialId).toBeNull();
    expect(state.gcpProject).toBeNull();
    expect(state.selectedDataset).toBeNull();
    expect(state.selectedTable).toBeNull();
    expect(state.previewLimit).toBe(50);
    expect(state.sidebarCollapsed).toBe(false);
    expect(state.schemaCollapsed).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client && npx vitest run src/stores/__tests__/bigqueryExplorerStore.test.ts`
Expected: FAIL -- module not found

- [ ] **Step 3: Write the store implementation**

```typescript
// client/src/stores/bigqueryExplorerStore.ts
import { create } from 'zustand';

interface BigQueryExplorerState {
  selectedCredentialId: string | null;
  gcpProject: string | null;
  selectedDataset: string | null;
  selectedTable: string | null;
  previewLimit: number;
  sidebarCollapsed: boolean;
  schemaCollapsed: boolean;

  selectCredential: (id: string | null) => void;
  setGcpProject: (project: string | null) => void;
  selectDataset: (dataset: string | null) => void;
  setSelectedTable: (table: string | null) => void;
  setPreviewLimit: (limit: number) => void;
  toggleSidebar: () => void;
  toggleSchema: () => void;
  reset: () => void;
}

const initialState = {
  selectedCredentialId: null as string | null,
  gcpProject: null as string | null,
  selectedDataset: null as string | null,
  selectedTable: null as string | null,
  previewLimit: 50,
  sidebarCollapsed: false,
  schemaCollapsed: true,
};

export const useBigQueryExplorerStore = create<BigQueryExplorerState>((set) => ({
  ...initialState,
  selectCredential: (id) => set({
    selectedCredentialId: id,
    gcpProject: null,
    selectedDataset: null,
    selectedTable: null,
  }),
  setGcpProject: (project) => set({ gcpProject: project }),
  selectDataset: (dataset) => set({
    selectedDataset: dataset,
    selectedTable: null,
  }),
  setSelectedTable: (table) => set({ selectedTable: table }),
  setPreviewLimit: (limit) => set({ previewLimit: limit }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  toggleSchema: () => set((s) => ({ schemaCollapsed: !s.schemaCollapsed })),
  reset: () => set({ ...initialState }),
}));
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd client && npx vitest run src/stores/__tests__/bigqueryExplorerStore.test.ts`
Expected: All 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/stores/bigqueryExplorerStore.ts client/src/stores/__tests__/bigqueryExplorerStore.test.ts
git commit -m "feat(bigquery-explorer): add Zustand store with selection and reset logic"
```

---

### Task 2: Route + Sidebar Navigation

**Files:**
- Create: `client/src/pages/BigQueryExplorerPage.tsx` (placeholder)
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Create placeholder page**

```typescript
// client/src/pages/BigQueryExplorerPage.tsx
import { AppLayout } from '@/components/layout/AppLayout';

export function BigQueryExplorerPage() {
  return (
    <AppLayout title="BigQuery Explorer">
      <div className="p-6 text-forge-400">BigQuery Explorer -- coming soon</div>
    </AppLayout>
  );
}
```

- [ ] **Step 2: Add route to App.tsx**

In `client/src/App.tsx`, add the import at the top with other page imports:

```typescript
import { BigQueryExplorerPage } from '@/pages/BigQueryExplorerPage';
```

Add the route inside the `{/* Admin routes */}` section, after the `/credentials` route (before `</Routes>`):

```typescript
            <Route
              path="/bigquery-explorer"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <BigQueryExplorerPage />
                </ProtectedRoute>
              }
            />
```

- [ ] **Step 3: Add sidebar nav item**

In `client/src/components/layout/Sidebar.tsx`:

Add a new icon to the `ICON` object (after `credentials`):

```typescript
  bigquery: (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    </svg>
  ),
```

Add a nav item to the `Data` section in `NAV_SECTIONS` (after the Reference Tables item):

```typescript
      {
        to: '/bigquery-explorer',
        label: 'BigQuery Explorer',
        icon: ICON.bigquery,
      },
```

- [ ] **Step 4: Verify the app compiles**

Run: `cd client && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/BigQueryExplorerPage.tsx client/src/App.tsx client/src/components/layout/Sidebar.tsx
git commit -m "feat(bigquery-explorer): add route, sidebar nav, and placeholder page"
```

---

## Chunk 2: Sidebar Components

### Task 3: BigQueryDatasetTree Component

**Files:**
- Create: `client/src/components/bigquery/BigQueryDatasetTree.tsx`

This component renders an expandable tree of datasets and their tables. It receives data and callbacks as props -- no direct API calls.

- [ ] **Step 1: Create the tree component**

```typescript
// client/src/components/bigquery/BigQueryDatasetTree.tsx
import { useState } from 'react';
import { ChevronRight, ChevronDown, Table2, Database, Loader2 } from 'lucide-react';

interface BigQueryDatasetTreeProps {
  datasets: string[];
  selectedDataset: string | null;
  selectedTable: string | null;
  tablesMap: Record<string, string[]>;          // dataset -> tables
  loadingDatasets: Record<string, boolean>;      // dataset -> isLoading
  errorDatasets: Record<string, string | null>;  // dataset -> error message
  onExpandDataset: (dataset: string) => void;
  onSelectTable: (dataset: string, table: string) => void;
  onRetryDataset: (dataset: string) => void;
}

export function BigQueryDatasetTree({
  datasets,
  selectedDataset,
  selectedTable,
  tablesMap,
  loadingDatasets,
  errorDatasets,
  onExpandDataset,
  onSelectTable,
  onRetryDataset,
}: BigQueryDatasetTreeProps) {
  const [expandedDatasets, setExpandedDatasets] = useState<Set<string>>(new Set());

  function toggleDataset(dataset: string) {
    setExpandedDatasets((prev) => {
      const next = new Set(prev);
      if (next.has(dataset)) {
        next.delete(dataset);
      } else {
        next.add(dataset);
        if (!tablesMap[dataset]) {
          onExpandDataset(dataset);
        }
      }
      return next;
    });
  }

  if (datasets.length === 0) {
    return <p className="px-3 py-2 text-xs text-forge-500">No datasets found</p>;
  }

  return (
    <div className="space-y-0.5">
      {datasets.map((dataset) => {
        const isExpanded = expandedDatasets.has(dataset);
        const tables = tablesMap[dataset];
        const isLoading = loadingDatasets[dataset];
        const error = errorDatasets[dataset];

        return (
          <div key={dataset}>
            <button
              onClick={() => toggleDataset(dataset)}
              className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-forge-300 hover:bg-forge-800/50 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-forge-500 shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-forge-500 shrink-0" />
              )}
              <Database className="w-3.5 h-3.5 text-forge-500 shrink-0" />
              <span className="truncate">{dataset}</span>
            </button>

            {isExpanded && (
              <div className="ml-3 pl-3 border-l border-forge-800">
                {isLoading && (
                  <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-forge-500">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading tables...
                  </div>
                )}
                {error && (
                  <div className="px-3 py-1.5 text-xs text-red-400">
                    {error}
                    <button
                      onClick={() => onRetryDataset(dataset)}
                      className="ml-2 text-amber-400 hover:text-amber-300 underline"
                    >
                      Retry
                    </button>
                  </div>
                )}
                {tables && tables.length === 0 && !isLoading && !error && (
                  <p className="px-3 py-1.5 text-xs text-forge-600">No tables found</p>
                )}
                {tables?.map((table) => {
                  const isActive = selectedDataset === dataset && selectedTable === table;
                  return (
                    <button
                      key={table}
                      onClick={() => onSelectTable(dataset, table)}
                      className={`w-full flex items-center gap-1.5 px-3 py-1 text-xs rounded transition-colors ${
                        isActive
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'text-forge-400 hover:bg-forge-800/50 hover:text-forge-200'
                      }`}
                    >
                      <Table2 className="w-3 h-3 shrink-0" />
                      <span className="truncate">{table}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd client && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add client/src/components/bigquery/BigQueryDatasetTree.tsx
git commit -m "feat(bigquery-explorer): add dataset/table tree component"
```

---

### Task 4: BigQuerySidebar Component

**Files:**
- Create: `client/src/components/bigquery/BigQuerySidebar.tsx`

This component wires the credential dropdown and dataset tree to React Query and the Zustand store.

- [ ] **Step 1: Create the sidebar component**

```typescript
// client/src/components/bigquery/BigQuerySidebar.tsx
import { useQuery, useQueries } from '@tanstack/react-query';
import { PanelLeftClose, PanelLeft, AlertCircle } from 'lucide-react';
import { fetchCredentials } from '@/api/credentials';
import { fetchBigQueryDatasets, fetchBigQueryTables } from '@/api/bigquery';
import { useBigQueryExplorerStore } from '@/stores/bigqueryExplorerStore';
import { BigQueryDatasetTree } from './BigQueryDatasetTree';
import { useState, useCallback } from 'react';

export function BigQuerySidebar() {
  const {
    selectedCredentialId,
    selectedDataset,
    selectedTable,
    sidebarCollapsed,
    selectCredential,
    setGcpProject,
    selectDataset,
    setSelectedTable,
    toggleSidebar,
  } = useBigQueryExplorerStore();

  // Track which datasets user has expanded (to trigger table fetches)
  const [expandedDatasets, setExpandedDatasets] = useState<string[]>([]);

  const credentialsQuery = useQuery({
    queryKey: ['credentials'],
    queryFn: fetchCredentials,
  });

  const datasetsQuery = useQuery({
    queryKey: ['bigquery', 'datasets', selectedCredentialId],
    queryFn: async () => {
      const result = await fetchBigQueryDatasets(selectedCredentialId!);
      setGcpProject(result.gcpProject);
      return result;
    },
    enabled: !!selectedCredentialId,
  });

  // Fetch tables for each expanded dataset using useQueries
  const tableQueries = useQueries({
    queries: expandedDatasets.map((dataset) => ({
      queryKey: ['bigquery', 'tables', selectedCredentialId, dataset],
      queryFn: () => fetchBigQueryTables(selectedCredentialId!, dataset),
      enabled: !!selectedCredentialId,
    })),
  });

  // Build lookup maps from query results
  const tablesMap: Record<string, string[]> = {};
  const loadingDatasets: Record<string, boolean> = {};
  const errorDatasets: Record<string, string | null> = {};
  expandedDatasets.forEach((dataset, i) => {
    const q = tableQueries[i];
    if (q.data) tablesMap[dataset] = q.data;
    loadingDatasets[dataset] = q.isLoading;
    errorDatasets[dataset] = q.isError ? (q.error as Error).message : null;
  });

  function handleCredentialChange(credId: string) {
    selectCredential(credId || null);
    setExpandedDatasets([]);
  }

  const handleExpandDataset = useCallback((dataset: string) => {
    setExpandedDatasets((prev) =>
      prev.includes(dataset) ? prev : [...prev, dataset]
    );
  }, []);

  function handleSelectTable(dataset: string, table: string) {
    selectDataset(dataset);
    setSelectedTable(table);
  }

  function handleRetryDataset(dataset: string) {
    const idx = expandedDatasets.indexOf(dataset);
    if (idx >= 0) tableQueries[idx].refetch();
  }

  if (sidebarCollapsed) {
    return (
      <div className="w-10 bg-forge-900 border-r border-forge-700 flex flex-col items-center pt-3">
        <button
          onClick={toggleSidebar}
          className="p-1.5 text-forge-500 hover:text-forge-300 transition-colors"
          title="Expand sidebar"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-72 bg-forge-900 border-r border-forge-700 flex flex-col shrink-0">
      {/* Header */}
      <div className="px-3 py-3 border-b border-forge-700 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-forge-500">Browser</span>
        <button
          onClick={toggleSidebar}
          className="p-1 text-forge-500 hover:text-forge-300 transition-colors"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Credential selector */}
      <div className="px-3 py-3 border-b border-forge-700">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-forge-500 mb-1.5">
          Credential
        </label>
        {credentialsQuery.isLoading ? (
          <div className="h-8 bg-forge-800 rounded animate-pulse" />
        ) : credentialsQuery.isError ? (
          <div className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Failed to load credentials
          </div>
        ) : (
          <select
            value={selectedCredentialId ?? ''}
            onChange={(e) => handleCredentialChange(e.target.value)}
            className="w-full bg-forge-800 border border-forge-700 rounded px-2 py-1.5 text-xs text-forge-200 focus:outline-none focus:border-amber-500/50"
          >
            <option value="">Select a credential...</option>
            {credentialsQuery.data?.map((cred) => (
              <option key={cred.id} value={cred.id}>
                {cred.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Dataset/table tree */}
      <div className="flex-1 overflow-y-auto py-2">
        {!selectedCredentialId && (
          <p className="px-3 py-2 text-xs text-forge-500">Select a credential to browse datasets</p>
        )}
        {selectedCredentialId && datasetsQuery.isLoading && (
          <div className="space-y-2 px-3 py-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-5 bg-forge-800 rounded animate-pulse" />
            ))}
          </div>
        )}
        {selectedCredentialId && datasetsQuery.isError && (
          <div className="px-3 py-2 text-xs text-red-400">
            <div className="flex items-center gap-1 mb-1">
              <AlertCircle className="w-3 h-3" />
              Failed to load datasets
            </div>
            <button
              onClick={() => datasetsQuery.refetch()}
              className="text-amber-400 hover:text-amber-300 underline"
            >
              Retry
            </button>
          </div>
        )}
        {selectedCredentialId && datasetsQuery.data && (
          <BigQueryDatasetTree
            datasets={datasetsQuery.data.datasets}
            selectedDataset={selectedDataset}
            selectedTable={selectedTable}
            tablesMap={tablesMap}
            loadingDatasets={loadingDatasets}
            errorDatasets={errorDatasets}
            onExpandDataset={handleExpandDataset}
            onSelectTable={handleSelectTable}
            onRetryDataset={handleRetryDataset}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd client && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add client/src/components/bigquery/BigQuerySidebar.tsx
git commit -m "feat(bigquery-explorer): add sidebar with credential selector and dataset tree"
```

---

## Chunk 3: Main Panel Components

### Task 5: BigQuerySchemaPanel Component

**Files:**
- Create: `client/src/components/bigquery/BigQuerySchemaPanel.tsx`

- [ ] **Step 1: Create the schema panel**

```typescript
// client/src/components/bigquery/BigQuerySchemaPanel.tsx
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useBigQueryExplorerStore } from '@/stores/bigqueryExplorerStore';
import type { BigQueryColumnInfo } from '@mapforge/shared';

interface BigQuerySchemaPanelProps {
  columns: BigQueryColumnInfo[];
  isLoading: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  STRING: 'text-green-400',
  INTEGER: 'text-blue-400',
  INT64: 'text-blue-400',
  FLOAT: 'text-cyan-400',
  FLOAT64: 'text-cyan-400',
  BOOLEAN: 'text-purple-400',
  BOOL: 'text-purple-400',
  TIMESTAMP: 'text-orange-400',
  DATE: 'text-orange-400',
  DATETIME: 'text-orange-400',
  RECORD: 'text-yellow-400',
  STRUCT: 'text-yellow-400',
  BYTES: 'text-forge-400',
  NUMERIC: 'text-blue-400',
  BIGNUMERIC: 'text-blue-400',
  GEOGRAPHY: 'text-teal-400',
  JSON: 'text-amber-400',
};

export function BigQuerySchemaPanel({ columns, isLoading }: BigQuerySchemaPanelProps) {
  const { schemaCollapsed, toggleSchema } = useBigQueryExplorerStore();

  return (
    <div className="border-b border-forge-700">
      <button
        onClick={toggleSchema}
        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-forge-500 hover:text-forge-300 transition-colors"
      >
        {schemaCollapsed ? (
          <ChevronRight className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
        Schema ({columns.length} columns)
      </button>

      {!schemaCollapsed && (
        <div className="px-4 pb-3 max-h-48 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-1.5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-4 bg-forge-800 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-forge-500 border-b border-forge-800">
                  <th className="text-left py-1 pr-4 font-medium">Column</th>
                  <th className="text-left py-1 pr-4 font-medium">Type</th>
                  <th className="text-left py-1 font-medium">Mode</th>
                </tr>
              </thead>
              <tbody>
                {columns.map((col) => (
                  <tr key={col.name} className="border-b border-forge-800/50">
                    <td className="py-1 pr-4 text-forge-200 font-mono">{col.name}</td>
                    <td className={`py-1 pr-4 font-mono ${TYPE_COLORS[col.type] ?? 'text-forge-400'}`}>
                      {col.type}
                    </td>
                    <td className="py-1 text-forge-500">{col.mode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd client && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add client/src/components/bigquery/BigQuerySchemaPanel.tsx
git commit -m "feat(bigquery-explorer): add collapsible schema panel with type coloring"
```

---

### Task 6: BigQueryTableView Component

**Files:**
- Create: `client/src/components/bigquery/BigQueryTableView.tsx`

This is the main panel: header bar with actions, schema panel, and AG Grid.

- [ ] **Step 1: Create the table view component**

```typescript
// client/src/components/bigquery/BigQueryTableView.tsx
import { useRef, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { Download, Plus, Loader2 } from 'lucide-react';
import type { ColDef } from 'ag-grid-community';
import { themeQuartz, colorSchemeDarkBlue } from 'ag-grid-community';
import { previewBigQueryData, fetchBigQuerySchema } from '@/api/bigquery';
import { useBigQueryExplorerStore } from '@/stores/bigqueryExplorerStore';
import { BigQuerySchemaPanel } from './BigQuerySchemaPanel';
import type { BigQueryConnectionConfig } from '@mapforge/shared';

export function BigQueryTableView() {
  const gridRef = useRef<AgGridReact>(null);
  const navigate = useNavigate();
  const {
    selectedCredentialId,
    gcpProject,
    selectedDataset,
    selectedTable,
    previewLimit,
    setPreviewLimit,
  } = useBigQueryExplorerStore();

  const gridTheme = themeQuartz.withPart(colorSchemeDarkBlue);
  const hasSelection = !!(selectedCredentialId && gcpProject && selectedDataset && selectedTable);

  const connectionConfig: BigQueryConnectionConfig | null = hasSelection
    ? {
        gcpProject: gcpProject!,
        dataset: selectedDataset!,
        tableOrQuery: selectedTable!,
        queryType: 'table',
        credentialId: selectedCredentialId!,
      }
    : null;

  const schemaQuery = useQuery({
    queryKey: ['bigquery', 'schema', selectedCredentialId, selectedDataset, selectedTable],
    queryFn: () =>
      fetchBigQuerySchema({
        gcpProject: gcpProject!,
        dataset: selectedDataset!,
        table: selectedTable!,
        credentialId: selectedCredentialId!,
      }),
    enabled: hasSelection,
  });

  const previewQuery = useQuery({
    queryKey: ['bigquery', 'preview', selectedCredentialId, selectedDataset, selectedTable, previewLimit],
    queryFn: () =>
      previewBigQueryData({
        ...connectionConfig!,
        limit: previewLimit,
      }),
    enabled: hasSelection,
  });

  const columnDefs = useMemo<ColDef[]>(() => {
    if (!previewQuery.data?.columns) return [];
    return previewQuery.data.columns.map((col) => ({
      field: col.name,
      headerName: col.name,
      sortable: true,
      filter: true,
      resizable: true,
      minWidth: 120,
    }));
  }, [previewQuery.data?.columns]);

  const handleExportCsv = useCallback(() => {
    if (!gridRef.current?.api) return;
    const today = new Date().toISOString().split('T')[0];
    gridRef.current.api.exportDataAsCsv({
      fileName: `${selectedDataset}_${selectedTable}_${today}.csv`,
    });
  }, [selectedDataset, selectedTable]);

  const handleCreateExercise = useCallback(() => {
    navigate('/exercises/new', {
      state: {
        bigquerySource: connectionConfig,
      },
    });
  }, [navigate, connectionConfig]);

  // Empty state: no table selected
  if (!hasSelection) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-forge-500 text-sm">Select a table from the sidebar to preview its data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header bar */}
      <div className="px-4 py-3 border-b border-forge-700 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-sm font-semibold text-forge-100 truncate">
            {selectedDataset}.{selectedTable}
          </h2>
          {previewQuery.data && (
            <span className="shrink-0 px-2 py-0.5 text-[10px] font-medium bg-forge-800 text-forge-400 rounded-full">
              {previewQuery.data.totalRows.toLocaleString()} rows
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Limit selector */}
          <select
            value={previewLimit}
            onChange={(e) => setPreviewLimit(Number(e.target.value))}
            className="bg-forge-800 border border-forge-700 rounded px-2 py-1 text-xs text-forge-300 focus:outline-none focus:border-amber-500/50"
          >
            <option value={50}>50 rows</option>
            <option value={100}>100 rows</option>
            <option value={500}>500 rows</option>
          </select>

          <button
            onClick={handleExportCsv}
            disabled={!previewQuery.data}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-forge-300 bg-forge-800 border border-forge-700 rounded hover:bg-forge-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          <button
            onClick={handleCreateExercise}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-forge-900 bg-amber-500 rounded hover:bg-amber-400 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Exercise
          </button>
        </div>
      </div>

      {/* Schema panel */}
      <BigQuerySchemaPanel
        columns={schemaQuery.data ?? []}
        isLoading={schemaQuery.isLoading}
      />

      {/* Data grid */}
      <div className="flex-1 min-h-0">
        {previewQuery.isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-2 text-forge-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading preview data...</span>
            </div>
          </div>
        ) : previewQuery.isError ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-red-400 text-sm mb-2">Failed to load preview data</p>
              <button
                onClick={() => previewQuery.refetch()}
                className="text-amber-400 hover:text-amber-300 text-xs underline"
              >
                Retry
              </button>
            </div>
          </div>
        ) : previewQuery.data && previewQuery.data.rows.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-forge-500 text-sm">This table has no data</p>
          </div>
        ) : (
          <div className="h-full w-full">
            <AgGridReact
              ref={gridRef}
              theme={gridTheme}
              rowData={previewQuery.data?.rows ?? []}
              columnDefs={columnDefs}
              defaultColDef={{
                sortable: true,
                filter: true,
                resizable: true,
              }}
              animateRows={false}
              suppressCellFocus
            />
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd client && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add client/src/components/bigquery/BigQueryTableView.tsx
git commit -m "feat(bigquery-explorer): add table view with AG Grid, CSV export, and create exercise"
```

---

## Chunk 4: Page Assembly + Integration Tests

### Task 7: Assemble the BigQueryExplorerPage

**Files:**
- Modify: `client/src/pages/BigQueryExplorerPage.tsx` (replace placeholder)

- [ ] **Step 1: Replace the placeholder page with the full implementation**

```typescript
// client/src/pages/BigQueryExplorerPage.tsx
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Database } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { BigQuerySidebar } from '@/components/bigquery/BigQuerySidebar';
import { BigQueryTableView } from '@/components/bigquery/BigQueryTableView';
import { fetchCredentials } from '@/api/credentials';

export function BigQueryExplorerPage() {
  // Pre-check: do any credentials exist?
  const credentialsQuery = useQuery({
    queryKey: ['credentials'],
    queryFn: fetchCredentials,
  });

  const hasCredentials = credentialsQuery.data && credentialsQuery.data.length > 0;
  const isLoading = credentialsQuery.isLoading;

  // No credentials empty state
  if (!isLoading && !hasCredentials) {
    return (
      <AppLayout title="BigQuery Explorer">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <Database className="w-12 h-12 text-forge-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-forge-200 mb-2">No BigQuery credentials configured</h2>
            <p className="text-sm text-forge-500 mb-4">
              Add a GCP service account credential to start browsing BigQuery data.
            </p>
            <Link
              to="/credentials"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-forge-900 bg-amber-500 rounded hover:bg-amber-400 transition-colors"
            >
              Go to Credentials
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="BigQuery Explorer">
      <div className="flex h-full">
        <BigQuerySidebar />
        <BigQueryTableView />
      </div>
    </AppLayout>
  );
}
```

- [ ] **Step 2: Verify the app compiles**

Run: `cd client && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/BigQueryExplorerPage.tsx
git commit -m "feat(bigquery-explorer): assemble full page with sidebar and table view"
```

---

### Task 8: Integration Tests

**Files:**
- Create: `client/src/pages/__tests__/BigQueryExplorerPage.test.tsx`

These tests use MSW to mock API responses and verify the full page renders correctly.

- [ ] **Step 1: Create the test file**

```typescript
// client/src/pages/__tests__/BigQueryExplorerPage.test.tsx
import { describe, it, expect, beforeEach, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { BigQueryExplorerPage } from '../BigQueryExplorerPage';
import { useBigQueryExplorerStore } from '@/stores/bigqueryExplorerStore';
import { AuthProvider } from '@/contexts/AuthContext';

// Mock auth context to provide an admin user
const mockUser = { id: 'u1', name: 'Admin', email: 'admin@test.com', role: 'admin' as const, organizationId: 'org1' };

// MSW handlers
const handlers = [
  http.get('/api/v1/credentials', () => {
    return HttpResponse.json({
      credentials: [
        { id: 'cred-1', name: 'Test GCP Account', credentialType: 'gcp_service_account', createdAt: '2026-01-01', createdBy: 'admin' },
      ],
    });
  }),
  http.get('/api/v1/bigquery/datasets', () => {
    return HttpResponse.json({
      gcpProject: 'test-project',
      datasets: ['analytics', 'raw_data'],
    });
  }),
  http.get('/api/v1/bigquery/tables', ({ request }) => {
    const url = new URL(request.url);
    const dataset = url.searchParams.get('dataset');
    const tables = dataset === 'analytics' ? ['events', 'users'] : ['imports'];
    return HttpResponse.json({ tables });
  }),
  http.post('/api/v1/bigquery/schema', () => {
    return HttpResponse.json({
      columns: [
        { name: 'id', type: 'INTEGER', mode: 'REQUIRED' },
        { name: 'name', type: 'STRING', mode: 'NULLABLE' },
        { name: 'created_at', type: 'TIMESTAMP', mode: 'NULLABLE' },
      ],
    });
  }),
  http.post('/api/v1/bigquery/preview', () => {
    return HttpResponse.json({
      columns: [
        { name: 'id', type: 'INTEGER', mode: 'REQUIRED' },
        { name: 'name', type: 'STRING', mode: 'NULLABLE' },
        { name: 'created_at', type: 'TIMESTAMP', mode: 'NULLABLE' },
      ],
      rows: [
        { id: 1, name: 'Alice', created_at: '2026-01-01T00:00:00Z' },
        { id: 2, name: 'Bob', created_at: '2026-01-02T00:00:00Z' },
      ],
      totalRows: 2,
    });
  }),
];

const server = setupServer(...handlers);

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  // Set mock auth in localStorage so AuthProvider picks it up
  localStorage.setItem('mapforge_token', 'mock-admin-token');
  localStorage.setItem('mapforge_user', JSON.stringify(mockUser));

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <BigQueryExplorerPage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('BigQueryExplorerPage', () => {
  beforeAll(() => server.listen());
  afterEach(() => {
    server.resetHandlers();
    useBigQueryExplorerStore.getState().reset();
    localStorage.clear();
  });
  afterAll(() => server.close());

  it('shows empty state when no credentials exist', async () => {
    server.use(
      http.get('/api/v1/credentials', () => {
        return HttpResponse.json({ credentials: [] });
      }),
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No BigQuery credentials configured')).toBeInTheDocument();
    });
    expect(screen.getByText('Go to Credentials')).toBeInTheDocument();
  });

  it('renders credential dropdown with options', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Test GCP Account')).toBeInTheDocument();
    });
  });

  it('shows empty table state before selection', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Select a table from the sidebar to preview its data')).toBeInTheDocument();
    });
  });

  it('loads datasets when credential is selected', async () => {
    const user = userEvent.setup();
    renderPage();

    // Wait for credentials to load, then select one
    await waitFor(() => {
      expect(screen.getByText('Test GCP Account')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'cred-1');

    // Datasets should load
    await waitFor(() => {
      expect(screen.getByText('analytics')).toBeInTheDocument();
      expect(screen.getByText('raw_data')).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `cd client && npx vitest run src/pages/__tests__/BigQueryExplorerPage.test.tsx`
Expected: All tests PASS. If any fail due to auth setup differences, adjust the mock auth approach to match the project's existing test patterns (check `client/src/mocks/exercises.ts` and other test files).

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/__tests__/BigQueryExplorerPage.test.tsx
git commit -m "test(bigquery-explorer): add page integration tests with MSW"
```

---

### Task 9: Final Verification

- [ ] **Step 1: Run all client tests**

Run: `cd client && npx vitest run`
Expected: All tests pass, no regressions.

- [ ] **Step 2: Run type check across all workspaces**

Run: `npm run typecheck`
Expected: No TypeScript errors.

- [ ] **Step 3: Verify the dev server starts**

Run: `npm run dev:client` (verify it compiles and serves without errors, then Ctrl+C)
Expected: Vite dev server starts cleanly.

- [ ] **Step 4: Final commit if any adjustments were needed**

Only commit if fixes were required in previous steps.
