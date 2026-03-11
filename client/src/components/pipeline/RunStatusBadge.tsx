const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-forge-600 text-forge-300',
  running: 'bg-amber-500/20 text-amber-400 animate-pulse',
  success: 'bg-emerald-500/20 text-emerald-400',
  failed: 'bg-red-500/20 text-red-400',
  cancelled: 'bg-forge-700 text-forge-500',
  skipped: 'bg-forge-700 text-forge-500',
};

export function RunStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[status] || STATUS_STYLES.pending}`}>
      {status}
    </span>
  );
}
