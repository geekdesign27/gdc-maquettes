"""Le signal de defaut (catalogue : defect-sign) : « un defaut est ouvert ici, sur une partie habitee » (signaletique :
cone pose sur la facade ou dans la piece). Decisions de Pierre-Alain du 21 octobre 2026 : le cone seul, sans ruban ;
orange fluo (MAT_FABRIC_HIVIS, #FF6A13), la couleur des vrais cones, distincte de l'orange chantier de la barriere de
blocage (bible 18.8).

Un cone de chantier sur sa semelle carree, deux bandes blanches. GDC le pose au sol devant la facade du batiment ou
dans la piece concernee de building-interior. Aucune couleur d'etat (bible 17.3) : le badge HTML se pose sur
ANCHOR_BADGE. Le cone est seul, plein et rond : il ne se confond pas avec le triangle de la barriere, debout sur sa
latte.

Cotes, exageration x 1,2 de la famille comprise : 0,90 m de haut ; semelle de 0,48 m sur 0,05 m ; cone de 0,40 m de
diametre en bas a 0,07 m en haut ; bandes blanches de 0,10 m, de 0,38 a 0,48 m et de 0,60 a 0,70 m.

Noeuds : PRP_DEFECT_CONE_A_CONE (tout fusionne, origine au milieu, au sol), PRP_DEFECT_CONE_A_CONE_LOW (moins de cotes,
sans chanfrein, pour la qualite basse), ANCHOR_BADGE. L'impulsion d'apparition est jouee par le composant.
"""

import os
import sys
from pathlib import Path

import bmesh
import bpy

ASSET = {"id": "defect-sign", "categorie": "signals", "nom": "PRP_DEFECT_CONE_A_v001"}

P = "PRP_DEFECT_CONE_A_"
SEMELLE = (0.48, 0.05)  # cote et epaisseur
HAUT = 0.90
R_BAS, R_HAUT = 0.20, 0.035
BANDES = ((0.38, 0.48), (0.60, 0.70))  # les bandes blanches, de z a z
BADGE = 1.20
C1 = 0.02


def _rayon(z):
    """Le rayon du cone a la hauteur z."""
    return R_BAS + (R_HAUT - R_BAS) * (z - SEMELLE[1]) / (HAUT - SEMELLE[1])


def _troncon(c, nom, z0, z1, mat, cotes, chapeau):
    """Un troncon du cone de z0 a z1, ouvert en bas ; ferme en haut seulement pour le dernier (chapeau)."""
    bpy.ops.mesh.primitive_cone_add(vertices=cotes, radius1=_rayon(z0), radius2=_rayon(z1), depth=z1 - z0,
                                    end_fill_type="NGON" if chapeau else "NOTHING", location=(0, 0, (z0 + z1) / 2))
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


def _cone(c, nom, basse):
    cotes = 10 if basse else 16
    limites = [SEMELLE[1]] + [z for bande in BANDES for z in bande] + [HAUT]
    morceaux = []
    for k, (z0, z1) in enumerate(zip(limites, limites[1:])):
        mat = "MAT_SURFACE" if k % 2 else "MAT_FABRIC_HIVIS"  # orange, blanc, orange, blanc, orange
        morceaux.append(_troncon(c, "%s_PART_%d" % (nom, k), z0, z1, mat, cotes, chapeau=z1 == HAUT))
    morceaux.append(c.boite(nom + "_FOOT", (SEMELLE[0], SEMELLE[0], SEMELLE[1]), mat="MAT_RUBBER",
                            chanfrein=0.0 if basse else C1, segments=2))
    o = c.fusionne(nom, morceaux)
    c.origine(o, (0, 0, 0))
    c.lisse(o)
    return o


def construit(c):
    _cone(c, P + "CONE", basse=False)
    _cone(c, P + "CONE_LOW", basse=True)
    c.ancre("ANCHOR_BADGE", (0, 0, BADGE))

    if "atelier" in sys.modules or any(Path(x).name == "atelier.py" for x in sys.argv):
        exemple_atelier(c)
    return {"triangles_vises": 400, "animations": []}


def exemple_atelier(c):
    """Atelier seulement (jamais exporte) : montre la variante de la qualite demandee, sur un socle de terre (bible
    18.5), pour juger l'orange fluo et le blanc sur la terre."""
    basse = os.environ.get("GDC_ATELIER_QUALITE") == "low"
    cachee = bpy.data.objects[P + ("CONE" if basse else "CONE_LOW")]
    cachee.hide_render = cachee.hide_viewport = True
    socle = c.boite(P + "DEMO_PLINTH", (2.0, 2.0, 0.60), (0, 0, -0.60), mat="MAT_EARTH", chanfrein=0.10, segments=3)
    c.lisse(socle)
