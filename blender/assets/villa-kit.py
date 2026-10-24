"""Le kit des villas romandes (catalogue : villa-kit, lot G9) : les maisons de la banlieue de la ville fictive
(docs/ville-autour.md). Brief ENV_VILLA_KIT_A_v001 valide par Pierre-Alain le 24 octobre 2026.

Vue a environ 8 px/m (cadrage par defaut) et 2,5 px/m (dezoom) : detail minimal 0,15 m (bible 18.3 : dormants, seuils, cheminees), 0,30 m vise pour les volumes ; en basse,
plus rien sous 0,30 m.
On reconnait une villa d'un coup d'oeil a la silhouette de son toit (deux pans ou pavillon, en tuile ou en ardoise),
a ses volets en bois et a sa haie (posee par l'assemblage : nature-kit). Pas de chalet. Aucune couleur d'etat, ni
orange, ni corail. Jamais une ossature de beton apparente, des rives de dalle ou des menuiseries en aluminium : c'est
ce qui fait le batiment d'application (building, type house), dont la villa ne doit jamais avoir l'air.

Cotes (bible 18.2) : etage de 3 m ; fenetre de 1,50 x 1,50 m sur allege de 0,90 m (linteau a 2,40 m, comme la porte) ;
porte de 1,10 x 2,40 m ; pente des toits de 35 degres ; avant-toit (debord) de 0,40 m ; couverture de 0,20 m.
Volets battants en bois (MAT_WOOD), ouverts de part et d'autre des fenetres des villas A a E ; dormant de fenetre,
porte et porte de garage en graphite ; seuil en beton (MAT_CONCRETE) devant chaque porte. Murs : aretes verticales
arrondies en C2 (0,05 m, deux segments) ; couverture chanfreinee en C2.

Six villas, chacune un noeud ENV_VILLA_KIT_A_VILLA_<A a F>, posee a l'origine : centre de l'emprise des murs au sol
(garage compris), z = 0, l'avant vers -Y. Le seuil et la terrasse depassent de l'emprise des murs vers l'avant.
- A : rez et combles, 10 x 9 m, deux pans en tuile (faitage le long de X), crepi blanc casse (MAT_SURFACE), 7,20 m ;
- B : rez et combles, 11 x 10 m, quatre pans en tuile, crepi creme (MAT_PLASTER), 7,50 m ;
- C : rez et etage, 10 x 8 m et garage accole a toit plat (+X), deux pans en tuile, creme, 9,50 m ;
- D : rez et etage, 10,5 x 8,5 m, quatre pans en tuile, blanc casse, 9,50 m ;
- E : rez et combles, 9 x 10 m, pignon sur rue (faitage le long de Y) et garage accole (-X), deux pans en ardoise
  graphite (MAT_PAINTED_METAL_GRAPHITE), creme, 7,20 m ;
- F : cube moderne, deux volumes a toit plat et acrotere de 0,50 m (un de rez et etage, un de rez), crepi blanc
  (MAT_SURFACE), toits en beton, grandes baies sans volets, 6,50 m.
Cheminees comprises, A, B, E et F restent a 8 m au plus (cote camera), C et D a 10 m au plus.

Les vitres ne sont pas dans les villas. A chaque fenetre et a chaque baie, un vide ENV_VILLA_KIT_A_VILLA_<X>_WIN_<NN>
(et ENV_VILLA_KIT_A_VILLA_<X>_LOW_WIN_<NN> sous la version basse), enfant de sa villa, au centre de la vitre, son -Y
local tourne vers l'exterieur ; son echelle (x, z) met la vitre a la taille de la baie (1 pour une fenetre de
1,50 x 1,50 m). La piece ENV_VILLA_KIT_A_WINDOW_PANE est cette vitre : un carre de verre (MAT_GLASS) de 1,50 x 1,50 m,
une seule face tournee vers -Y, origine en son centre (pas au sol : elle se pose sur un vide). L'assemblage
l'instancie sur les vides ; city-night l'allume la nuit sans toucher a la fusion des villas.

Qualite basse (bible 18.3, detail minimal 0,60 m) : VILLA_<X>_LOW, aux aretes vives, a la meme silhouette ; sans volets,
sans dormants, sans cheminee, sans seuil, sans avant-toit (le toit part du haut des murs, rehausses de l'epaisseur de
la couverture : la hauteur ne change pas).
"""

import math

import bmesh
import bpy
from mathutils import Matrix

