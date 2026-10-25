// La fiche d'un agent (lot G6) : au clic sur un personnage, ce qu'il fait, ce qu'il fera, ce qu'on peut lui demander.
// Brief valide par Pierre-Alain le 21 octobre 2026 : fenetre non modale qui prend le focus a son apparition ;
// « inconnu » quand le journal ne dit rien (bible, 17.4).
// 1.1.0 : le portrait du lot G7 (ctx.portrait, par l'identifiant), anime selon l'etat ; les initiales en repli.
// 1.2.0 : l'outil qui travaille (tool), une ligne de texte discrete ; rien quand il est absent ou inconnu
// (proposition P2 de GDC 0.22.3, acceptee par Pierre-Alain le 25 octobre 2026).

export const meta = {
  id: "agent-popup",
  version: "1.2.0",
  category: "interface",
  tag: "gdc-agent-popup",
  inputs: ["id", "name", "team", "state", "tool", "doing", "next", "can", "actions"],
  outputs: ["gdc-close", "gdc-copy"],
};

// Les douze etats du personnage : le signe de la signaletique et le mot affiche (fiche agent-popup).
const ETATS = {
  work: ["active", "Travaille"],
  typing: ["active", "Écrit"],
  inspect: ["active", "Inspecte"],
  read: ["active", "Lit"],
  thinking: ["active", "Réfléchit"],
  talk: ["active", "Discute"],
  walk: ["active", "Se déplace"],
  waiting: ["waiting", "Attend ta décision"],
  blocked: ["blocked", "Bloqué"],
  celebrate: ["done", "A fini"],
  idle: [null, "Au repos"],
  unknown: ["unknown", "Inconnu"],
};
// L'etat du portrait (agent-portraits) : talk parle, les etats qui produisent travaillent, le reste est fixe
// (decision de Pierre-Alain du 21 octobre 2026).
const GESTES = {
  talk: "talking",
  work: "working",
  typing: "working",
  inspect: "working",
  read: "working",
  thinking: "working",
};
// L'outil qui fait travailler l'agent (bail.outil du journal) : du texte, jamais de logo ni de couleur de marque.
const OUTILS = {
  "claude-code": "avec Claude Code",
  codex: "avec Codex",
};
const EQUIPES = {
  architecture: ["Architecture", true],
  studies: ["Bureau d'études", true],
  site: ["Chantier", true],
  reception: ["Réception", true],
  operations: ["Exploitation", true],
  client: ["Client", false],
  none: ["Sans équipe", false],
};

const texte = (v) => (v === undefined || v === null ? "" : String(v).trim());
const liste = (v) => (Array.isArray(v) ? v.map(texte).filter(Boolean) : []);

// « Lina, ingénieure » donne « L » ; « Pierre-Alain, le client » donne « PA ».
function initiales(nom) {
  const prenom = nom.split(",")[0];
  const mots = prenom.split(/[\s\-]+/).filter(Boolean);
  return (
    mots
      .slice(0, 2)
      .map((m) => m[0])
      .join("")
      .toUpperCase() || "?"
  );
}

