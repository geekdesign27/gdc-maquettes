# Le planning du chantier : réponse de GDC à l'atelier des maquettes

De l'architecte de GDC, le 22 octobre 2026, après les réponses de Pierre-Alain. Ce fichier répond à « Réflexion : panneaux latéraux et planning en bas (côté maquettes) » et pose les questions de GDC. Ce qui est décidé l'est par Pierre-Alain ; le reste est proposé. Réponds point par point, dans un fichier du même genre, que Pierre-Alain me transmettra.

## 1. Ce que Pierre-Alain a décidé (22 octobre 2026)

1. **Un Gantt complet** : le passé avec ses vraies dates, et le futur en **enchaînement direct**, sans date. Les étapes à venir se suivent à la file, avec une durée de lecture choisie pour que le planning reste lisible ; elles ne portent aucune date. Quand une étape se réalise, sa vraie date remplace la durée de lecture. Le futur se distingue donc du passé par sa forme (contour, pas de date), jamais par une date inventée.
2. **Les jours vides se replient** : un jour sans aucun événement devient une colonne étroite ; plusieurs jours vides de suite se fondent en un seul pli, avec sa durée (« 12 jours sans activité »), qui se déplie au clic. Une période vide n'est jamais appelée « abandonnée ».
3. **Le rejeu de la carte à une date passée** : oui, en seconde version, avec sa limite (exact pour ce qui vient du journal, approché pour le dossier et git).
4. **Le Gantt s'organise par étapes, comme un planning de chantier.** Les lignes du haut sont les dix étapes. On ouvre une étape pour voir ce qui s'y fait : aux étapes du chantier (5 et 6 surtout), les fiches ; on ouvre une fiche pour voir ses lots, et ainsi de suite.
5. **Les panneaux s'intervertissent** : l'arbre à gauche, les déclencheurs à droite ; chacun se ferme ; le Gantt est en bas, repliable.

Ce point 4 change ta proposition (une ligne par application, qui se déplie en fiches). Je te propose ci-dessous comment le tenir sans perdre ta hiérarchie par application.

## 2. Les lignes : les étapes d'abord

| Ligne de l'étape | Ce qu'elle contient quand on l'ouvre | Ses dates viennent de |
|---|---|---|
| 1 L'idée | Les pièces de l'idée (compte rendu, cahier des besoins, profil) | L'ouverture du projet, puis ta décision « On continue » |
| 2 Les plans | Les pièces des plans | Ta décision « On continue », puis le permis |
| 3 Le permis | Le jalon du permis, et ses permis complémentaires | Ta décision « Permis de construire » |
| 4 Les plans d'exécution | Les fiches, groupées par application | L'ouverture de chaque fiche, puis ton feu vert |
| 5 La préparation | Les fiches ; dans chaque fiche, ses lots prévus | Le feu vert, puis le premier lot construit |
| 6 La construction | Les fiches ; dans chaque fiche, ses lots, chacun de son début à sa fin | Le premier lot, puis la preuve de la fiche |
| 7 La réception | Les fiches | La demande de réception, puis la fusion |
| 8 La remise des clés | Les fiches livrées (jalons) | Ta remise des clés, la mise en production vérifiée |
| 9 La garantie | Les défauts ouverts après livraison, chacun de son ouverture à sa clôture | Les incidents |
| 10 Les transformations | Les demandes du carnet, et les fiches qui surélèvent un bâtiment habité | Leur dépôt, puis leur passage en fiche |

- **Le niveau application reste** : à l'intérieur d'une étape, les fiches se groupent par application dès qu'il y en a plus d'une. L'ordre est donc étape, application, fiche, lot.
- **Une fiche traverse plusieurs étapes** : elle a une barre dans chacune, en escalier de haut en bas. Survoler une de ses barres éclaire toutes les autres : on suit la fiche d'étape en étape.
- **La ligne de l'étape** porte la barre résumée de tout ce qu'elle contient, et le signe d'état de son élément en cours.

## 3. Ce que GDC fournira, et comment

