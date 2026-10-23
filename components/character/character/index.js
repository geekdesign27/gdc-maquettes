// Le personnage (catalogue : character) : un agent, dans son etat. Le corps, le squelette et les animations viennent du
// kit character-kit ; la coiffure, la tenue du metier et l'outil sont rebranches sur ses os (habillage.js), puis il
// recoit ses couleurs : peau, cheveux, equipe (casque et gilet). GDC le deplace ; le composant joue l'animation de l'etat,
// sur place. Il ne sait pas qui il represente : GDC passe l'apparence (components/kit/character-kit/equipe.json).
// Version 1.2.0 (plan D-3) : l'ouvrier (worker) et la tenue de ville (civilian), qui ne sont pas des agents ; la lampe
// frontale (headlamp), dont la lentille brille sans vraie lumiere ; l'etat carry (porter) ; un squelette par personnage.
import { FICHIERS, METIERS, habille } from "./habillage.js";

const ETATS = [
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
  "unknown",
  "carry", // porter : joue par les ouvriers seulement ; GDC ne l'envoie jamais
];
// Sans animation (reducedMotion) : l'instant du clip qui montre l'etat, en secondes (30 images par seconde) ; carry :
// l'image 0, le pas pose et le sac tenu.
const POSE_FIXE = { work: 15 / 30, talk: 15 / 30, celebrate: 44 / 30 };
const UNE_FOIS = new Set(["celebrate"]); // joue une fois, puis idle (docs/correspondances.md)
const IMMOBILE = new Set(["blocked", "unknown"]); // blocked se lit immobile ; unknown aussi, et grise (bible 17.4)
const clipDe = (etat) =>
  "ANM_CHR_" + (etat === "unknown" ? "IDLE" : etat.toUpperCase());

export const meta = {
  id: "character",
  version: "1.2.0",
  category: "character",
  states: ETATS,
  params: {
    trade: { type: "enum", values: METIERS, default: "engineer" },
    team: {
      type: "enum",
      values: [
        "none",
        "client",
        "architecture",
        "studies",
        "site",
        "reception",
        "operations",
      ],
      default: "studies",
    },
    body: { type: "enum", values: ["M", "F"], default: "M" },
    skin: { type: "enum", values: ["A", "B", "C", "D", "E"], default: "B" },
    hair: {
      type: "enum",
      values: ["short", "side", "crop", "bob", "long", "ponytail", "bun"],
      default: "short",
    },
    hairColor: {
      type: "enum",
      values: ["black", "brown", "blond", "red", "grey"],
      default: "brown",
    },
    beard: { type: "boolean", default: false },
    glasses: { type: "boolean", default: false },
    tool: {
      type: "enum",
      values: [
        "auto",
        "none",
        "plans",
        "tablet",
        "tripod",
        "radio",
        "roller",
        "trowel",
        "cable",
        "clipboard",
        "stamp",
        "keys",
        "binder",
        "wrench",
      ],
      default: "auto",
    },
    // la lampe frontale allumee au depart ; setState(etat, { headlamp }) l'allume ou l'eteint ensuite (sans casque : rien)
    headlamp: { type: "boolean", default: false },
    outfitColor: { type: "enum", values: ["a", "b", "c"], default: "a" }, // la tenue de ville seulement
  },
  anchors: ["label", "badge"],
  budget: { triangles: 8000, materials: 6 },
  animated: true,
  assets: FICHIERS,
};

// La couleur d'un materiau de la palette : une cle de monde, d'equipe ou de personnages (comme commun.couleur cote Blender).
function couleur(tokens, cle) {
  return (
    tokens.monde[cle] ?? tokens.team[cle] ?? tokens.personnages?.[cle] ?? cle
  );
}

