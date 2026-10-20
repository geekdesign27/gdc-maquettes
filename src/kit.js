// La demonstration d'un kit (catalogue : kind kit) : le batiment de demonstration assemble par le code a partir des
// pieces du GLB du kit, selon le plan que son script Blender ecrit a cote (demonstration.json). Il prouve le critere
// « s'assemble sans retouche » et sert a la revue de planche. Outil de la galerie seulement : il n'est pas dans la
// bibliotheque livree a GDC. Il suit la forme du contrat (root, setState, update, anchor, dispose), comme l'etalon.
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { materiauPalette } from "./etalon.js";

const plans = import.meta.glob("../components/kit/*/demonstration.json", {
  eager: true,
  import: "default",
});

export const PREFIXE_ID = "kit:";

// Les kits qui ont une demonstration : { id, plan }.
export function demonstrations(catalogue) {
  return catalogue.items
    .filter((i) => i.kind === "kit")
    .map((i) => ({
      entry: i,
      plan: plans[`../components/kit/${i.id}/demonstration.json`],
    }))
    .filter((x) => x.plan);
}

// Le meta d'un kit, pour le chargeur de modeles : ses fichiers sont dans components/kit/<id>/.
export function metaKit(entry) {
  return {
    id: entry.id,
    category: entry.category,
    assets: entry.assets,
    states: ["default"],
    anchors: [],
    budget: entry.budget,
  };
}

// Blender (Z vertical, avant vers -Y) vers Three.js (Y vertical), comme l'export glTF.
const versThree = ([x, y, z]) => [x, z, -y];

// assets : le GLB du kit copie pour cette instance (chargeur.assetsPour). Les geometries et materiaux du GLB sont
// partages : seuls ceux des socles sont liberes ici.
export function create(THREE, entry, plan, assets, ctx) {
  const root = new THREE.Group();
  root.name = `demonstration-${entry.id}`;
  const ombres = ctx.quality === "high";
  const kit = assets[entry.assets[0]].scene;
  const manquantes = new Set();

  // Qualite basse (bible 18.3) : la piece <PIECE>_LOW du kit quand elle existe, sinon la piece elle-meme.
  const basse = ctx.quality === "low";
  for (const p of plan.pieces) {
    const source =
      (basse && kit.getObjectByName(p.piece + "_LOW")) ||
      kit.getObjectByName(p.piece);
    if (!source) {
      manquantes.add(p.piece);
      continue;
    }
    const piece = source.clone();
    piece.position.set(...versThree(p.position));
    piece.rotation.set(0, THREE.MathUtils.degToRad(p.rotation), 0);
    root.add(piece);
  }

  // Les socles maquette (bible, 18.5) : dessus a y = 0, aretes arrondies en classe C3.
  const jetables = [];
  const socles = new Set();
  const materiaux = new Map(); // un materiau par MAT_, partage par les socles
  for (const s of plan.socles) {
    const [l, pr, h] = s.taille;
    const geometrie = new RoundedBoxGeometry(l, h, pr, 3, s.chanfrein);
    if (!materiaux.has(s.materiau))
      materiaux.set(s.materiau, materiauPalette(THREE, s.materiau));
    const materiau = materiaux.get(s.materiau);
    jetables.push(geometrie);
    const socle = new THREE.Mesh(geometrie, materiau);
    socle.position.set(s.centre[0], -h / 2, -s.centre[1]);
    socles.add(socle);
    root.add(socle);
  }

  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = ombres && !socles.has(o);
      o.receiveShadow = ombres;
    }
  });

  return {
    root,
    manquantes: [...manquantes],
    pieces: plan.pieces.length,
    setState() {},
    update() {
      return false;
    },
    anchor(nom) {
      throw new Error(`ancre inconnue : ${nom}`);
    },
    dispose() {
      for (const x of [...jetables, ...materiaux.values()]) x.dispose();
    },
  };
}
