import { Handle, Position } from '@xyflow/react';

export function ValidationGateNode({ data }: { data: { label: string; status?: string } }) {
  return (
    <div className="px-4 py-3 bg-forge-800 border-2 border-emerald-500/50 rounded-lg shadow-lg min-w-[160px]">
      <div className="flex items-center gap-2">
        <span className="text-emerald-400 text-lg">&#10003;</span>
        <span className="text-forge-100 text-sm font-medium">{data.label || 'Validation'}</span>
      </div>
      {data.status && <span className="text-xs text-forge-400 mt-1 block">{data.status}</span>}
      <Handle type="target" position={Position.Top} className="!bg-emerald-400 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} className="!bg-emerald-400 !w-3 !h-3" />
    </div>
  );
}
