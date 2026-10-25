// La ville autour (lot G9, fiche city-plan ; regles et cotes : docs/ville-autour.md). Rien que des nombres, sans
// Three.js : la grille des rues et des pates, la rue de ceinture autour de la place du chantier, les deux avenues et
// leurs giratoires, et pour chaque pate son type, sa hauteur et ses volumes, tires par une graine (meme graine, meme
// ville). La carte (carte.js) en fait la maquette en volumes simples, puis les kits.
//
// Reperes : ceux de l'implantation (implantation.js), en metres, au sol (x, z) ; la camera regarde depuis le coin
// +X +Z. Le fond de la vue est donc a -X et -Z (les immeubles), le cote camera a +X et +Z (rien au-dessus de 8 m).
import { alea, choisis, entre } from "./graine.js";

// La place du chantier : taillee pour huit applications sur deux rangees (le terrain va au plus de x 0 a 124 et de
// z 7 a 74), elle ne bouge jamais quand une application s'ajoute.
export const PLACE = { x: [-0.5, 124.5], z: [5.5, 75.5] };
export const RUE = 10; // une chaussee de 6 m et deux trottoirs de 2 m
export const SOCLE = { x: [-100.5, 224.5], z: [-94.5, 175.5] }; // 325 x 270 m, le bord du socle de city-ground
// Les hauteurs (docs/ville-autour.md) : cote camera 8 m au plus, sur les cotes 10 m, au fond 19 m.
export const HAUTEURS = { camera: 8, cote: 10, fond: 19 };
// Les deux avenues prolongent les routes du carrefour du harnais (implantation.js, X_ROUTE et Z_ROUTE).
export const AVENUES = { nord: 27, ouest: 26 };
export const GIRATOIRES = [
  [27, -49.5],
  [-55.5, 26],
];

// Les pates, par bande : les colonnes (en x) et les rangees (en z) de la grille. Au milieu, la bande depend du cote :
// au fond, l'avenue nord (x = 27) coupe les pates ; a gauche, l'avenue ouest (z = 26) ; ailleurs, des rues regulieres.
const COLONNES = {
  gauche: [
    [-100.5, -60.5],
    [-50.5, -10.5],
  ],
  milieuFond: [
    [-0.5, 22],
    [32, 73.25],
    [83.25, 124.5],
  ],
  milieuDevant: [
    [-0.5, 34.5],
    [44.5, 79.5],
    [89.5, 124.5],
  ],
  droite: [
    [134.5, 174.5],
    [184.5, 224.5],
  ],
};
const RANGEES = {
  fond: [
    [-94.5, -54.5],
    [-44.5, -4.5],
  ],
  milieuGauche: [
    [5.5, 21],
    [31, 75.5],
  ],
  milieuDroite: [
    [5.5, 35.5],
    [45.5, 75.5],
  ],
  devant: [
    [85.5, 125.5],
    [135.5, 175.5],
  ],
};

// Les rues : des rectangles { x: [a, b], z: [a, b] } d'enrobe (avec leurs trottoirs, pour la maquette en blanc).
function rues() {
  const [X0, X1] = SOCLE.x;
  const [Z0, Z1] = SOCLE.z;
  const h = (z, x = [X0, X1]) => ({ x, z });
  const v = (x, z = [Z0, Z1]) => ({ x, z });
  return [
    // les rues horizontales : entre les rangees du fond, la ceinture (haut et bas), entre les rangees de devant
    h([-54.5, -44.5]),
    h([-4.5, 5.5]),
    h([75.5, 85.5]),
    h([125.5, 135.5]),
    // l'avenue ouest, a gauche, et la rue du milieu, a droite
    h([AVENUES.ouest - RUE / 2, AVENUES.ouest + RUE / 2], [X0, -10.5]),
    h([35.5, 45.5], [134.5, X1]),
    // les rues verticales : la ceinture (gauche et droite) et une rue de part et d'autre
    v([-60.5, -50.5]),
    v([-10.5, -0.5]),
    v([124.5, 134.5]),
    v([174.5, 184.5]),
    // au fond, l'avenue nord et sa voisine ; devant, deux rues regulieres
    v([AVENUES.nord - RUE / 2, AVENUES.nord + RUE / 2], [Z0, -4.5]),
    v([73.25, 83.25], [Z0, -4.5]),
    v([34.5, 44.5], [85.5, Z1]),
    v([79.5, 89.5], [85.5, Z1]),
  ];
}

