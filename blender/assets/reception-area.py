"""La zone de reception, le lieu des essais et de la remise des cles (catalogue : reception-area). Une aire en plein air,
pas un conteneur. Decisions de Pierre-Alain du 20 octobre 2026 (brief reception-area).

Tout est dans le GLB, socle compris : le socle maquette en terre (bible 18.5), une aire dallee claire, un auvent leger
de 6 x 3,5 m a 3,00 m (quatre poteaux graphite, toit plat blanc casse) ouvert vers la camera ; dessous, le pupitre
d'essais (un plan incline graphite, deux ecrans) et le trepied du capteur ; devant, le totem a la cle en relief (sans
texte : la remise des cles se lit sans legende) et deux bacs de verdure. Aucune couleur d'etat, aucun ruban rouge et
blanc (signaletique).

Noeuds pilotes par le composant (aucun clip) :
- SCREEN_FACE_0 et SCREEN_FACE_1 : les faces d'ecran, en MAT_TECH ; le composant les met en graphite quand ils sont
  eteints (idle, waiting) ;
- KEY : la cle geante posee sur le pupitre, visible seulement en waiting (la reception attend ta decision) ;
- PIVOT_SENSOR : la tete du capteur et sa lentille ; une impulsion par essai (rotation autour de Z).
Ancres : LABEL au-dessus de l'auvent, BADGE au coin avant droit de l'auvent, DESK_1 a DESK_3 aux postes (Anne au
pupitre, le client devant le totem, Olivier a cote d'Anne), au niveau de la dalle ; les postes sont tournes vers le
fond (+Y).
"""

import math

import bpy

ASSET = {"id": "reception-area", "categorie": "site", "nom": "BLD_DELIVERY_AREA_A_v001"}

P = "BLD_DELIVERY_AREA_A_"
SOCLE = (9.0, 7.0, 0.60)  # bible 18.5 : 0,60 m de terre, dessus a z = 0
DALLE = (7.4, 6.0, 0.10)
Y_DALLE = 0.1
AUVENT = (6.0, 3.5)  # emprise entre les axes des poteaux
Y_AUVENT = 1.55  # centre de l'auvent : il occupe le fond de la dalle et s'ouvre vers l'avant
SOUS_TOIT = 2.80  # dessous du toit ; dessus a 3,00 m (un etage de la bible)
TOIT = 0.20
POTEAU = 0.16
PUPITRE = (1.8, 0.80)  # largeur et profondeur du pupitre d'essais
Y_PUPITRE = 0.55
G = "MAT_PAINTED_METAL_GRAPHITE"
C1, C2, C3 = 0.02, 0.05, 0.10
SOL = DALLE[2]  # le dessus de la dalle : le sol des postes


def _barre(c, nom, a, b, epaisseur, mat):
    """Une barre de section carree de a a b (points du monde) : pied de trepied."""
    from mathutils import Vector
    a, b = Vector(a), Vector(b)
    d = b - a
    o = c.boite(nom, (epaisseur, epaisseur, d.length), (0, 0, -d.length / 2), mat=mat)
    o.rotation_mode = "QUATERNION"
    o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
    o.location = (a + b) / 2
    c.applique(o)
    return o


def _boule(c, nom, rayon, centre, mat, aplati=1.0):
    """Une boule a facettes douces (feuillage) : icosphere lissee, aplatie en hauteur si besoin."""
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=rayon, location=centre)
    o = bpy.context.active_object
    o.name = o.data.name = nom
    o.scale = (1, 1, aplati)
    c.applique(o, rotation=False)
    o.data.materials.append(c.materiau(mat))
    for f in o.data.polygons:
        f.use_smooth = True
    return o


def _anneau(c, nom, rayon, tube, centre, mat, debout=False):
    """L'anneau d'une cle : un tore couche dans le plan XY, ou debout dans le plan XZ (relief du totem)."""
    bpy.ops.mesh.primitive_torus_add(major_radius=rayon, minor_radius=tube, major_segments=16, minor_segments=6,
                                     location=centre, rotation=(math.pi / 2 if debout else 0, 0, 0))
    o = bpy.context.active_object
    o.name = o.data.name = nom
    c.applique(o)
    o.data.materials.append(c.materiau(mat))
    return o


