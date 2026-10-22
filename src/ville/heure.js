// L'heure reelle (fiche day-night) : la carte suit le soleil de Fribourg, sur l'heure du poste, sans reseau (choix de
// Pierre-Alain du 21 octobre 2026). Le jour, une nuit pas trop sombre, et deux courtes transitions (l'aube et le
// crepuscule, 30 minutes chacune, centrees sur le lever et le coucher du soleil). Les valeurs sont dans src/lumiere.json,
// separees de la palette : un reglage de lumiere ne reconstruit aucun modele. Ce module ne cree ni ne touche aucune
// lumiere : il dit ce qu'elles valent a un instant, et la page qui les a creees les regle (regleLumieres).
// Three.js n'est pas necessaire ici.
import lumiere from "../lumiere.json" with { type: "json" };
import palette from "../palette.json" with { type: "json" };

const RAD = Math.PI / 180;
const JOUR_MS = 86400000;
const J2000 = 2451545.0;

// Le jour julien d'un instant, et l'instant d'un jour julien.
const julien = (ms) => ms / JOUR_MS + 2440587.5;
const instant = (j) => (j - 2440587.5) * JOUR_MS;

// Le lever et le coucher du soleil, pour le jour civil du poste qui contient `date` (l'equation du lever du soleil,
// precise a une minute pres sous nos latitudes ; -0,833 degre : le bord du disque et la refraction). Rend des
// instants (millisecondes), ou null pour un jour sans lever ou sans coucher (jamais a Fribourg).
export function soleilDe(date, lieu = lumiere.heure.lieu) {
  const d = new Date(date);
  // midi UTC du jour civil local : le compte des jours depuis J2000 est alors entier
  const n = Math.round(
    julien(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12)) - J2000,
  );
  const jMoyen = n - lieu.longitude / 360;
  const M = (357.5291 + 0.98560028 * jMoyen) % 360;
  const C =
    1.9148 * Math.sin(M * RAD) +
    0.02 * Math.sin(2 * M * RAD) +
    0.0003 * Math.sin(3 * M * RAD);
  const lambda = (M + C + 180 + 102.9372) % 360;
  const transit =
    J2000 +
    jMoyen +
    0.0053 * Math.sin(M * RAD) -
    0.0069 * Math.sin(2 * lambda * RAD);
  const sinDecl = Math.sin(lambda * RAD) * Math.sin(23.4397 * RAD);
  const decl = Math.asin(sinDecl);
  const phi = lieu.latitude * RAD;
  const cosOmega =
    (Math.sin(-0.833 * RAD) - Math.sin(phi) * sinDecl) /
    (Math.cos(phi) * Math.cos(decl));
  if (cosOmega > 1 || cosOmega < -1)
    return { lever: null, coucher: null, nuitPolaire: cosOmega > 1 };
  const omega = Math.acos(cosOmega) / RAD;
  return {
    lever: instant(transit - omega / 360),
    coucher: instant(transit + omega / 360),
  };
}

// Le moment d'un instant : { moment: "nuit" | "aube" | "jour" | "crepuscule", jour } ou jour va de 0 (la nuit) a 1
// (le jour) et passe par 0,5 au lever et au coucher. Les transitions durent lumiere.heure.transition minutes, centrees
// sur le lever et le coucher.
export function momentDe(date = Date.now(), lieu = lumiere.heure.lieu) {
  const t = new Date(date).getTime();
  const { lever, coucher, nuitPolaire } = soleilDe(t, lieu);
  if (lever === null)
    return nuitPolaire
      ? { moment: "nuit", jour: 0 }
      : { moment: "jour", jour: 1 };
  const demi = (lumiere.heure.transition * 60000) / 2;
  if (t < lever - demi || t > coucher + demi)
    return { moment: "nuit", jour: 0 };
  if (t <= lever + demi)
    return { moment: "aube", jour: (t - (lever - demi)) / (2 * demi) };
  if (t < coucher - demi) return { moment: "jour", jour: 1 };
  return {
    moment: "crepuscule",
    jour: 1 - (t - (coucher - demi)) / (2 * demi),
  };
}

// Les trois bascules de la galerie, pour les revues : jour, aube (le milieu d'une transition) et nuit.
export const MOMENTS = { jour: 1, aube: 0.5, nuit: 0 };

