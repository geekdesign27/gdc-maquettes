# La vie du chantier : ouvriers, engins, portails et zones

**Statut : direction artistique du 21 octobre 2026 ; les choix de la fin du document sont de Pierre-Alain, le même jour.** Rien n'est fabriqué. Ce document complète `docs/ville.md` (la carte, les chemins, les actions des agents) ; ce qu'il attend de GDC est repris dans `docs/demandes-a-gdc.md`, section 8.

## Ce que Pierre-Alain demande

Humaniser la maquette : dès qu'une application se construit, une vraie petite vie se lance sur le chantier.
- Des ouvriers en casque gris et gilet jaune vont d'un point à un autre pour faire quelque chose, et ce travail correspond à l'étape du chantier.
- Les personnes qu'on voit travailler sont peut-être les chefs d'équipe.
- Le camion se déplace de temps en temps.
- Quand un bâtiment est terminé, il y a moins de monde ; quand il est habité, des gens entrent et sortent.
- Quand aucun projet ne tourne, le chantier est fermé : personne, portails fermés, rien ne bouge.
- Les zones qui n'ont jamais été activées sont en noir et blanc.
- La maquette fait la direction artistique ; GDC fait les déclencheurs. Les deux se coordonnent.

## 1. Le principe : deux sortes de mouvement

| | Les agents | La vie du chantier |
|---|---|---|
| Qui | Hélène, l'architecte, Julie, Victor… : un personnage par agent du harnais | Les ouvriers, les usagers, le trafic d'ambiance |
| Qui décide | GDC, action par action (`docs/ville.md`) | La maquette, à partir de l'état envoyé par GDC |
| Ce que ça dit | Un fait du harnais : qui travaille, où, dans quel état | Rien de plus que l'état reçu : elle l'illustre |
| Dans l'interface | Portrait, badge, nom au survol, clic vers la fiche | Ni badge, ni nom, ni clic, ni anneau de sélection |

Les agents sont les **chefs d'équipe** : ce sont eux qu'on suit et qu'on ouvre. Les ouvriers sont leur équipe : ils arrivent avec eux et repartent avec eux.

**Amendement proposé à `docs/ville.md`** (section « Les interdits »). Elle dit aujourd'hui : « Aucun mouvement de décor sans action de GDC ; aucune animation d'ambiance qui suggère une activité. » Texte proposé :

> La vie du chantier naît de l'état envoyé par GDC et s'éteint avec lui : le régime du chantier, la phase de chaque bâtiment, les agents présents sur chaque parcelle. Elle n'ajoute aucun fait. Elle ne porte aucune couleur d'état, aucun badge, et ne s'ouvre pas au clic. Sans projet en cours, rien ne bouge.

## 2. Le régime du chantier

GDC donne un régime à tout le chantier (demande 8.1). La maquette en tire tout le reste.

| Régime | Quand (côté harnais) | Ce qu'on voit |
|---|---|---|
| **Fermé** | Aucun projet en cours, rien ne tourne | Portails fermés, personne dehors, engins à l'arrêt, rien ne bouge. Les bâtiments gardent leur état (un bâtiment habité garde ses fenêtres éclairées) |
| **Ouverture** (passage) | Un projet démarre ou reprend | Le portail s'ouvre une fois ; les ouvriers sortent du conteneur-vestiaire et rejoignent leur parcelle |
| **Ouvert** | Au moins un agent travaille | La vie de chaque bâtiment selon sa phase (section 4) |
| **En pause** | Le harnais attend une décision de Pierre-Alain et plus personne ne peut avancer | Le chantier s'arrête : les ouvriers quittent leur poste, sortent par le portail, qui se referme derrière eux, et se rassemblent devant le cabanon de la fête (`party-shed`), au fond de la zone des transformations (choix de Pierre-Alain du 23 octobre 2026) ; ils y parlent et attendent (`talk`, `idle`, jamais `celebrate`), sous la lanterne qui tourne. Le badge rouge reste dans l'interface. Choix de Pierre-Alain du 21 octobre 2026, avec les fiches du lot G8 ; il remplace « ils attendent sur place » |
| **Fermeture** (passage) | Le projet se termine ou s'arrête | Les ouvriers rentrent au vestiaire par le portail, puis le portail se ferme |

