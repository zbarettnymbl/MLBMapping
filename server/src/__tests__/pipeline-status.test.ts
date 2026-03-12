import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock db and auth
vi.mock('../db/connection', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn(),
  },
}));

vi.mock('../middleware/auth', () => ({
  authMiddleware: (_req: any, _res: any, next: any) => {
    _req.user = { id: 'u1', orgId: 'org1', role: 'admin' };
    next();
  },
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../services/pipeline-executor', () => ({
  executePipeline: vi.fn(),
}));

describe('PATCH /pipelines/:id/status', () => {
  let app: express.Express;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    const { pipelineRouter } = await import('../routes/pipelines');
    app.use('/pipelines', pipelineRouter);
  });

  it('returns 400 for invalid status', async () => {
    const res = await request(app).patch('/pipelines/p1/status').send({ status: 'invalid' });
    expect(res.status).toBe(400);
  });

  it('updates pipeline status', async () => {
    const { db } = await import('../db/connection');
    (db.returning as any).mockResolvedValueOnce([{ id: 'p1', status: 'active' }]);

    const res = await request(app).patch('/pipelines/p1/status').send({ status: 'active' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('active');
  });
});
