// Dessin d'une proposition de montage : la courbe d'energie de l'extrait, et
// dessous la frise des plans — une couleur par clip, la longueur en temps
// ecrite dans chaque bloc.
//
// C'est ce qui rend le rythme jugeable sans encoder une seule image : on voit
// les coupes se resserrer la ou la musique monte, ou on voit qu'elles ne le
// font pas.

export const COULEURS = [
  '#5b6bb5', '#52a06f', '#e9a640', '#cf4b36', '#b5527f',
  '#4fa0a8', '#8d7bd0', '#c08a2e', '#6f9e4a', '#b06a5a'
];

export const HAUTEUR_FRISE = 104;

const FOND = '#141821';
const COURBE = '#3f4a63';

export function couleurDeClip(nom, noms) {
  const i = noms.indexOf(nom);
  return COULEURS[(i < 0 ? 0 : i) % COULEURS.length];
}

export function dessinerFrise(canvas, { env, rate, offsetSec, extrait, proposition, noms }) {
  const dpr = window.devicePixelRatio || 1;
  const L = canvas.clientWidth || 360;
  const H = HAUTEUR_FRISE;
  canvas.width = Math.round(L * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.height = H + 'px';

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, L, H);
  ctx.fillStyle = FOND;
  ctx.fillRect(0, 0, L, H);

  const duree = proposition.durSec || extrait.durSec;
  if (!(duree > 0)) return;

  const hCourbe = 56;
  const hBloc = 40;

  // L'enveloppe, decoupee a la fenetre de l'extrait
  if (env && env.length) {
    const i0 = Math.max(0, Math.round((extrait.startSec - offsetSec) * rate));
    const i1 = Math.min(env.length, Math.round((extrait.startSec + duree - offsetSec) * rate));
    let crete = 0;
    for (let i = i0; i < i1; i++) if (env[i] > crete) crete = env[i];
    if (crete > 0) {
      ctx.fillStyle = COURBE;
      for (let x = 0; x < L; x++) {
        const a = i0 + Math.floor((x / L) * (i1 - i0));
        const b = i0 + Math.max(a + 1, Math.ceil(((x + 1) / L) * (i1 - i0)));
        let v = 0;
        for (let i = a; i < b && i < i1; i++) if (env[i] > v) v = env[i];
        const h = Math.max(1, (v / crete) * (hCourbe - 6));
        ctx.fillRect(x, hCourbe - 3 - h, 1, h);
      }
    }
  }

  // La frise : un bloc par plan, large de sa duree
  let t = 0;
  ctx.font = '11px "SF Mono",Menlo,monospace';
  ctx.textBaseline = 'middle';
  for (const plan of proposition.plans) {
    const x = (t / duree) * L;
    const w = (plan.durSec / duree) * L;
    ctx.fillStyle = couleurDeClip(plan.nom, noms);
    ctx.fillRect(x, hCourbe + 4, Math.max(1, w - 1), hBloc);
    // le nombre de temps, seulement s'il y a la place de le lire
    if (w > 16) {
      ctx.fillStyle = 'rgba(16,19,26,0.85)';
      ctx.fillText(String(plan.temps), x + w / 2 - 3, hCourbe + 4 + hBloc / 2);
    }
    t += plan.durSec;
  }

  // Les coupes, en traits francs par-dessus : c'est elles qu'on vient juger
  ctx.fillStyle = '#10131a';
  t = 0;
  for (const plan of proposition.plans) {
    t += plan.durSec;
    ctx.fillRect((t / duree) * L - 1, hCourbe + 4, 1, hBloc);
  }
}
