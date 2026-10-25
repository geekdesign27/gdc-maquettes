"""Le kit des immeubles locatifs romands (catalogue : apartment-kit, lot G9) : la ligne d'horizon de la ville fictive
(docs/ville-autour.md). Brief ENV_APARTMENT_KIT_A_v001 valide par Pierre-Alain le 24 octobre 2026.

Vus au fond de la vue et sur les cotes, jamais cote camera, a environ 8 px/m (cadrage par defaut) et 2,5 px/m (dezoom) :
detail minimal 0,15 m (bible 18.3), 0,30 m vise en haute ; en basse, plus rien sous 0,60 m (fiche, qui prime sur le
brief : decision de Pierre-Alain du 24 octobre 2026). On reconnait un immeuble locatif a son bloc de crepi clair, a sa
grille reguliere de fenetres, a ses balcons filants en beton (garde-corps plein, d'un seul tenant avec la dalle, comme
les locatifs romands des annees 60 et 70) et a son toit plat a acrotere ou a quatre pans faibles en tuile. Aucune toile de
tente, ni orange, ni jaune, ni corail ; aucune couleur d'etat. Jamais de rive de dalle ni d'ossature apparente : c'est
ce qui fait le batiment d'application (building), dont l'immeuble ne doit jamais avoir l'air.

Deux plans au sol, une teinte par plan : la barre (BAR, 24 x 12 m, crepi creme MAT_PLASTER, balcons filants sur la
facade avant) et le plot (PLOT, 15 x 15 m, crepi blanc casse MAT_SURFACE, balcons filants en angle sur l'avant et sur
le cote +X). Cotes (bible 18.2) : etage de 3 m ; fenetre de 1,50 x 1,50 m sur allege de 0,90 m, une par trame de 3 m ;
porte de 1,10 x 2,40 m ; balcon de 1,60 m de profondeur : une dalle de 0,30 m et un garde-corps plein de 1,10 m,
epais de 0,20 m, en un seul bac de beton (MAT_CONCRETE), chanfreine en C2. Le graphite ne reste qu'aux menuiseries
(dormants), aux portes et a la couvertine. Murs : aretes verticales arrondies en C2 (0,05 m, deux segments).

Chaque piece est un noeud ENV_APARTMENT_KIT_A_<PLAN>_<PIECE>, avec sa version basse <PLAN>_<PIECE>_LOW, posee a
l'origine (centre de l'emprise des murs, l'avant vers -Y). L'assemblage les empile : le rez a z = 0, l'etage k a
z = 3 k, le toit a z = 3 n pour un immeuble de n niveaux (3 a 6). Un etage et un toit ont leur dessous a z = 0.
- GROUND : le rez habite, avec la porte d'entree et son seuil ;
- GROUND_SHOP : le rez commercial, une vitrine (sans enseigne ni texte), la porte des logements ;
- FLOOR : l'etage courant et ses balcons (empile de 2 a 5 fois) ;
- ROOF_FLAT : le toit plat, acrotere de 0,60 m en crepi, couvertine graphite, toiture en beton ;
- ROOF_HIP : le toit a quatre pans en tuile (MAT_ROOF_TILE), pente de 22 degres, avant-toit de 0,50 m ; du cote des
  balcons, l'avant-toit les couvre et deborde de 0,30 m au-dela de leur nez (revue du 24 octobre 2026). Jusqu'a
  5 niveaux ; au-dela, le toit est plat : 19 m au plus, acrotere compris (fiche).

Les vitres ne sont pas dans les pieces. A chaque fenetre et a la vitrine, un vide
ENV_APARTMENT_KIT_A_<PLAN>_<PIECE>_WIN_<NN> (et <PLAN>_<PIECE>_LOW_WIN_<NN> sous la version basse), enfant de sa piece,
au centre de la vitre, son -Y local tourne vers l'exterieur ; son echelle (x, z) met la vitre a la taille de la baie
(1 pour une fenetre, plus pour la vitrine). La piece ENV_APARTMENT_KIT_A_WINDOW_PANE est cette vitre, comme celle des
villas : un carre de verre (MAT_GLASS) de 1,50 m, une face tournee vers -Y, origine en son centre.

Qualite basse (fiche : plus rien sous 0,60 m) : murs aux aretes vives ; chaque balcon devient un bloc plein de beton
(dalle et garde-corps fondus), de 1,50 m de profondeur sur 1,30 m de haut ; ni dormants, ni seuils ; le toit plat est un
bloc plein de 0,60 m, toiture affleurante (ni acrotere mince, ni couvertine) ; toit a quatre pans sans rive.
"""

