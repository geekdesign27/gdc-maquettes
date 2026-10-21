"""Le panneau du permis de construire (catalogue : permit-board) : « le permis est accorde » ; perime, « il demande ta
nouvelle decision ». Brief valide par Pierre-Alain le 21 octobre 2026 : une maison et un tampon rond pour pictogramme ;
la bande du perime apparait avec l'impulsion de la famille.

Pose a l'entree du chantier, comme sur un vrai chantier ; absent tant que le permis n'est pas accorde (GDC ne le pose
pas). Aucune couleur d'etat (bible 17.3) : le badge HTML se pose sur ANCHOR_BADGE. Il se lit a sa forme :
- un panneau en largeur entre deux poteaux en bois plantes dans le sol, sans socle (le panneau de decision est en
  hauteur, sur un poteau metal a socle, avec un point d'exclamation) ;
- une face blanche avec une maison et un tampon rond, sans barres (le tableau de planning des bureaux est graphite, a
  barres claires) ;
- perime : la meme face barree d'une bande en diagonale.

Cotes, exageration x 1,2 de la famille comprise : panneau de 1,80 x 1,20 m, epais de 0,06 m, de 1,00 a 2,20 m, cadre
graphite de 0,06 m ; poteaux en bois de 0,10 m, de part et d'autre, du sol a 2,30 m ; maison de 0,50 x 0,45 m ;
tampon de 0,22 m ; relief de 0,02 m ; maison et tampon sur les deux faces ; bande de 0,18 m. La maison est en haut a
gauche, le tampon en bas a droite : la bande passe entre eux sans les toucher (sinon le graphite de la bande et celui
de la maison se fondent en une tache).

Noeuds : PRP_PERMIT_BOARD_A_BOARD (tout fusionne, origine au milieu, au sol) et PRP_PERMIT_BOARD_A_BOARD_LOW (sans
chanfrein, pour la qualite basse) ; PRP_PERMIT_BOARD_A_BAND, la bande des deux faces, origine au centre de la face
(elle grandit depuis la), sans chanfrein, pour les deux qualites ; ANCHOR_BADGE.
"""

import math
import os
import sys
from pathlib import Path

import bpy

ASSET = {"id": "permit-board", "categorie": "signals", "nom": "PRP_PERMIT_BOARD_A_v001"}

P = "PRP_PERMIT_BOARD_A_"
LARGE, HAUT, EPAIS = 1.80, 1.20, 0.06  # le panneau
BAS = 1.00
BORD = 0.06  # le cadre graphite visible autour de la face blanche
FACE = 0.01
RELIEF = 0.02
POTEAU, POTEAU_HAUT = 0.10, 2.30
BANDE = 0.18
BADGE = 2.50
C1 = 0.02

X0, X1 = -LARGE / 2 + BORD, LARGE / 2 - BORD  # la face blanche
Z0, Z1 = BAS + BORD, BAS + HAUT - BORD


def _y(cote, decalage):
    """La position en Y d'une couche posee sur la face cote (-1 avant, +1 arriere), a decalage du cadre."""
    return cote * (EPAIS / 2 + decalage)


def _couche(c, nom, profil, cote, decalage, epaisseur, mat):
    """Un profil plat (x, z) pose sur une face, d'epaisseur donnee, a decalage du cadre."""
    y = _y(cote, decalage)
    return c.prisme(nom, profil, epaisseur, (0, y if cote > 0 else y - epaisseur, 0), mat=mat)


def _maison(x, z, large=0.50, haut=0.45, mur=0.26, porte=(0.12, 0.17)):
    """Le profil d'une maison a pignon, avec sa porte, base au milieu en (x, z)."""
    l, (pl, ph) = large / 2, porte
    return [(x - l, z), (x - pl / 2, z), (x - pl / 2, z + ph), (x + pl / 2, z + ph), (x + pl / 2, z), (x + l, z),
            (x + l, z + mur), (x, z + haut), (x - l, z + mur)]


