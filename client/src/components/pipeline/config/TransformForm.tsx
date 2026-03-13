import { usePipelineStore } from '@/stores/pipelineStore';
import { Button } from '@/components/ui/button';
import type { TransformNodeConfig } from '@mapforge/shared';

interface Props {
  nodeId: string;
  config: TransformNodeConfig;
}

const SUPPORTED_TYPES = ['filter', 'map'] as const;
const UNSUPPORTED_TYPES = ['aggregate', 'pivot', 'unpivot'];

export function TransformForm({ nodeId, config }: Props) {
  const updateNodeConfig = usePipelineStore(s => s.updateNodeConfig);

  // Fallback to read-only JSON for unsupported transform types
  if (UNSUPPORTED_TYPES.includes(config.transformType)) {
    return (
      <div className="space-y-3">
        <div className="px-2 py-1.5 bg-warning/10 border border-warning/30 rounded text-xs text-warning">
          Transform type "{config.transformType}" is not yet supported for visual editing.
        </div>
        <pre className="text-xs text-muted-foreground bg-muted p-2 rounded overflow-auto max-h-48 font-mono">
          {JSON.stringify(config, null, 2)}
        </pre>
      </div>
    );
  }

  const update = (partial: Partial<TransformNodeConfig>) => {
    updateNodeConfig(nodeId, { ...config, ...partial });
  };

  const filterCondition = (config.config as { condition?: string })?.condition || '';
  const mapColumns = (config.config as { columns?: Record<string, string> })?.columns || {};

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Transform Type</label>
        <div className="flex gap-2">
          {SUPPORTED_TYPES.map(type => (
            <Button
              key={type}
              onClick={() => update({ transformType: type, config: {} })}
              variant={config.transformType === type ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {config.transformType === 'filter' && (
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Filter Condition</label>
          <input
            type="text"
            value={filterCondition}
            onChange={(e) => update({ config: { condition: e.target.value } })}
            placeholder="status = 'active'"
            className="w-full px-2 py-1.5 bg-muted border border-border rounded text-sm text-foreground font-mono"
          />
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">SQL-like WHERE condition to filter records</p>
        </div>
      )}

      {config.transformType === 'map' && (
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Column Mapping</label>
          <p className="text-[10px] text-muted-foreground/70 mb-1">Rename columns: source_name {'->'} target_name</p>
          {Object.entries(mapColumns).map(([from, to], i) => (
            <div key={i} className="flex gap-1 mb-1">
              <input
                type="text"
                value={from}
                readOnly
                className="flex-1 px-2 py-1 bg-muted border border-border rounded text-xs text-muted-foreground font-mono"
              />
              <span className="text-muted-foreground/70 text-xs self-center">{'->'}</span>
              <input
                type="text"
                value={to}
                onChange={(e) => {
                  const newCols = { ...mapColumns, [from]: e.target.value };
                  update({ config: { columns: newCols } });
                }}
                className="flex-1 px-2 py-1 bg-muted border border-border rounded text-xs text-foreground font-mono"
              />
              <Button
                onClick={() => {
                  const newCols = { ...mapColumns };
                  delete newCols[from];
                  update({ config: { columns: newCols } });
                }}
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-xs"
              >
                x
              </Button>
            </div>
          ))}
          <Button
            onClick={() => {
              const key = `column_${Object.keys(mapColumns).length + 1}`;
              update({ config: { columns: { ...mapColumns, [key]: key } } });
            }}
            variant="ghost"
            size="sm"
            className="text-xs mt-1"
          >
            + Add column mapping
          </Button>
        </div>
      )}
    </div>
  );
}
