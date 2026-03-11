import type { BigQueryDestNodeConfig } from '@mapforge/shared';
import type { NodeExecutionContext, NodeExecutionResult } from './index';
import { BigQueryService } from '../bigquery';
import { decryptCredential } from '../credentials';
import { db } from '../../db/connection';
import { storedCredentials } from '../../db/schema';
import { eq } from 'drizzle-orm';

export async function handleBigQueryDestination(config: BigQueryDestNodeConfig, context: NodeExecutionContext): Promise<NodeExecutionResult> {
  try {
    if (context.inputData.length === 0) return { status: 'success', outputData: [], rowCount: 0, metadata: { message: 'No data to write' } };
    const [cred] = await db.select().from(storedCredentials).where(eq(storedCredentials.id, config.credentialId));
    if (!cred) throw new Error('Credential not found');
    const encryptionKey = process.env.CREDENTIAL_ENCRYPTION_KEY;
    if (!encryptionKey) throw new Error('Encryption key not configured');
    const credJson = decryptCredential(cred.encryptedValue, encryptionKey);
    const bq = new BigQueryService(credJson);
    const result = await bq.writeRows(config.gcpProject, config.dataset, config.tableName, context.inputData, config.writeMode);
    return { status: result.success ? 'success' : 'failed', outputData: context.inputData, rowCount: result.rowsWritten, error: result.error };
  } catch (error: unknown) {
    return { status: 'failed', outputData: [], rowCount: 0, error: error instanceof Error ? error.message : 'BigQuery destination failed' };
  }
}
