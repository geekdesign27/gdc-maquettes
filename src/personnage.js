// La planche du personnage maitre (catalogue : character-kit) : le corps commun, sans casque (le client) et avec
// casque, sur un socle maquette, devant deux pieces du kit de batiment qui donnent l'echelle (mur a porte de
// 1,10 x 2,40 m, garde-corps de 1,10 m). Les animations du kit se choisissent comme des etats. Le bouton « Planche »
// de la galerie ajoute la grue a cote. Outil de la galerie seulement, comme l'etalon et la demonstration des kits :
// il n'est pas dans la bibliotheque livree a GDC (c'est le composant character qui jouera les etats).
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { materiauPalette } from "./etalon.js";

export const PERSONNAGE_ID = "personnage";
const MODELE = "CHR_BASE_MASTER_v001.glb";
const KIT_BATIMENT = "kit:building-kit/BLD_KIT_A_v001.glb";
const CASQUE = "CHR_BASE_MASTER_HELMET";
const VISAGE = "CHR_BASE_MASTER_FACE";
const SOCLE = { taille: [6, 0.6, 3.4], chanfrein: 0.1 }; // bible 18.5 : 0,60 m de terre, aretes du dessus en C3

// repos : la pose de reference du squelette (en A), sans animation ; les autres : un clip ANM_CHR_<ETAT>.
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
// Sans animation (reducedMotion) : l'instant du clip qui montre l'etat, en secondes (images 15 et 44 a 30 i/s ; celebrate : pose, bras leves).
const POSE_FIXE = { work: 15 / 30, talk: 15 / 30, celebrate: 44 / 30 };
const UNE_FOIS = new Set(["celebrate"]); // joue une fois, puis idle (docs/correspondances.md)
const IMMOBILE = new Set(["repos", "blocked"]); // blocked se lit immobile (bible 17.4)

export function entree(catalogue) {
  return catalogue.items.find((i) => i.id === "character-kit");
}

// Le meta pour le chargeur de modeles : le GLB du personnage et celui du kit de batiment.
export function meta(entry) {
  return {
    id: entry.id,
    category: entry.category,
    assets: [MODELE, KIT_BATIMENT],
    states: ETATS,
    anchors: [],
    budget: entry.budget,
  };
}

const clipDe = (etat) => "ANM_CHR_" + etat.toUpperCase();

// copies : deux copies des modeles (chargeur.assetsPour), une par personnage. Les geometries et materiaux des GLB sont
// partages : seuls ceux du socle sont liberes ici.
export function create(THREE, copies, ctx) {
  const root = new THREE.Group();
  root.name = "planche-personnage";
  const ombres = ctx.quality === "high";

  // Les deux personnages : sans casque devant le mur, avec casque devant la porte. Blender (x, y, z) -> Three (x, z, -y).
  const personnages = copies.map((assets, i) => {
    const { scene, animations } = assets[MODELE];
    scene.position.set(i === 0 ? -1.4 : 0, 0, 0);
    scene.getObjectByName(CASQUE).visible = i === 1;
    // qualite basse : ce qui mesure moins de 0,30 m disparait (bible 18.3) ; les traits du visage font moins de 0,07 m
    scene.getObjectByName(VISAGE).visible = ctx.quality === "high";
    root.add(scene);
    return {
      scene,
      animations,
      mixer: new THREE.AnimationMixer(scene),
      action: null,
    };
  });

  // L'echelle : le mur a porte et un garde-corps du kit de batiment.
  const kit = copies[0][KIT_BATIMENT].scene;
  const mur = kit.getObjectByName("BLD_KIT_A_WALL_RENDER_DOOR").clone();
  mur.position.set(0, 0, -0.9);
  const gardeCorps = kit.getObjectByName("BLD_KIT_A_GUARDRAIL").clone();
  gardeCorps.rotation.y = Math.PI / 2;
  gardeCorps.position.set(2.2, 0, 0);
  root.add(mur, gardeCorps);

  const [l, h, p] = SOCLE.taille;
  const geometrie = new RoundedBoxGeometry(l, h, p, 3, SOCLE.chanfrein);
  const materiau = materiauPalette(THREE, "MAT_EARTH");
  const socle = new THREE.Mesh(geometrie, materiau);
  socle.position.set(0.3, -h / 2, -0.2);
  root.add(socle);

  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = ombres && o !== socle;
      o.receiveShadow = ombres;
    }
  });

  let etat = "repos";

  function joue(p, suivant) {
    p.mixer.stopAllAction();
    p.action = null;
    if (suivant === "repos") return;
    const clip = THREE.AnimationClip.findByName(p.animations, clipDe(suivant));
    if (!clip) throw new Error(`clip absent du GLB : ${clipDe(suivant)}`);
    p.action = p.mixer.clipAction(clip);
    p.action.setLoop(
      UNE_FOIS.has(suivant) ? THREE.LoopOnce : THREE.LoopRepeat,
      Infinity,
    );
    p.action.clampWhenFinished = true;
    p.action.reset().play();
    if (ctx.reducedMotion) {
      p.mixer.setTime(POSE_FIXE[suivant] ?? 0);
      p.action.paused = true;
    }
  }

  function setState(suivant) {
    if (!ETATS.includes(suivant)) throw new Error(`état inconnu : ${suivant}`);
    etat = suivant;
    for (const p of personnages) {
      joue(p, suivant);
      p.mixer.update(0);
    }
  }

  return {
    root,
    personnages: personnages.map((p) => p.scene),
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
      for (const p of personnages) {
        p.mixer.update(dt);
        // celebrate : une fois, puis retour au repos anime (idle)
        if (UNE_FOIS.has(etat) && p.action && !p.action.isRunning())
          joue(p, "idle");
      }
      return true;
    },
    anchor(nom) {
      throw new Error(`ancre inconnue : ${nom}`);
    },
    dispose() {
      for (const p of personnages) {
        p.mixer.stopAllAction();
        p.mixer.uncacheRoot(p.scene);
      }
      geometrie.dispose();
      materiau.dispose();
    },
  };
}
