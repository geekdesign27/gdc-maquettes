"""Outils communs des scripts Blender de l'atelier des maquettes.

Conventions (bible WORKSITE, section 9) : 1 unite = 1 metre, Z vertical, avant vers -Y,
origine au centre de l'emprise au sol, echelle et rotations appliquees, noms FAMILLE_TYPE_VARIANTE_vNNN.
Rien ici ne lit le reseau : les couleurs viennent de src/palette.json.
"""
import json
import math
import re
from pathlib import Path

import bmesh
import bpy

RACINE = Path(__file__).resolve().parents[2]
PALETTE = json.loads((RACINE / "src" / "palette.json").read_text(encoding="utf-8"))
FAMILLES = ("BLD", "CHR", "VEH", "EQP", "PRP", "ENV", "MAT", "RIG", "ANM", "ANCHOR")
NOM_VALIDE = re.compile(r"^(BLD|CHR|VEH|EQP|PRP|ENV|RIG)_[A-Z0-9]+(_[A-Z0-9]+)*(_v\d{3})?$|^ANCHOR_[A-Z0-9_]+$")


def scene_vide():
    """Repart d'une scene vide, en metres, sans objet ni materiau orphelin."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.unit_settings.system = "METRIC"
    s.unit_settings.scale_length = 1.0
    s.render.fps = 30
    return s


def srgb_vers_lineaire(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def couleur(cle):
    """Couleur de la palette (cle de 'monde', 'equipe' ou 'personnages', ou hexadecimal), en RGBA lineaire pour Blender."""
    hexa = next((PALETTE[s][cle] for s in ("monde", "equipe", "personnages") if cle in PALETTE.get(s, {})), cle).lstrip("#")
    rgb = [srgb_vers_lineaire(int(hexa[i:i + 2], 16) / 255) for i in (0, 2, 4)]
    return (*rgb, 1.0)


def materiau(nom):
    """Materiau partage de la bibliotheque (MAT_*), cree une seule fois par scene. PBR simple, compatible glTF."""
    if nom in bpy.data.materials:
        return bpy.data.materials[nom]
    d = PALETTE["materiaux"][nom]
    m = bpy.data.materials.new(nom)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = couleur(d["couleur"])
    bsdf.inputs["Roughness"].default_value = d["rugosite"]
    bsdf.inputs["Metallic"].default_value = d["metal"]
    return m


def boite(nom, taille, position=(0, 0, 0), mat=None, parent=None, chanfrein=0.0, segments=1, droites=()):
    """Pave de dimensions taille=(x, y, z), pose par sa base : position est le centre de la face inferieure.
    segments > 1 arrondit le chanfrein (rendu 3D douce : il accroche la lumiere ; a lisser ensuite).
    droites : faces dont les aretes restent vives (voir chanfreine), pour les pieces qui se touchent bout a bout."""
    bpy.ops.mesh.primitive_cube_add(size=1)
    o = bpy.context.active_object
    o.name = nom
    o.data.name = nom
    o.scale = taille
    o.location = (position[0], position[1], position[2] + taille[2] / 2)
    applique(o, rotation=False)
    if chanfrein > 0:
        chanfreine(o, chanfrein, segments, droites)
    if mat:
        o.data.materials.append(materiau(mat))
    if parent:
        rattache(o, parent)
    return o


FACES_BOITE = {"x-": (0, min), "x+": (0, max), "y-": (1, min), "y+": (1, max), "z-": (2, min), "z+": (2, max)}


def chanfreine(o, largeur, segments=2, droites=()):
    """Chanfrein applique a la geometrie (classes C1 a C3, bible 18.3), sous l'angle par defaut du modificateur.
    droites : faces de la boite englobante ('x-', 'x+', 'y-', 'y+', 'z-', 'z+') dont les aretes restent vives.
    Deux pieces chanfreinees posees bout a bout laissent un sillon ; leurs faces de contact restent donc droites
    (rive de dalle continue, par exemple)."""
    b = o.modifiers.new("chanfrein", "BEVEL")
    b.width = largeur
    b.segments = segments
    if droites:
        pts = [v.co for v in o.data.vertices]
        plans = [(axe, sens(p[axe] for p in pts)) for axe, sens in (FACES_BOITE[f] for f in droites)]
        poids = o.data.attributes.get("bevel_weight_edge") or o.data.attributes.new("bevel_weight_edge", "FLOAT", "EDGE")
        for e in o.data.edges:
            a, z = e.vertices
            vive = any(abs(o.data.vertices[a].co[axe] - val) < 1e-5 and abs(o.data.vertices[z].co[axe] - val) < 1e-5 for axe, val in plans)
            poids.data[e.index].value = 0.0 if vive else 1.0
        b.limit_method = "WEIGHT"
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier=b.name)
    if "bevel_weight_edge" in o.data.attributes:
        o.data.attributes.remove(o.data.attributes["bevel_weight_edge"])
    return o


def perce(o, taille, position):
    """Retire un pave (meme convention que boite : position = centre de la face inferieure) : baie, porte, cadre.
    A faire avant chanfreine, pour que les tableaux de la baie soient arrondis comme le reste."""
    bpy.ops.mesh.primitive_cube_add(size=1)
    outil = bpy.context.active_object
    outil.scale = taille
    outil.location = (position[0], position[1], position[2] + taille[2] / 2)
    applique(outil, rotation=False)
    m = o.modifiers.new("percement", "BOOLEAN")
    m.operation = "DIFFERENCE"
    m.solver = "EXACT"
    m.object = outil
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier=m.name)
    maillage = outil.data
    bpy.data.objects.remove(outil)
    bpy.data.meshes.remove(maillage)
    return o


def prisme(nom, profil, epaisseur, position=(0, 0, 0), mat=None, parent=None):
    """Profil plat extrude : profil = [(x, z), ...] dans le plan XZ (polygone simple, concave admis : marches,
    pignon), extrude de y = 0 a y = epaisseur, puis decale de position. L'origine reste a (0, 0, 0) + position."""
    n = len(profil)
    sommets = [(x, 0.0, z) for x, z in profil] + [(x, epaisseur, z) for x, z in profil]
    faces = [list(range(n)), list(range(2 * n - 1, n - 1, -1))]
    faces += [[i, (i + 1) % n, n + (i + 1) % n, n + i] for i in range(n)]
    maillage = bpy.data.meshes.new(nom)
    maillage.from_pydata(sommets, [], faces)
    maillage.update()
    o = bpy.data.objects.new(nom, maillage)
    bpy.context.scene.collection.objects.link(o)
    b = bmesh.new()
    b.from_mesh(maillage)
    bmesh.ops.recalc_face_normals(b, faces=b.faces)  # normales vers l'exterieur, quel que soit le sens du profil
    b.to_mesh(maillage)
    b.free()
    o.location = position
    if mat:
        o.data.materials.append(materiau(mat))
    if parent:
        rattache(o, parent)
    return o


