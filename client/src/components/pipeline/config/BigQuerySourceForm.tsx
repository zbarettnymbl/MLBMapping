import { usePipelineStore } from '@/stores/pipelineStore';
import { useCredentials } from '@/hooks/useCredentials';
import { NativeSelect } from '@/components/ui/native-select';
import { Button } from '@/components/ui/button';
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
        <NativeSelect
          value={config.credentialId || ''}
          onChange={(e) => update({ credentialId: e.target.value })}
        >
          <option value="">Select credential...</option>
          {credentials.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </NativeSelect>
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">GCP Project</label>
        <NativeSelect
          value={config.gcpProject || ''}
          onChange={(e) => update({ gcpProject: e.target.value, dataset: '', tableOrQuery: '' })}
        >
          <option value="">Select project...</option>
          {DEMO_PROJECTS.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </NativeSelect>
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Dataset</label>
        <NativeSelect
          value={config.dataset || ''}
          onChange={(e) => update({ dataset: e.target.value, tableOrQuery: '' })}
          disabled={!config.gcpProject}
        >
          <option value="">Select dataset...</option>
          {datasets.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </NativeSelect>
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Query Type</label>
        <div className="flex gap-2">
          <Button
            onClick={() => update({ queryType: 'table' })}
            variant={config.queryType === 'table' || !config.queryType ? 'default' : 'outline'}
            size="sm"
            className="flex-1"
          >
            Table
          </Button>
          <Button
            onClick={() => update({ queryType: 'query' })}
            variant={config.queryType === 'query' ? 'default' : 'outline'}
            size="sm"
            className="flex-1"
          >
            Custom SQL
          </Button>
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
          <NativeSelect
            value={config.tableOrQuery || ''}
            onChange={(e) => update({ tableOrQuery: e.target.value })}
            disabled={!config.dataset}
          >
            <option value="">Select table...</option>
            {tables.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </NativeSelect>
        )}
      </div>
    </div>
  );
}
