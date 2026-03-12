import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeadlineIndicatorProps {
  deadline: string | null;
}

export function DeadlineIndicator({ deadline }: DeadlineIndicatorProps) {
  if (!deadline) return null;

  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diffMs = deadlineDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  let text: string;
  let colorClass: string;

  if (diffDays < 0) {
    text = `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`;
    colorClass = 'text-destructive';
  } else if (diffDays <= 7) {
    text = `Due in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    colorClass = 'text-primary';
  } else {
    text = `Due ${deadlineDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })}`;
    colorClass = 'text-muted-foreground';
  }

  return (
    <div className={cn('flex items-center gap-1 text-xs', colorClass)}>
      <Calendar size={12} />
      <span>{text}</span>
    </div>
  );
}
