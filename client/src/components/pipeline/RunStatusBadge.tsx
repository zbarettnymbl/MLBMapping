import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_VARIANTS: Record<string, {
  variant: 'secondary' | 'warning' | 'success' | 'destructive';
  className?: string;
}> = {
  pending: { variant: 'secondary' },
  running: { variant: 'warning', className: 'animate-pulse' },
  success: { variant: 'success' },
  failed: { variant: 'destructive' },
  cancelled: { variant: 'secondary' },
  skipped: { variant: 'secondary' },
  draft: { variant: 'secondary' },
  active: { variant: 'success' },
  paused: { variant: 'warning' },
};

export function RunStatusBadge({ status }: { status: string }) {
  const config = STATUS_VARIANTS[status] || STATUS_VARIANTS.pending;
  return (
    <Badge
      variant={config.variant}
      className={cn('text-xs', config.className)}
    >
      {status}
    </Badge>
  );
}
