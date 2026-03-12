import type { PipelineNodeConfig } from '@mapforge/shared';

export interface NodeExecutionContext {
  runId: string;
  nodeId: string;
  inputData: Record<string, unknown>[];
}

export interface NodeExecutionResult {
  status: 'success' | 'failed';
  outputData: Record<string, unknown>[];
  rowCount: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export type NodeHandler = (config: PipelineNodeConfig, context: NodeExecutionContext) => Promise<NodeExecutionResult>;

import { handleBigQuerySource } from './bigquery-source';
import { handleBigQueryDestination } from './bigquery-destination';
import { handleEnrichmentExercise } from './enrichment-exercise';
import { handleValidationGate } from './validation-gate';
import { handleTransform } from './transform';
import { handleNotification } from './notification';

export const nodeHandlers: Record<string, NodeHandler> = {
  bigquery_source: handleBigQuerySource,
  bigquery_destination: handleBigQueryDestination,
  enrichment_exercise: handleEnrichmentExercise,
  validation_gate: handleValidationGate,
  transform: handleTransform,
  notification: handleNotification,
};