export function create(THREE, params, ctx) {
  const apparence = {
    ...Object.fromEntries(
      Object.entries(meta.params).map(([k, p]) => [k, p.default]),
    ),
    ...params,
  };
  // Les materiaux de palette : ceux du registre commun de l'hote (ctx.materiau, 1.1.1), partages par toute l'equipe et
  // jamais liberes ici ; sans registre, ceux de cette instance, liberes par dispose().
  const materiaux = new Map();
  const materiau = (nom) => {
    if (ctx.materiau) return ctx.materiau(nom);
    if (!materiaux.has(nom)) {
      const d = ctx.tokens.materiaux[nom];
      if (!d) throw new Error(`matériau absent de la palette : ${nom}`);
      materiaux.set(
        nom,
        new THREE.MeshStandardMaterial({
          name: nom,
          color: new THREE.Color(couleur(ctx.tokens, d.couleur)),
          roughness: d.rugosite,
          metalness: d.metal,
        }),
      );
    }
    return materiaux.get(nom);
  };
  const { scene, animations, lampe, sac } = habille(
    THREE,
    apparence,
    ctx.assets,
    materiau,
    ctx.quality,
  );

  const root = new THREE.Group();
  root.name = "character";
  root.userData.component = meta.id;
  const pivot = new THREE.Group(); // le sens du regard (data.facing), sans toucher a la position que GDC donne a root
  pivot.add(scene);
  root.add(pivot);
  scene.traverse((o) => {
    if (o.isMesh) o.castShadow = ctx.quality === "high";
  });

  // La lampe frontale : posee sur l'os de la tete quand elle est allumee, retiree sinon (rien a compter ni a dessiner) ;
  // la lentille brille dans la couleur des projecteurs (src/lumiere.json), sans vraie lumiere ni clignotement. Son
  // materiau appartient a l'instance, libere par dispose().
  let lueur = null;
  if (lampe) {
    const c = new THREE.Color(
      ctx.tokens.lumiere?.projecteurs?.couleur ?? "#EEF2F6",
    );
    lueur = new THREE.MeshStandardMaterial({
      name: "CHR_HEADLAMP_LENS_LIT",
      color: c,
      emissive: c,
      emissiveIntensity: 1,
      roughness: 0.2,
      metalness: 0,
    });
    lampe.lentille.traverse((o) => {
      if (o.isMesh) o.material = lueur;
    });
  }
  let lampeAllumee = false;
  function allume(oui) {
    if (!lampe || oui === lampeAllumee) return;
    lampeAllumee = oui;
    for (const o of lampe.pieces)
      if (oui) lampe.parent.add(o);
      else o.removeFromParent();
  }
  // tout ce qui se grise : la scene, et la lampe meme retiree (elle garde ses materiaux d'un etat a l'autre)
  const tout = () => [scene, ...(lampe && !lampeAllumee ? lampe.pieces : [])];

  const mixer = new THREE.AnimationMixer(scene);
  let action = null;
  let etat = "idle";

  // unknown : chaque materiau est clone en gris de meme valeur ; les clones sont liberes en quittant l'etat.
  let gris = null;
  function griseDe(m) {
    if (!gris.has(m)) {
      const clone = m.clone();
      const c = clone.color;
      const v = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
      c.setRGB(v, v, v);
      gris.set(m, clone);
    }
    return gris.get(m);
  }
  function grise(oui) {
    if (oui && !gris) {
      gris = new Map();
      for (const r of tout())
        r.traverse((o) => {
          if (!o.isMesh) return;
          o.userData.materiauAvantGris = o.material;
          o.material = griseDe(o.material);
        });
    } else if (!oui && gris) {
      for (const r of tout())
        r.traverse((o) => {
          if (o.isMesh && o.userData.materiauAvantGris) {
            o.material = o.userData.materiauAvantGris;
            delete o.userData.materiauAvantGris;
          }
        });
      for (const m of gris.values()) m.dispose();
      gris = null;
    }
  }

  function joue(suivant) {
    mixer.stopAllAction();
    const clip = THREE.AnimationClip.findByName(animations, clipDe(suivant));
    if (!clip) throw new Error(`clip absent du modèle : ${clipDe(suivant)}`);
    action = mixer.clipAction(clip);
    action.setLoop(
      UNE_FOIS.has(suivant) ? THREE.LoopOnce : THREE.LoopRepeat,
      Infinity,
    );
    action.clampWhenFinished = true;
    action.reset().play();
    if (sac) sac.visible = suivant === "carry"; // le sac de ciment, tenu en portant seulement
    if (ctx.reducedMotion || IMMOBILE.has(suivant)) {
      mixer.setTime(ctx.reducedMotion ? (POSE_FIXE[suivant] ?? 0) : 0);
      action.paused = true;
    }
    mixer.update(0);
  }

  allume(apparence.headlamp === true);

  return {
    root,
    setState(suivant, data = {}) {
      if (!ETATS.includes(suivant))
        throw new Error(`état inconnu : ${suivant}`);
      if (typeof data.facing === "number") pivot.rotation.y = data.facing; // 0 : regarde vers +Z, l'avant de la scene
      if (typeof data.headlamp === "boolean") allume(data.headlamp);
      if (suivant !== etat || !action) {
        etat = suivant;
        grise(etat === "unknown");
        joue(etat);
      }
    },
    update(dt) {
      if (ctx.reducedMotion || IMMOBILE.has(etat) || !action) return false;
      mixer.update(dt);
      // celebrate : une fois, puis le repos anime
      if (UNE_FOIS.has(etat) && !action.isRunning()) {
        etat = "idle";
        joue("idle");
      }
      return true;
    },
    anchor(name) {
      const noeud = scene.getObjectByName(
        "ANCHOR_" + String(name).toUpperCase(),
      );
      if (!noeud) throw new Error(`ancre inconnue : ${name}`);
      root.updateMatrixWorld(true);
      return root.worldToLocal(noeud.getWorldPosition(new THREE.Vector3()));
    },
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(scene);
      grise(false);
      allume(false);
      // la texture d'os de chaque squelette de la copie (creee par Three.js au premier rendu)
      const squelettes = new Set();
      scene.traverse((o) => {
        if (o.isSkinnedMesh) squelettes.add(o.skeleton);
      });
      for (const s of squelettes) s.dispose();
      pivot.remove(scene);
      lueur?.dispose();
      for (const m of materiaux.values()) m.dispose();
    },
  };
}
