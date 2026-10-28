// L'interieur d'un batiment : la vue micro, un etage ouvert (une fiche), une piece par lot et l'etape ou en est chaque
// lot (catalogue : building-interior 2.0.0, lot G8). Fiche validee par Pierre-Alain le 21 octobre 2026, decisions du
// 22 octobre 2026 ; la 1.0 (une piece par fiche) avait son brief valide le 20 octobre 2026.
// - une coupe de plain-pied en maison de poupee, comme les bureaux en conteneur : pas de toit, murs cote camera (avant
//   et droite) et cloisons coupes a l'allege, murs du fond (arriere et gauche) pleins ;
// - (2.0.0 : une piece de 6 x 3 m par lot, en grappe ; 3.0.0, ci-dessous : une case de 3 x 3 m par lot, sur le
//   plateau du batiment) ;
// - l'enveloppe suit le stade de l'etage (data.floor.stage) : facades, poteaux, dalle, garde-corps (ENVELOPPES) ;
// - l'interieur de chaque piece suit l'aspect de son lot (data.rooms[n].state) : cloisons, sol et mobilier (todo vide,
//   preparing trace et attentes, building en travaux, finishing crepi et parquet a moitie pose, done finie, defect
//   rouverte jusqu'a la brique). La traduction de la phase du lot en aspect est faite par l'assemblage
//   (src/etages.js, roomsFromPieces) ; le nom de la phase s'affiche au survol, dans l'interface ;
// - dalles, rives, poteaux, murs du fond, fenetres, attentes d'armatures et garde-corps viennent du kit livre
//   building-kit (v003) ; murs coupes, cloisons, parquet, traces et mobilier de BLD_INTERIOR_A_v002 ;
// - groupes ROOM_n (userData.room = { index, id }) pour le survol de l'assemblage ; ancres room:n et label ;
// - etat default : la vue s'ouvre, les murs et le mobilier montent du sol piece apres piece ; hidden : ils
//   redescendent, puis la vue disparait ; image fixe avec reducedMotion ;
// - qualite basse : les pieces _LOW des deux modeles ; qualite haute : au-dela du budget, les rangees du fond passent
//   aux pieces _LOW (comme building).
// Version 3.0.0 (temps B des etages, decisions de Pierre-Alain du 28 octobre 2026) : la coupe se range exactement dans
// le plateau de son batiment. Une piece de 3 x 3 m par lot, une case de la trame ; le plateau a nx x ny cases
// (params.columns et params.rows, ceux du batiment ; a 0, ctx.floorPlate d'apres rooms) ; le lot m prend la case m de
// ctx.plateCells (le pourtour, puis le milieu), la meme que le batiment ; au-dela du nombre de cases, deux lots
// partagent une case ; une case sans lot reste une piece vide, sans reference. Le mobilier est replace pour une case
// (le milieu reste aux personnages) ; les pieces du modele, deja a la trame, ne changent pas. Le socle maquette ne se
// pose qu'au rez (data.floor.index absent ou 1) : en etage, la coupe repose sur la dalle du batiment.
// Les modeles sont partages entre instances : on ne libere jamais leurs geometries ni leurs materiaux ici ; seuls le
// socle et son materiau, crees par ce composant, sont liberes. Aucune couleur d'etat dans la scene ; aucun texte.

