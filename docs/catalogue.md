# Le catalogue

Fichier généré par `npm run catalogue` depuis `catalogue.json`. Ne pas le modifier à la main.

46 éléments : 44 livré, 2 exemple.

## G0 : La ligne graphique

Fixer le style avant de produire : mood board, bible WORKSITE, bibliothèque de matériaux, scène de référence et planche comparative.

| Ordre | Identifiant | Nom | Nature | But | Statut |
|---|---|---|---|---|---|
| 1 | `moodboard` | Le mood board | Document de référence, pas de code | Réunir les images qui donnent le ton, avant toute production. | livré |
| 2 | `bible` | La bible graphique | Document de référence, pas de code | La règle de production : univers, palette, matériaux, personnages, bâtiments, engins, caméra, conventions Blender, budgets, contrôles. | livré |
| 3 | `material-library` | La bibliothèque de matériaux | Document de référence, pas de code | Des matériaux MAT_ partagés par tous les modèles, définis une seule fois. | livré |
| 4 | `reference-scene` | La scène de référence | Document de référence, pas de code | Servir d'étalon : chaque nouveau composant est posé à côté pour vérifier qu'il appartient au même monde. | livré |

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

Un assemblage dans la galerie, même caméra et même lumière : terrain, grue, un bureau, un bâtiment dans quatre états, un personnage, l'anneau de sélection, un panneau. La planche comparative (bible, section 14) pose chaque nouvel asset à côté de deux modèles maîtres validés. Réalisée dans la galerie (`src/scene-reference.js`) : un chantier clôturé sur le terrain de chantier ; planche entre le bâtiment terminé et le personnage maître (choix de Pierre-Alain du 21 octobre 2026).

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
| 10 | `site-fence` | La clôture de chantier | Composant 3D Three.js, conforme à docs/contrat-composant.md | Cloisonner le chantier, comme tout chantier romand. | livré |
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

### La clôture de chantier (`site-fence`)

Une clôture mobile : panneaux en treillis gris (maille de 0,45 m) sur plots en béton, un poteau rond à chaque jonction, sans orange, pour ne jamais ressembler à la barrière de blocage (bible, 18.8). Posée en ligne droite le long d'une longueur donnée, en panneaux de largeur égale (3,50 m au plus) ; avec gate, un portail ouvert de 4 m au milieu, ses deux vantaux tournés vers l'intérieur (décisions de Pierre-Alain du 20 octobre 2026).

- Fichier : `components/site/site-fence/index.js`
- Production : Modèle GLB produit par un script Blender du dépôt ; le composant le pilote (états, animations, ancres) ; modèle `ENV_SITE_FENCE_A_v001`
- Modèles : `ENV_SITE_FENCE_A_v001.glb`
- Paramètres : `length` (nombre, 2 à 60, défaut 12) ; `gate` (booléen, défaut false)
- États : `default`
- Ancres : `label`
- Données reçues par setState : aucune
- Budget : 4000 triangles, 3 matériaux
- Critères d'acceptation :
  - Reconnaissable comme clôture de chantier mobile, sans orange
  - Impossible à confondre avec la barrière de blocage sur une planche côte à côte
  - Les panneaux et les plots se répètent par instance

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

