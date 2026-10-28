// La grue a tour : signale une fusion vers dev (catalogue : crane). v002 : mat et fleche en treillis (MB_08) ; v003 : pivots poses a leur place (correction de commun.rattache) ; v004 : la charge a part, sans clip.
// La geometrie vient du GLB (blender/assets/crane.py) ; le code empile les troncons du mat selon la hauteur, choisit
// treillis ou caissons pleins selon la qualite, et calcule le cycle de levage (3.0.0) : le crochet descend sur la
// palette qui attend au stock, la monte a la hauteur de passage, pivote, la descend sur le batiment, la pose et revient.
// L'hote donne les lieux (data : pick, drops, clearance) ; le composant ne connait pas la scene. Le modele est partage
// entre instances : on ne libere jamais ses geometries ni ses materiaux ici.

const MODELE = "VEH_TOWER_CRANE_A_v004.glb";
const P = "VEH_TOWER_CRANE_A_";
const SOCLE = 0.4; // dessus du socle beton
const TRONCON = 1.5; // hauteur d'un troncon de mat
// Qualite basse (bible 18.3) : les barres du treillis, sous 0,30 m, laissent la place aux caissons pleins (*_LOW).
const TREILLIS = ["MAST_SECTION", "JIB", "COUNTERJIB", "PEAK", "TIES"].map(
  (n) => P + n,
);
// La portee du chariot sous la fleche (de 0,5 a 11 m) et le cable le plus court, moufle sous le chariot.
const RAYON_MIN = 1.6;
const RAYON_MAX = 10.4;
const CABLE_MIN = 1.5;
// Les vitesses d'une grue de chantier, un peu pressees pour la maquette : orientation, chariot, levage.
const ORIENTATION = 0.45; // rad/s
const DIRECTION = 1.4; // m/s
const LEVAGE = 1.8; // m/s
const ACCROCHAGE = 1.2; // s, le temps d'accrocher ou de decrocher la palette
// Sans donnees (la grue seule, en galerie) : le stock a droite, la depose devant, la charge passe a 4 m.
const DEFAUT = { pick: [7.5, 0, 0], drops: [[0, 0, -7.5]], clearance: 4 };

export const meta = {
  id: "crane",
  version: "3.0.0",
  category: "machine",
  states: ["idle", "lifting"],
  params: { height: { type: "number", default: 14, min: 6, max: 30 } },
  anchors: ["label", "badge"],
  budget: { triangles: 15000, materials: 8 },
  animated: true,
  assets: [MODELE],
};

const point = (v) =>
  Array.isArray(v) && v.length === 3 && v.every(Number.isFinite)
    ? v.map(Number)
    : null;
const doux = (t) => t * t * (3 - 2 * t);
// Deux lieux qui different de plus de 5 cm (ou d'un point de depose) : les mesures de l'hote varient a peine d'une fois a
// l'autre, et un cycle ne reprend que pour un vrai changement.
const differe = (a, b) => {
  const v = (l) => [l.passage, l.prise.a * 10, l.prise.r, l.prise.h, ...l.deposes.flatMap((d) => [d.a * 10, d.r, d.h])];
  const x = v(a);
  const y = v(b);
  return x.length !== y.length || x.some((n, i) => Math.abs(n - y[i]) > 0.05);
};
const ecartAngle = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