def _bande():
    """Le profil de la bande : la diagonale de la face, du coin bas gauche au coin haut droit, de BANDE de large,
    coupee aux bords de la face (le rectangle decoupe par la bande)."""
    dx, dz = X1 - X0, Z1 - Z0
    n = math.hypot(dx, dz)
    nx, nz = -dz / n, dx / n  # la normale a la diagonale

    def distance(p):
        return (p[0] - X0) * nx + (p[1] - Z0) * nz

    poly = [(X0, Z0), (X1, Z0), (X1, Z1), (X0, Z1)]
    for signe in (1, -1):  # garde distance <= BANDE / 2, puis distance >= -BANDE / 2
        sortie = []
        for a, b in zip(poly, poly[1:] + poly[:1]):
            da, db = signe * distance(a) - BANDE / 2, signe * distance(b) - BANDE / 2
            if da <= 0:
                sortie.append(a)
            if (da < 0) != (db < 0):
                t = da / (da - db)
                sortie.append((a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])))
        poly = sortie
    return poly


def _panneau(c, nom, basse):
    chanfrein = 0.0 if basse else C1
    morceaux = [c.boite(nom + "_FRAME", (LARGE, EPAIS, HAUT), (0, 0, BAS), mat="MAT_PAINTED_METAL_GRAPHITE",
                        chanfrein=chanfrein, segments=2)]
    for k, cote in enumerate((-1, 1)):
        face = [(X0, Z0), (X1, Z0), (X1, Z1), (X0, Z1)]
        morceaux.append(_couche(c, "%s_FACE_%d" % (nom, k), face, cote, 0.0, FACE, "MAT_SURFACE"))
        morceaux.append(_couche(c, "%s_HOUSE_%d" % (nom, k), _maison(-0.50, 1.58), cote, FACE, RELIEF,
                                "MAT_PAINTED_METAL_GRAPHITE"))
        tampon = c.cylindre("%s_STAMP_%d" % (nom, k), 0.11, RELIEF, (0, 0, -RELIEF / 2), mat="MAT_PAINTED_METAL_GRAPHITE",
                            cotes=8 if basse else 16)
        tampon.rotation_euler = (math.radians(90), 0, 0)
        bpy.context.view_layer.update()
        tampon.location = (0.55, _y(cote, FACE + RELIEF / 2), BAS + 0.30)
        c.applique(tampon)
        morceaux.append(tampon)
    for k, x in enumerate((-(LARGE + POTEAU) / 2, (LARGE + POTEAU) / 2)):
        morceaux.append(c.boite("%s_POST_%d" % (nom, k), (POTEAU, POTEAU, POTEAU_HAUT), (x, 0, 0), mat="MAT_WOOD",
                                chanfrein=chanfrein, segments=2))
    o = c.fusionne(nom, morceaux)
    c.origine(o, (0, 0, 0))
    if not basse:
        c.lisse(o)
    return o


def construit(c):
    _panneau(c, P + "BOARD", basse=False)
    _panneau(c, P + "BOARD_LOW", basse=True)
    # la bande du perime, par-dessus la maison et le tampon, sur les deux faces
    bandes = [_couche(c, "%sBAND_%d" % (P, k), _bande(), cote, FACE + RELIEF + 0.002, 0.012, "MAT_PAINTED_METAL_GRAPHITE")
              for k, cote in enumerate((-1, 1))]
    o = c.fusionne(P + "BAND", bandes)
    c.origine(o, (0, 0, (Z0 + Z1) / 2))
    c.ancre("ANCHOR_BADGE", (0, 0, BADGE))

    if "atelier" in sys.modules or any(Path(x).name == "atelier.py" for x in sys.argv):
        exemple_atelier(c)
    return {"triangles_vises": 900, "animations": []}


def exemple_atelier(c):
    """Atelier seulement (jamais exporte) : la variante de la qualite demandee, perimee (GDC_ATELIER_ETAT=granted la
    montre sans bande), sur un socle de terre (bible 18.5)."""
    basse = os.environ.get("GDC_ATELIER_QUALITE") == "low"
    cachees = [P + ("BOARD" if basse else "BOARD_LOW")]
    if os.environ.get("GDC_ATELIER_ETAT") == "granted":
        cachees.append(P + "BAND")
    for nom in cachees:
        bpy.data.objects[nom].hide_render = bpy.data.objects[nom].hide_viewport = True
    socle = c.boite(P + "DEMO_PLINTH", (3.6, 2.4, 0.60), (0, 0, -0.60), mat="MAT_EARTH", chanfrein=0.10, segments=3)
    c.lisse(socle)
