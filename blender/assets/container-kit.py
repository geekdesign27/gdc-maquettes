"""Le kit de conteneur (catalogue : container-kit), module commun des bureaux et des baraques du lot G1.
Decisions de Pierre-Alain du 19 octobre 2026 : un bureau est un conteneur de chantier amenage, deux postes par
conteneur ; conteneur de 20 pieds agrandi x 1,2 comme toute la famille (7,20 x 3,00 m au sol, 3,00 m de haut) ;
panneaux blanc casse, cadre graphite, liseret bleu tech (MB_10 ramene a la palette) ; coque en pieces.

Chaque piece est un noeud ENV_CONTAINER_KIT_A_<PIECE>. Les pieces de coque sont modelees a leur place dans un conteneur
dont l'origine est au centre de l'emprise, au sol : on pose toutes les pieces d'un conteneur au meme point.
- long pan : modele sur la face avant (-Y) ; une rotation de 180 le pose a l'arriere ;
- bout : modele sur la face droite (+X) ; une rotation de 180 le pose a gauche ;
- accoler deux conteneurs le long de Y (pas de 3,00 m) : ne pas poser les deux parois communes ;
- conteneur habite (bureau) : FRAME_CUT, FLOOR, WALL_LONG_CUT a l'avant, sans ROOF ; on entre par WALL_END_DOOR ;
- grappe de bureaux accoles par le long pan (v002) : FRAME_OPEN devant et au milieu, FRAME_CUT tourne de 180 au fond ;
- empiler : le conteneur du haut est pose a z = 3,00 ; STAIR et WALKWAY sont modeles par rapport au conteneur du bas.
Le mobilier est pose a son origine (centre au sol, avant vers -Y) ; dans un conteneur, son sol est a z = PLANCHER.

Qualite basse (bible 18.3) : les nervures (RIBS_*) font moins de 0,30 m ; le composant les retire.
Pieces animees par le code des composants (aucun clip dans le kit) : DRAFTING_RULER et DRAFTING_LAMP, enfants de
DRAFTING_TABLE ; STAMP_HEAD, enfant de STAMP.
"""

import math

import bpy

ASSET = {"id": "container-kit", "categorie": "kit", "nom": "ENV_CONTAINER_KIT_A_v002"}

P = "ENV_CONTAINER_KIT_A_"
LONG = 7.20  # longueur hors tout (20 pieds x 1,2)
LARGE = 3.00  # largeur hors tout
HAUT = 3.00  # hauteur hors tout : un etage de la bible
CADRE = 0.20  # poteaux d'angle et longerons
PLANCHER = 0.20  # dessus du plancher interieur
PANNEAU = 0.08  # epaisseur d'une paroi
RETRAIT = 0.05  # le cadre deborde du nu des panneaux
NERVURE = (0.15, 0.03)  # largeur et saillie d'une nervure
PAS_NERVURE = 0.60
LISERE = (2.62, 0.15)  # bas et hauteur du liseret bleu, sous le longeron haut
PORTE = (1.10, 2.40)
FENETRE = (1.50, 1.50)
ALLEGE = 0.90
X_PORTE = -2.00  # centre de la porte sur le long pan avant
X_FENETRE = 1.00  # centre de la fenetre du long pan avant
X_FENETRES_ARRIERE = (-1.60, 1.60)
TUBE = 0.08  # lisses et montants de garde-corps (comme le kit de batiment)
GARDE_CORPS = 1.10
MARCHE = 0.20  # hauteur d'une marche de l'escalier exterieur
GIRON = 0.21
COURSIVE = 1.00  # largeur de la coursive
C1, C2 = 0.02, 0.05

# reperes derives
NU = LARGE / 2 - RETRAIT  # face exterieure d'un panneau de long pan (y = -NU)
NU_BOUT = LONG / 2 - RETRAIT
INT_LONG = LONG - 2 * CADRE  # longueur libre entre poteaux
INT_LARGE = LARGE - 2 * CADRE
H_PAROI = HAUT - CADRE - PLANCHER  # hauteur d'un panneau, du plancher au longeron haut


def _piece(c, nom, objets, lisser=True):
    """Fusionne les morceaux d'une piece et pose son origine au point d'assemblage (0, 0, 0)."""
    o = c.fusionne(P + nom, objets) if len(objets) > 1 else objets[0]
    o.name = o.data.name = P + nom
    c.origine(o, (0, 0, 0))
    if lisser:
        c.lisse(o)
    return o


def _barre(c, nom, a, b, epaisseur, mat):
    """Une barre de section carree de a a b (points du monde) : main courante, montant incline."""
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


# --- la coque -------------------------------------------------------------------------------------------------------

