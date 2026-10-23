// Le repere d'agent (lot G8) : repérer et attraper, sur la carte entiere, les agents avec qui on peut ou doit
// interagir. Fiche validee par Pierre-Alain le 22 octobre 2026.
// - Une couche posee sur la carte : GDC lui donne les agents (jamais d'ouvrier ni d'usager) et leur position a l'ecran,
//   celle de l'ancre label de character, qu'il recalcule quand la camera ou l'agent bouge. Le repere garde une taille
//   fixe en pixels, quel que soit le zoom, et passe devant les murs (il est au-dessus de la carte).
// - Le repere complet (portrait du lot G7, fixe ; prenom ; signe d'etat ; une pointe vers la tete) est permanent pour
//   les agents qui attendent ta decision (waiting) et les bloques (blocked). Les autres n'ont qu'un repere court au
//   survol (hovered : portrait et prenom, sans signe).
// - Les reperes qui se touchent n'en font qu'un : trois portraits au plus, le signe le plus grave et le nombre ; au clic
//   (ou Entree), le groupe se deplie ; Echap le replie.
// - Une impulsion douce a l'apparition, puis fixe ; rien ne bouge avec moins d'animations.
// - Cliquer un repere vaut cliquer l'agent : gdc-select, detail.id = l'agent. Chaque repere est un bouton (Tab, Entree).
// - Les reperes d'une image a l'autre sont les memes boutons, deplaces : le focus et l'impulsion ne se perdent pas
//   quand GDC redonne les positions a chaque image.

export const meta = {
  id: "agent-marker",
  version: "1.0.0",
  category: "interface",
  tag: "gdc-agent-marker",
  inputs: ["agents", "hovered"],
  outputs: ["gdc-select"],
};

// Les etats de character qui ont un signe de la signaletique ; les autres (au travail, au repos) n'en portent pas sur
// un repere seul, et comptent comme actifs dans un groupe.
const SIGNE = { waiting: "waiting", blocked: "blocked", unknown: "unknown" };
const PERMANENTS = new Set(["waiting", "blocked"]);
const PORTRAIT = 26; // px
const POINTE = 7; // px, de la pointe a la tete
const ECART = 2; // px entre deux reperes qui ne se touchent pas
const MAX_PORTRAITS = 3;

const CSS = `
:host { display: block; position: absolute; inset: 0; overflow: hidden; pointer-events: none;
  font: 600 12px/1.2 var(--gdc-font-ui, system-ui, sans-serif); color: var(--gdc-ink); }
* { box-sizing: border-box; }
.couche { position: absolute; inset: 0; }
/* un repere : pose sur la tete de l'agent, sa pointe en bas ; le bouton suit la position, son corps porte l'impulsion */
.repere { position: absolute; left: 0; top: 0; pointer-events: auto; padding: 0; border: 0; background: none; color: inherit;
  font: inherit; cursor: pointer; transform: translate(var(--x), var(--y)) translate(-50%, calc(-100% - ${POINTE}px)); }
.repere:focus-visible { outline: none; }
.repere:focus-visible .corps { outline: 2px solid var(--gdc-ink); outline-offset: 2px; }
.corps { position: relative; display: flex; align-items: center; gap: 5px; height: 32px; padding: 3px 9px 3px 3px; border-radius: 16px;
  background: var(--gdc-surface); border: 1px solid color-mix(in srgb, var(--gdc-ink) 22%, transparent);
  box-shadow: 0 1px 3px color-mix(in srgb, var(--gdc-ink) 22%, transparent); white-space: nowrap;
  animation: apparait calc(var(--gdc-motion, 1) * 220ms) ease-out; }
.repere:hover .corps { background: color-mix(in srgb, var(--gdc-ink) 6%, var(--gdc-surface)); }
/* la pointe vers la tete */
.corps::after { content: ""; position: absolute; left: 50%; bottom: -${POINTE}px; width: 0; height: 0; transform: translateX(-50%);
  border: ${POINTE / 2 + 1}px solid transparent; border-top: ${POINTE}px solid var(--gdc-surface);
  filter: drop-shadow(0 1px 0 color-mix(in srgb, var(--gdc-ink) 22%, transparent)); }
@keyframes apparait { from { transform: scale(.7); opacity: 0; } }
.portraits { display: flex; }
.portrait { flex: none; display: grid; place-items: center; width: ${PORTRAIT}px; height: ${PORTRAIT}px; border-radius: 50%;
  overflow: hidden; background: color-mix(in srgb, var(--gdc-ink) 12%, var(--gdc-surface)); font-size: 10px;
  box-shadow: 0 0 0 2px var(--gdc-surface); }
.portrait + .portrait { margin-left: -9px; }
.portrait svg { display: block; width: 100%; height: 100%; }
.nom { max-width: 120px; overflow: hidden; text-overflow: ellipsis; }
.signe { flex: none; display: inline-grid; place-items: center; width: 16px; height: 16px; }
.nombre { font-variant-numeric: tabular-nums; }
/* le court : au survol seulement, plus discret */
.repere.court .corps { height: 30px; padding-right: 8px; }
/* le groupe deplie : ses agents empiles au-dessus de lui */
.deplie { position: absolute; left: 0; top: 0; pointer-events: auto; display: flex; flex-direction: column-reverse; gap: 4px;
  transform: translate(var(--x), var(--y)) translate(-50%, calc(-100% - ${POINTE + 40}px)); }
.deplie .repere { position: static; transform: none; }
.deplie .corps::after { display: none; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
`;

