import { usePipelineStore } from '@/stores/pipelineStore';
import type { ValidationGateNodeConfig } from '@mapforge/shared';

interface Props {
  nodeId: string;
  config: ValidationGateNodeConfig;
}

const RULE_TYPES = [
  { type: 'all_required_filled' as const, label: 'All required fields filled' },
  { type: 'no_errors' as const, label: 'No validation errors' },
  { type: 'min_completion' as const, label: 'Minimum completion %' },
];

export function ValidationGateForm({ nodeId, config }: Props) {
  const updateNodeConfig = usePipelineStore(s => s.updateNodeConfig);

  const rules = config.rules || [];
  const hasRule = (type: string) => rules.some(r => r.type === type);
  const getThreshold = () => rules.find(r => r.type === 'min_completion')?.threshold ?? 80;

  const toggleRule = (type: typeof RULE_TYPES[number]['type']) => {
    let newRules;
    if (hasRule(type)) {
      newRules = rules.filter(r => r.type !== type);
    } else {
      const rule: { type: typeof type; threshold?: number } = { type };
      if (type === 'min_completion') rule.threshold = 80;
      newRules = [...rules, rule];
    }
    updateNodeConfig(nodeId, { ...config, rules: newRules });
  };

  const updateThreshold = (threshold: number) => {
    const newRules = rules.map(r =>
      r.type === 'min_completion' ? { ...r, threshold } : r
    );
    updateNodeConfig(nodeId, { ...config, rules: newRules });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-muted-foreground mb-2">Validation Rules</label>
        <div className="space-y-2">
          {RULE_TYPES.map(({ type, label }) => (
            <label key={type} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasRule(type)}
                onChange={() => toggleRule(type)}
                className="rounded border-border bg-muted text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-sm text-foreground">{label}</span>
            </label>
          ))}
        </div>
      </div>
      {hasRule('min_completion') && (
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Min Completion: {getThreshold()}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={getThreshold()}
            onChange={(e) => updateThreshold(Number(e.target.value))}
            className="w-full accent-emerald-500"
          />
        </div>
      )}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">On Failure</label>
        <div className="flex gap-2">
          <button
            onClick={() => updateNodeConfig(nodeId, { ...config, failAction: 'stop' })}
            className={`flex-1 px-2 py-1.5 rounded text-sm border ${
              config.failAction === 'stop' || !config.failAction
                ? 'bg-red-50 border-red-400 text-red-700'
                : 'bg-muted border-border text-muted-foreground'
            }`}
          >
            Stop Pipeline
          </button>
          <button
            onClick={() => updateNodeConfig(nodeId, { ...config, failAction: 'warn_and_continue' })}
            className={`flex-1 px-2 py-1.5 rounded text-xs border ${
              config.failAction === 'warn_and_continue'
                ? 'bg-yellow-50 border-yellow-400 text-yellow-700'
                : 'bg-muted border-border text-muted-foreground'
            }`}
          >
            Warn & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