def _cadre(c, nom="FRAME", coupe=False, ouvert=False):
    """Le cadre graphite. coupe : sans le longeron haut avant, qui barrerait la vue au-dessus des tetes (MB_13, A).
    ouvert : sans ses deux longerons hauts, pour une grappe de conteneurs accoles par le long pan (v002)."""
    l, w = LONG / 2 - CADRE / 2, LARGE / 2 - CADRE / 2
    morceaux = [c.boite(P + nom + "_POST_%d" % i, (CADRE, CADRE, HAUT), (x, y, 0), mat="MAT_PAINTED_METAL_GRAPHITE",
                        chanfrein=C2, segments=2) for i, (x, y) in enumerate(((-l, -w), (l, -w), (l, w), (-l, w)))]
    for k, z in enumerate((0, HAUT - CADRE)):
        for s, y in enumerate((-w, w)):
            if k == 1 and (ouvert or (coupe and s == 0)):
                continue
            morceaux.append(c.boite(P + nom + "_RAIL_%d%d" % (k, s), (INT_LONG, CADRE, CADRE), (0, y, z),
                                    mat="MAT_PAINTED_METAL_GRAPHITE", chanfrein=C2, segments=2, droites=("x-", "x+")))
        for s, x in enumerate((-l, l)):
            morceaux.append(c.boite(P + nom + "_END_%d%d" % (k, s), (CADRE, INT_LARGE, CADRE), (x, 0, z),
                                    mat="MAT_PAINTED_METAL_GRAPHITE", chanfrein=C2, segments=2, droites=("y-", "y+")))
    _piece(c, nom, morceaux)


def _menuiserie_fenetre(c, nom, x, y_nu, z_bas, rotation=0):
    """Cadre aluminium et verre opaque d'une baie de 1,50 x 1,50, en retrait de 0,02 du nu, sur la face -Y d'une paroi
    centree en x ; rotation pour une paroi de bout."""
    l, h = FENETRE
    cadre = c.boite(nom + "_FRAME", (l, 0.10, h), (x, y_nu + 0.02 + 0.05, z_bas), mat="MAT_ALUMINIUM")
    c.perce(cadre, (l - 0.20, 0.30, h - 0.20), (x, y_nu + 0.07, z_bas + 0.10))
    c.chanfreine(cadre, C1, 2)
    verre = c.boite(nom + "_GLASS", (l - 0.20, 0.03, h - 0.20), (x, y_nu + 0.09, z_bas + 0.10), mat="MAT_GLASS")
    return [cadre, verre]


def _paroi_long(c, nom, porte=False, fenetres=(), coupe=False):
    """Paroi de long pan, face avant (-Y) : panneau, liseret, baies. Le liseret saute la porte et les fenetres.
    coupe : la paroi des conteneurs habites, coupee a l'allege, sans baie ni liseret (MB_13, variante A)."""
    y_centre = -NU + PANNEAU / 2
    if coupe:
        panneau = c.boite(P + nom, (INT_LONG, PANNEAU, ALLEGE), (0, y_centre, PLANCHER), mat="MAT_SURFACE")
        return _piece(c, nom, [panneau], lisser=False)
    panneau = c.boite(P + nom, (INT_LONG, PANNEAU, H_PAROI), (0, y_centre, PLANCHER), mat="MAT_SURFACE")
    trous = []
    if porte:
        trous.append((X_PORTE, PORTE[0]))
        c.perce(panneau, (PORTE[0], 1.0, PORTE[1] + 0.1), (X_PORTE, y_centre, PLANCHER - 0.1))
    for x in fenetres:
        trous.append((x, FENETRE[0]))
        c.perce(panneau, (FENETRE[0], 1.0, FENETRE[1]), (x, y_centre, PLANCHER + ALLEGE))
    morceaux = [panneau]
    # le liseret bleu, en troncons entre les baies (elles montent a 2,60 m, juste sous lui)
    morceaux += _lisere(c, nom, -INT_LONG / 2, INT_LONG / 2, -NU - 0.02, trous, long_pan=True)
    if porte:
        morceaux += _menuiserie_porte(c, P + nom, X_PORTE, -NU)
    for k, x in enumerate(fenetres):
        morceaux += _menuiserie_fenetre(c, P + nom + "_W%d" % k, x, -NU, PLANCHER + ALLEGE)
    return _piece(c, nom, morceaux, lisser=False)


def _menuiserie_porte(c, nom, x, y_nu):
    """Cadre aluminium et vantail graphite d'une porte de 1,10 x 2,40, sur la face -Y d'une paroi, centree en x."""
    l, h = PORTE
    cadre = c.boite(nom + "_DOOR_FRAME", (l, 0.12, h), (x, y_nu + 0.06, PLANCHER), mat="MAT_ALUMINIUM")
    c.perce(cadre, (l - 0.16, 0.40, h + 0.1 - 0.08), (x, y_nu + 0.06, PLANCHER - 0.1))
    c.chanfreine(cadre, C1, 2)
    vantail = c.boite(nom + "_DOOR_LEAF", (l - 0.16, 0.05, h - 0.08), (x, y_nu + 0.07, PLANCHER), mat="MAT_PAINTED_METAL_GRAPHITE")
    return [cadre, vantail]


def _vers_bout(c, objets):
    """Menuiseries modelees face -Y, tournees d'un quart de tour autour de l'origine du conteneur vers +X."""
    for o in objets:
        x, y, z = o.location
        o.location = (-y, x, z)
        o.rotation_euler[2] = math.radians(90)
        c.applique(o)
    return objets


def _lisere(c, nom, x0, x1, y, trous, long_pan):
    """Troncons du liseret entre x0 et x1, interrompus au droit des baies (x, largeur)."""
    coupes = sorted((x - l / 2 - 0.05, x + l / 2 + 0.05) for x, l in trous)
    bords, debut = [], x0
    for a, b in coupes:
        if a > debut:
            bords.append((debut, a))
        debut = max(debut, b)
    if debut < x1:
        bords.append((debut, x1))
    morceaux = []
    for k, (a, b) in enumerate(bords):
        if b - a < 0.15:
            continue
        taille = (b - a, 0.04, LISERE[1]) if long_pan else (0.04, b - a, LISERE[1])
        pos = ((a + b) / 2, y + 0.02, LISERE[0]) if long_pan else (y - 0.02, (a + b) / 2, LISERE[0])
        morceaux.append(c.boite(P + nom + "_ACCENT_%d" % k, taille, pos, mat="MAT_TECH"))
    return morceaux


