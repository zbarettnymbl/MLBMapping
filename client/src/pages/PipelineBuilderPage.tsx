import { useEffect, useCallback } from 'react';
import { useParams, useBlocker } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { PipelineCanvas } from '@/components/pipeline/PipelineCanvas';
import { PipelineToolbar } from '@/components/pipeline/PipelineToolbar';
import { NodePalette } from '@/components/pipeline/NodePalette';
import { NodeConfigDrawer } from '@/components/pipeline/NodeConfigDrawer';
import { RunProgressBanner } from '@/components/pipeline/RunProgressBanner';
import { usePipelineStore } from '@/stores/pipelineStore';
import { fetchPipeline, fetchRunDetail } from '@/api/pipelines';
import type { NodeRunStatus } from '@mapforge/shared';

const TERMINAL_STATUSES = ['success', 'failed', 'cancelled'];

export function PipelineBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const store = usePipelineStore();

  // Load pipeline
  useEffect(() => {
    if (id && id !== 'new') {
      fetchPipeline(id).then(data => {
        store.loadPipeline({
          id: data.id, name: data.name,
          nodes: data.nodes, edges: data.edges,
          triggerType: data.triggerType, triggerConfig: data.triggerConfig,
          status: data.status,
        });
      }).catch(console.error);
    } else {
      store.reset();
    }
  }, [id]);

  // Poll run status
  useEffect(() => {
    const runId = usePipelineStore.getState().activeRunId;
    if (!runId) return;

    const interval = setInterval(async () => {
      try {
        const { run, nodeRuns } = await fetchRunDetail(runId);
        const statuses: Record<string, NodeRunStatus> = {};
        const details: Record<string, { inputRowCount: number | null; outputRowCount: number | null; startedAt: string | null; completedAt: string | null; errorMessage: string | null }> = {};
        for (const nr of nodeRuns) {
          statuses[nr.nodeId] = nr.status;
          details[nr.nodeId] = {
            inputRowCount: nr.inputRowCount,
            outputRowCount: nr.outputRowCount,
            startedAt: nr.startedAt,
            completedAt: nr.completedAt,
            errorMessage: nr.errorMessage,
          };
        }
        usePipelineStore.getState().setNodeRunStatuses(statuses);
        usePipelineStore.getState().setNodeRunDetails(details);

        if (TERMINAL_STATUSES.includes(run.status)) {
          usePipelineStore.getState().setActiveRunId(null);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [store.activeRunId]);

  // Unsaved changes warning
  const blocker = useBlocker(
    useCallback(() => usePipelineStore.getState().isDirty, [])
  );

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (usePipelineStore.getState().isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  return (
    <AppLayout title="Pipeline Builder">
      <div className="flex flex-col h-full">
        <PipelineToolbar />
        <RunProgressBanner />
        {blocker.state === 'blocked' && (
          <div className="px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/30 flex items-center justify-between">
            <span className="text-sm text-yellow-300">You have unsaved changes.</span>
            <div className="flex gap-2">
              <button onClick={() => blocker.proceed?.()} className="text-xs text-yellow-400 hover:text-yellow-300">
                Leave anyway
              </button>
              <button onClick={() => blocker.reset?.()} className="text-xs text-forge-300 hover:text-forge-100">
                Stay
              </button>
            </div>
          </div>
        )}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <NodePalette />
          <div className="flex-1 min-h-0">
            <PipelineCanvas />
          </div>
          <NodeConfigDrawer />
        </div>
      </div>
    </AppLayout>
  );
}
