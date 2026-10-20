# WORKSITE — Bible graphique et contrat de production 3D
**Version :** 1.2, référence de production (1.0 rédigée par Pierre-Alain le 18 octobre 2026 ; amendements des sections 17 (1.1) et 18 (1.2, fiche DA de production) validés le même jour)  
**Destination :** Blender → glTF/GLB → Three.js  
**Univers :** Jeu de gestion isométrique représentant un chantier numérique SIA  
**Usage :** Production assistée par IA d'un catalogue important d'assets cohérents

## 1. Identité du monde

WORKSITE est un univers miniature de construction, inspiré des jeux de gestion contemporains. Il représente la conception, le développement, le contrôle et la livraison de projets logiciels par analogie avec un chantier.

Le monde doit être immédiatement identifiable, visuellement chaleureux et professionnel.

**Style officiel : Stylized Isometric Construction Game.**

Deux références visuelles maîtresses sont fournies :

- **REF_ENV_001 :** chantier isométrique avec bâtiment rouge en construction, grue orange, camion-toupie et sol clair.
- **REF_CHR_001 :** collection de portraits 3D cartoon, visages arrondis, expressions sympathiques, cheveux sculptés et matériaux lisses.

Ces deux images sont les références visuelles prioritaires pour toute production.

Ne pas les interpréter comme deux univers distincts. Les personnages et les bâtiments doivent partager la même logique de stylisation, d'éclairage et de matériaux.

La cible artistique se situe entre un jeu de gestion de construction, une maquette architecturale et une application professionnelle de pilotage.

## 2. Principes artistiques non négociables

### 2.1 Silhouette avant détail

Chaque objet doit être reconnaissable depuis la caméra isométrique à la taille réelle prévue dans le tableau de bord.

La silhouette prime sur les petits détails.

La grue doit se reconnaître par son mât, sa flèche et son crochet. L'architecte par sa silhouette, sa tenue et ses accessoires. Le bureau par son architecture et son aménagement.

Éviter les détails microscopiques qui disparaissent à distance.

### 2.2 Low-poly stylisé, pas low-quality

Les bâtiments utilisent des géométries simplifiées et des arêtes franches.

Les surfaces sont majoritairement planes, avec des chanfreins là où ils améliorent le rendu.

Les personnages sont plus arrondis et organiques.

Ne pas utiliser systématiquement le flat shading : les objets mécaniques peuvent conserver des faces planes tandis que les personnages utilisent des normales lissées.

### 2.3 Proportions stylisées et cohérentes

Les dimensions du monde sont plausibles, mais certains détails sont exagérés pour la lisibilité.

Les portes, fenêtres, poignées, casques et accessoires peuvent être légèrement agrandis.

Cette exagération doit être partagée par tous les modèles d'une même famille.

### 2.4 Aspect soigné et chaleureux

L'univers doit évoquer un chantier propre, actif et organisé.

Couleurs assez franches sur les engins et accessoires, matériaux neutres pour les grandes surfaces.

Pas de textures photoréalistes, rouille excessive, fissures détaillées ou bruit procédural omniprésent.

### 2.5 Jeu professionnel, pas jouet

Les personnages peuvent sourire, réfléchir, attendre ou célébrer une réussite.

Les expressions doivent rester modérées.

Éviter les grands yeux disproportionnés, les têtes énormes, les animations burlesques et les objets trop gonflés.

## 3. Palette maîtresse

Les couleurs suivantes constituent les références visuelles initiales de WORKSITE.

| Token | Couleur | Hex |
|---|---|---|
| WS_BACKGROUND | Blanc chaud | #F8F8F6 |
| WS_SURFACE | Blanc cassé | #F1EFEB |
| WS_CONCRETE | Gris béton | #D9DDE1 |
| WS_ASPHALT | Gris violacé | #6C6674 |
| WS_GRAPHITE | Anthracite | #303841 |
| WS_CONSTRUCTION | Orange chantier | #F5A000 |
| WS_BRICK | Rouge corail | #EF655F |
| WS_TECH | Bleu | #4D9DBD |
| WS_LANDSCAPE | Vert sauge | #83A78F |

Prévoir également des matériaux pour le bois, le caoutchouc, les vitrages, les métaux, les tissus, les peaux et les cheveux.

Ces matériaux secondaires doivent être définis dans une palette officielle après validation des premiers assets correspondants.

Les valeurs hexadécimales représentent les couleurs de référence en sRGB. L'apparence finale devra être vérifiée avec la gestion colorimétrique et l'éclairage cible de Three.js.

