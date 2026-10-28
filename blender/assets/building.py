"""Le terrassement du batiment d'une application (catalogue : building, production mixte). Brief valide par
Pierre-Alain le 20 octobre 2026.

Le batiment lui-meme est assemble par le composant a partir du kit (building-kit, BLD_KIT_A_v004). Ce modele ne porte
que ce qui est propre a la parcelle, avant et pendant la fouille :
- PLOT_<NX>X<NY> : le socle maquette de la parcelle (bible 18.5), l'emprise de NX x NY trames et 3 m de marge autour ;
- PIT_<NX>X<NY> : le meme socle creuse de la fouille : 0,50 m de profondeur, talus a 45 degres, fond 0,60 m plus large
  que l'emprise de chaque cote (la place de coffrer les semelles) ;
- SPOIL_HEAP : le tas de deblais, a cote de la fouille ;
- BATTER_BOARD : une chaise d'implantation (trois piquets et deux lattes), posee a l'angle de l'emprise, en dehors ;
- LAYOUT_LINE : le tracage au sol d'une trame de facade (0,15 m, le detail minimal), etire par le composant le long
  de chaque facade : avec les chaises, il dit « terrain prepare, batiment implante ».
- CONE_GROUP (version 2, building 2.0.0) : le balisage d'une surelevation, trois cones de 0,90 m groupes au pied de
  la tour d'echafaudage (decision de Pierre-Alain du 21 octobre 2026, docs/signaletique.md). Ils ne se confondent pas
  avec le defaut (defect-sign) : un cone seul de 1,20 m, avec son badge. Ici, trois cones plus petits, sans badge, en
  orange fluo (MAT_FABRIC_HIVIS) a deux bandes blanches (MAT_SURFACE), semelle orange : pas de caoutchouc, pour tenir
  le plafond de dix materiaux du batiment.
L'emprise suit le type du batiment (2, 3 ou 4 trames de facade, 2 de profondeur) : un socle par emprise.
v003 (building 3.0.0, temps B des etages, decisions de Pierre-Alain du 28 octobre 2026) : le plateau suit le nombre de
lots de l'etage le plus charge (une piece de 3 x 3 m par lot) ; la facade s'allonge jusqu'a 5 trames, puis le batiment
prend de la profondeur : trois socles de plus, 5 x 2, 4 x 3 et 5 x 3. Les pieces de la v002 sont inchangees.
Origine de chaque piece : le centre de l'emprise, sur le dessus du socle (z = 0). Avant vers -Y.

Qualite basse (bible 18.3) : SPOIL_HEAP_LOW aux aretes vives ; BATTER_BOARD_LOW, les lattes fusionnees en deux
panneaux pleins de 0,10 m (piquets et lattes, sous 0,30 m, disparaitraient sinon) ; LAYOUT_LINE_LOW, le tracage
elargi a 0,30 m ; CONE_GROUP_LOW, trois cones a huit pans, tout orange, sans bande ni semelle (sous 0,30 m). Les socles
restent : ils font la parcelle.
"""

import bmesh
import bpy

ASSET = {"id": "building", "categorie": "building", "nom": "BLD_SITEWORK_A_v003"}

P = "BLD_SITEWORK_A_"
TRAME = 3.0
# les plateaux (trames de facade, de profondeur) : les trois de la v002, puis ceux de la v003
PLATEAUX = ((2, 2), (3, 2), (4, 2), (5, 2), (4, 3), (5, 3))
MARGE = 3.0  # du nu de l'emprise au bord du socle : echafaudage, tas de deblais, gabarits
SOCLE = 0.60
FOUILLE = 0.50
FOND = 0.60  # du nu de l'emprise au pied du talus
C1, C3 = 0.02, 0.10
# Le cone de balisage : celui de la famille (0,90 m, exageration x 1,2 d'un cone de 0,75 m), sans l'agrandissement du
# cone de defaut ; semelle de 0,48 m, deux bandes blanches. Trois cones en grappe, 0,62 m entre leurs axes.
CONE_SEMELLE = (0.48, 0.05)
CONE_HAUT = 0.90
CONE_R = (0.20, 0.035)  # rayon en bas et en haut
CONE_BANDES = ((0.38, 0.48), (0.60, 0.70))
CONES = ((-0.31, -0.18), (0.31, -0.18), (0.0, 0.36))


def _piece(c, nom, objets):
    o = c.fusionne(P + nom, objets) if len(objets) > 1 else objets[0]
    o.name = o.data.name = P + nom
    c.origine(o, (0, 0, 0))
    c.lisse(o)
    return o


def _socle(c, nom, nx, ny):
    return c.boite(P + nom, (nx * TRAME + 2 * MARGE, ny * TRAME + 2 * MARGE, SOCLE), (0, 0, -SOCLE), mat="MAT_EARTH")


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


