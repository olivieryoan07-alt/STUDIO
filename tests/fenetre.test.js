import { test, assert } from './harness.js';
import { calerSurTemps, placer, fenetreInitiale, decalerDeTemps,
         changerOctave, redimensionner, tempsPourX, xPourTemps } from '../src/core/fenetre.js';
import { nombreDeTemps, anchorExcerpt } from '../src/core/excerpt.js';

const grille = (bpm, offset = 0) => ({ beatSec: 60 / bpm, offsetSec: offset, beats: [] });

// « sur un temps » se verifie par la DISTANCE au temps le plus proche, pas
// par un modulo : a un cheveu sous un temps, `(s - offset) % beatSec` rend
// presque `beatSec` au lieu de presque zero. Mesure du 2026-11-21 : 49,8
// calcule vaut 49,799999999999955, bien sur un temps, et le modulo rendait
// 0,4999999999. Deux des trois assertions passaient par chance de flottant.
const surUnTemps = (s, g) => {
  const k = Math.round((s - g.offsetSec) / g.beatSec);
  return Math.abs(s - (g.offsetSec + k * g.beatSec)) < 1e-9;
};

test('caler prend le temps le plus proche', () => {
  const g = grille(120, 0.1);                 // un temps toutes les 0,5 s
  assert(Math.abs(calerSurTemps(1.7, g) - 1.6) < 1e-9, '' + calerSurTemps(1.7, g));
  assert(Math.abs(calerSurTemps(1.9, g) - 2.1) < 1e-9, '' + calerSurTemps(1.9, g));
});

test('placer cale la fenetre sur un temps', () => {
  const g = grille(120, 0.1);
  const s = placer(5.3, { durationSec: 60, grid: g, durSec: 10 });
  assert(surUnTemps(s, g), 'pas sur un temps : ' + s);
});

// Review Focus 2
test('contre le debut, la fenetre reste entiere ET sur un temps', () => {
  const g = grille(120, 0.3);
  const s = placer(-5, { durationSec: 60, grid: g, durSec: 10 });
  assert(s >= 0, 'sort par le debut : ' + s);
  assert(surUnTemps(s, g), 'pas sur un temps : ' + s);
  assert(s < g.offsetSec + g.beatSec, 'pas le premier temps utile : ' + s);
});

test('contre la fin, la fenetre reste entiere ET sur un temps', () => {
  const g = grille(120, 0.3);
  const s = placer(999, { durationSec: 60, grid: g, durSec: 10 });
  assert(s + 10 <= 60 + 1e-9, 'deborde : ' + (s + 10));
  assert(surUnTemps(s, g), 'pas sur un temps : ' + s);
  assert(s + 10 > 49.5, 'trop loin du bord : ' + s);
});

// Review Focus 4
test('un tempo non detecte ne fait ni division par zero ni boucle', () => {
  for (const mauvais of [0, NaN, Infinity, -1]) {
    const s = placer(5, { durationSec: 60, grid: { beatSec: mauvais, offsetSec: 0, beats: [] }, durSec: 10 });
    assert(Number.isFinite(s) && s >= 0 && s + 10 <= 60, mauvais + ' -> ' + s);
  }
});

test('la fenetre fait 16 temps des que la fourchette le permet', () => {
  for (const bpm of [140, 150, 180, 190]) {
    assert(nombreDeTemps(grille(bpm), 300) === 16, bpm + ' BPM');
  }
  // sous 134 BPM, seize temps depasseraient 7 s : le plafond rogne, et c'est
  // la fourchette qui prime sur la forme (§5.4 bis)
  assert(nombreDeTemps(grille(120), 300) === 14, '120 BPM');
});

test('quel que soit le tempo, la fenetre tient dans 5-7 s', () => {
  for (const bpm of [80, 100, 120, 140, 160, 180, 190]) {
    const g = grille(bpm);
    const d = nombreDeTemps(g, 300) * g.beatSec;
    assert(d >= 5 - 1e-6 && d <= 7 + 1e-6, bpm + ' BPM -> ' + d.toFixed(2) + ' s');
  }
});

test('la fenetre d ouverture est celle de anchorExcerpt, sans la rafale', () => {
  const arg = { durationSec: 300, grid: grille(140), climaxSec: 150 };
  const a = anchorExcerpt(arg);
  const f = fenetreInitiale(arg);
  assert(f.startSec === a.startSec && f.durSec === a.durSec && f.beatCount === a.beatCount);
  assert(f.burstBeatIndex === undefined, 'la rafale n a rien a faire ici');
});

