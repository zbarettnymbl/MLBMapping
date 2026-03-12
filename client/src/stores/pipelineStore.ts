import { create } from 'zustand';
import type { PipelineNode, PipelineEdge, PipelineNodeConfig, PipelineStatus, NodeRunStatus } from '@mapforge/shared';
import type { NodeChange, EdgeChange } from '@xyflow/react';
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';

interface PipelineState {
  pipelineId: string | null;
  pipelineName: string;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  selectedNodeId: string | null;
  isDirty: boolean;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  status: PipelineStatus;
  activeRunId: string | null;
  nodeRunStatuses: Record<string, NodeRunStatus>;
  nodeRunDetails: Record<string, { inputRowCount: number | null; outputRowCount: number | null; startedAt: string | null; completedAt: string | null; errorMessage: string | null }>;
  validationErrors: Array<{ nodeId?: string; message: string }>;

  setPipelineId: (id: string | null) => void;
  setPipelineName: (name: string) => void;
  setNodes: (nodes: PipelineNode[]) => void;
  setEdges: (edges: PipelineEdge[]) => void;
  addNode: (node: PipelineNode) => void;
  removeNode: (id: string) => void;
  updateNodeConfig: (id: string, config: PipelineNodeConfig) => void;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
  applyNodeChanges: (changes: NodeChange[]) => void;
  applyEdgeChanges: (changes: EdgeChange[]) => void;
  addEdge: (edge: PipelineEdge) => void;
  removeEdge: (id: string) => void;
  selectNode: (id: string | null) => void;
  setTriggerType: (type: string) => void;
  setTriggerConfig: (config: Record<string, unknown>) => void;
  setStatus: (status: PipelineStatus) => void;
  setActiveRunId: (runId: string | null) => void;
  setNodeRunStatuses: (statuses: Record<string, NodeRunStatus>) => void;
  setNodeRunDetails: (details: Record<string, { inputRowCount: number | null; outputRowCount: number | null; startedAt: string | null; completedAt: string | null; errorMessage: string | null }>) => void;
  setValidationErrors: (errors: Array<{ nodeId?: string; message: string }>) => void;
  clearRunStatus: () => void;
  markClean: () => void;
  reset: () => void;
  loadPipeline: (data: { id: string; name: string; nodes: PipelineNode[]; edges: PipelineEdge[]; triggerType: string; triggerConfig: Record<string, unknown>; status?: PipelineStatus }) => void;
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
  status: 'draft' as PipelineStatus,
  activeRunId: null as string | null,
  nodeRunStatuses: {} as Record<string, NodeRunStatus>,
  nodeRunDetails: {} as Record<string, { inputRowCount: number | null; outputRowCount: number | null; startedAt: string | null; completedAt: string | null; errorMessage: string | null }>,
  validationErrors: [] as Array<{ nodeId?: string; message: string }>,
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
  applyNodeChanges: (changes) => set((s) => {
    // Only process changes that affect data we persist (position, remove)
    const relevantChanges = changes.filter(c => c.type === 'position' || c.type === 'remove');
    if (relevantChanges.length === 0) return s;

    const rfNodes: Node[] = s.nodes.map(n => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: { label: n.label, config: n.config },
    }));
    const updated = applyNodeChanges(relevantChanges, rfNodes);
    return {
      nodes: updated.map(n => ({
        id: n.id,
        type: n.type!,
        label: (n.data as { label: string }).label,
        position: n.position,
        config: (n.data as { config: PipelineNodeConfig }).config,
      })) as PipelineNode[],
      isDirty: true,
    };
  }),
  applyEdgeChanges: (changes) => set((s) => {
    const rfEdges: Edge[] = s.edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
    }));
    const updated = applyEdgeChanges(changes, rfEdges);
    const hasDirtyChange = changes.some(c => c.type === 'remove');
    return {
      edges: updated.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
      })),
      ...(hasDirtyChange ? { isDirty: true } : {}),
    };
  }),
  addEdge: (edge) => set((s) => ({ edges: [...s.edges, edge], isDirty: true })),
  removeEdge: (id) => set((s) => ({ edges: s.edges.filter(e => e.id !== id), isDirty: true })),
  selectNode: (id) => set({ selectedNodeId: id }),
  setTriggerType: (type) => set({ triggerType: type, isDirty: true }),
  setTriggerConfig: (config) => set({ triggerConfig: config, isDirty: true }),
  setStatus: (status) => set({ status }),
  setActiveRunId: (runId) => set({ activeRunId: runId }),
  setNodeRunStatuses: (statuses) => set({ nodeRunStatuses: statuses }),
  setNodeRunDetails: (details) => set({ nodeRunDetails: details }),
  setValidationErrors: (errors) => set({ validationErrors: errors }),
  clearRunStatus: () => set({ activeRunId: null, nodeRunStatuses: {}, nodeRunDetails: {} }),
  markClean: () => set({ isDirty: false }),
  reset: () => set({ ...initialState }),
  loadPipeline: (data) => set({
    pipelineId: data.id, pipelineName: data.name, nodes: data.nodes, edges: data.edges,
    triggerType: data.triggerType, triggerConfig: data.triggerConfig, status: data.status ?? 'draft',
    isDirty: false, selectedNodeId: null, activeRunId: null, nodeRunStatuses: {}, nodeRunDetails: {}, validationErrors: [],
  }),
}));
