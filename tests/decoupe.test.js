import { test, assert } from './harness.js';
import { longueursDePlans, FORME_REPLI } from '../src/core/decoupe.js';

// une enveloppe qui monte franchement : creux au debut, sommet a la fin
const rampe = (n) => Float32Array.from({ length: n }, (_, i) => 0.05 + 0.95 * i / (n - 1));
const plate = (n) => Float32Array.from({ length: n }, () => 0.8);

test('les longueurs somment exactement au nombre de temps', () => {
  for (const beatCount of [9, 14, 16]) {
    const L = longueursDePlans(rampe(300), 50, 0.4286, beatCount);
    const somme = L.reduce((a, b) => a + b, 0);
    assert(somme === beatCount, beatCount + ' temps -> somme ' + somme);
  }
});

test('aucun plan hors des bornes', () => {
  const L = longueursDePlans(rampe(300), 50, 0.4286, 16);
  assert(L.every((x) => x >= 1 && x <= 4), JSON.stringify(L));
});

test('les plans raccourcissent quand l energie monte', () => {
  const L = longueursDePlans(rampe(300), 50, 0.4286, 16);
  assert(L[0] > L[L.length - 1], 'premier ' + L[0] + ', dernier ' + L[L.length - 1]);
});

// Review Focus 4
test('un extrait plat tombe sur la forme de repli, pas sur des plans egaux', () => {
  const L = longueursDePlans(plate(300), 50, 0.4286, 16);
  assert(JSON.stringify(L) === JSON.stringify(FORME_REPLI), JSON.stringify(L));
});

test('le repli s ajuste au nombre de temps sans toucher ouverture ni rafale', () => {
  const L = longueursDePlans(plate(300), 50, 0.5, 14);
  assert(L.reduce((a, b) => a + b, 0) === 14, JSON.stringify(L));
  assert(L[0] === FORME_REPLI[0] && L[1] === FORME_REPLI[1], JSON.stringify(L));
});