ASSET = {"id": "villa-kit", "categorie": "kit", "nom": "ENV_VILLA_KIT_A_v001"}

P = "ENV_VILLA_KIT_A_"
ETAGE = 3.0
FENETRE = 1.50  # cote de la fenetre, et de la vitre WINDOW_PANE
ALLEGE = 0.90
PORTE = (1.10, 2.40)
PORTE_GARAGE = (2.50, 2.20)
PENTE = math.tan(math.radians(35))
DEBORD = 0.40  # avant-toit
COUVERTURE = 0.20 / math.cos(math.radians(35))  # epaisseur de la couverture, mesuree a la verticale
VOLET = (FENETRE / 2, 0.05)  # largeur et epaisseur d'un volet ouvert
DORMANT = 0.15  # le cadre graphite qui depasse de la vitre, de chaque cote
SAILLIE_DORMANT = 0.01  # le dormant, pose sur le mur
SAILLIE_VITRE = 0.03  # la vitre (le vide), devant le dormant, entre les volets
CHEMINEE = 0.60
GARAGE = 2.80  # hauteur des murs du garage, sous sa dalle de toit
DALLE_GARAGE = (0.25, 0.15)  # epaisseur et debord de la dalle du toit du garage
ACROTERE = (0.50, 0.25)  # hauteur et epaisseur
SEUIL = (1.90, 1.20, 0.15)  # le long de la facade, en avant, hauteur
C1, C2 = 0.02, 0.05

# Les faces d'un volume : (rotation du vide en degres, normale sortante, tangente). La tangente est le -X local du
# vide tourne : une baie a l'abscisse a se lit le long de X (faces y-/y+) ou de Y (faces x-/x+).
FACES = {"y-": (0, (0, -1), (1, 0)), "x+": (90, (1, 0), (0, 1)), "y+": (180, (0, 1), (-1, 0)),
         "x-": (270, (-1, 0), (0, -1))}


# --- la description des six villas (donnees pures : demonstration() la relit sans Blender) -------------------------

def _f(vol, face, a, niveau=0, volets=True):
    """Une fenetre de 1,50 x 1,50 m sur son allege, au rez (niveau 0), a l'etage ou dans les combles (niveau 1)."""
    return {"vol": vol, "face": face, "a": a, "type": "fenetre", "l": FENETRE, "h": FENETRE,
            "z": ALLEGE + ETAGE * niveau, "volets": volets}


def _b(vol, face, a, l, h, z=0.0):
    """Une baie sans volets (villa F), de l x h m, dont le bas est a z."""
    return {"vol": vol, "face": face, "a": a, "type": "fenetre", "l": l, "h": h, "z": z, "volets": False}


def _porte(vol, face, a):
    return {"vol": vol, "face": face, "a": a, "type": "porte", "l": PORTE[0], "h": PORTE[1], "z": 0.0}


def _porte_garage(vol, face, a):
    return {"vol": vol, "face": face, "a": a, "type": "garage", "l": PORTE_GARAGE[0], "h": PORTE_GARAGE[1], "z": 0.0}


