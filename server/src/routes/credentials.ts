import { Router } from 'express';
import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/connection';
import { storedCredentials } from '../db/schema';
import { encryptCredential } from '../services/credentials';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);
router.use(requireRole('admin'));

// POST /api/v1/credentials -- store a new encrypted credential
router.post('/', async (req: Request, res: Response) => {
  const { name, credentialType, credentialValue } = req.body;
  const encryptionKey = process.env.CREDENTIAL_ENCRYPTION_KEY;

  if (!encryptionKey) {
    res.status(500).json({ error: 'Encryption key not configured' });
    return;
  }

  const encrypted = encryptCredential(credentialValue, encryptionKey);

  const [credential] = await db.insert(storedCredentials).values({
    orgId: req.user!.orgId,
    name,
    credentialType,
    encryptedValue: encrypted,
    createdBy: req.user!.id,
  }).returning();

  res.status(201).json({
    id: credential.id,
    name: credential.name,
    credentialType: credential.credentialType,
    createdAt: credential.createdAt?.toISOString(),
  });
});

// GET /api/v1/credentials -- list credentials (metadata only)
router.get('/', async (req: Request, res: Response) => {
  const credentials = await db
    .select({
      id: storedCredentials.id,
      name: storedCredentials.name,
      credentialType: storedCredentials.credentialType,
      createdAt: storedCredentials.createdAt,
    })
    .from(storedCredentials)
    .where(eq(storedCredentials.orgId, req.user!.orgId));

  res.json({ credentials });
});

// DELETE /api/v1/credentials/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  await db.delete(storedCredentials).where(eq(storedCredentials.id, id));
  res.status(204).send();
});

export { router as credentialsRouter };
