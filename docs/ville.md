# La ville : implantation, chemins et animations

La maquette du panneau est une petite ville où **tout ce qui bouge veut dire quelque chose** (décision de Pierre-Alain du 19 octobre 2026, ADR 0012 de GDC). GDC dit quoi et où ; ce dépôt dit comment.

## Ce que GDC envoie

`gdc scene` rend une scène : `plan` (les quartiers et les parcelles), `elements` (chaque élément, son état, son lieu ou son ancre, sa source) et, avec `--avant`, `actions` (ce qui a changé depuis la scène précédente). Des séquences réelles sont dans `fixtures/` (générées par `scripts/sequences-maquette.mjs` du dépôt GDC) : c'est sur elles qu'on construit et qu'on règle la ville.

## L'implantation : la carte du harnais

**Décisions de Pierre-Alain du 21 octobre 2026** (`docs/direction-artistique.md`) : la carte suit le parcours du harnais, comme le plan « Dix étapes » de GDC. Elle remplace l'implantation en une seule rue du 19 octobre. On se sent sur un chantier vu en jeu isométrique, et chaque étape se reconnaît à un lieu ou à un objet de chantier, avec son repère.

**Quatre zones autour d'un carrefour**, parcourues dans l'ordre et reliées par des voies de chantier en enrobé : les bureaux, le chantier clôturé, la réception, la remise des clés et la garantie, puis les transformations, d'où la route ramène à l'architecte. Le cycle recommence.

**Les lieux des étapes sont fixes et toujours visibles** :

| Étape | Lieu sur la maquette | Composants |
|---|---|---|
| 1 L'idée | Le bureau de l'architecte, où arrive la route du retour | `architect-office` |
| Passage « on continue ? » | Le panneau de décision, à côté du bureau du client | `client-office`, `decision-sign` |
| 2 Les plans | Le bureau d'études ; Marc, le géomètre, y travaille | `design-office` |
| 3 Le permis (passage) | Le panneau du permis, sur le passage du bureau d'études vers le chantier : on le consulte avant les plans d'exécution | `permit-board` |
| 4 Plans d'exécution | Les conteneurs des experts dans le chantier : la baraque du conducteur et le bureau de contrôle | `site-office`, `control-office` |
| Passage « feu vert » | Le panneau de décision, entre les experts et les parcelles | `decision-sign` |
| 7 Réception (passage) | L'aire de réception | `reception-area` |
| 8 Remise des clés (passage) | Un conteneur, à droite de la réception | `site-container` |
| 9 Garantie | Un conteneur, à droite de la remise des clés ; le concierge | `site-container` |
| 10 Transformations | Un conteneur, à côté du carnet des demandes ; la route repart vers l'architecte | `site-container`, `parking` |

