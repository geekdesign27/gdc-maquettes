# Journal des sessions

## 2026-10-25 — MacBook-Pro-de-Pierre-Alain-2 — main

**Où on en est**
Les lots G0 à G9 sont fabriqués : 62 éléments livrés, 2 à faire. Le planning de type Gantt (`site-schedule`), le rail des panneaux et le fil des déclencheurs 1.1.0 sont faits sur les séquences de GDC 0.20. La ville fictive autour du chantier (lot G9) est livrée : terrain, routes, nature, villas, immeubles, nuit, circulation.

**Fait et vérifié**
- `npm run check` : 56 conformes, 0 en erreur ; carte vivante 41 100 vérifications et plus ; `npm run build` passe.
- Fluidité : registre des matériaux (166 → 59), `building` 2.1.0 (226 maillages → 31), ombre une image sur deux, un squelette par personnage ; la carte tourne à 58 images/s une fois lancée, processeur ralenti ×4.

**Reste à faire**
- Pierre-Alain : valider `site-schedule` (planche de neuf questions, session « Planning I-6 et I-7 ») et la scène de référence ; transmettre à GDC `docs/planning-retour-atelier-I6-I7.md` et la réponse de l'atelier dans `docs/gdc-0.22-pour-l-atelier.md` ; mesurer la carte avec la ville sur le portable de 13 pouces.
- Décisions en attente : points de DA « à revoir plus tard » (`docs/planning-plan-atelier.md`, section 7). D-1c est tranché le 25 octobre : correction 3 faite, 2 en réserve (à sortir selon la mesure du 13 pouces), 5 écartée.
- GDC 0.22.3 fusionné ; P1 (données de l'inspecteur), P2 (`agent-popup` 1.2.0, livré) et le code court (inspecteur) décidés : GDC doit porter `code` et l'outil dans la scène.
- Seconde version : le rejeu de la carte à une date passée, avec l'option `instant` par la carte (`update(grand dt)`, décision du 25 octobre).

**Décisions prises**
- Planning : Gantt par étapes, futur sans date (deux jours actifs par étape), jours vides repliés, rail fin, arbre à gauche et fil à droite (dernière passe de GDC, 22 octobre).
- Carte : deuxième rangée de parcelles au-delà de 4 applications, grille de 6 panneaux de décision au plus, 13 projecteurs (densité moyenne), repère d'agent plafonné à 80 px.
- Ville : environ 30 pâtés autour d'une place de 125 × 70 m réservée au chantier, caméra par défaut sur les zones, 6 voitures et 6 passants au plus.

**Pièges rencontrés**
- Plusieurs sessions dans le même dossier : une a lancé `git reset` sur des fichiers partagés et vidé l'index d'une autre (commit `b51b376`, réparé par `25acd4b`). Règle : indexer seulement ses lignes, jamais `git add -A` ni `git reset` sans restaurer.
- Un changement de palette réexporte tous les GLB : le faire seul, quand aucune autre session n'exporte.

**Prochaine action**
Répondre à la planche du planning, puis pousser `main`.

## 2026-10-20 16:13 — MacBook-Pro-de-Pierre-Alain-2 — main

**Où on en est**
Lot G1 : les bureaux sont des conteneurs de chantier. container-kit (v003), site-container et les cinq bureaux sont livrés. Le parking a son brief (`brief-parking.md`, notes partagées) ; il attend la réponse de PA à deux questions.

**Fait et vérifié**
- `npm run check` : 13 conformes, 0 en erreur, 15 à faire (sur 28). Chaque livraison est validée par PA sur planche (notes partagées `local_fa9d6b50…`).
- Kit v003 utilisé partout ; la grue passe en v003 (pivots replacés, rendu identique à l'écran).
- Pas vérifié depuis la fusion : `npm run build` (3,25 Mo la dernière fois), le thème sombre sur les derniers bureaux.

**Reste à faire**
- Parking : trancher `capacity` (reco : nombre de places marquées, donc seuil de la pile) et l'ancre des caisses (reco : `item:n` plus une ancre `pile` séparée, plutôt que `item:pile`). Amender la fiche depuis la session de PA, puis la session G1 fabrique.
- Personnage maître v002 (demande de PA, transmise le 20 octobre) : arrondir vers REF_CHR_001 (tête plus large, jambes un peu plus courtes, membres moins filiformes), supprimer l'arête au bassin, toujours 5 têtes. Il est livré : il faut donc `CHR_BASE_MASTER_v002` et une ligne au journal (règle 7). Revérifier character, les bureaux et site-office, puis montrer une planche avant/après. Prévu dans une session dédiée.
- Puis reception-area, site-fence, waste-skip (couleurs des bennes : amendement de palette en attente).
- Dette : qualité basse du kit de bâtiment ; en thème sombre, le cadre graphite des conteneurs se fond dans le fond.

**Décisions prises**
- Un bureau = un conteneur 20 pieds agrandi × 1,2 (7,20 × 3,00 × 3,00 m) ; plusieurs conteneurs en grappe côte à côte, jamais en ligne.
- Coupe « maison de poupée » : sans toit, mur avant à 0,90 m, sans longeron haut avant (captures A/B/C, MB_13). Les conteneurs sans occupants restent fermés.
- Les occupants sont placés aux ancres `desk:n`. Hélène a un poste, Victor a un corps (desk:2 sur la coursive), les agents de passage vont aux places `crew:1-6` devant le planning.
- Aucune couleur d'état dans la 3D : en `waiting`, le bureau du client affiche une feuille ; en `error`, le contrôle couche son trépied. Le rouge reste dans le badge HTML.

**Fichiers touchés**
- `catalogue.json`, `CHANGELOG.md`, `docs/catalogue.md`, `moodboard/prompts.md` (MB_13–16).
- Session G1 : `blender/assets/container-kit.py`, `components/site/*`, `src/gallery.js`, `src/personnage.js`.

**Pièges rencontrés**
- Un accord de PA relayé par une autre session est refusé par le contrôle de permissions de la session G1. Les modifications de catalogue se font donc depuis la session où PA parle.
- Ne pas enchaîner un `git commit` sur une commande qui peut échouer, dans un dossier partagé : on a commité par erreur le catalogue en cours de la session G1 (9b3bdc0, contenu correct).

**Prochaine action**
Réponds aux deux questions du brief du parking, puis renvoie la session G1 fabriquer.

## 2026-10-19 09:58 — MacBook-Pro-de-Pierre-Alain-2 — main

**Où on en est**
Les trois étalons sont livrés (kit de bâtiment, personnage `character-kit` et composant `character`, grue v002). Le lot G1 est lancé dans la session « Lot G1 : les lieux du parcours, dans l'ordre », qui attend l'accord de PA sur le brief d'architect-office.

**Fait et vérifié**
- `npm run check` : 6 conformes, 0 en erreur, 20 à faire. `npm run build` passe (`dist/maquettes.js` fait 2,4 Mo, à cause des 14 GLB du personnage).
- Personnage : 20 personnes (`components/kit/character-kit/equipe.json`), toutes conformes au contrat en 4 contextes, de 4 876 à 7 584 triangles et 6 matériaux au plus.
- Grue v002 : 8 488 triangles à 14 m, 14 824 à 30 m, 2 212 en qualité basse ; ancres vérifiées dans Node à 6, 14 et 30 m.
- Galerie : planche « L'équipe », composant seul, grue en planche, tous regardés.

**Reste à faire**
- Répondre au brief d'architect-office (notes partagées, `brief-architect-office.md`), puis laisser la session G1 enchaîner les onze lieux.
- Corriger `commun.pivot` avec parent (bogue ci-dessous), avec l'accord de PA : cela oblige à reconstruire tous les GLB.
- Dette : qualité basse du kit de bâtiment (v002).

**Décisions prises**
- Une personne = un personnage : l'équipe se lit au casque et au gilet, le métier à la tenue et à l'outil (MB_05). Femmes et hommes (clé de forme FEMININE), teints et coiffures variés.
- Un GLB par métier, plus la base, les coiffures et les outils. Les couleurs de peau, de cheveux et d'équipe sont échangées à l'assemblage, pour rester sous 6 matériaux.
- Le composant `character` prend l'apparence en paramètres (`body`, `skin`, `hair`, `hairColor`, `beard`, `glasses`, `tool`) ; GDC les lit dans `equipe.json`.
- Ceinture à outils et gilet du contrôleur ajoutés en version simplifiée (amendement au mood board).

**Fichiers touchés**
- `blender/assets/character-kit.py`, `blender/assets/crane.py`, `blender/construit.py` (VARIANTES), `scripts/check-components.mjs`.
- `components/character/character/` (index.js, habillage.js), `components/kit/character-kit/*`, `components/machine/crane/*`.
- `src/personnage.js`, `src/gallery.js`, `src/tokens.js`, `catalogue.json`, `CHANGELOG.md`, `docs/correspondances.md`.

**Pièges rencontrés**
- `commun.pivot(..., parent=)` rattache avant que Blender ait calculé la position. Contournement dans `crane.py` : poser l'objet, appeler `view_layer.update()`, puis rattacher.
- Quand le panneau du navigateur est masqué, `requestAnimationFrame` est suspendu et la galerie ne se redessine plus.
- Dans un fuseau, une découpe doit être topologique (anneau et colonne), sinon les deux morphologies divergent.
- `main` a 14 commits d'avance et 1 de retard sur `origin` : regarder ce commit avant tout push.

**Prochaine action**
Ouvre la session « Lot G1 : les lieux du parcours, dans l'ordre » et réponds au brief d'architect-office.

## 2026-10-18 20:07 — MBPdePireAlain2 — main

**Où on en est**
Lot G0 (direction artistique) presque bouclé : bible WORKSITE 1.2, atelier Blender, 4 skills, mood board de 12 images annotées. Premier étalon (module du kit de bâtiment) en attente de l'accord de PA sur son brief.

**Fait et vérifié**
- `npm run check` vert (3 conformes, 23 à faire sur 26) après chaque commit.
- `npm run atelier -- <id>` rend iso, valeurs, face, silhouette (vérifié sur la grue).
- Galerie permanente Portly `gdc-maquettes/galerie` sur http://localhost:5320.
- Mood board : 10 images ChatGPT dans `moodboard/`, prompts dans `prompts.md`, annotations dans `notes.md`.

**Reste à faire**
- Répondre au brief de la session « Étalon 1 » (taille de la démo, contenu de la v001), puis la laisser fabriquer `building-kit`.
- Valider le mood board (statut « livré » dans `catalogue.json`).
- Étalon 2 : `CHR_BASE_MASTER` en gris (trancher 5 têtes contre 6,5 des images IA).
- Étalon 3 : grue v002 en treillis (cible : `moodboard/MB_08_grue.png`).
- Mode Blender ouvert via le MCP : jamais testé (Blender fermé, port 9876).

**Décisions prises**
- Rendu 3D douce, pas l'aplat vectoriel de REF_ENV.
- Socle maquette couleur terre ; export Blender 5.3.0 Beta.
- Affichage de référence : portable 13-14 pouces, 25 px/m.
- Chantier romand : casques couleur d'équipe, grue orange, pelle classique (pas Menzi Muck), clôture grise jamais orange, conteneurs, bennes de tri, gilet #FF6A13.
- Images du mood board via l'appli ChatGPT, pas Higgsfield.

**Fichiers touchés**
- `blender/atelier.py`, `blender/gdc_blender/commun.py`, `src/lumiere.json`, `.claude/skills/*`, `moodboard/*`, `docs/bible/bible-worksite.md` (1.2), `src/palette.json`.

**Pièges rencontrés**
- Un formateur reformate les JS/JSON/MD édités avec Edit : vérifier `git diff`, éditer par script.
- `npx vite` sous Portly veut télécharger vite : utiliser `node_modules/.bin/vite`.
- ChatGPT desktop ne se pilote qu'en plein écran (fenêtre figée en arrière-plan) ; Télécharger ouvre un panneau « Enregistrer » qui pointe déjà sur `moodboard/`.
- `main` est en retard d'1 commit sur `origin` : ne pas pousser sans regarder ce commit.

**Prochaine action**
Ouvre la session « Étalon 1 : module du kit de bâtiment sur socle » et réponds à ses deux questions sur le brief.
