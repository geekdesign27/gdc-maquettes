"""Le kit de batiment (catalogue : building-kit), premier etalon de WORKSITE. Bible 1.2, sections 6 et 18.

Chaque piece est un noeud BLD_KIT_A_<PIECE>, pose a l'origine et pret a assembler sur la trame de 3 m :
- poteaux centres sur les croisements de la trame, de dalle a dalle ;
- murs : parement exterieur sur l'axe de trame, epaisseur vers l'interieur (+Y), entre deux poteaux ;
  le mur est donc en retrait de 0,15 m sur le nu des poteaux et l'ossature beton se lit ;
- dalles : une case de 3 x 3 m sans chanfrein (les cases se touchent sans joint) ; la rive est une piece a part,
  posee a l'exterieur de l'axe (-Y), chanfreinee sur ses aretes exterieures seulement ;
- l'exterieur de chaque piece de facade est vers -Y ; une rotation autour de Z la pose sur les autres faces
  (+90 : facade +X, 180 : facade +Y, 270 : facade -X).
Etage de 3,00 m dalle a dalle, dalle 0,30 m : un etage pose a z est occupe de z a z + 2,70 sous la dalle suivante.

demonstration() donne le plan du batiment de demonstration (2 x 2 trames, deux etages, sur son socle) :
l'atelier le monte pour les captures, construit.py l'ecrit a cote du GLB et la galerie l'assemble depuis le GLB.
"""

import math

ASSET = {"id": "building-kit", "categorie": "kit", "nom": "BLD_KIT_A_v001"}

P = "BLD_KIT_A_"
TRAME = 3.0
ETAGE = 3.0
DALLE = 0.30
SOUS_DALLE = ETAGE - DALLE  # hauteur libre d'un etage : poteaux et murs
POTEAU = 0.30
MUR = 0.20  # epaisseur des murs de facade
LONG_MUR = TRAME - POTEAU  # entre les faces de deux poteaux
RIVE = 0.20  # largeur de la rive de dalle : depasse de 0,05 m le nu des poteaux
FENETRE = (1.50, 1.50)
ALLEGE = 0.90
PORTE = (1.10, 2.40)
GARDE_CORPS = 1.10
ECHAFAUDAGE = 0.80  # profondeur d'une travee d'echafaudage
JEU_FACADE = 0.30  # distance maximale entre la facade et l'echafaudage
FER = 0.06  # attentes : le minimum filiforme
SEMELLE = 0.90  # semelle isolee sous poteau, carree
ACROTERE = 0.50  # hauteur de l'acrotere au-dessus du toit plat
PENTE = 30  # toit a deux pans, en degres
DEBORD = 0.40  # debord du toit a deux pans au-dela de l'axe de facade
COUVERTURE = 0.20  # epaisseur d'un pan
VOLEE = 1.20  # largeur d'une volee d'escalier
CAGE = 1.30  # demi-largeur libre d'une case entre les poteaux, pour l'escalier
TUBE = 0.08  # tubes et lisses : au-dessus du minimum filiforme de 0,06 m, pour rester visibles a 25 px/m (bible 18.3)

C1, C2, C3 = 0.02, 0.05, 0.10


def _piece(c, nom, objets):
    """Fusionne les morceaux d'une piece, la lisse et pose son origine au point d'assemblage (0, 0, 0)."""
    o = c.fusionne(P + nom, objets) if len(objets) > 1 else objets[0]
    o.name = o.data.name = P + nom
    c.origine(o, (0, 0, 0))
    c.lisse(o)
    return o


def _mur(c, nom, mat):
    return c.boite(P + nom, (LONG_MUR, MUR, SOUS_DALLE), (0, MUR / 2, 0), mat=mat)


def _baie_fenetre(c, nom):
    """Cadre en aluminium et verre opaque, en retrait de 0,05 m du parement."""
    l, h = FENETRE
    cadre = c.boite(P + nom + "_FRAME", (l, 0.10, h), (0, 0.10, ALLEGE), mat="MAT_ALUMINIUM")
    c.perce(cadre, (l - 0.20, 0.30, h - 0.20), (0, 0.10, ALLEGE + 0.10))
    c.chanfreine(cadre, C1, 2)
    verre = c.boite(P + nom + "_GLASS", (l - 0.20, 0.04, h - 0.20), (0, 0.11, ALLEGE + 0.10), mat="MAT_GLASS")
    return [cadre, verre]


