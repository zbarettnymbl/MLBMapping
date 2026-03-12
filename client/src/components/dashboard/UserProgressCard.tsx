import { forwardRef } from 'react';
import { Send } from 'lucide-react';
import type { UserProgress } from '../../types';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { ProgressBar } from '../common/ProgressBar';

interface UserProgressCardProps {
  progress: UserProgress;
  exerciseAvgCompletion: number;
  onSendReminder: (userId: string) => void;
  reminderLoading?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getRelativeTime(lastActiveAt: string | null): { text: string; isWarning: boolean } {
  if (!lastActiveAt) {
    return { text: 'Never logged in', isWarning: true };
  }

  const now = new Date();
  const lastActive = new Date(lastActiveAt);
  const diffMs = now.getTime() - lastActive.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffDays > 7) {
    return { text: `${diffDays} days inactive`, isWarning: true };
  }

  if (diffDays >= 1) {
    return { text: `${diffDays}d ago`, isWarning: false };
  }

  if (diffHours >= 1) {
    return { text: `${diffHours}h ago`, isWarning: false };
  }

  return { text: 'Just now', isWarning: false };
}

function isBehind(
  completionPct: number,
  exerciseAvgCompletion: number,
  lastActiveAt: string | null
): boolean {
  if (completionPct < exerciseAvgCompletion) return true;
  if (!lastActiveAt) return true;
  const diffDays =
    (new Date().getTime() - new Date(lastActiveAt).getTime()) / (1000 * 60 * 60 * 24);
  return diffDays > 5;
}

export const UserProgressCard = forwardRef<HTMLDivElement, UserProgressCardProps>(
  function UserProgressCard({ progress, exerciseAvgCompletion, onSendReminder, reminderLoading }, ref) {
    const pct =
      progress.assignedRecords > 0
        ? Math.round((progress.classifiedRecords / progress.assignedRecords) * 100)
        : 0;

    const { text: lastActiveText, isWarning: lastActiveWarning } = getRelativeTime(
      progress.lastActiveAt
    );

    const behind = isBehind(pct, exerciseAvgCompletion, progress.lastActiveAt);

    return (
      <div ref={ref} className="bg-forge-850 rounded-md p-3 mb-2">
        {/* Row 1: User info */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-forge-700 text-forge-200 text-xs font-medium flex items-center justify-center">
              {getInitials(progress.user.name)}
            </div>
            <div>
              <div className="text-sm font-medium text-forge-100">{progress.user.name}</div>
              <div className="text-xs text-forge-500">{progress.user.email}</div>
            </div>
          </div>
          <Badge variant="outline">{progress.user.role}</Badge>
        </div>

        {/* Row 2: Progress */}
        <div className="mt-2">
          <ProgressBar
            value={progress.classifiedRecords}
            max={progress.assignedRecords}
            variant="amber"
            size="sm"
            showPercentage={false}
          />
          <div className="flex justify-between text-xs mt-1">
            <span className="text-forge-300">
              {progress.classifiedRecords}/{progress.assignedRecords} ({pct}%)
            </span>
            <span className={lastActiveWarning ? 'text-amber-400' : 'text-forge-500'}>
              {lastActiveText}
            </span>
          </div>
        </div>

        {/* Row 3: Reminder button (conditional) */}
        {behind && (
          <div className="mt-2">
            <Button
              variant="ghost"
              size="sm"
              icon={<Send size={14} />}
              onClick={() => onSendReminder(progress.user.id)}
              isLoading={reminderLoading}
            >
              Send Reminder
            </Button>
          </div>
        )}
      </div>
    );
  }
);
