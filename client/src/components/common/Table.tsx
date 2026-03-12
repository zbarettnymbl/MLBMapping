import type { ReactNode } from 'react';

interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string;
  onSort?: (columnKey: string) => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}

export function Table<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  rowClassName,
  onSort,
  sortColumn,
  sortDirection,
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-forge-800">
            {columns.map((col) => (
              <th
                key={col.key}
                className={[
                  'px-4 py-3 text-left text-xs font-medium text-forge-400 uppercase tracking-wide',
                  col.sortable ? 'cursor-pointer hover:text-forge-200' : '',
                  col.className,
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                <span className="flex items-center gap-1">
                  {col.header}
                  {col.sortable && sortColumn === col.key && (
                    <span className="text-amber-400">
                      {sortDirection === 'asc' ? '\u2191' : '\u2193'}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={rowKey(row)}
              className={[
                'border-b border-forge-800/50',
                onRowClick ? 'cursor-pointer' : '',
                rowClassName?.(row),
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td key={col.key} className={['px-4 py-3', col.className].filter(Boolean).join(' ')}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
