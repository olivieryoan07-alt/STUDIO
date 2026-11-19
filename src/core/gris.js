// Logique pure : ce qui separe une image decodee d'une image mesurable.
// Trois choses, toutes testables sans decodeur — c'est ce qui permet a la
// boucle Mac de tourner sans le moindre fichier video.

import { drawPlan } from './draw-plan.js';

// Luma Rec. 601. Les quatre criteres du §5.2 portent sur la luminosite, pas
// sur la couleur : un horizon de travers l'est aussi en noir et blanc, et
// travailler sur un seul canal divise par quatre la matiere a parcourir.
export function versGris(rgba) {
  const n = rgba.length >> 2;
  const out = new Uint8ClampedArray(n);
  for (let i = 0; i < n; i++) {
    const j = i << 2;
    out[i] = Math.round(0.299 * rgba[j] + 0.587 * rgba[j + 1] + 0.114 * rgba[j + 2]);
  }
  return out;
}

// Une image sur combien ? §5.2 demande 20 mesures par seconde : a 10 Hz une
// secousse de marche de 120 ms passe entre deux mesures, a 20 Hz aucune
// n'echappe. Jamais moins de 1, sans quoi on sauterait tout le clip.
export function pasAnalyse(fps, hz) {
  return Math.max(1, Math.round(fps / hz));
}

// Le cadre d'analyse est TOUJOURS debout et au format du reel : on mesure
// l'image telle qu'elle sera publiee, pas telle qu'elle est stockee. L'iPhone
// range une video verticale en paysage avec une rotation de 90 degres en
// metadonnee (§5.2) ; `drawPlan` sait la rendre, et c'est lui qui decide que
// le cadre de dessin est paysage pour un quart de tour.
export function cadreAnalyse(srcW, srcH, rotation, largeur) {
  const hauteur = 2 * Math.round(largeur * 16 / 9 / 2); // pair, comme en sortie
  return { plan: drawPlan(srcW, srcH, rotation, largeur, hauteur), w: largeur, h: hauteur };
}
