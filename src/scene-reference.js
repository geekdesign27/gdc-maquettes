// La scene de reference (lot G0) : un assemblage de composants livres, sous la camera et la lumiere de la galerie,
// pour juger qu'un nouveau composant appartient au meme monde (bible, sections 8 et 14). Choix de Pierre-Alain du
// 21 octobre 2026 : le batiment en fouille, structure, second oeuvre et termine, la baraque du conducteur de travaux, la
// grue, le panneau du permis, le personnage maitre selectionne, sur le terrain. Outil de la galerie seulement : il n'est
// pas livre a GDC. Il suit la forme du contrat (root, setState, update, anchor, dispose).

export const SCENE_ID = "scene";
const PAS_BATIMENT = 13.5; // socle du batiment de 12 m de profondeur, et 1,50 m entre deux socles
const SOCLE = 0.6;
const RECUL = 5; // en metres, sur X et Z : la scene descend d'environ 4 m a l'ecran // epaisseur des socles maquette (bible 18.5) : le terrain se pose dessous

// Les membres de la scene, en coordonnees Three.js (Y vertical). La rue des batiments monte de gauche a droite de
// l'ecran (le long de -Z), dans l'ordre du chantier. sur : pose le membre a une ancre d'un autre membre.
// ancre : l'etiquette que la galerie affiche pour ce membre (une de ses propres ancres).
export const MEMBRES = [
  {
    cle: "ground",
    id: "ground",
    params: { width: 30, depth: 56 },
    position: [6, -SOCLE, 0],
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
  // le permis de construire au coin avant du socle en fouille, face a la camera
  {
    cle: "permit-board",
    id: "permit-board",
    state: "granted",
    position: [5.6, 0, 25.1],
    ancre: "badge",
  },
  // la baraque devant le milieu de la rue, la ou le conducteur de travaux voit tout le chantier
  {
    cle: "site-office",
    id: "site-office",
    state: "idle",
    position: [14, 0, -1.7],
    ancre: "label",
  },
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
    inst.root.position.copy(hote.anchor(ancre).clone().applyMatrix4(hote.root.matrix));
  }
  // recentrer sur le terrain, qui couvre tous les socles (une boite englobante compterait aussi les os des personnages)
  // et l'avancer vers la camera de RECUL : les batiments et la grue montent haut, le cadre descend d'autant
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
        .anchor(x.m.ancre).clone()
        .applyMatrix4(x.inst.root.matrix)
        .applyMatrix4(plateau.matrix);
    },
    dispose() {
      for (const inst of instances) inst.dispose();
    },
  };
}
