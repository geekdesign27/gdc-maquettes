"""Le kit de la nature (catalogue : nature-kit, lot G9) : la verdure de la ville fictive (docs/ville-autour.md).
Brief ENV_NATURE_KIT_A_v001 valide par Pierre-Alain le 24 octobre 2026.

Vue a environ 8 px/m (cadrage par defaut) et 2,5 px/m (dezoom) : detail minimal 0,15 m (bible 18.3), 0,30 m vise en haute ; en basse, plus rien sous 0,30 m.
Trois silhouettes qui se separent a 2 px/m et en niveaux de gris : le feuillu (boule claire sur un tronc), le sapin
(deux cones fonces empiles), la haie de thuyas (un bloc fonce, droit et bas). Rien ne bouge : ni animation, ni pivot,
ni ancre.

Chaque piece est un noeud ENV_NATURE_KIT_A_<PIECE>, posee a l'origine, au sol (z = 0), l'avant vers -Y :
- TREE : le feuillu de 5 m : couronne en boule facettee de 3,2 m (MAT_LANDSCAPE) sur un tronc (MAT_WOOD) ;
  l'assemblage l'agrandit jusqu'a 8 m (echelle uniforme 1,6) ;
- FIR : le sapin de 7 m, deux cones empiles (MAT_FOLIAGE_DARK) sur un court tronc ;
- HEDGE : la haie de thuyas, un bloc de 4 m (le long de X) x 0,90 m x 1,20 m, aretes du dessus arrondies (chanfrein
  C3 de 0,10 m) ; l'assemblage l'etire en X (echelle [longueur / 4, 1, 1]) ;
- BUSH : le buisson, une boule aplatie de 0,90 m ;
- BENCH : le banc de parc, assise et dossier en bois (MAT_WOOD) sur deux pieds en beton (MAT_CONCRETE), l'assise
  tournee vers -Y ;
- FOUNTAIN : la fontaine de village, bassin rectangulaire de 3 x 1,60 m en beton (chanfrein C2), eau en verre opaque
  (MAT_GLASS, decision de Pierre-Alain : l'eau ne coule pas), borne de 1,40 m au bout -X, son bec tourne vers +X.
Les faces que la camera iso ne voit jamais (dessous pose au sol, bout de tronc cache dans la couronne) sont omises.
Qualite basse (bible 18.3) : TREE_LOW, FIR_LOW, HEDGE_LOW (sans chanfrein), FOUNTAIN_LOW (sans chanfrein ni bec) ;
ni buisson, ni banc (marques basse: false dans le plan) : en basse, plus rien sous 0,30 m.
"""

import math

import bpy

ASSET = {"id": "nature-kit", "categorie": "kit", "nom": "ENV_NATURE_KIT_A_v001"}

P = "ENV_NATURE_KIT_A_"
C2, C3 = 0.05, 0.10

# le feuillu de 5 m
COURONNE = 3.2  # diametre de la boule
HAUT_ARBRE = 5.0
TRONC_ARBRE = (0.36, 0.60)  # diametre du tronc en haute et en basse (detail minimal 0,30 / 0,60 m)
# le sapin de 7 m : (rayon de la base, z de la base, z de la pointe) des deux cones
CONE_BAS = (1.60, 0.80, 4.70)
CONE_HAUT = (1.15, 3.20, 7.00)
TRONC_SAPIN = (0.40, 0.60)
# la haie : longueur (X), epaisseur (Y), hauteur
HAIE = (4.0, 0.90, 1.20)
# le buisson : (rayon, hauteur) des anneaux, du pied au sommet ; 0,90 m de diametre
BUISSON = [(0.38, 0.0), (0.45, 0.20), (0.32, 0.46), (0.0, 0.60)]
MAT_BUISSON = "MAT_FOLIAGE_DARK"
# la fontaine
BASSIN = (3.0, 1.60, 0.70)
PAROI = 0.30  # epaisseur des parois du bassin (detail minimal)
EAU = 0.58  # dessus de l'eau
BORNE = (0.40, 1.40)  # section carree et hauteur
BEC = (0.50, 0.15, 1.00)  # longueur (vers +X), section (0,15 m : le detail minimal, 18.3), hauteur de l'axe


# --- maillages ------------------------------------------------------------------------------------------------------

