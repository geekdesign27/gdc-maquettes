// Le bureau d'architecte : le lieu de l'idee, des plans et du permis (catalogue : architect-office).
// Production mixte : un conteneur du kit livre container-kit, en coupe (MB_13, variante A : sans toit, long pan avant
// coupe a l'allege, sans longeron haut avant), entree par le bout droit ; le totem d'enseigne vient de building-kit.
// Les modeles sont partages entre instances : on ne libere jamais leurs geometries ni leurs materiaux ici ; seuls le
// socle et son materiau, crees par ce composant, sont liberes. Etat actif : la lampe est tendue au-dessus du plateau et
// la regle parallele monte et descend, sans lumiere emissive.

const KIT = "kit:container-kit/ENV_CONTAINER_KIT_A_v003.glb";
const KIT_BATIMENT = "kit:building-kit/BLD_KIT_A_v002.glb";
const P = "ENV_CONTAINER_KIT_A_";
const PLANCHER = 0.2; // dessus du plancher du conteneur
const NU_BOUT = 3.55; // face exterieure de la paroi du bout droit
const TABLE = [0.9, 0.6]; // la table a dessin, devant le panneau de plans (Blender : x, y)
const PENTE = Math.PI / 6; // plateau a 30 degres, qui monte vers le fond
const COURSE = 0.4; // la regle va de -COURSE a +COURSE le long de la pente
const PERIODE = 6; // secondes pour un aller-retour de la regle
const LAMPE = { repliee: 2.4, tendue: 0 }; // rotation de la lampe autour de la verticale, a sa pince (radians)
const SOCLE = {
  taille: [9.6, 6.4],
  centre: [0.3, -0.4],
  epaisseur: 0.6,
  chanfrein: 0.1,
}; // bible 18.5

export const meta = {
  id: "architect-office",
  version: "1.2.1",
  category: "site",
  states: ["idle", "active"],
  params: {},
  anchors: ["label", "badge", "door", "desk:*"],
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
  ["WALL_END_WINDOW", 0, 0, 0, 180],
  ["STEPS", NU_BOUT, 0, 0, 90],
  ["PLAN_BOARD", 0.9, 1.37, PLANCHER, 0],
  ["DRAFTING_TABLE", TABLE[0], TABLE[1], PLANCHER, 0],
  ["PLAN_ROLLS", 2.8, 1.05, PLANCHER, 0],
  ["SHELF", -3.2, -0.55, PLANCHER, 90],
  ["ROUND_TABLE", -0.4, -0.15, PLANCHER, 0],
  ["MODEL", -0.4, -0.15, PLANCHER + 0.77, 0],
  ["PLANTER", 1.6, -2.25, 0, 0],
];
// qualite basse (bible 18.3) : ce qui mesure moins de 0,30 m disparait
const DETAILS = ["RIBS_LONG_CUT", "RIBS_END_DOOR", "PLAN_ROLLS"];

const versThree = (x, y, z) => [x, z, -y];

export function create(THREE, params, ctx) {
  const kit = ctx.assets[KIT].scene;
  const kitBatiment = ctx.assets[KIT_BATIMENT].scene;
  const root = new THREE.Group();
  root.name = "architect-office";
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
  // le totem d'enseigne (sans texte : le nom est du HTML sur l'ancre label), tourne vers la droite, pres de l'entree
  const totem = pose(
    kitBatiment.getObjectByName("BLD_KIT_A_SIGN_TOTEM"),
    "SIGN_TOTEM",
    4.4,
    -2.6,
    0,
    90,
  );
  // ses MAT_ sont les memes que ceux du kit de conteneur : on reprend ceux-la (un seul materiau par MAT_ dans le lieu)
  const materiauxKit = new Map();
  kit.traverse((o) => {
    if (o.isMesh)
      for (const m of [].concat(o.material)) materiauxKit.set(m.name, m);
  });
  totem.traverse((o) => {
    if (!o.isMesh) return;
    o.material = Array.isArray(o.material)
      ? o.material.map((m) => materiauxKit.get(m.name) || m)
      : materiauxKit.get(o.material.name) || o.material;
  });

  // le socle maquette : dalle de terre de 0,60 m, dessus a y = 0, aretes arrondies (classe C3)
  const [l, pr] = SOCLE.taille;
  const b = SOCLE.chanfrein;
  const forme = new THREE.Shape();
  const demi = [(l - 2 * b) / 2, (pr - 2 * b) / 2];
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

  // la regle et la lampe : les sous-noeuds animables de la table a dessin (container-kit)
  const table = parNom.DRAFTING_TABLE;
  const regle = table.getObjectByName(P + "DRAFTING_RULER");
  const lampe = table.getObjectByName(P + "DRAFTING_LAMP");
  const milieu = regle.position.clone();
  const pente = new THREE.Vector3(0, Math.sin(PENTE), -Math.cos(PENTE)); // vers le haut du plateau
  const placeRegle = (s) =>
    regle.position.copy(milieu).addScaledVector(pente, s);

  const ancres = {
    // label et badge au-dessus des murs du fond : ils ne cachent ni l'interieur ni les personnes
    label: versThree(-1.2, 1.4, 3.4),
    badge: versThree(3.5, 1.4, 3.4),
    door: versThree(NU_BOUT + 0.9, 0, 0), // au pied des marches de l'entree
    "desk:1": versThree(TABLE[0], -0.25, PLANCHER), // Claire, debout devant la table a dessin
  };

  let state = "idle";
  let temps = 0;
  const pose_etat = () => {
    const actif = state === "active";
    lampe.rotation.y = actif ? LAMPE.tendue : LAMPE.repliee;
    // repos : regle garee en bas ; actif sans animation : a mi-plateau, image fixe
    placeRegle(
      actif
        ? ctx.reducedMotion
          ? 0
          : COURSE * Math.sin((2 * Math.PI * temps) / PERIODE)
        : -COURSE,
    );
  };
  pose_etat();

  return {
    root,
    setState(next) {
      if (!meta.states.includes(next))
        throw new Error(`état inconnu : ${next}`);
      state = next;
      temps = 0;
      pose_etat();
    },
    update(dt) {
      if (state !== "active" || ctx.reducedMotion) return false;
      temps = (temps + dt) % PERIODE;
      pose_etat();
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
