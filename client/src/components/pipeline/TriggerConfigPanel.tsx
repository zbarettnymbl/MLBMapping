import { usePipelineStore } from '@/stores/pipelineStore';
import cronstrue from 'cronstrue';

const CRON_PRESETS = [
  { label: 'Hourly', value: '0 * * * *' },
  { label: 'Daily at 2 AM', value: '0 2 * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Weekly (Monday)', value: '0 2 * * 1' },
  { label: 'Custom', value: 'custom' },
];

function getCronDescription(expression: string): string {
  try {
    return cronstrue.toString(expression);
  } catch {
    return 'Invalid cron expression';
  }
}

export function TriggerConfigPanel() {
  const { triggerType, triggerConfig, setTriggerType, setTriggerConfig, pipelineId } = usePipelineStore();

  const cronExpression = (triggerConfig as { cronExpression?: string }).cronExpression || '';
  const isPreset = CRON_PRESETS.some(p => p.value === cronExpression);

  return (
    <div className="flex items-center gap-2">
      <select
        value={triggerType}
        onChange={(e) => {
          setTriggerType(e.target.value);
          if (e.target.value === 'manual') setTriggerConfig({});
        }}
        className="px-2 py-1.5 bg-forge-800 border border-forge-600 rounded text-sm text-forge-100"
      >
        <option value="manual">Manual</option>
        <option value="cron">Scheduled</option>
        <option value="api">API</option>
      </select>

      {triggerType === 'cron' && (
        <div className="flex items-center gap-2">
          <select
            value={isPreset ? cronExpression : 'custom'}
            onChange={(e) => {
              if (e.target.value !== 'custom') {
                setTriggerConfig({ cronExpression: e.target.value });
              }
            }}
            className="px-2 py-1.5 bg-forge-800 border border-forge-600 rounded text-sm text-forge-100"
          >
            {CRON_PRESETS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          {(!isPreset || cronExpression === '') && (
            <input
              type="text"
              value={cronExpression}
              onChange={(e) => setTriggerConfig({ cronExpression: e.target.value })}
              placeholder="0 * * * *"
              className="px-2 py-1.5 bg-forge-800 border border-forge-600 rounded text-sm text-forge-100 font-mono w-32"
            />
          )}
          {cronExpression && (
            <span className="text-[10px] text-forge-400 max-w-40 truncate" title={getCronDescription(cronExpression)}>
              {getCronDescription(cronExpression)}
            </span>
          )}
        </div>
      )}

      {triggerType === 'api' && pipelineId && (
        <div className="flex items-center gap-2">
          <code className="text-[10px] text-forge-400 bg-forge-800 px-2 py-1 rounded font-mono">
            /api/v1/pipelines/{pipelineId}/run
          </code>
          <button
            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/api/v1/pipelines/${pipelineId}/run`)}
            className="text-xs text-forge-400 hover:text-forge-200 px-1"
            title="Copy URL"
          >
            Copy
          </button>
          {(triggerConfig as { webhookSecret?: string }).webhookSecret && (
            <span className="text-[10px] text-forge-500">
              Secret: <code className="bg-forge-800 px-1 rounded">{(triggerConfig as { webhookSecret?: string }).webhookSecret}</code>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
