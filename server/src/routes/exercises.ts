import { Router } from 'express';
import type { Request, Response } from 'express';
import { eq, sql, and, asc, desc, inArray } from 'drizzle-orm';
import { db } from '../db/connection';
import { enrichmentExercises, exerciseColumns, userExerciseAssignments, enrichmentRecords, classificationHistory, bigquerySources, users, assignmentPermissions } from '../db/schema';
import { authMiddleware, requireRole } from '../middleware/auth';
import type { ExerciseListItem, ColumnStat, CellError } from '@mapforge/shared';

const router = Router();

router.use(authMiddleware);

// GET /api/v1/exercises -- list exercises for the authenticated user
router.get('/', requireRole('user', 'admin'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const isAdmin = req.user!.role === 'admin';

    let exerciseIds: string[];

    if (isAdmin) {
      // Admin sees all exercises in their org
      const orgExercises = await db
        .select({ id: enrichmentExercises.id })
        .from(enrichmentExercises)
        .where(eq(enrichmentExercises.orgId, req.user!.orgId));
      exerciseIds = orgExercises.map((e) => e.id);
    } else {
      // Regular users see only assigned exercises
      const assignments = await db
        .select({ exerciseId: userExerciseAssignments.exerciseId })
        .from(userExerciseAssignments)
        .where(eq(userExerciseAssignments.userId, userId));
      exerciseIds = assignments.map((a) => a.exerciseId);
    }

    if (exerciseIds.length === 0) {
      res.json({ exercises: [] });
      return;
    }

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

    const userRole = req.user!.role;
    let permissionColumnKeys: Set<string> | null = null;

    if (userRole !== 'admin') {
      const { getUserPermissions, buildRowFilterSql } = await import('../services/permission-filter');
      const perms = await getUserPermissions(req.user!.id, id);

      if (!perms) {
        res.status(403).json({ error: { message: 'Not assigned to this exercise', code: 'FORBIDDEN' } });
        return;
      }

      // Apply row filter
      if (perms.rowFilter) {
        const { validateFilterColumns } = await import('../services/permission-filter');
        const invalid = await validateFilterColumns(id, perms.rowFilter as any);
        if (invalid.length === 0) {
          const filterSql = buildRowFilterSql(perms.rowFilter as any);
          if (filterSql) conditions.push(filterSql);
        }
      }

      // Apply manual overrides
      if (perms.manualRowOverrides) {
        const overrides = perms.manualRowOverrides as any;
        if (overrides.exclude?.length > 0) {
          conditions.push(sql`${enrichmentRecords.id} != ALL(${overrides.exclude}::uuid[])`);
        }
      }

      // Resolve allowed columns
      if (perms.allowedColumnIds) {
        const allowedCols = await db.select({ key: exerciseColumns.key })
          .from(exerciseColumns)
          .where(inArray(exerciseColumns.id, perms.allowedColumnIds as string[]));
        permissionColumnKeys = new Set(allowedCols.map(c => c.key));
      }
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

    const mappedRecords = records.map(r => {
      let sourceData = r.sourceData as Record<string, unknown>;
      let classifications = r.classifications as Record<string, string | null>;

      if (permissionColumnKeys) {
        const { stripDisallowedColumns } = require('../services/permission-filter');
        const allColumnKeys = new Set([
          ...Object.keys(sourceData),
          ...Object.keys(classifications),
        ]);
        const stripped = stripDisallowedColumns(
          { sourceData, classifications },
          permissionColumnKeys,
          allColumnKeys
        );
        sourceData = stripped.sourceData;
        classifications = stripped.classifications;
      }

      return {
        id: r.id,
        uniqueKey: r.uniqueKey as Record<string, string>,
        sourceData,
        classifications,
        recordState: r.recordState as 'new' | 'existing' | 'changed' | 'removed',
        validationErrors: r.validationErrors as CellError[],
        isFullyClassified: r.isFullyClassified,
      };
    });

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

    if (req.user!.role !== 'admin') {
      const { getUserPermissions } = await import('../services/permission-filter');
      const perms = await getUserPermissions(req.user!.id, id);

      if (!perms || perms.role !== 'editor') {
        res.status(403).json({ error: { message: 'Not authorized to classify records', code: 'FORBIDDEN' } });
        return;
      }

      if (perms.allowedColumnIds) {
        const allowedCols = await db.select({ key: exerciseColumns.key })
          .from(exerciseColumns)
          .where(inArray(exerciseColumns.id, perms.allowedColumnIds as string[]));
        const allowedKeys = new Set(allowedCols.map(c => c.key));
        const disallowed = values.filter((v: any) => !allowedKeys.has(v.columnKey));
        if (disallowed.length > 0) {
          res.status(403).json({ error: { message: `Not authorized to edit columns: ${disallowed.map((d: any) => d.columnKey).join(', ')}`, code: 'FORBIDDEN' } });
          return;
        }
      }
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

    if (req.user!.role !== 'admin') {
      const { getUserPermissions } = await import('../services/permission-filter');
      const perms = await getUserPermissions(req.user!.id, id);

      if (!perms || perms.role !== 'editor') {
        res.status(403).json({ error: { message: 'Not authorized to classify records', code: 'FORBIDDEN' } });
        return;
      }

      if (perms.allowedColumnIds) {
        const allowedCols = await db.select({ key: exerciseColumns.key })
          .from(exerciseColumns)
          .where(inArray(exerciseColumns.id, perms.allowedColumnIds as string[]));
        const allowedKeys = new Set(allowedCols.map(c => c.key));
        const disallowed = values.filter((v: any) => !allowedKeys.has(v.columnKey));
        if (disallowed.length > 0) {
          res.status(403).json({ error: { message: `Not authorized to edit columns: ${disallowed.map((d: any) => d.columnKey).join(', ')}`, code: 'FORBIDDEN' } });
          return;
        }
      }
    }

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

// POST /api/v1/exercises -- create a new exercise
router.post('/', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { name, description, viewMode, uniqueKeyColumns } = req.body;
    if (!name) { res.status(400).json({ error: 'Name is required' }); return; }
    const [exercise] = await db.insert(enrichmentExercises).values({
      name,
      description: description || null,
      viewMode: viewMode || 'flat',
      uniqueKeyColumns: uniqueKeyColumns || [],
      createdBy: req.user!.id,
    }).returning();
    res.status(201).json({ id: exercise.id, name: exercise.name, status: exercise.status });
  } catch (error) {
    console.error('Create exercise error:', error);
    res.status(500).json({ error: 'Failed to create exercise' });
  }
});

// PUT /api/v1/exercises/:id -- update exercise metadata
router.put('/:id', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates: Record<string, unknown> = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.viewMode !== undefined) updates.viewMode = req.body.viewMode;
    if (req.body.uniqueKeyColumns !== undefined) updates.uniqueKeyColumns = req.body.uniqueKeyColumns;
    if (req.body.deadline !== undefined) updates.deadline = req.body.deadline;
    updates.updatedAt = new Date();
    await db.update(enrichmentExercises).set(updates).where(eq(enrichmentExercises.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error('Update exercise error:', error);
    res.status(500).json({ error: 'Failed to update exercise' });
  }
});

// POST /api/v1/exercises/:id/publish -- transition draft to active
router.post('/:id/publish', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [exercise] = await db.select().from(enrichmentExercises).where(eq(enrichmentExercises.id, id));
    if (!exercise) { res.status(404).json({ error: 'Exercise not found' }); return; }
    if (exercise.status !== 'draft') { res.status(400).json({ error: `Cannot publish exercise in ${exercise.status} status` }); return; }

    await db.update(enrichmentExercises).set({ status: 'active', updatedAt: new Date() }).where(eq(enrichmentExercises.id, id));

    let syncResult = null;
    try {
      const { syncExerciseData } = await import('../services/source-sync');
      syncResult = await syncExerciseData(id);
    } catch (syncError) { console.error('Initial sync failed:', syncError); }

    try {
      const [source] = await db.select().from(bigquerySources).where(eq(bigquerySources.exerciseId, id));
      if (source?.refreshSchedule) {
        const { scheduleSync } = await import('../services/sync-scheduler');
        scheduleSync(id, source.refreshSchedule);
      }
    } catch (scheduleError) { console.error('Failed to register sync schedule:', scheduleError); }

    res.json({ status: 'active', syncResult });
  } catch (error) {
    console.error('Publish error:', error);
    res.status(500).json({ error: 'Failed to publish exercise' });
  }
});

