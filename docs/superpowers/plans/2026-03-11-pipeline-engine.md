# Pipeline Engine Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the visual DAG pipeline builder and execution engine that automates the data flow: BigQuery Source -> Enrichment Exercise -> Validation Gate -> Transform -> BigQuery Destination, with cron/manual/API triggers and execution logging.

**Architecture:** The pipeline builder UI uses React Flow for drag-and-drop DAG composition. Pipeline definitions are stored as JSON (nodes + edges) in a `pipelines` table. The execution engine is a server-side runner that traverses the DAG topologically, executing each node type in sequence. Each node type has a handler function. Execution state is logged per-node to a `pipeline_runs` table. Triggers are cron (via node-cron), manual (API call), or webhook.

**Tech Stack:** React Flow, Zustand, Drizzle ORM, node-cron, Vitest

**Depends on:** BigQuery Integration (Plan 1), Source Data Sync (Plan 2), Enhanced Reference Tables (Plan 3).

---

## File Structure

| File | Responsibility |
|------|---------------|
| **Database** | |
| `server/src/db/schema.ts` | Add `pipelines`, `pipeline_runs`, `pipeline_node_runs` tables |
| **Shared Types** | |
| `shared/src/types/pipeline.ts` | Pipeline, node, edge, run, trigger types |
| **Server - Routes** | |
| `server/src/routes/pipelines.ts` | Pipeline CRUD, trigger execution, run history |
| **Server - Services** | |
| `server/src/services/pipeline-executor.ts` | DAG traversal and node execution orchestrator |
| `server/src/services/pipeline-nodes/bigquery-source.ts` | BigQuery Source node handler |
| `server/src/services/pipeline-nodes/bigquery-destination.ts` | BigQuery Destination node handler |
| `server/src/services/pipeline-nodes/enrichment-exercise.ts` | Exercise node handler (pass-through or wait) |
| `server/src/services/pipeline-nodes/validation-gate.ts` | Validation Gate node handler |
| `server/src/services/pipeline-nodes/transform.ts` | Transform node handler (filter, aggregate, pivot, unpivot) |
| `server/src/services/pipeline-nodes/notification.ts` | Notification node handler |
| `server/src/services/pipeline-nodes/index.ts` | Node handler registry |
| `server/src/services/pipeline-scheduler.ts` | Cron-based pipeline trigger scheduling |
| **Server - Tests** | |
| `server/src/__tests__/pipeline-executor.test.ts` | Unit tests for DAG execution |
| `server/src/__tests__/pipeline-nodes.test.ts` | Unit tests for individual node handlers |
| **Client - Pages** | |
| `client/src/pages/PipelineBuilderPage.tsx` | Pipeline builder page with React Flow canvas |
| `client/src/pages/PipelineRunsPage.tsx` | Pipeline execution history page |
| **Client - Components** | |
| `client/src/components/pipeline/PipelineCanvas.tsx` | React Flow canvas wrapper |
| `client/src/components/pipeline/nodes/BigQuerySourceNode.tsx` | Custom React Flow node for BQ source |
| `client/src/components/pipeline/nodes/BigQueryDestNode.tsx` | Custom React Flow node for BQ destination |
| `client/src/components/pipeline/nodes/ExerciseNode.tsx` | Custom React Flow node for exercise |
| `client/src/components/pipeline/nodes/ValidationGateNode.tsx` | Custom React Flow node for validation |
| `client/src/components/pipeline/nodes/TransformNode.tsx` | Custom React Flow node for transforms |
| `client/src/components/pipeline/nodes/NotificationNode.tsx` | Custom React Flow node for notifications |
| `client/src/components/pipeline/NodeConfigDrawer.tsx` | Side drawer for configuring selected node |
| `client/src/components/pipeline/PipelineToolbar.tsx` | Toolbar with node palette, save, run buttons |
| `client/src/components/pipeline/RunStatusBadge.tsx` | Status badge for pipeline/node run state |
| **Client - Store** | |
| `client/src/stores/pipelineStore.ts` | Zustand store for pipeline builder state |
| **Client - API** | |
| `client/src/api/pipelines.ts` | Pipeline API client functions |

