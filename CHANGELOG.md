# Journal des versions

## 0.2.0, 18 octobre 2026

- Bible WORKSITE 1.1 (`docs/bible/bible-worksite.md`) : la version 1.0 de Pierre-Alain et ses amendements (états du bâtiment, familles devenues les lieux du parcours, couleurs d'état réservées à l'interface, animations `blocked` et `unknown`, polices locales, production par script Blender, ancres, budgets).
- Chaîne Blender : outils communs (`blender/gdc_blender/commun.py`), constructeur (`blender/construit.py`), `npm run blender -- <id>`, provenance dans `asset.json`.
- Contrat : modèles 3D déclarés dans `meta.assets`, chargés par l'hôte et reçus par `ctx.assets` ; ressources partagées jamais libérées par le composant ; ancres `ANCHOR_*`.
- Contrôle : lecture des GLB (noms, matériaux, animations, ressources externes, caméras et lumières, extensions, budget), provenance (script, outils communs, palette, GLB), instance chargée avec ses modèles.
- Galerie : chargement des modèles, lumière revue, planche comparative.
- Palette unique (`src/palette.json`), lue par Blender et Three.js.
- Catalogue 2 : kits (`building-kit`, `character-kit`), baraque du conducteur de travaux, états du bâtiment et du personnage, budgets de la bible, mode de production de chaque élément, polices.
- Exemple : la grue (`crane`), modèle Blender animé.

## Non publiée

- Mise en place du projet : contrat, catalogue, galerie, contrôle, deux composants d'exemple (`ground`, `selection-ring`).
