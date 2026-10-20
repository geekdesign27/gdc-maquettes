// Le parking, le carnet des demandes (catalogue : parking) : une caisse de materiel par demande en attente de tri.
// Production mixte : les pieces du GLB (blender/assets/parking.py) sont assemblees ici selon capacity, le nombre de places
// marquees en rangs de 4, et data.count. Decisions de Pierre-Alain du 20 octobre 2026 : capacity est aussi le seuil de
// la pile ; au-dela, les caisses en trop vont sur la pile et le nombre est dans le badge HTML ; item:1 a item:n designent
// les caisses sur leurs places (dans l'ordre d'arrivee), item:pile la pile.
// La ville (docs/ville.md) : une caisse ajoutee arrive par la rue (le bord avant, -Y), une caisse retiree y repart, en
// 1 s ; avec reducedMotion, tout est immediat. Le premier etat pose les caisses deja la, sans les faire arriver.
// Le modele est partage entre instances : on ne libere jamais ses geometries ni ses materiaux ici ; seuls le socle et son
// materiau, crees par ce composant, sont liberes. Aucune couleur d'etat ni orange dans la scene (signaletique).

const MODELE = "ENV_PARKING_A_v001.glb";
const P = "ENV_PARKING_A_";
const PLACE = [1.6, 1.4]; // largeur et profondeur d'une place
const PAR_RANG = 4;
const ASPHALTE = 0.05; // les caisses sont posees sur l'enrobe
const HAUT_CAISSE = 0.8;
const RUE = -1.6; // le bord avant du socle, cote rue : d'ou les caisses arrivent
const TRAJET = 1.0; // secondes pour arriver ou repartir
const SOCLE = {
  epaisseur: 0.6,
  chanfrein: 0.1,
  gauche: -4.4,
  droite: 6.6,
  devant: -1.6,
  derriere: 1.6,
}; // bible 18.5

export const meta = {
  id: "parking",
  version: "1.0.0",
  category: "site",
  states: ["default"],
  params: { capacity: { type: "number", default: 12, min: 4, max: 24 } },
  anchors: ["label", "badge", "item:*"],
  budget: { triangles: 5000, materials: 6 },
  animated: true,
  assets: [MODELE],
};

const versThree = (x, y, z) => [x, z, -y];

