// La page de demonstration des elements d'interface (lot G6) : chaque element dans ses variantes, en clair
// et en sombre, avec moins d'animation, a la largeur d'un telephone. Outil de fabrication : pas livre a GDC.
import catalogue from "../catalogue.json" with { type: "json" };
import { defineElements, elements, interfaceContext } from "./interface.js";

defineElements();
const $ = (id) => document.getElementById(id);
const el = (balise, attrs = {}, texte) => {
  const n = document.createElement(balise);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (texte !== undefined) n.textContent = texte;
  return n;
};

// Les variantes montrees pour chaque element : { titre, data }. Les donnees suivent la fiche du catalogue.
const minutes = (n) => new Date(Date.now() - n * 60000).toISOString();
export const variantes = {
  "top-bar": [
    {
      titre: "Données fraîches, deux décisions",
      data: {
        project: "Application de bureau",
        decisions: 2,
        agents: { active: 3, blocked: 1, unknown: 1 },
        updatedAt: minutes(1),
        staleAfter: 600,
      },
    },
    {
      titre: "Données anciennes, rien n'attend",
      data: {
        project: "Application de bureau",
        decisions: 0,
        agents: { active: 0, blocked: 0, unknown: 4 },
        updatedAt: minutes(42),
        staleAfter: 600,
      },
    },
    {
      titre: "Nom très long, données absentes",
      data: {
        project:
          "Refonte complète du portail des fournisseurs et de la facturation",
      },
    },
  ],
  // la navigation : le plan du projet-type (fixtures/projet-type), a l'etape de la construction
  "side-nav": [
    {
      titre: "Le chantier, une application choisie",
      style: "height: 420px; max-width: 300px",
      data: {
        selected: "bureau",
        groups: [
          {
            title: "Les lieux",
            items: [
              { id: "bureau-architecte", name: "Le bureau d'architecte" },
              { id: "bureau-etudes", name: "Le bureau d'études", state: "active" },
              { id: "bureau-client", name: "Le bureau du client", state: "waiting" },
              { id: "bureau-controle", name: "Le bureau de contrôle", state: "error" },
              { id: "baraque", name: "La baraque du conducteur de travaux", state: "active" },
              { id: "chantier", name: "Le chantier, une parcelle par application" },
              { id: "parking", name: "Le parking, le carnet des demandes" },
              { id: "aire-reception", name: "L'aire de réception" },
            ],
          },
          {
            title: "Les bâtiments",
            items: [{ id: "bureau", name: "Application de bureau", state: "active" }],
          },
          {
            title: "Les fiches",
            items: [
              { id: "001-cloturer-un-audit", name: "Clôturer un audit", state: "active" },
              { id: "002-signer-le-rapport", name: "Signer le rapport", state: "done" },
            ],
          },
          {
            title: "Les agents",
            items: [
              { id: "claire", name: "Claire, architecte", state: "active" },
              { id: "lina", name: "Lina, ingénieure", state: "blocked" },
              { id: "victor", name: "Victor", state: "dormant" },
            ],
          },
        ],
      },
    },
    { titre: "Sans données", style: "height: 160px; max-width: 300px", data: {} },
  ],
  "copy-button": [
    { titre: "Un nom : copie « Le bureau d'études (bureau-etudes) »", data: { id: "bureau-etudes", text: "Le bureau d'études" } },
    { titre: "Un prompt qui cite déjà l'identifiant : copié tel quel", data: { id: "001-cloturer-un-audit", text: "Relis la fiche 001-cloturer-un-audit et liste ce qui manque." } },
    { titre: "L'identifiant seul", data: { id: "lina" } },
    { titre: "Sans identifiant : désactivée", data: { text: "Rien" } },
  ],
  // la barre de progression : les regles du projet-type (fixtures/projet-type)
  "progress-bar": [
    { titre: "Fiche en cours : 3 / 7", style: "max-width: 360px", data: { done: 3, total: 7, rule: "3 critères d'acceptation prouvés sur 7", state: "active" } },
    { titre: "Dossier complet", style: "max-width: 360px", data: { done: 15, total: 15, rule: "15 pièces complètes sur 15", state: "done" } },
    { titre: "Lot bloqué", style: "max-width: 360px", data: { done: 2, total: 5, rule: "2 tâches finies sur 5", state: "blocked" } },
    { titre: "Plus que prévu : les vrais nombres", style: "max-width: 360px", data: { done: 9, total: 7, rule: "9 critères prouvés pour 7 attendus" } },
    { titre: "Sans règle", style: "max-width: 360px", data: { done: 1, total: 4 } },
    { titre: "Sans total : inconnu", style: "max-width: 360px", data: { done: 2, state: "unknown" } },
  ],
  // le badge, pose sur la scene : terre du socle, gazon, asphalte (couleurs du monde, src/palette.json)
  "notification-badge": [
    { titre: "Une décision et deux erreurs : le rouge de la décision, total 3", fond: "#BF8B65", data: { counts: { waiting: 1, error: 2, blocked: 0, done: 4 } } },
    { titre: "Deux erreurs et un blocage : l'octogone, total 3", fond: "#83A78F", data: { counts: { error: 2, blocked: 1 } } },
    { titre: "Bloqué seul", fond: "#6C6674", data: { counts: { blocked: 1 } } },
    { titre: "Tout est validé : la coche, sans nombre", fond: "#BF8B65", data: { counts: { done: 6 } } },
    { titre: "Beaucoup d'alertes", fond: "#83A78F", data: { counts: { waiting: 12, error: 87, blocked: 29 } } },
    { titre: "Tout à zéro : masqué (rien ci-dessous)", data: { counts: { waiting: 0, error: 0, blocked: 0, done: 0 } } },
  ],
  // l'inspecteur : une fiche du projet-type, avec du texte piege qui doit rester du texte
  inspector: [
    {
      titre: "Une fiche, avec du texte piégé",
      style: "height: 520px; max-width: 380px",
      data: {
        id: "001-cloturer-un-audit",
        kind: "Fiche",
        title: "Clôturer un audit",
        sections: [
          { title: "Avancement", rows: [
            { label: "Critères prouvés", value: "3 / 7" },
            { label: "Bâtiment", value: "Application de bureau", ref: "bureau" },
            { label: "Agent", value: "Lina, ingénieure", state: "blocked", ref: "lina" },
          ] },
          { title: "Tâches", rows: [
            { label: "Écrire la fiche", value: "faite", state: "done" },
            { label: "Construire l'export", value: "en cours", state: "active" },
            { label: "Relire le rapport", value: "pas de nouvelles", state: "unknown" },
          ] },
          { title: "Blocages", rows: [
            { label: "Essai rouge", value: "Le test d'export échoue : <img src=x onerror=\"alert('injecté')\"> <b>gras</b>", state: "error" },
          ] },
          { title: "Réussites", rows: [] },
          { title: "Actions attendues", rows: [{ label: "Ta décision", value: "Valider le rapport d'audit", state: "waiting", ref: "bureau-client" }] },
        ],
      },
    },
    { titre: "Sans données", style: "height: 180px; max-width: 380px", data: {} },
  ],
  // les actions rapides : des prompts pour une fiche ; le troisieme ne cite pas l'identifiant, « (id) » est ajoute
  "quick-actions": [
    {
      titre: "Trois prompts pour une fiche",
      style: "max-width: 420px",
      data: {
        id: "001-cloturer-un-audit",
        actions: [
          { label: "Relire la fiche", prompt: "Relis la fiche 001-cloturer-un-audit et liste les critères d'acceptation qui ne sont pas encore prouvés." },
          { label: "Débloquer l'essai rouge", prompt: "L'essai d'export de 001-cloturer-un-audit échoue : trouve la cause et propose une correction, sans rien modifier." },
          { label: "Résumer pour le client", prompt: "Résume en cinq lignes, pour le client, où en est cette fiche." },
        ],
      },
    },
    { titre: "Sans actions", style: "max-width: 420px", data: { id: "bureau-etudes", actions: [] } },
    { titre: "Sans identifiant", style: "max-width: 420px", data: { actions: [{ label: "x", prompt: "y" }] } },
  ],
};

