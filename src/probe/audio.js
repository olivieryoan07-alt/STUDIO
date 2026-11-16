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
  let nextTs = 0;              // repli si Safari n'horodate pas
  let tsMissing = 0;
  let adts = 0;
  let firstBytes = null;
  const FRAME_US = Math.round(1024 / sr * 1e6);

  const enc = new AudioEncoder({
    output: (chunk, m) => {
      if (!meta && m && m.decoderConfig) meta = m;
      const data = new Uint8Array(chunk.byteLength);
      chunk.copyTo(data);

      // Meme piege que la video, et il frappe DEUX champs. Sans ce repli,
      // Math.round(null) vaut 0 : les paquets s'empilent tous a l'instant 0,
      // la piste dure zero seconde et le fichier est muet (mesure 2026-11-16).
      const hasTs = Number.isFinite(chunk.timestamp);
      if (!hasTs) tsMissing++;
      const ts = hasTs ? chunk.timestamp : nextTs;
      const dur = Number.isFinite(chunk.duration) && chunk.duration > 0
        ? chunk.duration
        : FRAME_US;
      nextTs = ts + dur;

      // Un mp4 veut de l'AAC brut. Safari peut emettre des trames ADTS,
      // reconnaissables a leur syncword 0xFFF : le fichier reste valide et
      // reste muet. On mesure, on signale, et on retire l'en-tete si besoin.
      let payload = data;
      if (data.length > 7 && data[0] === 0xFF && (data[1] & 0xF6) === 0xF0) {
        adts++;
        const crcAbsent = (data[1] & 0x01) === 1;
        payload = data.subarray(crcAbsent ? 7 : 9);
      }
      if (firstBytes === null) {
        firstBytes = Array.from(data.subarray(0, 4))
          .map((b) => b.toString(16).padStart(2, '0')).join(' ');
      }

      chunks.push({ data: payload, type: chunk.type, timestamp: ts, duration: dur });
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

  // De quoi juger le resultat sans deviner : y a-t-il du signal, les paquets
  // sont-ils etales dans le temps, Safari a-t-il fourni la config decodeur ?
  let peak = 0;
  for (let c = 0; c < channels; c++) {
    const d = buffer.getChannelData(c);
    for (let i = 0; i < d.length; i += 97) {
      const v = Math.abs(d[i]);
      if (v > peak) peak = v;
    }
  }
  const last = chunks[chunks.length - 1];
  const spanSec = (last.timestamp + last.duration) / 1e6;

  return {
    chunks, meta, sampleRate: sr, channels,
    hasMeta: !!(meta && meta.decoderConfig),
    descBytes: meta && meta.decoderConfig && meta.decoderConfig.description
      ? (meta.decoderConfig.description.byteLength || meta.decoderConfig.description.length || 0)
      : 0,
    adts,
    firstBytes,
    tsMissing,
    spanSec: Math.round(spanSec * 100) / 100,
    sourceSec: Math.round(buffer.duration * 100) / 100,
    peak: Math.round(peak * 1000) / 1000
  };
}
