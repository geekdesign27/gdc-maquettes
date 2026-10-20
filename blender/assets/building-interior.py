"""L'interieur d'un batiment (catalogue : building-interior, production mixte). Brief valide par Pierre-Alain le
20 octobre 2026.

La vue micro : une piece de 6 x 3 m par fiche, de plain-pied, en maison de poupee comme les bureaux en conteneur
(direction artistique, 19 octobre 2026) : pas de toit, murs cote camera et cloisons coupes a l'allege (0,90 m), murs du
fond pleins. Le composant assemble la coupe : dalles, rives, poteaux pleins et murs a fenetre du fond viennent du kit
livre (building-kit, BLD_KIT_A_v003), sans le modifier. Ce modele ne porte que ce qui est propre a l'interieur :
- WALL_<BRICK|RENDER>_CUT[_DOOR] : le mur de facade coupe a l'allege, cote camera (avant et droite), avec ou sans la
  baie de porte ; memes conventions que les murs du kit (parement exterieur sur l'axe, epaisseur vers +Y local) ;
- PARTITION_<BRICK|RENDER>[_DOOR] : une demi-cloison coupee de 0,10 m, la peau d'une piece ; deux peaux dos a dos font
  la cloison entre deux pieces, chacune de la finition de sa piece ;
- COLUMN_CUT : le poteau coupe a l'allege, la ou aucun mur plein ne le tient ;
- FLOOR_WOOD : le parquet d'une case de 3 x 3 m (piece finie) ;
- le mobilier des aspects : SCAFFOLD_TOWER (echafaudage roulant), PALLET (palette de sacs), BUCKET (seau) pour les
  travaux ; TABLE pour la piece finie ; STEPLADDER (escabeau) et TARP (bache) pour le defaut.
Origine de chaque piece : son point d'assemblage, a sa base (z = 0 sur le dessus de la dalle). Avant vers -Y.

Qualite basse (bible 18.3) : <PIECE>_LOW aux aretes vives ; tubes, lisses et barreaux fusionnes en panneaux pleins.
"""

import math

ASSET = {"id": "building-interior", "categorie": "interior", "nom": "BLD_INTERIOR_A_v001"}

P = "BLD_INTERIOR_A_"
TRAME = 3.0
POTEAU = 0.30
MUR = 0.20
PEAU = MUR / 2  # une demi-cloison : la peau d'une piece
LONG_MUR = TRAME - POTEAU
COUPE = 0.90  # allege : hauteur des murs coupes (MB_13, variante A)
PORTE = 1.10
TUBE = 0.08
C1, C2 = 0.02, 0.05


def _piece(c, nom, objets):
    """Fusionne les morceaux d'une piece, la lisse et pose son origine au point d'assemblage (0, 0, 0)."""
    o = c.fusionne(P + nom, objets) if len(objets) > 1 else objets[0]
    o.name = o.data.name = P + nom
    c.origine(o, (0, 0, 0))
    c.lisse(o)
    return o


def _coupe(c, nom, epaisseur, mat, porte, chanfrein):
    """Un mur coupe a l'allege entre deux poteaux, parement sur l'axe ; porte : deux trumeaux de part et d'autre de la
    baie de 1,10 m centree."""
    if not porte:
        morceaux = [c.boite(P + nom, (LONG_MUR, epaisseur, COUPE), (0, epaisseur / 2, 0), mat=mat)]
    else:
        l = (LONG_MUR - PORTE) / 2
        morceaux = [c.boite(P + nom + ("" if k == 0 else "_RIGHT"), (l, epaisseur, COUPE),
                            (s * (PORTE + l) / 2, epaisseur / 2, 0), mat=mat) for k, s in enumerate((-1, 1))]
    if chanfrein:
        for m in morceaux:
            c.chanfreine(m, C2 if epaisseur > 4 * C2 else C1, 2)
    return morceaux