def tronc(nom, bas, haut, hauteur, position=(0, 0, 0), mat=None, parent=None):
    """Tronc de pyramide a base rectangulaire : bas=(x, y) a la base, haut=(x, y) au sommet, centres sur position
    (centre de la base, comme boite). Fouille a talus, tas de terre, socle evase."""
    x0, y0, z0 = position
    sommets = [(x0 + sx * l / 2, y0 + sy * p / 2, z0 + z)
               for (l, p), z in ((bas, 0.0), (haut, hauteur))
               for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    faces = [[3, 2, 1, 0], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]
    maillage = bpy.data.meshes.new(nom)
    maillage.from_pydata(sommets, [], faces)
    maillage.update()
    o = bpy.data.objects.new(nom, maillage)
    bpy.context.scene.collection.objects.link(o)
    if mat:
        o.data.materials.append(materiau(mat))
    if parent:
        rattache(o, parent)
    return o


def creuse(o, outil):
    """Retire le volume d'un objet outil (difference booleenne exacte), puis supprime l'outil : une fouille dans un
    socle, un creux de forme libre. Pour un simple pave, perce suffit. A faire avant chanfreine."""
    m = o.modifiers.new("creux", "BOOLEAN")
    m.operation = "DIFFERENCE"
    m.solver = "EXACT"
    m.object = outil
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier=m.name)
    maillage = outil.data
    bpy.data.objects.remove(outil)
    bpy.data.meshes.remove(maillage)
    return o


def cylindre(nom, rayon, hauteur, position=(0, 0, 0), mat=None, parent=None, cotes=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=cotes, radius=rayon, depth=hauteur)
    o = bpy.context.active_object
    o.name = nom
    o.data.name = nom
    o.location = (position[0], position[1], position[2] + hauteur / 2)
    applique(o, rotation=False)
    if mat:
        o.data.materials.append(materiau(mat))
    if parent:
        rattache(o, parent)
    return o


