// Le controle de la carte vivante (fiche city-map) : les chemins, la lecture des actions et la vie du chantier, sans
// navigateur, sur l'implantation et sur les sequences reelles de GDC (fixtures/). Lance par « npm run check ».
import { implantation, zoneDe, SOCLES, PAS_PARCELLE, DENSITE_PROJECTEURS } from '../src/ville/implantation.js';
import { creeChemins, positionSur, MARCHE_MAX } from '../src/ville/chemins.js';
import { lisScene } from '../src/ville/scene-gdc.js';
import { equipes, usagers, PLAFONDS } from '../src/ville/vie.js';
import { creeCarte } from '../src/ville/carte.js';
import { floorPlate } from '../src/etages.js';
import { lieuxGrue, hauteurGrue, hauteurDecalee } from '../src/ville/grue.js';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { creeChargeur } from '../src/assets.js';
import { makeContext } from '../src/tokens.js';
import { measure } from '../src/contract.js';
import { soleilDe, momentDe, recetteDe, passages, lumiere } from '../src/ville/heure.js';
import palette from '../src/palette.json' with { type: 'json' };
import reglages from '../src/lumiere.json' with { type: 'json' };
import { agentPris, RAYON_PRISE } from '../src/ville/prise.js';
import { creeSuivi, DUREE_SUIVI } from '../src/ville/camera.js';

