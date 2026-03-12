import { Handle, Position } from '@xyflow/react';
import { NodeStatusWrapper } from './NodeStatusWrapper';

export function ExerciseNode({ data }: { data: { label: string; runStatus?: string; hasValidationError?: boolean } }) {
  return (
    <NodeStatusWrapper baseColor="#f59e0b" runStatus={data.runStatus} hasValidationError={data.hasValidationError}>
      <div className="flex items-center gap-2">
        <span className="text-amber-400 text-lg">&#9998;</span>
        <span className="text-forge-100 text-sm font-medium">{data.label || 'Exercise'}</span>
      </div>
      <Handle type="target" position={Position.Top} className="!bg-amber-400 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} className="!bg-amber-400 !w-3 !h-3" />
    </NodeStatusWrapper>
  );
}