**Une commande à part, `gdc chronologie`**, prévue pour la version 0.20. La scène reste « maintenant ». Les barres sont calculées en rejouant le journal avec le même calcul que la scène : le planning et la carte ne peuvent pas se contredire.

```json
{
  "schema": 1,
  "maintenant": "2026-10-22T09:00:00Z",
  "fuseau": "Europe/Zurich",
  "debut": "2026-10-19T08:12:00Z",
  "jours": [{ "date": "2026-10-19", "evenements": 41 }, { "date": "2026-10-20", "evenements": 0 }],
  "regime": [{ "valeur": "ouvert", "de": "…", "a": "…" }, { "valeur": "pause", "de": "…", "a": null }],
  "lignes": [
    { "id": "etape:6", "niveau": "etape", "parent": null, "nom": "La construction" },
    { "id": "application:terrain@6", "niveau": "application", "parent": "etape:6", "nom": "Application terrain", "ref": { "application": "terrain" } },
    { "id": "fiche:003-saisir-un-constat@6", "niveau": "fiche", "parent": "application:terrain@6", "nom": "Saisir un constat hors ligne",
      "ref": { "application": "terrain", "fiche": "003-saisir-un-constat" },
      "barres": [
        { "stade": "structure", "debut": "…", "fin": "…", "commence_par": "evt:a1b2c3d4", "finit_par": "evt:e5f6a7b8" },
        { "stade": "envelope", "debut": "…", "fin": null, "commence_par": "evt:e5f6a7b8" }
      ],
      "a_venir": false },
    { "id": "lot:003-saisir-un-constat/L1@6", "niveau": "lot", "parent": "fiche:003-saisir-un-constat@6", "nom": "Le stockage local chiffré",
      "ref": { "application": "terrain", "fiche": "003-saisir-un-constat", "lot": "L1" },
      "barres": [{ "statut": "en_cours", "debut": "…", "fin": null, "commence_par": "evt:…" }] }
  ],
  "jalons": [{ "id": "jalon:003-saisir-un-constat/feu-vert", "ligne": "fiche:003-saisir-un-constat@4", "nom": "Ton feu vert", "demandee": "…", "prise": "…", "demandee_par": "evt:…", "prise_par": "evt:…" }],
  "a_venir": [{ "ligne": "fiche:003-saisir-un-constat@7", "etape": 7, "apres": "fiche:003-saisir-un-constat@6" }],
  "evenements": [{ "id": "evt:a1b2c3d4", "ts": "…", "kind": "lot_etat", "phrase": "Julie commence le lot « Le stockage local chiffré »", "ref": { "application": "terrain", "fiche": "003-saisir-un-constat", "lot": "L1" } }]
}
```

- **Les identifiants** : `etape:<n>`, `application:<id>`, `fiche:<id>`, `lot:<fiche>/<lot>`, `jalon:…`, `evt:<id>`. Le suffixe `@<n>` distingue les barres d'une même fiche dans chaque étape ; la `ref` reste la même partout, pour le survol partagé.
- **Le futur** : `a_venir` dit ce qui suit et dans quel ordre, jamais quand. La durée de lecture est à toi (question I2).
- **Les événements sont les faits du journal**, chacun avec l'identifiant qu'il a déjà. Les actions de la scène (`gdc scene --avant`) porteront en 0.20 l'identifiant de l'événement qui les cause (`cause`), pour que le fil, le planning et la carte visent le même fait.
- **Mise à jour** : `gdc chronologie --depuis evt:<id>` ne rend que ce qui a changé depuis cet événement, pour ne pas tout relire à chaque fois.
- **Des séquences réelles** dans `fixtures/` : la chronologie du projet type et celle des trois applications.

## 4. Réponses à tes demandes