// Les raccords entre la ceinture et les routes du carrefour (implantation.js) : de simples bouts de rue, que la
// circulation de la ville ne prend jamais (city-traffic).
export const RACCORDS = [
  { x: [-0.5, 1], z: [24, 28] }, // la route entre les transformations et les bureaux (z = 26)
  { x: [25, 29], z: [5.5, 8] }, // la voie entre les bureaux et le chantier (x = 27)
];

// Le cote d'un pate : « fond » (-X ou -Z seulement), « camera » (+X ou +Z seulement) ou « cote » (les deux coins).
function coteDe(x, z) {
  const fond = x[1] <= PLACE.x[0] - RUE || z[1] <= PLACE.z[0] - RUE;
  const camera = x[0] >= PLACE.x[1] + RUE || z[0] >= PLACE.z[1] + RUE;
  if (fond && camera) return "cote";
  return fond ? "fond" : "camera";
}

// Tous les pates : chaque colonne croisee avec chaque rangee, sauf la place du chantier.
function cellules() {
  const out = [];
  const groupesX = ["gauche", "milieu", "droite"];
  const groupesZ = ["fond", "milieu", "devant"];
  for (const gx of groupesX)
    for (const gz of groupesZ) {
      if (gx === "milieu" && gz === "milieu") continue; // la place du chantier
      const cols =
        gx === "milieu"
          ? COLONNES[gz === "fond" ? "milieuFond" : "milieuDevant"]
          : COLONNES[gx];
      const rangs =
        gz === "milieu"
          ? RANGEES[gx === "gauche" ? "milieuGauche" : "milieuDroite"]
          : RANGEES[gz];
      for (const x of cols)
        for (const z of rangs) out.push({ x, z, cote: coteDe(x, z) });
    }
  return out;
}

// Ce que contient un pate, selon son cote (docs/ville-autour.md, « Les pates ») : au fond, surtout des immeubles, une
// place avec sa fontaine (au bord de l'avenue nord) et des parcs ; cote camera, des villas basses et des parcs ; sur
// les cotes, des villas a etage. La graine tire l'ordre ; les nombres de chaque type sont fixes.
const MELANGE = {
  fond: { immeubles: 10, parcs: 2, villas: 1 }, // plus la place
  camera: { villas: 12, parcs: 2 },
  cote: { villas: 8 },
};

// Les volumes d'un pate : des boites { x, z, largeur, profondeur, hauteur } (la maquette en blanc) ; les arbres d'un
// parc sont des boites de 3 x 3 x 5 m, la fontaine une boite de 3 x 1,6 x 0,7 m.
function volumes(p, tirage) {
  const [x0, x1] = p.x;
  const [z0, z1] = p.z;
  const l = x1 - x0;
  const d = z1 - z0;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const boites = [];
  if (p.type === "villas") {
    // des parcelles d'environ 20 x 20 m, une villa de 10 x 9 m chacune, un peu decalee vers sa rue
    const nx = Math.max(1, Math.floor(l / 20));
    const nz = Math.max(1, Math.floor(d / 20));
    const haute = p.cote === "camera" ? 7.2 : 9.5; // rez et combles cote camera, rez et etage ailleurs
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < nz; j++)
        boites.push({
          x: x0 + (l / nx) * (i + 0.5) + entre(tirage, -1.5, 1.5),
          z: z0 + (d / nz) * (j + 0.5) + entre(tirage, -1.5, 1.5),
          largeur: choisis(tirage, [10, 11]),
          profondeur: choisis(tirage, [9, 10]),
          hauteur: haute,
          // la parcelle de la villa : son jardin et ses haies (ville-kits.js)
          parcelle: {
            x: [x0 + (l / nx) * i, x0 + (l / nx) * (i + 1)],
            z: [z0 + (d / nz) * j, z0 + (d / nz) * (j + 1)],
          },
        });
  } else if (p.type === "immeubles") {
    // deux immeubles, barre ou plot, de 3 a 6 niveaux (3 m l'etage, 0,6 m d'acrotere)
    const n = l >= 30 && d >= 30 ? 2 : 1;
    for (let k = 0; k < n; k++) {
      // un pate de moins de 20 m de profondeur ne prend qu'une barre (12 m et ses balcons) : un plot de 15 m et ses
      // balcons deborderait sur le trottoir (constat du controleur du 25 octobre 2026) ; le tirage reste le meme
      const pile = tirage();
      const barre = d < 20 || pile < 0.5;
      const niveaux = 3 + Math.floor(tirage() * 4);
      const largeur = barre ? (l >= 30 ? 24 : Math.min(24, l - 6)) : 15;
      const profondeur = barre ? 12 : 15;
      const decale = n === 2 ? (k === 0 ? -1 : 1) * (d / 4) : 0;
      boites.push({
        x: cx + entre(tirage, -2, 2),
        z: cz + decale,
        largeur,
        profondeur,
        hauteur: Math.min(niveaux * 3 + 0.6, HAUTEURS.fond),
      });
    }
  } else if (p.type === "parc") {
    const n = 6 + Math.floor(tirage() * 5);
    for (let k = 0; k < n; k++)
      boites.push({
        x: entre(tirage, x0 + 4, x1 - 4),
        z: entre(tirage, z0 + 4, z1 - 4),
        largeur: 3,
        profondeur: 3,
        hauteur: p.cote === "camera" ? 5 : 7,
      });
  } else if (p.type === "place") {
    boites.push({ x: cx, z: cz, largeur: 3, profondeur: 1.6, hauteur: 0.7 });
  }
  return boites;
}

