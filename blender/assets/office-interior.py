"""La salle de brainstorming (catalogue : office-interior, production mixte). Brief valide par Pierre-Alain le
20 octobre 2026.

La vue rapprochee d'une seance : un conteneur du kit livre container-kit (v003), coupe en maison de poupee, une longue
table, des chaises, le decor de l'architecte ou du bureau d'etudes ; le composant l'assemble. Ce modele ne porte que ce
qui est propre a la seance :
- BOARD : le tableau d'idees, un panneau de liege (bois) de 2,40 x 1,20 m dans un cadre graphite, avec son auget ; pose
  au mur, origine au pied du mur, face vers -Y, bas du panneau a 0,90 m (l'allege) ;
- SHEET : une feuille d'idee de 0,42 x 0,30 m (au-dessus du detail minimal), debout dans le plan XZ, face vers -Y,
  origine en son centre : le composant l'accroche au tableau et la fait apparaitre.
Qualite basse (bible 18.3) : BOARD_LOW, le panneau seul, sans cadre ni auget (moins de 0,30 m).
"""

ASSET = {"id": "office-interior", "categorie": "interior", "nom": "ENV_BRAINSTORM_ROOM_A_v001"}

P = "ENV_BRAINSTORM_ROOM_A_"
TABLEAU = (2.40, 1.20)
BAS = 0.90
CADRE = 0.06
C1 = 0.02


def _piece(c, nom, objets):
    """Fusionne les morceaux d'une piece, la lisse et pose son origine au point d'assemblage (0, 0, 0)."""
    o = c.fusionne(P + nom, objets) if len(objets) > 1 else objets[0]
    o.name = o.data.name = P + nom
    c.origine(o, (0, 0, 0))
    c.lisse(o)
    return o


def construit(c):
    l, h = TABLEAU
    g = "MAT_PAINTED_METAL_GRAPHITE"
    morceaux = [c.boite(P + "BOARD", (l, 0.04, h), (0, -0.02, BAS), mat="MAT_WOOD")]
    for k, (taille, pos) in enumerate([
        ((l + 2 * CADRE, CADRE, CADRE), (0, -0.03, BAS - CADRE)),  # traverse basse
        ((l + 2 * CADRE, CADRE, CADRE), (0, -0.03, BAS + h)),  # traverse haute
        ((CADRE, CADRE, h), (-(l + CADRE) / 2, -0.03, BAS)),  # montants
        ((CADRE, CADRE, h), ((l + CADRE) / 2, -0.03, BAS)),
    ]):
        morceaux.append(c.boite(P + "BOARD_FRAME_%d" % k, taille, pos, mat=g, chanfrein=C1, segments=2))
    # l'auget : la tablette des marqueurs, sous le panneau
    morceaux.append(c.boite(P + "BOARD_TRAY", (l * 0.6, 0.12, 0.04), (0, -0.08, BAS - CADRE - 0.04), mat=g, chanfrein=C1, segments=2))
    _piece(c, "BOARD", morceaux)
    _piece(c, "BOARD_LOW", [c.boite(P + "BOARD_LOW", (l, 0.04, h), (0, -0.02, BAS), mat="MAT_WOOD")])

    feuille = c.boite(P + "SHEET", (0.42, 0.01, 0.30), (0, 0, -0.15), mat="MAT_SURFACE")
    _piece(c, "SHEET", [feuille])
    return {"triangles_vises": 400, "animations": []}
