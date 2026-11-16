// Fixtures audio partagees par les tests du moteur.
// `clickTrack` prend un decalage des le depart : la tache 3 en a besoin pour
// verifier le calage de phase, et une fixture recopiee diverge toujours.

export function clickTrack(sec, sampleRate, bpm, offsetSec = 0) {
  const out = new Float32Array(Math.round(sec * sampleRate));
  const period = 60 / bpm;
  const clickLen = Math.round(0.002 * sampleRate); // 2 ms
  for (let t = offsetSec; t < sec; t += period) {
    const start = Math.round(t * sampleRate);
    for (let i = 0; i < clickLen && start + i < out.length; i++) {
      // bruit court qui decroit : une vraie attaque large bande
      out[start + i] = (Math.random() * 2 - 1) * (1 - i / clickLen);
    }
  }
  return out;
}

// Bruit sans attaque franche : l'autocorrelation y trouvera un maximum, mais
// il ne voudra rien dire. C'est le cas « nappe ambient » du Review Focus 2.
export function smoothNoise(sec, sampleRate) {
  const n = Math.round(sec * sampleRate);
  const raw = new Float32Array(n);
  for (let i = 0; i < n; i++) raw[i] = Math.random() * 2 - 1;
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
