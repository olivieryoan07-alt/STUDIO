// Fixtures audio partagees par les tests du moteur.
// `clickTrack` prend un decalage des le depart : la tache 3 en a besoin pour
// verifier le calage de phase, et une fixture recopiee diverge toujours.
//
// DETERMINISTE, et ce n'est pas un detail : avec Math.random() l'amplitude
// des clics variait a chaque execution et le test « chaque clic produit un
// pic » echouait environ une fois sur trois. Un test instable ne prouve rien
// et use la confiance qu'on accorde a la suite. Graine fixe, donc.

function prng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function clickTrack(sec, sampleRate, bpm, offsetSec = 0) {
  const out = new Float32Array(Math.round(sec * sampleRate));
  const period = 60 / bpm;
  const clickLen = Math.round(0.002 * sampleRate); // 2 ms
  const rnd = prng(12345);
  for (let t = offsetSec; t < sec; t += period) {
    const start = Math.round(t * sampleRate);
    for (let i = 0; i < clickLen && start + i < out.length; i++) {
      // bruit court qui decroit : une vraie attaque large bande
      out[start + i] = (rnd() * 2 - 1) * (1 - i / clickLen);
    }
  }
  return out;
}

// Bruit sans attaque franche : l'autocorrelation y trouvera un maximum, mais
// il ne voudra rien dire. C'est le cas « nappe ambient » du Review Focus 2.
export function smoothNoise(sec, sampleRate) {
  const n = Math.round(sec * sampleRate);
  const raw = new Float32Array(n);
  const rnd = prng(999);
  for (let i = 0; i < n; i++) raw[i] = rnd() * 2 - 1;
  const out = new Float32Array(n);
  const w = 2000;
  let run = 0;
  for (let i = 0; i < n; i++) {
    run += raw[i];
    if (i >= w) run -= raw[i - w];
    out[i] = run / Math.min(i + 1, w);
  }
  return out;
}
