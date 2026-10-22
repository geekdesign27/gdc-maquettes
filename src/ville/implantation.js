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
// La largeur du socle de building 2.0.0 selon son type (en X), et l'ecart entre deux socles.
export const SOCLES = { house: 12, block: 15, hall: 18 };
const ECART_SOCLES = 2;
const BORD_PARCELLES = 43; // le bord gauche de la premiere parcelle, a droite du chemin des experts
export const MAX_APPLICATIONS = 8;
// Au-dela de quatre applications, une deuxieme rangee de parcelles sous l'allee (decision de Pierre-Alain du 22 octobre
// 2026) : le chantier s'approfondit, le terrain garde sa largeur (120 m au plus pour site-ground), aucun composant ne
// change. La deuxieme rangee commence apres la bande des bennes, du stock et des camions de la premiere, a sa propre
// allee devant ses portes et la place de ses camions devant elle.
export const PAR_RANGEE = 4;
const Z_PARCELLE = 37;
const Z_ALLEE = 44.8; // l'allee du chantier, entre les batiments et les bennes
const Z_PARCELLE_2 = 59.5; // socles de 53,5 a 65,5
const Z_ALLEE_2 = 67.3; // l'allee de la deuxieme rangee, devant ses portes
const Z_CAMION_2 = 70; // la place des camions de la deuxieme rangee
const AVANT_2 = 72.5; // le bord avant du chantier a deux rangees (54,5 a une rangee)
const X_LIAISON = 31.4; // le chemin qui descend de l'allee a l'allee de la deuxieme rangee, le long de l'entree
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
    porte: [12.9, 35.2], // la porte donne a +X, entre l'architecte et le client
    route: 13.6,
  },
  "bureau-client": {
    element: "client-office",
    zone: "bureaux",
    position: [18.5, 0, 34],
    porte: [25.2, 33.2], // ouvert a +X, sur la voie
    panneau: [12.8, 0, 30.5],
  },
  "bureau-etudes": {
    element: "design-office",
    zone: "bureaux",
    position: [16.5, 0, 49],
    params: { desks: 4 },
    porte: [22.4, 49],
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
    porte: [39.8, 36.5], // l'entree de la baraque (ancre entry)
  },
  "panneau-feu-vert": {
    element: "decision-sign",
    zone: "chantier",
    position: [41.7, 0, 37.5], // entre les experts et la parcelle
    porte: [40.6, 36.4],
    panneau: [41.7, 0, 37.5],
    // la bande entre le chemin des experts (x = 40,6) et la premiere parcelle (x = 43) : les panneaux se rangent le
    // long d'elle, trois par rang (un panneau fait 0,9 m de large) ; le second rang, a 0,85 m vers la parcelle (vers la
    // plateforme, il serait sur le chemin des experts), glisse de 0,2 m : les tableaux ne se touchent pas et, vu de la
    // camera, ceux du second rang tombent entre ceux du premier
    grille: { pas: [0, 1.3], rang: [0.85, 0.2], centre: true },
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
    porte: [44, 22.4], // l'entree d'un conteneur (ancre entry) est a -X
    panneau: [49.6, 0, 22.4],
  },
  "cabane-garantie": {
    element: "site-container",
    zone: "remise",
    position: [53.5, 0, 18],
    porte: [51.5, 22.4],
  },
  "cabane-transformations": {
    element: "site-container",
    zone: "transformations",
    position: [18, 0, 17.5],
    porte: [16, 22.4],
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

// L'implantation pour un nombre d'applications (1 a 8 ; au-dela de 4, la deuxieme rangee) : terrain, chantier, cadres des zones, dalles du sol, clotures,
// lieux fixes, decor du chantier, parcelles, points de la vie du chantier et voies. types : le type de chaque batiment
// (house, block, hall), dans l'ordre des parcelles ; chaque parcelle prend alors la largeur de son socle. Sans types,
// les parcelles sont au pas de 14 m (la scene de reference).
// La densite des projecteurs (V-2) : sobre, moyenne ou dense.
export const DENSITE_PROJECTEURS = "moyenne";

export function implantation(applications = 1, types = null, densite = DENSITE_PROJECTEURS) {
  const apps = Math.min(
    Math.max(Math.round(Number(types ? types.length : applications)) || 1, 1),
    MAX_APPLICATIONS,
  );
  // chaque rangee repart du bord gauche ; le chantier va jusqu'au bout de la plus longue
  const centres = [];
  let finParcelles = 0;
  for (let k = 0, bord = BORD_PARCELLES; k < apps; k++) {
    if (k === PAR_RANGEE) bord = BORD_PARCELLES;
    const largeur = types ? SOCLES[types[k]] || SOCLES.block : PAS_PARCELLE - ECART_SOCLES;
    centres.push(types ? bord + largeur / 2 : 49 + PAS_PARCELLE * (k % PAR_RANGEE));
    finParcelles = Math.max(finParcelles, centres[k] + largeur / 2);
    bord = centres[k] + largeur / 2 + ECART_SOCLES;
  }
  const deuxRangees = apps > PAR_RANGEE;
  const CHANTIER = {
    x: [29.5, finParcelles + 1.5],
    z: [28.5, deuxRangees ? AVANT_2 : 54.5],
  };
  const TERRAIN = { x: [0, Math.max(CHANTIER.x[1] + 1.5, 60)], z: [7, Math.max(56, CHANTIER.z[1] + 1.5)] };
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
    [[25, 29], [8, TERRAIN.z[1]], "asphalt"], // la voie entre les bureaux et le chantier, puis vers les transformations
    [[1, 58.5], [24, 28], "asphalt"], // la voie entre les transformations et les bureaux, puis vers la reception
  ].map(([x, z, surface]) => ({
    x: centre(x) - centre(TERRAIN.x),
    z: centre(z) - centre(TERRAIN.z),
    width: long(x),
    depth: long(z),
    surface,
  }));

  // l'entree du chantier face au bureau d'etudes, sa sortie en haut vers la reception ; a deux rangees, l'entree ne
  // bouge pas et la cloture continue au-dela
  const sortie = [CHANTIER.x[1] - 12.5, CHANTIER.x[1]];
  const ENTREE = [44, 54.5];
  const clotures = [
    cloture(CHANTIER, "fence:entree", "x-", ENTREE, true),
    ...(deuxRangees ? [cloture(CHANTIER, "fence:gauche-avant", "x-", [ENTREE[1], CHANTIER.z[1]])] : []),
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

  // Les projecteurs (floodlight, plan D-2, puis V-2) : la carte seule les pose et les allume, la scene de reference ne
  // les a pas. Tous dans la cloture du chantier ou dans une zone, chacun de la zone ou il est (gris avec elle), tourne
  // vers ce qu'il eclaire (son avant est +Z), hors des voies, des parcelles et du balayage des camions (constat D-2).
  // Le lest de 0,80 m, tourne, deborde de 0,57 m au plus : a 0,75 m d'une cloture, il laisse 0,03 m a ses plots.
  // Trois densites (V-2, decision de Pierre-Alain sur planche) : sobre, les quatre coins du chantier et un projecteur par
  // baraquement (la baraque du conducteur, les bureaux, la remise, les transformations) ; moyenne, un de plus entre deux
  // parcelles au fond du chantier et un second par zone ; dense, un sur le bureau de controle et un troisieme aux
  // bureaux (entre deux parcelles a l'avant, les camions des maisons depassent leur parcelle : pas de mat).
  const R = 0.75;
  const [X0, X1] = CHANTIER.x;
  const [Z0, Z1] = CHANTIER.z;
  const pose = (cle, zone, [x, z], [vx, vz]) => ({
    cle: `floodlight:${cle}`,
    id: "floodlight",
    zone,
    position: [x, 0, z],
    rotation: Math.atan2(vx - x, vz - z),
  });
  const milieu = [centre(CHANTIER.x), centre(CHANTIER.z)];
  // les ecarts entre deux socles voisins : le milieu de chacun
  const ecarts = [];
  for (let k = 0; k + 1 < Math.min(apps, PAR_RANGEE); k++) {
    const l = (n) => (types ? SOCLES[types[n]] || SOCLES.block : PAS_PARCELLE - ECART_SOCLES);
    ecarts.push((centres[k] + l(k) / 2 + centres[k + 1] - l(k + 1) / 2) / 2);
  }
  const densites = {
    sobre: [
      pose("fond-gauche", "chantier", [X0 + R, Z0 + R], milieu),
      // au fond a droite, l'allee longe les deux clotures a 1,2 m du coin jusqu'au portail de sortie : le mat est sur la
      // cloture du fond, a gauche du portail et de ses vantaux
      pose("fond-droite", "chantier", [X1 - 11, Z0 + R], milieu),
      // a l'avant gauche, hors du virage des camions vers le portail : derriere le stock de materiaux
      pose("avant-gauche", "chantier", [33.5, Z1 - R], milieu),
      pose("avant-droite", "chantier", [X1 - R, Z1 - R], milieu),
      // la baraque du conducteur et le bureau de controle, depuis l'autre cote du chemin des experts
      pose("baraque", "chantier", [41.75, 41.5], [35.5, 38]),
      pose("bureaux", "bureaux", [5, 41], [12, 40]),
      pose("remise", "remise", [40.5, 21.5], [41, 17]),
      pose("transformations", "transformations", [13.75, 21.5], [13.75, 17]),
    ],
    moyenne: [
      ...ecarts.map((x, k) => pose(`fond-${k + 1}`, "chantier", [x, Z0 + R], [x, Z0 + 8])),
      pose("bureaux-2", "bureaux", [5, 50], [12, 48]),
      pose("remise-2", "remise", [57.75, 21.5], [53.5, 17]),
      pose("transformations-2", "transformations", [23.75, 21.5], [18, 17]),
    ],
    dense: [
      pose("controle", "chantier", [41.75, 30], [35, 32.5]),
      pose("bureaux-3", "bureaux", [23.75, 41], [18, 46]),
    ],
  };
  const projecteurs = [
    ...densites.sobre,
    ...(densite !== "sobre" ? densites.moyenne : []),
    ...(densite === "dense" ? densites.dense : []),
  ];

  // Une parcelle par application, de gauche a droite le long de l'allee : le batiment au centre, ses gabarits, sa grue,
  // la place du camion de livraison et sa porte sur l'allee. Les applications 5 a 8 font la deuxieme rangee.
  const parcelles = [];
  for (let k = 0; k < apps; k++) {
    const x = centres[k];
    const rangee = k < PAR_RANGEE ? 1 : 2;
    const z = rangee === 1 ? Z_PARCELLE : Z_PARCELLE_2;
    parcelles.push({
      index: k,
      rangee,
      position: [x, 0, z],
      grue: { position: [x - 4.4, 0, z - 4.4], rotation: -Math.PI / 2 },
      camion: { position: [x + 3, 0, rangee === 1 ? 51 : Z_CAMION_2], rotation: Math.PI / 2 },
      porte: [x, rangee === 1 ? Z_ALLEE : Z_ALLEE_2],
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
    projecteurs,
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
  // chaque lieu dont la porte donne sur la route : un point de la route en face (ou a son acces, route)
  const horizontaux = [
    "bureau-architecte",
    "aire-reception",
    "cabane-cles",
    "cabane-garantie",
    "cabane-transformations",
    "parking",
  ];
  for (const id of horizontaux) surRoute(id, lieux[id].route ?? lieux[id].porte[0]);
  surRoute("sortie", xPortail);
  const route = Object.values(points)
    .filter((p) => p.z === Z_ROUTE)
    .sort((a, b) => a.x - b.x)
    .map((p) => p.id);
  chaine(route);
  // la voie verticale : les lieux dont la porte donne sur elle, et l'entree du chantier, du carrefour vers le bas
  const verticaux = ["bureau-client", "panneau-permis", "bureau-etudes"];
  for (const id of verticaux) surVoie(id, lieux[id].porte[1]);
  surVoie("entree", centre(ENTREE));
  chaine(["carrefour", ...Object.values(points).filter((p) => p.x === X_ROUTE && p.z > Z_ROUTE).sort((a, b) => a.z - b.z).map((p) => p.id)]);

  // les portes des lieux hors du chantier
  for (const id of horizontaux) {
    point(`porte:${id}`, ...lieux[id].porte);
    relie(`porte:${id}`, `route:${id}`);
  }
  for (const id of verticaux) {
    point(`porte:${id}`, ...lieux[id].porte);
    relie(`porte:${id}`, `voie:${id}`);
  }

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
  for (const p of parcelles.filter((x) => x.rangee === 1)) {
    const id = `allee:${p.index + 1}`;
    point(id, p.porte[0], Z_ALLEE, true);
    relie(avant, id);
    avant = id;
  }
  point("allee:fin", xFin, Z_ALLEE, true);
  // la deuxieme rangee : son allee part de l'entree du chantier et rejoint l'allee a droite, le long de la cloture
  const deuxieme = parcelles.filter((x) => x.rangee === 2);
  if (deuxieme.length) {
    point("allee2:depart", X_LIAISON, Z_ALLEE_2, true);
    relie("chantier:entree", "allee2:depart");
    let avant2 = "allee2:depart";
    for (const p of deuxieme) {
      const id = `allee:${p.index + 1}`;
      point(id, p.porte[0], Z_ALLEE_2, true);
      relie(avant2, id);
      avant2 = id;
    }
    point("allee2:fin", xFin, Z_ALLEE_2, true);
    chaine([avant2, "allee2:fin", "allee:fin"]);
  }
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

// Les abords d'un batiment sur sa parcelle (building 2.0.0 : trame de 3 m, house 2 x 2 trames, block 3 x 2, hall 4 x 2 ;
// echafaudage d'environ 1 m ; fouille a 1,1 m du nu) : ou les ouvriers travaillent, du cote de la camera (+X, +Z) pour
// qu'on les voie. pied : au sol, hors de l'echafaudage ; echafaudage : sur son plancher (l'assemblage les pose a la
// hauteur de l'etage) ; bord : le bord de la fouille, ou l'on controle le niveau ; pelle : pres de la pelleteuse.
const DEMI_EMPRISE = { house: [3, 3], block: [4.5, 3], hall: [6, 3] };
export function abords(parcelle, type = "block") {
  const [x, , z] = parcelle.position;
  const [dx, dz] = DEMI_EMPRISE[type] || DEMI_EMPRISE.block;
  const [sx, sz] = [dx + 0.6, dz + 0.6];
  const [px, pz] = [dx + 1.7, dz + 1.7];
  return {
    pied: [
      [x - dx + 1, z + pz],
      [x + 0.4, z + pz],
      [x + dx - 0.6, z + pz],
      [x + px, z + dz - 1],
      [x + px, z - dz + 1.4],
    ],
    echafaudage: [
      [x - dx + 1.4, z + sz],
      [x + 0.6, z + sz],
      [x + dx - 1, z + sz],
      [x + sx, z + 0.6],
      [x + sx, z - dz + 1.2],
    ],
    bord: [x + 0.8, z + dz + 1.3],
    pelle: [x + dx + 1.5, z + dz + 1.6],
  };
}

// La zone d'un point du sol, ou null hors des quatre zones (les routes).
export function zoneDe(cadres, x, z) {
  for (const [cle, c] of Object.entries(cadres))
    if (x >= c.x[0] && x <= c.x[1] && z >= c.z[0] && z <= c.z[1]) return cle;
  return null;
}
