// Le bureau du client : le lieu des decisions qui t'attendent (catalogue : client-office).
// Production mixte : un conteneur du kit livre container-kit en coupe (MB_13, variante A), amenage en salle de decision
// (table de reunion, deux fauteuils, une plante) ; entree par le bout droit ; tableau d'affichage exterieur (le
// PLANNING_BOARD du kit) ; totem d'enseigne de building-kit ; socle maquette.
// Etat waiting (decision de Pierre-Alain du 19 octobre 2026) : une feuille claire est epinglee sur le tableau, c'est
// tout. Le panneau, c'est decision-sign, que GDC pose a l'ancre board ; le rouge et le nombre de decisions sont dans le
// badge HTML de l'ancre badge. Aucune couleur d'etat dans la scene (bible, 17.3).
// Les modeles sont partages entre instances : on ne libere jamais leurs geometries ni leurs materiaux ici ; seuls le
// socle, la feuille et le materiau du socle, crees par ce composant, sont liberes. Le socle et le partage des materiaux
// du totem reprennent ceux d'architect-office : le contrat interdit d'importer d'un autre dossier de composant.

const KIT = "kit:container-kit/ENV_CONTAINER_KIT_A_v001.glb";
const KIT_BATIMENT = "kit:building-kit/BLD_KIT_A_v001.glb";
const P = "ENV_CONTAINER_KIT_A_";
const PLANCHER = 0.2;
const NU_BOUT = 3.55; // face exterieure de la paroi du bout droit
const TABLEAU = [4.8, 1.0]; // le tableau d'affichage, a droite de l'entree, tourne vers +X (Blender : x, y)
const SOCLE = {
  taille: [10.4, 6.4],
  centre: [0.7, -0.4],
  epaisseur: 0.6,
  chanfrein: 0.1,
}; // bible 18.5

export const meta = {
  id: "client-office",
  version: "1.0.0",
  category: "site",
  states: ["idle", "waiting"],
  params: {},
  anchors: ["label", "badge", "board", "desk:*"],
  budget: { triangles: 20000, materials: 10 },
  animated: false,
  assets: [KIT, KIT_BATIMENT],
};

// [piece, x, y, z, rotation en degres], coordonnees Blender (Z vertical, avant vers -Y), conteneur centre a l'origine.
const PIECES = [
  ["FRAME_CUT", 0, 0, 0, 0],
  ["FLOOR", 0, 0, 0, 0],
  ["WALL_LONG_CUT", 0, 0, 0, 0],
  ["RIBS_LONG_CUT", 0, 0, 0, 0],
  ["WALL_LONG", 0, 0, 0, 180],
  ["WALL_END_DOOR", 0, 0, 0, 0],
  ["RIBS_END_DOOR", 0, 0, 0, 0],
  ["WALL_END_WINDOW", 0, 0, 0, 180],
  ["STEPS", NU_BOUT, 0, 0, 90],
  ["MEETING_TABLE", 0, 0.45, PLANCHER, 0],
  ["ARMCHAIR", -1.5, 0.45, PLANCHER, 90], // face a la table, depuis la gauche
  ["ARMCHAIR", 1.5, 0.45, PLANCHER, 270], // face a la table, depuis la droite
  ["PLANT", 2.9, 1.0, PLANCHER, 0],
  ["SHELF", -3.2, -0.55, PLANCHER, 90],
  ["PLANNING_BOARD", TABLEAU[0], TABLEAU[1], 0, 90],
  ["PLANTER", 1.6, -2.25, 0, 0],
];
// qualite basse (bible 18.3) : ce qui mesure moins de 0,30 m disparait
const DETAILS = ["RIBS_LONG_CUT", "RIBS_END_DOOR"];

const versThree = (x, y, z) => [x, z, -y];

