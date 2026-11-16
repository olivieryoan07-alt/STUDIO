// Service worker — module ES (enregistre avec {type:'module'}).
//
// Regle de routage dans src/core/cache-strategy.js, couverte par des tests.
// Ne jamais remettre un "cache d'abord" global ici : c'est ce qui avait
// verrouille l'app en v0.5.0 le 2026-11-14, sw.js se servant lui-meme depuis
// son propre cache et ne pouvant donc plus jamais se remplacer.

import { cacheStrategy } from './src/core/cache-strategy.js';

const VERSION = '0.15.0';
const CACHE = 'studio-' + VERSION;

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './vendor/mp4box.all.min.js',
  './vendor/mp4-muxer.js',
  './src/core/track-summary.js',
  './src/core/crop.js',
  './src/core/draw-plan.js',
  './src/core/with-resources.js',
  './src/core/cache-strategy.js',
  './src/core/report.js',
  './src/probe/caps.js',
  './src/probe/inspect.js',
  './src/probe/roundtrip.js',
  './src/probe/share.js',
  './src/probe/audio.js',
  './src/probe/encoder-selftest.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // addAll echoue en bloc si un seul fichier manque : on tolere les trous
      .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'version' && e.source) e.source.postMessage({ swVersion: VERSION });
});

function keep(request, response) {
  if (response && response.ok) {
    const copy = response.clone();
    caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
  }
  return response;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const strategy = cacheStrategy(new URL(req.url), self.location.origin, req.mode);
  if (strategy === 'bypass') return;

  if (strategy === 'network-first') {
    e.respondWith(
      fetch(req)
        .then((res) => keep(req, res))
        .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => keep(req, res)))
  );
});
