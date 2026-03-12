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
    store.selectDataset('my_dataset');
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
