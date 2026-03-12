import { usePipelineStore } from '@/stores/pipelineStore';
import { useCredentials } from '@/hooks/useCredentials';
import type { BigQueryDestNodeConfig } from '@mapforge/shared';

interface Props {
  nodeId: string;
  config: BigQueryDestNodeConfig;
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
  development_programming: ['enriched_program_classifications', 'program_registrations_2026', 'program_categories'],
  broadcast_raw: ['broadcast_feeds', 'network_schedules'],
  staging: ['stg_enriched_output', 'stg_classifications'],
  broadcast_classifications: ['classified_programs', 'classification_audit_log'],
  reporting: ['rpt_program_summary', 'rpt_broadcast_coverage'],
  experiments: ['test_output', 'classification_results'],
  test_data: ['mock_output'],
};

export function BigQueryDestinationForm({ nodeId, config }: Props) {
  const updateNodeConfig = usePipelineStore(s => s.updateNodeConfig);
  const { data: credentials = [] } = useCredentials();

  const update = (partial: Partial<BigQueryDestNodeConfig>) => {
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
          onChange={(e) => update({ gcpProject: e.target.value, dataset: '', tableName: '' })}
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
          onChange={(e) => update({ dataset: e.target.value, tableName: '' })}
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
        <label className="block text-xs text-muted-foreground mb-1">Table Name</label>
        <select
          value={config.tableName || ''}
          onChange={(e) => update({ tableName: e.target.value })}
          disabled={!config.dataset}
          className="w-full px-2 py-1.5 bg-muted border border-border rounded text-sm text-foreground disabled:opacity-50"
        >
          <option value="">Select table...</option>
          {tables.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Write Mode</label>
        <div className="flex gap-1">
          {(['merge', 'append', 'overwrite'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => update({ writeMode: mode })}
              className={`flex-1 px-2 py-1.5 rounded text-xs border ${
                config.writeMode === mode
                  ? 'bg-purple-50 border-purple-400 text-purple-700'
                  : 'bg-muted border-border text-muted-foreground'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {config.writeMode === 'merge' && (
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Merge Key Columns</label>
          <input
            type="text"
            value={(config.mergeKeyColumns || []).join(', ')}
            onChange={(e) => update({ mergeKeyColumns: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
            placeholder="col1, col2"
            className="w-full px-2 py-1.5 bg-muted border border-border rounded text-sm text-foreground"
          />
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">Comma-separated column names used as merge keys</p>
        </div>
      )}
    </div>
  );
}
