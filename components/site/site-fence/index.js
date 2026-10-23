// La cloture de chantier : la cloture mobile qui cloisonne le chantier, comme tout chantier romand (catalogue : site-fence).
// Production blender : les pieces du GLB (blender/assets/site-fence.py) sont repetees ici par instance, en ligne droite le
// long de X, origine au milieu, l'interieur du chantier vers -Z de Three.js (+Y de Blender). GDC compose les cotes d'une
// parcelle avec plusieurs instances tournees.
// Decisions de Pierre-Alain du 20 octobre 2026 : maille de 0,45 m ; avec gate, un portail ouvert de 4 m au milieu, ses
// deux vantaux ouverts a 90 degres vers l'interieur. Aucun orange (bible 18.8 : seule la barriere de blocage l'est).
// Les panneaux sont de largeur egale, au plus 3,50 m, pour que les deux bouts tombent juste ; chacun prend le remplissage
// (8, 6 ou 4 mailles) dont la maille, une fois etire, reste au plus pres de 0,45 m. Les vantaux portent une traverse
// diagonale et pendent a des poteaux de portail plus forts : c'est ce qui dit « portail » et pas « angle de cloture ».
// Version 1.0.1 (plan D-1, 22 octobre 2026) : chaque piece repetee (plot, poteau, cadre, remplissage) est posee en une
// seule InstancedMesh par maillage, au lieu d'une copie par panneau ; la cloture se dessine en quelques appels.
// Version 1.1.0 (lot G8, docs/vie-du-chantier.md, section 7) : le portail se ferme. default reste le portail ouvert de
// la 1.0 ; closed ramene les deux vantaux dans l'axe de la cloture par une rotation douce de 1,5 s, une fois (et retour
// vers default) ; l'etat final directement avec reducedMotion. Sans gate, closed ne change rien. Seules les matrices des
// deux vantaux bougent : ni piece, ni appel de dessin de plus.
// Le modele est partage entre instances : on ne libere jamais ses geometries ni ses materiaux ici, seulement les
// InstancedMesh (leurs matrices).

const MODELE = "ENV_SITE_FENCE_A_v001.glb";
const P = "ENV_SITE_FENCE_A_";
const PANNEAU = 3.5;
const PORTAIL = 4.0;
const MAILLE = 0.4375;
const REMPLISSAGES = { 8: "PANEL_INFILL", 6: "PANEL_INFILL_6", 4: "PANEL_INFILL_HALF" };
const COTE_MIN = 1.0; // en dessous, de chaque cote du portail, pas de panneau : le portail prend toute la longueur
const HAUT_LABEL = 2.6;
const DUREE_PORTAIL = 1.5; // secondes, une fois, a chaque changement d'etat
const OUVERT = 90; // degres : les vantaux tournes vers l'interieur ; ferme, 0 a gauche et 180 a droite

export const meta = {
  id: "site-fence",
  version: "1.1.0",
  category: "site",
  states: ["default", "closed"],
  params: {
    length: { type: "number", default: 12, min: 2, max: 60 },
    gate: { type: "boolean", default: false },
  },
  anchors: ["label"],
  budget: { triangles: 4000, materials: 3 },
  animated: true,
  assets: [MODELE],
};

const versThree = (x, y, z) => [x, z, -y];

