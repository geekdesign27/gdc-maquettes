---
name: fabrique-asset
description: Le parcours complet pour fabriquer un élément 3D du catalogue de l'atelier des maquettes - fiche, brief de conception, script Blender, boucle de l'atelier, export GLB, composant Three.js, contrôle, planche et constat. À utiliser dès que PA demande de fabriquer, modéliser, refaire ou faire évoluer un élément du catalogue (« fabrique architect-office », « on attaque la grue », « lot G1 », « prochain asset »).
---

# Fabriquer un élément du catalogue

Un élément à la fois, dans l'ordre du catalogue sauf décision de PA (AGENTS.md, règle 7). Charge d'abord le skill `charte-worksite`.

## 1. La fiche

```bash
node -e 'const c=require("./catalogue.json");const i=c.items.find(x=>x.id===process.argv[1]);console.log(JSON.stringify(i,null,1))' <id>
```

- Note : production (`blender`, `mixte`, `code`), états, ancres, animations, budget, kit, critères d'acceptation, statut.
- Un élément `livré` ne se modifie qu'avec une nouvelle version (`_v002`) et une ligne au `CHANGELOG.md`.
- Une fiche floue (dimension, état, usage) : **demande à PA**, n'invente pas (règle 8).
- Regarde ce qui existe déjà et se réutilise : kits (`components/kit/`), scripts voisins (`blender/assets/`), matériaux de `src/palette.json`.

## 2. Le brief de conception (avant toute géométrie)

Écris-le à PA en quelques lignes :

1. **Famille et nom** : `FAMILLE_TYPE_VARIANTE_v001`, comme dans la fiche (`blender`).
2. **Usage** : ce que l'objet dit dans le panneau, et à quelle taille on le voit.
3. **Silhouette** : les deux ou trois formes qui le font reconnaître (la grue : mât, flèche, crochet).
4. **Cotes principales** en mètres, et les exagérations de la famille.
5. **Hiérarchie** : pièces fixes (à fusionner), pivots (un par mouvement), ancres de la fiche.
6. **Matériaux** : les `MAT_` existants utilisés. Un matériau manquant devient une proposition d'ajout à la palette (voir la charte : cela oblige à reconstruire tous les GLB).
7. **États et animations** : ce qui change à l'écran pour chacun ; durée et boucle des clips.
8. **Budget visé** : triangles et matériaux, sous le plafond de la fiche.

**Attends l'accord de PA** sur le brief pour un modèle maître (le premier de sa famille, ou un étalon de la scène de référence). Pour une variante d'une famille déjà validée, continue et signale le brief.

## 3. Le script

`blender/assets/<id>.py`, sur le modèle de `blender/assets/crane.py` :

```python
ASSET = {"id": "<id>", "categorie": "<category>", "nom": "<FAMILLE_TYPE_VARIANTE_v001>"}

def construit(c):
    ...
    return {"animations": [...]}
```

Uniquement les outils de `blender/gdc_blender/commun.py`. Un outil manquant et réutilisable s'ajoute à `commun.py`, avec sa docstring. Cela change l'empreinte de tous les GLB : reconstruis-les dans la foulée.

## 4. La boucle

Skill `blender-live` : essaie, regarde les captures (silhouette, valeurs, iso, face), mesure, corrige le script, jusqu'à ce que la silhouette se lise, que les valeurs se séparent, que le budget et les noms soient bons.

## 5. Export et composant

1. `npm run blender -- <id>` : le GLB et `asset.json` à côté du composant.
2. `components/<category>/<id>/index.js` selon `docs/contrat-composant.md`, sur le modèle de `components/machine/crane/index.js`. Il faut :
   - `meta` identique à la fiche ;
   - les modèles reçus par `ctx.assets`, jamais libérés par le composant ;
   - un matériau modifié est d'abord cloné, et ce clone est libéré ;
   - `update(dt)` renvoie `false` au repos ;
   - avec `reducedMotion`, une image fixe lisible ;
   - aucun texte, aucune couleur d'état dans la scène.
3. Une fiche `mixte` : les pièces du kit sont assemblées par le code selon les données ; le kit a son propre script.

## 6. Les preuves

1. `npm run check` : **montre la sortie**.
2. Skill `revue-planche` : tous les états, clair et sombre, qualité basse et haute, avec et sans animation, planche comparative.
3. Pour un contrôle indépendant, l'agent `controleur`.

## 7. Le constat à PA

- **Vérifié** : check (sa sortie), captures et planche regardées, budget mesuré.
- **Non vérifié** : ce qui manque, et pourquoi.
- **Écarts artistiques** vus sur la planche, et les questions.

Le statut ne passe à `livré` dans `catalogue.json` qu'après la validation de PA. Ensuite seulement : `npm run catalogue`.
