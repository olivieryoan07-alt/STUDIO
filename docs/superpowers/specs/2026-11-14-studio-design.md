# STUDIO — Document de conception

**Date :** 2026-11-14
**Statut :** validé le 2026-11-14. **Phase 0 exécutée le 2026-11-16 : verdict `go`**
(voir `2026-11-16-mesures-phase-0.md`). Deux affirmations du §3 corrigées depuis.
**Auteur :** rédigé avec Yoan Olivier

---

## 1. Intention

STUDIO est un monteur de reels automatique, à usage strictement personnel, qui tourne sur un iPhone 12 mini.

L'utilisateur lui donne 2 à 5 vidéos et un morceau de musique. STUDIO rend un reel vertical de 15 à 25 secondes, coupé sur le rythme, prêt à publier.

**Le pourquoi, et il commande tout le reste :** l'utilisateur veut publier sur Instagram mais ne veut ni apprendre à monter, ni monter lui-même. STUDIO n'est donc pas un gain de temps sur une tâche qu'il sait faire — c'est ce qui rend la publication possible tout court.

Conséquence directe sur la conception : **l'app doit avoir du goût à la place de l'utilisateur.** On ne peut pas lui demander de juger « est-ce que ce montage est réussi ? ». On peut seulement lui demander de choisir entre des résultats qu'il regarde.

> **Nuance apportée le 2026-11-19, après validation à l'oreille.** Le goût que l'app doit avoir est celui du *montage* : où couper, à quelle densité, dans quel ordre. Il y a une chose qu'elle ne peut pas avoir à sa place, et la mesure l'a montré : **la connaissance du morceau**. Savoir que le bon passage est la reprise à 3:40 et non l'entrée du groupe à 0:18 ne se lit pas dans le signal. L'utilisateur désigne donc le passage ; l'app fait tout le reste. Voir §5.1 bis.

### La matière à monter

Elle est homogène et connue :

- vidéos de paysage et de marche, filmées **en vertical** avec l'iPhone ;
- ni voix, ni texte à l'image, ni dialogue ;
- bande-son : metal et rock alternatif, fichiers mp3 bruts, tempos dynamiques et percussifs.

Cette homogénéité est un atout : le moteur n'a pas à être généraliste.

---

## 2. Objectifs, non-objectifs, anti-objectifs

### Objectifs

1. De l'ajout des fichiers au reel exporté, **sans aucune décision de montage** demandée à l'utilisateur. Désigner le passage du morceau (§5.1 bis) n'en est pas une : c'est choisir la matière, au même titre que choisir les vidéos.
2. Les coupes tombent sur le rythme, de façon audible et visible.
3. La densité des coupes suit la structure du morceau (voir §5.3).
4. Trois propositions différentes, pour que choisir reste un acte de spectateur et jamais de monteur.
5. L'app reste installée sur l'iPhone **indéfiniment**, sans Mac, sans compte développeur, sans rien payer.
6. Tout se passe sur l'appareil : aucune vidéo, aucun fichier audio ne quitte le téléphone.

### Non-objectifs

- Publier sur Instagram. STUDIO écrit dans la galerie ; l'utilisateur publie à la main.
- Monter des vidéos horizontales (recadrage intelligent 16:9 → 9:16 : hors périmètre).
- Texte à l'écran, sous-titres, stickers, filtres, étalonnage.
- Transitions. **Coupes franches uniquement** — décision de l'utilisateur, non négociable.
- Fonctionner avec de la musique protégée (Apple Music, Spotify). Fichiers non chiffrés seulement.
- Multi-utilisateur, comptes, synchronisation, sauvegarde en ligne.
- Distribution à d'autres personnes.

### Anti-objectifs

Ce qui ferait de STUDIO un échec **même s'il fonctionne techniquement** :

1. **Des réglages.** Un curseur de durée, un réglage d'intensité des coupes, un ordre des plans à décider : c'est réapprendre le montage par la fenêtre. Zéro réglage de montage, jamais.
2. **Un montage mécanique.** Une coupe à intervalle fixe, parfaitement régulière, donne un résultat qui sonne machine. Explicitement rejeté en séance (voir §4).
3. **Un rendu qui saccade.** Mesuré pendant l'essai, et c'est ce qui a condamné la première méthode d'export (§6.2).
4. **Une app qui expire.** Une app à réinstaller depuis un Mac chaque semaine ne serait pas utilisée. C'est ce qui a disqualifié l'app iOS native (§4).
5. **Une attente aveugle.** *Révisé en séance.* L'utilisateur a arbitré pour la qualité contre la vitesse : une attente longue n'est plus un échec en soi. Ce qui en reste un : une attente **sans progression visible**, ou **étalée** en plusieurs pauses au lieu d'être concentrée en une.

---

## 3. Contraintes

Toutes mesurées pendant la séance, aucune supposée.

### Matériel

| | |
|---|---|
| Mac | MacBook Air 13" Early 2015 (`MacBookAir7,2`), Intel i5-5350U, 8 Go |
| macOS | 12.6.7 Monterey — **c'est son plafond définitif** |
| Disque libre | 9,9 Go |
| Xcode | non installé |
| iPhone | iPhone 12 mini, **iOS 27.2** |

### Les trois murs qui excluent une app iOS native

1. **Pas d'app perso gratuite et permanente sur iOS.** Compte Apple gratuit → l'app expire au bout de 7 jours et doit être réinstallée depuis un Mac. Compte payant → 99 €/an. Pas de troisième voie. L'utilisateur a exigé gratuit **et** permanent **et** indépendant du Mac.
2. **macOS 12 plafonne à Xcode 14.2**, dont le SDK s'arrête à iOS 16. L'iPhone cible est en iOS 27 : onze versions d'écart, non contournable.
3. **9,9 Go libres** contre une trentaine nécessaires pour Xcode installé.

