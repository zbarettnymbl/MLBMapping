import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { fetchAllExercises, fetchExerciseProgress, sendReminder } from '../api/admin';

export function useAllExercises() {
  return useQuery({
    queryKey: ['admin-exercises'],
    queryFn: fetchAllExercises,
    staleTime: 30_000,
  });
}

export function useExerciseProgress(exerciseId: string | null) {
  return useQuery({
    queryKey: ['exercise-progress', exerciseId],
    queryFn: () => fetchExerciseProgress(exerciseId!),
    enabled: exerciseId !== null,
    staleTime: 15_000,
  });
}

export function useSendReminder() {
  return useMutation({
    mutationFn: ({ exerciseId, userId }: { exerciseId: string; userId: string }) =>
      sendReminder(exerciseId, userId),
    onSuccess: () => {
      toast.success('Reminder sent');
    },
    onError: () => {
      toast.error('Failed to send reminder');
    },
  });
}
