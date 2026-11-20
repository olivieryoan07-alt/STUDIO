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
