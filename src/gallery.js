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

const charge = chargeur({ GLTFLoader, SkeletonUtils });
const entries = catalogue.items.filter((i) => i.kind === 'component');
const $ = (id) => document.getElementById(id);
const stage = $('stage');
const options = { theme: 'light', quality: 'high', reducedMotion: false, anchors: true, planche: false };
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

function applyTheme() {
  document.documentElement.dataset.theme = options.theme;
  const ctx = makeContext(options);
  scene.background = new THREE.Color(ctx.palette.paper);
  grid.material.opacity = options.theme === 'dark' ? 0.25 : 0.5;
  grid.material.transparent = true;
  renderer.shadowMap.enabled = options.quality === 'high';
  sun.castShadow = options.quality === 'high';
}

function buildList() {
  const list = $('list');
  list.replaceChildren();
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
  const mod = byId[id];
  const entry = entries.find((e) => e.id === id);
  await charge.prepare(mod.meta);
  const inst = mod.create(THREE, defaultParams(mod.meta), makeContext(options, await charge.assetsPour(mod.meta)));
  const premier = state && mod.meta.states.includes(state) ? state : mod.meta.states.find((s) => s !== 'hidden') || mod.meta.states[0];
  inst.setState(premier, sampleData(entry));
  return { inst, state: premier, entry, mod };
}

function retire(x) { if (x && x.inst) { scene.remove(x.inst.root); x.inst.dispose(); } }

// La planche : le composant choisi entre deux modeles de reference (livres d'abord, exemples a defaut).
function references(id) {
  const rang = (e) => (e.status === 'livré' ? 0 : e.status === 'exemple' ? 1 : 9);
  return entries.filter((e) => e.id !== id && byId[e.id] && rang(e) < 9 && e.id !== 'selection-ring').sort((a, b) => rang(a) - rang(b)).slice(0, 2).map((e) => e.id);
}

async function select(id, state) {
  retire(current);
  for (const v of current.voisins) retire(v);
  const x = await instance(id, state);
  scene.add(x.inst.root);
  const voisins = [];
  if (options.planche) {
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
      try { history.replaceState(null, '', `#${current.mod.meta.id}/${s}${options.planche ? '/planche' : ''}`); } catch { /* sans importance */ }
    });
    box.append(b);
  }
}

// Le compte rendu : mesure de l'etat affiche, et controle complet du contrat dans le contexte courant.
async function report() {
  const { mod, entry } = current;
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
  if (!options.anchors || !current.inst) return;
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

const clock = new THREE.Clock();
function loop() {
  const dt = Math.min(clock.getDelta(), 0.1);
  for (const x of [current, ...current.voisins]) if (x.inst && x.inst.update(dt)) dirty = true;
  if (dirty) {
    renderer.render(scene, camera);
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

applyTheme();
buildList();
resize();
const [hashId, hashState, hashPlanche] = decodeURIComponent(location.hash.slice(1)).split('/');
if (hashPlanche === 'planche') { options.planche = true; $('planche').setAttribute('aria-pressed', 'true'); resize(); }
const start = byId[hashId] ? hashId : entries.find((e) => byId[e.id])?.id;
if (start) await select(start, hashState);
loop();
