import { useState } from 'react';
import { usePipelineStore } from '@/stores/pipelineStore';
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
          <div className="px-2 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-300">
            No visual editor for node type "{nodeType}".
          </div>
          <pre className="text-xs text-forge-300 bg-forge-800 p-2 rounded overflow-auto max-h-48 font-mono">
            {JSON.stringify(config, null, 2)}
          </pre>
        </div>
      );
  }
}

function RunStatusBadge({ status }: { status: NodeRunStatus }) {
  const styles: Record<NodeRunStatus, string> = {
    pending: 'bg-forge-600 text-forge-300',
    running: 'bg-amber-500/20 text-amber-300',
    success: 'bg-emerald-500/20 text-emerald-300',
    failed: 'bg-red-500/20 text-red-300',
    skipped: 'bg-forge-700 text-forge-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
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
    usePipelineStore.getState().setNodes(
      nodes.map(n => n.id === selectedNode.id ? { ...n, label } : n)
    );
  };

  return (
    <div className="w-80 bg-forge-900 border-l border-forge-700 overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-forge-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-forge-500 uppercase tracking-wider">{selectedNode.type.replace(/_/g, ' ')}</span>
          <button onClick={() => selectNode(null)} className="text-forge-400 hover:text-forge-200 text-xs">Close</button>
        </div>
        <input
          type="text"
          value={selectedNode.label}
          onChange={(e) => handleLabelChange(e.target.value)}
          className="w-full px-2 py-1 bg-forge-800 border border-forge-600 rounded text-sm text-forge-100 font-medium"
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-forge-700">
        <button
          onClick={() => setActiveTab('config')}
          className={`flex-1 px-3 py-2 text-xs font-medium ${
            activeTab === 'config'
              ? 'text-amber-400 border-b-2 border-amber-400'
              : 'text-forge-400 hover:text-forge-200'
          }`}
        >
          Config
        </button>
        <button
          onClick={() => setActiveTab('run')}
          className={`flex-1 px-3 py-2 text-xs font-medium ${
            activeTab === 'run'
              ? 'text-amber-400 border-b-2 border-amber-400'
              : 'text-forge-400 hover:text-forge-200'
          }`}
        >
          Last Run
          {runStatus && <RunStatusBadge status={runStatus} />}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'config' ? (
          <div className="space-y-4">
            {nodeErrors.length > 0 && (
              <div className="px-2 py-1.5 bg-red-500/10 border border-red-500/30 rounded">
                {nodeErrors.map((err, i) => (
                  <p key={i} className="text-xs text-red-300">{err.message}</p>
                ))}
              </div>
            )}
            <NodeConfigForm nodeId={selectedNode.id} nodeType={selectedNode.type} config={selectedNode.config} />
            <button
              onClick={() => removeNode(selectedNode.id)}
              className="w-full px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-sm hover:bg-red-500/30"
            >
              Delete Node
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {runStatus ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-forge-400">Status</span>
                  <RunStatusBadge status={runStatus} />
                </div>
                {runDetail && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-forge-400">Input Rows</span>
                      <span className="text-sm text-forge-200">{runDetail.inputRowCount ?? '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-forge-400">Output Rows</span>
                      <span className="text-sm text-forge-200">{runDetail.outputRowCount ?? '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-forge-400">Duration</span>
                      <span className="text-sm text-forge-200">
                        {runDetail.startedAt && runDetail.completedAt
                          ? `${((new Date(runDetail.completedAt).getTime() - new Date(runDetail.startedAt).getTime()) / 1000).toFixed(1)}s`
                          : runDetail.startedAt ? 'Running...' : '-'}
                      </span>
                    </div>
                    {runDetail.errorMessage && (
                      <div className="px-2 py-1.5 bg-red-500/10 border border-red-500/30 rounded">
                        <p className="text-xs text-red-300">{runDetail.errorMessage}</p>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <p className="text-xs text-forge-500">No run data available. Run the pipeline to see execution results.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
