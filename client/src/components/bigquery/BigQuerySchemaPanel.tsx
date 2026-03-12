// client/src/components/bigquery/BigQuerySchemaPanel.tsx
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useBigQueryExplorerStore } from '@/stores/bigqueryExplorerStore';
import type { BigQueryColumnInfo } from '@mapforge/shared';

interface BigQuerySchemaPanelProps {
  columns: BigQueryColumnInfo[];
  isLoading: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  STRING: 'text-green-400',
  INTEGER: 'text-blue-400',
  INT64: 'text-blue-400',
  FLOAT: 'text-cyan-400',
  FLOAT64: 'text-cyan-400',
  BOOLEAN: 'text-purple-400',
  BOOL: 'text-purple-400',
  TIMESTAMP: 'text-orange-400',
  DATE: 'text-orange-400',
  DATETIME: 'text-orange-400',
  RECORD: 'text-yellow-400',
  STRUCT: 'text-yellow-400',
  BYTES: 'text-forge-400',
  NUMERIC: 'text-blue-400',
  BIGNUMERIC: 'text-blue-400',
  GEOGRAPHY: 'text-teal-400',
  JSON: 'text-amber-400',
};

export function BigQuerySchemaPanel({ columns, isLoading }: BigQuerySchemaPanelProps) {
  const { schemaCollapsed, toggleSchema } = useBigQueryExplorerStore();

  return (
    <div className="border-b border-forge-700">
      <button
        onClick={toggleSchema}
        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-forge-500 hover:text-forge-300 transition-colors"
      >
        {schemaCollapsed ? (
          <ChevronRight className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
        Schema ({columns.length} columns)
      </button>

      {!schemaCollapsed && (
        <div className="px-4 pb-3 max-h-48 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-1.5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-4 bg-forge-800 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-forge-500 border-b border-forge-800">
                  <th className="text-left py-1 pr-4 font-medium">Column</th>
                  <th className="text-left py-1 pr-4 font-medium">Type</th>
                  <th className="text-left py-1 font-medium">Mode</th>
                </tr>
              </thead>
              <tbody>
                {columns.map((col) => (
                  <tr key={col.name} className="border-b border-forge-800/50">
                    <td className="py-1 pr-4 text-forge-200 font-mono">{col.name}</td>
                    <td className={`py-1 pr-4 font-mono ${TYPE_COLORS[col.type] ?? 'text-forge-400'}`}>
                      {col.type}
                    </td>
                    <td className="py-1 text-forge-500">{col.mode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
