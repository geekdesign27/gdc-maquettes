"""Le stockage de materiaux (catalogue : material-storage) : l'approvisionnement du chantier, les materiaux qui
attendent d'etre poses. Fiche et brief valides par Pierre-Alain le 21 octobre 2026.

Une aire posee sur le terrain de chantier, sans socle. Quatre lots qui se reconnaissent a leur forme, sans texte ni
film plastique :
- BLOCKS : deux palettes de parpaings, chacune 1,20 x 1,00 m, quatre rangs de deux blocs croises en MAT_CONCRETE ;
- PIPES : six buses en beton de 0,80 m de diametre et 2,00 m de long, creuses, en pyramide 3 + 2 + 1 sur deux cales ;
- REBAR : une botte de neuf barres d'armature de 6,00 m (MAT_STEEL, 0,07 m : le minimum d'un filiforme, bible 18.3)
  sur trois chevrons ;
- CABLE : un touret de 1,20 m de diametre, joues en bois, cable enroule en graphite.

Un seul fichier : chaque lot est un noeud fusionne, son origine au centre de son emprise au sol, pose a sa place de
l'aire complete (mixed, environ 7 x 4 m). Le composant garde les quatre ou n'en garde qu'un, recentre.
L'avant est -Y : la botte, basse, devant ; les buses montrent leurs bouts creux a la camera.
"""

import math
import sys
from pathlib import Path

import bpy

ASSET = {"id": "material-storage", "categorie": "site", "nom": "PRP_MATERIAL_STORAGE_A_v001"}

P = "PRP_MATERIAL_STORAGE_A_"
C1, C2 = 0.02, 0.05
# les centres des lots dans l'aire complete (Blender : X a droite, -Y vers l'avant)
CENTRES = {"BLOCKS": (-2.6, 0.6), "PIPES": (0.0, 0.7), "CABLE": (2.5, 0.6), "REBAR": (0.0, -1.25)}


def _tourne(o, rx=0.0, ry=0.0, centre=(0, 0, 0)):
    """Tourne un objet pose a l'origine (degres), applique, puis le place par son centre."""
    o.rotation_euler = (math.radians(rx), math.radians(ry), 0)
    bpy.context.view_layer.update()
    c_ = o.location
    o.location = (centre[0] + c_[0], centre[1] + c_[1], centre[2] + c_[2])
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return o


def _barre(c, nom, rayon, longueur, axe, centre, mat, cotes):
    """Un cylindre couche le long de X ou de Y, pose par son centre."""
    o = c.cylindre(nom, rayon, longueur, (0, 0, -longueur / 2), mat=mat, cotes=cotes)
    return _tourne(o, rx=90 if axe == "Y" else 0, ry=90 if axe == "X" else 0, centre=centre)


def _lot(c, nom, objets, lisser=True):
    """Fusionne les morceaux d'un lot et pose son origine au centre de son emprise, au sol."""
    o = c.fusionne(P + nom, objets) if len(objets) > 1 else objets[0]
    o.name = o.data.name = P + nom
    x, y = CENTRES[nom]
    c.origine(o, (x, y, 0))
    if lisser:
        c.lisse(o)
    return o


def _parpaings(c):
    cx, cy = CENTRES["BLOCKS"]
    morceaux = []
    for k, dy in enumerate((-0.55, 0.55)):
        y = cy + dy
        n = "%sBLOCKS_%d" % (P, k)
        # la palette : trois semelles et un plateau
        for j, sy in enumerate((-0.42, 0, 0.42)):
            morceaux.append(c.boite("%s_SKID_%d" % (n, j), (1.20, 0.14, 0.10), (cx, y + sy, 0), mat="MAT_WOOD",
                                    chanfrein=C1, segments=1))
        morceaux.append(c.boite(n + "_DECK", (1.20, 1.00, 0.05), (cx, y, 0.10), mat="MAT_WOOD", chanfrein=C1, segments=1))
        # quatre rangs de deux blocs, croises d'un rang a l'autre : les sillons disent « parpaings empiles », pas
        # « plaques » ; chanfrein a un segment, pour tenir le budget
        for r in range(4):
            for j, d in enumerate((-1, 1)):
                taille, decale = ((0.57, 0.96, 0.19), (d * 0.295, 0)) if r % 2 == 0 else ((1.16, 0.47, 0.19), (0, d * 0.245))
                morceaux.append(c.boite("%s_BLOCK_%d_%d" % (n, r, j), taille, (cx + decale[0], y + decale[1], 0.15 + r * 0.20),
                                        mat="MAT_CONCRETE", chanfrein=C2, segments=1))
    return _lot(c, "BLOCKS", morceaux)


