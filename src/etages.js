// Les etages d'un batiment (lot G8, building 2.0.0 et floor-selector) : une fiche par etage, la plus ancienne en bas
// (ADR 0013 de GDC). La regle des six etages est ecrite ici une fois ; le batiment la recoit en ctx.groupFloors, le
// selecteur d'etages la reprendra, pour qu'ils montrent toujours les memes etages. Decisions de Pierre-Alain du
// 21 octobre 2026 : au-dela de six, le rez prend juste assez de fiches (n - 5), les livrees les plus anciennes d'abord,
// puis les plus anciennes ; il prend l'aspect du moins avance d'entre elles ; survole, il vaut son application.

// Les huit stades, du moins avance au plus avance (les etats de building).
export const STAGES = [
  "plot",
  "excavation",
  "foundations",
  "structure",
  "envelope",
  "finishing",
  "inspection",
  "completed",
];
export const MAX_FLOORS = 6;

const rank = (stage) => STAGES.indexOf(stage);
const delivered = (f) =>
  f.delivered === undefined ? f.stage === "completed" : Boolean(f.delivered);

// floors : du bas vers le haut, une entree par fiche ({ id, stage, rooms, occupied, delivered? }).
// Rend les etages visibles, du bas vers le haut : { index (1 pour le rez), ids, stage, rooms, occupied, grouped,
// floors (les entrees regroupees) }. Un etage sans stade connu prend fallback (l'etat du batiment).
export function groupFloors(floors, fallback = "plot", max = MAX_FLOORS) {
  const list = (Array.isArray(floors) ? floors : [])
    .filter((f) => f && typeof f === "object")
    .map((f) => ({
      ...f,
      stage: STAGES.includes(f.stage) ? f.stage : fallback,
    }));
  let rez = [];
  let rest = list;
  if (list.length > max) {
    const need = list.length - (max - 1);
    const picked = new Set(list.filter(delivered).slice(0, need));
    for (const f of list) if (picked.size < need) picked.add(f);
    rez = list.filter((f) => picked.has(f));
    rest = list.filter((f) => !picked.has(f));
  }
  const groups = rez.length
    ? [rez, ...rest.map((f) => [f])]
    : rest.map((f) => [f]);
  return groups.map((g, i) => {
    // le moins avance donne l'aspect, et ses pieces
    const least = g.reduce((a, b) => (rank(b.stage) < rank(a.stage) ? b : a));
    return {
      index: i + 1,
      ids: g.map((f) => (f.id === undefined ? null : f.id)),
      stage: least.stage,
      rooms: Array.isArray(least.rooms) ? least.rooms : [],
      occupied: g.some((f) => Boolean(f.occupied)),
      grouped: g.length > 1,
      floors: g,
    };
  });
}

// La reference d'un etage visible, ou d'une de ses pieces (le survol de la carte) : un etage complete la reference de
// son batiment par sa fiche, une piece celle de son etage par son lot (contrat, « Le survol partage »). Le rez regroupe
// et une fiche sans identifiant (l'existant) valent leur application.
export function refOf(buildingRef, floor, room) {
  const app = buildingRef && buildingRef.application;
  if (!app) return null;
  const fiche = floor && !floor.grouped ? floor.ids[0] : null;
  if (fiche === null || fiche === undefined) return { application: app };
  if (!room || room.id === undefined || room.id === null)
    return { application: app, fiche };
  return { application: app, fiche, lot: room.id };
}

// L'ancre la plus precise pour une reference survolee ailleurs : room:n-m pour un lot, floor:n pour une fiche, null
// pour l'application (l'anneau va au batiment) ou une reference d'ailleurs. Une fiche fondue dans le rez regroupe, ou
// un de ses lots, allume le rez (floor:1). visible : le resultat de groupFloors.
export function anchorFor(visible, buildingRef, ref) {
  if (!ref || !buildingRef || ref.application !== buildingRef.application)
    return null;
  if (ref.fiche === undefined || ref.fiche === null) return null;
  const floor = visible.find((f) => f.ids.includes(ref.fiche));
  if (!floor) return null;
  if (ref.lot !== undefined && ref.lot !== null && !floor.grouped) {
    const m = floor.rooms.findIndex((r) => r && r.id === ref.lot);
    if (m >= 0) return `room:${floor.index}-${m + 1}`;
  }
  return `floor:${floor.index}`;
}

// Les etages d'un batiment de la scene de GDC (schema 3 : etages, pieces) vers data.floors de building. occupied :
// les fiches ou un agent travaille (lieu batiment:<id>, etage), que l'assemblage tire des personnages.
export function floorsFromEtages(etages, occupied = []) {
  return (Array.isArray(etages) ? etages : []).map((e) => ({
    id: e.fiche,
    stage: e.stade,
    delivered: Boolean(e.livre),
    rooms: (e.pieces || []).map((p) => ({
      id: p.lot,
      done: p.statut === "fini",
    })),
    occupied: occupied.includes(e.fiche),
  }));
}