Chacun suffit. Les trois ensemble ferment définitivement la porte du natif.

### Contraintes fonctionnelles

- Audio : fichiers non protégés uniquement (mp3, m4a, wav), pris dans l'app Fichiers.
- Vidéos : prises dans la galerie Photos, déjà en vertical.
- **Longueur des clips : 20 à 30 s, déclaré par l'utilisateur comme son maximum habituel.** Aucun plafond imposé par l'app — l'utilisateur a répondu « une limite si c'est mieux, sinon non », et rien n'impose d'en poser une. Pire cas dimensionnant : **5 clips × 30 s = 150 s de matière à analyser.** C'est ce chiffre, et non 75 s, que la séance 1 doit mesurer.
- Sortie : 9:16, 15 à 25 s, durée fixée par l'app (décision validée).

### La matière source : 4K aujourd'hui, 1080p demain

> **Corrigé après la phase 0.** Cette section affirmait « 1080p 60 » et en
> tirait une copie sans aucune conversion. **C'est faux pour la matière
> actuelle** : toutes les vidéos de test sont en **4K**, et l'utilisateur
> déclare vouloir passer au 1080p ensuite. Les deux cas doivent tenir.

| | 4K (matière actuelle) | 1080p (matière visée) |
|---|---|---|
| Définition mesurée | 3840×2160 | 1920×1080 |
| Cadence mesurée | 30 img/s | 60 img/s annoncés |
| Vers 1080×1920 | **réduction** de définition | copie pixel pour pixel |

**Rotation : 90°.** Mesure de la phase 0, et elle était absente de ce
document. Les clips sont stockés **en paysage** et redressés par la matrice de
piste. Le moteur doit appliquer cette rotation avant tout cadrage, sans quoi
l'intégralité du montage sort couchée. Ce n'est pas un cas limite : c'est le
cas normal de l'iPhone.

Fait déclaré en séance, conservé pour mémoire :

| | |
|---|---|
| Définition | 1080×1920 en vertical — **2,1 Mpx** |
| Cadence | 60 img/s — **2× plus d'images** à parcourir qu'à 30 |
| Poids | ≈ 1,5 Mo/s en HEVC → un clip de 15 s ≈ **22 Mo**, cinq clips ≈ **110 Mo** |
| Mémoire | une seule image décodée en RGBA ≈ **8,3 Mo** |

> **Ce qui reste vrai :** quand la source est en 1080p, la chaîne ne redimensionne rien et le recadrage 9:16 se réduit à une copie pixel pour pixel. **Ce qui est faux pour la matière actuelle :** en 4K, sortir en 1080×1920 *est* une réduction, et le relevé de la sonde l'indique d'ailleurs en rouge.
>
> Deuxième cadeau : la sortie étant elle aussi à 60 img/s (voir « Format de sortie »), **il n'y a pas non plus de rééchantillonnage temporel**. Chaque image source devient une image de sortie, une pour une. Le montage se réduit à choisir lesquelles garder et dans quel ordre — jamais à en fabriquer.

Trois règles en découlent, non négociables dans l'implémentation :

1. **Un clip à la fois.** Jamais deux décodeurs ouverts simultanément.
2. **Aucune image pleine définition n'est conservée.** On réduit immédiatement, on mesure, on jette.
3. **On ne charge jamais un fichier entier en mémoire.** Lecture en flux.

> **À mesurer en première séance, pas à supposer :** on ignore ce que le sélecteur Photos d'iOS remet réellement à Safari — l'original HEVC 10 bits Dolby Vision, ou une copie transcodée en H.264 SDR. La réponse décide s'il faut gérer le HEVC et le HDR, et conditionne les seuils d'exposition du §5.2 : mesurés sur un canvas 8 bits, ils ne veulent pas dire la même chose selon le cas.

### Budget d'attente

**L'utilisateur a explicitement arbitré en faveur de la qualité contre la vitesse** : « le temps m'est égal, si cela te permet d'avoir une meilleure qualité on rallonge ». Il n'y a donc pas de plafond d'attente strict — mais l'attente doit être **annoncée et visible** (progression), et concentrée en une seule fois plutôt qu'éparpillée.

### Format de sortie

**1080×1920, 60 img/s — copie exacte de la source.**

- 1080×1920 parce que du 720 se voit sur Instagram, et que publier est tout l'objet du projet. Monter plus haut ne sert à rien : Instagram réencode et plafonne là.
- **60 img/s : tranché par l'utilisateur.** Une première rédaction proposait 30 pour diviser par deux le coût des trois encodages du §5.5. L'utilisateur a refusé ce compromis, conformément à son arbitrage directeur : *« garde 60 img/s »*.

> **Conséquence, et elle est la bienvenue : la chaîne entière est sans conversion.** Même définition qu'à la source, même cadence qu'à la source. Ni redimensionnement, ni décimation, ni interpolation nulle part. La seule perte de qualité du projet est celle du réencodage, et elle est inévitable.
>
> **Ce que ça coûte :** l'encodage double par rapport à 30 img/s, et il y a trois montages à encoder. C'est le poste de dépense principal de l'app. Si la mesure se révélait inacceptable, le repli reste celui du §5.5 — encoder les trois aperçus plus légèrement, puis le seul montage retenu en pleine qualité — **sans jamais toucher aux 60 img/s du fichier final**.

