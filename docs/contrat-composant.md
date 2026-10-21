# Le contrat d'un composant

Chaque composant est un module JavaScript qui exporte deux choses : `meta`, sa carte d'identité, et `create`, qui fabrique une instance. C'est tout ce que GDC connaît d'un composant. Le code (noms de fonctions, de paramètres, d'états) est en anglais ; la documentation et les noms affichés sont en français.

## Emplacement

`components/<category>/<id>/index.js`, où `<id>` est l'identifiant du catalogue (`catalogue.json`). Un seul fichier suffit le plus souvent ; un composant peut en importer d'autres de son propre dossier, jamais d'ailleurs.

## `meta`

```js
export const meta = {
  id: 'ground',                 // identique au catalogue
  version: '1.0.0',             // version du composant (majeure, mineure, correctif)
  category: 'site',             // identique au catalogue
  states: ['default'],          // tous les états acceptés par setState
  params: {                     // paramètres de création, avec défaut et bornes
    width: { type: 'number', default: 18, min: 4, max: 60 },
  },
  anchors: ['label'],           // points où GDC accroche du HTML (badge, nom, barre)
  budget: { triangles: 2000, materials: 3 },
  animated: false,              // true si update() peut demander une nouvelle image
};
```

Les états, ancres et budgets doivent correspondre à ceux de la fiche du catalogue.

## Ce qui entre et ce qui sort

| Sens | Par où | Défini dans la fiche |
|---|---|---|
| Entre, une fois | `params` de `create` | `params` |
| Entre, à chaque changement | `setState(state, data)` | `states` et `data` |
| Entre, à chaque image | `update(dt)` | (rien : le temps) |
| Sort | `anchor(name)` : où GDC pose le HTML | `anchors` |
| Sort | le retour de `update` : faut-il redessiner | `animated` |

Un composant ne sort jamais d'événement : le clic, le survol et la sélection sont gérés par GDC.

## `create(THREE, params, ctx)`

- `THREE` : la bibliothèque Three.js, **injectée**. Un composant n'importe jamais `three` lui-même : GDC et la galerie fournissent la même instance.
- `params` : les paramètres de création, déjà complétés par les défauts.
- `ctx` : le contexte d'affichage.
  - `ctx.tokens` : les couleurs partagées (`src/tokens.js`), dont les **couleurs d'état, qui ne changent jamais** ;
  - `ctx.theme` : `'light'` ou `'dark'` ;
  - `ctx.palette` : les couleurs de base du thème courant (sol, gravier, béton, bois, verre, papier, encre), déjà choisies selon `ctx.theme` ;
  - `ctx.quality` : `'low'` ou `'high'` ; en `'low'`, moins de détails, aucune ombre ;
  - `ctx.reducedMotion` : `true` si l'utilisateur demande moins d'animations ; le composant montre alors un état fixe, lisible.
  - `ctx.assets` : la copie, pour cette instance, des modèles 3D déclarés dans `meta.assets` (voir « Les modèles 3D »).

`create` renvoie une instance :

```js
{
  root,                 // THREE.Object3D ; root.userData.component === meta.id
  setState(state, data) // change l'état ; data : valeurs utiles (progress, team, count…)
  update(dt)            // avance l'animation de dt secondes ; renvoie true s'il faut redessiner
  anchor(name)          // renvoie un THREE.Vector3 dans le repère de root, pour le HTML
  dispose()             // libère géométries, matériaux et textures
}
```

## Les modèles 3D (GLB produits par Blender)

Un composant peut s'appuyer sur un ou plusieurs modèles produits par un script Blender (`blender/assets/<id>.py`, voir `blender/README.md`).

- **Déclaration** : `meta.assets` liste les fichiers, identiques à la fiche du catalogue : `'VEH_TOWER_CRANE_A_v001.glb'` (dans le dossier du composant) ou `'<catégorie>:<id>/FICHIER.glb'` (dans le dossier d'un kit ou d'un autre composant, `components/<catégorie>/<id>/`) : `'kit:building-kit/BLD_KIT_A_v003.glb'`, `'machine:excavator/VEH_EXCAVATOR_A_v001.glb'`. Un modèle emprunté est contrôlé chez son propriétaire ; le composant qui l'emprunte réécrit ce qu'il en joue (il n'importe jamais le code d'un autre dossier).
- **Chargement par l'hôte** : la galerie, le contrôle et GDC chargent les modèles avant `create` et passent à chaque instance sa copie dans `ctx.assets[nom] = { scene, animations }`. Le composant ne charge jamais rien lui-même.
- **Ressources partagées** : la géométrie et les matériaux du modèle sont partagés entre instances. `dispose()` retire la copie de la scène et arrête ses animations, mais ne libère jamais une ressource du modèle ; le contrôle le vérifie. Un matériau que le composant modifie (par exemple grisé pour `unknown`) est d'abord cloné, et ce clone, lui, est libéré.
- **Animations** : les clips du modèle (`ANM_...`) sont joués avec `THREE.AnimationMixer`, avancé dans `update(dt)` ; avec `reducedMotion`, une image fixe et lisible de l'état.
- **Ancres** : lues dans les nœuds `ANCHOR_<NOM>` du modèle (`label` donne `ANCHOR_LABEL`, `room:3` donne `ANCHOR_ROOM_3`), rendues dans le repère de `root`.
- **Exemple** : `components/machine/crane` (la grue), avec son script `blender/assets/crane.py`.

