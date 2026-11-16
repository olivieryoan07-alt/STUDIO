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

export function smoothEnvelope(env, rate, windowSec = 2) {
  const w = Math.max(1, Math.round(rate * windowSec));
  const out = new Float32Array(env.length);
  let run = 0;
  for (let i = 0; i < env.length; i++) {
    run += env[i];
    if (i >= w) run -= env[i - w];
    out[i] = run / Math.min(i + 1, w);
  }
  return out;
}

export function findClimax(env, rate) {
  const s = smoothEnvelope(env, rate, 2);
  const before = Math.max(1, Math.round(rate * BEFORE_SEC));
  const after = Math.max(1, Math.round(rate * AFTER_SEC));

  let bestIndex = 0;
  let bestRatio = 0;

  for (let i = before; i + after < s.length; i++) {
    let avant = 0;
    for (let k = i - before; k < i; k++) avant += s[k];
    avant /= before;

    let apres = 0;
    for (let k = i; k < i + after; k++) apres += s[k];
    apres /= after;

    // le +epsilon evite une division par zero sur un passage parfaitement muet
    const ratio = apres / (avant + 1e-9);
    if (ratio > bestRatio) { bestRatio = ratio; bestIndex = i; }
  }

  return { timeSec: bestIndex / rate, stepRatio: bestRatio };
}

export function sections(env, rate, minSec = 2) {
  const s = smoothEnvelope(env, rate, 2);
  let max = 0;
  for (let i = 0; i < s.length; i++) if (s[i] > max) max = s[i];
  if (max <= 0) return [{ startSec: 0, endSec: s.length / rate, level: 0 }];

  const level = (i) => Math.round((s[i] / max) * 3);

  const out = [];
  let start = 0;
  let cur = level(0);
  for (let i = 1; i < s.length; i++) {
    const l = level(i);
    if (l !== cur) {
      out.push({ startSec: start / rate, endSec: i / rate, level: cur });
      start = i;
      cur = l;
    }
  }
  out.push({ startSec: start / rate, endSec: s.length / rate, level: cur });

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
  return merged;
}
