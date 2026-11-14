# STUDIO — Phase 0 : socle mesuré — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publier une app web installable sur l'iPhone qui répond aux cinq questions bloquantes du §9 du document de conception, avant d'écrire la moindre ligne des moteurs de montage.

**Architecture :** une PWA statique, sans étape de compilation, hébergée sur GitHub Pages. Modules ES natifs chargés directement par le navigateur ; bibliothèques tierces déposées en fichiers dans `vendor/` ; tests unitaires exécutés dans une page ouverte avec Chrome sur le Mac. La logique pure (calcul de recadrage, résumé de piste, formatage du relevé) est séparée des modules qui touchent au matériel, pour être testable sans iPhone.

**Tech Stack :** HTML/CSS/JavaScript (modules ES), WebCodecs, Web Audio, `mp4box.js` (démuxage), `mp4-muxer` (muxage), Service Worker, GitHub Pages. **Aucun Node, aucun npm, aucun bundler.**

**Spec :** `docs/superpowers/specs/2026-11-14-studio-design.md`

## Global Constraints

Copiées du document de conception. Elles s'appliquent à chaque tâche.

- **Sortie : 1080×1920, 60 img/s.** Copie exacte de la source, aucun redimensionnement, aucune décimation (spec §3 « Format de sortie »).
- **Un clip à la fois.** Jamais deux décodeurs ouverts simultanément (spec §3).
- **Aucune image pleine définition conservée.** Réduire, mesurer, jeter (spec §3).
- **Aucun fichier chargé entier en mémoire.** Lecture en flux (spec §3).
- **Rien ne quitte l'appareil.** Aucun envoi réseau de fichier utilisateur (spec §2, objectif 6).
- **Aucune étape de compilation.** Le Mac n'a ni Node ni Homebrew, et 9,9 Go libres. Les fichiers publiés sont exactement les fichiers du dépôt.
- **Mise au point dans Chrome sur le Mac**, jamais Safari : le Mac est bloqué en Safari 16, trop ancien pour WebCodecs (spec §8).
- **Pire cas dimensionnant : 5 clips × 30 s = 150 s de matière** (spec §3).
- **Toute attente est annoncée avec une progression visible** (spec §2, anti-objectif 5).

## Review Focus

Cinq classes d'entrée que la spec implique sans qu'aucune tâche ne les exerce spontanément. Chaque ligne reçoit son test dans la tâche qui en possède le code.

1. **Fichier audio protégé ou corrompu** (m4a acheté, mp3 tronqué) — `decodeAudioData` rejette ; l'app doit afficher un message nommant le fichier, pas planter. → Tâche 4.
2. **Vidéo HDR 10 bits** — si le sélecteur remet l'original Dolby Vision, les pixels lus sur un canvas 8 bits sont mal convertis et les seuils d'exposition ne mesurent plus rien. L'app doit le **détecter et le dire**, pas le subir silencieusement. → Tâche 2.
3. **Fichier choisi qui n'est pas une vidéo décodable** (Live Photo, HEIC, vidéo sans piste vidéo) — message clair, pas d'exception non rattrapée. → Tâche 2.
4. **Décodeur non refermé après un échec** — sur 5 clips, fuite puis plantage mémoire. Tout décodeur et tout encodeur se ferment dans un `finally`. → Tâche 3.
5. **Source qui n'est pas en 9:16** (clip filmé à l'horizontale ou dans un autre format) — le recadrage doit rester centré et produire des dimensions **paires** (exigées par H.264). → Tâche 3.

---

## File Structure

