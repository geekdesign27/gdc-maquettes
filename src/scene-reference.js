// La scene de reference (lot G0) : un assemblage de composants livres, sous la camera et la lumiere de la galerie,
// pour juger qu'un nouveau composant appartient au meme monde (bible, sections 8 et 14). Outil de la galerie seulement :
// il n'est pas livre a GDC. Il suit la forme du contrat (root, setState, update, anchor, dispose).
//
// La carte suit le parcours du harnais (decision de Pierre-Alain du 21 octobre 2026, docs/direction-artistique.md) :
// trois quartiers relies par des voies de chantier, comme le plan « Dix etapes » de GDC, et chaque etape se reconnait a
// un lieu ou a un objet de chantier, avec son repere HTML (numero, icone du lot G7, titre ; jamais de texte en 3D).
// 1. Les bureaux (a gauche) : 1 l'idee chez l'architecte, la decision « on continue ? » chez le client, 2 les plans au
//    bureau d'etudes (le geometre y travaille), 3 le permis : les gabarits sur la parcelle et le panneau a l'entree.
// 2. Le chantier cloture (au centre) : 4 les plans d'execution a la baraque du conducteur, puis le feu vert a la fouille ;
//    5 la preparation, le stockage et le camion qui livre ; 6 la construction, la grue, les ouvriers et les bennes ;
//    7 la reception a l'aire de reception, avec le bureau de controle et le batiment en inspection.
// 3. La remise des cles (8) au portail de sortie, puis le batiment habite (a droite) : 9 la garantie, le cone d'un defaut
//    devant le batiment et le concierge ; 10 les transformations, le carnet des demandes (le parking), d'ou un sentier
//    repart vers l'architecte.
// La ville autour (rues, voitures, voisins) est reportee.

export const SCENE_ID = "scene";
const RECUL = 5; // en metres, sur X et Z : la scene descend d'environ 4 m a l'ecran

// Le plan, en coordonnees Three.js (Y vertical ; X vers la droite et le bas de l'ecran, Z vers la gauche et le bas).
const TERRAIN = { x: [-28, 47.5], z: [-20, 44.5] };
const CHANTIER = { x: [0, 46], z: [0, 43] }; // la cloture
const centre = (a) => (a[0] + a[1]) / 2;
const long = (a) => a[1] - a[0];

// Les dalles du terrain de chantier (site-ground, data.zones) : bornes en X et en Z, surface. Le beton couvre ce qui est
// fini ou habite, la terre reste ou l'on construit ; l'enrobe fait le circuit, le sentier ramene a l'architecte.
const DALLES = [
  [[-27, -1], [4, 28.5], "concrete"], // les bureaux, au-dessus de la voie
  [[1, 22], [32.5, 42.5], "concrete"], // la plateforme des baraques
  [[35.5, 40], [15, 24.5], "concrete"], // l'aire des bennes
  [[22, 40], [-19, -4], "concrete"], // les abords du batiment habite
  [[-21, -6], [-5.75, -4.25], "concrete"], // le sentier du retour, du carnet des demandes
  [[-21, -19.5], [-5, 4], "concrete"], // puis vers le bureau de l'architecte
  [[-27, 44], [28.5, 32.5], "asphalt"], // la voie des bureaux, qui entre au chantier et le traverse
  [[40, 44], [-19, 32.5], "asphalt"], // la voie qui sort du chantier et longe le batiment habite
  [[-6, 40], [-4, -0.5], "asphalt"], // la voie du carnet des demandes, le long du chantier
];
const zones = DALLES.map(([x, z, surface]) => ({
  x: centre(x) - centre(TERRAIN.x),
  z: centre(z) - centre(TERRAIN.z),
  width: long(x),
  depth: long(z),
  surface,
}));

// Un cote de cloture, de a a b le long d'un bord ; son interieur (-Z local, site-fence) tourne vers le chantier.
const ROTATION_CLOTURE = {
  "x-": -Math.PI / 2,
  "x+": Math.PI / 2,
  "z-": Math.PI,
  "z+": 0,
};
function cloture(cle, bord, [a, b], gate = false) {
  const fixe = {
    "x-": CHANTIER.x[0],
    "x+": CHANTIER.x[1],
    "z-": CHANTIER.z[0],
    "z+": CHANTIER.z[1],
  }[bord];
  const position =
    bord[0] === "x" ? [fixe, 0, (a + b) / 2] : [(a + b) / 2, 0, fixe];
  return {
    cle,
    id: "site-fence",
    params: { length: b - a, gate },
    position,
    rotation: ROTATION_CLOTURE[bord],
  };
}

