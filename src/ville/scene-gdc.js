// Lire une scene de GDC (gdc scene, schema 3 : plan, elements, actions ; contrat dans docs/maquette.md du depot GDC)
// pour la carte : les batiments dans l'ordre des parcelles, leur phase, les personnages et leur lieu, le regime du
// chantier et les zones deja activees. Sans Three.js ; ne change rien a la scene recue.
import { STAGES, groupFloors, floorsFromEtages, floorPlate } from "../etages.js";

export const REGIMES = ["ferme", "ouvert", "pause"];
// Les types de batiment de GDC vers le parametre type de building.
const TYPES = {
  immeuble: "block",
  maison: "house",
  halle: "hall",
  block: "block",
  house: "house",
  hall: "hall",
};

// Le lieu d'un personnage : « bureau-etudes », ou « batiment:<id> » (sa parcelle), avec etage et piece.
export function lisLieu(lieu) {
  const s = String(lieu || "");
  return s.startsWith("batiment:")
    ? { batiment: s.slice("batiment:".length) }
    : { lieu: s || null };
}

// La phase d'un batiment pour la vie du chantier : le stade de son etage en chantier le plus haut (une surelevation
// travaille en haut), ou completed s'il est entierement habite ; habite : au moins un etage fini et livre.
export function phaseDe(batiment) {
  const etages = Array.isArray(batiment.etages) ? batiment.etages : [];
  if (!etages.length)
    return {
      phase: STAGES.includes(batiment.etat) ? batiment.etat : "plot",
      habite: batiment.etat === "completed",
      etage: 1,
    };
  const visibles = groupFloors(floorsFromEtages(etages), batiment.etat);
  // building 2.0.0 : tant que le rez n'est pas debout (structure), les etages au-dessus attendent en plot ; la vie du
  // chantier (ouvriers, grue) suit donc le rez, ce que le batiment montre (volume : un rez regroupe en plot sous des
  // etages en envelope ne montre que des gabarits, et montait une grue)
  if (STAGES.indexOf(visibles[0].stage) < STAGES.indexOf("structure"))
    return { phase: visibles[0].stage, habite: false, etage: 1 };
  const enChantier = visibles.filter((f) => f.stage !== "completed");
  const habite = visibles.some((f) => f.stage === "completed");
  if (!enChantier.length)
    return { phase: "completed", habite: true, etage: visibles.length };
  const haut = enChantier[enChantier.length - 1];
  return { phase: haut.stage, habite, etage: haut.index, surelevation: habite };
}

// scene : la scene de GDC ; connus : les identifiants de composants de la bibliotheque (un element d'un autre type est
// ignore et signale).
export function lisScene(scene, connus) {
  const elements = Array.isArray(scene?.elements) ? scene.elements : [];
  const inconnus = [];
  const gardes = [];
  for (const e of elements) {
    if (!e || !e.element || !e.id) continue;
    if (connus && !connus.has(e.element))
      inconnus.push(
        `${e.element} « ${e.id} » : composant absent du catalogue, ignoré`,
      );
    else gardes.push(e);
  }
  // les batiments dans l'ordre des parcelles du plan ; un batiment hors plan prend la parcelle suivante
  const ordre = (scene?.plan?.parcelles || []).map((p) => p.batiment);
  const batiments = gardes.filter((e) => e.element === "building");
  for (const b of batiments) if (!ordre.includes(b.id)) ordre.push(b.id);
  const parcelle = new Map(ordre.map((id, k) => [id, k]));
  // le type de chaque parcelle : celui du batiment, sinon celui du plan
  const types = ordre.map((id) => {
    const b = batiments.find((x) => x.id === id);
    const p = (scene?.plan?.parcelles || []).find((x) => x.batiment === id);
    return TYPES[b?.type || p?.type] || "block";
  });
  // le plateau de chaque parcelle (building 3.0.0) : la largeur du type, elargie par les lots de l'etage le plus charge
  const plateaux = ordre.map((id, k) => {
    const b = batiments.find((x) => x.id === id);
    return floorPlate(floorsFromEtages(b?.etages), types[k]);
  });
  const personnages = gardes
    .filter((e) => e.element === "character")
    .map((e) => ({ ...e, ...lisLieu(e.lieu) }));
  const surParcelle = (id) => personnages.filter((p) => p.batiment === id);

  const zones = {};
  for (const z of scene?.plan?.zones || []) zones[z.id] = Boolean(z.activee);

  const chantier = scene?.chantier || {};
  return {
    regime: REGIMES.includes(chantier.regime) ? chantier.regime : "ferme",
    zones,
    applications: Math.max(ordre.length, 1),
    types: types.length ? types : ["block"],
    plateaux: plateaux.length ? plateaux : null,
    parcelle,
    elements: new Map(gardes.map((e) => [e.id, e])),
    batiments: batiments.map((b) => ({
      ...b,
      index: parcelle.get(b.id),
      type: TYPES[b.type] || "block",
      ...phaseDe(b),
      agents: surParcelle(b.id).map((p) => p.id),
      grue: gardes.some((e) => e.element === "crane" && e.ancre === b.id),
      bloque: gardes.some(
        (e) => e.element === "blocked-sign" && e.ancre === b.id,
      ),
      floors: floorsFromEtages(b.etages, [
        ...new Set(
          surParcelle(b.id)
            .map((p) => p.etage)
            .filter(Boolean),
        ),
      ]),
    })),
    personnages,
    inconnus,
  };
}

// Les actions d'une scene, dans l'ordre de leur horodatage (l'ordre recu departage), groupees par instant.
export function instants(actions) {
  const liste = (Array.isArray(actions) ? actions : []).map((a, i) => ({
    a,
    i,
  }));
  liste.sort(
    (x, y) =>
      String(x.a.ts || "").localeCompare(String(y.a.ts || "")) || x.i - y.i,
  );
  const groupes = [];
  for (const { a } of liste) {
    const dernier = groupes[groupes.length - 1];
    if (dernier && dernier.ts === (a.ts || "")) dernier.actions.push(a);
    else groupes.push({ ts: a.ts || "", actions: [a] });
  }
  return groupes;
}