### Règles de couleur

- Les grandes masses de bâtiments utilisent principalement des couleurs neutres.
- Les engins de chantier sont principalement orange et gris foncé.
- Les structures en construction peuvent employer le rouge corail de la référence.
- Le bleu désigne principalement les objets technologiques et certains équipements.
- Les couleurs des vêtements identifient visuellement les familles de rôles.
- Les couleurs de marque du projet s'appliquent uniquement aux matériaux explicitement personnalisables.

Ne pas ajouter librement des dizaines de couleurs saturées.

Les couleurs indiquant les états métier relèvent du design system de l'interface et non des matériaux permanents des objets.

## 4. Matériaux et finitions

Créer une bibliothèque partagée, centralisée et versionnée de matériaux.

### Matériaux architecturaux

Béton : mat, lisse, légèrement chaud.

Métal peint : satiné, surfaces régulières, reflets contrôlés.

Acier structurel : gris froid, distinction entre faces planes et arrondies.

Brique stylisée : rouge corail, joints simplifiés, pas de texture photographique.

Bois : teintes chaleureuses, veinage minimal ou absent à distance.

Verre : légèrement bleuté, transparence mesurée, pas de réflexions complexes obligatoires.

Asphalte : gris violacé mat, marquages clairs.

### Matériaux des personnages

Peau : surface douce, légèrement satinée, pas de pores ni photoréalisme.

Cheveux : masses sculptées, mèches groupées, très peu de détails fins.

Vêtements : matériaux mats, plis principaux seulement.

Yeux : formes simples, contrastes lisibles et reflets discrets.

Chaussures et accessoires : géométries arrondies, finitions légèrement satinées.

### Contraintes de production

Utiliser principalement des matériaux PBR compatibles glTF.

Éviter les matériaux dépendant de nœuds Blender qui ne pourront pas être reproduits dans Three.js.

Limiter les textures aux cas où elles apportent une véritable information : visage, signalétique, interface d'écran, logo, etc.

## 5. Personnages — WORKSITE CREW

### Personnage maître

Créer un personnage de référence nommé `CHR_BASE_MASTER`.

Caractéristiques proposées :

- Taille réelle dans le monde : 1,70 m.
- Corps stylisé, environ 4,5 à 5 têtes de hauteur.
- Tête arrondie légèrement surdimensionnée.
- Épaules et mains simplifiées.
- Silhouette adulte.
- Visage amical et expressif.
- Cheveux sculptés.
- Mains compatibles avec les accessoires.
- Chaussures robustes et légèrement agrandies.

La morphologie exacte sera figée après validation de la première planche comparative.

### Système commun

Les personnages doivent partager autant que possible :

- Squelette.
- Nommage des os.
- Structure d'animations.
- Emplacements d'accessoires.
- Matériaux de base.
- Conventions de taille.
- Direction de déplacement.

Ne pas créer un nouveau squelette arbitraire pour chaque personnage.

### Variantes

Les différences sont créées principalement par :

- Visages.
- Coiffures.
- Morphologies compatibles avec le rig commun.
- Tenues.
- Casques.
- Accessoires.
- Couleurs.
- Expressions.

Prévoir des apparences diversifiées.

### Deux niveaux de détail

**World Character :** personnage complet optimisé pour la scène 3D, avec traits lisibles à distance.

**Agent Portrait :** portrait plus détaillé, cohérent avec le personnage, utilisé dans les fiches.

Ne pas générer indépendamment un portrait et un corps sans contrôle de correspondance.

### Animations de base

`idle`, `walk`, `work`, `typing`, `inspect`, `read`, `thinking`, `waiting`, `talk`, `celebrate`.

Durée, boucle, vitesse, position initiale et mouvements des mains doivent être documentés.

Les animations ne doivent pas provoquer de déplacements non maîtrisés dans la scène.

Utiliser de préférence des animations sur place lorsque le déplacement est contrôlé par Three.js.

## 6. Bâtiments — WORKSITE BUILDINGS

Les bâtiments servent de représentations d'entités métier.

Chaque bâtiment doit avoir :

- Une silhouette identifiable.
- Un point d'entrée.
- Une enseigne ou un emplacement de signalétique.
- Des composants modulaires.
- Une variante visuelle ouverte ou fermée si pertinente.
- Des zones de sélection.
- Un identifiant métier indépendant du nom de l'objet 3D.

### Familles de bâtiments

