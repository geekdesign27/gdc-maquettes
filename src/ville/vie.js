// La vie du chantier (docs/vie-du-chantier.md, choix de Pierre-Alain du 21 octobre 2026) : qui travaille sur chaque
// parcelle et a quoi, tire uniquement de l'etat envoye par GDC (le regime, la phase de chaque batiment, les agents
// presents sur sa parcelle) et d'une graine. Elle n'ajoute aucun fait : ni badge, ni nom, ni clic. Sans Three.js ;
// l'assemblage (carte.js) joue les taches.
import { alea, entre, choisis } from "./graine.js";

// Les ouvriers d'une phase, quand au moins un agent travaille sur la parcelle (section 4) ; [2, 3] : deux ou trois.
export const EFFECTIFS = {
  plot: 0,
  excavation: 2,
  foundations: 2,
  structure: 3,
  envelope: 3,
  finishing: [2, 3],
  inspection: 1,
  completed: 0,
};
export const EFFECTIF_SURELEVATION = 2;
// Les plafonds, le budget de la scene ; en qualite basse, moins encore. usagers : par batiment habite, et sur la carte.
export const PLAFONDS = {
  high: { carte: 12, batiment: 4, usagers: 3, usagersCarte: 6 },
  low: { carte: 4, batiment: 1, usagers: 1, usagersCarte: 2 },
};
export const DUREE_TACHE = [8, 20]; // s, une petite tache d'ouvrier
const PAUSE_USAGER = [6, 15]; // s, un usager reste dedans ou dehors

const effectifDe = (b, graine) => {
  if (b.surelevation) return EFFECTIF_SURELEVATION;
  const e = EFFECTIFS[b.phase] ?? 0;
  return Array.isArray(e)
    ? choisis(alea(`${graine}:${b.id}:${b.phase}`), e)
    : e;
};

// Les ouvriers de la carte, dans l'ordre des parcelles : { cle, batiment, index, phase, rang, rangement, graine }.
// lu : lisScene ; force : chaque parcelle prend son plafond (la mesure de fluidite de la galerie).
// Une meme parcelle garde les memes ouvriers (cle et visage par batiment et par rang) d'une scene a l'autre.
export function equipes(
  lu,
  { quality = "high", graine = "gdc", force = false } = {},
) {
  const plafond = PLAFONDS[quality === "low" ? "low" : "high"];
  if (lu.regime === "ferme") return [];
  const parBatiment = [...lu.batiments]
    .sort((a, b) => a.index - b.index)
    .map((b) => {
      let n = effectifDe(b, graine);
      const rangement = n > 0 && !force && !b.agents.length;
      if (rangement) n = 1; // sans agent sur la parcelle, un ouvrier range
      if (force) n = plafond.batiment; // la mesure : chaque parcelle prend son plafond, quelle que soit sa phase
      n = Math.min(n, plafond.batiment);
      return Array.from({ length: n }, (_, rang) => ({
        cle: `ouvrier:${b.id}:${rang + 1}`,
        batiment: b.id,
        index: b.index,
        phase: b.surelevation ? "surelevation" : b.phase,
        etage: b.etage,
        rang,
        rangement,
        bloque: b.bloque,
        grue: b.grue,
        graine: `${graine}:${b.id}:${rang + 1}`,
      }));
    });
  // le plafond de la carte : chacun son tour, pour qu'aucune parcelle ne reste vide
  const retenus = [];
  for (let tour = 0; retenus.length < plafond.carte; tour++) {
    let pris = false;
    for (const liste of parBatiment)
      if (liste[tour] && retenus.length < plafond.carte) {
        retenus.push(liste[tour]);
        pris = true;
      }
    if (!pris) break;
  }
  return retenus.sort((a, b) => a.index - b.index || a.rang - b.rang);
}

// Les usagers des batiments habites : un a trois par batiment (section 5), jamais quand le chantier est ferme.
export function usagers(lu, { quality = "high", graine = "gdc" } = {}) {
  const plafond = PLAFONDS[quality === "low" ? "low" : "high"];
  if (lu.regime === "ferme") return [];
  const liste = [];
  for (const b of [...lu.batiments].sort((x, y) => x.index - y.index)) {
    if (!b.habite) continue;
    const n = Math.min(
      1 + Math.floor(alea(`${graine}:${b.id}:usagers`)() * 3),
      plafond.usagers,
    );
    for (let rang = 0; rang < n && liste.length < plafond.usagersCarte; rang++)
      liste.push({
        cle: `usager:${b.id}:${rang + 1}`,
        batiment: b.id,
        index: b.index,
        rang,
        graine: `${graine}:${b.id}:usager:${rang + 1}`,
      });
  }
  return liste;
}

