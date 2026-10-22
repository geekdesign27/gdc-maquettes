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
import { components as byId, chargeur, illustrations } from './library.js';
import * as etalon from './etalon.js';
import * as kit from './kit.js';
import * as personnage from './personnage.js';
import * as reference from './scene-reference.js';
import { creeCarte } from './ville/carte.js';
import { MOMENTS, recetteDe, regleLumieres, creeVitres, eclaireBatiment, forceDe, ECLAIRABLES } from './ville/heure.js';
import { defineElements } from './interface.js';
import { arbreDe } from './arbre.js';
// La ville vivante (fiche city-map) : les sequences de GDC (fixtures/), jouees etape par etape dans la galerie
const VILLE_ID = 'ville';
const SEQUENCES = Object.fromEntries(Object.entries(import.meta.glob('../fixtures/*/index.json', { eager: true, import: 'default' })).map(([p, index]) => [p.split('/')[2], index]));
const SCENES_GDC = import.meta.glob('../fixtures/*/[0-9]*.json', { eager: true, import: 'default' });

const charge = chargeur({ GLTFLoader, SkeletonUtils });
defineElements(); // le fil des declencheurs et l'arbre, de part et d'autre de la carte vivante
const entries = catalogue.items.filter((i) => i.kind === 'component');
const $ = (id) => document.getElementById(id);
const stage = $('stage');
// heure : jour, aube ou nuit, pour les revues (fiche day-night) ; ?heure=nuit dans l'adresse pour une capture
const heureDemandee = new URLSearchParams(location.search).get('heure');
const options = { theme: 'light', quality: 'high', reducedMotion: false, anchors: true, planche: false, silhouette: false, gris: false, heure: Object.hasOwn(MOMENTS, heureDemandee ?? '') ? heureDemandee : 'jour' };
let current = { entry: null, inst: null, state: null, voisins: [] };
let dirty = true;

// La scene de reference : camera orthographique a 45 degres et 35 degres d'elevation (bible, section 8),
// lumiere directionnelle douce, ambiance moderee, rendu a la demande. Reglages : src/lumiere.json (partages avec le studio Blender).
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
stage.prepend(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 500);
// reculee quatre fois dans son axe : la vue orthographique ne change pas, mais une grande scene (la scene de reference)
// n'est plus rognee par le plan proche
camera.position.set(...lumiere.camera.position).multiplyScalar(4);
camera.lookAt(...lumiere.camera.cible);
const controls = new OrbitControls(camera, renderer.domElement);
controls.addEventListener('change', () => { dirty = true; });
const ciel = new THREE.HemisphereLight(lumiere.ciel.couleur, lumiere.ciel.sol, lumiere.ciel.intensite);
scene.add(ciel);
const sun = new THREE.DirectionalLight(lumiere.soleil.couleur, lumiere.soleil.intensite);
sun.position.set(...lumiere.soleil.position);
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.normalBias = lumiere.ombre.normalBias;
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30 });
scene.add(sun);
const grid = new THREE.GridHelper(60, 60, 0x999999, 0xcccccc);
grid.position.y = -0.61; // sous les socles de 0,60 m (bible 18.5) : elle ne traverse plus la fouille du batiment
scene.add(grid);

function resize() {
  const { clientWidth: w, clientHeight: h } = stage;
  renderer.setSize(w, h, false);
  // la scene de reference (60 x 50 m, 14 m de plus par application) se cadre en entier sur un portable de 13 pouces ;
  // on zoome a la molette
  const view = current.scene ? 26 + 5 * (current.apps - 1) : options.planche ? 18 : 12;
  const aspect = w / Math.max(h, 1);
  Object.assign(camera, { left: -view * aspect, right: view * aspect, top: view, bottom: -view });
  camera.updateProjectionMatrix();
  dirty = true;
}
new ResizeObserver(resize).observe(stage);

const silhouette = new THREE.MeshBasicMaterial({ color: 0x000000 });

