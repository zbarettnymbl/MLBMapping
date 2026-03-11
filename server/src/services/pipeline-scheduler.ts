import cron from 'node-cron';
import { db } from '../db/connection';
import { pipelines } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { executePipeline } from './pipeline-executor';

const activeJobs = new Map<string, cron.ScheduledTask>();

export function startPipelineScheduler(): void {
  loadScheduledPipelines().catch(err => console.error('Failed to load pipeline schedules:', err));
}

async function loadScheduledPipelines(): Promise<void> {
  const activePipelines = await db.select().from(pipelines)
    .where(and(eq(pipelines.status, 'active'), eq(pipelines.triggerType, 'cron')));
  for (const pipeline of activePipelines) {
    const config = pipeline.triggerConfig as { cronExpression?: string };
    if (config?.cronExpression) { schedulePipeline(pipeline.id, config.cronExpression); }
  }
}

export function schedulePipeline(pipelineId: string, cronExpression: string): void {
  cancelPipeline(pipelineId);
  if (!cron.validate(cronExpression)) {
    console.error(`Invalid cron expression for pipeline ${pipelineId}: ${cronExpression}`);
    return;
  }
  const task = cron.schedule(cronExpression, async () => {
    console.log(`Running scheduled pipeline ${pipelineId}`);
    try { await executePipeline(pipelineId, 'cron'); }
    catch (error) { console.error(`Pipeline ${pipelineId} failed:`, error); }
  });
  activeJobs.set(pipelineId, task);
}

export function cancelPipeline(pipelineId: string): void {
  const existing = activeJobs.get(pipelineId);
  if (existing) { existing.stop(); activeJobs.delete(pipelineId); }
}

export function getActivePipelineSchedules(): Array<{ pipelineId: string }> {
  return Array.from(activeJobs.keys()).map(id => ({ pipelineId: id }));
}
