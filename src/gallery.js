// La galerie : chaque composant du catalogue, dans chacun de ses etats, avec son controle en direct,
// et la planche comparative (bible, section 14). Outil de fabrication seulement : il n'est pas livre a GDC.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import catalogue from '../catalogue.json' with { type: 'json' };
import lumiere from './lumiere.json' with { type: 'json' };
import { makeContext } from './tokens.js';
import { checkMeta, checkInstance, defaultParams, measure, sampleData } from './contract.js';
import { components as byId, chargeur } from './library.js';
import * as etalon from './etalon.js';
import * as kit from './kit.js';
import * as personnage from './personnage.js';

const charge = chargeur({ GLTFLoader, SkeletonUtils });
const entries = catalogue.items.filter((i) => i.kind === 'component');
const $ = (id) => document.getElementById(id);
const stage = $('stage');
const options = { theme: 'light', quality: 'high', reducedMotion: false, anchors: true, planche: false, silhouette: false, gris: false };
let current = { entry: null, inst: null, state: null, voisins: [] };
let dirty = true;

// La scene de reference : camera orthographique a 45 degres et 35 degres d'elevation (bible, section 8),
// lumiere directionnelle douce, ambiance moderee, rendu a la demande. Reglages : src/lumiere.json (partages avec le studio Blender).
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
stage.prepend(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 500);
camera.position.set(...lumiere.camera.position);
camera.lookAt(...lumiere.camera.cible);
const controls = new OrbitControls(camera, renderer.domElement);
controls.addEventListener('change', () => { dirty = true; });
scene.add(new THREE.HemisphereLight(lumiere.ciel.couleur, lumiere.ciel.sol, lumiere.ciel.intensite));
const sun = new THREE.DirectionalLight(lumiere.soleil.couleur, lumiere.soleil.intensite);
sun.position.set(...lumiere.soleil.position);
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.normalBias = lumiere.ombre.normalBias;
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30 });
scene.add(sun);
const grid = new THREE.GridHelper(60, 60, 0x999999, 0xcccccc);
grid.position.y = -0.31;
scene.add(grid);

function resize() {
  const { clientWidth: w, clientHeight: h } = stage;
  renderer.setSize(w, h, false);
  const view = options.planche ? 18 : 12;
  const aspect = w / Math.max(h, 1);
  Object.assign(camera, { left: -view * aspect, right: view * aspect, top: view, bottom: -view });
  camera.updateProjectionMatrix();
  dirty = true;
}
new ResizeObserver(resize).observe(stage);

const silhouette = new THREE.MeshBasicMaterial({ color: 0x000000 });

function applyTheme() {
  document.documentElement.dataset.theme = options.theme;
  const ctx = makeContext(options);
  scene.background = new THREE.Color(options.silhouette ? '#FFFFFF' : ctx.palette.paper);
  // Silhouette : tout en noir sur blanc, sans grille ni etiquettes. Niveaux de gris : les valeurs sans la couleur.
  scene.overrideMaterial = options.silhouette ? silhouette : null;
  grid.visible = !options.silhouette;
  renderer.domElement.style.filter = options.gris ? 'grayscale(1)' : '';
  grid.material.opacity = options.theme === 'dark' ? 0.25 : 0.5;
  grid.material.transparent = true;
  renderer.shadowMap.enabled = options.quality === 'high';
  sun.castShadow = options.quality === 'high';
}

function buildList() {
  const list = $('list');
  list.replaceChildren();
  // L'etalon de la scene de reference (lot G0) : hors catalogue, toujours en tete.
  const h0 = document.createElement('h2');
  h0.textContent = 'Scène de référence';
  const b0 = document.createElement('button');
  b0.textContent = 'Cube étalon et nuancier';
  b0.title = 'Le cube neutre dont on mesure les trois faces, et un cube par matériau de la palette';
  b0.dataset.id = etalon.ETALON_ID;
  b0.addEventListener('click', () => select(etalon.ETALON_ID));
  list.append(h0, b0);
  // Les kits : leur batiment de demonstration, assemble depuis le GLB du kit (critere « s'assemble sans retouche »).
  for (const { entry } of kit.demonstrations(catalogue)) {
    const b = document.createElement('button');
    b.textContent = `${entry.name} : démonstration`;
    b.title = `${entry.purpose} Bâtiment de démonstration assemblé depuis le kit.`;
    b.dataset.id = kit.PREFIXE_ID + entry.id;
    b.addEventListener('click', () => select(b.dataset.id));
    list.append(b);
  }
  // Le personnage maitre (kit character-kit) : sa planche, avec et sans casque, et ses animations comme etats.
  if (personnage.entree(catalogue)) {
    const b = document.createElement('button');
    b.textContent = 'Le personnage maître : l\u2019équipe';
    b.title = 'Chaque personne du tableau des correspondances, assemblée depuis les fichiers du kit (base, coiffure, tenue, outil)';
    b.dataset.id = personnage.PERSONNAGE_ID;
    b.addEventListener('click', () => select(personnage.PERSONNAGE_ID));
    list.append(b);
  }
  for (const lot of catalogue.lots) {
    const items = entries.filter((e) => e.lot === lot.id).sort((a, b) => a.order - b.order);
    if (!items.length) continue;
    const h = document.createElement('h2');
    h.textContent = `${lot.id} ${lot.name}`;
    list.append(h);
    for (const e of items) {
      const b = document.createElement('button');
      b.textContent = e.name;
      b.title = byId[e.id] ? e.purpose : `${e.purpose} (à faire)`;
      b.disabled = !byId[e.id];
      b.dataset.id = e.id;
      b.addEventListener('click', () => select(e.id));
      list.append(b);
    }
  }
}

