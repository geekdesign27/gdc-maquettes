# La ville autour : le plan (fiche `city-plan`, lot G9)

**Statut : règles validées par Pierre-Alain le 23 octobre 2026, fiche par fiche** (`catalogue.json`, lot G9 ; `docs/direction-artistique.md`). L'assemblage dans `src/ville/` viendra après la livraison de `city-map` (ordre ajusté du lot, accord de Pierre-Alain du 23 octobre 2026). Les cotes ci-dessous sont à confirmer sur la maquette en blanc (MB_21) avant l'assemblage.

Ce document complète `docs/ville.md` (le chantier, ses zones et ses chemins) et `docs/vie-du-chantier.md` (la vie du chantier). Il ne change rien au chantier.

## Ce que la ville est, et ce qu'elle n'est pas

- **Une ambiance.** Une ville fictive de Suisse romande, belle et un peu vivante. Elle n'ajoute **aucun fait du harnais** : GDC ne l'envoie pas, et rien n'y bouge pour dire quelque chose.
- **Sans signal.** Ni couleur d'état, ni texte, ni clignotement. Ni clic, ni badge, ni anneau de sélection, ni repère HTML : `cible()` rend `null` pour toute la ville, et un rayon la traverse comme le décor.
- **Dans le style WORKSITE.** 3D douce, palette, socle maquette. On ne copie pas SimCity.

## La grille

Les repères sont ceux de `src/ville/implantation.js` : en mètres, au sol (x, z). La caméra regarde depuis le coin +X +Z : +X descend vers la droite de l'écran, +Z vers la gauche.

| Élément | Cote |
|---|---|
| Pas de la grille | 50 m : un pâté de 40 m, une rue de 10 m (chaussée de 6 m et deux trottoirs de 2 m) |
| Place du chantier | 125 × 70 m, de x −0,5 à 124,5 et de z 5,5 à 75,5. Elle contient le plus grand terrain du chantier (124 × 67 m, huit applications sur deux rangées : `implantation(8, types)`) |
| Rue de ceinture | Elle fait le tour de la place, bande de 10 m juste à l'extérieur : x de −10,5 à −0,5 et de 124,5 à 134,5, z de −4,5 à 5,5 et de 75,5 à 85,5 |
| Pâtés | Deux rangées complètes de chaque côté de la rue de ceinture, séparées par une rue de 10 m |
| Ville entière | x de −100,5 à 224,5 et z de −94,5 à 175,5 : 325 × 270 m |
| Bord | Le bord du socle de `city-ground`, épais de 3 m (bible, 18.5, amendement du 23 octobre 2026) ; les rues y sont coupées net, comme sur une maquette |

Les pâtés font 40 m, sauf dans les deux bandes qui longent la place, où ils se partagent la longueur pour que les rues tombent juste :
- **au fond et devant** (le long de x, de −10,5 à 134,5, soit 145 m) : trois pâtés et deux rues ; une des deux rues tombe sur l'avenue nord (x = 27) ;
- **à gauche et à droite** (le long de z, de −4,5 à 85,5, soit 90 m) : deux pâtés et une rue ; une rue tombe sur l'avenue ouest (z = 26).

## Le raccord avec le chantier

- **Les deux avenues.** Les deux routes du carrefour du harnais (`X_ROUTE` = 27 et `Z_ROUTE` = 26) rejoignent la rue de ceinture et se prolongent dans la ville. Ce sont ses deux avenues principales : l'avenue nord (x = 27, vers −Z) et l'avenue ouest (z = 26, vers −X). Les deux sont au fond de la vue.
- **Les deux giratoires** (`road-kit`) : au premier carrefour de chaque avenue après la rue de ceinture, entre la première et la deuxième rangée de pâtés, vers (27 ; −49,5) et (−55,5 ; 26). Ils mordent sur l'angle de quatre pâtés. Décision de Pierre-Alain du 24 octobre 2026 : posé sur la ceinture, un giratoire de 26 m débordait d'environ 10 m sur la place du chantier et sur la voie du harnais. Le raccord entre la ceinture et les routes du carrefour reste un simple carrefour.
- **La séparation.** La circulation de la ville reste dans la ville et sur la rue de ceinture. Les routes entre les zones restent au harnais : le camion de livraison et les agents (`city-traffic`). Le raccord entre la ceinture et les routes du carrefour est une rue sans circulation de la ville.
- **La bande libre.** Tant que le chantier a quatre applications ou moins, la partie de la place qui n'est pas construite (en z, de 56 à 75,5) est un pré, avec une vingtaine d'arbres de `nature-kit`. Elle disparaît quand la cinquième application ouvre la deuxième rangée, sans que la ville bouge. Le pré vient de `city-ground`, les arbres sont un petit lot à part, refait seul.

## Les hauteurs

