import { useQuery } from '@tanstack/react-query';
import { fetchMyExercises } from '@/api/exercises';

export function useMyExercises() {
  return useQuery({
    queryKey: ['my-exercises'],
    queryFn: fetchMyExercises,
    staleTime: 30_000,
  });
}
