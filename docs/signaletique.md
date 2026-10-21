# La signalétique du panneau

Le langage des signaux, à l'image des jeux de gestion et des interfaces de supervision : on comprend l'état d'un élément sans lire, et sans dépendre de la seule couleur. Ces principes sont des bonnes pratiques d'interface reconnues [I] ; la direction artistique les habille.

## Principes

1. **Trois indices pour un état** : une couleur, une forme et une icône (ou un mot). Une personne qui distingue mal les couleurs comprend quand même.
2. **Les couleurs d'état sont fixes** : le thème du projet ne les change jamais.
3. **Une seule priorité visible par élément** : s'il y a une alerte et un avertissement, on montre l'alerte, avec le total.
4. **Les badges comptent**, ils ne racontent pas : un nombre et une icône ; le détail s'ouvre au clic.
5. **Rien ne clignote en continu.** Une impulsion douce à l'apparition, puis un état fixe. Une seule exception, décidée par Pierre-Alain le 21 octobre 2026 : la roue dentée d'« Actif » tourne lentement tant que le travail dure, sans clignoter. Si l'utilisateur demande moins d'animations, rien ne bouge, la roue comprise.
6. **Ce qui t'attend est rouge, et seulement cela** : dans l'interface, le rouge de signalisation est réservé aux décisions attendues. Dans la scène, les couleurs d'état n'existent pas (bible, 17.3) : un signal 3D se reconnaît à sa forme, et le badge HTML posé sur son ancre porte la couleur.
7. **Inconnu n'est pas une erreur** : gris, pointillé, avec un point d'interrogation.

## Les états

| État | Couleur | Forme | Icône ou mot | Où on le voit |
|---|---|---|---|---|
| Actif | Bleu #2B7BD8 | Anneau plein | Roue dentée qui tourne lentement (fixe si moins d'animations) | Agent, lot, fiche |
| Attend ta décision | Rouge de signalisation | Panneau rectangulaire | Point d'exclamation blanc | Fiche, bureau du client, zone de réception |
| Bloqué | Jaune ambré #E0A100 | Triangle plein, bord sombre (panneau de danger, ISO 7010 W001) | Point d'exclamation **sombre** (encre), pour le contraste sur le jaune | Lot, agent |
| En erreur | Rouge foncé | Octogone ; en thème sombre, un liseré clair de 1 px (le rouge foncé ne fait que 2,1:1 sur le fond sombre ; décision de Pierre-Alain du 21 octobre 2026) | Croix | Contrôle, lot |
| Terminé | Vert #2F8A5C | Rond plein | Coche blanche | Lot, fiche, tâche |
| Inconnu | Gris | Anneau pointillé | Point d'interrogation | Agent, fiche |

## Les badges (HTML, posés sur les ancres)

| Badge | Contenu | Règle |
|---|---|---|
| Notification | Nombre, et l'icône du niveau le plus grave | Masqué à zéro |
| Avertissement | Nombre d'avertissements ouverts | Orange |
| Validé | Coche, sans nombre | Apparaît quand tout est prouvé |
| Progression | Barre et fraction (« 3 / 7 ») | La fraction vient du harnais ; jamais de pourcentage sans sa règle |

## Les signaux dans la scène (3D)

| Signal | Ce qu'il dit |
|---|---|
| Panneau rectangulaire sur poteau, avec son badge rouge | Une décision t'attend à cet endroit |
| Barrière de chantier, avec son badge orange | Un travail est bloqué |
| Cône posé sur la façade ou dans la pièce | Un défaut ouvert |
| Anneau de sélection | L'élément choisi, ou survolé |
| Gabarits plantés | Une fiche à l'étude : son volume futur |
| Échafaudage | Une fiche en construction |
