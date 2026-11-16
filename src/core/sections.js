// Logique pure : structure du morceau et point culminant.
//
// CORRECTION DE L'UTILISATEUR, et c'est la raison d'etre de ce module.
// Une premiere version prenait le MAXIMUM de l'enveloppe. A l'ecoute, le
// point culminant ressenti se situe juste APRES la montee, pas au sommet :
// un morceau de metal passe ses deux dernieres minutes a pleine energie,
// donc le maximum n'y designe plus rien.
//
// Ce qui frappe a l'oreille n'est pas « le plus fort », c'est « le moment ou
// ca devient fort ». On cherche donc la plus grande MARCHE montante.

const BEFORE_SEC = 4; // passage de reference, avant le saut
const AFTER_SEC = 2;  // ce qui vient juste apres

// CENTREE, et ce n'est pas un detail. Une moyenne glissante causale decale
// tout ce qui la suit : le sommet du saut sortait 693 ms trop tard, ce qui
// s'entend grossierement au banc (revue du 2026-11-16).
export function smoothEnvelope(env, rate, windowSec = 2) {
  const w = Math.max(1, Math.round(rate * windowSec));
  const half = w >> 1;
  const n = env.length;
  const cum = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) cum[i + 1] = cum[i] + env[i];
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - half);
    const b = Math.min(n, i - half + w);
    out[i] = (cum[b] - cum[a]) / (b - a);
  }
  return out;
}

// Le score est un ECART, pas un rapport. Un rapport est sans echelle : une
// miette de saut dans une intro presque muette battait le vrai drop. Mesure
// du relecteur sur une structure metal canonique (intro 0,03 / couplet 0,45 /
// drop 1,0 a 150 s) : le rapport designait 12 s, l'ecart designe 150 s.
// L'oreille entend « c'est devenu fort », pas « c'est devenu 25 fois plus
// fort que presque rien ».
export function findClimax(env, rate, offsetSec = 0) {
  const s = smoothEnvelope(env, rate, 2);
  const before = Math.max(1, Math.round(rate * BEFORE_SEC));
  const after = Math.max(1, Math.round(rate * AFTER_SEC));

  const cum = new Float64Array(s.length + 1);
  for (let i = 0; i < s.length; i++) cum[i + 1] = cum[i] + s[i];
  const moyenne = (a, b) => (b > a ? (cum[b] - cum[a]) / (b - a) : 0);

  let bestIndex = 0;
  let bestStep = -Infinity;
  let bestRatio = 0;

  for (let i = before; i + after < s.length; i++) {
    const avant = moyenne(i - before, i);
    const apres = moyenne(i, i + after);
    const step = apres - avant;
    if (step > bestStep) {
      bestStep = step;
      bestIndex = i;
      bestRatio = apres / (avant + 1e-9);
    }
  }

  // L'argmax du score reste ~340 ms apres la marche : le sommet est aplati
  // par le lissage et les deux fenetres sont de tailles differentes. On date
  // donc le moment ou l'energie FRANCHIT la mi-hauteur entre le niveau
  // d'avant et celui d'apres — c'est litteralement « le moment ou ca devient
  // fort », la definition que l'utilisateur a donnee.
  const avant = moyenne(bestIndex - before, bestIndex);
  const apres = moyenne(bestIndex, bestIndex + after);
  const mi = (avant + apres) / 2;

  let franchissement = bestIndex;
  for (let k = Math.max(0, bestIndex - before); k < Math.min(s.length, bestIndex + after); k++) {
    if (s[k] >= mi) { franchissement = k; break; }
  }

  return {
    timeSec: franchissement / rate + offsetSec,
    stepRatio: bestRatio,
    step: bestStep
  };
}

export function sections(env, rate, minSec = 2, offsetSec = 0) {
  const s = smoothEnvelope(env, rate, 2);
  let max = 0;
  for (let i = 0; i < s.length; i++) if (s[i] > max) max = s[i];
  if (max <= 0) return [{ startSec: offsetSec, endSec: s.length / rate + offsetSec, level: 0 }];

  const level = (i) => Math.round((s[i] / max) * 3);

  const out = [];
  let start = 0;
  let cur = level(0);
  for (let i = 1; i < s.length; i++) {
    const l = level(i);
    if (l !== cur) {
      out.push({ startSec: start / rate + offsetSec, endSec: i / rate + offsetSec, level: cur });
      start = i;
      cur = l;
    }
  }
  out.push({ startSec: start / rate + offsetSec, endSec: s.length / rate + offsetSec, level: cur });

  // fusionner les segments trop courts dans le precedent : une section de
  // moins de 2 s n'est pas une section, c'est une oscillation du lissage
  const merged = [];
  for (const seg of out) {
    const last = merged[merged.length - 1];
    if (last && seg.endSec - seg.startSec < minSec) {
      last.endSec = seg.endSec;
    } else {
      merged.push({ ...seg });
    }
  }
  // un premier segment trop court n'avait personne ou fusionner : il survivait
  // et etait compte comme une section (revue 2026-11-16)
  while (merged.length > 1 && merged[0].endSec - merged[0].startSec < minSec) {
    merged[1].startSec = merged[0].startSec;
    merged.shift();
  }
  return merged;
}
