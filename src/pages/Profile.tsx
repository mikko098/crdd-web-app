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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, ArrowLeft, CheckCircle2, Info, Mail, Shield, TrafficCone, Upload, User, Wrench } from 'lucide-react';

interface StatLabelProps {
  label: string;
  description: string;
}

const StatLabel: React.FC<StatLabelProps> = ({ label, description }) => (
  <div className="flex items-center gap-1.5">
    <p className="text-xs font-medium text-muted-foreground">{label}</p>
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`${label} info`}
          className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" align="start" className="max-w-56">
        {description}
      </TooltipContent>
    </Tooltip>
  </div>
);

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

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,1.25fr)]">
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
                      Username
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
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-violet-500/15">
                      <Upload className="h-4 w-4 text-violet-600 dark:text-violet-300" />
                    </div>
                    <StatLabel label="Submitted" description="Total number of road captures submitted from this account." />
                    <p className="text-2xl font-semibold text-violet-700 dark:text-violet-300">{isLoadingDamages ? '...' : reportStats.submitted}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-[#EC9707]/15">
                      <TrafficCone className="h-4 w-4 text-[#EC9707] dark:text-[#F2B340]" />
                    </div>
                    <StatLabel label="Damage Confirmed" description="Submitted captures where the model detected road damage." />
                    <p className="text-2xl font-semibold text-[#C97D06] dark:text-[#F2B340]">{isLoadingDamages ? '...' : reportStats.confirmed}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-status-urgent/15">
                      <AlertTriangle className="h-4 w-4 text-status-urgent" />
                    </div>
                    <StatLabel label="Urgent" description="Confirmed damage reports currently marked urgent." />
                    <p className="text-2xl font-semibold text-status-urgent">{isLoadingDamages ? '...' : reportStats.urgent}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-status-in-progress/15">
                      <Wrench className="h-4 w-4 text-status-in-progress" />
                    </div>
                    <StatLabel label="In Progress" description="Confirmed reports that have been assigned or are being repaired." />
                    <p className="text-2xl font-semibold text-status-in-progress">{isLoadingDamages ? '...' : reportStats.inProgress}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-4 sm:col-span-2">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-status-completed/15">
                      <CheckCircle2 className="h-4 w-4 text-status-completed" />
                    </div>
                    <StatLabel label="Completed" description="Confirmed reports marked as repaired or resolved." />
                    <p className="text-2xl font-semibold text-status-completed">{isLoadingDamages ? '...' : reportStats.completed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
