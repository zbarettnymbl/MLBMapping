import type { ExerciseNodeConfig } from '@mapforge/shared';
import type { NodeExecutionContext, NodeExecutionResult } from './index';
import { db } from '../../db/connection';
import { enrichmentRecords } from '../../db/schema';
import { eq } from 'drizzle-orm';

export async function handleEnrichmentExercise(config: ExerciseNodeConfig, context: NodeExecutionContext): Promise<NodeExecutionResult> {
  try {
    const records = await db.select().from(enrichmentRecords).where(eq(enrichmentRecords.exerciseId, config.exerciseId));
    if (config.mode === 'wait_for_completion') {
      const total = records.length;
      const classified = records.filter(r => r.isFullyClassified).length;
      const pct = total > 0 ? (classified / total) * 100 : 0;
      const threshold = config.completionThreshold ?? 100;
      if (pct < threshold) {
        return { status: 'failed', outputData: [], rowCount: 0, error: `Completion ${pct.toFixed(1)}% below threshold ${threshold}%` };
      }
    }
    const outputData = records.filter(r => r.isFullyClassified).map(r => ({
      ...(r.sourceData as Record<string, unknown>),
      ...(r.classifications as Record<string, unknown>),
    }));
    return { status: 'success', outputData, rowCount: outputData.length };
  } catch (error: unknown) {
    return { status: 'failed', outputData: [], rowCount: 0, error: error instanceof Error ? error.message : 'Exercise node failed' };
  }
}
