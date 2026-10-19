"""La grue a tour (catalogue : crane), v002 : troisieme etalon de l'atelier. Bible WORKSITE, section 7 (socle, mat,
pivot, fleche, contre-fleche, contrepoids, chariot, cable, crochet) ; cible MB_08 (moodboard/notes.md) : mat et fleche
en treillis, pointe en A avec ses tirants, contre-fleche a garde-corps et contrepoids en blocs de beton, cabine claire,
socle beton. Ecarte de MB_08 : le crochet rouge, les cables sous 0,06 m, le crepi du sol.

Hauteur : le mat est fait de troncons de 1,5 m (VEH_TOWER_CRANE_A_MAST_SECTION_NN) ; tout ce qui est en haut est sous
le pivot VEH_TOWER_CRANE_A_PIVOT_TOP. Le composant empile autant de troncons que le parametre height le demande et
monte le pivot du haut d'autant. Le GLB porte la hauteur par defaut, 14 m.

Qualite basse (bible 18.3 : ce qui mesure moins de 0,30 m disparait ou se fusionne) : les barres du treillis font
0,07 a 0,12 m. Le GLB porte donc aussi des caissons pleins (noeuds *_LOW) que le composant montre a la place du treillis.

Animation ANM_TOWER_CRANE_A_LIFTING : la fleche pivote d'un quart de tour pendant que la charge monte, puis revient ;
boucle de 8 secondes (240 images a 30 i/s), sur place.
"""

import os
import sys
from pathlib import Path

import bpy

ASSET = {"id": "crane", "categorie": "machine", "nom": "VEH_TOWER_CRANE_A_v002"}

P = "VEH_TOWER_CRANE_A_"
HAUTEUR = 14.0  # hauteur par defaut du haut du mat (parametre height de la fiche)
SOCLE = 0.40  # dessus du socle beton
TRONCON = 1.5  # hauteur d'un troncon de mat
LARGEUR_MAT = 1.0  # cote du mat, entre les axes des membrures
MEMBRURE = 0.12  # membrures du treillis (C1)
BARRE = 0.07  # diagonales et traverses : au-dessus du minimum filiforme de 0,06 m (bible 18.3)
LONG_FLECHE = 11.0
LONG_CONTRE = 4.2
HAUT_FLECHE = 0.9  # hauteur du treillis triangulaire de la fleche
POS_CHARIOT = 7.5
CABLE_BAS = 9.0  # longueur du cable, charge posee
CABLE_HAUT = 3.0  # longueur du cable, charge levee
C1 = 0.02


def _barre(c, nom, a, b, epaisseur, mat):
    """Une barre de treillis de section carree, de a a b (points du monde)."""
    from mathutils import Vector
    a, b = Vector(a), Vector(b)
    d = b - a
    o = c.boite(nom, (epaisseur, epaisseur, d.length), (0, 0, -d.length / 2), mat=mat)
    o.rotation_mode = "QUATERNION"
    o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
    o.location = (a + b) / 2
    c.applique(o)
    return o


def _troncon(c, nom, z0):
    """Un troncon de mat de 1,5 m : quatre membrures, une croix de Saint-Andre par face, une ceinture en bas."""
    h, l = TRONCON, LARGEUR_MAT / 2
    coins = [(-l, -l), (l, -l), (l, l), (-l, l)]
    pieces = []
    for i, (x, y) in enumerate(coins):
        m = c.boite("%s_CHORD_%d" % (nom, i), (MEMBRURE, MEMBRURE, h), (x, y, z0), mat="MAT_PAINTED_METAL_ORANGE", chanfrein=C1, segments=2)
        pieces.append(m)
    for i in range(4):
        (x0, y0), (x1, y1) = coins[i], coins[(i + 1) % 4]
        pieces.append(_barre(c, "%s_DIAG_%dA" % (nom, i), (x0, y0, z0), (x1, y1, z0 + h), BARRE, "MAT_PAINTED_METAL_ORANGE"))
        pieces.append(_barre(c, "%s_DIAG_%dB" % (nom, i), (x1, y1, z0), (x0, y0, z0 + h), BARRE, "MAT_PAINTED_METAL_ORANGE"))
        pieces.append(_barre(c, "%s_RING_%d" % (nom, i), (x0, y0, z0 + BARRE / 2), (x1, y1, z0 + BARRE / 2), BARRE, "MAT_PAINTED_METAL_ORANGE"))
    o = c.fusionne(nom, pieces)
    c.lisse(o)
    return o


