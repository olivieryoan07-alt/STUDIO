import { test, assert } from './harness.js';
import { tilt } from '../src/core/horizon.js';
import { horizonIncline, bruit } from './fixtures-image.js';

test('un horizon droit donne un angle nul', () => {
  const t = tilt(horizonIncline(96, 96, 0), 96, 96);
  assert(Math.abs(t.angleDeg) < 2, 'angle ' + t.angleDeg);
  assert(t.strength > 0.3, 'force ' + t.strength);
});

test('un horizon a 15 degres est mesure a 15 degres', () => {
  const t = tilt(horizonIncline(96, 96, 15), 96, 96);
  assert(Math.abs(t.angleDeg - 15) < 3, 'angle ' + t.angleDeg);
});

test('un horizon penche dans l autre sens change de signe', () => {
  assert(tilt(horizonIncline(96, 96, -15), 96, 96).angleDeg < -10);
});

test('une image sans contour n affirme aucun horizon', () => {
  assert(tilt(bruit(96, 96, 7), 96, 96).strength < 0.2);
});