import math

import bmesh
import bpy

ASSET = {"id": "apartment-kit", "categorie": "kit", "nom": "ENV_APARTMENT_KIT_A_v001"}

P = "ENV_APARTMENT_KIT_A_"
ETAGE = 3.0
FENETRE = 1.50  # cote de la fenetre, et de la vitre WINDOW_PANE
ALLEGE = 0.90
PORTE = (1.10, 2.40)
VITRINE_Z = (0.60, 2.40)  # bas et haut de la vitrine : allege et linteau de 0,60 m, rien sous 0,60 m en basse (fiche)
DORMANT = 0.15  # le cadre graphite qui depasse de la vitre, de chaque cote (comme les villas)
SAILLIE_DORMANT = 0.01
SAILLIE_VITRE = 0.03
SEUIL = (1.90, 1.20, 0.15)  # le long de la facade, en avant, hauteur
BALCON = 1.60  # profondeur
DALLE = 0.30  # epaisseur de la dalle de balcon
GARDE_CORPS = 1.10  # hauteur, au-dessus de la dalle
EPAISSEUR_GC = 0.20  # le garde-corps plein en beton (le chanfrein C2 ne depasse pas le quart : 0,05 m)
BALCON_BAS = (1.50, 1.30)  # le bloc plein de la qualite basse : profondeur et hauteur
NEZ = 0.30  # debord de l'avant-toit au-dela du nez des balcons du dernier etage
ACROTERE = (0.60, 0.30)  # hauteur et epaisseur
TOITURE = 0.10  # dessus de la toiture du toit plat, au fond de l'acrotere
PENTE = math.tan(math.radians(22))
DEBORD = 0.50  # avant-toit du toit a quatre pans, sur les faces sans balcon
RIVE = 0.20  # epaisseur de la couverture, a l'egout
C1, C2 = 0.02, 0.05

PLANS = {
    "BAR": {"taille": (24.0, 12.0), "mur": "MAT_PLASTER", "balcons": ("y-",)},
    "PLOT": {"taille": (15.0, 15.0), "mur": "MAT_SURFACE", "balcons": ("y-", "x+")},
}

# Les faces d'un volume : (rotation du vide en degres, normale sortante, tangente), comme villa-kit.
FACES = {"y-": (0, (0, -1), (1, 0)), "x+": (90, (1, 0), (0, 1)), "y+": (180, (0, 1), (-1, 0)),
         "x-": (270, (-1, 0), (0, -1))}


# --- la description des facades (donnees pures : demonstration() la relit sans Blender) ------------------------------

def _fenetre(face, a):
    return {"face": face, "a": a, "type": "fenetre", "l": FENETRE, "h": FENETRE, "z": ALLEGE}


def _porte(face, a):
    return {"face": face, "a": a, "type": "porte", "l": PORTE[0], "h": PORTE[1], "z": 0.0}


def _vitrine(face, a, l):
    return {"face": face, "a": a, "type": "fenetre", "l": l, "h": VITRINE_Z[1] - VITRINE_Z[0], "z": VITRINE_Z[0]}


def _trame(plan):
    """Les abscisses des fenetres, une par trame de 3 m, sur chaque face. La barre n'a que deux fenetres par pignon."""
    if plan == "BAR":
        long = [-10.5 + 3 * k for k in range(8)]
        return {"y-": long, "x+": [-3.0, 3.0], "y+": long, "x-": [-3.0, 3.0]}
    cote = [-6.0, -3.0, 0.0, 3.0, 6.0]
    return {f: cote for f in ("y-", "x+", "y+", "x-")}


