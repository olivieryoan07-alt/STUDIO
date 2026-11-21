import { test, assert } from './harness.js';
import { coutCandidat, POIDS, choisirPlans } from '../src/core/selection.js';

const emp = (n) => { const a = new Uint8Array(8); a[0] = n; return a; };
const cand = (clip, note, e) => ({ clip, note, empreinte: emp(e) });

test('le premier plan ne paie que sa qualite', () => {
  assert(Math.abs(coutCandidat(cand(0, 1, 0), null)) < 1e-9);
  assert(Math.abs(coutCandidat(cand(0, 0, 0), null) - POIDS.QUALITE) < 1e-9);
});

test('une plage mieux notee coute moins cher', () => {
  assert(coutCandidat(cand(0, 0.9, 0), null) < coutCandidat(cand(0, 0.2, 0), null));
});

test('ressembler au plan precedent coute cher', () => {
  const prec = cand(1, 1, 0);
  const jumeau = cand(0, 1, 0);          // empreinte identique
  const autre = cand(0, 1, 255);         // 8 bits de difference
  assert(coutCandidat(jumeau, prec) > coutCandidat(autre, prec),
         'jumeau ' + coutCandidat(jumeau, prec) + ', autre ' + coutCandidat(autre, prec));
});

test('rester sur le meme clip coute, sans etre interdit', () => {
  const prec = cand(1, 1, 0);
  const sup = coutCandidat(cand(1, 1, 255), prec) - coutCandidat(cand(2, 1, 255), prec);
  assert(Math.abs(sup - POIDS.MEME_CLIP) < 1e-9, 'surcout ' + sup);
  assert(Number.isFinite(coutCandidat(cand(1, 1, 0), prec)), 'un cout fini, jamais l infini');
});

// Review Focus 5
test('des empreintes toutes identiques donnent un cout fini', () => {
  const prec = cand(1, 0.5, 7);
  assert(Number.isFinite(coutCandidat(cand(1, 0.5, 7), prec)));
});

// fabrique : n clips, chacun avec `p` plages de 3 s bien notees
const clipsDe = (n, p = 3) => Array.from({ length: n }, (_, c) => ({
  nom: 'clip' + c,
  plages: Array.from({ length: p }, (_, j) => ({
    startSec: j * 4, endSec: j * 4 + 3, note: 0.9 - 0.1 * j,
    empreinte: (() => { const a = new Uint8Array(8); a[0] = c * 40 + j; return a; })()
  }))
}));

test('chaque plan est rempli et tombe sur un temps', () => {
  const r = choisirPlans({ longueurs: [3, 3, 2, 2, 1, 1, 2, 2], beatSec: 0.43,
                           clips: clipsDe(5), graine: 0 });
  assert(r.plans.length === 8 && r.manque === 0, 'manque ' + r.manque);
  assert(r.plans.every((p, i) => Math.abs(p.durSec - [3,3,2,2,1,1,2,2][i] * 0.43) < 1e-9));
});

test('un meme instant source ne sert jamais deux fois', () => {
  const r = choisirPlans({ longueurs: [1, 1, 1, 1, 1, 1, 1, 1], beatSec: 0.43,
                           clips: clipsDe(1, 1), graine: 0 });
  const pris = r.plans.map((p) => [p.startSec, p.startSec + p.durSec]).sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < pris.length; i++) {
    assert(pris[i][0] >= pris[i - 1][1] - 1e-9, 'chevauchement : ' + JSON.stringify(pris));
  }
});

// Review Focus 3
test('un seul clip donne quand meme un montage', () => {
  const r = choisirPlans({ longueurs: [3, 2, 2, 1], beatSec: 0.43,
                           clips: clipsDe(1), graine: 0 });
  assert(r.manque === 0 && r.plans.length === 4, JSON.stringify(r.manque));
});

// Review Focus 2
test('dix clips pour huit plans : les inutilises sont nommes', () => {
  const r = choisirPlans({ longueurs: [2, 2, 2, 2, 2, 2, 2, 2], beatSec: 0.43,
                           clips: clipsDe(10), graine: 0 });
  const employes = new Set(r.plans.map((p) => p.nom));
  assert(r.clipsInutilises.length === 10 - employes.size,
         'employes ' + employes.size + ', inutilises ' + r.clipsInutilises.length);
  assert(r.clipsInutilises.length > 0, 'huit plans ne peuvent pas employer dix clips');
});

// Review Focus 1
test('la matiere qui manque est comptee, pas inventee', () => {
  const r = choisirPlans({ longueurs: [4, 4, 4, 4], beatSec: 1.0,
                           clips: clipsDe(1, 1), graine: 0 });
  assert(r.manque > 0, 'aucun manque signale alors que la matiere est trop courte');
  assert(r.plans.length + r.manque === 4, 'plans ' + r.plans.length + ' manque ' + r.manque);
});

// §5.4 : « avec 5 a 8 clips, tous apparaissent ».
test('quand il y a moins de clips que de plans, tous apparaissent', () => {
  for (const n of [5, 8]) {
    const r = choisirPlans({ longueurs: [2, 2, 2, 2, 2, 2, 2, 2], beatSec: 0.43,
                             clips: clipsDe(n), graine: 0 });
    assert(r.clipsInutilises.length === 0,
           n + ' clips, inutilises : ' + JSON.stringify(r.clipsInutilises));
  }
});

test('deux graines donnent deux montages differents', () => {
  const arg = { longueurs: [3, 3, 2, 2, 1, 1, 2, 2], beatSec: 0.43, clips: clipsDe(5) };
  const a = choisirPlans({ ...arg, graine: 0 });
  const b = choisirPlans({ ...arg, graine: 7 });
  assert(JSON.stringify(a.plans) !== JSON.stringify(b.plans), 'les deux montages sont identiques');
});
