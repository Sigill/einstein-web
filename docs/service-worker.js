const CACHE_NAME = 'einstein-cache-7c7dd720731b9058df7adeef07a98f74ace999a8';
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
