import cron from 'node-cron';
import { db } from '../db/connection';
import { enrichmentExercises, userExerciseAssignments, users, enrichmentRecords } from '../db/schema';
import { eq, and, sql, isNotNull, lte, gte } from 'drizzle-orm';
import { sendEmail, buildReminderEmail } from './email';

let reminderTask: cron.ScheduledTask | null = null;

export function startReminderScheduler(): void {
  if (reminderTask) {
    reminderTask.stop();
  }

  // Run daily at 9:00 AM
  reminderTask = cron.schedule('0 9 * * *', async () => {
    console.log('[ReminderScheduler] Checking for upcoming deadlines...');
    try {
      await sendDeadlineReminders();
    } catch (error) {
      console.error('[ReminderScheduler] Failed to send reminders:', error);
    }
  });

  console.log('[ReminderScheduler] Started daily reminder check at 9:00 AM');
}

export function stopReminderScheduler(): void {
  if (reminderTask) {
    reminderTask.stop();
    reminderTask = null;
  }
}

async function sendDeadlineReminders(): Promise<void> {
  const windowDays = parseInt(process.env.REMINDER_WINDOW_DAYS || '3', 10);
  const now = new Date();
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + windowDays);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Find exercises with upcoming deadlines
  const exercises = await db
    .select({
      id: enrichmentExercises.id,
      name: enrichmentExercises.name,
      deadline: enrichmentExercises.deadline,
    })
    .from(enrichmentExercises)
    .where(
      and(
        eq(enrichmentExercises.status, 'active'),
        isNotNull(enrichmentExercises.deadline),
        gte(enrichmentExercises.deadline, sql`${now.toISOString()}::date`),
        lte(enrichmentExercises.deadline, sql`${windowEnd.toISOString()}::date`)
      )
    );

  for (const exercise of exercises) {
    // Find assignments that haven't been reminded in the last 24 hours
    const assignments = await db
      .select({
        assignmentId: userExerciseAssignments.id,
        userId: userExerciseAssignments.userId,
        userEmail: users.email,
        userName: users.name,
        lastReminderSentAt: userExerciseAssignments.lastReminderSentAt,
      })
      .from(userExerciseAssignments)
      .innerJoin(users, eq(users.id, userExerciseAssignments.userId))
      .where(eq(userExerciseAssignments.exerciseId, exercise.id));

    for (const assignment of assignments) {
      // Skip if reminded within 24 hours
      if (assignment.lastReminderSentAt && assignment.lastReminderSentAt > twentyFourHoursAgo) {
        continue;
      }

      // Count unclassified records for this user
      const [stats] = await db
        .select({
          unclassified: sql<number>`count(*) filter (where ${enrichmentRecords.isFullyClassified} = false)::int`,
        })
        .from(enrichmentRecords)
        .where(eq(enrichmentRecords.exerciseId, exercise.id));

      const unclassifiedCount = stats?.unclassified ?? 0;

      const email = buildReminderEmail(exercise.name, String(exercise.deadline), unclassifiedCount);
      email.to = assignment.userEmail;

      await sendEmail(email);

      // Update last_reminder_sent_at
      await db
        .update(userExerciseAssignments)
        .set({ lastReminderSentAt: new Date() })
        .where(eq(userExerciseAssignments.id, assignment.assignmentId));
    }
  }
}
