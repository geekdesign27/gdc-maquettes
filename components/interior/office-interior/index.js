// La salle de brainstorming : la vue rapprochee d'une seance, les gens autour de la table, les idees au tableau
// (catalogue : office-interior). Production mixte, brief valide par Pierre-Alain le 20 octobre 2026 :
// - un conteneur du kit livre container-kit (v003), coupe en maison de poupee (MB_13, variante A), sur son socle, sans
//   totem ni marches : ce n'est pas un lieu du plan, c'est un zoom de GDC ; fond plein, fenetre au bout droit (comme
//   architect-office) ;
// - une longue table au milieu (une table de 1,80 m jusqu'a 4 places, deux bout a bout de 5 a 8), les places du fond
//   d'abord (face a la camera), puis celles de devant ; le tableau d'idees sur le bout gauche, une plante a cote ;
// - decor selon kind : architect, maquette blanche et rouleaux de plans ; studies, deux ecrans et l'etagere, contre le
//   fond a droite (le bout droit fait face a la camera : ce qui s'y adosse ne se voit pas) ;
// - idle : chaises rentrees, tableau vide ; active : chaises tirees aux places occupees (data.activeDesks), huit
//   feuilles s'accrochent au tableau une a une (0,5 s chacune), une seule fois, puis restent ; toutes d'un coup avec
//   reducedMotion. La vie de la seance vient des personnages que GDC pose aux ancres desk:n.
// Les modeles sont partages entre instances : on ne libere jamais leurs geometries ni leurs materiaux ici ; seuls le
// socle et son materiau, crees par ce composant, sont liberes. Aucune couleur d'etat dans la scene ; aucun texte.

const KIT = "kit:container-kit/ENV_CONTAINER_KIT_A_v003.glb";
const SALLE = "ENV_BRAINSTORM_ROOM_A_v001.glb";
const P = "ENV_CONTAINER_KIT_A_";
const S = "ENV_BRAINSTORM_ROOM_A_";
const PLANCHER = 0.2;
const MUR_BOUT = 3.47; // face interieure d'une paroi de bout, depuis le centre du conteneur
const X_TABLE = -0.3; // centre de la table (ou des deux tables), vers le tableau : le bout droit cache son voisinage
const TABLE = 1.8;
const PLACE = 0.85; // une place par 0,85 m de table : la derniere chaise du fond laisse passer l'etagere
const Y_CHAISE = { rentree: 0.55, tiree: 1.05 };
const Y_PERSONNE = 0.62; // debout au bord de la table
const FEUILLES = 8;
const APPARITION = 0.5; // secondes par feuille
// les feuilles sur le tableau : x le long du tableau, z la hauteur du centre, inclinaison dans le plan (degres)
const GRILLE = [
  [-0.84, 1.66, -3],
  [-0.28, 1.68, 2],
  [0.28, 1.65, -2],
  [0.84, 1.67, 4],
  [-0.84, 1.22, 2],
  [-0.28, 1.2, -4],
  [0.28, 1.23, 3],
  [0.84, 1.21, -2],
];
const SOCLE = { taille: [8.8, 4.6], epaisseur: 0.6, chanfrein: 0.1 }; // bible 18.5

export const meta = {
  id: "office-interior",
  version: "1.0.0",
  category: "interior",
  states: ["idle", "active"],
  params: {
    kind: {
      type: "enum",
      values: ["architect", "studies"],
      default: "architect",
    },
    desks: { type: "number", default: 4, min: 1, max: 8 },
  },
  anchors: ["label", "desk:*"],
  budget: { triangles: 15000, materials: 10 },
  animated: true,
  assets: [SALLE, KIT],
};

// qualite basse (bible 18.3) : ce qui mesure moins de 0,30 m disparait
const DETAILS = ["RIBS_LONG_CUT", "RIBS_END_WINDOW", "RIBS_END", "PLAN_ROLLS"];

const versThree = (x, y, z) => [x, z, -y];
const borne = (v, p) =>
  Math.round(Math.min(Math.max(Number(v) || p.default, p.min), p.max));
