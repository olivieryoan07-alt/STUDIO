import { test, assert } from './harness.js';
import { drawPlan } from '../src/core/draw-plan.js';

// Mesure du 2026-11-14 sur IMG_8332.mov : l'iPhone stocke la video filmee
// verticalement en PAYSAGE 3840x2160 avec une rotation de 90 degres dans le
// conteneur. WebCodecs ne l'applique pas : c'est a nous de le faire, sinon le
// reel est cadre de travers.

const Q = Math.PI / 2;

test('sans rotation, on cadre directement en portrait', () => {
  const p = drawPlan(1080, 1920, 0, 1080, 1920);
  assert(p.radians === 0, 'aucune rotation');
  assert(p.drawW === 1080 && p.drawH === 1920, 'destination portrait');
  assert(p.crop.sw === 1080 && p.crop.sh === 1920, 'recadrage identite');
});

test('rotation 90 : le recadrage se calcule en paysage', () => {
  const p = drawPlan(3840, 2160, 90, 1080, 1920);
  assert(Math.abs(p.radians - Q) < 1e-9, 'quart de tour');
  assert(p.drawW === 1920 && p.drawH === 1080,
         'la destination est paysage AVANT rotation — obtenu ' + p.drawW + 'x' + p.drawH);
  assert(p.crop.sw === 3840 && p.crop.sh === 2160,
         'le 16:9 source tient entier dans le 16:9 destination — obtenu ' + JSON.stringify(p.crop));
});

test('rotation 270 : même cadrage, rotation opposée', () => {
  const p = drawPlan(3840, 2160, 270, 1080, 1920);
  assert(Math.abs(p.radians - 3 * Q) < 1e-9, 'trois quarts de tour');
  assert(p.drawW === 1920 && p.drawH === 1080, 'destination paysage');
});

test('rotation 180 : portrait, demi-tour', () => {
  const p = drawPlan(1080, 1920, 180, 1080, 1920);
  assert(Math.abs(p.radians - Math.PI) < 1e-9, 'demi-tour');
  assert(p.drawW === 1080 && p.drawH === 1920, 'destination portrait');
});

test('une source paysage sans rotation est recadrée, pas déformée', () => {
  const p = drawPlan(1920, 1080, 0, 1080, 1920);
  assert(p.crop.sw === 608 && p.crop.sh === 1080,
         'bande 9:16 prise au centre — obtenu ' + JSON.stringify(p.crop));
  assert(p.drawW === 1080 && p.drawH === 1920, 'destination portrait');
});

test('le plan dit s’il y a réduction de définition', () => {
  assert(drawPlan(3840, 2160, 90, 1080, 1920).downscale === true,
         '4K vers 1080 est une reduction');
  assert(drawPlan(1080, 1920, 0, 1080, 1920).downscale === false,
         '1080 vers 1080 ne reduit rien');
});
