// La carte vivante (fiche city-map), livree a GDC dans la bibliotheque : l'implantation, les chemins, puis l'assemblage
// de la carte depuis une scene de GDC, la lecture des actions et la vie du chantier. Three.js est injecte, comme pour
// les composants.
export { ETAPES, ZONES, implantation, zoneDe } from './implantation.js';
export { creeChemins, positionSur, mesure, duree, VITESSE, MARCHE_MAX } from './chemins.js';
export { lisScene, instants, phaseDe } from './scene-gdc.js';
export { equipes, usagers, tache, EFFECTIFS, PLAFONDS } from './vie.js';
export { personneDe, parametresDe } from './equipe.js';
export { creeCarte } from './carte.js';
// la prise d'un agent au pointeur (fiche agent-marker) : le plus proche a moins de 12 px de sa silhouette, a l'ecran
export { agentPris, RAYON_PRISE } from './prise.js';
// l'heure reelle (fiche day-night) : le soleil de Fribourg sur l'heure du poste, la recette de l'instant
export { soleilDe, momentDe, passages, horaireDe, recetteDe, regleLumieres, MOMENTS } from './heure.js';
