// client/src/hooks/useExerciseRecords.ts
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchExerciseRecords } from '../api/exercises';
import { useSpreadsheetStore } from '../stores/spreadsheetStore';
import type { RecordQueryParams, PaginatedRecords } from '@mapforge/shared/types';

export function useExerciseRecords(exerciseId: string) {
  const { page, pageSize, activeFilter, searchQuery, sortColumn, sortDirection } =
    useSpreadsheetStore();

  const queryParams: RecordQueryParams = {
    page,
    pageSize,
    filter: activeFilter,
    search: searchQuery,
    sortColumn: sortColumn ?? undefined,
    sortDirection,
  };

  return useQuery<PaginatedRecords>({
    queryKey: ['records', exerciseId, queryParams],
    queryFn: () => fetchExerciseRecords(exerciseId, queryParams),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

/** Partial key for optimistic cache updates via setQueriesData */
export function recordsKeyPrefix(exerciseId: string) {
  return ['records', exerciseId];
}
