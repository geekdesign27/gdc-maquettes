// Les gabarits : une fiche a l'etude, son volume futur montre comme pendant la mise a l'enquete (catalogue :
// survey-poles). Production code, brief valide par Pierre-Alain le 20 octobre 2026 : quatre perches en bois aux angles
// du volume, un ruban corail en haut qui en dessine le contour (la couleur de la structure a venir), deux contrefiches
// et un plot de beton au pied de chaque perche. Pose par GDC sur la parcelle du batiment, sans socle.
// Qualite basse (bible 18.3) : perches et rubans restent, sinon le gabarit disparait (comme les barreaux de la
// cloture) ; contrefiches et plots sont retires. Aucune couleur d'etat ; aucun texte.

export const meta = {
  id: "survey-poles",
  version: "1.0.0",
  category: "building",
  states: ["default"],
  params: {
    width: { type: "number", default: 8, min: 2, max: 30 },
    depth: { type: "number", default: 6, min: 2, max: 30 },
    height: { type: "number", default: 6, min: 2, max: 20 },
  },
  anchors: ["label", "badge"],
  budget: { triangles: 1000, materials: 3 },
  animated: false,
};

const PERCHE = 0.08; // section d'une perche : au-dessus du minimum filiforme (bible 18.3)
const RUBAN = [0.12, 0.02]; // hauteur et epaisseur du ruban
const CONTREFICHE = { section: 0.06, haut: 1.2, recul: 0.9 }; // attache sur la perche, pied au sol
const PLOT = [0.3, 0.15]; // cote et hauteur du plot de beton

const borne = (v, p) =>
  Math.min(Math.max(Number(v) || p.default, p.min), p.max);

export function create(THREE, params, ctx) {
  const root = new THREE.Group();
  root.name = "survey-poles";
  root.userData.component = meta.id;
  const basse = ctx.quality === "low";
  const l = borne(params.width, meta.params.width);
  const p = borne(params.depth, meta.params.depth);
  const h = borne(params.height, meta.params.height);

  const materiau = (nom) => {
    const m = ctx.tokens.materiaux[nom];
    return new THREE.MeshStandardMaterial({
      name: nom,
      color: new THREE.Color(ctx.tokens.monde[m.couleur]),
      roughness: m.rugosite,
      metalness: m.metal,
    });
  };
  const bois = materiau("MAT_WOOD");
  const corail = materiau("MAT_BRICK");
  const beton = materiau("MAT_CONCRETE");
  const cube = new THREE.BoxGeometry(1, 1, 1); // une geometrie pour toutes les pieces, mise a l'echelle

  // un pave pose par le centre de sa base (Three.js : Y vertical, avant vers +Z)
  const pave = (taille, [x, y, z], mat) => {
    const m = new THREE.Mesh(cube, mat);
    m.scale.set(...taille);
    m.position.set(x, y + taille[1] / 2, z);
    m.castShadow = m.receiveShadow = !basse;
    root.add(m);
    return m;
  };

  const coins = [
    [-l / 2, -p / 2],
    [l / 2, -p / 2],
    [l / 2, p / 2],
    [-l / 2, p / 2],
  ];
  for (const [x, z] of coins) {
    pave([PERCHE, h, PERCHE], [x, 0, z], bois);
    if (basse) continue;
    pave([PLOT[0], PLOT[1], PLOT[0]], [x, 0, z], beton);
    // deux contrefiches, vers l'exterieur, le long de chaque face
    const longueur = Math.hypot(CONTREFICHE.haut, CONTREFICHE.recul);
    const angle = Math.atan2(CONTREFICHE.recul, CONTREFICHE.haut);
    const [sx, sz] = [Math.sign(x), Math.sign(z)];
    const milieu = CONTREFICHE.recul / 2;
    const section = CONTREFICHE.section;
    const centreY = CONTREFICHE.haut / 2;
    // la contrefiche part de la perche a 1,20 m et touche le sol a 0,90 m vers l'exterieur
    for (const [dx, dz, rot] of [
      [sx * milieu, 0, [0, 0, sx * angle]],
      [0, sz * milieu, [-sz * angle, 0, 0]],
    ]) {
      const m = new THREE.Mesh(cube, bois);
      m.scale.set(section, longueur, section);
      m.rotation.set(...rot);
      m.position.set(x + dx, centreY, z + dz);
      m.castShadow = m.receiveShadow = !basse;
      root.add(m);
    }
  }
  // le ruban du haut, d'une perche a l'autre, sur les quatre faces
  const y = h - RUBAN[0];
  pave([l, RUBAN[0], RUBAN[1]], [0, y, -p / 2], corail);
  pave([l, RUBAN[0], RUBAN[1]], [0, y, p / 2], corail);
  pave([RUBAN[1], RUBAN[0], p], [-l / 2, y, 0], corail);
  pave([RUBAN[1], RUBAN[0], p], [l / 2, y, 0], corail);

  const ancres = {
    label: [0, h + 1.2, 0],
    badge: [l / 2, h + 0.5, p / 2],
  };

  return {
    root,
    setState(next) {
      if (!meta.states.includes(next))
        throw new Error(`état inconnu : ${next}`);
    },
    update() {
      return false;
    },
    anchor(name) {
      const a = ancres[name];
      if (!a) throw new Error(`ancre inconnue : ${name}`);
      return new THREE.Vector3(...a);
    },
    dispose() {
      root.clear();
      cube.dispose();
      for (const m of [bois, corail, beton]) m.dispose();
    },
  };
}
