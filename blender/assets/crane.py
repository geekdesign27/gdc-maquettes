"""La grue a tour (catalogue : crane). Bible WORKSITE, section 7 : socle, mat, pivot, fleche,
contre-fleche, contrepoids, chariot, cable, crochet. Animation ANM_TOWER_CRANE_A_LIFTING :
la fleche pivote d'un quart de tour pendant que la charge monte, puis revient ; boucle de 8 secondes."""

ASSET = {"id": "crane", "categorie": "machine", "nom": "VEH_TOWER_CRANE_A_v001"}

HAUT_MAT = 9.0
LONG_FLECHE = 8.0
POS_CHARIOT = 6.0
CABLE_BAS = 6.5   # longueur du cable charge posee
CABLE_HAUT = 2.0  # longueur du cable charge levee


def construit(c):
    P = "VEH_TOWER_CRANE_A_"
    socle = c.boite(P + "BASE", (2.4, 2.4, 0.4), mat="MAT_CONCRETE", chanfrein=0.05)
    mat = c.boite(P + "MAST", (0.8, 0.8, HAUT_MAT), (0, 0, 0.4), mat="MAT_PAINTED_METAL_ORANGE", chanfrein=0.03)
    haut = 0.4 + HAUT_MAT
    # tout ce qui tourne est sous le pivot d'orientation
    orient = c.pivot(P + "PIVOT_SLEW", (0, 0, haut))
    c.boite(P + "CAB", (1.1, 1.0, 0.9), (0.2, -0.95, haut - 0.9), mat="MAT_PAINTED_METAL_GRAPHITE", parent=orient, chanfrein=0.04)
    c.boite(P + "PEAK", (0.45, 0.45, 1.8), (0, 0, haut), mat="MAT_PAINTED_METAL_ORANGE", parent=orient)
    c.boite(P + "JIB", (LONG_FLECHE, 0.55, 0.5), (LONG_FLECHE / 2, 0, haut), mat="MAT_PAINTED_METAL_ORANGE", parent=orient, chanfrein=0.03)
    c.boite(P + "COUNTERJIB", (3.0, 0.55, 0.4), (-1.5, 0, haut), mat="MAT_PAINTED_METAL_ORANGE", parent=orient)
    c.boite(P + "COUNTERWEIGHT", (1.0, 0.9, 0.9), (-2.6, 0, haut - 0.7), mat="MAT_PAINTED_METAL_GRAPHITE", parent=orient, chanfrein=0.04)
    chariot = c.pivot(P + "PIVOT_TROLLEY", (POS_CHARIOT, 0, haut), parent=orient)
    c.boite(P + "TROLLEY", (0.7, 0.7, 0.25), (POS_CHARIOT, 0, haut - 0.25), mat="MAT_PAINTED_METAL_GRAPHITE", parent=chariot)
    # le cable s'etire depuis son point haut : son origine est sous le chariot, sa longueur suit l'echelle verticale
    cable = c.cylindre(P + "CABLE", 0.035, 1.0, (POS_CHARIOT, 0, haut - 0.25 - 1.0), mat="MAT_STEEL", cotes=6)
    c.origine(cable, (POS_CHARIOT, 0, haut - 0.25))
    c.rattache(cable, chariot)
    crochet = c.pivot(P + "PIVOT_HOOK", (POS_CHARIOT, 0, haut - 0.25 - CABLE_BAS), parent=chariot)
    c.boite(P + "HOOK", (0.35, 0.35, 0.3), (POS_CHARIOT, 0, haut - 0.25 - CABLE_BAS - 0.3), mat="MAT_PAINTED_METAL_ORANGE", parent=crochet)
    c.boite(P + "LOAD", (1.0, 1.0, 0.6), (POS_CHARIOT, 0, haut - 0.25 - CABLE_BAS - 0.9), mat="MAT_BRICK", parent=crochet, chanfrein=0.03)
    cable.scale = (1, 1, CABLE_BAS)

    c.ancre("ANCHOR_LABEL", (0, 0, haut + 2.2))
    c.ancre("ANCHOR_BADGE", (0.6, -1.0, haut + 0.4))

    # une seule action pour les trois noeuds : un seul clip glTF
    clip = "ANM_TOWER_CRANE_A_LIFTING"
    c.anime(clip, orient, "rotation_euler", [(1, 0.0), (120, c.degres(90)), (240, 0.0)], index=2)
    z0 = crochet.location.z
    leve = z0 + (CABLE_BAS - CABLE_HAUT)
    c.anime(clip, crochet, "location", [(1, z0), (120, leve), (240, z0)], index=2)
    c.anime(clip, cable, "scale", [(1, CABLE_BAS), (120, CABLE_HAUT), (240, CABLE_BAS)], index=2)
    for o in (orient, crochet, cable):
        for fc in o.animation_data.action.fcurves if hasattr(o.animation_data.action, "fcurves") else []:
            for k in fc.keyframe_points:
                k.interpolation = "BEZIER"
    return {"triangles_vises": 2000, "animations": [clip]}
