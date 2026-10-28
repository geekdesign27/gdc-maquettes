// La planche de l'equipe : chaque personne de equipe.json jouee par le composant character, avec les parametres que GDC
// lui passera, sur un socle maquette, devant un mur a porte et un garde-corps du kit de batiment (l'echelle). Les etats du
// composant s'appliquent a toute l'equipe. Outil de la galerie seulement : il n'est pas livre a GDC.
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { materiauPalette } from "./etalon.js";
import {
  PERSONNES,
  parametresDe,
  metaPersonne,
  parametresOuvrier,
  parametresUsager,
} from "./ville/equipe.js";
import { alea } from "./ville/graine.js";

export const PERSONNAGE_ID = "personnage";
export { PERSONNES, parametresDe, metaPersonne };
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
const KIT_BATIMENT = "kit:building-kit/BLD_KIT_A_v004.glb";
const RANG = 10; // personnes par rang sur le socle
const PAS = 0.9;
const SOCLE = { taille: [10.6, 0.6, 4.4], chanfrein: 0.1 }; // bible 18.5 : 0,60 m de terre, aretes du dessus en C3

export function entree(catalogue) {
  return catalogue.items.find((i) => i.id === "character-kit");
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

// La planche de la vie du chantier (character 1.2.0, criteres d'acceptation de la fiche) : au fond, un agent de
// l'equipe site (Yves), deux ouvriers (dont un qui porte), la barriere de blocage et la grue ; devant, le client, trois
// badauds (les trois coloris de ville), un usager et Fanny. Les visages des ouvriers et des passants sont tires d'une
// graine, comme sur la carte. Outil de la galerie seulement.
export const VIE_ID = "personnage-vie";
export const ETATS_VIE = ["idle", "walk", "work", "carry", "talk", "waiting"];
export function membresVie() {
  const ouvrier = (n) => parametresOuvrier(alea(`galerie:ouvrier:${n}`));
  const passant = (n, c) => parametresUsager(alea(`galerie:passant:${n}`), c);
  const agent = (id) => parametresDe(PERSONNES.find((p) => p.id === id));
  return [
    { params: agent("yves"), position: [-4.0, -1.1] },
    { params: ouvrier(1), position: [-2.9, -1.1], ouvrier: true },
    { params: ouvrier(2), position: [-1.8, -1.1], ouvrier: true, porte: true },
    { id: "blocked-sign", position: [-0.3, -1.3] },
    { id: "crane", params: { height: 6 }, position: [3.2, -1.2] },
    { params: agent("client"), position: [-4.0, 1.1] },
    { params: passant(1, "a"), position: [-2.9, 1.1] },
    { params: passant(2, "b"), position: [-1.8, 1.1] },
    { params: passant(3, "c"), position: [-0.7, 1.1] },
    { params: passant(4, "a"), position: [0.4, 1.1] },
    { params: agent("fanny"), position: [1.5, 1.1] },
  ];
}

// instances : une par membre de membresVie(), dans le meme ordre. etat : un de ETATS_VIE ; carry n'est joue que par
// les ouvriers (les autres marchent), comme sur la carte. data.headlamp : la nuit, les lampes des casques.
export function createVie(THREE, instances, ctx) {
  const membres = membresVie();
  const root = new THREE.Group();
  root.name = "planche-vie";
  const ombres = ctx.quality === "high";
  instances.forEach((inst, i) => {
    const [x, z] = membres[i].position;
    inst.root.position.set(x, 0, z);
    root.add(inst.root);
  });
  const [l, h, pr] = [10.6, SOCLE.taille[1], 4.4];
  const geometrie = new RoundedBoxGeometry(l, h, pr, 3, SOCLE.chanfrein);
  const sol = materiauPalette(THREE, "MAT_EARTH");
  const socle = new THREE.Mesh(geometrie, sol);
  socle.position.set(0.6, -h / 2, -0.2);
  socle.receiveShadow = ombres;
  root.add(socle);
  const personnes = instances.filter((_, i) => !membres[i].id);
  return {
    root,
    personnages: personnes.map((inst) => inst.root),
    setState(etat, data = {}) {
      instances.forEach((inst, i) => {
        const m = membres[i];
        if (m.id) {
          inst.setState(m.id === "crane" ? "idle" : "default");
          return;
        }
        // le second ouvrier porte toujours : la planche montre le sac, quel que soit l'etat choisi
        const e = m.porte ? "carry" : etat === "carry" && !m.ouvrier ? "walk" : etat;
        inst.setState(e, { facing: 0.6, headlamp: data.headlamp === true });
        if (!ctx.reducedMotion) inst.update(((i * 0.37) % 1) * 2);
      });
    },
    update(dt) {
      let encore = false;
      for (const inst of personnes) encore = inst.update(dt) || encore;
      return encore;
    },
    anchor(nom) {
      throw new Error(`ancre inconnue : ${nom}`);
    },
    dispose() {
      for (const inst of instances) inst.dispose();
      geometrie.dispose();
      sol.dispose();
    },
  };
}
