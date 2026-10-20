"""La benne de tri (catalogue : waste-skip) : le tri des dechets de chantier, obligatoire (OLED, art. 17 ; bible 18.8).
Decisions de Pierre-Alain : une couleur de caisse par matiere (19 octobre 2026) ; benne de 7 m3 a la cote reelle,
contenu « melange » en cartons et sacs (20 octobre 2026). Cible : MB_10, sans ses chevrons rouges et blancs.

Une benne basculante ouverte : caisse en trapeze (3,70 x 1,80 m en haut, 2,90 m de fond, 1,45 m de haut), rebord
renforce, deux patins dessous ; quatre tourillons de levage. Le contenu dit la matiere par sa forme, sans texte :
- wood : des planches longues et plates, croisees (MAT_WOOD) ;
- metal : des barres et des tubes fins, en faisceau (MAT_STEEL) ;
- inert : des gravats en blocs anguleux (MAT_CONCRETE, MAT_BRICK) ;
- mixed : des cartons et des sacs (MAT_WOOD, MAT_SURFACE).

Un fichier par matiere, chacun sous le budget de la fiche (le controle mesure chaque GLB) : le fichier principal
ENV_WASTE_SKIP_A_v001 porte la benne « melange » (le contenu par defaut) ; les VARIANTES ENV_WASTE_SKIP_A_WOOD_v001,
_METAL_v001 et _INERT_v001 les trois autres. Chaque fichier a les memes noeuds : BODY, la caisse dans sa couleur ;
CONTENT, le contenu ; FITTINGS, les tourillons graphite, retires en qualite basse (moins de 0,30 m) ; ANCHOR_LABEL.
"""

import math
import random
import sys
from pathlib import Path

import bpy

ASSET = {"id": "waste-skip", "categorie": "site", "nom": "ENV_WASTE_SKIP_A_v001"}

P = "ENV_WASTE_SKIP_A_"
FOND, HAUT_L, LARGE, HAUT = 2.90, 3.70, 1.80, 1.45  # longueur au fond et en haut, largeur, hauteur
PATIN = 0.10  # la caisse est posee sur ses patins
PAROI = 0.07
C1, C2 = 0.02, 0.05
COULEURS = {"WOOD": "MAT_PAINTED_METAL_OLIVE", "METAL": "MAT_PAINTED_METAL_MOSS", "INERT": "MAT_PAINTED_METAL_PLUM",
            "MIXED": "MAT_PAINTED_METAL_GRAPHITE"}
PENTE = (HAUT_L - FOND) / 2 / HAUT  # avancee des bouts par metre de hauteur


def _piece(c, nom, objets, lisser=True):
    """Fusionne les morceaux d'une piece et pose son origine au point d'assemblage (0, 0, 0)."""
    o = c.fusionne(P + nom, objets) if len(objets) > 1 else objets[0]
    o.name = o.data.name = P + nom
    c.origine(o, (0, 0, 0))
    if lisser:
        c.lisse(o)
    return o


def _trapeze(c, nom, retrait, z0, z1, demi_largeur, mat=None):
    """Le volume en trapeze de la caisse, de z0 a z1, retire de retrait sur les bouts, extrude sur toute la largeur."""
    def x(z):
        return FOND / 2 + PENTE * (z - PATIN) - retrait
    profil = [(-x(z0), z0), (x(z0), z0), (x(z1), z1), (-x(z1), z1)]
    return c.prisme(nom, profil, 2 * demi_largeur, (0, -demi_largeur, 0), mat=mat)


def _creuse(o, outil):
    """Retire le volume de l'outil de l'objet (difference booleenne), puis supprime l'outil."""
    m = o.modifiers.new("creux", "BOOLEAN")
    m.operation = "DIFFERENCE"
    m.solver = "EXACT"
    m.object = outil
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier=m.name)
    maillage = outil.data
    bpy.data.objects.remove(outil)
    bpy.data.meshes.remove(maillage)


def _caisse(c, matiere):
    """La caisse ouverte dans la couleur de sa matiere : coque en trapeze, rebord renforce, deux patins."""
    mat = COULEURS[matiere]
    nom = P + "BODY_" + matiere
    coque = _trapeze(c, nom, 0.0, PATIN, PATIN + HAUT, LARGE / 2, mat=mat)
    c.chanfreine(coque, C2, segments=2)
    _creuse(coque, _trapeze(c, nom + "_HOLLOW", PAROI, PATIN + PAROI, PATIN + HAUT + 0.5, LARGE / 2 - PAROI))
    z = PATIN + HAUT - 0.18  # le rebord renforce : 0,18 m, au-dessus du detail minimal de la bible (0,15 m)
    rebord = [c.boite(nom + "_RIM_%d" % k, (HAUT_L + 0.10, 0.12, 0.18), (0, y, z), mat=mat, chanfrein=C1, segments=2)
              for k, y in enumerate((-LARGE / 2, LARGE / 2))]
    rebord += [c.boite(nom + "_RIM_END_%d" % k, (0.12, LARGE + 0.12, 0.18), (x, 0, z), mat=mat, chanfrein=C1, segments=2)
               for k, x in enumerate((-(HAUT_L / 2 + 0.02), HAUT_L / 2 + 0.02))]
    patins = [c.boite(nom + "_SKID_%d" % k, (FOND - 0.30, 0.14, PATIN), (0, y, 0), mat=mat, chanfrein=C1, segments=1)
              for k, y in enumerate((-0.55, 0.55))]
    return _piece(c, "BODY_" + matiere, [coque] + rebord + patins)


