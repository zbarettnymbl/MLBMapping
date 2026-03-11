import { useState, useEffect } from 'react';
import { usePipelineStore } from '@/stores/pipelineStore';
import type { PipelineNodeConfig } from '@mapforge/shared';

export function NodeConfigDrawer() {
  const { nodes, selectedNodeId, updateNodeConfig, removeNode, selectNode } = usePipelineStore();
  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  const [configJson, setConfigJson] = useState('');

  useEffect(() => {
    if (selectedNode) {
      setConfigJson(JSON.stringify(selectedNode.config, null, 2));
    }
  }, [selectedNode]);

  if (!selectedNode) return null;

  const handleSave = () => {
    try {
      const config = JSON.parse(configJson) as PipelineNodeConfig;
      updateNodeConfig(selectedNode.id, config);
    } catch { /* invalid JSON */ }
  };

  const handleDelete = () => {
    removeNode(selectedNode.id);
  };

  return (
    <div className="w-80 bg-forge-900 border-l border-forge-700 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-forge-100">{selectedNode.label}</h3>
        <button onClick={() => selectNode(null)} className="text-forge-400 hover:text-forge-200 text-sm">Close</button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-forge-400 mb-1">Node Type</label>
          <span className="text-sm text-forge-300">{selectedNode.type}</span>
        </div>
        <div>
          <label className="block text-xs text-forge-400 mb-1">Configuration (JSON)</label>
          <textarea value={configJson} onChange={(e) => setConfigJson(e.target.value)}
            className="w-full h-48 px-2 py-1.5 bg-forge-800 border border-forge-600 rounded text-xs text-forge-100 font-mono resize-none" />
        </div>
        <button onClick={handleSave} className="w-full px-3 py-1.5 bg-amber-500 text-forge-900 rounded text-sm font-medium hover:bg-amber-400">
          Save Config
        </button>
        <button onClick={handleDelete} className="w-full px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-sm hover:bg-red-500/30">
          Delete Node
        </button>
      </div>
    </div>
  );
}
