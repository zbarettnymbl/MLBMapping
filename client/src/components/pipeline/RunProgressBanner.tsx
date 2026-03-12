import { usePipelineStore } from '@/stores/pipelineStore';

export function RunProgressBanner() {
  const { activeRunId, nodeRunStatuses, nodes } = usePipelineStore();

  if (!activeRunId) return null;

  const totalNodes = nodes.length;
  const completedNodes = Object.values(nodeRunStatuses).filter(
    s => s === 'success' || s === 'failed' || s === 'skipped'
  ).length;
  const hasFailed = Object.entries(nodeRunStatuses).some(([, s]) => s === 'failed');
  const allDone = completedNodes === totalNodes && totalNodes > 0;
  const failedNodeId = Object.entries(nodeRunStatuses).find(([, s]) => s === 'failed')?.[0];
  const failedNodeName = failedNodeId ? nodes.find(n => n.id === failedNodeId)?.label : undefined;

  if (allDone && hasFailed) {
    return (
      <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/30 flex items-center justify-between">
        <span className="text-sm text-red-300">
          Pipeline failed{failedNodeName ? ` at "${failedNodeName}"` : ''}
        </span>
        <button
          onClick={() => usePipelineStore.getState().clearRunStatus()}
          className="text-xs text-red-400 hover:text-red-300"
        >
          Dismiss
        </button>
      </div>
    );
  }

  if (allDone) {
    return (
      <div className="px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/30 flex items-center justify-between">
        <span className="text-sm text-emerald-300">Pipeline completed successfully</span>
        <button
          onClick={() => usePipelineStore.getState().clearRunStatus()}
          className="text-xs text-emerald-400 hover:text-emerald-300"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 flex items-center gap-2">
      <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm text-amber-300">
        Pipeline running... ({completedNodes}/{totalNodes} nodes complete)
      </span>
    </div>
  );
}