def _murs(c, basse):
    s = "_LOW" if basse else ""
    for finition, mat in (("BRICK", "MAT_BRICK"), ("RENDER", "MAT_SURFACE")):
        for porte in (False, True):
            d = "_DOOR" if porte else ""
            nom = "WALL_%s_CUT%s%s" % (finition, d, s)
            _piece(c, nom, _coupe(c, nom, MUR, mat, porte, not basse))
            nom = "PARTITION_%s%s%s" % (finition, d, s)
            _piece(c, nom, _coupe(c, nom, PEAU, mat, porte, not basse))
    nom = "COLUMN_CUT" + s
    _piece(c, nom, [c.boite(P + nom, (POTEAU, POTEAU, COUPE), mat="MAT_CONCRETE",
                            chanfrein=0 if basse else C2, segments=2)])


def _echafaudage(c, basse):
    """Echafaudage roulant : 1,60 x 0,80 m, plancher a 1,00 m, garde-corps a 2,00 m, roulettes."""
    nom = "SCAFFOLD_TOWER" + ("_LOW" if basse else "")
    l, p, h, plancher = 1.60, 0.80, 2.00, 1.00
    m = [c.boite(P + nom, (l, p, 0.08), (0, 0, plancher), mat="MAT_WOOD", chanfrein=0 if basse else C1, segments=2)]
    if basse:
        # les cadres de bout, pleins (montants et lisses sous 0,30 m fusionnes), et la lisse haute
        for k, x in enumerate((-l / 2, l / 2)):
            m.append(c.boite(P + nom + "_END_" + str(k), (TUBE, p, h - 0.12), (x, 0, 0.12), mat="MAT_STEEL"))
        m.append(c.boite(P + nom + "_RAIL", (l, TUBE, TUBE), (0, -p / 2, h - TUBE), mat="MAT_STEEL"))
        return _piece(c, nom, m)
    for k, (x, y) in enumerate([(-l / 2, -p / 2), (l / 2, -p / 2), (l / 2, p / 2), (-l / 2, p / 2)]):
        m.append(c.boite(P + nom + "_STANDARD_" + str(k), (TUBE, TUBE, h - 0.12), (x, y, 0.12), mat="MAT_STEEL"))
        m.append(c.cylindre(P + nom + "_WHEEL_" + str(k), 0.07, 0.12, (x, y, 0), mat="MAT_PAINTED_METAL_GRAPHITE", cotes=8))
    for k, x in enumerate((-l / 2, l / 2)):
        for j, z in enumerate((0.20, 0.60)):  # les echelons du cadre de bout
            m.append(c.boite(P + nom + "_RUNG_%d_%d" % (k, j), (TUBE, p, TUBE), (x, 0, z), mat="MAT_STEEL"))
    for k, y in enumerate((-p / 2, p / 2)):
        for j, z in enumerate((h - TUBE, plancher + 0.50)):  # garde-corps et sous-lisse
            m.append(c.boite(P + nom + "_RAIL_%d_%d" % (k, j), (l, TUBE, TUBE), (0, y, z), mat="MAT_STEEL"))
    diag = c.boite(P + nom + "_BRACE", (math.hypot(l, plancher - 0.2), TUBE, TUBE), (0, -p / 2, 0.55), mat="MAT_STEEL")
    diag.rotation_euler[1] = -math.atan2(plancher - 0.2, l)
    c.applique(diag)
    m.append(diag)
    return _piece(c, nom, m)


def _palette(c, basse):
    """Palette de sacs (mortier, platre) : 1,20 x 0,80 m, deux lits de trois sacs."""
    nom = "PALLET" + ("_LOW" if basse else "")
    m = [c.boite(P + nom, (1.20, 0.80, 0.14), mat="MAT_WOOD", chanfrein=0 if basse else C1, segments=2)]
    if basse:
        m.append(c.boite(P + nom + "_LOAD", (1.10, 0.72, 0.40), (0, 0, 0.14), mat="MAT_SURFACE"))
        return _piece(c, nom, m)
    for lit in range(2):
        for k in range(3):
            # un lit en long, le suivant en travers : la pile se lit comme des sacs, pas comme un bloc
            taille = (0.36, 0.72, 0.18) if lit == 0 else (1.08, 0.24, 0.18)
            pos = ((k - 1) * 0.37, 0, 0.14) if lit == 0 else (0, (k - 1) * 0.245, 0.33)
            m.append(c.boite(P + nom + "_BAG_%d_%d" % (lit, k), taille, pos, mat="MAT_SURFACE", chanfrein=C2, segments=3))
    return _piece(c, nom, m)


