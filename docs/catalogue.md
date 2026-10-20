# Le catalogue

Fichier généré par `npm run catalogue` depuis `catalogue.json`. Ne pas le modifier à la main.

44 éléments : 25 à faire, 17 livré, 2 exemple.

## G0 : La ligne graphique

Fixer le style avant de produire : mood board, bible WORKSITE, bibliothèque de matériaux, scène de référence et planche comparative.

| Ordre | Identifiant | Nom | Nature | But | Statut |
|---|---|---|---|---|---|
| 1 | `moodboard` | Le mood board | Document de référence, pas de code | Réunir les images qui donnent le ton, avant toute production. | à faire |
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

Un assemblage dans la galerie, même caméra et même lumière : terrain, grue, un bureau, un bâtiment dans quatre états, un personnage, l'anneau de sélection, un panneau. La planche comparative (bible, section 14) pose chaque nouvel asset à côté de deux modèles maîtres validés.

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
- Modèles : `kit:container-kit/ENV_CONTAINER_KIT_A_v003.glb`, `kit:building-kit/BLD_KIT_A_v001.glb`
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
- Modèles : `kit:container-kit/ENV_CONTAINER_KIT_A_v003.glb`, `kit:building-kit/BLD_KIT_A_v001.glb`
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
- Modèles : `kit:container-kit/ENV_CONTAINER_KIT_A_v003.glb`, `kit:building-kit/BLD_KIT_A_v001.glb`
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
- Modèles : `kit:container-kit/ENV_CONTAINER_KIT_A_v003.glb`, `kit:building-kit/BLD_KIT_A_v001.glb`
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
- Modèles : `kit:container-kit/ENV_CONTAINER_KIT_A_v003.glb`, `kit:building-kit/BLD_KIT_A_v001.glb`
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

## G2 : Les bâtiments et leurs états

Montrer l'avancement d'une application par l'état de son bâtiment.

| Ordre | Identifiant | Nom | Nature | But | Statut |
|---|---|---|---|---|---|
| 1 | `building-kit` | Le kit de bâtiment | Bibliothèque de modèles 3D produite par un script Blender (blender/assets/<id>.py) et réutilisée par plusieurs composants : components/kit/<id>/ | Les pièces modulaires communes à tous les bâtiments, aux mêmes dimensions d'assemblage. | livré |
| 2 | `building` | Le bâtiment (une application) | Composant 3D Three.js, conforme à docs/contrat-composant.md | Montrer l'avancement d'une application par l'état de son bâtiment. | à faire |
| 3 | `survey-poles` | Les gabarits | Composant 3D Three.js, conforme à docs/contrat-composant.md | Une fiche à l'étude : les perches qui montrent le volume futur, comme pendant la mise à l'enquête. | à faire |
| 4 | `shared-basement` | Le sous-sol commun | Composant 3D Three.js, conforme à docs/contrat-composant.md | Les ouvrages communs : base de données ou composants partagés par plusieurs applications. | à faire |

### Le kit de bâtiment (`building-kit`)

Sols, fondations, poteaux, poutres, dalles, murs, portes, fenêtres, toitures, escaliers, échafaudages, enseignes (bible, section 6) ; trame commune de 3 mètres. Utilisé par building, building-interior et les bureaux.

- Dossier : `components/kit/building-kit/`, script `blender/assets/building-kit.py`
- Production : Modèle GLB produit par un script Blender du dépôt ; le composant le pilote (états, animations, ancres)
- Modèles : `BLD_KIT_A_v001.glb`
- Budget : 20000 triangles, 10 matériaux
- Critères d'acceptation :
  - Toutes les pièces partagent la même trame et la même hauteur d'étage
  - Chaque pièce est un nœud nommé BLD_KIT_A_<PIECE>
  - Un bâtiment de démonstration s'assemble sans retouche

### Le bâtiment (une application) (`building`)

Assemblé par le code à partir du kit de bâtiment, selon le type et la taille. États : plot (terrain préparé), excavation (fouille avec la pelleteuse), foundations (fondations coulées), structure (poteaux, dalles et échafaudage ; data.progress de 0 à 1), envelope (murs et toiture fermés), finishing (second œuvre : fenêtres posées, ouvriers visibles), completed (habité : fenêtres éclairées), inspection (réception en cours). Un défaut ne change pas l'état : GDC pose defect-sign sur la façade. Familles de la bible : le bâtiment d'une application relève du chantier (BLD_DEVELOPMENT n'est pas un bureau, c'est ce bâtiment).

