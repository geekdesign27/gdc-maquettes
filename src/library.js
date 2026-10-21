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
export { tokens, paletteFor, makeContext, cleAsset };
export { elements, defineElements, interfaceCss, fontFaces, interfaceContext } from './interface.js';
export { cssVariables } from './tokens.js';
