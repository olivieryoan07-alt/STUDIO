// Logique pure : combien de temps dure chaque plan du reel.
//
// C'est la regle du §5.4, appliquee pour de bon : « la longueur de chaque
// plan est dictee par l'energie de l'extrait a cet instant ». La forme fixe
// de la premiere redaction n'existait que parce qu'on ignorait OU dans le
// morceau on se trouvait ; depuis que l'utilisateur choisit son passage, on
// a la vraie courbe et on la suit.

import { smoothEnvelope } from './sections.js';

export const FORME_REPLI = [3, 3, 6, 2, 2]; // ouverture, montee, corps, rafale, sortie
export const PLAN_MIN = 1;
export const PLAN_MAX = 4;
// En dessous de cet ecart relatif entre le creux et le sommet, la courbe ne
// porte aucune information : la suivre donnerait huit plans de meme longueur,
// c'est-a-dire l'anti-objectif 2. VALEUR DE DEPART ASSUMEE, a regler a
// l'ecoute comme les seuils video.
export const PLAT_MAX = 0.35;

const LISSAGE_SEC = 0.5; // pas 2 s comme le §5.3 : un extrait de 6 s est court

// Les phases ou l'on peut prendre ou rendre des temps, dans cet ordre :
// corps, sortie, montee, ouverture. La RAFALE n'est jamais touchee — c'est
// elle que l'utilisateur a validee a l'oreille (§5.4 bis).
const AJUSTABLES = [2, 4, 1, 0];

function replierSur(beatCount) {
  const out = FORME_REPLI.slice();
  let ecart = beatCount - out.reduce((a, b) => a + b, 0);

  while (ecart !== 0) {
    let bouge = false;
    for (const i of AJUSTABLES) {
      if (ecart === 0) break;
      if (ecart < 0 && out[i] > PLAN_MIN) { out[i]--; ecart++; bouge = true; }
      else if (ecart > 0) { out[i]++; ecart--; bouge = true; }
    }
    if (!bouge) break; // tout est au plancher : on rend ce qu'on peut
  }
  return out;
}

export function longueursDePlans(envExtrait, rate, beatSec, beatCount) {
  if (!(beatCount > 0)) return [];

  const lisse = smoothEnvelope(envExtrait, rate, LISSAGE_SEC);
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < lisse.length; i++) {
    if (lisse[i] < min) min = lisse[i];
    if (lisse[i] > max) max = lisse[i];
  }

  if (!(max > 0) || (max - min) / max < PLAT_MAX) return replierSur(beatCount);

  const longueurs = [];
  let temps = 0;
  while (temps < beatCount) {
    const i = Math.min(lisse.length - 1,
                       Math.max(0, Math.round(temps * beatSec * rate)));
    const e = (lisse[i] - min) / (max - min);
    let L = Math.round(PLAN_MAX - e * (PLAN_MAX - PLAN_MIN));
    L = Math.max(PLAN_MIN, Math.min(PLAN_MAX, L));
    // Le dernier plan ne deborde pas. Avec des longueurs entieres et un
    // plancher a un temps, le reste ne peut pas tomber SOUS le plancher sans
    // etre nul : un simple ecretage suffit.
    L = Math.min(L, beatCount - temps);
    longueurs.push(L);
    temps += L;
  }
  return longueurs;
}
