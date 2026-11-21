// Logique pure : combien de temps dure chaque plan du reel.
//
// C'est la regle du §5.4, appliquee pour de bon : « la longueur de chaque
// plan est dictee par l'energie de l'extrait a cet instant ». La forme fixe
// de la premiere redaction n'existait que parce qu'on ignorait OU dans le
// morceau on se trouvait ; depuis que l'utilisateur choisit son passage, on
// a la vraie courbe et on la suit.

import { smoothEnvelope } from './sections.js';

// La forme de reference du §5.4, en PLANS et non en phases. Le tableau de la
// spec a deux colonnes : le corps fait 6 temps A UNE COUPE TOUS LES DEUX
// TEMPS, donc trois plans de 2 — et la spec conclut « 8 plans sur 16 temps ».
// La premiere redaction lisait la colonne « Temps » comme une liste de plans
// et rendait cinq plans dont un de 6 temps, hors de la borne invariante
// « aucun plan ne dure plus de quatre » (relecture du 2026-11-21).
//   ouverture 3 | montee 3 | corps 2+2+2 | rafale 1+1 | sortie 2
export const FORME_REPLI = [3, 3, 2, 2, 2, 1, 1, 2];

// Dans quel ordre on sacrifie un plan quand il en faut moins : le corps du
// dernier au premier, puis la sortie, puis la montee. L'ouverture et la
// rafale restent jusqu'au bout (§5.4 bis).
const ORDRE_RETRAIT = [4, 3, 2, 7, 1];
// Dans quel ordre on rallonge ou raccourcit : corps, sortie, montee,
// ouverture, et la rafale en tout dernier recours.
const RANG_AJUST = [4, 3, 0, 0, 0, 5, 5, 1];
export const PLAN_MIN = 1;
export const PLAN_MAX = 4;
// En dessous de cet ecart relatif entre le creux et le sommet, la courbe ne
// porte aucune information : la suivre donnerait huit plans de meme longueur,
// c'est-a-dire l'anti-objectif 2. VALEUR DE DEPART ASSUMEE, a regler a
// l'ecoute comme les seuils video.
export const PLAT_MAX = 0.35;

const LISSAGE_SEC = 0.5; // pas 2 s comme le §5.3 : un extrait de 6 s est court

function replierSur(beatCount) {
  if (!(beatCount > 0)) return [];

  // 1. Retirer des plans tant que la cible n'est pas atteignable en ne
  // jouant que sur les plans souples — sans quoi on raccourcirait
  // l'ouverture, que le §5.4 bis veut intacte.
  let gardes = FORME_REPLI.map((_, i) => i);
  for (const victime of ORDRE_RETRAIT) {
    if (peutAtteindre(gardes, beatCount)) break;
    gardes = gardes.filter((i) => i !== victime);
  }

  const out = gardes.map((i) => FORME_REPLI[i]);
  let ecart = beatCount - out.reduce((a, b) => a + b, 0);

  // 2. Ajuster par GROUPES DE RANG, en epuisant chaque groupe avant de
  // passer au suivant. Une simple boucle sur l'ordre global touchait
  // l'ouverture alors que la montee pouvait encore ceder un temps
  // (relecture du 2026-11-21 : a 9 temps, ouverture a 2 au lieu de 3).
  const rangs = [...new Set(gardes.map((i) => RANG_AJUST[i]))].sort((a, b) => a - b);
  for (const rang of rangs) {
    const groupe = gardes.map((i, k) => k).filter((k) => RANG_AJUST[gardes[k]] === rang);
    let bouge = true;
    while (ecart !== 0 && bouge) {
      bouge = false;
      for (const k of groupe) {
        if (ecart === 0) break;
        if (ecart < 0 && out[k] > PLAN_MIN) { out[k]--; ecart++; bouge = true; }
        else if (ecart > 0 && out[k] < PLAN_MAX) { out[k]++; ecart--; bouge = true; }
      }
    }
    if (ecart === 0) break;
  }

  // 3. Tout est sature : on ajoute ou on retire un plan entier. La somme
  // est alors exacte par construction.
  let garde = 0;
  while (ecart !== 0 && garde++ < 100) {
    if (ecart > 0) {
      const ajout = Math.min(PLAN_MAX, ecart);
      out.push(ajout); ecart -= ajout;
    } else if (out.length > 1) {
      ecart += out.pop();
    } else {
      out[0] = Math.max(PLAN_MIN, beatCount); break;
    }
  }
  return out;
}

// Les plans gardes peuvent-ils, en jouant sur les seuls plans ajustables,
// atteindre exactement `beatCount` sans toucher a l'ouverture ni a la rafale ?
function peutAtteindre(gardes, beatCount) {
  let fixe = 0;
  let souples = 0;
  for (const i of gardes) {
    if (RANG_AJUST[i] >= 4) fixe += FORME_REPLI[i]; else souples++;
  }
  return fixe + souples * PLAN_MIN <= beatCount
      && fixe + souples * PLAN_MAX >= beatCount;
}

export function longueursDePlans(envExtrait, rate, beatSec, beatCount) {
  if (!(beatCount > 0)) return [];

  const lisse = smoothEnvelope(envExtrait, rate, LISSAGE_SEC);
  if (!lisse.length) return replierSur(beatCount);

  // DES PERCENTILES, PAS DES EXTREMES. Mesurer l'ecart entre le minimum et le
  // maximum, c'est ne regarder que deux echantillons : un seul coup de
  // cymbale sur un mur d'energie franchissait le seuil, et comme la
  // normalisation se calait sur ces memes extremes, tout le reste tombait a
  // zero — quatre plans de quatre temps, c'est-a-dire l'anti-objectif 2 que
  // ce repli existe pour eviter (relecture du 2026-11-21).
  const triees = Array.from(lisse).sort((a, b) => a - b);
  const q = (p) => triees[Math.min(triees.length - 1, Math.floor(p * (triees.length - 1)))];
  const bas = q(0.10);
  const haut = q(0.90);

  if (!(haut > 0) || (haut - bas) / haut < PLAT_MAX) return replierSur(beatCount);

  const longueurs = [];
  let temps = 0;
  while (temps < beatCount) {
    const i = Math.min(lisse.length - 1,
                       Math.max(0, Math.round(temps * beatSec * rate)));
    const e = Math.min(1, Math.max(0, (lisse[i] - bas) / (haut - bas)));
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