| N° | Ta demande | Réponse de GDC |
|---|---|---|
| 1 | L'historique des étapes, les dates des lots | Oui : les barres de `gdc chronologie`, calculées en rejouant le journal. Les lots ont leurs dates de début et de fin (passage en cours, fini ou abandonné). |
| 2 | Les décisions horodatées | Oui pour tes gates (feu vert, réception, remise des clés) : la demande et la décision sont au journal. Pour « On continue » et le permis, la date de la décision existe, mais pas celle de la demande : GDC l'enregistrera à partir de la 0.20 ; avant, `demandee` vaudra `null`. |
| 3 | Les périodes du régime | Oui : `regime`, avec ses dates, calculé avec les mêmes seuils que la scène. |
| 4 | Une date prévue existe-t-elle ? | Non. Le futur est en enchaînement direct, sans date (décision 1). Si GDC a un jour des estimations (chantier C4), elles s'ajouteront nommées comme telles. |
| 5 | Rejouer une date passée | Oui, en seconde version : `gdc scene --a <date>`. Exact pour ce qui vient du journal, approché pour les pièces du dossier et git. |
| 6 | La mise en page | Confirmé : la disposition, les poignées et leur mémoire appartiennent au panneau de GDC (chantier C6). Ta galerie l'imite pour juger l'ensemble, et c'est très bien ; GDC reprendra tes réglages dans `docs/maquette.md`. |
| 7 | Les volumes réels | À dimensionner pour : 8 applications, 100 fiches, 10 lots par fiche, 6 mois de développement, plusieurs milliers d'événements. AuditApp, le premier vrai projet, compte 4 applications et environ 26 fiches ; le nombre de lots par fiche n'est pas encore mesuré. |
| 8 | Toutes les actions depuis le début | Oui, sous forme d'événements (les faits du journal), avec `jours` pour le compte par jour. Pour un long historique, `--depuis` et un résumé par jour. |
| 9 | Le jour de référence | Oui : `maintenant` et `fuseau` sont fournis par GDC ; les jours se coupent dans ce fuseau (celui de la machine de GDC). |

## 5. Ce que les déclencheurs feront sur le planning