---

## Chunk 1: Database & Types

### Task 1: Pipeline Database Tables

**Files:**
- Modify: `server/src/db/schema.ts`

- [ ] **Step 1: Add pipeline tables to schema**

```typescript
// Add to server/src/db/schema.ts

// Pipeline Definitions
export const pipelines = pgTable("pipelines", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  nodes: jsonb("nodes").notNull().default([]),     // PipelineNode[]
  edges: jsonb("edges").notNull().default([]),     // PipelineEdge[]
  triggerType: text("trigger_type").notNull().default("manual"), // manual, cron, api
  triggerConfig: jsonb("trigger_config").default({}), // { cronExpression, webhookSecret }
  status: text("status").notNull().default("draft"), // draft, active, paused
  exerciseId: uuid("exercise_id").references(() => enrichmentExercises.id),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Pipeline Execution Runs
export const pipelineRuns = pgTable("pipeline_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  pipelineId: uuid("pipeline_id").references(() => pipelines.id).notNull(),
  status: text("status").notNull().default("pending"), // pending, running, success, failed, cancelled
  triggeredBy: text("triggered_by").notNull(), // cron, manual, api
  triggeredByUserId: uuid("triggered_by_user_id").references(() => users.id),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  summary: jsonb("summary").default({}), // { nodesRun, nodesSucceeded, nodesFailed, rowsProcessed }
  errorMessage: text("error_message"),
});

// Per-Node Execution State
export const pipelineNodeRuns = pgTable("pipeline_node_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id").references(() => pipelineRuns.id).notNull(),
  nodeId: text("node_id").notNull(), // matches the node ID in the pipeline definition
  nodeType: text("node_type").notNull(),
  status: text("status").notNull().default("pending"), // pending, running, success, failed, skipped
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  inputRowCount: integer("input_row_count"),
  outputRowCount: integer("output_row_count"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata").default({}), // node-specific output data
});
```

- [ ] **Step 2: Commit**

```bash
git add server/src/db/schema.ts
git commit -m "feat: add pipeline, pipeline_runs, pipeline_node_runs tables"
```

---

### Task 2: Shared Pipeline Types

**Files:**
- Create: `shared/src/types/pipeline.ts`
- Modify: `shared/src/types/index.ts`

- [ ] **Step 1: Define pipeline types**

```typescript
// shared/src/types/pipeline.ts

export type PipelineNodeType =
  | 'bigquery_source'
  | 'bigquery_destination'
  | 'enrichment_exercise'
  | 'validation_gate'
  | 'transform'
  | 'notification'
  | 'join';

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
  | BigQuerySourceNodeConfig
  | BigQueryDestNodeConfig
  | ExerciseNodeConfig
  | ValidationGateNodeConfig
  | TransformNodeConfig
  | NotificationNodeConfig;

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
  completionThreshold?: number; // e.g., 100 means 100% classified
}

export interface ValidationGateNodeConfig {
  nodeType: 'validation_gate';
  rules: Array<{
    type: 'all_required_filled' | 'no_errors' | 'min_completion';
    threshold?: number;
  }>;
  failAction: 'stop' | 'warn_and_continue';
}

export interface TransformNodeConfig {
  nodeType: 'transform';
  transformType: 'filter' | 'aggregate' | 'pivot' | 'unpivot' | 'map';
  config: Record<string, unknown>; // transform-specific config
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
  source: string; // node ID
  target: string; // node ID
}

export interface PipelineListItem {
  id: string;
  name: string;
  description: string | null;
  triggerType: PipelineTriggerType;
  status: PipelineStatus;
  exerciseId: string | null;
  exerciseName?: string;
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
  summary: {
    nodesRun: number;
    nodesSucceeded: number;
    nodesFailed: number;
    rowsProcessed: number;
  };
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
```

- [ ] **Step 2: Export from shared index**

Add `export * from './pipeline';` to `shared/src/types/index.ts`.

- [ ] **Step 3: Commit**

```bash
git add shared/src/types/pipeline.ts shared/src/types/index.ts
git commit -m "feat: add shared pipeline types"
```

