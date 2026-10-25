// La ville autour, avec les vrais kits (lot G9, fiche city-plan ; docs/ville-autour.md) : les pieces de road-kit,
// nature-kit, villa-kit et apartment-kit posees sur le plan de ville-autour.js, puis fusionnees par materiau, un
// maillage par materiau pour toute la ville. Les vitres des villas et des immeubles sont une instance par vide de
// fenetre (WIN_nn), pour que la nuit (city-night) puisse en allumer une partie sans toucher la fusion ; les tetes des
// lampadaires ont leur propre maillage, pour s'allumer sans l'eau de la fontaine (meme verre). Une version basse (les
// pieces _LOW, sans tirets, passages, lampadaires, buissons ni bancs) sert en qualite basse, et au loin en qualite
// haute : sous 4 px par metre, la carte bascule sur elle. Three.js est injecte ; les modeles des kits sont recus.
//
// Reperes : ceux du plan (metres, x et z au sol, y vertical). Dans les GLB, une rue va le long de X, la facade d'une
// villa ou d'un immeuble regarde +Z, et le carrefour en T a sa branche vers -Z.
import { alea, choisis, entre } from "./graine.js";
import { lumiere } from "./heure.js";

export const SEUIL_LOIN = 4; // px par metre : en dessous, les pieces basses (city-plan)
// La nuit (city-night) : la part des fenetres allumees, tiree pour chaque nuit ; les taches des lampadaires au sol, plus
// faibles que celles des projecteurs (0,22), en blanc chaud ; 150 au plus, en qualite haute seulement.
export const NUIT = { villas: 0.3, immeubles: 0.4, taches: 150 };
const TACHE = { rayon: 3.2, opacite: 0.1, sol: 0.06, avant: 0.85, anneaux: 4, cotes: 24 };
const EPS = 0.01;
const DEMI_CARREFOUR = 5; // un carrefour fait 10 x 10 m
const DEMI_GIRATOIRE = 15; // le giratoire et ses trottoirs, 30 x 30 m
const PAS_TIRETS = 6;
const PAS_LAMPADAIRES = 25;
const ECART_PASSAGE = 8; // le passage pieton, juste apres le carrefour (3 m de son bord)
const TROTTOIR = 4; // l'axe du trottoir, depuis l'axe de la rue
const ETAGE = 3;
const HAIE = { retrait: 0.6, longueur: 4 }; // la haie de nature-kit fait 4 m de long et 0,9 m d'epaisseur
const ALLEE = { largeur: 1.2, dessus: 0.03, epaisseur: 0.06, seuil: 1.2 };
const CHEMIN = { largeur: 2.5 }; // les chemins en beton des parcs
const ENROBE = { dessus: 0.04, epaisseur: 0.1 }; // les raccords, au niveau des routes du chantier
const PREFIXES = {
  rues: "ENV_ROAD_KIT_A_",
  nature: "ENV_NATURE_KIT_A_",
  villas: "ENV_VILLA_KIT_A_",
  immeubles: "ENV_APARTMENT_KIT_A_",
};
// Les villas de chaque cote (villa-kit) : cote camera, 8 m au plus ; sur les cotes, rez et etage aussi.
const VILLAS = {
  camera: ["A", "B", "E", "F"],
  cote: ["C", "D", "A", "B"],
  fond: ["A", "B", "C", "D", "E", "F"],
};
// Les angles, en degres autour de Y, qui tournent la facade (+Z) ou la branche d'un T (-Z) vers une direction.
const FACADE = { "+z": 0, "+x": 90, "-z": 180, "-x": 270 };
const BRANCHE = { "-z": 0, "-x": 90, "+z": 180, "+x": 270 };
const VECTEUR = { "+x": [1, 0], "-x": [-1, 0], "+z": [0, 1], "-z": [0, -1] };
const OPPOSE = { "-x": "+x", "+x": "-x", "-z": "+z", "+z": "-z" };
// les pieces qui ont une version basse (les autres restent telles quelles en basse, ou n'y sont pas posees)
const PIECES_BASSES = new Set([
  "STRAIGHT",
  "CROSS",
  "TEE",
  "ROUNDABOUT",
  "TREE",
  "FIR",
  "HEDGE",
  "FOUNTAIN",
  ...["A", "B", "C", "D", "E", "F"].map((l) => `VILLA_${l}`),
  ...["BAR", "PLOT"].flatMap((b) =>
    ["GROUND", "GROUND_SHOP", "FLOOR", "ROOF_FLAT", "ROOF_HIP"].map(
      (p) => `${b}_${p}`,
    ),
  ),
]);

