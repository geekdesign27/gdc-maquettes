// Le batiment d'une application : son avancement se lit etage par etage (catalogue : building, version 2.0.0, lot G8).
// Production mixte, fiche validee par Pierre-Alain le 21 octobre 2026, brief valide le meme jour :
// - une fiche par etage, la plus ancienne en bas (data.floors, ADR 0013 de GDC) ; un lot par piece, une travee de
//   facade par piece, dans l'ordre avant, droite (les deux visibles en iso), arriere, gauche ; au-dela, deux lots
//   partagent une travee ;
// - six etages visibles au plus : la regle est ecrite une fois (src/etages.js) et injectee en ctx.groupFloors ;
// - chaque etage a son stade : plot (rien de construit), excavation et foundations (au sol la fouille, la pelle, les
//   semelles ; en etage la dalle a nu, puis les attentes), structure (poteaux, dalle, echafaudage ; la travee d'un lot
//   fini se ferme en brique), envelope (brique, baies brutes), finishing (fenetres posees, echafaudage depose),
//   inspection (crepi, vitres eteintes), completed (crepi, vitres de l'habite) ; tant que le rez n'est pas debout, les
//   etages au-dessus attendent en plot ;
// - la toiture coiffe le dernier etage ferme ; quand un etage du haut se ferme, elle remonte ;
// - la surelevation : au-dessus d'etages tous finis, l'etage en chantier n'a pas d'echafaudage tout autour mais une tour
//   d'une travee sur la facade droite, avec trois cones de balisage a son pied (sans badge : le defaut reste un cone
//   seul avec son badge), de excavation a envelope ;
// - l'emprise est fixe par type : house 2 x 2 trames, block 3 x 2, hall 4 x 2 (le rez de la halle est aveugle) ;
// - qualite basse : les pieces _LOW ; qualite haute : au-dela du budget, les etages du haut passent aux pieces _LOW ;
// - un etage qui change monte en 0,8 s depuis sa dalle, la toiture glisse a sa hauteur ; sans animation, l'etat final.
// Pour l'assemblage (survol partage, heure reelle) : un groupe FLOOR_n par etage visible (userData.floor), un groupe
// ROOM_n_m par piece (userData.room), les vitres de chaque etage nommees GLASS_FLOOR_n. Le composant ne gere aucun
// evenement : les identifiants viennent de data.floors, il les repete sans les interpreter.
// Version 2.1.0 (plan D-1b, decision de Pierre-Alain du 22 octobre 2026) : moins d'appels de dessin. A chaque
// construction, les pieces posees dans un meme groupe (la parcelle, un etage, une piece, la toiture) sont fusionnees
// par materiau : un maillage par materiau et par groupe au lieu d'un par piece. Les groupes, leurs noms, leurs
// userData, les ancres et les transitions ne changent pas ; la pelleteuse, animee, reste a part.
// Les modeles sont partages entre instances : on ne libere jamais leurs geometries ni leurs materiaux ici ; seuls le
// verre eclaire et les geometries fusionnees, crees par ce composant, sont liberes. Aucune couleur d'etat dans la
// scene ; aucun texte.

const KIT = "kit:building-kit/BLD_KIT_A_v003.glb";
const PARCELLE = "BLD_SITEWORK_A_v002.glb";
const PELLETEUSE = "machine:excavator/VEH_EXCAVATOR_A_v001.glb";
const CLIP_PELLETEUSE = "ANM_EXCAVATOR_A_DIGGING";
const IMAGE_FIXE = 150 / 30; // sans animation : fleche levee, tournee vers le tas, godet plein (comme excavator)
// La pelleteuse au fond de la fouille : elle creuse vers le fond en biais, et son quart de tour a droite amene le godet
// (vide a 4,7 m de la tourelle) au-dessus du tas de deblais. Chenilles et queue de tourelle restent dans le fond.
const PELLE_RECUL = 2.4; // du bord droit de l'emprise au centre des chenilles
const PELLE_Y = -1.2;
const PELLE_LACET = 200; // degres : 180 (face au fond) + 20 (en biais vers la gauche)
const K = "BLD_KIT_A_";
const S = "BLD_SITEWORK_A_";
const TRAME = 3.0;
const ETAGE = 3.0;
const DALLE = 0.3;
const RIVE = 0.2;
const DEBORD_ECHAFAUDAGE = 0.3 + 0.8 - 0.04 - RIVE / 2; // du garde-corps de rive au bord exterieur du plancher
const FOUILLE = 0.5; // profondeur de la fouille
const MARGE_FOUILLE = 1.1; // du nu de l'emprise au bord de la fouille (fond 0,60 m et talus de 0,50 m)
const CONES = 2.1; // du nu de la facade droite au centre des cones, au pied de la tour d'echafaudage
const PIECE = 1.5; // de la facade au centre d'une piece (une travee de 3 m, une case de profondeur)
const TRANSITION = 0.8; // secondes
const EMPRISE = { house: 2, block: 3, hall: 4 }; // trames de facade ; 2 de profondeur
// les stades, du moins avance au plus avance (src/etages.js)
const STADES = [
  "plot",
  "excavation",
  "foundations",
  "structure",
  "envelope",
  "finishing",
  "inspection",
  "completed",
];
const rang = (stade) => STADES.indexOf(stade);
const R = Object.fromEntries(STADES.map((s, i) => [s, i]));

