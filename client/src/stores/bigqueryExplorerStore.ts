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
