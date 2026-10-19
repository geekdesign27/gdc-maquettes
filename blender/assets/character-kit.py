"""Le personnage maitre (catalogue : character-kit), deuxieme etalon de l'atelier. Bible WORKSITE, sections 2.5, 5,
17.4 et 18.3 ; decision de PA du 19 octobre 2026 : 1,70 m et 5 tetes (une tete = 0,34 m).

Le kit : un corps commun (proportions validees par PA le 19 octobre 2026) et, par personne de equipe.json, une
coiffure, une tenue de metier, un outil et ses couleurs (decision de PA du 19 octobre 2026 : chaque personne a son
personnage ; l'equipe se lit au casque et au gilet, le metier a la tenue et a l'outil ; femmes et hommes, teints et
coiffures varies). Le visage suit REF_CHR_001 et MB_04, les tenues MB_05. Fichiers : CHR_BASE_MASTER (corps, visage,
casque, squelette, animations), CHR_HAIR_KIT (coiffures, barbe, lunettes), une CHR_OUTFIT_<METIER> par metier et
PRP_CHR_TOOLS (les outils) ; un seul squelette, RIG_CHR_BASE, sur lequel le composant rebranche les pieces.

Construction : des fuseaux a sections elliptiques (tronc, bras, jambes, cou, tete, mains, chaussures), reunis en un
seul maillage deforme par le squelette, normales lissees partout (bible 18.3 : les personnages n'ont pas de classe de
chanfrein). Les poids suivent chaque fuseau, avec un fondu aux articulations. Cheveux, yeux et casque sont des noeuds
a part, rattaches a l'os de la tete : le casque se montre ou se cache (le client n'en porte pas).

Pose de repos : en A, bras ecartes de 10 degres. Axes des os : Y le long de l'os, Z vers l'avant du personnage (-Y),
sauf le pied (Z vers le haut). Les angles s'appliquent dans l'ordre Y, X, Z : Y tourne l'os sur son axe (bras gauche :
rotation interne ; tete : regard vers la gauche), X plie vers l'avant partout (flexion), puis Z, autour de l'axe avant
de repos, ecarte le membre gauche pendant (et le rapproche une fois leve au-dessus de la tete). Les poses s'ecrivent
cote gauche et se recopient en miroir.

Animations : voir CLIPS, en bas du fichier (duree, boucle, posture de depart et mouvement des mains de chacune).
Dans l'atelier seulement, des variables d'environnement choisissent la vue (voir vue_atelier) : GDC_ATELIER_CLIP,
GDC_ATELIER_CASQUE=0 et GDC_ATELIER_PERSONNE=<id de equipe.json>.
"""
import json
import math
import os
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector

ASSET = {"id": "character-kit", "categorie": "kit", "nom": "CHR_BASE_MASTER_v001"}

P = "CHR_BASE_MASTER_"
RIG = "RIG_CHR_BASE"
HAUTEUR = 1.70
TETE = HAUTEUR / 5  # 0,34 m : la tete, cheveux compris, fait un cinquieme de la hauteur
MENTON = HAUTEUR - TETE  # 1,36
EPAULE = (0.20, 1.25)  # articulation de l'epaule : ecart a l'axe, hauteur
ECART_BRAS = 10  # pose de repos en A, en degres
BRAS = 0.25  # epaule-coude
AVANT_BRAS = 0.23  # coude-poignet
MAIN = 0.13
HANCHE = (0.085, 0.72)  # articulation de la hanche : ecart a l'axe, hauteur
GENOU = 0.40
CHEVILLE = 0.10
PIED_X = 0.09  # axe des chaussures, un peu plus ecarte que les jambes
EXAGERATION = 1.2  # chaussures et casque agrandis, comme les portes de la famille (bible 18.2)

MAT_PEAU = "MAT_SKIN_B"
MAT_HABITS = "MAT_FABRIC_GRAPHITE"  # sous-pull et pantalon : la tenue civile, base de toutes les tenues
MAT_CHEVEUX = "MAT_HAIR_BROWN"  # cheveux et sourcils
# chaussures, yeux et bouche : le graphite des habits, et non MAT_RUBBER, pour qu'un personnage en tenue (peau, cheveux,
# graphite, blanc, gilet, casque d'equipe) tienne dans les 6 materiaux de la fiche
MAT_SOMBRE = "MAT_FABRIC_GRAPHITE"
MAT_CLAIR = "MAT_SURFACE"  # casque blanc (decision du 19 octobre 2026), reflet des yeux, bandes du gilet


# --- Geometrie ---------------------------------------------------------------------------------------------------

def repere(direction, reference=(0, 1, 0)):
    """Rotation qui envoie l'axe local Z sur direction ; l'axe local Y reste au plus pres de reference."""
    z = Vector(direction).normalized()
    x = Vector(reference).cross(z).normalized()
    y = z.cross(x)
    return Matrix((x, y, z)).transposed()


def fuseau(nom, sections, cotes=12, exposant=2.0, origine=(0, 0, 0), direction=(0, 0, 1), reference=(0, 1, 0), mat=None):
    """Volume a sections elliptiques le long de l'axe local Z : sections = [(z, rx, ry, cx, cy), ...]. Une section de
    rayon nul ferme le bout par un pole. exposant > 2 donne une section plus carree (super-ellipse : semelles, casque).
    Le volume est ensuite tourne (Z local sur direction) et pose a origine. Renvoie l'objet, normales lissees."""
    b = bmesh.new()
    anneaux = []
    for z, rx, ry, cx, cy in sections:
        if rx == 0 and ry == 0:
            anneaux.append([b.verts.new((cx, cy, z))])
            continue
        anneau = []
        for k in range(cotes):
            a = 2 * math.pi * k / cotes
            ca, sa = math.cos(a), math.sin(a)
            px = math.copysign(abs(ca) ** (2 / exposant), ca)
            py = math.copysign(abs(sa) ** (2 / exposant), sa)
            anneau.append(b.verts.new((cx + rx * px, cy + ry * py, z)))
        anneaux.append(anneau)
    for bas, haut in zip(anneaux, anneaux[1:]):
        if len(bas) == 1:
            for k in range(cotes):
                b.faces.new((bas[0], haut[(k + 1) % cotes], haut[k]))
        elif len(haut) == 1:
            for k in range(cotes):
                b.faces.new((bas[k], bas[(k + 1) % cotes], haut[0]))
        else:
            for k in range(cotes):
                b.faces.new((bas[k], bas[(k + 1) % cotes], haut[(k + 1) % cotes], haut[k]))
    bmesh.ops.recalc_face_normals(b, faces=b.faces)
    m = Matrix.Translation(origine) @ repere(direction, reference).to_4x4()
    bmesh.ops.transform(b, matrix=m, verts=b.verts)
    maillage = bpy.data.meshes.new(nom)
    b.to_mesh(maillage)
    b.free()
    for p in maillage.polygons:
        p.use_smooth = True  # les personnages : normales lissees partout (bible 2.2 et 18.3)
    o = bpy.data.objects.new(nom, maillage)
    bpy.context.scene.collection.objects.link(o)
    if mat:
        o.data.materials.append(mat)
    return o


def ellipsoide(nom, centre, rayons, cotes=12, anneaux=8, mat=None):
    """Ellipsoide pose par son centre (oreilles, yeux, cheveux)."""
    rx, ry, rz = rayons
    sections = []
    for i in range(anneaux + 1):
        t = math.pi * i / anneaux
        s = math.sin(t)
        sections.append((-rz * math.cos(t), rx * s if 0 < i < anneaux else 0, ry * s if 0 < i < anneaux else 0, 0, 0))
    return fuseau(nom, sections, cotes, origine=centre, mat=mat)


def membre(nom, a, b, rayons, cotes=12, debord=(0.0, 0.0), mat=None):
    """Fuseau rond d'un point a a un point b (bras, jambe, cou) : rayons = [(t, r), ...] avec t de 0 (a) a 1 (b) ;
    les bouts sont arrondis et depassent de debord (avant a, apres b) pour se fondre dans le voisin."""
    a, b = Vector(a), Vector(b)
    longueur = (b - a).length
    d0, d1 = debord
    sections = [(-d0, 0, 0, 0, 0)]
    r0 = rayons[0][1]
    sections.append((-d0 * 0.6, r0 * 0.75, r0 * 0.75, 0, 0))
    for t, r in rayons:
        sections.append((t * longueur, r, r, 0, 0))
    r1 = rayons[-1][1]
    sections.append((longueur + d1 * 0.6, r1 * 0.75, r1 * 0.75, 0, 0))
    sections.append((longueur + d1, 0, 0, 0, 0))
    return fuseau(nom, sections, cotes, origine=a, direction=b - a, mat=mat)


# --- Squelette et poids -------------------------------------------------------------------------------------------

def os_du_squelette():
    """Les os du squelette commun : (nom court, parent, tete, queue, axe Z vise, deformant)."""
    ex, ez = EPAULE
    s = math.sin(math.radians(ECART_BRAS))
    co = math.cos(math.radians(ECART_BRAS))
    hx, hz = HANCHE
    devant = (0, -1, 0)
    haut = (0, 0, 1)
    liste = [
        ("HIPS", None, (0, 0, hz), (0, 0, 0.86), devant, True),
        ("SPINE", "HIPS", (0, 0, 0.86), (0, 0, 1.06), devant, True),
        ("CHEST", "SPINE", (0, 0, 1.06), (0, 0, 1.30), devant, True),
        ("NECK", "CHEST", (0, 0, 1.30), (0, 0, 1.38), devant, True),
        ("HEAD", "NECK", (0, 0, 1.38), (0, 0, HAUTEUR), devant, True),
    ]
    for cote, sg in (("L", 1), ("R", -1)):
        coude = (sg * (ex + BRAS * s), 0, ez - BRAS * co)
        poignet = (sg * (ex + (BRAS + AVANT_BRAS) * s), 0, ez - (BRAS + AVANT_BRAS) * co)
        bout = (sg * (ex + (BRAS + AVANT_BRAS + MAIN) * s), 0, ez - (BRAS + AVANT_BRAS + MAIN) * co)
        prise = (sg * (ex + (BRAS + AVANT_BRAS + 0.06) * s), -0.035, ez - (BRAS + AVANT_BRAS + 0.06) * co)
        liste += [
            ("SHOULDER_" + cote, "CHEST", (sg * 0.04, 0, ez + 0.01), (sg * ex, 0, ez), devant, True),
            ("ARM_" + cote, "SHOULDER_" + cote, (sg * ex, 0, ez), coude, devant, True),
            ("FOREARM_" + cote, "ARM_" + cote, coude, poignet, devant, True),
            ("HAND_" + cote, "FOREARM_" + cote, poignet, bout, devant, True),
            # point d'accessoire, au creux de la main, non deformant : tablette, rouleau, truelle... (bible 5)
            ("PROP_" + cote, "HAND_" + cote, prise, (prise[0], prise[1] - 0.08, prise[2]), haut, False),
            ("THIGH_" + cote, "HIPS", (sg * hx, 0, hz), (sg * hx, 0, GENOU), devant, True),
            ("SHIN_" + cote, "THIGH_" + cote, (sg * hx, 0, GENOU), (sg * hx, 0, CHEVILLE), devant, True),
            ("FOOT_" + cote, "SHIN_" + cote, (sg * hx, 0, CHEVILLE), (sg * PIED_X, -0.15, 0.03), haut, True),
        ]
    return liste


