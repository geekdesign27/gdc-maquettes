# Correspondances : du harnais à la maquette

Ce que GDC enverra aux composants. Le projet n'a pas à le programmer, mais chaque état listé ici doit exister et être lisible.

## Entités et composants

| Dans le harnais | Composant | États utilisés |
|---|---|---|
| Une application du projet | `building` | un étage par fiche, chacun à son stade (voir « Étapes d'une fiche et stade de son étage ») |
| Une fiche à l'étude | `survey-poles` dans la pièce ou l'aile prévue | default |
| Une fiche | un étage de `building` ; au clic, sa vue en coupe `building-interior`, une pièce par lot | le stade de l'étage |
| Un lot en cours | `character` des développeurs, dans la pièce du lot, à l'étage de sa fiche | work, blocked |
| Une décision attendue | `decision-sign` (forme) et `client-office`, badge rouge sur l'ancre | waiting |
| Une demande au carnet | caisse du `parking` | default |
| Un agent | `character` | idle, walk, work, typing, inspect, read, thinking, waiting, talk, celebrate, blocked, unknown |
| Une preuve enregistrée | impulsion du `control-office` | active |
| Une fusion vers dev | `crane` près du bâtiment | lifting |
| Une nouvelle dépendance, à la fin d'un lot | `delivery-truck` au bâtiment, dix minutes. Il ne vient que pour cela : le trafic d'ambiance, ce sont les voitures (`city-car`) | arriving |
| Un défaut ouvert | `defect-sign` sur la pièce | default |

## Le projet avant les fiches (GDC 0.16)

GDC calcule désormais la scène lui-même (`gdc scene`, depuis la version 0.16.1) : chaque élément avec son état et la source qui le justifie. Sa table des déclencheurs (`gdc scene --declencheurs`, et `docs/maquette.md` dans le dépôt GDC) dit, pour chaque événement du journal, quel élément il fait bouger ; un test de GDC refuse un élément ou un état absent de ce catalogue.

| Dans le harnais | Composant | État |
|---|---|---|
| Le projet n'est pas ouvert | `ground` seul | default |
| Le projet est ouvert | `building` pour chaque application du profil | plot |
| Claire travaille (activité enregistrée, même sans fiche) | `character` au `architect-office`, et le bureau | selon l'activité ; active |
| « On continue » ou le permis de construire prêt pour ta décision | `decision-sign` au `client-office` | default ; le bureau en waiting |
| Une décision du projet périmée (une pièce a changé) | `decision-sign` au `client-office` | default ; le bureau en waiting |
| Le dossier du projet | barre de progression de l'inspecteur, avec sa règle | « 5 pièces complètes sur 15 » |
| Le permis de construire accordé, puis périmé | `permit-board`, le panneau du permis à l'entrée du chantier (absent tant que le permis n'est pas accordé) | granted, expired |

**`permit-board`** entre au catalogue (lot G5) sur décision de Pierre-Alain du 19 octobre 2026.

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

## Les déplacements et leur motif

GDC envoie chaque déplacement (`deplace`, schéma 3) avec son lieu de départ, son lieu d'arrivée et, quand il en a un, son `motif`. L'agent marche le long des voies (`docs/ville.md`), puis prend l'état que GDC lui donne.

| Motif | Quand GDC l'émet | À l'arrivée |
|---|---|---|
| `decision` | Une décision t'attend : les agents de la fiche qui ne travaillent pas, et l'architecte, se rassemblent au lieu de la décision (le bureau du client pour « on continue » et le permis, le panneau du feu vert, l'aire de réception, la cabane des clés) | waiting, près du panneau |
| `controle` | Après une mesure, Hélène va inspecter l'étage de la fiche pendant deux minutes, puis rentre au bureau de contrôle | inspect, sur l'étage |
| `mission` | Un agent missionné (une délégation) part en consultation ; son retour le ramène | l'état reçu, par exemple thinking |
| aucun | L'agent change de lieu pour son travail (son rôle, la fiche ou le lot sur lequel il travaille) | l'état de son activité (table ci-dessus) |

## Étapes d'une fiche et stade de son étage

Le contrat de GDC (ADR 0013, schéma 3) fait de **l'étage le niveau de vérité** : une fiche est un étage du bâtiment de son application, la plus ancienne en bas ; un lot est une pièce de son étage (`etages` et `pieces` du bâtiment). Chaque étage a son stade, qui suit sa fiche. L'état global du bâtiment reste envoyé par GDC ; `building` 2.0.0 (lot G8) montre chaque étage à son stade.

| Étape de la fiche | Stade de son étage |
|---|---|
| Projet ouvert, aucune fiche encore | le bâtiment en `plot`, sans étage |
| Fiche ouverte, jusqu'au feu vert (4, les plans d'exécution) | `plot` : les gabarits (`survey-poles`) |
| 5 La préparation, dès le feu vert | `excavation`, puis `foundations` (les essais rouges) |
| 6 La construction | `structure` (progress = lots finis sur lots), `envelope` quand tous les lots sont finis, `finishing` pendant la relecture et les corrections |
| 7 La réception | `inspection` |
| 8 La remise des clés | `completed` : l'étage est fini et habité |
| 9 La garantie | `completed` ; un défaut ouvert ne change pas le stade : `defect-sign` est posé sur la façade |
| 10 Les transformations : une nouvelle fiche sur un bâtiment habité | La surélévation : un étage de plus en haut, qui repart de `plot` ; le bas reste `completed`. Il n'y a pas d'état `alteration` (décision de Pierre-Alain du 21 octobre 2026) |

Six étages sont visibles au plus : le rez regroupe les fiches livrées les plus anciennes ; s'il reste encore trop d'étages, les plus anciens s'y fondent aussi, et le rez prend l'aspect du moins avancé d'entre eux.

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
- **L'apparence** de chaque personne (morphologie, peau, coiffure et couleur des cheveux, barbe, lunettes, outil) est dans `components/kit/character-kit/equipe.json`. GDC la passe au composant `character` en paramètres (`trade`, `team`, `body`, `skin`, `hair`, `hairColor`, `beard`, `glasses`, `tool`) ; le composant ne sait pas qui il représente.
- **Le casque blanc** de Fanny dit « côté client ». C'est un amendement à la bible, 18.8 (« casques de la couleur d'équipe »), validé par Pierre-Alain le 19 octobre 2026.
