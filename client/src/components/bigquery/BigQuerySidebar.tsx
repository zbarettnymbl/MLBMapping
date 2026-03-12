// client/src/components/bigquery/BigQuerySidebar.tsx
import { useQuery, useQueries } from '@tanstack/react-query';
import { PanelLeftClose, PanelLeft, AlertCircle } from 'lucide-react';
import { fetchCredentials } from '@/api/credentials';
import { fetchBigQueryDatasets, fetchBigQueryTables } from '@/api/bigquery';
import { useBigQueryExplorerStore } from '@/stores/bigqueryExplorerStore';
import { BigQueryDatasetTree } from './BigQueryDatasetTree';
import { useState, useCallback } from 'react';

export function BigQuerySidebar() {
  const {
    selectedCredentialId,
    selectedDataset,
    selectedTable,
    sidebarCollapsed,
    selectCredential,
    setGcpProject,
    selectDataset,
    setSelectedTable,
    toggleSidebar,
  } = useBigQueryExplorerStore();

  // Track which datasets user has expanded (to trigger table fetches)
  const [expandedDatasets, setExpandedDatasets] = useState<string[]>([]);

  const credentialsQuery = useQuery({
    queryKey: ['credentials'],
    queryFn: fetchCredentials,
  });

  const datasetsQuery = useQuery({
    queryKey: ['bigquery', 'datasets', selectedCredentialId],
    queryFn: async () => {
      const result = await fetchBigQueryDatasets(selectedCredentialId!);
      setGcpProject(result.gcpProject);
      return result;
    },
    enabled: !!selectedCredentialId,
  });

  // Fetch tables for each expanded dataset using useQueries
  const tableQueries = useQueries({
    queries: expandedDatasets.map((dataset) => ({
      queryKey: ['bigquery', 'tables', selectedCredentialId, dataset],
      queryFn: () => fetchBigQueryTables(selectedCredentialId!, dataset),
      enabled: !!selectedCredentialId,
    })),
  });

  // Build lookup maps from query results
  const tablesMap: Record<string, string[]> = {};
  const loadingDatasets: Record<string, boolean> = {};
  const errorDatasets: Record<string, string | null> = {};
  expandedDatasets.forEach((dataset, i) => {
    const q = tableQueries[i];
    if (q.data) tablesMap[dataset] = q.data;
    loadingDatasets[dataset] = q.isLoading;
    errorDatasets[dataset] = q.isError ? (q.error as Error).message : null;
  });

  function handleCredentialChange(credId: string) {
    selectCredential(credId || null);
    setExpandedDatasets([]);
  }

  const handleExpandDataset = useCallback((dataset: string) => {
    setExpandedDatasets((prev) =>
      prev.includes(dataset) ? prev : [...prev, dataset]
    );
  }, []);

  function handleSelectTable(dataset: string, table: string) {
    selectDataset(dataset);
    setSelectedTable(table);
  }

  function handleRetryDataset(dataset: string) {
    const idx = expandedDatasets.indexOf(dataset);
    if (idx >= 0) tableQueries[idx].refetch();
  }

  if (sidebarCollapsed) {
    return (
      <div className="w-10 bg-forge-900 border-r border-forge-700 flex flex-col items-center pt-3">
        <button
          onClick={toggleSidebar}
          className="p-1.5 text-forge-500 hover:text-forge-300 transition-colors"
          title="Expand sidebar"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-72 bg-forge-900 border-r border-forge-700 flex flex-col shrink-0">
      {/* Header */}
      <div className="px-3 py-3 border-b border-forge-700 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-forge-500">Browser</span>
        <button
          onClick={toggleSidebar}
          className="p-1 text-forge-500 hover:text-forge-300 transition-colors"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Credential selector */}
      <div className="px-3 py-3 border-b border-forge-700">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-forge-500 mb-1.5">
          Credential
        </label>
        {credentialsQuery.isLoading ? (
          <div className="h-8 bg-forge-800 rounded animate-pulse" />
        ) : credentialsQuery.isError ? (
          <div className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Failed to load credentials
          </div>
        ) : (
          <select
            value={selectedCredentialId ?? ''}
            onChange={(e) => handleCredentialChange(e.target.value)}
            className="w-full bg-forge-800 border border-forge-700 rounded px-2 py-1.5 text-xs text-forge-200 focus:outline-none focus:border-amber-500/50"
          >
            <option value="">Select a credential...</option>
            {credentialsQuery.data?.map((cred) => (
              <option key={cred.id} value={cred.id}>
                {cred.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Dataset/table tree */}
      <div className="flex-1 overflow-y-auto py-2">
        {!selectedCredentialId && (
          <p className="px-3 py-2 text-xs text-forge-500">Select a credential to browse datasets</p>
        )}
        {selectedCredentialId && datasetsQuery.isLoading && (
          <div className="space-y-2 px-3 py-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-5 bg-forge-800 rounded animate-pulse" />
            ))}
          </div>
        )}
        {selectedCredentialId && datasetsQuery.isError && (
          <div className="px-3 py-2 text-xs text-red-400">
            <div className="flex items-center gap-1 mb-1">
              <AlertCircle className="w-3 h-3" />
              Failed to load datasets
            </div>
            <button
              onClick={() => datasetsQuery.refetch()}
              className="text-amber-400 hover:text-amber-300 underline"
            >
              Retry
            </button>
          </div>
        )}
        {selectedCredentialId && datasetsQuery.data && (
          <BigQueryDatasetTree
            datasets={datasetsQuery.data.datasets}
            selectedDataset={selectedDataset}
            selectedTable={selectedTable}
            tablesMap={tablesMap}
            loadingDatasets={loadingDatasets}
            errorDatasets={errorDatasets}
            onExpandDataset={handleExpandDataset}
            onSelectTable={handleSelectTable}
            onRetryDataset={handleRetryDataset}
          />
        )}
      </div>
    </div>
  );
}