def _paroi_bout(c, nom, fenetre=False, porte=False):
    """Paroi de bout, face droite (+X) : panneau, liseret, une fenetre ou une porte centree si demande.
    La porte de bout est l'entree des conteneurs habites, dont le long pan avant est coupe."""
    x_centre = NU_BOUT - PANNEAU / 2
    panneau = c.boite(P + nom, (PANNEAU, INT_LARGE, H_PAROI), (x_centre, 0, PLANCHER), mat="MAT_SURFACE")
    morceaux = [panneau]
    trous = []
    if fenetre:
        trous.append((0.0, FENETRE[0]))
        c.perce(panneau, (1.0, FENETRE[0], FENETRE[1]), (x_centre, 0, PLANCHER + ALLEGE))
        morceaux += _vers_bout(c, _menuiserie_fenetre(c, P + nom + "_W0", 0, -NU_BOUT, PLANCHER + ALLEGE))
    if porte:
        trous.append((0.0, PORTE[0]))
        c.perce(panneau, (1.0, PORTE[0], PORTE[1] + 0.1), (x_centre, 0, PLANCHER - 0.1))
        morceaux += _vers_bout(c, _menuiserie_porte(c, P + nom, 0, -NU_BOUT))
    morceaux += _lisere(c, nom, -INT_LARGE / 2, INT_LARGE / 2, NU_BOUT + 0.02, trous, long_pan=False)
    return _piece(c, nom, morceaux, lisser=False)


def _nervures(c, nom, longueur, trous, long_pan, coupe=False):
    """Nervures verticales tous les PAS_NERVURE, sauf au droit des baies ; du plancher au liseret (a l'allege si coupe)."""
    n = int((longueur - 0.30) / PAS_NERVURE) + 1
    depart = -(n - 1) * PAS_NERVURE / 2
    h = ALLEGE - 0.10 if coupe else LISERE[0] - PLANCHER - 0.10
    morceaux = []
    for k in range(n):
        x = depart + k * PAS_NERVURE
        if any(abs(x - xt) < lt / 2 + 0.10 for xt, lt in trous):
            continue
        if long_pan:
            taille, pos = (NERVURE[0], NERVURE[1], h), (x, -NU - NERVURE[1] / 2, PLANCHER + 0.05)
        else:
            taille, pos = (NERVURE[1], NERVURE[0], h), (NU_BOUT + NERVURE[1] / 2, x, PLANCHER + 0.05)
        morceaux.append(c.boite(P + nom + "_%02d" % k, taille, pos, mat="MAT_SURFACE"))
    return _piece(c, nom, morceaux, lisser=False)


def _coque(c):
    _cadre(c)
    _cadre(c, "FRAME_CUT", coupe=True)
    _cadre(c, "FRAME_OPEN", ouvert=True)
    _piece(c, "FLOOR", [c.boite(P + "FLOOR", (INT_LONG, INT_LARGE, PLANCHER), mat="MAT_CONCRETE")], lisser=False)
    _piece(c, "ROOF", [c.boite(P + "ROOF", (INT_LONG, INT_LARGE, 0.15), (0, 0, HAUT - 0.20), mat="MAT_SURFACE")],
           lisser=False)
    _paroi_long(c, "WALL_LONG")
    _paroi_long(c, "WALL_LONG_DOOR", porte=True, fenetres=(X_FENETRE,))
    _paroi_long(c, "WALL_LONG_WINDOW", fenetres=X_FENETRES_ARRIERE)
    _paroi_bout(c, "WALL_END")
    _paroi_bout(c, "WALL_END_WINDOW", fenetre=True)
    _paroi_bout(c, "WALL_END_DOOR", porte=True)
    _paroi_long(c, "WALL_LONG_CUT", coupe=True)
    _nervures(c, "RIBS_LONG", INT_LONG, [], True)
    _nervures(c, "RIBS_LONG_DOOR", INT_LONG, [(X_PORTE, PORTE[0]), (X_FENETRE, FENETRE[0])], True)
    _nervures(c, "RIBS_LONG_WINDOW", INT_LONG, [(x, FENETRE[0]) for x in X_FENETRES_ARRIERE], True)
    _nervures(c, "RIBS_END", INT_LARGE, [], False)
    _nervures(c, "RIBS_END_WINDOW", INT_LARGE, [(0.0, FENETRE[0])], False)
    _nervures(c, "RIBS_END_DOOR", INT_LARGE, [(0.0, PORTE[0])], False)
    _nervures(c, "RIBS_LONG_CUT", INT_LONG, [], True, coupe=True)

    # deux marches devant la porte (plancher a 0,20 m) : origine au pied de la paroi, au droit de la porte
    marches = c.prisme(P + "STEPS", [(0, 0), (0, PLANCHER), (0.30, PLANCHER), (0.30, PLANCHER / 2), (0.60, PLANCHER / 2),
                                     (0.60, 0)], 1.40, mat="MAT_PAINTED_METAL_GRAPHITE")
    c.chanfreine(marches, C1, 2, droites=("x-",))
    marches.rotation_euler[2] = math.radians(-90)
    c.applique(marches)
    marches.location = (-0.70, 0, 0)
    _piece(c, "STEPS", [marches])


