# Le planning du chantier : réponse de l'atelier à GDC

De l'atelier des maquettes, le 22 octobre 2026. Ce fichier répond à « Le planning du chantier : réponse de GDC à l'atelier des maquettes » (l'architecte de GDC, même jour, copiée dans `docs/planning-reponse-de-gdc.md`). Il remplace, pour le planning, les sections « Le planning » de `docs/reflexion-panneau-planning.md`. Ce qui est décidé l'est par Pierre-Alain ; le reste est proposé.

Les réponses s'appuient sur ce qui est livré dans l'atelier à cette date : le survol partagé (`src/survol.js`, `hover-link`), `building` 2.0.0, `building-interior` 2.0.0, `floor-selector`, `trigger-feed`, `side-nav` 2.0.0, `day-night` et `time-of-day`.

## 1. Les décisions de Pierre-Alain : pris en compte

| Décision | Ce que l'atelier en fait |
|---|---|
| Un Gantt complet, le futur en enchaînement direct sans date | Une étape à venir est un contour, sans date, d'une largeur fixe (I2). Quand elle se réalise, sa vraie date la remplace. |
| Les jours vides se replient | Un jour vide devient une colonne étroite ; plusieurs jours vides de suite font un seul pli (« 12 jours sans activité »), qui se déplie au clic. Le mot « abandonné » n'apparaît jamais. Cela remplace mon seuil de deux jours. |
| Le rejeu en seconde version | Rien dans la première version ne suppose le rejeu, mais chaque composant s'y prépare (B3). |
| Le Gantt par étapes | Les lignes du haut sont les dix étapes ; puis application, fiche, lot (section 2 de GDC). Cela remplace ma proposition « une ligne par application ». |
| Les panneaux intervertis et repliables | L'arbre à gauche, le fil à droite, le planning en bas. La galerie l'imite ; la disposition reste au panneau de GDC (chantier C6). |

## 2. Réponses aux questions de GDC

### Interface

**I1. Suivre une fiche d'étape en étape.** Pas de liaison permanente : avec dix fiches en cours, des traits entre les barres deviendraient un écheveau. Au survol ou à la sélection d'une barre, toutes les barres de la même fiche s'éclairent (elles ont la même `ref`, le survol partagé les trouve déjà), et un trait fin relie, à ce moment-là seulement, la fin d'une barre au début de la suivante. Pour que l'escalier reste lisible, seules les étapes en cours sont ouvertes au démarrage ; les autres montrent leur barre résumée.

**I2. La largeur d'une étape à venir.** Deux jours actifs, la même pour toutes. Un seul jour est trop étroit : l'icône de l'étape (`step-icons` 2.0) n'est lisible qu'à partir de 20 px, et il faut la place du contour autour. Ordre de grandeur sur un portable de 13 pouces : un jour actif de 24 px, une étape à venir de 48 px.

**I3. Le volume.** À hauteur réduite, quatre lignes : l'en-tête des jours et les trois premières lignes ouvertes, centrées sur l'étape en cours (I5). Pour 100 fiches et 10 lots par fiche, oui : on ne dessine que les lignes visibles (liste virtuelle), et les traits se regroupent par jour dès qu'un jour devient trop étroit (D1).

**I4. Les panneaux fermés.** Même avis que toi : le rail fin. Une décision qui attend Pierre-Alain doit rester visible, panneau fermé ou non ; le rail garde les badges de `notification-badge` et les signes de `src/signes.js`. **C'est à Pierre-Alain de trancher.**

**I5. Le panneau du bas au démarrage.** D'accord : ouvert à hauteur réduite, centré sur l'étape en cours. **À confirmer par Pierre-Alain.**

**I6. Les identifiants.** Tes identifiants conviennent, comme identifiants opaques (`id`). Ce qui relie les éléments entre eux, c'est la `ref` `{ application, fiche?, lot? }`, et rien d'autre :
- le suffixe `@<n>` reste dans l'`id`, jamais dans la `ref` : toutes les barres d'une fiche partagent la même `ref`, et c'est ce qui les éclaire ensemble ;
- une ligne d'étape (`etape:6`) n'a pas de `ref` : la survoler n'éclaire rien sur la carte ; la choisir émet `gdc-select` avec `{ id: "etape:6", etape: 6 }`, et GDC peut centrer la carte sur la zone de cette étape (`plan.zones`) ;
- un événement : `gdc-select` porte `{ id, ref, evt }`, où `evt` est ton `evt:<id>`. Le fil (`trigger-feed`) devra lire le `cause` que les actions de la scène porteront en 0.20, pour défiler jusqu'au même fait : c'est une nouvelle version du fil (section 3).
- Aujourd'hui, `gdc-select` porte `{ id, ref }` sur l'arbre, mais `{ id, building }` sur le sélecteur d'étages : l'atelier aligne le sélecteur (`{ id, ref, building }`), en nouvelle version.

**I7. La couleur.** Deux cas seulement, tous deux dans la signalétique existante (`docs/signaletique.md`) :
- l'élément en cours porte son signe d'état, quel qu'il soit (actif, bloqué, en erreur…) ;
- une décision qui attend Pierre-Alain porte le signe « Attend ta décision » : rouge de signalisation, panneau rectangulaire, point d'exclamation blanc. C'est le même signe que le badge du bureau du client, pas un nouveau rouge.

Une décision déjà prise est un jalon neutre, sans couleur. Le reste du planning reste dans les tons neutres.

**I8. Le clavier et la caméra.** Aujourd'hui, choisir un élément ne déplace pas encore la caméra : c'est à brancher dans la carte (`city-map`). Quand ce sera fait : avec « moins d'animation », la caméra saute à sa place, sans mouvement. Sans cette préférence, un déplacement court, interrompu dès qu'on choisit autre chose.

### 3D et Blender

**B1. Avant le rejeu.** Confirmé : choisir une barre passée ne change que la sélection. La carte reste « maintenant ».

**B2. L'étage et la pièce.** C'est déjà livré, avec une correction de nom :
- `building` 2.0.0 a les ancres `floor:<n>` et `room:<n>-<m>` (étage n, pièce m), et non `room:<n>` ;
- `building-interior` 2.0.0 a l'ancre `room:<n>` (la pièce n de l'étage ouvert) ;
- `src/etages.js` donne déjà l'ancre la plus précise pour une `ref` : `room:n-m` pour un lot, `floor:n` pour une fiche. GDC n'a donc qu'à passer la `ref`, et l'atelier trouve l'étage et la pièce, avec la même règle des six étages que le bâtiment.

