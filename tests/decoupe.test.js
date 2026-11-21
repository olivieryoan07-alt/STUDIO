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

// RELECTURE FINALE, constat Critical 1 : FORME_REPLI valait [3,3,6,2,2], soit
// les longueurs des PHASES du tableau du §5.4 prises pour des longueurs de
// PLANS. Le tableau a deux colonnes : le corps fait 6 temps A UNE COUPE TOUS
// LES DEUX TEMPS, donc trois plans de 2. La spec conclut « 8 plans sur 16
// temps » ; le repli en rendait 5, dont un de 6 temps — hors de la borne
// invariante « aucun plan ne dure plus de quatre ».
test('le repli est fait de PLANS, pas de phases', () => {
  assert(FORME_REPLI.length === 8, 'plans ' + FORME_REPLI.length);
  assert(FORME_REPLI.reduce((a, b) => a + b, 0) === 16, 'temps ' + FORME_REPLI.reduce((a, b) => a + b, 0));
  assert(FORME_REPLI.every((x) => x >= 1 && x <= 4), JSON.stringify(FORME_REPLI));
});

test('le repli respecte somme et bornes a tout tempo', () => {
  for (let beatCount = 1; beatCount <= 32; beatCount++) {
    const L = longueursDePlans(plate(300), 50, 0.4286, beatCount);
    const somme = L.reduce((a, b) => a + b, 0);
    assert(somme === beatCount, beatCount + ' -> somme ' + somme + ' ' + JSON.stringify(L));
    assert(L.every((x) => x >= 1 && x <= 4), beatCount + ' -> ' + JSON.stringify(L));
  }
});

test('le repli garde l ouverture tant qu il peut', () => {
  for (const beatCount of [9, 14, 16, 20]) {
    const L = longueursDePlans(plate(300), 50, 0.4286, beatCount);
    assert(L[0] === FORME_REPLI[0], beatCount + ' -> ouverture ' + L[0]);
  }
});

// RELECTURE FINALE, constat Critical 2 : le test de platitude ne regardait
// que deux echantillons — le minimum et le maximum. Un seul coup de cymbale
// sur un mur d'energie le franchissait, et comme la normalisation se calait
// sur ces memes extremes, tout le reste tombait a zero : QUATRE PLANS DE
// QUATRE TEMPS, c'est-a-dire l'anti-objectif 2 que le repli existe pour
// eviter.
const murAvecAccent = (n, accentSec, rate) => Float32Array.from({ length: n }, (_, i) =>
  (i / rate >= 3 && i / rate < 3 + accentSec) ? 1.0 : 0.5);
const murAvecCreux = (n, creuxSec, rate) => Float32Array.from({ length: n }, (_, i) =>
  (i / rate >= 3 && i / rate < 3 + creuxSec) ? 0.1 : 0.5);

test('un accent isole sur un mur ne fait pas suivre la courbe', () => {
  for (const accent of [0.3, 0.6]) {
    const L = longueursDePlans(murAvecAccent(350, accent, 50), 50, 0.4286, 16);
    assert(JSON.stringify(L) === JSON.stringify(FORME_REPLI),
           'accent de ' + accent + ' s -> ' + JSON.stringify(L));
  }
});

test('un creux isole sur un mur ne fait pas suivre la courbe non plus', () => {
  const L = longueursDePlans(murAvecCreux(350, 0.4, 50), 50, 0.4286, 16);
  assert(JSON.stringify(L) === JSON.stringify(FORME_REPLI), JSON.stringify(L));
});