async function instance(id, state) {
  if (id === etalon.ETALON_ID) {
    return { inst: etalon.create(THREE, makeContext(options)), state: 'default', entry: { id, name: 'Cube étalon' }, mod: etalon };
  }
  if (id === personnage.PERSONNAGE_ID) {
    // l'equipe : une instance du composant character par personne d'equipe.json, avec les parametres de GDC
    const e = personnage.entree(catalogue);
    const ch = byId.character;
    const insts = [];
    for (const p of personnage.PERSONNES) {
      const params = personnage.parametresDe(p);
      const m = personnage.metaPersonne(params);
      await charge.prepare(m);
      insts.push(ch.create(THREE, params, makeContext(options, await charge.assetsPour(m))));
    }
    await charge.prepare(personnage.metaDecor());
    const inst = personnage.create(THREE, insts, await charge.assetsPour(personnage.metaDecor()), makeContext(options));
    const meta = { ...ch.meta, anchors: [] };
    const premier = state && meta.states.includes(state) ? state : 'idle';
    inst.setState(premier, sampleData(entries.find((x) => x.id === 'character')));
    return { inst, state: premier, entry: { ...e, id, name: 'L\u2019équipe' }, mod: { meta }, personnage: e };
  }
  if (id.startsWith(kit.PREFIXE_ID)) {
    const d = kit.demonstrations(catalogue).find((x) => kit.PREFIXE_ID + x.entry.id === id);
    const meta = kit.metaKit(d.entry);
    await charge.prepare(meta);
    const inst = kit.create(THREE, d.entry, d.plan, await charge.assetsPour(meta), makeContext(options));
    return { inst, state: 'default', entry: { ...d.entry, id, name: `${d.entry.name} : démonstration` }, mod: { meta }, kit: d.entry };
  }
  const mod = byId[id];
  const entry = entries.find((e) => e.id === id);
  await charge.prepare(mod.meta);
  const inst = mod.create(THREE, { ...defaultParams(mod.meta), ...parametresAdresse(mod.meta) }, makeContext(options, await charge.assetsPour(mod.meta)));
  const premier = state && mod.meta.states.includes(state) ? state : mod.meta.states.find((s) => s !== 'hidden') || mod.meta.states[0];
  inst.setState(premier, sampleData(entry));
  return { inst, state: premier, entry, mod };
}

// Les parametres pris dans l'adresse (?stack=2, ?height=30) : revoir un composant ailleurs qu'a ses valeurs par defaut.
// Seuls les parametres declares dans meta sont lus ; un nombre reste un nombre.
function parametresAdresse(meta) {
  const q = new URLSearchParams(location.search);
  return Object.fromEntries(Object.entries(meta.params || {}).filter(([nom]) => q.has(nom))
    .map(([nom, p]) => [nom, p.type === 'number' ? Number(q.get(nom)) : q.get(nom)]));
}

function retire(x) { if (x && x.inst) { scene.remove(x.inst.root); x.inst.dispose(); } }

// La planche : le composant choisi entre deux modeles de reference (livres d'abord, exemples a defaut).
function references(id) {
  const rang = (e) => (e.status === 'livré' ? 0 : e.status === 'exemple' ? 1 : 9);
  return entries.filter((e) => e.id !== id && byId[e.id] && rang(e) < 9 && e.id !== 'selection-ring').sort((a, b) => rang(a) - rang(b)).slice(0, 2).map((e) => e.id);
}