def _rayon(z):
    """Le rayon du cone a la hauteur z."""
    bas, haut = CONE_R
    return bas + (haut - bas) * (z - CONE_SEMELLE[1]) / (CONE_HAUT - CONE_SEMELLE[1])


def _troncon(c, nom, z0, z1, mat, cotes, chapeau, xy):
    """Un troncon de cone de z0 a z1, ouvert en bas ; ferme en haut seulement pour le dernier (chapeau)."""
    bpy.ops.mesh.primitive_cone_add(vertices=cotes, radius1=_rayon(z0), radius2=_rayon(z1), depth=z1 - z0,
                                    end_fill_type="NGON" if chapeau else "NOTHING",
                                    location=(xy[0], xy[1], (z0 + z1) / 2))
    o = bpy.context.active_object
    o.name = o.data.name = nom
    if chapeau:
        # le cone primitif ferme aussi le bas : on retire ce disque, cache par le troncon du dessous
        b = bmesh.new()
        b.from_mesh(o.data)
        bas = [f for f in b.faces if len(f.verts) > 4 and f.calc_center_median().z < 0]
        bmesh.ops.delete(b, geom=bas, context="FACES_ONLY")
        b.to_mesh(o.data)
        b.free()
    o.data.materials.append(c.materiau(mat))
    return o


def _cones(c, nom, basse):
    """Les trois cones du balisage. Qualite basse : un seul troncon orange par cone, a huit pans, pose au sol."""
    morceaux = []
    for n, xy in enumerate(CONES):
        if basse:
            bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=_rayon(0), radius2=CONE_R[1], depth=CONE_HAUT,
                                            end_fill_type="NOTHING", location=(xy[0], xy[1], CONE_HAUT / 2))
            o = bpy.context.active_object
            o.name = o.data.name = "%s_%d" % (nom, n)
            o.data.materials.append(c.materiau("MAT_FABRIC_HIVIS"))
            morceaux.append(o)
            continue
        limites = [CONE_SEMELLE[1]] + [z for bande in CONE_BANDES for z in bande] + [CONE_HAUT]
        for k, (z0, z1) in enumerate(zip(limites, limites[1:])):
            mat = "MAT_SURFACE" if k % 2 else "MAT_FABRIC_HIVIS"  # orange, blanc, orange, blanc, orange
            morceaux.append(_troncon(c, "%s_%d_PART_%d" % (nom, n, k), z0, z1, mat, 16, z1 == CONE_HAUT, xy))
        morceaux.append(c.boite("%s_%d_FOOT" % (nom, n), (CONE_SEMELLE[0], CONE_SEMELLE[0], CONE_SEMELLE[1]),
                                (xy[0], xy[1], 0), mat="MAT_FABRIC_HIVIS", chanfrein=C1, segments=2))
    return morceaux


def construit(c):
    for nx, ny in PLATEAUX:
        emprise = (nx * TRAME, ny * TRAME)
        plot, pit = "PLOT_%dX%d" % (nx, ny), "PIT_%dX%d" % (nx, ny)
        _piece(c, plot, [c.chanfreine(_socle(c, plot, nx, ny), C3, 3)])
        socle = _socle(c, pit, nx, ny)
        # la fouille : le talus a 45 degres prolonge jusqu'a 0,5 m au-dessus du socle, pour couper net
        fond = (emprise[0] + 2 * FOND, emprise[1] + 2 * FOND)
        haut = 2 * FOUILLE
        c.creuse(socle, c.tronc(P + "PIT_TOOL", fond, (fond[0] + 2 * haut, fond[1] + 2 * haut), haut, (0, 0, -FOUILLE)))
        c.chanfreine(socle, C3, 3)
        _piece(c, pit, [socle])

    _piece(c, "SPOIL_HEAP", _tas(c, "SPOIL_HEAP", C3))
    _piece(c, "SPOIL_HEAP_LOW", _tas(c, "SPOIL_HEAP_LOW", 0))
    _piece(c, "BATTER_BOARD", _chaise(c, "BATTER_BOARD", False))
    _piece(c, "BATTER_BOARD_LOW", _chaise(c, "BATTER_BOARD_LOW", True))
    for nom, large in (("LAYOUT_LINE", 0.15), ("LAYOUT_LINE_LOW", 0.30)):
        _piece(c, nom, [c.boite(P + nom, (TRAME, large, 0.02), mat="MAT_SURFACE")])
    _piece(c, "CONE_GROUP", _cones(c, "CONE_GROUP", False))
    _piece(c, "CONE_GROUP_LOW", _cones(c, "CONE_GROUP_LOW", True))
    return {"animations": []}
