import { test, assert } from './harness.js';
import { clickTrack, smoothNoise, drumTrack } from './fixtures-audio.js';
import { onsetEnvelope } from '../src/core/onsets.js';
import { detectTempo, beatGrid } from '../src/core/tempo.js';

test('le tempo d’une piste de clics est retrouvé', () => {
  for (const bpm of [90, 120, 150, 174]) {
    const { env, rate } = onsetEnvelope(clickTrack(20, 48000, bpm), 48000, {});
    const t = detectTempo(env, rate);
    assert(Math.abs(t.bpm - bpm) < 2, bpm + ' BPM attendu, obtenu ' + t.bpm.toFixed(1));
  }
});

test('le tempo est replié dans la plage utile', () => {
  const { env, rate } = onsetEnvelope(clickTrack(20, 48000, 75), 48000, {});
  const t = detectTempo(env, rate);
  assert(t.bpm >= 80 && t.bpm <= 190, 'obtenu ' + t.bpm);
});

test('une nappe sans percussion a une confiance basse', () => {
  const { env, rate } = onsetEnvelope(smoothNoise(20, 48000), 48000, {});
  const t = detectTempo(env, rate);
  assert(t.confidence < 0.3, 'confiance attendue basse, obtenue ' + t.confidence.toFixed(2));
});

test('une piste de clics a une confiance haute', () => {
  const { env, rate } = onsetEnvelope(clickTrack(20, 48000, 140), 48000, {});
  const t = detectTempo(env, rate);
  assert(t.confidence > 0.6, 'confiance obtenue ' + t.confidence.toFixed(2));
});

test('le tempo est juste aussi à 44,1 kHz et en mono', () => {
  const { env, rate } = onsetEnvelope(clickTrack(20, 44100, 128), 44100, {});
  const t = detectTempo(env, rate);
  assert(Math.abs(t.bpm - 128) < 2, '128 BPM attendu, obtenu ' + t.bpm.toFixed(1));
});

test('la grille tombe sur les clics, pas entre eux', () => {
  const sr = 48000, bpm = 120, decalage = 0.17;
  const { env, rate } = onsetEnvelope(clickTrack(20, sr, bpm, decalage), sr, {});
  const g = beatGrid(env, rate, bpm);
  assert(Math.abs(g.beatSec - 0.5) < 0.01, 'durée du temps : ' + g.beatSec);
  const reste = Math.abs(((g.offsetSec - decalage) % 0.5 + 0.5) % 0.5);
  assert(reste < 0.06 || Math.abs(reste - 0.5) < 0.06,
         'phase mal calée : offset ' + g.offsetSec.toFixed(3) + ', reste ' + reste.toFixed(3));
});

// Trouve par la verification de bout en bout du 2026-11-16 : sur un morceau
// dont la seconde moitie est bien plus forte, beatGrid se calait a 9 trames
// (~107 ms) du vrai temps. Audible immediatement au banc. La somme brute se
// laissait dominer par les passages forts.

test('le calage tient quand le morceau monte en intensité', () => {
  const sr = 44100, bpm = 140;
  // frappes realistes, calmes puis fortes a mi-parcours
  const sig = drumTrack(20, sr, bpm, 0, (t) => (t < 10 ? 0.15 : 0.9));

  const { env, rate } = onsetEnvelope(sig, sr, {});
  const g = beatGrid(env, rate, bpm);
  const beatSec = 60 / bpm;
  const reste = ((g.offsetSec % beatSec) + beatSec) % beatSec;
  const ecart = Math.min(reste, beatSec - reste);
  assert(ecart < 0.035,
         'décalage de ' + (ecart * 1000).toFixed(0) + ' ms par rapport aux attaques');
});

// LE test qui compte pour l'oreille. L'autocorrelation ne donne qu'un
// decalage ENTIER de trame : a 86,13 trames/s, le lag 37 vaut 139,7 BPM et le
// lag 36 vaut 143,6. Une erreur de 0,4 % fait deriver la grille d'un quart de
// temps en 30 s — parfaitement audible, et c'est exactement la premiere
// question posee a l'utilisateur au banc. Il faut un lag fractionnaire.

test('la grille ne dérive pas sur la durée d’un morceau', () => {
  const sr = 44100, bpm = 143;
  const sig = drumTrack(60, sr, bpm, 0);
  const { env, rate } = onsetEnvelope(sig, sr, {});
  const t = detectTempo(env, rate);
  const g = beatGrid(env, rate, t.bpm);

  const vrai = 60 / bpm;
  const dernier = 59;                       // le temps le plus tardif a verifier
  const indice = Math.round((dernier - g.offsetSec) / g.beatSec);
  const place = g.offsetSec + indice * g.beatSec;
  const attendu = Math.round(place / vrai) * vrai;
  const derive = Math.abs(place - attendu);

  assert(derive < 0.03,
         'dérive de ' + (derive * 1000).toFixed(0) + ' ms à 59 s (tempo détecté ' +
         t.bpm.toFixed(2) + ' pour ' + bpm + ')');
});
