# L'atelier des maquettes

Le projet annexe où l'on fabrique les éléments visuels du panneau de chantier de GDC : terrain, bureaux, bâtiments et leurs états, personnages et engins, signalétique, vues intérieures, éléments d'interface, illustrations.

Sur un chantier, le maquettiste fabrique la maquette du bâtiment pour que le client la comprenne d'un coup d'œil. Ici, c'est pareil : les maquettes montrent l'avancement réel d'un projet logiciel.

## Ce que fait ce projet, et ce qu'il ne fait pas

- **Il fabrique** des composants visuels en Three.js, chacun conforme au contrat (`docs/contrat-composant.md`).
- **Il montre** chaque composant dans tous ses états, dans une galerie locale.
- **Il vérifie** que chaque composant respecte le contrat et son budget (`npm run check`).
- **Il livre** une bibliothèque unique (`dist/maquettes.js`) et son catalogue, que GDC intègre.
- **Il ne connaît pas les données** du harnais : un composant reçoit un état et quelques valeurs, il ne lit jamais un journal, un fichier ou le réseau. Le branchement sur les vraies données est le travail de GDC.

## Démarrer

```bash
npm install          # installe three et vite, aux versions épinglées
npm run dev          # ouvre la galerie locale
npm run check        # vérifie tous les composants
npm run catalogue    # régénère docs/catalogue.md depuis catalogue.json
npm run build        # produit dist/maquettes.js pour GDC
```

Node 20 ou plus récent. Aucune autre installation.

## Par où commencer

1. **Crée ton dépôt** : copie ce dossier dans un dépôt à part (par exemple `gdc-maquettes`), puis `npm install` et `npm run dev`. La galerie s'ouvre avec les deux composants d'exemple.
2. **Le lot G0 d'abord, ensemble** : dépose tes images dans `moodboard/` avec une ligne chacune dans `moodboard/notes.md`, puis on tranche le tableau de `docs/direction-artistique.md`. Aucun composant avant que le style soit fixé : sinon tout est à refaire.
3. **Puis les lots dans l'ordre** : G1 (terrain et lieux), G2 (bâtiments), G3 (personnages et engins), G4 (intérieurs), G5 (signaux), G6 (interface), G7 (illustrations). L'ordre et le détail de chaque élément sont dans `docs/catalogue.md`.
4. **Pour chaque élément**, une demande à l'agent suffit, par exemple : « En tant que modeleur, fabrique `architect-office` selon sa fiche du catalogue, montre-le dans la galerie dans tous ses états, puis fais passer le contrôle. »
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
| `docs/direction-artistique.md` | Comment on fixe la ligne graphique |
| `docs/livraison.md` | Comment une version part vers GDC |
| `components/` | Les composants, un dossier chacun |
| `src/` | Le contrat en code, les couleurs partagées, la galerie, la bibliothèque |
| `scripts/` | Le contrôle et la génération du catalogue lisible |
| `moodboard/` | Les images de référence et leurs notes |

Deux composants d'exemple montrent le contrat en entier : `components/site/ground` (statique) et `components/signals/selection-ring` (animé).