def _maillage(c, nom, sommets, faces, mat):
    """Un objet a partir de ses sommets et de ses faces, deja orientees vers l'exterieur."""
    m = bpy.data.meshes.new(nom)
    m.from_pydata([tuple(s) for s in sommets], [], faces)
    m.update()
    o = bpy.data.objects.new(nom, m)
    bpy.context.scene.collection.objects.link(o)
    o.data.materials.append(c.materiau(mat))
    return o


def _anneaux(c, nom, profil, cotes, mat, decalage=0.0, sommet=True):
    """Un solide de revolution a facettes : profil = [(rayon, z), ...] du pied au sommet ; un rayon nul ferme en
    pointe. Ouvert par-dessous (pose au sol, ou cache dans le volume qu'il surmonte). decalage : rotation des
    facettes, en fraction de cote."""
    sommets, rangs = [], []
    for r, z in profil:
        if r == 0:
            rangs.append([len(sommets)])
            sommets.append((0.0, 0.0, z))
            continue
        rang = []
        for k in range(cotes):
            a = 2 * math.pi * (k + decalage) / cotes
            rang.append(len(sommets))
            sommets.append((r * math.cos(a), r * math.sin(a), z))
        rangs.append(rang)
    faces = []
    for bas, haut in zip(rangs, rangs[1:]):
        if len(haut) == 1:
            faces += [[bas[k], bas[(k + 1) % cotes], haut[0]] for k in range(cotes)]
        else:
            faces += [[bas[k], bas[(k + 1) % cotes], haut[(k + 1) % cotes], haut[k]] for k in range(cotes)]
    if sommet and len(rangs[-1]) > 1:
        faces.append(rangs[-1][:])
    return _maillage(c, nom, sommets, faces, mat)


def _fut(c, nom, diametre, z0, z1, cotes, mat):
    """Un tronc a facettes, ouvert aux deux bouts (le pied est au sol, la tete entre dans le feuillage)."""
    return _anneaux(c, nom, [(diametre / 2, z0), (diametre / 2, z1)], cotes, mat, decalage=0.5, sommet=False)


def _boule(c, nom, diametre, centre, subdivisions, mat, aplati=1.0):
    """Une boule a facettes, aplatie en hauteur par aplati : subdivisions = 1 donne l'icosaedre (20 triangles), 2 le
    double (80 triangles)."""
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=diametre / 2, location=centre)
    o = bpy.context.active_object
    o.name = o.data.name = nom
    o.scale = (1, 1, aplati)
    c.applique(o, rotation=False)
    o.data.materials.append(c.materiau(mat))
    return o


def _pave(c, nom, taille, position, mat, faces_omises=("z-",)):
    """Un pave sans chanfrein (position = centre de la face inferieure, comme boite), sans les faces omises."""
    lx, ly, lz = taille
    x0, y0, z0 = position
    s = [(x0 + sx * lx / 2, y0 + sy * ly / 2, z0 + sz * lz) for sz in (0, 1) for sy in (-1, 1) for sx in (-1, 1)]
    toutes = {"z-": [0, 2, 3, 1], "z+": [4, 5, 7, 6], "y-": [0, 1, 5, 4], "y+": [2, 6, 7, 3],
              "x-": [0, 4, 6, 2], "x+": [1, 3, 7, 5]}
    return _maillage(c, nom, s, [f for k, f in toutes.items() if k not in faces_omises], mat)


def _sans_fond(o, z=0.0):
    """Retire les faces tournees vers le bas posees a la hauteur z (le dessous pose au sol)."""
    import bmesh
    b = bmesh.new()
    b.from_mesh(o.data)
    b.normal_update()
    dessous = [f for f in b.faces if f.normal.z < -0.99 and all(abs(v.co.z - z) < 1e-4 for v in f.verts)]
    bmesh.ops.delete(b, geom=dessous, context="FACES")
    b.to_mesh(o.data)
    b.free()
    o.data.update()
    return o


def _piece(c, nom, objets, lisser=True):
    """Fusionne les morceaux d'une piece et pose son origine au point d'assemblage (0, 0, 0)."""
    o = c.fusionne(P + nom, objets) if len(objets) > 1 else objets[0]
    o.name = o.data.name = P + nom
    c.origine(o, (0, 0, 0))
    if lisser:
        c.lisse(o)
    return o