- `BLD_ARCHITECT` : conception, PRD, spécifications.
- `BLD_ENGINEERING` : architecture technique.
- `BLD_DEVELOPMENT` : modules en développement.
- `BLD_QA` : contrôle qualité et tests.
- `BLD_COORDINATION` : orchestration des agents.
- `BLD_DELIVERY` : livraison et mise en service.

### Modularité

Utiliser des composants communs :

- Sols.
- Fondations.
- Poteaux.
- Poutres.
- Dalles.
- Murs.
- Portes.
- Fenêtres.
- Toitures.
- Escaliers.
- Échafaudages.
- Signalétique.

Les composants de même type doivent partager des dimensions d'assemblage.

### États de construction

Chaque bâtiment modulaire peut présenter les états :

`planned`, `foundation`, `structure`, `envelope`, `finishing`, `delivered`.

L'évolution visuelle doit pouvoir être commandée indépendamment par l'application.

Ne pas lier directement l'apparence à une formule de pourcentage non validée.

### Interiors / Cutaway

Les bâtiments importants doivent pouvoir présenter leur intérieur.

Prévoir :

- Toit séparé.
- Murs masquables.
- Mobilier sélectionnable.
- Points de positionnement des agents.
- Caméra de focalisation.
- Points d'ancrage pour les indicateurs HTML.

## 7. Engins et équipements

Leur design reprend directement l'esprit de la grue et du camion-toupie de REF_ENV_001.

Principes :

- Silhouette très lisible.
- Proportions légèrement compactes.
- Couleurs franches.
- Roues et mécanismes simplifiés.
- Articulations séparées lorsqu'une animation est nécessaire.
- Pas de détails mécaniques impossibles à percevoir depuis la caméra.

Chaque engin animé doit posséder une hiérarchie de pièces adaptée aux mouvements attendus.

Exemples :

Grue : socle, mât, pivot, flèche, contre-flèche, contrepoids, chariot, câble, crochet.

Camion : châssis, cabine, roues, équipement spécifique.

Pelleteuse : châssis, tourelle, bras, balancier, godet.

Les animations doivent être déterministes et contrôlables par l'application.

## 8. Environnement et caméra

### Organisation du monde

Le monde est constitué de parcelles modulaires, routes, trottoirs, clôtures, plantations et zones de travaux.

Chaque scène doit conserver des espaces dégagés pour les caméras et interfaces.

Les éléments décoratifs ne doivent pas masquer les éléments interactifs importants.

### Caméra

Caméra orthographique Three.js.

Paramètres initiaux :

- Rotation horizontale : environ 45°.
- Élévation : environ 35°.
- Point de vue général montrant le chantier complet.
- Zoom progressif sur les bâtiments.
- Caméra d'inspection avec cadrage prédéfini.

La vue générale doit permettre d'identifier immédiatement la fonction des principales zones.

### Éclairage

- Lumière directionnelle principale douce.
- Éclairage ambiant modéré.
- Ombres de contact perceptibles.
- Reflets satinés discrets.
- Pas d'effets volumétriques coûteux par défaut.

Créer une scène de rendu de référence commune à tous les assets.

Le rendu de validation principal doit être fait dans Three.js, même si Blender sert à produire les aperçus.

## 9. Conventions techniques Blender

### Échelle et axes

- Une unité Blender = un mètre.
- Axe vertical Blender : Z.
- Orientation avant officielle : `-Y` dans Blender.
- Axe vertical en sortie Three.js : Y après conversion glTF.
- Origine standard des objets au centre de leur emprise au sol.
- Échelle et rotations appliquées avant export, sauf justification technique.

Les assets comportant des articulations doivent avoir des pivots fonctionnels distincts.

### Nommage

- `BLD_` : bâtiments.
- `CHR_` : personnages.
- `VEH_` : véhicules.
- `EQP_` : équipements.
- `PRP_` : accessoires.
- `ENV_` : éléments d'environnement.
- `MAT_` : matériaux.
- `RIG_` : armatures.
- `ANM_` : animations.

Format de nom : `FAMILLE_TYPE_VARIANTE_VERSION`.

Exemple : `VEH_TOWER_CRANE_A_v001`.

Les noms doivent être uniques et stables.

### Fichiers

Chaque asset validé doit posséder :

- Un fichier `.blend` source.
- Un fichier `.glb` optimisé.
- Un aperçu PNG.
- Une fiche de métadonnées JSON.
- Un statut de validation.
- Une référence à la version de la bible utilisée.

### Système de coordonnées et ancres

