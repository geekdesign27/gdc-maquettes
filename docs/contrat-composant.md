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

## Règles

1. **Aucune logique métier.** Un composant ne sait pas ce qu'est une fiche ou un agent. Il reçoit un état et des valeurs ; GDC décide lesquels.
2. **Aucun accès extérieur** : ni réseau, ni fichier, ni stockage, ni `eval`. Les éléments graphiques sont dans le code ou générés par lui.
3. **Aucun texte dans la 3D.** Noms, nombres, badges et barres de progression sont du HTML posé sur les ancres : lisible, net, copiable, accessible.
4. **L'animation est pilotée par `update(dt)`** : pas de minuteur interne. Un composant au repos renvoie `false`, pour que la scène ne se redessine pas inutilement.
5. **Un état inconnu reste visible** : tout composant qui représente un acteur ou un travail a un état `unknown`, lisible sans animation.
6. **La sélection est faite par GDC** : il cherche `root.userData.component` en remontant depuis l'objet touché. Le composant ne gère aucun événement de souris.
7. **Le budget est un plafond** : triangles et matériaux mesurés par `npm run check`.
8. **Tout se libère** : après `dispose()`, aucune géométrie ni matériau du composant ne reste en mémoire.
9. **Les couleurs viennent de `ctx.tokens`.** Le thème d'un projet peut changer les couleurs principales, jamais les couleurs d'état.
10. **Les données sont facultatives** : `setState(state, data)` fonctionne avec `data` absent ou incomplet ; les clés attendues sont celles de la fiche (`data` dans `catalogue.json`), chacune avec une valeur par défaut raisonnable.
11. **Licence claire** : tout est original, ou sous licence CC0 ou MIT, avec la mention dans la fiche.

## Ce que vérifie `npm run check`

- `meta` complet et conforme à la fiche du catalogue (identifiant, catégorie, états, ancres) ;
- `create` fonctionne avec les paramètres par défaut, `setState` accepte chaque état, `update` renvoie un booléen, `anchor` renvoie un point pour chaque ancre ;
- triangles et matériaux sous le budget, dans chaque état ;
- `dispose` libère ce qu'il a créé ;
- aucun accès extérieur ni HTML injecté dans le code du composant.

## Les éléments d'interface (lot G6)

Ce sont des éléments personnalisés du navigateur (`customElements.define`), sans bibliothèque.

- **Nom** : `gdc-<id>` (par exemple `gdc-inspector`, `gdc-notification-badge`).
- **Entrées** : des propriétés JavaScript (`element.data = {...}`), jamais du HTML fourni de l'extérieur ; tout texte est inséré avec `textContent`.
- **Sorties** : des événements (`gdc-select`, `gdc-copy`, `gdc-close`), avec l'identifiant de l'élément dans `event.detail.id`.
- **Style** : variables CSS reprises de `src/tokens.js` (`--gdc-...`) ; clair et sombre ; aucune police chargée depuis Internet.
- **Accessibilité** : utilisable au clavier, rôles et libellés ARIA, contraste suffisant.
- **Même contrôle** : aucun accès extérieur, aucun `innerHTML` alimenté par des données.
