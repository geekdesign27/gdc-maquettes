// La bibliothèque livrée à GDC : tous les composants, indexés par leur identifiant.
// Three.js n'y est pas : GDC l'injecte dans create().
import { tokens, paletteFor, makeContext } from './tokens.js';

const modules = import.meta.glob('../components/*/*/index.js', { eager: true });

export const components = Object.fromEntries(Object.values(modules).map((m) => [m.meta.id, m]));
export { tokens, paletteFor, makeContext };
