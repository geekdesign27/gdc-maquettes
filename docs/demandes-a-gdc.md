# Demandes de l'atelier des maquettes à GDC (le harnais)

Rédigé le 21 octobre 2026, à transmettre par Pierre-Alain à la session GDC qui refait le harnais. Ce dépôt ne touche pas au dépôt GDC.

**Le but** (vision de Pierre-Alain) : la carte du chantier visualise le harnais en vibecoding, comme un petit SimCity. Tout ce que fait le harnais doit y être visible et accessible, et les agents doivent le refléter : où ils travaillent, avec qui, sur quelle fiche, à quelle étape.

**La règle qui ne change pas** (`docs/ville.md`, ADR 0012) : GDC dit quoi et où, la maquette dit comment. **Rien ne bouge sans une action de GDC.** Chaque mouvement visible doit donc venir d'un fait du harnais que GDC émet.

## Ce que GDC envoie aujourd'hui

Constat tiré des 20 scènes de `fixtures/projet-type` (GDC 0.17.0, schéma 2) :

- `plan.rue` : huit lieux sur une rue ; `plan.parcelles` : une parcelle par application, avec ses pièces (une par fiche) ;
- `elements` : chaque élément, son état et sa source ; un personnage a un `role` et un `lieu` ;
- `actions` : 27 `change`, 13 `apparait`, 5 `disparait`, 1 `quantite`, **un seul `deplace`** ;
- les lieux de personnage utilisés : `bureau-architecte`, `bureau-etudes`, `bureau-controle`, `baraque`, `batiment:<app>` ;
- seulement quatre rôles apparaissent : `gdc` (Hélène), `architecte`, `designer`, `developpeur-interface`.

## 1. Le plan : quatre zones à la place de la rue

La carte n'est plus une rue (décision de Pierre-Alain du 21 octobre 2026, `docs/ville.md`). Elle compte quatre zones autour d'un carrefour, parcourues dans l'ordre : les bureaux, le chantier, la réception, la remise des clés et la garantie, puis les transformations, d'où une route ramène à l'architecte.

**Demandes** :
- remplacer `plan.rue` par `plan.zones` : `bureaux`, `chantier`, `remise`, `transformations`, chacune avec ses lieux ;
- ajouter les lieux qui manquent :

| Lieu à créer (`id` proposé) | Zone | Étape | Ce que c'est |
|---|---|---|---|
| `panneau-permis` (à déplacer) | bureaux | 3 | Le panneau du permis, sur le passage du bureau d'études vers le chantier (aujourd'hui sur `ancre: chantier`) |
| `panneau-feu-vert` | chantier | 4 | Le panneau de la décision « feu vert », entre les experts et les parcelles |
| `cabane-cles` | remise | 8 | Le conteneur de la remise des clés |
| `cabane-garantie` | remise | 9 | Le conteneur de la garantie |
| `cabane-transformations` | transformations | 10 | Le conteneur des transformations, à côté du carnet des demandes |

- **Question** : le bureau de contrôle (Hélène) et la baraque forment « les conteneurs des experts » de l'étape 4, dans le chantier. Est-ce juste côté harnais ?

## 2. Les dix étapes : un identifiant et un numéro fixés par GDC

Les étapes de Pierre-Alain sont :
1. l'idée ;
2. les plans ;
3. le permis ;
4. les plans d'exécution et le feu vert ;
5. la préparation ;
6. la construction ;
7. la réception ;
8. la remise des clés ;
9. la garantie ;
10. les transformations.

Les icônes du lot G7 ont pour identifiants provisoires `idea`, `survey`, `plans`, `permit`, `execution-plans`, `green-light`, `construction`, `reception`, `production` et `transformations`. Ce ne sont pas exactement ces dix étapes : il n'y a pas d'icône pour la préparation ni pour la garantie, et `survey` (le relevé du géomètre) n'est pas une étape.

**Demandes** :
- GDC fixe la liste des dix étapes : `id`, numéro, titre ;
- chaque scène indique l'étape de chaque bâtiment (`building.etape`) et de chaque fiche (`piece.etape`).

**Question** : à quelle étape commence le terrassement ? `docs/correspondances.md` le met à l'étape 4 (plans d'exécution). Pierre-Alain le place à la préparation (étape 5) : terrassement puis fondations.

## 3. Les bâtiments : un par application, et leur vie

`plan.parcelles` donne déjà une parcelle par application et une pièce par fiche : c'est bon.

**Demandes** :
- le **stade de chaque étage** (fondations, gros œuvre, second œuvre, fini) : la décision de Pierre-Alain du 21 octobre 2026 donne à chaque étage son propre stade. `building` 2.0.0 est en préparation ici ;
- le passage d'un bâtiment habité **en transformation** quand une nouvelle fiche y démarre (état `alteration`, avec échafaudages et cônes) ;
- un **défaut ouvert sous garantie** sur un bâtiment livré (le cône `defect-sign`) ;
- **Question** : un bâtiment livré reste-t-il sur sa parcelle du chantier, ou part-il dans un quartier habité ?

