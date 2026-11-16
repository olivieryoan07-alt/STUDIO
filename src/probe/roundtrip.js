// Aller-retour complet : demux -> decode -> recadrage 9:16 -> encode -> mux.
// Repond aux questions 2 et 5 du §9 de la conception (risque 6).
//
// MESURE DU 2026-11-14, iPhone 12 mini / iOS 27.2 :
//   - l'encodeur seul encode 180 images sur 180 ;
//   - la meme configuration, avec un decodeur ouvert en parallele, rend ZERO
//     paquet (file videe, etat `configured`, aucune erreur).
// iOS limite les sessions materielles : le decodeur prend la seule disponible
// et l'encodeur se tait en silence. D'ou l'essai successif des combinaisons
// materiel/logiciel ci-dessous, au lieu d'une configuration unique supposee.

import { drawPlan } from '../core/draw-plan.js';
import { withResources } from '../core/with-resources.js';
import { rotationFromMatrix } from './inspect.js';
import { Muxer, ArrayBufferTarget } from '../../vendor/mp4-muxer.js';

export const OUT_W = 1080;
export const OUT_H = 1920;
export const OUT_FPS = 60; // repli seulement : la vraie cadence vient de la source

const CHUNK = 1 << 20;
const CODEC_CANDIDATES = ['avc1.640034', 'avc1.64002a', 'avc1.640028', 'avc1.42001f'];

// Le logiciel est lent mais ne se dispute pas la session materielle.
const STRATEGIES = [
  { decoder: 'no-preference', encoder: 'no-preference', label: 'matériel des deux côtés' },
  { decoder: 'prefer-software', encoder: 'no-preference', label: 'décodeur logiciel' },
  { decoder: 'no-preference', encoder: 'prefer-software', label: 'encodeur logiciel' },
  { decoder: 'prefer-software', encoder: 'prefer-software', label: 'tout en logiciel' }
];

async function pickVideoCodec(fps) {
  for (const codec of CODEC_CANDIDATES) {
    try {
      const r = await VideoEncoder.isConfigSupported({
        codec, width: OUT_W, height: OUT_H, framerate: fps, bitrate: 12_000_000
      });
      if (r && r.supported) return codec;
    } catch (_) { /* refus = mesure, pas erreur */ }
  }
  throw new Error('aucun codec H.264 accepté en ' + OUT_W + '×' + OUT_H + ' à ' + fps + ' img/s');
}

// mp4box.all.min.js n'expose que MP4Box.createFile ; DataStream est un global
// distinct. Chercher MP4Box.DataStream plantait toute la chaine.
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
  throw new Error(
    'configuration du décodeur introuvable (pas de boîte avcC/hvcC) : ' +
    'sans elle le décodeur lit du vide sans jamais le signaler'
  );
}

function demuxVideo(file, maxSeconds) {
  return new Promise((resolve, reject) => {
    const MP4Box = globalThis.MP4Box;
    if (!MP4Box) { reject(new Error('mp4box.js n’est pas chargé')); return; }

    const mp4 = MP4Box.createFile();
    const samples = [];
    let track = null;
    let description;
    let enough = false;

    mp4.onError = (e) => reject(new Error(file.name + ' : ' + e));

    mp4.onReady = (info) => {
      track = (info.videoTracks || [])[0];
      if (!track) { reject(new Error(file.name + ' : aucune piste vidéo')); return; }
      description = descriptionFor(mp4, track.id);
      mp4.setExtractionOptions(track.id, null, { nbSamples: 100 });
      mp4.start();
    };

    mp4.onSamples = (_id, _user, list) => {
      for (const s of list) {
        if (s.cts / s.timescale > maxSeconds) { enough = true; return; }
        // on garde les donnees brutes : un EncodedVideoChunk ne sert qu'une
        // fois, or on peut avoir a rejouer la passe avec une autre strategie
        samples.push({
          type: s.is_sync ? 'key' : 'delta',
          timestamp: (s.cts / s.timescale) * 1e6,
          duration: (s.duration / s.timescale) * 1e6,
          data: s.data.slice(0)
        });
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
      // on garde nos propres copies : mp4box peut liberer les siennes
      try { if (track) mp4.releaseUsedSamples(track.id, track.nb_samples); } catch (_) {}
      if (!track) { reject(new Error(file.name + ' : conteneur illisible')); return; }
      if (!samples.length) { reject(new Error(file.name + ' : aucune image extraite')); return; }
      resolve({ samples, description, track });
    })().catch(reject);
  });
}

