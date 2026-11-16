# STUDIO — Phase 1A : moteur audio et banc d'écoute — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produire la grille des temps, la structure et le point culminant d'un morceau, et les rendre **audibles** sur un banc pour que l'utilisateur valide à l'oreille le réglage qui commande tout le montage.

**Architecture :** cinq modules de logique pure sous `src/core/`, sans DOM ni WebCodecs, testables dans la page de tests existante. Par-dessus, une page de banc séparée (`bench.html`) qui joue le morceau avec un clic sur chaque temps détecté et marque le point culminant — c'est elle qui transforme un réglage invisible en quelque chose qui s'écoute.

**Tech Stack :** JavaScript (modules ES), Web Audio pour le décodage et le banc. **Aucune bibliothèque** : la FFT et l'autocorrélation sont écrites ici. Pas de Node, pas de build.

**Spec :** `docs/superpowers/specs/2026-11-14-studio-design.md` (§5.3 et §5.4 bis)
**Mesures de la phase 0 :** `docs/superpowers/specs/2026-11-16-mesures-phase-0.md`

---

## La phase 1 en trois plans

| Plan | Produit | Pourquoi séparé |
|---|---|---|
| **1A — moteur audio** *(ce document)* | grille des temps, sections, point culminant, extrait ancré + banc d'écoute | **La règle du point culminant n'a jamais été entendue sur de la vraie musique.** Elle a été déduite d'un graphique. C'est un réglage de goût que seul l'utilisateur peut valider, et toute la logique C repose dessus. |
| **1B — moteur vidéo** | plages exploitables par clip (netteté, horizon, exposition, ressemblance) + banc visuel | Les seuils de rejet ne sont pas devinables : le §8 les laisse à l'ouvrier, qui ne peut pas interroger l'utilisateur. Il faut les régler contre ses vraies vidéos, en voyant ce qui est gardé et ce qui est jeté. |
| **1C — montage et interface** | logique C, trois propositions, parcours complet | Dépend des deux précédents, et de ce que leurs bancs auront révélé. |

Cet ordre n'est pas arbitraire : **1A est le socle de la logique C**. Si la
détection du point culminant se révèle fausse à l'écoute, la forme validée en
maquette ne tombera pas au bon endroit, et 1C serait à refaire.

---

## Global Constraints

Copiées de la conception. Elles s'appliquent à chaque tâche.

- **Aucune étape de compilation.** Ni Node, ni npm, ni bundler : le Mac ne peut pas les faire tourner.
- **Mise au point dans Chrome sur le Mac**, jamais Safari (bloqué en Safari 16).
- **Le service worker ne s'enregistre pas sur localhost** — il servirait des modules périmés à la page de tests.
- **Logique pure sous `src/core/` :** aucun accès au DOM, aucun WebCodecs, aucune horloge. Tout y est testable sans appareil.
- **Rien ne quitte l'appareil.**
- **Tout callback de codec porte un `try/catch` qui enregistre l'erreur** (règle issue de la phase 0 ; concerne ici le seul décodage audio).
- **Chaque étape a son propre compteur** — jamais un chiffre unique pour deux réalités.
- **Aucun réglage de montage exposé à l'utilisateur** (anti-objectif 1). Le banc est un outil de mise au point, pas un écran de l'app.

## Review Focus

Cinq classes d'entrée que la spec implique sans qu'aucune tâche ne les exerce spontanément.

1. **Morceau plus court que l'extrait demandé** (mp3 de 10 s pour un reel de 20 s) — doit refuser en nommant les durées, jamais produire un extrait négatif ou tronqué en silence. → Tâche 5.
2. **Morceau sans percussion nette** (ambient, nappe) — l'autocorrélation renverra toujours *un* maximum. Rendre un BPM inventé sans le signaler ferait tomber toutes les coupes à côté. Il faut un **indice de confiance**. → Tâche 3.
3. **Point culminant détecté trop tôt** (moins de 38 temps depuis le début) — l'ancrage sortirait du morceau par la gauche. → Tâche 5.
4. **Tempo extrême** — 50 temps font 50 s à 60 BPM et 15 s à 200 BPM. La fourchette 15–25 s du §2 doit tenir aux deux bouts. → Tâche 5.
5. **Mono et 44,1 kHz** — toute la chaîne a été pensée sur du 48 kHz stéréo ; les indices de l'enveloppe changent d'échelle avec la fréquence d'échantillonnage. → Tâches 2 et 3.

