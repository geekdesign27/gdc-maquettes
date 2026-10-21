// La navigation (lot G6) : aller a un lieu, un batiment, une fiche ou un agent ; GDC fait suivre la camera.
// Brief valide par Pierre-Alain le 21 octobre 2026. Liste groupee avec signe d'etat et recherche ; sur telephone,
// une rangee de pastilles qui defile de cote. Un seul arret de tabulation pour toute la liste (tabindex mobile).

export const meta = {
  id: "side-nav",
  version: "1.0.0",
  category: "interface",
  tag: "gdc-side-nav",
  inputs: ["groups", "selected"],
  outputs: ["gdc-select"],
};

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
input:focus-visible, button:focus-visible { outline: 2px solid var(--gdc-ink); outline-offset: 2px; }
.liste { position: relative; flex: 1 1 auto; min-height: 0; overflow: auto; padding: 0 6px 10px; scrollbar-width: thin; }
.groupe { margin: 0; }
.titre { display: flex; justify-content: space-between; margin: 12px 8px 4px; font: 600 11px/1.3 var(--gdc-font-ui, system-ui, sans-serif);
  text-transform: uppercase; letter-spacing: .06em; color: var(--gdc-muted); }
.titre .nb { font-variant-numeric: tabular-nums; }
ul { list-style: none; margin: 0; padding: 0; }
button { display: flex; align-items: center; gap: 8px; width: 100%; min-height: 40px; padding: 6px 8px 6px 10px; border: 0; border-radius: 8px;
  background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; position: relative; }
