import { useCallback } from 'react';
import { ReactFlow, Background, MiniMap, Controls } from '@xyflow/react';
import type { Connection, Edge, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { usePipelineStore } from '@/stores/pipelineStore';
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

export function PipelineCanvas() {
  const store = usePipelineStore();

  const rfNodes: Node[] = store.nodes.map(n => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: { label: n.label, config: n.config },
  }));

  const rfEdges: Edge[] = store.edges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    animated: true,
    style: { stroke: '#f59e0b', strokeWidth: 2 },
  }));

  const onConnect = useCallback((connection: Connection) => {
    if (connection.source && connection.target) {
      store.addEdge({
        id: `e-${connection.source}-${connection.target}`,
        source: connection.source,
        target: connection.target,
      });
    }
  }, [store]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    store.selectNode(node.id);
  }, [store]);

  const onNodeDragStop = useCallback((_: React.MouseEvent, node: Node) => {
    store.updateNodePosition(node.id, node.position);
  }, [store]);

  const onPaneClick = useCallback(() => {
    store.selectNode(null);
  }, [store]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={onPaneClick}
        fitView
        className="bg-forge-950"
      >
        <Background color="#374151" gap={20} />
        <Controls className="!bg-forge-800 !border-forge-700" />
        <MiniMap className="!bg-forge-900" nodeColor="#f59e0b" />
      </ReactFlow>
    </div>
  );
}
