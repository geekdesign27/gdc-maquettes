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
Calage du studio sur la galerie (bible, 18.1) :   npm run atelier -- etalon

Captures dans blender/.captures/<id>/ (non versionne) :
    iso.png         la vue de la galerie (45 degres, 35 degres d'elevation), rendu couleur
    valeurs.png     la meme en niveaux de gris : les matieres se distinguent-elles sans la couleur ?
    face.png        de face (l'avant est -Y), pour les proportions
    silhouette.png  en noir, a la taille reelle d'affichage (PX_PAR_METRE) : se reconnait-il ?
    etalon/iso.png  le cube etalon et son socle, avec la mesure de ses trois faces (etalon())
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
PIECES = "PIECES"  # collection cachee des pieces d'un kit, quand l'atelier en monte la demonstration
CAPTURES = ICI / ".captures"
# Taille d'affichage en vue generale sur l'affichage de reference, un portable de 13 pouces (1280 x 800 points) :
# 25 pixels CSS par metre, mesure dans la galerie a son cadrage par defaut (bible, 18.3 et 18.7). Un ecran plus grand
# ne fait que mieux (31,6 sur un 13,6 pouces, 32,4 sur un 14 pouces).
PX_PAR_METRE = 25


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
    exclus = set()
    for nom in (STUDIO, PIECES):
        coll = bpy.data.collections.get(nom)
        if coll:
            exclus.update(coll.objects)
    return [o for o in bpy.data.objects if o not in exclus]


def monte_demonstration(plan):
    """Un kit (catalogue : kind kit) : ses pieces, posees a l'origine, sont rangees dans une collection cachee,
    et la demonstration du script est montee par instances, sur ses socles. Les captures et la mesure portent
    alors sur la demonstration, comme la galerie (src/kit.js) l'assemble depuis le GLB."""
    sources = {o.name: o for o in objets_asset()}
    rangement = bpy.data.collections.new(PIECES)
    bpy.context.scene.collection.children.link(rangement)
    for o in sources.values():
        for coll in list(o.users_collection):
            coll.objects.unlink(o)
        rangement.objects.link(o)
    rangement.hide_render = True
    rangement.hide_viewport = True
    racine = plan["prefixe"] + "DEMO"
    for i, p in enumerate(plan["pieces"]):
        nom = "%s_%03d_%s" % (racine, i, p["piece"][len(plan["prefixe"]):])
        c.instance(nom, sources[p["piece"]], tuple(p["position"]), p["rotation"])
    for k, s in enumerate(plan["socles"]):
        l, p, h = s["taille"]
        socle = c.boite("%s_PLINTH_%d" % (racine, k), (l, p, h), (s["centre"][0], s["centre"][1], -h), mat=s["materiau"],
                        chanfrein=s["chanfrein"], segments=3)
        c.lisse(socle)


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
    """Ciel en degrade qui eclaire comme la HemisphereLight de Three.js ; fond uni pour la camera.

    Three.js donne a une face de normale n l'eclairement I * melange(sol, ciel, 0,5 + 0,5 n.z). Un ciel dont la
    luminance varie lineairement avec la hauteur z de la direction donne, une fois integre sur l'hemisphere,
    pi * (a + 2/3 b n.z) : pour retrouver Three.js, le melange va de -0,25 (sous l'horizon) a 1,25 (au zenith)
    au lieu de 0 a 1. Sans cela, le dessus des objets recoit 17 % de ciel en moins que dans la galerie."""
    w = bpy.data.worlds.get("STUDIO_MONDE") or bpy.data.worlds.new("STUDIO_MONDE")
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    coord = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    plage = nt.nodes.new("ShaderNodeMapRange")
    plage.inputs["From Min"].default_value = -1.0
    plage.inputs["To Min"].default_value = -0.25
    plage.inputs["To Max"].default_value = 1.25
    melange = nt.nodes.new("ShaderNodeMix")
    melange.data_type = "RGBA"
    melange.clamp_factor = False
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
    """Camera orthographique et soleil de src/lumiere.json. Pas de sol, comme dans la galerie : l'ombre de contact
    tombe sur le socle ou le terrain du modele ; un sol de studio cacherait le bord d'un socle pose a z = 0."""
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

    s.world = _monde(lum, fond)
    s.view_settings.view_transform = "Standard"  # comme Three.js sans tone mapping
    s.view_settings.look = "None"
    return {"camera": cam, "direction_iso": _vers_blender(lum["camera"]["position"]).normalized()}


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


def _lit_image(chemin):
    """Pixels sRGB (0 a 255) d'un PNG rendu, lus tels quels, ligne du bas en premier."""
    import numpy as np
    img = bpy.data.images.load(str(chemin))
    img.colorspace_settings.name = "Non-Color"
    largeur, hauteur = img.size
    px = np.empty(largeur * hauteur * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    return px.reshape(hauteur, largeur, 4)[:, :, :3] * 255


def valeur(rgb):
    """Valeur affichee d'un pixel sRGB : la meme formule que la galerie (src/etalon.js)."""
    lin = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in (v / 255 for v in rgb)]
    y = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
    return round((y * 12.92 if y <= 0.0031308 else 1.055 * y ** (1 / 2.4) - 0.055) * 255)


def etalon(force=False):
    """Le cube etalon de la galerie (3 m, MAT_CONCRETE, sur un socle MAT_EARTH de 7 m sur 0,60 m), rendu dans le
    studio a la camera iso, et la mesure de ses trois faces comparee aux cibles de src/lumiere.json (bible, 18.1).
    C'est le calage : si l'atelier est conforme, son apercu ressemble a la galerie."""
    import json
    from bpy_extras.object_utils import world_to_camera_view
    if bpy.data.filepath and not force:
        raise RuntimeError("le fichier ouvert serait efface : ouvre un fichier vide, ou passe force=True")
    importlib.reload(c)
    vide_scene()
    c.boite("ENV_ETALON_CUBE", (3, 3, 3), mat="MAT_CONCRETE")
    c.boite("ENV_ETALON_SOCLE", (7, 7, 0.6), (0, 0, -0.6), mat="MAT_EARTH")
    studio = installe_studio()
    s = bpy.context.scene
    s.render.engine = _moteur(("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"))
    if hasattr(s, "eevee"):
        s.eevee.taa_render_samples = 32
    cam = studio["camera"]
    _cadre(cam, Vector((-3.5, -3.5, -0.6)), Vector((3.5, 3.5, 3)), studio["direction_iso"])
    dossier = CAPTURES / "etalon"
    dossier.mkdir(parents=True, exist_ok=True)
    chemin = _rend(dossier / "iso.png", 512)
    bpy.context.view_layer.update()
    px = _lit_image(chemin)
    hauteur, largeur = px.shape[:2]
    lum = json.loads((c.RACINE / "src" / "lumiere.json").read_text(encoding="utf-8"))["cibles"]
    # centres des faces visibles : dessus, gauche (l'avant, -Y) et droite (+X) ; les memes que FACES dans src/etalon.js
    faces = {"dessus": (0, 0, 3), "gauche": (0, -1.5, 1.5), "droite": (1.5, 0, 1.5)}
    mesures = {}
    for nom, p in faces.items():
        v = world_to_camera_view(s, cam, Vector(p))
        x, y = round(v.x * largeur), round(v.y * hauteur)
        rgb = [int(round(k)) for k in px[y - 2:y + 3, x - 2:x + 3].reshape(-1, 3).mean(0)]
        mesures[nom] = {"hex": "#%02X%02X%02X" % tuple(rgb), "valeur": valeur(rgb)}
    hexa = c.PALETTE["monde"][c.PALETTE["materiaux"]["MAT_CONCRETE"]["couleur"]].lstrip("#")
    reference = {"dessus": valeur([int(hexa[i:i + 2], 16) for i in (0, 2, 4)]), "gauche": mesures["dessus"]["valeur"],
                 "droite": mesures["dessus"]["valeur"]}
    ecarts = []
    for nom, m in mesures.items():
        m["rapport"] = round(m["valeur"] / max(reference[nom], 1), 3)
        m["cible"] = lum["faces"][nom]
        if abs(m["rapport"] - m["cible"]) > lum["tolerance"]:
            ecarts.append(nom)
    return {"id": "etalon", "blender": bpy.app.version_string, "moteur": s.render.engine, "faces": mesures,
            "verdict": "hors tolerance : " + ", ".join(ecarts) if ecarts else "conforme a la recette",
            "captures": {"iso": chemin}}


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
    kit = None
    if hasattr(mod, "demonstration"):  # un kit : mesurer ses pieces, puis monter la demonstration pour les captures
        kit = {k: v for k, v in mesure().items() if not k.startswith("_")}
        monte_demonstration(mod.demonstration())
    bpy.context.scene.frame_set(image)
    m = mesure()
    resultat = {"id": ident, "nom": mod.ASSET["nom"], "blender": bpy.app.version_string, "infos": infos,
                **({"kit": kit, "demonstration": "mesures ci-dessous"} if kit else {}),
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
    rayon = _cadre(cam, bas, haut, studio["direction_iso"], marge=1.0)
    fichiers["silhouette"] = _rend(dossier / "silhouette.png", max(32, round(rayon * 2 * PX_PAR_METRE)))
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
        r = etalon(force=True) if ident == "etalon" else essaie(ident, force=True)
        print(json.dumps(r, indent=2, ensure_ascii=False, default=str))