# --- l'empilement : escalier droit le long du bout droit, coursive devant le conteneur du haut -------------------------

def _empilement(c):
    acier = "MAT_STEEL"
    haut = HAUT + PLANCHER  # plancher du conteneur du haut
    n = round(haut / MARCHE)
    largeur = 1.15
    x0 = LONG / 2 + 0.05  # contre le bout droit
    y_haut = -LARGE / 2  # la derniere contremarche arrive au bord de la coursive
    profil = [(0, 0)]
    for k in range(n):
        profil += [(k * GIRON, (k + 1) * MARCHE), ((k + 1) * GIRON, (k + 1) * MARCHE)]
    profil = profil[:-1]  # la derniere marche est la coursive
    profil += [((n - 1) * GIRON, haut - 0.30), (0.40, 0)]
    volee = c.prisme(P + "STAIR", profil, largeur, mat=acier)
    c.chanfreine(volee, C1, 2)
    volee.rotation_euler[2] = math.radians(-90)  # x du profil vers -Y, epaisseur vers +X
    c.applique(volee)
    run = (n - 1) * GIRON
    volee.location = (x0, y_haut + run, 0)
    morceaux = [volee]
    pente = math.atan2(haut, run)
    for k, x in enumerate((x0 + TUBE / 2, x0 + largeur - TUBE / 2)):
        bas = (x, y_haut + run, GARDE_CORPS)
        sommet = (x, y_haut, haut + GARDE_CORPS)
        morceaux.append(_barre(c, P + "STAIR_RAIL_%d" % k, bas, sommet, TUBE, acier))
        morceaux.append(_barre(c, P + "STAIR_MID_%d" % k, (x, y_haut + run, GARDE_CORPS / 2), (x, y_haut, haut + GARDE_CORPS / 2), TUBE,
                               acier))
        for j, t in enumerate((0.0, 0.5, 1.0)):
            y = y_haut + run * (1 - t)
            z = haut * t
            morceaux.append(c.boite(P + "STAIR_POST_%d%d" % (k, j), (TUBE, TUBE, GARDE_CORPS), (x, y, z), mat=acier))
    _piece(c, "STAIR", morceaux)
    del pente

    # coursive : du bout gauche jusqu'au-dessus de l'escalier ; poteaux au sol ; garde-corps cote vide et aux bouts
    x_g, x_d = -LONG / 2, x0 + largeur
    y_i, y_e = -LARGE / 2, -LARGE / 2 - COURSIVE
    epais = 0.15
    morceaux = [c.boite(P + "WALKWAY", (x_d - x_g, COURSIVE, epais), ((x_g + x_d) / 2, (y_i + y_e) / 2, haut - epais), mat=acier,
                        chanfrein=C1, segments=2)]
    for k, x in enumerate((x_g + 0.10, 0.0, LONG / 2 - 0.10, x_d - 0.10)):
        morceaux.append(c.boite(P + "WALKWAY_LEG_%d" % k, (0.14, 0.14, haut - epais), (x, y_e + 0.10, 0), mat="MAT_PAINTED_METAL_GRAPHITE",
                                chanfrein=C1, segments=2))
    ye = y_e + TUBE / 2
    for nom, a, b in (("FRONT", (x_g, ye), (x_d, ye)), ("LEFT", (x_g + TUBE / 2, y_i), (x_g + TUBE / 2, y_e)),
                      ("RIGHT", (x_d - TUBE / 2, y_i - 0.0), (x_d - TUBE / 2, y_e))):
        for j, z in enumerate((GARDE_CORPS - TUBE, GARDE_CORPS / 2 - TUBE / 2)):
            morceaux.append(_barre(c, P + "WALKWAY_%s_%d" % (nom, j), (a[0], a[1], haut + z + TUBE / 2), (b[0], b[1], haut + z + TUBE / 2),
                                   TUBE, acier))
    for k, x in enumerate((x_g + TUBE / 2, -LONG / 4, 0.0, LONG / 4, x_d - TUBE / 2)):
        morceaux.append(c.boite(P + "WALKWAY_POST_%d" % k, (TUBE, TUBE, GARDE_CORPS), (x, ye, haut), mat=acier))
    morceaux.append(c.boite(P + "WALKWAY_POST_L", (TUBE, TUBE, GARDE_CORPS), (x_g + TUBE / 2, y_i - 0.05, haut), mat=acier))
    _piece(c, "WALKWAY", morceaux)


# --- le mobilier (x 1,2 ; rien sous 0,15 m, sauf le filiforme a 0,06 m) ------------------------------------------------

