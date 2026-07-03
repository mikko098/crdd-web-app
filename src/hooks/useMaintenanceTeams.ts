import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createMaintenanceTeam, getMaintenanceTeams } from '@/services/maintenanceTeams';
import { User } from '@/types';

export function useMaintenanceTeams() {
  return useQuery({
    queryKey: ['maintenance-teams'],
    queryFn: getMaintenanceTeams,
    staleTime: 60_000,
  });
}

export function useCreateMaintenanceTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, actor }: { name: string; actor: Pick<User, 'id' | 'name' | 'role'> }) =>
      createMaintenanceTeam(name, actor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-teams'] });
    },
  });
}
