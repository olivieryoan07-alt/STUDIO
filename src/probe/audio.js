// Piste sonore : lecture du mp3, extrait, encodage AAC.
// Repond a la question 4 du §9 de la conception (risque 2, bloquant).
//
// §5.4 bis, tranche par l'utilisateur : entree franche, sortie en fondu court.

export async function loadAudio(file, ctx) {
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) throw new Error('Web Audio indisponible');

  const own = !ctx;
  const context = ctx || new AC();
  try {
    const bytes = await file.arrayBuffer();
    return await context.decodeAudioData(bytes);
  } catch (e) {
    // Un titre achete (DRM) ou un fichier tronque atterrit ici. Le message
    // doit nommer le fichier : sinon l'utilisateur ne sait pas lequel retirer.
    throw new Error(file.name + ' : fichier audio illisible (protégé ou abîmé ?)');
  } finally {
    if (own) { try { await context.close(); } catch (_) { /* deja ferme */ } }
  }
}

export function audioExcerpt(buffer, startSec, durSec, fadeOutSec) {
  const sr = buffer.sampleRate;
  const start = Math.round(startSec * sr);
  const length = Math.round(durSec * sr);

  if (start < 0 || start + length > buffer.length) {
    throw new Error(
      'extrait hors du morceau : ' + durSec + ' s demandées à partir de ' +
      startSec + ' s, le morceau dure ' + (buffer.length / sr).toFixed(1) + ' s'
    );
  }

  const out = new AudioBuffer({
    length,
    numberOfChannels: buffer.numberOfChannels,
    sampleRate: sr
  });

  const fade = Math.min(length, Math.round(fadeOutSec * sr));
  const fadeStart = length - fade;

  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const src = buffer.getChannelData(c);
    const dst = out.getChannelData(c);
    for (let i = 0; i < length; i++) {
      const v = src[start + i];
      // entree franche : aucun traitement avant fadeStart
      dst[i] = i < fadeStart ? v : v * (1 - (i - fadeStart) / fade);
    }
  }
  return out;
}

// Encode l'extrait en AAC. Rend les paquets et la configuration que le muxeur
// attend. Un refus doit remonter explicitement : c'est le risque 2.
export async function encodeAac(buffer, onProgress = () => {}) {
  if (typeof AudioEncoder !== 'function') {
    throw new Error('AudioEncoder absent : pas d’encodage AAC sur ce navigateur');
  }

  const sr = buffer.sampleRate;
  const channels = buffer.numberOfChannels;
  const config = { codec: 'mp4a.40.2', sampleRate: sr, numberOfChannels: channels, bitrate: 128_000 };

  const support = await AudioEncoder.isConfigSupported(config);
  if (!support || !support.supported) {
    throw new Error('AAC refusé en ' + (sr / 1000) + ' kHz / ' + channels + ' canaux');
  }

  const chunks = [];
  let failure = null;
  let meta = null;

  const enc = new AudioEncoder({
    output: (chunk, m) => {
      if (!meta && m && m.decoderConfig) meta = m;
      const data = new Uint8Array(chunk.byteLength);
      chunk.copyTo(data);
      chunks.push({
        data,
        type: chunk.type,
        timestamp: chunk.timestamp,
        // meme piege que la video : Safari ne renseigne pas toujours duration
        duration: Number.isFinite(chunk.duration) && chunk.duration >= 0
          ? chunk.duration
          : Math.round(1024 / sr * 1e6)
      });
    },
    error: (e) => { failure = failure || e; }
  });

  try {
    enc.configure(config);

    // entrelacement : AudioData attend les canaux a la suite en 'f32-planar'
    const total = buffer.length;
    const planar = new Float32Array(total * channels);
    for (let c = 0; c < channels; c++) planar.set(buffer.getChannelData(c), c * total);

    const FRAME = 1024;
    for (let off = 0; off < total; off += FRAME) {
      const n = Math.min(FRAME, total - off);
      const slice = new Float32Array(n * channels);
      for (let c = 0; c < channels; c++) {
        slice.set(planar.subarray(c * total + off, c * total + off + n), c * n);
      }
      const ad = new AudioData({
        format: 'f32-planar',
        sampleRate: sr,
        numberOfFrames: n,
        numberOfChannels: channels,
        timestamp: Math.round(off / sr * 1e6),
        data: slice
      });
      try {
        enc.encode(ad);
      } finally {
        ad.close();
      }
      while (enc.encodeQueueSize > 16) await new Promise((r) => setTimeout(r, 0));
      if ((off / FRAME) % 50 === 0) onProgress({ phase: 'audio', done: off, total });
    }

    await enc.flush();
    for (let w = 0; w < 20 && chunks.length === 0; w++) {
      await new Promise((r) => setTimeout(r, 100));
    }
  } finally {
    try { enc.close(); } catch (_) { /* deja ferme */ }
  }

  if (failure) throw new Error('encodage AAC : ' + (failure.message || failure));
  if (!chunks.length) throw new Error('encodage AAC : aucun paquet produit');

  return { chunks, meta, sampleRate: sr, channels };
}
