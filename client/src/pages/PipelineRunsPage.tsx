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
              className={`p-4 bg-forge-800 border rounded-md cursor-pointer hover:bg-forge-750 ${selectedRun === run.id ? 'border-amber-500' : 'border-forge-700'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <RunStatusBadge status={run.status} />
                  <span className="text-forge-200 text-sm">{run.triggeredBy}</span>
                </div>
                <div className="text-sm text-forge-400">
                  {run.startedAt ? new Date(run.startedAt).toLocaleString() : 'Pending'}
                </div>
              </div>
              {run.summary && (
                <div className="mt-2 flex gap-4 text-xs text-forge-400">
                  <span>Nodes: {run.summary.nodesRun}</span>
                  <span>Succeeded: {run.summary.nodesSucceeded}</span>
                  <span>Failed: {run.summary.nodesFailed}</span>
                  <span>Rows: {run.summary.rowsProcessed}</span>
                </div>
              )}
              {run.errorMessage && <p className="mt-1 text-xs text-red-400">{run.errorMessage}</p>}
            </div>
          ))}
          {runs.length === 0 && <p className="text-forge-500 text-center py-8">No runs yet.</p>}
        </div>
        {selectedRun && nodeRuns.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-forge-200">Node Execution Detail</h2>
            {nodeRuns.map(nr => (
              <div key={nr.id} className="flex items-center gap-3 p-3 bg-forge-800 border border-forge-700 rounded-md">
                <RunStatusBadge status={nr.status} />
                <span className="text-forge-200 text-sm font-medium">{nr.nodeId}</span>
                <span className="text-xs text-forge-400">{nr.nodeType}</span>
                <div className="flex-1" />
                {nr.inputRowCount != null && <span className="text-xs text-forge-400">In: {nr.inputRowCount}</span>}
                {nr.outputRowCount != null && <span className="text-xs text-forge-400">Out: {nr.outputRowCount}</span>}
                {nr.errorMessage && <span className="text-xs text-red-400 truncate max-w-[200px]">{nr.errorMessage}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
