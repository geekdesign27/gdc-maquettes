// Le stockage de materiaux : l'approvisionnement du chantier, les materiaux qui attendent d'etre poses
// (catalogue : material-storage). Fiche et brief valides par Pierre-Alain le 21 octobre 2026.
// Production blender : un seul GLB (blender/assets/material-storage.py), quatre lots fusionnes, chacun a sa place de
// l'aire complete : parpaings sur palettes, buses en beton, botte d'armatures, touret de cable. Avec content = mixed, les
// quatre ; sinon le lot choisi seul, recentre. Sans socle : il se pose sur le terrain de chantier. Aucun texte.
// Le modele est partage entre instances : on ne libere jamais ses geometries ni ses materiaux ici.

const P = "PRP_MATERIAL_STORAGE_A_";
const LOTS = {
  blocks: "BLOCKS",
  pipes: "PIPES",
  rebar: "REBAR",
  cable: "CABLE",
};
const CONTENUS = [...Object.keys(LOTS), "mixed"];
const AU_DESSUS = 0.8; // l'etiquette d'un lot seul, au-dessus de son point le plus haut

export const meta = {
  id: "material-storage",
  version: "1.0.0",
  category: "site",
  states: ["default"],
  params: { content: { type: "enum", values: CONTENUS, default: "mixed" } },
  anchors: ["label"],
  budget: { triangles: 3000, materials: 4 },
  animated: false,
  assets: ["PRP_MATERIAL_STORAGE_A_v001.glb"],
};

export function create(THREE, params, ctx) {
  const contenu = CONTENUS.includes(params.content)
    ? params.content
    : meta.params.content.default;
  const scene = ctx.assets[meta.assets[0]].scene;
  const root = new THREE.Group();
  root.name = "material-storage";
  root.userData.component = meta.id;
  root.add(scene);
  for (const nom of Object.values(LOTS))
    if (!scene.getObjectByName(P + nom))
      throw new Error(`pièce absente du modèle : ${nom}`);

  // un lot seul : les trois autres sont retires, le lot garde ramene au centre
  let seul = null;
  if (contenu !== "mixed") {
    for (const [cle, nom] of Object.entries(LOTS)) {
      const o = scene.getObjectByName(P + nom);
      if (cle === contenu) seul = o;
      else o.removeFromParent();
    }
    seul.position.x = 0;
    seul.position.z = 0;
  }
  const basse = ctx.quality === "low";
  scene.traverse((o) => {
    if (o.isMesh) o.castShadow = o.receiveShadow = !basse;
  });

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
      root.updateMatrixWorld(true);
      if (seul) {
        const boite = new THREE.Box3().setFromObject(seul);
        const centre = boite.getCenter(new THREE.Vector3());
        return root.worldToLocal(centre.setY(boite.max.y + AU_DESSUS));
      }
      const ancre = scene.getObjectByName("ANCHOR_LABEL");
      return root.worldToLocal(ancre.getWorldPosition(new THREE.Vector3()));
    },
    dispose() {
      root.remove(scene);
    },
  };
}
