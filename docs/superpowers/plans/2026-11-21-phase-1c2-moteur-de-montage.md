# Phase 1C-2 — le moteur de montage : plan d'exécution

> **Pour les ouvriers agentiques :** SOUS-COMPÉTENCE REQUISE — utiliser
> `superpowers:executing-plans` (exécution native, choisie par l'utilisateur)
> pour réaliser ce plan tâche par tâche. Les étapes sont des cases à cocher.

**But :** de l'extrait musical choisi et des plages exploitables des clips,
tirer **trois listes de plans** — quoi montrer, quand couper, et dans quel
ordre.

**Architecture :** deux décisions séparées, parce qu'elles se jugent
séparément. `decoupe.js` dit **combien de temps dure chaque plan**, en
suivant l'énergie de l'extrait ; `selection.js` dit **quelle plage de quel
clip** remplit chacun. `montage.js` les enchaîne et rend trois variantes.
Tout est pur : aucun décodeur, aucun canevas, aucun son.

**Pile :** JavaScript modules ES, sans build, sans dépendance. Tests dans
`tests/harness.js`, exécutés en ouvrant `tests/index.html` dans Chrome.

**Spec :** `docs/superpowers/specs/2026-11-14-studio-design.md` — **§5.4**
(la logique « C », les règles invariantes, les trois propositions), **§5.4
bis** (longueur de l'extrait), **§5.2** (la forme des plages), §2
(anti-objectifs).

## Ce que ce plan ne fait pas

Il ne produit **aucune image**. Son livrable est une liste de plans et un
banc pour la juger. L'encodage, la lecture et le partage sont le plan
**1C-3**, qui prendra cette liste telle quelle.

Conséquence sur ce qui peut être jugé à la fin de ce plan : **le rythme des
coupes, oui** — on le voit sur la courbe et on l'entend sur l'extrait. **Le
choix des images, non** — il faudra 1C-3. Ne pas promettre l'inverse à
l'utilisateur.

## Contraintes globales

- **Aucune dépendance nouvelle, aucune étape de construction.** Le Mac n'a ni
  Node ni npm. Modules ES servis en statique.
- **Toute coupe tombe sur un temps** (§5.4). Jamais entre deux.
- **Coupes franches uniquement.** Aucune transition, aucun fondu.
- **Un même instant source n'est jamais utilisé deux fois** (§5.4).
- **Aucun plan ne dure moins d'un temps ni plus de quatre** (§5.4).
- **La forme de référence** fait 16 temps : `3 | 3 | 6 | 2 | 2`
  (`src/core/excerpt.js`). Elle n'est plus la règle, seulement le **repli
  pour extrait plat**.
- **Pas de rotation stricte entre clips** (§5.4) — ABABAB est l'anti-objectif 2.
- **Commentaires et noms en français.** Pas d'accents dans les messages de commit.
- `window.STUDIO_VERSION` et `VERSION` de `sw.js` incrémentés ensemble à la
  publication ; toute page nouvelle ajoutée au pré-cache.

## Review Focus

Classes d'entrée que la spec implique, qu'aucune tâche n'exercerait
spontanément, et qui casseraient le montage chez l'utilisateur :

1. **Matière insuffisante** — la somme des plages est plus courte que le reel,
   ou un clip ne rend aucune plage. Attendu : un montage plus court nommé
   comme tel, ou un refus qui dit ce qui manque — jamais un plan qui réutilise
   un instant déjà pris. *(Tâche 3)*
2. **Dix clips pour huit plans** — deux clips ne peuvent pas apparaître
   (§5.4, règle révisée). Attendu : les mieux notés sont gardés et les autres
   **nommés** dans `clipsInutilises`. *(Tâche 3)*
3. **Un seul clip** — l'alternance est impossible. Attendu : un montage
   valide fait de plans dissemblables du même clip, pas un refus. *(Tâche 3)*
4. **Extrait plat** — vingt secondes de metal à plein régime, écart
   creux/sommet trop faible. Attendu : le repli sur la forme de référence,
   jamais huit plans de même longueur (anti-objectif 2). *(Tâche 1)*
5. **Toutes les plages identiques** — un clip filmé face à un mur : toutes
   les empreintes se ressemblent. Attendu : le montage sort quand même, la
   pénalité de ressemblance étant payée et non bloquante. *(Tâche 2)*

---

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `src/core/decoupe.js` | longueurs des plans, dictées par l'énergie de l'extrait |
| `src/core/selection.js` | quelle plage de quel clip remplit chaque plan |
| `src/core/montage.js` | enchaînement, trois variantes, clips inutilisés |
| `src/app/montage-view.js` | dessin de la frise des plans sous la courbe |
| `bench-montage.html` | le banc : juger le rythme des coupes |

---

## Task 1: les longueurs de plans suivent l'énergie

**Fichiers :**
- Créer : `src/core/decoupe.js`, `tests/decoupe.test.js`
- Modifier : `tests/index.html`

**Interfaces :**
- Consomme : `smoothEnvelope(env, rate, windowSec)` de `src/core/sections.js`.
- Produit :
  - `FORME_REPLI` — `[3, 3, 6, 2, 2]` exporté, et
    `PLAN_MIN = 1`, `PLAN_MAX = 4`, `PLAT_MAX = 0.35`.
  - `longueursDePlans(envExtrait, rate, beatSec, beatCount) -> number[]`
    — les longueurs en temps, **dont la somme vaut exactement `beatCount`**.

**L'algorithme, parce que la signature ne le détermine pas :**

1. Lisser l'enveloppe de l'extrait sur **0,5 s** — pas 2 s comme la
   segmentation du §5.3 : un extrait de 6 s n'a pas de quoi nourrir une
   fenêtre de 2 s.
2. **Test de platitude :** si `(max - min) / max < PLAT_MAX`, la courbe ne
   porte rien ; rendre `FORME_REPLI` ajusté à `beatCount` (voir plus bas).
3. Sinon, avancer temps par temps. Au temps `i`, lire l'énergie lissée
   normalisée `e ∈ [0,1]` et prendre
   `L = Math.round(PLAN_MAX - e * (PLAN_MAX - PLAN_MIN))`, borné à
   `[PLAN_MIN, PLAN_MAX]`. Empiler `L`, avancer de `L`.
4. **Le dernier plan ne déborde pas** : s'il reste moins de `PLAN_MIN` temps,
   allonger le plan précédent de ce reste plutôt que d'ajouter un plan nain.

Ajustement du repli à `beatCount` : `FORME_REPLI` fait 16 temps ; pour un
autre total, retirer ou ajouter les temps **dans le corps puis la sortie
seulement** (§5.4 bis), jamais dans l'ouverture, la montée ou la rafale.

- [ ] **Step 1: écrire les tests qui échouent** dans `tests/decoupe.test.js`

```js
// une enveloppe qui monte franchement : creux au debut, sommet a la fin
const rampe = (n) => Float32Array.from({ length: n }, (_, i) => 0.05 + 0.95 * i / (n - 1));
const plate = (n) => Float32Array.from({ length: n }, () => 0.8);

test('les longueurs somment exactement au nombre de temps', () => {
  for (const beatCount of [9, 14, 16]) {
    const L = longueursDePlans(rampe(300), 50, 0.4286, beatCount);
    const somme = L.reduce((a, b) => a + b, 0);
    assert(somme === beatCount, beatCount + ' temps -> somme ' + somme);
  }
});

test('aucun plan hors des bornes', () => {
  const L = longueursDePlans(rampe(300), 50, 0.4286, 16);
  assert(L.every((x) => x >= 1 && x <= 4), JSON.stringify(L));
});

test('les plans raccourcissent quand l energie monte', () => {
  const L = longueursDePlans(rampe(300), 50, 0.4286, 16);
  assert(L[0] > L[L.length - 1], 'premier ' + L[0] + ', dernier ' + L[L.length - 1]);
});

// Review Focus 4
test('un extrait plat tombe sur la forme de repli, pas sur des plans egaux', () => {
  const L = longueursDePlans(plate(300), 50, 0.4286, 16);
  assert(JSON.stringify(L) === JSON.stringify(FORME_REPLI), JSON.stringify(L));
});

test('le repli s ajuste au nombre de temps sans toucher ouverture ni rafale', () => {
  const L = longueursDePlans(plate(300), 50, 0.5, 14);
  assert(L.reduce((a, b) => a + b, 0) === 14, JSON.stringify(L));
  assert(L[0] === FORME_REPLI[0] && L[1] === FORME_REPLI[1], JSON.stringify(L));
});
```

- [ ] **Step 2: lancer la suite et vérifier l'échec**

Ouvrir `http://localhost:8777/tests/index.html` dans Chrome. Attendu :
« chargement impossible : Failed to fetch dynamically imported module …
/tests/decoupe.test.js » — un module ES absent fait échouer l'import avant
toute exécution, c'est le bon ROUGE.

- [ ] **Step 3: implémenter `src/core/decoupe.js`.**

- [ ] **Step 4: ajouter l'import à `tests/index.html` et relancer** — attendu : 5 de plus au vert.

- [ ] **Step 5: commit**

```bash
git add src/core/decoupe.js tests/decoupe.test.js tests/index.html
git commit -m "feat: longueurs de plans dictees par l energie de l extrait"
```

---

## Task 2: le coût d'un candidat

**Fichiers :**
- Créer : `src/core/selection.js`, `tests/selection.test.js`
- Modifier : `tests/index.html`

**Interfaces :**
- Consomme : `distance(a, b)` de `src/core/empreinte.js`, `THRESHOLDS` de
  `src/core/frame-score.js`.
- Produit :
  - `POIDS` — `{ QUALITE: 1, RESSEMBLANCE: 2, MEME_CLIP: 0.6 }`, exporté.
  - `coutCandidat(candidat, precedent) -> number` où `candidat` est
    `{ clip, note, empreinte }` et `precedent` le plan déjà retenu juste
    avant, ou `null` pour le premier.

**La formule :**

```
cout = POIDS.QUALITE * (1 - note)
     + POIDS.RESSEMBLANCE * part de ressemblance avec le precedent
     + POIDS.MEME_CLIP * (meme clip que le precedent ? 1 : 0)
```

La part de ressemblance vaut
`Math.max(0, 1 - distance / THRESHOLDS.RESSEMBLANCE_MAX)` : elle décroît de 1
(empreintes identiques) à 0 (distance au seuil ou au-delà).

**Pourquoi des poids et non des interdictions** (§5.4) : prises comme règles
dures, « jamais deux plans qui se ressemblent » et « jamais ABABAB » n'ont
pas de solution commune sur de la marche en paysage. Le sélecteur **paie**
une ressemblance plutôt que de refuser, et ne la répète donc pas.

- [ ] **Step 1: écrire les tests qui échouent** dans `tests/selection.test.js`

```js
const emp = (n) => { const a = new Uint8Array(8); a[0] = n; return a; };
const cand = (clip, note, e) => ({ clip, note, empreinte: emp(e) });

test('le premier plan ne paie que sa qualite', () => {
  assert(Math.abs(coutCandidat(cand(0, 1, 0), null)) < 1e-9);
  assert(Math.abs(coutCandidat(cand(0, 0, 0), null) - POIDS.QUALITE) < 1e-9);
});

test('une plage mieux notee coute moins cher', () => {
  assert(coutCandidat(cand(0, 0.9, 0), null) < coutCandidat(cand(0, 0.2, 0), null));
});

test('ressembler au plan precedent coute cher', () => {
  const prec = cand(1, 1, 0);
  const jumeau = cand(0, 1, 0);          // empreinte identique
  const autre = cand(0, 1, 255);         // 8 bits de difference
  assert(coutCandidat(jumeau, prec) > coutCandidat(autre, prec),
         'jumeau ' + coutCandidat(jumeau, prec) + ', autre ' + coutCandidat(autre, prec));
});

test('rester sur le meme clip coute, sans etre interdit', () => {
  const prec = cand(1, 1, 0);
  const sup = coutCandidat(cand(1, 1, 255), prec) - coutCandidat(cand(2, 1, 255), prec);
  assert(Math.abs(sup - POIDS.MEME_CLIP) < 1e-9, 'surcout ' + sup);
  assert(Number.isFinite(coutCandidat(cand(1, 1, 0), prec)), 'un cout fini, jamais l infini');
});

// Review Focus 5
test('des empreintes toutes identiques donnent un cout fini', () => {
  const prec = cand(1, 0.5, 7);
  assert(Number.isFinite(coutCandidat(cand(1, 0.5, 7), prec)));
});
```

- [ ] **Step 2: lancer et vérifier l'échec** — attendu : « … /tests/selection.test.js ».

- [ ] **Step 3: implémenter `POIDS` et `coutCandidat` dans `src/core/selection.js`.**

- [ ] **Step 4: ajouter l'import, relancer** — attendu : 5 de plus au vert.

- [ ] **Step 5: commit**

```bash
git add src/core/selection.js tests/selection.test.js tests/index.html
git commit -m "feat: cout d un candidat, qualite et penalites"
```

---

## Task 3: remplir les plans

**Fichiers :**
- Modifier : `src/core/selection.js`, `tests/selection.test.js`

**Interfaces :**
- Consomme : `coutCandidat`, `POIDS` (tâche 2).
- Produit :
  `choisirPlans({ longueurs, beatSec, clips, graine }) -> { plans, clipsInutilises, manque }`
  - `clips` : `[{ nom, plages }]`, `plages` étant la sortie de
    `usableRanges` — `[{ startSec, endSec, note, empreinte }]`.
  - `plans` : `[{ nom, startSec, durSec, temps }]`, un par longueur, dans
    l'ordre du reel — `nom` identifie le clip, `startSec`/`durSec` situent
    l'extrait **dans ce clip**, `temps` est la longueur en temps. Pas de
    champ `clip` en plus de `nom` : un seul identifiant, pas deux.
  - `clipsInutilises` : les noms des clips qu'aucun plan n'emploie.
  - `manque` : le nombre de plans qu'on n'a pas pu remplir, `0` en temps normal.

**L'algorithme :**

Glouton, plan par plan. Pour le plan `k` de durée `d = longueurs[k] * beatSec` :

1. Énumérer les candidats : pour chaque clip, chaque plage, les créneaux
   `r.startSec + j * d` tant qu'ils tiennent dans la plage, **au plus
   `CRENEAUX_MAX = 4` par plage**, et en écartant tout créneau qui
   chevauche un instant déjà pris de ce clip.
2. Prendre le candidat de moindre `coutCandidat`, départagé par la graine.
3. Marquer l'intervalle comme pris.
4. Aucun candidat : incrémenter `manque` et passer au plan suivant — **jamais
   réutiliser un instant** (§5.4).

**La graine**, et c'est ce qui distingue les trois propositions (§8 le
laissait à l'ouvrier) : au lieu du meilleur candidat, en tirer un parmi les
**trois meilleurs**, par un PRNG à graine — la même recette que
`tests/fixtures-audio.js`. Graine `0` prend toujours le meilleur : c'est la
proposition de référence.

- [ ] **Step 1: écrire les tests qui échouent**

```js
// fabrique : n clips, chacun avec `p` plages de 3 s bien notees
const clipsDe = (n, p = 3) => Array.from({ length: n }, (_, c) => ({
  nom: 'clip' + c,
  plages: Array.from({ length: p }, (_, j) => ({
    startSec: j * 4, endSec: j * 4 + 3, note: 0.9 - 0.1 * j,
    empreinte: (() => { const a = new Uint8Array(8); a[0] = c * 40 + j; return a; })()
  }))
}));

test('chaque plan est rempli et tombe sur un temps', () => {
  const r = choisirPlans({ longueurs: [3, 3, 2, 2, 1, 1, 2, 2], beatSec: 0.43,
                           clips: clipsDe(5), graine: 0 });
  assert(r.plans.length === 8 && r.manque === 0, 'manque ' + r.manque);
  assert(r.plans.every((p, i) => Math.abs(p.durSec - [3,3,2,2,1,1,2,2][i] * 0.43) < 1e-9));
});

test('un meme instant source ne sert jamais deux fois', () => {
  const r = choisirPlans({ longueurs: [1, 1, 1, 1, 1, 1, 1, 1], beatSec: 0.43,
                           clips: clipsDe(1, 1), graine: 0 });
  const pris = r.plans.map((p) => [p.startSec, p.startSec + p.durSec]).sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < pris.length; i++) {
    assert(pris[i][0] >= pris[i - 1][1] - 1e-9, 'chevauchement : ' + JSON.stringify(pris));
  }
});

// Review Focus 3
test('un seul clip donne quand meme un montage', () => {
  const r = choisirPlans({ longueurs: [3, 2, 2, 1], beatSec: 0.43,
                           clips: clipsDe(1), graine: 0 });
  assert(r.manque === 0 && r.plans.length === 4, JSON.stringify(r.manque));
});

// Review Focus 2
test('dix clips pour huit plans : les inutilises sont nommes', () => {
  const r = choisirPlans({ longueurs: [2, 2, 2, 2, 2, 2, 2, 2], beatSec: 0.43,
                           clips: clipsDe(10), graine: 0 });
  const employes = new Set(r.plans.map((p) => p.nom));
  assert(r.clipsInutilises.length === 10 - employes.size,
         'employes ' + employes.size + ', inutilises ' + r.clipsInutilises.length);
  assert(r.clipsInutilises.length > 0, 'huit plans ne peuvent pas employer dix clips');
});

// Review Focus 1
test('la matiere qui manque est comptee, pas inventee', () => {
  const r = choisirPlans({ longueurs: [4, 4, 4, 4], beatSec: 1.0,
                           clips: clipsDe(1, 1), graine: 0 });
  assert(r.manque > 0, 'aucun manque signale alors que la matiere est trop courte');
  assert(r.plans.length + r.manque === 4, 'plans ' + r.plans.length + ' manque ' + r.manque);
});

// §5.4 : « avec 5 a 8 clips, tous apparaissent ». La penalite MEME_CLIP rend
// la chose probable ; ce test la rend obligatoire.
test('quand il y a moins de clips que de plans, tous apparaissent', () => {
  for (const n of [5, 8]) {
    const r = choisirPlans({ longueurs: [2, 2, 2, 2, 2, 2, 2, 2], beatSec: 0.43,
                             clips: clipsDe(n), graine: 0 });
    assert(r.clipsInutilises.length === 0,
           n + ' clips, inutilises : ' + JSON.stringify(r.clipsInutilises));
  }
});

test('deux graines donnent deux montages differents', () => {
  const arg = { longueurs: [3, 3, 2, 2, 1, 1, 2, 2], beatSec: 0.43, clips: clipsDe(5) };
  const a = choisirPlans({ ...arg, graine: 0 });
  const b = choisirPlans({ ...arg, graine: 7 });
  assert(JSON.stringify(a.plans) !== JSON.stringify(b.plans), 'les deux montages sont identiques');
});
```

- [ ] **Step 2: lancer et vérifier l'échec** — attendu : 7 échecs.

- [ ] **Step 3: implémenter `choisirPlans` dans `src/core/selection.js`.**

- [ ] **Step 4: relancer** — attendu : 7 de plus au vert.

- [ ] **Step 5: commit**

```bash
git add src/core/selection.js tests/selection.test.js
git commit -m "feat: remplissage glouton des plans, trois graines"
```

---

## Task 4: l'enchaînement

**Fichiers :**
- Créer : `src/core/montage.js`, `tests/montage.test.js`
- Modifier : `tests/index.html`

**Interfaces :**
- Consomme : `longueursDePlans` (tâche 1), `choisirPlans` (tâche 3).
- Produit :
  `monter({ extrait, env, rate, offsetSec, clips, graines = [0, 1, 2] }) -> propositions[]`
  où `extrait` est `{ startSec, durSec, beatCount, bpm, offsetSec }` — la clé
  `studio.passage` qu'écrit `choix.html` — et chaque proposition vaut
  `{ graine, longueurs, plans, clipsInutilises, manque, durSec }`.

`monter` découpe l'enveloppe du morceau à la fenêtre de l'extrait avant
d'appeler `longueursDePlans` : **l'énergie qui commande est celle de
l'extrait, pas celle du morceau** (§5.4). Les trois propositions partagent
les mêmes longueurs — c'est la sélection qui change, pas le rythme (§5.4).

- [ ] **Step 1: écrire les tests qui échouent** dans `tests/montage.test.js`

```js
const extraitType = { startSec: 30, durSec: 6.86, beatCount: 16, bpm: 140, offsetSec: 0.1 };
const envMorceau = Float32Array.from({ length: 3000 }, (_, i) => 0.1 + 0.9 * ((i % 300) / 300));

test('trois propositions, memes longueurs, selections differentes', () => {
  const p = monter({ extrait: extraitType, env: envMorceau, rate: 50, offsetSec: 0,
                     clips: clipsDe(5) });
  assert(p.length === 3, 'propositions ' + p.length);
  assert(JSON.stringify(p[0].longueurs) === JSON.stringify(p[1].longueurs), 'rythmes differents');
  assert(JSON.stringify(p[0].plans) !== JSON.stringify(p[1].plans), 'selections identiques');
});

test('la duree de chaque proposition est celle de l extrait', () => {
  const p = monter({ extrait: extraitType, env: envMorceau, rate: 50, offsetSec: 0,
                     clips: clipsDe(5) });
  for (const prop of p) {
    assert(Math.abs(prop.durSec - extraitType.durSec) < 0.01,
           'duree ' + prop.durSec + ' au lieu de ' + extraitType.durSec);
  }
});

test('c est l energie de l EXTRAIT qui commande, pas celle du morceau', () => {
  // deux extraits au meme endroit du morceau mais de courbes opposees
  const montant = Float32Array.from({ length: 3000 }, (_, i) => 0.05 + 0.95 * i / 3000);
  const descendant = Float32Array.from({ length: 3000 }, (_, i) => 1 - 0.95 * i / 3000);
  const a = monter({ extrait: extraitType, env: montant, rate: 50, offsetSec: 0, clips: clipsDe(3) });
  const b = monter({ extrait: extraitType, env: descendant, rate: 50, offsetSec: 0, clips: clipsDe(3) });
  assert(JSON.stringify(a[0].longueurs) !== JSON.stringify(b[0].longueurs),
         'les deux courbes donnent le meme rythme : ' + JSON.stringify(a[0].longueurs));
});
```

`clipsDe` est la fabrique de la tâche 3 : la déplacer dans
`tests/fixtures-montage.js` et l'importer des deux côtés.

- [ ] **Step 2: lancer et vérifier l'échec** — attendu : 3 échecs.

- [ ] **Step 3: implémenter `monter` dans `src/core/montage.js`.**

- [ ] **Step 4: relancer** — attendu : 3 de plus au vert, aucune régression
  dans `selection.test.js` après le déplacement de la fabrique.

- [ ] **Step 5: commit**

```bash
git add src/core/montage.js tests/montage.test.js tests/fixtures-montage.js tests/selection.test.js tests/index.html
git commit -m "feat: enchainement du montage et trois propositions"
```

---

## Task 5: le banc du rythme

**Fichiers :**
- Créer : `bench-montage.html`, `src/app/montage-view.js`
- Modifier : `sw.js` (pré-cache), `index.html` (lien)

**Interfaces :**
- Consomme : `analyseTrack`, `analyseClip`, `monter`, `createBench`, `mmss`.
- Produit : `dessinerFrise(canvas, { env, rate, offsetSec, extrait, proposition })`.

**Ce que la page fait :**

1. charger un morceau **et** 2 à 10 clips, les analyser tous (progression
   visible, un clip après l'autre) ;
2. lire la fenêtre de `sessionStorage['studio.passage']` si elle existe, sinon
   prendre celle de `fenetreInitiale` et le dire ;
3. afficher **les trois propositions**, chacune : la frise des plans sous la
   courbe d'énergie de l'extrait, une couleur par clip, la longueur de chaque
   plan en temps, et la liste `clip → de … à …` ;
4. **écouter l'extrait avec les clics sur les temps**, pour juger la densité
   des coupes contre la musique ;
5. nommer les **clips inutilisés** et, le cas échéant, le nombre de plans
   manquants.

Reprendre les styles de `choix.html`.

- [ ] **Step 1: écrire `src/app/montage-view.js` et `bench-montage.html`**

Pas de test automatisé : c'est du dessin et de l'enchaînement. La
vérification est aux étapes suivantes.

- [ ] **Step 2: vérifier dans Chrome sur le Mac**

Lancer le serveur, ouvrir `http://localhost:8777/bench-montage.html`, charger
un mp3 et trois vidéos quelconques. Attendu : trois frises de rythmes
identiques et de sélections différentes, aucune erreur dans la console, et la
somme des longueurs de chaque proposition égale au nombre de temps affiché.

- [ ] **Step 3: relancer toute la suite** — attendu : aucune régression.

- [ ] **Step 4: porter `window.STUDIO_VERSION` et `VERSION` de `sw.js` à `0.29.0`, puis commit et publication**

```bash
git add bench-montage.html src/app/montage-view.js sw.js index.html bench.html bench-video.html choix.html
git commit -m "feat: banc du rythme de montage"
git push
```

- [ ] **Step 5: vérifier sur l'iPhone**

Ouvrir `https://olivieryoan07-alt.github.io/STUDIO/bench-montage.html`,
vérifier la version, charger un vrai morceau et cinq vrais clips.

---

## Après ce plan : la séance de jugement

Deux questions, et deux seulement — le choix des images n'est pas jugeable
sans 1C-3 :

1. En écoutant l'extrait et en regardant la frise, **le rythme des coupes
   colle-t-il à la musique** ?
2. Les trois propositions sont-elles **assez différentes** pour qu'il vaille
   la peine d'en voir trois ?

Si la réponse 1 est non, c'est la règle du §5.4 — la longueur d'un plan
dictée par l'énergie — qui est à revoir, pas le code. C'est le même genre de
verdict que celui qui a tué la règle du point culminant le 2026-11-19 ; il
doit tomber **avant** d'écrire le plan 1C-3, qui encodera ce rythme-là.
