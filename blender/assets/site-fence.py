"""La cloture de chantier (catalogue : site-fence) : la cloture mobile des chantiers romands (bible 18.8 ; cible MB_10).
Decisions de Pierre-Alain du 20 octobre 2026 : maille de 0,45 m ; portail ouvert de 4 m au milieu (gate).

Des panneaux en treillis gris, un poteau rond a chaque jonction, un plot de beton sous chaque poteau. Aucun orange ni
bande rouge et blanc : la barriere de blocage (orange, a triangle) reste le seul objet de ce genre (signaletique).
Cotes reelles, sans exageration : panneau de 3,50 m sur 2,00 m de haut.

Production blender, assemblee par le composant : chaque piece est un noeud ENV_SITE_FENCE_A_<PIECE>, posee a l'origine
(au sol, la cloture le long de X, l'interieur du chantier vers +Y) ; le composant la repete par instance.
- PLOT, POST : le plot de beton et le poteau d'une jonction ;
- PANEL_FRAME : les trois lisses d'un panneau de 3,50 m entre deux poteaux (centre a l'origine) ; le composant l'etire
  en X a la largeur voulue ;
- PANEL_INFILL, PANEL_INFILL_6 et PANEL_INFILL_HALF : le remplissage du treillis pour 8, 6 et 4 mailles (panneaux de
  3,50, 2,625 et 1,75 m) ; le composant prend celui dont la maille, une fois etire, reste au plus pres de 0,45 m ;
- PANEL_LOW : trois barres verticales larges, a la place du remplissage en qualite basse (sinon le panneau, reduit a
  ses lisses, ressemble a une rambarde, donc a la barriere de blocage) ;
- GATE_POST : le poteau du portail, plus fort et plus haut, sur son plot ;
- GATE_LEAF_FRAME et GATE_LEAF_INFILL : un vantail du portail, 2,00 m, gond a l'origine, il s'etend vers +X ; son cadre
  porte une traverse diagonale : c'est elle qui dit « portail » et pas « angle de cloture ».
Qualite basse (bible 18.3 : ce qui mesure moins de 0,30 m disparait) : les *_INFILL sont retires et PANEL_LOW les
remplace ; restent le cadre, la lisse du milieu, les poteaux et les plots.
Plot : 0,50 x 0,30 x 0,18 m, chanfrein C1 en un seul segment (le budget de 4 000 triangles a 60 m ne permet pas deux).
"""

import sys
from pathlib import Path

import bpy

ASSET = {"id": "site-fence", "categorie": "site", "nom": "ENV_SITE_FENCE_A_v001"}

P = "ENV_SITE_FENCE_A_"
PANNEAU = 3.50
VANTAIL = 2.00
MAILLE = 0.4375  # 3,50 m en 8 mailles : la maille de 0,45 m de la decision, juste
PLOT = (0.50, 0.30, 0.18)
POTEAU = (0.045, 2.05)  # rayon et hauteur du haut
BAS, HAUT = 0.22, 2.00  # dessous de la lisse basse et dessus de la lisse haute
LISSE = 0.06  # section des lisses et des barres (minimum filiforme de la bible, 18.3)
EP = 0.04  # epaisseur du treillis (en Y)
BARRE = 0.07  # largeur d'une barre verticale (en X) : elle reste au-dessus de 0,05 m quand un panneau est raccourci
C1 = 0.02


def _piece(c, nom, objets):
    """Fusionne les morceaux d'une piece et pose son origine au point d'assemblage (0, 0, 0)."""
    o = c.fusionne(P + nom, objets) if len(objets) > 1 else objets[0]
    o.name = o.data.name = P + nom
    c.origine(o, (0, 0, 0))
    return o


def _lisses(c, nom, x0, x1, hauteurs):
    """Des lisses horizontales de x0 a x1, a ces hauteurs (centre de la lisse)."""
    return [c.boite("%s_%d" % (nom, k), (x1 - x0, EP, LISSE), ((x0 + x1) / 2, 0, z - LISSE / 2), mat="MAT_STEEL")
            for k, z in enumerate(hauteurs)]


def _barres(c, nom, xs):
    """Les barres verticales du treillis, entre la lisse basse et la lisse haute."""
    return [c.boite("%s_%d" % (nom, k), (BARRE, EP * 0.8, HAUT - BAS - 2 * LISSE), (x, 0, BAS + LISSE), mat="MAT_STEEL")
            for k, x in enumerate(xs)]


# les trois lisses d'un panneau : basse, milieu (elle reste en qualite basse), haute ; les deux autres sont au remplissage
Z_CADRE = (BAS + LISSE / 2, (BAS + HAUT) / 2, HAUT - LISSE / 2)
Z_REMPLI = (BAS + (HAUT - BAS) / 4, BAS + 3 * (HAUT - BAS) / 4)


def _barre(c, nom, a, b, epaisseur, mat):
    """Une barre de section carree de a a b (points du monde) : la traverse diagonale d'un vantail."""
    from mathutils import Vector
    a, b = Vector(a), Vector(b)
    d = b - a
    o = c.boite(nom, (epaisseur, epaisseur, d.length), (0, 0, -d.length / 2), mat=mat)
    o.rotation_mode = "QUATERNION"
    o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
    o.location = (a + b) / 2
    c.applique(o)
    return o


def _remplissage(c, nom, mailles):
    """Le treillis d'un panneau de mailles x MAILLE de large, centre a l'origine : barres verticales et deux lisses."""
    w = mailles * MAILLE
    return _piece(c, nom, _barres(c, P + nom + "_BAR", [-w / 2 + k * MAILLE for k in range(1, mailles)])
                  + _lisses(c, P + nom + "_RAIL", -w / 2 + POTEAU[0], w / 2 - POTEAU[0], Z_REMPLI))


