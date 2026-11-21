import { test, assert } from './harness.js';
import { anchorExcerpt } from '../src/core/excerpt.js';

const grille = (bpm) => ({ beatSec: 60 / bpm, offsetSec: 0 });

// DUREE DU REEL REVISEE le 2026-11-21 : 5 a 7 s, apres que l'utilisateur a
// essaye l'ecran de choix sur son telephone. La forme de reference passe de
// 24 temps a 16 — quatre mesures — donc la rafale du 12e temps sur 16.
// (Revision precedente du 2026-11-20 : 7 a 12 s, 24 temps.)
// L'utilisateur filme 5 a 10 clips de 3 a 5 s par randonnee, ce qui laisse
// une dizaine de secondes exploitables — pas vingt. La forme de reference
// passe de 50 temps a 24, dans les memes proportions, donc la rafale du
// 38e temps sur 50 tombe desormais sur le 18e sur 24.
test('l’extrait s’ancre 12 temps avant le point culminant', () => {
  const g = grille(140);
  const r = anchorExcerpt({ durationSec: 300, grid: g, climaxSec: 120 });
  assert(Math.abs(r.startSec - (120 - 12 * g.beatSec)) < 0.05, 'début, obtenu ' + r.startSec);
  assert(Math.abs(r.durSec - 16 * g.beatSec) < 0.05, 'durée de 16 temps, obtenu ' + r.durSec);
  assert(r.burstBeatIndex === 12, 'la rafale tombe sur le 12e temps, obtenu ' + r.burstBeatIndex);
});

test('la fourchette 5–7 s tient aux tempos extrêmes', () => {
  for (const bpm of [60, 80, 140, 200]) {
    const r = anchorExcerpt({ durationSec: 300, grid: grille(bpm), climaxSec: 150 });
    assert(r.durSec >= 5 && r.durSec <= 7,
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
  try { anchorExcerpt({ durationSec: 3, grid: grille(140), climaxSec: 1.5 }); }
  catch (e) { msg = e.message; }
  assert(msg.includes('3') && msg.includes('5'),
         'le message doit donner la durée du morceau et le minimum : ' + msg);
});

// REVUE FINALE 2026-11-16. Les tests ci-dessus passaient pour la mauvaise
// raison : aucun ne regardait burstBeatIndex sur les chemins de recalage, et
// aucun n'essayait une duree entre 5 et 7 s — le cas difficile.

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
    for (const durationSec of [5, 6, 7, 300]) {
      let r;
      try { r = anchorExcerpt({ durationSec, grid: grille(bpm), climaxSec: durationSec / 2 }); }
      catch (e) { continue; } // un refus explicite est une reponse valable
      const quoi = bpm + ' BPM / ' + durationSec + ' s : ';
      assert(r.burstBeatIndex < r.beatCount,
             quoi + 'rafale au temps ' + r.burstBeatIndex + ' pour ' + r.beatCount + ' temps');
      assert(r.durSec >= 5 - 1e-6, quoi + 'extrait de ' + r.durSec.toFixed(2) + ' s');
      assert(r.startSec + r.durSec <= durationSec + 1e-6, quoi + 'dépasse la fin');
    }
  }
});
