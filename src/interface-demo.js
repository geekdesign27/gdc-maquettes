// La page de demonstration des elements d'interface (lot G6) : chaque element dans ses variantes, en clair
// et en sombre, avec moins d'animation, a la largeur d'un telephone. Outil de fabrication : pas livre a GDC.
import catalogue from "../catalogue.json" with { type: "json" };
import { defineElements, elements, interfaceContext } from "./interface.js";
import { arbreDe } from "./arbre.js";
import { horaireDe } from "./ville/heure.js";

defineElements();
const $ = (id) => document.getElementById(id);
const el = (balise, attrs = {}, texte) => {
  const n = document.createElement(balise);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (texte !== undefined) n.textContent = texte;
  return n;
};

// Les sequences de GDC se lisent par leur index.json seulement (plan de l'atelier, I-5) : chaque pas y nomme son
// fichier, rien n'est pris par motif de nom ; la page ne charge que les sequences dont elle se sert.
const indexGdc = import.meta.glob("../fixtures/*/index.json", { eager: true, import: "default" });
const fichiersGdc = import.meta.glob("../fixtures/*/*.json", { import: "default" });
const etapesGdc = (sequence) => indexGdc[`../fixtures/${sequence}/index.json`].etapes;
const scenesGdc = (sequence) =>
  Promise.all(etapesGdc(sequence).map((e) => fichiersGdc[`../fixtures/${sequence}/${e.fichier}`]()));
const scenesProjetType = await scenesGdc("projet-type");
const scenesTroisApplications = await scenesGdc("trois-applications");
// une etape d'une sequence, par son numero
const etapeGdc = (sequence, scenes, numero) =>
  scenes[etapesGdc(sequence).findIndex((e) => e.numero === numero)];

