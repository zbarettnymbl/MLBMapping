import { create } from 'zustand';
import type { PipelineNode, PipelineEdge, PipelineNodeConfig } from '@mapforge/shared';

interface PipelineState {
  pipelineId: string | null;
  pipelineName: string;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  selectedNodeId: string | null;
  isDirty: boolean;
  triggerType: string;
  triggerConfig: Record<string, unknown>;

  setPipelineId: (id: string | null) => void;
  setPipelineName: (name: string) => void;
  setNodes: (nodes: PipelineNode[]) => void;
  setEdges: (edges: PipelineEdge[]) => void;
  addNode: (node: PipelineNode) => void;
  removeNode: (id: string) => void;
  updateNodeConfig: (id: string, config: PipelineNodeConfig) => void;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
  addEdge: (edge: PipelineEdge) => void;
  removeEdge: (id: string) => void;
  selectNode: (id: string | null) => void;
  setTriggerType: (type: string) => void;
  setTriggerConfig: (config: Record<string, unknown>) => void;
  markClean: () => void;
  reset: () => void;
  loadPipeline: (data: { id: string; name: string; nodes: PipelineNode[]; edges: PipelineEdge[]; triggerType: string; triggerConfig: Record<string, unknown> }) => void;
}

const initialState = {
  pipelineId: null as string | null,
  pipelineName: 'New Pipeline',
  nodes: [] as PipelineNode[],
  edges: [] as PipelineEdge[],
  selectedNodeId: null as string | null,
  isDirty: false,
  triggerType: 'manual',
  triggerConfig: {} as Record<string, unknown>,
};

export const usePipelineStore = create<PipelineState>((set) => ({
  ...initialState,
  setPipelineId: (id) => set({ pipelineId: id }),
  setPipelineName: (name) => set({ pipelineName: name, isDirty: true }),
  setNodes: (nodes) => set({ nodes, isDirty: true }),
  setEdges: (edges) => set({ edges, isDirty: true }),
  addNode: (node) => set((s) => ({ nodes: [...s.nodes, node], isDirty: true })),
  removeNode: (id) => set((s) => ({
    nodes: s.nodes.filter(n => n.id !== id),
    edges: s.edges.filter(e => e.source !== id && e.target !== id),
    selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
    isDirty: true,
  })),
  updateNodeConfig: (id, config) => set((s) => ({
    nodes: s.nodes.map(n => n.id === id ? { ...n, config } : n), isDirty: true,
  })),
  updateNodePosition: (id, position) => set((s) => ({
    nodes: s.nodes.map(n => n.id === id ? { ...n, position } : n), isDirty: true,
  })),
  addEdge: (edge) => set((s) => ({ edges: [...s.edges, edge], isDirty: true })),
  removeEdge: (id) => set((s) => ({ edges: s.edges.filter(e => e.id !== id), isDirty: true })),
  selectNode: (id) => set({ selectedNodeId: id }),
  setTriggerType: (type) => set({ triggerType: type, isDirty: true }),
  setTriggerConfig: (config) => set({ triggerConfig: config, isDirty: true }),
  markClean: () => set({ isDirty: false }),
  reset: () => set({ ...initialState }),
  loadPipeline: (data) => set({
    pipelineId: data.id, pipelineName: data.name, nodes: data.nodes, edges: data.edges,
    triggerType: data.triggerType, triggerConfig: data.triggerConfig, isDirty: false, selectedNodeId: null,
  }),
}));
