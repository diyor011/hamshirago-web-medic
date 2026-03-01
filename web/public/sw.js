const CACHE_NAME = 'hamshirago-v1';
const STATIC_SHELL = ['/auth'];

// Install: pre-cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate: remove stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: cache-first for static assets, network-first for navigation
// Disabled on localhost to avoid interfering with the dev server
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip SW caching entirely in local development
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return;

  // Don't intercept API requests — always need fresh data
  if (url.pathname.startsWith('/api/')) return;

  // Cache-first for Next.js static assets (JS, CSS, fonts, images)
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => cached || new Response('', { status: 503 }));
      })
    );
    return;
  }

  // Network-first for navigation — fallback to cached /auth when offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then((cached) => cached || caches.match('/auth'))
      )
    );
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'HamshiraGo', {
      body: data.body || '',
      icon: data.icon || '/icon',
      badge: data.badge || '/icon',
      data: { url: data.url || '/' },
      requireInteraction: false,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            return client.focus().then(() => {
              if ('navigate' in client) return client.navigate(url);
            });
          }
        }
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});
