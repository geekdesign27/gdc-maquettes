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

// Le selecteur d'etages (lot G8) : les donnees qu'en tire GDC, depuis un batiment de sa scene (schema 3, etages).
const troisChantiers = import.meta.glob(
  "../fixtures/trois-applications/08-trois-chantiers.json",
  { eager: true, import: "default" },
);
const batimentGdc = (id) =>
  Object.values(troisChantiers)[0].elements.find(
    (e) => e.element === "building" && e.id === id,
  );
const selecteurDe = (b, selected) => ({
  building: { id: b.id, name: b.nom },
  floors: b.etages.map((e) => ({
    id: e.fiche,
    name: e.nom,
    etape: e.etape,
    delivered: Boolean(e.livre),
  })),
  selected,
});
// Le fil des declencheurs (lot G8) : les actions des sequences de GDC, etape par etape (schema 3, actions).
const sequence = (glob) =>
  Object.keys(glob)
    .sort()
    .map((k) => glob[k].actions || []);
const actionsProjetType = sequence(
  import.meta.glob("../fixtures/projet-type/[0-9]*.json", { eager: true, import: "default" }),
);
const actionsTroisApplications = sequence(
  import.meta.glob("../fixtures/trois-applications/[0-9]*.json", { eager: true, import: "default" }),
);
// des cas limites : une phrase qui ressemble a du HTML, une heure illisible, une personne inconnue, sans phrase
const actionsLimites = [
  { ts: "2026-10-21T15:53:40.000Z", action: "change", element: "building", id: "bureau", nom: "Application de bureau", phrase: "<b>Application de bureau</b> : <img src=x onerror=alert(1)> structure → envelope", ref: { application: "bureau" } },
  { ts: "2026-10-21T15:53:41.000Z", action: "apparait", element: "character", id: "inconnu", nom: "Quelqu'un, un rôle inconnu", phrase: "Quelqu'un, un rôle inconnu apparaît (la baraque)" },
  { ts: "2026-10-21T15:53:41.000Z", action: "quantite", element: "parking", id: "parking" },
  { ts: "pas une date", action: "change", element: "control-office", id: "bureau-controle", phrase: "Le bureau de contrôle : idle → error" },
  { ts: "2026-10-21T15:53:42.000Z", action: "fermeture", element: "chantier", id: "chantier", phrase: "Le chantier ferme" },
];
// neuf fiches, pour voir le rez regroupe : les plus anciennes livrees, puis le chantier en cours
const neufFiches = (selected, livrees = 4) => ({
  building: { id: "bureau", name: "Application de bureau" },
  floors: [
    ["001-cloturer-un-audit", "Clôturer un audit"],
    ["002-signer-le-rapport", "Signer le rapport"],
    ["005-planifier-les-audits", "Planifier les audits de l'année"],
    ["006-joindre-des-photos", "Joindre des photos au constat"],
    ["007-relancer-un-auditeur", "Relancer un auditeur en retard"],
    ["008-archiver-un-audit", "Archiver un audit clôturé"],
    ["009-exporter-un-audit-en-pdf", "Exporter un audit en PDF"],
    ["010-tableau-de-bord", "Le tableau de bord des non-conformités"],
    ["011-mode-hors-ligne", "Travailler hors ligne sur le chantier"],
  ].map(([id, name], i) => ({
    id,
    name,
    etape: i < livrees ? 9 : [8, 7, 6, 6, 5, 4, 3, 2][i - livrees],
    delivered: i < livrees,
    state: i < livrees
      ? "done"
      : ["done", "waiting", "active", "blocked", "error", "unknown", undefined, "active"][i - livrees],
  })),
  selected,
});

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
          // les quatre zones du contrat GDC (plan.zones, schema 3) et leurs lieux, dans l'ordre de fixtures/projet-type
          {
            title: "Les bureaux",
            items: [
              { id: "bureau-architecte", name: "Le bureau d'architecte" },
              { id: "bureau-client", name: "Le bureau du client", state: "waiting" },
              { id: "bureau-etudes", name: "Le bureau d'études", state: "active" },
              { id: "panneau-permis", name: "Le panneau du permis" },
            ],
          },
          {
            title: "Le chantier",
            items: [
              { id: "baraque", name: "La baraque du conducteur de travaux", state: "active" },
              { id: "bureau-controle", name: "Le bureau de contrôle", state: "error" },
              { id: "panneau-feu-vert", name: "Le panneau du feu vert" },
              { id: "chantier", name: "Le chantier, une parcelle par application" },
            ],
          },
          {
            title: "La réception, la remise des clés et la garantie",
            items: [
              { id: "aire-reception", name: "L'aire de réception" },
              { id: "cabane-cles", name: "La cabane de la remise des clés" },
              { id: "cabane-garantie", name: "La cabane de la garantie" },
            ],
          },
          {
            title: "Les transformations",
            items: [
              { id: "cabane-transformations", name: "La cabane des transformations" },
              { id: "parking", name: "Le carnet des demandes" },
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
              { id: "lina", name: "Lina, designer UX/UI", state: "blocked" },
              { id: "yves", name: "Yves, conducteur de travaux", state: "active" },
              { id: "victor", name: "Victor, chef de chantier", state: "dormant" },
            ],
          },
        ],
      },
    },
    { titre: "Sans données", style: "height: 160px; max-width: 300px", data: {} },
  ],
  // le selecteur d'etages : les batiments de fixtures/trois-applications (etape 8), puis neuf fiches pour le rez
  "floor-selector": [
    {
      titre: "Application de bureau : une fiche livrée, une surélévation (trois-applications, étape 8)",
      style: "max-width: 340px",
      data: selecteurDe(batimentGdc("bureau"), "004-exporter-un-audit-en-pdf"),
    },
    {
      titre: "Administration : l'application existante au rez, pas choisissable",
      style: "max-width: 340px",
      data: selecteurDe(batimentGdc("admin"), "003-gerer-les-droits-des-auditeurs"),
    },
    {
      titre: "Neuf fiches : le rez regroupe les quatre livrées, les six états",
      style: "max-width: 340px",
      data: neufFiches("010-tableau-de-bord"),
    },
    {
      titre: "Neuf fiches, deux livrées : le rez prend aussi les plus anciennes ; la choisie y est, il est déplié",
      style: "max-width: 340px",
      data: neufFiches("005-planifier-les-audits", 2),
    },
    {
      titre: "Avant la première fiche (trois-applications, étape 1)",
      style: "max-width: 340px",
      data: { building: { id: "terrain", name: "Application terrain" }, floors: [] },
    },
    { titre: "Sans données", style: "max-width: 340px", data: {} },
  ],
  // le fil : la suite ajoute l'etape suivante, comme GDC (impulsion, annonce, « n nouvelles actions » si la liste est
  // remontee)
  "trigger-feed": [
    {
      titre: "Trois applications : étapes 1 à 3 ; « Étape suivante » ajoute les actions de la suivante",
      style: "height: 420px; max-width: 380px",
      data: { actions: actionsTroisApplications.slice(0, 3).flat() },
      suite: actionsTroisApplications.slice(3).map((actions) => ({ actions })),
    },
    {
      titre: "Projet type : les vingt et une étapes",
      style: "height: 420px; max-width: 380px",
      data: { actions: actionsProjetType.flat() },
    },
    {
      titre: "Projet type, limit 6 : les six plus récentes",
      style: "max-width: 380px",
      data: { actions: actionsProjetType.flat(), limit: 6 },
    },
    {
      titre: "Cas limites : du HTML affiché comme du texte, une heure illisible, une personne inconnue, sans phrase",
      style: "max-width: 380px",
      data: { actions: actionsLimites },
    },
    { titre: "Sans données", style: "max-width: 380px", data: {} },
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
            { label: "Agent", value: "Lina, designer UX/UI", state: "blocked", ref: "lina" },
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
  // la fiche d'un agent : Lina au travail, Victor dont le journal ne dit rien
  "agent-popup": [
    {
      titre: "Lina, au travail",
      data: {
        id: "lina", name: "Lina, designer UX/UI", team: "studies", state: "typing",
        doing: ["Dessine l'écran de clôture d'un audit (001-cloturer-un-audit)"],
        next: ["Relire le parcours au clavier", "Passer la maquette à Robin"],
        can: ["Dessiner un écran", "Proposer un parcours", "Vérifier le contraste et le clavier"],
        actions: [{ label: "Où en est Lina ?", prompt: "Résume ce que fait l'agent lina et ce qui la bloque." }],
      },
    },
    {
      titre: "Victor : le journal ne dit rien",
      data: { id: "victor", name: "Victor, chef de chantier", team: "site", state: "unknown", doing: [], next: [], can: [], actions: [] },
    },
    {
      titre: "Pierre-Alain attend ta décision",
      data: { id: "client", name: "Pierre-Alain, le client", team: "client", state: "waiting", doing: ["Attend le rapport d'audit"], next: [], can: ["Valider une fiche", "Refuser une fiche"], actions: [] },
    },
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

// Les illustrations (lot G7) : chaque SVG insere dans la page, comme GDC le fera (pas en <img>), a plusieurs tailles ;
// un portrait dans chacun de ses etats (classe CSS posee sur le <svg>).
const svgs = import.meta.glob("../components/illustration/*/*.svg", {
  eager: true,
  query: "?raw",
  import: "default",
});
const lecteur = new DOMParser();
function illustration(id, fichier, taille, etat) {
  const texte = svgs[`../components/illustration/${id}/${fichier}.svg`];
  if (!texte) return el("span", {}, `${fichier} : absent`);
  const svg = document.importNode(
    lecteur.parseFromString(texte, "image/svg+xml").documentElement,
    true,
  );
  svg.setAttribute("width", taille);
  svg.setAttribute("height", taille);
  if (etat) svg.classList.replace("idle", etat);
  return svg;
}

function sectionIllustration(entry) {
  const s = el("section", { id: entry.id });
  s.append(el("h2", {}, entry.name), el("p", {}, entry.purpose));
  if (
    !(entry.files || []).some(
      (f) => svgs[`../components/illustration/${entry.id}/${f}.svg`],
    )
  ) {
    s.append(el("p", {}, "Pas encore fabriqué."));
    return s;
  }
  const rangees = entry.states
    ? [
        ...entry.states.map((etat) => [`${etat}, 96 px`, 96, etat]),
        ["idle, 48 px (taille de reconnaissance)", 48],
      ]
    : [
        ["20 px (taille de lecture)", 20],
        ["24 px", 24],
        ["48 px", 48],
      ];
  for (const [titre, taille, etat] of rangees) {
    const d = el("div", { class: "variante" });
    const c = el("div", { class: "cadre illustrations" });
    for (const f of entry.files) {
      const fig = el("figure", { class: "illustration" });
      fig.append(
        illustration(entry.id, f, taille, etat),
        el("figcaption", {}, f),
      );
      c.append(fig);
    }
    d.append(el("h3", {}, titre), c);
    s.append(d);
  }
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
    // la suite : chaque clic donne le data suivant a l'element, comme GDC a chaque nouvelle scene
    if (v.suite) {
      let i = 0;
      const b = el("button", { type: "button", class: "suite" });
      const libelle = () => {
        b.textContent = i < v.suite.length ? `Étape suivante (${v.suite.length - i} restantes)` : "Toutes les étapes sont jouées";
        b.disabled = i >= v.suite.length;
      };
      b.addEventListener("click", () => {
        n.data = v.suite[i++];
        libelle();
      });
      libelle();
      d.append(b);
    }
    s.append(d);
    // controle en direct : l'element s'est-il construit, et n'emet-il que les evenements de sa fiche ?
    queueMicrotask(() =>
      note(
        Boolean(n.shadowRoot && n.shadowRoot.childElementCount),
        `${mod.meta.tag} « ${v.titre} » : rendu`,
      ),
    );
    for (const e of ["gdc-select", "gdc-copy", "gdc-close", "gdc-hover"]) {
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

// Le survol partage (lot G8, hover-link) : un banc d'essai a trois colonnes tire de fixtures/trois-applications (le fil,
// les etages, l'arbre) : le fil et le selecteur sont les vrais elements ; l'arbre, une liste branchee par ctx.hoverLink
// comme le sera side-nav 2.0.0.
// Le relais de la page (plus bas) fait ce que fera GDC : chaque gdc-hover revient en highlight a tous.
const etapesTrois = import.meta.glob("../fixtures/trois-applications/0*.json", {
  eager: true,
  import: "default",
});
const recepteurs = new Set(); // (ref) => void : les colonnes du banc
let survols = 0;
function sectionSurvol(entry) {
  const s = el("section", { id: entry.id });
  s.append(
    el("h2", {}, entry.name),
    el("p", {}, entry.purpose),
    el(
      "p",
      {},
      "Banc d'essai tiré de fixtures/trois-applications : à gauche, le vrai fil des déclencheurs ; au milieu, le vrai sélecteur d'étages ; à droite, l'arbre est une liste simple branchée par ctx.hoverLink, comme le sera la navigation 2.0.0. Survole ou parcours au clavier : ce qui correspond s'allume dans les trois. La carte et le fil se relient dans la galerie (la ville).",
    ),
  );
  const scenes = Object.keys(etapesTrois)
    .sort()
    .map((k) => etapesTrois[k]);
  const batiments = scenes
    .at(-1)
    .elements.filter((e) => e.element === "building");
  // chaque bouton porte la reference que GDC a donnee au batiment, completee par les identifiants de GDC (la fiche
  // de l'etage, le lot de la piece) : le banc n'invente aucun identifiant
  const refs = new WeakMap();
  const bouton = (texte, ref) => {
    const b = el("button", { type: "button" }, texte);
    refs.set(b, ref);
    return b;
  };
  const item = (b, enfants) => {
    const li = el("li");
    li.append(b);
    if (enfants) li.append(enfants);
    return li;
  };
  const colonne = (titre) => {
    const c = el("div", { class: "cadre banc-colonne" });
    c.append(el("h3", {}, titre));
    return c;
  };
  // le fil : le vrai fil des declencheurs (trigger-feed), les actions des huit etapes ; il emet gdc-hover et lit
  // highlight lui-meme, par le relais de la page
  const fil = colonne("Le fil, à gauche");
  const filElement = document.createElement("gdc-trigger-feed");
  filElement.data = { actions: scenes.flatMap((sc) => sc.actions || []) };
  filElement.style.height = "460px";
  fil.append(filElement);
  // les etages : le panneau d'ascenseur de chaque batiment, l'etage du haut en haut
  // les etages : le vrai selecteur d'etages (floor-selector), un par batiment ; il emet gdc-hover et lit highlight
  // lui-meme, par le relais de la page
  const etages = colonne("Le sélecteur d'étages");
  const refEtage = (b, e) =>
    e.fiche ? { ...b.ref, fiche: e.fiche } : b.ref;
  for (const b of batiments) {
    const selecteur = document.createElement("gdc-floor-selector");
    selecteur.data = selecteurDe(b, null);
    selecteur.style.marginBottom = "8px";
    etages.append(selecteur);
  }
  // l'arbre : application, fiches, lots
  const arbre = colonne("L'arbre, à droite");
  const racine = el("ul");
  for (const b of batiments) {
    const fiches = el("ul");
    for (const e of b.etages.filter((x) => x.fiche)) {
      const lots = el("ul");
      for (const p of e.pieces)
        lots.append(item(bouton(`${p.lot} · ${p.nom}`, { ...refEtage(b, e), lot: p.lot })));
      fiches.append(item(bouton(e.nom, refEtage(b, e)), e.pieces.length ? lots : null));
    }
    racine.append(item(bouton(b.nom, b.ref), fiches));
  }
  arbre.append(racine);
  const grille = el("div", { class: "banc" });
  for (const c of [fil, etages, arbre]) {
    grille.append(c);
    if (c !== arbre) continue;
    interfaceContext.hoverLink(c, (n) => refs.get(n) || null);
    recepteurs.add((ref) => {
      for (const b of c.querySelectorAll("button"))
        b.toggleAttribute(
          "data-highlight",
          interfaceContext.correspond(ref, refs.get(b)),
        );
    });
  }
  // le compteur : un seul evenement par changement de reference, null a la sortie
  const compteur = el("p", { class: "banc-journal" }, "Aucun gdc-hover encore.");
  s.addEventListener("gdc-hover", (e) => {
    survols += 1;
    compteur.textContent = `gdc-hover n° ${survols} : ${JSON.stringify(e.detail.ref)}`;
  });
  s.append(grille, compteur);
  return s;
}

const g6 = catalogue.items
  .filter((i) => i.lot === "G6" && i.kind === "html")
  .sort((a, b) => a.order - b.order);
const demos = $("demos");
const g7 = catalogue.items
  .filter((i) => i.lot === "G7")
  .sort((a, b) => a.order - b.order);
const g8 = catalogue.items
  .filter((i) => i.lot === "G8" && i.kind === "html")
  .sort((a, b) => a.order - b.order);
demos.append(
  sectionPolices(),
  sectionSignes(),
  ...g6.map(sectionElement),
  sectionSurvol(catalogue.items.find((i) => i.id === "hover-link")),
  ...g8.map(sectionElement),
  ...g7.map(sectionIllustration),
);
// Le relais du survol partage, comme GDC le fera : chaque gdc-hover revient en highlight a tous les elements qui le
// lisent, l'emetteur compris, et aux colonnes du banc d'essai. La derniere reference de chaque element est gardee ;
// highlight est la plus recente qui n'est pas null : quand le pointeur quitte l'arbre, le focus reste dans le fil.
const survolsParElement = new Map();
document.addEventListener("gdc-hover", (e) => {
  survolsParElement.delete(e.target);
  if (e.detail?.ref) survolsParElement.set(e.target, e.detail.ref);
  const ref = [...survolsParElement.values()].at(-1) ?? null;
  for (const m of Object.values(elements))
    if (m.meta.inputs.includes("highlight"))
      for (const n of document.querySelectorAll(m.meta.tag)) n.highlight = ref;
  for (const r of recepteurs) r(ref);
});
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
