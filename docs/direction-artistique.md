# La direction artistique

La règle graphique est la **bible WORKSITE** (`docs/bible/bible-worksite.md`, version 1.1). Ce fichier dit comment on s'en sert et comment elle évolue.

## Ce qui est fixé

- L'univers, le style, les principes, la palette, les matériaux, les personnages, les bâtiments, les engins, la caméra, les conventions Blender, les budgets et les contrôles : la bible.
- Les couleurs et les matériaux, en une seule source : `src/palette.json`, lue par les scripts Blender et par Three.js.
- Les couleurs d'état : dans l'interface seulement (bible, 17.3 ; `docs/signaletique.md`).

## Le lot G0, dans l'ordre

1. **Le mood board** : les deux références maîtresses (REF_ENV_001, REF_CHR_001) et les autres images dans `moodboard/`, une ligne chacune dans `moodboard/notes.md`.
2. **La bibliothèque de matériaux** : compléter `src/palette.json` (bois, caoutchouc, vitrages, métaux, tissus, peaux, cheveux) au fil des premiers modèles validés.
3. **La scène de référence et la planche comparative** : dans la galerie, bouton « Planche » ; chaque nouvel élément est vu à côté de deux modèles de référence, même caméra, même lumière.

## Faire évoluer la bible

Une difficulté de modélisation ne se règle jamais par une exception silencieuse (bible, section 13) : on propose un amendement écrit, Pierre-Alain le valide, la bible change de version, et les modèles gardent la version avec laquelle ils ont été produits (`asset.json`).