// Les pieces des kits, lues une fois : par materiau, leurs triangles dans le repere de la piece, et les vides de
// fenetre. Rend { piece(kit, nom), materiau(nom), libere() }.
function lisKits(THREE, kits) {
  const pieces = new Map();
  return {
    piece(kit, nom) {
      const cle = `${kit}:${nom}`;
      if (pieces.has(cle)) return pieces.get(cle);
      const objet = kits[kit].getObjectByName(PREFIXES[kit] + nom);
      if (!objet) throw new Error(`piece absente du kit ${kit} : ${nom}`);
      objet.updateMatrixWorld(true);
      const inverse = new THREE.Matrix4().copy(objet.matrixWorld).invert();
      const parMateriau = new Map();
      const vides = [];
      objet.traverse((o) => {
        const local = new THREE.Matrix4().multiplyMatrices(
          inverse,
          o.matrixWorld,
        );
        if (/_WIN_\d+$/.test(o.name)) vides.push(local);
        if (!o.isMesh) return;
        const g = o.geometry.index
          ? o.geometry.toNonIndexed()
          : o.geometry.clone();
        g.applyMatrix4(local);
        if (!g.getAttribute("normal")) g.computeVertexNormals();
        if (!parMateriau.has(o.material)) parMateriau.set(o.material, []);
        parMateriau.get(o.material).push(g);
      });
      const p = { parMateriau, vides };
      pieces.set(cle, p);
      return p;
    },
    // un materiau MAT_ de la palette, tel que les kits le portent (le registre commun : le meme objet partout)
    materiau(nom) {
      let trouve = null;
      for (const k of Object.values(kits))
        k.traverse((o) => {
          if (trouve || !o.isMesh) return;
          for (const m of [].concat(o.material)) if (m.name === nom) trouve = m;
        });
      return trouve;
    },
    libere() {
      for (const p of pieces.values())
        for (const gs of p.parMateriau.values())
          for (const g of gs) g.dispose();
      pieces.clear();
    },
  };
}

