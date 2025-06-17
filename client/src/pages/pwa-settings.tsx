import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Smartphone, 
  Bell, 
  Download, 
  Wifi, 
  RefreshCw, 
  Shield,
  Settings,
  ArrowLeft
} from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { useLocation } from 'wouter';
import { EnhancedSidebar } from '@/components/enhanced-sidebar';

export default function PWASettings() {
  const [, setLocation] = useLocation();
  const { 
    isInstallable, 
    isInstalled, 
    isOnline, 
    isUpdateAvailable,
    installApp,
    updateApp,
    requestNotificationPermission 
  } = usePWA();

  const [notificationsEnabled, setNotificationsEnabled] = React.useState(
    Notification.permission === 'granted'
  );

  const handleInstall = async () => {
    try {
      await installApp();
    } catch (error) {
      console.error('Installation failed:', error);
    }
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled) {
      try {
        const permission = await requestNotificationPermission();
        setNotificationsEnabled(permission === 'granted');
      } catch (error) {
        console.error('Notification permission failed:', error);
        setNotificationsEnabled(false);
      }
    } else {
      setNotificationsEnabled(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <EnhancedSidebar />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        <div className="flex-1 overflow-auto">
          <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/settings')}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">PWA Settings</h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Manage your Progressive Web App preferences
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Installation Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Smartphone className="h-5 w-5 mr-2" />
                    App Installation
                  </CardTitle>
                  <CardDescription>
                    Install Cush as a native app for better performance and offline access
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span>Installation Status:</span>
                      <Badge variant={isInstalled ? "default" : "secondary"}>
                        {isInstalled ? "Installed" : "Not Installed"}
                      </Badge>
                    </div>
                    {isInstallable && !isInstalled && (
                      <Button onClick={handleInstall} size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Install App
                      </Button>
                    )}
                  </div>
                  
                  {isInstalled && (
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                      <p className="text-sm text-green-800 dark:text-green-200">
                        Cush is installed and ready to use offline!
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Update Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <RefreshCw className="h-5 w-5 mr-2" />
                    App Updates
                  </CardTitle>
                  <CardDescription>
                    Keep your app up to date with the latest features and security fixes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span>Update Status:</span>
                      <Badge variant={isUpdateAvailable ? "destructive" : "default"}>
                        {isUpdateAvailable ? "Update Available" : "Up to Date"}
                      </Badge>
                    </div>
                    {isUpdateAvailable && (
                      <Button onClick={updateApp} size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Update Now
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Notifications */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bell className="h-5 w-5 mr-2" />
                    Push Notifications
                  </CardTitle>
                  <CardDescription>
                    Receive important updates about your finances and community events
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notifications">Enable Notifications</Label>
                    <Switch
                      id="notifications"
                      checked={notificationsEnabled}
                      onCheckedChange={handleNotificationToggle}
                    />
                  </div>
                  
                  {notificationsEnabled && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        You'll receive notifications for transaction alerts, goal achievements, and community updates.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Offline Features */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Wifi className="h-5 w-5 mr-2" />
                    Offline Features
                  </CardTitle>
                  <CardDescription>
                    Access your financial data even when offline
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span>Connection Status:</span>
                      <Badge variant={isOnline ? "default" : "secondary"}>
                        {isOnline ? "Online" : "Offline"}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Available Offline:</h4>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <li>• View cached dashboard data</li>
                      <li>• Access recent transactions</li>
                      <li>• Browse community insights</li>
                      <li>• Use financial calculators</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Security & Privacy */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Security & Privacy
                  </CardTitle>
                  <CardDescription>
                    Your data is protected with enterprise-grade security
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">PWA Security Features:</h4>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <li>• HTTPS encryption for all data transmission</li>
                      <li>• Local data encryption for offline storage</li>
                      <li>• Automatic security updates</li>
                      <li>• Secure service worker implementation</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Technical Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    Technical Information
                  </CardTitle>
                  <CardDescription>
                    Technical details about your PWA installation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Service Worker:</strong> {
                        'serviceWorker' in navigator ? 'Supported' : 'Not Supported'
                      }
                    </div>
                    <div>
                      <strong>Push Notifications:</strong> {
                        'Notification' in window ? 'Supported' : 'Not Supported'
                      }
                    </div>
                    <div>
                      <strong>Background Sync:</strong> {
                        'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype 
                          ? 'Supported' : 'Not Supported'
                      }
                    </div>
                    <div>
                      <strong>App Cache:</strong> Active
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}