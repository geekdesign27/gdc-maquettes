// Le conteneur de chantier : le baraquement ferme des chantiers romands (catalogue : site-container).
// Production mixte : le code assemble les pieces du kit livre container-kit (blender/assets/container-kit.py). Le modele
// est partage entre instances : on ne libere jamais ses geometries ni ses materiaux ici. Pas de socle : ce n'est pas un
// lieu, il se pose sur le chantier. Les faces que la camera iso ne voit pas (arriere, bout gauche) sont des parois
// pleines sans nervures : c'est ce qui tient deux conteneurs empiles sous le budget.

const KIT = "kit:container-kit/ENV_CONTAINER_KIT_A_v003.glb";
const P = "ENV_CONTAINER_KIT_A_";
const HAUT = 3.0; // hauteur d'un conteneur : le second est pose a 3,00 m
const NU = 1.45; // face exterieure d'un panneau de long pan
const X_PORTE = -2.0; // centre de la porte du long pan avant

export const meta = {
  id: "site-container",
  version: "1.2.0",
  category: "site",
  states: ["default"],
  params: { stack: { type: "number", default: 1, min: 1, max: 2 } },
  anchors: ["label", "entry"],
  budget: { triangles: 6000, materials: 6 },
  animated: false,
  assets: [KIT],
};

// Un conteneur ferme : [piece, rotation en degres]. Avant (gauche de l'ecran) et bout droit habilles de nervures.
const CONTENEUR = [
  ["FRAME", 0],
  ["ROOF", 0],
  ["WALL_LONG_DOOR", 0],
  ["RIBS_LONG_DOOR", 0],
  ["WALL_END_WINDOW", 0],
  ["RIBS_END_WINDOW", 0],
  ["WALL_LONG", 180],
  ["WALL_END", 180],
];

export function create(THREE, params, ctx) {
  const kit = ctx.assets[KIT].scene;
  const root = new THREE.Group();
  root.name = "site-container";
  root.userData.component = meta.id;
  const basse = ctx.quality === "low";
  const etages = Math.round(
    Math.min(
      Math.max(Number(params.stack) || meta.params.stack.default, 1),
      meta.params.stack.max,
    ),
  );

  // Blender (Z vertical, avant vers -Y) vers Three.js (Y vertical), comme l'export glTF.
  const pose = (nom, [x, y, z], rotation = 0) => {
    const source = kit.getObjectByName(P + nom);
    if (!source) throw new Error(`pièce absente du kit : ${nom}`);
    const piece = source.clone(); // partage la geometrie et les materiaux du kit
    piece.position.set(x, z, -y);
    piece.rotation.set(0, THREE.MathUtils.degToRad(rotation), 0);
    root.add(piece);
  };

  for (let k = 0; k < etages; k++) {
    for (const [nom, rotation] of CONTENEUR) {
      // qualite basse (bible 18.3) : les nervures, sous 0,30 m, disparaissent
      if (basse && nom.startsWith("RIBS_")) continue;
      pose(nom, [0, 0, k * HAUT], rotation);
    }
  }
  pose("STEPS", [X_PORTE, -NU, 0]);
  if (etages === 2) {
    pose("STAIR", [0, 0, 0]);
    pose("WALKWAY", [0, 0, 0]);
  }
  root.traverse((o) => {
    if (o.isMesh) o.castShadow = o.receiveShadow = !basse;
  });

  const ancres = {
    label: new THREE.Vector3(0, etages * HAUT + 0.8, 0),
    entry: new THREE.Vector3(X_PORTE, 0, NU + 0.8), // au pied des marches de la porte du rez
  };

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
      if (!(name in ancres)) throw new Error(`ancre inconnue : ${name}`);
      return ancres[name].clone();
    },
    dispose() {
      // les pieces clonees partagent les ressources du kit : on les retire seulement
      root.clear();
    },
  };
}
