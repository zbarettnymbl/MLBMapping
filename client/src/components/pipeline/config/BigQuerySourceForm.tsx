import { usePipelineStore } from '@/stores/pipelineStore';
import { useCredentials } from '@/hooks/useCredentials';
import type { BigQuerySourceNodeConfig } from '@mapforge/shared';

interface Props {
  nodeId: string;
  config: BigQuerySourceNodeConfig;
}

export function BigQuerySourceForm({ nodeId, config }: Props) {
  const updateNodeConfig = usePipelineStore(s => s.updateNodeConfig);
  const { data: credentials = [] } = useCredentials();

  const update = (partial: Partial<BigQuerySourceNodeConfig>) => {
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
        <label className="block text-xs text-forge-400 mb-1">Query Type</label>
        <div className="flex gap-2">
          <button
            onClick={() => update({ queryType: 'table' })}
            className={`flex-1 px-2 py-1.5 rounded text-sm border ${
              config.queryType === 'table' || !config.queryType
                ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                : 'bg-forge-800 border-forge-600 text-forge-400'
            }`}
          >
            Table
          </button>
          <button
            onClick={() => update({ queryType: 'query' })}
            className={`flex-1 px-2 py-1.5 rounded text-sm border ${
              config.queryType === 'query'
                ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                : 'bg-forge-800 border-forge-600 text-forge-400'
            }`}
          >
            Custom SQL
          </button>
        </div>
      </div>
      <div>
        <label className="block text-xs text-forge-400 mb-1">
          {config.queryType === 'query' ? 'SQL Query' : 'Table Name'}
        </label>
        {config.queryType === 'query' ? (
          <textarea
            value={config.tableOrQuery || ''}
            onChange={(e) => update({ tableOrQuery: e.target.value })}
            placeholder="SELECT * FROM ..."
            rows={4}
            className="w-full px-2 py-1.5 bg-forge-800 border border-forge-600 rounded text-sm text-forge-100 font-mono resize-none"
          />
        ) : (
          <input
            type="text"
            value={config.tableOrQuery || ''}
            onChange={(e) => update({ tableOrQuery: e.target.value })}
            placeholder="my_table"
            className="w-full px-2 py-1.5 bg-forge-800 border border-forge-600 rounded text-sm text-forge-100"
          />
        )}
      </div>
    </div>
  );
}
