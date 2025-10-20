const CACHE_NAME = 'qrlocal-v3p-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './studio.html',
  './profile.html',
  './cards.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  e.respondWith(
    caches.match(req).then(res => res || fetch(req).then(networkRes => {
      if(req.method === 'GET' && networkRes && networkRes.status === 200 && networkRes.type === 'basic') {
        const copy = networkRes.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy));
      }
      return networkRes;
    }).catch(() => caches.match('./index.html')))
  );
});
