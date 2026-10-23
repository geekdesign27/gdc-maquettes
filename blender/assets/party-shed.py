"""Le cabanon de la fete (catalogue : party-shed, lot G8) : il montre la pause, le chantier ferme et l'equipe qui fait
la fete en attendant la decision de Pierre-Alain. Fiche validee par Pierre-Alain le 21 octobre 2026 ; brief du
23 octobre 2026 (teintes de fete, notes qui rapetissent, place pres de la zone des transformations).

Un petit cabanon en bois a toit a un pan, un auvent avance sur deux poteaux, une table haute ronde. Sous le bord de
l'auvent pend une lanterne a facettes ; au-dessus de la porte montent des notes de musique (des formes, pas une police).

Production mixte : chaque piece est un noeud ENV_PARTY_SHED_A_<PIECE>, que le composant assemble et anime.
- BODY : le cabanon, l'auvent, ses poteaux et la table, fixes et fusionnes (bois, graphite, la vitre de la fenetre) ;
- DOOR : la porte, origine au gond (le composant la tourne) ;
- LANTERN : le pivot de la lanterne (son axe vertical) ; dessous, LANTERN_CAP (le chapeau et la tige, graphite) et
  LANTERN_FACETS_A, _B et _C (les facettes, en trois groupes alternes, verre eteint) : le composant les rallume chacune
  dans une teinte de fete ;
- NOTE : une croche, origine au centre de sa tete ; le composant la repete par instance, trois au plus.
Ancres : ANCHOR_LABEL (au-dessus du toit), ANCHOR_DOOR (devant la porte), ANCHOR_GATHER (devant l'auvent, ou l'equipe
se rassemble).
Cotes (bible 18.2) : cabanon 3,00 x 2,20 m, 2,90 m a l'avant, 2,40 m a l'arriere ; porte commune 1,10 x 2,40 m ; auvent
de 1,60 m. La lanterne pend pres du bord de l'auvent, assez bas pour se voir depuis la camera iso.
"""

import math
import sys
from pathlib import Path

import bmesh
import bpy

ASSET = {"id": "party-shed", "categorie": "site", "nom": "ENV_PARTY_SHED_A_v001"}

P = "ENV_PARTY_SHED_A_"
LARGE, PROFOND = 3.00, 2.20  # le cabanon, en X et en Y
Y_AVANT = -0.30  # le mur avant ; l'auvent va de Y_AVANT a Y_AUVENT
Y_AUVENT = -1.60
H_AVANT, H_ARRIERE = 2.90, 2.40  # le haut des murs
TOIT = 0.12  # epaisseur du toit et de l'auvent
DEBORD = 0.15
H_AUVENT = (2.60, 2.30)  # le dessous de l'auvent, contre le mur et au bord
PORTE = (1.10, 2.40)
X_PORTE = 0.55  # le centre de la porte ; son gond est a droite (cote camera), elle s'ouvre vers l'avant
FENETRE = (0.80, 0.60, 1.20)  # largeur, hauteur, allege : sur le mur de droite
LANTERNE = (-0.20, Y_AUVENT + 0.30, 1.85)  # son centre
R_LANTERNE = 0.20
TABLE = (-0.75, -1.95)  # le centre de la table haute
C1, C2 = 0.02, 0.05


def _piece(c, nom, objets, lisser=True, origine=(0, 0, 0)):
    """Fusionne les morceaux d'une piece et pose son origine au point d'assemblage."""
    o = c.fusionne(P + nom, objets) if len(objets) > 1 else objets[0]
    o.name = o.data.name = P + nom
    c.origine(o, origine)
    if lisser:
        c.lisse(o)
    return o


