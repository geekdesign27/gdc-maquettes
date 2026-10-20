"""Le panneau de decision (catalogue : decision-sign) : « une decision t'attend ici » (signaletique : panneau
rectangulaire, point d'exclamation). Modele maitre de la famille des signaux ; brief valide par Pierre-Alain le
20 octobre 2026 (point d'exclamation en relief graphite sur les deux faces, socle rond en caoutchouc).

Aucune couleur d'etat (bible 17.3) : le rouge est porte par le badge HTML pose sur ANCHOR_BADGE. Le signal se lit a sa
forme : un panneau en hauteur sur un seul poteau, au-dessus des tetes (personnage de 1,70 m), et le point
d'exclamation. Le panneau du permis (permit-board) est en largeur sur deux poteaux : c'est ce qui les separe.

Cotes, exageration x 1,2 de la famille comprise : panneau 0,90 x 1,20 m de 1,20 a 2,40 m, epais de 0,12 m pour
enserrer le poteau (les deux faces restent libres) ; face blanche posee dans le cadre graphite, a 0,06 m du bord ;
point d'exclamation de 0,85 m (barre en coin de 0,55 m, point de 0,20 m) en relief de 0,02 m ; poteau de 0,10 m ;
socle rond de panneau mobile de 0,60 m sur 0,10 m.

Noeuds : PRP_DECISION_SIGN_A_SIGN (tout fusionne, origine au pied), PRP_DECISION_SIGN_A_SIGN_LOW (le meme sans
chanfrein et avec moins de cotes, pour la qualite basse), ANCHOR_BADGE. Aucun pivot : l'impulsion d'apparition est
jouee par le composant.
"""

import math
import os
import sys
from pathlib import Path

import bpy

ASSET = {"id": "decision-sign", "categorie": "signals", "nom": "PRP_DECISION_SIGN_A_v001"}

P = "PRP_DECISION_SIGN_A_"
LARGE, HAUT, EPAIS = 0.90, 1.20, 0.12  # le panneau
BAS = 1.20  # dessous du panneau
BORD = 0.06  # le cadre graphite visible autour de la face blanche
FACE = 0.01  # epaisseur de la face blanche
RELIEF = 0.02  # relief du point d'exclamation
POTEAU = 0.05  # rayon
SOCLE = (0.30, 0.10)  # rayon et hauteur
BADGE = 2.65
C1, C2 = 0.02, 0.05


def _couche(o):
    """Couche un cylindre (axe Z) le long de Y : le point de l'exclamation, tourne vers la face."""
    o.rotation_euler = (math.radians(90), 0, 0)
    bpy.context.view_layer.update()
    return o


def _exclamation(c, nom, cote, basse):
    """Le point d'exclamation d'une face : cote -1 pour l'avant (-Y), +1 pour l'arriere. Barre en coin, plus large en
    haut, puis le point ; l'ensemble de 0,85 m centre sur le panneau."""
    milieu = BAS + HAUT / 2
    z_point = milieu - 0.425  # bas du point
    z_barre = z_point + 0.20 + 0.10  # bas de la barre, au-dessus du point et de l'espace
    y = cote * (EPAIS / 2 + FACE)  # pose sur la face blanche
    profil = [(-0.07, z_barre), (0.07, z_barre), (0.10, z_barre + 0.55), (-0.10, z_barre + 0.55)]
    barre = c.prisme("%s_BAR" % nom, profil, RELIEF, (0, y if cote > 0 else y - RELIEF, 0), mat="MAT_PAINTED_METAL_GRAPHITE")
    point = c.cylindre("%s_DOT" % nom, 0.10, RELIEF, (0, 0, -RELIEF / 2), mat="MAT_PAINTED_METAL_GRAPHITE",
                       cotes=8 if basse else 12)
    _couche(point)
    point.location = (0, y + cote * RELIEF / 2, z_point + 0.10)
    c.applique(point)
    return [barre, point]


def _panneau(c, nom, basse):
    """Le panneau entier : cadre, deux faces blanches, deux points d'exclamation, poteau et socle, fusionnes."""
    chanfrein = 0.0 if basse else C1
    cadre = c.boite(nom + "_FRAME", (LARGE, EPAIS, HAUT), (0, 0, BAS), mat="MAT_PAINTED_METAL_GRAPHITE",
                    chanfrein=chanfrein, segments=2)
    morceaux = [cadre]
    for k, cote in enumerate((-1, 1)):
        y = cote * (EPAIS / 2 + FACE / 2)  # centre de la face, collee au cadre
        face = c.boite("%s_FACE_%d" % (nom, k), (LARGE - 2 * BORD, FACE, HAUT - 2 * BORD), (0, y, BAS + BORD),
                       mat="MAT_SURFACE")
        morceaux.append(face)
        morceaux += _exclamation(c, "%s_MARK_%d" % (nom, k), cote, basse)
    morceaux.append(c.cylindre(nom + "_POST", POTEAU, BAS + 0.06 - SOCLE[1], (0, 0, SOCLE[1]),
                               mat="MAT_PAINTED_METAL_GRAPHITE", cotes=6 if basse else 8))
    socle = c.cylindre(nom + "_BASE", SOCLE[0], SOCLE[1], (0, 0, 0), mat="MAT_RUBBER", cotes=10 if basse else 16)
    if not basse:
        c.chanfreine(socle, C2, segments=2)
    morceaux.append(socle)
    o = c.fusionne(nom, morceaux)
    c.origine(o, (0, 0, 0))
    if not basse:
        c.lisse(o)
    return o


def construit(c):
    _panneau(c, P + "SIGN", basse=False)
    _panneau(c, P + "SIGN_LOW", basse=True)
    c.ancre("ANCHOR_BADGE", (0, 0, BADGE))

    if "atelier" in sys.modules or any(Path(x).name == "atelier.py" for x in sys.argv):
        exemple_atelier(c)
    return {"triangles_vises": 600, "animations": []}


def exemple_atelier(c):
    """Atelier seulement (jamais exporte) : montre la variante de la qualite demandee, sur un socle de terre (bible
    18.5), pour juger les valeurs du panneau sur la terre."""
    basse = os.environ.get("GDC_ATELIER_QUALITE") == "low"
    cachee = bpy.data.objects[P + ("SIGN" if basse else "SIGN_LOW")]
    cachee.hide_render = cachee.hide_viewport = True
    socle = c.boite(P + "DEMO_PLINTH", (3.0, 3.0, 0.60), (0, 0, -0.60), mat="MAT_EARTH", chanfrein=0.10, segments=3)
    c.lisse(socle)
