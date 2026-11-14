import { test, assert } from './harness.js';
import { cropRect } from '../src/core/crop.js';

test('source deja en 9:16 : recadrage identite', () => {
  const r = cropRect(1080, 1920, 1080, 1920);
  assert(r.sx === 0 && r.sy === 0 && r.sw === 1080 && r.sh === 1920,
         'attendu 0,0,1080,1920 — obtenu ' + JSON.stringify(r));
});

test('source horizontale : recadrage centre en largeur', () => {
  const r = cropRect(1920, 1080, 1080, 1920);
  assert(r.sw === 608 && r.sh === 1080,
         'largeur = 1080 * 9/16, arrondie au pair superieur — obtenu ' + JSON.stringify(r));
  assert(r.sx === 656 && r.sy === 0, 'centre horizontalement — obtenu ' + JSON.stringify(r));
});

test('source 3:4 : recadrage centre en largeur', () => {
  const r = cropRect(1440, 1920, 1080, 1920);
  assert(r.sw === 1080 && r.sx === 180, 'obtenu ' + JSON.stringify(r));
});

test('toutes les dimensions sont paires', () => {
  for (const [w, h] of [[1081, 1921], [999, 1777], [1234, 999]]) {
    const r = cropRect(w, h, 1080, 1920);
    assert(r.sw % 2 === 0 && r.sh % 2 === 0,
           'dimensions impaires pour ' + w + 'x' + h + ' : ' + JSON.stringify(r));
  }
});

test('le recadrage ne sort jamais de la source', () => {
  for (const [w, h] of [[1081, 1921], [999, 1777], [1234, 999], [1080, 1920]]) {
    const r = cropRect(w, h, 1080, 1920);
    assert(r.sx >= 0 && r.sy >= 0 && r.sx + r.sw <= w && r.sy + r.sh <= h,
           'depassement pour ' + w + 'x' + h + ' : ' + JSON.stringify(r));
  }
});