export function create(THREE, params, ctx) {
  const modele = ctx.assets[MODELE].scene;
  const root = new THREE.Group();
  root.name = "site-fence";
  root.userData.component = meta.id;
  const basse = ctx.quality === "low";
  const longueur = Math.min(
    Math.max(
      Number(params.length) || meta.params.length.default,
      meta.params.length.min,
    ),
    meta.params.length.max,
  );
  const portail = params.gate === true || params.gate === "true"; // la galerie passe les parametres de l'adresse en texte

  // les poses de chaque piece : la place de la piece (sa position, son lacet, son etirement en longueur)
  const poses = new Map();
  const pose = (nom, x, y = 0, rotation = 0, etire = 1) => {
    // qualite basse (bible 18.3) : le remplissage du treillis, sous 0,30 m, disparait ; trois barres larges le remplacent,
    // pour que le panneau ne devienne pas une rambarde (la forme de la barriere de blocage)
    if ((basse && nom.includes("INFILL")) || (!basse && nom === "PANEL_LOW"))
      return;
    const source = modele.getObjectByName(P + nom);
    if (!source) throw new Error(`pièce absente du modèle : ${nom}`);
    const place = new THREE.Matrix4().compose(
      new THREE.Vector3(...versThree(x, y, 0)),
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, THREE.MathUtils.degToRad(rotation), 0),
      ),
      new THREE.Vector3(etire, source.scale.y, source.scale.z),
    );
    if (!poses.has(source)) poses.set(source, []);
    poses.get(source).push(place);
    return { source, index: poses.get(source).length - 1, x, etire };
  };
  // une InstancedMesh par maillage de chaque piece, avec la geometrie et le materiau du modele : la place de la piece,
  // puis celle du maillage dans la piece
  const instances = [];
  const parSource = new Map(); // piece -> [{ im, dansPiece }] : pour reposer un vantail qui tourne
  const instancie = () => {
    for (const [source, places] of poses) {
      source.updateMatrixWorld(true);
      const versPiece = source.matrixWorld.clone().invert();
      source.traverse((m) => {
        if (!m.isMesh) return;
        const dansPiece =
          m === source
            ? new THREE.Matrix4()
            : versPiece.clone().multiply(m.matrixWorld);
        const im = new THREE.InstancedMesh(
          m.geometry,
          m.material,
          places.length,
        );
        im.name = m.name;
        places.forEach((place, i) =>
          im.setMatrixAt(i, place.clone().multiply(dansPiece)),
        );
        im.instanceMatrix.needsUpdate = true;
        im.computeBoundingSphere();
        im.castShadow = im.receiveShadow = !basse;
        if (!parSource.has(source)) parSource.set(source, []);
        parSource.get(source).push({ im, dansPiece });
        instances.push(im);
        root.add(im);
      });
    }
  };

  // un troncon droit de x0 a x1 : des panneaux de largeur egale, un poteau et un plot a chaque jonction ; les bouts
  // listes dans portails prennent le poteau du portail
  const troncon = (x0, x1, portails = []) => {
    const n = Math.max(1, Math.ceil((x1 - x0) / PANNEAU - 1e-9));
    const w = (x1 - x0) / n;
    for (let i = 0; i <= n; i++) {
      const x = x0 + i * w;
      pose("PLOT", x);
      if (!portails.some((p) => Math.abs(p - x) < 1e-6)) pose("POST", x);
    }
    const mailles = [4, 6, 8].reduce((a, m) =>
      Math.abs(w / m - MAILLE) < Math.abs(w / a - MAILLE) ? m : a,
    );
    for (let i = 0; i < n; i++) {
      const x = x0 + (i + 0.5) * w;
      pose("PANEL_FRAME", x, 0, 0, w / PANNEAU);
      pose("PANEL_LOW", x, 0, 0, w / PANNEAU);
      pose(REMPLISSAGES[mailles], x, 0, 0, w / (mailles * MAILLE));
    }
  };

  const vantaux = []; // { poses (cadre, remplissage), ferme : l'angle du vantail ferme }
  if (!portail) troncon(-longueur / 2, longueur / 2);
  else {
    const cote = (longueur - PORTAIL) / 2;
    const ouverture = cote >= COTE_MIN ? PORTAIL : longueur;
    const g = ouverture / 2;
    if (cote >= COTE_MIN) {
      troncon(-longueur / 2, -g, [-g]);
      troncon(g, longueur / 2, [g]);
    } else for (const x of [-g, g]) pose("PLOT", x);
    // les deux vantaux, gonds sur les poteaux du portail, ouverts vers l'interieur ; un vantail fait 2 m. Ferme, le
    // vantail de gauche s'etend vers +X (0 degre), celui de droite vers -X (180 degres) : ils se rejoignent au milieu
    for (const x of [-g, g]) {
      pose("GATE_POST", x);
      vantaux.push({
        poses: [
          pose("GATE_LEAF_FRAME", x, 0, OUVERT, g / 2),
          pose("GATE_LEAF_INFILL", x, 0, OUVERT, g / 2),
        ].filter(Boolean),
        ferme: x < 0 ? 0 : 180,
      });
    }
  }
  instancie();

  // le portail : f vaut 0 ouvert, 1 ferme ; seules les matrices des vantaux sont reposees
  let f = 0;
  let vers = 0;
  let depart = 0;
  let t = DUREE_PORTAIL;
  const place = new THREE.Matrix4();
  const tourne = (angle, p) =>
    place.compose(
      new THREE.Vector3(...versThree(p.x, 0, 0)),
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, THREE.MathUtils.degToRad(angle), 0),
      ),
      new THREE.Vector3(p.etire, p.source.scale.y, p.source.scale.z),
    );
  const poseVantaux = () => {
    const touchees = new Set();
    for (const v of vantaux) {
      const angle = OUVERT + (v.ferme - OUVERT) * f;
      for (const p of v.poses) {
        tourne(angle, p);
        for (const { im, dansPiece } of parSource.get(p.source) || []) {
          im.setMatrixAt(p.index, place.clone().multiply(dansPiece));
          touchees.add(im);
        }
      }
    }
    for (const im of touchees) {
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
    }
  };

  return {
    root,
    setState(state) {
      if (!meta.states.includes(state))
        throw new Error(`état inconnu : ${state}`);
      const voulu = state === "closed" ? 1 : 0;
      if (!vantaux.length || voulu === vers) return; // sans portail, closed ne change rien
      vers = voulu;
      depart = f;
      t = 0;
      if (ctx.reducedMotion) {
        t = DUREE_PORTAIL;
        f = vers;
        poseVantaux();
      }
    },
    // une rotation douce (lente au depart et a l'arrivee), une fois ; au repos, plus rien a dessiner
    update(dt) {
      if (t >= DUREE_PORTAIL) return false;
      t = Math.min(t + dt, DUREE_PORTAIL);
      const u = t / DUREE_PORTAIL;
      f = depart + (vers - depart) * u * u * (3 - 2 * u);
      poseVantaux();
      return true;
    },
    anchor(name) {
      if (name !== "label") throw new Error(`ancre inconnue : ${name}`);
      return new THREE.Vector3(...versThree(0, 0, HAUT_LABEL)); // au-dessus du portail, ou du milieu
    },
    dispose() {
      root.clear();
      for (const im of instances) im.dispose();
    },
  };
}
