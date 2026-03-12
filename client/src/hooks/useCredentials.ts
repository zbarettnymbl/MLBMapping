import { useQuery } from '@tanstack/react-query';
import { fetchCredentials } from '@/api/credentials';

export function useCredentials() {
  return useQuery({
    queryKey: ['credentials'],
    queryFn: fetchCredentials,
    staleTime: 30_000,
  });
}
