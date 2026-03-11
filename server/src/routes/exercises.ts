import { Router } from 'express';
import type { Request, Response } from 'express';
import { eq, sql, and, asc, desc } from 'drizzle-orm';
import { db } from '../db/connection';
import { enrichmentExercises, exerciseColumns, userExerciseAssignments, enrichmentRecords, classificationHistory, bigquerySources } from '../db/schema';
import { authMiddleware, requireRole } from '../middleware/auth';
import type { ExerciseListItem, ColumnStat, CellError } from '@mapforge/shared';

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
  try {
    const { id } = req.params;

    const [exercise] = await db.select().from(enrichmentExercises).where(eq(enrichmentExercises.id, id));
    if (!exercise) {
      res.status(404).json({ error: { message: 'Exercise not found', code: 'NOT_FOUND' } });
      return;
    }

    const columns = await db.select().from(exerciseColumns)
      .where(eq(exerciseColumns.exerciseId, id))
      .orderBy(asc(exerciseColumns.ordinal));

    const mapColumn = (col: typeof columns[number]) => ({
      id: col.id,
      key: col.key,
      label: col.label,
      description: col.description ?? null,
      dataType: col.dataType,
      columnRole: col.columnRole,
      required: col.required ?? false,
      defaultValue: col.defaultValue ?? null,
      config: col.config ?? {},
      validationRules: col.validationRules ?? [],
      referenceLink: col.referenceLink ?? null,
      dependentConfig: col.dependentConfig ?? null,
      visible: col.visible ?? true,
      ordinal: col.ordinal,
    });

    const sourceColumns = columns.filter(c => c.columnRole === 'source').map(mapColumn);
    const classificationColumns = columns.filter(c => c.columnRole === 'classification').map(mapColumn);

    // Get last refreshed time from bigquery source if available
    const [source] = await db.select({ lastRefreshedAt: bigquerySources.lastRefreshedAt })
      .from(bigquerySources).where(eq(bigquerySources.exerciseId, id));

    res.json({
      id: exercise.id,
      name: exercise.name,
      description: exercise.description ?? '',
      status: exercise.status,
      sourceColumns,
      classificationColumns,
      deadline: exercise.deadline ? String(exercise.deadline) : null,
      lastRefreshedAt: source?.lastRefreshedAt?.toISOString() ?? exercise.updatedAt?.toISOString() ?? new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch exercise detail:', error);
    res.status(500).json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } });
  }
});

// GET /api/v1/exercises/:id/records
// Query params: page, pageSize, filter, search, sortColumn, sortDirection
// Returns PaginatedRecords
router.get('/:id/records', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 50, 200);
    const filter = (req.query.filter as string) || 'all';
    const search = (req.query.search as string) || '';
    const sortColumn = (req.query.sortColumn as string) || '';
    const sortDirection = (req.query.sortDirection as string) === 'desc' ? 'desc' : 'asc';
    const offset = (page - 1) * pageSize;

    // Build filter conditions
    const conditions = [eq(enrichmentRecords.exerciseId, id)];
    if (filter === 'unclassified') conditions.push(eq(enrichmentRecords.isFullyClassified, false));
    else if (filter === 'classified') conditions.push(eq(enrichmentRecords.isFullyClassified, true));
    else if (filter === 'errors') conditions.push(sql`jsonb_array_length(${enrichmentRecords.validationErrors}) > 0`);
    else if (filter === 'new') conditions.push(eq(enrichmentRecords.recordState, 'new'));

    // Search across source_data JSONB text representation
    if (search) {
      conditions.push(sql`${enrichmentRecords.sourceData}::text ILIKE ${'%' + search + '%'}`);
    }

    const whereClause = and(...conditions);

    // Get filtered records with pagination
    let query = db.select().from(enrichmentRecords).where(whereClause!);

    // Apply sorting
    if (sortColumn) {
      const sortFn = sortDirection === 'desc' ? desc : asc;
      if (sortColumn === 'recordState') {
        query = query.orderBy(sortFn(enrichmentRecords.recordState)) as typeof query;
      } else if (sortColumn === 'isFullyClassified') {
        query = query.orderBy(sortFn(enrichmentRecords.isFullyClassified)) as typeof query;
      } else {
        // Sort by a source_data or classifications key
        query = query.orderBy(sql`${enrichmentRecords.sourceData}->>${sql.raw(`'${sortColumn}'`)} ${sql.raw(sortDirection)}`) as typeof query;
      }
    } else {
      query = query.orderBy(asc(enrichmentRecords.createdAt)) as typeof query;
    }

    const records = await query.limit(pageSize).offset(offset);

    // Get total count for filtered results
    const [countResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(enrichmentRecords).where(whereClause!);
    const total = countResult?.count ?? 0;

    // Get overall stats (unfiltered for this exercise)
    const [stats] = await db.select({
      totalRecords: sql<number>`count(*)::int`,
      classifiedRecords: sql<number>`count(*) filter (where ${enrichmentRecords.isFullyClassified} = true)::int`,
      errorCount: sql<number>`count(*) filter (where jsonb_array_length(${enrichmentRecords.validationErrors}) > 0)::int`,
      warningCount: sql<number>`0::int`,
      newRecordCount: sql<number>`count(*) filter (where ${enrichmentRecords.recordState} = 'new')::int`,
    }).from(enrichmentRecords).where(eq(enrichmentRecords.exerciseId, id));

    const totalRecords = stats?.totalRecords ?? 0;
    const classifiedRecords = stats?.classifiedRecords ?? 0;

    // Get classification column stats
    const classificationCols = await db.select().from(exerciseColumns)
      .where(and(eq(exerciseColumns.exerciseId, id), eq(exerciseColumns.columnRole, 'classification')));

    const columnStats: ColumnStat[] = [];
    for (const col of classificationCols) {
      const [colStat] = await db.select({
        totalCount: sql<number>`count(*)::int`,
        filledCount: sql<number>`count(*) filter (where (${enrichmentRecords.classifications}->>${sql.raw(`'${col.key}'`)}) is not null and (${enrichmentRecords.classifications}->>${sql.raw(`'${col.key}'`)}) != '')::int`,
      }).from(enrichmentRecords).where(eq(enrichmentRecords.exerciseId, id));

      const colTotal = colStat?.totalCount ?? 0;
      const filled = colStat?.filledCount ?? 0;
      columnStats.push({
        columnKey: col.key, label: col.label, filledCount: filled, totalCount: colTotal,
        percentage: colTotal > 0 ? Math.round((filled / colTotal) * 100) : 0,
      });
    }

    const mappedRecords = records.map(r => ({
      id: r.id,
      uniqueKey: r.uniqueKey as Record<string, string>,
      sourceData: r.sourceData as Record<string, unknown>,
      classifications: r.classifications as Record<string, string | null>,
      recordState: r.recordState as 'new' | 'existing' | 'changed' | 'removed',
      validationErrors: r.validationErrors as CellError[],
      isFullyClassified: r.isFullyClassified,
    }));

    res.json({
      records: mappedRecords,
      total,
      page,
      pageSize,
      stats: {
        totalRecords,
        classifiedRecords,
        unclassifiedRecords: totalRecords - classifiedRecords,
        errorCount: stats?.errorCount ?? 0,
        warningCount: 0,
        newRecordCount: stats?.newRecordCount ?? 0,
        completionPercentage: totalRecords > 0 ? Math.round((classifiedRecords / totalRecords) * 100) : 0,
        columnStats,
      },
    });
  } catch (error) {
    console.error('Failed to fetch records:', error);
    res.status(500).json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } });
  }
});

