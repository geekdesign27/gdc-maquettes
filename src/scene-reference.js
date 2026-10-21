// La scene de reference (lot G0) : un assemblage de composants livres, sous la camera et la lumiere de la galerie,
// pour juger qu'un nouveau composant appartient au meme monde (bible, sections 8 et 14). Outil de la galerie seulement :
// il n'est pas livre a GDC. Il suit la forme du contrat (root, setState, update, anchor, dispose).
//
// La carte suit le parcours du harnais (decisions de Pierre-Alain du 21 octobre 2026, docs/ville.md). Quatre zones autour
// d'un carrefour, que l'on parcourt dans l'ordre : les bureaux (a gauche de l'ecran), le chantier (en bas), la reception,
// la remise des cles et la garantie (a droite), les transformations (en haut), d'ou la route ramene a l'architecte.
// Les lieux des etapes sont fixes et toujours visibles :
// - 1 l'idee chez l'architecte, la decision « on continue ? » chez le client, 2 les plans au bureau d'etudes, 3 le
//   panneau du permis, sur le passage du bureau d'etudes vers le chantier ;
// - 4 les plans d'execution, dans les conteneurs des experts (la baraque du conducteur, le bureau de controle), puis le
//   panneau du feu vert ;
// - 7 la reception (l'aire de reception), 8 la remise des cles et 9 la garantie (deux conteneurs), cote a cote ;
// - 10 les transformations (un conteneur), a cote du carnet des demandes.
// Un batiment par application du projet (?applications=1 a 4) ; la scene se dimensionne en consequence. Le batiment vit
// les etapes 3, 5 et 6 : les gabarits quand le permis est accorde, le terrassement puis les fondations, la structure et
// ses echafaudages avec la grue jusqu'au batiment termine. Les etats de la scene sont ces phases ; sa pastille dit
// l'etape. La bordure de chaque zone est peinte au sol dans un materiau d'equipe ; les pastilles et les noms de zone sont
// de l'interface, dessines par la galerie. Aucune couleur d'etat dans la 3D. La ville autour (rues, voitures, voisins)
// est reportee.
// L'implantation (zones, lieux fixes, parcelles, clotures, voies) est celle de la carte vivante, livree a GDC
// (src/ville/implantation.js) : la scene de reference la lit au lieu de la repeter.
import { materiauPalette } from "./etalon.js";
import { ETAPES, ZONES, BORDURE, implantation } from "./ville/implantation.js";

export { ETAPES, ZONES };
export const SCENE_ID = "scene";
const RECUL = 2; // en metres, sur X et Z : la scene descend d'environ 1,6 m a l'ecran

// Les phases d'un batiment, dans l'ordre : son etat (building), l'etape que dit sa pastille, et ce qui l'entoure
// (gabarits, grue, ouvriers).
const PHASES = {
  permit: { batiment: "plot", etape: 3, gabarits: true },
  excavation: { batiment: "excavation", etape: 5, ouvriers: true },
  foundations: { batiment: "foundations", etape: 5, ouvriers: true },
  structure: { batiment: "structure", etape: 6, grue: true, ouvriers: true },
  envelope: { batiment: "envelope", etape: 6, grue: true, ouvriers: true },
  finishing: { batiment: "finishing", etape: 6, ouvriers: true },
  inspection: { batiment: "inspection", etape: 7 },
  completed: { batiment: "completed", etape: 9 },
};
export const PHASE_DEFAUT = "structure";
// les applications suivantes, pour l'exemple a plusieurs batiments : chacune a une autre phase
const PHASES_AUTRES = ["completed", "foundations", "permit"];

const centre = (a) => (a[0] + a[1]) / 2;
const long = (a) => a[1] - a[0];

// Une personne d'equipe.json a une ancre d'un lieu, dans un etat, tournee vers facing (radians).
const personne = (cle, sur, state = "idle", facing = Math.PI) => ({
  cle,
  id: "character",
  personne: cle,
  sur,
  state,
  data: { facing },
});

// Des projets d'exemple : un projet nomme ses applications, un batiment chacune (?applications=auditapp).
export const PROJETS = {
  auditapp: ["Webapp desktop", "Application terrain", "Webapp administration"],
};

