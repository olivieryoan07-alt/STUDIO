// Aller-retour complet : demux -> decode -> recadrage 9:16 -> encode -> mux.
// Repond aux questions 2 et 5 du §9 de la conception (risque 6).
//
// Contraintes tenues ici :
//   - sortie 1080x1920 a 60 img/s, copie exacte de la source, aucun
//     redimensionnement ni decimation ;
//   - un seul decodeur et un seul encodeur ouverts, fermes quoi qu'il arrive
//     (via withResources) ;
//   - lecture du fichier par tranches, jamais en entier ;
//   - hors de toute horloge temps reel : chaque image est encodee quand elle
//     est prete, jamais quand la montre le dit. C'est ce qui elimine les
//     saccades constatees avec MediaRecorder.

import { drawPlan } from '../core/draw-plan.js';
import { withResources } from '../core/with-resources.js';
import { rotationFromMatrix } from './inspect.js';
import { Muxer, ArrayBufferTarget } from '../../vendor/mp4-muxer.js';

export const OUT_W = 1080;
export const OUT_H = 1920;
// Cadence de repli seulement : la vraie valeur est lue sur la source.
export const OUT_FPS = 60;

const CHUNK = 1 << 20;

// Du plus capable au plus modeste : il faut au moins le niveau 4.2 pour
// 1080x1920 a 60 img/s.
const CODEC_CANDIDATES = ['avc1.640034', 'avc1.64002a', 'avc1.640028'];

async function pickVideoCodec(fps) {
  for (const codec of CODEC_CANDIDATES) {
    try {
      const r = await VideoEncoder.isConfigSupported({
        codec, width: OUT_W, height: OUT_H, framerate: fps, bitrate: 12_000_000
      });
      if (r && r.supported) return codec;
    } catch (_) { /* refus = mesure, pas erreur */ }
  }
  throw new Error('aucun codec H.264 accepté en ' + OUT_W + 'x' + OUT_H + ' à ' + fps + ' img/s');
}

// mp4box.all.min.js n'expose que MP4Box.createFile ; DataStream est un global
// distinct. Chercher MP4Box.DataStream plantait toute la chaine (mesure du
// 2026-11-14 sur iPhone : "undefined is not an object").
function descriptionFor(mp4, trackId) {
  const DataStream = globalThis.DataStream;
  if (!DataStream) throw new Error('DataStream (mp4box) introuvable');
  const trak = mp4.getTrackById(trackId);
  for (const entry of trak.mdia.minf.stbl.stsd.entries) {
    const box = entry.avcC || entry.hvcC || entry.vpcC || entry.av1C;
    if (box) {
      const stream = new DataStream(undefined, 0, DataStream.BIG_ENDIAN);
      box.write(stream);
      return new Uint8Array(stream.buffer, 8); // on retire l'en-tete de boite
    }
  }
  return undefined;
}

// Extrait les `maxSeconds` premieres secondes en paquets encodes, sans jamais
// charger le fichier entier.
function demuxVideo(file, maxSeconds) {
  return new Promise((resolve, reject) => {
    const MP4Box = globalThis.MP4Box;
    if (!MP4Box) { reject(new Error('mp4box.js n’est pas chargé')); return; }

    const mp4 = MP4Box.createFile();
    const chunks = [];
    let track = null;
    let description;
    let enough = false;

    mp4.onError = (e) => reject(new Error(file.name + ' : ' + e));

    mp4.onReady = (info) => {
      track = (info.videoTracks || [])[0];
      if (!track) {
        reject(new Error(file.name + ' : aucune piste vidéo'));
        return;
      }
      description = descriptionFor(mp4, track.id);
      mp4.setExtractionOptions(track.id, null, { nbSamples: 100 });
      mp4.start();
    };

    mp4.onSamples = (_id, _user, samples) => {
      for (const s of samples) {
        if (s.cts / s.timescale > maxSeconds) { enough = true; return; }
        chunks.push(new EncodedVideoChunk({
          type: s.is_sync ? 'key' : 'delta',
          timestamp: (s.cts / s.timescale) * 1e6,
          duration: (s.duration / s.timescale) * 1e6,
          data: s.data
        }));
      }
    };

    (async () => {
      let offset = 0;
      while (offset < file.size && !enough) {
        const buf = await file.slice(offset, offset + CHUNK).arrayBuffer();
        buf.fileStart = offset;
        mp4.appendBuffer(buf);
        offset += CHUNK;
      }
      try { mp4.flush(); } catch (_) { /* conteneur tronque */ }
      if (!track) { reject(new Error(file.name + ' : conteneur illisible')); return; }
      if (!chunks.length) { reject(new Error(file.name + ' : aucune image extraite')); return; }
      resolve({ chunks, description, track });
    })().catch(reject);
  });
}

