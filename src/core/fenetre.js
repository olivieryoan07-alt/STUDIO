// Logique pure de la fenetre de choix du passage musical (§5.1 bis).
//
// L'ecran n'est qu'un dessin et des evenements de pointeur par-dessus ce
// module : tout ce qui decide ou se trouve la fenetre se teste ici, dans
// Chrome, en quelques secondes et sans audio.

import { nombreDeTemps } from './excerpt.js';

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
