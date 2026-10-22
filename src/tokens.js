// Couleurs partagees par tous les composants, lues dans src/palette.json (la meme source que les scripts Blender).
// Les couleurs d'etat ne servent qu'aux badges et a l'interface HTML : elles ne colorent jamais les materiaux du monde
// (bible WORKSITE 1.2). Les couleurs d'equipe habillent les tenues des personnages.
import palette from "./palette.json" with { type: "json" };
import { groupFloors } from "./etages.js";

export const tokens = {
  monde: palette.monde,
  materiaux: palette.materiaux,
  interface: palette.interface,
  state: palette.etat,
  team: palette.equipe,
  personnages: palette.personnages, // peaux, cheveux et orange fluo du gilet (materiaux MAT_SKIN_*, MAT_HAIR_*, MAT_FABRIC_HIVIS)
};

// Les couleurs de base pour un theme d'interface : celles du monde (identiques en clair et en sombre),
// plus le fond et l'encre du theme. Les anciennes cles (ground, ink, paper) restent pour les premiers composants.
export function paletteFor(theme) {
  const ui = palette.interface[theme === "dark" ? "dark" : "light"];
  return {
    ...palette.monde,
    ground: palette.monde.surface,
    paper: ui.background,
    ink: ui.ink,
    ui,
  };
}

// Le contexte passe a create() : le meme pour la galerie, le controle et GDC.
// assets : une copie des modeles du composant pour cette instance (voir src/assets.js).
// groupFloors : la regle des six etages (src/etages.js), injectee comme Three.js : un composant n'importe rien hors de
// son dossier.
// materiau : le materiau partage d'un MAT_ de la palette (chargeur.materiau(THREE), registre de src/materiaux.js) ; un
// composant ne le libere jamais. Absent, le composant fabrique les siens, comme avant le registre.
export function makeContext(
  { theme = "light", quality = "high", reducedMotion = false } = {},
  assets = {},
  materiau = undefined,
) {
  const t = theme === "dark" ? "dark" : "light";
  return {
    tokens,
    theme: t,
    palette: paletteFor(t),
    quality: quality === "low" ? "low" : "high",
    reducedMotion: Boolean(reducedMotion),
    assets,
    groupFloors,
    materiau,
  };
}

// Les variables CSS des elements d'interface (lot G6), en clair et en sombre. Le theme se choisit par
// data-theme="dark" sur un ancetre (la racine de GDC) ; --gdc-motion vaut 0 quand on demande moins d'animations
// (preference du systeme, ou data-motion="reduced"). Les variables traversent le shadow DOM des elements.
export function cssVariables() {
  const kebab = (k) => k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
  const bloc = (o, prefixe) =>
    Object.entries(o)
      .map(([k, v]) => `  --gdc-${prefixe}${kebab(k)}: ${v};`)
      .join("\n");
  const fixes = [
    bloc(palette.etat, "state-"),
    bloc(palette.equipe, "team-"),
    "  --gdc-font-title: 'Manrope', system-ui, sans-serif;",
    "  --gdc-font-ui: 'Inter', system-ui, sans-serif;",
    "  --gdc-font-mono: 'JetBrains Mono', ui-monospace, monospace;",
    "  --gdc-motion: 1;",
    // --gdc-motion as a play state, for CSS animations (the turning gear of « Actif »)
    "  --gdc-play: running;",
  ].join("\n");
  // --gdc-sign-edge : le liseré clair de l'octogone d'erreur, trop proche du fond sombre (décision de PA du 21 octobre 2026)
  const lisere = { light: "transparent", dark: palette.interface.dark.ink };
  // la mise en evidence du survol partage (hover-link) : un fond teinte et un trait d'encre, plus legers que la
  // selection ; un trait en box-shadow, qui ne fait pas sauter la liste. Le trait tient 3:1 contre le fond teinte
  // (WCAG 1.4.11) : 60 % d'encre en clair, 45 % en sombre
  const encre = (t) => palette.interface[t].ink;
  const trait = { light: 60, dark: 45 };
  const survol = (t) =>
    `\n  --gdc-highlight-fill: color-mix(in srgb, ${encre(t)} 6%, transparent);` +
    `\n  --gdc-highlight-ring: inset 0 0 0 1px color-mix(in srgb, ${encre(t)} ${trait[t]}%, transparent);`;
  const theme = (t) =>
    bloc(palette.interface[t], "") +
    survol(t) +
    `\n  --gdc-sign-edge: ${lisere[t]};\n  color-scheme: ${t};`;
  return [
    `:root {\n${fixes}\n}`,
    `:root, [data-theme="light"] {\n${theme("light")}\n}`,
    `[data-theme="dark"] {\n${theme("dark")}\n}`,
    "@media (prefers-reduced-motion: reduce) { :root { --gdc-motion: 0; --gdc-play: paused; } }",
    '[data-motion="reduced"] { --gdc-motion: 0; --gdc-play: paused; }',
  ].join("\n");
}