def _villas():
    """Les six villas, dans le repere de leur corps principal (centre en x = y = 0). Un volume : (x0, x1, y0, y1).
    Le toit : 'deux' (deux pans, faitage le long de 'faitage') ou 'pavillon' (quatre pans, faitage le long du grand
    cote) ; hauteur : le haut du faitage. cheminee : (x, y, haut)."""
    a = {
        "mur": "MAT_SURFACE", "couverture": "MAT_ROOF_TILE", "toit": "deux", "faitage": "x", "hauteur": 7.20,
        "corps": (-5.0, 5.0, -4.5, 4.5), "cheminee": (2.0, 1.2, 7.80),
        "ouvertures": [
            _f("corps", "y-", -2.8), _porte("corps", "y-", 0.0), _f("corps", "y-", 2.8),
            _f("corps", "x+", -2.2), _f("corps", "x+", 2.2), _f("corps", "x+", 0.0, 1),
            _f("corps", "x-", -2.2), _f("corps", "x-", 2.2), _f("corps", "x-", 0.0, 1),
            _f("corps", "y+", -2.5), _f("corps", "y+", 2.5),
        ],
    }
    b = {
        "mur": "MAT_PLASTER", "couverture": "MAT_ROOF_TILE", "toit": "pavillon", "hauteur": 7.50,
        "corps": (-5.5, 5.5, -5.0, 5.0), "cheminee": (-2.0, 1.5, 7.90),
        "ouvertures": [
            _f("corps", "y-", -3.5), _porte("corps", "y-", 0.0), _f("corps", "y-", 3.5),
            _f("corps", "x+", -2.5), _f("corps", "x+", 2.5),
            _f("corps", "x-", -2.5), _f("corps", "x-", 2.5),
            _f("corps", "y+", -3.5), _f("corps", "y+", 0.0), _f("corps", "y+", 3.5),
        ],
    }
    c = {
        "mur": "MAT_PLASTER", "couverture": "MAT_ROOF_TILE", "toit": "deux", "faitage": "x", "hauteur": 9.50,
        "corps": (-5.0, 5.0, -4.0, 4.0), "garage": (5.0, 8.6, -3.0, 3.5), "cheminee": (-2.5, 1.2, 9.90),
        "ouvertures": [
            _f("corps", "y-", -2.8), _porte("corps", "y-", 0.0), _f("corps", "y-", 2.8),
            _f("corps", "y-", -2.8, 1), _f("corps", "y-", 0.0, 1, False), _f("corps", "y-", 2.8, 1),
            _f("corps", "x-", -1.8), _f("corps", "x-", 1.8), _f("corps", "x-", -1.8, 1), _f("corps", "x-", 1.8, 1),
            _f("corps", "x+", -1.8, 1), _f("corps", "x+", 1.8, 1),
            _f("corps", "y+", -2.8), _f("corps", "y+", 0.0, 0, False), _f("corps", "y+", 2.8),
            _f("corps", "y+", -2.8, 1), _f("corps", "y+", 2.8, 1),
            _porte_garage("garage", "y-", 6.8),
        ],
    }
    d = {
        "mur": "MAT_SURFACE", "couverture": "MAT_ROOF_TILE", "toit": "pavillon", "hauteur": 9.50,
        "corps": (-5.25, 5.25, -4.25, 4.25), "cheminee": (1.5, 1.0, 9.90),
        "ouvertures": [
            _f("corps", "y-", -3.3), _porte("corps", "y-", 0.0), _f("corps", "y-", 3.3),
            _f("corps", "y-", -3.3, 1), _f("corps", "y-", 0.0, 1, False), _f("corps", "y-", 3.3, 1),
            _f("corps", "x+", -1.9), _f("corps", "x+", 1.9), _f("corps", "x+", -1.9, 1), _f("corps", "x+", 1.9, 1),
            _f("corps", "x-", -1.9), _f("corps", "x-", 1.9), _f("corps", "x-", -1.9, 1), _f("corps", "x-", 1.9, 1),
            _f("corps", "y+", -3.3), _f("corps", "y+", 0.0, 0, False), _f("corps", "y+", 3.3),
            _f("corps", "y+", -3.3, 1), _f("corps", "y+", 3.3, 1),
        ],
    }
    e = {
        "mur": "MAT_PLASTER", "couverture": "MAT_PAINTED_METAL_GRAPHITE", "toit": "deux", "faitage": "y",
        "hauteur": 7.20, "corps": (-4.5, 4.5, -5.0, 5.0), "garage": (-8.1, -4.5, -4.0, 2.5),
        "cheminee": (-1.0, 2.0, 7.80),
        "ouvertures": [
            _f("corps", "y-", -2.6), _porte("corps", "y-", 0.0), _f("corps", "y-", 2.6), _f("corps", "y-", 0.0, 1),
            _f("corps", "x+", -2.4), _f("corps", "x+", 2.4),
            _f("corps", "y+", -2.5), _f("corps", "y+", 2.5), _f("corps", "y+", 0.0, 1),
            _porte_garage("garage", "y-", -6.3),
        ],
    }
    # F : le volume haut (rez et etage) a gauche, le volume bas (rez) a droite, chacun sous son acrotere
    f = {
        "mur": "MAT_SURFACE", "toit": "plat", "hauteur": 6.50,
        "corps": (-5.5, 2.5, -4.25, 4.25), "bas": (2.5, 5.5, -4.25, 4.25),
        "ouvertures": [
            _porte("corps", "y-", -4.3), _b("corps", "y-", -0.9, 4.5, 2.4), _b("corps", "y-", -1.5, 6.0, 1.5, 3.9),
            _b("bas", "y-", 4.0, 2.4, 2.4),
            _b("bas", "x+", 0.0, 4.5, 2.4), _b("corps", "x+", 0.0, 3.0, 1.5, 3.9),
            _b("corps", "y+", -1.5, 6.0, 2.4), _b("corps", "y+", -3.0, 3.0, 1.5, 3.9), _f("corps", "y+", 1.0, 1, False),
            _f("bas", "y+", 4.0, 0, False),
            _f("corps", "x-", -1.5, 0, False), _f("corps", "x-", 1.5, 1, False),
        ],
    }
    return {"A": a, "B": b, "C": c, "D": d, "E": e, "F": f}