// POST /api/v1/exercises/:id/columns -- bulk add/replace columns
router.post('/:id/columns', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { columns } = req.body as { columns: Array<Record<string, unknown>> };
    if (!Array.isArray(columns)) { res.status(400).json({ error: 'columns array is required' }); return; }

    // Delete existing columns for this exercise
    await db.delete(exerciseColumns).where(eq(exerciseColumns.exerciseId, id));

    // Insert new columns
    const inserted = [];
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const [row] = await db.insert(exerciseColumns).values({
        exerciseId: id,
        key: col.key as string,
        label: col.label as string,
        description: (col.description as string) || null,
        dataType: col.dataType as string,
        ordinal: (col.ordinal as number) ?? i,
        columnRole: col.columnRole as string,
        required: (col.required as boolean) ?? false,
        defaultValue: (col.defaultValue as string) || null,
        config: col.config ?? {},
        validationRules: col.validationRules ?? [],
        referenceLink: col.referenceLink ?? null,
        dependentConfig: col.dependentConfig ?? null,
        visible: (col.visible as boolean) ?? true,
      }).returning();
      inserted.push(row);
    }

    res.json({ columns: inserted });
  } catch (error) {
    console.error('Save columns error:', error);
    res.status(500).json({ error: 'Failed to save columns' });
  }
});

