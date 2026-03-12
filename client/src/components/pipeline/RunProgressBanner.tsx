import { usePipelineStore } from '@/stores/pipelineStore';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

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
      <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/30 flex items-center justify-between">
        <span className="text-sm text-destructive">
          Pipeline failed{failedNodeName ? ` at "${failedNodeName}"` : ''}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => usePipelineStore.getState().clearRunStatus()}
          className="h-6 px-2 text-xs text-destructive hover:text-destructive"
        >
          Dismiss
        </Button>
      </div>
    );
  }

  if (allDone) {
    return (
      <div className="px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/30 flex items-center justify-between">
        <span className="text-sm text-emerald-400 dark:text-emerald-300">Pipeline completed successfully</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => usePipelineStore.getState().clearRunStatus()}
          className="h-6 px-2 text-xs text-emerald-400 hover:text-emerald-300"
        >
          Dismiss
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 py-2 bg-primary/10 border-b border-primary/30 flex items-center gap-2">
      <Loader2 className="h-3 w-3 animate-spin text-primary" />
      <span className="text-sm text-primary">
        Pipeline running... ({completedNodes}/{totalNodes} nodes complete)
      </span>
    </div>
  );
}
