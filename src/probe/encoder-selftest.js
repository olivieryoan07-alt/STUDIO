// Auto-test de l'encodeur, isole du reste de la chaine.
//
// Mesure du 2026-11-14 : demuxage, decodage, recadrage et construction de
// VideoFrame fonctionnent tous (178/178), mais zero paquet encode. Il faut
// donc interroger l'encodeur seul, sans fichier, sans decodeur, sans muxeur.
//
// Trois hypotheses sont testees d'un coup :
//   1. le codec retenu est accepte en theorie mais pas en pratique ;
//   2. `latencyMode: 'quality'` ou le debit demande font echouer configure() ;
//   3. flush() rend la main avant que les paquets ne soient emis.

const CODECS = ['avc1.640034', 'avc1.64002a', 'avc1.640028', 'avc1.42001f'];
const W = 1080;
const H = 1920;

async function tryOne(codec, fps, extra) {
  const attempt = {
    codec,
    options: extra.latencyMode ? 'latencyMode=' + extra.latencyMode : 'sans latencyMode',
    supported: null,
    chunks: 0,
    afterFlush: 0,
    error: null,
    state: null
  };

  const config = { codec, width: W, height: H, framerate: fps, bitrate: 8_000_000, ...extra };

  try {
    const sup = await VideoEncoder.isConfigSupported(config);
    attempt.supported = !!(sup && sup.supported);
  } catch (e) {
    attempt.supported = false;
    attempt.error = 'isConfigSupported: ' + (e.message || e);
    return attempt;
  }
  if (!attempt.supported) return attempt;

  const canvas = new OffscreenCanvas(W, H);
  const ctx = canvas.getContext('2d', { alpha: false });

  let count = 0;
  let asyncError = null;
  const enc = new VideoEncoder({
    output: () => { count++; },
    error: (e) => { asyncError = asyncError || e; }
  });

  try {
    enc.configure(config);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i % 2 ? '#e9a640' : '#10131a';
      ctx.fillRect(0, 0, W, H);
      const frame = new VideoFrame(canvas, { timestamp: Math.round(i * 1e6 / fps) });
      try {
        enc.encode(frame, { keyFrame: i === 0 });
      } finally {
        frame.close();
      }
    }
    await enc.flush();
    attempt.afterFlush = count;

    // hypothese 3 : laisser jusqu'a 2 s aux paquets pour arriver
    for (let w = 0; w < 20 && count === 0; w++) {
      await new Promise((r) => setTimeout(r, 100));
    }
    attempt.state = enc.state;
  } catch (e) {
    attempt.error = e.message || String(e);
  } finally {
    try { enc.close(); } catch (_) { /* deja mort */ }
  }

  attempt.chunks = count;
  if (asyncError && !attempt.error) {
    attempt.error = 'callback error: ' + (asyncError.message || asyncError);
  }
  return attempt;
}

export async function encoderSelfTest(fps = 30) {
  if (typeof VideoEncoder !== 'function') {
    return { ok: false, tried: [], reason: 'VideoEncoder absent' };
  }

  const tried = [];
  // d'abord avec latencyMode (ce que fait roundTrip), puis sans
  for (const extra of [{ latencyMode: 'quality' }, {}]) {
    for (const codec of CODECS) {
      const a = await tryOne(codec, fps, extra);
      tried.push(a);
      if (a.chunks > 0) {
        return { ok: true, codec, options: a.options, tried, fps };
      }
    }
  }
  return { ok: false, tried, fps, reason: 'aucune combinaison n’a produit de paquet' };
}
