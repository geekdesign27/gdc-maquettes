// La circulation de la ville (lot G9, fiche city-traffic ; docs/ville-autour.md) : des voitures et des passants, par
// vagues, qui ne disent jamais rien du harnais. Rien que des nombres, sans Three.js : la scene (circulation-scene.js)
// pose la flotte city-car et les passants (character, civilian) la ou ce module les place.
//
// Les voitures roulent a droite, a 30 km/h, dans la ville et sur la rue de ceinture, jamais sur les routes du carrefour
// du harnais (les raccords ne sont pas des rues de la circulation) : elles sortent du bout de l'allee d'une villa (son
// garage), tournent aux carrefours, font le tour des giratoires, et rentrent au bout de l'allee d'une autre villa.
// Les passants sortent d'une porte (villa, immeuble), marchent sur le trottoir, traversent aux passages pietons,
// passent parfois par les chemins d'un parc ou vont parler a la fontaine de la place, et rentrent par une porte. Sous
// les plafonds de la fiche ; la nuit, la moitie ; avec moins d'animations, la ville est figee (des voitures garees au
// bout de leur allee, des passants immobiles a la fontaine).
//
// Reperes : ceux du plan (metres, x et z au sol). Un cap est un angle autour de Y : 0 regarde +Z (city-car, character).
import { reseauRues, PASSAGE } from "./ville-autour.js";
import { alea, entre, choisis } from "./graine.js";

export const CIRCULATION = {
  vitesse: 30 / 3.6, // m/s, la vitesse de city-car
  marche: 1.4, // m/s, comme les agents
  voie: 1.5, // l'axe de la voie de droite, depuis l'axe de la rue
  bord: 2.4, // le bord de la chaussee (6 m), ou une voiture tourne vers son allee
  sortie: 6, // la longueur, le long de la rue, du virage entre l'allee et la voie
  trottoir: 4.5, // la ligne de marche des passants (trottoir de 3 a 5 m ; les lampadaires a 4 m)
  rayonGiratoire: 8.5, // la chaussee annulaire va de 5 a 11 m
  plafonds: {
    high: { voitures: 6, passants: 6 },
    low: { voitures: 2, passants: 2 },
  },
  vagues: { voitures: [20, 40], passants: [12, 25] }, // s entre deux departs
  troncons: [3, 8], // le nombre de troncons d'un trajet de voiture, au moins
  pause: [10, 18], // s a la fontaine
  balade: [15, 110], // m, a vol d'oiseau, entre les deux bouts d'une balade (porte, parc, fontaine)
  fige: { voitures: 3, passants: 3 }, // avec moins d'animations
  virage: 8, // la vitesse a laquelle le cap rejoint celui du trajet (1/s)
  sol: { trottoir: 0.19, chaussee: 0.04, dalle: 0.03 }, // le dessus des pieces de road-kit et des allees
};
const DIRECTIONS = { "+x": [1, 0], "-x": [-1, 0], "+z": [0, 1], "-z": [0, -1] };
const RUE_DEMI = 5; // une rue fait 10 m, trottoirs compris
const POSES_FIGEES = [Math.PI / 2, -Math.PI / 2, 0]; // autour de la fontaine : devant, derriere, au bout +X
const ARRET = 2.3; // m, de la porte d'un garage au centre d'une voiture garee devant (city-car : environ 4,2 m)
const cap = ([dx, dz]) => Math.atan2(dx, dz);
const droite = ([dx, dz]) => [-dz, dx]; // la droite d'une direction, au sol
const ecartAngle = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

// Le graphe : les croisements, et les troncons de rue entre deux croisements (ou un croisement et le bord du socle).
export function reseauCirculation(plan) {
  const { rues, croisements } = reseauRues(plan);
  const troncons = [];
  for (const r of rues)
    for (let k = 0; k + 1 < r.bornes.length; k++) {
      const [a, b] = [r.bornes[k], r.bornes[k + 1]];
      const t0 = a.t + a.demi;
      const t1 = b.t - b.demi;
      if (t1 - t0 < 1) continue;
      // les passages pietons du troncon (ville-kits.js, poseRues)
      const passages = [];
      if (t1 - t0 >= 2 * PASSAGE.ecart) {
        if (a.demi) passages.push(t0 + PASSAGE.recul);
        if (b.demi) passages.push(t1 - PASSAGE.recul);
      }
      troncons.push({
        h: r.h,
        axe: r.axe,
        t0,
        t1,
        a: a.noeud,
        b: b.noeud,
        passages,
      });
    }
  // les sorties de chaque croisement : le troncon, et le sens dans lequel on le prend (les raccords n'en sont pas)
  const sorties = new Map(croisements.map((c) => [c, []]));
  for (const t of troncons) {
    if (t.a) sorties.get(t.a).push({ troncon: t, sens: 1 });
    if (t.b) sorties.get(t.b).push({ troncon: t, sens: -1 });
  }
  return { croisements, troncons, sorties };
}