def _volumes(v):
    return {k: v[k] for k in ("corps", "garage", "bas") if k in v}


def _centre(v):
    """Le centre de l'emprise des murs au sol (garage compris) : l'origine de la villa."""
    rects = list(_volumes(v).values())
    return ((min(r[0] for r in rects) + max(r[1] for r in rects)) / 2,
            (min(r[2] for r in rects) + max(r[3] for r in rects)) / 2)


def _sur_facade(v, o):
    """Le point d'une ouverture au pied de sa facade (x, y), la rotation, la normale et la tangente de sa face."""
    x0, x1, y0, y1 = v[o["vol"]]
    rot, n, t = FACES[o["face"]]
    a = o["a"]
    base = {"y-": (a, y0), "y+": (a, y1), "x-": (x0, a), "x+": (x1, a)}[o["face"]]
    return base, rot, n, t


def _vides(v):
    """Les vides des vitres d'une villa, dans son repere (origine au centre de l'emprise) : [(position, rotation,
    echelle)], dans l'ordre des ouvertures."""
    cx, cy = _centre(v)
    vides = []
    for o in v["ouvertures"]:
        if o["type"] != "fenetre":
            continue
        (bx, by), rot, n, _ = _sur_facade(v, o)
        position = (bx + n[0] * SAILLIE_VITRE - cx, by + n[1] * SAILLIE_VITRE - cy, o["z"] + o["h"] / 2)
        vides.append((position, rot, (o["l"] / FENETRE, 1.0, o["h"] / FENETRE)))
    return vides


def _hauteur_egout(v):
    """Le haut des murs sous un toit a pans : le faitage moins la pente sur la demi-largeur et la couverture."""
    x0, x1, y0, y1 = v["corps"]
    if v["toit"] == "deux":
        demi = ((y1 - y0) if v["faitage"] == "x" else (x1 - x0)) / 2
    else:
        demi = min(x1 - x0, y1 - y0) / 2
    return v["hauteur"] - COUVERTURE - demi * PENTE


# --- maillages ------------------------------------------------------------------------------------------------------

def _maillage(c, nom, sommets, faces, mat, recalcule=False):
    """Un objet a partir de ses sommets et de ses faces. recalcule : normales sortantes recalculees (solide ferme) ;
    sinon, les faces sont deja orientees."""
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


def _sans_faces(o, dessus=False, dessous=True):
    """Retire les faces horizontales du dessus ou du dessous d'un objet (cachees sous un toit, posees au sol)."""
    b = bmesh.new()
    b.from_mesh(o.data)
    b.normal_update()
    zs = [v.co.z for v in b.verts]
    bas, haut = min(zs), max(zs)
    retire = [f for f in b.faces
              if (dessous and f.normal.z < -0.99 and all(abs(v.co.z - bas) < 1e-4 for v in f.verts))
              or (dessus and f.normal.z > 0.99 and all(abs(v.co.z - haut) < 1e-4 for v in f.verts))]
    bmesh.ops.delete(b, geom=retire, context="FACES")
    b.to_mesh(o.data)
    b.free()
    o.data.update()
    return o


def _quad_facade(c, nom, base, n, t, l, z0, z1, saillie, mat):
    """Un rectangle vertical sur une facade, tourne vers l'exterieur : l de large, de z0 a z1, a saillie du mur."""
    bx, by = base[0] + n[0] * saillie, base[1] + n[1] * saillie
    s = [(bx + t[0] * dx, by + t[1] * dx, z) for dx, z in ((-l / 2, z0), (l / 2, z0), (l / 2, z1), (-l / 2, z1))]
    return _maillage(c, nom, s, [_oriente(s, [0, 1, 2, 3], (n[0], n[1], 0))], mat)


def _plaque(c, nom, rect, z, mat):
    """Un aplat horizontal tourne vers le haut (toit plat, toit bas)."""
    x0, x1, y0, y1 = rect
    s = [(x0, y0, z), (x1, y0, z), (x1, y1, z), (x0, y1, z)]
    return _maillage(c, nom, s, [_oriente(s, [0, 1, 2, 3], (0, 0, 1))], mat)


