// Le terrain de chantier : le sol du chantier cloture, de la terre d'abord, puis du beton et des voies a mesure que le
// chantier avance (catalogue : site-ground). Fiche validee par Pierre-Alain le 21 octobre 2026.
// Production code. Un plateau maquette de 0,60 m en MAT_EARTH (bible, 18.5), aretes en C3 ; son dessus est 5 mm sous
// zero, pour que les socles des lieux poses dessus (dessus a zero) se fondent dans la terre sans scintiller.
// data.zones dessine des dalles de 0,10 m : c'est GDC qui les choisit (plus de beton quand un batiment avance), le
// composant ne fait que les dessiner, rognees au plateau.
// Version 1.1.0 (constat D-2, decision de Pierre-Alain du 22 octobre 2026) : la largeur va jusqu'a 120 m ; a 80 m, le
// terrain de trois ou quatre applications s'arretait avant le bord droit du chantier, et sa cloture flottait sur le vide.
// Version 1.2.0 (building 3.0.0, decision de Pierre-Alain du 28 octobre 2026) : la largeur va jusqu'a 140 m ; quatre
// batiments de 5 trames de facade (parcelles de 21 m) font un chantier de 136 m.

export const meta = {
  id: "site-ground",
  version: "1.2.0",
  category: "site",
  states: ["default"],
  params: {
    width: { type: "number", default: 40, min: 8, max: 140 },
    depth: { type: "number", default: 30, min: 8, max: 80 },
  },
  anchors: ["label"],
  budget: { triangles: 2000, materials: 3 },
  animated: false,
};

const EPAISSEUR = 0.6;
const C3 = 0.1; // chanfrein des aretes, en 3 segments (bible, 18.3)
const DESSUS = -0.005;
// les dalles : 0,10 m ; le beton depasse l'enrobe d'un centimetre, pour qu'une voie qui le touche ne scintille pas
const DALLES = {
  concrete: { materiau: "MAT_CONCRETE", dessus: 0.05 },
  asphalt: { materiau: "MAT_ASPHALT", dessus: 0.04 },
};
const DALLE = 0.1;

const borne = (v, p) =>
  Math.min(Math.max(Number(v) || p.default, p.min), p.max);

export function create(THREE, params, ctx) {
  const largeur = borne(params.width, meta.params.width);
  const profondeur = borne(params.depth, meta.params.depth);
  const ombres = ctx.quality === "high";

  const root = new THREE.Group();
  root.name = "site-ground";
  root.userData.component = meta.id;

  const materiau = (nom) => {
    const m = ctx.tokens.materiaux[nom];
    return new THREE.MeshStandardMaterial({
      name: nom,
      color: new THREE.Color(ctx.tokens.monde[m.couleur]),
      roughness: m.rugosite,
      metalness: m.metal,
    });
  };
  const terre = materiau("MAT_EARTH");
  const materiaux = Object.fromEntries(
    Object.entries(DALLES).map(([s, d]) => [s, materiau(d.materiau)]),
  );

  // Le plateau : un rectangle extrude, chanfreine sur ses aretes, couche a plat (l'extrusion devient la hauteur).
  const forme = new THREE.Shape();
  const [a, b] = [largeur / 2 - C3, profondeur / 2 - C3];
  forme.moveTo(-a, -b);
  forme.lineTo(a, -b);
  forme.lineTo(a, b);
  forme.lineTo(-a, b);
  forme.closePath();
  const plateauGeometrie = new THREE.ExtrudeGeometry(forme, {
    depth: EPAISSEUR - 2 * C3,
    bevelEnabled: true,
    bevelThickness: C3,
    bevelSize: C3,
    bevelSegments: 3,
  });
  plateauGeometrie.rotateX(-Math.PI / 2);
  plateauGeometrie.translate(0, DESSUS - (EPAISSEUR - C3), 0);
  const plateau = new THREE.Mesh(plateauGeometrie, terre);
  plateau.receiveShadow = ombres;
  root.add(plateau);

  // Les dalles : un cube unite mis a l'echelle de chaque zone.
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const zones = new THREE.Group();
  root.add(zones);
  const dessine = (liste) => {
    zones.clear();
    for (const z of Array.isArray(liste) ? liste : []) {
      const d = DALLES[z && z.surface];
      if (!d) continue;
      const [x, zc, w, p] = [z.x, z.z, z.width, z.depth].map(Number);
      if (![x, zc, w, p].every(Number.isFinite) || w <= 0 || p <= 0) continue;
      // rognee au plateau, chanfrein compris
      const x0 = Math.max(x - w / 2, -a);
      const x1 = Math.min(x + w / 2, a);
      const z0 = Math.max(zc - p / 2, -b);
      const z1 = Math.min(zc + p / 2, b);
      if (x1 <= x0 || z1 <= z0) continue;
      const m = new THREE.Mesh(cube, materiaux[z.surface]);
      m.scale.set(x1 - x0, DALLE, z1 - z0);
      m.position.set((x0 + x1) / 2, d.dessus - DALLE / 2, (z0 + z1) / 2);
      m.receiveShadow = ombres;
      zones.add(m);
    }
  };

  return {
    root,
    setState(state, data) {
      if (!meta.states.includes(state))
        throw new Error(`état inconnu : ${state}`);
      if (data && "zones" in data) dessine(data.zones);
    },
    update() {
      return false;
    },
    anchor(name) {
      // l'etiquette au milieu du bord avant, comme le terrain
      if (name === "label") return new THREE.Vector3(0, 0.1, profondeur / 2);
      throw new Error(`ancre inconnue : ${name}`);
    },
    dispose() {
      plateauGeometrie.dispose();
      cube.dispose();
      terre.dispose();
      for (const m of Object.values(materiaux)) m.dispose();
    },
  };
}
