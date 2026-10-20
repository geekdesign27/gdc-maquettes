// Le sous-sol commun : un ouvrage partage par plusieurs applications (base de donnees, composants communs), vu en
// coupe sous le niveau du sol (catalogue : shared-basement). Production mixte, brief valide par Pierre-Alain le
// 20 octobre 2026 :
// - un bloc de terre coupe devant (le plan de coupe est la face avant, z = +1,50), pose par GDC sous la rue, devant
//   les parcelles ; son dessus est a y = 0 ;
// - dedans, la galerie en beton (dalles du kit livre building-kit, posees a plat et debout), 3 m de large et 2,70 m
//   de haut, et trois gaines le long du mur du fond : les reseaux qui en font un ouvrage commun ;
// - un puits par batiment relie (links), reparti regulierement, qui remonte au sol avec son echelle, sa gaine et sa
//   trappe ; GDC place le sous-sol pour que chaque puits soit sous sa parcelle ;
// - default : la galerie en service, gaines graphite ; active : un echange en cours, gaines en bleu tech (une image
//   fixe, sans clignoter) ; data.progress : la part construite depuis la gauche, le reste est encore de la terre
//   pleine (sans progress : entierement construite).
// Qualite basse (bible 18.3) : sans echelles, les trois gaines fusionnees en une. Les dalles du kit sont partagees :
// jamais liberees ici ; seuls la geometrie unite et les materiaux crees par ce composant le sont.

const KIT = "kit:building-kit/BLD_KIT_A_v003.glb";
const TRAME = 3.0;
const SOL = { dessus: -3.9, dalle: 0.3 }; // dessus du radier
const PLAFOND = -1.2; // sous-face de la dalle de couverture (hauteur libre 2,70 m)
const TERRE = { fond: -4.6, arriere: -2.6 }; // le bloc de terre : dessous et face arriere
const MUR = { nu: -1.5, epaisseur: 0.3 }; // mur du fond : nu interieur
const COUPE = 1.5; // le plan de coupe, face avant du bloc
const BOUT = 1.0; // terre pleine au-dela de chaque bout de la galerie
const PUITS = 1.5; // ouverture d'un puits, en x comme en z (de 0 au plan de coupe)
const PAROI = 0.2; // parois du puits
const MARGELLE = 0.3; // hauteur de la margelle au-dessus du sol
// les trois gaines au pied du mur du fond (sous l'angle de la camera, la couverture cache le haut du mur) : deux
// empilees contre le mur, une couchee devant ; [bas, haut, devant (depuis le nu du mur), profondeur]
const GAINES = [
  [-3.9, -3.65, 0, 0.25],
  [-3.65, -3.4, 0, 0.25],
  [-3.9, -3.65, 0.3, 0.25],
];

export const meta = {
  id: "shared-basement",
  version: "1.0.0",
  category: "building",
  states: ["default", "active"],
  params: {
    length: { type: "number", default: 12, min: 4, max: 60 },
    links: { type: "number", default: 2, min: 2, max: 6 },
  },
  anchors: ["label", "badge"],
  budget: { triangles: 10000, materials: 6 },
  animated: false,
  assets: [KIT],
};

const borne = (v, p) =>
  Math.min(Math.max(Number(v) || p.default, p.min), p.max);