> **Précisions du 2026-11-19, après relecture de la conception révisée.**
>
> **La source n'est pas toujours à 60 img/s, contrairement à ce que cette section supposait.** La phase 0 a mesuré **30 img/s** sur un clip que l'utilisateur pense avoir filmé en 4K 60 : le sélecteur Photos transcode avant de remettre le fichier, et la cadence fait manifestement partie de ce qu'il change. L'affirmation « même cadence qu'à la source » est donc fausse dans le cas courant d'aujourd'hui.
>
> **Règle, et c'est un choix du rédacteur :** la sortie est à **60 img/s quelle que soit l'entrée**. Une source à 30 voit chaque image **tenue deux fois** — jamais interpolée. C'est la seule façon d'honorer l'arbitrage « garde 60 img/s » sans fabriquer d'image qui n'existe pas, et c'est aussi ce qui permet de mélanger un clip 4K/30 et un clip 1080p/60 dans le même montage sans que la cadence de sortie dépende de l'ordre des plans.
>
> **Le budget d'attente de 120 s (§5.5) ne déclenche plus rien à lui seul.** À 38,9 ms par image, trois reels de 20 s à 60 img/s coûtent ≈ **140 s**, soit au-dessus du budget. L'utilisateur a arbitré depuis : *« le temps m'est égal, si cela te permet d'avoir une meilleure qualité on rallonge »*. Le repli du §5.5 reste donc en réserve, déclenché par la **mémoire** — la réserve jamais levée de la phase 0 — et non par la durée.

---

## 4. Approches considérées

### Sur la forme de l'app

**A — App iOS native (SwiftUI + AVFoundation + Vision).** La meilleure qualité technique : décodage matériel, `AVMutableComposition` pour une lecture instantanée, `VNDetectHorizonRequest` et `VNGenerateImageFeaturePrintRequest` prêts à l'emploi. **Écartée** : impossible à construire sur le Mac disponible, et impossible à garder installée gratuitement (§3).

**B — Native + achat de matériel.** Un Mac mini d'occasion (~450 €) et 99 €/an de compte développeur lèvent tous les murs. **Écartée par l'utilisateur** : il ne veut rien payer.

**C — App web installée sur l'écran d'accueil (PWA). ✅ Retenue.** Ouverte une fois dans Safari, ajoutée à l'écran d'accueil, elle devient une icône plein écran. N'expire jamais, ne coûte rien, ne demande aucun compte développeur, ne dépend plus du Mac une fois publiée, et fonctionne hors ligne.

**Pourquoi C gagne au-delà du simple fait d'être possible :** le même code tourne dans le navigateur du Mac et sur l'iPhone. L'utilisateur voulait pouvoir itérer sur Mac puis figer une version pour le téléphone — avec une app web, c'est le fonctionnement naturel, sans rien reconstruire.

**Ce que C coûte, honnêtement :** les outils d'analyse d'image d'Apple (horizon, empreinte d'image) n'existent pas côté web et doivent être réécrits en plus simple (§5.2). Moins fin que le natif, suffisant pour les critères retenus.

### Sur le choix du passage musical

*Ajouté le 2026-11-19, après le rejet à l'écoute de la règle automatique (§5.1 bis).*

**A — Une seule piste, façon Instagram. ✅ Retenue par l'utilisateur.** Tout le morceau sur la largeur de l'écran, une fenêtre de longueur imposée qu'on fait glisser dessus. Familier, peu de code, la structure du morceau se lit d'un coup d'œil. **Ce qu'elle coûte :** 1 pixel par seconde — le doigt ne peut pas viser un temps. Compensé par deux boutons de réglage fin.

**B — Deux pistes : vue d'ensemble + réglage fin zoomé.** La piste du haut dit *où dans le morceau*, celle du bas (~8 px/s) *sur quelle mesure*, avec les traits de mesure visibles. **Recommandée par le rédacteur, écartée par l'utilisateur** : écran plus chargé, deux fois plus de dessin, pour un gain qu'il juge faible face à deux boutons. Reste la porte de sortie si le réglage au bouton déçoit — c'est un ajout par-dessus A, pas une refonte.

**C — Écouter et marquer, sans forme d'onde.** Un bouton lecture, un bouton « commencer ici ». **Écartée par le rédacteur** : il faudrait écouter cinq minutes pour retrouver un passage. C'est justement la forme d'onde qui rend le choix instantané — l'utilisateur a désigné le bon endroit sur une copie d'écran, sans rien écouter.

### Sur l'organisation du code

**C₂ — Moteur en module séparé, branché tôt dans l'app. ✅ Retenue.** Un module `engine/`, logique pure, sans interface, testable **dans le navigateur du Mac en quelques secondes** contre de vrais fichiers. Par-dessus, une interface mince.

Écartées : « l'app d'abord, le cerveau après » (chaque réglage du moteur coûterait un aller-retour complet) et « le cerveau d'abord, l'app après » (l'utilisateur n'aurait rien dans les mains pendant trop longtemps).

---

## 5. Conception

### 5.1 Parcours utilisateur

1. Ouvrir STUDIO depuis l'écran d'accueil.
2. Choisir 2 à 5 vidéos dans la galerie.
3. Choisir un fichier audio dans Fichiers. L'app l'analyse et affiche sa piste.
4. **Désigner le passage** : faire glisser la fenêtre sur la piste, écouter, valider (§5.1 bis).
5. Lancer. L'app analyse les vidéos, puis construit et **encode trois montages**. C'est la seule attente du parcours, avec une progression visible.
6. Regarder les trois. Ce sont de vraies vidéos finies : ce qu'il voit est exactement ce qu'il obtiendra.
7. En garder une — **instantané**, le fichier existe déjà. Les deux autres sont jetées.
8. Le partage iOS s'ouvre → « Enregistrer la vidéo » → la galerie.
9. L'utilisateur ouvre Instagram et publie lui-même.

