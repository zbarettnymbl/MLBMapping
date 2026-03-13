import { useState } from 'react';
import { usePipelineStore } from '@/stores/pipelineStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { PipelineNodeConfig, NodeRunStatus } from '@mapforge/shared';
import { BigQuerySourceForm } from './config/BigQuerySourceForm';
import { BigQueryDestinationForm } from './config/BigQueryDestinationForm';
import { EnrichmentExerciseForm } from './config/EnrichmentExerciseForm';
import { ValidationGateForm } from './config/ValidationGateForm';
import { TransformForm } from './config/TransformForm';
import { NotificationForm } from './config/NotificationForm';

function NodeConfigForm({ nodeId, nodeType, config }: { nodeId: string; nodeType: string; config: PipelineNodeConfig }) {
  switch (nodeType) {
    case 'bigquery_source':
      return <BigQuerySourceForm nodeId={nodeId} config={config as any} />;
    case 'bigquery_destination':
      return <BigQueryDestinationForm nodeId={nodeId} config={config as any} />;
    case 'enrichment_exercise':
      return <EnrichmentExerciseForm nodeId={nodeId} config={config as any} />;
    case 'validation_gate':
      return <ValidationGateForm nodeId={nodeId} config={config as any} />;
    case 'transform':
      return <TransformForm nodeId={nodeId} config={config as any} />;
    case 'notification':
      return <NotificationForm nodeId={nodeId} config={config as any} />;
    default:
      return (
        <div className="space-y-2">
          <div className="px-2 py-1.5 bg-warning/10 border border-warning/30 rounded text-xs text-warning">
            No visual editor for node type "{nodeType}".
          </div>
          <pre className="text-xs text-muted-foreground bg-muted p-2 rounded overflow-auto max-h-48 font-mono">
            {JSON.stringify(config, null, 2)}
          </pre>
        </div>
      );
  }
}

function NodeRunStatusBadge({ status }: { status: NodeRunStatus }) {
  const variantMap: Record<NodeRunStatus, 'secondary' | 'warning' | 'success' | 'destructive'> = {
    pending: 'secondary',
    running: 'warning',
    success: 'success',
    failed: 'destructive',
    skipped: 'secondary',
  };
  return (
    <Badge variant={variantMap[status]} className="text-xs">
      {status}
    </Badge>
  );
}

export function NodeConfigDrawer() {
  const { nodes, selectedNodeId, removeNode, selectNode,
    nodeRunStatuses, nodeRunDetails, validationErrors } = usePipelineStore();
  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const [activeTab, setActiveTab] = useState<'config' | 'run'>('config');

  if (!selectedNode) return null;

  const runStatus = selectedNodeId ? nodeRunStatuses[selectedNodeId] : undefined;
  const runDetail = selectedNodeId ? nodeRunDetails[selectedNodeId] : undefined;
  const nodeErrors = validationErrors.filter(e => e.nodeId === selectedNodeId);

  const handleLabelChange = (label: string) => {
    const currentNodes = usePipelineStore.getState().nodes;
    usePipelineStore.getState().setNodes(
      currentNodes.map(n => n.id === selectedNode.id ? { ...n, label } : n)
    );
  };

  return (
    <div className="w-80 bg-card border-l border-border overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{selectedNode.type.replace(/_/g, ' ')}</span>
          <Button variant="ghost" size="sm" onClick={() => selectNode(null)} className="h-6 px-2 text-xs">
            Close
          </Button>
        </div>
        <Input
          type="text"
          value={selectedNode.label}
          onChange={(e) => handleLabelChange(e.target.value)}
          className="h-8 text-sm font-medium"
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('config')}
          className={cn(
            'flex-1 px-3 py-2 text-xs font-medium transition-colors cursor-pointer',
            activeTab === 'config'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Config
        </button>
        <button
          onClick={() => setActiveTab('run')}
          className={cn(
            'flex-1 px-3 py-2 text-xs font-medium transition-colors cursor-pointer',
            activeTab === 'run'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Last Run
          {runStatus && <NodeRunStatusBadge status={runStatus} />}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'config' ? (
          <div className="space-y-4">
            {nodeErrors.length > 0 && (
              <div className="px-2 py-1.5 bg-destructive/10 border border-destructive/30 rounded">
                {nodeErrors.map((err, i) => (
                  <p key={i} className="text-xs text-destructive">{err.message}</p>
                ))}
              </div>
            )}
            <NodeConfigForm nodeId={selectedNode.id} nodeType={selectedNode.type} config={selectedNode.config} />
            <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/5" onClick={() => removeNode(selectedNode.id)}>
              Delete Node
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {runStatus ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <NodeRunStatusBadge status={runStatus} />
                </div>
                {runDetail && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Input Rows</span>
                      <span className="text-sm text-foreground">{runDetail.inputRowCount ?? '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Output Rows</span>
                      <span className="text-sm text-foreground">{runDetail.outputRowCount ?? '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Duration</span>
                      <span className="text-sm text-foreground">
                        {runDetail.startedAt && runDetail.completedAt
                          ? `${((new Date(runDetail.completedAt).getTime() - new Date(runDetail.startedAt).getTime()) / 1000).toFixed(1)}s`
                          : runDetail.startedAt ? 'Running...' : '-'}
                      </span>
                    </div>
                    {runDetail.errorMessage && (
                      <div className="px-2 py-1.5 bg-destructive/10 border border-destructive/30 rounded">
                        <p className="text-xs text-destructive">{runDetail.errorMessage}</p>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">No run data available. Run the pipeline to see execution results.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
