import { Handle, Position } from '@xyflow/react';
import { NodeStatusWrapper } from './NodeStatusWrapper';

export function ValidationGateNode({ data }: { data: { label: string; runStatus?: string; hasValidationError?: boolean } }) {
  return (
    <NodeStatusWrapper baseColor="#22c55e" runStatus={data.runStatus} hasValidationError={data.hasValidationError}>
      <div className="flex items-center gap-2">
        <span className="text-emerald-400 text-lg">&#10003;</span>
        <span className="text-foreground text-sm font-medium">{data.label || 'Validation'}</span>
      </div>
      <Handle type="target" position={Position.Top} className="!bg-emerald-400 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} className="!bg-emerald-400 !w-3 !h-3" />
    </NodeStatusWrapper>
  );
}