| Où | Ce qu'on y pose | Hauteur |
|---|---|---|
| Fond de la vue (−X, −Z : les bandes de gauche et du fond) | Immeubles (`apartment-kit`), villas, parcs | 19 m au plus |
| Côtés | Villas à rez et étage, quelques immeubles bas | 10 m au plus |
| Côté caméra (+X, +Z : les bandes de droite et de devant) | Villas à rez et combles, parcs, arbres | **8 m au plus** : rien ne cache les zones |

## Les pâtés

Environ trente pâtés, répartis par une graine (même graine, même ville) :
- environ 14 de villas (`villa-kit`), quatre à six par pâté, avec jardin, allée et haie de thuyas ;
- environ 10 d'immeubles (`apartment-kit`), deux ou trois par pâté, seulement au fond et sur les côtés ;
- 4 parcs (`nature-kit` : arbres, chemins en béton, bancs) ;
- une place bétonnée avec sa fontaine, sur l'une des avenues.

## La fabrication

- **Une fusion par matériau.** La ville est fixe : l'assemblage fusionne ses pièces par matériau à la construction, comme `floodlight` fusionne ses géométries. Seuls les vitres (`city-night`) et les voitures (`city-traffic`) restent instanciées.
- **Pourquoi pas des instances.** Mesures du modeleur du 22 octobre 2026, sur une ville de substitution : avec des instances, la ville coûte 61 appels de dessin et 56 dans l'ombre ; fusionnée, 14 et 9, pour le même temps.
- **Le découpage en tranches ne sert pas.** Le cadre iso touche 14 pâtés sur 32 : la ville se dessine en entier, même hors du cadre. Le critère porte donc sur les appels.

## Le zoom

- Le cadrage par défaut reste celui d'aujourd'hui, sur les quatre zones. La ville remplit les bords et déborde du cadre.
- On dézoome jusqu'à la ville entière (un zoom d'environ 0,27 du cadrage par défaut).
- **Sous 4 px par mètre**, les passants ne sont plus dessinés et les kits de la ville passent à leurs pièces basses. C'est une bascule globale selon le zoom de la caméra orthographique, sans coût par objet.

## Ce que l'hôte fait (à écrire dans `docs/contrat-composant.md` avec l'assemblage)

- **Le cadre de l'ombre** est calé sur l'empreinte au sol de la vue : environ ±75 m au cadrage par défaut, ±240 m au dézoom, sur une carte de 2 048 px, calé sur la grille des texels contre le scintillement.
- **La caméra** est reculée d'au moins 400 m, avec un plan lointain à 1 000 m : le coin avant de la ville ne doit pas être rogné.
- **Une image d'ambiance** ne refait pas l'ombre : `update(dt)` rend `"ambiance"` (`city-traffic`).

## Le budget de la ville (portable de référence)

| | Haute | Basse |
|---|---|---|
| Appels de dessin, passe principale | 20 | 15 |
| Appels de dessin, passe d'ombre | 12 | 0 |
| Triangles au dézoom complet | 250 000 (100 000 avec les pièces basses au loin) | 80 000 |
| Au cadrage par défaut | 20 appels de plus au plus ; 400 000 triangles par passe au plus, carte comprise | |

Chaque budget se mesure comme le constat D-1c : après la mise en route, sur la galerie, et un jour sur un vrai portable de 13 à 14 pouces.

## L'assemblage

`src/ville/ville-autour.js` donne le plan en nombres (`planVille(graine)` : le socle, la place, les rues, les raccords, les giratoires, et les pâtés avec leur type, leur côté et leurs volumes). La carte le pose avec l'option `villeAutour` de `creeCarte` ; absente, il n'y a pas de ville, et rien ne change pour GDC. `carte.villeAutour` rend le mode et le plan.

- `villeAutour: "blanc"` : la maquette en volumes simples (MB_21), validée par Pierre-Alain le 25 octobre 2026. Le grand terrain (`city-ground`), un maillage pour les rues et un pour les volumes : 6 appels de dessin et 1 716 triangles pour toute la ville. Dans la galerie : `?ville=blanc`, qui recule aussi la caméra (485 m, plan lointain à 1 000 m) et cale le cadre de l'ombre sur la vue.
- Mesure du 25 octobre 2026, galerie, 1280 × 690, de jour (indicative, sans frein processeur) : `trois-applications` 08, 1 368 → 1 451 appels ; `volume` 4, 1 198 → 1 480. La ville n'en prend que 6 : le reste vient de l'ombre calée sur la vue, qui fait porter leur ombre aux objets du chantier sortis de l'ancien cadre de ±30 m.

## L'ordre de fabrication (ajusté le 23 octobre 2026)

1. Ces règles.
2. Les kits, chacun dans son dossier : `city-ground`, `road-kit`, la planche de palette puis `nature-kit`, `villa-kit`, `apartment-kit`.
3. Après la livraison de `city-map` : l'assemblage de la ville dans `src/ville/` (maquette en blanc d'abord, MB_21), puis `city-night` et `city-traffic`.
