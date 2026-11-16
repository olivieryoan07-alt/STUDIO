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

const FADE_OUT = 0.4; // §5.4 bis : sortie en fondu court

export function createBench(ctx) {
  let source = null;
  let noeuds = [];
  let timer = null;

  function stop() {
    if (timer) { clearTimeout(timer); timer = null; }
    if (source) { try { source.stop(); } catch (_) {} source = null; }
    for (const n of noeuds) { try { n.stop(); } catch (_) {} }
    noeuds = [];
  }

  // `from`/`to` en secondes dans le morceau ; `climaxSec` recoit un son a part.
  function play(buffer, grid, climaxSec, from = 0, to = buffer.duration) {
    stop();
    const t0 = ctx.currentTime + 0.12;

    const duree = Math.max(0.05, to - from);

    source = ctx.createBufferSource();
    source.buffer = buffer;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.7, t0); // laisser de la place aux clics
    // Fondu de sortie : l'utilisateur a explicitement rejete la coupe franche
    // en fin (« produit un claquement desagreable », §5.4 bis). Sans lui, le
    // banc fait entendre un defaut que le produit n'aura pas.
    const fade = Math.min(FADE_OUT, duree / 2);
    g.gain.setValueAtTime(0.7, t0 + duree - fade);
    g.gain.linearRampToValueAtTime(0.0001, t0 + duree);
    source.connect(g);
    g.connect(ctx.destination);
    source.start(t0, from, duree);

    // Programmation par tranches. Creer ~560 paires de noeuds d'un coup
    // pouvait depasser les 120 ms d'avance : la musique partait a l'heure et
    // les premiers clics etaient programmes dans le passe.
    const TRANCHE = 5;
    let prochain = from;
    let n = Math.max(0, Math.round((from - grid.offsetSec) / grid.beatSec));

    function programmer() {
      const limite = Math.min(to, prochain + TRANCHE);
      for (let t = grid.offsetSec + n * grid.beatSec; t < limite; t += grid.beatSec, n++) {
        if (t < from) continue;
        const at = t0 + (t - from);
        if (at < ctx.currentTime) continue; // deja passe : on ne force pas
        const mesure = n % 4 === 0;
        noeuds.push(clic(ctx, at, mesure ? 3000 : 2000, mesure ? 0.5 : 0.25, 0.035));
      }
      prochain = limite;
      if (prochain < to) timer = setTimeout(programmer, TRANCHE * 500);
    }
    programmer();

    if (climaxSec >= from && climaxSec <= to) {
      noeuds.push(clic(ctx, t0 + (climaxSec - from), 440, 0.6, 0.30));
    }

    return { startedAt: t0, duration: duree };
  }

  return { play, stop };
}
