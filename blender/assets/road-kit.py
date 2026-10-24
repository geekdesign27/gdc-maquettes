"""Le kit des rues (catalogue : road-kit, lot G9) : les rues de la ville fictive, aux cotes de sa grille (docs/ville-autour.md).
Brief ENV_ROAD_KIT_A_v001 valide par Pierre-Alain le 24 octobre 2026.

Vue a environ 8 px/m (cadrage par defaut) et 2,5 px/m (dezoom) : detail minimal 0,30 m en haute, 0,60 m en basse.
Un ruban d'enrobe gris violace a tirets blancs, borde de trottoirs clairs ; le giratoire (anneau, ilot vert) ; le
lampadaire a crosse, graphite, qui ne se confond pas avec le projecteur de chantier (galvanise et leste).

Cotes : chaussee de 6 m (MAT_ASPHALT), dessus a +0,04 m comme les routes du chantier (site-ground) ; trottoirs de 2 m
(MAT_CONCRETE), dessus a +0,19 m : bordure de 0,15 m, chanfrein C1 arrondi en deux segments ; une rue fait 10 m.
Marquages blancs (MAT_SURFACE, jamais jaune : ni signal ni bordure de zone), 5 mm au-dessus de l'enrobe :
tirets de 3 m sur 0,30 m au pas de 6 m ; passage pieton de cinq bandes de 0,50 m, longues de 4 m.

Chaque piece est un noeud ENV_ROAD_KIT_A_<PIECE>, posee a l'origine, la rue le long de X ; sans pivot, sans animation,
sans ancre. L'assemblage la pose, la tourne de 90 en 90 degres, et etire STRAIGHT en X :
- STRAIGHT : un troncon de 10 m (x de -5 a 5) : chaussee, deux trottoirs, bordures, bouts fermes (la rue coupee net au
  bord du socle). Rien dedans ne se deforme a l'etirement : le profil est en YZ, aucun tiret ;
- DASH : un tiret (centre a l'origine), repete tous les 6 m par l'assemblage ;
- CROSSING : le passage pieton, centre a l'origine, sur une rue le long de X ;
- CROSS : le carrefour en croix, 10 x 10 m, angles de trottoir arrondis (rayon 1,50 m) ;
- TEE : le carrefour en T, 10 x 10 m : la rue passe le long de X, la branche part vers +Y ;
- ROUNDABOUT : le giratoire a quatre branches : chaussee annulaire de 6 m (diametre 22 m), ilot en herbe de 10 m borde
  de beton, trottoir annulaire de 2 m (diametre 26 m) ; ses branches vont jusqu'a +-15 m, ou elles se raccordent a
  STRAIGHT : emprise de 30 x 30 m, et 30 m de troncon jusqu'au carrefour voisin sur le pas de 50 m ;
- LAMP_POLE et LAMP_HEAD : le mat (6 m, 0,14 m de diametre) et sa crosse (1,20 m, vers +Y : la chaussee, pour un
  lampadaire pose sur le trottoir -Y a 0,50 m de la bordure), et la tete de verre de 0,70 x 0,30 m, a part pour que
  la nuit l'allume (city-night). Les deux se posent au meme point.
Qualite basse (bible 18.3) : STRAIGHT_LOW, CROSS_LOW, TEE_LOW, ROUNDABOUT_LOW, trottoirs de plain-pied, sans bordure ;
ni tiret, ni passage, ni lampadaire.
"""

import math

import bpy

ASSET = {"id": "road-kit", "categorie": "kit", "nom": "ENV_ROAD_KIT_A_v001"}

