// Banc d'ecoute : joue le morceau avec un clic sur chaque temps detecte.
//
// C'est ce module qui transforme un reglage invisible en quelque chose qui
// s'ecoute. Sans lui, la regle du point culminant resterait une deduction
// tiree d'un graphique.

function clic(ctx, at, freq, gain, dur) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'square';
  o.frequency.setValueAtTime(freq, at);
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0008, at + dur);
  o.connect(g);
  g.connect(ctx.destination);
  o.start(at);
  o.stop(at + dur + 0.02);
  return o;
}

export function createBench(ctx) {
  let source = null;
  let noeuds = [];

  function stop() {
    if (source) { try { source.stop(); } catch (_) {} source = null; }
    for (const n of noeuds) { try { n.stop(); } catch (_) {} }
    noeuds = [];
  }

  // `from`/`to` en secondes dans le morceau ; `climaxSec` recoit un son a part.
  function play(buffer, grid, climaxSec, from = 0, to = buffer.duration) {
    stop();
    const t0 = ctx.currentTime + 0.12;

    source = ctx.createBufferSource();
    source.buffer = buffer;
    const g = ctx.createGain();
    g.gain.value = 0.7; // laisser de la place aux clics
    source.connect(g);
    g.connect(ctx.destination);
    source.start(t0, from, Math.max(0.05, to - from));

    let n = 0;
    for (let t = grid.offsetSec; t < to; t += grid.beatSec, n++) {
      if (t < from) continue;
      const at = t0 + (t - from);
      const mesure = n % 4 === 0;
      noeuds.push(clic(ctx, at, mesure ? 3000 : 2000, mesure ? 0.5 : 0.25, 0.035));
    }

    if (climaxSec >= from && climaxSec <= to) {
      noeuds.push(clic(ctx, t0 + (climaxSec - from), 440, 0.6, 0.30));
    }

    return { startedAt: t0, duration: to - from };
  }

  return { play, stop };
}
