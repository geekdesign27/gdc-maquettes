// La bibliotheque livree a GDC : les composants indexes par identifiant, leurs modeles 3D integres,
// et le chargeur. Three.js, GLTFLoader et SkeletonUtils n'y sont pas : GDC les injecte, a la meme version.
import { tokens, paletteFor, makeContext } from './tokens.js';
import { creeChargeur, cleAsset } from './assets.js';

const modules = import.meta.glob('../components/*/*/index.js', { eager: true });
const glbs = import.meta.glob('../components/*/*/*.glb', { eager: true, query: '?inline', import: 'default' });

// les composants 3D (create) ; les elements d'interface (define) sont dans src/interface.js
export const components = Object.fromEntries(Object.values(modules).filter((m) => typeof m.create === 'function').map((m) => [m.meta.id, m]));
// cle 'categorie/id/FICHIER.glb' -> data URL : la page du panneau ne va rien chercher ailleurs
export const sources = Object.fromEntries(Object.entries(glbs).map(([p, url]) => [p.replace('../components/', ''), url]));
export const chargeur = (outils) => creeChargeur(outils, sources);
// les illustrations (lot G7) : 'id' -> { fichier: texte du SVG }, a inserer tel quel dans la page (pas en <img>, pour
// que la classe d'etat d'un portrait s'applique) ; les icones prennent la couleur du texte (currentColor)
const svgs = import.meta.glob('../components/illustration/*/*.svg', { eager: true, query: '?raw', import: 'default' });
export const illustrations = {};
for (const [p, texte] of Object.entries(svgs)) {
  const [, id, fichier] = p.match(/illustration\/([^/]+)\/([^/]+)\.svg$/);
  (illustrations[id] ||= {})[fichier] = texte;
}
export { tokens, paletteFor, makeContext, cleAsset };
export { elements, defineElements, interfaceCss, fontFaces, interfaceContext } from './interface.js';
export { cssVariables } from './tokens.js';
// l'ombre refaite une image sur deux pendant une animation (plan D-1c) : GDC, qui tient le renderer, l'applique aussi
export { ombreAlternee } from './ombre.js';
// la carte vivante (lot G8, fiche city-map) : implantation, chemins, assemblage, actions, vie du chantier
export * as ville from './ville/index.js';
