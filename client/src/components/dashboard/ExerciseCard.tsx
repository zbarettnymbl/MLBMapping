import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { ExerciseListItem } from '@mapforge/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DeadlineIndicator } from './DeadlineIndicator';

interface ExerciseCardProps {
  exercise: ExerciseListItem;
}

function getStatusVariant(status: ExerciseListItem['status']) {
  switch (status) {
    case 'active':
      return 'success' as const;
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
  if (percentage >= 100) return 'text-green-400';
  if (percentage >= 50) return 'text-primary';
  return 'text-muted-foreground';
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
      className="cursor-pointer transition-colors hover:bg-accent/50"
      onClick={() => navigate(`/exercises/${exercise.id}`)}
    >
      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={getStatusVariant(exercise.status)}>
              {exercise.status.charAt(0).toUpperCase() + exercise.status.slice(1)}
            </Badge>
            {exercise.hasNewRecords && (
              <Badge variant="secondary">{exercise.newRecordCount} New Records</Badge>
            )}
          </div>
          <DeadlineIndicator deadline={exercise.deadline} />
        </div>

        {/* Title and description */}
        <h3 className="text-lg font-semibold text-foreground mt-2">{exercise.name}</h3>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{exercise.description}</p>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{exercise.classifiedRecords} of {exercise.totalRecords} ({percentage}%)</span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>

        {/* Column breakdown */}
        {exercise.columnStats.length > 0 && (
          <div className="flex gap-4 mt-2">
            {exercise.columnStats.map((stat) => (
              <span key={stat.columnKey} className="text-xs text-muted-foreground">
                {stat.label}:{' '}
                <span className={getColumnPercentageColor(stat.percentage)}>
                  {stat.percentage}%
                </span>
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
          <span className="text-xs text-muted-foreground">
            {hasStarted
              ? `Last active: ${formatRelativeTime(exercise.lastUpdatedAt)}`
              : 'Not started'}
          </span>
          <Button
            variant="default"
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
      </CardContent>
    </Card>
  );
}
