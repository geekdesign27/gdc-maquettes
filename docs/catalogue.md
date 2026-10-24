# Le catalogue

Fichier généré par `npm run catalogue` depuis `catalogue.json`. Ne pas le modifier à la main.

66 éléments : 55 livré, 9 à faire, 2 exemple.

## G0 : La ligne graphique

Fixer le style avant de produire : mood board, bible WORKSITE, bibliothèque de matériaux, scène de référence et planche comparative.

| Ordre | Identifiant | Nom | Nature | But | Statut |
|---|---|---|---|---|---|
| 1 | `moodboard` | Le mood board | Document de référence, pas de code | Réunir les images qui donnent le ton, avant toute production. | livré |
| 2 | `bible` | La bible graphique | Document de référence, pas de code | La règle de production : univers, palette, matériaux, personnages, bâtiments, engins, caméra, conventions Blender, budgets, contrôles. | livré |
| 3 | `material-library` | La bibliothèque de matériaux | Document de référence, pas de code | Des matériaux MAT_ partagés par tous les modèles, définis une seule fois. | livré |
| 4 | `reference-scene` | La scène de référence | Document de référence, pas de code | Servir d'étalon : chaque nouveau composant est posé à côté pour vérifier qu'il appartient au même monde. | à faire |

### Le mood board (`moodboard`)

Images dans moodboard/, une ligne chacune dans moodboard/notes.md : ce qu'on aime, ce qu'on ne veut pas, la source.

- Critères d'acceptation :
  - Au moins dix images commentées
  - Les deux références maîtresses de la bible (REF_ENV_001, REF_CHR_001) y figurent
  - Validé ensemble

### La bible graphique (`bible`)

docs/bible/bible-worksite.md, version 1.2 : la version 1.0 de Pierre-Alain, ses amendements 1.1 et la fiche DA de production 1.2 (section 18), validés le 2026-10-18. Toute évolution produit une nouvelle version.

- Critères d'acceptation :
  - Version 1.2 validée
  - Toute évolution documentée comme amendement versionné

### La bibliothèque de matériaux (`material-library`)

src/palette.json, section materiaux : 30 matériaux et plus (bible, 18.4), chacun avec sa couleur, sa rugosité et son caractère métallique ; un matériau nouveau s'ajoute par proposition validée.

- Critères d'acceptation :
  - Chaque matériau a sa couleur, sa rugosité et son caractère métallique
  - Compatible glTF, sans nœud Blender non reproductible
  - Les scripts Blender et Three.js lisent la même source

### La scène de référence (`reference-scene`)

Un assemblage dans la galerie, même caméra et même lumière : terrain, grue, un bureau, un bâtiment dans quatre états, un personnage, l'anneau de sélection, un panneau. La planche comparative (bible, section 14) pose chaque nouvel asset à côté de deux modèles maîtres validés. Réalisée dans la galerie (`src/scene-reference.js`) : la carte du harnais en trois quartiers, chaque étape repérée (docs/ville.md) ; planche entre le bâtiment terminé et le personnage maître. Reprise sur la décision de Pierre-Alain du 21 octobre 2026, à revalider.

- Critères d'acceptation :
  - Lisible en clair et en sombre
  - Fluide sur un ordinateur portable ordinaire
  - Planche comparative disponible pour chaque composant
  - Validée ensemble

## G1 : Le terrain et les lieux

Poser le plan du chantier dans l'ordre du parcours : bureau d'architecte, bureau d'études, bureau du client, bureau de contrôle, baraque du conducteur de travaux, chantier, parking, réception.

| Ordre | Identifiant | Nom | Nature | But | Statut |
|---|---|---|---|---|---|
| 0 | `ground` | Le terrain | Composant 3D Three.js, conforme à docs/contrat-composant.md | Le sol du projet, sur lequel tout se pose. | exemple |
| 1 | `container-kit` | Le kit de conteneur | Bibliothèque de modèles 3D produite par un script Blender (blender/assets/<id>.py) et réutilisée par plusieurs composants : components/kit/<id>/ | Le conteneur de chantier aménagé : le module commun des bureaux et des baraques. | livré |
| 2 | `site-container` | Le conteneur de chantier | Composant 3D Three.js, conforme à docs/contrat-composant.md | Le baraquement modulaire des chantiers romands : vestiaire, réfectoire, bureau. | livré |
| 3 | `architect-office` | Le bureau d'architecte | Composant 3D Three.js, conforme à docs/contrat-composant.md | Le lieu de l'idée, des plans et du permis de construire ; le premier lieu du parcours. | livré |
| 4 | `design-office` | Le bureau d'études | Composant 3D Three.js, conforme à docs/contrat-composant.md | Le lieu des plans d'exécution, où travaillent les spécialistes. | livré |
| 5 | `client-office` | Le bureau du client | Composant 3D Three.js, conforme à docs/contrat-composant.md | Le lieu des décisions qui t'attendent. | livré |
| 6 | `control-office` | Le bureau de contrôle | Composant 3D Three.js, conforme à docs/contrat-composant.md | Le poste qui mesure et tamponne les preuves ; c'est un programme, pas un personnage. | livré |
| 7 | `site-office` | La baraque du conducteur de travaux | Composant 3D Three.js, conforme à docs/contrat-composant.md | Le lieu de la coordination : planning des lots, chef de chantier, répartition des agents. | livré |
| 8 | `parking` | Le parking : le carnet des demandes | Composant 3D Three.js, conforme à docs/contrat-composant.md | Montrer les demandes en attente de tri, sous forme de caisses de matériel. | livré |
| 9 | `reception-area` | La zone de réception | Composant 3D Three.js, conforme à docs/contrat-composant.md | Le lieu des essais et de la visite, avant la remise des clés. | livré |
| 11 | `waste-skip` | La benne de tri | Composant 3D Three.js, conforme à docs/contrat-composant.md | Le tri des déchets de chantier, obligatoire (OLED, art. 17). | livré |
| 12 | `material-storage` | Le stockage de matériaux | Composant 3D Three.js, conforme à docs/contrat-composant.md | Montrer l'approvisionnement du chantier : les matériaux qui attendent d'être posés. | livré |
| 13 | `site-ground` | Le terrain de chantier | Composant 3D Three.js, conforme à docs/contrat-composant.md | Le sol du chantier clôturé : de la terre d'abord, puis du béton et des voies à mesure que le chantier avance. | livré |

### Le terrain (`ground`)

Une dalle de terrain avec sa bordure ; la zone du chantier en gravier est un second composant posé dessus.

- Fichier : `components/site/ground/index.js`
- Production : Géométrie générée par le code du composant (paramétrique, liée aux données)
- Paramètres : `width` (nombre, 4 à 60, défaut 18) ; `depth` (nombre, 4 à 60, défaut 12)
- États : `default`
- Ancres : `label`
- Données reçues par setState : aucune
- Budget : 2000 triangles, 3 matériaux
- Critères d'acceptation :
  - Exemple fourni : sert de modèle de composant statique

### Le kit de conteneur (`container-kit`)

