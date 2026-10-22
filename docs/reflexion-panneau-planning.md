# Réflexion : panneaux latéraux et planning en bas (côté maquettes)

Demande de Pierre-Alain du 22 octobre 2026. Ce document est une réflexion de l'atelier des maquettes, à croiser avec celle de GDC. Rien n'est décidé ni fabriqué.

## Ce que demande Pierre-Alain

1. **Inverser les panneaux latéraux** : l'arbre des fiches et des lots (`side-nav` 2.0.0), aujourd'hui à droite, passe à gauche ; le fil des déclencheurs (`trigger-feed`), aujourd'hui à gauche, passe à droite.
2. **Pouvoir fermer les panneaux latéraux.**
3. **Un panneau en bas avec un planning de type Gantt** : l'avancement des travaux, les étapes réalisées ou non, et la possibilité de naviguer depuis ce planning.
4. **Le planning est lié aux déclencheurs de la plateforme** : on navigue d'étape en étape, comme si on construisait un bâtiment. Le planning doit se voir.
5. **Le temps est raccordé à aujourd'hui**, le jour du développement ; les longues périodes sans activité se replient.

## Qui fait quoi

La mise en page du panneau de chantier appartient à GDC : « le panneau ne fait que dessiner avec les composants de l'atelier » (`docs/maquette.md` de GDC, ADR 0009). L'atelier livre les composants, et sa galerie ne fait qu'imiter le panneau pour les essayer ensemble (entrée « La ville », `src/gallery.js`).

| Sujet | Atelier des maquettes | GDC |
|---|---|---|
| Inverser les panneaux | La galerie suit, pour qu'on juge l'ensemble comme dans le panneau. Les composants ne supposent aucun côté : à vérifier sur `side-nav` et `trigger-feed` (bordure, sens des bulles, ombre portée) | La disposition du panneau |
| Fermer les panneaux | Les composants gardent leur état quand on les masque puis qu'on les réaffiche, et ils suivent un changement de largeur. Si on choisit un rail fermé avec un résumé, le résumé se fait avec ce qui existe (`notification-badge`, les signes de `src/signes.js`) | La poignée, l'état ouvert ou fermé, et sa mémoire par personne |
| Le planning | Un nouveau composant d'interface (fiche à proposer) | Les données : dates de chaque étape, décisions, lots |

## L'inversion des panneaux : mon avis

C'est une bonne idée. La navigation à gauche est la convention la plus répandue : on lit l'arbre, puis la carte. Le fil, qui raconte ce qui vient d'arriver, se lit comme une marge à droite. Le survol partagé (`hover-link`) relie déjà les trois dans les deux sens : il ne dépend pas des côtés.

Sur téléphone, les deux panneaux sont déjà repliables (`trigger-feed` montre sa dernière action, `side-nav` est rangée). Sur ordinateur, fermer un panneau rend de la place à la carte : utile sur le portable de 13 à 14 pouces, notre cas prioritaire (bible, 18.7).

## Le planning : ce que je propose

**Un composant HTML et SVG, jamais dans la 3D** (aucun texte dans la scène). Nom de travail : `site-schedule`, « Le planning du chantier ».

**Les lignes** : une par application, qui se déplie en fiches (une fiche est un étage), puis en lots (une pièce par lot). C'est la même hiérarchie que l'arbre, avec les mêmes identifiants et la même `ref` (`application`, `fiche`, `lot`).

**Les colonnes : le temps du développement, raccordé à aujourd'hui** (précision de Pierre-Alain du 22 octobre 2026). L'axe compte en jours réels, et son bord droit est le jour où l'on est. Les jours sans aucune activité ne prennent presque pas de place : une longue période où rien n'a été développé (un projet laissé de côté) se replie en une fine bande hachurée, qui porte au survol « 12 jours sans activité » et se déplie au clic. Les jours actifs gardent tous la même largeur. Ainsi, le planning se lit comme un chantier qui avance, sans grands vides. Un jour est actif dès qu'une action de GDC y est horodatée.

**Les barres** : une barre par fiche, découpée selon les dix étapes de GDC (`idee` à `transformations`).
- Une étape faite est pleine, dans un ton neutre ; l'icône de l'étape (`step-icons` 2.0) la nomme au survol et dans la version tableau.
- L'étape en cours porte le signe d'état de la signalétique (couleur, forme et icône) : c'est le seul endroit où la couleur d'état apparaît.
- Les étapes à venir sont seulement esquissées, sans date. **Rien n'est inventé** : tant que GDC ne connaît pas de date prévue, on n'en dessine pas.

**Les jalons** : tes décisions (on continue, le permis, le feu vert, la réception, la remise des clés) sont des jalons sur la ligne de leur fiche, avec la forme du panneau de décision. Une décision qui t'attend se voit tout de suite.

**Les pauses du chantier** (`chantier.regime`) : une bande grise discrète sur toute la hauteur.

