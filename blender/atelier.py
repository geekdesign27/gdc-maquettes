"""L'atelier : construit un asset dans Blender SANS l'exporter, le pose dans le studio (meme camera et meme
lumiere que la galerie, lues dans src/lumiere.json) et rend les captures standard. C'est la boucle rapide :
on modifie le script blender/assets/<id>.py, on relance, on regarde. Le GLB officiel sort toujours de
npm run blender -- <id> ; l'atelier n'exporte jamais rien.

Dans Blender ouvert, par le connecteur (MCP), dans un fichier vide reserve a l'atelier :
    import sys, importlib
    sys.path.insert(0, "<depot>/blender")
    import atelier; importlib.reload(atelier)
    result = atelier.essaie("crane")
Sans fenetre :   npm run atelier -- crane

Captures dans blender/.captures/<id>/ (non versionne) :
    iso.png         la vue de la galerie (45 degres, 35 degres d'elevation), rendu couleur
    valeurs.png     la meme en niveaux de gris : les matieres se distinguent-elles sans la couleur ?
    face.png        de face (l'avant est -Y), pour les proportions
    silhouette.png  en noir, a la taille reelle d'affichage (PX_PAR_METRE) : se reconnait-il ?
"""
import importlib
import math
import sys
from pathlib import Path

ICI = Path(__file__).resolve().parent
if str(ICI) not in sys.path:
    sys.path.insert(0, str(ICI))

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

from gdc_blender import commun as c  # noqa: E402

STUDIO = "STUDIO"  # collection du studio : hors convention de nom, jamais mesuree ni exportee
CAPTURES = ICI / ".captures"
# Taille d'affichage dans la galerie a son cadrage par defaut (environ 24 pixels par metre) ;
# a recaler quand la fiche DA 1.2 fixera les niveaux de zoom du panneau.
PX_PAR_METRE = 24


def _vers_blender(v):
    """Coordonnees Three.js (Y vertical) vers Blender (Z vertical, avant vers -Y)."""
    return Vector((v[0], -v[2], v[1]))


def _couleur(hexa, alpha=True):
    rgb = [c.srgb_vers_lineaire(int(hexa.lstrip("#")[i:i + 2], 16) / 255) for i in (0, 2, 4)]
    return (*rgb, 1.0) if alpha else tuple(rgb)


def vide_scene():
    """Vide la scene ouverte sans recharger les reglages d'usine (ce qui couperait le connecteur MCP)."""
    for coll in (bpy.data.objects, bpy.data.meshes, bpy.data.materials, bpy.data.actions,
                 bpy.data.cameras, bpy.data.lights, bpy.data.curves, bpy.data.armatures, bpy.data.collections):
        for x in list(coll):
            coll.remove(x)
    s = bpy.context.scene
    s.unit_settings.system = "METRIC"
    s.unit_settings.scale_length = 1.0
    s.render.fps = 30
    s.frame_set(1)
    return s


def objets_asset():
    studio = bpy.data.collections.get(STUDIO)
    exclus = set(studio.objects) if studio else set()
    return [o for o in bpy.data.objects if o not in exclus]


def mesure():
    """Ce que le controle regardera : triangles (modificateurs compris), materiaux, noms, ancres, animations, emprise."""
    dg = bpy.context.evaluated_depsgraph_get()
    triangles, materiaux, hors_convention, ancres = 0, set(), [], []
    bas, haut = Vector((math.inf,) * 3), Vector((-math.inf,) * 3)
    for o in objets_asset():
        if not c.NOM_VALIDE.match(o.name):
            hors_convention.append(o.name)
        if o.name.startswith("ANCHOR_"):
            ancres.append(o.name)
        if o.type != "MESH":
            continue
        e = o.evaluated_get(dg)
        m = e.to_mesh()
        m.calc_loop_triangles()
        triangles += len(m.loop_triangles)
        for v in m.vertices:
            p = e.matrix_world @ v.co
            bas = Vector(map(min, bas, p))
            haut = Vector(map(max, haut, p))
        e.to_mesh_clear()
        materiaux.update(s.material.name for s in o.material_slots if s.material)
    vide = bas.x == math.inf
    return {
        "triangles": triangles,
        "materiaux": sorted(materiaux),
        "hors_convention": hors_convention,
        "ancres": sorted(ancres),
        "animations": sorted(a.name for a in bpy.data.actions),
        "emprise_m": None if vide else [round(x, 2) for x in (haut - bas)],
        "_bas": None if vide else bas,
        "_haut": None if vide else haut,
    }


