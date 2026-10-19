// La grue a tour : signale une fusion vers dev (catalogue : crane). v002 : mat et fleche en treillis (MB_08) ; v003 : pivots poses a leur place (correction de commun.rattache).
// La geometrie et l'animation viennent du GLB (blender/assets/crane.py) ; le code empile les troncons du mat selon la
// hauteur, choisit treillis ou caissons pleins selon la qualite, et pilote l'animation. Le modele est partage entre
// instances : on ne libere jamais ses geometries ni ses materiaux ici.

const MODELE = "VEH_TOWER_CRANE_A_v003.glb";
const CLIP = "ANM_TOWER_CRANE_A_LIFTING";
const P = "VEH_TOWER_CRANE_A_";
const SOCLE = 0.4; // dessus du socle beton
const TRONCON = 1.5; // hauteur d'un troncon de mat
// Qualite basse (bible 18.3) : les barres du treillis, sous 0,30 m, laissent la place aux caissons pleins (*_LOW).
const TREILLIS = ["MAST_SECTION", "JIB", "COUNTERJIB", "PEAK", "TIES"].map(
  (n) => P + n,
);

export const meta = {
  id: "crane",
  version: "2.1.0",
  category: "machine",
  states: ["idle", "lifting"],
  params: { height: { type: "number", default: 14, min: 6, max: 30 } },
  anchors: ["label", "badge"],
  budget: { triangles: 15000, materials: 8 },
  animated: true,
  assets: [MODELE],
};

export function create(THREE, params, ctx) {
  const modele = ctx.assets[MODELE];
  const scene = modele.scene;
  const root = new THREE.Group();
  root.name = "crane";
  root.userData.component = meta.id;
  root.add(scene);
  const basse = ctx.quality === "low";

  // La hauteur : n troncons de 1,5 m au-dessus du socle ; le haut de la grue monte d'autant.
  const hauteur = Math.min(
    Math.max(
      Number(params.height) || meta.params.height.default,
      meta.params.height.min,
    ),
    meta.params.height.max,
  );
  const n = Math.max(1, Math.round((hauteur - SOCLE) / TRONCON));
  const haut = SOCLE + n * TRONCON;
  const troncons = [];
  scene.traverse((o) => {
    if (o.name.startsWith(P + "MAST_SECTION_")) troncons.push(o);
  });
  troncons.sort((a, b) => a.name.localeCompare(b.name));
  const modeleTroncon = troncons[0];
  for (const t of troncons.slice(1)) t.removeFromParent();
  for (let k = 1; k < n; k++) {
    const t = modeleTroncon.clone(); // partage la geometrie et le materiau du modele
    t.name = `${P}MAST_SECTION_${String(k).padStart(2, "0")}`;
    t.position.y += k * TRONCON;
    modeleTroncon.parent.add(t);
  }
  scene.getObjectByName(P + "PIVOT_TOP").position.y = haut;
  scene.getObjectByName(P + "MAST_LOW").scale.y = haut - SOCLE;

  // Treillis ou caissons pleins : la piece qui ne sert pas est retiree de la copie (elle ne compte pas au budget).
  const aRetirer = [];
  scene.traverse((o) => {
    const caisson = o.name.endsWith("_LOW");
    const treillis = !caisson && TREILLIS.some((t) => o.name.startsWith(t));
    if ((basse && treillis) || (!basse && caisson)) aRetirer.push(o);
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
      if (state === "lifting") {
        action.reset().play();
        // sans animation : la charge levee, fleche tournee, une image fixe qui dit « on leve »
        if (ctx.reducedMotion) {
          mixer.setTime(action.getClip().duration / 2);
          action.paused = true;
        }
      }
      mixer.update(0);
    },
    update(dt) {
      if (state !== "lifting" || ctx.reducedMotion) return false;
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
