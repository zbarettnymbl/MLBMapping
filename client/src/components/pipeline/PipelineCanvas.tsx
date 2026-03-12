import { useCallback, useEffect, useRef, type DragEvent } from 'react';
import {
  ReactFlow, Background, MiniMap, Controls,
  useNodesState, useEdgesState,
} from '@xyflow/react';
import type { Connection, Edge, Node } from '@xyflow/react';
import type { PipelineNodeConfig, PipelineNodeType } from '@mapforge/shared';
import '@xyflow/react/dist/style.css';
import { usePipelineStore } from '@/stores/pipelineStore';
import { useTheme } from '@/contexts/ThemeContext';
import { BigQuerySourceNode } from './nodes/BigQuerySourceNode';
import { BigQueryDestNode } from './nodes/BigQueryDestNode';
import { ExerciseNode } from './nodes/ExerciseNode';
import { ValidationGateNode } from './nodes/ValidationGateNode';
import { TransformNode } from './nodes/TransformNode';
import { NotificationNode } from './nodes/NotificationNode';

const nodeTypes = {
  bigquery_source: BigQuerySourceNode,
  bigquery_destination: BigQueryDestNode,
  enrichment_exercise: ExerciseNode,
  validation_gate: ValidationGateNode,
  transform: TransformNode,
  notification: NotificationNode,
};

function storeNodesToRF(storeNodes: ReturnType<typeof usePipelineStore.getState>['nodes']): Node[] {
  const { nodeRunStatuses, validationErrors } = usePipelineStore.getState();
  return storeNodes.map(n => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: {
      label: n.label,
      config: n.config,
      runStatus: nodeRunStatuses[n.id] as string | undefined,
      hasValidationError: validationErrors.some(e => e.nodeId === n.id),
    },
  }));
}

function storeEdgesToRF(storeEdges: ReturnType<typeof usePipelineStore.getState>['edges']): Edge[] {
  return storeEdges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    animated: true,
    style: { stroke: 'var(--amber-500)', strokeWidth: 2 },
  }));
}

export function PipelineCanvas() {
  const storeNodes = usePipelineStore(s => s.nodes);
  const storeEdges = usePipelineStore(s => s.edges);
  const nodeRunStatuses = usePipelineStore(s => s.nodeRunStatuses);
  const validationErrors = usePipelineStore(s => s.validationErrors);
  const { resolvedTheme } = useTheme();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(storeNodesToRF(storeNodes));
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(storeEdgesToRF(storeEdges));

  // Sync store -> RF when store changes (e.g. addNode, loadPipeline, reset, run status)
  useEffect(() => {
    setRfNodes(storeNodesToRF(storeNodes));
  }, [storeNodes, nodeRunStatuses, validationErrors, setRfNodes]);

  const prevStoreEdgesRef = useRef(storeEdges);

  useEffect(() => {
    if (storeEdges !== prevStoreEdgesRef.current) {
      prevStoreEdgesRef.current = storeEdges;
      setRfEdges(storeEdgesToRF(storeEdges));
    }
  }, [storeEdges, setRfEdges]);

  // Use getState() in callbacks for stable references (no re-render on every store change)
  const onNodeDragStop = useCallback((_: React.MouseEvent, node: Node) => {
    usePipelineStore.getState().updateNodePosition(node.id, node.position);
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    if (connection.source && connection.target) {
      usePipelineStore.getState().addEdge({
        id: `e-${connection.source}-${connection.target}`,
        source: connection.source,
        target: connection.target,
      });
    }
  }, []);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    usePipelineStore.getState().selectNode(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    usePipelineStore.getState().selectNode(null);
  }, []);

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/pipeline-node-type') as PipelineNodeType;
    const label = event.dataTransfer.getData('application/pipeline-node-label');
    if (!type || !label) return;

    const bounds = wrapperRef.current?.getBoundingClientRect();
    if (!bounds) return;

    const position = {
      x: event.clientX - bounds.left - 80,
      y: event.clientY - bounds.top - 20,
    };

    usePipelineStore.getState().addNode({
      id: `node-${Date.now()}`,
      type,
      label,
      position,
      config: { nodeType: type } as PipelineNodeConfig,
    });
  }, []);

  return (
    <div ref={wrapperRef} className="w-full h-full">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        colorMode={resolvedTheme}
        fitView
        className="bg-forge-950"
      >
        <Background color="var(--forge-700)" gap={20} />
        <Controls className="!bg-forge-800 !border-forge-700" />
        <MiniMap className="!bg-forge-900" nodeColor="#f59e0b" />
      </ReactFlow>
    </div>
  );
}
