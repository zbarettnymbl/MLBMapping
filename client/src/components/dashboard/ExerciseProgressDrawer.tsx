import { forwardRef, useCallback } from 'react';
import { X, Download, FileText, Loader2 } from 'lucide-react';
import { useExerciseProgress, useSendReminder } from '../../hooks/useAdmin';
import { exportProgressCsv } from '../../api/admin';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { UserProgressCard } from './UserProgressCard';
import type { UserProgress } from '../../types';

interface ExerciseProgressDrawerProps {
  exerciseId: string;
  onClose: () => void;
}

export const ExerciseProgressDrawer = forwardRef<HTMLDivElement, ExerciseProgressDrawerProps>(
  function ExerciseProgressDrawer({ exerciseId, onClose }, ref) {
    const query = useExerciseProgress(exerciseId);
    const { data, isLoading, isError, refetch } = query;
    const reminderMutation = useSendReminder();

    const handleExport = useCallback(async () => {
      try {
        const blob = await exportProgressCsv(exerciseId);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `exercise-${exerciseId}-progress.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } catch {
        // Export error handled silently
      }
    }, [exerciseId]);

    const handleSendReminder = useCallback(
      (userId: string) => {
        reminderMutation.mutate({ exerciseId, userId });
      },
      [exerciseId, reminderMutation]
    );

    const exercise = data?.exercise;
    const userProgress: UserProgress[] = data?.userProgress ?? [];

    const totalRecords = exercise?.totalRecords ?? 0;
    const classifiedRecords = exercise?.classifiedRecords ?? 0;
    const errorCount = exercise?.errorCount ?? 0;
    const remaining = totalRecords - classifiedRecords;
    const pct = totalRecords > 0 ? Math.round((classifiedRecords / totalRecords) * 100) : 0;

    const avgCompletion =
      userProgress.length > 0
        ? userProgress.reduce((sum: number, up: { completionPercentage: number }) => sum + up.completionPercentage, 0) / userProgress.length
        : 0;

    return (
      <div
        ref={ref}
        className="fixed right-0 top-14 bottom-0 w-96 bg-background border-l border-border flex flex-col transform transition-transform duration-200 ease-out translate-x-0 z-40"
        data-testid="exercise-progress-drawer"
      >
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {exercise?.name ?? 'Loading...'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} data-testid="drawer-close">
            <X size={16} />
          </Button>
        </div>

        {/* Body */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" data-testid="spinner" />
          </div>
        )}

        {isError && (
          <div className="flex-1 flex flex-col items-center justify-center px-5">
            <p className="text-sm text-destructive mb-3">Failed to load progress details.</p>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        )}

        {!isLoading && !isError && data && (
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Stats section */}
            <div className="px-5 py-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{classifiedRecords} of {totalRecords} ({pct}%)</span>
              </div>
              <Progress value={pct} className="h-2" />
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div>
                  <div className="text-xs text-muted-foreground">Classified</div>
                  <div className="text-lg font-semibold text-emerald-400">{classifiedRecords}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Remaining</div>
                  <div className="text-lg font-semibold text-muted-foreground">{remaining}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Errors</div>
                  <div className={['text-lg font-semibold', errorCount > 0 ? 'text-destructive' : 'text-muted-foreground'].join(' ')}>
                    {errorCount}
                  </div>
                </div>
              </div>
              {exercise?.deadline && (
                <div className="text-sm text-muted-foreground mt-3">
                  Deadline: {new Date(exercise.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-1">
                Last refreshed: {exercise?.lastUpdatedAt ? new Date(exercise.lastUpdatedAt).toLocaleString() : '--'}
              </div>
            </div>

            {/* User Progress section */}
            <div className="px-5 py-4 border-t border-border flex-1">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
                User Progress
              </h3>
              {userProgress.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-sm text-muted-foreground">No users assigned to this exercise.</p>
                </div>
              ) : (
                userProgress.map((up) => (
                  <UserProgressCard
                    key={up.user.id}
                    progress={up}
                    exerciseAvgCompletion={avgCompletion}
                    onSendReminder={handleSendReminder}
                    reminderLoading={
                      reminderMutation.isPending &&
                      reminderMutation.variables?.userId === up.user.id
                    }
                  />
                ))
              )}
            </div>

            {/* Actions section */}
            <div className="px-5 py-4 border-t border-border mt-auto">
              <Button
                variant="secondary"
                size="sm"
                icon={<Download size={14} />}
                className="w-full"
                onClick={handleExport}
                data-testid="export-csv-btn"
              >
                Export Progress CSV
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={<FileText size={14} />}
                className="w-full mt-2"
              >
                View Audit Log
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }
);
