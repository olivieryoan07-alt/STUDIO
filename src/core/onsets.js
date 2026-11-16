// Logique pure : enveloppe des attaques par flux spectral.
//
// Chaine du §5.3 de la conception, etapes 1 a 3 : mono, STFT (fenetre 1024,
// saut 512), puis somme des differences POSITIVES de magnitude d'une trame a
// la suivante. Les differences negatives sont ignorees : une note qui
// s'eteint n'est pas une attaque.

import { fft, hann } from './fft.js';

export function toMono(channels) {
  const n = channels[0].length;
  const out = new Float32Array(n);
  const k = channels.length;
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let c = 0; c < k; c++) s += channels[c][i];
    out[i] = s / k;
  }
  return out;
}

export function onsetEnvelope(mono, sampleRate, options = {}) {
  const frame = options.frame || 1024;
  const hop = options.hop || 512;
  const rate = sampleRate / hop;

  // La trame f couvre [f*hop, f*hop+frame] et la fenetre de Hann centre son
  // energie au milieu. Dater env[f] a f/rate donnait 10-13 ms d'avance
  // systematique sur chaque attaque — un tiers du budget de 30 ms, gratuit a
  // recuperer (revue 2026-11-16).
  const offsetSec = frame / (2 * sampleRate);
  const frames = Math.max(0, Math.floor((mono.length - frame) / hop) + 1);
  const env = new Float32Array(frames);
  if (frames === 0) return { env, rate, offsetSec };

  const win = hann(frame);
  const bins = frame >> 1;
  const re = new Float32Array(frame);
  const im = new Float32Array(frame);
  const prev = new Float32Array(bins);

  for (let f = 0; f < frames; f++) {
    const off = f * hop;
    for (let i = 0; i < frame; i++) {
      re[i] = mono[off + i] * win[i];
      im[i] = 0;
    }
    fft(re, im);

    let flux = 0;
    for (let k = 0; k < bins; k++) {
      // Math.sqrt plutot que Math.hypot : 10,6 millions d'appels sur un
      // morceau de 4 min, et hypot paie une protection contre les
      // debordements dont on n'a pas besoin ici.
      const mag = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
      const d = mag - prev[k];
      if (d > 0) flux += d;
      prev[k] = mag;
    }
    env[f] = flux;
  }

  return { env, rate, offsetSec };
}
