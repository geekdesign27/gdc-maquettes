// L'interieur d'un batiment : la vue micro, une piece par fiche et les ouvriers au travail (catalogue : building-interior).
// Production mixte, brief valide par Pierre-Alain le 20 octobre 2026 :
// - une coupe de plain-pied en maison de poupee, comme les bureaux en conteneur : pas de toit, murs cote camera (avant
//   et droite) et cloisons coupes a l'allege, murs du fond (arriere et gauche) pleins, avec leurs fenetres ;
// - une piece de 6 x 3 m (2 x 1 trames) par fiche, en grappe, jamais en ligne : colonnes = ceil(racine(n / 2)),
//   rangees = ceil(n / colonnes), numerotees du devant vers le fond, de gauche a droite ; une case vide de la derniere
//   rangee reste sans dalle ;
// - quatre aspects pour les six etats d'une piece (data.rooms[n].state) : study et waiting vides (dalle nue, brique),
//   construction en travaux (echafaudage roulant, palette, seau), reception et done finies (crepi, fenetres, parquet,
//   table), defect finie mais rouverte (brique au fond, bache, escabeau, seau) ; GDC pose survey-poles, defect-sign et
//   les badges, et les personnages (character) aux ancres room:n ;
// - dalles, rives, poteaux pleins et murs du fond viennent du kit livre building-kit (v003) ; murs coupes, cloisons,
//   parquet et mobilier de BLD_INTERIOR_A_v001 (blender/assets/building-interior.py) ;
// - etat default : la vue s'ouvre, les murs et le mobilier montent du sol piece apres piece ; hidden : ils
//   redescendent, puis la vue disparait ; image fixe avec reducedMotion ;
// - qualite basse : les pieces _LOW des deux modeles ; qualite haute : au-dela du budget, les rangees du fond passent
//   aux pieces _LOW (comme building).
// Les modeles sont partages entre instances : on ne libere jamais leurs geometries ni leurs materiaux ici ; seuls le
// socle et son materiau, crees par ce composant, sont liberes. Aucune couleur d'etat dans la scene ; aucun texte.

const KIT = "kit:building-kit/BLD_KIT_A_v003.glb";
const INTERIEUR = "BLD_INTERIOR_A_v001.glb";
const K = "BLD_KIT_A_";
const I = "BLD_INTERIOR_A_";
const TRAME = 3.0;
const LARGE = 2 * TRAME; // une piece : deux trames de large, une de profondeur
const DALLE = 0.3;
const PARQUET = 0.03;
const MARGE = 1.2; // du nu des pieces au bord du socle
const SOCLE = { epaisseur: 0.6, chanfrein: 0.1 }; // bible 18.5
const OUVERTURE = 0.8; // secondes, pour toute la vue
const MONTEE = 0.4; // secondes, pour une piece
const ASPECTS = {
  study: "empty",
  waiting: "empty",
  construction: "works",
  reception: "finished",
  done: "finished",
  defect: "defect",
};

export const meta = {
  id: "building-interior",
  version: "1.0.0",
  category: "interior",
  states: ["default", "hidden"],
  params: { rooms: { type: "number", default: 4, min: 1, max: 12 } },
  anchors: ["label", "room:*"],
  budget: { triangles: 20000, materials: 10 },
  animated: true,
  assets: [INTERIEUR, KIT],
};

const versThree = (x, y, z) => [x, z, -y];
const borne = (v, p) =>
  Math.round(Math.min(Math.max(Number(v) || p.default, p.min), p.max));
const adoucit = (u) => 1 - (1 - u) ** 3;

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

// Le plan : la case de chaque piece, et ses quatre cotes. Un cote est une cloison s'il touche une autre piece, sinon un
// mur de facade, coupe a l'allege cote camera (avant, droite), plein au fond (arriere, gauche). rot : la rotation des
// pieces du kit qui pose leur epaisseur vers l'interieur de la piece (et leur parement exterieur sur l'axe).
function grappe(n) {
  const colonnes = Math.ceil(Math.sqrt(n / 2));
  const rangees = Math.ceil(n / colonnes);
  const occupe = (i, j) =>
    i >= 0 && i < colonnes && j >= 0 && j * colonnes + i < n;
  const pieces = Array.from({ length: n }, (_, k) => {
    const i = k % colonnes;
    const j = Math.floor(k / colonnes);
    const cx = (i - (colonnes - 1) / 2) * LARGE;
    const cy = (j - (rangees - 1) / 2) * TRAME;
    const cotes = {
      avant: {
        rot: 0,
        voisin: occupe(i, j - 1),
        plein: false,
        axe: [cx, cy - TRAME / 2],
        segments: [
          [cx - TRAME / 2, cy - TRAME / 2],
          [cx + TRAME / 2, cy - TRAME / 2],
        ],
      },
      droite: {
        rot: 90,
        voisin: occupe(i + 1, j),
        plein: false,
        axe: [cx + LARGE / 2, cy],
        segments: [[cx + LARGE / 2, cy]],
      },
      arriere: {
        rot: 180,
        voisin: occupe(i, j + 1),
        plein: true,
        axe: [cx, cy + TRAME / 2],
        segments: [
          [cx - TRAME / 2, cy + TRAME / 2],
          [cx + TRAME / 2, cy + TRAME / 2],
        ],
      },
      gauche: {
        rot: 270,
        voisin: occupe(i - 1, j),
        plein: true,
        axe: [cx - LARGE / 2, cy],
        segments: [[cx - LARGE / 2, cy]],
      },
    };
    return { k, i, j, cx, cy, cotes };
  });
  return { colonnes, rangees, pieces };
}