- Fichier : `components/building/building/index.js`
- Production : Pièces d'un kit Blender assemblées par le code selon les données (avancement, nombre de pièces) ; kit `building-kit`
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
| 3 | `excavator` | La pelleteuse | Composant 3D Three.js, conforme à docs/contrat-composant.md | L'état fouille d'un bâtiment : le terrassement d'une nouvelle application. | à faire |
| 4 | `crane` | La grue | Composant 3D Three.js, conforme à docs/contrat-composant.md | La fusion vers dev, à la réception : on pose la pièce finie. | livré |
| 5 | `delivery-truck` | Le camion de livraison | Composant 3D Three.js, conforme à docs/contrat-composant.md | L'arrivée d'une nouvelle dépendance : un événement à surveiller pour la sécurité. | à faire |

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
| 1 | `building-interior` | L'intérieur d'un bâtiment | Composant 3D Three.js, conforme à docs/contrat-composant.md | La vue micro : une pièce par fiche, et les ouvriers au travail dans chacune. | à faire |
| 2 | `office-interior` | L'intérieur d'un bureau | Composant 3D Three.js, conforme à docs/contrat-composant.md | La vue micro d'un bureau : l'architecte devant ses plans, les ingénieurs avec leur tablette. | à faire |

### L'intérieur d'un bâtiment (`building-interior`)

Une coupe du bâtiment en pièces ; data.rooms donne, pour chaque pièce, son état (study, waiting, construction, reception, done, defect) et les métiers présents. Les personnages sont des composants character posés par GDC aux ancres room:n.

- Fichier : `components/interior/building-interior/index.js`
- Production : Pièces d'un kit Blender assemblées par le code selon les données (avancement, nombre de pièces) ; kit `building-kit`
- Paramètres : `rooms` (nombre, 1 à 12, défaut 4)
- États : `default`
- Ancres : `label`, `room:*`
- Données reçues par setState : `rooms` (liste, une entrée par fiche : { state: study \| waiting \| construction \| reception \| done \| defect, trades: [métiers présents] })
- Budget : 20000 triangles, 10 matériaux
- Critères d'acceptation :
  - Chaque pièce lisible et désignable (ancre room:n)
  - L'état d'une pièce se voit à son aménagement : vide, en travaux, finie, défaut
  - Transition d'entrée et de sortie douce, figée si reducedMotion

### L'intérieur d'un bureau (`office-interior`)

Paramétrable pour le bureau d'architecte ou le bureau d'études ; des postes de travail aux ancres desk:n.

- Fichier : `components/interior/office-interior/index.js`
- Production : Pièces d'un kit Blender assemblées par le code selon les données (avancement, nombre de pièces) ; kit `building-kit`
- Paramètres : `kind` (architect | studies, défaut architect) ; `desks` (nombre, 1 à 8, défaut 4)
- États : `idle`, `active`
- Ancres : `label`, `desk:*`
- Données reçues par setState : `activeDesks` (nombre de postes occupés)
- Budget : 15000 triangles, 8 matériaux
- Critères d'acceptation :
  - Ambiance intellectuelle, distincte du chantier

## G5 : Les signaux dans la scène

Désigner ce qui est choisi, ce qui attend, ce qui bloque.

| Ordre | Identifiant | Nom | Nature | But | Statut |
|---|---|---|---|---|---|
| 1 | `selection-ring` | L'anneau de sélection | Composant 3D Three.js, conforme à docs/contrat-composant.md | Montrer l'élément survolé ou choisi. | exemple |
| 2 | `decision-sign` | Le panneau de décision | Composant 3D Three.js, conforme à docs/contrat-composant.md | Une décision t'attend à cet endroit. | à faire |
| 3 | `blocked-sign` | La barrière de blocage | Composant 3D Three.js, conforme à docs/contrat-composant.md | Un travail est bloqué ici. | à faire |
| 4 | `defect-sign` | Le signal de défaut | Composant 3D Three.js, conforme à docs/contrat-composant.md | Un défaut est ouvert sur une partie habitée. | à faire |
| 5 | `permit-board` | Le panneau du permis de construire | Composant 3D Three.js, conforme à docs/contrat-composant.md | Le permis de construire est accordé ; périmé, il demande ta nouvelle décision. | à faire |

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
- États : `default`
- Ancres : `badge`
- Données reçues par setState : aucune
- Budget : 1000 triangles, 3 matériaux
- Critères d'acceptation :
  - Reconnaissable à sa forme seule (barrière et triangle)
  - La couleur d'état est portée par le badge HTML

### Le signal de défaut (`defect-sign`)

Un cône ou un ruban posé sur la façade ou dans la pièce concernée.

