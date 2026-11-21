// Logique pure de la fenetre de choix du passage musical (§5.1 bis).
//
// L'ecran n'est qu'un dessin et des evenements de pointeur par-dessus ce
// module : tout ce qui decide ou se trouve la fenetre se teste ici, dans
// Chrome, en quelques secondes et sans audio.

import { nombreDeTemps, anchorExcerpt } from './excerpt.js';

// Un tempo peut ne pas avoir ete detecte : morceau sans percussion nette,
// fichier trop court, analyse ratee. On renonce alors au calage plutot que
// de diviser par zero ou de boucler.
function grilleUtilisable(grid) {
  return grid && Number.isFinite(grid.beatSec) && grid.beatSec > 0;
}

export function calerSurTemps(sec, grid) {
  if (!grilleUtilisable(grid)) return sec;
  const b = grid.beatSec;
  return grid.offsetSec + Math.round((sec - grid.offsetSec) / b) * b;
}

// Cale sur un temps PUIS ramene dans le morceau — et le ramene de temps en
// temps, pas au pixel pres. Rester sur un temps prime : le §5.4 bis en fait
// la condition pour que la premiere coupe du reel tombe sur le rythme.
export function placer(startSec, { durationSec, grid, durSec }) {
  const max = Math.max(0, durationSec - durSec);
  const depart = Number.isFinite(startSec) ? startSec : 0;

  if (!grilleUtilisable(grid)) return Math.min(max, Math.max(0, depart));

  const b = grid.beatSec;
  let s = calerSurTemps(depart, grid);
  if (s < 0) s += Math.ceil(-s / b) * b;            // premier temps >= 0
  if (s > max) s -= Math.ceil((s - max) / b) * b;   // dernier temps <= max
  // la fenetre occupe tout le morceau : aucun temps ne rentre, on colle au debut
  if (s < 0) s = 0;
  return s;
}

// La position d'ouverture du §5.1 bis : le plus grand saut d'energie du
// morceau, rétrogradé au rang de simple suggestion de depart. On laisse
// tomber `burstBeatIndex` qu'`anchorExcerpt` calcule encore : depuis la
// revision du §5.4, la rafale n'est plus posee par la mise en page mais
// deduite de l'energie de l'extrait, et c'est l'affaire du plan 1C-2.
export function fenetreInitiale({ durationSec, grid, climaxSec }) {
  const { startSec, durSec, beatCount } = anchorExcerpt({ durationSec, grid, climaxSec });
  return { startSec, durSec, beatCount };
}

// Le reglage fin au bouton. `placer` fait le reste du travail : contre un
// bord, la fenetre ne bouge pas plutot que de sortir ou de retrecir.
export function decalerDeTemps(fenetre, n, { durationSec, grid }) {
  const pas = grilleUtilisable(grid) ? grid.beatSec : 0;
  const vise = fenetre.startSec + n * pas;
  return {
    ...fenetre,
    startSec: placer(vise, { durationSec, grid, durSec: fenetre.durSec })
  };
}

// `½×` / `2×`. La phase est conservee : un temps sur deux reste un temps.
// `beats` est abandonne — le tableau serait perimé, et rien en aval ne le
// consomme (verifie le 2026-11-21 : les clics se calculent de `beatSec` et
// `offsetSec`).
export function changerOctave(grid, facteur) {
  return { beatSec: grid.beatSec / facteur, offsetSec: grid.offsetSec, beats: [] };
}

// Apres un changement d'octave, la fenetre n'a plus la meme longueur : le
// nombre de temps se recalcule, et le debut se replace au plus pres.
// L'erreur de `nombreDeTemps` remonte telle quelle — c'est l'appelant qui
// decide de garder l'octave precedente.
export function redimensionner(fenetre, { durationSec, grid }) {
  const beatCount = nombreDeTemps(grid, durationSec);
  const durSec = beatCount * grid.beatSec;
  return {
    startSec: placer(fenetre.startSec, { durationSec, grid, durSec }),
    durSec,
    beatCount
  };
}

// Pixel <-> seconde, et dans les deux sens la meme convention : le morceau
// entier occupe exactement la largeur. Les deux bornent, parce qu'un doigt
// deborde du canevas en permanence et qu'un temps negatif n'existe pas.
export function xPourTemps(t, largeur, durationSec) {
  if (!(durationSec > 0)) return 0;
  return Math.min(1, Math.max(0, t / durationSec)) * largeur;
}

export function tempsPourX(x, largeur, durationSec) {
  if (!(largeur > 0)) return 0;
  return Math.min(1, Math.max(0, x / largeur)) * durationSec;
}
