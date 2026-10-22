// La navigation (lot G6, 2.0.0 au lot G8) : aller a un lieu, un agent, un batiment, une fiche ou un lot ; GDC fait
// suivre la camera. Fiche validee par Pierre-Alain le 21 octobre 2026 : la navigation devient un arbre (modele d'arbre
// ARIA), trois niveaux au plus ; le groupe des batiments descend jusqu'aux fiches (les etages) puis aux lots (les
// pieces). Decisions du 22 octobre 2026 : GDC marque une fiche livree (delivered), donne la fraction de lots finis en
// { done, total } et un identifiant unique dans tout l'arbre.
// - Un arbre par groupe (role tree, nomme par son titre), un seul arret de tabulation pour tous (tabindex mobile) ;
//   le focus se deplace vraiment de noeud en noeud (le survol partage, ctx.hoverLink).
// - Les enfants livres sont ranges sous « Livrees · n » : un noeud qui tient lieu de plusieurs fiches, dont la
//   reference est celle de son parent (contrat, « Ce qui entre : highlight »).
// - Sur telephone, une rangee de pastilles pour le premier niveau ; le batiment choisi ouvre une deuxieme rangee avec
//   ses fiches (sans les lots). Tout ce qui se cache est decide ici ; la feuille de style ne fait que la mise en page.

export const meta = {
  id: "side-nav",
  version: "2.0.0",
  category: "interface",
  tag: "gdc-side-nav",
  inputs: ["groups", "selected", "expanded", "highlight"],
  outputs: ["gdc-select", "gdc-hover"],
};

const MAX_DEPTH = 3;
// le meme seuil que la feuille de style : selon l'ecran et non selon le panneau (une navigation laterale est etroite
// par nature, elle ne devient une rangee que sur un telephone)
const TELEPHONE = "(max-width: 600px)";

