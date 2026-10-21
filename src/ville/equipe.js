// Les personnes de la carte : les agents d'equipe.json (qui est qui, docs/correspondances.md), les ouvriers et les
// usagers de la vie du chantier. Les parametres sont ceux que le composant character recoit ; il ne sait pas qui il
// represente.
import equipe from "../../components/kit/character-kit/equipe.json" with { type: "json" };
import { fichiersDe } from "../../components/character/character/habillage.js";
import { choisis } from "./graine.js";

export const PERSONNES = equipe.personnes;
const parId = new Map(PERSONNES.map((p) => [p.id, p]));

// Les roles de GDC qui ne se reconnaissent pas au prenom (schema 3 : role d'un personnage).
const ROLES = {
  gdc: "helene",
  architecte: "claire",
  geometre: "marc",
  designer: "lina",
  conducteur: "yves",
  "chef-de-chantier": "victor",
  "developpeur-interface": "emma",
  "developpeur-base": "julie",
  "developpeur-serveur": "robin",
  surveillant: "olivier",
  reception: "anne",
  concierge: "bernard",
  representante: "fanny",
  "expert-securite": "sarah",
  client: "client",
};

// Les parametres du composant character pour une personne d'equipe.json : ce que GDC lui passera.
export function parametresDe(p) {
  return {
    trade: p.metier,
    team: p.equipe,
    body: p.morpho,
    skin: p.peau,
    hair: p.coiffure,
    hairColor: p.cheveux,
    beard: p.barbe,
    glasses: p.lunettes,
    tool: p.outil ?? "none",
  };
}

// Les fichiers d'une personne seulement : le chargeur n'en copie pas d'autres.
export function metaPersonne(params) {
  return { id: "character", category: "character", assets: fichiersDe(params) };
}

const sansAccent = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// La personne d'equipe.json d'un personnage de GDC : par son prenom (« Claire, l'architecte »), sinon par son role ;
// null si on ne la connait pas (la carte la signale et la pose en tenue d'etudes).
export function personneDe(element) {
  const prenom = sansAccent(String(element.nom || "").split(/[,\s]/)[0]);
  if (parId.has(prenom)) return parId.get(prenom);
  if (parId.has(ROLES[element.role])) return parId.get(ROLES[element.role]);
  if (parId.has(element.id)) return parId.get(element.id);
  return null;
}

// Le visage d'un ouvrier ou d'un usager : tire du meme kit que les agents, dans l'ordre fixe par la graine.
function visage(alea) {
  const body = choisis(alea, ["M", "F"]);
  return {
    body,
    skin: choisis(alea, ["A", "B", "C", "D", "E"]),
    hair: choisis(
      alea,
      body === "F"
        ? ["bun", "ponytail", "bob", "long", "crop"]
        : ["short", "side", "crop"],
    ),
    hairColor: choisis(alea, ["black", "brown", "blond", "red", "grey"]),
    beard: body === "M" && alea() < 0.35,
    glasses: alea() < 0.15,
  };
}

// L'ouvrier, en attendant character 1.2.0 (worker) : la tenue du chef d'equipe (bleu de travail et gilet), que
// l'assemblage recolore (casque gris, gilet jaune fluo). Le signaleur garde le talkie-walkie.
export function parametresOuvrier(alea, radio = false) {
  return {
    trade: "foreman",
    team: "site",
    tool: radio ? "radio" : "none",
    ...visage(alea),
  };
}

// L'usager, en attendant character 1.2.0 (civilian) : la tenue de ville du client, sans casque, que l'assemblage
// recolore dans un coloris vif pour que le client reste le seul en civil graphite.
export function parametresUsager(alea) {
  return { trade: "client", team: "none", tool: "none", ...visage(alea) };
}