---

## File Structure

| Fichier | Responsabilité |
|---|---|
| `src/core/fft.js` | **Pure.** FFT radix-2 en place, et fenêtre de Hann. |
| `src/core/onsets.js` | **Pure.** Mono, STFT, flux spectral → enveloppe des attaques. |
| `src/core/tempo.js` | **Pure.** Autocorrélation → tempo et confiance ; calage de phase → grille des temps. |
| `src/core/sections.js` | **Pure.** Enveloppe lissée, frontières de sections, **point culminant = plus grand saut**. |
| `src/core/excerpt.js` | **Pure.** Ancre la forme de 50 temps sur le point culminant, l'adapte au tempo. |
| `src/probe/analyse-track.js` | Enchaîne décodage → enveloppe → tempo → sections → extrait. Seul module qui touche Web Audio. |
| `bench.html` | Banc d'écoute : joue le morceau avec un clic sur chaque temps, marque le point culminant. |
| `src/bench/click-track.js` | Génère les clics Web Audio alignés sur la grille. |
| `src/bench/envelope-view.js` | Trace l'enveloppe, les sections, le point culminant et la fenêtre d'extrait. |
| `tests/fft.test.js`, `onsets.test.js`, `tempo.test.js`, `sections.test.js`, `excerpt.test.js` | Tests de la logique pure. |

---

## Task 1 : FFT et fenêtre

**Files:**
- Create: `src/core/fft.js`, `tests/fft.test.js`
- Modify: `tests/index.html`

**Interfaces:**
- Consumes: le harnais `assert` / `test` existant.
- Produces : `fft(re: Float32Array, im: Float32Array) -> void` (en place, longueur puissance de 2) ; `hann(n: number) -> Float32Array`.

- [ ] **Step 1 : Écrire les tests**

```js
test('une impulsion donne un spectre plat', () => {
  const n = 64, re = new Float32Array(n), im = new Float32Array(n);
  re[0] = 1;
  fft(re, im);
  for (let k = 0; k < n; k++) {
    assert(Math.abs(Math.hypot(re[k], im[k]) - 1) < 1e-5, 'bin ' + k);
  }
});

test('une sinusoïde se concentre sur son bin', () => {
  const n = 1024, k0 = 64;
  const re = new Float32Array(n), im = new Float32Array(n);
  for (let i = 0; i < n; i++) re[i] = Math.cos(2 * Math.PI * k0 * i / n);
  fft(re, im);
  const mag = (k) => Math.hypot(re[k], im[k]);
  for (let k = 2; k < n / 2; k++) {
    if (Math.abs(k - k0) > 2) assert(mag(k) < mag(k0) / 50, 'fuite au bin ' + k);
  }
});

test('la fenêtre de Hann part de zéro et culmine au milieu', () => {
  const w = hann(8);
  assert(w[0] < 1e-6 && w[7] < 0.2, 'les bords doivent être bas');
  assert(Math.abs(w[4] - 1) < 0.2, 'le centre doit approcher 1');
});

test('une longueur qui n’est pas une puissance de 2 est refusée', () => {
  let msg = '';
  try { fft(new Float32Array(100), new Float32Array(100)); } catch (e) { msg = e.message; }
  assert(msg.includes('2'), 'le message doit dire pourquoi : ' + msg);
});
```

- [ ] **Step 2 : Lancer les tests dans Chrome** — attendu : 4 échecs, `fft is not defined`.
- [ ] **Step 3 : Implémenter `fft` et `hann` dans `src/core/fft.js`** — Cooley-Tukey itératif avec inversion de bits, en place, sans allocation par appel.
- [ ] **Step 4 : Lancer les tests** — attendu : **4 passed**.
- [ ] **Step 5 : Commit**

```bash
git add src/core/fft.js tests/fft.test.js tests/index.html && git commit -m "feat: FFT radix-2 et fenetre de Hann"
```

---

## Task 2 : Enveloppe des attaques

**Files:**
- Create: `src/core/onsets.js`, `tests/onsets.test.js`
- Modify: `tests/index.html`

