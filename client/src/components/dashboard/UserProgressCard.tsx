import { forwardRef } from 'react';
import { Send } from 'lucide-react';
import type { UserProgress } from '../../types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

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
      <div ref={ref} className="bg-card rounded-md p-3 mb-2">
        {/* Row 1: User info */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs font-medium">
                {getInitials(progress.user.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-sm font-medium text-foreground">{progress.user.name}</div>
              <div className="text-xs text-muted-foreground">{progress.user.email}</div>
            </div>
          </div>
          <Badge variant="outline">{progress.user.role}</Badge>
        </div>

        {/* Row 2: Progress */}
        <div className="mt-2">
          <Progress value={pct} className="h-1.5" />
          <div className="flex justify-between text-xs mt-1">
            <span className="text-muted-foreground">
              {progress.classifiedRecords}/{progress.assignedRecords} ({pct}%)
            </span>
            <span className={lastActiveWarning ? 'text-amber-400' : 'text-muted-foreground'}>
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
