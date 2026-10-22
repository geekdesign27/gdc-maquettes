// Le controle du planning (site-schedule, plan de l'atelier I-7) sur les quatre sequences de GDC 0.20, lues par
// index.json seulement : chaque chronologie complete se lit (schema 1), ses lignes s'accrochent a l'arbre, ses jalons a
// une ligne, ses coches a une ligne, son axe du temps est croissant ; chaque mise a jour (depuis) appliquee sur le pas
// precedent redonne la chronologie complete du pas. Les ecarts qui viennent du contrat de GDC sont comptes a part et
// ne font pas echouer le controle : ils sont ecrits dans docs/planning-retour-atelier-I6-I7.md.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { modele } from "../components/interface/site-schedule/index.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SEQUENCES = ["projet-type", "trois-applications", "projet-long", "volume"];
const lis = async (seq, f) => JSON.parse(await readFile(join(ROOT, "fixtures", seq, f), "utf8"));

const erreurs = [];
const ecarts = new Map(); // ecart du contrat de GDC -> exemples
let verifs = 0;
const verifie = (ok, quoi) => {
  verifs += 1;
  if (!ok) erreurs.push(quoi);
};
const ecart = (quoi, ex) => {
  if (!ecarts.has(quoi)) ecarts.set(quoi, []);
  ecarts.get(quoi).push(ex);
};

// le schema : 1 se lit, tout autre numero donne « donnees illisibles »
verifie(modele.lisible({ schema: 1 }), "schema 1 lisible");
for (const s of [2, 0, "1", null, undefined]) verifie(!modele.lisible({ schema: s }), `schema ${String(s)} illisible`);
verifie(!modele.lisible(null), "chronologie absente illisible");

const ms = (iso) => Date.parse(iso);
const tempsVolume = [];

