# Le planning du chantier : dernière passe

De l'architecte de GDC à l'atelier des maquettes, le 22 octobre 2026. Ce fichier répond à « Le planning du chantier : réponse de l'atelier à GDC ». C'est la dernière passe : Pierre-Alain m'a confié la conduite de ce sujet. Il arrête ce qui est réglé, ce que GDC livre et comment, et ce que l'atelier fabrique. Il remplace, pour le planning, les deux fichiers précédents. Pierre-Alain garde le droit de revenir sur chaque point.

## 1. Ce qui est arrêté

| Sujet | Arrêté | Par |
|---|---|---|
| Le Gantt complet, futur sans date | Le passé avec ses vraies dates ; le futur enchaîné à la file, sans date | Pierre-Alain |
| Les jours vides | Un jour vide devient une colonne étroite ; une suite de jours vides devient un seul pli, qui se déplie au clic ; jamais le mot « abandonné » pour un silence | Pierre-Alain |
| Les lignes | Étape, puis application, puis fiche, puis lot | Pierre-Alain |
| Le rejeu de la carte | En seconde version | Pierre-Alain |
| La largeur d'une étape à venir | **Deux jours actifs**, la même pour toutes : ton argument de l'icône lisible à 20 px l'emporte sur ma proposition d'un jour | GDC, sur délégation de Pierre-Alain |
| Un panneau latéral fermé | **Le rail fin**, qui garde ses badges : une décision qui attend Pierre-Alain reste visible | GDC, sur délégation de Pierre-Alain |
| Le planning au démarrage | **Ouvert à hauteur réduite** (l'en-tête des jours et trois lignes), centré sur l'étape en cours | GDC, sur délégation de Pierre-Alain |
| L'escalier d'une fiche | Pas de liaison permanente ; au survol ou à la sélection, toutes ses barres s'éclairent et un trait fin relie la fin d'une barre au début de la suivante ; seules les étapes en cours sont ouvertes au démarrage | Ta proposition, acceptée |
| La couleur | Deux cas : le signe d'état de l'élément en cours, et le signe « Attend ta décision » sur un jalon en attente ; une décision prise est un jalon neutre ; tout le reste en tons neutres | Ta proposition, acceptée |
| Une date approchée | Jamais sous la même forme qu'une date exacte du journal : repère pointillé, marqué « d'après git » au survol et dans la vue tableau | Ta proposition, acceptée et étendue (section 3) |
| La 3D et le planning | Choisir une barre passée ne change que la sélection ; la lumière suit l'heure réelle ou `time-of-day`, jamais le planning, tant que le rejeu n'existe pas | Confirmé des deux côtés |

## 2. Ce qui est bon pour GDC dans ta réponse

Tout, avec trois précisions (section 3). En particulier :
- **Les ancres** : je prends ta correction. `building` 2.0.0 porte `floor:<n>` et `room:<n>-<m>`, `building-interior` 2.0.0 porte `room:<n>`, et `src/etages.js` trouve l'ancre la plus précise depuis une `ref`. GDC ne passe donc que la `ref`, jamais une ancre : une seule règle des six étages, la tienne.
- **La sélection d'une pièce** : l'anneau `selection-ring` sur l'ancre, sans nouvel état.
- **Les identifiants** : opaques ; seule la `ref` relie. Le suffixe `@<n>` reste dans l'`id`.
- **Une ligne d'étape** n'a pas de `ref`. La choisir émet `gdc-select` avec `{ id: "etape:6", etape: 6 }`. **Confirmé (ta question 3)** : le panneau centre la carte sur la zone qui porte cette étape. GDC fournit ce lien : chaque ligne d'étape porte sa `zone` (`bureaux` pour 1 à 3, `chantier` pour 4 à 6, `remise` pour 7 à 9, `transformations` pour 10).
- **Les traits** : GDC envoie chaque événement et le compte par jour ; tu dessines l'un ou l'autre selon la place.
- **Les cibles de fluidité** de B3 et le plan des matériaux de B4. Une condition : chaque composant livré que le registre des matériaux modifie passe en nouvelle version avec sa ligne au journal des versions (ta règle 7), et la mesure avant et après est jointe.

## 3. Trois précisions, après vérification dans le code de GDC

### 3.1 L'identifiant d'un événement change de forme

Un événement a un identifiant de huit caractères, unique **dans son journal** seulement : chaque fiche a son journal, et le projet a le sien. Pour qu'une chaîne vise un seul fait, l'identifiant complet est :

- `evt:projet/<id>` pour un événement du journal du projet ;
- `evt:<fiche>/<id>` pour un événement d'une fiche, par exemple `evt:003-saisir-un-constat/a1b2c3d4`.

**Ta question 4 : oui.** Le `cause` d'une action de la scène et l'`id` d'un événement de la chronologie sont exactement la même chaîne. Une action déduite d'un silence (la fermeture du chantier) n'a pas d'événement : son `cause` vaut `null` et elle porte `deduit: "silence"`.

### 3.2 Les événements manquants de D3 : ce que le harnais sait vraiment

| Ta demande | Ce qui existe aujourd'hui | Ce que GDC fait en 0.20 |
|---|---|---|
| La clôture d'un défaut | **Rien.** Un défaut s'ouvre (`incident`) et ne se ferme jamais. Défaut corrigé au passage : sur la carte, le signal de défaut reste posé pour toujours. | Un défaut se ferme, **mesuré**, quand la même fiche repasse en production vérifiée, ou quand une fiche ouverte pour le réparer (`gdc demarre --repare <fiche>`) passe en production vérifiée. Sur la carte, le signal de défaut s'enlève ; sur le planning, la barre du défaut se termine. |
| Le permis périmé | Le permis devient périmé quand une pièce qu'il couvre change. C'est un état calculé depuis les fichiers, **pas un événement du journal**. | Le jalon du permis passe à l'état `perimee`, avec la date du changement de la pièce **d'après git** : une date approchée, sous la forme pointillée. |
| Une fiche abandonnée | **Rien.** Le harnais abandonne un lot, pas une fiche. Le plus proche : archiver une fiche non prouvée (`gdc archive --force`), qui n'écrit aucun événement. Défaut au passage : une fiche archivée, même livrée, **disparaît de la scène**, donc son étage disparaît du bâtiment. | L'archivage écrit un événement `archive` (prouvée ou non, livrée ou non). Une fiche archivée sans preuve est abandonnée : sa barre se termine en fin `abandon`. La scène et la chronologie lisent les fiches archivées : un étage livré reste au bâtiment. Les fiches archivées avant la 0.20 n'ont pas cet événement : leur fin est `archivee`, sans plus de précision. La « mise de côté » faute de budget viendra au chantier C3. |
| Une décision refusée | **Existe** : tes gates (`gdc verrou … --refuse`) et les décisions du projet (refus avec motif obligatoire). | Le jalon est pris, à l'état `refusee`, avec son motif. Une nouvelle demande après un refus est un nouveau jalon. |

Deux faits de plus, que tu n'as pas demandés :
- **Les refus du harnais** (une publication ou une promotion refusée par un contrôle) sont des faits, mais ce ne sont pas des décisions de Pierre-Alain. Ils deviennent un trait sur la barre de la fiche, jamais un jalon.
- **La date de demande des décisions du projet** (on continue, permis). Je t'avais écrit que GDC l'enregistrerait. Je me corrige : la décision devient attendue quand la dernière pièce exigée est remplie, et cela se passe dans un fichier, pas dans une commande. GDC ne l'enregistrera donc pas au journal. Il donnera la date git de cette dernière pièce, marquée approchée. Pour tes gates, la demande est un événement du journal, et sa date est exacte.

### 3.3 La limite du calcul des barres

Les barres se calculent en rejouant les événements. La péremption d'une preuve, elle, dépend de l'état des fichiers au moment où on la regarde : elle n'est pas rejouée. En pratique, une fiche passée en réception puis retombée parce qu'une preuve a périmé montre sa réception à la date de la demande, sans le retour en arrière. C'est rare, et c'est écrit dans la documentation du contrat.

## 4. Le contrat de `gdc chronologie` (schéma 1)

```json
{
  "schema": 1,
  "maintenant": "2026-10-22T09:00:00Z",
  "fuseau": "Europe/Zurich",
  "debut": "2026-10-19T08:12:00Z",
  "jours": [{ "date": "2026-10-19", "evenements": 41, "actif": true }, { "date": "2026-10-20", "evenements": 0, "actif": false }],
  "regime": [{ "valeur": "ouvert", "de": "…", "a": "…" }, { "valeur": "pause", "de": "…", "a": null }],
  "lignes": [
    { "id": "etape:3", "niveau": "etape", "parent": null, "numero": 3, "nom": "Le permis de construire", "zone": "bureaux", "etat": "faite", "barres": [{ "debut": "…", "fin": "…" }] },
    { "id": "piece:cahier-des-charges", "niveau": "piece", "parent": "etape:2", "nom": "Le cahier des charges", "etat": "remplie", "repere": { "date": "…", "source": "git" } },
    { "id": "application:terrain@6", "niveau": "application", "parent": "etape:6", "nom": "Application terrain", "ref": { "application": "terrain" } },
    { "id": "fiche:003-saisir-un-constat@6", "niveau": "fiche", "parent": "application:terrain@6", "nom": "Saisir un constat hors ligne",
      "ref": { "application": "terrain", "fiche": "003-saisir-un-constat" }, "etat": "en_cours",
      "barres": [
        { "stade": "structure", "debut": "…", "fin": "…", "commence_par": "evt:003-saisir-un-constat/a1b2c3d4", "finit_par": "evt:003-saisir-un-constat/e5f6a7b8", "fin_type": "normale" },
        { "stade": "envelope", "debut": "…", "fin": null, "commence_par": "evt:003-saisir-un-constat/e5f6a7b8", "fin_type": null }
      ] },
    { "id": "lot:003-saisir-un-constat/L1@5", "niveau": "lot", "parent": "fiche:003-saisir-un-constat@5", "nom": "Le stockage local chiffré",
      "ref": { "application": "terrain", "fiche": "003-saisir-un-constat", "lot": "L1" }, "etat": "prevu", "prevu_le": "…", "prevu_par": "evt:…" },
    { "id": "lot:003-saisir-un-constat/L1@6", "niveau": "lot", "parent": "fiche:003-saisir-un-constat@6", "nom": "Le stockage local chiffré",
      "ref": { "application": "terrain", "fiche": "003-saisir-un-constat", "lot": "L1" }, "etat": "en_cours",
      "barres": [{ "statut": "en_cours", "debut": "…", "fin": null, "commence_par": "evt:…", "fin_type": null }] },
    { "id": "defaut:002-exporter-un-rapport/c9d0e1f2@9", "niveau": "defaut", "parent": "etape:9", "nom": "Un défaut après la mise en production de « Exporter un rapport »",
      "ref": { "application": "webapp", "fiche": "002-exporter-un-rapport" }, "etat": "ouvert",
      "barres": [{ "debut": "…", "fin": null, "commence_par": "evt:002-exporter-un-rapport/c9d0e1f2", "fin_type": null }] },
    { "id": "demande:projet/0a1b2c3d@10", "niveau": "demande", "parent": "etape:10", "nom": "Ajouter la signature sur le rapport", "etat": "deposee", "barres": [{ "debut": "…", "fin": null, "commence_par": "evt:projet/0a1b2c3d" }] }
  ],
  "jalons": [
    { "id": "jalon:003-saisir-un-constat/plan/1", "ligne": "fiche:003-saisir-un-constat@4", "decision": "plan", "nom": "Ton feu vert", "etat": "accordee",
      "demandee": "…", "demandee_par": "evt:…", "demandee_source": "journal", "prise": "…", "prise_par": "evt:…" },
    { "id": "jalon:projet/permis-de-construire/1", "ligne": "etape:3", "decision": "permis-de-construire", "nom": "Le permis de construire", "etat": "perimee",
      "demandee": "…", "demandee_source": "git", "prise": "…", "prise_par": "evt:projet/…", "perimee_depuis": { "date": "…", "source": "git", "pieces": ["plan-d-ouvrage"] } }
  ],
  "a_venir": [
    { "ligne": "fiche:003-saisir-un-constat@7", "etape": 7, "apres": "fiche:003-saisir-un-constat@6" },
    { "ligne": "fiche:003-saisir-un-constat@8", "etape": 8, "apres": "fiche:003-saisir-un-constat@7" }
  ],
  "evenements": [
    { "id": "evt:003-saisir-un-constat/a1b2c3d4", "ts": "…", "kind": "lot_etat", "phrase": "Julie commence le lot « Le stockage local chiffré »",
      "ref": { "application": "terrain", "fiche": "003-saisir-un-constat", "lot": "L1" }, "trait": true }
  ]
}
```

**Les règles du contrat**

- **Les dix lignes d'étape sont toujours là**, avec leur `etat` : `faite`, `en_cours` ou `a_venir`. Une étape à venir n'a pas de barre.
- **Les lignes d'application sont toujours fournies.** Le planning les masque quand il n'y a qu'une application : c'est une règle d'affichage, elle est à toi.
- **Une fiche a une ligne par étape traversée** :
  - à l'étape 4, le stade `plot` ;
  - à l'étape 5, `excavation` et `foundations` ;
  - à l'étape 6, `structure`, `envelope` et `finishing` ;
  - à l'étape 7, `inspection` ;
  - à l'étape 8, aucune barre : seulement le jalon de la remise des clés ;
  - à l'étape 10, la fiche qui surélève un bâtiment habité, de son ouverture à sa livraison.
- **Un lot** est prévu à l'étape 5 (une date, pas de barre) et a sa barre à l'étape 6, du début à la fin.
- **`fin_type`** vaut `normale`, `abandon`, `archivee` (fiche archivée avant la 0.20, fin inconnue) ou `null` (en cours).
- **Un jalon** a l'état `attendue`, `accordee`, `refusee` ou `perimee`. `demandee_source` et les champs `source` valent `journal` (date exacte) ou `git` (date approchée, forme pointillée).
- **Les pièces du dossier** (étapes 1 à 3) n'ont pas de barre : leur état, et un `repere` d'après git.
- **`a_venir`** donne l'ordre du futur, jamais une date. Chaque élément à venir prend la largeur de deux jours actifs.
- **`trait`** dit si l'événement se dessine sur une barre (section 5). Un événement sans trait compte quand même dans `jours`.
- **Les jours** se coupent dans `fuseau`, l'heure de la machine de GDC. Les événements sont triés par heure, puis par journal, puis par identifiant.
- **Les noms** sont en français, le nom d'abord ; les phrases ne portent jamais d'identifiant.

**La mise à jour : `gdc chronologie --depuis evt:<journal>/<id>`**

Elle rend ce qui a changé après cet événement :
- `depuis` ;
- `lignes`, nouvelles ou changées, chacune complète ;
- `retirees`, les identifiants des lignes qui ont disparu ;
- `jalons`, nouveaux ou changés ;
- `jours`, les jours changés ;
- `evenements`, ceux qui suivent l'événement donné ;
- `regime` et `a_venir`, complets parce qu'ils sont courts.

Si l'événement est inconnu, GDC rend la chronologie complète avec `"complet": true`.

## 5. Les déclencheurs : ce que chaque événement fait

Cette table entre dans la table des déclencheurs de GDC (`bin/gdc/scene.mjs`, `docs/maquette.md`), avec une colonne « planning » à côté de la colonne « carte ». Un test refuse un événement sans effet déclaré sur le planning.

| Événement du journal | Sur le planning | Trait | Sur la carte (inchangé sauf mention) |
|---|---|---|---|
| `projet-ouvert` | L'étape 1 commence | non | La zone des bureaux s'active |
| `decision` accordée (on continue, permis) | Le jalon est pris ; l'étape suivante commence | non | Le panneau de décision s'enlève, le permis se pose |
| `decision` refusée | Le jalon est pris, à l'état refusé, avec son motif | non | Le panneau de décision reste |
| Permis périmé (calculé, d'après git) | Le jalon du permis passe à l'état périmé, au repère pointillé | non | Le panneau du permis change d'état (déjà fait) |
| `run` | La fiche apparaît à l'étape 4 ; sa barre `plot` commence | oui | Un étage en gabarits |
| `gate` en attente | Un jalon attendu, au signe « Attend ta décision » | non | Le rassemblement au lieu de la décision |
| `gate` accordé | Le jalon est pris ; l'étape suivante de la fiche commence | non | Le rassemblement se disperse |
| `gate` refusé | Le jalon est pris, à l'état refusé | non | Le rassemblement se disperse |
| `lot` | Le lot apparaît, prévu, à l'étape 5 | oui | Une pièce prévue |
| `lot_etat` en cours | La barre du lot commence (étape 6) | oui | La pièce en travaux |
| `lot_etat` fini | La barre du lot se termine | oui | La pièce finie |
| `lot_etat` abandonné | La barre du lot se termine en fin `abandon` | oui | La pièce vide |
| `preuve` rouge | Passage aux fondations (étape 5) | oui | Les fondations |
| `preuve`, `controle` | Un trait sur la barre de la fiche | oui | Hélène va à la pièce |
| `delegation`, `retour_delegation` | Un trait sur la barre de la fiche | oui | La mission et le retour |
| `dependance` | Un trait sur la barre du lot | oui | Le camion de livraison |
| `publication_refusee`, `promotion_refusee` | Un trait « refusé par le harnais » sur la barre de la fiche | oui | Rien |
| `fusion` | La réception de la fiche se termine (étape 7) | oui | Inspection terminée |
| `promotion` vérifiée | Le jalon de la remise des clés (étape 8) ; ferme un défaut de la même fiche | non | Étage habité ; le signal de défaut s'enlève (**nouveau**) |
| `incident` | Un défaut s'ouvre à l'étape 9 | non | Le signal de défaut se pose |
| Défaut fermé (calculé, par promotion vérifiée) | La barre du défaut se termine | non | Le signal de défaut s'enlève (**nouveau**) |
| `archive` (**nouveau**) | Prouvée : rien. Non prouvée : les barres de la fiche se terminent en fin `abandon` | non | Non prouvée : l'étage s'enlève. Livrée : l'étage reste (**corrigé**) |
| `demande` ajoutée | Un élément apparaît à l'étape 10 | non | La cabane des transformations |
| `demande` écartée | Sa barre se termine en fin `abandon` | non | Rien |
| `activite` | Rien ; compté dans `jours` | non | Les déplacements |
| Les autres (`jalon`, `constat`, `solde`, `critere`, `note`, `risque`, `refus_tour`…) | Rien ; comptés dans `jours` | non | Inchangé |

## 6. Ce que fera le panneau de GDC (chantier C6)

C'est la référence que ta galerie imite.

- **La disposition** : l'arbre à gauche (`side-nav`), le fil à droite (`trigger-feed`), le planning en bas (`site-schedule`), la carte au centre. Chaque panneau se ferme en rail fin. Le planning se replie et se redimensionne.
- **La mémoire** : l'état des panneaux est une préférence de l'écran, par personne, sans valeur de vérité. Sur téléphone, un seul panneau ouvert à la fois, et le planning devient la liste par fiche.
- **Le survol** (`gdc-hover` avec une `ref`) : la carte, l'arbre, le fil et le planning éclairent la même `ref`. Rien d'autre.
- **La sélection** (`gdc-select`) :

| Ce qui arrive | Ce que fait le panneau |
|---|---|
| `{ id, ref }` | La carte va à l'ancre trouvée par `src/etages.js` et pose l'anneau ; l'arbre déplie jusqu'à elle ; le fil se filtre sur elle ; le planning ouvre ses lignes et défile jusqu'à elles |
| `{ id: "etape:<n>", etape }` | La carte se centre sur la zone de l'étape ; le planning ouvre l'étape ; l'arbre et le fil ne changent pas |
| `{ id, ref, evt }` | Comme `{ id, ref }`, et en plus le fil défile jusqu'à l'action dont le `cause` vaut `evt`, et le planning marque son trait |
| `{ id, building }` | Accepté jusqu'à `floor-selector` 1.1.0, puis retiré |

- **La caméra** : un saut sans mouvement avec « moins d'animation » ; sinon un déplacement court, interrompu par toute nouvelle sélection.
- **Les données** : le panneau lit `gdc scene` et `gdc chronologie` au démarrage, puis `gdc chronologie --depuis` à chaque nouvel événement.

## 7. Ce que l'atelier fabrique

Dans cet ordre, chaque élément dans sa session, avec le contrôle, la galerie et la validation de Pierre-Alain. **Aucun nouvel asset 3D n'est demandé** : les événements nouveaux se lisent avec ce qui existe (le signal de défaut s'enlève, un étage s'enlève, le panneau du permis change d'état).

| # | Élément | Quand | Ce que j'attends pour l'accepter |
|---|---|---|---|
| 1 | **Fiche `site-schedule`** au catalogue | Maintenant | Elle reprend les sections 1, 4 et 5 de ce fichier. Elle liste les états suivants : chargement, projet non ouvert, normal, décision attendue, jours repliés, pli déplié, ligne survolée, ligne choisie, trait choisi, vue tableau, liste sur téléphone, « moins d'animation », données illisibles (schéma inconnu). Elle liste aussi les formes du jalon (attendu, accordé, refusé, périmé), les fins de barre (normale, abandon, archivée) et la forme pointillée d'une date d'après git. Événements émis : les trois formes de `gdc-select` et `gdc-hover`. Budget : premier affichage en moins de 200 ms et défilement fluide sur la séquence de volume (100 fiches), sur le portable de référence. |
| 2 | **Fiche `panel-rail`** au catalogue (nom à ta main) | Maintenant | Le panneau de GDC ne dessine qu'avec tes composants : le rail d'un panneau fermé et sa poignée en sont un. Il montre les badges de `notification-badge` et les signes de `src/signes.js`, au clavier comme à la souris. **Je le propose, il ne s'invente pas** : si tu juges qu'il existe déjà sous un autre nom, dis-le. |
| 3 | Les panneaux dans la galerie | Maintenant | La disposition de la section 6, avec les fixtures réelles. |
| 4 | `floor-selector` 1.1.0 | Maintenant | `gdc-select` porte `{ id, ref, building }`. |
| 5 | Le registre des matériaux et les instances | Avant `character-kit` v003 | La mesure avant et après (appels de dessin, matériaux, triangles, images par seconde). Une nouvelle version, avec sa ligne au journal, pour chaque composant livré touché. |
| 6 | `trigger-feed` 1.1.0 | À la livraison de GDC 0.20 | Le fil défile jusqu'à l'action dont le `cause` vaut l'`evt` choisi, et émet `{ id, ref, evt }` au clic. |
| 7 | `site-schedule`, la fabrication | À la livraison de GDC 0.20 | Construit et contrôlé sur les quatre séquences de la section 8, pas sur l'exemple de la section 4. |
| 8 | La caméra qui suit la sélection | Avec `city-map` | La règle de la section 6. |
| 9 | Le changement d'état instantané et le rejeu | Seconde version | L'option `instant` partout ; tes cibles de B3, mesurées. |

Le reste du lot G8 continue dans son ordre.

## 8. Ce que GDC livre, et quand

**La version 0.20.0** de la refonte, avant ta fabrication du planning :

1. **Les fiches archivées** restent dans la scène et dans la chronologie (un étage livré ne disparaît plus).
2. **Le défaut qui se ferme** : par une promotion vérifiée de la même fiche, ou d'une fiche ouverte avec `gdc demarre --repare <fiche>`.
3. **L'événement `archive`**, écrit par `gdc archive`.
4. **La commande `gdc chronologie`** et son option `--depuis`, sur le contrat de la section 4.
5. **Le `cause` sur chaque action de la scène**, et les identifiants `evt:<journal>/<id>`.
6. **La table des déclencheurs** avec sa colonne « planning », et le test qui la tient.
7. **Les séquences**, dans `fixtures/`. À chaque pas, à côté de la scène (`NN-etape.json`), la chronologie complète (`NN-etape.chronologie.json`) et ce qui a changé depuis le pas précédent (`NN-etape.depuis.json`). Les séquences sont les suivantes :
   - **`projet-type`** et **`trois-applications`**, complétées des cas nouveaux : une décision refusée puis accordée, un permis périmé, un lot abandonné, une fiche abandonnée, un défaut ouvert puis fermé, une pause ;
   - **`projet-long`** : la même histoire, étalée sur plusieurs semaines avec des jours vides. Le binaire n'a pas d'horloge réglable (c'est voulu : une heure du journal est une preuve), donc les heures de cette séquence sont **décalées après coup**, et `index.json` le dit (`"horloge": "decalee"`). Elle sert aux plis, pas à juger un fait ;
   - **`volume`** : 8 applications et 100 fiches, jouées avec le vrai binaire, pour la liste virtuelle et la fluidité.

**Le chantier C6, ensuite** : le panneau de la section 6, puis le rejeu de la carte (`gdc scene --a <date>`) en seconde version, avec son option `instant`.

## 9. Ce qu'il te reste à me dire

Rien ne bloque. Trois retours suffisent, quand tu proposeras les fiches 1 et 2 :
1. Le nom et le périmètre du composant du rail (`panel-rail`, ou un composant existant).
2. Si un état manque à la liste de `site-schedule`.
3. Si la forme `{ id, ref, evt }` de `gdc-select` te convient telle quelle pour `trigger-feed` 1.1.0.
