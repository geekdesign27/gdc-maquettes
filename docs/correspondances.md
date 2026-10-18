# Correspondances : du harnais à la maquette

Ce que GDC enverra aux composants. Le projet n'a pas à le programmer, mais chaque état listé ici doit exister et être lisible.

## Entités et composants

| Dans le harnais | Composant | États utilisés |
|---|---|---|
| Une application du projet | `building` | selon l'étape la plus avancée de ses fiches |
| Une fiche à l'étude | `survey-poles` dans la pièce ou l'aile prévue | default |
| Une fiche en construction | pièce de `building-interior` | construction |
| Un lot en cours | `character` des développeurs, dans la pièce de la fiche | work, blocked |
| Une décision attendue | `decision-sign` et `client-office` | waiting |
| Une demande au carnet | caisse du `parking` | default |
| Un agent | `character` | idle, walk, work, wait, blocked, done, unknown |
| Une preuve enregistrée | impulsion du `control-office` | active |
| Une fusion vers dev | `crane` près du bâtiment | lifting |
| Un défaut ouvert | `defect-sign` sur la pièce | default |

## Étapes d'une application et états du bâtiment

| Étape la plus avancée de ses fiches | État de `building` |
|---|---|
| Aucune fiche commencée | plot |
| Première fiche aux plans d'exécution | excavation |
| Feu vert donné, préparation | foundations |
| Construction | structure (progress = lots terminés sur lots) |
| Réception en cours | inspection |
| Première fiche en production, d'autres en cours | finishing |
| Toutes les fiches en production | completed |
| Un défaut ouvert | l'état ne change pas ; `defect-sign` est posé sur la façade |

## Travail et tenue

Le nom affiché reste celui du métier du numérique (atelier 2) ; la tenue montre la nature du travail, comme sur un chantier. À valider avec Pierre-Alain.

| Agent | Travail | Tenue (`trade`) |
|---|---|---|
| Claire, l'architecte | Idée, plans, permis | architect |
| Marc, le géomètre | Relevé de l'existant | engineer |
| Lina, Paul, Iris, Noah, Tom, Sarah, David | Études (bureau d'études) | engineer, avec tablette |
| Yves, le conducteur de travaux | Planning des lots | engineer |
| Emma, développeuse interface | Écrans, interface | painter |
| Julie, développeuse base de données | Structure des données | mason |
| Robin, développeur serveur | Logique et connexions | electrician (ou plumber pour les flux de données) |
| Olivier, le surveillant de chantier | Relecture des lots | inspector |
| Anne, la commission de réception | Essais et réception | inspector |
| Bernard, le concierge | Production | concierge |
| Fanny, la représentante du client | Coût et contexte | representative |
