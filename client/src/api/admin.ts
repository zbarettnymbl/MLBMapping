import { apiClient } from './client';
import type { AdminExerciseListItem, ExerciseProgressDetail } from '../types';

export async function fetchAllExercises(): Promise<AdminExerciseListItem[]> {
  const { data } = await apiClient.get('/admin/exercises');
  return data.exercises;
}

export async function fetchExerciseProgress(id: string): Promise<ExerciseProgressDetail> {
  const { data } = await apiClient.get(`/admin/exercises/${id}/progress`);
  return data;
}

export async function sendReminder(exerciseId: string, userId: string): Promise<void> {
  await apiClient.post(`/admin/exercises/${exerciseId}/remind/${userId}`);
}

export async function exportProgressCsv(exerciseId: string): Promise<Blob> {
  const { data } = await apiClient.get(
    `/admin/exercises/${exerciseId}/progress/export`,
    { responseType: 'blob' }
  );
  return data;
}
