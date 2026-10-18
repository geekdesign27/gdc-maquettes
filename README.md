# L'atelier des maquettes

Le projet annexe où l'on fabrique les éléments visuels du panneau de chantier de GDC : terrain, bureaux, bâtiments et leurs états, personnages et engins, signalétique, vues intérieures, éléments d'interface, illustrations.

Sur un chantier, le maquettiste fabrique la maquette du bâtiment pour que le client la comprenne d'un coup d'œil. Ici, c'est pareil : les maquettes montrent l'avancement réel d'un projet logiciel.

## Ce que fait ce projet, et ce qu'il ne fait pas

- **Il fabrique** des modèles 3D par scripts Blender et des composants Three.js qui les pilotent, selon la bible WORKSITE (`docs/bible/bible-worksite.md`) et le contrat (`docs/contrat-composant.md`).
- **Il montre** chaque composant dans tous ses états, dans une galerie locale.
- **Il vérifie** que chaque composant respecte le contrat et son budget (`npm run check`).
- **Il livre** une bibliothèque unique (`dist/maquettes.js`) et son catalogue, que GDC intègre.
- **Il ne connaît pas les données** du harnais : un composant reçoit un état et quelques valeurs, il ne lit jamais un journal, un fichier ou le réseau. Le branchement sur les vraies données est le travail de GDC.

## Démarrer

```bash
npm install          # installe three et vite, aux versions épinglées
npm run blender -- crane   # construit un modèle 3D par son script Blender
npm run dev          # ouvre la galerie locale
npm run check        # vérifie tous les composants
npm run catalogue    # régénère docs/catalogue.md depuis catalogue.json
npm run build        # produit dist/maquettes.js pour GDC
```

Node 20 ou plus récent, et Blender pour les modèles 3D (voir `blender/README.md`).

## Par où commencer

1. **Crée ton dépôt** : copie ce dossier dans un dépôt à part (par exemple `gdc-maquettes`), puis `npm install` et `npm run dev`. La galerie s'ouvre avec les deux composants d'exemple.
2. **Le lot G0 d'abord, ensemble** : la bible WORKSITE 1.1 est fixée ; dépose les deux références maîtresses (REF_ENV_001, REF_CHR_001) et tes autres images dans `moodboard/`, une ligne chacune dans `moodboard/notes.md`. Puis la bibliothèque de matériaux et la planche comparative (`docs/direction-artistique.md`).
3. **Puis les lots dans l'ordre** : G1 (terrain et lieux), G2 (bâtiments), G3 (personnages et engins), G4 (intérieurs), G5 (signaux), G6 (interface), G7 (illustrations). L'ordre et le détail de chaque élément sont dans `docs/catalogue.md`.
4. **Pour chaque élément**, une demande à l'agent suffit, par exemple : « En tant que modeleur, fabrique `architect-office` selon sa fiche du catalogue et la bible : script Blender, composant, galerie dans tous ses états et planche comparative, puis le contrôle. »
5. **Livre par petites versions** (`docs/livraison.md`) : un lot terminé suffit pour une version.

## Le chemin d'un composant

1. **La direction artistique** est fixée d'abord, ensemble, sur un mood board (`docs/direction-artistique.md`, dossier `moodboard/`).
2. **Le catalogue** (`catalogue.json`) dit quoi produire et dans quel ordre ; chaque entrée est la fiche du composant : nom, but, paramètres, états, ancres, budget, critères d'acceptation.
3. **Tu fabriques** le composant dans `components/<catégorie>/<id>/index.js`, avec l'aide des agents décrits dans `AGENTS.md`.
4. **Tu le regardes** dans la galerie, dans chacun de ses états, en qualité basse et haute, avec et sans animations.
5. **Le contrôle** passe : `npm run check`.
6. **Tu passes son statut** à « livré » dans `catalogue.json`.
7. **Tu livres une version** (`docs/livraison.md`) ; GDC la teste et te la propose avant de l'adopter.

## Organisation

| Dossier ou fichier | Rôle |
|---|---|
| `AGENTS.md` | Règles et rôles des agents qui travaillent ici (Claude Code et Codex) |
| `catalogue.json` | La liste ordonnée de ce qu'il faut produire : la source unique |
| `docs/catalogue.md` | Sa version lisible, générée |
| `docs/contrat-composant.md` | Ce que chaque composant doit exposer |
| `docs/signaletique.md` | Le langage des signaux : états, badges, couleurs, formes |
| `docs/bible/bible-worksite.md` | La bible graphique WORKSITE 1.1 : la règle de production |
| `docs/direction-artistique.md` | Comment on s'en sert et comment elle évolue |
| `blender/` | Les scripts Blender : un par modèle, et les outils communs |
| `docs/livraison.md` | Comment une version part vers GDC |
| `components/` | Les composants, un dossier chacun |
| `src/` | Le contrat en code, les couleurs partagées, la galerie, la bibliothèque |
| `scripts/` | Le contrôle et la génération du catalogue lisible |
| `moodboard/` | Les images de référence et leurs notes |

Trois exemples montrent le contrat en entier : `components/site/ground` (géométrie par le code, statique), `components/signals/selection-ring` (par le code, animé) et `components/machine/crane` (modèle Blender piloté par le code, avec son script `blender/assets/crane.py`). La grue démontre la chaîne ; sa forme n'est pas encore validée sur la planche.
