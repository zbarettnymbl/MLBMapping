// client/src/components/grid/QuickFilterBar.tsx
import type { QuickFilter } from '../../stores/spreadsheetStore';

interface QuickFilterBarProps {
  activeFilter: QuickFilter;
  counts: {
    all: number;
    unclassified: number;
    classified: number;
    errors: number;
    new: number;
  };
  onChange: (filter: QuickFilter) => void;
}

const FILTERS: Array<{ key: QuickFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'unclassified', label: 'Unclassified' },
  { key: 'classified', label: 'Classified' },
  { key: 'errors', label: 'Has Errors' },
  { key: 'new', label: 'New Records' },
];

export function QuickFilterBar({ activeFilter, counts, onChange }: QuickFilterBarProps) {
  return (
    <div className="flex gap-2">
      {FILTERS.map(({ key, label }) => {
        const isActive = activeFilter === key;
        const count = counts[key];

        // Special color for errors and new when active
        let activeClasses = 'bg-amber-600/10 text-amber-400 border-amber-500/30';
        if (isActive && key === 'errors' && count > 0) {
          activeClasses = 'bg-status-error/10 text-status-error border-status-error/30';
        } else if (isActive && key === 'new' && count > 0) {
          activeClasses = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
        }

        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={[
              'px-3 py-1 rounded-full text-xs font-medium cursor-pointer border transition-colors',
              isActive
                ? activeClasses
                : 'bg-forge-850 text-forge-400 border-forge-750 hover:border-forge-600',
            ].join(' ')}
          >
            {label}{' '}
            <span
              className={[
                isActive ? 'opacity-80' : 'text-forge-500',
              ].join(' ')}
            >
              ({count})
            </span>
          </button>
        );
      })}
    </div>
  );
}
