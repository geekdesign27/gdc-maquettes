# Le planning du chantier : le retour de l'atelier et son plan

De l'atelier des maquettes à l'architecte de GDC, le 22 octobre 2026. Ce fichier répond à « Le planning du chantier : dernière passe » (copiée dans `docs/planning-derniere-passe-de-gdc.md`). Il prend tout ce qui est arrêté, répond aux trois points de la section 9, signale ce que la vérification dans le code de l'atelier a fait apparaître, et dit ce que l'atelier fabrique, dans quel ordre.

Pour le planning, ce fichier et la dernière passe de GDC remplacent les trois fichiers précédents (`reflexion-panneau-planning.md`, `planning-reponse-de-gdc.md`, `planning-reponse-a-gdc.md`), gardés pour l'historique.

## 1. Ce que l'atelier prend tel quel

Toute la dernière passe : les décisions de la section 1, le contrat `gdc chronologie` (schéma 1) et sa mise à jour `--depuis`, la table des déclencheurs de la section 5, la référence du panneau de la section 6, l'ordre de la section 7 et la condition de la section 2 (chaque composant livré que le registre des matériaux touche passe en nouvelle version, avec sa ligne au journal et la mesure avant et après).

Les cas nouveaux se lisent avec ce qui existe, sans nouvel asset 3D, comme tu le dis :

| Cas nouveau | Sur la carte, dans l'atelier |
|---|---|
| Un défaut qui se ferme | `defect-sign` reçoit `disparait` : il s'efface en douceur, comme tout élément (`docs/ville.md`) |
| Une fiche archivée sans preuve | Son étage s'enlève : `building` 2.0.0 reçoit la liste d'étages sans elle |
| Une fiche archivée livrée | Son étage reste : rien à changer côté atelier |
| Une décision refusée | Le panneau de décision reste : rien à changer |
| Une action déduite d'un silence (`cause: null`, `deduit: "silence"`) | La carte la joue comme aujourd'hui ; ces champs sont simplement lus |

## 2. Réponses à la section 9

### 2.1 Le composant du rail : `panel-rail`

Le nom te convient et me convient. Il n'existe pas encore sous un autre nom : aucun élément du catalogue ne dessine un panneau fermé ni une poignée (vérifié dans `catalogue.json`).

**Son périmètre**, à proposer à Pierre-Alain dans la fiche :
- **Un panneau fermé** : une bande fine, verticale pour l'arbre et le fil, horizontale pour le planning (`orientation`). Elle porte l'icône et le nom accessible du panneau, et ses badges : le compte et le niveau le plus grave (`notification-badge`), et les signes de `src/signes.js`. Une décision qui attend Pierre-Alain reste donc visible.
- **La poignée** : un bouton qui ouvre ou ferme (`aria-expanded`, `aria-controls`), au clavier comme à la souris.
- **Le redimensionnement du planning** : un séparateur au sens ARIA (`role="separator"`, flèches du clavier), émis en `gdc-resize`. C'est le même composant, côté ouvert.
- **Ce qu'il ne fait pas** : il ne retient rien. L'état ouvert ou fermé et la hauteur sont des préférences que le panneau de GDC garde (section 6) ; le rail reçoit `open` et émet `gdc-toggle`.
- **Sur téléphone** : un seul panneau ouvert à la fois. Le rail devient la rangée d'onglets qui choisit lequel.

### 2.2 Les états de `site-schedule` : sept à ajouter

Ta liste est bonne. Il manque à mon avis :
1. **une seule application** : les lignes d'application sont masquées (ta règle d'affichage) ;
2. **une étape choisie** (`gdc-select` sur `etape:<n>`) ;
3. **un jalon choisi**, qui montre son motif s'il est refusé, et la date d'après git s'il est périmé ;
4. **des traits regroupés par jour**, quand un jour devient trop étroit pour les séparer ;
5. **une pause en cours**, la bande du régime ouverte jusqu'à maintenant ;
6. **une mise à jour reçue** (`--depuis`) : le planning garde ce qui est déplié, le défilement et la sélection ;
7. **une chronologie complète reçue à la place** (`complet: true`) : même règle, elle remplace tout sans perdre la place du lecteur.

### 2.3 La forme `{ id, ref, evt }` de `gdc-select` : oui, avec deux précisions

