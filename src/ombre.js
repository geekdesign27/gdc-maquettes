// L'ombre recalculee une image sur deux (plan D-1c, decision de Pierre-Alain du 22 octobre 2026) : pendant une
// animation, la carte d'ombre n'est refaite qu'une image sur deux ; l'ombre d'un personnage ou d'un camion qui bouge a
// une image de retard (1/60 s), invisible. Une image isolee (un etat qui change, la camera qui tourne, la fin d'une
// animation) refait toujours l'ombre : a l'arret, l'image est exactement celle d'avant. Profil de D-1c : la passe
// d'ombre fait un peu plus du quart d'une image ; on en gagne la moitie.
// L'hote tient le renderer (la galerie, GDC) : il cree la regle une fois, puis l'appelle avant chaque rendu.
// L'ambiance (city-traffic, decision de Pierre-Alain du 23 octobre 2026) : une image que seule la circulation de la ville
// demande (un update a rendu "ambiance") ne refait pas l'ombre, sauf si elle est perimee : ni les voitures ni les
// passants n'en portent (un disque de contact), la carte d'ombre de l'image d'avant reste juste.
// Three.js n'est pas necessaire ici : seul renderer.shadowMap est touche.

export function ombreAlternee(renderer) {
  renderer.shadowMap.autoUpdate = false;
  let sautee = true; // l'image precedente a garde une ombre perimee (vrai au depart : la premiere image la fait)
  return {
    // continu : une animation demande deja l'image suivante (un update a rendu true) ; ambiance : l'image n'est
    // demandee que par l'ambiance (rien d'autre n'a change)
    avant(continu, ambiance = false) {
      const refait = ambiance && !continu ? sautee : !continu || sautee;
      renderer.shadowMap.needsUpdate = refait;
      sautee = !refait;
    },
    // l'animation s'est arretee sur une image sans ombre refaite : l'hote dessine une image de plus
    get enRetard() {
      return sautee;
    },
  };
}