# l'avant du rez : la porte des logements ; au rez commercial, la vitrine sur deux ou trois trames, et la porte
REZ = {
    # la vitrine (centre, largeur) laisse 0,60 m de crepi a l'angle de la facade (constat du controleur du 24 octobre 2026)
    "BAR": {"porte": -1.5, "vitrine": (-7.15, 8.4), "sous_vitrine": (-10.5, -7.5, -4.5)},
    "PLOT": {"porte": 0.0, "vitrine": (-4.3, 5.0), "sous_vitrine": (-6.0, -3.0)},
}


def _baies(plan, piece):
    """Les ouvertures d'une piece (GROUND, GROUND_SHOP, FLOOR), dans l'ordre de leurs vides."""
    baies = []
    rez = REZ[plan]
    for face, abscisses in _trame(plan).items():
        for a in abscisses:
            if face == "y-" and piece != "FLOOR":
                if a == rez["porte"] or (piece == "GROUND_SHOP" and a in rez["sous_vitrine"]):
                    continue
            baies.append(_fenetre(face, a))
    if piece == "GROUND_SHOP":
        baies.insert(0, _vitrine("y-", *rez["vitrine"]))
    if piece != "FLOOR":
        baies.append(_porte("y-", rez["porte"]))
    return baies


def _sur_facade(plan, o):
    """Le point d'une ouverture au pied de sa facade (x, y), la rotation, la normale et la tangente de sa face."""
    hx, hy = (d / 2 for d in PLANS[plan]["taille"])
    rot, n, t = FACES[o["face"]]
    a = o["a"]
    base = {"y-": (a, -hy), "y+": (a, hy), "x-": (-hx, a), "x+": (hx, a)}[o["face"]]
    return base, rot, n, t


def _vides(plan, piece):
    """Les vides des vitres d'une piece, dans son repere : [(position, rotation, echelle)]."""
    vides = []
    for o in _baies(plan, piece):
        if o["type"] != "fenetre":
            continue
        (bx, by), rot, n, _ = _sur_facade(plan, o)
        position = (bx + n[0] * SAILLIE_VITRE, by + n[1] * SAILLIE_VITRE, o["z"] + o["h"] / 2)
        vides.append((position, rot, (o["l"] / FENETRE, 1.0, o["h"] / FENETRE)))
    return vides


def _emprise_toit(plan):
    """Le rectangle (x0, x1, y0, y1) du toit a quatre pans : 0,50 m d'avant-toit, et du cote des balcons, leur
    profondeur et 0,30 m au-dela de leur nez."""
    hx, hy = (d / 2 for d in PLANS[plan]["taille"])
    d = {f: (BALCON + NEZ if f in PLANS[plan]["balcons"] else DEBORD) for f in ("x-", "x+", "y-", "y+")}
    return (-hx - d["x-"], hx + d["x+"], -hy - d["y-"], hy + d["y+"])


def _hauteur_toit(plan, toit):
    """Le haut d'un toit au-dessus du dernier etage."""
    if toit == "ROOF_FLAT":
        return ACROTERE[0]
    x0, x1, y0, y1 = _emprise_toit(plan)
    return RIVE + min(x1 - x0, y1 - y0) / 2 * PENTE


# --- maillages ------------------------------------------------------------------------------------------------------

def _maillage(c, nom, sommets, faces, mat, recalcule=False):
    """Un objet a partir de ses sommets et de ses faces. recalcule : normales sortantes recalculees (solide ferme)."""
    m = bpy.data.meshes.new(nom)
    m.from_pydata([tuple(s) for s in sommets], [], faces)
    m.update()
    if recalcule:
        b = bmesh.new()
        b.from_mesh(m)
        bmesh.ops.recalc_face_normals(b, faces=b.faces)
        b.to_mesh(m)
        b.free()
    o = bpy.data.objects.new(nom, m)
    bpy.context.scene.collection.objects.link(o)
    o.data.materials.append(c.materiau(mat))
    return o


def _oriente(sommets, face, voulue):
    """La face, retournee si sa normale ne va pas dans le sens voulu."""
    a, b, d = (sommets[i] for i in face[:3])
    u = [b[k] - a[k] for k in range(3)]
    w = [d[k] - a[k] for k in range(3)]
    n = (u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0])
    return face if sum(n[k] * voulue[k] for k in range(3)) >= 0 else face[::-1]