def _buses(c):
    cx, cy = CENTRES["PIPES"]
    r, longueur, cale = 0.40, 2.00, 0.10
    morceaux = [c.boite("%sPIPES_CHOCK_%d" % (P, k), (2.60, 0.16, cale), (cx, cy + dy, 0), mat="MAT_WOOD",
                        chanfrein=C1, segments=1) for k, dy in enumerate((-0.6, 0.6))]
    rangs = [(-0.8, 0), (0, 0), (0.8, 0), (-0.4, 1), (0.4, 1), (0, 2)]
    for k, (dx, rang) in enumerate(rangs):
        z = cale + r + rang * r * math.sqrt(3)
        n = "%sPIPES_%d" % (P, k)
        buse = _barre(c, n, r, longueur, "Y", (cx + dx, cy, z), "MAT_CONCRETE", 16)
        c.creuse(buse, _barre(c, n + "_HOLE", r - 0.09, longueur + 0.2, "Y", (cx + dx, cy, z), None, 16))
        morceaux.append(buse)
    return _lot(c, "PIPES", morceaux)


def _armatures(c):
    cx, cy = CENTRES["REBAR"]
    morceaux = [c.boite("%sREBAR_SLEEPER_%d" % (P, k), (0.12, 0.90, 0.10), (cx + dx, cy, 0), mat="MAT_WOOD",
                        chanfrein=C1, segments=1) for k, dx in enumerate((-2.4, 0, 2.4))]
    r = 0.035
    k = 0
    for couche, n in enumerate((4, 3, 2)):  # la botte s'affine vers le haut
        for i in range(n):
            y = cy + (i - (n - 1) / 2) * 2 * r * 1.05
            z = 0.10 + r + couche * r * 1.8
            morceaux.append(_barre(c, "%sREBAR_BAR_%d" % (P, k), r, 6.0, "X", (cx, y, z), "MAT_STEEL", 6))
            k += 1
    return _lot(c, "REBAR", morceaux)


def _touret(c):
    cx, cy = CENTRES["CABLE"]
    R, large = 0.60, 0.80
    morceaux = [_barre(c, "%sCABLE_FLANGE_%d" % (P, k), R, 0.08, "Y", (cx, cy + dy, R), "MAT_WOOD", 24)
                for k, dy in enumerate((-(large - 0.08) / 2, (large - 0.08) / 2))]
    morceaux.append(_barre(c, P + "CABLE_COIL", 0.46, large - 0.16, "Y", (cx, cy, R), "MAT_PAINTED_METAL_GRAPHITE", 24))
    return _lot(c, "CABLE", morceaux)


def construit(c):
    _parpaings(c)
    _buses(c)
    _armatures(c)
    _touret(c)
    c.ancre("ANCHOR_LABEL", (0, 0, 3.0))  # au-dessus de la pyramide de buses, le plus haut lot
    if "atelier" in sys.modules or any(Path(x).name == "atelier.py" for x in sys.argv):
        vue_atelier(c)
    return {"triangles_vises": 2400, "animations": []}


def vue_atelier(c):
    """Atelier seulement (jamais exporte) : un plateau de terre dessous, pour juger les valeurs sur la terre."""
    socle = c.boite(P + "DEMO_PLINTH", (8.0, 5.0, 0.60), (0, 0, -0.60), mat="MAT_EARTH", chanfrein=0.10, segments=3)
    c.lisse(socle)