// Un poseur : pose(kit, nom, x, z, angle, echelle, y), plaque(materiau, rectangle, dessus, epaisseur), et a la fin
// fusionne() rend un groupe (un maillage par materiau, ou par usage : les tetes des lampadaires a part) et les vitres.
function creePoseur(THREE, lecture, { basse, ombres, nom }) {
  const parUsage = new Map(); // cle -> { mat, liste: [{ g, m }], ombre, nom }
  const vitres = []; // { m, sorte } : la matrice d'une vitre, et villas ou immeubles
  const lampes = []; // [x, z] : le sol sous la tete de chaque lampadaire
  const boite = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
  const ajoute = (cle, mat, g, m, ombre, suffixe) => {
    if (!parUsage.has(cle))
      parUsage.set(cle, { mat, liste: [], ombre, suffixe });
    parUsage.get(cle).liste.push({ g, m });
  };
  return {
    pose(kit, piece, x, z, angle = 0, echelle = [1, 1, 1], y = 0) {
      const p = lecture.piece(
        kit,
        basse && PIECES_BASSES.has(piece) ? `${piece}_LOW` : piece,
      );
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(x, y, z),
        new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          THREE.MathUtils.degToRad(angle),
        ),
        new THREE.Vector3(...echelle),
      );
      const lampe = piece === "LAMP_HEAD"; // ses verres s'allument la nuit, pas ceux de la fontaine
      for (const [mat, gs] of p.parMateriau)
        for (const g of gs)
          ajoute(
            lampe ? `lampes:${mat.uuid}` : mat.uuid,
            mat,
            g,
            m,
            !lampe && mat.name !== "MAT_ASPHALT",
            lampe ? "LAMPES" : mat.name,
          );
      const sorte = kit === "villas" ? "villas" : "immeubles";
      for (const v of p.vides)
        vitres.push({ m: new THREE.Matrix4().multiplyMatrices(m, v), sorte });
      if (lampe) {
        const sol = new THREE.Vector3(0, 0, -TACHE.avant).applyMatrix4(m); // sous la tete, cote chaussee
        lampes.push([sol.x, sol.z]);
      }
    },
    // une dalle (allee, chemin, raccord) : une boite d'un materiau des kits, du rectangle { x, z }
    plaque(mat, { x, z }, dessus, epaisseur) {
      if (!mat || x[1] - x[0] <= 0 || z[1] - z[0] <= 0) return;
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(
          (x[0] + x[1]) / 2,
          dessus - epaisseur / 2,
          (z[0] + z[1]) / 2,
        ),
        new THREE.Quaternion(),
        new THREE.Vector3(x[1] - x[0], epaisseur, z[1] - z[0]),
      );
      ajoute(mat.uuid, mat, boite, m, false, mat.name);
    },
    fusionne(vitre) {
      const groupe = new THREE.Group();
      groupe.name = nom;
      const jetables = [];
      let triangles = 0;
      const v = new THREE.Vector3();
      const nm = new THREE.Matrix3();
      for (const { mat, liste, ombre, suffixe } of parUsage.values()) {
        let n = 0;
        for (const { g } of liste) n += g.getAttribute("position").count;
        const positions = new Float32Array(n * 3);
        const normales = new Float32Array(n * 3);
        let o = 0;
        for (const { g, m } of liste) {
          const pa = g.getAttribute("position");
          const na = g.getAttribute("normal");
          nm.getNormalMatrix(m);
          for (let i = 0; i < pa.count; i++, o += 3) {
            v.fromBufferAttribute(pa, i).applyMatrix4(m);
            positions[o] = v.x;
            positions[o + 1] = v.y;
            positions[o + 2] = v.z;
            v.fromBufferAttribute(na, i).applyMatrix3(nm).normalize();
            normales[o] = v.x;
            normales[o + 1] = v.y;
            normales[o + 2] = v.z;
          }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geo.setAttribute("normal", new THREE.BufferAttribute(normales, 3));
        geo.computeBoundingSphere();
        jetables.push(geo);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.name = `${nom}_${suffixe}`;
        mesh.castShadow = ombres && ombre;
        mesh.receiveShadow = ombres;
        groupe.add(mesh);
        triangles += n / 3;
      }
      // les vitres : deux instances, eteintes et allumees ; nuit() les repartit, et la carte eclaire les allumees
      let eteintes = null;
      let allumees = null;
      if (vitre && vitres.length) {
        const instance = (suffixe) => {
          const inst = new THREE.InstancedMesh(vitre.geometry, vitre.material, vitres.length);
          inst.name = `${nom}_${suffixe}`;
          inst.receiveShadow = ombres;
          groupe.add(inst);
          jetables.push(inst);
          return inst;
        };
        eteintes = instance("VITRES");
        allumees = instance("VITRES_ALLUMEES");
        vitres.forEach(({ m }, k) => eteintes.setMatrixAt(k, m));
        eteintes.instanceMatrix.needsUpdate = true;
        allumees.count = 0;
        for (const i of [eteintes, allumees]) i.computeBoundingSphere();
        triangles += vitres.length * 2;
      }
      boite.dispose();
      const lampesMeshes = groupe.children.filter((m) => m.name.endsWith("_LAMPES"));
      return { groupe, triangles, vitres: vitres.length, liste: vitres, eteintes, allumees, lampes, lampesMeshes, jetables };
    },
  };
}

