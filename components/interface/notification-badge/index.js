// Le badge de notification (lot G6) : pose sur une ancre « badge » de la scene, il compte les alertes ou dit que
// tout est valide. Brief valide par Pierre-Alain le 21 octobre 2026 : le signe du niveau le plus grave et le total ;
// ordre de gravite decision, erreur, bloque ; rond vert a coche sans nombre ; masque a zero. Aucun evenement.

export const meta = {
  id: "notification-badge",
  version: "1.0.0",
  category: "interface",
  tag: "gdc-notification-badge",
  inputs: ["counts"],
  outputs: [],
};

const ALERTES = ["waiting", "error", "blocked"]; // dans l'ordre de gravite (src/signes.js)

function count(v) {
  if (typeof v === "string" && v.trim() !== "") v = Number(v);
  return typeof v === "number" && Number.isFinite(v) && v > 0
    ? Math.floor(v)
    : 0;
}

const pluriel = (n, un, plusieurs) => (n <= 1 ? un : plusieurs);
const MOTS = {
  waiting: (n) =>
    `${n} ${pluriel(n, "décision attend", "décisions attendent")}`,
  error: (n) => `${n} en erreur`,
  blocked: (n) => `${n} ${pluriel(n, "bloqué", "bloqués")}`,
};

const CSS = `
:host { display: inline-flex; vertical-align: middle; font: 700 13px/1 var(--gdc-font-ui, system-ui, sans-serif); color: var(--gdc-ink); }
* { box-sizing: border-box; }
.pastille { display: inline-flex; align-items: center; gap: 4px; height: 24px; padding: 0 8px 0 3px; border-radius: 12px;
  background: var(--gdc-surface); border: 2px solid var(--bord); box-shadow: 0 1px 4px rgb(0 0 0 / .22); font-variant-numeric: tabular-nums; }
.pastille.valide { padding: 0 2px; }
.pastille.pulse { animation: pulse calc(var(--gdc-motion, 1) * 600ms) ease-out 1; }
@keyframes pulse { 0% { transform: scale(1); } 35% { transform: scale(1.18); } 100% { transform: scale(1); } }
[hidden] { display: none !important; }
svg { flex: none; }
`;

export function define(registry, ctx) {
  const { signes, signIcon, plusGrave } = ctx;

  class NotificationBadge extends HTMLElement {
    #data = {};
    #pastille;
    #precedent = 0; // total affiche avant cette mise a jour ; -1 pour « valide »

    constructor() {
      super();
      const root = this.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = CSS;
      this.#pastille = document.createElement("span");
      this.#pastille.className = "pastille";
      this.#pastille.setAttribute("role", "img");
      this.#pastille.hidden = true;
      root.append(style, this.#pastille);
    }

    get data() {
      return this.#data;
    }
    set data(value) {
      this.#data = value && typeof value === "object" ? value : {};
      this.#render();
    }

    #render() {
      const counts =
        this.#data.counts && typeof this.#data.counts === "object"
          ? this.#data.counts
          : {};
      const n = Object.fromEntries(ALERTES.map((s) => [s, count(counts[s])]));
      const total = ALERTES.reduce((t, s) => t + n[s], 0);
      const valide = total === 0 && count(counts.done) > 0;
      const p = this.#pastille;

      if (!total && !valide) {
        // masque a zero : rien n'est affiche, l'element ne prend pas de place
        p.hidden = true;
        p.replaceChildren();
        this.#precedent = 0;
        return;
      }
      const niveau = valide ? "done" : plusGrave(n);
      p.hidden = false;
      p.classList.toggle("valide", valide);
      p.style.setProperty("--bord", `var(--gdc-state-${niveau})`);
      if (valide) {
        p.replaceChildren(signIcon(document, "done", 18));
        p.setAttribute("aria-label", "Tout est validé");
      } else {
        const nombre = document.createElement("span");
        nombre.textContent = String(total);
        p.replaceChildren(signIcon(document, niveau, 16), nombre);
        const detail = ALERTES.filter((s) => n[s]).map((s) => MOTS[s](n[s]));
        p.setAttribute(
          "aria-label",
          `${total} ${pluriel(total, "alerte", "alertes")} : ${detail.join(", ")}. Le plus grave : ${signes[niveau].label}`,
        );
      }
      // une impulsion douce, une fois : a l'apparition, ou quand le total monte
      const actuel = valide ? -1 : total;
      if (
        actuel !== this.#precedent &&
        (this.#precedent === 0 || actuel > this.#precedent)
      ) {
        p.classList.remove("pulse");
        void p.offsetWidth; // relance l'animation
        p.classList.add("pulse");
      }
      this.#precedent = actuel;
    }
  }

  registry.define(meta.tag, NotificationBadge);
}
