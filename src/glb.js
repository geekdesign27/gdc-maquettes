// Lecture d'un fichier GLB sans Three.js : structure, noms, ancres, animations, triangles, materiaux.
// Sert au controle (npm run check) et a GDC avant d'adopter une version. Ne charge rien d'exterieur.

const MAGIC = 0x46546c67; // "glTF"
const JSON_CHUNK = 0x4e4f534a;

export function lisGlb(buffer) {
  const b = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  if (b.length < 20 || b.readUInt32LE(0) !== MAGIC) throw new Error("pas un fichier GLB");
  if (b.readUInt32LE(4) !== 2) throw new Error("version glTF " + b.readUInt32LE(4) + " (2 attendue)");
  const longueur = b.readUInt32LE(12);
  if (b.readUInt32LE(16) !== JSON_CHUNK) throw new Error("premier bloc non JSON");
  return JSON.parse(b.toString("utf8", 20, 20 + longueur));
}

// Extensions admises : celles que le chargeur standard de Three.js lit sans decodeur supplementaire.
const EXTENSIONS_ADMISES = new Set(["KHR_materials_emissive_strength", "KHR_materials_transmission", "KHR_materials_ior", "KHR_materials_specular", "KHR_texture_transform", "KHR_mesh_quantization"]);

// Resume mesurable d'un GLB : ce que le controle compare a la fiche du catalogue.
export function resumeGlb(gltf) {
  const noeuds = gltf.nodes || [];
  const utilisations = new Map();
  for (const n of noeuds) if (n.mesh !== undefined) utilisations.set(n.mesh, (utilisations.get(n.mesh) || 0) + 1);
  let triangles = 0;
  (gltf.meshes || []).forEach((m, i) => {
    for (const p of m.primitives || []) {
      if ((p.mode ?? 4) !== 4) continue;
      const acc = gltf.accessors[p.indices ?? p.attributes.POSITION];
      triangles += (acc.count / 3) * (utilisations.get(i) || 0);
    }
  });
  const externes = [...(gltf.buffers || []), ...(gltf.images || [])].filter((x) => x.uri !== undefined && !String(x.uri).startsWith("data:"));
  return {
    noeuds: noeuds.map((n) => n.name || ""),
    ancres: noeuds.map((n) => n.name || "").filter((n) => n.startsWith("ANCHOR_")),
    animations: (gltf.animations || []).map((a) => a.name || ""),
    triangles: Math.round(triangles),
    materiaux: (gltf.materials || []).length,
    materiaux_noms: (gltf.materials || []).map((m) => m.name || ""),
    textures: (gltf.textures || []).length,
    peau: (gltf.skins || []).length,
    extensions_refusees: (gltf.extensionsUsed || []).filter((e) => !EXTENSIONS_ADMISES.has(e)),
    ressources_externes: externes.map((x) => x.uri),
    cameras: (gltf.cameras || []).length,
    lumieres: ((gltf.extensions || {}).KHR_lights_punctual?.lights || []).length,
  };
}

// Nom d'ancre du catalogue vers nom de noeud : label -> ANCHOR_LABEL, room:* -> ANCHOR_ROOM_<n>.
export function nomAncre(nom) {
  return "ANCHOR_" + String(nom).replace(":*", "").replace(":", "_").replace(/-/g, "_").toUpperCase();
}

const NOM_FICHIER = /^(BLD|CHR|VEH|EQP|PRP|ENV)_[A-Z0-9]+(_[A-Z0-9]+)*_v\d{3}\.glb$/;
const NOM_NOEUD = /^(BLD|CHR|VEH|EQP|PRP|ENV|RIG)_[A-Z0-9]+(_[A-Z0-9]+)*(_v\d{3})?$|^ANCHOR_[A-Z0-9_]+$/;
const NOM_ANIMATION = /^ANM_[A-Z0-9_]+$/;
const NOM_MATERIAU = /^MAT_[A-Z0-9_]+$/;

// Ce que le controle exige d'un GLB, avant meme de le charger : convention de noms, rien d'exterieur,
// animations et budget de la fiche. ancresAttendues : noms ANCHOR_* que la fiche demande a ce fichier.
export function checkGlb(gltf, nomFichier, entry, ancresAttendues = []) {
  const r = resumeGlb(gltf);
  const p = [];
  if (!NOM_FICHIER.test(nomFichier)) p.push(`${nomFichier} : nom hors convention (FAMILLE_TYPE_VARIANTE_v001.glb)`);
  const mauvais = r.noeuds.filter((n) => !NOM_NOEUD.test(n));
  if (mauvais.length) p.push(`${nomFichier} : noeuds hors convention : ${mauvais.slice(0, 5).join(', ')}`);
  const anims = r.animations.filter((n) => !NOM_ANIMATION.test(n));
  if (anims.length) p.push(`${nomFichier} : animations hors convention (ANM_...) : ${anims.join(', ')}`);
  const mats = r.materiaux_noms.filter((n) => !NOM_MATERIAU.test(n));
  if (mats.length) p.push(`${nomFichier} : materiaux hors convention (MAT_...) : ${mats.join(', ')}`);
  if (r.ressources_externes.length) p.push(`${nomFichier} : ressources externes interdites : ${r.ressources_externes.join(', ')}`);
  if (r.extensions_refusees.length) p.push(`${nomFichier} : extensions non admises : ${r.extensions_refusees.join(', ')}`);
  if (r.cameras || r.lumieres) p.push(`${nomFichier} : cameras ou lumieres exportees (l'eclairage appartient a la scene)`);
  for (const a of entry.animations || []) if (!r.animations.includes(a)) p.push(`${nomFichier} : animation ${a} absente`);
  for (const a of ancresAttendues) if (!r.ancres.includes(a)) p.push(`${nomFichier} : ancre ${a} absente`);
  if (entry.budget && r.triangles > entry.budget.triangles) p.push(`${nomFichier} : ${r.triangles} triangles, budget ${entry.budget.triangles}`);
  if (entry.budget && r.materiaux > entry.budget.materials) p.push(`${nomFichier} : ${r.materiaux} materiaux, budget ${entry.budget.materials}`);
  return { problemes: p, resume: r };
}