| Fichier | Responsabilité |
|---|---|
| `index.html` | Page unique de l'app. Pour cette phase : l'écran de relevé. |
| `manifest.webmanifest` | Déclaration PWA (nom, icône, plein écran, portrait). |
| `sw.js` | Service worker : met le socle en cache, démarrage hors ligne. |
| `.nojekyll` | Empêche GitHub Pages d'ignorer les fichiers utiles. |
| `src/core/crop.js` | **Logique pure.** Calcul du rectangle de recadrage centré. |
| `src/core/track-summary.js` | **Logique pure.** Résume une configuration de piste en verdict lisible. |
| `src/core/report.js` | **Logique pure.** Accumule et formate les mesures. |
| `src/probe/caps.js` | Inventaire des capacités du navigateur. |
| `src/probe/inspect.js` | Démuxe le fichier choisi et en extrait la configuration réelle. |
| `src/probe/roundtrip.js` | Démux → décode → recadrage → encode → mux. Le cœur du risque. |
| `src/probe/audio.js` | Décodage du mp3, encodage AAC, muxage de la piste audio. |
| `src/probe/share.js` | Partage iOS du mp4 produit. |
| `src/ui/report-view.js` | Rendu du relevé et de la progression. |
| `vendor/mp4box.all.min.js` | Démuxeur mp4. Déposé, non installé. |
| `vendor/mp4-muxer.js` | Muxeur mp4. Déposé, non installé. |
| `tests/index.html` | Lanceur de tests, ouvert dans Chrome. |
| `tests/harness.js` | Micro-harnais d'assertions (pas de dépendance). |
| `tests/*.test.js` | Tests de la logique pure. |

---

## Task 1 : Dépôt, socle PWA, publication

**Files:**
- Create: `index.html`, `manifest.webmanifest`, `sw.js`, `.nojekyll`, `README.md`, `icon-192.png`, `icon-512.png`
- Create: `tests/index.html`, `tests/harness.js`
- Create: `.gitignore`

**Interfaces:**
- Consumes: rien.
- Produces: `assert(cond, message)`, `test(name, fn)`, `runTests()` exportés par `tests/harness.js` ; une page `index.html` affichant `window.STUDIO_VERSION`.

> **Préalable à la charge de l'utilisateur.** Créer le compte GitHub et un dépôt **public** nommé `STUDIO`, puis activer Pages (Settings → Pages → branche `main`, dossier `/`). La création de compte lui revient ; l'implémenteur ne la fait pas à sa place. Le plan reprend après, avec l'URL `https://<utilisateur>.github.io/STUDIO/`.

- [ ] **Step 1 : Écrire le harnais de test et son premier test**

`tests/harness.js` expose `assert(cond, msg)`, `test(name, fn)`, `runTests()` ; `runTests` écrit chaque résultat dans le DOM et renvoie `{passed, failed}`. Premier test, dans `tests/harness.test.js` :

```js
test('le harnais signale un échec', () => {
  let caught = false;
  try { assert(false, 'attendu'); } catch (e) { caught = true; }
  assert(caught, 'assert doit lever quand la condition est fausse');
});
```

- [ ] **Step 2 : Ouvrir `tests/index.html` dans Chrome sur le Mac**

Attendu : **1 passed, 0 failed**. Si la page est blanche, les modules ES ne se chargent pas depuis `file://` — servir le dossier et noter la méthode dans le README.

- [ ] **Step 3 : Écrire `index.html`, `manifest.webmanifest`, `sw.js`, `.nojekyll`**

`index.html` affiche le nom STUDIO et `window.STUDIO_VERSION` (chaîne littérale, incrémentée à chaque publication). `manifest.webmanifest` : `display: "standalone"`, `orientation: "portrait"`, fond `#10131a`. `sw.js` met en cache le socle listé en dur et répond depuis le cache en priorité. Les icônes reprennent la palette de la spec (fond `#10131a`, accent `#e9a640`).

- [ ] **Step 4 : Publier et installer sur l'iPhone**

```bash
cd /Users/yoanolivier/STUDIO && git init && git add -A && git commit -m "feat: socle PWA installable" && git branch -M main && git remote add origin https://github.com/<utilisateur>/STUDIO.git && git push -u origin main
```

