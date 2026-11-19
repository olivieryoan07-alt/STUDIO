# STUDIO — Validation à l'oreille du moteur audio (phase 1A)

**Appareil :** iPhone 12 mini, iOS 27.2 · **App :** v0.21.0 · **Date :** 2026-11-19
**Banc :** `bench.html` · **Plan :** `docs/superpowers/plans/2026-11-16-phase-1a-moteur-audio.md`

---

## Les trois réponses

### 1. Les clics tombent-ils sur le rythme, sans dériver ? — **oui**

Validé sur plusieurs morceaux. La grille des temps est **acquise** : c'est la
brique que la phase 1B et le montage peuvent utiliser telle quelle.

### 2. Le point culminant tombe-t-il là où ça décolle à l'oreille ? — **oui, mais**

L'utilisateur confirme que le point désigné **est** une vraie rupture
d'énergie. Mais ce n'est **pas le meilleur passage** du morceau. Constaté sur
deux morceaux indépendants, chacun annoté d'un cercle désignant un autre
endroit (plus tardif) comme le bon.

**Ce que ça dit de la règle du §5.3, point 7.** La règle n'est pas mal
implémentée, elle est mal posée. Dans un morceau de metal, le plus grand saut
d'énergie est presque toujours le même : **intro calme → entrée du groupe**.
C'est arithmétiquement le plus grand écart, et musicalement l'endroit le moins
intéressant — tout le monde l'a déjà entendu. Le passage qui marche sur un reel
est plus loin : le drop après le pont, la reprise après la cassure. Le signal
ne porte pas cette information ; il faut connaître le morceau.

**Mesure à l'appui (morceau 1, 4:53, 140 BPM) :** culminant désigné à **0:18**
avec un saut ×3,6 — soit exactement la fin de l'intro. Le cercle de
l'utilisateur est à ~**3:40**.

### 3. L'extrait retenu est-il un passage que tu mettrais sur un reel ? — **oui, mais pas le meilleur**

Conséquence directe de la réponse 2 : l'extrait est ancré sur un point
culminant correct mais mal choisi.

---

## Décision : la règle du §5.3 point 7 est abandonnée comme décideur

L'utilisateur demande à **choisir lui-même la fenêtre de musique**, à la façon
du sélecteur Instagram : une vue de la forme d'onde, une fenêtre que l'on fait
glisser avec écoute en direct, puis l'app monte sur cet extrait.

Ce n'est pas un renoncement à l'automatisme : c'est le déplacer là où il est
fiable. Le choix du passage demande de connaître le morceau ; le découpage sur
le rythme ne demande que le signal, et il est validé.

---

## Trois défauts relevés sur la copie d'écran, non signalés par l'utilisateur

1. **La confiance du tempo est fausse.** Le banc affichait « 10 % — tempo peu
   fiable : morceau sans percussion nette ? » **en rouge**, sur un morceau où
   les clics tombaient justes. L'indicateur crie au loup. Il est soit à
   recalibrer, soit à retirer de l'écran.
2. **La segmentation en sections ne segmente rien.** 36 sections sur 4 min 53,
   soit une toutes les 8 s. Le point 6 du §5.3 ne produit pas de l'information,
   il produit du bruit.
3. **La disposition de l'extrait n'a pas été tenue.** Extrait 0:02 → 0:23,
   culminant à 0:18 : la fenêtre a buté sur le début du morceau, et la
   disposition `OPENING 8 | RISE 8 | BODY 22 | BURST 4 | OUTRO 8` n'a pas pu
   s'appliquer. Le cas « culminant trop proche d'un bord » est traité par un
   rognage, pas par une règle.

Les trois disparaissent ou changent de sens avec la sélection manuelle : à
reprendre dans la conception révisée, pas à corriger en l'état.
