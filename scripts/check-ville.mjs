// Le controle de la carte vivante (fiche city-map) : les chemins, la lecture des actions et la vie du chantier, sans
// navigateur, sur l'implantation et sur les sequences reelles de GDC (fixtures/). Lance par « npm run check ».
import { implantation } from '../src/ville/implantation.js';
import { creeChemins, positionSur, MARCHE_MAX } from '../src/ville/chemins.js';
import { lisScene } from '../src/ville/scene-gdc.js';
import { equipes, usagers, PLAFONDS } from '../src/ville/vie.js';
import { creeCarte } from '../src/ville/carte.js';
import { readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { creeChargeur } from '../src/assets.js';

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
for (let apps = 1; apps <= 4; apps++) {
  const imp = implantation(apps);
  const chemins = creeChemins(imp.voies);
  const lieux = Object.keys(imp.lieux);
  const bouts = [...lieux, ...imp.parcelles.map((p) => `allee:${p.index + 1}`)];
  // le socle de chaque parcelle : on n'y coupe jamais (on entre par sa porte, sur l'allee)
  const socles = imp.parcelles.map((p) => ({ x: [p.position[0] - 6, p.position[0] + 6], z: [31, 43] }));
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

// --- Les sequences de GDC (fixtures/) : lecture et vie, sans Three.js
const sequences = {};
for (const dossier of await readdir(join(ROOT, 'fixtures'), { withFileTypes: true })) {
  if (!dossier.isDirectory()) continue;
  const index = JSON.parse(await readFile(join(ROOT, 'fixtures', dossier.name, 'index.json'), 'utf8'));
  sequences[dossier.name] = await Promise.all(index.etapes.map(async (e) => JSON.parse(await readFile(join(ROOT, 'fixtures', dossier.name, e.fichier), 'utf8'))));
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
const rapports = [];
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
        verifie(c.agents === lu.personnages.length, `${nom} ${i + 1} : ${c.agents} agents posés pour ${lu.personnages.length} dans la scène`);
        for (const [zone, oui] of Object.entries(lu.zones)) if (oui) verifie(carte.cadres().find((z) => z.cle === zone).activee, `${nom} ${i + 1} : la zone ${zone} reste grise`);
      }
      // la vue en coupe s'ouvre et se ferme sur chaque batiment de la derniere scene
      for (const b of lisScene(scenes[scenes.length - 1], connus).batiments) {
        verifie(await carte.ouvreCoupe(b.id), `${nom} : la vue en coupe de ${b.id} ne s'ouvre pas`);
        for (let t = 0; t < 60; t++) carte.update(1 / 30);
        carte.fermeCoupe();
        for (let t = 0; t < 90; t++) carte.update(1 / 30);
        verifie(carte.coupe === null, `${nom} : la vue en coupe de ${b.id} ne se ferme pas`);
      }
      rapports.push(`${nom} (${reducedMotion ? 'sans animation, basse' : 'haute'}) : ${scenes.length} scènes, jusqu'à ${maxOuvriers} ouvriers${carte.signalements.length ? ', signalé : ' + carte.signalements.join(' ; ') : ''}`);
      carte.dispose();
    } catch (e) {
      verifie(false, `${nom} : la carte échoue : ${e.stack}`);
    }
  }

// --- Le verdict
if (erreurs.length) {
  console.error(`Carte vivante : ${erreurs.length} erreur(s) sur ${verifies} vérifications`);
  for (const e of erreurs.slice(0, 40)) console.error('  ✗ ' + e);
  process.exit(1);
}
for (const r of rapports) console.log('  ' + r);
console.log(`Carte vivante : ${verifies} vérifications conformes (chemins, lecture, vie, carte assemblée).`);