Une pièce choisie ne demande pas de nouvel état : l'anneau de sélection (`selection-ring`, états hover et selected) se pose sur son ancre.

**B3. Le rejeu, plus tard.** Pas encore mesuré : la reconstruction complète de la scène d'AuditApp sera chronométrée dans la galerie, sur le portable de référence, avant la seconde version. Les cibles que je propose :
- passer d'une date à une autre applique la différence entre deux scènes, pas une reconstruction : moins de 100 ms par pas ;
- une reconstruction complète : moins d'une seconde ;
- chaque composant accepte un changement d'état sans transition (une option `instant`), en plus de la préférence « moins d'animation ».

**B4. Les matériaux et la fluidité.** Le constat est juste : chaque modèle apporte ses propres copies des matériaux de la palette. Le plan, à faire avant les ouvriers, les badauds et les voitures :
1. un registre commun des matériaux : à l'ouverture d'un modèle, un `MAT_…` déjà connu est remplacé par le même objet partagé. La bibliothèque de la bible compte une trentaine de matériaux : c'est la cible, plus les teintes des personnages ;
2. des instances pour les petits objets répétés : cônes, palettes, panneaux de clôture, voitures, badauds ;
3. la qualité basse, déjà en place, et les plafonds de la vie d'ambiance (`docs/vie-du-chantier.md`) ;
4. une mesure avant chaque nouvel élément : appels de dessin, matériaux, triangles, images par seconde sur le portable de référence, processeur ralenti.

**B5. La nuit et le planning.** Confirmé : la lumière suit l'heure réelle, ou le moment forcé par `time-of-day`, jamais le planning, tant que le rejeu n'existe pas.

### Déclencheurs et données

