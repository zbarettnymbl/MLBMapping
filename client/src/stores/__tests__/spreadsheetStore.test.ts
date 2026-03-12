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
