"""La voiture d'ambiance (catalogue : city-car, lot G8 ; flotte du lot G9) : une petite citadine arrondie qui fait vivre
la ville autour du chantier, sans rien dire du harnais. Brief valide par Pierre-Alain le 24 octobre 2026 : 3,60 x 1,70 x
1,50 m, environ 900 triangles ; trois teintes de ville (celles des tenues civiles), posees par le composant.

Une caisse basse tres arrondie (C4), un habitacle vitre en retrait vers l'arriere sous un toit de la teinte, quatre
roues un peu grosses (exageration de la famille des vehicules), des pare-chocs et des logements de phares graphite. Ni
orange ni jaune : jamais un engin du chantier ; trois fois plus courte que le camion de livraison. Pas de feux rouges :
le rouge est celui des decisions attendues.

Production blender, assemblee par le composant en flotte : chaque piece est un noeud VEH_CITY_CAR_A_<PIECE>, pose a
l'origine de la voiture (au sol, l'avant vers -Y) ; le composant la repete par instance, une fois par voiture.
- BODY : la caisse et le toit (la peinture : le composant y met la teinte de chaque voiture) ;
- GLASS : l'habitacle vitre ;
- TRIM : pare-chocs et logements de phares (graphite) ;
- WHEEL : une roue (pneu), origine a son essieu, axe le long de X ; WHEEL_FL, _FR, _RL et _RR sont les pivots vides des
  quatre roues (avant gauche, avant droite, arriere gauche, arriere droite) ;
- LAMP_L et LAMP_R : les points vides des deux lueurs, devant les phares (le composant les y pose la nuit) ;
- BODY_LOW, TRIM_LOW et WHEEL_LOW : la qualite basse (bible 18.3) : sans chanfrein arrondi, sans logements de
  phares, des roues a 8 cotes.
"""

import math
import os
import sys
from pathlib import Path

import bpy

ASSET = {"id": "city-car", "categorie": "machine", "nom": "VEH_CITY_CAR_A_v001"}

P = "VEH_CITY_CAR_A_"
LARGE, LONG = 1.70, 3.60  # en X et en Y
GARDE = 0.28  # le dessous de la caisse
H_CAISSE = 0.70
HABITACLE = (1.52, 2.05, 0.44, 0.22)  # largeur, longueur, hauteur au pied du vitrage, recul vers l'arriere
HAUT_HABITACLE = (1.30, 1.45)  # le haut du vitrage, plus etroit et plus court : pare-brise et lunette en pente
TOIT = 0.12
ROUE = (0.32, 0.22)  # rayon, largeur
ESSIEU_X, ESSIEU_Y = 0.77, 1.15
PHARE = (0.55, 0.72)  # x et z du centre d'un phare
C2, C3, C4 = 0.05, 0.10, 0.20


def _piece(c, nom, objets, lisser=True):
    """Fusionne les morceaux d'une piece et pose son origine a l'origine de la voiture."""
    o = c.fusionne(P + nom, objets) if len(objets) > 1 else objets[0]
    o.name = o.data.name = P + nom
    c.origine(o, (0, 0, 0))
    if lisser:
        c.lisse(o)
    return o


def _caisse(c, basse):
    """La caisse arrondie et le toit, dans la peinture (MAT_SURFACE ici : le composant la remplace par la teinte)."""
    s = "_LOW" if basse else ""
    caisse = c.boite(P + "BODY_SHELL" + s, (LARGE, LONG, H_CAISSE), (0, 0, GARDE), mat="MAT_SURFACE",
                     chanfrein=0.0 if basse else C4, segments=3)
    l, L, h, recul = HABITACLE
    lh, Lh = HAUT_HABITACLE
    toit = c.boite(P + "BODY_ROOF" + s, (lh + 0.06, Lh + 0.06, TOIT), (0, recul + 0.05, GARDE + H_CAISSE + h - 0.03),
                   mat="MAT_SURFACE", chanfrein=0.0 if basse else C3, segments=3)
    return _piece(c, "BODY" + s, [caisse, toit], lisser=not basse)


