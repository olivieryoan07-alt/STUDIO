import { test, assert } from './harness.js';
import { coutCandidat, POIDS } from '../src/core/selection.js';

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