const CSS = `
:host { display: block; max-width: 760px; container-type: inline-size; font: 14px/1.4 var(--gdc-font-ui, system-ui, sans-serif); color: var(--gdc-ink); }
* { box-sizing: border-box; }
.fenetre { display: grid; grid-template-columns: 132px 1fr; gap: 16px; padding: 16px; border-radius: 12px; background: var(--gdc-surface);
  border: 1px solid color-mix(in srgb, var(--gdc-ink) 14%, transparent); box-shadow: 0 8px 28px rgb(0 0 0 / .22);
  animation: apparait calc(var(--gdc-motion, 1) * 180ms) ease-out; }
@keyframes apparait { from { opacity: 0; transform: translateY(6px); } }
.portrait { align-self: start; display: grid; place-items: center; aspect-ratio: 1; border-radius: 50%;
  background: color-mix(in srgb, var(--equipe) 22%, var(--gdc-surface)); border: 3px solid var(--equipe);
  font: 700 36px/1 var(--gdc-font-title, system-ui, sans-serif); color: var(--gdc-ink); }
.portrait.illustre { background: none; overflow: hidden; }
.portrait > svg { display: block; width: 100%; height: 100%; }
.contenu { min-width: 0; display: grid; gap: 14px; }
header { display: grid; grid-template-columns: 1fr auto; gap: 4px 8px; align-items: start; }
h2 { margin: 0; font: 700 20px/1.25 var(--gdc-font-title, system-ui, sans-serif); overflow-wrap: anywhere; border-radius: 4px; }
h2:focus { outline: none; }
h2:focus-visible { outline: 2px solid var(--gdc-ink); outline-offset: 2px; }
.infos { grid-column: 1; display: flex; flex-wrap: wrap; gap: 6px 14px; color: var(--gdc-muted); }
.infos > span { display: inline-flex; align-items: center; gap: 6px; }
.etat { color: var(--gdc-ink); font-weight: 500; }
.outil { grid-column: 1; margin: 0; font-size: 13px; color: var(--gdc-muted); }
.pastille { width: 10px; height: 10px; border-radius: 50%; background: var(--equipe); }
.fermer { grid-column: 2; grid-row: 1 / span 2; display: grid; place-items: center; width: 40px; height: 40px; border: 0; border-radius: 8px;
  background: none; color: var(--gdc-muted); cursor: pointer; }
.fermer:hover { background: color-mix(in srgb, var(--gdc-ink) 8%, transparent); color: var(--gdc-ink); }
.fermer:focus-visible { outline: 2px solid var(--gdc-ink); outline-offset: 2px; }
.colonnes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.colonne h3 { margin: 0 0 6px; font: 600 11px/1.3 var(--gdc-font-ui, system-ui, sans-serif); text-transform: uppercase; letter-spacing: .06em; color: var(--gdc-muted); }
.colonne ul { margin: 0; padding-left: 18px; }
.colonne li { margin: 0 0 4px; overflow-wrap: anywhere; }
.inconnu { display: inline-flex; align-items: center; gap: 6px; margin: 0; color: var(--gdc-muted); }
.actions h3 { margin: 0 0 6px; font: 600 11px/1.3 var(--gdc-font-ui, system-ui, sans-serif); text-transform: uppercase; letter-spacing: .06em; color: var(--gdc-muted); }
svg { flex: none; }
/* etroit (telephone) : le portrait passe en haut, en petit ; les colonnes s'empilent */
@container (max-width: 600px) {
  .fenetre { grid-template-columns: 1fr; padding: 12px; gap: 10px; }
  .portrait { width: 64px; font-size: 22px; }
  .colonnes { grid-template-columns: 1fr; gap: 10px; }
}
`;

