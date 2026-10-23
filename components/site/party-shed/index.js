// Le cabanon de la fete : il montre la pause, le chantier ferme et l'equipe qui fait la fete en attendant la decision
// de Pierre-Alain (catalogue : party-shed, lot G8). Fiche validee par Pierre-Alain le 21 octobre 2026 ; teintes, notes
// et place choisies le 23 octobre 2026.
// Production mixte : le cabanon, sa porte, la lanterne et la note viennent du GLB (blender/assets/party-shed.py) ; le
// composant ouvre la porte, allume et tourne la lanterne, fait glisser les taches et monter les notes.
// - closed : porte fermee, lanterne eteinte, ni tache ni note ; rien ne bouge.
// - party : la porte s'ouvre une fois (1 s), puis la fete : la lanterne s'allume en fondu (1,5 s, jamais un flash) et
//   tourne, un tour en 8 s ; ses trois taches glissent au sol et montent sur le mur avant quand leur chemin le croise ;
//   une note sort de sous l'auvent toutes les 1,6 s, monte et rapetisse jusqu'a disparaitre (trois au plus).
// - reducedMotion : porte ouverte, lanterne allumee et fixe, taches posees, trois notes immobiles au-dessus de la porte.
// Aucune vraie lumiere ni couleur d'etat : les trois teintes de fete sont des lumieres de src/lumiere.json
// (ctx.tokens.lumiere.fete), loin des couleurs d'etat et d'equipe. Taches et facettes ne s'allument et ne s'eteignent
// jamais en cours de fete (WCAG 2.3.1) : seules leurs places changent.
// Un materiau pour la lanterne allumee et les notes, un pour les taches, crees ici et liberes ici ; une couleur par
// instance. Le modele est partage : ses geometries et ses materiaux ne sont jamais liberes ici.

const MODELE = "ENV_PARTY_SHED_A_v001.glb";
const P = "ENV_PARTY_SHED_A_";
const PORTE = { ouverte: (100 * Math.PI) / 180, duree: 1 }; // la porte s'ouvre vers l'avant, gond cote camera
const FONDU = 1.5; // l'allumage de la lanterne et des taches, apres la porte
const TOUR = 8; // secondes par tour de lanterne
const MUR = 0.31; // l'avant du mur du cabanon (z de Three.js), ou montent les taches
const LARGE = 1.45; // la demi-largeur du mur
// sol : les taches flottent a 8 cm, au-dessus des marquages et des voiles que l'hote pose au sol
const TACHE = { rayon: 0.42, chemin: 1.25, sol: 0.08, anneaux: 3, cotes: 20 };
const NOTE = {
  periode: 1.6,
  duree: 3.6,
  max: 3,
  naissance: 0.3,
  effacement: 0.5,
  echelle: 1.3, // la croche du modele fait 0,45 m ; a la camera iso, un peu plus
};
// les notes figees (reducedMotion) : devant l'auvent, au-dessus de la porte
const NOTES_FIXES = [
  [0.3, 2.85, 2.0],
  [0.65, 3.25, 2.05],
  [1.0, 3.6, 1.95],
];

export const meta = {
  id: "party-shed",
  version: "1.0.0",
  category: "site",
  states: ["closed", "party"],
  params: {},
  anchors: ["label", "door", "gather"],
  budget: { triangles: 3000, materials: 5 },
  animated: true,
  assets: [MODELE],
};

const ANCRES = {
  label: "ANCHOR_LABEL",
  door: "ANCHOR_DOOR",
  gather: "ANCHOR_GATHER",
};
const lisse = (u) => u * u * (3 - 2 * u);

