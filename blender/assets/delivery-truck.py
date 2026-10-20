"""Le camion de livraison (catalogue : delivery-truck), v001 : un camion benne a quatre essieux (bible 7 ; cible MB_11 :
cabine arrondie, orange et graphite, benne levee). Ecarte de MB_11 : gyrophares, retroviseurs, calandre detaillee,
gravier en cailloux ; aucun personnage dans la cabine (verre opaque). Decisions de Pierre-Alain du 20 octobre 2026 :
benne basculante, dechargement joue une fois a l'arret, cabine arrondie en C4 (bible 18.3).

Pas de socle : GDC deplace le camion le long de la rue. Origine au centre de l'emprise, a z = 0, avant vers -Y. Les
roues ne tournent pas (GDC ne donne pas la vitesse). Le modele est construit dans la pose de repos (etat idle) : a
l'arret, charge.

Hierarchie : PIVOT_BODY (la benne bascule autour de X, sur sa charniere arriere) > PIVOT_TAILGATE (le hayon pend de son
bord haut) ; LOAD (le chargement, dans la benne) ; HEAP (le tas pose derriere le camion, a la racine). Le verin
telescopique a cinq etages : le pivot de pied vise l'attache sous la benne, les etages s'etalent entre les deux ; ses
cles sont calculees ici image par image.

Qualite basse (bible 18.3 : sous 0,30 m, on supprime ou on fusionne) : les noeuds *_DETAIL (verin, raidisseurs de
benne) sont retires par le composant ; les moyeux (0,48 m) restent.

Animation ANM_DELIVERY_TRUCK_A_UNLOAD, jouee une fois : la benne monte a 45 degres, le hayon s'ouvre, le chargement
glisse et un tas se forme derriere le camion, la benne redescend ; 6 secondes (180 images a 30 i/s). La derniere image
(benne vide, tas pose) est celle qui reste.
"""

import math
import os
import sys
from pathlib import Path

import bpy

ASSET = {"id": "delivery-truck", "categorie": "machine", "nom": "VEH_DELIVERY_TRUCK_A_v001"}

P = "VEH_DELIVERY_TRUCK_A_"
C1, C2, C3, C4 = 0.02, 0.05, 0.10, 0.20
ROUE = (0.5, 0.45)  # rayon, largeur
X_ROUE = 1.0
ESSIEUX = (-3.15, -1.85, 1.75, 3.05)
CHARNIERE = (3.75, 1.2)  # axe de bascule de la benne, en (y, z)
BENNE = (2.4, 4.75)  # largeur, longueur (de y = -0.95 a 3.8)
Y_BENNE = (-0.95, 3.8)
Z_FOND = 1.25
Z_BORD = 2.5
VERIN = ((-1.1, 0.75), (-1.1, 2.0), 5)  # pied sur le chassis, attache sur la face avant de la benne, nombre d'etages
TAS = (5.7, 0.9)  # centre du tas pose derriere le camion (y), hauteur

# Les poses du dechargement : image, bascule de la benne, hayon (degres), glissement du chargement (m), chargement,
# tas (echelles). Bascule negative : l'avant de la benne monte. Hayon positif : son bas part vers l'arriere.
POSES = [
    (0, 0, 0, 0.0, 1.0, 0.01),
    (15, 0, 0, 0.0, 1.0, 0.01),
    (55, -38, 30, 0.0, 1.0, 0.01),
    (75, -45, 50, 0.6, 0.7, 0.3),
    (100, -45, 55, 1.6, 0.01, 0.9),
    (115, -45, 50, 1.6, 0.01, 1.0),
    (165, 0, 0, 1.6, 0.01, 1.0),
    (180, 0, 0, 1.6, 0.01, 1.0),
]


def _axe(c, nom, y, z, rayon, longueur, x, mat, cotes=12):
    """Cylindre couche le long de X (roue, moyeu) ; origine en son centre."""
    o = c.cylindre(nom, rayon, longueur, (0, 0, -longueur / 2), mat=mat, cotes=cotes)
    o.rotation_euler[1] = math.radians(90)
    c.applique(o)
    o.location = (x, y, z)
    return o


