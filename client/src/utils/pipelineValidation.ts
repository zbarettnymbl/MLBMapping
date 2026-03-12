import type { PipelineNode, PipelineEdge } from '@mapforge/shared';

interface ValidationError {
  nodeId?: string;
  message: string;
}

export function validatePipeline(
  nodes: PipelineNode[],
  edges: PipelineEdge[],
  triggerType: string,
  triggerConfig: Record<string, unknown>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  // 1. Must have at least one source node
  if (!nodes.some(n => n.type === 'bigquery_source')) {
    errors.push({ message: 'Pipeline must have at least one BigQuery source node' });
  }

  // 2. No orphaned nodes (every node must be connected to at least one edge)
  // Exception: single-node pipelines (just a source) are allowed
  if (nodes.length > 1) {
    const connectedNodeIds = new Set<string>();
    for (const edge of edges) {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    }
    for (const node of nodes) {
      if (!connectedNodeIds.has(node.id)) {
        errors.push({ nodeId: node.id, message: `"${node.label}" is not connected to any other node` });
      }
    }
  }

  // 3. Cycle detection (Kahn's algorithm)
  if (hasCycle(nodes, edges)) {
    errors.push({ message: 'Pipeline contains a cycle — nodes cannot form a loop' });
  }

  // 4. Required config per node type
  for (const node of nodes) {
    const configErrors = validateNodeConfig(node);
    errors.push(...configErrors);
  }

  // 5. Trigger config
  if (triggerType === 'cron') {
    const cronExpression = (triggerConfig as { cronExpression?: string }).cronExpression;
    if (!cronExpression || cronExpression.trim() === '') {
      errors.push({ message: 'Scheduled trigger requires a cron expression' });
    } else {
      const parts = cronExpression.trim().split(/\s+/);
      if (parts.length < 5 || parts.length > 6) {
        errors.push({ message: 'Invalid cron expression — must have 5 or 6 fields' });
      }
    }
  }

  return errors;
}

function hasCycle(nodes: PipelineNode[], edges: PipelineEdge[]): boolean {
  const inDegree: Record<string, number> = {};
  const adjacency: Record<string, string[]> = {};

  for (const node of nodes) {
    inDegree[node.id] = 0;
    adjacency[node.id] = [];
  }
  for (const edge of edges) {
    if (inDegree[edge.target] !== undefined) {
      inDegree[edge.target]++;
    }
    if (adjacency[edge.source]) {
      adjacency[edge.source].push(edge.target);
    }
  }

  const queue = Object.entries(inDegree)
    .filter(([, deg]) => deg === 0)
    .map(([id]) => id);

  let visited = 0;
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    visited++;
    for (const neighbor of adjacency[nodeId] || []) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) {
        queue.push(neighbor);
      }
    }
  }

  return visited !== nodes.length;
}

function validateNodeConfig(node: PipelineNode): ValidationError[] {
  const errors: ValidationError[] = [];
  const config = node.config;

  switch (node.type) {
    case 'bigquery_source': {
      const c = config as any;
      if (!c.credentialId) errors.push({ nodeId: node.id, message: `"${node.label}": Credential is required` });
      if (!c.gcpProject) errors.push({ nodeId: node.id, message: `"${node.label}": GCP Project is required` });
      if (!c.dataset) errors.push({ nodeId: node.id, message: `"${node.label}": Dataset is required` });
      if (!c.tableOrQuery) errors.push({ nodeId: node.id, message: `"${node.label}": Table name or query is required` });
      break;
    }
    case 'bigquery_destination': {
      const c = config as any;
      if (!c.credentialId) errors.push({ nodeId: node.id, message: `"${node.label}": Credential is required` });
      if (!c.gcpProject) errors.push({ nodeId: node.id, message: `"${node.label}": GCP Project is required` });
      if (!c.dataset) errors.push({ nodeId: node.id, message: `"${node.label}": Dataset is required` });
      if (!c.tableName) errors.push({ nodeId: node.id, message: `"${node.label}": Table name is required` });
      if (!c.writeMode) errors.push({ nodeId: node.id, message: `"${node.label}": Write mode is required` });
      if (c.writeMode === 'merge' && (!c.mergeKeyColumns || c.mergeKeyColumns.length === 0)) {
        errors.push({ nodeId: node.id, message: `"${node.label}": Merge key columns are required for merge mode` });
      }
      break;
    }
    case 'enrichment_exercise': {
      const c = config as any;
      if (!c.exerciseId) errors.push({ nodeId: node.id, message: `"${node.label}": Exercise is required` });
      break;
    }
    case 'validation_gate': {
      const c = config as any;
      if (!c.rules || c.rules.length === 0) errors.push({ nodeId: node.id, message: `"${node.label}": At least one validation rule is required` });
      break;
    }
    case 'transform': {
      const c = config as any;
      if (!c.transformType) errors.push({ nodeId: node.id, message: `"${node.label}": Transform type is required` });
      break;
    }
    case 'notification': {
      const c = config as any;
      if (!c.channels || c.channels.length === 0) errors.push({ nodeId: node.id, message: `"${node.label}": At least one notification channel is required` });
      break;
    }
  }

  return errors;
}
