// La galerie : chaque composant du catalogue, dans chacun de ses états, avec son contrôle en direct.
// Outil de fabrication seulement : il n'est pas livré à GDC.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import catalogue from '../catalogue.json';
import { makeContext } from './tokens.js';
import { checkMeta, checkInstance, defaultParams, measure, sampleData } from './contract.js';

const modules = import.meta.glob('../components/*/*/index.js', { eager: true });
const byId = Object.fromEntries(Object.values(modules).map((m) => [m.meta.id, m]));
const entries = catalogue.items.filter((i) => i.kind === 'component');

const $ = (id) => document.getElementById(id);
const stage = $('stage');
const options = { theme: 'light', quality: 'high', reducedMotion: false, anchors: true };
let current = { entry: null, inst: null, state: null };
let dirty = true;

// La scène : vue isométrique (caméra orthographique), lumière simple, rendu à la demande.
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
stage.prepend(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 500);
camera.position.set(20, 20, 20);
camera.lookAt(0, 0, 0);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = false;
controls.addEventListener('change', () => { dirty = true; });
scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8678, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.4);
sun.position.set(8, 14, 6);
scene.add(sun);
const grid = new THREE.GridHelper(40, 40, 0x999999, 0xcccccc);
grid.position.y = -0.31;
scene.add(grid);

function resize() {
  const { clientWidth: w, clientHeight: h } = stage;
  renderer.setSize(w, h, false);
  const view = 12;
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
}

// La liste, groupée par lot ; les composants pas encore fabriqués sont grisés.
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

function select(id, state) {
  const entry = entries.find((e) => e.id === id);
  const mod = byId[id];
  if (current.inst) { scene.remove(current.inst.root); current.inst.dispose(); }
  const ctx = makeContext(options);
  const inst = mod.create(THREE, defaultParams(mod.meta), ctx);
  const first = state && mod.meta.states.includes(state) ? state : mod.meta.states.find((s) => s !== 'hidden') || mod.meta.states[0];
  inst.setState(first, sampleData(entry));
  scene.add(inst.root);
  current = { entry, inst, state: first };
  for (const b of $('list').querySelectorAll('button')) b.setAttribute('aria-current', String(b.dataset.id === id));
  buildStates(mod);
  report(mod, entry);
  dirty = true;
  try { history.replaceState(null, '', `#${id}/${first}`); } catch { /* sans importance */ }
}

function buildStates(mod) {
  const box = $('states');
  box.replaceChildren();
  for (const s of mod.meta.states) {
    const b = document.createElement('button');
    b.textContent = s;
    b.setAttribute('aria-pressed', String(s === current.state));
    b.addEventListener('click', () => {
      current.inst.setState(s, sampleData(current.entry));
      current.state = s;
      for (const x of box.children) x.setAttribute('aria-pressed', String(x === b));
      report(mod, current.entry);
      dirty = true;
      try { history.replaceState(null, '', `#${mod.meta.id}/${s}`); } catch { /* sans importance */ }
    });
    box.append(b);
  }
}

// Le compte rendu : mesure de l'état affiché, et contrôle complet du contrat dans le contexte courant.
function report(mod, entry) {
  const m = measure(current.inst.root);
  const problems = [...checkMeta(mod.meta, entry)];
  if (!problems.length) problems.push(...checkInstance(THREE, mod, entry, makeContext(options)));
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

// Les ancres : de simples étiquettes HTML, comme celles que GDC posera.
const tmp = new THREE.Vector3();
function drawAnchors() {
  const layer = $('anchors');
  layer.replaceChildren();
  if (!options.anchors || !current.inst) return;
  const { clientWidth: w, clientHeight: h } = stage;
  for (const a of current.inst ? byId[current.entry.id].meta.anchors : []) {
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
  if (current.inst && current.inst.update(dt)) dirty = true;
  if (dirty) {
    renderer.render(scene, camera);
    drawAnchors();
    dirty = false;
  }
  requestAnimationFrame(loop);
}

function toggle(id, key, on, off, label) {
  $(id).addEventListener('click', (ev) => {
    options[key] = options[key] === on ? off : on;
    ev.currentTarget.setAttribute('aria-pressed', String(options[key] === on));
    if (label) ev.currentTarget.textContent = label(options[key]);
    applyTheme();
    if (current.entry) select(current.entry.id, current.state);
    dirty = true;
  });
}
toggle('theme', 'theme', 'dark', 'light');
toggle('quality', 'quality', 'high', 'low', (q) => (q === 'high' ? 'Qualité haute' : 'Qualité basse'));
toggle('motion', 'reducedMotion', true, false);
toggle('showAnchors', 'anchors', true, false);

applyTheme();
buildList();
resize();
const [hashId, hashState] = decodeURIComponent(location.hash.slice(1)).split('/');
const start = byId[hashId] ? hashId : entries.find((e) => byId[e.id])?.id;
if (start) select(start, hashState);
loop();