def construit(c):
    # --- la jonction : le plot de beton et le poteau rond
    _piece(c, "PLOT", [c.boite(P + "PLOT", PLOT, mat="MAT_CONCRETE", chanfrein=C1, segments=1)])
    _piece(c, "POST", [c.cylindre(P + "POST", POTEAU[0], POTEAU[1] - 0.10, (0, 0, 0.10), mat="MAT_STEEL", cotes=6)])

    # --- le panneau de 3,50 m entre deux poteaux : son cadre, son remplissage ; le demi-remplissage de 1,75 m
    demi = PANNEAU / 2 - POTEAU[0]
    _piece(c, "PANEL_FRAME", _lisses(c, P + "PANEL_FRAME", -demi, demi, Z_CADRE))
    _remplissage(c, "PANEL_INFILL", 8)
    _remplissage(c, "PANEL_INFILL_6", 6)
    _remplissage(c, "PANEL_INFILL_HALF", 4)
    _piece(c, "PANEL_LOW", [c.boite("%sPANEL_LOW_%d" % (P, k), (0.10, EP, HAUT - BAS - 2 * LISSE), (x, 0, BAS + LISSE),
                                    mat="MAT_STEEL") for k, x in enumerate((-PANNEAU / 4, 0, PANNEAU / 4))])

    # --- le poteau du portail, plus fort et plus haut que ceux de la cloture
    _piece(c, "GATE_POST", [c.cylindre(P + "GATE_POST", 0.07, 2.20, (0, 0, 0.10), mat="MAT_STEEL", cotes=6)])

    # --- un vantail du portail : un cadre ferme (deux montants), la lisse du milieu ; son treillis a part
    x0, x1 = POTEAU[0] + 0.02, VANTAIL - 0.02
    montants = [c.boite(P + "GATE_LEAF_STILE_%d" % k, (LISSE, EP, HAUT - BAS), (x, 0, BAS), mat="MAT_STEEL")
                for k, x in enumerate((x0 + LISSE / 2, x1 - LISSE / 2))]
    diagonale = _barre(c, P + "GATE_LEAF_BRACE", (x0 + LISSE, 0, BAS + LISSE), (x1 - LISSE, 0, HAUT - LISSE), 0.08, "MAT_STEEL")
    _piece(c, "GATE_LEAF_FRAME", montants + [diagonale] + _lisses(c, P + "GATE_LEAF_FRAME_RAIL", x0, x1, Z_CADRE))
    n = round((x1 - x0) / MAILLE)
    _piece(c, "GATE_LEAF_INFILL", _barres(c, P + "GATE_LEAF_INFILL_BAR", [x0 + k * (x1 - x0) / n for k in range(1, n)])
           + _lisses(c, P + "GATE_LEAF_INFILL_RAIL", x0, x1, Z_REMPLI))

    if "atelier" in sys.modules or any(Path(x).name == "atelier.py" for x in sys.argv):
        exemple_atelier(c)
    return {"triangles_vises": 3600, "animations": []}


def exemple_atelier(c):
    """Atelier seulement (jamais exporte) : une cloture de 12 m avec son portail, montee comme le composant la monte,
    pour les captures ; les pieces sources sont cachees."""
    import os
    basse = os.environ.get("GDC_ATELIER_QUALITE") == "low"
    sources = {o.name[len(P):]: o for o in bpy.data.objects if o.name.startswith(P)}
    k = [0]

    def pose(nom, x, y=0.0, rotation=0.0, etire=1.0):
        if (basse and "INFILL" in nom) or (not basse and nom == "PANEL_LOW"):
            return
        o = c.instance("%sDEMO_%03d_%s" % (P, k[0], nom), sources[nom], (x, y, 0), rotation)
        o.scale.x = etire
        k[0] += 1

    longueur, porte = 12.0, 4.0
    cote = (longueur - porte) / 2
    for signe in (-1, 1):
        n = max(1, -(-cote // PANNEAU))
        w = cote / n
        for i in range(int(n) + 1):
            x = signe * (porte / 2 + i * w)
            pose("PLOT", x)
            if i > 0:  # au bord du portail, le poteau du portail remplace celui de la cloture
                pose("POST", x)
        for i in range(int(n)):
            x = signe * (porte / 2 + (i + 0.5) * w)
            pose("PANEL_FRAME", x, etire=w / PANNEAU)
            pose("PANEL_LOW", x, etire=w / PANNEAU)
            mailles = min((4, 6, 8), key=lambda m: abs(w / m - MAILLE))
            nom = {8: "PANEL_INFILL", 6: "PANEL_INFILL_6", 4: "PANEL_INFILL_HALF"}[mailles]
            pose(nom, x, etire=w / (mailles * MAILLE))
        pose("GATE_POST", signe * porte / 2)
        pose("GATE_LEAF_FRAME", signe * porte / 2, rotation=90)
        pose("GATE_LEAF_INFILL", signe * porte / 2, rotation=90)
    for o in sources.values():
        o.hide_render = o.hide_viewport = True
    # un socle de terre sous l'exemple, pour juger les valeurs de l'acier sur la terre (bible 18.5)
    socle = c.boite(P + "DEMO_PLINTH", (14.0, 6.0, 0.60), (0, 1.5, -0.60), mat="MAT_EARTH", chanfrein=0.10, segments=3)
    c.lisse(socle)
