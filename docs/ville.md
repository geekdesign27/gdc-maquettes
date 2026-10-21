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

Une transformation remettra des échafaudages sur un bâtiment habité (état `alteration`, `building` 2.0.0, à venir).

**Les repères** : les numéros 1 à 10 et les passages sont des éléments HTML posés sur des ancres, avec les icônes d'étapes du lot G7 (`step-icons`), jamais du texte dans la 3D. La pastille d'un bâtiment ne montre que son numéro ; le titre et le nom de l'application s'affichent au survol. Chaque étape a son icône, nommée comme dans GDC (`step-icons` 2.0) ; le passage « Feu vert » a la sienne (`feu-vert`).

**Les zones** ont chacune une couleur, celle de l'équipe qui y travaille : bureaux (architecture), chantier (site), réception, clés et garantie (réception), transformations (exploitation). Leur bordure est un marquage peint au sol dans le matériau d'équipe de la palette (`MAT_FABRIC_*`), sous les objets ; la pastille et le nom de la zone prennent cette couleur dans l'interface. Ce ne sont pas des couleurs d'état.

**Le terrain** : `site-ground`, la terre sur le chantier ; le béton sous les bureaux, les conteneurs et les zones fixes ; l'enrobé fait le carrefour et ses quatre branches.

Le placement exact (plan, espacements, caméra) est celui de la scène de référence (`reference-scene`, `src/scene-reference.js` ; `?applications=3` ou `?applications=auditapp` dans la galerie). Un lieu de personnage `batiment:<id>` désigne la parcelle de ce bâtiment.

**À signaler à la session du bâtiment** : `docs/correspondances.md` met encore `excavation` à la première fiche aux plans d'exécution (étape 4). Sur la carte, Pierre-Alain place le terrassement et les fondations à la préparation (étape 5).

**GDC devra suivre** dans son `plan` (ADR 0012 de son dépôt) : les quatre zones, les lieux fixes et une parcelle par application au lieu de la rue. Ce dépôt ne touche pas au dépôt GDC.

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
  Amendement voulu par Pierre-Alain le 21 octobre 2026 : une vie d'ambiance qui naît de l'état envoyé par GDC (`docs/vie-du-chantier.md`, section 1).
- Aucune couleur d'état dans la scène (bible 17.3) ; un état se lit par la forme et l'animation, la couleur reste dans l'interface.
- Une action dont l'élément est inconnu du catalogue est ignorée et signalée, jamais inventée.
