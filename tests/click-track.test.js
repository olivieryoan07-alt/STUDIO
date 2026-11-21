import { test, assert } from './harness.js';
import { tempsDesClics } from '../src/bench/click-track.js';

test('les clics tombent sur les temps de l intervalle', () => {
  const g = { beatSec: 0.5, offsetSec: 0.1, beats: [] };
  const t = tempsDesClics(g, 1, 3);
  assert(t.length === 4, 'clics ' + t.length);
  assert(Math.abs(t[0] - 1.1) < 1e-9, 'premier ' + t[0]);
  assert(t[t.length - 1] < 3, 'depasse la fin : ' + t[t.length - 1]);
});

test('un intervalle vide ne donne aucun clic', () => {
  assert(tempsDesClics({ beatSec: 0.5, offsetSec: 0, beats: [] }, 5, 5).length === 0);
});

test('un tempo non detecte ne donne aucun clic plutot qu une boucle infinie', () => {
  assert(tempsDesClics({ beatSec: 0, offsetSec: 0, beats: [] }, 0, 10).length === 0);
});

// RELECTURE FINALE, constat Important 2 : `Math.ceil` ne tolere pas l'epsilon
// de flottant. Quand le debut de la fenetre tombe EXACTEMENT sur un temps —
// ce que `placer` garantit a chaque fois — le premier clic sautait un temps
// sur ~3 % des positions. Or le §5.1 bis fait du clic le seul controle de
// l'erreur d'octave : un clic en retard ressemble trait pour trait au defaut
// que l'ecran existe pour ecarter.
test('un debut cale sur un temps recoit un clic sur ce temps', () => {
  for (const bpm of [97.3, 128, 140.7, 171]) {
    const g = { beatSec: 60 / bpm, offsetSec: 0.37, beats: [] };
    for (let k = 400; k < 440; k++) {
      const from = g.offsetSec + k * g.beatSec;
      const t = tempsDesClics(g, from, from + 4);
      assert(t.length && Math.abs(t[0] - from) < 1e-6,
             bpm + ' BPM, temps ' + k + ' : ecart ' + (t.length ? t[0] - from : 'aucun clic'));
    }
  }
});