---

## Chunk 2: Pipeline Execution Engine

### Task 3: Node Handlers

**Files:**
- Create: `server/src/services/pipeline-nodes/index.ts`
- Create: `server/src/services/pipeline-nodes/bigquery-source.ts`
- Create: `server/src/services/pipeline-nodes/bigquery-destination.ts`
- Create: `server/src/services/pipeline-nodes/enrichment-exercise.ts`
- Create: `server/src/services/pipeline-nodes/validation-gate.ts`
- Create: `server/src/services/pipeline-nodes/transform.ts`
- Create: `server/src/services/pipeline-nodes/notification.ts`

- [ ] **Step 1: Define node handler interface**

```typescript
// server/src/services/pipeline-nodes/index.ts
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

export type NodeHandler = (
  config: PipelineNodeConfig,
  context: NodeExecutionContext
) => Promise<NodeExecutionResult>;

// Registry
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
```

- [ ] **Step 2: Implement BigQuery Source node handler**

```typescript
// server/src/services/pipeline-nodes/bigquery-source.ts
import type { BigQuerySourceNodeConfig } from '@mapforge/shared';
import type { NodeExecutionContext, NodeExecutionResult } from './index';
import { BigQueryService } from '../bigquery';
import { decryptCredential } from '../credentials';
import { db } from '../../db/connection';
import { storedCredentials } from '../../db/schema';
import { eq } from 'drizzle-orm';

export async function handleBigQuerySource(
  config: BigQuerySourceNodeConfig,
  context: NodeExecutionContext
): Promise<NodeExecutionResult> {
  try {
    const [cred] = await db.select().from(storedCredentials)
      .where(eq(storedCredentials.id, config.credentialId));

    if (!cred) throw new Error('Credential not found');

    const encryptionKey = process.env.CREDENTIAL_ENCRYPTION_KEY;
    if (!encryptionKey) throw new Error('Encryption key not configured');

    const credJson = decryptCredential(cred.encryptedValue, encryptionKey);
    const bq = new BigQueryService(credJson);

    const query = config.queryType === 'table'
      ? `SELECT * FROM \`${config.gcpProject}.${config.dataset}.${config.tableOrQuery}\``
      : config.tableOrQuery;

    const rows = await bq.executeQuery(query);

    return {
      status: 'success',
      outputData: rows,
      rowCount: rows.length,
    };
  } catch (error: unknown) {
    return {
      status: 'failed',
      outputData: [],
      rowCount: 0,
      error: error instanceof Error ? error.message : 'BigQuery source failed',
    };
  }
}
```

- [ ] **Step 3: Implement BigQuery Destination node handler**

Writes `context.inputData` to the configured BigQuery table using the write mode.

- [ ] **Step 4: Implement Enrichment Exercise node handler**

In `pass_through` mode: reads classified records from the exercise's `enrichment_records` table and passes them forward. In `wait_for_completion` mode: checks completion percentage against threshold and fails if not met.

- [ ] **Step 5: Implement Validation Gate node handler**

Checks input data against configured rules (all_required_filled, no_errors, min_completion). Returns success if all rules pass. On failure, either stops (failAction=stop) or passes data through with a warning (failAction=warn_and_continue).

- [ ] **Step 6: Implement Transform node handler**

Supports filter (SQL-like WHERE condition), aggregate (GROUP BY + SUM/COUNT/AVG), pivot, unpivot, and map (column rename/select) operations on input data.

- [ ] **Step 7: Implement Notification node handler**

Logs notification details to metadata. Actual email sending is a TODO -- for now, records what would be sent (recipients, message, channels).

- [ ] **Step 8: Commit**

```bash
git add server/src/services/pipeline-nodes/
git commit -m "feat: add pipeline node handlers for all node types"
```

---

### Task 4: Pipeline Executor

**Files:**
- Create: `server/src/services/pipeline-executor.ts`
- Create: `server/src/__tests__/pipeline-executor.test.ts`

- [ ] **Step 1: Write failing tests for DAG execution**

```typescript
// server/src/__tests__/pipeline-executor.test.ts
import { describe, it, expect } from 'vitest';
import { topologicalSort } from '../services/pipeline-executor';