# --- les pieces -------------------------------------------------------------------------------------------------------

def _feuillu(c):
    r = COURONNE / 2
    centre = HAUT_ARBRE - r * 0.92  # la boule, aplatie de 8 %, touche 5 m
    couronne = _boule(c, P + "TREE_CROWN", COURONNE, (0, 0, centre), 2, "MAT_LANDSCAPE", aplati=0.92)
    tronc = _fut(c, P + "TREE_TRUNK", TRONC_ARBRE[0], 0.0, centre, 6, "MAT_WOOD")
    _piece(c, "TREE", [couronne, tronc], lisser=False)  # facettes franches : la boule se lit par ses plans
    # basse : un icosaedre un peu plus gros (ses sommets sont sur la sphere : il parait plus petit), sa pointe a 5 m,
    # et un tronc de 0,60 m
    centre_bas = HAUT_ARBRE - r * 1.08 * 0.92
    couronne = _boule(c, P + "TREE_LOW_CROWN", COURONNE * 1.08, (0, 0, centre_bas), 1, "MAT_LANDSCAPE", aplati=0.92)
    tronc = _fut(c, P + "TREE_LOW_TRUNK", TRONC_ARBRE[1], 0.0, centre_bas, 4, "MAT_WOOD")
    _piece(c, "TREE_LOW", [couronne, tronc], lisser=False)


def _sapin(c):
    def cones(nom, cotes, tronc, cotes_tronc):
        morceaux = []
        for k, (r, z0, z1) in enumerate((CONE_BAS, CONE_HAUT)):
            # le cone du haut tourne d'une demi-facette : ses aretes tombent entre celles du bas
            morceaux.append(_anneaux(c, P + nom + "_CONE_%d" % k, [(r, z0), (0, z1)], cotes, "MAT_FOLIAGE_DARK",
                                     decalage=0.5 * k))
        morceaux.append(_fut(c, P + nom + "_TRUNK", tronc, 0.0, CONE_BAS[1] + 0.4, cotes_tronc, "MAT_WOOD"))
        return morceaux

    # haute : des cones a 12 facettes, fermes dessous (un cone vu de cote ne montre pas son vide) ; basse : 6, ouverts
    haute = cones("FIR", 12, TRONC_SAPIN[0], 6)
    for o in haute[:2]:
        _ferme_dessous(o)
    _piece(c, "FIR", haute, lisser=False)
    _piece(c, "FIR_LOW", cones("FIR_LOW", 6, TRONC_SAPIN[1], 4), lisser=False)


def _ferme_dessous(o):
    """Ajoute le fond d'un cone ouvert : un polygone sur le premier anneau, tourne vers le bas."""
    import bmesh
    b = bmesh.new()
    b.from_mesh(o.data)
    z0 = min(v.co.z for v in b.verts)
    bord = sorted((v for v in b.verts if abs(v.co.z - z0) < 1e-6), key=lambda v: math.atan2(v.co.y, v.co.x))
    b.faces.new(list(reversed(bord)))
    b.to_mesh(o.data)
    b.free()
    o.data.update()


def _haie(c):
    l, e, h = HAIE
    # le profil de l'arete du haut, arrondi en deux segments : (retrait vers l'interieur, hauteur)
    k = 1 - math.cos(math.radians(45))
    profil = [(0.0, 0.0), (0.0, h - C3), (k * C3, h - C3 + math.sin(math.radians(45)) * C3), (C3, h)]
    sommets, rangs = [], []
    for retrait, z in profil:
        x, y = l / 2 - retrait, e / 2 - retrait
        rangs.append([len(sommets) + i for i in range(4)])
        sommets += [(-x, -y, z), (x, -y, z), (x, y, z), (-x, y, z)]
    faces = []
    for bas, haut in zip(rangs, rangs[1:]):
        faces += [[bas[i], bas[(i + 1) % 4], haut[(i + 1) % 4], haut[i]] for i in range(4)]
    faces.append(rangs[-1][:])
    haie = _maillage(c, P + "HEDGE", sommets, faces, "MAT_FOLIAGE_DARK")
    _piece(c, "HEDGE", [haie])
    _piece(c, "HEDGE_LOW", [_pave(c, P + "HEDGE_LOW", HAIE, (0, 0, 0), "MAT_FOLIAGE_DARK")], lisser=False)