def _mobilier_architecte(c):
    g = "MAT_PAINTED_METAL_GRAPHITE"
    # table a dessin : deux treteaux, plateau de 1,80 x 1,10 incline a 30 degres qui monte vers l'arriere, a ~1,0 m
    a = math.radians(30)
    plateau = c.boite(P + "DRAFTING_TABLE", (1.80, 1.10, 0.05), (0, 0, -0.025), mat="MAT_WOOD", chanfrein=C1, segments=2)
    plateau.rotation_euler[0] = a
    c.applique(plateau)
    plateau.location = (0, 0, 1.00)
    morceaux = [plateau]
    feuille = c.boite(P + "DRAFTING_SHEET", (1.30, 0.85, 0.01), (0, 0, 0.0), mat="MAT_SURFACE")
    feuille.rotation_euler[0] = a
    c.applique(feuille)
    feuille.location = (0.10, 0, 1.01)
    morceaux.append(feuille)
    for k, x in enumerate((-0.75, 0.75)):
        morceaux.append(_barre(c, P + "DRAFTING_LEG_F%d" % k, (x, -0.45, 0), (x, -0.05, 0.80), 0.06, g))
        morceaux.append(_barre(c, P + "DRAFTING_LEG_B%d" % k, (x, 0.45, 0), (x, -0.05, 0.80), 0.06, g))
        morceaux.append(c.boite(P + "DRAFTING_FOOT_%d" % k, (0.08, 1.00, 0.06), (x, 0, 0), mat=g))
    morceaux.append(c.boite(P + "DRAFTING_BAR", (1.56, 0.06, 0.06), (0, -0.05, 0.40), mat=g))
    table = _piece(c, "DRAFTING_TABLE", morceaux)

    # la regle parallele : couchee sur le plateau ; son pivot est a mi-pente, son axe y suit la pente
    ruler = c.pivot(P + "DRAFTING_RULER", (0, 0, 1.03))
    ruler.rotation_euler[0] = a
    regle = c.boite(P + "DRAFTING_RULER_BAR", (1.70, 0.10, 0.04), (0, 0, 0), mat=g)
    regle.rotation_euler[0] = a
    c.applique(regle)
    regle.location = (0, 0, 1.03)
    regle.name = regle.data.name = P + "DRAFTING_RULER_BAR"
    c.rattache(regle, ruler)
    c.rattache(ruler, table)

    # la lampe d'architecte : pince au coin arriere gauche, deux bras, abat-jour ; tourne autour de Z (pivot a la pince)
    pince = (-0.85, 0.40, 1.25)
    lampe = c.pivot(P + "DRAFTING_LAMP", pince)
    coude = (pince[0], pince[1] - 0.05, pince[2] + 0.55)
    tete = (pince[0] + 0.45, pince[1] - 0.25, pince[2] + 0.45)
    bras = [c.boite(P + "DRAFTING_LAMP_CLAMP", (0.12, 0.12, 0.12), (pince[0], pince[1], pince[2] - 0.12), mat=g),
            _barre(c, P + "DRAFTING_LAMP_ARM1", pince, coude, 0.06, g),
            _barre(c, P + "DRAFTING_LAMP_ARM2", coude, tete, 0.06, g)]
    abat = c.cylindre(P + "DRAFTING_LAMP_SHADE", 0.16, 0.22, (tete[0], tete[1], tete[2] - 0.22), mat=g, cotes=12)
    bras.append(abat)
    corps = c.fusionne(P + "DRAFTING_LAMP_BODY", bras)
    c.lisse(corps)
    c.rattache(corps, lampe)
    c.rattache(lampe, table)

    # panneau de plans : cadre bois et trois feuilles claires, accroche au mur (origine au pied du mur, face -Y)
    morceaux = [c.boite(P + "PLAN_BOARD", (2.00, 0.05, 1.20), (0, -0.025, 1.00), mat="MAT_WOOD", chanfrein=C1, segments=2)]
    for k, (x, l, h) in enumerate(((-0.62, 0.55, 0.80), (0.02, 0.62, 0.95), (0.63, 0.50, 0.70))):
        morceaux.append(c.boite(P + "PLAN_BOARD_SHEET_%d" % k, (l, 0.02, h), (x, -0.06, 1.10 + (0.95 - h) / 2), mat="MAT_SURFACE"))
    _piece(c, "PLAN_BOARD", morceaux)

    # table ronde et maquette blanche (posee a part : son origine est sur le plateau)
    _piece(c, "ROUND_TABLE", [
        c.cylindre(P + "ROUND_TABLE", 0.60, 0.05, (0, 0, 0.72), mat="MAT_WOOD", cotes=20),
        c.cylindre(P + "ROUND_TABLE_STEM", 0.06, 0.72, (0, 0, 0), mat=g, cotes=8),
        c.cylindre(P + "ROUND_TABLE_BASE", 0.30, 0.04, (0, 0, 0), mat=g, cotes=16),
    ])
    _piece(c, "MODEL", [
        c.boite(P + "MODEL", (0.62, 0.48, 0.04), mat="MAT_SURFACE"),
        c.boite(P + "MODEL_BLOCK_0", (0.42, 0.34, 0.20), (-0.06, 0.02, 0.04), mat="MAT_SURFACE", chanfrein=C1, segments=2),
        c.boite(P + "MODEL_BLOCK_1", (0.26, 0.30, 0.18), (0.08, 0.02, 0.24), mat="MAT_SURFACE", chanfrein=C1, segments=2),
    ])

    # panier de rouleaux de plans
    rouleaux = [c.cylindre(P + "PLAN_ROLLS", 0.22, 0.45, mat=g, cotes=12)]
    for k, (dx, dy, tilt) in enumerate(((-0.08, -0.06, 8), (0.07, -0.05, -10), (0.0, 0.08, 4), (0.10, 0.07, 12))):
        r = c.cylindre(P + "PLAN_ROLLS_%d" % k, 0.06, 0.95, (0, 0, -0.475), mat="MAT_SURFACE", cotes=8)
        r.rotation_euler[0] = math.radians(tilt)
        c.applique(r)
        r.location = (dx, dy, 0.55)
        rouleaux.append(r)
    _piece(c, "PLAN_ROLLS", rouleaux)