// un point d'un troncon : t le long de la rue, decale de d a droite du sens +1 de la rue
function point(troncon, t, decalage) {
  const [rx, rz] = droite(troncon.h ? [1, 0] : [0, 1]);
  const [x, z] = troncon.h ? [t, troncon.axe] : [troncon.axe, t];
  return [x + rx * decalage, z + rz * decalage];
}
const directionDe = (troncon, sens) => (troncon.h ? [sens, 0] : [0, sens]);
// la voie de droite d'un troncon pris dans un sens, a son debut (u = 0) ou a sa fin (u = 1)
const voie = (troncon, sens, u) =>
  point(
    troncon,
    sens > 0 === u > 0.5 ? troncon.t1 : troncon.t0,
    sens * CIRCULATION.voie,
  );
// les points d'une courbe de Bezier quadratique, sans le premier
function bezier(a, c, b, n = 6) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    const s = i / n;
    out.push([
      (1 - s) ** 2 * a[0] + 2 * (1 - s) * s * c[0] + s * s * b[0],
      (1 - s) ** 2 * a[1] + 2 * (1 - s) * s * c[1] + s * s * b[1],
    ]);
  }
  return out;
}
// la traversee d'un croisement, de la fin de la voie d'entree (deja posee) au debut de la voie de sortie
function traversee(noeud, entree, sortie) {
  const de = voie(entree.troncon, entree.sens, 1);
  const vers = voie(sortie.troncon, sortie.sens, 0);
  if (noeud.giratoire) {
    // le tour du giratoire, a droite : vu de dessus, l'angle au sol (atan2 z, x) decroit
    const R = CIRCULATION.rayonGiratoire;
    const angle = ([x, z]) => Math.atan2(z - noeud.z, x - noeud.x);
    const a0 = angle(de) - 0.3;
    let a1 = angle(vers) + 0.3;
    while (a1 > a0) a1 -= Math.PI * 2;
    const n = Math.max(4, Math.ceil(((a0 - a1) * R) / 2.5));
    const arc = Array.from({ length: n + 1 }, (_, i) => {
      const a = a0 + ((a1 - a0) * i) / n;
      return [noeud.x + Math.cos(a) * R, noeud.z + Math.sin(a) * R];
    });
    return [...arc, vers];
  }
  const v = CIRCULATION.voie;
  const din = directionDe(entree.troncon, entree.sens);
  const dout = directionDe(sortie.troncon, sortie.sens);
  const [ri, rj] = [droite(din), droite(dout)];
  const toutDroit = din[0] === dout[0] && din[1] === dout[1];
  // le coin des deux voies (tout droit : l'axe de la voie)
  const coin = toutDroit
    ? [noeud.x + ri[0] * v, noeud.z + ri[1] * v]
    : [noeud.x + (ri[0] + rj[0]) * v, noeud.z + (ri[1] + rj[1]) * v];
  return bezier(de, coin, vers);
}

// Un lieu raccroche a son troncon : { T, t, c } (c : le cote, +1 a droite du sens +1 de la rue), ou null quand son
// seuil ne donne pas sur un troncon (un coin de carrefour, le bord du socle).
function rattache(troncons, seuil, vers) {
  const [vx, vz] = DIRECTIONS[vers];
  const h = vz !== 0; // une facade qui regarde +-z donne sur une rue le long de X
  const [ax, az] = [seuil[0] + vx * RUE_DEMI, seuil[1] + vz * RUE_DEMI];
  const [t, axe] = h ? [ax, az] : [az, ax];
  const T = troncons.find(
    (r) =>
      r.h === h && Math.abs(r.axe - axe) < 0.01 && t > r.t0 + 1 && t < r.t1 - 1,
  );
  if (!T) return null;
  const c = h ? Math.sign(seuil[1] - T.axe) : -Math.sign(seuil[0] - T.axe);
  return { T, t, c };
}
const unitaire = ([x0, z0], [x1, z1]) => {
  const l = Math.hypot(x1 - x0, z1 - z0) || 1;
  return [(x1 - x0) / l, (z1 - z0) / l];
};

