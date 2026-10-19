// La planche de l'equipe (catalogue : character-kit) : chaque personne de equipe.json assemblee depuis les fichiers du
// kit, comme le fera le composant character. La base (corps, visage, casque, squelette, animations) recoit la coiffure,
// la tenue du metier et l'outil, rebranches sur ses os ; puis les couleurs de la personne : peau, cheveux, equipe
// (casque et pieces _TEAM ; gilet de l'equipe site en orange fluo, bible 18.8), et la cle de forme FEMININE.
// L'equipe est posee sur un socle maquette, devant un mur a porte et un garde-corps du kit de batiment (l'echelle). Les
// animations se choisissent comme des etats. Outil de la galerie seulement : il n'est pas livre a GDC.
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { materiauPalette } from "./etalon.js";
import equipe from "../components/kit/character-kit/equipe.json" with { type: "json" };

export const PERSONNAGE_ID = "personnage";
export const PERSONNES = equipe.personnes;
const BASE = "CHR_BASE_MASTER_v001.glb";
const COIFFURES = "CHR_HAIR_KIT_v001.glb";
const OUTILS = "PRP_CHR_TOOLS_v001.glb";
const KIT_BATIMENT = "kit:building-kit/BLD_KIT_A_v001.glb";
const tenueDe = (metier) => `CHR_OUTFIT_${metier.toUpperCase()}_v001.glb`;
const CASQUE = "CHR_BASE_MASTER_HELMET";
const VISAGE = "CHR_BASE_MASTER_FACE";
const CILS = "CHR_BASE_MASTER_LASHES";
const EQUIPE_GLB = "MAT_FABRIC_SITE"; // le materiau des parties d'equipe dans les GLB
const EQUIPES = {
  architecture: "MAT_FABRIC_ARCHITECTURE",
  studies: "MAT_FABRIC_STUDIES",
  site: "MAT_FABRIC_SITE",
  reception: "MAT_FABRIC_RECEPTION",
  operations: "MAT_FABRIC_OPERATIONS",
  client: "MAT_SURFACE",
};
const RANG = 10; // personnes par rang sur le socle
const PAS = 0.9;
const SOCLE = { taille: [10.6, 0.6, 4.4], chanfrein: 0.1 }; // bible 18.5 : 0,60 m de terre, aretes du dessus en C3

// repos : la pose de reference du squelette (en A) ; les autres : un clip ANM_CHR_<ETAT>.
const ETATS = [
  "repos",
  "idle",
  "walk",
  "work",
  "typing",
  "inspect",
  "read",
  "thinking",
  "waiting",
  "talk",
  "celebrate",
  "blocked",
];
// Sans animation (reducedMotion) : l'instant du clip qui montre l'etat (images 15 et 44 a 30 i/s ; celebrate : pose, bras leves).
const POSE_FIXE = { work: 15 / 30, talk: 15 / 30, celebrate: 44 / 30 };
const UNE_FOIS = new Set(["celebrate"]); // joue une fois, puis idle (docs/correspondances.md)
const IMMOBILE = new Set(["repos", "blocked"]); // blocked se lit immobile (bible 17.4)

export function entree(catalogue) {
  return catalogue.items.find((i) => i.id === "character-kit");
}

// Tous les modeles, pour les charger une fois (chargeur.prepare).
export function meta(entry) {
  return {
    id: entry.id,
    category: entry.category,
    assets: [...entry.assets, KIT_BATIMENT],
    states: ETATS,
    anchors: [],
    budget: entry.budget,
  };
}

// Les fichiers d'une personne : une copie par personne (chargeur.assetsPour).
export function metaPersonne(entry, p) {
  return {
    id: entry.id,
    category: entry.category,
    assets: [BASE, COIFFURES, tenueDe(p.metier), ...(p.outil ? [OUTILS] : [])],
  };
}

export function metaDecor(entry) {
  return { id: entry.id, category: entry.category, assets: [KIT_BATIMENT] };
}