const KIT = "kit:building-kit/BLD_KIT_A_v004.glb";
const INTERIEUR = "BLD_INTERIOR_A_v002.glb";
const K = "BLD_KIT_A_";
const I = "BLD_INTERIOR_A_";
const TRAME = 3.0;
const DALLE = 0.3;
const PARQUET = 0.03;
const MARGE = 1.2; // du nu des pieces au bord du socle (le palier, devant)
const SOCLE = { epaisseur: 0.6, chanfrein: 0.1 }; // bible 18.5
const OUVERTURE = 0.8; // secondes, pour toute la vue
const MONTEE = 0.4; // secondes, pour une piece
const ASPECTS = [
  "todo",
  "preparing",
  "building",
  "finishing",
  "done",
  "defect",
];
// L'enveloppe de l'etage, par stade (le vocabulaire de building 2.0.0) :
// dalle : la dalle est coulee ; poteaux : aucun, les attentes d'armatures, ou les poteaux ; facades : aucune, ouvertes
// (garde-corps de rive ; une piece dont le lot est fini se ferme en brique), brique a baies brutes, brique et
// fenetres posees, crepi et fenetres.
const ENVELOPPES = {
  plot: { dalle: false, poteaux: "none", facades: "none" },
  excavation: { dalle: true, poteaux: "none", facades: "none" },
  foundations: { dalle: true, poteaux: "starter", facades: "none" },
  structure: { dalle: true, poteaux: "column", facades: "open" },
  envelope: { dalle: true, poteaux: "column", facades: "brick" },
  finishing: { dalle: true, poteaux: "column", facades: "window" },
  inspection: { dalle: true, poteaux: "column", facades: "render" },
  completed: { dalle: true, poteaux: "column", facades: "render" },
};
const STADE_PAR_DEFAUT = "completed"; // sans data.floor : l'enveloppe finie, seuls les aspects parlent

export const meta = {
  id: "building-interior",
  version: "3.0.0",
  category: "interior",
  states: ["default", "hidden"],
  params: {
    rooms: { type: "number", default: 4, min: 1, max: 30 },
    columns: { type: "number", default: 0, min: 0, max: 5 },
    rows: { type: "number", default: 0, min: 0, max: 3 },
  },
  anchors: ["label", "room:*"],
  budget: { triangles: 20000, materials: 10 },
  animated: true,
  assets: [INTERIEUR, KIT],
};

const versThree = (x, y, z) => [x, z, -y];
const borne = (v, p) =>
  Math.round(Math.min(Math.max(Number(v) || p.default, p.min), p.max));
const adoucit = (u) => 1 - (1 - u) ** 3;
const rad = (deg) => (deg * Math.PI) / 180;
// la normale vers l'interieur de la piece d'un cote pose a rot degres (l'epaisseur des pieces du kit, +Y local)
const dedans = (rot) => [-Math.sin(rad(rot)), Math.cos(rad(rot))];

// Les triangles d'une piece du modele (toutes ses primitives).
function triangles(objet) {
  let n = 0;
  objet.traverse((o) => {
    if (o.isMesh)
      n +=
        (o.geometry.index
          ? o.geometry.index.count
          : o.geometry.attributes.position.count) / 3;
  });
  return n;
}

// Le plan (3.0.0) : le plateau de nx x ny cases de 3 x 3 m, centre sur l'origine comme celui du batiment, et ses
// quatre cotes par case. Un cote est une cloison s'il touche une autre case, sinon un mur de facade, coupe a l'allege
// cote camera (avant, droite), plein au fond (arriere, gauche). rot : la rotation des pieces du kit qui pose leur
// epaisseur vers l'interieur de la case (et leur parement exterieur sur l'axe). cells : l'ordre des cases ou les lots
// se posent (ctx.plateCells, le meme que le batiment) ; k : le rang de la case dans cet ordre.
function plateau(nx, ny, cells) {
  const dedansPlateau = (i, j) => i >= 0 && i < nx && j >= 0 && j < ny;
  const pieces = cells.map(({ i, j }, k) => {
    const cx = (i - (nx - 1) / 2) * TRAME;
    const cy = (j - (ny - 1) / 2) * TRAME;
    const cote = (rot, di, dj, plein, axe) => ({
      rot,
      voisin: dedansPlateau(i + di, j + dj),
      plein,
      axe,
      segments: [axe],
    });
    const cotes = {
      avant: cote(0, 0, -1, false, [cx, cy - TRAME / 2]),
      droite: cote(90, 1, 0, false, [cx + TRAME / 2, cy]),
      arriere: cote(180, 0, 1, true, [cx, cy + TRAME / 2]),
      gauche: cote(270, -1, 0, true, [cx - TRAME / 2, cy]),
    };
    return { k, i, j, cx, cy, cotes };
  });
  return { colonnes: nx, rangees: ny, pieces };
}

