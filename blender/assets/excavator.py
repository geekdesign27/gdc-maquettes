"""La pelleteuse (catalogue : excavator), v001 : pelle classique sur chenilles (bible 7 et 18.8 ; cible MB_09 :
proportions compactes, godet graphite, chenilles simplifiees, orange et graphite). Ecarte de MB_09 : gyrophare,
retroviseurs, echappement, flexibles, cailloux ; aucun personnage dans la cabine (verre opaque).

Pas de socle : c'est un engin, pose seul ou dans la fouille du batiment. Origine au centre des chenilles, a z = 0,
avant vers -Y. Le modele est construit dans la pose de repos (etat idle) : bras replie, godet pose au sol devant.

Hierarchie : PIVOT_SLEW (la tourelle tourne autour de Z) > PIVOT_BOOM > PIVOT_STICK > PIVOT_BUCKET (rotations autour
de X, dans le plan YZ). Les deux verins ont chacun deux pivots : le corps vise la tige, la tige vise le corps ; leurs
cles sont calculees ici image par image, rien ne s'etire.

Qualite basse (bible 18.3 : sous 0,30 m, on supprime ou on fusionne) : les noeuds *_DETAIL (petits galets, patins, lame,
verins) sont retires par le composant.

Animation ANM_EXCAVATOR_A_DIGGING : le bras se deploie, le godet racle et se remplit, la fleche monte, la tourelle
pivote d'un quart de tour vers sa droite, le godet se vide, retour au repos ; boucle de 8 secondes (240 images a
30 i/s), sur place.
"""

import math
import os
import sys
from pathlib import Path

import bpy

ASSET = {"id": "excavator", "categorie": "machine", "nom": "VEH_EXCAVATOR_A_v001"}

P = "VEH_EXCAVATOR_A_"
C1, C2, C3 = 0.02, 0.05, 0.10
VOIE = 0.95  # axe de chaque chenille
CHENILLE = (0.6, 3.4, 0.8)  # largeur, longueur, hauteur
TOURELLE = 1.0  # dessous de la tourelle, sur la couronne
X_BRAS = -0.1  # plan du bras, entre la cabine (a gauche, +X) et le reservoir (a droite)

# Les articulations du bras dans la pose de repos, en (y, z) dans le repere du monde
PIED = (-0.9, 1.6)  # pied de fleche
COUDE = (-2.3, 2.8)  # coude de la fleche
TETE = (-3.6, 2.6)  # bout de fleche : axe du balancier
LEVIER = (-3.4, 3.35)  # haut du balancier : attache du verin de balancier
GODET = (-3.85, 0.82)  # bas du balancier : axe du godet
VERIN_FLECHE = ((-1.3, 1.3), 0.62)  # attache sur la tourelle ; position de l'attache le long de la fleche (0 a 1)
VERIN_BALANCIER = 0.85  # position de l'attache du verin de balancier le long du premier tronçon de fleche

# Les poses du cycle : image, orientation, fleche, balancier, godet (degres), terre dans le godet (0 ou 1).
# Rotation positive autour de X : ce qui est devant descend (fleche), ce qui pend part vers l'arriere (balancier).
POSES = [
    (0, 0, 0, 0, 0, 0),
    (45, 0, -14, -38, -55, 0),  # bras deploye, godet ouvert
    (75, 0, 12, -40, -60, 0),  # le godet entre dans le sol
    (105, 0, 10, -2, 35, 1),  # il racle et se ferme : il est plein
    (150, -90, -26, -8, 40, 1),  # fleche levee, quart de tour a droite
    (180, -90, -22, -18, -65, 0),  # le godet s'ouvre : il se vide
    (215, 0, -10, -8, 0, 0),
    (240, 0, 0, 0, 0, 0),
]


def _profil(c, nom, points, largeur, x, mat):
    """Profil plat dans le plan YZ (points = [(y, z)]), extrude sur la largeur, centre sur x."""
    o = c.prisme(nom, points, largeur, mat=mat)
    o.rotation_euler[2] = math.radians(90)  # (x, y) -> (-y, x) : le profil passe dans le plan YZ
    c.applique(o)
    o.location.x = x + largeur / 2
    return o


