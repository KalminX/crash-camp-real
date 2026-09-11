/**
 * Crash Camp — Production PWA Service Worker.
 * Enables 100% offline gameplay, instantaneous asset loading, and 3D model caching.
 */

const CACHE_VERSION = 'v1';
const CACHE_SHELL = `crashcamp-shell-${CACHE_VERSION}`;
const CACHE_MODELS = `crashcamp-models-${CACHE_VERSION}`;

// Critical app shell assets precached on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/favicon.ico',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/models/airplane.glb',
  '/models/crash_site.glb',
  '/maps/sceneOneMap.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_SHELL).then((cache) => {
      console.log('[SW] Precaching app shell assets...');
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_SHELL && key !== CACHE_MODELS) {
            console.log('[SW] Purging obsolete cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only intercept GET requests on same origin
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 1. Navigation requests (HTML page): Network-first with Cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_SHELL).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // 2. 3D GLTF/GLB models & Scene Maps: Cache-First (Instant 0ms launch & full offline play)
  if (url.pathname.includes('/models/') || url.pathname.includes('/maps/') || url.pathname.endsWith('.glb')) {
    event.respondWith(
      caches.open(CACHE_MODELS).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          // If offline and not in models cache, check shell cache fallback
          const shellFallback = await caches.match(request);
          if (shellFallback) return shellFallback;
          throw err;
        }
      })
    );
    return;
  }

  // 3. Static assets (JS chunks, CSS, Icons, Fonts): Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_SHELL).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      }).catch((err) => {
        // Suppress network error if cached response exists
        if (!cachedResponse) throw err;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