def _volet(c, nom, base, n, t, decalage, z0, mat):
    """Un volet ouvert contre le mur : une plaque de 0,05 m, sans dos ni dessous (contre le mur, jamais vus)."""
    l, e = VOLET
    bx, by = base[0] + t[0] * decalage, base[1] + t[1] * decalage
    z1 = z0 + FENETRE

    def p(dx, d, z):
        return (bx + t[0] * dx + n[0] * d, by + t[1] * dx + n[1] * d, z)

    s = [p(-l / 2, 0, z0), p(l / 2, 0, z0), p(l / 2, e, z0), p(-l / 2, e, z0),
         p(-l / 2, 0, z1), p(l / 2, 0, z1), p(l / 2, e, z1), p(-l / 2, e, z1)]
    faces = [_oriente(s, [3, 2, 6, 7], (n[0], n[1], 0)),  # devant
             _oriente(s, [4, 5, 6, 7], (0, 0, 1)),  # dessus
             _oriente(s, [0, 3, 7, 4], (-t[0], -t[1], 0)),  # cotes
             _oriente(s, [1, 2, 6, 5], (t[0], t[1], 0))]
    return _maillage(c, nom, s, faces, mat)


def _corps(c, nom, rect, z1, mat, contact=(), basse=False):
    """Un volume de murs de z = 0 a z1, aretes verticales arrondies en C2 (sauf celles d'une face de contact, et en
    basse), sans dessous ; le dessus reste (il ferme la villa basse) ou part (cache sous un toit)."""
    x0, x1, y0, y1 = rect
    if basse:
        o = c.boite(nom, (x1 - x0, y1 - y0, z1), ((x0 + x1) / 2, (y0 + y1) / 2, 0), mat=mat)
    else:
        o = c.boite(nom, (x1 - x0, y1 - y0, z1), ((x0 + x1) / 2, (y0 + y1) / 2, 0), mat=mat, chanfrein=C2,
                    segments=2, droites=("z-", "z+") + tuple(contact))
    return _sans_faces(o, dessus=not basse)


def _deux_pans(c, nom, v, mat_mur, basse):
    """Le toit a deux pans et ses pignons. Haute : une couverture de 0,20 m qui deborde de 0,40 m, chanfreinee en C2 ;
    basse : deux pans poses sur le haut des murs, sans debord ni epaisseur. Renvoie (couverture, pignons)."""
    x0, x1, y0, y1 = v["corps"]
    le_long_x = v["faitage"] == "x"
    # u le long du faitage, w en travers ; vers (x, y)
    u0, u1, w0, w1 = (x0, x1, y0, y1) if le_long_x else (y0, y1, x0, x1)
    xy = (lambda u, w: (u, w)) if le_long_x else (lambda u, w: (w, u))
    wm, demi = (w0 + w1) / 2, (w1 - w0) / 2
    haut = v["hauteur"]
    egout = _hauteur_egout(v)
    sommet_pignon = egout + demi * PENTE  # sous-face de la couverture a l'aplomb du faitage
    if basse:
        egout += COUVERTURE  # les murs bas montent jusqu'au dessus de la couverture
        sommet_pignon = haut
    pignons = []
    for k, u in enumerate((u0, u1)):
        s = [(*xy(u, w0), egout), (*xy(u, w1), egout), (*xy(u, wm), sommet_pignon)]
        sens = (-1 if k == 0 else 1)
        normale = (sens, 0, 0) if le_long_x else (0, sens, 0)
        pignons.append(_maillage(c, nom + "_GABLE_%d" % k, s, [_oriente(s, [0, 1, 2], normale)], mat_mur))
    if basse:
        s = [(*xy(u0, w0), egout), (*xy(u1, w0), egout), (*xy(u1, wm), haut), (*xy(u0, wm), haut),
             (*xy(u0, w1), egout), (*xy(u1, w1), egout)]
        faces = [_oriente(s, [0, 1, 2, 3], (0, 0, 1)), _oriente(s, [3, 2, 5, 4], (0, 0, 1))]
        return _maillage(c, nom + "_ROOF", s, faces, v["couverture"]), pignons
    # la couverture : un profil en V epais, extrude le long du faitage, debords compris
    we = demi + DEBORD
    bas_egout = egout - DEBORD * PENTE
    profil = [(-we, bas_egout), (-we, bas_egout + COUVERTURE), (0, haut), (we, bas_egout + COUVERTURE),
              (we, bas_egout), (0, haut - COUVERTURE)]
    s = []
    for u in (u0 - DEBORD, u1 + DEBORD):
        s += [(*xy(u, wm + w), z) for w, z in profil]
    faces = [[0, 1, 2, 5], [5, 2, 3, 4], [6, 11, 8, 7], [11, 10, 9, 8]]  # les deux bouts, en deux quadrilateres
    faces += [[i, (i + 1) % 6, 6 + (i + 1) % 6, 6 + i] for i in range(6)]
    couverture = _maillage(c, nom + "_ROOF", s, faces, v["couverture"], recalcule=True)
    c.chanfreine(couverture, C2, 2)
    return couverture, pignons


