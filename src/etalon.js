// L'etalon de la scene de reference (lot G0) : un cube neutre dont on mesure les trois faces visibles,
// et le nuancier des materiaux MAT_ de src/palette.json, chacun sur un cube. Outil de la galerie seulement :
// il n'est pas dans la bibliotheque livree a GDC. Il suit la forme du contrat (root, setState, update, anchor, dispose).
import palette from "./palette.json" with { type: "json" };

export const ETALON_ID = "etalon";
const COTE = 3; // le cube etalon fait une trame de 3 m et un etage (bible, 18.2)
const SOCLE = { cote: 7, epaisseur: 0.6 }; // le socle maquette sous l'etalon (bible, 18.5)
const COLONNES = 5; // le nuancier en grille, alignee sur l'ecran pour que les etiquettes ne se chevauchent pas
const PAS_COLONNE = 4.5;
const PAS_RANG = 2.4;
const NUANCE = 1; // cote d'un cube du nuancier
const materiaux = Object.keys(palette.materiaux);
const etiquette = (nom) => nom.replace(/^MAT_/, ''); // les ancres du nuancier portent le nom court du materiau

export const meta = {
  id: ETALON_ID,
  states: ["default"],
  anchors: materiaux.map(etiquette),
  budget: { triangles: 0, materials: 0 },
};

// La couleur d'un materiau : une cle de monde, d'equipe ou de personnages (comme commun.couleur cote Blender).
function couleurPalette(cle) {
  return palette.monde[cle] ?? palette.equipe[cle] ?? palette.personnages?.[cle] ?? cle;
}

// Un materiau MAT_ de la palette, tel que le GLB l'apporterait : couleur sRGB, rugosite, metal.
export function materiauPalette(THREE, nom) {
  const d = palette.materiaux[nom];
  return new THREE.MeshStandardMaterial({
    name: nom,
    color: new THREE.Color(couleurPalette(d.couleur)),
    roughness: d.rugosite,
    metalness: d.metal,
  });
}

// Le nuancier est pose devant le cube etalon : les colonnes suivent la droite de l'ecran (+X -Z),
// les rangs descendent vers la camera (+X +Z).
function positionNuance(i) {
  const k = (i % COLONNES) - (COLONNES - 1) / 2;
  const r = Math.floor(i / COLONNES);
  const u = (k * PAS_COLONNE) / Math.SQRT2;
  const d = ((SOCLE.cote / 2) * Math.SQRT2 + 1.5 + r * PAS_RANG) / Math.SQRT2; // devant le coin du socle
  return [u + d, 0, d - u];
}

export function create(THREE, ctx) {
  const root = new THREE.Group();
  root.name = "etalon";
  const ombres = ctx.quality === "high";
  const jetables = [];
  const garde = (x) => {
    jetables.push(x);
    return x;
  };

  const cube = new THREE.Mesh(
    garde(new THREE.BoxGeometry(COTE, COTE, COTE)),
    garde(materiauPalette(THREE, "MAT_CONCRETE")),
  );
  cube.position.y = COTE / 2;
  cube.castShadow = ombres;
  cube.receiveShadow = ombres;
  root.add(cube);

  // Le socle maquette : dalle de terre, dessus a y = 0.
  const socle = new THREE.Mesh(garde(new THREE.BoxGeometry(SOCLE.cote, SOCLE.epaisseur, SOCLE.cote)), garde(materiauPalette(THREE, 'MAT_EARTH')));
  socle.position.y = -SOCLE.epaisseur / 2;
  socle.receiveShadow = ombres;
  root.add(socle);

  const petit = garde(new THREE.BoxGeometry(NUANCE, NUANCE, NUANCE));
  materiaux.forEach((nom, i) => {
    const m = new THREE.Mesh(petit, garde(materiauPalette(THREE, nom)));
    const [x, , z] = positionNuance(i);
    m.position.set(x, NUANCE / 2, z);
    m.castShadow = ombres;
    m.receiveShadow = ombres;
    root.add(m);
  });

  return {
    root,
    setState() {},
    update() {
      return false;
    },
    anchor(nom) {
      const i = materiaux.map(etiquette).indexOf(nom);
      if (i < 0) throw new Error(`ancre inconnue : ${nom}`);
      const [x, , z] = positionNuance(i);
      return new THREE.Vector3(x, NUANCE + 0.2, z);
    },
    dispose() {
      for (const x of jetables) x.dispose();
    },
  };
}

// Les centres des trois faces visibles depuis la camera iso (position +X +Y +Z) : dessus, gauche (+Z, l'avant -Y
// de Blender) et droite (+X). Coordonnees locales du cube etalon.
export const FACES = {
  dessus: [0, COTE, 0],
  gauche: [0, COTE / 2, COTE / 2],
  droite: [COTE / 2, COTE / 2, 0],
};

// Valeur affichee d'un pixel sRGB (0 a 255) : luminance Rec. 709 calculee en lineaire, reencodee en sRGB.
export function valeur([r, g, b]) {
  const lin = (c) => {
    const x = c / 255;
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  const y = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const s = y <= 0.0031308 ? y * 12.92 : 1.055 * y ** (1 / 2.4) - 0.055;
  return Math.round(s * 255);
}

// Valeur affichee de la couleur de palette d'un materiau : ce que son dessus doit montrer.
export function valeurPalette(nom) {
  const hexa = couleurPalette(palette.materiaux[nom].couleur).replace('#', '');
  return valeur([0, 2, 4].map((i) => parseInt(hexa.slice(i, i + 2), 16)));
}

// Lit les pixels au centre des trois faces, juste apres le rendu (le tampon n'est pas conserve ensuite).
// Moyenne d'un carre de 5 pixels de cote, pour ne pas dependre d'un pixel isole.
export function mesureFaces(THREE, renderer, camera, root) {
  const gl = renderer.getContext();
  const w = gl.drawingBufferWidth;
  const h = gl.drawingBufferHeight;
  const px = new Uint8Array(5 * 5 * 4);
  const v = new THREE.Vector3();
  const resultat = {};
  for (const [nom, p] of Object.entries(FACES)) {
    v.set(...p);
    root.localToWorld(v);
    v.project(camera);
    const x = Math.round(((v.x + 1) / 2) * w) - 2;
    const y = Math.round(((v.y + 1) / 2) * h) - 2;
    gl.readPixels(x, y, 5, 5, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const rgb = [0, 1, 2].map((k) => {
      let s = 0;
      for (let i = 0; i < 25; i++) s += px[i * 4 + k];
      return Math.round(s / 25);
    });
    resultat[nom] = {
      rgb,
      hex: `#${rgb
        .map((c) => c.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase()}`,
      valeur: valeur(rgb),
    };
  }
  return resultat;
}
