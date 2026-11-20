import { test, assert } from './harness.js';
import { usableRanges } from '../src/core/ranges.js';

// fabrique : n mesures a 20 Hz, toutes bonnes sauf les index listes
function mesures(n, mauvaises = [], nettete = () => 100) {
  return Array.from({ length: n }, (_, i) => ({
    timeSec: i / 20, nettete: nettete(i), empreinte: new Uint8Array(8),
    ok: !mauvaises.includes(i), motif: mauvaises.includes(i) ? 'nettete' : null
  }));
}

test('sur un clip long, la premiere et la derniere seconde sont jetees', () => {
  const r = usableRanges(mesures(200), 10);          // 10 s, tout bon
  assert(r.plages.length === 1, 'plages ' + r.plages.length);
  assert(r.plages[0].startSec >= 1 && r.plages[0].endSec <= 9, JSON.stringify(r.plages[0]));
  assert(r.rejets.bord === 40, 'bord ' + r.rejets.bord);
});

// MESURE DU 2026-11-20 : l'utilisateur filme en randonnee des clips de 3 a
// 5 secondes, pas de 20 a 30 comme la conception le supposait. Jeter une
// seconde a chaque bout d'un clip de 3 secondes en retire les deux tiers —
// et c'est bien ce qui s'est passe : sur quatre clips courts, le bord etait
// le premier motif de rejet et deux d'entre eux ne rendaient aucune plage
// alors que rien n'y avait ete juge mauvais.
test('sur un clip court, le bord n en mange pas les deux tiers', () => {
  const r = usableRanges(mesures(60), 3);            // 3 s, tout bon
  assert(r.plages.length === 1, 'plages ' + r.plages.length);
  assert(r.secondesUtiles > 1.9, 'secondes utiles ' + r.secondesUtiles);
  assert(r.rejets.bord < 24, 'bord ' + r.rejets.bord);
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

// Review Focus 1, REVISE le 2026-11-20. L'attente d'origine — « un clip de
// moins de deux secondes ne donne aucune plage » — decoulait du bord d'une
// seconde pleine. Avec le bord plafonne a 15 %, un clip de 1,5 s garde une
// seconde du milieu, et c'est de la vraie matiere : la rendre est juste. Ce
// qui reste a garantir, c'est qu'un clip trop court pour porter le moindre
// plan n'invente rien et ne leve rien.
test('un clip trop court pour porter un plan ne rend aucune plage', () => {
  const r = usableRanges(mesures(12), 0.6);   // 0,6 s : il reste 0,45 s
  assert(r.plages.length === 0, 'plages ' + r.plages.length);
  assert(r.secondesUtiles === 0);
});

test('un clip d une seconde et demie garde sa seconde du milieu', () => {
  const r = usableRanges(mesures(30), 1.5);
  assert(r.plages.length === 1, 'plages ' + r.plages.length);
  assert(r.secondesUtiles > 0.9, 'secondes utiles ' + r.secondesUtiles);
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

// RELECTURE FINALE, constat Critical 1 : le groupement se faisait par INDICE,
// jamais par temps. Un trou dans la mesure — images perdues dans le callback,
// ou cadence variable — etait traverse sans etre vu, et l'intervalle jamais
// mesure ressortait en plage, parfois la mieux notee du clip.
test('un trou dans la mesure coupe la plage, il ne la traverse pas', () => {
  const bon = (t) => ({ timeSec: t, nettete: 100, empreinte: new Uint8Array(8),
                        ok: true, motif: null });
  const m = [];
  for (let i = 0; i < 40; i++) m.push(bon(1 + i * 0.05));   // 1,00 -> 2,95 s
  for (let i = 0; i < 40; i++) m.push(bon(8 + i * 0.05));   // 8,00 -> 9,95 s
  const r = usableRanges(m, 12);
  assert(r.plages.length === 2, 'plages ' + r.plages.length);
  assert(r.secondesUtiles < 4.2, 'secondes utiles ' + r.secondesUtiles);
});
