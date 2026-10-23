// La prise d'un agent au pointeur (fiche agent-marker) : sur la carte entiere d'un portable, un agent ne mesure que
// 16 x 5 px. Sa zone de prise se calcule a l'ecran, et non par une forme 3D invisible qui grandirait et rapetisserait
// avec le zoom : le pointeur prend l'agent le plus proche a moins de 12 px de sa silhouette (une cible de 24 px,
// WCAG 2.5.8), et l'agent passe devant le batiment ou le decor qui est derriere lui. Sans Three.js : l'hote (GDC, la
// galerie) projette lui-meme les points de carte.agents().

export const RAYON_PRISE = 12; // px

// La distance d'un point au segment [a, b], a l'ecran.
function auSegment([x, y], [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const l = dx * dx + dy * dy;
  const t = l
    ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l))
    : 0;
  return Math.hypot(ax + t * dx - x, ay + t * dy - y);
}

// agents : [{ id, tete: [x, y], pieds: [x, y] }], a l'ecran, en pixels ; (x, y) : le pointeur. Rend l'identifiant de
// l'agent dont la silhouette (des pieds a la tete) est la plus proche du pointeur, a moins de rayon pixels ; null sinon.
export function agentPris(agents, x, y, rayon = RAYON_PRISE) {
  let pris = null;
  let meilleur = rayon;
  for (const a of agents || []) {
    if (!a || !a.tete || !a.pieds) continue;
    const d = auSegment([x, y], a.pieds, a.tete);
    if (d <= meilleur) [pris, meilleur] = [a.id, d];
  }
  return pris;
}