def construit(c):
    # --- ossature beton
    _piece(c, "COLUMN", [c.boite(P + "COLUMN", (POTEAU, POTEAU, SOUS_DALLE), mat="MAT_CONCRETE", chanfrein=C2, segments=2)])
    _piece(c, "SLAB", [c.boite(P + "SLAB", (TRAME, TRAME, DALLE), mat="MAT_CONCRETE")])
    _piece(c, "SLAB_EDGE", [c.boite(P + "SLAB_EDGE", (TRAME, RIVE, DALLE), (0, -RIVE / 2, 0), mat="MAT_CONCRETE",
                                    chanfrein=C2, segments=2, droites=("x-", "x+", "y+"))])
    _piece(c, "SLAB_CORNER", [c.boite(P + "SLAB_CORNER", (RIVE, RIVE, DALLE), (-RIVE / 2, -RIVE / 2, 0), mat="MAT_CONCRETE",
                                      chanfrein=C2, segments=2, droites=("x+", "y+"))])

    # --- murs en construction : corail, baie brute
    mur = _mur(c, "WALL_BRICK", "MAT_BRICK")
    c.chanfreine(mur, C2, 2)
    _piece(c, "WALL_BRICK", [mur])
    mur = _mur(c, "WALL_BRICK_WINDOW", "MAT_BRICK")
    c.perce(mur, (FENETRE[0], 1.0, FENETRE[1]), (0, MUR / 2, ALLEGE))
    c.chanfreine(mur, C2, 2)
    _piece(c, "WALL_BRICK_WINDOW", [mur])

    # --- murs finis : crepi, fenetre posee, porte
    mur = _mur(c, "WALL_RENDER", "MAT_SURFACE")
    c.chanfreine(mur, C2, 2)
    _piece(c, "WALL_RENDER", [mur])
    mur = _mur(c, "WALL_RENDER_WINDOW", "MAT_SURFACE")
    c.perce(mur, (FENETRE[0], 1.0, FENETRE[1]), (0, MUR / 2, ALLEGE))
    c.chanfreine(mur, C2, 2)
    _piece(c, "WALL_RENDER_WINDOW", [mur, *_baie_fenetre(c, "WALL_RENDER_WINDOW")])
    mur = _mur(c, "WALL_RENDER_DOOR", "MAT_SURFACE")
    l, h = PORTE
    c.perce(mur, (l, 1.0, h + 0.1), (0, MUR / 2, -0.1))
    c.chanfreine(mur, C2, 2)
    cadre = c.boite(P + "WALL_RENDER_DOOR_FRAME", (l, 0.12, h), (0, 0.10, 0), mat="MAT_ALUMINIUM")
    c.perce(cadre, (l - 0.16, 0.40, h - 0.08 + 0.1), (0, 0.10, -0.1))
    c.chanfreine(cadre, C1, 2)
    vantail = c.boite(P + "WALL_RENDER_DOOR_LEAF", (l - 0.16, 0.05, h - 0.08), (0, 0.12, 0), mat="MAT_PAINTED_METAL_GRAPHITE")
    _piece(c, "WALL_RENDER_DOOR", [mur, cadre, vantail])

    # --- garde-corps de rive : lisse a 1,10 m, sous-lisse, plinthe (protection laterale)
    # lisses et plinthe depassent d'une demi-rive a chaque bout : aux angles, elles rejoignent celles de l'autre face
    y, long = -RIVE / 2, TRAME + RIVE
    morceaux = [c.boite(P + "GUARDRAIL", (long, TUBE, TUBE), (0, y, GARDE_CORPS - TUBE), mat="MAT_STEEL"),
                c.boite(P + "GUARDRAIL_MID", (long, TUBE, TUBE), (0, y, GARDE_CORPS / 2 - TUBE / 2), mat="MAT_STEEL")]
    for i, x in enumerate((-TRAME / 4, TRAME / 4)):
        morceaux.append(c.boite(P + "GUARDRAIL_POST_" + str(i), (TUBE, TUBE, GARDE_CORPS), (x, y, 0), mat="MAT_STEEL"))
    morceaux.append(c.boite(P + "GUARDRAIL_TOE", (long, TUBE, 0.15), (0, y, 0), mat="MAT_WOOD"))
    _piece(c, "GUARDRAIL", morceaux)

    # --- echafaudage : une travee d'un etage, plancher en haut ; s'empile ; garde-corps exterieur du plancher d'en dessous
    yi, ye = -JEU_FACADE - TUBE / 2, -JEU_FACADE - ECHAFAUDAGE + TUBE / 2
    morceaux = []
    for i, (x, yy) in enumerate([(-TRAME / 2, yi), (TRAME / 2, yi), (-TRAME / 2, ye), (TRAME / 2, ye)]):
        morceaux.append(c.boite(P + "SCAFFOLD_STANDARD_" + str(i), (TUBE, TUBE, ETAGE), (x, yy, 0), mat="MAT_STEEL"))
    for i, yy in enumerate((yi, ye)):
        morceaux.append(c.boite(P + "SCAFFOLD_LEDGER_" + str(i), (TRAME, TUBE, TUBE), (0, yy, ETAGE - 2 * TUBE), mat="MAT_STEEL"))
    for i, z in enumerate((GARDE_CORPS / 2 - TUBE / 2, GARDE_CORPS - TUBE)):
        morceaux.append(c.boite(P + "SCAFFOLD_RAIL_" + str(i), (TRAME, TUBE, TUBE), (0, ye, z), mat="MAT_STEEL"))
    diag = c.boite(P + "SCAFFOLD_BRACE", (4.1, TUBE, TUBE), (0, ye, ETAGE / 2 - TUBE / 2), mat="MAT_STEEL")
    diag.rotation_euler[1] = c.degres(-45)
    c.applique(diag)
    morceaux.append(diag)
    morceaux.append(c.boite(P + "SCAFFOLD_TOE", (TRAME, TUBE, 0.15), (0, ye, 0), mat="MAT_WOOD"))
    morceaux.insert(0, c.boite(P + "SCAFFOLD", (TRAME, ECHAFAUDAGE - 2 * TUBE, TUBE), (0, (yi + ye) / 2, ETAGE - TUBE), mat="MAT_WOOD"))
    _piece(c, "SCAFFOLD", morceaux)

    # --- fondations : origine sur le dessus (sous-face de la dalle du rez), comme dans un batiment
    _piece(c, "FOOTING", [c.boite(P + "FOOTING", (SEMELLE, SEMELLE, 0.50), (0, 0, -0.50), mat="MAT_CONCRETE",
                                  chanfrein=C2, segments=2)])
    _piece(c, "FOUNDATION_STRIP", [c.boite(P + "FOUNDATION_STRIP", (TRAME - SEMELLE, 0.60, 0.40), (0, 0, -0.40),
                                           mat="MAT_CONCRETE", chanfrein=C2, segments=2)])
    # attentes : les fers qui sortent de la semelle avant le poteau (etat foundations, haut d'une structure en cours)
    _piece(c, "COLUMN_STARTER", [c.boite(P + "COLUMN_STARTER" + ("" if k == 0 else "_" + str(k)), (FER, FER, 0.80),
                                         (sx * 0.09, sy * 0.09, 0), mat="MAT_STEEL")
                                 for k, (sx, sy) in enumerate([(-1, -1), (1, -1), (1, 1), (-1, 1)])])

    # --- poutre : sous la dalle, entre deux poteaux, centree sur l'axe (travee ouverte, halle)
    _piece(c, "BEAM", [c.boite(P + "BEAM", (LONG_MUR, POTEAU, 0.45), (0, 0, SOUS_DALLE - 0.45), mat="MAT_CONCRETE",
                               chanfrein=C2, segments=2)])

    # --- toit plat fini : acrotere sur la rive (bouts droits, continu d'une travee a l'autre)
    _piece(c, "ROOF_PARAPET", [c.boite(P + "ROOF_PARAPET", (TRAME, RIVE, ACROTERE), (0, -RIVE / 2, 0), mat="MAT_CONCRETE",
                                       chanfrein=C2, segments=2, droites=("x-", "x+"))])
    _piece(c, "ROOF_PARAPET_CORNER", [c.boite(P + "ROOF_PARAPET_CORNER", (RIVE, RIVE, ACROTERE), (-RIVE / 2, -RIVE / 2, 0),
                                              mat="MAT_CONCRETE", chanfrein=C2, segments=2, droites=("x+", "y+"))])

    # --- toit a deux pans (maison, deux trames de profondeur) : un pan par travee, faitage sur l'origine, pente de
    # 30 degres, debord de 0,40 m ; la sous-face passe sur l'axe de facade a la hauteur du dessus de la dalle
    a = math.radians(PENTE)
    longueur = (TRAME + DEBORD) / math.cos(a)
    pan = c.boite(P + "ROOF_SLOPE", (TRAME, longueur, COUVERTURE), (0, 0, -COUVERTURE / 2), mat="MAT_PAINTED_METAL_GRAPHITE",
                  chanfrein=C2, segments=2, droites=("x-", "x+", "y+"))
    pan.rotation_euler[0] = a
    c.applique(pan)
    faite = TRAME * math.tan(a) + COUVERTURE / math.cos(a)  # dessus du faitage, au-dessus du dessus de dalle
    pan.location = (0, -(longueur / 2 * math.cos(a) - COUVERTURE / 2 * math.sin(a)),
                    faite - (longueur / 2 * math.sin(a) + COUVERTURE / 2 * math.cos(a)))
    _piece(c, "ROOF_SLOPE", [pan])
    pignon = c.prisme(P + "ROOF_GABLE", [(-TRAME, 0), (TRAME, 0), (0, TRAME * math.tan(a))], MUR, mat="MAT_SURFACE")
    c.chanfreine(pignon, C2, 2)
    _piece(c, "ROOF_GABLE", [pignon])

    # --- escalier a deux volees dans une case, de dalle a dalle : volee 1 de l'arriere vers le palier avant,
    # volee 2 du palier vers l'arriere, arrivee sur la case de derriere. Garde-corps de tremie a gauche et a l'arriere
    # gauche, poses sur les dalles voisines ; les cotes avant et droit sont une facade ou recoivent un GUARDRAIL.
    marche = ETAGE / 18
    giron = 0.218
    palier = -0.46  # bord du palier, en y local
    profil = [(0, 0)]
    for k in range(9):
        profil += [(k * giron, (k + 1) * marche), ((k + 1) * giron, (k + 1) * marche)]
    profil += [(9 * giron, 9 * marche - 0.25), (0.6, 0)]
    morceaux = []
    for k, (rot, x0, y0, z0) in enumerate([(-90, -CAGE, palier + 8 * giron, 0), (90, CAGE, palier, ETAGE / 2)]):
        v = c.prisme(P + "STAIR" + ("" if k == 0 else "_FLIGHT"), profil, VOLEE, mat="MAT_CONCRETE")
        c.chanfreine(v, C1, 2)
        v.rotation_euler[2] = math.radians(rot)
        c.applique(v)
        v.location = (x0, y0, z0)
        morceaux.append(v)
    morceaux.append(c.boite(P + "STAIR_LANDING", (2 * CAGE, palier + CAGE, 0.20), (0, (palier - CAGE) / 2, ETAGE / 2 - 0.20),
                            mat="MAT_CONCRETE", chanfrein=C1, segments=2))
    bord = TRAME / 2 + 0.05  # sur la dalle voisine, contre les poteaux
    for nom, taille, (x, y, z), mat in [
        ("RAIL_L", (TUBE, LONG_MUR, TUBE), (-bord, 0, GARDE_CORPS - TUBE), "MAT_STEEL"),
        ("MID_L", (TUBE, LONG_MUR, TUBE), (-bord, 0, GARDE_CORPS / 2 - TUBE / 2), "MAT_STEEL"),
        ("POST_L", (TUBE, TUBE, GARDE_CORPS), (-bord, 0, 0), "MAT_STEEL"),
        ("TOE_L", (TUBE, LONG_MUR, 0.15), (-bord, 0, 0), "MAT_WOOD"),
        ("RAIL_B", (TRAME / 2, TUBE, TUBE), (-TRAME / 4 + 0.05, bord, GARDE_CORPS - TUBE), "MAT_STEEL"),
        ("MID_B", (TRAME / 2, TUBE, TUBE), (-TRAME / 4 + 0.05, bord, GARDE_CORPS / 2 - TUBE / 2), "MAT_STEEL"),
        ("POST_B", (TUBE, TUBE, GARDE_CORPS), (0.05, bord, 0), "MAT_STEEL"),
        ("TOE_B", (TRAME / 2, TUBE, 0.15), (-TRAME / 4 + 0.05, bord, 0), "MAT_WOOD"),
    ]:
        morceaux.append(c.boite(P + "STAIR_" + nom, taille, (x, y, ETAGE + z), mat=mat))
    _piece(c, "STAIR", morceaux)

    # --- perron : deux marches de 0,15 m devant la rive du rez (dalle de 0,30 m posee sur le socle)
    perron = c.prisme(P + "STEPS", [(0, 0), (0, DALLE), (0.30, DALLE), (0.30, DALLE / 2), (0.60, DALLE / 2), (0.60, 0)],
                      1.60, mat="MAT_CONCRETE")
    c.chanfreine(perron, C1, 2, droites=("x-",))
    perron.rotation_euler[2] = math.radians(-90)
    c.applique(perron)
    perron.location = (-0.80, -RIVE, 0)
    _piece(c, "STEPS", [perron])

    # --- entree : marquise au-dessus de la porte ; totem d'enseigne sans texte (l'etiquette est en HTML, sur une ancre)
    _piece(c, "CANOPY", [c.boite(P + "CANOPY", (1.60, 1.00, 0.20), (0, -0.50, PORTE[1] + 0.10), mat="MAT_PAINTED_METAL_GRAPHITE",
                                 chanfrein=C2, segments=2)])
    _piece(c, "SIGN_TOTEM", [
        c.boite(P + "SIGN_TOTEM", (1.20, 0.15, 1.60), (0, 0, 0.15), mat="MAT_PAINTED_METAL_GRAPHITE", chanfrein=C1, segments=2),
        c.boite(P + "SIGN_TOTEM_FOOT", (1.00, 0.40, 0.15), (0, 0, 0), mat="MAT_CONCRETE", chanfrein=C1, segments=2),
        c.boite(P + "SIGN_TOTEM_FIELD", (1.00, 0.03, 1.10), (0, -0.075 - 0.015, 0.45), mat="MAT_SURFACE"),
    ])

    return {"triangles_vises": 8000, "animations": []}