// Le plan de la ville pour une graine : { socle, place, rues, raccords, giratoires, pates }. Chaque pate :
// { x, z, cote, type (villas, immeubles, parc, place), hauteur (la plus haute de ses boites), boites }.
export function planVille(graine = "gdc") {
  const tirage = alea(`ville:${graine}`);
  const pates = cellules();
  // la place, au bord de l'avenue nord : le pate du fond, de x -0,5 a 22, contre la ceinture
  const place = pates.find(
    (p) => p.x[0] === -0.5 && p.x[1] === 22 && p.z[1] === -4.5,
  );
  place.type = "place";
  for (const [cote, nombres] of Object.entries(MELANGE)) {
    const libres = pates.filter((p) => p.cote === cote && !p.type);
    // un melange de Fisher-Yates, rejouable
    for (let i = libres.length - 1; i > 0; i--) {
      const j = Math.floor(tirage() * (i + 1));
      [libres[i], libres[j]] = [libres[j], libres[i]];
    }
    let k = 0;
    for (const [type, n] of Object.entries(nombres))
      for (let i = 0; i < n && k < libres.length; i++)
        libres[k++].type = type === "parcs" ? "parc" : type;
    for (; k < libres.length; k++) libres[k].type = "villas";
  }
  for (const p of pates) {
    p.boites = volumes(p, tirage);
    p.hauteur = Math.max(0, ...p.boites.map((b) => b.hauteur));
  }
  return {
    socle: SOCLE,
    place: PLACE,
    rues: rues(),
    raccords: RACCORDS,
    giratoires: GIRATOIRES,
    pates,
  };
}

