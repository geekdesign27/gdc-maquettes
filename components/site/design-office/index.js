// Le bureau d'etudes : le lieu des plans d'execution, ou travaillent les specialistes (catalogue : design-office).
// v2 : une grappe de 1 a 4 conteneurs du kit livre container-kit (v002), accoles par le long pan, comme on les installe
// sur les chantiers (remarque de Pierre-Alain du 19 octobre 2026 : jamais en longue ligne). Coupe MB_13, variante A :
// sans toit, le long pan de devant coupe a l'allege ; aucun longeron haut entre deux conteneurs (FRAME_OPEN), seul
// celui du fond reste. Deux postes par conteneur ; entree par le bout droit du conteneur de devant ; totem de
// building-kit ; socle maquette.
// Les modeles sont partages entre instances : on ne libere jamais leurs geometries ni leurs materiaux ici ; seuls le
// socle et son materiau, crees par ce composant, sont liberes. Etat actif : les ecrans s'allument (face en MAT_TECH du
// kit ; eteints, face en graphite du kit), une image fixe, sans animation.
// Le socle et le partage des materiaux du totem reprennent ceux d'architect-office : le contrat interdit d'importer
// d'un autre dossier de composant.

const KIT = "kit:container-kit/ENV_CONTAINER_KIT_A_v003.glb";
const KIT_BATIMENT = "kit:building-kit/BLD_KIT_A_v003.glb";
const P = "ENV_CONTAINER_KIT_A_";
const LARGE = 3.0; // pas des conteneurs accoles par le long pan : leurs poteaux se touchent
const PLANCHER = 0.2;
const NU_BOUT = 3.55; // face exterieure d'une paroi de bout, depuis le centre d'un conteneur
const POSTES = [-1.7, 1.7]; // x des deux postes dans un conteneur
const Y_BUREAU = 0.85; // depuis le centre du conteneur : contre son long pan du fond
const Y_PERSONNE = 0.2; // debout devant le bureau
const SOCLE = {
  gauche: -4.5,
  droite: 5.7,
  devant: -3.6,
  derriere: 1.3,
  epaisseur: 0.6,
  chanfrein: 0.1,
}; // bible 18.5

export const meta = {
  id: "design-office",
  version: "2.1.2",
  category: "site",
  states: ["idle", "active"],
  params: { desks: { type: "number", default: 8, min: 1, max: 8 } },
  anchors: ["label", "badge", "door", "desk:*"],
  budget: { triangles: 20000, materials: 10 },
  animated: false,
  assets: [KIT, KIT_BATIMENT],
};

// qualite basse (bible 18.3) : ce qui mesure moins de 0,30 m disparait
const DETAILS = ["RIBS_LONG_CUT", "RIBS_END_DOOR", "RIBS_END_WINDOW"];

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
  const n = Math.ceil(postes / 2); // conteneurs, du devant (k = 0, y = 0) vers le fond (+Y)
  const yFond = (n - 1) * LARGE; // centre du conteneur du fond

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

  const ecrans = [];
  const ancres = {};
  for (let k = 0; k < n; k++) {
    const y = k * LARGE;
    const devant = k === 0;
    const fond = k === n - 1;
    // le cadre : aucun longeron haut au raccord de deux conteneurs ; seul celui du fond de la grappe reste
    if (fond) piece("FRAME_CUT", 0, y); // FRAME_CUT garde son longeron du fond et n'a pas celui de devant
    else piece("FRAME_OPEN", 0, y);
    piece("FLOOR", 0, y);
    if (devant) {
      piece("WALL_LONG_CUT", 0, y);
      piece("RIBS_LONG_CUT", 0, y);
    }
    if (fond) piece("WALL_LONG", 0, y, 0, 180);
    // les bouts : l'entree au conteneur de devant, des fenetres ailleurs
    piece("WALL_END_WINDOW", 0, y, 0, 180);
    if (devant) {
      piece("WALL_END_DOOR", 0, y);
      piece("RIBS_END_DOOR", 0, y);
    } else {
      piece("WALL_END_WINDOW", 0, y);
      piece("RIBS_END_WINDOW", 0, y);
    }
    // deux postes contre le fond de chaque conteneur, tournes vers le fond de la grappe
    for (const [j, x] of POSTES.entries()) {
      const numero = 2 * k + j + 1;
      if (numero > postes) {
        piece("SHELF", x, y + 1.1, PLANCHER); // un seul poste dans le conteneur du fond : une etagere a la place
        continue;
      }
      piece("DESK", x, y + Y_BUREAU, PLANCHER);
      ecrans.push(piece("SCREEN", x, y + Y_BUREAU + 0.15, PLANCHER + 0.77));
      piece("CHAIR", x + 0.55, y + Y_PERSONNE - 0.15, PLANCHER, 30); // repoussee : la personne travaille debout
      ancres[`desk:${numero}`] = versThree(x - 0.15, y + Y_PERSONNE, PLANCHER);
    }
    if (postes > 2 * k + 1) piece("PARTITION", 0, y + 0.75, PLANCHER, 90); // cloison basse entre les deux postes
  }
  piece("STEPS", NU_BOUT, 0, 0, 90);
  piece("PLANTER", 1.6, -2.25);

  // le totem d'enseigne, pres de l'entree ; ses MAT_ sont ceux du kit de conteneur (un seul materiau par MAT_)
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

  // le socle maquette : dalle de terre de 0,60 m, dessus a y = 0, aretes arrondies (classe C3) ; il suit la grappe
  const x0 = SOCLE.gauche;
  const x1 = SOCLE.droite;
  const y0 = SOCLE.devant;
  const y1 = yFond + LARGE / 2 + SOCLE.derriere;
  const b = SOCLE.chanfrein;
  const demi = [(x1 - x0 - 2 * b) / 2, (y1 - y0 - 2 * b) / 2];
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
    (x0 + x1) / 2,
    -(SOCLE.epaisseur - b),
    -(y0 + y1) / 2,
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
    // label et badge au-dessus du mur du fond de la grappe : ils ne cachent ni l'interieur ni les personnes
    label: versThree(-1.2, yFond + 1.4, 3.4),
    badge: versThree(3.5, yFond + 1.4, 3.4),
    door: versThree(NU_BOUT + 0.9, 0, 0), // au pied des marches de l'entree
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
