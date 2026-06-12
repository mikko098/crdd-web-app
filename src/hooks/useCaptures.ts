import { useQuery } from '@tanstack/react-query';
import { getCaptureById, getCaptures } from '@/services/captures';

export function useCaptures() {
  return useQuery({
    queryKey: ['captures'],
    queryFn: getCaptures,
    staleTime: 30_000,
  });
}

export function useCapture(id?: string) {
  return useQuery({
    queryKey: ['captures', id],
    queryFn: () => getCaptureById(id as string),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}
