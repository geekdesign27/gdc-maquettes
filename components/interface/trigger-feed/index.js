// Le fil des declencheurs (lot G8) : lire a gauche ce que le harnais vient de faire, action par action, la plus
// recente en haut. Fiche validee par Pierre-Alain le 21 octobre 2026.
// - Les actions sont celles de GDC (gdc scene --avant) ; le fil les garde, jusqu'a limit. Chaque data apporte des
//   actions : celles deja gardees ne sont pas ajoutees deux fois, GDC peut donc envoyer le lot du moment comme toute
//   la liste. Le premier data est l'etat de depart ; les suivants apportent les nouvelles actions (impulsion, annonce).
// - L'ordre et les instants viennent de la carte (src/ville/scene-gdc.js, instants), injectes en ctx.instants : la
//   meme regle de lecture que la carte, ecrite une fois. Le portrait d'un personnage : ctx.agentOf(action), puis
//   ctx.portrait.
// - Tout du plus recent au plus ancien, y compris dans un instant : l'ordre recu, retourne (decision de PA du
//   22 octobre 2026). GDC envoie le changement de regime du chantier (ouverture, pause, fermeture) en premier dans son
//   instant : il se retrouve en bas, separateur sur toute la largeur entre l'avant et l'apres ; replie sur telephone,
//   on voit la derniere action recue. L'annonce suit le meme ordre que l'affichage.
// - Un seul arret de tabulation (tabindex mobile) sur toutes les lignes ; une ligne qui porte une reference se survole
//   (ctx.hoverLink) et se clique (gdc-select).

export const meta = {
  id: "trigger-feed",
  version: "1.0.0",
  category: "interface",
  tag: "gdc-trigger-feed",
  inputs: ["actions", "limit", "highlight"],
  outputs: ["gdc-select", "gdc-hover"],
};

const LIMIT = 200;
const REGIMES = ["ouverture", "pause", "fermeture"];
// au-dela, les nouveaux instants sont annonces en une phrase
const ANNONCES_MAX = 3;
// l'ecart entre deux annonces, pour que le lecteur d'ecran les lise toutes
const ANNONCE_MS = 2500;

