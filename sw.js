// Cache du socle. Liste en dur : pas d'etape de compilation dans ce projet.
const CACHE = 'studio-v0.5.0';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './vendor/mp4box.all.min.js',
  './src/core/track-summary.js',
  './src/probe/caps.js',
  './src/probe/inspect.js',
  './src/probe/roundtrip.js',
  './src/probe/share.js',
  './src/core/crop.js',
  './src/core/with-resources.js',
  './src/core/draw-plan.js',
  './vendor/mp4-muxer.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      if (res && res.ok && new URL(e.request.url).origin === location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
      }
      return res;
    }).catch(() => hit))
  );
});
