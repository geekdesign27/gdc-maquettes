// Le moment de la carte (lot G8, avec day-night) : suivre l'heure reelle, ou choisir le jour, l'aube ou la nuit pour y
// voir plus clair ; et l'horaire du soleil de Fribourg. Decisions de Pierre-Alain du 22 octobre 2026 :
// - un selecteur a quatre positions, Auto, Jour, Aube, Nuit ; Auto suit le soleil ;
// - un moment choisi retombe de lui-meme au prochain passage (debut ou fin de l'aube ou du crepuscule) : l'element dit
//   quand la carte reprend l'heure reelle ;
// - l'horaire : l'heure du poste, le moment, le prochain passage, le lever et le coucher du jour.
// L'element n'interprete rien : GDC lui donne carte.horaire() et transmet le choix (gdc-select) a carte.regleHeure.
// Un groupe de boutons radio, un seul arret de tabulation ; les fleches, Debut et Fin choisissent.

export const meta = {
  id: "time-of-day",
  version: "1.0.0",
  category: "interface",
  tag: "gdc-time-of-day",
  inputs: ["horaire"],
  outputs: ["gdc-select"],
};

const MODES = ["auto", "jour", "aube", "nuit"];
const LIBELLES = { auto: "Auto", jour: "Jour", aube: "Aube", nuit: "Nuit" };
const CHOISIS = { jour: "Jour choisi", aube: "Aube choisie", nuit: "Nuit choisie" };
const AIDES = {
  auto: "Suivre l'heure réelle",
  jour: "Forcer le jour jusqu'au prochain passage",
  aube: "Forcer l'aube jusqu'au prochain passage",
  nuit: "Forcer la nuit jusqu'au prochain passage",
};
const MOMENTS = {
  jour: "jour",
  aube: "aube",
  crepuscule: "crépuscule",
  nuit: "nuit",
};
// les pictogrammes, au trait (grille de 16) : une horloge, le soleil, le soleil a l'horizon, la lune
const PICTOS = {
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
.boite { display: flex; flex-direction: column; gap: 6px; padding: 6px; border-radius: 12px; background: var(--gdc-surface);
  border: 1px solid color-mix(in srgb, var(--gdc-ink) 14%, transparent); }
.choix { display: flex; gap: 2px; padding: 2px; border-radius: 9px; background: color-mix(in srgb, var(--gdc-ink) 6%, transparent); }
button { flex: 1 1 0; display: inline-flex; align-items: center; justify-content: center; gap: 5px; min-height: 32px; min-width: 0;
  padding: 4px 9px; border: 0; border-radius: 7px; background: none; color: inherit; font: inherit; cursor: pointer; white-space: nowrap; }
button:hover { background: color-mix(in srgb, var(--gdc-ink) 8%, transparent); }
button:focus-visible { outline: 2px solid var(--gdc-ink); outline-offset: 1px; }
/* le choix se lit sans la couleur : inverse (encre sur surface), en gras, et coche pour les lecteurs d'ecran */
button[aria-checked="true"] { background: var(--gdc-ink); color: var(--gdc-surface); font-weight: 600; }
svg { flex: none; width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
.horaire { margin: 0 4px; font-variant-numeric: tabular-nums; }
.horaire b { font-weight: 600; }
.soleil { margin: 0 4px 2px; color: var(--gdc-muted); font-size: 12px; font-variant-numeric: tabular-nums; }
[hidden] { display: none !important; }
@media (max-width: 420px) { button { padding: 4px 6px; } button .libelle { font-size: 12px; } }
`;

const NS = "http://www.w3.org/2000/svg";
const estInstant = (v) => typeof v === "number" && Number.isFinite(v);

export function define(registry) {
  // l'heure du poste, en heures et minutes (le panneau est celui de Pierre-Alain, en Suisse romande)
  const hm = new Intl.DateTimeFormat("fr-CH", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const heure = (t) => (estInstant(t) ? hm.format(new Date(t)) : "?");

  class TimeOfDay extends HTMLElement {
    #data = {};
    #els = {};

    constructor() {
      super();
      const root = this.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = CSS;
      const boite = document.createElement("div");
      boite.className = "boite";
      const choix = document.createElement("div");
      choix.className = "choix";
      choix.setAttribute("role", "radiogroup");
      choix.setAttribute("aria-label", "Moment de la carte");
      const boutons = MODES.map((mode) => {
        const b = document.createElement("button");
        b.type = "button";
        b.dataset.mode = mode;
        b.setAttribute("role", "radio");
        b.title = AIDES[mode];
        const libelle = document.createElement("span");
        libelle.className = "libelle";
        libelle.textContent = LIBELLES[mode];
        b.append(picto(mode), libelle);
        b.addEventListener("click", () => this.#choisit(mode));
        return b;
      });
      choix.append(...boutons);
      choix.addEventListener("keydown", (ev) => this.#clavier(ev));
      const horaire = document.createElement("p");
      horaire.className = "horaire";
      horaire.setAttribute("aria-live", "polite");
      const soleil = document.createElement("p");
      soleil.className = "soleil";
      boite.append(choix, horaire, soleil);
      root.append(style, boite);
      Object.assign(this.#els, { boutons, horaire, soleil });
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
      this.#marque(mode);
      const h = this.#data.horaire;
      const { horaire, soleil } = this.#els;
      if (!h || typeof h !== "object") {
        horaire.hidden = soleil.hidden = true;
        return;
      }
      horaire.hidden = soleil.hidden = false;
      const fort = (t) => {
        const b = document.createElement("b");
        b.textContent = t;
        return b;
      };
      const morceaux = [];
      if (estInstant(h.maintenant)) morceaux.push(`${heure(h.maintenant)} · `);
      if (mode === "auto") {
        morceaux.push(fort(majuscule(MOMENTS[h.moment] || "heure réelle")));
        if (h.prochain && estInstant(h.prochain.instant))
          morceaux.push(
            ` · ${MOMENTS[h.prochain.moment] || "passage"} à ${heure(h.prochain.instant)}`,
          );
      } else {
        morceaux.push(fort(CHOISIS[mode]));
        if (estInstant(h.fin))
          morceaux.push(` · heure réelle à ${heure(h.fin)}`);
      }
      horaire.replaceChildren(
        ...morceaux.map((m) =>
          typeof m === "string" ? document.createTextNode(m) : m,
        ),
      );
      soleil.textContent =
        estInstant(h.lever) && estInstant(h.coucher)
          ? `Fribourg · lever ${heure(h.lever)} · coucher ${heure(h.coucher)}`
          : "Fribourg";
    }

    // un seul arret de tabulation : le bouton choisi
    #marque(mode) {
      for (const b of this.#els.boutons) {
        const oui = b.dataset.mode === mode;
        b.setAttribute("aria-checked", String(oui));
        b.tabIndex = oui ? 0 : -1;
      }
    }

    #choisit(mode, focus = false) {
      // marque tout de suite ; GDC confirme en renvoyant l'horaire
      this.#marque(mode);
      if (focus) this.#els.boutons[MODES.indexOf(mode)].focus();
      this.dispatchEvent(
        new CustomEvent("gdc-select", {
          detail: { id: mode },
          bubbles: true,
          composed: true,
        }),
      );
    }

    #clavier(ev) {
      const actuel = MODES.indexOf(
        this.#els.boutons.find((b) => b.tabIndex === 0)?.dataset.mode ?? "auto",
      );
      const n = MODES.length;
      const cible = {
        ArrowRight: (actuel + 1) % n,
        ArrowDown: (actuel + 1) % n,
        ArrowLeft: (actuel + n - 1) % n,
        ArrowUp: (actuel + n - 1) % n,
        Home: 0,
        End: n - 1,
      }[ev.key];
      if (cible === undefined) return;
      ev.preventDefault();
      this.#choisit(MODES[cible], true);
    }
  }

  function picto(mode) {
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("aria-hidden", "true");
    for (const d of PICTOS[mode]) {
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", d);
      svg.append(p);
    }
    return svg;
  }
  const majuscule = (t) => t.charAt(0).toUpperCase() + t.slice(1);

  registry.define(meta.tag, TimeOfDay);
}
