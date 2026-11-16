import { test, assert } from './harness.js';
import { clickTrack } from './fixtures-audio.js';
import { toMono, onsetEnvelope } from '../src/core/onsets.js';

test('le silence ne produit aucune attaque', () => {
  const { env } = onsetEnvelope(new Float32Array(48000), 48000, {});
  assert(env.every((v) => v === 0), 'enveloppe non nulle sur du silence');
});

test('la cadence de l’enveloppe est bien sampleRate / hop', () => {
  assert(onsetEnvelope(new Float32Array(48000), 48000, {}).rate === 93.75);
  assert(onsetEnvelope(new Float32Array(44100), 44100, {}).rate === 44100 / 512);
});

test('chaque clic produit un pic', () => {
  const { env, rate } = onsetEnvelope(clickTrack(4, 48000, 120), 48000, {});
  const seuil = Math.max(...env) * 0.4;
  const pics = [];
  for (let i = 1; i < env.length - 1; i++) {
    if (env[i] > seuil && env[i] >= env[i - 1] && env[i] > env[i + 1]) pics.push(i / rate);
  }
  assert(pics.length >= 7 && pics.length <= 9,
         '8 temps attendus en 4 s à 120 BPM, obtenu ' + pics.length);
  assert(Math.abs(pics[1] - pics[0] - 0.5) < 0.05, 'écart de 0,5 s entre deux temps');
});

test('le mono additionne les canaux sans saturer', () => {
  const g = new Float32Array([1, 1]), d = new Float32Array([1, -1]);
  const m = toMono([g, d]);
  assert(Math.abs(m[0] - 1) < 1e-6 && Math.abs(m[1]) < 1e-6, 'moyenne attendue');
});