// le prenom : « Claire, l'architecte » -> « Claire »
const prenom = (a) =>
  String(a.name || a.id || "")
    .split(",")[0]
    .trim();
const nombre = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export function define(registry, ctx) {
  const {
    signes,
    signIcon,
    plusGrave,
    portrait: portraitDe = () => null,
  } = ctx;

  class AgentMarker extends HTMLElement {
    #data = {};
    #els = {};
    #boutons = new Map(); // cle (agent ou groupe) -> bouton, reutilise d'une image a l'autre
    #deplie = null; // cle du groupe deplie
    #panneau = null; // le groupe deplie, a l'ecran

    constructor() {
      super();
      const root = this.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = CSS;
      const couche = document.createElement("div");
      couche.className = "couche";
      root.append(style, couche);
      this.#els = { couche };
      couche.addEventListener("click", (ev) => {
        const b = ev.target.closest("button");
        if (b) this.#appuie(b);
      });
      // la couche change de taille (la fenetre, un panneau qui se replie) : les reperes restent entiers dedans
      new ResizeObserver(() => this.#render()).observe(this);
      couche.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape" && this.#deplie) {
          const cle = this.#deplie;
          this.#replie();
          this.#boutons.get(cle)?.focus();
        }
      });
    }

    get data() {
      return this.#data;
    }
    set data(value) {
      this.#data = value && typeof value === "object" ? value : {};
      this.#render();
    }

    #appuie(b) {
      if (b.dataset.groupe) {
        if (this.#deplie === b.dataset.cle) this.#replie();
        else {
          this.#deplie = b.dataset.cle;
          this.#render();
          this.#panneau?.querySelector("button")?.focus();
        }
        return;
      }
      this.dispatchEvent(
        new CustomEvent("gdc-select", {
          detail: { id: b.dataset.id },
          bubbles: true,
          composed: true,
        }),
      );
    }

    #replie() {
      this.#deplie = null;
      this.#render();
    }

    // Les reperes a montrer : les permanents, et celui qu'on survole ; places a l'ecran, puis regroupes s'ils se touchent
    #reperes() {
      const agents = (
        Array.isArray(this.#data.agents) ? this.#data.agents : []
      ).filter(
        (a) =>
          a &&
          a.id !== undefined &&
          nombre(a.x) !== null &&
          nombre(a.y) !== null,
      );
      const hovered = this.#data.hovered ?? null;
      const montres = agents
        .filter((a) => PERMANENTS.has(a.state) || a.id === hovered)
        .map((a) => {
          const complet = PERMANENTS.has(a.state);
          const largeur =
            PORTRAIT +
            14 +
            Math.min(prenom(a).length * 7, 120) +
            (complet ? 21 : 0);
          return {
            a,
            complet,
            boite: [
              a.x - largeur / 2,
              a.y - POINTE - 32,
              a.x + largeur / 2,
              a.y - POINTE,
            ],
          };
        });
      // les reperes qui se touchent : chacun rejoint le groupe d'un voisin qu'il touche (union-find)
      const parent = montres.map((_, i) => i);
      const racine = (i) =>
        parent[i] === i ? i : (parent[i] = racine(parent[i]));
      const touche = (p, q) =>
        p[0] < q[2] + ECART &&
        q[0] < p[2] + ECART &&
        p[1] < q[3] + ECART &&
        q[1] < p[3] + ECART;
      for (let i = 0; i < montres.length; i++)
        for (let j = i + 1; j < montres.length; j++)
          if (touche(montres[i].boite, montres[j].boite))
            parent[racine(i)] = racine(j);
      const groupes = new Map();
      montres.forEach((m, i) => {
        const r = racine(i);
        if (!groupes.has(r)) groupes.set(r, []);
        groupes.get(r).push(m);
      });
      return [...groupes.values()];
    }

    #render() {
      const { couche } = this.#els;
      const vus = new Set();
      let deplieVu = false;
      for (const membres of this.#reperes()) {
        if (membres.length === 1) {
          const { a, complet } = membres[0];
          const cle = `agent:${a.id}`;
          const b = this.#bouton(
            cle,
            () => this.#corpsAgent(a, complet),
            `${a.state}|${complet}|${a.name}`,
          );
          b.dataset.id = a.id;
          b.classList.toggle("court", !complet);
          b.setAttribute("aria-label", this.#libelle(a));
          this.#place(b, a.x, a.y);
          vus.add(cle);
          continue;
        }
        // un groupe : la cle tient a ses agents, sa place est la moyenne de leurs tetes, en haut du plus haut
        const ids = membres.map((m) => m.a.id).sort();
        const cle = `groupe:${ids.join("|")}`;
        const x = membres.reduce((s, m) => s + m.a.x, 0) / membres.length;
        const y = Math.min(...membres.map((m) => m.a.y));
        const etats = membres.map((m) => `${m.a.id}:${m.a.state}`).join("|");
        const b = this.#bouton(cle, () => this.#corpsGroupe(membres), etats);
        b.dataset.groupe = "1";
        b.setAttribute("aria-expanded", String(this.#deplie === cle));
        b.setAttribute(
          "aria-label",
          `${membres.length} agents : ${membres.map((m) => this.#libelle(m.a)).join(" ; ")}`,
        );
        this.#place(b, x, y);
        vus.add(cle);
        if (this.#deplie === cle) {
          deplieVu = true;
          this.#montreDeplie(membres, x, y);
        }
      }
      for (const [cle, b] of this.#boutons)
        if (!vus.has(cle)) {
          b.remove();
          this.#boutons.delete(cle);
        }
      if (!deplieVu) {
        this.#deplie = null;
        this.#panneau?.remove();
        this.#panneau = null;
      }
      // l'ordre de tabulation suit l'ecran, de gauche a droite
      const ordre = [...this.#boutons.values()].sort(
        (p, q) => parseFloat(p.dataset.x) - parseFloat(q.dataset.x),
      );
      if (ordre.some((b, i) => couche.children[i] !== b)) {
        const focus = this.shadowRoot.activeElement;
        couche.append(...ordre, ...(this.#panneau ? [this.#panneau] : []));
        focus?.focus?.({ preventScroll: true });
      }
    }

    // un bouton, cree une fois par cle ; son contenu n'est refait que si ce qu'il dit change
    #bouton(cle, corps, signature) {
      let b = this.#boutons.get(cle);
      if (!b) {
        b = document.createElement("button");
        b.type = "button";
        b.className = "repere";
        b.dataset.cle = cle;
        this.#boutons.set(cle, b);
        this.#els.couche.append(b);
      }
      if (b.dataset.signature !== signature) {
        b.dataset.signature = signature;
        b.replaceChildren(corps());
      }
      return b;
    }

    // la place d'un repere : sur la tete, mais toujours entier dans la couche (un agent au bord de la carte)
    #place(b, x, y) {
      b.dataset.x = String(x);
      const l = b.offsetWidth || 120;
      const largeur = this.clientWidth;
      const X = largeur > l + 4 ? Math.min(Math.max(x, l / 2 + 2), largeur - l / 2 - 2) : x;
      b.style.setProperty("--x", `${Math.round(X)}px`);
      b.style.setProperty("--y", `${Math.round(Math.max(y, 32 + POINTE + 2))}px`);
    }

    #libelle(a) {
      const s = SIGNE[a.state];
      return s && PERMANENTS.has(a.state)
        ? `${a.name || a.id}, ${signes[s].label}`
        : String(a.name || a.id);
    }

    #portrait(a) {
      const p = document.createElement("span");
      p.className = "portrait";
      p.setAttribute("aria-hidden", "true");
      const svg = portraitDe(document, a.id);
      if (svg)
        p.append(svg); // le portrait garde son etat de repos : fixe, sans son geste
      else p.textContent = prenom(a).slice(0, 2).toUpperCase();
      return p;
    }

    #corpsAgent(a, complet) {
      const c = document.createElement("span");
      c.className = "corps";
      const nom = document.createElement("span");
      nom.className = "nom";
      nom.textContent = prenom(a);
      c.append(this.#portrait(a), nom);
      if (complet) {
        const s = document.createElement("span");
        s.className = "signe";
        s.append(signIcon(document, SIGNE[a.state], 16));
        c.append(s);
      }
      return c;
    }

    #corpsGroupe(membres) {
      const c = document.createElement("span");
      c.className = "corps";
      const portraits = document.createElement("span");
      portraits.className = "portraits";
      for (const m of membres.slice(0, MAX_PORTRAITS))
        portraits.append(this.#portrait(m.a));
      const n = document.createElement("span");
      n.className = "nombre";
      n.textContent = String(membres.length);
      c.append(portraits, n);
      // le signe le plus grave du groupe : au travail ou au repos, un agent compte comme actif
      const counts = {};
      for (const m of membres) {
        const s = SIGNE[m.a.state] || "active";
        counts[s] = (counts[s] || 0) + 1;
      }
      const grave = plusGrave(counts);
      if (grave) {
        const s = document.createElement("span");
        s.className = "signe";
        s.append(signIcon(document, grave, 16));
        c.append(s);
      }
      return c;
    }

    // le groupe deplie : un repere par agent, complet pour ceux qui attendent ou sont bloques, court pour les autres
    #montreDeplie(membres, x, y) {
      if (!this.#panneau) {
        this.#panneau = document.createElement("div");
        this.#panneau.className = "deplie";
        this.#panneau.setAttribute("role", "group");
        this.#els.couche.append(this.#panneau);
      }
      const p = this.#panneau;
      p.setAttribute("aria-label", `${membres.length} agents`);
      p.style.setProperty("--x", `${Math.round(x)}px`);
      p.style.setProperty("--y", `${Math.round(y)}px`);
      const signature = membres.map((m) => `${m.a.id}:${m.a.state}`).join("|");
      if (p.dataset.signature === signature) return;
      p.dataset.signature = signature;
      p.replaceChildren(
        ...membres.map(({ a, complet }) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = complet ? "repere" : "repere court";
          b.dataset.id = a.id;
          b.setAttribute("aria-label", this.#libelle(a));
          b.append(this.#corpsAgent(a, complet));
          return b;
        }),
      );
    }
  }

  registry.define(meta.tag, AgentMarker);
}
