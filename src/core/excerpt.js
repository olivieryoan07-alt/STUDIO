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

// Forme de reference, en temps. REDUITE DEUX FOIS, et toujours pour la meme
// raison : la matiere disponible.
//   2026-11-20 : de 50 a 24 temps (15-25 s -> 7-12 s), quand l'utilisateur a
//     precise qu'il filme 5 a 10 clips de 3 a 5 s par randonnee.
//   2026-11-21 : de 24 a 16 temps (7-12 s -> 5-7 s), apres qu'il a essaye
//     l'ecran de choix sur son telephone et juge la duree trop longue.
// Seize temps, c'est quatre mesures. Les cinq phases gardent leurs
// proportions : la rafale tombe toujours aux trois quarts de l'extrait.
const OPENING = 3;
const RISE = 3;
const BODY = 6;
const BURST = 2;
const OUTRO = 2;

export const MIN_SEC = 5;
export const MAX_SEC = 7;

// Combien de temps dure la fenetre, et le refus quand c'est impossible.
// EXTRAIT de `anchorExcerpt` le 2026-11-21 : l'ecran de choix en a besoin
// sans point culminant, pour recalculer la fenetre apres un changement
// d'octave (§5.1 bis). Aucun changement de comportement.
export function nombreDeTemps(grid, durationSec) {
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

  // Second refus, ajoute a la relecture du 2026-11-21 : a tempo tres lent,
  // AUCUN nombre entier de temps ne tient entre 7 et 12 s. La fonction
  // rendait alors `maxBeats`, qui passe sous le plancher — mesure : quatre
  // tapes de `½×` depuis 140 BPM donnaient une fenetre de 6,86 s, cinq une
  // fenetre de 0,00 s, et l'ecran les ecrivait dans `studio.passage`.
  if (maxBeats < minBeats) {
    throw new Error(
      'à ' + (60 / beatSec).toFixed(1) + ' BPM, aucun nombre entier de temps ' +
      'ne tient entre ' + MIN_SEC + ' et ' + MAX_SEC + ' s'
    );
  }

  const full = OPENING + RISE + BODY + BURST + OUTRO; // 16
  return Math.min(Math.max(full, minBeats), maxBeats, maxByDuration);
}

export function anchorExcerpt({ durationSec, grid, climaxSec }) {
  const beatSec = grid.beatSec;
  const beatCount = nombreDeTemps(grid, durationSec);
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
