"""Le terrassement du batiment d'une application (catalogue : building, production mixte). Brief valide par
Pierre-Alain le 20 octobre 2026.

Le batiment lui-meme est assemble par le composant a partir du kit (building-kit, BLD_KIT_A_v003). Ce modele ne porte
que ce qui est propre a la parcelle, avant et pendant la fouille :
- PLOT_<NX>X2 : le socle maquette de la parcelle (bible 18.5), l'emprise de NX x 2 trames et 3 m de marge autour ;
- PIT_<NX>X2 : le meme socle creuse de la fouille : 0,50 m de profondeur, talus a 45 degres, fond 0,60 m plus large
  que l'emprise de chaque cote (la place de coffrer les semelles) ;
- SPOIL_HEAP : le tas de deblais, a cote de la fouille ;
- BATTER_BOARD : une chaise d'implantation (trois piquets et deux lattes), posee a l'angle de l'emprise, en dehors ;
- LAYOUT_LINE : le tracage au sol d'une trame de facade (0,15 m, le detail minimal), etire par le composant le long
  de chaque facade : avec les chaises, il dit « terrain prepare, batiment implante ».
L'emprise suit le nombre de fiches (2, 3 ou 4 trames de facade, 2 de profondeur) : un socle par emprise.
Origine de chaque piece : le centre de l'emprise, sur le dessus du socle (z = 0). Avant vers -Y.

Qualite basse (bible 18.3) : SPOIL_HEAP_LOW aux aretes vives ; BATTER_BOARD_LOW, les lattes fusionnees en deux
panneaux pleins de 0,10 m (piquets et lattes, sous 0,30 m, disparaitraient sinon) ; LAYOUT_LINE_LOW, le tracage
elargi a 0,30 m. Les socles restent : ils font la parcelle.
"""

ASSET = {"id": "building", "categorie": "building", "nom": "BLD_SITEWORK_A_v001"}

P = "BLD_SITEWORK_A_"
TRAME = 3.0
PROFONDEUR = 2  # trames de profondeur, pour tous les types
FACADES = (2, 3, 4)  # trames de facade selon le nombre de fiches
MARGE = 3.0  # du nu de l'emprise au bord du socle : echafaudage, tas de deblais, gabarits
SOCLE = 0.60
FOUILLE = 0.50
FOND = 0.60  # du nu de l'emprise au pied du talus
C1, C3 = 0.02, 0.10


def _piece(c, nom, objets):
    o = c.fusionne(P + nom, objets) if len(objets) > 1 else objets[0]
    o.name = o.data.name = P + nom
    c.origine(o, (0, 0, 0))
    c.lisse(o)
    return o


def _socle(c, nom, nx):
    return c.boite(P + nom, (nx * TRAME + 2 * MARGE, PROFONDEUR * TRAME + 2 * MARGE, SOCLE), (0, 0, -SOCLE), mat="MAT_EARTH")


def _tas(c, nom, chanfrein):
    """Deux mottes de terre fusionnees : un tas plus long que large, plus haut d'un cote."""
    gros = c.tronc(P + nom, (3.2, 1.9), (1.2, 0.6), 1.3, (0, 0, 0), mat="MAT_EARTH")
    petit = c.tronc(P + nom + "_SIDE", (1.8, 1.6), (0.7, 0.5), 0.8, (1.4, 0.1, 0), mat="MAT_EARTH")
    if chanfrein:
        for o in (gros, petit):
            c.chanfreine(o, chanfrein, 3)
    return [gros, petit]


def _chaise(c, nom, basse):
    """La chaise d'implantation de l'angle avant gauche : son coin a 1,40 m du coin de l'emprise, sur la diagonale ;
    une latte le long de chaque facade, a hauteur de genou. Une rotation la pose aux trois autres angles."""
    d, l = 1.40, 1.30  # recul du coin de la chaise, longueur d'une latte
    if basse:
        return [c.boite(P + nom, (l, 0.10, 0.75), (-d + l / 2, -d, 0), mat="MAT_WOOD"),
                c.boite(P + nom + "_SIDE", (0.10, l, 0.75), (-d, -d + l / 2, 0), mat="MAT_WOOD")]
    morceaux = [c.boite(P + nom, (l, 0.05, 0.20), (-d + l / 2, -d - 0.065, 0.55), mat="MAT_WOOD"),
                c.boite(P + nom + "_SIDE", (0.05, l, 0.20), (-d - 0.065, -d + l / 2, 0.55), mat="MAT_WOOD")]
    for k, (x, y) in enumerate([(-d, -d), (-d + l - 0.04, -d), (-d, -d + l - 0.04)]):
        morceaux.append(c.boite(P + nom + "_STAKE_" + str(k), (0.08, 0.08, 0.80), (x, y, 0), mat="MAT_WOOD"))
    return morceaux


def construit(c):
    for nx in FACADES:
        emprise = (nx * TRAME, PROFONDEUR * TRAME)
        _piece(c, "PLOT_%dX2" % nx, [c.chanfreine(_socle(c, "PLOT_%dX2" % nx, nx), C3, 3)])
        socle = _socle(c, "PIT_%dX2" % nx, nx)
        # la fouille : le talus a 45 degres prolonge jusqu'a 0,5 m au-dessus du socle, pour couper net
        fond = (emprise[0] + 2 * FOND, emprise[1] + 2 * FOND)
        haut = 2 * FOUILLE
        c.creuse(socle, c.tronc(P + "PIT_TOOL", fond, (fond[0] + 2 * haut, fond[1] + 2 * haut), haut, (0, 0, -FOUILLE)))
        c.chanfreine(socle, C3, 3)
        _piece(c, "PIT_%dX2" % nx, [socle])

    _piece(c, "SPOIL_HEAP", _tas(c, "SPOIL_HEAP", C3))
    _piece(c, "SPOIL_HEAP_LOW", _tas(c, "SPOIL_HEAP_LOW", 0))
    _piece(c, "BATTER_BOARD", _chaise(c, "BATTER_BOARD", False))
    _piece(c, "BATTER_BOARD_LOW", _chaise(c, "BATTER_BOARD_LOW", True))
    for nom, large in (("LAYOUT_LINE", 0.15), ("LAYOUT_LINE_LOW", 0.30)):
        _piece(c, nom, [c.boite(P + nom, (TRAME, large, 0.02), mat="MAT_SURFACE")])
    return {"animations": []}