def _fond_contenu(c, nom, z, mat):
    """Le dessus du tas, sous les morceaux : il cache le creux de la caisse."""
    return _trapeze(c, nom, PAROI + 0.01, PATIN + PAROI, z, LARGE / 2 - PAROI - 0.01, mat=mat)


def _incline(o, rx=0.0, ry=0.0, rz=0.0):
    o.rotation_euler = (math.radians(rx), math.radians(ry), math.radians(rz))
    bpy.context.view_layer.update()
    return o


def _bloc(c, nom, taille, centre, rotation, mat):
    """Un pave pose par son centre et tourne (degres) : planche, carton, gravat."""
    o = c.boite(nom, taille, (0, 0, -taille[2] / 2), mat=mat)
    _incline(o, *rotation)
    o.location = centre
    c.applique(o)
    return o


def _boule(c, nom, rayon, centre, mat, echelle=(1, 1, 1), subdivisions=2):
    """Une boule a facettes douces : sac, gros gravat (subdivisions 1)."""
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=rayon, location=centre)
    o = bpy.context.active_object
    o.name = o.data.name = nom
    o.scale = echelle
    c.applique(o, rotation=False)
    o.data.materials.append(c.materiau(mat))
    return o


def _contenus(c):
    haut = PATIN + HAUT  # le bord de la caisse
    hasard = random.Random(17)  # le tas est le meme a chaque construction

    # --- wood : des planches de 2,4 a 3,2 m, croisees, sur un lit de bois
    n = P + "CONTENT_WOOD"
    morceaux = [_fond_contenu(c, n, haut - 0.30, "MAT_WOOD")]
    for k in range(9):
        # des planches qui tiennent dans la caisse : 2,0 a 2,6 m, tournees de 18 degres au plus
        longueur = hasard.uniform(2.0, 2.6)
        morceaux.append(_bloc(c, "%s_%d" % (n, k), (longueur, 0.24, 0.05),
                              (hasard.uniform(-0.35, 0.35), hasard.uniform(-0.45, 0.45), haut - 0.12 + 0.08 * (k % 3)),
                              (hasard.uniform(-10, 10), hasard.uniform(-10, 10), hasard.uniform(-18, 18)), "MAT_WOOD"))
    _piece(c, "CONTENT_WOOD", morceaux)

    # --- metal : des barres et des tubes en faisceau, le long de la benne, qui depassent un peu
    n = P + "CONTENT_METAL"
    morceaux = [_fond_contenu(c, n, haut - 0.25, "MAT_STEEL")]
    for k in range(12):
        y = -0.66 + k * 0.12
        z = haut - 0.18 + hasard.uniform(0, 0.16)
        angle = hasard.uniform(-12, 12)
        if k % 2:
            o = c.cylindre("%s_%d" % (n, k), 0.06, hasard.uniform(2.8, 3.6), (0, 0, 0), mat="MAT_STEEL", cotes=6)
            o.location = (0, 0, -o.dimensions.z / 2)
            c.applique(o)
            _incline(o, 0, 90 + hasard.uniform(-8, 8), angle)
            o.location = (hasard.uniform(-0.3, 0.3), y, z)
            c.applique(o)
        else:
            o = _bloc(c, "%s_%d" % (n, k), (hasard.uniform(2.8, 3.6), 0.07, 0.07), (hasard.uniform(-0.3, 0.3), y, z),
                      (0, hasard.uniform(-8, 8), angle), "MAT_STEEL")
        morceaux.append(o)
    _piece(c, "CONTENT_METAL", morceaux)

    # --- inert : un tas de gravats en gros blocs anguleux seulement (une forme ronde se lirait comme les sacs du
    # « melange »), en desordre, bombe au milieu ; quatre eclats de brique a moitie enfouis
    n = P + "CONTENT_INERT"
    morceaux = [_fond_contenu(c, n, haut - 0.20, "MAT_CONCRETE")]
    for k in range(13):
        x = -1.4 + k * 0.23 + hasard.uniform(-0.10, 0.10)
        y = hasard.uniform(-0.50, 0.50) if k % 2 else hasard.uniform(-0.15, 0.15) + (0.35 if k % 4 else -0.35)
        z = haut - 0.15 + 0.35 * (1 - (x / 1.7) ** 2)  # le tas monte au milieu
        cote = hasard.uniform(0.40, 0.58)
        morceaux.append(_bloc(c, "%s_%d" % (n, k), (cote, cote * hasard.uniform(0.6, 0.9), cote * hasard.uniform(0.4, 0.6)),
                              (x, y, z), (hasard.uniform(-25, 25), hasard.uniform(-25, 25), hasard.uniform(0, 90)), "MAT_CONCRETE"))
    for k, (x, y) in enumerate(((-1.1, 0.30), (-0.35, -0.40), (0.45, 0.35), (1.15, -0.25))):
        z = haut - 0.10 + 0.35 * (1 - (x / 1.7) ** 2)  # a moitie dans le tas
        morceaux.append(_bloc(c, "%s_BRICK_%d" % (n, k), (0.42, 0.22, 0.18), (x, y, z),
                              (hasard.uniform(-15, 15), hasard.uniform(-15, 15), hasard.uniform(0, 90)), "MAT_BRICK"))
    _piece(c, "CONTENT_INERT", morceaux, lisser=False)  # aretes vives : des gravats, pas des galets

    # --- mixed : des cartons (cubes) et des sacs (formes rondes et molles)
    n = P + "CONTENT_MIXED"
    morceaux = [_fond_contenu(c, n, haut - 0.25, "MAT_WOOD")]  # les sacs clairs se detachent sur un lit plus fonce
    cartons = [(-1.2, -0.35, 0.60), (-0.45, 0.35, 0.55), (0.55, -0.30, 0.65), (1.25, 0.30, 0.50), (0.1, 0.05, 0.45)]
    for k, (x, y, cote) in enumerate(cartons):
        morceaux.append(_bloc(c, "%s_BOX_%d" % (n, k), (cote, cote * 0.85, cote * 0.75), (x, y, haut - 0.10 + cote * 0.25),
                              (hasard.uniform(-8, 8), hasard.uniform(-8, 8), hasard.uniform(-30, 30)), "MAT_WOOD"))
    sacs = [(-0.85, 0.30), (0.0, -0.40), (0.95, 0.35), (-1.45, 0.05), (1.5, -0.35)]
    for k, (x, y) in enumerate(sacs):
        morceaux.append(_boule(c, "%s_BAG_%d" % (n, k), 0.34, (x, y, haut - 0.05), "MAT_SURFACE", echelle=(1.15, 0.95, 0.75)))
    _piece(c, "CONTENT_MIXED", morceaux)