Aucun écran de réglage n'existe nulle part dans ce parcours. Un seul écran de **choix**, à l'étape 4, et il ne porte sur aucun paramètre du montage.

**Si aucune des trois ne convient :** un bouton « trois autres » relance la construction sur les mêmes fichiers, avec une sélection différente. L'analyse n'est pas refaite — seuls le choix des segments et l'ordre changent, puis les trois sont réencodés. *Décision du rédacteur : l'utilisateur ne doit jamais se retrouver sans issue devant trois propositions qu'il n'aime pas.*

### 5.1 bis — L'écran de choix du passage musical

**Pourquoi il existe.** La règle automatique du §5.3 a été validée à l'oreille le 2026-11-19, et rejetée. Elle ne se trompe pas de calcul : elle désigne bien un vrai saut d'énergie. Mais elle désigne toujours le même — **intro calme → entrée du groupe**. Dans un morceau de metal c'est arithmétiquement le plus grand écart du morceau, et musicalement l'endroit le plus attendu. Le passage qui porte un reel est plus loin : la reprise après la cassure, le drop après le pont. **Le signal ne porte pas cette information** ; il faut connaître le morceau. Mesure à l'appui dans `2026-11-16-validation-audio.md`.

**Ce n'est pas un réglage** — il faut le dire, parce que l'anti-objectif 1 est juste à côté. L'utilisateur choisit déjà ses vidéos et son morceau ; choisir *quelles vingt secondes du morceau* est le même geste : on désigne la matière, on ne dirige pas le montage. Aucun curseur de cet écran ne touche au montage — ni la durée, ni la densité des coupes, ni l'ordre des plans.

