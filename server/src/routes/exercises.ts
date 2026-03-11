import { Router } from 'express';
import type { Request, Response } from 'express';
import { eq, sql, and } from 'drizzle-orm';
import { db } from '../db/connection';
import { enrichmentExercises, exerciseColumns, userExerciseAssignments, enrichmentRecords } from '../db/schema';
import { authMiddleware, requireRole } from '../middleware/auth';
import type { ExerciseListItem, ColumnStat } from '@mapforge/shared';

const router = Router();

router.use(authMiddleware);

// GET /api/v1/exercises -- list exercises for the authenticated user
router.get('/', requireRole('user'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Find exercises assigned to this user
    const assignments = await db
      .select({ exerciseId: userExerciseAssignments.exerciseId })
      .from(userExerciseAssignments)
      .where(eq(userExerciseAssignments.userId, userId));

    if (assignments.length === 0) {
      res.json({ exercises: [] });
      return;
    }

    const exerciseIds = assignments.map((a) => a.exerciseId);

    const exercises: ExerciseListItem[] = [];

    for (const exerciseId of exerciseIds) {
      // Fetch exercise
      const [exercise] = await db
        .select()
        .from(enrichmentExercises)
        .where(eq(enrichmentExercises.id, exerciseId));

      if (!exercise) continue;

      // Fetch records stats
      const [stats] = await db
        .select({
          totalRecords: sql<number>`count(*)::int`,
          classifiedRecords: sql<number>`count(*) filter (where ${enrichmentRecords.isFullyClassified} = true)::int`,
          errorCount: sql<number>`count(*) filter (where jsonb_array_length(${enrichmentRecords.validationErrors}) > 0)::int`,
          newRecordCount: sql<number>`count(*) filter (where ${enrichmentRecords.recordState} = 'new')::int`,
        })
        .from(enrichmentRecords)
        .where(eq(enrichmentRecords.exerciseId, exerciseId));

      // Fetch classification columns for column stats
      const classificationCols = await db
        .select()
        .from(exerciseColumns)
        .where(
          and(
            eq(exerciseColumns.exerciseId, exerciseId),
            eq(exerciseColumns.columnRole, 'classification')
          )
        );

      // Compute column stats
      const columnStats: ColumnStat[] = [];
      for (const col of classificationCols) {
        const [colStat] = await db
          .select({
            totalCount: sql<number>`count(*)::int`,
            filledCount: sql<number>`count(*) filter (where (${enrichmentRecords.classifications}->>${sql.raw(`'${col.key}'`)}) is not null and (${enrichmentRecords.classifications}->>${sql.raw(`'${col.key}'`)}) != '')::int`,
          })
          .from(enrichmentRecords)
          .where(eq(enrichmentRecords.exerciseId, exerciseId));

        const total = colStat?.totalCount ?? 0;
        const filled = colStat?.filledCount ?? 0;
        columnStats.push({
          columnKey: col.key,
          label: col.label,
          filledCount: filled,
          totalCount: total,
          percentage: total > 0 ? Math.round((filled / total) * 100) : 0,
        });
      }

      // Find the most recent record update for lastUpdatedAt
      const totalRecords = stats?.totalRecords ?? 0;
      const classifiedRecords = stats?.classifiedRecords ?? 0;
      const newRecordCount = stats?.newRecordCount ?? 0;

      exercises.push({
        id: exercise.id,
        name: exercise.name,
        description: exercise.description ?? '',
        status: exercise.status as ExerciseListItem['status'],
        totalRecords,
        classifiedRecords,
        errorCount: stats?.errorCount ?? 0,
        lastUpdatedAt: exercise.updatedAt?.toISOString() ?? new Date().toISOString(),
        deadline: exercise.deadline ? String(exercise.deadline) : null,
        hasNewRecords: newRecordCount > 0,
        newRecordCount,
        columnStats,
      });
    }

    // Sort: errors first, then deadline ASC (nulls last), then name ASC
    exercises.sort((a, b) => {
      if (a.errorCount > 0 && b.errorCount === 0) return -1;
      if (a.errorCount === 0 && b.errorCount > 0) return 1;

      if (a.deadline && b.deadline) {
        const diff = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        if (diff !== 0) return diff;
      }
      if (a.deadline && !b.deadline) return -1;
      if (!a.deadline && b.deadline) return 1;

      return a.name.localeCompare(b.name);
    });

    res.json({ exercises });
  } catch (error) {
    console.error('Failed to fetch exercises:', error);
    res.status(500).json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } });
  }
});

