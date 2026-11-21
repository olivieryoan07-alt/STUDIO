// Logique pure : quelle plage de quel clip remplit chaque plan du reel.
//
// Le §5.4 pose deux regles qui, prises comme interdictions, n'ont pas de
// solution commune sur de la marche en paysage : « deux segments consecutifs
// ne doivent pas se ressembler » et « jamais de rotation stricte entre
// clips ». Deux moments du meme chemin se ressemblent par nature ; avec peu
// de clips, interdire les deux ne laisse rien. Le selecteur PAIE donc une
// ressemblance au lieu de la refuser — et comme elle coute, il ne la repete
// pas vingt fois.

import { distance } from './empreinte.js';
import { THRESHOLDS } from './frame-score.js';

export const POIDS = {
  QUALITE: 1,       // une plage mal notee coute
  RESSEMBLANCE: 2,  // ressembler au plan precedent coute le double
  MEME_CLIP: 0.6    // rester sur le meme clip coute, sans etre interdit
};

// `candidat` et `precedent` : { clip, note, empreinte }. `precedent` vaut
// null pour le premier plan, qui ne peut ressembler a rien.
export function coutCandidat(candidat, precedent) {
  let cout = POIDS.QUALITE * (1 - candidat.note);
  if (!precedent) return cout;

  // La part de ressemblance decroit de 1 (empreintes identiques) a 0
  // (distance au seuil ou au-dela). Jamais d'infini : un montage doit
  // sortir meme quand toutes les plages se ressemblent.
  const d = distance(candidat.empreinte, precedent.empreinte);
  cout += POIDS.RESSEMBLANCE * Math.max(0, 1 - d / THRESHOLDS.RESSEMBLANCE_MAX);

  if (candidat.clip === precedent.clip) cout += POIDS.MEME_CLIP;
  return cout;
}