// Le reseau des rues, en nombres : la rue de chaque rectangle (le long de son grand cote), les croisements (un point ou
// l'axe d'une rue rencontre celui d'une autre, y compris quand l'une s'arrete au bord de l'autre : un T ; les raccords
// vers les routes du chantier ajoutent une branche a la rue de ceinture), et sur chaque rue ses bornes, du bord du
// socle ou d'un croisement a l'autre. Partage par la pose des rues (ville-kits.js) et la circulation (circulation.js).
export const DEMI_CARREFOUR = 5; // un carrefour fait 10 x 10 m
export const DEMI_GIRATOIRE = 15; // le giratoire et ses trottoirs, 30 x 30 m
// le passage pieton, a la sortie d'un carrefour (pas au bord du socle) : 3 m apres son bord, sur un troncon d'au moins
// deux fois 8 m
export const PASSAGE = { ecart: 8, recul: 3 };
const EPS = 0.01;
export function reseauRues(plan) {
  const rues = plan.rues.map((r) =>
    r.x[1] - r.x[0] > r.z[1] - r.z[0]
      ? { h: true, axe: (r.z[0] + r.z[1]) / 2, de: r.x[0], a: r.x[1] }
      : { h: false, axe: (r.x[0] + r.x[1]) / 2, de: r.z[0], a: r.z[1] },
  );
  const proche = (a, b) => Math.abs(a - b) < EPS;
  const parCle = new Map();
  const croisement = (x, z) => {
    const cle = `${x}:${z}`;
    if (!parCle.has(cle)) parCle.set(cle, { x, z, branches: new Set(), raccords: new Set() });
    return parCle.get(cle);
  };
  const H = rues.filter((r) => r.h);
  const V = rues.filter((r) => !r.h);
  for (const h of H)
    for (const v of V) {
      const [x, z] = [v.axe, h.axe];
      if (x < h.de - DEMI_CARREFOUR - EPS || x > h.a + DEMI_CARREFOUR + EPS) continue;
      if (z < v.de - DEMI_CARREFOUR - EPS || z > v.a + DEMI_CARREFOUR + EPS) continue;
      const c = croisement(x, z);
      if (h.de < x - DEMI_CARREFOUR - EPS) c.branches.add("-x");
      if (h.a > x + DEMI_CARREFOUR + EPS) c.branches.add("+x");
      if (v.de < z - DEMI_CARREFOUR - EPS) c.branches.add("-z");
      if (v.a > z + DEMI_CARREFOUR + EPS) c.branches.add("+z");
    }
  for (const r of plan.raccords) {
    const [cx, cz] = [(r.x[0] + r.x[1]) / 2, (r.z[0] + r.z[1]) / 2];
    const branche = (c, b) => {
      c.branches.add(b);
      c.raccords.add(b);
    };
    for (const v of V) {
      if (cz < v.de || cz > v.a) continue;
      if (proche(v.axe + DEMI_CARREFOUR, r.x[0])) branche(croisement(v.axe, cz), "+x");
      if (proche(v.axe - DEMI_CARREFOUR, r.x[1])) branche(croisement(v.axe, cz), "-x");
    }
    for (const h of H) {
      if (cx < h.de || cx > h.a) continue;
      if (proche(h.axe + DEMI_CARREFOUR, r.z[0])) branche(croisement(cx, h.axe), "+z");
      if (proche(h.axe - DEMI_CARREFOUR, r.z[1])) branche(croisement(cx, h.axe), "-z");
    }
  }
  const croisements = [...parCle.values()];
  for (const c of croisements) {
    // les branches de la rue qui passe s'ajoutent quand un raccord se pose sur elle
    for (const r of rues) {
      const t = r.h ? c.x : c.z;
      if (!proche(r.axe, r.h ? c.z : c.x) || t < r.de - EPS || t > r.a + EPS) continue;
      if (r.de < t - DEMI_CARREFOUR - EPS) c.branches.add(r.h ? "-x" : "-z");
      if (r.a > t + DEMI_CARREFOUR + EPS) c.branches.add(r.h ? "+x" : "+z");
    }
    c.giratoire = plan.giratoires.some(([gx, gz]) => proche(gx, c.x) && proche(gz, c.z));
    c.demi = c.giratoire ? DEMI_GIRATOIRE : DEMI_CARREFOUR;
  }
  // les bornes de chaque rue : { t, demi, noeud } (noeud : le croisement, ou null au bord du socle)
  for (const r of rues) {
    const bornes = croisements
      .filter((c) => {
        const t = r.h ? c.x : c.z;
        return proche(r.h ? c.z : c.x, r.axe) && t >= r.de - DEMI_CARREFOUR - EPS && t <= r.a + DEMI_CARREFOUR + EPS;
      })
      .map((c) => ({ t: r.h ? c.x : c.z, demi: c.demi, noeud: c }))
      .sort((a, b) => a.t - b.t);
    if (!bornes.length || bornes[0].t - bornes[0].demi > r.de + EPS) bornes.unshift({ t: r.de, demi: 0, noeud: null });
    const fin = bornes[bornes.length - 1];
    if (fin.t + fin.demi < r.a - EPS) bornes.push({ t: r.a, demi: 0, noeud: null });
    r.bornes = bornes;
  }
  return { rues, croisements };
}