export const meta = {
  id: "building",
  version: "2.1.0",
  category: "building",
  states: [
    "plot",
    "excavation",
    "foundations",
    "structure",
    "envelope",
    "finishing",
    "completed",
    "inspection",
  ],
  params: {
    type: {
      type: "enum",
      values: ["house", "block", "hall"],
      default: "block",
    },
  },
  anchors: ["label", "badge", "progress", "door", "floor:*", "room:*"],
  budget: { triangles: 20000, materials: 10 },
  animated: true,
  assets: [PARCELLE, KIT, PELLETEUSE],
};

const versThree = (x, y, z) => [x, z, -y];
const adoucit = (t) => 1 - Math.pow(1 - t, 3);

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

// La trame d'un batiment de nx x ny travees centre sur l'origine (Blender : avant vers -Y) : axes, cases, facades, et
// le pourtour, les travees de facade dans l'ordre ou les lots les prennent.
function trame(nx, ny) {
  const ax = Array.from({ length: nx + 1 }, (_, i) => (i - nx / 2) * TRAME);
  const ay = Array.from({ length: ny + 1 }, (_, j) => (j - ny / 2) * TRAME);
  const cx = ax.slice(0, -1).map((x) => x + TRAME / 2);
  const cy = ay.slice(0, -1).map((y) => y + TRAME / 2);
  const [x0, x1, y0, y1] = [ax[0], ax[nx], ay[0], ay[ny]];
  // chaque facade : rotation de ses pieces, normale exterieure, points des travees dans l'ordre du x local
  const facades = {
    avant: {
      rot: 0,
      n: [0, -1],
      points: cx.map((x) => [x, y0]),
      centre: [0, y0],
      long: nx,
    },
    droite: {
      rot: 90,
      n: [1, 0],
      points: cy.map((y) => [x1, y]),
      centre: [x1, 0],
      long: ny,
    },
    arriere: {
      rot: 180,
      n: [0, 1],
      points: [...cx].reverse().map((x) => [x, y1]),
      centre: [0, y1],
      long: nx,
    },
    gauche: {
      rot: 270,
      n: [-1, 0],
      points: [...cy].reverse().map((y) => [x0, y]),
      centre: [x0, 0],
      long: ny,
    },
  };
  const angles = [
    [x0, y0, 0],
    [x1, y0, 90],
    [x1, y1, 180],
    [x0, y1, 270],
  ];
  const pourtour = [];
  for (const cle of ["avant", "droite", "arriere", "gauche"])
    facades[cle].points.forEach((p, i) => pourtour.push({ cle, i, p }));
  return { nx, ny, ax, ay, cx, cy, facades, angles, pourtour };
}

