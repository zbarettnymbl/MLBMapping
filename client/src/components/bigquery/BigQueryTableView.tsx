import { useRef, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { Download, Plus, Loader2 } from 'lucide-react';
import { NativeSelect } from '@/components/ui/native-select';
import { Button } from '@/components/ui/button';
import type { ColDef } from 'ag-grid-community';
import { themeQuartz, colorSchemeDarkBlue } from 'ag-grid-community';
import { previewBigQueryData, fetchBigQuerySchema } from '@/api/bigquery';
import { useBigQueryExplorerStore } from '@/stores/bigqueryExplorerStore';
import { useTheme } from '@/contexts/ThemeContext';
import { BigQuerySchemaPanel } from './BigQuerySchemaPanel';
import type { BigQueryConnectionConfig } from '@mapforge/shared';

export function BigQueryTableView() {
  const gridRef = useRef<AgGridReact>(null);
  const navigate = useNavigate();
  const {
    selectedCredentialId,
    gcpProject,
    selectedDataset,
    selectedTable,
    previewLimit,
    setPreviewLimit,
  } = useBigQueryExplorerStore();

  const { resolvedTheme } = useTheme();
  const gridTheme = resolvedTheme === 'dark'
    ? themeQuartz.withPart(colorSchemeDarkBlue)
    : themeQuartz;
  const hasSelection = !!(selectedCredentialId && gcpProject && selectedDataset && selectedTable);

  const connectionConfig: BigQueryConnectionConfig | null = hasSelection
    ? {
        gcpProject: gcpProject!,
        dataset: selectedDataset!,
        tableOrQuery: selectedTable!,
        queryType: 'table',
        credentialId: selectedCredentialId!,
      }
    : null;

  const schemaQuery = useQuery({
    queryKey: ['bigquery', 'schema', selectedCredentialId, selectedDataset, selectedTable],
    queryFn: () =>
      fetchBigQuerySchema({
        gcpProject: gcpProject!,
        dataset: selectedDataset!,
        table: selectedTable!,
        credentialId: selectedCredentialId!,
      }),
    enabled: hasSelection,
  });

  const previewQuery = useQuery({
    queryKey: ['bigquery', 'preview', selectedCredentialId, selectedDataset, selectedTable, previewLimit],
    queryFn: () =>
      previewBigQueryData({
        ...connectionConfig!,
        limit: previewLimit,
      }),
    enabled: hasSelection,
  });

  const columnDefs = useMemo<ColDef[]>(() => {
    if (!previewQuery.data?.columns) return [];
    return previewQuery.data.columns.map((col) => ({
      field: col.name,
      headerName: col.name,
      sortable: true,
      filter: true,
      resizable: true,
      minWidth: 120,
    }));
  }, [previewQuery.data?.columns]);

  const handleExportCsv = useCallback(() => {
    if (!gridRef.current?.api) return;
    const today = new Date().toISOString().split('T')[0];
    gridRef.current.api.exportDataAsCsv({
      fileName: `${selectedDataset}_${selectedTable}_${today}.csv`,
    });
  }, [selectedDataset, selectedTable]);

  const handleCreateExercise = useCallback(() => {
    navigate('/exercises/new', {
      state: {
        bigquerySource: connectionConfig,
      },
    });
  }, [navigate, connectionConfig]);

  // Empty state: no table selected
  if (!hasSelection) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">Select a table from the sidebar to preview its data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header bar */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-sm font-semibold text-foreground truncate">
            {selectedDataset}.{selectedTable}
          </h2>
          {previewQuery.data && (
            <span className="shrink-0 px-2 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground rounded-full">
              {previewQuery.data.totalRows.toLocaleString()} rows
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Limit selector */}
          <NativeSelect
            value={previewLimit}
            onChange={(e) => setPreviewLimit(Number(e.target.value))}
            className="w-auto text-xs"
          >
            <option value={50}>50 rows</option>
            <option value={100}>100 rows</option>
            <option value={500}>500 rows</option>
          </NativeSelect>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={!previewQuery.data}
            icon={<Download className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            Export CSV
          </Button>

          <Button
            size="sm"
            onClick={handleCreateExercise}
            icon={<Plus className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            Create Exercise
          </Button>
        </div>
      </div>

      {/* Schema panel */}
      <BigQuerySchemaPanel
        columns={schemaQuery.data ?? []}
        isLoading={schemaQuery.isLoading}
      />

      {/* Data grid */}
      <div className="flex-1 min-h-0">
        {previewQuery.isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading preview data...</span>
            </div>
          </div>
        ) : previewQuery.isError ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-destructive text-sm mb-2">Failed to load preview data</p>
              <Button
                variant="link"
                size="sm"
                onClick={() => previewQuery.refetch()}
                className="text-xs"
              >
                Retry
              </Button>
            </div>
          </div>
        ) : previewQuery.data && previewQuery.data.rows.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-sm">This table has no data</p>
          </div>
        ) : (
          <div className="h-full w-full">
            <AgGridReact
              ref={gridRef}
              theme={gridTheme}
              rowData={previewQuery.data?.rows ?? []}
              columnDefs={columnDefs}
              defaultColDef={{
                sortable: true,
                filter: true,
                resizable: true,
              }}
              animateRows={false}
              suppressCellFocus
            />
          </div>
        )}
      </div>
    </div>
  );
}
