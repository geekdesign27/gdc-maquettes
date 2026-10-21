"""Les portraits des agents (catalogue : agent-portraits, lot G7). Bible WORKSITE, section 5 (Agent Portrait : un portrait
coherent avec le personnage, jamais genere a part du corps).

Chaque portrait est rendu depuis le personnage du kit (blender/assets/character-kit.py, v002, 5 tetes) : meme corps,
meme visage, meme coiffure, meme tenue et meme casque que dans la scene, habille par la fonction habille() du kit, le
pendant Blender de src/personnage.js. Rien n'est redessine : un portrait ne peut pas s'ecarter du personnage.

Decisions de PA du 21 octobre 2026 : un rendu enveloppe dans un SVG (pas de trace vectoriel) ; cadrage commun en buste
de trois quarts face (tete et epaules, casque entier, haut de la tenue visible pour lire le metier), fond transparent,
aucune couleur d'equipe ajoutee. Decision de PA du 21 octobre 2026, apres la revue DA : un disque derriere le buste,
teinte par l'encre du theme (--gdc-ink a 12 %), pour que les tenues graphite se detachent aussi en theme sombre ; le
buste est decoupe dans ce disque. Le studio est celui de l'atelier (src/lumiere.json) : la meme lumiere que la galerie.

Le portrait ne montre pas l'outil (revue DA du 21 octobre 2026 : tenu a la main, il coupe le buste en travers).

Un fichier par personne de equipe.json : components/illustration/agent-portraits/<id>.svg (client.svg pour
Pierre-Alain, sans casque). Les etats idle, talking et working sont des classes CSS posees sur le <svg> insere dans la
page : talking et working animent doucement le buste ; idle et « moins d'animations » le laissent fixe.

Lance par : npm run blender -- agent-portraits (construit.py appelle rend(), pas d'export GLB).
"""
import base64
import importlib
import math
import tempfile
from pathlib import Path

import bpy
from mathutils import Vector

ASSET = {"id": "agent-portraits", "categorie": "illustration", "nom": "agent-portraits"}

TAILLE = 192  # pixels du rendu : deux fois les 96 px de la fiche d'agent, net sur un ecran a forte densite
VUE = 96  # viewBox du SVG
QUALITE = 90  # WebP avec transparence
# Le cadrage commun, en metres (personnage de 1,70 m, origine aux pieds) : du haut du casque au milieu de la poitrine.
CENTRE_Z = 1.48
CADRE = 0.84  # largeur et hauteur vues par la camera orthographique
TROIS_QUARTS = 25  # degres : la camera tourne vers la gauche du personnage, qui regarde vers la gauche de l'image
PLONGEE = 6  # degres au-dessus de l'horizontale
POSE = ("ANM_CHR_IDLE", 0)  # la pose de repos, image 0

# Les etats : classes posees sur le <svg>, portees par le groupe .gdc-portrait-buste (pivot au bas du cadre).
# Les gestes de talking et working bougent lentement tant que l'etat dure : deuxieme exception au principe 5 de la
# signaletique, decidee par PA le 21 octobre 2026 ; ils s'arretent avec « moins d'animations » (preference du systeme,
# data-motion="reduced" ou --gdc-play).
STYLE = """
.gdc-portrait .gdc-portrait-disque { fill: color-mix(in srgb, var(--gdc-ink, ENCRE) 12%, transparent); }
.gdc-portrait .gdc-portrait-buste { transform-box: view-box; transform-origin: 48px 96px; }
.gdc-portrait.talking .gdc-portrait-buste { animation: gdc-portrait-parle 1.4s ease-in-out infinite; animation-play-state: var(--gdc-play, running); }
.gdc-portrait.working .gdc-portrait-buste { animation: gdc-portrait-travaille 2.4s ease-in-out infinite; animation-play-state: var(--gdc-play, running); }
@keyframes gdc-portrait-parle { 0%, 100% { transform: translateY(0) rotate(0deg); } 30% { transform: translateY(-1.2px) rotate(-1.2deg); } 60% { transform: translateY(0.4px) rotate(0.8deg); } }
@keyframes gdc-portrait-travaille { 0%, 100% { transform: rotate(0deg); } 50% { transform: translateY(1.5px) rotate(2.5deg); } }
@media (prefers-reduced-motion: reduce) { .gdc-portrait .gdc-portrait-buste { animation: none; } }
[data-motion="reduced"] .gdc-portrait .gdc-portrait-buste { animation: none; }
""".strip()