export function define(registry, ctx) {
  const { signIcon, portrait: portraitDe = () => null } = ctx;

  class AgentPopup extends HTMLElement {
    #data = {};
    #fenetre;

    constructor() {
      super();
      const root = this.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = CSS;
      this.#fenetre = document.createElement("div");
      this.#fenetre.className = "fenetre";
      this.#fenetre.setAttribute("role", "dialog");
      root.append(style, this.#fenetre);
      this.#fenetre.addEventListener("keydown", (ev) => {
        // Echap ferme la fiche, sauf s'il ferme d'abord une bulle (la copie refusee)
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

    connectedCallback() {
      // la fiche prend le focus a son apparition : Echap fonctionne tout de suite
      requestAnimationFrame(() =>
        this.#fenetre.querySelector("h2")?.focus({ preventScroll: true }),
      );
    }

    get data() {
      return this.#data;
    }
    set data(value) {
      this.#data = value && typeof value === "object" ? value : {};
      this.#render();
    }

    #close() {
      this.dispatchEvent(
        new CustomEvent("gdc-close", {
          detail: { id: texte(this.#data.id) || null },
          bubbles: true,
          composed: true,
        }),
      );
    }

    #render() {
      const d = this.#data;
      const id = texte(d.id);
      const nom = texte(d.name) || id || "Agent inconnu";
      const f = this.#fenetre;
      const focusTitre = this.shadowRoot.activeElement?.tagName === "H2";

      const team = texte(d.team);
      const [equipe, colore] = EQUIPES[team] || [team, false];
      f.style.setProperty(
        "--equipe",
        colore ? `var(--gdc-team-${team})` : "var(--gdc-muted)",
      );

      // le portrait (le nom est deja dans le titre : il n'est pas relu) ; les initiales quand il manque
      const portrait = el("div", "portrait");
      portrait.setAttribute("aria-hidden", "true");
      const svg = id ? portraitDe(document, id) : null;
      if (svg) {
        portrait.classList.add("illustre");
        svg.classList.replace("idle", GESTES[texte(d.state)] || "idle");
        portrait.append(svg);
      } else portrait.textContent = initiales(nom);

      const h2 = el("h2", "", nom);
      h2.id = "nom";
      h2.tabIndex = -1;
      f.setAttribute("aria-labelledby", "nom");
      const infos = el("div", "infos");
      if (equipe) {
        const e = el("span", "equipe");
        e.append(el("span", "pastille"), document.createTextNode(equipe));
        e.firstChild.setAttribute("aria-hidden", "true");
        infos.append(e);
      }
      const [signe, mot] = ETATS[texte(d.state)] || ETATS.unknown;
      const etat = el("span", "etat");
      if (signe) etat.append(signIcon(document, signe));
      etat.append(document.createTextNode(mot));
      infos.append(etat);
      const fermer = el("button", "fermer");
      fermer.type = "button";
      fermer.setAttribute("aria-label", "Fermer la fiche de l'agent");
      fermer.title = "Fermer (Échap)";
      fermer.append(croix());
      fermer.addEventListener("click", () => this.#close());
      const header = document.createElement("header");
      header.append(h2, fermer, infos);
      // un outil absent ou inconnu n'affiche rien : ce n'est pas un etat de l'agent
      // (hasOwn : « constructor » ou « toString » ne sont pas des outils)
      const outil = texte(d.tool);
      if (Object.hasOwn(OUTILS, outil)) header.append(el("p", "outil", OUTILS[outil]));

      const colonnes = el("div", "colonnes");
      for (const [titre, valeurs] of [
        ["Fait en ce moment", d.doing],
        ["Fera ensuite", d.next],
        ["Sait faire", d.can],
      ]) {
        const c = el("section", "colonne");
        c.append(el("h3", "", titre));
        const items = liste(valeurs);
        if (items.length) {
          const ul = document.createElement("ul");
          for (const t of items) ul.append(el("li", "", t));
          c.append(ul);
        } else {
          // le journal ne dit rien : « inconnu », jamais une activite inventee
          const p = el("p", "inconnu");
          p.append(
            signIcon(document, "unknown"),
            document.createTextNode("inconnu"),
          );
          c.append(p);
        }
        colonnes.append(c);
      }

      const actions = el("section", "actions");
      actions.append(el("h3", "", "Lui demander"));
      const qa = document.createElement("gdc-quick-actions");
      qa.data = { id, actions: Array.isArray(d.actions) ? d.actions : [] };
      actions.append(qa);

      const contenu = el("div", "contenu");
      contenu.append(header, colonnes, actions);
      f.replaceChildren(portrait, contenu);
      if (focusTitre) h2.focus({ preventScroll: true });
    }
  }

  function el(tag, cls, contenu) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (contenu !== undefined) n.textContent = contenu;
    return n;
  }

  function croix() {
    const NS = "http://www.w3.org/2000/svg";
    const s = document.createElementNS(NS, "svg");
    s.setAttribute("viewBox", "0 0 16 16");
    s.setAttribute("width", "16");
    s.setAttribute("height", "16");
    s.setAttribute("aria-hidden", "true");
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", "M4 4l8 8M12 4l-8 8");
    Object.assign(p.style, {
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.8",
      strokeLinecap: "round",
    });
    s.append(p);
    return s;
  }

  registry.define(meta.tag, AgentPopup);
}
