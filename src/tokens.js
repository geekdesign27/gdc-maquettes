// Couleurs partagées par tous les composants.
// Les couleurs d'état ne changent jamais, quel que soit le thème du projet ;
// les couleurs d'équipe n'en reprennent aucune, pour qu'une couleur ne dise jamais deux choses.
export const tokens = {
  state: {
    active: '#2f8a5c',
    waiting: '#d8343f',
    blocked: '#c8761a',
    error: '#9c2a24',
    done: '#5b6470',
    unknown: '#8a929b',
  },
  team: {
    architecture: '#3a5a9b',
    studies: '#6b4fa0',
    site: '#c9a227',
    reception: '#1f8a8a',
    operations: '#7a5c45',
  },
  palette: {
    light: { ground: '#e9e6da', gravel: '#dcd7c6', concrete: '#c9c4b8', wood: '#d8b27a', glass: '#bcd4e6', paper: '#f6f6f2', ink: '#1f242b' },
    dark: { ground: '#2a2e33', gravel: '#34393f', concrete: '#5a5d62', wood: '#9c7a4c', glass: '#4a6a85', paper: '#1d2126', ink: '#ecebe6' },
  },
};

// Les couleurs de base selon le thème (« light » ou « dark »).
export function paletteFor(theme) {
  return tokens.palette[theme === 'dark' ? 'dark' : 'light'];
}

// Le contexte passé à create() : le même pour la galerie, le contrôle et GDC.
export function makeContext({ theme = 'light', quality = 'high', reducedMotion = false } = {}) {
  const t = theme === 'dark' ? 'dark' : 'light';
  return { tokens, theme: t, palette: paletteFor(t), quality: quality === 'low' ? 'low' : 'high', reducedMotion: Boolean(reducedMotion) };
}