describe('pipeline executor', () => {
  it('sorts a linear DAG in correct order', () => {
    const nodes = [
      { id: 'a', type: 'bigquery_source' },
      { id: 'b', type: 'enrichment_exercise' },
      { id: 'c', type: 'bigquery_destination' },
    ];
    const edges = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'c' },
    ];
    const sorted = topologicalSort(nodes as any, edges);
    expect(sorted.map(n => n.id)).toEqual(['a', 'b', 'c']);
  });

  it('handles branching DAG', () => {
    const nodes = [
      { id: 'src', type: 'bigquery_source' },
      { id: 'val', type: 'validation_gate' },
      { id: 'notify', type: 'notification' },
      { id: 'dest', type: 'bigquery_destination' },
    ];
    const edges = [
      { id: 'e1', source: 'src', target: 'val' },
      { id: 'e2', source: 'val', target: 'dest' },
      { id: 'e3', source: 'val', target: 'notify' },
    ];
    const sorted = topologicalSort(nodes as any, edges);
    const srcIdx = sorted.findIndex(n => n.id === 'src');
    const valIdx = sorted.findIndex(n => n.id === 'val');
    expect(srcIdx).toBeLessThan(valIdx);
  });

  it('throws on cycle', () => {
    const nodes = [
      { id: 'a', type: 'bigquery_source' },
      { id: 'b', type: 'enrichment_exercise' },
    ];
    const edges = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'a' },
    ];
    expect(() => topologicalSort(nodes as any, edges)).toThrow(/cycle/i);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npx vitest run src/__tests__/pipeline-executor.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement pipeline executor**

```typescript
// server/src/services/pipeline-executor.ts
import { eq } from 'drizzle-orm';
import { db } from '../db/connection';
import { pipelines, pipelineRuns, pipelineNodeRuns } from '../db/schema';
import { nodeHandlers } from './pipeline-nodes/index';
import type { PipelineNode, PipelineEdge, PipelineNodeConfig } from '@mapforge/shared';

export function topologicalSort(nodes: PipelineNode[], edges: PipelineEdge[]): PipelineNode[] {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  const nodeMap = new Map<string, PipelineNode>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
    nodeMap.set(node.id, node);
  }

  for (const edge of edges) {
    adjacency.get(edge.source)!.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: PipelineNode[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    sorted.push(nodeMap.get(id)!);

    for (const neighbor of adjacency.get(id) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  if (sorted.length !== nodes.length) {
    throw new Error('Pipeline contains a cycle -- cannot execute');
  }

  return sorted;
}

export async function executePipeline(
  pipelineId: string,
  triggeredBy: 'manual' | 'cron' | 'api',
  userId?: string
): Promise<string> {
  // Load pipeline
  const [pipeline] = await db.select().from(pipelines)
    .where(eq(pipelines.id, pipelineId));

  if (!pipeline) throw new Error('Pipeline not found');

  const nodes = pipeline.nodes as PipelineNode[];
  const edges = pipeline.edges as PipelineEdge[];

  // Create run record
  const [run] = await db.insert(pipelineRuns).values({
    pipelineId,
    status: 'running',
    triggeredBy,
    triggeredByUserId: userId ?? null,
  }).returning();

  try {
    // Topological sort
    const sortedNodes = topologicalSort(nodes, edges);

    // Build edge map for passing data between nodes
    const nodeOutputs = new Map<string, Record<string, unknown>[]>();
    let nodesSucceeded = 0;
    let nodesFailed = 0;
    let totalRowsProcessed = 0;

    for (const node of sortedNodes) {
      // Create node run record
      const [nodeRun] = await db.insert(pipelineNodeRuns).values({
        runId: run.id,
        nodeId: node.id,
        nodeType: node.type,
        status: 'running',
        startedAt: new Date(),
      }).returning();

      // Gather input from predecessor nodes
      const predecessorEdges = edges.filter(e => e.target === node.id);
      const inputData: Record<string, unknown>[] = [];
      for (const edge of predecessorEdges) {
        const output = nodeOutputs.get(edge.source) ?? [];
        inputData.push(...output);
      }

      // Execute node handler
      const handler = nodeHandlers[node.type];
      if (!handler) {
        await db.update(pipelineNodeRuns).set({
          status: 'failed',
          completedAt: new Date(),
          errorMessage: `Unknown node type: ${node.type}`,
        }).where(eq(pipelineNodeRuns.id, nodeRun.id));
        nodesFailed++;
        continue;
      }

      const result = await handler(node.config, {
        runId: run.id,
        nodeId: node.id,
        inputData,
      });

      // Store output for downstream nodes
      nodeOutputs.set(node.id, result.outputData);
      totalRowsProcessed += result.rowCount;

      // Update node run
      await db.update(pipelineNodeRuns).set({
        status: result.status,
        completedAt: new Date(),
        inputRowCount: inputData.length,
        outputRowCount: result.rowCount,
        errorMessage: result.error ?? null,
        metadata: result.metadata ?? {},
      }).where(eq(pipelineNodeRuns.id, nodeRun.id));

      if (result.status === 'success') {
        nodesSucceeded++;
      } else {
        nodesFailed++;
        // Stop pipeline on node failure
        break;
      }
    }

    // Update run status
    const finalStatus = nodesFailed > 0 ? 'failed' : 'success';
    await db.update(pipelineRuns).set({
      status: finalStatus,
      completedAt: new Date(),
      summary: {
        nodesRun: nodesSucceeded + nodesFailed,
        nodesSucceeded,
        nodesFailed,
        rowsProcessed: totalRowsProcessed,
      },
    }).where(eq(pipelineRuns.id, run.id));

    return run.id;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Pipeline execution failed';
    await db.update(pipelineRuns).set({
      status: 'failed',
      completedAt: new Date(),
      errorMessage: message,
    }).where(eq(pipelineRuns.id, run.id));
    throw error;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npx vitest run src/__tests__/pipeline-executor.test.ts`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/services/pipeline-executor.ts server/src/__tests__/pipeline-executor.test.ts
