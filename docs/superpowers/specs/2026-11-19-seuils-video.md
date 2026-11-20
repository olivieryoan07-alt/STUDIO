# STUDIO — Réglage des seuils du moteur vidéo

**Appareil :** iPhone 12 mini, iOS 27.2 · **App :** v0.22.0 · **Date :** 2026-11-20
**Banc :** `bench-video.html` · **Plan :** `docs/superpowers/plans/2026-11-19-phase-1b-moteur-video.md`

> Première série. Les valeurs sont lues sur des enregistrements d'écran de
> l'appareil. Aucune n'est estimée.

---

## Ce que la série a mesuré

Quatre clips, **409 images mesurées** en tout.

| | durée | mesures | netteté min / méd / p90 / max | force d'horizon max | rejets | plages retenues |
|---|---|---|---|---|---|---|
| A | 6,6 s | 175 | 10,3 / 84,9 / 380 / 1648 | 0,08 | bord 57 · netteté 66 | 3, de 0,51 à 0,83 s, notes 0,14 à 0,05 |
| B | 3,2 s | 90 | 8,1 / 53,6 / 84,5 / 117 | 0,08 | bord 53 · netteté 12 | 1, 0,53 s, note 0,70 |
| C | ~2,6 s | 78 | 13,8 / 71,1 / 227 / 307 | 0,06 | bord 60 · netteté 4 | **aucune** |
| D | ~2,2 s | 66 | 14,2 / 97,7 / 199 / 265 | 0,07 | bord 59 · netteté 0 | **aucune** |

Exposition : **jamais un motif de rejet**, sur aucun clip. Cramé plafonne à
4,8 % pour un seuil à 8 %. Bouché monte à 18,4 % sur le clip A, pour un seuil
à 20 % — c'est le seul critère d'exposition qui soit passé près.

Vitesse : clip A analysé en **2290 ms pour 6,6 s** de vidéo, clip B en
**1203 ms pour 3,2 s**. Soit ≈ **0,35 × le temps réel**. Le pire cas du §3 —
5 clips × 30 s — coûterait donc ≈ **52 s** d'analyse.

---

## 1. Le critère d'horizon ne s'est jamais déclenché

**0 angle mesuré sur 409 images**, sur les quatre clips. La force de
l'horizon plafonne à **0,08** là où le seuil était à **0,12**.

**La cause n'est pas le seuil, c'est l'échelle.** La force valait « la part de
l'énergie de contour tombée dans les trois degrés dominants ». Cette part n'a
pas d'unité lisible : elle dépend du nombre de classes de l'histogramme, et
sur une image texturée — feuillage, herbe, gravier, c'est-à-dire chaque plan
de marche — elle est forcément minuscule, quelle que soit la netteté de
l'horizon. Rien dans le nombre ne disait à partir de quand il était grand.

**Correction, v0.23.0 :** la force se lit désormais **en multiples du
hasard**. Trois degrés sur les cent quatre-vingts que peut prendre une ligne,
c'est la part qu'une image sans direction privilégiée y met par chance.

- bruit pur : **1,05** — le hasard, par construction ;
- horizon synthétique net : **60** ;
- la matière réelle mesurée ci-dessus : médiane **1,8**, maximum **4,8**.

`HORIZON_FORCE_MIN` passe donc de 0,12 à **3**, ce qui retient à peu près le
dernier cinquième des images — celles qui ont vraiment une ligne. **Valeur
provisoire :** elle n'a pas encore été confrontée à un clip dont on sache
qu'il est de travers.

---

## 2. Cette série ne peut pas régler les seuils de qualité

**Les clips sont trop courts.** La règle du §5.2 — jeter la première et la
dernière seconde — retire deux secondes à chacun. Sur un clip de 3 secondes,
c'est les deux tiers. D'où le résultat : le **bord est le premier motif de
rejet sur les quatre clips**, et deux d'entre eux ne rendent aucune plage non
pas parce qu'ils sont mauvais, mais parce qu'il ne reste rien à regarder.

