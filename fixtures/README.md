# Les séquences de la ville

Des scènes réelles, produites par le binaire GDC sur un projet d'essai (`scripts/sequences-maquette.mjs` du dépôt GDC), pour construire et régler la ville avant le panneau du chantier C6. Ne pas les modifier à la main : les régénérer depuis GDC.

Schéma 3 de la scène, depuis GDC 0.19.0 (ADR 0013 de GDC, « la ville vivante ») : quatre zones (`plan.zones`), dix étapes (`etapes`), régime du chantier (`chantier.regime`), étages par fiche et pièces par lot (`etages` du bâtiment), lieux des décisions, motifs des déplacements (`motif`), actions horodatées avec leurs références (`ref`). Le contrat est dans `docs/maquette.md` du dépôt GDC.

- `projet-type/` : un projet de l'ouverture à la mise en production, en vingt et une étapes : gabarits, terrassement au feu vert, fondations avec l'essai rouge, structure, enveloppe, camion de livraison pour une nouvelle dépendance, second œuvre à la relecture, inspection, habité.
- `trois-applications/` : la suite, avec trois applications à des étapes différentes : une administration existante surélevée, une consultation (Sarah en mission), deux feux verts attendus, un contrôle d'Hélène sur un bâtiment, l'application de bureau surélevée à son tour.

Chaque dossier a son `index.json` (chaque étape, son titre et ses actions en clair) et un fichier `NN-etape.json` par étape (la scène complète et ses `actions` depuis l'étape précédente).

La règle de lecture est dans `docs/ville.md` : GDC dit quoi et où ; la ville dit comment, par des chemins et des animations. Rien ne bouge sans une action ; la vie d'ambiance naît de l'état reçu et n'ajoute aucun fait.