Prévoir des points d'ancrage nommés, selon l'asset :

`ANCHOR_LABEL`, `ANCHOR_AGENT`, `ANCHOR_CAMERA`, `ANCHOR_ENTRY`, `ANCHOR_INTERACTION`.

Ces points peuvent être exportés comme objets vides ou nœuds, selon le pipeline glTF.

## 10. Budgets de complexité initiaux

Les budgets suivants sont des cibles de prototypage à mesurer sur le matériel cible.

| Type | Budget initial suggéré |
|---|---|
| Petit accessoire | 100–1 000 triangles |
| Personnage de chantier | 3 000–8 000 triangles |
| Véhicule moyen | 2 000–10 000 triangles |
| Bâtiment modulaire | 5 000–20 000 triangles |
| Grand équipement | 5 000–15 000 triangles |

Ces chiffres ne sont pas des plafonds absolus.

Le nombre total d'objets visibles, les appels de dessin, les matériaux, les animations, les ombres et la mémoire GPU peuvent avoir autant d'importance que les triangles.

Prévoir le partage des géométries et matériaux lorsque cela est pertinent.

Créer des versions simplifiées des assets très nombreux ou éloignés si les mesures le justifient.

## 11. Design system de l'interface

L'interface utilisateur doit rester distincte de la scène Three.js.

Les composants métier sont réalisés principalement en HTML/CSS :

- Sidebars.
- Fiches de fonctionnalités.
- Cartes d'agents.
- Tableaux.
- Notifications.
- Chronologie.
- Formulaires.
- Documents.

### Typographie

- Titres : Manrope.
- Interface et données : Inter.
- Code et références techniques : une police monospace adaptée.

### Composants liés au monde

Créer des modèles uniformes pour :

- Étiquette d'objet.
- Nom de bâtiment.
- Indicateur d'agent.
- Barre de progression.
- Marqueur de blocage.
- Marqueur de décision.
- Panneau de sélection.
- Infobulle.

Les dimensions, espacements, couleurs et états interactifs doivent provenir d'un système de composants centralisé.

L'accessibilité, le contraste et la lisibilité priment sur la décoration.

## 12. Personnalisation par projet

La scène possède une identité WORKSITE permanente.

Chaque projet peut modifier :

- Logo.
- Nom.
- Couleurs d'accent prévues.
- Enseignes.
- Panneaux de chantier.
- Habillage de certaines tenues.
- Typographie de l'interface.
- Thème clair ou sombre de l'interface.

La personnalisation ne doit pas remplacer les matériaux de base de toutes les constructions.

Les rôles et les statuts doivent rester compréhensibles indépendamment du thème.

## 13. Règles de création pour l'IA

Pour chaque nouvel asset, Claude doit :

1. Identifier sa famille.
2. Consulter la bible graphique et le modèle maître correspondant.
3. Définir son usage dans l'application.
4. Vérifier son échelle, sa silhouette et ses dimensions.
5. Réutiliser les matériaux existants.
6. Réutiliser les éléments modulaires lorsqu'ils existent.
7. Concevoir les points d'articulation et les ancres avant la modélisation.
8. Générer le modèle dans Blender.
9. Exporter le GLB.
10. Contrôler le résultat dans une scène Three.js de référence.
11. Produire un aperçu dans les cadrages imposés.
12. Exécuter les contrôles techniques.
13. Signaler les éventuelles différences artistiques.
14. Attendre la validation avant d'ajouter l'asset au catalogue officiel.

Ne jamais inventer une nouvelle direction graphique pour résoudre une difficulté de modélisation.

Si un élément requis est incompatible avec les règles existantes, proposer une extension documentée de la bible plutôt qu'une exception silencieuse.

## 14. Contrôle qualité

### Contrôles automatisables

- Existence du fichier source et du GLB.
- Noms conformes.
- Échelle cohérente.
- Orientation vérifiée.
- Absence d'objets inutiles.
- Géométrie valide.
- Matériaux compatibles.
- Textures intégrées ou référencées correctement.
- Animations présentes et nommées.
- Ancres attendues présentes.
- Budget géométrique documenté.
- Import Three.js sans erreur.
- Métadonnées complètes.

### Contrôles visuels

- Silhouette lisible.
- Cohérence avec les références.
- Proportions harmonieuses.
- Matériaux comparables aux autres assets.
- Absence de détails excessifs.
- Bonne lecture sous la caméra isométrique.
- Rendu satisfaisant à taille normale.
- Absence de collision visuelle avec les étiquettes et composants UI.