// PUT /api/v1/exercises/:id/records/:recordId/classify
// Body: ClassificationPayload
// Returns ClassificationResult
router.put('/:id/records/:recordId/classify', async (req: Request, res: Response) => {
  try {
    const { id, recordId } = req.params;
    const { values } = req.body as { values: Array<{ columnKey: string; value: string | null }> };
    const userId = req.user!.id;

    // Fetch the record
    const [record] = await db.select().from(enrichmentRecords)
      .where(and(eq(enrichmentRecords.id, recordId), eq(enrichmentRecords.exerciseId, id)));
    if (!record) {
      res.status(404).json({ error: { message: 'Record not found', code: 'NOT_FOUND' } });
      return;
    }

    // Fetch classification columns with their validation rules
    const classificationCols = await db.select().from(exerciseColumns)
      .where(and(eq(exerciseColumns.exerciseId, id), eq(exerciseColumns.columnRole, 'classification')));

    const colByKey = new Map(classificationCols.map(c => [c.key, c]));

    // Build updated classifications
    const currentClassifications = (record.classifications ?? {}) as Record<string, string | null>;
    const updatedClassifications = { ...currentClassifications };
    for (const v of values) {
      updatedClassifications[v.columnKey] = v.value;
    }

    // Validate required fields
    const validationErrors: CellError[] = [];
    for (const col of classificationCols) {
      if (col.required) {
        const val = updatedClassifications[col.key];
        if (!val || val === '') {
          validationErrors.push({
            columnKey: col.key,
            severity: 'error',
            message: `${col.label} is required`,
            ruleType: 'required',
          });
        }
      }
    }

    // Check if all required classification columns are filled
    const isFullyClassified = classificationCols.every(col => {
      const val = updatedClassifications[col.key];
      if (col.required) return val != null && val !== '';
      return true;
    }) && validationErrors.length === 0;

    // Update the record
    await db.update(enrichmentRecords).set({
      classifications: updatedClassifications,
      validationErrors,
      isFullyClassified,
      updatedAt: new Date(),
    }).where(eq(enrichmentRecords.id, recordId));

    // Insert classification history entries
    for (const v of values) {
      const col = colByKey.get(v.columnKey);
      if (col) {
        await db.insert(classificationHistory).values({
          recordId: record.id,
          columnId: col.id,
          oldValue: currentClassifications[v.columnKey] ?? null,
          newValue: v.value,
          changedBy: userId,
        });
      }
    }

    // Fetch updated stats
    const [stats] = await db.select({
      totalRecords: sql<number>`count(*)::int`,
      classifiedRecords: sql<number>`count(*) filter (where ${enrichmentRecords.isFullyClassified} = true)::int`,
      errorCount: sql<number>`count(*) filter (where jsonb_array_length(${enrichmentRecords.validationErrors}) > 0)::int`,
      newRecordCount: sql<number>`count(*) filter (where ${enrichmentRecords.recordState} = 'new')::int`,
    }).from(enrichmentRecords).where(eq(enrichmentRecords.exerciseId, id));

    const totalRecords = stats?.totalRecords ?? 0;
    const classifiedRecords = stats?.classifiedRecords ?? 0;

    res.json({
      validationErrors,
      isFullyClassified,
      updatedStats: {
        totalRecords,
        classifiedRecords,
        unclassifiedRecords: totalRecords - classifiedRecords,
        errorCount: stats?.errorCount ?? 0,
        warningCount: 0,
        newRecordCount: stats?.newRecordCount ?? 0,
        completionPercentage: totalRecords > 0 ? Math.round((classifiedRecords / totalRecords) * 100) : 0,
        columnStats: [],
      },
    });
  } catch (error) {
    console.error('Failed to classify record:', error);
    res.status(500).json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } });
  }
});