def _corps(c):
    """Le cabanon : murs en bois sous un toit a un pan, l'auvent sur ses deux poteaux, la table haute, la fenetre."""
    yc = (Y_AVANT + Y_AVANT + PROFOND) / 2
    murs = c.boite(P + "BODY_WALLS", (LARGE, PROFOND, H_AVANT), (0, yc, 0), mat="MAT_WOOD", chanfrein=C2, segments=2)
    # le pan du toit : on retire le coin au-dessus de la pente (de H_AVANT a l'avant a H_ARRIERE a l'arriere)
    y0, y1 = Y_AVANT, Y_AVANT + PROFOND
    coin = c.prisme(P + "BODY_CUT", [(y0 - 1, H_AVANT + (H_AVANT - H_ARRIERE) / PROFOND), (y1 + 1, H_ARRIERE - (H_AVANT - H_ARRIERE) / PROFOND),
                                     (y1 + 1, H_AVANT + 2), (y0 - 1, H_AVANT + 2)], LARGE + 1, (0, 0, 0))
    coin.rotation_euler = (0, 0, math.radians(90))
    coin.location = (LARGE / 2 + 0.5, 0, 0)
    c.applique(coin)
    c.creuse(murs, coin)
    c.perce(murs, (PORTE[0], 0.4, PORTE[1]), (X_PORTE, Y_AVANT, 0))
    c.perce(murs, (0.4, FENETRE[0], FENETRE[1]), (LARGE / 2, yc + 0.2, FENETRE[2]))

    def pan(nom, ya, za, yb, zb, largeur, mat="MAT_PAINTED_METAL_GRAPHITE", epaisseur=TOIT):
        """Une dalle inclinee de (ya, za) a (yb, zb), son dessous sur cette ligne."""
        profil = [(ya, za), (yb, zb), (yb, zb + epaisseur), (ya, za + epaisseur)]
        o = c.prisme(nom, profil, largeur, (0, 0, 0), mat=mat)
        o.rotation_euler = (0, 0, math.radians(90))
        o.location = (largeur / 2, 0, 0)
        c.applique(o)
        c.chanfreine(o, C1, segments=2)
        return o

    pente = (H_AVANT - H_ARRIERE) / PROFOND
    toit = pan(P + "BODY_ROOF", y0 - DEBORD, H_AVANT + pente * DEBORD, y1 + DEBORD, H_ARRIERE - pente * DEBORD, LARGE + 2 * DEBORD)
    # l'auvent, plus leger que le toit : des planches de bois sur la poutre, sans debord sur les cotes
    auvent = pan(P + "BODY_AWNING", Y_AUVENT - 0.10, H_AUVENT[1] - 0.012, Y_AVANT, H_AUVENT[0], LARGE - 0.10, mat="MAT_WOOD",
                 epaisseur=0.08)
    poteaux = [c.boite(P + "BODY_POST_%d" % k, (0.12, 0.12, H_AUVENT[1]), (x, Y_AUVENT + 0.10, 0), mat="MAT_WOOD",
                       chanfrein=C1, segments=2) for k, x in enumerate((-LARGE / 2 + 0.10, LARGE / 2 - 0.10))]
    poutre = c.boite(P + "BODY_BEAM", (LARGE - 0.10, 0.12, 0.14), (0, Y_AUVENT + 0.10, H_AUVENT[1] - 0.14), mat="MAT_WOOD",
                     chanfrein=C1, segments=2)
    # le cadre de la porte et la vitre de la fenetre
    cadre = [c.boite(P + "BODY_DOOR_FRAME_%d" % k, t, p, mat="MAT_PAINTED_METAL_GRAPHITE") for k, (t, p) in enumerate((
        ((0.08, 0.06, PORTE[1] + 0.08), (X_PORTE - PORTE[0] / 2 - 0.04, Y_AVANT - 0.03, 0)),
        ((0.08, 0.06, PORTE[1] + 0.08), (X_PORTE + PORTE[0] / 2 + 0.04, Y_AVANT - 0.03, 0)),
        ((PORTE[0] + 0.16, 0.06, 0.08), (X_PORTE, Y_AVANT - 0.03, PORTE[1])),
    ))]
    vitre = c.boite(P + "BODY_WINDOW", (0.04, FENETRE[0], FENETRE[1]), (LARGE / 2 - 0.10, yc + 0.2, FENETRE[2]), mat="MAT_GLASS")
    appui = c.boite(P + "BODY_SILL", (0.10, FENETRE[0] + 0.16, 0.08), (LARGE / 2 + 0.02, yc + 0.2, FENETRE[2] - 0.08),
                    mat="MAT_PAINTED_METAL_GRAPHITE")
    # la table haute : plateau rond en bois, fut et pied graphite
    tx, ty = TABLE
    plateau = c.cylindre(P + "BODY_TABLE_TOP", 0.38, 0.05, (tx, ty, 1.05), mat="MAT_WOOD", cotes=12)
    fut = c.cylindre(P + "BODY_TABLE_LEG", 0.04, 1.05, (tx, ty, 0), mat="MAT_PAINTED_METAL_GRAPHITE", cotes=6)
    pied = c.cylindre(P + "BODY_TABLE_FOOT", 0.24, 0.04, (tx, ty, 0), mat="MAT_PAINTED_METAL_GRAPHITE", cotes=8)
    return _piece(c, "BODY", [murs, toit, auvent, poutre, vitre, appui, plateau, fut, pied] + poteaux + cadre)


