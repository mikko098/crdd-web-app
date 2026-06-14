import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Mail, User, Shield } from 'lucide-react';

const Profile: React.FC = () => {
  const { isAuthenticated, isLoading, user, updateAccountProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setName(user?.name ?? '');
  }, [user?.name]);

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
    <div className="min-h-screen bg-background flex flex-col">
      <Header onToggleSidebar={() => {}} />
      
      <main className="flex-1 p-6">
        <div className="max-w-2xl mx-auto space-y-6">
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
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
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
        </div>
      </main>
    </div>
  );
};

export default Profile;
