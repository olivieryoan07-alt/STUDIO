// Logique pure : FFT radix-2 en place et fenetre de Hann.
//
// Ecrites ici plutot qu'importees : le projet n'a aucune etape de compilation
// et ces deux fonctions tiennent en quarante lignes.

export function hann(n) {
  const w = new Float32Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
  return w;
}

// Transforme `re`/`im` sur place. Longueur imposee : une puissance de 2.
export function fft(re, im) {
  const n = re.length;
  if (n < 2 || (n & (n - 1)) !== 0) {
    throw new Error('la longueur doit être une puissance de 2, reçu ' + n);
  }

  // inversion de bits
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    const half = len >> 1;
    for (let start = 0; start < n; start += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < half; k++) {
        const i = start + k;
        const j = i + half;
        const vr = re[j] * cr - im[j] * ci;
        const vi = re[j] * ci + im[j] * cr;
        re[j] = re[i] - vr;
        im[j] = im[i] - vi;
        re[i] += vr;
        im[i] += vi;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}
