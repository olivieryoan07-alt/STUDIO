# STUDIO

Monteur de reels automatique, personnel. App web installable sur iPhone.

- Conception : `docs/superpowers/specs/2026-11-14-studio-design.md`
- Plan en cours : `docs/superpowers/plans/2026-11-14-socle-mesure.md`

## Contraintes du projet

Aucune etape de compilation : pas de Node, pas de npm, pas de bundler.
Les fichiers publies sont exactement les fichiers du depot.

## Lancer les tests

Les modules ES ne se chargent pas depuis `file://`. Servir le dossier :

    python3 -m http.server 8777 --bind 127.0.0.1

Puis ouvrir http://localhost:8777/tests/ **dans Chrome** (le Mac du projet est
bloque en Safari 16, trop ancien pour WebCodecs).

## Publier

    git push

GitHub Pages sert la branche `main` a la racine.
