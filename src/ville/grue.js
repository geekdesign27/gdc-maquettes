// Les lieux de la grue (crane 3.0.0, retour de Pierre-Alain du 28 octobre 2026 : elle bouclait sur les memes gestes et
// traversait les batiments). La grue ne connait pas la scene : l'assemblage (la carte, la scene de reference) mesure ici
// ce qui l'entoure et lui donne ses lieux (data de setState) et la hauteur de son mat (params.height).
// - la prise : la palette qui attend au stock de la parcelle, posee sur ce qui est au sol a cet endroit ;
// - les deposes : des points de la dalle du haut du batiment, la ou la palette repose a plat ;
// - la hauteur de passage : au-dessus de tout ce que la fleche, la contre-fleche et la charge balaient entre la prise
//   et les deposes (les boites englobantes de chaque composant), avec une marge ;
// - le mat : assez haut pour que la charge passe a cette hauteur sous la fleche, et decale d'une grue voisine.

// La geometrie de la grue (blender/assets/crane.py) : du haut du mat au dessous de la charge, cable le plus court ;
// la fleche et la contre-fleche, et leur demi-largeur balayee.
const DESSOUS_CHARGE = 4.0; // m, sous le haut du mat (3,7 mesures, arrondis)
const FLECHE = 11.2;
const CONTRE_FLECHE = 4.9;
const DEMI_LARGEUR = 0.9;
const MARGE = 0.8; // m, entre la charge et le haut de ce qu'elle survole
const HAUTEUR_MIN = 14; // la hauteur par defaut de la fiche
const HAUTEUR_MAX = 103; // le parametre height de la fiche (crane 3.1.0 : trente etages et le decalage d'une voisine)
const SOCLE = 0.4;
const TRONCON = 1.5;
// Deux grues dont les fleches se croisent : decalees de trois troncons, la contre-fleche et ses blocs de beton de la
// plus haute passent au-dessus de la fleche de l'autre.
export const ECART_GRUES = 4.5;
export const VOISINAGE_GRUES = FLECHE + CONTRE_FLECHE + 1;
const PALETTE = 0.55; // demi-cote de la palette et de ses elingues
const PLAT = 0.2; // m, l'ecart de hauteur admis sous une palette posee

// La hauteur du mat qui fait passer la charge au-dessus de sommet : un nombre entier de troncons, comme le composant.
export function hauteurGrue(sommet, plancher = HAUTEUR_MIN) {
  const voulue = Math.max(plancher, sommet + MARGE + DESSOUS_CHARGE);
  const n = Math.ceil((voulue - SOCLE) / TRONCON - 1e-6);
  return Math.min(SOCLE + n * TRONCON, HAUTEUR_MAX);
}

// La hauteur d'une grue decalee de ses voisines (leurs hauteurs) : la plus basse au-dessus de voulue qui garde
// ECART_GRUES avec chacune.
export function hauteurDecalee(voulue, voisines) {
  let h = voulue;
  for (let tour = 0; tour < 8; tour++) {
    const proche = voisines.find((v) => Math.abs(v - h) < ECART_GRUES - 1e-6);
    if (proche === undefined) break;
    h = hauteurGrue(0, proche + ECART_GRUES);
  }
  return Math.min(h, HAUTEUR_MAX);
}

// grue : la racine de la grue ; batiment : la racine du batiment qu'elle sert (ou null) ; autour : les racines de tout
// ce qui peut etre survole (hors grues) ; stock : [x, z] dans le repere du parent de la grue. Renvoie data (repere de la
// grue), sommet (le plus haut de ce qui est balaye, repere de la grue) et la hauteur de mat qu'il faut.
export function lieuxGrue(THREE, { grue, batiment, autour, stock }) {
  // tout a sa taille finale : un composant qui apparait (ou une grue qui se monte) est ecrase un instant par l'hote
  const echelles = [...autour, ...(batiment ? [batiment] : [])].map((o) => [o, o.scale.clone()]);
  for (const [o] of echelles) o.scale.set(1, 1, 1);
  try {
    return mesure(THREE, { grue, batiment, autour, stock });
  } finally {
    for (const [o, e] of echelles) o.scale.copy(e);
    grue.parent.updateMatrixWorld(true);
  }
}

