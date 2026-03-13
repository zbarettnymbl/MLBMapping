import { useEffect, useCallback } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { PanelLeftClose, PanelLeft, AlertCircle } from 'lucide-react';
import { fetchCredentials } from '@/api/credentials';
import { fetchBigQueryDatasets, fetchBigQueryTables } from '@/api/bigquery';
import { useBigQueryExplorerStore } from '@/stores/bigqueryExplorerStore';
import { NativeSelect } from '@/components/ui/native-select';
import { BigQueryDatasetTree } from './BigQueryDatasetTree';
import { useState, useMemo } from 'react';

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

  // Single source of truth for expanded datasets -- drives both visual state and table fetches
  const [expandedDatasets, setExpandedDatasets] = useState<string[]>([]);
  const expandedDatasetsSet = useMemo(() => new Set(expandedDatasets), [expandedDatasets]);

  const credentialsQuery = useQuery({
    queryKey: ['credentials'],
    queryFn: fetchCredentials,
  });

  const datasetsQuery = useQuery({
    queryKey: ['bigquery', 'datasets', selectedCredentialId],
    queryFn: () => fetchBigQueryDatasets(selectedCredentialId!),
    enabled: !!selectedCredentialId,
  });

  // Sync gcpProject from query data into store via useEffect (not inside queryFn)
  useEffect(() => {
    if (datasetsQuery.data?.gcpProject) {
      setGcpProject(datasetsQuery.data.gcpProject);
    }
  }, [datasetsQuery.data?.gcpProject, setGcpProject]);

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

  const handleToggleDataset = useCallback((dataset: string) => {
    setExpandedDatasets((prev) => {
      if (prev.includes(dataset)) {
        return prev.filter((d) => d !== dataset);
      }
      return [...prev, dataset];
    });
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
      <div className="w-10 bg-background border-r border-border flex flex-col items-center pt-3">
        <button
          onClick={toggleSidebar}
          className="p-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Expand sidebar"
          aria-label="Expand sidebar"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-72 bg-background border-r border-border flex flex-col shrink-0">
      {/* Header */}
      <div className="px-3 py-3 border-b border-border flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Browser</span>
        <button
          onClick={toggleSidebar}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Credential selector */}
      <div className="px-3 py-3 border-b border-border">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          Credential
        </label>
        {credentialsQuery.isLoading ? (
          <div className="h-8 bg-muted rounded animate-pulse" />
        ) : credentialsQuery.isError ? (
          <div className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Failed to load credentials
          </div>
        ) : (
          <NativeSelect
            value={selectedCredentialId ?? ''}
            onChange={(e) => handleCredentialChange(e.target.value)}
            className="text-xs"
          >
            <option value="">Select a credential...</option>
            {credentialsQuery.data?.map((cred) => (
              <option key={cred.id} value={cred.id}>
                {cred.name}
              </option>
            ))}
          </NativeSelect>
        )}
      </div>

      {/* Dataset/table tree */}
      <div className="flex-1 overflow-y-auto py-2">
        {!selectedCredentialId && (
          <p className="px-3 py-2 text-xs text-muted-foreground">Select a credential to browse datasets</p>
        )}
        {selectedCredentialId && datasetsQuery.isLoading && (
          <div className="space-y-2 px-3 py-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-5 bg-muted rounded animate-pulse" />
            ))}
          </div>
        )}
        {selectedCredentialId && datasetsQuery.isError && (
          <div className="px-3 py-2 text-xs text-destructive">
            <div className="flex items-center gap-1 mb-1">
              <AlertCircle className="w-3 h-3" />
              Failed to load datasets
            </div>
            <button
              onClick={() => datasetsQuery.refetch()}
              className="text-primary hover:text-primary/80 underline cursor-pointer"
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
            expandedDatasets={expandedDatasetsSet}
            tablesMap={tablesMap}
            loadingDatasets={loadingDatasets}
            errorDatasets={errorDatasets}
            onToggleDataset={handleToggleDataset}
            onSelectTable={handleSelectTable}
            onRetryDataset={handleRetryDataset}
          />
        )}
      </div>
    </div>
  );
}