def squelette():
    """L'armature RIG_CHR_BASE, en pose de repos A."""
    donnees = bpy.data.armatures.new(RIG)
    rig = bpy.data.objects.new(RIG, donnees)
    bpy.context.scene.collection.objects.link(rig)
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="EDIT")
    for court, parent, tete, queue, axe_z, deforme in os_du_squelette():
        e = donnees.edit_bones.new(RIG + "_" + court)
        e.head, e.tail = tete, queue
        e.align_roll(axe_z)
        e.use_deform = deforme
        if parent:
            e.parent = donnees.edit_bones[RIG + "_" + parent]
            e.use_connect = (Vector(e.head) - donnees.edit_bones[RIG + "_" + parent].tail).length < 1e-4
    bpy.ops.object.mode_set(mode="OBJECT")
    for pb in rig.pose.bones:
        pb.rotation_mode = "YXZ"  # d'abord la rotation sur l'axe de l'os, puis la flexion, puis l'ecart
    return rig


def poids_le_long(o, debut, direction, arrets):
    """Poids de chaque sommet selon sa position le long d'un axe : arrets = [(distance depuis debut, os court), ...]
    croissants. Entre deux arrets d'os differents, le poids passe lineairement de l'un a l'autre (le fondu de
    l'articulation) ; avant le premier et apres le dernier, l'os du bout prend tout."""
    debut, d = Vector(debut), Vector(direction).normalized()
    groupes = {}
    for _, court in arrets:
        if court not in groupes:
            groupes[court] = o.vertex_groups.get(RIG + "_" + court) or o.vertex_groups.new(name=RIG + "_" + court)
    for v in o.data.vertices:
        s = (v.co - debut).dot(d)
        if s <= arrets[0][0]:
            part = {arrets[0][1]: 1.0}
        elif s >= arrets[-1][0]:
            part = {arrets[-1][1]: 1.0}
        else:
            i = next(k for k in range(len(arrets) - 1) if arrets[k][0] <= s <= arrets[k + 1][0])
            (s0, b0), (s1, b1) = arrets[i], arrets[i + 1]
            u = (s - s0) / max(s1 - s0, 1e-6)
            part = {b0: 1.0} if b0 == b1 else {b0: 1 - u, b1: u}
        for court, w in part.items():
            if w > 0:
                groupes[court].add([v.index], w, "REPLACE")


def rigide(o, court):
    """Tout le maillage suit un seul os (tete, main, chaussure)."""
    g = o.vertex_groups.new(name=RIG + "_" + court)
    g.add([v.index for v in o.data.vertices], 1.0, "REPLACE")


def rattache_a_l_os(o, rig, court):
    """Noeud rigide enfant d'un os : il le suit sans peau (cheveux, yeux, casque, accessoires)."""
    bpy.context.view_layer.update()
    m = o.matrix_world.copy()
    o.parent = rig
    o.parent_type = "BONE"
    o.parent_bone = RIG + "_" + court
    bpy.context.view_layer.update()
    o.matrix_world = m


# --- Morphologies --------------------------------------------------------------------------------------------------
# Deux morphologies sur le meme squelette et la meme topologie. La masculine donne la geometrie de base ; la feminine
# devient la cle de forme FEMININE de chaque maillage deforme (corps et vetements), que le composant regle a 1 pour une
# femme. Les os ne bougent pas : epaules, hanches et poignets restent aux memes articulations.

# Le tronc, de l'entrejambe a la base du cou : (z, rx, ry, cx, cy).
TRONC_M = [
    (0.615, 0, 0, 0, 0.0),
    (0.625, 0.085, 0.065, 0, 0.0),
    (0.660, 0.162, 0.108, 0, 0.0),
    (0.720, 0.178, 0.118, 0, 0.005),
    (0.800, 0.170, 0.114, 0, 0.004),
    (0.900, 0.160, 0.108, 0, 0.0),
    (0.990, 0.162, 0.108, 0, -0.004),
    (1.090, 0.177, 0.116, 0, -0.008),
    (1.180, 0.190, 0.118, 0, -0.004),
    (1.250, 0.184, 0.110, 0, 0.0),
    (1.295, 0.152, 0.092, 0, 0.0),
    (1.325, 0.090, 0.065, 0, 0.0),
    (1.336, 0, 0, 0, 0.0),
]
# Feminin : epaules plus etroites, taille marquee, hanches un peu plus larges, poitrine.
TRONC_F = [
    (0.615, 0, 0, 0, 0.0),
    (0.625, 0.088, 0.066, 0, 0.0),
    (0.660, 0.168, 0.112, 0, 0.002),
    (0.720, 0.184, 0.122, 0, 0.008),
    (0.800, 0.172, 0.114, 0, 0.004),
    (0.900, 0.146, 0.100, 0, 0.0),
    (0.990, 0.144, 0.100, 0, -0.004),
    (1.090, 0.158, 0.126, 0, -0.020),
    (1.180, 0.168, 0.122, 0, -0.014),
    (1.250, 0.164, 0.104, 0, 0.0),
    (1.295, 0.136, 0.086, 0, 0.0),
    (1.325, 0.080, 0.060, 0, 0.0),
    (1.336, 0, 0, 0, 0.0),
]
MORPHO_M = {"nom": "M", "tronc": TRONC_M, "epaule": (0.172, 0.074, 0.068, 0.056), "bras": 1.0, "main": 1.0, "cou": 1.0,
            "jambe": 1.0, "menton": ((0.065, 0.052), (0.115, 0.098))}
MORPHO_F = {"nom": "F", "tronc": TRONC_F, "epaule": (0.160, 0.066, 0.062, 0.050), "bras": 0.88, "main": 0.9, "cou": 0.86,
            "jambe": 0.95, "menton": ((0.054, 0.046), (0.104, 0.092))}

RAYONS_MANCHE = [(0, 0.062), (0.35, 0.058), (0.75, 0.051), (0.92, 0.055), (1, 0.054)]  # sous-pull, manche retroussee
RAYONS_AVANT_BRAS = [(0, 0.043), (0.45, 0.041), (1, 0.032)]
RAYONS_BRAS = [(0, 0.062), (0.25, 0.058), (0.52, 0.050), (0.75, 0.046), (1, 0.036)]  # le bras entier, pour les manches longues
RAYONS_JAMBE = [(0, 0.092), (0.25, 0.084), (0.5, 0.068), (0.62, 0.068), (0.85, 0.058), (1, 0.052)]
SECTIONS_MAIN = [(-0.015, 0, 0, 0, 0), (-0.008, 0.023, 0.031, 0, 0), (0.020, 0.029, 0.044, 0, 0), (0.060, 0.031, 0.052, 0, 0.002),
        (0.100, 0.027, 0.047, 0, 0.004), (0.122, 0.018, 0.033, 0, 0.004), (0.130, 0, 0, 0, 0.004)]
POIDS_TRONC = [(0.84, "HIPS"), (0.92, "SPINE"), (1.00, "SPINE"), (1.10, "CHEST")]


def echelle(rayons, k=1.0, ecart=0.0):
    return [(t, r * k + ecart) for t, r in rayons]


def deux_morphos(fabrique):
    """La piece pour chaque morphologie, de meme topologie : la masculine reste, la feminine devient sa cle de forme
    FEMININE. fabrique(morpho) rend un objet ni deforme ni rattache. Toute decoupe dans fabrique doit etre topologique
    (anneau et colonne d'un fuseau), jamais calculee sur la position : sinon les deux versions divergeraient."""
    o = fabrique(MORPHO_M)
    f = fabrique(MORPHO_F)
    if len(o.data.vertices) != len(f.data.vertices):
        raise RuntimeError(o.name + " : les deux morphologies n'ont pas la meme topologie")
    o.shape_key_add(name="Basis", from_mix=False)
    cle = o.shape_key_add(name="FEMININE", from_mix=False)
    for i, v in enumerate(f.data.vertices):
        cle.data[i].co = v.co
    maillage = f.data
    bpy.data.objects.remove(f)
    bpy.data.meshes.remove(maillage)
    return o


def bras_de(cote):
    """Epaule, direction du bras (pose A) et poignet, cote L ou R."""
    sg = 1 if cote == "L" else -1
    ex, ez = EPAULE
    s, co = math.sin(math.radians(ECART_BRAS)), math.cos(math.radians(ECART_BRAS))
    epaule = Vector((sg * ex, 0, ez))
    d = Vector((sg * s, 0, -co))
    return epaule, d, epaule + d * (BRAS + AVANT_BRAS)


def poids_bras(o, cote, epaule, d):
    poids_le_long(o, epaule, d, [(-0.02, "SHOULDER_" + cote), (0.04, "ARM_" + cote), (BRAS - 0.04, "ARM_" + cote),
                                 (BRAS + 0.04, "FOREARM_" + cote)])


def poids_jambe(o, cote):
    hx, hz = HANCHE
    sg = 1 if cote == "L" else -1
    poids_le_long(o, (sg * hx, 0, hz), (0, 0, -1), [(-0.03, "HIPS"), (0.02, "THIGH_" + cote), (hz - GENOU - 0.04, "THIGH_" + cote),
                                                     (hz - GENOU + 0.04, "SHIN_" + cote)])


# --- Les decoupes topologiques -------------------------------------------------------------------------------------
# Un fuseau ouvert (sans pole) a ses faces rangees anneau par anneau : la face (i, k) est entre les sections i et i+1,
# dans la colonne k, qui couvre les angles k*pas a (k+1)*pas (0 = cote gauche du personnage, 3/4 de tour = devant).

DEVANT = 1.5 * math.pi


def angle_colonne(k, cotes):
    return (k + 0.5) * 2 * math.pi / cotes


def ecart_angle(a, b):
    return abs((a - b + math.pi) % (2 * math.pi) - math.pi)