function applyTheme() {
  document.documentElement.dataset.theme = options.theme;
  // les elements d'interface (le fil de la ville) suivent la bascule : --gdc-motion vaut 0
  if (options.reducedMotion) document.documentElement.dataset.motion = 'reduced';
  else delete document.documentElement.dataset.motion;
  const ctx = makeContext(options);
  scene.background = new THREE.Color(options.silhouette ? '#FFFFFF' : ctx.palette.paper);
  // l'heure : le ciel, le soleil ou la lune, le fond (de jour, la recette et le fond de toujours) et les fenetres
  const r = recetteDe(MOMENTS[options.heure], options.theme);
  regleLumieres({ ciel, soleil: sun, scene: options.silhouette ? null : scene }, r);
  vitres.regle(r.fenetres);
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
  const bs = document.createElement('button');
  bs.textContent = 'La scène de référence';
  bs.title = 'La carte du harnais : les bureaux, le chantier clôturé, le bâtiment habité, et le repère de chaque étape ; même caméra, même lumière';
  bs.dataset.id = reference.SCENE_ID;
  bs.addEventListener('click', () => select(reference.SCENE_ID));
  // les projets d'exemple a plusieurs applications : un batiment chacune ; le plan se lit dans l'adresse, d'ou le rechargement
  const projets = Object.entries(reference.PROJETS).map(([cle, noms]) => {
    const b = document.createElement('button');
    b.textContent = `La scène de référence : ${cle === 'auditapp' ? 'AuditApp' : cle}, ${noms.length} bâtiments`;
    b.title = noms.join(', ');
    b.dataset.id = `${reference.SCENE_ID}?${cle}`;
    b.addEventListener('click', () => { location.href = `${location.pathname}?applications=${cle}#${reference.SCENE_ID}/${reference.PHASE_DEFAUT}`; });
    return b;
  });
  list.append(h0, bs, ...projets, b0);
  // La ville vivante : une sequence de GDC jouee etape par etape (?lecture=8 : une etape toutes les 8 s ; ?ouvriers=max :
  // chaque parcelle en chantier prend son plafond, pour mesurer la fluidite a 12 ouvriers)
  for (const [nom, index] of Object.entries(SEQUENCES)) {
    const b = document.createElement('button');
    b.textContent = `La ville : ${nom === 'projet-type' ? 'un projet type' : nom.replace('-', ' ')}`;
    b.title = index.description;
    b.dataset.id = `${VILLE_ID}:${nom}`;
    b.addEventListener('click', () => select(b.dataset.id));
    list.append(b);
  }
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

// La ville : la carte vivante (src/ville/carte.js) sur une sequence de fixtures/ ; les etats sont les etapes de la
// sequence. Passer a l'etape suivante joue ses actions, comme GDC le fera ; sauter plus loin pose la scene telle quelle.
// Le fil des declencheurs (trigger-feed), a gauche de la carte comme dans GDC : les actions des etapes jouees. Passer a
// l'etape suivante lui donne ses actions, comme GDC a chaque nouvelle scene ; un saut repart d'un fil neuf.
let filVille = null;
function poseFil(actions) {
  retireFil();
  filVille = document.createElement('gdc-trigger-feed');
  filVille.className = 'fil-ville';
  filVille.data = { actions };
  filVille.addEventListener('gdc-hover', (e) => relaieSurvol('fil', e.detail.ref));
  stage.append(filVille);
}
function retireFil() {
  filVille?.remove();
  filVille = null;
  survolsVille.clear();
}
// L'arbre des fiches et des lots (side-nav 2.0.0), a droite de la carte comme dans GDC : tire de la scene de chaque
// etape (src/arbre.js) ; les batiments se deplient a leur arrivee ; un choix est confirme comme GDC le ferait.
let arbreVille = null;
let choixVille = null;
function poseArbre(scene) {
  if (!arbreVille) {
    arbreVille = document.createElement('gdc-side-nav');
    arbreVille.className = 'arbre-ville';
    arbreVille.addEventListener('gdc-hover', (e) => relaieSurvol('arbre', e.detail.ref));
    arbreVille.addEventListener('gdc-select', (e) => {
      choixVille = e.detail.id;
      arbreVille.data = { ...arbreVille.data, selected: choixVille };
    });
    stage.append(arbreVille);
  }
  const batiments = (scene.elements || []).filter((e) => e.element === 'building').map((e) => e.id);
  arbreVille.data = arbreDe(scene, { selected: choixVille, expanded: batiments });
}
function retireArbre() {
  arbreVille?.remove();
  arbreVille = null;
  choixVille = null;
}
// Le survol partage entre la carte, le fil et l'arbre, comme GDC le fera : chaque source garde sa derniere reference ;
// le highlight est la plus recente qui n'est pas null, renvoye au fil et a l'arbre (l'emetteur compris) et pose sur la
// carte.
const survolsVille = new Map();
function relaieSurvol(source, ref) {
  survolsVille.delete(source);
  if (ref) survolsVille.set(source, ref);
  const h = [...survolsVille.values()].at(-1) ?? null;
  if (filVille) filVille.highlight = h;
  if (arbreVille) arbreVille.highlight = h;
  current.ville?.carte.surligne(h).then(() => { dirty = true; });
}

async function instanceVille(id, state) {
  const nom = id.slice(VILLE_ID.length + 1);
  const index = SEQUENCES[nom];
  const etapes = index.etapes.map((e) => String(e.numero).padStart(2, '0'));
  const sceneDe = (s) => SCENES_GDC[`../fixtures/${nom}/${index.etapes[etapes.indexOf(s)].fichier}`];
  const q = new URLSearchParams(location.search);
  const carte = await creeCarte(THREE, { components: byId, chargeur: charge, ...options, force: q.get('ouvriers') === 'max' });
  const premier = etapes.includes(state) ? state : etapes[0];
  await carte.applique(sceneDe(premier));
  const actionsJusqua = (s) => etapes.slice(0, etapes.indexOf(s) + 1).flatMap((x) => sceneDe(x).actions || []);
  poseFil(actionsJusqua(premier));
  poseArbre(sceneDe(premier));
  let etape = premier;
  const inst = {
    root: carte.root,
    instances: [],
    setState(s) {
      const suite = etapes.indexOf(s) === etapes.indexOf(etape) + 1;
      etape = s;
      if (suite && filVille) filVille.data = { actions: sceneDe(s).actions || [] };
      else poseFil(actionsJusqua(s));
      poseArbre(sceneDe(s));
      carte.applique(sceneDe(s), { actions: suite }).then(() => {
        if (current.inst !== inst) return;
        current.apps = carte.applications;
        resize();
        rapportVille();
      });
    },
    update: (dt) => carte.update(dt),
    anchor: (n) => carte.anchor(n),
    repere: (n) => carte.repere(n),
    cadres: () => carte.cadres(),
    dispose: () => carte.dispose(),
  };
  const meta = { states: etapes, get anchors() { return carte.reperes(); }, budget: { triangles: 0, materials: 0 } };
  const secondes = Number(q.get('lecture'));
  const lecture = secondes > 0 ? setInterval(() => {
    const i = etapes.indexOf(current.state);
    if (current.inst !== inst || i >= etapes.length - 1) return clearInterval(lecture);
    $('states').children[i + 1].click();
  }, secondes * 1000) : null;
  return { inst, state: premier, entry: { id, name: `La ville : ${index.sequence}` }, mod: { meta }, scene: true, apps: carte.applications, ville: { nom, index, carte, etapes, lecture } };
}

async function instance(id, state) {
  if (id.startsWith(`${VILLE_ID}:`)) return instanceVille(id, state);
  if (id === reference.SCENE_ID) {
    // le plan pour les applications de l'adresse (?applications=3, ou un projet : ?applications=auditapp) ; une instance par membre, avec ses
    // parametres et dans son etat, puis l'assemblage, dans la phase demandee
    const p = reference.plan(new URLSearchParams(location.search).get('applications'));
    const insts = [];
    for (const m of p.membres) {
      const mod = byId[m.id];
      // une personne d'equipe.json : ses parametres et ses seuls fichiers, comme pour la planche de l'equipe
      const params = m.personne ? personnage.parametresDe(personnage.PERSONNES.find((x) => x.id === m.personne)) : { ...defaultParams(mod.meta), ...m.params };
      const metaM = m.personne ? personnage.metaPersonne(params) : mod.meta;
      await charge.prepare(metaM);
      const inst = mod.create(THREE, params, makeContext(options, await charge.assetsPour(metaM)));
      inst.setState(m.state || mod.meta.states[0], { ...sampleData(entries.find((e) => e.id === m.id)), ...m.data });
      insts.push(inst);
    }
    const inst = reference.create(THREE, insts, p);
    const premier = state && p.meta.states.includes(state) ? state : reference.PHASE_DEFAUT;
    inst.setState(premier);
    const projet = new URLSearchParams(location.search).get('applications');
    const name = p.noms.length ? `La scène de référence, projet ${projet} (${p.apps} applications)` : p.apps > 1 ? `La scène de référence, ${p.apps} applications` : 'La scène de référence';
    return { inst, state: premier, entry: { id, name }, mod: { meta: p.meta }, scene: true, apps: p.apps };
  }
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
  inst.setState(premier, donnees(entry));
  return { inst, state: premier, entry, mod };
}

// Les donnees d'exemple d'un etat, completees par celles de l'adresse (?count=15) : seules les cles de la fiche (data)
// sont lues ; une valeur numerique reste un nombre, une liste ou un objet JSON est lu (?rooms=[{"state":"done"}]).
function donnees(entry) {
  const q = new URLSearchParams(location.search);
  const adresse = Object.keys(entry.data || {}).filter((k) => q.has(k)).map((k) => [k, valeurAdresse(q.get(k))]);
  return { ...sampleData(entry), ...Object.fromEntries(adresse) };
}

function valeurAdresse(v) {
  if (/^[[{]/.test(v)) { try { return JSON.parse(v); } catch { return v; } }
  return Number.isNaN(Number(v)) ? v : Number(v);
}

// Les parametres pris dans l'adresse (?stack=2, ?height=30) : revoir un composant ailleurs qu'a ses valeurs par defaut.
// Seuls les parametres declares dans meta sont lus ; un nombre reste un nombre ; une liste donne sa longueur (building-
// interior : ?rooms=[...] fixe le nombre de pieces et leurs donnees).
function parametresAdresse(meta) {
  const q = new URLSearchParams(location.search);
  return Object.fromEntries(Object.entries(meta.params || {}).filter(([nom]) => q.has(nom))
    .map(([nom, p]) => {
      const v = valeurAdresse(q.get(nom));
      return [nom, p.type === 'number' ? (Array.isArray(v) ? v.length : Number(v)) : q.get(nom)];
    }));
}

function retire(x) { if (x && x.ville) { retireFil(); retireArbre(); } if (x && x.ville?.lecture) clearInterval(x.ville.lecture); if (x && x.inst) { scene.remove(x.inst.root); x.inst.dispose(); } }

// Un signal (lot G5) se juge a cote des lieux ou il apparait (signaletique) : ses voisins de planche, poses tout pres
// (ECART_SIGNAL entre les emprises), et non les deux premiers modeles livres ; « id/etat » pose un voisin dans cet etat.
const VOISINS_SIGNAUX = { 'decision-sign': ['client-office', 'reception-area'], 'blocked-sign': ['site-fence', 'building'],
  'defect-sign': ['building/completed', 'building-interior'], 'permit-board': ['site-office', 'decision-sign'] };
const ECART_SIGNAL = 1.5;

// La planche : le composant choisi entre les deux modeles maitres (choix de Pierre-Alain du 21 octobre 2026), le
// batiment termine et le personnage maitre ; un maitre se compare a la baraque du conducteur de travaux au lieu de
// lui-meme.
const MAITRES = ['building/completed', 'character'];
const SUPPLEANT = 'site-office';
function references(id) {
  if (VOISINS_SIGNAUX[id]) return VOISINS_SIGNAUX[id];
  return MAITRES.map((m) => (m.split('/')[0] === id ? SUPPLEANT : m));
}

// Les occupants d'un lieu : un personnage d'exemple a chaque ancre desk:n (personnage.OCCUPANTS), au travail, et a chaque
// place crew:n (personnage.PASSAGE, les agents de passage), au repos ; tous tournes vers le fond du lieu. Ils sont retires et animes avec les voisins de la planche ; ils ne comptent pas au budget du lieu.
async function occupants(x) {
  const ancres = x.mod.meta.anchors || [];
  const groupes = [['desk', personnage.OCCUPANTS[x.entry.id] || []], ['crew', personnage.PASSAGE[x.entry.id] || []]];
  const out = [];
  for (const [groupe, ids] of groupes) {
    if (!ancres.includes(`${groupe}:*`)) continue;
    out.push(...await poseOccupants(x, groupe, ids));
  }
  if (ancres.includes('room:*')) out.push(...await ouvriers(x));
  if (x.entry.id in SEANCES) out.push(...await seance(x));
  return out;
}

// Une seance de brainstorming (office-interior) : en active, data.activeDesks personnes aux places desk:n, tournees
// vers la table (celles du fond regardent vers l'avant), qui parlent ou reflechissent a tour de role. La galerie les
// repose quand on change d'etat.
const SEANCES = { 'office-interior': ['claire', 'marc', 'client', 'fanny', 'lina', 'paul', 'iris', 'noah'] };
async function seance(x) {
  if (x.state !== 'active') return [];
  const out = [];
  const n = Number(donnees(x.entry).activeDesks) || 0;
  for (const [i, pid] of SEANCES[x.entry.id].slice(0, n).entries()) {
    let poste;
    try { poste = x.inst.anchor(`desk:${i + 1}`); } catch { break; }
    const params = personnage.parametresDe(personnage.PERSONNES.find((p) => p.id === pid));
    const m = personnage.metaPersonne(params);
    await charge.prepare(m);
    const inst = byId.character.create(THREE, params, makeContext(options, await charge.assetsPour(m)));
    inst.setState(i % 2 ? 'thinking' : 'talk', { facing: poste.z < 0 ? 0 : Math.PI });
    x.inst.root.updateMatrixWorld(true);
    inst.root.position.copy(x.inst.root.localToWorld(poste));
    scene.add(inst.root);
    out.push({ inst });
  }
  return out;
}

// Les ouvriers d'un interieur : pour chaque piece de data.rooms, la premiere personne d'equipe.json de chaque metier
// present, ecartes de 0,9 m autour de l'ancre room:n, comme GDC les posera. Ils travaillent du trace aux finitions et en
// defaut, controlent une piece finie, attendent dans une piece vide (building-interior 2.0.0).
const ETAT_PIECE = { preparing: 'work', building: 'work', finishing: 'work', defect: 'work', done: 'inspect' };
async function ouvriers(x) {
  const out = [];
  const rooms = donnees(x.entry).rooms || [];
  for (const [i, room] of rooms.entries()) {
    let poste;
    try { poste = x.inst.anchor(`room:${i + 1}`); } catch { break; }
    const personnes = (room.trades || []).map((m) => personnage.PERSONNES.find((p) => p.metier === m)).filter(Boolean);
    for (const [j, p] of personnes.entries()) {
      const params = personnage.parametresDe(p);
      const m = personnage.metaPersonne(params);
      await charge.prepare(m);
      const inst = byId.character.create(THREE, params, makeContext(options, await charge.assetsPour(m)));
      inst.setState(ETAT_PIECE[room.state] || 'idle', { facing: Math.PI });
      x.inst.root.updateMatrixWorld(true);
      inst.root.position.copy(x.inst.root.localToWorld(poste.clone().add(new THREE.Vector3((j - (personnes.length - 1) / 2) * 0.9, 0, 0.2))));
      scene.add(inst.root);
      out.push({ inst });
    }
  }
  return out;
}

async function poseOccupants(x, groupe, ids) {
  const out = [];
  for (const [i, pid] of ids.entries()) {
    let poste;
    try { poste = x.inst.anchor(`${groupe}:${i + 1}`); } catch { break; }
    const params = personnage.parametresDe(personnage.PERSONNES.find((p) => p.id === pid));
    const m = personnage.metaPersonne(params);
    await charge.prepare(m);
    const inst = byId.character.create(THREE, params, makeContext(options, await charge.assetsPour(m)));
    inst.setState(groupe === 'crew' ? 'idle' : personnage.ETAT_OCCUPANTS[x.entry.id] || 'work', { facing: Math.PI });
    x.inst.root.updateMatrixWorld(true);
    inst.root.position.copy(x.inst.root.localToWorld(poste));
    scene.add(inst.root);
    out.push({ inst });
  }
  return out;
}

// Pour la console du navigateur (outil de fabrication) : galerie.courant.inst.setState('default', { count: 4 }), puis
// galerie.redessine() pour voir une transition.
window.galerie = {
  get courant() { return current; },
  redessine() { dirty = true; },
  // Cadrer de pres pour une revue : zoom de la camera orthographique, centre sur un point de la scene (x, y, z) ;
  // galerie.cadre(1) revient au cadrage d'ensemble.
  cadre(zoom = 1, centre = null) {
    const vers = centre ? new THREE.Vector3(...centre) : new THREE.Vector3(...lumiere.camera.cible);
    camera.position.add(vers.clone().sub(controls.target));
    controls.target.copy(vers);
    camera.zoom = zoom;
    camera.updateProjectionMatrix();
    controls.update();
    dirty = true;
  },
  // La fluidite : un rendu force a chaque image pendant quelques secondes ; images par seconde et 95e centile (ms).
  fluidite(secondes = 5) {
    return new Promise((ok) => {
      const debut = performance.now();
      const durees = [];
      let avant = debut;
      const pas = () => {
        dirty = true;
        const t = performance.now();
        durees.push(t - avant);
        avant = t;
        if (t - debut < secondes * 1000) return requestAnimationFrame(pas);
        durees.shift();
        durees.sort((a, b) => a - b);
        ok({ images: durees.length, fps: +((1000 * durees.length) / (t - debut)).toFixed(1), p95: +durees[Math.floor(durees.length * 0.95)].toFixed(1) });
      };
      requestAnimationFrame(pas);
    });
  },
};

// La ville : un clic sur un etage ouvre sa vue en coupe, comme le fera GDC ; un clic ailleurs ou Echap la ferme. Le
// survol d'un batiment, d'un etage ou d'une piece pose l'anneau (le survol partage, cote carte).
const rayon = new THREE.Raycaster();
const pointeur = new THREE.Vector2();
const visible = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
function sousPointeur(ev) {
  const r = renderer.domElement.getBoundingClientRect();
  pointeur.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  rayon.setFromCamera(pointeur, camera);
  const touches = rayon.intersectObject(current.inst.root, true).filter((h) => visible(h.object)).map((h) => h.object);
  // le premier element de GDC sous le pointeur : un ouvrier ou un usager qui passe devant un batiment ne le cache pas
  return current.ville ? current.ville.carte.designe(touches) : touches[0] || null;
}
let appui = null;
let survolVille = 'null';
renderer.domElement.addEventListener('pointerdown', (ev) => { appui = [ev.clientX, ev.clientY]; });
renderer.domElement.addEventListener('pointerup', async (ev) => {
  if (!current.ville || !appui || Math.hypot(ev.clientX - appui[0], ev.clientY - appui[1]) > 4) return;
  const { carte } = current.ville;
  const objet = sousPointeur(ev);
  const cible = carte.cible(objet);
  // l'etage touche s'ouvre ; le rez regroupe ou le batiment : l'etage en chantier le plus haut (building-interior 2.0.0).
  // Les gabarits d'un batiment en plot valent son etage : ils couvrent sa parcelle, au ras du sol
  const gabarits = cible?.element === 'survey-poles' && cible.ancre;
  const batiment = cible?.element === 'building' ? cible.id : gabarits ? cible.ancre : null;
  const fiche = gabarits ? cible.ref?.fiche : carte.refSous(objet)?.fiche;
  if (batiment && carte.coupe !== batiment) await carte.ouvreCoupe(batiment, fiche);
  else carte.fermeCoupe();
  // l'anneau du survol d'avant le clic tombait sur le batiment, cache le temps de la coupe : le survol suivant le repose
  survolVille = 'null';
  await carte.surligne(null);
  dirty = true;
});
renderer.domElement.addEventListener('pointermove', (ev) => {
  if (!current.ville || ev.buttons) return;
  const ref = current.ville.carte.refSous(sousPointeur(ev));
  if (JSON.stringify(ref) === survolVille) return;
  survolVille = JSON.stringify(ref);
  relaieSurvol('carte', ref);
});
renderer.domElement.addEventListener('pointerleave', () => {
  if (!current.ville || survolVille === 'null') return;
  survolVille = 'null';
  relaieSurvol('carte', null);
});
addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && current.ville) { current.ville.carte.fermeCoupe(); dirty = true; } });