export function create(THREE, params, ctx) {
  const dalle = ctx.assets[KIT].scene.getObjectByName("BLD_KIT_A_SLAB");
  const root = new THREE.Group();
  root.name = "shared-basement";
  root.userData.component = meta.id;
  const basse = ctx.quality === "low";

  // la galerie : un nombre entier de trames ; les puits sur les trames les plus proches d'une repartition reguliere
  const travees = Math.max(
    2,
    Math.round(borne(params.length, meta.params.length) / TRAME),
  );
  const liens = Math.min(
    Math.round(borne(params.links, meta.params.links)),
    travees,
  );
  const x0 = (-travees * TRAME) / 2;
  const centre = (i) => x0 + (i + 0.5) * TRAME;
  const puits = Array.from({ length: liens }, (_, k) =>
    Math.floor(((k + 0.5) * travees) / liens),
  );

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
  const graphite = materiau("MAT_PAINTED_METAL_GRAPHITE");
  const tech = materiau("MAT_TECH");
  const acier = materiau("MAT_STEEL");
  const cube = new THREE.BoxGeometry(1, 1, 1);

  const contenu = new THREE.Group();
  root.add(contenu);
  // un pave par ses bornes (Three.js : Y vertical, avant vers +Z)
  const pave = (mat, [xa, xb], [ya, yb], [za, zb], parent = contenu) => {
    const m = new THREE.Mesh(cube, mat);
    m.scale.set(xb - xa, yb - ya, zb - za);
    m.position.set((xa + xb) / 2, (ya + yb) / 2, (za + zb) / 2);
    parent.add(m);
    return m;
  };
  // une piece de beton : la dalle du kit (3 x 0,30 x 3 m, posee par sa base) mise aux bornes voulues
  const beton = ([xa, xb], [ya, yb], [za, zb]) => {
    const m = dalle.clone(); // partage la geometrie et le materiau du kit
    m.scale.set((xb - xa) / TRAME, (yb - ya) / 0.3, (zb - za) / TRAME);
    m.position.set((xa + xb) / 2, ya, (za + zb) / 2);
    contenu.add(m);
    return m;
  };

  const construit = (state, progress) => {
    contenu.clear();
    const p =
      progress === undefined || progress === null
        ? 1
        : Math.min(Math.max(Number(progress) || 0, 0), 1);
    const faites = Math.round(p * travees); // travees construites, depuis la gauche
    const x1 = x0 + faites * TRAME; // bout de la partie construite
    const xFin = x0 + travees * TRAME;
    const radier = [SOL.dessus - SOL.dalle, SOL.dessus];
    const couverture = [PLAFOND, PLAFOND + SOL.dalle];
    const ouvert = [MUR.nu, COUPE];

    // --- la terre : dessous, derriere, dessus (ouverte au droit des puits), et la terre pleine pas encore creusee
    const xa = x0 - BOUT;
    const xb = xFin + BOUT;
    pave(terre, [xa, xb], [TERRE.fond, radier[0]], [TERRE.arriere, COUPE]);
    pave(
      terre,
      [xa, xb],
      [radier[0], couverture[1]],
      [TERRE.arriere, MUR.nu - MUR.epaisseur],
    );
    pave(terre, [xa, xb], [couverture[1], 0], [TERRE.arriere, 0]);
    let x = xa;
    for (const i of puits.filter((i) => i < faites)) {
      pave(
        terre,
        [x, centre(i) - PUITS / 2 - PAROI],
        [couverture[1], 0],
        [0, COUPE],
      );
      x = centre(i) + PUITS / 2 + PAROI;
    }
    pave(terre, [x, xb], [couverture[1], 0], [0, COUPE]);
    pave(
      terre,
      [xa, x0],
      [radier[0], couverture[1]],
      [MUR.nu - MUR.epaisseur, COUPE],
    );
    pave(
      terre,
      [x1, xb],
      [radier[0], couverture[1]],
      [MUR.nu - MUR.epaisseur, COUPE],
    );
    if (faites === 0) return;

    // --- la galerie : radier, mur du fond, couverture (ouverte au droit des puits)
    beton([x0, x1], radier, [MUR.nu - MUR.epaisseur, COUPE]);
    beton(
      [x0, x1],
      [radier[1], couverture[0]],
      [MUR.nu - MUR.epaisseur, MUR.nu],
    );
    x = x0;
    const puitsFaits = puits.filter((i) => i < faites);
    for (const i of puitsFaits) {
      beton([x, centre(i) - PUITS / 2], couverture, [
        MUR.nu - MUR.epaisseur,
        COUPE,
      ]);
      beton([centre(i) - PUITS / 2, centre(i) + PUITS / 2], couverture, [
        MUR.nu - MUR.epaisseur,
        0,
      ]);
      x = centre(i) + PUITS / 2;
    }
    beton([x, x1], couverture, [MUR.nu - MUR.epaisseur, COUPE]);

    // --- les gaines, contre le mur du fond ; en qualite basse, une seule
    const mat = state === "active" ? tech : graphite;
    if (basse) pave(mat, [x0, x1], [-3.9, -3.4], [MUR.nu, MUR.nu + 0.55]);
    else
      for (const [bas, haut, devant, profondeur] of GAINES)
        pave(mat, [x0, x1], [bas, haut], [MUR.nu + devant, MUR.nu + devant + profondeur]);

    // --- les puits : parois jusqu'a la margelle, trappe, gaine montante, echelle
    for (const i of puitsFaits) {
      const c = centre(i);
      const [g, d] = [c - PUITS / 2, c + PUITS / 2];
      const haut = [couverture[1], MARGELLE];
      beton([g - PAROI, g], haut, [-PAROI, COUPE]);
      beton([d, d + PAROI], haut, [-PAROI, COUPE]);
      beton([g, d], haut, [-PAROI, 0]);
      pave(graphite, [g, d], [MARGELLE, MARGELLE + 0.05], [0, COUPE]);
      pave(mat, [d - 0.3, d - 0.1], [couverture[0], MARGELLE], [0.05, 0.25]); // la montante vers le batiment
      if (basse) continue;
      const xe = [c - 0.25, c + 0.25]; // l'echelle, contre la paroi du fond du puits, du radier a la trappe
      const ze = [0.05, 0.11];
      for (const xr of xe)
        pave(acier, [xr - 0.03, xr + 0.03], [radier[1], MARGELLE], ze);
      for (let y = radier[1] + 0.3; y < MARGELLE - 0.1; y += 0.3)
        pave(acier, [xe[0], xe[1]], [y - 0.02, y + 0.02], ze);
    }
  };

  const ombres = () =>
    contenu.traverse((o) => {
      if (o.isMesh) o.castShadow = o.receiveShadow = !basse;
    });

  const ancres = {
    label: [0, MARGELLE + 0.6, 0],
    badge: [x0 + travees * TRAME + BOUT, MARGELLE + 0.6, 0],
  };

  let state = "default";
  construit(state);
  ombres();

  return {
    root,
    setState(next, data = {}) {
      if (!meta.states.includes(next))
        throw new Error(`état inconnu : ${next}`);
      state = next;
      construit(state, data.progress);
      ombres();
    },
    update() {
      return false;
    },
    anchor(name) {
      const a = ancres[name];
      if (!a) throw new Error(`ancre inconnue : ${name}`);
      return new THREE.Vector3(...a);
    },
    dispose() {
      root.clear();
      cube.dispose();
      for (const m of [terre, graphite, tech, acier]) m.dispose();
    },
  };
}