**Les bâtiments : un par application du projet** (une webapp desktop, une application terrain et une webapp d'administration font trois bâtiments sur le même chantier). Le chantier s'agrandit d'une parcelle par application. Chaque bâtiment vit les étapes 3, 5 et 6 à son rythme, et ils ne sont pas tous à la même étape :

| Phase du bâtiment | Ce qu'on voit | Sa pastille |
|---|---|---|
| Permis accordé | Les gabarits sur la parcelle | 3 |
| Préparation | Le terrassement (la pelle), puis les fondations | 5 |
| Construction | La structure et ses échafaudages, la grue ; puis les murs faits, échafaudages autour ; puis le second œuvre | 6 |
| Réception | Le bâtiment en inspection | 7 |
| Terminé, habité | Sans échafaudage, dans ses couleurs | 9 |

**Les parcelles 5 à 8 : une deuxième rangée** (décision de Pierre-Alain du 22 octobre 2026, séquence `volume` : 8 applications et 100 fiches). Les parcelles se suivent de gauche à droite le long de l'allée, chacune à la largeur de son socle (12 m une maison, 15 m un immeuble, 18 m une halle), 2 m entre deux socles. Au-delà de quatre applications, la cinquième ouvre une deuxième rangée sous l'allée, qui repart du même bord gauche : ses socles vont de z 53,5 à 65,5, après la bande des bennes, du stock et des camions de la première rangée ; elle a sa propre allée devant ses portes (z 67,3), reliée à l'entrée du chantier et à l'allée du haut par la droite, et la place de ses camions devant elle (z 70). Le chantier s'approfondit de 18 m (son bord avant passe de z 54,5 à 72,5) ; le portail d'entrée ne bouge pas, la clôture continue au-delà. Le terrain garde sa largeur, celle de la plus longue rangée (106 m pour quatre immeubles et quatre maisons, sous les 120 m de `site-ground`) ; aucun composant ne change. Les projecteurs entre deux parcelles, au fond, restent ceux de la première rangée.

**Les décisions attendues au même lieu** (décision de Pierre-Alain du 22 octobre 2026) : une grille compacte de trois panneaux par rang, un panneau et un badge par décision, six panneaux au plus. Au-delà, les décisions suivantes ne posent pas de panneau : le sixième porte dans son badge les décisions qu'il regroupe, la sienne et celles qui n'ont pas de panneau, écrites « +12 » pour 17 décisions : les badges additionnés font le total (décision de Pierre-Alain du 23 octobre 2026, après la revue DA : « 17 » à côté de cinq « 1 » se lisait 22). `panneaux()` de la carte dit, pour chaque panneau montré, ce que porte son badge, et `reste` désigne ce sixième panneau. Chaque panneau montré reste cliquable. Au feu vert, la grille suit la bande entre le chemin des experts et la première parcelle : trois panneaux le long d'elle, le second rang à 0,85 m vers la parcelle (vers la plateforme, il serait sur le chemin des experts) et décalé de 0,2 m, pour que, vu de la caméra, ses panneaux tombent entre ceux du premier rang. Les agents qui attendent à un panneau se tiennent derrière lui, vus de la caméra, et le regardent : devant, ils le cachaient et volaient son clic.

Une transformation surélève un bâtiment habité : il gagne un étage en haut, seul en chantier, avec un petit échafaudage et des cônes de balisage ; le bas reste habité (`building` 2.0.0, lot G8). L'état `alteration` est abandonné (décision de Pierre-Alain du 21 octobre 2026).

**Les repères** : les numéros 1 à 10 et les passages sont des éléments HTML posés sur des ancres, avec les icônes d'étapes du lot G7 (`step-icons`), jamais du texte dans la 3D. La pastille d'un bâtiment ne montre que son numéro ; le titre et le nom de l'application s'affichent au survol. Chaque étape a son icône, nommée comme dans GDC (`step-icons` 2.0) ; le passage « Feu vert » a la sienne (`feu-vert`).

**Les zones** ont chacune une couleur, celle de l'équipe qui y travaille : bureaux (architecture), chantier (site), réception, clés et garantie (réception), transformations (exploitation). Leur bordure est un marquage peint au sol dans le matériau d'équipe de la palette (`MAT_FABRIC_*`), sous les objets ; la pastille et le nom de la zone prennent cette couleur dans l'interface. Ce ne sont pas des couleurs d'état.

**Le terrain** : `site-ground`, la terre sur le chantier ; le béton sous les bureaux, les conteneurs et les zones fixes ; l'enrobé fait le carrefour et ses quatre branches.

Le placement exact (plan, espacements, caméra) est celui de la scène de référence (`reference-scene`, `src/scene-reference.js` ; `?applications=3` ou `?applications=auditapp` dans la galerie). Un lieu de personnage `batiment:<id>` désigne la parcelle de ce bâtiment.

**GDC devra suivre** dans son `plan` (ADR 0012 de son dépôt) : les quatre zones, les lieux fixes et une parcelle par application au lieu de la rue. Ce dépôt ne touche pas au dépôt GDC.

**La ville autour** : d'abord reportée, puis demandée en ambiance par Pierre-Alain le 21 octobre 2026 : deux ou trois voitures (`city-car`) et quelques badauds en tenue de ville, toujours hors des zones et du chantier (lot G8).

## Les chemins

- Un personnage qui se déplace (`action: deplace`) marche **le long des voies de chantier**, du lieu `de` au lieu `vers`, puis entre par la porte du lieu ; il ne coupe jamais à travers une parcelle qui n'est pas la sienne.
- Sur le chantier, on entre par l'accès de la clôture ; **le client ne traverse jamais le chantier en cours** (il n'a pas de casque, OTConst art. 6) : il reste à son bureau ou va à l'aire de réception.
- Les engins suivent les voies : le camion de livraison (`delivery-truck`) arrive par la voie jusqu'à la parcelle, la grue (`crane`) reste sur sa parcelle.
- Durée d'une marche : proportionnelle à la distance, plafonnée (quelques secondes) pour que l'action ne retarde jamais la lecture de l'état.

