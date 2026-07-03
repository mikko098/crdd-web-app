import { User, UserRole } from '@/types';

export type Permission =
  | 'reports:view'
  | 'reports:export'
  | 'reports:comment'
  | 'reports:assign-team'
  | 'reports:update-status'
  | 'reports:upload-after-photo'
  | 'reports:view-workflow-history'
  | 'teams:create'
  | 'users:manage';

const rolePermissions: Record<UserRole, Permission[]> = {
  user: ['reports:view'],
  manager: [
    'reports:view',
    'reports:export',
    'reports:comment',
    'reports:assign-team',
    'reports:update-status',
    'reports:upload-after-photo',
    'reports:view-workflow-history',
    'teams:create',
    'users:manage',
  ],
};

export function hasPermission(user: User | null | undefined, permission: Permission): boolean {
  if (!user) return false;
  return rolePermissions[user.role]?.includes(permission) ?? false;
}

export function requireManager(user: User | null | undefined): asserts user is User & { role: 'manager' } {
  if (!hasPermission(user, 'reports:update-status')) {
    throw new Error('Manager role is required for this action.');
  }
}

export function roleDescription(role: UserRole): string {
  if (role === 'manager') {
    return 'Managers can manage repair workflow, maintenance teams, exports, after-repair evidence, and workflow history.';
  }

  return 'Users can view road-damage reports without changing maintenance workflow.';
}
