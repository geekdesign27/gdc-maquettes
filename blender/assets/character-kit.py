"""Le personnage maitre (catalogue : character-kit), deuxieme etalon de l'atelier. Bible WORKSITE, sections 2.5, 5,
17.4 et 18.3 ; decision de PA du 19 octobre 2026 : 1,70 m et 5 tetes (une tete = 0,34 m).

Version grise : un corps neutre, sans tenue de metier ni couleur d'equipe, pour la planche comparative des morphologies.
Un seul squelette pour tous les personnages, RIG_CHR_BASE ; les variantes viendront par la tenue, la coiffure, les
accessoires et la couleur d'equipe.

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
Dans l'atelier seulement, deux variables d'environnement choisissent la vue : GDC_ATELIER_CLIP (le clip actif, sinon
ANM_CHR_IDLE) et GDC_ATELIER_CASQUE=0 (sans casque).
"""
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

MAT_CORPS = "MAT_CONCRETE"  # version grise : peau et vetements d'un meme gris
MAT_CASQUE = "MAT_SURFACE"  # comme le casque blanc (decision du 19 octobre 2026)
MAT_CHEVEUX = "MAT_FABRIC_GRAPHITE"
MAT_SOMBRE = "MAT_RUBBER"  # chaussures et yeux


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


# --- Le corps ------------------------------------------------------------------------------------------------------

def corps(rig, mat_corps, mat_sombre):
    ex, ez = EPAULE
    hx, hz = HANCHE
    s = math.sin(math.radians(ECART_BRAS))
    co = math.cos(math.radians(ECART_BRAS))
    parties = []

    # Le tronc, de l'entrejambe a la base du cou : bassin large, taille a peine marquee, epaules arrondies.
    tronc = fuseau(P + "TORSO", [
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
    ], cotes=16, mat=mat_corps)
    poids_le_long(tronc, (0, 0, 0), (0, 0, 1), [(0.84, "HIPS"), (0.92, "SPINE"), (1.00, "SPINE"), (1.10, "CHEST")])
    parties.append(tronc)

    cou = membre(P + "NECK", (0, 0, 1.27), (0, 0, 1.42), [(0, 0.070), (0.5, 0.064), (1, 0.066)], cotes=12, mat=mat_corps)
    poids_le_long(cou, (0, 0, 1.27), (0, 0, 1), [(0.02, "CHEST"), (0.05, "NECK"), (0.10, "NECK"), (0.13, "HEAD")])
    parties.append(cou)

    # La tete : ronde, un peu plus large aux pommettes, menton doux (REF_CHR_001).
    tete = fuseau(P + "HEAD", [
        (MENTON - 0.008, 0, 0, 0, -0.012),
        (MENTON + 0.006, 0.065, 0.052, 0, -0.032),
        (MENTON + 0.035, 0.115, 0.098, 0, -0.020),
        (MENTON + 0.080, 0.145, 0.130, 0, -0.008),
        (MENTON + 0.140, 0.158, 0.147, 0, -0.002),
        (MENTON + 0.200, 0.160, 0.152, 0, 0.004),
        (MENTON + 0.250, 0.151, 0.148, 0, 0.008),
        (MENTON + 0.288, 0.125, 0.126, 0, 0.010),
        (MENTON + 0.308, 0.080, 0.083, 0, 0.010),
        (MENTON + 0.316, 0, 0, 0, 0.010),
    ], cotes=16, mat=mat_corps)
    rigide(tete, "HEAD")
    parties.append(tete)
    for sg in (1, -1):
        oreille = ellipsoide(P + "EAR_" + ("L" if sg > 0 else "R"), (sg * 0.157, 0.012, MENTON + 0.135), (0.022, 0.035, 0.048),
                             cotes=8, anneaux=6, mat=mat_corps)
        rigide(oreille, "HEAD")
        parties.append(oreille)

    for cote, sg in (("L", 1), ("R", -1)):
        epaule = Vector((sg * ex, 0, ez))
        d = Vector((sg * s, 0, -co))
        poignet = epaule + d * (BRAS + AVANT_BRAS)
        bras = membre(P + "ARM_" + cote, epaule, poignet, [(0, 0.062), (0.25, 0.058), (0.52, 0.049), (0.75, 0.047), (1, 0.038)],
                      debord=(0.03, 0.01), mat=mat_corps)
        poids_le_long(bras, epaule, d, [(-0.02, "SHOULDER_" + cote), (0.04, "ARM_" + cote), (BRAS - 0.04, "ARM_" + cote),
                                         (BRAS + 0.04, "FOREARM_" + cote)])
        parties.append(bras)

        # La main en moufle, paume vers le corps, et le pouce vers l'avant : simple, prete a tenir un accessoire.
        main = fuseau(P + "HAND_" + cote, [
            (-0.015, 0, 0, 0, 0),
            (-0.008, 0.023, 0.031, 0, 0),
            (0.020, 0.029, 0.044, 0, 0),
            (0.060, 0.031, 0.052, 0, 0.002),
            (0.100, 0.027, 0.047, 0, 0.004),
            (0.122, 0.018, 0.033, 0, 0.004),
            (0.130, 0, 0, 0, 0.004),
        ], cotes=12, origine=poignet, direction=d, mat=mat_corps)
        rigide(main, "HAND_" + cote)
        pouce_base = poignet + d * 0.030 + Vector((0, -0.030, 0))
        pouce = membre(P + "THUMB_" + cote, pouce_base, pouce_base + (d * 0.6 + Vector((0, -0.8, 0))).normalized() * 0.05,
                       [(0, 0.019), (1, 0.016)], cotes=8, debord=(0.01, 0.012), mat=mat_corps)
        rigide(pouce, "HAND_" + cote)
        parties += [main, pouce]

        hanche = Vector((sg * hx, 0, hz))
        jambe = membre(P + "LEG_" + cote, hanche, (sg * hx, 0, CHEVILLE), [(0, 0.092), (0.25, 0.084), (0.5, 0.068), (0.62, 0.068),
                                                                         (0.85, 0.058), (1, 0.052)], debord=(0.04, 0.02), mat=mat_corps)
        poids_le_long(jambe, hanche, (0, 0, -1), [(-0.03, "HIPS"), (0.02, "THIGH_" + cote), (hz - GENOU - 0.04, "THIGH_" + cote),
                                                    (hz - GENOU + 0.04, "SHIN_" + cote)])
        parties.append(jambe)

        # La chaussure de securite agrandie (x 1,2) : 0,30 m de long, semelle plate, bout arrondi.
        talon = 0.085
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
        ], cotes=12, exposant=2.6, origine=(sg * PIED_X, talon, 0), direction=(0, -1, 0), reference=(0, 0, 1), mat=mat_sombre)
        rigide(chaussure, "FOOT_" + cote)
        parties.append(chaussure)

    o = fusionne_corps(parties)
    deforme(o, rig)
    return o


