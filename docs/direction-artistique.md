# La direction artistique

La règle graphique est la **bible WORKSITE** (`docs/bible/bible-worksite.md`, version 1.2). Ce fichier dit comment on s'en sert et comment elle évolue.

## Ce qui est fixé

- L'univers, le style, les principes, la palette, les matériaux, les personnages, les bâtiments, les engins, la caméra, les conventions Blender, les budgets et les contrôles : la bible.
- Les couleurs et les matériaux, en une seule source : `src/palette.json`, lue par les scripts Blender et par Three.js.
- Les couleurs d'état : dans l'interface seulement (bible, 17.3 ; `docs/signaletique.md`).
- La caméra et la lumière de la scène de référence : `src/lumiere.json`, lues par la galerie et par le studio Blender (`blender/atelier.py`), pour que l'aperçu Blender et la galerie se ressemblent. Le cube étalon vérifie qu'ils se ressemblent (bible, 18.1 et 18.6).
- Les chiffres de production (lumière, cotes, chanfreins, taille minimale d'un détail, matériaux, socle) : la fiche DA de production, section 18 de la bible.

## Le lot G0, dans l'ordre

1. **Le mood board** : les deux références maîtresses (REF_ENV_001, REF_CHR_001) et les autres images dans `moodboard/`, une ligne chacune dans `moodboard/notes.md`.
2. **La bibliothèque de matériaux** : `src/palette.json`, complétée le 18 octobre 2026 (bible, 18.4) ; un matériau nouveau s'y ajoute par proposition validée.
3. **La scène de référence et la planche comparative** : dans la galerie, le cube étalon et le nuancier, les bascules « Silhouette » et « Niveaux de gris », et le bouton « Planche » ; chaque nouvel élément est vu à côté de deux modèles de référence, même caméra, même lumière.

## Décisions de Pierre-Alain

| Date | Décision | Ce qui en découle |
|---|---|---|
| 18 octobre 2026 | Rendu **3D douce** pour le monde : ombrage dégradé et reflets satinés discrets, plutôt que l'aplat vectoriel de REF_ENV. REF_ENV reste la référence des formes, des couleurs et de la composition. | La fiche DA de production (amendement 1.2) fixe la recette de lumière (`src/lumiere.json`), les rugosités et les chanfreins arrondis. |
| 18 octobre 2026 | Chaque lieu est posé sur un **socle façon maquette** : dalle épaisse couleur terre, bord visible (REF_ENV). | Une couleur terre s'ajoute à la palette, avec la fiche 1.2. |
| 18 octobre 2026 | Les modèles officiels sont exportés avec **Blender 5.3.0 Beta**. | `blender/README.md` ; `asset.json` garde la version de chaque GLB. |
| 18 octobre 2026 | **Fiche DA de production**, bible 1.2 : avant éclairé, côtés à 0,85 et 0,65 du dessus ; socle de 0,60 m en terre #BF8B65 ; étage de 3 m, portes et fenêtres × 1,2 ; chanfreins C1 à C3 ; détail minimal 0,15 m ; bibliothèque de 30 matériaux, verre opaque, métal 0,2 au plus. | Bible, section 18 ; `src/lumiere.json` ; `src/palette.json` ; la grue est reconstruite. |
| 18 octobre 2026 | **Affichage de référence** : un portable de 13 à 14 pouces est le cas prioritaire ; un grand écran ne fait que mieux. | Bible, 18.7 : 25 px par mètre en vue générale (mesuré dans la galerie), d'où le détail minimal et `PX_PAR_METRE` de l'atelier. |
| 18 octobre 2026 | **Ancrage** : un chantier de Suisse romande reconnaissable (bâtiments, engins, barrières, équipements de protection, casques), crédible pour un œil SST. | Bible, 18.7 et 18.8. |
| 18 octobre 2026 | **Le chantier romand** : casques de la couleur d'équipe (choix de DA, aucun code suisse par fonction) ; grue orange #F5A000 ; pelle classique sur chenilles ; clôture périphérique, conteneurs modulaires, bennes de tri, gilet orange fluo à bandes claires. Écartés : toits végétalisés, panneau STOP Suva, pelle araignée. | Bible, 18.8 : la clôture est en treillis gris sur plots béton, sans orange, pour que la barrière de blocage garde son sens. Gilet validé en #FF6A13 (`MAT_FABRIC_HIVIS`). Clôture, conteneur et benne de tri entrent au catalogue comme éléments séparés (`site-fence`, `site-container`, `waste-skip`) : le projet définit les éléments, pas leur agencement. L'équipe « site » passe à #EBCB2E (jaune franc), plus loin de l'orange des engins. |
| 19 octobre 2026 | **Mood board validé** tel quel : les deux références maîtresses et MB_03 à MB_12, avec leurs notes « on garde / on écarte ». | `moodboard/notes.md` fait foi pour la suite du lot G1. |
| 19 octobre 2026 | **Morphologie du personnage : 5 têtes**, et non les 6,5 des images. MB_04 ne sert que pour le visage et la tenue. | `CHR_BASE_MASTER` est modelé à 5 têtes, dans la fourchette de la bible (section 5) : la bible ne change pas. |
| 19 octobre 2026 | **Bennes de tri : une couleur de caisse par matière** (bois, métal, inertes, mélangés), en plus du contenu qui dit la matière par sa forme. | Amendement de palette validé le même jour : bois `MAT_PAINTED_METAL_OLIVE` (#8B8B4B), métal `MAT_PAINTED_METAL_MOSS` (#5B6241), inertes `MAT_PAINTED_METAL_PLUM` (#8B4B72), mélangés `MAT_PAINTED_METAL_GRAPHITE` (existant). Chaque couleur est à plus de 15 en ΔE 2000 des couleurs d'équipe et d'état, de l'orange des engins, du gilet, de la brique, de la couleur tech et du paysage. Le cas le plus juste est la prune face à l'équipe études (15,7) : à vérifier sur la planche de `waste-skip`. Ces couleurs (`skip_*`) ne servent qu'aux bennes. |
| 19 octobre 2026 | **Kit de bâtiment : qualité basse reportée.** La revue montre que la qualité basse garde les 18 512 triangles (bible, 18.7 : ce qui mesure moins de 0,30 m doit disparaître ou être fusionné). | Dette notée : une v002 de `building-kit`, avec une ligne au journal des versions, quand `building` utilisera le kit. |
| 19 octobre 2026 | **Une tenue par rôle**, avec une équipe, un casque et un accessoire pour chacun. Le client (Pierre-Alain) est le seul sans casque, en tenue civile graphite. Fanny, la représentante du client, porte un **casque blanc** « côté client » (amendement à la bible, 18.8). Le chef de chantier et le bureau de contrôle, bien qu'ils soient des programmes, ont chacun un personnage. | Le tableau de `docs/correspondances.md` fait foi. `character` gagne la tenue `client` et les équipes `client` et `none` ; le casque blanc utilise `MAT_SURFACE`, sans nouveau matériau. Le prénom, l'équipe et la tenue des deux programmes restent à fixer. Le casque blanc entrera dans la bible à sa prochaine version. |

## Faire évoluer la bible

Une difficulté de modélisation ne se règle jamais par une exception silencieuse (bible, section 13) : on propose un amendement écrit, Pierre-Alain le valide, la bible change de version, et les modèles gardent la version avec laquelle ils ont été produits (`asset.json`).