**La forme : une seule piste, façon Instagram.** Approche A, choisie par l'utilisateur le 2026-11-19 contre l'approche B (deux pistes, vue d'ensemble + réglage fin zoomé).

```
┌─────────────────────────────────────┐
│ ▂▃▁▂▅▆▅▆▃▁▂▄▆▇▆▇▆▅▂▁▃▅▇█▇█▇▆▃▁      │   tout le morceau
│              ┃█████████┃            │   la fenêtre, longueur imposée
└─────────────────────────────────────┘
   ◀ 1 temps     ▶ ÉCOUTER     1 temps ▶
```

- La **piste entière** est dessinée sur la largeur de l'écran, sous forme d'enveloppe d'énergie — celle du §5.3, déjà calculée. C'est elle qui rend le choix instantané : la structure du morceau se lit d'un coup d'œil, sans écouter.
- Une **fenêtre de longueur imposée** par l'app (§5.4 bis) se déplace dessus au doigt. Sa longueur ne se règle pas.
- Au relâché, la fenêtre **se cale sur le temps le plus proche**, et la musique se joue en boucle depuis son début.
- Deux boutons **`◀ 1 temps`** et **`1 temps ▶`** font le réglage fin.

**Pourquoi des boutons, et c'est la décision à surveiller.** *Choix du rédacteur.* Un morceau de 4 min 53 étalé sur 343 px, c'est **1 pixel par seconde** : à 140 BPM, un pixel vaut plus de deux temps. Le doigt ne peut donc viser ni un temps, ni une mesure — la piste sert à **trouver** l'endroit, les boutons à le **régler**. L'approche B réglait cela par une seconde piste zoomée (~8 px/s) ; l'utilisateur l'a écartée. **Si le réglage au bouton s'avère pénible à l'usage, la piste zoomée s'ajoute par-dessus sans rien casser** : c'est un ajout, pas une refonte.

**Position d'ouverture :** le plus grand saut d'énergie du morceau — l'ancienne règle, rétrogradée au rang de simple suggestion de départ. Elle a le mérite de ne jamais ouvrir sur du silence.

**Bords du morceau :** la fenêtre ne peut pas sortir du morceau. Si le morceau est plus court que la fenêtre, l'app le refuse et le dit.

**Ce que l'écran n'affiche pas : l'indice de confiance du tempo.** *Choix du rédacteur.* Il annonçait « 10 % — tempo peu fiable : morceau sans percussion nette ? », en rouge, sur un morceau dont la grille des temps était jugée juste à l'oreille (2026-11-19). Un indicateur qui crie au loup coûte plus qu'il ne rapporte. L'utilisateur entend désormais la musique pendant qu'il choisit : **l'oreille est le contrôle**. La valeur reste calculée, et reste affichée au banc d'essai.

### 5.2 Moteur d'analyse vidéo

Chaque clip est décodé image par image en basse résolution (≈192 px de large) et chaque image reçoit quatre mesures.

**Critères de rejet** — figés avec l'utilisateur :

**Avant toute mesure, la rotation de la piste est appliquée** (90° sur la
matière mesurée). Les critères ci-dessous portent sur l'image redressée.

| Critère | Mesure | Rejette |
|---|---|---|
| Netteté | variance du laplacien | le flou de marche, le pied qui tape |
| Horizon | orientation dominante des contours | le cadre de travers, l'objectif vers le sol |
| Exposition | % de pixels cramés / bouchés | le ciel brûlé, le sous-bois noir |
| Ressemblance | empreinte d'image réduite | deux segments consécutifs qui se ressemblent |

**Plus une règle forfaitaire :** jeter la première et la dernière seconde de chaque vidéo — là où l'on appuie sur le bouton.

> **Piège identifié en séance, à ne pas réintroduire.** La recette habituelle d'un monteur automatique est « garder les moments où ça bouge ». Sur cette matière, **le mouvement n'est pas un signal de qualité** : tout bouge en permanence puisque l'utilisateur filme en marchant, et les pics de mouvement sont souvent les images les plus ratées. Tout critère fondé sur la quantité de mouvement est explicitement proscrit.

**Cadence d'analyse : 20 images par seconde, pas toutes les images.** *Décision du rédacteur, à relire à la lumière de l'arbitrage qualité-contre-vitesse.* La source est à 60 img/s. Une première version proposait 10 Hz pour aller vite — mais puisque l'utilisateur a explicitement accepté d'attendre pour gagner en qualité, le réglage doit suivre ce que la détection exige, pas ce qui est rapide. À 10 Hz, une secousse de marche de 120 ms peut passer entre deux mesures ; **à 20 Hz (une image sur trois), plus aucune n'échappe**, pour un tiers du coût d'une analyse exhaustive. Les bornes des plages retenues sont de toute façon recalées ensuite sur la grille des temps.

Sortie du moteur : pour chaque clip, une liste de **plages exploitables** avec leur note de qualité.

### 5.3 Moteur d'analyse audio

Chaîne validée par la mesure (§6.1) :

1. Décodage → mono.
2. STFT, fenêtre 1024, saut 512.
3. Flux spectral → enveloppe des attaques.
4. Autocorrélation de l'enveloppe → tempo.
5. Calage de phase → **grille des temps** (le tempo seul ne suffit pas : il faut savoir *où* tombent les temps).
6. Enveloppe lissée (~2 s) → **point culminant local** : le plus grand saut d'énergie vers le haut **à l'intérieur de la fenêtre choisie** (§5.1 bis). C'est lui, et lui seul, qui place la rafale du §5.4.

> **Révision du 2026-11-19 — deux étapes disparaissent.**
>
> **La segmentation en sections est abandonnée.** Mesurée sur un morceau réel : **36 sections sur 4 min 53**, soit une toutes les 8 secondes. Ce n'est pas de l'information, c'est du bruit. Rien en aval ne s'en servait.
>
> **Le point culminant change d'échelle, il ne disparaît pas.** Sur un morceau entier, « le plus grand saut d'énergie » désigne toujours la fin de l'intro, et c'est le mauvais passage (§5.1 bis). Sur les vingt secondes que l'utilisateur a choisies, la même question redevient une question à laquelle le signal sait répondre : où, dans ce passage, ça frappe le plus fort. C'est exactement ce dont la rafale a besoin.

> **Correction issue de l'essai du 2026-11-14.** La première version prenait le *maximum* de l'enveloppe. À l'écoute, l'utilisateur a constaté que le point culminant ressenti se situe **juste après la montée**, pas au sommet.
>
> Il a raison, et la raison est structurelle : un morceau de metal passe ses deux dernières minutes à pleine énergie, donc le maximum n'y désigne plus rien. **Ce qui frappe à l'oreille n'est pas « le plus fort », c'est « le moment où ça devient fort »** — la rupture, pas le sommet. Le détecteur cherche donc la plus forte marche montante.

### 5.4 Moteur de montage — logique « C », validée

Choisie par l'utilisateur après écoute comparée de trois logiques (maquette `Banc de rythme STUDIO`). **La densité des coupes suit l'énergie du morceau.**

Forme de référence, mesurée à 150 BPM sur 20 s (50 temps) :

| Phase | Densité | Effet |
|---|---|---|
| Ouverture | 1 plan de 8 temps | un plan large qui s'installe |
| Montée | 1 coupe / 4 temps | ça se met en marche |
| Corps | 1 coupe / 2 temps | le régime de croisière |
| **Point culminant** | **4 coupes d'1 temps** | la rafale sèche |
| Sortie | 1 plan de 6 temps | ça retombe |

≈ 20 coupes, de 0,40 s à 3,20 s.

**Règles invariantes :**

- Toute coupe tombe **sur un temps**. Jamais entre deux.
- **Coupes franches uniquement.** Aucune transition, aucun fondu.
- La rafale est alignée sur le **point culminant local** (§5.3, point 6) : le plus grand saut d'énergie à l'intérieur de la fenêtre. Si la fenêtre ne contient aucun saut net, la rafale reste à sa place théorique dans la forme.
- Deux segments consécutifs ne doivent pas se ressembler (§5.2).
- Un même instant source n'est jamais utilisé deux fois.

> **Conséquence arithmétique à garder en tête.** Avec 3 clips et ~20 coupes, le moteur revient **6 à 8 fois** dans chaque vidéo. Il ne suffit donc pas de trouver « le meilleur moment » de chaque clip : il faut extraire de **chaque vidéo plusieurs plages distinctes et exploitables**. C'est ce qui dimensionne le moteur d'analyse vidéo.

**Les trois propositions** partagent la grille des temps, la structure et la forme ci-dessus. Elles diffèrent par **la sélection des segments et l'ordre des clips**. L'utilisateur compare trois montages du même morceau, pas trois théories du montage.

**La dissemblance est une pénalité, pas une interdiction.** *Choix du rédacteur, 2026-11-19.* Prise comme contrainte dure, elle se bloque avec l'anti-objectif 2 : sur de la marche en paysage, deux moments du même clip se ressemblent par nature — même chemin, mêmes arbres, même lumière — donc avec 2 clips et 20 coupes, « jamais deux segments semblables » et « jamais ABABAB » n'ont pas de solution commune. Le sélecteur **minimise une somme de pénalités** (ressemblance entre segments voisins, régularité de l'alternance) plutôt que d'appliquer des règles qui s'excluent. Il préfère donc deux plans un peu semblables du même clip à une alternance mécanique, mais paie ce choix et ne le répète pas vingt fois.

**Chaque clip ajouté apparaît au moins une fois.** *Choix du rédacteur.* L'utilisateur a choisi ses 2 à 5 vidéos ; en écarter une sans le dire serait incompréhensible. Un clip qui note mal est **moins** utilisé, jamais supprimé. Seul le clip *entièrement* inexploitable fait exception, et l'app le dit alors explicitement (§8).

**Pas de rotation stricte entre clips.** La maquette alternait les clips à tour de rôle (1, 2, 3, 1, 2, 3…), mais ce n'est pas ce que l'utilisateur a validé — il a validé le *rythme*. Avec 2 clips, une rotation stricte donnerait ABABAB vingt fois, soit exactement l'anti-objectif 2. La sélection se fait donc **par qualité et par dissemblance** : deux segments du même clip peuvent se suivre s'ils ne se ressemblent pas.

### 5.4 bis — Où l'extrait se place dans le morceau

La forme ci-dessus fait 50 temps. Un morceau en fait environ 700. Il faut donc la règle qui dit *où* se placer.

**C'est l'utilisateur qui le dit**, en faisant glisser la fenêtre (§5.1 bis). *Révisé le 2026-11-19 : la rédaction précédente ancrait l'extrait sur le point culminant détecté — « 38 temps avant, 12 temps après » — et cette règle a été rejetée à l'écoute.*

**La longueur, elle, reste fixée par l'app** — décision de l'utilisateur du 2026-11-16, reconduite explicitement le 2026-11-19 : « l'app fixe la durée, je fais glisser la fenêtre ». Elle vaut **50 temps au tempo détecté**, soit la forme du §5.4 bout à bout : 21,4 s à 140 BPM, 20,0 s à 150 BPM.

**Le début de la fenêtre tombe sur un temps**, par calage au relâché. La première coupe du montage est donc sur le rythme par construction, ce que l'entrée franche du son rend audible immédiatement.

**Adaptation au tempo.** 50 temps ne font pas la même durée partout : 14 s à 210 BPM, 37 s à 80 BPM. La fourchette 15–25 s est prioritaire. Hors fourchette, on ajuste en retirant ou en ajoutant des temps **dans le corps et la sortie uniquement** — l'ouverture, la montée et la rafale gardent leur forme, puisque c'est elle que l'utilisateur a validée à l'oreille.

**Entrée et sortie du son** — tranché par l'utilisateur :

- **Entrée : coupe franche.** En plein milieu du morceau, sans fondu. C'est du metal, la première image doit cogner.
- **Sortie : fondu court (~0,4 s).** Une coupe franche en fin produit un claquement désagréable.

### 5.5 Lecture et export

> **Révision importante.** La première rédaction prévoyait un aperçu composé à la volée (plusieurs vidéos, un canvas, l'horloge audio), afin que seul l'export coûte cher. Le relecteur a montré que cet aperçu hoquetterait forcément : pendant la rafale les coupes s'enchaînent toutes les 0,4 s, or les vidéos iPhone n'ont une image-clé que toutes les 1 à 4 s — chaque point d'entrée est donc un saut coûteux. Interrogé, l'utilisateur a répondu : la qualité du fichier final prime, et **il préfère que l'aperçu soit identique à la vidéo finale**, le temps lui étant égal.

**Les trois propositions sont donc entièrement encodées, puis regardées comme de simples vidéos.**

**Encodage (les trois) :** **WebCodecs**, image par image, **hors de toute horloge temps réel**, en 1080×1920 à 60 img/s. Séquentiel, un montage après l'autre.

> `MediaRecorder` a été essayé et rejeté : il filme le canvas en temps réel, donc toute image en retard est perdue — saccades constatées à la mesure (§6.2). WebCodecs encode chaque image quand elle est prête. **Pas de saccade par construction.**

**Lecture des propositions :** trois fichiers déjà encodés, lus par un lecteur vidéo ordinaire. Fluidité parfaite, et ce que l'utilisateur regarde **est** le fichier final, à l'image près.

**Ce que cette révision fait gagner :**

- le compositeur temps réel disparaît — plus de sauts non-clés, plus de limite de décodeurs simultanés, plus de synchronisation sur l'horloge audio ;
- l'aperçu devient fidèle par construction, pas par approximation ;
- **garder une proposition devient instantané** : le fichier existe déjà, il n'y a plus de seconde attente après le choix.

**Ce qu'elle coûte :** trois encodages au lieu d'un, dont deux seront jetés. L'attente est plus longue et **concentrée avant le choix** — arbitrage explicitement accepté par l'utilisateur.

**Repli si la mesure de séance 1 montre que trois encodages 1080p sont trop lourds** (temps ou mémoire) : encoder les trois en 540×960, puis réencoder en 1080×1920 la seule proposition retenue. L'aperçu reste fluide et représentatif, au prix d'une seconde attente après le choix.

**L'écran reste allumé pendant l'attente.** *Choix du rédacteur, 2026-11-19.* L'attente se compte désormais en minutes, et iOS suspend les codecs d'un onglet passé en arrière-plan ou d'un écran verrouillé — l'encodage s'arrêterait au milieu. L'app prend donc un **verrou de réveil** (`navigator.wakeLock`, disponible sur Safari iOS) pour toute la durée de l'analyse et des trois encodages, et le relâche à la fin.

> **Ce que ça ne couvre pas :** l'utilisateur qui quitte volontairement l'app. Dans ce cas la construction repart de zéro au retour. Livrer les propositions une par une pour limiter la perte serait exactement l'anti-objectif 5 (« une attente étalée en plusieurs pauses ») : écarté.

**Enregistrement :** partage iOS avec le fichier → « Enregistrer la vidéo » → galerie.

### 5.6 Hébergement et installation

**GitHub Pages.** Gratuit sans échéance, HTTPS fourni (obligatoire pour le hors-ligne), publication par simple envoi des fichiers, et correction possible depuis l'interface web **sans le Mac**.

**Réserve assumée :** en compte gratuit, le dépôt doit être **public**. Sans conséquence ici (aucun secret, aucune donnée). Si un dépôt privé devient souhaité : Cloudflare Pages, gratuit également.

Un *service worker* met l'app en cache pour qu'elle démarre hors ligne. Les fichiers de l'utilisateur ne sont jamais envoyés nulle part.

### Deux règles d'ingénierie imposées par la phase 0

Elles ne sont pas des préférences de style : chacune a coûté plusieurs heures.

1. **Tout callback de codec WebCodecs porte un `try/catch` qui enregistre
   l'erreur.** Une exception levée dans un callback `output` s'exécute dans sa
   propre tâche et **ne remonte jamais** : la chaîne meurt en silence et le
   symptôme apparaît ailleurs, des dizaines de lignes plus loin.
2. **Chaque étape a son propre compteur.** Un compteur unique mélangeant
   « produit par l'encodeur » et « accepté par le muxeur » a fait accuser
   l'encodeur pendant cinq hypothèses successives, alors que l'encodeur
   fonctionnait depuis le début.

Corollaire pour les moteurs de la phase 1 : aucun seuil ne se règle à
l'aveugle. Tout réglage doit être **lisible et mesurable** sur un banc, pas
deviné puis enterré dans le code.

---

## 6. Mesures de l'essai jetable

Relevées sur l'iPhone 12 mini / iOS 27.2 (maquette `Sonde STUDIO`, code jeté).

### 6.1 Ce qui est acquis

| Mesure | Résultat | Lecture |
|---|---|---|
| Capacités | WebCodecs présent, 5 conteneurs d'export | la voie est ouverte |
| Audio — décodage | 702 ms (morceau de 4 min 53, 48 kHz) | négligeable |
| Audio — flux spectral | 27 458 fenêtres en 1,05 s | négligeable |
| **Audio — total** | **1,75 s** | **analyse du morceau entier à chaque lancement** |
| Tempo détecté | 140,6 BPM | confirmé correct à l'oreille |
| Vidéo — analyse **échantillonnée** | 5 s en 1,40 s = 3,6× le temps réel | voir l'avertissement ci-dessous |
| Détection du flou | creux nets sur la courbe | le critère fonctionne |
| Recadrage 9:16 | 720×1280, 148 images en 5,26 s | le cadrage est bon |
| Poids produit | 5,93 Mo pour 5 s → ~24 Mo pour 20 s | sain pour Instagram |

> **Avertissement — ces mesures ne disent pas ce qu'une première rédaction leur faisait dire.**
>
> **a) L'analyse vidéo était échantillonnée, pas exhaustive.** Le 3,6× provient de la passe à vitesse ×4, qui ne livre que les images effectivement affichées : environ **une image sur quatre** (~8 img/s), et non chaque image comme le §5.2 le laissait entendre. Analyser *toutes* les images coûterait environ le temps réel, soit ~75 s pour 5 clips de 15 s. L'utilisateur ayant depuis arbitré pour la qualité contre la vitesse, ce coût n'est plus disqualifiant : le §5.2 fixe la cadence d'analyse sur ce que la détection exige, pas sur ce qui va vite.
>
> **b) Les chiffres d'export viennent de `MediaRecorder`, la méthode rejetée.** Ils valident le recadrage et le poids, rien d'autre. **La chaîne WebCodecs retenue au §5.5 n'a aucune mesure derrière elle** : la sonde s'est contentée de vérifier que `VideoEncoder` existe. Elle n'a ni démuxé, ni décodé, ni encodé, ni muxé. Voir risque n°6.

### 6.2 Ce que l'essai a cassé

1. **Point culminant mal défini.** Corrigé en §5.3. *Découverte la plus précieuse de la séance.*
2. **Saccades à l'export.** `MediaRecorder` abandonné au profit de WebCodecs (§5.5).
3. **Partage de fichier refusé** (`mp4`). Très probablement dû au bac à sable de la maquette, qui n'autorise pas le partage. **Non vérifié hors de ce cadre** → risque n°1.

---

## 7. Risques

| # | Risque | Gravité | Traitement |
|---|---|---|---|
| 1 | Le partage iOS refuse le mp4 même hébergé → impossible d'écrire dans la galerie | **Bloquant** | **À vérifier en tout premier**, avant toute autre ligne de code. Repli : téléchargement vers Fichiers, puis ajout manuel à Photos |
| 2 | L'encodage audio AAC via WebCodecs indisponible sur Safari | **Bloquant** | À vérifier en même temps que le n°1. Repli : muxer l'audio sans réencodage |
| 3 | Mémoire insuffisante (iPhone 12 mini) sur 5 clips | Élevée | Traiter **un clip à la fois** ; ne garder que les données d'analyse réduites, jamais les images pleines |
| 4 | Démuxage mp4 en JavaScript plus lourd que prévu | Moyenne | Bibliothèque éprouvée plutôt qu'un démuxeur maison |
| 5 | Safari purge le cache de l'app web | Faible | Sans gravité : rouvrir le lien la réinstalle |
| 6 | **La chaîne WebCodecs n'a jamais été mesurée** — seulement détectée. Aucune preuve que Safari produise des flux avc1 exploitables, ni de démuxage, ni de muxage | **Bloquant** | À inclure dans la vérification de première séance : un aller-retour complet démux → décode → compose → encode → mux → partage, sur un seul clip. `MediaRecorder` étant écarté, il n'existe pas de repli |
| 7 | ~~Aperçu temps réel saccadé~~ | **Éteint** | Le risque a disparu avec la révision du §5.5 : il n'y a plus d'aperçu composé à la volée. Les trois propositions sont encodées puis lues comme des vidéos ordinaires |
| 8 | **Source 1080p 60 fps** : deux fois plus d'images à parcourir qu'à 30, ~110 Mo de fichiers pour 5 clips | Moyenne | Un clip à la fois, réduction immédiate, aucune image pleine définition conservée, lecture en flux (§3). À mesurer en séance 1 sur un vrai clip 1080p60 |
| 9 | Trois encodages 1080p au lieu d'un : temps et mémoire | Moyenne | Mesure en séance 1. Repli documenté au §5.5 : trois aperçus en 540×960, puis réencodage 1080p du seul montage retenu |

**Les risques 1 et 2 se vérifient ensemble, en première séance.** Si les deux tombent, la forme de l'app est à rediscuter — mieux vaut le savoir en une séance qu'en dix.

---

## 8. Ce qui est laissé à l'ouvrier

À décider pendant la construction, en s'appuyant sur de vrais fichiers :

- **Seuils chiffrés** de rejet (netteté, inclinaison d'horizon, exposition, ressemblance) — à régler contre les vraies vidéos, non devinables à l'avance.
- **Nombre et longueur** des plages extraites par clip.
- Méthode de calage de phase de la grille des temps.
- Méthode de segmentation en sections, et définition chiffrée du « saut d'énergie ».
- Ce qui distingue concrètement les trois propositions (graine aléatoire, ordre des clips, ou les deux).
- Dessin de l'interface — sous contrainte absolue : **aucun réglage de montage**.
- Choix des bibliothèques (démuxage, muxage mp4).
- Comportements de repli : matière insuffisante, morceau trop court, clip entièrement rejeté.

### Environnement de développement

**Le moteur se met au point dans Chrome sur le Mac**, pas dans Safari : le Mac est bloqué en macOS 12, donc en Safari 16, trop ancien pour la chaîne WebCodecs. Chrome y tourne encore et la fournit.

Ce que la boucle Mac couvre : l'analyse audio, l'analyse d'image, la logique de montage — tout ce qui est calcul pur, testable en quelques secondes sur de vrais fichiers.

Ce qu'elle ne couvre **pas**, et qui ne se vérifie que sur l'iPhone : le décodage HEVC (le Broadwell de 2015 n'a aucune accélération matérielle pour ce codec, et le fera donc en logiciel, lentement), l'encodage réel, le partage iOS. **Le décodage et l'export doivent donc être isolés derrière une interface** que la boucle Mac peut remplacer par un substitut.

---

## 9. État d'avancement et suite

### Fait

**Phase 0 — socle de mesure.** Verdict **go**. Les cinq questions bloquantes ont leur réponse sur l'appareil : H.264 8 bits en entrée, chaîne démux→décode→recadre→encode→mux fonctionnelle, partage vers la galerie avec le son, 38,9 ms par image. Détail et réserves : `2026-11-16-mesures-phase-0.md`.

**Phase 1A — moteur audio.** La **grille des temps est acquise** : validée à l'oreille sur plusieurs morceaux, 19 ppm d'erreur de tempo et 2 ms de dérive à 190 s en mesure synthétique. La **règle du point culminant global est rejetée** et remplacée par le §5.1 bis. Détail : `2026-11-16-validation-audio.md`.

### Suite

**Phase 1B — moteur d'analyse vidéo (§5.2),** avec son banc visuel. Indépendante du §5.1 bis : rien de ce qui précède ne la change.

> **La remesure de la colorimétrie ne bloque pas 1B.** *Choix du rédacteur, 2026-11-19.* Elle tient en une station sur l'appareil, à placer en **première tâche** de 1B : elle lit la boîte `colr` des vrais clips et rend sa réponse en une minute. Les seuils d'exposition du §5.2 se règlent ensuite en supposant le SDR ; si la mesure contredit, seul le critère d'exposition est à reprendre, pas le reste du moteur.

**Phase 1C — écran de choix du passage (§5.1 bis) et moteur de montage (§5.4).** C'est ici que s'appliquent les révisions du 2026-11-19.

### Les réserves que la phase 1 doit lever

Héritées de la phase 0, et toujours ouvertes :

1. **La mémoire n'a jamais été mesurée** (`performance.memory` n'existe pas sur Safari). Le risque 3 reste entier et non chiffré.
2. **Un seul clip a été traité, jamais cinq.** Le pire cas dimensionnant — 5 clips × 30 s — n'a pas été éprouvé.
3. **Aucun reel de 20 s n'a été produit en entier.** Les 23 s et 70 s sont extrapolées depuis 5 s réelles.
4. **La colorimétrie n'a jamais été lue** : la conclusion « pas de HDR » est à remesurer.

La construction se fait **en mode caveman** à la demande de l'utilisateur, pour limiter le coût en jetons.
