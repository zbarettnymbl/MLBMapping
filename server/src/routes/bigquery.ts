import { Router } from 'express';
import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/connection';
import { storedCredentials, bigqueryDestinations, enrichmentRecords } from '../db/schema';
import { BigQueryService } from '../services/bigquery';
import { decryptCredential } from '../services/credentials';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);
router.use(requireRole('admin'));

async function getCredentialJson(credentialId: string): Promise<string> {
  const [cred] = await db.select().from(storedCredentials).where(eq(storedCredentials.id, credentialId));
  if (!cred) throw new Error('Credential not found');
  const encryptionKey = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!encryptionKey) throw new Error('Encryption key not configured');
  return decryptCredential(cred.encryptedValue, encryptionKey);
}

// POST /api/v1/bigquery/test-connection
router.post('/test-connection', async (req: Request, res: Response) => {
  try {
    const { gcpProject, dataset, tableOrQuery, queryType, credentialId } = req.body;
    const credJson = await getCredentialJson(credentialId);
    const bq = new BigQueryService(credJson);
    const result = await bq.testConnection(gcpProject, dataset, tableOrQuery, queryType);
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Connection test failed';
    res.status(400).json({ success: false, error: message });
  }
});

// POST /api/v1/bigquery/preview
router.post('/preview', async (req: Request, res: Response) => {
  try {
    const { gcpProject, dataset, tableOrQuery, queryType, credentialId, limit } = req.body;
    const credJson = await getCredentialJson(credentialId);
    const bq = new BigQueryService(credJson);
    const result = await bq.previewData(gcpProject, dataset, tableOrQuery, queryType, limit || 50);
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Preview failed';
    res.status(400).json({ error: message });
  }
});

// POST /api/v1/bigquery/schema
router.post('/schema', async (req: Request, res: Response) => {
  try {
    const { gcpProject, dataset, table, credentialId } = req.body;
    const credJson = await getCredentialJson(credentialId);
    const bq = new BigQueryService(credJson);
    const columns = await bq.getSchema(gcpProject, dataset, table);
    res.json({ columns });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Schema detection failed';
    res.status(400).json({ error: message });
  }
});

// POST /api/v1/bigquery/export/:exerciseId
router.post('/export/:exerciseId', async (req: Request, res: Response) => {
  try {
    const { exerciseId } = req.params;
    const [dest] = await db.select().from(bigqueryDestinations).where(eq(bigqueryDestinations.exerciseId, exerciseId));
    if (!dest) { res.status(404).json({ error: 'No BigQuery destination configured for this exercise' }); return; }
    const records = await db.select().from(enrichmentRecords).where(eq(enrichmentRecords.exerciseId, exerciseId));
    const classifiedRows = records.filter(r => r.isFullyClassified).map(r => ({
      ...(r.sourceData as Record<string, unknown>),
      ...(r.classifications as Record<string, unknown>),
    }));
    if (classifiedRows.length === 0) { res.json({ success: true, rowsWritten: 0 }); return; }
    const credJson = await getCredentialJson(dest.credentialId!);
    const bq = new BigQueryService(credJson);
    const result = await bq.writeRows(dest.gcpProject, dest.dataset, dest.tableName, classifiedRows, dest.writeMode as 'merge' | 'append' | 'overwrite');
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Export failed';
    res.status(500).json({ error: message });
  }
});

export { router as bigqueryRouter };
