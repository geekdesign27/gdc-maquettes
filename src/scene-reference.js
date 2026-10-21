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
import { tokens } from "./tokens.js";
import { materiauPalette } from "./etalon.js";

export const SCENE_ID = "scene";
const RECUL = 2; // en metres, sur X et Z : la scene descend d'environ 1,6 m a l'ecran

// Les dix etapes du harnais : titre, icone du lot G7 (step-icons 2.0, identifiants de GDC), zone.
export const ETAPES = {
  1: { titre: "L’idée", icone: "idee", zone: "bureaux" },
  2: { titre: "Les plans", icone: "plans", zone: "bureaux" },
  3: { titre: "Le permis", icone: "permis", zone: "bureaux" },
  4: { titre: "Plans d’exécution", icone: "plans-execution", zone: "chantier" },
  5: { titre: "Préparation", icone: "preparation", zone: "chantier" },
  6: { titre: "Construction", icone: "construction", zone: "chantier" },
  7: { titre: "Réception", icone: "reception", zone: "remise" },
  8: { titre: "Remise des clés", icone: "remise-des-cles", zone: "remise" },
  9: { titre: "Garantie", icone: "garantie", zone: "remise" },
  10: {
    titre: "Transformations",
    icone: "transformations",
    zone: "transformations",
  },
};
// Les zones et leur couleur d'interface : celle de l'equipe qui y travaille (src/palette.json, equipe).
// La bordure de chaque zone est un marquage peint au sol, dans le materiau d'equipe de la palette (MAT_FABRIC_*) : elle
// passe sous les objets au lieu de les couvrir (demande de Pierre-Alain du 21 octobre 2026). Ce n'est pas une couleur
// d'etat ; la pastille et le nom de la zone, eux, restent dans l'interface.
export const ZONES = {
  bureaux: { nom: "Les bureaux", couleur: tokens.team.architecture, materiau: "MAT_FABRIC_ARCHITECTURE" },
  chantier: { nom: "Le chantier", couleur: tokens.team.site, materiau: "MAT_FABRIC_SITE" },
  remise: { nom: "Réception, clés et garantie", couleur: tokens.team.reception, materiau: "MAT_FABRIC_RECEPTION" },
  transformations: { nom: "Les transformations", couleur: tokens.team.operations, materiau: "MAT_FABRIC_OPERATIONS" },
};
const BORDURE = { largeur: 0.4, epaisseur: 0.03, dessus: 0.07 }; // au-dessus du beton (0,05) et de l'enrobe (0,04)

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
const PAS_PARCELLE = 14; // socle de 12 m (une fiche) et 2 m entre deux parcelles

const centre = (a) => (a[0] + a[1]) / 2;
const long = (a) => a[1] - a[0];

