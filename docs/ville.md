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

**Les remplaçants, en attendant leurs fiches** : l'ouvrier est la tenue du chef d'équipe recolorée par la carte (casque gris #8E959C, gilet jaune fluo #D7EC23), l'usager la tenue de ville du client recolorée en trois coloris provisoires (`ville.REMPLACANTS`), jusqu'à `character` 1.2.0 ; le portail reste ouvert jusqu'à `site-fence` 1.1.0 ; en pause, les ouvriers se rassemblent près de la baraque, là où viendra le cabanon `party-shed` ; aucune voiture avant `city-car`.

