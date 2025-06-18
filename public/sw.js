const CACHE_NAME = 'cush-v1.0.0';
const OFFLINE_URL = '/offline.html';

// Core assets to cache for offline functionality
const CORE_ASSETS = [
  '/',
  '/dashboard',
  '/imisi',
  '/community',
  '/login',
  '/register',
  '/offline.html',
  '/manifest.json'
];

// API endpoints to cache for offline access
const API_CACHE_PATTERNS = [
  '/api/auth/me',
  '/api/dashboard',
  '/api/balance-history',
  '/api/transactions/recent'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(CORE_ASSETS);
      })
      // Don't skip waiting to prevent aggressive updates
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
    // Don't claim clients immediately to prevent forced refreshes
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return caches.open(CACHE_NAME)
            .then((cache) => {
              return cache.match(OFFLINE_URL);
            });
        })
    );
    return;
  }

  // Handle API requests with cache-first strategy for specific endpoints
  if (url.pathname.startsWith('/api/')) {
    const shouldCache = API_CACHE_PATTERNS.some(pattern => 
      url.pathname.includes(pattern.replace('/api', ''))
    );

    if (shouldCache && request.method === 'GET') {
      event.respondWith(
        caches.open(CACHE_NAME)
          .then((cache) => {
            return cache.match(request)
              .then((cachedResponse) => {
                if (cachedResponse) {
                  // Return cached version and update in background
                  fetch(request)
                    .then((networkResponse) => {
                      if (networkResponse.ok) {
                        cache.put(request, networkResponse.clone());
                      }
                    })
                    .catch(() => {
                      // Network failed, but we have cached version
                    });
                  return cachedResponse;
                }

                // No cached version, try network
                return fetch(request)
                  .then((networkResponse) => {
                    if (networkResponse.ok) {
                      cache.put(request, networkResponse.clone());
                    }
                    return networkResponse;
                  })
                  .catch(() => {
                    // Return offline indicator for API calls
                    return new Response(
                      JSON.stringify({ 
                        error: 'offline', 
                        message: 'This feature is not available offline' 
                      }),
                      {
                        status: 503,
                        headers: { 'Content-Type': 'application/json' }
                      }
                    );
                  });
              });
          })
      );
      return;
    }
  }

  // Handle static assets with cache-first strategy
  if (request.destination === 'style' || 
      request.destination === 'script' || 
      request.destination === 'image') {
    event.respondWith(
      caches.open(CACHE_NAME)
        .then((cache) => {
          return cache.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              return fetch(request)
                .then((networkResponse) => {
                  if (networkResponse.ok) {
                    cache.put(request, networkResponse.clone());
                  }
                  return networkResponse;
                });
            });
        })
    );
    return;
  }

  // Default: network first, cache fallback
  event.respondWith(
    fetch(request)
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Background sync for failed API requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle queued requests when connection is restored
      syncQueuedRequests()
    );
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    data: data.data,
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/view-icon.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss-icon.png'
      }
    ],
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    const urlToOpen = event.notification.data?.url || '/dashboard';
    
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then((clientList) => {
          // Check if app is already open
          for (const client of clientList) {
            if (client.url.includes(urlToOpen) && 'focus' in client) {
              return client.focus();
            }
          }
          // Open new window if app not open
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

// Helper function to sync queued requests
async function syncQueuedRequests() {
  try {
    const cache = await caches.open('pending-requests');
    const requests = await cache.keys();
    
    for (const request of requests) {
      try {
        await fetch(request);
        await cache.delete(request);
      } catch (error) {
        console.log('Failed to sync request:', error);
      }
    }
  } catch (error) {
    console.log('Background sync failed:', error);
  }
}

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});