- Fichier : `components/signals/defect-sign/index.js`
- Production : Modèle GLB produit par un script Blender du dépôt ; le composant le pilote (états, animations, ancres) ; modèle `PRP_DEFECT_CONE_A_v001`
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
| 0 | `fonts` | Les polices | Document de référence, pas de code | Manrope pour les titres, Inter pour l'interface, une police à chasse fixe pour les références. | à faire |
| 1 | `top-bar` | La barre du haut | Élément d'interface HTML (élément personnalisé), conforme à docs/contrat-composant.md, partie interface | Le projet, ce qui t'attend, qui travaille, la fraîcheur des données. | à faire |
| 2 | `side-nav` | La navigation | Élément d'interface HTML (élément personnalisé), conforme à docs/contrat-composant.md, partie interface | Aller à un lieu, un bâtiment, une fiche ou un agent ; la caméra suit. | à faire |
| 3 | `inspector` | L'inspecteur | Élément d'interface HTML (élément personnalisé), conforme à docs/contrat-composant.md, partie interface | La fiche de l'élément choisi : avancement, lots, tâches, blocages, réussites, actions attendues. | à faire |
| 4 | `agent-popup` | La fiche d'un agent | Élément d'interface HTML (élément personnalisé), conforme à docs/contrat-composant.md, partie interface | Au clic sur un personnage : son illustration animée, ce qu'il fait, ce qu'il va faire, ce qu'on peut lui demander. | à faire |
| 5 | `notification-badge` | Le badge de notification | Élément d'interface HTML (élément personnalisé), conforme à docs/contrat-composant.md, partie interface | Compter les alertes, les avertissements, ou montrer que tout est validé. | à faire |
| 6 | `progress-bar` | La barre de progression | Élément d'interface HTML (élément personnalisé), conforme à docs/contrat-composant.md, partie interface | Montrer l'avancement d'une fiche ou d'un lot, avec sa règle de calcul. | à faire |
| 7 | `copy-button` | L'icône de copie | Élément d'interface HTML (élément personnalisé), conforme à docs/contrat-composant.md, partie interface | Copier le nom et l'identifiant d'un élément, pour le coller dans l'outil d'IA. | à faire |
| 8 | `quick-actions` | Les actions rapides | Élément d'interface HTML (élément personnalisé), conforme à docs/contrat-composant.md, partie interface | Copier un petit prompt prêt à l'emploi qui vise l'élément choisi. | à faire |

### Les polices (`fonts`)

Fichiers de police copiés dans le projet avec leur licence (OFL attendue, à vérifier) ; jamais chargés depuis Internet : le panneau fonctionne hors ligne.

- Critères d'acceptation :
  - Licence vérifiée et jointe
  - Aucune requête vers un service de polices

### La barre du haut (`top-bar`)

Nom et logo du projet, nombre de décisions attendues, agents actifs, bloqués, inconnus, heure de la dernière mise à jour.

