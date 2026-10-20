// Le camion de livraison : l'arrivee d'une nouvelle dependance, un evenement a surveiller (catalogue : delivery-truck).
// La geometrie et l'animation viennent du GLB (blender/assets/delivery-truck.py). GDC deplace la racine le long de la
// rue et passe a arriving quand le camion s'arrete : le dechargement se joue une fois (decision de Pierre-Alain du
// 20 octobre 2026), puis le camion reste benne baissee, le tas pose derriere lui. Le modele est partage entre
// instances : on ne libere jamais ses geometries ni ses materiaux ici.

const MODELE = "VEH_DELIVERY_TRUCK_A_v001.glb";
const CLIP = "ANM_DELIVERY_TRUCK_A_UNLOAD";
// Sans animation : la benne levee, le tas qui se forme ; une image fixe qui dit « on decharge ».
const IMAGE_FIXE = 90 / 30;

export const meta = {
  id: "delivery-truck",
  version: "1.0.0",
  category: "machine",
  states: ["idle", "arriving"],
  params: {},
  anchors: ["label", "badge"],
  budget: { triangles: 10000, materials: 6 },
  animated: true,
  assets: [MODELE],
};

export function create(THREE, params, ctx) {
  const modele = ctx.assets[MODELE];
  const scene = modele.scene;
  const root = new THREE.Group();
  root.name = "delivery-truck";
  root.userData.component = meta.id;
  root.add(scene);
  const basse = ctx.quality === "low";

  // Qualite basse (bible 18.3) : le verin et les raidisseurs de benne, sous 0,30 m, sont retires de la copie.
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
  action.setLoop(THREE.LoopOnce, 1);
  action.clampWhenFinished = true; // la derniere image (benne vide, tas pose) reste
  let state = "idle";

  return {
    root,
    setState(next) {
      if (!meta.states.includes(next))
        throw new Error(`état inconnu : ${next}`);
      state = next;
      action.stop();
      if (state === "arriving") {
        action.reset().play();
        if (ctx.reducedMotion) {
          mixer.setTime(IMAGE_FIXE);
          action.paused = true;
        }
      }
      mixer.update(0);
    },
    update(dt) {
      if (state !== "arriving" || ctx.reducedMotion || !action.isRunning())
        return false;
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
