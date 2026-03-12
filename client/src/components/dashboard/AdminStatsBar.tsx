import { forwardRef } from 'react';
import type { AdminExerciseListItem } from '../../types';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AdminStatsBarProps {
  exercises: AdminExerciseListItem[];
}

function computeStats(exercises: AdminExerciseListItem[]) {
  const total = exercises.length;
  const active = exercises.filter((e) => e.status === 'active').length;

  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const atRisk = exercises.filter((e) => {
    if (e.status !== 'active') return false;
    const deadlineRisk =
      e.deadline &&
      new Date(e.deadline) <= sevenDaysFromNow &&
      e.totalRecords > 0 &&
      (e.classifiedRecords / e.totalRecords) * 100 < 90;
    const userInactiveRisk = e.assignedUsers.some(
      (u: { lastActiveAt: string | null }) => u.lastActiveAt && new Date(u.lastActiveAt) < sevenDaysAgo
    );
    return deadlineRisk || userInactiveRisk;
  }).length;

  const totalClassified = exercises.reduce((sum, e) => sum + e.classifiedRecords, 0);

  return { total, active, atRisk, totalClassified };
}

export const AdminStatsBar = forwardRef<HTMLDivElement, AdminStatsBarProps>(
  function AdminStatsBar({ exercises }, ref) {
    const { total, active, atRisk, totalClassified } = computeStats(exercises);

    const stats = [
      { label: 'Total Exercises', value: total },
      { label: 'Active', value: active },
      { label: 'At Risk', value: atRisk, highlight: atRisk > 0 },
      { label: 'Records Classified', value: totalClassified.toLocaleString() },
    ];

    return (
      <div ref={ref} className="grid grid-cols-4 gap-4 px-6 py-4">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className={cn(
              'p-4',
              stat.highlight && 'border-amber-500/30'
            )}
          >
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              {stat.label}
            </div>
            <div
              className={cn(
                'text-2xl font-semibold',
                stat.highlight ? 'text-amber-400' : 'text-foreground'
              )}
            >
              {stat.value}
            </div>
          </Card>
        ))}
      </div>
    );
  }
);