def _pavillon(c, nom, v, basse):
    """Le toit a quatre pans, faitage le long du grand cote. Haute : une couverture de 0,20 m qui deborde de 0,40 m,
    fermee (sous-face plate a l'egout), chanfreinee en C2 ; basse : quatre pans poses sur le haut des murs."""
    x0, x1, y0, y1 = v["corps"]
    xm, ym = (x0 + x1) / 2, (y0 + y1) / 2
    haut = v["hauteur"]
    egout = _hauteur_egout(v)
    long_x = (x1 - x0) >= (y1 - y0)
    if basse:
        ex, ey, z = (x1 - x0) / 2, (y1 - y0) / 2, egout + COUVERTURE
    else:
        ex, ey, z = (x1 - x0) / 2 + DEBORD, (y1 - y0) / 2 + DEBORD, egout - DEBORD * PENTE + COUVERTURE
    demi_faitage = abs(ex - ey)
    anneau = [(xm - ex, ym - ey), (xm + ex, ym - ey), (xm + ex, ym + ey), (xm - ex, ym + ey)]
    faite = [(xm - demi_faitage, ym, haut), (xm + demi_faitage, ym, haut)] if long_x else \
        [(xm, ym - demi_faitage, haut), (xm, ym + demi_faitage, haut)]
    s = [(x, y, z) for x, y in anneau] + faite
    if long_x:
        pans = [[0, 1, 5, 4], [1, 2, 5], [2, 3, 4, 5], [3, 0, 4]]
    else:
        pans = [[0, 1, 4], [1, 2, 5, 4], [2, 3, 5], [3, 0, 4, 5]]
    if basse:
        return _maillage(c, nom + "_ROOF", s, [_oriente(s, f, (0, 0, 1)) for f in pans], v["couverture"])
    # haute : la rive de 0,20 m (anneau du bas) et la sous-face ; les pans partent de l'anneau du haut
    s = [(x, y, z - COUVERTURE) for x, y in anneau] + [(x, y, z) for x, y in anneau] + faite
    pans = [[i + 4 for i in f] for f in pans]  # les indices passent apres les deux anneaux
    faces = [[0, 1, 2, 3]] + [[i, (i + 1) % 4, 4 + (i + 1) % 4, 4 + i] for i in range(4)] + pans
    couverture = _maillage(c, nom + "_ROOF", s, faces, v["couverture"], recalcule=True)
    c.chanfreine(couverture, C2, 2)
    return couverture


def _acrotere(c, nom, rect, z0, mat, cotes):
    """L'acrotere d'un toit plat sur les cotes donnes ('x-', 'x+', 'y-', 'y+'), a l'aplomb des murs : les longs pans
    le long de X entiers, ceux le long de Y entre eux (aucun recouvrement, donc aucun scintillement)."""
    x0, x1, y0, y1 = rect
    h, e = ACROTERE
    morceaux = []
    for k, face in enumerate(cotes):
        if face in ("y-", "y+"):
            y = y0 if face == "y-" else y1 - e
            taille, pos = (x1 - x0, e, h), ((x0 + x1) / 2, y + e / 2, z0)
        else:
            ya = y0 + (e if "y-" in cotes else 0)
            yb = y1 - (e if "y+" in cotes else 0)
            x = x0 if face == "x-" else x1 - e
            taille, pos = (e, yb - ya, h), (x + e / 2, (ya + yb) / 2, z0)
        morceaux.append(_sans_faces(c.boite(nom + "_PARAPET_%d" % k, taille, pos, mat=mat)))
    return morceaux


