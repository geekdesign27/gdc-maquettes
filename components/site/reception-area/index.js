// La zone de reception : le lieu des essais et de la visite, avant la remise des cles (catalogue : reception-area).
// Production blender : tout vient du GLB (blender/assets/reception-area.py), socle compris ; le code pilote les etats.
// Etats (decisions de Pierre-Alain du 20 octobre 2026) :
// - idle : l'aire est prete, les ecrans du pupitre eteints (graphite) ;
// - active : les essais. Les ecrans s'allument (MAT_TECH), et la tete du capteur sur trepied pivote une fois par
//   setState('active') : une impulsion par essai, puis plus rien ne bouge. Sans animation, elle reste tournee ;
// - waiting : la reception attend ta decision ; une cle geante est posee sur le pupitre (une forme, sans couleur).
//   Le rouge est dans le badge HTML (signaletique : le rouge ne sert qu'aux decisions qui t'attendent).
// Le modele est partage entre instances : on ne libere jamais ses geometries ni ses materiaux ici ; on ne modifie aucun
// materiau, on echange seulement celui des faces d'ecran entre deux materiaux du modele.

const MODELE = "BLD_DELIVERY_AREA_A_v001.glb";
const P = "BLD_DELIVERY_AREA_A_";
const ESSAI = { duree: 1.2, angle: Math.PI / 3 }; // l'impulsion du capteur : 1,2 s, aller et retour d'un sixieme de tour

export const meta = {
  id: "reception-area",
  version: "1.0.0",
  category: "site",
  states: ["idle", "active", "waiting"],
  params: {},
  anchors: ["label", "badge", "desk:*"],
  budget: { triangles: 10000, materials: 8 },
  animated: true,
  assets: [MODELE],
};

export function create(THREE, params, ctx) {
  const scene = ctx.assets[MODELE].scene;
  const root = new THREE.Group();
  root.name = "reception-area";
  root.userData.component = meta.id;
  root.add(scene);
  const basse = ctx.quality === "low";

  const noeud = (nom) => {
    const o = scene.getObjectByName(P + nom);
    if (!o) throw new Error(`pièce absente du modèle : ${nom}`);
    return o;
  };
  const materiaux = new Map();
  scene.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = o.receiveShadow = !basse;
    for (const m of [].concat(o.material)) materiaux.set(m.name, m);
  });

  // les faces d'ecran : allumees en MAT_TECH, eteintes en graphite, deux materiaux partages du modele
  const allume = materiaux.get("MAT_TECH");
  const eteint = materiaux.get("MAT_PAINTED_METAL_GRAPHITE");
  const faces = [];
  for (const nom of ["SCREEN_FACE_0", "SCREEN_FACE_1"])
    noeud(nom).traverse((o) => {
      if (o.isMesh) faces.push(o);
    });
  const cle = noeud("KEY");
  const capteur = noeud("PIVOT_SENSOR");
  const repos = capteur.rotation.y; // le capteur regarde le pupitre ; l'impulsion s'y ajoute

  let state = "idle";
  let temps = ESSAI.duree; // temps ecoule depuis le dernier essai ; >= duree : au repos
  const poseEtat = () => {
    for (const f of faces) f.material = state === "active" ? allume : eteint;
    cle.visible = state === "waiting";
    const enCours =
      state === "active" && !ctx.reducedMotion && temps < ESSAI.duree;
    const tour =
      state === "active" && ctx.reducedMotion
        ? 1
        : enCours
          ? Math.sin((Math.PI * temps) / ESSAI.duree)
          : 0;
    capteur.rotation.y = repos + ESSAI.angle * tour;
  };
  poseEtat();

  return {
    root,
    setState(next) {
      if (!meta.states.includes(next))
        throw new Error(`état inconnu : ${next}`);
      state = next;
      temps = next === "active" ? 0 : ESSAI.duree; // chaque active est un essai : une impulsion
      poseEtat();
    },
    update(dt) {
      if (state !== "active" || ctx.reducedMotion || temps >= ESSAI.duree)
        return false;
      temps = Math.min(temps + dt, ESSAI.duree);
      poseEtat();
      return true;
    },
    anchor(name) {
      const ancre = scene.getObjectByName(
        "ANCHOR_" + String(name).toUpperCase().replace(":", "_"),
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
