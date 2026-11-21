import { test, assert } from './harness.js';
import { calerSurTemps, placer } from '../src/core/fenetre.js';
import { nombreDeTemps } from '../src/core/excerpt.js';

const grille = (bpm, offset = 0) => ({ beatSec: 60 / bpm, offsetSec: offset, beats: [] });

// « sur un temps » se verifie par la DISTANCE au temps le plus proche, pas
// par un modulo : a un cheveu sous un temps, `(s - offset) % beatSec` rend
// presque `beatSec` au lieu de presque zero. Mesure du 2026-11-21 : 49,8
// calcule vaut 49,799999999999955, bien sur un temps, et le modulo rendait
// 0,4999999999. Deux des trois assertions passaient par chance de flottant.
const surUnTemps = (s, g) => {
  const k = Math.round((s - g.offsetSec) / g.beatSec);
  return Math.abs(s - (g.offsetSec + k * g.beatSec)) < 1e-9;
};

test('caler prend le temps le plus proche', () => {
  const g = grille(120, 0.1);                 // un temps toutes les 0,5 s
  assert(Math.abs(calerSurTemps(1.7, g) - 1.6) < 1e-9, '' + calerSurTemps(1.7, g));
  assert(Math.abs(calerSurTemps(1.9, g) - 2.1) < 1e-9, '' + calerSurTemps(1.9, g));
});

test('placer cale la fenetre sur un temps', () => {
  const g = grille(120, 0.1);
  const s = placer(5.3, { durationSec: 60, grid: g, durSec: 10 });
  assert(surUnTemps(s, g), 'pas sur un temps : ' + s);
});

// Review Focus 2
test('contre le debut, la fenetre reste entiere ET sur un temps', () => {
  const g = grille(120, 0.3);
  const s = placer(-5, { durationSec: 60, grid: g, durSec: 10 });
  assert(s >= 0, 'sort par le debut : ' + s);
  assert(surUnTemps(s, g), 'pas sur un temps : ' + s);
  assert(s < g.offsetSec + g.beatSec, 'pas le premier temps utile : ' + s);
});

test('contre la fin, la fenetre reste entiere ET sur un temps', () => {
  const g = grille(120, 0.3);
  const s = placer(999, { durationSec: 60, grid: g, durSec: 10 });
  assert(s + 10 <= 60 + 1e-9, 'deborde : ' + (s + 10));
  assert(surUnTemps(s, g), 'pas sur un temps : ' + s);
  assert(s + 10 > 49.5, 'trop loin du bord : ' + s);
});

// Review Focus 4
test('un tempo non detecte ne fait ni division par zero ni boucle', () => {
  for (const mauvais of [0, NaN, Infinity, -1]) {
    const s = placer(5, { durationSec: 60, grid: { beatSec: mauvais, offsetSec: 0, beats: [] }, durSec: 10 });
    assert(Number.isFinite(s) && s >= 0 && s + 10 <= 60, mauvais + ' -> ' + s);
  }
});

test('le nombre de temps vaut 24 aux tempos courants', () => {
  for (const bpm of [120, 140, 150, 180]) {
    assert(nombreDeTemps(grille(bpm), 300) === 24, bpm + ' BPM');
  }
});