def _monde(lum, fond):
    """Ciel en degrade comme la HemisphereLight de Three.js ; fond uni pour la camera."""
    w = bpy.data.worlds.get("STUDIO_MONDE") or bpy.data.worlds.new("STUDIO_MONDE")
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    coord = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    plage = nt.nodes.new("ShaderNodeMapRange")
    plage.inputs["From Min"].default_value = -1.0
    melange = nt.nodes.new("ShaderNodeMix")
    melange.data_type = "RGBA"
    # le noeud Mix a des entrees A et B par type de donnee : prendre celles de couleur
    entree_a, entree_b = [i for i in melange.inputs if i.type == "RGBA"]
    sortie_couleur = next(o for o in melange.outputs if o.type == "RGBA")
    entree_a.default_value = _couleur(lum["ciel"]["sol"])
    entree_b.default_value = _couleur(lum["ciel"]["couleur"])
    ciel = nt.nodes.new("ShaderNodeBackground")
    # Three.js : une face eclairee par un ciel d'intensite I recoit I ; Blender : un ciel uniforme de force F donne pi*F
    ciel.inputs["Strength"].default_value = lum["ciel"]["intensite"] / math.pi
    fond_n = nt.nodes.new("ShaderNodeBackground")
    fond_n.inputs["Color"].default_value = _couleur(fond)
    chemin = nt.nodes.new("ShaderNodeLightPath")
    choix = nt.nodes.new("ShaderNodeMixShader")
    sortie = nt.nodes.new("ShaderNodeOutputWorld")
    nt.links.new(coord.outputs["Generated"], sep.inputs[0])
    nt.links.new(sep.outputs["Z"], plage.inputs["Value"])
    nt.links.new(plage.outputs["Result"], melange.inputs["Factor"])
    nt.links.new(sortie_couleur, ciel.inputs["Color"])
    nt.links.new(chemin.outputs["Is Camera Ray"], choix.inputs["Fac"])
    nt.links.new(ciel.outputs[0], choix.inputs[1])
    nt.links.new(fond_n.outputs[0], choix.inputs[2])
    nt.links.new(choix.outputs[0], sortie.inputs["Surface"])
    w.color = (1, 1, 1)  # fond du rendu Workbench (silhouette)
    return w


def installe_studio():
    """Camera orthographique et soleil de src/lumiere.json, sol mat pour l'ombre de contact."""
    import json
    lum = json.loads((c.RACINE / "src" / "lumiere.json").read_text(encoding="utf-8"))
    fond = c.PALETTE["interface"]["light"]["background"]
    s = bpy.context.scene
    studio = bpy.data.collections.new(STUDIO)
    s.collection.children.link(studio)

    cam = bpy.data.objects.new("STUDIO_CAMERA", bpy.data.cameras.new("STUDIO_CAMERA"))
    cam.data.type = "ORTHO"
    cam.data.clip_end = 500
    studio.objects.link(cam)
    s.camera = cam

    soleil = bpy.data.objects.new("STUDIO_SOLEIL", bpy.data.lights.new("STUDIO_SOLEIL", "SUN"))
    soleil.data.energy = lum["soleil"]["intensite"]
    soleil.data.color = _couleur(lum["soleil"]["couleur"], alpha=False)
    soleil.data.angle = math.radians(3)
    direction = -_vers_blender(lum["soleil"]["position"]).normalized()
    soleil.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    studio.objects.link(soleil)

    bpy.ops.mesh.primitive_plane_add(size=200)
    sol = bpy.context.active_object
    sol.name = "STUDIO_SOL"
    for coll in list(sol.users_collection):
        coll.objects.unlink(sol)
    studio.objects.link(sol)
    m = bpy.data.materials.new("STUDIO_SOL")
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = _couleur(fond)
    bsdf.inputs["Roughness"].default_value = 1.0
    sol.data.materials.append(m)

    s.world = _monde(lum, fond)
    s.view_settings.view_transform = "Standard"  # comme Three.js sans tone mapping
    s.view_settings.look = "None"
    return {"camera": cam, "sol": sol, "direction_iso": _vers_blender(lum["camera"]["position"]).normalized()}


def _moteur(prefere):
    disponibles = {e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items}
    for nom in prefere:
        if nom in disponibles:
            return nom
    return "BLENDER_WORKBENCH"


