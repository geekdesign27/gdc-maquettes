// Les elements d'interface (lot G6), livres a GDC avec la bibliotheque : polices integrees, variables CSS,
// signaletique injectee. Chaque element exporte meta et define(registry, ctx) ; rien n'est defini a l'import.
import { tokens, cssVariables } from "./tokens.js";
import { signes, signIcon, plusGrave, GRAVITE } from "./signes.js";
import manrope from "../components/interface/fonts/manrope-latin-wght-normal.woff2?inline";
import inter from "../components/interface/fonts/inter-latin-wght-normal.woff2?inline";
import jetbrainsMono from "../components/interface/fonts/jetbrains-mono-latin-wght-normal.woff2?inline";

const modules = import.meta.glob("../components/interface/*/index.js", {
  eager: true,
});
export const elements = Object.fromEntries(
  Object.values(modules)
    .filter((m) => typeof m.define === "function")
    .map((m) => [m.meta.id, m]),
);

// Les polices, en data URL : la page ne va rien chercher ailleurs (bible, 17.5 ; components/interface/fonts/README.md).
export function fontFaces() {
  const face = (famille, url, graisses) =>
    `@font-face { font-family: '${famille}'; src: url(${url}) format('woff2'); font-weight: ${graisses}; font-style: normal; font-display: swap; }`;
  return [
    face("Manrope", manrope, "200 800"),
    face("Inter", inter, "100 900"),
    face("JetBrains Mono", jetbrainsMono, "100 800"),
  ].join("\n");
}

export function interfaceCss() {
  return fontFaces() + "\n" + cssVariables();
}

// Les portraits des agents (lot G7) : 'id' de equipe.json -> texte du SVG, a inserer tel quel (classe d'etat).
const fichiersPortraits = import.meta.glob(
  "../components/illustration/agent-portraits/*.svg",
  { eager: true, query: "?raw", import: "default" },
);
const portraits = Object.fromEntries(
  Object.entries(fichiersPortraits).map(([p, texte]) => [
    p.match(/([^/]+)\.svg$/)[1],
    texte,
  ]),
);

// Le portrait d'un agent en element SVG pret a poser (lu en XML : ni script ni HTML), ou null s'il n'existe pas.
// Les elements n'injectent jamais de HTML (src/contract.js) : c'est ici, une fois, que le texte devient un noeud.
function portrait(document, id) {
  const source = Object.hasOwn(portraits, id) ? portraits[id] : "";
  if (!source) return null;
  const svg = new DOMParser().parseFromString(
    source,
    "image/svg+xml",
  ).documentElement;
  return svg.localName === "svg" ? document.importNode(svg, true) : null;
}

// Le contexte injecte dans chaque element : les jetons, la signaletique et les portraits, une seule source.
export const interfaceContext = {
  tokens,
  signes,
  signIcon,
  plusGrave,
  gravite: GRAVITE,
  portrait,
};

// Definit tous les elements (gdc-<id>) et pose, une fois, la feuille des polices et des variables dans le document.
export function defineElements({
  registry = globalThis.customElements,
  document = globalThis.document,
  styles = true,
} = {}) {
  if (styles && document && !document.getElementById("gdc-interface-css")) {
    const style = document.createElement("style");
    style.id = "gdc-interface-css";
    style.textContent = interfaceCss();
    document.head.append(style);
  }
  for (const m of Object.values(elements))
    if (!registry.get(m.meta.tag)) m.define(registry, interfaceContext);
  return Object.values(elements).map((m) => m.meta.tag);
}
