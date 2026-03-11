import { Router } from 'express';
import type { Request, Response } from 'express';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/connection';
import { referenceTables, referenceTableRows, referenceTableVersions } from '../db/schema';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// GET /api/v1/reference-tables
router.get('/', async (req: Request, res: Response) => {
  const tables = await db.select().from(referenceTables).where(eq(referenceTables.orgId, req.user!.orgId));
  res.json({ tables });
});

// POST /api/v1/reference-tables
router.post('/', requireRole('admin'), async (req: Request, res: Response) => {
  const { name, description, columns, primaryKeyColumn, displayColumn } = req.body;
  const [table] = await db.insert(referenceTables).values({
    orgId: req.user!.orgId, name, description, columns, primaryKeyColumn, displayColumn,
    rowCount: 0, refreshSource: 'manual',
  }).returning();
  res.status(201).json(table);
});

// GET /api/v1/reference-tables/:id
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const [table] = await db.select().from(referenceTables).where(eq(referenceTables.id, id));
  if (!table) { res.status(404).json({ error: 'Reference table not found' }); return; }
  const rows = await db.select().from(referenceTableRows).where(eq(referenceTableRows.referenceTableId, id)).orderBy(referenceTableRows.ordinal);
  res.json({ ...table, rows });
});

// PUT /api/v1/reference-tables/:id
router.put('/:id', requireRole('admin'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const [updated] = await db.update(referenceTables).set({ ...req.body, updatedAt: new Date() }).where(eq(referenceTables.id, id)).returning();
  res.json(updated);
});

// DELETE /api/v1/reference-tables/:id
router.delete('/:id', requireRole('admin'), async (req: Request, res: Response) => {
  const { id } = req.params;
  await db.delete(referenceTableRows).where(eq(referenceTableRows.referenceTableId, id));
  await db.delete(referenceTableVersions).where(eq(referenceTableVersions.referenceTableId, id));
  await db.delete(referenceTables).where(eq(referenceTables.id, id));
  res.status(204).send();
});

// POST /api/v1/reference-tables/:id/rows
router.post('/:id/rows', requireRole('admin'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { rows } = req.body;
  const [maxOrd] = await db.select({ max: sql<number>`coalesce(max(${referenceTableRows.ordinal}), 0)::int` })
    .from(referenceTableRows).where(eq(referenceTableRows.referenceTableId, id));
  let ordinal = (maxOrd?.max ?? 0) + 1;
  const inserted = [];
  for (const row of rows) {
    const [r] = await db.insert(referenceTableRows).values({ referenceTableId: id, data: row.data, ordinal: ordinal++ }).returning();
    inserted.push(r);
  }
  await db.update(referenceTables)
    .set({ rowCount: sql`(select count(*)::int from reference_table_rows where reference_table_id = ${id})` })
    .where(eq(referenceTables.id, id));
  res.status(201).json({ rows: inserted });
});

// PUT /api/v1/reference-tables/:id/rows/:rowId
router.put('/:id/rows/:rowId', requireRole('admin'), async (req: Request, res: Response) => {
  const { rowId } = req.params;
  const [updated] = await db.update(referenceTableRows).set({ data: req.body.data }).where(eq(referenceTableRows.id, rowId)).returning();
  res.json(updated);
});

// DELETE /api/v1/reference-tables/:id/rows/:rowId
router.delete('/:id/rows/:rowId', requireRole('admin'), async (req: Request, res: Response) => {
  const { id, rowId } = req.params;
  await db.delete(referenceTableRows).where(eq(referenceTableRows.id, rowId));
  await db.update(referenceTables)
    .set({ rowCount: sql`(select count(*)::int from reference_table_rows where reference_table_id = ${id})` })
    .where(eq(referenceTables.id, id));
  res.status(204).send();
});

// GET /api/v1/reference-tables/:id/values
router.get('/:id/values', async (req: Request, res: Response) => {
  const { id } = req.params;
  const filterColumn = req.query.filterColumn as string;
  const filterValue = req.query.filterValue as string;
  const valueColumn = req.query.valueColumn as string;
  const rows = await db.select().from(referenceTableRows).where(eq(referenceTableRows.referenceTableId, id));
  let values: string[];
  if (filterColumn && filterValue) {
    values = rows.filter(r => { const data = r.data as Record<string, unknown>; return String(data[filterColumn]) === filterValue; })
      .map(r => String((r.data as Record<string, unknown>)[valueColumn ?? 'value'])).filter(Boolean);
  } else {
    values = rows.map(r => String((r.data as Record<string, unknown>)[valueColumn ?? 'value'])).filter(Boolean);
  }
  res.json({ values: [...new Set(values)] });
});

// GET /api/v1/reference-tables/:id/versions
router.get('/:id/versions', async (req: Request, res: Response) => {
  const { id } = req.params;
  const versions = await db.select().from(referenceTableVersions)
    .where(eq(referenceTableVersions.referenceTableId, id)).orderBy(referenceTableVersions.version);
  res.json({ versions });
});

export { router as referenceTableRoutes };