// PUT /api/v1/exercises/:id/columns/:colId -- update a single column
router.put('/:id/columns/:colId', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { colId } = req.params;
    const updates: Record<string, unknown> = {};
    const fields = ['key', 'label', 'description', 'dataType', 'ordinal', 'columnRole', 'required', 'defaultValue', 'config', 'validationRules', 'referenceLink', 'dependentConfig', 'visible'];
    for (const field of fields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    await db.update(exerciseColumns).set(updates).where(eq(exerciseColumns.id, colId));
    res.json({ success: true });
  } catch (error) {
    console.error('Update column error:', error);
    res.status(500).json({ error: 'Failed to update column' });
  }
});

// DELETE /api/v1/exercises/:id/columns/:colId -- delete a column with impact count
router.delete('/:id/columns/:colId', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id, colId } = req.params;

    // Get the column key before deleting
    const [col] = await db.select({ key: exerciseColumns.key }).from(exerciseColumns).where(eq(exerciseColumns.id, colId));
    if (!col) {
      res.status(404).json({ error: 'Column not found' });
      return;
    }

    // Count affected records (those with non-null value for this column key)
    const [impact] = await db.select({
      affectedRecords: sql<number>`count(*) filter (where (${enrichmentRecords.classifications}->>${col.key}) is not null and (${enrichmentRecords.classifications}->>${col.key}) != '')::int`,
    }).from(enrichmentRecords).where(eq(enrichmentRecords.exerciseId, id));

    // Delete the column
    await db.delete(exerciseColumns).where(eq(exerciseColumns.id, colId));

    // Async cleanup: remove orphaned key from enrichment_records classifications JSONB
    const columnKey = col.key;
    setImmediate(async () => {
      try {
        await db.execute(
          sql`UPDATE enrichment_records SET classifications = classifications - ${columnKey} WHERE exercise_id = ${id}::uuid`
        );
        console.log(`[Cleanup] Removed classification key "${columnKey}" from exercise ${id}`);
      } catch (err) {
        console.error(`[Cleanup] Failed to remove key "${columnKey}":`, err);
      }
    });

    res.json({ success: true, affectedRecords: impact?.affectedRecords ?? 0 });
  } catch (error) {
    console.error('Delete column error:', error);
    res.status(500).json({ error: 'Failed to delete column' });
  }
});