### Validation obligatoire

Chaque asset doit être présenté sur une planche comparative à côté d'au moins deux assets maîtres déjà validés.

Les captures doivent utiliser la même caméra, la même lumière et une échelle d'affichage comparable.

Un contrôle automatisé réussi ne remplace pas la validation artistique.

## 15. Versionnage et gouvernance

Cette bible est la référence officielle.

Chaque modification significative doit produire une nouvelle version.

Les assets conservent la référence à la version du standard utilisée lors de leur création.

Une nouvelle variante graphique ne doit pas être introduite sans validation.

Les modèles maîtres validés sont conservés et ne doivent pas être écrasés automatiquement.

Toute création issue de l'IA doit être reproductible autant que possible, notamment grâce aux scripts Blender et aux configurations enregistrées.

## 16. Objectif de production

Créer un catalogue d'assets modulaires, homogènes, évolutifs et capables d'alimenter automatiquement plusieurs scènes de chantier.

Le résultat attendu n'est pas seulement une collection de beaux objets 3D.

Il s'agit d'un véritable système de production graphique permettant à une IA de créer de nouveaux bâtiments, personnages, équipements et animations tout en conservant l'identité WORKSITE.

La cohérence de l'univers, la maintenabilité du catalogue et la réutilisation des assets priment sur la complexité individuelle des modèles.

## 17. Amendements de la version 1.1 (18 octobre 2026)

Validés par Pierre-Alain. Ils priment sur les sections qu'ils citent.

### 17.1 États de construction (remplace la liste de la section 6)

`plot` (terrain préparé), `excavation` (fouille, pelleteuse au travail), `foundations`, `structure` (poteaux, dalles, échafaudage, avancement de 0 à 1 donné par l'application), `envelope` (murs et toiture fermés), `finishing` (second œuvre, fenêtres posées, ouvriers visibles), `completed` (habité), `inspection` (réception en cours).

Un défaut ne change pas l'état d'un bâtiment : un signal de défaut est posé sur la façade ou dans la pièce concernée.

### 17.2 Familles de bâtiments (précise la section 6)

Le bâtiment d'une application se construit sur le chantier, avec une pièce par fiche. Les familles de la section 6 deviennent les lieux du parcours, posés dans l'ordre des étapes :

| Famille | Lieu | Ce qui s'y passe |
|---|---|---|
| `BLD_ARCHITECT` | Bureau d'architecte | L'idée, les plans, le permis de construire |
| `BLD_ENGINEERING` | Bureau d'études | Les plans d'exécution, les spécialistes |
| `BLD_CLIENT` | Bureau du client | Les décisions qui t'attendent |
| `BLD_QA` | Bureau de contrôle | Les preuves et les contrôles |
| `BLD_COORDINATION` | Baraque du conducteur de travaux | Le planning des lots, la répartition des agents |
| `BLD_DEVELOPMENT` | Le chantier : un bâtiment par application | La construction, une pièce par fiche |
| `BLD_DELIVERY` | Aire de réception | Les essais, la réception, la remise des clés |

### 17.3 Couleurs d'état (précise la section 3)

Les couleurs d'état (attente de décision, blocage, erreur, actif, terminé, inconnu) n'existent que dans l'interface HTML : badges, barres, étiquettes posées sur les ancres. Dans la scène, un signal se reconnaît à sa **forme** (panneau sur poteau, barrière, cône) ; le rouge brique des structures et l'orange des engins ne portent jamais de sens d'état.

### 17.4 Animations des personnages (complète la section 5)

S'ajoutent `blocked` (posture d'arrêt, devant la barrière) et `unknown` (immobile, matériaux grisés, lisible sans animation). L'état `unknown` est affiché chaque fois que le journal ne dit rien : il n'est jamais remplacé par une activité inventée.

### 17.5 Polices (précise la section 11)

Manrope et Inter sont copiées dans le projet avec leur licence, vérifiée avant intégration ; jamais chargées depuis Internet. Le panneau fonctionne hors ligne.

### 17.6 Production (précise les sections 9, 13 et 15)