// Une personne d'equipe.json a une ancre d'un lieu, dans un etat, tournee vers facing (radians).
const personne = (cle, sur, state = "idle", facing = Math.PI) => ({
  cle,
  id: "character",
  personne: cle,
  sur,
  state,
  data: { facing },
});

// sur : pose le membre a une ancre d'un autre membre ; personne : l'identifiant d'equipe.json d'un personnage.
export const MEMBRES = [
  {
    cle: "site-ground",
    id: "site-ground",
    params: { width: long(TERRAIN.x), depth: long(TERRAIN.z) },
    data: { zones },
    position: [centre(TERRAIN.x), 0, centre(TERRAIN.z)],
  },

  // --- 1. les bureaux, en deux rangs : au fond l'architecte, ou arrive le sentier, puis le client et sa decision ;
  // devant, le bureau d'etudes, au bord de la voie qui mene au chantier
  {
    cle: "architect-office",
    id: "architect-office",
    state: "active",
    position: [-20, 0, 10.5],
  },
  {
    cle: "design-office",
    id: "design-office",
    state: "active",
    params: { desks: 4 },
    position: [-8, 0, 24],
  },
  {
    cle: "client-office",
    id: "client-office",
    state: "waiting",
    position: [-8, 0, 10.5],
  },
  { cle: "decision-sign", id: "decision-sign", position: [-2.5, 0, 12] },
  personne("claire", ["architect-office", "desk:1"], "typing"),
  personne("marc", ["design-office", "desk:1"], "work"),
  personne("lina", ["design-office", "desk:2"], "thinking"),
  personne("client", ["client-office", "desk:1"], "waiting"),
  {
    cle: "selection-ring",
    id: "selection-ring",
    state: "selected",
    params: { radius: 0.7 },
    sur: ["client-office", "desk:1"],
  },

  // --- 2. le chantier : la cloture, une entree a gauche sur la voie, une sortie en haut vers le batiment habite
  cloture("fence:entree", "x-", [19, 43], true),
  cloture("fence:gauche", "x-", [0, 19]),
  cloture("fence:sortie", "z-", [38, 46], true),
  cloture("fence:fond", "z-", [0, 38]),
  cloture("fence:droite", "x+", [0, 43]),
  cloture("fence:avant", "z+", [0, 46]),
  {
    cle: "permit-board",
    id: "permit-board",
    state: "granted",
    position: [2.5, 0, 27],
  },
  // les gabarits du permis, sur la parcelle du prochain batiment, juste apres l'entree
  {
    cle: "survey-poles",
    id: "survey-poles",
    params: { width: 8, depth: 6, height: 6 },
    position: [6, 0, 21],
  },
  // la rangee des batiments en cours, le long de la voie : fouille (feu vert), structure (construction)
  {
    cle: "building:excavation",
    id: "building",
    state: "excavation",
    params: { wings: 1 },
    position: [17, 0, 21],
  },
  {
    cle: "building:structure",
    id: "building",
    state: "structure",
    params: { wings: 1 },
    position: [31, 0, 21],
  },
  {
    cle: "crane",
    id: "crane",
    state: "lifting",
    position: [26.6, 0, 16.6],
    rotation: -Math.PI / 2,
  },
  ...["wood", "metal", "inert", "mixed"].map((content, i) => ({
    cle: `waste-skip:${content}`,
    id: "waste-skip",
    params: { content },
    position: [38, 0, 16.5 + i * 2.2],
  })),
  personne("julie", ["building:structure", "door"], "work", Math.PI),
  // Robin au pied de la structure, a cote de Julie (la porte est la seule ancre au sol du batiment)
  { ...personne("robin", null, "work", Math.PI), position: [32.5, 0, 25.6] },
  // les baraques sous la voie : le conducteur de travaux (plans d'execution) et deux conteneurs groupes
  {
    cle: "site-office",
    id: "site-office",
    state: "active",
    position: [6.5, 0, 35.5],
  },
  { cle: "container:1", id: "site-container", position: [16.6, 0, 35] },
  { cle: "container:2", id: "site-container", position: [16.6, 0, 38.6] },
  personne("yves", ["site-office", "desk:1"], "typing"),
  // la preparation : le stockage, et le camion qui livre sur la voie
  {
    cle: "material-storage",
    id: "material-storage",
    position: [28.5, 0, 37.5],
  },
  {
    cle: "delivery-truck",
    id: "delivery-truck",
    state: "idle",
    position: [33, 0, 30.5],
    rotation: Math.PI / 2,
  },
  // la rangee du haut : le bureau de controle, l'aire de reception, le batiment en inspection face a la voie de sortie
  {
    cle: "control-office",
    id: "control-office",
    state: "active",
    position: [6, 0, 6.5],
  },
  {
    cle: "reception-area",
    id: "reception-area",
    state: "active",
    position: [19, 0, 7.5],
  },
  {
    cle: "building:inspection",
    id: "building",
    state: "inspection",
    params: { wings: 1 },
    position: [31, 0, 7.5],
    rotation: Math.PI / 2,
  },
  personne("helene", ["control-office", "desk:1"], "inspect"),
  personne("anne", ["reception-area", "desk:1"], "inspect"),

  // --- 3. le batiment habite, face a la voie ; le cone d'un defaut sous garantie ; le carnet des demandes
  {
    cle: "building:completed",
    id: "building",
    state: "completed",
    position: [31, 0, -10],
    rotation: Math.PI / 2,
  },
  { cle: "defect-sign", id: "defect-sign", position: [38.6, 0, -6] },
  personne("bernard", ["building:completed", "door"], "idle", Math.PI / 2),
  { cle: "parking", id: "parking", position: [-2, 0, -8] },
];