Puis sur l'iPhone : ouvrir l'URL dans Safari → Partager → « Sur l'écran d'accueil ».

- [ ] **Step 5 : Vérifier l'installation**

Attendu, à relever : l'icône est sur l'écran d'accueil ; l'app s'ouvre **sans barre d'adresse** ; **en mode avion, elle s'ouvre encore** et affiche la version. Ces trois points valident l'objectif 5 de la spec.

---

## Task 2 : Sonde A — ce que le sélecteur Photos remet réellement

Répond à la **question 1** du §9. Décide s'il faut gérer HEVC et HDR, et conditionne les seuils d'exposition.

**Files:**
- Create: `src/core/track-summary.js`, `src/probe/inspect.js`, `src/probe/caps.js`
- Create: `tests/track-summary.test.js`
- Modify: `index.html`
- Vendor: `vendor/mp4box.all.min.js`

**Interfaces:**
- Consumes: le harnais de la tâche 1.
- Produces :
  - `summariseTrack(config) -> {codecFamily, hdr, warnings[]}` où `config` est `{codec, codedWidth, codedHeight, fps, rotation, bitDepth, colorPrimaries, transferCharacteristics}` ;
  - `inspectFile(file) -> Promise<config>` ;
  - `capabilities() -> {videoDecoder, videoEncoder, audioEncoder, share, containers[]}`.

- [ ] **Step 1 : Écrire les tests de `summariseTrack`**

```js
test('hvc1 est reconnu comme HEVC', () => {
  assert(summariseTrack({codec:'hvc1.2.4.L120.B0', bitDepth:8}).codecFamily === 'HEVC');
});
test('avc1 est reconnu comme H.264', () => {
  assert(summariseTrack({codec:'avc1.640034', bitDepth:8}).codecFamily === 'H.264');
});
test('10 bits + PQ est signale comme HDR', () => {
  const r = summariseTrack({codec:'hvc1.2.4.L120.B0', bitDepth:10, transferCharacteristics:'pq'});
  assert(r.hdr === true);
  assert(r.warnings.some(w => w.includes('exposition')), 'doit prevenir que les seuils d exposition sont fausses');
});
test('8 bits SDR ne declenche aucun avertissement', () => {
  assert(summariseTrack({codec:'avc1.640034', bitDepth:8}).warnings.length === 0);
});
test('un codec inconnu est rapporte, pas ignore', () => {
  assert(summariseTrack({codec:'xxxx', bitDepth:8}).codecFamily === 'inconnu');
});
```

*(Couvre le point 2 de Review Focus.)*

- [ ] **Step 2 : Lancer les tests dans Chrome**

Attendu : 5 échecs, `summariseTrack is not defined`.

- [ ] **Step 3 : Implémenter `summariseTrack(config)` dans `src/core/track-summary.js`**

Logique pure, aucune dépendance. `hdr` est vrai si `bitDepth >= 10` **ou** si `transferCharacteristics` vaut `pq` ou `hlg`. Quand `hdr` est vrai, `warnings` contient une phrase nommant explicitement les seuils d'exposition du §5.2.

- [ ] **Step 4 : Lancer les tests**

Attendu : **5 passed, 0 failed**.

- [ ] **Step 5 : Déposer `mp4box.js` et implémenter `inspectFile` et `capabilities`**

```bash
curl -L -o vendor/mp4box.all.min.js https://cdn.jsdelivr.net/npm/mp4box@0.5.2/dist/mp4box.all.min.js
```

`inspectFile(file)` lit le fichier **en flux** (`file.stream()`), alimente mp4box, et renvoie la configuration de la première piste vidéo. Si aucune piste vidéo n'existe, lever une erreur dont le message nomme le fichier *(point 3 de Review Focus)*.

- [ ] **Step 6 : Brancher l'écran de sonde dans `index.html`**

