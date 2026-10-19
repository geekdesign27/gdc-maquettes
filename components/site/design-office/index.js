// Le bureau d'etudes : le lieu des plans d'execution, ou travaillent les specialistes (catalogue : design-office).
// Production mixte : des conteneurs du kit livre container-kit, bout a bout le long de X, en coupe (MB_13, variante A),
// deux postes par conteneur ; entree par le bout droit ; totem d'enseigne de building-kit. En ligne plutot qu'en 2 x 2 :
// au milieu d'un 2 x 2, les longerons hauts barreraient la vue sur le rang du fond.
// Les modeles sont partages entre instances : on ne libere jamais leurs geometries ni leurs materiaux ici ; seuls le
// socle et son materiau, crees par ce composant, sont liberes. Etat actif : les ecrans s'allument (face en MAT_TECH du
// kit ; eteints, face en graphite du kit), une image fixe, sans animation.
// Le socle et le partage des materiaux du totem reprennent ceux d'architect-office : le contrat interdit d'importer
// d'un autre dossier de composant.

const KIT = "kit:container-kit/ENV_CONTAINER_KIT_A_v001.glb";
const KIT_BATIMENT = "kit:building-kit/BLD_KIT_A_v001.glb";
const P = "ENV_CONTAINER_KIT_A_";
const LONG = 7.2; // pas des conteneurs bout a bout : leurs poteaux se touchent
const PLANCHER = 0.2;
const NU_BOUT = 3.55; // face exterieure de la paroi de bout, depuis le centre d'un conteneur
const POSTES = [-1.7, 1.7]; // x des deux postes dans un conteneur, contre le mur du fond
const Y_BUREAU = 0.85;
const Y_PERSONNE = 0.2; // debout devant le bureau
const MARGE = { gauche: 0.9, droite: 1.5, profondeur: 6.4, centreY: -0.4 }; // socle autour des conteneurs
const SOCLE = { epaisseur: 0.6, chanfrein: 0.1 }; // bible 18.5

export const meta = {
  id: "design-office",
  version: "1.0.0",
  category: "site",
  states: ["idle", "active"],
  params: { desks: { type: "number", default: 8, min: 1, max: 8 } },
  anchors: ["label", "badge", "door", "desk:*"],
  budget: { triangles: 20000, materials: 10 },
  animated: false,
  assets: [KIT, KIT_BATIMENT],
};

// qualite basse (bible 18.3) : ce qui mesure moins de 0,30 m disparait
const DETAILS = ["RIBS_LONG_CUT", "RIBS_END_DOOR"];

const versThree = (x, y, z) => [x, z, -y];

export function create(THREE, params, ctx) {
  const kit = ctx.assets[KIT].scene;
  const kitBatiment = ctx.assets[KIT_BATIMENT].scene;
  const root = new THREE.Group();
  root.name = "design-office";
  root.userData.component = meta.id;
  const basse = ctx.quality === "low";
  const postes = Math.round(
    Math.min(
      Math.max(
        Number(params.desks) || meta.params.desks.default,
        meta.params.desks.min,
      ),
      meta.params.desks.max,
    ),
  );
  const n = Math.ceil(postes / 2); // conteneurs
  const x0 = (-(n - 1) * LONG) / 2; // centre du premier conteneur
  const xDroite = x0 + (n - 1) * LONG; // centre du dernier, celui de l'entree

  const pose = (source, nom, x, y, z, rotation = 0) => {
    if (!source) throw new Error(`pièce absente du kit : ${nom}`);
    const piece = source.clone(); // partage la geometrie et les materiaux du kit
    piece.position.set(...versThree(x, y, z));
    piece.rotation.set(0, THREE.MathUtils.degToRad(rotation), 0);
    root.add(piece);
    return piece;
  };
  const piece = (nom, x, y, z = 0, rotation = 0) =>
    basse && DETAILS.includes(nom)
      ? null
      : pose(kit.getObjectByName(P + nom), nom, x, y, z, rotation);

  // les conteneurs : coque coupee, sans paroi de bout entre deux voisins (le plateau est ouvert)
  const ecrans = [];
  const ancres = {};
  for (let k = 0; k < n; k++) {
    const x = x0 + k * LONG;
    piece("FRAME_CUT", x, 0);
    piece("FLOOR", x, 0);
    piece("WALL_LONG_CUT", x, 0);
    piece("RIBS_LONG_CUT", x, 0);
    piece("WALL_LONG", x, 0, 0, 180);
    for (const [j, dx] of POSTES.entries()) {
      const numero = 2 * k + j + 1;
      if (numero > postes) {
        piece("SHELF", x + dx, 1.1, PLANCHER); // un seul poste dans ce conteneur : une etagere a la place du second
        continue;
      }
      piece("DESK", x + dx, Y_BUREAU, PLANCHER);
      ecrans.push(piece("SCREEN", x + dx, Y_BUREAU + 0.15, PLANCHER + 0.77));
      piece("CHAIR", x + dx + 0.55, Y_PERSONNE - 0.15, PLANCHER, 30); // repoussee : la personne travaille debout
      ancres[`desk:${numero}`] = versThree(x + dx - 0.15, Y_PERSONNE, PLANCHER);
    }
    if (postes > 2 * k + 1) piece("PARTITION", x, 0.75, PLANCHER, 90); // cloison basse entre les deux postes
  }
  piece("WALL_END_WINDOW", x0, 0, 0, 180);
  piece("WALL_END_DOOR", xDroite, 0);
  piece("RIBS_END_DOOR", xDroite, 0);
  piece("STEPS", xDroite + NU_BOUT, 0, 0, 90);
  piece("PLANTER", xDroite + 1.6, -2.25);

  // le totem d'enseigne, pres de l'entree ; ses MAT_ sont ceux du kit de conteneur (un seul materiau par MAT_)
  const materiauxKit = new Map();
  kit.traverse((o) => {
    if (o.isMesh)
      for (const m of [].concat(o.material)) materiauxKit.set(m.name, m);
  });
  const totem = pose(
    kitBatiment.getObjectByName("BLD_KIT_A_SIGN_TOTEM"),
    "SIGN_TOTEM",
    xDroite + 4.4,
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
  const gauche = x0 - LONG / 2 - MARGE.gauche;
  const droite = xDroite + LONG / 2 + MARGE.droite + 0.6; // marches et totem
  const b = SOCLE.chanfrein;
  const demi = [(droite - gauche - 2 * b) / 2, (MARGE.profondeur - 2 * b) / 2];
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
    (gauche + droite) / 2,
    -(SOCLE.epaisseur - b),
    -MARGE.centreY,
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

  Object.assign(ancres, {
    label: versThree(0, 1.4, 3.4), // au-dessus du mur du fond : il ne cache ni l'interieur ni les personnes
    badge: versThree(xDroite + 3.5, 1.4, 3.4),
    door: versThree(xDroite + NU_BOUT + 0.9, 0, 0), // au pied des marches de l'entree
  });

  let state = "idle";
  const poseEtat = () => {
    for (const f of faces) f.material = state === "active" ? allume : eteint;
  };
  poseEtat();

  return {
    root,
    setState(next) {
      if (!meta.states.includes(next))
        throw new Error(`état inconnu : ${next}`);
      state = next;
      poseEtat();
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
      geometrieSocle.dispose();
      materiauSocle.dispose();
    },
  };
}