// Les occupants d'un lieu : un personnage d'exemple a chaque ancre desk:n (personnage.OCCUPANTS), au travail, tourne
// vers le fond du lieu. Ils sont retires et animes avec les voisins de la planche ; ils ne comptent pas au budget du lieu.
async function occupants(x) {
  const ids = (x.mod.meta.anchors || []).includes('desk:*') ? personnage.OCCUPANTS[x.entry.id] || [] : [];
  const out = [];
  for (const [i, pid] of ids.entries()) {
    let poste;
    try { poste = x.inst.anchor(`desk:${i + 1}`); } catch { break; }
    const params = personnage.parametresDe(personnage.PERSONNES.find((p) => p.id === pid));
    const m = personnage.metaPersonne(params);
    await charge.prepare(m);
    const inst = byId.character.create(THREE, params, makeContext(options, await charge.assetsPour(m)));
    inst.setState('work', { facing: Math.PI });
    x.inst.root.updateMatrixWorld(true);
    inst.root.position.copy(x.inst.root.localToWorld(poste));
    scene.add(inst.root);
    out.push({ inst });
  }
  return out;
}

async function select(id, state) {
  retire(current);
  for (const v of current.voisins) retire(v);
  const x = await instance(id, state);
  scene.add(x.inst.root);
  const voisins = await occupants(x);
  if (options.planche && id !== etalon.ETALON_ID) {
    let pos = -1;
    for (const rid of references(id)) {
      const v = await instance(rid);
      v.inst.root.position.x = pos * 20;
      scene.add(v.inst.root);
      voisins.push(v);
      pos += 2;
    }
  }
  current = { ...x, voisins };
  for (const b of $('list').querySelectorAll('button')) b.setAttribute('aria-current', String(b.dataset.id === id));
  buildStates();
  await report();
  dirty = true;
  try { history.replaceState(null, '', `#${id}/${current.state}${options.planche ? '/planche' : ''}`); } catch { /* sans importance */ }
}

function buildStates() {
  const box = $('states');
  box.replaceChildren();
  for (const s of current.mod.meta.states) {
    const b = document.createElement('button');
    b.textContent = s;
    b.setAttribute('aria-pressed', String(s === current.state));
    b.addEventListener('click', async () => {
      current.inst.setState(s, sampleData(current.entry));
      current.state = s;
      for (const x of box.children) x.setAttribute('aria-pressed', String(x === b));
      await report();
      dirty = true;
      try { history.replaceState(null, '', `#${current.entry.id}/${s}${options.planche ? '/planche' : ''}`); } catch { /* sans importance */ }
    });
    box.append(b);
  }
}

// Le compte rendu : mesure de l'etat affiche, et controle complet du contrat dans le contexte courant.
async function report() {
  const { mod, entry } = current;
  if (mod === etalon) return; // le compte rendu de l'etalon est sa mesure, ecrite apres chaque rendu (rapportEtalon)
  if (current.kit) return rapportKit();
  if (current.personnage) return rapportPersonnage();
  const m = measure(current.inst.root);
  const problems = [...checkMeta(mod.meta, entry)];
  if (!problems.length) problems.push(...checkInstance(THREE, mod, entry, makeContext(options, await charge.assetsPour(mod.meta)), await charge.partagees(mod.meta)));
  const el = $('report');
  el.replaceChildren();
  const line = document.createElement('div');
  line.textContent = `${entry.name} · état ${current.state} · ${m.triangles} / ${mod.meta.budget.triangles} triangles · ${m.materials} / ${mod.meta.budget.materials} matériaux · `;
  const verdict = document.createElement('span');
  verdict.className = problems.length ? 'ko' : 'ok';
  verdict.textContent = problems.length ? `${problems.length} écart(s) au contrat` : 'conforme au contrat';
  line.append(verdict);
  el.append(line);
  if (problems.length) {
    const ul = document.createElement('ul');
    for (const p of problems) { const li = document.createElement('li'); li.textContent = p; ul.append(li); }
    el.append(ul);
  }
}

// Les ancres : de simples etiquettes HTML, comme celles que GDC posera.
const tmp = new THREE.Vector3();
function drawAnchors() {
  const layer = $('anchors');
  layer.replaceChildren();
  if (!options.anchors || options.silhouette || !current.inst) return;
  const { clientWidth: w, clientHeight: h } = stage;
  for (const a of current.mod.meta.anchors) {
    const name = a.replace('*', '0');
    let v;
    try { v = current.inst.anchor(name); } catch { continue; }
    tmp.copy(v);
    current.inst.root.localToWorld(tmp);
    tmp.project(camera);
    const tag = document.createElement('div');
    tag.className = 'anchor';
    tag.textContent = name;
    tag.style.left = `${((tmp.x + 1) / 2) * w}px`;
    tag.style.top = `${((1 - tmp.y) / 2) * h}px`;
    layer.append(tag);
  }
}

