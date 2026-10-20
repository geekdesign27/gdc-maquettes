// La cloture de chantier : la cloture mobile qui cloisonne le chantier, comme tout chantier romand (catalogue : site-fence).
// Production blender : les pieces du GLB (blender/assets/site-fence.py) sont repetees ici par instance, en ligne droite le
// long de X, origine au milieu, l'interieur du chantier vers -Z de Three.js (+Y de Blender). GDC compose les cotes d'une
// parcelle avec plusieurs instances tournees.
// Decisions de Pierre-Alain du 20 octobre 2026 : maille de 0,45 m ; avec gate, un portail ouvert de 4 m au milieu, ses
// deux vantaux ouverts a 90 degres vers l'interieur. Aucun orange (bible 18.8 : seule la barriere de blocage l'est).
// Les panneaux sont de largeur egale, au plus 3,50 m, pour que les deux bouts tombent juste ; chacun prend le remplissage
// (8, 6 ou 4 mailles) dont la maille, une fois etire, reste au plus pres de 0,45 m. Les vantaux portent une traverse
// diagonale et pendent a des poteaux de portail plus forts : c'est ce qui dit « portail » et pas « angle de cloture ».
// Le modele est partage entre instances : on ne libere jamais ses geometries ni ses materiaux ici.

const MODELE = "ENV_SITE_FENCE_A_v001.glb";
const P = "ENV_SITE_FENCE_A_";
const PANNEAU = 3.5;
const PORTAIL = 4.0;
const MAILLE = 0.4375;
const REMPLISSAGES = { 8: "PANEL_INFILL", 6: "PANEL_INFILL_6", 4: "PANEL_INFILL_HALF" };
const COTE_MIN = 1.0; // en dessous, de chaque cote du portail, pas de panneau : le portail prend toute la longueur
const HAUT_LABEL = 2.6;

export const meta = {
  id: "site-fence",
  version: "1.0.0",
  category: "site",
  states: ["default"],
  params: {
    length: { type: "number", default: 12, min: 2, max: 60 },
    gate: { type: "boolean", default: false },
  },
  anchors: ["label"],
  budget: { triangles: 4000, materials: 3 },
  animated: false,
  assets: [MODELE],
};

const versThree = (x, y, z) => [x, z, -y];

export function create(THREE, params, ctx) {
  const modele = ctx.assets[MODELE].scene;
  const root = new THREE.Group();
  root.name = "site-fence";
  root.userData.component = meta.id;
  const basse = ctx.quality === "low";
  const longueur = Math.min(
    Math.max(
      Number(params.length) || meta.params.length.default,
      meta.params.length.min,
    ),
    meta.params.length.max,
  );
  const portail = params.gate === true || params.gate === "true"; // la galerie passe les parametres de l'adresse en texte

  const pose = (nom, x, y = 0, rotation = 0, etire = 1) => {
    // qualite basse (bible 18.3) : le remplissage du treillis, sous 0,30 m, disparait ; trois barres larges le remplacent,
    // pour que le panneau ne devienne pas une rambarde (la forme de la barriere de blocage)
    if ((basse && nom.includes("INFILL")) || (!basse && nom === "PANEL_LOW"))
      return;
    const source = modele.getObjectByName(P + nom);
    if (!source) throw new Error(`pièce absente du modèle : ${nom}`);
    const o = source.clone(); // partage la geometrie et le materiau du modele
    o.position.set(...versThree(x, y, 0));
    o.rotation.set(0, THREE.MathUtils.degToRad(rotation), 0);
    o.scale.x = etire;
    o.traverse((m) => {
      if (m.isMesh) m.castShadow = m.receiveShadow = !basse;
    });
    root.add(o);
  };

  // un troncon droit de x0 a x1 : des panneaux de largeur egale, un poteau et un plot a chaque jonction ; les bouts
  // listes dans portails prennent le poteau du portail
  const troncon = (x0, x1, portails = []) => {
    const n = Math.max(1, Math.ceil((x1 - x0) / PANNEAU - 1e-9));
    const w = (x1 - x0) / n;
    for (let i = 0; i <= n; i++) {
      const x = x0 + i * w;
      pose("PLOT", x);
      if (!portails.some((p) => Math.abs(p - x) < 1e-6)) pose("POST", x);
    }
    const mailles = [4, 6, 8].reduce((a, m) =>
      Math.abs(w / m - MAILLE) < Math.abs(w / a - MAILLE) ? m : a,
    );
    for (let i = 0; i < n; i++) {
      const x = x0 + (i + 0.5) * w;
      pose("PANEL_FRAME", x, 0, 0, w / PANNEAU);
      pose("PANEL_LOW", x, 0, 0, w / PANNEAU);
      pose(REMPLISSAGES[mailles], x, 0, 0, w / (mailles * MAILLE));
    }
  };

  if (!portail) troncon(-longueur / 2, longueur / 2);
  else {
    const cote = (longueur - PORTAIL) / 2;
    const ouverture = cote >= COTE_MIN ? PORTAIL : longueur;
    const g = ouverture / 2;
    if (cote >= COTE_MIN) {
      troncon(-longueur / 2, -g, [-g]);
      troncon(g, longueur / 2, [g]);
    } else for (const x of [-g, g]) pose("PLOT", x);
    // les deux vantaux, gonds sur les poteaux du portail, ouverts vers l'interieur ; un vantail fait 2 m
    for (const x of [-g, g]) {
      pose("GATE_POST", x);
      pose("GATE_LEAF_FRAME", x, 0, 90, g / 2);
      pose("GATE_LEAF_INFILL", x, 0, 90, g / 2);
    }
  }

  return {
    root,
    setState(state) {
      if (!meta.states.includes(state))
        throw new Error(`état inconnu : ${state}`);
    },
    update() {
      return false;
    },
    anchor(name) {
      if (name !== "label") throw new Error(`ancre inconnue : ${name}`);
      return new THREE.Vector3(...versThree(0, 0, HAUT_LABEL)); // au-dessus du portail, ou du milieu
    },
    dispose() {
      root.clear();
    },
  };
}
