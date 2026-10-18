---
name: revue-planche
description: La revue visuelle d'un composant de l'atelier des maquettes - galerie Three.js dans tous ses états, planche comparative, captures silhouette et valeurs, grille de cohérence WORKSITE, constat précis sans corriger. À utiliser avant de proposer un composant à « livré », quand PA dit « revue DA », « planche », « est-ce cohérent », « compare aux références », ou par l'agent directeur-artistique.
---

# La revue de planche

La galerie Three.js tranche : c'est le rendu que GDC affichera. Les captures Blender servent à l'itération. Une revue **signale**, elle ne corrige pas.

## 1. Ouvrir la galerie

```bash
P=/Users/pierre-alain_schutz/Dropbox/Webdesign/Dev/gdc-maquettes
job_id="$(portly temp "$P/node_modules/.bin/vite --port 5321 --strictPort" --path "$P" --timeout 30m)"
```

(`npx vite` sous Portly tente de télécharger vite : utiliser le binaire local.)

Dans le navigateur intégré, ouvre `http://localhost:5321/#<id>/<etat>/planche`. Les boutons du haut basculent l'état, le thème sombre, la qualité, l'animation, les ancres et la planche.

## 2. Ce qu'on capture

- Chaque état de la fiche, en planche (à côté de deux modèles de référence).
- Le thème sombre et la qualité basse, sur au moins un état.
- Sans animation (`reducedMotion`) : chaque état reste lisible, sans mouvement.
- Les captures de l'atelier (`npm run atelier -- <id>`) : `silhouette.png` et `valeurs.png`.

Tant qu'aucun modèle n'est `livré`, la planche compare aux **exemples**, qui ne sont pas des modèles maîtres validés. Dis-le dans le constat.

## 3. La grille (0 = non, 1 = à reprendre, 2 = conforme)

| Critère | Question |
|---|---|
| Silhouette | Reconnaissable en noir, à taille réelle, sans légende ? |
| Échelle | Juste à côté des voisins de la planche (personnage 1,70 m, étage, porte) ? |
| Proportions | Les exagérations sont-elles celles de la famille ? |
| Rendu 3D douce | Chanfreins arrondis qui accrochent la lumière, grandes faces planes, reflets discrets ? |
| Matières | Rugosités cohérentes avec les modèles voisins ; rien de photoréaliste ? |
| Palette | Uniquement des `MAT_` de la palette, bonnes masses de couleur, aucune couleur d'état dans la scène ? |
| Valeurs | Les volumes et matières se séparent-ils en gris ? |
| Détail | Aucun détail invisible à taille normale ; aucune zone vide qui appelle un détail ? |
| Références | Dans l'esprit de REF_ENV ou REF_CHR, sans les décalquer ? |
| Animation | Rythme posé, sur place, boucle propre, repos à `false`, état fixe lisible avec `reducedMotion` ? |
| Ancres | Étiquettes et badges lisibles, sans chevaucher la géométrie ni les voisins ? |
| Thèmes | Lisible en clair et en sombre ? |

## 4. Le constat

Pour chaque critère sous 2 : **quoi, où, pourquoi, comment corriger** (par exemple : « flèche trop fine en silhouette, à 24 px/m elle fait 1 px : passer la section à 0,7 m »). Puis une conclusion :

- proposable à `livré` ;
- à reprendre (la liste) ;
- question de style pour PA (une décision qui manque à la charte devient un amendement proposé).

Arrête le serveur à la fin : `portly stop "$job_id"`.
