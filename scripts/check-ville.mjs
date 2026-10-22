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
import { makeContext } from '../src/tokens.js';
import { measure } from '../src/contract.js';
import { soleilDe, momentDe, recetteDe, passages, lumiere } from '../src/ville/heure.js';
import palette from '../src/palette.json' with { type: 'json' };

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
// la direction de visee de la camera isometrique de la galerie, a peu pres : de haut et de biais
const ISO = new THREE.Vector3(-1, -1.15, -1).normalize();

// --- La coupe (building-interior 2.0.0) tient son budget dans tous les cas : 1 a 12 pieces, chaque stade, des aspects
// meles, en qualite haute et basse (les donnees d'essai du controle des composants n'ont que deux pieces)
{
  const mod = modules['building-interior'];
  await chargeur.prepare(mod.meta);
  const assets = await chargeur.assetsPour(mod.meta);
  const ASPECTS = ['todo', 'preparing', 'building', 'finishing', 'done', 'defect'];
  const STADES = ['plot', 'excavation', 'foundations', 'structure', 'envelope', 'finishing', 'inspection', 'completed'];
  let pire = 0;
  for (const quality of ['high', 'low'])
    for (let n = 1; n <= 12; n++)
      for (const stage of STADES)
        for (let d = 0; d < ASPECTS.length + 1; d++) {
          // d < 6 : les aspects meles a partir du d-ieme ; d = 6 : toutes les pieces en travaux (le plus lourd)
          const rooms = Array.from({ length: n }, (_, k) => ({ id: `L${k + 1}`, state: d === 6 ? 'building' : ASPECTS[(k + d) % 6] }));
          const inst = mod.create(THREE, { rooms: n }, makeContext({ theme: 'light', quality, reducedMotion: true }, assets));
          inst.setState('default', { floor: { stage }, rooms });
          const m = measure(inst.root);
          if (quality === 'high') pire = Math.max(pire, m.triangles);
          verifie(m.triangles <= mod.meta.budget.triangles && m.materials <= mod.meta.budget.materials, `building-interior : ${m.triangles} triangles, ${m.materials} matériaux (${n} pièces, ${stage}, ${quality})`);
          inst.dispose();
        }
  rapports.push(`coupe : budget tenu de 1 à 12 pièces, huit stades (au plus ${pire} triangles en qualité haute)`);
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
      }
      // la vue en coupe (building-interior 2.0.0) s'ouvre et se ferme sur chaque etage de chaque batiment de la derniere
      // scene : une piece par lot, chaque agent de l'etage a la piece de son lot ou sur le palier
      const derniere = lisScene(scenes[scenes.length - 1], connus);
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
          carte.fermeCoupe();
          for (let t = 0; t < 90; t++) carte.update(1 / 30);
          verifie(carte.coupe === null, `${ou} ne se ferme pas`);
        }
      // la fiche du catalogue : trois-applications, etape 7, Julie est dans la piece L1 de « Saisir un constat hors ligne »
      if (nom === 'trois-applications') {
        await carte.applique(scenes[6], { actions: false });
        verifie(await carte.ouvreCoupe('terrain'), `${nom} 7 : la vue en coupe du terrain ne s'ouvre pas`);
        const vue = carte.vueCoupe;
        verifie(vue.fiche === '002-saisir-un-constat-hors-ligne', `${nom} 7 : la coupe ouvre ${vue.fiche}`);
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

// --- Le camion de livraison : il roule benne baissee, la leve une fois gare, et repart (projet-type 15 -> 16 -> 15)
{
  const [s15, s16] = [sequences['projet-type'][14], sequences['projet-type'][15]];
  const carte = await creeCarte(THREE, { components: modules, chargeur, theme: 'light', quality: 'high', reducedMotion: false });
  await carte.applique(s15);
  await carte.applique(s16);
  let vu = false;
  for (let t = 0; t < 20 * 30; t++) {
    carte.update(1 / 30);
    for (const c of carte.compte().camions) {
      if (c.roule) vu = true;
      verifie(!c.roule || c.state !== 'arriving', `camion : il vide sa benne en roulant (t = ${(t / 30).toFixed(1)} s)`);
    }
  }
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

// --- Le verdict
if (erreurs.length) {
  console.error(`Carte vivante : ${erreurs.length} erreur(s) sur ${verifies} vérifications`);
  for (const e of erreurs.slice(0, 40)) console.error('  ✗ ' + e);
  process.exit(1);
}
for (const r of rapports) console.log('  ' + r);
console.log(`Carte vivante : ${verifies} vérifications conformes (chemins, lecture, vie, carte assemblée).`);