// « Le bureau d'Études » et « etudes » se rencontrent : sans accents ni majuscules.
const plat = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const CSS = `
:host { display: flex; flex-direction: column; min-height: 0; font: 14px/1.3 var(--gdc-font-ui, system-ui, sans-serif); color: var(--gdc-ink);
  background: var(--gdc-surface); }
* { box-sizing: border-box; }
/* positionnes : les titres masques (position absolue) restent dans la liste et n'elargissent pas la page */
nav { position: relative; display: flex; flex-direction: column; min-height: 0; height: 100%; }
.recherche { position: relative; flex: none; padding: 10px 10px 6px; }
.recherche svg { position: absolute; left: 20px; top: 50%; margin-top: 2px; transform: translateY(-50%); color: var(--gdc-muted); pointer-events: none; }
input { width: 100%; min-height: 40px; padding: 0 10px 0 32px; border: 1px solid color-mix(in srgb, var(--gdc-ink) 22%, transparent); border-radius: 8px;
  background: var(--gdc-background); color: var(--gdc-ink); font: inherit; }
input::placeholder { color: var(--gdc-muted); }
input:focus-visible { outline: 2px solid var(--gdc-ink); outline-offset: 2px; }
.liste { position: relative; flex: 1 1 auto; min-height: 0; overflow: auto; padding: 0 6px 10px; scrollbar-width: thin; }
.groupe { margin: 0; }
.titre { display: flex; justify-content: space-between; margin: 12px 8px 4px; font: 600 11px/1.3 var(--gdc-font-ui, system-ui, sans-serif);
  text-transform: uppercase; letter-spacing: .06em; color: var(--gdc-muted); }
.titre .nb { font-variant-numeric: tabular-nums; }
ul { list-style: none; margin: 0; padding: 0; }
/* les lignes se touchent : aucune zone sans reference entre deux noeuds (le survol partage) */
li { outline: none; }
.ligne { position: relative; display: flex; align-items: center; gap: 6px; min-height: 36px; padding: 4px 8px 4px calc(4px + var(--niveau, 0) * 16px);
  border-radius: 8px; cursor: pointer; }
.ligne:hover { background: color-mix(in srgb, var(--gdc-ink) 7%, transparent); }
li:focus-visible > .ligne { outline: 2px solid var(--gdc-ink); outline-offset: -2px; }
li[aria-selected="true"] > .ligne { background: color-mix(in srgb, var(--gdc-ink) 11%, transparent); font-weight: 600; }
li[aria-selected="true"] > .ligne::before, .ligne[data-contient]::before { content: ''; position: absolute; left: 1px; top: 8px; bottom: 8px; width: 3px;
  border-radius: 2px; background: var(--gdc-ink); }
/* le choisi est dans un noeud plie : son parent visible garde un trait plus discret */
.ligne[data-contient]::before { background: var(--gdc-muted); }
/* la marque du survol partage : plus legere que la selection, sans couleur d'etat, rien ne bouge */
.ligne[data-highlight] { background: var(--gdc-highlight-fill); box-shadow: var(--gdc-highlight-ring); }
li[aria-selected="true"] > .ligne[data-highlight] { background: color-mix(in srgb, var(--gdc-ink) 11%, transparent); }
.pli { flex: none; display: inline-grid; place-items: center; width: 20px; height: 20px; margin: 0 -2px; border-radius: 4px; color: var(--gdc-muted); }
.pli:hover { background: color-mix(in srgb, var(--gdc-ink) 12%, transparent); color: var(--gdc-ink); }
.pli svg { width: 10px; height: 10px; }
li[aria-expanded="true"] > .ligne .pli svg { transform: rotate(90deg); }
.signe { flex: none; display: inline-grid; place-items: center; width: 16px; height: 16px; }
.nom { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.extra { flex: none; font: 12px/1 var(--gdc-font-ui, system-ui, sans-serif); color: var(--gdc-muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
/* l'etape reste lisible sur le fond de la selection, en sombre aussi (4,5:1), comme au selecteur d'etages */
li[aria-selected="true"] > .ligne .extra { color: var(--gdc-ink); }
.vide { margin: 12px 8px; color: var(--gdc-muted); }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
[hidden] { display: none !important; }
/* telephone : une rangee de pastilles pour le premier niveau, qui defile de cote, un separateur entre les groupes ;
   sous elle, la deuxieme rangee : les fiches du batiment choisi. Elle est placee par rapport a la navigation (la
   liste n'est pas positionnee) : elle ne defile pas avec la premiere et n'est pas coupee par elle. */
@media (max-width: 600px) {
  /* les rangees defilent : leur largeur ne pousse jamais la page ni la grille qui contient la navigation */
  :host { contain: inline-size; }
  nav.deux { padding-bottom: 50px; }
  .recherche { padding: 8px 8px 6px; }
  .recherche svg { left: 18px; }
  .liste { position: static; display: flex; flex: none; overflow-x: auto; overflow-y: hidden; padding: 2px 8px 8px; }
  .groupe { display: flex; flex: none; align-items: center; }
  .groupe + .groupe { margin-left: 6px; padding-left: 6px; border-left: 1px solid color-mix(in srgb, var(--gdc-ink) 18%, transparent); }
  /* masques, poses au coin de la navigation : la liste n'est pas positionnee, ils ne restent pas dans la rangee */
  .titre { position: absolute; left: 0; top: 0; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); margin: 0; }
  [role="tree"], [role="group"] { display: flex; gap: 6px; align-items: center; }
  li { flex: none; }
  .ligne { max-width: 220px; min-height: 40px; padding: 6px 12px; border-radius: 20px; border: 1px solid color-mix(in srgb, var(--gdc-ink) 16%, transparent); }
  li[aria-selected="true"] > .ligne, li[aria-selected="true"] > .ligne[data-highlight] { background: var(--gdc-ink); color: var(--gdc-surface);
    border-color: var(--gdc-ink); }
  li[aria-selected="true"] > .ligne .extra { color: var(--gdc-surface); }
  li[aria-selected="true"] > .ligne::before, .ligne[data-contient]::before { display: none; }
  /* le batiment dont les fiches font la deuxieme rangee, et le parent visible du choisi */
  .ligne[data-contient], [role="tree"] > li[aria-expanded="true"] > .ligne { border-color: var(--gdc-ink); }
  /* l'etape et la fraction restent dans le nom lu (aria-label) ; la pastille garde la place pour le nom */
  .extra { display: none; }
  .pli { display: none; }
  [role="tree"] > li > [role="group"] { position: absolute; left: 0; right: 0; bottom: 0; height: 50px; padding: 0 8px 8px; overflow-x: auto; overflow-y: hidden;
    scrollbar-width: thin; }
  /* « Livrees · n » : une pastille qui deplie ses fiches dans la meme rangee */
  li.dossier { display: flex; gap: 6px; align-items: center; }
  li.dossier > .ligne .pli { display: inline-grid; }
  li.dossier[aria-expanded="true"] > .ligne .pli svg { transform: rotate(180deg); }
  .vide { margin: 8px; white-space: nowrap; }
}
`;

