// L'enchainement complet pour un clip : inspection, decodage, mesures,
// plages. Meme forme que `analyse-track.js` cote audio — une phase nommee,
// chronometree a part, avec une vraie pause de tache entre deux.

import { inspectFile } from './inspect.js';
import { decodeFrames } from './decode-frames.js';
import { scoreFrame } from '../core/frame-score.js';
import { usableRanges } from '../core/ranges.js';

const CRITERES = ['nettete', 'inclinaison', 'crame', 'bouche'];

function quantile(triees, p) {
  if (triees.length === 0) return 0;
  return triees[Math.min(triees.length - 1, Math.floor(p * (triees.length - 1)))];
}

// Pourquoi les distributions sont un livrable et non un ornement : les seuils
// se reglent a distance, par allers-retours avec l'utilisateur. Une
// distribution dit ou poser un seuil ; une liste de verdicts ne le dit pas.
export function statistiques(mesures) {
  const out = {};
  for (const critere of CRITERES) {
    const triees = mesures.map((m) => m[critere]).sort((a, b) => a - b);
    out[critere] = {
      min: triees.length ? triees[0] : 0,
      median: quantile(triees, 0.5),
      p90: quantile(triees, 0.9),
      max: triees.length ? triees[triees.length - 1] : 0
    };
  }
  return out;
}

export async function analyseClip(file, onProgress = () => {}) {
  const t = {};
  const respirer = () => new Promise((r) => setTimeout(r, 0));

  const chrono = async (nom, fn) => {
    onProgress({ phase: nom });
    await respirer();
    const t0 = performance.now();
    const r = await fn();
    t[nom] = Math.round(performance.now() - t0);
    return r;
  };

  const info = await chrono('inspection', () => inspectFile(file));

  const mesures = [];
  const { comptes, source } = await chrono('décodage et mesures', () =>
    decodeFrames(file, {
      onFrame: ({ gray, w, h, timeSec }) => {
        const r = scoreFrame(gray, w, h);
        r.timeSec = timeSec;
        mesures.push(r);
      },
      onProgress: (p) => onProgress({ phase: 'décodage et mesures', ...p })
    }));

  const groupes = await chrono('plages', async () =>
    usableRanges(mesures, source.dureeSec));

  const stats = await chrono('distributions', async () => statistiques(mesures));

  return {
    info,
    source,
    comptes,
    mesures,
    plages: groupes.plages,
    rejets: groupes.rejets,
    secondesUtiles: groupes.secondesUtiles,
    stats,
    timings: t,
    msTotal: Object.values(t).reduce((a, b) => a + b, 0)
  };
}
