import { Router } from 'express';
import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/connection';
import { storedCredentials, bigqueryDestinations, enrichmentRecords } from '../db/schema';
import { BigQueryService } from '../services/bigquery';
import { MockBigQueryService } from '../services/mock-bigquery';
import { decryptCredential } from '../services/credentials';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);
router.use(requireRole('admin'));

const DEMO_CREDENTIAL_ID = 'b0000000-0000-4000-8000-000000000001';

function isMockMode(credentialId: string): boolean {
  return process.env.MOCK_BIGQUERY === 'true' && credentialId === DEMO_CREDENTIAL_ID;
}

async function getCredentialJson(credentialId: string): Promise<string> {
  const [cred] = await db.select().from(storedCredentials).where(eq(storedCredentials.id, credentialId));
  if (!cred) throw new Error('Credential not found');
  const encryptionKey = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!encryptionKey) throw new Error('Encryption key not configured');
  return decryptCredential(cred.encryptedValue, encryptionKey);
}

async function createBigQueryService(credentialId: string): Promise<BigQueryService | MockBigQueryService> {
  if (isMockMode(credentialId)) {
    return new MockBigQueryService();
  }
  const credJson = await getCredentialJson(credentialId);
  return new BigQueryService(credJson);
}

// POST /api/v1/bigquery/test-connection
router.post('/test-connection', async (req: Request, res: Response) => {
  try {
    const { gcpProject, dataset, tableOrQuery, queryType, credentialId } = req.body;
    const bq = await createBigQueryService(credentialId);
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
    const bq = await createBigQueryService(credentialId);
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
    const bq = await createBigQueryService(credentialId);
    const columns = await bq.getSchema(gcpProject, dataset, table);
    res.json({ columns });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Schema detection failed';
    res.status(400).json({ error: message });
  }
});

// GET /api/v1/bigquery/datasets
router.get('/datasets', async (req: Request, res: Response) => {
  try {
    const credentialId = req.query.credentialId as string;
    if (!credentialId) { res.status(400).json({ error: 'credentialId required' }); return; }

    if (isMockMode(credentialId)) {
      const mock = new MockBigQueryService();
      res.json({ gcpProject: 'mock-gcp-project', datasets: mock.listDatasets() });
      return;
    }

    const credJson = await getCredentialJson(credentialId);
    const credentials = JSON.parse(credJson);
    const { BigQuery } = await import('@google-cloud/bigquery');
    const bq = new BigQuery({ projectId: credentials.project_id, credentials });
    const [datasets] = await bq.getDatasets();
    res.json({ gcpProject: credentials.project_id, datasets: datasets.map(d => d.id) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to list datasets';
    res.status(400).json({ error: message });
  }
});

// GET /api/v1/bigquery/tables
router.get('/tables', async (req: Request, res: Response) => {
  try {
    const credentialId = req.query.credentialId as string;
    const dataset = req.query.dataset as string;
    if (!credentialId || !dataset) { res.status(400).json({ error: 'credentialId and dataset required' }); return; }

    if (isMockMode(credentialId)) {
      const mock = new MockBigQueryService();
      res.json({ tables: mock.listTables(dataset) });
      return;
    }

    const credJson = await getCredentialJson(credentialId);
    const credentials = JSON.parse(credJson);
    const { BigQuery } = await import('@google-cloud/bigquery');
    const bq = new BigQuery({ projectId: credentials.project_id, credentials });
    const [tables] = await bq.dataset(dataset).getTables();
    res.json({ tables: tables.map(t => t.id) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to list tables';
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

    if (process.env.MOCK_BIGQUERY === 'true' && dest.credentialId === DEMO_CREDENTIAL_ID) {
      const mock = new MockBigQueryService();
      const result = await mock.writeRows(dest.gcpProject, dest.dataset, dest.tableName, classifiedRows, dest.writeMode as 'merge' | 'append' | 'overwrite');
      res.json(result);
      return;
    }

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