P = "ENV_ROAD_KIT_A_"
RUE = 10.0  # largeur d'une rue, trottoirs compris (pas de la grille : 50 m)
DEMI_CHAUSSEE = 3.0
ENROBE = 0.04  # dessus de la chaussee
TROTTOIR = 0.19  # dessus du trottoir : bordure de 0,15 m
SOUS = -0.02  # dessous des trottoirs, sous le dessus de city-ground (-0,01) : aucun jour au pied
MARQUAGE = ENROBE + 0.005
PLAIN_PIED = ENROBE + 0.01  # trottoirs de la qualite basse, poses sur la chaussee
C1 = 0.02
RAYON_ANGLE = 1.50  # angles de trottoir arrondis des carrefours
TIRET = (3.0, 0.30)
BANDE = (4.0, 0.50)
PAS_BANDES = 1.20  # cinq bandes reparties sur la chaussee de 6 m
R_ILOT, R_ANNEAU, R_TROTTOIR = 5.0, 11.0, 13.0  # ilot de 10 m, chaussee annulaire de 6 m, trottoir de 2 m
BORD_ILOT = 0.50  # le beton qui borde l'ilot
BRANCHE = 15.0  # bout des branches du giratoire
MAT_LAMPE = (0.07, 6.0)  # rayon et hauteur du mat
CROSSE = 1.20
TETE = (0.30, 0.70, 0.15)  # largeur (X), longueur (Y, le long de la crosse), epaisseur : 0,15 m, le detail minimal (18.3)
SEGMENTS_ANNEAU = 32


# --- maillages ------------------------------------------------------------------------------------------------------

def _maillage(c, nom, sommets, faces, mat):
    """Un objet a partir de ses sommets et de ses faces, deja orientees vers l'exterieur (aucun recalcul : les dalles
    sont ouvertes par-dessous)."""
    m = bpy.data.meshes.new(nom)
    m.from_pydata([tuple(s) for s in sommets], [], faces)
    m.update()
    o = bpy.data.objects.new(nom, m)
    bpy.context.scene.collection.objects.link(o)
    o.data.materials.append(c.materiau(mat))
    return o


def _intersection(p, u1, o1, n1, u2, o2, n2):
    """Le coin d'un contour decale : intersection des droites (p + n1*o1, u1) et (p + n2*o2, u2)."""
    a = (p[0] + n1[0] * o1, p[1] + n1[1] * o1)
    b = (p[0] + n2[0] * o2, p[1] + n2[1] * o2)
    det = u1[0] * u2[1] - u1[1] * u2[0]
    if abs(det) < 1e-9:
        return b
    t = ((b[0] - a[0]) * u2[1] - (b[1] - a[1]) * u2[0]) / det
    return (a[0] + u1[0] * t, a[1] + u1[1] * t)


def _dalle(c, nom, contour, bordures, mat, haut=TROTTOIR, bas=SOUS):
    """Une dalle de contour quelconque (polygone dans le sens trigonometrique vu de dessus), fermee sur ses cotes,
    ouverte par-dessous. bordures : indices des cotes (de contour[i] a contour[i+1]) qui bordent la chaussee : leur
    arete du haut est arrondie en C1 (deux segments). Les autres cotes restent droits : bout pose contre la piece
    voisine, bord du pate."""
    n = len(contour)
    bord = [i in bordures for i in range(n)]
    directions, normales = [], []
    for i in range(n):
        a, b = contour[i], contour[(i + 1) % n]
        dx, dy = b[0] - a[0], b[1] - a[1]
        l = math.hypot(dx, dy)
        directions.append((dx / l, dy / l))
        normales.append((-dy / l, dx / l))  # vers l'interieur
    # les anneaux d'un coin, du haut vers le bas : (recul de la bordure, hauteur)
    k = 1 - math.cos(math.radians(45))
    arrondi = [(1.0, haut), (k, haut - k * C1), (0.0, haut - C1)]
    sommets, anneaux = [], []
    for i in range(n):
        g, d = (i - 1) % n, i
        cotes = [(C1 if bord[g] else 0.0), (C1 if bord[d] else 0.0)]
        etages = arrondi if (bord[g] or bord[d]) else [(1.0, haut)]
        anneau = []
        for f, z in etages:
            x, y = _intersection(contour[i], directions[g], cotes[0] * f, normales[g], directions[d], cotes[1] * f,
                                 normales[d])
            anneau.append(len(sommets))
            sommets.append((x, y, z))
        anneau.append(len(sommets))
        sommets.append((contour[i][0], contour[i][1], bas))
        anneaux.append(anneau)
    faces = [[a[0] for a in anneaux]]
    for i in range(n):
        a, b = anneaux[i], anneaux[(i + 1) % n]
        if bord[i]:
            faces += [[a[e + 1], b[e + 1], b[e], a[e]] for e in range(3)]
        else:
            faces.append([a[-1]] + b[::-1] + a[:-1])
    return _maillage(c, nom, sommets, faces, mat)


