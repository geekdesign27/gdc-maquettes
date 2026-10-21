// L'implantation de la carte du harnais (docs/ville.md, decisions de Pierre-Alain du 21 octobre 2026) : quatre zones
// autour d'un carrefour, les lieux d'etape fixes, une parcelle par application, les voies et les portes. Rien que des
// nombres, sans Three.js : la carte vivante (carte.js), les chemins (chemins.js), la vie du chantier (vie.js) et la
// scene de reference de la galerie lisent la meme implantation.
//
// Reperes : en metres, au sol (x, z). Vu de la camera, +X descend vers la droite et +Z vers la gauche : les bureaux
// sont a gauche, le chantier en bas, la reception a droite, les transformations en haut.
import { tokens } from "../tokens.js";

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
  bureaux: {
    nom: "Les bureaux",
    couleur: tokens.team.architecture,
    materiau: "MAT_FABRIC_ARCHITECTURE",
  },
  chantier: {
    nom: "Le chantier",
    couleur: tokens.team.site,
    materiau: "MAT_FABRIC_SITE",
  },
  remise: {
    nom: "Réception, clés et garantie",
    couleur: tokens.team.reception,
    materiau: "MAT_FABRIC_RECEPTION",
  },
  transformations: {
    nom: "Les transformations",
    couleur: tokens.team.operations,
    materiau: "MAT_FABRIC_OPERATIONS",
  },
};
export const BORDURE = { largeur: 0.4, epaisseur: 0.03, dessus: 0.07 }; // au-dessus du beton (0,05) et de l'enrobe (0,04)
export const PAS_PARCELLE = 14; // socle de 12 m (une fiche) et 2 m entre deux parcelles
export const MAX_APPLICATIONS = 4;
const Z_PARCELLE = 37;
const Z_ALLEE = 44.8; // l'allee du chantier, entre les batiments et les bennes
const Z_ROUTE = 26; // l'axe de la route entre les transformations et les bureaux
const X_ROUTE = 27; // l'axe de la route entre les bureaux et le chantier

const centre = (a) => (a[0] + a[1]) / 2;
const long = (a) => a[1] - a[0];

// Les lieux fixes, par identifiant de lieu de GDC (plan.zones[].lieux, schema 3) : le composant, sa place, sa porte (le
// point du sol ou l'on entre et d'ou l'on sort) et, pour une decision, la place du panneau.
const LIEUX = {
  "bureau-architecte": {
    element: "architect-office",
    zone: "bureaux",
    position: [6.5, 0, 34],
    porte: [6.5, 30.2],
  },
  "bureau-client": {
    element: "client-office",
    zone: "bureaux",
    position: [18.5, 0, 34],
    porte: [18.5, 30.2],
    panneau: [12.8, 0, 30.5],
  },
  "bureau-etudes": {
    element: "design-office",
    zone: "bureaux",
    position: [16.5, 0, 49],
    params: { desks: 4 },
    porte: [21.6, 49],
  },
  "panneau-permis": {
    element: "permit-board",
    zone: "bureaux",
    position: [23.8, 0, 46.5],
    porte: [24.6, 45.4],
  },
  "bureau-controle": {
    element: "control-office",
    zone: "chantier",
    position: [35, 0, 32],
    porte: [39.6, 32],
  },
  baraque: {
    element: "site-office",
    zone: "chantier",
    position: [35, 0, 38.6],
    porte: [39.6, 38.6],
  },
  "panneau-feu-vert": {
    element: "decision-sign",
    zone: "chantier",
    position: [41.8, 0, 37.5], // entre les experts et la parcelle
    porte: [40.6, 36.4],
    panneau: [41.8, 0, 37.5],
  },
  "aire-reception": {
    element: "reception-area",
    zone: "remise",
    position: [35, 0, 16],
    porte: [35, 22.6],
    panneau: [39.2, 0, 22.2],
  },
  // cote a cote le long de la voie, un peu ecartes : leurs reperes ne se chevauchent pas
  "cabane-cles": {
    element: "site-container",
    zone: "remise",
    position: [46, 0, 18],
    porte: [46, 22.4],
    panneau: [49.6, 0, 22.4],
  },
  "cabane-garantie": {
    element: "site-container",
    zone: "remise",
    position: [53.5, 0, 18],
    porte: [53.5, 22.4],
  },
  "cabane-transformations": {
    element: "site-container",
    zone: "transformations",
    position: [18, 0, 17.5],
    porte: [18, 22.4],
  },
  parking: {
    element: "parking",
    zone: "transformations",
    position: [6.5, 0, 18],
    porte: [6.5, 22.4],
  },
};