def _cadre(cam, bas, haut, direction, marge=1.15):
    """Place la camera orthographique pour que l'emprise tienne dans l'image, vue depuis direction."""
    centre = (bas + haut) / 2
    rayon = max((haut - bas).length / 2, 0.5)
    cam.location = centre + direction * (rayon * 4 + 10)
    cam.rotation_euler = (-direction).to_track_quat("-Z", "Y").to_euler()
    cam.data.ortho_scale = rayon * 2 * marge
    return rayon


def _rend(chemin, taille):
    s = bpy.context.scene
    s.render.resolution_x = s.render.resolution_y = taille
    s.render.resolution_percentage = 100
    s.render.image_settings.file_format = "PNG"
    s.render.filepath = str(chemin)
    bpy.ops.render.render(write_still=True)
    return str(chemin)


def _niveaux_de_gris(source, cible):
    """Luminance Rec. 709 de la capture couleur."""
    import numpy as np
    img = bpy.data.images.load(str(source))
    px = np.empty(len(img.pixels), dtype=np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(-1, 4)
    y = px[:, 0] * 0.2126 + px[:, 1] * 0.7152 + px[:, 2] * 0.0722
    px[:, 0] = px[:, 1] = px[:, 2] = y
    img.pixels.foreach_set(px.ravel())
    img.filepath_raw = str(cible)
    img.file_format = "PNG"
    img.save()
    bpy.data.images.remove(img)
    return str(cible)


def essaie(ident, image=1, captures=True, force=False):
    """Construit l'asset dans la scene ouverte, mesure, et rend les captures. Renvoie un dict (pour le MCP)."""
    if bpy.data.filepath and not force:
        raise RuntimeError("le fichier ouvert (" + bpy.data.filepath + ") serait efface : ouvre un fichier vide "
                           "reserve a l'atelier (Fichier > Nouveau), ou passe force=True")
    import construit
    importlib.reload(c)  # Blender reste ouvert : relire les outils communs modifies entre deux essais
    importlib.reload(construit)
    _, mod = construit.charge_asset(ident)
    vide_scene()
    infos = mod.construit(c) or {}
    bpy.context.scene.frame_set(image)
    m = mesure()
    resultat = {"id": ident, "nom": mod.ASSET["nom"], "blender": bpy.app.version_string, "infos": infos,
                **{k: v for k, v in m.items() if not k.startswith("_")}}
    if not captures or m["_bas"] is None:
        return resultat

    studio = installe_studio()
    s = bpy.context.scene
    dossier = CAPTURES / ident
    dossier.mkdir(parents=True, exist_ok=True)
    cam, bas, haut = studio["camera"], m["_bas"], m["_haut"]
    fichiers = {}

    s.render.engine = _moteur(("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"))
    if hasattr(s, "eevee"):
        s.eevee.taa_render_samples = 32
    _cadre(cam, bas, haut, studio["direction_iso"])
    fichiers["iso"] = _rend(dossier / "iso.png", 1024)
    fichiers["valeurs"] = _niveaux_de_gris(dossier / "iso.png", dossier / "valeurs.png")
    _cadre(cam, bas, haut, Vector((0, -1, 0)))
    fichiers["face"] = _rend(dossier / "face.png", 768)

    # silhouette : Workbench, aplat noir sur blanc, a la taille d'affichage reelle
    s.render.engine = "BLENDER_WORKBENCH"
    sh = s.display.shading
    sh.light, sh.color_type, sh.single_color = "FLAT", "SINGLE", (0, 0, 0)
    studio["sol"].hide_render = True
    rayon = _cadre(cam, bas, haut, studio["direction_iso"], marge=1.0)
    fichiers["silhouette"] = _rend(dossier / "silhouette.png", max(32, round(rayon * 2 * PX_PAR_METRE)))
    studio["sol"].hide_render = False
    s.render.engine = _moteur(("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"))

    resultat["captures"] = fichiers
    return resultat


if __name__ == "__main__":
    import json
    argv = sys.argv
    ids = argv[argv.index("--") + 1:] if "--" in argv else argv[1:]
    if not ids:
        raise SystemExit("asset attendu : atelier.py -- <id du catalogue>")
    for ident in ids:
        r = essaie(ident, force=True)
        print(json.dumps(r, indent=2, ensure_ascii=False, default=str))