Un conteneur de chantier de 20 pieds, agrandi × 1,2 comme toute la famille (7,20 × 3,00 m au sol, 3,00 m de haut ; la porte de 2,40 m y entre) : coque fermée, coque en coupe des conteneurs habités (sans toit, long pan avant coupé à l'allège, sans longeron haut avant : MB_13, variante A), porte, fenêtre, marches, escalier et coursive ; et le mobilier des bureaux (table à dessin et lampe, panneau de plans, poste de travail, table ronde et maquette, étagère, tableau de planning, armoire de mesure, trépied, tampon). Utilisé par site-container et les cinq bureaux. Décision de Pierre-Alain du 19 octobre 2026 : un bureau est un conteneur aménagé, deux postes par conteneur.

- Dossier : `components/kit/container-kit/`, script `blender/assets/container-kit.py`
- Production : Modèle GLB produit par un script Blender du dépôt ; le composant le pilote (états, animations, ancres)
- Modèles : `ENV_CONTAINER_KIT_A_v003.glb`
- Budget : 20000 triangles, 10 matériaux
- Critères d'acceptation :
  - Couleurs proposées et validées par Pierre-Alain avant la fabrication
  - Toutes les pièces partagent les cotes du conteneur et s'accolent ou s'empilent sans jour
  - Chaque pièce est un nœud nommé ENV_CONTAINER_KIT_A_<PIECE>
  - Une démonstration (un conteneur fermé, deux empilés, un bureau en coupe) s'assemble sans retouche

### Le conteneur de chantier (`site-container`)

Un conteneur fermé du kit container-kit, porte et fenêtre aux cotes communes (bible, 18.2) ; deux modules peuvent s'empiler, avec un escalier extérieur.

- Fichier : `components/site/site-container/index.js`
- Production : Pièces d'un kit Blender assemblées par le code selon les données (avancement, nombre de pièces) ; kit `container-kit`
- Modèles : `kit:container-kit/ENV_CONTAINER_KIT_A_v003.glb`
- Paramètres : `stack` (nombre, 1 à 2, défaut 1)
- États : `default`
- Ancres : `label`, `entry`
- Données reçues par setState : aucune
- Budget : 6000 triangles, 6 matériaux
- Critères d'acceptation :
  - Reconnaissable comme conteneur de chantier sans légende
  - Couleurs proposées et validées par Pierre-Alain avant la fabrication
  - Empilé sur deux niveaux, l'escalier mène à la porte du haut

### Le bureau d'architecte (`architect-office`)

Un conteneur du kit container-kit aménagé en bureau d'architecte, montré en coupe : table à dessin et sa lampe, plans au mur, maquette blanche sur une table ronde, rouleaux de plans. Un poste, celui de Claire. Les personnages s'y placent (ancre desk:n) ; ils entrent par la porte.

- Fichier : `components/site/architect-office/index.js`
- Production : Pièces d'un kit Blender assemblées par le code selon les données (avancement, nombre de pièces) ; kit `container-kit` ; famille `BLD_ARCHITECT`
- Modèles : `kit:container-kit/ENV_CONTAINER_KIT_A_v003.glb`, `kit:building-kit/BLD_KIT_A_v003.glb`
- États : `idle`, `active`
- Ancres : `label`, `badge`, `door`, `desk:*`
- Données reçues par setState : aucune
- Budget : 20000 triangles, 10 matériaux
- Critères d'acceptation :
  - Reconnaissable comme un bureau d'architecte sans légende
  - La porte (ancre door) est l'endroit où entrent les personnages
  - État active : une lumière ou un détail animé discret, figé si reducedMotion

### Le bureau d'études (`design-office`)

Une grappe de 1 à 4 conteneurs du kit container-kit accolés par le long pan (jamais en longue ligne, remarque de Pierre-Alain du 19 octobre 2026), deux postes par conteneur (desks / 2, arrondi au-dessus) : bureau bois, caisson graphite, écran, chaise, cloisons basses. Aucun longeron haut entre deux conteneurs (FRAME_OPEN, kit v002). Plus technique que le bureau d'architecte. Marc et les sept du bureau d'études.

- Fichier : `components/site/design-office/index.js`
- Production : Pièces d'un kit Blender assemblées par le code selon les données (avancement, nombre de pièces) ; kit `container-kit` ; famille `BLD_ENGINEERING`
- Modèles : `kit:container-kit/ENV_CONTAINER_KIT_A_v003.glb`, `kit:building-kit/BLD_KIT_A_v003.glb`
- Paramètres : `desks` (nombre, 1 à 8, défaut 8)
- États : `idle`, `active`
- Ancres : `label`, `badge`, `door`, `desk:*`
- Données reçues par setState : aucune
- Budget : 20000 triangles, 10 matériaux
- Critères d'acceptation :
  - Distinct du bureau d'architecte au premier regard
  - Même famille de formes et de matières
  - Un poste par personne, désignable (ancre desk:n)

### Le bureau du client (`client-office`)

Un conteneur du kit container-kit aménagé en salle de décision : table de réunion, deux fauteuils, une plante ; un tableau d'affichage extérieur. Pierre-Alain et Fanny s'y tiennent (ancres desk:1 et desk:2). En état waiting, une feuille claire est épinglée sur le tableau, GDC pose decision-sign à l'ancre board, devant le tableau, et le badge HTML rouge, avec le nombre de décisions, sur l'ancre badge. Aucun rouge dans la 3D (bible, 17.3 ; décision de Pierre-Alain du 19 octobre 2026).

- Fichier : `components/site/client-office/index.js`
- Production : Pièces d'un kit Blender assemblées par le code selon les données (avancement, nombre de pièces) ; kit `container-kit`
- Modèles : `kit:container-kit/ENV_CONTAINER_KIT_A_v003.glb`, `kit:building-kit/BLD_KIT_A_v003.glb`
- États : `idle`, `waiting`
- Ancres : `label`, `badge`, `board`, `desk:*`
- Données reçues par setState : `count` (nombre de décisions attendues (affiché par GDC sur l'ancre badge))
- Budget : 20000 triangles, 10 matériaux
- Critères d'acceptation :
  - En waiting, visible de loin sans être criard
  - Le rouge de signalisation ne sert qu'aux décisions qui t'attendent (badge HTML), ici et à la zone de réception

### Le bureau de contrôle (`control-office`)

Un conteneur du kit container-kit équipé en machine : armoires de mesure, trépied, tampon, et un poste, celui d'Hélène (ancre desk:1), qui y joue inspect (docs/ville.md). Une impulsion à chaque preuve enregistrée. Décisions de Pierre-Alain du 19 octobre 2026.

- Fichier : `components/site/control-office/index.js`
- Production : Pièces d'un kit Blender assemblées par le code selon les données (avancement, nombre de pièces) ; kit `container-kit` ; famille `BLD_QA`
- Modèles : `kit:container-kit/ENV_CONTAINER_KIT_A_v003.glb`, `kit:building-kit/BLD_KIT_A_v003.glb`
- États : `idle`, `active`, `error`
- Ancres : `label`, `badge`, `desk:*`
- Données reçues par setState : aucune
- Budget : 20000 triangles, 10 matériaux
- Critères d'acceptation :
  - Le poste d'Hélène (desk:1) au milieu des appareils de mesure : se distingue des autres bureaux au premier regard
  - État error lisible sans animation

### La baraque du conducteur de travaux (`site-office`)

Deux conteneurs du kit container-kit empilés, avec escalier extérieur et coursive (MB_10). L'étage est ouvert en coupe (sans toit, long pan avant coupé, une porte dans la coupe pour l'arrivée de la coursive) : planning affiché sans texte, écrans ; le rez est fermé (vestiaire). Famille BLD_COORDINATION de la bible. Yves, le conducteur de travaux, est à desk:1 aux écrans de l'étage ; Victor, le chef de chantier, à desk:2 sur la coursive, près de l'escalier, talkie-walkie en main. Les agents de passage se rassemblent devant le planning, aux places crew:1 à crew:6. Décisions de Pierre-Alain du 19 octobre 2026.

- Fichier : `components/site/site-office/index.js`
- Production : Pièces d'un kit Blender assemblées par le code selon les données (avancement, nombre de pièces) ; kit `container-kit` ; famille `BLD_COORDINATION`
- Modèles : `kit:container-kit/ENV_CONTAINER_KIT_A_v003.glb`, `kit:building-kit/BLD_KIT_A_v003.glb`
- États : `idle`, `active`
- Ancres : `label`, `badge`, `entry`, `desk:*`, `crew:*`
- Budget : 20000 triangles, 10 matériaux
- Critères d'acceptation :
  - Reconnaissable comme baraque de chantier sans légende
  - État active : un détail animé discret, figé si reducedMotion

### Le parking : le carnet des demandes (`parking`)

Une aire marquée de capacity places (rangs de 4), sur un socle maquette ; data.count y place une caisse par demande, dans l'ordre d'arrivée ; au-delà de capacity, les caisses en trop vont sur une pile et le nombre est dans le badge. Une caisse ajoutée arrive par la rue, une caisse retirée repart (docs/ville.md). Caisses en bois, sans couleur d'état ni orange (signalétique). Décisions de Pierre-Alain du 20 octobre 2026 : capacity est le nombre de places marquées et le seuil de la pile ; item:1 à item:n désignent les caisses sur leurs places, item:pile la pile.

- Fichier : `components/site/parking/index.js`
- Production : Pièces d'un kit Blender assemblées par le code selon les données (avancement, nombre de pièces) ; modèle `ENV_PARKING_A_v001`
- Modèles : `ENV_PARKING_A_v001.glb`
- Paramètres : `capacity` (nombre de places marquées et seuil de la pile, 4 à 24, défaut 12)
- États : `default`
- Ancres : `label`, `badge`, `item:*`
- Données reçues par setState : `count` (nombre de fiches au carnet des demandes, 0 ou plus)
- Budget : 5000 triangles, 6 matériaux
- Critères d'acceptation :
  - Le nombre de caisses suit data.count
  - Chaque caisse est désignable (ancre item:n) pour ouvrir sa demande

### La zone de réception (`reception-area`)

Une aire en plein air sur son socle : un auvent sur quatre poteaux, dessous le pupitre d'essais (deux écrans) et un capteur sur trépied, devant un totem à la clé en relief (le panneau « réception », sans texte) et deux bacs de verdure. Anne (la commission de réception) au pupitre, le client à côté du totem, Olivier (le surveillant) à côté d'Anne (ancres desk:1 à desk:3). En active (les essais), les écrans s'allument et la tête du capteur pivote une fois par essai ; en waiting (la réception attend ta décision), une clé géante est posée sur le pupitre et le badge HTML rouge est sur l'ancre badge. Aucune couleur d'état dans la 3D (décisions de Pierre-Alain du 20 octobre 2026).

- Fichier : `components/site/reception-area/index.js`
- Production : Modèle GLB produit par un script Blender du dépôt ; le composant le pilote (états, animations, ancres) ; modèle `BLD_DELIVERY_AREA_A_v001` ; famille `BLD_DELIVERY`
- Modèles : `BLD_DELIVERY_AREA_A_v001.glb`
- États : `idle`, `active`, `waiting`
- Ancres : `label`, `badge`, `desk:*`
- Données reçues par setState : aucune
- Budget : 10000 triangles, 8 matériaux
- Critères d'acceptation :
  - Lisible comme un lieu de contrôle final

### La benne de tri (`waste-skip`)

Une benne basculante ouverte de 7 m³, à la cote réelle (3,70 × 1,80 m en haut, 1,45 m de haut ; décision de Pierre-Alain du 20 octobre 2026) ; son contenu dit la matière par sa forme, sans texte : planches (wood), barres et tubes (metal), gravats (inert), cartons et sacs (mixed). Plusieurs bennes s'alignent, une par matière. Couleur de caisse par matière (décision du 19 octobre 2026) : wood MAT_PAINTED_METAL_OLIVE, metal MAT_PAINTED_METAL_MOSS, inert MAT_PAINTED_METAL_PLUM, mixed MAT_PAINTED_METAL_GRAPHITE.

- Fichier : `components/site/waste-skip/index.js`
- Production : Modèle GLB produit par un script Blender du dépôt ; le composant le pilote (états, animations, ancres) ; modèle `ENV_WASTE_SKIP_A_v001`
- Modèles : `ENV_WASTE_SKIP_A_v001.glb`, `ENV_WASTE_SKIP_A_WOOD_v001.glb`, `ENV_WASTE_SKIP_A_METAL_v001.glb`, `ENV_WASTE_SKIP_A_INERT_v001.glb`
- Paramètres : `content` (wood | metal | inert | mixed, défaut mixed)
- États : `default`
- Ancres : `label`
- Données reçues par setState : aucune
- Budget : 1500 triangles, 4 matériaux
- Critères d'acceptation :
  - Reconnaissable comme benne de chantier sans légende
  - Les contenus se distinguent par leur forme en niveaux de gris

### Le stockage de matériaux (`material-storage`)

Une aire de stockage posée sur le terrain de chantier, sans socle : quatre lots reconnaissables à leur forme, sans texte ni film plastique. Parpaings en cubes sur palettes de 1,20 × 1,00 m (blocks), buses en béton de Ø 0,80 m en pyramide 3 + 2 + 1 (pipes), botte de barres d'armature de 6 m sur chevrons (rebar), touret de câble de Ø 1,20 m (cable). Avec mixed, les quatre lots sur une aire d'environ 7 × 4 m. Matériaux : MAT_CONCRETE, MAT_WOOD, MAT_STEEL, MAT_PAINTED_METAL_GRAPHITE. Fiche et brief validés par Pierre-Alain le 21 octobre 2026.

- Fichier : `components/site/material-storage/index.js`
- Production : Modèle GLB produit par un script Blender du dépôt ; le composant le pilote (états, animations, ancres) ; modèle `PRP_MATERIAL_STORAGE_A_v001`
- Modèles : `PRP_MATERIAL_STORAGE_A_v001.glb`
- Paramètres : `content` (blocks | pipes | rebar | cable | mixed, défaut mixed)
- États : `default`
- Ancres : `label`
- Données reçues par setState : aucune
- Budget : 3000 triangles, 4 matériaux
- Critères d'acceptation :
  - Chaque lot se reconnaît sans légende à la caméra iso, à taille réelle
  - Les lots se distinguent par leur forme en niveaux de gris
  - Aucune couleur d'état, aucun orange

### Le terrain de chantier (`site-ground`)

Un plateau maquette de 0,60 m en MAT_EARTH (bible, 18.5), arêtes du dessus en C3, de width × depth mètres ; son dessus est à 5 mm sous zéro, pour que les socles des lieux posés dessus se fondent dans la terre. data.zones dessine des dalles de 0,10 m : { x, z, width, depth, surface }, surface concrete (dalle, aire bétonnée) ou asphalt (voie d'accès ou de circulation). C'est GDC qui choisit les zones, par exemple plus de béton quand un bâtiment avance ; le composant ne fait que les dessiner. Il se pose sur le terrain (ground). Fiche validée par Pierre-Alain le 21 octobre 2026. Version 1.1.0 (constat D-2, décision de Pierre-Alain du 22 octobre 2026) : la largeur va jusqu'à 120 m, pour le terrain de trois ou quatre applications.

- Fichier : `components/site/site-ground/index.js`
- Production : Géométrie générée par le code du composant (paramétrique, liée aux données)
- Paramètres : `width` (nombre, 8 à 120, défaut 40) ; `depth` (nombre, 8 à 80, défaut 30)
- États : `default`
- Ancres : `label`
- Données reçues par setState : `zones` (liste de { x, z, width, depth, surface: concrete \| asphalt }, en mètres, origine au centre du plateau)
- Budget : 2000 triangles, 3 matériaux
- Critères d'acceptation :
  - Les socles des lieux posés dessus se fondent dans la terre, sans scintillement
  - Le béton et l'enrobé se distinguent de la terre en niveaux de gris
  - Les zones se redessinent quand data.zones change

## G2 : Les bâtiments et leurs états

Montrer l'avancement d'une application par l'état de son bâtiment.

| Ordre | Identifiant | Nom | Nature | But | Statut |
|---|---|---|---|---|---|
| 1 | `building-kit` | Le kit de bâtiment | Bibliothèque de modèles 3D produite par un script Blender (blender/assets/<id>.py) et réutilisée par plusieurs composants : components/kit/<id>/ | Les pièces modulaires communes à tous les bâtiments, aux mêmes dimensions d'assemblage. | livré |
| 3 | `survey-poles` | Les gabarits | Composant 3D Three.js, conforme à docs/contrat-composant.md | Une fiche à l'étude : les perches qui montrent le volume futur, comme pendant la mise à l'enquête. | livré |
| 4 | `shared-basement` | Le sous-sol commun | Composant 3D Three.js, conforme à docs/contrat-composant.md | Les ouvrages communs : base de données ou composants partagés par plusieurs applications. | livré |

### Le kit de bâtiment (`building-kit`)

Sols, fondations, poteaux, poutres, dalles, murs, portes, fenêtres, toitures, escaliers, échafaudages, enseignes (bible, section 6) ; trame commune de 3 mètres. Utilisé par building, building-interior et les bureaux.

- Dossier : `components/kit/building-kit/`, script `blender/assets/building-kit.py`
- Production : Modèle GLB produit par un script Blender du dépôt ; le composant le pilote (états, animations, ancres)
- Modèles : `BLD_KIT_A_v003.glb`
- Budget : 20000 triangles, 10 matériaux
- Critères d'acceptation :
  - Toutes les pièces partagent la même trame et la même hauteur d'étage
  - Chaque pièce est un nœud nommé BLD_KIT_A_<PIECE>
  - Un bâtiment de démonstration s'assemble sans retouche

### Les gabarits (`survey-poles`)

Quatre perches et les rubans qui dessinent le volume ; paramètres de taille.

- Fichier : `components/building/survey-poles/index.js`
- Production : Géométrie générée par le code du composant (paramétrique, liée aux données)
- Paramètres : `width` (nombre, 2 à 30, défaut 8) ; `depth` (nombre, 2 à 30, défaut 6) ; `height` (nombre, 2 à 20, défaut 6)
- États : `default`
- Ancres : `label`, `badge`
- Données reçues par setState : aucune
- Budget : 1000 triangles, 3 matériaux
- Critères d'acceptation :
  - Reconnaissable comme des gabarits suisses

### Le sous-sol commun (`shared-basement`)

Une galerie souterraine visible en coupe, qui relie les bâtiments concernés.

- Fichier : `components/building/shared-basement/index.js`
- Production : Pièces d'un kit Blender assemblées par le code selon les données (avancement, nombre de pièces) ; kit `building-kit`
- Modèles : `kit:building-kit/BLD_KIT_A_v003.glb`
- Paramètres : `length` (nombre, 4 à 60, défaut 12) ; `links` (nombre de bâtiments reliés, 2 à 6, défaut 2)
- États : `default`, `active`
- Ancres : `label`, `badge`
- Données reçues par setState : `progress` (0 à 1, avancement de la galerie)
- Budget : 10000 triangles, 6 matériaux
- Critères d'acceptation :
  - Compréhensible comme un ouvrage commun, pas comme un tunnel décoratif

## G3 : Les personnages et les engins

Montrer qui travaille, où, et dans quel état.

| Ordre | Identifiant | Nom | Nature | But | Statut |
|---|---|---|---|---|---|
| 3 | `excavator` | La pelleteuse | Composant 3D Three.js, conforme à docs/contrat-composant.md | L'état fouille d'un bâtiment : le terrassement d'une nouvelle application. | livré |
| 4 | `crane` | La grue | Composant 3D Three.js, conforme à docs/contrat-composant.md | La fusion vers dev, à la réception : on pose la pièce finie. | livré |
| 5 | `delivery-truck` | Le camion de livraison | Composant 3D Three.js, conforme à docs/contrat-composant.md | L'arrivée d'une nouvelle dépendance : un événement à surveiller pour la sécurité. | livré |

### La pelleteuse (`excavator`)

Une pelleteuse à chenilles ; en état digging, le bras creuse.

- Fichier : `components/machine/excavator/index.js`
- Production : Modèle GLB produit par un script Blender du dépôt ; le composant le pilote (états, animations, ancres) ; modèle `VEH_EXCAVATOR_A_v001`
- Modèles : `VEH_EXCAVATOR_A_v001.glb`
- Animations : `ANM_EXCAVATOR_A_DIGGING`
- États : `idle`, `digging`
- Ancres : `label`
- Données reçues par setState : aucune
- Budget : 10000 triangles, 6 matériaux
- Critères d'acceptation :
  - Utilisable seule ou dans le bâtiment en état excavation

### La grue (`crane`)

Une grue à tour ; en état lifting, une charge monte et se pose.

- Fichier : `components/machine/crane/index.js`
- Production : Modèle GLB produit par un script Blender du dépôt ; le composant le pilote (états, animations, ancres) ; modèle `VEH_TOWER_CRANE_A_v003`
- Modèles : `VEH_TOWER_CRANE_A_v003.glb`
- Animations : `ANM_TOWER_CRANE_A_LIFTING`
- Paramètres : `height` (nombre, 6 à 30, défaut 14)
- États : `idle`, `lifting`
- Ancres : `label`, `badge`
- Données reçues par setState : aucune
- Budget : 15000 triangles, 8 matériaux
- Critères d'acceptation :
  - Exemple fourni : sert de modèle de composant produit par Blender
  - Grue reconnaissable à son mât, sa flèche et son crochet
  - lifting sans animation : charge levée, image fixe

### Le camion de livraison (`delivery-truck`)

Un camion de chantier ; en état arriving, GDC le déplace jusqu'à l'aire et le composant joue le déchargement.

- Fichier : `components/machine/delivery-truck/index.js`
- Production : Modèle GLB produit par un script Blender du dépôt ; le composant le pilote (états, animations, ancres) ; modèle `VEH_DELIVERY_TRUCK_A_v001`
- Modèles : `VEH_DELIVERY_TRUCK_A_v001.glb`
- Animations : `ANM_DELIVERY_TRUCK_A_UNLOAD`
- États : `idle`, `arriving`
- Ancres : `label`, `badge`
- Données reçues par setState : aucune
- Budget : 10000 triangles, 6 matériaux
- Critères d'acceptation :
  - Lot plus tardif : utile quand le harnais enregistre les dépendances ajoutées

## G4 : Les vues intérieures

Au clic, entrer dans un bâtiment ou un bureau : une pièce par fiche, les ouvriers au travail.

| Ordre | Identifiant | Nom | Nature | But | Statut |
|---|---|---|---|---|---|
| 2 | `office-interior` | La salle de brainstorming | Composant 3D Three.js, conforme à docs/contrat-composant.md | La vue rapprochée d'une séance de brainstorming : les gens autour de la table, les idées au tableau. | livré |

### La salle de brainstorming (`office-interior`)

GDC zoome dessus pendant une phase de brainstorming (décision de Pierre-Alain du 20 octobre 2026 ; les bureaux eux-mêmes sont architect-office et design-office). Un conteneur du kit container-kit coupé en maison de poupée, sur son socle, sans totem ni marches : une longue table (1,80 m de 1 à 4 places, deux tables bout à bout de 5 à 8), un grand tableau d'idées sur le bout gauche. Décor selon kind : architect, maquette blanche et rouleaux de plans ; studies, écrans et étagère de classeurs. Les personnages sont posés par GDC aux ancres desk:n, autour de la table. idle : salle rangée, chaises rentrées, tableau vide. active : chaises tirées aux places occupées (data.activeDesks), huit feuilles s'accrochent au tableau une à une, une seule fois, puis restent ; toutes affichées d'un coup avec reducedMotion.

- Fichier : `components/interior/office-interior/index.js`
- Production : Pièces d'un kit Blender assemblées par le code selon les données (avancement, nombre de pièces) ; kit `container-kit`
- Modèles : `ENV_BRAINSTORM_ROOM_A_v001.glb`, `kit:container-kit/ENV_CONTAINER_KIT_A_v003.glb`
- Paramètres : `kind` (architect | studies, défaut architect) ; `desks` (nombre de places, 1 à 8, défaut 4)
- États : `idle`, `active`
- Ancres : `label`, `desk:*`
- Données reçues par setState : `activeDesks` (nombre de places occupées (chaises tirées))
- Budget : 15000 triangles, 10 matériaux
- Critères d'acceptation :
  - Ambiance intellectuelle, distincte du chantier
  - Distincte du bureau d'architecte et du bureau d'études au premier regard
  - Une place par personne, désignable (ancre desk:n)
  - État active : les feuilles s'accrochent une fois, puis restent ; rien ne bouge en continu

## G5 : Les signaux dans la scène

Désigner ce qui est choisi, ce qui attend, ce qui bloque.

| Ordre | Identifiant | Nom | Nature | But | Statut |
|---|---|---|---|---|---|
| 1 | `selection-ring` | L'anneau de sélection | Composant 3D Three.js, conforme à docs/contrat-composant.md | Montrer l'élément survolé ou choisi. | exemple |
| 2 | `decision-sign` | Le panneau de décision | Composant 3D Three.js, conforme à docs/contrat-composant.md | Une décision t'attend à cet endroit. | livré |
| 3 | `blocked-sign` | La barrière de blocage | Composant 3D Three.js, conforme à docs/contrat-composant.md | Un travail est bloqué ici. | livré |
| 4 | `defect-sign` | Le signal de défaut | Composant 3D Three.js, conforme à docs/contrat-composant.md | Un défaut est ouvert sur une partie habitée. | livré |
| 5 | `permit-board` | Le panneau du permis de construire | Composant 3D Three.js, conforme à docs/contrat-composant.md | Le permis de construire est accordé ; périmé, il demande ta nouvelle décision. | livré |

### L'anneau de sélection (`selection-ring`)

Un anneau au sol, discret au survol, marqué à la sélection, avec une respiration lente si les animations sont permises.

- Fichier : `components/signals/selection-ring/index.js`
- Production : Géométrie générée par le code du composant (paramétrique, liée aux données)
- Paramètres : `radius` (nombre, 0.3 à 10, défaut 1)
- États : `hidden`, `hover`, `selected`
- Ancres : aucune
- Données reçues par setState : aucune
- Budget : 600 triangles, 1 matériaux
- Critères d'acceptation :
  - Exemple fourni : sert de modèle de composant animé

### Le panneau de décision (`decision-sign`)

Un panneau de chantier rectangulaire sur poteau, avec une impulsion à son apparition, puis fixe. La couleur d'état n'est pas dans le modèle : le rouge est porté par le badge HTML posé sur l'ancre badge.

- Fichier : `components/signals/decision-sign/index.js`
- Production : Modèle GLB produit par un script Blender du dépôt ; le composant le pilote (états, animations, ancres) ; modèle `PRP_DECISION_SIGN_A_v001`
- Modèles : `PRP_DECISION_SIGN_A_v001.glb`
- États : `default`
- Ancres : `badge`
- Données reçues par setState : aucune
- Budget : 1000 triangles, 3 matériaux
- Critères d'acceptation :
  - Reconnaissable à sa forme seule, sans couleur d'état
  - Distinct de tout autre objet de la scène à taille normale

### La barrière de blocage (`blocked-sign`)

Une barrière de chantier orange avec un triangle.

- Fichier : `components/signals/blocked-sign/index.js`
- Production : Modèle GLB produit par un script Blender du dépôt ; le composant le pilote (états, animations, ancres) ; modèle `PRP_BLOCKED_BARRIER_A_v001`
- Modèles : `PRP_BLOCKED_BARRIER_A_v001.glb`
- États : `default`
- Ancres : `badge`
- Données reçues par setState : aucune
- Budget : 1000 triangles, 3 matériaux
- Critères d'acceptation :
  - Reconnaissable à sa forme seule (barrière et triangle)
  - La couleur d'état est portée par le badge HTML

### Le signal de défaut (`defect-sign`)

Un cône de chantier orange fluo à deux bandes blanches, sur sa semelle, posé devant la façade ou dans la pièce concernée (décisions de Pierre-Alain du 21 octobre 2026 : le cône seul, sans ruban ; l'orange fluo des vrais cônes, distinct de l'orange chantier de la barrière de blocage).

- Fichier : `components/signals/defect-sign/index.js`
- Production : Modèle GLB produit par un script Blender du dépôt ; le composant le pilote (états, animations, ancres) ; modèle `PRP_DEFECT_CONE_A_v001`
- Modèles : `PRP_DEFECT_CONE_A_v001.glb`
- États : `default`
- Ancres : `badge`
- Données reçues par setState : aucune
- Budget : 1000 triangles, 3 matériaux
- Critères d'acceptation :
  - Reconnaissable à sa forme seule
  - Se pose sur une façade ou dans une pièce

### Le panneau du permis de construire (`permit-board`)

Un panneau de permis sur deux poteaux, posé à l'entrée du chantier quand le permis est accordé (comme sur un vrai chantier). Périmé, quand une pièce couverte a changé : le même panneau barré d'une bande en diagonale, reconnaissable à sa forme seule. Absent tant que le permis n'est pas accordé : GDC ne le pose pas. Aucune couleur d'état dans le modèle ; le badge HTML se pose sur l'ancre badge.

- Fichier : `components/signals/permit-board/index.js`
- Production : Modèle GLB produit par un script Blender du dépôt ; le composant le pilote (états, animations, ancres) ; modèle `PRP_PERMIT_BOARD_A_v001`
- Modèles : `PRP_PERMIT_BOARD_A_v001.glb`
- États : `granted`, `expired`
- Ancres : `badge`
- Données reçues par setState : aucune
- Budget : 1200 triangles, 3 matériaux
- Critères d'acceptation :
  - Reconnaissable comme un panneau de permis à sa forme seule, distinct du panneau de décision
  - L'état périmé se lit par la forme (la bande en diagonale), sans couleur d'état

## G6 : Les éléments d'interface

Barre du haut, navigation, inspecteur, fiche d'agent, badges, barres de progression, copie et actions rapides.

| Ordre | Identifiant | Nom | Nature | But | Statut |
|---|---|---|---|---|---|
| 0 | `fonts` | Les polices | Document de référence, pas de code | Manrope pour les titres, Inter pour l'interface, une police à chasse fixe pour les références. | livré |
| 1 | `top-bar` | La barre du haut | Élément d'interface HTML (élément personnalisé), conforme à docs/contrat-composant.md, partie interface | Le projet, ce qui t'attend, qui travaille, la fraîcheur des données. | livré |
| 3 | `copy-button` | L'icône de copie | Élément d'interface HTML (élément personnalisé), conforme à docs/contrat-composant.md, partie interface | Copier le nom et l'identifiant d'un élément, pour le coller dans l'outil d'IA. | livré |
| 4 | `progress-bar` | La barre de progression | Élément d'interface HTML (élément personnalisé), conforme à docs/contrat-composant.md, partie interface | Montrer l'avancement d'une fiche ou d'un lot, avec sa règle de calcul. | livré |
| 5 | `notification-badge` | Le badge de notification | Élément d'interface HTML (élément personnalisé), conforme à docs/contrat-composant.md, partie interface | Compter les alertes, les avertissements, ou montrer que tout est validé. | livré |
| 6 | `inspector` | L'inspecteur | Élément d'interface HTML (élément personnalisé), conforme à docs/contrat-composant.md, partie interface | La fiche de l'élément choisi : avancement, lots, tâches, blocages, réussites, actions attendues. | livré |
| 7 | `quick-actions` | Les actions rapides | Élément d'interface HTML (élément personnalisé), conforme à docs/contrat-composant.md, partie interface | Copier un petit prompt prêt à l'emploi qui vise l'élément choisi. | livré |
| 8 | `agent-popup` | La fiche d'un agent | Élément d'interface HTML (élément personnalisé), conforme à docs/contrat-composant.md, partie interface | Au clic sur un personnage : son illustration animée, ce qu'il fait, ce qu'il va faire, ce qu'on peut lui demander. | livré |

### Les polices (`fonts`)

Fichiers de police copiés dans le projet avec leur licence (OFL attendue, à vérifier) ; jamais chargés depuis Internet : le panneau fonctionne hors ligne.

- Critères d'acceptation :
  - Licence vérifiée et jointe
  - Aucune requête vers un service de polices

### La barre du haut (`top-bar`)

Nom du projet et ses initiales (en attendant un logo), nombre de décisions attendues, agents actifs, bloqués, inconnus, heure de la dernière mise à jour.

- Élément : `<gdc-top-bar>`
- Entrées (propriété data) : `project` (nom du projet) ; `decisions` (nombre de décisions attendues) ; `agents` ({ active, blocked, unknown } : nombres) ; `updatedAt` (date ISO de la dernière mise à jour) ; `staleAfter` (secondes avant avertissement de fraîcheur)
- Sorties (événements) : `gdc-select` (clic sur le compteur de décisions ou d'agents ; detail.id = decisions \| agents)
- Critères d'acceptation :
  - Tient sur un téléphone
  - La fraîcheur passe en avertissement au-delà d'un délai

### L'icône de copie (`copy-button`)

Petite icône à côté de tout élément désignable ; confirmation discrète ; repli si le presse-papiers est refusé.

- Élément : `<gdc-copy-button>`
- Entrées (propriété data) : `id` (identifiant stable) ; `text` (texte à copier)
- Sorties (événements) : `gdc-copy` (detail.id, detail.text, detail.ok (false si le presse-papiers est refusé))
- Critères d'acceptation :
  - Copie l'identifiant stable et le nom
  - Fonctionne au clavier

### La barre de progression (`progress-bar`)

Barre et fraction (« 3 / 7 critères prouvés ») ; la règle au survol.

- Élément : `<gdc-progress-bar>`
- Entrées (propriété data) : `done` (nombre prouvé) ; `total` (nombre attendu) ; `rule` (texte de la règle de calcul) ; `state` (état (couleur))
- Sorties (événements) : aucune
- Critères d'acceptation :
  - Jamais de pourcentage sans sa règle

### Le badge de notification (`notification-badge`)

Posé sur une ancre badge ; niveau le plus grave affiché, total en chiffre ; voir docs/signaletique.md.

- Élément : `<gdc-notification-badge>`
- Entrées (propriété data) : `counts` ({ error, waiting, blocked, done } : nombres)
- Sorties (événements) : aucune
- Critères d'acceptation :
  - Couleur, forme et icône pour chaque niveau
  - Masqué à zéro

### L'inspecteur (`inspector`)

Panneau latéral ; tout texte venu du harnais est affiché comme du texte, jamais comme du HTML.

- Élément : `<gdc-inspector>`
- Entrées (propriété data) : `id` (identifiant stable) ; `kind` (nature (fiche, lot, agent, lieu…)) ; `title` (nom affiché) ; `sections` (liste de { title, rows: [{ label, value, state?, ref? }] } : progression, lots, tâches, blocages, réussites, actions attendues ; ref : l'identifiant de l'élément cité, sa valeur devient un bouton qui émet gdc-select)
- Sorties (événements) : `gdc-close` (fermeture) ; `gdc-copy` (detail.id, detail.text) ; `gdc-select` (clic sur un élément cité (ligne avec ref) ; detail.id = ref)
- Critères d'acceptation :
  - Aucun contenu injecté comme du code
  - Sections repliables
  - Lisible en clair et en sombre

### Les actions rapides (`quick-actions`)

Liste de boutons fournie par GDC selon le type d'élément ; le texte copié est visible avant la copie.

- Élément : `<gdc-quick-actions>`
- Entrées (propriété data) : `id` (identifiant de l'élément) ; `actions` (liste de { label, prompt })
- Sorties (événements) : `gdc-copy` (detail.id, detail.text)
- Critères d'acceptation :
  - Le prompt cite l'identifiant
  - Ne déclenche jamais rien d'autre qu'une copie

### La fiche d'un agent (`agent-popup`)

Fenêtre avec l'illustration (lot G7) à gauche et trois colonnes à droite ; actions rapides propres à l'agent.

- Élément : `<gdc-agent-popup>`
- Entrées (propriété data) : `id` (identifiant de l'agent) ; `name` (prénom et rôle) ; `team` (équipe (mêmes valeurs que character) : architecture, studies, site, reception, operations avec leur couleur ; client et none sans couleur ; toute autre valeur affichée telle quelle) ; `state` (état (mêmes valeurs que character), affiché par un signe et un mot : work, typing, inspect, read, thinking, talk, walk → Actif (Travaille, Écrit, Inspecte, Lit, Réfléchit, Discute, Se déplace) ; waiting → Attend ta décision ; blocked → Bloqué ; celebrate → Terminé (A fini) ; idle → Au repos, sans signe ; unknown, absent ou autre → Inconnu) ; `doing` (liste de textes : ce qu'il fait) ; `next` (liste de textes : ce qu'il fera) ; `can` (liste de textes : ce qu'il sait faire) ; `actions` (liste de { label, prompt })
- Sorties (événements) : `gdc-close` (fermeture) ; `gdc-copy` (detail.id, detail.text (prompt copié))
- Critères d'acceptation :
  - Se ferme au clavier
  - Affiche « inconnu » quand le journal ne dit rien

## G7 : Les illustrations et les icônes

Donner un visage aux agents et une icône à chaque étape et chaque lieu.

| Ordre | Identifiant | Nom | Nature | But | Statut |
|---|---|---|---|---|---|
| 1 | `agent-portraits` | Les portraits des agents | Illustration ou icône SVG, animée en CSS si besoin | Un visage par agent, le même sur le panneau, la page de la méthode et les rapports. | livré |
| 2 | `step-icons` | Les icônes des étapes | Illustration ou icône SVG, animée en CSS si besoin | Une icône pour chacune des dix étapes de GDC, de l'idée aux transformations, et une pour le passage du feu vert. | livré |
| 3 | `place-icons` | Les icônes des lieux | Illustration ou icône SVG, animée en CSS si besoin | Une icône par lieu, pour la navigation et les rapports. | livré |

### Les portraits des agents (`agent-portraits`)

Un portrait pour le client (Pierre-Alain, sans casque) et un par prénom (Claire, Marc, Lina, David, Sarah, Noah, Tom, Paul, Iris, Yves, Victor, Emma, Robin, Julie, Olivier, Anne, Bernard, Fanny, Hélène), rendu depuis le personnage du kit dans un cadrage commun (bible, section 5 : Agent Portrait) ; états idle, talking, working. Décisions de Pierre-Alain du 21 octobre 2026 : un rendu Blender (blender/assets/agent-portraits.py, habillé par le kit) enveloppé dans un SVG, en buste de trois quarts face, fond transparent, sans couleur d'équipe ajoutée. Le SVG s'insère dans la page (pas en <img>) pour que la classe d'état s'applique ; talking et working animent doucement le buste, idle et « moins d'animations » le laissent fixe.

- Production : Modèle GLB produit par un script Blender du dépôt ; le composant le pilote (états, animations, ancres)
- États : `idle`, `talking`, `working`
- Entrées (propriété data) : `name` (identifiant de la personne dans components/kit/character-kit/equipe.json (nom du fichier SVG : client, claire, helene…)) ; `state` (idle \| talking \| working (classe CSS posée sur le <svg>, à la place de idle))
- Sorties (événements) : aucune
- Critères d'acceptation :
  - Cohérents avec les personnages 3D
  - Reconnaissables en petit (48 pixels)

### Les icônes des étapes (`step-icons`)

Jeu de onze icônes SVG, au trait, de même épaisseur, avec les identifiants des dix étapes de GDC (docs/maquette.md de GDC, ADR 0013) : idee (une ampoule), plans (le tracé des murs), permis (un document scellé), plans-execution (l'équerre graduée), preparation (la pelle de terrassement plantée), construction (le mur de briques), reception (la planchette), remise-des-cles (la clé), garantie (le bouclier, sans coche), transformations (deux flèches qui tournent) ; et feu-vert (le feu, sa lampe du bas allumée), l'icône du passage « Feu vert », qui n'est pas une étape. Version 2.0.0 (décisions de Pierre-Alain du 21 octobre 2026) : fichiers renommés selon GDC, survey retiré (le relevé n'est pas une étape), production devient remise-des-cles, green-light devient feu-vert, preparation et garantie dessinés. Grille de 24, trait de 2 à bouts ronds, une seule couleur héritée du texte (currentColor) ; décoratives (aria-hidden), le libellé de l'étape est écrit à côté. Dessins originaux.

- Entrées (propriété data) : `step` (identifiant de l'étape dans GDC (nom du fichier SVG) : idee, plans, permis, plans-execution, preparation, construction, reception, remise-des-cles, garantie, transformations ; ou feu-vert pour le passage du feu vert)
- Sorties (événements) : aucune
- Critères d'acceptation :
  - Lisibles à 20 pixels
  - Une seule couleur, héritée du texte

### Les icônes des lieux (`place-icons`)

Une icône par lieu, avec les identifiants des lieux de GDC, zone par zone (plan.zones, docs/maquette.md de GDC, ADR 0013) ; et une pour les bâtiments d'application. Les bureaux : bureau-architecte (le compas), bureau-client (la mallette), bureau-etudes (la calculatrice), panneau-permis (le panneau sur deux poteaux). Le chantier : baraque (le conteneur du conducteur de travaux), bureau-controle (le tampon), panneau-feu-vert (le panneau sur un poteau, sa lampe allumée, sans couleur), chantier (la grue). La réception, la remise des clés et la garantie : aire-reception (le camion de livraison), cabane-cles (la clé), cabane-garantie (le bouclier). Les transformations : cabane-transformations (les deux flèches), parking (la voiture). Hors des lieux : batiment (la maison, sa fenêtre allumée), pour le groupe « Les bâtiments » de la navigation. Version 2.0.0 (décisions de Pierre-Alain du 21 octobre 2026) : panneau-permis, panneau-feu-vert et les trois cabanes ajoutés ; une cabane porte l'emblème de son étape, le même dessin que step-icons ; batiment-habite devient batiment ; le parking garde la voiture. Les identifiants restent ceux de GDC, en français : ce sont des données, pas du code. Même famille que les icônes des étapes (grille de 24, trait de 2, currentColor). Dessins originaux.

- Entrées (propriété data) : `place` (identifiant du lieu dans GDC (nom du fichier SVG) : bureau-architecte, bureau-client, bureau-etudes, panneau-permis, baraque, bureau-controle, panneau-feu-vert, chantier, aire-reception, cabane-cles, cabane-garantie, cabane-transformations, parking ; ou batiment pour un bâtiment d'application)
- Sorties (événements) : aucune
- Critères d'acceptation :
  - Même famille que les icônes des étapes

## G8 : La ville vivante

Faire de la carte la visualisation du harnais : relier au survol la carte, le fil des déclencheurs et l'arbre des fiches ; montrer chaque application étage par étage, une fiche par étage et un lot par pièce ; faire vivre la ville de jour comme de nuit, au travail comme en pause, sans jamais ajouter un fait que GDC n'a pas envoyé (contrat de GDC, ADR 0013, schéma 3 de la scène).

| Ordre | Identifiant | Nom | Nature | But | Statut |
|---|---|---|---|---|---|
| 1 | `hover-link` | Le survol partagé | Document de référence, pas de code | Relier au survol, dans les deux sens, la carte, le fil des déclencheurs à gauche et l'arbre des fiches à droite. | livré |
| 2 | `building` | Le bâtiment (une application) | Composant 3D Three.js, conforme à docs/contrat-composant.md | Montrer l'avancement d'une application étage par étage : une fiche par étage, un lot par pièce. | livré |
| 3 | `floor-selector` | Le sélecteur d'étages | Élément d'interface HTML (élément personnalisé), conforme à docs/contrat-composant.md, partie interface | Choisir l'étage d'un bâtiment, c'est-à-dire la fiche à regarder ; la vue en coupe s'ouvre sur cet étage. | livré |
| 4 | `building-interior` | L'intérieur d'un bâtiment | Composant 3D Three.js, conforme à docs/contrat-composant.md | La vue micro : un étage ouvert, c'est-à-dire une fiche, avec une pièce par lot, l'étape où en est chaque lot et les experts au travail. | livré |
| 5 | `trigger-feed` | Le fil des déclencheurs | Élément d'interface HTML (élément personnalisé), conforme à docs/contrat-composant.md, partie interface | Lire, à côté de la carte, ce que le harnais vient de faire, action par action, dans l'ordre. | livré |
| 6 | `side-nav` | La navigation | Élément d'interface HTML (élément personnalisé), conforme à docs/contrat-composant.md, partie interface | Aller à un lieu, un agent, un bâtiment, une fiche ou un lot ; la caméra suit. La navigation descend jusqu'aux lots. | livré |
| 7 | `day-night` | L'heure réelle | Document de référence, pas de code | La carte suit l'heure réelle : le jour, une nuit pas trop sombre, une courte aube et un court crépuscule ; la nuit, les fenêtres disent où l'on travaille. | livré |
| 7 | `time-of-day` | Le moment de la carte | Élément d'interface HTML (élément personnalisé), conforme à docs/contrat-composant.md, partie interface | Suivre l'heure réelle, ou choisir le jour, l'aube ou la nuit pour y voir plus clair ; l'horaire du soleil de Fribourg. | livré |
| 8 | `floodlight` | Le projecteur de chantier | Composant 3D Three.js, conforme à docs/contrat-composant.md | Éclairer le chantier la nuit quand on y travaille. | livré |
| 9 | `character-kit` | Le personnage maître et son équipe | Bibliothèque de modèles 3D produite par un script Blender (blender/assets/<id>.py) et réutilisée par plusieurs composants : components/kit/<id>/ | Un squelette, une morphologie et des animations communes pour tous les agents. | livré |
| 10 | `character` | Le personnage (un agent) | Composant 3D Three.js, conforme à docs/contrat-composant.md | Montrer qui travaille, où, et dans quel état. | livré |
| 11 | `site-fence` | La clôture de chantier | Composant 3D Three.js, conforme à docs/contrat-composant.md | Cloisonner le chantier, comme tout chantier romand. | livré |
| 12 | `party-shed` | Le cabanon de la fête | Composant 3D Three.js, conforme à docs/contrat-composant.md | Montrer la pause : le chantier est fermé et l'équipe fait la fête au cabanon en attendant ta décision. | livré |
| 13 | `city-car` | La voiture d'ambiance | Composant 3D Three.js, conforme à docs/contrat-composant.md | Faire vivre la ville autour du chantier, sans rien dire du harnais. | à faire |
| 14 | `city-map` | La carte vivante | Document de référence, pas de code | Assembler et animer la carte du chantier à partir des scènes que GDC envoie : où chaque élément se pose, par où chacun marche, et la vie du chantier qui naît de l'état reçu. | livré |
| 15 | `agent-marker` | Le repère d'agent | Élément d'interface HTML (élément personnalisé), conforme à docs/contrat-composant.md, partie interface | Repérer et attraper facilement, sur la carte entière, les agents avec qui on peut ou doit interagir. | livré |
| 16 | `panel-rail` | Le rail d'un panneau | Élément d'interface HTML (élément personnalisé), conforme à docs/contrat-composant.md, partie interface | Fermer un panneau du bord (l'arbre, le fil, le planning) en une bande fine qui garde ses badges, le rouvrir et, pour le planning, le redimensionner : une décision qui attend Pierre-Alain reste visible. | livré |
| 17 | `site-schedule` | Le planning du chantier | Élément d'interface HTML (élément personnalisé), conforme à docs/contrat-composant.md, partie interface | Lire en bas du panneau l'histoire du chantier en Gantt, de l'étape à l'application, à la fiche et au lot : le passé avec ses vraies dates, le futur à la file, sans date. | à faire |

### Le survol partagé (`hover-link`)

Un événement commun et une entrée commune pour tous les éléments qui montrent du travail référencé. Toutes les actions et les éléments de GDC liés au travail portent ref (application, fiche, lot). L'événement gdc-hover porte detail.ref = { application, fiche?, lot? } quand le pointeur ou le focus entre sur un élément référencé, et detail.ref = null quand il en sort. L'entrée highlight a la même forme : GDC la renvoie à tous les éléments. Deux références correspondent quand l'une prolonge l'autre : survoler un lot allume sa fiche et son application ; survoler une application allume ses fiches et ses lots. Cette règle est écrite une seule fois, ctx.correspond(a, b), injectée comme ctx.signIcon. Côté carte, l'assemblage pose l'anneau de sélection (selection-ring, état hover) sur le bâtiment, l'étage ou la pièce qui correspond, et émet gdc-hover quand on survole un bâtiment, un étage ou une pièce. Fiche validée par Pierre-Alain le 21 octobre 2026.

- Fabriqué par : intégrateur d'interface
- Critères d'acceptation :
  - Le contrat est écrit dans docs/contrat-composant.md (section des éléments d'interface) ; ctx.correspond est fourni par src/interface.js
  - Le focus clavier vaut un survol
  - Pas de rafale : un seul événement par changement de référence, null à la sortie
  - La mise en évidence est un fond teinté et un trait d'encre, plus léger que selected, sans couleur d'état et sans faire sauter la liste
  - Le contrôle vérifie que tout élément qui émet gdc-hover lit aussi highlight
  - La page /interface.html relie le fil, la navigation et le sélecteur d'étages

### Le bâtiment (une application) (`building`)

Un étage par fiche, la plus ancienne en bas (etages de GDC, ADR 0013). Chaque étage suit son stade : plot (rien de construit ; les gabarits sont survey-poles, posés par GDC) jusqu'au feu vert ; excavation puis foundations pendant la préparation, au sol la fouille avec la pelle puis les semelles, en étage la toiture déposée et la dalle à nu puis les attentes d'armatures ; structure (poteaux, dalle, échafaudage de l'étage ; chaque pièce, une travée par lot, se ferme quand son lot est fini), envelope (murs fermés, échafaudage encore là), finishing (fenêtres posées, échafaudage déposé) pendant la construction ; inspection à la réception ; completed à la remise des clés. Six étages visibles au plus : le rez regroupe les fiches livrées les plus anciennes, et s'il reste encore trop d'étages, les plus anciens s'y fondent aussi ; le rez prend alors l'aspect du moins avancé d'entre eux (src/etages.js, la même règle que floor-selector). Un bâtiment habité qui reçoit une fiche est surélevé : il gagne un étage en haut, sa toiture monte d'un niveau, le bas reste habité, et seul l'étage du haut est en chantier, avec un petit échafaudage et deux ou trois cônes de balisage groupés au pied (sans badge : le défaut reste un cône seul avec son badge, docs/signaletique.md). L'état alteration n'existe pas (décision de Pierre-Alain du 21 octobre 2026). Les huit états restent ceux que GDC envoie : sans data.floors, l'état donne un bâtiment d'un étage à ce stade ; avec data.floors, l'étage est le niveau de vérité. Fiche validée par Pierre-Alain le 21 octobre 2026. Version 2.1.0 (plan D-1b, décision de Pierre-Alain du 22 octobre 2026) : à chaque construction, les pièces posées dans un même groupe (la parcelle, un étage, une pièce, la toiture) sont fusionnées par matériau, un maillage par matériau et par groupe au lieu d'une copie par pièce ; groupes, ancres, vitres et transitions inchangés, la pelleteuse reste à part. Rien ne change à l'écran.

- Fichier : `components/building/building/index.js`
- Fabriqué par : modeleur
- Production : Pièces d'un kit Blender assemblées par le code selon les données (avancement, nombre de pièces) ; kit `building-kit`
- Modèles : `BLD_SITEWORK_A_v002.glb`, `kit:building-kit/BLD_KIT_A_v003.glb`, `machine:excavator/VEH_EXCAVATOR_A_v001.glb`
- Paramètres : `type` (house | block | hall, défaut block)
- États : `plot`, `excavation`, `foundations`, `structure`, `envelope`, `finishing`, `completed`, `inspection`
- Ancres : `label`, `badge`, `progress`, `door`, `floor:*`, `room:*`
- Données reçues par setState : `floors` (du bas vers le haut, une entrée par fiche : { id, stage : un des huit états, rooms : [{ id, done }] (un lot par pièce), occupied : un agent travaille à cet étage (les fenêtres la nuit) })
- Budget : 20000 triangles, 10 matériaux
- Critères d'acceptation :
  - Chaque stade se reconnaît sans légende sur un étage, au sol comme en étage
  - Six étages à des stades différents restent lisibles (planche AuditApp à trois applications)
  - fixtures/projet-type et fixtures/trois-applications se rejouent sans saut : l'étage nouveau monte, la toiture remonte ; reducedMotion : l'état final directement
  - Ancres floor:n pour chaque étage visible et room:<étage>-<pièce> pour chaque pièce
  - Les vitres de chaque étage sont nommées, pour que l'assemblage les éclaire la nuit (day-night)
  - Les cônes de balisage ne se confondent pas avec defect-sign sur une planche côte à côte
  - En qualité low, moins de 6000 triangles
  - Brief validé par Pierre-Alain avant la fabrication ; ligne au journal des versions

### Le sélecteur d'étages (`floor-selector`)

Un panneau d'ascenseur, l'étage du haut en haut. Chaque bouton porte le niveau (R, 1, 2…), le nom de la fiche, le numéro de son étape et son signe d'état s'il en a un. Six étages au plus, comme le bâtiment : le rez regroupe les fiches livrées les plus anciennes (« Rez · 4 fiches livrées ») et se déplie pour en choisir une ; s'il reste encore trop d'étages, les plus anciens se fondent aussi dans le rez (« Rez · n fiches »). Fiche validée par Pierre-Alain le 21 octobre 2026. Version 1.1.0 : gdc-select porte aussi la référence de la fiche choisie, { id, ref, building }, pour que le panneau de GDC traite la sélection comme celle du fil et de l'arbre (docs/planning-derniere-passe-de-gdc.md, section 6) ; building reste. Version 1.1.0 validée par Pierre-Alain le 22 octobre 2026.

- Fabriqué par : intégrateur d'interface
- Élément : `<gdc-floor-selector>`
- Entrées (propriété data) : `building` ({ id, name } : le bâtiment) ; `floors` (du bas vers le haut, une entrée par fiche : { id, name, etape, state?, delivered? } ; state est l'un des six états de la signalétique) ; `selected` (identifiant de la fiche choisie) ; `highlight` (référence survolée ailleurs ({ application, fiche?, lot? } ou null))
- Sorties (événements) : `gdc-select` (detail.id = fiche choisie, detail.ref = sa référence { application, fiche } (l'application est building.id ; null sans bâtiment identifié), detail.building = bâtiment) ; `gdc-hover` (detail.ref = { application, fiche } survolée, ou null)
- Critères d'acceptation :
  - Utilisable au clavier : flèches haut et bas, Début, Fin, Entrée
  - La règle de regroupement est écrite une seule fois (src/etages.js) et sert au bâtiment comme au sélecteur : ils montrent toujours les mêmes étages
  - Émet gdc-hover et lit highlight (le survol partagé)
  - Devient une rangée sur téléphone
  - Lisible en clair et en sombre
  - Ligne au journal des versions

### L'intérieur d'un bâtiment (`building-interior`)

Une coupe en maison de poupée, comme en 1.0, mais d'un seul étage, celui choisi au sélecteur d'étages (floor-selector). Une pièce de 6 × 3 m par lot, en grappe, jamais en ligne ; l'enveloppe suit le stade de l'étage (data.floor.stage). Chaque pièce montre où en est son lot par un aspect : todo (vide : à faire, cadre, explore, plan), preparing (traçage au sol, attentes : tests), building (en travaux : code, verifie, securite, ou en_cours sans phase), finishing (finitions : relis, corrige), done (finie : prouve, livre, fini), defect (un défaut visible, comme en 1.0). La traduction de la phase du lot (pieces[].phase de GDC, les phases du run) en aspect est faite par l'assemblage, sur le modèle du regroupement des étages de GDC ; quand phase manque, il se rabat sur statut. Le nom de la phase s'affiche au survol, dans l'interface, jamais dans la 3D. Les agents sont des composants character posés par GDC à l'ancre de leur pièce (piece du personnage). État default : la vue s'ouvre ; hidden : elle se ferme. Fiche validée par Pierre-Alain le 21 octobre 2026. Décisions du 22 octobre 2026 : une pièce n'est defect que si un defect-sign porte son lot (ref.lot), un défaut sur la fiche seule ne touche aucune pièce ; les agents de l'étage sans pièce attendent sur le palier, devant ; un clic sur un étage du bâtiment ouvre cet étage (sur le rez regroupé ou le bâtiment : l'étage en chantier le plus haut, sinon le dernier) ; abandonne donne todo, lecon, deploie et retour donnent done ; un lot fini est done et un lot abandonné todo quelle que soit la phase de son run (comme building, où seul fini ferme la travée).

- Fichier : `components/interior/building-interior/index.js`
- Fabriqué par : modeleur
- Production : Pièces d'un kit Blender assemblées par le code selon les données (avancement, nombre de pièces) ; kit `building-kit`
- Modèles : `BLD_INTERIOR_A_v002.glb`, `kit:building-kit/BLD_KIT_A_v003.glb`
- Paramètres : `rooms` (nombre de lots, 1 à 12, défaut 4)
- États : `default`, `hidden`
- Ancres : `label`, `room:*`
- Données reçues par setState : `floor` ({ stage : un des huit états de building } : l'enveloppe de l'étage) ; `rooms` (liste, une entrée par lot : { id, state: todo \| preparing \| building \| finishing \| done \| defect, trades: [métiers présents] })
- Budget : 20000 triangles, 10 matériaux
- Critères d'acceptation :
  - Chaque aspect de pièce se reconnaît sans légende
  - La vue s'ouvre depuis le sélecteur d'étages, sur l'étage choisi
  - fixtures/trois-applications, étape 7 : Julie est dans la pièce L1 de « Saisir un constat hors ligne »
  - Transition d'entrée et de sortie douce, figée si reducedMotion
  - Ligne au journal des versions

### Le fil des déclencheurs (`trigger-feed`)

Une liste, la plus récente en haut ; les actions d'un même instant (ts) sont groupées sous leur heure. Chaque ligne montre la phrase en clair de GDC (phrase), et le portrait de l'agent quand l'action concerne un personnage (ctx.portrait). Les actions du régime du chantier (ouverture, pause, fermeture) font des séparateurs sur toute la largeur. Une ligne qui porte une référence se survole (gdc-hover) et se clique (gdc-select). Fiche validée par Pierre-Alain le 21 octobre 2026. Dans un instant aussi, la plus récente en haut : l'ordre reçu, retourné ; le changement de régime, que GDC envoie en premier, se retrouve en bas de son instant, et replié sur téléphone on voit la dernière action reçue (décision de Pierre-Alain du 22 octobre 2026). Version 1.1.0 (docs/planning-derniere-passe-de-gdc.md, section 6 ; docs/planning-plan-atelier.md, sections 2.3 et I-6) : chaque action porte sa cause, l'identifiant complet du fait du journal qui l'a produite (evt:<journal>/<id>), ou null quand elle est déduite (deduit : silence, delai, dossier). Une ligne qui porte une référence ou une cause se clique ; gdc-select porte { id, ref, evt }, { id, ref } pour une action sans cause, { id, evt } pour une action sans référence (un changement de régime, un bureau, un personnage hors d'un bâtiment) ; une action sans l'une ni l'autre reste une ligne lisible. Le choix relayé par GDC, d'où qu'il vienne (selected), marque les actions dont la cause vaut son evt (plusieurs actions d'un même fait sont toutes marquées). Au moment du choix seulement, le fil défile jusqu'à la première si aucune n'est entière en vue, et l'arrêt de tabulation y va ; un fil masqué le fait à sa réouverture, replié sur téléphone quand on le déplie ; une action du fait qui arrive plus tard est marquée sans faire bouger la liste ; un choix sans evt ne marque rien. selected est une propriété à part, comme highlight : elle ne redessine rien.

- Fabriqué par : intégrateur d'interface
- Élément : `<gdc-trigger-feed>`
- Entrées (propriété data) : `actions` (liste des actions telle que GDC la rend (gdc scene --avant) : { ts, action, element, id, phrase, ref?, motif?, cause, deduit? } ; cause : evt:<journal>/<id>, ou null avec deduit (silence, delai, dossier) ; le fil garde celles qu'il reçoit, jusqu'à limit, sans ajouter deux fois une action identique : GDC peut envoyer le lot du moment comme toute la liste ; le premier data est l'état de départ ; pour vider le fil, on recrée l'élément (décision de Pierre-Alain du 22 octobre 2026)) ; `limit` (nombre d'actions gardées, défaut 200) ; `highlight` (référence survolée ailleurs ({ application, fiche?, lot? } ou null)) ; `selected` (le dernier gdc-select relayé par GDC, d'où qu'il vienne ({ id, ref?, evt?, etape? }), ou null ; propriété à part comme highlight : un evt marque les actions dont la cause le vaut ; au moment du choix, le fil défile jusqu'à la première si aucune n'est en vue)
- Sorties (événements) : `gdc-select` (clic sur une action qui porte une référence ou une cause : { id, ref, evt } ; { id, ref } sans cause ; { id, evt } sans référence ; id = l'élément de l'action, evt = sa cause, la chaîne complète evt:<journal>/<id>) ; `gdc-hover` (detail.ref = la référence de l'action survolée, ou null)
- Critères d'acceptation :
  - Tout texte venu du harnais est affiché comme du texte, jamais comme du HTML
  - Utilisable au clavier : un seul arrêt de tabulation, flèches, Entrée
  - Les nouvelles actions sont annoncées poliment aux lecteurs d'écran, un instant à la fois
  - Une nouvelle action arrive avec une seule impulsion douce ; rien ne bouge si l'utilisateur demande moins d'animations
  - Si l'utilisateur a remonté la liste, elle ne saute pas : un bouton « n nouvelles actions » ramène en haut
  - Repliée sur la dernière action sur téléphone
  - Lisible en clair et en sombre
  - Lit cause : evt:<journal>/<id>, ou null avec deduit ; un champ inconnu est ignoré
  - Au clic, gdc-select porte { id, ref, evt }, { id, ref } sans cause, { id, evt } sans référence
  - Un choix relayé avec un evt marque ses actions, sans couleur d'état ; au moment du choix, le fil défile jusqu'à la première si aucune n'est en vue, sans glissement avec moins d'animation, et ne saute jamais ensuite
  - Ligne au journal des versions

### La navigation (`side-nav`)

La navigation devient un arbre (choix de Pierre-Alain du 21 octobre 2026, plutôt qu'un arbre séparé, dans sa propre colonne) : un élément d'un groupe peut avoir des enfants, sur trois niveaux au plus, selon le modèle d'arbre ARIA. Le groupe « Les bâtiments » descend jusqu'aux fiches (les étages) puis aux lots (les pièces) ; chaque nœud a son signe d'état, son nom et, pour une fiche, son numéro d'étape et sa fraction de lots finis. Les fiches livrées sont repliées sous « Livrées · n », toujours consultables. La recherche trouve aussi un lot et ouvre ses parents. GDC place la colonne ; l'arbre ne suppose aucun côté (dans le panneau de GDC, il est à gauche de la carte et le fil des déclencheurs à droite : dernière passe de GDC, section 6). Fiche validée par Pierre-Alain le 21 octobre 2026. Décisions de Pierre-Alain du 22 octobre 2026 : GDC marque une fiche livrée (delivered), donne la fraction de lots finis en { done, total } et un identifiant unique dans tout l'arbre à chaque nœud. Sur téléphone, pendant une recherche, les lots trouvés suivent leur fiche dans la deuxième rangée (décision de Pierre-Alain du 22 octobre 2026).

- Fabriqué par : intégrateur d'interface
- Élément : `<gdc-side-nav>`
- Entrées (propriété data) : `groups` (liste de { title, items } ; un item : { id, name, state?, ref?, etape?, progress?, delivered?, children? : [items] }, trois niveaux au plus ; id est unique dans tout l'arbre (GDC compose celui d'un lot, par exemple 001-cloturer-un-audit/L1) ; state est l'un des six états de la signalétique, absent pas de signe, toute autre valeur « inconnu » ; ref : { application, fiche?, lot? } ; progress : { done, total }, les lots finis sur le total, affiché « 1/3 » ; delivered : un enfant livré est rangé sous « Livrées · n » de son parent (décisions de Pierre-Alain du 22 octobre 2026)) ; `selected` (identifiant sélectionné ; ses parents s'ouvrent quand il change (décision de Pierre-Alain du 22 octobre 2026)) ; `expanded` (identifiants des nœuds dépliés ; quand la liste change, les nœuds ajoutés s'ouvrent et les nœuds retirés se plient ; entre deux changements, l'arbre garde ce que l'utilisateur plie et déplie (décision de Pierre-Alain du 22 octobre 2026)) ; `highlight` (référence survolée ailleurs ({ application, fiche?, lot? } ou null))
- Sorties (événements) : `gdc-select` (detail.id = identifiant choisi, detail.ref = sa référence s'il en a une) ; `gdc-hover` (detail.ref = la référence du nœud survolé, ou null)
- Critères d'acceptation :
  - Utilisable au clavier selon le modèle d'arbre ARIA : flèches haut et bas, gauche pour plier, droite pour déplier, Début, Fin, Entrée
  - La recherche trouve un lot et ouvre ses parents
  - Les fiches livrées restent consultables, repliées sous « Livrées · n »
  - Émet gdc-hover et lit highlight (le survol partagé)
  - Sur téléphone, la rangée de pastilles montre le premier niveau ; choisir un bâtiment ouvre une deuxième rangée avec ses fiches
  - Ligne au journal des versions

### L'heure réelle (`day-night`)

Pas un composant. 1. src/lumiere.json gagne une recette de nuit (ciel, lune à la place du soleil, intensités) à côté de celle du jour, un bloc transitions, un bloc fenetres (une couleur blanc chaud, une intensité faible et une franche) et la couleur des projecteurs (floodlight) ; il est séparé de la palette exprès, aucun modèle n'est à reconstruire. 2. L'assemblage de la carte, dans la bibliothèque livrée à GDC, lit l'heure du poste et calcule le lever et le coucher du soleil à Fribourg selon la date, sur le poste, sans réseau (choix de Pierre-Alain). Il éclaire les vitres comme il désature les zones grises : sur des copies des matériaux de vitre, sans logique dans les composants ; faiblement sur tout bâtiment habité et tout bureau, franchement là où un agent travaille (bureau active, étage occupied du bâtiment, conteneur où se trouve un agent). 3. La galerie gagne une bascule jour, aube et nuit pour les revues. Fiche validée par Pierre-Alain le 21 octobre 2026. Décisions de Pierre-Alain du 22 octobre 2026, sur planche : la recette de nuit, le fond de nuit teinté, les fenêtres faibles (0,4) et franches (1,0) ; le bureau de contrôle, sans vitre, ne s'éclaire pas ; l'utilisateur peut forcer le moment avec time-of-day.

- Fabriqué par : directeur artistique (la recette) ; modeleur (les vitres par étage du bâtiment)
- Critères d'acceptation :
  - Le jour, rien ne change : le cube étalon reste conforme
  - La nuit, sur la capture des valeurs, chaque objet se lit à sa forme et l'interface reste lisible
  - Les vitres éclairées sont blanc chaud, jamais une couleur d'état
  - L'aube et le crépuscule durent 30 minutes chacun, centrés sur le lever et le coucher du soleil à Fribourg
  - Aucune horloge du réseau : l'heure du poste
  - Le passage est trop lent pour être une animation : rien de particulier avec moins d'animations

### Le moment de la carte (`time-of-day`)

Fabriqué avec day-night. Un sélecteur à quatre positions, Auto, Jour, Aube et Nuit, que GDC pose sur la carte. Il montre aussi l'horaire : l'heure du poste, le moment et le prochain passage (« 18:42 · Crépuscule · nuit à 18:48 »), ainsi que le lever et le coucher du soleil à Fribourg. Auto suit le soleil. Un moment choisi retombe de lui-même au prochain passage, et l'élément l'annonce (« Jour choisi · heure réelle à 07:44 »). L'élément n'interprète rien : GDC lui donne carte.horaire() et transmet le choix à carte.regleHeure. Décisions de Pierre-Alain du 22 octobre 2026 : un sélecteur, une durée jusqu'au prochain passage, l'horaire affiché. Pas de durée minimale : un choix retombe toujours au prochain passage. L'entrée horaire et les valeurs auto, jour, aube et nuit gardent la langue de l'API de la carte, le reste du code est en anglais (décisions du même jour).

- Fabriqué par : intégrateur d'interface
- Élément : `<gdc-time-of-day>`
- Entrées (propriété data) : `horaire` (carte.horaire() : { mode, moment, jour, maintenant, lever, coucher, prochain: { instant, moment }, fin }. mode vaut auto, jour, aube ou nuit ; moment vaut jour, aube, crepuscule ou nuit ; les instants sont en millisecondes. GDC le relit à chaque update de la carte qui rend true, et au moins une fois par minute pour l'heure affichée.)
- Sorties (événements) : `gdc-select` (detail.id = auto \| jour \| aube \| nuit, le mode choisi, à transmettre à carte.regleHeure (null pour auto))
- Critères d'acceptation :
  - Utilisable au clavier comme un groupe de boutons radio : flèches, Début, Fin, un seul arrêt de tabulation
  - Le mode choisi se lit sans la couleur, et aucune couleur d'état n'est utilisée
  - L'horaire dit le moment et le prochain passage ; pour un choix, il dit quand la carte reprend l'heure réelle
  - Lisible en clair et en sombre, ainsi que sur téléphone
  - Ligne au journal des versions

### Le projecteur de chantier (`floodlight`)

Un mât de chantier galvanisé, lesté, avec un ou deux projecteurs LED. Aucune vraie lumière (bible : ni lumière dans le modèle ; et pour la fluidité) : le composant fait briller la tête, dans la couleur des projecteurs de src/lumiere.json, et pose une tache de lumière douce au sol. L'assemblage le pose aux coins du chantier ; allumé la nuit en régime ouvert, éteint sinon, la pause comprise (le chantier est fermé). Fiche validée par Pierre-Alain le 21 octobre 2026. Version 1.0.0 (plan D-2) validée sur planche le 22 octobre 2026 : tout le métal en acier galvanisé (budget de trois matériaux), quatre projecteurs aux coins du chantier, allumage dès le coucher du soleil, extinction directe, tache au sol d'opacité 0,22.

- Fichier : `components/site/floodlight/index.js`
- Fabriqué par : modeleur
- Production : Modèle GLB produit par un script Blender du dépôt ; le composant le pilote (états, animations, ancres)
- Modèles : `ENV_FLOODLIGHT_A_v001.glb`
- Paramètres : `heads` (1 | 2, défaut 2) ; `height` (nombre, 4 à 8, défaut 6)
- États : `off`, `on`
- Ancres : `label`
- Données reçues par setState : aucune
- Budget : 1500 triangles, 3 matériaux
- Critères d'acceptation :
  - Reconnaissable comme projecteur de chantier à 25 px par mètre
  - Lumière blanche, jamais une couleur d'état ; rien ne clignote
  - Allumage en fondu de 0,5 seconde, une fois ; direct si reducedMotion
  - La tache au sol laisse lire les objets dessous
  - En qualité low, 600 triangles au plus et pas de tache au sol

### Le personnage maître et son équipe (`character-kit`)

CHR_BASE_MASTER (1,70 m, 5 têtes, décision du 19 octobre 2026), son armature RIG_CHR_BASE, les douze animations communes, les tenues par métier (client, architect, engineer, foreman, mason, electrician, plumber, painter, inspector, concierge, representative ; gilet orange pour l'équipe site), le casque de la couleur d'équipe (blanc pour l'équipe client ; le client n'en porte pas) et les accessoires (tablette, rouleau de plans, trépied de géomètre, talkie-walkie, rouleau à peinture, truelle, câble, planchette, tampon, trousseau de clés, classeur). Qui porte quoi : docs/correspondances.md. Bible, section 5. Version v003 (plan D-3) : ce que la ville vivante ajoute au kit : la tenue d'ouvrier CHR_OUTFIT_WORKER (bleu de travail graphite, casque gris chaud #8C807A (le #8E959C de la fiche était à ΔE 1,7 du gris de l'état « Inconnu » ; choix de Pierre-Alain du 23 octobre 2026), gilet jaune fluo #D7EC23 à bandes claires, docs/vie-du-chantier.md, section 3) ; la tenue de ville CHR_OUTFIT_CIVILIAN, sans casque, en trois coloris vifs, jamais graphite, jamais une couleur d'équipe ni d'état, pour que le client reste le seul en civil graphite (badauds et usagers des bâtiments habités) ; la lampe frontale PRP_CHR_HEADLAMP, fixée au casque, dont la lentille peut briller ; l'animation ANM_CHR_CARRY (porter). Les tissus des trois coloris de ville (MAT_FABRIC_CIVIL_*) et la tenue d'ouvrier sont ajoutés à src/palette.json (validés par Pierre-Alain le 23 octobre 2026) ; tous les modèles ont été reconstruits. Fiche validée par Pierre-Alain le 21 octobre 2026. Choix de Pierre-Alain du 23 octobre 2026 : la lampe allumée est un septième matériau, admis la nuit seulement ; le sac de ciment de carry, dans le gris du casque d'ouvrier ; la tenue de ville en sweat et pantalon beige (MAT_WOOD) ; les coloris de ville rose framboise, turquoise clair et lilas (MAT_FABRIC_CIVIL_A, B, C) ; headlamp aussi dans data, pour que l'assemblage l'allume et l'éteigne sans recréer le personnage. Planche validée par Pierre-Alain le 23 octobre 2026.

- Dossier : `components/kit/character-kit/`, script `blender/assets/character-kit.py`
- Fabriqué par : animateur
- Production : Modèle GLB produit par un script Blender du dépôt ; le composant le pilote (états, animations, ancres)
- Modèles : `CHR_BASE_MASTER_v003.glb`, `CHR_HAIR_KIT_v003.glb`, `PRP_CHR_TOOLS_v003.glb`, `CHR_OUTFIT_CLIENT_v003.glb`, `CHR_OUTFIT_ARCHITECT_v003.glb`, `CHR_OUTFIT_ENGINEER_v003.glb`, `CHR_OUTFIT_FOREMAN_v003.glb`, `CHR_OUTFIT_MASON_v003.glb`, `CHR_OUTFIT_ELECTRICIAN_v003.glb`, `CHR_OUTFIT_PLUMBER_v003.glb`, `CHR_OUTFIT_PAINTER_v003.glb`, `CHR_OUTFIT_INSPECTOR_v003.glb`, `CHR_OUTFIT_CONCIERGE_v003.glb`, `CHR_OUTFIT_REPRESENTATIVE_v003.glb`, `CHR_OUTFIT_WORKER_v003.glb`, `CHR_OUTFIT_CIVILIAN_v003.glb`
- Animations : `ANM_CHR_IDLE`, `ANM_CHR_WALK`, `ANM_CHR_WORK`, `ANM_CHR_TYPING`, `ANM_CHR_INSPECT`, `ANM_CHR_READ`, `ANM_CHR_THINKING`, `ANM_CHR_WAITING`, `ANM_CHR_TALK`, `ANM_CHR_CELEBRATE`, `ANM_CHR_BLOCKED`, `ANM_CHR_CARRY`
- Budget : 8000 triangles, 6 matériaux
- Critères d'acceptation :
  - Planche comparative des morphologies validée avant les variantes
  - Un seul squelette pour tous
  - Le portrait (G7) et le corps se correspondent
  - Planche : un agent de l'équipe site, un ouvrier, la barrière de blocage et la grue côte à côte ; l'ouvrier se distingue de l'agent d'un coup d'œil
  - Planche : le client, trois badauds, un usager et Fanny côte à côte ; le client reste le seul en civil graphite
  - La lampe frontale se lit à 25 px par mètre sans changer la silhouette du casque ; la couleur d'équipe du casque reste lisible
  - Chaque personne tient toujours dans 8 000 triangles et 6 matériaux (7 la nuit, lampe allumée)
  - Tous les modèles reconstruits après l'ajout à la palette ; ligne au journal des versions

### Le personnage (un agent) (`character`)

Un personnage par agent, à partir du personnage maître : tenue et outil de son métier, couleur de son équipe. GDC le déplace ; le composant joue l'animation de l'état, sur place. L'apparence de chaque personne (morphologie, peau, coiffure, barbe, lunettes, outil) est dans components/kit/character-kit/equipe.json ; GDC la passe en paramètres (décision de PA du 19 octobre 2026 : chaque personne a son personnage). blocked : posture d'arrêt devant la barrière ; unknown : immobile, matériaux grisés, lisible sans animation. Version 1.1.1 (plan D-1, 22 octobre 2026) : les matériaux de la palette viennent du registre commun de l'hôte (ctx.materiau), partagés par toute l'équipe : une même peau, une même chevelure, une même tenue n'ont qu'un matériau sur la carte ; sans registre, chaque personnage fabrique les siens, comme en 1.1.0. Rien ne change à l'écran. Version 1.2.0 (plan D-3) : deux métiers de plus, qui ne sont pas des agents : worker (l'ouvrier, de l'équipe qui accompagne un agent : casque gris, gilet jaune) et civilian (badaud ou usager d'un bâtiment habité, sans casque, en tenue de ville). Un ouvrier ne joue jamais celebrate, blocked ni unknown ; un civil non plus. Le paramètre headlamp allume la lampe frontale : la lentille brille avec une petite lueur, sans vraie lumière ; l'assemblage l'allume la nuit pour toute personne casquée qui est dehors. Un état de plus, carry (porter), joué par les ouvriers seulement ; GDC ne l'envoie jamais. Fiche validée par Pierre-Alain le 21 octobre 2026. Choix de Pierre-Alain du 23 octobre 2026 : la lampe allumée est un septième matériau, admis la nuit seulement ; le sac de ciment de carry, dans le gris du casque d'ouvrier ; la tenue de ville en sweat et pantalon beige (MAT_WOOD) ; les coloris de ville rose framboise, turquoise clair et lilas (MAT_FABRIC_CIVIL_A, B, C) ; headlamp aussi dans data, pour que l'assemblage l'allume et l'éteigne sans recréer le personnage. Un squelette par personnage (plan D-1c, correction 4) : le corps, la tenue et la coiffure partagent un même THREE.Skeleton. Planche validée par Pierre-Alain le 23 octobre 2026.

- Fichier : `components/character/character/index.js`
- Fabriqué par : animateur
- Production : Modèle GLB produit par un script Blender du dépôt ; le composant le pilote (états, animations, ancres) ; kit `character-kit`
- Modèles : `kit:character-kit/CHR_BASE_MASTER_v003.glb`, `kit:character-kit/CHR_HAIR_KIT_v003.glb`, `kit:character-kit/PRP_CHR_TOOLS_v003.glb`, `kit:character-kit/CHR_OUTFIT_CLIENT_v003.glb`, `kit:character-kit/CHR_OUTFIT_ARCHITECT_v003.glb`, `kit:character-kit/CHR_OUTFIT_ENGINEER_v003.glb`, `kit:character-kit/CHR_OUTFIT_FOREMAN_v003.glb`, `kit:character-kit/CHR_OUTFIT_MASON_v003.glb`, `kit:character-kit/CHR_OUTFIT_ELECTRICIAN_v003.glb`, `kit:character-kit/CHR_OUTFIT_PLUMBER_v003.glb`, `kit:character-kit/CHR_OUTFIT_PAINTER_v003.glb`, `kit:character-kit/CHR_OUTFIT_INSPECTOR_v003.glb`, `kit:character-kit/CHR_OUTFIT_CONCIERGE_v003.glb`, `kit:character-kit/CHR_OUTFIT_REPRESENTATIVE_v003.glb`, `kit:character-kit/CHR_OUTFIT_WORKER_v003.glb`, `kit:character-kit/CHR_OUTFIT_CIVILIAN_v003.glb`
- Animations : `ANM_CHR_IDLE`, `ANM_CHR_WALK`, `ANM_CHR_WORK`, `ANM_CHR_TYPING`, `ANM_CHR_INSPECT`, `ANM_CHR_READ`, `ANM_CHR_THINKING`, `ANM_CHR_WAITING`, `ANM_CHR_TALK`, `ANM_CHR_CELEBRATE`, `ANM_CHR_BLOCKED`, `ANM_CHR_CARRY`
- Paramètres : `trade` (client | architect | engineer | foreman | mason | electrician | plumber | painter | inspector | concierge | representative | worker | civilian) ; `team` (none | client | architecture | studies | site | reception | operations) ; `body` (M | F) ; `skin` (A | B | C | D | E) ; `hair` (short | side | crop | bob | long | ponytail | bun) ; `hairColor` (black | brown | blond | red | grey) ; `beard` (true | false) ; `glasses` (true | false) ; `tool` (auto (l'outil du métier) | none | plans | tablet | tripod | radio | roller | trowel | cable | clipboard | stamp | keys | binder | wrench) ; `headlamp` (true | false, défaut false : la lampe allumée au départ (sans casque : rien)) ; `outfitColor` (a | b | c, défaut a (tenue de ville seulement))
- États : `idle`, `walk`, `work`, `typing`, `inspect`, `read`, `thinking`, `waiting`, `talk`, `celebrate`, `blocked`, `unknown`, `carry`
- Ancres : `label`, `badge`
- Données reçues par setState : `facing` (angle en radians, sens du regard ou de la marche) ; `headlamp` (true \| false : allume ou éteint la lampe frontale (sans casque : rien))
- Budget : 8000 triangles, 6 matériaux
- Critères d'acceptation :
  - Le métier se lit à la tenue et à l'outil
  - L'équipe se lit à la couleur de la tenue
  - unknown : gris, immobile, lisible
  - reducedMotion : posture fixe et lisible pour chaque état
  - Animations sur place, sans déplacement non maîtrisé
  - worker et civilian se lisent à la tenue, sans badge ni nom
  - headlamp : la lentille brille sans vraie lumière ; le client n'a pas de casque, donc pas de lampe
  - Ligne au journal des versions

### La clôture de chantier (`site-fence`)

Une clôture mobile : panneaux en treillis gris (maille de 0,45 m) sur plots en béton, un poteau rond à chaque jonction, sans orange, pour ne jamais ressembler à la barrière de blocage (bible, 18.8). Posée en ligne droite le long d'une longueur donnée, en panneaux de largeur égale (3,50 m au plus) ; avec gate, un portail ouvert de 4 m au milieu, ses deux vantaux tournés vers l'intérieur (décisions de Pierre-Alain du 20 octobre 2026). Version 1.0.1 (plan D-1, 22 octobre 2026) : chaque pièce répétée (plot, poteau, cadre, remplissage, poteau et vantaux du portail) est posée en une seule InstancedMesh par maillage, avec la géométrie et le matériau du modèle, au lieu d'une copie par panneau. Rien ne change à l'écran. Version 1.1.0 (lot G8, docs/vie-du-chantier.md, section 7) : le portail fermé. default reste le portail ouvert de la 1.0, pour que GDC ne casse pas ; closed ferme les deux vantaux dans l'axe de la clôture par une rotation douce d'environ 1,5 seconde, une fois (et retour vers default), l'état final directement si reducedMotion ; seules les matrices des deux vantaux bougent, sans pièce ni appel de dessin de plus. L'assemblage le ferme en régime fermé et pause, l'ouvre en régime ouvert. Fiche validée par Pierre-Alain le 21 octobre 2026. Planche validée par Pierre-Alain le 23 octobre 2026.

- Fichier : `components/site/site-fence/index.js`
- Fabriqué par : modeleur
- Production : Modèle GLB produit par un script Blender du dépôt ; le composant le pilote (états, animations, ancres) ; modèle `ENV_SITE_FENCE_A_v001`
- Modèles : `ENV_SITE_FENCE_A_v001.glb`
- Paramètres : `length` (nombre, 2 à 60, défaut 12) ; `gate` (booléen, défaut false)
- États : `default`, `closed`
- Ancres : `label`
- Données reçues par setState : aucune
- Budget : 4000 triangles, 3 matériaux
- Critères d'acceptation :
  - Reconnaissable comme clôture de chantier mobile, sans orange
  - Impossible à confondre avec la barrière de blocage sur une planche côte à côte
  - Les panneaux et les plots se répètent par instance
  - Le passage de default à closed, et retour, est une rotation douce d'environ 1,5 seconde, une fois ; l'état final directement si reducedMotion
  - Sans gate, closed ne change rien
  - Ligne au journal des versions

### Le cabanon de la fête (`party-shed`)

Un petit cabanon en bois, avec un auvent et une table haute. Sous l'auvent, une lanterne à facettes tourne lentement (un tour en 8 secondes environ) et projette trois taches de couleur qui glissent au sol et sur le mur : elles ne s'allument et ne s'éteignent jamais, donc aucun flash (WCAG 2.3.1). Des notes de musique, des formes en 3D et non une police, montent doucement depuis la porte et s'effacent, trois au plus à la fois. Les trois teintes de fête sont des lumières (bloc fete de src/lumiere.json), choisies loin des six couleurs d'état et des couleurs d'équipe (ΔE 2000 d'au moins 20, mesuré) et proposées sur planche à Pierre-Alain. L'assemblage le pose près de la baraque, hors de la clôture (à confirmer sur la scène de référence) ; en régime pause, les ouvriers s'y rassemblent (talk, idle, jamais celebrate, qui reste aux agents) ; les agents restent où GDC les place. Fiche validée par Pierre-Alain le 21 octobre 2026. Choix de Pierre-Alain du 23 octobre 2026 : les trois teintes magenta #FF3DCB, cyan ciel #2EDCFF et vert lime #9CFF4A (ΔE 2000 de 24,7 au moins) ; une note s'efface en rapetissant ; le cabanon est posé près de la zone des transformations (au fond à droite, l'avant vers la voie), l'équipe y sort par le portail, qui se ferme une fois qu'elle est passée. Planche de la deuxième passe validée par Pierre-Alain le 23 octobre 2026.

- Fichier : `components/site/party-shed/index.js`
- Fabriqué par : modeleur
- Production : Pièces d'un kit Blender assemblées par le code selon les données (avancement, nombre de pièces) ; modèle `ENV_PARTY_SHED_A_v001`
- Modèles : `ENV_PARTY_SHED_A_v001.glb`
- États : `closed`, `party`
- Ancres : `label`, `door`, `gather`
- Données reçues par setState : aucune
- Budget : 3000 triangles, 5 matériaux
- Critères d'acceptation :
  - On reconnaît la fête de loin : le cabanon, la lanterne, les notes
  - closed : porte fermée, lanterne éteinte, rien ne bouge ; party : la porte s'ouvre une fois, puis la fête
  - Aucune variation de lumière en flash : les taches glissent, elles ne s'allument ni ne s'éteignent
  - reducedMotion : lanterne fixe, taches posées, deux ou trois notes immobiles au-dessus de la porte
  - Aucune couleur d'état dans la scène

### La voiture d'ambiance (`city-car`)

Une petite citadine arrondie (chanfrein C4), en trois teintes de ville. Deux ou trois voitures roulent sur la route autour de la carte, se garent et repartent ; la vie d'ambiance de l'assemblage les déplace, toujours hors des zones et du chantier. C'est le véhicule d'ambiance de la vie du chantier (docs/vie-du-chantier.md, section 6) : Pierre-Alain a choisi les voitures, il n'y a ni camion-benne ni fourgonnette dans le chantier. Fiche validée par Pierre-Alain le 21 octobre 2026. Version de la grande ville (lot G9, city-traffic), décision de Pierre-Alain du 23 octobre 2026 : une flotte instanciée (une InstancedMesh par matériau et une pour les roues, 5 appels de dessin pour toutes les voitures), six voitures en route au plus en haute, deux en basse ; la nuit, deux petites lueurs blanc chaud à l'avant, sans vraie lumière (city-night). Elles roulent à droite, dans la ville et sur la rue de ceinture (city-plan). Interface de la flotte, décision de Pierre-Alain du 24 octobre 2026 (proposition du modeleur, précisée par la session du lot G9) : un seul composant city-car est toute la flotte. params : count (1 à 6) et color (la teinte de la première voiture quand data.cars manque) ; data.cars = [{ x, z, heading, color, moving }], posé par l'assemblage (city-traffic) ; une voiture absente de la liste est cachée ; data.lights allume les deux lueurs de chaque voiture. En qualité basse, le composant plafonne lui-même la flotte à 2 voitures. driving : les roues des voitures moving tournent, update(dt) rend true ; parked ou reducedMotion : tout est immobile, update rend false (les images d'ambiance, sans ombre refaite, seront l'affaire de city-traffic). Aucune ombre portée réelle : un disque de contact par voiture, dans la flotte, sans texture ni couleur en dur (src/lumiere.json). Brief validé par Pierre-Alain le 24 octobre 2026 : une citadine de 3,60 × 1,70 × 1,50 m, environ 900 triangles par voiture ; les trois teintes a, b, c sont celles des tenues de ville de la palette (civil_a rose framboise, civil_b turquoise clair, civil_c lilas), en peinture satinée par couleur d'instance ; 5 matériaux, un appel de dessin chacun : la peinture, le verre, le graphite, les pneus, le disque de contact avec les lueurs.

- Fichier : `components/machine/city-car/index.js`
- Fabriqué par : modeleur
- Production : Modèle GLB produit par un script Blender du dépôt ; le composant le pilote (états, animations, ancres) ; modèle `VEH_CITY_CAR_A_v001`
- Modèles : `VEH_CITY_CAR_A_v001.glb`
- Paramètres : `count` (nombre, 1 à 6, défaut 1) ; `color` (a | b | c, défaut a)
- États : `parked`, `driving`
- Ancres : aucune
- Données reçues par setState : `cars` (liste de { x, z, heading, color: a \| b \| c, moving }, dans le repère du composant ; heading en radians autour de Y (0 : vers +Z) ; défaut : count voitures garées en file) ; `lights` (booléen, défaut false : les deux lueurs blanc chaud à l'avant (la nuit))
- Budget : 7200 triangles, 5 matériaux
- Critères d'acceptation :
  - Jamais confondue avec un engin du chantier (ni orange, ni jaune) ni avec le camion de livraison
  - driving : les roues tournent, pilotées par update(dt)
  - Six en route au plus en haute, deux en basse (city-traffic) ; une flotte instanciée : 5 appels de dessin pour toutes
  - La nuit, deux lueurs blanc chaud à l'avant, sans vraie lumière ; rien ne clignote
  - reducedMotion : garées et immobiles, update(dt) rend false
  - Une voiture : 1 200 triangles au plus ; la flotte de six : 7 200 ; 5 appels de dessin dans la passe principale, aucun dans la passe d'ombre
  - Ni clic, ni badge, ni anneau de sélection

### La carte vivante (`city-map`)

Pas un composant : un module de la bibliothèque livrée à GDC (src/ville/), qui assemble les composants sans en modifier aucun. 1. L'implantation : quatre zones autour d'un carrefour, les lieux d'étape fixes, une parcelle par application (docs/ville.md ; la scène de référence lit la même implantation). 2. Les chemins : le long des voies de chantier, de porte à porte ; le client ne traverse jamais le chantier ; une marche dure selon la distance, plafonnée à quelques secondes. 3. La lecture des actions de GDC (apparait, deplace, change, disparait, quantite, ouverture, pause, fermeture, et les actions proposées à GDC quand elles arrivent), dans l'ordre de leur horodatage ; un élément inconnu du catalogue est ignoré et signalé. 4. La vie du chantier (docs/vie-du-chantier.md) : le régime, les ouvriers qui suivent leurs chefs phase par phase, les usagers autour des bâtiments habités, à partir d'une graine ; en pause, les ouvriers rejoignent le point de rassemblement près de la baraque (le cabanon party-shed, quand il sera fabriqué). 5. Les zones jamais activées en niveaux de gris, colorées pour toujours à la première activation, sur des copies des matériaux. 6. La vue en coupe (building-interior) au clic sur un bâtiment. Tant que character 1.2.0 n'existe pas, l'assemblage habille les ouvriers et les usagers en recolorant des copies de matériaux (remplaçant explicite, retiré avec la 1.2.0) ; le portail reste ouvert jusqu'à site-fence 1.1.0 ; aucune voiture avant city-car. Fiche validée par Pierre-Alain le 21 octobre 2026.

- Fabriqué par : intégrateur (assemblage) ; directeur artistique (relecture)
- Critères d'acceptation :
  - Livré dans la bibliothèque (npm run build), Three.js injecté comme pour les composants
  - Les chemins, la lecture des actions et la vie se contrôlent sans navigateur sur les séquences de fixtures/ (npm run check)
  - La galerie joue une séquence de fixtures/ de bout en bout, sans erreur de console : chantier fermé puis ouvert, ouvriers selon la phase, zones grises qui se colorent
  - Rien ne bouge sans projet ; même scène, mêmes ouvriers (graine)
  - Plafonds : 12 ouvriers sur la carte et 4 par bâtiment ; 4 et 1 en qualité basse ; postures fixes et aucun trajet avec reducedMotion
  - Fluidité mesurée à 12 ouvriers ; lisible en clair et en sombre
  - Aucune couleur d'état dans la scène ; ouvriers et usagers sans badge, sans nom, sans clic

### Le repère d'agent (`agent-marker`)

Un repère HTML posé au-dessus de la tête de l'agent, sur l'ancre label de character (2,05 m), qui le suit. Sur la carte entière d'un portable de 13 pouces, un agent ne mesure que 16 × 5 px (environ 8 px par mètre) : le repère garde une taille fixe en pixels, quel que soit le zoom, et passe devant les murs. Le repère complet porte le portrait du lot G7 (fixe, sans son geste), le prénom et le signe d'état (src/signes.js), avec une pointe vers la tête. Repère permanent pour les agents qui attendent ta décision (waiting) et pour les bloqués (blocked) ; les autres n'ont qu'un repère court au survol (portrait et prénom, sans signe). Les repères qui se touchent n'en font qu'un : trois portraits au plus, le signe le plus grave (ctx.plusGrave) et le nombre ; au clic, le groupe se déplie. Une impulsion douce à l'apparition, puis fixe ; rien ne bouge avec moins d'animations. Cliquer un repère vaut cliquer l'agent : GDC ouvre sa fiche (agent-popup). Côté carte (l'assemblage, GDC ou la galerie), sans que character change : la zone de prise d'un agent se calcule à l'écran, et non par une forme 3D invisible qui grandirait et rapetisserait avec le zoom ; le pointeur prend l'agent le plus proche à moins de 12 px (une cible de 24 px, WCAG 2.5.8), devant le bâtiment ou le décor qui est derrière lui ; au survol, l'anneau de sélection (selection-ring, état hover, à l'encre) se pose à ses pieds et le repère court s'ouvre. Écartés : le halo de la couleur du casque (une couleur qui dit un état dans la 3D, bible 17.3 ; le jaune du site se lit Bloqué, le bleu d'architecture se lit Actif ; un scintillement continu est interdit, signalétique, principe 5) et la silhouette à travers les murs (coûteuse, et couverte par le repère, qui reste visible au-dessus du mur). Ouvriers et usagers n'ont jamais de repère. Le repère ne recouvre pas les étiquettes de lieu ni les pastilles que GDC pose sur la carte (obstacles) : un repère ou un groupe qui en touche une monte juste au-dessus d'elle, et une tige fine relie sa pointe à la tête de l'agent ; s'il devait monter de plus de 80 px, il reste sur la tête, quitte à la recouvrir (plus haut, il se lirait rattaché à un autre lieu). Fiche validée par Pierre-Alain le 22 octobre 2026 ; entrée obstacles ajoutée sur sa décision du 23 octobre 2026.

- Fabriqué par : intégrateur d'interface (le repère) ; intégrateur (la prise, côté carte) ; directeur artistique (relecture)
- Élément : `<gdc-agent-marker>`
- Entrées (propriété data) : `agents` (liste de { id, name, state, x, y } : les agents de la carte, hors ouvriers et usagers ; id : l'identifiant de l'agent, celui des portraits (equipe.json), comme pour agent-popup ; state : mêmes valeurs que character ; x, y : la position à l'écran de leur ancre label, en pixels, que GDC recalcule quand la caméra ou l'agent bouge) ; `hovered` (identifiant de l'agent sous le pointeur (la prise côté carte), ou null) ; `obstacles` (liste de { x, y, width, height } : les rectangles à l'écran, en pixels dans la couche, que les repères ne doivent pas recouvrir (les étiquettes de lieu et les pastilles que GDC pose sur la carte) ; facultative)
- Sorties (événements) : `gdc-select` (detail.id = agent choisi)
- Critères d'acceptation :
  - Taille fixe en pixels, lisible sur la carte entière d'un portable de 13 pouces, en clair et en sombre
  - Trois indices pour l'état : couleur, forme et icône, dans le HTML seulement ; aucune couleur ajoutée à la scène
  - Repère permanent pour waiting et blocked seulement ; repère court au survol pour les autres ; jamais d'ouvrier ni d'usager
  - Les repères qui se touchent se regroupent : trois portraits au plus, le signe le plus grave et le nombre ; le groupe se déplie au clic
  - Une impulsion à l'apparition, puis fixe ; aucun mouvement avec moins d'animations, le portrait compris
  - Chaque repère se prend au clavier (Tab, Entrée) et émet gdc-select
  - Côté carte : un agent se prend à 12 px du pointeur, devant ce qui est derrière lui, sur la séquence fixtures/projet-type (étape 20 : trois agents groupés à la réception)
  - Aucun repère ni groupe ne recouvre un rectangle d'obstacles : il monte au-dessus, de 80 px au plus, entier dans la couche, et sa tige le relie à la tête ; au-delà de 80 px, il reste sur la tête ; sans obstacle, ni montée ni tige

### Le rail d'un panneau (`panel-rail`)

Le panneau de GDC ne dessine qu'avec les composants de l'atelier : le rail d'un panneau fermé et sa poignée en sont un (docs/planning-derniere-passe-de-gdc.md, sections 6 et 7 ; docs/planning-plan-atelier.md, section 2.1). Un rail autonome : GDC le pose au bord de la zone du panneau, la disposition reste à lui, et il masque lui-même le panneau fermé sans le retirer, pour que le panneau garde son état. Deux aspects. Fermé : une bande fine de 40 px (la cible tactile comprise), verticale à gauche et à droite, horizontale en bas, qui porte l'icône du panneau, son nom accessible et ses badges ; elle se clique en entier. Ouvert : une lisière fine au bord du panneau, avec sa poignée ; un panneau sans redimensionnement (l'arbre, le fil) a donc lui aussi un moyen visible de se replier ; avec resize, la lisière est aussi le séparateur qui redimensionne le planning. Les badges : <gdc-notification-badge>, posé par balise, avec { error, waiting, blocked } (le nombre et l'icône du niveau le plus grave, src/signes.js), masqué à zéro ; pas de done, « Validé » n'a rien à faire sur un rail. Les icônes tree, feed et schedule sont dessinées au trait dans le dossier du rail (un élément n'importe rien d'ailleurs). Le rail ne retient rien : l'état ouvert ou fermé et la taille sont des préférences de l'écran que le panneau de GDC garde ; le rail reçoit open et size, et émet gdc-toggle et gdc-resize. La poignée suit le modèle ARIA du bouton qui déplie : son nom est celui du panneau, avec ses badges quand il est fermé, et aria-expanded dit s'il est ouvert ; le verbe (« Ouvrir », « Replier ») est dans l'infobulle (Entrée et Espace) ; aria-controls n'est pas utilisé, il ne traverse pas la frontière du shadow DOM. Le séparateur suit le modèle ARIA du séparateur de fenêtre (role="separator", aria-valuenow, aria-valuemin, aria-valuemax) : flèches pour la taille, Début et Fin pour le minimum et le maximum, Entrée pour replier ou rouvrir, et le glissement à la souris ou au doigt. Sur téléphone (moins de 600 px), le rail devient un onglet (le nom et le badge, sans icône ni séparateur ; l'onglet ouvert souligné) : GDC pose les rails en rangée et n'ouvre qu'un panneau à la fois (il reçoit gdc-toggle et ferme les autres) ; le panneau ouvert prend l'écran, il ne se redimensionne pas. Dans une bande verticale fermée, le badge passe avant le nom et déborde vers la carte quand le nombre s'allonge. Une ouverture courte, aucune avec moins d'animation ; rien ne clignote. Fiche validée par Pierre-Alain le 22 octobre 2026 : un rail autonome plutôt qu'un cadre autour du panneau, et counts sans done ; au contrôle, le même jour : le nom du panneau avec aria-expanded pour la poignée, pas de séparateur sur téléphone, le badge qui déborde vers la carte. Livré le 22 octobre 2026, validé par Pierre-Alain.

- Fabriqué par : intégrateur d'interface
- Élément : `<gdc-panel-rail>`
- Entrées (propriété data) : `panel` ({ id, name, icon } : l'identifiant du panneau (repris dans les événements), son nom affiché et accessible, et son icône, tree \| feed \| schedule) ; `side` (left \| right \| bottom : le bord où GDC pose le panneau ; l'orientation s'en déduit (verticale à gauche et à droite, horizontale en bas)) ; `open` (true si le panneau est ouvert ; GDC garde l'état et le renvoie) ; `counts` ({ error, waiting, blocked } : nombres, passés à notification-badge ; absent ou tout à zéro, pas de badge) ; `resize` ({ size, min, max } en pixels : la taille du panneau ouvert et ses bornes ; absent, pas de séparateur (le planning seulement))
- Sorties (événements) : `gdc-toggle` (detail.id = le panneau, detail.open = l'état demandé ; GDC décide et renvoie open) ; `gdc-resize` (detail.id = le panneau, detail.size = la taille demandée en pixels, bornée par min et max)
- Critères d'acceptation :
  - Vertical à gauche et à droite, horizontal en bas ; ouvert et fermé, sur les trois côtés ; aucun côté supposé
  - Les badges suivent notification-badge et la signalétique (couleur, forme et icône du niveau le plus grave), masqués à zéro
  - Ouvert, une poignée visible permet de replier chaque panneau, redimensionnable ou non
  - Utilisable au clavier et à la souris : la poignée (Entrée, Espace) et le séparateur (flèches, Début, Fin, Entrée) ; le séparateur se tire aussi au doigt, partout où il existe (tablette, bureau)
  - Sur téléphone, le rail fermé est un onglet de la rangée posée par GDC
  - Aucune mémoire : ni stockage, ni préférence retenue ; gdc-resize au plus une fois par image pendant un glissement
  - Rien ne bouge avec moins d'animation
  - Lisible en clair et en sombre
  - La page /interface.html montre les trois côtés, ouverts et fermés, avec et sans badges, et le séparateur
  - Ligne au journal des versions

### Le planning du chantier (`site-schedule`)

Le planning lit la sortie de gdc chronologie (schéma 1, docs/planning-derniere-passe-de-gdc.md, sections 1, 4 et 5) et n'affiche que ce que GDC envoie ; il ne devine jamais un champ. Les lignes : les dix étapes, toujours là (faite, en_cours, a_venir ; une étape à venir n'a pas de barre), puis l'application, la fiche et le lot, ainsi que les défauts, les demandes et les pièces du dossier. Les lignes d'application sont masquées quand il n'y a qu'une application (règle d'affichage du planning). Une fiche a une ligne par étape traversée : plot à l'étape 4, excavation et foundations à la 5, structure, envelope et finishing à la 6, inspection à la 7, le seul jalon de la remise des clés à la 8, et à la 10 la fiche qui surélève un bâtiment habité. Un lot est prévu à l'étape 5 (un repère, pas de barre) et a sa barre à l'étape 6. Les pièces du dossier (étapes 1 à 3) n'ont pas de barre : leur état et leur repère d'après git. Le temps : un jour actif est une colonne de largeur fixe ; un jour vide, une colonne étroite ; une suite de jours vides, un seul pli qui se déplie au clic, jamais le mot « abandonné » pour un silence. Le futur suit l'ordre de a_venir, sans date : chaque élément à venir prend la largeur de deux jours actifs. Les jours se coupent dans le fuseau de GDC. La bande du régime (ouvert, pause, fermé) court sous l'en-tête des jours. Au démarrage, seules les étapes en cours sont dépliées et le planning se centre sur l'étape en cours ; GDC l'ouvre à hauteur réduite (l'en-tête des jours et trois lignes), les lignes ayant une hauteur fixe que la page de démonstration donne en pixels. L'escalier d'une fiche : aucune liaison permanente ; au survol ou à la sélection, toutes ses barres s'éclairent et un trait fin relie la fin d'une barre au début de la suivante. La couleur, deux cas seulement : le signe d'état de l'élément en cours (Actif pour une étape, une fiche ou un lot en_cours ; En erreur pour un défaut ouvert, décision de Pierre-Alain du 22 octobre 2026) et le signe « Attend ta décision » sur un jalon attendu ; une décision prise est un jalon neutre ; tout le reste en tons neutres. Les formes du jalon : attendu, le signe « Attend ta décision » ; accordé, un losange plein à l'encre ; refusé, un losange creux barré d'une croix, son motif au survol et au choix ; périmé, le losange estompé et barré en diagonale (comme permit-board), avec un repère pointillé à la date d'après git du changement de pièce. Les fins de barre : normale, un bout droit ; abandon, un bout coupé en biais ; archivée, un bout qui s'estompe, « fin inconnue » ; en cours (fin_type null), la barre ouverte jusqu'à maintenant. Une date d'après git (source git) n'a jamais la forme d'une date exacte du journal : un repère pointillé, marqué « d'après git » au survol et dans la vue tableau. Un événement trait: true fait une coche fine sur sa barre ; quand un jour devient trop étroit pour les séparer, les coches se regroupent par jour avec leur nombre. Choisir une barre passée ne change que la sélection : la lumière et la carte suivent l'heure réelle ou time-of-day, jamais le planning, tant que le rejeu n'existe pas (seconde version). Pour tout schema autre que 1, le planning passe en « données illisibles » sans rien dessiner ; un champ inconnu du schéma 1 est ignoré (derniers mots de GDC, 22 octobre 2026). Ce qui ne se choisit pas : une pièce du dossier (ni référence ni événement), lue au survol et dans la vue tableau. Un jalon du projet encore attendu dont la demande n'a qu'une date d'après git (ni ref ni evt) émet la forme d'étape de sa ligne : le panneau de décision est dans la zone de cette étape (décisions de Pierre-Alain du 22 octobre 2026). Les états listés sont ceux que la page /interface.html et la galerie montrent : les treize de la dernière passe de GDC et les sept ajoutés par l'atelier (docs/planning-plan-atelier.md, section 2.2). Construit et contrôlé sur les quatre séquences de GDC 0.20 (fixtures/, lues par index.json : fichier, chronologie, depuis), jamais sur l'exemple de la section 4 : volume (quatre pas de 25, 50, 75 et 100 fiches, le même jour) pour le budget, projet-long (horloge décalée) pour l'allure et les plis, jamais pour juger une durée. Fabrication à la livraison de GDC 0.20 (I-7). Fiche validée par Pierre-Alain le 22 octobre 2026. Fabriqué le 22 octobre 2026, à valider sur planche, avec quatre règles d'affichage décidées par l'atelier (docs/planning-retour-atelier-I6-I7.md, section 4) : dans un jour actif, les heures se lisent de la première à la dernière activité du jour ; un trait sans barre de sa référence va sur la ligne de cette référence dont la dernière activité le précède ; un groupe de traits ne se choisit pas (il dit son nombre et ses phrases au survol ; le fil donne chaque action) ; une ligne repliée porte les jalons attendus de ses descendants. Une liste virtuelle : seules les lignes en vue sont dans la page.

- Fabriqué par : intégrateur d'interface
- Élément : `<gdc-site-schedule>`
- États : `loading`, `not-opened`, `normal`, `waiting-decision`, `folded-days`, `unfolded-fold`, `hovered-row`, `selected-row`, `selected-trait`, `table-view`, `phone-list`, `reduced-motion`, `unreadable`, `single-application`, `selected-step`, `selected-milestone`, `grouped-traits`, `paused`, `update-received`, `full-replaced`
- Entrées (propriété data) : `timeline` (data = { timeline } : la sortie de gdc chronologie (schéma 1), ou sa mise à jour gdc chronologie --depuis (depuis, lignes, retirees, jalons, jours, evenements, regime, a_venir) ; le premier data est l'état de départ ; une mise à jour s'applique sur ce qui est déjà là, une chronologie complète (complet: true) le remplace ; dans les deux cas le planning garde ce qui est déplié, le défilement et la sélection) ; `selected` (propriété à part, comme highlight : le dernier gdc-select relayé par GDC, d'où qu'il vienne ({ id, ref?, evt?, etape? }), ou null : une ref ouvre les lignes qui la portent et défile jusqu'à elles ; etape ouvre l'étape ; evt marque son trait) ; `highlight` (référence survolée ailleurs ({ application, fiche?, lot? } ou null))
- Sorties (événements) : `gdc-select` ({ id, ref } pour une ligne d'application, de fiche, de lot ou de défaut, et un jalon de fiche ; { id: "etape:<n>", etape } pour une ligne d'étape ; { id, ref, evt } pour un trait ; { id, evt } pour un trait ou un jalon sans ref (une demande, une décision du projet) ; evt est la chaîne complète evt:<journal>/<id>) ; `gdc-hover` (detail.ref = la référence de la ligne, de la barre ou du trait survolé, ou null)
- Critères d'acceptation :
  - Montre tous ses états sur /interface.html et dans la galerie : chargement, projet non ouvert, normal, décision attendue, jours repliés, pli déplié, ligne survolée, ligne choisie, trait choisi, vue tableau, liste sur téléphone, moins d'animation, données illisibles ; une seule application, une étape choisie, un jalon choisi (son motif s'il est refusé, sa date d'après git s'il est périmé), des traits regroupés par jour, une pause en cours, une mise à jour reçue, une chronologie complète reçue à la place
  - Les quatre formes du jalon (attendu, accordé, refusé, périmé), les trois fins de barre (normale, abandon, archivée) et le repère pointillé d'une date d'après git se distinguent sans la couleur
  - Deux cas de couleur seulement : le signe de l'élément en cours et « Attend ta décision » sur un jalon attendu
  - Une mise à jour (--depuis) garde ce qui est déplié, le défilement et la sélection ; une chronologie complète (complet: true) remplace tout sans perdre la place du lecteur
  - Tout schema autre que 1 donne « données illisibles » ; un champ inconnu du schéma 1 est ignoré
  - Utilisable au clavier selon le modèle de grille arborescente ARIA : un seul arrêt de tabulation, haut et bas entre les lignes, droite pour déplier puis entrer dans la ligne (barres, jalons, traits), gauche pour revenir ou plier, Début, Fin, Entrée, Échap ; un pli se déplie au clavier
  - La vue tableau donne la même chronologie en texte, une ligne par barre et par jalon, avec les dates et leur source
  - Sur téléphone, le planning devient la liste par fiche
  - Émet gdc-hover et lit highlight (le survol partagé, ctx.hoverLink)
  - Tout texte venu de GDC est affiché comme du texte, jamais comme du HTML
  - Rien ne clignote ; avec moins d'animation, aucun glissement
  - Budget : premier affichage en moins de 200 ms et défilement fluide sur la séquence volume (100 fiches), sur le portable de référence, mesurés et joints au constat
  - Lisible en clair et en sombre
  - Ligne au journal des versions

## G9 : La ville autour

Entourer le chantier d'une ville fictive de Suisse romande, belle et un peu vivante : un grand terrain sur un seul socle, des rues et des giratoires, des villas, des immeubles, des arbres et des parcs, des voitures et des passants rares, la nuit des fenêtres et des lampadaires. Une ambiance qui n'ajoute jamais un fait du harnais : GDC ne l'envoie pas, et rien n'y bouge pour dire quelque chose (décisions de Pierre-Alain des 22 et 23 octobre 2026).

| Ordre | Identifiant | Nom | Nature | But | Statut |
|---|---|---|---|---|---|
| 1 | `city-plan` | Le plan de la ville | Document de référence, pas de code | Poser une ville fictive de Suisse romande autour des quatre zones : belle et un peu vivante, sans jamais ajouter un fait du harnais. | à faire |
| 2 | `city-ground` | Le grand terrain | Composant 3D Three.js, conforme à docs/contrat-composant.md | Le sol de toute la ville : une seule maquette, dans laquelle le chantier s'encastre. | livré |
| 3 | `road-kit` | Le kit des rues | Bibliothèque de modèles 3D produite par un script Blender (blender/assets/<id>.py) et réutilisée par plusieurs composants : components/kit/<id>/ | Les rues de la ville, aux cotes de sa grille : chaussées, carrefours, giratoires, trottoirs, passages piétons et lampadaires. | livré |
| 4 | `nature-kit` | Le kit de la nature | Bibliothèque de modèles 3D produite par un script Blender (blender/assets/<id>.py) et réutilisée par plusieurs composants : components/kit/<id>/ | Les arbres, les haies et les parcs qui rendent la ville belle et verte. | à faire |
| 5 | `villa-kit` | Le kit des villas romandes | Bibliothèque de modèles 3D produite par un script Blender (blender/assets/<id>.py) et réutilisée par plusieurs composants : components/kit/<id>/ | Les maisons d'une banlieue de Suisse romande : crépi clair, toit à pans, volets, haie de thuyas, reconnaissables d'un coup d'œil. | à faire |
| 6 | `apartment-kit` | Le kit des immeubles locatifs | Bibliothèque de modèles 3D produite par un script Blender (blender/assets/<id>.py) et réutilisée par plusieurs composants : components/kit/<id>/ | Les immeubles locatifs romands, au fond de la vue : la ligne d'horizon de la ville. | à faire |
| 7 | `city-night` | La nuit de la ville | Document de référence, pas de code | La nuit, la ville est habitée : des fenêtres allumées, des rues éclairées, sans jamais dire où l'on travaille. | à faire |
| 8 | `city-traffic` | La circulation de la ville | Document de référence, pas de code | Faire vivre un peu la ville : des voitures et des passants, au hasard et rarement, qui ne disent jamais rien. | à faire |

### Le plan de la ville (`city-plan`)

Pas un composant : une partie de l'assemblage de la carte (src/ville/), qui pose la ville avec les kits du lot G9 sans en modifier aucun. 1. La grille : un pas de 50 m (un pâté de 40 × 40 m, une rue de 6 m et deux trottoirs de 2 m) ; deux rangées complètes de pâtés autour d'une place de 125 × 70 m réservée au chantier, taillée pour le cas maximal de huit applications sur deux rangées de parcelles (docs/ville.md) ; la ville fait environ 325 × 270 m, une trentaine de pâtés, et ne bouge jamais quand une application s'ajoute (la bande libre est un pré, city-ground). 2. Le raccord : une rue de ceinture fait le tour de la place du chantier ; les deux routes du carrefour du harnais en partent et se prolongent dans la ville comme ses deux avenues principales. La circulation de la ville reste dans la ville et sur la rue de ceinture : les routes entre les zones restent au harnais (camion de livraison, agents). 3. Les hauteurs : la caméra iso regarde depuis le coin +X +Z ; les immeubles vont dans les pâtés du fond de la vue (−X, −Z), et côté caméra il n'y a que des villas, des parcs et des arbres, jamais plus de 8 m, pour ne rien cacher des zones. 4. Les pâtés : environ 14 de villas, 10 d'immeubles, 4 parcs et une place bétonnée avec sa fontaine, répartis par une graine : même graine, même ville. 5. La fabrication : la ville est fixe, donc fusionnée par matériau à la construction (comme floodlight fusionne ses géométries) ; seules les vitres (city-night) et les voitures (city-traffic) restent instanciées. 6. Le zoom : le cadrage par défaut reste celui d'aujourd'hui, sur les quatre zones ; on dézoome jusqu'à la ville entière ; sous 4 px par mètre, les passants ne sont plus dessinés et les kits de la ville passent à leurs pièces basses (une bascule globale, selon le zoom de la caméra orthographique). 7. L'hôte (contrat à écrire pour GDC, docs/contrat-composant.md) : le cadre de l'ombre est calé sur l'empreinte au sol de la vue (environ ±75 m au cadrage par défaut, ±240 m au dézoom, carte de 2 048 px, calage sur la grille des texels) ; la caméra est reculée d'au moins 400 m, plan lointain à 1 000 m, pour que le coin avant de la ville ne soit pas rogné. 8. L'ambiance : ni couleur d'état, ni texte, ni clignotement ; ni clic, ni badge, ni anneau de sélection, ni repère HTML ; cible() rend null pour toute la ville. Avis du modeleur du 22 octobre 2026 (mesures sur une ville de substitution) : fusion par matériau 14 appels et 9 d'ombre, contre 61 et 56 en instances. Fiche validée par Pierre-Alain le 23 octobre 2026 : ville moyenne, caméra par défaut sur les zones, rue de ceinture.

- Fabriqué par : directeur artistique (les règles) ; intégrateur (l'assemblage)
- Budget : 250000 triangles, 12 matériaux
- Critères d'acceptation :
  - Même graine, même ville ; la ville ne bouge pas quand une application s'ajoute, de une à huit
  - Côté caméra, rien au-dessus de 8 m : aucune zone n'est cachée au cadrage par défaut
  - Aucune voiture ni aucun passant de la ville dans les zones, dans le chantier ni sur les routes du carrefour
  - Qualité haute : 20 appels de dessin dans la passe principale et 12 dans la passe d'ombre au plus ; 250 000 triangles au dézoom complet (100 000 avec les pièces basses au loin)
  - Qualité basse : 15 appels et aucune ombre portée par la ville ; 80 000 triangles au dézoom complet
  - Au cadrage par défaut, la ville ajoute 20 appels au plus, et la carte reste sous 400 000 triangles par passe ; mesuré comme le constat D-1c (après la mise en route)
  - Le coin avant de la ville n'est pas rogné au dézoom ; l'ombre reste nette à l'écran à tous les zooms
  - Ni couleur d'état, ni texte, ni clignotement ; rien dans la ville ne se désigne au clic
  - La ville se lit en clair, en sombre et en niveaux de gris

### Le grand terrain (`city-ground`)

Un plateau maquette de 3 m en MAT_EARTH, arêtes du dessus en C3 (bible, 18.5, amendement du 23 octobre 2026 : le socle de la ville), de la taille de la ville (environ 325 × 270 m, city-plan) ; son bord est le bord visible de la carte, comme dans REF_ENV. Son dessus est à 10 mm sous zéro, juste sous celui de site-ground (5 mm) : le terrain du chantier et les socles des lieux s'y fondent sans scintillement, leurs bords se perdent dans le plateau. Le dessus est en herbe (MAT_LANDSCAPE) ; data.zones dessine les dalles de béton (MAT_CONCRETE) des places, des cours et des parkings, comme site-ground ; les rues viennent de road-kit. La bande libre : tant que le chantier a quatre applications ou moins, la partie de la place du chantier qui n'est pas construite est un pré, avec une vingtaine d'arbres de nature-kit posés par l'assemblage ; elle disparaît quand la cinquième application ouvre la deuxième rangée de parcelles (docs/ville.md), sans que la ville bouge. Il reçoit l'ombre et n'en porte pas. Fiche validée par Pierre-Alain le 23 octobre 2026 : un seul socle pour toute la ville ; la règle 18.5 vaut pour la carte entière, le lieu posé sur son socle. Version 1.0.0 validée par Pierre-Alain le 23 octobre 2026, après le constat du contrôleur : le socle de la ville fait 3 m (le bord de 0,60 m ne faisait qu'environ 1 px au dézoom de la ville entière ; à 3 m, environ 7 px) ; l'herbe reste en MAT_LANDSCAPE, séparée de la terre du chantier par la clôture et la rue de ceinture ; une zone grass ne dessine rien, le dessus étant déjà en herbe.

- Fichier : `components/site/city-ground/index.js`
- Fabriqué par : modeleur
- Production : Géométrie générée par le code du composant (paramétrique, liée aux données)
- Paramètres : `width` (nombre, 100 à 340, défaut 325) ; `depth` (nombre, 100 à 280, défaut 270)
- États : `default`
- Ancres : aucune
- Données reçues par setState : `zones` (liste de { x, z, width, depth, surface: grass \| concrete }, en mètres, origine au centre du plateau)
- Budget : 2000 triangles, 3 matériaux
- Critères d'acceptation :
  - Le chantier et les socles des lieux se fondent dans le terrain sans scintillement
  - L'herbe, le béton, l'enrobé et la terre se distinguent en niveaux de gris
  - La bande libre passe du pré à la deuxième rangée de parcelles sans que la ville bouge
  - Le bord du plateau se lit au dézoom, comme celui de REF_ENV
  - 3 appels de dessin dans la passe principale, aucun dans la passe d'ombre (il reçoit l'ombre, il n'en porte pas), en haute comme en basse
  - Les zones se redessinent quand data.zones change

### Le kit des rues (`road-kit`)

Script Blender blender/assets/road-kit.py, complété par l'assemblage. La chaussée : 6 m d'enrobé (MAT_ASPHALT), ligne médiane en tirets blancs (MAT_SURFACE) élargis à 0,30 m, comme la route de REF_ENV. Les trottoirs : 2 m de béton (MAT_CONCRETE), bordure surélevée de 0,15 m, chanfrein C1. Les pièces du kit : carrefour en croix (300 / 80 triangles), carrefour en T (250 / 70), giratoire (1 200 / 300), passage piéton en bandes blanches (MAT_SURFACE), lampadaire (120 / 0). Le giratoire est le marqueur romand de la rue : îlot central en herbe (MAT_LANDSCAPE), où l'assemblage pose un arbre de nature-kit ; deux giratoires, au premier carrefour de chaque avenue après la rue de ceinture (city-plan ; décision de Pierre-Alain du 24 octobre 2026 : posé sur la ceinture, un giratoire de 26 m débordait sur la place du chantier). Le lampadaire : mât graphite (MAT_PAINTED_METAL_GRAPHITE) de 6 m, crosse et tête en verre (MAT_GLASS, allumée la nuit par city-night), environ tous les 25 m ; le graphite et la crosse le distinguent du projecteur de chantier, galvanisé et lesté. Le tronçon droit STRAIGHT (10 m) est étiré par l'assemblage à la longueur de chaque tronçon, comme la clôture étire son panneau (brief validé par Pierre-Alain le 24 octobre 2026) : 38 triangles par tronçon quelle que soit sa longueur, au lieu d'une pièce de 10 m répétée sur 3,7 km de rues (74 000 triangles) ; le tiret DASH est répété tous les 6 m. DASH, CROSSING et le lampadaire n'ont pas de pièce basse : l'assemblage ne les pose pas en qualité basse. Au bord du socle, les rues sont coupées net, comme sur une maquette. Qualité basse (bible, 18.3) : trottoir de plain-pied, marquages et lampadaires supprimés. Fusionné par matériau dans la ville (city-plan), le kit y prend environ 6 appels de dessin. Fiche validée par Pierre-Alain le 23 octobre 2026 : passages piétons blancs, et non jaunes comme en Suisse, pour ne pas se confondre avec la bordure de la zone du chantier ni avec le jaune de « Bloqué ». Version 1.0.0 (ENV_ROAD_KIT_A_v001), planche et constat du contrôleur validés par Pierre-Alain le 24 octobre 2026 : 1 414 triangles et 6 matériaux pour tout le GLB ; CROSS 202 / 26, TEE 120 / 16, ROUNDABOUT 770 / 140, STRAIGHT 38 / 6, lampadaire 84 / 0 ; tête du lampadaire à 0,15 m (le détail minimal) ; chaussée à +0,04 m, trottoirs à +0,19 m (+0,05 m de plain-pied en basse, l'enrobé passant dessous).

- Dossier : `components/kit/road-kit/`, script `blender/assets/road-kit.py`
- Fabriqué par : modeleur
- Production : Modèle GLB produit par un script Blender du dépôt ; le composant le pilote (états, animations, ancres) ; modèle `ENV_ROAD_KIT_A_v001`
- Modèles : `ENV_ROAD_KIT_A_v001.glb`
- Budget : 3000 triangles, 6 matériaux
- Critères d'acceptation :
  - Chaque pièce est un nœud nommé selon la convention (bible, section 9) ; les pièces s'assemblent sans retouche sur le pas de 50 m
  - La chaussée, le trottoir et l'herbe se distinguent en niveaux de gris
  - Le lampadaire ne se confond pas avec le projecteur de chantier (floodlight)
  - Aucun marquage n'imite un signal : ni orange, ni triangle, ni rouge et blanc, ni jaune
  - Qualité basse : plus rien sous 0,30 m (trottoir de plain-pied, ni marquage, ni lampadaire)
  - Fusionné dans la ville, environ 6 appels de dessin

### Le kit de la nature (`nature-kit`)

Script Blender blender/assets/nature-kit.py. Le feuillu, en deux tailles (5 m et 8 m) : couronne en boule facettée (MAT_LANDSCAPE) sur un tronc (MAT_WOOD), 150 / 40 triangles. Le conifère : un sapin en cône (MAT_FOLIAGE_DARK), 80 / 24. La haie de thuyas, posée par 4 m (MAT_FOLIAGE_DARK), 24 / 12 : la haie qui entoure les villas romandes. Le buisson, 40 triangles en haute, fondu dans la haie en basse. Le banc de parc, supprimé en basse. La fontaine de village : bassin rectangulaire en béton (MAT_CONCRETE), sa borne, une eau opaque (MAT_WATER) qui ne coule pas, environ 300 / 100 triangles, posée sur la place de la ville (city-plan). Le sapin et la haie sont foncés pour se distinguer de la pelouse en niveaux de gris. Plafonds : 400 arbres en haute, 150 en basse. Rien ne bouge : aucun arbre ne se balance. Fusionné par matériau dans la ville, le kit y prend environ 5 appels de dessin. La modification de palette du lot G9 se fait en une seule fois, avant ce kit, le premier à en avoir besoin : MAT_FOLIAGE_DARK, MAT_WATER, MAT_ROOF_TILE, MAT_SHUTTER et, si la planche le demande, MAT_PLASTER (crépi crème) ; chaque teinte est proposée sur planche, à plus de 15 en ΔE 2000 des couleurs d'état, d'équipe, de l'orange des engins, du gilet, de la brique et des bennes ; tous les modèles sont ensuite reconstruits une seule fois. Fiche validée par Pierre-Alain le 23 octobre 2026, avec le principe d'une seule modification de palette pour le lot.

- Dossier : `components/kit/nature-kit/`, script `blender/assets/nature-kit.py`
- Fabriqué par : modeleur ; directeur artistique (la planche de palette)
- Production : Modèle GLB produit par un script Blender du dépôt ; le composant le pilote (états, animations, ancres)
- Budget : 800 triangles, 5 matériaux
- Critères d'acceptation :
  - Chaque pièce est un nœud nommé selon la convention (bible, section 9)
  - Le feuillu, le sapin et la haie se distinguent à 2 px par mètre et en niveaux de gris
  - Les arbres côté caméra ne cachent ni un agent, ni un repère, ni une porte des zones
  - Rien ne bouge
  - Qualité basse : plus rien sous 0,30 m
  - Les teintes nouvelles de la palette validées sur planche par Pierre-Alain avant la fabrication, tous les modèles reconstruits une fois

### Le kit des villas romandes (`villa-kit`)

Script Blender blender/assets/villa-kit.py. Le corps en crépi clair (MAT_SURFACE, ou MAT_PLASTER crème si la planche de palette le retient), une ou deux teintes, jamais vive. Les toits : deux pans ou quatre pans (pavillon), en tuile brune (MAT_ROOF_TILE) ou en ardoise graphite (MAT_PAINTED_METAL_GRAPHITE) ; un cube moderne à toit plat, en crépi blanc. Les cotes de la famille des bâtiments (bible, 18.2) : étage de 3 m, porte et fenêtres × 1,2 ; volets peints (MAT_SHUTTER) aux fenêtres. Les vitres sont à part : le script pose une ancre par fenêtre (WIN_*), l'assemblage y met des vitres instanciées que city-night allume. Six variantes, combinaisons tirées par le script : quatre à toit de tuiles brunes, une à toit d'ardoise graphite, un cube moderne à toit plat ; rez avec combles (8 m au plus, pour le côté caméra) ou rez avec un étage (10 m, pour les rangées du fond et des côtés) ; avec ou sans garage accolé à toit plat. Le jardin, l'allée et la haie (nature-kit) sont posés par l'assemblage. Écarté : le chalet, une image de montagne, pas de banlieue romande. Qualité basse (détail minimal de 0,60 m pour la ville, city-plan et bible 18.3) : volets fondus dans la façade, cheminées et avant-toits fins supprimés. Environ 64 villas dans la ville, fusionnées par matériau : environ 5 appels de dessin. Fiche validée par Pierre-Alain le 23 octobre 2026 : tuiles, ardoise et un cube moderne ; critère ajouté le même jour avec son accord : jamais confondue avec un bâtiment d'application terminé.

- Dossier : `components/kit/villa-kit/`, script `blender/assets/villa-kit.py`
- Fabriqué par : modeleur
- Production : Modèle GLB produit par un script Blender du dépôt ; le composant le pilote (états, animations, ancres)
- Budget : 8000 triangles, 7 matériaux
- Critères d'acceptation :
  - Chaque pièce est un nœud nommé selon la convention (bible, section 9) ; les six variantes s'assemblent sans retouche
  - Une villa : 1 200 triangles en haute, 400 en basse
  - On reconnaît une villa romande à 8 px par mètre : la silhouette du toit, les volets, la haie
  - Côté caméra, aucune villa ne dépasse 8 m
  - Aucune couleur d'état, ni orange, ni corail
  - Les vitres prennent la nuit (city-night) sans casser la fusion de la ville
  - Jamais confondue avec un bâtiment d'application (building, type house) terminé : planche côte à côte

### Le kit des immeubles locatifs (`apartment-kit`)

Script Blender blender/assets/apartment-kit.py, en pièces empilées par l'assemblage. Deux plans au sol : la barre (24 × 12 m) et le plot (15 × 15 m). Les pièces : un rez (700 / 250 triangles), habité ou commercial avec une vitrine, sans enseigne ni texte ; un étage (350 / 120), empilé de 2 à 5 fois ; un toit (500 / 150), plat avec acrotère ou à quatre pans faibles en tuile (MAT_ROOF_TILE). Un immeuble de six niveaux fait environ 3 000 / 1 000 triangles. Façades en crépi clair, balcons filants en béton (MAT_CONCRETE), garde-corps et menuiseries graphite ; les vitres sont instanciées sur des ancres WIN_*, comme celles des villas (city-night). Écarté : les toiles de tente orange ou jaunes des balcons, très romandes, parce que l'orange et le jaune sont pris par le chantier et par l'état « Bloqué ». Posés seulement dans les rangées du fond et des côtés (city-plan), jamais côté caméra ; 19 m au plus. Qualité basse : garde-corps fondus en un bandeau plein, menuiseries fines supprimées. Environ 24 immeubles dans la ville, fusionnés par matériau : environ 5 appels de dessin. Fiche validée par Pierre-Alain le 23 octobre 2026.

- Dossier : `components/kit/apartment-kit/`, script `blender/assets/apartment-kit.py`
- Fabriqué par : modeleur
- Production : Modèle GLB produit par un script Blender du dépôt ; le composant le pilote (états, animations, ancres)
- Budget : 6000 triangles, 6 matériaux
- Critères d'acceptation :
  - Chaque pièce est un nœud nommé selon la convention (bible, section 9) ; l'empilement se fait sans retouche, de 3 à 6 niveaux
  - Un immeuble de six niveaux : 3 000 triangles en haute, 1 000 en basse
  - Aucun immeuble côté caméra ; aucun ne cache une zone au cadrage par défaut
  - Aucune couleur d'état, ni orange, ni corail, ni jaune
  - Jamais confondu avec un bâtiment d'application (building) terminé : planche côte à côte
  - Qualité basse : plus rien sous 0,60 m (garde-corps en bandeau plein)

### La nuit de la ville (`city-night`)

Pas un composant : une recette (src/lumiere.json, à côté de day-night) appliquée par l'assemblage de la carte, sans logique dans les kits. La règle qui protège le sens : sur la carte, une fenêtre franche (1,0) veut dire qu'un agent travaille là (day-night) ; les fenêtres de la ville ne sont donc jamais franches, seulement faibles (0,4), en blanc chaud #FFE4B5, comme les bureaux et les étages habités. Les fenêtres : environ 30 % des fenêtres des villas et 40 % de celles des immeubles, choisies par une graine pour chaque nuit, fixes toute la nuit (rien ne s'allume ni ne s'éteint en cours de nuit) ; elles suivent le fondu de l'aube et du crépuscule de la carte (30 minutes). Deux lots instanciés pour toute la ville, vitres éteintes (MAT_GLASS) et vitres allumées (une copie du verre réglée comme les vitres de la carte), posés sur les ancres WIN_* de villa-kit et apartment-kit. L'éclairage public : les lampadaires de road-kit sont allumés toute la nuit, quel que soit le régime du chantier ; leur tête en blanc chaud ; leur tache au sol, un seul lot instancié en mélange additif, plus faible que celle des projecteurs (opacité 0,10 au plus contre 0,22) et en blanc chaud plutôt qu'en blanc, pour que seuls les projecteurs disent « chantier ouvert » ; 150 taches au plus en haute, aucune en basse. Les voitures : deux petites lueurs blanc chaud à l'avant, sans vraie lumière (city-car). La ville est hors des cadres des zones : toujours en couleur. Avis du modeleur du 22 octobre 2026 : +1 appel pour les vitres allumées, +1 pour les taches, aucun dans l'ombre. Fiche validée par Pierre-Alain le 23 octobre 2026.

- Fabriqué par : directeur artistique (la recette) ; modeleur (l'assemblage)
- Budget : 2000 triangles, 2 matériaux
- Critères d'acceptation :
  - Le jour, rien ne change : le cube étalon reste conforme
  - Aucune fenêtre de la ville n'est franche ; blanc chaud, jamais une couleur d'état
  - Rien ne clignote ; rien ne s'allume ni ne s'éteint pendant la nuit
  - Les taches des lampadaires ne se confondent pas avec celles des projecteurs : planche de nuit, en clair et en sombre
  - La nuit, sur la capture des valeurs, chaque objet se lit à sa forme
  - Planche : la ville allumée à côté d'une zone encore grise
  - 2 appels de dessin de plus au plus, aucun dans la passe d'ombre ; aucune tache en qualité basse

### La circulation de la ville (`city-traffic`)

Pas un composant : une partie de l'assemblage de la carte (src/ville/) et un ajout au contrat de l'hôte. Les voitures (city-car, en flotte instanciée) roulent à droite, comme en Suisse, à environ 30 km/h, seulement dans la ville et sur la rue de ceinture (city-plan) ; elles tournent aux carrefours et font le tour des giratoires ; elles sortent d'un garage ou d'un parking et s'y garent, rien n'apparaît au milieu d'une rue ; elles arrivent par vagues, environ une toutes les 20 à 40 secondes. Les passants (character 1.2.0, civilian) sont en tenue de ville colorée, jamais graphite ni casqués, pour ne jamais être confondus avec le client ; ils marchent sur les trottoirs et les chemins des parcs, traversent aux passages piétons, entrent et sortent par les portes des villas et des immeubles, s'arrêtent à la fontaine pour parler (talk, idle) ; ils ne jouent jamais celebrate, blocked ni unknown, et n'entrent jamais dans les zones ni dans le chantier. La ville vit toujours, par vagues, que le chantier soit ouvert, en pause ou fermé : elle ne dit rien du régime. Ce qui épargne la batterie (avis du modeleur du 22 octobre 2026) : une image d'ambiance ne refait pas l'ombre (mesuré : −34 %), les voitures et les passants n'ayant qu'un disque d'ombre de contact instancié, ce qui demande au contrat un retour de update(dt), "ambiance", en plus de true ; l'ambiance tourne à 30 images par seconde quand rien d'autre ne bouge ; sous 4 px par mètre, les passants ne sont plus dessinés ; l'hôte endort la ville quand la carte est cachée ou après quelques minutes sans geste de l'utilisateur. Estimé : environ 10 % du coût d'une animation continue, à mesurer sur le portable de référence. Plafonds : 6 voitures en route et 6 passants en haute, 2 et 2 en basse ; la nuit, la moitié en haute, 1 et 1 en basse ; avec moins d'animations, la ville se fige (voitures garées, passants posés et immobiles, aucun trajet). Fiche validée par Pierre-Alain le 23 octobre 2026 : la ville vit toujours, par vagues ; city-car passe à six voitures en flotte, avec ses phares la nuit.

- Fabriqué par : intégrateur (l'assemblage et le contrat) ; modeleur (la flotte de city-car) ; animateur (les passants, character 1.2.0)
- Budget : 36000 triangles, 10 matériaux
- Critères d'acceptation :
  - Rien ne dit un fait du harnais ; la circulation ne dépend ni du régime ni d'une action de GDC
  - Ni clic, ni badge, ni anneau de sélection, ni repère HTML ; cible() rend null
  - Voitures et passants jamais dans les zones, dans le chantier ni sur les routes du carrefour ; les voitures roulent à droite
  - Plafonds : 6 voitures en route et 6 passants en haute, 2 et 2 en basse, la moitié la nuit
  - 36 appels de dessin au plus en haute, 12 en basse, aucun dans la passe d'ombre
  - Une image d'ambiance ne refait pas l'ombre : update(dt) rend "ambiance", écrit dans docs/contrat-composant.md
  - Avec moins d'animations, la ville se fige : voitures garées, passants immobiles
  - Coût de l'ambiance mesuré sur un portable de 13 à 14 pouces, comme le constat D-1c