// GET /api/v1/exercises/:id/assignments -- list assignments with user info
router.get('/:id/assignments', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const assignments = await db
      .select({
        id: userExerciseAssignments.id,
        userId: userExerciseAssignments.userId,
        role: userExerciseAssignments.role,
        assignedAt: userExerciseAssignments.assignedAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(userExerciseAssignments)
      .innerJoin(users, eq(userExerciseAssignments.userId, users.id))
      .where(eq(userExerciseAssignments.exerciseId, id));
    res.json({ assignments });
  } catch (error) {
    console.error('Fetch assignments error:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// POST /api/v1/exercises/:id/assignments -- add user assignment
router.post('/:id/assignments', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.body;
    if (!userId) { res.status(400).json({ error: 'userId is required' }); return; }
    const [assignment] = await db.insert(userExerciseAssignments).values({
      userId,
      exerciseId: id,
      role: role || 'editor',
      assignedBy: req.user!.id,
    }).returning();
    res.status(201).json(assignment);
  } catch (error) {
    console.error('Add assignment error:', error);
    res.status(500).json({ error: 'Failed to add assignment' });
  }
});

// DELETE /api/v1/exercises/:id/assignments/:assignmentId -- remove assignment
router.delete('/:id/assignments/:assignmentId', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { assignmentId } = req.params;
    await db.delete(userExerciseAssignments).where(eq(userExerciseAssignments.id, assignmentId));
    res.json({ success: true });
  } catch (error) {
    console.error('Remove assignment error:', error);
    res.status(500).json({ error: 'Failed to remove assignment' });
  }
});

// POST /api/v1/exercises/:id/source-config -- save BigQuery source config (upsert)
router.post('/:id/source-config', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { gcpProject, dataset, tableOrQuery, queryType, credentialId, refreshSchedule } = req.body;
    if (!gcpProject || !dataset || !tableOrQuery || !queryType) {
      res.status(400).json({ error: 'gcpProject, dataset, tableOrQuery, and queryType are required' });
      return;
    }

    // Check if source config already exists
    const [existing] = await db.select().from(bigquerySources).where(eq(bigquerySources.exerciseId, id));
    if (existing) {
      await db.update(bigquerySources).set({
        gcpProject, dataset, tableOrQuery, queryType,
        credentialId: credentialId || null,
        refreshSchedule: refreshSchedule || null,
        updatedAt: new Date(),
      }).where(eq(bigquerySources.id, existing.id));
    } else {
      await db.insert(bigquerySources).values({
        exerciseId: id, gcpProject, dataset, tableOrQuery, queryType,
        credentialId: credentialId || null,
        refreshSchedule: refreshSchedule || null,
      });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Save source config error:', error);
    res.status(500).json({ error: 'Failed to save source config' });
  }
});

// GET /api/v1/exercises/:id/source-config -- fetch BigQuery source config
router.get('/:id/source-config', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [source] = await db.select().from(bigquerySources).where(eq(bigquerySources.exerciseId, id));
    if (!source) {
      res.json({ sourceConfig: null });
      return;
    }
    res.json({
      sourceConfig: {
        gcpProject: source.gcpProject,
        dataset: source.dataset,
        tableOrQuery: source.tableOrQuery,
        queryType: source.queryType,
        credentialId: source.credentialId,
        refreshSchedule: source.refreshSchedule,
      },
    });
  } catch (error) {
    console.error('Fetch source config error:', error);
    res.status(500).json({ error: 'Failed to fetch source config' });
  }
});

// PUT /api/v1/exercises/:id/status -- transition exercise status
router.put('/:id/status', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status: newStatus } = req.body;

    const [exercise] = await db.select().from(enrichmentExercises).where(eq(enrichmentExercises.id, id));
    if (!exercise) {
      res.status(404).json({ error: 'Exercise not found' });
      return;
    }

    const transitions: Record<string, string[]> = {
      draft: ['active'],
      active: ['paused', 'completed', 'archived'],
      paused: ['active'],
      completed: ['archived'],
      archived: [],
    };

    const allowed = transitions[exercise.status] || [];
    if (!allowed.includes(newStatus)) {
      res.status(400).json({
        error: `Cannot transition from "${exercise.status}" to "${newStatus}". Allowed: ${allowed.join(', ') || 'none'}`,
      });
      return;
    }

    await db.update(enrichmentExercises).set({ status: newStatus, updatedAt: new Date() }).where(eq(enrichmentExercises.id, id));
    res.json({ status: newStatus });
  } catch (error) {
    console.error('Status transition error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// PUT /api/v1/exercises/:id/assignments/:assignmentId -- update assignment role
router.put('/:id/assignments/:assignmentId', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { assignmentId } = req.params;
    const { role } = req.body;

    if (!role || !['editor', 'viewer'].includes(role)) {
      res.status(400).json({ error: 'role must be "editor" or "viewer"' });
      return;
    }

    await db.update(userExerciseAssignments).set({ role }).where(eq(userExerciseAssignments.id, assignmentId));
    res.json({ success: true });
  } catch (error) {
    console.error('Update assignment error:', error);
    res.status(500).json({ error: 'Failed to update assignment' });
  }
});

