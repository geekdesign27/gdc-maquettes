// Les chemins de la carte (docs/ville.md, « Les chemins ») : on marche le long des voies de chantier, de porte a porte,
// sans couper a travers une parcelle. Le client ne traverse jamais le chantier (OTConst, art. 6). Une marche dure selon
// la distance, plafonnee a quelques secondes, pour qu'une action ne retarde jamais la lecture de l'etat.
// Rien que des nombres, sans Three.js : GDC peut s'en servir tel quel.

export const VITESSE = 1.4; // m/s, un pas de chantier
export const MARCHE_MAX = 5; // s, le plafond d'une marche
export const MARCHE_MIN = 0.6; // s, un pas de porte

const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

// voies : { points: { id: { x, z, chantier } }, segments: [[a, b]] } (implantation().voies).
export function creeChemins(voies) {
  const voisins = new Map();
  for (const id of Object.keys(voies.points)) voisins.set(id, []);
  for (const [a, b] of voies.segments) {
    if (!voisins.has(a) || !voisins.has(b))
      throw new Error(`segment vers un point inconnu : ${a} – ${b}`);
    const d = dist(xz(voies.points[a]), xz(voies.points[b]));
    voisins.get(a).push([b, d]);
    voisins.get(b).push([a, d]);
  }
  const permis = (id, client) => !(client && voies.points[id].chantier);

  // le point des voies le plus proche d'un point du sol, parmi ceux permis
  function proche(p, client) {
    let best = null;
    let bd = Infinity;
    for (const [id, q] of Object.entries(voies.points)) {
      if (!permis(id, client)) continue;
      const d = dist(p, xz(q));
      if (d < bd) [best, bd] = [id, d];
    }
    return best;
  }

  // Dijkstra : le graphe est petit (une soixantaine de points), une file triee suffit
  function plusCourt(depart, arrivee, client) {
    const d = new Map([[depart, 0]]);
    const avant = new Map();
    const file = [depart];
    const vus = new Set();
    while (file.length) {
      file.sort((a, b) => d.get(a) - d.get(b));
      const u = file.shift();
      if (vus.has(u)) continue;
      vus.add(u);
      if (u === arrivee) break;
      for (const [v, w] of voisins.get(u)) {
        if (!permis(v, client)) continue;
        const nd = d.get(u) + w;
        if (nd < (d.has(v) ? d.get(v) : Infinity)) {
          d.set(v, nd);
          avant.set(v, u);
          file.push(v);
        }
      }
    }
    if (!d.has(arrivee)) return null;
    const ids = [arrivee];
    while (ids[0] !== depart) ids.unshift(avant.get(ids[0]));
    return ids;
  }

  // Un bout de chemin : un lieu (« bureau-client »), un point des voies (« allee:2 ») ou un point du sol ([x, z]).
  function noeud(bout, client) {
    if (Array.isArray(bout)) return { id: proche(bout, client), sol: bout };
    if (voies.points[`porte:${bout}`]) return { id: `porte:${bout}` };
    if (voies.points[bout]) return { id: bout };
    throw new Error(`lieu inconnu des voies : ${bout}`);
  }

  return {
    // Le chemin de de a vers : { points: [[x, z]…], longueur, duree }, ou null s'il n'y en a pas (le client vers le
    // chantier). options.client : le chemin evite le chantier.
    chemin(de, vers, options = {}) {
      const client = Boolean(options.client);
      const a = noeud(de, client);
      const b = noeud(vers, client);
      if (!permis(a.id, client) || !permis(b.id, client)) return null;
      const ids = plusCourt(a.id, b.id, client);
      if (!ids) return null;
      const points = ids.map((id) => xz(voies.points[id]));
      if (a.sol) points.unshift(a.sol);
      if (b.sol) points.push(b.sol);
      return mesure(dedouble(points));
    },
    // Le point des voies le plus proche (pour poser un personnage arrive par un chemin inconnu).
    proche,
  };
}

const xz = (p) => [p.x, p.z];

// deux points qui se confondent (un personnage deja a la porte) ne font qu'un
function dedouble(points) {
  return points.filter((p, i) => i === 0 || dist(points[i - 1], p) > 1e-6);
}

// Un chemin de points quelconques (une tache d'ouvrier dans sa parcelle, un pas de porte) : sa longueur et sa duree.
export function mesure(points) {
  let longueur = 0;
  for (let i = 1; i < points.length; i++)
    longueur += dist(points[i - 1], points[i]);
  return { points, longueur, duree: duree(longueur) };
}

export function duree(longueur) {
  if (longueur <= 0) return 0;
  return Math.min(Math.max(longueur / VITESSE, MARCHE_MIN), MARCHE_MAX);
}

// La position a la fraction f (0 a 1) d'un chemin : [x, z, cap], le cap etant l'angle de la marche autour de Y (0 :
// vers +Z, comme data.facing de character).
export function positionSur(chemin, f) {
  const { points, longueur } = chemin;
  if (points.length === 1 || longueur === 0) return [...points[0], 0];
  let reste = Math.min(Math.max(f, 0), 1) * longueur;
  for (let i = 1; i < points.length; i++) {
    const [a, b] = [points[i - 1], points[i]];
    const d = dist(a, b);
    if (reste <= d || i === points.length - 1) {
      const t = d ? Math.min(reste / d, 1) : 1;
      return [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        Math.atan2(b[0] - a[0], b[1] - a[1]),
      ];
    }
    reste -= d;
  }
  return [...points[points.length - 1], 0];
}
