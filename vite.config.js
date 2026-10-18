import { defineConfig } from 'vite';

// `npm run dev` sert la galerie (index.html) ; `npm run build` produit la bibliothèque livrée à GDC.
export default defineConfig({
  build: {
    lib: { entry: 'src/library.js', formats: ['es'], fileName: () => 'maquettes.js' },
  },
});
