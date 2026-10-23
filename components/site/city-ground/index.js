// Le grand terrain : le sol de toute la ville, une seule maquette dans laquelle le chantier s'encastre (catalogue :
// city-ground, lot G9). Fiche validee par Pierre-Alain le 23 octobre 2026 : un seul socle pour toute la ville, la regle
// 18.5 vaut pour la carte entiere.
// Production code. Un plateau maquette de 3 m, aretes du dessus en C3 (bible, 18.5, amendement du 23 octobre 2026 : a
// 0,60 m, le bord ne faisait qu'environ 1 px au dezoom de la ville entiere ; a 3 m, environ 7 px) : ses cotes et son biseau sont
// en terre (MAT_EARTH), son dessus en herbe (MAT_LANDSCAPE). Le dessus est 10 mm sous zero, juste sous celui de
// site-ground (5 mm) : le terrain du chantier et les socles des lieux s'y fondent sans scintiller. data.zones dessine les
// dalles de beton (places, cours, parkings) ; elles sont fusionnees en un seul maillage, pour que le terrain coute trois
// appels de dessin quel que soit leur nombre (city-plan). Il recoit l'ombre et n'en porte pas. Les rues viennent de
// road-kit ; la bande libre du chantier (le pre et ses arbres) est posee par l'assemblage.

export const meta = {
  id: "city-ground",
  version: "1.0.0",
  category: "site",
  states: ["default"],
  params: {
    width: { type: "number", default: 325, min: 100, max: 340 },
    depth: { type: "number", default: 270, min: 100, max: 280 },
  },
  anchors: [],
  budget: { triangles: 2000, materials: 3, drawCalls: 3 },
  animated: false,
};

const EPAISSEUR = 3; // le socle de la ville (bible, 18.5), les lieux gardent leur socle de 0,60 m
const C3 = 0.1; // chanfrein des aretes du dessus, en 3 segments (bible, 18.3)
const DESSUS = -0.01;
// les dalles de beton : 0,10 m, dessus a 3 cm au-dessus de zero, au-dessus de l'herbe. Une zone grass ne dessine rien :
// le dessus du plateau est deja en herbe.
const DALLE = { epaisseur: 0.1, dessus: 0.03 };
const SURFACES = { concrete: "MAT_CONCRETE" };
// au plus 120 dalles retenues : 12 triangles chacune, le budget de 2 000 triangles compris le plateau
const MAX_DALLES = 120;

const borne = (v, p) => {
  const n = Number(v);
  return Math.min(Math.max(Number.isFinite(n) && v !== null && v !== "" ? n : p.default, p.min), p.max);
};

export function create(THREE, params, ctx) {
  const largeur = borne(params.width, meta.params.width);
  const profondeur = borne(params.depth, meta.params.depth);
  const ombres = ctx.quality === "high";

  const root = new THREE.Group();
  root.name = "city-ground";
  root.userData.component = meta.id;

  // Les materiaux de palette : ceux du registre commun de l'hote (ctx.materiau), jamais liberes ici ; sans registre,
  // ceux de cette instance, liberes par dispose().
  const propres = new Map();
  const materiau = (nom) => {
    if (ctx.materiau) return ctx.materiau(nom);
    if (!propres.has(nom)) {
      const d = ctx.tokens.materiaux[nom];
      propres.set(
        nom,
        new THREE.MeshStandardMaterial({
          name: nom,
          color: new THREE.Color(ctx.tokens.monde[d.couleur]),
          roughness: d.rugosite,
          metalness: d.metal,
        }),
      );
    }
    return propres.get(nom);
  };

  // Le plateau : un rectangle extrude, chanfreine, couche a plat. Groupe 0 de l'extrusion : les deux faces planes
  // (le dessus en herbe ; le dessous, jamais vu) ; groupe 1 : les cotes et le biseau, en terre.
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
  const plateau = new THREE.Mesh(plateauGeometrie, [
    materiau("MAT_LANDSCAPE"),
    materiau("MAT_EARTH"),
  ]);
  plateau.name = "CITY_GROUND_PLATEAU";
  plateau.receiveShadow = ombres;
  root.add(plateau);

  // Les dalles : une boite par zone, rognee au plateau, toutes fusionnees en un maillage par surface.
  const boite = new THREE.BoxGeometry(1, 1, 1);
  const cube = boite.toNonIndexed();
  boite.dispose();
  const dalles = new Map(); // surface -> maillage
  const dessine = (liste) => {
    for (const m of dalles.values()) {
      root.remove(m);
      m.geometry.dispose();
    }
    dalles.clear();
    const parSurface = new Map();
    let retenues = 0;
    for (const z of Array.isArray(liste) ? liste : []) {
      if (retenues >= MAX_DALLES) break;
      if (!z || !SURFACES[z.surface]) continue;
      const [x, zc, w, p] = [z.x, z.z, z.width, z.depth].map(Number);
      if (![x, zc, w, p].every(Number.isFinite) || w <= 0 || p <= 0) continue;
      const x0 = Math.max(x - w / 2, -a);
      const x1 = Math.min(x + w / 2, a);
      const z0 = Math.max(zc - p / 2, -b);
      const z1 = Math.min(zc + p / 2, b);
      if (x1 <= x0 || z1 <= z0) continue;
      if (!parSurface.has(z.surface)) parSurface.set(z.surface, []);
      parSurface.get(z.surface).push([x0, x1, z0, z1]);
      retenues += 1;
    }
    const pos = cube.getAttribute("position").array;
    const nor = cube.getAttribute("normal").array;
    for (const [surface, boites] of parSurface) {
      const positions = new Float32Array(boites.length * pos.length);
      const normales = new Float32Array(boites.length * nor.length);
      boites.forEach(([x0, x1, z0, z1], k) => {
        const [sx, sz] = [x1 - x0, z1 - z0];
        const [cx, cz] = [(x0 + x1) / 2, (z0 + z1) / 2];
        const cy = DALLE.dessus - DALLE.epaisseur / 2;
        for (let i = 0; i < pos.length; i += 3) {
          positions[k * pos.length + i] = cx + pos[i] * sx;
          positions[k * pos.length + i + 1] = cy + pos[i + 1] * DALLE.epaisseur;
          positions[k * pos.length + i + 2] = cz + pos[i + 2] * sz;
        }
        normales.set(nor, k * nor.length);
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      g.setAttribute("normal", new THREE.BufferAttribute(normales, 3));
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, materiau(SURFACES[surface]));
      m.name = "CITY_GROUND_CONCRETE";
      m.receiveShadow = ombres;
      root.add(m);
      dalles.set(surface, m);
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
      throw new Error(`ancre inconnue : ${name}`);
    },
    dispose() {
      for (const m of dalles.values()) m.geometry.dispose();
      dalles.clear();
      plateauGeometrie.dispose();
      cube.dispose();
      for (const m of propres.values()) m.dispose();
    },
  };
}
