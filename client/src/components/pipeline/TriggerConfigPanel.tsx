import { usePipelineStore } from '@/stores/pipelineStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
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
      <NativeSelect
        value={triggerType}
        onChange={(e) => {
          setTriggerType(e.target.value);
          if (e.target.value === 'manual') setTriggerConfig({});
        }}
        className="h-8 w-auto"
      >
        <option value="manual">Manual</option>
        <option value="cron">Scheduled</option>
        <option value="api">API</option>
      </NativeSelect>

      {triggerType === 'cron' && (
        <div className="flex items-center gap-2">
          <NativeSelect
            value={isPreset ? cronExpression : 'custom'}
            onChange={(e) => {
              if (e.target.value !== 'custom') {
                setTriggerConfig({ cronExpression: e.target.value });
              }
            }}
            className="h-8 w-auto"
          >
            {CRON_PRESETS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </NativeSelect>
          {(!isPreset || cronExpression === '') && (
            <Input
              type="text"
              value={cronExpression}
              onChange={(e) => setTriggerConfig({ cronExpression: e.target.value })}
              placeholder="0 * * * *"
              className="h-8 font-mono w-32"
            />
          )}
          {cronExpression && (
            <span className="text-[10px] text-muted-foreground max-w-40 truncate" title={getCronDescription(cronExpression)}>
              {getCronDescription(cronExpression)}
            </span>
          )}
        </div>
      )}

      {triggerType === 'api' && pipelineId && (
        <div className="flex items-center gap-2">
          <code className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded font-mono">
            /api/v1/pipelines/{pipelineId}/run
          </code>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/api/v1/pipelines/${pipelineId}/run`)}
            className="h-6 px-1 text-xs"
            title="Copy URL"
          >
            Copy
          </Button>
          {(triggerConfig as { webhookSecret?: string }).webhookSecret && (
            <span className="text-[10px] text-muted-foreground">
              Secret: <code className="bg-muted px-1 rounded">{(triggerConfig as { webhookSecret?: string }).webhookSecret}</code>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