def fusionne_corps(parties):
    """Un seul maillage pour le corps : les groupes de sommets de meme nom (les os) se rejoignent."""
    bpy.ops.object.select_all(action="DESELECT")
    for x in parties:
        x.select_set(True)
    bpy.context.view_layer.objects.active = parties[0]
    bpy.ops.object.join()
    o = parties[0]
    o.name = o.data.name = P + "BODY"
    return o


def deforme(o, rig):
    o.parent = rig
    m = o.modifiers.new("squelette", "ARMATURE")
    m.object = rig


def cheveux(rig, mat):
    """Coupe courte neutre : une masse posee sur le crane, qui sort de la tete au-dessus du front et descend a la nuque."""
    o = fuseau(P + "HAIR", [
        (MENTON + 0.085, 0, 0, 0, 0.050),
        (MENTON + 0.100, 0.100, 0.100, 0, 0.045),
        (MENTON + 0.150, 0.155, 0.158, 0, 0.030),
        (MENTON + 0.205, 0.169, 0.165, 0, 0.016),
        (MENTON + 0.262, 0.162, 0.160, 0, 0.012),
        (MENTON + 0.305, 0.132, 0.132, 0, 0.012),
        (MENTON + 0.330, 0.078, 0.080, 0, 0.012),
        (HAUTEUR, 0, 0, 0, 0.012),
    ], cotes=16, mat=mat)
    rattache_a_l_os(o, rig, "HEAD")
    return o


def yeux(rig, mat):
    """Deux ovales sombres, simples (bible 4 : formes simples, contrastes lisibles). Proposition a valider par PA."""
    parties = []
    for sg in (1, -1):
        parties.append(ellipsoide(P + "EYE_" + ("L" if sg > 0 else "R"), (sg * 0.056, -0.136, MENTON + 0.140), (0.019, 0.012, 0.028),
                                  cotes=8, anneaux=6, mat=mat))
    bpy.ops.object.select_all(action="DESELECT")
    for x in parties:
        x.select_set(True)
    bpy.context.view_layer.objects.active = parties[0]
    bpy.ops.object.join()
    o = parties[0]
    o.name = o.data.name = P + "EYES"
    rattache_a_l_os(o, rig, "HEAD")
    return o


def casque(rig, mat):
    """Casque de chantier agrandi (x 1,2) : coque bombee, rebord tout autour et visiere vers l'avant."""
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
    rattache_a_l_os(o, rig, "HEAD")
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

def construit(c):
    mat_corps, mat_sombre = c.materiau(MAT_CORPS), c.materiau(MAT_SOMBRE)
    rig = squelette()
    corps(rig, mat_corps, mat_sombre)
    cheveux(rig, c.materiau(MAT_CHEVEUX))
    yeux(rig, mat_sombre)
    helmet = casque(rig, c.materiau(MAT_CASQUE))
    animations = anime(rig)

    # Atelier seulement : le clip montre et le casque. L'export garde tout, sans action active (pose de repos).
    if "atelier" in sys.modules or any(Path(a).name == "atelier.py" for a in sys.argv):
        vue_atelier(rig, helmet)
    return {"triangles_vises": 3500, "animations": animations}


def vue_atelier(rig, helmet):
    rig.animation_data.action = bpy.data.actions.get(os.environ.get("GDC_ATELIER_CLIP", "ANM_CHR_IDLE"))
    if os.environ.get("GDC_ATELIER_CASQUE") == "0":
        helmet.hide_render = helmet.hide_viewport = True
        helmet.hide_set(True)
