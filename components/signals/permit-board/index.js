// Le panneau du permis de construire : le permis est accorde ; perime, il demande ta nouvelle decision (catalogue :
// permit-board). Production blender (blender/assets/permit-board.py) : un panneau en largeur entre deux poteaux en bois,
// une maison et un tampon rond sur la face blanche ; perime, la meme face barree d'une bande en diagonale, qui se lit a
// sa forme. Brief valide par Pierre-Alain le 21 octobre 2026. GDC le pose a l'entree du chantier quand le permis est
// accorde, jamais avant. Aucune couleur d'etat dans la scene (bible 17.3) : le badge HTML se pose sur l'ancre badge.
// L'impulsion de la famille (signaletique, principe 5) : a l'apparition du panneau, puis une fois pour la bande quand il
// passe de granted a expired ; ensuite tout est fixe. Avec reducedMotion, rien ne bouge. Le contrat interdit
// d'importer le code d'un autre dossier : l'impulsion est recopiee ici.
// Le modele est partage entre instances : on ne libere jamais ses geometries ni ses materiaux ici.

const MODELE = "PRP_PERMIT_BOARD_A_v001.glb";
const P = "PRP_PERMIT_BOARD_A_";
const IMPULSION = 0.6; // secondes
const ECHELLES = [0.85, 1.06, 1.0]; // au debut, au sommet de l'impulsion (60 %), a la fin

export const meta = {
  id: "permit-board",
  version: "1.0.0",
  category: "signals",
  states: ["granted", "expired"],
  params: {},
  anchors: ["badge"],
  budget: { triangles: 1200, materials: 3 },
  animated: true,
  assets: [MODELE],
};

const adoucie = (u) => u * u * (3 - 2 * u);

// L'echelle a l'instant u (0 a 1) de l'impulsion : au-dessus de la taille, puis posee.
function echelle(u) {
  const [a, b, c] = ECHELLES;
  return u < 0.6
    ? a + (b - a) * adoucie(u / 0.6)
    : b + (c - b) * adoucie((u - 0.6) / 0.4);
}

// Une impulsion sur un noeud : au repos tant qu'on ne la relance pas.
function impulsion(noeud, active) {
  let temps = active ? 0 : IMPULSION;
  noeud.scale.setScalar(active ? ECHELLES[0] : 1);
  return {
    relance() {
      temps = 0;
      noeud.scale.setScalar(ECHELLES[0]);
    },
    avance(dt) {
      if (temps >= IMPULSION) return false;
      temps = Math.min(IMPULSION, temps + dt);
      noeud.scale.setScalar(echelle(temps / IMPULSION));
      return true;
    },
  };
}

export function create(THREE, params, ctx) {
  const scene = ctx.assets[MODELE].scene;
  const root = new THREE.Group();
  root.name = "permit-board";
  root.userData.component = meta.id;
  root.add(scene);
  const basse = ctx.quality === "low";
  for (const nom of ["BOARD", "BOARD_LOW", "BAND"])
    if (!scene.getObjectByName(P + nom))
      throw new Error(`pièce absente du modèle : ${nom}`);
  // qualite basse : la variante sans chanfrein ; sinon la variante chanfreinee ; la bande sert aux deux
  scene.getObjectByName(P + (basse ? "BOARD" : "BOARD_LOW")).removeFromParent();
  const bande = scene.getObjectByName(P + "BAND");
  scene.traverse((o) => {
    if (o.isMesh) o.castShadow = o.receiveShadow = !basse;
  });

  const panneau = impulsion(scene, !ctx.reducedMotion);
  const barre = impulsion(bande, false);
  let state = null;

  return {
    root,
    setState(next) {
      if (!meta.states.includes(next))
        throw new Error(`état inconnu : ${next}`);
      bande.visible = next === "expired";
      // la bande apparait avec l'impulsion quand un permis accorde devient perime ; au premier etat, elle vient avec
      // le panneau
      if (state === "granted" && next === "expired" && !ctx.reducedMotion)
        barre.relance();
      state = next;
    },
    update(dt) {
      if (ctx.reducedMotion) return false;
      const a = panneau.avance(dt);
      const b = barre.avance(dt);
      return a || b;
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
