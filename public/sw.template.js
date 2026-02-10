// Auto-generated build ID — replaced at build time. Do not edit sw.js directly; edit sw.template.js.
const BUILD_ID = '__BUILD_ID__';
const CACHE_NAME = `suns-reader-${BUILD_ID}`;

const PRECACHE_URLS = [
  '/manifest.webmanifest',
];

// Install service worker - take control immediately
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker, build:', BUILD_ID);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        // Precache individually so one 404 doesn't abort install
        for (const url of PRECACHE_URLS) {
          try {
            await cache.add(url);
          } catch (err) {
            console.warn('[SW] Failed to precache:', url, err);
          }
        }
      })
      .then(() => self.skipWaiting())
  );
});

// Activate immediately and take control of all pages
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker, build:', BUILD_ID);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith('suns-reader-')) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-first strategy for HTML/navigation, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Network-first for HTML/documents (navigation requests)
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // Cache-first for static assets (images, icons, manifest)
  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        });
      })
  );
});