// Les lieux de la circulation, a partir de ceux que releve la pose des kits (ville-kits.js) : les garages (le bout de
// l'allee d'une villa), les portes (villas, immeubles), les parcs et leurs entrees, la place et sa fontaine.
export function lieuxDeCirculation(reseau, lieux) {
  const { troncons } = reseau;
  const garages = [];
  const portes = [];
  for (const sorte of ["villas", "immeubles"])
    for (const l of lieux?.[sorte] ?? []) {
      const r = rattache(troncons, l.seuil, l.vers);
      if (!r) continue;
      portes.push({ ...r, sorte, chemin: [l.porte, l.seuil] });
      // le garage d'une villa (C et E) : une voiture sort de sa porte et y rentre, par sa rampe ; garee, elle attend
      // devant (son centre a 2,3 m de la porte). Il lui faut la place de tourner entre la rampe et la voie. longue :
      // la voiture tient entiere sur la rampe, sans deborder sur le trottoir (une voiture garee de la ville figee)
      if (!l.garage) continue;
      const rg = rattache(troncons, l.garage.seuil, l.vers);
      if (!rg) continue;
      const u = unitaire(l.garage.porte, l.garage.seuil);
      const tourne = rg.t - CIRCULATION.sortie - 1 > rg.T.t0 && rg.t + CIRCULATION.sortie + 1 < rg.T.t1;
      if (tourne)
        garages.push({
          ...rg,
          porte: l.garage.porte,
          seuil: l.garage.seuil,
          arret: [l.garage.porte[0] + u[0] * ARRET, l.garage.porte[1] + u[1] * ARRET],
          cap: cap([-u[0], -u[1]]),
          longue: Math.hypot(l.garage.seuil[0] - l.garage.porte[0], l.garage.seuil[1] - l.garage.porte[1]) >= ARRET + 2.2,
        });
    }
  const parcs = (lieux?.parcs ?? [])
    .map((p) => ({
      centre: p.centre,
      bouts: p.bouts
        .map((b) => {
          const r = rattache(troncons, b.seuil, b.vers);
          return r && { ...r, chemin: [p.centre, b.seuil] };
        })
        .filter(Boolean),
    }))
    .filter((p) => p.bouts.length >= 2);
  let place = null;
  if (lieux?.place) {
    const bouts = lieux.place.bouts
      .map((b) => {
        const r = rattache(troncons, b.seuil, b.vers);
        return r && { ...r, seuil: b.seuil, vers: b.vers };
      })
      .filter(Boolean);
    place = { fontaine: lieux.place.fontaine, bouts };
  }
  return { garages, portes, parcs, place };
}
// le chemin, dans la place, de son entree a une place pres de la fontaine (3 x 1,6 m, sa borne au bout -X), en evitant
// les bancs (a 3,5 m de part et d'autre, le long de X) : rend [entree ... pres de la fontaine]
function versFontaine(place, bout, tirage) {
  const [fx, fz] = place.fontaine;
  const [vx, vz] = DIRECTIONS[bout.vers];
  if (vz) {
    // pas contre la borne et son bec, au bout -X du bassin (nature-kit)
    const x = fx + entre(tirage, -0.3, 1.2);
    return [bout.seuil, [x, fz + vz * 3.2], [x, fz + vz * 1.7]];
  }
  const cote = tirage() < 0.5 ? -1 : 1;
  return [
    bout.seuil,
    [fx + vx * 6, fz + cote * 2],
    [fx + vx * 2.3, fz + cote * 1],
  ];
}