def _mobilier_bureau(c):
    g = "MAT_PAINTED_METAL_GRAPHITE"
    # poste de travail : plateau bois, pieds graphite a gauche, caisson a droite ; on s'assoit cote -Y
    _piece(c, "DESK", [
        c.boite(P + "DESK", (1.60, 0.80, 0.05), (0, 0, 0.72), mat="MAT_WOOD", chanfrein=C1, segments=2),
        c.boite(P + "DESK_LEG", (0.06, 0.70, 0.72), (-0.74, 0, 0), mat=g),
        c.boite(P + "DESK_DRAWERS", (0.46, 0.66, 0.68), (0.52, 0.02, 0.02), mat=g, chanfrein=C1, segments=2),
    ])
    _piece(c, "SCREEN", [
        c.boite(P + "SCREEN", (0.72, 0.05, 0.44), (0, 0, 0.16), mat=g, chanfrein=C1, segments=2),
        c.boite(P + "SCREEN_FACE", (0.64, 0.02, 0.36), (0, -0.03, 0.20), mat="MAT_TECH"),
        c.boite(P + "SCREEN_STAND", (0.08, 0.08, 0.18), (0, 0.04, 0), mat=g),
        c.boite(P + "SCREEN_FOOT", (0.30, 0.22, 0.02), (0, 0.02, 0), mat=g),
    ])
    _piece(c, "CHAIR", [
        c.boite(P + "CHAIR", (0.52, 0.50, 0.09), (0, 0, 0.44), mat=g, chanfrein=C1, segments=2),
        c.boite(P + "CHAIR_BACK", (0.50, 0.08, 0.52), (0, -0.24, 0.56), mat=g, chanfrein=C1, segments=2),
        c.cylindre(P + "CHAIR_STEM", 0.04, 0.44, mat=g, cotes=8),
        c.cylindre(P + "CHAIR_BASE", 0.30, 0.05, mat=g, cotes=10),
    ])
    _piece(c, "PARTITION", [c.boite(P + "PARTITION", (1.60, 0.06, 1.20), mat="MAT_SURFACE", chanfrein=C1, segments=2),
                            c.boite(P + "PARTITION_CAP", (1.62, 0.08, 0.04), (0, 0, 1.20), mat="MAT_ALUMINIUM")])
    # etagere : montants, quatre tablettes, classeurs et boites
    morceaux = []
    for k, x in enumerate((-0.88, 0.88)):
        morceaux.append(c.boite(P + "SHELF_SIDE_%d" % k, (0.04, 0.45, 2.00), (x, 0, 0), mat=g))
    for k in range(4):
        morceaux.append(c.boite(P + "SHELF_BOARD_%d" % k, (1.76, 0.45, 0.04), (0, 0, 0.10 + k * 0.58), mat=g))
    contenu = [(-0.45, 0, 0.14, (0.70, 0.34, 0.34), "MAT_SURFACE"), (0.40, 0, 0.14, (0.60, 0.36, 0.30), "MAT_WOOD"),
               (-0.30, 0, 0.72, (0.90, 0.34, 0.36), "MAT_SURFACE"), (0.50, 0, 0.72, (0.40, 0.36, 0.28), "MAT_WOOD"),
               (0.15, 0, 1.30, (1.10, 0.34, 0.36), "MAT_SURFACE")]
    for k, (x, y, z, taille, mat) in enumerate(contenu):
        morceaux.append(c.boite(P + "SHELF_ITEM_%d" % k, taille, (x, y, z), mat=mat))
    _piece(c, "SHELF", morceaux, lisser=False)


def _mobilier_client(c):
    g = "MAT_PAINTED_METAL_GRAPHITE"
    _piece(c, "MEETING_TABLE", [
        c.boite(P + "MEETING_TABLE", (1.80, 0.90, 0.06), (0, 0, 0.72), mat="MAT_WOOD", chanfrein=C1, segments=2),
        c.boite(P + "MEETING_TABLE_LEG_0", (0.08, 0.70, 0.72), (-0.70, 0, 0), mat=g),
        c.boite(P + "MEETING_TABLE_LEG_1", (0.08, 0.70, 0.72), (0.70, 0, 0), mat=g),
    ])
    _piece(c, "ARMCHAIR", [
        c.boite(P + "ARMCHAIR", (0.80, 0.78, 0.42), mat=g, chanfrein=0.06, segments=3),
        c.boite(P + "ARMCHAIR_BACK", (0.80, 0.20, 0.42), (0, 0.29, 0.42), mat=g, chanfrein=0.05, segments=3),
        c.boite(P + "ARMCHAIR_ARM_0", (0.16, 0.58, 0.20), (-0.32, 0.10, 0.42), mat=g, chanfrein=0.04, segments=3),
        c.boite(P + "ARMCHAIR_ARM_1", (0.16, 0.58, 0.20), (0.32, 0.10, 0.42), mat=g, chanfrein=0.04, segments=3),
    ])
    pot = c.cylindre(P + "PLANT", 0.22, 0.45, mat=g, cotes=12)
    _piece(c, "PLANT", [pot, _boule(c, P + "PLANT_LEAVES_0", 0.36, (0, 0, 0.85), "MAT_LANDSCAPE", 1.1),
                        _boule(c, P + "PLANT_LEAVES_1", 0.24, (0.12, -0.08, 1.20), "MAT_LANDSCAPE")])


