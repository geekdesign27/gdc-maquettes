// La scene de reference (lot G0) : un assemblage de composants livres, sous la camera et la lumiere de la galerie,
// pour juger qu'un nouveau composant appartient au meme monde (bible, sections 8 et 14). Outil de la galerie seulement :
// il n'est pas livre a GDC. Il suit la forme du contrat (root, setState, update, anchor, dispose).
// Choix de Pierre-Alain du 21 octobre 2026 : un chantier cloture, comme un vrai. La terre partout, le beton qui gagne
// avec l'avancement, une voie d'acces depuis le portail ; le batiment en fouille, structure, second oeuvre et termine, la
// grue, la baraque du conducteur de travaux et ses conteneurs groupes, les bennes de tri, le stockage de materiaux, le
// camion qui livre, le permis a l'entree, le personnage maitre selectionne.

export const SCENE_ID = "scene";
const PAS_BATIMENT = 13.5; // socle du batiment de 12 m de profondeur, et 1,50 m entre deux socles
const RECUL = 5; // en metres, sur X et Z : la scene descend d'environ 4 m a l'ecran

// Le plan, en coordonnees Three.js (Y vertical, X vers la droite et le bas de l'ecran, Z vers la gauche et le bas).
// La rue des batiments monte de gauche a droite de l'ecran (le long de -Z), dans l'ordre du chantier ; la voie longe
// la rue cote camera ; au-dela, les installations de chantier : baraques au-dessus de l'entree, stockage et bennes
// en dessous. La cloture fait le tour, le portail au milieu du cote droit.
const TERRAIN = { x: [-10.5, 30], z: [-29, 29] };
const CLOTURE = { x: [-9.5, 29], z: [-28, 28] };
const centre = (a) => (a[0] + a[1]) / 2;
const long = (a) => a[1] - a[0];

// les dalles, de la plus avancee a la voie : bornes en X et en Z, surface (site-ground, data.zones)
const DALLES = [
  [[-9.5, 9], [-27.5, -13.5], "concrete"], // autour du batiment termine, et dessous
  [[0, 9], [-13, -0.5], "concrete"], // la moitie du second oeuvre, cote voie
  [[15.5, 28.5], [4, 27.5], "concrete"], // la plateforme des baraques
  [[18.5, 24.5], [-22, -12.5], "concrete"], // l'aire des bennes
  [[9, 14], [-27.5, 27.5], "asphalt"], // la voie le long des batiments
  [[14, 29.5], [-2.5, 2.5], "asphalt"], // l'entree, du portail a la voie
];
const zones = DALLES.map(([x, z, surface]) => ({
  x: centre(x) - centre(TERRAIN.x),
  z: centre(z) - centre(TERRAIN.z),
  width: long(x),
  depth: long(z),
  surface,
}));

