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
const nexts = catalogue.items.filter((i) => i.next);
out.push(`${catalogue.items.length} éléments : ${Object.entries(counts).map(([s, n]) => `${n} ${s}`).join(', ')}${nexts.length ? ` ; ${nexts.length} nouvelle(s) version(s) prévue(s)` : ''}.`, '');

const keyed = (o) => Object.entries(o).map(([k, v]) => `\`${k}\` (${cell(v)})`).join(' ; ');

// Le détail d'une fiche ; une nouvelle version prévue (next) se lit comme la fiche, ses champs remplaçant les anciens.
function detail(i) {
  if (i.description) out.push(i.description, '');
  if (i.kind === 'component') out.push(`- Fichier : \`components/${i.category}/${i.id}/index.js\``);
  if (i.kind === 'kit') out.push(`- Dossier : \`components/kit/${i.id}/\`, script \`blender/assets/${i.id}.py\``);
  if (i.role) out.push(`- Fabriqué par : ${i.role}`);
  if (i.production) out.push(`- Production : ${catalogue.productions?.[i.production] || i.production}${i.blender ? ` ; modèle \`${i.blender}\`` : ''}${i.kit ? ` ; kit \`${i.kit}\`` : ''}${i.famille_bible ? ` ; famille \`${i.famille_bible}\`` : ''}`);
  if (i.assets) out.push(`- Modèles : ${list(i.assets)}`);
  if (i.animations) out.push(`- Animations : ${list(i.animations)}`);
  if (i.kind === 'html') out.push(`- Élément : \`<gdc-${i.id}>\``);
  if (i.params && Object.keys(i.params).length) out.push(`- Paramètres : ${Object.entries(i.params).map(([k, v]) => `\`${k}\` (${v})`).join(' ; ')}`);
  if (i.states) out.push(`- États : ${list(i.states)}`);
  if (i.anchors) out.push(`- Ancres : ${list(i.anchors)}`);
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

for (const lot of catalogue.lots) {
  const items = catalogue.items.filter((i) => i.lot === lot.id).sort((a, b) => a.order - b.order);
  out.push(`## ${lot.id} : ${lot.name}`, '');
  if (lot.goal) out.push(lot.goal, "");
  out.push('| Ordre | Identifiant | Nom | Nature | But | Statut |', '|---|---|---|---|---|---|');
  // les nouvelles versions prévues dans ce lot, d'éléments d'un lot antérieur
  const versions = nexts.filter((i) => i.next.lot === lot.id);
  const rows = [...items.map((i) => ({ i, v: i })), ...versions.map((i) => ({ i, v: { ...i, ...i.next } }))].sort((a, b) => a.v.order - b.v.order);
  for (const { i, v } of rows) out.push(`| ${v.order} | \`${i.id}\` | ${cell(i.name)}${v === i ? '' : ` (version ${v.version})`} | ${cell(kindName(i.kind))} | ${cell(v.purpose)} | ${cell(v.status)} |`);
  out.push('');
  for (const i of items) {
    out.push(`### ${i.name} (\`${i.id}\`)`, '');
    detail(i);
    if (i.next) out.push(`Nouvelle version prévue : ${i.next.version}, au lot ${i.next.lot} (${i.next.status}).`, '');
  }
  for (const i of versions) {
    out.push(`### ${i.name} (\`${i.id}\`), version ${i.next.version}`, '');
    detail({ ...i, assets: undefined, animations: undefined, ...i.next }); // les modèles de la version livrée ne valent plus
  }
}

await writeFile(join(ROOT, 'docs', 'catalogue.md'), out.join('\n'));
console.log(`docs/catalogue.md régénéré (${catalogue.items.length} éléments).`);
