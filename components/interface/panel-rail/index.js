// Le rail d'un panneau (lot G8) : un panneau du bord (l'arbre, le fil, le planning) ferme en une bande fine qui garde
// ses badges, sa poignee pour l'ouvrir ou le replier, et le separateur qui redimensionne le planning. Fiche validee par
// Pierre-Alain le 22 octobre 2026 : un rail autonome, pose par GDC au bord de la zone du panneau (la disposition reste a
// GDC, qui masque lui-meme le panneau ferme sans le retirer) ; counts sans done.
// - Deux aspects : ferme, une bande de 40 px (icone, nom, badges), cliquable en entier ; ouvert, une lisiere de 24 px
//   au bord du panneau, avec la poignee, et le separateur quand GDC donne resize.
// - Le rail ne retient rien : il recoit open et resize, et emet gdc-toggle et gdc-resize ; GDC decide et renvoie.
// - Le bouton et le separateur sont toujours les memes noeuds : quand GDC renvoie open, le focus reste ou il etait.
// - Le cote vient de GDC (side) ; un cote inconnu dessine une bande verticale sans fleche ni separateur : aucun cote
//   n'est suppose.
// - aria-controls n'est pas utilise : il ne traverse pas la frontiere du shadow DOM. Le bouton porte le nom du panneau
//   et aria-expanded (le modele du bouton de divulgation) ; son infobulle dit « Ouvrir » ou « Replier ».
// - Telephone (moins de 600 px) : chaque rail devient un onglet ; GDC pose les rails en rangee et n'ouvre qu'un
//   panneau a la fois.

export const meta = {
  id: "panel-rail",
  version: "1.0.0",
  category: "interface",
  tag: "gdc-panel-rail",
  inputs: ["panel", "side", "open", "counts", "resize"],
  outputs: ["gdc-toggle", "gdc-resize"],
};

const SIDES = ["left", "right", "bottom"];
const ALERTES = ["error", "waiting", "blocked"]; // les cles de notification-badge, sans done
const PAS = 16; // un appui de fleche sur le separateur, en pixels

