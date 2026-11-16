// Logique pure : ramener une mesure a l'echelle d'un vrai reel, puis rendre
// le verdict de la phase 0.
//
// Piege corrige le 2026-11-16 : la sonde chronometre le CLIP D'ESSAI, pas un
// reel. Mesure du 2026-11-14 : 7340 ms pour 178 images (un clip de 5,9 s).
// Multiplier ce chiffre par trois annoncait « 22 s pour trois montages ».
// C'etait faux : un reel de 20 s a 30 img/s fait 600 images, pas 178. Le vrai
// cout est ~25 s par montage, ~74 s a trois.

const BUDGET_MS = 120_000; // seuil de repli du §5.5 : trois encodages

export function msPerReel(msPipeline, frames, fps, reelSeconds) {
  if (!frames || frames <= 0) return 0;
  const msPerFrame = msPipeline / frames;
  return msPerFrame * fps * reelSeconds;
}

export function buildReport(m) {
  const totalMs = Math.round((m.encodeMsPerReel || 0) * 3);

  let verdict;
  if (!m.share || !m.roundTrip) {
    verdict = 'bloque';
  } else if (totalMs > BUDGET_MS) {
    verdict = 'repli';
  } else {
    verdict = 'go';
  }

  const rows = [
    ['Partage vers Photos', m.share ? 'oui' : 'non', !!m.share],
    ['Aller-retour complet', m.roundTrip ? 'oui' : 'non', !!m.roundTrip],
    ['Encodage AAC', m.aac ? 'oui' : 'non', !!m.aac],
    ['Un montage de 20 s', Math.round((m.encodeMsPerReel || 0) / 1000) + ' s', true],
    ['Trois montages', Math.round(totalMs / 1000) + ' s', totalMs <= BUDGET_MS]
  ];

  return { verdict, totalMs, budgetMs: BUDGET_MS, rows };
}