const journal = [];
const note = (ok, texte) => journal.push([ok, texte]);

function sectionPolices() {
  const s = el("section", { id: "fonts" });
  s.append(
    el("h2", {}, "Les polices"),
    el(
      "p",
      {},
      "Manrope pour les titres, Inter pour l'interface, JetBrains Mono pour les identifiants. Intégrées à la bibliothèque, aucune requête extérieure.",
    ),
  );
  const c = el("div", { class: "cadre specimen" });
  const ligne = (famille, graisse, texte) => {
    const p = el("p", {}, texte);
    p.style.font = `${graisse} 16px/1.4 var(--gdc-font-${famille})`;
    return p;
  };
  c.append(
    ligne(
      "title",
      700,
      "Manrope 700 : Le bureau d'études attend ta décision « Écrire la fiche ».",
    ),
    ligne(
      "title",
      500,
      "Manrope 500 : Œuvre, cœur, déjà, ça, garçon, 1 234,50 €.",
    ),
    ligne(
      "ui",
      400,
      "Inter 400 : 3 / 7 critères prouvés, mis à jour il y a 2 min.",
    ),
    ligne("ui", 600, "Inter 600 : Agents actifs, bloqués, inconnus."),
    ligne(
      "mono",
      400,
      "JetBrains Mono : 001-cloturer-un-audit · bureau-architecte · 0O 1lI",
    ),
  );
  s.append(c);
  return s;
}