// GET /api/v1/exercises/:id
// Returns ExerciseDetail with sourceColumns and classificationColumns
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  // TODO: Replace with real DB query using Drizzle ORM
  // For now, return a mock exercise detail
  res.json({
    id,
    name: 'Development Programming 2026',
    description: 'Classify development programming records',
    status: 'active',
    sourceColumns: [
      {
        id: 'sc1', key: 'siteId', label: 'Site ID', description: null,
        dataType: 'text', columnRole: 'source', required: false,
        defaultValue: null, config: {}, validationRules: [],
        referenceLink: null, dependentConfig: null, visible: true, ordinal: 0,
      },
      {
        id: 'sc2', key: 'programId', label: 'Program ID', description: null,
        dataType: 'text', columnRole: 'source', required: false,
        defaultValue: null, config: {}, validationRules: [],
        referenceLink: null, dependentConfig: null, visible: true, ordinal: 1,
      },
      {
        id: 'sc3', key: 'programName', label: 'Program Name', description: null,
        dataType: 'text', columnRole: 'source', required: false,
        defaultValue: null, config: {}, validationRules: [],
        referenceLink: null, dependentConfig: null, visible: true, ordinal: 2,
      },
    ],
    classificationColumns: [
      {
        id: 'cc1', key: 'sportCategory', label: 'Sport Category',
        description: 'Primary sport classification', dataType: 'picklist',
        columnRole: 'classification', required: true, defaultValue: null,
        config: { picklistValues: ['Girls Baseball', 'Girls Softball', 'Boys Baseball', 'T-Ball', 'Coach Pitch'] },
        validationRules: [], referenceLink: null, dependentConfig: null,
        visible: true, ordinal: 0,
      },
      {
        id: 'cc2', key: 'categorization', label: 'Categorization',
        description: 'Dependent on Sport Category', dataType: 'picklist',
        columnRole: 'classification', required: false, defaultValue: null,
        config: {},
        validationRules: [], referenceLink: null,
        dependentConfig: {
          parentColumnKey: 'sportCategory',
          referenceTableId: 'ref-table-1',
          parentReferenceColumn: 'sport',
          childReferenceColumn: 'category',
        },
        visible: true, ordinal: 1,
      },
    ],
    deadline: null,
    lastRefreshedAt: new Date().toISOString(),
  });
});

// GET /api/v1/exercises/:id/records
// Query params: page, pageSize, filter, search, sortColumn, sortDirection
// Returns PaginatedRecords
router.get('/:id/records', async (req: Request, res: Response) => {
  const { id } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 50;
  const filter = (req.query.filter as string) || 'all';
  const search = (req.query.search as string) || '';

  // TODO: Replace with real DB query
  // Mock records
  const allRecords = Array.from({ length: 10 }, (_, i) => ({
    id: `r${i + 1}`,
    uniqueKey: { siteId: `SITE-${100 + i}`, programId: `PRG-${200 + i}` },
    sourceData: {
      siteId: `SITE-${100 + i}`,
      programId: `PRG-${200 + i}`,
      programName: `Program ${i + 1}`,
    },
    classifications: i < 2
      ? { sportCategory: 'Girls Baseball', categorization: 'Travel' }
      : { sportCategory: null, categorization: null },
    recordState: i < 3 ? 'new' as const : 'existing' as const,
    validationErrors: i === 9
      ? [{ columnKey: 'sportCategory', severity: 'error' as const, message: 'Sport Category is required', ruleType: 'required' }]
      : [],
    isFullyClassified: i < 2,
  }));

  // Apply filter
  let filtered = allRecords;
  if (filter === 'unclassified') {
    filtered = allRecords.filter(r => !r.isFullyClassified);
  } else if (filter === 'classified') {
    filtered = allRecords.filter(r => r.isFullyClassified);
  } else if (filter === 'errors') {
    filtered = allRecords.filter(r => r.validationErrors.length > 0);
  } else if (filter === 'new') {
    filtered = allRecords.filter(r => r.recordState === 'new');
  }

  // Apply search
  if (search) {
    const lower = search.toLowerCase();
    filtered = filtered.filter(r =>
      Object.values(r.sourceData).some(v =>
        String(v).toLowerCase().includes(lower)
      )
    );
  }

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const records = filtered.slice(start, start + pageSize);

  const classifiedCount = allRecords.filter(r => r.isFullyClassified).length;

  res.json({
    records,
    total,
    page,
    pageSize,
    stats: {
      totalRecords: allRecords.length,
      classifiedRecords: classifiedCount,
      unclassifiedRecords: allRecords.length - classifiedCount,
      errorCount: allRecords.filter(r => r.validationErrors.length > 0).length,
      warningCount: 0,
      newRecordCount: allRecords.filter(r => r.recordState === 'new').length,
      completionPercentage: Math.round((classifiedCount / allRecords.length) * 100),
      columnStats: [
        { columnKey: 'sportCategory', label: 'Sport Category', filledCount: classifiedCount, totalCount: allRecords.length, percentage: Math.round((classifiedCount / allRecords.length) * 100) },
        { columnKey: 'categorization', label: 'Categorization', filledCount: classifiedCount, totalCount: allRecords.length, percentage: Math.round((classifiedCount / allRecords.length) * 100) },
      ],
    },
  });
});

