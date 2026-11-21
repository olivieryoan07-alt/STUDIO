import { test, assert } from './harness.js';
import { monter } from '../src/core/montage.js';
import { clipsDe } from './fixtures-montage.js';

const extraitType = { startSec: 30, durSec: 6.86, beatCount: 16, bpm: 140, offsetSec: 0.1 };
const envMorceau = Float32Array.from({ length: 3000 }, (_, i) => 0.1 + 0.9 * ((i % 300) / 300));

test('trois propositions, memes longueurs, selections differentes', () => {
  const p = monter({ extrait: extraitType, env: envMorceau, rate: 50, offsetSec: 0,
                     clips: clipsDe(5) });
  assert(p.length === 3, 'propositions ' + p.length);
  assert(JSON.stringify(p[0].longueurs) === JSON.stringify(p[1].longueurs), 'rythmes differents');
  assert(JSON.stringify(p[0].plans) !== JSON.stringify(p[1].plans), 'selections identiques');
});

test('la duree de chaque proposition est celle de l extrait', () => {
  const p = monter({ extrait: extraitType, env: envMorceau, rate: 50, offsetSec: 0,
                     clips: clipsDe(5) });
  for (const prop of p) {
    assert(Math.abs(prop.durSec - extraitType.durSec) < 0.01,
           'duree ' + prop.durSec + ' au lieu de ' + extraitType.durSec);
  }
});

test('c est l energie de l EXTRAIT qui commande, pas celle du morceau', () => {
  // Deux courbes opposees, en DENTS DE SCIE de 7 s : une rampe monotone sur
  // tout le morceau n'offre que 17 % d'amplitude dans une fenetre de 6,9 s,
  // donc sous le seuil de platitude — les deux retombaient sur la forme de
  // repli et le test ne prouvait rien (mesure du 2026-11-21).
  const dents = (montant) => Float32Array.from({ length: 3000 }, (_, i) => {
    const phase = ((i / 50) % 7) / 7;
    return 0.05 + 0.95 * (montant ? phase : 1 - phase);
  });
  const montant = dents(true);
  const descendant = dents(false);
  const a = monter({ extrait: extraitType, env: montant, rate: 50, offsetSec: 0, clips: clipsDe(3) });
  const b = monter({ extrait: extraitType, env: descendant, rate: 50, offsetSec: 0, clips: clipsDe(3) });
  assert(JSON.stringify(a[0].longueurs) !== JSON.stringify(b[0].longueurs),
         'les deux courbes donnent le meme rythme : ' + JSON.stringify(a[0].longueurs));
});

// RELECTURE FINALE, constat Important 5 : `durSec` valait la somme des
// longueurs VOULUES, sans egard pour les plans qu'on n'a pas pu remplir. La
// proposition annoncait 6,86 s pour 2,57 s de plans — et c'est `durSec` que
// la phase 1C-3 prendra pour caler le son.
test('la duree annoncee est celle des plans reellement poses', () => {
  const maigre = [{ nom: 'seul', plages: [{ startSec: 0, endSec: 1.2, note: 0.9,
                                            empreinte: new Uint8Array(8) }] }];
  const p = monter({ extrait: extraitType, env: envMorceau, rate: 50, offsetSec: 0,
                     clips: maigre });
  for (const prop of p) {
    const somme = prop.plans.reduce((a, x) => a + x.durSec, 0);
    assert(Math.abs(prop.durSec - somme) < 1e-6,
           'annonce ' + prop.durSec.toFixed(2) + ', pose ' + somme.toFixed(2) +
           ', manque ' + prop.manque);
  }
});
