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
// - Les etiquettes de lieu et les pastilles que GDC pose sur la carte (obstacles) restent lisibles : un repere ou un
//   groupe qui en touche une monte juste au-dessus d'elle, et une tige relie sa pointe a la tete (decision de
//   Pierre-Alain, 23 octobre 2026).

export const meta = {
  id: "agent-marker",
  version: "1.0.0",
  category: "interface",
  tag: "gdc-agent-marker",
  inputs: ["agents", "hovered", "obstacles"],
  outputs: ["gdc-select"],
};

// Les etats de character qui ont un signe de la signaletique ; les autres (au travail, au repos) n'en portent pas sur
// un repere seul, et comptent comme actifs dans un groupe.
const SIGNE = { waiting: "waiting", blocked: "blocked", unknown: "unknown" };
const PERMANENTS = new Set(["waiting", "blocked"]);
const PORTRAIT = 26; // px
const HAUTEUR = 32; // px, le corps d'un repere
const POINTE = 7; // px, de la pointe a la tete
const ECART = 2; // px entre deux reperes qui ne se touchent pas, et entre un repere et l'obstacle qu'il evite
const MAX_PORTRAITS = 3;

const CSS = `
:host { display: block; position: absolute; inset: 0; overflow: hidden; pointer-events: none;
  font: 600 12px/1.2 var(--gdc-font-ui, system-ui, sans-serif); color: var(--gdc-ink); }
* { box-sizing: border-box; }
.couche { position: absolute; inset: 0; }
/* un repere : pose sur la tete de l'agent, sa pointe en bas ; le bouton suit la position, son corps porte l'impulsion */
.repere { position: absolute; left: 0; top: 0; pointer-events: auto; padding: 0; border: 0; background: none; color: inherit;
  font: inherit; cursor: pointer; transform: translate(var(--x), var(--y)) translate(-50%, calc(-100% - ${POINTE}px)); }
/* la tige : un repere monte au-dessus d'une etiquette de lieu reste relie a la tete (--tige, sa longueur) ; un trait
   d'encre borde de surface, lisible sur tous les sols de la carte ; elle s'interrompt sur l'etiquette qu'elle traverse
   (--tige-masque), pour ne pas barrer son texte */
.repere::before { content: ""; position: absolute; left: 50%; top: calc(100% + ${POINTE}px); width: 4px; height: var(--tige, 0px);
  transform: translateX(-50%); pointer-events: none;
  background: linear-gradient(to right, var(--gdc-surface) 0 1px, var(--gdc-ink) 1px 3px, var(--gdc-surface) 3px);
  -webkit-mask-image: var(--tige-masque, none); mask-image: var(--tige-masque, none); }
.repere:not(.monte)::before { display: none; }
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
/* le groupe deplie : ses agents empiles au-dessus de lui, ou en dessous quand la place manque en haut de la carte ;
   --x et --y sont deja recadres dans la couche (montreDeplie) */
.deplie { position: absolute; left: 0; top: 0; pointer-events: auto; display: flex; flex-direction: column-reverse; gap: 4px;
  transform: translate(var(--x), var(--y)) translate(-50%, calc(-100% - ${POINTE + 40}px)); }
.deplie.dessous { flex-direction: column; transform: translate(var(--x), var(--y)) translate(-50%, 8px); }
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

// La montee d'un repere large de l, dont la pointe vise la tete (x, y) : juste au-dessus des obstacles que son corps ou
// sa pointe toucheraient. Chaque pas passe au-dessus d'un obstacle qu'il ne retouchera plus : la boucle finit.
const monte = (x, y, l, obstacles) => {
  let pointe = y;
  for (let pas = 0; pas <= obstacles.length; pas++) {
    const haut = pointe - POINTE - HAUTEUR;
    const o = obstacles.find(
      (r) =>
        r.x < x + l / 2 + ECART &&
        x - l / 2 - ECART < r.x + r.width &&
        r.y < pointe &&
        haut - ECART < r.y + r.height,
    );
    if (!o) break;
    pointe = o.y - ECART;
  }
  return y - pointe;
};

// Le masque de la tige qui descend de la pointe (x, pointe) sur sa longueur : interrompue, a ECART pres, sur chaque
// obstacle qu'elle traverse ; null si elle n'en traverse aucun (la tige pleine)
const masqueDeTige = (x, pointe, longueur, obstacles) => {
  const trous = obstacles
    .filter(
      (r) =>
        r.x <= x + 1 &&
        x - 1 <= r.x + r.width &&
        r.y < pointe + longueur &&
        pointe < r.y + r.height,
    )
    .map((r) => [
      Math.max(r.y - ECART - pointe, 0),
      Math.min(r.y + r.height + ECART - pointe, longueur),
    ])
    .sort((p, q) => p[0] - q[0]);
  if (!trous.length) return null;
  const arrets = [];
  let pos = 0;
  for (const [debut, fin] of trous) {
    if (debut > pos) arrets.push(`#000 ${pos}px ${debut}px`);
    pos = Math.max(pos, fin);
    arrets.push(`transparent ${debut}px ${pos}px`);
  }
  arrets.push(`#000 ${pos}px`);
  return `linear-gradient(to bottom, ${arrets.join(", ")})`;
};

