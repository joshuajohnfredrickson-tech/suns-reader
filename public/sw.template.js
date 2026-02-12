// Auto-generated build ID — replaced at build time. Do not edit sw.js directly; edit sw.template.js.
const BUILD_ID = '__BUILD_ID__';
const CACHE_NAME = `suns-reader-${BUILD_ID}`;

const PRECACHE_URLS = [
  '/manifest.webmanifest',
];

// Positive allowlist: only these patterns get cache-first treatment.
// Everything else either uses network-first (navigation) or network-only (default).
function isStaticAsset(pathname) {
  // Next.js immutable build assets (content-hashed)
  if (pathname.startsWith('/_next/static/')) return true;
  // App icons
  if (pathname.startsWith('/icons/')) return true;
  // Favicons and apple touch icons
  if (pathname === '/favicon.ico' || pathname.startsWith('/favicon-') || pathname === '/apple-touch-icon.png') return true;
  // Manifest
  if (pathname === '/manifest.webmanifest') return true;
  // Static file extensions (images, fonts, etc.)
  if (/\.(png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|eot)$/i.test(pathname)) return true;
  return false;
}

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

// Activate immediately and take control of all pages.
// Also purge any previously cached /api/* entries from older SW versions.
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker, build:', BUILD_ID);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old versioned caches entirely
          if (cacheName !== CACHE_NAME && cacheName.startsWith('suns-reader-')) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
          // For the current cache, purge any /api/* entries left by the old SW
          if (cacheName === CACHE_NAME) {
            return caches.open(cacheName).then((cache) => {
              return cache.keys().then((requests) => {
                return Promise.all(
                  requests.map((req) => {
                    const reqUrl = new URL(req.url);
                    if (reqUrl.pathname.startsWith('/api/')) {
                      console.log('[SW] Purging cached API entry:', reqUrl.pathname);
                      return cache.delete(req);
                    }
                  })
                );
              });
            });
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Allow the client (ServiceWorkerManager) to force-activate a waiting SW
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] SKIP_WAITING received, activating now');
    self.skipWaiting();
  }
});

// Fetch strategy:
//   - GET only — let the browser handle non-GET natively
//   - /api/*  — network-only (never cache API responses)
//   - Navigation/HTML — network-first with offline fallback
//   - Static assets (allowlisted) — cache-first for performance
//   - Everything else — network-only (safe default)
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only intercept GET requests; let POST/PUT/DELETE etc. pass through natively
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // API routes — always network-only, never cache
  if (url.pathname.startsWith('/api/')) {
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

  // Cache-first for known static assets only
  if (isStaticAsset(url.pathname)) {
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
    return;
  }

  // Everything else — network-only (safe default)
  // This covers Next.js data fetches, RSC payloads, etc.
});