// PUT /api/v1/exercises/:id/records/:recordId/classify
// Body: ClassificationPayload
// Returns ClassificationResult
router.put('/:id/records/:recordId/classify', async (req: Request, res: Response) => {
  const { recordId } = req.params;
  const { values } = req.body;

  // TODO: Replace with real DB upsert
  // Mock: validate and return result
  const validationErrors: Array<{ columnKey: string; severity: string; message: string; ruleType: string }> = [];

  // Check required fields
  for (const v of values) {
    if (v.columnKey === 'sportCategory' && (!v.value || v.value === '')) {
      validationErrors.push({
        columnKey: 'sportCategory',
        severity: 'error',
        message: 'Sport Category is required',
        ruleType: 'required',
      });
    }
  }

  const isFullyClassified = values.length > 0 && validationErrors.length === 0;

  res.json({
    validationErrors,
    isFullyClassified,
    updatedStats: {
      totalRecords: 10,
      classifiedRecords: 3,
      unclassifiedRecords: 7,
      errorCount: validationErrors.length > 0 ? 1 : 0,
      warningCount: 0,
      newRecordCount: 3,
      completionPercentage: 30,
      columnStats: [],
    },
  });
});

// POST /api/v1/exercises/:id/records/bulk-classify
// Body: BulkClassificationPayload
// Returns BulkClassificationResult
router.post('/:id/records/bulk-classify', async (req: Request, res: Response) => {
  const { recordIds, values } = req.body;

  // TODO: Replace with real DB batch operation
  res.json({
    updatedCount: recordIds.length,
    errors: [],
    updatedStats: {
      totalRecords: 10,
      classifiedRecords: recordIds.length + 2,
      unclassifiedRecords: 10 - recordIds.length - 2,
      errorCount: 0,
      warningCount: 0,
      newRecordCount: 3,
      completionPercentage: Math.round(((recordIds.length + 2) / 10) * 100),
      columnStats: [],
    },
  });
});

// GET /api/v1/exercises/:id/records/export
// Streams CSV
router.get('/:id/records/export', async (req: Request, res: Response) => {
  const { id } = req.params;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="exercise-${id}-records.csv"`);

  // TODO: Replace with real DB stream
  res.write('siteId,programId,programName,sportCategory,categorization,status\n');
  res.write('SITE-100,PRG-200,Program 1,Girls Baseball,Travel,classified\n');
  res.write('SITE-101,PRG-201,Program 2,Girls Baseball,Travel,classified\n');
  res.end();
});

// GET /api/v1/exercises/:id/stats
router.get('/:id/stats', async (req: Request, res: Response) => {
  res.json({
    totalRecords: 10,
    classifiedRecords: 2,
    unclassifiedRecords: 8,
    errorCount: 1,
    warningCount: 0,
    newRecordCount: 3,
    completionPercentage: 20,
    columnStats: [],
  });
});

// POST /api/v1/exercises/:id/refresh -- trigger manual data refresh
router.post('/:id/refresh', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { syncExerciseData } = await import('../services/source-sync');
    const result = await syncExerciseData(id);
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    console.error('Sync error:', error);
    res.status(500).json({ error: message });
  }
});

export { router as exercisesRouter };
