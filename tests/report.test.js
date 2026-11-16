import { test, assert } from './harness.js';
import { msPerReel, buildReport } from '../src/core/report.js';

// Le temps mesure porte sur la DUREE DU CLIP D'ESSAI, pas sur un reel.
// Mesure du 2026-11-14 : 7340 ms pour 178 images. Multiplier ce chiffre par 3
// donnait "22 s pour trois montages" — faux : un reel de 20 s a 30 img/s fait
// 600 images, pas 178.

test('le coût d’un reel se ramène au nombre d’images, pas à la durée du clip', () => {
  // 7340 ms / 178 images = 41,2 ms par image ; 20 s a 30 img/s = 600 images
  const ms = msPerReel(7340, 178, 30, 20);
  assert(Math.round(ms / 1000) === 25, 'attendu ~25 s, obtenu ' + Math.round(ms / 1000) + ' s');
});

test('une cadence plus élevée coûte proportionnellement plus cher', () => {
  const a = msPerReel(7340, 178, 30, 20);
  const b = msPerReel(7340, 178, 60, 20);
  assert(Math.abs(b - 2 * a) < 1, '60 img/s doit coûter le double de 30 img/s');
});

test('tout vert donne un verdict go', () => {
  assert(buildReport({ share: true, aac: true, roundTrip: true, encodeMsPerReel: 9000 })
    .verdict === 'go');
});

test('partage refusé bloque le projet', () => {
  assert(buildReport({ share: false, aac: true, roundTrip: true, encodeMsPerReel: 9000 })
    .verdict === 'bloque');
});

test('aller-retour cassé bloque le projet', () => {
  assert(buildReport({ share: true, aac: true, roundTrip: false, encodeMsPerReel: 9000 })
    .verdict === 'bloque');
});

test('encodage trop lent déclenche le repli, pas le blocage', () => {
  assert(buildReport({ share: true, aac: true, roundTrip: true, encodeMsPerReel: 180000 })
    .verdict === 'repli');
});

test('le verdict porte les trois montages, pas un seul', () => {
  // 41 s par montage => 123 s a trois, juste au-dessus du budget de 120 s
  const r = buildReport({ share: true, aac: true, roundTrip: true, encodeMsPerReel: 41000 });
  assert(r.verdict === 'repli', 'obtenu ' + r.verdict);
  assert(r.totalMs === 123000, 'totalMs doit valoir 3 x encodeMsPerReel');
});

// Revue finale 2026-11-16 : une mesure absente ne doit JAMAIS produire le
// verdict optimiste. NaN est falsy, donc `(m.encodeMsPerReel || 0)` le
// transformait en 0 s => "dans le budget" => 'go'. La fonction dont le role
// est de dire "repli" repondait "go" sur une mesure manquante.

test('une mesure non finie bloque au lieu de passer', () => {
  assert(buildReport({ share: true, aac: true, roundTrip: true, encodeMsPerReel: NaN })
    .verdict === 'bloque', 'NaN doit bloquer');
  assert(buildReport({ share: true, aac: true, roundTrip: true, encodeMsPerReel: undefined })
    .verdict === 'bloque', 'undefined doit bloquer');
  assert(buildReport({ share: true, aac: true, roundTrip: true, encodeMsPerReel: 0 })
    .verdict === 'bloque', 'zero seconde d encodage n est pas une mesure');
});

test('msPerReel refuse de rendre un nombre quand l’entrée n’en est pas un', () => {
  assert(!Number.isFinite(msPerReel(7340, 0, 30, 20)), 'zero image : pas de mesure');
  assert(!Number.isFinite(msPerReel(7340, 178, undefined, 20)), 'cadence absente');
  assert(!Number.isFinite(msPerReel(NaN, 178, 30, 20)), 'temps absent');
});