test('un decalage d un temps deplace d exactement un temps', () => {
  const g = grille(120, 0);
  const f = { startSec: 20, durSec: 10, beatCount: 20 };
  assert(Math.abs(decalerDeTemps(f, 1, { durationSec: 60, grid: g }).startSec - 20.5) < 1e-9);
  assert(Math.abs(decalerDeTemps(f, -1, { durationSec: 60, grid: g }).startSec - 19.5) < 1e-9);
});

// Review Focus 5
test('contre la fin, un decalage de plus ne bouge ni ne retrecit la fenetre', () => {
  const g = grille(120, 0);
  const f = { startSec: 50, durSec: 10, beatCount: 20 };
  const r = decalerDeTemps(f, 1, { durationSec: 60, grid: g });
  assert(r.startSec === 50, 'a bouge : ' + r.startSec);
  assert(r.durSec === 10, 'a retreci : ' + r.durSec);
});

test('doubler le tempo double le nombre de temps et garde la phase', () => {
  const g = changerOctave(grille(70, 0.3), 2);
  assert(Math.abs(g.beatSec - 60 / 140) < 1e-9, 'beatSec ' + g.beatSec);
  assert(g.offsetSec === 0.3, 'phase perdue');
});

// Review Focus 3
test('apres un changement d octave la fenetre reste dans 5-7 s', () => {
  for (const [bpm, facteur] of [[70, 2], [280, 0.5], [140, 2], [140, 0.5]]) {
    const g = changerOctave(grille(bpm), facteur);
    const f = redimensionner({ startSec: 30, durSec: 10, beatCount: 24 },
                             { durationSec: 300, grid: g });
    assert(f.durSec >= 5 - 1e-6 && f.durSec <= 7 + 1e-6,
           bpm + ' x' + facteur + ' -> ' + f.durSec.toFixed(2) + ' s');
  }
});

test('une octave impossible est refusee en nommant la duree', () => {
  let msg = '';
  // 15 BPM : un temps de 4 s, donc aucun nombre entier de temps entre 5 et 7
  try { redimensionner({ startSec: 0, durSec: 6, beatCount: 16 },
                       { durationSec: 300, grid: changerOctave(grille(30), 0.5) }); }
  catch (e) { msg = e.message; }
  assert(msg.includes('15') && msg.includes('5') && msg.includes('7'), 'message : ' + msg);
});

test('pixel et seconde sont reciproques', () => {
  for (const t of [0, 12.5, 143.2, 300]) {
    assert(Math.abs(tempsPourX(xPourTemps(t, 343, 300), 343, 300) - t) < 1e-6, '' + t);
  }
});

test('hors du canevas, le temps reste dans le morceau', () => {
  assert(tempsPourX(-50, 343, 300) === 0);
  assert(tempsPourX(9999, 343, 300) === 300);
});

// RELECTURE FINALE, constat Important 1 : rien ne bornait `½×`. A la
// quatrieme tape la fenetre tombait a 6,86 s, a la cinquieme a 0,00 s — sous
// le plancher dur du §5.4 bis — et « Garder ce passage » l'ecrivait sans
// broncher. Le mecanisme de refus existait pourtant : il n'etait pas declenche.
test('des demi-tempos repetes sont refuses avant de sortir de 5-7 s', () => {
  let g = grille(140);
  let f = { startSec: 30, durSec: 10, beatCount: 24 };
  let refus = 0;
  for (let i = 0; i < 6; i++) {
    const essai = changerOctave(g, 0.5);
    let nf = null;
    // le `try` n'entoure QUE l'appel : englober l'assertion la ferait compter
    // comme un refus, et le test ne pourrait plus echouer. Premiere redaction
    // faite ainsi, verte sur un code faux.
    try { nf = redimensionner(f, { durationSec: 300, grid: essai }); }
    catch (e) { refus++; continue; }
    assert(nf.durSec >= 5 - 1e-6 && nf.durSec <= 7 + 1e-6,
           'tape ' + (i + 1) + ' -> ' + nf.durSec.toFixed(2) + ' s');
    f = nf; g = essai;
  }
  assert(refus > 0, 'aucune tape refusee : la butee ne sert a rien');
});
