// L'habillage d'un personnage a partir des fichiers du kit character-kit (blender/assets/character-kit.py) : la base
// (corps, visage, casque, squelette, animations) recoit la coiffure, la tenue du metier et l'outil, rebranches sur ses os,
// puis les couleurs de la personne. Partage par le composant et par la planche de l'equipe de la galerie.

const V = "_v003"; // la version de tous les fichiers du kit (character-kit v003, plan D-3)
export const BASE = `kit:character-kit/CHR_BASE_MASTER${V}.glb`;
export const COIFFURES = `kit:character-kit/CHR_HAIR_KIT${V}.glb`;
export const OUTILS = `kit:character-kit/PRP_CHR_TOOLS${V}.glb`;
export const METIERS = [
  "client",
  "architect",
  "engineer",
  "foreman",
  "mason",
  "electrician",
  "plumber",
  "painter",
  "inspector",
  "concierge",
  "representative",
  "worker", // l'ouvrier de la vie du chantier (1.2.0) : pas un agent
  "civilian", // badaud ou usager d'un batiment habite (1.2.0) : pas un agent
];
export const tenueDe = (trade) =>
  `kit:character-kit/CHR_OUTFIT_${trade.toUpperCase()}${V}.glb`;
export const FICHIERS = [BASE, COIFFURES, OUTILS, ...METIERS.map(tenueDe)];

// L'outil de chaque metier quand la personne n'en precise pas (docs/correspondances.md).
export const OUTIL_DU_METIER = {
  client: "none",
  architect: "plans",
  engineer: "tablet",
  foreman: "radio",
  mason: "trowel",
  electrician: "cable",
  plumber: "wrench",
  painter: "roller",
  inspector: "clipboard",
  concierge: "keys",
  representative: "binder",
  worker: "none",
  civilian: "none",
};

// Les fichiers dont une personne a besoin : l'hote peut ne fournir que ceux-la dans ctx.assets.
export function fichiersDe(apparence) {
  const outil = outilDe(apparence);
  return [
    BASE,
    COIFFURES,
    tenueDe(apparence.trade),
    ...(outil === "none" ? [] : [OUTILS]),
  ];
}

export function outilDe({ trade, tool = "auto" }) {
  return tool === "auto" ? OUTIL_DU_METIER[trade] : tool;
}

const CASQUE = "CHR_BASE_MASTER_HELMET";
const LAMPE = "PRP_CHR_HEADLAMP"; // la lampe frontale, clipsee au casque (base, v003)
const LENTILLE = "PRP_CHR_HEADLAMP_LENS";
export const SAC = "CHR_OUTFIT_WORKER_SACK"; // le sac de ciment de carry, dans la tenue d'ouvrier
const VISAGE = "CHR_BASE_MASTER_FACE";
const CILS = "CHR_BASE_MASTER_LASHES";
const EQUIPE_GLB = "MAT_FABRIC_SITE"; // le materiau des parties d'equipe dans les GLB du kit
const MATERIAU_EQUIPE = {
  architecture: "MAT_FABRIC_ARCHITECTURE",
  studies: "MAT_FABRIC_STUDIES",
  site: "MAT_FABRIC_SITE",
  reception: "MAT_FABRIC_RECEPTION",
  operations: "MAT_FABRIC_OPERATIONS",
  client: "MAT_SURFACE", // le casque blanc « cote client » (decision du 19 octobre 2026)
};
const CASQUE_OUVRIER = "MAT_FABRIC_WORKER"; // le casque gris de l'ouvrier, quelle que soit l'equipe
const CIVIL_GLB = "MAT_FABRIC_CIVIL_A"; // le coloris de la tenue de ville dans le GLB, remplace par celui de la personne

// Le casque : tout le monde le porte, sauf le client (equipe « none ») et la tenue de ville ; l'ouvrier toujours.
export const porteCasque = ({ trade, team }) =>
  trade === "worker" || (trade !== "civilian" && team !== "none");

// Rebranche sur la base les pieces d'un autre fichier du kit dont le nom passe garder(nom) : une piece rigide (enfant
// d'un os) passe sous l'os de meme nom de la base ; une piece deformee recoit un squelette fait des os de la base.
export function rebranche(THREE, base, source, garder) {
  const os = new Map();
  base.traverse((o) => {
    if (o.isBone) os.set(o.name, o);
  });
  const pieces = [];
  source.traverse((o) => {
    if (!o.isBone && o.name && garder(o.name) && !garder(o.parent?.name ?? ""))
      pieces.push(o);
  });
  for (const piece of pieces) {
    const parent = piece.parent;
    if (parent?.isBone) {
      const cible = os.get(parent.name);
      if (cible) cible.add(piece); // meme position locale sous le meme os
      continue;
    }
    (base.getObjectByName(parent?.name ?? "") ?? base).add(piece);
    piece.traverse((o) => {
      if (!o.isSkinnedMesh) return;
      const squelette = new THREE.Skeleton(
        o.skeleton.bones.map((b) => os.get(b.name)),
        o.skeleton.boneInverses,
      );
      o.bind(squelette, o.bindMatrix);
    });
  }
  return pieces;
}

// La piece a laquelle appartient un maillage : le premier ancetre au nom de piece (pas une primitive « _1 », pas un os).
function pieceDe(o) {
  for (let x = o; x; x = x.parent)
    if (/^(CHR|PRP)_/.test(x.name) && !x.isBone && !/_\d+$/.test(x.name))
      return x.name;
  return "";
}

