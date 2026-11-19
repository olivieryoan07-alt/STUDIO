import { test, assert } from './harness.js';
import { usableRanges } from '../src/core/ranges.js';

// fabrique : n mesures a 20 Hz, toutes bonnes sauf les index listes
function mesures(n, mauvaises = [], nettete = () => 100) {
  return Array.from({ length: n }, (_, i) => ({
    timeSec: i / 20, nettete: nettete(i), empreinte: new Uint8Array(8),
    ok: !mauvaises.includes(i), motif: mauvaises.includes(i) ? 'nettete' : null
  }));
}

test('la premiere et la derniere seconde sont toujours jetees', () => {
  const r = usableRanges(mesures(100), 5);           // 5 s, tout bon
  assert(r.plages.length === 1, 'plages ' + r.plages.length);
  assert(r.plages[0].startSec >= 1 && r.plages[0].endSec <= 4, JSON.stringify(r.plages[0]));
  assert(r.rejets.bord === 40, 'bord ' + r.rejets.bord);
});

test('une image rejetee coupe la plage en deux', () => {
  const r = usableRanges(mesures(100, [50]), 5);
  assert(r.plages.length === 2, 'plages ' + r.plages.length);
});

test('une plage trop courte disparait', () => {
  // on ne laisse que 6 mesures bonnes d'affilee, soit 0,30 s : sous PLAGE_MIN_SEC
  const mauvaises = Array.from({ length: 100 }, (_, i) => i).filter((i) => i < 40 || i > 45);
  assert(usableRanges(mesures(100, mauvaises), 5).plages.length === 0);
});

test('un clip de moins de deux secondes ne donne aucune plage', () => {
  const r = usableRanges(mesures(30), 1.5);
  assert(r.plages.length === 0);
  assert(r.secondesUtiles === 0);
});

test('un clip entierement rejete rend une liste vide, pas une exception', () => {
  const tout = Array.from({ length: 100 }, (_, i) => i);
  const r = usableRanges(mesures(100, tout), 5);
  assert(r.plages.length === 0 && r.rejets.nettete > 0);
});

test('une nettete nulle partout ne divise pas par zero', () => {
  const r = usableRanges(mesures(100, [], () => 0), 5);
  assert(r.plages.length === 1 && r.plages[0].note === 0);
});

test('les plages sortent triees par note decroissante', () => {
  // deux plages separees par un rejet, la seconde plus nette
  const r = usableRanges(mesures(100, [50], (i) => (i > 50 ? 200 : 50)), 5);
  assert(r.plages[0].note > r.plages[1].note);
});