Un sélecteur `<input type="file" accept="video/*">`, puis le relevé : codec, famille, définition, cadence, rotation, profondeur, HDR, avertissements.

- [ ] **Step 7 : Mesurer sur l'iPhone**

Publier, ouvrir l'app, choisir **une vraie vidéo 1080p 60 de la galerie**. Relever et consigner : famille de codec, HDR oui/non, définition, cadence, rotation. **C'est la réponse à la question 1 du §9.**

- [ ] **Step 8 : Commit**

```bash
git add -A && git commit -m "feat: sonde A, inspection reelle du fichier remis par le selecteur"
```

---

## Task 3 : Sonde B — aller-retour complet démux → décode → recadrage → encode → mux

Répond aux **questions 2 et 5** du §9. C'est le risque 6, le plus grave : aucune mesure n'existe, et il n'y a pas de repli.

**Files:**
- Create: `src/core/crop.js`, `src/probe/roundtrip.js`
- Create: `tests/crop.test.js`
- Modify: `index.html`
- Vendor: `vendor/mp4-muxer.js`

**Interfaces:**
- Consumes: `inspectFile` (tâche 2).
- Produces : `cropRect(srcW, srcH, dstW, dstH) -> {sx, sy, sw, sh}` ; `roundTrip(file, {seconds, onProgress}) -> Promise<{blob, frames, msDecode, msEncode, peakBytes}>`.

- [ ] **Step 1 : Écrire les tests de `cropRect`**

```js
test('source deja en 9:16 : recadrage identite', () => {
  const r = cropRect(1080, 1920, 1080, 1920);
  assert(r.sx === 0 && r.sy === 0 && r.sw === 1080 && r.sh === 1920);
});
test('source horizontale : recadrage centre en largeur', () => {
  const r = cropRect(1920, 1080, 1080, 1920);
  assert(r.sw === 608 && r.sh === 1080, 'largeur = 1080 * 9/16, arrondie au pair superieur');
  assert(r.sx === 656 && r.sy === 0, 'centre horizontalement');
});
test('source 3:4 : recadrage centre en largeur', () => {
  const r = cropRect(1440, 1920, 1080, 1920);
  assert(r.sw === 1080 && r.sx === 180);
});
test('toutes les dimensions sont paires', () => {
  for (const [w, h] of [[1081,1921],[999,1777],[1234,999]]) {
    const r = cropRect(w, h, 1080, 1920);
    assert(r.sw % 2 === 0 && r.sh % 2 === 0, `dimensions impaires pour ${w}x${h}`);
  }
});
```

*(Couvre le point 5 de Review Focus.)*

- [ ] **Step 2 : Lancer les tests dans Chrome**

Attendu : 4 échecs, `cropRect is not defined`.

- [ ] **Step 3 : Implémenter `cropRect` dans `src/core/crop.js`**

Logique pure. Recadrage centré conservant le rapport cible, dimensions arrondies au nombre pair supérieur, jamais au-delà des bornes de la source.

- [ ] **Step 4 : Lancer les tests**

Attendu : **4 passed, 0 failed**.

- [ ] **Step 5 : Déposer le muxeur et implémenter `roundTrip`**

```bash
curl -L -o vendor/mp4-muxer.js https://cdn.jsdelivr.net/npm/mp4-muxer@5.1.5/build/mp4-muxer.mjs
```

Chaîne : mp4box démuxe → `VideoDecoder` → `cropRect` appliqué à un `OffscreenCanvas` 1080×1920 → `VideoEncoder` (`avc1`, 60 img/s, débit cible 12 Mb/s) → `mp4-muxer`. **Un seul décodeur et un seul encodeur ouverts à la fois ; tous deux fermés dans un `finally`** *(point 4 de Review Focus)*. `onProgress` est appelé à chaque image *(anti-objectif 5)*. `peakBytes` relève `performance.memory.usedJSHeapSize` quand disponible.