// Le cote de cloture : son interieur (-Z local, site-fence) tourne vers le chantier.
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

// L'implantation pour un nombre d'applications (1 a 4) : terrain, chantier, cadres des zones, dalles du sol, clotures,
// lieux fixes, decor du chantier, parcelles, points de la vie du chantier et voies.
export function implantation(applications = 1) {
  const apps = Math.min(
    Math.max(Math.round(Number(applications)) || 1, 1),
    MAX_APPLICATIONS,
  );
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
  ].map(([x, z, surface]) => ({
    x: centre(x) - centre(TERRAIN.x),
    z: centre(z) - centre(TERRAIN.z),
    width: long(x),
    depth: long(z),
    surface,
  }));

  // l'entree du chantier face au bureau d'etudes, sa sortie en haut vers la reception
  const sortie = [CHANTIER.x[1] - 12.5, CHANTIER.x[1]];
  const ENTREE = [44, CHANTIER.z[1]];
  const clotures = [
    cloture(CHANTIER, "fence:entree", "x-", ENTREE, true),
    cloture(CHANTIER, "fence:gauche", "x-", [CHANTIER.z[0], 44]),
    cloture(CHANTIER, "fence:sortie", "z-", sortie, true),
    cloture(CHANTIER, "fence:fond", "z-", [CHANTIER.x[0], sortie[0]]),
    cloture(CHANTIER, "fence:droite", "x+", CHANTIER.z),
    cloture(CHANTIER, "fence:avant", "z+", CHANTIER.x),
  ];

  // Le decor du chantier : le stock et les bennes de tri, toujours la.
  const decor = [
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
  ];

  // Une parcelle par application, de gauche a droite le long de l'allee : le batiment au centre, ses gabarits, sa grue,
  // la place du camion de livraison et sa porte sur l'allee.
  const parcelles = [];
  for (let k = 0; k < apps; k++) {
    const x = 49 + PAS_PARCELLE * k;
    parcelles.push({
      index: k,
      position: [x, 0, Z_PARCELLE],
      grue: { position: [x - 4.4, 0, 32.6], rotation: -Math.PI / 2 },
      camion: { position: [x + 3, 0, 51], rotation: Math.PI / 2 },
      porte: [x, Z_ALLEE],
      // les reperes des ouvriers autour du batiment (socle de 12 m, batiment d'environ 8 x 6 m)
      pied: [
        [x - 4.6, 41.6],
        [x + 4.6, 41.6],
        [x - 4.8, 33.4],
        [x + 4.8, 36.8],
        [x, 41.8],
      ],
      bord: [x + 5.4, 43.8], // le bord de la fouille, ou l'on controle le niveau
    });
  }

  const lieux = Object.fromEntries(
    Object.entries(LIEUX).map(([id, l]) => [id, { id, ...l }]),
  );

  // Les points de la vie du chantier : le vestiaire (la baraque), le stock, la benne, le rassemblement de la pause (pres
  // de la baraque, en attendant le cabanon party-shed) et le portail d'entree.
  const points = {
    vestiaire: lieux.baraque.porte,
    stock: [37.6, 49.4],
    benne: [43, 47.4],
    rassemblement: [32.2, 43.6],
    portail: [CHANTIER.x[0], centre(ENTREE)],
  };

  return {
    apps,
    terrain: TERRAIN,
    chantier: CHANTIER,
    cadres: CADRES,
    dalles,
    clotures,
    decor,
    lieux,
    parcelles,
    points,
    voies: voies({ CHANTIER, ENTREE, sortie, lieux, parcelles }),
  };
}