- Chaque modèle livré sort d'un **script Blender du dépôt** (`blender/assets/<id>.py`), lancé par `npm run blender -- <id>`. Le GLB n'est jamais retouché à la main : on modifie le script et on relance. Le script tient lieu de fichier source de la section 9 : le `.blend` se régénère et n'est pas versionné.
- Le **connecteur Blender de Claude** (MCP) sert à explorer, essayer et regarder ; ce qui est validé est réécrit dans le script. Aucun modèle, aucune texture ni aucun matériau n'est importé d'une bibliothèque en ligne sans licence notée et accord de Pierre-Alain.
- Les métadonnées de la section 9 sont dans `asset.json`, écrit par le script : nom, version de la bible, version de Blender, empreintes du script, des outils communs, de la palette et du GLB. `npm run check` refuse un GLB dont une empreinte ne correspond plus.
- L'aperçu de validation est fait dans la galerie (Three.js), avec la planche comparative ; la galerie remplace l'aperçu PNG.

### 17.7 Ancres (précise la section 9)

Une ancre de la fiche du catalogue `label` correspond au nœud `ANCHOR_LABEL` ; `room:3` à `ANCHOR_ROOM_3`. Le composant les lit dans le modèle et les rend à GDC par `anchor(name)`.

### 17.8 Budgets (précise la section 10)

Le plafond de chaque élément est dans sa fiche du catalogue et mesuré par `npm run check`, dans chaque état et en qualité basse comme haute.

## 18. Amendements de la version 1.2 : fiche DA de production (18 octobre 2026)

Validés par Pierre-Alain. Ils chiffrent le rendu « 3D douce » et le socle maquette décidés le même jour (`docs/direction-artistique.md`), et priment sur les sections qu'ils citent. Les valeurs vivent dans `src/lumiere.json` et `src/palette.json` ; ce chapitre dit ce qu'elles valent et pourquoi.

### 18.1 Lumière « 3D douce » et cube étalon (précise la section 8)

Principe : **le dessus d'un objet montre la couleur de sa palette** ; ses deux côtés visibles en sont des fractions fixes. Le code hexadécimal de la palette reste donc ce qu'on voit.

L'**avant** des modèles (`-Y` dans Blender, à gauche de l'écran) est du côté éclairé, pour que les entrées, les enseignes et les visages soient lisibles : c'est REF_ENV_001 en miroir, plus douce.