const clipDe = (etat) => "ANM_CHR_" + etat.toUpperCase();

// Rebranche sur la base les pieces d'un autre fichier du kit dont le nom passe garder(nom) : une piece rigide (enfant
// d'un os) passe sous l'os de meme nom de la base ; une piece deformee recoit un squelette fait des os de la base.
function rebranche(THREE, base, source, garder) {
  const os = new Map();
  base.traverse((o) => {
    if (o.isBone) os.set(o.name, o);
  });
  const pieces = [];
  source.traverse((o) => {
    if (!o.isBone && o.name && garder(o.name) && !garder(o.parent?.name ?? ""))
      pieces.push(o);
  });
  for (const piece of pieces) {
    const parent = piece.parent;
    if (parent?.isBone) {
      const cible = os.get(parent.name);
      if (cible) cible.add(piece); // meme position locale sous le meme os
      continue;
    }
    (base.getObjectByName(parent?.name ?? "") ?? base).add(piece);
    piece.traverse((o) => {
      if (!o.isSkinnedMesh) return;
      const squelette = new THREE.Skeleton(
        o.skeleton.bones.map((b) => os.get(b.name)),
        o.skeleton.boneInverses,
      );
      o.bind(squelette, o.bindMatrix);
    });
  }
  return pieces;
}

// Une personne : la base habillee et coloriee. materiau(nom) rend un materiau de palette partage par la planche.
function assemble(THREE, p, assets, materiau, ctx) {
  const { scene, animations } = assets[BASE];
  const style = "CHR_HAIR_" + p.coiffure.toUpperCase();
  rebranche(
    THREE,
    scene,
    assets[COIFFURES].scene,
    (n) =>
      n === style ||
      (p.barbe && n === "CHR_BEARD") ||
      (p.lunettes && n === "CHR_GLASSES"),
  );
  rebranche(THREE, scene, assets[tenueDe(p.metier)].scene, (n) =>
    n.startsWith("CHR_OUTFIT_"),
  );
  if (p.outil) {
    const outil = "PRP_TOOL_" + p.outil.toUpperCase();
    rebranche(
      THREE,
      scene,
      assets[OUTILS].scene,
      (n) => n === outil || n === outil + "_TEAM",
    );
  }

  const casque = scene.getObjectByName(CASQUE);
  if (!p.casque) casque.removeFromParent();
  if (p.morpho !== "F") scene.getObjectByName(CILS).removeFromParent();
  // qualite basse : ce qui mesure moins de 0,30 m disparait (bible 18.3) : les traits du visage et les cils
  for (const nom of [VISAGE, CILS]) {
    const o = scene.getObjectByName(nom);
    if (o) o.visible = ctx.quality === "high";
  }

  const equipeMat = EQUIPES[p.equipe];
  const echanges = {
    MAT_SKIN_B: "MAT_SKIN_" + p.peau,
    MAT_HAIR_BROWN: "MAT_HAIR_" + p.cheveux.toUpperCase(),
  };
  // la piece a laquelle appartient un maillage : le premier ancetre au nom de piece (pas une primitive « _1 », pas un os)
  const pieceDe = (o) => {
    for (let x = o; x; x = x.parent)
      if (/^(CHR|PRP)_/.test(x.name) && !x.isBone && !/_\d+$/.test(x.name))
        return x.name;
    return "";
  };
  // Chaque fichier du kit apporte sa copie des materiaux : tout passe par les materiaux de palette de la planche, un par
  // nom MAT_, si bien qu'un personnage compte ses materiaux comme la fiche (par nom).
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const nom = o.material.name;
    const piece = pieceDe(o);
    let final = nom;
    if (echanges[nom]) final = echanges[nom];
    else if (piece === CASQUE && equipeMat) final = equipeMat;
    else if (nom === EQUIPE_GLB && piece.endsWith("_TEAM") && equipeMat)
      final = piece.includes("_VEST_") && p.equipe === "site" ? "MAT_FABRIC_HIVIS" : equipeMat;
    o.material = materiau(final);
    const k = o.morphTargetDictionary?.FEMININE;
    if (k !== undefined) o.morphTargetInfluences[k] = p.morpho === "F" ? 1 : 0;
  });
  return { scene, animations };
}

