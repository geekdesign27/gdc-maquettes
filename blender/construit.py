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


def main(ids):
    if not ids:
        raise SystemExit("asset attendu : construit.py -- <id du catalogue>")
    for ident in ids:
        script, mod = charge_asset(ident)
        a = mod.ASSET
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
        (dossier / "asset.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print("exporte : " + str(glb.relative_to(c.RACINE)))


if __name__ == "__main__":
    argv = sys.argv
    main(argv[argv.index("--") + 1:] if "--" in argv else argv[1:])