// Les reperes qui se touchent fusionnent : chaque groupe rejoint celui d'un voisin dont la boite touche la sienne
// (union-find) ; rend les listes de membres fusionnees
const fusionne = (groupes) => {
  const parent = groupes.map((_, i) => i);
  const racine = (i) => (parent[i] === i ? i : (parent[i] = racine(parent[i])));
  const touche = (p, q) =>
    p[0] < q[2] + ECART &&
    q[0] < p[2] + ECART &&
    p[1] < q[3] + ECART &&
    q[1] < p[3] + ECART;
  for (let i = 0; i < groupes.length; i++)
    for (let j = i + 1; j < groupes.length; j++)
      if (touche(groupes[i].pose.boite, groupes[j].pose.boite))
        parent[racine(i)] = racine(j);
  const listes = new Map();
  groupes.forEach((g, i) => {
    const r = racine(i);
    if (!listes.has(r)) listes.set(r, []);
    listes.get(r).push(...g.membres);
  });
  return [...listes.values()];
};

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
    #mesure = null; // le contexte de canevas qui mesure les prenoms

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

    // les rectangles a ne pas recouvrir (facultatifs) ; un rectangle mal forme est ignore
    #obstacles() {
      return (
        Array.isArray(this.#data.obstacles) ? this.#data.obstacles : []
      ).filter(
        (o) =>
          o &&
          [o.x, o.y, o.width, o.height].every((v) => nombre(v) !== null) &&
          o.width > 0 &&
          o.height > 0,
      );
    }

    // la largeur d'un texte dans la police des reperes ; avant que la couche soit dans la page, une estimation
    #largeurTexte(texte) {
      const police = this.isConnected ? getComputedStyle(this).font : "";
      if (!police) return texte.length * 7;
      if (!this.#mesure) this.#mesure = document.createElement("canvas").getContext("2d");
      if (!this.#mesure) return texte.length * 7;
      this.#mesure.font = police;
      return Math.ceil(this.#mesure.measureText(texte).width);
    }

    // la largeur d'un repere, d'apres sa CSS (.corps : bordure 1, marges 3 et 9, ecart 5) : la meme pour le regrouper
    // et pour le poser
    #largeur(membres) {
      if (membres.length === 1) {
        const { a, complet } = membres[0];
        const nom = Math.min(this.#largeurTexte(prenom(a)), 120);
        return 1 + 3 + PORTRAIT + 5 + nom + (complet ? 5 + 16 : 0) + (complet ? 9 : 8) + 1;
      }
      // un groupe porte toujours un signe : il compte au moins un agent qui attend ou qui est bloque
      const portraits = PORTRAIT + (Math.min(membres.length, MAX_PORTRAITS) - 1) * (PORTRAIT - 9);
      return 1 + 3 + portraits + 5 + this.#largeurTexte(String(membres.length)) + 5 + 16 + 9 + 1;
    }

    // La pose d'un repere large de l sur la tete (x, y) : entier dans la couche (un agent au bord de la carte), monte
    // au-dessus des obstacles qu'il toucherait, aussi haut que la couche le permet, la tige le reliant a la tete
    #pose(x, y, l, obstacles) {
      const largeur = this.clientWidth;
      const X = Math.round(
        largeur > l + 4 ? Math.min(Math.max(x, l / 2 + 2), largeur - l / 2 - 2) : x,
      );
      const plusHaut = HAUTEUR + POINTE + 2; // la pointe la plus haute qui garde le repere entier
      const tete = Math.round(Math.max(y, plusHaut));
      const tige = Math.round(Math.min(monte(X, tete, l, obstacles), tete - plusHaut));
      const pointe = tete - tige;
      return {
        X,
        tete,
        pointe,
        tige,
        boite: [X - l / 2, pointe - POINTE - HAUTEUR, X + l / 2, pointe - POINTE],
      };
    }

    // un groupe (ou un agent seul) : sa place est la moyenne de ses tetes, en haut de la plus haute
    #groupe(membres, obstacles) {
      const x = membres.reduce((s, m) => s + m.a.x, 0) / membres.length;
      const y = Math.min(...membres.map((m) => m.a.y));
      return { membres, x, pose: this.#pose(x, y, this.#largeur(membres), obstacles) };
    }

    // Les reperes a montrer : les permanents, et celui qu'on survole. Ils se regroupent d'abord sur les tetes, comme sans
    // obstacle ; puis chaque groupe monte au-dessus des obstacles, et les groupes montes qui se touchent fusionnent et
    // remontent, jusqu'a ce qu'aucun n'en touche un autre (chaque tour fusionne, ou s'arrete : la boucle finit)
    #reperes(obstacles) {
      // un agent hors de la couche (la carte zoomee, un panneau devant) n'a pas de repere : plaque au bord, sa pointe ne
      // viserait rien (revue DA)
      const [largeur, hauteur] = [this.clientWidth, this.clientHeight];
      const dedans = (a) =>
        !largeur ||
        !hauteur ||
        (a.x >= 0 && a.x <= largeur && a.y >= 0 && a.y <= hauteur);
      const agents = (
        Array.isArray(this.#data.agents) ? this.#data.agents : []
      ).filter(
        (a) =>
          a &&
          a.id !== undefined &&
          nombre(a.x) !== null &&
          nombre(a.y) !== null &&
          dedans(a),
      );
      const hovered = this.#data.hovered ?? null;
      const montres = agents
        .filter((a) => PERMANENTS.has(a.state) || a.id === hovered)
        .map((a) => ({ a, complet: PERMANENTS.has(a.state) }));
      let groupes = fusionne(montres.map((m) => this.#groupe([m], []))).map((membres) =>
        this.#groupe(membres, obstacles),
      );
      for (;;) {
        const listes = fusionne(groupes);
        if (listes.length === groupes.length) return groupes;
        groupes = listes.map((membres) => this.#groupe(membres, obstacles));
      }
    }

    #render() {
      const { couche } = this.#els;
      const vus = new Set();
      let deplieVu = false;
      const obstacles = this.#obstacles();
      for (const { membres, x, pose } of this.#reperes(obstacles)) {
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
          this.#place(b, x, pose, obstacles);
          vus.add(cle);
          continue;
        }
        // un groupe : la cle tient a ses agents
        const ids = membres.map((m) => m.a.id).sort();
        const cle = `groupe:${ids.join("|")}`;
        const etats = membres.map((m) => `${m.a.id}:${m.a.state}`).join("|");
        const b = this.#bouton(cle, () => this.#corpsGroupe(membres), etats);
        b.dataset.groupe = "1";
        b.setAttribute("aria-expanded", String(this.#deplie === cle));
        b.setAttribute(
          "aria-label",
          `${membres.length} agents : ${membres.map((m) => this.#libelle(m.a)).join(" ; ")}`,
        );
        this.#place(b, x, pose, obstacles);
        vus.add(cle);
        if (this.#deplie === cle) {
          deplieVu = true;
          this.#montreDeplie(membres, pose);
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

    // un repere a sa pose : sa pointe, sa tige, et le masque de la tige sur les etiquettes qu'elle traverse
    #place(b, x, { X, pointe, tige }, obstacles) {
      b.dataset.x = String(x);
      b.classList.toggle("monte", tige > 0);
      b.style.setProperty("--x", `${X}px`);
      b.style.setProperty("--y", `${pointe}px`);
      b.style.setProperty("--tige", `${tige}px`);
      const masque = tige > 0 ? masqueDeTige(X, pointe, tige, obstacles) : null;
      if (masque) b.style.setProperty("--tige-masque", masque);
      else b.style.removeProperty("--tige-masque");
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
    #montreDeplie(membres, { X: x, pointe, tete }) {
      if (!this.#panneau) {
        this.#panneau = document.createElement("div");
        this.#panneau.className = "deplie";
        this.#panneau.setAttribute("role", "group");
        this.#els.couche.append(this.#panneau);
      }
      const p = this.#panneau;
      p.setAttribute("aria-label", `${membres.length} agents`);
      const signature = membres.map((m) => `${m.a.id}:${m.a.state}`).join("|");
      if (p.dataset.signature !== signature) {
        p.dataset.signature = signature;
        p.replaceChildren(...this.#reperesDeplies(membres));
      }
      // toujours entier dans la couche : au-dessus du groupe s'il y a la place, sinon sous les tetes (sous l'etiquette
      // qui l'a fait monter, qu'il ne recouvre pas) ; recadre de cote et en bas (le groupe d'un agent au bord de la carte)
      const [l, h] = [p.offsetWidth, p.offsetHeight];
      const [largeur, hauteur] = [this.clientWidth, this.clientHeight];
      const dessus = pointe - (POINTE + 40) - h >= 2;
      p.classList.toggle("dessous", !dessus);
      const X =
        largeur > l + 4
          ? Math.min(Math.max(x, l / 2 + 2), largeur - l / 2 - 2)
          : x;
      const Y = dessus
        ? pointe
        : !hauteur
          ? tete
          : Math.max(Math.min(tete, hauteur - h - 10), 2);
      p.style.setProperty("--x", `${Math.round(X)}px`);
      p.style.setProperty("--y", `${Math.round(Y)}px`);
    }

    #reperesDeplies(membres) {
      return [
        ...membres.map(({ a, complet }) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = complet ? "repere" : "repere court";
          b.dataset.id = a.id;
          b.setAttribute("aria-label", this.#libelle(a));
          b.append(this.#corpsAgent(a, complet));
          return b;
        }),
      ];
    }
  }

  registry.define(meta.tag, AgentMarker);
}