def garde_faces(o, cotes, garder):
    """Ne garde que les faces (i, k) d'un fuseau ouvert pour lesquelles garder(i, k) est vrai."""
    b = bmesh.new()
    b.from_mesh(o.data)
    b.faces.ensure_lookup_table()
    a_retirer = [f for n, f in enumerate(b.faces) if not garder(n // cotes, n % cotes)]
    bmesh.ops.delete(b, geom=a_retirer, context="FACES")
    b.to_mesh(o.data)
    b.free()


def encolure_v(o, cotes, profondeur, demi_angle=0.42):
    """Creuse un V devant, dans le dernier anneau d'un fuseau ouvert (gilet, veste fermee) : topologique."""
    n = len(o.data.vertices) // cotes
    for k in range(cotes):
        ecart = ecart_angle(2 * math.pi * k / cotes, DEVANT)
        if ecart < demi_angle:
            o.data.vertices[(n - 1) * cotes + k].co.z -= profondeur * (1 - ecart / demi_angle)


def coque(m, z0, z1, ecart, haut=None):
    """Les sections d'une coque sur le tronc de la morphologie m, de z0 a z1, ecartee de ecart ; haut ajoute des
    sections au-dessus (col)."""
    t = m["tronc"]
    zs = sorted({z0, z1} | {s[0] for s in t if z0 < s[0] < z1})
    sections = []
    for z in zs:
        rx, ry, cx, cy = _interpole(t, z)
        sections.append((z, rx + ecart, ry + ecart, cx, cy))
    return sections + list(haut or [])


def _interpole(sections, z):
    """La section (rx, ry, cx, cy) a la hauteur z, entre deux sections donnees."""
    for (z0, *a), (z1, *b) in zip(sections, sections[1:]):
        if z0 <= z <= z1:
            t = (z - z0) / (z1 - z0) if z1 > z0 else 0
            return tuple(x + (y - x) * t for x, y in zip(a, b))
    raise ValueError(z)


# --- La base : corps, visage, casque -------------------------------------------------------------------------------

def corps(rig, mats):
    o = deux_morphos(lambda m: _corps(m, mats))
    deforme(o, rig)
    return o


def _corps(m, mats):
    mat_peau, mat_habits, mat_sombre = mats["peau"], mats["habits"], mats["sombre"]
    hx, hz = HANCHE
    parties = []

    tronc = fuseau(P + "TORSO", m["tronc"], cotes=16, mat=mat_habits)
    poids_le_long(tronc, (0, 0, 0), (0, 0, 1), POIDS_TRONC)
    parties.append(tronc)

    k = m["cou"]
    cou = membre(P + "NECK", (0, 0, 1.27), (0, 0, 1.42), [(0, 0.070 * k), (0.5, 0.064 * k), (1, 0.066 * k)], cotes=12, mat=mat_peau)
    poids_le_long(cou, (0, 0, 1.27), (0, 0, 1), [(0.02, "CHEST"), (0.05, "NECK"), (0.10, "NECK"), (0.13, "HEAD")])
    parties.append(cou)

    # La tete : ronde, un peu plus large aux pommettes, menton doux (REF_CHR_001) ; plus fin chez une femme.
    (m1x, m1y), (m2x, m2y) = m["menton"]
    tete = fuseau(P + "HEAD", [
        (MENTON - 0.008, 0, 0, 0, -0.012),
        (MENTON + 0.006, m1x, m1y, 0, -0.032),
        (MENTON + 0.035, m2x, m2y, 0, -0.020),
        (MENTON + 0.080, 0.145, 0.130, 0, -0.008),
        (MENTON + 0.140, 0.158, 0.147, 0, -0.002),
        (MENTON + 0.200, 0.160, 0.152, 0, 0.004),
        (MENTON + 0.250, 0.151, 0.148, 0, 0.008),
        (MENTON + 0.288, 0.125, 0.126, 0, 0.010),
        (MENTON + 0.308, 0.080, 0.083, 0, 0.010),
        (MENTON + 0.316, 0, 0, 0, 0.010),
    ], cotes=16, mat=mat_peau)
    rigide(tete, "HEAD")
    parties.append(tete)
    for sg in (1, -1):
        oreille = ellipsoide(P + "EAR_" + ("L" if sg > 0 else "R"), (sg * 0.157, 0.012, MENTON + 0.135), (0.022, 0.035, 0.048),
                             cotes=8, anneaux=6, mat=mat_peau)
        rigide(oreille, "HEAD")
        parties.append(oreille)
    nez = ellipsoide(P + "NOSE", (0, -0.147, MENTON + 0.105), (0.019, 0.015, 0.017), cotes=8, anneaux=6, mat=mat_peau)
    rigide(nez, "HEAD")
    parties.append(nez)

    ex_rond, rx_rond, ry_rond, rz_rond = m["epaule"]
    for cote, sg in (("L", 1), ("R", -1)):
        epaule, d, poignet = bras_de(cote)
        # la manche retroussee sous le coude (MB_04), puis l'avant-bras nu : la peau casse la masse sombre du vetement
        manche = membre(P + "SLEEVE_" + cote, epaule, epaule + d * (BRAS + 0.07), echelle(RAYONS_MANCHE, m["bras"]),
                        debord=(0.03, 0.006), mat=mat_habits)
        poids_bras(manche, cote, epaule, d)
        nu = membre(P + "FOREARM_" + cote, epaule + d * (BRAS - 0.03), poignet, echelle(RAYONS_AVANT_BRAS, m["bras"]),
                    debord=(0.0, 0.01), mat=mat_peau)
        poids_le_long(nu, epaule, d, [(BRAS - 0.04, "ARM_" + cote), (BRAS + 0.04, "FOREARM_" + cote)])
        # l'epaule arrondie : relie le haut du bras a la ligne des epaules (sans elle, le bras se pose comme un tube)
        rond = ellipsoide(P + "SHOULDER_" + cote, (sg * ex_rond, 0, EPAULE[1] - 0.022), (rx_rond, ry_rond, rz_rond), cotes=10,
                          anneaux=6, mat=mat_habits)
        poids_le_long(rond, (sg * 0.10, 0, EPAULE[1]), (sg, 0, 0), [(0.03, "SHOULDER_" + cote), (0.10, "SHOULDER_" + cote),
                                                                   (0.16, "ARM_" + cote)])
        parties += [manche, nu, rond]

        # La main en moufle, paume vers le corps, et le pouce vers l'avant : simple, prete a tenir un accessoire.
        km = m["main"]
        main = fuseau(P + "HAND_" + cote, [(z * km, rx * km, ry * km, cx, cy * km) for z, rx, ry, cx, cy in SECTIONS_MAIN], cotes=12,
                      origine=poignet, direction=d, mat=mat_peau)
        rigide(main, "HAND_" + cote)
        pouce_base = poignet + d * 0.030 * km + Vector((0, -0.030 * km, 0))
        pouce = membre(P + "THUMB_" + cote, pouce_base, pouce_base + (d * 0.6 + Vector((0, -0.8, 0))).normalized() * 0.05 * km,
                       [(0, 0.019 * km), (1, 0.016 * km)], cotes=8, debord=(0.01, 0.012), mat=mat_peau)
        rigide(pouce, "HAND_" + cote)
        parties += [main, pouce]

        jambe = membre(P + "LEG_" + cote, (sg * hx, 0, hz), (sg * hx, 0, CHEVILLE), echelle(RAYONS_JAMBE, m["jambe"]),
                       debord=(0.04, 0.02), mat=mat_habits)
        poids_jambe(jambe, cote)
        parties.append(jambe)

        # La chaussure de securite agrandie (x 1,2) : 0,30 m de long, semelle plate, bout arrondi.
        chaussure = fuseau(P + "SHOE_" + cote, [
            (0.000, 0, 0, 0, 0.055),
            (0.010, 0.040, 0.050, 0, 0.055),
            (0.040, 0.058, 0.058, 0, 0.060),
            (0.090, 0.064, 0.065, 0, 0.066),
            (0.150, 0.066, 0.053, 0, 0.054),
            (0.210, 0.064, 0.045, 0, 0.046),
            (0.258, 0.056, 0.039, 0, 0.040),
            (0.288, 0.040, 0.031, 0, 0.033),
            (0.300, 0, 0, 0, 0.030),
        ], cotes=12, exposant=2.6, origine=(sg * PIED_X, 0.085, 0), direction=(0, -1, 0), reference=(0, 0, 1), mat=mat_sombre)
        rigide(chaussure, "FOOT_" + cote)
        parties.append(chaussure)

    return reunit(P + "BODY", parties)


def reunit(nom, parties):
    """Un seul maillage (un seul noeud glTF, une primitive par materiau) ; les groupes de sommets de meme nom (les os)
    se rejoignent."""
    bpy.ops.object.select_all(action="DESELECT")
    for x in parties:
        x.select_set(True)
    bpy.context.view_layer.objects.active = parties[0]
    bpy.ops.object.join()
    o = parties[0]
    o.name = o.data.name = nom
    return o


def deforme(o, rig):
    o.parent = rig
    m = o.modifiers.new("squelette", "ARMATURE")
    m.object = rig


def cils(rig, mat):
    """Un petit trait au coin exterieur de chaque oeil, pour les visages feminins (montre par le composant)."""
    oeil_z = MENTON + 0.140
    parties = [membre(P + "LASH_" + ("L" if sg > 0 else "R"), (sg * 0.068, -0.137, oeil_z + 0.020), (sg * 0.086, -0.127, oeil_z + 0.030),
                      [(0, 0.0045), (1, 0.003)], cotes=6, debord=(0.003, 0.003), mat=mat) for sg in (1, -1)]
    o = reunit(P + "LASHES", parties)
    rattache_a_l_os(o, rig, "HEAD")
    return o


def visage(rig, mats):
    """Les traits du visage, un seul noeud rattache a la tete : yeux sombres avec un reflet clair (bible 4 : formes
    simples, contrastes lisibles, reflets discrets), sourcils dans la couleur des cheveux, sourire modere (bible 2.5).
    Sous le detail minimal de la vue generale (0,15 m) : le composant les cache en qualite basse (bible 18.3)."""
    oeil_z = MENTON + 0.140
    parties = []
    for sg in (1, -1):
        cote = "L" if sg > 0 else "R"
        parties.append(ellipsoide(P + "EYE_" + cote, (sg * 0.056, -0.134, oeil_z), (0.021, 0.012, 0.031), cotes=8, anneaux=6,
                                  mat=mats["sombre"]))
        # le reflet, en haut a droite de chaque oeil, du meme cote pour les deux (une seule lumiere)
        parties.append(ellipsoide(P + "EYE_GLINT_" + cote, (sg * 0.056 - 0.007, -0.144, oeil_z + 0.011), (0.007, 0.004, 0.008),
                                  cotes=8, anneaux=4, mat=mats["clair"]))
        # le sourcil : un trait arrondi, qui redescend vers l'exterieur (regard ouvert ; l'inverse fronce)
        parties.append(membre(P + "BROW_" + cote, (sg * 0.030, -0.144, oeil_z + 0.050), (sg * 0.082, -0.134, oeil_z + 0.045),
                              [(0, 0.009), (0.5, 0.010), (1, 0.007)], cotes=8, debord=(0.006, 0.006), mat=mats["cheveux"]))
    # la bouche : un trait courbe, les coins releves (sourire), qui suit l'arrondi du visage
    largeur, releve = 0.064, 0.009
    sections = [(0, 0, 0, 0, 0)]
    for k in range(1, 8):
        t = k / 8
        u = 2 * t - 1
        sections.append((t * largeur, 0.0055, 0.006, -releve * u * u, 0.006 * u * u))
    sections.append((largeur, 0, 0, -releve, 0.006))
    parties.append(fuseau(P + "MOUTH", sections, cotes=8, origine=(-largeur / 2, -0.131, MENTON + 0.062), direction=(1, 0, 0),
                          mat=mats["sombre"]))
    o = reunit(P + "FACE", parties)
    rattache_a_l_os(o, rig, "HEAD")
    return o


def casque(rig, mat):
    """Casque de chantier agrandi (x 1,2) : coque bombee, rebord tout autour, visiere vers l'avant et nervure sur le
    dessus, d'avant en arriere (MB_04)."""
    base = MENTON + 0.230
    o = fuseau(P + "HELMET", [
        (base, 0, 0, 0, -0.032),
        (base + 0.001, 0.200, 0.232, 0, -0.032),
        (base + 0.016, 0.202, 0.234, 0, -0.032),
        (base + 0.022, 0.177, 0.188, 0, -0.004),
        (base + 0.075, 0.177, 0.188, 0, 0.000),
        (base + 0.125, 0.160, 0.172, 0, 0.004),
        (base + 0.160, 0.122, 0.132, 0, 0.006),
        (base + 0.178, 0.065, 0.070, 0, 0.006),
        (base + 0.183, 0, 0, 0, 0.006),
    ], cotes=20, exposant=2.2, mat=mat)
    # la nervure : une bande etroite qui suit le profil de la coque, un peu en relief, de la visiere a la nuque
    nervure = fuseau(P + "HELMET_RIDGE", [
        (base + 0.030, 0, 0, 0, 0.000),
        (base + 0.034, 0.030, 0.198, 0, 0.000),
        (base + 0.075, 0.034, 0.198, 0, 0.000),
        (base + 0.125, 0.034, 0.182, 0, 0.004),
        (base + 0.160, 0.034, 0.142, 0, 0.006),
        (base + 0.180, 0.030, 0.080, 0, 0.006),
        (base + 0.190, 0, 0, 0, 0.006),
    ], cotes=12, exposant=2.2, mat=mat)
    o = reunit(P + "HELMET", [o, nervure])
    rattache_a_l_os(o, rig, "HEAD")
    return o



# --- Les coiffures (fichier CHR_HAIR_KIT) --------------------------------------------------------------------------
# Des masses sculptees (bible 4), chacune un noeud rattache a l'os de la tete. Elles passent sous le casque : rien ne
# depasse au-dessus de 1,70 m ni sous le rebord, sauf a l'arriere (queue de cheval, chignon, cheveux longs). Le
# materiau MAT_HAIR_BROWN est remplace par la couleur de la personne ; la barbe le partage.
H = "CHR_HAIR_"
CALOTTE = [
    (MENTON + 0.075, 0, 0, 0, 0.055),
    (MENTON + 0.090, 0.110, 0.105, 0, 0.050),
    (MENTON + 0.125, 0.157, 0.155, 0, 0.040),
    (MENTON + 0.170, 0.166, 0.163, 0, 0.034),
    (MENTON + 0.220, 0.168, 0.163, 0, 0.022),
    (MENTON + 0.268, 0.160, 0.160, 0, 0.012),
    (MENTON + 0.308, 0.130, 0.132, 0, 0.008),
    (MENTON + 0.334, 0.072, 0.076, 0, 0.008),
    (MENTON + 0.342, 0, 0, 0, 0.008),
]


def _calotte(nom, mat, ecart=0.0, recul=0.0):
    return fuseau(nom, [(z, rx + ecart if rx else 0, ry + ecart if ry else 0, cx, cy + recul) for z, rx, ry, cx, cy in CALOTTE],
                  cotes=16, mat=mat)


def _meches(n, mat):
    """Deux meches qui encadrent le visage, devant les oreilles : un visage feminin se lit de face, meme sous le casque."""
    M = MENTON
    return [ellipsoide(n + "_LOCK_" + c, (sg * 0.150, -0.050, M + 0.170), (0.028, 0.042, 0.090), cotes=8, anneaux=5, mat=mat)
            for c, sg in (("L", 1), ("R", -1))]


def _coiffure(rig, nom, parties):
    o = reunit(H + nom, parties)
    rattache_a_l_os(o, rig, "HEAD")
    return o


def coiffures(rig, mat, mat_lunettes, seules=None):
    """Les coiffures, la barbe et les lunettes ; seules : les noms a construire (atelier), sinon toutes."""
    M = MENTON
    styles = {
        # courte, deux meches de devant (la base, MB_04)
        "SHORT": lambda n: [_calotte(n, mat), ellipsoide(n + "_A", (0.040, -0.098, M + 0.290), (0.085, 0.060, 0.042), cotes=10, anneaux=6, mat=mat),
                            ellipsoide(n + "_B", (-0.052, -0.088, M + 0.282), (0.070, 0.058, 0.040), cotes=10, anneaux=6, mat=mat)],
        # raie sur le cote : une grande meche balayee vers la droite, plus de volume dessus
        "SIDE": lambda n: [_calotte(n, mat, 0.004), ellipsoide(n + "_A", (-0.030, -0.092, M + 0.296), (0.115, 0.068, 0.046), cotes=10, anneaux=6, mat=mat),
                           ellipsoide(n + "_B", (0.075, -0.070, M + 0.285), (0.060, 0.070, 0.040), cotes=10, anneaux=6, mat=mat)],
        # tres courte : une calotte fine, au ras du crane
        "CROP": lambda n: [_calotte(n, mat, -0.005, 0.004)],
        # carre : la calotte et deux masses qui couvrent les oreilles jusqu'a la machoire, plus la nuque
        "BOB": lambda n: [_calotte(n, mat, 0.004), ellipsoide(n + "_L", (0.142, 0.022, M + 0.115), (0.050, 0.110, 0.120), cotes=10, anneaux=6, mat=mat),
                          ellipsoide(n + "_R", (-0.142, 0.022, M + 0.115), (0.050, 0.110, 0.120), cotes=10, anneaux=6, mat=mat),
                          ellipsoide(n + "_N", (0, 0.090, M + 0.125), (0.150, 0.075, 0.125), cotes=10, anneaux=6, mat=mat),
                          ellipsoide(n + "_F", (0.035, -0.100, M + 0.290), (0.110, 0.055, 0.042), cotes=10, anneaux=6, mat=mat)],
        # longs : une masse dans le dos jusqu'aux omoplates
        "LONG": lambda n: [_calotte(n, mat, 0.004), ellipsoide(n + "_A", (-0.030, -0.095, M + 0.292), (0.110, 0.060, 0.044), cotes=10, anneaux=6, mat=mat),
                           fuseau(n + "_D", [(M + 0.230, 0, 0, 0, 0.100), (M + 0.210, 0.150, 0.075, 0, 0.100),
                                             (M + 0.100, 0.160, 0.072, 0, 0.115), (M - 0.020, 0.150, 0.055, 0, 0.135),
                                             (M - 0.110, 0.120, 0.040, 0, 0.150), (M - 0.135, 0, 0, 0, 0.150)],
                                  cotes=16, mat=mat)],
        # queue de cheval : tiree en arriere, la queue tombe dans la nuque
        "PONYTAIL": lambda n: [_calotte(n, mat, 0.0, 0.004), ellipsoide(n + "_A", (-0.020, -0.100, M + 0.288), (0.100, 0.052, 0.038), cotes=10, anneaux=6, mat=mat),
                               ellipsoide(n + "_T", (0, 0.172, M + 0.085), (0.040, 0.045, 0.110), cotes=10, anneaux=6, mat=mat)] + _meches(n, mat),
        # chignon bas, sous le rebord du casque
        "BUN": lambda n: [_calotte(n, mat, 0.0, 0.004), ellipsoide(n + "_A", (0.020, -0.100, M + 0.288), (0.100, 0.052, 0.038), cotes=10, anneaux=6, mat=mat),
                          ellipsoide(n + "_B", (0, 0.168, M + 0.140), (0.062, 0.052, 0.058), cotes=10, anneaux=6, mat=mat)] + _meches(n, mat),
    }
    faits = []
    for nom, parts in styles.items():
        if seules is None or nom in seules:
            faits.append(_coiffure(rig, nom, parts(H + nom)))
    if seules is None or "BEARD" in seules:
        faits.append(barbe(rig, mat))
    if seules is None or "GLASSES" in seules:
        faits.append(lunettes(rig, mat_lunettes))
    return faits


def barbe(rig, mat):
    """Barbe courte : une coque sur la machoire et le menton, ouverte devant la bouche et sous le nez."""
    cotes = 16
    sections = [(MENTON - 0.014, 0.060, 0.050, 0, -0.030), (MENTON + 0.010, 0.088, 0.070, 0, -0.034),
                (MENTON + 0.040, 0.125, 0.108, 0, -0.022), (MENTON + 0.080, 0.152, 0.138, 0, -0.010),
                (MENTON + 0.115, 0.164, 0.152, 0, -0.004)]
    o = fuseau("CHR_BEARD", [(MENTON - 0.020, 0, 0, 0, -0.028)] + sections, cotes=cotes, mat=mat)
    # faces : le pole du bas (cotes triangles), puis les anneaux ; on retire l'arriere (sous les oreilles, la nuque) et la
    # bouche (devant, entre les deux derniers anneaux du bas et le haut)
    b = bmesh.new()
    b.from_mesh(o.data)
    b.faces.ensure_lookup_table()
    retirer = []
    for n, f in enumerate(b.faces):
        if n < cotes:
            continue
        i, k = (n - cotes) // cotes, (n - cotes) % cotes
        a = angle_colonne(k, cotes)
        derriere = ecart_angle(a, math.pi / 2) < 0.9
        bouche = i >= 2 and ecart_angle(a, DEVANT) < 0.5
        joues_hautes = i >= 3 and ecart_angle(a, DEVANT) < 1.0
        if derriere or bouche or joues_hautes:
            retirer.append(f)
    bmesh.ops.delete(b, geom=retirer, context="FACES")
    b.to_mesh(o.data)
    b.free()
    rattache_a_l_os(o, rig, "HEAD")
    return o


def lunettes(rig, mat):
    """Lunettes simples : deux montures rondes, le pont et les branches jusqu'aux oreilles."""
    oeil_z = MENTON + 0.140
    parties = []
    for sg in (1, -1):
        bpy.ops.mesh.primitive_torus_add(major_radius=0.034, minor_radius=0.0045, major_segments=16, minor_segments=6,
                                         location=(sg * 0.056, -0.150, oeil_z), rotation=(math.pi / 2, 0, 0))
        t = bpy.context.active_object
        t.name = t.data.name = "CHR_GLASSES_RIM_" + ("L" if sg > 0 else "R")
        t.scale = (1.12, 1, 1)
        applique(t)
        t.data.materials.append(mat)
        for p in t.data.polygons:
            p.use_smooth = True
        parties.append(t)
        parties.append(membre("CHR_GLASSES_ARM_" + ("L" if sg > 0 else "R"), (sg * 0.094, -0.146, oeil_z + 0.006),
                              (sg * 0.160, 0.000, oeil_z + 0.010), [(0, 0.004), (1, 0.004)], cotes=6, mat=mat))
    parties.append(membre("CHR_GLASSES_BRIDGE", (-0.020, -0.152, oeil_z + 0.004), (0.020, -0.152, oeil_z + 0.004),
                          [(0, 0.004), (1, 0.004)], cotes=6, mat=mat))
    o = reunit("CHR_GLASSES", parties)
    rattache_a_l_os(o, rig, "HEAD")
    return o


def applique(o):
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)


# --- Les tenues (un fichier CHR_OUTFIT_<METIER> par metier) --------------------------------------------------------
# Chaque piece est un noeud deforme par le squelette, avec sa cle FEMININE. Une piece dont le nom finit par _TEAM porte
# la couleur de l'equipe : dans le GLB, ses parties d'equipe ont le materiau MAT_FABRIC_SITE, que le composant remplace
# (MAT_FABRIC_<EQUIPE> ; pour un gilet de l'equipe site, MAT_FABRIC_HIVIS, bible 18.8).
EQUIPE = "MAT_FABRIC_SITE"  # materiau des parties d'equipe dans le GLB
COTES_COQUE = 24
COTES_BANDES = 48
BANDES_H = ((0.850, 0.892), (0.930, 0.972))  # deux bandes claires autour de la taille (MB_04)


def _piece(rig, nom, fabrique):
    o = deux_morphos(fabrique)
    o.name = o.data.name = nom
    deforme(o, rig)
    return o


def _coque_tronc(nom, sections, mat, cotes=COTES_COQUE):
    o = fuseau(nom, sections, cotes=cotes, mat=mat)
    poids_le_long(o, (0, 0, 0), (0, 0, 1), POIDS_TRONC)
    return o


def _col(z, rx, ry):
    """Deux sections qui ferment une coque autour du cou : un col montant."""
    return [(z, rx, ry, 0, 0.0), (z + 0.035, rx * 0.86, ry * 0.86, 0, 0.0)]


def _manches(nom, m, mat, ecart, longueur=None, epaules=True):
    """Manches sur le bras entier (longueur None) ou courtes (fraction du bras), et les epaules arrondies du vetement."""
    parties = []
    ex_rond, rx_rond, ry_rond, rz_rond = m["epaule"]
    for cote, sg in (("L", 1), ("R", -1)):
        epaule, d, poignet = bras_de(cote)
        bout = poignet - d * 0.012 if longueur is None else epaule + d * longueur
        rayons = echelle(RAYONS_BRAS, m["bras"], ecart) if longueur is None else \
            [(0, RAYONS_BRAS[0][1] * m["bras"] + ecart), (1, RAYONS_BRAS[1][1] * m["bras"] + ecart + 0.004)]
        manche = membre(nom + "_SLEEVE_" + cote, epaule, bout, rayons, debord=(0.03, 0.004), mat=mat)
        poids_bras(manche, cote, epaule, d)
        parties.append(manche)
        if epaules:
            rond = ellipsoide(nom + "_SHOULDER_" + cote, (sg * ex_rond, 0, EPAULE[1] - 0.020),
                              (rx_rond + ecart, ry_rond + ecart, rz_rond + ecart * 0.8), cotes=10, anneaux=6, mat=mat)
            poids_le_long(rond, (sg * 0.10, 0, EPAULE[1]), (sg, 0, 0), [(0.03, "SHOULDER_" + cote), (0.10, "SHOULDER_" + cote),
                                                                       (0.16, "ARM_" + cote)])
            parties.append(rond)
    return parties


def _jambes(nom, m, mat, ecart, bas=CHEVILLE + 0.035):
    parties = []
    hx, hz = HANCHE
    for cote, sg in (("L", 1), ("R", -1)):
        long = hz - bas
        rayons = [(t, r * m["jambe"] + ecart) for t, r in RAYONS_JAMBE if t * (hz - CHEVILLE) <= long + 1e-6]
        rayons.append((1.0, RAYONS_JAMBE[-2][1] * m["jambe"] + ecart + 0.004))
        jambe = membre(nom + "_LEG_" + cote, (sg * hx, 0, hz), (sg * hx, 0, bas),
                       [(t * (hz - CHEVILLE) / long if t < 1 else 1.0, r) for t, r in rayons], debord=(0.05, 0.004), mat=mat)
        poids_jambe(jambe, cote)
        parties.append(jambe)
    return parties


def veste(nom, m, mats, mat, ouverte, longueur=0.70):
    """Veste a manches longues et col : ouverte en V jusqu'a la poitrine (blazer, chemise dessous), ou fermee (veste
    de travail)."""
    sections = coque(m, longueur, 1.300, 0.018, _col(1.318, 0.108, 0.082))
    corps_veste = _coque_tronc(nom + "_BODY", sections, mat)
    if ouverte:
        # le V : sur les anneaux du haut, devant, une ouverture qui s'elargit vers le col
        zs = [s[0] for s in sections]

        def garder(i, k):
            z = (zs[i] + zs[i + 1]) / 2
            if z < 0.98:
                return True
            demi = 0.32 + 0.42 * (z - 0.98) / 0.35
            return ecart_angle(angle_colonne(k, COTES_COQUE), DEVANT) > demi
        garde_faces(corps_veste, COTES_COQUE, garder)
    return [corps_veste] + _manches(nom, m, mat, 0.012)


def chemise(nom, m, mat):
    """Le devant de la chemise, visible dans le V de la veste, et son col."""
    sections = coque(m, 0.96, 1.300, 0.010, _col(1.318, 0.100, 0.076))
    o = _coque_tronc(nom, sections, mat)
    haut = len(sections) - 3  # les deux anneaux du col
    garde_faces(o, COTES_COQUE, lambda i, k: ecart_angle(angle_colonne(k, COTES_COQUE), DEVANT) < (0.66 if i >= haut else 0.86))
    return [o]


def sweat(nom, m, mat):
    """Sweat a capuche : coque du tronc et manches longues, la capuche roulee dans le dos (MB_05)."""
    sections = coque(m, 0.76, 1.300, 0.014, _col(1.316, 0.102, 0.078))
    o = _coque_tronc(nom + "_BODY", sections, mat)
    capuche = ellipsoide(nom + "_HOOD", (0, 0.092, 1.315), (0.150, 0.072, 0.066), cotes=12, anneaux=6, mat=mat)
    rigide(capuche, "CHEST")
    return [o, capuche] + _manches(nom, m, mat, 0.012)


def polo(nom, m, mat):
    """Polo a manches courtes et col (MB_05, le concierge)."""
    sections = coque(m, 0.74, 1.300, 0.012, _col(1.316, 0.104, 0.080))
    o = _coque_tronc(nom + "_BODY", sections, mat)
    return [o] + _manches(nom, m, mat, 0.012, longueur=0.13)


def salopette(nom, m, mat, genouilleres=None):
    """Salopette : les jambes, le bas du tronc, la bavette devant et deux bretelles par-dessus les epaules."""
    parties = _jambes(nom, m, mat, 0.014)
    parties.append(_coque_tronc(nom + "_BODY", coque(m, 0.64, 1.04, 0.016), mat))
    bavette = _coque_tronc(nom + "_BIB", coque(m, 1.02, 1.20, 0.016), mat)
    garde_faces(bavette, COTES_COQUE, lambda i, k: ecart_angle(angle_colonne(k, COTES_COQUE), DEVANT) < 0.62)
    parties.append(bavette)
    bretelles = _coque_tronc(nom + "_STRAPS", coque(m, 1.10, 1.290, 0.018), mat, cotes=COTES_BANDES)
    colonnes = _colonnes_bretelles(m["tronc"], 0.085)
    garde_faces(bretelles, COTES_BANDES, lambda i, k: k in colonnes)
    parties.append(bretelles)
    if genouilleres:
        hx = HANCHE[0]
        for cote, sg in (("L", 1), ("R", -1)):
            g = ellipsoide(nom + "_KNEE_" + cote, (sg * hx, -0.064, GENOU), (0.052, 0.026, 0.062), cotes=10, anneaux=6,
                           mat=genouilleres)
            rigide(g, "SHIN_" + cote)
            parties.append(g)
    return parties


def pantalon(nom, m, mat):
    """Pantalon de ville (la representante) : les jambes jusqu'aux chevilles et le bassin."""
    return _jambes(nom, m, mat, 0.012, bas=CHEVILLE + 0.030) + [_coque_tronc(nom + "_BODY", coque(m, 0.64, 0.90, 0.013), mat)]


def _colonnes_bretelles(tronc, ecart_axe):
    """Les colonnes (sur COTES_BANDES) des deux bretelles devant et de leurs symetriques dans le dos, a ecart_axe de
    l'axe a la poitrine. Topologique : le meme ensemble pour les deux morphologies (calcule sur le tronc masculin)."""
    pas = 2 * math.pi / COTES_BANDES
    rx = _interpole(TRONC_M, 1.09)[0]
    c = min(ecart_axe / rx, 1.0)
    angle = math.atan2(-math.sqrt(1 - c * c), c) % (2 * math.pi)
    j = int(round(angle / pas))
    colonnes = set()
    for k in (j - 1, j):
        colonnes |= {k % COTES_BANDES, (COTES_BANDES // 2 - 1 - k) % COTES_BANDES}
    return colonnes | {(COTES_BANDES - 1 - k) % COTES_BANDES for k in set(colonnes)}


def gilet(nom, m, mat, mat_bandes, ecart=0.012):
    """Gilet a bandes claires (bible 18.8 ; OTConst, art. 7) : sans manches, ouvert au cou en V, du haut des epaules au
    bas du ventre. Deux bandes autour de la taille, deux bretelles devant et dans le dos. ecart : plus grand par-dessus
    une veste ou un sweat."""
    zs = [0.790, 0.800, 0.900, 0.990, 1.090, 1.180, 1.250, 1.288]
    sections = [(z, *(_interpole(m["tronc"], z)[0] + ecart, _interpole(m["tronc"], z)[1] + ecart), 0,
                 _interpole(m["tronc"], z)[3]) for z in zs]
    corps_gilet = fuseau(nom + "_BODY", sections, cotes=COTES_COQUE, mat=mat)
    encolure_v(corps_gilet, COTES_COQUE, 0.13)
    # les bandes : une peau a peine plus large, decoupee par anneaux (bandes horizontales) et par colonnes (bretelles)
    fines = sorted(set(zs) | {z for bande in BANDES_H for z in bande} |
                   {zs[i] + (zs[i + 1] - zs[i]) * t / 4 for i in range(len(zs) - 1) for t in (1, 2, 3)})
    peau = []
    for z in fines:
        rx, ry, cx, cy = _interpole(m["tronc"], z)
        peau.append((z, rx + ecart + 0.004, ry + ecart + 0.004, 0, cy))
    bandes = fuseau(nom + "_BANDS", peau, cotes=COTES_BANDES, mat=mat_bandes)
    colonnes = _colonnes_bretelles(m["tronc"], 0.085)

    def garder(i, k):
        z = (fines[i] + fines[i + 1]) / 2
        horizontale = any(z0 <= z <= z1 for z0, z1 in BANDES_H)
        return horizontale or (z > BANDES_H[-1][1] and k in colonnes)
    garde_faces(bandes, COTES_BANDES, garder)
    # les bretelles passent juste a cote du V de l'encolure : les bandes n'ont pas besoin d'etre creusees
    o = reunit(nom, [corps_gilet, bandes])
    poids_le_long(o, (0, 0, 0), (0, 0, 1), POIDS_TRONC)
    return [o]


def ceinture(nom, m, mat, mat_outils):
    """Ceinture a outils simplifiee (amendement de PA du 19 octobre 2026) : la ceinture, deux poches sur les hanches et
    deux manches d'outils qui en sortent, de la couleur de l'equipe."""
    o = _coque_tronc(nom + "_BELT", coque(m, 0.760, 0.800, 0.024), mat)
    parties = [o]
    for cote, sg in (("L", 1), ("R", -1)):
        poche = ellipsoide(nom + "_POUCH_" + cote, (sg * 0.150, -0.060, 0.715), (0.038, 0.040, 0.058), cotes=10, anneaux=6, mat=mat)
        manche = membre(nom + "_HANDLE_" + cote, (sg * 0.150, -0.066, 0.740), (sg * 0.160, -0.070, 0.820), [(0, 0.011), (1, 0.011)],
                        cotes=8, debord=(0.0, 0.008), mat=mat_outils)
        for x in (poche, manche):
            rigide(x, "HIPS")
        parties += [poche, manche]
    return parties


def gants(nom, m, mat):
    """Gants de travail : une moufle a peine plus grande que la main, et le pouce."""
    parties = []
    km = m["main"] * 1.12
    for cote in ("L", "R"):
        _, d, poignet = bras_de(cote)
        g = fuseau(nom + "_" + cote, [(z * km - 0.008, rx * km + 0.003 if rx else 0, ry * km + 0.003 if ry else 0, cx, cy * km)
                                      for z, rx, ry, cx, cy in SECTIONS_MAIN], cotes=12, origine=poignet, direction=d, mat=mat)
        rigide(g, "HAND_" + cote)
        base = poignet + d * 0.030 * m["main"] + Vector((0, -0.030 * m["main"], 0))
        pouce = membre(nom + "_THUMB_" + cote, base, base + (d * 0.6 + Vector((0, -0.8, 0))).normalized() * 0.05 * m["main"],
                       [(0, 0.023 * m["main"]), (1, 0.020 * m["main"])], cotes=8, debord=(0.01, 0.014), mat=mat)
        rigide(pouce, "HAND_" + cote)
        parties += [g, pouce]
    return parties


# Les tenues : pour chaque metier, ses pieces. Une piece : (nom, fabrique(m, mats) -> parties). Le suffixe _TEAM
# signale une piece a la couleur d'equipe.
def TENUES():
    def gilet_dessus(ecart):
        return lambda m, mt: gilet("VEST", m, mt[EQUIPE], mt["clair"], ecart)
    return {
        # le client : tenue civile graphite, veste ouverte sur une chemise claire, sans casque
        "client": [("JACKET", lambda m, mt: veste("JACKET", m, mt, mt["habits"], True)),
                   ("SHIRT", lambda m, mt: chemise("SHIRT", m, mt["clair"]))],
        # l'architecte : veste de la couleur de l'equipe, chemise claire (MB_05)
        "architect": [("JACKET_TEAM", lambda m, mt: veste("JACKET", m, mt, mt[EQUIPE], True)),
                      ("SHIRT", lambda m, mt: chemise("SHIRT", m, mt["clair"]))],
        # bureau d'etudes : gilet a bandes de l'equipe sur la veste de travail graphite (MB_05)
        "engineer": [("JACKET", lambda m, mt: veste("JACKET", m, mt, mt["habits"], False)),
                     ("VEST_TEAM", gilet_dessus(0.030))],
        # le contremaitre : veste de travail, gilet, et la ceinture
        "foreman": [("JACKET", lambda m, mt: veste("JACKET", m, mt, mt["habits"], False)),
                    ("VEST_TEAM", gilet_dessus(0.030)),
                    ("BELT_TEAM", lambda m, mt: ceinture("BELT", m, mt["habits"], mt[EQUIPE]))],
        # macon et electricien : sweat a capuche, gilet, ceinture a outils, gants (MB_05)
        "mason": [("HOODIE", lambda m, mt: sweat("HOODIE", m, mt["habits"])), ("VEST_TEAM", gilet_dessus(0.028)),
                  ("BELT_TEAM", lambda m, mt: ceinture("BELT", m, mt["habits"], mt[EQUIPE])),
                  ("GLOVES", lambda m, mt: gants("GLOVES", m, mt["habits"]))],
        "electrician": [("HOODIE", lambda m, mt: sweat("HOODIE", m, mt["habits"])), ("VEST_TEAM", gilet_dessus(0.028)),
                        ("BELT_TEAM", lambda m, mt: ceinture("BELT", m, mt["habits"], mt[EQUIPE])),
                        ("GLOVES", lambda m, mt: gants("GLOVES", m, mt["habits"]))],
        # plombier : salopette graphite, gilet, ceinture, gants
        "plumber": [("OVERALLS", lambda m, mt: salopette("OVERALLS", m, mt["habits"])), ("VEST_TEAM", gilet_dessus(0.030)),
                    ("BELT_TEAM", lambda m, mt: ceinture("BELT", m, mt["habits"], mt[EQUIPE])),
                    ("GLOVES", lambda m, mt: gants("GLOVES", m, mt["habits"]))],
        # peintre : salopette blanche a genouilleres, gilet, gants (MB_05)
        "painter": [("OVERALLS", lambda m, mt: salopette("OVERALLS", m, mt["clair"], genouilleres=mt["habits"])),
                    ("VEST_TEAM", gilet_dessus(0.032)), ("GLOVES", lambda m, mt: gants("GLOVES", m, mt["habits"]))],
        # controleur : gilet a bandes de la couleur de l'equipe, sur le sous-pull (MB_05, simplifie)
        "inspector": [("VEST_TEAM", gilet_dessus(0.012))],
        # concierge : polo de la couleur de l'equipe, ceinture, gants (MB_05)
        "concierge": [("POLO_TEAM", lambda m, mt: polo("POLO", m, mt[EQUIPE])),
                      ("BELT_TEAM", lambda m, mt: ceinture("BELT", m, mt["habits"], mt[EQUIPE])),
                      ("GLOVES", lambda m, mt: gants("GLOVES", m, mt["habits"]))],
        # representante : veste graphite, chemise claire, pantalon clair (MB_05)
        "representative": [("JACKET", lambda m, mt: veste("JACKET", m, mt, mt["habits"], True)),
                           ("SHIRT", lambda m, mt: chemise("SHIRT", m, mt["clair"])),
                           ("TROUSERS", lambda m, mt: pantalon("TROUSERS", m, mt["bois"]))],
    }


def tenue(rig, metier, mats):
    """Les pieces de la tenue d'un metier, deformees par le squelette : CHR_OUTFIT_<METIER>_<PIECE>."""
    prefixe = "CHR_OUTFIT_" + metier.upper() + "_"
    faites = []
    for piece, fabrique in TENUES()[metier]:
        faites.append(_piece(rig, prefixe + piece, lambda m, f=fabrique, p=piece: reunit(prefixe + p + "_TMP", f(m, mats))))
    return faites


# --- Les outils (fichier PRP_CHR_TOOLS) ----------------------------------------------------------------------------
# Rigides, enfants de l'os PROP_R (le creux de la main droite) : le composant montre celui de la personne. Construits
# dans le repere de la prise, main pendante : -Z le long de la main, -Y devant, +X vers le corps (pour la main droite).
# Les outils reprennent les materiaux deja portes (graphite, blanc, equipe) pour qu'un personnage reste sous 6.
T = "PRP_TOOL_"


def _prise():
    _, d, poignet = bras_de("R")
    return poignet + d * 0.06 + Vector((0, -0.035, 0)), d


def _place(o, rig):
    """Pose l'outil construit dans le repere de la prise (main pendante, droite) a la prise reelle, et le rattache."""
    prise, d = _prise()
    inclinaison = Matrix.Rotation(math.atan2(-d.x, -d.z), 4, "Y")
    o.matrix_world = Matrix.Translation(prise) @ inclinaison @ o.matrix_world
    applique_tout(o)
    rattache_a_l_os(o, rig, "PROP_R")
    return o


def applique_tout(o):
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def _boite(nom, taille, centre, mat):
    o = fuseau(nom, [(-taille[2] / 2, 0, 0, 0, 0), (-taille[2] / 2 + 0.001, taille[0] / 2, taille[1] / 2, 0, 0),
                     (taille[2] / 2 - 0.001, taille[0] / 2, taille[1] / 2, 0, 0), (taille[2] / 2, 0, 0, 0, 0)],
               cotes=4, exposant=8.0, origine=centre, mat=mat)
    return o


def outils(rig, mats, seuls=None):
    """Les accessoires de la fiche (bible 5), agrandis comme le reste de la famille."""
    g, c, eq = mats["habits"], mats["clair"], mats[EQUIPE]
    fab = {
        # rouleau de plans, tenu le long du bras
        "PLANS": lambda: [membre(T + "PLANS_TUBE", (0.0, -0.035, -0.20), (0.0, -0.035, 0.32), [(0, 0.036), (1, 0.036)], cotes=12,
                                 debord=(0.004, 0.004), mat=c)],
        # tablette : tenue par le bord, l'ecran clair devant (il regarde en haut quand l'avant-bras est a l'horizontale) ;
        # pas de MAT_TECH : avec le gilet orange et le casque jaune, l'equipe site depasserait les 6 materiaux
        "TABLET": lambda: [_boite(T + "TABLET_CASE", (0.20, 0.018, 0.27), (0.09, -0.01, -0.10), g),
                           _boite(T + "TABLET_SCREEN", (0.17, 0.004, 0.23), (0.09, -0.021, -0.10), c)],
        # trepied de geometre replie, porte debout, l'instrument en haut
        "TRIPOD": lambda: [membre(T + "TRIPOD_LEG_%d" % i, (0.024 * math.cos(a), -0.02 + 0.024 * math.sin(a), -0.66),
                                  (0.006 * math.cos(a), -0.02 + 0.006 * math.sin(a), 0.62), [(0, 0.016), (1, 0.014)], cotes=6, mat=g)
                           for i, a in enumerate((0.0, 2.1, 4.2))] +
                          [_boite(T + "TRIPOD_HEAD", (0.09, 0.09, 0.07), (0.0, -0.02, 0.66), c),
                           membre(T + "TRIPOD_SCOPE", (0.0, -0.08, 0.70), (0.0, 0.05, 0.70), [(0, 0.022), (1, 0.018)], cotes=10, mat=eq)],
        # talkie-walkie et son antenne
        "RADIO": lambda: [_boite(T + "RADIO_BODY", (0.052, 0.036, 0.13), (0.0, -0.01, -0.02), g),
                          membre(T + "RADIO_ANTENNA", (0.012, -0.01, 0.045), (0.012, -0.01, 0.12), [(0, 0.008), (1, 0.007)],
                                 cotes=6, mat=g)],
        # rouleau a peinture sur sa perche, tenu debout
        "ROLLER": lambda: [membre(T + "ROLLER_POLE", (0.0, -0.01, -0.62), (0.0, -0.01, 0.42), [(0, 0.014), (1, 0.014)], cotes=8, mat=eq),
                           membre(T + "ROLLER_ARM", (0.0, -0.01, 0.42), (0.0, -0.06, 0.50), [(0, 0.009), (1, 0.009)], cotes=6, mat=g),
                           membre(T + "ROLLER_COVER", (-0.10, -0.06, 0.53), (0.10, -0.06, 0.53), [(0, 0.042), (1, 0.042)],
                                  cotes=12, debord=(0.006, 0.006), mat=c)],
        # truelle : le manche dans le poing, la lame vers l'avant
        "TROWEL": lambda: [membre(T + "TROWEL_HANDLE", (0.0, -0.01, 0.04), (0.0, -0.01, -0.07), [(0, 0.018), (1, 0.016)], cotes=8, mat=g),
                           fuseau(T + "TROWEL_BLADE", [(0, 0, 0, 0, 0), (0.03, 0.006, 0.030, 0, 0), (0.10, 0.006, 0.058, 0, 0),
                                                       (0.17, 0.006, 0.060, 0, 0), (0.175, 0, 0, 0, 0)],
                                  cotes=8, origine=(0.0, -0.03, -0.09), direction=(0, -0.55, -0.85), reference=(1, 0, 0), mat=c)],
        # touret de cable, tenu par le cote
        "CABLE": lambda: [_tore(T + "CABLE_COIL", (0.10, -0.01, -0.06), 0.085, 0.026, mats["orange"])],
        # planchette et sa feuille
        "CLIPBOARD": lambda: [_boite(T + "CLIPBOARD_BOARD", (0.21, 0.014, 0.28), (0.10, -0.01, -0.10), g),
                              _boite(T + "CLIPBOARD_PAPER", (0.18, 0.004, 0.22), (0.10, -0.019, -0.12), c)],
        # tampon : la poignee et la semelle de la couleur de l'equipe (une forme, sans texte)
        "STAMP": lambda: [ellipsoide(T + "STAMP_KNOB", (0.0, -0.01, 0.025), (0.026, 0.026, 0.026), mat=g),
                          membre(T + "STAMP_STEM", (0.0, -0.01, 0.01), (0.0, -0.01, -0.06), [(0, 0.012), (1, 0.014)], cotes=8, mat=g),
                          _boite(T + "STAMP_BASE", (0.075, 0.055, 0.032), (0.0, -0.01, -0.075), eq)],
        # trousseau de cles
        "KEYS": lambda: [_tore(T + "KEYS_RING", (0.0, -0.02, -0.03), 0.030, 0.005, mats["acier"])] +
                        [_boite(T + "KEYS_KEY_%d" % i, (0.014, 0.006, 0.060), (0.012 * (i - 1), -0.02, -0.085 - 0.01 * abs(i - 1)),
                                mats["acier"]) for i in range(3)],
        # classeur tenu contre la hanche
        "BINDER": lambda: [_boite(T + "BINDER_COVER", (0.24, 0.055, 0.30), (0.11, 0.0, -0.11), g),
                           _boite(T + "BINDER_SPINE_LABEL", (0.012, 0.036, 0.10), (-0.012, 0.0, -0.08), c)],
        # cle a molette (plombier)
        "WRENCH": lambda: [_boite(T + "WRENCH_HANDLE", (0.030, 0.016, 0.22), (0.0, -0.01, -0.06), c),
                           _boite(T + "WRENCH_JAW", (0.075, 0.020, 0.050), (0.012, -0.01, -0.185), c)],
    }
    faits = []
    for nom, f in fab.items():
        if seuls is None or nom in seuls:
            parts = f()
            o = reunit(T + nom + ("_TEAM" if nom in ("STAMP", "ROLLER", "TRIPOD") else ""), parts)
            faits.append(_place(o, rig))
    return faits


def _tore(nom, centre, grand, petit, mat):
    """Tore dont l'axe va vers le corps (X) : touret de cable, anneau de cles."""
    bpy.ops.mesh.primitive_torus_add(major_radius=grand, minor_radius=petit, major_segments=16, minor_segments=8,
                                     location=centre, rotation=(0, math.pi / 2, 0))
    o = bpy.context.active_object
    o.name = o.data.name = nom
    applique(o)
    for p in o.data.polygons:
        p.use_smooth = True
    o.data.materials.append(mat)
    return o


# --- Animations ----------------------------------------------------------------------------------------------------

def sym(x=0.0, y=0.0, z=0.0):
    """Une rotation ecrite cote gauche, et sa copie en miroir pour le cote droit."""
    return (x, y, z), (x, -y, -z)


def pose(**os_):
    """Pose = {os court: (x, y, z) en degres}. Les cles L/R s'ecrivent ARM=sym(...) pour les deux cotes, ou ARM_L=..."""
    p = {}
    for nom, v in os_.items():
        if nom == "loc":
            p["loc"] = v
        elif isinstance(v[0], tuple):
            p[nom + "_L"], p[nom + "_R"] = v
        else:
            p[nom] = v
    return p


# Posture de base, debout : bras le long du corps (la pose de repos les ecarte de 10 degres), coudes a peine plies.
DEBOUT = pose(ARM=sym(0, 0, -6), FOREARM=sym(8, 0, 0))


def melange(base, **ajouts):
    """La posture de base, completee ou corrigee par d'autres rotations."""
    p = dict(base)
    p.update(pose(**ajouts))
    return p


def clip(rig, nom, cles):
    """Une action ANM_CHR_... : cles = [(image, pose)], chaque os cle a chaque image (les os absents restent a 0).
    L'action est rangee dans une piste NLA muette : l'export glTF en fait un clip, sans qu'elle se melange aux autres."""
    if rig.animation_data is None:
        rig.animation_data_create()
    action = bpy.data.actions.new(nom)
    rig.animation_data.action = action
    for image, p in cles:
        for pb in rig.pose.bones:
            court = pb.name[len(RIG) + 1:]
            pb.rotation_euler = [math.radians(a) for a in p.get(court, (0, 0, 0))]
            pb.keyframe_insert("rotation_euler", frame=image)
            if court == "HIPS":
                pb.location = p.get("loc", (0, 0, 0))
                pb.keyframe_insert("location", frame=image)
    rig.animation_data.action = None
    piste = rig.animation_data.nla_tracks.new()
    piste.name = nom
    piste.strips.new(nom, int(cles[0][0]), action)
    piste.mute = True
    return action


def anime(rig):
    """Les onze clips de la fiche, sur place, a 30 images par seconde. Chaque boucle revient a sa posture de depart."""
    noms = []
    for nom, cles in CLIPS(rig):
        clip(rig, nom, cles)
        noms.append(nom)
    return noms


def miroir(p):
    """La meme pose, cote gauche et cote droit echanges (le pas suivant d'une marche)."""
    m = {}
    for nom, v in p.items():
        if nom == "loc":
            m[nom] = v
        elif nom.endswith("_L") or nom.endswith("_R"):
            m[nom[:-1] + ("R" if nom.endswith("_L") else "L")] = (v[0], -v[1], -v[2])
        else:
            m[nom] = (v[0], -v[1], -v[2])
    return m


def CLIPS(rig):
    """Les clips : (nom, [(image, pose)]). Durees a 30 images par seconde, premiere cle a l'image 0 (l'export glTF compte
    le temps depuis l'image 0 : une premiere cle a 1 figerait la boucle une image). Toutes les boucles commencent et finissent
    sur la meme pose, et rien ne se deplace dans la scene (la marche est sur place : GDC deplace le personnage)."""
    D = DEBOUT
    PENCHE = dict(SPINE=(10, 0, 0), CHEST=(5, 0, 0), NECK=(8, 0, 0), HEAD=(10, 0, 0))

    # WALK, 32 images (1,07 s) en boucle : deux pas. Depart : pied gauche devant, talon pose, bras droit devant.
    pas = melange(D, THIGH_L=(25, 0, 0), SHIN_L=(-5, 0, 0), FOOT_L=(12, 0, 0),
                  THIGH_R=(-20, 0, 0), SHIN_R=(-12, 0, 0), FOOT_R=(-8, 0, 0),
                  ARM_L=(-18, 0, -6), ARM_R=(18, 0, 6), FOREARM_L=(10, 0, 0), FOREARM_R=(25, 0, 0), SPINE=(3, 5, 0))
    passage = melange(D, THIGH_L=(-2, 0, 0), THIGH_R=(18, 0, 0), SHIN_R=(-48, 0, 0), FOOT_R=(5, 0, 0), SPINE=(3, 0, 0),
                      loc=(0, 0.025, 0))
    marche = [(0, pas), (8, passage), (16, miroir(pas)), (24, miroir(passage)), (32, pas)]

    # WORK, 60 images (2 s) en boucle : penche, les deux mains devant a la taille ; la main droite monte et frappe deux
    # fois (geste de metier generique ; l'outil du metier viendra dans la main droite, os PROP_R).
    travail = melange(D, ARM=sym(38, 0, -10), FOREARM=sym(48, 0, 0), THIGH=sym(0, 0, 4), **PENCHE)
    leve = melange(travail, ARM_R=(68, -20, 0), FOREARM_R=(78, 0, 0))

    # TYPING, 60 images (2 s) en boucle : la tablette tenue a deux mains devant le ventre, tete baissee ; la main droite
    # tape (petits mouvements de l'avant-bras et de la main).
    tablette = melange(D, ARM=sym(22, 0, -14), FOREARM=sym(78, 0, 0), NECK=(10, 0, 0), HEAD=(18, 0, 0))
    tape = melange(tablette, FOREARM_R=(84, 0, 0), HAND_R=(12, 0, 0))

    # INSPECT, 120 images (4 s) en boucle : penche en avant, la main droite montre ce qu'on controle, la tete balaie.
    controle = melange(D, ARM_R=(35, 0, 2), FOREARM_R=(22, 0, 0), SPINE=(12, 0, 0), CHEST=(6, 0, 0), NECK=(8, 0, 0),
                       HEAD=(14, 0, 0))

    # READ, 120 images (4 s) en boucle : un document tenu a deux mains devant la poitrine, tete baissee, petite lecture.
    lecture = melange(D, ARM=sym(18, 0, -16), FOREARM=sym(96, 0, 0), NECK=(8, 0, 0), HEAD=(22, 0, 0))

    # THINKING, 120 images (4 s) en boucle : la main droite au menton, le bras gauche en travers du ventre, tete inclinee.
    pense = melange(D, ARM_R=(28, -45, 0), FOREARM_R=(128, 0, 0), ARM_L=(15, 45, -4), FOREARM_L=(88, 0, 0),
                    HEAD=(4, 0, 4))

    # WAITING, 120 images (4 s) en boucle : mains jointes devant, le poids passe d'une jambe a l'autre, la tete regarde
    # a gauche puis a droite.
    attente = melange(D, ARM=sym(10, 42, -4), FOREARM=sym(55, 0, 0))

    # TALK, 60 images (2 s) en boucle : la main droite ouverte accompagne la parole, petit hochement de tete.
    parle = melange(D, ARM_R=(22, 0, 6), FOREARM_R=(58, 0, 0), ARM_L=(8, 0, -4), FOREARM_L=(20, 0, 0))

    # CELEBRATE, 60 images (2 s), joue une fois puis IDLE (docs/correspondances.md) : flexion, petit saut bras leves,
    # reception, retour debout. Commence et finit debout.
    accroupi = melange(D, THIGH=sym(22, 0, 0), SHIN=sym(-40, 0, 0), FOOT=sym(18, 0, 0), SPINE=(8, 0, 0), loc=(0, -0.05, 0))
    bras_leves = dict(ARM=sym(155, 0, -15), FOREARM=sym(12, 0, 0))

    # BLOCKED, posture fixe (2 images identiques) : debout, bras croises, la tete droite. Immobile (bible 17.4).
    croise = melange(D, ARM_L=(22, 50, -4), ARM_R=(26, -50, 4), FOREARM_L=(96, 0, 0), FOREARM_R=(108, 0, 0), HEAD=(-2, 0, 0))

    return [
        # IDLE, 120 images (4 s) en boucle : debout, respiration lente (poitrine), la tete regarde un peu a gauche.
        ("ANM_CHR_IDLE", [(0, D), (60, melange(D, CHEST=(2, 0, 0), HEAD=(0, 4, 0))), (120, D)]),
        ("ANM_CHR_WALK", marche),
        ("ANM_CHR_WORK", [(0, travail), (15, leve), (30, travail), (45, leve), (60, travail)]),
        ("ANM_CHR_TYPING", [(0, tablette), (8, tape), (15, tablette), (23, tape), (30, tablette), (38, tape), (45, tablette),
                            (53, tape), (60, tablette)]),
        ("ANM_CHR_INSPECT", [(0, controle), (40, melange(controle, HEAD=(14, 15, 0))), (80, melange(controle, HEAD=(14, -15, 0))),
                             (120, controle)]),
        ("ANM_CHR_READ", [(0, lecture), (60, melange(lecture, HEAD=(24, 5, 0), CHEST=(2, 0, 0))), (120, lecture)]),
        ("ANM_CHR_THINKING", [(0, pense), (60, melange(pense, HEAD=(6, 0, 8), HIPS=(0, 0, 2))), (120, pense)]),
        ("ANM_CHR_WAITING", [(0, attente), (30, melange(attente, HIPS=(0, 0, 3), SPINE=(0, 0, -3), HEAD=(0, 20, 0))),
                             (60, attente), (90, melange(attente, HIPS=(0, 0, -3), SPINE=(0, 0, 3), HEAD=(0, -20, 0))),
                             (120, attente)]),
        ("ANM_CHR_TALK", [(0, parle), (15, melange(parle, ARM_R=(26, 0, 14), FOREARM_R=(74, 0, 0), HEAD=(5, 0, 0))), (30, parle),
                          (45, melange(parle, ARM_R=(18, 0, 10), FOREARM_R=(66, 0, 0), HEAD=(4, 0, 0))), (60, parle)]),
        ("ANM_CHR_CELEBRATE", [(0, D), (12, accroupi), (22, melange(D, loc=(0, 0.05, 0), **bras_leves)),
                               (32, melange(accroupi, **bras_leves)), (44, melange(D, **bras_leves)), (60, D)]),
        ("ANM_CHR_BLOCKED", [(0, croise), (30, croise)]),
    ]


# --- Construction --------------------------------------------------------------------------------------------------
# Le fichier principal (CHR_BASE_MASTER) : le corps et ses deux morphologies, le visage, les cils, le casque blanc, le
# squelette et les animations. Les autres fichiers du kit (VARIANTES) : les coiffures, les outils, une tenue par metier.
# Tous portent le meme squelette, que le composant reutilise : il rebranche les pieces sur les os du fichier principal.

METIERS = ["client", "architect", "engineer", "foreman", "mason", "electrician", "plumber", "painter", "inspector",
           "concierge", "representative"]
EQUIPES = {"architecture": "MAT_FABRIC_ARCHITECTURE", "studies": "MAT_FABRIC_STUDIES", "site": "MAT_FABRIC_SITE",
           "reception": "MAT_FABRIC_RECEPTION", "operations": "MAT_FABRIC_OPERATIONS", "client": "MAT_SURFACE"}


def _mats(c):
    return {"peau": c.materiau(MAT_PEAU), "habits": c.materiau(MAT_HABITS), "cheveux": c.materiau(MAT_CHEVEUX),
            "sombre": c.materiau(MAT_SOMBRE), "clair": c.materiau(MAT_CLAIR), EQUIPE: c.materiau(EQUIPE),
            "bois": c.materiau("MAT_WOOD"), "tech": c.materiau("MAT_TECH"), "orange": c.materiau("MAT_FABRIC_HIVIS"),
            "acier": c.materiau("MAT_STEEL")}


def construit(c):
    mats = _mats(c)
    rig = squelette()
    corps(rig, mats)
    visage(rig, mats)
    lashes = cils(rig, mats["sombre"])
    helmet = casque(rig, mats["clair"])
    # les ancres de la fiche character : l'etiquette au-dessus du casque, le badge a cote de la tete (bible 17.7)
    c.ancre("ANCHOR_LABEL", (0, 0, 2.05))
    c.ancre("ANCHOR_BADGE", (0.30, 0, 1.78))
    animations = anime(rig)

    # Atelier seulement : le clip, le casque, et une personne de l'equipe habillee. L'export garde la base seule.
    if "atelier" in sys.modules or any(Path(a).name == "atelier.py" for a in sys.argv):
        vue_atelier(c, rig, helmet, lashes, mats)
    return {"triangles_vises": 4500, "animations": animations}


def _construit_coiffures(c):
    m = _mats(c)
    coiffures(squelette(), m["cheveux"], m["habits"])


def _construit_outils(c):
    outils(squelette(), _mats(c))


def _construit_tenue(metier):
    return lambda c: tenue(squelette(), metier, _mats(c))


VARIANTES = {"CHR_HAIR_KIT_v001": _construit_coiffures, "PRP_CHR_TOOLS_v001": _construit_outils,
             **{"CHR_OUTFIT_%s_v001" % t.upper(): _construit_tenue(t) for t in METIERS}}


def cache(o):
    o.hide_render = o.hide_viewport = True
    o.hide_set(True)


def equipe():
    chemin = Path(__file__).resolve().parents[2] / "components" / "kit" / "character-kit" / "equipe.json"
    return json.loads(chemin.read_text(encoding="utf-8"))["personnes"]


def vue_atelier(c, rig, helmet, lashes, mats):
    """La vue de l'atelier : GDC_ATELIER_CLIP (le clip, sinon ANM_CHR_IDLE), GDC_ATELIER_CASQUE=0 (sans casque) et
    GDC_ATELIER_PERSONNE=<id de equipe.json> (la personne habillee, comme la galerie l'assemble). Captures seulement :
    la mesure compte toutes les pieces montees."""
    rig.animation_data.action = bpy.data.actions.get(os.environ.get("GDC_ATELIER_CLIP", "ANM_CHR_IDLE"))
    ident = os.environ.get("GDC_ATELIER_PERSONNE")
    if not ident:
        cache(lashes)
        if os.environ.get("GDC_ATELIER_CASQUE") == "0":
            cache(helmet)
        return
    habille(c, rig, next(p for p in equipe() if p["id"] == ident), helmet, lashes, mats)


def habille(c, rig, p, helmet, lashes, mats):
    """Monte la coiffure, la tenue et l'outil d'une personne et lui donne ses couleurs (le pendant Blender de
    src/personnage.js) : peau, cheveux, equipe (casque et pieces _TEAM ; gilet de l'equipe site en orange fluo)."""
    seules = {p["coiffure"].upper()} | ({"BEARD"} if p["barbe"] else set()) | ({"GLASSES"} if p["lunettes"] else set())
    pieces = coiffures(rig, mats["cheveux"], mats["habits"], seules) + tenue(rig, p["metier"], mats)
    if p["outil"]:
        pieces += outils(rig, mats, {p["outil"].upper()})
    equipe_mat = EQUIPES.get(p["equipe"])
    echanges = {MAT_PEAU: c.materiau("MAT_SKIN_" + p["peau"]), MAT_CHEVEUX: c.materiau("MAT_HAIR_" + p["cheveux"].upper())}
    for o in [x for x in bpy.data.objects if x.type == "MESH"]:
        for i, m in enumerate(o.data.materials):
            if m and m.name in echanges:
                o.data.materials[i] = echanges[m.name]
            elif m and m.name == EQUIPE and o.name.endswith("_TEAM") and equipe_mat:
                gilet_site = "_VEST_" in o.name + "_" and p["equipe"] == "site"
                o.data.materials[i] = c.materiau("MAT_FABRIC_HIVIS" if gilet_site else equipe_mat)
        if o.data.shape_keys and "FEMININE" in o.data.shape_keys.key_blocks:
            o.data.shape_keys.key_blocks["FEMININE"].value = 1.0 if p["morpho"] == "F" else 0.0
    if not p["casque"]:
        cache(helmet)
    elif equipe_mat:
        helmet.data.materials[0] = c.materiau(equipe_mat)
    if p["morpho"] != "F":
        cache(lashes)