| Face du cube étalon (3 m, `MAT_CONCRETE`) | Cible |
|---|---|
| Dessus | la couleur de palette (#D9DDE1), à 3 % près |
| Côté éclairé (avant, gauche de l'écran) | 0,85 du dessus, à 0,03 près |
| Côté ombré (droite de l'écran) | 0,65 du dessus, à 0,03 près |

Recette (`src/lumiere.json`) :
- ciel (lumière hémisphérique) blanc, sol #8A8678, intensité 1,95 ;
- soleil blanc, intensité 1,58, venant de l'avant et de la gauche, environ 50° d'élévation (position Three.js −5,4 ; 18 ; 14,8) ;
- aucun tone mapping, pour que la palette reste exacte ;
- une ombre portée au sol vaut environ 0,80 du dessus éclairé : visible, jamais noire.

Mesures du 18 octobre 2026 :
- galerie : 218, 186 et 142 ;
- studio Blender : 220, 187 et 144 (`npm run atelier -- etalon`) ;
- REF_ENV, pour comparaison : environ 0,50 entre la brique ombrée et la brique éclairée.

Un réglage de lumière est conforme quand la galerie et l'atelier affichent tous deux « conforme à la recette ».

### 18.2 Cotes communes (précise les sections 2.3 et 6)

| Cote | Valeur | Réel |
|---|---|---|
| Trame | 3,00 m | — |
| Hauteur d'étage, dalle à dalle | 3,00 m | 2,8 à 3,2 m |
| Épaisseur de dalle | 0,30 m | 0,25 m |
| Porte | 1,10 × 2,40 m | 0,90 × 2,10 m |
| Fenêtre | 1,50 × 1,50 m, allège 0,90 m (linteau à 2,40 m, aligné sur la porte) | 1,20 × 1,20 m |
| Garde-corps | 1,10 m | 1,00 m |
| Personnage | 1,70 m (section 5) | — |

Le cube étalon est un module : une trame sur un étage. L'exagération est de **× 1,2** pour les portes, fenêtres, poignées, casques et accessoires, la même pour toute une famille.

### 18.3 Chanfreins, segments et taille minimale d'un détail (précise la section 2.2)

| Classe | Largeur | Segments | Pour |
|---|---|---|---|
| C0 | aucun | — | arêtes cachées, pièces de moins de 0,15 m |
| C1 fin | 0,02 m | 2 | petites pièces d'engin, mobilier, poignées, crochet |
| C2 moyen | 0,05 m | 2 | cabines, contrepoids, socles d'engin, murs et poteaux |
| C3 fort | 0,10 m | 3 | socle maquette, grandes pièces arrondies |
| C4 arrondi d'engin | 0,20 m | 3 | capots, contrepoids et cabines arrondies d'engin ; chargement en tas (amendement du 20 octobre 2026) |

Règles des chanfreins :
- Un chanfrein ne dépasse jamais le quart de la plus petite dimension de sa pièce.
- Les pièces chanfreinées sont lissées à 30° (`lisse`), les grandes faces restent planes.
- Les personnages n'ont pas de classe : leurs normales sont lissées partout.

En vue générale, sur l'affichage de référence (18.7), un mètre fait **25 pixels** (`PX_PAR_METRE` de l'atelier). Taille minimale d'un détail :
- **0,15 m** dans sa plus petite dimension, soit environ 4 pixels ;
- les éléments filiformes (câbles, garde-corps, mâts fins) peuvent descendre à 0,06 m ;
- en qualité basse, ce qui mesure moins de 0,30 m est supprimé ou fusionné.

### 18.4 Bibliothèque de matériaux (complète les sections 3 et 4)

`src/palette.json` est la bibliothèque : chaque `MAT_` a sa couleur, sa rugosité et son caractère métallique, lus par les scripts Blender et par Three.js. Sa couleur est une clé de `monde`, d'`equipe` ou de `personnages`.

| Famille | Matériaux | Rugosité | Métal |
|---|---|---|---|
| Bâtiment et sol | `MAT_CONCRETE`, `MAT_SURFACE`, `MAT_BRICK`, `MAT_ASPHALT`, `MAT_LANDSCAPE`, `MAT_EARTH` (#BF8B65) | 0,80 à 0,95 | 0 |
| Bois | `MAT_WOOD` (#D2A273, bois clair chaud, distinct de la terre) | 0,80 | 0 |
| Métal peint | `MAT_PAINTED_METAL_ORANGE`, `MAT_PAINTED_METAL_GRAPHITE`, `MAT_TECH` | 0,50 à 0,55 | 0 à 0,1 |
| Métaux nus | `MAT_STEEL` (#A7AFB7, gris froid), `MAT_ALUMINIUM` (#C9CED3, menuiseries) | 0,40 à 0,45 | 0,2 |
| Caoutchouc | `MAT_RUBBER` (#232426, plus foncé que le graphite) | 0,90 | 0 |
| Verre | `MAT_GLASS` (#9CC3D5) : **opaque**, légèrement bleuté | 0,20 | 0 |
| Tissus | `MAT_FABRIC_<ÉQUIPE>` (les cinq couleurs d'équipe), `MAT_FABRIC_GRAPHITE`, `MAT_FABRIC_HIVIS` (gilet orange fluo #FF6A13, bandes claires en `MAT_SURFACE`, 18.8) | 0,85 | 0 |
| Peaux | `MAT_SKIN_A` à `MAT_SKIN_E` (#F2C8B6, #EDB69C, #D1876D, #B96C56, #8C4A40, tirées de REF_CHR_001) | 0,60 | 0 |
| Cheveux | `MAT_HAIR_BLACK`, `_BROWN`, `_BLOND`, `_RED` (REF_CHR_001), `MAT_HAIR_GREY` | 0,60 | 0 |

Règles :
- **Métal 0,2 au plus** tant que la scène n'a pas de carte d'environnement : au-delà, un métal ressort sombre dans Three.js. C'est pourquoi `MAT_STEEL` passe de la couleur béton (rugosité 0,35, métal 0,6) à l'acier gris froid.
- Le verre est opaque : pas de problème d'ordre de transparence. Les intérieurs se montrent en masquant les murs (section 6, *Cutaway*), pas à travers les vitres.
- Les yeux seront fixés avec `CHR_BASE_MASTER`.
- En niveaux de gris, l'orange chantier, la brique, le bleu et le vert sauge sont proches, et la terre (150) l'est de la brique éclairée. C'est déjà le cas dans REF_ENV et la palette ne change pas. Mais une planche vérifie que ces matières ne se touchent pas sans contraste de forme.

### 18.5 Socle maquette (précise la section 8)

Chaque lieu est posé sur un socle :
- une dalle de **0,60 m** d'épaisseur en `MAT_EARTH`, dessus à `z = 0` ;
- bord du même matériau : la lumière le fonce, comme dans REF_ENV ;
- arêtes du dessus en classe C3.

### 18.6 Scène de référence (précise les sections 8 et 14)

- La galerie (`npm run dev`, *Cube étalon et nuancier*) montre le cube étalon sur son socle, la mesure de ses trois faces et un cube par matériau de la bibliothèque.
- Deux bascules s'appliquent à tout composant : *Silhouette* (noir sur blanc) et *Niveaux de gris* (les valeurs sans la couleur).
- Le studio Blender de l'atelier lit la même lumière, sans sol propre, comme la galerie. Son ciel est corrigé pour éclairer comme la lumière hémisphérique de Three.js. `npm run atelier -- etalon` en vérifie le calage.
- La galerie reste la référence.

### 18.7 Affichage de référence et ancrage (décisions de Pierre-Alain du 18 octobre 2026)

**Affichage de référence : un portable de 13 à 14 pouces.** C'est le cas prioritaire ; un grand écran ne fait que mieux.

Le zoom par défaut reste celui de la galerie : 24 m de hauteur visible en vue générale. Mesures dans la galerie, en pixels CSS par mètre :

| Portable | Zone de page | Pixels par mètre |
|---|---|---|
| 13 pouces, 1280 × 800 points | 1280 × 690 | 25,3 |
| 13,6 pouces, 1470 × 956 points | 1470 × 840 | 31,6 |
| 14 pouces, 1512 × 982 points | 1512 × 860 | 32,4 |

Le plus petit fixe la règle : 25 pixels par mètre, donc la taille minimale d'un détail (18.3) et la silhouette de l'atelier (`PX_PAR_METRE`). À recaler quand la mise en page du panneau de GDC sera connue : la galerie a sa propre barre latérale.

**Ancrage : un chantier de Suisse romande**, reconnaissable et crédible pour un œil SST (18.8).

### 18.8 Le chantier romand (décisions de Pierre-Alain du 18 octobre 2026, après la recherche de références)

**Casques** : de la **couleur d'équipe** (`equipe` de `src/palette.json`).
- C'est un choix de direction artistique : la recherche n'a trouvé aucun code suisse de couleur de casque par fonction.
- L'OTConst (RS 832.311.141, art. 6) impose seulement le casque pour tous, jusqu'à la fin du gros œuvre et près des grues et des engins. Dans la scène, tout personnage sur le chantier le porte.

**Engins** :
- La grue à tour garde l'orange chantier #F5A000.
- La pelleteuse est une pelle classique sur chenilles, pas une pelle araignée.

**Marqueurs romands retenus** :
- le chantier est cloisonné par une **clôture périphérique** ;
- les baraquements sont des **conteneurs modulaires** ;
- des **bennes de tri** sont alignées (OLED, art. 17 : tri obligatoire) ;
- les ouvriers près des engins portent un **gilet orange fluo à bandes claires**. L'OTConst (art. 7) l'impose ; selon la Suva, il est « en principe orange, jaune ou rouge ».

**Écartés** : toits végétalisés, panneau STOP de la Suva, pelle araignée.

**Au catalogue** : la clôture (`site-fence`), le conteneur (`site-container`) et la benne de tri (`waste-skip`) sont des éléments séparés. Ce projet définit le catalogue des éléments, pas leur agencement.

**Vigilance de signalétique** : la barrière de blocage (`blocked-sign`) est une barrière de chantier orange avec un triangle, donc un signal d'état. Rien d'autre dans la scène ne doit lui ressembler.
- La clôture périphérique a une forme nettement différente : panneaux en treillis gris sur plots en béton, **sans orange**.
- Mesures de couleur (ΔE 2000), pour un orange fluo de gilet candidat #FF6A13 :
  - il reste distinct de l'orange des engins (19,5) et de l'ancienne couleur de l'équipe « site » #C9A227 (28) ;
  - il est proche de la brique (17) et de l'orange d'état « bloqué » de l'interface (13) ;
  - par ailleurs, l'équipe « site » n'est qu'à 11,6 de l'orange des engins : un casque « site » peut se confondre avec une grue.
- Le gilet est validé en **#FF6A13** (`MAT_FABRIC_HIVIS`), bandes claires en `MAT_SURFACE`.
- L'équipe « site » passe de #C9A227 à **#EBCB2E**, un jaune franc. Écart avec l'orange des engins : de 11,6 à 16,7. Écart avec le gilet : 36. Le casque couvre les cheveux, si bien que la proximité du blond (11,3) ne gêne pas. Une planche les vérifie côte à côte : personnage au gilet, barrière de blocage, grue, mur de brique.
