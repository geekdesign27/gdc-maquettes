// La planche de l'equipe : chaque personne de equipe.json jouee par le composant character, avec les parametres que GDC
// lui passera, sur un socle maquette, devant un mur a porte et un garde-corps du kit de batiment (l'echelle). Les etats du
// composant s'appliquent a toute l'equipe. Outil de la galerie seulement : il n'est pas livre a GDC.
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { materiauPalette } from "./etalon.js";
import equipe from "../components/kit/character-kit/equipe.json" with { type: "json" };
import { fichiersDe } from "../components/character/character/habillage.js";

export const PERSONNAGE_ID = "personnage";
export const PERSONNES = equipe.personnes;
// Qui occupe les postes (ancres desk:n) de chaque lieu, d'apres docs/correspondances.md : la galerie les y pose pour la
// planche ; GDC, lui, place ses propres personnages.
export const OCCUPANTS = {
  "architect-office": ["claire"],
  "client-office": ["client", "fanny"],
  "control-office": ["helene"],
  "site-office": ["yves", "victor"],
  "design-office": ["marc", "lina", "paul", "iris", "noah", "tom", "sarah", "david"],
  "reception-area": ["anne", "client", "olivier"],
};
// L'etat que jouent les occupants dans la galerie : work par defaut ; Helene controle (docs/ville.md : inspect).
// Les agents de passage d'exemple, aux places crew:n d'un lieu (ceux qui ont fini reviennent a la baraque).
export const PASSAGE = { "site-office": ["emma", "julie", "robin"] };
export const ETAT_OCCUPANTS = { "control-office": "inspect" };
const KIT_BATIMENT = "kit:building-kit/BLD_KIT_A_v001.glb";
const RANG = 10; // personnes par rang sur le socle
const PAS = 0.9;
const SOCLE = { taille: [10.6, 0.6, 4.4], chanfrein: 0.1 }; // bible 18.5 : 0,60 m de terre, aretes du dessus en C3

export function entree(catalogue) {
  return catalogue.items.find((i) => i.id === "character-kit");
}

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

export function metaDecor() {
  return { id: "character", category: "character", assets: [KIT_BATIMENT] };
}

// personnages : une instance du composant character par personne, dans l'ordre de PERSONNES ; decor : une copie du
// kit de batiment (metaDecor). Seuls le socle et son materiau sont liberes ici, avec les personnages.
export function create(THREE, personnages, decor, ctx) {
  const root = new THREE.Group();
  root.name = "planche-equipe";
  const ombres = ctx.quality === "high";

  // Deux rangs de dix, face a la camera.
  personnages.forEach((inst, i) => {
    const rang = Math.floor(i / RANG);
    inst.root.position.set(
      ((i % RANG) - (RANG - 1) / 2) * PAS,
      0,
      rang === 0 ? -0.55 : 0.55,
    );
    root.add(inst.root);
  });

  // L'echelle : le mur a porte et un garde-corps du kit de batiment.
  const kit = decor[KIT_BATIMENT].scene;
  const mur = kit.getObjectByName("BLD_KIT_A_WALL_RENDER_DOOR").clone();
  mur.position.set(0, 0, -1.6);
  const gardeCorps = kit.getObjectByName("BLD_KIT_A_GUARDRAIL").clone();
  gardeCorps.rotation.y = Math.PI / 2;
  gardeCorps.position.set(5.0, 0, 0);
  root.add(mur, gardeCorps);

  const [l, h, pr] = SOCLE.taille;
  const geometrie = new RoundedBoxGeometry(l, h, pr, 3, SOCLE.chanfrein);
  const sol = materiauPalette(THREE, "MAT_EARTH");
  const socle = new THREE.Mesh(geometrie, sol);
  socle.position.set(0.2, -h / 2, -0.4);
  socle.receiveShadow = ombres;
  root.add(socle);
  for (const o of [mur, gardeCorps])
    o.traverse((x) => {
      if (x.isMesh) x.castShadow = x.receiveShadow = ombres;
    });

  return {
    root,
    personnages: personnages.map((inst) => inst.root),
    setState(etat, data) {
      personnages.forEach((inst, i) => {
        inst.setState(etat, data);
        // chacun a son rythme : la planche ne bouge pas comme un seul homme (sans animation, rien ne bouge)
        if (!ctx.reducedMotion && etat !== "celebrate")
          inst.update(((i * 0.37) % 1) * 2);
      });
    },
    update(dt) {
      let encore = false;
      for (const inst of personnages) encore = inst.update(dt) || encore;
      return encore;
    },
    anchor(nom) {
      throw new Error(`ancre inconnue : ${nom}`);
    },
    dispose() {
      for (const inst of personnages) inst.dispose();
      geometrie.dispose();
      sol.dispose();
    },
  };
}
