import cron from 'node-cron';
import { db } from '../db/connection';
import { bigquerySources } from '../db/schema';
import { isNotNull } from 'drizzle-orm';
import { syncExerciseData } from './source-sync';

const activeJobs = new Map<string, cron.ScheduledTask>();

export function startSyncScheduler(): void {
  loadScheduledSyncs().catch(err => console.error('Failed to load sync schedules:', err));
}

async function loadScheduledSyncs(): Promise<void> {
  const sources = await db.select({ exerciseId: bigquerySources.exerciseId, schedule: bigquerySources.refreshSchedule })
    .from(bigquerySources).where(isNotNull(bigquerySources.refreshSchedule));
  for (const source of sources) {
    if (source.exerciseId && source.schedule) {
      scheduleSync(source.exerciseId, source.schedule);
    }
  }
}

export function scheduleSync(exerciseId: string, cronExpression: string): void {
  cancelSync(exerciseId);
  if (!cron.validate(cronExpression)) {
    console.error(`Invalid cron expression for exercise ${exerciseId}: ${cronExpression}`);
    return;
  }
  const task = cron.schedule(cronExpression, async () => {
    console.log(`Running scheduled sync for exercise ${exerciseId}`);
    try {
      const result = await syncExerciseData(exerciseId);
      console.log(`Sync complete for ${exerciseId}:`, result);
    } catch (error) {
      console.error(`Sync failed for ${exerciseId}:`, error);
    }
  });
  activeJobs.set(exerciseId, task);
}

export function cancelSync(exerciseId: string): void {
  const existing = activeJobs.get(exerciseId);
  if (existing) {
    existing.stop();
    activeJobs.delete(exerciseId);
  }
}

export function getActiveSchedules(): Array<{ exerciseId: string }> {
  return Array.from(activeJobs.keys()).map(id => ({ exerciseId: id }));
}