const CSS = `
:host { display: block; font: 13px/1.4 var(--gdc-font-ui, system-ui, sans-serif); color: var(--gdc-ink); }
* { box-sizing: border-box; }
.fil { position: relative; display: flex; flex-direction: column; min-height: 0; max-height: 100%; height: 100%; padding: 6px; border-radius: 12px;
  background: var(--gdc-surface); border: 1px solid color-mix(in srgb, var(--gdc-ink) 14%, transparent); }
.tete { display: flex; align-items: center; gap: 8px; margin: 4px 8px 6px; }
.titre { flex: 1 1 auto; margin: 0; font: 600 11px/1.3 var(--gdc-font-ui, system-ui, sans-serif); text-transform: uppercase;
  letter-spacing: .06em; color: var(--gdc-muted); }
.liste { position: relative; min-height: 0; overflow: auto; overflow-anchor: none; scrollbar-width: thin; }
ol, ul { list-style: none; margin: 0; padding: 0; }
/* l'heure de l'instant : un titre de groupe, sans reference (le survol passe a null) */
.heure { margin: 0; padding: 8px 8px 2px; font: 500 11px/1.3 var(--gdc-font-mono, ui-monospace, monospace); color: var(--gdc-muted);
  font-variant-numeric: tabular-nums; }
.instant:first-child .heure { padding-top: 2px; }
/* les lignes se touchent : aucune zone sans reference entre deux actions d'un instant (le survol partage) */
.ligne { position: relative; display: grid; grid-template-columns: 24px minmax(0, 1fr); align-items: start; gap: 8px; width: 100%;
  min-height: 32px; padding: 5px 8px; border: 0; border-radius: 8px; background: none; color: inherit; font: inherit; text-align: left; }
button.ligne { cursor: pointer; }
button.ligne:hover { background: color-mix(in srgb, var(--gdc-ink) 7%, transparent); }
.ligne:focus-visible { outline: 2px solid var(--gdc-ink); outline-offset: -2px; }
.ligne:focus { outline-offset: -2px; }
/* la marque du survol partage : plus legere que la selection, sans couleur d'etat, rien ne bouge */
.ligne[data-highlight] { background: var(--gdc-highlight-fill); box-shadow: var(--gdc-highlight-ring); }
.phrase { padding-top: 3px; overflow-wrap: anywhere; }
/* le visage d'un personnage (lot G7) ; les autres lignes ont un simple point */
.visage { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; overflow: hidden;
  background: color-mix(in srgb, var(--gdc-ink) 6%, transparent); }
.visage svg { width: 24px; height: 24px; display: block; }
.point { display: grid; place-items: center; width: 24px; height: 24px; }
.point::before { content: ""; width: 5px; height: 5px; border-radius: 50%; background: color-mix(in srgb, var(--gdc-ink) 40%, transparent); }
/* le regime du chantier : un separateur sur toute la largeur */
.ligne.regime { display: flex; align-items: center; gap: 10px; min-height: 32px; padding: 4px 8px; color: var(--gdc-muted);
  font: 600 11px/1.3 var(--gdc-font-ui, system-ui, sans-serif); text-transform: uppercase; letter-spacing: .06em; }
.ligne.regime::before, .ligne.regime::after { content: ""; flex: 1 1 0; min-width: 12px; border-top: 1px solid color-mix(in srgb, var(--gdc-ink) 22%, transparent); }
.ligne.regime .phrase { flex: 0 1 auto; padding: 0; text-align: center; }
/* une nouvelle action : une seule impulsion douce ; avec moins d'animations, sa duree est nulle */
.ligne.neuve:not([data-highlight]) { animation: impulsion calc(var(--gdc-motion, 1) * 1400ms) ease-out 1; }
@keyframes impulsion { from { background: color-mix(in srgb, var(--gdc-ink) 13%, transparent); } to { background: transparent; } }
/* « n nouvelles actions » : la liste remontee ne saute pas, ce bouton ramene en haut */
.nouvelles { position: absolute; z-index: 1; top: 38px; left: 50%; transform: translateX(-50%); display: inline-flex; align-items: center; gap: 6px;
  min-height: 32px; padding: 4px 12px; border: 0; border-radius: 16px; background: var(--gdc-ink); color: var(--gdc-surface);
  font: 600 12px/1 var(--gdc-font-ui, system-ui, sans-serif); white-space: nowrap; cursor: pointer;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--gdc-ink) 25%, transparent); }
.nouvelles:focus-visible { outline: 2px solid var(--gdc-ink); outline-offset: 2px; }
.fleche { width: 10px; height: 10px; }
/* replier et deplier : sur telephone seulement */
.deplie { display: none; flex: none; align-items: center; gap: 6px; min-height: 32px; padding: 4px 10px; border: 1px solid color-mix(in srgb, var(--gdc-ink) 25%, transparent);
  border-radius: 8px; background: none; color: inherit; font: 500 12px/1 var(--gdc-font-ui, system-ui, sans-serif); cursor: pointer; }
.deplie:hover { background: color-mix(in srgb, var(--gdc-ink) 7%, transparent); }
.deplie:focus-visible { outline: 2px solid var(--gdc-ink); outline-offset: 2px; }
/* deplier : la fleche vers le bas ; replier : vers le haut */
.deplie .fleche { transform: rotate(180deg); }
.deplie[aria-expanded="true"] .fleche { transform: none; }
.vide { margin: 6px 8px 8px; color: var(--gdc-muted); }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
[hidden] { display: none !important; }
/* telephone : replie sur la derniere action ; le bouton deplie le fil */
@media (max-width: 600px) {
  .fil { height: auto; }
  .tete { margin: 2px 4px 4px 8px; }
  .deplie { display: inline-flex; }
  .fil:not(.ouvert) .instant:not(:first-child),
  .fil:not(.ouvert) .lignes > li:not(:first-child) { display: none; }
  .fil:not(.ouvert) .nouvelles { display: none; }
  .fil.ouvert .liste { max-height: 60vh; }
}
`;