| Événement du journal | Sur le planning |
|---|---|
| `projet-ouvert` | La ligne de l'étape 1 commence |
| `decision` (on continue, permis) | Le jalon de la décision, puis l'étape suivante commence |
| `run` (une fiche s'ouvre) | La fiche apparaît à l'étape 4, sa barre commence |
| `gate` en attente | Le jalon apparaît, demandé, pas encore pris : la décision t'attend |
| `gate` accordé | Le jalon est pris ; la barre de l'étape suivante commence |
| `lot` | Un lot apparaît, à venir, dans sa fiche (étapes 5 et 6) |
| `lot_etat` en cours, fini, abandonné | La barre du lot commence, puis se termine |
| `preuve` (rouge) | Passage de la préparation aux fondations, dans l'étape 5 |
| `preuve`, `controle` | Un trait sur la barre de la fiche, à sa date |
| `fusion` | La fiche entre en réception terminée (étape 7) |
| `promotion` vérifiée | Le jalon de la remise des clés (étape 8) ; la fiche est habitée |
| `incident` | Un défaut s'ouvre à l'étape 9 |
| `demande` | Un élément apparaît à l'étape 10 |
| `dependance` | Un trait sur la barre du lot, à sa date |
| `activite` | Rien sur le planning (trop fin) ; compté dans `jours` |

Une ligne de ce tableau entrera dans la table des déclencheurs de GDC (`docs/maquette.md`), comme pour la carte : un test refusera un événement sans effet déclaré sur le planning.

## 6. Mes questions

### Interface

- **I1. Le Gantt par étapes.** Une fiche a une barre dans chaque étape qu'elle traverse. Comment la rends-tu suivable : des liaisons entre ses barres, ou seulement l'éclairage de toutes ses barres au survol ? Quel est ton avis sur la lisibilité de cet escalier quand dix fiches sont en cours ?
- **I2. La durée de lecture du futur.** Quelle largeur pour une étape à venir, pour que le planning reste lisible sur un portable de 13 pouces ? Je propose la largeur d'un jour actif, la même pour toutes les étapes à venir ; dis-moi si c'est trop étroit.
- **I3. Le volume.** À la hauteur réduite du panneau, combien de lignes montres-tu ? Pour 100 fiches et leurs lots, prévois-tu de ne dessiner que les lignes visibles ?
- **I4. Les panneaux fermés.** Pierre-Alain n'a pas encore tranché entre un panneau caché avec un onglet et un rail fin qui garde ses badges. Je recommande le rail : une décision qui t'attend reste visible même panneau fermé. Ton avis ?
- **I5. Le panneau du bas au démarrage.** Je recommande ouvert à hauteur réduite, centré sur l'étape en cours. Ton avis ?
- **I6. Les identifiants.** Le survol partagé et `gdc-select` acceptent-ils les identifiants de la section 3 (`etape:6`, `fiche:…@6`, `lot:…/L1@6`, `evt:…`) ? Sinon, donne-moi ta grammaire d'identifiants : GDC s'y alignera.
- **I7. La couleur.** Tu proposes que l'étape en cours soit le seul endroit du planning avec une couleur d'état. Et une décision qui t'attend : même rouge que le badge du bureau du client, sur son jalon ?
- **I8. Le clavier.** Aller d'un passage d'étape au suivant déplace la caméra. Avec « moins d'animation », la caméra saute-t-elle sans mouvement ?

### 3D et Blender

- **B1. Avant le rejeu.** Choisir une barre passée dans le planning ne change rien à la 3D, sauf la sélection : la carte reste « maintenant ». Tu confirmes ?
- **B2. L'étage et la pièce désignables.** Pour aller d'une barre au bon étage et à la bonne pièce, il faut une ancre par étage et par pièce (`floor:<n>` sur `building` 2.0.0, `room:<n>` sur `building-interior`) et un état de sélection de la pièce. Est-ce prévu dans leurs fiches ?
- **B3. Le rejeu, plus tard.** Pour glisser dans le temps, chaque composant doit pouvoir passer directement à un état, sans transition, et la scène doit se reconstruire vite. Combien de temps prend aujourd'hui la reconstruction complète de la scène d'AuditApp ? Quel budget vises-tu pour que le glissement reste fluide ?
- **B4. Les matériaux.** La capture du 22 octobre affiche 127 matériaux et 127 062 triangles. Avant d'ajouter les ouvriers, les badauds, les voitures et l'éclairage de nuit, quel est ton plan pour rester fluide sur le portable de référence (matériaux partagés, instances, niveaux de détail) ?
- **B5. La nuit et le planning.** Quand le planning montre une période passée, la lumière de la carte reste celle de l'heure réelle (décision de Pierre-Alain). Tu confirmes qu'aucun réglage d'ambiance ne suit le planning avant le rejeu ?

### Déclencheurs et données

- **D1. Les traits.** Sur la barre d'une fiche, veux-tu un trait par événement, ou le compte par jour que GDC peut te donner déjà regroupé ?
- **D2. Le rafraîchissement.** Le panneau relira `gdc chronologie --depuis` à chaque nouvel événement. Ta galerie peut-elle simuler cela avec les séquences de `fixtures/`, scène après scène ?
- **D3. Le tableau de la section 5.** Manque-t-il un événement dont tu voudrais un effet sur le planning ? Y en a-t-il un que tu ne veux pas voir ?
- **D4. Les pièces du dossier** (étapes 1 et 2) n'ont pas de dates à elles dans le journal : seulement leur état actuel, et la date de leur dernier changement dans git. Les montres-tu sans barre, avec leur seul état, ou avec la date git marquée « d'après git » ?

## 7. La suite

1. Tu réponds à ces questions dans un fichier du même genre, que Pierre-Alain me transmet.
2. GDC fixe le contrat de `gdc chronologie` et le livre en 0.20 avec ses séquences.
3. Tu proposes au catalogue la fiche `site-schedule` (le planning du chantier) et les panneaux repliables, avec le contrat de la section 3 ; Pierre-Alain les valide.
4. Le rejeu de la carte vient ensuite, en seconde version, des deux côtés.
