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
    if (o.isInstancedMesh) items.add(o); // ses matrices d'instance : liberees par le composant (InstancedMesh.dispose)
    for (const m of [].concat(o.material || [])) {
      items.add(m);
      for (const v of Object.values(m)) if (v && v.isTexture) items.add(v);
    }
  });
  return [...items];
}

// Des données d'essai pour setState : une valeur plausible par clé de la fiche.
export function sampleData(entry) {
  const sample = { progress: 0.5, count: 3, facing: 0.8, activeDesks: 2, rooms: [{ id: 'L1', state: 'building', trades: ['mason'] }, { id: 'L2', state: 'done', trades: [] }],
    // building-interior 2.0.0 : l'enveloppe de l'etage ouvert
    floor: { stage: 'structure' },
    zones: [{ x: -8, z: 0, width: 14, depth: 12, surface: 'concrete' }, { x: 6, z: 0, width: 5, depth: 28, surface: 'asphalt' }],
    // building 2.0.0 : un etage sans stade prend l'etat essaye ; deux lots, l'un fini
    floors: [{ id: '001-essai', rooms: [{ id: 'L1', done: true }, { id: 'L2', done: false }] }],
    // character 1.2.0 : la lampe frontale allumee, pour compter son materiau dans chaque etat
    headlamp: true };
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
  // une ressource que le composant libere en cours de route (a la reconstruction d'un etat) compte comme liberee : on
  // l'ecoute des qu'elle apparait (building 2.1.0 refait ses geometries fusionnees a chaque etat). Deux gardes, pour que
  // cela n'ouvre pas de fuite : une ressource revue dans l'arbre apres sa liberation est encore en usage (Three.js la
  // recharge sur la carte graphique) ; et un second passage dans les etats ne doit rien garder de plus que le premier.
  const disposed = new Set();
  const reutilisees = new Set();
  const vue = (d) => {
    if (!seen.has(d)) { seen.add(d); d.addEventListener('dispose', () => disposed.add(d)); }
    else if (disposed.has(d)) { disposed.delete(d); reutilisees.add(d); }
  };
  const vivantes = () => [...seen].filter((d) => !disposed.has(d) && !partagees.has(d)).length;
  for (const state of mod.meta.states) {
    try { inst.setState(state); } catch (e) { problems.push(`${label} setState(« ${state} ») sans données a échoué : ${e.message}`); continue; }
    try { inst.setState(state, sampleData(entry)); } catch (e) { problems.push(`${label} setState(« ${state} ») a échoué : ${e.message}`); continue; }
    const r = inst.update(0.016);
    // un composant rend true ou false ; seule la carte (l'assemblage) rend "ambiance" (docs/contrat-composant.md)
    if (typeof r !== 'boolean') problems.push(`${label} update() doit renvoyer true ou false (état ${state})`);
    if (ctx.reducedMotion && r === true) problems.push(`${label} update() demande une animation alors que reducedMotion est actif (état ${state})`);
    const m = measure(inst.root);
    if (m.triangles > mod.meta.budget.triangles) problems.push(`${label} ${m.triangles} triangles dans l'état ${state}, budget ${mod.meta.budget.triangles}`);
    if (m.materials > mod.meta.budget.materials) problems.push(`${label} ${m.materials} matériaux dans l'état ${state}, budget ${mod.meta.budget.materials}`);
    for (const d of collectDisposables(inst.root)) vue(d);
  }
  const apresPremierPassage = vivantes();
  for (const state of mod.meta.states) {
    try { inst.setState(state); inst.setState(state, sampleData(entry)); inst.update(0.016); } catch { continue; } // deja signale
    for (const d of collectDisposables(inst.root)) vue(d);
  }
  if (vivantes() > apresPremierPassage) problems.push(`${label} garde ${vivantes() - apresPremierPassage} ressource(s) de plus à chaque passage dans les états : ce qu'une reconstruction remplace n'est pas libéré`);
  if (reutilisees.size) problems.push(`${label} ${reutilisees.size} ressource(s) libérée(s) puis encore affichée(s) : Three.js les recharge, et plus rien ne les libère`);
  try { inst.setState('__inconnu__', {}); problems.push(`${label} setState accepte un état absent du catalogue`); } catch { /* attendu */ }
  for (const a of mod.meta.anchors) {
    // les ancres numerotees comptent depuis 1 (desk:1, le premier poste) ; a cote d'etages (floor:*), une piece est
    // numerotee dans son etage (room:1-1, la premiere piece du rez)
    const name = a === 'room:*' && mod.meta.anchors.includes('floor:*') ? 'room:1-1' : a.replace('*', '1');
    try { const v = inst.anchor(name); if (!v || !v.isVector3) problems.push(`${label} anchor(« ${name} ») ne renvoie pas un point`); } catch (e) { problems.push(`${label} anchor(« ${name} ») a échoué : ${e.message}`); }
  }
  inst.dispose();
  const left = [...seen].filter((d) => !disposed.has(d) && !partagees.has(d));
  if (left.length) problems.push(`${label} dispose() laisse ${left.length} géométrie(s), matériau(x), texture(s) ou instance(s)`);
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
  // le survol partagé : ctx.hoverLink émet gdc-hover pour l'élément (src/survol.js)
  const survol = /\bhoverLink\s*\(/.test(source);
  if (survol) poses.push('gdc-hover');
  for (const e of sorties) if (![`'${e}'`, `"${e}"`, `\`${e}\``].some((q) => source.includes(q)) && !poses.includes(e)) problems.push(`l'événement « ${e} » n'est jamais émis`);
  if (survol && !sorties.includes('gdc-hover')) problems.push('ctx.hoverLink émet gdc-hover, absent de la fiche');
  // highlight est une propriété à part, posée par GDC à chaque survol, pas une clé de data
  if (entrees.includes('highlight') && !/\bset\s+highlight\s*\(/.test(source)) problems.push('highlight doit être une propriété à part (set highlight), pas une clé de data');
  // un element n'emet que les evenements de sa fiche
  for (const [, e] of source.matchAll(/CustomEvent\(\s*['"]([\w-]+)['"]/g)) if (!sorties.includes(e)) problems.push(`événement « ${e} » absent de la fiche`);
  return problems;
}

// Le survol partagé (lot G8, hover-link) : tout élément qui émet gdc-hover lit aussi highlight, la même référence
// renvoyée par GDC à tous les éléments. Vérifié sur la fiche (et sur sa prochaine version, next) ; le code de
// l'élément, lui, doit lire chaque entrée de sa fiche (checkHtml).
export function checkHoverFiche(entry) {
  const problems = [];
  for (const [quoi, f] of [['', entry], [' (next)', entry.next]]) {
    if (!f || !Object.hasOwn(f.outputs || {}, 'gdc-hover')) continue;
    if (!Object.hasOwn(f.inputs || {}, 'highlight')) problems.push(`la fiche${quoi} émet gdc-hover sans lire highlight (le survol partagé)`);
  }
  return problems;
}

// La règle du survol partagé, sur des exemples : correspond(a, b) et sameRef(a, b) de src/survol.js.
export function checkCorrespond({ correspond, sameRef }) {
  const app = { application: 'terrain' };
  const fiche = { application: 'terrain', fiche: '002-saisir-un-constat-hors-ligne' };
  const lot = { ...fiche, lot: 'L1' };
  const voisine = { application: 'terrain', fiche: '005-autre' };
  const ailleurs = { application: 'admin', fiche: '002-saisir-un-constat-hors-ligne', lot: 'L1' };
  const cas = [
    ['un lot allume sa fiche', correspond(lot, fiche), true],
    ['un lot allume son application', correspond(lot, app), true],
    ['une application allume ses lots', correspond(app, lot), true],
    ['une fiche allume ses lots', correspond(fiche, lot), true],
    ['une référence se correspond', correspond(fiche, { ...fiche }), true],
    ['deux fiches voisines ne se correspondent pas', correspond(fiche, voisine), false],
    ['le même lot ailleurs ne correspond pas', correspond(lot, ailleurs), false],
    ['null ne correspond à rien', correspond(null, app), false],
    ['un lot sans fiche vaut son application', correspond({ application: 'terrain', lot: 'L1' }, voisine), true],
    ['une fiche nulle (l\'existant) vaut son application', correspond({ application: 'admin', fiche: null }, ailleurs), true],
    ['sameRef : même chemin', sameRef(lot, { ...lot }), true],
    ['sameRef : un parent n\'est pas la même référence', sameRef(lot, fiche), false],
    ['sameRef : deux null', sameRef(null, null), true],
  ];
  return cas.filter(([, vu, attendu]) => vu !== attendu).map(([quoi, vu]) => `correspond : « ${quoi} » donne ${vu}`);
}

// Les illustrations (lot G7) : des SVG autonomes, insérés tels quels dans la page de GDC. Rien d'extérieur, aucun script.
// La fiche du catalogue donne leurs règles dans « svg » : viewBox, monochrome (currentColor seul), strokeWidth, maxBytes ;
// et, pour un portrait, ses états (classes CSS posées sur le <svg>, le premier étant celui de repos).
const SVG_FORBIDDEN = [
  [/<script\b/i, 'script'],
  [/\son[a-z]+\s*=/i, "gestionnaire d'événement (on…)"],
  [/<foreignObject\b/i, 'foreignObject'],
  [/\bhref\s*=\s*["'](?!#|data:image\/(png|webp|jpeg);base64,)/i, 'lien vers une ressource extérieure'],
  [/url\(\s*['"]?(?!#)/i, 'ressource chargée par url()'],
  [/@import\b/i, '@import'],
];

export function checkSvg(source, entry) {
  const problems = SVG_FORBIDDEN.filter(([motif]) => motif.test(source)).map(([, quoi]) => `interdit : ${quoi}`);
  const regle = entry.svg || {};
  const racine = source.match(/<svg\b[^>]*>/);
  if (!racine) return problems.concat('pas de balise <svg>');
  if (!racine[0].includes('xmlns="http://www.w3.org/2000/svg"')) problems.push('xmlns absent');
  const vb = racine[0].match(/viewBox="([^"]+)"/);
  if (!vb) problems.push('viewBox absent');
  else if (regle.viewBox && vb[1] !== regle.viewBox) problems.push(`viewBox « ${vb[1]} » au lieu de « ${regle.viewBox} »`);
  if (/\s(width|height)="/.test(racine[0])) problems.push('largeur ou hauteur fixée : la taille se choisit dans la page');
  if (regle.maxBytes && Buffer.byteLength(source) > regle.maxBytes) problems.push(`${Buffer.byteLength(source)} octets, plafond ${regle.maxBytes}`);
  if (regle.monochrome) {
    // une seule couleur, celle du texte : aucune couleur écrite, fill et stroke à currentColor ou none
    if (/#[0-9a-f]{3,8}\b|\b(rgb|hsl)a?\(/i.test(source)) problems.push('couleur écrite : une icône hérite de la couleur du texte (currentColor)');
    for (const [, prop, v] of source.matchAll(/\b(fill|stroke)\s*[=:]\s*["']?([\w#()-]+)/g)) {
      if (!['none', 'currentColor'].includes(v)) problems.push(`${prop} « ${v} » : seulement currentColor ou none`);
    }
    // une icône est décorative : son libellé est écrit à côté (un portrait, lui, a role="img" et un titre)
    if (!/aria-hidden="true"/.test(racine[0])) problems.push('aria-hidden="true" absent : une icône accompagne un libellé');
  }
  if (regle.strokeWidth !== undefined) {
    const epaisseurs = new Set([...source.matchAll(/stroke-width\s*[=:]\s*["']?([\d.]+)/g)].map((m) => Number(m[1])));
    if (![...epaisseurs].every((e) => e === regle.strokeWidth)) problems.push(`épaisseurs ${[...epaisseurs].join(', ')} : une seule, ${regle.strokeWidth}`);
    if (!epaisseurs.size) problems.push(`stroke-width absent (attendu ${regle.strokeWidth})`);
  }
  if (entry.states && entry.states.length) {
    if (!/role="img"/.test(racine[0]) || !/<title>[^<]+<\/title>/.test(source)) problems.push('role="img" et <title> attendus : le nom de la personne');
    const classes = (racine[0].match(/class="([^"]*)"/) || [, ''])[1].split(/\s+/);
    if (!classes.includes(entry.states[0])) problems.push(`classe de repos « ${entry.states[0]} » absente du <svg>`);
    for (const s of entry.states.slice(1)) if (!new RegExp(`\\.${s}\\b`).test(source)) problems.push(`état « ${s} » sans règle CSS (.${s})`);
    if (!source.includes('prefers-reduced-motion') || !source.includes('data-motion="reduced"')) problems.push('moins d\'animations non respecté (prefers-reduced-motion et data-motion="reduced")');
  }
  return problems;
}
