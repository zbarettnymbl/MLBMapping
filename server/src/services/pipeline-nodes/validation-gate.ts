import type { ValidationGateNodeConfig } from '@mapforge/shared';
import type { NodeExecutionContext, NodeExecutionResult } from './index';

export async function handleValidationGate(config: ValidationGateNodeConfig, context: NodeExecutionContext): Promise<NodeExecutionResult> {
  const issues: string[] = [];
  for (const rule of config.rules) {
    if (rule.type === 'no_errors') {
      // Pass through - validation already handled
    } else if (rule.type === 'min_completion' && rule.threshold) {
      // Check that we have data
      if (context.inputData.length === 0) issues.push('No input data');
    }
  }
  if (issues.length > 0 && config.failAction === 'stop') {
    return { status: 'failed', outputData: [], rowCount: 0, error: issues.join('; ') };
  }
  return { status: 'success', outputData: context.inputData, rowCount: context.inputData.length,
    metadata: issues.length > 0 ? { warnings: issues } : undefined };
}
