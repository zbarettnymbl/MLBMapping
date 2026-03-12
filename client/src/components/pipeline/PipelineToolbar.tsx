import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePipelineStore } from '@/stores/pipelineStore';
import { createPipeline, updatePipeline, triggerPipelineRun, deletePipeline, updatePipelineStatus } from '@/api/pipelines';
import { TriggerConfigPanel } from './TriggerConfigPanel';
import toast from 'react-hot-toast';
import type { PipelineStatus } from '@mapforge/shared';
import { validatePipeline } from '@/utils/pipelineValidation';

export function PipelineToolbar() {
  const store = usePipelineStore();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRunConfirm, setShowRunConfirm] = useState(false);

  const handleSave = async () => {
    const errors = validatePipeline(store.nodes, store.edges, store.triggerType, store.triggerConfig);
    if (errors.length > 0) {
      store.setValidationErrors(errors);
      const nodeErrors = errors.filter(e => e.nodeId);
      const globalErrors = errors.filter(e => !e.nodeId);
      if (globalErrors.length > 0) {
        toast.error(globalErrors.map(e => e.message).join('\n'));
      }
      if (nodeErrors.length > 0) {
        toast.error(`${nodeErrors.length} node(s) have configuration errors`);
        const firstErrorNodeId = nodeErrors[0].nodeId;
        if (firstErrorNodeId) store.selectNode(firstErrorNodeId);
      }
      return;
    }
    store.setValidationErrors([]);
    setSaving(true);
    try {
      if (store.pipelineId) {
        await updatePipeline(store.pipelineId, {
          name: store.pipelineName, nodes: store.nodes, edges: store.edges,
          triggerType: store.triggerType as any, triggerConfig: store.triggerConfig as any,
        });
        toast.success('Pipeline saved');
      } else {
        const result = await createPipeline({
          name: store.pipelineName, nodes: store.nodes, edges: store.edges,
          triggerType: store.triggerType as any, triggerConfig: store.triggerConfig as any,
        });
        store.setPipelineId(result.id);
        toast.success('Pipeline created');
      }
      store.markClean();
    } catch (err) {
      toast.error('Failed to save pipeline');
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async () => {
    if (!store.pipelineId) return;
    setShowRunConfirm(false);
    try {
      const { runId } = await triggerPipelineRun(store.pipelineId);
      store.setActiveRunId(runId);
      toast.success('Pipeline run started');
    } catch (err) {
      toast.error('Failed to start pipeline run');
      console.error('Run failed:', err);
    }
  };

  const handleDelete = async () => {
    if (!store.pipelineId) return;
    setShowDeleteConfirm(false);
    try {
      await deletePipeline(store.pipelineId);
      toast.success('Pipeline deleted');
      navigate('/pipelines');
    } catch (err) {
      toast.error('Failed to delete pipeline');
      console.error('Delete failed:', err);
    }
  };

  const handleStatusToggle = async () => {
    if (!store.pipelineId) return;
    const newStatus: PipelineStatus = store.status === 'active' ? 'paused' : 'active';
    try {
      await updatePipelineStatus(store.pipelineId, newStatus);
      store.setStatus(newStatus);
      toast.success(`Pipeline ${newStatus === 'active' ? 'activated' : 'paused'}`);
    } catch (err) {
      toast.error('Failed to update pipeline status');
      console.error('Status update failed:', err);
    }
  };

  const statusColors: Record<PipelineStatus, string> = {
    draft: 'bg-forge-600 text-forge-300',
    active: 'bg-emerald-500/20 text-emerald-300',
    paused: 'bg-yellow-500/20 text-yellow-300',
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-forge-900 border-b border-forge-700 relative">
      <input
        type="text"
        value={store.pipelineName}
        onChange={(e) => store.setPipelineName(e.target.value)}
        className="px-3 py-1.5 bg-forge-800 border border-forge-600 rounded text-forge-100 text-sm w-48"
      />
      <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${statusColors[store.status]}`}>
        {store.status}
      </span>

      <div className="border-l border-forge-700 h-6 mx-1" />

      <TriggerConfigPanel />

      <div className="flex-1" />

      {store.pipelineId && (
        <button
          onClick={handleStatusToggle}
          className="px-3 py-1.5 bg-forge-800 border border-forge-600 text-forge-200 rounded text-sm hover:bg-forge-700"
        >
          {store.status === 'active' ? 'Pause' : 'Activate'}
        </button>
      )}
      <button
        onClick={handleSave}
        disabled={!store.isDirty || saving}
        className="px-3 py-1.5 bg-amber-500 text-forge-900 rounded text-sm font-medium hover:bg-amber-400 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
      <button
        onClick={() => setShowRunConfirm(true)}
        disabled={!store.pipelineId}
        className="px-3 py-1.5 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
      >
        Run
      </button>
      {store.pipelineId && (
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-sm hover:bg-red-500/30"
        >
          Delete
        </button>
      )}

      {/* Run confirmation */}
      {showRunConfirm && (
        <div className="absolute top-full right-4 mt-1 z-50 bg-forge-800 border border-forge-600 rounded-lg shadow-xl p-4 w-64">
          <p className="text-sm text-forge-200 mb-3">Run this pipeline now?</p>
          <div className="flex gap-2">
            <button onClick={handleRun} className="flex-1 px-3 py-1.5 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-500">
              Confirm
            </button>
            <button onClick={() => setShowRunConfirm(false)} className="flex-1 px-3 py-1.5 bg-forge-700 text-forge-300 rounded text-sm hover:bg-forge-600">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="absolute top-full right-4 mt-1 z-50 bg-forge-800 border border-forge-600 rounded-lg shadow-xl p-4 w-64">
          <p className="text-sm text-forge-200 mb-3">Delete this pipeline? This cannot be undone.</p>
          <div className="flex gap-2">
            <button onClick={handleDelete} className="flex-1 px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-500">
              Delete
            </button>
            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-3 py-1.5 bg-forge-700 text-forge-300 rounded text-sm hover:bg-forge-600">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
