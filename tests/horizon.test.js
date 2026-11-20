import { test, assert } from './harness.js';
import { tilt } from '../src/core/horizon.js';
import { horizonIncline, bruit } from './fixtures-image.js';

// MESURE DU 2026-11-20, quatre vrais clips de l'iPhone, 409 images : la force
// maximale releve 0,08 pour un seuil a 0,12 — le critere d'horizon ne s'est
// JAMAIS declenche. La cause n'est pas le seuil mais l'echelle : une part de
// l'energie de gradient n'a pas d'unite lisible, et sur une image texturee la
// part des 3 degres dominants est forcement minuscule. On la rapporte donc au
// hasard — 3 degres sur 180 — et la force se lit « tant de fois le hasard ».
test('une image sans contour reste au niveau du hasard', () => {
  const t = tilt(bruit(96, 96, 7), 96, 96);
  assert(t.strength < 2, 'force ' + t.strength);
});

test('un horizon droit donne un angle nul et une force tres au-dessus du hasard', () => {
  const t = tilt(horizonIncline(96, 96, 0), 96, 96);
  assert(Math.abs(t.angleDeg) < 2, 'angle ' + t.angleDeg);
  assert(t.strength > 10, 'force ' + t.strength);
});

test('un horizon a 15 degres est mesure a 15 degres', () => {
  const t = tilt(horizonIncline(96, 96, 15), 96, 96);
  assert(Math.abs(t.angleDeg - 15) < 3, 'angle ' + t.angleDeg);
});

test('un horizon penche dans l autre sens change de signe', () => {
  assert(tilt(horizonIncline(96, 96, -15), 96, 96).angleDeg < -10);
});


