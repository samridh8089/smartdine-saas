const CACHE_NAME = 'smartdine-lite-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/super-admin/',
  '/owner/',
  '/kitchen/',
  '/waiter/',
  '/customer/',
  '/src/styles/main.css',
  '/src/styles/glassmorphism.css',
  '/src/api/gas.js',
  'https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  // Only intercept GET requests, ignore POST/API calls
  if (event.request.method !== 'GET') return;
  // Ignore cross-origin requests unless it's our sound
  if (!event.request.url.startsWith(self.location.origin) && !event.request.url.includes('mixkit')) return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request).then(
          function(response) {
            // Check if we received a valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            var responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