**Interfaces:**
- Consumes: `fft`, `hann` (tâche 1).
- Produces : `toMono(channels: Float32Array[]) -> Float32Array` ; `onsetEnvelope(mono, sampleRate, {frame = 1024, hop = 512}) -> {env: Float32Array, rate: number}` où `rate` vaut `sampleRate / hop`.

- [ ] **Step 1 : Écrire les tests**

Une aide de fixture en tête du fichier : `clickTrack(sec, sampleRate, bpm)` rend une `Float32Array` de bruit court (2 ms) à chaque temps, silence ailleurs.

```js
test('le silence ne produit aucune attaque', () => {
  const { env } = onsetEnvelope(new Float32Array(48000), 48000, {});
  assert(env.every((v) => v === 0), 'enveloppe non nulle sur du silence');
});

test('la cadence de l’enveloppe est bien sampleRate / hop', () => {
  assert(onsetEnvelope(new Float32Array(48000), 48000, {}).rate === 93.75);
  assert(onsetEnvelope(new Float32Array(44100), 44100, {}).rate === 44100 / 512);
});

test('chaque clic produit un pic', () => {
  const { env, rate } = onsetEnvelope(clickTrack(4, 48000, 120), 48000, {});
  const seuil = Math.max(...env) * 0.4;
  const pics = [];
  for (let i = 1; i < env.length - 1; i++) {
    if (env[i] > seuil && env[i] >= env[i - 1] && env[i] > env[i + 1]) pics.push(i / rate);
  }
  assert(pics.length >= 7 && pics.length <= 9, '8 temps attendus en 4 s à 120 BPM, obtenu ' + pics.length);
  assert(Math.abs(pics[1] - pics[0] - 0.5) < 0.05, 'écart de 0,5 s entre deux temps');
});

test('le mono additionne les canaux sans saturer', () => {
  const g = new Float32Array([1, 1]), d = new Float32Array([1, -1]);
  const m = toMono([g, d]);
  assert(Math.abs(m[0] - 1) < 1e-6 && Math.abs(m[1]) < 1e-6, 'moyenne attendue');
});
```

*(Le 2ᵉ test couvre le point 5 de Review Focus : 44,1 kHz.)*

- [ ] **Step 2 : Lancer les tests** — attendu : 4 échecs.
- [ ] **Step 3 : Implémenter `toMono` et `onsetEnvelope` dans `src/core/onsets.js`** — flux spectral : somme des différences **positives** de magnitude d'une trame à la suivante, sur les `frame/2` premiers bins.
- [ ] **Step 4 : Lancer les tests** — attendu : **4 passed**.
- [ ] **Step 5 : Commit**

---

## Task 3 : Tempo, confiance et grille des temps

**Files:**
- Create: `src/core/tempo.js`, `tests/tempo.test.js`
- Modify: `tests/index.html`

**Interfaces:**
- Consumes: `onsetEnvelope` (tâche 2).
- Produces : `detectTempo(env, rate) -> {bpm, confidence, lag}` avec `confidence` dans [0, 1] ; `beatGrid(env, rate, bpm) -> {beatSec, offsetSec, beats: Float64Array}`.

- [ ] **Step 1 : Écrire les tests**