## Les actions et leurs animations

| Action GDC | Animation |
|---|---|
| `apparait` d'un personnage | Il sort de la porte de son lieu (pas d'apparition en l'air) |
| `deplace` | `walk` le long du chemin, puis l'état reçu |
| `change` d'état d'un personnage | L'animation du nouvel état (`docs/correspondances.md`) ; `celebrate` une fois quand il a fini, puis `idle` |
| `change` d'état d'un bâtiment | Transition visible d'un état à l'autre (échafaudage qui monte, toiture posée) |
| `apparait` d'un panneau (`decision-sign`, `permit-board`, `blocked-sign`, `defect-sign`) | Une impulsion à l'apparition, puis fixe (rien ne clignote en continu) |
| `change` du bureau de contrôle vers `active` | Une impulsion ; Hélène `inspect` |
| `quantite` du parking | Une caisse arrive par la voie, ou repart |
| `apparait` de la grue (`lifting`) | La grue lève une charge vers le bâtiment |
| `disparait` | L'élément s'efface en douceur, ou le personnage rentre par la porte de son lieu |

## Les interdits

- Aucun mouvement de décor sans action de GDC. **La vie du chantier naît de l'état envoyé par GDC et s'éteint avec lui** : le régime du chantier, la phase de chaque bâtiment, les agents présents sur chaque parcelle. Elle n'ajoute aucun fait. Elle ne porte aucune couleur d'état, aucun badge, et ne s'ouvre pas au clic. Sans projet en cours, rien ne bouge. (Amendement voulu par Pierre-Alain le 21 octobre 2026, `docs/vie-du-chantier.md`, section 1 ; reporté ici avec la carte vivante.)
- Aucune couleur d'état dans la scène (bible 17.3) ; un état se lit par la forme et l'animation, la couleur reste dans l'interface.
- Une action dont l'élément est inconnu du catalogue est ignorée et signalée, jamais inventée.

## La carte vivante, livrée à GDC (`src/ville/`, fiche `city-map`)

La bibliothèque (`npm run build`) exporte `ville`. Three.js, le chargeur des modèles et les composants sont injectés, comme pour un composant ; rien n'est chargé d'ailleurs.

```js
import * as THREE from 'three';
import { components, chargeur, ville } from './maquettes.js';
const carte = await ville.creeCarte(THREE, {
  components,                                   // les composants 3D de la bibliothèque, par identifiant
  chargeur: chargeur({ GLTFLoader, SkeletonUtils }),
  theme: 'light', quality: 'high', reducedMotion: false,
  graine: 'gdc',                                // la même scène donne toujours les mêmes ouvriers
  lumieres: { ciel, soleil, scene },             // facultatif : la carte règle la lumière et le fond sur l'heure
  // heure: 'nuit',                              // facultatif : un moment fixe pour les revues ; absent, l'heure du poste
  // maintenant: () => Date.now(),                // facultatif : l'horloge (les essais)
});
scene.add(carte.root);
await carte.applique(sceneDeGdc);               // gdc scene --avant : plan, elements, actions
// à chaque image : if (carte.update(dt)) redessiner
```