def _axe(c, nom, y, z, rayon, longueur, x, mat, cotes=12):
    """Cylindre couche le long de X : axe d'articulation, galet, roue de chenille."""
    o = c.cylindre(nom, rayon, longueur, (0, 0, -longueur / 2), mat=mat, cotes=cotes)
    o.rotation_euler[1] = math.radians(90)
    c.applique(o)
    o.location = (x, y, z)
    return o


def _tube(c, nom, a, b, rayon, x, mat):
    """Cylindre de a a b, points (y, z) du plan du bras : corps et tige de verin."""
    from mathutils import Vector
    a, b = Vector((x, *a)), Vector((x, *b))
    d = b - a
    o = c.cylindre(nom, rayon, d.length, (0, 0, -d.length / 2), mat=mat, cotes=10)
    o.rotation_mode = "QUATERNION"
    o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
    o.location = (a + b) / 2
    c.applique(o)
    o.rotation_mode = "XYZ"
    return o


def _poutre(points, demi):
    """Contour d'une poutre coudee : la ligne d'axe points (y, z), epaissie de demi (une demi-hauteur par point)."""
    def normale(a, b):
        dy, dz = b[0] - a[0], b[1] - a[1]
        n = math.hypot(dy, dz)
        return (-dz / n, dy / n)
    haut, bas = [], []
    for i, p in enumerate(points):
        ns = [normale(points[j], points[j + 1]) for j in (i - 1, i) if 0 <= j < len(points) - 1]
        ny, nz = sum(n[0] for n in ns) / len(ns), sum(n[1] for n in ns) / len(ns)
        m = math.hypot(ny, nz)
        ny, nz = ny / m, nz / m
        k = demi[i] / max(0.5, ny * ns[0][0] + nz * ns[0][1])  # garde l'epaisseur au coude
        haut.append((p[0] + ny * k, p[1] + nz * k))
        bas.append((p[0] - ny * k, p[1] - nz * k))
    return haut + bas[::-1]


def _le_long(a, b, t, decalage=0.0):
    """Point a la fraction t de a vers b, decale perpendiculairement (vers le haut de la poutre si decalage > 0)."""
    dy, dz = b[0] - a[0], b[1] - a[1]
    n = math.hypot(dy, dz)
    return (a[0] + t * dy + dz / n * decalage, a[1] + t * dz - dy / n * decalage)


def _arc(centre, rayon, debut, fin, n):
    return [(centre[0] + rayon * math.cos(math.radians(debut + (fin - debut) * k / n)),
             centre[1] + rayon * math.sin(math.radians(debut + (fin - debut) * k / n))) for k in range(n + 1)]


def _chenilles(c):
    """Les deux chenilles (profil a bouts arrondis), leurs roues d'extremite (0,54 m), le chassis et la couronne : un seul
    objet fixe ; les petits galets et les patins a part (detail retire en qualite basse)."""
    l, long_, h = CHENILLE
    r = h / 2
    profil = _arc((long_ / 2 - r, r), r, -90, 90, 8) + _arc((-long_ / 2 + r, r), r, 90, 270, 8)
    pieces, details = [], []
    for cote, x in (("L", VOIE), ("R", -VOIE)):
        t = _profil(c, P + "TRACK_" + cote, profil, l, x, "MAT_PAINTED_METAL_GRAPHITE")
        c.chanfreine(t, C2, 2)
        pieces.append(t)
        dehors = x + math.copysign(l / 2 + 0.02, x)
        for k, y in enumerate((-long_ / 2 + r, long_ / 2 - r)):
            pieces.append(_axe(c, P + "IDLER_%s%d" % (cote, k), y, r, 0.27, 0.06, dehors, "MAT_STEEL", cotes=14))
        for k, y in enumerate((-0.55, 0.0, 0.55)):
            details.append(_axe(c, P + "ROLLER_%s%d" % (cote, k), y, 0.24, 0.15, 0.06, dehors, "MAT_STEEL", cotes=10))
        for k in range(7):
            y = -1.05 + k * 0.35
            details.append(c.boite(P + "SHOE_%s%d" % (cote, k), (l + 0.02, 0.12, 0.05), (x, y, h - 0.02),
                                   mat="MAT_PAINTED_METAL_GRAPHITE", chanfrein=C1, segments=2))
    pieces.append(c.boite(P + "FRAME", (1.4, 2.2, 0.45), (0, 0, 0.25), mat="MAT_PAINTED_METAL_GRAPHITE", chanfrein=C2, segments=2))
    pieces.append(c.cylindre(P + "SLEW_RING", 0.85, TOURELLE - 0.7, (0, 0, 0.7), mat="MAT_PAINTED_METAL_GRAPHITE", cotes=20))
    bas = c.fusionne(P + "UNDERCARRIAGE", pieces)
    c.lisse(bas)
    detail = c.fusionne(P + "TRACK_DETAIL", details)
    c.lisse(detail)
    return bas, detail