def _porte(c):
    """La porte, origine au gond (son bord droit), une traverse en Z qui dit « porte de cabanon »."""
    x0 = X_PORTE - PORTE[0] / 2 + 0.02
    x1 = X_PORTE + PORTE[0] / 2 - 0.02
    feuille = c.boite(P + "DOOR_LEAF", (x1 - x0, 0.06, PORTE[1] - 0.04), ((x0 + x1) / 2, Y_AVANT - 0.02, 0.02), mat="MAT_WOOD",
                      chanfrein=C1, segments=2)
    traverses = [c.boite(P + "DOOR_RAIL_%d" % k, (x1 - x0 - 0.12, 0.04, 0.12), ((x0 + x1) / 2, Y_AVANT - 0.07, z), mat="MAT_WOOD")
                 for k, z in enumerate((0.35, PORTE[1] - 0.45))]
    from mathutils import Vector
    a, b = Vector((x0 + 0.10, Y_AVANT - 0.07, 0.47)), Vector((x1 - 0.10, Y_AVANT - 0.07, PORTE[1] - 0.45))
    d = b - a
    z = c.boite(P + "DOOR_BRACE", (0.10, 0.04, d.length), (0, 0, -d.length / 2), mat="MAT_WOOD")
    z.rotation_mode = "QUATERNION"
    z.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
    z.location = (a + b) / 2
    c.applique(z)
    poignee = c.boite(P + "DOOR_HANDLE", (0.16, 0.06, 0.05), (x0 + 0.15, Y_AVANT - 0.10, 1.05), mat="MAT_PAINTED_METAL_GRAPHITE")
    return _piece(c, "DOOR", [feuille, z, poignee] + traverses, origine=(x1, Y_AVANT, 0))