def _cle(c, nom, mat, debout=False, ep=0.07):
    """Une cle de 0,90 m, l'anneau a gauche, le panneton a droite : couchee (dans le plan XY, posee par son dessous a
    z = 0) ou debout (dans le plan XZ, l'anneau en haut, centree en y = 0). Origine au centre de l'anneau."""
    r, tube = 0.15, 0.05
    if debout:
        # l'anneau en haut ; la tige descend ; le panneton a droite, en bas
        morceaux = [_anneau(c, nom + "_BOW", r, tube, (0, 0, 0), mat, debout=True),
                    c.boite(nom + "_SHANK", (0.09, ep, 0.50), (0, 0, -r - 0.50), mat=mat),
                    c.boite(nom + "_BIT_0", (0.13, ep, 0.08), (0.11, 0, -r - 0.50), mat=mat),
                    c.boite(nom + "_BIT_1", (0.09, ep, 0.08), (0.09, 0, -r - 0.32), mat=mat)]
    else:
        morceaux = [_anneau(c, nom + "_BOW", r, tube, (0, 0, tube), mat),
                    c.boite(nom + "_SHANK", (0.56, 0.09, ep), (r + 0.28, 0, 0), mat=mat, chanfrein=C1, segments=2),
                    c.boite(nom + "_BIT_0", (0.08, 0.15, ep), (r + 0.52, -0.11, 0), mat=mat, chanfrein=C1, segments=2),
                    c.boite(nom + "_BIT_1", (0.08, 0.11, ep), (r + 0.36, -0.09, 0), mat=mat, chanfrein=C1, segments=2)]
    o = c.fusionne(nom, morceaux)
    c.origine(o, (0, 0, 0))
    c.lisse(o)
    return o


def _pupitre(c):
    """Le pupitre d'essais : un corps graphite au dessus incline vers l'avant (de 0,85 a 1,15 m), une tablette plate
    devant (ou se pose la cle) ; les deux faces d'ecran sont des noeuds a part, couches sur le plan incline."""
    l, p = PUPITRE
    y0 = Y_PUPITRE - p / 2
    y1 = Y_PUPITRE + p / 2
    yt = y0 + 0.40  # fin de la tablette, debut du plan incline
    profil = [(y0, 0), (y1, 0), (y1, 1.15), (yt, 0.88), (y0, 0.88)]
    # prisme : profil dans le plan XZ, extrude le long de Y ; un quart de tour le met dans le plan YZ, extrude de -l a 0
    corps = c.prisme(P + "DESK", profil, l, mat=G)
    corps.rotation_euler[2] = math.radians(90)
    c.applique(corps)
    c.chanfreine(corps, C1, segments=2)
    corps.location = (l / 2, 0, SOL)

    # les faces d'ecran, couchees sur le plan incline, un poil au-dessus
    pente = math.atan2(1.15 - 0.88, y1 - yt)
    longueur = math.hypot(1.15 - 0.88, y1 - yt)
    ym, zm = (yt + y1) / 2, SOL + (0.88 + 1.15) / 2
    nz, ny = math.cos(pente), -math.sin(pente)  # normale du plan incline
    faces = []
    for k, x in enumerate((-0.45, 0.45)):
        f = c.boite(P + "SCREEN_FACE_%d" % k, (0.72, longueur - 0.10, 0.02), (0, 0, -0.01), mat="MAT_TECH")
        f.rotation_euler[0] = pente
        c.applique(f)
        f.location = (x, ym + ny * 0.012, zm + nz * 0.012)
        faces.append(f)
    return corps, faces


def _trepied(c, x, y, vise):
    """Le trepied du capteur : trois pieds graphite, la tete et sa lentille sous le pivot (elle tourne autour de Z).
    Au repos, la lentille regarde le point vise (x, y) : le pivot porte cette orientation, l'impulsion s'y ajoute."""
    tete_z = SOL + 1.35
    pieds = []
    for k in range(3):
        a = math.radians(90 + 120 * k)
        pieds.append(_barre(c, P + "TRIPOD_LEG_%d" % k, (x + 0.45 * math.cos(a), y + 0.45 * math.sin(a), SOL),
                            (x, y, tete_z), 0.06, G))
    pieds.append(c.cylindre(P + "TRIPOD_COLLAR", 0.07, 0.10, (x, y, tete_z - 0.06), mat=G, cotes=8))
    pivot = c.pivot(P + "PIVOT_SENSOR", (x, y, tete_z))
    tete = c.boite(P + "SENSOR_HEAD", (0.34, 0.24, 0.22), (x, y, tete_z + 0.04), mat=G, chanfrein=C1, segments=2)
    lentille = c.cylindre(P + "SENSOR_LENS", 0.08, 0.10, (0, 0, -0.05), mat="MAT_TECH", cotes=12)
    lentille.rotation_euler[1] = math.radians(90)
    c.applique(lentille)
    lentille.location = (x - 0.20, y, tete_z + 0.15)
    tete = c.fusionne(P + "SENSOR_HEAD", [tete, lentille])
    c.lisse(tete)
    c.rattache(tete, pivot)
    pivot.rotation_euler[2] = math.atan2(vise[1] - y, vise[0] - x) - math.pi  # la lentille est modelee vers -X
    return pieds, pivot


def _totem(c, x, y):
    """Le totem de la reception : celui des bureaux (building-kit), et une cle en relief graphite sur son champ clair."""
    morceaux = [
        c.boite(P + "SIGN_TOTEM", (1.20, 0.15, 1.60), (x, y, SOL + 0.15), mat=G, chanfrein=C1, segments=2),
        c.boite(P + "SIGN_TOTEM_FOOT", (1.00, 0.40, 0.15), (x, y, SOL), mat="MAT_CONCRETE", chanfrein=C1, segments=2),
        c.boite(P + "SIGN_TOTEM_FIELD", (1.00, 0.03, 1.10), (x, y - 0.075 - 0.015, SOL + 0.45), mat="MAT_SURFACE"),
    ]
    cle = _cle(c, P + "SIGN_KEY", G, debout=True, ep=0.04)
    cle.location = (x - 0.04, y - 0.105, SOL + 1.28)
    return morceaux + [cle]


