// ==================== CONSISTENCYPULSE SERVICE WORKER ====================
// Enables offline use, faster loads, and better reliability for Kenya's networks

const CACHE_NAME = 'consistency-pulse-v2';
const BASE = '/consistency-pulse';  // 👈 CHANGE 1: Added for GitHub Pages

const ASSETS_TO_CACHE = [
  BASE + '/',                        // 👈 CHANGE 2: Prepend BASE
  BASE + '/index.html',
  BASE + '/style.css',
  BASE + '/app.js',
  BASE + '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700&display=swap',
  'https://cdn-icons-png.flaticon.com/512/1827/1827341.png',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1'
];

// ---------- INSTALL EVENT ----------
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('[SW] All assets cached successfully');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[SW] Cache failed:', err);
      })
  );
});

// ---------- ACTIVATE EVENT ----------
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Claiming clients');
      return self.clients.claim();
    })
  );
});

// ---------- FETCH EVENT ----------
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== location.origin && !url.href.includes('fonts.googleapis.com') && !url.href.includes('cdn.jsdelivr.net')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          fetch(event.request).then((networkResponse) => {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }).catch(() => {});
          
          return cachedResponse;
        }

        return fetch(event.request)
          .then((networkResponse) => {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
            return networkResponse;
          })
          .catch(() => {
            if (event.request.mode === 'navigate') {
              return caches.match(BASE + '/index.html');  // 👈 CHANGE 3: Use BASE
            }
            return new Response('Offline: Resource not available', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// ---------- PUSH NOTIFICATION EVENT ----------
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  
  let data = {
    title: '🔥 ConsistencyPulse',
    body: 'Time to check your habits! Keep your streak alive.',
    icon: 'https://cdn-icons-png.flaticon.com/512/1827/1827341.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/1827/1827341.png',
    vibrate: [100, 50, 100],
    tag: 'daily-reminder'
  };
  
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {}
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      vibrate: data.vibrate,
      tag: data.tag,
      renotify: true,
      requireInteraction: false,
      actions: [
        { action: 'open', title: 'Open App' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    })
  );
});

// ---------- NOTIFICATION CLICK EVENT ----------
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' || event.action === '') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          for (const client of clientList) {
            if (client.url.includes(self.registration.scope) && 'focus' in client) {
              return client.focus();
            }
          }
          return clients.openWindow(BASE + '/');  // Optional: Use BASE here too
        })
    );
  }
});

// ---------- BACKGROUND SYNC ----------
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-habits') {
    event.waitUntil(
      console.log('[SW] Background sync triggered')
    );
  }
});

console.log('[SW] Service Worker registered successfully!');