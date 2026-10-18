import { defineConfig } from 'vite';

// `npm run dev` sert la galerie (index.html) ; `npm run build` produit la bibliothèque livrée à GDC.
export default defineConfig({
  // les modeles 3D sont des ressources, integres a la bibliotheque (?inline) : la page ne va rien chercher ailleurs
  assetsInclude: ['**/*.glb'],
  build: {
    lib: { entry: 'src/library.js', formats: ['es'], fileName: () => 'maquettes.js' },
  },
});