// Le plan pour un nombre d'applications (1 a 4) ou un projet de PROJETS : les membres (un composant chacun), les
// reperes, les zones, et meta. Le nom d'une application s'affiche au survol de la pastille de son batiment.
export function plan(applications = 1) {
  const noms = PROJETS[String(applications).toLowerCase()] || [];
  const imp = implantation(noms.length || applications);
  const { apps, lieux } = imp;
  const CADRES = imp.cadres;
  const TERRAIN = imp.terrain;
  const lieu = (id, extra = {}) => ({
    id: lieux[id].element,
    position: lieux[id].position,
    ...(lieux[id].params ? { params: lieux[id].params } : {}),
    ...extra,
  });

  const batiments = [];
  for (const p of imp.parcelles) {
    const k = p.index;
    const [x] = p.position;
    batiments.push(
      {
        cle: `building:${k + 1}`,
        id: "building",
        app: k,
        params: { wings: 1 },
        position: p.position,
        ancre: "label",
      },
      {
        cle: `survey-poles:${k + 1}`,
        id: "survey-poles",
        app: k,
        quand: "gabarits",
        params: { width: 8, depth: 6, height: 6 },
        position: p.position,
      },
      {
        cle: `crane:${k + 1}`,
        id: "crane",
        app: k,
        quand: "grue",
        state: "lifting",
        position: p.grue.position,
        rotation: p.grue.rotation,
      },
      {
        ...personne(`julie:${k + 1}`, null, "work"),
        personne: "julie",
        app: k,
        quand: "ouvriers",
        position: [x - 1.5, 0, 43.6],
      },
      {
        ...personne(`robin:${k + 1}`, null, "work"),
        personne: "robin",
        app: k,
        quand: "ouvriers",
        position: [x + 1.5, 0, 43.8],
      },
    );
  }
  const [clotureEntree, ...clotures] = imp.clotures;

  const membres = [
    {
      cle: "site-ground",
      id: "site-ground",
      params: { width: long(TERRAIN.x), depth: long(TERRAIN.z) },
      data: { zones: imp.dalles },
      position: [centre(TERRAIN.x), 0, centre(TERRAIN.z)],
    },

    // --- les bureaux : l'architecte au fond, ou arrive la route du retour, le client et sa decision, le bureau d'etudes,
    // et le panneau du permis sur le passage vers le chantier
    lieu("bureau-architecte", { cle: "architect-office", state: "active" }),
    lieu("bureau-client", { cle: "client-office", state: "waiting" }),
    { cle: "decision-sign:continue", id: "decision-sign", position: lieux["bureau-client"].panneau },
    lieu("bureau-etudes", { cle: "design-office", state: "active" }),
    lieu("panneau-permis", { cle: "permit-board", state: "granted" }),
    personne("claire", ["architect-office", "desk:1"], "typing"),
    personne("client", ["client-office", "desk:1"], "waiting"),
    {
      cle: "selection-ring",
      id: "selection-ring",
      state: "selected",
      params: { radius: 0.7 },
      sur: ["client-office", "desk:1"],
    },
    personne("marc", ["design-office", "desk:1"], "work"),
    personne("lina", ["design-office", "desk:2"], "thinking"),

    // --- le chantier : la cloture, ses deux portails, les conteneurs des experts, le feu vert, les parcelles, la logistique
    clotureEntree,
    ...clotures,
    // les experts : le bureau de controle et la baraque du conducteur, groupes long pan contre long pan
    lieu("bureau-controle", { cle: "control-office", state: "active" }),
    lieu("baraque", { cle: "site-office", state: "active" }),
    personne("helene", ["control-office", "desk:1"], "inspect"),
    personne("yves", ["site-office", "desk:1"], "typing"),
    { cle: "decision-sign:feu-vert", id: "decision-sign", position: lieux["panneau-feu-vert"].panneau },
    ...batiments,
    ...imp.decor,
    {
      cle: "delivery-truck",
      id: "delivery-truck",
      state: "idle",
      position: [imp.chantier.x[1] - 4.5, 0, 51],
      rotation: Math.PI / 2,
    },

    // --- la reception, la remise des cles et la garantie, de gauche a droite ; les deux conteneurs groupes
    lieu("aire-reception", { cle: "reception-area", state: "active" }),
    personne("anne", ["reception-area", "desk:1"], "inspect"),
    lieu("cabane-cles", { cle: "container:cles" }),
    lieu("cabane-garantie", { cle: "container:garantie" }),
    personne("bernard", ["container:garantie", "entry"], "idle", 0),

    // --- les transformations, et le carnet des demandes
    lieu("cabane-transformations", { cle: "container:transformations" }),
    lieu("parking", { cle: "parking" }),
  ];

  // Les reperes fixes : une etape ou un passage (une decision du client) sur l'ancre d'un lieu. Les pastilles des
  // batiments s'y ajoutent ; leur etape suit la phase.
  const reperes = {
    "etape:1": { etape: 1, sur: ["architect-office", "label"] },
    "passage:continue": {
      titre: "On continue ?",
      zone: "bureaux",
      passage: true,
      sur: ["decision-sign:continue", "badge"],
    },
    "etape:2": { etape: 2, sur: ["design-office", "label"] },
    "etape:3": { etape: 3, passage: true, sur: ["permit-board", "badge"] },
    "etape:4": { etape: 4, sur: ["site-office", "label"] },
    "passage:feu-vert": {
      titre: "Feu vert",
      icone: "feu-vert",
      zone: "chantier",
      passage: true,
      sur: ["decision-sign:feu-vert", "badge"],
    },
    "etape:7": { etape: 7, passage: true, sur: ["reception-area", "label"] },
    "etape:8": { etape: 8, passage: true, sur: ["container:cles", "label"] },
    "etape:9": { etape: 9, sur: ["container:garantie", "label"] },
    "etape:10": { etape: 10, sur: ["container:transformations", "label"] },
  };
  for (let k = 0; k < apps; k++)
    reperes[`batiment:${k + 1}`] = {
      batiment: k,
      application: noms[k],
      sur: [`building:${k + 1}`, "label"],
    };

  const meta = {
    id: SCENE_ID,
    states: Object.keys(PHASES),
    anchors: Object.keys(reperes),
    budget: { triangles: 0, materials: 0 },
  };
  return { apps, noms, membres, reperes, cadres: CADRES, terrain: TERRAIN, meta };
}

