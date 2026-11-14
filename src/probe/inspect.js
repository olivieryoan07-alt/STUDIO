// Demuxe le fichier remis par le selecteur Photos et dit ce qu'il contient
// reellement. Repond a la question 1 du §9 de la conception.
//
// Lecture en flux par tranches : on ne charge jamais le fichier entier en
// memoire (contrainte globale du plan).

const CHUNK = 1 << 20; // 1 Mo

// HEVC : le profil est le 2e champ du codec string. Profil 2 = Main 10.
function bitDepthFromCodec(codec) {
  const m = /^hvc1\.(\d+)|^hev1\.(\d+)/.exec(codec);
  if (m) {
    const profile = Number(m[1] || m[2]);
    return profile === 2 ? 10 : 8;
  }
  return 8;
}

// La matrice de transformation est en virgule fixe 16.16.
export function rotationFromMatrix(matrix) {
  if (!matrix || matrix.length < 5) return 0;
  const a = matrix[0] / 65536;
  const b = matrix[1] / 65536;
  const deg = Math.round(Math.atan2(b, a) * 180 / Math.PI);
  return ((deg % 360) + 360) % 360;
}

export async function inspectFile(file) {
  const MP4Box = globalThis.MP4Box;
  if (!MP4Box) throw new Error('mp4box.js n’est pas chargé');

  const mp4 = MP4Box.createFile();
  let info = null;
  let failure = null;

  mp4.onReady = (i) => { info = i; };
  mp4.onError = (e) => { failure = e; };

  let offset = 0;
  while (offset < file.size && !info && !failure) {
    const buf = await file.slice(offset, offset + CHUNK).arrayBuffer();
    buf.fileStart = offset;
    try {
      mp4.appendBuffer(buf);
    } catch (e) {
      failure = e.message;
      break;
    }
    offset += CHUNK;
  }
  try { mp4.flush(); } catch (_) { /* flush sur conteneur casse */ }

  if (failure) throw new Error(file.name + ' : ' + failure);
  if (!info) throw new Error(file.name + ' : conteneur illisible (ce n’est pas un mp4/mov ?)');

  const track = (info.videoTracks || [])[0];
  if (!track) {
    throw new Error(file.name + ' : aucune piste vidéo (photo, Live Photo ou fichier audio ?)');
  }

  const durationSec = track.duration / track.timescale;
  const fps = durationSec > 0 ? track.nb_samples / durationSec : 0;

  return {
    codec: track.codec,
    codedWidth: track.video ? track.video.width : track.track_width,
    codedHeight: track.video ? track.video.height : track.track_height,
    fps: Math.round(fps * 100) / 100,
    rotation: rotationFromMatrix(track.matrix),
    bitDepth: bitDepthFromCodec(track.codec),
    transferCharacteristics: '',
    durationSec: Math.round(durationSec * 100) / 100,
    sizeBytes: file.size,
    brands: (info.brands || []).join(' ')
  };
}