```js
test('le tempo d’une piste de clics est retrouvé', () => {
  for (const bpm of [90, 120, 150, 174]) {
    const { env, rate } = onsetEnvelope(clickTrack(20, 48000, bpm), 48000, {});
    const t = detectTempo(env, rate);
    assert(Math.abs(t.bpm - bpm) < 2, bpm + ' BPM attendu, obtenu ' + t.bpm.toFixed(1));
  }
});

test('le tempo est replié dans la plage utile', () => {
  const { env, rate } = onsetEnvelope(clickTrack(20, 48000, 75), 48000, {});
  const t = detectTempo(env, rate);
  assert(t.bpm >= 80 && t.bpm <= 190, 'obtenu ' + t.bpm);
});

test('une nappe sans percussion a une confiance basse', () => {
  // bruit rose lisse, sans attaque : l autocorrelation trouvera un maximum,
  // mais il ne veut rien dire — Review Focus 2
  const { env, rate } = onsetEnvelope(smoothNoise(20, 48000), 48000, {});
  const t = detectTempo(env, rate);
  assert(t.confidence < 0.3, 'confiance attendue basse, obtenue ' + t.confidence.toFixed(2));
});

test('une piste de clics a une confiance haute', () => {
  const { env, rate } = onsetEnvelope(clickTrack(20, 48000, 140), 48000, {});
  assert(detectTempo(env, rate).confidence > 0.6);
});

test('le tempo est juste aussi à 44,1 kHz et en mono', () => {
  // Review Focus 5 : toute la chaine a ete pensee en 48 kHz stereo
  const { env, rate } = onsetEnvelope(clickTrack(20, 44100, 128), 44100, {});
  const t = detectTempo(env, rate);
  assert(Math.abs(t.bpm - 128) < 2, '128 BPM attendu, obtenu ' + t.bpm.toFixed(1));
});

test('la grille tombe sur les clics, pas entre eux', () => {
  const sr = 48000, bpm = 120, decalage = 0.17; // le morceau ne commence pas sur un temps
  const { env, rate } = onsetEnvelope(clickTrack(20, sr, bpm, decalage), sr, {});
  const g = beatGrid(env, rate, bpm);
  assert(Math.abs(g.beatSec - 0.5) < 0.01, 'durée du temps');
  const reste = Math.abs(((g.offsetSec - decalage) % 0.5 + 0.5) % 0.5);
  assert(reste < 0.06 || Math.abs(reste - 0.5) < 0.06, 'phase mal calée : ' + g.offsetSec.toFixed(3));
});
```

- [ ] **Step 2 : Lancer les tests** — attendu : 6 échecs.
- [ ] **Step 3 : Implémenter `detectTempo` et `beatGrid` dans `src/core/tempo.js`**

Autocorrélation de l'enveloppe centrée, sur les décalages correspondant à 60–200 BPM, puis repliement par octave dans 80–190. `confidence` = rapport entre le pic retenu et la moyenne de l'autocorrélation sur la plage, ramené dans [0, 1]. `beatGrid` corrèle l'enveloppe avec un peigne d'impulsions à la période trouvée et retient le décalage qui maximise la somme.

- [ ] **Step 4 : Lancer les tests** — attendu : **6 passed**.
- [ ] **Step 5 : Commit**

---

## Task 4 : Sections et point culminant

**Files:**
- Create: `src/core/sections.js`, `tests/sections.test.js`
- Modify: `tests/index.html`

**Interfaces:**
- Consumes: l'enveloppe de la tâche 2.
- Produces : `smoothEnvelope(env, rate, windowSec = 2) -> Float32Array` ; `findClimax(env, rate) -> {timeSec, stepRatio}` ; `sections(env, rate) -> Array<{startSec, endSec, level}>`.

> **C'est la tâche qui porte la correction de l'utilisateur**, et le seul test
> qui compte vraiment est le second : le point culminant n'est **pas** le
> maximum de l'enveloppe, c'est **le plus grand saut vers le haut**. Un morceau
> de metal passe ses deux dernières minutes à pleine énergie ; le maximum n'y
> désigne rien.

- [ ] **Step 1 : Écrire les tests**

```js
test('le lissage écrase les pics isolés et garde les plateaux', () => {
  const rate = 93.75, env = new Float32Array(Math.round(rate * 20));
  env.fill(1); env[500] = 50;
  const s = smoothEnvelope(env, rate, 2);
  assert(s[500] < 2, 'un pic isolé ne doit pas survivre au lissage');
  assert(Math.abs(s[1000] - 1) < 0.1, 'un plateau doit être conservé');
});

test('le point culminant est le saut, PAS le maximum', () => {
  // calme 10 s, saut a 10 s, puis plateau LEGEREMENT plus fort a la fin :
  // le maximum global est a la fin, le saut est a 10 s.
  const rate = 93.75, n = Math.round(rate * 30), env = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    env[i] = t < 10 ? 0.2 : (t < 22 ? 1.0 : 1.15);
  }
  const c = findClimax(env, rate);
  assert(Math.abs(c.timeSec - 10) < 1.5,
         'attendu ~10 s (le saut), obtenu ' + c.timeSec.toFixed(1) + ' s');
  assert(c.timeSec < 20, 'ne doit pas désigner le maximum global en fin de morceau');
});

test('le saut est mesuré après un passage plus calme', () => {
  const rate = 93.75, n = Math.round(rate * 30), env = new Float32Array(n);
  for (let i = 0; i < n; i++) env[i] = (i / rate) < 15 ? 1.0 : 1.05;
  const c = findClimax(env, rate);
  assert(c.stepRatio < 1.5, 'une montée insignifiante doit se voir dans stepRatio');
});

test('les sections suivent les paliers d’énergie', () => {
  const rate = 93.75, n = Math.round(rate * 30), env = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    env[i] = t < 10 ? 0.2 : (t < 20 ? 1.0 : 0.3);
  }
  const s = sections(env, rate);
  assert(s.length >= 3, 'trois paliers attendus, obtenu ' + s.length);
  assert(Math.abs(s[1].startSec - 10) < 2, 'frontière vers 10 s');
});
```