// La ville : kits { rues, nature, villas, immeubles } (la scene de chaque GLB) ; options : { quality, graine }.
export function assembleVille(
  THREE,
  plan,
  kits,
  { quality = "high", graine = "gdc" } = {},
) {
  const haute = quality === "high";
  const lecture = lisKits(THREE, kits);
  const beton = lecture.materiau("MAT_CONCRETE");
  const enrobe = lecture.materiau("MAT_ASPHALT");
  const vitre = kits.villas.getObjectByName(PREFIXES.villas + "WINDOW_PANE");
  const racine = new THREE.Group();
  racine.name = "VILLE_KITS";
  const jetables = [];
  const lots = {};
  const triangles = { haute: 0, basse: 0 };
  // la version haute (si la qualite le permet) et la basse tirent la meme ville : le tirage est rejoue depuis la meme
  // graine pour chacune, et chaque choix est tire dans les deux, meme ce que la basse ne pose pas
  for (const basse of haute ? [false, true] : [true]) {
    const tirage = alea(`ville-kits:${graine}`);
    const poseur = creePoseur(THREE, lecture, {
      basse,
      ombres: haute,
      nom: basse ? "VILLE_KITS_BASSE" : "VILLE_KITS_HAUTE",
    });
    const detail = !basse; // tirets, passages, lampadaires, buissons, bancs
    poseRues(plan, poseur, { detail, enrobe });
    posePates(plan, poseur, { detail, tirage, beton });
    const lot = poseur.fusionne(vitre);
    jetables.push(...lot.jetables);
    racine.add(lot.groupe);
    lots[basse ? "basse" : "haute"] = lot;
    triangles[basse ? "basse" : "haute"] = lot.triangles;
  }
  lecture.libere();
  if (lots.haute) lots.basse.groupe.visible = false;
  // les taches des lampadaires (qualite haute) : un disque degrade, additif, sans texture, comme le projecteur
  let taches = null;
  if (lots.haute && lots.haute.lampes.length) {
    const { rayon, anneaux, cotes } = TACHE;
    const pos = [0, 0, 0];
    const col = [1, 1, 1, 1];
    for (let a = 1; a <= anneaux; a++) {
      const r = a / anneaux;
      const alpha = Math.max(0, 1 - r) ** 1.5; // doux au centre, nul au bord
      for (let k = 0; k < cotes; k++) {
        const t = (k / cotes) * Math.PI * 2;
        pos.push(Math.cos(t) * r * rayon, 0, Math.sin(t) * r * rayon);
        col.push(1, 1, 1, alpha);
      }
    }
    const idx = [];
    const sommet = (a, k) => 1 + (a - 1) * cotes + (k % cotes);
    for (let k = 0; k < cotes; k++) idx.push(0, sommet(1, k + 1), sommet(1, k));
    for (let a = 1; a < anneaux; a++)
      for (let k = 0; k < cotes; k++)
        idx.push(sommet(a, k), sommet(a, k + 1), sommet(a + 1, k), sommet(a, k + 1), sommet(a + 1, k + 1), sommet(a + 1, k));
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 4));
    g.setIndex(idx);
    const mat = new THREE.MeshBasicMaterial({
      name: "VILLE_LAMPADAIRES_TACHES",
      color: new THREE.Color(lumiere.fenetres.couleur).multiplyScalar(TACHE.opacite),
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const n = Math.min(NUIT.taches, lots.haute.lampes.length);
    taches = new THREE.InstancedMesh(g, mat, n);
    taches.name = "VILLE_KITS_HAUTE_TACHES";
    taches.renderOrder = 1;
    const m = new THREE.Matrix4();
    lots.haute.lampes.slice(0, n).forEach(([x, z], k) => taches.setMatrixAt(k, m.makeTranslation(x, TACHE.sol, z)));
    taches.instanceMatrix.needsUpdate = true;
    taches.computeBoundingSphere();
    taches.visible = false;
    lots.haute.groupe.add(taches);
    jetables.push(g, mat, taches);
  }

  return {
    racine,
    triangles,
    vitres: (lots.haute ?? lots.basse).vitres,
    // au loin (sous SEUIL_LOIN px par metre), les pieces basses ; en qualite basse, toujours elles
    vue(pxParMetre) {
      if (!lots.haute) return false;
      const loin = pxParMetre < SEUIL_LOIN;
      if (lots.basse.groupe.visible === loin) return false;
      lots.basse.groupe.visible = loin;
      lots.haute.groupe.visible = !loin;
      return true;
    },
    get loin() {
      return !!lots.haute && lots.basse.groupe.visible;
    },
    // la nuit (city-night) : les fenetres allumees de cette nuit, tirees par une graine et la cle de la nuit (sa date) ;
    // fixes toute la nuit. Rend true s'il faut redessiner.
    nuit(cle) {
      for (const lot of Object.values(lots)) {
        if (!lot.eteintes) continue;
        const tirage = alea(`ville-nuit:${graine}:${cle}`); // le meme tirage pour les deux lots
        let e = 0;
        let a = 0;
        for (const { m, sorte } of lot.liste) {
          if (tirage() < NUIT[sorte]) lot.allumees.setMatrixAt(a++, m);
          else lot.eteintes.setMatrixAt(e++, m);
        }
        lot.eteintes.count = e;
        lot.allumees.count = a;
        for (const i of [lot.eteintes, lot.allumees]) {
          i.instanceMatrix.needsUpdate = true;
          i.computeBoundingSphere();
        }
      }
      return true;
    },
    // l'allumage de la nuit, de 0 (le jour) a 1 : les taches des lampadaires suivent le fondu de la carte
    eclaire(niveau) {
      if (!taches) return false;
      taches.material.opacity = niveau;
      taches.visible = niveau > 0;
      return true;
    },
    // ce que la carte eclaire avec ses vitres de nuit : les fenetres allumees (faibles) et les tetes des lampadaires
    get allumables() {
      return {
        vitres: Object.values(lots).map((l) => l.allumees).filter(Boolean),
        lampes: Object.values(lots).flatMap((l) => l.lampesMeshes),
      };
    },
    get allumees() {
      return (lots.haute ?? lots.basse).allumees?.count ?? 0;
    },
    dispose() {
      racine.removeFromParent();
      for (const j of jetables) j.dispose();
    },
  };
}

