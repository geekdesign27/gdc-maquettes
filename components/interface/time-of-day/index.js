// Le moment de la carte (lot G8, avec day-night) : suivre l'heure reelle, ou choisir le jour, l'aube ou la nuit pour y
// voir plus clair ; et l'horaire du soleil de Fribourg. Decisions de Pierre-Alain du 22 octobre 2026 :
// - un selecteur a quatre positions, Auto, Jour, Aube, Nuit ; Auto suit le soleil ;
// - un moment choisi retombe de lui-meme au prochain passage (debut ou fin de l'aube ou du crepuscule) : l'element dit
//   quand la carte reprend l'heure reelle ;
// - l'horaire : l'heure du poste, le moment, le prochain passage, le lever et le coucher du jour.
// L'element n'interprete rien : GDC lui donne carte.horaire() et transmet le choix (gdc-select) a carte.regleHeure.
// L'entree horaire et les valeurs auto, jour, aube et nuit sont celles de l'API de la carte (src/ville/carte.js).
// Un groupe de boutons radio, un seul arret de tabulation ; les fleches, Debut et Fin choisissent. Seuls le moment et
// le choix s'annoncent aux lecteurs d'ecran, jamais l'horloge.

export const meta = {
  id: "time-of-day",
  version: "1.0.0",
  category: "interface",
  tag: "gdc-time-of-day",
  inputs: ["horaire"],
  outputs: ["gdc-select"],
};

const MODES = ["auto", "jour", "aube", "nuit"];
const LABELS = { auto: "Auto", jour: "Jour", aube: "Aube", nuit: "Nuit" };
const CHOSEN = {
  jour: "Jour choisi",
  aube: "Aube choisie",
  nuit: "Nuit choisie",
};
const HINTS = {
  auto: "Suivre l'heure réelle",
  jour: "Forcer le jour jusqu'au prochain passage",
  aube: "Forcer l'aube jusqu'au prochain passage",
  nuit: "Forcer la nuit jusqu'au prochain passage",
};
const MOMENT_NAMES = {
  jour: "jour",
  aube: "aube",
  crepuscule: "crépuscule",
  nuit: "nuit",
};
// les pictogrammes, au trait (grille de 16) : une horloge, le soleil, le soleil a l'horizon, la lune
const ICONS = {
  auto: ["M8 1.5a6.5 6.5 0 1 0 0 13a6.5 6.5 0 0 0 0-13Z", "M8 4.5V8l2.5 1.5"],
  jour: [
    "M8 5a3 3 0 1 0 0 6a3 3 0 0 0 0-6Z",
    "M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3 3l1 1M12 12l1 1M3 13l1-1M12 4l1-1",
  ],
  aube: [
    "M4.5 11a3.5 3.5 0 0 1 7 0",
    "M1 11h14M8 4.5V6M2.8 6.8l1 1M13.2 6.8l-1 1M1.5 13.5h13",
  ],
  nuit: ["M13 9.5A5.5 5.5 0 1 1 6.5 3a4.5 4.5 0 0 0 6.5 6.5Z"],
};

const CSS = `
:host { display: inline-block; font: 13px/1.3 var(--gdc-font-ui, system-ui, sans-serif); color: var(--gdc-ink); max-width: 100%; }
* { box-sizing: border-box; }
.box { position: relative; display: flex; flex-direction: column; gap: 6px; padding: 6px; border-radius: 12px; background: var(--gdc-surface);
  border: 1px solid color-mix(in srgb, var(--gdc-ink) 14%, transparent); }
.modes { display: flex; gap: 2px; padding: 2px; border-radius: 9px; background: color-mix(in srgb, var(--gdc-ink) 6%, transparent); }
button { flex: 1 1 0; display: inline-flex; align-items: center; justify-content: center; gap: 5px; min-height: 32px; min-width: 0;
  padding: 4px 9px; border: 0; border-radius: 7px; background: none; color: inherit; font: inherit; cursor: pointer; white-space: nowrap; }
button:hover { background: color-mix(in srgb, var(--gdc-ink) 8%, transparent); }
button:focus-visible { outline: 2px solid var(--gdc-ink); outline-offset: 1px; }
/* le choix se lit sans la couleur : inverse (encre sur surface), en gras, et coche pour les lecteurs d'ecran */
button[aria-checked="true"] { background: var(--gdc-ink); color: var(--gdc-surface); font-weight: 600; }
svg { flex: none; width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
.schedule { margin: 0 4px; font-variant-numeric: tabular-nums; }
.schedule b { font-weight: 600; }
.sun { margin: 0 4px 2px; color: var(--gdc-muted); font-size: 12px; font-variant-numeric: tabular-nums; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
[hidden] { display: none !important; }
@media (max-width: 420px) { button { padding: 4px 6px; } button .label { font-size: 12px; } }
`;

const NS = "http://www.w3.org/2000/svg";
const isInstant = (v) => typeof v === "number" && Number.isFinite(v);
const capitalize = (t) => t.charAt(0).toUpperCase() + t.slice(1);