def _tube(c, nom, a, b, rayon, mat):
    """Cylindre de a a b, points (y, z) du plan median : un etage de verin."""
    from mathutils import Vector
    a, b = Vector((0, *a)), Vector((0, *b))
    d = b - a
    o = c.cylindre(nom, rayon, d.length, (0, 0, -d.length / 2), mat=mat, cotes=10)
    o.rotation_mode = "QUATERNION"
    o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
    o.location = (a + b) / 2
    c.applique(o)
    o.rotation_mode = "XYZ"
    return o


def _roues(c):
    """Une roue (pneu et moyeu orange), puis ses copies : le moyeu toujours vers l'exterieur."""
    r, l = ROUE
    pneu = _axe(c, P + "WHEEL", ESSIEUX[0], r, r, l, X_ROUE, "MAT_RUBBER", cotes=16)
    c.chanfreine(pneu, C2, 2)
    moyeu = _axe(c, P + "HUB", ESSIEUX[0], r, 0.24, 0.04, X_ROUE + l / 2, "MAT_PAINTED_METAL_ORANGE", cotes=12)
    roue = c.fusionne(P + "WHEEL_L0", [pneu, moyeu])
    c.lisse(roue)
    for k, y in enumerate(ESSIEUX):
        if k:
            c.instance(P + "WHEEL_L%d" % k, roue, (0, y - ESSIEUX[0], 0))
        c.instance(P + "WHEEL_R%d" % k, roue, (-2 * X_ROUE, y - ESSIEUX[0], 0), rotation_z=180)


def _porteur(c):
    """Cabine arrondie, chassis, pare-chocs et ailes : un seul objet fixe."""
    cabine = c.boite(P + "CAB", (2.5, 1.8, 1.9), (0, -3.1, 1.1), mat="MAT_PAINTED_METAL_ORANGE", chanfrein=C4, segments=3)
    pare_brise = c.boite(P + "CAB_GLASS_FRONT", (2.0, 0.06, 0.7), (0, -4.0, 2.05), mat="MAT_GLASS", chanfrein=C1, segments=2)
    vitres = [c.boite(P + "CAB_GLASS_%s" % cote, (0.06, 1.0, 0.7), (s * 1.25, -3.1, 2.05), mat="MAT_GLASS", chanfrein=C1, segments=2)
              for cote, s in (("L", 1), ("R", -1))]
    face = c.boite(P + "CAB_PANEL", (1.7, 0.06, 0.45), (0, -4.0, 1.3), mat="MAT_PAINTED_METAL_GRAPHITE", chanfrein=C1, segments=2)
    pare_chocs = c.boite(P + "BUMPER", (2.5, 0.35, 0.6), (0, -3.875, 0.45), mat="MAT_PAINTED_METAL_GRAPHITE", chanfrein=C2, segments=2)
    chassis = c.boite(P + "CHASSIS", (1.0, 7.6, 0.4), (0, 0.1, 0.6), mat="MAT_PAINTED_METAL_GRAPHITE", chanfrein=C2, segments=2)
    faux_chassis = c.boite(P + "SUBFRAME", (1.2, 4.6, 0.25), (0, 1.45, 1.0), mat="MAT_PAINTED_METAL_GRAPHITE", chanfrein=C2, segments=2)
    arriere = c.boite(P + "REAR_BUMPER", (2.3, 0.15, 0.3), (0, 3.95, 0.5), mat="MAT_PAINTED_METAL_GRAPHITE", chanfrein=C1, segments=2)
    ailes = []
    for cote, s in (("L", 1), ("R", -1)):
        ailes.append(c.boite(P + "FENDER_FRONT_" + cote, (0.5, 1.3, 0.12), (s * 1.0, ESSIEUX[1], 1.05), mat="MAT_PAINTED_METAL_GRAPHITE",
                             chanfrein=C1, segments=2))
        ailes.append(c.boite(P + "FENDER_REAR_" + cote, (0.5, 2.6, 0.12), (s * 1.0, (ESSIEUX[2] + ESSIEUX[3]) / 2, 1.05),
                             mat="MAT_PAINTED_METAL_GRAPHITE", chanfrein=C1, segments=2))
    porteur = c.fusionne(P + "BODY_FIXED", [cabine, pare_brise] + vitres + [face, pare_chocs, chassis, faux_chassis, arriere] + ailes)
    c.lisse(porteur)
    return porteur