## 4. Les personnages : où, avec qui, pourquoi

Aujourd'hui, un personnage a un `lieu` et un état. Pour qu'on voie ce que fait le harnais, il faut en plus :

| Champ à ajouter | Exemple | Ce que la carte en fait |
|---|---|---|
| `lieu` à la pièce et à l'étage | `batiment:bureau/piece:001-cloturer-un-audit`, `etage: 2` | L'expert est dans la pièce de sa fiche, au bon niveau ; il est visible dans la vue en coupe |
| `avec` : les autres agents d'une même activité | `["architecte", "designer"]` | Une concertation : ils sont réunis dans le même bureau |
| `motif` d'un déplacement | `controle`, `question`, `consultation`, `remise`, `livraison` | Le chemin et l'animation à l'arrivée (inspecte, parle, célèbre) |
| `fiche` concernée | `001-cloturer-un-audit` | Le lien entre l'agent et sa fiche, accessible depuis la carte |

**Demandes de rôles** : seuls quatre rôles apparaissent dans les séquences. La carte en attend d'autres :
- Marc, le géomètre ;
- le bureau d'études au complet ;
- Yves et Victor (le conducteur et le chef de chantier) ;
- Julie et Robin (base de données, serveur) ;
- Olivier et Anne (la réception) ;
- Bernard (la production) ;
- Fanny (la représentante du client) ;
- le client.

Lesquels le harnais fait-il vraiment travailler, et à quelles étapes ? Et qui travaille aux étapes 8, 9 et 10 (la remise des clés, la garantie, les transformations) ?

## 5. Les déclencheurs à créer (actions)

Il n'y a qu'un seul `deplace` dans les vingt scènes. Pour que la carte vive, il faut que GDC émette ces faits :

| Action proposée | Quand le harnais la produit | Ce qu'on voit |
|---|---|---|
| `deplace` avec `de`, `vers`, `motif` | Un agent change de lieu | Il marche le long des voies, de porte à porte, puis prend son état |
| `consulte` : `id`, `aupres` | Un spécialiste a besoin d'un autre (une question, une revue) | Il va dans le bureau de l'autre, ils parlent, il revient |
| `controle` : `id`, `batiment`, `piece` | Hélène ou Olivier contrôle un lot ou une preuve | Il va sur le bâtiment, inspecte la pièce, revient |
| `question` : `id`, `a: architecte` | Une incertitude remonte à l'architecte | Il va chez l'architecte |
| `reunion` : `lieu`, `participants` | Une concertation (plusieurs agents sur la même décision) | Ils se rejoignent dans le bureau |
| `remise` : `batiment`, `participants` | La remise des clés (étape 8) | Le client, l'architecte et les spécialistes se réunissent à la cabane des clés |
| `demande` (`quantite` existe déjà) | Une nouvelle demande arrive au carnet | Une caisse arrive au carnet, la route repart vers l'architecte |

**Pour chaque action** :
- un **horodatage**, pour jouer les actions dans l'ordre ;
- une **durée prévue**, si GDC la connaît : la marche est plafonnée à quelques secondes.

**Question** : combien d'actions par minute au plus ? Pour ne pas saturer la carte, faut-il que GDC regroupe les actions, ou que la maquette les file à la suite ?

## 6. Les fiches accessibles depuis la carte

Pierre-Alain veut pouvoir ouvrir les fiches depuis la carte. Un clic sur un bâtiment ouvre sa vue en coupe (`building-interior`), avec une pièce par fiche et ses experts.

**Demandes** :
- pour chaque pièce : le titre de la fiche, son état (étude, attente, construction, réception, livré, défaut), son étape, ses lots faits sur le total ;
- un lien vers la fiche, ou son contenu, à montrer dans l'inspecteur du lot G6 ;
- un drapeau « livré » : « ce qui est livré, est livré », c'est-à-dire une fiche livrée reste visible et consultable. **Question pour Pierre-Alain** : la réflexion sur ce point est mise de côté ; ce drapeau suffit-il pour l'instant ?

## 7. Pour régler la maquette

- Une nouvelle séquence de `fixtures/` qui contient ces actions : consultations, contrôles sur le bâtiment, remise des clés, un projet à trois applications (AuditApp : webapp desktop, application terrain, webapp d'administration), et des bâtiments à des étapes différentes.
- Le numéro de schéma de la scène incrémenté (`schema: 3`), pour que la maquette sache ce qu'elle reçoit.

## Ce que l'atelier fera de son côté

Ce n'est pas commencé : les fiches sont à valider par Pierre-Alain (session proposée « La ville vivante »).
- **Le calcul des chemins** le long des voies, livré dans la bibliothèque pour GDC (choix de Pierre-Alain).
- **L'assemblage de la carte** depuis la scène de GDC.
- **La vue en coupe** au clic.
- **La lecture de ces actions**.