git commit -m "feat: add pipeline executor with topological sort and per-node execution"
```

---

## Chunk 3: Pipeline API & Scheduler

### Task 5: Pipeline CRUD Routes

**Files:**
- Create: `server/src/routes/pipelines.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Implement pipeline routes**

```typescript
// server/src/routes/pipelines.ts
import { Router } from 'express';
import type { Request, Response } from 'express';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db/connection';
import { pipelines, pipelineRuns, pipelineNodeRuns } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { requireAdmin } from '../middleware/requireAdmin';
import { executePipeline } from '../services/pipeline-executor';

const router = Router();
router.use(authMiddleware);
router.use(requireAdmin);

// GET /api/v1/pipelines
router.get('/', async (req: Request, res: Response) => {
  const allPipelines = await db.select().from(pipelines)
    .where(eq(pipelines.orgId, req.user!.orgId))
    .orderBy(desc(pipelines.updatedAt));
  res.json({ pipelines: allPipelines });
});

// POST /api/v1/pipelines
router.post('/', async (req: Request, res: Response) => {
  const { name, description, nodes, edges, triggerType, triggerConfig, exerciseId } = req.body;
  const [pipeline] = await db.insert(pipelines).values({
    orgId: req.user!.orgId,
    name,
    description,
    nodes: nodes || [],
    edges: edges || [],
    triggerType: triggerType || 'manual',
    triggerConfig: triggerConfig || {},
    exerciseId,
    createdBy: req.user!.id,
  }).returning();
  res.status(201).json(pipeline);
});

// GET /api/v1/pipelines/:id
router.get('/:id', async (req: Request, res: Response) => {
  const [pipeline] = await db.select().from(pipelines)
    .where(eq(pipelines.id, req.params.id));
  if (!pipeline) {
    res.status(404).json({ error: 'Pipeline not found' });
    return;
  }
  res.json(pipeline);
});

// PUT /api/v1/pipelines/:id
router.put('/:id', async (req: Request, res: Response) => {
  const updates = req.body;
  const [updated] = await db.update(pipelines)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(pipelines.id, req.params.id))
    .returning();
  res.json(updated);
});

// DELETE /api/v1/pipelines/:id
router.delete('/:id', async (req: Request, res: Response) => {
  // Delete runs and node runs first
  const runs = await db.select({ id: pipelineRuns.id }).from(pipelineRuns)
    .where(eq(pipelineRuns.pipelineId, req.params.id));
  for (const run of runs) {
    await db.delete(pipelineNodeRuns).where(eq(pipelineNodeRuns.runId, run.id));
  }
  await db.delete(pipelineRuns).where(eq(pipelineRuns.pipelineId, req.params.id));
  await db.delete(pipelines).where(eq(pipelines.id, req.params.id));
  res.status(204).send();
});

// POST /api/v1/pipelines/:id/run -- trigger execution
router.post('/:id/run', async (req: Request, res: Response) => {
  try {
    const runId = await executePipeline(req.params.id, 'manual', req.user!.id);
    res.json({ runId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Execution failed';
    res.status(500).json({ error: message });
  }
});

// GET /api/v1/pipelines/:id/runs -- execution history
router.get('/:id/runs', async (req: Request, res: Response) => {
  const runs = await db.select().from(pipelineRuns)
    .where(eq(pipelineRuns.pipelineId, req.params.id))
    .orderBy(desc(pipelineRuns.startedAt));
  res.json({ runs });
});

// GET /api/v1/pipelines/runs/:runId -- run detail with node statuses
router.get('/runs/:runId', async (req: Request, res: Response) => {
  const [run] = await db.select().from(pipelineRuns)
    .where(eq(pipelineRuns.id, req.params.runId));

  if (!run) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }

  const nodeRuns = await db.select().from(pipelineNodeRuns)
    .where(eq(pipelineNodeRuns.runId, req.params.runId));

  res.json({ run, nodeRuns });
});

export { router as pipelineRouter };
```

