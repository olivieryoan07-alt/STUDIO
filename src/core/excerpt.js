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
  const maxByDuration = Math.floor(durationSec / beatSec);

  // Refus explicite plutot qu'extrait tronque en silence : a 170-190 BPM sur
  // un morceau de 15 s, l'ancienne version rendait 14,8 s en passant sous son
  // propre plancher (revue 2026-11-16).
  if (maxByDuration < minBeats) {
    throw new Error(
      'le morceau dure ' + durationSec.toFixed(1) + ' s : impossible d’en tirer ' +
      MIN_SEC + ' s de temps entiers à ' + (60 / beatSec).toFixed(0) + ' BPM'
    );
  }

  const full = OPENING + RISE + BODY + BURST + OUTRO; // 50
  const beatCount = Math.min(Math.max(full, minBeats), maxBeats, maxByDuration);
  const durSec = beatCount * beatSec;

  let startSec = climaxSec - (OPENING + RISE + BODY) * beatSec;
  if (startSec < 0) startSec = 0;
  if (startSec + durSec > durationSec) startSec = Math.max(0, durationSec - durSec);

  // La rafale suit le point culminant REEL, pas la mise en page theorique.
  // Sans ce recalcul, un extrait recale annoncait toujours « 38e temps » et
  // posait la rafale jusqu'a 13 s du drop (revue 2026-11-16).
  let burstBeatIndex = Math.round((climaxSec - startSec) / beatSec);
  burstBeatIndex = Math.max(0, Math.min(beatCount - 1, burstBeatIndex));

  return { startSec, durSec, beatCount, burstBeatIndex };
}
