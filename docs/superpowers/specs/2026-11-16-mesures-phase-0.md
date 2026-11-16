# STUDIO — Mesures de la phase 0

**Appareil :** iPhone 12 mini, iOS 27.2 · **App :** v0.17.0 · **Date :** 2026-11-16
**Plan :** `docs/superpowers/plans/2026-11-14-socle-mesure.md`

> Aucune valeur de ce document n'est estimée. Toutes ont été lues à l'écran de
> l'appareil. Les extrapolations sont signalées comme telles.

---

## Verdict : **go**

Les cinq questions bloquantes du §9 de la conception ont leur réponse. La
forme retenue — app web installée sur l'écran d'accueil — tient sur
l'appareil cible. Aucun repli n'a été nécessaire.

---

## Les cinq réponses

### 1. Que remet réellement le sélecteur Photos ?

| | |
|---|---|
| Codec | `avc1.640033` — **H.264**, pas HEVC |
| Définition | 3840×2160 |
| Cadence | 30 img/s |
| Rotation | 90° (matrice de piste) |
| Profondeur | 8 bits |
| HDR | **non** |
| Marques | `qt` |

**iOS transcode avant de remettre le fichier** : pas de HEVC à décoder. C'est
la bonne nouvelle, et elle est solide — le codec est lu dans le conteneur.

> **Réserve ajoutée après relecture, et elle annule une conclusion.** La ligne
> « HDR : non » a été produite par un code qui ne pouvait structurellement
> dire autre chose : `transferCharacteristics` était codé en dur à chaîne vide
> et la profondeur déduite du seul nom de codec, lequel ne la porte que pour
> le HEVC. Pour un `avc1.*`, la réponse était « 8 bits, HDR non » **quelle que
> soit la colorimétrie réelle du fichier**.
>
> La conclusion « l'avertissement du §3 tombe » était donc **prématurée**.
> Le code lit désormais la boîte `colr` (transfert 16 = PQ, 18 = HLG) et dit
> explicitement « colorimétrie non lue » quand la boîte est absente. **La
> question 1 doit être remesurée** avant de clore le risque.

En revanche la **rotation à 90°** est bien réelle : la source est stockée en
paysage et redressée par métadonnée. Le moteur doit l'appliquer, sans quoi
tout le montage sort couché.

### 2. La chaîne complète produit-elle un mp4 lisible ?

**Oui.** Démuxage → décodage → recadrage 9:16 → encodage → muxage.
150 images produites, 150 muxées, fichier lu sans erreur.

| | |
|---|---|
| Stratégie retenue | **matériel des deux côtés** (aucun repli logiciel) |
| Codec de sortie | `avc1.640034` |
| Recadrage | identité après rotation (la source redressée est déjà en 9:16) |
| Cadence de sortie | 30 img/s, celle de la source |
| Poids | 6,97 Mo pour 5 s |

### 3. Le partage iOS écrit-il dans la galerie ?

**Oui.** La feuille de partage s'ouvre, « Enregistrer la vidéo » dépose le
fichier dans Photos, et il s'y lit — image **et son**.

C'était le risque n°1, classé bloquant. Il est levé.

### 4. L'audio AAC s'encode-t-il et se muxe-t-il ?

**Oui**, après correction (voir « Ce que la mesure a corrigé »).

| | |
|---|---|
| Paquets | 237 |
| Étalement | 5,06 s pour 5 s de source |
| Échantillonnage | 48 kHz, 2 canaux |
| Niveau crête | 0,281 |
| AudioSpecificConfig | 2 octets : `11 90` |
| Horodatages manquants | 0 |
| Trames ADTS | 0 |

### 5. Combien coûtent trois encodages ?

| | |
|---|---|
| Démuxage | 32 ms |
| Décode + recadrage + encode | 5828 ms pour 150 images |
| **Coût par image** | **38,9 ms** |
| Un reel de 20 s (600 images) | **23 s** *(extrapolé)* |
| **Trois montages** | **70 s** *(extrapolé)* |
| Budget de repli (§5.5) | 120 s |

**Dans le budget.** Le repli du §5.5 — aperçus allégés puis réencodage du seul
montage retenu — n'est pas nécessaire.

---

## Ce que la mesure a corrigé

Six hypothèses ont été formulées et **cinq réfutées par la mesure**. Elles
sont consignées ici parce qu'elles disent où ne plus chercher.

