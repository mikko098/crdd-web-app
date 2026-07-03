import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardUsers, useUpdateDashboardUserRole } from '@/hooks/useDashboardUsers';
import { hasPermission, roleDescription } from '@/lib/permissions';
import Header from '@/components/layout/Header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ShieldAlert, Users } from 'lucide-react';
import { UserRole } from '@/types';

const UserManagement: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const canManageRoles = hasPermission(user, 'users:manage');
  const { data: users = [], isLoading: isLoadingUsers, isError, error } = useDashboardUsers(canManageRoles);
  const manageableUsers = users.filter((dashboardUser) => dashboardUser.role !== 'manager');
  const updateRole = useUpdateDashboardUserRole();

  if (isLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!canManageRoles) {
    return (
      <div className="min-h-screen bg-secondary/30">
        <Header onToggleSidebar={() => {}} />
        <main className="mx-auto max-w-3xl p-6">
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Manager role required</AlertTitle>
            <AlertDescription>
              User role management is available only to managers.
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  const handleRoleChange = async (targetUserId: string, role: UserRole) => {
    if (!user) return;

    try {
      await updateRole.mutateAsync({
        targetUserId,
        role,
        actor: { id: user.id, name: user.name, role: user.role },
      });
      toast({ title: 'Role updated' });
    } catch (err) {
      toast({
        title: 'Failed to update role',
        description: err instanceof Error ? err.message : 'Check Firestore permissions and try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30 flex flex-col">
      <Header onToggleSidebar={() => {}} />

      <main className="flex-1 p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Access
              </CardTitle>
              <CardDescription>
                Assign standard dashboard users to viewer or manager access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Role model</AlertTitle>
                <AlertDescription>
                  {roleDescription('user')} {roleDescription('manager')}
                </AlertDescription>
              </Alert>

              {isError ? (
                <Alert variant="destructive">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle>Unable to load users</AlertTitle>
                  <AlertDescription>
                    {error instanceof Error ? error.message : 'Check Firestore read rules for the users collection.'}
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="rounded-lg border bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Current Role</TableHead>
                        <TableHead className="w-48">Change Role</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingUsers ? (
                        <TableRow>
                          <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                            Loading users...
                          </TableCell>
                        </TableRow>
                      ) : manageableUsers.length ? (
                        manageableUsers.map((dashboardUser) => (
                          <TableRow key={dashboardUser.id}>
                            <TableCell className="font-medium">{dashboardUser.name}</TableCell>
                            <TableCell>{dashboardUser.email || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {dashboardUser.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={dashboardUser.role}
                                onValueChange={(value) => handleRoleChange(dashboardUser.id, value as UserRole)}
                                disabled={updateRole.isPending}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">User</SelectItem>
                                  <SelectItem value="manager">Manager</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                            No standard user accounts found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default UserManagement;
