# Journal des sessions

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
