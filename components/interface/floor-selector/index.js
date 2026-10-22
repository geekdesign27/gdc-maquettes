// Le selecteur d'etages (lot G8) : choisir l'etage d'un batiment, c'est-a-dire la fiche a regarder en coupe. Un
// panneau d'ascenseur, l'etage du haut en haut ; sur telephone, une rangee, le rez a gauche. Fiche validee par
// Pierre-Alain le 21 octobre 2026.
// - Six etages au plus, comme le batiment : la regle est ecrite une fois (src/etages.js) et injectee en
//   ctx.groupFloors. Le rez regroupe se deplie pour choisir une de ses fiches.
// - L'etage d'une application existante (fiche null) est visible mais pas choisissable (decision de PA du
//   22 octobre 2026) ; survole, il vaut son application, comme le rez regroupe (src/etages.js, refOf).
// - Les boutons sont dans l'ordre du batiment, du rez vers le haut ; l'affichage les retourne (column-reverse). Un
//   seul arret de tabulation (tabindex mobile) ; les fleches suivent ce qu'on voit.

export const meta = {
  id: "floor-selector",
  version: "1.0.0",
  category: "interface",
  tag: "gdc-floor-selector",
  inputs: ["building", "floors", "selected", "highlight"],
  outputs: ["gdc-select", "gdc-hover"],
};

const CSS = `
:host { display: block; font: 14px/1.3 var(--gdc-font-ui, system-ui, sans-serif); color: var(--gdc-ink); }
* { box-sizing: border-box; }
/* positionnes : les textes pour lecteurs d'ecran (position absolue) restent dans leur bouton et n'elargissent pas la page */
nav { position: relative; display: flex; flex-direction: column; min-height: 0; max-height: 100%; padding: 6px; border-radius: 12px;
  background: var(--gdc-surface); border: 1px solid color-mix(in srgb, var(--gdc-ink) 14%, transparent); }
.titre { margin: 4px 8px 6px; font: 600 11px/1.3 var(--gdc-font-ui, system-ui, sans-serif); text-transform: uppercase;
  letter-spacing: .06em; color: var(--gdc-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* les boutons se touchent : aucune zone sans reference entre deux etages (le survol partage) */
ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column-reverse; }
.liste { min-height: 0; overflow: auto; scrollbar-width: thin; }
li.rez { display: flex; flex-direction: column-reverse; }
button { position: relative; display: flex; align-items: center; gap: 8px; width: 100%; min-height: 40px; padding: 5px 8px; border: 0; border-radius: 8px;
  background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; }
button:hover { background: color-mix(in srgb, var(--gdc-ink) 7%, transparent); }
button:focus-visible { outline: 2px solid var(--gdc-ink); outline-offset: -2px; }
button[aria-current="true"] { background: color-mix(in srgb, var(--gdc-ink) 11%, transparent); font-weight: 600; }
button[aria-disabled="true"] { cursor: default; color: var(--gdc-muted); }
button[aria-disabled="true"]:hover { background: none; }
/* la marque du survol partage : plus legere que la selection, sans couleur d'etat, rien ne bouge */
button[data-highlight] { background: var(--gdc-highlight-fill); box-shadow: var(--gdc-highlight-ring); }
button[aria-current="true"][data-highlight] { background: color-mix(in srgb, var(--gdc-ink) 11%, transparent); }
/* le niveau : le bouton rond de l'ascenseur, allume quand l'etage est choisi */
.niveau { flex: none; display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 50%;
  border: 1.5px solid color-mix(in srgb, var(--gdc-ink) 45%, transparent); font: 600 12px/1 var(--gdc-font-title, system-ui, sans-serif);
  font-variant-numeric: tabular-nums; }
/* l'etape reste lisible sur le fond de la selection, en sombre aussi (4,5:1) */
button[aria-current="true"] .etape { color: var(--gdc-ink); }
button[aria-current="true"] .niveau { background: var(--gdc-ink); border-color: var(--gdc-ink); color: var(--gdc-surface); }
button[aria-disabled="true"] .niveau { border-style: dashed; }
.nom { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.etape { flex: none; font: 12px/1 var(--gdc-font-ui, system-ui, sans-serif); color: var(--gdc-muted); font-variant-numeric: tabular-nums; }
.signe { flex: none; display: inline-grid; place-items: center; width: 16px; height: 16px; }
.pli { flex: none; width: 10px; height: 10px; color: var(--gdc-muted); }
button[aria-expanded="true"] .pli { transform: rotate(180deg); }
/* les fiches du rez, deplie : entre le rez et le premier etage, la plus ancienne en bas */
.regroupees button { min-height: 36px; }
.regroupees .niveau { border: 0; --point: color-mix(in srgb, var(--gdc-ink) 35%, transparent); background: radial-gradient(circle, var(--point) 3px, transparent 3.5px); }
.regroupees button[aria-current="true"] .niveau { --point: var(--gdc-ink); background: radial-gradient(circle, var(--point) 3px, transparent 3.5px); }
.vide { margin: 6px 8px 8px; color: var(--gdc-muted); }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
[hidden] { display: none !important; }
/* telephone : une rangee, le rez a gauche, qui defile de cote ; des segments qui se touchent */
@media (max-width: 600px) {
  nav { flex-direction: row; align-items: center; padding: 4px; }
  .titre { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); margin: 0; }
  /* largeur nulle au depart : la rangee ne pousse jamais la page, elle defile */
  .liste { flex: 1 1 0; width: 0; overflow-x: auto; overflow-y: hidden; }
  ul, li.rez { flex-direction: row; }
  li { flex: none; }
  button { width: auto; max-width: 240px; min-height: 40px; padding: 4px 10px 4px 6px; }
  .regroupees button { min-height: 40px; }
  .pli { transform: rotate(90deg); }
  button[aria-expanded="true"] .pli { transform: rotate(-90deg); }
  .vide { margin: 6px 8px; white-space: nowrap; }
}
`;

