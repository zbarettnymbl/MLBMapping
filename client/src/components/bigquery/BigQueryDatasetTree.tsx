import { useState } from 'react';
import { ChevronRight, ChevronDown, Table2, Database, Loader2 } from 'lucide-react';

interface BigQueryDatasetTreeProps {
  datasets: string[];
  selectedDataset: string | null;
  selectedTable: string | null;
  tablesMap: Record<string, string[]>;
  loadingDatasets: Record<string, boolean>;
  errorDatasets: Record<string, string | null>;
  onExpandDataset: (dataset: string) => void;
  onSelectTable: (dataset: string, table: string) => void;
  onRetryDataset: (dataset: string) => void;
}

export function BigQueryDatasetTree({
  datasets,
  selectedDataset,
  selectedTable,
  tablesMap,
  loadingDatasets,
  errorDatasets,
  onExpandDataset,
  onSelectTable,
  onRetryDataset,
}: BigQueryDatasetTreeProps) {
  const [expandedDatasets, setExpandedDatasets] = useState<Set<string>>(new Set());

  function toggleDataset(dataset: string) {
    setExpandedDatasets((prev) => {
      const next = new Set(prev);
      if (next.has(dataset)) {
        next.delete(dataset);
      } else {
        next.add(dataset);
        if (!tablesMap[dataset]) {
          onExpandDataset(dataset);
        }
      }
      return next;
    });
  }

  if (datasets.length === 0) {
    return <p className="px-3 py-2 text-xs text-forge-500">No datasets found</p>;
  }

  return (
    <div className="space-y-0.5">
      {datasets.map((dataset) => {
        const isExpanded = expandedDatasets.has(dataset);
        const tables = tablesMap[dataset];
        const isLoading = loadingDatasets[dataset];
        const error = errorDatasets[dataset];

        return (
          <div key={dataset}>
            <button
              onClick={() => toggleDataset(dataset)}
              className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-forge-300 hover:bg-forge-800/50 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-forge-500 shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-forge-500 shrink-0" />
              )}
              <Database className="w-3.5 h-3.5 text-forge-500 shrink-0" />
              <span className="truncate">{dataset}</span>
            </button>

            {isExpanded && (
              <div className="ml-3 pl-3 border-l border-forge-800">
                {isLoading && (
                  <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-forge-500">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading tables...
                  </div>
                )}
                {error && (
                  <div className="px-3 py-1.5 text-xs text-red-400">
                    {error}
                    <button
                      onClick={() => onRetryDataset(dataset)}
                      className="ml-2 text-amber-400 hover:text-amber-300 underline"
                    >
                      Retry
                    </button>
                  </div>
                )}
                {tables && tables.length === 0 && !isLoading && !error && (
                  <p className="px-3 py-1.5 text-xs text-forge-600">No tables found</p>
                )}
                {tables?.map((table) => {
                  const isActive = selectedDataset === dataset && selectedTable === table;
                  return (
                    <button
                      key={table}
                      onClick={() => onSelectTable(dataset, table)}
                      className={`w-full flex items-center gap-1.5 px-3 py-1 text-xs rounded transition-colors ${
                        isActive
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'text-forge-400 hover:bg-forge-800/50 hover:text-forge-200'
                      }`}
                    >
                      <Table2 className="w-3 h-3 shrink-0" />
                      <span className="truncate">{table}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