// L'heure de la galerie (fiche day-night) : la nuit, les vitres des batiments et des bureaux s'eclairent comme sur la
// carte (franchement un etage occupe ou un bureau actif) ; la ville s'en charge elle-meme.
const vitres = creeVitres();
function eclaireVitres() {
  for (const x of [current, ...current.voisins]) {
    if (!x.inst || x.ville) continue;
    x.inst.root.traverse((o) => {
      const id = o.userData.component;
      if (!ECLAIRABLES.has(id)) return;
      if (id === 'building') eclaireBatiment(vitres, o);
      else vitres.pose(o, forceDe(id, { actif: o === x.inst.root && x.state === 'active' }));
    });
  }
}

async function select(id, state) {
  retire(current);
  for (const v of current.voisins) retire(v);
  vitres.libere();
  const x = await instance(id, state);
  scene.add(x.inst.root);
  const voisins = await occupants(x);
  if (options.planche && id !== etalon.ETALON_ID && id !== reference.SCENE_ID) {
    // les voisins a 20 m de part et d'autre, ou plus loin si le composant ou le voisin est large (un plateau de
    // conteneurs) : 6 m au moins entre leurs emprises ; le personnage maitre, lui, se pose tout pres, comme les voisins
    // d'un signal : il donne l'echelle
    const boite = new THREE.Box3().setFromObject(x.inst.root);
    let pos = -1;
    for (const ref of references(id)) {
      const [rid, rstate] = ref.split('/');
      const v = await instance(rid, rstate);
      const bv = new THREE.Box3().setFromObject(v.inst.root);
      if (VOISINS_SIGNAUX[id] || rid === 'character') v.inst.root.position.x = pos < 0 ? boite.min.x - ECART_SIGNAL - bv.max.x : boite.max.x + ECART_SIGNAL - bv.min.x;
      else v.inst.root.position.x = pos < 0 ? Math.min(-20, boite.min.x - 6 - bv.max.x) : Math.max(20, boite.max.x + 6 - bv.min.x);
      scene.add(v.inst.root);
      voisins.push(v);
      pos += 2;
    }
  }
  current = { ...x, voisins };
  eclaireVitres();
  resize(); // le cadrage depend du composant (la scene de reference)
  const projet = new URLSearchParams(location.search).get('applications');
  const choisi = id === reference.SCENE_ID && reference.PROJETS[projet] ? `${id}?${projet}` : id;
  for (const b of $('list').querySelectorAll('button')) b.setAttribute('aria-current', String(b.dataset.id === choisi));
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
      if (current.entry.id in SEANCES) return select(current.entry.id, s); // les participants dependent de l'etat
      current.inst.setState(s, donnees(current.entry));
      current.state = s;
      eclaireVitres(); // un batiment refait ses vitres a chaque etat
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
  if (current.ville) return rapportVille();
  if (current.scene) return rapportScene();
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
// Les reperes de la scene de reference (scene-reference.js) : numero dans la couleur de sa zone, icone d'etape du lot G7,
// titre ; un passage (une decision du client) a un contour ; la pastille d'un batiment ne montre que son numero, le titre
// au survol.
const tmp = new THREE.Vector3();
let etiquettes = { inst: null, tags: new Map(), cadres: null };
function remplit(tag, r) {
  tag.replaceChildren();
  tag.className = 'anchor repere' + (r.passage ? ' passage' : '') + (r.pastille ? ' pastille' : '') + (r.attenue ? ' attenue' : '');
  const couleur = r.zone ? reference.ZONES[r.zone].couleur : 'var(--ink)';
  tag.style.setProperty('--zone', couleur);
  if (r.numero) { const n = document.createElement('b'); n.textContent = r.numero; tag.append(n); }
  const svg = r.icone && illustrations['step-icons']?.[r.icone];
  if (svg) { const i = document.createElement('span'); i.className = 'icone'; i.innerHTML = svg; tag.append(i); }
  const t = document.createElement('span');
  t.className = 'titre';
  t.textContent = r.titre;
  tag.append(t);
  tag.title = r.numero ? `${r.numero}. ${r.titre}` : r.titre;
}
const projette = (v) => {
  tmp.copy(v);
  current.inst.root.localToWorld(tmp);
  tmp.project(camera);
  const { clientWidth: w, clientHeight: h } = stage;
  return [((tmp.x + 1) / 2) * w, ((1 - tmp.y) / 2) * h];
};
// le nom de chaque zone, sous son coin le plus proche de la camera ; sa bordure est peinte au sol (scene-reference.js)
function dessineCadres(layer) {
  if (!etiquettes.cadres) {
    etiquettes.cadres = current.inst.cadres().map((c) => {
      const nom = document.createElement('div');
      nom.className = 'anchor nom-zone';
      nom.style.setProperty('--zone', c.couleur);
      nom.textContent = c.nom;
      layer.append(nom);
      return { c, nom };
    });
  }
  // la ville : une zone jamais activee a son nom attenue, jusqu'a ce que sa couleur arrive
  const frais = current.ville ? current.inst.cadres() : null;
  for (const [i, { c, nom }] of etiquettes.cadres.entries()) {
    if (frais) nom.classList.toggle('attenue', !frais[i].activee);
    const g = c.coins.map(projette).reduce((a, b) => (b[1] > a[1] ? b : a));
    nom.style.left = `${g[0]}px`;
    nom.style.top = `${g[1]}px`;
  }
}
function drawAnchors() {
  const layer = $('anchors');
  if (!options.anchors || options.silhouette || !current.inst) { layer.replaceChildren(); etiquettes = { inst: null, tags: new Map(), cadres: null }; return; }
  if (etiquettes.inst !== current.inst) { layer.replaceChildren(); etiquettes = { inst: current.inst, tags: new Map(), cadres: null }; }
  if (current.scene) dessineCadres(layer);
  for (const a of current.mod.meta.anchors) {
    const name = a.replace('*', '0');
    let v;
    try { v = current.inst.anchor(name); } catch { continue; }
    const [x, y] = projette(v);
    let tag = etiquettes.tags.get(name);
    if (!tag) {
      tag = document.createElement('div');
      tag.className = 'anchor';
      if (!current.scene) tag.textContent = name;
      layer.append(tag);
      etiquettes.tags.set(name, tag);
    }
    // un repere de la scene change avec la phase : on le refait quand ce qu'il dit change
    if (current.scene) {
      const r = current.inst.repere(name);
      const sig = JSON.stringify(r);
      if (tag.dataset.sig !== sig) { remplit(tag, r); tag.dataset.sig = sig; }
    }
    tag.style.left = `${x}px`;
    tag.style.top = `${y}px`;
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

// La ville : l'etape jouee, le regime du chantier, qui est sur la carte, ce qu'elle pese, et ce que la carte a signale.
function rapportVille() {
  const { carte, index, etapes } = current.ville;
  const m = measure(current.inst.root);
  const c = carte.compte();
  const e = index.etapes[etapes.indexOf(current.state)];
  const el = $('report');
  el.replaceChildren(`${e.numero}. ${e.titre} · régime ${carte.regime} · ${c.agents} agents · ${c.ouvriers} ouvriers · ${c.usagers} usagers · ${m.triangles} triangles · ${m.materials} matériaux`);
  if (carte.signalements.length) {
    const s = document.createElement('span');
    s.className = 'ko';
    s.textContent = ` · signalé : ${carte.signalements.join(' ; ')}`;
    el.append(s);
  }
}

// La scene de reference : ce qu'elle pese en tout. Sa fluidite se mesure en images par seconde (voir le constat).
function rapportScene() {
  const m = measure(current.inst.root);
  $('report').replaceChildren(`${current.entry.name} · phase ${current.state} · ${current.inst.instances.length} composants · ${m.triangles} triangles · ${m.materials} matériaux`);
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
  // la recette du cube etalon est celle du jour : a l'aube et la nuit, la mesure est indicative
  if (options.heure !== 'jour') { verdict.className = ''; verdict.textContent = `${options.heure} : mesure indicative, la recette se vérifie de jour`; }
  el.append(verdict);
}

const clock = new THREE.Clock();
let rapporte = 0;
function loop() {
  const dt = Math.min(clock.getDelta(), 0.1);
  for (const x of [current, ...current.voisins]) if (x.inst && x.inst.update(dt)) dirty = true;
  if (dirty) {
    renderer.render(scene, camera);
    if (current.mod === etalon && !options.silhouette) rapportEtalon(etalon.mesureFaces(THREE, renderer, camera, current.inst.root));
    drawAnchors();
    // la ville change sans qu'on clique (les actions jouees, la vie) : son compte rendu suit, deux fois par seconde
    if (current.ville && performance.now() - rapporte > 500) { rapportVille(); rapporte = performance.now(); }
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
// l'heure : jour, aube, nuit, puis de nouveau le jour
const NOMS_HEURE = { jour: 'Jour', aube: 'Aube', nuit: 'Nuit' };
function etiquetteHeure() {
  $('heure').textContent = NOMS_HEURE[options.heure];
  $('heure').setAttribute('aria-pressed', String(options.heure !== 'jour'));
}
$('heure').addEventListener('click', async () => {
  const suite = Object.keys(NOMS_HEURE);
  options.heure = suite[(suite.indexOf(options.heure) + 1) % suite.length];
  etiquetteHeure();
  applyTheme();
  if (current.entry) await select(current.entry.id, current.state);
  dirty = true;
});
etiquetteHeure();

applyTheme();
buildList();
resize();
const [hashId, hashState, hashPlanche] = decodeURIComponent(location.hash.slice(1)).split('/');
if (hashPlanche === 'planche') { options.planche = true; $('planche').setAttribute('aria-pressed', 'true'); resize(); }
const start = byId[hashId] || hashId === etalon.ETALON_ID || hashId === personnage.PERSONNAGE_ID || hashId === reference.SCENE_ID || hashId?.startsWith(kit.PREFIXE_ID) || SEQUENCES[hashId?.split(':')[1]] ? hashId : entries.find((e) => byId[e.id])?.id;
if (start) await select(start, hashState);
loop();
