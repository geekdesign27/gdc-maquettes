// Le bureau de controle : le poste qui mesure et tamponne les preuves (catalogue : control-office).
// Production mixte : un conteneur du kit livre container-kit (v002) en coupe (MB_13, variante A), equipe en machine
// (deux armoires de mesure, le trepied, le gros tampon, une etagere de classeurs) ; le poste d'Helene (desk:1) au milieu
// des appareils ; entree par le bout droit ; totem de building-kit ; socle maquette.
// Etats (decisions de Pierre-Alain du 19 octobre 2026) :
// - active : une impulsion par preuve. A chaque setState('active'), la tete du tampon descend et remonte une fois
//   (0,6 s), puis plus rien ne bouge ; GDC rappelle setState('active') a chaque preuve. Rien ne clignote. Sans
//   animation, la tete reste posee sur le tampon encreur ;
// - error : le trepied est renverse au sol, sans animation ; le rouge est dans le badge HTML (bible, 17.3).
// Les modeles sont partages entre instances : on ne libere jamais leurs geometries ni leurs materiaux ici ; seuls le
// socle et son materiau, crees par ce composant, sont liberes. Le socle et le partage des materiaux du totem
// reprennent ceux d'architect-office : le contrat interdit d'importer d'un autre dossier de composant.

const KIT = "kit:container-kit/ENV_CONTAINER_KIT_A_v003.glb";
const KIT_BATIMENT = "kit:building-kit/BLD_KIT_A_v002.glb";
const P = "ENV_CONTAINER_KIT_A_";
const PLANCHER = 0.2;
const NU_BOUT = 3.55; // face exterieure de la paroi du bout droit
const BUREAU = [0.9, 0.85]; // le poste d'Helene, entre les deux armoires (Blender : x, y)
const TREPIED = [-2.4, -0.3];
const COUP = { duree: 0.6, course: 0.2 }; // l'impulsion du tampon : 0,6 s, la tete descend de 0,20 m
const CHUTE = { soulevement: 0.45 }; // trepied couche sur le flanc : ses pieds ecartes de 0,43 m restent au-dessus du sol
const SOCLE = {
  taille: [9.6, 6.4],
  centre: [0.3, -0.4],
  epaisseur: 0.6,
  chanfrein: 0.1,
}; // bible 18.5

export const meta = {
  id: "control-office",
  version: "1.1.1",
  category: "site",
  states: ["idle", "active", "error"],
  params: {},
  anchors: ["label", "badge", "desk:*"],
  budget: { triangles: 20000, materials: 10 },
  animated: true,
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
  ["WALL_END", 0, 0, 0, 180],
  ["STEPS", NU_BOUT, 0, 0, 90],
  ["MEASURE_CABINET", -0.6, 1.05, PLANCHER, 0],
  ["MEASURE_CABINET", 2.4, 1.05, PLANCHER, 0],
  ["DESK", BUREAU[0], BUREAU[1], PLANCHER, 0],
  ["STAMP", BUREAU[0] + 0.55, BUREAU[1] - 0.1, PLANCHER + 0.77, 0], // au bout droit du bureau, a cote d'Helene : visible
  ["TRIPOD", TREPIED[0], TREPIED[1], PLANCHER, 0],
  ["SHELF", -3.2, 0.6, PLANCHER, 90],
  ["PLANTER", 1.6, -2.25, 0, 0],
];
// qualite basse (bible 18.3) : ce qui mesure moins de 0,30 m disparait
const DETAILS = ["RIBS_LONG_CUT", "RIBS_END_DOOR"];

const versThree = (x, y, z) => [x, z, -y];

export function create(THREE, params, ctx) {
  const kit = ctx.assets[KIT].scene;
  const kitBatiment = ctx.assets[KIT_BATIMENT].scene;
  const root = new THREE.Group();
  root.name = "control-office";
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

  // la tete du tampon (sous-noeud animable du kit) et le trepied
  const tete = parNom.STAMP.getObjectByName(P + "STAMP_HEAD");
  const hauteurTete = tete.position.y;
  const trepied = parNom.TRIPOD;
  const debout = trepied.position.clone();

  const ancres = {
    // label et badge au-dessus du mur du fond : ils ne cachent ni l'interieur ni les personnes
    label: versThree(-1.2, 1.4, 3.4),
    badge: versThree(3.5, 1.4, 3.4),
    "desk:1": versThree(BUREAU[0], 0.2, PLANCHER), // Helene, devant son bureau, entre les armoires de mesure
  };

  let state = "idle";
  let temps = COUP.duree; // temps ecoule depuis la derniere impulsion ; >= duree : au repos
  const poseEtat = () => {
    // le tampon : en active sans animation, tete posee ; sinon, la descente de l'impulsion en cours
    const enCours =
      state === "active" && !ctx.reducedMotion && temps < COUP.duree;
    const descente =
      state === "active" && ctx.reducedMotion
        ? 1
        : enCours
          ? Math.sin((Math.PI * temps) / COUP.duree)
          : 0;
    tete.position.y = hauteurTete - COUP.course * descente;
    // le trepied : renverse sur le flanc en error, vers la droite, a cote de son emplacement
    if (state === "error") {
      trepied.rotation.set(0, 0, -Math.PI / 2);
      trepied.position
        .copy(debout)
        .add(new THREE.Vector3(0, CHUTE.soulevement, 0));
    } else {
      trepied.rotation.set(0, 0, 0);
      trepied.position.copy(debout);
    }
  };
  poseEtat();

  return {
    root,
    setState(next) {
      if (!meta.states.includes(next))
        throw new Error(`état inconnu : ${next}`);
      state = next;
      temps = next === "active" ? 0 : COUP.duree; // chaque active est une preuve : une impulsion
      poseEtat();
    },
    update(dt) {
      if (state !== "active" || ctx.reducedMotion || temps >= COUP.duree)
        return false;
      temps = Math.min(temps + dt, COUP.duree);
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
