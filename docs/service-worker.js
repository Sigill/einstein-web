const CACHE_NAME = 'einstein-cache-5a323e0e2e84d1891dbb34e539037e68da0c6ac3';
const ASSETS = [
  'index.html',
  'app.css',
  'app.js',
  'assets/fonts/open-sans/open-sans-latin-400-normal.woff2',
  'assets/fonts/open-sans/open-sans-math-400-normal.woff2',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
