import { eq } from 'drizzle-orm';
import { db } from '../db/connection';
import { enrichmentRecords, enrichmentExercises, bigquerySources, storedCredentials } from '../db/schema';
import { BigQueryService } from './bigquery';
import { decryptCredential } from './credentials';
import type { SyncResult } from '@mapforge/shared';

interface ExistingRecord {
  id: string;
  uniqueKey: Record<string, string>;
  sourceData: Record<string, unknown>;
}

interface DiffResult {
  newRecords: Record<string, unknown>[];
  changedRecords: Array<ExistingRecord & { newSourceData: Record<string, unknown> }>;
  removedRecords: ExistingRecord[];
  unchangedRecords: ExistingRecord[];
}

export function buildUniqueKey(row: Record<string, unknown>, keyColumns: string[]): string {
  return keyColumns.map(k => String(row[k] ?? '')).join('::');
}

export function diffRecords(
  sourceRows: Record<string, unknown>[],
  existingRecords: ExistingRecord[],
  uniqueKeyColumns: string[]
): DiffResult {
  const existingByKey = new Map<string, ExistingRecord>();
  for (const rec of existingRecords) {
    const key = uniqueKeyColumns.map(k => String(rec.uniqueKey[k] ?? '')).join('::');
    existingByKey.set(key, rec);
  }

  const newRecords: Record<string, unknown>[] = [];
  const changedRecords: DiffResult['changedRecords'] = [];
  const unchangedRecords: ExistingRecord[] = [];
  const seenKeys = new Set<string>();

  for (const row of sourceRows) {
    const key = buildUniqueKey(row, uniqueKeyColumns);
    seenKeys.add(key);
    const existing = existingByKey.get(key);
    if (!existing) {
      newRecords.push(row);
    } else {
      const sourceChanged = JSON.stringify(existing.sourceData) !== JSON.stringify(row);
      if (sourceChanged) {
        changedRecords.push({ ...existing, newSourceData: row });
      } else {
        unchangedRecords.push(existing);
      }
    }
  }

  const removedRecords = existingRecords.filter(rec => {
    const key = uniqueKeyColumns.map(k => String(rec.uniqueKey[k] ?? '')).join('::');
    return !seenKeys.has(key);
  });

  return { newRecords, changedRecords, removedRecords, unchangedRecords };
}

export async function syncExerciseData(exerciseId: string): Promise<SyncResult> {
  const startedAt = new Date().toISOString();
  const errors: string[] = [];

  const [exercise] = await db.select().from(enrichmentExercises).where(eq(enrichmentExercises.id, exerciseId));
  if (!exercise) throw new Error(`Exercise ${exerciseId} not found`);

  const [source] = await db.select().from(bigquerySources).where(eq(bigquerySources.exerciseId, exerciseId));
  if (!source) throw new Error(`No BigQuery source configured for exercise ${exerciseId}`);

  const [cred] = await db.select().from(storedCredentials).where(eq(storedCredentials.id, source.credentialId!));
  if (!cred) throw new Error('Credential not found');

  const encryptionKey = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!encryptionKey) throw new Error('Encryption key not configured');

  const credJson = decryptCredential(cred.encryptedValue, encryptionKey);
  const bq = new BigQueryService(credJson);

  const query = source.queryType === 'table'
    ? `SELECT * FROM \`${source.gcpProject}.${source.dataset}.${source.tableOrQuery}\``
    : source.tableOrQuery;

  const sourceRows = await bq.executeQuery(query);

  const existingRecords = await db.select({ id: enrichmentRecords.id, uniqueKey: enrichmentRecords.uniqueKey, sourceData: enrichmentRecords.sourceData })
    .from(enrichmentRecords).where(eq(enrichmentRecords.exerciseId, exerciseId));

  const typedExisting = existingRecords.map(r => ({
    id: r.id,
    uniqueKey: r.uniqueKey as Record<string, string>,
    sourceData: r.sourceData as Record<string, unknown>,
  }));

  const uniqueKeyColumns = exercise.uniqueKeyColumns ?? [];
  const diff = diffRecords(sourceRows, typedExisting, uniqueKeyColumns);

  for (const row of diff.newRecords) {
    const uniqueKey: Record<string, string> = {};
    for (const k of uniqueKeyColumns) { uniqueKey[k] = String(row[k] ?? ''); }
    await db.insert(enrichmentRecords).values({
      exerciseId, uniqueKey, sourceData: row, classifications: {},
      recordState: 'new', validationErrors: [], isFullyClassified: false,
    });
  }

  for (const rec of diff.changedRecords) {
    await db.update(enrichmentRecords).set({ sourceData: rec.newSourceData, recordState: 'changed', updatedAt: new Date() })
      .where(eq(enrichmentRecords.id, rec.id));
  }

  for (const rec of diff.removedRecords) {
    await db.update(enrichmentRecords).set({ recordState: 'removed', updatedAt: new Date() })
      .where(eq(enrichmentRecords.id, rec.id));
  }

  for (const rec of diff.unchangedRecords) {
    await db.update(enrichmentRecords).set({ recordState: 'existing', updatedAt: new Date() })
      .where(eq(enrichmentRecords.id, rec.id));
  }

  await db.update(bigquerySources).set({ lastRefreshedAt: new Date(), lastRowCount: sourceRows.length })
    .where(eq(bigquerySources.exerciseId, exerciseId));

  return {
    exerciseId, startedAt, completedAt: new Date().toISOString(),
    newRecords: diff.newRecords.length, existingRecords: diff.unchangedRecords.length,
    changedRecords: diff.changedRecords.length, removedRecords: diff.removedRecords.length,
    totalSourceRows: sourceRows.length, errors,
  };
}
