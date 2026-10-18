# Les scripts Blender

Chaque modèle 3D livré sort d'un script de ce dossier. On ne retouche jamais un GLB à la main : on modifie le script et on relance. C'est ce qui rend le catalogue reproductible quand la bible change (bible, sections 15 et 17.6).

## Lancer

```bash
npm run atelier -- crane          # construit sans exporter et rend les captures (blender/.captures/crane/)
npm run blender -- crane          # construit blender/assets/crane.py et exporte le GLB a cote du composant
npm run check                     # controle le GLB, sa provenance et le composant
npm run dev                       # le regarder dans la galerie, puis bouton « Planche »
```

Blender est cherché dans la variable `BLENDER`, puis dans le `PATH`, puis à l'emplacement habituel (`/Applications/Blender.app` sur macOS, `C:\Program Files\Blender Foundation` sur Windows). Il tourne sans fenêtre, avec ses réglages d'usine. À défaut de Blender, un Python qui a le module `bpy` (variable `BLENDER_PYTHON`). Version de référence : **Blender 5.3.0 Beta** (choix de Pierre-Alain, 18 octobre 2026) ; `asset.json` garde la version qui a produit chaque GLB. Changer de version oblige à reconstruire tous les modèles.

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
- Outils pour le rendu « 3D douce » : `boite(..., chanfrein=, segments=)` pour arrondir les arêtes, `lisse(objet)` pour lisser les normales sous un angle, `instance` pour réutiliser une géométrie (écrite une seule fois dans le GLB), `fusionne` pour regrouper les pièces fixes (jamais un pivot ni une pièce animée).

## L'atelier : la boucle rapide

`blender/atelier.py` construit un modèle **sans l'exporter**, le pose dans le studio (même caméra et même lumière que la galerie, lues dans `src/lumiere.json`) et rend quatre captures dans `blender/.captures/<id>/` (non versionné) :

| Capture | Ce qu'on y regarde |
|---|---|
| `iso.png` | La vue de la galerie, en couleur |
| `valeurs.png` | La même en niveaux de gris : les matières se distinguent-elles sans la couleur ? |
| `face.png` | De face (l'avant est `-Y`) : les proportions |
| `silhouette.png` | En noir, à la taille d'affichage réelle : se reconnaît-il ? |

Il renvoie aussi les mesures que le contrôle regardera : triangles, matériaux, noms hors convention, ancres, animations, emprise.

On modifie le script, on relance, on regarde ; quand c'est bon, `npm run blender -- <id>` produit le GLB officiel. L'atelier n'exporte jamais rien.

## Le connecteur Blender de Claude (MCP)

Il sert à faire tourner l'atelier **dans Blender ouvert**, pour regarder et tourner autour du modèle : le connecteur lance le script, il ne modélise jamais. Ce qui est retenu est toujours dans `blender/assets/<id>.py` : un modèle construit à la main ou par le connecteur n'est pas livrable (pas de provenance, pas de reproduction).

- **Mode interactif** : Blender ouvert, add-on MCP activé et son serveur démarré (port 9876). Dans un fichier vide réservé à l'atelier (l'atelier vide la scène ; il refuse un fichier enregistré sans `force=True`) :

  ```python
  import sys, importlib
  sys.path.insert(0, "<chemin du dépôt>/blender")
  import atelier; importlib.reload(atelier)
  result = atelier.essaie("crane")
  ```

- **Mode sans fenêtre** du connecteur : il cherche `blender` ; indique-lui `BLENDER_PATH=/Applications/Blender.app/Contents/MacOS/Blender`. À défaut, `npm run atelier -- <id>` fait la même chose.

Le connecteur exécute du Python dans Blender avec tes droits : ne lui fais pas télécharger de modèle, de texture ou de matériau d'une bibliothèque en ligne sans licence notée et ton accord.

## Vérifier avant de livrer

1. `npm run blender -- <id>` sans erreur.
2. `npm run check` : le modèle, sa provenance et le composant passent.
3. Dans la galerie : chaque état, qualité basse et haute, avec et sans animation, et la planche comparative.
4. Le statut passe à « livré » dans `catalogue.json` après ta validation.
