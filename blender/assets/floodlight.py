"""Le projecteur de chantier (catalogue : floodlight) : un mat galvanise, leste, avec un ou deux projecteurs LED.
Fiche validee par Pierre-Alain le 21 octobre 2026 (plan D-2). Aucune vraie lumiere dans le modele (bible 17) : le
composant fait briller le verre et pose une tache douce au sol, dans la couleur des projecteurs de src/lumiere.json.

Tout le metal est en acier galvanise (MAT_STEEL), le verre en MAT_GLASS : le budget de trois materiaux garde la place
du verre allume et de la tache au sol, faits par le composant.

Production blender, assemblee par le composant (comme la cloture) : chaque piece est un noeud ENV_FLOODLIGHT_A_<PIECE>.
- BASE : le lest de 0,80 x 0,80 x 0,40 m et son manchon, origine au milieu, au sol ;
- MAST : le mat de 0,12 m de diametre, 1 m de haut, origine en bas ; le composant le pose sur le lest et l'etire
  jusqu'a la hauteur voulue ;
- BAR : la barre de tete de 1,30 m (deux projecteurs), origine en son milieu, au sommet du mat ;
- HEAD : un projecteur, boitier et verre, incline de 35 degres vers l'avant (-Y), origine au point de fixation.
Chaque piece a sa variante _LOW (qualite basse : sans chanfrein, moins de cotes).
Cotes : le projecteur de 0,55 x 0,42 m est agrandi d'environ 1,3 (un vrai mesure 0,40 x 0,30 m) pour se lire a
25 px par metre ; le mat reste au-dessus du minimum filiforme (0,06 m, bible 18.3).
"""

import math
import os
import sys
from pathlib import Path

import bpy

ASSET = {"id": "floodlight", "categorie": "site", "nom": "ENV_FLOODLIGHT_A_v001"}

P = "ENV_FLOODLIGHT_A_"
LEST = (0.80, 0.40)  # cote et hauteur
MANCHON = (0.10, 0.30)  # rayon et hauteur, au-dessus du lest
MAT_R = 0.06
BARRE = (1.30, 0.08)  # longueur et section
TETE = (0.55, 0.14, 0.42)  # largeur, epaisseur, hauteur du boitier
VERRE = (0.47, 0.01, 0.34)
INCLINAISON = 35  # degres vers le bas
BRAS = 0.20  # du point de fixation a l'arriere du boitier
ECART_TETES = 0.33  # de l'axe du mat au milieu d'une tete (deux tetes)
C1, C2 = 0.02, 0.05


def _piece(c, nom, objets):
    """Fusionne les morceaux d'une piece et pose son origine au point d'assemblage (0, 0, 0)."""
    o = c.fusionne(P + nom, objets) if len(objets) > 1 else objets[0]
    o.name = o.data.name = P + nom
    c.origine(o, (0, 0, 0))
    return o


def _base(c, nom, basse):
    lest = c.boite(nom + "_BLOCK", (LEST[0], LEST[0], LEST[1]), mat="MAT_STEEL",
                   chanfrein=0.0 if basse else C2, segments=2)
    manchon = c.cylindre(nom + "_SLEEVE", MANCHON[0], MANCHON[1], (0, 0, LEST[1]), mat="MAT_STEEL",
                         cotes=6 if basse else 12)
    o = _piece(c, nom, [lest, manchon])
    if not basse:
        c.lisse(o)
    return o


def _mat(c, nom, basse):
    o = c.cylindre(nom, MAT_R, 1.0, mat="MAT_STEEL", cotes=6 if basse else 8)
    o.name = o.data.name = P + nom
    c.origine(o, (0, 0, 0))
    return o


def _barre(c, nom, basse):
    o = c.boite(nom, (BARRE[0], BARRE[1], BARRE[1]), (0, 0, -BARRE[1] / 2), mat="MAT_STEEL")
    o.name = o.data.name = P + nom
    c.origine(o, (0, 0, 0))
    return o


def _tete(c, nom, basse):
    """Le bras part du point de fixation vers l'avant ; le boitier et son verre, inclines vers le bas, au bout."""
    bras = c.boite(nom + "_ARM", (0.06, BRAS, 0.06), (0, -BRAS / 2, -0.03), mat="MAT_STEEL")
    boitier = c.boite(nom + "_HOUSING", TETE, (0, 0, -TETE[2] / 2), mat="MAT_STEEL",
                      chanfrein=0.0 if basse else C1, segments=2)
    verre = c.boite(nom + "_LENS", VERRE, (0, -TETE[1] / 2 - VERRE[1] / 2 + 0.002, -VERRE[2] / 2), mat="MAT_GLASS")
    corps = c.fusionne(nom + "_BODY", [boitier, verre])  # centre du boitier a l'origine
    corps.rotation_euler = (math.radians(INCLINAISON), 0, 0)
    corps.location = (0, -BRAS - TETE[1] / 2, -0.06)
    c.applique(corps)
    o = _piece(c, nom, [bras, corps])
    if not basse:
        c.lisse(o)
    return o


def construit(c):
    for basse, suffixe in ((False, ""), (True, "_LOW")):
        _base(c, "BASE" + suffixe, basse)
        _mat(c, "MAST" + suffixe, basse)
        _barre(c, "BAR" + suffixe, basse)
        _tete(c, "HEAD" + suffixe, basse)

    if "atelier" in sys.modules or any(Path(x).name == "atelier.py" for x in sys.argv):
        exemple_atelier(c)
    return {"triangles_vises": 700, "animations": []}


def exemple_atelier(c):
    """Atelier seulement (jamais exporte) : un projecteur de 6 m a deux tetes, monte comme le composant le monte, sur
    un socle de terre (bible 18.5). Les pieces de l'autre qualite sont cachees."""
    basse = os.environ.get("GDC_ATELIER_QUALITE") == "low"
    s = "_LOW" if basse else ""
    for nom in ("BASE", "MAST", "BAR", "HEAD"):
        cachee = bpy.data.objects[P + nom + ("" if basse else "_LOW")]
        cachee.hide_render = cachee.hide_viewport = True
    hauteur = 6.0
    mat = bpy.data.objects[P + "MAST" + s]
    mat.location = (0, 0, LEST[1])
    mat.scale = (1, 1, hauteur - LEST[1])
    bpy.data.objects[P + "BAR" + s].location = (0, 0, hauteur)
    tete = bpy.data.objects[P + "HEAD" + s]
    tete.location = (-ECART_TETES, 0, hauteur)
    c.instance(P + "DEMO_HEAD", tete, (2 * ECART_TETES, 0, 0))
    socle = c.boite(P + "DEMO_PLINTH", (3.0, 3.0, 0.60), (0, 0, -0.60), mat="MAT_EARTH", chanfrein=0.10, segments=3)
    c.lisse(socle)