| Hypothèse | Verdict | Ce que la mesure a montré |
|---|---|---|
| Le codec `avc1.640034` n'est pas réellement supporté | **fausse** | l'encodeur seul : 180 paquets sur 180 |
| `latencyMode: 'quality'` fait échouer `configure()` | **fausse** | l'auto-test v0.8.0 réussit dès la 1re combinaison, qui l'inclut |
| Le volume (178 images) sature l'encodeur | **fausse** | 180 images encodées hors chaîne |
| iOS refuse une session d'encodage matériel tant qu'un décodeur tourne | **fausse** | run v0.9.0 : les 4 combinaisons rendent 0 paquet, donc l'accélération n'y était pour rien |
| Safari émet du H.264 en Annex B | **non tranchée** | `avc: { format: 'avc' }` a été forcé en v0.10.0 : l'hypothèse a été **contournée, pas réfutée**. Le réglage reste en place |
| Safari n'horodate pas les paquets audio | **fausse** | `horodatages manquants : 0` |
| Safari émet l'AAC en ADTS | **fausse** | `trames ADTS 0`, premiers octets `21 00 03 40` |

**Les deux causes réelles**, toutes deux trouvées en séparant des compteurs
plutôt qu'en formulant une hypothèse de plus :

1. **Vidéo — la durée des paquets.** Safari ne renseigne pas
   `EncodedVideoChunk.duration` ; Chrome si. mp4-muxer l'exige et rejetait les
   150 paquets en silence. `addVideoChunk()` lit `sample.duration` directement
   et ne permet pas de la fournir : son 4ᵉ argument est `compositionTimeOffset`.
   Il faut passer par `addVideoChunkRaw()`.

2. **Audio — la taille de la config décodeur.** Safari remet **39 octets**
   dans `decoderConfig.description` : un esds complet, là où un
   AudioSpecificConfig en fait 2. mp4-muxer insérant cette description telle
   quelle dans l'esds qu'il construit, le fichier contenait un esds imbriqué
   dans un esds — valide, et muet. Il faut extraire l'AudioSpecificConfig
   (`src/core/asc.js`).

**Leçon de méthode, pour la phase 1 :** les deux pannes étaient invisibles
parce qu'un seul compteur mélangeait deux réalités (« produit par l'encodeur »
et « accepté par le muxeur »), et parce que les exceptions levées dans un
callback WebCodecs **ne remontent jamais**. Tout callback de codec doit avoir
son filet, et toute étape son propre compteur.

---

## Ce qui n'est pas mesuré

Quatre réserves, à lever en phase 1 plutôt qu'à oublier :

1. **La mémoire n'a pas pu être mesurée.** `performance.memory` n'existe pas
   sur Safari : « pic mémoire : non mesurable ». Le **risque 3 de la
   conception reste donc entier** et non chiffré.
2. **Un seul clip a été traité, jamais cinq.** Le pire cas dimensionnant du
   §3 — 5 clips × 30 s = 150 s de matière — n'a pas été éprouvé. C'est
   précisément le scénario qui peut faire tomber la mémoire.
3. **Aucun reel de 20 s n'a été produit en entier.** Les 23 s et 70 s sont
   extrapolées depuis 5 s réelles, en supposant un coût par image constant.
4. **La matière de test est en 4K.** L'utilisateur passera au 1080p : quatre
   fois moins de pixels à décoder, donc un coût qui ne peut que baisser.
5. **La colorimétrie n'a jamais été lue** (voir la réserve de la question 1).
6. **Les chiffres ci-dessus datent de la v0.17.0.** La relecture finale a
   corrigé le chronométrage (les passes ratées étaient facturées à la passe
   gagnante, gonflant le coût par image), le verdict (`go` était calculé avec
   `share: true` codé en dur, avant même la station 04) et plusieurs fuites.
   **Les mesures sont à refaire en v0.19.0** : elles ne peuvent que baisser,
   mais elles n'ont pas été reprises.

---

## À corriger dans le document de conception

Le §3 affirme « 1080p 60 en entrée, 1080×1920 en sortie, copie exacte, aucun
redimensionnement ». **C'est faux pour la matière actuelle** : les vidéos de
test sont en 4K, et sortir en 1080×1920 est une réduction — le relevé l'indique
d'ailleurs en rouge. L'affirmation redeviendra vraie quand l'utilisateur
filmera en 1080p, mais le document doit porter les deux cas.

Également à inscrire : la **rotation 90°** de la source, absente de la
conception, et qui conditionne tout le cadrage.
