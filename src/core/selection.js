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
  MEME_CLIP: 0.6,   // rester sur le meme clip coute, sans etre interdit
  // Un clip DEJA EMPLOYE coute tant qu'il reste un clip jamais vu. La valeur
  // est choisie strictement au-dessus du cout maximal des trois autres
  // termes (1 + 2 + 0,6 = 3,6) : un clip inedit gagne donc toujours, ce qui
  // est exactement la regle du §5.4 — « avec 5 a 8 clips, tous
  // apparaissent ». Sans ce terme, le glouton n'en employait que deux sur
  // cinq (mesure du 2026-11-21).
  DEJA_VU: 4
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

// Combien de creneaux on essaie par plage. Borne la recherche : sans elle,
// une plage de six secondes decoupee au temps offrirait des dizaines de
// departs quasi identiques, pour rien.
const CRENEAUX_MAX = 4;

// Meme recette de PRNG que `tests/fixtures-audio.js` : les trois
// propositions doivent etre reproductibles, sinon « trois autres » rendrait
// parfois deux fois la meme.
function prng(graine) {
  let s = (graine >>> 0) + 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function chevauche(intervalles, debut, fin) {
  for (const [a, b] of intervalles) {
    if (debut < b - 1e-9 && fin > a + 1e-9) return true;
  }
  return false;
}

export function choisirPlans({ longueurs, beatSec, clips, graine = 0 }) {
  const pris = clips.map(() => []);
  const rnd = prng(graine);
  const plans = [];
  const employes = new Set();
  let manque = 0;
  let precedent = null;

  for (const L of longueurs) {
    const durSec = L * beatSec;
    const candidats = [];

    clips.forEach((c, ci) => {
      for (const r of c.plages) {
        const n = Math.min(CRENEAUX_MAX, Math.floor((r.endSec - r.startSec) / durSec));
        for (let j = 0; j < n; j++) {
          const startSec = r.startSec + j * durSec;
          if (chevauche(pris[ci], startSec, startSec + durSec)) continue;
          candidats.push({
            clip: ci, nom: c.nom, note: r.note, empreinte: r.empreinte, startSec
          });
        }
      }
    });

    // Aucun creneau libre : on COMPTE le manque, on n'invente pas un plan en
    // reutilisant un instant deja pris (§5.4, regle invariante).
    if (!candidats.length) { manque++; continue; }

    // Le surcout « deja vu » ne s'applique que tant qu'un clip n'a jamais
    // servi ; une fois tous employes il disparait, et la selection
    // redevient libre.
    const resteInedit = employes.size < clips.length;
    const cout = (c) => coutCandidat(c, precedent)
                      + (resteInedit && employes.has(c.nom) ? POIDS.DEJA_VU : 0);
    candidats.sort((a, b) => cout(a) - cout(b));
    // Graine 0 prend toujours le meilleur : c'est la proposition de
    // reference. Les autres tirent parmi les trois meilleurs — c'est ce qui
    // distingue les trois montages (§8 laissait le choix a l'ouvrier).
    const k = graine === 0 ? 0 : Math.floor(rnd() * Math.min(3, candidats.length));
    const choisi = candidats[k];

    pris[choisi.clip].push([choisi.startSec, choisi.startSec + durSec]);
    employes.add(choisi.nom);
    plans.push({ nom: choisi.nom, startSec: choisi.startSec, durSec, temps: L });
    precedent = choisi;
  }

  return {
    plans,
    clipsInutilises: clips.map((c) => c.nom).filter((n) => !employes.has(n)),
    manque
  };
}
