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
//
// `strength` SE LIT EN MULTIPLES DU HASARD : 1 veut dire « aucune direction
// privilegiee », 5 veut dire « cinq fois plus de contours dans ces trois
// degres que si tout etait quelconque ». Une simple part de l'energie totale
// ne se lisait pas : mesuree sur quatre vrais clips le 2026-11-20, elle
// plafonnait a 0,08 pour un seuil a 0,12, et le critere d'horizon ne s'est
// declenche sur aucune des 409 images. Le nombre ne disait pas non plus a
// partir de quand il etait grand, puisqu'il depend du nombre de classes.

const CLASSES = 90;   // une classe par degre, sur ]-45, 45]
const DEMI = CLASSES / 2;
// La fenetre lue fait 3 classes, soit 3 degres sur les 180 que peut prendre
// l'orientation d'une ligne. Une image sans direction privilegiee en met donc
// cette part-la par hasard : c'est l'unite dans laquelle `strength` se lit.
const PART_DU_HASARD = 3 / 180;

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
    strength: ((avant + poids[dominante] + apres) / total) / PART_DU_HASARD
  };
}
