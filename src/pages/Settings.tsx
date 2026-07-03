import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/components/theme/ThemeProvider';
import { roleDescription } from '@/lib/permissions';
import { defaultUserSettings, getUserSettings, saveUserSettings } from '@/services/userSettings';
import { ThemePreference, UserSettings } from '@/types';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Bell, Info, Moon, Globe, Shield } from 'lucide-react';

const Settings: React.FC = () => {
  const {
    isAuthenticated,
    isLoading,
    user,
    resetPassword,
  } = useAuth();
  const { setTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [settings, setSettings] = useState<UserSettings>(defaultUserSettings);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
    <div className="min-h-screen bg-secondary/30 flex flex-col">
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
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Store routing preferences for future alert delivery
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Delivery backend not connected</AlertTitle>
                <AlertDescription>
                  This preference is saved to Firestore. Automatic email alerts still need a backend worker before messages are sent.
                </AlertDescription>
              </Alert>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email alert preference</Label>
                  <p className="text-sm text-muted-foreground">
                    Mark this account as willing to receive email updates
                  </p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Role Access
              </CardTitle>
              <CardDescription>
                Your current dashboard permission level
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border bg-muted/40 p-4">
                <p className="text-sm font-medium capitalize">{user?.role ?? 'user'} role</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {roleDescription(user?.role ?? 'user')}
                </p>
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
              <div className="space-y-3">
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