export function define(registry, ctx) {
  const { instants, agentOf, portrait, correspond } = ctx;

  class TriggerFeed extends HTMLElement {
    #data = {};
    #kept = []; // les actions gardees, de la plus ancienne a la plus recente
    #keys = new WeakMap(); // action -> sa cle (deux actions identiques recues ensemble gardent chacune la leur)
    #started = false; // le premier data est l'etat de depart, sans impulsion ni annonce
    #fresh = new Set(); // les cles des actions arrivees au dernier data
    #unseen = 0; // les nouvelles actions arrivees pendant que la liste etait remontee
    #open = false; // deplie sur telephone
    #highlight = null;
    #refs = new WeakMap(); // ligne -> reference (le survol partage)
    #instantNodes = new Map(); // instant (ts) -> son element, garde d'un rendu a l'autre
    #lineNodes = new Map(); // cle d'action -> l'element de sa ligne
    #queue = []; // les annonces en attente
    #timer = null;
    #els = {};

    constructor() {
      super();
      const root = this.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = CSS;
      const fil = document.createElement("section");
      fil.className = "fil";
      fil.setAttribute("aria-label", "Fil des déclencheurs");
      const tete = document.createElement("div");
      tete.className = "tete";
      const titre = texte("p", "titre", "Déclencheurs");
      titre.setAttribute("aria-hidden", "true");
      const deplie = document.createElement("button");
      deplie.type = "button";
      deplie.className = "deplie";
      deplie.setAttribute("aria-controls", "liste");
      deplie.setAttribute("aria-expanded", "false");
      tete.append(titre, deplie);
      const nouvelles = document.createElement("button");
      nouvelles.type = "button";
      nouvelles.className = "nouvelles";
      nouvelles.hidden = true;
      const liste = document.createElement("div");
      liste.className = "liste";
      liste.id = "liste";
      const vide = texte("p", "vide", "Aucune action pour l'instant");
      // les nouvelles actions, annoncees poliment, un instant a la fois
      const annonce = texte("p", "sr", "");
      annonce.setAttribute("aria-live", "polite");
      fil.append(tete, nouvelles, liste, vide, annonce);
      root.append(style, fil);
      Object.assign(this.#els, {
        fil,
        deplie,
        nouvelles,
        liste,
        vide,
        annonce,
      });

      liste.addEventListener("click", (ev) => {
        const b = ev.target.closest("button.ligne");
        if (b) this.#press(b);
      });
      liste.addEventListener("keydown", (ev) => this.#move(ev));
      // l'arret de tabulation suit le focus, d'ou qu'il vienne (fleches, clic)
      liste.addEventListener("focusin", (ev) => {
        const l = ev.target.closest(".ligne");
        if (l) for (const x of this.#lignes()) x.tabIndex = x === l ? 0 : -1;
      });
      // revenu en haut : les nouvelles actions sont vues
      liste.addEventListener("scroll", () => {
        if (this.#atTop()) this.#seen();
      });
      nouvelles.addEventListener("click", () => {
        const premiere = this.#premiere();
        this.#seen();
        liste.scrollTo({ top: 0, behavior: this.#calme() ? "auto" : "smooth" });
        if (premiere) {
          this.#tabTo(premiere);
          premiere.focus({ preventScroll: true });
        }
      });
      deplie.addEventListener("click", () => {
        this.#open = !this.#open;
        this.#fold();
      });
      ctx.hoverLink(this, (n) => this.#refs.get(n) ?? null);
      this.#fold();
    }

    disconnectedCallback() {
      clearTimeout(this.#timer);
      this.#timer = null;
      this.#queue = [];
    }

    get data() {
      return this.#data;
    }
    set data(value) {
      this.#data = value && typeof value === "object" ? value : {};
      const arrivees = this.#merge(
        Array.isArray(this.#data.actions) ? this.#data.actions : [],
      );
      const depart = !this.#started;
      this.#started = true;
      this.#fresh = depart
        ? new Set()
        : new Set(arrivees.map((a) => this.#keys.get(a)));
      this.#render();
      if (!depart) this.#announce(arrivees);
    }

    // la reference survolee ailleurs : pose ou retire la marque, sans redessiner
    get highlight() {
      return this.#highlight;
    }
    set highlight(ref) {
      this.#highlight = ref ?? null;
      this.#lightUp();
    }

    // garde les actions recues qui ne le sont pas deja, puis les plus recentes jusqu'a limit ; rend les arrivees
    // encore gardees, dans l'ordre de lecture
    #merge(recues) {
      const compte = new Map();
      for (const a of this.#kept) {
        const base = baseKey(a);
        compte.set(base, (compte.get(base) || 0) + 1);
      }
      const vues = new Map();
      const arrivees = [];
      for (const a of recues) {
        if (!a || typeof a !== "object") continue;
        const base = baseKey(a);
        const n = (vues.get(base) || 0) + 1;
        vues.set(base, n);
        if (n <= (compte.get(base) || 0)) continue; // deja gardee
        this.#keys.set(a, `${base}#${n}`);
        arrivees.push(a);
      }
      const ordre = instants([...this.#kept, ...arrivees]).flatMap(
        (i) => i.actions,
      );
      this.#kept = ordre.slice(-limitOf(this.#data.limit));
      const gardees = new Set(this.#kept);
      return arrivees.filter((a) => gardees.has(a));
    }

    // la liste est mise a jour en place, par cle : une ligne gardee ne quitte jamais la page, la ligne qui a le focus
    // le garde (pas de gdc-hover null puis la meme reference), et seules les nouvelles lignes sont creees
    #render() {
      const { liste, vide } = this.#els;
      const actif = this.shadowRoot.activeElement;
      const ligneActive = actif?.classList?.contains("ligne") ? actif : null;
      // replie sur telephone, seule la premiere ligne se voit : mesure avant de changer la liste
      const replie =
        !this.#open && getComputedStyle(this.#els.deplie).display !== "none";
      // la liste remontee ne saute pas : la premiere ligne visible garde sa place
      const enHaut = this.#atTop();
      const repere = enHaut ? null : this.#firstVisible();
      const groupes = instants(this.#kept).reverse();
      let ol = liste.querySelector("ol");
      if (!ol) {
        ol = document.createElement("ol");
        ol.setAttribute("aria-label", "Actions, la plus récente en haut");
        liste.append(ol);
      }
      const instantsVus = new Map();
      const lignesVues = new Map();
      let jourAvant = jourDe(new Date());
      let heureAvant = null;
      const items = groupes.map((g) => {
        const cle = `ts:${g.ts}`;
        const li = this.#instantNodes.get(cle) ?? instantVide();
        instantsVus.set(cle, li);
        const [heure, ul] = li.children;
        const t = heure.firstChild;
        const date = new Date(g.ts);
        let seule = "Heure inconnue";
        if (Number.isFinite(date.getTime())) {
          seule = HEURE.format(date);
          const jour = jourDe(date);
          t.dateTime = g.ts;
          t.textContent =
            (jour !== jourAvant ? `${JOUR.format(date)} · ` : "") + seule;
          jourAvant = jour;
        } else {
          t.removeAttribute("datetime");
          t.textContent = seule;
        }
        // deux instants dans la meme seconde : l'heure n'est pas repetee
        heure.hidden = seule === heureAvant;
        heureAvant = seule;
        // dans l'instant aussi, la plus recente en haut : l'ordre recu, retourne
        const actions = [...g.actions].reverse();
        place(
          ul,
          actions.map((a) => {
            const key = this.#keys.get(a) ?? baseKey(a);
            let item = this.#lineNodes.get(key);
            if (item) item.firstChild.classList.remove("neuve");
            else {
              item = document.createElement("li");
              item.append(this.#ligne(a, key));
            }
            lignesVues.set(key, item);
            return item;
          }),
        );
        return li;
      });
      place(ol, items);
      // replie, une ligne qui avait le focus et n'est plus la premiere va etre cachee : le focus passe a la
      // premiere avant toute mesure, sinon le navigateur le retire d'abord (gdc-hover null, puis la nouvelle)
      const premiere = this.#premiere();
      if (replie && ligneActive && ligneActive !== premiere)
        premiere?.focus({ preventScroll: true });
      this.#instantNodes = instantsVus;
      this.#lineNodes = lignesVues;
      vide.hidden = groupes.length > 0;
      liste.hidden = !groupes.length;
      if (repere) {
        const l = this.#ligneDe(repere.key);
        if (l) liste.scrollTop += this.#top(l) - repere.top;
      }
      const nouvelles = this.#fresh.size;
      if (nouvelles && !enHaut) this.#unseen += nouvelles;
      else if (enHaut) this.#unseen = 0;
      this.#badge();
      this.#els.deplie.hidden = lignesVues.size < 2;
      // l'arret de tabulation : la ligne qui a le focus, sinon celui d'avant, s'ils sont encore visibles ; sinon la
      // premiere. Une ligne qui avait le focus et qui est partie ou cachee (repliee sur telephone) le passe a la
      // premiere, tout de suite, pour qu'il ne tombe pas hors de l'element
      const perdu = Boolean(ligneActive) && !(ligneActive.isConnected && visible(ligneActive));
      const avant = [...liste.querySelectorAll(".ligne")].find((l) => l.tabIndex === 0);
      const tab =
        (!perdu && ligneActive) || (avant && visible(avant) ? avant : null) || this.#premiere();
      this.#tabTo(tab);
      if (perdu) tab?.focus({ preventScroll: true });
      this.#lightUp();
    }

    // une action : un bouton si elle porte une reference (survol et clic), sinon une ligne lisible au clavier
    #ligne(a, key) {
      const ref = a.ref && typeof a.ref === "object" ? a.ref : null;
      const regime = REGIMES.includes(a.action);
      const l = document.createElement(ref ? "button" : "div");
      l.className = "ligne" + (regime ? " regime" : "");
      if (ref) {
        l.type = "button";
        this.#refs.set(l, ref);
      }
      l.tabIndex = -1;
      l.dataset.key = key;
      if (this.#fresh.has(key)) l.classList.add("neuve");
      if (!regime) l.append(this.#visage(a));
      l.append(texte("span", "phrase", phraseOf(a)));
      return l;
    }

    // le portrait de l'agent quand l'action concerne un personnage ; sinon un point
    #visage(a) {
      const id = agentOf(a);
      const svg = id ? portrait(document, id) : null;
      if (!svg) return texte("span", "point", "");
      svg.setAttribute("aria-hidden", "true");
      svg.removeAttribute("role");
      svg.querySelector("title")?.remove();
      const v = texte("span", "visage", "");
      v.append(svg);
      return v;
    }

    #press(b) {
      const a = this.#kept.find((x) => this.#keys.get(x) === b.dataset.key);
      if (!a) return;
      this.dispatchEvent(
        new CustomEvent("gdc-select", {
          detail: { id: a.id ?? null },
          bubbles: true,
          composed: true,
        }),
      );
    }

    // la marque du survol partage, seule : une ligne s'allume quand sa reference correspond a celle survolee
    #lightUp() {
      const h = this.#highlight;
      for (const l of this.#els.liste.querySelectorAll(".ligne")) {
        const ref = this.#refs.get(l);
        l.toggleAttribute(
          "data-highlight",
          Boolean(h && ref) && correspond(h, ref),
        );
      }
    }

    // les nouvelles actions, annoncees poliment, un instant a la fois ; trop d'instants d'un coup : une phrase
    #announce(arrivees) {
      if (!arrivees.length) return;
      const groupes = instants(arrivees);
      const message = (g) => {
        const date = new Date(g.ts);
        const quand = Number.isFinite(date.getTime())
          ? `${HEURE.format(date)} : `
          : "";
        return quand + [...g.actions].reverse().map(phraseOf).join(" ; ");
      };
      if (groupes.length > ANNONCES_MAX)
        this.#queue.push(
          `${nombre(arrivees.length)}. La plus récente, ${message(groupes.at(-1))}`,
        );
      else this.#queue.push(...groupes.map(message));
      // une file courte : des annonces en retard sur le fil ne servent plus
      this.#queue = this.#queue.slice(-ANNONCES_MAX);
      if (!this.#timer) this.#speak();
    }

    #speak() {
      const suivant = this.#queue.shift();
      if (suivant === undefined) {
        this.#timer = null;
        return;
      }
      this.#els.annonce.textContent = suivant;
      this.#timer = setTimeout(() => this.#speak(), ANNONCE_MS);
    }

    // « n nouvelles actions », tant que la liste est remontee
    #badge() {
      const { nouvelles } = this.#els;
      nouvelles.hidden = this.#unseen === 0;
      nouvelles.replaceChildren(
        fleche(),
        document.createTextNode(nombre(this.#unseen)),
      );
    }

    #seen() {
      if (!this.#unseen) return;
      this.#unseen = 0;
      this.#badge();
    }

    // sur telephone, replie sur la derniere action
    #fold() {
      const { fil, deplie } = this.#els;
      fil.classList.toggle("ouvert", this.#open);
      deplie.setAttribute("aria-expanded", String(this.#open));
      deplie.replaceChildren(
        document.createTextNode(this.#open ? "Replier" : "Tout le fil"),
        fleche(),
      );
      // le focus replie dans une ligne cachee revient a la premiere
      const actif = this.shadowRoot.activeElement;
      if (
        !this.#open &&
        actif?.classList?.contains("ligne") &&
        !visible(actif)
      ) {
        const premiere = this.#premiere();
        this.#tabTo(premiere);
        premiere?.focus({ preventScroll: true });
      }
      if (!this.#open) this.#tabTo(this.#premiere());
    }

    // les lignes atteignables, de haut en bas
    #lignes() {
      return [...this.#els.liste.querySelectorAll(".ligne")].filter(visible);
    }

    // la ligne du haut : toujours visible, meme repliee sur telephone, et connue avant que l'element soit dans la page
    #premiere() {
      return this.#els.liste.querySelector(".ligne");
    }

    #ligneDe(key) {
      return [...this.#els.liste.querySelectorAll(".ligne")].find(
        (l) => l.dataset.key === key,
      );
    }

    #tabTo(ligne) {
      for (const l of this.#els.liste.querySelectorAll(".ligne"))
        l.tabIndex = l === ligne ? 0 : -1;
    }

    // haut et bas d'une ligne a l'autre ; Debut et Fin : la premiere et la derniere ; Entree : le bouton s'en charge
    #move(ev) {
      const lignes = this.#lignes();
      const i = lignes.indexOf(this.shadowRoot.activeElement);
      if (i < 0) return;
      const last = lignes.length - 1;
      let j = null;
      if (ev.key === "ArrowDown") j = Math.min(last, i + 1);
      else if (ev.key === "ArrowUp") j = Math.max(0, i - 1);
      else if (ev.key === "Home") j = 0;
      else if (ev.key === "End") j = last;
      if (j === null) return;
      ev.preventDefault();
      this.#tabTo(lignes[j]);
      lignes[j].focus({ preventScroll: true });
      this.#reveal(lignes[j]);
    }

    // ramene une ligne dans la liste, sans faire defiler la page autour ; tout de suite, pour que des touches rapides
    // (Fin puis Debut) ne se perdent pas dans un defilement doux encore en cours
    #reveal(l) {
      const c = this.#els.liste;
      const r = l.getBoundingClientRect();
      const cr = c.getBoundingClientRect();
      // la premiere ligne d'un instant ramene aussi son heure
      const haut = l.closest(".lignes > li:first-child") ? l.closest(".instant") : l;
      const top = haut.getBoundingClientRect().top;
      if (top < cr.top) c.scrollTop += top - cr.top - (haut === l ? 8 : 0);
      else if (r.bottom > cr.bottom) c.scrollTop += r.bottom - cr.bottom + 8;
    }

    #atTop() {
      return this.#els.liste.scrollTop <= 2;
    }

    // la position d'une ligne dans la zone qui defile
    #top(l) {
      return (
        l.getBoundingClientRect().top -
        this.#els.liste.getBoundingClientRect().top
      );
    }

    #firstVisible() {
      const l = this.#lignes().find((x) => this.#top(x) + x.offsetHeight > 0);
      return l ? { key: l.dataset.key, top: this.#top(l) } : null;
    }

    #calme() {
      return (
        getComputedStyle(this).getPropertyValue("--gdc-motion").trim() === "0"
      );
    }
  }

  const HEURE = new Intl.DateTimeFormat("fr-CH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const JOUR = new Intl.DateTimeFormat("fr-CH", {
    day: "numeric",
    month: "short",
  });

  function jourDe(date) {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  // deux actions sont la meme quand GDC envoie exactement les memes valeurs
  function baseKey(a) {
    return JSON.stringify(a);
  }

  function limitOf(n) {
    const v = Math.floor(Number(n));
    return Number.isFinite(v) && v >= 1 ? v : LIMIT;
  }

  // la phrase en clair de GDC ; sans phrase, son nom ou son identifiant
  function phraseOf(a) {
    const p = a.phrase ?? a.nom ?? a.id;
    return p === undefined || p === null || p === ""
      ? "Action sans description"
      : String(p);
  }

  // un instant : son heure, puis ses lignes
  function instantVide() {
    const li = document.createElement("li");
    li.className = "instant";
    const heure = document.createElement("p");
    heure.className = "heure";
    heure.append(document.createElement("time"));
    const ul = document.createElement("ul");
    ul.className = "lignes";
    li.append(heure, ul);
    return li;
  }

  // pose les enfants dans l'ordre voulu sans deplacer ceux qui y sont deja, puis retire les autres
  function place(parent, enfants) {
    let suivant = parent.firstChild;
    for (const e of enfants) {
      if (e === suivant) suivant = suivant.nextSibling;
      else parent.insertBefore(e, suivant);
    }
    while (suivant) {
      const apres = suivant.nextSibling;
      suivant.remove();
      suivant = apres;
    }
  }

  function nombre(n) {
    return n === 1 ? "1 nouvelle action" : `${n} nouvelles actions`;
  }

  function visible(n) {
    return n.getClientRects().length > 0;
  }

  function texte(balise, classe, contenu) {
    const s = document.createElement(balise);
    s.className = classe;
    s.textContent = contenu;
    return s;
  }

  function fleche() {
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 10 10");
    svg.setAttribute("class", "fleche");
    svg.setAttribute("aria-hidden", "true");
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", "M2 6.5 5 3.5 8 6.5");
    Object.assign(p.style, {
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.5",
      strokeLinecap: "round",
      strokeLinejoin: "round",
    });
    svg.append(p);
    return svg;
  }

  registry.define(meta.tag, TriggerFeed);
}
