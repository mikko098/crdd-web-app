import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/components/theme/ThemeProvider';
import { defaultUserSettings, getUserSettings, saveUserSettings } from '@/services/userSettings';
import { ThemePreference, UserSettings } from '@/types';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Bell, Moon, Globe, Shield, Smartphone } from 'lucide-react';

const Settings: React.FC = () => {
  const { isAuthenticated, isLoading, user, changePassword, resetPassword } = useAuth();
  const { setTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [settings, setSettings] = useState<UserSettings>(defaultUserSettings);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    async function loadSettings() {
      setIsLoadingSettings(true);

      try {
        const storedSettings = await getUserSettings(user.id);
        if (!isMounted) return;
        setSettings(storedSettings);
        setTheme(storedSettings.theme);
      } catch (err) {
        toast({
          title: 'Unable to load settings',
          description: err instanceof Error ? err.message : 'Using default settings for now.',
          variant: 'destructive',
        });
      } finally {
        if (isMounted) setIsLoadingSettings(false);
      }
    }

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, [setTheme, toast, user]);

  if (isLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const updateSetting = (key: keyof UserSettings, value: boolean | string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleThemeChange = (value: ThemePreference) => {
    setTheme(value);
    updateSetting('theme', value);
  };

  const handleSaveSettings = async () => {
    if (!user) return;

    try {
      setIsSaving(true);
      await saveUserSettings(user.id, settings);
      toast({ title: 'Settings saved' });
    } catch (err) {
      toast({
        title: 'Failed to save settings',
        description: err instanceof Error ? err.message : 'Check your Firestore permissions and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast({
        title: 'Both password fields are required',
        description: 'Enter your current password and a new password.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsChangingPassword(true);
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setShowPasswordFields(false);
      toast({ title: 'Password changed' });
    } catch (err) {
      toast({
        title: 'Failed to change password',
        description: err instanceof Error ? err.message : 'Please check your current password and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!user?.email) return;

    try {
      await resetPassword(user.email);
      toast({
        title: 'Reset email sent',
        description: `A password reset link has been sent to ${user.email}.`,
      });
    } catch (err) {
      toast({
        title: 'Failed to send reset email',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                Manage how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email updates about damage reports
                  </p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive push notifications in browser
                  </p>
                </div>
                <Switch
                  checked={settings.pushNotifications}
                  onCheckedChange={(checked) => updateSetting('pushNotifications', checked)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    Mobile Alerts
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive urgent alerts on mobile devices
                  </p>
                </div>
                <Switch
                  checked={settings.mobileAlerts}
                  onCheckedChange={(checked) => updateSetting('mobileAlerts', checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="w-5 h-5" />
                Appearance
              </CardTitle>
              <CardDescription>
                Customize how the app looks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Theme</Label>
                  <p className="text-sm text-muted-foreground">
                    Switch between light, dark, and system themes
                  </p>
                </div>
                <Select value={settings.theme} onValueChange={handleThemeChange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Language
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Select your preferred language
                  </p>
                </div>
                <Select
                  value={settings.language}
                  onValueChange={(value) => updateSetting('language', value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security
              </CardTitle>
              <CardDescription>
                Manage your account security
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Store the preference now; enable MFA in Firebase Auth before enforcing it.
                  </p>
                </div>
                <Switch
                  checked={settings.twoFactor}
                  onCheckedChange={(checked) => updateSetting('twoFactor', checked)}
                />
              </div>
              <Separator />
              <div className="space-y-3 pt-2">
                {showPasswordFields && (
                  <div className="space-y-3 rounded-lg border p-3">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <Input
                        id="current-password"
                        type="password"
                        value={currentPassword}
                        onChange={(event) => setCurrentPassword(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCurrentPassword('');
                          setNewPassword('');
                          setShowPasswordFields(false);
                        }}
                        disabled={isChangingPassword}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleChangePassword} disabled={isChangingPassword}>
                        {isChangingPassword ? 'Saving...' : 'Save Password'}
                      </Button>
                    </div>
                  </div>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowPasswordFields(true)}
                  disabled={showPasswordFields}
                >
                  Change Password
                </Button>
                <Button variant="ghost" className="w-full" onClick={handleSendResetEmail}>
                  Email Password Reset Link
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="pt-4">
            <Button className="w-full" onClick={handleSaveSettings} disabled={isSaving || isLoadingSettings}>
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