// POST /api/v1/exercises/:id/records/bulk-classify
// Body: BulkClassificationPayload
// Returns BulkClassificationResult
router.post('/:id/records/bulk-classify', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { recordIds, values } = req.body as {
      recordIds: string[];
      values: Array<{ columnKey: string; value: string | null }>;
    };
    const userId = req.user!.id;

    // Fetch classification columns for validation
    const classificationCols = await db.select().from(exerciseColumns)
      .where(and(eq(exerciseColumns.exerciseId, id), eq(exerciseColumns.columnRole, 'classification')));
    const colByKey = new Map(classificationCols.map(c => [c.key, c]));

    const bulkOperationId = crypto.randomUUID();
    let updatedCount = 0;
    const errors: Array<{ recordId: string; errors: CellError[] }> = [];

    for (const recordId of recordIds) {
      const [record] = await db.select().from(enrichmentRecords)
        .where(and(eq(enrichmentRecords.id, recordId), eq(enrichmentRecords.exerciseId, id)));
      if (!record) {
        errors.push({ recordId, errors: [{ columnKey: '', severity: 'error', message: 'Record not found', ruleType: 'system' }] });
        continue;
      }

      const currentClassifications = (record.classifications ?? {}) as Record<string, string | null>;
      const updatedClassifications = { ...currentClassifications };
      for (const v of values) {
        updatedClassifications[v.columnKey] = v.value;
      }

      // Validate
      const recordErrors: CellError[] = [];
      for (const col of classificationCols) {
        if (col.required) {
          const val = updatedClassifications[col.key];
          if (!val || val === '') {
            recordErrors.push({ columnKey: col.key, severity: 'error', message: `${col.label} is required`, ruleType: 'required' });
          }
        }
      }

      const isFullyClassified = classificationCols.every(col => {
        const val = updatedClassifications[col.key];
        if (col.required) return val != null && val !== '';
        return true;
      }) && recordErrors.length === 0;

      await db.update(enrichmentRecords).set({
        classifications: updatedClassifications,
        validationErrors: recordErrors,
        isFullyClassified,
        updatedAt: new Date(),
      }).where(eq(enrichmentRecords.id, recordId));

      // Insert history
      for (const v of values) {
        const col = colByKey.get(v.columnKey);
        if (col) {
          await db.insert(classificationHistory).values({
            recordId,
            columnId: col.id,
            oldValue: currentClassifications[v.columnKey] ?? null,
            newValue: v.value,
            changedBy: userId,
            bulkOperationId,
          });
        }
      }

      if (recordErrors.length > 0) {
        errors.push({ recordId, errors: recordErrors });
      }
      updatedCount++;
    }

    // Fetch updated stats
    const [stats] = await db.select({
      totalRecords: sql<number>`count(*)::int`,
      classifiedRecords: sql<number>`count(*) filter (where ${enrichmentRecords.isFullyClassified} = true)::int`,
      errorCount: sql<number>`count(*) filter (where jsonb_array_length(${enrichmentRecords.validationErrors}) > 0)::int`,
      newRecordCount: sql<number>`count(*) filter (where ${enrichmentRecords.recordState} = 'new')::int`,
    }).from(enrichmentRecords).where(eq(enrichmentRecords.exerciseId, id));

    const totalRecords = stats?.totalRecords ?? 0;
    const classifiedRecords = stats?.classifiedRecords ?? 0;

    res.json({
      updatedCount,
      errors,
      updatedStats: {
        totalRecords,
        classifiedRecords,
        unclassifiedRecords: totalRecords - classifiedRecords,
        errorCount: stats?.errorCount ?? 0,
        warningCount: 0,
        newRecordCount: stats?.newRecordCount ?? 0,
        completionPercentage: totalRecords > 0 ? Math.round((classifiedRecords / totalRecords) * 100) : 0,
        columnStats: [],
      },
    });
  } catch (error) {
    console.error('Failed to bulk classify:', error);
    res.status(500).json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } });
  }
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
    const id = req.params.id as string;
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
