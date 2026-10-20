// La pelleteuse : l'etat fouille d'un batiment, le terrassement d'une nouvelle application (catalogue : excavator).
// La geometrie et l'animation viennent du GLB (blender/assets/excavator.py) ; le code choisit le detail selon la
// qualite et pilote le cycle de creusement. Le modele est partage entre instances : on ne libere jamais ses
// geometries ni ses materiaux ici.

const MODELE = "VEH_EXCAVATOR_A_v001.glb";
const CLIP = "ANM_EXCAVATOR_A_DIGGING";
// Sans animation : la fleche levee, tournee, le godet plein ; une image fixe qui ne ressemble pas au repos.
const IMAGE_FIXE = 150 / 30;

export const meta = {
  id: "excavator",
  version: "1.0.0",
  category: "machine",
  states: ["idle", "digging"],
  params: {},
  anchors: ["label"],
  budget: { triangles: 10000, materials: 6 },
  animated: true,
  assets: [MODELE],
};

export function create(THREE, params, ctx) {
  const modele = ctx.assets[MODELE];
  const scene = modele.scene;
  const root = new THREE.Group();
  root.name = "excavator";
  root.userData.component = meta.id;
  root.add(scene);
  const basse = ctx.quality === "low";

  // Qualite basse (bible 18.3) : petits galets, patins, lame et verins, sous 0,30 m, sont retires de la copie.
  const aRetirer = [];
  scene.traverse((o) => {
    if (basse && o.name.endsWith("_DETAIL")) aRetirer.push(o);
  });
  for (const o of aRetirer) o.removeFromParent();
  scene.traverse((o) => {
    if (o.isMesh) o.castShadow = !basse;
  });

  const mixer = new THREE.AnimationMixer(scene);
  const action = mixer.clipAction(
    THREE.AnimationClip.findByName(modele.animations, CLIP),
  );
  let state = "idle";

  return {
    root,
    setState(next) {
      if (!meta.states.includes(next))
        throw new Error(`état inconnu : ${next}`);
      state = next;
      action.stop();
      if (state === "digging") {
        action.reset().play();
        if (ctx.reducedMotion) {
          mixer.setTime(IMAGE_FIXE);
          action.paused = true;
        }
      }
      mixer.update(0);
    },
    update(dt) {
      if (state !== "digging" || ctx.reducedMotion) return false;
      mixer.update(dt);
      return true;
    },
    anchor(name) {
      const noeud = scene.getObjectByName(
        "ANCHOR_" + String(name).toUpperCase(),
      );
      if (!noeud) throw new Error(`ancre inconnue : ${name}`);
      root.updateMatrixWorld(true);
      return root.worldToLocal(noeud.getWorldPosition(new THREE.Vector3()));
    },
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(scene);
      root.remove(scene);
    },
  };
}
