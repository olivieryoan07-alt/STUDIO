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

  // on garde tous les scores : l'affinage du pic en a besoin
  const scores = new Float64Array(maxLag - minLag + 1);
  let bestLag = minLag;
  let bestScore = -Infinity;
  let sum = 0;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let acc = 0;
    for (let t = 0; t + lag < cen.length; t++) acc += cen[t] * cen[t + lag];
    acc /= cen.length - lag;
    scores[lag - minLag] = acc;
    sum += acc;
    if (acc > bestScore) { bestScore = acc; bestLag = lag; }
  }
  const count = scores.length;

  const mean = count ? sum / count : 0;
  // un pic franc se detache de la moyenne ; une nappe reste a son niveau
  const ratio = mean > 0 ? bestScore / mean : 0;
  const confidence = Math.max(0, Math.min(1, (ratio - 1) / 3));

  // Un decalage ENTIER de trame ne suffit pas. A 86,13 trames/s, les lags 36
  // et 37 valent 143,6 et 139,7 BPM : rien entre les deux. Une erreur de
  // 0,4 % fait deriver la grille d'un quart de temps en 30 s, ce qui s'entend
  // immediatement. On affine le sommet par interpolation parabolique sur ses
  // deux voisins. Mesure du 2026-11-16 : 191 ms de derive a 59 s sans cela.
  let refined = bestLag;
  const i = bestLag - minLag;
  if (i > 0 && i < count - 1) {
    const y1 = scores[i - 1];
    const y2 = scores[i];
    const y3 = scores[i + 1];
    const denom = y1 - 2 * y2 + y3;
    if (denom !== 0) {
      const delta = (0.5 * (y1 - y3)) / denom;
      if (Math.abs(delta) <= 1) refined = bestLag + delta;
    }
  }

  let bpm = (60 * rate) / refined;
  while (bpm < FOLD_LOW) bpm *= 2;
  while (bpm > FOLD_HIGH) bpm /= 2;

  // Deuxieme affinage, et c'est lui qui tue la derive. L'interpolation
  // parabolique ramenait l'erreur de 191 a 67 ms sur 59 s : mieux, mais
  // toujours audible. On evalue ici directement ce qui compte — la somme de
  // l'enveloppe ramassee par un peigne de temps — sur une grille fine de
  // periodes autour de l'estimation.
  bpm = refineByComb(cen, rate, bpm);

  return { bpm, confidence, lag: (60 * rate) / bpm };
}

// Score d'un peigne : la meilleure somme obtenue, tous decalages confondus.
function combScore(cen, period) {
  const steps = Math.max(1, Math.round(period));
  let best = -Infinity;
  for (let s = 0; s < steps; s++) {
    let acc = 0;
    for (let p = s; p < cen.length; p += period) {
      const i = Math.round(p);
      if (i < cen.length) acc += cen[i];
    }
    if (acc > best) best = acc;
  }
  return best;
}

function refineByComb(cen, rate, bpm) {
  const base = (60 / bpm) * rate;
  let bestPeriod = base;
  let bestScore = -Infinity;
  // +/- 3 %, par pas de 0,03 % : largement sous le seuil audible
  for (let k = -100; k <= 100; k++) {
    const period = base * (1 + k * 0.0003);
    const score = combScore(cen, period);
    if (score > bestScore) { bestScore = score; bestPeriod = period; }
  }
  return (60 * rate) / bestPeriod;
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
