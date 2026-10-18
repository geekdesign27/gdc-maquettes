# Les scripts Blender

Chaque modèle 3D livré sort d'un script de ce dossier. On ne retouche jamais un GLB à la main : on modifie le script et on relance. C'est ce qui rend le catalogue reproductible quand la bible change (bible, sections 15 et 17.6).

## Lancer

```bash
npm run blender -- crane          # construit blender/assets/crane.py et exporte le GLB a cote du composant
npm run check                     # controle le GLB, sa provenance et le composant
npm run dev                       # le regarder dans la galerie, puis bouton « Planche »
```

Blender est cherché dans la variable `BLENDER`, puis dans le `PATH`, puis à l'emplacement habituel (`/Applications/Blender.app` sur macOS, `C:\Program Files\Blender Foundation` sur Windows). Il tourne sans fenêtre, avec ses réglages d'usine. À défaut de Blender, un Python qui a le module `bpy` (variable `BLENDER_PYTHON`). Vérifié avec Blender 5.2.2 LTS.

## Écrire le script d'un modèle

Un fichier `blender/assets/<id>.py`, où `<id>` est l'identifiant du catalogue :

```python
ASSET = {"id": "crane", "categorie": "machine", "nom": "VEH_TOWER_CRANE_A_v001"}

def construit(c):          # c : les outils communs (gdc_blender/commun.py)
    ...                    # boite, cylindre, pivot, ancre, anime, materiau...
    return {"animations": ["ANM_TOWER_CRANE_A_LIFTING"]}
```

`construit.py` repart d'une scène vide, appelle `construit`, vérifie les noms, exporte `components/<categorie>/<id>/<nom>.glb` et écrit `asset.json` (empreintes du script, des outils communs, de la palette et du GLB ; version de Blender et de la bible).

## Conventions (bible, section 9, et amendements 17)

- 1 unité = 1 mètre ; Z vertical dans Blender, Y dans Three.js ; avant vers `-Y` ; origine au centre de l'emprise au sol, posée à `z = 0`.
- Noms : `FAMILLE_TYPE_VARIANTE` pour les pièces (`VEH_TOWER_CRANE_A_JIB`), `_v001` pour le fichier, `MAT_` pour les matériaux, `ANM_` pour les animations, `ANCHOR_` pour les ancres. Un nom hors convention arrête l'export.
- Matériaux : uniquement ceux de `src/palette.json`, par `c.materiau("MAT_...")` ; PBR simple, sans nœud que Three.js ne sait pas reproduire.
- Articulations : un pivot vide par mouvement (`c.pivot`), la géométrie rattachée dessous. Les animations tournent ou déplacent les pivots.
- Une animation = une action Blender nommée `ANM_...`, partagée par tous les nœuds qu'elle anime : elle devient un seul clip.
- Ancres : `c.ancre("ANCHOR_LABEL", position)` pour chaque ancre de la fiche.
- Ni caméra ni lumière dans le fichier : l'éclairage appartient à la scène de référence.

## Le connecteur Blender de Claude (MCP)

Il sert à explorer, essayer une forme, regarder un rendu dans Blender. Ce qui est retenu est réécrit dans le script du modèle : un modèle construit seulement à la main ou par le connecteur n'est pas livrable (pas de provenance, pas de reproduction). Le connecteur exécute du Python dans Blender avec tes droits : ne lui fais pas télécharger de modèle, de texture ou de matériau d'une bibliothèque en ligne sans licence notée et ton accord.

## Vérifier avant de livrer

1. `npm run blender -- <id>` sans erreur.
2. `npm run check` : le modèle, sa provenance et le composant passent.
3. Dans la galerie : chaque état, qualité basse et haute, avec et sans animation, et la planche comparative.
4. Le statut passe à « livré » dans `catalogue.json` après ta validation.
