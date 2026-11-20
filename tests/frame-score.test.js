import { test, assert } from './harness.js';
import { scoreFrame, THRESHOLDS } from '../src/core/frame-score.js';
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
  // les commentaires sont retires avant l'examen : ce projet consigne ses
  // mesures en commentaire, et un chiffre mesure n'est pas un seuil en dur.
  const corps = src.slice(src.indexOf('export function scoreFrame'))
                   .replace(/\/\*[\s\S]*?\*\//g, '')
                   .replace(/\/\/[^\n]*/g, '');
  assert(!/[^.\w](\d+\.\d+|[2-9]\d+)/.test(corps), 'nombre magique dans scoreFrame');
});

// RELECTURE FINALE, constat Critical 2 : sur une image texturee — c'est-a-dire
// chaque plan de marche — la force de l'horizon s'effondre et l'angle rendu
// degenere vers 44 degres, l'angle d'un histogramme de bruit. Publier ce
// nombre, c'est laisser croire a une mesure qui n'a pas eu lieu.
test('aucun angle n est publie quand l horizon n est pas affirme', () => {
  const r = scoreFrame(bruit(96, 96, 3), 96, 96);
  // on compare au seuil lui-meme : il sera regle, le test ne doit pas perimer
  assert(r.forceHorizon < THRESHOLDS.HORIZON_FORCE_MIN, 'force ' + r.forceHorizon);
  assert(r.inclinaison === null, 'angle publie a tort : ' + r.inclinaison);
});

test('un horizon franc publie bien son angle', () => {
  const r = scoreFrame(horizonIncline(96, 96, 4), 96, 96);
  assert(r.inclinaison !== null && Math.abs(r.inclinaison - 4) < 3, '' + r.inclinaison);
});