// Les reperes : un par etape, plus les passages ou le client decide. Chacun est pose sur une ancre d'un membre, ou a une
// position du plan ; icone : une icone du lot G7 (step-icons), absente quand aucune ne dit l'etape.
export const REPERES = {
  "etape:1": {
    numero: 1,
    titre: "L’idée",
    icone: "idea",
    sur: ["architect-office", "label"],
  },
  "passage:continue": {
    titre: "On continue ?",
    passage: true,
    sur: ["client-office", "badge"],
  },
  "etape:2": {
    numero: 2,
    titre: "Les plans",
    icone: "plans",
    sur: ["design-office", "label"],
  },
  "etape:3": {
    numero: 3,
    titre: "Le permis",
    icone: "permit",
    passage: true,
    sur: ["survey-poles", "label"],
  },
  "etape:4": {
    numero: 4,
    titre: "Plans d’exécution",
    icone: "execution-plans",
    sur: ["site-office", "label"],
  },
  "passage:feu-vert": {
    titre: "Feu vert",
    icone: "green-light",
    passage: true,
    sur: ["building:excavation", "label"],
  },
  "etape:5": {
    numero: 5,
    titre: "Préparation",
    sur: ["material-storage", "label"],
  },
  "etape:6": {
    numero: 6,
    titre: "Construction",
    icone: "construction",
    sur: ["building:structure", "label"],
  },
  "etape:7": {
    numero: 7,
    titre: "Réception",
    icone: "reception",
    passage: true,
    sur: ["reception-area", "label"],
  },
  "etape:8": {
    numero: 8,
    titre: "Remise des clés",
    icone: "production",
    passage: true,
    position: [42, 3, 0],
  },
  "etape:9": {
    numero: 9,
    titre: "Garantie",
    sur: ["building:completed", "label"],
  },
  "etape:10": {
    numero: 10,
    titre: "Transformations",
    icone: "transformations",
    sur: ["parking", "label"],
  },
};

export const meta = {
  id: SCENE_ID,
  states: ["default"],
  anchors: Object.keys(REPERES),
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
  // un point d'une ancre d'un membre, dans le repere du plateau
  const point = ([cle, ancre]) => {
    const hote = parCle[cle].inst;
    hote.root.updateMatrix();
    return hote.anchor(ancre).clone().applyMatrix4(hote.root.matrix);
  };
  for (const { m, inst } of Object.values(parCle))
    if (m.sur) inst.root.position.copy(point(m.sur));
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
    // un repere : l'ancre de son membre, ou sa position du plan, dans le repere de la scene
    anchor(nom) {
      const r = REPERES[nom];
      if (!r) throw new Error(`ancre inconnue : ${nom}`);
      plateau.updateMatrix();
      const p = r.sur ? point(r.sur) : new THREE.Vector3(...r.position);
      return p.applyMatrix4(plateau.matrix);
    },
    dispose() {
      for (const inst of instances) inst.dispose();
    },
  };
}
