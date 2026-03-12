// client/src/components/grid/SpreadsheetFooter.tsx
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SpreadsheetFooterProps {
  page: number;
  pageSize: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
}

export function SpreadsheetFooter({
  page,
  pageSize,
  totalRecords,
  onPageChange,
}: SpreadsheetFooterProps) {
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const start = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalRecords);

  return (
    <div
      className={[
        'px-6 py-2 bg-forge-900 border-t border-forge-800',
        'flex items-center justify-between text-xs text-forge-400',
      ].join(' ')}
    >
      <span>
        Showing {start}-{end} of {totalRecords} records
      </span>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={[
            'flex items-center gap-1 px-2 py-1 rounded',
            page <= 1
              ? 'text-forge-600 cursor-not-allowed'
              : 'text-forge-300 hover:bg-forge-800 hover:text-forge-100',
          ].join(' ')}
        >
          <ChevronLeft size={14} />
          Prev
        </button>

        <span className="text-forge-300">
          Page {page} of {totalPages}
        </span>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className={[
            'flex items-center gap-1 px-2 py-1 rounded',
            page >= totalPages
              ? 'text-forge-600 cursor-not-allowed'
              : 'text-forge-300 hover:bg-forge-800 hover:text-forge-100',
          ].join(' ')}
        >
          Next
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
