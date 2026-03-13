import { ChevronRight, ChevronDown, Table2, Database, Loader2 } from 'lucide-react';

interface BigQueryDatasetTreeProps {
  datasets: string[];
  selectedDataset: string | null;
  selectedTable: string | null;
  expandedDatasets: Set<string>;
  tablesMap: Record<string, string[]>;
  loadingDatasets: Record<string, boolean>;
  errorDatasets: Record<string, string | null>;
  onToggleDataset: (dataset: string) => void;
  onSelectTable: (dataset: string, table: string) => void;
  onRetryDataset: (dataset: string) => void;
}

export function BigQueryDatasetTree({
  datasets,
  selectedDataset,
  selectedTable,
  expandedDatasets,
  tablesMap,
  loadingDatasets,
  errorDatasets,
  onToggleDataset,
  onSelectTable,
  onRetryDataset,
}: BigQueryDatasetTreeProps) {

  if (datasets.length === 0) {
    return <p className="px-3 py-2 text-xs text-muted-foreground">No datasets found</p>;
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
              onClick={() => onToggleDataset(dataset)}
              className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 rounded transition-colors cursor-pointer"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              )}
              <Database className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{dataset}</span>
            </button>

            {isExpanded && (
              <div className="ml-3 pl-3 border-l border-muted">
                {isLoading && (
                  <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading tables...
                  </div>
                )}
                {error && (
                  <div className="px-3 py-1.5 text-xs text-destructive">
                    {error}
                    <button
                      onClick={() => onRetryDataset(dataset)}
                      className="ml-2 text-primary hover:text-primary/80 underline cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                )}
                {tables && tables.length === 0 && !isLoading && !error && (
                  <p className="px-3 py-1.5 text-xs text-muted-foreground/50">No tables found</p>
                )}
                {tables?.map((table) => {
                  const isActive = selectedDataset === dataset && selectedTable === table;
                  return (
                    <button
                      key={table}
                      onClick={() => onSelectTable(dataset, table)}
                      className={`w-full flex items-center gap-1.5 px-3 py-1 text-xs rounded transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
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