def _plaque(c, nom, contour, z, mat):
    """Un aplat horizontal (polygone dans le sens trigonometrique) : chaussee, marquage, trottoir de plain-pied."""
    return _maillage(c, nom, [(x, y, z) for x, y in contour], [list(range(len(contour)))], mat)


def _rectangle(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


def _arc(centre, rayon, a0, a1, segments):
    """Points d'un arc, de l'angle a0 a l'angle a1 (degres), extremites comprises."""
    return [(centre[0] + rayon * math.cos(math.radians(a0 + (a1 - a0) * s / segments)),
             centre[1] + rayon * math.sin(math.radians(a0 + (a1 - a0) * s / segments))) for s in range(segments + 1)]


def _tourne(points, angle):
    ca, sa = math.cos(math.radians(angle)), math.sin(math.radians(angle))
    return [(x * ca - y * sa, x * sa + y * ca) for x, y in points]


def _tube(c, nom, chemin, rayon, cotes, mat):
    """Un tube a facettes le long d'une ligne brisee (la crosse), ferme a son bout ; son debut entre dans le mat."""
    from mathutils import Vector
    pts = [Vector(p) for p in chemin]
    sommets, anneaux = [], []
    for i, p in enumerate(pts):
        t = ((pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)])).normalized()
        u = Vector((1, 0, 0)) if abs(t.x) < 0.9 else Vector((0, 0, 1))
        u = (u - t * u.dot(t)).normalized()
        v = t.cross(u)
        anneau = []
        for k in range(cotes):
            a = 2 * math.pi * k / cotes
            anneau.append(len(sommets))
            sommets.append(tuple(p + (u * math.cos(a) + v * math.sin(a)) * rayon))
        anneaux.append(anneau)
    faces = []
    for a, b in zip(anneaux, anneaux[1:]):
        faces += [[a[k], a[(k + 1) % cotes], b[(k + 1) % cotes], b[k]] for k in range(cotes)]
    faces.append(anneaux[-1][:])  # chaque anneau tourne autour de la tangente : faces vers l'exterieur, bout vers l'avant
    return _maillage(c, nom, sommets, faces, mat)


def _piece(c, nom, objets, lisser=True):
    """Fusionne les morceaux d'une piece et pose son origine au point d'assemblage (0, 0, 0)."""
    o = c.fusionne(P + nom, objets) if len(objets) > 1 else objets[0]
    o.name = o.data.name = P + nom
    c.origine(o, (0, 0, 0))
    if lisser:
        c.lisse(o)
    return o


# --- les contours des trottoirs (sens trigonometrique, vus de dessus) ----------------------------------------------

def _trottoir_droit(x0, x1, cote):
    """Le trottoir d'une rue le long de X, du cote +Y (cote = 1) ou -Y (cote = -1) ; la bordure est le premier cote."""
    if cote > 0:
        return [(x0, DEMI_CHAUSSEE), (x1, DEMI_CHAUSSEE), (x1, RUE / 2), (x0, RUE / 2)], {0}
    return [(x1, -DEMI_CHAUSSEE), (x0, -DEMI_CHAUSSEE), (x0, -RUE / 2), (x1, -RUE / 2)], {0}


def _angle(rotation):
    """Le trottoir d'un angle de carrefour (2 x 2 m), arrondi cote chaussee ; dessine au coin +X +Y, puis tourne."""
    a, b, r = DEMI_CHAUSSEE, RUE / 2, RAYON_ANGLE
    contour = [(a + r, a), (b, a), (b, b), (a, b), (a, a + r)] + _arc((a + r, a + r), r, 180, 270, 4)[1:-1]
    return _tourne(contour, rotation), {0, 3, 4, 5, 6, 7}


