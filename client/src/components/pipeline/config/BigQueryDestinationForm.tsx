import { useState, useEffect } from 'react';
import { usePipelineStore } from '@/stores/pipelineStore';
import { fetchCredentials } from '@/api/credentials';
import type { BigQueryDestNodeConfig, CredentialMetadata } from '@mapforge/shared';

interface Props {
  nodeId: string;
  config: BigQueryDestNodeConfig;
}

export function BigQueryDestinationForm({ nodeId, config }: Props) {
  const updateNodeConfig = usePipelineStore(s => s.updateNodeConfig);
  const [credentials, setCredentials] = useState<CredentialMetadata[]>([]);

  useEffect(() => {
    fetchCredentials().then(setCredentials).catch(console.error);
  }, []);

  const update = (partial: Partial<BigQueryDestNodeConfig>) => {
    updateNodeConfig(nodeId, { ...config, ...partial });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-forge-400 mb-1">Credential</label>
        <select
          value={config.credentialId || ''}
          onChange={(e) => update({ credentialId: e.target.value })}
          className="w-full px-2 py-1.5 bg-forge-800 border border-forge-600 rounded text-sm text-forge-100"
        >
          <option value="">Select credential...</option>
          {credentials.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-forge-400 mb-1">GCP Project</label>
        <input
          type="text"
          value={config.gcpProject || ''}
          onChange={(e) => update({ gcpProject: e.target.value })}
          placeholder="my-gcp-project"
          className="w-full px-2 py-1.5 bg-forge-800 border border-forge-600 rounded text-sm text-forge-100"
        />
      </div>
      <div>
        <label className="block text-xs text-forge-400 mb-1">Dataset</label>
        <input
          type="text"
          value={config.dataset || ''}
          onChange={(e) => update({ dataset: e.target.value })}
          placeholder="my_dataset"
          className="w-full px-2 py-1.5 bg-forge-800 border border-forge-600 rounded text-sm text-forge-100"
        />
      </div>
      <div>
        <label className="block text-xs text-forge-400 mb-1">Table Name</label>
        <input
          type="text"
          value={config.tableName || ''}
          onChange={(e) => update({ tableName: e.target.value })}
          placeholder="destination_table"
          className="w-full px-2 py-1.5 bg-forge-800 border border-forge-600 rounded text-sm text-forge-100"
        />
      </div>
      <div>
        <label className="block text-xs text-forge-400 mb-1">Write Mode</label>
        <div className="flex gap-1">
          {(['merge', 'append', 'overwrite'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => update({ writeMode: mode })}
              className={`flex-1 px-2 py-1.5 rounded text-xs border ${
                config.writeMode === mode
                  ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                  : 'bg-forge-800 border-forge-600 text-forge-400'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {config.writeMode === 'merge' && (
        <div>
          <label className="block text-xs text-forge-400 mb-1">Merge Key Columns</label>
          <input
            type="text"
            value={(config.mergeKeyColumns || []).join(', ')}
            onChange={(e) => update({ mergeKeyColumns: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
            placeholder="col1, col2"
            className="w-full px-2 py-1.5 bg-forge-800 border border-forge-600 rounded text-sm text-forge-100"
          />
          <p className="text-[10px] text-forge-500 mt-0.5">Comma-separated column names used as merge keys</p>
        </div>
      )}
    </div>
  );
}
