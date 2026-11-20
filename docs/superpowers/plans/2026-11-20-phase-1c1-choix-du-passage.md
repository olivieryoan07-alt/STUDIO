# Phase 1C-1 — l'écran de choix du passage musical : plan d'exécution

> **Pour les ouvriers agentiques :** SOUS-COMPÉTENCE REQUISE — utiliser
> `superpowers:executing-plans` (exécution native, choisie par l'utilisateur)
> pour réaliser ce plan tâche par tâche. Les étapes sont des cases à cocher.

**But :** livrer l'écran où l'utilisateur désigne les 7 à 12 secondes du
morceau sur lesquelles le reel sera monté — la seule décision du parcours.

**Architecture :** toute la logique de la fenêtre est pure et vit dans
`src/core/fenetre.js` : caler sur un temps, déplacer, décaler d'un temps,
corriger l'octave, convertir pixel ↔ seconde. L'écran n'est qu'un dessin et
des événements de pointeur par-dessus. La lecture avec clics réutilise le
module du banc d'écoute de la phase 1A plutôt que d'en refaire un.

**Pile :** JavaScript modules ES, sans build, sans dépendance. Canvas 2D,
Web Audio. Tests dans `tests/harness.js`, exécutés en ouvrant
`tests/index.html` dans Chrome.

**Spec :** `docs/superpowers/specs/2026-11-14-studio-design.md` — **§5.1 bis**
pour l'écran, **§5.4 bis** pour la longueur de la fenêtre, §2 pour
l'anti-objectif « zéro réglage ».

## Ce que ce plan ne fait pas

La phase 1C se découpe en **trois plans**, parce que ce sont trois
sous-systèmes qui se livrent et se jugent séparément :

| | |
|---|---|
| **1C-1 — celui-ci** | l'écran de choix du passage (§5.1 bis) |
| 1C-2 | le moteur de montage (§5.4) : de la courbe d'énergie et des plages vidéo à une liste de plans |
| 1C-3 | le rendu et l'app (§5.5, §5.1) : trois encodages, la lecture, le partage, le parcours assemblé |

Ce plan-ci livre une page autonome, `choix.html`, qui **est** l'écran
définitif — elle sera déposée dans l'app en 1C-3, pas réécrite.

## Contraintes globales

- **Aucune dépendance nouvelle, aucune étape de construction.** Le Mac n'a ni
  Node ni npm. Modules ES servis en statique.
- **Aucun réglage de montage exposé** (anti-objectif 1). Les seules commandes
  de l'écran portent sur *où* est la fenêtre et sur la correction d'une mesure
  ratée — jamais sur la durée, la densité des coupes ou l'ordre des plans.
- **La longueur de la fenêtre est imposée par l'app** (§5.4 bis) : 24 temps au
  tempo détecté, bornée à **7–12 s** (`MIN_SEC` / `MAX_SEC` de
  `src/core/excerpt.js`). Elle ne se règle pas.
- **Le début de la fenêtre tombe toujours sur un temps** (§5.4 bis) : la
  première coupe du montage est sur le rythme par construction.
- **Commentaires et noms en français.** Pas d'accents dans les messages de
  commit.
- `window.STUDIO_VERSION` et `VERSION` de `sw.js` incrémentés ensemble à la
  publication, et toute page nouvelle ajoutée au pré-cache de `sw.js`.

## Review Focus

Classes d'entrée que la spec implique, qu'aucune tâche n'exercerait
spontanément, et qui casseraient l'écran chez l'utilisateur :

1. **Morceau plus court que la fenêtre** — le §5.1 bis exige que l'app
   « le refuse et le dise ». Le refus lui-même est déjà couvert par
   `tests/excerpt.test.js` (« un morceau plus court que l'extrait est refusé
   en nommant les durées ») ; ce qui ne l'est pas, c'est que **l'écran
   l'attrape et reste utilisable** au lieu de laisser passer l'exception.
   *(Tâche 5, étape 3)*
2. **Fenêtre poussée contre un bord** — glisser au-delà du début ou de la
   fin. Attendu : elle s'arrête au dernier temps qui la laisse entière dans
   le morceau, et reste **calée sur un temps**. *(Tâche 1)*
3. **`½×` sur un morceau lent, `2×` sur un morceau rapide** — la longueur de
   la fenêtre change avec le tempo (§5.4 bis). Attendu : elle reste dans
   7–12 s, et si l'octave rend l'extrait impossible, l'écran le dit et garde
   l'octave précédente. *(Tâche 2)*
4. **Tempo non détecté** (`beatSec` nul ou non fini, morceau sans percussion
   nette). Attendu : aucune division par zéro, aucune boucle infinie de
   calage. *(Tâche 1)*
5. **Décalage d'un temps contre le bord** — `1 temps ▶` alors que la fenêtre
   touche déjà la fin. Attendu : elle ne bouge pas, ne rétrécit pas, ne sort
   pas. *(Tâche 2)*

---

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `src/core/excerpt.js` *(modifié)* | expose `nombreDeTemps()`, extrait de `anchorExcerpt` |
| `src/core/fenetre.js` | toute la logique de la fenêtre : calage, déplacement, octave, pixel ↔ seconde |
| `src/app/piste-view.js` | dessin de la piste entière et de la fenêtre |
| `src/bench/click-track.js` *(modifié)* | options `clics`, `boucle`, `tonCulminant` ; `tempsDesClics()` rendu pur et testable |
| `choix.html` | l'écran |

`src/app/` est nouveau, et c'est délibéré : `src/core` est le calcul pur,
`src/probe` ce qui ne tourne que sur l'appareil, `src/bench` les instruments
de mesure. L'interface de l'app est une quatrième chose.

---

## Task 1: la fenêtre se cale, se place et reste dans le morceau

**Fichiers :**
- Modifier : `src/core/excerpt.js` (extraire le calcul du nombre de temps)
- Créer : `src/core/fenetre.js`, `tests/fenetre.test.js`
- Modifier : `tests/index.html`

**Interfaces :**
- Consomme : `MIN_SEC`, `MAX_SEC` de `src/core/excerpt.js` ; une `grid`
  `{ beatSec, offsetSec, beats }` telle que `beatGrid()` la rend.
- Produit dans `src/core/excerpt.js` :
  `nombreDeTemps(grid, durationSec) -> number` — le nombre de temps de la
  fenêtre, soit 24 ramenés dans la fourchette 7–12 s et dans le morceau.
  Lève les deux erreurs déjà testées de `anchorExcerpt` quand c'est
  impossible. `anchorExcerpt` l'appelle désormais au lieu de recalculer.
- Produit dans `src/core/fenetre.js` :
  - `calerSurTemps(sec, grid) -> number` — le temps le plus proche de la
    grille.
  - `placer(startSec, { durationSec, grid, durSec }) -> number` — cale sur un
    temps **puis** ramène dans le morceau en restant sur un temps.

**La règle de bord, et c'est la décision de cette tâche.** Quand le calage
sort la fenêtre du morceau, on ne la pince pas à `0` ou à
`durationSec - durSec` : on prend le **temps le plus proche qui laisse la
fenêtre entière dedans** — le premier temps ≥ 0 au début, le dernier temps
≤ `durationSec - durSec` à la fin. Rester sur un temps prime, parce que le
§5.4 bis en fait la condition de la première coupe.

- [ ] **Step 1: écrire les tests qui échouent** dans `tests/fenetre.test.js`

```js
const grille = (bpm, offset = 0) => ({ beatSec: 60 / bpm, offsetSec: offset, beats: [] });

test('caler prend le temps le plus proche', () => {
  const g = grille(120, 0.1);                 // un temps toutes les 0,5 s
  assert(Math.abs(calerSurTemps(1.7, g) - 1.6) < 1e-9, '' + calerSurTemps(1.7, g));
  assert(Math.abs(calerSurTemps(1.9, g) - 2.1) < 1e-9, '' + calerSurTemps(1.9, g));
});

test('placer cale la fenetre sur un temps', () => {
  const g = grille(120, 0.1);
  const s = placer(5.3, { durationSec: 60, grid: g, durSec: 10 });
  assert(Math.abs((s - g.offsetSec) % g.beatSec) < 1e-9, 'pas sur un temps : ' + s);
});

// Review Focus 2
test('contre le debut, la fenetre reste entiere ET sur un temps', () => {
  const g = grille(120, 0.3);
  const s = placer(-5, { durationSec: 60, grid: g, durSec: 10 });
  assert(s >= 0, 'sort par le debut : ' + s);
  assert(Math.abs((s - g.offsetSec) % g.beatSec) < 1e-9, 'pas sur un temps : ' + s);
  assert(s < g.offsetSec + g.beatSec, 'pas le premier temps utile : ' + s);
});

test('contre la fin, la fenetre reste entiere ET sur un temps', () => {
  const g = grille(120, 0.3);
  const s = placer(999, { durationSec: 60, grid: g, durSec: 10 });
  assert(s + 10 <= 60 + 1e-9, 'deborde : ' + (s + 10));
  assert(Math.abs((s - g.offsetSec) % g.beatSec) < 1e-9, 'pas sur un temps : ' + s);
  assert(s + 10 > 49.5, 'trop loin du bord : ' + s);
});

// Review Focus 4
test('un tempo non detecte ne fait ni division par zero ni boucle', () => {
  for (const mauvais of [0, NaN, Infinity, -1]) {
    const s = placer(5, { durationSec: 60, grid: { beatSec: mauvais, offsetSec: 0, beats: [] }, durSec: 10 });
    assert(Number.isFinite(s) && s >= 0 && s + 10 <= 60, mauvais + ' -> ' + s);
  }
});

test('le nombre de temps vaut 24 aux tempos courants', () => {
  for (const bpm of [120, 140, 150, 180]) {
    assert(nombreDeTemps(grille(bpm), 300) === 24, bpm + ' BPM');
  }
});
```

- [ ] **Step 2: lancer la suite et vérifier l'échec**

Ouvrir `http://localhost:8777/tests/index.html` dans Chrome (serveur par
`.claude/launch.json`). Attendu : « chargement impossible : Failed to fetch
dynamically imported module … /tests/fenetre.test.js » — un module ES absent
fait échouer l'import avant toute exécution, c'est le bon ROUGE.

- [ ] **Step 3: extraire `nombreDeTemps(grid, durationSec)` de `anchorExcerpt`**

Déplacer le bloc `minBeats` / `maxBeats` / `maxByDuration` / `beatCount` et
les deux `throw` tels quels. `anchorExcerpt` appelle la nouvelle fonction.
Aucun changement de comportement.

- [ ] **Step 4: relancer la suite** — attendu : **aucune régression** sur les
  tests de `excerpt.test.js`, qui couvrent déjà les deux refus.

- [ ] **Step 5: implémenter `calerSurTemps` et `placer` dans `src/core/fenetre.js`**

Un `beatSec` non fini ou ≤ 0 fait rendre la position pincée sans calage —
c'est le seul cas où l'on renonce au temps, et il faut y renoncer plutôt que
boucler.

- [ ] **Step 6: ajouter `await import('./fenetre.test.js');` à `tests/index.html` et relancer**

Attendu : 6 tests de plus au vert, le total de la phase 1B inchangé.

- [ ] **Step 7: commit**

```bash
git add src/core/excerpt.js src/core/fenetre.js tests/fenetre.test.js tests/index.html
git commit -m "feat: calage de la fenetre sur la grille des temps"
```

---

## Task 2: décaler d'un temps, corriger l'octave

**Fichiers :**
- Modifier : `src/core/fenetre.js`, `tests/fenetre.test.js`

**Interfaces :**
- Consomme : `placer`, `calerSurTemps` (tâche 1), `nombreDeTemps`.
- Produit :
  - `fenetreInitiale({ durationSec, grid, climaxSec }) -> { startSec, durSec, beatCount }`
    — la position d'ouverture du §5.1 bis, déléguée à `anchorExcerpt`, dont
    on **laisse tomber le champ `burstBeatIndex`** : depuis la révision du
    §5.4, la rafale n'est plus posée par la mise en page mais déduite de
    l'énergie de l'extrait, et c'est l'affaire du plan 1C-2.
  - `decalerDeTemps(fenetre, n, { durationSec, grid }) -> fenetre` — déplace
    de `n` temps (négatif vers la gauche) sans jamais sortir ni rétrécir.
  - `changerOctave(grid, facteur) -> grid` — `facteur` vaut `2` ou `0.5` ;
    rend une grille de même phase et de `beatSec` divisé par `facteur`.
  - `redimensionner(fenetre, { durationSec, grid }) -> fenetre` — recalcule
    `durSec` et `beatCount` pour la nouvelle grille, garde `startSec` au plus
    près, lève si la nouvelle octave rend l'extrait impossible.

- [ ] **Step 1: écrire les tests qui échouent**

```js
test('un decalage d un temps deplace d exactement un temps', () => {
  const g = grille(120, 0);
  const f = { startSec: 20, durSec: 10, beatCount: 20 };
  assert(Math.abs(decalerDeTemps(f, 1, { durationSec: 60, grid: g }).startSec - 20.5) < 1e-9);
  assert(Math.abs(decalerDeTemps(f, -1, { durationSec: 60, grid: g }).startSec - 19.5) < 1e-9);
});

// Review Focus 5
test('contre la fin, un decalage de plus ne bouge ni ne retrecit la fenetre', () => {
  const g = grille(120, 0);
  const f = { startSec: 50, durSec: 10, beatCount: 20 };
  const r = decalerDeTemps(f, 1, { durationSec: 60, grid: g });
  assert(r.startSec === 50, 'a bouge : ' + r.startSec);
  assert(r.durSec === 10, 'a retreci : ' + r.durSec);
});

test('doubler le tempo double le nombre de temps et garde la phase', () => {
  const g = changerOctave(grille(70, 0.3), 2);
  assert(Math.abs(g.beatSec - 60 / 140) < 1e-9, 'beatSec ' + g.beatSec);
  assert(g.offsetSec === 0.3, 'phase perdue');
});

// Review Focus 3
test('apres un changement d octave la fenetre reste dans 7-12 s', () => {
  for (const [bpm, facteur] of [[70, 2], [280, 0.5], [140, 2], [140, 0.5]]) {
    const g = changerOctave(grille(bpm), facteur);
    const f = redimensionner({ startSec: 30, durSec: 10, beatCount: 24 },
                             { durationSec: 300, grid: g });
    assert(f.durSec >= 7 - 1e-6 && f.durSec <= 12 + 1e-6,
           bpm + ' x' + facteur + ' -> ' + f.durSec.toFixed(2) + ' s');
  }
});

test('une octave impossible est refusee en nommant la duree', () => {
  let msg = '';
  // 8 s de morceau, tempo divise par deux : plus moyen d'en tirer 7 s entieres
  try { redimensionner({ startSec: 0, durSec: 7, beatCount: 24 },
                       { durationSec: 8, grid: changerOctave(grille(40), 0.5) }); }
  catch (e) { msg = e.message; }
  assert(msg.includes('8') && msg.includes('7'), 'message : ' + msg);
});
```

- [ ] **Step 2: lancer et vérifier l'échec** — attendu : 5 échecs,
  « decalerDeTemps is not defined » ou équivalent.

- [ ] **Step 3: implémenter les quatre fonctions dans `src/core/fenetre.js`**

`redimensionner` laisse remonter telles quelles les erreurs de
`nombreDeTemps` : l'appelant les affiche, et c'est lui qui décide de garder
l'octave précédente (tâche 5).

- [ ] **Step 4: relancer** — attendu : 5 de plus au vert.

- [ ] **Step 5: commit**

```bash
git add src/core/fenetre.js tests/fenetre.test.js
git commit -m "feat: decalage au temps et correction d octave"
```

---

## Task 3: la piste et son dessin

**Fichiers :**
- Modifier : `src/core/fenetre.js`, `tests/fenetre.test.js`
- Créer : `src/app/piste-view.js`

**Interfaces :**
- Produit dans `src/core/fenetre.js` :
  `tempsPourX(x, largeur, durationSec) -> number` et
  `xPourTemps(t, largeur, durationSec) -> number`, réciproques, bornées à
  `[0, durationSec]` et `[0, largeur]`.
- Produit dans `src/app/piste-view.js` :
  `dessinerPiste(canvas, { env, rate, offsetSec, durationSec, fenetre })`.

**Ce que le dessin montre**, et rien de plus : l'enveloppe d'énergie du
morceau entier sur toute la largeur, la fenêtre en ambre par-dessus, ses deux
bords marqués. Le canevas se dimensionne sur `clientWidth` à la densité de
l'écran — même recette que `src/bench/clip-view.js`, pour la même raison :
une largeur fixe ramenée à 343 px sur un téléphone rend le dessin illisible.

- [ ] **Step 1: écrire les tests qui échouent**

```js
test('pixel et seconde sont reciproques', () => {
  for (const t of [0, 12.5, 143.2, 300]) {
    assert(Math.abs(tempsPourX(xPourTemps(t, 343, 300), 343, 300) - t) < 1e-6, '' + t);
  }
});

test('hors du canevas, le temps reste dans le morceau', () => {
  assert(tempsPourX(-50, 343, 300) === 0);
  assert(tempsPourX(9999, 343, 300) === 300);
});
```

- [ ] **Step 2: lancer et vérifier l'échec** — attendu : 2 échecs.

- [ ] **Step 3: implémenter les deux fonctions, relancer** — attendu : 2 de plus au vert.

- [ ] **Step 4: écrire `src/app/piste-view.js`**

Pas de test automatisé : c'est du dessin, vérifié à la tâche 5.

- [ ] **Step 5: commit**

```bash
git add src/core/fenetre.js tests/fenetre.test.js src/app/piste-view.js
git commit -m "feat: conversion pixel-seconde et dessin de la piste"
```

---

## Task 4: la lecture en boucle, avec ou sans clics

**Fichiers :**
- Modifier : `src/bench/click-track.js`, `tests/click-track.test.js` *(créer si absent)*
- Modifier : `tests/index.html`

**Interfaces :**
- Produit : `tempsDesClics(grid, fromSec, toSec) -> number[]` — les instants
  des temps compris dans `[fromSec, toSec[`, exporté et pur.
- Produit : `createBench(ctx)` dont `play()` accepte un cinquième argument
  d'options `{ clics = true, boucle = false, tonCulminant = true }`.
  Les appels existants de `bench.html` gardent leur comportement.

**Pourquoi étendre plutôt que dupliquer :** la programmation des clics par
tranches de 5 s et le fondu de sortie de 0,4 s ont été écrits en phase 1A
contre deux défauts mesurés — des clics programmés dans le passé, et un
claquement en fin d'extrait. Un second module les réapprendrait.

- [ ] **Step 1: écrire les tests qui échouent**

```js
test('les clics tombent sur les temps de l intervalle', () => {
  const g = { beatSec: 0.5, offsetSec: 0.1, beats: [] };
  const t = tempsDesClics(g, 1, 3);
  assert(t.length === 4, 'clics ' + t.length);
  assert(Math.abs(t[0] - 1.1) < 1e-9, 'premier ' + t[0]);
  assert(t[t.length - 1] < 3, 'depasse la fin : ' + t[t.length - 1]);
});

test('un intervalle vide ne donne aucun clic', () => {
  assert(tempsDesClics({ beatSec: 0.5, offsetSec: 0, beats: [] }, 5, 5).length === 0);
});

test('un tempo non detecte ne donne aucun clic plutot qu une boucle infinie', () => {
  assert(tempsDesClics({ beatSec: 0, offsetSec: 0, beats: [] }, 0, 10).length === 0);
});
```

- [ ] **Step 2: lancer et vérifier l'échec** — attendu : 3 échecs.

- [ ] **Step 3: extraire `tempsDesClics` de la boucle de programmation existante et l'exporter**, puis relancer — attendu : 3 de plus au vert, et `bench.html` inchangé.

- [ ] **Step 4: ajouter les options `{ clics, boucle, tonCulminant }` à `play()`**

`boucle` replanifie la lecture à la fin de l'extrait plutôt que de s'arrêter.
`clics: false` joue la musique nue. `tonCulminant: false` n'émet pas le son
grave — l'écran de choix n'affiche aucun point culminant.

- [ ] **Step 5: relancer toute la suite** — attendu : aucune régression.

- [ ] **Step 6: commit**

```bash
git add src/bench/click-track.js tests/click-track.test.js tests/index.html
git commit -m "feat: lecture en boucle, clics et ton culminant optionnels"
```

---

## Task 5: l'écran

**Fichiers :**
- Créer : `choix.html`
- Modifier : `sw.js` (pré-cache : `./choix.html`, `./src/core/fenetre.js`,
  `./src/app/piste-view.js`), `index.html` (lien vers l'écran)

**Interfaces :**
- Consomme : `analyseTrack` (`src/probe/analyse-track.js`), tout
  `src/core/fenetre.js`, `dessinerPiste`, `createBench`, `mmss`.

**Ce que l'écran porte**, et rien de plus (§5.1 bis) :

1. le choix du fichier, puis l'analyse avec sa progression ;
2. **la piste entière** avec la fenêtre, déplaçable au doigt ; au relâché elle
   se cale sur un temps et la lecture repart en boucle depuis son début ;
3. **`◀ 1 temps`** et **`1 temps ▶`** ;
4. **`½×` / `2×`**, et un interrupteur de **clic** ;
5. le début, la fin et la durée de la fenêtre, plus le tempo retenu ;
6. un bouton **« Garder ce passage »** qui écrit le choix dans
   `sessionStorage` sous la clé `studio.passage`
   (`{ startSec, durSec, beatCount, bpm, offsetSec }`) et le montre à l'écran.
   C'est ce que 1C-3 viendra lire ; aucune autre page ne l'écrit.

**Ce que l'écran n'affiche pas :** l'indice de confiance du tempo (§5.1 bis).

**Pointeurs :** `pointerdown` / `pointermove` / `pointerup` avec
`setPointerCapture`, et `touch-action: none` sur le canevas — sans quoi le
geste fait défiler la page sur l'iPhone au lieu de déplacer la fenêtre.

- [ ] **Step 1: écrire `choix.html`**

Reprendre les variables CSS et la grammaire de cartes de `bench-video.html`.

- [ ] **Step 2: vérifier dans Chrome sur le Mac**

Lancer le serveur, ouvrir `http://localhost:8777/choix.html`, y déposer un
mp3. Attendu : la piste se dessine, la fenêtre se déplace à la souris, les
boutons la décalent d'un temps, `½×` / `2×` changent la durée affichée, la
lecture tourne en boucle, aucune erreur dans la console.

- [ ] **Step 3: vérifier le refus d'un morceau trop court** *(Review Focus 1)*

Charger un fichier audio de moins de 7 s. Attendu : un message nommant la
durée du morceau **et** le minimum, l'écran reste utilisable, aucune
exception non rattrapée dans la console.

- [ ] **Step 4: relancer toute la suite de tests** — attendu : aucune régression.

- [ ] **Step 5: porter `window.STUDIO_VERSION` et `VERSION` de `sw.js` à `0.26.0`, puis commit et publication**

```bash
git add choix.html sw.js index.html bench.html bench-video.html
git commit -m "feat: ecran de choix du passage musical"
git push
```

- [ ] **Step 6: vérifier sur l'iPhone**

Ouvrir `https://olivieryoan07-alt.github.io/STUDIO/choix.html`, vérifier la
version `v0.26.0`, charger un vrai morceau, et juger les trois questions
ci-dessous.

---

## Après ce plan : la séance de jugement

L'écran livré, trois questions à l'utilisateur — ce sont elles qui diront si
l'approche A tient, ou s'il faut lui ajouter la piste zoomée de l'approche B
(§5.1 bis, « la décision à surveiller ») :

1. Trouves-tu ton passage **du premier coup**, rien qu'en regardant la piste ?
2. Les deux boutons suffisent-ils au réglage fin, ou le doigt te manque-t-il ?
3. La durée imposée te convient-elle sur un vrai morceau ?

Si la réponse 2 est non, la piste zoomée s'ajoute **par-dessus** cet écran
sans rien réécrire — c'est ce que l'architecture de ce plan préserve.