def _quartier_giratoire(rotation):
    """Le trottoir du giratoire entre deux branches (celles de +X et de +Y), puis tourne : le trottoir annulaire et les
    trottoirs des deux branches, d'un seul tenant."""
    a, b = DEMI_CHAUSSEE, RUE / 2
    t_anneau = math.degrees(math.asin(a / R_ANNEAU))  # la bordure de la branche rencontre celle de l'anneau
    t_trottoir = math.degrees(math.asin(b / R_TROTTOIR))
    x_anneau = R_ANNEAU * math.cos(math.radians(t_anneau))
    exterieur = _arc((0, 0), R_TROTTOIR, t_trottoir, 90 - t_trottoir, 8)
    interieur = _arc((0, 0), R_ANNEAU, 90 - t_anneau, t_anneau, 10)
    contour = [(x_anneau, a), (BRANCHE, a), (BRANCHE, b)] + exterieur + [(b, BRANCHE), (a, BRANCHE)] + interieur[:-1]
    n_ext = len(exterieur)
    debut_interieur = 3 + n_ext + 1  # le cote de (a, BRANCHE) au premier point de l'arc interieur
    bordures = {0} | set(range(debut_interieur, len(contour)))
    return _tourne(contour, rotation), bordures


def _chaussee_giratoire(rayon):
    """L'enrobe du giratoire : un disque (cache sous l'ilot et sous le trottoir) et ses quatre branches."""
    w = DEMI_CHAUSSEE + 0.5  # la chaussee des branches passe sous la bordure des trottoirs
    t = math.degrees(math.asin(w / rayon))
    contour = []
    for k in range(4):
        base = 90 * k
        contour += _tourne([(BRANCHE, -w), (BRANCHE, w)], base)
        contour += _arc((0, 0), rayon, base + t, base + 90 - t, 5)
    return contour


def _disque(rayon, segments):
    return _arc((0, 0), rayon, 0, 360, segments)[:-1]


# --- les pieces -------------------------------------------------------------------------------------------------------

def _droit(c):
    l = RUE / 2
    morceaux = [_plaque(c, P + "STRAIGHT_ASPHALT", _rectangle(-l, -DEMI_CHAUSSEE, l, DEMI_CHAUSSEE), ENROBE, "MAT_ASPHALT")]
    for k, cote in enumerate((-1, 1)):
        contour, bordures = _trottoir_droit(-l, l, cote)
        morceaux.append(_dalle(c, P + "STRAIGHT_WALK_%d" % k, contour, bordures, "MAT_CONCRETE"))
    _piece(c, "STRAIGHT", morceaux)
    # en basse, l'enrobe passe 0,50 m sous les trottoirs de plain-pied, 1 cm plus hauts : aucun jour entre eux (constat du
    # controleur du 24 octobre 2026), comme les carrefours et le giratoire bas
    sous = DEMI_CHAUSSEE + 0.5
    basse = [_plaque(c, P + "STRAIGHT_LOW_ASPHALT", _rectangle(-l, -sous, l, sous), ENROBE, "MAT_ASPHALT")]
    for k, cote in enumerate((-1, 1)):
        basse.append(_plaque(c, P + "STRAIGHT_LOW_WALK_%d" % k, _trottoir_droit(-l, l, cote)[0], PLAIN_PIED, "MAT_CONCRETE"))
    _piece(c, "STRAIGHT_LOW", basse, lisser=False)


def _marquages(c):
    lt, wt = TIRET
    _piece(c, "DASH", [_plaque(c, P + "DASH", _rectangle(-lt / 2, -wt / 2, lt / 2, wt / 2), MARQUAGE, "MAT_SURFACE")],
           lisser=False)
    lb, wb = BANDE
    bandes = [_plaque(c, P + "CROSSING_%d" % k, _rectangle(-lb / 2, y - wb / 2, lb / 2, y + wb / 2), MARQUAGE, "MAT_SURFACE")
              for k, y in enumerate(PAS_BANDES * (i - 2) for i in range(5))]
    _piece(c, "CROSSING", bandes, lisser=False)