def _benne(c, matiere):
    """La benne d'une matiere, seule dans la scene : sa caisse, son contenu, ses tourillons, son ancre."""
    _caisse(c, matiere)
    _contenus(c)
    for autre in COULEURS:
        if autre != matiere:
            o = bpy.data.objects[P + "CONTENT_" + autre]
            maillage = o.data
            bpy.data.objects.remove(o)
            bpy.data.meshes.remove(maillage)
    for nom in ("BODY", "CONTENT"):
        o = bpy.data.objects[P + nom + "_" + matiere]
        o.name = o.data.name = P + nom

    # --- les quatre tourillons de levage, graphite, sur les longs pans pres des bouts
    tourillons = []
    for k, (x, y) in enumerate(((-1.25, -1), (1.25, -1), (-1.25, 1), (1.25, 1))):
        o = c.cylindre("%sFITTINGS_%d" % (P, k), 0.08, 0.14, (0, 0, 0), mat="MAT_PAINTED_METAL_GRAPHITE", cotes=8)
        _incline(o, 90, 0, 0)
        o.location = (x, y * (LARGE / 2 + 0.07), PATIN + HAUT - 0.40)
        c.applique(o)
        tourillons.append(o)
    _piece(c, "FITTINGS", tourillons)

    c.ancre("ANCHOR_LABEL", (0, 0, PATIN + HAUT + 1.0))


def construit(c):
    _benne(c, "MIXED")
    if "atelier" in sys.modules or any(Path(x).name == "atelier.py" for x in sys.argv):
        vue_atelier(c)
    return {"triangles_vises": 1000, "animations": []}


VARIANTES = {P + m + "_v001": (lambda c, m=m: _benne(c, m)) for m in ("WOOD", "METAL", "INERT")}


def vue_atelier(c):
    """Atelier seulement (jamais exporte) : les quatre bennes cote a cote, long pan contre long pan, comme dans MB_10,
    pour les captures. Chaque benne est construite comme son fichier, puis renommee et decalee."""
    import os
    basse = os.environ.get("GDC_ATELIER_QUALITE") == "low"

    def range_(matiere, k):
        for nom, court in ((P + "BODY", "BODY"), (P + "CONTENT", "CONTENT"), (P + "FITTINGS", "FITTINGS"),
                           ("ANCHOR_LABEL", "LABEL")):
            o = bpy.data.objects[nom]
            o.name = (P if court != "LABEL" else "ANCHOR_") + "DEMO_%s_%s" % (matiere, court)
            o.location.y = (k - 1.5) * 2.3
            if court == "FITTINGS" and basse:
                o.hide_render = o.hide_viewport = True

    range_("MIXED", 3)
    for k, matiere in enumerate(("WOOD", "METAL", "INERT")):
        _benne(c, matiere)
        range_(matiere, k)
    # un socle de terre dessous, pour juger les valeurs des caisses sur la terre (bible 18.5)
    socle = c.boite(P + "DEMO_PLINTH", (6.0, 10.4, 0.60), (0, 0, -0.60), mat="MAT_EARTH", chanfrein=0.10, segments=3)
    c.lisse(socle)
