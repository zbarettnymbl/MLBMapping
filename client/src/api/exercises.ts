import { apiClient } from './client';
import type {
  ExerciseListItem,
  ExerciseDetail,
  PaginatedRecords,
  RecordQueryParams,
  ClassificationPayload,
  ClassificationResult,
  BulkClassificationPayload,
  BulkClassificationResult,
  ExerciseStats,
} from '@mapforge/shared';

export async function fetchMyExercises(): Promise<ExerciseListItem[]> {
  const response = await apiClient.get<{ exercises: ExerciseListItem[] }>('/exercises');
  return response.data.exercises;
}

export async function fetchExerciseDetail(id: string): Promise<ExerciseDetail> {
  const response = await apiClient.get<ExerciseDetail>(`/exercises/${id}`);
  return response.data;
}

export async function fetchExerciseRecords(
  id: string,
  params: RecordQueryParams
): Promise<PaginatedRecords> {
  const response = await apiClient.get<PaginatedRecords>(`/exercises/${id}/records`, {
    params,
  });
  return response.data;
}

export async function classifyRecord(
  exerciseId: string,
  recordId: string,
  values: ClassificationPayload
): Promise<ClassificationResult> {
  const response = await apiClient.put<ClassificationResult>(
    `/exercises/${exerciseId}/records/${recordId}/classify`,
    values
  );
  return response.data;
}

export async function bulkClassify(
  exerciseId: string,
  payload: BulkClassificationPayload
): Promise<BulkClassificationResult> {
  const response = await apiClient.post<BulkClassificationResult>(
    `/exercises/${exerciseId}/records/bulk-classify`,
    payload
  );
  return response.data;
}

export async function fetchExerciseStats(id: string): Promise<ExerciseStats> {
  const response = await apiClient.get<ExerciseStats>(`/exercises/${id}/stats`);
  return response.data;
}

export async function exportExerciseRecords(id: string, filter: string): Promise<Blob> {
  const response = await apiClient.get(`/exercises/${id}/records/export`, {
    params: { filter },
    responseType: 'blob',
  });
  return response.data;
}

export async function createExercise(payload: { name: string; description?: string; viewMode?: string }): Promise<{ id: string }> {
  const response = await apiClient.post('/exercises', payload);
  return response.data;
}

export async function updateExercise(id: string, payload: Record<string, unknown>): Promise<void> {
  await apiClient.put(`/exercises/${id}`, payload);
}

export async function publishExercise(id: string): Promise<{ status: string; syncResult: unknown }> {
  const response = await apiClient.post(`/exercises/${id}/publish`);
  return response.data;
}

export async function saveSourceConfig(exerciseId: string, config: {
  gcpProject: string; dataset: string; tableOrQuery: string; queryType: string; credentialId: string; refreshSchedule: string | null;
}): Promise<void> {
  await apiClient.post(`/exercises/${exerciseId}/source-config`, config);
}

export async function saveExerciseColumns(exerciseId: string, columns: unknown[]): Promise<void> {
  await apiClient.post(`/exercises/${exerciseId}/columns`, { columns });
}

export async function addUserAssignment(exerciseId: string, userId: string, role: string): Promise<void> {
  await apiClient.post(`/exercises/${exerciseId}/assignments`, { userId, role });
}

export async function removeUserAssignment(exerciseId: string, assignmentId: string): Promise<void> {
  await apiClient.delete(`/exercises/${exerciseId}/assignments/${assignmentId}`);
}

export async function fetchAssignments(exerciseId: string): Promise<unknown[]> {
  const response = await apiClient.get(`/exercises/${exerciseId}/assignments`);
  return response.data.assignments;
}
