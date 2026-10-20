// Le batiment d'une application : son avancement se lit a l'etat de son chantier (catalogue : building).
// Production mixte, brief valide par Pierre-Alain le 20 octobre 2026 :
// - le batiment est assemble a partir du kit livre building-kit (v003), sur la trame de 3 m ;
// - la parcelle (socle, fouille, tas de deblais, chaises d'implantation) vient de BLD_SITEWORK_A_v001
//   (blender/assets/building.py) ;
// - l'emprise suit le nombre de fiches : 2, 3 ou 4 trames de facade (1 a 2, 3 a 4, 5 a 8 fiches), 2 de profondeur ;
// - les etats suivent l'ordre ou GDC les envoie : plot, excavation, foundations, structure (data.progress fait monter
//   les niveaux), envelope (brique, toit ferme, echafaudage), inspection (brique, menuiseries posees, echafaudage
//   demonte), finishing (crepi, rez eclaire, echafaudage sur une facade), completed (habite : fenetres eclairees) ;
// - qualite basse : les pieces _LOW du kit (bible 18.3) ; qualite haute : au-dela du budget de la fiche, les niveaux
//   du haut passent aux pieces _LOW, du dernier vers le bas (allegement automatique, decision du brief) ;
// - version 1.1 (brief valide par Pierre-Alain le 20 octobre 2026) : en excavation, la pelleteuse livree (excavator)
//   creuse au fond de la fouille ; son modele est emprunte (machine:excavator), son cycle rejoue ici, comme dans
//   excavator (on n'importe pas le code d'un autre dossier).
// Les modeles sont partages entre instances : on ne libere jamais leurs geometries ni leurs materiaux ici ; seul le
// verre eclaire, cree par ce composant, est libere. Aucune couleur d'etat dans la scene ; aucun texte.

const KIT = "kit:building-kit/BLD_KIT_A_v003.glb";
const PARCELLE = "BLD_SITEWORK_A_v001.glb";
const PELLETEUSE = "machine:excavator/VEH_EXCAVATOR_A_v001.glb";
const CLIP_PELLETEUSE = "ANM_EXCAVATOR_A_DIGGING";
const IMAGE_FIXE = 150 / 30; // sans animation : fleche levee, tournee vers le tas, godet plein (comme excavator)
// La pelleteuse au fond de la fouille : elle creuse vers le fond en biais, et son quart de tour a droite amene le godet
// (vide a 4,7 m de la tourelle) au-dessus du tas de deblais. Chenilles et queue de tourelle restent dans le fond.
const PELLE_RECUL = 2.4; // du bord droit de l'emprise au centre des chenilles
const PELLE_Y = -1.2;
const PELLE_LACET = 200; // degres : 180 (face au fond) + 20 (en biais vers la gauche)
const PELLE_HAUT = 4.5; // label et progress passent au-dessus du bras leve ; le badge descend au coin de la fouille
const K = "BLD_KIT_A_";
const S = "BLD_SITEWORK_A_";
const TRAME = 3.0;
const ETAGE = 3.0;
const DALLE = 0.3;
const ACROTERE = 0.5;
const RIVE = 0.2;
const DEBORD_ECHAFAUDAGE = 0.3 + 0.8 - 0.04 - RIVE / 2; // du garde-corps de rive au bord exterieur du plancher
const FOUILLE = 0.5; // profondeur de la fouille
const MARGE_FOUILLE = 1.1; // du nu de l'emprise au bord de la fouille (fond 0,60 m et talus de 0,50 m)
const MONTEE = 0.5; // part d'un niveau ou montent les poteaux ; le reste pose les cases de la dalle une a une

export const meta = {
  id: "building",
  version: "1.1.0",
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
    floors: { type: "number", default: 3, min: 1, max: 6 },
    wings: { type: "number", default: 3, min: 1, max: 8 },
  },
  anchors: ["label", "badge", "progress", "door"],
  budget: { triangles: 20000, materials: 10 },
  animated: true,
  assets: [PARCELLE, KIT, PELLETEUSE],
};