// La demonstration d'un kit : ce que le batiment assemble mesure, et si toutes les pieces du plan sont dans le GLB.
// Le budget de la fiche porte sur le GLB du kit (npm run check) ; la demonstration est indicative.
function rapportKit() {
  const m = measure(current.inst.root);
  const { manquantes, pieces } = current.inst;
  const el = $('report');
  el.replaceChildren(`${current.entry.name} · ${pieces} pièces posées · ${m.triangles} triangles · ${m.materials} matériaux (socle compris) · `);
  const verdict = document.createElement('span');
  verdict.className = manquantes.length ? 'ko' : 'ok';
  verdict.textContent = manquantes.length ? `pièces absentes du GLB : ${manquantes.join(', ')}` : 's\u2019assemble sans retouche';
  el.append(verdict);
}

// La planche du personnage : la mesure du personnage le plus charge (sa tenue complete), comparee au budget de la
// fiche.
function rapportPersonnage() {
  const { budget } = current.personnage;
  const m = current.inst.personnages.map(measure).reduce((a, b) => (b.triangles + b.materials * 1e6 > a.triangles + a.materials * 1e6 ? b : a));
  const el = $('report');
  el.replaceChildren(`${current.entry.name} · état ${current.state} · ${current.inst.personnages.length} personnes · le plus chargé : ${m.triangles} / ${budget.triangles} triangles · ${m.materials} / ${budget.materials} matériaux · `);
  const verdict = document.createElement('span');
  const dehors = m.triangles > budget.triangles || m.materials > budget.materials;
  verdict.className = dehors ? 'ko' : 'ok';
  verdict.textContent = dehors ? 'hors budget' : 'dans le budget';
  el.append(verdict);
}

// La mesure du cube etalon (bible, 18.1) : valeur affichee de chaque face, rapportee a la couleur de palette pour le
// dessus et au dessus pour les cotes, comparee aux cibles de src/lumiere.json. Ecrite apres chaque rendu.
function rapportEtalon(faces) {
  const { faces: cibles, tolerance } = lumiere.cibles;
  const ecarts = [];
  const morceaux = Object.entries(faces).map(([nom, f]) => {
    // le dessus se compare a la couleur de palette, les cotes au dessus
    const reference = nom === 'dessus' ? etalon.valeurPalette('MAT_CONCRETE') : faces.dessus.valeur;
    const rapport = f.valeur / Math.max(reference, 1);
    if (Math.abs(rapport - cibles[nom]) > tolerance) ecarts.push(nom);
    return `${nom} ${f.hex} (${f.valeur}) ${rapport.toFixed(2)} / cible ${cibles[nom].toFixed(2)}`;
  });
  const el = $('report');
  el.replaceChildren(`Cube étalon MAT_CONCRETE · ${morceaux.join(' · ')} · `);
  const verdict = document.createElement('span');
  verdict.className = ecarts.length ? 'ko' : 'ok';
  verdict.textContent = ecarts.length ? `hors tolérance : ${ecarts.join(', ')}` : `conforme à la recette (± ${tolerance})`;
  el.append(verdict);
}

const clock = new THREE.Clock();
function loop() {
  const dt = Math.min(clock.getDelta(), 0.1);
  for (const x of [current, ...current.voisins]) if (x.inst && x.inst.update(dt)) dirty = true;
  if (dirty) {
    renderer.render(scene, camera);
    if (current.mod === etalon && !options.silhouette) rapportEtalon(etalon.mesureFaces(THREE, renderer, camera, current.inst.root));
    drawAnchors();
    dirty = false;
  }
  requestAnimationFrame(loop);
}

function toggle(id, key, on, off, label) {
  $(id).addEventListener('click', async (ev) => {
    const btn = ev.currentTarget;
    options[key] = options[key] === on ? off : on;
    btn.setAttribute('aria-pressed', String(options[key] === on));
    if (label) btn.textContent = label(options[key]);
    applyTheme();
    resize();
    if (current.entry) await select(current.entry.id, current.state);
    dirty = true;
  });
}
toggle('theme', 'theme', 'dark', 'light');
toggle('quality', 'quality', 'high', 'low', (q) => (q === 'high' ? 'Qualité haute' : 'Qualité basse'));
toggle('motion', 'reducedMotion', true, false);
toggle('showAnchors', 'anchors', true, false);
toggle('planche', 'planche', true, false);
toggle('silhouette', 'silhouette', true, false);
toggle('gris', 'gris', true, false);

applyTheme();
buildList();
resize();
const [hashId, hashState, hashPlanche] = decodeURIComponent(location.hash.slice(1)).split('/');
if (hashPlanche === 'planche') { options.planche = true; $('planche').setAttribute('aria-pressed', 'true'); resize(); }
const start = byId[hashId] || hashId === etalon.ETALON_ID || hashId === personnage.PERSONNAGE_ID || hashId?.startsWith(kit.PREFIXE_ID) ? hashId : entries.find((e) => byId[e.id])?.id;
if (start) await select(start, hashState);
loop();