def _mobilier_controle(c):
    g = "MAT_PAINTED_METAL_GRAPHITE"
    # armoire de mesure : caisson graphite, ecran bleu tech et trois boutons a l'avant
    morceaux = [c.boite(P + "MEASURE_CABINET", (0.90, 0.60, 1.90), mat=g, chanfrein=C2, segments=2),
                c.boite(P + "MEASURE_CABINET_SCREEN", (0.56, 0.03, 0.38), (0, -0.31, 1.30), mat="MAT_TECH")]
    for k, x in enumerate((-0.22, 0.0, 0.22)):
        b = c.cylindre(P + "MEASURE_CABINET_KNOB_%d" % k, 0.075, 0.05, (0, 0, -0.025), mat="MAT_ALUMINIUM", cotes=10)
        b.rotation_euler[0] = math.radians(90)
        c.applique(b)
        b.location = (x, -0.32, 0.95)
        morceaux.append(b)
    _piece(c, "MEASURE_CABINET", morceaux)
    # trepied de mesure : trois pieds bois, tete graphite, instrument
    tete = (0, 0, 1.40)
    morceaux = [c.boite(P + "TRIPOD", (0.22, 0.22, 0.10), (0, 0, 1.40), mat=g, chanfrein=C1, segments=2)]
    for k in range(3):
        a = math.radians(90 + k * 120)
        morceaux.append(_barre(c, P + "TRIPOD_LEG_%d" % k, (0.50 * math.cos(a), 0.50 * math.sin(a), 0), tete, 0.06, "MAT_WOOD"))
    morceaux.append(c.boite(P + "TRIPOD_HEAD", (0.24, 0.34, 0.24), (0, 0, 1.50), mat=g, chanfrein=C1, segments=2))
    morceaux.append(c.boite(P + "TRIPOD_LENS", (0.16, 0.10, 0.16), (0, -0.21, 1.54), mat="MAT_TECH"))
    _piece(c, "TRIPOD", morceaux)
    # le tampon : un gros tampon de bureau (une forme, sans texte) ; la tete descend a chaque preuve (pivot)
    socle = c.boite(P + "STAMP", (0.50, 0.40, 0.06), mat=g, chanfrein=C1, segments=2)
    pad = c.boite(P + "STAMP_PAD", (0.30, 0.26, 0.03), (0, 0, 0.06), mat="MAT_SURFACE")
    stamp = _piece(c, "STAMP", [socle, pad])
    tete_p = c.pivot(P + "STAMP_HEAD", (0, 0, 0.30))
    poignee = c.fusionne(P + "STAMP_HEAD_BODY", [
        c.boite(P + "STAMP_HEAD_BODY", (0.26, 0.22, 0.12), (0, 0, 0.30), mat=g, chanfrein=C1, segments=2),
        c.cylindre(P + "STAMP_HEAD_STEM", 0.04, 0.16, (0, 0, 0.42), mat="MAT_WOOD", cotes=8),
        c.cylindre(P + "STAMP_HEAD_KNOB", 0.09, 0.12, (0, 0, 0.56), mat="MAT_WOOD", cotes=12),
    ])
    c.lisse(poignee)
    c.rattache(poignee, tete_p)
    c.rattache(tete_p, stamp)


def _mobilier_coordination(c):
    g = "MAT_PAINTED_METAL_GRAPHITE"
    # tableau de planning sur pieds, sans texte : fond graphite, barres claires de longueurs variees (un Gantt muet)
    morceaux = [c.boite(P + "PLANNING_BOARD", (2.40, 0.08, 1.40), (0, 0, 0.90), mat=g, chanfrein=C1, segments=2)]
    for k, x in enumerate((-1.10, 1.10)):
        morceaux.append(c.boite(P + "PLANNING_BOARD_POST_%d" % k, (0.10, 0.10, 2.30), (x, 0.05, 0), mat=g))
    barres = [(-0.70, 0.90, "MAT_SURFACE"), (-0.20, 1.10, "MAT_SURFACE"), (0.30, 0.80, "MAT_WOOD"), (-0.40, 1.30, "MAT_SURFACE"),
              (0.55, 0.70, "MAT_WOOD")]
    for k, (x, l, mat) in enumerate(barres):
        morceaux.append(c.boite(P + "PLANNING_BOARD_BAR_%d" % k, (l, 0.03, 0.15), (x, -0.05, 2.02 - k * 0.24), mat=mat))
    _piece(c, "PLANNING_BOARD", morceaux)
    # bac de verdure exterieur
    _piece(c, "PLANTER", [c.boite(P + "PLANTER", (1.20, 0.50, 0.50), mat="MAT_CONCRETE", chanfrein=C2, segments=2),
                          _boule(c, P + "PLANTER_LEAVES_0", 0.34, (-0.28, 0, 0.62), "MAT_LANDSCAPE", 0.8),
                          _boule(c, P + "PLANTER_LEAVES_1", 0.30, (0.30, 0.02, 0.60), "MAT_LANDSCAPE", 0.8)])