def _vitres(c):
    """L'habitacle vitre, en retrait vers l'arriere : un tronc, le pare-brise un peu plus couche que la lunette."""
    l, L, h, recul = HABITACLE
    lh, Lh = HAUT_HABITACLE
    o = c.tronc(P + "GLASS", (l, L), (lh, Lh), h, (0, recul, GARDE + H_CAISSE - 0.02), mat="MAT_GLASS")
    c.chanfreine(o, C2, segments=2)
    return _piece(c, "GLASS", [o])


def _garnitures(c, basse):
    """Les pare-chocs ; en qualite haute, les logements de phares."""
    s = "_LOW" if basse else ""
    morceaux = [c.boite(P + "TRIM_BUMPER_%d%s" % (k, s), (LARGE + 0.04, 0.18, 0.24), (0, y, GARDE - 0.04), mat="MAT_PAINTED_METAL_GRAPHITE",
                        chanfrein=0.0 if basse else C2, segments=1) for k, y in enumerate((-LONG / 2 - 0.02, LONG / 2 + 0.02))]
    if not basse:
        x, z = PHARE
        morceaux += [c.boite(P + "TRIM_LAMP_%d" % k, (0.34, 0.06, 0.18), (sx * x, -LONG / 2 - 0.02, z - 0.09),
                             mat="MAT_PAINTED_METAL_GRAPHITE") for k, sx in enumerate((-1, 1))]
    return _piece(c, "TRIM" + s, morceaux, lisser=not basse)


def _roue(c, basse):
    """Une roue, couchee le long de X, origine a son essieu."""
    r, l = ROUE
    s = "_LOW" if basse else ""
    o = c.cylindre(P + "WHEEL" + s, r, l, (0, 0, -l / 2), mat="MAT_RUBBER", cotes=8 if basse else 10)
    o.rotation_euler[1] = math.radians(90)
    c.applique(o)
    if not basse:
        c.chanfreine(o, C2, 1)
    return _piece(c, "WHEEL" + s, [o], lisser=not basse)


def construit(c):
    for basse in (False, True):
        _caisse(c, basse)
        _garnitures(c, basse)
        _roue(c, basse)
    _vitres(c)
    for nom, sx, sy in (("FL", -1, -1), ("FR", 1, -1), ("RL", -1, 1), ("RR", 1, 1)):
        c.pivot(P + "WHEEL_" + nom, (sx * ESSIEU_X, sy * ESSIEU_Y, ROUE[0]))
    for nom, sx in (("L", -1), ("R", 1)):
        c.pivot(P + "LAMP_" + nom, (sx * PHARE[0], -LONG / 2 - 0.06, PHARE[1]))
    if "atelier" in sys.modules or any(Path(x).name == "atelier.py" for x in sys.argv):
        exemple_atelier(c)
    return {"triangles_vises": 900, "animations": []}


def exemple_atelier(c):
    """Atelier seulement (jamais exporte) : une voiture montee comme le composant la monte (les quatre roues a leurs
    pivots), sur une dalle d'enrobe ; les pieces de l'autre qualite sont cachees."""
    s = "_LOW" if os.environ.get("GDC_ATELIER_QUALITE") == "low" else ""
    for nom in ("BODY", "TRIM", "WHEEL"):
        cachee = bpy.data.objects[P + nom + ("" if s else "_LOW")]
        cachee.hide_render = cachee.hide_viewport = True
    roue = bpy.data.objects[P + "WHEEL" + s]
    for k, nom in enumerate(("FL", "FR", "RL", "RR")):
        p = bpy.data.objects[P + "WHEEL_" + nom].location
        o = c.instance("%sDEMO_WHEEL_%d" % (P, k), roue, (p[0], p[1], p[2]))
        o.location = p
    roue.hide_render = roue.hide_viewport = True
    dalle = c.boite(P + "DEMO_ROAD", (3.0, 5.0, 0.60), (0, 0, -0.60), mat="MAT_ASPHALT", chanfrein=0.10, segments=3)
    c.lisse(dalle)
