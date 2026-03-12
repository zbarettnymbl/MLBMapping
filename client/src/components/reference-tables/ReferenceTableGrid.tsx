import { useState, useMemo, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/contexts/ThemeContext';
import { AgGridReact } from 'ag-grid-react';
import { themeQuartz, colorSchemeDarkBlue } from 'ag-grid-community';
import type { ColDef, CellValueChangedEvent, GridApi } from 'ag-grid-community';
import { Plus, Trash2, Upload, RefreshCw } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchReferenceTable,
  addReferenceTableRows,
  updateReferenceTableRow,
  deleteReferenceTableRow,
  importCsv,
  refreshFromBigQuery,
} from '@/api/reference-tables';
import type { ReferenceTableListItem } from '@mapforge/shared';
import toast from 'react-hot-toast';

interface ReferenceTableGridProps {
  table: ReferenceTableListItem;
}

export function ReferenceTableGrid({ table }: ReferenceTableGridProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();
  const gridRef = useRef<GridApi | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: detail, isLoading } = useQuery({
    queryKey: ['reference-tables', table.id],
    queryFn: () => fetchReferenceTable(table.id),
  });

  const { resolvedTheme } = useTheme();
  const agTheme = resolvedTheme === 'dark'
    ? themeQuartz.withPart(colorSchemeDarkBlue)
    : themeQuartz;

  const columnDefs = useMemo<ColDef[]>(() => {
    if (!detail) return [];
    return detail.columns.map((col) => ({
        headerName: col.label,
        field: col.key,
        editable: isAdmin,
        flex: 1,
        minWidth: 100,
        valueGetter: (params: { data?: { data: Record<string, unknown> } }) =>
          params.data?.data?.[col.key] ?? '',
        valueSetter: (params: { data: { data: Record<string, unknown> }; newValue: unknown }) => {
          params.data.data = { ...params.data.data, [col.key]: params.newValue };
          return true;
        },
      }));
  }, [detail, isAdmin]);

  const rowData = useMemo(() => detail?.rows ?? [], [detail]);

  const onCellValueChanged = useCallback(async (event: CellValueChangedEvent) => {
    const row = event.data;
    try {
      await updateReferenceTableRow(table.id, row.id, row.data);
    } catch {
      toast.error('Failed to save change');
      queryClient.invalidateQueries({ queryKey: ['reference-tables', table.id] });
    }
  }, [table.id, queryClient]);

  const handleAddRow = async () => {
    if (!detail) return;
    setActionLoading('add');
    try {
      const emptyData: Record<string, unknown> = {};
      detail.columns.forEach((col) => { emptyData[col.key] = ''; });
      await addReferenceTableRows(table.id, [{ data: emptyData }]);
      queryClient.invalidateQueries({ queryKey: ['reference-tables', table.id] });
      queryClient.invalidateQueries({ queryKey: ['reference-tables'] });
      toast.success('Row added');
    } catch {
      toast.error('Failed to add row');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteSelected = async () => {
    if (!gridRef.current) return;
    const selected = gridRef.current.getSelectedRows();
    if (selected.length === 0) { toast.error('No rows selected'); return; }
    if (!confirm(`Delete ${selected.length} row(s)?`)) return;
    setActionLoading('delete');
    try {
      for (const row of selected) {
        await deleteReferenceTableRow(table.id, row.id);
      }
      queryClient.invalidateQueries({ queryKey: ['reference-tables', table.id] });
      queryClient.invalidateQueries({ queryKey: ['reference-tables'] });
      toast.success(`${selected.length} row(s) deleted`);
    } catch {
      toast.error('Failed to delete rows');
    } finally {
      setActionLoading(null);
    }
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('Importing will replace all existing rows. Continue?')) {
      e.target.value = '';
      return;
    }
    setActionLoading('import');
    try {
      await importCsv(table.id, file);
      queryClient.invalidateQueries({ queryKey: ['reference-tables', table.id] });
      queryClient.invalidateQueries({ queryKey: ['reference-tables'] });
      toast.success('CSV imported');
    } catch {
      toast.error('Failed to import CSV');
    } finally {
      setActionLoading(null);
      e.target.value = '';
    }
  };

  const handleRefreshBigQuery = async () => {
    if (!confirm('Refresh will replace all rows from BigQuery. Continue?')) return;
    setActionLoading('refresh');
    try {
      await refreshFromBigQuery(table.id);
      queryClient.invalidateQueries({ queryKey: ['reference-tables', table.id] });
      queryClient.invalidateQueries({ queryKey: ['reference-tables'] });
      toast.success('Refreshed from BigQuery');
    } catch {
      toast.error('Failed to refresh from BigQuery');
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-6"><Spinner size="md" /></div>;
  }

  return (
    <div className="space-y-3">
      {isAdmin && (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<Plus size={14} />} onClick={handleAddRow} isLoading={actionLoading === 'add'}>
            Add Row
          </Button>
          <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={handleDeleteSelected} isLoading={actionLoading === 'delete'}>
            Delete Selected
          </Button>
          <Button variant="ghost" size="sm" icon={<Upload size={14} />} onClick={() => fileInputRef.current?.click()} isLoading={actionLoading === 'import'}>
            Import CSV
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImportCsv} className="hidden" />
          {table.refreshSource === 'bigquery' && (
            <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={handleRefreshBigQuery} isLoading={actionLoading === 'refresh'}>
              Refresh from BigQuery
            </Button>
          )}
        </div>
      )}
      <div className="h-[300px] w-full">
        <AgGridReact
          theme={agTheme}
          columnDefs={columnDefs}
          rowData={rowData}
          rowSelection={isAdmin ? { mode: 'multiRow', headerCheckbox: true, checkboxes: true } : undefined}
          onGridReady={(e) => { gridRef.current = e.api; }}
          onCellValueChanged={isAdmin ? onCellValueChanged : undefined}
          suppressClickEdit={!isAdmin}
          domLayout="normal"
        />
      </div>
    </div>
  );
}