// Les voies : un graphe de points (x, z) et de segments, le long de l'enrobe et des allees du chantier. Chaque point
// porte sa zone ; dans le chantier, il porte « chantier », que le client ne traverse jamais (OTConst, art. 6).
function voies({ CHANTIER, ENTREE, sortie, lieux, parcelles }) {
  const points = {};
  const segments = [];
  const point = (id, x, z, chantier = false) =>
    (points[id] = { id, x, z, chantier });
  const relie = (a, b) => segments.push([a, b]);
  const chaine = (ids) => ids.slice(1).forEach((id, i) => relie(ids[i], id));

  // la route horizontale (z = 26) et la route verticale (x = 27) se croisent au carrefour
  const xPortail = centre(sortie);
  const xFin = CHANTIER.x[1] - 1.2;
  point("carrefour", X_ROUTE, Z_ROUTE);
  const surRoute = (id, x) => point(`route:${id}`, x, Z_ROUTE);
  const surVoie = (id, z) => point(`voie:${id}`, X_ROUTE, z);
  // chaque lieu dont la porte donne sur la route : un point de la route en face
  const horizontaux = [
    "bureau-architecte",
    "bureau-client",
    "aire-reception",
    "cabane-cles",
    "cabane-garantie",
    "cabane-transformations",
    "parking",
  ];
  for (const id of horizontaux) surRoute(id, lieux[id].porte[0]);
  surRoute("sortie", xPortail);
  const route = Object.values(points)
    .filter((p) => p.z === Z_ROUTE)
    .sort((a, b) => a.x - b.x)
    .map((p) => p.id);
  chaine(route);
  surVoie("permis", lieux["panneau-permis"].porte[1]);
  surVoie("etudes", lieux["bureau-etudes"].porte[1]);
  surVoie("entree", centre(ENTREE));
  chaine(["carrefour", "voie:permis", "voie:etudes", "voie:entree"]);

  // les portes des lieux hors du chantier
  for (const id of horizontaux) {
    point(`porte:${id}`, ...lieux[id].porte);
    relie(`porte:${id}`, `route:${id}`);
  }
  point("porte:bureau-etudes", ...lieux["bureau-etudes"].porte);
  relie("porte:bureau-etudes", "voie:etudes");
  point("porte:panneau-permis", ...lieux["panneau-permis"].porte);
  relie("porte:panneau-permis", "voie:permis");

  // le chantier : le portail d'entree, l'allee le long des parcelles, le chemin des experts, le tour par le fond jusqu'au
  // portail de sortie
  point("portail:entree", CHANTIER.x[0], centre(ENTREE), true);
  point("chantier:entree", CHANTIER.x[0] + 1.6, centre(ENTREE), true);
  point("allee:experts", 40.6, Z_ALLEE, true);
  point("allee:depart", 31.4, Z_ALLEE, true);
  chaine([
    "voie:entree",
    "portail:entree",
    "chantier:entree",
    "allee:depart",
    "allee:experts",
  ]);
  point("experts:feu-vert", 40.6, lieux["panneau-feu-vert"].porte[1], true);
  point("experts:baraque", 40.6, lieux.baraque.porte[1], true);
  point("experts:controle", 40.6, lieux["bureau-controle"].porte[1], true);
  chaine([
    "allee:experts",
    "experts:baraque",
    "experts:feu-vert",
    "experts:controle",
  ]);
  for (const id of ["baraque", "bureau-controle", "panneau-feu-vert"])
    point(`porte:${id}`, ...lieux[id].porte, true);
  relie("porte:baraque", "experts:baraque");
  relie("porte:bureau-controle", "experts:controle");
  relie("porte:panneau-feu-vert", "experts:feu-vert");
  let avant = "allee:experts";
  for (const p of parcelles) {
    const id = `allee:${p.index + 1}`;
    point(id, p.porte[0], Z_ALLEE, true);
    relie(avant, id);
    avant = id;
  }
  point("allee:fin", xFin, Z_ALLEE, true);
  point("fond:fin", xFin, CHANTIER.z[0] + 1.2, true);
  point("fond:sortie", xPortail, CHANTIER.z[0] + 1.2, true);
  point("portail:sortie", xPortail, CHANTIER.z[0], true);
  chaine([
    avant,
    "allee:fin",
    "fond:fin",
    "fond:sortie",
    "portail:sortie",
    "route:sortie",
  ]);
  return { points, segments };
}

// La zone d'un point du sol, ou null hors des quatre zones (les routes).
export function zoneDe(cadres, x, z) {
  for (const [cle, c] of Object.entries(cadres))
    if (x >= c.x[0] && x <= c.x[1] && z >= c.z[0] && z <= c.z[1]) return cle;
  return null;
}
