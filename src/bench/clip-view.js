// Dessin du banc video : quatre courbes, leurs seuils, le bandeau de verdict
// et les plages retenues.
//
// Ce que cette vue doit permettre, et rien d'autre : REGLER LES SEUILS a
// distance. L'utilisateur lit, recopie, on change une ligne, on republie.

import { THRESHOLDS } from '../core/frame-score.js';

export const COULEUR_MOTIF = {
  bord: '#3b4458',
  nettete: '#cf4b36',
  horizon: '#c08a2e',
  crame: '#b5527f',
  bouche: '#4f6fb5'
};

// Review Focus 4 : la phase 0 a conclu « pas de HDR » depuis un champ qui ne
// pouvait structurellement rien dire d'autre. On n'affiche donc jamais une
// colorimetrie supposee : quand la boite `colr` manque, on le dit.
export function texteColorimetrie(info) {
  if (!info || !info.colourKnown) return 'colorimétrie non lue';
  return info.transferCharacteristics;
}

function courbe(ctx, mesures, champ, x0, y0, largeur, hauteur, plafond, couleur, seuil) {
  const duree = mesures.length ? mesures[mesures.length - 1].timeSec : 1;
  const px = (t) => x0 + (duree ? t / duree : 0) * largeur;
  const py = (v) => y0 + hauteur - Math.min(1, v / plafond) * hauteur;

  ctx.strokeStyle = '#242b38';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 + 0.5, y0 + 0.5, largeur - 1, hauteur - 1);

  if (seuil !== null && seuil <= plafond) {
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#8d97a8';
    ctx.beginPath();
    ctx.moveTo(x0, py(seuil));
    ctx.lineTo(x0 + largeur, py(seuil));
    ctx.stroke();
    ctx.restore();
  }

  ctx.strokeStyle = couleur;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  mesures.forEach((m, i) => {
    const x = px(m.timeSec);
    const y = py(Math.abs(m[champ]));
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

export function dessinerClip(canvas, analyse) {
  // Le canevas se dimensionne sur la largeur REELLE de l'element, a la
  // densite de l'ecran. Une largeur fixe de 1200 px ramenee a 343 px sur un
  // iPhone divisait tout par 3,5 : des bandeaux de 5 px et des etiquettes
  // illisibles. L'instrument doit etre lisible la ou on le lit.
  const dpr = window.devicePixelRatio || 1;
  const L = canvas.clientWidth || 360;
  canvas.width = Math.round(L * dpr);
  canvas.height = Math.round(HAUTEUR_DESSIN * dpr);
  canvas.style.height = HAUTEUR_DESSIN + 'px';

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const mesures = analyse.mesures;
  const duree = analyse.source.dureeSec || 1;

  ctx.clearRect(0, 0, L, HAUTEUR_DESSIN);

  const marge = 8;
  const largeur = L - 2 * marge;
  const hCourbe = 52;
  const hBandeau = 16;
  let y = marge;

  // Le plafond de chaque courbe : deux fois le seuil, OU le neuvieme decile
  // des donnees s'il est plus haut. Un plafond fixe saturait la courbe des
  // qu'un clip depassait largement le seuil — mesure sur un vrai fichier :
  // nettete de 967 a 3237 pour un seuil a 60, soit une ligne droite au
  // plafond, qui ne dit plus rien de la distribution.
  const pistes = [
    ['nettete', '#5b6bb5', THRESHOLDS.NETTETE_MIN],
    ['inclinaison', '#c08a2e', THRESHOLDS.INCLINAISON_MAX],
    ['crame', '#b5527f', THRESHOLDS.CRAME_MAX],
    ['bouche', '#4f6fb5', THRESHOLDS.BOUCHE_MAX]
  ];

  for (const [champ, couleur, seuil] of pistes) {
    const p90 = analyse.stats && analyse.stats[champ] ? analyse.stats[champ].p90 : 0;
    const plafond = Math.max(seuil * 2, p90 * 1.1) || 1;
    courbe(ctx, mesures, champ, marge, y, largeur, hCourbe, plafond, couleur, seuil);
    ctx.fillStyle = '#5f6878';
    ctx.font = '10px "SF Mono",Menlo,monospace';
    ctx.fillText(champ + '  max ' + plafond.toFixed(plafond < 10 ? 2 : 0), marge + 4, y + 12);
    y += hCourbe + 4;
  }

  // Bandeau de verdict : une colonne par mesure, couleur du motif de rejet.
  const pas = largeur / Math.max(1, mesures.length);
  mesures.forEach((m, i) => {
    ctx.fillStyle = m.ok ? '#52a06f' : (COULEUR_MOTIF[m.motif] || '#cf4b36');
    ctx.fillRect(marge + i * pas, y, pas + 1, hBandeau);
  });
  // le bord n'est pas porte par les mesures : il est deduit du temps
  ctx.fillStyle = COULEUR_MOTIF.bord;
  mesures.forEach((m, i) => {
    if (m.timeSec < THRESHOLDS.BORD_SEC || m.timeSec >= duree - THRESHOLDS.BORD_SEC) {
      ctx.fillRect(marge + i * pas, y, pas + 1, hBandeau);
    }
  });
  y += hBandeau + 4;

  // Plages retenues, en ambre, avec leur note.
  ctx.fillStyle = '#1b2029';
  ctx.fillRect(marge, y, largeur, hBandeau);
  for (const p of analyse.plages) {
    const x = marge + (p.startSec / duree) * largeur;
    const w = Math.max(2, ((p.endSec - p.startSec) / duree) * largeur);
    ctx.fillStyle = 'rgba(233,166,64,' + (0.35 + 0.65 * p.note).toFixed(2) + ')';
    ctx.fillRect(x, y, w, hBandeau);
  }
}

export const HAUTEUR_DESSIN = 8 + 4 * (52 + 4) + 2 * (16 + 4);
