// La benne de tri : le tri des dechets de chantier, obligatoire (OLED, art. 17) (catalogue : waste-skip).
// Production blender : un GLB par matiere (blender/assets/waste-skip.py), chacun sous le budget de la fiche ; le fichier
// principal porte la benne « melange », le contenu par defaut. Le composant montre celui que content designe.
// Plusieurs bennes s'alignent, une par matiere : c'est GDC qui les pose.
// Decisions de Pierre-Alain : une couleur de caisse par matiere (19 octobre 2026) ; benne de 7 m3 a la cote reelle,
// contenu « melange » en cartons et sacs (20 octobre 2026). Le contenu dit la matiere par sa forme, sans texte.
// Le modele est partage entre instances : on ne libere jamais ses geometries ni ses materiaux ici.

const P = "ENV_WASTE_SKIP_A_";
const MODELES = {
  mixed: "ENV_WASTE_SKIP_A_v001.glb",
  wood: "ENV_WASTE_SKIP_A_WOOD_v001.glb",
  metal: "ENV_WASTE_SKIP_A_METAL_v001.glb",
  inert: "ENV_WASTE_SKIP_A_INERT_v001.glb",
};
const MATIERES = ["wood", "metal", "inert", "mixed"];

export const meta = {
  id: "waste-skip",
  version: "1.0.0",
  category: "site",
  states: ["default"],
  params: { content: { type: "enum", values: MATIERES, default: "mixed" } },
  anchors: ["label"],
  budget: { triangles: 1500, materials: 4 },
  animated: false,
  assets: Object.values(MODELES),
};

export function create(THREE, params, ctx) {
  const matiere = MATIERES.includes(params.content)
    ? params.content
    : meta.params.content.default;
  const scene = ctx.assets[MODELES[matiere]].scene;
  const root = new THREE.Group();
  root.name = "waste-skip";
  root.userData.component = meta.id;
  root.add(scene);
  const basse = ctx.quality === "low";
  for (const nom of ["BODY", "CONTENT", "FITTINGS"])
    if (!scene.getObjectByName(P + nom))
      throw new Error(`pièce absente du modèle : ${nom}`);
  // qualite basse (bible 18.3) : les tourillons, sous 0,30 m, disparaissent
  if (basse) scene.getObjectByName(P + "FITTINGS").removeFromParent();
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
      const ancre = scene.getObjectByName(
        "ANCHOR_" + String(name).toUpperCase(),
      );
      if (!ancre) throw new Error(`ancre inconnue : ${name}`);
      root.updateMatrixWorld(true);
      return root.worldToLocal(ancre.getWorldPosition(new THREE.Vector3()));
    },
    dispose() {
      root.remove(scene);
    },
  };
}