- [ ] **Step 2: Register route in server/src/index.ts**

Add import and `app.use('/api/v1/pipelines', pipelineRouter);`

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/pipelines.ts server/src/index.ts
git commit -m "feat: add pipeline CRUD and execution trigger routes"
```

---

### Task 6: Pipeline Scheduler

**Files:**
- Create: `server/src/services/pipeline-scheduler.ts`

- [ ] **Step 1: Implement pipeline cron scheduler**

Similar to sync-scheduler but for pipelines. On startup, loads all active pipelines with cron triggers and registers cron jobs. Provides `schedulePipeline`, `cancelPipeline`, `getActiveSchedules` functions.

- [ ] **Step 2: Wire scheduler startup in server/src/index.ts**

Call `startPipelineScheduler()` after app listen.

- [ ] **Step 3: Commit**

```bash
git add server/src/services/pipeline-scheduler.ts server/src/index.ts
git commit -m "feat: add cron-based pipeline scheduler"
```

---

## Chunk 4: Pipeline Builder UI

### Task 7: Client API and Store

**Files:**
- Create: `client/src/api/pipelines.ts`
- Create: `client/src/stores/pipelineStore.ts`

- [ ] **Step 1: Implement pipeline API client**

Functions: `fetchPipelines`, `fetchPipeline`, `createPipeline`, `updatePipeline`, `deletePipeline`, `triggerPipelineRun`, `fetchPipelineRuns`, `fetchRunDetail`.

- [ ] **Step 2: Implement pipeline Zustand store**

Store tracks: nodes, edges, selectedNodeId, isDirty, pipelineId, pipelineName. Actions: addNode, removeNode, updateNodeConfig, addEdge, removeEdge, selectNode, save, load.

- [ ] **Step 3: Commit**

```bash
git add client/src/api/pipelines.ts client/src/stores/pipelineStore.ts
git commit -m "feat: add pipeline API client and Zustand store"
```

---

### Task 8: Install React Flow

- [ ] **Step 1: Install reactflow**

```bash
cd client && npm install @xyflow/react
```

- [ ] **Step 2: Commit**

```bash
git add client/package.json client/package-lock.json
git commit -m "chore: install @xyflow/react for pipeline builder"
```

---

### Task 9: Custom Pipeline Nodes

**Files:**
- Create: `client/src/components/pipeline/nodes/BigQuerySourceNode.tsx`
- Create: `client/src/components/pipeline/nodes/BigQueryDestNode.tsx`
- Create: `client/src/components/pipeline/nodes/ExerciseNode.tsx`
- Create: `client/src/components/pipeline/nodes/ValidationGateNode.tsx`
- Create: `client/src/components/pipeline/nodes/TransformNode.tsx`
- Create: `client/src/components/pipeline/nodes/NotificationNode.tsx`

- [ ] **Step 1: Implement custom React Flow nodes**

Each node renders with:
- Icon representing node type (using lucide-react)
- Node label
- Status indicator (when viewing execution results)
- Input/output handles for connecting edges
- Click to select (opens config drawer)

Use the "Industrial Precision" design system: dark backgrounds (`bg-forge-800`), amber accents for active nodes, muted colors for inactive.

- [ ] **Step 2: Commit**

```bash
git add client/src/components/pipeline/nodes/
git commit -m "feat: add custom React Flow nodes for all pipeline node types"
```

---

### Task 10: Pipeline Canvas and Toolbar

**Files:**
- Create: `client/src/components/pipeline/PipelineCanvas.tsx`
- Create: `client/src/components/pipeline/PipelineToolbar.tsx`
- Create: `client/src/components/pipeline/NodeConfigDrawer.tsx`

- [ ] **Step 1: Implement PipelineCanvas**

Wraps React Flow with custom node types registered, edge styles (animated for active edges), background grid, minimap. Reads nodes/edges from the pipeline store and dispatches changes back.

- [ ] **Step 2: Implement PipelineToolbar**

Node palette (drag from toolbar onto canvas): BigQuery Source, BigQuery Destination, Enrichment Exercise, Validation Gate, Transform, Notification. Save/Run/Delete buttons. Pipeline name input.

- [ ] **Step 3: Implement NodeConfigDrawer**

Side drawer that opens when a node is selected. Shows config form specific to the selected node type (e.g., BigQuery Source shows credential, project, dataset, table fields). Save button updates the node config in the store.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/pipeline/PipelineCanvas.tsx client/src/components/pipeline/PipelineToolbar.tsx client/src/components/pipeline/NodeConfigDrawer.tsx
git commit -m "feat: add pipeline canvas, toolbar, and node config drawer"
```

