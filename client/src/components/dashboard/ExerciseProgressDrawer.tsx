import { forwardRef, useCallback } from 'react';
import { X, Download, FileText } from 'lucide-react';
import { useExerciseProgress, useSendReminder } from '../../hooks/useAdmin';
import { exportProgressCsv } from '../../api/admin';
import { Button } from '../common/Button';
import { ProgressBar } from '../common/ProgressBar';
import { Spinner } from '../common/Spinner';
import { EmptyState } from '../common/EmptyState';
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
        className="fixed right-0 top-14 bottom-0 w-96 bg-forge-900 border-l border-forge-700 flex flex-col transform transition-transform duration-200 ease-out translate-x-0 z-40"
        data-testid="exercise-progress-drawer"
      >
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-forge-800">
          <h2 className="text-lg font-semibold text-forge-50">
            {exercise?.name ?? 'Loading...'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} data-testid="drawer-close">
            <X size={16} />
          </Button>
        </div>

        {/* Body */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        )}

        {isError && (
          <div className="flex-1 flex flex-col items-center justify-center px-5">
            <p className="text-sm text-red-400 mb-3">Failed to load progress details.</p>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        )}

        {!isLoading && !isError && data && (
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Stats section */}
            <div className="px-5 py-4">
              <ProgressBar
                value={classifiedRecords}
                max={totalRecords}
                variant="amber"
                label={`${classifiedRecords} of ${totalRecords} (${pct}%)`}
                showPercentage={false}
              />
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div>
                  <div className="text-xs text-forge-400">Classified</div>
                  <div className="text-lg font-semibold text-emerald-400">{classifiedRecords}</div>
                </div>
                <div>
                  <div className="text-xs text-forge-400">Remaining</div>
                  <div className="text-lg font-semibold text-forge-400">{remaining}</div>
                </div>
                <div>
                  <div className="text-xs text-forge-400">Errors</div>
                  <div className={['text-lg font-semibold', errorCount > 0 ? 'text-red-400' : 'text-forge-400'].join(' ')}>
                    {errorCount}
                  </div>
                </div>
              </div>
              {exercise?.deadline && (
                <div className="text-sm text-forge-300 mt-3">
                  Deadline: {new Date(exercise.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              )}
              <div className="text-xs text-forge-500 mt-1">
                Last refreshed: {exercise?.lastUpdatedAt ? new Date(exercise.lastUpdatedAt).toLocaleString() : '--'}
              </div>
            </div>

            {/* User Progress section */}
            <div className="px-5 py-4 border-t border-forge-800 flex-1">
              <h3 className="text-sm font-semibold text-forge-200 uppercase tracking-wide mb-3">
                User Progress
              </h3>
              {userProgress.length === 0 ? (
                <EmptyState
                  heading="No users assigned"
                  body="No users assigned to this exercise."
                />
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
            <div className="px-5 py-4 border-t border-forge-800 mt-auto">
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
