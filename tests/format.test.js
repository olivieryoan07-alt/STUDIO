import { test, assert } from './harness.js';
import { mmss } from '../src/core/format.js';

// REVUE FINALE 2026-11-16 : mmss(119.6) affichait « 1:60 ».
test('mmss ne produit jamais soixante secondes', () => {
  assert(mmss(119.6) === '2:00', 'obtenu ' + mmss(119.6));
  assert(mmss(59.7) === '1:00', 'obtenu ' + mmss(59.7));
  assert(mmss(0) === '0:00', 'obtenu ' + mmss(0));
  assert(mmss(125) === '2:05', 'obtenu ' + mmss(125));
});