export function define(registry, ctx) {
  const { signes, signIcon, plusGrave, correspond, sameRef } = ctx;

  class SideNav extends HTMLElement {
    #data = {};
    #selected = null;
    #highlight = null;
    #open = new Set(); // les noeuds deplies (identifiants, et livrees:<parent> pour « Livrees · n »)
    #given = []; // le dernier data.expanded : seuls ses changements s'appliquent
    #nodes = new Map(); // cle -> noeud, dans l'ordre de l'arbre
    #sections = []; // { section, nodes (premier niveau) }
    #refs = new WeakMap(); // li -> reference (le survol partage)
    #phone = null; // MediaQueryList du telephone
    #onPhone = () => this.#paint();
    #els = {};

    constructor() {
      super();
      const root = this.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = CSS;
      const nav = document.createElement("nav");
      nav.setAttribute("aria-label", "Navigation du chantier");
      const recherche = document.createElement("div");
      recherche.className = "recherche";
      const input = document.createElement("input");
      input.type = "search";
      input.placeholder = "Lieu, fiche, lot, agent…";
      input.setAttribute("aria-label", "Chercher dans la navigation");
      input.autocomplete = "off";
      input.spellcheck = false;
      recherche.append(loupe(), input);
      const liste = document.createElement("div");
      liste.className = "liste";
      const vide = document.createElement("p");
      vide.className = "vide";
      vide.hidden = true;
      const annonce = document.createElement("span");
      annonce.className = "sr";
      annonce.setAttribute("role", "status");
      nav.append(recherche, liste, annonce);
      root.append(style, nav);
      Object.assign(this.#els, { nav, input, liste, vide, annonce });

      input.addEventListener("input", () => this.#paint());
      input.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape" && input.value) {
          ev.preventDefault();
          input.value = "";
          this.#paint();
        } else if (ev.key === "ArrowDown") {
          ev.preventDefault();
          const v = this.#visibles();
          this.#focus(v.find((n) => n.el.tabIndex === 0) || v[0]);
        }
      });
      liste.addEventListener("click", (ev) => {
        const li = ev.target.closest('[role="treeitem"]');
        const node = li && this.#nodes.get(li.dataset.key);
        if (!node) return;
        // le chevron plie et deplie ; le reste de la ligne choisit
        if (ev.target.closest(".pli") && !node.dossier) this.#toggle(node);
        else this.#activate(node);
      });
      liste.addEventListener("keydown", (ev) => this.#move(ev));
      // l'arret de tabulation suit le focus, d'ou qu'il vienne (fleches, clic)
      liste.addEventListener("focusin", (ev) => {
        const li = ev.target.closest('[role="treeitem"]');
        if (li)
          for (const n of this.#nodes.values())
            n.el.tabIndex = n.el === li ? 0 : -1;
      });
      ctx.hoverLink(this, (n) => this.#refs.get(n) ?? null);
    }

    connectedCallback() {
      this.#phone = globalThis.matchMedia?.(TELEPHONE) ?? null;
      this.#phone?.addEventListener("change", this.#onPhone);
      this.#paint();
      // la mise en page n'existe qu'une fois dans la page : on y ramene l'element choisi
      requestAnimationFrame(() => this.#reveal(undefined, true));
    }

    disconnectedCallback() {
      this.#phone?.removeEventListener("change", this.#onPhone);
    }

    get data() {
      return this.#data;
    }
    set data(value) {
      this.#data = value && typeof value === "object" ? value : {};
      const avant = this.#selected;
      this.#selected = idOf(this.#data.selected);
      // expanded : les noeuds ajoutes s'ouvrent, les noeuds retires se plient ; le reste est a l'utilisateur
      const given = Array.isArray(this.#data.expanded)
        ? this.#data.expanded.map(idOf).filter((k) => k !== null)
        : [];
      for (const k of given) if (!this.#given.includes(k)) this.#open.add(k);
      for (const k of this.#given) if (!given.includes(k)) this.#open.delete(k);
      this.#given = given;
      this.#render(avant !== this.#selected);
    }

    // la reference survolee ailleurs : pose ou retire la marque, sans redessiner
    get highlight() {
      return this.#highlight;
    }
    set highlight(ref) {
      this.#highlight = ref ?? null;
      this.#lightUp();
    }

    // nouveauChoix : le noeud choisi vient de changer ; ses parents s'ouvrent (un pli fait a la main tient tant que
    // le choix ne change pas)
    #render(nouveauChoix = false) {
      const { liste, vide } = this.#els;
      const focusKey = this.shadowRoot.activeElement?.dataset?.key;
      this.#nodes.clear();
      this.#sections = [];
      const groups = Array.isArray(this.#data.groups) ? this.#data.groups : [];
      for (const [g, group] of groups.entries()) {
        const items = (Array.isArray(group?.items) ? group.items : [])
          .map((item) => this.#node(item, 1, null))
          .filter(Boolean);
        if (!items.length) continue;
        const section = document.createElement("section");
        section.className = "groupe";
        const titre = document.createElement("h3");
        titre.className = "titre";
        titre.id = `titre-${g}`;
        const t = texte("", String(group.title ?? "Sans titre"));
        const nb = texte("nb", "");
        titre.append(t, nb);
        const tree = document.createElement("ul");
        tree.setAttribute("role", "tree");
        tree.setAttribute("aria-labelledby", titre.id);
        for (const n of items) tree.append(this.#li(n));
        section.append(titre, tree);
        this.#sections.push({ section, nb, nodes: items });
      }
      liste.replaceChildren(...this.#sections.map((s) => s.section), vide);
      const sel = this.#nodes.get(this.#selected);
      if (nouveauChoix && sel)
        for (let a = sel.parent; a; a = a.parent) this.#open.add(a.key);
      this.#paint();
      // le focus d'abord garde sur son noeud ; si celui-ci a disparu, il va a l'arret de tabulation, pour ne pas se
      // perdre dans la page
      if (focusKey) {
        const garde = this.#nodes.get(focusKey);
        this.#focus(
          garde && this.#visible(garde)
            ? garde
            : this.#visibles().find((n) => n.el.tabIndex === 0),
          false,
        );
      }
      this.#reveal(undefined, true);
    }

    // un item de GDC et ses enfants (trois niveaux au plus) ; un identifiant deja vu est ignore (il est unique dans
    // l'arbre, decision de Pierre-Alain du 22 octobre 2026). Les enfants livres passent sous « Livrees · n », a la place
    // du premier d'entre eux.
    #node(item, level, parent) {
      if (!item || typeof item !== "object") return null;
      const id = idOf(item.id);
      if (id === null || this.#nodes.has(id)) return null;
      const node = {
        key: id,
        id,
        name: String(item.name ?? item.id),
        state: stateOf(item.state),
        ref: item.ref && typeof item.ref === "object" ? item.ref : null,
        etape: etapeOf(item.etape),
        progress: progressOf(item.progress),
        delivered: Boolean(item.delivered),
        parent,
        children: [],
      };
      this.#nodes.set(id, node);
      const enfants =
        level < MAX_DEPTH && Array.isArray(item.children)
          ? item.children
              .map((c) => this.#node(c, level + 1, node))
              .filter(Boolean)
          : [];
      const livrees = enfants.filter((c) => c.delivered);
      if (livrees.length) {
        const counts = {};
        for (const c of livrees)
          if (c.state) counts[c.state] = (counts[c.state] || 0) + 1;
        const dossier = {
          key: `livrees:${id}`,
          dossier: true,
          name: `Livrées · ${livrees.length}`,
          state: plusGrave(counts),
          ref: node.ref,
          etape: null,
          progress: null,
          parent: node,
          children: livrees,
        };
        this.#nodes.set(dossier.key, dossier);
        for (const c of livrees) c.parent = dossier;
        const premier = enfants.indexOf(livrees[0]);
        node.children = enfants.filter((c) => !c.delivered);
        node.children.splice(premier, 0, dossier);
      } else node.children = enfants;
      return node;
    }

    #li(node, depth = 1) {
      node.depth = depth;
      const li = document.createElement("li");
      li.setAttribute("role", "treeitem");
      li.setAttribute("aria-level", String(depth));
      li.tabIndex = -1;
      li.dataset.key = node.key;
      if (node.dossier) li.className = "dossier";
      if (node.ref) this.#refs.set(li, node.ref);
      // le nom accessible : sans lui, celui d'un noeud deplie lirait aussi tous ses enfants
      const lu = [node.name];
      const ligne = document.createElement("div");
      ligne.className = "ligne";
      ligne.style.setProperty("--niveau", String(depth - 1));
      ligne.title = node.name;
      const pli = texte("pli", "");
      if (node.children.length) pli.append(chevron());
      const signe = texte("signe", "");
      if (node.state) signe.append(signIcon(document, node.state));
      ligne.append(pli, signe, texte("nom", node.name));
      const extra = [];
      if (node.etape !== null) {
        extra.push(`étape ${node.etape}`);
        lu.push(`étape ${node.etape}`);
      }
      if (node.progress) {
        const { done, total } = node.progress;
        extra.push(`${done}/${total}`);
        lu.push(`${done} ${done > 1 ? "lots finis" : "lot fini"} sur ${total}`);
      }
      if (extra.length) ligne.append(texte("extra", extra.join(" · ")));
      if (node.state) lu.push(signes[node.state].label);
      li.setAttribute("aria-label", lu.join(", "));
      li.append(ligne);
      node.el = li;
      node.ligne = ligne;
      node.groupEl = null;
      if (node.children.length) {
        const ul = document.createElement("ul");
        ul.setAttribute("role", "group");
        for (const c of node.children) ul.append(this.#li(c, depth + 1));
        li.append(ul);
        node.groupEl = ul;
      }
      return li;
    }

    // ce qui se voit : la recherche (les noeuds trouves et leurs parents, ouverts), les noeuds deplies, et sur
    // telephone les deux rangees ; puis le choix, l'arret de tabulation et la marque du survol
    #paint() {
      const { nav, input, vide, annonce } = this.#els;
      const phone = Boolean(this.#phone?.matches);
      const q = plat(input.value.trim());
      const trouves = new Set();
      const montres = q ? new Set() : null;
      if (q)
        for (const n of this.#nodes.values())
          if (!n.dossier && plat(`${n.name} ${n.id}`).includes(q)) {
            trouves.add(n);
            for (let a = n; a; a = a.parent) montres.add(a);
          }
      const haut = phone ? this.#rangee(montres) : null;
      for (const n of this.#nodes.values()) {
        n.el.hidden = montres ? !montres.has(n) : false;
        if (!n.groupEl) continue;
        let ouvert = montres
          ? n.children.some((c) => montres.has(c))
          : this.#open.has(n.key);
        // sur telephone, seul le batiment de la deuxieme rangee s'ouvre, et ses fiches gardent leurs lots
        if (phone && !n.dossier) ouvert = n === haut;
        n.groupEl.hidden = !ouvert;
        if (phone && !n.dossier && n.depth > 1)
          n.el.removeAttribute("aria-expanded");
        else n.el.setAttribute("aria-expanded", String(ouvert));
      }
      nav.classList.toggle("deux", Boolean(haut));
      let total = 0;
      for (const s of this.#sections) {
        const n = montres
          ? [...trouves].filter((t) => s.nodes.includes(racine(t))).length
          : s.nodes.length;
        s.section.hidden = montres
          ? !s.nodes.some((r) => montres.has(r))
          : false;
        s.nb.textContent = String(n);
        total += n;
      }
      const visible = montres ? trouves.size > 0 : this.#sections.length > 0;
      vide.hidden = visible;
      vide.textContent = q
        ? `Aucun résultat pour « ${input.value.trim()} »`
        : "Rien à afficher";
      annonce.textContent = q
        ? `${total} ${total <= 1 ? "résultat" : "résultats"}`
        : "";
      this.#mark();
    }

    // sur telephone, le noeud du premier niveau dont les enfants font la deuxieme rangee : celui du choix, sinon,
    // pendant une recherche, le premier qui a des enfants trouves
    #rangee(montres) {
      const sel = this.#nodes.get(this.#selected);
      const r = sel && racine(sel);
      const ok = (n) =>
        n.children.length > 0 &&
        (!montres || n.children.some((c) => montres.has(c)));
      if (r && ok(r) && (!montres || montres.has(r))) return r;
      if (!montres) return null;
      for (const s of this.#sections)
        for (const n of s.nodes) if (montres.has(n) && ok(n)) return n;
      return null;
    }

    // visible : rien de cache sur le chemin jusqu'a la racine (tout ce qui se cache est decide par #paint)
    #visible(n) {
      if (n.el.hidden) return false;
      return n.parent
        ? !n.parent.groupEl.hidden && this.#visible(n.parent)
        : true;
    }

    // les noeuds atteignables, dans l'ordre de l'arbre
    #visibles() {
      return [...this.#els.liste.querySelectorAll('[role="treeitem"]')]
        .map((li) => this.#nodes.get(li.dataset.key))
        .filter((n) => n && this.#visible(n));
    }

    // aria-selected sur le choisi (son parent visible garde un trait s'il est plie dedans), la marque du survol, et un
    // seul noeud atteignable par Tab : celui qui a le focus, sinon le choisi, sinon le parent visible qui le contient,
    // sinon le premier
    #mark() {
      const visibles = this.#visibles();
      const sel = this.#nodes.get(this.#selected);
      let contient = null;
      if (sel && !this.#visible(sel))
        for (let a = sel.parent; a; a = a.parent)
          if (this.#visible(a)) {
            contient = a;
            break;
          }
      const actif = this.shadowRoot.activeElement;
      const tab =
        visibles.find((n) => n.el === actif) ||
        (sel && visibles.includes(sel) ? sel : null) ||
        contient ||
        visibles[0];
      for (const n of this.#nodes.values()) {
        n.el.setAttribute("aria-selected", String(n === sel));
        n.ligne.toggleAttribute("data-contient", n === contient);
        n.el.tabIndex = n === tab ? 0 : -1;
      }
      this.#lightUp();
    }

    // la marque du survol partage, seule : highlight change a chaque survol et ne touche ni au choix ni au focus. Un
    // noeud s'allume quand sa reference correspond. « Livrees · n », et un noeud dont la reference n'est que celle de
    // son parent (une application existante), tiennent lieu de plusieurs fiches ou d'aucune : ils s'allument pour leur
    // reference elle-meme ou une de leurs propres fiches, jamais pour une voisine (contrat, « Ce qui entre :
    // highlight », decision de PA du 22 octobre 2026).
    #lightUp() {
      const h = this.#highlight;
      const allume = (n) => {
        if (!h || !n.ref) return false;
        if (n.dossier) return sameRef(h, n.ref) || n.children.some(allume);
        if (n.parent?.ref && sameRef(n.ref, n.parent.ref)) return sameRef(h, n.ref);
        return correspond(h, n.ref);
      };
      for (const n of this.#nodes.values())
        n.ligne.toggleAttribute("data-highlight", allume(n));
    }

    // un noeud ordinaire est choisi ; « Livrees · n » se plie et se deplie
    #activate(node) {
      if (node.dossier) this.#toggle(node);
      else this.#choose(node);
    }

    #choose(node) {
      // marque tout de suite et ouvre le noeud et ses parents ; GDC confirme en renvoyant selected
      this.#selected = node.id;
      for (let a = node.children.length ? node : node.parent; a; a = a.parent)
        this.#open.add(a.key);
      this.#paint();
      this.#reveal(node);
      this.dispatchEvent(
        new CustomEvent("gdc-select", {
          detail: { id: node.id, ref: node.ref },
          bubbles: true,
          composed: true,
        }),
      );
    }

    #toggle(node, ouvrir = !this.#open.has(node.key)) {
      // plier cache peut-etre le noeud qui a le focus : il revient d'abord au noeud plie
      const actif = this.shadowRoot.activeElement;
      if (!ouvrir && actif && actif !== node.el && node.el.contains(actif))
        this.#focus(node, false);
      if (ouvrir) this.#open.add(node.key);
      else this.#open.delete(node.key);
      this.#paint();
    }

    // le modele d'arbre ARIA : haut et bas d'un noeud visible a l'autre, droite deplie puis descend au premier enfant,
    // gauche plie puis remonte au parent, Debut et Fin, Entree (et Espace) choisit. Pendant une recherche, ce qui est
    // ouvert est ce qui est trouve : droite et gauche ne font que descendre et remonter. Sur telephone, gauche et droite
    // suivent la rangee, bas descend du batiment a ses fiches, haut y remonte.
    #move(ev) {
      const li = ev.target;
      const node =
        li.getAttribute?.("role") === "treeitem" &&
        this.#nodes.get(li.dataset.key);
      if (!node) return;
      const visibles = this.#visibles();
      const i = visibles.indexOf(node);
      if (i < 0) return;
      const phone = Boolean(this.#phone?.matches);
      const cherche = Boolean(this.#els.input.value.trim());
      const ouvert = node.el.getAttribute("aria-expanded") === "true";
      const premierEnfant = () =>
        node.children.find((c) => visibles.includes(c));
      let cible = null;
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        this.#activate(node);
        return;
      }
      if (phone) {
        const rangee = visibles.filter(
          (n) => (n.depth === 1) === (node.depth === 1),
        );
        const j = rangee.indexOf(node);
        const pas = { ArrowRight: 1, ArrowLeft: -1 }[ev.key];
        if (pas)
          cible = rangee[Math.min(rangee.length - 1, Math.max(0, j + pas))];
        else if (ev.key === "Home") cible = rangee[0];
        else if (ev.key === "End") cible = rangee.at(-1);
        else if (ev.key === "ArrowDown" && node.depth === 1)
          cible = premierEnfant();
        else if (ev.key === "ArrowUp" && node.depth > 1) cible = racine(node);
      } else if (ev.key === "ArrowDown")
        cible = visibles[Math.min(visibles.length - 1, i + 1)];
      else if (ev.key === "ArrowUp") cible = visibles[Math.max(0, i - 1)];
      else if (ev.key === "Home") cible = visibles[0];
      else if (ev.key === "End") cible = visibles.at(-1);
      else if (ev.key === "ArrowRight" && node.children.length) {
        if (!ouvert && !cherche) {
          ev.preventDefault();
          this.#toggle(node, true);
          return;
        }
        cible = premierEnfant();
      } else if (ev.key === "ArrowLeft") {
        if (ouvert && !cherche) {
          ev.preventDefault();
          this.#toggle(node, false);
          return;
        }
        cible =
          node.parent && visibles.includes(node.parent) ? node.parent : null;
      }
      if (cible === null || cible === undefined) {
        if (/^(Arrow|Home|End)/.test(ev.key)) ev.preventDefault();
        return;
      }
      ev.preventDefault();
      this.#focus(cible);
    }

    #focus(node, montre = true) {
      if (!node) return;
      for (const n of this.#nodes.values()) n.el.tabIndex = n === node ? 0 : -1;
      node.el.focus({ preventScroll: true });
      if (montre) this.#reveal(node);
    }

    // ramene un noeud dans sa rangee ou sa liste, sans faire defiler la page autour ; d'un coup a l'affichage (un
    // defilement doux s'interrompt si la page bouge pendant ce temps), en douceur quand on se deplace
    #reveal(node = this.#visibles().find((n) => n.el.tabIndex === 0), placement = false) {
      if (!node || !this.#visible(node)) return;
      // sur telephone, le batiment de la deuxieme rangee se montre aussi dans la premiere
      if (this.#phone?.matches && node.parent) this.#reveal(racine(node), placement);
      const { nav } = this.#els;
      let c = node.ligne.parentElement;
      while (
        c &&
        c !== nav &&
        !/(auto|scroll)/.test(
          getComputedStyle(c).overflowX + getComputedStyle(c).overflowY,
        )
      )
        c = c.parentElement;
      if (!c || c === nav) return;
      const r = node.ligne.getBoundingClientRect();
      const cr = c.getBoundingClientRect();
      let dx = 0;
      let dy = 0;
      if (r.left < cr.left) dx = r.left - cr.left - 8;
      else if (r.right > cr.right) dx = r.right - cr.right + 8;
      if (r.top < cr.top) dy = r.top - cr.top - 8;
      else if (r.bottom > cr.bottom) dy = r.bottom - cr.bottom + 8;
      if (!dx && !dy) return;
      const calme =
        getComputedStyle(this).getPropertyValue("--gdc-motion").trim() === "0";
      c.scrollBy({
        left: dx,
        top: dy,
        behavior: calme || placement ? "auto" : "smooth",
      });
    }
  }

  // les identifiants envoyes par GDC, compares en texte ; absent : null
  function idOf(id) {
    return id === undefined || id === null || id === "" ? null : String(id);
  }

  // un des six etats : son signe ; absent : rien a signaler ; autre valeur : « inconnu » (fiche side-nav)
  function stateOf(s) {
    if (s === undefined || s === null || s === "") return null;
    return signes[s] ? s : "unknown";
  }

  function etapeOf(e) {
    return e !== null && e !== "" && Number.isFinite(Number(e))
      ? Number(e)
      : null;
  }

  // les lots finis sur le total (decision de PA du 22 octobre 2026) ; rien a montrer sans lot
  function progressOf(p) {
    if (!p || typeof p !== "object") return null;
    const done = Number(p.done);
    const total = Number(p.total);
    if (
      !Number.isInteger(done) ||
      !Number.isInteger(total) ||
      total <= 0 ||
      done < 0
    )
      return null;
    return { done: Math.min(done, total), total };
  }

  function racine(n) {
    while (n.parent) n = n.parent;
    return n;
  }

  function texte(classe, contenu) {
    const s = document.createElement("span");
    if (classe) s.className = classe;
    s.textContent = contenu;
    return s;
  }

  function svgTrait(viewBox, d, attrs = {}) {
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", viewBox);
    svg.setAttribute("aria-hidden", "true");
    for (const [k, v] of Object.entries(attrs)) svg.setAttribute(k, v);
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", d);
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

  // pointe a droite, plie ; tourne d'un quart deplie
  function chevron() {
    return svgTrait("0 0 10 10", "M3.5 2 6.5 5 3.5 8");
  }

  function loupe() {
    return svgTrait(
      "0 0 16 16",
      "M7 2.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9ZM10.4 10.4 14 14",
      {
        width: "16",
        height: "16",
      },
    );
  }

  registry.define(meta.tag, SideNav);
}
