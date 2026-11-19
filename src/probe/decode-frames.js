// La frontiere entre WebCodecs et le calcul : d'un fichier mp4 a une suite
// d'images grises, debout, au format du reel.
//
// Tout ce qui est en aval de `onFrame` est de la logique pure, testee dans
// Chrome sur le Mac sans le moindre fichier video. Tout ce qui est ici ne se
// verifie que sur l'appareil. C'est l'isolement demande au §8 de la
// conception.

import { demuxVideo } from './demux.js';
import { rotationFromMatrix } from './inspect.js';
import { cadreAnalyse, versGris, pasAnalyse } from '../core/gris.js';

const HZ_DEFAUT = 20;      // §5.2
const LARGEUR_DEFAUT = 192; // §5.2

export async function decodeFrames(file, options = {}) {
  const hz = options.hz || HZ_DEFAUT;
  const largeur = options.largeur || LARGEUR_DEFAUT;
  const onFrame = options.onFrame || (() => {});
  const onProgress = options.onProgress || (() => {});

  const { samples, description, track } = await demuxVideo(file, Infinity);

  const srcW = track.video ? track.video.width : track.track_width;
  const srcH = track.video ? track.video.height : track.track_height;
  const rotation = rotationFromMatrix(track.matrix);
  const dureeSec = track.duration / track.timescale;
  const fps = dureeSec > 0 ? track.nb_samples / dureeSec : samples.length;
  const pas = pasAnalyse(fps, hz);

  const cadre = cadreAnalyse(srcW, srcH, rotation, largeur);
  const plan = cadre.plan;
  const rect = plan.crop;

  const canvas = new OffscreenCanvas(cadre.w, cadre.h);
  const c2d = canvas.getContext('2d', { willReadFrequently: true });

  // UN COMPTEUR PAR ETAPE. En phase 0, un seul compteur melangeait « produit
  // par le codec » et « accepte en aval », et deux pannes sont restees
  // invisibles pendant cinq hypotheses fausses.
  const comptes = { paquets: samples.length, decodees: 0, analysees: 0, perdues: 0 };
  let erreur = null;

  const decodeur = new VideoDecoder({
    output: (frame) => {
      // SANS CE FILET, rien ne remonte : une exception levee dans un callback
      // WebCodecs disparait, et le decodeur passe pour muet.
      try {
        try {
          const index = comptes.decodees;
          comptes.decodees++;
          if (index % pas !== 0) return;

          c2d.save();
          c2d.translate(cadre.w / 2, cadre.h / 2);
          if (plan.radians) c2d.rotate(plan.radians);
          c2d.drawImage(frame, rect.sx, rect.sy, rect.sw, rect.sh,
                        -plan.drawW / 2, -plan.drawH / 2, plan.drawW, plan.drawH);
          c2d.restore();

          const rgba = c2d.getImageData(0, 0, cadre.w, cadre.h).data;
          onFrame({
            gray: versGris(rgba),
            w: cadre.w,
            h: cadre.h,
            timeSec: frame.timestamp / 1e6,
            index: comptes.analysees
          });
          comptes.analysees++;
        } finally {
          frame.close();
        }
      } catch (e) {
        comptes.perdues++;
        erreur = erreur || e;
      }
    },
    error: (e) => { erreur = erreur || e; }
  });

  try {
    decodeur.configure({
      codec: track.codec,
      codedWidth: srcW,
      codedHeight: srcH,
      description,
      hardwareAcceleration: 'no-preference'
    });

    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      decodeur.decode(new EncodedVideoChunk({
        type: s.type, timestamp: s.timestamp, duration: s.duration, data: s.data
      }));
      // la file du decodeur n'est pas infinie : on la laisse se vider
      if (decodeur.decodeQueueSize > 30) {
        await new Promise((r) => setTimeout(r, 0));
        onProgress({ fait: i + 1, total: samples.length });
      }
    }
    await decodeur.flush();
  } finally {
    try { decodeur.close(); } catch (_) { /* deja ferme */ }
  }

  if (comptes.analysees === 0) {
    throw new Error(erreur ? ('décodage impossible : ' + erreur.message)
                           : 'aucune image analysée');
  }

  return {
    comptes,
    source: { fps, rotation, srcW, srcH, w: cadre.w, h: cadre.h, dureeSec }
  };
}
