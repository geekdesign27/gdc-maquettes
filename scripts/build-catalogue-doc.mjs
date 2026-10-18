// Génère docs/catalogue.md, la version lisible de catalogue.json.
// Ne pas modifier docs/catalogue.md à la main : il est réécrit à chaque « npm run catalogue ».
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalogue = JSON.parse(await readFile(join(ROOT, 'catalogue.json'), 'utf8'));

const cell = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const list = (a) => (a && a.length ? a.map((x) => `\`${x}\``).join(', ') : 'aucune');
const kindName = (k) => (catalogue.kinds && catalogue.kinds[k]) || k;

const out = ['# Le catalogue', '', 'Fichier généré par `npm run catalogue` depuis `catalogue.json`. Ne pas le modifier à la main.', ''];
const counts = {};
for (const i of catalogue.items) counts[i.status] = (counts[i.status] || 0) + 1;
out.push(`${catalogue.items.length} éléments : ${Object.entries(counts).map(([s, n]) => `${n} ${s}`).join(', ')}.`, '');

for (const lot of catalogue.lots) {
  const items = catalogue.items.filter((i) => i.lot === lot.id).sort((a, b) => a.order - b.order);
  out.push(`## ${lot.id} : ${lot.name}`, '');
  if (lot.goal) out.push(lot.goal, "");
  out.push('| Ordre | Identifiant | Nom | Nature | But | Statut |', '|---|---|---|---|---|---|');
  for (const i of items) out.push(`| ${i.order} | \`${i.id}\` | ${cell(i.name)} | ${cell(kindName(i.kind))} | ${cell(i.purpose)} | ${cell(i.status)} |`);
  out.push('');
  for (const i of items) {
    out.push(`### ${i.name} (\`${i.id}\`)`, '');
    if (i.description) out.push(i.description, '');
    if (i.kind === 'component') out.push(`- Fichier : \`components/${i.category}/${i.id}/index.js\``);
    if (i.kind === 'html') out.push(`- Élément : \`<gdc-${i.id}>\``);
    if (i.params && Object.keys(i.params).length) out.push(`- Paramètres : ${Object.entries(i.params).map(([k, v]) => `\`${k}\` (${v})`).join(' ; ')}`);
    if (i.states) out.push(`- États : ${list(i.states)}`);
    if (i.anchors) out.push(`- Ancres : ${list(i.anchors)}`);
    const keyed = (o) => Object.entries(o).map(([k, v]) => `\`${k}\` (${cell(v)})`).join(' ; ');
    if (i.data) out.push(`- Données reçues par setState : ${Object.keys(i.data).length ? keyed(i.data) : 'aucune'}`);
    if (i.inputs) out.push(`- Entrées (propriété data) : ${keyed(i.inputs)}`);
    if (i.outputs) out.push(`- Sorties (événements) : ${Object.keys(i.outputs).length ? keyed(i.outputs) : 'aucune'}`);
    if (i.budget) out.push(`- Budget : ${i.budget.triangles} triangles, ${i.budget.materials} matériaux`);
    if (i.acceptance && i.acceptance.length) {
      out.push('- Critères d\'acceptation :');
      for (const a of i.acceptance) out.push(`  - ${a}`);
    }
    out.push('');
  }
}

await writeFile(join(ROOT, 'docs', 'catalogue.md'), out.join('\n'));
console.log(`docs/catalogue.md régénéré (${catalogue.items.length} éléments).`);
