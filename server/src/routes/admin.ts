import { Router } from 'express';
import type { Request, Response } from 'express';
import { eq, sql } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { requireAdmin } from '../middleware/requireAdmin';
import { db } from '../db/connection';
import { enrichmentExercises, userExerciseAssignments, sourceRecords, users } from '../db/schema';

const router = Router();
router.use(authMiddleware);
router.use(requireAdmin);

// In-memory stores for development (replace with DB table in production)
const reminderLog: Map<string, Date> = new Map();

// GET /exercises - List all exercises with aggregated stats
router.get('/exercises', async (_req: Request, res: Response) => {
  try {
    const allExercises = await db.select().from(enrichmentExercises);

    const exerciseList = [];
    for (const ex of allExercises) {
      // Get record stats
      const [stats] = await db
        .select({
          totalRecords: sql<number>`count(*)::int`,
          classifiedRecords: sql<number>`count(*) filter (where ${sourceRecords.recordState} = 'classified')::int`,
          errorCount: sql<number>`count(*) filter (where ${sourceRecords.recordState} = 'error')::int`,
        })
        .from(sourceRecords)
        .where(eq(sourceRecords.exerciseId, ex.id));

      // Get assigned users
      const assignedUsers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: userExerciseAssignments.role,
          lastActiveAt: users.lastLoginAt,
        })
        .from(userExerciseAssignments)
        .innerJoin(users, eq(userExerciseAssignments.userId, users.id))
        .where(eq(userExerciseAssignments.exerciseId, ex.id));

      exerciseList.push({
        id: ex.id,
        name: ex.name,
        description: ex.description ?? '',
        status: ex.status,
        totalRecords: stats?.totalRecords ?? 0,
        classifiedRecords: stats?.classifiedRecords ?? 0,
        errorCount: stats?.errorCount ?? 0,
        deadline: ex.deadline ? String(ex.deadline) : null,
        assignedUsers: assignedUsers.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          lastActiveAt: u.lastActiveAt?.toISOString() ?? null,
        })),
      });
    }

    res.json({ exercises: exerciseList });
  } catch (error) {
    console.error('Admin exercises error:', error);
    res.status(500).json({ error: 'Failed to fetch exercises' });
  }
});

// GET /exercises/:id/progress - Per-user progress breakdown
router.get('/exercises/:id/progress', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'Exercise ID required' });
      return;
    }

    // Fetch exercise
    const [exercise] = await db
      .select()
      .from(enrichmentExercises)
      .where(eq(enrichmentExercises.id, id));

    if (!exercise) {
      res.status(404).json({ error: 'Exercise not found' });
      return;
    }

    // Get total records for this exercise
    const [recordStats] = await db
      .select({
        totalRecords: sql<number>`count(*)::int`,
        classifiedRecords: sql<number>`count(*) filter (where ${sourceRecords.recordState} = 'classified')::int`,
        errorCount: sql<number>`count(*) filter (where ${sourceRecords.recordState} = 'error')::int`,
      })
      .from(sourceRecords)
      .where(eq(sourceRecords.exerciseId, id));

    // Get per-user progress
    const assignedUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: userExerciseAssignments.role,
        lastActiveAt: users.lastLoginAt,
      })
      .from(userExerciseAssignments)
      .innerJoin(users, eq(userExerciseAssignments.userId, users.id))
      .where(eq(userExerciseAssignments.exerciseId, id));

    const totalRecords = recordStats?.totalRecords ?? 0;
    const classifiedRecords = recordStats?.classifiedRecords ?? 0;
    const assignedPerUser = assignedUsers.length > 0 ? Math.ceil(totalRecords / assignedUsers.length) : 0;

    const userProgress = assignedUsers.map((u) => ({
      user: {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
      },
      assignedRecords: assignedPerUser,
      classifiedRecords: 0,
      errorCount: 0,
      completionPercentage: 0,
      lastActiveAt: u.lastActiveAt?.toISOString() ?? null,
    }));

    res.json({
      exercise: {
        id,
        name: exercise.name,
        totalRecords,
        classifiedRecords,
        errorCount: recordStats?.errorCount ?? 0,
        deadline: exercise.deadline ? String(exercise.deadline) : null,
        lastUpdatedAt: new Date().toISOString(),
      },
      userProgress,
    });
  } catch (error) {
    console.error('Exercise progress error:', error);
    res.status(500).json({ error: 'Failed to fetch exercise progress' });
  }
});

// POST /exercises/:id/remind/:userId - Send reminder to user
router.post('/exercises/:id/remind/:userId', async (req: Request, res: Response) => {
  try {
    const { id, userId } = req.params;

    if (!id || !userId) {
      res.status(400).json({ error: 'Exercise ID and User ID required' });
      return;
    }

    // Rate limit check: max 1 reminder per user per exercise per 24 hours
    const reminderKey = `${id}:${userId}`;
    const lastReminder = reminderLog.get(reminderKey);

    if (lastReminder) {
      const hoursSince = (Date.now() - lastReminder.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        res.status(429).json({ error: 'Reminder already sent within the last 24 hours' });
        return;
      }
    }

    // Record the reminder
    reminderLog.set(reminderKey, new Date());

    // TODO: Trigger notification (email + in-app)
    // For now, this is a stub -- the actual implementation will:
    // 1. Validate exercise and user exist in the database
    // 2. Insert reminder record with timestamp
    // 3. Emit notification event (email + in-app)

    res.json({ sent: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send reminder' });
  }
});

// GET /exercises/:id/progress/export - Export progress as CSV
router.get('/exercises/:id/progress/export', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'Exercise ID required' });
      return;
    }

    // TODO: Replace with Drizzle ORM query for per-user progress data
    // For now, return a CSV with headers only

    const headers = [
      'user_name',
      'user_email',
      'role',
      'assigned_records',
      'classified_records',
      'error_count',
      'completion_percentage',
      'last_active_at',
    ];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="exercise-${id}-progress.csv"`);

    // Write CSV header
    res.write(headers.join(',') + '\n');

    // TODO: Stream per-user progress rows
    // The real implementation will:
    // 1. Query per-user progress data (same as progress endpoint)
    // 2. Format each row as CSV
    // 3. Stream response

    res.end();
  } catch (error) {
    res.status(500).json({ error: 'Failed to export progress' });
  }
});

export { router as adminRouter };