def construit(c):
    _roues(c)
    _porteur(c)

    # --- la benne : fond, deux cotes, face avant plus haute ; ses raidisseurs a part (detail)
    benne_pivot = c.pivot(P + "PIVOT_BODY", (0, *CHARNIERE))
    l, long_ = BENNE
    y0, y1 = Y_BENNE
    ym = (y0 + y1) / 2
    pieces = [c.boite(P + "DUMP_FLOOR", (l, long_, 0.15), (0, ym, Z_FOND), mat="MAT_PAINTED_METAL_ORANGE", chanfrein=C2, segments=2)]
    for cote, s in (("L", 1), ("R", -1)):
        pieces.append(c.boite(P + "DUMP_SIDE_" + cote, (0.1, long_, Z_BORD - Z_FOND), (s * (l - 0.1) / 2, ym, Z_FOND),
                              mat="MAT_PAINTED_METAL_ORANGE", chanfrein=C2, segments=2))
    pieces.append(c.boite(P + "DUMP_FRONT", (l, 0.12, Z_BORD - Z_FOND + 0.3), (0, y0 + 0.06, Z_FOND), mat="MAT_PAINTED_METAL_ORANGE",
                          chanfrein=C2, segments=2))
    benne = c.fusionne(P + "DUMP_BODY", pieces)
    c.lisse(benne)
    c.rattache(benne, benne_pivot)
    raidisseurs = [c.boite(P + "RIB_%s%d" % (cote, k), (0.06, 0.15, Z_BORD - Z_FOND - 0.1), (s * (l / 2 + 0.03), y, Z_FOND + 0.05),
                           mat="MAT_PAINTED_METAL_ORANGE", chanfrein=C1, segments=2)
                   for cote, s in (("L", 1), ("R", -1)) for k, y in enumerate((0.3, 1.45, 2.6))]
    raidisseurs = c.fusionne(P + "DUMP_RIBS_DETAIL", raidisseurs)
    c.rattache(raidisseurs, benne_pivot)

    # le hayon, qui pend de son bord haut
    hayon_pivot = c.pivot(P + "PIVOT_TAILGATE", (0, y1 + 0.06, Z_BORD), parent=benne_pivot)
    hayon = c.boite(P + "TAILGATE", (l, 0.12, Z_BORD - Z_FOND - 0.05), (0, y1 + 0.06, Z_FOND + 0.05), mat="MAT_PAINTED_METAL_ORANGE",
                    chanfrein=C2, segments=2)
    c.lisse(hayon)
    c.rattache(hayon, hayon_pivot)

    # le chargement, un tas lisse en beton dans la benne ; le tas pose derriere le camion
    charge = c.tronc(P + "LOAD", (2.2, 4.4), (0.7, 2.6), 1.15, (0, ym - 0.05, Z_FOND + 0.15), mat="MAT_CONCRETE")
    c.chanfreine(charge, C3, 3)  # une arete de tas, pas un coussin
    c.lisse(charge)
    c.origine(charge, (0, ym - 0.05, Z_FOND + 0.15))  # il fond vers sa base
    c.rattache(charge, benne_pivot)
    tas = c.tronc(P + "HEAP", (2.6, 2.6), (1.0, 0.7), TAS[1], (0, TAS[0], 0), mat="MAT_CONCRETE")
    c.chanfreine(tas, C4, 3)
    c.lisse(tas)
    c.origine(tas, (0, TAS[0], 0))  # il pousse depuis le sol

    # --- le verin telescopique : le pied vise l'attache sous la benne, les etages s'etalent entre les deux
    pied, attache, n = VERIN

    def tourne(p, o, a):
        y, z = p[0] - o[0], p[1] - o[1]
        return (o[0] + y * math.cos(a) - z * math.sin(a), o[1] + y * math.sin(a) + z * math.cos(a))

    def poses(image):
        for (i0, *a0), (i1, *a1) in zip(POSES, POSES[1:]):
            if i0 <= image <= i1:
                t = (image - i0) / (i1 - i0)
                t = t * t * (3 - 2 * t)  # depart et arrivee adoucis
                return [u + (v - u) * t for u, v in zip(a0, a1)]
        return list(POSES[-1][1:])

    images = list(range(0, 181, 3))
    distances = [math.dist(pied, tourne(attache, CHARNIERE, math.radians(poses(i)[0]))) for i in images]
    dmin, dmax = min(distances), max(distances)
    longueur = dmin - 0.05
    pas_max = (dmax - longueur) / (n - 1)
    assert pas_max < longueur - 0.1, (dmin, dmax)  # deux etages voisins se recouvrent toujours
    u = (attache[0] - pied[0], attache[1] - pied[1])
    norme = math.hypot(*u)
    u = (u[0] / norme, u[1] / norme)
    verin_pivot = c.pivot(P + "RAM_PIVOT", (0, *pied))
    etages = []
    for k in range(n):
        e_pivot = c.pivot(P + "RAM_STAGE_%d_PIVOT" % k, (0, *pied), parent=verin_pivot)
        e = _tube(c, P + "RAM_STAGE_%d_DETAIL" % k, pied, (pied[0] + u[0] * longueur, pied[1] + u[1] * longueur), 0.15 - 0.02 * k,
                  "MAT_PAINTED_METAL_GRAPHITE")
        c.lisse(e)
        c.rattache(e, e_pivot)
        etages.append(e_pivot)

    # --- les cles : une seule action pour tous les noeuds, un seul clip glTF
    clip = "ANM_DELIVERY_TRUCK_A_UNLOAD"
    cles = {k: [] for k in ("body", "gate", "slide", "load", "heap", "ram")}
    cles_etages = [[] for _ in etages]
    repos = math.atan2(u[1], u[0])
    y_charge = charge.location.y
    for image in images:
        b, h, g, s, t = poses(image)
        a = math.radians(b)
        cles["body"].append((image, a))
        cles["gate"].append((image, math.radians(h)))
        cles["slide"].append((image, y_charge + g))
        cles["load"].append((image, (s, s, s)))
        cles["heap"].append((image, (t, t, t)))
        haut = tourne(attache, CHARNIERE, a)
        d = math.dist(pied, haut)
        cles["ram"].append((image, math.atan2(haut[1] - pied[1], haut[0] - pied[0]) - repos))
        for k in range(n):
            o = k * (d - longueur) / (n - 1)
            cles_etages[k].append((image, (0, u[0] * o, u[1] * o)))
    c.anime(clip, benne_pivot, "rotation_euler", cles["body"], index=0)
    c.anime(clip, hayon_pivot, "rotation_euler", cles["gate"], index=0)
    c.anime(clip, charge, "location", cles["slide"], index=1)
    c.anime(clip, charge, "scale", cles["load"])
    c.anime(clip, tas, "scale", cles["heap"])
    c.anime(clip, verin_pivot, "rotation_euler", cles["ram"], index=0)
    for e_pivot, k in zip(etages, cles_etages):
        c.anime(clip, e_pivot, "location", k)

    # les ancres : l'etiquette au-dessus de la cabine, le badge au-dessus du chargement (la dependance a surveiller)
    c.ancre("ANCHOR_LABEL", (0, -3.1, 3.7))
    c.ancre("ANCHOR_BADGE", (0, ym, 3.4))

    bpy.context.scene.frame_set(0)
    if "atelier" in sys.modules or any(Path(x).name == "atelier.py" for x in sys.argv):
        vue_atelier()
    return {"triangles_vises": 5000, "animations": [clip], "verin": (dmin, dmax)}


def vue_atelier():
    """Atelier seulement : GDC_ATELIER_QUALITE=low cache les details, comme le fait le composant."""
    if os.environ.get("GDC_ATELIER_QUALITE") != "low":
        return
    for o in bpy.data.objects:
        if o.name.endswith("_DETAIL"):
            o.hide_render = o.hide_viewport = True
