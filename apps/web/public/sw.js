/* Amstel Rewards service worker — conservative, SPA-safe.
 *
 * Strategy:
 *  - Navigations (HTML): network-first, falling back to the cached /offline page.
 *  - Same-origin /_next/static/ and images: cache-first (immutable, hashed assets).
 *  - /api/ and any cross-origin request: never intercepted or cached.
 *
 * Bump CACHE on every meaningful SW change to evict stale entries.
 */
const CACHE = 'amstel-v1';
const OFFLINE_URL = '/offline';

// Minimal precache: the offline fallback + core brand assets.
const PRECACHE_URLS = [OFFLINE_URL, '/manifest.webmanifest', '/amstel-logo.jpg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    /\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?)$/i.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET; everything else (POST/PUT/etc.) passes straight through.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never touch cross-origin requests or the API — let the network handle them.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Navigation requests: network-first with offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((cached) => cached || Response.error()),
      ),
    );
    return;
  }

  // Static assets: cache-first, then populate the cache on miss.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      }),
    );
    return;
  }

  // Everything else (e.g. RSC/data fetches): leave to the network.
});