Un lot bloqué (la barrière `blocked-sign`) ne change pas le régime : seule l'équipe de ce bâtiment s'arrête et attend près de la barrière.

## 3. Les ouvriers

**La tenue** : bleu de travail graphite, **casque gris #8E959C** (devenu le gris chaud #8C807A à la fabrication, le 23 octobre 2026 : #8E959C était à ΔE 1,7 du gris de l'état « Inconnu »), **gilet jaune fluo #D7EC23** à bandes claires. Le jaune fluo fait partie des couleurs admises pour la haute visibilité (Suva : « orange, jaune ou rouge », bible 18.8).

**Pourquoi ces deux couleurs fonctionnent** (écarts ΔE 2000, mesurés comme en 18.8) :
- un agent porte le casque de son équipe et, pour l'équipe site, le gilet orange #FF6A13 ; un ouvrier porte le casque gris et le gilet jaune ; on les distingue d'un coup d'œil (gilet jaune et gilet orange : 50,9) ;
- le gilet reste loin de l'orange des engins (30,5) et du jaune ambré « bloqué » de l'interface (26,0) ;
- le casque gris se détache du béton (19,6) et de l'enrobé (18,9), mais peu de l'acier des échafaudages (7,9) ; sur l'échafaudage, c'est le gilet qui porte la lecture ;
- **point de vigilance** : le gilet jaune fluo n'est qu'à 13,2 du casque jaune de l'équipe site (#EBCB2E). Ce n'est pas la même pièce (gilet sur le torse, casque sur la tête), et les deux restent du côté « chantier ». Une planche le vérifie : agent de l'équipe site, ouvrier, barrière de blocage et grue côte à côte ;
- l'ouvrier ne se confond pas avec un agent en état `unknown` : celui-ci est entièrement grisé et immobile, alors que l'ouvrier ne grise que son casque, porte un gilet vif et bouge.

**Les visages** : morphologie, peau et coiffure tirées du même kit que les agents (`equipe.json`), dans un ordre fixé par une graine. Les ouvriers ne sont pas tous pareils, et la même scène donne toujours les mêmes ouvriers.

**La lecture reste aux agents** : un ouvrier ne joue jamais `celebrate`, `blocked` ni `unknown`, et n'entre jamais dans un bureau. Sur un chemin, il s'écarte pour laisser passer un agent.

## 4. Le travail des ouvriers, phase par phase

Les animations existent (`walk`, `work`, `inspect`, `talk`, `waiting`, `idle`) ; **porter** (`carry`, un sac de ciment tenu devant le ventre) est livrée avec `character` 1.2.0 et sert aux trajets du stock vers le poste et vers la benne. Chaque ouvrier enchaîne de petites tâches de 8 à 20 secondes, avec des pauses. Une graine propre au bâtiment et à sa phase les décale, pour que deux ouvriers ne soient jamais synchronisés.

| Phase du bâtiment | Ouvriers | Ce qu'ils font | Engins |
|---|---|---|---|
| Permis accordé (gabarits) | 0 | Personne : la parcelle attend | — |
| Terrassement | 2 | Un signaleur reste près de la pelle et parle à la radio ; l'autre contrôle le niveau au bord de la fouille | La pelle creuse (son état) |
| Fondations | 2 | Ils portent les planches de coffrage du stock à la fouille, puis travaillent au sol | — |
| Structure | 3 | Un ouvrier au pied de la grue ; deux travaillent sur l'échafaudage, au niveau en cours ; trajets du stock au pied du bâtiment | La grue au repos, sauf quand GDC la fait lever |
| Murs fermés | 3 | Ils travaillent sur l'échafaudage à différents niveaux ; un aller-retour vers la benne de tri | — |
| Second œuvre | 2 à 3 | Ils entrent et sortent par la porte du bâtiment ; un porte des déchets à la benne | — |
| Réception | 1 | Il attend près de la porte : ce sont les agents de la réception qui travaillent | — |
| Terminé, habité | 0 | Plus d'ouvriers : ce sont les usagers (section 5) | — |
| Transformation (à venir) | 2 | Sur l'échafaudage remonté | — |

