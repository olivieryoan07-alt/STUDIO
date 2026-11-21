// Dessin de la piste du morceau entier et de la fenetre choisie (§5.1 bis).
//
// C'est l'enveloppe d'energie qui rend le choix instantane : la structure du
// morceau — intro, entree du groupe, cassure, reprise — se lit d'un coup
// d'oeil, sans ecouter. L'utilisateur a deja designe le bon endroit sur une
// simple copie d'ecran, sans le moindre son.

import { xPourTemps } from '../core/fenetre.js';

export const HAUTEUR_PISTE = 96;

const FOND = '#141821';
const ONDE = '#5b6bb5';
const ONDE_DEDANS = '#9aa8e0';
const AMBRE = '#e9a640';

export function dessinerPiste(canvas, { env, rate, offsetSec, durationSec, fenetre }) {
  // Meme recette que `src/bench/clip-view.js`, pour la meme raison : une
  // largeur fixe ramenee a 343 px sur un telephone divise tout par trois.
  const dpr = window.devicePixelRatio || 1;
  const L = canvas.clientWidth || 360;
  const H = HAUTEUR_PISTE;
  canvas.width = Math.round(L * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.height = H + 'px';

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, L, H);
  ctx.fillStyle = FOND;
  ctx.fillRect(0, 0, L, H);

  if (!env || !env.length || !(durationSec > 0)) return;

  let crete = 0;
  for (let i = 0; i < env.length; i++) if (env[i] > crete) crete = env[i];
  if (crete <= 0) crete = 1;

  const debut = fenetre ? xPourTemps(fenetre.startSec, L, durationSec) : -1;
  const fin = fenetre ? xPourTemps(fenetre.startSec + fenetre.durSec, L, durationSec) : -1;

  // Une barre par pixel, a la CRETE de la tranche : prendre la moyenne
  // lisserait justement les ruptures que l'utilisateur vient chercher.
  for (let x = 0; x < L; x++) {
    const t0 = (x / L) * durationSec;
    const t1 = ((x + 1) / L) * durationSec;
    let i0 = Math.max(0, Math.floor((t0 - offsetSec) * rate));
    const i1 = Math.min(env.length - 1, Math.ceil((t1 - offsetSec) * rate));
    let v = 0;
    for (; i0 <= i1; i0++) if (env[i0] > v) v = env[i0];

    const h = Math.max(1, (v / crete) * (H - 8));
    ctx.fillStyle = (x >= debut && x < fin) ? ONDE_DEDANS : ONDE;
    ctx.fillRect(x, H - 4 - h, 1, h);
  }

  if (!fenetre) return;

  // La fenetre : un voile ambre et deux bords francs.
  ctx.fillStyle = 'rgba(233,166,64,0.16)';
  ctx.fillRect(debut, 0, Math.max(2, fin - debut), H);
  ctx.fillStyle = AMBRE;
  ctx.fillRect(debut - 1, 0, 2, H);
  ctx.fillRect(fin - 1, 0, 2, H);
}