export function create(THREE, params, ctx) {
  const modele = ctx.assets[MODELE].scene;
  const root = new THREE.Group();
  root.name = "party-shed";
  root.userData.component = meta.id;
  root.add(modele);
  const basse = ctx.quality === "low";
  const objet = (nom) => {
    const o = modele.getObjectByName(P + nom);
    if (!o) throw new Error(`pièce absente du modèle : ${nom}`);
    return o;
  };
  modele.traverse((o) => {
    if (o.isMesh) o.castShadow = o.receiveShadow = !basse;
  });
  const porte = objet("DOOR");
  const lanterne = objet("LANTERN");
  const note = objet("NOTE");
  note.visible = false; // la piece source des notes : repetee par instance
  modele.updateMatrixWorld(true);

  const fete = ctx.tokens.lumiere.fete;
  const teintes = fete.couleurs.map((c) => new THREE.Color(c));
  const lumineux = new THREE.MeshBasicMaterial({ name: "PARTY_LIGHT" });
  const crees = []; // les InstancedMesh et geometries faites ici
  const instancie = (geometrie, nombre, materiau) => {
    const im = new THREE.InstancedMesh(geometrie, materiau, nombre);
    im.castShadow = im.receiveShadow = false;
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < nombre; i++) im.setColorAt(i, teintes[i % 3]);
    crees.push(im);
    return im;
  };

  // la lanterne allumee : chaque groupe de facettes, en une instance de sa teinte, a la place de son verre eteint
  const facettes = ["A", "B", "C"].map((g, k) => {
    const eteinte = objet("LANTERN_FACETS_" + g);
    const im = instancie(eteinte.geometry, 1, lumineux);
    im.name = P + "LANTERN_LIT_" + g;
    im.position.copy(eteinte.position);
    im.quaternion.copy(eteinte.quaternion);
    im.scale.copy(eteinte.scale);
    im.setMatrixAt(0, new THREE.Matrix4());
    im.userData.teinte = teintes[k];
    im.userData.eteinte = eteinte;
    return im;
  });
  const verre = facettes[0].userData.eteinte.material.color;

  // les taches : un disque doux (l'opacite de chaque sommet en couleur, nulle au bord), trois instances
  const pos = [0, 0, 0];
  const col = [1, 1, 1, 1];
  for (let a = 1; a <= TACHE.anneaux; a++) {
    const r = a / TACHE.anneaux;
    const alpha = Math.pow(1 - r * r, 2);
    for (let k = 0; k < TACHE.cotes; k++) {
      const t = (k / TACHE.cotes) * Math.PI * 2;
      pos.push(Math.cos(t) * r * TACHE.rayon, 0, Math.sin(t) * r * TACHE.rayon);
      col.push(1, 1, 1, alpha);
    }
  }
  const idx = [];
  const sommet = (a, k) => 1 + (a - 1) * TACHE.cotes + (k % TACHE.cotes);
  for (let k = 0; k < TACHE.cotes; k++)
    idx.push(0, sommet(1, k + 1), sommet(1, k));
  for (let a = 1; a < TACHE.anneaux; a++)
    for (let k = 0; k < TACHE.cotes; k++)
      idx.push(
        sommet(a, k),
        sommet(a, k + 1),
        sommet(a + 1, k),
        sommet(a, k + 1),
        sommet(a + 1, k + 1),
        sommet(a + 1, k),
      );
  const disque = new THREE.BufferGeometry();
  disque.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  disque.setAttribute("color", new THREE.Float32BufferAttribute(col, 4));
  disque.setIndex(idx);
  const lueur = new THREE.MeshBasicMaterial({
    name: "PARTY_SPOT",
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const taches = instancie(disque, 3, lueur);
  taches.name = P + "SPOTS";
  taches.renderOrder = 1;
  lueur.userData.opacite = fete.opacite;

  // les notes : trois instances de la croche, tournees vers la camera iso
  const notes = instancie(note.geometry, NOTE.max, lumineux);
  notes.name = P + "NOTES";
  const centreTaches = new THREE.Vector3();
  lanterne.getWorldPosition(centreTaches);
  root.updateMatrixWorld(true);
  root.worldToLocal(centreTaches);

  // --- l'etat de la fete : t depuis le passage a party ; tourne, l'angle de la lanterne
  let etat = "closed";
  let t = 0;
  let tourne = 0;
  let porteVers = 0;
  let porteDe = 0;
  let porteT = PORTE.duree;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const s = new THREE.Vector3();
  const debout = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    Math.PI / 2,
  );
  const aPlat = new THREE.Quaternion();
  const versCamera = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    Math.PI / 4,
  );

  const allume = (niveau) => {
    for (const f of facettes) {
      const c = verre.clone().lerp(f.userData.teinte, niveau);
      f.setColorAt(0, c);
      f.instanceColor.needsUpdate = true;
    }
    lueur.opacity = niveau * fete.opacite;
  };
  // les taches : sur un cercle autour du pied de la lanterne ; la part du cercle qui passe derriere le mur y monte
  const poseTaches = () => {
    for (let i = 0; i < 3; i++) {
      const a = tourne + (i * Math.PI * 2) / 3;
      const x = centreTaches.x + Math.cos(a) * TACHE.chemin;
      const z = centreTaches.z + Math.sin(a) * TACHE.chemin;
      if (z < MUR && Math.abs(x) < LARGE) {
        v.set(x, TACHE.sol + (MUR - z), MUR + 0.01);
        q.copy(debout);
      } else {
        v.set(x, TACHE.sol, z);
        q.copy(aPlat);
      }
      taches.setMatrixAt(i, m.compose(v, q, s.set(1, 1, 1)));
    }
    taches.instanceMatrix.needsUpdate = true;
    taches.computeBoundingSphere();
  };
  // une note de l'age u (0 a 1) : elle sort de sous l'auvent vers l'avant, puis monte en se balancant un peu ; elle
  // grandit a sa naissance et rapetisse jusqu'a disparaitre a la fin (decision de Pierre-Alain du 23 octobre 2026)
  const poseNote = (i, u, k) => {
    const sec = u * NOTE.duree;
    const taille = Math.min(
      1,
      sec / NOTE.naissance,
      (NOTE.duree - sec) / NOTE.effacement,
    );
    const avance = lisse(Math.min(u / 0.4, 1));
    v.set(
      0.55 + 0.25 * Math.sin(u * Math.PI * 3 + k),
      1.7 + 2.1 * Math.pow(u, 1.4),
      0.9 + 1.3 * avance,
    );
    notes.setMatrixAt(
      i,
      m.compose(v, versCamera, s.setScalar(Math.max(taille, 0) * NOTE.echelle)),
    );
    notes.setColorAt(i, teintes[k % 3]);
  };
  const poseNotes = () => {
    // les notes nees toutes les NOTE.periode secondes depuis la fin de l'ouverture ; les trois plus jeunes en vie
    const depuis = t - PORTE.duree;
    const derniere = Math.floor(depuis / NOTE.periode);
    let n = 0;
    for (let k = derniere; k > derniere - NOTE.max && k >= 0; k--) {
      const u = (depuis - k * NOTE.periode) / NOTE.duree;
      if (u >= 1) continue;
      poseNote(n++, u, k);
    }
    notes.count = n;
    notes.instanceMatrix.needsUpdate = true;
    if (notes.instanceColor) notes.instanceColor.needsUpdate = true;
    notes.computeBoundingSphere();
  };
  const notesFixes = () => {
    NOTES_FIXES.forEach(([x, y, z], i) => {
      notes.setMatrixAt(
        i,
        m.compose(v.set(x, y, z), versCamera, s.setScalar(NOTE.echelle)),
      );
      notes.setColorAt(i, teintes[i]);
    });
    notes.count = NOTES_FIXES.length;
    notes.instanceMatrix.needsUpdate = true;
    notes.instanceColor.needsUpdate = true;
    notes.computeBoundingSphere();
  };
  const montre = (oui) => {
    for (const f of facettes) {
      f.userData.eteinte.visible = !oui;
      if (oui) f.userData.eteinte.parent.add(f);
      else f.removeFromParent();
    }
    if (oui) root.add(taches, notes);
    else {
      taches.removeFromParent();
      notes.removeFromParent();
    }
  };

  return {
    root,
    setState(state) {
      if (!meta.states.includes(state))
        throw new Error(`état inconnu : ${state}`);
      if (state === etat) return;
      etat = state;
      porteDe = porte.rotation.y;
      porteVers = state === "party" ? PORTE.ouverte : 0;
      porteT = ctx.reducedMotion ? PORTE.duree : 0;
      if (ctx.reducedMotion) porte.rotation.y = porteVers;
      t = 0;
      if (state === "closed") {
        // l'extinction est directe ; la porte se referme (une fois)
        montre(false);
        allume(0);
        return;
      }
      montre(true);
      if (ctx.reducedMotion) {
        tourne = 0.6; // une place lisible : deux taches au sol devant, une sur le mur
        allume(1);
        poseTaches();
        notesFixes();
        lanterne.rotation.y = tourne;
        return;
      }
      tourne = 0;
      allume(0);
      poseTaches();
      notes.count = 0;
    },
    update(dt) {
      let bouge = false;
      if (porteT < PORTE.duree) {
        porteT = Math.min(porteT + dt, PORTE.duree);
        porte.rotation.y =
          porteDe + (porteVers - porteDe) * lisse(porteT / PORTE.duree);
        bouge = true;
      }
      if (etat !== "party" || ctx.reducedMotion) return bouge;
      t += dt;
      if (t > PORTE.duree) {
        allume(Math.min((t - PORTE.duree) / FONDU, 1));
        tourne = (((t - PORTE.duree) / TOUR) * Math.PI * 2) % (Math.PI * 2);
        lanterne.rotation.y = tourne;
        poseTaches();
        poseNotes();
      }
      return true;
    },
    anchor(name) {
      if (!ANCRES[name]) throw new Error(`ancre inconnue : ${name}`);
      const a = modele.getObjectByName(ANCRES[name]);
      root.updateMatrixWorld(true);
      return root.worldToLocal(a.getWorldPosition(new THREE.Vector3()));
    },
    dispose() {
      montre(false);
      root.clear();
      for (const im of crees) im.dispose();
      disque.dispose();
      lumineux.dispose();
      lueur.dispose();
    },
  };
}