// POST /api/v1/exercises/:id/assignments/bulk -- bulk assign users
router.post('/:id/assignments/bulk', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { users: usersToAssign } = req.body as { users: Array<{ userId: string; role: string }> };

    if (!Array.isArray(usersToAssign) || usersToAssign.length === 0) {
      res.status(400).json({ error: 'users array is required' });
      return;
    }

    // Find existing assignments
    const existing = await db
      .select({ userId: userExerciseAssignments.userId })
      .from(userExerciseAssignments)
      .where(eq(userExerciseAssignments.exerciseId, id));
    const existingUserIds = new Set(existing.map(a => a.userId));

    const created: Array<Record<string, unknown>> = [];
    const skipped: Array<{ userId: string; reason: string }> = [];

    for (const user of usersToAssign) {
      if (existingUserIds.has(user.userId)) {
        skipped.push({ userId: user.userId, reason: 'already assigned' });
        continue;
      }

      const [assignment] = await db.insert(userExerciseAssignments).values({
        userId: user.userId,
        exerciseId: id,
        role: user.role || 'editor',
        assignedBy: req.user!.id,
      }).returning();

      created.push(assignment);
    }

    res.status(201).json({ created, skipped });
  } catch (error) {
    console.error('Bulk assign error:', error);
    res.status(500).json({ error: 'Failed to bulk assign' });
  }
});