for (const seq of SEQUENCES) {
  const index = await lis(seq, "index.json");
  let etat = null;
  for (const pas of index.etapes) {
    const ou = `${seq} ${String(pas.numero).padStart(2, "0")}`;
    const complete = await lis(seq, pas.chronologie);
    const depuis = await lis(seq, pas.depuis);
    verifie(modele.lisible(complete), `${ou} : chronologie illisible`);
    if (pas === index.etapes[0]) verifie(depuis.complet === true, `${ou} : le premier depuis n'est pas complet`);

    // la chronologie complete, telle que le planning la lit
    const t0 = performance.now();
    const c = modele.fusionne(null, complete);
    const a = modele.arbre(c);
    const ax = modele.axe(c);
    const k = modele.coches(c, a);
    const jalons = modele.jalonsParLigne(c);
    const tout = modele.visibles(a, new Set(a.lignes.keys()));
    let elementsPoses = 0;
    for (const v of tout) elementsPoses += modele.elements(a.lignes.get(v.id), ax, jalons.get(v.id), k.parLigne.get(v.id), c.fuseau).length;
    const duree = performance.now() - t0;
    if (seq === "volume") tempsVolume.push([pas.numero, duree, tout.length, elementsPoses]);

    verifie(a.racines.length === 10, `${ou} : ${a.racines.length} etapes au lieu de dix`);
    verifie(a.orphelines.length === 0, `${ou} : lignes sans parent ${a.orphelines.slice(0, 3).join(", ")}`);
    verifie(tout.length === a.lignes.size - (a.applications <= 1 ? c.lignes.filter((l) => l.niveau === "application").length : 0), `${ou} : des lignes manquent a l'arbre`);
    for (const j of c.jalons) verifie(a.lignes.has(j.ligne), `${ou} : jalon ${j.id} sur une ligne absente`);
    verifie(k.perdues.length === 0, `${ou} : coches sans ligne ${k.perdues.slice(0, 3).join(", ")}`);
    const traits = c.evenements.filter((e) => e.trait).length;
    const posees = [...k.parLigne.values()].reduce((n, l) => n + l.length, 0);
    verifie(posees === traits, `${ou} : ${posees} coches posees pour ${traits} traits`);
    // l'axe : segments croissants, x croissant avec le temps, chaque evenement dans la largeur
    let avant = -Infinity;
    for (const [d, f, x0, x1] of ax.segments) {
      verifie(d <= f && x0 <= x1 && x0 >= avant - 1e-6, `${ou} : segment de l'axe decroissant`);
      avant = x1;
    }
    const ts = c.evenements.map((e) => ms(e.ts)).filter(Number.isFinite).sort((p, q) => p - q);
    let xa = -Infinity;
    for (const t of ts) {
      const x = ax.xDe(t);
      verifie(x !== null && x >= xa - 1e-6 && x <= ax.largeur, `${ou} : x(${new Date(t).toISOString()}) hors de l'axe`);
      xa = x;
    }
    // avant l'ouverture du projet, aucun jour : pas d'axe, seulement le futur
    if (c.maintenant && ax.segments.length) verifie(ax.xMaintenant !== null && ax.xMaintenant >= xa - 1e-6, `${ou} : maintenant avant le dernier evenement`);
    for (const v of c.a_venir) verifie(ax.futur.has(v.ligne), `${ou} : a_venir ${v.ligne} sans place`);
    for (const [, p] of ax.futur) verifie(p.x >= ax.futur0 && p.w === 2 * 240, `${ou} : un element a venir n'a pas la largeur de deux jours actifs`);
    // les jours vides : une colonne etroite, deux ou plus un pli ; jamais un jour actif replie
    const jours = c.jours;
    for (const col of ax.colonnes.filter((x) => x.sorte === "pli")) verifie(col.jours.length >= 2 && col.jours.every((d) => !jours.find((j) => j.date === d)?.actif), `${ou} : pli qui contient un jour actif`);
    verifie(ax.colonnes.filter((x) => x.sorte === "jour").length === jours.filter((j) => j.actif).length, `${ou} : jours actifs perdus`);
    // un pli deplie : ses jours en colonnes, l'axe reste croissant
    const plis = ax.colonnes.filter((x) => x.sorte === "pli").map((x) => x.date);
    if (plis.length) {
      const ouvert = modele.axe(c, new Set(plis));
      verifie(!ouvert.colonnes.some((x) => x.sorte === "pli") && ouvert.largeur > ax.largeur, `${ou} : un pli ne se deplie pas`);
    }

    // la mise a jour : appliquee sur le pas precedent, elle redonne la chronologie complete du pas
    etat = modele.fusionne(etat, depuis);
    const parId = (xs, cle = "id") => new Map(xs.map((x) => [x[cle], JSON.stringify(x)]));
    const compare = (nom, a1, b1, cle) => {
      const A = parId(a1, cle);
      const B = parId(b1, cle);
      for (const [id, v] of B) if (A.get(id) !== v) {
        const avantId = A.has(id);
        const l = b1.find((x) => x[cle] === id);
        ecart(avantId ? `${nom} « ${l.niveau ?? ""} » changé(e) sans figurer dans depuis` : `${nom} absent(e) de depuis`, `${ou} ${id}`);
      }
      for (const id of A.keys()) if (!B.has(id)) ecart(`${nom} disparu(e) sans figurer dans retirees`, `${ou} ${id}`);
    };
    compare("ligne", etat.lignes, c.lignes, "id");
    compare("jalon", etat.jalons, c.jalons, "id");
    compare("jour", etat.jours, c.jours, "date");
    compare("événement", etat.evenements, c.evenements, "id");
    verifie(JSON.stringify(etat.a_venir) === JSON.stringify(c.a_venir), `${ou} : a_venir differe apres la mise a jour`);
    // le planning suit la chronologie complete du pas a partir d'ici : un ecart ne se propage pas d'un pas a l'autre
    etat = c;
  }
}

console.log(`Planning : ${erreurs.length} erreur(s) sur ${verifs} vérifications (${SEQUENCES.join(", ")})`);
for (const e of erreurs.slice(0, 30)) console.log(`  ✗ ${e}`);
for (const [n, d, lignes, poses] of tempsVolume)
  console.log(`  volume ${n} : ${lignes} lignes, ${poses} éléments posés, modèle complet en ${d.toFixed(1)} ms (Node)`);
if (ecarts.size) {
  console.log("  Écarts du contrat de GDC (docs/planning-retour-atelier-I6-I7.md), sans échec :");
  for (const [quoi, ex] of ecarts) console.log(`    · ${quoi} : ${ex.length} (${ex.slice(0, 2).join(" ; ")})`);
}
process.exit(erreurs.length ? 1 : 0);
