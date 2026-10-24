// La voiture d'ambiance : une flotte de petites citadines qui font vivre la ville autour du chantier, sans rien dire du
// harnais (catalogue : city-car, lot G8 ; flotte du lot G9). Interface decidee par Pierre-Alain le 24 octobre 2026 : un
// seul composant est toute la flotte, de 1 a 6 voitures (2 au plus en qualite basse) ; l'assemblage (city-traffic) pose
// chaque voiture par data.cars et allume leurs lueurs par data.lights. Brief valide le meme jour.
// Production blender : les pieces du GLB (blender/assets/city-car.py) sont repetees ici par instance, une par voiture :
// une InstancedMesh par piece (caisse peinte, vitres, garnitures, roues) et une pour les disques de contact et les
// lueurs, soit 5 appels de dessin pour toute la flotte. La teinte de chaque voiture (a, b, c : les trois teintes de ville
// de la palette, celles des tenues civiles) est une couleur d'instance sur une peinture satinee faite ici.
// Aucune ombre portee reelle (aucun appel dans la passe d'ombre) : un disque de contact sous chaque voiture, noir a
// l'opacite de src/lumiere.json (ctx.tokens.lumiere.voitures). La nuit, deux lueurs blanc chaud devant les phares, sans
// vraie lumiere ; rien ne clignote. Ni orange ni jaune, pas de feu rouge, aucune ancre : on ne la designe pas.
// driving : les roues des voitures moving tournent (environ 30 km/h) ; parked et reducedMotion : tout est immobile.
// Le modele est partage : ses geometries et ses materiaux ne sont jamais liberes ici ; les InstancedMesh, la peinture,
// le materiau et les geometries du disque, crees ici, le sont.

const MODELE = "VEH_CITY_CAR_A_v001.glb";
const P = "VEH_CITY_CAR_A_";
const MAX = { high: 6, low: 2 };
const ECART = 2.4; // m entre deux voitures garees en file, sans data.cars
const VITESSE = 30 / 3.6; // m/s : la vitesse de la ville (city-traffic)
const ROUES = ["FL", "FR", "RL", "RR"];
const TEINTES = { a: "civil_a", b: "civil_b", c: "civil_c" };
const DISQUE = {
  demiLargeur: 1.05,
  demiLongueur: 2.05,
  sol: 0.03,
  anneaux: 3,
  cotes: 20,
};
const LUEUR = { largeur: 0.34, hauteur: 0.2 };
const PEINTURE = { rugosite: 0.55 }; // satinee, comme le metal peint de la palette

export const meta = {
  id: "city-car",
  version: "1.0.0",
  category: "machine",
  states: ["parked", "driving"],
  params: {
    count: { type: "number", default: 1, min: 1, max: 6 },
    color: { type: "enum", values: ["a", "b", "c"], default: "a" },
  },
  anchors: [],
  budget: { triangles: 7200, materials: 5 },
  animated: true,
  assets: [MODELE],
};