// --- les rues : chaque rectangle du plan est une rue le long de son grand cote. Un croisement est le point ou l'axe
// d'une rue rencontre celui d'une autre, y compris quand l'une s'arrete au bord de l'autre (un T) ; les raccords vers
// les routes du chantier ajoutent une branche a la rue de ceinture.
function poseRues(plan, { pose, plaque }, { detail, enrobe }) {
  const rues = plan.rues.map((r) =>
    r.x[1] - r.x[0] > r.z[1] - r.z[0]
      ? { h: true, axe: (r.z[0] + r.z[1]) / 2, de: r.x[0], a: r.x[1] }
      : { h: false, axe: (r.x[0] + r.x[1]) / 2, de: r.z[0], a: r.z[1] },
  );
  const proche = (a, b) => Math.abs(a - b) < EPS;
  const croisements = new Map();
  const croisement = (x, z) => {
    const cle = `${x}:${z}`;
    if (!croisements.has(cle))
      croisements.set(cle, { x, z, branches: new Set() });
    return croisements.get(cle);
  };
  const H = rues.filter((r) => r.h);
  const V = rues.filter((r) => !r.h);
  for (const h of H)
    for (const v of V) {
      const [x, z] = [v.axe, h.axe];
      if (x < h.de - DEMI_CARREFOUR - EPS || x > h.a + DEMI_CARREFOUR + EPS)
        continue;
      if (z < v.de - DEMI_CARREFOUR - EPS || z > v.a + DEMI_CARREFOUR + EPS)
        continue;
      const c = croisement(x, z);
      if (h.de < x - DEMI_CARREFOUR - EPS) c.branches.add("-x");
      if (h.a > x + DEMI_CARREFOUR + EPS) c.branches.add("+x");
      if (v.de < z - DEMI_CARREFOUR - EPS) c.branches.add("-z");
      if (v.a > z + DEMI_CARREFOUR + EPS) c.branches.add("+z");
    }
  // les raccords : une branche de la rue qu'ils touchent, et leur enrobe jusqu'a la route du chantier
  for (const r of plan.raccords) {
    const [cx, cz] = [(r.x[0] + r.x[1]) / 2, (r.z[0] + r.z[1]) / 2];
    for (const v of V) {
      if (cz < v.de || cz > v.a) continue;
      if (proche(v.axe + DEMI_CARREFOUR, r.x[0]))
        croisement(v.axe, cz).branches.add("+x");
      if (proche(v.axe - DEMI_CARREFOUR, r.x[1]))
        croisement(v.axe, cz).branches.add("-x");
    }
    for (const h of H) {
      if (cx < h.de || cx > h.a) continue;
      if (proche(h.axe + DEMI_CARREFOUR, r.z[0]))
        croisement(cx, h.axe).branches.add("+z");
      if (proche(h.axe - DEMI_CARREFOUR, r.z[1]))
        croisement(cx, h.axe).branches.add("-z");
    }
    plaque(enrobe, r, ENROBE.dessus, ENROBE.epaisseur);
  }
  // les carrefours : les branches de la rue qui passe s'ajoutent quand un raccord se pose sur elle
  for (const c of croisements.values()) {
    for (const r of rues) {
      const t = r.h ? c.x : c.z;
      if (!proche(r.axe, r.h ? c.z : c.x) || t < r.de - EPS || t > r.a + EPS)
        continue;
      if (r.de < t - DEMI_CARREFOUR - EPS) c.branches.add(r.h ? "-x" : "-z");
      if (r.a > t + DEMI_CARREFOUR + EPS) c.branches.add(r.h ? "+x" : "+z");
    }
    const giratoire = plan.giratoires.some(
      ([gx, gz]) => proche(gx, c.x) && proche(gz, c.z),
    );
    c.demi = giratoire ? DEMI_GIRATOIRE : DEMI_CARREFOUR;
    if (giratoire) {
      pose("rues", "ROUNDABOUT", c.x, c.z);
      pose("nature", "TREE", c.x, c.z, 0, [1.2, 1.2, 1.2]); // l'arbre de l'ilot (road-kit)
    } else if (c.branches.size === 3) {
      const manque = ["-x", "+x", "-z", "+z"].find((b) => !c.branches.has(b));
      pose("rues", "TEE", c.x, c.z, BRANCHE[OPPOSE[manque]]);
    } else pose("rues", "CROSS", c.x, c.z);
  }
  // les troncons droits entre deux croisements (ou le bord du socle), etires ; leurs tirets, passages et lampadaires
  for (const r of rues) {
    const bornes = [...croisements.values()]
      .filter((c) => {
        const t = r.h ? c.x : c.z;
        return (
          proche(r.h ? c.z : c.x, r.axe) &&
          t >= r.de - DEMI_CARREFOUR - EPS &&
          t <= r.a + DEMI_CARREFOUR + EPS
        );
      })
      .map((c) => ({ t: r.h ? c.x : c.z, demi: c.demi }))
      .sort((a, b) => a.t - b.t);
    if (!bornes.length || bornes[0].t - bornes[0].demi > r.de + EPS)
      bornes.unshift({ t: r.de, demi: 0 });
    const fin = bornes[bornes.length - 1];
    if (fin.t + fin.demi < r.a - EPS) bornes.push({ t: r.a, demi: 0 });
    let cote = 1;
    for (let k = 0; k + 1 < bornes.length; k++) {
      const t0 = bornes[k].t + bornes[k].demi;
      const t1 = bornes[k + 1].t - bornes[k + 1].demi;
      if (t1 - t0 < 0.5) continue;
      const milieu = (t0 + t1) / 2;
      const [x, z] = r.h ? [milieu, r.axe] : [r.axe, milieu];
      pose("rues", "STRAIGHT", x, z, r.h ? 0 : 90, [(t1 - t0) / 10, 1, 1]);
      if (!detail) continue;
      for (let t = t0 + PAS_TIRETS / 2; t < t1 - 1.5; t += PAS_TIRETS) {
        const [dx, dz] = r.h ? [t, r.axe] : [r.axe, t];
        pose("rues", "DASH", dx, dz, r.h ? 0 : 90);
      }
      // un passage pieton a la sortie de chaque carrefour (pas au bord du socle), si le troncon est assez long
      for (const [borne, sens] of [
        [bornes[k], 1],
        [bornes[k + 1], -1],
      ]) {
        if (!borne.demi || t1 - t0 < 2 * ECART_PASSAGE) continue;
        const t = borne.t + sens * (borne.demi + 3);
        const [px, pz] = r.h ? [t, r.axe] : [r.axe, t];
        pose("rues", "CROSSING", px, pz, r.h ? 0 : 90);
      }
      // les lampadaires, d'un cote puis de l'autre, la crosse vers la chaussee
      for (let t = t0 + PAS_LAMPADAIRES / 2; t < t1 - 3; t += PAS_LAMPADAIRES) {
        const [lx, lz] = r.h
          ? [t, r.axe + cote * TROTTOIR]
          : [r.axe + cote * TROTTOIR, t];
        const angle = r.h ? (cote > 0 ? 0 : 180) : cote > 0 ? 90 : 270;
        pose("rues", "LAMP_POLE", lx, lz, angle);
        pose("rues", "LAMP_HEAD", lx, lz, angle);
        cote = -cote;
      }
    }
  }
}

