import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
  const activeRunId = usePipelineStore(s => s.activeRunId);

  // Load pipeline
  useEffect(() => {
    if (id && id !== 'new') {
      fetchPipeline(id).then(data => {
        usePipelineStore.getState().loadPipeline({
          id: data.id, name: data.name,
          nodes: data.nodes, edges: data.edges,
          triggerType: data.triggerType, triggerConfig: data.triggerConfig,
          status: data.status,
        });
      }).catch(console.error);
    } else {
      usePipelineStore.getState().reset();
    }
  }, [id]);

  // Poll run status
  useEffect(() => {
    if (!activeRunId) return;

    const interval = setInterval(async () => {
      try {
        const { run, nodeRuns } = await fetchRunDetail(activeRunId);
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
  }, [activeRunId]);

  // Unsaved changes warning (browser tab close/refresh only -- useBlocker requires data router)
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
