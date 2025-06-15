// PWA utilities for service worker registration, installation prompts, and push notifications

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

class PWAManager {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private initialized: boolean = false;

  constructor() {
    // Don't auto-initialize in constructor to avoid double registration
  }

  // Initialize PWA features
  init() {
    if (this.initialized) return;
    
    this.initialized = true;
    this.setupInstallPrompt();
    this.setupPushNotifications();
  }

  // Service Worker Registration
  private async initializeServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        console.log('[PWA] Registering service worker...');
        
        const registration = await navigator.serviceWorker.register('/service-worker.js', {
          scope: '/'
        });

        this.swRegistration = registration;

        if (registration.installing) {
          console.log('[PWA] Service worker installing...');
        } else if (registration.waiting) {
          console.log('[PWA] Service worker installed, waiting for activation');
          this.showUpdateAvailable();
        } else if (registration.active) {
          console.log('[PWA] Service worker active');
        }

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.showUpdateAvailable();
              }
            });
          }
        });

        // Handle messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          this.handleServiceWorkerMessage(event.data);
        });

        console.log('[PWA] Service worker registered successfully');
      } catch (error) {
        console.error('[PWA] Service worker registration failed:', error);
      }
    } else {
      console.log('[PWA] Service workers not supported');
    }
  }

  // Installation Prompt Management
  private setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.showInstallButton();
    });

    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed successfully');
      this.hideInstallButton();
      this.deferredPrompt = null;
    });
  }

  // Push Notifications Setup
  private setupPushNotifications() {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      // Request permission on app load if not already granted
      if (Notification.permission === 'default') {
        this.showNotificationPrompt();
      }
    }
  }

  // Public Methods

  async installApp(): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.log('[PWA] No install prompt available');
      return false;
    }

    try {
      await this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('[PWA] User accepted the install prompt');
        this.hideInstallButton();
        return true;
      } else {
        console.log('[PWA] User dismissed the install prompt');
        return false;
      }
    } catch (error) {
      console.error('[PWA] Error during installation:', error);
      return false;
    } finally {
      this.deferredPrompt = null;
    }
  }

  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('[PWA] Notifications not supported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        console.log('[PWA] Notification permission granted');
        await this.subscribeToPushNotifications();
        return true;
      } else {
        console.log('[PWA] Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('[PWA] Error requesting notification permission:', error);
      return false;
    }
  }

  async subscribeToPushNotifications(): Promise<boolean> {
    if (!this.swRegistration) {
      console.error('[PWA] Service worker not registered');
      return false;
    }

    try {
      // Check if already subscribed
      const existingSubscription = await this.swRegistration.pushManager.getSubscription();
      if (existingSubscription) {
        console.log('[PWA] Already subscribed to push notifications');
        return true;
      }

      // Subscribe to push notifications
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.getVAPIDPublicKey())
      });

      // Send subscription to backend
      await this.sendSubscriptionToBackend(subscription);
      console.log('[PWA] Successfully subscribed to push notifications');
      return true;
    } catch (error) {
      console.error('[PWA] Error subscribing to push notifications:', error);
      return false;
    }
  }

  async unsubscribeFromPushNotifications(): Promise<boolean> {
    if (!this.swRegistration) {
      console.error('[PWA] Service worker not registered');
      return false;
    }

    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await this.removeSubscriptionFromBackend(subscription);
        console.log('[PWA] Successfully unsubscribed from push notifications');
        return true;
      }
      return false;
    } catch (error) {
      console.error('[PWA] Error unsubscribing from push notifications:', error);
      return false;
    }
  }

  isInstallable(): boolean {
    return this.deferredPrompt !== null;
  }

  isNotificationSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  getNotificationPermission(): NotificationPermission {
    return Notification.permission;
  }

  // Offline/Online Status
  isOnline(): boolean {
    return navigator.onLine;
  }

  setupConnectionListener(callback: (isOnline: boolean) => void) {
    window.addEventListener('online', () => callback(true));
    window.addEventListener('offline', () => callback(false));
  }

  // Private Helper Methods

  private showInstallButton() {
    // Dispatch custom event for UI components to listen to
    window.dispatchEvent(new CustomEvent('pwa-install-available'));
  }

  private hideInstallButton() {
    window.dispatchEvent(new CustomEvent('pwa-install-completed'));
  }

  private showUpdateAvailable() {
    window.dispatchEvent(new CustomEvent('pwa-update-available'));
  }

  private showNotificationPrompt() {
    window.dispatchEvent(new CustomEvent('pwa-notification-prompt'));
  }

  private handleServiceWorkerMessage(data: any) {
    switch (data.type) {
      case 'CACHE_UPDATED':
        console.log('[PWA] Cache updated');
        break;
      case 'BACKGROUND_SYNC':
        console.log('[PWA] Background sync completed');
        break;
      default:
        console.log('[PWA] Unknown message from service worker:', data);
    }
  }

  private async sendSubscriptionToBackend(subscription: PushSubscription): Promise<void> {
    try {
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send subscription to backend');
      }
    } catch (error) {
      console.error('[PWA] Error sending subscription to backend:', error);
      throw error;
    }
  }

  private async removeSubscriptionFromBackend(subscription: PushSubscription): Promise<void> {
    try {
      const response = await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to remove subscription from backend');
      }
    } catch (error) {
      console.error('[PWA] Error removing subscription from backend:', error);
      throw error;
    }
  }

  private getVAPIDPublicKey(): string {
    // This should be your VAPID public key from the backend
    // For now, using a placeholder - this should be configured in environment variables
    return 'BEl62iUYgUivxIkv69yViEuiBIa40HI8TqbjHBfM5MWPgp7yMtJEKHkJnZfQpZw1x5LDdEY7v9e9-s5s7WP-KCw';
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Update Service Worker
  async updateServiceWorker(): Promise<void> {
    if (this.swRegistration && this.swRegistration.waiting) {
      this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }

  // Background Sync
  async scheduleBackgroundSync(tag: string): Promise<void> {
    if (this.swRegistration && 'sync' in this.swRegistration) {
      try {
        await this.swRegistration.sync.register(tag);
        console.log('[PWA] Background sync scheduled:', tag);
      } catch (error) {
        console.error('[PWA] Background sync registration failed:', error);
      }
    }
  }
}

// Export singleton instance
export const pwaManager = new PWAManager();

// Export types for TypeScript support
export type { BeforeInstallPromptEvent };