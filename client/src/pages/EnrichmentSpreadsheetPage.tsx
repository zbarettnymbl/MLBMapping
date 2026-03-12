// client/src/pages/EnrichmentSpreadsheetPage.tsx
import { useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, AlertTriangle, Database } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchExerciseDetail, bulkClassify } from '../api/exercises';
import { useExerciseRecords } from '../hooks/useExerciseRecords';
import { useAutoSave } from '../hooks/useAutoSave';
import { useSpreadsheetStore } from '../stores/spreadsheetStore';
import { SpreadsheetHeader } from '../components/grid/SpreadsheetHeader';
import { EnrichmentGrid } from '../components/grid/EnrichmentGrid';
import { SpreadsheetFooter } from '../components/grid/SpreadsheetFooter';
import { BulkEditPanel } from '../components/grid/BulkEditPanel';
import type { BulkClassificationPayload, PaginatedRecords } from '@mapforge/shared/types';

export function EnrichmentSpreadsheetPage() {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    activeFilter,
    searchQuery,
    page,
    pageSize,
    selectedRecordIds,
    bulkEditOpen,
    setFilter,
    setSearch,
    setPage,
    selectAllRecords,
    clearSelection,
    setBulkEditOpen,
    reset,
  } = useSpreadsheetStore();

  // Reset store when exercise changes
  useEffect(() => {
    reset();
  }, [exerciseId, reset]);

  // Fetch exercise detail
  const {
    data: exercise,
    isLoading: exerciseLoading,
    error: exerciseError,
  } = useQuery({
    queryKey: ['exercise-detail', exerciseId],
    queryFn: () => fetchExerciseDetail(exerciseId!),
    enabled: !!exerciseId,
  });

  // Fetch records
  const {
    data: recordsData,
    isLoading: recordsLoading,
    error: recordsError,
    refetch: refetchRecords,
  } = useExerciseRecords(exerciseId!);

  // Auto-save
  const { save: debouncedSave } = useAutoSave(exerciseId!);

  // Bulk classify mutation
  const bulkMutation = useMutation({
    mutationFn: (payload: BulkClassificationPayload) =>
      bulkClassify(exerciseId!, payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['records', exerciseId] });
      clearSelection();
      setBulkEditOpen(false);
      toast.success(`${result.updatedCount} records updated`);
    },
    onError: () => {
      toast.error('Bulk edit failed. Please try again.');
    },
  });

  // Handlers
  const handleClassify = useCallback(
    (recordId: string, values: { values: Array<{ columnKey: string; value: string | null }> }) => {
      debouncedSave(recordId, values);
    },
    [debouncedSave]
  );

  const handleSelectionChanged = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) clearSelection();
      else selectAllRecords(ids);
    },
    [selectAllRecords, clearSelection]
  );

  const handleExportCsv = useCallback(() => {
    if (!exerciseId) return;
    const url = `/api/v1/exercises/${exerciseId}/records/export?filter=${activeFilter}`;
    window.open(url, '_blank');
  }, [exerciseId, activeFilter]);

  const records = recordsData?.records ?? [];
  const stats = recordsData?.stats ?? {
    totalRecords: 0,
    classifiedRecords: 0,
    unclassifiedRecords: 0,
    errorCount: 0,
    warningCount: 0,
    newRecordCount: 0,
    completionPercentage: 0,
    columnStats: [],
  };
  const totalRecords = recordsData?.total ?? 0;

  // --- Page Loading State ---
  if (exerciseLoading) {
    return (
      <div className="flex flex-col h-screen bg-forge-950">
        <div className="h-14 bg-forge-900 border-b border-forge-700 px-6 flex items-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-forge-400 hover:text-forge-200 mr-3"
          >
            <ArrowLeft size={18} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // --- Exercise Error State ---
  if (exerciseError || !exercise) {
    return (
      <div className="flex flex-col h-screen bg-forge-950">
        <div className="h-14 bg-forge-900 border-b border-forge-700 px-6 flex items-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-forge-400 hover:text-forge-200 mr-3"
          >
            <ArrowLeft size={18} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle size={48} className="text-status-error mx-auto mb-4" />
            <p className="text-forge-200 mb-2">Failed to load exercise</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-sm text-amber-400 hover:text-amber-300"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-forge-950">
      {/* TopBar */}
      <div className="h-14 bg-forge-900 border-b border-forge-700 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-forge-400 hover:text-forge-200"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-semibold text-forge-100">{exercise.name}</h1>
        </div>
      </div>

      {/* Header */}
      <SpreadsheetHeader
        exercise={exercise}
        stats={stats}
        activeFilter={activeFilter}
        searchQuery={searchQuery}
        selectedCount={selectedRecordIds.size}
        onFilterChange={setFilter}
        onSearchChange={setSearch}
        onBulkEdit={() => setBulkEditOpen(true)}
        onExportCsv={handleExportCsv}
      />

      {/* Grid Area */}
      {recordsLoading ? (
        <div className="flex-1 px-6 py-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-8 bg-forge-850 rounded animate-pulse"
            />
          ))}
        </div>
      ) : recordsError ? (
        <div className="mx-6 mt-4 bg-status-error/10 border border-status-error/30 rounded-md p-3 flex items-center gap-3">
          <AlertTriangle size={16} className="text-status-error shrink-0" />
          <span className="text-sm text-forge-200">Failed to load records.</span>
          <button
            onClick={() => refetchRecords()}
            className="text-sm text-amber-400 hover:text-amber-300 ml-auto"
          >
            Retry
          </button>
        </div>
      ) : records.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Database size={48} className="text-forge-600 mx-auto mb-4" />
            <p className="text-lg font-medium text-forge-300 mb-1">No records yet</p>
            <p className="text-sm text-forge-500">
              Source data has not been loaded. Contact your administrator.
            </p>
          </div>
        </div>
      ) : (
        <EnrichmentGrid
          exercise={exercise}
          records={records}
          stats={stats}
          onClassify={handleClassify}
          onSelectionChanged={handleSelectionChanged}
          selectedIds={selectedRecordIds}
        />
      )}

      {/* Footer */}
      <SpreadsheetFooter
        page={page}
        pageSize={pageSize}
        totalRecords={totalRecords}
        onPageChange={setPage}
      />

      {/* Bulk Edit Modal */}
      {bulkEditOpen && (
        <BulkEditPanel
          exercise={exercise}
          selectedRecordIds={selectedRecordIds}
          records={records}
          onApply={(payload) => bulkMutation.mutate(payload)}
          onClose={() => setBulkEditOpen(false)}
        />
      )}
    </div>
  );
}