// --- les pates : villas et leurs jardins, immeubles empiles, parcs et leurs chemins, la place et sa fontaine
function posePates(plan, poseur, { detail, tirage, beton }) {
  const { pose } = poseur;
  // les bords d'un pate qui donnent sur une rue (pas ceux qui touchent le bord du socle)
  const bordsRue = (p) =>
    ["-x", "+x", "-z", "+z"].filter((b) => {
      if (b === "-x") return p.x[0] > plan.socle.x[0] + EPS;
      if (b === "+x") return p.x[1] < plan.socle.x[1] - EPS;
      if (b === "-z") return p.z[0] > plan.socle.z[0] + EPS;
      return p.z[1] < plan.socle.z[1] - EPS;
    });
  const distance = (r, b, d) =>
    ({
      "+z": r.z[1] - b.z,
      "-z": b.z - r.z[0],
      "+x": r.x[1] - b.x,
      "-x": b.x - r.x[0],
    })[d];
  // la facade regarde la rue la plus proche parmi les bords permis
  const rueProche = (p, b, permis) => {
    const choix = bordsRue(p).filter((d) => !permis || permis.includes(d));
    const liste = choix.length ? choix : bordsRue(p);
    return liste.sort((a, c) => distance(p, b, a) - distance(p, b, c))[0];
  };
  for (const p of plan.pates) {
    if (p.type === "villas") poseVillas(p);
    else if (p.type === "immeubles")
      for (const b of p.boites) poseImmeuble(p, b);
    else if (p.type === "parc") poseParc(p);
    else if (p.type === "place")
      for (const b of p.boites) {
        pose("nature", "FOUNTAIN", b.x, b.z);
        // quatre arbres autour de la fontaine : la place n'est pas un parking
        for (const [dx, dz] of [
          [-7, -9],
          [7, -9],
          [-7, 9],
          [7, 9],
        ])
          pose("nature", "TREE", b.x + dx, b.z + dz, 0, [1.2, 1.2, 1.2]);
        if (detail) {
          pose("nature", "BENCH", b.x - 3.5, b.z, 90);
          pose("nature", "BENCH", b.x + 3.5, b.z, 270);
        }
      }
  }

  function poseVillas(p) {
    const choix = VILLAS[p.cote];
    const rues = bordsRue(p);
    for (const b of p.boites) {
      const q = b.parcelle;
      // la facade : le bord de la parcelle qui est aussi un bord du pate sur une rue, le plus proche ; sinon la rue du
      // pate la plus proche
      const surRue = rues.filter(
        (d) => Math.abs(distance(q, b, d) - distance(p, b, d)) < EPS,
      );
      const vers = (surRue.length ? surRue : rues).sort(
        (a, c) => distance(q, b, a) - distance(q, b, c),
      )[0];
      const lettre = choisis(tirage, choix);
      pose("villas", `VILLA_${lettre}`, b.x, b.z, FACADE[vers]);
      const [fx, fz] = VECTEUR[vers];
      // l'allee, de la porte au bord de la parcelle cote rue
      const depart = (b.profondeur / 2 + ALLEE.seuil) * 1;
      const bord = distance(q, b, vers);
      const [a0, a1] = [depart, bord];
      const w = ALLEE.largeur / 2;
      const rect = fx
        ? {
            x: [b.x + fx * Math.min(a0, a1), b.x + fx * Math.max(a0, a1)].sort(
              (m, n) => m - n,
            ),
            z: [b.z - w, b.z + w],
          }
        : {
            x: [b.x - w, b.x + w],
            z: [b.z + fz * Math.min(a0, a1), b.z + fz * Math.max(a0, a1)].sort(
              (m, n) => m - n,
            ),
          };
      if (a1 > a0) poseur.plaque(beton, rect, ALLEE.dessus, ALLEE.epaisseur);
      // les haies de thuyas : sur les bords de la parcelle, sauf cote rue. Un bord du pate : en retrait, dans la
      // parcelle ; un bord partage avec la parcelle voisine : une seule haie, sur le bord, posee par la parcelle a sa
      // gauche ou au-dessus (+x ou +z), pour ne jamais la doubler
      for (const d of ["-x", "+x", "-z", "+z"]) {
        if (d === vers) continue;
        const dehors = Math.abs(distance(q, b, d) - distance(p, b, d)) < EPS;
        if (!dehors && (d === "-x" || d === "-z")) continue;
        const retrait = dehors ? HAIE.retrait : 0;
        const longueur =
          (d[1] === "x" ? q.z[1] - q.z[0] : q.x[1] - q.x[0]) - 2 * HAIE.retrait;
        const position = {
          "-x": [q.x[0] + retrait, (q.z[0] + q.z[1]) / 2],
          "+x": [q.x[1] - retrait, (q.z[0] + q.z[1]) / 2],
          "-z": [(q.x[0] + q.x[1]) / 2, q.z[0] + retrait],
          "+z": [(q.x[0] + q.x[1]) / 2, q.z[1] - retrait],
        }[d];
        pose("nature", "HEDGE", ...position, d[1] === "x" ? 90 : 0, [
          longueur / HAIE.longueur,
          1,
          1,
        ]);
      }
      // un arbre dans le coin du jardin, derriere la maison ; un buisson pres de la rue
      const sapin = tirage() < 0.4;
      const k =
        p.cote === "camera" ? entre(tirage, 0.8, 1.3) : entre(tirage, 0.9, 1.5);
      const arriere = OPPOSE[vers];
      const lateral = fx ? "+z" : "+x";
      const [ax, az] = VECTEUR[arriere];
      const [lx, lz] = VECTEUR[lateral];
      const tx =
        b.x +
        ax * (distance(q, b, arriere) - 2.5) +
        lx * (distance(q, b, lateral) - 2.5);
      const tz =
        b.z +
        az * (distance(q, b, arriere) - 2.5) +
        lz * (distance(q, b, lateral) - 2.5);
      if (sapin) pose("nature", "FIR", tx, tz);
      else pose("nature", "TREE", tx, tz, 0, [k, k, k]);
      const buisson = tirage() < 0.5; // tire aussi en basse, pour que les deux versions gardent le meme tirage
      if (detail && buisson)
        pose(
          "nature",
          "BUSH",
          b.x + fx * (bord - 2) - lx * 3,
          b.z + fz * (bord - 2) - lz * 3,
        );
    }
  }

  function poseImmeuble(p, b) {
    const plot = b.largeur < 24 || b.profondeur > 12;
    const nom = plot ? "PLOT" : "BAR";
    const niveaux = Math.max(
      3,
      Math.min(6, Math.round((b.hauteur - 0.6) / ETAGE)),
    );
    // une barre (24 m le long de X) ne regarde que +z ou -z : tournee, elle sortirait de son pate
    const vers = rueProche(p, b, plot ? null : ["-z", "+z"]);
    const angle = FACADE[vers];
    pose(
      "immeubles",
      `${nom}_${tirage() < 0.3 ? "GROUND_SHOP" : "GROUND"}`,
      b.x,
      b.z,
      angle,
    );
    for (let n = 1; n < niveaux; n++)
      pose("immeubles", `${nom}_FLOOR`, b.x, b.z, angle, [1, 1, 1], n * ETAGE);
    const pans = niveaux <= 5 && tirage() < 0.5; // le toit a quatre pans s'arrete a 5 niveaux (19 m au plus)
    pose(
      "immeubles",
      `${nom}_${pans ? "ROOF_HIP" : "ROOF_FLAT"}`,
      b.x,
      b.z,
      angle,
      [1, 1, 1],
      niveaux * ETAGE,
    );
  }

  function poseParc(p) {
    const cx = (p.x[0] + p.x[1]) / 2;
    const cz = (p.z[0] + p.z[1]) / 2;
    const w = CHEMIN.largeur / 2;
    // deux chemins en beton qui se croisent au milieu du parc
    poseur.plaque(
      beton,
      { x: [p.x[0], p.x[1]], z: [cz - w, cz + w] },
      ALLEE.dessus,
      ALLEE.epaisseur,
    );
    poseur.plaque(
      beton,
      { x: [cx - w, cx + w], z: [p.z[0], p.z[1]] },
      ALLEE.dessus,
      ALLEE.epaisseur,
    );
    for (const b of p.boites) {
      const sapin = tirage() < 0.35;
      const k =
        p.cote === "camera" ? entre(tirage, 0.9, 1.5) : entre(tirage, 1, 1.6);
      if (Math.abs(b.x - cx) < w + 2 || Math.abs(b.z - cz) < w + 2) continue; // pas d'arbre sur un chemin
      if (sapin) pose("nature", "FIR", b.x, b.z);
      else pose("nature", "TREE", b.x, b.z, 0, [k, k, k]);
    }
    // les buissons sont tires aussi en basse, pour que les deux versions gardent le meme tirage
    const buissons = Array.from({ length: 4 }, () => [
      entre(tirage, p.x[0] + 3, p.x[1] - 3),
      entre(tirage, p.z[0] + 3, p.z[1] - 3),
    ]);
    if (detail) {
      pose("nature", "BENCH", cx - w - 1.5, cz + w + 2.5, 90);
      pose("nature", "BENCH", cx + w + 1.5, cz - w - 2.5, 270);
      for (const [bx, bz] of buissons)
        if (Math.abs(bx - cx) > w + 1 && Math.abs(bz - cz) > w + 1)
          pose("nature", "BUSH", bx, bz);
    }
  }
}

