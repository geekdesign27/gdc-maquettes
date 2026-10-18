// La grue a tour : signale une fusion vers dev (catalogue : crane).
// Composant d'exemple d'un modele produit par Blender : la geometrie et l'animation viennent du GLB,
// le code ne fait que la piloter. Le modele est partage entre instances : on ne le libere jamais ici.

const MODELE = 'VEH_TOWER_CRANE_A_v001.glb';
const CLIP = 'ANM_TOWER_CRANE_A_LIFTING';

export const meta = {
  id: 'crane',
  version: '1.0.0',
  category: 'machine',
  states: ['idle', 'lifting'],
  params: {},
  anchors: ['label', 'badge'],
  budget: { triangles: 15000, materials: 8 },
  animated: true,
  assets: [MODELE],
};

export function create(THREE, params, ctx) {
  const modele = ctx.assets[MODELE];
  const root = new THREE.Group();
  root.name = 'crane';
  root.userData.component = meta.id;
  root.add(modele.scene);
  modele.scene.traverse((o) => { if (o.isMesh) o.castShadow = ctx.quality === 'high'; });

  const mixer = new THREE.AnimationMixer(modele.scene);
  const action = mixer.clipAction(THREE.AnimationClip.findByName(modele.animations, CLIP));
  let state = 'idle';

  return {
    root,
    setState(next) {
      if (!meta.states.includes(next)) throw new Error(`état inconnu : ${next}`);
      state = next;
      action.stop();
      if (state === 'lifting') {
        action.reset().play();
        // sans animation : la charge levee, fleche tournee, une image fixe qui dit « on leve »
        if (ctx.reducedMotion) { mixer.setTime(action.getClip().duration / 2); action.paused = true; }
      }
      mixer.update(0);
    },
    update(dt) {
      if (state !== 'lifting' || ctx.reducedMotion) return false;
      mixer.update(dt);
      return true;
    },
    anchor(name) {
      const noeud = modele.scene.getObjectByName('ANCHOR_' + String(name).toUpperCase());
      if (!noeud) throw new Error(`ancre inconnue : ${name}`);
      root.updateMatrixWorld(true);
      return root.worldToLocal(noeud.getWorldPosition(new THREE.Vector3()));
    },
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(modele.scene);
      root.remove(modele.scene);
    },
  };
}