const versThree = (x, y, z) => [x, z, -y];
const borne = (v, p) =>
  Math.round(Math.min(Math.max(Number(v) || p.default, p.min), p.max));

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

// La trame d'un batiment de nx x ny travees centre sur l'origine (Blender : avant vers -Y) : axes, cases, facades.
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
  return { nx, ny, ax, ay, cx, cy, facades, angles };
}

export function create(THREE, params, ctx) {
  const kit = ctx.assets[KIT].scene;
  const parcelle = ctx.assets[PARCELLE].scene;
  const root = new THREE.Group();
  root.name = "building";
  root.userData.component = meta.id;
  const basse = ctx.quality === "low";

  // La pelleteuse : une copie par instance, ajoutee au root seulement en excavation. Qualite basse (bible 18.3) : ses
  // noeuds *_DETAIL (petits galets, patins, lame, verins) sont retires.
  const pelle = ctx.assets[PELLETEUSE].scene;
  const details = [];
  pelle.traverse((o) => {
    if (basse && o.name.endsWith("_DETAIL")) details.push(o);
  });
  for (const o of details) o.removeFromParent();
  const mixer = new THREE.AnimationMixer(pelle);
  const creuse = mixer.clipAction(
    THREE.AnimationClip.findByName(ctx.assets[PELLETEUSE].animations, CLIP_PELLETEUSE),
  );

  const type = meta.params.type.values.includes(params.type)
    ? params.type
    : meta.params.type.default;
  const fiches = borne(params.wings, meta.params.wings);
  const niveaux = Math.min(
    borne(params.floors, meta.params.floors),
    type === "block" ? 6 : 2,
  );
  const t = trame(fiches <= 2 ? 2 : fiches <= 4 ? 3 : 4, 2);
  const porte = Math.floor((t.nx - 1) / 2); // travee de la porte, sur la facade avant
  const toit = niveaux * ETAGE + DALLE; // dessus de la derniere dalle

  // Le verre des fenetres eclairees (MAT_GLASS_LIT) : en theme sombre, il luit un peu.
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

  // --- le plan d'un etat : une liste de poses { modele, nom, x, y, z, rot, echelle, niveau, eclaire }
  function plan(state, progress) {
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
      });

    // une dalle entiere : une case etiree sur l'emprise, une rive etiree par facade (bouts vifs : exact), les angles
    const dalle = (z, niveau) => {
      pose("SLAB", 0, 0, z, 0, { echelle: [t.nx, t.ny, 1], niveau });
      rives("SLAB_EDGE", z, niveau);
      for (const [x, y, rot] of t.angles)
        pose("SLAB_CORNER", x, y, z, rot, { niveau });
    };
    const rives = (nom, z, niveau) => {
      for (const f of Object.values(t.facades))
        pose(nom, ...f.centre, z, f.rot, { echelle: [f.long, 1, 1], niveau });
    };
    // une piece par travee (garde-corps, echafaudage : leurs montants ne s'etirent pas en qualite haute)
    const parTravee = (
      nom,
      z,
      niveau,
      decalage = 0,
      facades = Object.keys(t.facades),
    ) => {
      for (const cle of facades) {
        const f = t.facades[cle];
        const [dx, dy] = [f.n[0] * decalage, f.n[1] * decalage];
        // qualite basse : une seule piece etiree sur la facade (garde-corps : il deborde d'une demi-rive a chaque bout)
        if (basse) {
          const long = nom === "GUARDRAIL" ? (f.long * TRAME + RIVE) / (TRAME + RIVE) : f.long;
          pose(nom, f.centre[0] + dx, f.centre[1] + dy, z, f.rot, { niveau, echelle: [long, 1, 1] });
        } else for (const [x, y] of f.points) pose(nom, x + dx, y + dy, z, f.rot, { niveau });
      }
    };
    const poteaux = (k, echelle = 1, interieurs = true) => {
      for (const [i, x] of t.ax.entries())
        for (const [j, y] of t.ay.entries()) {
          const bord = i === 0 || i === t.nx || j === 0 || j === t.ny;
          if (bord || interieurs)
            pose("COLUMN", x, y, DALLE + k * ETAGE, 0, {
              echelle: [1, 1, echelle],
              niveau: k,
            });
        }
    };
    const echafaudage = (hauteur, facades) => {
      for (let k = 0; k < hauteur; k++)
        parTravee("SCAFFOLD", k * ETAGE, k, 0, facades);
      parTravee(
        "GUARDRAIL",
        hauteur * ETAGE,
        hauteur - 1,
        DEBORD_ECHAFAUDAGE,
        facades,
      );
    };
    // les murs d'un niveau : choix(facade, index de travee, niveau) donne les pieces de la travee
    const murs = (k, choix) => {
      for (const [cle, f] of Object.entries(t.facades))
        f.points.forEach(([x, y], i) => {
          for (const [nom, eclaire] of choix(cle, i, k))
            pose(nom, x, y, DALLE + k * ETAGE, f.rot, { niveau: k, eclaire });
        });
    };
    const toiture = (k, gardeCorps) => {
      if (type === "house") {
        for (const x of t.cx) {
          pose("ROOF_SLOPE", x, 0, toit, 0, { niveau: k });
          pose("ROOF_SLOPE", x, 0, toit, 180, { niveau: k });
        }
        pose("ROOF_GABLE", t.ax[t.nx], 0, toit, 90, { niveau: k });
        pose("ROOF_GABLE", t.ax[0], 0, toit, 270, { niveau: k });
        return;
      }
      rives("ROOF_PARAPET", toit, k);
      for (const [x, y, rot] of t.angles)
        pose("ROOF_PARAPET_CORNER", x, y, toit, rot, { niveau: k });
      if (gardeCorps) parTravee("GUARDRAIL", toit + ACROTERE, k); // l'acrotere est bas : protection pendant les travaux
    };
    // l'ossature complete : la dalle du rez, puis chaque niveau ; la halle n'a pas de dalle intermediaire, seulement
    // sa rive (le bandeau qui tient les murs du haut)
    const ossature = (interieurs) => {
      dalle(0, 0);
      for (let k = 0; k < niveaux; k++) {
        poteaux(k, 1, interieurs);
        if (type === "hall" && k < niveaux - 1) {
          rives("SLAB_EDGE", (k + 1) * ETAGE, k + 1);
          for (const [x, y, rot] of t.angles)
            pose("SLAB_CORNER", x, y, (k + 1) * ETAGE, rot, { niveau: k + 1 });
        } else dalle((k + 1) * ETAGE, k + 1);
      }
    };
    // une travee de facade selon la finition ; la halle : murs pleins en bas, grande baie sous poutre a la porte
    const facade = (finition) => (cle, i, k) => {
      const entree = cle === "avant" && i === porte && k === 0;
      const brique = finition !== "crepi";
      if (type === "hall" && k === 0) {
        if (entree) return [["BEAM", false]];
        return [[brique ? "WALL_BRICK" : "WALL_RENDER", false]];
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
      const eclaire =
        state === "completed" || (state === "finishing" && k === 0);
      return [["WALL_RENDER_WINDOW", eclaire]];
    };
    const perron = () => {
      if (type !== "hall")
        pose("STEPS", ...t.facades.avant.points[porte], 0, 0);
    };

    let hauteur = 0; // dessus de ce qui est construit, pour les ancres
    switch (state) {
      case "plot":
        terrain(`PLOT_${t.nx}X2`);
        for (const [x, y, rot] of t.angles) terrain("BATTER_BOARD", x, y, rot);
        // le tracage de l'emprise sur les axes : une ligne etiree par facade, qui chevauche l'autre aux angles
        for (const f of Object.values(t.facades))
          terrain("LAYOUT_LINE", ...f.centre, f.rot, [(f.long * TRAME + 0.15) / TRAME, 1, 1]);
        break;
      case "excavation":
      case "foundations": {
        terrain(`PIT_${t.nx}X2`);
        // le tas de deblais sur la marge droite, entre la fouille et le bord du socle, dans le sens de la profondeur
        terrain("SPOIL_HEAP", t.ax[t.nx] + MARGE_FOUILLE + 0.9, 0.4, 90);
        if (state === "excavation") {
          hauteur = PELLE_HAUT;
          break;
        }
        for (const x of t.ax)
          for (const y of t.ay) {
            pose("FOOTING", x, y, 0);
            pose("COLUMN_STARTER", x, y, 0);
          }
        for (const y of t.ay)
          for (const x of t.cx) pose("FOUNDATION_STRIP", x, y, 0);
        for (const x of t.ax)
          for (const y of t.cy) pose("FOUNDATION_STRIP", x, y, 0, 90);
        hauteur = 0.8;
        break;
      }
      case "structure": {
        terrain(`PLOT_${t.nx}X2`);
        dalle(0, 0);
        const h = Math.min(Math.max(Number(progress) || 0, 0), 1) * niveaux;
        const fini = Math.min(Math.floor(h), niveaux); // niveaux termines, dalle comprise
        const f = h - fini; // avancement dans le niveau en cours
        for (let k = 0; k < fini; k++) {
          poteaux(k);
          dalle((k + 1) * ETAGE, k + 1);
        }
        hauteur = fini * ETAGE + DALLE;
        let echafaudes = fini;
        if (fini < niveaux) {
          const monte = Math.min(f / MONTEE, 1);
          if (monte > 0) {
            poteaux(fini, monte);
            echafaudes = fini + 1;
            hauteur = DALLE + fini * ETAGE + monte * (ETAGE - DALLE);
          } else
            for (const x of t.ax)
              for (const y of t.ay)
                pose("COLUMN_STARTER", x, y, hauteur, 0, { niveau: fini });
          // les cases de la dalle du dessus, une a une, avec leurs rives et leurs angles
          const cases = Math.floor(
            Math.max(0, (f - MONTEE) / (1 - MONTEE)) * t.nx * t.ny,
          );
          const z = (fini + 1) * ETAGE;
          for (let n = 0; n < cases; n++) {
            const i = n % t.nx;
            const j = Math.floor(n / t.nx);
            const x = t.cx[i];
            const y = t.cy[j];
            pose("SLAB", x, y, z, 0, { niveau: fini + 1 });
            if (j === 0)
              pose("SLAB_EDGE", x, t.ay[0], z, 0, { niveau: fini + 1 });
            if (j === t.ny - 1)
              pose("SLAB_EDGE", x, t.ay[t.ny], z, 180, { niveau: fini + 1 });
            if (i === 0)
              pose("SLAB_EDGE", t.ax[0], y, z, 270, { niveau: fini + 1 });
            if (i === t.nx - 1)
              pose("SLAB_EDGE", t.ax[t.nx], y, z, 90, { niveau: fini + 1 });
            for (const [ax, ay, rot] of t.angles)
              if (
                Math.abs(ax - x) === TRAME / 2 &&
                Math.abs(ay - y) === TRAME / 2
              )
                pose("SLAB_CORNER", ax, ay, z, rot, { niveau: fini + 1 });
          }
        }
        // garde-corps de rive sur le dernier plancher termine (protection laterale, SST)
        if (fini > 0) parTravee("GUARDRAIL", fini * ETAGE + DALLE, fini);
        if (echafaudes > 0) echafaudage(echafaudes, Object.keys(t.facades));
        break;
      }
      case "envelope":
        terrain(`PLOT_${t.nx}X2`);
        ossature(false);
        for (let k = 0; k < niveaux; k++) murs(k, facade("brute"));
        toiture(niveaux, true);
        echafaudage(niveaux, Object.keys(t.facades));
        perron();
        hauteur = toit;
        break;
      case "inspection":
        terrain(`PLOT_${t.nx}X2`);
        ossature(false);
        for (let k = 0; k < niveaux; k++) murs(k, facade("menuiseries"));
        toiture(niveaux, false);
        perron();
        hauteur = toit;
        break;
      case "finishing":
      case "completed":
        terrain(`PLOT_${t.nx}X2`);
        ossature(false);
        for (let k = 0; k < niveaux; k++) murs(k, facade("crepi"));
        toiture(niveaux, false);
        perron();
        if (state === "finishing") echafaudage(niveaux, ["droite"]);
        else pose("SIGN_TOTEM", t.ax[0] - 0.8, t.ay[0] - 1.8, 0);
        hauteur = toit;
        break;
      default:
        throw new Error(`état inconnu : ${state}`);
    }
    if (type === "house" && hauteur === toit)
      hauteur = toit + TRAME * Math.tan(Math.PI / 6) + 0.25;
    else if (hauteur === toit && type !== "house") hauteur = toit + ACROTERE;
    return { poses, hauteur };
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
        if (total(seuil) <= meta.budget.triangles) break;
        if (niveau === 0) break; // le rez reste plein
        seuil = niveau;
      }
    }
    return poses.map((p) => source(p, basse || p.niveau >= seuil));
  };

  const ancres = {};
  const construit = (state, progress) => {
    root.clear();
    const { poses, hauteur } = plan(state, progress);
    const objets = choisit(poses);
    poses.forEach((p, i) => {
      const piece = objets[i].clone(); // partage la geometrie et les materiaux du modele
      piece.position.set(...versThree(p.x, p.y, p.z));
      piece.rotation.set(0, THREE.MathUtils.degToRad(p.rot), 0);
      piece.scale.set(p.echelle[0], p.echelle[2], p.echelle[1]);
      if (p.eclaire)
        piece.traverse((o) => {
          if (o.isMesh && o.material.name === "MAT_GLASS")
            o.material = verreEclaire;
        });
      root.add(piece);
    });
    if (state === "excavation") {
      pelle.position.set(...versThree(t.ax[t.nx] - PELLE_RECUL, PELLE_Y, -FOUILLE));
      pelle.rotation.set(0, THREE.MathUtils.degToRad(PELLE_LACET), 0);
      root.add(pelle);
    }
    root.traverse((o) => {
      if (o.isMesh) o.castShadow = o.receiveShadow = !basse;
    });
    const avant = t.ay[0];
    const [xPorte] = t.facades.avant.points[porte];
    Object.assign(ancres, {
      label: versThree(0, 0, hauteur + 1.5),
      // en excavation, le coin de l'emprise est cache par la pelleteuse : le badge passe au coin de la fouille, au sol
      badge:
        state === "excavation"
          ? versThree(t.ax[t.nx] + MARGE_FOUILLE, avant - MARGE_FOUILLE, 0)
          : versThree(t.ax[t.nx], avant, hauteur + 0.6),
      progress: versThree(0, avant - 1.2, Math.max(hauteur, DALLE) + 0.6),
      door: versThree(xPorte, avant - RIVE - 0.9, 0),
    });
  };

  // le cycle de creusement : joue en excavation ; avec reducedMotion, une image fixe et lisible
  const joue = () => {
    creuse.stop();
    if (state === "excavation") {
      creuse.reset().play();
      if (ctx.reducedMotion) {
        mixer.setTime(IMAGE_FIXE);
        creuse.paused = true;
      }
    }
    mixer.update(0);
  };

  let state = "plot";
  construit(state);
  joue();

  return {
    root,
    setState(next, data = {}) {
      if (!meta.states.includes(next))
        throw new Error(`état inconnu : ${next}`);
      const avant = state;
      state = next;
      construit(state, data.progress);
      if (state !== avant) joue(); // un nouveau progress ne relance pas le cycle
    },
    update(dt) {
      if (state !== "excavation" || ctx.reducedMotion) return false;
      mixer.update(dt);
      return true;
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
      verreEclaire.dispose();
    },
  };
}
