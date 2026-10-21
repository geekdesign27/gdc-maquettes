// La signaletique de l'interface (docs/signaletique.md) : pour chaque etat, une couleur, une forme et une icone,
// plus le mot affiche. Une seule source, injectee dans les elements d'interface par defineElements (src/interface.js),
// comme Three.js l'est dans les composants 3D. Les couleurs sont les variables --gdc-state-* de src/tokens.js.

// Ordre de gravite, du plus grave au moins grave : un badge montre le premier etat present (signaletique, principe 3).
export const GRAVITE = [
  "waiting",
  "error",
  "blocked",
  "active",
  "unknown",
  "done",
];

// forme : ring (anneau plein), panel (panneau rectangulaire), triangle, octagon, disc (rond plein), dashed (anneau pointille).
// L'icone est dessinee dans un carre de 16 x 16 ; « plein » : forme pleine et icone blanche, sinon trait de la couleur d'etat.
// « encre » remplace le blanc de l'icone et colore le bord de la forme : le « ! » sombre du panneau de danger jaune,
// lisible sur le jaune (signaletique, decision de PA du 21 octobre 2026).
const ENCRE = "#303841";
export const signes = {
  active: { label: "Actif", forme: "ring", icone: "gear", plein: false },
  waiting: {
    label: "Attend ta décision",
    forme: "panel",
    icone: "exclamation",
    plein: true,
  },
  blocked: {
    label: "Bloqué",
    forme: "triangle",
    icone: "exclamationLow",
    plein: true,
    encre: ENCRE,
  },
  error: { label: "En erreur", forme: "octagon", icone: "cross", plein: true },
  done: { label: "Terminé", forme: "disc", icone: "tick", plein: true },
  unknown: {
    label: "Inconnu",
    forme: "dashed",
    icone: "question",
    plein: false,
  },
};

const NS = "http://www.w3.org/2000/svg";

// Les formes et les icones, en primitives SVG : [balise, attributs].
const FORMES = {
  ring: [
    ["circle", { cx: 8, cy: 8, r: 6.6, fill: "none", "stroke-width": 1.8 }],
  ],
  dashed: [
    [
      "circle",
      {
        cx: 8,
        cy: 8,
        r: 6.6,
        fill: "none",
        "stroke-width": 1.6,
        "stroke-dasharray": "2.6 1.9",
      },
    ],
  ],
  panel: [["rect", { x: 1, y: 2, width: 14, height: 12, rx: 1.6 }]],
  triangle: [
    [
      "path",
      {
        d: "M8 1.2 15.4 14.6H.6Z",
        "stroke-linejoin": "round",
        "stroke-width": 0.8,
      },
    ],
  ],
  octagon: [["path", { d: "M5.2 1h5.6L15 5.2v5.6L10.8 15H5.2L1 10.8V5.2Z" }]],
  disc: [["circle", { cx: 8, cy: 8, r: 7 }]],
};
const ICONES = {
  gear: [
    ["circle", { cx: 8, cy: 8, r: 2, fill: "none", "stroke-width": 1.4 }],
    [
      "path",
      {
        d: "M8 3.6v1.6M8 10.8v1.6M3.6 8h1.6M10.8 8h1.6M4.9 4.9 6 6M10 10l1.1 1.1M4.9 11.1 6 10M10 6l1.1-1.1",
        fill: "none",
        "stroke-width": 1.4,
        "stroke-linecap": "round",
      },
    ],
  ],
  exclamation: [
    [
      "path",
      {
        d: "M8 4.6v4.6",
        fill: "none",
        "stroke-width": 2,
        "stroke-linecap": "round",
      },
    ],
    ["circle", { cx: 8, cy: 11.6, r: 1.1 }],
  ],
  // the triangle narrows towards its apex: the mark sits lower than in the rectangular panel
  exclamationLow: [
    [
      "path",
      {
        d: "M8 6v3.4",
        fill: "none",
        "stroke-width": 1.8,
        "stroke-linecap": "round",
      },
    ],
    ["circle", { cx: 8, cy: 12, r: 1 }],
  ],
  barrier: [
    [
      "path",
      {
        d: "M4.6 10h6.8M5.8 10v3M10.2 10v3",
        fill: "none",
        "stroke-width": 1.5,
        "stroke-linecap": "round",
      },
    ],
  ],
  cross: [
    [
      "path",
      {
        d: "M5.5 5.5l5 5M10.5 5.5l-5 5",
        fill: "none",
        "stroke-width": 1.8,
        "stroke-linecap": "round",
      },
    ],
  ],
  check: [
    [
      "path",
      {
        d: "M3 8.6 6.4 12 13 4.6",
        fill: "none",
        "stroke-width": 2,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
      },
    ],
  ],
  // a check sized to sit inside the disc
  tick: [
    [
      "path",
      {
        d: "M4.7 8.3 7 10.6 11.3 5.6",
        fill: "none",
        "stroke-width": 1.8,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
      },
    ],
  ],
  question: [
    [
      "path",
      {
        d: "M6.1 6.3a1.95 1.95 0 1 1 2.7 1.8c-.55.25-.8.6-.8 1.2v.4",
        fill: "none",
        "stroke-width": 1.5,
        "stroke-linecap": "round",
      },
    ],
    ["circle", { cx: 8, cy: 11.8, r: 0.95 }],
  ],
};

function trace(doc, parent, primitives, couleur) {
  for (const [balise, attrs] of primitives) {
    const el = doc.createElementNS(NS, balise);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    // un trait prend la couleur, un aplat aussi ; « fill: none » reste vide
    if (attrs.fill !== "none") el.setAttribute("fill", couleur);
    el.setAttribute("stroke", "stroke-width" in attrs ? couleur : "none");
    parent.append(el);
  }
}

// Le signe d'un etat, en SVG, decoratif : le mot est porte par l'element qui l'utilise (texte ou aria-label).
// Un etat inconnu de la table devient « unknown » : rien n'est invente.
export function signIcon(doc, state, size = 16) {
  const s = signes[state] ? state : "unknown";
  const { forme, icone, plein, encre } = signes[s];
  const svg = doc.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.dataset.state = s;
  const couleur = `var(--gdc-state-${s})`;
  trace(doc, svg, FORMES[forme], couleur);
  if (encre) for (const el of svg.children) el.setAttribute("stroke", encre);
  trace(doc, svg, ICONES[icone], encre || (plein ? "#FFFFFF" : couleur));
  return svg;
}

// Le premier etat present, du plus grave au moins grave ; null si tout est a zero.
export function plusGrave(counts = {}) {
  return GRAVITE.find((s) => Number(counts[s]) > 0) || null;
}