def _tourelle(c, orient):
    z = TOURELLE
    pont = c.boite(P + "DECK", (2.4, 3.0, 0.2), (0, 0.2, z), mat="MAT_PAINTED_METAL_GRAPHITE", chanfrein=C2, segments=2)
    z += 0.2
    capot = c.boite(P + "ENGINE", (2.4, 1.7, 0.8), (0, 0.85, z), mat="MAT_PAINTED_METAL_ORANGE", chanfrein=0.2, segments=3)
    reservoir = c.boite(P + "TANK", (0.75, 1.3, 0.65), (-0.825, -0.65, z), mat="MAT_PAINTED_METAL_ORANGE", chanfrein=C2, segments=2)
    pied = c.boite(P + "BOOM_FOOT", (0.5, 0.6, PIED[1] - z + 0.15), (X_BRAS, PIED[0], z), mat="MAT_PAINTED_METAL_ORANGE", chanfrein=C2,
                   segments=2)
    attache = c.boite(P + "CYL_MOUNT", (0.4, 0.3, 0.25), (X_BRAS, VERIN_FLECHE[0][0] + 0.05, z - 0.05), mat="MAT_PAINTED_METAL_GRAPHITE",
                      chanfrein=C1, segments=2)
    # la cabine, a gauche (+X), vitree devant et sur le cote visible ; toit a 2,85 m
    cabine = c.boite(P + "CAB", (0.95, 1.3, 1.65), (0.725, -0.65, z), mat="MAT_PAINTED_METAL_ORANGE", chanfrein=C2, segments=3)
    vitre = c.boite(P + "CAB_GLASS_FRONT", (0.75, 0.06, 1.0), (0.725, -1.31, z + 0.45), mat="MAT_GLASS", chanfrein=C1, segments=2)
    vitre_cote = c.boite(P + "CAB_GLASS_SIDE", (0.06, 1.0, 0.8), (1.21, -0.65, z + 0.65), mat="MAT_GLASS", chanfrein=C1, segments=2)
    haut = c.fusionne(P + "UPPER", [pont, capot, reservoir, pied, attache, cabine, vitre, vitre_cote])
    c.lisse(haut)
    c.rattache(haut, orient)