AXES = {"x-": (0, -1), "x+": (0, 1), "y-": (1, -1), "y+": (1, 1), "z-": (2, -1), "z+": (2, 1)}


def _retire(o, cotes):
    """Retire les faces planes d'une boite qui regardent vers les cotes donnes et sont sur son bord : dessous pose,
    dessus cache par la piece du dessus, faces de contact contre un mur ou une autre piece (jamais vues)."""
    b = bmesh.new()
    b.from_mesh(o.data)
    b.normal_update()
    retire = []
    for cote in cotes:
        axe, sens = AXES[cote]
        valeurs = [v.co[axe] for v in b.verts]
        bord = max(valeurs) if sens > 0 else min(valeurs)
        retire += [f for f in b.faces if f.normal[axe] * sens > 0.99 and all(abs(v.co[axe] - bord) < 1e-4 for v in f.verts)]
    bmesh.ops.delete(b, geom=list(set(retire)), context="FACES")
    b.to_mesh(o.data)
    b.free()
    o.data.update()
    return o


def _boite(c, nom, rect, z0, z1, mat, chanfrein=0.0, droites=(), retire=()):
    """Un pave de rect = (x0, x1, y0, y1) entre z0 et z1, chanfreine sauf sur ses faces droites, sans ses faces retire."""
    x0, x1, y0, y1 = rect
    o = c.boite(nom, (x1 - x0, y1 - y0, z1 - z0), ((x0 + x1) / 2, (y0 + y1) / 2, z0), mat=mat,
                chanfrein=chanfrein, segments=2 if chanfrein else 1, droites=tuple(droites))
    return _retire(o, retire)


def _quad_facade(c, nom, base, n, t, l, z0, z1, saillie, mat):
    """Un rectangle vertical sur une facade, tourne vers l'exterieur : l de large, de z0 a z1, a saillie du mur."""
    bx, by = base[0] + n[0] * saillie, base[1] + n[1] * saillie
    s = [(bx + t[0] * dx, by + t[1] * dx, z) for dx, z in ((-l / 2, z0), (l / 2, z0), (l / 2, z1), (-l / 2, z1))]
    return _maillage(c, nom, s, [_oriente(s, [0, 1, 2, 3], (n[0], n[1], 0))], mat)


def _murs(c, nom, plan, basse):
    """Les murs d'un niveau, de z = 0 a 3 m, sans dessus ni dessous : ils se continuent d'un niveau a l'autre."""
    hx, hy = (d / 2 for d in PLANS[plan]["taille"])
    return _boite(c, nom + "_WALLS", (-hx, hx, -hy, hy), 0.0, ETAGE, PLANS[plan]["mur"],
                  chanfrein=0.0 if basse else C2, droites=("z-", "z+"), retire=("z-", "z+"))


def _ouvertures(c, nom, plan, piece, basse):
    """Dormants des fenetres et de la vitrine (haute seulement), porte et son seuil. Les vitres sont les vides."""
    morceaux = []
    for k, o in enumerate(_baies(plan, piece)):
        base, _, n, t = _sur_facade(plan, o)
        z0, z1 = o["z"], o["z"] + o["h"]
        racine = "%s_OPENING_%02d" % (nom, k)
        if o["type"] == "porte":
            morceaux.append(_quad_facade(c, racine, base, n, t, o["l"], z0, z1, SAILLIE_DORMANT,
                                         "MAT_PAINTED_METAL_GRAPHITE"))
            if not basse:
                lx, ly, h = SEUIL
                seuil = c.boite(racine + "_STEP", (lx, ly, h), (base[0] + n[0] * ly / 2, base[1] + n[1] * ly / 2, 0),
                                mat="MAT_CONCRETE", chanfrein=C1, segments=2, droites=("z-",))
                morceaux.append(_retire(seuil, ("z-", "y+")))
            continue
        if basse:
            continue  # menuiseries fines supprimees : la vitre seule, posee sur le vide
        morceaux.append(_quad_facade(c, racine + "_FRAME", base, n, t, o["l"] + 2 * DORMANT, z0 - DORMANT,
                                     z1 + DORMANT, SAILLIE_DORMANT, "MAT_PAINTED_METAL_GRAPHITE"))
    return morceaux


