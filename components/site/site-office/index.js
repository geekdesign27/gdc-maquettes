// La baraque du conducteur de travaux : le lieu de la coordination (catalogue : site-office).
// Production mixte : deux conteneurs du kit livre container-kit (v003) empiles, avec escalier exterieur et coursive
// (MB_10). Decisions de Pierre-Alain du 19 octobre 2026 : l'etage est ouvert en coupe (sans toit, long pan avant coupe,
// un passage dans la coupe a l'arrivee de la coursive), le rez est ferme (vestiaire). Le planning sans texte se tient
// sur pieds devant la baraque ; les agents de passage s'y rassemblent (crew:1 a crew:6). Yves est aux ecrans de
// l'etage (desk:1), Victor sur la coursive, pres de l'escalier (desk:2). Totem de building-kit, socle maquette.
// Etat actif : les ecrans s'allument (face en MAT_TECH du kit, graphite eteints) et le repere « aujourd'hui » du
// planning glisse d'un cran, une fois par setState('active'), puis s'arrete ; sans animation, il est deja avance.
// Les modeles sont partages entre instances : on ne libere jamais leurs geometries ni leurs materiaux ici ; seuls le
// socle et son materiau, crees par ce composant, sont liberes. Le socle et le partage des materiaux du totem
// reprennent ceux d'architect-office : le contrat interdit d'importer d'un autre dossier de composant.

const KIT = "kit:container-kit/ENV_CONTAINER_KIT_A_v003.glb";
const KIT_BATIMENT = "kit:building-kit/BLD_KIT_A_v001.glb";
const P = "ENV_CONTAINER_KIT_A_";
const HAUT = 3.0; // le conteneur du haut est pose a 3,00 m
const PLANCHER = 0.2;
const NU = 1.45; // face exterieure d'un panneau de long pan
const X_PORTE = -2.0; // centre des portes du long pan avant (rez et passage de l'etage)
const ETAGE = HAUT + PLANCHER; // plancher de l'etage, et de la coursive
const PLANNING = [0.5, -3.6]; // le tableau de planning, devant la baraque, tourne vers l'avant (Blender : x, y)
const REPERE = { repos: -0.45, avance: 0.15, duree: 0.8 }; // le repere glisse de 0,60 m le long du tableau, en 0,8 s
const SOCLE = {
  taille: [10.0, 8.6],
  centre: [0.5, -1.7],
  epaisseur: 0.6,
  chanfrein: 0.1,
}; // bible 18.5

export const meta = {
  id: "site-office",
  version: "1.0.0",
  category: "site",
  states: ["idle", "active"],
  params: {},
  anchors: ["label", "badge", "entry", "desk:*", "crew:*"],
  budget: { triangles: 20000, materials: 10 },
  animated: true,
  assets: [KIT, KIT_BATIMENT],
};

// [piece, x, y, z, rotation en degres], coordonnees Blender (Z vertical, avant vers -Y), conteneur du bas a l'origine.
const PIECES = [
  // le rez, ferme : le vestiaire (pas de toit ni de plancher visibles : le conteneur du haut le couvre)
  ["FRAME", 0, 0, 0, 0],
  ["WALL_LONG_DOOR", 0, 0, 0, 0],
  ["RIBS_LONG_DOOR", 0, 0, 0, 0],
  ["WALL_END_WINDOW", 0, 0, 0, 0],
  ["RIBS_END_WINDOW", 0, 0, 0, 0],
  ["WALL_LONG", 0, 0, 0, 180],
  ["WALL_END", 0, 0, 0, 180],
  ["STEPS", X_PORTE, -NU, 0, 0],
  // l'etage, ouvert en coupe, avec le passage de la coursive
  ["FRAME_CUT", 0, 0, HAUT, 0],
  ["FLOOR", 0, 0, HAUT, 0],
  ["WALL_LONG_CUT_DOOR", 0, 0, HAUT, 0],
  ["RIBS_LONG_CUT_DOOR", 0, 0, HAUT, 0],
  ["WALL_LONG", 0, 0, HAUT, 180],
  ["WALL_END_WINDOW", 0, 0, HAUT, 0],
  ["RIBS_END_WINDOW", 0, 0, HAUT, 0],
  ["WALL_END_WINDOW", 0, 0, HAUT, 180],
  // l'escalier et la coursive (modeles par rapport au conteneur du bas)
  ["STAIR", 0, 0, 0, 0],
  ["WALKWAY", 0, 0, 0, 0],
  // le poste d'Yves : un bureau, deux ecrans, l'etagere de classeurs
  ["DESK", 0.9, 0.85, ETAGE, 0],
  ["SCREEN", 0.52, 1.0, ETAGE + 0.77, 0],
  ["SCREEN", 1.28, 1.0, ETAGE + 0.77, 0],
  ["SHELF", -3.2, 0.6, ETAGE, 90],
  // le planning devant la baraque, et son repere « aujourd'hui »
  ["PLANNING_BOARD", PLANNING[0], PLANNING[1], 0, 0],
  ["PLANNING_MARKER", PLANNING[0], PLANNING[1], 0, 0],
];
// qualite basse (bible 18.3) : ce qui mesure moins de 0,30 m disparait
const DETAILS = ["RIBS_LONG_DOOR", "RIBS_END_WINDOW", "RIBS_LONG_CUT_DOOR"];