def construit(c):
    from mathutils import Vector

    bas, detail = _chenilles(c)
    orient = c.pivot(P + "PIVOT_SLEW", (0, 0, TOURELLE))
    _tourelle(c, orient)

    # --- la fleche : une poutre coudee, son axe de pied
    fleche_pivot = c.pivot(P + "PIVOT_BOOM", (X_BRAS, *PIED), parent=orient)
    contour = _poutre([_le_long(PIED, COUDE, -0.12), COUDE, _le_long(COUDE, TETE, 1.1)], [0.27, 0.33, 0.22])
    fleche = _profil(c, P + "BOOM", contour, 0.5, X_BRAS, "MAT_PAINTED_METAL_ORANGE")
    c.chanfreine(fleche, C2, 2)
    axe_pied = _axe(c, P + "BOOM_PIN", *PIED, 0.12, 0.6, X_BRAS, "MAT_PAINTED_METAL_GRAPHITE")
    fleche = c.fusionne(P + "BOOM", [fleche, axe_pied])
    c.lisse(fleche)
    c.rattache(fleche, fleche_pivot)

    # --- le balancier, avec son levier au-dessus du bout de fleche
    balancier_pivot = c.pivot(P + "PIVOT_STICK", (X_BRAS, *TETE), parent=fleche_pivot)
    contour = _poutre([_le_long(LEVIER, TETE, -0.12), TETE, _le_long(TETE, GODET, 1.08)], [0.17, 0.22, 0.16])
    balancier = _profil(c, P + "STICK", contour, 0.4, X_BRAS, "MAT_PAINTED_METAL_ORANGE")
    c.chanfreine(balancier, C2, 2)
    axe_tete = _axe(c, P + "STICK_PIN", *TETE, 0.12, 0.56, X_BRAS, "MAT_PAINTED_METAL_GRAPHITE")
    balancier = c.fusionne(P + "STICK", [balancier, axe_tete])
    c.lisse(balancier)
    c.rattache(balancier, balancier_pivot)

    # --- le godet : une coque en C ouverte vers la machine, deux joues, son axe ; la lame et la terre a part
    godet_pivot = c.pivot(P + "PIVOT_BUCKET", (X_BRAS, *GODET), parent=balancier_pivot)
    centre = (GODET[0] - 0.1, GODET[1] - 0.4)
    exterieur = _arc(centre, 0.42, 100, 340, 12)
    interieur = _arc(centre, 0.32, 340, 100, 12)
    coque = _profil(c, P + "BUCKET", exterieur + interieur, 0.82, X_BRAS, "MAT_PAINTED_METAL_GRAPHITE")
    joues = [_profil(c, P + "BUCKET_SIDE_%d" % i, [GODET] + exterieur, 0.06, X_BRAS + s * 0.44, "MAT_PAINTED_METAL_GRAPHITE")
             for i, s in enumerate((-1, 1))]
    for j in joues:
        c.chanfreine(j, C1, 2)
    c.chanfreine(coque, C1, 2)
    axe_godet = _axe(c, P + "BUCKET_PIN", *GODET, 0.1, 0.5, X_BRAS, "MAT_PAINTED_METAL_GRAPHITE")
    godet = c.fusionne(P + "BUCKET", [coque] + joues + [axe_godet])
    c.lisse(godet)
    c.rattache(godet, godet_pivot)
    bout = exterieur[-1]
    lame = c.boite(P + "BUCKET_LIP_DETAIL", (0.9, 0.14, 0.08), (X_BRAS, 0, 0), mat="MAT_STEEL", chanfrein=C1, segments=2)
    lame.rotation_euler[0] = math.radians(340 + 90)
    c.applique(lame)
    lame.location = (X_BRAS, bout[0], bout[1])
    c.rattache(lame, godet_pivot)
    terre = c.boite(P + "BUCKET_LOAD", (0.76, 0.62, 0.62), (X_BRAS, centre[0] + 0.12, centre[1] - 0.12), mat="MAT_EARTH", chanfrein=0.15,
                    segments=3)
    c.lisse(terre)
    c.origine(terre, (X_BRAS, centre[0] + 0.12, centre[1] + 0.05))
    c.rattache(terre, godet_pivot)

    # --- les verins : corps et tige de meme longueur, chacun sur son pivot, qui se visent l'un l'autre
    a_fleche = _le_long(PIED, COUDE, VERIN_FLECHE[1], -0.3)
    b_balancier = _le_long(PIED, COUDE, VERIN_BALANCIER, 0.42)
    verins = [("BOOM_CYL", VERIN_FLECHE[0], orient, a_fleche, fleche_pivot),
              ("STICK_CYL", b_balancier, fleche_pivot, LEVIER, balancier_pivot)]

    # cinematique du plan YZ : ou est chaque point d'attache, pour une pose donnee
    def tourne(p, o, a):
        y, z = p[0] - o[0], p[1] - o[1]
        return (o[0] + y * math.cos(a) - z * math.sin(a), o[1] + y * math.sin(a) + z * math.cos(a))

    def monde(point, porteur, f, b):
        if porteur is orient:
            return point
        q = tourne(point, TETE, b) if porteur is balancier_pivot else point
        return tourne(q, PIED, f)

    def angle(p, q):
        return math.atan2(q[1] - p[1], q[0] - p[0])

    def angles(image):
        for (i0, *a0), (i1, *a1) in zip(POSES, POSES[1:]):
            if i0 <= image <= i1:
                t = (image - i0) / (i1 - i0)
                t = t * t * (3 - 2 * t)  # depart et arrivee adoucis
                return [u + (v - u) * t for u, v in zip(a0, a1)]
        return list(POSES[-1][1:])

    images = list(range(0, 241, 3))
    distances = {}
    for nom, a, porteur_a, b, porteur_b in verins:
        ds = []
        for image in images:
            _, f, bb, _, _ = angles(image)
            f, bb = math.radians(f), math.radians(bb)
            ds.append(math.dist(monde(a, porteur_a, f, bb), monde(b, porteur_b, f, bb)))
        distances[nom] = (min(ds), max(ds))
    corps = []
    for nom, a, porteur_a, b, porteur_b in verins:
        dmin, dmax = distances[nom]
        longueur = dmin - 0.05
        assert 2 * longueur > dmax + 0.1, (nom, dmin, dmax)  # le corps et la tige se recouvrent toujours
        u = (b[0] - a[0], b[1] - a[1])
        n = math.hypot(*u)
        u = (u[0] / n, u[1] / n)
        pa = c.pivot(P + nom + "_PIVOT_BODY", (X_BRAS, *a), parent=porteur_a)
        corps_ = _tube(c, P + nom + "_BODY_DETAIL", a, (a[0] + u[0] * longueur, a[1] + u[1] * longueur), 0.11, X_BRAS,
                       "MAT_PAINTED_METAL_GRAPHITE")
        c.lisse(corps_)
        c.rattache(corps_, pa)
        pb = c.pivot(P + nom + "_PIVOT_ROD", (X_BRAS, *b), parent=porteur_b)
        tige = _tube(c, P + nom + "_ROD_DETAIL", b, (b[0] - u[0] * longueur, b[1] - u[1] * longueur), 0.06, X_BRAS, "MAT_STEEL")
        c.rattache(tige, pb)
        corps.append((nom, a, porteur_a, pa, b, porteur_b, pb))

    # --- les cles : une seule action pour tous les noeuds, un seul clip glTF
    clip = "ANM_EXCAVATOR_A_DIGGING"
    cles = {k: [] for k in ("slew", "boom", "stick", "bucket", "load")}
    cles_verins = {nom: ([], []) for nom, *_ in corps}
    for image in images:
        o, f, b, g, t = angles(image)
        cles["slew"].append((image, math.radians(o)))
        cles["boom"].append((image, math.radians(f)))
        cles["stick"].append((image, math.radians(b)))
        cles["bucket"].append((image, math.radians(g)))
        s = max(0.01, min(1.0, t))
        cles["load"].append((image, (s, s, s)))
        f, b = math.radians(f), math.radians(b)
        for nom, a, porteur_a, pa, bb, porteur_b, pb in corps:
            wa, wb = monde(a, porteur_a, f, b), monde(bb, porteur_b, f, b)
            repos = angle(a, bb)
            rot_a = {orient: 0.0, fleche_pivot: f}[porteur_a]
            rot_b = {fleche_pivot: f, balancier_pivot: f + b}[porteur_b]
            cles_verins[nom][0].append((image, angle(wa, wb) - repos - rot_a))
            cles_verins[nom][1].append((image, angle(wa, wb) - repos - rot_b))
    c.anime(clip, orient, "rotation_euler", cles["slew"], index=2)
    c.anime(clip, fleche_pivot, "rotation_euler", cles["boom"], index=0)
    c.anime(clip, balancier_pivot, "rotation_euler", cles["stick"], index=0)
    c.anime(clip, godet_pivot, "rotation_euler", cles["bucket"], index=0)
    c.anime(clip, terre, "scale", cles["load"])
    for nom, a, porteur_a, pa, bb, porteur_b, pb in corps:
        c.anime(clip, pa, "rotation_euler", cles_verins[nom][0], index=0)
        c.anime(clip, pb, "rotation_euler", cles_verins[nom][1], index=0)

    # l'ancre de l'etiquette : fixe, au-dessus de l'arriere de la tourelle, plus haut que la fleche levee, pour que
    # le bras ne passe jamais dessous en tournant
    c.ancre("ANCHOR_LABEL", (0, 0.6, 4.0))

    bpy.context.scene.frame_set(0)
    if "atelier" in sys.modules or any(Path(x).name == "atelier.py" for x in sys.argv):
        vue_atelier()
    return {"triangles_vises": 6000, "animations": [clip], "verins": distances}


def vue_atelier():
    """Atelier seulement : GDC_ATELIER_QUALITE=low cache les details, comme le fait le composant."""
    if os.environ.get("GDC_ATELIER_QUALITE") != "low":
        return
    for o in bpy.data.objects:
        if o.name.endswith("_DETAIL"):
            o.hide_render = o.hide_viewport = True