const adoucit = (u) => 1 - (1 - u) ** 3;

export function create(THREE, params, ctx) {
  const kit = ctx.assets[KIT].scene;
  const salle = ctx.assets[SALLE].scene;
  const root = new THREE.Group();
  root.name = "office-interior";
  root.userData.component = meta.id;
  const basse = ctx.quality === "low";
  const kind = meta.params.kind.values.includes(params.kind)
    ? params.kind
    : meta.params.kind.default;
  const places = borne(params.desks, meta.params.desks);

  // Un seul materiau par MAT_ : les pieces de la salle prennent ceux du kit de meme nom.
  const materiauxKit = new Map();
  kit.traverse((o) => {
    if (o.isMesh)
      for (const m of [].concat(o.material)) materiauxKit.set(m.name, m);
  });
  const pose = (modele, nom, x, y, z, rotation = 0) => {
    const [source, prefixe] = modele === "kit" ? [kit, P] : [salle, S];
    const objet =
      (basse && source.getObjectByName(prefixe + nom + "_LOW")) ||
      source.getObjectByName(prefixe + nom);
    if (!objet) throw new Error(`pièce absente du modèle : ${prefixe + nom}`);
    const piece = objet.clone(); // partage la geometrie et les materiaux du modele
    piece.position.set(...versThree(x, y, z));
    piece.rotation.set(0, THREE.MathUtils.degToRad(rotation), 0);
    if (modele === "salle")
      piece.traverse((o) => {
        if (!o.isMesh) return;
        o.material = Array.isArray(o.material)
          ? o.material.map((m) => materiauxKit.get(m.name) || m)
          : materiauxKit.get(o.material.name) || o.material;
      });
    root.add(piece);
    return piece;
  };
  const piece = (nom, x, y, z = 0, rotation = 0) =>
    basse && DETAILS.includes(nom) ? null : pose("kit", nom, x, y, z, rotation);

  // --- la coque coupee : fond plein, fenetre au bout droit, long pan avant coupe a l'allege
  piece("FRAME_CUT", 0, 0);
  piece("FLOOR", 0, 0);
  piece("WALL_LONG_CUT", 0, 0);
  piece("RIBS_LONG_CUT", 0, 0);
  piece("WALL_LONG", 0, 0, 0, 180);
  piece("WALL_END_WINDOW", 0, 0);
  piece("RIBS_END_WINDOW", 0, 0);
  piece("WALL_END", 0, 0, 0, 180);
  piece("RIBS_END", 0, 0, 0, 180);

  // --- le tableau d'idees sur le bout gauche, face a la salle (+X), et la plante dans l'angle du fond
  const tableau = pose("salle", "BOARD", -MUR_BOUT, 0, PLANCHER, 90);
  piece("PLANT", -2.95, 1.0, PLANCHER);

  // --- la table : une ou deux, et les places, celles du fond d'abord (de gauche a droite), puis celles de devant
  const tables = places > 4 ? 2 : 1;
  for (let t = 0; t < tables; t++)
    piece(
      "MEETING_TABLE",
      X_TABLE + (t - (tables - 1) / 2) * TABLE,
      0,
      PLANCHER,
    );
  const parCote = 2 * tables;
  const xPlace = (i) => X_TABLE + (i - (parCote - 1) / 2) * PLACE;
  const sieges = Array.from({ length: places }, (_, n) => {
    const fond = n < parCote;
    const x = xPlace(fond ? n : n - parCote);
    return { x, cote: fond ? 1 : -1 };
  });
  const chaises = sieges.map((s) =>
    piece(
      "CHAIR",
      s.x,
      s.cote * Y_CHAISE.rentree,
      PLANCHER,
      s.cote > 0 ? 180 : 0,
    ),
  );

  // --- le decor du metier
  if (kind === "architect") {
    piece("MODEL", X_TABLE, 0, PLANCHER + 0.78);
    piece("PLAN_ROLLS", -2.35, 1.15, PLANCHER);
  } else {
    for (const dx of [-0.45, 0.45])
      piece("SCREEN", X_TABLE + dx * tables, 0.1, PLANCHER + 0.78);
    piece("SHELF", 2.2, 1.15, PLANCHER, 180);
  }

  // --- les feuilles : accrochees au tableau (repere du tableau : x le long, y vers la salle, z la hauteur)
  const feuilles = GRILLE.slice(0, FEUILLES).map(([x, z, inclinaison]) => {
    const f = pose("salle", "SHEET", 0, 0, 0);
    const local = new THREE.Vector3(x, z, 0.06); // Three : y vertical, +z vers l'avant du tableau (-Y Blender)
    f.position.copy(tableau.position).add(local.applyEuler(tableau.rotation));
    f.rotation.set(
      0,
      tableau.rotation.y,
      THREE.MathUtils.degToRad(inclinaison),
    );
    return f;
  });

  // --- le socle maquette : dalle de terre de 0,60 m, dessus a y = 0, aretes arrondies (classe C3)
  const [l, pr] = SOCLE.taille;
  const b = SOCLE.chanfrein;
  const forme = new THREE.Shape();
  const demi = [(l - 2 * b) / 2, (pr - 2 * b) / 2];
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
  geometrieSocle.translate(0, -(SOCLE.epaisseur - b), 0);
  const terre = ctx.tokens.materiaux.MAT_EARTH;
  const materiauSocle = new THREE.MeshStandardMaterial({
    name: "MAT_EARTH",
    color: new THREE.Color(ctx.tokens.monde[terre.couleur]),
    roughness: terre.rugosite,
    metalness: terre.metal,
  });
  root.add(new THREE.Mesh(geometrieSocle, materiauSocle));

  root.traverse((o) => {
    if (o.isMesh) o.castShadow = o.receiveShadow = !basse;
  });

  const ancres = { label: versThree(-1.2, 1.4, 3.4) };
  sieges.forEach((s, n) => {
    ancres[`desk:${n + 1}`] = versThree(s.x, s.cote * Y_PERSONNE, PLANCHER);
  });

  // --- les etats : chaises tirees aux places occupees ; feuilles qui s'accrochent une fois (t en secondes)
  let state = "idle";
  let occupees = 0;
  let t = 0;
  const fin = FEUILLES * APPARITION;
  const poseEtat = () => {
    const actif = state === "active";
    sieges.forEach((s, n) => {
      const tiree = actif && n < occupees;
      chaises[n].position.z =
        -s.cote * (tiree ? Y_CHAISE.tiree : Y_CHAISE.rentree);
      chaises[n].rotation.y = THREE.MathUtils.degToRad(
        (s.cote > 0 ? 180 : 0) + (tiree ? s.cote * 15 : 0),
      );
    });
    feuilles.forEach((f, k) => {
      const u = actif
        ? adoucit(Math.min(Math.max((t - k * APPARITION) / APPARITION, 0), 1))
        : 0;
      f.scale.setScalar(Math.max(u, 1e-3));
      f.visible = u > 0;
    });
  };

  poseEtat();

  return {
    root,
    setState(next, data = {}) {
      if (!meta.states.includes(next))
        throw new Error(`état inconnu : ${next}`);
      if (data.activeDesks !== undefined)
        occupees = Math.min(
          Math.max(Math.round(Number(data.activeDesks) || 0), 0),
          places,
        );
      if (next !== state) t = ctx.reducedMotion || next !== "active" ? fin : 0;
      state = next;
      poseEtat();
    },
    update(dt) {
      if (state !== "active" || ctx.reducedMotion || t >= fin) return false;
      t = Math.min(t + dt, fin);
      poseEtat();
      return true;
    },
    anchor(name) {
      const p = ancres[name];
      if (!p) throw new Error(`ancre inconnue : ${name}`);
      return new THREE.Vector3(...p);
    },
    dispose() {
      root.clear();
      geometrieSocle.dispose();
      materiauSocle.dispose();
    },
  };
}
