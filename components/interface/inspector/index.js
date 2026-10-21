// L'inspecteur (lot G6) : la fiche de l'element choisi, en panneau lateral. Brief valide par Pierre-Alain le
// 21 octobre 2026. Tout texte venu du harnais est insere par textContent : il reste du texte, jamais du HTML.
// La copie est celle de <gdc-copy-button>, posee dans l'en-tete : son gdc-copy traverse l'inspecteur.

export const meta = {
  id: "inspector",
  version: "1.0.0",
  category: "interface",
  tag: "gdc-inspector",
  inputs: ["id", "kind", "title", "sections"],
  outputs: ["gdc-close", "gdc-copy", "gdc-select"],
};

const texte = (v) => (v === undefined || v === null ? "" : String(v).trim());

const CSS = `
:host { display: block; min-height: 0; container-type: inline-size; font: 14px/1.4 var(--gdc-font-ui, system-ui, sans-serif); color: var(--gdc-ink);
  background: var(--gdc-surface); }
* { box-sizing: border-box; }
.panneau { height: 100%; overflow: auto; overscroll-behavior: contain; }
header { position: sticky; top: 0; z-index: 1; display: grid; grid-template-columns: 1fr auto; gap: 2px 8px; padding: 14px 12px 10px 16px;
  background: var(--gdc-surface); border-bottom: 1px solid color-mix(in srgb, var(--gdc-ink) 14%, transparent); }
.nature { grid-column: 1; font: 600 11px/1.3 var(--gdc-font-ui, system-ui, sans-serif); text-transform: uppercase; letter-spacing: .06em; color: var(--gdc-muted); }
h2 { grid-column: 1; margin: 0; font: 700 18px/1.25 var(--gdc-font-title, system-ui, sans-serif); overflow-wrap: anywhere; }
.ident { grid-column: 1; display: flex; align-items: center; gap: 2px; min-width: 0; color: var(--gdc-muted); }
.ident code { font: 12px/1.3 var(--gdc-font-mono, ui-monospace, monospace); overflow-wrap: anywhere; }
.fermer { grid-column: 2; grid-row: 1 / span 3; align-self: start; display: grid; place-items: center; width: 40px; height: 40px; border: 0; border-radius: 8px;
  background: none; color: var(--gdc-muted); cursor: pointer; }
.fermer:hover { background: color-mix(in srgb, var(--gdc-ink) 8%, transparent); color: var(--gdc-ink); }
button:focus-visible, summary:focus-visible { outline: 2px solid var(--gdc-ink); outline-offset: 2px; }
details { border-bottom: 1px solid color-mix(in srgb, var(--gdc-ink) 10%, transparent); }
summary { display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 16px 0 10px; cursor: pointer; list-style: none;
  font: 600 14px/1.3 var(--gdc-font-title, system-ui, sans-serif); border-radius: 6px; }
summary::-webkit-details-marker { display: none; }
summary .chevron { flex: none; color: var(--gdc-muted); transition: transform calc(var(--gdc-motion, 1) * 150ms) ease-out; }
details:not([open]) .chevron { transform: rotate(-90deg); }
summary .nb { margin-left: auto; color: var(--gdc-muted); font: 500 12px/1 var(--gdc-font-ui, system-ui, sans-serif); font-variant-numeric: tabular-nums; }
dl { margin: 0; padding: 0 16px 12px; }
.ligne { display: grid; grid-template-columns: minmax(96px, 38%) 1fr; gap: 12px; padding: 6px 0; }
.ligne + .ligne { border-top: 1px dashed color-mix(in srgb, var(--gdc-ink) 10%, transparent); }
dt { color: var(--gdc-muted); overflow-wrap: anywhere; }
dd { margin: 0; display: flex; align-items: flex-start; gap: 6px; min-width: 0; overflow-wrap: anywhere; }
dd svg { flex: none; margin-top: 2px; }
.lien { padding: 0; border: 0; background: none; color: inherit; font: inherit; text-align: left; text-decoration: underline;
  text-decoration-color: color-mix(in srgb, var(--gdc-ink) 45%, transparent); text-underline-offset: 3px; cursor: pointer; overflow-wrap: anywhere;
  min-height: 24px; border-radius: 4px; }
.lien:hover { text-decoration-color: var(--gdc-ink); }
.vide { margin: 0; padding: 0 16px 12px; color: var(--gdc-muted); }
.aucun { margin: 0; padding: 24px 16px; color: var(--gdc-muted); }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
[hidden] { display: none !important; }
/* etroit (telephone) : le libelle passe au-dessus de la valeur */
@container (max-width: 360px) {
  .ligne { grid-template-columns: 1fr; gap: 2px; }
  .lien { min-height: 40px; }
}
`;