export function define(registry) {
  // l'heure du poste, en heures et minutes (le panneau est celui de Pierre-Alain, en Suisse romande)
  const hm = new Intl.DateTimeFormat("fr-CH", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const clock = (t) => (isInstant(t) ? hm.format(new Date(t)) : "?");

  class TimeOfDay extends HTMLElement {
    #data = {};
    #els = {};
    #shown = null; // le texte affiche : rien n'est touche s'il ne change pas

    constructor() {
      super();
      const root = this.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = CSS;
      const box = document.createElement("div");
      box.className = "box";
      const group = document.createElement("div");
      group.className = "modes";
      group.setAttribute("role", "radiogroup");
      group.setAttribute("aria-label", "Moment de la carte");
      const buttons = MODES.map((mode) => {
        const b = document.createElement("button");
        b.type = "button";
        b.dataset.mode = mode;
        b.setAttribute("role", "radio");
        b.title = HINTS[mode];
        const label = document.createElement("span");
        label.className = "label";
        label.textContent = LABELS[mode];
        b.append(icon(mode), label);
        b.addEventListener("click", () => this.#select(mode));
        return b;
      });
      group.append(...buttons);
      group.addEventListener("keydown", (ev) => this.#keydown(ev));
      const schedule = document.createElement("p");
      schedule.className = "schedule";
      const sun = document.createElement("p");
      sun.className = "sun";
      // l'annonce : le moment ou le choix seulement, quand il change
      const live = document.createElement("span");
      live.className = "sr";
      live.setAttribute("aria-live", "polite");
      box.append(group, schedule, sun, live);
      root.append(style, box);
      Object.assign(this.#els, { buttons, schedule, sun, live });
      this.#render();
    }

    get data() {
      return this.#data;
    }
    set data(value) {
      this.#data = value && typeof value === "object" ? value : {};
      this.#render();
    }

    #mode() {
      const h = this.#data.horaire;
      return h && MODES.includes(h.mode) ? h.mode : "auto";
    }

    #render() {
      const mode = this.#mode();
      this.#mark(mode);
      const h = this.#data.horaire;
      const { schedule, sun, live } = this.#els;
      if (!h || typeof h !== "object") {
        schedule.hidden = sun.hidden = true;
        this.#shown = null;
        return;
      }
      schedule.hidden = sun.hidden = false;
      const lead = isInstant(h.maintenant) ? `${clock(h.maintenant)} · ` : "";
      let strong;
      let tail = "";
      if (mode === "auto") {
        strong = capitalize(MOMENT_NAMES[h.moment] || "heure réelle");
        if (h.prochain && isInstant(h.prochain.instant))
          tail = ` · ${MOMENT_NAMES[h.prochain.moment] || "passage"} à ${clock(h.prochain.instant)}`;
      } else {
        strong = CHOSEN[mode];
        if (isInstant(h.fin)) tail = ` · heure réelle à ${clock(h.fin)}`;
      }
      const sunText =
        isInstant(h.lever) && isInstant(h.coucher)
          ? `Fribourg · lever ${clock(h.lever)} · coucher ${clock(h.coucher)}`
          : "Fribourg";
      const key = [lead, strong, tail, sunText].join("|");
      if (key === this.#shown) return;
      const announce = !this.#shown || this.#shown.split("|")[1] !== strong;
      this.#shown = key;
      const b = document.createElement("b");
      b.textContent = strong;
      schedule.replaceChildren(
        document.createTextNode(lead),
        b,
        document.createTextNode(tail),
      );
      sun.textContent = sunText;
      if (announce) live.textContent = strong;
    }

    // un seul arret de tabulation : le bouton choisi
    #mark(mode) {
      for (const b of this.#els.buttons) {
        const on = b.dataset.mode === mode;
        b.setAttribute("aria-checked", String(on));
        b.tabIndex = on ? 0 : -1;
      }
    }

    #select(mode, focus = false) {
      const current = this.#els.buttons.find((b) => b.tabIndex === 0);
      if (focus) this.#els.buttons[MODES.indexOf(mode)].focus();
      if (current && current.dataset.mode === mode) return; // deja choisi
      // marque tout de suite ; GDC confirme en renvoyant l'horaire
      this.#mark(mode);
      this.dispatchEvent(
        new CustomEvent("gdc-select", {
          detail: { id: mode },
          bubbles: true,
          composed: true,
        }),
      );
    }

    #keydown(ev) {
      const at = MODES.indexOf(
        this.#els.buttons.find((b) => b.tabIndex === 0)?.dataset.mode ?? "auto",
      );
      const n = MODES.length;
      const target = {
        ArrowRight: (at + 1) % n,
        ArrowDown: (at + 1) % n,
        ArrowLeft: (at + n - 1) % n,
        ArrowUp: (at + n - 1) % n,
        Home: 0,
        End: n - 1,
      }[ev.key];
      if (target === undefined) return;
      ev.preventDefault();
      this.#select(MODES[target], true);
    }
  }

  function icon(mode) {
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("aria-hidden", "true");
    for (const d of ICONS[mode]) {
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", d);
      svg.append(p);
    }
    return svg;
  }

  registry.define(meta.tag, TimeOfDay);
}
