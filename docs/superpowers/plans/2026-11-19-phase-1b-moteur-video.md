# Phase 1B — moteur d'analyse vidéo : plan d'exécution

> **Pour les ouvriers agentiques :** SOUS-COMPÉTENCE REQUISE — utiliser
> `superpowers:executing-plans` (exécution native, choisie par l'utilisateur)
> pour réaliser ce plan tâche par tâche. Les étapes sont des cases à cocher.

**But :** transformer un clip de l'iPhone en une **liste de plages exploitables
notées**, et livrer le banc visuel qui permet de régler les seuils sur
l'appareil.

**Architecture :** quatre critères purs (netteté, horizon, exposition,
empreinte) mesurés sur une image grise de 192 px de large, redressée par le
plan de dessin existant. Un module de décodage isole WebCodecs du calcul, pour
que tout le calcul se teste dans Chrome sur le Mac sans aucun fichier vidéo.
Les seuils vivent dans **un seul bloc nommé** : le réglage se fait sur l'iPhone
par allers-retours, donc chacun doit coûter une ligne.

**Pile :** JavaScript modules ES, sans build, sans dépendance. `mp4box.js`
0.5.2 (déjà embarqué), WebCodecs, canvas 2D. Tests dans le micro-harnais
`tests/harness.js`, exécutés en ouvrant `tests/index.html` dans Chrome.

**Spec :** `docs/superpowers/specs/2026-11-14-studio-design.md` (révisée le
2026-11-19) — §5.2 pour les critères, §8 pour ce qui est laissé à l'ouvrier,
§9 pour l'ordre et les réserves.

## Contraintes globales

- **Aucune dépendance nouvelle, aucune étape de construction.** Le Mac n'a ni
  Node ni npm. Modules ES servis en statique.
- **Aucun critère fondé sur la quantité de mouvement** (§5.2) — proscrit
  explicitement : l'utilisateur filme en marchant, tout bouge en permanence et
  les pics de mouvement sont souvent les pires images.
- **La rotation de piste est appliquée avant toute mesure** (§5.2). Elle vaut
  90° sur la matière mesurée. Utiliser `drawPlan()` de
  `src/core/draw-plan.js`, qui la gère déjà.
- **Cadence d'analyse : 20 images par seconde** (§5.2), pas toutes les images.
- **Jeter la première et la dernière seconde** de chaque clip (§5.2).
- **Tout seuil chiffré est une constante nommée du bloc `THRESHOLDS`** de
  `src/core/frame-score.js`. Aucun nombre magique ailleurs.
- **Tout callback de codec WebCodecs porte un `try/catch`**, et **chaque étape
  a son propre compteur** (§ « Deux règles d'ingénierie imposées par la phase
  0 »). Les deux pannes de la phase 0 étaient invisibles faute de cela.
- **Commentaires et noms en français**, comme le reste du dépôt. Pas
  d'accents dans les messages de commit.
- Chaque tâche finit par `window.STUDIO_VERSION` incrémenté dans
  `bench-video.html` quand elle y touche.

## Deux décisions déjà prises

**Pas de substitut de décodage pour la boucle Mac**, contrairement au §8. Sa
justification était le HEVC, que le Broadwell de 2015 décoderait en logiciel —
or la phase 0 a mesuré que le sélecteur Photos remet du **H.264**, et
l'utilisateur a choisi de régler les seuils **sur l'iPhone** (2026-11-19). La
boucle Mac n'a donc ni besoin de vrais clips ni besoin d'un faux décodeur :
elle teste du calcul pur sur des images synthétiques. `decode-frames.js` reste
néanmoins un module isolé — c'est la frontière qui compte, pas le substitut.
*Si cette décision est fausse*, le coût est un module de plus à écrire le jour
où l'on voudrait rejouer un clip réel sur le Mac.

**`bench-video.html` est une page séparée de `bench.html`.** L'une juge le son,
l'autre l'image ; les fusionner donnerait un écran que personne ne lit.
*Si c'est faux*, le coût est une fusion ultérieure de deux pages de banc.

## Ce que ce plan ne fait pas

Le **réglage des seuils** n'est pas une tâche de ce plan. Les valeurs de départ
ci-dessous sont des suppositions assumées ; elles se règlent après, en séance
de validation sur l'iPhone, comme la phase 1A. Le livrable de ce plan est
**l'instrument**, pas le réglage.

## Review Focus

Classes d'entrée que la spec implique, qu'aucune tâche n'exercerait
spontanément, et qui casseraient l'app chez l'utilisateur :

1. **Clip de moins de 2 s** — la règle « jeter la première et la dernière
   seconde » ne laisse rien. Attendu : zéro plage, un motif nommé, aucune
   exception. *(Tâche 6)*
2. **Clip entièrement rejeté** — vingt secondes de marche floue. Attendu :
   liste vide et motif dominant, pas une plage de secours inventée. *(Tâche 6)*
3. **Clip uniformément noir ou uniformément blanc** — la note de plage est
   normalisée par la netteté maximale du clip, qui vaut alors 0. Attendu :
   aucune division par zéro, note 0. *(Tâche 6)*
4. **Clip sans boîte `colr`** — `inspectFile` renvoie `colourKnown: false`. Les
   seuils d'exposition supposent le SDR (§9). Attendu : le banc affiche
   « colorimétrie non lue » au lieu de laisser croire à une mesure. *(Tâche 9)*
5. **Rotation autre que 90°** — 0°, 180°, 270°. Attendu : l'image analysée est
   redressée dans tous les cas, et les mesures portent sur l'image redressée.
   *(Tâche 7)*

---

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `tests/fixtures-image.js` | images grises synthétiques déterministes |
| `src/core/laplacian.js` | netteté = variance du laplacien |
| `src/core/horizon.js` | inclinaison de l'horizon par orientation des contours |
| `src/core/exposition.js` | part de pixels cramés et bouchés |
| `src/core/empreinte.js` | empreinte d'image réduite et distance |
| `src/core/frame-score.js` | **le bloc `THRESHOLDS`** + verdict d'une image |
| `src/core/ranges.js` | groupement des images retenues en plages notées |
| `src/probe/demux.js` | démuxage mp4box, **extrait de `roundtrip.js`** |
| `src/probe/decode-frames.js` | décodage → image grise 192 px redressée |
| `src/probe/analyse-clip.js` | enchaînement complet + statistiques |
| `src/bench/clip-view.js` | dessin des courbes, des seuils et des plages |
| `bench-video.html` | le banc visuel, page à part de `bench.html` |

---

## Task 1: fixtures d'image et netteté

**Fichiers :**
- Créer : `tests/fixtures-image.js`, `src/core/laplacian.js`
- Créer : `tests/laplacian.test.js`
- Modifier : `tests/index.html` (ajouter l'import du test)

**Interfaces :**
- Produit : `grayImage(w, h, fn) -> Uint8ClampedArray` où `fn(x, y) -> 0..255` ;
  `damier(w, h, pas) -> Uint8ClampedArray` ; `flou(gray, w, h, rayon) -> Uint8ClampedArray`
  (moyenne glissante séparable) ; `aplat(w, h, valeur) -> Uint8ClampedArray` ;
  `horizonIncline(w, h, degres) -> Uint8ClampedArray` (moitié haute claire à
  200, moitié basse sombre à 40, frontière inclinée) ;
  `bruit(w, h, graine) -> Uint8ClampedArray` (PRNG à graine, même recette que
  `tests/fixtures-audio.js`).
- Produit : `sharpness(gray, w, h) -> number` — variance du laplacien 4-voisins,
  bords exclus.

- [ ] **Étape 1 : écrire les tests qui échouent** dans `tests/laplacian.test.js`

```js
test('un damier net est plus net que le meme damier flou', () => {
  const g = damier(64, 64, 8);
  assert(sharpness(g, 64, 64) > sharpness(flou(g, 64, 64, 3), 64, 64) * 4);
});

test('un aplat n a aucune nettete', () => {
  assert(sharpness(aplat(64, 64, 128), 64, 64) < 1e-9);
});

test('la nettete ne depend pas de la luminosite moyenne', () => {
  const clair = grayImage(64, 64, (x) => (x % 8 < 4 ? 200 : 160));
  const sombre = grayImage(64, 64, (x) => (x % 8 < 4 ? 80 : 40));
  const r = sharpness(clair, 64, 64) / sharpness(sombre, 64, 64);
  assert(r > 0.98 && r < 1.02, 'rapport ' + r);
});
```

- [ ] **Étape 2 : lancer les tests et vérifier qu'ils échouent**

Ouvrir `http://localhost:8777/tests/index.html` dans Chrome (lancer le serveur
par `.claude/launch.json`). Attendu : 3 échecs, « sharpness is not defined ».

- [ ] **Étape 3 : écrire `tests/fixtures-image.js`**

Déterministe : le PRNG à graine de `tests/fixtures-audio.js` a été introduit
parce qu'un `Math.random()` rendait un test instable une fois sur trois. Même
règle ici.

- [ ] **Étape 4 : implémenter `sharpness(gray, w, h) -> number` dans `src/core/laplacian.js`**

Laplacien 4-voisins (`4*c - h - b - g - d`) sur l'intérieur de l'image, puis
variance de la réponse. Les bords sont exclus du calcul **et** du dénominateur.

- [ ] **Étape 5 : ajouter `await import('./laplacian.test.js');` à `tests/index.html`, relancer**

Attendu : 3 passent, 0 échoue, et les 86 tests de la phase 1A passent toujours.

- [ ] **Étape 6 : commit**

```bash
git add tests/fixtures-image.js tests/laplacian.test.js tests/index.html src/core/laplacian.js
git commit -m "feat: nettete par variance du laplacien"
```

---

## Task 2: inclinaison de l'horizon

**Fichiers :**
- Créer : `src/core/horizon.js`, `tests/horizon.test.js`
- Modifier : `tests/index.html`

**Interfaces :**
- Consomme : les fixtures de la tâche 1.
- Produit : `tilt(gray, w, h) -> { angleDeg, strength }`.
  `angleDeg` est l'écart signé à l'horizontale de l'orientation dominante des
  contours, dans `]-45, 45]`. `strength` est la part de l'énergie de gradient
  tombée dans la classe dominante, dans `[0, 1]`.

**Pourquoi `strength` existe :** sans elle, une image sans aucun contour franc
(brouillard, mur) renverrait un angle tiré du bruit, et ferait rejeter une
image parfaitement bonne. En dessous du seuil, l'horizon n'est **pas** un motif
de rejet (tâche 5).

- [ ] **Étape 1 : écrire les tests qui échouent** dans `tests/horizon.test.js`

```js
test('un horizon droit donne un angle nul', () => {
  const t = tilt(horizonIncline(96, 96, 0), 96, 96);
  assert(Math.abs(t.angleDeg) < 2, 'angle ' + t.angleDeg);
  assert(t.strength > 0.3, 'force ' + t.strength);
});

test('un horizon a 15 degres est mesure a 15 degres', () => {
  const t = tilt(horizonIncline(96, 96, 15), 96, 96);
  assert(Math.abs(t.angleDeg - 15) < 3, 'angle ' + t.angleDeg);
});

test('un horizon penche dans l autre sens change de signe', () => {
  assert(tilt(horizonIncline(96, 96, -15), 96, 96).angleDeg < -10);
});

test('une image sans contour n affirme aucun horizon', () => {
  assert(tilt(bruit(96, 96, 7), 96, 96).strength < 0.2);
});
```

- [ ] **Étape 2 : lancer et vérifier l'échec**

Attendu : 4 échecs, « tilt is not defined ».

- [ ] **Étape 3 : implémenter `tilt(gray, w, h)` dans `src/core/horizon.js`**

Sobel 3×3 → pour chaque pixel, magnitude et orientation du contour
(`atan2(gy, gx)`, ramenée dans `]-90, 90]` puis pivotée de 90° pour exprimer
l'orientation de la **ligne** et non du gradient). Histogramme de 90 classes
d'un degré sur `]-45, 45]`, pondéré par la magnitude ; les orientations hors de
cette plage (contours verticaux) ne votent pas. `angleDeg` = centre de la
classe dominante affiné par interpolation parabolique avec ses deux voisines ;
`strength` = poids de la classe dominante et de ses deux voisines, divisé par
le poids total **de toutes les orientations**, verticales comprises.

- [ ] **Étape 4 : ajouter l'import à `tests/index.html`, relancer** — attendu : 4 de plus au vert.

- [ ] **Étape 5 : commit**

```bash
git add src/core/horizon.js tests/horizon.test.js tests/index.html
git commit -m "feat: inclinaison de l horizon par orientation des contours"
```

---

## Task 3: exposition

**Fichiers :**
- Créer : `src/core/exposition.js`, `tests/exposition.test.js`
- Modifier : `tests/index.html`

**Interfaces :**
- Produit : `exposition(gray, niveauCrame, niveauBouche) -> { crame, bouche }`,
  deux fractions dans `[0, 1]`. Un pixel est cramé si `v >= niveauCrame`,
  bouché si `v <= niveauBouche`.

- [ ] **Étape 1 : écrire les tests qui échouent** dans `tests/exposition.test.js`

```js
test('un gris moyen n est ni crame ni bouche', () => {
  const e = exposition(aplat(40, 40, 128), 250, 8);
  assert(e.crame === 0 && e.bouche === 0);
});

test('la fraction cramee est exacte', () => {
  // une colonne sur quatre a 255
  const g = grayImage(40, 40, (x) => (x % 4 === 0 ? 255 : 100));
  assert(Math.abs(exposition(g, 250, 8).crame - 0.25) < 1e-9);
});

test('les seuils sont inclusifs', () => {
  assert(exposition(aplat(10, 10, 250), 250, 8).crame === 1);
  assert(exposition(aplat(10, 10, 8), 250, 8).bouche === 1);
});
```

- [ ] **Étape 2 : lancer et vérifier l'échec.**

- [ ] **Étape 3 : implémenter `exposition()` dans `src/core/exposition.js`.**

- [ ] **Étape 4 : ajouter l'import, relancer** — attendu : 3 de plus au vert.

- [ ] **Étape 5 : commit**

```bash
git add src/core/exposition.js tests/exposition.test.js tests/index.html
git commit -m "feat: mesure d exposition par pixels crames et bouches"
```

---

## Task 4: empreinte d'image et distance

**Fichiers :**
- Créer : `src/core/empreinte.js`, `tests/empreinte.test.js`
- Modifier : `tests/index.html`

**Interfaces :**
- Produit : `empreinte(gray, w, h) -> Uint8Array(8)` — dHash : l'image est
  réduite à 9×8 par moyenne de blocs, puis chaque bit dit si un pixel est plus
  clair que son voisin de droite. 64 bits.
- Produit : `distance(a, b) -> number` — distance de Hamming, `0..64`.

**Pourquoi dHash et pas une moyenne de blocs brute :** la comparaison porte
sur des **différences** entre voisins, donc elle survit à un changement de
luminosité ou d'exposition. Deux plans du même chemin à deux moments de la
journée doivent se ressembler ; c'est précisément ce que le critère cherche.

- [ ] **Étape 1 : écrire les tests qui échouent** dans `tests/empreinte.test.js`

```js
test('une image est identique a elle-meme', () => {
  const g = damier(64, 64, 7);
  assert(distance(empreinte(g, 64, 64), empreinte(g, 64, 64)) === 0);
});

test('l empreinte resiste a un changement de luminosite', () => {
  const g = damier(64, 64, 7);
  const clair = Uint8ClampedArray.from(g, (v) => Math.min(255, v + 40));
  assert(distance(empreinte(g, 64, 64), empreinte(clair, 64, 64)) <= 2);
});

test('deux scenes differentes sont loin l une de l autre', () => {
  const a = empreinte(damier(64, 64, 4), 64, 64);
  const b = empreinte(horizonIncline(64, 64, 0), 64, 64);
  assert(distance(a, b) > 12, 'distance ' + distance(a, b));
});

test('l empreinte fait toujours 8 octets', () => {
  assert(empreinte(aplat(31, 17, 100), 31, 17).length === 8);
});
```

- [ ] **Étape 2 : lancer et vérifier l'échec.**

- [ ] **Étape 3 : implémenter `empreinte()` et `distance()` dans `src/core/empreinte.js`.**

La réduction à 9×8 se fait par moyenne des pixels de chaque bloc, pas par
échantillonnage : une image de marche est bruitée, et échantillonner y lirait
du bruit.

- [ ] **Étape 4 : ajouter l'import, relancer** — attendu : 4 de plus au vert.

- [ ] **Étape 5 : commit**

```bash
git add src/core/empreinte.js tests/empreinte.test.js tests/index.html
git commit -m "feat: empreinte d image reduite et distance de Hamming"
```

---

## Task 5: verdict d'une image et le bloc des seuils

**Fichiers :**
- Créer : `src/core/frame-score.js`, `tests/frame-score.test.js`
- Modifier : `tests/index.html`

**Interfaces :**
- Consomme : `sharpness`, `tilt`, `exposition`, `empreinte` des tâches 1 à 4.
- Produit : `THRESHOLDS` — **le seul endroit où vit un seuil chiffré** :

```js
export const THRESHOLDS = {
  NETTETE_MIN: 60,        // variance du laplacien, image grise 192 px
  INCLINAISON_MAX: 8,     // degres
  HORIZON_FORCE_MIN: 0.12,// en dessous, l'horizon n'est pas un motif de rejet
  NIVEAU_CRAME: 250,
  NIVEAU_BOUCHE: 8,
  CRAME_MAX: 0.08,
  BOUCHE_MAX: 0.20,
  RESSEMBLANCE_MAX: 10,   // distance de Hamming en dessous de laquelle deux
                          // plans sont « semblables » (utilise en 1C)
  PLAGE_MIN_SEC: 0.5,     // un plan dure au moins 1 temps : 0,43 s a 140 BPM
  BORD_SEC: 1.0           // §5.2 : jeter la premiere et la derniere seconde
};
```

> **Valeurs de départ assumées.** Aucune n'a été mesurée contre la vraie
> matière — c'est l'objet de la séance de validation qui suit ce plan (§8 :
> « non devinables à l'avance »). Elles sont groupées ici pour qu'un
> aller-retour avec l'utilisateur coûte **une ligne**.

- Produit : `scoreFrame(gray, w, h) -> { nettete, inclinaison, forceHorizon, crame, bouche, empreinte, ok, motif }`.
  `motif` vaut `null` quand `ok`, sinon `'nettete'`, `'horizon'`, `'crame'` ou
  `'bouche'` — le **premier** critère violé, dans cet ordre.

- [ ] **Étape 1 : écrire les tests qui échouent** dans `tests/frame-score.test.js`

```js
test('une image nette, droite et bien exposee passe', () => {
  const r = scoreFrame(horizonIncline(96, 96, 0), 96, 96);
  assert(r.ok, 'rejetee pour ' + r.motif);
});

test('le flou est rejete pour nettete', () => {
  const g = flou(horizonIncline(96, 96, 0), 96, 96, 6);
  const r = scoreFrame(g, 96, 96);
  assert(!r.ok && r.motif === 'nettete', r.motif);
});

test('un cadre de travers est rejete pour horizon', () => {
  const r = scoreFrame(horizonIncline(96, 96, 25), 96, 96);
  assert(!r.ok && r.motif === 'horizon', r.motif);
});

test('une image sans horizon franc n est pas rejetee pour horizon', () => {
  // le bruit n'a pas d'orientation dominante : forceHorizon sous le seuil
  const r = scoreFrame(bruit(96, 96, 3), 96, 96);
  assert(r.motif !== 'horizon', 'rejetee a tort pour horizon');
});

test('un ciel brule est rejete pour crame', () => {
  const g = grayImage(96, 96, (x, y) => (y < 20 ? 255 : (x % 8 < 4 ? 120 : 60)));
  const r = scoreFrame(g, 96, 96);
  assert(!r.ok && r.motif === 'crame', r.motif);
});

test('aucun seuil chiffre ne vit hors de THRESHOLDS', async () => {
  const src = await (await fetch('../src/core/frame-score.js')).text();
  const corps = src.slice(src.indexOf('export function scoreFrame'));
  assert(!/[^.\w](\d+\.\d+|[2-9]\d+)/.test(corps), 'nombre magique dans scoreFrame');
});
```

- [ ] **Étape 2 : lancer et vérifier l'échec** — attendu : 6 échecs.

- [ ] **Étape 3 : implémenter `THRESHOLDS` et `scoreFrame()` dans `src/core/frame-score.js`.**

L'horizon n'est un motif de rejet que si `forceHorizon >= HORIZON_FORCE_MIN`.

- [ ] **Étape 4 : ajouter l'import, relancer** — attendu : 6 de plus au vert.

- [ ] **Étape 5 : commit**

```bash
git add src/core/frame-score.js tests/frame-score.test.js tests/index.html
git commit -m "feat: verdict par image et bloc unique des seuils"
```

---

## Task 6: plages exploitables

**Fichiers :**
- Créer : `src/core/ranges.js`, `tests/ranges.test.js`
- Modifier : `tests/index.html`

**Interfaces :**
- Consomme : `THRESHOLDS` de la tâche 5.
- Produit : `usableRanges(mesures, durationSec) -> { plages, rejets, secondesUtiles }`
  où `mesures` est un tableau de `{ timeSec, nettete, empreinte, ok, motif }`
  trié par temps (la sortie de la tâche 8), `plages` un tableau de
  `{ startSec, endSec, note, empreinte }` **trié par note décroissante**,
  `rejets` un objet comptant les images rejetées par motif (`bord` compris), et
  `secondesUtiles` la somme des durées de plages.

**Les règles, dans l'ordre :**

1. Toute mesure à moins de `BORD_SEC` du début ou de la fin du clip est
   rejetée, motif `'bord'`, **quelle que soit sa qualité** (§5.2).
2. Les mesures retenues consécutives forment une plage. Une seule mesure
   rejetée au milieu coupe la plage en deux.
3. Une plage de moins de `PLAGE_MIN_SEC` est jetée.
4. `note` = moyenne de la netteté de la plage, divisée par la netteté maximale
   **du clip entier**. Si cette maximale vaut 0, toutes les notes valent 0.
5. `empreinte` d'une plage = celle de sa mesure médiane.

- [ ] **Étape 1 : écrire les tests qui échouent** dans `tests/ranges.test.js`

```js
// fabrique : n mesures a 20 Hz, toutes bonnes sauf les index listes
function mesures(n, mauvaises = [], nettete = () => 100) {
  return Array.from({ length: n }, (_, i) => ({
    timeSec: i / 20, nettete: nettete(i), empreinte: new Uint8Array(8),
    ok: !mauvaises.includes(i), motif: mauvaises.includes(i) ? 'nettete' : null
  }));
}

test('la premiere et la derniere seconde sont toujours jetees', () => {
  const r = usableRanges(mesures(100), 5);           // 5 s, tout bon
  assert(r.plages.length === 1);
  assert(r.plages[0].startSec >= 1 && r.plages[0].endSec <= 4, JSON.stringify(r.plages[0]));
  assert(r.rejets.bord === 40, 'bord ' + r.rejets.bord);
});

test('une image rejetee coupe la plage en deux', () => {
  const r = usableRanges(mesures(100, [50]), 5);
  assert(r.plages.length === 2, 'plages ' + r.plages.length);
});

test('une plage trop courte disparait', () => {
  // on ne laisse que 6 mesures bonnes d'affilee, soit 0,30 s : sous PLAGE_MIN_SEC
  const mauvaises = Array.from({ length: 100 }, (_, i) => i).filter((i) => i < 40 || i > 45);
  assert(usableRanges(mesures(100, mauvaises), 5).plages.length === 0);
});

test('un clip de moins de deux secondes ne donne aucune plage', () => {
  const r = usableRanges(mesures(30), 1.5);
  assert(r.plages.length === 0);
  assert(r.secondesUtiles === 0);
});

test('un clip entierement rejete rend une liste vide, pas une exception', () => {
  const tout = Array.from({ length: 100 }, (_, i) => i);
  const r = usableRanges(mesures(100, tout), 5);
  assert(r.plages.length === 0 && r.rejets.nettete > 0);
});

test('une nettete nulle partout ne divise pas par zero', () => {
  const r = usableRanges(mesures(100, [], () => 0), 5);
  assert(r.plages.length === 1 && r.plages[0].note === 0);
});

test('les plages sortent triees par note decroissante', () => {
  // deux plages separees par un rejet, la seconde plus nette
  const r = usableRanges(mesures(100, [50], (i) => (i > 50 ? 200 : 50)), 5);
  assert(r.plages[0].note > r.plages[1].note);
});
```

- [ ] **Étape 2 : lancer et vérifier l'échec** — attendu : 7 échecs.

- [ ] **Étape 3 : implémenter `usableRanges()` dans `src/core/ranges.js`.**

Les bornes d'une plage sont les temps de sa première et de sa dernière mesure
retenues, plus un pas de mesure à la fin pour que la plage couvre la durée
réellement observée.

- [ ] **Étape 4 : ajouter l'import, relancer** — attendu : 7 de plus au vert.

- [ ] **Étape 5 : commit**

```bash
git add src/core/ranges.js tests/ranges.test.js tests/index.html
git commit -m "feat: groupement des images retenues en plages notees"
```

---

## Task 7: décodage en images grises redressées

**Fichiers :**
- Créer : `src/probe/demux.js`, `src/probe/decode-frames.js`
- Créer : `src/core/gris.js`, `tests/gris.test.js`
- Modifier : `src/probe/roundtrip.js` (retirer `demuxVideo` et `descriptionFor`,
  les importer de `demux.js`)
- Modifier : `tests/index.html`

**Interfaces :**
- Produit : `src/core/gris.js` — `versGris(rgba) -> Uint8ClampedArray` (luma
  Rec. 601 : `0.299 R + 0.587 V + 0.114 B`, arrondi),
  `pasAnalyse(fps, hz) -> number` (`Math.max(1, Math.round(fps / hz))`) et
  `cadreAnalyse(srcW, srcH, rotation, largeur) -> { plan, w, h }` où `w` et `h`
  sont la taille du canvas d'analyse — **toujours debout**, `largeur` × une
  hauteur 16/9 arrondie au pair — et `plan` le résultat de `drawPlan`.
- Produit : `src/probe/demux.js` — `demuxVideo(file, maxSeconds)` et
  `descriptionFor(mp4, trackId)`, **déplacés tels quels** depuis
  `roundtrip.js`. Aucun changement de comportement.
- Produit : `src/probe/decode-frames.js` —
  `decodeFrames(file, { hz = 20, largeur = 192, onFrame, onProgress }) -> { comptes, source }`.
  `onFrame({ gray, w, h, timeSec, index })` est appelé pour une image sur
  `pasAnalyse(fps, hz)`. `comptes` porte **un compteur par étape** :
  `{ paquets, decodees, analysees, perdues }`. `source` porte
  `{ fps, rotation, srcW, srcH, w, h }` — ce qui a réellement été décodé.

**Pourquoi extraire le démuxeur plutôt que le recopier :** la phase 0 a trouvé
deux bizarreries de Safari dans cette zone (durée de paquet absente, esds de 39
octets). Deux copies, c'est deux endroits à corriger à la troisième.

> **Attention : `roundtrip.js` est le seul code validé sur l'appareil.** Cette
> extraction ne doit rien changer à son comportement. La station 03 de
> `index.html` sert de contrôle au prochain aller-retour.

**Redressement :** utiliser `drawPlan(srcW, srcH, rotation, largeur, hauteur)`
de `src/core/draw-plan.js` avec `hauteur = largeur * 16 / 9` arrondie au pair
(342 pour 192), exactement comme la chaîne d'export. L'image analysée est donc
cadrée **comme le sera le reel**, pas comme le fichier est stocké.

- [ ] **Étape 1 : écrire les tests qui échouent** dans `tests/gris.test.js`

```js
test('le gris suit la luma Rec 601', () => {
  const g = versGris(new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]));
  assert(g[0] === 76 && g[1] === 150, g[0] + ' ' + g[1]);
});

test('un gris reste lui-meme', () => {
  assert(versGris(new Uint8ClampedArray([128, 128, 128, 255]))[0] === 128);
});

test('le pas d analyse donne 20 Hz depuis 60 images par seconde', () => {
  assert(pasAnalyse(60, 20) === 3);
  assert(pasAnalyse(30, 20) === 2);  // 1,5 arrondi a 2, soit 15 Hz reels
  assert(pasAnalyse(24, 20) === 1);  // jamais moins de 1
});

// Review Focus 5 : la matiere mesuree est a 90 degres, mais 0, 180 et 270
// existent et doivent sortir debout eux aussi.
test('le cadre d analyse est debout quelle que soit la rotation', () => {
  for (const rot of [0, 90, 180, 270]) {
    const c = cadreAnalyse(3840, 2160, rot, 192);
    assert(c.w === 192 && c.h === 342, rot + ' : ' + c.w + 'x' + c.h);
  }
});

test('un quart de tour fait calculer le cadrage en paysage', () => {
  assert(cadreAnalyse(3840, 2160, 90, 192).plan.drawW === 342);
  assert(cadreAnalyse(3840, 2160, 0, 192).plan.drawW === 192);
});
```

- [ ] **Étape 2 : lancer et vérifier l'échec** — attendu : 5 échecs.

- [ ] **Étape 3 : implémenter `src/core/gris.js`, puis ajouter l'import et relancer** — attendu : 5 de plus au vert.

- [ ] **Étape 4 : extraire `demuxVideo` et `descriptionFor` de `roundtrip.js` vers `src/probe/demux.js`**, et les y importer. Aucune autre modification.

- [ ] **Étape 5 : relancer toute la suite** — attendu : **aucune régression**,
  le total est celui de l'étape 3.

- [ ] **Étape 6 : implémenter `decodeFrames()` dans `src/probe/decode-frames.js`**

Décodeur unique, `OffscreenCanvas` à la taille d'analyse, `drawPlan` pour le
redressement et le cadrage, `getImageData` puis `versGris`. **Le callback
`output` du décodeur porte un `try/catch`** et toute exception y incrémente
`comptes.perdues` au lieu de disparaître : c'est la panne silencieuse de la
phase 0. Chaque `VideoFrame` est fermée après usage.

- [ ] **Étape 7 : commit**

```bash
git add src/core/gris.js tests/gris.test.js tests/index.html src/probe/demux.js src/probe/decode-frames.js src/probe/roundtrip.js
git commit -m "feat: decodage en images grises redressees, demuxeur partage"
```

---

## Task 8: enchaînement et statistiques du clip

**Fichiers :**
- Créer : `src/probe/analyse-clip.js`, `tests/analyse-clip.test.js`
- Modifier : `tests/index.html`

**Interfaces :**
- Consomme : `inspectFile` (`src/probe/inspect.js`), `decodeFrames` (tâche 7),
  `scoreFrame` (tâche 5), `usableRanges` (tâche 6).
- Produit : `analyseClip(file, onProgress) -> { info, mesures, plages, rejets, secondesUtiles, stats, timings, msTotal }`.
- Produit : `statistiques(mesures) -> { nettete, inclinaison, crame, bouche }`,
  chacun `{ min, median, p90, max }`.

**Pourquoi `statistiques` est un livrable et pas un ornement :** le réglage des
seuils se fait à distance, par allers-retours avec l'utilisateur. Une
distribution dit où poser un seuil ; une liste de verdicts ne le dit pas. C'est
l'instrument de mesure du plan.

- [ ] **Étape 1 : écrire les tests qui échouent** dans `tests/analyse-clip.test.js`

```js
test('la mediane et le neuvieme decile sont justes', () => {
  const m = Array.from({ length: 11 }, (_, i) => ({
    nettete: i * 10, inclinaison: 0, crame: 0, bouche: 0
  }));
  const s = statistiques(m);
  assert(s.nettete.min === 0 && s.nettete.max === 100);
  assert(s.nettete.median === 50, 'mediane ' + s.nettete.median);
  assert(s.nettete.p90 === 90, 'p90 ' + s.nettete.p90);
});

test('les statistiques d une liste vide ne plantent pas', () => {
  const s = statistiques([]);
  assert(s.nettete.median === 0 && s.nettete.max === 0);
});
```

- [ ] **Étape 2 : lancer et vérifier l'échec** — attendu : 2 échecs.

- [ ] **Étape 3 : implémenter `statistiques()` puis `analyseClip()` dans `src/probe/analyse-clip.js`**

`analyseClip` suit le modèle de `src/probe/analyse-track.js` : une phase
nommée par étape (`inspection`, `décodage`, `mesures`, `plages`), un
`onProgress({ phase, fait, total })`, un `timings` par phase, et **une
macrotâche rendue entre les phases** pour que la barre de progression s'affiche
vraiment sur l'appareil.

- [ ] **Étape 4 : ajouter l'import, relancer** — attendu : 2 de plus au vert.

- [ ] **Étape 5 : commit**

```bash
git add src/probe/analyse-clip.js tests/analyse-clip.test.js tests/index.html
git commit -m "feat: enchainement d analyse d un clip et distributions"
```

---

## Task 9: le banc visuel

**Fichiers :**
- Créer : `bench-video.html`, `src/bench/clip-view.js`
- Créer : `tests/clip-view.test.js`
- Modifier : `sw.js` — ajouter `'./bench-video.html'` et
  `'./src/bench/clip-view.js'` à la liste de pré-cache, à côté de
  `'./bench.html'` (sw.js:35-37)
- Modifier : `tests/index.html`

**Interfaces :**
- Consomme : `analyseClip` (tâche 8), `THRESHOLDS` (tâche 5), `mmss`
  (`src/core/format.js`).
- Produit : `dessinerClip(canvas, analyse)` et
  `texteColorimetrie(info) -> string` dans `src/bench/clip-view.js`.

**Ce que la page doit montrer**, et rien de plus :

1. **En-tête du clip :** nom, définition, cadence, rotation, durée, et
   **colorimétrie** — `transferCharacteristics` quand `colourKnown`, sinon le
   texte exact `colorimétrie non lue`. *(Review Focus 4 : ne jamais laisser
   croire à une mesure qui n'a pas eu lieu.)*
2. **Quatre courbes** dans le temps — netteté, inclinaison, cramé, bouché —
   chacune avec **son trait de seuil** tiré de `THRESHOLDS`.
3. **Un bandeau de verdict** sous les courbes : vert quand retenu, et une
   couleur par motif de rejet, bord compris.
4. **Les plages retenues** en ambre, avec leur note.
5. **Un tableau de distributions** : min / médiane / p90 / max par critère, et
   le compte de rejets par motif. C'est ce tableau que l'utilisateur recopie.
6. **Les temps par phase** et le total.

Reprendre les styles de `bench.html` : mêmes variables CSS, même grammaire de
cartes, même `.chip`. La page est **séparée** de `bench.html` — l'une juge le
son, l'autre l'image, et les mélanger rendrait les deux illisibles.

- [ ] **Étape 1 : écrire le test qui échoue** dans `tests/clip-view.test.js`

```js
// Review Focus 4 : ne jamais laisser croire a une mesure qui n'a pas eu lieu.
test('une colorimetrie non lue est annoncee comme telle', () => {
  assert(texteColorimetrie({ colourKnown: false, transferCharacteristics: '' })
         === 'colorimétrie non lue');
});

test('une colorimetrie lue est affichee telle quelle', () => {
  assert(texteColorimetrie({ colourKnown: true, transferCharacteristics: 'PQ' })
         === 'PQ');
});
```

- [ ] **Étape 2 : lancer et vérifier l'échec** — attendu : 2 échecs.

- [ ] **Étape 3 : écrire `src/bench/clip-view.js` et `bench-video.html`**

Le reste de `clip-view.js` est du dessin et n'a pas de test automatisé : sa
vérification est l'étape suivante.

- [ ] **Étape 4 : ajouter l'import à `tests/index.html` et relancer** — attendu : 2 de plus au vert.

- [ ] **Étape 5 : vérifier dans Chrome sur le Mac**

Lancer le serveur, ouvrir `http://localhost:8777/bench-video.html`, y déposer
**un fichier mp4 quelconque** (n'importe quelle vidéo fait l'affaire ici : on
vérifie que la page vit, pas que les seuils sont bons).
Attendu : l'en-tête se remplit, les quatre courbes se dessinent, le tableau de
distributions affiche des nombres, aucune erreur dans la console.

- [ ] **Étape 6 : porter `window.STUDIO_VERSION` à `0.22.0` dans `bench-video.html`, puis commit et publication**

```bash
git add bench-video.html src/bench/clip-view.js tests/clip-view.test.js tests/index.html sw.js
git commit -m "feat: banc visuel d analyse video"
git push
```

- [ ] **Étape 7 : vérifier sur l'iPhone**

Ouvrir `https://olivieryoan07-alt.github.io/STUDIO/bench-video.html`, vérifier
que la version affichée est bien `v0.22.0`, y charger **un vrai clip de la
galerie**, et lire : la colorimétrie, les distributions, le nombre de plages,
les temps par phase.

**C'est la première mesure de la phase 1B**, et elle répond du même coup à la
réserve de colorimétrie laissée ouverte par la phase 0 (§9).

---

## Après ce plan : la séance de réglage

Le plan livre l'instrument. Les seuils se règlent ensuite avec l'utilisateur,
sur l'iPhone, comme la validation de la phase 1A :

1. Lui demander des clips qui contiennent **des images à rejeter** — flou de
   marche franc, cadre nettement de travers, ciel brûlé, sous-bois bouché. Sur
   une matière entièrement bonne, aucun seuil n'est réglable (§9).
2. Lire les distributions de chaque clip.
3. Poser chaque seuil, une ligne dans `THRESHOLDS`, publier, relire.
4. Consigner les valeurs retenues et leur justification dans
   `docs/superpowers/specs/2026-11-19-seuils-video.md`.

La phase 1C ne commence qu'une fois ces seuils posés : le moteur de montage
choisit **parmi** les plages, et des plages fausses donneraient un montage
faux pour une raison qu'on chercherait dans le mauvais module.