// Le reseau des trottoirs : aux croisements, un coin par quart (le coin du pate, ou le trottoir tourne), relie aux
// trottoirs des troncons qui le bordent ; les passages pietons relient les deux trottoirs d'un troncon ; quand une
// branche manque (un T), les deux coins de ce cote se suivent sur un trottoir droit. Jamais de trottoir qui ne borde pas
// un pate (le cote chantier de la rue de ceinture), jamais de traversee hors des passages ni d'un raccord.
// Un passant y va d'un lieu { T, t, c } a un autre par le plus court chemin : rend les points, du trottoir au trottoir.
function reseauPietons(reseau, plan, { traversees = true } = {}) {
  const D = CIRCULATION.trottoir;
  const dansPate = (x, z) => plan.pates.some((p) => x > p.x[0] && x < p.x[1] && z > p.z[0] && z < p.z[1]);
  const noeuds = [];
  const nouveau = (p) => {
    const n = { p, voisins: [] };
    noeuds.push(n);
    return n;
  };
  const lie = (a, b, entre = []) => {
    const aller = [...entre, b.p];
    const l = longueurDe([a.p, ...aller]);
    a.voisins.push({ n: b, points: aller, l });
    b.voisins.push({ n: a, points: [...[...entre].reverse(), a.p], l });
  };
  // les coins : (qx, qz) le quart du croisement ; un giratoire a son trottoir annulaire (de 11 a 13 m)
  const coins = new Map();
  const cleCoin = (N, qx, qz) => `${N.x}:${N.z}:${qx}:${qz}`;
  const R = 12;
  for (const N of reseau.croisements)
    for (const qx of [-1, 1])
      for (const qz of [-1, 1]) {
        if (!dansPate(N.x + qx * (N.demi + 2), N.z + qz * (N.demi + 2))) continue;
        const p = N.giratoire ? [N.x + qx * R * Math.SQRT1_2, N.z + qz * R * Math.SQRT1_2] : [N.x + qx * D, N.z + qz * D];
        coins.set(cleCoin(N, qx, qz), nouveau(p));
      }
  // du bout d'un trottoir au coin d'un giratoire, le long de l'anneau
  const arc = (N, de, coin) => {
    if (!N.giratoire) return [];
    const a0 = Math.atan2(de[1] - N.z, de[0] - N.x);
    let a1 = Math.atan2(coin.p[1] - N.z, coin.p[0] - N.x);
    if (a1 - a0 > Math.PI) a1 -= 2 * Math.PI;
    if (a0 - a1 > Math.PI) a1 += 2 * Math.PI;
    return [0, 1 / 3, 2 / 3].map((f) => {
      const a = a0 + (a1 - a0) * f;
      return [N.x + Math.cos(a) * R, N.z + Math.sin(a) * R];
    });
  };
  // les trottoirs : sur chaque cote d'un troncon qui borde un pate, ses stations dans l'ordre (coin, passages, coin)
  const trottoirs = new Map();
  const passages = new Map();
  for (const T of reseau.troncons)
    for (const c of [-1, 1]) {
      const milieu = point(T, (T.t0 + T.t1) / 2, c * (RUE_DEMI + 1));
      if (!dansPate(...milieu)) continue;
      const stations = [];
      const bout = (N, t, debut) => {
        if (!N) return;
        const [qx, qz] = T.h ? [debut ? 1 : -1, c] : [-c, debut ? 1 : -1];
        const coin = coins.get(cleCoin(N, qx, qz));
        if (!coin) return;
        const ici = point(T, t, c * D);
        stations.push({ t, n: coin, entre: arc(N, ici, coin).slice(1) });
      };
      bout(T.a, T.t0, true);
      for (const tp of T.passages) {
        const n = nouveau(point(T, tp, c * D));
        stations.push({ t: tp, n, entre: [] });
        passages.set(`${tp}:${c}:${reseau.troncons.indexOf(T)}`, n);
      }
      bout(T.b, T.t1, false);
      stations.sort((a, b) => a.t - b.t);
      for (let k = 0; k + 1 < stations.length; k++) {
        const [a, b] = [stations[k], stations[k + 1]];
        lie(a.n, b.n, [...[...a.entre].reverse(), point(T, a.t, c * D), point(T, b.t, c * D), ...b.entre]);
      }
      trottoirs.set(`${reseau.troncons.indexOf(T)}:${c}`, stations);
    }
  // les traversees, aux passages pietons ; en qualite basse, ils ne sont pas dessines (road-kit) : personne ne traverse
  if (traversees) reseau.troncons.forEach((T, i) => {
    for (const tp of T.passages) {
      const [a, b] = [passages.get(`${tp}:-1:${i}`), passages.get(`${tp}:1:${i}`)];
      if (a && b) lie(a, b);
    }
  });
  // une branche qui manque : le trottoir passe droit d'un coin a l'autre
  for (const N of reseau.croisements)
    for (const q of [-1, 1]) {
      const [ax, az] = [coins.get(cleCoin(N, -1, q)), coins.get(cleCoin(N, 1, q))];
      if (ax && az && !N.branches.has(q > 0 ? "+z" : "-z")) lie(ax, az);
      const [bx, bz] = [coins.get(cleCoin(N, q, -1)), coins.get(cleCoin(N, q, 1))];
      if (bx && bz && !N.branches.has(q > 0 ? "+x" : "-x")) lie(bx, bz);
    }

  // d'un lieu { T, t, c } a ses stations voisines sur son trottoir : [{ n, points, l }]
  const acces = (lieu) => {
    const stations = trottoirs.get(`${reseau.troncons.indexOf(lieu.T)}:${lieu.c}`);
    if (!stations) return [];
    const ici = point(lieu.T, lieu.t, lieu.c * D);
    const avant = stations.filter((s) => s.t <= lieu.t).at(-1);
    const apres = stations.find((s) => s.t > lieu.t);
    return [avant, apres].filter(Boolean).map((s) => {
      const points = [point(lieu.T, s.t, lieu.c * D), ...s.entre, s.n.p];
      return { n: s.n, points, l: longueurDe([ici, ...points]) };
    });
  };
  return {
    // le plus court chemin (Dijkstra, sur quelques centaines de noeuds) ; null s'il n'y en a pas
    route(a, b) {
      const ici = point(a.T, a.t, a.c * D);
      const la = point(b.T, b.t, b.c * D);
      if (a.T === b.T && a.c === b.c) return [ici, la];
      const fins = new Map(acces(b).map((x) => [x.n, x]));
      const dist = new Map();
      const prec = new Map();
      const file = [];
      for (const x of acces(a)) {
        dist.set(x.n, x.l);
        prec.set(x.n, { de: null, points: x.points });
        file.push(x.n);
      }
      let meilleur = null;
      let total = Infinity;
      while (file.length) {
        file.sort((m, n) => dist.get(m) - dist.get(n));
        const n = file.shift();
        const d = dist.get(n);
        if (d >= total) break;
        const fin = fins.get(n);
        if (fin && d + fin.l < total) {
          total = d + fin.l;
          meilleur = n;
        }
        for (const v of n.voisins) {
          const nd = d + v.l;
          if (nd < (dist.get(v.n) ?? Infinity)) {
            if (!dist.has(v.n)) file.push(v.n);
            dist.set(v.n, nd);
            prec.set(v.n, { de: n, points: v.points });
          }
        }
      }
      if (!meilleur) return null;
      const morceaux = [];
      for (let n = meilleur; n; n = prec.get(n).de) morceaux.unshift(prec.get(n).points);
      const fin = fins.get(meilleur).points; // du coin ou du passage au lieu : le chemin d'acces, a l'envers
      return [ici, ...morceaux.flat(), ...[...fin].reverse().slice(1), la];
    },
  };
}
const sansDoublons = (points) =>
  points.filter(
    (p, i) =>
      i === 0 ||
      Math.hypot(p[0] - points[i - 1][0], p[1] - points[i - 1][1]) > 1e-3,
  );

