import type { ExerciseListItem } from '@mapforge/shared';
import { cn } from '@/lib/utils';

interface StatusSummaryBarProps {
  exercises: ExerciseListItem[];
}

interface StatPill {
  label: string;
  count: number;
  highlight?: boolean;
}

function computeStats(exercises: ExerciseListItem[]): StatPill[] {
  const total = exercises.length;
  const needsAttention = exercises.filter(
    (e) => e.hasNewRecords || e.errorCount > 0
  ).length;
  const inProgress = exercises.filter(
    (e) => e.classifiedRecords > 0 && e.classifiedRecords < e.totalRecords
  ).length;
  const complete = exercises.filter(
    (e) => e.classifiedRecords === e.totalRecords && e.totalRecords > 0
  ).length;

  return [
    { label: 'Total', count: total },
    { label: 'Needs Attention', count: needsAttention, highlight: needsAttention > 0 },
    { label: 'In Progress', count: inProgress },
    { label: 'Complete', count: complete },
  ];
}

export function StatusSummaryBar({ exercises }: StatusSummaryBarProps) {
  const stats = computeStats(exercises);

  return (
    <div className="flex gap-3 px-6 py-3 bg-background border-b border-border">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={cn(
            'px-3 py-1.5 rounded-md bg-card border',
            stat.highlight ? 'border-primary/30' : 'border-border'
          )}
        >
          <span className="text-sm font-semibold text-foreground">{stat.count}</span>
          <span className="ml-1.5 text-xs font-medium text-muted-foreground">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}