def _bac(c, nom, rect, ouverts):
    """Un balcon de la qualite haute : un bac de beton d'un seul tenant, la dalle (0 a 0,30 m) et le garde-corps plein
    (jusqu'a 1,40 m, epais de 0,20 m) sur ses cotes fermes ; ouverts : les cotes contre le mur ou contre l'autre
    balcon (pas de garde-corps, aretes vives, faces retirees). Creuse avant le chanfrein, comme l'acrotere."""
    x0, x1, y0, y1 = rect
    e, jeu = EPAISSEUR_GC, 0.01
    haut = DALLE + GARDE_CORPS
    o = c.boite(nom, (x1 - x0, y1 - y0, haut), ((x0 + x1) / 2, (y0 + y1) / 2, 0.0), mat="MAT_CONCRETE")
    ix0 = x0 - jeu if "x-" in ouverts else x0 + e
    ix1 = x1 + jeu if "x+" in ouverts else x1 - e
    iy0 = y0 - jeu if "y-" in ouverts else y0 + e
    iy1 = y1 + jeu if "y+" in ouverts else y1 - e
    c.perce(o, (ix1 - ix0, iy1 - iy0, haut), ((ix0 + ix1) / 2, (iy0 + iy1) / 2, DALLE))
    while None in list(o.data.materials):  # le booleen laisse l'emplacement vide de son outil
        o.data.materials.pop(index=list(o.data.materials).index(None))
    for f in o.data.polygons:
        f.material_index = 0
    c.chanfreine(o, C2, 2, droites=tuple(ouverts) + ("z-",))
    return _retire(o, tuple(ouverts) + ("z-",))


def _balcons(c, nom, plan, basse):
    """Les balcons filants d'un etage. Le plot a deux balcons qui se rejoignent a l'angle avant droit (le balcon avant
    porte l'angle). Haute : un bac de beton de 1,60 m (dalle et garde-corps plein d'un seul tenant). Basse : un bloc
    plein de beton de 1,50 x 1,30 m, aux aretes vives (fiche : plus rien sous 0,60 m)."""
    hx, hy = (d / 2 for d in PLANS[plan]["taille"])
    faces = PLANS[plan]["balcons"]
    angle = "y-" in faces and "x+" in faces
    b = BALCON_BAS[0] if basse else BALCON
    morceaux = []

    def pose(suffixe, rect, ouverts):
        if basse:
            morceaux.append(_boite(c, nom + suffixe, rect, 0.0, BALCON_BAS[1], "MAT_CONCRETE",
                                   retire=tuple(ouverts) + ("z-",)))
        else:
            morceaux.append(_bac(c, nom + suffixe, rect, ouverts))

    if "y-" in faces:
        pose("_BALCONY_0", (-hx, hx + b if angle else hx, -hy - b, -hy), ("y+",))
    if "x+" in faces:
        pose("_BALCONY_1", (hx, hx + b, -hy, hy), ("x-", "y-") if angle else ("x-",))
    return morceaux


def _toit_plat(c, nom, plan, basse):
    """Le toit plat : l'acrotere de 0,60 m dans le prolongement des murs (memes aretes arrondies), sa couvertine
    graphite (le dessus de l'acrotere) et la toiture en beton au fond. Basse : un bloc plein, toiture affleurante."""
    l, p = PLANS[plan]["taille"]
    mur = PLANS[plan]["mur"]
    h, e = ACROTERE
    if basse:
        o = _boite(c, nom + "_PARAPET", (-l / 2, l / 2, -p / 2, p / 2), 0.0, h, mur, retire=("z-",))
        o.data.materials.append(c.materiau("MAT_CONCRETE"))
        for f in o.data.polygons:
            if f.normal.z > 0.99:
                f.material_index = 1
        return [o]
    o = c.boite(nom + "_PARAPET", (l, p, h), (0, 0, 0), mat=mur)
    c.perce(o, (l - 2 * e, p - 2 * e, h), (0, 0, TOITURE))
    while None in list(o.data.materials):  # le booleen laisse l'emplacement vide de son outil
        o.data.materials.pop(index=list(o.data.materials).index(None))
    c.chanfreine(o, C2, 2, droites=("z-",))
    _retire(o, ("z-",))
    o.data.materials.append(c.materiau("MAT_PAINTED_METAL_GRAPHITE"))
    o.data.materials.append(c.materiau("MAT_CONCRETE"))
    # c.boite garde son origine au centre du pave : les hauteurs se lisent depuis le dessus, en coordonnees locales
    dessus = max(v.co.z for v in o.data.vertices)
    for f in o.data.polygons:
        f.material_index = 0
        if f.normal.z > 0.99:
            if abs(f.center.z - dessus) < 1e-4:
                f.material_index = 1  # la couvertine
            elif abs(f.center.z - (dessus - h + TOITURE)) < 1e-4:
                f.material_index = 2  # la toiture
    return [o]