// Le trajet d'une voiture : du garage a la voie, quelques troncons au hasard, puis le garage d'une autre villa sur le
// troncon ou elle se trouve. Rend { points } ou null.
function trajetVoiture(reseau, garages, tirage) {
  const { voie: V, bord: B, sortie: L } = CIRCULATION;
  for (let essai = 0; essai < 30; essai++) {
    const g0 = choisis(tirage, garages);
    const s0 = tirage() < 0.5 ? 1 : -1;
    const n = Math.floor(
      entre(tirage, CIRCULATION.troncons[0], CIRCULATION.troncons[1] + 1),
    );
    const bord0 = point(g0.T, g0.t, g0.c * B);
    const points = [
      g0.arret,
      g0.seuil,
      bord0,
      ...bezier(
        bord0,
        point(g0.T, g0.t, s0 * V),
        point(g0.T, g0.t + s0 * L, s0 * V),
      ),
    ];
    let [T, s, te] = [g0.T, s0, g0.t + s0 * L];
    let fin = null;
    for (let k = 0; k <= 14; k++) {
      const noeud = s > 0 ? T.b : T.a;
      const devant = garages.filter(
        (g) => g.T === T && g !== g0 && (g.t - te) * s >= L + 2,
      );
      if (devant.length && (k >= n || !noeud)) {
        fin = choisis(tirage, devant);
        break;
      }
      if (!noeud) break;
      const suites = reseau.sorties.get(noeud).filter((x) => x.troncon !== T);
      if (!suites.length) break;
      const suite = choisis(tirage, suites);
      points.push(
        voie(T, s, 1),
        ...traversee(noeud, { troncon: T, sens: s }, suite),
      );
      [T, s] = [suite.troncon, suite.sens];
      te = s > 0 ? T.t0 : T.t1;
    }
    if (!fin) continue;
    const avant = point(T, fin.t - s * L, s * V);
    const bord1 = point(T, fin.t, fin.c * B);
    points.push(
      avant,
      ...bezier(avant, point(T, fin.t, s * V), bord1),
      fin.seuil,
      fin.arret,
    );
    return { points: sansDoublons(points) };
  }
  return null;
}