def _buisson(c):
    _piece(c, "BUSH", [_anneaux(c, P + "BUSH", BUISSON, 8, MAT_BUISSON)], lisser=False)


def _banc(c):
    long_, prof, assise = 1.80, 0.45, 0.45
    planche = 0.08
    morceaux = [
        _pave(c, P + "BENCH_SEAT", (long_, prof, planche), (0, 0, assise - planche), "MAT_WOOD"),
        # le dossier, sur l'arriere de l'assise (+Y) : le dessous cache dans l'assise
        _pave(c, P + "BENCH_BACK", (long_, planche, 0.40), (0, prof / 2 - planche / 2, assise), "MAT_WOOD"),
    ]
    for k, x in enumerate((-0.65, 0.65)):
        # les pieds en beton : 0,25 m de large, sous toute la profondeur de l'assise
        morceaux.append(_pave(c, P + "BENCH_LEG_%d" % k, (0.25, prof + 0.05, assise - planche), (x, 0, 0),
                              "MAT_CONCRETE", faces_omises=("z-", "z+")))
    _piece(c, "BENCH", morceaux, lisser=False)


def _fontaine(c):
    lb, pb, hb = BASSIN
    interieur = (lb - 2 * PAROI, pb - 2 * PAROI)
    section, hauteur = BORNE
    x_borne = -lb / 2 + section / 2  # la face -X de la borne affleure le bout du bassin
    l_bec, s_bec, z_bec = BEC

    def eau(nom):
        # 2 cm de plus que le creux de chaque cote : les bords de l'eau entrent dans les parois
        x, y = interieur[0] / 2 + 0.02, interieur[1] / 2 + 0.02
        return _maillage(c, nom, [(-x, -y, EAU), (x, -y, EAU), (x, y, EAU), (-x, y, EAU)], [[0, 1, 2, 3]], "MAT_GLASS")

    # haute : le bassin chanfreine en C2 arrondi (aretes du pied vives : elles sont au sol), perce de part en part (le
    # fond, sous l'eau, ne se voit pas) ; la borne en C2 d'un seul segment (a 8 px/m, l'arrondi d'une section de 0,40 m
    # ne se voit pas, et il couterait 40 triangles) ; le bec carre
    bassin = c.boite(P + "FOUNTAIN_BASIN", BASSIN, mat="MAT_CONCRETE")
    c.perce(bassin, (interieur[0], interieur[1], hb + 0.2), (0, 0, -0.1))
    c.chanfreine(bassin, C2, 2, droites=("z-",))
    _sans_fond(bassin)
    borne = c.boite(P + "FOUNTAIN_POST", (section, section, hauteur), (x_borne, 0, 0), mat="MAT_CONCRETE")
    c.chanfreine(borne, C2, 1, droites=("z-",))
    _sans_fond(borne)
    bec = _pave(c, P + "FOUNTAIN_SPOUT", (l_bec, s_bec, s_bec), (x_borne + section / 2 + l_bec / 2 - 0.05, 0,
                                                                     z_bec - s_bec / 2), "MAT_CONCRETE",
                faces_omises=("x-",))
    _piece(c, "FOUNTAIN", [bassin, borne, bec, eau(P + "FOUNTAIN_WATER")])

    # basse : le meme bassin sans chanfrein, sa borne, sans bec (0,15 m : sous les 0,30 m de la qualite basse)
    bassin = c.boite(P + "FOUNTAIN_LOW_BASIN", BASSIN, mat="MAT_CONCRETE")
    c.perce(bassin, (interieur[0], interieur[1], hb + 0.2), (0, 0, -0.1))
    _sans_fond(bassin)
    borne = _pave(c, P + "FOUNTAIN_LOW_POST", (section, section, hauteur), (x_borne, 0, 0), "MAT_CONCRETE")
    _piece(c, "FOUNTAIN_LOW", [bassin, borne, eau(P + "FOUNTAIN_LOW_WATER")], lisser=False)


def construit(c):
    _feuillu(c)
    _sapin(c)
    _haie(c)
    _buisson(c)
    _banc(c)
    _fontaine(c)
    return {"triangles_vises": 740, "animations": []}