def _lanterne(c):
    """La lanterne a facettes : une boule a facettes larges (8 x 4), un chapeau et une tige jusqu'a la poutre. Les
    facettes sont reparties en trois groupes alternes, un par teinte de fete. Le tout sous un pivot a son axe."""
    x, y, z = LANTERNE
    pivot = c.pivot(P + "LANTERN", (x, y, z))
    bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=4, radius=R_LANTERNE, location=(x, y, z))
    boule = bpy.context.active_object
    boule.scale = (1, 1, 1.15)
    c.applique(boule, rotation=False)
    b = bmesh.new()
    b.from_mesh(boule.data)
    b.faces.ensure_lookup_table()
    groupes = {"A": [], "B": [], "C": []}
    for f in b.faces:
        centre = f.calc_center_median()  # dans le repere de la boule, centree sur son origine
        quartier = int(((math.atan2(centre.y, centre.x) + math.pi) / (2 * math.pi)) * 8) % 8
        anneau = 0 if centre.z > 0 else 1
        groupes["ABC"[(quartier + anneau) % 3]].append(f.index)
    b.free()
    facettes = []
    for g, indices in groupes.items():
        o = boule.copy()
        o.data = boule.data.copy()
        bpy.context.scene.collection.objects.link(o)
        b = bmesh.new()
        b.from_mesh(o.data)
        b.faces.ensure_lookup_table()
        bmesh.ops.delete(b, geom=[f for f in b.faces if f.index not in indices], context="FACES")
        b.to_mesh(o.data)
        b.free()
        o.name = o.data.name = P + "LANTERN_FACETS_" + g
        o.data.materials.clear()
        o.data.materials.append(c.materiau("MAT_GLASS"))
        c.origine(o, (x, y, z))
        c.rattache(o, pivot)
        facettes.append(o)
    maillage = boule.data
    bpy.data.objects.remove(boule)
    bpy.data.meshes.remove(maillage)
    haut = H_AUVENT[1] - 0.14  # le dessous de la poutre
    chapeau = c.cylindre(P + "LANTERN_CAP_TOP", 0.10, 0.08, (x, y, z + R_LANTERNE * 1.15 - 0.02), mat="MAT_PAINTED_METAL_GRAPHITE", cotes=8)
    tige = c.cylindre(P + "LANTERN_CAP_ROD", 0.02, haut - (z + R_LANTERNE * 1.15), (x, y, z + R_LANTERNE * 1.15),
                      mat="MAT_PAINTED_METAL_GRAPHITE", cotes=6)
    cap = _piece(c, "LANTERN_CAP", [chapeau, tige], lisser=False, origine=(x, y, z))
    c.rattache(cap, pivot)
    return pivot


def _note(c):
    """Une croche : tete ovale penchee, hampe, crochet. 0,45 m de haut, a plat dans le plan XZ (le composant la tourne
    vers la camera). Origine au centre de la tete."""
    bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=5, radius=0.09, location=(0, 0, 0))
    tete = bpy.context.active_object
    tete.scale = (1.35, 0.55, 0.95)
    tete.rotation_euler = (0, math.radians(-25), 0)
    c.applique(tete)
    tete.data.materials.append(c.materiau("MAT_PAINTED_METAL_GRAPHITE"))
    hampe = c.boite(P + "NOTE_STEM", (0.035, 0.05, 0.36), (0.095, 0, 0.0), mat="MAT_PAINTED_METAL_GRAPHITE")
    crochet = c.prisme(P + "NOTE_FLAG", [(0.11, 0.36), (0.11, 0.26), (0.24, 0.14), (0.27, 0.18), (0.22, 0.27)], 0.05, (0, -0.025, 0),
                       mat="MAT_PAINTED_METAL_GRAPHITE")
    tete.name = tete.data.name = P + "NOTE_HEAD"
    o = _piece(c, "NOTE", [tete, hampe, crochet], origine=(0, 0, 0))
    o.location = (X_PORTE, Y_AUVENT - 0.3, H_AUVENT[1] + 0.6)  # devant l'auvent, pour les captures de l'atelier
    return o


def construit(c):
    _corps(c)
    _porte(c)
    _lanterne(c)
    _note(c)
    c.ancre("ANCHOR_LABEL", (0, Y_AVANT + PROFOND / 2, H_AVANT + 0.8))
    c.ancre("ANCHOR_DOOR", (X_PORTE, Y_AVANT - 0.6, 0))
    c.ancre("ANCHOR_GATHER", (-0.2, Y_AUVENT - 0.9, 0))
    if "atelier" in sys.modules or any(Path(x).name == "atelier.py" for x in sys.argv):
        exemple_atelier(c)
    return {"triangles_vises": 1300, "animations": []}


def exemple_atelier(c):
    """Atelier seulement (jamais exporte) : la porte ouverte, comme en fete, sur un socle de terre (bible 18.5)."""
    porte = bpy.data.objects[P + "DOOR"]
    porte.rotation_euler = (0, 0, math.radians(100))
    socle = c.boite(P + "DEMO_PLINTH", (5.0, 6.0, 0.60), (0, -0.4, -0.60), mat="MAT_EARTH", chanfrein=0.10, segments=3)
    c.lisse(socle)