- `evt` est la chaîne complète `evt:<journal>/<id>`, celle de `cause`.
- **Une action sans `cause`** (`deduit: "silence"`, la fermeture du chantier) émet `{ id, ref }` sans `evt`.
- **Une action sans `ref` mais avec `cause`**, par exemple un changement de régime, émet `{ id, evt }`. Je te propose d'ajouter cette ligne à la table de la section 6 : le fil défile jusqu'à l'action, le planning marque son trait, la carte et l'arbre ne changent pas.

## 3. Ce que la vérification dans le code de l'atelier a fait apparaître

Trois points, à régler de notre côté, que je te signale parce qu'ils touchent tes séquences :

1. **La galerie charge les séquences par motif** (`fixtures/*/[0-9]*.json`). Les nouveaux fichiers `NN-etape.chronologie.json` et `NN-etape.depuis.json` y entreront aussi. Rien ne casse (la galerie suit `index.json`), mais tout serait chargé d'avance. L'atelier sépare les trois motifs et charge la séquence `volume` à la demande, pas au démarrage.
2. **Le contrôle de la carte rejoue toutes les séquences** (`scripts/check-ville.mjs`, 6 730 vérifications aujourd'hui). Avec `volume` (100 fiches), sa durée sera mesurée ; si elle devient trop longue, `volume` sera rejouée seule, dans un contrôle à part.
3. **Les lieux, les états et les personnes inconnus** sont déjà ignorés et signalés par la carte, jamais inventés : les champs nouveaux de la 0.20 (`cause`, `deduit`) ne la gênent pas. Je le vérifierai sur tes séquences dès qu'elles arrivent.

## 4. Le plan de l'atelier

Deux pistes. Chaque élément est fabriqué dans sa propre session, avec le contrôle, la galerie dans tous ses états, le contrôleur et la validation de Pierre-Alain. Les deux pistes travaillent dans le même dossier : chacune ne touche que ses fichiers et sa fiche du catalogue.

### Piste interface (le planning et les panneaux)

| # | Élément | Quand | Ce qui est fini |
|---|---|---|---|
| I-1 | Les fiches `site-schedule` et `panel-rail` | Maintenant | Validées par Pierre-Alain, au catalogue, « à faire ». Elles reprennent les sections 1, 4, 5 et 6 de ta dernière passe, et la section 2 de ce fichier. |
| I-2 | `floor-selector` 1.1.0 | Maintenant | `gdc-select` porte `{ id, ref, building }`, avec sa ligne au journal des versions |
| I-3 | `panel-rail` | Après I-1 | Livré : vertical et horizontal, ouvert et fermé, badges, clavier, téléphone |
| I-4 | Les panneaux dans la galerie | Après I-3 | L'arbre à gauche, le fil à droite, le planning en bas, sur les séquences réelles ; les vérifications sur `side-nav` et `trigger-feed` (aucun côté supposé, état gardé quand on masque) |
| I-5 | Le chargement des séquences | Avant ta 0.20 | La galerie et le contrôle chargent par `index.json` seulement (`fichier`, `chronologie`, `depuis`), plus aucun motif de fichier ; `volume` à la demande dans la galerie (section 6) |
| I-6 | `trigger-feed` 1.1.0 | À ta 0.20 | Il lit `cause`, défile jusqu'à l'`evt` choisi ailleurs et émet `{ id, ref, evt }` |
| I-7 | `site-schedule` | À ta 0.20 | Construit et contrôlé sur les quatre séquences, dont `volume` : premier affichage sous 200 ms, défilement fluide sur le portable de référence |
| I-8 | La caméra qui suit la sélection | Avec la livraison de `city-map` | Un saut sans mouvement avec « moins d'animation » ; sinon un déplacement court, interrompu par toute nouvelle sélection |

### Piste 3D (la fluidité, puis le reste du lot G8)

| # | Élément | Quand | Ce qui est fini |
|---|---|---|---|
| D-1 | Le registre des matériaux et les instances | Maintenant | La mesure avant et après (appels de dessin, matériaux, triangles, images par seconde, processeur ralenti) sur `trois-applications`, puis sur `volume` dès sa livraison ; une nouvelle version pour chaque composant livré touché |
| D-1b | `building` 2.1.0 : moins d'appels de dessin | Après D-1, avant D-2 (décision de Pierre-Alain du 22 octobre 2026) | D-1 a ramené les matériaux de 166 à 59 et passé de 62 à 74 images/s, mais la scène reste à 17 images/s processeur ralenti : le coût est dans les appels de dessin (1 579), `building` en tête avec 226 maillages. Ses pièces répétées sont fusionnées ou instanciées, sans changement à l'écran ; la mesure avant et après est jointe |
| D-2 | `floodlight`, le projecteur | Après D-1 | Livré |
| D-1c | Le profil du temps processeur de la carte | Après D-2, avant D-3 (décision de Pierre-Alain du 22 octobre 2026) | Après D-1b, la scène passe de 73 à 87 images/s, mais seulement de 17,2 à 18,4 processeur ralenti quatre fois : le frein n'est plus le nombre d'appels de dessin. Un profil dit où va le temps d'une image (rendu de Three.js, carte vivante, animations, survol), et si le ralentissement par quatre représente le portable de référence ; les corrections suivent, mesurées avant et après |
| D-3 | `character-kit` v003 et `character` 1.2.0 | Après D-1 | L'ouvrier, la tenue de ville, la lampe frontale, l'animation « porter » |
| D-4 | `site-fence` 1.1.0, `party-shed`, `city-car` | Ensuite | Le portail fermé, le cabanon de la fête, les voitures |
| D-5 | La mesure du rejeu | Avant la seconde version | La reconstruction complète de la scène d'AuditApp chronométrée, et l'option `instant` prévue composant par composant |

### Seconde version

Le rejeu de la carte (`gdc scene --a <date>`), avec l'option `instant` partout et les cibles déjà arrêtées : moins de 100 ms par pas, moins d'une seconde pour une reconstruction complète.

## 5. Ce que l'atelier attend de GDC

Rien d'autre que ta section 8 : la 0.20 avec ses quatre séquences (`projet-type`, `trois-applications`, `projet-long`, `volume`), chacune avec, à chaque pas, la scène, la chronologie complète et la mise à jour depuis le pas précédent. I-6 et I-7 démarrent à sa livraison ; tout le reste avance d'ici là.

## 6. Les derniers mots de GDC, intégrés

GDC a tout accepté (`docs/planning-derniers-mots-de-gdc.md`, même jour) : `panel-rail` et son périmètre, les sept états ajoutés, `{ id, evt }` sans `ref` dans la table du panneau, les deux pistes et leur ordre. Il ajoute cinq précisions, que l'atelier applique ainsi :

| Précision de GDC | Ce que l'atelier en fait |
|---|---|
| **Les séquences suivent `index.json`** : chaque pas nomme `fichier`, `chronologie` et `depuis` ; au premier pas, `depuis` est une chronologie complète (`complet: true`) | I-5 : la galerie et `scripts/check-ville.mjs` ne lisent plus que `index.json`. Le motif `fixtures/*/[0-9]*.json` de `src/gallery.js` disparaît. |
| **`volume` a quatre pas** (25, 50, 75, 100 fiches), tous le même jour | Elle sert à la liste virtuelle et à la fluidité de `site-schedule`, et à la mesure de D-1. Elle reste dans le contrôle de la carte ; sa durée est mesurée. |
| **`projet-long` porte `"horloge": "decalee"`** | Elle sert à juger l'allure du planning et les plis des jours vides, jamais une durée ni l'ordre fin de deux événements. La galerie l'affiche avec la phrase de `index.json`. |
| **Pas de scène d'AuditApp dans l'atelier** | La mesure de référence de D-1 se fait sur `trois-applications` et `volume`. L'entrée « AuditApp » de la galerie ne contient que trois noms d'applications d'exemple (`src/scene-reference.js`), aucune donnée du projet : elle reste. Une mesure sur une vraie scène d'AuditApp ne se fait que si Pierre-Alain passe le fichier, en local, jamais commité. |
| **Un schéma inconnu** | `site-schedule` passe en « données illisibles » pour tout `schema` autre que 1 ; un champ inconnu du schéma 1 est ignoré, comme la carte le fait déjà. Écrit dans la fiche. |

**Ce qui démarre maintenant** : I-1 à I-5 et D-1 à D-4. **Ce qui attend le dépôt de la 0.20 dans `fixtures/`** : I-6 (`trigger-feed` 1.1.0) et I-7 (`site-schedule`). Si une fiche bute sur le contrat en route, l'atelier l'écrit dans un fichier du même genre, que Pierre-Alain transmet à GDC.

