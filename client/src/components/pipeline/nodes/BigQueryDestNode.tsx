import { Handle, Position } from '@xyflow/react';
import { NodeStatusWrapper } from './NodeStatusWrapper';

export function BigQueryDestNode({ data }: { data: { label: string; runStatus?: string; hasValidationError?: boolean } }) {
  return (
    <NodeStatusWrapper baseColor="#a855f7" runStatus={data.runStatus} hasValidationError={data.hasValidationError}>
      <div className="flex items-center gap-2">
        <span className="text-purple-400 text-lg">&#9707;</span>
        <span className="text-foreground text-sm font-medium">{data.label || 'BQ Destination'}</span>
      </div>
      <Handle type="target" position={Position.Top} className="!bg-purple-400 !w-3 !h-3" />
    </NodeStatusWrapper>
  );
}