- Élément : `<gdc-top-bar>`
- Entrées (propriété data) : `project` (nom du projet) ; `decisions` (nombre de décisions attendues) ; `agents` ({ active, blocked, unknown } : nombres) ; `updatedAt` (date ISO de la dernière mise à jour) ; `staleAfter` (secondes avant avertissement de fraîcheur)
- Sorties (événements) : `gdc-select` (clic sur le compteur de décisions ou d'agents ; detail.id = decisions \| agents)
- Critères d'acceptation :
  - Tient sur un téléphone
  - La fraîcheur passe en avertissement au-delà d'un délai

### La navigation (`side-nav`)

Liste groupée avec pastille d'état ; recherche intégrée.

- Élément : `<gdc-side-nav>`
- Entrées (propriété data) : `groups` (liste de { title, items: [{ id, name, state }] }) ; `selected` (identifiant sélectionné)
- Sorties (événements) : `gdc-select` (detail.id = identifiant choisi)
- Critères d'acceptation :
  - Utilisable au clavier
  - Devient une rangée défilante sur téléphone

### L'inspecteur (`inspector`)

Panneau latéral ; tout texte venu du harnais est affiché comme du texte, jamais comme du HTML.

- Élément : `<gdc-inspector>`
- Entrées (propriété data) : `id` (identifiant stable) ; `kind` (nature (fiche, lot, agent, lieu…)) ; `title` (nom affiché) ; `sections` (liste de { title, rows: [{ label, value, state? }] } : progression, lots, tâches, blocages, réussites, actions attendues)
- Sorties (événements) : `gdc-close` (fermeture) ; `gdc-copy` (detail.id, detail.text) ; `gdc-select` (clic sur un élément cité ; detail.id)
- Critères d'acceptation :
  - Aucun contenu injecté comme du code
  - Sections repliables
  - Lisible en clair et en sombre

### La fiche d'un agent (`agent-popup`)

Fenêtre avec l'illustration (lot G7) à gauche et trois colonnes à droite ; actions rapides propres à l'agent.

- Élément : `<gdc-agent-popup>`
- Entrées (propriété data) : `id` (identifiant de l'agent) ; `name` (prénom et rôle) ; `team` (équipe) ; `state` (état (mêmes valeurs que character)) ; `doing` (liste de textes : ce qu'il fait) ; `next` (liste de textes : ce qu'il fera) ; `can` (liste de textes : ce qu'il sait faire) ; `actions` (liste de { label, prompt })
- Sorties (événements) : `gdc-close` (fermeture) ; `gdc-copy` (detail.id, detail.text (prompt copié))
- Critères d'acceptation :
  - Se ferme au clavier
  - Affiche « inconnu » quand le journal ne dit rien

### Le badge de notification (`notification-badge`)

Posé sur une ancre badge ; niveau le plus grave affiché, total en chiffre ; voir docs/signaletique.md.

- Élément : `<gdc-notification-badge>`
- Entrées (propriété data) : `counts` ({ error, waiting, blocked, done } : nombres)
- Sorties (événements) : aucune
- Critères d'acceptation :
  - Couleur, forme et icône pour chaque niveau
  - Masqué à zéro

### La barre de progression (`progress-bar`)

Barre et fraction (« 3 / 7 critères prouvés ») ; la règle au survol.

- Élément : `<gdc-progress-bar>`
- Entrées (propriété data) : `done` (nombre prouvé) ; `total` (nombre attendu) ; `rule` (texte de la règle de calcul) ; `state` (état (couleur))
- Sorties (événements) : aucune
- Critères d'acceptation :
  - Jamais de pourcentage sans sa règle

### L'icône de copie (`copy-button`)

Petite icône à côté de tout élément désignable ; confirmation discrète ; repli si le presse-papiers est refusé.

- Élément : `<gdc-copy-button>`
- Entrées (propriété data) : `id` (identifiant stable) ; `text` (texte à copier)
- Sorties (événements) : `gdc-copy` (detail.id, detail.text, detail.ok (false si le presse-papiers est refusé))
- Critères d'acceptation :
  - Copie l'identifiant stable et le nom
  - Fonctionne au clavier

### Les actions rapides (`quick-actions`)

Liste de boutons fournie par GDC selon le type d'élément ; le texte copié est visible avant la copie.

- Élément : `<gdc-quick-actions>`
- Entrées (propriété data) : `id` (identifiant de l'élément) ; `actions` (liste de { label, prompt })
- Sorties (événements) : `gdc-copy` (detail.id, detail.text)
- Critères d'acceptation :
  - Le prompt cite l'identifiant
  - Ne déclenche jamais rien d'autre qu'une copie

## G7 : Les illustrations et les icônes

Donner un visage aux agents et une icône à chaque étape et chaque lieu.

| Ordre | Identifiant | Nom | Nature | But | Statut |
|---|---|---|---|---|---|
| 1 | `agent-portraits` | Les portraits des agents | Illustration ou icône SVG, animée en CSS si besoin | Un visage par agent, le même sur le panneau, la page de la méthode et les rapports. | à faire |
| 2 | `step-icons` | Les icônes des étapes | Illustration ou icône SVG, animée en CSS si besoin | Une icône pour chacune des dix étapes, de l'idée aux transformations. | à faire |
| 3 | `place-icons` | Les icônes des lieux | Illustration ou icône SVG, animée en CSS si besoin | Une icône par lieu, pour la navigation et les rapports. | à faire |

### Les portraits des agents (`agent-portraits`)

Un portrait pour le client (Pierre-Alain, sans casque) et un par prénom (Claire, Marc, Lina, David, Sarah, Noah, Tom, Paul, Iris, Yves, Victor, Emma, Robin, Julie, Olivier, Anne, Bernard, Fanny, Hélène), rendu depuis le personnage du kit dans un cadrage commun (bible, section 5 : Agent Portrait) ; états idle, talking, working.

- Production : Modèle GLB produit par un script Blender du dépôt ; le composant le pilote (états, animations, ancres)
- Entrées (propriété data) : `name` (prénom (nom du fichier SVG)) ; `state` (idle \| talking \| working (classe CSS))
- Sorties (événements) : aucune
- Critères d'acceptation :
  - Cohérents avec les personnages 3D
  - Reconnaissables en petit (48 pixels)

### Les icônes des étapes (`step-icons`)

Jeu de dix icônes SVG, au trait, de même épaisseur.

- Entrées (propriété data) : `step` (identifiant de l'étape (nom du fichier SVG))
- Sorties (événements) : aucune
- Critères d'acceptation :
  - Lisibles à 20 pixels
  - Une seule couleur, héritée du texte

### Les icônes des lieux (`place-icons`)

Bureau d'architecte, bureau d'études, bureau du client, bureau de contrôle, chantier, parking, réception, bâtiment habité.

- Entrées (propriété data) : `place` (identifiant du lieu (nom du fichier SVG))
- Sorties (événements) : aucune
- Critères d'acceptation :
  - Même famille que les icônes des étapes
