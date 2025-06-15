import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Bell, Wifi, WifiOff, Smartphone, X, RefreshCw } from 'lucide-react';
import { pwaManager } from '@/utils/pwa';
import { useToast } from "@/hooks/use-toast";

// PWA Install Prompt Component
export function PWAInstallPrompt() {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleInstallAvailable = () => setShowInstallPrompt(true);
    const handleInstallCompleted = () => setShowInstallPrompt(false);

    window.addEventListener('pwa-install-available', handleInstallAvailable);
    window.addEventListener('pwa-install-completed', handleInstallCompleted);

    return () => {
      window.removeEventListener('pwa-install-available', handleInstallAvailable);
      window.removeEventListener('pwa-install-completed', handleInstallCompleted);
    };
  }, []);

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const success = await pwaManager.installApp();
      if (success) {
        toast({
          title: "App Installed",
          description: "Cush has been installed successfully! You can now access it from your home screen.",
        });
        setShowInstallPrompt(false);
      } else {
        toast({
          title: "Installation Cancelled",
          description: "The app installation was cancelled.",
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
      setIsInstalling(false);
    }
  };

  if (!showInstallPrompt) return null;

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-sm">Install Cush App</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowInstallPrompt(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription className="text-xs">
          Get the full native app experience with offline access and push notifications.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex space-x-2">
          <Button
            onClick={handleInstall}
            disabled={isInstalling}
            className="flex-1"
            size="sm"
          >
            {isInstalling ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Installing...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Install
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInstallPrompt(false)}
          >
            Later
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// PWA Notification Permission Prompt
export function PWANotificationPrompt() {
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleNotificationPrompt = () => setShowNotificationPrompt(true);

    window.addEventListener('pwa-notification-prompt', handleNotificationPrompt);

    return () => {
      window.removeEventListener('pwa-notification-prompt', handleNotificationPrompt);
    };
  }, []);

  const handleEnableNotifications = async () => {
    setIsRequesting(true);
    try {
      const success = await pwaManager.requestNotificationPermission();
      if (success) {
        toast({
          title: "Notifications Enabled",
          description: "You'll now receive important financial updates and alerts.",
        });
        setShowNotificationPrompt(false);
      } else {
        toast({
          title: "Notifications Denied",
          description: "You can enable notifications later in your browser settings.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to enable notifications. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRequesting(false);
    }
  };

  if (!showNotificationPrompt) return null;

  return (
    <Alert className="fixed top-4 right-4 w-80 z-50">
      <Bell className="h-4 w-4" />
      <AlertDescription className="flex flex-col space-y-3">
        <div>
          <strong>Enable Notifications?</strong>
          <p className="text-sm text-muted-foreground mt-1">
            Get real-time alerts for important financial updates and AI insights.
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={handleEnableNotifications}
            disabled={isRequesting}
            size="sm"
          >
            {isRequesting ? "Enabling..." : "Enable"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNotificationPrompt(false)}
          >
            Not Now
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

// PWA Update Available Prompt
export function PWAUpdatePrompt() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleUpdateAvailable = () => setShowUpdatePrompt(true);

    window.addEventListener('pwa-update-available', handleUpdateAvailable);

    return () => {
      window.removeEventListener('pwa-update-available', handleUpdateAvailable);
    };
  }, []);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await pwaManager.updateServiceWorker();
      toast({
        title: "Update Applied",
        description: "The app has been updated to the latest version.",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update the app. Please refresh the page.",
        variant: "destructive",
      });
      setIsUpdating(false);
    }
  };

  if (!showUpdatePrompt) return null;

  return (
    <Alert className="fixed top-4 left-4 w-80 z-50">
      <RefreshCw className="h-4 w-4" />
      <AlertDescription className="flex flex-col space-y-3">
        <div>
          <strong>Update Available</strong>
          <p className="text-sm text-muted-foreground mt-1">
            A new version of Cush is available with improvements and new features.
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={handleUpdate}
            disabled={isUpdating}
            size="sm"
          >
            {isUpdating ? "Updating..." : "Update Now"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUpdatePrompt(false)}
          >
            Later
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

// PWA Connection Status Component
export function PWAConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);

  useEffect(() => {
    const handleConnectionChange = (online: boolean) => {
      setIsOnline(online);
      if (!online) {
        setShowOfflineAlert(true);
      } else {
        setShowOfflineAlert(false);
      }
    };

    pwaManager.setupConnectionListener(handleConnectionChange);

    // Initial check
    setIsOnline(pwaManager.isOnline());
  }, []);

  return (
    <>
      {/* Connection Status Badge */}
      <Badge 
        variant={isOnline ? "default" : "destructive"} 
        className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40"
      >
        {isOnline ? (
          <>
            <Wifi className="h-3 w-3 mr-1" />
            Online
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3 mr-1" />
            Offline
          </>
        )}
      </Badge>

      {/* Offline Alert */}
      {showOfflineAlert && (
        <Alert className="fixed bottom-4 left-4 w-80 z-50">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            <strong>You're offline</strong>
            <p className="text-sm text-muted-foreground mt-1">
              Some features may be limited. Your data will sync when you're back online.
            </p>
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}

// PWA Status Component (combines all PWA features)
export function PWAStatus() {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    // Check initial states
    setNotificationPermission(pwaManager.getNotificationPermission());
    setIsInstallable(pwaManager.isInstallable());

    // Listen for changes
    const handleInstallAvailable = () => setIsInstallable(true);
    const handleInstallCompleted = () => setIsInstallable(false);

    window.addEventListener('pwa-install-available', handleInstallAvailable);
    window.addEventListener('pwa-install-completed', handleInstallCompleted);

    return () => {
      window.removeEventListener('pwa-install-available', handleInstallAvailable);
      window.removeEventListener('pwa-install-completed', handleInstallCompleted);
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">App Features</h3>
      </div>
      
      <div className="grid gap-4">
        {/* Installation Status */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center space-x-3">
            <Smartphone className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium">App Installation</p>
              <p className="text-sm text-muted-foreground">
                {isInstallable ? "Ready to install" : "Installed or not available"}
              </p>
            </div>
          </div>
          <Badge variant={isInstallable ? "default" : "secondary"}>
            {isInstallable ? "Available" : "Installed"}
          </Badge>
        </div>

        {/* Notification Status */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center space-x-3">
            <Bell className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium">Push Notifications</p>
              <p className="text-sm text-muted-foreground">
                {notificationPermission === 'granted' ? "Enabled" : 
                 notificationPermission === 'denied' ? "Blocked" : "Not configured"}
              </p>
            </div>
          </div>
          <Badge variant={
            notificationPermission === 'granted' ? "default" : 
            notificationPermission === 'denied' ? "destructive" : "secondary"
          }>
            {notificationPermission === 'granted' ? "Enabled" : 
             notificationPermission === 'denied' ? "Blocked" : "Pending"}
          </Badge>
        </div>

        {/* Offline Support */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center space-x-3">
            <WifiOff className="h-5 w-5 text-purple-600" />
            <div>
              <p className="font-medium">Offline Support</p>
              <p className="text-sm text-muted-foreground">
                Access your data even without internet
              </p>
            </div>
          </div>
          <Badge variant="default">Active</Badge>
        </div>
      </div>
    </div>
  );
}

// Main PWA Manager Component
export function PWAManager() {
  return (
    <>
      <PWAInstallPrompt />
      <PWANotificationPrompt />
      <PWAUpdatePrompt />
      <PWAConnectionStatus />
    </>
  );
}