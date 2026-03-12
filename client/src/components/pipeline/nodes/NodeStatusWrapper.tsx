import type { NodeRunStatus } from '@mapforge/shared';
import { CheckCircle, XCircle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  baseColor: string;
  runStatus?: string;
  hasValidationError?: boolean;
}

const STATUS_STYLES: Record<NodeRunStatus, string> = {
  pending: 'border-gray-400 border-dashed',
  running: 'border-amber-400 animate-pulse',
  success: 'border-emerald-400',
  failed: 'border-red-400',
  skipped: 'opacity-50 border-forge-600',
};

export function NodeStatusWrapper({ children, baseColor, runStatus, hasValidationError }: Props) {
  const statusStyle = runStatus ? STATUS_STYLES[runStatus as NodeRunStatus] : '';

  return (
    <div className={`px-4 py-3 bg-forge-800 border-2 rounded-lg shadow-lg min-w-[160px] relative ${statusStyle || ''}`}
      style={!statusStyle ? { borderColor: `${baseColor}80` } : undefined}
    >
      {children}
      {runStatus === 'success' && (
        <CheckCircle size={14} className="absolute top-1 right-1 text-emerald-400" />
      )}
      {runStatus === 'failed' && (
        <XCircle size={14} className="absolute top-1 right-1 text-red-400" />
      )}
      {hasValidationError && !runStatus && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-forge-800" />
      )}
    </div>
  );
}
