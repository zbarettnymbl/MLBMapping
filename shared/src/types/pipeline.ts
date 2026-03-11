export type PipelineNodeType = 'bigquery_source' | 'bigquery_destination' | 'enrichment_exercise' | 'validation_gate' | 'transform' | 'notification' | 'join';
export type PipelineTriggerType = 'manual' | 'cron' | 'api';
export type PipelineStatus = 'draft' | 'active' | 'paused';
export type RunStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
export type NodeRunStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped';

export interface PipelineNode {
  id: string;
  type: PipelineNodeType;
  label: string;
  position: { x: number; y: number };
  config: PipelineNodeConfig;
}

export type PipelineNodeConfig =
  | BigQuerySourceNodeConfig | BigQueryDestNodeConfig | ExerciseNodeConfig
  | ValidationGateNodeConfig | TransformNodeConfig | NotificationNodeConfig;

export interface BigQuerySourceNodeConfig {
  nodeType: 'bigquery_source';
  credentialId: string;
  gcpProject: string;
  dataset: string;
  tableOrQuery: string;
  queryType: 'table' | 'query';
}

export interface BigQueryDestNodeConfig {
  nodeType: 'bigquery_destination';
  credentialId: string;
  gcpProject: string;
  dataset: string;
  tableName: string;
  writeMode: 'merge' | 'append' | 'overwrite';
  mergeKeyColumns?: string[];
}

export interface ExerciseNodeConfig {
  nodeType: 'enrichment_exercise';
  exerciseId: string;
  mode: 'pass_through' | 'wait_for_completion';
  completionThreshold?: number;
}

export interface ValidationGateNodeConfig {
  nodeType: 'validation_gate';
  rules: Array<{ type: 'all_required_filled' | 'no_errors' | 'min_completion'; threshold?: number }>;
  failAction: 'stop' | 'warn_and_continue';
}

export interface TransformNodeConfig {
  nodeType: 'transform';
  transformType: 'filter' | 'aggregate' | 'pivot' | 'unpivot' | 'map';
  config: Record<string, unknown>;
}

export interface NotificationNodeConfig {
  nodeType: 'notification';
  channels: Array<'email' | 'in_app'>;
  recipientType: 'admin' | 'assigned_users' | 'specific_users';
  specificUserIds?: string[];
  messageTemplate: string;
}

export interface PipelineEdge {
  id: string;
  source: string;
  target: string;
}

export interface PipelineListItem {
  id: string;
  name: string;
  description: string | null;
  triggerType: PipelineTriggerType;
  status: PipelineStatus;
  exerciseId: string | null;
  lastRunAt: string | null;
  lastRunStatus: RunStatus | null;
  nodeCount: number;
  createdAt: string;
}

export interface PipelineDetail {
  id: string;
  name: string;
  description: string | null;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  triggerType: PipelineTriggerType;
  triggerConfig: { cronExpression?: string; webhookSecret?: string };
  status: PipelineStatus;
  exerciseId: string | null;
}

export interface PipelineRunSummary {
  id: string;
  pipelineId: string;
  status: RunStatus;
  triggeredBy: string;
  startedAt: string;
  completedAt: string | null;
  summary: { nodesRun: number; nodesSucceeded: number; nodesFailed: number; rowsProcessed: number };
  errorMessage: string | null;
}

export interface PipelineNodeRunDetail {
  id: string;
  nodeId: string;
  nodeType: PipelineNodeType;
  status: NodeRunStatus;
  startedAt: string | null;
  completedAt: string | null;
  inputRowCount: number | null;
  outputRowCount: number | null;
  errorMessage: string | null;
}
