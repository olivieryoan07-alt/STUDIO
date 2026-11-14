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

import { cropRect } from '../core/crop.js';
import { withResources } from '../core/with-resources.js';
import { Muxer, ArrayBufferTarget } from '../../vendor/mp4-muxer.js';

export const OUT_W = 1080;
export const OUT_H = 1920;
export const OUT_FPS = 60;

const CHUNK = 1 << 20;
const FRAME_US = 1e6 / OUT_FPS;

// Du plus capable au plus modeste : il faut au moins le niveau 4.2 pour
// 1080x1920 a 60 img/s.
const CODEC_CANDIDATES = ['avc1.640034', 'avc1.64002a', 'avc1.640028'];

async function pickVideoCodec() {
  for (const codec of CODEC_CANDIDATES) {
    try {
      const r = await VideoEncoder.isConfigSupported({
        codec, width: OUT_W, height: OUT_H, framerate: OUT_FPS, bitrate: 12_000_000
      });
      if (r && r.supported) return codec;
    } catch (_) { /* refus = mesure, pas erreur */ }
  }
  throw new Error('aucun codec H.264 accepté en ' + OUT_W + 'x' + OUT_H + ' à ' + OUT_FPS + ' img/s');
}

function descriptionFor(mp4, trackId) {
  const MP4Box = globalThis.MP4Box;
  const trak = mp4.getTrackById(trackId);
  for (const entry of trak.mdia.minf.stbl.stsd.entries) {
    const box = entry.avcC || entry.hvcC || entry.vpcC || entry.av1C;
    if (box) {
      const stream = new MP4Box.DataStream(undefined, 0, MP4Box.DataStream.BIG_ENDIAN);
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
  const rect = cropRect(srcW, srcH, OUT_W, OUT_H);

  const codec = await pickVideoCodec();
  const canvas = new OffscreenCanvas(OUT_W, OUT_H);
  const ctx = canvas.getContext('2d', { alpha: false });

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: 'avc', width: OUT_W, height: OUT_H, frameRate: OUT_FPS },
    fastStart: 'in-memory'
  });

  let encoded = 0;
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
            ctx.drawImage(frame, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, OUT_W, OUT_H);
          } finally {
            frame.close();
          }
          const out = new VideoFrame(canvas, { timestamp: Math.round(drawn * FRAME_US) });
          try {
            encoder.encode(out, { keyFrame: drawn % OUT_FPS === 0 });
          } finally {
            out.close();
          }
          drawn++;
          if (drawn % 10 === 0) {
            const m = peakMemory();
            if (m && m > peak) peak = m;
            onProgress({ phase: 'décodage', done: drawn, total: chunks.length });
          }
        },
        error: (e) => { failure = failure || e; }
      })
    ],
    async (madeEncoder, decoder) => {
      encoder = madeEncoder;

      encoder.configure({
        codec, width: OUT_W, height: OUT_H, framerate: OUT_FPS,
        bitrate: 12_000_000, latencyMode: 'quality'
      });
      decoder.configure({
        codec: track.codec,
        codedWidth: srcW,
        codedHeight: srcH,
        description,
        hardwareAcceleration: 'prefer-hardware'
      });

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
      msPipeline = performance.now() - tPipeline;

      if (failure) throw new Error(file.name + ' : ' + (failure.message || failure));
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
    source: srcW + '×' + srcH,
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