export function create(THREE, params, ctx) {
  const modele = ctx.assets[MODELE].scene;
  const root = new THREE.Group();
  root.name = "city-car";
  root.userData.component = meta.id;
  const basse = ctx.quality === "low";
  const voulu = Math.round(Number(params.count) || meta.params.count.default);
  const n = Math.min(
    Math.max(voulu, meta.params.count.min),
    basse ? MAX.low : MAX.high,
  );
  const teinte0 = TEINTES[params.color]
    ? params.color
    : meta.params.color.default;
  modele.updateMatrixWorld(true);
  const piece = (nom) => {
    const o =
      (basse && modele.getObjectByName(P + nom + "_LOW")) ||
      modele.getObjectByName(P + nom);
    if (!o || !o.isMesh) throw new Error(`pièce absente du modèle : ${nom}`);
    return o;
  };
  const point = (nom) => {
    const o = modele.getObjectByName(P + nom);
    if (!o) throw new Error(`point absent du modèle : ${nom}`);
    return new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);
  };
  const roues = ROUES.map((r) => point("WHEEL_" + r));
  const rayon = roues[0].y;
  const couleurs = Object.fromEntries(
    Object.entries(TEINTES).map(([k, cle]) => [
      k,
      new THREE.Color(ctx.tokens.personnages[cle]),
    ]),
  );

  // --- les InstancedMesh de la flotte
  const crees = [];
  const instancie = (geometrie, materiau, nombre, nom) => {
    const im = new THREE.InstancedMesh(geometrie, materiau, nombre);
    im.name = nom;
    im.castShadow = false; // aucune ombre portee reelle : le disque de contact la remplace
    im.receiveShadow = !basse;
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    crees.push(im);
    root.add(im);
    return im;
  };
  const peinture = new THREE.MeshStandardMaterial({
    name: "CITY_CAR_PAINT",
    roughness: PEINTURE.rugosite,
    metalness: 0,
  });
  const caisse = piece("BODY");
  const corps = instancie(caisse.geometry, peinture, n, P + "BODY");
  const vitres = instancie(
    piece("GLASS").geometry,
    piece("GLASS").material,
    n,
    P + "GLASS",
  );
  const garnitures = instancie(
    piece("TRIM").geometry,
    piece("TRIM").material,
    n,
    P + "TRIM",
  );
  const roue = piece("WHEEL");
  const pneus = instancie(roue.geometry, roue.material, 4 * n, P + "WHEELS");

  // le disque de contact : une ellipse douce sous la voiture (noir, l'opacite de chaque sommet en couleur) ; la nuit, la
  // meme geometrie porte en plus les deux lueurs devant les phares (un seul appel de dessin dans les deux cas)
  const lampes = ["L", "R"].map((c) => point("LAMP_" + c));
  const geometrieDisque = (avecLueurs) => {
    const pos = [0, DISQUE.sol, 0];
    const col = [0, 0, 0, 1];
    for (let a = 1; a <= DISQUE.anneaux; a++) {
      const r = a / DISQUE.anneaux;
      const alpha = Math.pow(1 - r * r, 1.5);
      for (let k = 0; k < DISQUE.cotes; k++) {
        const t = (k / DISQUE.cotes) * Math.PI * 2;
        pos.push(
          Math.cos(t) * r * DISQUE.demiLargeur,
          DISQUE.sol,
          Math.sin(t) * r * DISQUE.demiLongueur,
        );
        col.push(0, 0, 0, alpha);
      }
    }
    const idx = [];
    const sommet = (a, k) => 1 + (a - 1) * DISQUE.cotes + (k % DISQUE.cotes);
    for (let k = 0; k < DISQUE.cotes; k++)
      idx.push(0, sommet(1, k + 1), sommet(1, k));
    for (let a = 1; a < DISQUE.anneaux; a++)
      for (let k = 0; k < DISQUE.cotes; k++)
        idx.push(
          sommet(a, k),
          sommet(a, k + 1),
          sommet(a + 1, k),
          sommet(a, k + 1),
          sommet(a + 1, k + 1),
          sommet(a + 1, k),
        );
    if (avecLueurs) {
      // un petit rectangle blanc chaud, debout devant chaque phare, tourne vers l'avant (+Z)
      const chaud = new THREE.Color(ctx.tokens.lumiere.voitures.lueur);
      for (const l of lampes) {
        const b = pos.length / 3;
        const w = LUEUR.largeur / 2;
        const h = LUEUR.hauteur / 2;
        for (const [dx, dy] of [
          [-w, -h],
          [w, -h],
          [w, h],
          [-w, h],
        ]) {
          pos.push(l.x + dx, l.y + dy, l.z);
          col.push(chaud.r, chaud.g, chaud.b, 1);
        }
        idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 4));
    g.setIndex(idx);
    return g;
  };
  const disqueJour = geometrieDisque(false);
  const disqueNuit = geometrieDisque(true);
  const ombre = new THREE.MeshBasicMaterial({
    name: "CITY_CAR_CONTACT",
    vertexColors: true,
    transparent: true,
    opacity: 1,
    depthWrite: false,
  });
  // l'opacite du noir vient de lumiere.json ; les lueurs, opaques, gardent la leur : le noir est attenue par sommet
  for (const g of [disqueJour, disqueNuit]) {
    const c = g.attributes.color;
    for (let i = 0; i < c.count; i++)
      if (c.getX(i) === 0)
        c.setW(i, c.getW(i) * ctx.tokens.lumiere.voitures.contact);
  }
  const disques = instancie(disqueJour, ombre, n, P + "CONTACT");
  disques.receiveShadow = false;
  disques.renderOrder = 1;

  // --- la flotte : la place de chaque voiture, puis ses pieces
  let etat = "parked";
  let voitures = [];
  let angle = 0; // la rotation des roues qui tournent
  const m = new THREE.Matrix4();
  const place = new THREE.Matrix4();
  const tourne = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const axeY = new THREE.Vector3(0, 1, 0);
  const un = new THREE.Vector3(1, 1, 1);
  const enFile = () =>
    Array.from({ length: n }, (_, k) => ({
      x: (k - (n - 1) / 2) * ECART,
      z: 0,
      heading: 0,
      color: "abc"[("abc".indexOf(teinte0) + k) % 3],
      moving: true,
    }));
  const roulent = (v) =>
    etat === "driving" && !ctx.reducedMotion && v.moving !== false;
  const poseRoues = () => {
    voitures.forEach((v, i) => {
      place.compose(
        new THREE.Vector3(v.x, 0, v.z),
        q.setFromAxisAngle(axeY, v.heading),
        un,
      );
      tourne.makeRotationX(roulent(v) ? angle : 0);
      roues.forEach((p, k) => {
        m.copy(place)
          .multiply(new THREE.Matrix4().makeTranslation(p.x, p.y, p.z))
          .multiply(tourne);
        pneus.setMatrixAt(4 * i + k, m);
      });
    });
    pneus.count = 4 * voitures.length;
    pneus.instanceMatrix.needsUpdate = true;
    pneus.computeBoundingSphere();
  };
  const pose = () => {
    voitures.forEach((v, i) => {
      place.compose(
        new THREE.Vector3(v.x, 0, v.z),
        q.setFromAxisAngle(axeY, v.heading),
        un,
      );
      for (const im of [corps, vitres, garnitures, disques])
        im.setMatrixAt(i, place);
      corps.setColorAt(i, couleurs[TEINTES[v.color] ? v.color : teinte0]);
    });
    for (const im of [corps, vitres, garnitures, disques]) {
      im.count = voitures.length;
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
    }
    if (corps.instanceColor) corps.instanceColor.needsUpdate = true;
    poseRoues();
  };

  voitures = enFile(); // avant le premier setState : garees en file
  pose();

  return {
    root,
    setState(state, data = {}) {
      if (!meta.states.includes(state))
        throw new Error(`état inconnu : ${state}`);
      etat = state;
      // data.cars : les voitures posees par l'assemblage ; au-dela du plafond, elles sont ignorees, et une voiture
      // absente de la liste est cachee. Sans data.cars, les voitures deja posees restent (en file a la premiere fois)
      if (Array.isArray(data.cars))
        voitures = data.cars.slice(0, n).map((v) => ({
          x: Number(v.x) || 0,
          z: Number(v.z) || 0,
          heading: Number(v.heading) || 0,
          color: v.color,
          moving: v.moving !== false,
        }));
      else if (!voitures.length) voitures = enFile();
      // data.lights : un booleen (la galerie passe les donnees de l'adresse en texte)
      if (data.lights !== undefined)
        disques.geometry = data.lights === true || data.lights === "true" ? disqueNuit : disqueJour;
      pose();
    },
    update(dt) {
      if (!voitures.some(roulent)) return false;
      angle = (angle + (dt * VITESSE) / rayon) % (Math.PI * 2);
      poseRoues();
      return true;
    },
    anchor(name) {
      throw new Error(`ancre inconnue : ${name}`);
    },
    dispose() {
      root.clear();
      for (const im of crees) im.dispose();
      disqueJour.dispose();
      disqueNuit.dispose();
      peinture.dispose();
      ombre.dispose();
    },
  };
}