- [ ] **Step 2 : Lancer les tests** — attendu : 4 échecs.
- [ ] **Step 3 : Implémenter les trois fonctions dans `src/core/sections.js`**

`findClimax` : pour chaque instant, comparer la moyenne de l'enveloppe lissée sur les 2 s **suivantes** à celle des 4 s **précédentes** ; retenir le rapport le plus élevé. `timeSec` est l'instant où le saut se termine ; `stepRatio` est ce rapport, et sert à dire si le saut est franc ou mou.

- [ ] **Step 4 : Lancer les tests** — attendu : **4 passed**.
- [ ] **Step 5 : Commit**

---

## Task 5 : Ancrage de l'extrait

**Files:**
- Create: `src/core/excerpt.js`, `tests/excerpt.test.js`
- Modify: `tests/index.html`

**Interfaces:**
- Consumes: `beatGrid` (tâche 3), `findClimax` (tâche 4).
- Produces : `anchorExcerpt({durationSec, grid, climaxSec}) -> {startSec, durSec, beatCount, burstBeatIndex}`.

Forme de référence validée en maquette (§5.4 bis) : **38 temps avant le point
culminant, 12 après**, soit 50 temps. Fourchette imposée : **15 à 25 s**.

- [ ] **Step 1 : Écrire les tests**

```js
const grille = (bpm) => ({ beatSec: 60 / bpm, offsetSec: 0 });

test('l’extrait s’ancre 38 temps avant le point culminant', () => {
  const g = grille(140);
  const r = anchorExcerpt({ durationSec: 300, grid: g, climaxSec: 120 });
  assert(Math.abs(r.startSec - (120 - 38 * g.beatSec)) < 0.05, 'début, obtenu ' + r.startSec);
  assert(Math.abs(r.durSec - 50 * g.beatSec) < 0.05, 'durée de 50 temps');
  assert(r.burstBeatIndex === 38, 'la rafale tombe sur le 38e temps');
});

test('la fourchette 15–25 s tient aux tempos extrêmes', () => {
  for (const bpm of [60, 80, 140, 200]) {
    const r = anchorExcerpt({ durationSec: 300, grid: grille(bpm), climaxSec: 150 });
    assert(r.durSec >= 15 && r.durSec <= 25,
           bpm + ' BPM donne ' + r.durSec.toFixed(1) + ' s');
  }
});

test('un point culminant trop précoce décale l’extrait sans sortir du morceau', () => {
  const r = anchorExcerpt({ durationSec: 300, grid: grille(140), climaxSec: 3 });
  assert(r.startSec >= 0, 'début négatif : ' + r.startSec);
  assert(r.startSec + r.durSec <= 300, 'dépasse la fin');
});

test('un point culminant trop tardif décale aussi', () => {
  const r = anchorExcerpt({ durationSec: 300, grid: grille(140), climaxSec: 299 });
  assert(r.startSec + r.durSec <= 300, 'dépasse la fin : ' + (r.startSec + r.durSec));
});

test('un morceau plus court que l’extrait est refusé en nommant les durées', () => {
  let msg = '';
  try { anchorExcerpt({ durationSec: 10, grid: grille(140), climaxSec: 5 }); }
  catch (e) { msg = e.message; }
  assert(msg.includes('10') && msg.includes('15'),
         'le message doit donner la durée du morceau et le minimum : ' + msg);
});
```

*(Couvre les points 1, 3 et 4 de Review Focus.)*

