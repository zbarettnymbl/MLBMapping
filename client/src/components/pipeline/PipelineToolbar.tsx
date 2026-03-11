import { usePipelineStore } from '@/stores/pipelineStore';
import { createPipeline, updatePipeline, triggerPipelineRun } from '@/api/pipelines';
import type { PipelineNodeType, PipelineNodeConfig } from '@mapforge/shared';

const NODE_PALETTE: Array<{ type: PipelineNodeType; label: string; color: string }> = [
  { type: 'bigquery_source', label: 'BQ Source', color: 'blue' },
  { type: 'bigquery_destination', label: 'BQ Dest', color: 'purple' },
  { type: 'enrichment_exercise', label: 'Exercise', color: 'amber' },
  { type: 'validation_gate', label: 'Validation', color: 'emerald' },
  { type: 'transform', label: 'Transform', color: 'cyan' },
  { type: 'notification', label: 'Notify', color: 'yellow' },
];

export function PipelineToolbar() {
  const store = usePipelineStore();

  const addNode = (type: PipelineNodeType, label: string) => {
    const id = `node-${Date.now()}`;
    const x = 100 + Math.random() * 300;
    const y = 100 + Math.random() * 200;
    store.addNode({
      id, type, label, position: { x, y },
      config: { nodeType: type } as PipelineNodeConfig,
    });
  };

  const handleSave = async () => {
    try {
      if (store.pipelineId) {
        await updatePipeline(store.pipelineId, {
          name: store.pipelineName, nodes: store.nodes, edges: store.edges,
          triggerType: store.triggerType as any, triggerConfig: store.triggerConfig as any,
        });
      } else {
        const result = await createPipeline({
          name: store.pipelineName, nodes: store.nodes, edges: store.edges,
          triggerType: store.triggerType as any, triggerConfig: store.triggerConfig as any,
        });
        store.setPipelineId(result.id);
      }
      store.markClean();
    } catch (err) { console.error('Save failed:', err); }
  };

  const handleRun = async () => {
    if (!store.pipelineId) return;
    try { await triggerPipelineRun(store.pipelineId); }
    catch (err) { console.error('Run failed:', err); }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-forge-900 border-b border-forge-700">
      <input type="text" value={store.pipelineName} onChange={(e) => store.setPipelineName(e.target.value)}
        className="px-3 py-1.5 bg-forge-800 border border-forge-600 rounded text-forge-100 text-sm w-48" />
      <div className="h-6 w-px bg-forge-700" />
      {NODE_PALETTE.map(({ type, label }) => (
        <button key={type} onClick={() => addNode(type, label)}
          className="px-2 py-1 bg-forge-800 border border-forge-600 rounded text-xs text-forge-300 hover:bg-forge-700 hover:text-forge-100">
          + {label}
        </button>
      ))}
      <div className="flex-1" />
      <button onClick={handleSave} disabled={!store.isDirty}
        className="px-3 py-1.5 bg-amber-500 text-forge-900 rounded text-sm font-medium hover:bg-amber-400 disabled:opacity-50">
        Save
      </button>
      <button onClick={handleRun} disabled={!store.pipelineId}
        className="px-3 py-1.5 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-500 disabled:opacity-50">
        Run
      </button>
    </div>
  );
}
