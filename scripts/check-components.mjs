// Le controle : chaque composant et chaque kit du catalogue respecte-t-il le contrat ?
// Lance par « npm run check » ; GDC relance le meme controle avant d'adopter une version.
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { checkSource, checkMeta, checkInstance } from '../src/contract.js';
import { makeContext } from '../src/tokens.js';
import { creeChargeur } from '../src/assets.js';
import { lisGlb, checkGlb } from '../src/glb.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalogue = JSON.parse(await readFile(join(ROOT, 'catalogue.json'), 'utf8'));
const items = catalogue.items.filter((i) => i.kind === 'component' || i.kind === 'kit');
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

const contexts = [];
for (const quality of ['low', 'high']) for (const reducedMotion of [false, true]) for (const theme of ['light', 'dark']) contexts.push({ theme, quality, reducedMotion });

// Tous les GLB du depot, pour le chargeur (comme la bibliotheque construite les embarque).
const sources = {};
for (const cat of existsSync(join(ROOT, 'components')) ? await readdir(join(ROOT, 'components')) : []) {
  for (const id of await readdir(join(ROOT, 'components', cat))) {
    for (const f of await readdir(join(ROOT, 'components', cat, id))) {
      if (f.endsWith('.glb')) { const b = await readFile(join(ROOT, 'components', cat, id, f)); sources[`${cat}/${id}/${f}`] = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); }
    }
  }
}
const chargeur = creeChargeur({ GLTFLoader, SkeletonUtils }, sources);

// Un GLB vient toujours de son script Blender : asset.json garde les empreintes du script et du fichier.
async function provenance(dossier, entry, fichiers) {
  const p = [];
  const metaP = join(dossier, 'asset.json');
  if (!existsSync(metaP)) return ['asset.json absent : le GLB doit sortir de npm run blender -- ' + entry.id];
  const m = JSON.parse(await readFile(metaP, 'utf8'));
  const script = join(ROOT, m.script || '');
  if (!m.script || !existsSync(script)) p.push('script Blender introuvable : ' + (m.script || '?'));
  else if (sha(await readFile(script)) !== m.script_sha256) p.push(`${m.script} a change depuis l'export : relance npm run blender -- ${entry.id}`);
  for (const [cle, chemin] of [['commun_sha256', 'blender/gdc_blender/commun.py'], ['palette_sha256', 'src/palette.json']]) {
    if (m[cle] && sha(await readFile(join(ROOT, chemin))) !== m[cle]) p.push(`${chemin} a change depuis l'export : relance npm run blender -- ${entry.id}`);
  }
  const glbP = join(dossier, m.nom + '.glb');
  if (!fichiers.includes(m.nom + '.glb')) p.push('asset.json decrit ' + m.nom + '.glb, absent de la fiche');
  else if (!existsSync(glbP)) p.push(m.nom + '.glb absent');
  else if (sha(await readFile(glbP)) !== m.glb_sha256) p.push(m.nom + '.glb modifie hors du script : relance npm run blender -- ' + entry.id);
  // les autres fichiers d'un kit (tenues, coiffures, outils) : leurs empreintes sont dans asset.json, sous « fichiers »
  for (const f of fichiers.filter((x) => x !== m.nom + '.glb')) {
    const empreinte = (m.fichiers || {})[f.replace(/\.glb$/, '')];
    if (!empreinte) p.push(`${f} absent de asset.json : il doit sortir de npm run blender -- ${entry.id}`);
    else if (existsSync(join(dossier, f)) && sha(await readFile(join(dossier, f))) !== empreinte) p.push(f + ' modifie hors du script : relance npm run blender -- ' + entry.id);
  }
  return p;
}

// Le fichier principal d'un kit (asset.json « nom ») porte le squelette et les animations de la fiche ; les autres
// fichiers (tenues, coiffures, outils) se branchent dessus et n'ont pas a les repeter.
async function fichierPrincipal(dossier) {
  const metaP = join(dossier, 'asset.json');
  return existsSync(metaP) ? JSON.parse(await readFile(metaP, 'utf8')).nom + '.glb' : null;
}

const errors = [];
let ok = 0;
let pending = 0;

for (const entry of items) {
  const dossier = join(ROOT, 'components', entry.category, entry.id);
  const fichiers = entry.assets || [];
  const propres = fichiers.filter((f) => !f.startsWith('kit:'));
  const code = join(dossier, 'index.js');
  const present = entry.kind === 'kit' ? propres.some((f) => existsSync(join(dossier, f))) : existsSync(code);
  if (!present) {
    if (entry.status === 'à faire') { pending += 1; continue; }
    errors.push([entry.id, [`statut « ${entry.status} » mais rien dans components/${entry.category}/${entry.id}/`]]);
    continue;
  }
  const problems = [];
  // les modeles : convention, rien d'exterieur, animations, ancres, budget, provenance
  const principal = propres.length > 1 ? await fichierPrincipal(dossier) : null;
  for (const f of propres) {
    const p = join(dossier, f);
    if (!existsSync(p)) { problems.push(f + ' absent'); continue; }
    try {
      const fiche = principal && f !== principal ? { ...entry, animations: [] } : entry;
      const { problemes } = checkGlb(lisGlb(await readFile(p)), f, fiche);
      problems.push(...problemes);
    } catch (e) { problems.push(`${f} illisible : ${e.message}`); }
  }
  if (propres.length) problems.push(...await provenance(dossier, entry, propres));
  if (entry.kind === 'component') {
    // Un code qui contient un motif interdit n'est jamais execute, meme pour etre controle.
    const src = checkSource(await readFile(code, 'utf8'));
    problems.push(...src);
    let mod;
    if (!src.length) {
      try { mod = await import(pathToFileURL(code).href); } catch (e) { problems.push(`le module ne se charge pas : ${e.message}`); }
    }
    if (mod) {
      if (typeof mod.create !== 'function') problems.push('create() manquant');
      const metaProblems = checkMeta(mod.meta, entry);
      problems.push(...metaProblems);
      if (!metaProblems.length && typeof mod.create === 'function' && !problems.length) {
        try {
          await chargeur.prepare(mod.meta);
          const partagees = await chargeur.partagees(mod.meta);
          for (const o of contexts) problems.push(...checkInstance(THREE, mod, entry, makeContext(o, await chargeur.assetsPour(mod.meta)), partagees));
        } catch (e) { problems.push('modeles non chargeables : ' + e.message); }
      }
    }
  }
  if (problems.length) errors.push([entry.id, problems]);
  else ok += 1;
}

// Un dossier absent du catalogue est une erreur : le catalogue est la source unique.
const known = new Set(items.map((i) => `${i.category}/${i.id}`));
for (const category of existsSync(join(ROOT, 'components')) ? await readdir(join(ROOT, 'components')) : []) {
  for (const id of await readdir(join(ROOT, 'components', category))) {
    if (!known.has(`${category}/${id}`)) errors.push([`${category}/${id}`, ['dossier absent du catalogue (ou catégorie différente)']]);
  }
}

for (const [id, problems] of errors) {
  console.log(`\n✗ ${id}`);
  for (const p of problems) console.log(`  - ${p}`);
}
console.log(`\n${ok} élément(s) conforme(s), ${errors.length} en erreur, ${pending} à faire (sur ${items.length}).`);
process.exit(errors.length ? 1 : 0);