- [ ] **Step 2 : Lancer les tests** — attendu : 5 échecs.
- [ ] **Step 3 : Implémenter `anchorExcerpt` dans `src/core/excerpt.js`**

Partir de 38/12. Si la durée sort de 15–25 s, retirer ou ajouter des temps **dans le corps et la sortie uniquement** : l'ouverture, la montée et la rafale gardent leur forme, c'est elle que l'utilisateur a validée à l'oreille. Si l'extrait sort du morceau, le translater sans changer sa durée, et recalculer `burstBeatIndex` en conséquence.

- [ ] **Step 4 : Lancer les tests** — attendu : **5 passed**.
- [ ] **Step 5 : Commit**

---

## Task 6 : Banc d'écoute

**Files:**
- Create: `bench.html`, `src/probe/analyse-track.js`, `src/bench/click-track.js`, `src/bench/envelope-view.js`
- Modify: `sw.js` (liste du socle)

**Interfaces:**
- Consumes: tout ce qui précède, plus `loadAudio` de `src/probe/audio.js`.
- Produces : `analyseTrack(file) -> {bpm, confidence, grid, climax, sections, excerpt, env, rate, msTotal}`.

> C'est la tâche qui rend le réglage **audible**. Sans elle, la règle du point
> culminant resterait une déduction tirée d'un graphique.

- [ ] **Step 1 : Écrire le test de l'enchaînement**

```js
test('analyseTrack refuse un fichier illisible en le nommant', async () => {
  const faux = new File([new Uint8Array([1, 2, 3])], 'casse.mp3');
  const err = await analyseTrack(faux).then(() => null, (e) => e);
  assert(err !== null && err.message.includes('casse.mp3'), err && err.message);
});
```

- [ ] **Step 2 : Lancer le test** — attendu : 1 échec, `analyseTrack is not defined`.
- [ ] **Step 3 : Implémenter `analyseTrack`** — décodage via `loadAudio`, puis enchaînement des tâches 2 à 5 : `toMono` → `onsetEnvelope` → `detectTempo` → `beatGrid` → `findClimax` → `anchorExcerpt({ durationSec: buffer.duration, grid, climaxSec: climax.timeSec })`. Chaque étape est chronométrée séparément (règle des compteurs).
- [ ] **Step 4 : Lancer la suite complète** — attendu : **tous verts**.
- [ ] **Step 5 : Écrire `bench.html` et ses deux modules**

Le banc doit permettre, en un écran : choisir un mp3 ; lire le relevé (tempo, confiance, point culminant, bornes de l'extrait, durée) ; voir l'enveloppe lissée avec les frontières de sections, le point culminant et la fenêtre d'extrait ; et **écouter** — lecture du morceau avec un clic court sur chaque temps de la grille, un clic plus marqué sur le premier temps de chaque mesure, et un son distinct sur le point culminant. Deux boutons : lire tout le morceau, lire seulement l'extrait retenu.

Reprendre la palette de `index.html` (`#10131a`, accent `#e9a640`).

- [ ] **Step 6 : Commit**

```bash
git add -A && git commit -m "feat: banc d'ecoute, grille des temps audible"
```

- [ ] **Step 7 : Validation par l'utilisateur — la seule qui compte**

Publier, puis lui demander d'ouvrir le banc **avec deux ou trois de ses propres morceaux** et de répondre à trois questions :

1. Les clics tombent-ils **sur** le rythme, du début à la fin, sans dériver ?
2. Le point culminant tombe-t-il là où **ça décolle à l'oreille** ?
3. L'extrait retenu est-il un passage qu'il **mettrait sur un reel** ?

Consigner ses réponses dans `docs/superpowers/specs/2026-11-16-validation-audio.md`.
**Si la réponse 2 est non, c'est la règle du §5.3 qui est à revoir, pas le
code** — et il faut y revenir avant d'écrire le plan 1C.

---

## Après ce plan

- **Les trois réponses sont oui** → écrire le plan **1B** (moteur vidéo et banc visuel).
- **Le tempo dérive** → le calage de phase est à reprendre (temps variable, ou tempo non constant sur le morceau).
- **Le point culminant tombe à côté** → retour au §5.3 de la conception. C'est une décision de goût, elle appartient à l'utilisateur, et aucune quantité de code ne la remplacera.