export function create(THREE, params, ctx) {
  const kit = ctx.assets[KIT].scene;
  const interieur = ctx.assets[INTERIEUR].scene;
  const root = new THREE.Group();
  root.name = "building-interior";
  root.userData.component = meta.id;
  const basse = ctx.quality === "low";
  const n = borne(params.rooms, meta.params.rooms);
  // le plateau du batiment ; a 0, celui que la regle donne a n lots (src/etages.js)
  const auto = ctx.floorPlate([{ rooms: Array.from({ length: n }) }], "block");
  const cote = (v, min, max, defaut) =>
    Number(v) > 0 ? Math.round(Math.min(Math.max(Number(v), min), max)) : defaut;
  const nx = cote(params.columns, 2, 5, auto.nx);
  const ny = cote(params.rows, 2, 3, auto.ny);
  const plan = plateau(nx, ny, ctx.plateCells(nx, ny));
  const N = plan.pieces.length;
  // les lots de chaque case (m modulo le nombre de cases), et la case de chaque lot
  const lotsDe = plan.pieces.map(() => []);
  for (let m = 0; m < n; m++) lotsDe[m % N].push(m);
  const caseDuLot = (m) => m % N;

  // Un seul materiau par MAT_ : les pieces de l'interieur prennent ceux du kit de meme nom.
  const materiauxKit = new Map();
  kit.traverse((o) => {
    if (o.isMesh)
      for (const m of [].concat(o.material)) materiauxKit.set(m.name, m);
  });
  const modeles = { kit: [kit, K], interieur: [interieur, I] };
  const source = (p, legere) => {
    const [modele, prefixe] = modeles[p.modele];
    const objet =
      (legere && modele.getObjectByName(prefixe + p.nom + "_LOW")) ||
      modele.getObjectByName(prefixe + p.nom);
    if (!objet) throw new Error(`pièce absente du modèle : ${prefixe + p.nom}`);
    return objet;
  };

  const aspectDe = (room) =>
    ASPECTS.includes(room && room.state) ? room.state : "todo";
  const enveloppeDe = (floor) =>
    ENVELOPPES[floor && floor.stage] || ENVELOPPES[STADE_PAR_DEFAUT];

  // --- le plan d'une vue : une liste de poses { modele, nom, x, y, z, rot, echelle, piece, leve }
  // piece : l'indice de la piece (son groupe, la transition et l'allegement) ; leve : monte et descend avec la
  // transition.
  function poses(rooms, env) {
    const out = [];
    const pose = (modele, nom, x, y, z, rot, piece, extra = {}) =>
      out.push({
        modele,
        nom,
        x,
        y,
        z,
        rot,
        piece,
        leve: true,
        echelle: [1, 1, 1],
        ...extra,
      });
    const z0 = env.dalle ? DALLE : 0; // le dessus de la dalle, ou le socle d'un etage encore en plot
    const poteaux = new Map(); // "x,y" -> { piece, plein }
    const poteau = (x, y, piece, plein) => {
      const cle = `${x},${y}`;
      const p = poteaux.get(cle) || { x, y, piece, plein: false };
      p.plein ||= plein;
      poteaux.set(cle, p);
    };
    for (const p of plan.pieces) {
      // une case prend l'aspect de son premier lot ; sans lot, une piece vide
      const lot = lotsDe[p.k][0];
      const aspect = lot === undefined ? "todo" : aspectDe(rooms[lot]);
      const fini = aspect === "done" || aspect === "defect";
      const sol = z0 + (fini ? PARQUET : 0);
      // la dalle, ses rives sur les cotes de facade et ses angles saillants
      if (env.dalle) {
        pose("kit", "SLAB", p.cx, p.cy, 0, 0, p.k, { leve: false });
        for (const c of Object.values(p.cotes))
          if (!c.voisin)
            pose("kit", "SLAB_EDGE", ...c.axe, 0, c.rot, p.k, {
              leve: false,
              echelle: [c.segments.length, 1, 1],
            });
        const { avant, droite, arriere, gauche } = p.cotes;
        for (const [a, b, x, y, rot] of [
          [avant, gauche, p.cx - TRAME / 2, p.cy - TRAME / 2, 0],
          [avant, droite, p.cx + TRAME / 2, p.cy - TRAME / 2, 90],
          [arriere, droite, p.cx + TRAME / 2, p.cy + TRAME / 2, 180],
          [arriere, gauche, p.cx - TRAME / 2, p.cy + TRAME / 2, 270],
        ])
          if (!a.voisin && !b.voisin)
            pose("kit", "SLAB_CORNER", x, y, 0, rot, p.k, { leve: false });
      }
      // le sol : le parquet d'une piece finie ; en finitions, sur la moitie gauche seulement
      if (fini)
        pose("interieur", "FLOOR_WOOD", p.cx, p.cy, z0, 0, p.k, { leve: false });
      else if (aspect === "finishing")
        pose("interieur", "FLOOR_WOOD", p.cx - TRAME / 4, p.cy, z0, 0, p.k, {
          leve: false,
          echelle: [0.5, 1, 1],
        });

      // les cotes : facades selon le stade de l'etage, cloisons selon l'aspect de la piece
      const ferme = env.facades === "open" && aspect === "done"; // la travee d'un lot fini se ferme (building)
      const facades = ferme ? "brick" : env.facades;
      const cloison = {
        building: "BRICK",
        finishing: "RENDER",
        done: "RENDER",
        defect: "RENDER",
      }[aspect];
      for (const [cle, c] of Object.entries(p.cotes)) {
        c.segments.forEach(([x, y], s) => {
          // la porte de chaque piece : au milieu de son cote avant, et en face chez la piece de devant
          const d =
            cle === "avant" || (cle === "arriere" && c.voisin) ? "_DOOR" : "";
          const [nx, ny] = dedans(c.rot);
          let mur = true;
          if (c.voisin) {
            if (cloison)
              pose(
                "interieur",
                `PARTITION_${cloison}${d}`,
                x,
                y,
                z0,
                c.rot,
                p.k,
              );
            else mur = false;
          } else if (facades === "none" || facades === "open") {
            mur = false;
            // une rive ouverte : le garde-corps (protection laterale) ; un etage en plot : le trace de son emprise
            if (facades === "open")
              pose("kit", "GUARDRAIL", x, y, z0, c.rot, p.k);
            else if (!env.dalle)
              // la trame entiere (3 m au lieu des 2,70 m entre poteaux) : un trait continu, qui se rejoint aux angles
              pose(
                "interieur",
                "FLOOR_MARK",
                x + nx * 0.075,
                y + ny * 0.075,
                0,
                c.rot,
                p.k,
                { echelle: [TRAME / (TRAME - 0.3), 1, 1] },
              );
          } else {
            const crepi =
              facades === "render" &&
              !(aspect === "defect" && cle === "arriere");
            if (!c.plein)
              pose(
                "interieur",
                `WALL_${crepi ? "RENDER" : "BRICK"}_CUT${d}`,
                x,
                y,
                z0,
                c.rot,
                p.k,
              );
            else {
              pose(
                "kit",
                crepi ? "WALL_RENDER_WINDOW" : "WALL_BRICK_WINDOW",
                x,
                y,
                z0,
                c.rot,
                p.k,
              );
              // fenetres posees a partir des finitions (dans la brique, ou dans le pan rouvert d'un defaut)
              if (!crepi && facades !== "brick")
                pose("kit", "WINDOW", x, y, z0, c.rot, p.k);
            }
          }
          // en preparation, le trace des cloisons a venir, la ou aucun mur ne se tient encore
          if (aspect === "preparing" && !mur && env.dalle)
            pose(
              "interieur",
              "FLOOR_MARK",
              x + nx * 0.25,
              y + ny * 0.25,
              z0,
              c.rot,
              p.k,
            );
          // les poteaux aux deux bouts du segment : pleins si un mur plein du fond les tient
          const [ux, uy] = c.rot % 180 === 0 ? [TRAME / 2, 0] : [0, TRAME / 2];
          const plein = c.plein && !c.voisin;
          poteau(x - ux, y - uy, p.k, plein);
          poteau(x + ux, y + uy, p.k, plein);
        });
      }

      // le mobilier de l'aspect, contre le fond de la piece ; le milieu reste aux personnages (ancre room:n)
      const meuble = (nom, dx, dy, z = sol, rot = 0) =>
        pose("interieur", nom, p.cx + dx, p.cy + dy, z, rot, p.k);
      // 3.0.0 : une case de 3 x 3 m, 2,60 m entre les faces des murs ; le meme mobilier, resserre contre le fond
      if (aspect === "preparing") {
        meuble("SERVICE_STUBS", -0.8, 0.95);
        meuble("SERVICE_STUBS", 0.8, 0.95);
      } else if (aspect === "building") {
        meuble("SCAFFOLD_TOWER", -0.45, 0.8);
        meuble("PALLET", 0.85, 0.55, sol, 90);
      } else if (aspect === "finishing") {
        meuble("PLANK_STACK", 0.75, 0.6, sol, 90);
      } else if (aspect === "done") {
        meuble("TABLE", 0, 0.8);
      } else if (aspect === "defect") {
        meuble("TARP", -0.4, 0.6);
        meuble("STEPLADDER", -0.6, 0.75, sol + 0.02, 90);
        meuble("BUCKET", 0.6, 0.95, sol + 0.02);
      }
    }
    // les poteaux, ou leurs attentes d'armatures en fondations
    if (env.poteaux !== "none")
      for (const c of poteaux.values()) {
        const [modele, nom] =
          env.poteaux === "starter"
            ? ["kit", "COLUMN_STARTER"]
            : c.plein
              ? ["kit", "COLUMN"]
              : ["interieur", "COLUMN_CUT"];
        pose(modele, nom, c.x, c.y, z0, 0, c.piece);
      }
    return out;
  }

  // --- l'allegement : en qualite haute, au-dela du budget (socle compris), les rangees du fond passent aux pieces
  // _LOW, jusqu'a la rangee de devant s'il le faut
  const coutPieces = new Map();
  const cout = (objet) => {
    if (!coutPieces.has(objet)) coutPieces.set(objet, triangles(objet));
    return coutPieces.get(objet);
  };
  const rangee = (k) => plan.pieces[k].j;
  const choisit = (liste) => {
    const total = (seuil) =>
      liste.reduce(
        (s, p) => s + cout(source(p, basse || rangee(p.piece) >= seuil)),
        cout(socle),
      );
    let seuil = Infinity;
    if (!basse)
      for (
        let j = plan.rangees - 1;
        j >= 0 && total(seuil) > meta.budget.triangles;
        j--
      )
        seuil = j;
    return liste.map((p) => source(p, basse || rangee(p.piece) >= seuil));
  };

  // --- le socle maquette : dalle de terre de 0,60 m, dessus a y = 0, aretes arrondies (classe C3)
  const demiX = (plan.colonnes * TRAME) / 2 + MARGE;
  const demiY = (plan.rangees * TRAME) / 2 + MARGE;
  const b = SOCLE.chanfrein;
  const forme = new THREE.Shape();
  forme.moveTo(-demiX + b, -demiY + b);
  forme.lineTo(demiX - b, -demiY + b);
  forme.lineTo(demiX - b, demiY - b);
  forme.lineTo(-demiX + b, demiY - b);
  forme.closePath();
  const geometrieSocle = new THREE.ExtrudeGeometry(forme, {
    depth: SOCLE.epaisseur - 2 * b,
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 3,
  });
  geometrieSocle.rotateX(-Math.PI / 2);
  geometrieSocle.translate(0, -(SOCLE.epaisseur - b), 0);
  const terre = ctx.tokens.materiaux.MAT_EARTH;
  const materiauSocle = new THREE.MeshStandardMaterial({
    name: "MAT_EARTH",
    color: new THREE.Color(ctx.tokens.monde[terre.couleur]),
    roughness: terre.rugosite,
    metalness: terre.metal,
  });
  const socle = new THREE.Mesh(geometrieSocle, materiauSocle);

  // --- la vue : reconstruite a chaque setState ; un groupe ROOM_n par piece ; leves[k] : ce qui monte avec la piece k
  let leves = [];
  const ancres = {};
  const construit = (rooms, floor) => {
    root.clear();
    // le socle maquette au rez seulement : en etage, la coupe repose sur la dalle du batiment
    const index = Number(floor && floor.index);
    if (!(index > 1)) root.add(socle);
    const env = enveloppeDe(floor);
    // un groupe par case : ROOM_m (le premier lot de la case, userData.room) ou CELL_i_j sans lot ; le second lot d'une
    // case partagee a un groupe ROOM vide, pour sa reference
    const groupeLot = (m) => {
      const g = new THREE.Group();
      g.name = `ROOM_${m + 1}`;
      const room = rooms[m];
      g.userData.room = {
        index: m + 1,
        id: room && room.id !== undefined ? room.id : null,
      };
      root.add(g);
      return g;
    };
    const groupes = plan.pieces.map((p) => {
      const [premier, ...autres] = lotsDe[p.k];
      for (const m of autres) groupeLot(m);
      if (premier !== undefined) return groupeLot(premier);
      const g = new THREE.Group();
      g.name = `CELL_${p.i}_${p.j}`;
      root.add(g);
      return g;
    });
    leves = plan.pieces.map(() => []);
    const liste = poses(rooms, env);
    const objets = choisit(liste);
    liste.forEach((p, i) => {
      const piece = objets[i].clone(); // partage la geometrie et les materiaux du modele
      piece.position.set(...versThree(p.x, p.y, p.z));
      piece.rotation.set(0, rad(p.rot), 0);
      piece.scale.set(p.echelle[0], p.echelle[2], p.echelle[1]);
      if (p.modele === "interieur")
        piece.traverse((o) => {
          if (!o.isMesh) return;
          o.material = Array.isArray(o.material)
            ? o.material.map((m) => materiauxKit.get(m.name) || m)
            : materiauxKit.get(o.material.name) || o.material;
        });
      if (p.leve) leves[p.piece].push(piece);
      groupes[p.piece].add(piece);
    });
    root.traverse((o) => {
      if (o.isMesh) o.castShadow = o.receiveShadow = !basse;
    });
    socle.castShadow = false;
    // les ancres suivent la hauteur du sol de chaque piece
    const z0 = env.dalle ? DALLE : 0;
    ancres.label = versThree(0, (plan.rangees * TRAME) / 2, z0 + 3.6);
    for (const k of Object.keys(ancres)) if (k.startsWith("room:")) delete ancres[k];
    for (let m = 0; m < n; m++) {
      const p = plan.pieces[caseDuLot(m)];
      const a = aspectDe(rooms[lotsDe[p.k][0]]);
      const sol = z0 + (a === "done" || a === "defect" ? PARQUET : 0);
      ancres[`room:${m + 1}`] = versThree(p.cx, p.cy, sol);
    }
  };

  // --- la transition : t va de 0 (ferme) a OUVERTURE (ouvert) ; la piece k monte apres un delai, en MONTEE secondes
  const delai = (k) => (N > 1 ? (k / (N - 1)) * (OUVERTURE - MONTEE) : 0);
  let t = 0;
  const applique = () => {
    leves.forEach((liste, k) => {
      const s = adoucit(Math.min(Math.max((t - delai(k)) / MONTEE, 0), 1));
      for (const piece of liste) {
        piece.scale.y = Math.max(s, 1e-3);
        piece.visible = s > 0;
      }
    });
    root.visible = state === "default" || t > 0;
  };

  let state = "default";
  let rooms = [];
  let floor = null;
  construit(rooms, floor);
  if (ctx.reducedMotion) t = OUVERTURE;
  applique();

  return {
    root,
    setState(next, data = {}) {
      if (!meta.states.includes(next))
        throw new Error(`état inconnu : ${next}`);
      state = next;
      // sans data.rooms ni data.floor, la vue garde ce qu'elle montre (la fermeture n'a pas besoin de le redire)
      if (Array.isArray(data.rooms)) rooms = data.rooms;
      if (data.floor && typeof data.floor === "object") floor = data.floor;
      construit(rooms, floor);
      if (ctx.reducedMotion) t = state === "default" ? OUVERTURE : 0;
      applique();
    },
    update(dt) {
      if (ctx.reducedMotion) return false;
      const cible = state === "default" ? OUVERTURE : 0;
      if (t === cible) return false;
      t = cible > t ? Math.min(t + dt, cible) : Math.max(t - dt, cible);
      applique();
      return true;
    },
    anchor(name) {
      const p = ancres[name];
      if (!p) throw new Error(`ancre inconnue : ${name}`);
      return new THREE.Vector3(...p);
    },
    dispose() {
      root.clear();
      geometrieSocle.dispose();
      materiauSocle.dispose();
    },
  };
}
