// L'enchainement : de l'extrait choisi et des plages des clips, trois
// propositions de montage.
//
// Les trois partagent le MEME rythme et different par la selection (§5.4) :
// l'utilisateur compare trois montages du meme morceau, pas trois theories
// du montage.

import { longueursDePlans } from './decoupe.js';
import { choisirPlans } from './selection.js';

export function monter({ extrait, env, rate, offsetSec = 0, clips, graines = [0, 1, 2] }) {
  const beatSec = 60 / extrait.bpm;

  // C'est l'energie de l'EXTRAIT qui commande, pas celle du morceau (§5.4) :
  // on decoupe l'enveloppe a la fenetre avant de la lire. `offsetSec` date la
  // premiere trame de l'enveloppe, il faut le retrancher.
  const i0 = Math.max(0, Math.round((extrait.startSec - offsetSec) * rate));
  const i1 = Math.min(env.length, Math.round((extrait.startSec + extrait.durSec - offsetSec) * rate));
  const envExtrait = env.slice(i0, Math.max(i0 + 1, i1));

  const longueurs = longueursDePlans(envExtrait, rate, beatSec, extrait.beatCount);
  const durSec = longueurs.reduce((a, b) => a + b, 0) * beatSec;

  return graines.map((graine) => ({
    graine,
    longueurs,
    durSec,
    ...choisirPlans({ longueurs, beatSec, clips, graine })
  }));
}