def _carrefour(c, nom, angles, cote_droit):
    """Un carrefour de 10 x 10 m : l'enrobe, les angles arrondis, et le trottoir droit d'un T (cote_droit)."""
    l = RUE / 2
    haute = [_plaque(c, P + nom + "_ASPHALT", _rectangle(-l, -l, l, l), ENROBE, "MAT_ASPHALT")]
    basse = [_plaque(c, P + nom + "_LOW_ASPHALT", _rectangle(-l, -l, l, l), ENROBE, "MAT_ASPHALT")]
    for k, rotation in enumerate(angles):
        contour, bordures = _angle(rotation)
        haute.append(_dalle(c, P + nom + "_CORNER_%d" % k, contour, bordures, "MAT_CONCRETE"))
        basse.append(_plaque(c, P + nom + "_LOW_CORNER_%d" % k, contour, PLAIN_PIED, "MAT_CONCRETE"))
    if cote_droit:
        contour, bordures = _trottoir_droit(-l, l, cote_droit)
        haute.append(_dalle(c, P + nom + "_WALK", contour, bordures, "MAT_CONCRETE"))
        basse.append(_plaque(c, P + nom + "_LOW_WALK", contour, PLAIN_PIED, "MAT_CONCRETE"))
    _piece(c, nom, haute)
    _piece(c, nom + "_LOW", basse, lisser=False)


def _giratoire(c):
    haute = [_plaque(c, P + "ROUNDABOUT_ASPHALT", _chaussee_giratoire(R_ANNEAU + 0.5), ENROBE, "MAT_ASPHALT")]
    for k in range(4):
        contour, bordures = _quartier_giratoire(90 * k)
        haute.append(_dalle(c, P + "ROUNDABOUT_WALK_%d" % k, contour, bordures, "MAT_CONCRETE"))
    ilot = _disque(R_ILOT, SEGMENTS_ANNEAU)
    haute.append(_dalle(c, P + "ROUNDABOUT_ISLAND_KERB", ilot, set(range(len(ilot))), "MAT_CONCRETE"))
    haute.append(_plaque(c, P + "ROUNDABOUT_ISLAND", _disque(R_ILOT - BORD_ILOT, SEGMENTS_ANNEAU), TROTTOIR + 0.005,
                         "MAT_LANDSCAPE"))
    _piece(c, "ROUNDABOUT", haute)
    # qualite basse : moins de facettes, trottoirs de plain-pied, l'ilot en herbe sans sa bordure de 0,50 m
    basse = [_plaque(c, P + "ROUNDABOUT_LOW_ASPHALT", _chaussee_giratoire(R_ANNEAU + 0.5), ENROBE, "MAT_ASPHALT")]
    for k in range(4):
        basse.append(_plaque(c, P + "ROUNDABOUT_LOW_WALK_%d" % k, _quartier_giratoire(90 * k)[0], PLAIN_PIED, "MAT_CONCRETE"))
    basse.append(_plaque(c, P + "ROUNDABOUT_LOW_ISLAND", _disque(R_ILOT, 24), PLAIN_PIED, "MAT_LANDSCAPE"))
    _piece(c, "ROUNDABOUT_LOW", basse, lisser=False)


def _lampadaire(c):
    r, h = MAT_LAMPE
    mat = c.cylindre(P + "LAMP_POLE", r, h, (0, 0, 0), mat="MAT_PAINTED_METAL_GRAPHITE", cotes=6)
    z = h + 0.20  # dessus de la crosse
    crosse = _tube(c, P + "LAMP_POLE_ARM", [(0, 0, h - 0.20), (0, 0, h), (0, 0.12, h + 0.15), (0, 0.35, z), (0, CROSSE, z)],
                   0.045, 6, "MAT_PAINTED_METAL_GRAPHITE")
    _piece(c, "LAMP_POLE", [mat, crosse])
    l, p, e = TETE
    tete = c.boite(P + "LAMP_HEAD", (l, p, e), (0, CROSSE - p / 2, z - 0.045 - e), mat="MAT_GLASS")
    _piece(c, "LAMP_HEAD", [tete], lisser=False)


def construit(c):
    _droit(c)
    _marquages(c)
    _carrefour(c, "CROSS", (0, 90, 180, 270), 0)
    _carrefour(c, "TEE", (0, 90), -1)
    _giratoire(c)
    _lampadaire(c)
    return {"triangles_vises": 1500, "animations": []}


# --- la demonstration -------------------------------------------------------------------------------------------------