// Un cote de cloture, de a a b le long d'un bord ; son interieur (-Z local, site-fence) tourne vers le chantier.
const ROTATION_CLOTURE = {
  "x-": -Math.PI / 2,
  "x+": Math.PI / 2,
  "z-": Math.PI,
  "z+": 0,
};
function cloture(enceinte, cle, bord, [a, b], gate = false) {
  const fixe = {
    "x-": enceinte.x[0],
    "x+": enceinte.x[1],
    "z-": enceinte.z[0],
    "z+": enceinte.z[1],
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

// Des projets d'exemple : un projet nomme ses applications, un batiment chacune (?applications=auditapp).
export const PROJETS = {
  auditapp: ["Webapp desktop", "Application terrain", "Webapp administration"],
};

// Le plan pour un nombre d'applications (1 a 4) ou un projet de PROJETS : les membres (un composant chacun), les
// reperes, les zones, et meta. Le nom d'une application s'affiche au survol de la pastille de son batiment.
export function plan(applications = 1) {
  const noms = PROJETS[String(applications).toLowerCase()] || [];
  const apps = noms.length || Math.min(Math.max(Math.round(Number(applications)) || 1, 1), 4);
  const parcelle = (k) => 49 + PAS_PARCELLE * k; // le centre en X de la parcelle k ; en Z : 37
  const CHANTIER = {
    x: [29.5, 56.5 + PAS_PARCELLE * (apps - 1)],
    z: [28.5, 54.5],
  };
  const TERRAIN = { x: [0, Math.max(CHANTIER.x[1] + 1.5, 60)], z: [7, 56] };
  const CADRES = {
    bureaux: { x: [1, 24.5], z: [29, 55] },
    chantier: CHANTIER,
    remise: { x: [29.5, 58.5], z: [9, 23] },
    transformations: { x: [1, 24.5], z: [9, 23] },
  };

  // Les dalles du terrain de chantier (site-ground, data.zones) : le beton sous les bureaux, les baraques et les
  // conteneurs ; la terre sur le chantier ; l'enrobe fait le carrefour et ses quatre branches.
  const dalles = [
    [CADRES.bureaux.x, CADRES.bureaux.z, "concrete"],
    [CADRES.remise.x, CADRES.remise.z, "concrete"],
    [CADRES.transformations.x, CADRES.transformations.z, "concrete"],
    [[30, 41.5], [29, 46], "concrete"], // la plateforme des experts, dans le chantier
    [[25, 29], [8, 56], "asphalt"], // la voie entre les bureaux et le chantier, puis vers les transformations
    [[1, 58.5], [24, 28], "asphalt"], // la voie entre les transformations et les bureaux, puis vers la reception
  ];
  const zones = dalles.map(([x, z, surface]) => ({
    x: centre(x) - centre(TERRAIN.x),
    z: centre(z) - centre(TERRAIN.z),
    width: long(x),
    depth: long(z),
    surface,
  }));

  // l'entree du chantier face au bureau d'etudes, sa sortie en haut vers la reception
  const sortie = [CHANTIER.x[1] - 12.5, CHANTIER.x[1]];
  const batiments = [];
  for (let k = 0; k < apps; k++) {
    const x = parcelle(k);
    batiments.push(
      {
        cle: `building:${k + 1}`,
        id: "building",
        app: k,
        params: { wings: 1 },
        position: [x, 0, 37],
        ancre: "label",
      },
      {
        cle: `survey-poles:${k + 1}`,
        id: "survey-poles",
        app: k,
        quand: "gabarits",
        params: { width: 8, depth: 6, height: 6 },
        position: [x, 0, 37],
      },
      {
        cle: `crane:${k + 1}`,
        id: "crane",
        app: k,
        quand: "grue",
        state: "lifting",
        position: [x - 4.4, 0, 32.6],
        rotation: -Math.PI / 2,
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

  const membres = [
    {
      cle: "site-ground",
      id: "site-ground",
      params: { width: long(TERRAIN.x), depth: long(TERRAIN.z) },
      data: { zones },
      position: [centre(TERRAIN.x), 0, centre(TERRAIN.z)],
    },

    // --- les bureaux : l'architecte au fond, ou arrive la route du retour, le client et sa decision, le bureau d'etudes,
    // et le panneau du permis sur le passage vers le chantier
    {
      cle: "architect-office",
      id: "architect-office",
      state: "active",
      position: [6.5, 0, 34],
    },
    {
      cle: "client-office",
      id: "client-office",
      state: "waiting",
      position: [18.5, 0, 34],
    },
    {
      cle: "decision-sign:continue",
      id: "decision-sign",
      position: [12.8, 0, 30.5],
    },
    {
      cle: "design-office",
      id: "design-office",
      state: "active",
      params: { desks: 4 },
      position: [16.5, 0, 49],
    },
    {
      cle: "permit-board",
      id: "permit-board",
      state: "granted",
      position: [23.8, 0, 46.5],
    },
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
    cloture(CHANTIER, "fence:entree", "x-", [44, CHANTIER.z[1]], true),
    cloture(CHANTIER, "fence:gauche", "x-", [CHANTIER.z[0], 44]),
    cloture(CHANTIER, "fence:sortie", "z-", sortie, true),
    cloture(CHANTIER, "fence:fond", "z-", [CHANTIER.x[0], sortie[0]]),
    cloture(CHANTIER, "fence:droite", "x+", CHANTIER.z),
    cloture(CHANTIER, "fence:avant", "z+", CHANTIER.x),
    // les experts : le bureau de controle et la baraque du conducteur, groupes long pan contre long pan
    {
      cle: "control-office",
      id: "control-office",
      state: "active",
      position: [35, 0, 32],
    },
    {
      cle: "site-office",
      id: "site-office",
      state: "active",
      position: [35, 0, 38.6],
    },
    personne("helene", ["control-office", "desk:1"], "inspect"),
    personne("yves", ["site-office", "desk:1"], "typing"),
    {
      cle: "decision-sign:feu-vert",
      id: "decision-sign",
      position: [41.8, 0, 37.5], // entre les experts et la parcelle
    },
    ...batiments,
    {
      cle: "material-storage",
      id: "material-storage",
      position: [35.5, 0, 51],
    },
    ...["wood", "metal", "inert", "mixed"].map((content, i) => ({
      cle: `waste-skip:${content}`,
      id: "waste-skip",
      params: { content },
      position: [41.5, 0, 46.3 + i * 2.2],
    })),
    {
      cle: "delivery-truck",
      id: "delivery-truck",
      state: "idle",
      position: [CHANTIER.x[1] - 4.5, 0, 51],
      rotation: Math.PI / 2,
    },

    // --- la reception, la remise des cles et la garantie, de gauche a droite ; les deux conteneurs groupes
    {
      cle: "reception-area",
      id: "reception-area",
      state: "active",
      position: [35, 0, 16],
    },
    personne("anne", ["reception-area", "desk:1"], "inspect"),
    // cote a cote le long de la voie, un peu ecartes : leurs reperes ne se chevauchent pas
    { cle: "container:cles", id: "site-container", position: [46, 0, 18] },
    {
      cle: "container:garantie",
      id: "site-container",
      position: [53.5, 0, 18],
    },
    personne("bernard", ["container:garantie", "entry"], "idle", 0),

    // --- les transformations, et le carnet des demandes
    {
      cle: "container:transformations",
      id: "site-container",
      position: [18, 0, 17.5],
    },
    { cle: "parking", id: "parking", position: [6.5, 0, 18] },
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
