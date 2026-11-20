// Logique pure : des mesures image par image aux PLAGES EXPLOITABLES d'un
// clip, notees et triees. C'est la sortie du moteur d'analyse video (§5.2),
// et l'entree du moteur de montage (§5.4) : celui-ci choisit parmi ces plages.

import { THRESHOLDS } from './frame-score.js';

const MOTIFS = ['bord', 'nettete', 'horizon', 'crame', 'bouche'];

// Pas d'echantillonnage reel, deduit des mesures plutot que suppose : la
// cadence d'analyse depend de la cadence de la source (§5.2) et une plage
// mal bornee decalerait toutes les coupes du montage.
//
// MEDIANE et non moyenne : un seul trou dans la mesure — images perdues dans
// le callback du decodeur, ou cadence variable — gonflerait la moyenne et
// allongerait la borne de fin de toutes les plages.
function pasDeMesure(mesures) {
  if (mesures.length < 2) return 0;
  const ecarts = [];
  for (let i = 1; i < mesures.length; i++) {
    ecarts.push(mesures[i].timeSec - mesures[i - 1].timeSec);
  }
  ecarts.sort((a, b) => a - b);
  return ecarts[ecarts.length >> 1];
}

export function usableRanges(mesures, durationSec) {
  const rejets = {};
  for (const m of MOTIFS) rejets[m] = 0;

  if (mesures.length === 0) return { plages: [], rejets, secondesUtiles: 0 };

  const pas = pasDeMesure(mesures);
  // Le bord est une duree fixe PLAFONNEE a une part du clip : une seconde sur
  // un clip de vingt, c'est la secousse du bouton ; une seconde sur un clip de
  // trois, c'est le clip.
  const bord = Math.min(THRESHOLDS.BORD_SEC, durationSec * THRESHOLDS.BORD_PART_MAX);
  const finDeZone = durationSec - bord;

  // 1. Le bord d'abord, et sans appel : §5.2 jette la premiere et la derniere
  // seconde quelle que soit la qualite — c'est la ou l'on appuie sur le bouton.
  // Une mesure a l'instant t couvre [t, t+pas[ : elle appartient a la derniere
  // seconde des qu'elle l'atteint, d'ou le `>=`.
  const retenues = mesures.map((m) => {
    if (m.timeSec < bord || m.timeSec >= finDeZone) {
      rejets.bord++;
      return false;
    }
    if (!m.ok) {
      if (rejets[m.motif] === undefined) rejets[m.motif] = 0;
      rejets[m.motif]++;
      return false;
    }
    return true;
  });

  // 2. Les mesures retenues consecutives forment une plage ; une seule mesure
  // rejetee au milieu la coupe en deux.
  //
  // ET UN TROU DE TEMPS LA COUPE AUSSI. Grouper par indice seul laissait
  // traverser un intervalle jamais mesure : 40 mesures jusqu'a 2,95 s, un trou
  // de 5 s, 40 mesures depuis 8,00 s ressortaient en UNE plage de 9 s notee
  // 1,00 — la mieux notee du clip, dont cinq secondes n'avaient jamais ete
  // regardees. Le montage y aurait coupe en croyant choisir le meilleur.
  //
  // Ce qu'on compare est le trou AU-DELA du pas normal, pas l'ecart brut : une
  // mesure manquante de temps en temps est banale et ne cache rien. Premier
  // essai a 1,5 x le pas : sur un vrai fichier a cadence variable, des trous
  // de 40 ms coupaient le clip en dix plages dont une de 0,75 s. Le seuil est
  // donc ancre sur l'argument du §5.2 — 120 ms, la secousse de marche — et
  // non sur un multiple choisi au hasard.
  const groupes = [];
  let courant = null;
  for (let i = 0; i < mesures.length; i++) {
    const saut = i > 0
      && (mesures[i].timeSec - mesures[i - 1].timeSec) - pas > THRESHOLDS.TROU_MAX_SEC;
    if (retenues[i] && !(saut && courant !== null)) {
      if (courant === null) courant = [i, i]; else courant[1] = i;
    } else {
      if (courant !== null) { groupes.push(courant); courant = null; }
      if (retenues[i]) courant = [i, i];
    }
  }
  if (courant !== null) groupes.push(courant);

  // 4. La note est relative au clip : la netteté absolue d'une image depend de
  // la scene, pas de sa qualite. On compare donc chaque plage au meilleur que
  // ce clip-ci ait offert.
  let netteteMax = 0;
  for (const m of mesures) if (m.nettete > netteteMax) netteteMax = m.nettete;

  const plages = [];
  let secondesUtiles = 0;

  for (const [debut, fin] of groupes) {
    const startSec = mesures[debut].timeSec;
    const endSec = mesures[fin].timeSec + pas;
    // 3. Une plage trop courte ne peut porter aucun plan.
    if (endSec - startSec < THRESHOLDS.PLAGE_MIN_SEC) continue;

    let somme = 0;
    for (let i = debut; i <= fin; i++) somme += mesures[i].nettete;
    const moyenne = somme / (fin - debut + 1);

    plages.push({
      startSec,
      endSec,
      note: netteteMax === 0 ? 0 : moyenne / netteteMax,
      // 5. l'empreinte de la mesure mediane represente la plage
      empreinte: mesures[Math.floor((debut + fin) / 2)].empreinte
    });
    secondesUtiles += endSec - startSec;
  }

  plages.sort((a, b) => b.note - a.note);
  return { plages, rejets, secondesUtiles };
}
