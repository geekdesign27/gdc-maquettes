// La camera qui suit la selection (plan de l'atelier, I-8 ; derniere passe de GDC, section 6) : quand GDC choisit
// quelque chose (gdc-select), la carte va a lui. Un saut sans mouvement avec « moins d'animation » ; sinon un
// deplacement court, interrompu par toute nouvelle selection, qui repart d'ou la camera est. La camera glisse sans
// tourner ni zoomer : son point vise et elle se deplacent ensemble. Three.js est injecte, comme pour les composants ;
// l'hote donne sa camera et le point qu'elle vise (la cible des OrbitControls, par exemple).

export const DUREE_SUIVI = 0.6; // s, un deplacement court

// camera : la camera de l'hote ; cible : le THREE.Vector3 qu'elle vise, deplace avec elle ; reducedMotion : un saut.
export function creeSuivi({
  camera,
  cible,
  reducedMotion = false,
  duree = DUREE_SUIVI,
}) {
  let depart = null;
  let arrivee = null;
  let t = 0;
  const glisse = (vers) => {
    const delta = vers.clone().sub(cible);
    camera.position.add(delta);
    cible.add(delta);
  };
  return {
    // Aller a un point du monde : rend la duree du deplacement (0 pour un saut). Une nouvelle selection interrompt
    // la precedente et repart d'ou la camera est.
    vers(point) {
      if (!point) return 0;
      if (reducedMotion || duree <= 0) {
        depart = null;
        glisse(point);
        return 0;
      }
      depart = cible.clone();
      arrivee = point.clone();
      t = 0;
      return duree;
    },
    // A chaque image : rend true tant que la camera bouge.
    update(dt) {
      if (!depart) return false;
      t = Math.min(t + dt / duree, 1);
      const e = 1 - (1 - t) ** 3; // demarre vite, se pose en douceur
      glisse(depart.clone().lerp(arrivee, e));
      if (t >= 1) depart = null;
      return true;
    },
    // L'utilisateur prend la camera (un glisser, la molette) : le deplacement s'arrete la ou il en est.
    arrete() {
      depart = null;
    },
    get enCours() {
      return depart !== null;
    },
  };
}
