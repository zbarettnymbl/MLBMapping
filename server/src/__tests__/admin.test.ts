import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { AuthUser } from '@mapforge/shared';
import { adminRouter } from '../routes/admin';

// We create a test app with the admin router mounted
function createTestApp(userOverride?: Partial<AuthUser>) {
  const app = express();
  app.use(express.json());

  // Mock auth middleware that sets req.user
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.user = {
      id: 'admin-1',
      orgId: 'org-1',
      email: 'admin@test.com',
      name: 'Admin User',
      role: 'admin',
      avatarUrl: null,
      ...userOverride,
    };
    next();
  });

  app.use('/api/v1/admin', adminRouter);
  return app;
}

// Dynamic import supertest to handle ESM
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let request: any;

beforeAll(async () => {
  const mod = await import('supertest');
  request = (mod as any).default || mod;
});

describe('Admin API Endpoints', () => {
  describe('GET /api/v1/admin/exercises', () => {
    it('returns exercises array for admin user', async () => {
      const app = createTestApp();
      const res = await request(app).get('/api/v1/admin/exercises');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('exercises');
      expect(Array.isArray(res.body.exercises)).toBe(true);
    });

    it('returns 403 for non-admin user', async () => {
      const app = createTestApp({ role: 'user' });
      const res = await request(app).get('/api/v1/admin/exercises');
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Admin access required');
    });
  });

  describe('GET /api/v1/admin/exercises/:id/progress', () => {
    it('returns 404 for non-existent exercise', async () => {
      const app = createTestApp();
      const res = await request(app).get('/api/v1/admin/exercises/nonexistent/progress');
      expect(res.status).toBe(404);
    });

    it('returns 403 for non-admin user', async () => {
      const app = createTestApp({ role: 'user' });
      const res = await request(app).get('/api/v1/admin/exercises/ex-1/progress');
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/admin/exercises/:id/remind/:userId', () => {
    it('returns sent: true on first call', async () => {
      const app = createTestApp();
      const res = await request(app)
        .post('/api/v1/admin/exercises/ex-rate-test/remind/u-rate-test')
        .send({});
      expect(res.status).toBe(200);
      expect(res.body.sent).toBe(true);
    });

    it('returns 429 on second call within 24 hours', async () => {
      const app = createTestApp();
      // First call
      await request(app)
        .post('/api/v1/admin/exercises/ex-dup/remind/u-dup')
        .send({});
      // Second call
      const res = await request(app)
        .post('/api/v1/admin/exercises/ex-dup/remind/u-dup')
        .send({});
      expect(res.status).toBe(429);
      expect(res.body.error).toBe('Reminder already sent within the last 24 hours');
    });

    it('returns 403 for non-admin user', async () => {
      const app = createTestApp({ role: 'user' });
      const res = await request(app)
        .post('/api/v1/admin/exercises/ex-1/remind/u-1')
        .send({});
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/admin/exercises/:id/progress/export', () => {
    it('returns CSV with correct headers', async () => {
      const app = createTestApp();
      const res = await request(app).get('/api/v1/admin/exercises/ex-1/progress/export');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('exercise-ex-1-progress.csv');
      expect(res.text).toContain('user_name,user_email,role');
    });

    it('returns 403 for non-admin user', async () => {
      const app = createTestApp({ role: 'user' });
      const res = await request(app).get('/api/v1/admin/exercises/ex-1/progress/export');
      expect(res.status).toBe(403);
    });
  });
});