let frameFromCanvasWorks = null;

function makeFrame(canvas, timestamp) {
  if (frameFromCanvasWorks !== false) {
    try {
      const f = new VideoFrame(canvas, { timestamp });
      frameFromCanvasWorks = true;
      return f;
    } catch (e) {
      if (frameFromCanvasWorks === true) throw e;
      frameFromCanvasWorks = false;
    }
  }
  // repli : passer par un ImageBitmap
  const bmp = canvas.transferToImageBitmap();
  try {
    return new VideoFrame(bmp, { timestamp });
  } finally {
    bmp.close();
  }
}

function peakMemory() {
  const m = performance.memory;
  return m ? m.usedJSHeapSize : null;
}

export async function roundTrip(file, opts = {}) {
  const seconds = opts.seconds ?? 5;
  const onProgress = opts.onProgress || (() => {});

  onProgress({ phase: 'démuxage', done: 0, total: 1 });
  const tDemux = performance.now();
  const { chunks, description, track } = await demuxVideo(file, seconds);
  const msDemux = performance.now() - tDemux;

  const srcW = track.video ? track.video.width : track.track_width;
  const srcH = track.video ? track.video.height : track.track_height;

  // La cadence de sortie suit la source : la conception exige une copie, pas
  // une conversion. Mesure du 2026-11-14 : la source reelle est a 30 img/s,
  // pas 60 — forcer 60 aurait duplique une image sur deux.
  const srcDur = track.duration / track.timescale;
  const fps = Math.min(120, Math.max(1, Math.round(srcDur > 0 ? track.nb_samples / srcDur : OUT_FPS)));
  const frameUs = 1e6 / fps;

  const rotation = rotationFromMatrix(track.matrix);
  const plan = drawPlan(srcW, srcH, rotation, OUT_W, OUT_H);
  const rect = plan.crop;

  const codec = await pickVideoCodec(fps);
  const canvas = new OffscreenCanvas(OUT_W, OUT_H);
  const ctx = canvas.getContext('2d', { alpha: false });

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: 'avc', width: OUT_W, height: OUT_H, frameRate: fps },
    fastStart: 'in-memory'
  });

  let encoded = 0;
  let decoded = 0;
  let drawn = 0;
  let failure = null;
  let msMux = 0;
  let msPipeline = 0;
  let peak = peakMemory() || 0;
  // liee ici, assignee dans le corps : la sortie du decodeur en a besoin,
  // et elle est definie avant que withResources ne rende les deux objets.
  let encoder = null;

  const result = await withResources(
    [
      () => new VideoEncoder({
        output: (chunk, meta) => {
          const t0 = performance.now();
          muxer.addVideoChunk(chunk, meta);
          msMux += performance.now() - t0;
          encoded++;
        },
        error: (e) => { failure = failure || e; }
      }),
      () => new VideoDecoder({
        output: (frame) => {
         try {
          try {
            ctx.save();
            ctx.translate(OUT_W / 2, OUT_H / 2);
            if (plan.radians) ctx.rotate(plan.radians);
            ctx.drawImage(
              frame,
              rect.sx, rect.sy, rect.sw, rect.sh,
              -plan.drawW / 2, -plan.drawH / 2, plan.drawW, plan.drawH
            );
            ctx.restore();
          } finally {
            frame.close();
          }
          decoded++;
          const out = makeFrame(canvas, Math.round(drawn * frameUs));
          try {
            encoder.encode(out, { keyFrame: drawn % fps === 0 });
          } finally {
            out.close();
          }
          drawn++;
          if (drawn % 10 === 0) {
            const m = peakMemory();
            if (m && m > peak) peak = m;
            onProgress({ phase: 'décodage', done: drawn, total: chunks.length });
          }
         } catch (e) {
          // sans ce filet, l'exception est perdue et la chaine meurt en
          // silence : c'est exactement ce qui s'est produit le 2026-11-14.
          failure = failure || e;
         }
        },
        error: (e) => { failure = failure || e; }
      })
    ],
    async (madeEncoder, decoder) => {
      encoder = madeEncoder;

      encoder.configure({
        codec, width: OUT_W, height: OUT_H, framerate: fps,
        bitrate: 12_000_000, latencyMode: 'quality'
      });
      const decoderConfig = {
        codec: track.codec,
        codedWidth: srcW,
        codedHeight: srcH,
        description
      };
      const support = await VideoDecoder.isConfigSupported(decoderConfig);
      if (!support || !support.supported) {
        throw new Error('décodeur refusé pour ' + track.codec + ' en ' + srcW + '×' + srcH);
      }
      decoder.configure(decoderConfig);

      const tPipeline = performance.now();
      for (const chunk of chunks) {
        if (failure) break;
        decoder.decode(chunk);
        // contre-pression : on ne laisse jamais la file enfler
        while (decoder.decodeQueueSize > 8 || encoder.encodeQueueSize > 8) {
          await new Promise((r) => setTimeout(r, 0));
        }
      }
      await decoder.flush();
      onProgress({ phase: 'encodage', done: drawn, total: chunks.length });
      await encoder.flush();
      // Safari peut rendre la main sur flush() avant d'avoir emis les paquets.
      for (let w = 0; w < 20 && encoded === 0; w++) {
        await new Promise((r) => setTimeout(r, 100));
      }
      msPipeline = performance.now() - tPipeline;

      if (failure) {
        throw new Error(
          (failure.message || failure) +
          ' [paquets ' + chunks.length + ', décodées ' + decoded +
          ', dessinées ' + drawn + ', encodées ' + encoded + ']'
        );
      }
      if (encoded === 0) {
        throw new Error(
          'aucune image encodée — l’encodeur ne rend rien' +
          ' [codec ' + codec + ', état ' + encoder.state +
          ', file ' + encoder.encodeQueueSize +
          ', paquets ' + chunks.length + ', décodées ' + decoded +
          ', dessinées ' + drawn + '] — lance « Tester l’encodeur seul »'
        );
      }
      return true;
    }
  );

  muxer.finalize();
  const blob = new Blob([target.buffer], { type: 'video/mp4' });
  onProgress({ phase: 'terminé', done: drawn, total: chunks.length });

  return {
    blob,
    ok: result === true,
    codec,
    source: srcW + '×' + srcH + ' @ ' + fps + ' img/s, rotation ' + rotation + '°',
    fps,
    rotation,
    downscale: plan.downscale,
    crop: rect,
    frames: drawn,
    encodedChunks: encoded,
    msDemux: Math.round(msDemux),
    // decode + recadrage + encode, de bout en bout : c'est ce chiffre qui
    // alimente `encodeMsPerReel` du verdict (tache 6).
    msPipeline: Math.round(msPipeline),
    msMux: Math.round(msMux),
    peakBytes: peak || null
  };
}
