"""Le cabanon de la fete (catalogue : party-shed, lot G8) : il montre la pause, le chantier ferme et l'equipe qui fait
la fete en attendant la decision de Pierre-Alain. Fiche validee par Pierre-Alain le 21 octobre 2026 ; brief du
23 octobre 2026 (teintes de fete, notes qui rapetissent, place pres de la zone des transformations) ; deuxieme passe du
meme jour, apres la planche (« la fete se lit mal, le cabanon lui-meme ») : une silhouette de cabane (toit a deux pans
prolonge en auvent, pignon en facade, planches en relief) et une lanterne plus grosse, bien sous le bord de l'auvent.

Un cabanon en bois, son toit graphite a deux pans prolonge vers l'avant en auvent sur deux poteaux, une table haute
ronde devant. Sous l'auvent pend une lanterne a facettes ; au-dessus de la porte montent des notes de musique (des
formes, pas une police).

Production mixte : chaque piece est un noeud ENV_PARTY_SHED_A_<PIECE>, que le composant assemble et anime.
- BODY : le cabanon, son toit et son auvent, les poteaux et la table, fixes et fusionnes (bois, graphite, la vitre) ;
- DOOR : la porte, origine au gond (le composant la tourne) ;
- LANTERN : le pivot de la lanterne (son axe vertical) ; dessous, LANTERN_CAP (le chapeau et la tige, graphite) et
  LANTERN_FACETS_A, _B et _C (les facettes, en trois groupes alternes, verre eteint) : le composant les rallume chacune
  dans une teinte de fete ;
- NOTE : une croche, origine au centre de sa tete ; le composant la repete par instance, trois au plus.
Ancres : ANCHOR_LABEL (au-dessus du faite), ANCHOR_DOOR (devant la porte), ANCHOR_GATHER (devant l'auvent, ou l'equipe
se rassemble).
Cotes (bible 18.2) : cabanon 3,00 x 2,40 m, murs de 2,50 m, faite a 3,50 m ; porte commune 1,10 x 2,40 m (dans le
pignon) ; auvent de 1,50 m. La lanterne pend pres du bord de l'auvent, assez bas pour se voir depuis la camera iso.
"""

import math
import sys
from pathlib import Path

import bmesh
import bpy

ASSET = {"id": "party-shed", "categorie": "site", "nom": "ENV_PARTY_SHED_A_v001"}

P = "ENV_PARTY_SHED_A_"
LARGE, PROFOND = 3.00, 2.40  # le cabanon, en X et en Y
Y_AVANT = -0.30  # le mur avant (le pignon) ; l'auvent va de Y_AVANT a Y_AUVENT
Y_AUVENT = -1.80
H_MUR, H_FAITE = 2.50, 3.50  # le haut des murs de cote, le faite
TOIT = 0.12  # epaisseur des pans
DEBORD = 0.25  # le toit deborde des murs de cote et de l'arriere
PORTE = (1.10, 2.40)
X_PORTE = 0.55  # le centre de la porte ; son gond est a droite (cote camera), elle s'ouvre vers l'avant
FENETRE = (0.80, 0.60, 1.20)  # largeur, hauteur, allege : sur le mur de droite
LANTERNE = (-0.35, Y_AUVENT + 0.40, 2.10)  # son centre
R_LANTERNE = 0.30
TABLE = (-0.75, -2.20)  # le centre de la table haute
LATTE = (0.07, 0.03, 0.42)  # largeur, saillie, pas des couvre-joints sur les murs vus de la camera
C1, C2 = 0.02, 0.05
PENTE = (H_FAITE - H_MUR) / (LARGE / 2)


def dessous_toit(x):
    """La hauteur du dessous du toit au-dessus de x (le toit a deux pans, faite au milieu)."""
    return H_FAITE - PENTE * abs(x)


def _piece(c, nom, objets, lisser=True, origine=(0, 0, 0)):
    """Fusionne les morceaux d'une piece et pose son origine au point d'assemblage."""
    o = c.fusionne(P + nom, objets) if len(objets) > 1 else objets[0]
    o.name = o.data.name = P + nom
    c.origine(o, origine)
    if lisser:
        c.lisse(o)
    return o