// --- les arbres du pre : la partie de la place du chantier qui n'est pas construite (quatre applications ou moins).
// Un petit lot a part, refait quand le terrain change ; rectangles : [{ x, z }] ; options : { quality, graine }.
export function arbresDuPre(
  THREE,
  kits,
  rectangles,
  { quality = "high", graine = "gdc", nombre = 20 } = {},
) {
  const lecture = lisKits(THREE, kits);
  const tirage = alea(`ville-pre:${graine}`);
  const poseur = creePoseur(THREE, lecture, {
    basse: quality !== "high",
    ombres: quality === "high",
    nom: "VILLE_PRE",
  });
  const surface = rectangles.reduce(
    (s, r) => s + Math.max(0, r.x[1] - r.x[0]) * Math.max(0, r.z[1] - r.z[0]),
    0,
  );
  for (const r of rectangles) {
    const a = Math.max(0, r.x[1] - r.x[0]) * Math.max(0, r.z[1] - r.z[0]);
    const n = surface ? Math.round((nombre * a) / surface) : 0;
    for (let k = 0; k < n; k++) {
      const x = entre(tirage, r.x[0] + 3, r.x[1] - 3);
      const z = entre(tirage, r.z[0] + 3, r.z[1] - 3);
      const kz = entre(tirage, 0.9, 1.4);
      if (tirage() < 0.3) poseur.pose("nature", "FIR", x, z);
      else poseur.pose("nature", "TREE", x, z, 0, [kz, kz, kz]);
    }
  }
  const lot = poseur.fusionne(null);
  lecture.libere();
  return {
    racine: lot.groupe,
    dispose() {
      lot.groupe.removeFromParent();
      for (const j of lot.jetables) j.dispose();
    },
  };
}
