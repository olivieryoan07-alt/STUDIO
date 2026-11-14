import { test, assert } from './harness.js';
import { cacheStrategy } from '../src/core/cache-strategy.js';

const ORIGIN = 'https://olivieryoan07-alt.github.io';
const s = (path, mode) => cacheStrategy(new URL(ORIGIN + path), ORIGIN, mode || 'no-cors');

// Bug du 2026-11-14 : l'app restait bloquee en v0.5.0. Le service worker
// servait tout depuis le cache, y compris sw.js — il ne pouvait donc plus
// jamais se remplacer. Ces tests fixent la regle qui l'empeche.

test('le service worker n’est jamais servi par le cache', () => {
  assert(s('/STUDIO/sw.js') === 'bypass',
         'sw.js doit passer en direct, sinon il se verrouille — obtenu ' + s('/STUDIO/sw.js'));
});

test('une navigation va au réseau d’abord', () => {
  assert(s('/STUDIO/', 'navigate') === 'network-first');
});

test('le code de l’app va au réseau d’abord', () => {
  assert(s('/STUDIO/index.html') === 'network-first', 'html');
  assert(s('/STUDIO/src/probe/roundtrip.js') === 'network-first', 'js de l’app');
  assert(s('/STUDIO/manifest.webmanifest') === 'network-first', 'manifest');
});

test('les ressources figées restent en cache d’abord', () => {
  assert(s('/STUDIO/icon-192.png') === 'cache-first', 'icone');
  assert(s('/STUDIO/vendor/mp4box.all.min.js') === 'cache-first',
         'les bibliotheques deposees sont figees et lourdes');
});

test('rien d’extérieur au site n’est intercepté', () => {
  assert(cacheStrategy(new URL('https://exemple.test/x.js'), ORIGIN, 'no-cors') === 'bypass');
});