def demonstration():
    """Un bout de quartier sur le pas de 50 m (Blender : Z vertical) : un carrefour en croix en (0, 0), deux en T en
    (50, 0) et (50, 50), le giratoire en (0, 50), relies par des troncons de 40 et 30 m ; tirets, passages pietons,
    lampadaires. Les rues sont coupees net au bord du socle, comme sur une maquette. Le socle est en herbe, comme le
    dessus de city-ground. Chaque troncon est un seul STRAIGHT etire (echelle [longueur / 10, 1, 1]) ; les marquages
    et les lampadaires sont marques basse: false : l'assemblage ne les pose pas en qualite basse (bible 18.3)."""
    pieces = []

    def pose(piece, x, y, rotation=0, echelle=None, basse=True):
        p = {"piece": P + piece, "position": [round(x, 3), round(y, 3), 0.0], "rotation": rotation % 360}
        if echelle:
            p["echelle"] = [round(echelle, 4), 1.0, 1.0]
        if not basse:
            p["basse"] = False
        pieces.append(p)

    def troncon(a, b, fixe, axe, passages=()):
        """Une rue de a a b le long de axe ('x' ou 'y'), l'autre coordonnee valant fixe : STRAIGHT bout a bout, un
        passage pieton a 1 m de chaque bout demande ('debut', 'fin'), et les tirets sur le reste, au pas de 6 m : un
        STRAIGHT etire en X (le long de la rue, avant sa rotation) a la longueur du troncon."""
        rot = 0 if axe == "x" else 90
        at = (lambda s: (s, fixe)) if axe == "x" else (lambda s: (fixe, s))
        pose("STRAIGHT", *at((a + b) / 2), rot, echelle=(b - a) / RUE)
        debut, fin = a + 1.5, b - 1.5
        if "debut" in passages:
            pose("CROSSING", *at(a + 1 + BANDE[0] / 2), rot, basse=False)
            debut = a + 2 + BANDE[0] + 0.5
        if "fin" in passages:
            pose("CROSSING", *at(b - 1 - BANDE[0] / 2), rot, basse=False)
            fin = b - 2 - BANDE[0] - 0.5
        tirets = int((fin - debut + TIRET[0]) // (2 * TIRET[0]))
        milieu = (debut + fin) / 2
        for k in range(tirets):
            pose("DASH", *at(milieu + 2 * TIRET[0] * (k - (tirets - 1) / 2)), rot, basse=False)

    def lampe(x, y, rotation):
        pose("LAMP_POLE", x, y, rotation, basse=False)
        pose("LAMP_HEAD", x, y, rotation, basse=False)

    l = RUE / 2
    pose("CROSS", 0, 0)
    pose("TEE", 50, 0, 90)  # la rue passe le long de Y, la branche part vers -X
    pose("TEE", 50, 50, 180)  # la rue passe le long de X, la branche part vers -Y
    pose("ROUNDABOUT", 0, 50)
    troncon(-15, -l, 0, "x")
    troncon(-15, -l, 0, "y")
    troncon(-15, -l, 50, "y")
    troncon(l, 50 - l, 0, "x", ("debut", "fin"))
    troncon(l, 50 - BRANCHE, 0, "y", ("fin",))
    troncon(BRANCHE, 50 - l, 50, "x")
    troncon(l, 50 - l, 50, "y", ("fin",))
    # les lampadaires, a 0,50 m de la bordure, la crosse au-dessus de la chaussee
    bord = DEMI_CHAUSSEE + 0.5
    lampe(12.5, -bord, 0)
    lampe(37.5, bord, 180)
    lampe(bord, 20, 90)
    lampe(50 - bord, 25, 270)
    lampe(30, 50 + bord, 180)
    r = (R_ANNEAU + R_TROTTOIR) / 2 / math.sqrt(2)
    lampe(r, 50 + r, 135)
    lampe(-r, 50 - r, 315)
    socle = {"taille": [70.0, 80.0, 0.60], "centre": [20.0, 25.0], "materiau": "MAT_LANDSCAPE", "chanfrein": 0.10}
    return {"prefixe": P, "socles": [socle], "pieces": pieces}