def demonstration():
    """La demonstration du kit : trois stands, chacun sur son socle. Coordonnees en metres, Blender (Z vertical,
    avant vers -Y).
    - L'immeuble (2 x 2 trames, deux etages) : rez fini (crepi, porte avec perron et marquise, fenetres, totem) ;
      etage en construction (corail, baie brute, travee ouverte sous poutre, garde-corps de rive) ; escalier dans
      la case avant droite, tremie a l'etage ; toit plat a acrotere et garde-corps ; echafaudage sur la facade droite.
    - La maison (2 x 2 trames, un niveau) : finie, toit a deux pans et pignons.
    - Les fondations (2 x 1 trames) : semelles, longrines et attentes, avant le rez."""
    pieces = []

    def pose(piece, x, y, z, rotation=0):
        pieces.append({"piece": P + piece, "position": [round(x, 3), round(y, 3), round(z, 3)], "rotation": rotation % 360})

    class Plan:
        """La trame d'un batiment de nx x ny travees centre sur (ox, oy) : axes, cases, facades et angles."""

        def __init__(self, ox, oy, nx, ny):
            self.ox, self.oy, self.nx, self.ny = ox, oy, nx, ny
            self.ax = [ox + (i - nx / 2) * TRAME for i in range(nx + 1)]
            self.ay = [oy + (j - ny / 2) * TRAME for j in range(ny + 1)]
            self.cx = [x + TRAME / 2 for x in self.ax[:-1]]
            self.cy = [y + TRAME / 2 for y in self.ay[:-1]]

        def facade(self, face):
            """(rotation, [points des travees dans l'ordre du x local de la piece])."""
            x0, x1, y0, y1 = self.ax[0], self.ax[-1], self.ay[0], self.ay[-1]
            return {"avant": (0, [(x, y0) for x in self.cx]),
                    "droite": (90, [(x1, y) for y in self.cy]),
                    "arriere": (180, [(x, y1) for x in reversed(self.cx)]),
                    "gauche": (270, [(x0, y) for y in reversed(self.cy)])}[face]

        def angles(self):
            x0, x1, y0, y1 = self.ax[0], self.ax[-1], self.ay[0], self.ay[-1]
            return [((x0, y0), 0), ((x1, y0), 90), ((x1, y1), 180), ((x0, y1), 270)]

        def dalle(self, z_bas, sauf=()):
            for x in self.cx:
                for y in self.cy:
                    if (x, y) not in sauf:
                        pose("SLAB", x, y, z_bas)
            for face in FACES:
                rot, points = self.facade(face)
                for x, y in points:
                    pose("SLAB_EDGE", x, y, z_bas, rot)
            for (x, y), rot in self.angles():
                pose("SLAB_CORNER", x, y, z_bas, rot)

        def poteaux(self, z):
            for x in self.ax:
                for y in self.ay:
                    pose("COLUMN", x, y, z)

        def murs(self, z, types):
            for face, liste in types.items():
                rot, points = self.facade(face)
                for (x, y), t in zip(points, liste):
                    for piece in ([t] if isinstance(t, str) else t):
                        pose(piece, x, y, z, rot)

        def rive(self, piece, z):
            for face in FACES:
                rot, points = self.facade(face)
                for x, y in points:
                    pose(piece, x, y, z, rot)

    FACES = ("avant", "droite", "arriere", "gauche")
    socles = []

    # --- l'immeuble
    b = Plan(0.0, 0.0, 2, 2)
    escalier = (b.cx[1], b.cy[0])  # case avant droite
    z0, z1, toit = DALLE, ETAGE + DALLE, 2 * ETAGE + DALLE
    b.dalle(0)
    b.poteaux(z0)
    b.murs(z0, {"avant": (["WALL_RENDER_DOOR", "CANOPY"], "WALL_RENDER"), "droite": ("WALL_RENDER_WINDOW", "WALL_RENDER"),
                "arriere": ("WALL_RENDER", "WALL_RENDER"), "gauche": ("WALL_RENDER", "WALL_RENDER_WINDOW")})
    pose("STEPS", *b.facade("avant")[1][0], 0)
    pose("STAIR", *escalier, z0)
    b.dalle(z1 - DALLE, sauf=(escalier,))
    b.poteaux(z1)
    b.murs(z1, {"avant": ("WALL_BRICK_WINDOW", ["GUARDRAIL", "BEAM"]), "droite": ("WALL_BRICK", "WALL_BRICK"),
                "arriere": ("WALL_BRICK", "WALL_BRICK"), "gauche": ("WALL_BRICK", "WALL_BRICK_WINDOW")})
    b.dalle(toit - DALLE)
    b.rive("ROOF_PARAPET", toit)
    for (x, y), rot in b.angles():
        pose("ROOF_PARAPET_CORNER", x, y, toit, rot)
    b.rive("GUARDRAIL", toit + ACROTERE)  # l'acrotere est bas : garde-corps pose dessus pendant les travaux
    rot, points = b.facade("droite")
    x, y = points[0]
    for k in (0, 1):
        pose("SCAFFOLD", x, y, k * ETAGE, rot)
    decal = JEU_FACADE + ECHAFAUDAGE - TUBE / 2 - RIVE / 2  # du garde-corps de rive au bord exterieur du plancher
    pose("GUARDRAIL", x + decal, y, 2 * ETAGE, rot)
    pose("SIGN_TOTEM", -3.8, -4.3, 0)
    socles.append({"taille": [11.0, 10.0, 0.60], "centre": [0.5, 0.0]})

    # --- la maison : faitage le long de X, pignons sur les facades droite et gauche
    m = Plan(12.0, 1.0, 2, 2)
    m.dalle(0)
    m.poteaux(z0)
    m.murs(z0, {"avant": (["WALL_RENDER_DOOR", "CANOPY"], "WALL_RENDER_WINDOW"),
                "droite": ("WALL_RENDER_WINDOW", "WALL_RENDER_WINDOW"),
                "arriere": ("WALL_RENDER", "WALL_RENDER_WINDOW"), "gauche": ("WALL_RENDER_WINDOW", "WALL_RENDER")})
    pose("STEPS", *m.facade("avant")[1][0], 0)
    m.dalle(z1 - DALLE)
    for x in m.cx:
        pose("ROOF_SLOPE", x, m.oy, z1, 0)
        pose("ROOF_SLOPE", x, m.oy, z1, 180)
    pose("ROOF_GABLE", m.ax[-1], m.oy, z1, 90)
    pose("ROOF_GABLE", m.ax[0], m.oy, z1, 270)
    socles.append({"taille": [10.0, 10.0, 0.60], "centre": [12.0, 1.0]})

    # --- les fondations, hors sol pour etre vues : le dessus des semelles a 0,50 m
    f = Plan(-1.0, -10.5, 2, 1)
    haut = 0.50
    for x in f.ax:
        for y in f.ay:
            pose("FOOTING", x, y, haut)
            pose("COLUMN_STARTER", x, y, haut)
    for y in f.ay:
        for x in f.cx:
            pose("FOUNDATION_STRIP", x, y, haut)
    for x in f.ax:
        for y in f.cy:
            pose("FOUNDATION_STRIP", x, y, haut, 90)
    socles.append({"taille": [9.0, 6.0, 0.60], "centre": [-1.0, -10.5]})

    for s in socles:
        s.update({"materiau": "MAT_EARTH", "chanfrein": C3})
    return {"prefixe": P, "socles": socles, "pieces": pieces}