def _ouvertures(c, nom, v, basse):
    """Portes, portes de garage, dormants et volets, seuils. Les vitres n'y sont pas : ce sont les vides."""
    morceaux = []
    for k, o in enumerate(v["ouvertures"]):
        base, _, n, t = _sur_facade(v, o)
        z0, z1 = o["z"], o["z"] + o["h"]
        racine = "%s_OPENING_%02d" % (nom, k)
        if o["type"] in ("porte", "garage"):
            morceaux.append(_quad_facade(c, racine, base, n, t, o["l"], z0, z1, SAILLIE_DORMANT,
                                         "MAT_PAINTED_METAL_GRAPHITE"))
            if o["type"] == "porte" and not basse:
                lx, ly, h = SEUIL
                taille = (lx, ly, h) if o["face"] in ("y-", "y+") else (ly, lx, h)
                seuil = c.boite(racine + "_STEP", taille, (base[0] + n[0] * ly / 2, base[1] + n[1] * ly / 2, 0),
                                mat="MAT_CONCRETE", chanfrein=C1, segments=1, droites=("z-",))
                morceaux.append(_sans_faces(seuil))
            continue
        if basse:
            continue  # en basse, la vitre seule (posee sur le vide) : ni dormant, ni volets
        morceaux.append(_quad_facade(c, racine + "_FRAME", base, n, t, o["l"] + 2 * DORMANT, max(0.0, z0 - DORMANT),
                                     z1 + DORMANT, SAILLIE_DORMANT, "MAT_PAINTED_METAL_GRAPHITE"))
        if o["volets"]:
            ecart = o["l"] / 2 + DORMANT + VOLET[0] / 2
            for j, sens in enumerate((-1, 1)):
                morceaux.append(_volet(c, racine + "_SHUTTER_%d" % j, base, n, t, sens * ecart, z0, "MAT_WOOD"))
    return morceaux


def _villa(c, lettre, v, basse):
    nom = P + "VILLA_" + lettre + ("_LOW" if basse else "")
    mur = v["mur"]
    morceaux = []
    if v["toit"] == "plat":
        # F : le volume haut (corps) contre le volume bas a sa droite (+X)
        haut_corps, haut_bas = v["hauteur"] - ACROTERE[0], ETAGE
        if basse:
            for k, (cle, z) in enumerate((("corps", v["hauteur"]), ("bas", ETAGE + ACROTERE[0]))):
                morceaux.append(_corps(c, nom + "_BODY_%d" % k, v[cle], z, mur, basse=True))
                # la dalle couvre tout le dessus : une bande de crepi de 0,25 m autour serait sous les 0,30 m de la
                # qualite basse (bible 18.3, constat du controleur du 24 octobre 2026)
                x0, x1, y0, y1 = v[cle]
                morceaux.append(_plaque(c, nom + "_ROOF_%d" % k, (x0, x1, y0, y1), z + 0.01, "MAT_CONCRETE"))
        else:
            morceaux.append(_corps(c, nom + "_BODY_0", v["corps"], haut_corps, mur, contact=("x+",)))
            morceaux.append(_corps(c, nom + "_BODY_1", v["bas"], haut_bas, mur, contact=("x-",)))
            morceaux += _acrotere(c, nom + "_0", v["corps"], haut_corps, mur, ("y-", "y+", "x-", "x+"))
            morceaux += _acrotere(c, nom + "_1", v["bas"], haut_bas, mur, ("y-", "y+", "x+"))
            e = ACROTERE[1]
            x0, x1, y0, y1 = v["corps"]
            morceaux.append(_plaque(c, nom + "_ROOF_0", (x0 + e, x1 - e, y0 + e, y1 - e), haut_corps, "MAT_CONCRETE"))
            x0, x1, y0, y1 = v["bas"]
            morceaux.append(_plaque(c, nom + "_ROOF_1", (x0, x1 - e, y0 + e, y1 - e), haut_bas, "MAT_CONCRETE"))
    else:
        egout = _hauteur_egout(v) + (COUVERTURE if basse else 0.0)
        morceaux.append(_corps(c, nom + "_BODY", v["corps"], egout, mur, basse=basse))
        if v["toit"] == "deux":
            couverture, pignons = _deux_pans(c, nom, v, mur, basse)
            morceaux += [couverture] + pignons
        else:
            morceaux.append(_pavillon(c, nom, v, basse))
        if "cheminee" in v and not basse:
            x, y, z1 = v["cheminee"]
            z0 = _hauteur_egout(v)  # le pied, cache dans le volume du toit
            cheminee = c.boite(nom + "_CHIMNEY", (CHEMINEE, CHEMINEE, z1 - z0), (x, y, z0), mat=mur, chanfrein=C2,
                               segments=1, droites=("z-",))
            morceaux.append(_sans_faces(cheminee))
    if "garage" in v:
        x0, x1, y0, y1 = v["garage"]
        cote_maison = "x-" if x0 >= v["corps"][1] - 1e-6 else "x+"
        morceaux.append(_corps(c, nom + "_GARAGE", v["garage"], GARAGE + (DALLE_GARAGE[0] if basse else 0.0), mur,
                               contact=(cote_maison,), basse=basse))
        if basse:
            morceaux.append(_plaque(c, nom + "_GARAGE_ROOF", v["garage"], GARAGE + DALLE_GARAGE[0] + 0.01,
                                    "MAT_PAINTED_METAL_GRAPHITE"))
        else:
            e, deb = DALLE_GARAGE
            gx0, gx1 = (x0, x1 + deb) if cote_maison == "x-" else (x0 - deb, x1)
            dalle = c.boite(nom + "_GARAGE_ROOF", (gx1 - gx0, y1 - y0 + 2 * deb, e), ((gx0 + gx1) / 2, (y0 + y1) / 2,
                                                                                    GARAGE),
                            mat="MAT_PAINTED_METAL_GRAPHITE", chanfrein=C2, segments=2, droites=(cote_maison,))
            morceaux.append(_sans_faces(dalle))
    morceaux += _ouvertures(c, nom, v, basse)

    o = c.fusionne(nom, morceaux)
    c.origine(o, (0, 0, 0))
    cx, cy = _centre(v)
    o.data.transform(Matrix.Translation((-cx, -cy, 0)))  # l'origine au centre de l'emprise des murs
    o.data.update()
    if not basse:
        c.lisse(o)
    for k, (position, rot, echelle) in enumerate(_vides(v)):
        vide = c.pivot("%s_WIN_%02d" % (nom, k + 1), position)
        vide.rotation_euler[2] = math.radians(rot)
        vide.scale = echelle
        c.rattache(vide, o)
    return o


