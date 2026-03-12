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
