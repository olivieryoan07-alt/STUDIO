// Logique pure : des mesures image par image aux PLAGES EXPLOITABLES d'un
// clip, notees et triees. C'est la sortie du moteur d'analyse video (§5.2),
// et l'entree du moteur de montage (§5.4) : celui-ci choisit parmi ces plages.

import { THRESHOLDS } from './frame-score.js';

const MOTIFS = ['bord', 'nettete', 'horizon', 'crame', 'bouche'];

// Pas d'echantillonnage reel, deduit des mesures plutot que suppose : la
// cadence d'analyse depend de la cadence de la source (§5.2) et une plage
// mal bornee decalerait toutes les coupes du montage.
function pasDeMesure(mesures) {
  if (mesures.length < 2) return 0;
  return (mesures[mesures.length - 1].timeSec - mesures[0].timeSec) / (mesures.length - 1);
}

export function usableRanges(mesures, durationSec) {
  const rejets = {};
  for (const m of MOTIFS) rejets[m] = 0;

  if (mesures.length === 0) return { plages: [], rejets, secondesUtiles: 0 };

  const pas = pasDeMesure(mesures);
  const finDeZone = durationSec - THRESHOLDS.BORD_SEC;

  // 1. Le bord d'abord, et sans appel : §5.2 jette la premiere et la derniere
  // seconde quelle que soit la qualite — c'est la ou l'on appuie sur le bouton.
  // Une mesure a l'instant t couvre [t, t+pas[ : elle appartient a la derniere
  // seconde des qu'elle l'atteint, d'ou le `>=`.
  const retenues = mesures.map((m) => {
    if (m.timeSec < THRESHOLDS.BORD_SEC || m.timeSec >= finDeZone) {
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
  const groupes = [];
  let courant = null;
  for (let i = 0; i < mesures.length; i++) {
    if (retenues[i]) {
      if (courant === null) courant = [i, i]; else courant[1] = i;
    } else if (courant !== null) {
      groupes.push(courant); courant = null;
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
