// La barre de progression (lot G6) : l'avancement d'une fiche ou d'un lot, avec sa regle de calcul.
// Brief valide par Pierre-Alain le 21 octobre 2026 : une barre et une fraction, jamais de pourcentage ;
// la regle dans une bulle au survol, au focus clavier et au toucher. Les nombres viennent du harnais, tels quels.

export const meta = {
  id: "progress-bar",
  version: "1.0.0",
  category: "interface",
  tag: "gdc-progress-bar",
  inputs: ["done", "total", "rule", "state"],
  outputs: [],
};

function count(v) {
  if (typeof v === "string" && v.trim() !== "") v = Number(v);
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
}

const CSS = `
:host { display: block; font: 13px/1.3 var(--gdc-font-ui, system-ui, sans-serif); color: var(--gdc-ink); }
* { box-sizing: border-box; }
.barre { display: flex; align-items: center; gap: 8px; min-height: 24px; border-radius: 6px; cursor: help; }
.barre:focus-visible { outline: 2px solid var(--gdc-ink); outline-offset: 3px; }
.piste { position: relative; flex: 1 1 auto; min-width: 48px; height: 6px; border-radius: 3px; overflow: hidden;
  background: color-mix(in srgb, var(--gdc-ink) 12%, transparent); }
.piste.inconnue { background: none; border-top: 2px dashed var(--gdc-state-unknown); height: 0; overflow: visible; border-radius: 0; }
.plein { position: absolute; inset: 0 auto 0 0; width: 0; border-radius: 3px; background: var(--fill, var(--gdc-muted));
  transition: width calc(var(--gdc-motion, 1) * 400ms) ease-out; }
/* le jaune de « Bloqué » est clair : un bord d'encre, comme le panneau de danger */
.plein.blocked { box-shadow: inset 0 0 0 1px color-mix(in srgb, #303841 45%, transparent); }
.fraction { flex: none; font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
.fraction .sur { color: var(--gdc-muted); font-weight: 400; }
svg { flex: none; }
.bulle { position: fixed; inset: auto; margin: 0; padding: 6px 10px; border: 1px solid color-mix(in srgb, var(--gdc-ink) 18%, transparent); border-radius: 8px;
  background: var(--gdc-surface); color: var(--gdc-ink); box-shadow: 0 4px 16px rgb(0 0 0 / .18); font: inherit; max-width: min(320px, calc(100vw - 16px));
  pointer-events: none; }
.bulle .titre { display: block; color: var(--gdc-muted); font-size: 11px; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 2px; }
[hidden] { display: none !important; }
`;

export function define(registry, ctx) {
  const { signes, signIcon } = ctx;

  class ProgressBar extends HTMLElement {
    #data = {};
    #els = {};

    constructor() {
      super();
      const root = this.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = CSS;
      const barre = document.createElement("div");
      barre.className = "barre";
      barre.tabIndex = 0;
      barre.setAttribute("role", "progressbar");
      const signe = document.createElement("span");
      const piste = document.createElement("div");
      piste.className = "piste";
      const plein = document.createElement("div");
      plein.className = "plein";
      piste.append(plein);
      const fraction = document.createElement("span");
      fraction.className = "fraction";
      barre.append(signe, piste, fraction);
      const bulle = document.createElement("div");
      bulle.className = "bulle";
      bulle.setAttribute("aria-hidden", "true"); // la regle est deja dans aria-valuetext
      if ("popover" in HTMLElement.prototype) bulle.popover = "manual";
      else bulle.hidden = true;
      root.append(style, barre, bulle);
      Object.assign(this.#els, { barre, signe, piste, plein, fraction, bulle });

      // la regle : au survol, au focus clavier, au toucher ; jamais seulement au survol
      const ouvre = () => this.#showRule(true);
      const ferme = () => this.#showRule(false);
      barre.addEventListener("mouseenter", ouvre);
      barre.addEventListener("mouseleave", () => {
        if (this.shadowRoot.activeElement !== barre) ferme();
      });
      barre.addEventListener("focus", ouvre);
      barre.addEventListener("blur", ferme);
      barre.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape") ferme();
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

    disconnectedCallback() {
      this.#showRule(false);
    }

    #render() {
      const d = this.#data;
      const { barre, signe, piste, plein, fraction, bulle } = this.#els;
      const done = count(d.done);
      const total = count(d.total) || null; // 0 ou absent : on ne sait pas ce qui est attendu
      const rule =
        typeof d.rule === "string" && d.rule.trim() ? d.rule.trim() : null;
      const absent =
        d.state === undefined || d.state === null || d.state === "";
      const state = absent ? null : signes[d.state] ? d.state : "unknown";

      signe.replaceChildren(...(state ? [signIcon(document, state)] : []));
      signe.hidden = !state;
      piste.classList.toggle("inconnue", total === null);
      plein.hidden = total === null;
      plein.className = "plein" + (state ? " " + state : "");
      plein.style.setProperty(
        "--fill",
        state ? `var(--gdc-state-${state})` : "var(--gdc-muted)",
      );
      // pleine si done depasse total ; les vrais nombres restent dans la fraction
      plein.style.width =
        total === null || done === null
          ? "0"
          : `${Math.min(1, done / total) * 100}%`;

      const n = (v) => (v === null ? "?" : String(v));
      const sur = document.createElement("span");
      sur.className = "sur";
      sur.textContent = " / ";
      fraction.replaceChildren(
        document.createTextNode(n(done)),
        sur,
        document.createTextNode(n(total)),
      );

      const regle = rule || "Règle de calcul non fournie";
      const titre = document.createElement("span");
      titre.className = "titre";
      titre.textContent = "Règle de calcul";
      bulle.replaceChildren(titre, document.createTextNode(regle));

      if (total !== null) {
        barre.setAttribute("aria-valuemin", "0");
        barre.setAttribute("aria-valuemax", String(total));
        if (done !== null)
          barre.setAttribute("aria-valuenow", String(Math.min(done, total)));
        else barre.removeAttribute("aria-valuenow");
      } else {
        for (const a of ["aria-valuemin", "aria-valuemax", "aria-valuenow"])
          barre.removeAttribute(a);
      }
      const etat = state ? `, ${signes[state].label}` : "";
      barre.setAttribute(
        "aria-valuetext",
        total === null
          ? `Avancement inconnu${etat}`
          : `${n(done)} sur ${total}${etat}. Règle : ${regle}`,
      );
      barre.setAttribute("aria-label", "Avancement");
    }

    #showRule(ouvrir) {
      const { barre, bulle } = this.#els;
      if (!ouvrir) {
        if (bulle.hidePopover) {
          if (bulle.matches(":popover-open")) bulle.hidePopover();
        } else bulle.hidden = true;
        return;
      }
      if (bulle.showPopover) {
        if (!bulle.matches(":popover-open")) bulle.showPopover();
      } else bulle.hidden = false;
      const r = barre.getBoundingClientRect();
      const w = bulle.offsetWidth;
      const h = bulle.offsetHeight;
      const left = Math.max(8, Math.min(r.left, innerWidth - w - 8));
      let top = r.bottom + 6;
      if (top + h > innerHeight - 8) top = r.top - h - 6;
      bulle.style.left = `${left}px`;
      bulle.style.top = `${Math.max(8, top)}px`;
    }
  }

  registry.define(meta.tag, ProgressBar);
}