// Le trajet d'un passant, par les trottoirs : d'une porte a une autre, pas trop loin ; ou par un parc, dont il prend les
// chemins d'une entree a une autre ; ou a la fontaine, ou il s'arrete un moment. Rend { etapes } ou null ; une etape :
// { points } (il marche) ou { pause, fontaine } (il s'arrete).
function trajetPassant(endroits, pietons, tirage) {
  const { portes, parcs, place } = endroits;
  const [proche, loin] = CIRCULATION.balade;
  const seuil = (l) => l.chemin.at(-1);
  const pres = (p, l) => portes.filter((d) => d !== l && Math.hypot(seuil(d)[0] - p[0], seuil(d)[1] - p[1]) < loin);
  const choix = tirage();
  for (let essai = 0; essai < 20; essai++) {
    if (choix < 0.3 && place?.bouts.length) {
      // a la fontaine : d'une porte pas trop loin, par l'entree de la place la plus proche, et retour vers une porte
      const autour = pres(place.fontaine);
      if (!autour.length) break;
      const d0 = choisis(tirage, autour);
      const d1 = choisis(tirage, autour);
      const bout = [...place.bouts].sort(
        (a, b) => Math.hypot(a.seuil[0] - seuil(d0)[0], a.seuil[1] - seuil(d0)[1]) - Math.hypot(b.seuil[0] - seuil(d0)[0], b.seuil[1] - seuil(d0)[1]),
      )[0];
      const aller = pietons.route(d0, bout);
      const retour = pietons.route(bout, d1);
      if (!aller || !retour) continue;
      const dedans = versFontaine(place, bout, tirage);
      return {
        etapes: [
          { points: sansDoublons([...d0.chemin, ...aller, ...dedans]) },
          { pause: entre(tirage, CIRCULATION.pause[0], CIRCULATION.pause[1]), fontaine: true },
          { points: sansDoublons([...[...dedans].reverse(), ...retour, ...[...d1.chemin].reverse()]) },
        ],
      };
    }
    if (choix < 0.5 && parcs.length) {
      // par un parc : d'une porte proche d'une entree a une porte proche d'une autre
      const parc = choisis(tirage, parcs);
      const a = choisis(tirage, parc.bouts);
      const b = choisis(tirage, parc.bouts.filter((x) => x !== a));
      const [pa, pb] = [pres(seuil(a)), pres(seuil(b))];
      if (!pa.length || !pb.length) continue;
      const [d0, d1] = [choisis(tirage, pa), choisis(tirage, pb)];
      const aller = pietons.route(d0, a);
      const retour = pietons.route(b, d1);
      if (!aller || !retour) continue;
      const points = [...d0.chemin, ...aller, ...[...a.chemin].reverse(), ...b.chemin, ...retour, ...[...d1.chemin].reverse()];
      return { etapes: [{ points: sansDoublons(points) }] };
    }
    // d'une porte a une autre, ni la meme ni trop loin
    const d0 = choisis(tirage, portes);
    const autres = pres(seuil(d0), d0).filter((d) => Math.hypot(seuil(d)[0] - seuil(d0)[0], seuil(d)[1] - seuil(d0)[1]) > proche);
    if (!autres.length) continue;
    const d1 = choisis(tirage, autres);
    const t = pietons.route(d0, d1);
    if (!t) continue;
    return { etapes: [{ points: sansDoublons([...d0.chemin, ...t, ...[...d1.chemin].reverse()]) }] };
  }
  return null;
}

