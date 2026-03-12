import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { ExerciseListItem } from '@mapforge/shared';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { ProgressBar } from '@/components/common/ProgressBar';
import { Button } from '@/components/common/Button';
import { DeadlineIndicator } from './DeadlineIndicator';

interface ExerciseCardProps {
  exercise: ExerciseListItem;
}

function getStatusVariant(status: ExerciseListItem['status']) {
  switch (status) {
    case 'active':
      return 'clean' as const;
    case 'paused':
      return 'warning' as const;
    case 'draft':
      return 'outline' as const;
    case 'archived':
      return 'default' as const;
  }
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

function getColumnPercentageColor(percentage: number): string {
  if (percentage >= 100) return 'text-status-clean';
  if (percentage >= 50) return 'text-amber-400';
  return 'text-forge-400';
}

export function ExerciseCard({ exercise }: ExerciseCardProps) {
  const navigate = useNavigate();
  const percentage =
    exercise.totalRecords > 0
      ? Math.round((exercise.classifiedRecords / exercise.totalRecords) * 100)
      : 0;
  const hasStarted = exercise.classifiedRecords > 0;

  return (
    <Card
      hover
      glow="amber"
      padding="md"
      onClick={() => navigate(`/exercises/${exercise.id}`)}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={getStatusVariant(exercise.status)}>
            {exercise.status.charAt(0).toUpperCase() + exercise.status.slice(1)}
          </Badge>
          {exercise.hasNewRecords && (
            <Badge variant="cyan">{exercise.newRecordCount} New Records</Badge>
          )}
        </div>
        <DeadlineIndicator deadline={exercise.deadline} />
      </div>

      {/* Title and description */}
      <h3 className="text-lg font-semibold text-forge-50 mt-2">{exercise.name}</h3>
      <p className="text-sm text-forge-400 mt-1 line-clamp-2">{exercise.description}</p>

      {/* Progress bar */}
      <div className="mt-4">
        <ProgressBar
          value={exercise.classifiedRecords}
          max={exercise.totalRecords}
          variant="amber"
          label={`${exercise.classifiedRecords} of ${exercise.totalRecords} (${percentage}%)`}
          showPercentage={false}
        />
      </div>

      {/* Column breakdown */}
      {exercise.columnStats.length > 0 && (
        <div className="flex gap-4 mt-2">
          {exercise.columnStats.map((stat) => (
            <span key={stat.columnKey} className="text-xs text-forge-400">
              {stat.label}:{' '}
              <span className={getColumnPercentageColor(stat.percentage)}>
                {stat.percentage}%
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-forge-800">
        <span className="text-xs text-forge-500">
          {hasStarted
            ? `Last active: ${formatRelativeTime(exercise.lastUpdatedAt)}`
            : 'Not started'}
        </span>
        <Button
          variant="primary"
          size="sm"
          icon={<ArrowRight size={14} />}
          iconPosition="right"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/exercises/${exercise.id}`);
          }}
        >
          {hasStarted ? 'Continue Classifying' : 'Start Classifying'}
        </Button>
      </div>
    </Card>
  );
}
