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
import { checkSource, checkMeta, checkInstance, checkHtml, checkSvg, checkHoverFiche, checkCorrespond } from '../src/contract.js';
import { correspond, sameRef } from '../src/survol.js';
import { makeContext } from '../src/tokens.js';
import { creeChargeur } from '../src/assets.js';
import { lisGlb, checkGlb } from '../src/glb.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalogue = JSON.parse(await readFile(join(ROOT, 'catalogue.json'), 'utf8'));
// les documents de l'interface (les polices) ont un dossier sous components/ : on y controle les licences
const items = catalogue.items.filter((i) => ['component', 'kit', 'html', 'illustration'].includes(i.kind) || (i.kind === 'document' && i.category === 'interface'));
// les evenements de chaque element d'interface, pour reconnaitre ceux d'une balise posee dans un autre
const composes = Object.fromEntries(catalogue.items.filter((i) => i.kind === 'html').map((i) => [`gdc-${i.id}`, Object.keys(i.outputs || {})]));
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
const materiau = chargeur.materiau(THREE);

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

// Une illustration (lot G7) : un SVG par identifiant de la fiche (files), et rien d'autre, chacun conforme a checkSvg.
// Un rendu Blender (production « blender ») garde dans asset.json les empreintes de ce qui l'a produit.
async function illustration(dossier, entry) {
  const p = [];
  const contenu = await readdir(dossier);
  const attendus = (entry.files || []).map((f) => f + '.svg');
  if (!attendus.length) p.push('la fiche ne liste aucun fichier (files)');
  for (const f of attendus) {
    if (!contenu.includes(f)) { p.push(f + ' absent'); continue; }
    p.push(...checkSvg(await readFile(join(dossier, f), 'utf8'), entry).map((x) => `${f} : ${x}`));
  }
  for (const f of contenu.filter((x) => x.endsWith('.svg') && !attendus.includes(x))) p.push(`${f} absent de la fiche (files)`);
  if (entry.production !== 'blender') return p;
  const metaP = join(dossier, 'asset.json');
  if (!existsSync(metaP)) return p.concat('asset.json absent : les fichiers doivent sortir de npm run blender -- ' + entry.id);
  const m = JSON.parse(await readFile(metaP, 'utf8'));
  const relance = `relance npm run blender -- ${entry.id}`;
  const chemins = { [m.script]: m.script_sha256, 'blender/gdc_blender/commun.py': m.commun_sha256, 'src/palette.json': m.palette_sha256, ...(m.sources || {}) };
  for (const [chemin, empreinte] of Object.entries(chemins)) {
    if (!existsSync(join(ROOT, chemin))) p.push(`${chemin} introuvable`);
    else if (sha(await readFile(join(ROOT, chemin))) !== empreinte) p.push(`${chemin} a change depuis le rendu : ${relance}`);
  }
  for (const f of attendus.filter((x) => contenu.includes(x))) {
    if (!(m.fichiers || {})[f]) p.push(`${f} absent de asset.json : ${relance}`);
    else if (sha(await readFile(join(dossier, f))) !== m.fichiers[f]) p.push(`${f} modifie hors du script : ${relance}`);
  }
  return p;
}

const errors = [];
let ok = 0;
let pending = 0;

for (const entry of items) {
  const dossier = join(ROOT, 'components', entry.category, entry.id);
  const fichiers = entry.assets || [];
  const propres = fichiers.filter((f) => !f.includes(':')); // ceux d'un autre dossier sont controles chez eux
  const code = join(dossier, 'index.js');
  const present = entry.kind === 'kit' ? propres.some((f) => existsSync(join(dossier, f))) : ['document', 'illustration'].includes(entry.kind) ? existsSync(dossier) : existsSync(code);
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
          // avec le registre commun des materiaux (ctx.materiau, plan D-1), puis sans, comme un hote plus ancien
          for (const o of contexts) problems.push(...checkInstance(THREE, mod, entry, makeContext(o, await chargeur.assetsPour(mod.meta), materiau), partagees));
          problems.push(...checkInstance(THREE, mod, entry, makeContext(contexts[0], await chargeur.assetsPour(mod.meta)), partagees).map((p) => `${p} (sans registre)`));
        } catch (e) { problems.push('modeles non chargeables : ' + e.message); }
      }
    }
  }
  if (entry.kind === 'html') {
    const source = await readFile(code, 'utf8');
    const src = checkSource(source);
    problems.push(...src);
    if (!src.length) {
      try { problems.push(...checkHtml(await import(pathToFileURL(code).href), entry, source, composes)); } catch (e) { problems.push(`le module ne se charge pas : ${e.message}`); }
    }
  }
  if (entry.kind === 'document') {
    // une police n'entre dans le depot qu'avec sa licence (LICENSE-<famille>.txt) et sa fiche (README.md)
    const contenu = await readdir(dossier);
    if (!contenu.includes('README.md')) problems.push('README.md absent : source, licence et empreintes');
    for (const f of contenu.filter((x) => /\.(woff2?|ttf|otf)$/.test(x))) {
      if (!contenu.some((l) => l.startsWith('LICENSE-') && f.startsWith(l.slice(8, -4) + '-'))) problems.push(`${f} sans licence jointe`);
    }
  }
  if (entry.kind === 'illustration') problems.push(...await illustration(dossier, entry));
  if (problems.length) errors.push([entry.id, problems]);
  else ok += 1;
}

// Le survol partage (hover-link) : la regle sur des exemples, et chaque fiche qui emet gdc-hover lit highlight,
// y compris les fiches a faire et les prochaines versions, avant meme leur fabrication.
const survol = [...checkCorrespond({ correspond, sameRef }), ...catalogue.items.filter((i) => i.kind === 'html').flatMap((i) => checkHoverFiche(i).map((p) => `${i.id} : ${p}`))];
if (survol.length) errors.push(['hover-link', survol]);

// Le registre commun des materiaux (plan D-1) : une fois tous les modeles ouverts, un MAT_ ne doit pas arriver sous deux
// reglages differents d'un GLB a l'autre (la palette est la source unique) ; le registre les garde a part.
for (const cle of Object.keys(sources)) {
  const [category, id, fichier] = cle.split('/');
  await chargeur.prepare({ category, id, assets: [fichier] });
}
if (chargeur.registre.ecarts.length) errors.push(['registre des matériaux', chargeur.registre.ecarts.map((n) => `${n} : réglages différents d'un modèle à l'autre`)]);

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
console.log(`Registre des matériaux : ${chargeur.registre.materiaux().size} matériaux partagés pour les ${Object.keys(sources).length} modèles et les contrôles.`);
process.exit(errors.length ? 1 : 0);
