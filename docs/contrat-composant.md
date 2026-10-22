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
  - `ctx.groupFloors(floors, fallback)` : la règle des six étages (`src/etages.js`, lot G8), injectée comme Three.js : un composant n'importe rien hors de son dossier. Elle rend les étages visibles d'un bâtiment, du bas vers le haut (`index` depuis 1, `ids`, `stage`, `rooms`, `occupied`, `grouped`) : au-delà de six fiches, le rez prend juste assez de fiches, les livrées les plus anciennes d'abord, et l'aspect de la moins avancée (décisions de Pierre-Alain du 21 octobre 2026). Le sélecteur d'étages la reprend, pour montrer les mêmes étages ; `refOf` et `anchorFor` du même fichier servent à l'assemblage pour le survol de la carte.

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
- `create` fonctionne avec les paramètres par défaut, `setState` accepte chaque état, `update` renvoie un booléen, `anchor` renvoie un point pour chaque ancre (une ancre numérotée est essayée au numéro 1 : `desk:1` ; à côté d'étages `floor:*`, une pièce est numérotée dans son étage : `room:1-1`) ;
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

- **`ctx`, injecté** comme Three.js l'est dans les composants 3D (décision de Pierre-Alain du 21 octobre 2026) : `ctx.tokens` (les couleurs), `ctx.signes` (le mot, la forme et l'icône de chaque état, `src/signes.js`), `ctx.signIcon(document, state, taille)` (le signe en SVG, décoratif), `ctx.plusGrave(counts)` et `ctx.gravite` (l'ordre de gravité), `ctx.portrait(document, id)` (le portrait du lot G7 en SVG prêt à poser, par identifiant de `equipe.json`, ou `null`), le survol partagé : `ctx.correspond(a, b)`, `ctx.sameRef(a, b)`, `ctx.hoverLink(element, refOf)` (`src/survol.js`, voir « Le survol partagé ») ; et la règle des six étages, `ctx.groupFloors(floors, fallback)` (`src/etages.js`), la même que celle du bâtiment, pour que le sélecteur d'étages montre toujours les mêmes étages. Un élément n'importe toujours rien hors de son dossier.
- **Composition par balise** : un élément en utilise un autre en posant sa balise (`<gdc-copy-button>`), sans import.
- **Variables CSS** (`cssVariables()` de `src/tokens.js`) : `--gdc-background`, `--gdc-surface`, `--gdc-ink`, `--gdc-muted` selon le thème ; `--gdc-state-<état>` et `--gdc-team-<équipe>`, fixes ; `--gdc-font-title`, `--gdc-font-ui`, `--gdc-font-mono` ; `--gdc-motion` (1, ou 0 quand on demande moins d'animations) ; `--gdc-highlight-fill` et `--gdc-highlight-ring`, la mise en évidence du survol partagé, selon le thème. Le thème se choisit par `data-theme="dark"` sur un ancêtre ; moins d'animations par la préférence du système ou `data-motion="reduced"`. Les variables traversent le shadow DOM.
- **Le contrôle** (`npm run check`) est statique : `meta` conforme à la fiche, `define` présent, chaque entrée lue et chaque événement de la fiche émis, aucun autre événement, mêmes motifs interdits que les composants ; pour le survol partagé, voir ci-dessous. Le rendu, le clavier, le téléphone et les deux thèmes se vérifient sur la page de démonstration (`npm run dev`, puis `/interface.html`).

### Le survol partagé (lot G8)

Survoler un travail quelque part l'allume partout : sur la carte, dans le fil des déclencheurs à gauche, dans l'arbre des fiches et des lots à droite, et dans le sélecteur d'étages. Décision de Pierre-Alain du 21 octobre 2026 (fiche `hover-link`).

**La référence.** GDC donne à chaque action et à chaque élément lié au travail une référence `ref = { application, fiche?, lot? }` (contrat de GDC, `docs/maquette.md`, schéma 3). C'est un chemin : l'application, puis la fiche, puis le lot ; il s'arrête au premier niveau absent (une fiche `null`, l'application existante, vaut son application ; un lot n'a de sens que dans sa fiche). Un élément d'interface reprend telle quelle la référence que GDC lui donne (`ref` d'une action, d'un nœud, d'un bâtiment). GDC ne la donne qu'au parent quand l'enfant se déduit de lui : un étage complète alors la référence de son bâtiment par sa fiche, une pièce celle de son étage par son lot, avec les identifiants que GDC a envoyés (`building.id`, l'`id` de l'étage, celui de la pièce) ; un élément n'invente jamais un identifiant (décision de Pierre-Alain du 21 octobre 2026).

**La règle : deux références correspondent quand l'une prolonge l'autre.** Survoler un lot allume sa fiche et son application ; survoler une application allume ses fiches et ses lots ; deux fiches voisines ne s'allument pas l'une l'autre. Elle est écrite une seule fois, `ctx.correspond(a, b)` (`src/survol.js`), et vérifiée sur des exemples par le contrôle. `ctx.sameRef(a, b)` dit si c'est exactement la même référence.

**Ce qui sort : `gdc-hover`.** `event.detail.ref` vaut la référence quand le pointeur ou le focus entre sur un élément référencé, et `null` quand il en sort.
- **Le focus clavier vaut un survol.** La référence émise est celle sous le pointeur, sinon celle de l'élément qui a le focus, sinon `null`. Le focus doit vraiment se déplacer (tabulation itinérante, `tabindex` mobile), pas seulement `aria-activedescendant`.
- **Pas de rafale.** Un seul événement par changement de référence : passer d'un lot à un autre émet le nouveau lot directement, sans `null` entre les deux ; repasser sur la même référence n'émet rien ; `null` une fois, à la sortie.
- **Des nœuds contigus.** Une zone sans référence entre deux nœuds (un titre, une marge) rend `null` en passant : les nœuds d'une liste se touchent, l'espace est dans leur marge intérieure.
- **Écrit une fois** : `ctx.hoverLink(element, refOf)` écoute le pointeur et le focus dans le shadow DOM de l'élément et émet `gdc-hover` pour lui ; `refOf(node)` rend la référence d'un nœud de la liste (lue dans ses données), ou `null`. Un élément qui émet `gdc-hover` l'appelle une fois, à sa construction, au lieu d'écrire son propre suivi.

**Ce qui entre : `highlight`.** GDC écoute `gdc-hover` (il remonte jusqu'au document, `composed`) et renvoie une référence, ou `null`, à tous les éléments, l'émetteur compris : `element.highlight = ref`. Il garde la dernière référence de chaque élément et renvoie la plus récente qui n'est pas `null` : quand le pointeur quitte l'arbre, la mise en évidence revient à l'action du fil qui a toujours le focus. C'est une propriété à part (`set highlight`), pas une clé de `data` : elle change à chaque survol, elle ne redessine rien, elle ne fait que poser ou retirer la marque sur chaque nœud dont la référence correspond (`ctx.correspond(highlight, ref)`), par l'attribut `data-highlight` ; un `highlight` reçu avant le premier rendu est gardé et appliqué au rendu ; aucune annonce aux lecteurs d'écran (le focus, lui, est annoncé normalement). **Un nœud qui tient lieu de plusieurs fiches, ou d'aucune** (le rez regroupé du sélecteur d'étages, l'étage d'une application existante : leur référence est celle de l'application) ne s'allume que pour l'application elle-même ou pour une de ses propres fiches (et leurs lots), jamais pour une fiche voisine : survoler une surélévation n'allume pas l'existant au rez. C'est la règle d'`anchorFor` côté carte (amendement décidé par Pierre-Alain le 22 octobre 2026).

**La marque.** Un fond teinté et un trait d'encre, plus légers que la sélection, sans couleur d'état, qui ne font pas sauter la liste : `background: var(--gdc-highlight-fill); box-shadow: var(--gdc-highlight-ring);` (un trait d'un pixel en `box-shadow`, aucune bordure ni marge ajoutée). Un nœud choisi garde son style de sélection, la marque n'y ajoute que son trait. Rien ne bouge, rien ne clignote (`docs/signaletique.md`).

**Côté carte (l'assemblage).** Celui qui assemble la scène, GDC ou la scène de référence de la galerie, fait de même avec la 3D, sans que les composants n'en sachent rien (ils ne gèrent aucun événement, règle 6) :
- un `highlight` reçu pose l'anneau de sélection (`selection-ring`, état `hover`) sur ce qui correspond le plus précisément : la pièce (ancre `room:*`) pour un lot, l'étage (`floor:*`) pour une fiche, le bâtiment pour une application ; un élément déjà choisi garde son anneau `selected` ;
- survoler un bâtiment, un étage ou une pièce émet `gdc-hover` avec sa référence (`{ application }`, `{ application, fiche }`, `{ application, fiche, lot }`), selon les mêmes règles : un seul événement par changement, `null` à la sortie.
Les ancres d'étage et de pièce viennent avec `building` 2.0.0 : le branchement de la carte se fait avec lui (décision de Pierre-Alain du 21 octobre 2026).

`building` 2.0.0 donne à l'assemblage ce qu'il lui faut, sans rien interpréter : les ancres `floor:n` (l'étage visible n, 1 pour le rez, sur sa dalle) et `room:n-m` (la pièce m de l'étage n) ; un groupe `FLOOR_n` par étage (`userData.floor = { index, ids, grouped }`) et `ROOM_n_m` par pièce dont la travée est fermée (`userData.room = { floor, index, floorId, id }`), avec les identifiants reçus de GDC. En remontant depuis l'objet touché, l'assemblage trouve la pièce, sinon l'étage, sinon le bâtiment, et en tire la référence par `refOf` (`src/etages.js`) : un rez regroupé et une fiche sans identifiant valent leur application. Pour un `highlight` reçu, `anchorFor` donne l'ancre la plus précise (`room:n-m`, `floor:n`, ou `null` pour le bâtiment).

**Le contrôle** (`npm run check`) : la règle `correspond` sur des exemples ; toute fiche qui émet `gdc-hover` lit `highlight` (y compris les fiches à faire et les prochaines versions, `next`) ; un élément qui appelle `ctx.hoverLink` a `gdc-hover` dans sa fiche ; un élément qui lit `highlight` le définit en propriété (`set highlight`). Le comportement (pointeur, clavier, aucune rafale, les deux thèmes) se vérifie sur `/interface.html`, section « Le survol partagé », dont le relais fait ce que fera GDC.

## Les illustrations (lot G7)

Des fichiers SVG autonomes, sans code : `components/illustration/<id>/<fichier>.svg`, un par identifiant de la liste `files` de la fiche. La bibliothèque les exporte en texte (`illustrations[id][fichier]`), et GDC les **insère dans la page** (pas en `<img>`) : une icône prend ainsi la couleur du texte, et un portrait reçoit sa classe d'état.

- **Rien d'extérieur** : ni script, ni gestionnaire `on…`, ni `foreignObject`, ni lien vers une ressource ; une image ne peut être qu'intégrée (`data:image/webp;base64,…`).
- **Taille** : un `viewBox`, jamais de `width` ni de `height` sur la balise `<svg>` ; la page choisit la taille.
- **Règles de la fiche** (`svg` dans `catalogue.json`) : `viewBox` attendu, `maxBytes` (plafond de poids), `monochrome` (aucune couleur écrite, `fill` et `stroke` à `currentColor` ou `none`, et `aria-hidden="true"` : l'icône accompagne un libellé), `strokeWidth` (une seule épaisseur de trait).
- **États** (`states` de la fiche, le premier est celui de repos) : des classes posées sur le `<svg>`. Le fichier porte la classe de repos ; GDC la remplace par l'état voulu. Chaque autre état a sa règle CSS dans le `<style>` du fichier, et rien ne bouge avec « moins d'animations » (`prefers-reduced-motion`, `data-motion="reduced"`, `--gdc-play`). Un portrait a `role="img"` et un `<title>` : le nom de la personne.
- **Rendu Blender** (production `blender`) : les fichiers sortent de `blender/assets/<id>.py` (fonction `rend`), jamais retouchés à la main ; `asset.json` garde les empreintes du script, des outils communs, de la palette, des sources reprises (le kit du personnage) et de chaque fichier.
- **Version** : une illustration livrée qui change (fichier renommé, retiré ou redessiné) porte sa version dans sa fiche (`version`, 2.0.0 quand un identifiant change), avec une ligne au journal des versions.
- **Le contrôle** (`npm run check`) vérifie tout cela ; le rendu, les tailles et les deux thèmes se regardent sur `/interface.html`.