def lisse(o, angle=30):
    """Normales lissees sous l'angle donne (degres), aretes vives au-dela : les chanfreins arrondis
    accrochent la lumiere sans que les grandes faces se deforment. L'export glTF garde ces normales."""
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(angle))
    return o


def instance(nom, source, decalage=(0, 0, 0), rotation_z=0.0, parent=None):
    """Copie qui partage la geometrie et les materiaux de la source : l'export glTF ne l'ecrit qu'une fois.
    decalage est mesure depuis la position de la source ; rotation_z en degres."""
    o = bpy.data.objects.new(nom, source.data)
    bpy.context.scene.collection.objects.link(o)
    o.location = (source.location[0] + decalage[0], source.location[1] + decalage[1], source.location[2] + decalage[2])
    o.rotation_euler[2] = math.radians(rotation_z)
    if parent:
        rattache(o, parent)
    return o


def fusionne(nom, objets):
    """Fusionne des pieces fixes en un seul objet (moins de noeuds, moins d'appels de dessin).
    Jamais une piece animee ni un pivot : ils doivent rester separes. Le premier objet donne l'origine et le parent."""
    actif = objets[0]
    if actif.data.users > 1:
        actif.data = actif.data.copy()  # ne pas modifier une geometrie partagee par des instances
    bpy.ops.object.select_all(action="DESELECT")
    for o in objets:
        o.select_set(True)
    bpy.context.view_layer.objects.active = actif
    bpy.ops.object.join()
    actif.name = nom
    actif.data.name = nom
    return actif


def pivot(nom, position=(0, 0, 0), parent=None):
    """Objet vide servant d'articulation : les animations tournent ou deplacent ce noeud, pas la geometrie."""
    o = bpy.data.objects.new(nom, None)
    o.empty_display_type = "PLAIN_AXES"
    bpy.context.scene.collection.objects.link(o)
    o.location = position
    if parent:
        rattache(o, parent)
    return o


def ancre(nom, position, parent=None):
    """Point d'accroche pour le HTML de GDC : ANCHOR_LABEL, ANCHOR_BADGE, ANCHOR_ENTRY..."""
    assert nom.startswith("ANCHOR_"), nom
    o = pivot(nom, position, parent)
    o.empty_display_type = "SPHERE"
    o.empty_display_size = 0.2
    return o


def rattache(enfant, parent):
    """Rattache en conservant la position monde. Blender ne recalcule matrix_world qu'a la mise a jour de la scene :
    un objet tout juste pose (pivot, ancre) garderait sinon une matrice perimee et sauterait a l'origine du parent."""
    bpy.context.view_layer.update()
    m = enfant.matrix_world.copy()
    enfant.parent = parent
    enfant.matrix_world = m


def applique(o, rotation=True):
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=False, rotation=rotation, scale=True)


def anime(nom_action, noeud, chemin, images, index=None):
    """Cles d'animation : images = [(numero_image, valeur)] ; chemin = 'rotation_euler' ou 'location'.
    Le nom de l'action devient le nom du clip glTF (ANM_...)."""
    if noeud.animation_data is None:
        noeud.animation_data_create()
    action = bpy.data.actions.get(nom_action) or bpy.data.actions.new(nom_action)
    noeud.animation_data.action = action
    for image, valeur in images:
        if index is None:
            setattr(noeud, chemin, valeur)
            noeud.keyframe_insert(data_path=chemin, frame=image)
        else:
            getattr(noeud, chemin)[index] = valeur
            noeud.keyframe_insert(data_path=chemin, index=index, frame=image)
    return action


def verifie_noms():
    """Refuse un nom hors convention avant l'export : mieux vaut un arret qu'un catalogue incoherent."""
    fautes = [o.name for o in bpy.data.objects if not NOM_VALIDE.match(o.name)]
    if fautes:
        raise SystemExit("noms hors convention (FAMILLE_TYPE_VARIANTE ou ANCHOR_*) : " + ", ".join(fautes))


def exporte(chemin_glb):
    """Export GLB : Y vertical, transformations appliquees, animations des noeuds, aucune camera ni lumiere."""
    verifie_noms()
    chemin_glb.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(chemin_glb),
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_animations=True,
        export_cameras=False,
        export_lights=False,
        export_extras=False,
        use_selection=False,
    )
    return chemin_glb


def degres(x):
    return math.radians(x)


def origine(o, point):
    """Place l'origine de l'objet sur un point du monde (par exemple le haut d'un cable, pour l'etirer depuis la)."""
    bpy.context.scene.cursor.location = point
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    bpy.context.scene.cursor.location = (0, 0, 0)
