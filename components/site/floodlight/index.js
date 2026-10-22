// Le projecteur de chantier : un mat galvanise, leste, avec un ou deux projecteurs LED (catalogue : floodlight, plan D-2).
// Fiche validee par Pierre-Alain le 21 octobre 2026. Production blender : les pieces du GLB (blender/assets/floodlight.py)
// sont assemblees ici, le mat etire a la hauteur voulue ; les projecteurs regardent vers +Z de Three.js (l'avant -Y de
// Blender), inclines vers le sol.
// Aucune vraie lumiere (bible 17, et pour la fluidite) : allume, le verre brille dans la couleur des projecteurs de
// src/lumiere.json (ctx.tokens.lumiere) et une tache douce eclaire le sol devant, en melange additif, sans texture (un
// degrade par les couleurs de sommets) ; elle eclaircit le sol sans couvrir les objets poses dessus. Allumage en fondu
// de 0,5 s, une fois ; directement sans animation ; l'extinction est directe. Rien ne clignote, aucune couleur d'etat.
// Qualite basse : les pieces _LOW, pas de tache au sol.
// Les pieces fixes sont fusionnees a la creation (comme building 2.1.0) : un maillage pour l'acier, un pour les verres,
// un pour la tache. Le modele est partage : ses geometries et ses materiaux (acier, verre) ne sont jamais liberes ici ;
// les geometries fusionnees, la tache, le verre allume et la matiere de la tache, crees ici, le sont.

const MODELE = "ENV_FLOODLIGHT_A_v001.glb";
const P = "ENV_FLOODLIGHT_A_";
const LEST = 0.4; // le dessus du lest, ou le mat commence
const ECART_TETES = 0.33;
const FONDU = 0.5; // secondes
const TACHE = {
  avant: 0.55,
  rayon: 0.6,
  sol: 0.06,
  opacite: 0.22,
  anneaux: 4,
  cotes: 32,
}; // en hauteurs de mat
const LABEL = 0.9; // au-dessus de la barre

export const meta = {
  id: "floodlight",
  version: "1.0.0",
  category: "site",
  states: ["off", "on"],
  params: {
    heads: { type: "number", default: 2, min: 1, max: 2 },
    height: { type: "number", default: 6, min: 4, max: 8 },
  },
  anchors: ["label"],
  budget: { triangles: 1500, materials: 3 },
  animated: true,
  assets: [MODELE],
};

const borne = (v, p) =>
  Math.min(Math.max(Number(v) || p.default, p.min), p.max);