## Règles

1. **Aucune logique métier.** Un composant ne sait pas ce qu'est une fiche ou un agent. Il reçoit un état et des valeurs ; GDC décide lesquels.
2. **Aucun accès extérieur** : ni réseau, ni fichier, ni stockage, ni `eval`. Les éléments graphiques sont dans le code ou générés par lui.
3. **Aucun texte dans la 3D.** Noms, nombres, badges et barres de progression sont du HTML posé sur les ancres : lisible, net, copiable, accessible.
4. **L'animation est pilotée par `update(dt)`** : pas de minuteur interne. Un composant au repos renvoie `false`, pour que la scène ne se redessine pas inutilement.
5. **Un état inconnu reste visible** : tout composant qui représente un acteur ou un travail a un état `unknown`, lisible sans animation.
6. **La sélection est faite par GDC** : il cherche `root.userData.component` en remontant depuis l'objet touché. Le composant ne gère aucun événement de souris.
7. **Le budget est un plafond** : triangles et matériaux mesurés par `npm run check`.
8. **Tout se libère** : après `dispose()`, aucune géométrie ni matériau du composant ne reste en mémoire.
9. **Les couleurs viennent de `ctx.palette` et de `ctx.tokens`** (une seule source, `src/palette.json`). Les couleurs d'état ne colorent jamais un objet de la scène : elles vivent dans l'interface (bible, 17.3).
10. **Les données sont facultatives** : `setState(state, data)` fonctionne avec `data` absent ou incomplet ; les clés attendues sont celles de la fiche (`data` dans `catalogue.json`), chacune avec une valeur par défaut raisonnable.
11. **Licence claire** : tout est original, ou sous licence CC0 ou MIT, avec la mention dans la fiche.

## Ce que vérifie `npm run check`

- `meta` complet et conforme à la fiche du catalogue (identifiant, catégorie, états, ancres) ;
- `create` fonctionne avec les paramètres par défaut, `setState` accepte chaque état, `update` renvoie un booléen, `anchor` renvoie un point pour chaque ancre ;
- triangles et matériaux sous le budget, dans chaque état ;
- `dispose` libère ce qu'il a créé ;
- aucun accès extérieur ni HTML injecté dans le code du composant ;
- pour chaque modèle : nom conforme (`FAMILLE_TYPE_VARIANTE_v001.glb`), nœuds, matériaux (`MAT_`) et animations (`ANM_`) nommés selon la bible, aucune ressource externe, ni caméra ni lumière, extensions lisibles par le chargeur standard, animations de la fiche présentes, budget tenu ;
- la provenance : `asset.json` présent, et ses empreintes (script, outils communs, palette, GLB) identiques aux fichiers actuels ; sinon, relancer `npm run blender -- <id>`.

## Les éléments d'interface (lot G6)

Ce sont des éléments personnalisés du navigateur (`customElements.define`), sans bibliothèque.

- **Nom** : `gdc-<id>` (par exemple `gdc-inspector`, `gdc-notification-badge`).
- **Entrées** : des propriétés JavaScript (`element.data = {...}`), jamais du HTML fourni de l'extérieur ; tout texte est inséré avec `textContent`.
- **Sorties** : des événements (`gdc-select`, `gdc-copy`, `gdc-close`), avec l'identifiant de l'élément dans `event.detail.id`.
- **Style** : variables CSS reprises de `src/tokens.js` (`--gdc-...`) ; clair et sombre ; aucune police chargée depuis Internet.
- **Accessibilité** : utilisable au clavier, rôles et libellés ARIA, contraste suffisant.
- **Même contrôle** : aucun accès extérieur, aucun `innerHTML` alimenté par des données.

