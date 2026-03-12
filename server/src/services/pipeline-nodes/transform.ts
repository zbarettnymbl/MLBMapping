import type { TransformNodeConfig } from '@mapforge/shared';
import type { NodeExecutionContext, NodeExecutionResult } from './index';

export async function handleTransform(config: TransformNodeConfig, context: NodeExecutionContext): Promise<NodeExecutionResult> {
  try {
    let outputData = [...context.inputData];
    if (config.transformType === 'filter') {
      const filterConfig = config.config as { column?: string; operator?: string; value?: unknown };
      if (filterConfig.column) {
        outputData = outputData.filter(row => {
          const val = row[filterConfig.column!];
          switch (filterConfig.operator) {
            case 'equals': return val === filterConfig.value;
            case 'not_equals': return val !== filterConfig.value;
            case 'contains': return String(val).includes(String(filterConfig.value));
            case 'not_null': return val != null && val !== '';
            default: return true;
          }
        });
      }
    } else if (config.transformType === 'map') {
      const mapConfig = config.config as { columns?: string[] };
      if (mapConfig.columns) {
        outputData = outputData.map(row => {
          const mapped: Record<string, unknown> = {};
          for (const col of mapConfig.columns!) { mapped[col] = row[col]; }
          return mapped;
        });
      }
    }
    return { status: 'success', outputData, rowCount: outputData.length };
  } catch (error: unknown) {
    return { status: 'failed', outputData: [], rowCount: 0, error: error instanceof Error ? error.message : 'Transform failed' };
  }
}
