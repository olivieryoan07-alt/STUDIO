// Le verdict d'une image, et LE SEUL ENDROIT DU PROJET OU VIT UN SEUIL.
//
// Pourquoi tout est groupe ici : les seuils ne peuvent pas etre devines
// (§8 de la conception), ils se reglent contre les vraies videos. Or
// l'utilisateur regle sur son iPhone, par allers-retours. Chaque aller-retour
// doit donc couter UNE LIGNE a changer, pas une chasse dans quatre modules.

import { sharpness } from './laplacian.js';
import { tilt } from './horizon.js';
import { exposition } from './exposition.js';
import { empreinte } from './empreinte.js';

export const THRESHOLDS = {
  NETTETE_MIN: 60,         // variance du laplacien, image grise de 192 px
  INCLINAISON_MAX: 8,      // degres
  HORIZON_FORCE_MIN: 3,    // en MULTIPLES DU HASARD : en dessous, l'horizon
                           // n'est pas affirme, donc pas un motif de rejet.
                           // Mesure du 2026-11-20 sur quatre vrais clips :
                           // mediane 1,8 et maximum 4,8 fois le hasard, donc
                           // 3 retient a peu pres les images du dernier
                           // cinquieme — celles qui ont vraiment une ligne.
  NIVEAU_CRAME: 250,
  NIVEAU_BOUCHE: 8,
  CRAME_MAX: 0.08,
  BOUCHE_MAX: 0.20,
  RESSEMBLANCE_MAX: 10,    // distance de Hamming sous laquelle deux plans se
                           // ressemblent (consomme par le montage, phase 1C)
  TROU_MAX_SEC: 0.12,      // duree NON MESUREE toleree a l'interieur d'une
                           // plage, au-dela du pas normal. Vaut 120 ms, la
                           // secousse de marche que le §5.2 refuse de laisser
                           // passer entre deux mesures : au-dela, l'intervalle
                           // n'a pas ete regarde et la plage est coupee.
  PLAGE_MIN_SEC: 0.5,      // un plan dure au moins un temps : 0,43 s a 140 BPM
  BORD_SEC: 1.0            // §5.2 : jeter la premiere et la derniere seconde
};

// VALEURS DE DEPART ASSUMEES. Aucune n'a ete mesuree contre la vraie matiere.
// Elles seront reglees en seance sur l'iPhone, a la lecture des distributions
// affichees par `bench-video.html`. Les tenir pour justes serait l'erreur que
// la phase 1A a deja commise une fois.

// L'ordre des motifs n'est pas indifferent : une image floue est floue avant
// d'etre de travers, et mesurer un horizon dans du flou n'a pas de sens.
export function scoreFrame(gray, w, h) {
  const nettete = sharpness(gray, w, h);
  const incline = tilt(gray, w, h);
  const expo = exposition(gray, THRESHOLDS.NIVEAU_CRAME, THRESHOLDS.NIVEAU_BOUCHE);

  let motif = null;
  if (nettete < THRESHOLDS.NETTETE_MIN) {
    motif = 'nettete';
  } else if (incline.strength >= THRESHOLDS.HORIZON_FORCE_MIN
             && Math.abs(incline.angleDeg) > THRESHOLDS.INCLINAISON_MAX) {
    motif = 'horizon';
  } else if (expo.crame > THRESHOLDS.CRAME_MAX) {
    motif = 'crame';
  } else if (expo.bouche > THRESHOLDS.BOUCHE_MAX) {
    motif = 'bouche';
  }

  // L'ANGLE N'EST PUBLIE QUE S'IL VEUT DIRE QUELQUE CHOSE. Sur une image
  // texturee — feuillage, herbe, gravier, c'est-a-dire chaque plan de marche —
  // la force s'effondre et l'angle dominant degenere vers 44 degres : l'angle
  // d'un histogramme de bruit. Mesure a la relecture du 2026-11-19 : des la
  // texture la plus legere (+/-13 niveaux), la force tombe de 0,46 a 0,047.
  // Rendre `null` plutot qu'un nombre, c'est la meme regle que la
  // colorimetrie non lue : ne jamais laisser croire a une mesure.
  return {
    nettete,
    inclinaison: incline.strength >= THRESHOLDS.HORIZON_FORCE_MIN ? incline.angleDeg : null,
    forceHorizon: incline.strength,
    crame: expo.crame,
    bouche: expo.bouche,
    empreinte: empreinte(gray, w, h),
    ok: motif === null,
    motif
  };
}
