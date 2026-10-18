# La livraison vers GDC

## Ce qu'on livre

- `dist/maquettes.js` : la bibliothèque, un seul module JavaScript, avec les modèles 3D intégrés et sans Three.js à l'intérieur : GDC fournit Three.js, `GLTFLoader` et `SkeletonUtils`, à la même version que `package.json` ;
- `catalogue.json` : la liste des composants, avec leur statut et leur version ;
- une étiquette de version sur le dépôt (`v0.1.0`, puis majeure, mineure, correctif) et une entrée dans `CHANGELOG.md`.

## Avant de livrer

1. `npm run check` passe sans erreur.
2. Chaque composant livré est vu dans la galerie, dans tous ses états, en qualité basse et haute, avec et sans animations.
3. `npm run build` produit `dist/maquettes.js`.
4. Le changelog dit ce qui change pour le panneau : composant ajouté, état ajouté, changement qui casse.

## Ce que fait GDC

1. Il détecte la nouvelle version.
2. Il relance le contrôle du contrat sur la bibliothèque livrée, avec sa propre version de Three.js.
3. Il vérifie que son adaptateur sait alimenter chaque état.
4. Il te propose la version en une ligne ; tu l'adoptes d'un mot.

Une version qui casse le contrat ne remplace jamais la précédente : le panneau garde celle qui marche.
