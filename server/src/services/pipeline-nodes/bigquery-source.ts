import type { BigQuerySourceNodeConfig } from '@mapforge/shared';
import type { NodeExecutionContext, NodeExecutionResult } from './index';
import { BigQueryService } from '../bigquery';
import { decryptCredential } from '../credentials';
import { db } from '../../db/connection';
import { storedCredentials } from '../../db/schema';
import { eq } from 'drizzle-orm';

export async function handleBigQuerySource(config: BigQuerySourceNodeConfig, context: NodeExecutionContext): Promise<NodeExecutionResult> {
  try {
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
    return { status: 'success', outputData: rows, rowCount: rows.length };
  } catch (error: unknown) {
    return { status: 'failed', outputData: [], rowCount: 0, error: error instanceof Error ? error.message : 'BigQuery source failed' };
  }
}
