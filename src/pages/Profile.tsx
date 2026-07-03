import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { roleDescription } from '@/lib/permissions';
import { useCaptures } from '@/hooks/useCaptures';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, ArrowLeft, CheckCircle2, Mail, Shield, ShieldAlert, User, Wrench } from 'lucide-react';

const Profile: React.FC = () => {
  const { isAuthenticated, isLoading, user, updateAccountProfile } = useAuth();
  const { data: damages = [], isLoading: isLoadingDamages } = useCaptures();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setName(user?.name ?? '');
  }, [user?.name]);

  const reportStats = useMemo(() => {
    const userDamages = damages.filter((damage) => damage.contributor.id === user?.id);
    const confirmed = userDamages.filter((damage) => (damage.inferenceResults?.length ?? 0) > 0);

    return {
      submitted: userDamages.length,
      confirmed: confirmed.length,
      urgent: confirmed.filter((damage) => damage.status === 'urgent').length,
      inProgress: confirmed.filter((damage) => damage.status === 'in-progress').length,
      completed: confirmed.filter((damage) => damage.status === 'completed').length,
    };
  }, [damages, user?.id]);

  if (isLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast({
        title: 'Name is required',
        description: 'Enter a display name before saving.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);
      await updateAccountProfile(name);
      setIsEditing(false);
      toast({ title: 'Profile updated' });
    } catch (err) {
      toast({
        title: 'Failed to update profile',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30 flex flex-col">
      <Header onToggleSidebar={() => {}} />
      
      <main className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user?.avatar} alt={user?.name} />
                  <AvatarFallback className="bg-foreground text-primary text-2xl">
                    {user?.name ? getInitials(user.name) : 'U'}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardTitle className="text-2xl">{user?.name}</CardTitle>
              <CardDescription className="flex items-center justify-center gap-2">
                <Badge variant="outline" className="capitalize">
                  <Shield className="w-3 h-3 mr-1" />
                  {user?.role}
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Full Name
                  </Label>
                  <Input 
                    id="name" 
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    readOnly={!isEditing}
                    className={!isEditing ? 'bg-muted' : undefined}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </Label>
                  <Input 
                    id="email" 
                    value={user?.email || ''} 
                    readOnly 
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Role
                  </Label>
                  <Input 
                    id="role" 
                    value={user?.role === 'manager' ? 'Manager' : 'User'} 
                    readOnly 
                    className="bg-muted"
                  />
                  {user?.role && (
                    <p className="text-sm text-muted-foreground">
                      {roleDescription(user.role)}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t">
                {isEditing ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setName(user?.name ?? '');
                        setIsEditing(false);
                      }}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSaveProfile} disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save Profile'}
                    </Button>
                  </div>
                ) : (
                  <Button className="w-full" onClick={() => setIsEditing(true)}>
                    Edit Profile
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Report Activity</CardTitle>
              <CardDescription>
                Contribution summary from reports submitted by this account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-foreground">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">Submitted</p>
                  <p className="text-2xl font-semibold">{isLoadingDamages ? '...' : reportStats.submitted}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-foreground">
                    <ShieldAlert className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">Confirmed</p>
                  <p className="text-2xl font-semibold">{isLoadingDamages ? '...' : reportStats.confirmed}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-status-urgent/15">
                    <AlertTriangle className="h-4 w-4 text-status-urgent" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">Urgent</p>
                  <p className="text-2xl font-semibold text-status-urgent">{isLoadingDamages ? '...' : reportStats.urgent}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-status-in-progress/15">
                    <Wrench className="h-4 w-4 text-status-in-progress" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">In Progress</p>
                  <p className="text-2xl font-semibold text-status-in-progress">{isLoadingDamages ? '...' : reportStats.inProgress}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-status-completed/15">
                    <CheckCircle2 className="h-4 w-4 text-status-completed" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">Completed</p>
                  <p className="text-2xl font-semibold text-status-completed">{isLoadingDamages ? '...' : reportStats.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Profile;