// Le batiment d'une application et la coupe ouverte, dans l'arbre de la carte.
function racinesCoupe(carte, id) {
  let batiment = null;
  let interieur = null;
  carte.root.traverse((o) => {
    if (!batiment && o.name === 'building' && carte.cible(o)?.id === id) batiment = o;
    if (!interieur && o.name === 'building-interior') interieur = o;
  });
  return { batiment, interieur };
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const erreurs = [];
let verifies = 0;
const verifie = (ok, message) => {
  verifies++;
  if (!ok) erreurs.push(message);
};

// --- Les chemins
const dans = ([x, z], r, marge = 0) => x > r.x[0] + marge && x < r.x[1] - marge && z > r.z[0] + marge && z < r.z[1] - marge;
// les points d'un chemin, tous les 25 cm
const echantillons = (c) => {
  const n = Math.max(2, Math.ceil(c.longueur / 0.25));
  return Array.from({ length: n + 1 }, (_, i) => positionSur(c, i / n));
};
for (let apps = 1; apps <= 8; apps++) {
  const imp = implantation(apps);
  const chemins = creeChemins(imp.voies);
  const lieux = Object.keys(imp.lieux);
  const bouts = [...lieux, ...imp.parcelles.map((p) => `allee:${p.index + 1}`)];
  // le socle de chaque parcelle : on n'y coupe jamais (on entre par sa porte, sur l'allee)
  const socles = imp.parcelles.map((p) => ({ x: [p.position[0] - 6, p.position[0] + 6], z: [p.position[2] - 6, p.position[2] + 6] }));
  for (const de of bouts)
    for (const vers of bouts) {
      if (de === vers) continue;
      const c = chemins.chemin(de, vers);
      verifie(c, `${apps} app. : aucun chemin de ${de} à ${vers}`);
      if (!c) continue;
      verifie(c.duree <= MARCHE_MAX + 1e-9, `${apps} app. : ${de} → ${vers} dure ${c.duree} s, plus que le plafond`);
      verifie(
        echantillons(c).every((p) => socles.every((s) => !dans(p, s))),
        `${apps} app. : ${de} → ${vers} coupe à travers une parcelle`,
      );
    }
  // le client ne traverse jamais le chantier : ses chemins hors du chantier n'y entrent pas, et il n'a pas de chemin
  // vers le chantier
  const dehors = lieux.filter((id) => imp.lieux[id].zone !== 'chantier');
  for (const de of dehors)
    for (const vers of dehors) {
      if (de === vers) continue;
      const c = chemins.chemin(de, vers, { client: true });
      verifie(c, `${apps} app. : le client n'a pas de chemin de ${de} à ${vers}`);
      if (c) verifie(echantillons(c).every((p) => !dans(p, imp.chantier, 0.01)), `${apps} app. : le client traverse le chantier de ${de} à ${vers}`);
    }
  verifie(chemins.chemin('bureau-client', 'baraque', { client: true }) === null, `${apps} app. : le client a un chemin vers la baraque`);
}

// les parcelles prennent la largeur de leur socle : aucun chevauchement, toutes dans le chantier
for (const types of [['house'], ['block', 'block', 'block'], ['hall', 'hall', 'hall', 'hall'], ['house', 'hall', 'block']]) {
  const imp = implantation(types.length, types);
  const largeur = { house: 12, block: 15, hall: 18 };
  imp.parcelles.forEach((p, k) => {
    const [g, d] = [p.position[0] - largeur[types[k]] / 2, p.position[0] + largeur[types[k]] / 2];
    verifie(g > imp.chantier.x[0] && d < imp.chantier.x[1], `${types} : la parcelle ${k + 1} sort du chantier`);
    if (k) verifie(g >= imp.parcelles[k - 1].position[0] + largeur[types[k - 1]] / 2, `${types} : les parcelles ${k} et ${k + 1} se chevauchent`);
    verifie(g > 40.6, `${types} : la parcelle ${k + 1} empiète sur le chemin des experts`);
  });
  verifie(creeChemins(imp.voies).chemin('baraque', `allee:${types.length}`), `${types} : la dernière parcelle n'est pas desservie`);
}
// building 3.0.0 : la parcelle prend la largeur de son plateau (jusqu'a 21 m), le terrain va jusqu'a 140 m ; un
// plateau profond a sa grue au coin arriere gauche, hors des panneaux du feu vert, du chemin du fond et des socles
// voisins, son stock a portee de fleche (11 m)
{
  const P = (nx, ny) => ({ nx, ny });
  for (const plateaux of [[P(5, 3), P(5, 3), P(5, 3), P(5, 3)], Array(8).fill(P(5, 3)), [P(2, 2), P(5, 3), P(4, 2), P(4, 3)], [P(5, 2), P(3, 2), P(5, 3)]]) {
    const types = plateaux.map(() => 'block');
    const imp = implantation(types.length, types, undefined, plateaux);
    const nom = plateaux.map((p) => `${p.nx}×${p.ny}`).join(', ');
    verifie(imp.terrain.x[1] - imp.terrain.x[0] <= 140, `${nom} : terrain de ${imp.terrain.x[1] - imp.terrain.x[0]} m`);
    const socle = (p) => [p.position[0] - (p.plateau.nx * 3 + 6) / 2, p.position[0] + (p.plateau.nx * 3 + 6) / 2];
    imp.parcelles.forEach((p, k) => {
      const [g, d] = socle(p);
      verifie(g > imp.chantier.x[0] && d < imp.chantier.x[1] && g > 40.6, `${nom} : la parcelle ${k + 1} sort du chantier`);
      const voisine = imp.parcelles[k - 1];
      if (voisine && voisine.rangee === p.rangee) verifie(g >= socle(voisine)[1], `${nom} : les parcelles ${k} et ${k + 1} se chevauchent`);
      if (p.plateau.ny < 3) return;
      const [gx, , gz] = p.grue.position;
      const pied = { x: [gx - 1.4, gx + 1.4], z: [gz - 1.4, gz + 1.4] };
      const croise = (a, b) => a[0] < b[1] && b[0] < a[1];
      verifie(!croise(pied.x, [40.6, 43]) || !croise(pied.z, [34.9, 40.1]), `${nom} : la grue ${k + 1} est sur les panneaux du feu vert`);
      verifie(pied.x[1] < p.position[0] - p.plateau.nx * 1.5 - 1.1, `${nom} : la grue ${k + 1} est dans l'échafaudage`);
      verifie(!voisine || voisine.rangee !== p.rangee || pied.x[0] >= socle(voisine)[1], `${nom} : la grue ${k + 1} est sur la parcelle voisine`);
      verifie(pied.z[0] > imp.chantier.z[0] + 1.2 + 0.4, `${nom} : la grue ${k + 1} est sur le chemin du fond`);
      verifie(Math.hypot(p.grue.stock[0] - gx, p.grue.stock[1] - gz) < 11, `${nom} : le stock ${k + 1} est hors de portée de la flèche`);
    });
    const chemins = creeChemins(imp.voies);
    for (const p of imp.parcelles) verifie(chemins.chemin('baraque', `allee:${p.index + 1}`), `${nom} : la parcelle ${p.index + 1} n'est pas desservie`);
  }
}

let rapportRangee = '';
// --- Au-dela de quatre applications, la deuxieme rangee sous l'allee (decision de Pierre-Alain du 22 octobre 2026) :
// aucune parcelle ne se pose sur une autre ni sur la place d'un camion, tout reste dans le chantier, le terrain garde
// 140 m de large au plus (site-ground 1.2.0), chaque parcelle est desservie et l'entree du chantier ne bouge pas
{
  const boite = (cx, cz, lx, lz) => ({ x: [cx - lx / 2, cx + lx / 2], z: [cz - lz / 2, cz + lz / 2] });
  const coupe = (a, b) => a.x[0] < b.x[1] && b.x[0] < a.x[1] && a.z[0] < b.z[1] && b.z[0] < a.z[1];
  const melanges = [['block', 'house', 'block', 'house', 'block', 'house', 'block', 'house'], ['house', 'house', 'house', 'house', 'house'], ['block', 'block', 'block', 'block', 'block', 'block', 'block']];
  for (const types of melanges) {
    const imp = implantation(types.length, types);
    const nom = `deuxième rangée (${types.length} app.)`;
    verifie(imp.parcelles.length === types.length, `${nom} : ${imp.parcelles.length} parcelles`);
    const socles = imp.parcelles.map((p, k) => boite(p.position[0], p.position[2], SOCLES[types[k]], 12));
    const camions = imp.parcelles.map((p) => boite(p.camion.position[0], p.camion.position[2], 7.2, 2.6));
    imp.parcelles.forEach((p, k) => {
      verifie(p.rangee === (k < 4 ? 1 : 2), `${nom} : la parcelle ${k + 1} est dans la rangée ${p.rangee}`);
      for (const r of [socles[k], camions[k]]) verifie(r.x[0] > imp.chantier.x[0] && r.x[1] < imp.chantier.x[1] && r.z[0] > imp.chantier.z[0] && r.z[1] < imp.chantier.z[1], `${nom} : la parcelle ${k + 1} ou son camion sort du chantier`);
      socles.forEach((o, j) => j > k && verifie(!coupe(socles[k], o), `${nom} : les parcelles ${k + 1} et ${j + 1} se chevauchent`));
      camions.forEach((c, j) => verifie(!coupe(socles[k], c), `${nom} : le camion de la parcelle ${j + 1} est sur la parcelle ${k + 1}`));
      verifie(creeChemins(imp.voies).chemin('baraque', `allee:${k + 1}`), `${nom} : la parcelle ${k + 1} n'est pas desservie`);
    });
    verifie(imp.terrain.x[1] - imp.terrain.x[0] <= 140, `${nom} : terrain de ${imp.terrain.x[1] - imp.terrain.x[0]} m, plus que les 140 m de site-ground`);
    const entree = imp.clotures.find((c) => c.cle === 'fence:entree');
    verifie(entree.position[2] === implantation(1).clotures.find((c) => c.cle === 'fence:entree').position[2], `${nom} : l'entrée du chantier a bougé`);
  }
  rapportRangee = (`deuxième rangée : 5 à 8 applications sur deux rangées, chantier de ${implantation(8, melanges[0]).chantier.z[1] - implantation(4).chantier.z[1]} m plus profond, terrain de ${implantation(8, melanges[0]).terrain.x[1]} m de large`);
}

// --- Les sequences de GDC (fixtures/) : lecture et vie, sans Three.js. Elles se lisent par leur index.json seulement
// (plan de l'atelier, I-5) : chaque pas y nomme ses fichiers, rien n'est pris par motif de nom.
const sequences = {};
for (const dossier of await readdir(join(ROOT, 'fixtures'), { withFileTypes: true })) {
  if (!dossier.isDirectory()) continue;
  const index = JSON.parse(await readFile(join(ROOT, 'fixtures', dossier.name, 'index.json'), 'utf8'));
  sequences[dossier.name] = await Promise.all(index.etapes.map(async (e) => JSON.parse(await readFile(join(ROOT, 'fixtures', dossier.name, e.fichier), 'utf8'))));
  // la chronologie et la mise a jour d'un pas (GDC 0.20) sont lues a la demande : ici, seulement leur presence
  for (const e of index.etapes)
    for (const cle of ['chronologie', 'depuis'])
      if (e[cle] !== undefined) verifie(existsSync(join(ROOT, 'fixtures', dossier.name, String(e[cle]))), `${dossier.name}, pas ${e.numero} : ${cle} « ${e[cle]} » nommé par index.json, mais absent`);
}
const modules = {};
for (const cat of await readdir(join(ROOT, 'components')))
  for (const id of await readdir(join(ROOT, 'components', cat))) {
    try {
      const m = await import(pathToFileURL(join(ROOT, 'components', cat, id, 'index.js')).href);
      if (typeof m.create === 'function') modules[m.meta.id] = m;
    } catch {
      /* un dossier sans composant 3D (kit, illustration, interface) */
    }
  }
const connus = new Set(Object.keys(modules));
for (const [nom, scenes] of Object.entries(sequences)) {
  scenes.forEach((scene, i) => {
    const lu = lisScene(scene, connus);
    verifie(!lu.inconnus.length, `${nom} ${i + 1} : ${lu.inconnus.join(' ; ')}`);
    for (const quality of ['high', 'low']) {
      const p = PLAFONDS[quality];
      for (const force of [false, true]) {
        const o = equipes(lu, { quality, force });
        verifie(o.length <= p.carte, `${nom} ${i + 1} : ${o.length} ouvriers, plafond ${p.carte}`);
        const par = {};
        for (const x of o) par[x.batiment] = (par[x.batiment] || 0) + 1;
        verifie(Object.values(par).every((n) => n <= p.batiment), `${nom} ${i + 1} : plus de ${p.batiment} ouvriers sur un bâtiment`);
        verifie(lu.regime !== 'ferme' || o.length === 0, `${nom} ${i + 1} : des ouvriers sur un chantier fermé`);
        verifie(usagers(lu, { quality }).every((u) => lu.batiments.find((b) => b.id === u.batiment).habite), `${nom} ${i + 1} : un usager autour d'un bâtiment inhabité`);
      }
    }
    // la meme scene donne les memes ouvriers
    verifie(JSON.stringify(equipes(lu)) === JSON.stringify(equipes(lisScene(scene, connus))), `${nom} ${i + 1} : la graine ne rejoue pas les mêmes ouvriers`);
  });
}

// --- La carte assemblee, avec les vrais composants et modeles : chaque sequence jouee de bout en bout
const sources = {};
for (const cat of await readdir(join(ROOT, 'components')))
  for (const id of await readdir(join(ROOT, 'components', cat)))
    for (const f of await readdir(join(ROOT, 'components', cat, id)))
      if (f.endsWith('.glb')) {
        const b = await readFile(join(ROOT, 'components', cat, id, f));
        sources[`${cat}/${id}/${f}`] = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
      }
const chargeur = creeChargeur({ GLTFLoader, SkeletonUtils }, sources);
const rapports = [rapportRangee];
const rapportCamionPlus = () => rapportCamion && rapports.push(rapportCamion);
// la direction de visee de la camera isometrique de la galerie, a peu pres : de haut et de biais
const ISO = new THREE.Vector3(-1, -1.15, -1).normalize();

// --- La coupe (building-interior 3.0.0) tient son budget dans tous les cas : 1 a 30 lots, sur le plateau qu'ils
// demandent et sur le plus grand (5 x 3), chaque stade, des aspects meles, en qualite haute et basse (les donnees
// d'essai du controle des composants n'ont que deux pieces)
{
  const mod = modules['building-interior'];
  await chargeur.prepare(mod.meta);
  const assets = await chargeur.assetsPour(mod.meta);
  const ASPECTS = ['todo', 'preparing', 'building', 'finishing', 'done', 'defect'];
  const STADES = ['plot', 'excavation', 'foundations', 'structure', 'envelope', 'finishing', 'inspection', 'completed'];
  let pire = 0;
  for (const quality of ['high', 'low'])
    for (const [n, plaque] of [...Array.from({ length: 15 }, (_, k) => [k + 1, {}]), [4, { columns: 5, rows: 3 }], [20, {}], [30, {}]])
      for (const stage of STADES)
        for (let d = 0; d < ASPECTS.length + 1; d++) {
          // d < 6 : les aspects meles a partir du d-ieme ; d = 6 : toutes les pieces en travaux (le plus lourd)
          const rooms = Array.from({ length: n }, (_, k) => ({ id: `L${k + 1}`, state: d === 6 ? 'building' : ASPECTS[(k + d) % 6] }));
          const inst = mod.create(THREE, { rooms: n, ...plaque }, makeContext({ theme: 'light', quality, reducedMotion: true }, assets));
          inst.setState('default', { floor: { stage }, rooms });
          for (let m = 1; m <= n; m++) inst.anchor(`room:${m}`);
          const m = measure(inst.root);
          if (quality === 'high') pire = Math.max(pire, m.triangles);
          verifie(m.triangles <= mod.meta.budget.triangles && m.materials <= mod.meta.budget.materials, `building-interior : ${m.triangles} triangles, ${m.materials} matériaux (${n} pièces, ${stage}, ${quality})`);
          inst.dispose();
        }
  rapports.push(`coupe : budget tenu de 1 à 30 lots sur tous les plateaux, huit stades (au plus ${pire} triangles en qualité haute)`);
}
// --- Le batiment (building 3.0.0) tient son budget dans tous les cas : 1 a 30 etages, 0 a 15 lots, les trois types,
// des etages tous finis, une tour qui monte, tout en chantier ou des stades meles, en qualite haute et basse (les
// donnees d'essai du controle des composants n'ont qu'un etage) ; ses ancres floor:n et room:n-m sont toutes la
{
  const mod = modules.building;
  await chargeur.prepare(mod.meta);
  const assets = await chargeur.assetsPour(mod.meta);
  const STADES = ['excavation', 'foundations', 'structure', 'envelope', 'finishing', 'inspection', 'completed'];
  const stade = (mode, k, n) =>
    mode === 'fini' ? 'completed'
      : mode === 'tour' ? (k < n - 2 ? 'completed' : k === n - 2 ? 'envelope' : 'structure')
        : mode === 'chantier' ? (k % 2 ? 'structure' : 'envelope')
          : STADES[k % STADES.length];
  const pire = { high: 0, low: 0 };
  let essais = 0;
  for (const quality of ['high', 'low'])
    for (const type of ['house', 'block', 'hall'])
      for (const n of [1, 2, 6, 8, 12, 20, 30])
        for (const lots of [0, 4, 6, 10, 15])
          for (const mode of ['fini', 'tour', 'chantier', 'meles']) {
            const floors = Array.from({ length: n }, (_, k) => ({
              id: `F${k + 1}`,
              stage: stade(mode, k, n),
              rooms: Array.from({ length: lots }, (_, m) => ({ id: `L${m + 1}`, done: m % 3 === 0 })),
            }));
            const inst = mod.create(THREE, { type }, makeContext({ theme: 'light', quality, reducedMotion: true }, assets));
            inst.setState(floors[0].stage, { floors });
            const m = measure(inst.root);
            const plafond = quality === 'low' ? 6000 : mod.meta.budget.triangles;
            pire[quality] = Math.max(pire[quality], m.triangles);
            const cas = `${type}, ${n} étages, ${lots} lots, ${mode}, ${quality}`;
            verifie((quality === 'low' ? m.triangles < plafond : m.triangles <= plafond) && m.materials <= mod.meta.budget.materials, `building : ${m.triangles} triangles, ${m.materials} matériaux (${cas})`);
            const manquantes = [];
            for (let k = 1; k <= n; k++) {
              try { inst.anchor(`floor:${k}`); } catch { manquantes.push(`floor:${k}`); }
              for (let r = 1; r <= lots; r++)
                try { inst.anchor(`room:${k}-${r}`); } catch { manquantes.push(`room:${k}-${r}`); }
            }
            verifie(!manquantes.length, `building : ancres absentes (${cas}) : ${manquantes.slice(0, 4).join(', ')}`);
            inst.dispose();
            essais++;
          }
  rapports.push(`bâtiment : ${essais} essais de 1 à 30 étages et de 0 à 15 lots, budget tenu (au plus ${pire.high} triangles en haute, ${pire.low} en basse), ancres floor:n et room:n-m toutes posées`);
}
// --- La grue (crane 3.1.0) monte avec la tour (decision de Pierre-Alain du 28 octobre 2026) : budget tenu de 6 a 103 m,
// directement ou apres avoir grimpe ; le mat grimpe jusqu'a la hauteur voulue (sans animation, il y est d'emblee) ;
// sur une tour de 1 a 30 etages, plateau ordinaire et profond, la fleche passe au-dessus du sommet et la charge levee
// tient la hauteur de passage mesuree (le crochet n'est pas plafonne par un mat trop court)
{
  const mod = modules.crane;
  await chargeur.prepare(mod.meta);
  await chargeur.prepare(modules.building.meta);
  const ctxGrue = async (quality, reducedMotion = true) => makeContext({ theme: 'light', quality, reducedMotion }, await chargeur.assetsPour(mod.meta));
  const haut = (inst) => inst.root.getObjectByName('VEH_TOWER_CRANE_A_PIVOT_TOP').position.y;
  let pire = { high: 0, low: 0 };
  for (const quality of ['high', 'low']) {
    for (let h = 6; h <= 103; h += 1.5) {
      const inst = mod.create(THREE, { height: h }, await ctxGrue(quality));
      const m = measure(inst.root);
      pire[quality] = Math.max(pire[quality], m.triangles);
      verifie(m.triangles <= mod.meta.budget.triangles && m.materials <= mod.meta.budget.materials, `crane : ${m.triangles} triangles, ${m.materials} matériaux (mât de ${h} m, ${quality})`);
      inst.dispose();
    }
    // le mat qui grimpe de 6 a 103 m, en levage : il y arrive, troncon par troncon, sans depasser le budget
    const inst = mod.create(THREE, { height: 6 }, await ctxGrue(quality, false));
    inst.setState('lifting', {});
    for (let k = 0; k < 20; k++) inst.update(0.1);
    inst.setState('lifting', { height: 103 });
    let pas = 0;
    let monte = true;
    for (let avant = haut(inst); pas < 2000 && Math.abs(haut(inst) - mod.meta.params.height.max) > 1.5; pas++) {
      inst.update(0.1);
      if (haut(inst) < avant - 1e-9) monte = false;
      avant = haut(inst);
    }
    verifie(monte && pas < 2000, `crane : le mât ne grimpe pas jusqu'à 103 m (${haut(inst).toFixed(1)} m, ${quality})`);
    const m = measure(inst.root);
    verifie(m.triangles <= mod.meta.budget.triangles, `crane : ${m.triangles} triangles après avoir grimpé (${quality})`);
    inst.dispose();
  }
  // sans animation, la nouvelle hauteur d'emblee
  {
    const inst = mod.create(THREE, { height: 14 }, await ctxGrue('high'));
    inst.setState('idle', {});
    inst.setState('idle', { height: 50 });
    verifie(Math.abs(haut(inst) - 49.9) < 1e-6 && !inst.update(0.1), `crane : sans animation, le mât n'est pas d'emblée à 50 m (${haut(inst)} m)`);
    inst.dispose();
  }
  // la tour : 1 a 30 etages, le dernier en structure ; le mat de la carte (le dernier etage commence, puis ce que la
  // grue mesure autour d'elle)
  let essais = 0;
  let plusHaut = 0;
  for (const lots of [6, 15])
    for (let n = 1; n <= 30; n++) {
      const floors = Array.from({ length: n }, (_, k) => ({
        id: `F${k + 1}`,
        stage: k < n - 2 ? 'completed' : k === n - 2 ? 'envelope' : 'structure',
        rooms: Array.from({ length: lots }, (_, m) => ({ id: `L${m + 1}`, done: false })),
      }));
      const plaque = floorPlate(floors, 'block');
      const imp = implantation(1, ['block'], undefined, [plaque]);
      const p = imp.parcelles[0];
      const parent = new THREE.Group();
      const bat = modules.building.create(THREE, { type: 'block' }, makeContext({ theme: 'light', quality: 'high', reducedMotion: true }, await chargeur.assetsPour(modules.building.meta)));
      bat.setState('structure', { floors });
      bat.root.position.set(...p.position);
      parent.add(bat.root);
      const sonde = mod.create(THREE, { height: 14 }, await ctxGrue('high'));
      sonde.root.position.set(...p.grue.position);
      sonde.root.rotation.y = p.grue.rotation;
      parent.add(sonde.root);
      const l = lieuxGrue(THREE, { grue: sonde.root, batiment: bat.root, autour: [bat.root], stock: p.grue.stock });
      sonde.root.removeFromParent();
      sonde.dispose();
      const hauteur = hauteurDecalee(Math.max(l.hauteur, hauteurGrue(n * 3 + 2.5)), []);
      const grue = mod.create(THREE, { height: hauteur }, await ctxGrue('high'));
      grue.root.position.set(...p.grue.position);
      grue.root.rotation.y = p.grue.rotation;
      parent.add(grue.root);
      grue.setState('lifting', l.data); // sans animation : la charge levee a la hauteur de passage, au-dessus d'une depose
      parent.updateMatrixWorld(true);
      const sommet = new THREE.Box3().setFromObject(bat.root).max.y;
      const fleche = new THREE.Box3().setFromObject(grue.root.getObjectByName('VEH_TOWER_CRANE_A_JIB')).min.y;
      const charge = new THREE.Box3().setFromObject(grue.root.getObjectByName('VEH_TOWER_CRANE_A_LOAD')).min.y;
      const cas = `${n} étages, plateau ${plaque.columns ?? plaque.nx}×${plaque.rows ?? plaque.ny}, mât de ${hauteur} m`;
      verifie(hauteur <= mod.meta.params.height.max, `crane : mât de ${hauteur} m au-delà de la fiche (${cas})`);
      verifie(fleche > sommet + 0.8, `crane : la flèche (${fleche.toFixed(2)} m) ne passe pas au-dessus de la tour (${sommet.toFixed(2)} m, ${cas})`);
      verifie(charge >= l.data.clearance - 0.01 && charge > sommet, `crane : la charge levée à ${charge.toFixed(2)} m, sous le passage (${l.data.clearance.toFixed(2)} m) ou la tour (${cas})`);
      plusHaut = Math.max(plusHaut, hauteur);
      grue.dispose();
      bat.dispose();
      essais++;
    }
  rapports.push(`grue : budget tenu de 6 à 103 m (au plus ${pire.high} triangles en haute, ${pire.low} en basse), le mât grimpe jusqu'à 103 m ; ${essais} tours de 1 à 30 étages, la flèche au-dessus du sommet (mât jusqu'à ${plusHaut} m)`);
}
for (const [nom, scenes] of Object.entries(sequences))
  for (const reducedMotion of [false, true]) {
    const quality = reducedMotion ? 'low' : 'high';
    let carte;
    try {
      carte = await creeCarte(THREE, { components: modules, chargeur, theme: 'light', quality, reducedMotion });
      let maxOuvriers = 0;
      for (const [i, scene] of scenes.entries()) {
        await carte.applique(scene);
        // vingt secondes de vie, par pas de 1/30 s
        for (let t = 0; t < 20 * 30; t++) carte.update(1 / 30);
        const c = carte.compte();
        maxOuvriers = Math.max(maxOuvriers, c.ouvriers);
        const lu = lisScene(scene, connus);
        verifie(c.ouvriers <= PLAFONDS[quality].carte, `${nom} ${i + 1} : ${c.ouvriers} ouvriers sur la carte`);
        verifie(lu.regime !== 'ferme' || c.ouvriers + c.usagers === 0, `${nom} ${i + 1} : du monde sur un chantier fermé`);
        verifie(c.personnes === c.agents + c.ouvriers + c.usagers, `${nom} ${i + 1} : ${c.personnes - c.agents - c.ouvriers - c.usagers} personne(s) restée(s) sur la carte`);
        verifie(c.chevauchements === 0, `${nom} ${i + 1} : ${c.chevauchements} paire(s) de personnes posées l'une sur l'autre`);
        for (const b of lu.batiments) {
          const voulue = ['structure', 'envelope'].includes(b.phase) || [...lu.elements.values()].some((e) => e.element === 'crane' && e.ancre === b.id);
          verifie(voulue === c.grues.includes(b.id), `${nom} ${i + 1} : la grue de ${b.id} ${voulue ? 'manque' : 'reste montée'} (phase ${b.phase})`);
        }
        verifie(c.agents === lu.personnages.length, `${nom} ${i + 1} : ${c.agents} agents posés pour ${lu.personnages.length} dans la scène`);
        // un clic sur un batiment le designe, a tous les stades : en fouille et en fondations, sa parcelle creusee est
        // sous le terrain, que le rayon traverse, comme les ouvriers qui s'y tiennent (carte.designe)
        carte.root.updateMatrixWorld(true);
        const visible = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
        carte.root.traverse((o) => {
          if (o.userData.component !== 'building' || !visible(o)) return;
          const centre = o.getWorldPosition(new THREE.Vector3());
          for (const [dx, dz] of [[0, 0], [2.5, 1.5], [-2.5, -1.5], [3, -2]]) {
            const vise = new THREE.Vector3(centre.x + dx, 0.05, centre.z + dz);
            const rayon = new THREE.Raycaster(vise.clone().sub(ISO.clone().multiplyScalar(60)), ISO);
            const h = carte.designe(rayon.intersectObject(carte.root, true).filter((x) => visible(x.object)).map((x) => x.object));
            // les gabarits posés sur ce batiment valent le batiment (la galerie ouvre l'etage de leur fiche)
            const t = h && carte.cible(h);
            const id = carte.cible(o)?.id;
            verifie(t && (t.element === 'building' || (t.element === 'survey-poles' && t.ancre === id)), `${nom} ${i + 1} : un clic sur le bâtiment en ${centre.x.toFixed(0)} touche ${h ? h.name || h.parent?.name || 'un objet sans nom' : 'rien'}`);
          }
        });
        for (const [zone, oui] of Object.entries(lu.zones)) if (oui) verifie(carte.cadres().find((z) => z.cle === zone).activee, `${nom} ${i + 1} : la zone ${zone} reste grise`);
        // un seul jeu de gabarits par parcelle : ceux des fiches a l'etude d'un batiment ont le meme volume, au meme endroit
        const gabarits = {};
        carte.root.traverse((o) => {
          if (o.userData.component !== 'survey-poles' || !visible(o)) return;
          const t = carte.cible(o);
          gabarits[t?.ancre] = (gabarits[t?.ancre] || 0) + 1;
        });
        for (const [b, n] of Object.entries(gabarits)) verifie(n === 1, `${nom} ${i + 1} : ${n} jeux de gabarits empilés sur ${b}`);
        // les decisions d'un meme lieu (decision de Pierre-Alain du 22 octobre 2026) : six panneaux au plus, en grille,
        // un badge chacun et le total sur le dernier au-dela ; aucun sur un autre, aucun sur le chemin des experts ni sur
        // une parcelle ; chacun cliquable de la camera
        for (const g of carte.panneaux()) {
          const ou = `${nom} ${i + 1} : ${g.element} à ${g.lieu}`;
          verifie(g.montres.length === Math.min(g.total, 6), `${ou} : ${g.montres.length} panneaux montrés pour ${g.total}`);
          const badges = g.montres.map((id) => g.badges[id]);
          // le dernier porte le reste (« +12 » pour 17) : les badges additionnes font le total
          verifie(badges.every((b, k) => b === (k === badges.length - 1 && g.total > 6 ? g.total - 5 : 1)) && badges.reduce((s, b) => s + b, 0) === g.total, `${ou} : badges ${badges.join(', ')} pour ${g.total} décisions`);
          verifie(g.reste === (g.total > 6 ? g.montres[5] : null), `${ou} : le panneau du reste est ${g.reste}`);
          const poses = [];
          carte.root.traverse((o) => {
            if (o.userData.component !== g.element || !visible(o)) return;
            const t = carte.cible(o);
            if (t && g.montres.includes(t.id)) poses.push([t.id, o]);
          });
          verifie(poses.length === g.montres.length, `${ou} : ${poses.length} panneaux posés pour ${g.montres.length} montrés`);
          for (const [id, o] of poses) {
            // piece par piece (le tableau, son poteau, son pied) : la boite d'ensemble deborde de ce qu'il occupe
            const pieces = (x) => { const l = []; x.traverse((m) => m.isMesh && visible(m) && l.push(new THREE.Box3().setFromObject(m).expandByScalar(-0.005))); return l; };
            const p1 = pieces(o);
            for (const [id2, o2] of poses) if (id2 > id) verifie(!pieces(o2).some((b2) => p1.some((b1) => b1.intersectsBox(b2))), `${ou} : ${id} et ${id2} l'un dans l'autre`);
            // le panneau fait 0,9 m de large ; la bande va du chemin des experts (x = 40,6, et l'epaule d'un passant) au
            // bord de la premiere parcelle (x = 43)
            if (g.lieu === 'panneau-feu-vert') verifie(o.position.x - 0.45 > 40.6 + 0.3 && o.position.x + 0.45 <= 43 + 1e-6, `${ou} : ${id} hors de la bande entre le chemin des experts et la parcelle (x = ${o.position.x.toFixed(2)})`);
            const vise = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
            const rayon = new THREE.Raycaster(vise.clone().sub(ISO.clone().multiplyScalar(60)), ISO);
            const h = carte.designe(rayon.intersectObject(carte.root, true).filter((x) => visible(x.object)).map((x) => x.object));
            const t = h && carte.cible(h);
            verifie(t && t.id === id, `${ou} : un clic sur ${id} touche ${t ? t.id : h ? h.name : 'rien'}`);
            verifie(carte.ancreElement(id) !== null, `${ou} : ${id} sans ancre de badge`);
          }
        }
      }
      // la vue en coupe (building-interior 2.0.0) s'ouvre et se ferme sur chaque etage de chaque batiment de la derniere
      // scene : une piece par lot, chaque agent de l'etage a la piece de son lot ou sur le palier
      const derniere = lisScene(scenes[scenes.length - 1], connus);
      let hautes = 0;
      for (const b of derniere.batiments)
        // l'etage d'une application existante (fiche nulle) ne se choisit pas, comme au selecteur d'etages
        for (const fiche of [undefined, ...(b.etages || []).map((e) => e.fiche).filter((f) => f !== null)]) {
          const ou = `${nom} : la vue en coupe de ${b.id}${fiche === undefined ? '' : ` (${fiche})`}`;
          verifie(await carte.ouvreCoupe(b.id, fiche), `${ou} ne s'ouvre pas`);
          const vue = carte.vueCoupe;
          const etage = (b.etages || []).find((e) => e.fiche === vue.fiche) || { pieces: [] };
          verifie(fiche === undefined || vue.fiche === fiche, `${ou} ouvre l'étage ${vue.fiche}`);
          verifie(vue.rooms.length === (etage.pieces || []).length && vue.rooms.every((r, k) => r.id === etage.pieces[k].lot), `${ou} : les pièces ne sont pas les lots`);
          for (const p of derniere.personnages.filter((x) => x.batiment === b.id && (x.etage ?? null) === vue.fiche)) {
            const voulue = (etage.pieces || []).findIndex((x) => x.lot === p.piece);
            verifie(vue.places[p.id] === (voulue >= 0 ? `room:${voulue + 1}` : 'palier'), `${ou} : ${p.id} est à ${vue.places[p.id]}`);
          }
          for (let t = 0; t < 60; t++) carte.update(1 / 30);
          verifie(carte.compte().chevauchements === 0, `${ou} : des personnes posées l'une sur l'autre`);
          verifie(!carte.compte().grues.includes(b.id), `${ou} : la grue de la parcelle reste au milieu de la vue`);
          // la coupe a la hauteur de son etage, dans le batiment en transparence, son etage cache (decision de
          // Pierre-Alain du 28 octobre 2026) ; refermee, plus aucune copie transparente
          const { batiment, interieur } = racinesCoupe(carte, b.id);
          const voiles = () => { let n = 0; batiment.traverse((o) => { if (o.isMesh && [].concat(o.material).some((m) => m.userData.voile)) n++; }); return n; };
          verifie(batiment.visible && voiles() > 0, `${ou} : le bâtiment n'est pas en transparence`);
          if (vue.etage) {
            const groupe = batiment.getObjectByName(`FLOOR_${vue.etage}`);
            carte.root.updateMatrixWorld(true);
            const bas = new THREE.Box3().setFromObject(groupe).min.y;
            const y = interieur.getWorldPosition(new THREE.Vector3()).y;
            verifie(!groupe.visible && Math.abs(bas - y) < 0.6, `${ou} : la coupe est à ${y.toFixed(2)} m, l'étage ${vue.etage} à ${bas.toFixed(2)} m`);
            if (vue.etage > 1) hautes++;
          }
          // building-interior 3.0.0 : la coupe a le plateau de son batiment, une case de 3 x 3 m par piece ; sa dalle
          // (rives comprises) a les cotes de celle du batiment
          const { nx, ny } = floorPlate(b.floors, b.type);
          const cases = interieur.children.filter((g) => /^(ROOM|CELL)_/.test(g.name) && g.children.length).length;
          const dalle = new THREE.Box3();
          interieur.traverse((o) => { if (o.isMesh && o.name.startsWith('BLD_KIT_A_SLAB')) dalle.expandByObject(o); });
          const cotes = dalle.isEmpty() ? null : [dalle.max.x - dalle.min.x, dalle.max.z - dalle.min.z].sort((a, c) => a - c);
          const voulues = [nx * 3 + 0.4, ny * 3 + 0.4].sort((a, c) => a - c);
          verifie(cases === nx * ny, `${ou} : ${cases} cases pour un plateau de ${nx} × ${ny}`);
          verifie(!cotes || cotes.every((v, k) => Math.abs(v - voulues[k]) < 0.05), `${ou} : la dalle de la coupe fait ${cotes?.map((v) => v.toFixed(2)).join(' × ')} m, le plateau ${voulues.join(' × ')} m`);
          carte.fermeCoupe();
          for (let t = 0; t < 90; t++) carte.update(1 / 30);
          verifie(carte.coupe === null, `${ou} ne se ferme pas`);
          verifie(voiles() === 0, `${ou} : des matériaux transparents restent après la fermeture`);
        }
      if (nom === 'trois-applications') verifie(hautes > 0, `${nom} : aucune coupe ouverte au-dessus du rez`);
      if (nom === 'trois-applications' && !reducedMotion) rapports.push(`coupe à son étage : ${hautes} étages au-dessus du rez ouverts à leur hauteur, bâtiment en transparence, matériaux rendus à la fermeture`);
      // la fiche du catalogue : trois-applications, etape 7, Julie est dans la piece L1 de « Saisir un constat hors ligne »
      if (nom === 'trois-applications') {
        await carte.applique(scenes[6], { actions: false });
        verifie(await carte.ouvreCoupe('terrain'), `${nom} 7 : la vue en coupe du terrain ne s'ouvre pas`);
        const vue = carte.vueCoupe;
        verifie(/^\d+-saisir-un-constat-hors-ligne$/.test(vue.fiche || ''), `${nom} 7 : la coupe ouvre ${vue.fiche}`);
        verifie(vue.rooms[0]?.id === 'L1' && vue.rooms[0]?.state === 'building', `${nom} 7 : la pièce L1 n'est pas en travaux (${JSON.stringify(vue.rooms[0])})`);
        verifie(vue.places['developpeur-base'] === 'room:1', `${nom} 7 : Julie est à ${vue.places['developpeur-base']}, pas dans la pièce L1`);
        verifie(vue.places.helene === 'palier' && vue.places['expert-securite'] === 'palier', `${nom} 7 : Hélène et Sarah ne sont pas sur le palier`);
        carte.fermeCoupe();
        for (let t = 0; t < 90; t++) carte.update(1 / 30);
        // deux ouvertures qui se chevauchent (un double clic pendant le chargement) : une seule coupe, rien d'orphelin
        const avant = carte.root.children[0].children.length;
        const [o1, o2] = await Promise.all([carte.ouvreCoupe('terrain'), carte.ouvreCoupe('bureau')]);
        verifie(!o1 && o2 && carte.coupe === 'bureau', `${nom} 7 : deux ouvertures qui se chevauchent donnent ${o1}, ${o2}, ${carte.coupe}`);
        carte.fermeCoupe();
        for (let t = 0; t < 90; t++) carte.update(1 / 30);
        verifie(carte.root.children[0].children.length === avant, `${nom} 7 : une coupe orpheline reste sur la carte`);
      }
      rapports.push(`${nom} (${reducedMotion ? 'sans animation, basse' : 'haute'}) : ${scenes.length} scènes, jusqu'à ${maxOuvriers} ouvriers${carte.signalements.length ? ', signalé : ' + carte.signalements.join(' ; ') : ''}`);
      carte.dispose();
    } catch (e) {
      verifie(false, `${nom} : la carte échoue : ${e.stack}`);
    }
  }

let rapportCamion = '';
// --- Le camion de livraison : il roule benne baissee, la leve une fois gare, et repart (le pas « Emma a fini son lot »,
// celui d'avant, puis retour) ; les pas se trouvent par leur titre : GDC en ajoute d'une version a l'autre
{
  const pt = sequences['projet-type'];
  const iCamion = pt.findIndex((s) => s.titre === 'Emma a fini son lot');
  const [s15, s16] = [pt[iCamion - 1], pt[iCamion]];
  const carte = await creeCarte(THREE, { components: modules, chargeur, theme: 'light', quality: 'high', reducedMotion: false });
  await carte.applique(s15);
  await carte.applique(s16);
  let vu = false;
  // son allure (decision de Pierre-Alain du 23 octobre 2026) : au pas dans l'enceinte (4 m/s au plus), 6 m/s au plus
  // sur la route, garé en moins de 20 s
  const lu16 = lisScene(s16, connus);
  const enceinte = implantation(lu16.applications, lu16.types).chantier;
  const camion = () => { let c = null; carte.root.traverse((o) => { if (!c && o.userData.component === 'delivery-truck') c = o; }); return c; };
  let avant = null;
  let pireEnceinte = 0;
  let pireRoute = 0;
  let gare = null;
  for (let t = 0; t < 30 * 30; t++) {
    carte.update(1 / 30);
    const o = camion();
    if (o) {
      const p = o.position.clone();
      if (avant) {
        const v = Math.hypot(p.x - avant.x, p.z - avant.z) * 30;
        const dedans = p.x > enceinte.x[0] && p.x < enceinte.x[1] && p.z > enceinte.z[0] && p.z < enceinte.z[1];
        if (dedans) pireEnceinte = Math.max(pireEnceinte, v);
        else pireRoute = Math.max(pireRoute, v);
      }
      avant = p;
    }
    for (const c of carte.compte().camions) {
      if (c.roule) vu = true;
      if (vu && !c.roule && gare === null) gare = t / 30;
      verifie(!c.roule || c.state !== 'arriving', `camion : il vide sa benne en roulant (t = ${(t / 30).toFixed(1)} s)`);
    }
  }
  verifie(pireEnceinte <= 4.05, `camion : ${pireEnceinte.toFixed(1)} m/s dans l'enceinte, plus que le pas (4 m/s)`);
  verifie(pireRoute <= 6.05, `camion : ${pireRoute.toFixed(1)} m/s sur la route, plus que 6 m/s`);
  verifie(gare !== null && gare < 20, `camion : garé en ${gare} s`);
  rapportCamion = `camion : au pas dans l'enceinte (${pireEnceinte.toFixed(1)} m/s au plus), ${pireRoute.toFixed(1)} m/s au plus sur la route, garé en ${gare?.toFixed(1)} s ; benne baissée en roulant, levée à l'arrêt, retiré après son départ`;
  verifie(vu, 'camion : il ne roule pas pour arriver');
  verifie(carte.compte().camions.length === 1 && carte.compte().camions[0].state === 'arriving', 'camion : garé, il ne lève pas sa benne');
  await carte.applique({ ...s15, actions: [{ ts: 'z', action: 'disparait', element: 'delivery-truck', id: 'camion-001-cloturer-un-audit' }] });
  for (let t = 0; t < 20 * 30; t++) {
    carte.update(1 / 30);
    for (const c of carte.compte().camions) verifie(!c.roule || c.state === 'idle', `camion : il repart benne levée (t = ${(t / 30).toFixed(1)} s)`);
  }
  verifie(carte.compte().camions.length === 0, 'camion : il ne repart pas');
  carte.dispose();
}

rapportCamionPlus();
// --- L'heure reelle (fiche day-night) : le soleil de Fribourg sur l'heure du poste, le jour inchange, la nuit et ses
// fenetres (blanc chaud, faible et franche, jamais une couleur d'etat), sans reseau
{
  const heureUTC = (ms) => new Date(ms).getUTCHours() + new Date(ms).getUTCMinutes() / 60;
  // les ephemerides de Berne decalees d'une minute vers l'ouest, en UTC ; a 5 minutes pres
  for (const [date, lever, coucher] of [['2026-06-21', 3 + 36 / 60, 19 + 29 / 60], ['2026-12-21', 7 + 14 / 60, 15 + 47 / 60]]) {
    const s = soleilDe(new Date(`${date}T12:00:00Z`));
    verifie(Math.abs(heureUTC(s.lever) - lever) < 5 / 60, `heure : lever du ${date} à Fribourg faux (${heureUTC(s.lever).toFixed(2)} h UTC)`);
    verifie(Math.abs(heureUTC(s.coucher) - coucher) < 5 / 60, `heure : coucher du ${date} à Fribourg faux (${heureUTC(s.coucher).toFixed(2)} h UTC)`);
    // l'aube et le crepuscule : 30 minutes, centres sur le lever et le coucher
    const min = 60000;
    const m = (t) => momentDe(t);
    verifie(m(s.lever - 16 * min).moment === 'nuit' && m(s.lever - 14 * min).moment === 'aube', `heure : l'aube du ${date} ne commence pas 15 minutes avant le lever`);
    verifie(Math.abs(m(s.lever).jour - 0.5) < 0.01, `heure : au lever du ${date}, la lumière n'est pas à mi-chemin`);
    verifie(m(s.lever + 14 * min).moment === 'aube' && m(s.lever + 16 * min).moment === 'jour', `heure : l'aube du ${date} ne finit pas 15 minutes après le lever`);
    verifie(m(s.coucher - 16 * min).moment === 'jour' && m(s.coucher - 14 * min).moment === 'crepuscule', `heure : le crépuscule du ${date} ne commence pas 15 minutes avant le coucher`);
    verifie(Math.abs(m(s.coucher).jour - 0.5) < 0.01 && m(s.coucher + 16 * min).moment === 'nuit', `heure : le crépuscule du ${date} n'est pas centré sur le coucher`);
  }
  // le jour, rien ne change : la recette du haut de lumiere.json, le fond de l'interface, aucune fenetre allumee
  for (const theme of ['light', 'dark']) {
    const j = recetteDe(1, theme);
    verifie(JSON.stringify([j.ciel, j.soleil.couleur, j.soleil.intensite, j.soleil.position]) === JSON.stringify([lumiere.ciel, lumiere.soleil.couleur, lumiere.soleil.intensite, lumiere.soleil.position]), `heure : de jour, la lumière n'est pas la recette du jour (${theme})`);
    verifie(j.fond === palette.interface[theme].background && j.fenetres === 0, `heure : de jour, le fond ou les fenêtres changent (${theme})`);
    const n = recetteDe(0, theme);
    verifie(n.ciel.intensite === lumiere.nuit.ciel.intensite && n.soleil.intensite === lumiere.nuit.lune.intensite && n.fond === lumiere.nuit.fond[theme] && n.fenetres === 1, `heure : la nuit n'est pas la recette de nuit (${theme})`);
    verifie(JSON.stringify(n.soleil.position) === JSON.stringify(lumiere.soleil.position), 'heure : la lune ne vient pas de la direction du soleil');
  }
  // blanc chaud, clair, loin de toute couleur d'etat
  const rvb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  for (const [nom, h] of [['fenetres', lumiere.fenetres.couleur], ['projecteurs', lumiere.projecteurs.couleur]]) {
    const [r, g, b] = rvb(h);
    verifie(0.2126 * r + 0.7152 * g + 0.0722 * b > 200, `heure : la lumière des ${nom} n'est pas claire (${h})`);
    for (const [etat, e] of Object.entries(palette.etat))
      verifie(Math.hypot(...rvb(e).map((c, i) => c - [r, g, b][i])) > 80, `heure : la lumière des ${nom} ressemble à l'état ${etat} (${h})`);
  }
  verifie(rvb(lumiere.fenetres.couleur).every((c, i, a) => i === 0 || c <= a[i - 1]), 'heure : les fenêtres ne sont pas d\'un blanc chaud');
  verifie(lumiere.fenetres.faible < lumiere.fenetres.franche, 'heure : la lumière franche n\'est pas plus forte que la faible');
  const source = await readFile(join(ROOT, 'src/ville/heure.js'), 'utf8');
  verifie(!/\bfetch\b|XMLHttpRequest|WebSocket|localStorage|navigator\./.test(source), "heure : l'heure ne vient pas du seul poste (réseau ou stockage)");

  // la carte : la nuit, les vitres des bureaux et du batiment habite faiblement, franchement la ou l'on travaille ;
  // le jour, les vitres d'origine ; ses lumieres suivent l'heure
  const compteVitres = (carte) => {
    const n = { faible: 0, franche: 0, conteneur: 0 };
    carte.root.traverse((o) => {
      if (!o.isMesh || !/^MAT_GLASS/.test(o.material.name)) return;
      const v = o.material.userData.vitre;
      if (v) n[v]++;
      let r = o;
      while (r && !r.userData.component) r = r.parent;
      if (v && r && r.userData.component === 'site-container') n.conteneur++;
      if (v && !/office|container|building/.test(r?.userData.component)) n.ailleurs = true;
    });
    return n;
  };
  const ciel = new THREE.HemisphereLight();
  const soleil = new THREE.DirectionalLight();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color();
  const s8 = sequences['trois-applications'][7];
  const carte = await creeCarte(THREE, { components: modules, chargeur, theme: 'light', quality: 'high', reducedMotion: true, heure: 'nuit', lumieres: { ciel, soleil, scene } });
  await carte.applique(s8);
  let n = compteVitres(carte);
  verifie(n.faible > 0 && n.franche > 0 && !n.ailleurs, `heure : la nuit, les fenêtres ne s'allument pas comme prévu (${JSON.stringify(n)})`);
  verifie(n.conteneur === 0, 'heure : un conteneur vide est éclairé');
  verifie(ciel.intensity === lumiere.nuit.ciel.intensite && soleil.intensity === lumiere.nuit.lune.intensite && '#' + scene.background.getHexString().toUpperCase() === lumiere.nuit.fond.light, 'heure : la carte ne règle pas les lumières de la nuit');
  verifie(carte.heure.moment === 'nuit', 'heure : la carte ne dit pas la nuit');
  // un agent dans un conteneur : ses fenetres s'allument franchement
  await carte.applique({ ...s8, actions: [], elements: [...s8.elements, { element: 'character', id: 'gardien', role: 'concierge', nom: 'Le concierge', etat: 'idle', lieu: 'cabane-garantie' }] }, { actions: false });
  verifie(compteVitres(carte).conteneur > 0, "heure : le conteneur où se trouve un agent reste éteint");
  // un batiment qui s'en va n'abandonne aucune copie de vitre : toute copie qui n'est plus sur un maillage est liberee
  const vues = new Set();
  const liberees = new Set();
  const releve = () => carte.root.traverse((o) => {
    const v = o.isMesh && o.material.userData.vitre && o.material;
    if (v && !vues.has(v)) { vues.add(v); v.addEventListener('dispose', () => liberees.add(v)); }
  });
  releve();
  const sansBatiments = { ...s8, actions: [], elements: s8.elements.filter((e) => e.element !== 'building' || e.id === 'terrain') };
  for (const sc of [sansBatiments, s8, sansBatiments, s8]) { await carte.applique(sc, { actions: false }); releve(); }
  const servies = new Set();
  carte.root.traverse((o) => { if (o.isMesh && o.material.userData.vitre) servies.add(o.material); });
  const orphelines = [...vues].filter((v) => !servies.has(v) && !liberees.has(v)).length;
  verifie(orphelines === 0, `heure : ${orphelines} copie(s) de vitre orpheline(s) après le retrait de bâtiments`);
  // le jour : les vitres d'origine, la recette du jour
  verifie(carte.regleHeure('jour'), 'heure : passer au jour ne demande pas de redessiner');
  let ecart = 0;
  carte.root.traverse((o) => {
    const v = o.isMesh && o.material.userData.vitre && o.material;
    if (v && (!v.color.equals(v.userData.origine.color) || v.emissive.getHex() !== new THREE.Color(v.userData.origine.emissive).multiplyScalar(v.userData.origine.emissiveIntensity).getHex())) ecart++;
  });
  verifie(ecart === 0, `heure : de jour, ${ecart} vitre(s) ne sont pas celles d'origine`);
  verifie(ciel.intensity === lumiere.ciel.intensite && soleil.intensity === lumiere.soleil.intensite && soleil.color.getHexString().toUpperCase() === lumiere.soleil.couleur.slice(1), 'heure : de jour, les lumières ne sont pas la recette du jour');
  carte.dispose();
  // une zone jamais activee reste eteinte (projet-type 1, le terrain : les bureaux sont gris)
  const grise = await creeCarte(THREE, { components: modules, chargeur, theme: 'dark', quality: 'low', reducedMotion: true, heure: 'nuit' });
  await grise.applique(sequences['projet-type'][0]);
  n = compteVitres(grise);
  verifie(n.faible + n.franche === 0, 'heure : une zone jamais activée a des fenêtres éclairées');
  grise.dispose();
  // l'heure du poste : la carte suit l'horloge, par pas, et ne redessine que quand la lumiere change
  const s = soleilDe(new Date('2026-10-22T12:00:00Z'));
  let t = s.coucher - 20 * 60000;
  const suit = await creeCarte(THREE, { components: modules, chargeur, theme: 'light', quality: 'low', reducedMotion: true, maintenant: () => t });
  verifie(suit.heure.moment === 'jour', "heure : la carte ne suit pas l'heure du poste (jour)");
  verifie(!suit.update(25), 'heure : la carte redessine de jour sans changement');
  t = s.coucher;
  verifie(suit.update(25) && suit.heure.moment === 'crepuscule' && Math.abs(suit.recette().fenetres - 0.5) < 0.02, "heure : la carte ne suit pas le crépuscule");
  t = s.coucher + 3 * 3600000;
  suit.update(25);
  verifie(suit.heure.moment === 'nuit' && suit.recette().fenetres === 1, "heure : la carte ne passe pas à la nuit");
  // un moment choisi tombe au prochain passage, puis la carte reprend l'heure reelle
  t = s.coucher + 3 * 3600000; // la nuit
  verifie(suit.regleHeure('jour') && suit.heure.moment === 'jour', "heure : le choix du jour n'est pas posé");
  let h = suit.horaire();
  verifie(h.mode === 'jour' && h.moment === 'nuit' && h.fin === h.prochain.instant && h.prochain.moment === 'aube', `heure : l'horaire d'un choix est faux (${JSON.stringify({ mode: h.mode, moment: h.moment, prochain: h.prochain?.moment })})`);
  t = h.fin - 60000;
  suit.update(25);
  verifie(suit.heure.moment === 'jour', 'heure : le choix tombe avant le prochain passage');
  t = h.fin + 60000;
  suit.update(25);
  verifie(suit.horaire().mode === 'auto' && suit.heure.moment === 'aube', "heure : le choix ne tombe pas au prochain passage");
  // un choix echu se dit en auto tout de suite, et la lumiere suit des le prochain update
  suit.regleHeure('nuit');
  t = suit.horaire().fin + 1000;
  verifie(suit.horaire().mode === 'auto' && suit.update(1 / 60) && suit.heure.moment !== 'nuit', "heure : un choix échu ne retombe pas tout de suite");
  // un moment inconnu (auto non traduit, par exemple) reprend l'heure reelle et se signale
  suit.regleHeure('auto');
  verifie(suit.horaire().mode === 'auto' && suit.signalements.some((m) => /moment auto inconnu/.test(m)), "heure : un moment inconnu n'est ni repris ni signalé");
  verifie(suit.regleHeure('nuit', { garde: true }) && suit.horaire().fin === null, 'heure : un moment gardé a une fin');
  suit.regleHeure(null);
  verifie(suit.horaire().mode === 'auto', "heure : regleHeure(null) ne revient pas à l'heure réelle");
  const p = passages(s.lever);
  verifie(p.every((x, i) => i === 0 || x.instant > p[i - 1].instant) && p.length === 12, 'heure : les passages ne se suivent pas');
  suit.dispose();
  rapports.push(`heure réelle : Fribourg le 22 octobre 2026, lever ${new Date(s.lever).toISOString().slice(11, 16)} et coucher ${new Date(s.coucher).toISOString().slice(11, 16)} UTC ; la nuit, fenêtres faibles et franches vérifiées`);
}

// --- Les projecteurs (floodlight, plan D-2, puis V-2) : pour chaque densite, dans leur zone (le chantier dans sa
// cloture), hors des voies, des clotures et des parcelles ; allumes la nuit en regime ouvert dans une zone en couleur,
// eteints sinon (constat D-2)
{
  const LEST = 0.57; // le demi-lest de 0,80 m, en diagonale
  const auSegment = (x, z, A, B) => {
    const t = Math.max(0, Math.min(1, ((x - A.x) * (B.x - A.x) + (z - A.z) * (B.z - A.z)) / ((B.x - A.x) ** 2 + (B.z - A.z) ** 2 || 1)));
    return Math.hypot(A.x + t * (B.x - A.x) - x, A.z + t * (B.z - A.z) - z);
  };
  for (const densite of ['sobre', 'moyenne', 'dense'])
    for (const types of [null, ['house'], ['hall'], ['block', 'hall'], ['house', 'house', 'house'], ['hall', 'hall', 'hall', 'house'], ['block', 'house', 'block', 'house', 'block', 'house', 'block', 'house'], ['house', 'house', 'house', 'house', 'house']])
      for (const apps of types ? [types.length] : [1, 2, 3, 4, 5, 8]) {
        const imp = implantation(apps, types, densite);
        const nom = `projecteurs ${densite}, ${apps} app.${types ? ' ' + types.join(',') : ''}`;
        // un projecteur de plus entre deux parcelles voisines au fond, celles de la premiere rangee seulement
        const attendu = { sobre: 8, moyenne: 11 + Math.min(apps, 4) - 1, dense: 13 + Math.min(apps, 4) - 1 }[densite];
        verifie(imp.projecteurs.length === attendu, `${nom} : ${imp.projecteurs.length} projecteurs au lieu de ${attendu}`);
        for (const p of imp.projecteurs) {
          const [x, , z] = p.position;
          const c = imp.cadres[p.zone];
          // dans sa zone, assez loin du bord pour que le lest tourne et laisse sa place aux plots d'une cloture
          verifie(c && zoneDe(imp.cadres, x, z) === p.zone && x - LEST - 0.15 >= c.x[0] && x + LEST + 0.15 <= c.x[1] && z - LEST - 0.15 >= c.z[0] && z + LEST + 0.15 <= c.z[1], `${nom} : ${p.cle} hors de sa zone ${p.zone}`);
          for (const [a, b] of imp.voies.segments)
            verifie(auSegment(x, z, imp.voies.points[a], imp.voies.points[b]) >= 0.7, `${nom} : la voie ${a} → ${b} passe sur ${p.cle}`);
          // les clotures : leurs plots debordent de 0,15 m de leur ligne
          for (const cl of imp.clotures) {
            const L = cl.params.length / 2;
            const [A, B] = Math.abs(Math.sin(cl.rotation)) > 0.5
              ? [{ x: cl.position[0], z: cl.position[2] - L }, { x: cl.position[0], z: cl.position[2] + L }]
              : [{ x: cl.position[0] - L, z: cl.position[2] }, { x: cl.position[0] + L, z: cl.position[2] }];
            verifie(auSegment(x, z, A, B) >= LEST + 0.15, `${nom} : ${p.cle} touche la clôture ${cl.cle}`);
          }
          for (const pa of imp.parcelles) {
            const demi = (types ? SOCLES[types[pa.index]] : PAS_PARCELLE - 2) / 2;
            verifie(Math.abs(x - pa.position[0]) >= demi + LEST || z + LEST <= 31 || z - LEST >= 43, `${nom} : ${p.cle} sur la parcelle ${pa.index + 1}`);
          }
        }
      }
  const allumes = (carte) => {
    let n = 0;
    carte.root.traverse((o) => { if (o.isMesh && o.material.name === 'FLOODLIGHT_LENS_LIT') n++; });
    return n;
  };
  // ceux qui doivent s'allumer la nuit en regime ouvert : ceux des zones en couleur
  const attendus = (carte, scene) => {
    const lu = lisScene(scene, connus);
    const actives = new Set(carte.cadres().filter((z) => z.activee).map((z) => z.cle));
    return implantation(lu.applications, lu.types).projecteurs.filter((p) => actives.has(p.zone)).length;
  };
  const s8 = sequences['trois-applications'][7];
  const nuit = await creeCarte(THREE, { components: modules, chargeur, theme: 'light', quality: 'high', reducedMotion: true, heure: 'nuit' });
  await nuit.applique(s8);
  const n8 = attendus(nuit, s8);
  verifie(n8 > 4 && allumes(nuit) === n8, `projecteurs : la nuit, en régime ouvert, ${allumes(nuit)} allumé(s) au lieu de ${n8}`);
  nuit.regleHeure('jour');
  verifie(allumes(nuit) === 0, 'projecteurs : allumés de jour');
  nuit.regleHeure('nuit');
  await nuit.applique({ ...s8, chantier: { ...s8.chantier, regime: 'pause' } }, { actions: false });
  verifie(allumes(nuit) === 0, 'projecteurs : allumés pendant la pause');
  nuit.dispose();
  // projet-type 2 : ouvert, seuls les bureaux ont servi ; ceux des bureaux s'allument, ceux du chantier encore gris non
  const gris = await creeCarte(THREE, { components: modules, chargeur, theme: 'light', quality: 'low', reducedMotion: true, heure: 'nuit' });
  await gris.applique(sequences['projet-type'][1]);
  const n2 = attendus(gris, sequences['projet-type'][1]);
  verifie(allumes(gris) === n2 && !gris.cadres().find((z) => z.cle === 'chantier').activee, `projecteurs : dans une carte au chantier encore gris, ${allumes(gris)} allumé(s) au lieu de ${n2}`);
  gris.dispose();
  rapports.push(`projecteurs : ${implantation(3, ['house', 'block', 'hall']).projecteurs.length} pour trois applications (densité ${DENSITE_PROJECTEURS}), dans leur zone, hors des voies, des clôtures et des parcelles ; allumés la nuit en régime ouvert dans une zone en couleur`);
}

// --- Le portail (site-fence 1.1.0) : ferme en regime ferme et en pause, ouvert en regime ouvert ; une rotation douce
// de 1,5 s, une fois, puis plus rien a dessiner ; sans portail, closed ne change rien
{
  // l'ouverture d'un vantail : 1 quand il est tourne vers l'interieur (90 degres), 0 dans l'axe de la cloture
  const ouverture = (im, i) => {
    const m = new THREE.Matrix4();
    im.getMatrixAt(i, m);
    const x = new THREE.Vector3().setFromMatrixColumn(m, 0).normalize();
    return Math.abs(x.z);
  };
  const vantaux = (root) => {
    const v = [];
    root.traverse((o) => { if (o.isInstancedMesh && o.name.startsWith('ENV_SITE_FENCE_A_GATE_LEAF_FRAME')) for (let i = 0; i < o.count; i++) v.push(ouverture(o, i)); });
    return v;
  };
  const portails = (carte) => {
    const v = [];
    carte.root.traverse((o) => { if (o.userData.component === 'site-fence') v.push(...vantaux(o)); });
    return v;
  };
  const s8 = sequences['trois-applications'][7];
  const carte = await creeCarte(THREE, { components: modules, chargeur, theme: 'light', quality: 'high', reducedMotion: false });
  await carte.applique(s8);
  verifie(portails(carte).length === 4 && portails(carte).every((o) => o > 0.999), `portail : en régime ouvert, des vantaux fermés (${portails(carte).map((o) => o.toFixed(2))})`);
  for (const regime of ['pause', 'ferme']) {
    await carte.applique({ ...s8, chantier: { ...s8.chantier, regime } }, { actions: false });
    verifie(portails(carte).every((o) => o < 0.001), `portail : en régime ${regime}, posé tel quel, des vantaux ouverts (${portails(carte).map((o) => o.toFixed(2))})`);
    await carte.applique(s8, { actions: false });
  }
  carte.dispose();
  // le composant seul : la rotation, aller et retour, avec et sans animation
  const mod = modules['site-fence'];
  const assets = await chargeur.assetsPour(mod.meta);
  const anime = mod.create(THREE, { length: 12, gate: true }, makeContext({ quality: 'high' }, assets));
  anime.setState('closed');
  let t = 0;
  while (anime.update(1 / 60)) t += 1 / 60;
  verifie(Math.abs(t - 1.5) < 0.05 && vantaux(anime.root).every((o) => o < 0.001) && anime.update(1 / 60) === false, `portail : la fermeture dure ${t.toFixed(2)} s au lieu de 1,5 s, ou ne finit pas fermée`);
  anime.setState('default');
  anime.update(0.75);
  const milieu = vantaux(anime.root);
  verifie(milieu.every((o) => o > 0.6 && o < 0.8), `portail : à mi-course, les vantaux ne sont pas à 45 degrés (${milieu.map((o) => o.toFixed(2))})`);
  anime.dispose();
  const fixe = mod.create(THREE, { length: 12, gate: true }, makeContext({ quality: 'low', reducedMotion: true }, assets));
  fixe.setState('closed');
  verifie(vantaux(fixe.root).every((o) => o < 0.001) && fixe.update(1 / 60) === false, 'portail : avec moins d\'animations, closed ne pose pas directement les vantaux fermés');
  fixe.dispose();
  const sans = mod.create(THREE, { length: 12, gate: false }, makeContext({ quality: 'high' }, assets));
  sans.setState('closed');
  verifie(sans.update(1 / 60) === false, 'portail : sans gate, closed anime quelque chose');
  sans.dispose();
  rapports.push('portail : fermé en régime fermé et en pause, ouvert en régime ouvert ; rotation de 1,5 s, une fois, directe avec moins d\'animations ; sans portail, closed ne change rien');
}

// --- La flotte des voitures (city-car, decision de Pierre-Alain du 24 octobre 2026) : un composant pour toute la flotte,
// 5 appels de dessin (5 InstancedMesh), aucune ombre portee ; 2 voitures au plus en basse ; une voiture absente de
// data.cars est cachee ; driving fait tourner les roues des voitures moving, parked et reducedMotion rien
{
  const mod = modules['city-car'];
  const assets = await chargeur.assetsPour(mod.meta);
  const flotte = (o) => { const ims = []; o.root.traverse((x) => { if (x.isInstancedMesh) ims.push(x); }); return ims; };
  const haute = mod.create(THREE, { count: 6 }, makeContext({ quality: 'high' }, assets));
  const ims = flotte(haute);
  verifie(ims.length === 5 && ims.every((x) => !x.castShadow), `voitures : ${ims.length} InstancedMesh au lieu de 5, ou une ombre portée`);
  const cars = [{ x: 0, z: 0, heading: 0, color: 'a', moving: true }, { x: 5, z: 0, heading: Math.PI / 2, color: 'c', moving: false }];
  haute.setState('driving', { cars, lights: true });
  const corps = ims.find((x) => x.name.endsWith('BODY'));
  const roues = ims.find((x) => x.name.endsWith('WHEELS'));
  verifie(corps.count === 2 && roues.count === 8, `voitures : ${corps.count} voitures montrées pour 2 dans data.cars`);
  const m0 = new THREE.Matrix4(), m1 = new THREE.Matrix4();
  roues.getMatrixAt(0, m0); roues.getMatrixAt(4, m1);
  const avant0 = m0.clone(), avant1 = m1.clone();
  verifie(haute.update(0.1) === true, 'voitures : driving ne demande pas d\'image');
  roues.getMatrixAt(0, m0); roues.getMatrixAt(4, m1);
  verifie(!m0.equals(avant0) && m1.equals(avant1), 'voitures : les roues de la voiture qui roule ne tournent pas, ou celles de la voiture arrêtée tournent');
  haute.setState('parked', {});
  verifie(haute.update(0.1) === false, 'voitures : parked demande une image');
  haute.dispose();
  const basse = mod.create(THREE, { count: 6 }, makeContext({ quality: 'low' }, assets));
  basse.setState('driving', {});
  verifie(flotte(basse).find((x) => x.name.endsWith('BODY')).count === 2, 'voitures : plus de 2 en qualité basse');
  basse.dispose();
  const fixe = mod.create(THREE, { count: 3 }, makeContext({ quality: 'high', reducedMotion: true }, assets));
  fixe.setState('driving', {});
  verifie(fixe.update(0.1) === false, 'voitures : avec moins d\'animations, les roues tournent');
  fixe.dispose();
  rapports.push('voitures : une flotte en 5 InstancedMesh, sans ombre portée ; 2 au plus en basse ; une voiture absente de data.cars est cachée ; seules les roues des voitures qui roulent tournent ; immobiles garées ou avec moins d\'animations');
}

// --- Le cabanon de la fete (party-shed, lot G8) : pres de la zone des transformations, hors des voies et des lieux, en
// couleur meme dans une zone grise ; la fete en pause, ferme sinon ; son ancre gather au point de rassemblement. Joue,
// le portail reste ouvert tant que l'equipe passe vers le cabanon, puis se ferme
{
  const imp = implantation(3, ['house', 'block', 'hall']);
  const fete = imp.decor.find((d) => d.id === 'party-shed');
  const T = imp.cadres.transformations;
  const [x, , z] = fete.position;
  verifie(x - 2.35 >= T.x[0] && x + 2.6 <= T.x[1] && z - 1.75 >= T.z[0] && z + 1.75 <= T.z[1], 'cabanon : hors de la zone des transformations');
  for (const l of Object.values(imp.lieux))
    verifie(Math.abs(l.position[0] - x) > 5 || Math.abs(l.position[2] - z) > 4.5, `cabanon : sur le lieu ${l.id}`);
  const cabanon = (carte) => {
    let r = null;
    carte.root.traverse((o) => { if (!r && o.userData.component === 'party-shed') r = o; });
    return r;
  };
  const allume = (root) => {
    let n = 0;
    root.traverse((o) => { if (o.isInstancedMesh && /LANTERN_LIT|SPOTS|NOTES/.test(o.name) && o.parent) n++; });
    return n;
  };
  const gris = (root) => {
    let n = 0;
    root.traverse((o) => { if (o.isMesh && [].concat(o.material).some((m) => m.userData?.gris)) n++; });
    return n;
  };
  const s8 = sequences['trois-applications'][7];
  const pauseDe = (s) => ({ ...s, chantier: { ...s.chantier, regime: 'pause' } });
  const carte = await creeCarte(THREE, { components: modules, chargeur, theme: 'light', quality: 'high', reducedMotion: false });
  await carte.applique(sequences['projet-type'][0]); // zones encore grises
  const r = cabanon(carte);
  verifie(r && gris(r) === 0, 'cabanon : grisé avec la zone des transformations');
  verifie(r && allume(r) === 0, 'cabanon : en fête hors de la pause');
  await carte.applique(s8, { actions: false });
  verifie(allume(cabanon(carte)) === 0, 'cabanon : en fête en régime ouvert');
  await carte.applique(pauseDe(s8), { actions: false });
  verifie(allume(cabanon(carte)) === 5, `cabanon : posé en pause, pas en fête (${allume(cabanon(carte))} pièces allumées sur 5)`);
  const g = new THREE.Vector3();
  cabanon(carte).parent.updateMatrixWorld(true);
  const inst = cabanon(carte);
  const ancre = inst.getObjectByName('ANCHOR_GATHER').getWorldPosition(g);
  inst.parent.worldToLocal(ancre);
  verifie(Math.hypot(ancre.x - imp.points.rassemblement[0], ancre.z - imp.points.rassemblement[1]) < 0.3, `cabanon : l'ancre gather (${ancre.x.toFixed(2)}, ${ancre.z.toFixed(2)}) loin du point de rassemblement`);
  carte.dispose();
  // joue : de ouvert a pause, sur une carte neuve (les ouvriers a leur poste), le portail attend que l'equipe soit passee
  const joue = await creeCarte(THREE, { components: modules, chargeur, theme: 'light', quality: 'high', reducedMotion: false });
  await joue.applique(s8);
  const ts = '2099-01-01T00:00:00.000Z';
  await joue.applique({ ...pauseDe(s8), actions: [{ ts, action: 'pause', element: 'chantier', id: 'chantier', de: 'ouvert', vers: 'pause' }] });
  const portailOuvert = () => {
    let o = false;
    joue.root.traverse((x) => { if (x.isInstancedMesh && x.name.startsWith('ENV_SITE_FENCE_A_GATE_LEAF_FRAME')) { const m = new THREE.Matrix4(); x.getMatrixAt(0, m); o = o || Math.abs(new THREE.Vector3().setFromMatrixColumn(m, 0).normalize().z) > 0.999; } });
    return o;
  };
  let tempsOuvert = 0;
  for (let t = 0; t < 120; t += 0.1) {
    joue.update(0.1);
    if (portailOuvert()) tempsOuvert = t;
  }
  verifie(tempsOuvert > 10 && !portailOuvert(), `portail : en pause jouée, ouvert ${tempsOuvert.toFixed(1)} s puis ${portailOuvert() ? 'resté ouvert' : 'fermé'} (il attend l'équipe)`);
  verifie(allume(cabanon(joue)) === 5, 'cabanon : en pause jouée, pas en fête');
  // de la pause a la fermeture (l'equipe revient du cabanon), puis de la fermeture a la pause (elle sort du vestiaire) :
  // jamais personne dans le portail d'entree ferme (constat D-4, B1)
  const ferme = (o) => {
    let n = 0, f = 0;
    o.traverse((x) => { if (x.isInstancedMesh && x.name.startsWith('ENV_SITE_FENCE_A_GATE_LEAF_FRAME')) for (let i = 0; i < x.count; i++) { const m = new THREE.Matrix4(); x.getMatrixAt(i, m); n++; if (Math.abs(new THREE.Vector3().setFromMatrixColumn(m, 0).normalize().z) < 0.5) f++; } });
    return n > 0 && f === n;
  };
  const portailEntree = () => { let r = null; joue.root.traverse((x) => { if (!r && x.userData.component === 'site-fence' && Math.abs(x.position.x - imp.points.portail[0]) < 0.01 && Math.abs(x.position.z - imp.points.portail[1]) < 0.01) r = x; }); return r; };
  const dansLePortail = () => { let n = 0; joue.root.traverse((x) => { if (x.userData.component === 'character' && x.visible && Math.hypot(x.position.x - imp.points.portail[0], x.position.z - imp.points.portail[1]) < 1.6) n++; }); return n; };
  const traversees = {};
  for (const [de, vers, action] of [['pause', 'ferme', 'fermeture'], ['ferme', 'pause', 'pause']]) {
    const s = { ...s8, chantier: { ...s8.chantier, regime: vers }, actions: [{ ts: vers === 'ferme' ? '2099-01-02T00:00:00.000Z' : '2099-01-03T00:00:00.000Z', action, element: 'chantier', id: 'chantier', de, vers }] };
    await joue.applique(s);
    let n = 0;
    for (let t = 0; t < 150; t += 0.1) {
      joue.update(0.1);
      if (ferme(portailEntree()) && dansLePortail()) n++;
    }
    traversees[`${de} → ${vers}`] = n;
    verifie(n === 0 && ferme(portailEntree()), `portail : de ${de} à ${vers} joué, ${n} images avec quelqu'un dans le portail fermé${ferme(portailEntree()) ? '' : ', et il reste ouvert'}`);
  }
  joue.dispose();
  rapports.push(`cabanon : dans la zone des transformations, en couleur dans une zone grise, en fête seulement en pause ; l'équipe s'y rassemble ; en pause jouée, le portail reste ouvert ${tempsOuvert.toFixed(1)} s le temps qu'elle passe ; personne dans le portail fermé, de la pause à la fermeture ni de la fermeture à la pause`);
}

// --- La lampe frontale et les personnes de la vie du chantier (character 1.2.0, plan D-3) : la nuit, toute personne
// casquee qui est dehors a sa lampe allumee, aucune de jour, aucune a son poste dans un bureau, aucune sans casque ;
// les ouvriers sont des worker (plus de tenue de chef d'equipe recoloree), les usagers des civilian
{
  const personnes = (carte) => {
    const l = [];
    carte.root.traverse((o) => { if (o.userData.component === 'character' && o.visible) l.push(o); });
    return l;
  };
  const lampe = (r) => !!r.getObjectByName('PRP_CHR_HEADLAMP_LENS');
  const casque = (r) => !!r.getObjectByName('CHR_BASE_MASTER_HELMET');
  const auBureau = (r) => r.userData.villeAuBureau === true; // a un poste desk:n (crew:n, devant la baraque, est dehors)
  const s8 = sequences['trois-applications'][7];
  const carte = await creeCarte(THREE, { components: modules, chargeur, theme: 'light', quality: 'high', reducedMotion: true, heure: 'nuit' });
  await carte.applique(s8);
  const ps = personnes(carte);
  const dehors = ps.filter((r) => casque(r) && !auBureau(r));
  const allumees = () => personnes(carte).filter(lampe).length;
  verifie(dehors.length > 0 && dehors.every(lampe), `lampe frontale : la nuit, ${dehors.filter((r) => !lampe(r)).length} personne(s) casquée(s) dehors sans lampe sur ${dehors.length}`);
  verifie(!ps.some((r) => !casque(r) && lampe(r)), 'lampe frontale : une personne sans casque a une lampe');
  verifie(!ps.some((r) => auBureau(r) && lampe(r)), 'lampe frontale : allumée à un poste de bureau');
  verifie(ps.some(auBureau), "lampe frontale : aucun agent à un poste de bureau dans la scène d'essai");
  const ouvriers = ps.filter((r) => r.getObjectByName('CHR_OUTFIT_WORKER_VEST'));
  verifie(ouvriers.length > 0 && ouvriers.every(casque), `ouvriers : ${ouvriers.length} en tenue d'ouvrier, tous casqués`);
  carte.regleHeure('jour');
  verifie(allumees() === 0, `lampe frontale : ${allumees()} allumée(s) de jour`);
  carte.regleHeure('nuit');
  verifie(allumees() === dehors.length, 'lampe frontale : la nuit revenue, les lampes ne se rallument pas');
  carte.dispose();
  rapports.push(`lampe frontale : ${dehors.length} personnes casquées dehors la nuit (trois-applications 08), toutes allumées, aucune de jour ni au bureau ; ${ouvriers.length} ouvriers en tenue worker`);
}

// --- L'ombre de l'hote (plan D-1c) : une image sur deux pendant une animation, toujours sur une image isolee
{
  const { ombreAlternee } = await import('../src/ombre.js');
  const r = { shadowMap: { autoUpdate: true, needsUpdate: false } };
  const o = ombreAlternee(r);
  const suite = [];
  for (const continu of [true, true, true, true, true]) { o.avant(continu); suite.push(r.shadowMap.needsUpdate); }
  verifie(r.shadowMap.autoUpdate === false, "ombre : l'hôte refait encore l'ombre à chaque image");
  verifie(suite.join() === 'true,false,true,false,true', `ombre : pendant une animation, ${suite.join()} au lieu d'une image sur deux`);
  o.avant(true);
  verifie(o.enRetard, "ombre : une animation arrêtée sur une image sautée ne demande pas d'image de plus");
  o.avant(false);
  verifie(r.shadowMap.needsUpdate && !o.enRetard, "ombre : une image isolée ne refait pas l'ombre");
  rapports.push("ombre de l'hôte : refaite une image sur deux pendant une animation, toujours sur une image isolée");
}

// --- La prise d'un agent (fiche agent-marker) : sur la carte entiere d'un portable (la camera de la galerie, 1280 x 800),
// a la reception attendue de projet-type (trois agents groupes a l'aire de reception), chaque agent se prend sur sa
// silhouette et a 11 px d'elle, plus a 13 px ; jamais un ouvrier ni un usager. La prise se fait a l'ecran : l'agent passe
// devant le batiment ou le decor derriere lui (l'hote la teste avant le rayon).
{
  const index = JSON.parse(await readFile(join(ROOT, 'fixtures', 'projet-type', 'index.json'), 'utf8'));
  const pas = index.etapes.findIndex((e) => /réception est attendue/.test(e.titre));
  verifie(pas >= 0, 'prise : projet-type n\'a plus de pas « réception attendue »');
  const scene = sequences['projet-type'][pas];
  const carte = await creeCarte(THREE, { components: modules, chargeur, theme: 'light', quality: 'high', reducedMotion: true });
  await carte.applique(scene);
  for (let t = 0; t < 30; t++) carte.update(1 / 30);
  const [W, H] = [1280, 800];
  const vue = 26; // le cadrage de la galerie pour une application
  const camera = new THREE.OrthographicCamera(-vue * (W / H), vue * (W / H), vue, -vue, 0.1, 500);
  camera.position.set(...reglages.camera.position).multiplyScalar(4);
  camera.lookAt(...reglages.camera.cible);
  camera.updateMatrixWorld();
  carte.root.updateMatrixWorld(true);
  const ecran = (v) => {
    const p = v.clone().applyMatrix4(carte.root.matrixWorld).project(camera);
    return [((p.x + 1) / 2) * W, ((1 - p.y) / 2) * H];
  };
  const agents = carte.agents().map((a) => ({ ...a, piedsCarte: a.pieds.clone().applyMatrix4(carte.root.children[0].matrix.clone().invert()), tete: ecran(a.tete), pieds: ecran(a.pieds) }));
  let testes = 0;
  const lu = lisScene(scene, connus);
  verifie(agents.length === lu.personnages.length, `prise : ${agents.length} agents pour ${lu.personnages.length} dans la scène (jamais un ouvrier ni un usager)`);
  const aLaReception = agents.filter((a) => lu.personnages.find((p) => p.id === a.id)?.lieu === 'aire-reception');
  verifie(aLaReception.length === 3, `prise : ${aLaReception.length} agents à la réception au lieu de 3`);
  const taille = agents.map((a) => Math.hypot(a.tete[0] - a.pieds[0], a.tete[1] - a.pieds[1]));
  for (const a of agents) {
    const milieu = [(a.tete[0] + a.pieds[0]) / 2, (a.tete[1] + a.pieds[1]) / 2];
    verifie(agentPris(agents, ...milieu) === a.id, `prise : sur sa silhouette, ${a.id} n'est pas pris (${agentPris(agents, ...milieu)})`);
    // a 11 px et a 13 px de sa silhouette, dans une direction ou aucun autre agent n'est plus pres : de cote, ou
    // au-dessus de la tete et sous les pieds pour un agent serre dans un groupe (chaque agent est teste, aucun n'est saute)
    const [dx, dy] = [a.tete[0] - a.pieds[0], a.tete[1] - a.pieds[1]];
    const l = Math.hypot(dx, dy) || 1;
    const haut = [dx / l, dy / l];
    const candidats = [];
    for (const [base, sens] of [[a.tete, 1], [a.pieds, -1]])
      for (let deg = -75; deg <= 75; deg += 15) {
        const r = (deg * Math.PI) / 180;
        const [ux, uy] = [sens * haut[0], sens * haut[1]];
        candidats.push([base, [ux * Math.cos(r) - uy * Math.sin(r), ux * Math.sin(r) + uy * Math.cos(r)]]);
      }
    for (const cote of [-1, 1]) candidats.push([milieu, [cote * -haut[1], cote * haut[0]]]);
    const dist = (b, p) => {
      const [ex, ey] = [b.tete[0] - b.pieds[0], b.tete[1] - b.pieds[1]];
      const t = Math.max(0, Math.min(1, ((p[0] - b.pieds[0]) * ex + (p[1] - b.pieds[1]) * ey) / (ex * ex + ey * ey || 1)));
      return Math.hypot(b.pieds[0] + t * ex - p[0], b.pieds[1] + t * ey - p[1]);
    };
    const libre = candidats.find(([b, d]) => {
      const pres = [b[0] + d[0] * (RAYON_PRISE - 1), b[1] + d[1] * (RAYON_PRISE - 1)];
      const loin = [b[0] + d[0] * (RAYON_PRISE + 1), b[1] + d[1] * (RAYON_PRISE + 1)];
      return Math.abs(dist(a, pres) - (RAYON_PRISE - 1)) < 0.5 && dist(a, loin) > RAYON_PRISE + 0.5 && agents.every((o) => o === a || (dist(o, pres) > dist(a, pres) + 0.5 && dist(o, loin) > RAYON_PRISE + 0.5));
    });
    verifie(libre, `prise : aucune direction libre autour de ${a.id} pour l'essai à ${RAYON_PRISE - 1} et ${RAYON_PRISE + 1} px`);
    if (!libre) continue;
    const [b, d] = libre;
    testes++;
    verifie(agentPris(agents, b[0] + d[0] * (RAYON_PRISE - 1), b[1] + d[1] * (RAYON_PRISE - 1)) === a.id, `prise : à ${RAYON_PRISE - 1} px de ${a.id}, il n'est pas pris`);
    verifie(agentPris(agents, b[0] + d[0] * (RAYON_PRISE + 1), b[1] + d[1] * (RAYON_PRISE + 1)) === null, `prise : à ${RAYON_PRISE + 1} px de ${a.id}, un agent est pris`);
  }
  // l'anneau du survol se pose aux pieds de l'agent, a la hauteur ou il se tient (une aire, un plancher, un etage)
  for (const a of agents) {
    await carte.survoleAgent(a.id);
    carte.update(1 / 30);
    let anneau = null;
    carte.root.traverse((o) => {
      if (o.userData.component === 'selection-ring' && Math.hypot(o.position.x - a.piedsCarte.x, o.position.z - a.piedsCarte.z) < 0.5 && o.position.distanceTo(a.piedsCarte) < 2) anneau = anneau || o;
    });
    verifie(anneau && anneau.position.y >= a.piedsCarte.y && anneau.position.y - a.piedsCarte.y < 0.05, `prise : l'anneau du survol de ${a.id} n'est pas à ses pieds (${anneau ? anneau.position.y.toFixed(2) : 'absent'} pour des pieds à ${a.piedsCarte.y.toFixed(2)} m)`);
  }
  await carte.survoleAgent(null);
  // trois agents groupes : chacun se prend sur sa propre silhouette, aucun ne cache l'autre
  rapports.push(`prise d'un agent : ${agents.length} agents de projet-type « ${index.etapes[pas].titre} », dont 3 groupés à la réception, pris sur leur silhouette (${Math.min(...taille).toFixed(0)} à ${Math.max(...taille).toFixed(0)} px de haut) ; ${testes} sur ${agents.length} essayés à ${RAYON_PRISE - 1} px (pris) et à ${RAYON_PRISE + 1} px (rien) ; l'anneau du survol à leurs pieds`);
  carte.dispose();
}

// --- La camera qui suit la selection (plan I-8) : un saut sans mouvement avec moins d'animations ; sinon un
// deplacement court, interrompu par toute nouvelle selection ; la camera glisse sans tourner ni zoomer. Et ce que la carte
// choisit pour les trois formes de gdc-select (derniere passe de GDC, section 6)
{
  const essai = (reducedMotion) => {
    const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 500);
    camera.position.set(40, 46, 40);
    const cible = new THREE.Vector3(0, 0, 0);
    return { camera, cible, suivi: creeSuivi({ camera, cible, reducedMotion }) };
  };
  const ecart = (e) => e.camera.position.clone().sub(e.cible);
  const pres = (a, b) => a.distanceTo(b) < 1e-6;
  const A = new THREE.Vector3(12, 0, -8);
  const B = new THREE.Vector3(-20, 0, 15);
  // sans animation : un saut, tout de suite
  const s = essai(true);
  const decalage = ecart(s);
  verifie(s.suivi.vers(A) === 0 && pres(s.cible, A) && pres(ecart(s), decalage) && !s.suivi.update(1 / 60), 'caméra : sans animation, pas de saut immédiat');
  // avec animation : un deplacement court, qui arrive juste, sans tourner
  const m = essai(false);
  verifie(m.suivi.vers(A) === DUREE_SUIVI && DUREE_SUIVI <= 1, `caméra : un déplacement de ${DUREE_SUIVI} s`);
  let images = 0;
  while (m.suivi.update(1 / 60) && images < 600) images++;
  verifie(pres(m.cible, A) && pres(ecart(m), decalage), 'caméra : le déplacement n\'arrive pas juste, ou la caméra a tourné');
  verifie(Math.abs(images + 1 - DUREE_SUIVI * 60) <= 1, `caméra : ${images + 1} images au lieu de ${DUREE_SUIVI * 60}`);
  // une nouvelle selection a mi-chemin : elle repart d'ou la camera est, sans saut, et arrive a la nouvelle cible
  const i = essai(false);
  i.suivi.vers(A);
  for (let k = 0; k < 15; k++) i.suivi.update(1 / 60);
  const ou = i.cible.clone();
  i.suivi.vers(B);
  i.suivi.update(1 / 60);
  // le premier pas d'un depart en douceur : un dixieme du trajet au plus (une image a 60 im/s sur 0,6 s : 8 %)
  verifie(i.cible.distanceTo(ou) <= 0.1 * B.distanceTo(ou), `caméra : la nouvelle sélection fait sauter la caméra de ${i.cible.distanceTo(ou).toFixed(2)} m`);
  while (i.suivi.update(1 / 60));
  verifie(pres(i.cible, B), 'caméra : interrompue, elle n\'arrive pas à la nouvelle sélection');
  i.suivi.vers(A);
  i.suivi.arrete();
  verifie(!i.suivi.update(1 / 60) && pres(i.cible, B), 'caméra : prise par l\'utilisateur, elle continue');

  // ce que la carte choisit
  const index = JSON.parse(await readFile(join(ROOT, 'fixtures', 'trois-applications', 'index.json'), 'utf8'));
  const scene = sequences['trois-applications'][index.etapes.length - 1];
  const carte = await creeCarte(THREE, { components: modules, chargeur, theme: 'light', quality: 'high', reducedMotion: true });
  await carte.applique(scene);
  const lu = lisScene(scene, connus);
  const b = lu.batiments.find((x) => (x.etages || []).some((e) => e.fiche && (e.pieces || []).length));
  const fiche = b.etages.find((e) => e.fiche && (e.pieces || []).length);
  const app = b.ref?.application || b.id;
  const surFiche = await carte.selectionne({ id: fiche.fiche, ref: { application: app, fiche: fiche.fiche } });
  verifie(surFiche && /^floor:/.test(surFiche.ancre || ''), `sélection { id, ref } d'une fiche : ${JSON.stringify(surFiche && surFiche.ancre)} au lieu de son étage`);
  const surLot = await carte.selectionne({ id: 'x', ref: { application: app, fiche: fiche.fiche, lot: fiche.pieces[0].lot }, evt: 'evt:essai/1' });
  verifie(surLot && /^(room|floor):/.test(surLot.ancre || ''), `sélection { id, ref, evt } d'un lot : ${JSON.stringify(surLot && surLot.ancre)}`);
  const surApp = await carte.selectionne({ id: app, ref: { application: app } });
  verifie(surApp && surApp.ancre === null && surApp.point, 'sélection d\'une application : pas sur son bâtiment');
  const surEtape = await carte.selectionne({ id: 'etape:7', etape: 7 });
  const remise = carte.cadres().find((z) => z.cle === 'remise');
  const centreRemise = remise.coins.reduce((s, c) => s.add(c), new THREE.Vector3()).multiplyScalar(0.25);
  verifie(surEtape && surEtape.zone === 'remise' && Math.hypot(surEtape.point.x - centreRemise.x, surEtape.point.z - centreRemise.z) < 1e-6, 'sélection d\'une étape : pas au centre de sa zone');
  const unAgent = lu.personnages[0];
  const parGdc = await carte.selectionne({ id: unAgent.id });
  verifie(parGdc && parGdc.agent === unAgent.id, `sélection d'un agent par son identifiant de GDC (${unAgent.id}) : ${JSON.stringify(parGdc)}`);
  const parPortrait = await carte.selectionne({ id: carte.agents().find((a) => a.id === unAgent.id).personne });
  verifie(parPortrait && parPortrait.agent === unAgent.id, 'sélection d\'un agent par son repère (equipe.json) : rien');
  verifie((await carte.selectionne({ id: 'rien-de-tel' })) === null && (await carte.selectionne(null)) === null, 'sélection inconnue : la carte va quelque part');
  // un agent choisi dans un batiment dont la coupe est ouverte (l'arbre ouvre la coupe de sa fiche) : la carte va la ou
  // il se tient vraiment, a sa piece ou sur le palier, et non a son poste dans le batiment cache (revue DA)
  const dedans = lu.personnages.find((p) => p.batiment && p.etage);
  if (dedans) {
    const bd = lu.batiments.find((x) => x.id === dedans.batiment);
    await carte.ouvreCoupe(bd.id, dedans.etage);
    for (let t = 0; t < 30; t++) carte.update(1 / 30);
    const sel = await carte.selectionne({ id: dedans.id, ref: { application: bd.ref?.application || bd.id, fiche: dedans.etage } });
    const ou = carte.agents().find((a) => a.id === dedans.id);
    verifie(sel && ou && sel.point.distanceTo(ou.pieds) < 1e-6, `sélection de ${dedans.id} dans la coupe ouverte : la carte ne va pas à ses pieds`);
    const surLaFiche = await carte.selectionne({ id: dedans.etage, ref: { application: bd.ref?.application || bd.id, fiche: dedans.etage } });
    verifie(surLaFiche && surLaFiche.coupe, 'sélection de la fiche dont la coupe est ouverte : la carte ne va pas à la coupe');
    carte.fermeCoupe();
    for (let t = 0; t < 90; t++) carte.update(1 / 30);
  }
  rapports.push(`caméra qui suit : un saut sans animation, ${DUREE_SUIVI} s sinon, interrompue sans saut ; la carte choisit l'étage d'une fiche, la pièce d'un lot, le bâtiment d'une application, le centre de la zone d'une étape et un agent`);
  carte.dispose();
}