export function create(THREE, params, ctx) {
  const modele = ctx.assets[MODELE].scene;
  const root = new THREE.Group();
  root.name = "parking";
  root.userData.component = meta.id;
  const basse = ctx.quality === "low";
  const capacite = Math.round(
    Math.min(
      Math.max(
        Number(params.capacity) || meta.params.capacity.default,
        meta.params.capacity.min,
      ),
      meta.params.capacity.max,
    ),
  );
  const rangs = Math.ceil(capacite / PAR_RANG); // rang 0 cote rue ; le dernier au fond

  const piece = (nom) => {
    const source = modele.getObjectByName(P + nom);
    if (!source) throw new Error(`pièce absente du modèle : ${nom}`);
    const o = source.clone(); // partage la geometrie et les materiaux du modele
    o.traverse((x) => {
      if (x.isMesh) x.castShadow = x.receiveShadow = !basse;
    });
    return o;
  };
  const pose = (nom, x, y, z = 0) => {
    const o = piece(nom);
    o.position.set(...versThree(x, y, z));
    root.add(o);
    return o;
  };

  // l'aire : les rangs de places, la bordure du fond, l'aire de la pile a droite
  for (let k = 0; k < rangs; k++) pose("ROW", 0, k * PLACE[1]);
  const fond = (rangs - 1) * PLACE[1] + PLACE[1] / 2;
  pose("CURB_BACK", 0, fond);
  const xPile = 4.9;
  const yPile = fond - 1.4;
  pose("PILE_PAD", xPile, yPile);
  const pile = pose("PILE", xPile, yPile, ASPHALTE);

  // le socle maquette : dalle de terre de 0,60 m, dessus a y = 0, aretes arrondies (classe C3) ; il suit les rangs
  const y1 = fond + SOCLE.derriere;
  const b = SOCLE.chanfrein;
  const demi = [
    (SOCLE.droite - SOCLE.gauche - 2 * b) / 2,
    (y1 - SOCLE.devant - 2 * b) / 2,
  ];
  const forme = new THREE.Shape();
  forme.moveTo(-demi[0], -demi[1]);
  forme.lineTo(demi[0], -demi[1]);
  forme.lineTo(demi[0], demi[1]);
  forme.lineTo(-demi[0], demi[1]);
  forme.closePath();
  const geometrieSocle = new THREE.ExtrudeGeometry(forme, {
    depth: SOCLE.epaisseur - 2 * b,
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 3,
  });
  geometrieSocle.rotateX(-Math.PI / 2);
  geometrieSocle.translate(
    (SOCLE.gauche + SOCLE.droite) / 2,
    -(SOCLE.epaisseur - b),
    -(SOCLE.devant + y1) / 2,
  );
  const terre = ctx.tokens.materiaux.MAT_EARTH;
  const materiauSocle = new THREE.MeshStandardMaterial({
    name: "MAT_EARTH",
    color: new THREE.Color(ctx.tokens.monde[terre.couleur]),
    roughness: terre.rugosite,
    metalness: terre.metal,
  });
  const socle = new THREE.Mesh(geometrieSocle, materiauSocle);
  socle.receiveShadow = !basse;
  root.add(socle);

  // la place n (0, 1, ...) : on remplit le rang du fond d'abord, de gauche a droite ; les dernieres arrivees sont cote rue
  const place = (n) => {
    const rang = rangs - 1 - Math.floor(n / PAR_RANG);
    const x = -((PAR_RANG - 1) * PLACE[0]) / 2 + (n % PAR_RANG) * PLACE[0];
    return new THREE.Vector3(...versThree(x, rang * PLACE[1], ASPHALTE));
  };
  const rue = (cible) => new THREE.Vector3(cible.x, cible.y, -RUE);

  // les caisses presentes : { groupe, cible, depart, t, sortie }
  const caisses = [];
  const nouvelleCaisse = (n, instantane) => {
    const groupe = new THREE.Group();
    groupe.add(piece("CRATE"));
    if (!basse) groupe.add(piece("CRATE_STRAPS")); // qualite basse (bible 18.3) : les cerclages, sous 0,30 m, disparaissent
    const cible = place(n);
    const depart = instantane ? cible.clone() : rue(cible);
    groupe.position.copy(depart);
    root.add(groupe);
    caisses.push({
      groupe,
      cible,
      depart,
      t: instantane ? 1 : 0,
      sortie: false,
    });
  };
  const presentes = () => caisses.filter((c) => !c.sortie);

  let premier = true;
  let total = 0;
  const avance = (c, dt) => {
    c.t = Math.min(c.t + dt / TRAJET, 1);
    const s = c.t * c.t * (3 - 2 * c.t); // depart et arrivee doux
    c.groupe.position.lerpVectors(c.depart, c.cible, s);
  };

  return {
    root,
    setState(state, data = {}) {
      if (!meta.states.includes(state))
        throw new Error(`état inconnu : ${state}`);
      total = Math.max(0, Math.round(Number(data.count) || 0));
      const voulues = Math.min(total, capacite);
      const instantane = premier || ctx.reducedMotion;
      premier = false;
      // des caisses en plus : elles arrivent par la rue
      for (let n = presentes().length; n < voulues; n++)
        nouvelleCaisse(n, instantane);
      // des caisses en moins : les dernieres arrivees repartent vers la rue
      for (const c of presentes().slice(voulues)) {
        c.sortie = true;
        c.depart = c.groupe.position.clone();
        c.cible = rue(c.depart);
        c.t = 0;
      }
      if (instantane) {
        for (const c of caisses.filter((x) => x.sortie))
          c.groupe.removeFromParent();
        caisses.splice(0, caisses.length, ...presentes());
        for (const c of caisses) c.groupe.position.copy(c.cible);
      }
      pile.visible = total > capacite;
    },
    update(dt) {
      if (ctx.reducedMotion) return false;
      let encore = false;
      for (const c of caisses) {
        if (c.t >= 1) continue;
        avance(c, dt);
        encore = encore || c.t < 1;
      }
      // une caisse repartie a la rue s'efface
      for (const c of caisses.filter((x) => x.sortie && x.t >= 1))
        c.groupe.removeFromParent();
      caisses.splice(
        0,
        caisses.length,
        ...caisses.filter((x) => !(x.sortie && x.t >= 1)),
      );
      return encore;
    },
    anchor(name) {
      if (name === "label")
        return new THREE.Vector3(...versThree(0, fond / 2, 1.2));
      if (name === "badge")
        return new THREE.Vector3(...versThree(xPile, yPile, 2.4)); // au-dessus de la pile : le nombre
      if (name === "item:pile") {
        if (!pile.visible)
          throw new Error("ancre inconnue : item:pile (pas de pile)");
        return new THREE.Vector3(
          ...versThree(xPile, yPile, 2 * HAUT_CAISSE + 0.1),
        );
      }
      const m = /^item:(\d+)$/.exec(String(name));
      const c = m && presentes()[Number(m[1]) - 1];
      if (!c) throw new Error(`ancre inconnue : ${name}`);
      return c.cible.clone().add(new THREE.Vector3(0, HAUT_CAISSE + 0.1, 0)); // sur la caisse, a sa place
    },
    dispose() {
      root.clear();
      geometrieSocle.dispose();
      materiauSocle.dispose();
    },
  };
}
