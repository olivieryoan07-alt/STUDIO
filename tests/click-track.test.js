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
