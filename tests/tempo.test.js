import { test, assert } from './harness.js';
import { clickTrack, smoothNoise } from './fixtures-audio.js';
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