def _toit_pans(c, nom, plan, basse):
    """Le toit a quatre pans faibles (22 degres) sur le rectangle de _emprise_toit (il couvre les balcons du dernier
    etage), faitage le long du grand cote du rectangle (une pointe s'il est carre, comme sur le plot).
    Haute : la sous-face plate a z = 0 (elle ferme le haut des murs), une rive de 0,20 m, chanfreine en C2.
    Basse : les pans partent de l'egout a z = 0, jusqu'au meme faitage (la rive de 0,20 m disparait)."""
    x0, x1, y0, y1 = _emprise_toit(plan)
    xm, ym, ex, ey = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2
    haut = _hauteur_toit(plan, "ROOF_HIP")
    demi = abs(ex - ey)
    anneau = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    if demi < 1e-6:
        faite = [(xm, ym, haut)]
    elif ex > ey:
        faite = [(xm - demi, ym, haut), (xm + demi, ym, haut)]
    else:
        faite = [(xm, ym - demi, haut), (xm, ym + demi, haut)]

    def pans(i0, f0):
        """Les pans, de l'anneau (indices i0 a i0 + 3) au faitage (indice f0, et f0 + 1)."""
        a, b, cc, d = (i0 + k for k in range(4))
        if len(faite) == 1:
            return [[a, b, f0], [b, cc, f0], [cc, d, f0], [d, a, f0]]
        if ex > ey:
            return [[a, b, f0 + 1, f0], [b, cc, f0 + 1], [cc, d, f0, f0 + 1], [d, a, f0]]
        return [[a, b, f0], [b, cc, f0 + 1, f0], [cc, d, f0 + 1], [d, a, f0, f0 + 1]]

    if basse:
        s = [(x, y, 0.0) for x, y in anneau] + faite
        return [_maillage(c, nom + "_ROOF", s, [_oriente(s, f, (0, 0, 1)) for f in pans(0, 4)], "MAT_ROOF_TILE")]
    s = [(x, y, 0.0) for x, y in anneau] + [(x, y, RIVE) for x, y in anneau] + faite
    faces = [[0, 3, 2, 1]] + [[k, (k + 1) % 4, 4 + (k + 1) % 4, 4 + k] for k in range(4)] + pans(4, 8)
    o = _maillage(c, nom + "_ROOF", s, faces, "MAT_ROOF_TILE", recalcule=True)
    c.chanfreine(o, C2, 2)
    return [o]


def _triangles(o):
    m = o.data
    m.calc_loop_triangles()
    return len(m.loop_triangles)


def _piece(c, plan, piece, basse):
    """Une piece du kit, fusionnee, origine au centre de l'emprise a z = 0, avec les vides de ses vitres."""
    nom = P + plan + "_" + piece + ("_LOW" if basse else "")
    if piece.startswith("ROOF"):
        morceaux = (_toit_plat if piece == "ROOF_FLAT" else _toit_pans)(c, nom, plan, basse)
    else:
        morceaux = [_murs(c, nom, plan, basse)] + _ouvertures(c, nom, plan, piece, basse)
        if piece == "FLOOR":
            morceaux += _balcons(c, nom, plan, basse)
    o = c.fusionne(nom, morceaux)
    c.origine(o, (0, 0, 0))
    if not basse:
        c.lisse(o)
    if not piece.startswith("ROOF"):
        for k, (position, rot, echelle) in enumerate(_vides(plan, piece)):
            vide = c.pivot("%s_WIN_%02d" % (nom, k + 1), position)
            vide.rotation_euler[2] = math.radians(rot)
            vide.scale = echelle
            c.rattache(vide, o)
    return o