function peakMemory() {
  const m = performance.memory;
  return m ? m.usedJSHeapSize : null;
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
  const bmp = canvas.transferToImageBitmap();
  try {
    return new VideoFrame(bmp, { timestamp });
  } finally {
    bmp.close();
  }
}

// Une passe complete avec une strategie d'acceleration donnee.
async function runPass(ctx) {
  const { samples, track, plan, fps, codec, strategy, onProgress, srcW, srcH } = ctx;
  const frameUs = 1e6 / fps;
  const rect = plan.crop;

  const canvas = new OffscreenCanvas(OUT_W, OUT_H);
  const c2d = canvas.getContext('2d', { alpha: false });

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: 'avc', width: OUT_W, height: OUT_H, frameRate: fps },
    ...(ctx.audio ? {
      audio: {
        codec: 'aac',
        sampleRate: ctx.audio.sampleRate,
        numberOfChannels: ctx.audio.channels
      }
    } : {}),
    fastStart: 'in-memory'
  });

  let encoded = 0;
  let produced = 0;
  let decoded = 0;
  let drawn = 0;
  let metaSeen = null;
  let failure = null;
  let muxFailure = null;
  let peak = peakMemory() || 0;
  let encoder = null;

  await withResources(
    [
      () => new VideoEncoder({
        output: (chunk, meta) => {
          produced++;
          if (metaSeen === null) {
            metaSeen = !!(meta && meta.decoderConfig) ? 'avec decoderConfig' : 'sans decoderConfig';
          }
          try {
            // Safari ne renseigne pas chunk.duration (Chrome si) et mp4-muxer
            // l'exige. addVideoChunk() lit `sample.duration` directement et ne
            // permet pas de la fournir : son 4e argument est
            // compositionTimeOffset, pas la duree. Il faut donc passer par
            // addVideoChunkRaw(data, type, timestamp, duration, meta).
            const ts = Number.isFinite(chunk.timestamp)
              ? chunk.timestamp
              : (produced - 1) * frameUs; // produced a deja ete incremente
            const dur = Number.isFinite(chunk.duration) && chunk.duration >= 0
              ? chunk.duration
              : frameUs;
            const data = new Uint8Array(chunk.byteLength);
            chunk.copyTo(data);
            muxer.addVideoChunkRaw(data, chunk.type, Math.round(ts), Math.round(dur), meta);
            encoded++;
          } catch (e) {
            // meme piege que cote decodeur : sans ce filet, un refus du muxeur
            // passe pour un encodeur muet.
            muxFailure = muxFailure || e;
          }
        },
        error: (e) => { failure = failure || e; }
      }),
      () => new VideoDecoder({
        output: (frame) => {
          try {
            try {
              c2d.save();
              c2d.translate(OUT_W / 2, OUT_H / 2);
              if (plan.radians) c2d.rotate(plan.radians);
              c2d.drawImage(
                frame,
                rect.sx, rect.sy, rect.sw, rect.sh,
                -plan.drawW / 2, -plan.drawH / 2, plan.drawW, plan.drawH
              );
              c2d.restore();
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
              onProgress({ phase: strategy.label, done: drawn, total: samples.length });
            }
          } catch (e) {
            // sans ce filet l'exception est perdue : les callbacks WebCodecs
            // tournent dans leur propre tache
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
        bitrate: 12_000_000, latencyMode: 'quality',
        hardwareAcceleration: strategy.encoder,
        // mp4-muxer exige de l'AVCC. Chrome le donne par defaut, pas Safari :
        // sans cette ligne les paquets sortent en Annex B et le muxeur les refuse.
        avc: { format: 'avc' }
      });
      decoder.configure({
        codec: track.codec,
        codedWidth: srcW,
        codedHeight: srcH,
        description: ctx.description,
        hardwareAcceleration: strategy.decoder
      });

      for (const s of samples) {
        if (failure) break;
        decoder.decode(new EncodedVideoChunk(s));
        // Deadline obligatoire : un codec qui se fige sans lever (la panne
        // meme que cette sonde traque) bloquait cette boucle pour toujours,
        // sans message et sans passer a la strategie suivante.
        const until = performance.now() + 15000;
        while (!failure && (decoder.decodeQueueSize > 8 || encoder.encodeQueueSize > 8)) {
          if (performance.now() > until) {
            failure = new Error('files bloquées 15 s sans progression ni erreur');
            break;
          }
          await new Promise((r) => setTimeout(r, 0));
        }
      }
      await decoder.flush();
      await encoder.flush();
      // Safari peut rendre la main avant d'emettre les paquets
      for (let w = 0; w < 20 && encoded === 0; w++) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
  );

  if (failure) {
    return {
      encoded, produced, decoded, drawn,
      error: (drawn < decoded ? 'dessin : ' : 'codec : ') + (failure.message || failure)
    };
  }
  if (muxFailure) {
    return {
      encoded, produced, decoded, drawn,
      error: 'muxeur refuse les paquets (' + (muxFailure.message || muxFailure) +
             ') — ' + produced + ' produits, métadonnées ' + metaSeen
    };
  }
  if (encoded === 0) {
    return {
      encoded, produced, decoded, drawn,
      error: produced > 0
        ? produced + ' paquets produits mais aucun muxé'
        : null
    };
  }

  let audioChunks = 0;
  try {
    if (ctx.audio) {
      for (const a of ctx.audio.chunks) {
        muxer.addAudioChunkRaw(a.data, a.type, Math.round(a.timestamp),
                               Math.round(a.duration), ctx.audio.meta);
        audioChunks++;
      }
    }
    muxer.finalize();
  } catch (e) {
    // Sans ce filet, un refus du muxeur audio effacait une passe video reussie
    // et relancait trois strategies pour rien, en annoncant la mauvaise cause.
    return {
      encoded, produced, decoded, drawn,
      error: 'muxage audio : ' + (e.message || e) + ' (vidéo pourtant complète)'
    };
  }
  return {
    encoded, produced, decoded, drawn, peak, audioChunks,
    blob: new Blob([target.buffer], { type: 'video/mp4' })
  };
}

export async function roundTrip(file, opts = {}) {
  const seconds = opts.seconds ?? 5;
  const onProgress = opts.onProgress || (() => {});
  const audio = opts.audio || null;

  onProgress({ phase: 'démuxage', done: 0, total: 1 });
  const tDemux = performance.now();
  const { samples, description, track } = await demuxVideo(file, seconds);
  const msDemux = performance.now() - tDemux;

  const srcW = track.video ? track.video.width : track.track_width;
  const srcH = track.video ? track.video.height : track.track_height;

  const srcDur = track.duration / track.timescale;
  const fps = Math.min(120, Math.max(1,
    Math.round(srcDur > 0 ? track.nb_samples / srcDur : OUT_FPS)));

  const rotation = rotationFromMatrix(track.matrix);
  const plan = drawPlan(srcW, srcH, rotation, OUT_W, OUT_H);
  const codec = await pickVideoCodec(fps);

  const attempts = [];

  for (const strategy of STRATEGIES) {
    // chaque passe est chronometree separement : facturer les essais rates a
    // la passe gagnante gonflait le cout par image, donc le verdict budgetaire
    const tPipeline = performance.now();
    onProgress({ phase: strategy.label, done: 0, total: samples.length });
    let pass;
    try {
      pass = await runPass({
        samples, description, track, plan, fps, codec, strategy,
        onProgress, srcW, srcH, audio
      });
    } catch (e) {
      pass = { encoded: 0, decoded: 0, drawn: 0, error: e.message || String(e) };
    }
    attempts.push({
      label: strategy.label,
      encoded: pass.encoded,
      produced: pass.produced || 0,
      error: pass.error
    });

    if (pass.blob) {
      return {
        blob: pass.blob,
        ok: true,
        codec,
        strategy: strategy.label,
        attempts,
        source: srcW + '×' + srcH + ' @ ' + fps + ' img/s, rotation ' + rotation + '°',
        fps,
        rotation,
        downscale: plan.downscale,
        crop: plan.crop,
        frames: pass.drawn,
        encodedChunks: pass.encoded,
        audioChunks: pass.audioChunks || 0,
        msDemux: Math.round(msDemux),
        msPipeline: Math.round(performance.now() - tPipeline),
        peakBytes: pass.peak || null
      };
    }
  }

  const detail = attempts
    .map((a) => a.label + ' : produits ' + a.produced + ', muxés ' + a.encoded +
                (a.error ? ' — ' + a.error : ''))
    .join(' — ');
  throw new Error(
    'aucune combinaison matériel/logiciel ne produit de paquet. ' + detail +
    ' [images ' + samples.length + ', codec ' + codec + ']'
  );
}
