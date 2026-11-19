// Logique pure : de combien le cadre penche, lu dans l'orientation dominante
// des contours proches de l'horizontale.
//
// Pourquoi seulement les contours PROCHES DE L'HORIZONTALE : un paysage est
// plein de verticales — troncs, poteaux, batiments. L'orientation dominante
// de TOUS les contours y serait souvent verticale, et ne dirait rien de
// l'horizon. On ne fait donc voter que ce qui pourrait etre un horizon.
//
// Pourquoi `strength` existe : sans elle, une image sans aucun contour franc
// (brouillard, mur, ciel uni) renverrait un angle tire du bruit, et ferait
// rejeter une image parfaitement bonne. En dessous du seuil, l'inclinaison
// n'est pas un motif de rejet — c'est `frame-score.js` qui en decide.

const CLASSES = 90;   // une classe par degre, sur ]-45, 45]
const DEMI = CLASSES / 2;

export function tilt(gray, w, h) {
  if (w < 3 || h < 3) return { angleDeg: 0, strength: 0 };

  const poids = new Float64Array(CLASSES);
  let total = 0;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const hg = gray[i - w - 1], hc = gray[i - w], hd = gray[i - w + 1];
      const mg = gray[i - 1], md = gray[i + 1];
      const bg = gray[i + w - 1], bc = gray[i + w], bd = gray[i + w + 1];

      const gx = (hd + 2 * md + bd) - (hg + 2 * mg + bg);
      const gy = (bg + 2 * bc + bd) - (hg + 2 * hc + hd);

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      if (magnitude === 0) continue;
      total += magnitude;

      // Le contour est perpendiculaire au gradient : direction (-gy, gx).
      // On exprime l'angle en convention « image a l'endroit », ou un angle
      // positif fait monter la ligne vers la droite — d'ou le signe.
      let deg = -Math.atan2(gx, -gy) * 180 / Math.PI;
      // une ligne et son opposee sont la meme ligne : periode 180
      while (deg <= -90) deg += 180;
      while (deg > 90) deg -= 180;

      // les verticales comptent dans le total mais ne votent pas
      if (deg <= -45 || deg > 45) continue;

      const classe = Math.min(CLASSES - 1, Math.max(0, Math.floor(deg + DEMI)));
      poids[classe] += magnitude;
    }
  }

  if (total === 0) return { angleDeg: 0, strength: 0 };

  let dominante = 0;
  for (let c = 1; c < CLASSES; c++) if (poids[c] > poids[dominante]) dominante = c;
  if (poids[dominante] === 0) return { angleDeg: 0, strength: 0 };

  const avant = dominante > 0 ? poids[dominante - 1] : 0;
  const apres = dominante < CLASSES - 1 ? poids[dominante + 1] : 0;

  // affinage parabolique : la classe fait un degre de large, la vraie
  // inclinaison tombe rarement en son centre
  const denominateur = avant - 2 * poids[dominante] + apres;
  const correction = denominateur === 0 ? 0 : 0.5 * (avant - apres) / denominateur;

  return {
    angleDeg: dominante - DEMI + 0.5 + correction,
    strength: (avant + poids[dominante] + apres) / total
  };
}