function mesure(THREE, { grue, batiment, autour, stock }) {
  const parent = grue.parent;
  parent.updateMatrixWorld(true);
  // le repere de la grue sans son echelle (la grue qui se monte est ecrasee en hauteur)
  const repere = new THREE.Matrix4().compose(
    grue.position,
    new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      grue.rotation.y,
    ),
    new THREE.Vector3(1, 1, 1),
  );
  const versGrue = new THREE.Matrix4()
    .multiplyMatrices(parent.matrixWorld, repere)
    .invert();
  const enGrue = (v) => v.clone().applyMatrix4(versGrue);

  // les boites de ce qui entoure, dans le repere de la grue (les composants sont droits : une boite reste une boite)
  const boites = [];
  for (const o of autour) {
    if (!o.visible) continue;
    const b = new THREE.Box3().setFromObject(o);
    if (b.isEmpty()) continue;
    boites.push(b.applyMatrix4(versGrue));
  }
  const visible = (o) => {
    for (let p = o; p; p = p.parent) if (!p.visible) return false;
    return true;
  };
  // le haut de ce qui est sous une palette posee en (x, z) : cinq rayons verticaux, le centre et les coins
  const rayon = new THREE.Raycaster();
  const bas = new THREE.Vector3(0, -1, 0);
  const versMonde = new THREE.Matrix4().copy(versGrue).invert();
  function surface(cibles, x, z, haut) {
    const ys = [];
    for (const [dx, dz] of [
      [0, 0],
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      const depart = new THREE.Vector3(
        x + dx * PALETTE,
        haut,
        z + dz * PALETTE,
      ).applyMatrix4(versMonde);
      rayon.set(depart, bas);
      const touche = rayon
        .intersectObjects(cibles, true)
        .find((i) => visible(i.object));
      ys.push(touche ? enGrue(touche.point).y : 0);
    }
    return {
      y: Math.max(...ys),
      plat: Math.max(...ys) - Math.min(...ys) <= PLAT,
    };
  }

  // la prise : au stock, sur ce qui est au sol
  const [sx, sz] = stock;
  // le stock est donne dans le repere du parent de la grue (le plateau), pas dans celui du monde
  const stockGrue = new THREE.Vector3(sx, 0, sz).applyMatrix4(repere.clone().invert());
  const hautMax = HAUTEUR_MAX + 5;
  const sol = surface(autour, stockGrue.x, stockGrue.z, hautMax);
  const pick = [stockGrue.x, sol.y, stockGrue.z];

  // les deposes : des points de la dalle du haut, dans l'emprise du batiment, la ou la palette repose a plat, a portee
  const drops = [];
  if (batiment?.visible) {
    const b = new THREE.Box3().setFromObject(batiment).applyMatrix4(versGrue);
    const c = b.getCenter(new THREE.Vector3());
    const demi = b.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    const candidats = [];
    for (const fx of [-0.45, 0.45, 0, -0.25, 0.25])
      for (const fz of [0.2, -0.2, 0])
        candidats.push([
          c.x + fx * Math.max(demi.x - 1.5, 0) * 2,
          c.z + fz * Math.max(demi.z - 1.5, 0) * 2,
        ]);
    for (const [x, z] of candidats) {
      if (drops.length >= 3) break;
      const r = Math.hypot(x, z);
      if (r < 2 || r > 10.2) continue;
      if (drops.some((d) => Math.hypot(d[0] - x, d[2] - z) < 2)) continue;
      const s = surface([batiment], x, z, b.max.y + 1);
      if (s.plat && s.y > 0.05) drops.push([x, s.y, z]);
    }
  }
  if (!drops.length) drops.push([pick[0], pick[1], pick[2]]); // rien ou se poser : la palette reste au stock

  // ce que balaient la fleche (et la charge), puis la contre-fleche, entre la prise et la plus eloignee des deposes
  const angle = ([x, , z]) => Math.atan2(-z, x);
  const a0 = angle(pick);
  const ecarts = drops.map((d) =>
    Math.atan2(Math.sin(angle(d) - a0), Math.cos(angle(d) - a0)),
  );
  const de = a0 + Math.min(0, ...ecarts);
  const vers = a0 + Math.max(0, ...ecarts);
  let sommet = 0;
  const pas = Math.PI / 90;
  for (let a = de; a <= vers + 1e-6; a += pas) {
    const ux = Math.cos(a);
    const uz = -Math.sin(a);
    for (const [r0, r1, s] of [
      [0, FLECHE, 1],
      [0, CONTRE_FLECHE, -1],
    ])
      for (let r = r0; r <= r1; r += 0.4) {
        const x = s * ux * r;
        const z = s * uz * r;
        for (const b of boites)
          if (
            b.max.y > sommet &&
            x > b.min.x - DEMI_LARGEUR &&
            x < b.max.x + DEMI_LARGEUR &&
            z > b.min.z - DEMI_LARGEUR &&
            z < b.max.z + DEMI_LARGEUR
          )
            sommet = b.max.y;
      }
  }
  return {
    data: { pick, drops, clearance: sommet + MARGE },
    sommet,
    hauteur: hauteurGrue(sommet),
  };
}