### Le module d'un élément

`components/interface/<id>/index.js` exporte `meta` et `define(registry, ctx)`. Rien n'est défini à l'import : la bibliothèque appelle `defineElements()` (`src/interface.js`), qui pose une fois la feuille des polices et des variables dans le document, puis appelle `define` pour chaque élément.

```js
export const meta = {
  id: 'top-bar',                // identique au catalogue
  version: '1.0.0',
  category: 'interface',
  tag: 'gdc-top-bar',           // gdc-<id>
  inputs: ['project', 'decisions', 'agents', 'updatedAt', 'staleAfter'], // les clés de « inputs » de la fiche
  outputs: ['gdc-select'],      // les clés de « outputs » de la fiche
};
export function define(registry, ctx) {
  registry.define(meta.tag, class extends HTMLElement { /* … */ });
}
```

- **`ctx`, injecté** comme Three.js l'est dans les composants 3D (décision de Pierre-Alain du 21 octobre 2026) : `ctx.tokens` (les couleurs), `ctx.signes` (le mot, la forme et l'icône de chaque état, `src/signes.js`), `ctx.signIcon(document, state, taille)` (le signe en SVG, décoratif), `ctx.plusGrave(counts)` et `ctx.gravite` (l'ordre de gravité), `ctx.portrait(document, id)` (le portrait du lot G7 en SVG prêt à poser, par identifiant de `equipe.json`, ou `null`). Un élément n'importe toujours rien hors de son dossier.
- **Composition par balise** : un élément en utilise un autre en posant sa balise (`<gdc-copy-button>`), sans import.
- **Variables CSS** (`cssVariables()` de `src/tokens.js`) : `--gdc-background`, `--gdc-surface`, `--gdc-ink`, `--gdc-muted` selon le thème ; `--gdc-state-<état>` et `--gdc-team-<équipe>`, fixes ; `--gdc-font-title`, `--gdc-font-ui`, `--gdc-font-mono` ; `--gdc-motion` (1, ou 0 quand on demande moins d'animations). Le thème se choisit par `data-theme="dark"` sur un ancêtre ; moins d'animations par la préférence du système ou `data-motion="reduced"`. Les variables traversent le shadow DOM.
- **Le contrôle** (`npm run check`) est statique : `meta` conforme à la fiche, `define` présent, chaque entrée lue et chaque événement de la fiche émis, aucun autre événement, mêmes motifs interdits que les composants. Le rendu, le clavier, le téléphone et les deux thèmes se vérifient sur la page de démonstration (`npm run dev`, puis `/interface.html`).

## Les illustrations (lot G7)

Des fichiers SVG autonomes, sans code : `components/illustration/<id>/<fichier>.svg`, un par identifiant de la liste `files` de la fiche. La bibliothèque les exporte en texte (`illustrations[id][fichier]`), et GDC les **insère dans la page** (pas en `<img>`) : une icône prend ainsi la couleur du texte, et un portrait reçoit sa classe d'état.

- **Rien d'extérieur** : ni script, ni gestionnaire `on…`, ni `foreignObject`, ni lien vers une ressource ; une image ne peut être qu'intégrée (`data:image/webp;base64,…`).
- **Taille** : un `viewBox`, jamais de `width` ni de `height` sur la balise `<svg>` ; la page choisit la taille.
- **Règles de la fiche** (`svg` dans `catalogue.json`) : `viewBox` attendu, `maxBytes` (plafond de poids), `monochrome` (aucune couleur écrite, `fill` et `stroke` à `currentColor` ou `none`, et `aria-hidden="true"` : l'icône accompagne un libellé), `strokeWidth` (une seule épaisseur de trait).
- **États** (`states` de la fiche, le premier est celui de repos) : des classes posées sur le `<svg>`. Le fichier porte la classe de repos ; GDC la remplace par l'état voulu. Chaque autre état a sa règle CSS dans le `<style>` du fichier, et rien ne bouge avec « moins d'animations » (`prefers-reduced-motion`, `data-motion="reduced"`, `--gdc-play`). Un portrait a `role="img"` et un `<title>` : le nom de la personne.
- **Rendu Blender** (production `blender`) : les fichiers sortent de `blender/assets/<id>.py` (fonction `rend`), jamais retouchés à la main ; `asset.json` garde les empreintes du script, des outils communs, de la palette, des sources reprises (le kit du personnage) et de chaque fichier.
- **Le contrôle** (`npm run check`) vérifie tout cela ; le rendu, les tailles et les deux thèmes se regardent sur `/interface.html`.
