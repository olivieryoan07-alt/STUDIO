// Inventaire de ce que le navigateur sait faire. Lu sur l'iPhone, c'est la
// premiere ligne du releve de phase 0.

const CANDIDATES = [
  { label: 'H.264 High 1080p', codec: 'avc1.640028' },
  { label: 'H.264 Baseline', codec: 'avc1.42001f' },
  { label: 'HEVC Main', codec: 'hvc1.1.6.L93.B0' }
];

export async function capabilities() {
  const hasDecoder = typeof globalThis.VideoDecoder === 'function';
  const hasEncoder = typeof globalThis.VideoEncoder === 'function';
  const hasAudioEncoder = typeof globalThis.AudioEncoder === 'function';
  const share = typeof navigator !== 'undefined' && typeof navigator.canShare === 'function';

  const containers = [];
  if (hasEncoder) {
    for (const c of CANDIDATES) {
      try {
        const r = await globalThis.VideoEncoder.isConfigSupported({
          codec: c.codec, width: 1080, height: 1920, framerate: 60, bitrate: 12_000_000
        });
        if (r && r.supported) containers.push(c.label + ' (' + c.codec + ')');
      } catch (_) { /* un codec refuse n'est pas une erreur, c'est une mesure */ }
    }
  }

  let audioAac = false;
  if (hasAudioEncoder) {
    try {
      const r = await globalThis.AudioEncoder.isConfigSupported({
        codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 128000
      });
      audioAac = !!(r && r.supported);
    } catch (_) { audioAac = false; }
  }

  return {
    videoDecoder: hasDecoder,
    videoEncoder: hasEncoder,
    audioEncoder: hasAudioEncoder,
    audioAac,
    share,
    containers
  };
}