| Méthode | Ce qu'elle fait |
|---|---|
| `applique(scene, { actions })` | La première scène se pose telle quelle. Les suivantes jouent leurs actions par instant (même `ts`), dans l'ordre, puis l'état reçu a le dernier mot. Une scène qui arrive pendant la lecture de la précédente la termine net. `actions: false` pose la scène sans jouer ses actions (un saut). |
| `update(dt)` | Avance les marches, la vie, les fondus ; rend `true` s'il faut redessiner. |
| `reperes()`, `anchor(nom)`, `repere(nom)` | Les repères HTML : `etape:1` à `etape:10` (sauf 5 et 6, portés par les bâtiments), `passage:continue`, `passage:feu-vert`, `batiment:<id>`. `repere` dit le numéro, le titre, l'icône, la zone, `pastille`, `passage`, et `attenue` (sa zone n'a jamais été activée). |
| `cadres()` | Les quatre zones au sol, leurs coins, leur couleur d'interface et `activee`. |
| `cible(objet)` | L'élément de GDC sous un objet touché (`{ element, id, ref, ancre }`), pour le clic ; `ancre` : le bâtiment ou le lieu où GDC l'a posé (les gabarits d'un bâtiment en plot valent ce bâtiment : la galerie ouvre l'étage de leur fiche). `null` pour le décor, les ouvriers et les usagers. Le terrain et le voile des zones grises ne se désignent pas : un rayon les traverse, jusqu'à la parcelle creusée d'un bâtiment en fouille ou en fondations, qu'ils recouvrent. |
| `designe(objets)` | Parmi les objets touchés par un rayon (du plus proche au plus loin, visibles), le premier qui désigne un élément de GDC ou une pièce de la coupe, sinon `null` : à passer à `cible` et `refSous`. Un ouvrier, un usager ou le décor posés devant un bâtiment ne le cachent pas au clic. |
| `refSous(objet)`, `surligne(ref)` | Le survol partagé côté carte : la référence du bâtiment, de l'étage ou de la pièce survolée ; l'anneau `selection-ring` (`hover`) sur ce qui correspond à une référence reçue. |
| `ouvreCoupe(id, fiche)`, `fermeCoupe()`, `vueCoupe` | La vue en coupe d'un étage (`building-interior` 2.0.0) : `fiche`, l'étage cliqué (`refSous(objet).fiche`) ou choisi au sélecteur d'étages ; sans fiche (le rez regroupé, l'existant, le bâtiment), l'étage en chantier le plus haut, sinon le dernier. Une pièce par lot, son aspect tiré de la phase du lot (`roomsFromPieces`, `src/etages.js`) ; les agents de l'étage à la pièce de leur lot, ceux sans pièce sur le palier, devant ; le bâtiment, ses engins et les agents des autres étages s'effacent le temps de la vue. Survolée, une pièce vaut son lot. `vueCoupe` : l'étage ouvert, ses pièces et la place de chaque agent (`room:n` ou `palier`). Décisions de Pierre-Alain du 22 octobre 2026. |
| `heure`, `regleHeure(h)`, `horaire()`, `recette()` | L'heure réelle (fiche `day-night`) : la carte lit l'heure du poste, sans réseau, et suit le soleil de Fribourg (`ville.soleilDe`, `ville.momentDe`) ; l'aube et le crépuscule durent 30 minutes, centrés sur le lever et le coucher. `heure` dit `{ moment, jour }` (`jour` de 0, la nuit, à 1, le jour). Avec l'option `lumieres` (la `HemisphereLight`, la `DirectionalLight` et la scène de la page), la carte règle le ciel, le soleil ou la lune et le fond ; sinon la page les règle avec `ville.regleLumieres(lumieres, carte.recette())`, par exemple à chaque `update` qui rend `true` (c'est sans coût). `heure.moment` est celui de la lumière posée (il change avec elle, au pas de 20 secondes) ; un moment fixé entre 0 et 1 se dit `aube`. La nuit, la carte éclaire les vitres sur des copies des matériaux : faiblement les bureaux et les étages habités, franchement un bureau actif ou occupé, l'étage `occupied` d'un bâtiment et un conteneur où se trouve un agent ; une zone jamais activée reste éteinte. Le bureau de contrôle (`control-office`) n'a pas de vitre : il ne s'éclaire pas, son activité se lit à Hélène et à son impulsion (décision de Pierre-Alain du 22 octobre 2026). L'heure est relue toutes les 20 secondes, et `update` ne demande de redessiner que quand la lumière change. `regleHeure('jour' \| 'aube' \| 'nuit' \| 0 à 1)` fixe le moment que l'utilisateur choisit (le sélecteur `time-of-day`, pour plus de clarté) : le choix retombe de lui-même au prochain passage (le début ou la fin de l'aube ou du crépuscule), puis la carte reprend l'heure réelle (décision de Pierre-Alain du 22 octobre 2026) ; `regleHeure(null)` y revient tout de suite, et un moment inconnu aussi (il est signalé) ; `{ garde: true }`, ou l'option `heure` à la création, fixe un moment sans fin, pour les revues. `horaire()` donne au sélecteur `{ mode, moment, jour, maintenant, lever, coucher, prochain: { instant, moment }, fin }` : `mode` vaut `auto` ou le moment choisi, `fin` l'instant où le choix retombe ; GDC le relit à chaque `update` qui rend `true`, et au moins une fois par minute pour l'heure affichée. Valeurs : `src/lumiere.json`. |
| `signalements` | Ce que la carte a ignoré : élément ou action hors catalogue, lieu inconnu, personne inconnue d'`equipe.json`. |
| `compte()`, `regime`, `applications` | Ce que la carte montre, pour un compte rendu. |

