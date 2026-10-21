// La barriere de blocage : un travail est bloque ici (catalogue : blocked-sign).
// Production blender (blender/assets/blocked-sign.py) : une latte a bandes orange et blanches sur deux chevalets en A,
// un triangle pointe en haut debout au milieu. Le seul objet de la scene qui a cette forme (bible 18.8) ; la cloture
// site-fence, grise et haute, en est l'inverse. Brief valide par Pierre-Alain le 21 octobre 2026. L'orange est celui de
// l'objet ; l'orange d'etat est porte par le badge HTML que GDC pose sur l'ancre badge (bible 17.3).
// A l'apparition, la meme impulsion douce que le panneau de decision (signaletique, principe 5), puis fixe ; avec
// reducedMotion, fixe tout de suite. Le contrat interdit d'importer le code d'un autre dossier : elle est recopiee ici.
// Le modele est partage entre instances : on ne libere jamais ses geometries ni ses materiaux ici.

const MODELE = "PRP_BLOCKED_BARRIER_A_v001.glb";
const P = "PRP_BLOCKED_BARRIER_A_";
const IMPULSION = 0.6; // secondes
const ECHELLES = [0.85, 1.06, 1.0]; // au debut, au sommet de l'impulsion (60 %), a la fin

export const meta = {
  id: "blocked-sign",
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

// L'echelle de la barriere a l'instant u (0 a 1) de l'impulsion : elle monte au-dessus de sa taille, puis s'y pose.
function echelle(u) {
  const [a, b, c] = ECHELLES;
  return u < 0.6
    ? a + (b - a) * adoucie(u / 0.6)
    : b + (c - b) * adoucie((u - 0.6) / 0.4);
}

export function create(THREE, params, ctx) {
  const scene = ctx.assets[MODELE].scene;
  const root = new THREE.Group();
  root.name = "blocked-sign";
  root.userData.component = meta.id;
  root.add(scene);
  const basse = ctx.quality === "low";
  for (const nom of ["BARRIER", "BARRIER_LOW"])
    if (!scene.getObjectByName(P + nom))
      throw new Error(`pièce absente du modèle : ${nom}`);
  // qualite basse : la variante sans chanfrein ; sinon la variante chanfreinee
  scene
    .getObjectByName(P + (basse ? "BARRIER" : "BARRIER_LOW"))
    .removeFromParent();
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
