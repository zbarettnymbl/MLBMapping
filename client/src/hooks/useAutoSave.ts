// client/src/hooks/useAutoSave.ts
import { useEffect, useMemo, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import debounce from 'lodash-es/debounce';
import { toast } from 'sonner';
import { classifyRecord } from '../api/exercises';
import { useSpreadsheetStore } from '../stores/spreadsheetStore';
import type {
  ClassificationPayload,
  ClassificationResult,
  PaginatedRecords,
} from '@mapforge/shared/types';

export function useAutoSave(exerciseId: string) {
  const queryClient = useQueryClient();
  const { addPendingSave, removePendingSave } = useSpreadsheetStore();

  const mutation = useMutation<
    ClassificationResult,
    Error,
    { recordId: string; values: ClassificationPayload }
  >({
    mutationFn: (args) =>
      classifyRecord(exerciseId, args.recordId, args.values),
    retry: 1,

    onMutate: async ({ recordId, values }) => {
      addPendingSave(recordId, values);
      await queryClient.cancelQueries({ queryKey: ['records', exerciseId] });

      const updateRecords = (old: PaginatedRecords | undefined) => {
        if (!old) return old;
        return {
          ...old,
          records: old.records.map((r) =>
            r.id === recordId
              ? {
                  ...r,
                  classifications: {
                    ...r.classifications,
                    ...Object.fromEntries(
                      values.values.map((v) => [v.columnKey, v.value])
                    ),
                  },
                }
              : r
          ),
        };
      };

      queryClient.setQueriesData<PaginatedRecords>(
        { queryKey: ['records', exerciseId] },
        updateRecords
      );
    },

    onSuccess: (result, { recordId }) => {
      removePendingSave(recordId);
      queryClient.setQueriesData<PaginatedRecords>(
        { queryKey: ['records', exerciseId] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            records: old.records.map((r) =>
              r.id === recordId
                ? {
                    ...r,
                    validationErrors: result.validationErrors,
                    isFullyClassified: result.isFullyClassified,
                  }
                : r
            ),
            stats: result.updatedStats,
          };
        }
      );
    },

    onError: (_err, { recordId }) => {
      removePendingSave(recordId);
      queryClient.invalidateQueries({ queryKey: ['records', exerciseId] });
      toast.error('Failed to save classification. Retrying...');
    },
  });

  // Stable debounced save using useRef pattern
  const mutateRef = useRef(mutation.mutate);
  mutateRef.current = mutation.mutate;

  const debouncedSave = useMemo(
    () =>
      debounce((recordId: string, values: ClassificationPayload) => {
        mutateRef.current({ recordId, values });
      }, 300),
    []
  );

  // Cleanup on unmount
  useEffect(() => () => debouncedSave.cancel(), [debouncedSave]);

  return { save: debouncedSave, isPending: mutation.isPending };
}
