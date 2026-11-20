import { test, assert } from './harness.js';
import { anchorExcerpt } from '../src/core/excerpt.js';

const grille = (bpm) => ({ beatSec: 60 / bpm, offsetSec: 0 });

// DUREE DU REEL REVISEE le 2026-11-20 : 7 a 12 s et non plus 15 a 25.
// L'utilisateur filme 5 a 10 clips de 3 a 5 s par randonnee, ce qui laisse
// une dizaine de secondes exploitables — pas vingt. La forme de reference
// passe de 50 temps a 24, dans les memes proportions, donc la rafale du
// 38e temps sur 50 tombe desormais sur le 18e sur 24.
test('l’extrait s’ancre 18 temps avant le point culminant', () => {
  const g = grille(140);
  const r = anchorExcerpt({ durationSec: 300, grid: g, climaxSec: 120 });
  assert(Math.abs(r.startSec - (120 - 18 * g.beatSec)) < 0.05, 'début, obtenu ' + r.startSec);
  assert(Math.abs(r.durSec - 24 * g.beatSec) < 0.05, 'durée de 24 temps, obtenu ' + r.durSec);
  assert(r.burstBeatIndex === 18, 'la rafale tombe sur le 18e temps, obtenu ' + r.burstBeatIndex);
});

test('la fourchette 7–12 s tient aux tempos extrêmes', () => {
  for (const bpm of [60, 80, 140, 200]) {
    const r = anchorExcerpt({ durationSec: 300, grid: grille(bpm), climaxSec: 150 });
    assert(r.durSec >= 7 && r.durSec <= 12,
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
  try { anchorExcerpt({ durationSec: 5, grid: grille(140), climaxSec: 2.5 }); }
  catch (e) { msg = e.message; }
  assert(msg.includes('5') && msg.includes('7'),
         'le message doit donner la durée du morceau et le minimum : ' + msg);
});

// REVUE FINALE 2026-11-16. Les tests ci-dessus passaient pour la mauvaise
// raison : aucun ne regardait burstBeatIndex sur les chemins de recalage, et
// aucun n'essayait une duree entre 7 et 12 s — le cas difficile.

test('la rafale est recalculée quand l’extrait est décalé', () => {
  const g = grille(140);
  for (const climaxSec of [3, 10, 299]) {
    const r = anchorExcerpt({ durationSec: 300, grid: g, climaxSec });
    const place = r.startSec + r.burstBeatIndex * g.beatSec;
    const vise = Math.max(r.startSec, Math.min(climaxSec, r.startSec + r.durSec));
    assert(Math.abs(place - vise) <= g.beatSec,
           'culminant ' + climaxSec + ' s : rafale placée à ' + place.toFixed(1) +
           ' s au lieu de ' + vise.toFixed(1));
  }
});

test('la rafale reste dans l’extrait et la durée minimale est tenue', () => {
  for (const bpm of [60, 90, 140, 170, 190]) {
    for (const durationSec of [7, 8, 9, 10, 12, 300]) {
      let r;
      try { r = anchorExcerpt({ durationSec, grid: grille(bpm), climaxSec: durationSec / 2 }); }
      catch (e) { continue; } // un refus explicite est une reponse valable
      const quoi = bpm + ' BPM / ' + durationSec + ' s : ';
      assert(r.burstBeatIndex < r.beatCount,
             quoi + 'rafale au temps ' + r.burstBeatIndex + ' pour ' + r.beatCount + ' temps');
      assert(r.durSec >= 7 - 1e-6, quoi + 'extrait de ' + r.durSec.toFixed(2) + ' s');
      assert(r.startSec + r.durSec <= durationSec + 1e-6, quoi + 'dépasse la fin');
    }
  }
});
