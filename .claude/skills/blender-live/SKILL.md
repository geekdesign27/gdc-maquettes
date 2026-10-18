---
name: blender-live
description: La boucle rapide de modélisation de l'atelier des maquettes - faire tourner un script blender/assets/<id>.py dans Blender (connecteur MCP ou sans fenêtre), lire les captures iso, valeurs, face et silhouette, mesurer triangles et matériaux, corriger le script et relancer. À utiliser dès qu'il faut essayer, regarder ou ajuster une forme 3D, quand PA dit « montre-moi dans Blender », « essaie », « itère », ou quand le connecteur Blender est en jeu.
---

# Blender en direct : la boucle de l'atelier

**Le connecteur lance le script, il ne modélise jamais.** Toute forme retenue vit dans `blender/assets/<id>.py`. Une géométrie créée seulement par le connecteur n'est pas livrable : si tu explores une idée par du code direct, réécris-la dans le script avant d'aller plus loin.

## 1. Choisir le mode (une seule tentative, pas de boucle)

1. **Blender ouvert** (PA veut voir, tourner autour du modèle) : un appel `mcp__Blender__execute_blender_code` avec

   ```python
   import sys, importlib
   sys.path.insert(0, "/Users/pierre-alain_schutz/Dropbox/Webdesign/Dev/gdc-maquettes/blender")
   import atelier; importlib.reload(atelier)
   result = atelier.essaie("<id>")
   ```

   L'atelier vide la scène : il refuse un fichier enregistré (`RuntimeError`). Ne passe `force=True` qu'avec l'accord de PA.
   Si l'appel échoue avec `Cannot connect to Blender at localhost:9876`, dis-le à PA en une ligne : ouvrir Blender, activer l'add-on MCP et démarrer son serveur. Puis passe au mode 2 sans attendre.
2. **Sans fenêtre** (le plus rapide, toujours disponible) :

   ```bash
   job_id="$(portly temp 'npm run atelier -- <id>' --path /Users/pierre-alain_schutz/Dropbox/Webdesign/Dev/gdc-maquettes --timeout 10m)"
   portly wait "$job_id"
   ```

Les deux modes renvoient le même dict : `triangles`, `materiaux`, `hors_convention`, `ancres`, `animations`, `emprise_m`, `captures`.

## 2. Regarder (lire les PNG avec Read)

Captures dans `blender/.captures/<id>/` :

| Capture | Question à se poser |
|---|---|
| `silhouette.png` | En noir, à taille réelle : reconnaît-on l'objet sans rien d'autre ? Si non, la forme est à revoir avant tout détail. |
| `valeurs.png` | En gris : les matières et les volumes se séparent-ils ? Deux matières de même valeur côte à côte se confondront. |
| `iso.png` | La vue de la galerie : cohérence avec REF_ENV et la charte (rendu 3D douce, chanfreins qui accrochent la lumière). |
| `face.png` | Proportions, hauteurs, exagérations partagées. |

Pour un modèle animé, `atelier.essaie("<id>", image=N)` capture une autre image de l'animation.

## 3. Mesurer et corriger

- `triangles` et `materiaux` sous le plafond de la fiche (`catalogue.json`), avec de la marge pour les états qui ajoutent des pièces.
- `hors_convention` vide ; les `ancres` de la fiche toutes présentes ; les `animations` de la fiche présentes.
- Corrige le **script** (ou `blender/gdc_blender/commun.py` pour un outil partagé), relance, relis. En général, trois à cinq tours suffisent ; au-delà, montre les captures à PA et demande.

## 4. Sortir de la boucle

Quand c'est bon : `npm run blender -- <id>` (export officiel), puis `npm run check`, puis la revue dans la galerie (skill `revue-planche`). L'atelier n'exporte jamais.

## Inspection en mode ouvert

`mcp__Blender__get_objects_summary` (hiérarchie), `mcp__Blender__get_screenshot_of_window_as_image` (ce que voit PA). La caméra `STUDIO_CAMERA` est la vue de la galerie.

## Pannes connues

- `Blender executable not found at 'blender'` (mode sans fenêtre du connecteur) : il lui faut `BLENDER_PATH=/Applications/Blender.app/Contents/MacOS/Blender` ; sinon utilise `npm run atelier`.
- Avertissements `use_nodes ... removed in Blender 6.0` : sans conséquence en 5.3.
- Ne télécharge jamais un modèle, une texture ou un matériau par le connecteur.