def _treillis_horizontal(c, nom, x0, x1, z, largeur, hauteur, pas, mat):
    """Treillis triangulaire couche le long de X (fleche, contre-fleche) : deux membrures basses, une haute au milieu,
    des diagonales sur les deux pans et des traverses en bas, tous les pas metres."""
    w = largeur / 2
    pieces = [_barre(c, nom + "_BOTTOM_L", (x0, -w, z), (x1, -w, z), MEMBRURE, mat),
              _barre(c, nom + "_BOTTOM_R", (x0, w, z), (x1, w, z), MEMBRURE, mat),
              _barre(c, nom + "_TOP", (x0, 0, z + hauteur), (x1, 0, z + hauteur), MEMBRURE, mat)]
    n = max(1, round(abs(x1 - x0) / pas))
    sens = 1 if x1 > x0 else -1
    for k in range(n):
        xa = x0 + sens * k * abs(x1 - x0) / n
        xb = x0 + sens * (k + 1) * abs(x1 - x0) / n
        xm = (xa + xb) / 2
        for cote, y in (("L", -w), ("R", w)):
            pieces.append(_barre(c, "%s_D%d%sA" % (nom, k, cote), (xa, y, z), (xm, 0, z + hauteur), BARRE, mat))
            pieces.append(_barre(c, "%s_D%d%sB" % (nom, k, cote), (xm, 0, z + hauteur), (xb, y, z), BARRE, mat))
        pieces.append(_barre(c, "%s_R%d" % (nom, k), (xb, -w, z), (xb, w, z), BARRE, mat))
    o = c.fusionne(nom, pieces)
    c.lisse(o)
    return o


