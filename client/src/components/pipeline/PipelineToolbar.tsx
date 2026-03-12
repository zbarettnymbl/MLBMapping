import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePipelineStore } from '@/stores/pipelineStore';
import { createPipeline, updatePipeline, triggerPipelineRun, deletePipeline, updatePipelineStatus } from '@/api/pipelines';
import { TriggerConfigPanel } from './TriggerConfigPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
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

  const statusVariant: Record<PipelineStatus, 'secondary' | 'success' | 'warning'> = {
    draft: 'secondary',
    active: 'success',
    paused: 'warning',
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border relative">
      <Input
        type="text"
        value={store.pipelineName}
        onChange={(e) => store.setPipelineName(e.target.value)}
        className="w-48 h-8"
      />
      <Badge variant={statusVariant[store.status]} className="uppercase tracking-wider text-[10px]">
        {store.status}
      </Badge>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <TriggerConfigPanel />

      <div className="flex-1" />

      {store.pipelineId && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleStatusToggle}
        >
          {store.status === 'active' ? 'Pause' : 'Activate'}
        </Button>
      )}
      <Button
        size="sm"
        onClick={handleSave}
        disabled={!store.isDirty || saving}
        isLoading={saving}
      >
        Save
      </Button>
      <Button
        size="sm"
        onClick={() => setShowRunConfirm(true)}
        disabled={!store.pipelineId}
        className="bg-emerald-600 text-white hover:bg-emerald-500"
      >
        Run
      </Button>
      {store.pipelineId && (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowDeleteConfirm(true)}
        >
          Delete
        </Button>
      )}

      {/* Run confirmation */}
      {showRunConfirm && (
        <div className="absolute top-full right-4 mt-1 z-50 bg-card border border-border rounded-lg shadow-xl p-4 w-64">
          <p className="text-sm text-foreground mb-3">Run this pipeline now?</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleRun} className="flex-1 bg-emerald-600 text-white hover:bg-emerald-500">
              Confirm
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowRunConfirm(false)} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="absolute top-full right-4 mt-1 z-50 bg-card border border-border rounded-lg shadow-xl p-4 w-64">
          <p className="text-sm text-foreground mb-3">Delete this pipeline? This cannot be undone.</p>
          <div className="flex gap-2">
            <Button variant="destructive" size="sm" onClick={handleDelete} className="flex-1">
              Delete
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowDeleteConfirm(false)} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