export function create(THREE, params, ctx) {
  const kit = ctx.assets[KIT].scene;
  const kitBatiment = ctx.assets[KIT_BATIMENT].scene;
  const root = new THREE.Group();
  root.name = "client-office";
  root.userData.component = meta.id;
  const basse = ctx.quality === "low";

  const pose = (source, nom, x, y, z, rotation) => {
    if (!source) throw new Error(`pièce absente du kit : ${nom}`);
    const piece = source.clone(); // partage la geometrie et les materiaux du kit
    piece.position.set(...versThree(x, y, z));
    piece.rotation.set(0, THREE.MathUtils.degToRad(rotation), 0);
    root.add(piece);
    return piece;
  };
  const parNom = {};
  for (const [nom, x, y, z, rotation] of PIECES) {
    if (basse && DETAILS.includes(nom)) continue;
    parNom[nom] = pose(kit.getObjectByName(P + nom), nom, x, y, z, rotation);
  }

  // un seul materiau par MAT_ dans le lieu : le totem prend ceux du kit de conteneur
  const materiauxKit = new Map();
  kit.traverse((o) => {
    if (o.isMesh)
      for (const m of [].concat(o.material)) materiauxKit.set(m.name, m);
  });
  const totem = pose(
    kitBatiment.getObjectByName("BLD_KIT_A_SIGN_TOTEM"),
    "SIGN_TOTEM",
    4.4,
    -2.6,
    0,
    90,
  );
  totem.traverse((o) => {
    if (!o.isMesh) return;
    o.material = Array.isArray(o.material)
      ? o.material.map((m) => materiauxKit.get(m.name) || m)
      : materiauxKit.get(o.material.name) || o.material;
  });

  // la feuille epinglee sur le tableau en waiting : dans le repere du tableau (sa face est vers -Y en Blender)
  const geometrieFeuille = new THREE.BoxGeometry(0.55, 0.75, 0.02);
  const feuille = new THREE.Mesh(
    geometrieFeuille,
    materiauxKit.get("MAT_SURFACE"),
  );
  feuille.position.set(...versThree(0.78, -0.07, 1.55));
  parNom.PLANNING_BOARD.add(feuille);

  // le socle maquette : dalle de terre de 0,60 m, dessus a y = 0, aretes arrondies (classe C3)
  const [l, pr] = SOCLE.taille;
  const b = SOCLE.chanfrein;
  const demi = [(l - 2 * b) / 2, (pr - 2 * b) / 2];
  const forme = new THREE.Shape();
  forme.moveTo(-demi[0], -demi[1]);
  forme.lineTo(demi[0], -demi[1]);
  forme.lineTo(demi[0], demi[1]);
  forme.lineTo(-demi[0], demi[1]);
  forme.closePath();
  const geometrieSocle = new THREE.ExtrudeGeometry(forme, {
    depth: SOCLE.epaisseur - 2 * b,
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 3,
  });
  geometrieSocle.rotateX(-Math.PI / 2);
  geometrieSocle.translate(
    SOCLE.centre[0],
    -(SOCLE.epaisseur - b),
    -SOCLE.centre[1],
  );
  const terre = ctx.tokens.materiaux.MAT_EARTH;
  const materiauSocle = new THREE.MeshStandardMaterial({
    name: "MAT_EARTH",
    color: new THREE.Color(ctx.tokens.monde[terre.couleur]),
    roughness: terre.rugosite,
    metalness: terre.metal,
  });
  root.add(new THREE.Mesh(geometrieSocle, materiauSocle));

  root.traverse((o) => {
    if (o.isMesh) o.castShadow = o.receiveShadow = !basse;
  });

  const ancres = {
    // label et badge au-dessus du mur du fond : ils ne cachent ni l'interieur ni les personnes
    label: versThree(-1.2, 1.4, 3.4),
    badge: versThree(3.5, 1.4, 3.4),
    board: versThree(TABLEAU[0] + 0.7, TABLEAU[1], 0), // au sol, devant le tableau : la place de decision-sign
    "desk:1": versThree(-0.5, -0.3, PLANCHER), // Pierre-Alain, devant la table de reunion
    "desk:2": versThree(0.5, -0.3, PLANCHER), // Fanny, la representante du client
  };

  const poseEtat = (state) => {
    feuille.visible = state === "waiting";
  };
  poseEtat("idle");

  return {
    root,
    setState(next) {
      if (!meta.states.includes(next))
        throw new Error(`état inconnu : ${next}`);
      poseEtat(next);
    },
    update() {
      return false;
    },
    anchor(name) {
      const p = ancres[name];
      if (!p) throw new Error(`ancre inconnue : ${name}`);
      return new THREE.Vector3(...p);
    },
    dispose() {
      root.clear();
      geometrieFeuille.dispose();
      geometrieSocle.dispose();
      materiauSocle.dispose();
    },
  };
}