button:hover { background: color-mix(in srgb, var(--gdc-ink) 7%, transparent); }
button[aria-current="true"] { background: color-mix(in srgb, var(--gdc-ink) 11%, transparent); font-weight: 600; }
button[aria-current="true"]::before { content: ''; position: absolute; left: 2px; top: 8px; bottom: 8px; width: 3px; border-radius: 2px; background: var(--gdc-ink); }
.signe { flex: none; display: inline-grid; place-items: center; width: 16px; height: 16px; }
.nom { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vide { margin: 12px 8px; color: var(--gdc-muted); }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
[hidden] { display: none !important; }
/* telephone : une rangee de pastilles qui defile de cote ; un separateur entre les groupes. Selon l'ecran et non
   selon le panneau : une navigation laterale est etroite par nature, elle ne devient une rangee que sur un telephone. */
@media (max-width: 600px) {
  .recherche { padding: 8px 8px 6px; }
  .recherche svg { left: 18px; }
  .liste { display: flex; flex: none; overflow-x: auto; overflow-y: hidden; padding: 2px 8px 8px; gap: 0; }
  .groupe { display: flex; flex: none; align-items: center; }
  .groupe + .groupe { margin-left: 6px; padding-left: 6px; border-left: 1px solid color-mix(in srgb, var(--gdc-ink) 18%, transparent); }
  .titre { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); margin: 0; }
  ul { display: flex; gap: 6px; }
  li { flex: none; }
  button { width: auto; max-width: 220px; padding: 6px 12px; border-radius: 20px; border: 1px solid color-mix(in srgb, var(--gdc-ink) 16%, transparent); }
  button[aria-current="true"] { background: var(--gdc-ink); color: var(--gdc-surface); border-color: var(--gdc-ink); }
  button[aria-current="true"]::before { display: none; }
  .vide { margin: 8px; white-space: nowrap; }
}
`;

export function define(registry, ctx) {
  const { signes, signIcon } = ctx;

  class SideNav extends HTMLElement {
    #data = {};
    #selected = null;
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
      input.placeholder = "Lieu, fiche, agent…";
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
      Object.assign(this.#els, { input, liste, vide, annonce });

      input.addEventListener("input", () => this.#filter());
      input.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape" && input.value) {
          ev.preventDefault();
          input.value = "";
          this.#filter();
        } else if (ev.key === "ArrowDown") {
          ev.preventDefault();
          this.#visibles()[0]?.focus();
        }
      });
      liste.addEventListener("click", (ev) => {
        const b = ev.target.closest("button[data-id]");
        if (b) this.#choose(b.dataset.id);
      });
      liste.addEventListener("keydown", (ev) => this.#move(ev));
    }

    connectedCallback() {
      // la mise en page n'existe qu'une fois dans la page : on y ramene l'element choisi
      requestAnimationFrame(() => this.#reveal());
    }

    get data() {
      return this.#data;
    }
    set data(value) {
      this.#data = value && typeof value === "object" ? value : {};
      this.#selected = this.#data.selected ?? null;
      this.#render();
    }

    #choose(id) {
      // marque tout de suite ; GDC confirme en renvoyant selected
      this.#selected = id;
      this.#mark();
      this.dispatchEvent(
        new CustomEvent("gdc-select", {
          detail: { id },
          bubbles: true,
          composed: true,
        }),
      );
    }

    #render() {
      const { liste, vide } = this.#els;
      const focusId = this.shadowRoot.activeElement?.dataset?.id;
      const groups = Array.isArray(this.#data.groups) ? this.#data.groups : [];
      const sections = [];
      for (const g of groups) {
        const items = Array.isArray(g?.items)
          ? g.items.filter((i) => i && i.id != null)
          : [];
        if (!items.length) continue;
        const section = document.createElement("section");
        section.className = "groupe";
        const titre = document.createElement("h3");
        titre.className = "titre";
        const t = document.createElement("span");
        t.textContent = String(g.title ?? "Sans titre");
        const nb = document.createElement("span");
        nb.className = "nb";
        titre.append(t, nb);
        const ul = document.createElement("ul");
        ul.setAttribute("aria-label", t.textContent);
        for (const item of items) ul.append(this.#item(item));
        section.append(titre, ul);
        sections.push(section);
      }
      liste.replaceChildren(...sections, vide);
      this.#filter();
      if (focusId) this.#button(focusId)?.focus();
      this.#reveal();
    }

    #item(item) {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.id = String(item.id);
      const nom = String(item.name ?? item.id);
      b.dataset.cherche = plat(nom + " " + item.id);
      const signe = document.createElement("span");
      signe.className = "signe";
      // un des six etats : son signe ; absent : rien a signaler ; autre valeur : « inconnu » (fiche side-nav)
      const absent =
        item.state === undefined || item.state === null || item.state === "";
      const state = absent ? null : signes[item.state] ? item.state : "unknown";
      if (state) signe.append(signIcon(document, state));
      const n = document.createElement("span");
      n.className = "nom";
      n.textContent = nom;
      b.title = nom;
      b.append(signe, n);
      if (state) {
        const lu = document.createElement("span");
        lu.className = "sr";
        lu.textContent = `, ${signes[state].label}`;
        b.append(lu);
      }
      li.append(b);
      return li;
    }

    #filter() {
      const { input, liste, vide, annonce } = this.#els;
      const q = plat(input.value.trim());
      let total = 0;
      for (const section of liste.querySelectorAll(".groupe")) {
        let n = 0;
        for (const b of section.querySelectorAll("button")) {
          const ok = !q || b.dataset.cherche.includes(q);
          b.parentElement.hidden = !ok;
          if (ok) n += 1;
        }
        section.hidden = n === 0;
        section.querySelector(".nb").textContent = String(n);
        total += n;
      }
      vide.hidden = total > 0;
      vide.textContent = q
        ? `Aucun résultat pour « ${input.value.trim()} »`
        : "Rien à afficher";
      annonce.textContent = q
        ? `${total} ${total <= 1 ? "résultat" : "résultats"}`
        : "";
      this.#mark();
    }

    #visibles() {
      return [
        ...this.#els.liste.querySelectorAll("li:not([hidden]) > button"),
      ].filter((b) => !b.closest(".groupe").hidden);
    }

    #button(id) {
      return [...this.#els.liste.querySelectorAll("button[data-id]")].find(
        (b) => b.dataset.id === String(id),
      );
    }

    // aria-current sur le choisi ; un seul bouton atteignable par Tab : le choisi s'il est visible, sinon le premier
    #mark() {
      const visibles = this.#visibles();
      const cible =
        visibles.find((b) => b.dataset.id === String(this.#selected)) ||
        visibles[0];
      for (const b of this.#els.liste.querySelectorAll("button[data-id]")) {
        b.setAttribute(
          "aria-current",
          String(
            this.#selected != null && b.dataset.id === String(this.#selected),
          ),
        );
        b.tabIndex = b === cible ? 0 : -1;
      }
    }

    #move(ev) {
      const visibles = this.#visibles();
      const i = visibles.indexOf(this.shadowRoot.activeElement);
      if (i < 0) return;
      const pas = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[
        ev.key
      ];
      let j = null;
      if (pas) j = Math.min(visibles.length - 1, Math.max(0, i + pas));
      else if (ev.key === "Home") j = 0;
      else if (ev.key === "End") j = visibles.length - 1;
      if (j === null) return;
      ev.preventDefault();
      for (const b of visibles) b.tabIndex = -1;
      visibles[j].tabIndex = 0;
      visibles[j].focus({ preventScroll: true });
      this.#reveal(visibles[j]);
    }

    // ramene un bouton dans la liste, sans faire defiler la page autour
    #reveal(b = this.#button(this.#selected)) {
      if (!b || b.parentElement.hidden) return;
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

  function loupe() {
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("aria-hidden", "true");
    const p = document.createElementNS(NS, "path");
    p.setAttribute(
      "d",
      "M7 2.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9ZM10.4 10.4 14 14",
    );
    Object.assign(p.style, {
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.5",
      strokeLinecap: "round",
    });
    svg.append(p);
    return svg;
  }

  registry.define(meta.tag, SideNav);
}
