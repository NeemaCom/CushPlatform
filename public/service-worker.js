const CACHE_NAME = 'cush-pwa-v1';
const STATIC_CACHE_NAME = 'cush-static-v1';
const DYNAMIC_CACHE_NAME = 'cush-dynamic-v1';

// App Shell - Critical files that should be cached for offline functionality
const APP_SHELL = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/offline.html'
];

// Static assets to cache
const STATIC_ASSETS = [
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// API endpoints that should use network-first strategy
const API_ENDPOINTS = [
  '/api/dashboard',
  '/api/analytics',
  '/api/transactions',
  '/api/auth/me'
];

// API endpoints that can use cache-first strategy (less frequently changing)
const CACHEABLE_API_ENDPOINTS = [
  '/api/subscription-status',
  '/api/community/events',
  '/api/community/insights'
];

// Install event - Cache app shell and static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    Promise.all([
      // Cache app shell
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(APP_SHELL);
      }),
      // Cache static assets
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
    ]).then(() => {
      console.log('[SW] Installation complete');
      // Force activation of new service worker
      return self.skipWaiting();
    })
  );
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old caches
          if (cacheName !== CACHE_NAME && 
              cacheName !== STATIC_CACHE_NAME && 
              cacheName !== DYNAMIC_CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Activation complete');
      // Take control of all open clients
      return self.clients.claim();
    })
  );
});

// Fetch event - Implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Handle different types of requests with appropriate strategies
  if (isAppShellRequest(request)) {
    // App Shell - Cache first with network fallback
    event.respondWith(cacheFirst(request, CACHE_NAME));
  } else if (isStaticAssetRequest(request)) {
    // Static assets - Cache first
    event.respondWith(cacheFirst(request, STATIC_CACHE_NAME));
  } else if (isApiRequest(request)) {
    // API requests - Different strategies based on endpoint
    if (isCacheableApiRequest(request)) {
      // Less critical API data - Cache first with network fallback
      event.respondWith(cacheFirstWithRefresh(request, DYNAMIC_CACHE_NAME));
    } else {
      // Critical API data - Network first with cache fallback
      event.respondWith(networkFirstWithCache(request, DYNAMIC_CACHE_NAME));
    }
  } else if (isNavigationRequest(request)) {
    // Navigation requests - Network first with app shell fallback
    event.respondWith(networkFirstWithAppShell(request));
  } else {
    // Other requests - Stale while revalidate
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE_NAME));
  }
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[SW] Push message received');
  
  let notificationData = {
    title: 'Cush Financial Update',
    body: 'You have new financial insights available',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'cush-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: 'View Details',
        icon: '/icons/view-action.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss-action.png'
      }
    ],
    data: {
      url: '/dashboard'
    }
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = { ...notificationData, ...payload };
    } catch (error) {
      console.error('[SW] Error parsing push payload:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Check if the app is already open
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If app is not open, open it
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'background-transaction-sync') {
    event.waitUntil(syncTransactions());
  }
});

// Helper functions for request classification
function isAppShellRequest(request) {
  return APP_SHELL.some(url => request.url.includes(url));
}

function isStaticAssetRequest(request) {
  return request.url.includes('/static/') || 
         request.url.includes('/icons/') || 
         request.url.includes('/screenshots/') ||
         request.url.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2)$/);
}

function isApiRequest(request) {
  return request.url.includes('/api/');
}

function isCacheableApiRequest(request) {
  return CACHEABLE_API_ENDPOINTS.some(endpoint => request.url.includes(endpoint));
}

function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

// Caching strategies
async function cacheFirst(request, cacheName) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache first strategy failed:', error);
    return new Response('Offline content not available', { status: 503 });
  }
}

async function networkFirstWithCache(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback for API requests
    if (isApiRequest(request)) {
      return new Response(JSON.stringify({
        error: 'Offline',
        message: 'This feature requires an internet connection'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    throw error;
  }
}

async function cacheFirstWithRefresh(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  // Fetch in background to update cache
  const fetchPromise = fetch(request).then(async (networkResponse) => {
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => {
    // Ignore network errors for background refresh
  });

  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }

  // If not in cache, wait for network
  return fetchPromise;
}

async function staleWhileRevalidate(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request).then(async (networkResponse) => {
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });

  return cachedResponse || fetchPromise;
}

async function networkFirstWithAppShell(request) {
  try {
    return await fetch(request);
  } catch (error) {
    console.log('[SW] Navigation failed, serving app shell');
    const cache = await caches.open(CACHE_NAME);
    const appShell = await cache.match('/offline.html');
    return appShell || cache.match('/');
  }
}

// Background sync function
async function syncTransactions() {
  try {
    // Get pending transactions from IndexedDB or similar storage
    // and sync them when network is available
    console.log('[SW] Syncing transactions...');
    
    // This would typically involve:
    // 1. Getting pending transactions from local storage
    // 2. Sending them to the server
    // 3. Updating local storage with server response
    
    return Promise.resolve();
  } catch (error) {
    console.error('[SW] Transaction sync failed:', error);
    throw error;
  }
}

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});