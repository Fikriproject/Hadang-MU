const CACHE_NAME = 'hadangmu-pwa-v3';
const STATIC_ASSETS = [
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/maskable-icon-512x512.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never intercept Supabase, non-GET, extension schemes, or streaming endpoints
  if (
    event.request.method !== 'GET' ||
    !url.protocol.startsWith('http') ||
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/api/') ||
    event.request.headers.get('accept')?.includes('text/event-stream')
  ) {
    return;
  }

  // For HTML page navigation: Always get fresh HTML from network so Next.js chunk hashes are never stale!
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        return new Response('Aplikasi sedang offline. Sambungkan kembali ke internet.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      })
    );
    return;
  }

  // Network-first strategy with safe cache fallback for static assets
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) {
          return cached;
        }
        return new Response('', {
          status: 408,
          statusText: 'Request timeout',
        });
      })
  );
});


