# La ville : implantation, chemins et animations

La maquette du panneau est une petite ville où **tout ce qui bouge veut dire quelque chose** (décision de Pierre-Alain du 19 octobre 2026, ADR 0012 de GDC). GDC dit quoi et où ; ce dépôt dit comment.

## Ce que GDC envoie

`gdc scene` rend une scène : `plan` (la rue et les parcelles), `elements` (chaque élément, son état, son lieu ou son ancre, sa source) et, avec `--avant`, `actions` (ce qui a changé depuis la scène précédente). Des séquences réelles sont dans `fixtures/` (générées par `scripts/sequences-maquette.mjs` du dépôt GDC) : c'est sur elles qu'on construit et qu'on règle la ville.

## L'implantation

Une **rue** traverse la ville. Le long de la rue, dans l'ordre du parcours (atelier 3, bible 17.2) :

| Ordre | Lieu (`id`) | Composant |
|---|---|---|
| 1 | `bureau-architecte` | `architect-office` |
| 2 | `bureau-etudes` | `design-office` |
| 3 | `bureau-client` | `client-office` |
| 4 | `bureau-controle` | `control-office` |
| 5 | `baraque` | `site-office` |
| 6 | `chantier` : une parcelle par application (`plan.parcelles`), clôturée (`site-fence`), le panneau du permis à son entrée | `building` par parcelle |
| 7 | `parking` | `parking` |
| 8 | `aire-reception` | `reception-area` |

Un lieu de personnage `batiment:<id>` désigne la parcelle de ce bâtiment. Le placement exact (espacements, angle de la rue, caméra) est un choix de ce dépôt, dans la scène de référence (`reference-scene`).

## Les chemins

- Un personnage qui se déplace (`action: deplace`) marche **le long de la rue**, du lieu `de` au lieu `vers`, puis entre par la porte du lieu ; il ne coupe jamais à travers une parcelle qui n'est pas la sienne.
- Sur le chantier, on entre par l'accès de la clôture ; **le client ne traverse jamais le chantier en cours** (il n'a pas de casque, OTConst art. 6) : il reste à son bureau ou va à l'aire de réception.
- Les engins suivent la rue : le camion de livraison (`delivery-truck`) arrive par la rue jusqu'à la parcelle, la grue (`crane`) reste sur sa parcelle.
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
| `quantite` du parking | Une caisse arrive par la rue, ou repart |
| `apparait` de la grue (`lifting`) | La grue lève une charge vers le bâtiment |
| `disparait` | L'élément s'efface en douceur, ou le personnage rentre par la porte de son lieu |

## Les interdits

- Aucun mouvement de décor sans action de GDC ; aucune animation d'ambiance qui suggère une activité.
- Aucune couleur d'état dans la scène (bible 17.3) ; un état se lit par la forme et l'animation, la couleur reste dans l'interface.
- Une action dont l'élément est inconnu du catalogue est ignorée et signalée, jamais inventée.
