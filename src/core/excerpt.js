// Logique pure : ou placer l'extrait dans le morceau.
//
// §5.4 bis de la conception. La forme validee a l'oreille par l'utilisateur
// fait 50 temps : 38 avant le point culminant, 12 apres.
//
//   ouverture 8 | montee 8 | corps 22 | RAFALE 4 | sortie 8
//                                     ^ point culminant, au 38e temps
//
// Quand le tempo rend ces 50 temps trop longs ou trop courts, on ajuste
// UNIQUEMENT le corps puis la sortie : l'ouverture, la montee et la rafale
// gardent leur forme, puisque c'est elle qui a ete validee.

const OPENING = 8;
const RISE = 8;
const BODY = 22;
const BURST = 4;
const OUTRO = 8;

export const MIN_SEC = 15;
export const MAX_SEC = 25;

export function anchorExcerpt({ durationSec, grid, climaxSec }) {
  const beatSec = grid.beatSec;

  if (durationSec < MIN_SEC) {
    throw new Error(
      'le morceau dure ' + durationSec.toFixed(1) +
      ' s, il en faut au moins ' + MIN_SEC + ' pour un extrait'
    );
  }

  const minBeats = Math.ceil(MIN_SEC / beatSec);
  const maxBeats = Math.floor(MAX_SEC / beatSec);
  const full = OPENING + RISE + BODY + BURST + OUTRO; // 50
  let beatCount = Math.min(Math.max(full, minBeats), maxBeats);

  // l'extrait ne peut pas depasser le morceau
  beatCount = Math.min(beatCount, Math.floor(durationSec / beatSec));

  // retirer d'abord dans le corps, ensuite dans la sortie
  let body = BODY;
  let outro = OUTRO;
  let surplus = full - beatCount;
  if (surplus > 0) {
    const fromBody = Math.min(surplus, BODY);
    body -= fromBody;
    surplus -= fromBody;
    outro = Math.max(0, OUTRO - surplus);
  } else if (surplus < 0) {
    body += -surplus; // allonger le corps quand le tempo est tres rapide
  }

  const burstBeatIndex = OPENING + RISE + body;
  const durSec = beatCount * beatSec;

  let startSec = climaxSec - burstBeatIndex * beatSec;
  if (startSec < 0) startSec = 0;
  if (startSec + durSec > durationSec) startSec = Math.max(0, durationSec - durSec);

  return { startSec, durSec, beatCount, burstBeatIndex };
}