def _vitre(c):
    """La vitre WINDOW_PANE : un carre de 1,50 m dans le plan XZ, tourne vers -Y, origine en son centre."""
    d = FENETRE / 2
    s = [(-d, 0, -d), (d, 0, -d), (d, 0, d), (-d, 0, d)]
    return _maillage(c, P + "WINDOW_PANE", s, [_oriente(s, [0, 1, 2, 3], (0, -1, 0))], "MAT_GLASS")


PIECES = ("GROUND", "GROUND_SHOP", "FLOOR", "ROOF_FLAT", "ROOF_HIP")


def construit(c):
    triangles = {}
    for plan in PLANS:
        for piece in PIECES:
            haute = _piece(c, plan, piece, basse=False)
            basse = _piece(c, plan, piece, basse=True)
            triangles[plan + "_" + piece] = [_triangles(haute), _triangles(basse)]
    vitre = _vitre(c)
    triangles["WINDOW_PANE"] = [_triangles(vitre)]
    return {"triangles_vises": 5100, "triangles_par_piece": triangles, "animations": []}


# --- la demonstration -------------------------------------------------------------------------------------------------

# (plan, x, y, niveaux, rez, toit) : au fond (+Y, loin de la camera iso qui regarde depuis +X -Y), les deux plus hauts ;
# devant, les deux plus bas. Un rez commercial et un toit a quatre pans sur chaque plan.
IMMEUBLES = [("BAR", -17.0, 12.0, 6, "GROUND", "ROOF_FLAT"),
             ("PLOT", 14.0, 13.0, 5, "GROUND", "ROOF_HIP"),
             ("BAR", -15.0, -12.0, 4, "GROUND_SHOP", "ROOF_HIP"),
             ("PLOT", 15.0, -12.0, 3, "GROUND_SHOP", "ROOF_FLAT")]


def hauteur(plan, niveaux, toit):
    """La hauteur d'un immeuble, toit compris."""
    return round(ETAGE * niveaux + _hauteur_toit(plan, toit), 2)


def demonstration():
    """Deux barres et deux plots de 3 a 6 niveaux sur un socle en herbe (Blender : Z vertical). Chaque immeuble est
    empile : le rez a z = 0, les etages a z = 3 k, le toit a z = 3 n. src/kit.js ne pose une piece que par son nom :
    les vitres sont donc dans le plan, une WINDOW_PANE par vide, a la position, la rotation et l'echelle du vide,
    calculees ici depuis la meme description que les pieces. En qualite basse, la galerie pose <PIECE>_LOW et les
    memes vitres (WINDOW_PANE n'a pas de _LOW)."""
    pieces = []
    for plan, x, y, niveaux, rez, toit in IMMEUBLES:
        assert 3 <= niveaux <= 6 and not (toit == "ROOF_HIP" and niveaux > 5)
        assert hauteur(plan, niveaux, toit) <= 19.0
        pile = [rez] + ["FLOOR"] * (niveaux - 1)
        for k, piece in enumerate(pile):
            z = ETAGE * k
            pieces.append({"piece": P + plan + "_" + piece, "position": [x, y, z], "rotation": 0})
            for (vx, vy, vz), rot, echelle in _vides(plan, piece):
                pieces.append({"piece": P + "WINDOW_PANE",
                               "position": [round(x + vx, 3), round(y + vy, 3), round(z + vz, 3)],
                               "rotation": rot % 360, "echelle": [round(e, 4) for e in echelle]})
        pieces.append({"piece": P + plan + "_" + toit, "position": [x, y, ETAGE * niveaux], "rotation": 0})
    socle = {"taille": [60.0, 48.0, 0.60], "centre": [-3.0, -1.0], "materiau": "MAT_LANDSCAPE", "chanfrein": 0.10}
    return {"prefixe": P, "socles": [socle], "pieces": pieces}
