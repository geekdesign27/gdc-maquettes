// Couleurs partagees par tous les composants, lues dans src/palette.json (la meme source que les scripts Blender).
// Les couleurs d'etat ne servent qu'aux badges et a l'interface HTML : elles ne colorent jamais les materiaux du monde
// (bible WORKSITE 1.2). Les couleurs d'equipe habillent les tenues des personnages.
import palette from './palette.json' with { type: 'json' };

export const tokens = {
  monde: palette.monde,
  materiaux: palette.materiaux,
  interface: palette.interface,
  state: palette.etat,
  team: palette.equipe,
};

// Les couleurs de base pour un theme d'interface : celles du monde (identiques en clair et en sombre),
// plus le fond et l'encre du theme. Les anciennes cles (ground, ink, paper) restent pour les premiers composants.
export function paletteFor(theme) {
  const ui = palette.interface[theme === 'dark' ? 'dark' : 'light'];
  return { ...palette.monde, ground: palette.monde.surface, paper: ui.background, ink: ui.ink, ui };
}

// Le contexte passe a create() : le meme pour la galerie, le controle et GDC.
// assets : une copie des modeles du composant pour cette instance (voir src/assets.js).
export function makeContext({ theme = 'light', quality = 'high', reducedMotion = false } = {}, assets = {}) {
  const t = theme === 'dark' ? 'dark' : 'light';
  return { tokens, theme: t, palette: paletteFor(t), quality: quality === 'low' ? 'low' : 'high', reducedMotion: Boolean(reducedMotion), assets };
}
