import type { AdminExerciseListItem } from '../../types';
import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  exercise: AdminExerciseListItem;
}

type DisplayStatus = 'Complete' | 'On Track' | 'At Risk' | 'Overdue' | 'Not Started' | 'Paused';
type BadgeVariant = 'success' | 'default' | 'warning' | 'destructive' | 'outline';

const statusVariantMap: Record<DisplayStatus, BadgeVariant> = {
  Complete: 'success',
  'On Track': 'default',
  'At Risk': 'warning',
  Overdue: 'destructive',
  'Not Started': 'outline',
  Paused: 'outline',
};

function deriveStatus(exercise: AdminExerciseListItem): DisplayStatus {
  if (exercise.status === 'paused') return 'Paused';

  const pct =
    exercise.totalRecords > 0
      ? (exercise.classifiedRecords / exercise.totalRecords) * 100
      : 0;

  if (pct === 100 && exercise.errorCount === 0) return 'Complete';
  if (pct === 0) return 'Not Started';

  if (exercise.deadline) {
    const now = new Date();
    const deadline = new Date(exercise.deadline);
    const daysUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    if (daysUntil < 0 && pct < 100) return 'Overdue';
    if (daysUntil <= 7 && pct < 90) return 'At Risk';
  }

  return 'On Track';
}

export { deriveStatus };

export function StatusBadge({ exercise }: StatusBadgeProps) {
  const status = deriveStatus(exercise);
  return (
    <Badge variant={statusVariantMap[status]}>
      {status}
    </Badge>
  );
}
