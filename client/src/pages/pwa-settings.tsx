import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Download, Bell, Wifi, WifiOff, Smartphone, Settings, RefreshCw, Check, X } from 'lucide-react';
import { pwaManager } from '@/utils/pwa';
import { useToast } from "@/hooks/use-toast";
import { PWAStatus } from '@/components/PWAComponents';

export default function PWASettings() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isInstallable, setIsInstallable] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Initial state check
    setNotificationPermission(pwaManager.getNotificationPermission());
    setIsInstallable(pwaManager.isInstallable());
    setIsOnline(pwaManager.isOnline());

    // Listen for PWA events
    const handleInstallAvailable = () => setIsInstallable(true);
    const handleInstallCompleted = () => setIsInstallable(false);
    const handleConnectionChange = (online: boolean) => setIsOnline(online);

    window.addEventListener('pwa-install-available', handleInstallAvailable);
    window.addEventListener('pwa-install-completed', handleInstallCompleted);
    pwaManager.setupConnectionListener(handleConnectionChange);

    return () => {
      window.removeEventListener('pwa-install-available', handleInstallAvailable);
      window.removeEventListener('pwa-install-completed', handleInstallCompleted);
    };
  }, []);

  const handleInstallApp = async () => {
    setIsLoading(true);
    try {
      const success = await pwaManager.installApp();
      if (success) {
        toast({
          title: "App Installed Successfully",
          description: "Cush is now available from your home screen.",
        });
      } else {
        toast({
          title: "Installation Cancelled",
          description: "App installation was cancelled by the user.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Installation Failed",
        description: "Failed to install the app. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    setIsLoading(true);
    try {
      if (enabled) {
        const success = await pwaManager.requestNotificationPermission();
        if (success) {
          setNotificationPermission('granted');
          setIsSubscribed(true);
          toast({
            title: "Notifications Enabled",
            description: "You'll receive important financial updates.",
          });
        } else {
          toast({
            title: "Permission Denied",
            description: "Enable notifications in your browser settings.",
            variant: "destructive",
          });
        }
      } else {
        const success = await pwaManager.unsubscribeFromPushNotifications();
        if (success) {
          setIsSubscribed(false);
          toast({
            title: "Notifications Disabled",
            description: "You won't receive push notifications.",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update notification settings.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCacheUpdate = async () => {
    setIsLoading(true);
    try {
      await pwaManager.updateServiceWorker();
      toast({
        title: "Cache Updated",
        description: "App data has been refreshed.",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update app cache.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">App Settings</h1>
        <p className="text-muted-foreground">
          Manage your Progressive Web App experience and offline capabilities.
        </p>
      </div>

      {/* Connection Status */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {isOnline ? (
                <Wifi className="h-5 w-5 text-green-600" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-600" />
              )}
              <CardTitle>Connection Status</CardTitle>
            </div>
            <Badge variant={isOnline ? "default" : "destructive"}>
              {isOnline ? "Online" : "Offline"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {isOnline
              ? "You're connected to the internet. All features are available."
              : "You're offline. Some features may be limited, but cached data is still accessible."}
          </p>
        </CardContent>
      </Card>

      {/* App Installation */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Smartphone className="h-5 w-5 text-blue-600" />
              <div>
                <CardTitle>App Installation</CardTitle>
                <CardDescription>Install Cush as a native app</CardDescription>
              </div>
            </div>
            <Badge variant={isInstallable ? "default" : "secondary"}>
              {isInstallable ? "Available" : "Installed"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {isInstallable
              ? "Install Cush on your device for faster access and a native app experience."
              : "Cush is already installed or installation is not available on this device."}
          </p>
          {isInstallable && (
            <Button
              onClick={handleInstallApp}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Installing...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Install App
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-purple-600" />
              <div>
                <CardTitle>Push Notifications</CardTitle>
                <CardDescription>Get real-time financial updates</CardDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={
                notificationPermission === 'granted' ? "default" :
                notificationPermission === 'denied' ? "destructive" : "secondary"
              }>
                {notificationPermission === 'granted' ? "Enabled" :
                 notificationPermission === 'denied' ? "Blocked" : "Not Set"}
              </Badge>
              {pwaManager.isNotificationSupported() && notificationPermission !== 'denied' && (
                <Switch
                  checked={notificationPermission === 'granted' && isSubscribed}
                  onCheckedChange={handleNotificationToggle}
                  disabled={isLoading}
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {notificationPermission === 'granted'
              ? "You'll receive notifications for important financial updates, AI insights, and account activity."
              : notificationPermission === 'denied'
              ? "Notifications are blocked. Enable them in your browser settings to receive updates."
              : "Enable notifications to get real-time alerts about your financial activity and AI insights."}
          </p>
        </CardContent>
      </Card>

      <Separator className="my-6" />

      {/* PWA Features Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>PWA Features</span>
          </CardTitle>
          <CardDescription>
            Overview of Progressive Web App capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PWAStatus />
        </CardContent>
      </Card>

      {/* Advanced Options */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Options</CardTitle>
          <CardDescription>
            Manage app cache and data synchronization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Offline Data Cache</h4>
              <p className="text-sm text-muted-foreground">
                Stores your financial data for offline access
              </p>
            </div>
            <Badge variant="default">
              <Check className="h-3 w-3 mr-1" />
              Active
            </Badge>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Background Sync</h4>
              <p className="text-sm text-muted-foreground">
                Syncs data when connection is restored
              </p>
            </div>
            <Badge variant="default">
              <Check className="h-3 w-3 mr-1" />
              Enabled
            </Badge>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Update Cache</h4>
              <p className="text-sm text-muted-foreground">
                Refresh cached app data and resources
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCacheUpdate}
              disabled={isLoading}
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Update
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* PWA Benefits */}
      <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
        <h3 className="font-semibold mb-4">Benefits of Installing Cush</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start space-x-2">
            <Check className="h-4 w-4 text-green-600 mt-0.5" />
            <span>Faster loading times with offline caching</span>
          </div>
          <div className="flex items-start space-x-2">
            <Check className="h-4 w-4 text-green-600 mt-0.5" />
            <span>Native app-like experience</span>
          </div>
          <div className="flex items-start space-x-2">
            <Check className="h-4 w-4 text-green-600 mt-0.5" />
            <span>Push notifications for important updates</span>
          </div>
          <div className="flex items-start space-x-2">
            <Check className="h-4 w-4 text-green-600 mt-0.5" />
            <span>Access to financial data while offline</span>
          </div>
          <div className="flex items-start space-x-2">
            <Check className="h-4 w-4 text-green-600 mt-0.5" />
            <span>Automatic background data synchronization</span>
          </div>
          <div className="flex items-start space-x-2">
            <Check className="h-4 w-4 text-green-600 mt-0.5" />
            <span>Secure, encrypted local data storage</span>
          </div>
        </div>
      </div>
    </div>
  );
}