// Habille la base d'une personne. apparence : { trade, team, body, skin, hair, hairColor, beard, glasses, tool,
// outfitColor } ; assets : les copies des fichiers (ctx.assets) ; materiau(nom) : un materiau de palette (MAT_...) fourni
// par l'appelant, qui le libere. Rend la scene de la base, ses clips, la lampe frontale detachee ({ parent, pieces,
// lentille }, ou null sans casque et en qualite basse), le sac de carry (ouvrier) et le nombre de squelettes.
export function habille(THREE, apparence, assets, materiau, qualite) {
  const a = apparence;
  const { scene, animations } = assets[BASE];
  const style = "CHR_HAIR_" + a.hair.toUpperCase();
  rebranche(
    THREE,
    scene,
    assets[COIFFURES].scene,
    (n) =>
      n === style ||
      (a.beard && n === "CHR_BEARD") ||
      (a.glasses && n === "CHR_GLASSES"),
  );
  rebranche(THREE, scene, assets[tenueDe(a.trade)].scene, (n) =>
    n.startsWith("CHR_OUTFIT_"),
  );
  const outil = outilDe(a);
  if (outil !== "none") {
    const nom = "PRP_TOOL_" + outil.toUpperCase();
    rebranche(
      THREE,
      scene,
      assets[OUTILS].scene,
      (n) => n === nom || n === nom + "_TEAM",
    );
  }
  const squelettes = partageSquelette(THREE, scene);

  // Le casque (porteCasque), blanc pour l'equipe client, gris pour l'ouvrier. La lampe frontale suit le casque ; sous
  // 0,30 m, elle disparait en qualite basse (bible 18.3). Elle est detachee : le composant la pose quand il l'allume.
  const casque = porteCasque(a);
  if (!casque) scene.getObjectByName(CASQUE).removeFromParent();
  let lampe = null;
  const pieces = [LAMPE, LENTILLE].map((n) => scene.getObjectByName(n));
  if (casque && qualite === "high" && pieces.every(Boolean))
    lampe = { parent: pieces[0].parent, pieces, lentille: pieces[1] };
  for (const o of pieces) o?.removeFromParent();
  if (a.body !== "F") scene.getObjectByName(CILS).removeFromParent();
  // qualite basse : ce qui mesure moins de 0,30 m disparait (bible 18.3) : les traits du visage et les cils
  for (const nom of [VISAGE, CILS]) {
    const o = scene.getObjectByName(nom);
    if (o) o.visible = qualite === "high";
  }

  // Les couleurs : chaque fichier apporte sa copie des materiaux ; tout passe par un materiau de palette par nom MAT_,
  // si bien que le personnage compte ses materiaux comme la fiche.
  const equipe = MATERIAU_EQUIPE[a.team];
  const echanges = {
    MAT_SKIN_B: "MAT_SKIN_" + a.skin,
    MAT_HAIR_BROWN: "MAT_HAIR_" + a.hairColor.toUpperCase(),
    [CIVIL_GLB]: "MAT_FABRIC_CIVIL_" + (a.outfitColor ?? "a").toUpperCase(),
  };
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const nom = o.material.name;
    const piece = pieceDe(o);
    let final = nom;
    if (echanges[nom]) final = echanges[nom];
    else if (piece === CASQUE && a.trade === "worker") final = CASQUE_OUVRIER;
    else if (piece === CASQUE && equipe) final = equipe;
    else if (nom === EQUIPE_GLB && piece.endsWith("_TEAM") && equipe)
      final =
        piece.includes("_VEST_") && a.team === "site"
          ? "MAT_FABRIC_HIVIS"
          : equipe; // gilet orange (bible 18.8)
    o.material = materiau(final);
    const k = o.morphTargetDictionary?.FEMININE;
    if (k !== undefined) o.morphTargetInfluences[k] = a.body === "F" ? 1 : 0;
  });
  // la lampe detachee n'est pas dans la scene : ses couleurs a part (boitier graphite ; la lentille, le composant)
  for (const o of lampe?.pieces ?? [])
    o.traverse((x) => {
      if (x.isMesh) x.material = materiau(x.material.name);
    });
  return { scene, animations, lampe, sac: scene.getObjectByName(SAC), squelettes };
}

// Un squelette par personnage (plan D-1c, correction 4) : le corps, la tenue et la coiffure, deformes par les memes os,
// recoivent le meme THREE.Skeleton, si bien que Three.js ne recalcule et ne recharge qu'une texture d'os par image au
// lieu d'une par maillage. Un maillage dont les os ou les matrices de liaison different garde le sien. Rend le nombre
// de squelettes du personnage.
const EGAL = 1e-5;
export function partageSquelette(THREE, scene) {
  const deformes = [];
  scene.traverse((o) => {
    if (o.isSkinnedMesh) deformes.push(o);
  });
  const communs = [];
  for (const o of deformes) {
    const s = o.skeleton;
    const commun = communs.find(
      (c) =>
        c.bones.length === s.bones.length &&
        c.bones.every((b, i) => b === s.bones[i]) &&
        c.boneInverses.every((m, i) =>
          m.elements.every(
            (v, k) => Math.abs(v - s.boneInverses[i].elements[k]) < EGAL,
          ),
        ),
    );
    if (!commun) communs.push(s);
    else if (commun !== s) o.bind(commun, o.bindMatrix);
  }
  return communs.length;
}
