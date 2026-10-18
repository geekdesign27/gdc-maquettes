// Le contrôle : chaque composant du catalogue respecte-t-il le contrat ?
// Lancé par « npm run check » ; GDC relance le même contrôle avant d'adopter une version.
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as THREE from 'three';
import { checkSource, checkMeta, checkInstance } from '../src/contract.js';
import { makeContext } from '../src/tokens.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalogue = JSON.parse(await readFile(join(ROOT, 'catalogue.json'), 'utf8'));
const items = catalogue.items.filter((i) => i.kind === 'component');

const contexts = [];
for (const quality of ['low', 'high']) for (const reducedMotion of [false, true]) for (const theme of ['light', 'dark']) contexts.push(makeContext({ theme, quality, reducedMotion }));

const errors = [];
let ok = 0;
let pending = 0;

for (const entry of items) {
  const file = join(ROOT, 'components', entry.category, entry.id, 'index.js');
  if (!existsSync(file)) {
    if (entry.status === 'à faire') { pending += 1; continue; }
    errors.push([entry.id, [`statut « ${entry.status} » mais fichier absent : components/${entry.category}/${entry.id}/index.js`]]);
    continue;
  }
  // Un code qui contient un motif interdit n'est jamais exécuté, même pour être contrôlé.
  const problems = checkSource(await readFile(file, 'utf8'));
  let mod;
  if (!problems.length) {
    try { mod = await import(pathToFileURL(file).href); } catch (e) { problems.push(`le module ne se charge pas : ${e.message}`); }
  }
  if (mod) {
    if (typeof mod.create !== 'function') problems.push('create() manquant');
    const metaProblems = checkMeta(mod.meta, entry);
    problems.push(...metaProblems);
    if (!metaProblems.length && typeof mod.create === 'function') for (const ctx of contexts) problems.push(...checkInstance(THREE, mod, entry, ctx));
  }
  if (problems.length) errors.push([entry.id, problems]);
  else ok += 1;
}

// Un dossier de composant absent du catalogue est une erreur : le catalogue est la source unique.
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
console.log(`\n${ok} composant(s) conforme(s), ${errors.length} en erreur, ${pending} à faire (sur ${items.length}).`);
process.exit(errors.length ? 1 : 0);