const longueurDe = (points) => {
  let l = 0;
  for (let i = 1; i < points.length; i++)
    l += Math.hypot(
      points[i][0] - points[i - 1][0],
      points[i][1] - points[i - 1][1],
    );
  return l;
};
// la position et le cap a la distance s d'une polyligne : [x, z, cap]
function surPolyligne(points, s) {
  for (let i = 1; i < points.length; i++) {
    const [a, b] = [points[i - 1], points[i]];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (s <= l || i === points.length - 1) {
      const f = l ? Math.min(Math.max(s, 0) / l, 1) : 1;
      return [
        a[0] + (b[0] - a[0]) * f,
        a[1] + (b[1] - a[1]) * f,
        cap([b[0] - a[0], b[1] - a[1]]),
      ];
    }
    s -= l;
  }
  const p = points[points.length - 1];
  return [p[0], p[1], 0];
}
// le dessus du sol sous un point : trottoir, chaussee (et passage pieton), ou dalle (allee, chemin, place)
function solDe(plan) {
  const { trottoir: haut, chaussee, dalle } = CIRCULATION.sol;
  return (x, z) => {
    for (const [gx, gz] of plan.giratoires) {
      const r = Math.hypot(x - gx, z - gz);
      if (r < 13) return r > 11 || r < 5 ? haut : chaussee;
    }
    for (const r of plan.rues)
      if (x >= r.x[0] && x <= r.x[1] && z >= r.z[0] && z <= r.z[1]) {
        const h = r.x[1] - r.x[0] > r.z[1] - r.z[0];
        const ecart = h
          ? Math.abs(z - (r.z[0] + r.z[1]) / 2)
          : Math.abs(x - (r.x[0] + r.x[1]) / 2);
        return ecart > 3 ? haut : chaussee;
      }
    return dalle;
  };
}

