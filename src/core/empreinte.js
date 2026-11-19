// Logique pure : une empreinte de 64 bits qui dit si deux plans se
// ressemblent, et la distance entre deux empreintes.
//
// Methode : dHash. L'image est reduite a 9 colonnes sur 8 lignes par MOYENNE
// de blocs, puis chaque bit dit si une case est plus sombre que sa voisine de
// droite. 8 comparaisons par ligne, 8 lignes, 64 bits.
//
// Pourquoi comparer des voisins plutot que garder les niveaux : la comparaison
// survit a un changement de luminosite ou d'exposition. Deux plans du meme
// chemin a deux moments de la journee doivent se ressembler — c'est
// exactement ce que le critere cherche (§5.2).
//
// Pourquoi une MOYENNE de blocs et non un echantillonnage : une image de
// marche est bruitee, et echantillonner un pixel sur sept y lirait du bruit.

const COLONNES = 9;
const LIGNES = 8;

function moyennesDeBlocs(gray, w, h) {
  const out = new Float64Array(COLONNES * LIGNES);

  for (let r = 0; r < LIGNES; r++) {
    const y0 = Math.floor(r * h / LIGNES);
    const y1 = Math.max(y0 + 1, Math.floor((r + 1) * h / LIGNES));
    for (let c = 0; c < COLONNES; c++) {
      const x0 = Math.floor(c * w / COLONNES);
      const x1 = Math.max(x0 + 1, Math.floor((c + 1) * w / COLONNES));

      let somme = 0;
      let n = 0;
      for (let y = y0; y < y1 && y < h; y++) {
        for (let x = x0; x < x1 && x < w; x++) { somme += gray[y * w + x]; n++; }
      }
      out[r * COLONNES + c] = n === 0 ? 0 : somme / n;
    }
  }
  return out;
}

export function empreinte(gray, w, h) {
  const bits = new Uint8Array(8);
  if (w < 1 || h < 1) return bits;

  const m = moyennesDeBlocs(gray, w, h);
  let i = 0;
  for (let r = 0; r < LIGNES; r++) {
    for (let c = 0; c < COLONNES - 1; c++) {
      if (m[r * COLONNES + c] < m[r * COLONNES + c + 1]) {
        bits[i >> 3] |= 1 << (i & 7);
      }
      i++;
    }
  }
  return bits;
}

export function distance(a, b) {
  let d = 0;
  for (let i = 0; i < 8; i++) {
    let x = a[i] ^ b[i];
    while (x) { d += x & 1; x >>= 1; }
  }
  return d;
}
