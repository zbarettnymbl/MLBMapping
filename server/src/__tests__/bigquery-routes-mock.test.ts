import { describe, it, expect, vi } from 'vitest';

// Set env before importing anything
vi.stubEnv('MOCK_BIGQUERY', 'true');

// Mock auth middleware to bypass
vi.mock('../middleware/auth', () => ({
  authMiddleware: (_req: any, _res: any, next: any) => { _req.user = { id: 'test', role: 'admin', orgId: 'org-1' }; next(); },
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

// Mock db to avoid needing a real database connection
vi.mock('../db/connection', () => ({
  db: {},
}));

import express from 'express';
import request from 'supertest';
import { bigqueryRouter } from '../routes/bigquery';

const app = express();
app.use(express.json());
app.use('/api/v1/bigquery', bigqueryRouter);

describe('BigQuery routes (mock mode)', () => {
  it('POST /test-connection succeeds with demo credential for known table', async () => {
    const res = await request(app).post('/api/v1/bigquery/test-connection').send({
      gcpProject: 'mlb-broadcast-analytics',
      dataset: 'broadcast_data',
      tableOrQuery: 'broadcast_programs',
      queryType: 'table',
      credentialId: 'b0000000-0000-4000-8000-000000000001',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /preview returns rows', async () => {
    const res = await request(app).post('/api/v1/bigquery/preview').send({
      gcpProject: 'mlb-broadcast-analytics',
      dataset: 'development_data',
      tableOrQuery: 'venues',
      queryType: 'table',
      credentialId: 'b0000000-0000-4000-8000-000000000001',
      limit: 5,
    });
    expect(res.status).toBe(200);
    expect(res.body.rows.length).toBeLessThanOrEqual(5);
    expect(res.body.columns.length).toBeGreaterThan(0);
  });

  it('GET /datasets returns dataset list', async () => {
    const res = await request(app).get('/api/v1/bigquery/datasets').query({
      credentialId: 'b0000000-0000-4000-8000-000000000001',
    });
    expect(res.status).toBe(200);
    expect(res.body.datasets).toEqual(['broadcast_data', 'development_data']);
  });

  it('GET /tables returns table list for dataset', async () => {
    const res = await request(app).get('/api/v1/bigquery/tables').query({
      credentialId: 'b0000000-0000-4000-8000-000000000001',
      dataset: 'development_data',
    });
    expect(res.status).toBe(200);
    expect(res.body.tables).toContain('venues');
    expect(res.body.tables).toContain('team_rosters');
  });
});
