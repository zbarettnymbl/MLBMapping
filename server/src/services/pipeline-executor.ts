import { eq } from 'drizzle-orm';
import { db } from '../db/connection';
import { pipelines, pipelineRuns, pipelineNodeRuns } from '../db/schema';
import { nodeHandlers } from './pipeline-nodes/index';
import type { PipelineNode, PipelineEdge, PipelineNodeConfig } from '@mapforge/shared';

export function topologicalSort(nodes: PipelineNode[], edges: PipelineEdge[]): PipelineNode[] {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  const nodeMap = new Map<string, PipelineNode>();
  for (const node of nodes) { inDegree.set(node.id, 0); adjacency.set(node.id, []); nodeMap.set(node.id, node); }
  for (const edge of edges) { adjacency.get(edge.source)!.push(edge.target); inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1); }
  const queue: string[] = [];
  for (const [id, deg] of inDegree) { if (deg === 0) queue.push(id); }
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
  if (sorted.length !== nodes.length) throw new Error('Pipeline contains a cycle -- cannot execute');
  return sorted;
}

export async function executePipeline(pipelineId: string, triggeredBy: 'manual' | 'cron' | 'api', userId?: string): Promise<string> {
  const [pipeline] = await db.select().from(pipelines).where(eq(pipelines.id, pipelineId));
  if (!pipeline) throw new Error('Pipeline not found');
  const nodes = pipeline.nodes as PipelineNode[];
  const edges = pipeline.edges as PipelineEdge[];
  const [run] = await db.insert(pipelineRuns).values({
    pipelineId, status: 'running', triggeredBy, triggeredByUserId: userId ?? null,
  }).returning();
  try {
    const sortedNodes = topologicalSort(nodes, edges);
    const nodeOutputs = new Map<string, Record<string, unknown>[]>();
    let nodesSucceeded = 0, nodesFailed = 0, totalRowsProcessed = 0;
    for (const node of sortedNodes) {
      const [nodeRun] = await db.insert(pipelineNodeRuns).values({
        runId: run.id, nodeId: node.id, nodeType: node.type, status: 'running', startedAt: new Date(),
      }).returning();
      const predecessorEdges = edges.filter(e => e.target === node.id);
      const inputData: Record<string, unknown>[] = [];
      for (const edge of predecessorEdges) { inputData.push(...(nodeOutputs.get(edge.source) ?? [])); }
      const handler = nodeHandlers[node.type];
      if (!handler) {
        await db.update(pipelineNodeRuns).set({ status: 'failed', completedAt: new Date(), errorMessage: `Unknown node type: ${node.type}` }).where(eq(pipelineNodeRuns.id, nodeRun.id));
        nodesFailed++; continue;
      }
      const result = await handler(node.config, { runId: run.id, nodeId: node.id, inputData });
      nodeOutputs.set(node.id, result.outputData);
      totalRowsProcessed += result.rowCount;
      await db.update(pipelineNodeRuns).set({
        status: result.status, completedAt: new Date(), inputRowCount: inputData.length,
        outputRowCount: result.rowCount, errorMessage: result.error ?? null, metadata: result.metadata ?? {},
      }).where(eq(pipelineNodeRuns.id, nodeRun.id));
      if (result.status === 'success') nodesSucceeded++; else { nodesFailed++; break; }
    }
    const finalStatus = nodesFailed > 0 ? 'failed' : 'success';
    await db.update(pipelineRuns).set({
      status: finalStatus, completedAt: new Date(),
      summary: { nodesRun: nodesSucceeded + nodesFailed, nodesSucceeded, nodesFailed, rowsProcessed: totalRowsProcessed },
    }).where(eq(pipelineRuns.id, run.id));
    return run.id;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Pipeline execution failed';
    await db.update(pipelineRuns).set({ status: 'failed', completedAt: new Date(), errorMessage: message }).where(eq(pipelineRuns.id, run.id));
    throw error;
  }
}
