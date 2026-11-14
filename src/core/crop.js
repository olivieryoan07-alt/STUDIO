// Logique pure : rectangle de recadrage centre, en 9:16.
//
// Sur la matiere du projet (1080x1920 filme en vertical) le resultat est
// l'identite : aucune perte, copie pixel pour pixel. Les autres cas existent
// pour qu'un clip filme autrement ne casse pas le montage.
//
// H.264 exige des dimensions paires. Toute dimension produite ici l'est,
// et ne sort jamais des bornes de la source.

function evenUp(n) {
  const i = Math.ceil(n);
  return i % 2 === 0 ? i : i + 1;
}

function evenDown(n) {
  const i = Math.floor(n);
  return i % 2 === 0 ? i : i - 1;
}

export function cropRect(srcW, srcH, dstW, dstH) {
  const target = dstW / dstH;

  let sw;
  let sh;
  if (srcW / srcH > target) {
    // source trop large : on garde toute la hauteur
    sh = srcH;
    sw = sh * target;
  } else {
    // source trop haute (ou deja au bon rapport) : on garde toute la largeur
    sw = srcW;
    sh = sw / target;
  }

  sw = Math.min(evenUp(sw), evenDown(srcW));
  sh = Math.min(evenUp(sh), evenDown(srcH));

  return {
    sx: Math.floor((srcW - sw) / 2),
    sy: Math.floor((srcH - sh) / 2),
    sw,
    sh
  };
}