# --- la demonstration -------------------------------------------------------------------------------------------------

def demonstration():
    """Un petit parc de 40 x 40 m sur un socle en herbe (Blender : Z vertical ; la camera iso regarde depuis +X -Y) :
    la fontaine au centre et ses deux bancs ; un jardin clos d'une haie de thuyas, cote camera, avec son entree et ses
    buissons ; les grands feuillus (8 m) et les sapins au fond, les feuillus de 5 m sur les cotes. Les haies sont une
    seule piece HEDGE etiree a la longueur du cote (echelle [longueur / 4, 1, 1]) ; un grand feuillu est TREE a
    l'echelle 1,6. Buissons et bancs sont marques basse: false : l'assemblage ne les pose pas en qualite basse."""
    pieces = []

    def pose(piece, x, y, rotation=0, echelle=None, basse=True):
        p = {"piece": P + piece, "position": [round(x, 3), round(y, 3), 0.0], "rotation": rotation % 360}
        if echelle:
            p["echelle"] = [round(e, 4) for e in echelle]
        if not basse:
            p["basse"] = False
        pieces.append(p)

    def haie(x0, y0, x1, y1):
        """Une haie de (x0, y0) a (x1, y1), le long de X ou de Y : HEDGE etiree a sa longueur."""
        longueur = math.hypot(x1 - x0, y1 - y0)
        rotation = 0 if abs(y1 - y0) < 1e-6 else 90
        pose("HEDGE", (x0 + x1) / 2, (y0 + y1) / 2, rotation, echelle=(longueur / HAIE[0], 1, 1))

    # la fontaine et ses bancs, tournes vers elle
    pose("FOUNTAIN", 0, 0)
    pose("BENCH", -0.8, 2.8, 0, basse=False)  # derriere la fontaine, l'assise vers -Y
    pose("BENCH", -3.8, -0.4, 90, basse=False)  # a gauche, l'assise vers +X, face a la fontaine
    # le jardin clos, 12 x 9 m, cote camera ; une entree de 2,4 m au milieu du cote -X
    gx0, gx1, gy0, gy1 = 4.0, 16.0, -16.0, -7.0
    demi = HAIE[1] / 2
    haie(gx0, gy0 + demi, gx1, gy0 + demi)
    haie(gx0, gy1 - demi, gx1, gy1 - demi)
    haie(gx1 - demi, gy0 + 2 * demi, gx1 - demi, gy1 - 2 * demi)
    milieu = (gy0 + gy1) / 2
    haie(gx0 + demi, gy0 + 2 * demi, gx0 + demi, milieu - 1.2)
    haie(gx0 + demi, milieu + 1.2, gx0 + demi, gy1 - 2 * demi)
    for x, y in ((7.0, -13.5), (8.2, -13.0), (13.0, -9.5), (13.6, -13.8), (10.5, -11.5)):
        pose("BUSH", x, y, basse=False)
    # des buissons autour de la fontaine
    for x, y in ((2.6, 1.9), (3.3, 1.2), (-2.8, -2.4)):
        pose("BUSH", x, y, basse=False)
    # les grands feuillus et les sapins au fond (cote -X +Y, loin de la camera)
    grand = (1.6, 1.6, 1.6)
    pose("TREE", -13.0, 13.0, 0, echelle=grand)
    pose("TREE", -3.0, 15.0, 40, echelle=grand)
    pose("TREE", -15.0, 3.0, 75, echelle=grand)
    pose("FIR", 6.0, 15.5)
    pose("FIR", 10.0, 13.0, 15)
    pose("FIR", 13.5, 16.0, 30)
    pose("FIR", -16.0, -8.0, 10)
    # les feuillus de 5 m
    pose("TREE", 5.0, 7.0, 20)
    pose("TREE", 15.0, 5.0, 55)
    pose("TREE", -8.0, -9.0, 10)
    pose("TREE", -12.0, -15.0, 35)
    pose("TREE", -6.0, 7.5, 60)
    socle = {"taille": [40.0, 40.0, 0.60], "centre": [0.0, 0.0], "materiau": "MAT_LANDSCAPE", "chanfrein": 0.10}
    return {"prefixe": P, "socles": [socle], "pieces": pieces}