// GET /api/v1/exercises/:id/assignments/:assignmentId/permissions
router.get('/:id/assignments/:assignmentId/permissions', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { assignmentId } = req.params;
    const [perms] = await db
      .select()
      .from(assignmentPermissions)
      .where(eq(assignmentPermissions.assignmentId, assignmentId));

    res.json({ permissions: perms || null });
  } catch (error) {
    console.error('Fetch permissions error:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

// PUT /api/v1/exercises/:id/assignments/:assignmentId/permissions
router.put('/:id/assignments/:assignmentId/permissions', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id, assignmentId } = req.params;
    const { allowedColumnIds, rowFilter, manualRowOverrides } = req.body;

    // Validate row filter columns if provided
    if (rowFilter?.conditions?.length) {
      const { validateFilterColumns } = await import('../services/permission-filter');
      const invalid = await validateFilterColumns(id, rowFilter);
      if (invalid.length > 0) {
        res.status(400).json({ error: `Invalid filter columns: ${invalid.join(', ')}` });
        return;
      }
    }

    // Validate manual overrides size
    if (manualRowOverrides) {
      if ((manualRowOverrides.include?.length || 0) > 1000 || (manualRowOverrides.exclude?.length || 0) > 1000) {
        res.status(400).json({ error: 'Manual row overrides limited to 1000 entries per array' });
        return;
      }
    }

    // Upsert permissions
    const [existing] = await db
      .select()
      .from(assignmentPermissions)
      .where(eq(assignmentPermissions.assignmentId, assignmentId));

    if (existing) {
      await db.update(assignmentPermissions).set({
        allowedColumnIds: allowedColumnIds ?? null,
        rowFilter: rowFilter ?? null,
        manualRowOverrides: manualRowOverrides ?? null,
        updatedAt: new Date(),
      }).where(eq(assignmentPermissions.id, existing.id));
    } else {
      await db.insert(assignmentPermissions).values({
        assignmentId,
        allowedColumnIds: allowedColumnIds ?? null,
        rowFilter: rowFilter ?? null,
        manualRowOverrides: manualRowOverrides ?? null,
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update permissions error:', error);
    res.status(500).json({ error: 'Failed to update permissions' });
  }
});

// POST /api/v1/exercises/:id/assignments/:assignmentId/notify
router.post('/:id/assignments/:assignmentId/notify', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id, assignmentId } = req.params;
    const { type, message } = req.body as { type: string; message?: string };

    // Fetch assignment + user + exercise
    const [assignment] = await db
      .select({
        userId: userExerciseAssignments.userId,
        role: userExerciseAssignments.role,
        userEmail: users.email,
        userName: users.name,
      })
      .from(userExerciseAssignments)
      .innerJoin(users, eq(users.id, userExerciseAssignments.userId))
      .where(eq(userExerciseAssignments.id, assignmentId));

    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found' });
      return;
    }

    const [exercise] = await db.select().from(enrichmentExercises).where(eq(enrichmentExercises.id, id));
    if (!exercise) {
      res.status(404).json({ error: 'Exercise not found' });
      return;
    }

    const { sendEmail, buildAssignmentEmail, buildReminderEmail, buildReassignmentEmail } = await import('../services/email');

    let email;
    switch (type) {
      case 'assignment':
        email = buildAssignmentEmail(exercise.name, assignment.role, exercise.deadline ? String(exercise.deadline) : null);
        break;
      case 'reminder':
        email = buildReminderEmail(exercise.name, exercise.deadline ? String(exercise.deadline) : 'N/A', 0);
        break;
      case 'custom':
        email = {
          to: '',
          subject: `Message about ${exercise.name}`,
          body: message || '',
        };
        break;
      default:
        res.status(400).json({ error: 'type must be "assignment", "reminder", or "custom"' });
        return;
    }

    email.to = assignment.userEmail;
    await sendEmail(email);

    res.json({ sent: true });
  } catch (error) {
    console.error('Notify error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// POST /api/v1/exercises/:id/columns/add -- add a single column
router.post('/:id/columns/add', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { key, label, description, dataType, columnRole, required, defaultValue, config, validationRules, referenceLink, dependentConfig, ordinal, visible } = req.body;

    if (!key || !label || !dataType || !columnRole) {
      res.status(400).json({ error: 'key, label, dataType, and columnRole are required' });
      return;
    }

    // Auto-assign ordinal if not provided (append to end)
    let finalOrdinal = ordinal;
    if (finalOrdinal === undefined || finalOrdinal === null) {
      const [maxOrd] = await db.select({ max: sql<number>`coalesce(max(${exerciseColumns.ordinal}), -1)` })
        .from(exerciseColumns)
        .where(eq(exerciseColumns.exerciseId, id));
      finalOrdinal = (maxOrd?.max ?? -1) + 1;
    }

    const [column] = await db.insert(exerciseColumns).values({
      exerciseId: id,
      key,
      label,
      description: description || null,
      dataType,
      ordinal: finalOrdinal,
      columnRole,
      required: required ?? false,
      defaultValue: defaultValue ?? null,
      config: config ?? {},
      validationRules: validationRules ?? [],
      referenceLink: referenceLink ?? null,
      dependentConfig: dependentConfig ?? null,
      visible: visible ?? true,
    }).returning();

    // If this is a classification column, add the key to all existing enrichment_records classifications
    if (columnRole === 'classification') {
      setImmediate(async () => {
        try {
          await db.execute(
            sql`UPDATE enrichment_records SET classifications = classifications || jsonb_build_object(${key}, null) WHERE exercise_id = ${id}::uuid AND NOT (classifications ? ${key})`
          );
        } catch (err) {
          console.error(`[AddColumn] Failed to initialize classification key "${key}":`, err);
        }
      });
    }

    res.status(201).json({ column });
  } catch (error) {
    console.error('Add column error:', error);
    res.status(500).json({ error: 'Failed to add column' });
  }
});

// PUT /api/v1/exercises/:id/columns/reorder -- batch update column ordinals
router.put('/:id/columns/reorder', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { columns } = req.body as { columns: Array<{ id: string; ordinal: number }> };

    if (!Array.isArray(columns) || columns.length === 0) {
      res.status(400).json({ error: 'columns array is required' });
      return;
    }

    // Update all ordinals in a transaction
    await db.transaction(async (tx) => {
      for (const col of columns) {
        await tx.update(exerciseColumns)
          .set({ ordinal: col.ordinal })
          .where(and(eq(exerciseColumns.id, col.id), eq(exerciseColumns.exerciseId, id)));
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Reorder columns error:', error);
    res.status(500).json({ error: 'Failed to reorder columns' });
  }
});

export { router as exercisesRouter };
