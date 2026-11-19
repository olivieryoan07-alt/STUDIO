import { test, assert } from './harness.js';
import { scoreFrame } from '../src/core/frame-score.js';
import { grayImage, flou, horizonIncline, bruit } from './fixtures-image.js';

test('une image nette, droite et bien exposee passe', () => {
  const r = scoreFrame(horizonIncline(96, 96, 0), 96, 96);
  assert(r.ok, 'rejetee pour ' + r.motif);
});

test('le flou est rejete pour nettete', () => {
  const g = flou(horizonIncline(96, 96, 0), 96, 96, 6);
  const r = scoreFrame(g, 96, 96);
  assert(!r.ok && r.motif === 'nettete', r.motif);
});

test('un cadre de travers est rejete pour horizon', () => {
  const r = scoreFrame(horizonIncline(96, 96, 25), 96, 96);
  assert(!r.ok && r.motif === 'horizon', r.motif);
});

test('une image sans horizon franc n est pas rejetee pour horizon', () => {
  const r = scoreFrame(bruit(96, 96, 3), 96, 96);
  assert(r.motif !== 'horizon', 'rejetee a tort pour horizon');
});

test('un ciel brule est rejete pour crame', () => {
  const g = grayImage(96, 96, (x, y) => (y < 20 ? 255 : (x % 8 < 4 ? 120 : 60)));
  const r = scoreFrame(g, 96, 96);
  assert(!r.ok && r.motif === 'crame', r.motif);
});

test('aucun seuil chiffre ne vit hors de THRESHOLDS', async () => {
  const src = await (await fetch('../src/core/frame-score.js')).text();
  const corps = src.slice(src.indexOf('export function scoreFrame'));
  assert(!/[^.\w](\d+\.\d+|[2-9]\d+)/.test(corps), 'nombre magique dans scoreFrame');
});