**Les ouvriers suivent leurs chefs** : ces effectifs valent quand au moins un agent travaille sur la parcelle. Sans agent sur la parcelle, l'effectif tombe à un ouvrier, qui range. Quand Victor, le chef de chantier, est actif, il passe d'un bâtiment à l'autre.

**Les plafonds** (le budget de la scène) :
- 4 ouvriers par bâtiment, 12 sur toute la carte ;
- en qualité basse : 1 par bâtiment, 4 au total ;
- avec moins d'animations (`reducedMotion`) : les ouvriers sont posés à leur poste, dans une posture fixe, sans trajet.

Ces plafonds sont à mesurer. Un personnage coûte jusqu'à 8000 triangles, et la scène d'AuditApp tourne déjà à 53,8 images par seconde.

**Les chemins** : les règles des agents s'appliquent (`docs/ville.md`). Les ouvriers restent dans la clôture, sauf à l'ouverture et à la fermeture, et ne traversent pas une autre parcelle que la leur.

## 5. Les usagers des bâtiments habités

Quand un bâtiment est terminé, un à trois usagers en tenue de ville entrent et sortent par sa porte, à intervalles espacés. Ils ne vont nulle part ailleurs : de la porte au bord de la parcelle, et retour.

**Conflit à trancher** : `docs/correspondances.md` réserve au client la seule silhouette sans casque, celle de qui décide. Des usagers sans casque la concurrencent. Trois issues :
1. des usagers sans casque, mais seulement autour des bâtiments habités, où le client ne va pas ;
2. pas d'usagers : la vie d'un bâtiment habité se lit à ses fenêtres éclairées et à sa porte qui s'ouvre de temps en temps ;
3. des usagers, et le client distingué autrement (proposition à faire).

**Décision de Pierre-Alain du 21 octobre 2026 : la première.** Des usagers sans casque, seulement autour des bâtiments habités. Où va un bâtiment livré reste une question ouverte (demande 3).

## 6. Les engins et le camion

Deux engins ont déjà un sens, donné par le catalogue :
- **la grue qui lève** : la fusion vers dev, à la réception ;
- **le camion de livraison** : l'arrivée d'une nouvelle dépendance, un événement à surveiller pour la sécurité.

Les faire bouger pour l'ambiance effacerait ce sens. Proposition :
- la grue et le camion de livraison ne bougent que sur une action de GDC ;
- **le trafic d'ambiance**, ce que Pierre-Alain appelle le camion qui passe de temps en temps, est un autre véhicule, à ajouter au catalogue. Un camion-benne évacue la terre pendant le terrassement et apporte le béton aux fondations, ou une fourgonnette d'entreprise passe pendant le second œuvre. Il n'entre que si le régime est ouvert et si un bâtiment est dans la bonne phase, au plus une fois par minute ou deux.

**Décision de Pierre-Alain du 21 octobre 2026 : un second véhicule, pour l'ambiance.** Le camion de livraison garde son sens. Le choix du véhicule (camion-benne ou fourgonnette) se fera à sa fiche au catalogue.

## 7. Les portails

Le portail de la clôture (`site-fence`, `gate`) est aujourd'hui toujours ouvert. Il lui faut deux états, **ouvert** et **fermé**, avec une rotation douce des vantaux (environ 1,5 seconde, une fois) au passage, et l'état final directement si `reducedMotion`. `site-fence` est livré : il faut une nouvelle version (1.1.0) et une ligne au journal des versions.

## 8. Les zones jamais activées, en niveaux de gris