def construit(c):
    haut = HAUTEUR

    # --- le socle beton, en deux gradins, et ses quatre pieds boulonnes
    socle = c.boite(P + "BASE", (2.8, 2.8, 0.25), mat="MAT_CONCRETE", chanfrein=0.05, segments=2)
    gradin = c.boite(P + "BASE_TOP", (2.0, 2.0, 0.15), (0, 0, 0.25), mat="MAT_CONCRETE", chanfrein=0.05, segments=2)
    pieds = [c.boite(P + "FOOT_%d" % i, (0.24, 0.24, 0.10), (x, y, SOCLE - 0.02), mat="MAT_PAINTED_METAL_GRAPHITE", chanfrein=C1,
                     segments=2) for i, (x, y) in enumerate(((-0.5, -0.5), (0.5, -0.5), (0.5, 0.5), (-0.5, 0.5)))]
    base = c.fusionne(P + "BASE", [socle, gradin] + pieds)
    c.lisse(base)

    # --- le mat : des troncons identiques (instances), empiles jusqu'a la hauteur ; et son caisson plein (qualite basse)
    n = round((haut - SOCLE) / TRONCON)
    premier = _troncon(c, P + "MAST_SECTION_00", SOCLE)
    for k in range(1, n):
        c.instance(P + "MAST_SECTION_%02d" % k, premier, (0, 0, k * TRONCON))
    haut = SOCLE + n * TRONCON
    mat_bas = c.boite(P + "MAST_LOW", (LARGEUR_MAT + MEMBRURE, LARGEUR_MAT + MEMBRURE, 1.0), (0, 0, SOCLE), mat="MAT_PAINTED_METAL_ORANGE")
    c.origine(mat_bas, (0, 0, SOCLE))
    mat_bas.scale.z = haut - SOCLE  # 1 m de haut, origine en bas : le composant l'etire du socle au haut du mat

    # --- tout ce qui est en haut, sous le pivot du haut (monte par le composant) ; ce qui tourne, sous le pivot d'orientation
    dessus = c.pivot(P + "PIVOT_TOP", (0, 0, haut))
    orient = c.pivot(P + "PIVOT_SLEW", (0, 0, haut), parent=dessus)
    plateau = c.boite(P + "SLEW_RING", (1.4, 1.4, 0.35), (0, 0, haut), mat="MAT_PAINTED_METAL_GRAPHITE", chanfrein=0.04, segments=2)
    # la cabine claire, accrochee devant le mat, vitree sur trois cotes (MB_08)
    cabine = c.boite(P + "CAB", (1.2, 1.1, 1.15), (0.25, -1.15, haut - 0.85), mat="MAT_SURFACE", chanfrein=0.06, segments=3)
    vitre = c.boite(P + "CAB_GLASS", (1.0, 0.06, 0.55), (0.25, -1.72, haut - 0.35), mat="MAT_GLASS", chanfrein=C1, segments=2)
    vitre_cote = c.boite(P + "CAB_GLASS_SIDE", (0.06, 0.7, 0.55), (0.87, -1.15, haut - 0.35), mat="MAT_GLASS", chanfrein=C1, segments=2)
    haut_rot = c.fusionne(P + "SLEW", [plateau, cabine, vitre, vitre_cote])
    c.lisse(haut_rot)
    c.rattache(haut_rot, orient)

    z = haut + 0.35
    # la pointe en A, en treillis, et ses tirants vers le bout de la fleche et de la contre-fleche
    pointe_h = 3.2
    pieces = []
    for i, (x, y) in enumerate(((-0.45, -0.45), (0.45, -0.45), (0.45, 0.45), (-0.45, 0.45))):
        pieces.append(_barre(c, P + "PEAK_LEG_%d" % i, (x, y, z), (0, 0, z + pointe_h), MEMBRURE, "MAT_PAINTED_METAL_ORANGE"))
    for k, zz in enumerate((z + 1.0, z + 2.0)):
        r = 0.45 * (1 - (zz - z) / pointe_h)
        pts = [(-r, -r), (r, -r), (r, r), (-r, r)]
        for i in range(4):
            pieces.append(_barre(c, P + "PEAK_RING_%d_%d" % (k, i), (*pts[i], zz), (*pts[(i + 1) % 4], zz), BARRE, "MAT_PAINTED_METAL_ORANGE"))
    pieces.append(c.boite(P + "PEAK_CAP", (0.26, 0.26, 0.22), (0, 0, z + pointe_h - 0.1), mat="MAT_PAINTED_METAL_ORANGE", chanfrein=C1,
                          segments=2))
    pointe = c.fusionne(P + "PEAK", pieces)
    c.lisse(pointe)
    c.rattache(pointe, orient)
    pointe_bas = c.boite(P + "PEAK_LOW", (0.45, 0.45, pointe_h), (0, 0, z), mat="MAT_PAINTED_METAL_ORANGE")
    c.rattache(pointe_bas, orient)
    tirants = c.fusionne(P + "TIES", [
        _barre(c, P + "TIE_JIB", (0, 0, z + pointe_h - 0.05), (LONG_FLECHE * 0.62, 0, z + HAUT_FLECHE), 0.06, "MAT_STEEL"),
        _barre(c, P + "TIE_COUNTER", (0, 0, z + pointe_h - 0.05), (-LONG_CONTRE + 0.4, 0, z + 0.5), 0.06, "MAT_STEEL"),
    ])
    c.rattache(tirants, orient)

    # la fleche en treillis triangulaire, et son caisson plein (qualite basse)
    fleche = _treillis_horizontal(c, P + "JIB", 0.5, LONG_FLECHE, z, 0.9, HAUT_FLECHE, 1.1, "MAT_PAINTED_METAL_ORANGE")
    c.rattache(fleche, orient)
    fleche_bas = c.boite(P + "JIB_LOW", (LONG_FLECHE - 0.5, 0.9, HAUT_FLECHE), ((LONG_FLECHE + 0.5) / 2, 0, z), mat="MAT_PAINTED_METAL_ORANGE")
    c.rattache(fleche_bas, orient)

    # la contre-fleche : un caisson plat avec sa passerelle et son garde-corps, et les blocs de beton du contrepoids
    contre = c.boite(P + "COUNTERJIB", (LONG_CONTRE, 1.0, 0.35), (-LONG_CONTRE / 2, 0, z), mat="MAT_PAINTED_METAL_ORANGE", chanfrein=0.03,
                     segments=2)
    rails = []
    for cote, y in (("L", -0.48), ("R", 0.48)):
        rails.append(_barre(c, P + "RAIL_%s" % cote, (-LONG_CONTRE + 0.3, y, z + 1.45), (-0.4, y, z + 1.45), 0.06, "MAT_PAINTED_METAL_ORANGE"))
        for k in range(4):
            x = -0.5 - k * (LONG_CONTRE - 0.9) / 3
            rails.append(_barre(c, P + "POST_%s%d" % (cote, k), (x, y, z + 0.35), (x, y, z + 1.45), 0.06, "MAT_PAINTED_METAL_ORANGE"))
    contre = c.fusionne(P + "COUNTERJIB", [contre] + rails)
    c.lisse(contre)
    c.rattache(contre, orient)
    blocs = [c.boite(P + "COUNTERWEIGHT_%d" % i, (0.42, 1.2, 1.5), (-LONG_CONTRE + 0.35 + i * 0.46, 0, z - 1.25), mat="MAT_CONCRETE",
                     chanfrein=0.05, segments=2) for i in range(3)]
    poids = c.fusionne(P + "COUNTERWEIGHT", blocs)
    c.lisse(poids)
    c.rattache(poids, orient)
    contre_bas = c.boite(P + "COUNTERJIB_LOW", (LONG_CONTRE, 1.0, 0.35), (-LONG_CONTRE / 2, 0, z), mat="MAT_PAINTED_METAL_ORANGE")
    c.rattache(contre_bas, orient)

    # le chariot sous la fleche, le cable qui s'etire depuis lui, la moufle et la charge (une palette de briques)
    chariot = c.pivot(P + "PIVOT_TROLLEY", (POS_CHARIOT, 0, z), parent=orient)
    caisse = c.boite(P + "TROLLEY", (0.8, 1.0, 0.25), (POS_CHARIOT, 0, z - 0.25), mat="MAT_PAINTED_METAL_GRAPHITE", chanfrein=C1, segments=2)
    roues = [c.cylindre(P + "WHEEL_%d" % i, 0.11, 0.08, (POS_CHARIOT + dx, dy, z - 0.02), mat="MAT_PAINTED_METAL_GRAPHITE", cotes=10)
             for i, (dx, dy) in enumerate(((-0.25, -0.5), (0.25, -0.5), (-0.25, 0.42), (0.25, 0.42)))]
    caisse = c.fusionne(P + "TROLLEY", [caisse] + roues)
    c.rattache(caisse, chariot)
    bas = z - 0.25
    cable = c.cylindre(P + "CABLE", 0.035, 1.0, (POS_CHARIOT, 0, bas - 1.0), mat="MAT_STEEL", cotes=6)
    c.origine(cable, (POS_CHARIOT, 0, bas))
    c.rattache(cable, chariot)
    crochet = c.pivot(P + "PIVOT_HOOK", (POS_CHARIOT, 0, bas - CABLE_BAS), parent=chariot)
    zc = bas - CABLE_BAS
    moufle = c.boite(P + "HOOK_BLOCK", (0.42, 0.30, 0.42), (POS_CHARIOT, 0, zc - 0.42), mat="MAT_PAINTED_METAL_GRAPHITE", chanfrein=0.04,
                     segments=2)
    croc = c.cylindre(P + "HOOK", 0.08, 0.22, (POS_CHARIOT, 0, zc - 0.64), mat="MAT_STEEL", cotes=10)
    elingues = [_barre(c, P + "SLING_%d" % i, (POS_CHARIOT, 0, zc - 0.64), (POS_CHARIOT + dx, dy, zc - 1.45), 0.06, "MAT_STEEL")
                for i, (dx, dy) in enumerate(((-0.42, -0.42), (0.42, -0.42), (0.42, 0.42), (-0.42, 0.42)))]
    briques = c.boite(P + "LOAD", (1.0, 1.0, 0.62), (POS_CHARIOT, 0, zc - 2.07), mat="MAT_BRICK", chanfrein=0.04, segments=2)
    palette = c.boite(P + "LOAD_PALLET", (1.1, 1.1, 0.15), (POS_CHARIOT, 0, zc - 2.22), mat="MAT_WOOD", chanfrein=C1, segments=2)
    charge = c.fusionne(P + "HOOK_BLOCK", [moufle, croc] + elingues + [briques, palette])
    c.lisse(charge)
    c.rattache(charge, crochet)
    cable.scale = (1, 1, CABLE_BAS)

    # les ancres de la fiche : l'etiquette au-dessus de la pointe, le badge a cote de la cabine (elles suivent la hauteur)
    # (commun.pivot rattache avant que Blender ait calcule la position : on pose, on met a jour, puis on rattache)
    ancres = [c.ancre("ANCHOR_LABEL", (0, 0, z + pointe_h + 1.2)), c.ancre("ANCHOR_BADGE", (0.9, -1.6, haut + 0.6))]
    bpy.context.view_layer.update()
    for a in ancres:
        c.rattache(a, dessus)

    # une seule action pour les trois noeuds : un seul clip glTF, premiere cle a l'image 0
    clip = "ANM_TOWER_CRANE_A_LIFTING"
    c.anime(clip, orient, "rotation_euler", [(0, 0.0), (120, c.degres(90)), (240, 0.0)], index=2)
    z0 = crochet.location.z
    leve = z0 + (CABLE_BAS - CABLE_HAUT)
    c.anime(clip, crochet, "location", [(0, z0), (120, leve), (240, z0)], index=2)
    c.anime(clip, cable, "scale", [(0, CABLE_BAS), (120, CABLE_HAUT), (240, CABLE_BAS)], index=2)
    if "atelier" in sys.modules or any(Path(x).name == "atelier.py" for x in sys.argv):
        vue_atelier()
    return {"triangles_vises": 9000, "animations": [clip], "hauteur": haut}


def vue_atelier():
    """Atelier seulement : la qualite haute montre le treillis et cache les caissons pleins ; GDC_ATELIER_QUALITE=low
    montre l'inverse (avec le caisson du mat etire a sa hauteur, comme le fait le composant)."""
    basse = os.environ.get("GDC_ATELIER_QUALITE") == "low"
    for o in bpy.data.objects:
        treillis = o.name.startswith((P + "MAST_SECTION", P + "JIB", P + "COUNTERJIB", P + "PEAK", P + "TIES")) and not o.name.endswith("_LOW")
        if (o.name.endswith("_LOW") and not basse) or (treillis and basse):
            o.hide_render = o.hide_viewport = True
