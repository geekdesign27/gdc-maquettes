"""La barriere de blocage (catalogue : blocked-sign) : « un travail est bloque ici » (signaletique : triangle,
barriere). Brief valide par Pierre-Alain le 21 octobre 2026 : latte a bandes orange et blanches, meme impulsion
d'apparition que le panneau de decision.

C'est le seul objet de la scene qui a cette forme (bible 18.8) : une latte basse et pleine sur deux chevalets en A,
et un triangle pointe en haut debout au milieu. L'inverse de la cloture site-fence (2 m de haut, treillis gris, longue
ligne sur plots beton). L'orange est celui de l'objet (fiche et bible 18.8) ; l'orange d'etat est porte par le badge
HTML pose sur ANCHOR_BADGE (bible 17.3).

Cotes, exageration x 1,2 de la famille comprise : latte de 2,40 x 0,30 m, epaisse de 0,06 m, le dessus a 1,20 m ;
sept bandes de 0,34 m (quatre orange, trois blanches) sur les deux faces ; chevalets a x = +/- 0,95 m, tubes de
0,06 m, pieds ecartes de 0,70 m ; triangle equilateral de 0,70 m pose sur la latte, bord orange de 0,10 m et champ
blanc sur les deux faces, pointe a 1,81 m.

Noeuds : PRP_BLOCKED_BARRIER_A_BARRIER (tout fusionne, origine au milieu, au sol), PRP_BLOCKED_BARRIER_A_BARRIER_LOW
(sans chanfrein, pour la qualite basse), ANCHOR_BADGE. L'impulsion d'apparition est jouee par le composant.
"""

import math
import os
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ASSET = {"id": "blocked-sign", "categorie": "signals", "nom": "PRP_BLOCKED_BARRIER_A_v001"}

P = "PRP_BLOCKED_BARRIER_A_"
LATTE = (2.40, 0.06, 0.30)  # longueur, epaisseur, hauteur
DESSUS = 1.20  # dessus de la latte
BANDES = 7  # en alternance, orange aux deux bouts
PLAQUE = 0.006  # epaisseur des bandes et du champ blanc
TRIANGLE, BORD = 0.70, 0.10  # cote du triangle, largeur du bord orange
CHEVALET_X, PIED_Y, TUBE = 0.95, 0.35, 0.03  # position des chevalets, ecart des pieds, rayon des tubes
BADGE = 2.10
C1 = 0.02


def _tube(c, nom, a, b, cotes):
    """Un tube graphite de a a b (points du monde) : un pied de chevalet, une traverse."""
    a, b = Vector(a), Vector(b)
    d = b - a
    o = c.cylindre(nom, TUBE, d.length, (0, 0, -d.length / 2), mat="MAT_PAINTED_METAL_GRAPHITE", cotes=cotes)
    o.rotation_mode = "QUATERNION"
    o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
    o.location = (a + b) / 2
    c.applique(o)
    return o


def _triangle(z_base, cote):
    """Les sommets d'un triangle equilateral pointe en haut, centre en X, base a z_base : profil pour prisme."""
    h = cote * math.sqrt(3) / 2
    return [(-cote / 2, z_base), (cote / 2, z_base), (0, z_base + h)]


def _plaques_blanches(c, nom, profil, y):
    """Une plaque blanche de ce profil sur chaque face, collee a la piece d'epaisseur 2 * y."""
    return [c.prisme("%s_%d" % (nom, k), profil, PLAQUE, (0, y if s > 0 else -y - PLAQUE, 0), mat="MAT_SURFACE")
            for k, s in enumerate((-1, 1))]


def _barriere(c, nom, basse):
    chanfrein = 0.0 if basse else C1
    long_, ep, haut = LATTE
    bas = DESSUS - haut
    morceaux = [c.boite(nom + "_PLANK", LATTE, (0, 0, bas), mat="MAT_PAINTED_METAL_ORANGE", chanfrein=chanfrein,
                        segments=2)]
    # les bandes blanches, une sur deux, un peu en retrait du haut et du bas (hors du chanfrein)
    pas = long_ / BANDES
    for k in range(1, BANDES, 2):
        x0 = -long_ / 2 + k * pas
        profil = [(x0, bas + 0.02), (x0 + pas, bas + 0.02), (x0 + pas, DESSUS - 0.02), (x0, DESSUS - 0.02)]
        morceaux += _plaques_blanches(c, "%s_BAND_%d" % (nom, k), profil, ep / 2)

    # le triangle debout sur la latte : bord orange, champ blanc sur les deux faces
    cadre = c.prisme(nom + "_TRIANGLE", _triangle(DESSUS, TRIANGLE), ep, (0, -ep / 2, 0), mat="MAT_PAINTED_METAL_ORANGE")
    if not basse:
        c.chanfreine(cadre, C1, segments=2)
    morceaux.append(cadre)
    rayon = TRIANGLE / (2 * math.sqrt(3))  # rayon du cercle inscrit : le champ est retire du bord de BORD partout
    champ = (rayon - BORD) * 2 * math.sqrt(3)
    morceaux += _plaques_blanches(c, nom + "_FIELD", _triangle(DESSUS + BORD, champ), ep / 2)

    # les deux chevalets en A, sous la latte : deux pieds ecartes en Y, une traverse, un sabot sous la latte
    cotes = 4 if basse else 6
    for k, x in enumerate((-CHEVALET_X, CHEVALET_X)):
        for j, s in enumerate((-1, 1)):
            morceaux.append(_tube(c, "%s_LEG_%d_%d" % (nom, k, j), (x, s * PIED_Y, 0), (x, s * 0.05, bas), cotes))
        z = 0.35
        y = PIED_Y - (PIED_Y - 0.05) * z / bas
        morceaux.append(_tube(c, "%s_RAIL_%d" % (nom, k), (x, -y, z), (x, y, z), cotes))
        morceaux.append(c.boite("%s_SHOE_%d" % (nom, k), (0.10, 0.14, 0.06), (x, 0, bas - 0.06),
                                mat="MAT_PAINTED_METAL_GRAPHITE"))

    o = c.fusionne(nom, morceaux)
    c.origine(o, (0, 0, 0))
    if not basse:
        c.lisse(o)
    return o


def construit(c):
    _barriere(c, P + "BARRIER", basse=False)
    _barriere(c, P + "BARRIER_LOW", basse=True)
    c.ancre("ANCHOR_BADGE", (0, 0, BADGE))

    if "atelier" in sys.modules or any(Path(x).name == "atelier.py" for x in sys.argv):
        exemple_atelier(c)
    return {"triangles_vises": 800, "animations": []}


def exemple_atelier(c):
    """Atelier seulement (jamais exporte) : montre la variante de la qualite demandee, sur un socle de terre (bible
    18.5), pour juger les valeurs de l'orange et du blanc sur la terre."""
    basse = os.environ.get("GDC_ATELIER_QUALITE") == "low"
    cachee = bpy.data.objects[P + ("BARRIER" if basse else "BARRIER_LOW")]
    cachee.hide_render = cachee.hide_viewport = True
    socle = c.boite(P + "DEMO_PLINTH", (4.0, 3.0, 0.60), (0, 0, -0.60), mat="MAT_EARTH", chanfrein=0.10, segments=3)
    c.lisse(socle)
