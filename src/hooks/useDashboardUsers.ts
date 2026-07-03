import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDashboardUsers, updateDashboardUserRole } from '@/services/dashboardUsers';
import { User, UserRole } from '@/types';

export function useDashboardUsers(enabled: boolean) {
  return useQuery({
    queryKey: ['dashboard-users'],
    queryFn: getDashboardUsers,
    enabled,
    staleTime: 60_000,
  });
}

export function useUpdateDashboardUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      targetUserId,
      role,
      actor,
    }: {
      targetUserId: string;
      role: UserRole;
      actor: Pick<User, 'id' | 'name' | 'role'>;
    }) => updateDashboardUserRole(targetUserId, role, actor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-users'] });
    },
  });
}
