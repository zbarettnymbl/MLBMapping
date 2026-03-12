import { Router } from 'express';
import type { Request, Response } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/connection';
import { pipelines, pipelineRuns, pipelineNodeRuns } from '../db/schema';
import { authMiddleware, requireRole } from '../middleware/auth';
import { executePipeline } from '../services/pipeline-executor';

const router = Router();
router.use(authMiddleware);
router.use(requireRole('admin'));

/** Scope pipeline queries to the requesting user's org */
function orgScoped(pipelineId: string, orgId: string) {
  return and(eq(pipelines.id, pipelineId), eq(pipelines.orgId, orgId));
}

router.get('/', async (req: Request, res: Response) => {
  const all = await db.select().from(pipelines).where(eq(pipelines.orgId, req.user!.orgId)).orderBy(desc(pipelines.updatedAt));
  res.json({ pipelines: all });
});

router.post('/', async (req: Request, res: Response) => {
  const { name, description, nodes, edges, triggerType, triggerConfig, exerciseId } = req.body;
  const [pipeline] = await db.insert(pipelines).values({
    orgId: req.user!.orgId, name, description, nodes: nodes || [], edges: edges || [],
    triggerType: triggerType || 'manual', triggerConfig: triggerConfig || {},
    exerciseId, createdBy: req.user!.id,
  }).returning();
  res.status(201).json(pipeline);
});

router.get('/:id', async (req: Request, res: Response) => {
  const [pipeline] = await db.select().from(pipelines).where(orgScoped(req.params.id, req.user!.orgId));
  if (!pipeline) { res.status(404).json({ error: 'Pipeline not found' }); return; }
  res.json(pipeline);
});

router.put('/:id', async (req: Request, res: Response) => {
  const { name, description, nodes, edges, triggerType, triggerConfig, exerciseId } = req.body;
  const [updated] = await db.update(pipelines).set({
    name, description, nodes, edges, triggerType, triggerConfig, exerciseId, updatedAt: new Date(),
  }).where(orgScoped(req.params.id, req.user!.orgId)).returning();
  if (!updated) { res.status(404).json({ error: 'Pipeline not found' }); return; }
  res.json(updated);
});

router.patch('/:id/status', async (req: Request, res: Response) => {
  const { status } = req.body;
  const validStatuses = ['draft', 'active', 'paused'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    return;
  }
  const [updated] = await db.update(pipelines).set({ status, updatedAt: new Date() }).where(orgScoped(req.params.id, req.user!.orgId)).returning();
  if (!updated) { res.status(404).json({ error: 'Pipeline not found' }); return; }
  res.json(updated);
});

router.delete('/:id', async (req: Request, res: Response) => {
  // Verify ownership before deleting
  const [pipeline] = await db.select({ id: pipelines.id }).from(pipelines).where(orgScoped(req.params.id, req.user!.orgId));
  if (!pipeline) { res.status(404).json({ error: 'Pipeline not found' }); return; }
  const runs = await db.select({ id: pipelineRuns.id }).from(pipelineRuns).where(eq(pipelineRuns.pipelineId, req.params.id));
  for (const run of runs) { await db.delete(pipelineNodeRuns).where(eq(pipelineNodeRuns.runId, run.id)); }
  await db.delete(pipelineRuns).where(eq(pipelineRuns.pipelineId, req.params.id));
  await db.delete(pipelines).where(eq(pipelines.id, req.params.id));
  res.status(204).send();
});

router.post('/:id/run', async (req: Request, res: Response) => {
  const [pipeline] = await db.select({ id: pipelines.id }).from(pipelines).where(orgScoped(req.params.id, req.user!.orgId));
  if (!pipeline) { res.status(404).json({ error: 'Pipeline not found' }); return; }
  try {
    const runId = await executePipeline(req.params.id, 'manual', req.user!.id);
    res.json({ runId });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Execution failed' });
  }
});

router.get('/:id/runs', async (req: Request, res: Response) => {
  const [pipeline] = await db.select({ id: pipelines.id }).from(pipelines).where(orgScoped(req.params.id, req.user!.orgId));
  if (!pipeline) { res.status(404).json({ error: 'Pipeline not found' }); return; }
  const runs = await db.select().from(pipelineRuns).where(eq(pipelineRuns.pipelineId, req.params.id)).orderBy(desc(pipelineRuns.startedAt));
  res.json({ runs });
});

router.get('/runs/:runId', async (req: Request, res: Response) => {
  const [run] = await db.select().from(pipelineRuns).where(eq(pipelineRuns.id, req.params.runId));
  if (!run) { res.status(404).json({ error: 'Run not found' }); return; }
  const nodeRuns = await db.select().from(pipelineNodeRuns).where(eq(pipelineNodeRuns.runId, req.params.runId));
  res.json({ run, nodeRuns });
});

export { router as pipelineRouter };
