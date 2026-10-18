# Correspondances : du harnais à la maquette

Ce que GDC enverra aux composants. Le projet n'a pas à le programmer, mais chaque état listé ici doit exister et être lisible.

## Entités et composants

| Dans le harnais | Composant | États utilisés |
|---|---|---|
| Une application du projet | `building` | selon l'étape la plus avancée de ses fiches |
| Une fiche à l'étude | `survey-poles` dans la pièce ou l'aile prévue | default |
| Une fiche en construction | pièce de `building-interior` | construction |
| Un lot en cours | `character` des développeurs, dans la pièce de la fiche | work, blocked |
| Une décision attendue | `decision-sign` (forme) et `client-office`, badge rouge sur l'ancre | waiting |
| Une demande au carnet | caisse du `parking` | default |
| Un agent | `character` | idle, walk, work, typing, inspect, read, thinking, waiting, talk, celebrate, blocked, unknown |
| Une preuve enregistrée | impulsion du `control-office` | active |
| Une fusion vers dev | `crane` près du bâtiment | lifting |
| Un défaut ouvert | `defect-sign` sur la pièce | default |

## Les lieux et les familles de la bible

Voir la bible, 17.2 : bureau d'architecte (`BLD_ARCHITECT`), bureau d'études (`BLD_ENGINEERING`), bureau du client (`BLD_CLIENT`), bureau de contrôle (`BLD_QA`), baraque du conducteur de travaux (`BLD_COORDINATION`), le chantier et ses bâtiments d'application (`BLD_DEVELOPMENT`), l'aire de réception (`BLD_DELIVERY`).

## Ce que fait un agent et son animation

GDC lit l'activité des agents (`gdc activite`, ou `activites` dans `gdc etat --json`, depuis la version 0.12.0) et la traduit en état du composant `character`. Le vocabulaire de gauche est celui du harnais.

| Activité dans GDC (`etat` / `action`) | État de `character` |
|---|---|
| `travaille` / `ecrit` | typing |
| `travaille` / `lit` | read |
| `travaille` / `controle` | inspect |
| `travaille` / `reflechit` | thinking |
| `travaille` / `echange` ou `delegue` | talk |
| `travaille` / `execute`, ou sans action | work |
| `attend` | waiting |
| `bloque` | blocked |
| `fini` | celebrate (une fois), puis idle |
| `inconnu` (aucune nouvelle depuis le délai) | unknown |
| L'agent change de lot ou de fiche (`sur`) | walk, le temps que GDC le déplace |

## Étapes d'une application et états du bâtiment

| Étape la plus avancée de ses fiches | État de `building` |
|---|---|
| Aucune fiche commencée | plot |
| Première fiche aux plans d'exécution | excavation |
| Feu vert donné, préparation | foundations |
| Construction | structure (progress = lots terminés sur lots) |
| Construction, gros œuvre terminé | envelope |
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