// Le selecteur d'etages (lot G8) : les donnees qu'en tire GDC, depuis un batiment de sa scene (schema 3, etages).
const troisChantiers = etapeGdc("trois-applications", scenesTroisApplications, 8);
const batimentGdc = (id) =>
  troisChantiers.elements.find(
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
const actionsProjetType = scenesProjetType.map((s) => s.actions || []);
const actionsTroisApplications = scenesTroisApplications.map((s) => s.actions || []);
// des cas limites : une phrase qui ressemble a du HTML, une heure illisible, une personne inconnue, sans phrase
const actionsLimites = [
  { ts: "2026-10-21T15:53:40.000Z", action: "change", element: "building", id: "bureau", nom: "Application de bureau", phrase: "<b>Application de bureau</b> : <img src=x onerror=alert(1)> structure → envelope", ref: { application: "bureau" } },
  { ts: "2026-10-21T15:53:41.000Z", action: "apparait", element: "character", id: "inconnu", nom: "Quelqu'un, un rôle inconnu", phrase: "Quelqu'un, un rôle inconnu apparaît (la baraque)" },
  { ts: "2026-10-21T15:53:41.000Z", action: "quantite", element: "parking", id: "parking" },
  { ts: "pas une date", action: "change", element: "control-office", id: "bureau-controle", phrase: "Le bureau de contrôle : idle → error" },
  { ts: "2026-10-21T15:53:42.000Z", action: "fermeture", element: "chantier", id: "chantier", phrase: "Le chantier ferme", cause: null, deduit: "silence" },
  { ts: "2026-10-21T15:53:43.000Z", action: "change", element: "client-office", id: "bureau-client", phrase: "Une cause illisible : ignorée, la ligne ne se clique pas", cause: "pas-un-evt" },
];
// Le planning (site-schedule, plan I-7) : les chronologies de GDC (gdc chronologie) et ses mises a jour (--depuis), par
// index.json ; volume a la demande, pour la mesure du budget.
const chronoGdc = (sequence, numero, sorte = "chronologie") =>
  fichiersGdc[`../fixtures/${sequence}/${etapesGdc(sequence).find((e) => e.numero === numero)[sorte]}`]();
const [chronoNonOuvert, chronoProjetType, chronoPause, chronoTrois, chronoFeuxVerts, chronoLong] = await Promise.all([
  chronoGdc("projet-type", 1),
  chronoGdc("projet-type", 25),
  chronoGdc("projet-type", 20),
  chronoGdc("trois-applications", 9),
  chronoGdc("trois-applications", 5),
  chronoGdc("projet-long", 25),
]);
const depuisProjetType = await Promise.all(
  etapesGdc("projet-type").filter((e) => e.numero > 11).map((e) => chronoGdc("projet-type", e.numero, "depuis")),
);
const completesTrois = await Promise.all([6, 7, 8].map((n) => chronoGdc("trois-applications", n)));
// les etats poses apres le rendu, comme GDC les renverrait (survol, choix) ou comme l'utilisateur les ferait (pli, tableau)
const planningAvec = (apres) => (n) => {
  requestAnimationFrame(() => requestAnimationFrame(() => apres(n)));
  return n;
};
const clicDans = (n, selecteur) => n.shadowRoot.querySelector(selecteur)?.click();
const FICHE_TERRAIN = { application: "terrain", fiche: "004-saisir-un-constat-hors-ligne" };

// Le choix relaye comme GDC le fera (derniere passe de GDC, section 6) : un premier choix, puis chaque gdc-select de
// l'element lui revient en selected.
const relaieChoix = (n, premier) => {
  n.selected = premier;
  n.addEventListener("gdc-select", (e) => { n.selected = e.detail; });
  return n;
};
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

const sceneTrois = troisChantiers;
const sceneLotFini = etapeGdc("projet-type", scenesProjetType, 16);
// neuf fiches dans un batiment : quatre livrees sous « Livrees · 4 », des lots pour deux fiches en cours
const lotsDe = (fiche, lots) =>
  lots.map(([lot, name, state]) => ({ id: `${fiche}/${lot}`, name: `${lot} · ${name}`, ref: { application: "bureau", fiche, lot }, state }));
const arbreNeufFiches = (extra) => ({
  groups: [
    {
      title: "Les bâtiments",
      items: [
        {
          id: "bureau",
          name: "Application de bureau",
          ref: { application: "bureau" },
          state: "active",
          children: neufFiches(null).floors.map((f) => ({
            id: f.id,
            name: f.name,
            etape: f.etape,
            state: f.state,
            delivered: f.delivered,
            ref: { application: "bureau", fiche: f.id },
            progress: f.delivered ? { done: 2, total: 2 } : f.id === "010-tableau-de-bord" ? { done: 1, total: 3 } : undefined,
            children: f.id === "010-tableau-de-bord"
              ? lotsDe(f.id, [["L1", "Les indicateurs", "done"], ["L2", "Le graphique des écarts", "active"], ["L3", "L'export du tableau"]])
              : f.id === "001-cloturer-un-audit"
                ? lotsDe(f.id, [["L1", "L'écran de clôture", "done"], ["L2", "Le rapport signé", "done"]])
                : [],
          })),
        },
        { id: "terrain", name: "Application terrain", ref: { application: "terrain" } },
      ],
    },
  ],
  ...extra,
});
// des cas limites : du HTML dans un nom, un etat inconnu, un identifiant repete, un quatrieme niveau (ignore), une
// fraction trop grande ou illisible, un item sans identifiant, un groupe sans titre
const arbreLimites = {
  selected: "doublon",
  groups: [
    {
      items: [
        { id: "html", name: "<img src=x onerror=alert(1)> <b>Pas du gras</b>", state: "dormant" },
        { name: "Sans identifiant : ignoré" },
        { id: "doublon", name: "Un identifiant", state: "error" },
        { id: "doublon", name: "Le même identifiant : ignoré" },
        {
          id: "a",
          name: "Un nom très long qui ne tient pas dans la colonne de la navigation et se coupe",
          etape: 6,
          progress: { done: 5, total: 3 },
          children: [
            {
              id: "b",
              name: "Deuxième niveau, fraction illisible",
              progress: { done: "x", total: 2 },
              children: [{ id: "c", name: "Troisième niveau", children: [{ id: "d", name: "Quatrième niveau : ignoré" }] }],
            },
          ],
        },
      ],
    },
  ],
};

// Les variantes montrees pour chaque element : { titre, data }. Les donnees suivent la fiche du catalogue.
const minutes = (n) => new Date(Date.now() - n * 60000).toISOString();
// Le moment de la carte (time-of-day) : l'horaire que la carte donne a GDC, a quelques heures du 22 octobre 2026
const horaireA = (iso, mode = "auto", fin = null) => ({
  ...horaireDe(new Date(iso).getTime()),
  mode,
  fin: fin === null ? null : new Date(fin).getTime(),
});

// Le rail d'un panneau (lot G8) : chaque rail dans un ecran factice, pose comme GDC le posera : le panneau, son rail
// contre lui et la carte. Le relais fait ce que fera GDC : gdc-toggle renvoie open et masque le panneau sans le
// retirer, gdc-resize renvoie la taille.
const ecranRail = (side) => (n) => {
  const vertical = side !== "bottom";
  const ecran = el("div", { class: "ecran-rail", style: `display: flex; flex-direction: ${vertical ? "row" : "column"}; height: ${vertical ? 220 : 260}px; border: 1px solid color-mix(in srgb, var(--gdc-ink) 15%, transparent); border-radius: 8px; overflow: hidden; background: var(--gdc-background)` });
  const panneau = el("div", { style: "flex: none; overflow: auto; padding: 10px 12px; background: var(--gdc-surface); color: var(--gdc-muted); font-size: 12px" }, `${n.data.panel?.name ?? "Le panneau"}, posé par GDC`);
  const carte = el("div", { style: "flex: 1 1 auto; display: grid; place-items: center; color: var(--gdc-muted); font-size: 12px; background: color-mix(in srgb, var(--gdc-ink) 4%, transparent)" }, "La carte");
  const taille = () => {
    const r = n.data.resize;
    const t = r && Number.isFinite(r.size) ? r.size : vertical ? 180 : 110;
    panneau.style[vertical ? "width" : "height"] = `${t}px`;
  };
  const montre = () => {
    panneau.hidden = n.data.open !== true;
    taille();
  };
  n.addEventListener("gdc-toggle", (e) => {
    n.data = { ...n.data, open: e.detail.open };
    montre();
  });
  n.addEventListener("gdc-resize", (e) => {
    n.data = { ...n.data, resize: { ...n.data.resize, size: e.detail.size } };
    taille();
  });
  montre();
  if (side === "right") ecran.append(carte, n, panneau);
  else if (side === "bottom") ecran.append(carte, n, panneau);
  else ecran.append(panneau, n, carte);
  return ecran;
};
// La rangee du telephone : les trois rails cote a cote ; le relais n'ouvre qu'un panneau a la fois
const rangeeRail = (n) => {
  const rangee = el("div", { style: "display: flex; height: 42px; border: 1px solid color-mix(in srgb, var(--gdc-ink) 15%, transparent); border-radius: 8px; overflow: hidden" });
  const rails = [
    { panel: { id: "arbre", name: "L'arbre", icon: "tree" }, side: "left", open: true, counts: { waiting: 1 } },
    { panel: { id: "fil", name: "Le fil", icon: "feed" }, side: "right", open: false, counts: {} },
    { panel: { id: "planning", name: "Le planning", icon: "schedule" }, side: "bottom", open: false, counts: { blocked: 2 } },
  ].map((data, i) => {
    const r = i === 0 ? n : document.createElement("gdc-panel-rail");
    r.data = data;
    r.style.flex = "1 1 0";
    r.addEventListener("gdc-toggle", (e) => {
      for (const x of rangee.children) x.data = { ...x.data, open: e.detail.open && x === r };
    });
    return r;
  });
  rangee.append(...rails);
  return rangee;
};

// Le repere d'agent (lot G8) : une carte factice, ou chaque agent est une silhouette de 5 x 16 px (sa taille sur la
// carte entiere d'un portable) ; le repere se pose sur sa tete. Le relais fait ce que fera GDC : le pointeur prend
// l'agent le plus proche a moins de 12 px de sa silhouette, et le renvoie en hovered.
const planAgents = (n) => {
  const plan = el("div", { style: "position: relative; height: 270px; max-width: 680px; border-radius: 8px; overflow: hidden; border: 1px solid color-mix(in srgb, var(--gdc-ink) 15%, transparent); background: repeating-linear-gradient(135deg, color-mix(in srgb, var(--gdc-ink) 5%, var(--gdc-background)) 0 18px, var(--gdc-background) 18px 36px)" });
  const agents = n.data.agents || [];
  for (const a of agents) {
    if (!Number.isFinite(a.x) || !Number.isFinite(a.y)) continue;
    plan.append(el("div", { "aria-hidden": "true", style: `position: absolute; left: ${a.x - 2.5}px; top: ${a.y}px; width: 5px; height: 16px; border-radius: 2px; background: color-mix(in srgb, var(--gdc-ink) 70%, transparent)` }));
  }
  const pris = (px, py) => {
    let best = null;
    let bd = 12;
    for (const a of agents) {
      if (!Number.isFinite(a.x) || !Number.isFinite(a.y)) continue;
      const dy = Math.max(a.y - py, 0, py - (a.y + 16));
      const d = Math.hypot(px - a.x, dy);
      if (d <= bd) [best, bd] = [a.id, d];
    }
    return best;
  };
  plan.addEventListener("pointermove", (ev) => {
    const r = plan.getBoundingClientRect();
    const id = pris(ev.clientX - r.left, ev.clientY - r.top);
    if (id !== (n.data.hovered ?? null)) n.data = { ...n.data, hovered: id };
  });
  plan.addEventListener("pointerleave", () => {
    if (n.data.hovered) n.data = { ...n.data, hovered: null };
  });
  plan.append(n);
  return plan;
};

export const variantes = {
  "time-of-day": [
    { titre: "Auto, au crépuscule : la nuit arrive", data: { horaire: horaireA("2026-10-22T18:42:00") } },
    { titre: "Auto, en plein jour", data: { horaire: horaireA("2026-10-22T11:05:00") } },
    { titre: "Jour choisi la nuit : il retombe au prochain passage", data: { horaire: horaireA("2026-10-22T22:10:00", "jour", horaireDe(new Date("2026-10-22T22:10:00").getTime()).prochain.instant) } },
    { titre: "Nuit gardée pour une revue : sans fin", data: { horaire: horaireA("2026-10-22T14:00:00", "nuit") } },
    { titre: "Sans horaire : Auto, rien d'autre", data: {} },
  ],
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
  // la navigation 2.0.0 : l'arbre tire des sequences de GDC ; la suite change expanded puis le choix, comme GDC
  "side-nav": [
    {
      titre: "Trois applications (étape 8) : la fiche de Julie choisie, ses parents ouverts ; l'existant sous « Livrées »",
      style: "height: 560px; max-width: 320px",
      data: arbreDe(sceneTrois, { selected: "002-saisir-un-constat-hors-ligne" }),
    },
    {
      titre: "Neuf fiches : quatre livrées sous « Livrées · 4 », les six états ; expanded ouvre le bâtiment et une fiche",
      style: "height: 520px; max-width: 320px",
      data: arbreNeufFiches({ expanded: ["bureau", "010-tableau-de-bord"] }),
      suite: [
        arbreNeufFiches({ expanded: ["bureau"] }),
        arbreNeufFiches({ expanded: ["bureau"], selected: "002-signer-le-rapport" }),
      ],
    },
    {
      titre: "Projet type, étape 16 : un lot fini choisi",
      style: "height: 420px; max-width: 320px",
      data: arbreDe(sceneLotFini, { selected: "001-cloturer-un-audit/L1" }),
    },
    {
      titre: "Cas limites : du HTML affiché comme du texte, un état inconnu, un identifiant répété, un quatrième niveau",
      style: "height: 320px; max-width: 320px",
      data: arbreLimites,
    },
    { titre: "Sans données", style: "height: 160px; max-width: 320px", data: {} },
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
    // 1.1.0 : un fait choisi ailleurs (le planning, la carte) ; la page relaie chaque clic du fil en selected, comme GDC
    {
      titre: "Un fait choisi ailleurs (1.1.0) : les quatre actions de evt:004-…/de40e60e marquées, le fil y défile ; un clic est relayé en selected, comme GDC",
      style: "height: 320px; max-width: 380px",
      data: { actions: actionsTroisApplications.flat() },
      cadre: (n) => relaieChoix(n, { id: "terrain", ref: { application: "terrain", fiche: "004-saisir-un-constat-hors-ligne" }, evt: "evt:004-saisir-un-constat-hors-ligne/de40e60e" }),
    },
    {
      titre: "Un choix sans evt (1.1.0) : une fiche choisie dans l'arbre ; rien n'est marqué",
      style: "height: 200px; max-width: 380px",
      data: { actions: actionsTroisApplications.flat() },
      cadre: (n) => relaieChoix(n, { id: "004-saisir-un-constat-hors-ligne", ref: { application: "terrain", fiche: "004-saisir-un-constat-hors-ligne" } }),
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
  // le planning : chaque etat de la fiche, sur les sequences reelles ; la page relaie chaque gdc-select en selected
  "site-schedule": [
    { titre: "Chargement : aucune chronologie encore", style: "height: 120px", data: {} },
    { titre: "Données illisibles : schéma 2", style: "height: 120px", data: { timeline: { ...chronoTrois, schema: 2 } } },
    { titre: "Projet non ouvert (projet-type, pas 1) : les dix étapes à venir, à la file", style: "height: 360px", data: { timeline: chronoNonOuvert } },
    {
      titre: "Normal, une seule application (projet-type, pas 25) : lignes d'application masquées, étapes en cours dépliées, traits regroupés par jour, défaut fermé, permis périmé",
      style: "height: 420px",
      data: { timeline: chronoProjetType },
      cadre: (n) => relaieChoix(n, null),
    },
    { titre: "Une pause en cours (projet-type, pas 20) : ta réception attendue, la bande du régime ouverte jusqu'à maintenant", style: "height: 300px", data: { timeline: chronoPause } },
    { titre: "Décision attendue (trois-applications, pas 5) : deux feux verts t'attendent, trois applications", style: "height: 380px", data: { timeline: chronoFeuxVerts } },
    { titre: "Jours repliés (projet-long, horloge décalée) : un jour vide étroit, des plis", style: "height: 300px", data: { timeline: chronoLong } },
    {
      titre: "Pli déplié (projet-long) : le premier pli ouvert",
      style: "height: 300px",
      data: { timeline: chronoLong },
      cadre: planningAvec((n) => clicDans(n, "button[data-pli]")),
    },
    {
      titre: "Ligne survolée ailleurs (highlight : la fiche « Saisir un constat hors ligne ») : toutes ses barres s'éclairent, l'escalier les relie",
      style: "height: 380px",
      data: { timeline: chronoTrois },
      cadre: planningAvec((n) => {
        for (const o of n.shadowRoot.querySelectorAll('.ligne[aria-expanded="false"]'))
          if (o.dataset.id.startsWith("application:terrain@")) o.querySelector(".ouvre").click();
        n.highlight = FICHE_TERRAIN;
      }),
    },
    {
      titre: "Ligne choisie ailleurs ({ id, ref } : la fiche à l'étape 6) : ses lignes s'ouvrent, le planning y défile",
      style: "height: 300px",
      data: { timeline: chronoTrois },
      cadre: (n) => relaieChoix(n, { id: "004-saisir-un-constat-hors-ligne", ref: FICHE_TERRAIN }),
    },
    {
      titre: "Étape choisie ({ id: \"etape:7\", etape: 7 }) : l'étape s'ouvre",
      style: "height: 300px",
      data: { timeline: chronoTrois },
      cadre: (n) => relaieChoix(n, { id: "etape:7", etape: 7 }),
    },
    {
      titre: "Trait choisi ({ id, ref, evt } : l'essai rouge de la fiche terrain, choisi dans le fil) : son trait marqué",
      style: "height: 300px",
      data: { timeline: chronoTrois },
      cadre: (n) => relaieChoix(n, { id: "developpeur-base", ref: { ...FICHE_TERRAIN, lot: "L1" }, evt: "evt:004-saisir-un-constat-hors-ligne/9958f34e" }),
    },
    {
      titre: "Jalon choisi, refusé : « On continue » et son motif (détail en haut)",
      style: "height: 260px",
      data: { timeline: chronoTrois },
      cadre: (n) => relaieChoix(n, { id: "jalon:projet/on-continue/1", evt: "evt:projet/74393a6f" }),
    },
    {
      titre: "Jalon choisi, périmé : le permis de construire et sa date d'après git (repère pointillé)",
      style: "height: 260px",
      data: { timeline: chronoTrois },
      cadre: (n) => relaieChoix(n, { id: "jalon:projet/permis-de-construire/1", evt: "evt:projet/1c835438" }),
    },
    {
      titre: "Vue tableau (projet-type, pas 25) : une ligne par barre, par jalon et par repère, avec la source",
      style: "height: 360px",
      data: { timeline: chronoProjetType },
      cadre: planningAvec((n) => clicDans(n, "button.bascule")),
    },
    {
      titre: "Mise à jour reçue : projet-type depuis le pas 11 ; « Étape suivante » applique le depuis du pas suivant (déplié, défilement et choix gardés)",
      style: "height: 360px",
      data: { timeline: await chronoGdc("projet-type", 11) },
      suite: depuisProjetType.map((timeline) => ({ timeline })),
      cadre: (n) => relaieChoix(n, null),
    },
    {
      titre: "Chronologie complète reçue à la place (complet: true) : trois-applications, pas 5 puis 6, 7 et 8 entières",
      style: "height: 360px",
      data: { timeline: chronoFeuxVerts },
      suite: completesTrois.map((c) => ({ timeline: { ...c, complet: true } })),
      cadre: (n) => relaieChoix(n, null),
    },
    { titre: "Sur téléphone (fenêtre sous 600 px) : la liste par fiche ; « Moins d'animation » en haut de page : aucun glissement", style: "height: 300px", data: { timeline: chronoTrois } },
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
  // le repere d'agent : sur une carte factice, le pointeur pres d'une silhouette ouvre son repere court
  "agent-marker": [
    {
      titre: "La réception, trois agents groupés : Claire et Anne attendent ta décision, Olivier est bloqué ; Hélène, au travail, n'a pas de repère ; au clic, le groupe se déplie",
      cadre: planAgents,
      data: { agents: [
        { id: "claire", name: "Claire, l'architecte", state: "waiting", x: 300, y: 150 },
        { id: "anne", name: "Anne, la commission de réception", state: "waiting", x: 318, y: 156 },
        { id: "olivier", name: "Olivier, le surveillant de chantier", state: "blocked", x: 340, y: 148 },
        { id: "helene", name: "Hélène, le bureau de contrôle", state: "inspect", x: 120, y: 90 },
      ], hovered: null },
    },
    {
      titre: "Un bloqué seul, une décision seule, Emma au travail (survole sa silhouette)",
      cadre: planAgents,
      data: { agents: [
        { id: "julie", name: "Julie, la développeuse base de données", state: "blocked", x: 120, y: 140 },
        { id: "client", name: "Pierre-Alain, le client", state: "waiting", x: 360, y: 110 },
        { id: "emma", name: "Emma, la développeuse interface", state: "typing", x: 540, y: 170 },
      ], hovered: null },
    },
    {
      titre: "Six agents qui se touchent : trois portraits, le signe le plus grave (ta décision passe avant le blocage) et le nombre",
      cadre: planAgents,
      data: { agents: ["claire", "lina", "julie", "robin", "anne", "yves"].map((id, k) => ({ id, name: id[0].toUpperCase() + id.slice(1), state: k === 2 ? "blocked" : "waiting", x: 260 + k * 14, y: 150 + (k % 2) * 6 })), hovered: null },
    },
    {
      titre: "Cas limites : prénom très long, position absente, état inconnu, identifiant sans portrait, au bord du cadre",
      cadre: planAgents,
      data: { agents: [
        { id: "victor", name: "Victor-Emmanuel-Maximilien de la Baraque du Conducteur, chef de chantier", state: "waiting", x: 200, y: 120 },
        { id: "fanny", name: "Fanny", state: "blocked" },
        { id: "inconnu", name: "Quelqu'un d'inconnu", state: "waiting", x: 470, y: 160 },
        { id: "bernard", name: "Bernard, le concierge", state: "unknown", x: 640, y: 30 },
      ], hovered: "bernard" },
    },
  ],
  // le rail d'un panneau : les trois cotes, ouverts et fermes, avec et sans badges, le separateur du planning
  "panel-rail": [
    { titre: "À gauche, fermé : l'arbre, une décision t'attend et deux bloqués", cadre: ecranRail("left"), data: { panel: { id: "arbre", name: "L'arbre des fiches", icon: "tree" }, side: "left", open: false, counts: { waiting: 1, blocked: 2, done: 9 } } },
    { titre: "À gauche, ouvert : la poignée replie l'arbre", cadre: ecranRail("left"), data: { panel: { id: "arbre", name: "L'arbre des fiches", icon: "tree" }, side: "left", open: true, counts: { waiting: 1 } } },
    { titre: "À droite, fermé : le fil, sans badge", cadre: ecranRail("right"), data: { panel: { id: "fil", name: "Le fil des déclencheurs", icon: "feed" }, side: "right", open: false, counts: { done: 4 } } },
    { titre: "À droite, ouvert : le fil, trois erreurs (le badge ne se voit que fermé)", cadre: ecranRail("right"), data: { panel: { id: "fil", name: "Le fil des déclencheurs", icon: "feed" }, side: "right", open: true, counts: { error: 3 } } },
    { titre: "En bas, ouvert : le planning, le séparateur le redimensionne (flèches, Début, Fin, Entrée replie)", cadre: ecranRail("bottom"), data: { panel: { id: "planning", name: "Le planning du chantier", icon: "schedule" }, side: "bottom", open: true, counts: { waiting: 1 }, resize: { size: 110, min: 72, max: 200 } } },
    { titre: "En bas, fermé : le planning, seize alertes dont une décision", cadre: ecranRail("bottom"), data: { panel: { id: "planning", name: "Le planning du chantier", icon: "schedule" }, side: "bottom", open: false, counts: { waiting: 1, error: 12, blocked: 3 }, resize: { size: 110, min: 72, max: 200 } } },
    { titre: "Cas limites : côté inconnu, nom long, cent vingt erreurs, icône inconnue", cadre: ecranRail("left"), data: { panel: { id: "x", name: "Un panneau au nom beaucoup trop long pour la bande", icon: "inconnue" }, side: "haut", open: false, counts: { error: "120" } } },
    { titre: "Sur un écran de téléphone : la rangée des trois onglets, un seul panneau ouvert", cadre: rangeeRail, data: {} },
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
    } else d.append(el("h3", {}, v.titre), v.cadre ? v.cadre(n) : n);
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
    for (const e of ["gdc-select", "gdc-copy", "gdc-close", "gdc-hover", "gdc-toggle", "gdc-resize"]) {
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

// Le survol partage (lot G8, hover-link) : un banc d'essai a trois colonnes tire de fixtures/trois-applications : le
// vrai fil, les vrais selecteurs d'etages, la vraie navigation (l'arbre).
// Le relais de la page (plus bas) fait ce que fera GDC : chaque gdc-hover revient en highlight a tous.
let survols = 0;
function sectionSurvol(entry) {
  const s = el("section", { id: entry.id });
  s.append(
    el("h2", {}, entry.name),
    el("p", {}, entry.purpose),
    el(
      "p",
      {},
      "Banc d'essai tiré de fixtures/trois-applications : à gauche, le vrai fil des déclencheurs ; au milieu, le vrai sélecteur d'étages ; à droite, la vraie navigation, l'arbre des fiches et des lots. Survole ou parcours au clavier : ce qui correspond s'allume dans les trois. La carte, le fil et l'arbre se relient dans la galerie (la ville).",
    ),
  );
  const scenes = scenesTroisApplications;
  const batiments = scenes
    .at(-1)
    .elements.filter((e) => e.element === "building");
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
  for (const b of batiments) {
    const selecteur = document.createElement("gdc-floor-selector");
    selecteur.data = selecteurDe(b, null);
    selecteur.style.marginBottom = "8px";
    etages.append(selecteur);
  }
  // l'arbre : la vraie navigation (side-nav 2.0.0), tiree de la derniere scene ; elle emet gdc-hover et lit highlight
  // elle-meme, par le relais de la page
  const arbre = colonne("L'arbre, à droite");
  const arbreElement = document.createElement("gdc-side-nav");
  arbreElement.data = arbreDe(scenes.at(-1), { expanded: batiments.map((b) => b.id) });
  arbreElement.style.height = "460px";
  arbre.append(arbreElement);
  const grille = el("div", { class: "banc" });
  grille.append(fil, etages, arbre);
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
// lisent, l'emetteur compris. La derniere reference de chaque element est gardee ;
// highlight est la plus recente qui n'est pas null : quand le pointeur quitte l'arbre, le focus reste dans le fil.
const survolsParElement = new Map();
document.addEventListener("gdc-hover", (e) => {
  survolsParElement.delete(e.target);
  if (e.detail?.ref) survolsParElement.set(e.target, e.detail.ref);
  const ref = [...survolsParElement.values()].at(-1) ?? null;
  for (const m of Object.values(elements))
    if (m.meta.inputs.includes("highlight"))
      for (const n of document.querySelectorAll(m.meta.tag)) n.highlight = ref;
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
