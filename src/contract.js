// Le contrat en code : ce que vérifient le contrôle (npm run check) et la galerie.
// Chaque fonction renvoie une liste de problèmes, en français ; une liste vide veut dire conforme.

const META_KEYS = ['id', 'version', 'category', 'states', 'params', 'anchors', 'budget', 'animated'];
// Clé facultative : assets, la liste des modèles 3D (GLB) du composant, identique à celle du catalogue.

// Ce qu'un composant ne doit jamais contenir : accès extérieur, HTML injecté, code évalué, import hors de son dossier.
const FORBIDDEN = [
  [/\bfetch\s*\(/, 'appel réseau (fetch)'],
  [/XMLHttpRequest|WebSocket|EventSource/, 'accès réseau'],
  [/localStorage|sessionStorage|indexedDB|document\.cookie/, 'stockage du navigateur'],
  [/\.innerHTML|\.outerHTML|insertAdjacentHTML/, 'HTML injecté'],
  [/\beval\s*\(|new\s+Function\s*\(/, 'code évalué'],
  [/\bimport\s[^;]*?from\s+['"](?!\.\/)/, 'import hors du dossier du composant'],
  [/\bimport\s*\(/, 'import dynamique'],
  [/url\(\s*['"]?(https?:)?\/\/|@import\b/, 'ressource chargée depuis Internet'],
];

export function checkSource(source) {
  return FORBIDDEN.filter(([motif]) => motif.test(source)).map(([, quoi]) => `interdit : ${quoi}`);
}

export function checkMeta(meta, entry) {
  const problems = [];
  if (!meta || typeof meta !== 'object') return ['meta absent'];
  for (const key of META_KEYS) if (!(key in meta)) problems.push(`meta.${key} manquant`);
  if (meta.id !== entry.id) problems.push(`meta.id « ${meta.id} » différent du catalogue « ${entry.id} »`);
  if (meta.category !== entry.category) problems.push(`meta.category « ${meta.category} » différent du catalogue « ${entry.category} »`);
  if (!/^\d+\.\d+\.\d+$/.test(meta.version || '')) problems.push('meta.version doit être de la forme 1.0.0');
  const same = (a = [], b = []) => a.length === b.length && a.every((x) => b.includes(x));
  if (!same(meta.states, entry.states)) problems.push(`états différents du catalogue : ${JSON.stringify(meta.states)} au lieu de ${JSON.stringify(entry.states)}`);
  if (!same(meta.anchors, entry.anchors)) problems.push(`ancres différentes du catalogue : ${JSON.stringify(meta.anchors)} au lieu de ${JSON.stringify(entry.anchors)}`);
  if (entry.budget && JSON.stringify(meta.budget) !== JSON.stringify(entry.budget)) problems.push('budget différent du catalogue');
  for (const [name, p] of Object.entries(meta.params || {})) if (!('default' in p)) problems.push(`paramètre ${name} sans valeur par défaut`);
  if (!same(meta.assets || [], entry.assets || [])) problems.push(`modèles différents du catalogue : ${JSON.stringify(meta.assets || [])} au lieu de ${JSON.stringify(entry.assets || [])}`);
  return problems;
}

export function defaultParams(meta) {
  return Object.fromEntries(Object.entries(meta.params || {}).map(([name, p]) => [name, p.default]));
}

// Triangles et matériaux réellement présents sous root.
export function measure(root) {
  let triangles = 0;
  const materials = new Set();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry;
    const count = g.index ? g.index.count : g.attributes.position ? g.attributes.position.count : 0;
    triangles += (count / 3) * (o.isInstancedMesh ? o.count : 1);
    for (const m of [].concat(o.material)) materials.add(m);
  });
  root.traverse((o) => { if (o.isLine || o.isPoints || o.isSprite) for (const m of [].concat(o.material)) materials.add(m); });
  return { triangles: Math.round(triangles), materials: materials.size };
}

function collectDisposables(root) {
  const items = new Set();
  root.traverse((o) => {
    if (o.geometry) items.add(o.geometry);
    for (const m of [].concat(o.material || [])) {
      items.add(m);
      for (const v of Object.values(m)) if (v && v.isTexture) items.add(v);
    }
  });
  return [...items];
}

// Des données d'essai pour setState : une valeur plausible par clé de la fiche.
export function sampleData(entry) {
  const sample = { progress: 0.5, count: 3, facing: 0.8, activeDesks: 2, rooms: [{ state: 'construction', trades: ['mason'] }, { state: 'done', trades: [] }] };
  return Object.fromEntries(Object.keys(entry.data || {}).map((k) => [k, k in sample ? sample[k] : 1]));
}

// Crée une instance, la passe dans chaque état et vérifie le reste du contrat.
// partagees : géométries et matériaux des modèles 3D, partagés entre instances : le composant ne doit pas les libérer.
export function checkInstance(THREE, mod, entry, ctx, partagees = new Set()) {
  const problems = [];
  const label = `[${ctx.quality}${ctx.reducedMotion ? ', sans animation' : ''}, ${ctx.theme}]`;
  let inst;
  try { inst = mod.create(THREE, defaultParams(mod.meta), ctx); } catch (e) { return [`${label} create a échoué : ${e.message}`]; }
  for (const fn of ['setState', 'update', 'anchor', 'dispose']) if (typeof inst[fn] !== 'function') problems.push(`${label} ${fn}() manquant`);
  if (!inst.root || !inst.root.isObject3D) return problems.concat(`${label} root n'est pas un objet Three.js`);
  if (inst.root.userData.component !== mod.meta.id) problems.push(`${label} root.userData.component doit valoir « ${mod.meta.id} »`);
  if (problems.length) return problems;
  const seen = new Set();
  for (const state of mod.meta.states) {
    try { inst.setState(state); } catch (e) { problems.push(`${label} setState(« ${state} ») sans données a échoué : ${e.message}`); continue; }
    try { inst.setState(state, sampleData(entry)); } catch (e) { problems.push(`${label} setState(« ${state} ») a échoué : ${e.message}`); continue; }
    const r = inst.update(0.016);
    if (typeof r !== 'boolean') problems.push(`${label} update() doit renvoyer true ou false (état ${state})`);
    if (ctx.reducedMotion && r === true) problems.push(`${label} update() demande une animation alors que reducedMotion est actif (état ${state})`);
    const m = measure(inst.root);
    if (m.triangles > mod.meta.budget.triangles) problems.push(`${label} ${m.triangles} triangles dans l'état ${state}, budget ${mod.meta.budget.triangles}`);
    if (m.materials > mod.meta.budget.materials) problems.push(`${label} ${m.materials} matériaux dans l'état ${state}, budget ${mod.meta.budget.materials}`);
    for (const d of collectDisposables(inst.root)) seen.add(d);
  }
  try { inst.setState('__inconnu__', {}); problems.push(`${label} setState accepte un état absent du catalogue`); } catch { /* attendu */ }
  for (const a of mod.meta.anchors) {
    const name = a.replace('*', '1'); // les ancres numerotees comptent depuis 1 (desk:1, le premier poste)
    try { const v = inst.anchor(name); if (!v || !v.isVector3) problems.push(`${label} anchor(« ${name} ») ne renvoie pas un point`); } catch (e) { problems.push(`${label} anchor(« ${name} ») a échoué : ${e.message}`); }
  }
  const disposed = new Set();
  for (const d of seen) d.addEventListener('dispose', () => disposed.add(d));
  inst.dispose();
  const left = [...seen].filter((d) => !disposed.has(d) && !partagees.has(d));
  if (left.length) problems.push(`${label} dispose() laisse ${left.length} géométrie(s), matériau(x) ou texture(s)`);
  const abimees = [...seen].filter((d) => disposed.has(d) && partagees.has(d));
  if (abimees.length) problems.push(`${label} dispose() libère ${abimees.length} ressource(s) partagée(s) d'un modèle 3D : les autres instances la perdraient`);
  return problems;
}

// Les elements d'interface (lot G6) : meta conforme a la fiche, define() present, entrees et evenements de la fiche.
// Controle statique : le rendu et le clavier se verifient sur la page de demonstration (interface.html).
const HTML_META_KEYS = ['id', 'version', 'category', 'tag', 'inputs', 'outputs'];

// composes : pour chaque balise d'element d'interface (gdc-<id>), les evenements de sa fiche. Un element qui pose
// une de ces balises emet aussi ses evenements : ils traversent son shadow DOM (composition par balise).
export function checkHtml(mod, entry, source, composes = {}) {
  const problems = [];
  const meta = mod && mod.meta;
  if (!meta || typeof meta !== 'object') return ['meta absent'];
  for (const key of HTML_META_KEYS) if (!(key in meta)) problems.push(`meta.${key} manquant`);
  if (meta.id !== entry.id) problems.push(`meta.id « ${meta.id} » différent du catalogue « ${entry.id} »`);
  if (meta.category !== entry.category) problems.push(`meta.category « ${meta.category} » différent du catalogue « ${entry.category} »`);
  if (!/^\d+\.\d+\.\d+$/.test(meta.version || '')) problems.push('meta.version doit être de la forme 1.0.0');
  if (meta.tag !== `gdc-${entry.id}`) problems.push(`meta.tag doit valoir « gdc-${entry.id} »`);
  if (typeof mod.define !== 'function') problems.push('define(registry, ctx) manquant');
  const same = (a = [], b = []) => a.length === b.length && a.every((x) => b.includes(x));
  const entrees = Object.keys(entry.inputs || {});
  const sorties = Object.keys(entry.outputs || {});
  if (!same(meta.inputs, entrees)) problems.push(`entrées différentes du catalogue : ${JSON.stringify(meta.inputs)} au lieu de ${JSON.stringify(entrees)}`);
  if (!same(meta.outputs, sorties)) problems.push(`événements différents du catalogue : ${JSON.stringify(meta.outputs)} au lieu de ${JSON.stringify(sorties)}`);
  // le code hors de meta : meta cite deja chaque entree et chaque evenement, il ne prouve rien
  source = source.replace(/export\s+const\s+meta\s*=\s*\{[\s\S]*?\n\};?/, '');
  for (const k of entrees) if (!new RegExp(`\\b${k}\\b`).test(source)) problems.push(`l'entrée « ${k} » n'est pas lue dans le code`);
  const poses = Object.entries(composes).filter(([tag]) => tag !== meta.tag && source.includes(tag)).flatMap(([, evts]) => evts);
  for (const e of sorties) if (![`'${e}'`, `"${e}"`, `\`${e}\``].some((q) => source.includes(q)) && !poses.includes(e)) problems.push(`l'événement « ${e} » n'est jamais émis`);
  // un element n'emet que les evenements de sa fiche
  for (const [, e] of source.matchAll(/CustomEvent\(\s*['"]([\w-]+)['"]/g)) if (!sorties.includes(e)) problems.push(`événement « ${e} » absent de la fiche`);
  return problems;
}
