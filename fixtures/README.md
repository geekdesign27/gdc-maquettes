# Les séquences de la ville

Des scènes réelles, produites par le binaire GDC sur un projet d'essai (`scripts/sequences-maquette.mjs` du dépôt GDC), pour construire et régler la ville avant le panneau du chantier C6. Ne pas les modifier à la main : les régénérer depuis GDC.

- `projet-type/` : un projet de l'ouverture à la mise en production, en vingt étapes. `index.json` donne chaque étape, son titre et ses actions en clair ; chaque fichier `NN-etape.json` contient la scène complète (`plan`, `elements`, `indicateurs`) et ses `actions` depuis l'étape précédente.

La règle de lecture est dans `docs/ville.md` : GDC dit quoi et où ; la ville dit comment, par des chemins et des animations. Rien ne bouge sans une action.
