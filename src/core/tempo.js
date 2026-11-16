// Logique pure : tempo par autocorrelation, puis calage de phase.
//
// §5.3 de la conception, etapes 4 et 5. Le tempo seul ne suffit pas : il faut
// savoir OU tombent les temps, sinon toutes les coupes arrivent a cote.
//
// `confidence` existe a cause du Review Focus 2 : sur une nappe sans
// percussion, l'autocorrelation trouve toujours un maximum. Rendre ce BPM
// sans dire qu'il ne veut rien dire ferait tomber tout le montage a cote.

const BPM_MIN = 60;
const BPM_MAX = 200;
const FOLD_LOW = 80;
const FOLD_HIGH = 190;

function centred(env) {
  let mean = 0;
  for (let i = 0; i < env.length; i++) mean += env[i];
  mean /= env.length || 1;
  const out = new Float32Array(env.length);
  for (let i = 0; i < env.length; i++) out[i] = Math.max(0, env[i] - mean);
  return out;
}

export function detectTempo(env, rate) {
  const cen = centred(env);
  const minLag = Math.max(1, Math.round((rate * 60) / BPM_MAX));
  const maxLag = Math.min(cen.length - 1, Math.round((rate * 60) / BPM_MIN));

  let bestLag = minLag;
  let bestScore = -Infinity;
  let sum = 0;
  let count = 0;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let acc = 0;
    for (let t = 0; t + lag < cen.length; t++) acc += cen[t] * cen[t + lag];
    acc /= cen.length - lag;
    sum += acc;
    count++;
    if (acc > bestScore) { bestScore = acc; bestLag = lag; }
  }

  const mean = count ? sum / count : 0;
  // un pic franc se detache de la moyenne ; une nappe reste a son niveau
  const ratio = mean > 0 ? bestScore / mean : 0;
  const confidence = Math.max(0, Math.min(1, (ratio - 1) / 3));

  let bpm = (60 * rate) / bestLag;
  while (bpm < FOLD_LOW) bpm *= 2;
  while (bpm > FOLD_HIGH) bpm /= 2;

  return { bpm, confidence, lag: bestLag };
}

// Correle l'enveloppe avec un peigne d'impulsions a la periode trouvee et
// retient le decalage qui ramasse le plus d'energie.
export function beatGrid(env, rate, bpm) {
  const beatSec = 60 / bpm;
  const period = beatSec * rate;
  const steps = Math.max(1, Math.round(period));

  let bestOffset = 0;
  let bestScore = -Infinity;

  for (let s = 0; s < steps; s++) {
    let acc = 0;
    for (let p = s; p < env.length; p += period) {
      const i = Math.round(p);
      if (i < env.length) acc += env[i];
    }
    if (acc > bestScore) { bestScore = acc; bestOffset = s; }
  }

  const offsetSec = bestOffset / rate;
  const total = env.length / rate;
  const beats = [];
  for (let t = offsetSec; t < total; t += beatSec) beats.push(t);

  return { beatSec, offsetSec, beats: Float64Array.from(beats) };
}
