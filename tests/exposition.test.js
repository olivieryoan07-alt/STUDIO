import { test, assert } from './harness.js';
import { exposition } from '../src/core/exposition.js';
import { grayImage, aplat } from './fixtures-image.js';

test('un gris moyen n est ni crame ni bouche', () => {
  const e = exposition(aplat(40, 40, 128), 250, 8);
  assert(e.crame === 0 && e.bouche === 0);
});

test('la fraction cramee est exacte', () => {
  // une colonne sur quatre a 255
  const g = grayImage(40, 40, (x) => (x % 4 === 0 ? 255 : 100));
  assert(Math.abs(exposition(g, 250, 8).crame - 0.25) < 1e-9);
});

test('les seuils sont inclusifs', () => {
  assert(exposition(aplat(10, 10, 250), 250, 8).crame === 1);
  assert(exposition(aplat(10, 10, 8), 250, 8).bouche === 1);
});
