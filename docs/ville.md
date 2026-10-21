# La ville : implantation, chemins et animations

La maquette du panneau est une petite ville où **tout ce qui bouge veut dire quelque chose** (décision de Pierre-Alain du 19 octobre 2026, ADR 0012 de GDC). GDC dit quoi et où ; ce dépôt dit comment.

## Ce que GDC envoie

`gdc scene` rend une scène : `plan` (les quartiers et les parcelles), `elements` (chaque élément, son état, son lieu ou son ancre, sa source) et, avec `--avant`, `actions` (ce qui a changé depuis la scène précédente). Des séquences réelles sont dans `fixtures/` (générées par `scripts/sequences-maquette.mjs` du dépôt GDC) : c'est sur elles qu'on construit et qu'on règle la ville.

## L'implantation : la carte du harnais

**Décision de Pierre-Alain du 21 octobre 2026** (`docs/direction-artistique.md`) : la carte suit le parcours du harnais, comme le plan « Dix étapes » de GDC. Elle remplace l'implantation en une seule rue du 19 octobre. On se sent sur un chantier vu en jeu isométrique, et chaque étape se reconnaît à un lieu ou à un objet de chantier, avec son repère.

Trois quartiers, reliés par de vraies voies de chantier en enrobé :

1. **Les bureaux** (étapes 1 à 3) : l'architecte, le client et sa décision « on continue ? », le bureau d'études (le géomètre y travaille).
2. **Le chantier**, clôturé, avec sa boucle par fonctionnalité (étapes 4 à 7) : les baraques et les conteneurs groupés côte à côte par le long pan, le stockage, les bennes, les bâtiments d'application en cours, le bureau de contrôle et l'aire de réception.
3. **La remise des clés (8), puis le bâtiment habité** (étapes 9 et 10) : le concierge et le carnet des demandes. Un sentier ramène une nouvelle demande au bureau de l'architecte.

| Étape | Ce qu'on voit sur la maquette | Lieu (`id` de GDC) et composants |
|---|---|---|
| 1 L'idée | Claire écrit au bureau de l'architecte | `bureau-architecte` : `architect-office` |
| Passage « on continue ? » | Le client attend à son bureau, le panneau de décision devant | `bureau-client` : `client-office`, `decision-sign` |
| 2 Les plans | Le bureau d'études au travail, Marc le géomètre compris | `bureau-etudes` : `design-office` |
| 3 Le permis (passage) | Les gabarits sur la parcelle du prochain bâtiment, le panneau du permis à l'entrée du chantier | `chantier` : `survey-poles`, `permit-board` |
| 4 Plans d'exécution | Le conducteur de travaux à sa baraque | `baraque` : `site-office`, `site-container` |
| Passage « feu vert » | La fouille s'ouvre | `batiment:<id>` : `building` en `excavation` |
| 5 Préparation | Le stockage de matériaux et le camion qui livre | `chantier` : `material-storage`, `delivery-truck` |
| 6 Construction | La structure monte, la grue lève, les ouvriers, les bennes de tri | `batiment:<id>` : `building` en `structure`, `crane`, `waste-skip` |
| 7 Réception (passage) | Les essais à l'aire de réception, Hélène au bureau de contrôle, le bâtiment en inspection | `aire-reception`, `bureau-controle` : `reception-area`, `control-office`, `building` en `inspection` |
| 8 Remise des clés (passage) | Le portail de sortie du chantier, vers le quartier habité | `site-fence` (portail) |
| 9 Garantie | Le bâtiment habité, le concierge à la porte, le cône d'un défaut | `batiment-habite` : `building` en `completed`, `defect-sign` |
| 10 Transformations | Le carnet des demandes, d'où le sentier repart vers l'architecte | `parking` : `parking` |

**Les repères** : les numéros 1 à 10 et les passages sont des éléments HTML posés sur des ancres, avec les icônes d'étapes du lot G7 (`step-icons`), jamais du texte dans la 3D. Les étapes 5 (préparation) et 9 (garantie) n'ont pas encore d'icône : leur repère porte le numéro et le titre.

**Le terrain** : `site-ground`, la terre partout ; le béton couvre ce qui est fini ou habité et les plateformes des bureaux et des baraques ; l'enrobé fait le circuit ; le sentier du retour est une dalle étroite.

Le placement exact (plan, espacements, caméra) est celui de la scène de référence (`reference-scene`, `src/scene-reference.js`). Un lieu de personnage `batiment:<id>` désigne la parcelle de ce bâtiment.

**GDC devra suivre** dans son `plan` (ADR 0012 de son dépôt) : les trois quartiers et l'ordre des étapes au lieu de la rue. Ce dépôt ne touche pas au dépôt GDC.

**Reporté** : la ville autour du chantier (rues, voitures, voisins).

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

- Aucun mouvement de décor sans action de GDC ; aucune animation d'ambiance qui suggère une activité.
- Aucune couleur d'état dans la scène (bible 17.3) ; un état se lit par la forme et l'animation, la couleur reste dans l'interface.
- Une action dont l'élément est inconnu du catalogue est ignorée et signalée, jamais inventée.