const versThree = (x, y, z) => [x, z, -y];

export function create(THREE, params, ctx) {
  const kit = ctx.assets[KIT].scene;
  const kitBatiment = ctx.assets[KIT_BATIMENT].scene;
  const root = new THREE.Group();
  root.name = "site-office";
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
  const ecrans = [];
  let repere = null;
  for (const [nom, x, y, z, rotation] of PIECES) {
    if (basse && DETAILS.includes(nom)) continue;
    const piece = pose(kit.getObjectByName(P + nom), nom, x, y, z, rotation);
    if (nom === "SCREEN") ecrans.push(piece);
    if (nom === "PLANNING_MARKER") repere = piece;
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
    -3.4,
    0,
    90,
  );
  totem.traverse((o) => {
    if (!o.isMesh) return;
    o.material = Array.isArray(o.material)
      ? o.material.map((m) => materiauxKit.get(m.name) || m)
      : materiauxKit.get(o.material.name) || o.material;
  });

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

  // les faces d'ecran : allumees en MAT_TECH, eteintes en graphite, deux materiaux partages du kit
  const allume = materiauxKit.get("MAT_TECH");
  const eteint = materiauxKit.get("MAT_PAINTED_METAL_GRAPHITE");
  const faces = [];
  for (const e of ecrans)
    e.traverse((o) => {
      if (o.isMesh && o.material.name === "MAT_TECH") faces.push(o);
    });
  const xRepere = repere.position.x;

  const ancres = {
    // label et badge au-dessus du mur du fond de l'etage : ils ne cachent ni l'interieur ni les personnes
    label: versThree(-1.2, 1.4, HAUT + 3.4),
    badge: versThree(3.5, 1.4, HAUT + 3.4),
    entry: versThree(4.22, 2.1, 0), // au pied de l'escalier qui monte a la coursive
    "desk:1": versThree(0.75, 0.2, ETAGE), // Yves, devant ses ecrans
    "desk:2": versThree(2.6, -2.0, ETAGE), // Victor, sur la coursive, pres de l'arrivee de l'escalier
  };
  // les agents de passage : deux rangs de trois, devant le planning
  for (let k = 0; k < 6; k++) {
    ancres[`crew:${k + 1}`] = versThree(
      PLANNING[0] - 1.0 + (k % 3) * 1.0,
      PLANNING[1] - 0.9 - Math.floor(k / 3) * 0.8,
      0,
    );
  }

  let state = "idle";
  let temps = REPERE.duree; // temps ecoule depuis le dernier passage en active ; >= duree : au repos
  const poseEtat = () => {
    const actif = state === "active";
    for (const f of faces) f.material = actif ? allume : eteint;
    const t = !actif
      ? 0
      : ctx.reducedMotion
        ? 1
        : Math.min(temps / REPERE.duree, 1);
    const glisse = t * t * (3 - 2 * t); // depart et arrivee doux
    repere.position.x =
      xRepere + REPERE.repos + (REPERE.avance - REPERE.repos) * glisse;
  };
  poseEtat();

  return {
    root,
    setState(next) {
      if (!meta.states.includes(next))
        throw new Error(`état inconnu : ${next}`);
      state = next;
      temps = 0;
      poseEtat();
    },
    update(dt) {
      if (state !== "active" || ctx.reducedMotion || temps >= REPERE.duree)
        return false;
      temps = Math.min(temps + dt, REPERE.duree);
      poseEtat();
      return true;
    },
    anchor(name) {
      const p = ancres[name];
      if (!p) throw new Error(`ancre inconnue : ${name}`);
      return new THREE.Vector3(...p);
    },
    dispose() {
      root.clear();
      geometrieSocle.dispose();
      materiauSocle.dispose();
    },
  };
}
