// La scene de la circulation (lot G9, fiche city-traffic) : la flotte city-car et les passants (character 1.2.0,
// civilian) de la ville autour, poses a chaque image la ou circulation.js les place. Ni les voitures ni les passants ne
// portent d'ombre reelle (aucun appel dans la passe d'ombre) : city-car a ses disques de contact, les passants un disque
// instancie, noir a l'opacite de lumiere.voitures.contact. Sous 4 px par metre, les passants ne sont plus dessines ;
// endormie (la carte cachee, l'utilisateur absent), la ville ne bouge plus.
import { creeCirculation, CIRCULATION } from "./circulation.js";
import { parametresUsager, COLORIS_VILLE } from "./equipe.js";
import { alea } from "./graine.js";
import reglages from "../lumiere.json" with { type: "json" };

export const SEUIL_PASSANTS = 4; // px par metre
const DISQUE = { rayon: 0.38, anneaux: 3, cotes: 12, sol: 0.012 };

// creeScene(THREE, { plan, lieux, cree, quality, reducedMotion, graine }) ; cree(id, params, personne) : la creation
// d'un composant par la carte. Rend { racine, update(dt, { nuit, phares }), vue(px), endors(oui), etat, dispose }.
export async function creeScene(
  THREE,
  { plan, lieux, cree, quality, reducedMotion, graine },
) {
  const circulation = creeCirculation(plan, lieux, {
    graine,
    quality,
    reducedMotion,
  });
  const plafonds = CIRCULATION.plafonds[quality === "high" ? "high" : "low"];
  const racine = new THREE.Group();
  racine.name = "VILLE_CIRCULATION";
  const flotte = await cree("city-car", {
    count: plafonds.voitures,
    color: "a",
  });
  flotte.root.position.y = CIRCULATION.sol.chaussee;
  flotte.setState("parked", { cars: [] });
  racine.add(flotte.root);
  const groupe = new THREE.Group();
  groupe.name = "VILLE_PASSANTS";
  racine.add(groupe);
  const passants = [];
  for (let k = 0; k < plafonds.passants; k++) {
    const tirage = alea(`${graine}:passant:${k}:visage`);
    const inst = await cree(
      "character",
      parametresUsager(tirage, COLORIS_VILLE[k % COLORIS_VILLE.length]),
      true,
    );
    inst.root.traverse((o) => {
      if (o.isMesh) o.castShadow = false;
    });
    inst.root.visible = false;
    groupe.add(inst.root);
    passants.push({ inst, etat: null });
  }
  // le disque de contact des passants : un degrade noir, doux au bord, une instance par passant
  const pos = [0, DISQUE.sol, 0];
  const col = [0, 0, 0, reglages.voitures.contact];
  for (let a = 1; a <= DISQUE.anneaux; a++) {
    const r = a / DISQUE.anneaux;
    for (let k = 0; k < DISQUE.cotes; k++) {
      const t = (k / DISQUE.cotes) * Math.PI * 2;
      pos.push(
        Math.cos(t) * r * DISQUE.rayon,
        DISQUE.sol,
        Math.sin(t) * r * DISQUE.rayon,
      );
      col.push(0, 0, 0, reglages.voitures.contact * (1 - r * r) ** 1.5);
    }
  }
  const idx = [];
  const sommet = (a, k) => 1 + (a - 1) * DISQUE.cotes + (k % DISQUE.cotes);
  for (let k = 0; k < DISQUE.cotes; k++)
    idx.push(0, sommet(1, k + 1), sommet(1, k));
  for (let a = 1; a < DISQUE.anneaux; a++)
    for (let k = 0; k < DISQUE.cotes; k++)
      idx.push(
        sommet(a, k),
        sommet(a, k + 1),
        sommet(a + 1, k),
        sommet(a, k + 1),
        sommet(a + 1, k + 1),
        sommet(a + 1, k),
      );
  const geometrie = new THREE.BufferGeometry();
  geometrie.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geometrie.setAttribute("color", new THREE.Float32BufferAttribute(col, 4));
  geometrie.setIndex(idx);
  const ombre = new THREE.MeshBasicMaterial({
    name: "VILLE_PASSANTS_CONTACT",
    vertexColors: true,
    transparent: true,
    depthWrite: false,
  });
  const disques = new THREE.InstancedMesh(geometrie, ombre, plafonds.passants);
  disques.name = "VILLE_PASSANTS_CONTACT";
  disques.count = 0;
  disques.renderOrder = 1;
  disques.frustumCulled = false; // ses instances bougent ; la sphere englobante n'est pas refaite a chaque image
  groupe.add(disques);
  const m = new THREE.Matrix4();

  let endormie = false;
  let phares = null;
  let dernier = { voitures: [], passants: [] };
  // poser ce que rend la circulation : la flotte, puis chaque passant et son disque
  function pose(o) {
    dernier = o;
    flotte.setState(o.bouge ? "driving" : "parked", { cars: o.voitures });
    disques.count = o.passants.length;
    const actifs = new Set();
    o.passants.forEach((p, i) => {
      const q = passants[p.rang];
      actifs.add(q);
      q.inst.root.visible = true;
      q.inst.root.position.set(p.x, p.y, p.z);
      q.inst.setState(p.etat, { facing: p.cap }); // le meme etat ne relance pas le clip : seul le regard tourne
      q.etat = p.etat;
      disques.setMatrixAt(i, m.makeTranslation(p.x, p.y, p.z));
    });
    disques.instanceMatrix.needsUpdate = true;
    for (const q of passants)
      if (!actifs.has(q) && q.inst.root.visible) {
        q.inst.root.visible = false;
        q.etat = null;
      }
  }
  pose(circulation.update(0));
  let nuitPosee = false; // figee, la ville se repose quand la nuit tombe ou finit (la moitie la nuit)

  return {
    racine,
    circulation,
    // une image : rend true quand quelque chose a bouge (une image d'ambiance, qui ne refait pas l'ombre)
    update(dt, { nuit = false, lumieres = false } = {}) {
      if (lumieres !== phares) {
        phares = lumieres;
        flotte.setState(
          dernier.voitures.length && !reducedMotion ? "driving" : "parked",
          {
            cars: dernier.voitures,
            lights: !reducedMotion && lumieres,
          },
        );
      }
      if (reducedMotion) {
        // la carte redessine deja quand la nuit change (majHeure) : la ville figee n'en demande pas
        if (nuit !== nuitPosee) pose(circulation.update(0, { nuit }));
        nuitPosee = nuit;
        return false;
      }
      if (endormie) return false;
      // une image quand quelque chose de dessine bouge : les voitures, et les passants s'ils sont dessines ; le dernier
      // qui rentre en demande une encore
      const vus = (x) => x.voitures.length + (groupe.visible ? x.passants.length : 0);
      const avant = vus(dernier);
      const o = circulation.update(dt, { nuit });
      pose(o);
      flotte.update(dt);
      if (groupe.visible)
        for (const p of passants) if (p.inst.root.visible) p.inst.update(dt);
      return vus(o) + avant > 0;
    },
    // la densite de la vue : sous SEUIL_PASSANTS px par metre, les passants ne sont plus dessines ; true s'il faut
    // redessiner
    vue(pxParMetre) {
      const voir = pxParMetre >= SEUIL_PASSANTS;
      if (groupe.visible === voir) return false;
      groupe.visible = voir;
      return true;
    },
    // la carte cachee, ou l'utilisateur absent : la ville s'endort (elle ne bouge plus), et se reveille ou elle etait
    endors(oui) {
      endormie = !!oui;
    },
    get etat() {
      return {
        voitures: dernier.voitures.length,
        passants: dernier.passants.length,
        passantsVisibles: groupe.visible,
        endormie,
        trajets: circulation.enRoute,
      };
    },
    dispose() {
      racine.removeFromParent();
      flotte.dispose();
      for (const p of passants) p.inst.dispose();
      geometrie.dispose();
      ombre.dispose();
      disques.dispose();
    },
  };
}