def _corps(c):
    """Le cabanon : murs en bois a pignon, le toit a deux pans prolonge en auvent sur deux poteaux, les couvre-joints,
    la fenetre de cote, la table haute."""
    y0, y1 = Y_AVANT, Y_AVANT + PROFOND
    yc = (y0 + y1) / 2
    murs = c.boite(P + "BODY_WALLS", (LARGE, PROFOND, H_MUR), (0, yc, 0), mat="MAT_WOOD", chanfrein=C2, segments=2)
    pignon = c.prisme(P + "BODY_GABLE", [(-LARGE / 2, H_MUR), (LARGE / 2, H_MUR), (0, H_FAITE)], PROFOND, (0, y0, 0), mat="MAT_WOOD")
    c.perce(murs, (PORTE[0], 0.4, PORTE[1]), (X_PORTE, Y_AVANT, 0))
    c.perce(murs, (0.4, FENETRE[0], FENETRE[1]), (LARGE / 2, yc + 0.2, FENETRE[2]))
    murs = c.fusionne(P + "BODY_WALLS", [murs, pignon])

    # les deux pans, de l'arriere (avec son debord) au bord de l'auvent ; dessous a la ligne du toit, plus le debord
    ya, yb = Y_AUVENT - 0.10, y1 + DEBORD
    pans = []
    for k, signe in enumerate((-1, 1)):
        xb = signe * (LARGE / 2 + DEBORD)
        zb = H_MUR - PENTE * DEBORD
        profil = [(0, H_FAITE), (xb, zb), (xb, zb + TOIT), (0, H_FAITE + TOIT)]
        o = c.prisme(P + "BODY_ROOF_%d" % k, profil, yb - ya, (0, ya, 0), mat="MAT_PAINTED_METAL_GRAPHITE")
        c.chanfreine(o, C1, segments=2)
        pans.append(o)
    # l'auvent : deux poteaux et une poutre sous le bord du toit
    z_bord = H_MUR - PENTE * 0.10
    poteaux = [c.boite(P + "BODY_POST_%d" % k, (0.14, 0.14, z_bord), (x, Y_AUVENT + 0.10, 0), mat="MAT_WOOD",
                       chanfrein=C1, segments=2) for k, x in enumerate((-LARGE / 2 + 0.10, LARGE / 2 - 0.10))]
    poutre = c.boite(P + "BODY_BEAM", (LARGE, 0.14, 0.16), (0, Y_AUVENT + 0.10, z_bord - 0.16), mat="MAT_WOOD",
                     chanfrein=C1, segments=2)
    # les couvre-joints : sur le pignon (hors de la porte) et sur le mur de droite (hors de la fenetre), les murs vus
    lattes = []
    x = -LARGE / 2 + LATTE[2]
    while x < LARGE / 2 - 0.1:
        if abs(x - X_PORTE) > PORTE[0] / 2 + 0.10:
            h = dessous_toit(x) - 0.05
            lattes.append(c.boite(P + "BODY_BATTEN_F%d" % len(lattes), (LATTE[0], LATTE[1], h), (x, y0 - LATTE[1] / 2, 0),
                                  mat="MAT_WOOD"))
        x += LATTE[2]
    y = y0 + LATTE[2]
    while y < y1 - 0.1:
        if abs(y - (yc + 0.2)) > FENETRE[0] / 2 + 0.10:
            lattes.append(c.boite(P + "BODY_BATTEN_S%d" % len(lattes), (LATTE[1], LATTE[0], H_MUR - 0.05),
                                  (LARGE / 2 + LATTE[1] / 2, y, 0), mat="MAT_WOOD"))
        y += LATTE[2]
    # le cadre de la porte et la fenetre
    cadre = [c.boite(P + "BODY_DOOR_FRAME_%d" % k, t, p, mat="MAT_PAINTED_METAL_GRAPHITE") for k, (t, p) in enumerate((
        ((0.08, 0.06, PORTE[1] + 0.08), (X_PORTE - PORTE[0] / 2 - 0.04, Y_AVANT - 0.03, 0)),
        ((0.08, 0.06, PORTE[1] + 0.08), (X_PORTE + PORTE[0] / 2 + 0.04, Y_AVANT - 0.03, 0)),
        ((PORTE[0] + 0.16, 0.06, 0.08), (X_PORTE, Y_AVANT - 0.03, PORTE[1])),
    ))]
    vitre = c.boite(P + "BODY_WINDOW", (0.04, FENETRE[0], FENETRE[1]), (LARGE / 2 - 0.10, yc + 0.2, FENETRE[2]), mat="MAT_GLASS")
    appui = c.boite(P + "BODY_SILL", (0.10, FENETRE[0] + 0.16, 0.08), (LARGE / 2 + 0.04, yc + 0.2, FENETRE[2] - 0.08),
                    mat="MAT_PAINTED_METAL_GRAPHITE")
    # la table haute : plateau rond en bois, fut et pied graphite
    tx, ty = TABLE
    plateau = c.cylindre(P + "BODY_TABLE_TOP", 0.40, 0.06, (tx, ty, 1.05), mat="MAT_WOOD", cotes=12)
    fut = c.cylindre(P + "BODY_TABLE_LEG", 0.05, 1.05, (tx, ty, 0), mat="MAT_PAINTED_METAL_GRAPHITE", cotes=6)
    pied = c.cylindre(P + "BODY_TABLE_FOOT", 0.26, 0.04, (tx, ty, 0), mat="MAT_PAINTED_METAL_GRAPHITE", cotes=8)
    return _piece(c, "BODY", [murs, poutre, vitre, appui, plateau, fut, pied] + pans + poteaux + lattes + cadre)


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
    haut = dessous_toit(x)  # le dessous du toit au-dessus de la lanterne
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
    o.location = (X_PORTE, Y_AUVENT - 0.3, H_MUR + 0.6)  # devant l'auvent, pour les captures de l'atelier
    return o


def construit(c):
    _corps(c)
    _porte(c)
    _lanterne(c)
    _note(c)
    c.ancre("ANCHOR_LABEL", (0, Y_AVANT + PROFOND / 2, H_FAITE + 0.8))
    c.ancre("ANCHOR_DOOR", (X_PORTE, Y_AVANT - 0.6, 0))
    c.ancre("ANCHOR_GATHER", (-0.2, Y_AUVENT - 0.9, 0))
    if "atelier" in sys.modules or any(Path(x).name == "atelier.py" for x in sys.argv):
        exemple_atelier(c)
    return {"triangles_vises": 1300, "animations": []}


def exemple_atelier(c):
    """Atelier seulement (jamais exporte) : la porte ouverte, comme en fete, sur un socle de terre (bible 18.5)."""
    porte = bpy.data.objects[P + "DOOR"]
    porte.rotation_euler = (0, 0, math.radians(100))
    socle = c.boite(P + "DEMO_PLINTH", (5.0, 6.5, 0.60), (0, -0.4, -0.60), mat="MAT_EARTH", chanfrein=0.10, segments=3)
    c.lisse(socle)