def construit(c):
    _coque(c)
    _empilement(c)
    _mobilier_architecte(c)
    _mobilier_bureau(c)
    _mobilier_client(c)
    _mobilier_controle(c)
    _mobilier_coordination(c)
    return {"triangles_vises": 12000, "animations": []}


def demonstration():
    """La demonstration du kit, quatre stands sur leurs socles (Blender : Z vertical, avant vers -Y) :
    - un conteneur ferme (porte, fenetres, marches, bac de verdure) ;
    - deux conteneurs empiles, avec escalier et coursive, et le tableau de planning ;
    - le mobilier des bureaux, aligne ;
    - un bureau d'architecte en coupe (MB_13, variante A) : sans toit, long pan avant coupe a l'allege, cadre sans
      longeron haut avant, entree par le bout droit."""
    pieces = []

    def pose(piece, x, y, z=0.0, rotation=0):
        pieces.append({"piece": P + piece, "position": [round(x, 3), round(y, 3), round(z, 3)], "rotation": rotation % 360})

    def conteneur(x, y, z, avant="WALL_LONG_DOOR", arriere="WALL_LONG_WINDOW", droite="WALL_END_WINDOW", gauche="WALL_END"):
        for piece in ("FRAME", "FLOOR", "ROOF"):
            pose(piece, x, y, z)
        for paroi, rot in ((avant, 0), (arriere, 180), (droite, 0), (gauche, 180)):
            pose(paroi, x, y, z, rot)
            pose(paroi.replace("WALL", "RIBS"), x, y, z, rot)

    socles = []
    # 1. le conteneur ferme
    conteneur(0, 0, 0)
    pose("STEPS", X_PORTE, -NU, 0)
    pose("PLANTER", 1.0, -2.30)
    socles.append({"taille": [9.6, 6.4, 0.60], "centre": [0.0, -0.4]})

    # 2. deux conteneurs empiles, escalier et coursive
    ox = 12.5
    conteneur(ox, 0, 0)
    conteneur(ox, 0, HAUT)
    pose("STEPS", ox + X_PORTE, -NU, 0)
    pose("STAIR", ox, 0, 0)
    pose("WALKWAY", ox, 0, 0)
    pose("PLANNING_BOARD", ox + 1.2, -3.6)
    socles.append({"taille": [11.6, 7.6, 0.60], "centre": [ox + 0.7, -0.8]})

    # 3. le mobilier, en rang (le sol des conteneurs est a PLANCHER : ici, il est pose sur le socle)
    oy = -9.0
    rang = [("DRAFTING_TABLE", -5.0), ("PLAN_BOARD", -2.4), ("ROUND_TABLE", -0.4), ("PLAN_ROLLS", 1.0), ("SHELF", 2.6),
            ("DESK", 5.0), ("PARTITION", 5.0)]
    for piece, x in rang:
        pose(piece, x, oy + (0.6 if piece == "PARTITION" else 0))
    pose("MODEL", -0.4, oy, 0.77)
    pose("SCREEN", 5.0, oy + 0.15, 0.77)
    pose("CHAIR", 5.0, oy - 0.75, 0)
    rang2 = [("MEETING_TABLE", -4.6), ("ARMCHAIR", -2.6), ("PLANT", -1.4), ("MEASURE_CABINET", 0.2), ("TRIPOD", 1.8),
             ("DESK", 3.8)]
    for piece, x in rang2:
        pose(piece, x, oy - 2.6)
    pose("STAMP", 3.4, oy - 2.6, 0.77)
    socles.append({"taille": [13.0, 6.0, 0.60], "centre": [0.0, oy - 1.2]})

    # 4. le bureau d'architecte en coupe
    ox, oy = 12.5, -10.0
    for piece in ("FRAME_CUT", "FLOOR"):
        pose(piece, ox, oy)
    for paroi, rot in (("WALL_LONG_CUT", 0), ("WALL_LONG", 180), ("WALL_END_DOOR", 0), ("WALL_END", 180)):
        pose(paroi, ox, oy, 0, rot)
        pose(paroi.replace("WALL", "RIBS"), ox, oy, 0, rot)
    pose("STEPS", ox + NU_BOUT, oy, 0, 90)
    z = PLANCHER
    for piece, x, y, zz, rot in (("PLAN_BOARD", 0.9, 1.37, z, 0), ("DRAFTING_TABLE", 0.9, 0.60, z, 0),
                                 ("PLAN_ROLLS", 2.8, 1.05, z, 0), ("SHELF", -3.2, -0.55, z, 90), ("DESK", -2.0, 0.85, z, 0),
                                 ("SCREEN", -2.0, 1.00, z + 0.77, 0), ("CHAIR", -2.0, 0.15, z, 0),
                                 ("ROUND_TABLE", -0.4, -0.15, z, 0), ("MODEL", -0.4, -0.15, z + 0.77, 0)):
        pose(piece, ox + x, oy + y, zz, rot)
    pose("PLANTER", ox + 1.6, oy - 2.25)
    socles.append({"taille": [9.6, 6.4, 0.60], "centre": [ox + 0.3, oy - 0.4]})

    for s in socles:
        s.update({"materiau": "MAT_EARTH", "chanfrein": 0.10})
    return {"prefixe": P, "socles": socles, "pieces": pieces}
