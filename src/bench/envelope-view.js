// Trace l'enveloppe lissee, les sections, le point culminant et la fenetre
// d'extrait. Lire le graphique ne remplace pas l'ecoute, mais il dit ou
// regarder quand l'oreille signale un probleme.

import { smoothEnvelope } from '../core/sections.js';

const FOND = '#0c0f15';
const LIGNE = '#242b38';
const COURBE = '#5b6bb5';
const CULMINANT = '#cf4b36';
const EXTRAIT = 'rgba(233,166,64,0.18)';
const BORD = '#e9a640';

export function drawEnvelope(canvas, analysis) {
  const c = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const dur = analysis.durationSec;
  const x = (t) => (t / dur) * W;

  c.fillStyle = FOND;
  c.fillRect(0, 0, W, H);

  // fenetre d'extrait, en premier pour rester sous la courbe
  if (analysis.excerpt) {
    const e = analysis.excerpt;
    c.fillStyle = EXTRAIT;
    c.fillRect(x(e.startSec), 0, x(e.durSec), H);
    c.strokeStyle = BORD;
    c.lineWidth = 1;
    c.strokeRect(x(e.startSec) + 0.5, 0.5, x(e.durSec) - 1, H - 1);
  }

  // frontieres de sections
  c.strokeStyle = LIGNE;
  c.lineWidth = 1;
  for (const s of analysis.sections) {
    const px = Math.round(x(s.startSec)) + 0.5;
    c.beginPath();
    c.moveTo(px, 0);
    c.lineTo(px, H);
    c.stroke();
  }

  // enveloppe lissee
  const s = smoothEnvelope(analysis.env, analysis.rate, 2);
  let max = 0;
  for (let i = 0; i < s.length; i++) if (s[i] > max) max = s[i];
  if (max <= 0) max = 1;

  c.beginPath();
  const step = Math.max(1, Math.floor(s.length / W));
  for (let i = 0, px = 0; i < s.length; i += step, px++) {
    let pic = 0;
    for (let k = i; k < Math.min(s.length, i + step); k++) if (s[k] > pic) pic = s[k];
    const y = H - (pic / max) * (H - 8) - 4;
    px ? c.lineTo(px, y) : c.moveTo(px, y);
  }
  c.strokeStyle = COURBE;
  c.lineWidth = 1.6;
  c.stroke();

  // point culminant
  const cx = Math.round(x(analysis.climax.timeSec)) + 0.5;
  c.strokeStyle = CULMINANT;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(cx, 0);
  c.lineTo(cx, H);
  c.stroke();
}