const versRvb = (hex) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const versHex = (rvb) =>
  "#" +
  rvb
    .map((c) => Math.round(c).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
const melange = (a, b, k) =>
  versHex(versRvb(a).map((c, i) => c + (versRvb(b)[i] - c) * k));
const entre = (a, b, k) => a + (b - a) * k;

// Les trois recettes, dans la meme forme : le jour (le haut de lumiere.json, inchange), l'aube et la nuit (la lune tient
// la place du soleil, dans la meme direction : les faces gardent leur ordre de valeurs).
const RECETTES = {
  jour: { ciel: lumiere.ciel, soleil: lumiere.soleil },
  aube: { ciel: lumiere.aube.ciel, soleil: lumiere.aube.soleil },
  nuit: { ciel: lumiere.nuit.ciel, soleil: lumiere.nuit.lune },
};
function interpole(a, b, k) {
  return {
    ciel: {
      couleur: melange(a.ciel.couleur, b.ciel.couleur, k),
      sol: melange(a.ciel.sol, b.ciel.sol, k),
      intensite: entre(a.ciel.intensite, b.ciel.intensite, k),
    },
    soleil: {
      couleur: melange(a.soleil.couleur, b.soleil.couleur, k),
      intensite: entre(a.soleil.intensite, b.soleil.intensite, k),
      position: lumiere.soleil.position,
    },
  };
}

// La recette d'un instant de la journee (jour, de 0 a 1 : momentDe(...).jour ou MOMENTS) : le ciel, le soleil (ou la
// lune), le fond de la scene selon le theme, et l'allumage des fenetres (de 0, le jour, a 1, la nuit).
export function recetteDe(jour, theme = "light") {
  const k = Math.min(1, Math.max(0, jour));
  const r =
    k <= 0.5
      ? interpole(RECETTES.nuit, RECETTES.aube, k * 2)
      : interpole(RECETTES.aube, RECETTES.jour, (k - 0.5) * 2);
  const t = theme === "dark" ? "dark" : "light";
  const fondJour = palette.interface[t].background;
  const fondNuit = lumiere.nuit.fond[t];
  return {
    ...r,
    fond: melange(fondNuit, fondJour, k),
    fenetres: 1 - k,
  };
}

// Regle les lumieres d'une page (une HemisphereLight et une DirectionalLight de Three.js) et son fond sur une recette.
export function regleLumieres({ ciel, soleil, scene }, r) {
  if (ciel) {
    ciel.color.set(r.ciel.couleur);
    ciel.groundColor.set(r.ciel.sol);
    ciel.intensity = r.ciel.intensite;
  }
  if (soleil) {
    soleil.color.set(r.soleil.couleur);
    soleil.intensity = r.soleil.intensite;
    soleil.position.set(...r.soleil.position);
  }
  if (scene && scene.background && scene.background.isColor)
    scene.background.set(r.fond);
}

export { lumiere };

// Les vitres eclairees la nuit (lumiere.fenetres) : des copies des materiaux de vitre (MAT_GLASS, MAT_GLASS_LIT), une
// par materiau d'origine et par force, comme les zones grises ; les modeles partages ne sont jamais touches. L'assemblage
// dit quelles vitres s'allument et avec quelle force ; regle(allumage) suit l'heure (recetteDe(...).fenetres).
export function creeVitres() {
  const copies = new Map(); // materiau d'origine -> { faible, franche }
  let allumage = 0;
  const estVitre = (m) => m && /^MAT_GLASS/.test(m.name);
  const origine = (m) => (m.userData.vitre ? m.userData.origine : m);
  function copie(m, force) {
    if (!copies.has(m)) copies.set(m, {});
    const parForce = copies.get(m);
    if (!parForce[force]) {
      const c = m.clone();
      c.userData = { vitre: force, origine: m };
      parForce[force] = c;
      regleCopie(c);
    }
    return parForce[force];
  }
  // la couleur et la lueur vont de celles de la vitre d'origine a celles de la fenetre eclairee, selon l'allumage
  function regleCopie(c) {
    const o = c.userData.origine;
    const chaud = c.color.clone().set(lumiere.fenetres.couleur);
    c.color.copy(o.color).lerp(chaud, allumage);
    const lueur = o.emissive.clone().multiplyScalar(o.emissiveIntensity);
    c.emissive
      .copy(lueur)
      .lerp(chaud.multiplyScalar(lumiere.fenetres[c.userData.vitre]), allumage);
    c.emissiveIntensity = 1;
  }
  return {
    // force : "faible", "franche", ou null (la vitre d'origine)
    pose(objet, force) {
      objet.traverse((o) => {
        if (!o.isMesh || !estVitre(o.material)) return;
        const m = origine(o.material);
        o.material = force ? copie(m, force) : m;
      });
    },
    regle(niveau) {
      if (niveau === allumage) return false;
      allumage = niveau;
      for (const parForce of copies.values())
        for (const c of Object.values(parForce)) regleCopie(c);
      return true;
    },
    // libere les copies qu'aucun maillage de racine n'utilise plus (un batiment retire : son verre lui appartenait)
    purge(racine) {
      const servies = new Set();
      racine.traverse((o) => {
        if (o.isMesh && o.material.userData.vitre) servies.add(o.material);
      });
      for (const [m, parForce] of copies) {
        for (const [force, c] of Object.entries(parForce))
          if (!servies.has(c)) {
            c.dispose();
            delete parForce[force];
          }
        if (!Object.keys(parForce).length) copies.delete(m);
      }
    },
    libere() {
      for (const parForce of copies.values())
        for (const c of Object.values(parForce)) c.dispose();
      copies.clear();
    },
  };
}

// Ce qui s'eclaire la nuit (fiche day-night) : faiblement tout batiment habite et tout bureau, franchement la ou un
// agent travaille (un bureau actif ou occupe, l'etage occupied d'un batiment, un conteneur ou se trouve un agent). Un
// conteneur vide reste eteint ; les engins aussi.
export const BUREAUX = [
  "architect-office",
  "client-office",
  "design-office",
  "control-office",
  "site-office",
];
export const ECLAIRABLES = new Set([...BUREAUX, "site-container", "building"]);

// La force des vitres d'un lieu (pas d'un batiment, eclaire etage par etage) : "faible", "franche" ou null.
export function forceDe(id, { actif = false, agent = false } = {}) {
  if (BUREAUX.includes(id)) return actif || agent ? "franche" : "faible";
  if (id === "site-container") return agent ? "franche" : null;
  return null;
}

// Les vitres d'un batiment (building 2.0.0 les nomme GLASS_FLOOR_n, userData.glass = { floor, occupied }) : franche a
// un etage occupe, faible a un etage habite (le verre MAT_GLASS_LIT des etages termines), eteinte ailleurs.
export function eclaireBatiment(vitres, racine) {
  racine.traverse((o) => {
    if (!o.isMesh || !o.userData.glass) return;
    const m = o.material.userData.vitre
      ? o.material.userData.origine
      : o.material;
    const force = o.userData.glass.occupied
      ? "franche"
      : m.name === "MAT_GLASS_LIT"
        ? "faible"
        : null;
    vitres.pose(o, force);
  });
}
