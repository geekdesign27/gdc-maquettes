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

Le nom affiché reste celui du métier du numérique (atelier 2) ; la tenue montre la nature du travail, comme sur un chantier. Validé par Pierre-Alain le 19 octobre 2026.

| Personne | Travail | Tenue (`trade`) | Équipe (`team`, couleur du casque) | Casque | Accessoire |
|---|---|---|---|---|---|
| Le client (Pierre-Alain) | Décide : permis, feu vert, réception, remise des clés | client : tenue civile graphite | aucune | **non, le seul** | aucun |
| Claire, l'architecte | Idée, plans, permis | architect | architecture | oui | rouleau de plans |
| Marc, le géomètre | Relevé de l'existant | engineer | studies | oui | trépied de géomètre |
| Lina, Paul, Iris, Noah, Tom, Sarah, David | Études (bureau d'études) | engineer | studies | oui | tablette |
| Yves, le conducteur de travaux | Planning des lots | engineer, gilet orange | site | oui | tablette |
| Emma, développeuse interface | Écrans, interface | painter, gilet orange | site | oui | rouleau à peinture |
| Julie, développeuse base de données | Structure des données | mason, gilet orange | site | oui | truelle |
| Robin, développeur serveur | Logique et connexions | electrician, gilet orange | site | oui | câble |
| Olivier, le surveillant de chantier | Relecture des lots | inspector | reception | oui | planchette |
| Anne, la commission de réception | Essais et réception | inspector | reception | oui | planchette |
| Bernard, le concierge | Production | concierge | operations | oui | trousseau de clés |
| Fanny, la représentante du client | Coût et contexte | representative | client : casque blanc | oui | classeur |
| Victor, le chef de chantier (un programme) | Lance les équipes, tient les budgets, met de côté ce qui coince | foreman : bleu de travail, gilet orange | site | oui | talkie-walkie |
| Hélène, le bureau de contrôle (le binaire `gdc`) | Mesure, journal, elle seule dit « prouvé » | inspector | reception | oui | tampon (une forme, sans texte) |

- **Le casque** : tout le monde le porte, sauf le client. Il a donc la seule silhouette sans casque, celle de qui décide. L'OTConst (art. 6) impose le casque jusqu'à la fin du gros œuvre et près des grues et des engins : le client reste dans son bureau ou vient à la réception, et ne traverse jamais le chantier en cours.
- **Le gilet orange** : seulement l'équipe site, qui travaille près des engins (OTConst, art. 7).
- **Le casque blanc** de Fanny dit « côté client ». C'est un amendement à la bible, 18.8 (« casques de la couleur d'équipe »), validé par Pierre-Alain le 19 octobre 2026.