export function create(THREE, params, ctx) {
  const kit = ctx.assets[KIT].scene;
  const parcelle = ctx.assets[PARCELLE].scene;
  const root = new THREE.Group();
  root.name = "building";
  root.userData.component = meta.id;
  const basse = ctx.quality === "low";

  // La pelleteuse : une copie par instance, ajoutee au root seulement quand le rez est en excavation. Qualite basse
  // (bible 18.3) : ses noeuds *_DETAIL (petits galets, patins, lame, verins) sont retires.
  const pelle = ctx.assets[PELLETEUSE].scene;
  const details = [];
  pelle.traverse((o) => {
    if (basse && o.name.endsWith("_DETAIL")) details.push(o);
  });
  for (const o of details) o.removeFromParent();

  // Un materiau par MAT_ (bible, 17) : chaque GLB charge sa propre copie d'un meme materiau (MAT_SURFACE des bandes des
  // cones et du crepi, MAT_EARTH du socle et du godet) ; le batiment n'en garde qu'une, celle du premier modele qui
  // l'a. Ce sont toujours des materiaux des modeles, partages, jamais liberes ici.
  const parNom = new Map();
  for (const modele of [
    ctx.assets[KIT].scene,
    ctx.assets[PARCELLE].scene,
    pelle,
  ])
    modele.traverse((o) => {
      if (o.isMesh && !parNom.has(o.material.name))
        parNom.set(o.material.name, o.material);
    });
  const unique = (m) => parNom.get(m.name) || m;
  pelle.traverse((o) => {
    if (o.isMesh) o.material = unique(o.material);
  });
  const mixer = new THREE.AnimationMixer(pelle);
  const creuse = mixer.clipAction(
    THREE.AnimationClip.findByName(
      ctx.assets[PELLETEUSE].animations,
      CLIP_PELLETEUSE,
    ),
  );

  const type = meta.params.type.values.includes(params.type)
    ? params.type
    : meta.params.type.default;
  const t = trame(EMPRISE[type], 2);
  const porte = Math.floor((t.nx - 1) / 2); // travee de la porte, sur la facade avant

  // Le verre des fenetres de l'habite (MAT_GLASS_LIT) : en theme sombre, il luit un peu.
  const lit = ctx.tokens.materiaux.MAT_GLASS_LIT;
  const couleurLit = new THREE.Color(ctx.tokens.monde[lit.couleur]);
  const verreEclaire = new THREE.MeshStandardMaterial({
    name: "MAT_GLASS_LIT",
    color: couleurLit,
    roughness: lit.rugosite,
    metalness: lit.metal,
    emissive: couleurLit,
    emissiveIntensity: ctx.theme === "dark" ? 0.6 : 0.15,
  });

  // Les etages visibles, du bas vers le haut, chacun a son stade affiche. Sans data.floors (ou une liste vide hors du
  // plot), un etage au stade de l'etat ; une liste vide en plot : la parcelle seule (projet ouvert, aucune fiche).
  const etages = (state, floors) => {
    const liste = Array.isArray(floors) ? floors : null;
    let visibles;
    if (liste && (liste.length || state === "plot"))
      visibles = ctx.groupFloors(liste, state);
    else
      visibles = [
        {
          index: 1,
          ids: [null],
          stage: state,
          rooms: [],
          occupied: false,
          grouped: false,
        },
      ];
    // tant que le rez n'est pas debout (structure), les etages au-dessus attendent en plot (decision du brief)
    const debout = visibles.length && rang(visibles[0].stage) >= R.structure;
    return visibles.map((f, k) => ({
      ...f,
      affiche: k > 0 && !debout ? "plot" : f.stage,
    }));
  };

  // Les travees de chaque piece d'un etage : la piece m prend la travee m du pourtour ; au-dela, deux lots partagent
  // une travee. Rend, par travee du pourtour, la liste des pieces qui l'occupent.
  const travees = (rooms) => {
    const parTravee = t.pourtour.map(() => []);
    rooms.forEach((r, m) => parTravee[m % t.pourtour.length].push(m));
    return parTravee;
  };

  // --- le plan : une liste de poses { modele, nom, x, y, z, rot, echelle, niveau, eclaire, groupe }
  function plan(visibles) {
    const poses = [];
    const pose = (nom, x, y, z, rot = 0, extra = {}) =>
      poses.push({
        modele: "kit",
        nom,
        x,
        y,
        z,
        rot,
        echelle: [1, 1, 1],
        niveau: 0,
        eclaire: false,
        groupe: "root",
        ...extra,
      });
    const terrain = (nom, x = 0, y = 0, rot = 0, echelle = [1, 1, 1]) =>
      poses.push({
        modele: "parcelle",
        nom,
        x,
        y,
        z: 0,
        rot,
        echelle,
        niveau: 0,
        eclaire: false,
        groupe: "root",
      });

    // une dalle entiere : une case etiree sur l'emprise, une rive etiree par facade (bouts vifs : exact), les angles
    const dalle = (z, o) => {
      pose("SLAB", 0, 0, z, 0, { ...o, echelle: [t.nx, t.ny, 1] });
      for (const f of Object.values(t.facades))
        pose("SLAB_EDGE", ...f.centre, z, f.rot, {
          ...o,
          echelle: [f.long, 1, 1],
        });
      for (const [x, y, rot] of t.angles) pose("SLAB_CORNER", x, y, z, rot, o);
    };
    // une piece par travee (garde-corps, echafaudage : leurs montants ne s'etirent pas en qualite haute)
    const parTravee = (
      nom,
      z,
      o,
      decalage = 0,
      facades = Object.keys(t.facades),
      seules = null, // index des travees retenues, par facade (la tour de la surelevation)
    ) => {
      for (const cle of facades) {
        const f = t.facades[cle];
        const [dx, dy] = [f.n[0] * decalage, f.n[1] * decalage];
        // qualite basse : une seule piece etiree sur la facade (garde-corps : il deborde d'une demi-rive a chaque bout)
        if (basse && !seules) {
          const long =
            nom === "GUARDRAIL"
              ? (f.long * TRAME + RIVE) / (TRAME + RIVE)
              : f.long;
          pose(nom, f.centre[0] + dx, f.centre[1] + dy, z, f.rot, {
            ...o,
            echelle: [long, 1, 1],
          });
        } else
          f.points.forEach(([x, y], i) => {
            if (!seules || seules.includes(i))
              pose(nom, x + dx, y + dy, z, f.rot, o);
          });
      }
    };
    const poteaux = (k, o, interieurs) => {
      for (const [i, x] of t.ax.entries())
        for (const [j, y] of t.ay.entries()) {
          const bord = i === 0 || i === t.nx || j === 0 || j === t.ny;
          if (bord || interieurs) pose("COLUMN", x, y, DALLE + k * ETAGE, 0, o);
        }
    };
    // une travee de facade selon la finition ; la halle : rez aveugle, grande baie sous poutre a la porte
    const travee = (cle, i, k, finition, eclaire) => {
      const entree = cle === "avant" && i === porte && k === 0;
      if (type === "hall" && k === 0) {
        if (entree) return [["BEAM", false]];
        return [[finition === "crepi" ? "WALL_RENDER" : "WALL_BRICK", false]];
      }
      if (entree) {
        if (finition === "brute") return [["WALL_BRICK_DOOR", false]];
        if (finition === "menuiseries")
          return [
            ["WALL_BRICK_DOOR", false],
            ["DOOR", false],
          ];
        return [
          ["WALL_RENDER_DOOR", false],
          ["CANOPY", false],
        ];
      }
      if (finition === "brute") return [["WALL_BRICK_WINDOW", false]];
      if (finition === "menuiseries")
        return [
          ["WALL_BRICK_WINDOW", false],
          ["WINDOW", false],
        ];
      return [["WALL_RENDER_WINDOW", eclaire]];
    };
    // l'echafaudage des etages de..a-1 (a exclu), garde-corps au plancher a ; chaque plancher appartient a son etage
    // (groupeDe). Qualite basse : une seule piece par facade (ou par travee retenue), etiree sur toute la hauteur
    // (bible 18.3 : sous 0,30 m, on fusionne)
    const echafaudage = (de, a, facades, seules, groupeDe) => {
      if (a <= de) return;
      if (basse)
        for (const cle of facades) {
          const f = t.facades[cle];
          const morceaux = seules
            ? seules.map((i) => [f.points[i], 1])
            : [[f.centre, f.long]];
          for (const [[x, y], long] of morceaux)
            pose("SCAFFOLD", x, y, de * ETAGE, f.rot, {
              niveau: de,
              groupe: groupeDe(de),
              echelle: [long, 1, a - de],
            });
        }
      else
        for (let k = de; k < a; k++)
          parTravee(
            "SCAFFOLD",
            k * ETAGE,
            { niveau: k, groupe: groupeDe(k) },
            0,
            facades,
            seules,
          );
      parTravee(
        "GUARDRAIL",
        a * ETAGE,
        { niveau: a - 1, groupe: groupeDe(a - 1) },
        DEBORD_ECHAFAUDAGE,
        facades,
        seules,
      );
    };
    const toiture = (k, gardeCorps, o) => {
      const z = (k + 1) * ETAGE + DALLE; // dessus de la dalle du plafond
      if (type === "house") {
        for (const x of t.cx) {
          pose("ROOF_SLOPE", x, 0, z, 0, o);
          pose("ROOF_SLOPE", x, 0, z, 180, o);
        }
        pose("ROOF_GABLE", t.ax[t.nx], 0, z, 90, o);
        pose("ROOF_GABLE", t.ax[0], 0, z, 270, o);
        return;
      }
      for (const f of Object.values(t.facades))
        pose("ROOF_PARAPET", ...f.centre, z, f.rot, {
          ...o,
          echelle: [f.long, 1, 1],
        });
      for (const [x, y, rot] of t.angles)
        pose("ROOF_PARAPET_CORNER", x, y, z, rot, o);
      if (gardeCorps) parTravee("GUARDRAIL", z + 0.5, o); // l'acrotere est bas : protection pendant les travaux
    };

    const rez = visibles[0];
    const rezStade = rez ? rez.affiche : "plot";

    // le terrain : la parcelle, ou la fouille du rez
    if (rang(rezStade) <= R.plot) {
      terrain(`PLOT_${t.nx}X2`);
      for (const [x, y, rot] of t.angles) terrain("BATTER_BOARD", x, y, rot);
      // le tracage de l'emprise sur les axes : une ligne etiree par facade, qui chevauche l'autre aux angles
      for (const f of Object.values(t.facades))
        terrain("LAYOUT_LINE", ...f.centre, f.rot, [
          (f.long * TRAME + 0.15) / TRAME,
          1,
          1,
        ]);
    } else if (rang(rezStade) <= R.foundations) {
      terrain(`PIT_${t.nx}X2`);
      // le tas de deblais sur la marge droite, entre la fouille et le bord du socle, dans le sens de la profondeur
      terrain("SPOIL_HEAP", t.ax[t.nx] + MARGE_FOUILLE + 0.9, 0.4, 90);
    } else {
      terrain(`PLOT_${t.nx}X2`);
      if (type !== "hall" && rang(rezStade) >= R.envelope)
        pose("STEPS", ...t.facades.avant.points[porte], 0, 0);
      if (rezStade === "completed")
        pose("SIGN_TOTEM", t.ax[0] - 0.8, t.ay[0] - 1.8, 0);
    }

    // chaque etage a son stade
    const salles = []; // les pieces de chaque etage : { n, m, travee }
    visibles.forEach((f, k) => {
      const n = f.index;
      const o = { niveau: k, groupe: `F${n}` };
      const s = f.affiche;
      const sol = k * ETAGE + DALLE; // dessus de la dalle de l'etage
      if (s === "foundations") {
        if (k === 0) {
          for (const x of t.ax)
            for (const y of t.ay) {
              pose("FOOTING", x, y, 0, 0, o);
              pose("COLUMN_STARTER", x, y, 0, 0, o);
            }
          for (const y of t.ay)
            for (const x of t.cx) pose("FOUNDATION_STRIP", x, y, 0, 0, o);
          for (const x of t.ax)
            for (const y of t.cy) pose("FOUNDATION_STRIP", x, y, 0, 90, o);
        } else
          for (const x of t.ax)
            for (const y of t.ay) pose("COLUMN_STARTER", x, y, sol, 0, o);
      }
      // en etage, la dalle a nu (excavation, foundations) : garde-corps de rive (SST)
      if (k > 0 && (s === "excavation" || s === "foundations"))
        parTravee("GUARDRAIL", sol, o);
      // chaque piece a son ancre, a tout stade (l'anneau du survol, le personnage de son lot)
      f.rooms.forEach((r, m) => {
        const tr = m % t.pourtour.length;
        salles.push({ n, m: m + 1, travee: t.pourtour[tr], room: r, floor: f });
      });
      if (rang(s) < R.structure) return;

      if (k === 0) dalle(0, o);
      poteaux(k, o, s === "structure");
      dalle((k + 1) * ETAGE, o);
      const finition =
        s === "structure" || s === "envelope"
          ? "brute"
          : s === "finishing"
            ? "menuiseries"
            : "crepi";
      const occupe = travees(f.rooms);
      t.pourtour.forEach(({ cle, i, p }, tr) => {
        const pieces = occupe[tr];
        // en structure, seule la travee d'un lot fini se ferme (toutes ses pieces finies)
        if (
          s === "structure" &&
          !(pieces.length && pieces.every((m) => f.rooms[m] && f.rooms[m].done))
        )
          return;
        const groupe = pieces.length ? `R${n}_${pieces[0] + 1}` : o.groupe;
        for (const [nom, eclaire] of travee(
          cle,
          i,
          k,
          finition,
          s === "completed",
        ))
          pose(nom, ...p, DALLE + k * ETAGE, t.facades[cle].rot, {
            niveau: k,
            groupe,
            eclaire,
          });
      });
    });

    // la toiture coiffe le dernier etage debout, si rien ne se construit au-dessus (un plot ne compte pas)
    let haut = -1;
    visibles.forEach((f, k) => {
      if (rang(f.affiche) >= R.structure) haut = k;
    });
    let toit = null;
    if (haut >= 0) {
      const f = visibles[haut];
      const dessus = visibles[haut + 1];
      if (!dessus || dessus.affiche === "plot") {
        const o = { niveau: haut, groupe: "TOIT" };
        if (rang(f.affiche) >= R.envelope) {
          toiture(haut, f.affiche === "envelope", o);
          toit = { k: haut, z: (haut + 1) * ETAGE + DALLE };
        } else
          parTravee("GUARDRAIL", (haut + 1) * ETAGE + DALLE, {
            niveau: haut,
            groupe: `F${f.index}`,
          }); // le dernier plancher coule (SST)
      }
    }

    // les echafaudages : la surelevation (une tour et ses cones), ou tout autour jusqu'a l'etage le plus haut qui en a
    // la surelevation : un seul etage en chantier, juste au-dessus d'etages tous finis (les plots au-dessus ne comptent
    // pas) ; deux etages en chantier, c'est un chantier ordinaire, echafaude tout autour
    let finis = 0;
    while (finis < visibles.length && visibles[finis].affiche === "completed")
      finis++;
    const chantier = visibles.filter(
      (f) => f.affiche !== "completed" && f.affiche !== "plot",
    );
    const sureleve =
      finis > 0 && chantier.length === 1 && chantier[0] === visibles[finis];
    const s = sureleve ? visibles[finis].affiche : null;
    // la tour monte jusqu'au plancher de travail : la dalle a nu, ou le haut de l'etage en structure et en enveloppe
    const tour =
      s && rang(s) >= R.excavation && rang(s) <= R.envelope
        ? finis + (rang(s) >= R.structure ? 1 : 0)
        : 0;
    if (tour > 0) {
      echafaudage(0, tour, ["droite"], [0], () => "root");
      const [x, y] = t.facades.droite.points[0];
      terrain("CONE_GROUP", x + CONES, y, 90);
    } else {
      // un chantier ordinaire : chaque etage en structure ou en enveloppe a son echafaudage, pose sur l'etage du dessous
      // s'il est debout ; les etages finis, en second oeuvre ou en reception restent visibles (lisibilite d'abord)
      const echafaude = (f) =>
        f && (f.affiche === "structure" || f.affiche === "envelope");
      for (let k = 0; k < visibles.length; k++) {
        if (!echafaude(visibles[k]) || echafaude(visibles[k - 1])) continue;
        let a = k;
        while (echafaude(visibles[a])) a++;
        echafaudage(
          k,
          a,
          Object.keys(t.facades),
          null,
          (n) => `F${visibles[n].index}`,
        );
      }
    }
    return { poses, salles, toit, rezStade };
  }

  // --- les pieces : _LOW en qualite basse, ou pour les niveaux a partir de seuil (allegement de la qualite haute)
  const modeles = { kit: [kit, K], parcelle: [parcelle, S] };
  const source = (p, legere) => {
    const [modele, prefixe] = modeles[p.modele];
    const objet =
      (legere && modele.getObjectByName(prefixe + p.nom + "_LOW")) ||
      modele.getObjectByName(prefixe + p.nom);
    if (!objet) throw new Error(`pièce absente du modèle : ${prefixe + p.nom}`);
    return objet;
  };
  const coutPieces = new Map();
  const cout = (objet) => {
    if (!coutPieces.has(objet)) coutPieces.set(objet, triangles(objet));
    return coutPieces.get(objet);
  };
  const choisit = (poses) => {
    const total = (seuil) =>
      poses.reduce(
        (n, p) => n + cout(source(p, basse || p.niveau >= seuil)),
        0,
      );
    let seuil = Infinity;
    if (!basse) {
      const hauts = [...new Set(poses.map((p) => p.niveau))].sort(
        (a, b) => b - a,
      );
      for (const niveau of hauts) {
        if (total(seuil) < meta.budget.triangles) break; // sous le plafond, pas a son niveau
        if (niveau === 0) break; // le rez reste plein
        seuil = niveau;
      }
    }
    return poses.map((p) => source(p, basse || p.niveau >= seuil));
  };

  // --- la fusion (2.1.0) : dans un groupe, chaque piece posee (copie d'une piece du modele) est remplacee par un
  // maillage par materiau, ses sommets portes dans le repere du groupe. Les vitres d'un etage restent entre elles (leur
  // nom GLASS_FLOOR_n et leur userData.glass servent a l'heure reelle).
  let fusions = []; // les geometries fusionnees de la construction en cours
  const libereFusions = () => {
    for (const g of fusions) g.dispose();
    fusions = [];
  };
  // la matrice d'un maillage dans le repere de son groupe (matrices locales a jour)
  const dansLeGroupe = (o, conteneur) => {
    const m = new THREE.Matrix4();
    for (let x = o; x !== conteneur; x = x.parent) m.premultiply(x.matrix);
    return m;
  };
  // ce que la fusion sait reporter : un maillage simple, d'un materiau, sommets, normales et uv seulement (les uv, quand
  // le materiau a une texture : le kit n'en a pas) ; une piece qui a autre chose (squelette, morphes, couleurs de
  // sommets, texture sans uv...) reste telle quelle
  const texture = (m) => Object.values(m).some((v) => v && v.isTexture);
  const ATTRIBUTS = new Set(["position", "normal", "uv"]);
  const fusionnable = (o) =>
    !o.isSkinnedMesh &&
    !o.isInstancedMesh &&
    !Array.isArray(o.material) &&
    o.geometry.attributes.normal &&
    !Object.keys(o.geometry.morphAttributes).length &&
    (!texture(o.material) || o.geometry.attributes.uv) &&
    Object.keys(o.geometry.attributes).every((a) => ATTRIBUTS.has(a));
  const affiche = (o, conteneur) => {
    for (let x = o; x !== conteneur; x = x.parent) if (!x.visible) return false;
    return true;
  };
  const fusionne = (conteneur, apart) => {
    const lots = new Map(); // materiau et nom -> { exemple, uv, parties : [{ geometrie, matrice }] }
    const pieces = conteneur.children.filter((c) => {
      if (apart.has(c)) return false;
      let ok = true;
      c.traverse((o) => {
        // un maillage que la fusion ne sait pas reporter, ou un autre objet qui se voit (ligne, points, sprite, lumiere)
        if (o.isMesh ? !fusionnable(o) : o.isLine || o.isPoints || o.isSprite || o.isLight) ok = false;
      });
      return ok;
    });
    for (const piece of pieces)
      piece.traverse((o) => {
        if (!o.isMesh || !affiche(o, conteneur)) return;
        const uv = texture(o.material);
        const cle = `${o.material.uuid}|${o.userData.glass ? o.name : ""}`;
        if (!lots.has(cle)) lots.set(cle, { exemple: o, uv, parties: [] });
        lots.get(cle).parties.push({
          geometrie: o.geometry,
          matrice: dansLeGroupe(o, conteneur),
        });
      });
    for (const piece of pieces) conteneur.remove(piece);
    const v = new THREE.Vector3();
    const normales = new THREE.Matrix3();
    for (const { exemple, uv, parties } of lots.values()) {
      let sommets = 0;
      let indices = 0;
      for (const { geometrie: g } of parties) {
        sommets += g.attributes.position.count;
        indices += g.index ? g.index.count : g.attributes.position.count;
      }
      const position = new Float32Array(sommets * 3);
      const normal = new Float32Array(sommets * 3);
      const coords = uv ? new Float32Array(sommets * 2) : null;
      const index = new (sommets > 65535 ? Uint32Array : Uint16Array)(indices);
      let s = 0;
      let i = 0;
      for (const { geometrie: g, matrice } of parties) {
        normales.getNormalMatrix(matrice);
        const miroir = matrice.determinant() < 0; // une piece en miroir : ses triangles changent de sens
        const p = g.attributes.position;
        const n = g.attributes.normal;
        for (let k = 0; k < p.count; k++) {
          v.fromBufferAttribute(p, k)
            .applyMatrix4(matrice)
            .toArray(position, (s + k) * 3);
          v.fromBufferAttribute(n, k)
            .applyMatrix3(normales)
            .normalize()
            .toArray(normal, (s + k) * 3);
          if (uv) {
            coords[(s + k) * 2] = g.attributes.uv.getX(k);
            coords[(s + k) * 2 + 1] = g.attributes.uv.getY(k);
          }
        }
        const nb = g.index ? g.index.count : p.count;
        const sommet = (k) => (g.index ? g.index.getX(k) : k) + s;
        for (let k = 0; k < nb; k += 3) {
          index[i++] = sommet(k);
          index[i++] = sommet(miroir ? k + 2 : k + 1);
          index[i++] = sommet(miroir ? k + 1 : k + 2);
        }
        s += p.count;
      }
      const geometrie = new THREE.BufferGeometry();
      geometrie.setAttribute(
        "position",
        new THREE.BufferAttribute(position, 3),
      );
      geometrie.setAttribute("normal", new THREE.BufferAttribute(normal, 3));
      if (uv) geometrie.setAttribute("uv", new THREE.BufferAttribute(coords, 2));
      geometrie.setIndex(new THREE.BufferAttribute(index, 1));
      fusions.push(geometrie);
      const maillage = new THREE.Mesh(geometrie, exemple.material);
      maillage.name = exemple.userData.glass
        ? exemple.name
        : `${conteneur.name}_${exemple.material.name}`;
      if (exemple.userData.glass)
        maillage.userData.glass = { ...exemple.userData.glass };
      maillage.castShadow = maillage.receiveShadow = !basse;
      conteneur.add(maillage);
    }
  };

  const ancres = {};
  const groupes = new Map(); // cle -> THREE.Group, a chaque construction
  let precedent = null; // la signature de chaque etage a la construction precedente
  let dernierToit = null; // la derniere hauteur de la toiture, meme deposee : elle remonte de la
  const transitions = new Map(); // groupe -> { t, de } ; de : null pour monter, sinon la hauteur de depart

  const construit = (state, floors, anime) => {
    root.clear();
    libereFusions();
    groupes.clear();
    transitions.clear();
    const visibles = etages(state, floors);
    const { poses, salles, toit, rezStade } = plan(visibles);
    const objets = choisit(poses);

    // les groupes : un par etage visible, une piece par lot dans son etage, la toiture (de son etage)
    const groupe = (cle) => {
      if (groupes.has(cle)) return groupes.get(cle);
      if (cle === "root") return root;
      const g = new THREE.Group();
      let parent = root;
      if (cle[0] === "F") {
        const f = visibles.find((v) => `F${v.index}` === cle);
        g.name = `FLOOR_${f.index}`;
        g.userData.floor = { index: f.index, ids: f.ids, grouped: f.grouped };
      } else if (cle[0] === "R") {
        const [n, m] = cle.slice(1).split("_").map(Number);
        const f = visibles.find((v) => v.index === n);
        const r = f.rooms[m - 1] || {};
        g.name = `ROOM_${n}_${m}`;
        g.userData.room = {
          floor: n,
          index: m,
          floorId: f.grouped ? null : f.ids[0],
          id: r.id === undefined ? null : r.id,
        };
        parent = groupe(`F${n}`);
      } else {
        g.name = "ROOF";
        const f = visibles[toit.k];
        g.userData.floor = { index: f.index, ids: f.ids, grouped: f.grouped };
      }
      parent.add(g);
      groupes.set(cle, g);
      return g;
    };

    poses.forEach((p, i) => {
      const piece = objets[i].clone(); // partage la geometrie et les materiaux du modele
      piece.position.set(...versThree(p.x, p.y, p.z));
      piece.rotation.set(0, THREE.MathUtils.degToRad(p.rot), 0);
      piece.scale.set(p.echelle[0], p.echelle[2], p.echelle[1]);
      piece.traverse((o) => {
        if (!o.isMesh) return;
        if (p.eclaire && o.material.name === "MAT_GLASS")
          o.material = verreEclaire;
        else o.material = unique(o.material);
      });
      groupe(p.groupe).add(piece);
    });
    if (rezStade === "excavation") {
      pelle.position.set(
        ...versThree(t.ax[t.nx] - PELLE_RECUL, PELLE_Y, -FOUILLE),
      );
      pelle.rotation.set(0, THREE.MathUtils.degToRad(PELLE_LACET), 0);
      root.add(pelle);
    }
    // les vitres de chaque etage, nommees pour l'heure reelle (day-night) : l'assemblage les eclaire la nuit
    for (const f of visibles) {
      const g = groupes.get(`F${f.index}`);
      if (!g) continue;
      g.traverse((o) => {
        if (o.isMesh && /^MAT_GLASS/.test(o.material.name)) {
          o.name = `GLASS_FLOOR_${f.index}`;
          o.userData.glass = { floor: f.index, occupied: f.occupied };
        }
      });
    }
    root.traverse((o) => {
      if (o.isMesh) o.castShadow = o.receiveShadow = !basse;
    });

    // les ancres, sur l'etat final (avant toute transition)
    root.updateMatrixWorld(true);
    const boite = new THREE.Box3().setFromObject(root);
    const hauteur = Math.max(boite.max.y, DALLE);
    const avant = t.ay[0];
    const [xPorte] = t.facades.avant.points[porte];
    for (const cle of Object.keys(ancres)) delete ancres[cle];
    Object.assign(ancres, {
      label: versThree(0, 0, hauteur + 1.5),
      // en excavation, le coin de l'emprise est cache par la pelleteuse : le badge passe au coin de la fouille, au sol
      badge:
        rezStade === "excavation"
          ? versThree(t.ax[t.nx] + MARGE_FOUILLE, avant - MARGE_FOUILLE, 0)
          : versThree(t.ax[t.nx], avant, hauteur + 0.6),
      progress: versThree(0, avant - 1.2, hauteur + 0.6),
      door: versThree(xPorte, avant - RIVE - 0.9, 0),
    });
    const base = (f, k) =>
      k === 0
        ? rang(f.affiche) >= R.structure
          ? DALLE
          : 0
        : k * ETAGE + DALLE;
    visibles.forEach((f, k) => {
      ancres[`floor:${f.index}`] = versThree(0, 0, base(f, k));
    });
    for (const s of salles) {
      const { p, cle } = s.travee;
      const nrm = t.facades[cle].n;
      const k = s.n - 1;
      ancres[`room:${s.n}-${s.m}`] = versThree(
        p[0] - nrm[0] * PIECE,
        p[1] - nrm[1] * PIECE,
        base(visibles[k], k),
      );
    }

    // la fusion, apres les ancres (calculees sur les pieces posees) et avant les transitions (qui bougent les groupes)
    const apart = new Set([...groupes.values(), pelle]);
    for (const conteneur of [root, ...groupes.values()])
      fusionne(conteneur, apart);

    // les transitions : un etage qui change monte depuis sa dalle ; la toiture remonte d'ou elle etait
    const signature = new Map(
      visibles.map((f) => [
        f.index,
        `${f.affiche}|${f.rooms.filter((r) => r && r.done).length}`,
      ]),
    );
    if (anime && precedent && !ctx.reducedMotion) {
      for (const f of visibles) {
        const g = groupes.get(`F${f.index}`);
        if (g && precedent.get(f.index) !== signature.get(f.index))
          transitions.set(g, { t: 0, de: null, base: base(f, f.index - 1) });
      }
      const g = groupes.get("TOIT");
      // une toiture qui n'a jamais ete posee arrive avec son etage, d'un niveau plus bas
      const depart =
        dernierToit === null ? toit && toit.z - ETAGE : dernierToit;
      if (g && depart !== toit.z)
        transitions.set(g, { t: 0, de: depart - toit.z });
      applique(0);
    }
    precedent = signature;
    if (toit) dernierToit = toit.z;
  };

  // pose chaque transition a l'avancement u (0 a 1)
  const applique = (dt) => {
    for (const [g, tr] of transitions) {
      tr.t = Math.min(tr.t + dt / TRANSITION, 1);
      const u = adoucit(tr.t);
      if (tr.de === null) {
        const s = Math.max(u, 0.02);
        g.scale.y = s;
        g.position.y = tr.base * (1 - s);
      } else g.position.y = tr.de * (1 - u);
      if (tr.t >= 1) {
        g.scale.y = 1;
        g.position.y = 0;
        transitions.delete(g);
      }
    }
  };

  // le cycle de creusement : joue quand le rez est en excavation ; avec reducedMotion, une image fixe et lisible
  const joue = () => {
    creuse.stop();
    if (pelle.parent === root) {
      creuse.reset().play();
      if (ctx.reducedMotion) {
        mixer.setTime(IMAGE_FIXE);
        creuse.paused = true;
      }
    }
    mixer.update(0);
  };

  let state = "plot";
  let creusait = false;
  construit(state, undefined, false);
  joue();
  let premier = true; // le premier setState pose l'etat sans transition

  return {
    root,
    setState(next, data = {}) {
      if (!meta.states.includes(next))
        throw new Error(`état inconnu : ${next}`);
      state = next;
      construit(state, data && data.floors, !premier);
      premier = false;
      const creuse = pelle.parent === root;
      if (creuse !== creusait) joue(); // de nouvelles donnees ne relancent pas le cycle
      creusait = creuse;
    },
    update(dt) {
      if (ctx.reducedMotion) return false;
      let encore = false;
      if (transitions.size) {
        applique(dt);
        encore = true;
      }
      if (pelle.parent === root) {
        mixer.update(dt);
        encore = true;
      }
      return encore;
    },
    anchor(name) {
      const p = ancres[name];
      if (!p) throw new Error(`ancre inconnue : ${name}`);
      return new THREE.Vector3(...p);
    },
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(pelle);
      root.clear();
      libereFusions();
      verreEclaire.dispose();
    },
  };
}
