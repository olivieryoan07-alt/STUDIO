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

// Forme de reference, en temps. REDUITE DE MOITIE le 2026-11-20 : le reel
// passe de 15-25 s a 7-12 s, parce que la matiere reelle de l'utilisateur —
// 5 a 10 clips de 3 a 5 s par randonnee — n'en offre pas davantage sans
// reutiliser le meme instant source, ce que le §5.4 interdit. Les cinq
// phases gardent leurs proportions : la rafale tombe toujours aux trois
// quarts de l'extrait.
const OPENING = 4;
const RISE = 4;
const BODY = 10;
const BURST = 2;
const OUTRO = 4;

export const MIN_SEC = 7;
export const MAX_SEC = 12;

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

  const full = OPENING + RISE + BODY + BURST + OUTRO; // 24
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