Le clip D le dit nettement : **59 rejets de bord, 0 rejet de netteté**, et
aucune plage. Rien dans ce clip n'a été jugé mauvais ; il était trop court.

**Il manque aussi l'essentiel : on ne sait pas quels clips étaient censés être
rejetés.** Sans cette correspondance, on ne peut pas dire si le seuil de
netteté attrape les bonnes images — seulement qu'il en attrape 38 % du clip A
et 13 % du clip B.

**Ce qu'il faut pour la série suivante :**

1. des clips de **20 à 30 secondes**, la vraie longueur de la matière (§3) ;
2. savoir, pour chacun, **s'il est bon ou raté, et pourquoi** — flou de
   marche, cadre de travers, ciel brûlé, sous-bois bouché.

---

## 3. Ce que la série valide quand même

- **Le seuil de netteté est dans la bonne région.** Médianes mesurées : 84,9 /
  53,6 / 71,1 / 97,7 pour un seuil à 60. Il tranche à l'intérieur de la
  distribution, pas à côté — ce qui est la condition pour qu'il serve à
  quelque chose. Reste à savoir s'il tranche au bon endroit.
- **Les seuils d'exposition ne gênent pas.** Aucun rejet abusif.
- **La cadence d'analyse est tenue.** Clip B : 90 paquets, 90 décodées,
  90 mesurées — un pas de 1 sur une source à 30 img/s, donc 30 mesures par
  seconde, au-dessus du plancher de 20 du §5.2. La correction de la relecture
  (`Math.floor` au lieu de `Math.round`) fait ce qu'on attendait d'elle.
- **Le budget de temps est confortable**, voir plus haut.
- **La station 03 passe après l'extraction du démuxeur** : source 4K 30 img/s
  rotation 90°, matériel des deux côtés, **150 images produites, 150 muxées**,
  237 paquets audio, **son muxé**. L'extraction de `demux.js` hors de
  `roundtrip.js` n'a rien cassé sur l'appareil.
- **La colorimétrie reste non lue** sur cette matière : la boîte `colr` est
  absente. La réserve de la phase 0 ne peut donc pas être levée par la
  lecture — elle est close autrement : il n'y a pas de métadonnée de
  colorimétrie à lire, donc rien qui annonce du HDR.

---

# Deuxième série — 2026-11-20, v0.23.0, deux clips étiquetés

L'utilisateur a cette fois dit **lequel est bon et lequel est raté**. C'est ce
qui manquait à la première série, et c'est ce qui permet de trancher.

| | min | méd. | p90 | max | seuil |
|---|---|---|---|---|---|
| **netteté — clip BON** | 5,62 | **108** | 294 | 556 | 60 |
| **netteté — clip RATÉ** | 4,24 | **19,4** | **51,0** | 439 | 60 |
| inclinaison — bon | 0,33 | 0,52 | 44,50 | 44,50 | 8 |
| inclinaison — raté | 0,50 | 0,54 | 44,50 | 44,50 | 8 |
| force d'horizon — bon | 0,74 | 1,92 | 3,59 | 10,38 | 3 |
| force d'horizon — raté | 0,24 | 2,59 | 4,42 | 7,03 | 3 |
| cramé — bon / raté | 0 | 0 / 0 | 1,82 / 1,59 % | 4,16 / 7,85 % | 8 % |
| bouché — bon / raté | 0 | 0,28 / 0 % | 1,59 / 0 % | 6,62 / 1,83 % | 20 % |

| | mesures | angles publiés | rejets | plages |
|---|---|---|---|---|
| **bon** | 435 | 69 | bord 45 · netteté 113 | **5**, de 0,64 à 4,39 s |
| **raté** | 619 | 259 | bord 45 · netteté 534 · horizon 9 | **aucune** |

## 1. Le seuil de netteté est validé

**Il sépare les deux clips sans ambiguïté.** Le neuvième décile du clip raté
vaut **51** : neuf images sur dix y sont sous le seuil. La médiane du clip bon
vaut **108**, presque le double du seuil. Entre les deux, une fenêtre de
51 à 108 où n'importe quelle valeur aurait séparé les deux clips.