export function define(registry, ctx) {
  const { signes, signIcon, plusGrave, groupFloors, correspond, sameRef } = ctx;

  class FloorSelector extends HTMLElement {
    #data = {};
    #selected = null;
    #highlight = null;
    #open = false; // le rez regroupe est-il deplie
    #refs = new WeakMap(); // bouton -> reference (le survol partage)
    #ids = new WeakMap(); // bouton -> fiches qu'il represente (la marque du survol)
    #els = {};

    constructor() {
      super();
      const root = this.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = CSS;
      const nav = document.createElement("nav");
      const titre = document.createElement("p");
      titre.className = "titre";
      titre.setAttribute("aria-hidden", "true");
      const liste = document.createElement("div");
      liste.className = "liste";
      const vide = document.createElement("p");
      vide.className = "vide";
      vide.textContent = "Aucun étage pour l'instant";
      nav.append(titre, liste, vide);
      root.append(style, nav);
      Object.assign(this.#els, { nav, titre, liste, vide });

      liste.addEventListener("click", (ev) => {
        const b = ev.target.closest("button");
        if (b) this.#press(b);
      });
      liste.addEventListener("keydown", (ev) => this.#move(ev));
      ctx.hoverLink(this, (n) => this.#refs.get(n) ?? null);
    }

    connectedCallback() {
      requestAnimationFrame(() => this.#reveal());
    }

    get data() {
      return this.#data;
    }
    set data(value) {
      this.#data = value && typeof value === "object" ? value : {};
      const avant = this.#selected;
      this.#selected = this.#data.selected ?? null;
      this.#render(idOf(avant) !== idOf(this.#selected));
    }

    // la reference survolee ailleurs : pose ou retire la marque, sans redessiner
    get highlight() {
      return this.#highlight;
    }
    set highlight(ref) {
      this.#highlight = ref ?? null;
      this.#lightUp();
    }

    // la reference du batiment : son application est l'identifiant envoye par GDC (contrat, « Le survol partage »)
    #app() {
      const id = this.#data.building?.id;
      return id === undefined || id === null || id === ""
        ? null
        : { application: String(id) };
    }

    // nouveauChoix : la fiche choisie vient de changer ; fondue dans le rez, elle le deplie (un repli fait a la main
    // tient tant que le choix ne change pas)
    #render(nouveauChoix = false) {
      const { nav, titre, liste, vide } = this.#els;
      const focusKey = this.shadowRoot.activeElement?.dataset?.key;
      const name = String(this.#data.building?.name ?? "Bâtiment");
      nav.setAttribute("aria-label", `Étages de ${name}`);
      titre.textContent = name;
      const floors = Array.isArray(this.#data.floors) ? this.#data.floors : [];
      const visibles = groupFloors(floors);
      const ul = document.createElement("ul");
      for (const v of visibles) {
        const li = document.createElement("li");
        if (v.grouped) {
          li.className = "rez";
          const ids = v.ids.map(idOf);
          if (nouveauChoix && ids.includes(idOf(this.#selected)))
            this.#open = true;
          const sous = document.createElement("ul");
          sous.className = "regroupees";
          sous.id = "regroupees";
          sous.setAttribute("aria-label", "Fiches du rez");
          sous.hidden = !this.#open;
          for (const [k, f] of v.floors.entries()) {
            const sli = document.createElement("li");
            sli.append(this.#floor(f, null, k));
            sous.append(sli);
          }
          li.append(this.#rez(v), sous);
        } else li.append(this.#floor(v.floors[0], v.index));
        ul.append(li);
      }
      if (!visibles.some((v) => v.grouped)) this.#open = false;
      liste.replaceChildren(ul);
      vide.hidden = visibles.length > 0;
      liste.hidden = !visibles.length;
      this.#mark();
      if (focusKey) this.#button(focusKey)?.focus({ preventScroll: true });
      this.#reveal();
    }

    // un etage, ou une fiche du rez deplie (index null, k son rang dans le rez)
    #floor(f, index, k = 0) {
      const b = document.createElement("button");
      b.type = "button";
      const id = idOf(f.id);
      b.dataset.key = id === null ? `n:${index ?? `rez-${k}`}` : `id:${id}`;
      if (id === null) b.setAttribute("aria-disabled", "true");
      else b.dataset.id = id;
      const app = this.#app();
      if (app) this.#refs.set(b, id === null ? app : { ...app, fiche: id });
      this.#ids.set(b, [id]);
      const nom = String(f.name ?? f.id ?? "Fiche sans nom");
      b.title = nom;
      const etape =
        Number.isFinite(Number(f.etape)) && f.etape !== null && f.etape !== ""
          ? Number(f.etape)
          : null;
      const state = stateOf(f.state);
      b.append(
        niveau(index),
        sr(
          index === null ? "" : index === 1 ? "Rez, " : `Étage ${index - 1}, `,
        ),
        texte("nom", nom),
      );
      if (etape !== null) b.append(sr(", "), texte("etape", `étape ${etape}`));
      b.append(signe(state));
      if (state) b.append(sr(`, ${signes[state].label}`));
      if (id === null) b.append(sr(", sans fiche à ouvrir"));
      return b;
    }

    // le rez regroupe : « 4 fiches livrees » ; il porte le signe le plus grave de ses fiches et se deplie
    #rez(v) {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.key = "rez";
      b.setAttribute("aria-expanded", String(this.#open));
      b.setAttribute("aria-controls", "regroupees");
      const app = this.#app();
      if (app) this.#refs.set(b, app);
      this.#ids.set(b, v.ids.map(idOf));
      const n = v.floors.length;
      const livrees = v.floors.every((f) =>
        f.delivered === undefined
          ? f.stage === "completed"
          : Boolean(f.delivered),
      );
      const nom = `${n} fiches${livrees ? " livrées" : ""}`;
      b.title = `Rez · ${nom}`;
      const counts = {};
      for (const f of v.floors) {
        const s = stateOf(f.state);
        if (s) counts[s] = (counts[s] || 0) + 1;
      }
      const state = plusGrave(counts);
      b.append(niveau(1), sr("Rez, "), texte("nom", nom), signe(state));
      if (state) b.append(sr(`, ${signes[state].label}`));
      b.append(pli());
      return b;
    }

    #press(b) {
      if (b.dataset.key === "rez") {
        this.#open = !this.#open;
        b.setAttribute("aria-expanded", String(this.#open));
        this.#els.liste.querySelector(".regroupees").hidden = !this.#open;
        this.#mark();
        return;
      }
      const id = b.dataset.id;
      if (id === undefined) return; // l'existant : rien a ouvrir
      // marque tout de suite ; GDC confirme en renvoyant selected
      this.#selected = id;
      this.#mark();
      this.dispatchEvent(
        new CustomEvent("gdc-select", {
          detail: { id, building: this.#data.building?.id ?? null },
          bubbles: true,
          composed: true,
        }),
      );
    }

    // les boutons atteignables, dans l'ordre du batiment (du rez vers le haut)
    #visibles() {
      return [...this.#els.liste.querySelectorAll("button")].filter(
        (b) => !b.closest("[hidden]"),
      );
    }

    #button(key) {
      return this.#visibles().find((b) => b.dataset.key === key);
    }

    // aria-current sur le choisi (sur le rez replie s'il y est fondu), la marque du survol, et un seul bouton
    // atteignable par Tab : celui qui a le focus, sinon le choisi, sinon le rez qui le contient, sinon l'etage du haut
    #mark() {
      const visibles = this.#visibles();
      const sel = idOf(this.#selected);
      const rez = visibles.find((b) => b.dataset.key === "rez");
      const cache = Boolean(rez) && !this.#open && sel !== null && this.#ids.get(rez).includes(sel);
      const tab =
        visibles.find((b) => b === this.shadowRoot.activeElement) ||
        visibles.find((b) => b.dataset.id === sel) ||
        (cache ? rez : null) ||
        visibles.at(-1);
      for (const b of this.#els.liste.querySelectorAll("button")) {
        const courant = b === rez ? cache : sel !== null && b.dataset.id === sel;
        b.setAttribute("aria-current", String(courant));
        b.tabIndex = b === tab ? 0 : -1;
      }
      this.#lightUp();
    }

    // la marque du survol partage, seule : highlight change a chaque survol et ne touche ni au choix ni au focus.
    // Une fiche s'allume pour elle-meme, ses lots ou son application ; le rez regroupe et l'existant (references
    // d'application) pour l'application elle-meme ou une de leurs fiches, jamais pour une voisine (contrat, « Ce qui
    // entre : highlight », decision de PA du 22 octobre 2026).
    #lightUp() {
      const app = this.#app();
      const h = this.#highlight;
      for (const b of this.#els.liste.querySelectorAll("button")) {
        const on =
          Boolean(app && h) &&
          (sameRef(h, app) ||
            this.#ids
              .get(b)
              .some(
                (id) => id !== null && correspond(h, { ...app, fiche: id }),
              ));
        b.toggleAttribute("data-highlight", on);
      }
    }

    // en colonne, haut monte d'un etage ; en rangee, droite avance vers le haut. Debut et Fin : les deux bouts
    // de ce qu'on voit (le haut et le rez en colonne, le rez et le haut en rangee). Echap, depuis le rez ou une de ses
    // fiches, le replie.
    #move(ev) {
      const visibles = this.#visibles();
      const i = visibles.indexOf(this.shadowRoot.activeElement);
      if (i < 0) return;
      const rangee = getComputedStyle(
        this.#els.liste.firstElementChild,
      ).flexDirection.startsWith("row");
      const last = visibles.length - 1;
      const pas = { ArrowUp: 1, ArrowDown: -1, ArrowRight: 1, ArrowLeft: -1 }[
        ev.key
      ];
      let j = null;
      if (pas) j = Math.min(last, Math.max(0, i + pas));
      else if (ev.key === "Home") j = rangee ? 0 : last;
      else if (ev.key === "End") j = rangee ? last : 0;
      else if (
        ev.key === "Escape" &&
        this.#open &&
        (visibles[i].dataset.key === "rez" || visibles[i].closest(".regroupees"))
      ) {
        // le focus revient au rez avant qu'on replie : un seul gdc-hover, pas de null entre les deux
        const rez = this.#button("rez");
        ev.preventDefault();
        if (!rez) return;
        this.#focus(visibles, visibles.indexOf(rez));
        this.#press(rez);
        return;
      }
      if (j === null) return;
      ev.preventDefault();
      this.#focus(visibles, j);
    }

    #focus(visibles, j) {
      for (const b of visibles) b.tabIndex = -1;
      visibles[j].tabIndex = 0;
      visibles[j].focus({ preventScroll: true });
      this.#reveal(visibles[j]);
    }

    // ramene un bouton dans la liste, sans faire defiler la page autour
    #reveal(b = this.#visibles().find((x) => x.tabIndex === 0)) {
      if (!b) return;
      const c = this.#els.liste;
      const r = b.getBoundingClientRect();
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
      c.scrollBy({ left: dx, top: dy, behavior: calme ? "auto" : "smooth" });
    }
  }

  // les identifiants envoyes par GDC, compares en texte ; absent : null (l'existant)
  function idOf(id) {
    return id === undefined || id === null || id === "" ? null : String(id);
  }

  // un des six etats : son signe ; absent : rien a signaler ; autre valeur : « inconnu » (comme la navigation)
  function stateOf(s) {
    if (s === undefined || s === null || s === "") return null;
    return signes[s] ? s : "unknown";
  }

  // R pour le rez, puis 1, 2… ; une fiche du rez deplie n'a qu'un point
  function niveau(index) {
    const n = texte(
      "niveau",
      index === null ? "" : index === 1 ? "R" : String(index - 1),
    );
    n.setAttribute("aria-hidden", "true");
    return n;
  }

  function signe(state) {
    const s = texte("signe", "");
    if (state) s.append(signIcon(document, state));
    return s;
  }

  function texte(classe, contenu) {
    const s = document.createElement("span");
    s.className = classe;
    s.textContent = contenu;
    return s;
  }

  function sr(contenu) {
    return texte("sr", contenu);
  }

  function pli() {
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 10 10");
    svg.setAttribute("class", "pli");
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

  registry.define(meta.tag, FloorSelector);
}
