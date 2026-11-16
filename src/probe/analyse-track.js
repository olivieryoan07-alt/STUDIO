// Enchaine le moteur audio du §5.3 sur un vrai fichier.
// Seul module de la phase 1A qui touche Web Audio ; tout le reste est pur.
//
// Chaque etape est chronometree separement (regle issue de la phase 0 : un
// compteur unique pour deux realites cache les pannes).

import { loadAudio } from './audio.js';
import { toMono, onsetEnvelope } from '../core/onsets.js';
import { detectTempo, beatGrid } from '../core/tempo.js';
import { findClimax, sections } from '../core/sections.js';
import { anchorExcerpt } from '../core/excerpt.js';

export async function analyseTrack(file, onProgress = () => {}) {
  const t = {};
  const chrono = async (nom, fn) => {
    onProgress({ phase: nom });
    const t0 = performance.now();
    const r = await fn();
    t[nom] = Math.round(performance.now() - t0);
    return r;
  };

  const buffer = await chrono('décodage', () => loadAudio(file));

  const channels = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) channels.push(buffer.getChannelData(c));

  const mono = await chrono('mono', async () => toMono(channels));
  const { env, rate } = await chrono('enveloppe', async () =>
    onsetEnvelope(mono, buffer.sampleRate, {}));
  const tempo = await chrono('tempo', async () => detectTempo(env, rate));
  const grid = await chrono('grille', async () => beatGrid(env, rate, tempo.bpm));
  const climax = await chrono('point culminant', async () => findClimax(env, rate));
  const struct = await chrono('sections', async () => sections(env, rate));

  let excerpt = null;
  let excerptError = null;
  try {
    excerpt = anchorExcerpt({ durationSec: buffer.duration, grid, climaxSec: climax.timeSec });
  } catch (e) {
    // un morceau trop court n'est pas une panne : c'est une reponse
    excerptError = e.message;
  }

  return {
    durationSec: buffer.duration,
    sampleRate: buffer.sampleRate,
    channels: buffer.numberOfChannels,
    bpm: tempo.bpm,
    confidence: tempo.confidence,
    grid,
    climax,
    sections: struct,
    excerpt,
    excerptError,
    env,
    rate,
    timings: t,
    msTotal: Object.values(t).reduce((a, b) => a + b, 0)
  };
}
