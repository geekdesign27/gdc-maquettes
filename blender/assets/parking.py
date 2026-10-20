"""Le parking, le carnet des demandes (catalogue : parking). Production mixte : les pieces de ce GLB sont assemblees par
le composant selon capacity (le nombre de places marquees, en rangs de 4) et data.count (une caisse par demande ; au-dela
de capacity, la pile). Decisions de Pierre-Alain du 20 octobre 2026.

Chaque piece est un noeud ENV_PARKING_A_<PIECE>, posee a l'origine (centre au sol, avant vers -Y, cote rue) :
- ROW : un rang de 4 places de 1,60 x 1,40 m sur l'asphalte, ses lignes claires et ses bordures laterales en beton ;
  les rangs se posent tous les 1,40 m vers le fond (+Y) ;
- CURB_BACK : la bordure du fond, posee derriere le dernier rang ;
- PILE_PAD : l'aire de depot de la pile, a droite des rangs, encadree de lignes claires ;
- CRATE : une caisse de materiel en bois sur sa palette (une demande) ; CRATE_STRAPS, ses deux cerclages graphite, a
  part pour disparaitre en qualite basse (bible 18.3 : moins de 0,30 m) ;
- PILE : la pile des caisses en trop, trois caisses.
Aucune couleur d'etat ni orange (signaletique ; bible 18.8) : le bois, le graphite, l'asphalte, le beton et le blanc casse.
"""

ASSET = {"id": "parking", "categorie": "site", "nom": "ENV_PARKING_A_v001"}

P = "ENV_PARKING_A_"
PLACE = (1.60, 1.40)  # largeur et profondeur d'une place
PAR_RANG = 4
LIGNE = 0.10  # largeur d'une ligne de marquage : un element filiforme (minimum 0,06 m, bible 18.3)
ASPHALTE = 0.05  # epaisseur de l'enrobe, pose sur le socle
BORDURE = (0.20, 0.15)  # largeur et hauteur d'une bordure
CAISSE = (1.20, 0.80, 0.65)  # x 1,2 d'une caisse sur palette de chantier
PALETTE = 0.15
C1 = 0.02

LARGEUR = PAR_RANG * PLACE[0]  # 6,40 m de places


def _piece(c, nom, objets, lisser=True):
    """Fusionne les morceaux d'une piece et pose son origine au point d'assemblage (0, 0, 0)."""
    o = c.fusionne(P + nom, objets) if len(objets) > 1 else objets[0]
    o.name = o.data.name = P + nom
    c.origine(o, (0, 0, 0))
    if lisser:
        c.lisse(o)
    return o


def _caisse(c, nom, x=0.0, y=0.0, z=0.0):
    """Une caisse sur sa palette, posee par le centre de sa base (x, y, z)."""
    l, p, h = CAISSE
    palette = c.boite(nom + "_PALLET", (l, p, PALETTE), (x, y, z), mat="MAT_WOOD", chanfrein=C1, segments=1)
    corps = c.boite(nom + "_BODY", (l - 0.06, p - 0.06, h), (x, y, z + PALETTE), mat="MAT_WOOD", chanfrein=C1, segments=1)
    return [corps, palette]


def _cerclages(c, nom, x=0.0, y=0.0, z=0.0):
    """Deux cerclages graphite autour du corps de la caisse, a 0,30 m des bouts."""
    l, p, h = CAISSE
    return [c.boite("%s_STRAP_%d" % (nom, k), (0.06, p - 0.03, h + 0.01), (x + dx, y, z + PALETTE - 0.005),
                    mat="MAT_PAINTED_METAL_GRAPHITE") for k, dx in enumerate((-0.30, 0.30))]


def construit(c):
    # --- un rang de quatre places : l'enrobe, les lignes de separation, les bordures laterales
    morceaux = [c.boite(P + "ROW", (LARGEUR + 2 * BORDURE[0], PLACE[1], ASPHALTE), mat="MAT_ASPHALT")]
    for k in range(PAR_RANG + 1):
        x = -LARGEUR / 2 + k * PLACE[0]
        morceaux.append(c.boite(P + "ROW_LINE_%d" % k, (LIGNE, PLACE[1] - 0.20, 0.01), (x, 0, ASPHALTE), mat="MAT_SURFACE"))
    for k, x in enumerate((-(LARGEUR + BORDURE[0]) / 2, (LARGEUR + BORDURE[0]) / 2)):
        morceaux.append(c.boite(P + "ROW_CURB_%d" % k, (BORDURE[0], PLACE[1], BORDURE[1]), (x, 0, 0), mat="MAT_CONCRETE"))
    _piece(c, "ROW", morceaux, lisser=False)

    # --- la bordure du fond, derriere le dernier rang (origine sur le bord du rang)
    _piece(c, "CURB_BACK", [c.boite(P + "CURB_BACK", (LARGEUR + 2 * BORDURE[0], BORDURE[0], BORDURE[1]), (0, BORDURE[0] / 2, 0),
                                    mat="MAT_CONCRETE", chanfrein=C1, segments=1)], lisser=False)

    # --- l'aire de la pile : 2,40 m de cote, encadree de lignes claires
    cote = 2.40
    morceaux = [c.boite(P + "PILE_PAD", (cote, cote, ASPHALTE), mat="MAT_ASPHALT")]
    for k, (taille, pos) in enumerate((((cote - 0.2, LIGNE, 0.01), (0, -cote / 2 + 0.15, ASPHALTE)),
                                       ((cote - 0.2, LIGNE, 0.01), (0, cote / 2 - 0.15, ASPHALTE)),
                                       ((LIGNE, cote - 0.2, 0.01), (-cote / 2 + 0.15, 0, ASPHALTE)),
                                       ((LIGNE, cote - 0.2, 0.01), (cote / 2 - 0.15, 0, ASPHALTE)))):
        morceaux.append(c.boite(P + "PILE_PAD_LINE_%d" % k, taille, pos, mat="MAT_SURFACE"))
    _piece(c, "PILE_PAD", morceaux, lisser=False)

    # --- la caisse et ses cerclages
    _piece(c, "CRATE", _caisse(c, P + "CRATE"))
    _piece(c, "CRATE_STRAPS", _cerclages(c, P + "CRATE_STRAPS"), lisser=False)

    # --- la pile : deux caisses cote a cote, une troisieme dessus ; cerclages du haut compris (elle reste en basse)
    haut = PALETTE + CAISSE[2]
    morceaux = []
    for k, (x, y, z) in enumerate(((0.0, -0.45, 0.0), (0.0, 0.45, 0.0), (0.0, 0.0, haut))):
        morceaux += _caisse(c, P + "PILE_%d" % k, x, y, z)
    morceaux += _cerclages(c, P + "PILE_TOP", 0.0, 0.0, haut)
    pile = _piece(c, "PILE", morceaux)
    pile.name = pile.data.name = P + "PILE"
    return {"triangles_vises": 1500, "animations": []}