const CSS = `
:host { display: block; min-width: 0; font: 13px/1.3 var(--gdc-font-ui, system-ui, sans-serif); color: var(--gdc-ink); }
* { box-sizing: border-box; }
.rail { position: relative; display: flex; background: var(--gdc-surface); color: var(--gdc-ink);
  animation: apparait calc(var(--gdc-motion, 1) * 140ms) ease-out 1; }
@keyframes apparait { from { opacity: .4; } to { opacity: 1; } }
/* vertical (gauche, droite, ou cote inconnu) : une colonne ; horizontal (bas) : une rangee */
.rail[data-orientation="vertical"] { flex-direction: column; height: 100%; width: 40px; }
.rail[data-orientation="horizontal"] { flex-direction: row; width: 100%; height: 40px; }
.rail[data-open="true"][data-orientation="vertical"] { width: 24px; }
.rail[data-open="true"][data-orientation="horizontal"] { height: 24px; }
/* le trait contre le panneau, ou contre la carte quand il est ferme */
.rail[data-side="left"] { border-right: 1px solid var(--trait); }
.rail[data-side="right"] { border-left: 1px solid var(--trait); }
.rail[data-side="bottom"] { border-top: 1px solid var(--trait); }
.rail[data-side="none"] { border-inline: 1px dashed var(--trait); }
.rail { --trait: color-mix(in srgb, var(--gdc-ink) 16%, transparent); }

button { display: flex; align-items: center; gap: 8px; margin: 0; padding: 0; border: 0; border-radius: 0;
  background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; }
button:hover, .separateur:hover { background: color-mix(in srgb, var(--gdc-ink) 7%, transparent); }
button:focus-visible, .separateur:focus-visible { outline: 2px solid var(--gdc-ink); outline-offset: -2px; }
/* ferme : le bouton est toute la bande */
.rail[data-open="false"] button { flex: 1 1 auto; min-width: 0; min-height: 0; }
.rail[data-open="false"][data-orientation="vertical"] button { flex-direction: column; justify-content: flex-start; padding: 10px 0; }
.rail[data-open="false"][data-orientation="horizontal"] button { padding: 0 12px; }
/* ouvert : la poignee seule, une cible de 24 x 40 px au bout de la lisiere */
.rail[data-open="true"] button { flex: none; justify-content: center; }
.rail[data-open="true"][data-orientation="vertical"] button { width: 24px; height: 40px; }
.rail[data-open="true"][data-orientation="horizontal"] button { width: 40px; height: 24px; }
.rail[data-open="true"] :is(.icone, gdc-notification-badge) { display: none; }

.chevron, .icone { flex: none; display: inline-grid; place-items: center; width: 16px; height: 16px; color: var(--gdc-muted); }
.icone { color: var(--gdc-ink); }
.icone:empty { display: none; }
.chevron svg, .icone svg { width: 16px; height: 16px; }
/* la fleche montre ou va le panneau : vers la carte pour l'ouvrir, vers le bord pour le replier */
.chevron { transform: rotate(var(--angle, 0deg)); }
.rail[data-side="left"] { --angle: 0deg; }
.rail[data-side="right"] { --angle: 180deg; }
.rail[data-side="bottom"] { --angle: -90deg; }
.rail[data-open="true"][data-side="left"] { --angle: 180deg; }
.rail[data-open="true"][data-side="right"] { --angle: 0deg; }
.rail[data-open="true"][data-side="bottom"] { --angle: 90deg; }
.rail[data-side="none"] .chevron { display: none; }

.nom { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
.rail[data-open="false"][data-orientation="vertical"] .nom { writing-mode: vertical-rl; flex: 0 1 auto; max-height: 100%; }
/* ouvert, le nom reste dans le bouton pour les lecteurs d'ecran, sans prendre de place */
.rail[data-open="true"] .nom { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
/* le badge d'une bande verticale deborde vers la carte quand le nombre s'allonge */
.rail[data-orientation="vertical"] gdc-notification-badge { align-self: center; }
/* dans une bande verticale fermee, le badge passe avant le nom, pres du haut : une decision qui attend se voit d'abord */
.rail[data-open="false"][data-orientation="vertical"] gdc-notification-badge { order: 1; }
.rail[data-open="false"][data-orientation="vertical"] .nom { order: 2; }
.rail:is([data-side="left"], [data-side="none"]) gdc-notification-badge { align-self: flex-start; margin-left: 4px; }
.rail[data-side="right"] gdc-notification-badge { align-self: flex-end; margin-right: 4px; }

/* le separateur : le reste de la lisiere, qu'on tire ; un repere de prise au milieu */
.separateur { flex: 1 1 auto; position: relative; display: grid; place-items: center; touch-action: none; }
.rail[data-orientation="vertical"] .separateur { cursor: col-resize; }
.rail[data-orientation="horizontal"] .separateur { cursor: row-resize; }
.prise { display: block; border-radius: 2px; background: var(--gdc-muted); } /* 3:1 au moins contre la surface, dans les deux themes (WCAG 1.4.11) */
.rail[data-orientation="vertical"] .prise { width: 4px; height: 28px; }
.rail[data-orientation="horizontal"] .prise { width: 28px; height: 4px; }
.separateur[data-actif] .prise { background: var(--gdc-ink); }
[hidden] { display: none !important; }

/* telephone : chaque rail est un onglet de la rangee que GDC pose ; un seul panneau ouvert, pas de separateur.
   Les selecteurs portent [data-orientation][data-open] : aussi precis que ceux du bureau, ils passent apres eux. */
@media (max-width: 600px) {
  .rail[data-orientation][data-open] { flex-direction: row; width: 100%; height: 40px; border: 0;
    border-bottom: 2px solid transparent; }
  .rail[data-orientation][data-open="true"] { border-bottom-color: var(--gdc-ink); }
  .rail[data-orientation][data-open] button { flex: 1 1 auto; flex-direction: row; justify-content: center; width: auto;
    min-width: 0; height: 40px; padding: 0 4px; gap: 4px; }
  .rail[data-orientation][data-open] .nom { order: 0; position: static; width: auto; height: auto; clip: auto;
    writing-mode: horizontal-tb;
    /* deux lignes dans les 40 px de l'onglet, plutot qu'un nom coupe */
    white-space: normal; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-height: 1.15; }
  /* l'onglet garde le nom et le badge ; l'icone laisse sa place au nom, plus parlant a cette largeur */
  .rail[data-orientation][data-open] .icone { display: none; }
  .rail[data-orientation][data-open] gdc-notification-badge { display: inline-flex; order: 0; align-self: center; margin: 0; }
  .rail[data-orientation][data-open] :is(.chevron, .separateur) { display: none; }
}
`;

