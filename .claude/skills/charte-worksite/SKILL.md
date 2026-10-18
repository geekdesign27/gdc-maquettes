---
name: charte-worksite
description: La fiche courte de la direction artistique WORKSITE de l'atelier des maquettes (rendu 3D douce, palette, matériaux, socle maquette, conventions Blender, interdits). À charger AVANT de concevoir, modéliser, animer ou relire un modèle 3D, un matériau ou une couleur de ce dépôt, et dès que PA parle de style, de DA, de cohérence graphique, de palette ou de matériaux.
---

# La charte WORKSITE, en une page

Les sources font foi, ce résumé non : bible `docs/bible/bible-worksite.md` (1.1), décisions de PA dans `docs/direction-artistique.md`, `src/palette.json`, `src/lumiere.json`, `docs/signaletique.md`. En cas d'écart, la source gagne et tu signales l'écart.

## Le monde

- **Style** : *Stylized Isometric Construction Game*. Un chantier miniature propre, actif, organisé ; jeu professionnel, pas jouet.
- **Références** : REF_ENV_001 (formes, couleurs, composition des bâtiments et engins), REF_CHR_001 (visages, cheveux, peau des personnages). Inspiration seulement : on ne décalque jamais.
- **Rendu 3D douce** (décision de PA du 18 octobre 2026) : ombrage dégradé, reflets satinés discrets. Les arêtes qui accrochent la lumière sont chanfreinées et arrondies (`boite(..., chanfrein=, segments=2 ou 3)`, puis `lisse(objet)`) ; les grandes faces restent planes.
- **Socle maquette** (décision du 18 octobre 2026) : chaque lieu est posé sur une dalle épaisse couleur terre, bord visible.
- **Silhouette avant détail** : chaque objet se reconnaît à la caméra iso, à sa taille réelle. Un détail invisible à cette taille est supprimé.
- **Exagérations partagées** : portes, fenêtres, poignées, casques et accessoires un peu agrandis, de la même façon pour toute une famille.

## Couleurs et matières

- Grandes masses de bâtiments : neutres (`concrete`, `surface`). Engins : orange chantier et graphite. Structures en construction : rouge corail. Bleu : objets technologiques. Vert sauge : paysage.
- Matières : bâtiment mat (rugosité 0,8 à 0,95), métal peint satiné (0,5 à 0,6), personnages satinés. Pas de texture photo, de rouille, de fissure ni de bruit.
- Un matériau = un `MAT_` de `src/palette.json`, par `c.materiau("MAT_...")`. Un besoin nouveau donne une **proposition** d'ajout à la palette, validée par PA. Jamais une couleur en dur dans un script ou un composant.
- **Changer `src/palette.json` invalide l'empreinte de tous les GLB** : il faut ensuite reconstruire tous les modèles (`npm run blender -- <id>` pour chacun), puis `npm run check`.
- **Couleurs d'état** (actif, attente, bloqué, erreur, terminé, inconnu) : dans l'interface HTML seulement. Dans la scène, un signal se lit à sa forme ; l'orange et le corail n'y portent jamais d'état.

## Conventions techniques (bible 9 et 17)

- 1 unité = 1 m ; Z vertical ; avant vers `-Y` ; origine au centre de l'emprise au sol, à `z = 0`.
- Noms : `FAMILLE_TYPE_VARIANTE` pour les pièces, `_v001` pour le fichier, `MAT_`, `ANM_`, `ANCHOR_`. Un nom hors convention arrête l'export.
- Un pivot vide par mouvement, la géométrie dessous ; une action `ANM_...` par clip.
- Les ancres de la fiche deviennent des nœuds `ANCHOR_<NOM>` (`room:3` donne `ANCHOR_ROOM_3`).
- Ni caméra, ni lumière, ni texte dans le modèle.
- Budget : plafond de la fiche du catalogue, dans chaque état ; viser large en dessous. `instance` pour répéter une pièce, `fusionne` pour les pièces fixes d'un même ensemble.

## Pas encore chiffré

Ces valeurs attendent la fiche DA de production (amendement 1.2) :
- les cotes communes (trame de 3 m déjà fixée par `building-kit`, hauteur d'étage, portes, fenêtres) ;
- les classes de chanfrein ;
- les valeurs cibles de lumière ;
- la taille minimale d'un détail ;
- la couleur terre.

Si une décision en dépend, **demande à PA** au lieu de fixer un chiffre toi-même, et note la valeur retenue dans la fiche.

## Interdits

Inventer une direction graphique pour contourner une difficulté (proposer un amendement écrit à la place) ; modifier un modèle livré sans nouvelle version ; importer un modèle, une texture ou un matériau sans licence CC0 ou MIT notée et accord de PA ; retoucher un GLB à la main ; animer en continu ce qui signale un état.
