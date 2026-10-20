// Le panneau de decision : une decision t'attend a cet endroit (catalogue : decision-sign).
// Production blender (blender/assets/decision-sign.py) : un panneau en hauteur sur un seul poteau, un point
// d'exclamation en relief sur les deux faces, un socle rond de panneau mobile. Brief valide par Pierre-Alain le
// 20 octobre 2026. Aucune couleur d'etat dans la scene (bible 17.3) : le rouge est porte par le badge HTML que GDC pose
// sur l'ancre badge.
// A l'apparition, une seule impulsion douce (signaletique, principe 5) : le panneau grandit depuis son pied, puis reste
// fixe ; avec reducedMotion, il est fixe tout de suite.
// Le modele est partage entre instances : on ne libere jamais ses geometries ni ses materiaux ici.

const MODELE = "PRP_DECISION_SIGN_A_v001.glb";
const P = "PRP_DECISION_SIGN_A_";
const IMPULSION = 0.6; // secondes
const ECHELLES = [0.85, 1.06, 1.0]; // au debut, au sommet de l'impulsion (60 %), a la fin

export const meta = {
  id: "decision-sign",
  version: "1.0.0",
  category: "signals",
  states: ["default"],
  params: {},
  anchors: ["badge"],
  budget: { triangles: 1000, materials: 3 },
  animated: true,
  assets: [MODELE],
};

const adoucie = (u) => u * u * (3 - 2 * u);

// L'echelle du panneau a l'instant u (0 a 1) de l'impulsion : il monte au-dessus de sa taille, puis s'y pose.
function echelle(u) {
  const [a, b, c] = ECHELLES;
  return u < 0.6
    ? a + (b - a) * adoucie(u / 0.6)
    : b + (c - b) * adoucie((u - 0.6) / 0.4);
}

export function create(THREE, params, ctx) {
  const scene = ctx.assets[MODELE].scene;
  const root = new THREE.Group();
  root.name = "decision-sign";
  root.userData.component = meta.id;
  root.add(scene);
  const basse = ctx.quality === "low";
  for (const nom of ["SIGN", "SIGN_LOW"])
    if (!scene.getObjectByName(P + nom))
      throw new Error(`pièce absente du modèle : ${nom}`);
  // qualite basse : la variante sans chanfrein ; sinon la variante chanfreinee
  scene.getObjectByName(P + (basse ? "SIGN" : "SIGN_LOW")).removeFromParent();
  scene.traverse((o) => {
    if (o.isMesh) o.castShadow = o.receiveShadow = !basse;
  });

  let temps = ctx.reducedMotion ? IMPULSION : 0;
  scene.scale.setScalar(ctx.reducedMotion ? 1 : ECHELLES[0]);

  return {
    root,
    setState(state) {
      if (!meta.states.includes(state))
        throw new Error(`état inconnu : ${state}`);
    },
    update(dt) {
      if (temps >= IMPULSION || ctx.reducedMotion) return false;
      temps = Math.min(IMPULSION, temps + dt);
      scene.scale.setScalar(echelle(temps / IMPULSION));
      return true;
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
