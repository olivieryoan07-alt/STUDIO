// Fixtures partagees par les tests du moteur de montage.
// n clips, chacun avec `p` plages de 3 s bien notees.
export const clipsDe = (n, p = 3) => Array.from({ length: n }, (_, c) => ({
  nom: 'clip' + c,
  plages: Array.from({ length: p }, (_, j) => ({
    startSec: j * 4, endSec: j * 4 + 3, note: 0.9 - 0.1 * j,
    empreinte: (() => { const a = new Uint8Array(8); a[0] = c * 40 + j; return a; })()
  }))
}));