def _escabeau(c, basse):
    """Escabeau en A : 1,50 m, cinq marches, ouvert de 0,70 m au sol."""
    nom = "STEPLADDER" + ("_LOW" if basse else "")
    h, ouverture, larg = 1.50, 0.70, 0.50
    angle = math.atan2(ouverture / 2, h)
    long = math.hypot(ouverture / 2, h)
    m = []
    for k, s in enumerate((-1, 1)):
        jambe = []
        if basse:
            jambe.append(c.boite(P + nom + ("" if k == 0 else "_BACK"), (larg, 0.06, long), mat="MAT_ALUMINIUM"))
        else:
            for j, x in enumerate((-larg / 2, larg / 2)):
                jambe.append(c.boite(P + nom + ("" if k == j == 0 else "_LEG_%d_%d" % (k, j)), (0.06, 0.06, long),
                                     (x, 0, 0), mat="MAT_ALUMINIUM"))
            if s < 0:  # les marches sur la jambe de devant seulement
                for j in range(4):
                    jambe.append(c.boite(P + nom + "_STEP_" + str(j), (larg, 0.12, 0.04), (0, 0, (j + 1) * long / 5),
                                         mat="MAT_ALUMINIUM"))
        for o in jambe:  # la jambe pivote sur son pied, puis le pied recule a sa place
            c.origine(o, (0, 0, 0))
            o.rotation_euler[0] = s * angle
            c.applique(o)
            o.location = (0, s * ouverture / 2, 0)
        m += jambe
    m.append(c.boite(P + nom + "_TOP", (larg + 0.06, 0.20, 0.06), (0, 0, h - 0.04), mat="MAT_PAINTED_METAL_GRAPHITE"))
    return _piece(c, nom, m)


def _table(c, basse):
    """La table de la piece finie : 1,60 x 0,80 m, plateau bois, pieds graphite."""
    nom = "TABLE" + ("_LOW" if basse else "")
    l, p, h = 1.60, 0.80, 0.75
    m = [c.boite(P + nom, (l, p, 0.06), (0, 0, h - 0.06), mat="MAT_WOOD", chanfrein=0 if basse else C1, segments=2)]
    if basse:  # les pieds fusionnes en deux joues pleines
        for k, x in enumerate((-l / 2 + 0.10, l / 2 - 0.10)):
            m.append(c.boite(P + nom + "_SIDE_" + str(k), (0.06, p - 0.10, h - 0.06), (x, 0, 0), mat="MAT_PAINTED_METAL_GRAPHITE"))
        return _piece(c, nom, m)
    for k, (x, y) in enumerate([(-1, -1), (1, -1), (1, 1), (-1, 1)]):
        m.append(c.boite(P + nom + "_LEG_" + str(k), (0.06, 0.06, h - 0.06), (x * (l / 2 - 0.10), y * (p / 2 - 0.08), 0),
                         mat="MAT_PAINTED_METAL_GRAPHITE"))
    return _piece(c, nom, m)


def construit(c):
    _murs(c, False)
    _murs(c, True)
    _piece(c, "FLOOR_WOOD", [c.boite(P + "FLOOR_WOOD", (TRAME, TRAME, 0.03), mat="MAT_WOOD")])
    for basse in (False, True):
        _echafaudage(c, basse)
        _palette(c, basse)
        _escabeau(c, basse)
        _table(c, basse)
    # le seau : 0,32 m de haut, au-dessus du detail minimal ; la meme piece en qualite basse
    _piece(c, "BUCKET", [c.cylindre(P + "BUCKET", 0.16, 0.32, mat="MAT_PAINTED_METAL_GRAPHITE", cotes=12)])
    # la bache au sol du defaut : un drap clair plie une fois
    _piece(c, "TARP", [c.boite(P + "TARP", (1.80, 1.20, 0.02), mat="MAT_SURFACE"),
                       c.boite(P + "TARP_FOLD", (1.80, 0.30, 0.05), (0, 0.45, 0.02), mat="MAT_SURFACE")])
    return {"triangles_vises": 4000, "animations": []}
