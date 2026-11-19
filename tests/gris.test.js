import { test, assert } from './harness.js';
import { versGris, pasAnalyse, cadreAnalyse } from '../src/core/gris.js';

test('le gris suit la luma Rec 601', () => {
  const g = versGris(new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]));
  assert(g[0] === 76 && g[1] === 150, g[0] + ' ' + g[1]);
});

test('un gris reste lui-meme', () => {
  assert(versGris(new Uint8ClampedArray([128, 128, 128, 255]))[0] === 128);
});

test('le pas d analyse donne 20 Hz depuis 60 images par seconde', () => {
  assert(pasAnalyse(60, 20) === 3);
  // RELECTURE FINALE, constat Important 7 : avec un arrondi, 30 img/s donnait
  // un pas de 2, soit 15 Hz — SOUS le plancher de 20 Hz du §5.2, et sur la
  // matiere mesuree aujourd'hui (4K 30). Les 20 Hz sont un plancher argumente
  // (la secousse de marche de 120 ms), pas une cible a approcher.
  assert(pasAnalyse(30, 20) === 1);  // 30 Hz plutot que 15
  assert(pasAnalyse(24, 20) === 1);  // jamais moins de 1
});

// Review Focus 5 : la matiere mesuree est a 90 degres, mais 0, 180 et 270
// existent et doivent sortir debout eux aussi.
test('le cadre d analyse est debout quelle que soit la rotation', () => {
  for (const rot of [0, 90, 180, 270]) {
    const c = cadreAnalyse(3840, 2160, rot, 192);
    assert(c.w === 192 && c.h === 342, rot + ' : ' + c.w + 'x' + c.h);
  }
});

test('un quart de tour fait calculer le cadrage en paysage', () => {
  assert(cadreAnalyse(3840, 2160, 90, 192).plan.drawW === 342);
  assert(cadreAnalyse(3840, 2160, 0, 192).plan.drawW === 192);
});
