// Fixtures d'image partagees par les tests du moteur video.
//
// Toutes les images sont en niveaux de gris, un octet par pixel, rangees en
// lignes : l'indice d'un pixel est `y * w + x`. C'est exactement ce que
// `versGris` produira a partir du canvas d'analyse.
//
// DETERMINISTE, et ce n'est pas un detail : en phase 1A, un `Math.random()`
// dans une fixture rendait un test instable une fois sur trois. Meme graine
// fixe ici, meme recette que `tests/fixtures-audio.js`.

function prng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function grayImage(w, h, fn) {
  const out = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) out[y * w + x] = fn(x, y);
  }
  return out;
}

export function aplat(w, h, valeur) {
  const out = new Uint8ClampedArray(w * h);
  out.fill(valeur);
  return out;
}

export function damier(w, h, pas) {
  return grayImage(w, h, (x, y) =>
    (Math.floor(x / pas) + Math.floor(y / pas)) % 2 === 0 ? 220 : 30);
}

// Moyenne glissante separable sur une fenetre de 2*rayon+1, bords repliques.
export function flou(gray, w, h, rayon) {
  const lu = (src, x, y) => src[Math.min(h - 1, Math.max(0, y)) * w
                              + Math.min(w - 1, Math.max(0, x))];
  const n = 2 * rayon + 1;

  const mid = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let d = -rayon; d <= rayon; d++) s += lu(gray, x + d, y);
      mid[y * w + x] = s / n;
    }
  }

  const out = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let d = -rayon; d <= rayon; d++) {
        s += mid[Math.min(h - 1, Math.max(0, y + d)) * w + x];
      }
      out[y * w + x] = Math.round(s / n);
    }
  }
  return out;
}

// Ligne d'horizon franche : clair au-dessus, sombre en dessous.
// `degres` positif fait MONTER l'horizon vers la droite, comme un cadre
// penche dans le sens des aiguilles d'une montre. C'est la convention que
// `tilt()` doit rendre : horizonIncline(w, h, 15) -> angleDeg ~ +15.
// Le passage clair/sombre est ADOUCI sur deux pixels, et ce n'est pas un
// ornement : une frontiere en marche d'escalier ferait lire au filtre de
// Sobel une succession de contours horizontaux et de marches verticales,
// jamais l'inclinaison reelle. Un vrai horizon est adouci par l'optique ;
// une fixture a bord dur mesurerait un artefact de rasterisation.
export function horizonIncline(w, h, degres) {
  const pente = Math.tan(degres * Math.PI / 180);
  return grayImage(w, h, (x, y) => {
    const frontiere = h / 2 - (x - w / 2) * pente;
    const t = Math.max(0, Math.min(1, 0.5 + (frontiere - y) / 2));
    return Math.round(40 + t * 160);
  });
}

export function bruit(w, h, graine) {
  const rnd = prng(graine);
  const out = new Uint8ClampedArray(w * h);
  for (let i = 0; i < out.length; i++) out[i] = Math.floor(rnd() * 256);
  return out;
}