Demande de Pierre-Alain du 21 octobre 2026. Tant qu'aucun projet n'a atteint une zone, elle est **désaturée** : en niveaux de gris, mais présente et lisible. Ses formes se lisent sans couleur, comme sur la capture des valeurs de la bible. La première fois qu'un projet l'atteint, la couleur arrive une seule fois (un fondu d'environ 1,5 seconde), puis reste **pour toujours** (décision de Pierre-Alain du 21 octobre 2026) : la carte ne repasse pas en gris quand un nouveau projet commence.

| Zone | S'active quand un projet atteint |
|---|---|
| Bureaux | L'étape 1, l'idée |
| Chantier | L'étape 3, le permis |
| Réception, remise des clés et garantie | L'étape 7, la réception |
| Transformations | L'étape 10, les transformations |

**Ce que ça dit** : « cette partie de la ville existe, on n'y est jamais allé ». On voit tout le parcours dès le premier jour, et la carte se colore au fil des projets, comme une ville qui s'ouvre.

**Les garde-fous de signalétique** :
- le gris de zone n'est pas l'état « Inconnu » : celui-ci est un anneau pointillé et un point d'interrogation sur un agent ou une fiche, dans l'interface. Un agent n'est jamais grisé, même dans une zone grise : il garde toujours ses couleurs (décision de Pierre-Alain du 23 octobre 2026, après la revue DA). GDC peut en effet placer un agent dans une zone qu'aucun projet n'a encore atteinte : Hélène, le programme `gdc`, travaille au bureau de contrôle dès l'étape 01, dans le chantier encore gris. Seuls les lieux, le décor et le sol prennent le gris de la zone ;
- les repères HTML (numéros d'étapes, nom de la zone) restent lisibles et prennent un ton atténué dans l'interface, sans couleur d'état ;
- la bordure peinte au sol de la zone devient grise elle aussi.

**Comment** : c'est l'assemblage de la carte qui désature les matériaux d'une zone (des copies des matériaux, mélangées vers leur luminance). Les composants n'en savent rien et restent sans logique métier, comme le veut le contrat.

## 9. Qui fait quoi

| GDC envoie (déclencheurs) | La maquette fait (direction artistique) |
|---|---|
| Le régime du chantier, et les passages d'ouverture et de fermeture | Le portail, l'arrivée et le départ des ouvriers, l'arrêt de tout mouvement |
| La phase de chaque bâtiment (existe) | Les tâches des ouvriers, leur effectif et le trafic d'ambiance |
| Les agents présents sur chaque parcelle (existe : `lieu: batiment:<id>`) | L'équipe qui les accompagne |
| L'attente d'une décision | La pause des ouvriers |
| Les zones déjà activées | La désaturation, puis la couleur qui arrive |
| Les actions horodatées des agents (`docs/ville.md`) | Les chemins, les animations, la priorité des agents sur les chemins |

GDC n'envoie jamais d'ouvriers : ils n'existent pas dans `elements`. La maquette ne crée jamais d'agent et ne change jamais un état.

## 10. Ce qu'il faudra fabriquer, si c'est validé

- `character-kit` : la tenue d'ouvrier (casque gris, gilet jaune) et l'animation `carry`. C'est une nouvelle version du kit, avec une ligne au journal des versions.
- `character` : le métier `worker`, et `civilian` si les usagers sont retenus.
- `site-fence` 1.1.0 : les états `open` et `closed`.
- Peut-être un véhicule d'ambiance (section 6), au catalogue.
- Le module de vie du chantier dans la bibliothèque livrée à GDC, avec le calcul des chemins (session « La ville vivante »).
- Une planche de lecture (agent site, ouvrier, barrière, grue) et une mesure de fluidité à 12 ouvriers.

## Décisions de Pierre-Alain (21 octobre 2026)

1. La vie d'ambiance est voulue (sa demande du jour) : l'amendement de la section 1 la permet, à condition qu'elle naisse de l'état envoyé par GDC. Le texte est à reporter dans `docs/ville.md` quand la vie du chantier sera fabriquée.
2. Le camion : un second véhicule pour l'ambiance ; le camion de livraison garde son sens (section 6).
3. Les usagers : sans casque, seulement autour des bâtiments habités (section 5).
4. Les zones grises : une zone activée reste en couleur pour toujours (section 8).
5. Le régime « en pause » : gardé (section 2).

## Questions encore ouvertes

- Un bâtiment livré reste-t-il sur sa parcelle (demande 3 à GDC) ? Les usagers en dépendent.
- Le véhicule d'ambiance : camion-benne, fourgonnette, ou les deux selon la phase.
