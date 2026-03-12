// client/src/components/grid/SpreadsheetHeader.tsx
import { Search, Pencil, Download } from 'lucide-react';
import { QuickFilterBar } from './QuickFilterBar';
import type { QuickFilter } from '../../stores/spreadsheetStore';
import type { ExerciseDetail, ExerciseStats } from '@mapforge/shared/types';

interface SpreadsheetHeaderProps {
  exercise: ExerciseDetail;
  stats: ExerciseStats;
  activeFilter: QuickFilter;
  searchQuery: string;
  selectedCount: number;
  onFilterChange: (filter: QuickFilter) => void;
  onSearchChange: (query: string) => void;
  onBulkEdit: () => void;
  onExportCsv: () => void;
}

export function SpreadsheetHeader({
  stats,
  activeFilter,
  searchQuery,
  selectedCount,
  onFilterChange,
  onSearchChange,
  onBulkEdit,
  onExportCsv,
}: SpreadsheetHeaderProps) {
  const pct = stats.completionPercentage;

  return (
    <div className="px-6 py-3 bg-card border-b border-border space-y-3">
      {/* Row 1: Progress */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-foreground">
            {stats.classifiedRecords} of {stats.totalRecords} records classified ({pct}%)
          </span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        {/* Column-level stats */}
        {stats.columnStats.length > 0 && (
          <div className="flex gap-4 mt-2">
            {stats.columnStats.map((cs) => {
              let colorClass = 'text-muted-foreground';
              if (cs.percentage >= 100) colorClass = 'text-success';
              else if (cs.percentage >= 50) colorClass = 'text-amber-400';
              return (
                <span key={cs.columnKey} className="text-xs">
                  <span className="text-muted-foreground">{cs.label}: </span>
                  <span className={colorClass}>{cs.percentage}%</span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Row 2: Filters + Actions */}
      <div className="flex items-center justify-between">
        <QuickFilterBar
          activeFilter={activeFilter}
          counts={{
            all: stats.totalRecords,
            unclassified: stats.unclassifiedRecords,
            classified: stats.classifiedRecords,
            errors: stats.errorCount,
            new: stats.newRecordCount,
          }}
          onChange={onFilterChange}
        />

        <div className="flex gap-2 items-center">
          {/* Search */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search records..."
              className={[
                'w-64 pl-8 pr-3 py-1.5 text-sm rounded',
                'bg-background border border-input text-foreground',
                'placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-1 focus:ring-ring/40',
              ].join(' ')}
            />
          </div>

          {/* Bulk Edit */}
          <button
            onClick={onBulkEdit}
            disabled={selectedCount === 0}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border',
              selectedCount === 0
                ? 'bg-muted text-muted-foreground border-border cursor-not-allowed'
                : 'bg-card text-foreground border-border hover:bg-muted',
            ].join(' ')}
          >
            <Pencil size={12} />
            Bulk Edit ({selectedCount})
          </button>

          {/* Export CSV */}
          <button
            onClick={onExportCsv}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded',
              'text-muted-foreground hover:text-foreground hover:bg-muted',
            ].join(' ')}
          >
            <Download size={12} />
            Export CSV
          </button>
        </div>
      </div>
    </div>
  );
}