// La phase d'une application : la premiere suit l'etat de la scene, les suivantes ont chacune la leur.
const phaseDe = (app, etat) =>
  app === 0 ? etat : PHASES_AUTRES[(app - 1) % PHASES_AUTRES.length];

// instances : une instance de composant par membre de p.membres, dans le meme ordre. Elles sont posees ici, puis le
// plateau est recentre sur l'origine (la cible de la camera). Le premier membre est le terrain.
export function create(THREE, instances, p) {
  const root = new THREE.Group();
  root.name = "scene-reference";
  const plateau = new THREE.Group();
  root.add(plateau);
  const parCle = {};
  p.membres.forEach((m, i) => {
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
  const [tx, , tz] = p.membres[0].position;
  plateau.position.set(RECUL - tx, 0, RECUL - tz);
  plateau.updateMatrix();

  // les bordures des zones, au sol : quatre bandes par zone, un materiau d'equipe chacune
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const peintures = [];
  for (const [cle, { x, z }] of Object.entries(p.cadres)) {
    const mat = materiauPalette(THREE, ZONES[cle].materiau);
    peintures.push(mat);
    const l = BORDURE.largeur;
    for (const [cx, cz, w, d] of [
      [centre(x), z[0], long(x) + l, l],
      [centre(x), z[1], long(x) + l, l],
      [x[0], centre(z), l, long(z)],
      [x[1], centre(z), l, long(z)],
    ]) {
      const bande = new THREE.Mesh(cube, mat);
      bande.scale.set(w, BORDURE.epaisseur, d);
      bande.position.set(cx, BORDURE.dessus - BORDURE.epaisseur / 2, cz);
      bande.receiveShadow = true;
      plateau.add(bande);
    }
  }

  let etat = PHASE_DEFAUT;
  const versScene = (v) => v.applyMatrix4(plateau.matrix);

  return {
    root,
    instances,
    // la phase du premier batiment ; chaque batiment prend son etat, et ses gabarits, sa grue et ses ouvriers
    // apparaissent ou s'effacent avec elle
    setState(state) {
      if (!PHASES[state]) throw new Error(`état inconnu : ${state}`);
      etat = state;
      for (const { m, inst } of Object.values(parCle)) {
        if (m.app === undefined) continue;
        const phase = PHASES[phaseDe(m.app, etat)];
        if (m.id === "building")
          inst.setState(phase.batiment, { progress: 0.6 });
        if (m.quand) inst.root.visible = Boolean(phase[m.quand]);
      }
    },
    update(dt) {
      let encore = false;
      for (const inst of instances)
        if (inst.root.visible) encore = inst.update(dt) || encore;
      return encore;
    },
    anchor(nom) {
      const r = p.reperes[nom];
      if (!r) throw new Error(`ancre inconnue : ${nom}`);
      return versScene(point(r.sur));
    },
    // ce que dit un repere : numero, titre, icone, zone ; la pastille d'un batiment suit sa phase
    repere(nom) {
      const r = p.reperes[nom];
      if (!r) return null;
      const n =
        r.batiment !== undefined
          ? PHASES[phaseDe(r.batiment, etat)].etape
          : r.etape;
      const e = n ? ETAPES[n] : {};
      return {
        numero: n,
        titre: r.application ? `${r.application} : ${e.titre}` : r.titre || e.titre,
        icone: r.icone || e.icone,
        zone: r.zone || e.zone,
        passage: Boolean(r.passage),
        pastille: r.batiment !== undefined,
      };
    },
    // les cadres des zones, au sol : quatre coins chacun, dans le repere de la scene
    cadres() {
      return Object.entries(p.cadres).map(([cle, { x, z }]) => ({
        cle,
        ...ZONES[cle],
        coins: [
          [x[0], z[0]],
          [x[1], z[0]],
          [x[1], z[1]],
          [x[0], z[1]],
        ].map(([a, b]) => versScene(new THREE.Vector3(a, 0.06, b))),
      }));
    },
    dispose() {
      for (const inst of instances) inst.dispose();
      cube.dispose();
      for (const m of peintures) m.dispose();
    },
  };
}
