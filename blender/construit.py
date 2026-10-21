"""Construit un asset de l'atelier des maquettes et l'exporte en GLB, a cote de son composant.

Avec Blender :            blender -b -P blender/construit.py -- crane
Avec le module bpy :      python blender/construit.py crane
Ou, plus simple :         npm run blender -- crane
"""
import hashlib
import importlib.util
import json
import sys
from pathlib import Path

ICI = Path(__file__).resolve().parent
sys.path.insert(0, str(ICI))
from gdc_blender import commun as c  # noqa: E402

import bpy  # noqa: E402


def charge_asset(ident):
    """Le module du script blender/assets/<ident>.py, relu a chaque appel (l'atelier s'en sert aussi)."""
    script = ICI / "assets" / (ident + ".py")
    if not script.exists():
        raise SystemExit("aucun script pour " + ident + " : blender/assets/" + ident + ".py")
    spec = importlib.util.spec_from_file_location("asset_" + ident.replace("-", "_"), script)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return script, mod


def rend_illustration(ident, script, mod):
    """Une illustration (lot G7) : rend(c, dossier) ecrit ses fichiers (SVG) a cote de la fiche, sans GLB. asset.json garde
    les empreintes du script, des outils communs, de la palette, des SOURCES du script (ce qu'il reprend d'ailleurs, le
    kit du personnage par exemple) et de chaque fichier rendu : le controle refuse un fichier retouche a la main."""
    a = mod.ASSET
    dossier = c.RACINE / "components" / a["categorie"] / a["id"]
    rendus = mod.rend(c, dossier)
    sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()  # noqa: E731
    meta = {
        "id": a["id"],
        "bible": "WORKSITE 1.2",
        "blender": bpy.app.version_string,
        "script": "blender/assets/" + ident + ".py",
        "script_sha256": sha(script),
        "commun_sha256": sha(ICI / "gdc_blender" / "commun.py"),
        "palette_sha256": sha(c.RACINE / "src" / "palette.json"),
        "sources": {s: sha(c.RACINE / s) for s in getattr(mod, "SOURCES", [])},
        "fichiers": {nom: sha(p) for nom, p in sorted(rendus.items())},
        "statut": "a valider",
    }
    (dossier / "asset.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("rendu : %d fichier(s) dans %s" % (len(rendus), dossier.relative_to(c.RACINE)))


def main(ids):
    if not ids:
        raise SystemExit("asset attendu : construit.py -- <id du catalogue>")
    for ident in ids:
        script, mod = charge_asset(ident)
        a = mod.ASSET
        if hasattr(mod, "rend"):
            rend_illustration(ident, script, mod)
            continue
        c.scene_vide()
        infos = mod.construit(c) or {}
        dossier = c.RACINE / "components" / a["categorie"] / a["id"]
        glb = c.exporte(dossier / (a["nom"] + ".glb"))
        meta = {
            "nom": a["nom"],
            "id": a["id"],
            "bible": "WORKSITE 1.2",
            "blender": bpy.app.version_string,
            "script": "blender/assets/" + ident + ".py",
            "script_sha256": hashlib.sha256(script.read_bytes()).hexdigest(),
            "commun_sha256": hashlib.sha256((ICI / "gdc_blender" / "commun.py").read_bytes()).hexdigest(),
            "palette_sha256": hashlib.sha256((c.RACINE / "src" / "palette.json").read_bytes()).hexdigest(),
            "glb_sha256": hashlib.sha256(glb.read_bytes()).hexdigest(),
            "animations": infos.get("animations", []),
            "statut": "a valider",
        }
        # un kit a plusieurs fichiers : VARIANTES = {nom: fonction}, chacune construite dans une scene vide et exportee a
        # cote du fichier principal ; leurs empreintes vont dans asset.json, sous « fichiers »
        fichiers = {}
        for nom, fabrique in getattr(mod, "VARIANTES", {}).items():
            c.scene_vide()
            fabrique(c)
            variante = c.exporte(dossier / (nom + ".glb"))
            fichiers[nom] = hashlib.sha256(variante.read_bytes()).hexdigest()
            print("exporte : " + str(variante.relative_to(c.RACINE)))
        if fichiers:
            meta["fichiers"] = fichiers
        if hasattr(mod, "demonstration"):  # un kit : le plan de sa demonstration, que la galerie assemble depuis le GLB
            (dossier / "demonstration.json").write_text(json.dumps(mod.demonstration(), indent=1) + "\n", encoding="utf-8")
        (dossier / "asset.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print("exporte : " + str(glb.relative_to(c.RACINE)))


if __name__ == "__main__":
    argv = sys.argv
    main(argv[argv.index("--") + 1:] if "--" in argv else argv[1:])
