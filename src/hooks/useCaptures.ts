import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCaptureById,
  getCaptureWorkflowEvents,
  getCaptures,
  subscribeCaptureById,
  subscribeCaptures,
} from '@/services/captures';

export function useCaptures() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['captures'],
    queryFn: getCaptures,
    staleTime: 30_000,
  });

  useEffect(() => {
    return subscribeCaptures(
      (captures) => {
        queryClient.setQueryData(['captures'], captures);
      },
      (error) => {
        queryClient.setQueryData(['captures-error'], error);
      },
    );
  }, [queryClient]);

  return query;
}

export function useCapture(id?: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['captures', id],
    queryFn: () => getCaptureById(id as string),
    enabled: Boolean(id),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!id) return undefined;

    return subscribeCaptureById(
      id,
      (capture) => {
        queryClient.setQueryData(['captures', id], capture);
      },
      (error) => {
        queryClient.setQueryData(['captures', id, 'error'], error);
      },
    );
  }, [id, queryClient]);

  return query;
}

export function useCaptureWorkflowEvents(id?: string) {
  return useQuery({
    queryKey: ['capture-events', id],
    queryFn: () => getCaptureWorkflowEvents(id as string),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}
