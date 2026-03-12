import { usePipelineStore } from '@/stores/pipelineStore';
import { useCredentials } from '@/hooks/useCredentials';
import type { BigQuerySourceNodeConfig } from '@mapforge/shared';

interface Props {
  nodeId: string;
  config: BigQuerySourceNodeConfig;
}

const DEMO_PROJECTS = [
  'mlb-baseball-dev',
  'mlb-baseball-prod',
  'mlb-analytics-sandbox',
];

const DEMO_DATASETS: Record<string, string[]> = {
  'mlb-baseball-dev': ['development_programming', 'broadcast_raw', 'staging'],
  'mlb-baseball-prod': ['development_programming', 'broadcast_classifications', 'reporting'],
  'mlb-analytics-sandbox': ['experiments', 'test_data'],
};

const DEMO_TABLES: Record<string, string[]> = {
  development_programming: ['program_registrations_2026', 'program_registrations_2025', 'site_master', 'program_categories'],
  broadcast_raw: ['broadcast_feeds', 'network_schedules', 'rights_agreements'],
  staging: ['stg_program_registrations', 'stg_broadcast_feeds'],
  broadcast_classifications: ['classified_programs', 'classification_audit_log'],
  reporting: ['rpt_program_summary', 'rpt_broadcast_coverage'],
  experiments: ['test_classifications', 'sample_programs'],
  test_data: ['mock_registrations'],
};

export function BigQuerySourceForm({ nodeId, config }: Props) {
  const updateNodeConfig = usePipelineStore(s => s.updateNodeConfig);
  const { data: credentials = [] } = useCredentials();

  const update = (partial: Partial<BigQuerySourceNodeConfig>) => {
    updateNodeConfig(nodeId, { ...config, ...partial });
  };

  const datasets = config.gcpProject ? (DEMO_DATASETS[config.gcpProject] || []) : [];
  const tables = config.dataset ? (DEMO_TABLES[config.dataset] || []) : [];

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Credential</label>
        <select
          value={config.credentialId || ''}
          onChange={(e) => update({ credentialId: e.target.value })}
          className="w-full px-2 py-1.5 bg-muted border border-border rounded text-sm text-foreground"
        >
          <option value="">Select credential...</option>
          {credentials.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">GCP Project</label>
        <select
          value={config.gcpProject || ''}
          onChange={(e) => update({ gcpProject: e.target.value, dataset: '', tableOrQuery: '' })}
          className="w-full px-2 py-1.5 bg-muted border border-border rounded text-sm text-foreground"
        >
          <option value="">Select project...</option>
          {DEMO_PROJECTS.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Dataset</label>
        <select
          value={config.dataset || ''}
          onChange={(e) => update({ dataset: e.target.value, tableOrQuery: '' })}
          disabled={!config.gcpProject}
          className="w-full px-2 py-1.5 bg-muted border border-border rounded text-sm text-foreground disabled:opacity-50"
        >
          <option value="">Select dataset...</option>
          {datasets.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Query Type</label>
        <div className="flex gap-2">
          <button
            onClick={() => update({ queryType: 'table' })}
            className={`flex-1 px-2 py-1.5 rounded text-sm border ${
              config.queryType === 'table' || !config.queryType
                ? 'bg-blue-50 border-blue-400 text-blue-700'
                : 'bg-muted border-border text-muted-foreground'
            }`}
          >
            Table
          </button>
          <button
            onClick={() => update({ queryType: 'query' })}
            className={`flex-1 px-2 py-1.5 rounded text-sm border ${
              config.queryType === 'query'
                ? 'bg-blue-50 border-blue-400 text-blue-700'
                : 'bg-muted border-border text-muted-foreground'
            }`}
          >
            Custom SQL
          </button>
        </div>
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">
          {config.queryType === 'query' ? 'SQL Query' : 'Table Name'}
        </label>
        {config.queryType === 'query' ? (
          <textarea
            value={config.tableOrQuery || ''}
            onChange={(e) => update({ tableOrQuery: e.target.value })}
            placeholder="SELECT * FROM ..."
            rows={4}
            className="w-full px-2 py-1.5 bg-muted border border-border rounded text-sm text-foreground font-mono resize-none"
          />
        ) : (
          <select
            value={config.tableOrQuery || ''}
            onChange={(e) => update({ tableOrQuery: e.target.value })}
            disabled={!config.dataset}
            className="w-full px-2 py-1.5 bg-muted border border-border rounded text-sm text-foreground disabled:opacity-50"
          >
            <option value="">Select table...</option>
            {tables.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