// copies : une copie des fichiers de chaque personne (metaPersonne), dans l'ordre de PERSONNES ; decor : une copie du
// kit de batiment (metaDecor). Les geometries des GLB sont partagees : seuls le socle et les materiaux de palette crees
// ici sont liberes.
export function create(THREE, copies, decor, ctx) {
  const root = new THREE.Group();
  root.name = "planche-equipe";
  const ombres = ctx.quality === "high";
  const materiaux = new Map();
  const materiau = (nom) => {
    if (!materiaux.has(nom)) materiaux.set(nom, materiauPalette(THREE, nom));
    return materiaux.get(nom);
  };

  // Deux rangs de dix, face a la camera ; Blender (x, y, z) -> Three (x, z, -y).
  const personnages = PERSONNES.map((p, i) => {
    const { scene, animations } = assemble(THREE, p, copies[i], materiau, ctx);
    const rang = Math.floor(i / RANG);
    scene.position.set(
      ((i % RANG) - (RANG - 1) / 2) * PAS,
      0,
      rang === 0 ? -0.55 : 0.55,
    );
    root.add(scene);
    return {
      personne: p,
      scene,
      animations,
      mixer: new THREE.AnimationMixer(scene),
      action: null,
      decalage: (i * 0.37) % 1,
    };
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
  const sol = materiau("MAT_EARTH");
  const socle = new THREE.Mesh(geometrie, sol);
  socle.position.set(0.2, -h / 2, -0.4);
  root.add(socle);

  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = ombres && o !== socle;
      o.receiveShadow = ombres;
    }
  });

  let etat = "repos";

  function joue(x, suivant) {
    x.mixer.stopAllAction();
    x.action = null;
    if (suivant === "repos") return;
    const clip = THREE.AnimationClip.findByName(x.animations, clipDe(suivant));
    if (!clip) throw new Error(`clip absent du GLB : ${clipDe(suivant)}`);
    x.action = x.mixer.clipAction(clip);
    x.action.setLoop(
      UNE_FOIS.has(suivant) ? THREE.LoopOnce : THREE.LoopRepeat,
      Infinity,
    );
    x.action.clampWhenFinished = true;
    x.action.reset().play();
    if (ctx.reducedMotion) {
      x.mixer.setTime(POSE_FIXE[suivant] ?? 0);
      x.action.paused = true;
    } else if (!UNE_FOIS.has(suivant)) {
      x.mixer.setTime(x.decalage * clip.duration); // chacun a son rythme : la planche ne bouge pas comme un seul homme
    }
  }

  function setState(suivant) {
    if (!ETATS.includes(suivant)) throw new Error(`état inconnu : ${suivant}`);
    etat = suivant;
    for (const x of personnages) {
      joue(x, suivant);
      x.mixer.update(0);
    }
  }

  return {
    root,
    personnages: personnages.map((x) => x.scene),
    get etat() {
      return etat;
    },
    duree() {
      const a = personnages[0].action;
      return a ? a.getClip().duration : 0;
    },
    setState,
    update(dt) {
      if (ctx.reducedMotion || IMMOBILE.has(etat)) return false;
      for (const x of personnages) {
        x.mixer.update(dt);
        if (UNE_FOIS.has(etat) && x.action && !x.action.isRunning())
          joue(x, "idle");
      }
      return true;
    },
    anchor(nom) {
      throw new Error(`ancre inconnue : ${nom}`);
    },
    dispose() {
      for (const x of personnages) {
        x.mixer.stopAllAction();
        x.mixer.uncacheRoot(x.scene);
      }
      geometrie.dispose();
      for (const m of materiaux.values()) m.dispose();
    },
  };
}