- [ ] **Step 6 : Écrire le test de fermeture des ressources**

`BAD_FILE` est un `File` de quelques octets aléatoires nommé `casse.mp4` ; `_spy` est un tableau que `roundTrip` alimente avec `'decoder'` et `'encoder'` au moment où il les ferme.

```js
test('roundTrip ferme decodeur et encodeur meme en cas d echec', async () => {
  const closed = [];
  await roundTrip(BAD_FILE, {seconds:1, _spy:closed}).catch(() => {});
  assert(closed.includes('decoder') && closed.includes('encoder'),
         'les deux doivent etre fermes dans le finally');
});
```

- [ ] **Step 7 : Lancer les tests dans Chrome, puis mesurer sur l'iPhone**

Publier, choisir une vraie vidéo, lancer sur 5 s puis sur 20 s. Relever : **le mp4 produit est-il lisible dans un lecteur vidéo ?** ; `msDecode`, `msEncode`, `frames`, poids, `peakBytes`. Puis extrapoler à trois montages de 20 s — **c'est la réponse aux questions 2 et 5 du §9**, et l'arbitrage du risque 9.

- [ ] **Step 8 : Commit**

```bash
git add -A && git commit -m "feat: sonde B, aller-retour complet WebCodecs mesure"
```

---

## Task 4 : Sonde C — encodage audio AAC et muxage de la piste

Répond à la **question 4** du §9 (risque 2). Sans elle, le reel est muet.

**Files:**
- Create: `src/probe/audio.js`
- Create: `tests/audio-plan.test.js`
- Modify: `src/probe/roundtrip.js`, `index.html`

**Interfaces:**
- Consumes: `roundTrip` (tâche 3).
- Produces : `loadAudio(file, ctx) -> Promise<AudioBuffer>` (rejette avec un message nommant le fichier) ; `audioExcerpt(buffer, startSec, durSec, fadeOutSec) -> AudioBuffer` ; `encodeAac(audioBuffer, onProgress) -> Promise<{chunks, config}>`.

- [ ] **Step 1 : Écrire les tests de `audioExcerpt`**

La spec §5.4 bis fixe **entrée franche, sortie en fondu d'environ 0,4 s**.

Trois aides de fixture à écrire en tête du fichier de test, car les assertions en dépendent :
`constant(sec, sampleRate, v)` renvoie un `AudioBuffer` mono rempli de `v` ;
`ramp(sec, sampleRate)` un `AudioBuffer` dont l'échantillon `i` vaut `i / sampleRate` ;
`valueAt(t)` la valeur attendue de `ramp` à l'instant `t`, soit `t`.

```js
test('l extrait commence net, sans fondu d entree', () => {
  const out = audioExcerpt(ramp(10, 48000), 2, 4, 0.4);
  assert(Math.abs(out.getChannelData(0)[0] - valueAt(2.0)) < 1e-6,
         'le premier echantillon vaut exactement celui de la source');
});
test('l extrait se termine par un fondu descendant', () => {
  const d = audioExcerpt(constant(10, 48000, 1.0), 2, 4, 0.4).getChannelData(0);
  assert(d[d.length - 1] < 0.01, 'dernier echantillon quasi nul');
  assert(Math.abs(d[d.length - 1 - Math.round(0.4 * 48000)] - 1.0) < 0.05,
         'le fondu ne commence pas avant 0,4 s de la fin');
});
test('un extrait plus long que la source est refuse explicitement', () => {
  let msg = '';
  try { audioExcerpt(constant(3, 48000, 1.0), 2, 4, 0.4); } catch (e) { msg = e.message; }
  assert(msg.length > 0, 'doit lever un message, pas renvoyer un buffer tronque en silence');
});
test('un fichier audio illisible donne un message nommant le fichier', async () => {
  const octets = new File([new Uint8Array([1, 2, 3])], 'achete.m4a');
  const err = await loadAudio(octets, new AudioContext()).then(() => null, e => e);
  assert(err !== null, 'un fichier non decodable doit rejeter');
  assert(err.message.includes('achete.m4a'),
         'le message doit nommer le fichier refuse, pas remonter l erreur brute du navigateur');
});
```

