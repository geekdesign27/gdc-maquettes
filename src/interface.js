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

// Le contexte injecte dans chaque element : les jetons et la signaletique, une seule source.
export const interfaceContext = {
  tokens,
  signes,
  signIcon,
  plusGrave,
  gravite: GRAVITE,
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