`ville.creeChemins(implantation(n).voies).chemin(de, vers, { client })` rend le chemin de porte à porte (`points`, `longueur`, `duree`), sans Three.js : un lieu de GDC, un point des voies (`allee:2`, la porte de la deuxième parcelle) ou un point du sol. La marche va à 1,4 m/s, plafonnée à 5 s.

**Ce que la carte fait des actions** : `apparait` (un agent sort de la porte de son lieu ; un objet arrive d'une impulsion), `deplace` (de porte à porte par les voies, puis son poste et son état), `change`, `quantite`, `disparait` (l'agent rentre par sa porte ; l'objet s'efface), `ouverture`, `pause`, `fermeture` (le régime). Les actions proposées à GDC (`consulte`, `controle`, `question`, `reunion`, `remise`, `demande`, `docs/demandes-a-gdc.md`) sont lues si elles arrivent : les agents nommés (`id`, `participants`) vont au lieu (`vers`, `lieu`, `aupres`, `batiment` ; la cabane des clés pour `remise`).

**Retours de Pierre-Alain du 22 octobre 2026** :
- une zone jamais activée est en niveaux de gris **lavés vers le fond**, et un voile du fond couvre son sol (la terre du chantier, l'enrobe) ; le voile s'efface avec le fondu de la couleur ;
- personne ne se pose sur un autre : agents, ouvriers et usagers retiennent leur place, et une place prise fait tourner autour d'elle (0,75 m au moins entre deux personnes au même niveau) ;
- le camion de livraison arrive par la voie verticale et le portail jusqu'à sa place sur la parcelle, benne baissée (`idle`) : il ne la lève (`arriving`) qu'une fois garé ; il prend les angles en arc, accélère au départ et ralentit avant l'arrêt ; pour repartir, il baisse sa benne, recule en biais hors de sa place, puis reprend la voie en avant. Sans animation, il est posé à sa place. Pas de roues qui tournent : rouler en `idle` et vider à l'arrêt suffit (décision de Pierre-Alain du 22 octobre 2026), `delivery-truck` reste en 1.0 ;
- la grue est montée sur sa parcelle pendant le gros œuvre (`structure`, `envelope`, au repos) et quand GDC la pose (`lifting`, la fusion vers dev) ; elle se monte et se démonte en 1,5 s, avec le bâtiment qui entre dans le gros œuvre ou en sort. C'est une lecture de la phase, comme les échafaudages : elle ne lève que sur l'action de GDC.

**Les postes des agents** : à un bureau, le poste `desk:n` (puis `crew:n` à la baraque), dans l'ordre de la scène ; à une cabane, devant son entrée ; à un panneau, en arc devant lui ; sur une parcelle, la pièce de son lot ou l'étage de sa fiche (`building` 2.0.0), sinon au pied du bâtiment.

**Les ouvriers et les usagers** (`character` 1.2.0) : l'ouvrier est le métier `worker` (bleu de travail graphite, gilet jaune fluo, casque gris), qui porte (`carry`) du stock à son poste ou vers la benne ; l'usager est le métier `civilian`, dans un des trois coloris de ville (`outfitColor` a, b, c, selon son rang). La nuit (le jour sous 0,5, comme les projecteurs), la carte allume la lampe frontale (`setState(état, { headlamp })`) de toute personne casquée qui est dehors, et l'éteint à son poste dans un bureau. **Le portail** (`site-fence` 1.1.0) : fermé en régime fermé et en pause, ouvert en régime ouvert ; joué (une ouverture, une pause, une fermeture de GDC), il tourne en 1,5 seconde, une fois ; posé tel quel (une scène reçue), il est d'emblée à sa place. **Le cabanon de la fête** (`party-shed`) : au fond à droite de la zone des transformations, l'avant vers la voie qui descend du carrefour ; en couleur même quand la zone est encore grise. En pause, il est en fête et les ouvriers s'y rassemblent : joués, ils y vont au pas, sans le plafond de cinq secondes d'une marche, et le portail ne se ferme qu'une fois qu'ils sont passés ; posés tels quels, ils y sont déjà. **Les remplaçants, en attendant leurs fiches** : aucune voiture avant `city-car`.