export function create(THREE, params, ctx) {
  const modele = ctx.assets[MODELE];
  const scene = modele.scene;
  const root = new THREE.Group();
  root.name = "crane";
  root.userData.component = meta.id;
  root.add(scene);
  const basse = ctx.quality === "low";

  // La hauteur : n troncons de 1,5 m au-dessus du socle ; le haut de la grue monte d'autant.
  const hauteur = Math.min(
    Math.max(
      Number(params.height) || meta.params.height.default,
      meta.params.height.min,
    ),
    meta.params.height.max,
  );
  const n = Math.max(1, Math.round((hauteur - SOCLE) / TRONCON));
  const haut = SOCLE + n * TRONCON;
  const troncons = [];
  scene.traverse((o) => {
    if (o.name.startsWith(P + "MAST_SECTION_")) troncons.push(o);
  });
  troncons.sort((a, b) => a.name.localeCompare(b.name));
  const modeleTroncon = troncons[0];
  for (const t of troncons.slice(1)) t.removeFromParent();
  for (let k = 1; k < n; k++) {
    const t = modeleTroncon.clone(); // partage la geometrie et le materiau du modele
    t.name = `${P}MAST_SECTION_${String(k).padStart(2, "0")}`;
    t.position.y += k * TRONCON;
    modeleTroncon.parent.add(t);
  }
  scene.getObjectByName(P + "PIVOT_TOP").position.y = haut;
  scene.getObjectByName(P + "MAST_LOW").scale.y = haut - SOCLE;

  // Treillis ou caissons pleins : la piece qui ne sert pas est retiree de la copie (elle ne compte pas au budget).
  const aRetirer = [];
  scene.traverse((o) => {
    const caisson = o.name.endsWith("_LOW");
    const treillis = !caisson && TREILLIS.some((t) => o.name.startsWith(t));
    if ((basse && treillis) || (!basse && caisson)) aRetirer.push(o);
  });
  for (const o of aRetirer) o.removeFromParent();
  scene.traverse((o) => {
    if (o.isMesh) o.castShadow = !basse;
  });

  // Le gréement : orientation, chariot, crochet et cable, mesures dans la pose du GLB (cable de 9 m).
  const orient = scene.getObjectByName(P + "PIVOT_SLEW");
  const chariot = scene.getObjectByName(P + "PIVOT_TROLLEY");
  const crochet = scene.getObjectByName(P + "PIVOT_HOOK");
  const cable = scene.getObjectByName(P + "CABLE");
  const charge = scene.getObjectByName(P + "LOAD");
  root.updateMatrixWorld(true);
  const enRacine = (o) =>
    root.worldToLocal(o.getWorldPosition(new THREE.Vector3()));
  const rayon0 = chariot.position.x;
  const crochetY0 = crochet.position.y;
  const h0 = enRacine(crochet).y; // le crochet, dans le repere de la grue
  const cable0 = cable.scale.y;
  const dessousCharge = h0 - new THREE.Box3().setFromObject(charge).min.y; // du crochet au dessous de la palette
  const hMax = h0 + cable0 - CABLE_MIN; // le crochet au plus haut

  // Les deux palettes posees : celle qui attend au stock et celle qui vient d'etre deposee. Des copies de la charge
  // (memes geometries, memes materiaux), dans la racine des la creation pour que l'hote les traite comme le reste.
  const copie = () => {
    const c = charge.clone();
    c.name = P + "LOAD_PLACED";
    c.matrixAutoUpdate = false;
    c.visible = false;
    root.add(c);
    return c;
  };
  const attente = copie();
  const deposee = copie();

  // La pose du greement : angle de la fleche, rayon du chariot, hauteur du crochet (repere de la grue).
  const pose = { a: 0, r: rayon0, h: h0 };
  function applique() {
    orient.rotation.y = pose.a;
    chariot.position.x = pose.r;
    crochet.position.y = crochetY0 + (pose.h - h0);
    cable.scale.y = cable0 + (h0 - pose.h);
  }
  // La palette du crochet, figee a sa place dans la racine (une palette posee la ou le crochet la tient).
  function fige(c, cible) {
    const garde = { ...pose };
    Object.assign(pose, cible);
    applique();
    root.updateMatrixWorld(true);
    c.matrix.copy(root.matrixWorld).invert().multiply(charge.matrixWorld);
    Object.assign(pose, garde);
    applique();
  }

  // Les lieux, recus de l'hote ou par defaut : ou attend la palette, ou elle se pose, a quelle hauteur elle passe.
  let lieux = null;
  function lit(data) {
    const pick = point(data?.pick) || DEFAUT.pick;
    const drops = Array.isArray(data?.drops)
      ? data.drops.map(point).filter(Boolean)
      : [];
    const clearance = Number.isFinite(data?.clearance)
      ? data.clearance
      : DEFAUT.clearance;
    const vise = ([x, y, z]) => ({
      a: Math.atan2(-z, x),
      r: Math.min(Math.max(Math.hypot(x, z), RAYON_MIN), RAYON_MAX),
      h: Math.min(y + dessousCharge, hMax),
    });
    const passage = Math.min(clearance + dessousCharge, hMax);
    lieux = {
      prise: vise(pick),
      deposes: (drops.length ? drops : DEFAUT.drops).map(vise),
      passage,
    };
  }

  // Le cycle : une file d'etapes, chacune calculee a son debut depuis la pose du moment (les lieux peuvent changer
  // entre deux etapes : un batiment qui monte d'un etage).
  let etapes = [];
  let etape = null;
  let cycle = 0;
  const va = (cible) => ({ va: cible });
  const fait = (duree, action) => ({ duree, action });
  // Le cycle en deux moities : aller prendre la palette au stock, puis aller la poser ; une moitie part toujours de la
  // pose du moment (un cycle qui reprend quand les lieux changent)
  const depose = () => lieux.deposes[cycle % lieux.deposes.length];
  const prise = () => lieux.prise;
  const haut_ = (l) => () => ({ ...l(), h: lieux.passage });
  // d'abord a la hauteur de passage sur place, puis seulement pivoter : rien ne monte en biais a travers un volume
  const monte = () => ({ a: pose.a, r: pose.r, h: Math.max(pose.h, lieux.passage) });
  const allerPrendre = () => [
    va(monte),
    va(haut_(prise)), // au-dessus du stock, crochet vide a la hauteur de passage
    va(prise), // descend sur la palette
    fait(ACCROCHAGE, () => {
      attente.visible = false;
      charge.visible = true;
    }),
  ];
  const allerPoser = () => [
    va(monte), // la monte au-dessus de tout
    va(haut_(depose)), // pivote et deplace le chariot, toujours au-dessus de tout
    va(depose), // la descend sur la dalle
    fait(ACCROCHAGE, () => {
      fige(deposee, depose());
      deposee.visible = true;
      charge.visible = false;
    }),
    va(haut_(depose)), // remonte a vide
    fait(0, () => {
      cycle++;
      fige(attente, lieux.prise); // la palette suivante attend deja au stock
      attente.visible = true;
    }),
  ];
  function nouveauCycle() {
    etapes = [...allerPrendre(), ...allerPoser()];
  }
  // Des lieux qui changent en plein cycle : il reprend de la ou il est, vers les nouveaux lieux
  function reprend() {
    etape = null;
    etapes = charge.visible ? allerPoser() : [...allerPrendre(), ...allerPoser()];
    if (!charge.visible) fige(attente, lieux.prise);
  }

  function commence(e) {
    if (e.va) {
      const de = { ...pose };
      const vers = e.va();
      const da = ecartAngle(de.a, vers.a);
      const duree = Math.max(
        Math.abs(da) / ORIENTATION,
        Math.abs(vers.r - de.r) / DIRECTION,
        Math.abs(vers.h - de.h) / LEVAGE,
      );
      return { de, da, vers, duree, t: 0 };
    }
    return { duree: e.duree, t: 0, action: e.action };
  }
  function avance(dt) {
    let reste = dt;
    while (reste > 0) {
      if (!etape) {
        if (!etapes.length) nouveauCycle();
        etape = commence(etapes.shift());
      }
      const pas = Math.min(reste, etape.duree - etape.t);
      etape.t += pas;
      reste -= pas;
      if (etape.vers) {
        const k = etape.duree > 0 ? doux(etape.t / etape.duree) : 1;
        pose.a = etape.de.a + etape.da * k;
        pose.r = etape.de.r + (etape.vers.r - etape.de.r) * k;
        pose.h = etape.de.h + (etape.vers.h - etape.de.h) * k;
      }
      if (etape.t >= etape.duree) {
        etape.action?.();
        etape = null;
      }
    }
    applique();
  }

  // Au repos : le crochet vide, haut, au-dessus de la palette qui attend au stock ; rien ne pend dans le batiment.
  function repos() {
    etapes = [];
    etape = null;
    Object.assign(pose, { ...lieux.prise, h: lieux.passage });
    fige(attente, lieux.prise);
    attente.visible = true;
    charge.visible = false;
    applique();
  }
  // Sans animation, en levage : une image fixe, la palette levee au-dessus de la dalle ou elle va.
  function leveeFixe() {
    etapes = [];
    etape = null;
    Object.assign(pose, { ...lieux.deposes[0], h: lieux.passage });
    attente.visible = false;
    deposee.visible = false;
    charge.visible = true;
    applique();
  }

  let state = null;
  return {
    root,
    setState(next, data) {
      if (!meta.states.includes(next))
        throw new Error(`état inconnu : ${next}`);
      const premier = state === null;
      const avant = lieux;
      lit(data);
      if (next === state && !premier) {
        // les lieux changent (un batiment qui monte d'un etage) : au repos, la grue se range a nouveau ; en levage, le
        // cycle continue et les prend a sa prochaine etape, et la palette deposee sur l'ancienne dalle disparait
        if (state === "idle") repos();
        else if (ctx.reducedMotion) leveeFixe();
        else if (!etape && !etapes.length && cycle === 0) repos(); // le cycle n'a pas commence : il part de ces lieux
        else if (differe(avant, lieux)) {
          deposee.visible = false; // la palette posee sur l'ancienne dalle disparait
          reprend();
        }
        return;
      }
      state = next;
      deposee.visible = false;
      if (state === "idle") repos();
      else if (ctx.reducedMotion) leveeFixe();
      else {
        cycle = 0;
        etapes = [];
        etape = null;
        if (premier) repos(); // un premier levage part du repos, au-dessus du stock
        fige(attente, lieux.prise);
        attente.visible = true;
        charge.visible = false;
        applique();
      }
      root.updateMatrixWorld(true);
    },
    update(dt) {
      if (state !== "lifting" || ctx.reducedMotion) return false;
      avance(dt);
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
      attente.removeFromParent();
      deposee.removeFromParent();
      root.remove(scene);
    },
  };
}
