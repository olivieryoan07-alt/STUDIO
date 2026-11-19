import { test, assert } from './harness.js';
import { empreinte, distance } from '../src/core/empreinte.js';
import { aplat, damier, horizonIncline } from './fixtures-image.js';

test('une image est identique a elle-meme', () => {
  const g = damier(64, 64, 7);
  assert(distance(empreinte(g, 64, 64), empreinte(g, 64, 64)) === 0);
});

test('l empreinte resiste a un changement de luminosite', () => {
  const g = damier(64, 64, 7);
  const clair = Uint8ClampedArray.from(g, (v) => Math.min(255, v + 40));
  assert(distance(empreinte(g, 64, 64), empreinte(clair, 64, 64)) <= 2);
});

test('deux scenes differentes sont loin l une de l autre', () => {
  // pas de 7 et non 4 : des cases de 4 px s'annulent exactement dans les
  // blocs de 8 lignes de l'empreinte, et l'image devient un gris uni.
  const a = empreinte(damier(64, 64, 7), 64, 64);
  const b = empreinte(horizonIncline(64, 64, 0), 64, 64);
  assert(distance(a, b) > 12, 'distance ' + distance(a, b));
});

test('l empreinte fait toujours 8 octets', () => {
  assert(empreinte(aplat(31, 17, 100), 31, 17).length === 8);
});