export function create(THREE, params, ctx) {
  const kit = ctx.assets[KIT].scene;
  const interieur = ctx.assets[INTERIEUR].scene;
  const root = new THREE.Group();
  root.name = "building-interior";
  root.userData.component = meta.id;
  const basse = ctx.quality === "low";
  const n = borne(params.rooms, meta.params.rooms);
  const plan = grappe(n);

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

  // --- le plan d'une vue : une liste de poses { modele, nom, x, y, z, rot, echelle, piece, leve }
  // piece : l'indice de la piece (pour la transition et l'allegement) ; leve : monte et descend avec la transition.
  function poses(rooms) {
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
    const poteaux = new Map(); // "x,y" -> { piece, plein }
    const poteau = (x, y, piece, plein) => {
      const cle = `${x},${y}`;
      const p = poteaux.get(cle) || { x, y, piece, plein: false };
      p.plein ||= plein;
      poteaux.set(cle, p);
    };
    for (const p of plan.pieces) {
      const aspect = ASPECTS[(rooms[p.k] || {}).state] || "empty";
      const fini = aspect === "finished" || aspect === "defect";
      const sol = DALLE + (fini ? PARQUET : 0);
      // la dalle, ses rives sur les cotes de facade et ses angles saillants
      pose("kit", "SLAB", p.cx, p.cy, 0, 0, p.k, {
        leve: false,
        echelle: [2, 1, 1],
      });
      for (const [cle, c] of Object.entries(p.cotes)) {
        if (c.voisin) continue;
        pose("kit", "SLAB_EDGE", ...c.axe, 0, c.rot, p.k, {
          leve: false,
          echelle: [c.segments.length, 1, 1],
        });
      }
      const { avant, droite, arriere, gauche } = p.cotes;
      for (const [a, b, x, y, rot] of [
        [avant, gauche, p.cx - LARGE / 2, p.cy - TRAME / 2, 0],
        [avant, droite, p.cx + LARGE / 2, p.cy - TRAME / 2, 90],
        [arriere, droite, p.cx + LARGE / 2, p.cy + TRAME / 2, 180],
        [arriere, gauche, p.cx - LARGE / 2, p.cy + TRAME / 2, 270],
      ])
        if (!a.voisin && !b.voisin)
          pose("kit", "SLAB_CORNER", x, y, 0, rot, p.k, { leve: false });
      if (fini)
        for (const dx of [-TRAME / 2, TRAME / 2])
          pose("interieur", "FLOOR_WOOD", p.cx + dx, p.cy, DALLE, 0, p.k, {
            leve: false,
          });

      // les murs : la finition suit l'aspect ; en defaut, le fond est rouvert jusqu'a la brique
      for (const [cle, c] of Object.entries(p.cotes)) {
        const brique = !fini || (aspect === "defect" && cle === "arriere");
        const finition = brique ? "BRICK" : "RENDER";
        c.segments.forEach(([x, y], s) => {
          // la porte de chaque piece : dans la travee droite de son cote avant, et en face chez la piece de devant
          const porte =
            s === 1 && (cle === "avant" || (cle === "arriere" && c.voisin));
          const d = porte ? "_DOOR" : "";
          if (c.voisin)
            pose(
              "interieur",
              `PARTITION_${finition}${d}`,
              x,
              y,
              DALLE,
              c.rot,
              p.k,
            );
          else if (!c.plein)
            pose(
              "interieur",
              `WALL_${finition}_CUT${d}`,
              x,
              y,
              DALLE,
              c.rot,
              p.k,
            );
          else {
            pose(
              "kit",
              brique ? "WALL_BRICK_WINDOW" : "WALL_RENDER_WINDOW",
              x,
              y,
              DALLE,
              c.rot,
              p.k,
            );
            if (aspect === "defect")
              pose("kit", "WINDOW", x, y, DALLE, c.rot, p.k);
          }
          // les poteaux aux deux bouts du segment : pleins si un mur plein les tient
          const [ux, uy] = c.rot % 180 === 0 ? [TRAME / 2, 0] : [0, TRAME / 2];
          const plein = c.plein && !c.voisin;
          poteau(x - ux, y - uy, p.k, plein);
          poteau(x + ux, y + uy, p.k, plein);
        });
      }

      // le mobilier de l'aspect, contre le fond de la piece ; le milieu reste aux personnages (ancre room:n)
      const meuble = (nom, dx, dy, z = sol, rot = 0) =>
        pose("interieur", nom, p.cx + dx, p.cy + dy, z, rot, p.k);
      if (aspect === "works") {
        meuble("SCAFFOLD_TOWER", -1.7, 0.75);
        meuble("PALLET", 1.6, 0.75);
        meuble("BUCKET", 0.55, 1.0);
      } else if (aspect === "finished") {
        meuble("TABLE", 1.5, 0.7);
      } else if (aspect === "defect") {
        meuble("TARP", -1.5, 0.55);
        meuble("STEPLADDER", -1.7, 0.75, sol + 0.02, 90);
        meuble("BUCKET", -0.55, 0.95, sol + 0.02);
      }
    }
    for (const c of poteaux.values())
      pose(
        c.plein ? "kit" : "interieur",
        c.plein ? "COLUMN" : "COLUMN_CUT",
        c.x,
        c.y,
        DALLE,
        0,
        c.piece,
      );
    return out;
  }

  // --- l'allegement : en qualite haute, au-dela du budget, les rangees du fond passent aux pieces _LOW
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
        0,
      );
    let seuil = Infinity;
    if (!basse)
      for (
        let j = plan.rangees - 1;
        j > 0 && total(seuil) > meta.budget.triangles;
        j--
      )
        seuil = j;
    return liste.map((p) => source(p, basse || rangee(p.piece) >= seuil));
  };

  // --- le socle maquette : dalle de terre de 0,60 m, dessus a y = 0, aretes arrondies (classe C3)
  const demiX = (plan.colonnes * LARGE) / 2 + MARGE;
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

  // --- la vue : reconstruite a chaque setState ; leves[k] : ce qui monte avec la piece k
  let leves = [];
  const construit = (rooms) => {
    root.clear();
    root.add(socle);
    leves = plan.pieces.map(() => []);
    const liste = poses(rooms);
    const objets = choisit(liste);
    liste.forEach((p, i) => {
      const piece = objets[i].clone(); // partage la geometrie et les materiaux du modele
      piece.position.set(...versThree(p.x, p.y, p.z));
      piece.rotation.set(0, THREE.MathUtils.degToRad(p.rot), 0);
      piece.scale.set(p.echelle[0], p.echelle[2], p.echelle[1]);
      if (p.modele === "interieur")
        piece.traverse((o) => {
          if (!o.isMesh) return;
          o.material = Array.isArray(o.material)
            ? o.material.map((m) => materiauxKit.get(m.name) || m)
            : materiauxKit.get(o.material.name) || o.material;
        });
      if (p.leve) leves[p.piece].push(piece);
      root.add(piece);
    });
    root.traverse((o) => {
      if (o.isMesh) o.castShadow = o.receiveShadow = !basse;
    });
    socle.castShadow = false;
  };

  // --- la transition : t va de 0 (ferme) a OUVERTURE (ouvert) ; la piece k monte apres un delai, en MONTEE secondes
  const delai = (k) => (n > 1 ? (k / (n - 1)) * (OUVERTURE - MONTEE) : 0);
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

  const yFond = (plan.rangees * TRAME) / 2;
  const ancres = { label: versThree(0, yFond, DALLE + 3.6) };
  for (const p of plan.pieces)
    ancres[`room:${p.k + 1}`] = versThree(p.cx, p.cy, DALLE);

  let state = "default";
  let rooms = [];
  construit(rooms);
  if (ctx.reducedMotion) t = OUVERTURE;
  applique();

  return {
    root,
    setState(next, data = {}) {
      if (!meta.states.includes(next))
        throw new Error(`état inconnu : ${next}`);
      state = next;
      // sans data.rooms, les pieces gardent leur aspect (la fermeture n'a pas besoin de les redire)
      if (Array.isArray(data.rooms)) rooms = data.rooms;
      construit(rooms);
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