def _bac(c, nom, x, y, rotation=0):
    """Un bac de verdure : un caisson beton et deux boules de feuillage."""
    morceaux = [c.boite(nom, (1.20, 0.50, 0.50), (0, 0, 0), mat="MAT_CONCRETE", chanfrein=C2, segments=2),
                _boule(c, nom + "_LEAVES_0", 0.34, (-0.28, 0, 0.62), "MAT_LANDSCAPE", 0.8),
                _boule(c, nom + "_LEAVES_1", 0.30, (0.30, 0.02, 0.60), "MAT_LANDSCAPE", 0.8)]
    o = c.fusionne(nom, morceaux)
    c.origine(o, (0, 0, 0))
    o.rotation_euler[2] = math.radians(rotation)
    c.applique(o)
    o.location = (x, y, SOL)
    return o


def construit(c):
    # --- le socle maquette (bible 18.5) et l'aire dallee
    socle = c.boite(P + "BASE", SOCLE, (0, 0, -SOCLE[2]), mat="MAT_EARTH", chanfrein=C3, segments=3)
    dalle = c.boite(P + "SLAB", DALLE, (0, Y_DALLE, 0), mat="MAT_CONCRETE", chanfrein=C1, segments=2)

    # --- l'auvent : quatre poteaux graphite et un toit plat blanc casse, a rive graphite
    lx, ly = AUVENT
    poteaux = [c.boite(P + "CANOPY_POST_%d" % k, (POTEAU, POTEAU, SOUS_TOIT - SOL), (x, Y_AUVENT + y, SOL), mat=G,
                       chanfrein=C1, segments=2)
               for k, (x, y) in enumerate(((-lx / 2, -ly / 2), (lx / 2, -ly / 2), (lx / 2, ly / 2), (-lx / 2, ly / 2)))]
    toit = c.boite(P + "CANOPY_ROOF", (lx + 0.40, ly + 0.40, TOIT), (0, Y_AUVENT, SOUS_TOIT), mat="MAT_SURFACE",
                   chanfrein=C2, segments=2)
    # la rive graphite au nu exterieur du toit : elle dessine l'auvent et separe le toit clair de la dalle claire
    rive = c.boite(P + "CANOPY_FASCIA", (lx + 0.44, ly + 0.44, 0.16), (0, Y_AUVENT, SOUS_TOIT), mat=G,
                   chanfrein=C1, segments=2)

    # --- le pupitre d'essais et ses ecrans ; le trepied du capteur devant l'auvent, a droite, tourne vers le pupitre :
    # sous le toit, sa tete serait cachee a la camera
    pupitre, ecrans = _pupitre(c)
    pieds, _ = _trepied(c, 2.0, -1.3, (0, Y_PUPITRE))

    # --- le totem a la cle, devant au milieu (l'entree de l'aire), et les deux bacs de verdure
    totem = _totem(c, 0.0, -2.45)
    bacs = [_bac(c, P + "PLANTER_0", -2.7, -2.3), _bac(c, P + "PLANTER_1", 3.35, 2.2, rotation=90)]

    fixe = c.fusionne(P + "BASE", [socle, dalle] + poteaux + [toit, rive, pupitre] + pieds + totem + bacs)
    c.lisse(fixe)

    # --- la cle geante (x 1,2 : 1,08 m), couchee sur la moitie droite de la tablette du pupitre, ou personne ne se
    # tient : Anne et Olivier sont a gauche (visible en waiting seulement)
    cle = _cle(c, P + "KEY", "MAT_ALUMINIUM")
    cle.scale = (1.2, 1.2, 1.2)
    c.applique(cle)
    cle.location = (0.0, Y_PUPITRE - PUPITRE[1] / 2 + 0.20, SOL + 0.88)

    # --- les ancres de la fiche
    c.ancre("ANCHOR_LABEL", (-0.8, Y_AUVENT, SOUS_TOIT + TOIT + 1.0))
    c.ancre("ANCHOR_BADGE", (lx / 2, Y_AUVENT - ly / 2, SOUS_TOIT + TOIT + 0.6))
    c.ancre("ANCHOR_DESK_1", (-0.35, Y_PUPITRE - 0.95, SOL))  # Anne, au pupitre
    c.ancre("ANCHOR_DESK_2", (-1.6, -2.3, SOL))  # le client, a cote du totem
    # Olivier, a cote d'Anne, a sa gauche : la camera regarde de l'avant droit, il ne cache ni la cle ni les ecrans
    c.ancre("ANCHOR_DESK_3", (-1.25, Y_PUPITRE - 0.85, SOL))
    return {"triangles_vises": 4000, "animations": []}
