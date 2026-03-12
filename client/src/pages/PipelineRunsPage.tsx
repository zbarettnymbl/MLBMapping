import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { RunStatusBadge } from '@/components/pipeline/RunStatusBadge';
import { fetchPipelineRuns, fetchRunDetail } from '@/api/pipelines';
import type { PipelineRunSummary, PipelineNodeRunDetail } from '@mapforge/shared';

export function PipelineRunsPage() {
  const { id } = useParams<{ id: string }>();
  const [runs, setRuns] = useState<PipelineRunSummary[]>([]);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [nodeRuns, setNodeRuns] = useState<PipelineNodeRunDetail[]>([]);

  useEffect(() => {
    if (id) { fetchPipelineRuns(id).then(setRuns).catch(console.error); }
  }, [id]);

  const viewRunDetail = async (runId: string) => {
    setSelectedRun(runId);
    try {
      const detail = await fetchRunDetail(runId);
      setNodeRuns(detail.nodeRuns);
    } catch { setNodeRuns([]); }
  };

  return (
    <AppLayout title="Pipeline Runs">
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          {runs.map(run => (
            <div key={run.id} onClick={() => viewRunDetail(run.id)}
              className={`p-4 bg-muted border rounded-md cursor-pointer hover:bg-muted/80 ${selectedRun === run.id ? 'border-primary' : 'border-border'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <RunStatusBadge status={run.status} />
                  <span className="text-foreground text-sm">{run.triggeredBy}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {run.startedAt ? new Date(run.startedAt).toLocaleString() : 'Pending'}
                </div>
              </div>
              {run.summary && (
                <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                  <span>Nodes: {run.summary.nodesRun}</span>
                  <span>Succeeded: {run.summary.nodesSucceeded}</span>
                  <span>Failed: {run.summary.nodesFailed}</span>
                  <span>Rows: {run.summary.rowsProcessed}</span>
                </div>
              )}
              {run.errorMessage && <p className="mt-1 text-xs text-destructive">{run.errorMessage}</p>}
            </div>
          ))}
          {runs.length === 0 && <p className="text-muted-foreground text-center py-8">No runs yet.</p>}
        </div>
        {selectedRun && nodeRuns.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">Node Execution Detail</h2>
            {nodeRuns.map(nr => (
              <div key={nr.id} className="flex items-center gap-3 p-3 bg-muted border border-border rounded-md">
                <RunStatusBadge status={nr.status} />
                <span className="text-foreground text-sm font-medium">{nr.nodeId}</span>
                <span className="text-xs text-muted-foreground">{nr.nodeType}</span>
                <div className="flex-1" />
                {nr.inputRowCount != null && <span className="text-xs text-muted-foreground">In: {nr.inputRowCount}</span>}
                {nr.outputRowCount != null && <span className="text-xs text-muted-foreground">Out: {nr.outputRowCount}</span>}
                {nr.errorMessage && <span className="text-xs text-destructive truncate max-w-[200px]">{nr.errorMessage}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
