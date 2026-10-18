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

    return {"triangles_vises": 5000, "animations": []}


def demonstration():
    """Le batiment de demonstration : 2 x 2 trames, deux etages, toit-dalle, echafaudage sur la facade +X.
    Rez fini (crepi, porte, fenetres) ; etage en construction (corail, une baie brute, une travee ouverte
    protegee par un garde-corps de rive). Coordonnees en metres, Blender (Z vertical, avant vers -Y)."""
    pieces = []

    def pose(piece, x, y, z, rotation=0):
        pieces.append({"piece": P + piece, "position": [round(x, 3), round(y, 3), round(z, 3)], "rotation": rotation})

    axes = (-TRAME, 0.0, TRAME)
    milieux = (-TRAME / 2, TRAME / 2)
    # une facade : (rotation, point de l'axe pour une travee au milieu m)
    facades = {
        "avant": (0, lambda m: (m, -TRAME)),
        "droite": (90, lambda m: (TRAME, m)),
        "arriere": (180, lambda m: (-m, TRAME)),
        "gauche": (270, lambda m: (-TRAME, -m)),
    }
    coins = [((-TRAME, -TRAME), 0), ((TRAME, -TRAME), 90), ((TRAME, TRAME), 180), ((-TRAME, TRAME), 270)]

    def dalle(z_bas):
        for x in milieux:
            for y in milieux:
                pose("SLAB", x, y, z_bas)
        for rot, point in facades.values():
            for m in milieux:
                pose("SLAB_EDGE", *point(m), z_bas, rot)
        for (x, y), rot in coins:
            pose("SLAB_CORNER", x, y, z_bas, rot)

    murs = {
        0: {"avant": ("WALL_RENDER_DOOR", "WALL_RENDER_WINDOW"), "droite": ("WALL_RENDER_WINDOW", "WALL_RENDER"),
            "arriere": ("WALL_RENDER", "WALL_RENDER"), "gauche": ("WALL_RENDER", "WALL_RENDER_WINDOW")},
        1: {"avant": ("WALL_BRICK_WINDOW", None), "droite": ("WALL_BRICK", "WALL_BRICK"),
            "arriere": ("WALL_BRICK", "WALL_BRICK"), "gauche": ("WALL_BRICK", "WALL_BRICK_WINDOW")},
    }
    for etage in (0, 1):
        z = etage * ETAGE + DALLE
        dalle(z - DALLE)
        for x in axes:
            for y in axes:
                pose("COLUMN", x, y, z)
        for face, types in murs[etage].items():
            rot, point = facades[face]
            for m, t in zip(milieux, types):
                if t:
                    pose(t, *point(m), z, rot)
                else:  # travee ouverte : garde-corps sur la rive
                    pose("GUARDRAIL", *point(m), z, rot)
    toit = 2 * ETAGE + DALLE
    dalle(toit - DALLE)
    for rot, point in facades.values():
        for m in milieux:
            pose("GUARDRAIL", *point(m), toit, rot)

    # echafaudage : travee avant de la facade droite, du socle au toit ; garde-corps sur le plancher du haut
    rot, point = facades["droite"]
    x, y = point(milieux[0])
    for k in (0, 1):
        pose("SCAFFOLD", x, y, k * ETAGE, rot)
    decal = JEU_FACADE + ECHAFAUDAGE - TUBE / 2 - RIVE / 2  # du garde-corps de rive au bord exterieur du plancher
    pose("GUARDRAIL", x + decal, y, 2 * ETAGE, rot)

    return {"prefixe": P,
            "socle": {"taille": [11.0, 10.0, 0.60], "centre": [0.5, 0.0], "materiau": "MAT_EARTH", "chanfrein": C3},
            "pieces": pieces}