// La circulation : creeCirculation(plan, lieux, { graine, quality, reducedMotion }). lieux : ceux de assembleVille.
// update(dt, { nuit }) avance tout et rend { voitures: [{ x, z, heading, color, moving }], passants: [{ rang, x, y,
// z, cap, etat }], bouge } ; rang : le passant de la scene (0 a plafond - 1) ; bouge vaut false quand la ville est
// figee (rien ne change d'une image a l'autre).
export function creeCirculation(
  plan,
  lieux,
  { graine = "gdc", quality = "high", reducedMotion = false } = {},
) {
  const reseau = reseauCirculation(plan);
  const endroits = lieuxDeCirculation(reseau, lieux);
  const sol = solDe(plan);
  const pietons = reseauPietons(reseau, plan, { traversees: quality === "high" });
  const tirage = alea(`circulation:${graine}`);
  const plafonds = CIRCULATION.plafonds[quality === "high" ? "high" : "low"];
  const voitures = [];
  const passants = [];
  // une premiere voiture et un premier passant tot, pour que la ville vive des l'ouverture
  let attenteVoiture = entre(tirage, 2, 6);
  let attentePassant = entre(tirage, 1, 4);
  const couleur = () => choisis(tirage, ["a", "b", "c"]);

  // la ville figee : des voitures garees au bout de leur allee, des passants immobiles autour de la fontaine
  const fige = { voitures: [], passants: [] };
  if (reducedMotion) {
    const libres = endroits.garages.filter((g) => g.longue);
    for (
      let k = 0;
      k < Math.min(CIRCULATION.fige.voitures, plafonds.voitures) &&
      libres.length;
      k++
    ) {
      const g = libres.splice(Math.floor(tirage() * libres.length), 1)[0];
      fige.voitures.push({
        x: g.arret[0],
        z: g.arret[1],
        heading: g.cap,
        color: couleur(),
        moving: false,
      });
    }
    const f = endroits.place?.fontaine;
    if (f)
      for (
        let k = 0;
        k < Math.min(CIRCULATION.fige.passants, plafonds.passants);
        k++
      ) {
        const a = POSES_FIGEES[k % POSES_FIGEES.length]; // pas au bout -X, contre la borne et son bec
        const [x, z] = [f[0] + Math.cos(a) * 2.4, f[1] + Math.sin(a) * 2.4];
        fige.passants.push({
          rang: k,
          x,
          y: sol(x, z),
          z,
          cap: cap([f[0] - x, f[1] - z]),
          etat: "idle",
        });
      }
  }
  const rangLibre = () => {
    for (let r = 0; r < plafonds.passants; r++)
      if (!passants.some((p) => p.rang === r)) return r;
    return -1;
  };

  return {
    reseau,
    endroits,
    sol,
    get enRoute() {
      return { voitures: voitures.length, passants: passants.length };
    },
    update(dt, { nuit = false } = {}) {
      if (reducedMotion) {
        // la nuit, la moitie, comme en route
        const [v, p] = nuit
          ? [Math.ceil(fige.voitures.length / 2), Math.ceil(fige.passants.length / 2)]
          : [fige.voitures.length, fige.passants.length];
        return { voitures: fige.voitures.slice(0, v), passants: fige.passants.slice(0, p), bouge: false };
      }
      const plafondV = nuit
        ? Math.ceil(plafonds.voitures / 2)
        : plafonds.voitures;
      const plafondP = nuit
        ? Math.ceil(plafonds.passants / 2)
        : plafonds.passants;
      // les departs, par vagues
      attenteVoiture -= dt;
      if (attenteVoiture <= 0) {
        attenteVoiture = entre(tirage, ...CIRCULATION.vagues.voitures);
        const t =
          voitures.length < plafondV && endroits.garages.length >= 2
            ? trajetVoiture(reseau, endroits.garages, tirage)
            : null;
        if (t)
          voitures.push({
            points: t.points,
            longueur: longueurDe(t.points),
            s: 0,
            color: couleur(),
            cap: null,
          });
      }
      attentePassant -= dt;
      if (attentePassant <= 0) {
        attentePassant = entre(tirage, ...CIRCULATION.vagues.passants);
        const rang = passants.length < plafondP ? rangLibre() : -1;
        const t =
          rang >= 0 && endroits.portes.length >= 2
            ? trajetPassant(endroits, pietons, tirage)
            : null;
        if (t)
          passants.push({
            rang,
            etapes: t.etapes.map((e) =>
              e.points ? { ...e, longueur: longueurDe(e.points) } : e,
            ),
            k: 0,
            s: 0,
            cap: null,
          });
      }
      // le cap rejoint celui du trajet sans a-coup
      const tourne = (o, vise) => {
        o.cap =
          o.cap === null
            ? vise
            : o.cap +
              ecartAngle(o.cap, vise) * Math.min(1, dt * CIRCULATION.virage);
        return o.cap;
      };
      // les voitures avancent, et rentrent au garage au bout de leur trajet
      for (let i = voitures.length - 1; i >= 0; i--) {
        voitures[i].s += CIRCULATION.vitesse * dt;
        if (voitures[i].s >= voitures[i].longueur) voitures.splice(i, 1);
      }
      const sortieV = voitures.map((v) => {
        const [x, z, c] = surPolyligne(v.points, v.s);
        return { x, z, heading: tourne(v, c), color: v.color, moving: true };
      });
      // les passants marchent, s'arretent a la fontaine, repartent, et rentrent par une porte
      for (const p of passants) {
        const e = p.etapes[p.k];
        p.s += e.points ? CIRCULATION.marche * dt : dt;
        if (p.s >= (e.points ? e.longueur : e.pause)) {
          p.k++;
          p.s = 0;
        }
      }
      for (let i = passants.length - 1; i >= 0; i--)
        if (passants[i].k >= passants[i].etapes.length) passants.splice(i, 1);
      const fontaine = endroits.place?.fontaine;
      const ouEst = (p) => p.etapes[p.k - 1].points.at(-1); // ou s'est arrete un passant a la fontaine
      const aLaFontaine = passants.filter((p) => p.etapes[p.k].fontaine);
      const sortieP = passants.map((p) => {
        const e = p.etapes[p.k];
        if (e.points) {
          const [x, z, c] = surPolyligne(e.points, p.s);
          return {
            rang: p.rang,
            x,
            y: sol(x, z),
            z,
            cap: tourne(p, c),
            etat: "walk",
          };
        }
        // a la fontaine : il parle s'il y a quelqu'un d'autre (il le regarde), sinon il regarde l'eau
        const [x, z] = ouEst(p);
        const autre = aLaFontaine.find((q) => q !== p);
        const [vx, vz] = autre ? ouEst(autre) : fontaine;
        return {
          rang: p.rang,
          x,
          y: sol(x, z),
          z,
          cap: tourne(p, cap([vx - x, vz - z])),
          etat: autre ? "talk" : "idle",
        };
      });
      return { voitures: sortieV, passants: sortieP, bouge: true };
    },
  };
}
