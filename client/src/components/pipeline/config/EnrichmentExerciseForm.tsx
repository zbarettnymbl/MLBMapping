import { usePipelineStore } from '@/stores/pipelineStore';
import { useMyExercises } from '@/hooks/useExercises';
import type { ExerciseNodeConfig } from '@mapforge/shared';

interface Props {
  nodeId: string;
  config: ExerciseNodeConfig;
}

export function EnrichmentExerciseForm({ nodeId, config }: Props) {
  const updateNodeConfig = usePipelineStore(s => s.updateNodeConfig);
  const { data: exercises = [] } = useMyExercises();

  const update = (partial: Partial<ExerciseNodeConfig>) => {
    updateNodeConfig(nodeId, { ...config, ...partial });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Exercise</label>
        <select
          value={config.exerciseId || ''}
          onChange={(e) => update({ exerciseId: e.target.value })}
          className="w-full px-2 py-1.5 bg-muted border border-border rounded text-sm text-foreground"
        >
          <option value="">Select exercise...</option>
          {exercises.map(ex => (
            <option key={ex.id} value={ex.id}>{ex.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Mode</label>
        <div className="flex gap-2">
          <button
            onClick={() => update({ mode: 'pass_through', completionThreshold: undefined })}
            className={`flex-1 px-2 py-1.5 rounded text-sm border ${
              config.mode === 'pass_through' || !config.mode
                ? 'bg-amber-50 border-amber-400 text-amber-700'
                : 'bg-muted border-border text-muted-foreground'
            }`}
          >
            Pass Through
          </button>
          <button
            onClick={() => update({ mode: 'wait_for_completion', completionThreshold: config.completionThreshold ?? 100 })}
            className={`flex-1 px-2 py-1.5 rounded text-sm border ${
              config.mode === 'wait_for_completion'
                ? 'bg-amber-50 border-amber-400 text-amber-700'
                : 'bg-muted border-border text-muted-foreground'
            }`}
          >
            Wait for Completion
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">
          {config.mode === 'wait_for_completion'
            ? 'Pipeline pauses here until users classify enough records to meet the threshold below.'
            : 'Records flow through immediately. Users can classify in parallel while the pipeline continues.'}
        </p>
      </div>
      {config.mode === 'wait_for_completion' && (
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Completion Threshold: {config.completionThreshold ?? 100}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={config.completionThreshold ?? 100}
            onChange={(e) => update({ completionThreshold: Number(e.target.value) })}
            className="w-full accent-amber-500"
          />
        </div>
      )}
    </div>
  );
}
