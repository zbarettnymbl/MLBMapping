import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { PipelineCanvas } from '@/components/pipeline/PipelineCanvas';
import { PipelineToolbar } from '@/components/pipeline/PipelineToolbar';
import { NodeConfigDrawer } from '@/components/pipeline/NodeConfigDrawer';
import { usePipelineStore } from '@/stores/pipelineStore';
import { fetchPipeline } from '@/api/pipelines';

export function PipelineBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const store = usePipelineStore();

  useEffect(() => {
    if (id && id !== 'new') {
      fetchPipeline(id).then(data => {
        store.loadPipeline({
          id: data.id, name: data.name,
          nodes: data.nodes, edges: data.edges,
          triggerType: data.triggerType, triggerConfig: data.triggerConfig,
        });
      }).catch(console.error);
    } else {
      store.reset();
    }
  }, [id]);

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <PipelineToolbar />
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1">
            <PipelineCanvas />
          </div>
          <NodeConfigDrawer />
        </div>
      </div>
    </AppLayout>
  );
}
