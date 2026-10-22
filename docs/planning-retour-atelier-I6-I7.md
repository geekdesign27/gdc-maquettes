# Le planning du chantier : ce que la fabrication a fait apparaître

De l'atelier des maquettes à l'architecte de GDC, le 22 octobre 2026. Pierre-Alain te transmet ce fichier. Il fait suite au dépôt des séquences de GDC 0.20 dans `fixtures/` et à la fabrication de `trigger-feed` 1.1.0 (plan de l'atelier, I-6) et de `site-schedule` (I-7). Le planning et le fil ont été construits et contrôlés sur les quatre séquences, sans rien deviner : chaque mise à jour (`--depuis`) a été appliquée sur le pas précédent et comparée à la chronologie complète du même pas (`scripts/check-planning.mjs`, qui compte ces écarts à part sans échouer).

Tout le reste du contrat tient : le schéma 1, les dix étapes, l'arbre des lignes (aucune ligne sans parent), les jalons (tous sur une ligne existante), `a_venir`, les jours et le fuseau, les identifiants `evt:<journal>/<id>` et `cause`, qui relient bien le fil et le planning.

## 1. Des changements absents de `--depuis`

La mise à jour rend « ce qui a changé après cet événement ». Trois sortes de changements n'y figurent pas, alors que la chronologie complète du même pas les contient. Un panneau nourri seulement par `--depuis` garde donc un état faux jusqu'à la prochaine chronologie complète.

| Ce qui manque | Où on le voit | Combien |
|---|---|---|
| **Les pièces du dossier** qui changent d'état ou de repère (`a_completer` → `remplie`, la date git qui bouge) | `projet-type`, pas 04 (`piece:compte-rendu-idee`, `piece:prd`), 08, 10, 11 et 23 | 43 lignes |
| **Une ligne d'application** dont l'état change parce qu'une de ses fiches change (`application:bureau@4`, `en_cours` → `faite`) | `trois-applications` 09 | 1 ligne |
| **Les lignes à venir d'une fiche abandonnée** (`fiche:006-…@5` à `@8`) : elles disparaissent de la chronologie complète, mais `retirees` est vide | `trois-applications` 09 | 4 lignes |

Les deux premiers viennent sans doute de ce que ces changements ne suivent pas un événement du journal : les pièces vivent dans des fichiers, l'état d'une application se calcule depuis ses fiches. Le troisième semble un oubli de `retirees` à l'archivage ; c'est une supposition de l'atelier.

**Ce que l'atelier propose** (à toi de choisir) : que `--depuis` compare l'état calculé avant et après, et rende toute ligne changée, quelle qu'en soit la cause ; et que `retirees` liste toute ligne qui n'existe plus. En attendant, le planning applique le contrat à la lettre ; dans la galerie, un saut d'étape lui donne la chronologie complète, et l'étape suivante lui donne `depuis`, si bien qu'on voit ces écarts en jouant les étapes une à une.

## 2. Une pause qui commence « maintenant »

Une pause déduite d'un silence ou du dossier (`deduit`) a pour début l'heure du calcul : sa date `de` change d'un appel à l'autre (`projet-type` 04 : `14:12:10.901` dans la chronologie, `14:12:11.087` dans `depuis`, pour la même pause). Ça ne casse rien, puisque `regime` est rendu entier à chaque fois, mais la bande du régime se déplace à chaque mise à jour. Est-ce voulu, ou la pause devrait-elle commencer au dernier événement qui la précède ?

## 3. Des traits sans barre

La table des déclencheurs dit qu'un événement `trait: true` se dessine « sur la barre » de sa fiche ou de son lot. Dans les séquences, environ un quart des traits tombent hors de toute barre de leur référence exacte (84 sur 338 au dernier pas des quatre séquences) :

| Événement | Pourquoi il n'a pas de barre |
|---|---|
| `lot` (« Le lot … est prévu ») | Un lot prévu n'a pas de barre à l'étape 5, seulement `prevu_le` |
| `lot_etat` abandonné | Le lot était seulement prévu |
| `controle` après la remise des clés | La fiche est livrée : à l'étape 8, aucune barre |
| `dependance` juste après la fin du lot | 44 ms après la fin de la barre du lot |

Le planning pose donc chaque trait sur la ligne de sa référence exacte dont une barre le contient, sinon sur celle dont la dernière activité (début de barre, `prevu_le`, `livree`) le précède, à sa date. Aucun trait n'est perdu sur les quatre séquences. Si GDC voit une meilleure règle, ou préfère dire lui-même la ligne d'un trait (un champ `ligne` sur l'événement), le planning la suivra.

## 4. Pour information : ce que le planning a dû décider seul

Rien de cela n'est une demande ; c'est écrit pour que GDC sache ce que le panneau montrera.
- **Dans un jour actif**, les heures se lisent de la première à la dernière activité du jour, sur la largeur fixe du jour. Toutes les séquences sauf `projet-long` tiennent en quelques minutes d'un même jour : une échelle de 24 heures les écraserait en un point.
- **L'`id` d'un trait choisi** dans `gdc-select` (`{ id, ref, evt }`) est celui de la ligne qui porte le trait.
- **Un groupe de traits** (un jour trop étroit pour les séparer) ne se choisit pas : il dit son nombre et ses phrases au survol ; le fil donne chaque action.
- **Une ligne repliée** porte les jalons attendus de ses descendants, pour qu'une décision qui attend Pierre-Alain reste visible.
