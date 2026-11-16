import { test, assert } from './harness.js';
import { anchorExcerpt } from '../src/core/excerpt.js';

const grille = (bpm) => ({ beatSec: 60 / bpm, offsetSec: 0 });

test('l’extrait s’ancre 38 temps avant le point culminant', () => {
  const g = grille(140);
  const r = anchorExcerpt({ durationSec: 300, grid: g, climaxSec: 120 });
  assert(Math.abs(r.startSec - (120 - 38 * g.beatSec)) < 0.05, 'début, obtenu ' + r.startSec);
  assert(Math.abs(r.durSec - 50 * g.beatSec) < 0.05, 'durée de 50 temps, obtenu ' + r.durSec);
  assert(r.burstBeatIndex === 38, 'la rafale tombe sur le 38e temps, obtenu ' + r.burstBeatIndex);
});

test('la fourchette 15–25 s tient aux tempos extrêmes', () => {
  for (const bpm of [60, 80, 140, 200]) {
    const r = anchorExcerpt({ durationSec: 300, grid: grille(bpm), climaxSec: 150 });
    assert(r.durSec >= 15 && r.durSec <= 25,
           bpm + ' BPM donne ' + r.durSec.toFixed(1) + ' s');
  }
});

test('un point culminant trop précoce décale l’extrait sans sortir du morceau', () => {
  const r = anchorExcerpt({ durationSec: 300, grid: grille(140), climaxSec: 3 });
  assert(r.startSec >= 0, 'début négatif : ' + r.startSec);
  assert(r.startSec + r.durSec <= 300, 'dépasse la fin');
});

test('un point culminant trop tardif décale aussi', () => {
  const r = anchorExcerpt({ durationSec: 300, grid: grille(140), climaxSec: 299 });
  assert(r.startSec + r.durSec <= 300.01, 'dépasse la fin : ' + (r.startSec + r.durSec));
});

test('un morceau plus court que l’extrait est refusé en nommant les durées', () => {
  let msg = '';
  try { anchorExcerpt({ durationSec: 10, grid: grille(140), climaxSec: 5 }); }
  catch (e) { msg = e.message; }
  assert(msg.includes('10') && msg.includes('15'),
         'le message doit donner la durée du morceau et le minimum : ' + msg);
});
