// Logique pure : comment poser une image source dans le cadre 9:16 de sortie,
// en tenant compte de la rotation inscrite dans le conteneur.
//
// Pourquoi ce module existe : l'iPhone stocke une video filmee verticalement
// en PAYSAGE, avec une rotation de 90 degres en metadonnee. WebCodecs rend
// l'image telle qu'elle est stockee et n'applique pas cette rotation. Sans ce
// calcul, tout le reel sort cadre de travers.
//
// Principe : on fait tourner le contexte de dessin, donc le recadrage se
// calcule dans l'orientation d'AVANT rotation. Pour un quart de tour, le cadre
// de destination est donc paysage (1920x1080), pas portrait.

import { cropRect } from './crop.js';

export function drawPlan(srcW, srcH, rotation, outW, outH) {
  const deg = ((Math.round(rotation) % 360) + 360) % 360;
  const quarterTurn = deg === 90 || deg === 270;

  // dimensions du cadre de destination avant rotation
  const drawW = quarterTurn ? outH : outW;
  const drawH = quarterTurn ? outW : outH;

  const crop = cropRect(srcW, srcH, drawW, drawH);

  return {
    radians: deg * Math.PI / 180,
    drawW,
    drawH,
    crop,
    // vrai des que la source a plus de pixels que le cadre : il y aura
    // reduction, donc ce n'est plus une copie pixel pour pixel
    downscale: crop.sw > drawW || crop.sh > drawH
  };
}