*(Le dernier test couvre le point 1 de Review Focus : fichier protégé ou corrompu.)*

- [ ] **Step 2 : Lancer les tests dans Chrome**

Attendu : 3 échecs, `audioExcerpt is not defined`.

- [ ] **Step 3 : Implémenter `audioExcerpt` dans `src/probe/audio.js`**

Logique pure sur `AudioBuffer`. Rampe linéaire descendante sur les `fadeOutSec` finales, aucun traitement à l'entrée.

- [ ] **Step 4 : Lancer les tests**

Attendu : **3 passed, 0 failed**.

- [ ] **Step 5 : Implémenter `encodeAac` et brancher la piste dans le muxeur**

`AudioEncoder` en `mp4a.40.2`, 48 kHz, stéréo, 128 kb/s. Si `AudioEncoder` est absent ou si `isConfigSupported` refuse, **remonter l'échec explicitement** — c'est précisément le risque 2, il ne doit pas être masqué.

- [ ] **Step 6 : Mesurer sur l'iPhone**

Publier, choisir une vidéo **et** un mp3, produire 20 s. Relever : l'AAC s'encode-t-il ? Le mp4 produit a-t-il **l'image et le son synchronisés** ? **C'est la réponse à la question 4 du §9.**

- [ ] **Step 7 : Commit**

```bash
git add -A && git commit -m "feat: sonde C, piste audio AAC muxee avec fondu de sortie"
```

---

## Task 5 : Sonde D — partage iOS vers la galerie

Répond à la **question 3** du §9 (risque 1). Si elle échoue hors bac à sable, la forme de l'app est à rediscuter.

**Files:**
- Create: `src/probe/share.js`
- Create: `tests/share.test.js`
- Modify: `index.html`

**Interfaces:**
- Consumes: le `blob` produit par `roundTrip` (tâche 3).
- Produces : `shareVideo(blob, filename) -> Promise<{ok, reason}>`.

- [ ] **Step 1 : Écrire les tests de `shareVideo`**

```js
test('un navigateur sans partage renvoie une raison lisible', async () => {
  const r = await shareVideo(new Blob(['x'],{type:'video/mp4'}), 'a.mp4', {canShare:null});
  assert(r.ok === false && r.reason.includes('partage'), 'raison explicite, pas une exception');
});
test('un refus de canShare est rapporte, pas tente quand meme', async () => {
  const r = await shareVideo(new Blob(['x'],{type:'video/mp4'}), 'a.mp4',
                             {canShare:() => false, share:() => { throw new Error('ne doit pas etre appele'); }});
  assert(r.ok === false);
});
test('une annulation par l utilisateur n est pas un echec technique', async () => {
  const err = new Error('cancel'); err.name = 'AbortError';
  const r = await shareVideo(new Blob(['x'],{type:'video/mp4'}), 'a.mp4',
                             {canShare:() => true, share:() => Promise.reject(err)});
  assert(r.ok === false && r.reason.includes('annul'), 'doit distinguer annulation et refus');
});
```

- [ ] **Step 2 : Lancer les tests dans Chrome**

Attendu : 3 échecs, `shareVideo is not defined`.

- [ ] **Step 3 : Implémenter `shareVideo(blob, filename, nav = navigator)`**

L'injection de `nav` est ce qui rend la fonction testable sans iPhone. Construire un `File`, vérifier `canShare({files})`, appeler `share`. Distinguer trois issues : partage absent, format refusé, annulation utilisateur.

- [ ] **Step 4 : Lancer les tests**

Attendu : **3 passed, 0 failed**.

- [ ] **Step 5 : Mesurer sur l'iPhone — l'étape décisive du plan**