export function create(THREE, params, ctx) {
  const modele = ctx.assets[MODELE].scene;
  const root = new THREE.Group();
  root.name = "floodlight";
  root.userData.component = meta.id;
  const basse = ctx.quality === "low";
  const tetes = Math.round(borne(params.heads, meta.params.heads));
  const hauteur = borne(params.height, meta.params.height);
  const piece = (nom) => {
    const o =
      (basse && modele.getObjectByName(P + nom + "_LOW")) ||
      modele.getObjectByName(P + nom);
    if (!o) throw new Error(`pièce absente du modèle : ${nom}`);
    return o.clone();
  };

  // le montage, dans un groupe de travail : lest, mat etire, barre (deux tetes), tetes au sommet
  const montage = new THREE.Group();
  montage.add(piece("BASE"));
  const mat = piece("MAST");
  mat.position.y = LEST;
  mat.scale.y = hauteur - LEST;
  montage.add(mat);
  const places = tetes === 2 ? [-ECART_TETES, ECART_TETES] : [0];
  if (tetes === 2) {
    const barre = piece("BAR");
    barre.position.y = hauteur;
    montage.add(barre);
  }
  for (const x of places) {
    const tete = piece("HEAD");
    tete.position.set(x, hauteur, 0);
    montage.add(tete);
  }
  montage.updateMatrixWorld(true);

  // la fusion : un maillage par materiau du modele (acier, verre), sommets et normales portes dans le repere du root
  const parMateriau = new Map();
  montage.traverse((o) => {
    if (!o.isMesh) return;
    if (!parMateriau.has(o.material)) parMateriau.set(o.material, []);
    parMateriau.get(o.material).push(o);
  });
  const geometries = [];
  const fusionne = (maillages) => {
    let sommets = 0;
    let indices = 0;
    for (const o of maillages) {
      sommets += o.geometry.attributes.position.count;
      indices += o.geometry.index
        ? o.geometry.index.count
        : o.geometry.attributes.position.count;
    }
    const position = new Float32Array(sommets * 3);
    const normal = new Float32Array(sommets * 3);
    const index = new Uint32Array(indices);
    const v = new THREE.Vector3();
    const n = new THREE.Matrix3();
    let s = 0;
    let i = 0;
    for (const o of maillages) {
      const g = o.geometry;
      n.getNormalMatrix(o.matrixWorld);
      for (let k = 0; k < g.attributes.position.count; k++) {
        v.fromBufferAttribute(g.attributes.position, k)
          .applyMatrix4(o.matrixWorld)
          .toArray(position, (s + k) * 3);
        v.fromBufferAttribute(g.attributes.normal, k)
          .applyMatrix3(n)
          .normalize()
          .toArray(normal, (s + k) * 3);
      }
      const nb = g.index ? g.index.count : g.attributes.position.count;
      for (let k = 0; k < nb; k++)
        index[i++] = (g.index ? g.index.getX(k) : k) + s;
      s += g.attributes.position.count;
    }
    const geometrie = new THREE.BufferGeometry();
    geometrie.setAttribute("position", new THREE.BufferAttribute(position, 3));
    geometrie.setAttribute("normal", new THREE.BufferAttribute(normal, 3));
    geometrie.setIndex(new THREE.BufferAttribute(index, 1));
    geometries.push(geometrie);
    return geometrie;
  };
  let verre = null; // le maillage des verres, dont le materiau change avec l'etat
  for (const [materiau, maillages] of parMateriau) {
    const m = new THREE.Mesh(fusionne(maillages), materiau);
    m.name = P + (/^MAT_GLASS/.test(materiau.name) ? "LENSES" : "BODY");
    m.castShadow = m.receiveShadow = !basse;
    if (/^MAT_GLASS/.test(materiau.name)) verre = m;
    root.add(m);
  }
  const verreEteint = verre.material;

  // allume : le verre brille (couleur des projecteurs), et la tache au sol en qualite haute
  const lumiere = new THREE.Color(ctx.tokens.lumiere.projecteurs.couleur);
  const verreAllume = new THREE.MeshStandardMaterial({
    name: "FLOODLIGHT_LENS_LIT",
    color: verreEteint.color.clone(),
    roughness: verreEteint.roughness,
    metalness: verreEteint.metalness,
    emissive: lumiere,
    emissiveIntensity: 0,
  });
  let tache = null;
  if (!basse) {
    // des anneaux concentriques, l'opacite de chaque sommet en couleur (degrade doux, nul au bord)
    const R = TACHE.rayon * hauteur;
    const pos = [0, 0, 0];
    const col = [1, 1, 1, 1];
    for (let a = 1; a <= TACHE.anneaux; a++) {
      const r = a / TACHE.anneaux;
      const alpha = Math.pow(1 - r * r, 2);
      for (let k = 0; k < TACHE.cotes; k++) {
        const t = (k / TACHE.cotes) * Math.PI * 2;
        pos.push(Math.cos(t) * r * R, 0, Math.sin(t) * r * R);
        col.push(1, 1, 1, alpha);
      }
    }
    const idx = [];
    const sommet = (a, k) => 1 + (a - 1) * TACHE.cotes + (k % TACHE.cotes);
    for (let k = 0; k < TACHE.cotes; k++)
      idx.push(0, sommet(1, k + 1), sommet(1, k));
    for (let a = 1; a < TACHE.anneaux; a++)
      for (let k = 0; k < TACHE.cotes; k++)
        idx.push(
          sommet(a, k),
          sommet(a, k + 1),
          sommet(a + 1, k),
          sommet(a, k + 1),
          sommet(a + 1, k + 1),
          sommet(a + 1, k),
        );
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 4));
    g.setIndex(idx);
    geometries.push(g);
    tache = new THREE.Mesh(
      g,
      new THREE.MeshBasicMaterial({
        name: "FLOODLIGHT_POOL",
        color: lumiere.clone().multiplyScalar(TACHE.opacite),
        vertexColors: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    tache.name = P + "POOL";
    tache.position.set(0, TACHE.sol, TACHE.avant * hauteur);
    tache.renderOrder = 1;
  }

  // l'allumage : 0 eteint, 1 allume ; le fondu ne joue qu'a l'allumage
  let niveau = 0;
  let fondu = false;
  const applique = () => {
    verreAllume.color.copy(verreEteint.color).lerp(lumiere, niveau);
    verreAllume.emissiveIntensity = niveau;
    if (tache) tache.material.opacity = niveau;
  };

  return {
    root,
    setState(state) {
      if (!meta.states.includes(state))
        throw new Error(`état inconnu : ${state}`);
      if (state === "off") {
        niveau = 0;
        fondu = false;
        verre.material = verreEteint;
        if (tache) tache.removeFromParent();
        return;
      }
      if (verre.material === verreAllume) return; // deja allume : rien ne rejoue
      verre.material = verreAllume;
      if (tache) root.add(tache);
      niveau = ctx.reducedMotion ? 1 : 0;
      fondu = !ctx.reducedMotion;
      applique();
    },
    update(dt) {
      if (!fondu) return false;
      niveau = Math.min(niveau + dt / FONDU, 1);
      applique();
      if (niveau >= 1) fondu = false;
      return true;
    },
    anchor(name) {
      if (name !== "label") throw new Error(`ancre inconnue : ${name}`);
      return new THREE.Vector3(0, hauteur + LABEL, 0);
    },
    dispose() {
      root.clear();
      for (const g of geometries) g.dispose();
      verreAllume.dispose();
      if (tache) tache.material.dispose();
    },
  };
}