// La tache numero n d'un ouvrier, rejouable : { vers, etat, duree, dedans?, echafaudage? }. vers : un point du sol
// [x, z] ; echafaudage : l'etage ou il travaille (l'assemblage le pose a sa hauteur) ; dedans : il entre par la porte
// et ne se voit plus le temps de la tache.
// parcelle : implantation().parcelles[k] ; abords : abords(parcelle, type) ; points : implantation().points ; porte :
// la porte du batiment [x, z].
export function tache(ouvrier, n, { parcelle, abords, points, porte }) {
  const t = alea(`${ouvrier.graine}:${ouvrier.phase}:${n}`);
  const duree = entre(t, ...DUREE_TACHE);
  const pied = () => choisis(t, abords.pied);
  const facade = () => choisis(t, abords.echafaudage);
  const pair = n % 2 === 0;
  const { rang } = ouvrier;
  if (ouvrier.bloque) return { vers: parcelle.porte, etat: "waiting", duree }; // l'equipe attend pres de la barriere
  if (ouvrier.rangement)
    return pair
      ? { vers: pied(), etat: "work", duree }
      : { vers: points.benne, etat: "work", duree };
  switch (ouvrier.phase) {
    case "excavation":
      // un signaleur reste pres de la pelle et parle a la radio ; l'autre controle le niveau au bord de la fouille
      if (rang === 0)
        return { vers: decale(abords.pelle, t), etat: "talk", duree };
      return pair
        ? { vers: decale(abords.bord, t), etat: "inspect", duree }
        : { vers: pied(), etat: "inspect", duree };
    case "foundations":
      // ils portent les planches du stock a la fouille, puis travaillent au sol
      return pair
        ? { vers: pied(), etat: "work", duree }
        : { vers: points.stock, etat: "work", duree: duree / 2 };
    case "structure":
      // un ouvrier au pied de la grue (quand GDC la pose) ; les autres sur l'echafaudage, au niveau en cours, et des
      // trajets au stock
      if (rang === 0 && ouvrier.grue)
        return {
          vers: [
            parcelle.grue.position[0] + 1.4,
            parcelle.grue.position[2] + 1.6,
          ],
          etat: pair ? "work" : "talk",
          duree,
        };
      if (n % 3 === 2)
        return { vers: points.stock, etat: "work", duree: duree / 2 };
      return {
        vers: facade(),
        echafaudage: ouvrier.etage,
        etat: "work",
        duree,
      };
    case "envelope":
      // sur l'echafaudage a differents niveaux ; un aller-retour vers la benne
      if (rang === 1 && !pair)
        return { vers: points.benne, etat: "work", duree: duree / 2 };
      return {
        vers: facade(),
        echafaudage: 1 + Math.floor(t() * Math.max(ouvrier.etage, 1)),
        etat: "work",
        duree,
      };
    case "finishing":
      // ils entrent et sortent par la porte du batiment ; un porte des dechets a la benne
      if (rang === 1 && !pair)
        return { vers: points.benne, etat: "work", duree: duree / 2 };
      return pair
        ? { vers: porte, etat: "work", duree, dedans: true }
        : { vers: pied(), etat: "work", duree };
    case "inspection":
      // il attend pres de la porte : ce sont les agents de la reception qui travaillent
      return { vers: decale(porte, t), etat: "idle", duree };
    case "surelevation":
      return {
        vers: facade(),
        echafaudage: ouvrier.etage,
        etat: "work",
        duree,
      };
    default:
      return { vers: pied(), etat: "idle", duree };
  }
}

// La pause (regime pause, fiches G8) : les ouvriers rejoignent le point de rassemblement pres de la baraque, en
// attendant le cabanon de la fete (party-shed), et y restent : talk et idle, jamais celebrate (reserve aux agents).
export function placeDePause(ouvrier, k, rassemblement) {
  const t = alea(`${ouvrier.graine}:pause`);
  const angle = (k / 6) * Math.PI * 2 + t() * 0.6;
  const r = 0.9 + (k % 2) * 0.7;
  return [
    rassemblement[0] + Math.cos(angle) * r,
    rassemblement[1] + Math.sin(angle) * r,
  ];
}
export function etatDePause(ouvrier, n) {
  const t = alea(`${ouvrier.graine}:pause:${n}`);
  return { etat: t() < 0.5 ? "talk" : "idle", duree: entre(t, ...DUREE_TACHE) };
}

// La tache numero n d'un usager : de la porte au bord de la parcelle, et retour, a intervalles espaces.
export function tacheUsager(usager, n, { parcelle, porte }) {
  const t = alea(`${usager.graine}:${n}`);
  const duree = entre(t, ...PAUSE_USAGER);
  if (n % 2 === 0) return { vers: porte, etat: "idle", duree, dedans: true };
  return {
    vers: [parcelle.porte[0] + (t() - 0.5) * 8, parcelle.porte[1] - 0.6],
    etat: "idle",
    duree,
  };
}

// un point un peu deplace, pour que deux ouvriers ne se posent pas l'un sur l'autre
function decale([x, z], t) {
  return [x + (t() - 0.5) * 1.2, z + (t() - 0.5) * 1.2];
}