function sectionSignes() {
  const s = el("section", { id: "signes" });
  s.append(
    el("h2", {}, "La signalétique"),
    el(
      "p",
      {},
      "Couleur, forme et icône de chaque état (docs/signaletique.md), injectées dans les éléments.",
    ),
  );
  const c = el("div", { class: "cadre signes" });
  for (const [state, signe] of Object.entries(interfaceContext.signes)) {
    const d = el("div", { class: "signe" });
    d.append(
      interfaceContext.signIcon(document, state, 24),
      el("span", {}, signe.label),
    );
    c.append(d);
  }
  s.append(c);
  return s;
}

function sectionElement(entry) {
  const s = el("section", { id: entry.id });
  s.append(
    el("h2", {}, `${entry.name} — <gdc-${entry.id}>`),
    el("p", {}, entry.purpose),
  );
  const mod = elements[entry.id];
  if (!mod) {
    s.append(el("p", {}, "Pas encore fabriqué."));
    return s;
  }
  for (const v of variantes[entry.id] || [
    { titre: "Sans données", data: {} },
  ]) {
    const d = el("div", { class: "variante" });
    const n = document.createElement(mod.meta.tag);
    n.data = v.data;
    if (v.style) n.setAttribute("style", v.style);
    // fond : pour voir un badge pose sur la scene (sol ou ciel), pas sur la surface de l'interface
    if (v.fond) {
      const f = el("div", { style: `display: inline-flex; gap: 12px; padding: 18px 24px; border-radius: 8px; background: ${v.fond}` });
      f.append(n);
      d.append(el("h3", {}, v.titre), f);
    } else d.append(el("h3", {}, v.titre), n);
    s.append(d);
    // controle en direct : l'element s'est-il construit, et n'emet-il que les evenements de sa fiche ?
    queueMicrotask(() =>
      note(
        Boolean(n.shadowRoot && n.shadowRoot.childElementCount),
        `${mod.meta.tag} « ${v.titre} » : rendu`,
      ),
    );
    for (const e of ["gdc-select", "gdc-copy", "gdc-close"]) {
      n.addEventListener(e, (ev) => {
        const attendu = e in (entry.outputs || {});
        note(
          attendu,
          `${mod.meta.tag} a émis ${e} ${JSON.stringify(ev.detail)}`,
        );
        rendJournal();
      });
    }
  }
  return s;
}

function rendJournal() {
  const pre = $("journal");
  if (!pre) return;
  pre.replaceChildren(
    ...journal.map(([ok, t]) =>
      el("span", { class: ok ? "ok" : "ko" }, `${ok ? "✓" : "✗"} ${t}\n`),
    ),
  );
}

const g6 = catalogue.items
  .filter((i) => i.lot === "G6" && i.kind === "html")
  .sort((a, b) => a.order - b.order);
const demos = $("demos");
demos.append(sectionPolices(), sectionSignes(), ...g6.map(sectionElement));
const sj = el("section", { id: "controle" });
sj.append(
  el("h2", {}, "Contrôle en direct"),
  el("pre", { id: "journal", "aria-live": "polite" }),
);
demos.append(sj);
setTimeout(rendJournal, 0);

// Les bascules : theme, animation, largeur de telephone
const bascule = (id, applique) => {
  const b = $(id);
  b.addEventListener("click", () => {
    const on = b.getAttribute("aria-pressed") !== "true";
    b.setAttribute("aria-pressed", String(on));
    applique(on);
  });
};
bascule("theme", (on) => {
  document.documentElement.dataset.theme = on ? "dark" : "light";
});
bascule("motion", (on) => {
  if (on) document.documentElement.dataset.motion = "reduced";
  else delete document.documentElement.dataset.motion;
});
bascule("phone", (on) => demos.classList.toggle("phone", on));
// la copie refusee : le presse-papiers simule rejette l'ecriture, pour voir le repli de l'icone de copie
const ecrire = navigator.clipboard?.writeText?.bind(navigator.clipboard);
bascule("refus", (on) => {
  if (!navigator.clipboard) return;
  navigator.clipboard.writeText = on ? () => Promise.reject(new Error("refus simulé")) : ecrire;
});
// l'adresse peut fixer les bascules : ?theme=dark&motion=reduced&phone=1
const q = new URLSearchParams(location.search);
if (q.get("theme") === "dark") $("theme").click();
if (q.get("motion") === "reduced") $("motion").click();
if (q.get("phone")) $("phone").click();