def _kit():
    import construit
    importlib.reload(construit)
    return construit.charge_asset("character-kit")[1]


def _monte(c, kit, personne):
    """Le personnage habille, comme dans la scene : les memes fonctions que le kit et son atelier."""
    c.scene_vide()
    mats = kit._mats(c)
    rig = kit.squelette()
    kit.corps(rig, mats)
    kit.visage(rig, mats)
    lashes = kit.cils(rig, mats["sombre"])
    helmet = kit.casque(rig, mats["clair"])
    kit.anime(rig)
    # sans l'outil : tenu a la main, il traverse le cadre du buste (trepied, rouleau) ; le metier se lit a la tenue
    kit.habille(c, rig, {**personne, "outil": None}, helmet, lashes, mats)
    rig.animation_data.action = bpy.data.actions[POSE[0]]
    bpy.context.scene.frame_set(POSE[1])


def _studio():
    import atelier
    importlib.reload(atelier)
    studio = atelier.installe_studio()
    s = bpy.context.scene
    s.render.engine = atelier._moteur(("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"))
    if hasattr(s, "eevee"):
        s.eevee.taa_render_samples = 64
    s.render.film_transparent = True
    s.render.resolution_x = s.render.resolution_y = TAILLE
    s.render.resolution_percentage = 100
    s.render.image_settings.file_format = "WEBP"
    s.render.image_settings.color_mode = "RGBA"
    s.render.image_settings.quality = QUALITE
    a, e = math.radians(TROIS_QUARTS), math.radians(PLONGEE)
    direction = Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))
    cam = studio["camera"]
    cible = Vector((0, 0, CENTRE_Z))
    cam.location = cible + direction * 10
    cam.rotation_euler = (-direction).to_track_quat("-Z", "Y").to_euler()
    cam.data.ortho_scale = CADRE


def _svg(c, personne, image):
    donnees = base64.b64encode(image).decode("ascii")
    titre = personne["nom"].replace("&", "&amp;").replace("<", "&lt;")
    style = STYLE.replace("ENCRE", c.PALETTE["interface"]["light"]["ink"])
    r = VUE / 2
    # l'identifiant du decoupage porte celui de la personne : plusieurs portraits differents vivent dans la meme page
    decoupe = "gdc-portrait-disque-" + personne["id"]
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VUE} {VUE}" class="gdc-portrait idle" '
        f'data-agent="{personne["id"]}" role="img">\n'
        f"<title>{titre}</title>\n"
        f"<style>\n{style}\n</style>\n"
        f'<defs><clipPath id="{decoupe}"><circle cx="{r:g}" cy="{r:g}" r="{r:g}"/></clipPath></defs>\n'
        f'<circle class="gdc-portrait-disque" cx="{r:g}" cy="{r:g}" r="{r:g}"/>\n'
        f'<g clip-path="url(#{decoupe})"><g class="gdc-portrait-buste">'
        f'<image width="{VUE}" height="{VUE}" href="data:image/webp;base64,{donnees}"/></g></g>\n'
        "</svg>\n"
    )


def rend(c, dossier):
    """Rend un portrait par personne de equipe.json ; renvoie {nom de fichier: chemin}."""
    kit = _kit()
    dossier.mkdir(parents=True, exist_ok=True)
    fichiers = {}
    with tempfile.TemporaryDirectory() as tmp:
        for personne in kit.equipe():
            _monte(c, kit, personne)
            _studio()
            rendu = Path(tmp) / (personne["id"] + ".webp")
            bpy.context.scene.render.filepath = str(rendu)
            bpy.ops.render.render(write_still=True)
            chemin = dossier / (personne["id"] + ".svg")
            chemin.write_text(_svg(c, personne, rendu.read_bytes()), encoding="utf-8")
            fichiers[chemin.name] = chemin
    return fichiers


# Ce que le portrait reprend : si l'un de ces fichiers change, le portrait doit etre rendu a nouveau (asset.json).
SOURCES = ["blender/assets/character-kit.py", "components/kit/character-kit/equipe.json", "blender/atelier.py",
           "src/lumiere.json"]
