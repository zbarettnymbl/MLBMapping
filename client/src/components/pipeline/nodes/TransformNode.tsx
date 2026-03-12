import { Handle, Position } from '@xyflow/react';
import { NodeStatusWrapper } from './NodeStatusWrapper';

export function TransformNode({ data }: { data: { label: string; runStatus?: string; hasValidationError?: boolean } }) {
  return (
    <NodeStatusWrapper baseColor="#06b6d4" runStatus={data.runStatus} hasValidationError={data.hasValidationError}>
      <div className="flex items-center gap-2">
        <span className="text-cyan-400 text-lg">&#8644;</span>
        <span className="text-foreground text-sm font-medium">{data.label || 'Transform'}</span>
      </div>
      <Handle type="target" position={Position.Top} className="!bg-cyan-400 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} className="!bg-cyan-400 !w-3 !h-3" />
    </NodeStatusWrapper>
  );
}
