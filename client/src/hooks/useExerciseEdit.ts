import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';
import {
  fetchSourceConfig,
  saveSourceConfig,
  fetchAssignments,
  updateAssignmentRole,
  removeAssignment,
  bulkAssign,
  updatePermissions,
  fetchPermissions,
  sendNotification,
  updateExerciseStatus,
  deleteColumn,
  addColumn,
  updateColumn,
  reorderColumns,
  fetchBatchPermissions,
  fetchRecords,
} from '@/api/exercise-edit';
import type { ExerciseDetail, AddColumnRequest } from '@mapforge/shared';

export function useExerciseDetail(exerciseId: string) {
  return useQuery({
    queryKey: ['exercise-detail', exerciseId],
    queryFn: async () => {
      const response = await apiClient.get<ExerciseDetail>(`/exercises/${exerciseId}`);
      return response.data;
    },
    staleTime: 30_000,
    enabled: !!exerciseId,
  });
}

export function useSourceConfig(exerciseId: string) {
  return useQuery({
    queryKey: ['exercise-source-config', exerciseId],
    queryFn: () => fetchSourceConfig(exerciseId),
    staleTime: 30_000,
    enabled: !!exerciseId,
  });
}

export function useExerciseAssignments(exerciseId: string) {
  return useQuery({
    queryKey: ['exercise-assignments', exerciseId],
    queryFn: () => fetchAssignments(exerciseId),
    staleTime: 30_000,
    enabled: !!exerciseId,
  });
}

export function useAssignmentPermissions(exerciseId: string, assignmentId: string | null) {
  return useQuery({
    queryKey: ['assignment-permissions', exerciseId, assignmentId],
    queryFn: () => fetchPermissions(exerciseId, assignmentId!),
    staleTime: 30_000,
    enabled: !!exerciseId && !!assignmentId,
  });
}

// Mutations

export function useUpdateExercise(exerciseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      await apiClient.put(`/exercises/${exerciseId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-detail', exerciseId] });
      toast.success('Exercise updated');
    },
    onError: () => {
      toast.error('Failed to update exercise');
    },
  });
}

export function useUpdateStatus(exerciseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: string) => updateExerciseStatus(exerciseId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-detail', exerciseId] });
      toast.success('Status updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update status');
    },
  });
}

export function useSaveSourceConfig(exerciseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: Parameters<typeof saveSourceConfig>[1]) => saveSourceConfig(exerciseId, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-source-config', exerciseId] });
      toast.success('Source config saved');
    },
    onError: () => {
      toast.error('Failed to save source config');
    },
  });
}

export function useUpdateAssignmentRole(exerciseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, role }: { assignmentId: string; role: string }) =>
      updateAssignmentRole(exerciseId, assignmentId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-assignments', exerciseId] });
      toast.success('Role updated');
    },
    onError: () => {
      toast.error('Failed to update role');
    },
  });
}

export function useRemoveAssignment(exerciseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => removeAssignment(exerciseId, assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-assignments', exerciseId] });
      toast.success('Assignment removed');
    },
    onError: () => {
      toast.error('Failed to remove assignment');
    },
  });
}

export function useBulkAssign(exerciseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: Parameters<typeof bulkAssign>[1]) => bulkAssign(exerciseId, request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exercise-assignments', exerciseId] });
      const msg = `${data.created.length} assigned${data.skipped.length ? `, ${data.skipped.length} skipped` : ''}`;
      toast.success(msg);
    },
    onError: () => {
      toast.error('Failed to assign users');
    },
  });
}

export function useUpdatePermissions(exerciseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, permissions }: { assignmentId: string; permissions: Parameters<typeof updatePermissions>[2] }) =>
      updatePermissions(exerciseId, assignmentId, permissions),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assignment-permissions', exerciseId, variables.assignmentId] });
      toast.success('Permissions updated');
    },
    onError: () => {
      toast.error('Failed to update permissions');
    },
  });
}

export function useSendNotification(exerciseId: string) {
  return useMutation({
    mutationFn: ({ assignmentId, request }: { assignmentId: string; request: Parameters<typeof sendNotification>[2] }) =>
      sendNotification(exerciseId, assignmentId, request),
    onSuccess: () => {
      toast.success('Notification sent');
    },
    onError: () => {
      toast.error('Failed to send notification');
    },
  });
}

export function useDeleteColumn(exerciseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (colId: string) => deleteColumn(exerciseId, colId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-detail', exerciseId] });
      toast.success('Column deleted');
    },
    onError: () => {
      toast.error('Failed to delete column');
    },
  });
}

export function useAddColumn(exerciseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (column: AddColumnRequest) => addColumn(exerciseId, column),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-detail', exerciseId] });
      toast.success('Column added');
    },
    onError: () => {
      toast.error('Failed to add column');
    },
  });
}

export function useUpdateColumn(exerciseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ colId, updates }: { colId: string; updates: Record<string, unknown> }) =>
      updateColumn(exerciseId, colId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-detail', exerciseId] });
      toast.success('Column updated');
    },
    onError: () => {
      toast.error('Failed to update column');
    },
  });
}

export function useReorderColumns(exerciseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (columns: Array<{ id: string; ordinal: number }>) => reorderColumns(exerciseId, columns),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-detail', exerciseId] });
    },
    onError: () => {
      toast.error('Failed to reorder columns');
    },
  });
}

export function useBatchPermissions(exerciseId: string) {
  return useQuery({
    queryKey: ['batch-permissions', exerciseId],
    queryFn: () => fetchBatchPermissions(exerciseId),
    staleTime: 30_000,
    enabled: !!exerciseId,
  });
}

export function useExerciseRecords(exerciseId: string, page: number, pageSize: number) {
  return useQuery({
    queryKey: ['exercise-records', exerciseId, page, pageSize],
    queryFn: () => fetchRecords(exerciseId, page, pageSize),
    staleTime: 15_000,
    enabled: !!exerciseId,
  });
}