---

### Task 11: Pipeline Pages

**Files:**
- Create: `client/src/pages/PipelineBuilderPage.tsx`
- Create: `client/src/pages/PipelineRunsPage.tsx`
- Create: `client/src/components/pipeline/RunStatusBadge.tsx`
- Modify: `client/src/App.tsx` (add routes)

- [ ] **Step 1: Implement PipelineBuilderPage**

Layout: PipelineToolbar at top, PipelineCanvas filling the remaining space, NodeConfigDrawer as an overlay. Loads pipeline data from URL param `/:id` or starts with empty canvas for `/new`.

- [ ] **Step 2: Implement PipelineRunsPage**

Table showing execution history for a pipeline: run ID, trigger type, status, started at, completed at, nodes run, rows processed. Click a run to see per-node execution detail (expandable rows or linked detail view).

- [ ] **Step 3: Implement RunStatusBadge**

Small colored badge showing run status: pending (gray), running (amber animated), success (green), failed (red), cancelled (muted).

- [ ] **Step 4: Add routes to App.tsx**

```
/pipelines -> pipeline list (add link to admin dashboard)
/pipelines/new -> PipelineBuilderPage (new)
/pipelines/:id -> PipelineBuilderPage (edit)
/pipelines/:id/runs -> PipelineRunsPage
```

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/PipelineBuilderPage.tsx client/src/pages/PipelineRunsPage.tsx client/src/components/pipeline/RunStatusBadge.tsx client/src/App.tsx
git commit -m "feat: add pipeline builder and runs pages with routing"
```