// Les icones des trois panneaux, au trait dans un carre de 16 (comme le lot G7) ; [balise, attributs].
const ICONES = {
  // l'arbre : un tronc et ses branches
  tree: [
    ["path", { d: "M3 3.5h4M5 3.5v9h3M5 8h3" }],
    ["rect", { x: 9.5, y: 6.5, width: 4, height: 3, rx: 0.8 }],
    ["rect", { x: 9.5, y: 11, width: 4, height: 3, rx: 0.8 }],
  ],
  // le fil : trois actions, une puce et sa ligne
  feed: [
    ["circle", { cx: 3.5, cy: 4, r: 1 }],
    ["circle", { cx: 3.5, cy: 8, r: 1 }],
    ["circle", { cx: 3.5, cy: 12, r: 1 }],
    ["path", { d: "M6.5 4h7M6.5 8h7M6.5 12h5" }],
  ],
  // le planning : trois barres en escalier
  schedule: [
    ["path", { d: "M2.5 4h5.5M5.5 8h6M9 12h4.5", "stroke-width": 2.2 }],
  ],
};
const CHEVRON = [
  ["path", { d: "M6 3.5 10.5 8 6 12.5", "stroke-linejoin": "round" }],
];

export function define(registry, ctx) {
  const NS = "http://www.w3.org/2000/svg";

  // un dessin au trait, decoratif ; currentColor : la couleur du texte
  function dessin(primitives) {
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    for (const [balise, attrs] of primitives) {
      const n = document.createElementNS(NS, balise);
      for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
      Object.assign(n.style, {
        fill: "none",
        stroke: "currentColor",
        strokeWidth:
          n.style.strokeWidth || String(attrs["stroke-width"] ?? 1.5),
        strokeLinecap: "round",
      });
      svg.append(n);
    }
    return svg;
  }

  // un nombre d'alertes : entier positif, sinon 0 (comme notification-badge)
  function nombre(v) {
    if (typeof v === "string" && v.trim() !== "") v = Number(v);
    return typeof v === "number" && Number.isFinite(v) && v > 0
      ? Math.floor(v)
      : 0;
  }

  function fini(v) {
    return typeof v === "number" && Number.isFinite(v);
  }

  class PanelRail extends HTMLElement {
    #data = {};
    #els = {};
    #taille = null; // la taille montree : celle de GDC, ou celle du pointeur pendant un glissement, jamais au-dela
    #glisse = null; // le glissement en cours : { pointeur, depart, taille }
    #image = 0; // l'image d'animation qui emettra la taille demandee pendant un glissement

    constructor() {
      super();
      const root = this.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = CSS;
      const rail = document.createElement("div");
      rail.className = "rail";
      const bouton = document.createElement("button");
      bouton.type = "button";
      const chevron = span("chevron");
      chevron.append(dessin(CHEVRON));
      const icone = span("icone");
      const nom = span("nom");
      const badge = document.createElement("gdc-notification-badge");
      bouton.append(chevron, icone, nom, badge);
      const separateur = document.createElement("div");
      separateur.className = "separateur";
      separateur.setAttribute("role", "separator");
      separateur.tabIndex = 0;
      separateur.append(span("prise"));
      rail.append(bouton, separateur);
      root.append(style, rail);
      Object.assign(this.#els, { rail, bouton, icone, nom, badge, separateur });

      bouton.addEventListener("click", () => this.#toggle());
      separateur.addEventListener("keydown", (ev) => this.#touche(ev));
      separateur.addEventListener("pointerdown", (ev) => this.#saisit(ev));
      separateur.addEventListener("pointermove", (ev) => this.#tire(ev));
      separateur.addEventListener("pointerup", (ev) => this.#lache(ev));
      separateur.addEventListener("pointercancel", (ev) => this.#lache(ev));
    }

    get data() {
      return this.#data;
    }
    set data(value) {
      this.#data = value && typeof value === "object" ? value : {};
      // pendant un glissement, la taille suit le pointeur ; GDC la confirmera au relachement
      if (!this.#glisse) this.#taille = this.#bornes()?.size ?? null;
      this.#render();
    }

    #side() {
      return SIDES.includes(this.#data.side) ? this.#data.side : null;
    }

    #ouvert() {
      return this.#data.open === true;
    }

    // { size, min, max } en pixels, ou null : sans resize valide, pas de separateur ; size est ramene entre min et max
    #bornes() {
      const r = this.#data.resize;
      if (
        !r ||
        typeof r !== "object" ||
        !fini(r.min) ||
        !fini(r.max) ||
        r.max < r.min
      )
        return null;
      const size = fini(r.size) ? r.size : r.min;
      return {
        min: r.min,
        max: r.max,
        size: Math.min(r.max, Math.max(r.min, size)),
      };
    }

    #render() {
      const { rail, bouton, icone, nom, badge, separateur } = this.#els;
      const panel =
        this.#data.panel && typeof this.#data.panel === "object"
          ? this.#data.panel
          : {};
      const side = this.#side();
      const ouvert = this.#ouvert();
      const vertical = side !== "bottom";
      const nomPanneau = String(panel.name ?? "Panneau");
      rail.dataset.side = side ?? "none";
      rail.dataset.orientation = vertical ? "vertical" : "horizontal";
      rail.dataset.open = String(ouvert);

      // le bouton : le nom du panneau et son etat (aria-expanded) ; l'infobulle dit ce que fait un clic
      nom.textContent = nomPanneau;
      bouton.setAttribute("aria-expanded", String(ouvert));
      bouton.title = `${ouvert ? "Replier" : "Ouvrir"} : ${nomPanneau}`;
      const dessinIcone = Object.hasOwn(ICONES, panel.icon)
        ? ICONES[panel.icon]
        : null;
      if (icone.dataset.icon !== String(panel.icon ?? "")) {
        icone.dataset.icon = String(panel.icon ?? "");
        icone.replaceChildren(...(dessinIcone ? [dessin(dessinIcone)] : []));
      }

      // les badges : les alertes seulement, jamais « Valide » sur un rail ; masques a zero par le badge lui-meme
      const counts =
        this.#data.counts && typeof this.#data.counts === "object"
          ? this.#data.counts
          : {};
      badge.data = {
        counts: Object.fromEntries(ALERTES.map((s) => [s, nombre(counts[s])])),
      };

      // le separateur : seulement ouvert, avec resize, sur un cote connu
      const bornes = this.#bornes();
      const avecSeparateur = ouvert && Boolean(bornes) && side !== null;
      if (!avecSeparateur && this.shadowRoot.activeElement === separateur)
        bouton.focus({ preventScroll: true });
      separateur.hidden = !avecSeparateur;
      if (avecSeparateur) {
        separateur.setAttribute(
          "aria-orientation",
          vertical ? "vertical" : "horizontal",
        );
        separateur.setAttribute(
          "aria-label",
          `${vertical ? "Largeur" : "Hauteur"} : ${nomPanneau}`,
        );
        separateur.setAttribute(
          "aria-valuemin",
          String(Math.round(bornes.min)),
        );
        separateur.setAttribute(
          "aria-valuemax",
          String(Math.round(bornes.max)),
        );
        separateur.setAttribute(
          "aria-valuenow",
          String(Math.round(this.#taille ?? bornes.size)),
        );
        separateur.title = `Tirer pour ${vertical ? "élargir" : "agrandir"} ; Entrée replie`;
      } else this.#arrete();
    }

    #toggle(open = !this.#ouvert()) {
      this.dispatchEvent(
        new CustomEvent("gdc-toggle", {
          detail: { id: this.#data.panel?.id ?? null, open },
          bubbles: true,
          composed: true,
        }),
      );
    }

    // demande une taille, bornee : emise si elle differe de celle de GDC, jamais gardee ; GDC la renvoie s'il l'accepte
    #demande(size) {
      const b = this.#bornes();
      if (!b) return;
      const t = Math.round(Math.min(b.max, Math.max(b.min, size)));
      if (t !== b.size) this.#emetTaille(t);
    }

    #emetTaille(size) {
      this.dispatchEvent(
        new CustomEvent("gdc-resize", {
          detail: { id: this.#data.panel?.id ?? null, size },
          bubbles: true,
          composed: true,
        }),
      );
    }

    // le sens qui agrandit : vers la carte (droite pour un panneau a gauche, gauche a droite, haut en bas)
    #sens() {
      return { left: 1, right: -1, bottom: -1 }[this.#side()] ?? 0;
    }

    // les fleches du sens du separateur, Debut et Fin pour les bornes, Entree pour replier (separateur de fenetre ARIA)
    #touche(ev) {
      const b = this.#bornes();
      if (!b) return;
      const actuel = b.size;
      const vertical = this.#side() !== "bottom";
      const fleches = vertical
        ? { ArrowRight: 1, ArrowLeft: -1 }
        : { ArrowDown: 1, ArrowUp: -1 };
      if (ev.key in fleches)
        this.#demande(actuel + fleches[ev.key] * this.#sens() * PAS);
      else if (ev.key === "Home") this.#demande(b.min);
      else if (ev.key === "End") this.#demande(b.max);
      else if (ev.key === "Enter") this.#toggle(false);
      else return;
      ev.preventDefault();
    }

    #saisit(ev) {
      const b = this.#bornes();
      if (!b || ev.button !== 0) return;
      ev.preventDefault();
      this.#els.separateur.focus({ preventScroll: true });
      this.#els.separateur.setPointerCapture(ev.pointerId);
      this.#els.separateur.toggleAttribute("data-actif", true);
      const vertical = this.#side() !== "bottom";
      this.#glisse = {
        pointeur: ev.pointerId,
        depart: vertical ? ev.clientX : ev.clientY,
        taille: b.size,
        demandee: null,
      };
    }

    // pendant le glissement : la taille suit le pointeur, emise au plus une fois par image
    #tire(ev) {
      const g = this.#glisse;
      if (!g || ev.pointerId !== g.pointeur) return;
      const b = this.#bornes();
      if (!b) return;
      const vertical = this.#side() !== "bottom";
      const delta = (vertical ? ev.clientX : ev.clientY) - g.depart;
      const t = Math.round(
        Math.min(b.max, Math.max(b.min, g.taille + delta * this.#sens())),
      );
      if (t === this.#taille) return;
      this.#taille = t;
      this.#els.separateur.setAttribute("aria-valuenow", String(t));
      if (!this.#image)
        this.#image = requestAnimationFrame(() => {
          this.#image = 0;
          if (this.#glisse) {
            this.#glisse.demandee = this.#taille;
            this.#emetTaille(this.#taille);
          }
        });
    }

    // au relachement : une derniere fois, si la taille a change depuis la derniere emission ; puis le rail reprend la
    // taille de GDC (deja renvoyee s'il l'a acceptee) : il ne garde rien
    #lache(ev) {
      const g = this.#glisse;
      if (!g || ev.pointerId !== g.pointeur) return;
      const derniere = g.demandee ?? g.taille;
      this.#arrete();
      if (this.#taille !== null && this.#taille !== derniere)
        this.#emetTaille(this.#taille);
      const b = this.#bornes();
      this.#taille = b?.size ?? null;
      if (b) this.#els.separateur.setAttribute("aria-valuenow", String(Math.round(b.size)));
    }

    #arrete() {
      if (this.#image) cancelAnimationFrame(this.#image);
      this.#image = 0;
      const g = this.#glisse;
      this.#glisse = null;
      const s = this.#els.separateur;
      s.removeAttribute("data-actif");
      if (g && s.hasPointerCapture(g.pointeur))
        s.releasePointerCapture(g.pointeur);
    }
  }

  function span(classe) {
    const s = document.createElement("span");
    s.className = classe;
    return s;
  }

  registry.define(meta.tag, PanelRail);
}
