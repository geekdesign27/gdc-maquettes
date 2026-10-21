// La barre du haut (lot G6) : le projet, les decisions qui t'attendent, les agents, la fraicheur des donnees.
// Brief valide par Pierre-Alain le 21 octobre 2026 (initiales a la place du logo, minuteur d'une minute).
// Une valeur absente s'affiche « ? », jamais 0 : rien n'est invente (bible, 17.4).

export const meta = {
  id: "top-bar",
  version: "1.0.0",
  category: "interface",
  tag: "gdc-top-bar",
  inputs: ["project", "decisions", "agents", "updatedAt", "staleAfter"],
  outputs: ["gdc-select"],
};

const STALE_AFTER = 600; // secondes, quand la fiche ne dit rien
const TICK = 60000; // le « il y a N min » avance d'une minute a la fois

// Un nombre entier positif, ou null si la donnee manque ou ne veut rien dire.
function count(v) {
  if (typeof v === "string" && v.trim() !== "") v = Number(v);
  return typeof v === "number" && Number.isFinite(v) && v >= 0
    ? Math.floor(v)
    : null;
}

// « Application de bureau » donne « AB » : les deux premiers mots qui comptent.
const PETITS_MOTS = new Set([
  "le",
  "la",
  "les",
  "l",
  "de",
  "du",
  "des",
  "d",
  "et",
  "à",
  "au",
  "aux",
  "un",
  "une",
]);
function initials(name) {
  const mots = name
    .split(/[\s'’\-_.]+/)
    .filter((m) => m && !PETITS_MOTS.has(m.toLowerCase()));
  if (!mots.length) return "?";
  const lettres =
    mots.length > 1 ? mots[0][0] + mots[1][0] : mots[0].slice(0, 2);
  return lettres.toUpperCase();
}

// en francais, zero et un sont au singulier : « 0 actif », « 1 bloqué », « 2 inconnus »
const pluriel = (n, un, plusieurs) => (n <= 1 ? un : plusieurs);

// L'age des donnees, en long (« il y a 4 min ») et en court (« 4 min »).
function age(secondes) {
  const min = Math.floor(secondes / 60);
  if (min < 1) return ["à l'instant", "maint."];
  if (min < 60) return [`il y a ${min} min`, `${min} min`];
  const h = Math.floor(min / 60);
  if (h < 24) return [`il y a ${h} h`, `${h} h`];
  const j = Math.floor(h / 24);
  return [`il y a ${j} ${pluriel(j, "jour", "jours")}`, `${j} j`];
}

const CSS = `
:host { display: block; container-type: inline-size; font: 14px/1.3 var(--gdc-font-ui, system-ui, sans-serif); color: var(--gdc-ink); }
* { box-sizing: border-box; }
.bar { display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 8px 16px; background: var(--gdc-surface);
  border-bottom: 1px solid color-mix(in srgb, var(--gdc-ink) 14%, transparent); }
.projet { display: flex; align-items: center; gap: 10px; flex: 1 1 auto; min-width: 0; }
.initiales { flex: none; display: grid; place-items: center; width: 32px; height: 32px; border-radius: 6px; background: var(--gdc-ink); color: var(--gdc-surface);
  font: 700 13px/1 var(--gdc-font-title, system-ui, sans-serif); letter-spacing: .02em; }
.nom { font: 600 16px/1.2 var(--gdc-font-title, system-ui, sans-serif); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
button { flex: none; display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 10px; border: 1px solid transparent; border-radius: 8px;
  background: none; color: inherit; font: inherit; cursor: pointer; }
button:hover { background: color-mix(in srgb, var(--gdc-ink) 7%, transparent); }
button:focus-visible { outline: 2px solid var(--gdc-ink); outline-offset: 2px; }
.n { font-weight: 600; font-variant-numeric: tabular-nums; }
.mot { color: var(--gdc-muted); }
.decisions.attente { background: color-mix(in srgb, var(--gdc-state-waiting) 12%, var(--gdc-surface)); border-color: color-mix(in srgb, var(--gdc-state-waiting) 45%, transparent); }
.decisions.attente .mot { color: inherit; font-weight: 500; }
.decisions.pulse { animation: pulse calc(var(--gdc-motion, 1) * 900ms) ease-out 1; }
@keyframes pulse { from { box-shadow: 0 0 0 0 color-mix(in srgb, var(--gdc-state-waiting) 55%, transparent); } to { box-shadow: 0 0 0 10px transparent; } }
.agents { gap: 10px; }
.compteur { display: inline-flex; align-items: center; gap: 4px; }
.compteur.zero { color: var(--gdc-muted); }
.compteur.zero svg { opacity: .45; }
.compteur .mot-etat { color: var(--gdc-muted); }
.fraicheur { flex: none; display: inline-flex; align-items: center; gap: 6px; color: var(--gdc-muted); white-space: nowrap; }
.fraicheur.ancienne { color: var(--gdc-ink); font-weight: 500; padding: 4px 8px; border-radius: 8px;
  background: color-mix(in srgb, var(--gdc-state-blocked) 16%, var(--gdc-surface)); }
.court { display: none; }
.n.zero { color: var(--gdc-muted); font-weight: 400; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
svg { flex: none; }
/* moyen : les mots des agents s'effacent, leurs nombres et leurs signes restent */
@container (max-width: 860px) { .compteur .mot-etat { display: none; } }
/* telephone : une ligne, icones et nombres ; les mots passent dans les libelles lus a voix haute */
@container (max-width: 600px) {
  .bar { gap: 4px; padding: 6px 8px; }
  .projet { gap: 8px; }
  .nom { font-size: 14px; }
  button { padding: 0 6px; }
  .mot, .agents > .mot { display: none; }
  .long { display: none; }
  .court { display: inline; }
  .fraicheur.ancienne { padding: 4px 6px; }
}
`;

export function define(registry, ctx) {
  const { signIcon } = ctx;

  class TopBar extends HTMLElement {
    #data = {};
    #timer = null;
    #previousDecisions = null;
    #els = {};

    constructor() {
      super();
      const root = this.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = CSS;
      const make = (tag, cls, parent) => {
        const el = document.createElement(tag);
        if (cls) el.className = cls;
        if (parent) parent.append(el);
        return el;
      };
      const bar = make("div", "bar");
      const projet = make("div", "projet", bar);
      const e = this.#els;
      e.initiales = make("span", "initiales", projet);
      e.initiales.setAttribute("aria-hidden", "true");
      e.nom = make("span", "nom", projet);
      e.decisions = make("button", "decisions", bar);
      e.decisions.type = "button";
      e.agents = make("button", "agents", bar);
      e.agents.type = "button";
      e.fraicheur = make("div", "fraicheur", bar);
      e.annonce = make("span", "sr", bar);
      e.annonce.setAttribute("role", "status");
      e.decisions.addEventListener("click", () => this.#select("decisions"));
      e.agents.addEventListener("click", () => this.#select("agents"));
      root.append(style, bar);
    }

    get data() {
      return this.#data;
    }
    set data(value) {
      this.#data = value && typeof value === "object" ? value : {};
      this.#render();
    }

    connectedCallback() {
      this.#render();
      this.#timer = setInterval(() => this.#renderFreshness(), TICK);
    }

    disconnectedCallback() {
      clearInterval(this.#timer);
      this.#timer = null;
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
      const e = this.#els;
      const nom =
        typeof d.project === "string" && d.project.trim()
          ? d.project.trim()
          : "Projet sans nom";
      e.initiales.textContent = nom === "Projet sans nom" ? "?" : initials(nom);
      e.nom.textContent = nom;
      e.nom.title = nom;
      this.#renderDecisions(count(d.decisions));
      this.#renderAgents(
        d.agents && typeof d.agents === "object" ? d.agents : {},
      );
      this.#renderFreshness();
    }

    #renderDecisions(n) {
      const b = this.#els.decisions;
      const parts = [];
      if (n === null) {
        parts.push(
          signIcon(document, "unknown"),
          texte("span", "n", "?"),
          texte("span", "mot", "décisions"),
        );
        b.setAttribute("aria-label", "Décisions attendues : inconnu");
      } else if (n === 0) {
        // sur telephone, le mot s'efface : un 0 en encre douce garde le bouton lisible
        parts.push(texte("span", "mot", "Aucune décision"), texte("span", "n court zero", "0"));
        b.setAttribute("aria-label", "Aucune décision ne t'attend");
      } else {
        parts.push(
          signIcon(document, "waiting"),
          texte("span", "n", String(n)),
          texte("span", "mot", pluriel(n, "décision", "décisions")),
        );
        b.setAttribute(
          "aria-label",
          `${n} ${pluriel(n, "décision t'attend", "décisions t'attendent")}`,
        );
      }
      b.replaceChildren(...parts);
      b.classList.toggle("attente", Boolean(n));
      // une impulsion, une seule fois, quand une decision arrive ; rien au premier affichage
      if (
        n !== null &&
        this.#previousDecisions !== null &&
        n > this.#previousDecisions
      ) {
        b.classList.remove("pulse");
        void b.offsetWidth; // relance l'animation
        b.classList.add("pulse");
      }
      if (n !== null) this.#previousDecisions = n;
    }

    #renderAgents(agents) {
      const b = this.#els.agents;
      const etats = [
        ["active", "actif", "actifs"],
        ["blocked", "bloqué", "bloqués"],
        ["unknown", "inconnu", "inconnus"],
      ];
      const lu = [];
      const parts = etats.map(([state, un, plusieurs]) => {
        const n = count(agents[state]);
        const c = document.createElement("span");
        c.className = "compteur" + (n === 0 ? " zero" : "");
        const signe = signIcon(document, n === null ? "unknown" : state);
        if (n === 0) signe.style.setProperty("--gdc-play", "paused"); // la roue ne tourne que si quelqu'un travaille
        c.append(
          signe,
          texte("span", "n", n === null ? "?" : String(n)),
          texte(
            "span",
            "mot-etat",
            n === null ? plusieurs : pluriel(n, un, plusieurs),
          ),
        );
        lu.push(
          n === null
            ? `${plusieurs} : nombre inconnu`
            : `${n} ${pluriel(n, un, plusieurs)}`,
        );
        return c;
      });
      b.replaceChildren(...parts, texte("span", "mot", "agents"));
      b.setAttribute("aria-label", `Agents : ${lu.join(", ")}`);
    }

    #renderFreshness() {
      const d = this.#data;
      const e = this.#els;
      const t =
        typeof d.updatedAt === "string" || typeof d.updatedAt === "number"
          ? new Date(d.updatedAt)
          : null;
      const valide = t && !Number.isNaN(t.getTime());
      const limite = count(d.staleAfter) || STALE_AFTER;
      let ancienne = false;
      let signe, long, court;
      if (!valide) {
        signe = signIcon(document, "unknown");
        long = "Fraîcheur inconnue";
        court = "?";
        e.fraicheur.title = "Aucune date de mise à jour";
      } else {
        const secondes = Math.max(0, (Date.now() - t.getTime()) / 1000);
        [long, court] = age(secondes);
        ancienne = secondes > limite;
        signe = ancienne ? signIcon(document, "blocked") : horloge();
        long = ancienne ? `Données anciennes : ${long}` : `Mis à jour ${long}`;
        e.fraicheur.title = `Dernière mise à jour : ${t.toLocaleString("fr-CH", { dateStyle: "short", timeStyle: "short" })}`;
      }
      e.fraicheur.classList.toggle("ancienne", ancienne);
      e.fraicheur.replaceChildren(
        signe,
        texte("span", "long", long),
        texte("span", "court", court),
      );
      e.fraicheur.setAttribute("aria-label", long);
      // le passage en donnees anciennes est annonce une fois, pas a chaque minute
      const annonce = ancienne ? "Les données sont anciennes" : "";
      if (e.annonce.textContent !== annonce) e.annonce.textContent = annonce;
    }
  }

  function texte(tag, cls, contenu) {
    const el = document.createElement(tag);
    el.className = cls;
    el.textContent = contenu;
    return el;
  }

  // L'horloge de la fraicheur : un trait d'encre douce, pas un etat.
  function horloge() {
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("aria-hidden", "true");
    const cercle = document.createElementNS(NS, "circle");
    for (const [k, v] of Object.entries({ cx: 8, cy: 8, r: 6.4 }))
      cercle.setAttribute(k, String(v));
    const aiguilles = document.createElementNS(NS, "path");
    aiguilles.setAttribute("d", "M8 4.4V8l2.6 1.6");
    for (const el of [cercle, aiguilles]) {
      el.style.fill = "none";
      el.style.stroke = "currentColor";
      el.style.strokeWidth = "1.5";
      el.style.strokeLinecap = "round";
      svg.append(el);
    }
    return svg;
  }

  registry.define(meta.tag, TopBar);
}