// --- La ville autour (lot G9, fiche city-plan ; docs/ville-autour.md) : le plan et l'assemblage des kits, avec les
// vrais modeles, en qualite haute et basse. Budget par passe, hauteurs de chaque cote, rien dans la place ni dans le
// terrain du chantier (sauf les arbres du pre, dans la place), rien ne se designe, la bascule au loin.
{
  const { planVille, PLACE, HAUTEURS } = await import('../src/ville/ville-autour.js');
  verifie(JSON.stringify(planVille('gdc')) === JSON.stringify(planVille('gdc')), 'ville autour : la même graine ne rejoue pas la même ville');
  verifie(JSON.stringify(planVille('gdc')) !== JSON.stringify(planVille('autre')), 'ville autour : deux graines donnent la même ville');
  const plan = planVille('gdc');
  const coteDe = (x, z) => plan.pates.find((p) => x >= p.x[0] - 0.01 && x <= p.x[1] + 0.01 && z >= p.z[0] - 0.01 && z <= p.z[1] + 0.01)?.cote;
  const appels = (racine, filtre = () => true) => {
    let n = 0;
    racine.traverse((o) => {
      let vu = true;
      for (let x = o; x && x !== racine.parent; x = x.parent) if (!x.visible) vu = false;
      if (o.isMesh && vu && filtre(o)) n += Array.isArray(o.material) ? o.material.length : 1;
    });
    return n;
  };
  const PLAFONDS = { high: { principal: 20, ombre: 12, triangles: 250000 }, low: { principal: 15, ombre: 0, triangles: 80000 } };
  let rapportVille = '';
  for (const quality of ['high', 'low']) {
    const carte = await creeCarte(THREE, { components: modules, chargeur, theme: 'light', quality, reducedMotion: true, villeAutour: 'kits' });
    const v = carte.villeAutour;
    verifie(v && v.mode === 'kits', `ville autour (${quality}) : la carte ne la pose pas`);
    const ville = [];
    carte.root.traverse((o) => {
      if (o.name === 'VILLE_KITS' || o.name === 'city-ground' || o.name === 'VILLE_PRE') ville.push(o);
    });
    const principal = ville.reduce((n, o) => n + appels(o), 0);
    const ombre = ville.reduce((n, o) => n + appels(o, (m) => m.castShadow), 0);
    const pl = PLAFONDS[quality];
    verifie(principal <= pl.principal && ombre <= pl.ombre, `ville autour (${quality}) : ${principal} appels de dessin et ${ombre} dans l'ombre, plafonds ${pl.principal} et ${pl.ombre}`);
    const tri = quality === 'high' ? v.triangles.haute : v.triangles.basse;
    verifie(tri <= pl.triangles && v.triangles.basse <= PLAFONDS.low.triangles, `ville autour (${quality}) : ${tri} triangles, plafond ${pl.triangles}`);
    // les sommets de la ville visible : hauteurs, place et terrain du chantier
    const T = implantation(1, ['block']).terrain; // le terrain de la carte essayee : vide, un batiment
    const raccord = (x, z) => plan.raccords.some((r) => x >= r.x[0] - 0.01 && x <= r.x[1] + 0.01 && z >= r.z[0] - 0.01 && z <= r.z[1] + 0.01);
    let trop = 0;
    let dedans = 0;
    const p3 = new THREE.Vector3();
    for (const o of ville)
      o.traverse((m) => {
        if (!m.isMesh || m.isInstancedMesh) return;
        let vu = true;
        for (let x = m; x && x !== o.parent; x = x.parent) if (!x.visible) vu = false;
        if (!vu) return;
        const pre = o.name === 'VILLE_PRE';
        const pos = m.geometry.getAttribute('position');
        m.updateWorldMatrix(true, false);
        const local = new THREE.Matrix4().copy(o.parent.matrixWorld).invert().multiply(m.matrixWorld);
        for (let i = 0; i < pos.count; i++) {
          p3.fromBufferAttribute(pos, i).applyMatrix4(local);
          const cote = coteDe(p3.x, p3.z);
          if (cote && p3.y > HAUTEURS[cote] + 0.01) trop++;
          const dansPlace = p3.x > PLACE.x[0] + 0.01 && p3.x < PLACE.x[1] - 0.01 && p3.z > PLACE.z[0] + 0.01 && p3.z < PLACE.z[1] - 0.01;
          const dansTerrain = p3.x > T.x[0] && p3.x < T.x[1] && p3.z > T.z[0] && p3.z < T.z[1];
          // les raccords entrent dans la place par construction (ils rejoignent les routes du chantier) ; les arbres du pre
          // sont dans la place, jamais sur le terrain
          if (o.name !== 'city-ground' && ((dansPlace && !pre && !raccord(p3.x, p3.z)) || (pre && dansTerrain))) dedans++;
        }
      });
    verifie(trop === 0, `ville autour (${quality}) : ${trop} sommets au-dessus de la hauteur de leur côté`);
    verifie(dedans === 0, `ville autour (${quality}) : ${dedans} sommets dans la place du chantier ou sur son terrain`);
    // rien ne se designe : un rayon traverse la ville
    let touches = 0;
    const rayon = new THREE.Raycaster(new THREE.Vector3(60, 100, 40), new THREE.Vector3(0, -1, 0));
    for (const o of ville)
      o.traverse((m) => {
        if (!m.isMesh) return;
        const hits = [];
        m.raycast(rayon, hits);
        touches += hits.length;
        if (carte.cible(m) !== null) touches++;
      });
    verifie(touches === 0, `ville autour (${quality}) : la ville se désigne au clic`);
    // la bascule au loin, en qualite haute : sous 4 px par metre, les pieces basses
    if (quality === 'high') {
      verifie(carte.vueVille(3) === true && carte.villeAutour.loin === true, 'ville autour : pas de pièces basses sous 4 px par mètre');
      verifie(carte.vueVille(8) === true && carte.villeAutour.loin === false, 'ville autour : les pièces basses restent au-dessus de 4 px par mètre');
      rapportVille = `ville autour : ${plan.pates.length} pâtés, ${v.vitres} vitres ; en haute ${principal} appels et ${ombre} dans l'ombre, ${v.triangles.haute} triangles (${v.triangles.basse} au loin)`;
    } else rapportVille += ` ; en basse ${principal} appels, ${tri} triangles`;
    carte.dispose();
  }
  // la nuit (city-night) : fenetres de la ville faibles, jamais franches, environ 30 et 40 % ; fixes toute la nuit ; les
  // tetes des lampadaires allumees, pas l'eau de la fontaine ; taches au sol 150 au plus, a 0,10 au plus ; le jour, rien
  {
    const nuit = await creeCarte(THREE, { components: modules, chargeur, theme: 'light', quality: 'high', reducedMotion: true, villeAutour: 'kits', heure: 'nuit' });
    const objets = {};
    nuit.root.traverse((o) => {
      if (/^VILLE_KITS_HAUTE_(VITRES|VITRES_ALLUMEES|LAMPES|MAT_GLASS|TACHES)$/.test(o.name)) objets[o.name.replace('VILLE_KITS_HAUTE_', '')] = o;
    });
    const { VITRES: e, VITRES_ALLUMEES: a, LAMPES: l, MAT_GLASS: eau, TACHES: t } = objets;
    const part = a.count / (a.count + e.count);
    verifie(a.material.userData.vitre === 'faible', `ville la nuit : les fenêtres allumées sont « ${a.material.userData.vitre} », pas faibles`);
    verifie(!e.material.userData.vitre, 'ville la nuit : les fenêtres éteintes sont éclairées');
    verifie(part > 0.25 && part < 0.45, `ville la nuit : ${Math.round(part * 100)} % de fenêtres allumées`);
    verifie(l && l.material.userData.vitre === 'franche', 'ville la nuit : les têtes des lampadaires ne sont pas allumées');
    verifie(!eau || !eau.material.userData.vitre, 'ville la nuit : l\'eau de la fontaine s\'allume');
    const opacite = t ? t.material.color.r * t.material.opacity : 0;
    verifie(t && t.visible && t.count <= 150 && opacite <= 0.1 + 1e-6, `ville la nuit : taches des lampadaires (${t?.count}, ${opacite.toFixed(3)})`);
    const avant = a.count;
    for (let k = 0; k < 60; k++) nuit.update(1);
    verifie(a.count === avant, 'ville la nuit : des fenêtres changent pendant la nuit');
    rapportVille += ` ; la nuit, ${a.count} fenêtres allumées sur ${a.count + e.count} (faibles), ${t.count} taches`;
    nuit.dispose();
    const jour = await creeCarte(THREE, { components: modules, chargeur, theme: 'light', quality: 'high', reducedMotion: true, villeAutour: 'kits', heure: 'jour' });
    let tj = null;
    jour.root.traverse((o) => { if (o.name === 'VILLE_KITS_HAUTE_TACHES') tj = o; });
    verifie(tj && !tj.visible, 'ville le jour : les taches des lampadaires sont allumées');
    jour.dispose();
  }
  // la circulation (city-traffic) : les trajets sur une heure, en nombres (voitures a droite, du garage au garage ;
  // passants de porte a porte, sur les trottoirs, traversant aux passages ; jamais dans le chantier ni sur les raccords) ;
  // puis la carte : plafonds, budget, aucune ombre, rien ne se designe, l'ambiance, le sommeil, la ville figee
  {
    const { assembleVille } = await import('../src/ville/ville-kits.js');
    const { creeCirculation, CIRCULATION } = await import('../src/ville/circulation.js');
    const KITS = { id: 'ville-autour', category: 'site', assets: ['kit:road-kit/ENV_ROAD_KIT_A_v001.glb', 'kit:nature-kit/ENV_NATURE_KIT_A_v001.glb', 'kit:villa-kit/ENV_VILLA_KIT_A_v001.glb', 'kit:apartment-kit/ENV_APARTMENT_KIT_A_v001.glb'] };
    await chargeur.prepare(KITS);
    const a = await chargeur.assetsPour(KITS);
    const [rues, nature, villas, immeubles] = KITS.assets.map((n) => a[n].scene);
    const kits = assembleVille(THREE, plan, { rues, nature, villas, immeubles }, { quality: 'low', graine: 'gdc' });
    const { lieux } = kits;
    kits.dispose();
    const dansPlace = (x, z) => x > PLACE.x[0] && x < PLACE.x[1] && z > PLACE.z[0] && z < PLACE.z[1];
    const surRaccord = (x, z) => plan.raccords.some((r) => x > r.x[0] && x < r.x[1] && z > r.z[0] && z < r.z[1]);
    const ETATS = new Set(['walk', 'idle', 'talk']);
    let resume = '';
    for (const [quality, nuit] of [['high', false], ['high', true], ['low', false], ['low', true]]) {
      const c = creeCirculation(plan, lieux, { graine: 'gdc', quality });
      const { garages, portes } = c.endroits;
      const plafond = CIRCULATION.plafonds[quality];
      const [pv, pp] = nuit ? [Math.ceil(plafond.voitures / 2), Math.ceil(plafond.passants / 2)] : [plafond.voitures, plafond.passants];
      const pres = (p, liste, d) => liste.some((l) => Math.hypot(l[0] - p[0], l[1] - p[1]) < d);
      const arrets = garages.map((g) => g.arret);
      const seuils = portes.map((p) => p.chemin[0]);
      const ecarts = { place: 0, raccord: 0, gauche: 0, apparition: 0, vitesse: 0, chaussee: 0, etat: 0, porte: 0, plafond: 0, traversees: 0 };
      let [maxV, maxP, droites, fontaine, voitures, passants] = [0, 0, 0, 0, 0, 0];
      let avant = { voitures: [], passants: [] };
      const dt = 0.1;
      for (let i = 0; i < 36000; i++) {
        const o = c.update(dt, { nuit });
        maxV = Math.max(maxV, o.voitures.length);
        maxP = Math.max(maxP, o.passants.length);
        if (o.voitures.length > pv || o.passants.length > pp) ecarts.plafond++;
        // une voiture qui apparait sort d'un garage ; une voiture roule a 30 km/h
        if (o.voitures.length > avant.voitures.length) {
          voitures++;
          if (!pres([o.voitures.at(-1).x, o.voitures.at(-1).z], arrets, CIRCULATION.vitesse * dt + 0.05)) ecarts.apparition++;
        }
        o.voitures.forEach((v, k) => {
          if (dansPlace(v.x, v.z)) ecarts.place++;
          if (surRaccord(v.x, v.z)) ecarts.raccord++;
          // le pas depuis la voiture la plus proche a l'image d'avant (une voiture qui vient de sortir n'en a pas)
          const pas = Math.min(...avant.voitures.map((w) => Math.hypot(v.x - w.x, v.z - w.z)));
          if (k < avant.voitures.length && pas > CIRCULATION.vitesse * dt + 1e-6 && pas < 5) ecarts.vitesse++;
          // a droite, sur la longueur droite d'une rue (hors carrefours) : le cote de l'axe et le sens s'accordent
          for (const r of plan.rues) {
            const h = r.x[1] - r.x[0] > r.z[1] - r.z[0];
            const [t, off] = h ? [v.x, v.z - (r.z[0] + r.z[1]) / 2] : [v.z, v.x - (r.x[0] + r.x[1]) / 2];
            const [de, a2] = h ? r.x : r.z;
            if (t < de || t > a2 || Math.abs(off) > 2.2) continue;
            const sens = h ? Math.sin(v.heading) : Math.cos(v.heading);
            if (Math.abs(sens) < 0.98 || Math.abs(off) < 0.5) continue;
            droites++;
            // vers +x, la droite est +z ; vers +z, la droite est -x
            if ((h ? Math.sign(sens) * Math.sign(off) : -Math.sign(sens) * Math.sign(off)) < 0) ecarts.gauche++;
          }
        });
        if (o.passants.length > avant.passants.length) passants++;
        for (const p of o.passants) {
          if (!avant.passants.some((q) => q.rang === p.rang) && !pres([p.x, p.z], seuils, CIRCULATION.marche * dt + 0.05)) ecarts.porte++;
          if (dansPlace(p.x, p.z)) ecarts.place++;
          if (surRaccord(p.x, p.z)) ecarts.raccord++;
          if (!ETATS.has(p.etat)) ecarts.etat++;
          if (p.etat !== 'walk') fontaine++;
          // sur la chaussee, seulement a un passage pieton (5 bandes de 0,50 m, 4 m de long : a 2 m de son axe)
          if (p.y === CIRCULATION.sol.chaussee) {
            const ok = c.reseau.troncons.some((T) => {
              const [t, off] = T.h ? [p.x, p.z - T.axe] : [p.z, p.x - T.axe];
              return Math.abs(off) <= 5 && t > T.t0 - 0.01 && t < T.t1 + 0.01 && T.passages.some((tp) => Math.abs(t - tp) <= 2);
            });
            if (!ok) ecarts.chaussee++;
            ecarts.traversees++;
          }
        }
        avant = o;
      }
      const nom = `circulation (${quality}${nuit ? ', nuit' : ''})`;
      verifie(maxV <= pv && maxP <= pp && ecarts.plafond === 0, `${nom} : ${maxV} voitures et ${maxP} passants, plafonds ${pv} et ${pp}`);
      verifie(voitures > 20 && passants > 15, `${nom} : ${voitures} voitures et ${passants} passants en une heure`);
      verifie(ecarts.place === 0 && ecarts.raccord === 0, `${nom} : ${ecarts.place} positions dans la place du chantier, ${ecarts.raccord} sur un raccord`);
      verifie(droites > 1000 && ecarts.gauche === 0, `${nom} : ${ecarts.gauche} positions à gauche sur ${droites}`);
      verifie(ecarts.apparition === 0 && ecarts.porte === 0, `${nom} : ${ecarts.apparition} voitures hors d'un garage, ${ecarts.porte} passants hors d'une porte à leur apparition`);
      verifie(ecarts.vitesse === 0, `${nom} : ${ecarts.vitesse} pas de voiture au-dessus de 30 km/h`);
      verifie(ecarts.chaussee === 0, `${nom} : ${ecarts.chaussee} positions de passant sur la chaussée hors d'un passage piéton`);
      // en basse, les passages pietons ne sont pas dessines : personne ne traverse, et la fontaine est de l'autre cote
      verifie(ecarts.etat === 0 && (quality === 'low' || fontaine > 0), `${nom} : ${ecarts.etat} états interdits, ${fontaine} instants à la fontaine`);
      if (quality === 'low') verifie(ecarts.traversees === 0, `${nom} : ${ecarts.traversees} traversées sans passage dessiné`);
      if (quality === 'high' && !nuit) resume = `circulation : ${garages.length} garages, ${portes.length} portes ; en une heure, ${voitures} voitures et ${passants} passants (au plus ${maxV} et ${maxP} à la fois), toujours à droite, traversée aux passages`;
    }
    // la meme graine rejoue la meme circulation
    const [c1, c2] = [creeCirculation(plan, lieux), creeCirculation(plan, lieux)];
    let pareil = true;
    for (let i = 0; i < 3000; i++) if (JSON.stringify(c1.update(0.1)) !== JSON.stringify(c2.update(0.1))) pareil = false;
    verifie(pareil, 'circulation : la même graine ne rejoue pas la même circulation');
    // figee, avec moins d'animations : des voitures garees au bout de leur allee, des passants immobiles
    const fige = creeCirculation(plan, lieux, { reducedMotion: true });
    const f0 = JSON.stringify(fige.update(0));
    const f1 = fige.update(30);
    verifie(f1.bouge === false && JSON.stringify(fige.update(0)) === f0 && f1.voitures.length === 3 && f1.passants.length === 3 && f1.voitures.every((v) => v.moving === false) && f1.passants.every((p) => p.etat === 'idle'), 'circulation figée : des voitures roulent ou des passants marchent');
    const fn = fige.update(0, { nuit: true });
    const fb = creeCirculation(plan, lieux, { reducedMotion: true, quality: 'low' }).update(0, { nuit: true });
    verifie(fn.voitures.length === 2 && fn.passants.length === 2 && fb.voitures.length === 1 && fb.passants.length === 1, `circulation figée la nuit : ${fn.voitures.length} et ${fn.passants.length} en haute, ${fb.voitures.length} et ${fb.passants.length} en basse, au lieu de la moitié`);
    // aucun passant fige contre la borne de la fontaine (au bout -X du bassin)
    const fo = fige.endroits.place.fontaine;
    verifie(f1.passants.every((p) => p.x - fo[0] > -1.6), 'circulation figée : un passant contre la borne de la fontaine');

    // la carte : budget par passe (toutes les places prises), aucune ombre, rien ne se designe, les passants au loin
    // le budget de la fiche (catalogue.json) ; la basse, ecrite dans ses criteres : 24 appels (decision du 25 octobre 2026)
    const catalogue = JSON.parse(await readFile(join(ROOT, 'catalogue.json'), 'utf8'));
    const fiche = catalogue.items.find((e) => e.id === 'city-traffic').budget;
    const BUDGET = { high: { appels: fiche.drawCalls, triangles: fiche.triangles }, low: { appels: 24, triangles: fiche.triangles } };
    for (const quality of ['high', 'low']) {
      // l'heure fixee : a l'aube ou au crepuscule reels, la lumiere change et la carte demanderait des images ordinaires
      const carte = await creeCarte(THREE, { components: modules, chargeur, theme: 'light', quality, reducedMotion: false, villeAutour: 'kits', heure: 'jour' });
      const r = carte.root.getObjectByName('VILLE_CIRCULATION');
      const groupe = r.getObjectByName('VILLE_PASSANTS');
      const visibles = groupe.children.map((o) => o.visible);
      for (const o of groupe.children) o.visible = true;
      let [n, ombre, tri] = [0, 0, 0];
      r.traverse((m) => {
        if (!m.isMesh) return;
        const k = Array.isArray(m.material) ? m.material.length : 1;
        n += k;
        if (m.castShadow) ombre += k;
        const g = m.geometry;
        tri += ((g.index ? g.index.count : g.attributes.position.count) / 3) * (m.isInstancedMesh ? m.instanceMatrix.count : 1);
      });
      groupe.children.forEach((o, k) => { o.visible = visibles[k]; });
      const b = BUDGET[quality];
      verifie(n <= b.appels && ombre === 0 && tri <= b.triangles, `circulation (${quality}) : ${n} appels, ${ombre} dans l'ombre, ${Math.round(tri)} triangles ; budget ${b.appels} appels, ${b.triangles} triangles, aucun dans l'ombre`);
      let touches = 0;
      r.traverse((m) => {
        if (!m.isMesh) return;
        const hits = [];
        m.raycast(new THREE.Raycaster(new THREE.Vector3(60, 100, 40), new THREE.Vector3(0, -1, 0)), hits);
        touches += hits.length;
        if (carte.cible(m) !== null) touches++;
      });
      verifie(touches === 0, `circulation (${quality}) : elle se désigne au clic`);
      // l'ambiance : sans chantier qui vit, la carte rend "ambiance" quand la ville seule bouge, jamais true pour elle
      const rendus = {};
      for (let i = 0; i < 1200; i++) {
        const x = carte.update(0.1);
        rendus[String(x)] = (rendus[String(x)] || 0) + 1;
      }
      verifie(rendus.ambiance > 600 && !rendus.true, `circulation (${quality}) : la carte rend ${JSON.stringify(rendus)} au lieu d'images d'ambiance`);
      // endormie, elle ne bouge plus ; reveillee, elle repart
      carte.endorsVille(true);
      const e0 = JSON.stringify(carte.villeAutour.circulation);
      let dort = true;
      for (let i = 0; i < 300; i++) if (carte.update(0.1)) dort = false;
      verifie(dort && JSON.stringify(carte.villeAutour.circulation) === e0, `circulation (${quality}) : la ville endormie bouge encore`);
      carte.endorsVille(false);
      let repart = false;
      for (let i = 0; i < 600; i++) if (carte.update(0.1) === 'ambiance') repart = true;
      verifie(repart, `circulation (${quality}) : la ville ne se réveille pas`);
      // sous 4 px par metre, plus de passants dessines
      carte.vueVille(3);
      const loin = carte.villeAutour.circulation.passantsVisibles;
      carte.vueVille(8);
      verifie(loin === false && carte.villeAutour.circulation.passantsVisibles === true, `circulation (${quality}) : les passants restent dessinés sous 4 px par mètre`);
      if (quality === 'high') resume += ` ; en haute ${n} appels et ${Math.round(tri)} triangles au plus, aucun dans l'ombre`;
      else resume += ` ; en basse ${n} appels`;
      carte.dispose();
    }
    // avec moins d'animations, la carte ne demande aucune image pour la ville
    const figee = await creeCarte(THREE, { components: modules, chargeur, theme: 'light', quality: 'high', reducedMotion: true, villeAutour: 'kits', heure: 'jour' });
    let image = false;
    for (let i = 0; i < 300; i++) if (figee.update(0.1)) image = true;
    const ef = figee.villeAutour.circulation;
    verifie(!image && ef.voitures === 3 && ef.passants === 3, `circulation figée : la carte demande une image, ou ${ef.voitures} voitures et ${ef.passants} passants posés`);
    figee.dispose();
    rapports.push(resume);
  }
  const sansVille = await creeCarte(THREE, { components: modules, chargeur, theme: 'light', quality: 'low', reducedMotion: true });
  verifie(sansVille.villeAutour === null && sansVille.vueVille(3) === false, 'sans villeAutour, la carte pose une ville');
  sansVille.dispose();
  rapports.push(rapportVille);
}

// --- Le verdict
if (erreurs.length) {
  console.error(`Carte vivante : ${erreurs.length} erreur(s) sur ${verifies} vérifications`);
  for (const e of erreurs.slice(0, 40)) console.error('  ✗ ' + e);
  process.exit(1);
}
for (const r of rapports) console.log('  ' + r);
console.log(`Carte vivante : ${verifies} vérifications conformes (chemins, lecture, vie, carte assemblée).`);