export function define(registry, ctx) {
  const { signes, signIcon } = ctx;

  class Inspector extends HTMLElement {
    #data = {};
    #replies = new Set(); // titres des sections repliees, pour l'id affiche
    #idAffiche = null;
    #panneau;

    constructor() {
      super();
      const root = this.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = CSS;
      this.#panneau = document.createElement("section");
      this.#panneau.className = "panneau";
      root.append(style, this.#panneau);
      this.#panneau.addEventListener("keydown", (ev) => {
        // Echap ferme le panneau, sauf s'il ferme d'abord une bulle (la copie refusee)
        if (ev.key !== "Escape") return;
        if (
          ev
            .composedPath()
            .some((n) => n instanceof Element && n.matches(":popover-open"))
        )
          return;
        ev.preventDefault();
        this.#close();
      });
      this.#render();
    }

    get data() {
      return this.#data;
    }
    set data(value) {
      this.#data = value && typeof value === "object" ? value : {};
      this.#render();
    }

    #id() {
      return texte(this.#data.id) || null;
    }

    #close() {
      this.dispatchEvent(
        new CustomEvent("gdc-close", {
          detail: { id: this.#id() },
          bubbles: true,
          composed: true,
        }),
      );
    }

    #select(id) {
      this.dispatchEvent(
        new CustomEvent("gdc-select", {
          detail: { id },
          bubbles: true,
          composed: true,
        }),
      );
    }

    #render() {
      const d = this.#data;
      const id = this.#id();
      if (id !== this.#idAffiche) {
        this.#replies.clear(); // une autre fiche : tout est ouvert
        this.#idAffiche = id;
      } else {
        // la meme fiche : on relit les sections telles qu'elles sont (l'evenement toggle arrive apres coup)
        for (const det of this.#panneau.querySelectorAll("details")) {
          if (det.open) this.#replies.delete(det.dataset.titre);
          else this.#replies.add(det.dataset.titre);
        }
      }
      const titre = texte(d.title) || id;
      const p = this.#panneau;
      p.setAttribute(
        "aria-label",
        titre ? `Inspecteur : ${titre}` : "Inspecteur",
      );

      const header = document.createElement("header");
      const nature = el("span", "nature", texte(d.kind));
      nature.hidden = !texte(d.kind);
      const h2 = el("h2", "", titre || "Aucun élément choisi");
      const ident = el("div", "ident");
      if (id) {
        const copie = document.createElement("gdc-copy-button");
        copie.data = { id, text: titre };
        ident.append(el("code", "", id), copie);
      }
      ident.hidden = !id;
      const fermer = document.createElement("button");
      fermer.type = "button";
      fermer.className = "fermer";
      fermer.setAttribute("aria-label", "Fermer l'inspecteur");
      fermer.title = "Fermer (Échap)";
      fermer.append(croix());
      fermer.addEventListener("click", () => this.#close());
      header.append(nature, h2, ident, fermer);

      const corps = [];
      const sections = Array.isArray(d.sections)
        ? d.sections.filter((s) => s && typeof s === "object")
        : [];
      if (!titre)
        corps.push(
          el(
            "p",
            "aucun",
            "Choisis un lieu, un bâtiment, une fiche ou un agent dans la scène ou la navigation.",
          ),
        );
      for (const s of sections) corps.push(this.#section(s));
      // garder le focus sur ce qu'il visait, si possible, quand les donnees changent
      const focus = this.shadowRoot.activeElement;
      const cle = focus?.dataset?.cle;
      p.replaceChildren(header, ...corps);
      // par comparaison, pas par selecteur : un identifiant peut contenir des guillemets
      if (cle) [...p.querySelectorAll("[data-cle]")].find((n) => n.dataset.cle === cle)?.focus();
    }

    #section(s) {
      const titre = texte(s.title) || "Sans titre";
      const rows = Array.isArray(s.rows)
        ? s.rows.filter((r) => r && typeof r === "object")
        : [];
      const details = document.createElement("details");
      details.dataset.titre = titre;
      details.open = !this.#replies.has(titre);
      details.addEventListener("toggle", () => {
        if (details.open) this.#replies.delete(titre);
        else this.#replies.add(titre);
      });
      const summary = document.createElement("summary");
      summary.dataset.cle = "section:" + titre;
      summary.append(
        chevron(),
        el("span", "", titre),
        el("span", "nb", String(rows.length)),
      );
      details.append(summary);
      if (!rows.length) {
        details.append(el("p", "vide", "Rien à signaler"));
        return details;
      }
      const dl = document.createElement("dl");
      for (const r of rows) {
        const ligne = el("div", "ligne");
        const dd = document.createElement("dd");
        const absent =
          r.state === undefined || r.state === null || r.state === "";
        const state = absent ? null : signes[r.state] ? r.state : "unknown";
        if (state)
          dd.append(
            signIcon(document, state),
            el("span", "sr", `${signes[state].label} : `),
          );
        const valeur = texte(r.value) || "—";
        const ref = texte(r.ref);
        if (ref) {
          const b = el("button", "lien", valeur);
          b.type = "button";
          b.dataset.cle = "ref:" + ref;
          b.addEventListener("click", () => this.#select(ref));
          dd.append(b);
        } else dd.append(el("span", "", valeur));
        ligne.append(el("dt", "", texte(r.label) || "—"), dd);
        dl.append(ligne);
      }
      details.append(dl);
      return details;
    }
  }

  function el(tag, cls, contenu) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (contenu !== undefined) n.textContent = contenu;
    return n;
  }

  function svg(d, largeur) {
    const NS = "http://www.w3.org/2000/svg";
    const s = document.createElementNS(NS, "svg");
    s.setAttribute("viewBox", "0 0 16 16");
    s.setAttribute("width", "16");
    s.setAttribute("height", "16");
    s.setAttribute("aria-hidden", "true");
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", d);
    Object.assign(p.style, {
      fill: "none",
      stroke: "currentColor",
      strokeWidth: largeur,
      strokeLinecap: "round",
      strokeLinejoin: "round",
    });
    s.append(p);
    return s;
  }
  const croix = () => svg("M4 4l8 8M12 4l-8 8", "1.8");
  const chevron = () => {
    const s = svg("M4 6l4 4 4-4", "1.8");
    s.classList.add("chevron");
    return s;
  };

  registry.define(meta.tag, Inspector);
}