Un plateau maquette de 0,60 m en MAT_EARTH (bible, 18.5), arêtes du dessus en C3, de width × depth mètres ; son dessus est à 5 mm sous zéro, pour que les socles des lieux posés dessus se fondent dans la terre. data.zones dessine des dalles de 0,10 m : { x, z, width, depth, surface }, surface concrete (dalle, aire bétonnée) ou asphalt (voie d'accès ou de circulation). C'est GDC qui choisit les zones, par exemple plus de béton quand un bâtiment avance ; le composant ne fait que les dessiner. Il se pose sur le terrain (ground). Fiche validée par Pierre-Alain le 21 octobre 2026.

- Fichier : `components/site/site-ground/index.js`
- Production : Géométrie générée par le code du composant (paramétrique, liée aux données)
- Paramètres : `width` (nombre, 8 à 80, défaut 40) ; `depth` (nombre, 8 à 80, défaut 30)
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
| 2 | `building` | Le bâtiment (une application) | Composant 3D Three.js, conforme à docs/contrat-composant.md | Montrer l'avancement d'une application par l'état de son bâtiment. | livré |
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

### Le bâtiment (une application) (`building`)

Assemblé par le code à partir du kit de bâtiment, selon le type et la taille. États : plot (terrain préparé), excavation (fouille avec la pelleteuse), foundations (fondations coulées), structure (poteaux, dalles et échafaudage ; data.progress de 0 à 1), envelope (murs et toiture fermés), finishing (second œuvre : fenêtres posées, ouvriers visibles), completed (habité : fenêtres éclairées), inspection (réception en cours). Un défaut ne change pas l'état : GDC pose defect-sign sur la façade. Familles de la bible : le bâtiment d'une application relève du chantier (BLD_DEVELOPMENT n'est pas un bureau, c'est ce bâtiment).

- Fichier : `components/building/building/index.js`
- Production : Pièces d'un kit Blender assemblées par le code selon les données (avancement, nombre de pièces) ; kit `building-kit`
- Modèles : `BLD_SITEWORK_A_v001.glb`, `kit:building-kit/BLD_KIT_A_v003.glb`, `machine:excavator/VEH_EXCAVATOR_A_v001.glb`
- Paramètres : `type` (house | block | hall, défaut block) ; `floors` (nombre, 1 à 6, défaut 3) ; `wings` (nombre de fiches, 1 à 8, défaut 3)
- États : `plot`, `excavation`, `foundations`, `structure`, `envelope`, `finishing`, `completed`, `inspection`
- Ancres : `label`, `badge`, `progress`, `door`
- Données reçues par setState : `progress` (0 à 1, avancement dans l'état courant (fait monter la structure))
- Budget : 20000 triangles, 10 matériaux
- Critères d'acceptation :
  - Chaque état reconnaissable sans légende
  - data.progress fait monter la structure sans saut
  - En qualité low, moins de 6000 triangles
  - Clic sur le bâtiment : GDC ouvre la vue intérieure (building-interior)

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
| 1 | `character-kit` | Le personnage maître et son équipe | Bibliothèque de modèles 3D produite par un script Blender (blender/assets/<id>.py) et réutilisée par plusieurs composants : components/kit/<id>/ | Un squelette, une morphologie et des animations communes pour tous les agents. | livré |
| 2 | `character` | Le personnage (un agent) | Composant 3D Three.js, conforme à docs/contrat-composant.md | Montrer qui travaille, où, et dans quel état. | livré |
| 3 | `excavator` | La pelleteuse | Composant 3D Three.js, conforme à docs/contrat-composant.md | L'état fouille d'un bâtiment : le terrassement d'une nouvelle application. | livré |
| 4 | `crane` | La grue | Composant 3D Three.js, conforme à docs/contrat-composant.md | La fusion vers dev, à la réception : on pose la pièce finie. | livré |
| 5 | `delivery-truck` | Le camion de livraison | Composant 3D Three.js, conforme à docs/contrat-composant.md | L'arrivée d'une nouvelle dépendance : un événement à surveiller pour la sécurité. | livré |

### Le personnage maître et son équipe (`character-kit`)

CHR_BASE_MASTER (1,70 m, 5 têtes, décision du 19 octobre 2026), son armature RIG_CHR_BASE, les douze animations communes, les tenues par métier (client, architect, engineer, foreman, mason, electrician, plumber, painter, inspector, concierge, representative ; gilet orange pour l'équipe site), le casque de la couleur d'équipe (blanc pour l'équipe client ; le client n'en porte pas) et les accessoires (tablette, rouleau de plans, trépied de géomètre, talkie-walkie, rouleau à peinture, truelle, câble, planchette, tampon, trousseau de clés, classeur). Qui porte quoi : docs/correspondances.md. Bible, section 5.

- Dossier : `components/kit/character-kit/`, script `blender/assets/character-kit.py`
- Production : Modèle GLB produit par un script Blender du dépôt ; le composant le pilote (états, animations, ancres)
- Modèles : `CHR_BASE_MASTER_v002.glb`, `CHR_HAIR_KIT_v002.glb`, `PRP_CHR_TOOLS_v002.glb`, `CHR_OUTFIT_CLIENT_v002.glb`, `CHR_OUTFIT_ARCHITECT_v002.glb`, `CHR_OUTFIT_ENGINEER_v002.glb`, `CHR_OUTFIT_FOREMAN_v002.glb`, `CHR_OUTFIT_MASON_v002.glb`, `CHR_OUTFIT_ELECTRICIAN_v002.glb`, `CHR_OUTFIT_PLUMBER_v002.glb`, `CHR_OUTFIT_PAINTER_v002.glb`, `CHR_OUTFIT_INSPECTOR_v002.glb`, `CHR_OUTFIT_CONCIERGE_v002.glb`, `CHR_OUTFIT_REPRESENTATIVE_v002.glb`
- Animations : `ANM_CHR_IDLE`, `ANM_CHR_WALK`, `ANM_CHR_WORK`, `ANM_CHR_TYPING`, `ANM_CHR_INSPECT`, `ANM_CHR_READ`, `ANM_CHR_THINKING`, `ANM_CHR_WAITING`, `ANM_CHR_TALK`, `ANM_CHR_CELEBRATE`, `ANM_CHR_BLOCKED`
- Budget : 8000 triangles, 6 matériaux
- Critères d'acceptation :
  - Planche comparative des morphologies validée avant les variantes
  - Un seul squelette pour tous
  - Le portrait (G7) et le corps se correspondent

### Le personnage (un agent) (`character`)

Un personnage par agent, à partir du personnage maître : tenue et outil de son métier, couleur de son équipe. GDC le déplace ; le composant joue l'animation de l'état, sur place. L'apparence de chaque personne (morphologie, peau, coiffure, barbe, lunettes, outil) est dans components/kit/character-kit/equipe.json ; GDC la passe en paramètres (décision de PA du 19 octobre 2026 : chaque personne a son personnage). blocked : posture d'arrêt devant la barrière ; unknown : immobile, matériaux grisés, lisible sans animation.

- Fichier : `components/character/character/index.js`
- Production : Modèle GLB produit par un script Blender du dépôt ; le composant le pilote (états, animations, ancres) ; kit `character-kit`
- Modèles : `kit:character-kit/CHR_BASE_MASTER_v002.glb`, `kit:character-kit/CHR_HAIR_KIT_v002.glb`, `kit:character-kit/PRP_CHR_TOOLS_v002.glb`, `kit:character-kit/CHR_OUTFIT_CLIENT_v002.glb`, `kit:character-kit/CHR_OUTFIT_ARCHITECT_v002.glb`, `kit:character-kit/CHR_OUTFIT_ENGINEER_v002.glb`, `kit:character-kit/CHR_OUTFIT_FOREMAN_v002.glb`, `kit:character-kit/CHR_OUTFIT_MASON_v002.glb`, `kit:character-kit/CHR_OUTFIT_ELECTRICIAN_v002.glb`, `kit:character-kit/CHR_OUTFIT_PLUMBER_v002.glb`, `kit:character-kit/CHR_OUTFIT_PAINTER_v002.glb`, `kit:character-kit/CHR_OUTFIT_INSPECTOR_v002.glb`, `kit:character-kit/CHR_OUTFIT_CONCIERGE_v002.glb`, `kit:character-kit/CHR_OUTFIT_REPRESENTATIVE_v002.glb`
- Animations : `ANM_CHR_IDLE`, `ANM_CHR_WALK`, `ANM_CHR_WORK`, `ANM_CHR_TYPING`, `ANM_CHR_INSPECT`, `ANM_CHR_READ`, `ANM_CHR_THINKING`, `ANM_CHR_WAITING`, `ANM_CHR_TALK`, `ANM_CHR_CELEBRATE`, `ANM_CHR_BLOCKED`
- Paramètres : `trade` (client | architect | engineer | foreman | mason | electrician | plumber | painter | inspector | concierge | representative) ; `team` (none | client | architecture | studies | site | reception | operations) ; `body` (M | F) ; `skin` (A | B | C | D | E) ; `hair` (short | side | crop | bob | long | ponytail | bun) ; `hairColor` (black | brown | blond | red | grey) ; `beard` (true | false) ; `glasses` (true | false) ; `tool` (auto (l'outil du métier) | none | plans | tablet | tripod | radio | roller | trowel | cable | clipboard | stamp | keys | binder | wrench)
- États : `idle`, `walk`, `work`, `typing`, `inspect`, `read`, `thinking`, `waiting`, `talk`, `celebrate`, `blocked`, `unknown`
- Ancres : `label`, `badge`
- Données reçues par setState : `facing` (angle en radians, sens du regard ou de la marche)
- Budget : 8000 triangles, 6 matériaux
- Critères d'acceptation :
  - Le métier se lit à la tenue et à l'outil
  - L'équipe se lit à la couleur de la tenue
  - unknown : gris, immobile, lisible
  - reducedMotion : posture fixe et lisible pour chaque état
  - Animations sur place, sans déplacement non maîtrisé

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
| 1 | `building-interior` | L'intérieur d'un bâtiment | Composant 3D Three.js, conforme à docs/contrat-composant.md | La vue micro : une pièce par fiche, et les ouvriers au travail dans chacune. | livré |
| 2 | `office-interior` | La salle de brainstorming | Composant 3D Three.js, conforme à docs/contrat-composant.md | La vue rapprochée d'une séance de brainstorming : les gens autour de la table, les idées au tableau. | livré |

### L'intérieur d'un bâtiment (`building-interior`)

Une coupe du bâtiment en pièces, de plain-pied, en maison de poupée comme les bureaux en conteneur (sans toit, murs côté caméra et cloisons coupés à l'allège) ; une pièce de 6 × 3 m par fiche, en grappe, jamais en ligne. data.rooms donne, pour chaque pièce, son état (study, waiting, construction, reception, done, defect) et les métiers présents ; quatre aspects (décision de Pierre-Alain du 20 octobre 2026) : study et waiting vides, construction en travaux, reception et done finies, defect avec un défaut visible. Les personnages sont des composants character posés par GDC aux ancres room:n. État default : la vue s'ouvre (les murs montent) ; hidden : elle se ferme (ils redescendent).

- Fichier : `components/interior/building-interior/index.js`
- Production : Pièces d'un kit Blender assemblées par le code selon les données (avancement, nombre de pièces) ; kit `building-kit`
- Modèles : `BLD_INTERIOR_A_v001.glb`, `kit:building-kit/BLD_KIT_A_v003.glb`
- Paramètres : `rooms` (nombre, 1 à 12, défaut 4)
- États : `default`, `hidden`
- Ancres : `label`, `room:*`
- Données reçues par setState : `rooms` (liste, une entrée par fiche : { state: study \| waiting \| construction \| reception \| done \| defect, trades: [métiers présents] })
- Budget : 20000 triangles, 10 matériaux
- Critères d'acceptation :
  - Chaque pièce lisible et désignable (ancre room:n)
  - L'état d'une pièce se voit à son aménagement : vide, en travaux, finie, défaut
  - Transition d'entrée et de sortie douce, figée si reducedMotion

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
| 2 | `side-nav` | La navigation | Élément d'interface HTML (élément personnalisé), conforme à docs/contrat-composant.md, partie interface | Aller à un lieu, un bâtiment, une fiche ou un agent ; la caméra suit. | livré |
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

### La navigation (`side-nav`)

Liste groupée avec pastille d'état ; recherche intégrée.

- Élément : `<gdc-side-nav>`
- Entrées (propriété data) : `groups` (liste de { title, items: [{ id, name, state }] } ; state est l'un des six états de la signalétique ; absent, pas de signe (rien à signaler) ; toute autre valeur, « inconnu ») ; `selected` (identifiant sélectionné)
- Sorties (événements) : `gdc-select` (detail.id = identifiant choisi)
- Critères d'acceptation :
  - Utilisable au clavier
  - Devient une rangée défilante sur téléphone

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
| 2 | `step-icons` | Les icônes des étapes | Illustration ou icône SVG, animée en CSS si besoin | Une icône pour chacune des dix étapes, de l'idée aux transformations. | livré |
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

Jeu de dix icônes SVG, au trait, de même épaisseur : idea (l'idée, une ampoule), survey (le relevé de l'existant, le trépied du géomètre), plans (les plans, le tracé des murs), permit (le permis de construire, un document scellé), execution-plans (les plans d'exécution, l'équerre graduée), green-light (le feu vert, la lampe du bas allumée), construction (le mur de briques), reception (la réception, la planchette), production (la mise en production, la clé remise), transformations (deux flèches qui tournent). Identifiants proposés par l'atelier et acceptés par Pierre-Alain le 21 octobre 2026, à aligner sur ceux de GDC quand il les fixera (seuls les noms de fichiers changeraient). Grille de 24, trait de 2 à bouts ronds, une seule couleur héritée du texte (currentColor) ; décoratives (aria-hidden), le libellé de l'étape est écrit à côté. Dessins originaux.

- Entrées (propriété data) : `step` (identifiant de l'étape (nom du fichier SVG) : idea, survey, plans, permit, execution-plans, green-light, construction, reception, production, transformations)
- Sorties (événements) : aucune
- Critères d'acceptation :
  - Lisibles à 20 pixels
  - Une seule couleur, héritée du texte

### Les icônes des lieux (`place-icons`)

Une icône par lieu, avec les identifiants que GDC envoie (docs/ville.md) et le bâtiment habité (décision de Pierre-Alain du 21 octobre 2026 : neuf icônes, la baraque comprise) : bureau-architecte (le compas), bureau-etudes (la calculatrice), bureau-client (la mallette), bureau-controle (le tampon), baraque (le conteneur du conducteur de travaux), chantier (la grue), parking (la voiture), aire-reception (le camion de livraison), batiment-habite (la maison, sa fenêtre allumée). Les identifiants restent ceux de GDC, en français : ce sont des données, pas du code. Même famille que les icônes des étapes (grille de 24, trait de 2, currentColor). Dessins originaux.

- Entrées (propriété data) : `place` (identifiant du lieu dans GDC (nom du fichier SVG) : bureau-architecte, bureau-etudes, bureau-client, bureau-controle, baraque, chantier, parking, aire-reception, batiment-habite)
- Sorties (événements) : aucune
- Critères d'acceptation :
  - Même famille que les icônes des étapes
