import { Handle, Position } from '@xyflow/react';
import { NodeStatusWrapper } from './NodeStatusWrapper';

export function NotificationNode({ data }: { data: { label: string; runStatus?: string; hasValidationError?: boolean } }) {
  return (
    <NodeStatusWrapper baseColor="#eab308" runStatus={data.runStatus} hasValidationError={data.hasValidationError}>
      <div className="flex items-center gap-2">
        <span className="text-yellow-400 text-lg">&#9993;</span>
        <span className="text-foreground text-sm font-medium">{data.label || 'Notification'}</span>
      </div>
      <Handle type="target" position={Position.Top} className="!bg-yellow-400 !w-3 !h-3" />
    </NodeStatusWrapper>
  );
}