Publier. Depuis l'app **installée sur l'écran d'accueil** (pas depuis Safari : le contexte diffère), produire un mp4 puis le partager. Relever : la feuille de partage s'ouvre-t-elle ? « Enregistrer la vidéo » est-il proposé ? **Le fichier arrive-t-il dans Photos et s'y lit-il ?**

- [ ] **Step 6 : Commit**

```bash
git add -A && git commit -m "feat: sonde D, partage iOS du mp4 produit"
```

---

## Task 6 : Relevé et verdict

**Files:**
- Create: `src/core/report.js`, `src/ui/report-view.js`
- Create: `tests/report.test.js`
- Create: `docs/superpowers/specs/2026-11-14-mesures-phase-0.md`
- Modify: `index.html`

**Interfaces:**
- Consumes: toutes les sondes. **`encodeMsPerReel` est le `msEncode` renvoyé par `roundTrip` (tâche 3) pour un montage de 20 s** ; le nom change parce que `buildReport` raisonne par reel, pas par appel.
- Produces : `buildReport(measurements) -> {rows, verdict}` où `measurements` est `{share:boolean, aac:boolean, roundTrip:boolean, encodeMsPerReel:number}` et `verdict` vaut `'go'`, `'repli'` ou `'bloque'`.

- [ ] **Step 1 : Écrire les tests de `buildReport`**

```js
test('tout vert donne un verdict go', () => {
  assert(buildReport({share:true, aac:true, roundTrip:true, encodeMsPerReel:9000}).verdict === 'go');
});
test('partage refuse bloque le projet', () => {
  assert(buildReport({share:false, aac:true, roundTrip:true}).verdict === 'bloque');
});
test('aller-retour casse bloque le projet', () => {
  assert(buildReport({share:true, aac:true, roundTrip:false}).verdict === 'bloque');
});
test('encodage trop lent declenche le repli, pas le blocage', () => {
  assert(buildReport({share:true, aac:true, roundTrip:true, encodeMsPerReel:180000}).verdict === 'repli');
});
```

Le seuil de repli vient du risque 9 : trois encodages de 20 s. Au-delà de **120 s cumulées**, appliquer le repli documenté au §5.5 (aperçus allégés, fichier final intact en 1080×1920 à 60 img/s).

- [ ] **Step 2 : Lancer les tests dans Chrome**

Attendu : 4 échecs.

- [ ] **Step 3 : Implémenter `buildReport` et `report-view.js`**

`share` ou `roundTrip` faux ⇒ `bloque`. Sinon `encodeMsPerReel * 3 > 120000` ⇒ `repli`. Sinon `go`.

- [ ] **Step 4 : Lancer les tests**

Attendu : **4 passed, 0 failed**.

- [ ] **Step 5 : Consigner les mesures réelles**

Écrire `docs/superpowers/specs/2026-11-14-mesures-phase-0.md` avec les cinq réponses du §9, les chiffres relevés sur l'iPhone, et le verdict. **Aucune valeur inventée : seulement ce qui a été lu à l'écran.**

- [ ] **Step 6 : Commit**

```bash
git add -A && git commit -m "docs: mesures de la phase 0 et verdict"
```

---

## Après ce plan

Le verdict décide de la suite, et il n'y a pas de plan au-delà tant qu'il n'est pas rendu :

- **`go`** → écrire le plan de phase 1 : moteur audio (grille des temps, sections, saut d'énergie), moteur vidéo (netteté, horizon, exposition, ressemblance), moteur de montage (logique C), interface.
- **`repli`** → même plan, avec les aperçus allégés du §5.5 ; le fichier final reste en 1080×1920 à 60 img/s.
- **`bloque`** → retour au brainstorming. La branche écartée au §4 (Mac capable + compte développeur, app native) redevient la seule voie, et c'est une décision qui coûte de l'argent à l'utilisateur.
