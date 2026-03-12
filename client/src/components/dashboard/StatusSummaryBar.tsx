import type { ExerciseListItem } from '@mapforge/shared';

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
    <div className="flex gap-3 px-6 py-3 bg-forge-950 border-b border-forge-800">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={[
            'px-3 py-1.5 rounded-md bg-forge-850 border',
            stat.highlight ? 'border-amber-500/30' : 'border-forge-750',
          ].join(' ')}
        >
          <span className="text-sm font-semibold text-forge-100">{stat.count}</span>
          <span className="ml-1.5 text-xs font-medium text-forge-300">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}