// sur : pose le membre a une ancre d'un autre membre ; ancre : l'etiquette que la galerie affiche (une de ses ancres).
export const MEMBRES = [
  {
    cle: "site-ground",
    id: "site-ground",
    params: { width: long(TERRAIN.x), depth: long(TERRAIN.z) },
    data: { zones },
    position: [centre(TERRAIN.x), 0, centre(TERRAIN.z)],
  },
  ...["excavation", "structure", "finishing", "completed"].map((etat, i) => ({
    cle: `building:${etat}`,
    id: "building",
    state: etat,
    position: [0, 0, (1.5 - i) * PAS_BATIMENT],
    ancre: "label",
  })),
  // la grue sur le socle du batiment en structure, a cote du batiment, fleche vers l'avant ; sans etiquette, qui
  // tomberait sur celle du batiment en second oeuvre
  {
    cle: "crane",
    id: "crane",
    state: "idle",
    position: [5.8, 0, 3.4],
    rotation: -Math.PI / 2,
  },
  // la cloture : quatre cotes, le portail au milieu du cote droit, face a l'entree ; l'interieur d'un cote est son -Z
  // local (site-fence), tourne vers le chantier
  {
    cle: "fence:back",
    id: "site-fence",
    params: { length: long(CLOTURE.x) },
    position: [centre(CLOTURE.x), 0, CLOTURE.z[0]],
    rotation: Math.PI,
  },
  {
    cle: "fence:front",
    id: "site-fence",
    params: { length: long(CLOTURE.x) },
    position: [centre(CLOTURE.x), 0, CLOTURE.z[1]],
  },
  {
    cle: "fence:left",
    id: "site-fence",
    params: { length: long(CLOTURE.z) },
    position: [CLOTURE.x[0], 0, centre(CLOTURE.z)],
    rotation: -Math.PI / 2,
  },
  {
    cle: "fence:gate",
    id: "site-fence",
    params: { length: long(CLOTURE.z), gate: true },
    position: [CLOTURE.x[1], 0, centre(CLOTURE.z)],
    rotation: Math.PI / 2,
  },
  // le permis de construire a l'entree, face a la camera
  {
    cle: "permit-board",
    id: "permit-board",
    state: "granted",
    position: [27, 0, 3.6],
    ancre: "badge",
  },
  // les installations : la baraque au-dessus de l'entree, deux conteneurs groupes contre elle, long pan contre long pan
  {
    cle: "site-office",
    id: "site-office",
    state: "idle",
    position: [20.5, 0, 8.5],
    ancre: "label",
  },
  { cle: "container:1", id: "site-container", position: [21.5, 0, 17.6] },
  { cle: "container:2", id: "site-container", position: [21.5, 0, 21.2] },
  // le personnage maitre devant la baraque, selectionne : l'anneau a ses pieds
  {
    cle: "character",
    id: "character",
    state: "idle",
    sur: ["site-office", "crew:2"],
    ancre: "label",
  },
  {
    cle: "selection-ring",
    id: "selection-ring",
    state: "selected",
    params: { radius: 0.7 },
    sur: ["site-office", "crew:2"],
  },
  // sous l'entree : le stockage pres de la voie, les bennes groupees sur leur aire, le camion qui livre sur la voie
  {
    cle: "material-storage",
    id: "material-storage",
    position: [21.5, 0, -7.5],
    ancre: "label",
  },
  ...["wood", "metal", "inert", "mixed"].map((content, i) => ({
    cle: `waste-skip:${content}`,
    id: "waste-skip",
    params: { content },
    position: [21.5, 0, -14 - i * 2.2],
  })),
  {
    cle: "delivery-truck",
    id: "delivery-truck",
    state: "idle",
    position: [11.5, 0, -10],
    rotation: Math.PI,
  },
];

export const meta = {
  id: SCENE_ID,
  states: ["default"],
  anchors: MEMBRES.filter((m) => m.ancre).map((m) => m.cle),
  budget: { triangles: 0, materials: 0 },
};

// instances : une instance de composant par membre, dans l'ordre de MEMBRES, deja dans son etat. Elles sont posees ici,
// puis le plateau est recentre sur l'origine (la cible de la camera). Le premier membre est le terrain.
export function create(THREE, instances) {
  const root = new THREE.Group();
  root.name = "scene-reference";
  const plateau = new THREE.Group();
  root.add(plateau);
  const parCle = {};
  MEMBRES.forEach((m, i) => {
    const inst = instances[i];
    parCle[m.cle] = { m, inst };
    if (m.position) inst.root.position.set(...m.position);
    if (m.rotation) inst.root.rotation.y = m.rotation;
    plateau.add(inst.root);
  });
  for (const { m, inst } of Object.values(parCle)) {
    if (!m.sur) continue;
    const [cle, ancre] = m.sur;
    const hote = parCle[cle].inst;
    hote.root.updateMatrix();
    inst.root.position.copy(
      hote.anchor(ancre).clone().applyMatrix4(hote.root.matrix),
    );
  }
  // recentrer sur le terrain, qui couvre tout (une boite englobante compterait aussi les os des personnages), et
  // l'avancer vers la camera de RECUL : les batiments et la grue montent haut, le cadre descend d'autant
  const [tx, , tz] = MEMBRES[0].position;
  plateau.position.set(RECUL - tx, 0, RECUL - tz);

  return {
    root,
    instances,
    setState() {},
    update(dt) {
      let encore = false;
      for (const inst of instances) encore = inst.update(dt) || encore;
      return encore;
    },
    // l'etiquette d'un membre : son ancre, ramenee dans le repere de la scene
    anchor(nom) {
      const x = parCle[nom];
      if (!x || !x.m.ancre) throw new Error(`ancre inconnue : ${nom}`);
      x.inst.root.updateMatrix();
      plateau.updateMatrix();
      return x.inst
        .anchor(x.m.ancre)
        .clone()
        .applyMatrix4(x.inst.root.matrix)
        .applyMatrix4(plateau.matrix);
    },
    dispose() {
      for (const inst of instances) inst.dispose();
    },
  };
}
