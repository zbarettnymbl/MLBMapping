import { eq, sql } from 'drizzle-orm';
import { db } from '../db/connection';
import { referenceTables, referenceTableRows, referenceTableVersions, storedCredentials } from '../db/schema';
import { BigQueryService } from './bigquery';
import { decryptCredential } from './credentials';

interface RefreshConfig {
  credentialId: string;
  gcpProject: string;
  dataset: string;
  tableOrQuery: string;
  queryType: 'table' | 'query';
}

export async function refreshReferenceTableFromBigQuery(referenceTableId: string, userId: string): Promise<{ rowCount: number }> {
  const [table] = await db.select().from(referenceTables).where(eq(referenceTables.id, referenceTableId));
  if (!table) throw new Error('Reference table not found');
  if (table.refreshSource !== 'bigquery') throw new Error('Table is not configured for BigQuery refresh');

  const config = table.refreshConfig as RefreshConfig;
  if (!config?.credentialId) throw new Error('No credential configured for BigQuery refresh');

  const [cred] = await db.select().from(storedCredentials).where(eq(storedCredentials.id, config.credentialId));
  if (!cred) throw new Error('Credential not found');

  const encryptionKey = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!encryptionKey) throw new Error('Encryption key not configured');

  const credJson = decryptCredential(cred.encryptedValue, encryptionKey);
  const bq = new BigQueryService(credJson);

  const query = config.queryType === 'table'
    ? `SELECT * FROM \`${config.gcpProject}.${config.dataset}.${config.tableOrQuery}\``
    : config.tableOrQuery;
  const rows = await bq.executeQuery(query);

  // Snapshot current state for versioning
  const currentRows = await db.select().from(referenceTableRows).where(eq(referenceTableRows.referenceTableId, referenceTableId));
  const [maxVersion] = await db.select({ max: sql<number>`coalesce(max(${referenceTableVersions.version}), 0)::int` })
    .from(referenceTableVersions).where(eq(referenceTableVersions.referenceTableId, referenceTableId));
  await db.insert(referenceTableVersions).values({
    referenceTableId, version: (maxVersion?.max ?? 0) + 1,
    snapshot: { columns: table.columns, rows: currentRows }, createdBy: userId,
  });

  // Replace rows
  await db.delete(referenceTableRows).where(eq(referenceTableRows.referenceTableId, referenceTableId));
  let ordinal = 1;
  for (const row of rows) {
    await db.insert(referenceTableRows).values({ referenceTableId, data: row, ordinal: ordinal++ });
  }

  const columns = rows.length > 0 ? Object.keys(rows[0]).map(k => ({ key: k, label: k, type: 'text' as const })) : table.columns;
  await db.update(referenceTables).set({ rowCount: rows.length, columns, lastRefreshedAt: new Date(), updatedAt: new Date() })
    .where(eq(referenceTables.id, referenceTableId));

  return { rowCount: rows.length };
}
