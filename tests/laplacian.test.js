import { test, assert } from './harness.js';
import { sharpness } from '../src/core/laplacian.js';
import { grayImage, aplat, damier, flou } from './fixtures-image.js';

test('un damier net est plus net que le meme damier flou', () => {
  const g = damier(64, 64, 8);
  assert(sharpness(g, 64, 64) > sharpness(flou(g, 64, 64, 3), 64, 64) * 4);
});

test('un aplat n a aucune nettete', () => {
  assert(sharpness(aplat(64, 64, 128), 64, 64) < 1e-9);
});

test('la nettete ne depend pas de la luminosite moyenne', () => {
  const clair = grayImage(64, 64, (x) => (x % 8 < 4 ? 200 : 160));
  const sombre = grayImage(64, 64, (x) => (x % 8 < 4 ? 80 : 40));
  const r = sharpness(clair, 64, 64) / sharpness(sombre, 64, 64);
  assert(r > 0.98 && r < 1.02, 'rapport ' + r);
});