**Les déclencheurs sur le planning** (précision de Pierre-Alain du 22 octobre 2026) : le planning est lié aux déclencheurs de la plateforme, comme le fil (`trigger-feed`). Chaque action de GDC porte `ts` et `ref` : elle se pose comme un petit trait sur la barre de sa fiche, à sa date. On voit ainsi où le travail s'est fait, et chaque passage d'étape est un déclencheur qu'on peut viser.
- Cliquer sur un trait, ou sur un passage d'étape, sélectionne cette action : le fil défile jusqu'à elle, la carte va au bâtiment et à l'étage concernés.
- Cliquer sur une ligne du fil fait l'inverse : le planning défile jusqu'à l'action et la marque.
- On navigue d'étape en étape au clavier, d'un passage à l'autre, comme on suit un chantier.
- Les traits d'un même instant se regroupent, et beaucoup de traits rapprochés se fondent en une densité, pour rester lisibles.

Le planning et le fil lisent donc les mêmes actions. Ce qui les relie reste le survol partagé (`hover-link`) et l'événement `gdc-select`, déjà livrés : aucune règle n'est écrite deux fois.

**La navigation** :
- Survoler une barre émet `gdc-hover` : la carte, l'arbre et le fil s'éclairent sur la même fiche.
- Cliquer émet `gdc-select` : la carte va au bâtiment et ouvre l'étage (`floor-selector`, `building-interior`).
- Un curseur de temps permettrait de « remonter le temps » et de rejouer la carte à une date passée. C'est la frise prévue par GDC (atelier 3, A3-13, lot P3). Je propose de le garder pour une seconde version : il demande que GDC sache calculer la scène à une date passée.

**Accessibilité** : une grille au sens ARIA, navigable au clavier ligne par ligne, avec une bascule « vue tableau » (fiche, étape, début, fin, état). Lisible à la largeur d'un portable. Sur téléphone, une liste par fiche plutôt qu'un Gantt.

**Le panneau du bas** : fermé par défaut ou ouvert sur une hauteur réduite (trois ou quatre lignes), qu'on agrandit. C'est la même poignée que les panneaux latéraux, côté GDC.

## Ce que l'atelier demande à GDC

1. **L'historique des étapes** : pour chaque fiche, la date d'entrée dans chaque étape (et donc sa sortie), et pour chaque lot sa date de début et de fin. Aujourd'hui, la scène donne l'état présent et les actions horodatées, pas cet historique résumé.
2. **Les décisions horodatées** : quand elle a été demandée, quand elle a été donnée.
3. **Les périodes du régime** : ouvert, pause, fermé, avec leurs dates.
4. **Une date prévue existe-t-elle** (estimation, échéance) ? Si non, le planning ne montre que le réalisé et l'étape en cours.
5. **Rejouer une date passée** : `gdc scene` peut-il rendre la scène telle qu'elle était à un `ts` donné ? C'est la condition du curseur de temps.
6. **La mise en page** : confirmer que la disposition, les poignées et la mémoire des panneaux sont dans le panneau de GDC.
7. **Les volumes réels** : combien d'applications, de fiches et de lots, sur combien de semaines, pour régler l'échelle et la lisibilité.
8. **Toutes les actions depuis le début du projet**, pas seulement celles du moment (`gdc scene --avant`) : le planning pose chaque déclencheur à sa date et calcule les jours actifs à partir d'elles. Si l'historique complet est trop lourd, GDC peut fournir à la place la liste des jours actifs et, pour les jours lointains, un résumé par jour.
9. **Le jour de référence** : l'heure de la machine de GDC fait foi pour « aujourd'hui », pour que la maquette et le harnais tombent sur le même jour.

## Ce que Pierre-Alain aura à trancher

1. **Le niveau affiché par défaut** : applications et fiches, avec les lots en dépliant (ma recommandation), ou tout de suite les lots ?
2. **Les étapes à venir** : esquissées sans date (ma recommandation), ou cachées jusqu'à ce que GDC fournisse des échéances ?
3. **Le curseur de temps** : dès la première version, ou dans une seconde (ma recommandation) ?
4. **Un panneau latéral fermé** : complètement caché avec un onglet, ou réduit à un rail fin qui garde ses badges ?
5. **Le panneau du bas au démarrage** : fermé ou ouvert à hauteur réduite ?
6. **Le seuil d'une période repliée** : à partir de combien de jours sans activité on replie (ma recommandation : deux jours et plus ; un jour isolé reste à sa largeur) ?

## La suite côté atelier

Une fois les retours de GDC croisés avec cette réflexion :
1. la fiche `site-schedule` est proposée au catalogue et validée par Pierre-Alain ;
2. la galerie inverse les panneaux et imite les poignées, ce qui ne touche aucun composant livré ;
3. les vérifications sur `side-nav` et `trigger-feed` (aucune supposition de côté, état gardé quand on masque) se font, avec une nouvelle version seulement si un composant doit changer.

`side-nav` 2.0.0 est en cours de fabrication : l'inversion ne change rien à sa fiche, elle se fera dans la galerie après sa livraison.