def _vitre(c):
    """La vitre WINDOW_PANE : un carre de 1,50 m dans le plan XZ, tourne vers -Y, origine en son centre."""
    d = FENETRE / 2
    s = [(-d, 0, -d), (d, 0, -d), (d, 0, d), (-d, 0, d)]
    vitre = _maillage(c, P + "WINDOW_PANE", s, [_oriente(s, [0, 1, 2, 3], (0, -1, 0))], "MAT_GLASS")
    vitre.name = vitre.data.name = P + "WINDOW_PANE"
    return vitre


def construit(c):
    for lettre, v in _villas().items():
        _villa(c, lettre, v, basse=False)
        _villa(c, lettre, v, basse=True)
    _vitre(c)
    return {"triangles_vises": 2800, "animations": []}


# --- la demonstration -------------------------------------------------------------------------------------------------

# deux rangees de trois, les avants vers -Y (la camera iso regarde depuis +X -Y) : devant, les villas basses du cote
# camera (A, B, E) ; derriere, C, F et D
RANGEES = [("A", -18.0, -11.0), ("B", 0.0, -11.0), ("E", 18.0, -11.0),
           ("C", -16.0, 11.0), ("F", 2.0, 11.0), ("D", 19.0, 11.0)]


def demonstration():
    """Les six villas en deux rangees sur un socle en herbe (Blender : Z vertical). src/kit.js ne pose une piece que
    par son nom : il ne sait pas la poser sur un vide d'une autre piece. Les vitres sont donc dans le plan, une
    WINDOW_PANE par vide, a la position, la rotation et l'echelle du vide, calculees ici depuis la meme description que
    les villas. En qualite basse, la galerie pose VILLA_<X>_LOW et les memes vitres (WINDOW_PANE n'a pas de _LOW)."""
    pieces = []
    villas = _villas()
    for lettre, x, y in RANGEES:
        pieces.append({"piece": P + "VILLA_" + lettre, "position": [x, y, 0.0], "rotation": 0})
        for (vx, vy, vz), rot, echelle in _vides(villas[lettre]):
            pieces.append({"piece": P + "WINDOW_PANE", "position": [round(x + vx, 3), round(y + vy, 3), round(vz, 3)],
                           "rotation": rot % 360, "echelle": [round(e, 4) for e in echelle]})
    socle = {"taille": [62.0, 48.0, 0.60], "centre": [0.5, 0.0], "materiau": "MAT_LANDSCAPE", "chanfrein": 0.10}
    return {"prefixe": P, "socles": [socle], "pieces": pieces}