**`NETTETE_MIN` reste à 60**, au bas de cette fenêtre. C'est le choix
conservateur, et il est justifié par la rareté de la matière (§2 ci-dessous) :
mieux vaut garder une image limite que jeter une seconde qu'on n'a pas.

Le verdict suit : **86 % du clip raté est rejeté pour flou**, et il ne rend
aucune plage. Le clip bon en rejette 29 % et rend cinq plages, dont une de
4,39 s.

## 2. Les clips font 3 à 5 secondes, pas 20 à 30

*Information donnée par l'utilisateur le 2026-11-20 : « généralement quand je
filme en rando je fais des clips de 3-5 s ». Les clips longs des deux séries
ont été tournés exprès pour l'essai.*

**La conception supposait l'inverse** (§3 : « max 20-30 s »), et deux règles en
dépendaient.

**La règle du bord devient destructrice.** Une seconde à chaque bout d'un clip
de trois secondes en retire les deux tiers. Mesuré sur la première série : le
bord y était le **premier motif de rejet des quatre clips**, et deux d'entre
eux ne rendaient aucune plage alors que rien n'y avait été jugé mauvais — le
clip D affichait 59 rejets de bord et **0 rejet de netteté**.

**Correction, v0.23.0 :** le bord reste d'une seconde mais ne dépasse jamais
**15 % de la durée** à chaque bout. Un clip de 20 s perd sa seconde pleine,
conformément au §5.2 ; un clip de 3 s n'en perd que 0,45. La secousse du
bouton est de toute façon attrapée par la netteté — la deuxième série vient de
le prouver en rejetant 86 % d'un clip bougé.

**L'arithmétique du §5.4, elle, ne tient plus**, et aucune ligne de code ne la
réparera. Voir « Question ouverte » ci-dessous.

## 3. Le critère d'horizon reste non validé

La nouvelle échelle fait son travail : **69 angles publiés sur 435** pour le
clip bon, 259 sur 619 pour le raté, là où la première série en publiait zéro.

Mais **aucun des deux clips n'est de travers**, donc rien n'est prouvé. Et une
anomalie subsiste : l'inclinaison affiche **exactement 44,50° en p90 et en
maximum sur les deux clips**. C'est la valeur de la classe de bord de
l'histogramme — le signe que l'orientation dominante est tombée hors de la
plage mesurable et s'est accumulée à sa limite, pas qu'un horizon penche
vraiment à 44°.

**Il manque un clip net et visiblement de travers.** Tant qu'on ne l'a pas, le
seuil de 8° ne peut pas être posé, et on ne sait pas si l'anomalie à 44,5° est
gênante ou inoffensive. **Ne pas toucher au code de ce critère avant** : la
première série a déjà montré ce que coûte un réglage à l'aveugle.

---

## Question ouverte, qui bloque la phase 1C

Avec des clips de 3 à 5 secondes, il n'y a **pas assez de matière** pour un
reel de 20 secondes.

Le calcul, avec les chiffres mesurés ci-dessus : un clip de 4 s perd 1,2 s de
bord, puis ~29 % du reste au flou — il reste **environ 2 secondes
exploitables**. Le §5.4 demande une vingtaine de coupes sur 20 secondes, sans
jamais réutiliser le même instant source.

| clips ajoutés | matière exploitable | suffit pour |
|---|---|---|
| 2 | ≈ 4 s | rien |
| 5 | ≈ 10 s | un reel de 10 s |
| 10 | ≈ 20 s | un reel de 20 s |

Le §3 limite l'ajout à **2 à 5 vidéos**. Trois issues, et c'est à
l'utilisateur de choisir :

1. **accepter davantage de clips** — monter la limite à une dizaine ;
2. **raccourcir le reel** — 10 à 12 s au lieu de 20 ;
3. **autoriser la réutilisation** d'un même instant source, ce qui contredit
   une règle invariante du §5.4.