**D1. Les traits.** Les deux : envoie chaque événement, avec `jours` en plus. L'atelier dessine un trait par événement quand on zoome, et le compte par jour dès qu'un jour devient trop étroit pour séparer les traits.

**D2. Le rafraîchissement.** Oui : la galerie joue déjà les séquences de `fixtures/` scène après scène. Il faut, pour chaque pas d'une séquence, la chronologie correspondante, ou la chronologie complète plus la réponse de `--depuis` à chaque pas. L'atelier construit sur ces séquences réelles, pas sur l'exemple de la section 3.

**D3. Le tableau des déclencheurs.** Il manque à mon avis :
- **la clôture d'un défaut** (étape 9) : ta réponse dit « de son ouverture à sa clôture », mais le tableau n'a que `incident` à l'ouverture ;
- **le permis périmé** : son jalon change de forme à l'étape 3, comme le panneau du permis sur la carte ;
- **une fiche abandonnée** : sa barre se termine, avec une fin distincte d'une fin normale ;
- **une décision refusée**, si le harnais en connaît : son jalon, pris, mais en refus.

Je ne veux pas voir `activite`, comme tu le proposes. `dependance` reste un trait, mais il se fond dans le compte du jour dès que le jour est étroit.

**D4. Les pièces du dossier.** Sans barre. Chaque pièce montre son état actuel ; la date git apparaît comme un simple repère pointillé, marqué « d'après git » au survol et dans la vue tableau. On ne mélange jamais une date exacte du journal et une date approchée sous la même forme.

## 3. Ce que l'atelier va fabriquer

Dans l'ordre, chaque élément dans sa session, avec contrôle, galerie et validation de Pierre-Alain comme d'habitude.

| # | Élément | Quand | Ce qui change |
|---|---|---|---|
| 1 | La fiche `site-schedule`, le planning du chantier | Tout de suite, à valider par Pierre-Alain | Nouvelle fiche au catalogue, sur le contrat de la section 3 de GDC et les réponses ci-dessus |
| 2 | Les panneaux dans la galerie | Tout de suite | Arbre à gauche, fil à droite, planning en bas, poignées et rail imités ; aucun composant livré ne change, sauf si une vérification le demande |
| 3 | `floor-selector` 1.1.0 | Tout de suite | `gdc-select` porte aussi la `ref` |
| 4 | Le registre des matériaux et les instances | Avant les ouvriers (`character-kit` v003) | Fluidité mesurée avant et après |
| 5 | `trigger-feed` 1.1.0 | Quand GDC 0.20 livre `cause` | Le fil défile jusqu'au fait choisi ailleurs, et l'inverse |
| 6 | `site-schedule`, la fabrication | Quand GDC 0.20 livre les séquences de `gdc chronologie` | Le planning, branché au survol, à la sélection et au fil |
| 7 | La caméra qui suit la sélection | Avec `city-map` | Saut sans mouvement si « moins d'animation » |
| 8 | Le changement d'état instantané et le rejeu | Seconde version | Option `instant` dans chaque composant, mesures de B3 |

Le reste du lot G8 continue en parallèle, dans son ordre : le projecteur, le personnage (ouvrier, tenue de ville, lampe frontale), le portail fermé, le cabanon et les voitures.

## 4. Questions encore ouvertes

**Pour Pierre-Alain**
1. Un panneau fermé : rail fin avec ses badges (recommandé par GDC et l'atelier), ou caché avec un onglet ?
2. Le panneau du bas au démarrage : ouvert à hauteur réduite, centré sur l'étape en cours (recommandé des deux côtés) ?
3. La largeur d'une étape à venir : deux jours actifs (recommandé), ou un seul comme le propose GDC ?

**Pour GDC**
1. Les séquences de `gdc chronologie` pas à pas, alignées sur celles de `gdc scene` (D2).
2. Les événements manquants de D3 : clôture d'un défaut, permis périmé, fiche abandonnée, décision refusée.
3. `gdc-select` sur une ligne d'étape porte `{ id, etape }` : confirmes-tu que le panneau centre la carte sur la zone de l'étape ?
4. Le `cause` des actions de la scène et les `evt:<id>` de la chronologie sont-ils exactement les mêmes chaînes ?
