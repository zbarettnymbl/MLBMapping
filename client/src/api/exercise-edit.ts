import { apiClient } from './client';
import type {
  ExerciseAssignment,
  AssignmentPermissions,
  BulkAssignRequest,
  BulkAssignResponse,
  NotifyRequest,
  SourceConfig,
  BatchPermissionsResponse,
  AddColumnRequest,
} from '@mapforge/shared';

// Source config
export async function fetchSourceConfig(exerciseId: string): Promise<SourceConfig | null> {
  const response = await apiClient.get<{ sourceConfig: SourceConfig | null }>(`/exercises/${exerciseId}/source-config`);
  return response.data.sourceConfig;
}

export async function saveSourceConfig(exerciseId: string, config: SourceConfig): Promise<void> {
  await apiClient.post(`/exercises/${exerciseId}/source-config`, config);
}

// Status
export async function updateExerciseStatus(exerciseId: string, status: string): Promise<void> {
  await apiClient.put(`/exercises/${exerciseId}/status`, { status });
}

// Assignments
export async function fetchAssignments(exerciseId: string): Promise<ExerciseAssignment[]> {
  const response = await apiClient.get<{ assignments: ExerciseAssignment[] }>(`/exercises/${exerciseId}/assignments`);
  return response.data.assignments;
}

export async function updateAssignmentRole(exerciseId: string, assignmentId: string, role: string): Promise<void> {
  await apiClient.put(`/exercises/${exerciseId}/assignments/${assignmentId}`, { role });
}

export async function removeAssignment(exerciseId: string, assignmentId: string): Promise<void> {
  await apiClient.delete(`/exercises/${exerciseId}/assignments/${assignmentId}`);
}

export async function bulkAssign(exerciseId: string, request: BulkAssignRequest): Promise<BulkAssignResponse> {
  const response = await apiClient.post<BulkAssignResponse>(`/exercises/${exerciseId}/assignments/bulk`, request);
  return response.data;
}

// Permissions
export async function fetchPermissions(exerciseId: string, assignmentId: string): Promise<AssignmentPermissions | null> {
  const response = await apiClient.get<{ permissions: AssignmentPermissions | null }>(
    `/exercises/${exerciseId}/assignments/${assignmentId}/permissions`
  );
  return response.data.permissions;
}

export async function updatePermissions(
  exerciseId: string,
  assignmentId: string,
  permissions: Partial<Pick<AssignmentPermissions, 'allowedColumnIds' | 'rowFilter' | 'manualRowOverrides'>>
): Promise<void> {
  await apiClient.put(`/exercises/${exerciseId}/assignments/${assignmentId}/permissions`, permissions);
}

// Notifications
export async function sendNotification(exerciseId: string, assignmentId: string, request: NotifyRequest): Promise<void> {
  await apiClient.post(`/exercises/${exerciseId}/assignments/${assignmentId}/notify`, request);
}

// Columns
export async function deleteColumn(exerciseId: string, colId: string): Promise<{ affectedRecords: number }> {
  const response = await apiClient.delete<{ success: boolean; affectedRecords: number }>(
    `/exercises/${exerciseId}/columns/${colId}`
  );
  return { affectedRecords: response.data.affectedRecords };
}

// Add single column
export async function addColumn(exerciseId: string, column: AddColumnRequest): Promise<{ column: Record<string, unknown> }> {
  const response = await apiClient.post<{ column: Record<string, unknown> }>(`/exercises/${exerciseId}/columns/add`, column);
  return response.data;
}

// Update column metadata
export async function updateColumn(exerciseId: string, colId: string, updates: Record<string, unknown>): Promise<void> {
  await apiClient.put(`/exercises/${exerciseId}/columns/${colId}`, updates);
}

// Reorder columns
export async function reorderColumns(exerciseId: string, columns: Array<{ id: string; ordinal: number }>): Promise<void> {
  await apiClient.put(`/exercises/${exerciseId}/columns/reorder`, { columns });
}

// Batch fetch all assignment permissions
export async function fetchBatchPermissions(exerciseId: string): Promise<BatchPermissionsResponse> {
  const response = await apiClient.get<BatchPermissionsResponse>(`/exercises/${exerciseId}/assignments/permissions`);
  return response.data;
}

// Fetch paginated records (reuse existing endpoint)
export async function fetchRecords(exerciseId: string, page: number, pageSize: number): Promise<{ records: Record<string, unknown>[]; total: number; page: number; pageSize: number }> {
  const response = await apiClient.get(`/exercises/${exerciseId}/records`, { params: { page, pageSize } });
  return response.data;
}
