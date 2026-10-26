// Le planning du chantier (lot G8) : l'histoire du chantier en Gantt, en bas du panneau, de l'etape a l'application, a
// la fiche et au lot. Fiche validee par Pierre-Alain le 22 octobre 2026 ; fabrication a GDC 0.20 (plan de l'atelier, I-7).
// - Il lit la sortie de gdc chronologie (schema 1, docs/planning-derniere-passe-de-gdc.md, sections 1, 4 et 5) et
//   n'affiche que ce que GDC envoie : tout schema autre que 1 donne « donnees illisibles », un champ inconnu est ignore.
// - Une mise a jour (gdc chronologie --depuis) s'applique sur ce qui est deja la ; une chronologie complete (complet:
//   true, ou sans depuis) le remplace. Dans les deux cas, ce qui est deplie, le defilement et la selection restent.
// - Le temps : un jour actif est une colonne de largeur fixe ; dans un jour, les heures se lisent de la premiere a la
//   derniere activite du jour (regle d'affichage de l'atelier) ; un jour vide est une colonne etroite, une suite de
//   jours vides un pli qui se deplie au clic. Le futur suit a_venir, sans date, deux jours actifs par element.
// - Deux cas de couleur seulement : le signe de l'element en cours (Actif ; En erreur pour un defaut ouvert) et
//   « Attend ta decision » sur un jalon attendu. Tout le reste en tons neutres, et chaque forme se lit sans la couleur.
// - Une grille arborescente ARIA virtuelle : seules les lignes en vue sont dans la page, a hauteur fixe ; un seul arret
//   de tabulation. Le survol partage par ctx.hoverLink ; la selection relayee par GDC entre par selected.
// - Sur telephone (moins de 600 px), la liste par fiche.

export const meta = {
  id: "site-schedule",
  version: "1.0.0",
  category: "interface",
  tag: "gdc-site-schedule",
  inputs: ["timeline", "selected", "highlight"],
  outputs: ["gdc-select", "gdc-hover"],
};

// Les mesures, en pixels : la page de demonstration et la galerie s'en servent pour la hauteur reduite (l'en-tete des
// jours et trois lignes : OUTILS + TETE + 3 * LIGNE).
export const mesures = {
  LIGNE: 28, // une ligne, quelle qu'elle soit
  OUTILS: 34, // la barre du titre et du detail
  TETE: 38, // l'en-tete des jours et la bande du regime
  NOM: 260, // la colonne des noms
  NOM_ETROIT: 190, // la colonne des noms sous 900 px
  JOUR: 240, // un jour actif
  VIDE: 10, // un jour vide
  PLI: 30, // une suite de jours vides, repliee
  DEPLIE: 26, // un jour d'un pli deplie
  MARGE: 14, // de part et d'autre de l'activite d'un jour actif
  ECART: 5, // en deca, deux coches d'une ligne se regroupent avec toutes celles du jour
};
const { LIGNE, OUTILS, TETE, JOUR, VIDE, PLI, DEPLIE, MARGE, ECART } = mesures;
const DEBORD = 10; // les lignes rendues au-dela de la vue, en haut et en bas
const JALON = 20; // l'ecart minimal entre deux jalons d'une meme ligne
const JOUR_MS = 86400000;

// Les mots des etats de GDC ; une valeur inconnue s'affiche telle quelle, sans etre devinee.
const ETATS = {
  faite: "faite",
  en_cours: "en cours",
  a_venir: "à venir",
  sans_trace: "sans trace au journal",
  livree: "livrée",
  abandonnee: "abandonnée",
  prevu: "prévu",
  fini: "fini",
  abandonne: "abandonné",
  ouvert: "ouvert",
  ferme: "fermé",
  deposee: "déposée",
  ecartee: "écartée",
  remplie: "remplie",
  a_completer: "à compléter",
  attendue: "attendue",
  accordee: "accordée",
  refusee: "refusée",
  perimee: "périmée",
};
const FINS = {
  normale: "fin",
  abandon: "fin abandon",
  archivee: "fin inconnue (archivée)",
};
const REGIMES = { pause: "pause", ferme: "fermé" };

// ---------------------------------------------------------------------------------------------------------------
// Le modele : des fonctions pures, sans page, controlees sur les quatre sequences de GDC (scripts/check-planning.mjs).

// « donnees illisibles » pour tout schema autre que 1
function lisible(t) {
  return Boolean(t) && typeof t === "object" && t.schema === 1;
}

const liste = (v) =>
  Array.isArray(v) ? v.filter((x) => x && typeof x === "object") : [];

// Une chronologie complete, ou une mise a jour appliquee sur la precedente (gdc chronologie --depuis).
function fusionne(avant, recu) {
  const complet = recu.complet === true || !("depuis" in recu) || !avant;
  if (complet)
    return {
      maintenant: recu.maintenant ?? null,
      fuseau: recu.fuseau ?? null,
      debut: recu.debut ?? null,
      jours: liste(recu.jours),
      regime: liste(recu.regime),
      lignes: liste(recu.lignes),
      jalons: liste(recu.jalons),
      a_venir: liste(recu.a_venir),
      evenements: liste(recu.evenements),
      complet: true,
    };
  const parId = (anciens, nouveaux, cle = "id") => {
    const m = new Map(anciens.map((x) => [x[cle], x]));
    for (const x of nouveaux) m.set(x[cle], x);
    return m;
  };
  const lignes = parId(avant.lignes, liste(recu.lignes));
  for (const id of Array.isArray(recu.retirees) ? recu.retirees : [])
    lignes.delete(id);
  const jours = [
    ...parId(avant.jours, liste(recu.jours), "date").values(),
  ].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return {
    maintenant: recu.maintenant ?? avant.maintenant,
    fuseau: recu.fuseau ?? avant.fuseau,
    debut: recu.debut ?? avant.debut,
    jours,
    regime: "regime" in recu ? liste(recu.regime) : avant.regime,
    lignes: [...lignes.values()],
    jalons: [...parId(avant.jalons, liste(recu.jalons)).values()],
    a_venir: "a_venir" in recu ? liste(recu.a_venir) : avant.a_venir,
    evenements: [...parId(avant.evenements, liste(recu.evenements)).values()],
    complet: false,
  };
}

const ms = (iso) => {
  const t = typeof iso === "string" ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? t : null;
};
const refDe = (l) =>
  l && l.ref && typeof l.ref === "object" && l.ref.application ? l.ref : null;

// L'arbre des lignes : les dix etapes dans l'ordre, puis les enfants dans l'ordre recu. Les lignes d'application sont
// masquees quand il n'y a qu'une application (regle d'affichage du planning) : leurs enfants montent d'un niveau.
function arbre(etat) {
  const lignes = new Map();
  for (const l of etat.lignes)
    if (typeof l.id === "string") lignes.set(l.id, l);
  const apps = new Set(
    etat.lignes
      .filter((l) => l.niveau === "application" && refDe(l))
      .map((l) => l.ref.application),
  );
  const unique = apps.size <= 1;
  const masquee = (l) => unique && l.niveau === "application";
  const enfants = new Map();
  const parent = new Map();
  const orphelines = [];
  const racines = [];
  const parentVisible = (l) => {
    let p = lignes.get(l.parent);
    while (p && masquee(p)) p = lignes.get(p.parent);
    return p ?? null;
  };
  for (const l of lignes.values()) {
    if (masquee(l)) continue;
    if (l.niveau === "etape" && (l.parent === null || l.parent === undefined)) {
      racines.push(l.id);
      continue;
    }
    const p = parentVisible(l);
    if (!p) {
      orphelines.push(l.id);
      continue;
    }
    parent.set(l.id, p.id);
    if (!enfants.has(p.id)) enfants.set(p.id, []);
    enfants.get(p.id).push(l.id);
  }
  racines.sort(
    (a, b) => (lignes.get(a).numero ?? 0) - (lignes.get(b).numero ?? 0),
  );
  return {
    lignes,
    enfants,
    parent,
    racines,
    orphelines,
    applications: apps.size,
  };
}

// Les lignes visibles, de haut en bas, selon ce qui est deplie
function visibles(a, deplies) {
  const out = [];
  const pose = (id, niveau) => {
    const kids = a.enfants.get(id) || [];
    out.push({ id, niveau, enfants: kids.length > 0 });
    if (kids.length && deplies.has(id))
      for (const k of kids) pose(k, niveau + 1);
  };
  for (const r of a.racines) pose(r, 1);
  return out;
}

// Les ancetres d'une ligne, pour l'ouvrir
function ancetres(a, id) {
  const out = [];
  for (let p = a.parent.get(id); p; p = a.parent.get(p)) out.push(p);
  return out;
}

// Les jours se coupent dans le fuseau de GDC : le debut d'une date AAAA-MM-JJ, en millisecondes
function debutDuJour(date, fuseau) {
  const [y, m, d] = String(date).split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d);
  if (!Number.isFinite(utc)) return null;
  const decalage = (t) => {
    const p = Object.fromEntries(
      fuseauFormat(fuseau, "parts")
        .formatToParts(new Date(t))
        .map((x) => [x.type, x.value]),
    );
    return (
      Date.UTC(
        +p.year,
        +p.month - 1,
        +p.day,
        +p.hour % 24,
        +p.minute,
        +p.second,
      ) - t
    );
  };
  let t = utc - decalage(utc);
  t = utc - decalage(t);
  return t;
}
const formats = new Map();
function fuseauFormat(fuseau, sorte) {
  const cle = `${fuseau}|${sorte}`;
  if (formats.has(cle)) return formats.get(cle);
  const options = {
    parts: {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    },
    jour: { day: "numeric", month: "short" },
    semaine: { weekday: "short", day: "numeric", month: "short" },
    numero: { day: "numeric" },
    heure: { hour: "2-digit", minute: "2-digit", second: "2-digit" },
    approche: {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    },
    date: {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    },
  }[sorte];
  let f;
  try {
    f = new Intl.DateTimeFormat(sorte === "parts" ? "en-CA" : "fr-CH", {
      ...options,
      timeZone: fuseau || "UTC",
    });
  } catch {
    f = new Intl.DateTimeFormat(sorte === "parts" ? "en-CA" : "fr-CH", {
      ...options,
      timeZone: "UTC",
    });
  }
  formats.set(cle, f);
  return f;
}

// L'axe du temps : des segments [t0, t1] -> [x0, x1], croissants. Un jour actif : sa marge, son activite (de la
// premiere a la derniere heure d'evenement du jour), sa marge ; un jour vide : une colonne etroite ; deux jours vides
// ou plus : un pli, sauf s'il est deplie. Puis le futur, a partir du bord droit du dernier jour.
function axe(etat, deplies = new Set()) {
  const fuseau = etat.fuseau;
  const parJour = new Map();
  for (const e of etat.evenements) {
    const t = ms(e.ts);
    if (t === null) continue;
    const d = dateDe(t, fuseau);
    const r = parJour.get(d);
    if (!r) parJour.set(d, [t, t]);
    else {
      r[0] = Math.min(r[0], t);
      r[1] = Math.max(r[1], t);
    }
  }
  const jours = etat.jours.filter(
    (j) => typeof j.date === "string" && debutDuJour(j.date, fuseau) !== null,
  );
  const colonnes = [];
  const segments = [];
  let x = 0;
  for (let i = 0; i < jours.length;) {
    const j = jours[i];
    const t0 = debutDuJour(j.date, fuseau);
    const t1 = t0 + JOUR_MS;
    if (j.actif) {
      const r = parJour.get(j.date);
      const [a, b] = r ? [Math.max(t0, r[0]), Math.min(t1, r[1])] : [t0, t1];
      if (b > a) {
        segments.push(
          [t0, a, x, x + MARGE],
          [a, b, x + MARGE, x + JOUR - MARGE],
          [b, t1, x + JOUR - MARGE, x + JOUR],
        );
      } else
        segments.push(
          [t0, a, x, x + JOUR / 2],
          [a, t1, x + JOUR / 2, x + JOUR],
        );
      colonnes.push({
        sorte: "jour",
        date: j.date,
        x,
        w: JOUR,
        t0,
        t1,
        evenements: j.evenements,
      });
      x += JOUR;
      i += 1;
      continue;
    }
    let k = i;
    while (k < jours.length && !jours[k].actif) k += 1;
    const suite = jours.slice(i, k);
    const cle = suite[0].date;
    if (suite.length >= 2 && !deplies.has(cle)) {
      const fin = debutDuJour(suite.at(-1).date, fuseau) + JOUR_MS;
      segments.push([t0, fin, x, x + PLI]);
      colonnes.push({
        sorte: "pli",
        date: cle,
        x,
        w: PLI,
        t0,
        t1: fin,
        jours: suite.map((s) => s.date),
      });
      x += PLI;
    } else {
      for (const s of suite) {
        const a = debutDuJour(s.date, fuseau);
        const w = suite.length >= 2 ? DEPLIE : VIDE;
        segments.push([a, a + JOUR_MS, x, x + w]);
        colonnes.push({
          sorte: suite.length >= 2 ? "deplie" : "vide",
          date: s.date,
          x,
          w,
          t0: a,
          t1: a + JOUR_MS,
          pli: suite.length >= 2 ? cle : null,
        });
        x += w;
      }
    }
    i = k;
  }
  const xDe = (t) => {
    if (t === null || !segments.length) return null;
    if (t <= segments[0][0]) return segments[0][2];
    let lo = 0;
    let hi = segments.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (segments[mid][0] <= t) lo = mid;
      else hi = mid - 1;
    }
    const [a, b, x0, x1] = segments[lo];
    if (t >= b) return x1;
    return x0 + ((t - a) / (b - a || 1)) * (x1 - x0);
  };
  const tMaintenant = ms(etat.maintenant);
  const xMaintenant = tMaintenant === null ? null : xDe(tMaintenant);
  // le futur : chaque element de a_venir apres son predecesseur, ou au bord droit des jours
  const futur0 = x;
  const places = new Map();
  const suivants = new Map(
    etat.a_venir
      .filter((v) => typeof v.ligne === "string")
      .map((v) => [v.ligne, v]),
  );
  const place = (id, vus = new Set()) => {
    if (places.has(id)) return places.get(id);
    const v = suivants.get(id);
    if (!v || vus.has(id)) return null;
    vus.add(id);
    const avant = v.apres ? place(v.apres, vus) : null;
    const debut = avant ? avant.x + avant.w : futur0;
    const p = { x: debut, w: 2 * JOUR };
    places.set(id, p);
    return p;
  };
  for (const id of suivants.keys()) place(id);
  const fin = Math.max(futur0, ...[...places.values()].map((p) => p.x + p.w));
  return {
    colonnes,
    segments,
    xDe,
    xMaintenant,
    futur0,
    futur: places,
    largeur: fin + 24,
  };
}

// le jour d'un instant dans le fuseau ; garde par quart d'heure (un fuseau ne change de decalage qu'a un quart d'heure plein) :
// formatToParts est lent, et chaque evenement en demande un
const jours = new Map();
function dateDe(t, fuseau) {
  const cle = `${fuseau}|${Math.floor(t / 900000)}`;
  let d = jours.get(cle);
  if (d === undefined) {
    d = jourDe(t, fuseau);
    if (jours.size > 50000) jours.clear();
    jours.set(cle, d);
  }
  return d;
}
function jourDe(t, fuseau) {
  const p = Object.fromEntries(
    fuseauFormat(fuseau, "parts")
      .formatToParts(new Date(t))
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}`;
}

// Les coches : chaque evenement trait: true va sur une ligne de sa reference exacte ; la ligne dont une barre le
// contient (a egalite, celle qu'il commence), sinon celle dont la derniere activite le precede. Un evenement que
// rien ne place est compte a part (scripts/check-planning.mjs).
function coches(etat, a) {
  const parRef = new Map();
  for (const l of a.lignes.values()) {
    const r = refDe(l);
    if (!r || !a.parent.has(l.id)) continue;
    const cle = cleRef(r);
    if (!parRef.has(cle)) parRef.set(cle, []);
    parRef.get(cle).push(l);
  }
  const parLigne = new Map();
  const perdues = [];
  for (const e of etat.evenements) {
    if (!e.trait) continue;
    const t = ms(e.ts);
    const r = refDe(e);
    const candidates = r ? parRef.get(cleRef(r)) || [] : [];
    let choisie = null;
    let meilleure = -Infinity;
    for (const l of candidates) {
      for (const b of liste(l.barres)) {
        const d = ms(b.debut);
        const f = b.fin === null ? Infinity : ms(b.fin);
        if (d === null || t === null || t < d || t > (f ?? d)) continue;
        // a egalite, la barre que l'evenement commence l'emporte sur celle qu'il finit
        const score = b.commence_par === e.id ? 3 : t < (f ?? d) ? 2 : 1;
        if (score > meilleure) {
          meilleure = score;
          choisie = l;
        }
      }
    }
    if (!choisie && t !== null) {
      let plusTard = -Infinity;
      for (const l of candidates) {
        const debuts = [
          ...liste(l.barres).map((b) => ms(b.debut)),
          ms(l.prevu_le),
          ms(l.livree?.date),
        ];
        for (const d of debuts)
          if (d !== null && d <= t && d > plusTard) {
            plusTard = d;
            choisie = l;
          }
      }
    }
    if (!choisie) {
      perdues.push(e.id);
      continue;
    }
    if (!parLigne.has(choisie.id)) parLigne.set(choisie.id, []);
    parLigne.get(choisie.id).push(e);
  }
  return { parLigne, perdues };
}
const cleRef = (r) =>
  [r.application, r.fiche ?? "", r.lot ?? ""].join("\u0001");

// Les jalons par ligne
function jalonsParLigne(etat) {
  const m = new Map();
  for (const j of etat.jalons) {
    if (typeof j.ligne !== "string") continue;
    if (!m.has(j.ligne)) m.set(j.ligne, []);
    m.get(j.ligne).push(j);
  }
  return m;
}

// Ce que montre une ligne, en pixels : barres, contour a venir, repere prevu, reperes d'apres git, jalons, coches
// (regroupees par jour quand deux coches sont a moins de ECART). Dans l'ordre de x : l'ordre du clavier.
function elements(l, ax, jalons, evts, fuseau) {
  const out = [];
  const xm = ax.xMaintenant;
  for (const [i, b] of liste(l.barres).entries()) {
    const x0 = ax.xDe(ms(b.debut));
    if (x0 === null) continue;
    const enCours = b.fin === null || b.fin === undefined;
    const x1 = enCours ? (xm ?? x0) : ax.xDe(ms(b.fin));
    out.push({
      sorte: "barre",
      cle: `barre:${i}`,
      x: x0,
      w: Math.max(3, (x1 ?? x0) - x0),
      barre: b,
      enCours,
      fin: enCours ? null : (b.fin_type ?? "normale"),
    });
  }
  const futur = ax.futur.get(l.id);
  if (futur)
    out.push({
      sorte: "avenir",
      cle: "avenir",
      x: futur.x + 4,
      w: futur.w - 8,
    });
  if (l.prevu_le) {
    const x = ax.xDe(ms(l.prevu_le));
    if (x !== null)
      out.push({ sorte: "prevu", cle: "prevu", x, date: l.prevu_le });
  }
  if (l.repere && l.repere.date) {
    const x = ax.xDe(ms(l.repere.date));
    if (x !== null)
      out.push({
        sorte: "repere",
        cle: "repere",
        x,
        date: l.repere.date,
        source: l.repere.source,
      });
  }
  for (const j of jalons || []) {
    const quand = j.prise ?? j.demandee;
    const source = j.prise ? "journal" : j.demandee_source;
    const x = quand ? ax.xDe(ms(quand)) : xm;
    if (x === null) continue;
    out.push({ sorte: "jalon", cle: `jalon:${j.id}`, x, jalon: j, source });
    if (j.etat === "perimee" && j.perimee_depuis?.date) {
      const xp = ax.xDe(ms(j.perimee_depuis.date));
      if (xp !== null)
        out.push({
          sorte: "repere",
          cle: `perime:${j.id}`,
          x: xp,
          date: j.perimee_depuis.date,
          source: j.perimee_depuis.source,
          jalon: j,
        });
    }
  }
  // les coches, par jour ; un jour trop etroit pour les separer les regroupe toutes, avec leur nombre
  const parJour = new Map();
  for (const e of evts || []) {
    const t = ms(e.ts);
    const x = ax.xDe(t);
    if (x === null) continue;
    const d = dateDe(t, fuseau);
    if (!parJour.has(d)) parJour.set(d, []);
    parJour.get(d).push({ x, e });
  }
  for (const [d, cs] of parJour) {
    cs.sort((p, q) => p.x - q.x);
    const serre = cs.some((c, i) => i > 0 && c.x - cs[i - 1].x < ECART);
    if (serre && cs.length > 1) {
      const x0 = cs[0].x;
      const x1 = cs.at(-1).x;
      out.push({
        sorte: "groupe",
        cle: `groupe:${d}`,
        x: (x0 + x1) / 2,
        x0,
        x1,
        evenements: cs.map((c) => c.e),
        jour: d,
      });
    } else
      for (const c of cs)
        out.push({
          sorte: "coche",
          cle: `coche:${c.e.id}`,
          x: c.x,
          evenement: c.e,
        });
  }
  out.sort((p, q) => p.x - q.x);
  // des jalons trop proches se posent cote a cote, dans l'ordre de leur date, au lieu de se recouvrir ; leur date
  // exacte reste dans le detail et la vue tableau
  let avant = -Infinity;
  for (const it of out) {
    if (it.sorte !== "jalon") continue;
    if (it.x - avant < JALON) it.x = avant + JALON;
    avant = it.x;
  }
  out.sort((p, q) => p.x - q.x);
  return out;
}

export const modele = {
  lisible,
  fusionne,
  arbre,
  visibles,
  ancetres,
  axe,
  coches,
  elements,
  jalonsParLigne,
  dateDe,
};

// ---------------------------------------------------------------------------------------------------------------

const CSS = `
:host { display: block; min-height: 0; height: 100%; font: 13px/1.3 var(--gdc-font-ui, system-ui, sans-serif); color: var(--gdc-ink);
  --nom: ${mesures.NOM}px; }
* { box-sizing: border-box; }
.planning { position: relative; display: flex; flex-direction: column; height: 100%; min-height: 0; overflow: hidden; border-radius: 12px;
  background: var(--gdc-surface); border: 1px solid color-mix(in srgb, var(--gdc-ink) 14%, transparent); }
.outils { position: relative; z-index: 4; flex: none; display: flex; background: var(--gdc-surface); align-items: center; gap: 10px; height: ${OUTILS}px; padding: 0 8px 0 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--gdc-ink) 10%, transparent); }
.titre { flex: none; margin: 0; font: 600 11px/1.3 var(--gdc-font-ui, system-ui, sans-serif); text-transform: uppercase; letter-spacing: .06em;
  color: var(--gdc-muted); }
.regime-actuel { flex: none; display: inline-flex; align-items: center; gap: 5px; color: var(--gdc-muted); font-size: 12px; }
.regime-actuel::before { content: ""; width: 14px; height: 6px; border-radius: 1px; background: color-mix(in srgb, var(--gdc-ink) 40%, transparent); }
.detail { flex: 1 1 auto; min-width: 0; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--gdc-muted); font-size: 12px; }
.detail strong { color: var(--gdc-ink); font-weight: 600; }
.bascule { flex: none; min-height: 26px; padding: 3px 10px; border: 1px solid color-mix(in srgb, var(--gdc-ink) 25%, transparent); border-radius: 7px;
  background: none; color: inherit; font: 500 12px/1 var(--gdc-font-ui, system-ui, sans-serif); cursor: pointer; }
.bascule:hover { background: color-mix(in srgb, var(--gdc-ink) 7%, transparent); }
.bascule[aria-pressed="true"] { background: var(--gdc-ink); color: var(--gdc-surface); border-color: var(--gdc-ink); }
.bascule:focus-visible, button:focus-visible { outline: 2px solid var(--gdc-ink); outline-offset: 2px; }
.message { margin: 12px; color: var(--gdc-muted); }
.defile { position: relative; flex: 1 1 auto; min-height: 0; overflow: auto; overscroll-behavior: contain; scrollbar-width: thin; }
.contenu { position: relative; }
/* l'en-tete des jours et la bande du regime : colles en haut ; le coin, colle a gauche aussi */
.tete { position: sticky; top: 0; z-index: 3; height: ${TETE}px; background: var(--gdc-surface);
  border-bottom: 1px solid color-mix(in srgb, var(--gdc-ink) 14%, transparent); }
.coin { position: sticky; left: 0; z-index: 2; float: left; width: var(--nom); height: 100%; padding: 6px 12px; background: var(--gdc-surface);
  color: var(--gdc-muted); font-size: 11px; border-right: 1px solid color-mix(in srgb, var(--gdc-ink) 14%, transparent); }
.jours { position: absolute; top: 0; height: 26px; }
.col { position: absolute; top: 0; height: 26px; padding: 6px 6px 0; overflow: hidden; white-space: nowrap; font-size: 11px; color: var(--gdc-muted);
  border-left: 1px solid color-mix(in srgb, var(--gdc-ink) 10%, transparent); font-variant-numeric: tabular-nums; }
.col.jour { color: var(--gdc-ink); font-weight: 500; }
.col.vide { background: color-mix(in srgb, var(--gdc-ink) 4%, transparent); }
.col.deplie { padding: 6px 0 0; text-align: center; background: color-mix(in srgb, var(--gdc-ink) 4%, transparent); }
/* un pli : une bande hachuree, sans le mot « abandonne » ; elle se deplie au clic et au clavier */
.col.pli { padding: 0; }
.pli-bouton { width: 100%; height: 26px; padding: 0; border: 0; border-radius: 0; cursor: pointer; color: var(--gdc-muted); font: 600 10px/1 var(--gdc-font-ui, system-ui, sans-serif);
  background: repeating-linear-gradient(135deg, color-mix(in srgb, var(--gdc-ink) 14%, transparent) 0 3px, transparent 3px 6px); }
.pli-bouton:hover { color: var(--gdc-ink); background-color: color-mix(in srgb, var(--gdc-ink) 6%, transparent); }
.repli { position: absolute; top: 2px; height: 22px; padding: 0 6px; border: 1px solid color-mix(in srgb, var(--gdc-ink) 25%, transparent); border-radius: 6px;
  background: var(--gdc-surface); color: var(--gdc-muted); font: 500 10px/1 var(--gdc-font-ui, system-ui, sans-serif); cursor: pointer; }
.col.avenir { color: var(--gdc-muted); font-style: italic; border-left: 1px dashed color-mix(in srgb, var(--gdc-ink) 30%, transparent); }
.regime { position: absolute; top: 28px; height: 6px; }
.regime span { position: absolute; top: 0; height: 6px; border-radius: 1px; }
/* la bande du regime : un trait fin pour le chantier ouvert, un bloc pour la pause, plus fonce pour le chantier ferme */
.regime::before { content: ""; position: absolute; left: 0; right: 0; top: 2.5px; border-top: 1px solid color-mix(in srgb, var(--gdc-ink) 14%, transparent); }
.regime .pause { background: color-mix(in srgb, var(--gdc-ink) 40%, transparent); }
.regime .ferme { background: color-mix(in srgb, var(--gdc-ink) 75%, transparent); }
.maintenant { position: absolute; top: 0; bottom: 0; width: 0; border-left: 1px solid color-mix(in srgb, var(--gdc-ink) 55%, transparent); pointer-events: none; z-index: 1; }
.tete .maintenant::after { content: ""; position: absolute; top: 20px; left: -4px; border: 4px solid transparent; border-top-color: var(--gdc-ink); }
/* les lignes : poses a leur place, elles se touchent (aucune zone sans reference entre deux lignes) */
[role="treegrid"] { position: absolute; left: 0; top: ${TETE}px; right: 0; outline: none; }
.ligne { position: absolute; left: 0; height: ${LIGNE}px; display: flex; outline: none; contain: layout style; }
.ligne:hover > .nom, .ligne:hover > .temps { background-color: color-mix(in srgb, var(--gdc-ink) 5%, var(--gdc-surface)); }
.ligne:hover > .temps { background-color: color-mix(in srgb, var(--gdc-ink) 4%, transparent); }
.ligne:focus-visible > .nom { outline: 2px solid var(--gdc-ink); outline-offset: -2px; }
.nom { position: sticky; left: 0; z-index: 1; flex: none; display: flex; align-items: center; gap: 5px; width: var(--nom); height: 100%;
  padding: 0 8px 0 calc(6px + (var(--niveau) - 1) * 14px); background: var(--gdc-surface); cursor: pointer;
  border-right: 1px solid color-mix(in srgb, var(--gdc-ink) 14%, transparent); white-space: nowrap; }
.nom .texte { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.nom .etat { flex: none; color: var(--gdc-muted); font-size: 11px; }
.etape > .nom { font-weight: 600; }
.piece > .nom, .piece > .nom .texte { color: var(--gdc-muted); }
.ouvre { flex: none; display: inline-grid; place-items: center; width: 18px; height: 18px; border-radius: 4px; color: var(--gdc-muted); }
.ouvre svg { width: 9px; height: 9px; }
.ligne[aria-expanded="true"] .ouvre svg { transform: rotate(90deg); }
.ouvre.sans { visibility: hidden; }
.signe { flex: none; display: inline-grid; place-items: center; width: 16px; height: 16px; }
@keyframes gdc-spin { to { transform: rotate(360deg); } }
.gdc-spin { transform-box: view-box; transform-origin: 8px 8px; animation: gdc-spin 6s linear infinite; animation-play-state: var(--gdc-play, running); }
@media (prefers-reduced-motion: reduce) { .gdc-spin { animation: none; } }
.temps { position: relative; flex: none; height: 100%; }
/* la ligne choisie : le fond et le trait de la selection de l'arbre ; la marque du survol, plus legere */
.ligne[aria-selected="true"] > .nom, .ligne[aria-selected="true"] > .temps { background-color: color-mix(in srgb, var(--gdc-ink) 11%, var(--gdc-surface)); }
.ligne[aria-selected="true"] > .nom { box-shadow: inset 3px 0 0 var(--gdc-ink); font-weight: 600; }
.ligne[data-highlight] > .nom, .ligne[data-highlight] > .temps { background-color: color-mix(in srgb, var(--gdc-ink) 6%, var(--gdc-surface)); }
.ligne[data-highlight] > .temps { box-shadow: var(--gdc-highlight-ring); }
.ligne[aria-selected="true"][data-highlight] > .nom { box-shadow: inset 3px 0 0 var(--gdc-ink), var(--gdc-highlight-ring); }
/* les elements d'une ligne */
.el { position: absolute; top: 0; height: 100%; padding: 0; border: 0; background: none; color: inherit; cursor: pointer; outline: none; }
.el:focus-visible::after { content: ""; position: absolute; inset: 3px -3px; border: 2px solid var(--gdc-ink); border-radius: 4px; }
.barre { --fond: color-mix(in srgb, var(--gdc-ink) 30%, transparent); }
.barre::before { content: ""; position: absolute; left: 0; right: 0; top: 9px; height: 10px; border-radius: 2px; background: var(--fond); }
.ligne[data-highlight] .barre, .ligne[aria-selected="true"] .barre { --fond: color-mix(in srgb, var(--gdc-ink) 55%, transparent); }
.barre.active { --fond: var(--gdc-state-active); }
.barre.error { --fond: var(--gdc-state-error); }
.ligne[data-highlight] .barre.active, .ligne[aria-selected="true"] .barre.active { --fond: var(--gdc-state-active); }
.ligne[data-highlight] .barre.error, .ligne[aria-selected="true"] .barre.error { --fond: var(--gdc-state-error); }
/* les fins : un bout droit (normale), coupe en biais (abandon), qui s'estompe (archivee), en pointe (en cours) */
.barre.abandon::before { clip-path: polygon(0 0, 100% 0, calc(100% - 7px) 100%, 0 100%); border-radius: 2px 0 0 2px; }
.barre.archivee::before { -webkit-mask-image: linear-gradient(90deg, #000 calc(100% - 14px), transparent); mask-image: linear-gradient(90deg, #000 calc(100% - 14px), transparent); }
.barre.ouverte::before { clip-path: polygon(0 0, calc(100% - 5px) 0, 100% 50%, calc(100% - 5px) 100%, 0 100%); border-radius: 2px 0 0 2px; }
.ligne[data-escalier] .barre::before { box-shadow: inset 0 0 0 1px var(--gdc-ink); }
.avenir { pointer-events: none; }
.avenir::before { content: ""; position: absolute; left: 0; right: 0; top: 9px; height: 10px; border-radius: 2px;
  border: 1px dashed color-mix(in srgb, var(--gdc-ink) 40%, transparent); }
/* un repere a sa date : prevu (rond creux, date du journal), d'apres git (trait pointille) */
.prevu, .repere, .jalon, .coche, .groupe { width: 14px; margin-left: -7px; }
.prevu::before { content: ""; position: absolute; left: 3px; top: 10px; width: 8px; height: 8px; border-radius: 50%;
  border: 1.5px solid color-mix(in srgb, var(--gdc-ink) 70%, transparent); background: var(--gdc-surface); }
.prevu.abandonne::after { content: ""; position: absolute; left: 1px; top: 13px; width: 12px; height: 1.5px; background: var(--gdc-ink); transform: rotate(-45deg); }
.repere::before { content: ""; position: absolute; left: 6px; top: 3px; bottom: 3px; border-left: 2px dotted color-mix(in srgb, var(--gdc-ink) 65%, transparent); }
.jalon svg { position: absolute; left: 0; top: 7px; width: 14px; height: 14px; overflow: visible; }
.jalon.attendue svg { left: -1px; top: 6px; width: 16px; height: 16px; }
.coche::before { content: ""; position: absolute; left: 6px; top: 8px; width: 1.5px; height: 12px; background: color-mix(in srgb, var(--gdc-ink) 75%, transparent); }
.groupe { width: auto; min-width: 18px; margin-left: 0; transform: translateX(-50%); }
.groupe span { display: inline-grid; place-items: center; min-width: 18px; height: 14px; margin-top: 7px; padding: 0 4px; border-radius: 7px;
  font: 600 10px/1 var(--gdc-font-ui, system-ui, sans-serif); font-variant-numeric: tabular-nums; color: var(--gdc-surface);
  background: color-mix(in srgb, var(--gdc-ink) 70%, transparent); }
/* le trait ou le jalon choisi */
.el[data-choisi]::after { content: ""; position: absolute; inset: 4px -2px; border: 2px solid var(--gdc-ink); border-radius: 4px; }
.coche[data-choisi]::before { width: 3px; left: 5.5px; background: var(--gdc-ink); }
.escalier { position: absolute; left: 0; top: ${TETE}px; pointer-events: none; overflow: visible; z-index: 0; }
.escalier path { fill: none; stroke: var(--gdc-ink); stroke-width: 1; }
/* la vue tableau et la liste du telephone */
.tableau { flex: 1 1 auto; min-height: 0; overflow: auto; padding: 0 8px 8px; }
table { width: 100%; border-collapse: collapse; font-size: 12px; font-variant-numeric: tabular-nums; }
caption { text-align: left; padding: 8px 4px; color: var(--gdc-muted); }
th, td { padding: 4px 6px; text-align: left; vertical-align: top; border-bottom: 1px solid color-mix(in srgb, var(--gdc-ink) 10%, transparent); }
th { position: sticky; top: 0; background: var(--gdc-surface); font-weight: 600; }
.approche { font-style: italic; }
.telephone { display: none; flex: 1 1 auto; min-height: 0; overflow: auto; padding: 4px 8px 8px; }
.telephone ul { list-style: none; margin: 0; padding: 0; }
.fiche-tel { display: grid; grid-template-columns: 16px minmax(0, 1fr); gap: 2px 8px; width: 100%; min-height: 44px; padding: 6px 8px; border: 0; border-radius: 8px;
  background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.fiche-tel:hover { background: color-mix(in srgb, var(--gdc-ink) 7%, transparent); }
.fiche-tel[aria-current="true"] { background: color-mix(in srgb, var(--gdc-ink) 11%, transparent); box-shadow: inset 3px 0 0 var(--gdc-ink); }
.fiche-tel[data-highlight] { background: var(--gdc-highlight-fill); box-shadow: var(--gdc-highlight-ring); }
.fiche-tel .texte { font-weight: 500; }
.fiche-tel .sous { grid-column: 2; color: var(--gdc-muted); font-size: 12px; }
.app-tel { margin: 10px 8px 2px; font: 600 11px/1.3 var(--gdc-font-ui, system-ui, sans-serif); text-transform: uppercase; letter-spacing: .06em; color: var(--gdc-muted); }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
[hidden] { display: none !important; }
@media (max-width: 900px) { :host { --nom: ${mesures.NOM_ETROIT}px; } }
@media (max-width: 600px) {
  .grille-zone, .bascule, .tableau { display: none !important; }
  .telephone { display: block; }
  .detail { display: none; }
}
`;

export function define(registry, ctx) {
  const { correspond, sameRef } = ctx;
  // la largeur du telephone, la meme que la regle CSS : la liste par fiche
  const TELEPHONE = globalThis.matchMedia?.("(max-width: 600px)");
  // Les signes, faits une fois par etat puis clones : la roue d'« Actif » tourne par la feuille du planning (gdc-spin,
  // la meme regle que src/signes.js), pas par une feuille <style> dans chaque signe. Une feuille par ligne inseree
  // forcait a recalculer le style de tout le planning a chaque ligne qui entre en vue (mesure du 22 octobre 2026).
  const modeles = new Map();
  const signIcon = (doc, etat) => {
    if (!modeles.has(etat)) {
      const s = ctx.signIcon(doc, etat, 16);
      s.querySelector("style")?.remove();
      modeles.set(etat, s);
    }
    return modeles.get(etat).cloneNode(true);
  };

  class SiteSchedule extends HTMLElement {
    #data = {};
    #etat = null; // la chronologie lue (complete ou mise a jour)
    #illisible = null; // le schema recu quand il n'est pas 1
    #arbre = null;
    #axe = null;
    #coches = null;
    #jalons = null;
    #attentesSous = new Map(); // ligne -> les jalons attendus de ses descendants (montres quand elle est repliee)
    #visibles = [];
    #index = new Map(); // id de ligne -> rang visible
    #deplies = new Set(); // les lignes ouvertes
    #pliesOuverts = new Set(); // les plis deplies (par la date de leur premier jour)
    #pliFocus = null; // le dernier pli bascule : il garde l'arret de tabulation de la barre des jours
    #premier = true; // le premier rendu ouvre les etapes en cours et se centre
    #highlight = null;
    #selected = null;
    #choix = { lignes: new Set(), evt: null, jalon: null }; // ce qui est marque
    #pool = new Map(); // id -> element de ligne rendu
    #plage = ""; // la plage rendue (premier, dernier, version) : un defilement dans la meme plage ne refait rien
    #version = 0; // change quand les lignes visibles ou leur contenu changent
    #arret = null; // l'element qui porte l'arret de tabulation
    #premiereRendue = 0; // le rang de la premiere ligne en vue au dernier rendu
    #places = new WeakMap(); // ligne rendue -> { i, ouvert } : son rang et son etat ecrits
    #escalierIds = new Set(); // les lignes de la fiche survolee ou choisie
    #refs = new WeakMap(); // noeud -> reference (le survol partage)
    #infos = new WeakMap(); // noeud -> { ligne, element } (le detail et le clic)
    #focus = { ligne: null, element: null }; // l'arret de tabulation : une ligne, ou un element dans la ligne
    #survole = null; // le noeud sous le pointeur, pour le detail
    #tableau = false;
    #raf = 0;
    #els = {};

    constructor() {
      super();
      const root = this.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = CSS;
      const section = document.createElement("section");
      section.className = "planning";
      section.setAttribute("aria-label", "Planning du chantier");
      const outils = el("div", "outils");
      const titre = el("p", "titre", "Planning");
      titre.setAttribute("aria-hidden", "true");
      const regime = el("span", "regime-actuel");
      regime.hidden = true;
      const detail = el("p", "detail");
      const bascule = el("button", "bascule", "Vue tableau");
      bascule.type = "button";
      bascule.setAttribute("aria-pressed", "false");
      outils.append(titre, regime, detail, bascule);
      const message = el("p", "message");
      message.hidden = true;
      const zone = el("div", "grille-zone defile");
      const contenu = el("div", "contenu");
      const tete = el("div", "tete");
      const coin = el("div", "coin", "");
      const jours = el("div", "jours");
      jours.setAttribute("role", "toolbar");
      jours.setAttribute("aria-label", "Les jours");
      const bande = el("div", "regime");
      bande.setAttribute("aria-hidden", "true");
      const repereTete = el("div", "maintenant");
      tete.append(coin, jours, bande, repereTete);
      const grille = el("div", "grille");
      grille.setAttribute("role", "treegrid");
      grille.setAttribute("aria-label", "Planning du chantier, par étape");
      const escalier = document.createElementNS(SVG, "svg");
      escalier.setAttribute("class", "escalier");
      escalier.setAttribute("aria-hidden", "true");
      const maintenant = el("div", "maintenant");
      maintenant.style.top = `${TETE}px`;
      contenu.append(tete, escalier, grille, maintenant);
      zone.append(contenu);
      const tableau = el("div", "tableau");
      tableau.hidden = true;
      const telephone = el("div", "telephone");
      section.append(outils, message, zone, tableau, telephone);
      root.append(style, section);
      Object.assign(this.#els, {
        outils,
        regime,
        detail,
        bascule,
        message,
        zone,
        contenu,
        tete,
        coin,
        jours,
        bande,
        repereTete,
        grille,
        escalier,
        maintenant,
        tableau,
        telephone,
      });

      zone.addEventListener("scroll", () => this.#planifie(), {
        passive: true,
      });
      grille.addEventListener("click", (ev) => this.#clic(ev));
      grille.addEventListener("keydown", (ev) => this.#touche(ev));
      grille.addEventListener("focusin", (ev) => this.#focusDe(ev.target));
      grille.addEventListener("pointerover", (ev) => {
        this.#survole = ev.target.closest?.(".el, .ligne") ?? null;
        this.#montreDetail();
      });
      grille.addEventListener("pointerleave", () => {
        this.#survole = null;
        this.#montreDetail();
      });
      jours.addEventListener("click", (ev) => {
        const b = ev.target.closest("button[data-pli]");
        if (b) this.#basculePli(b.dataset.pli);
      });
      jours.addEventListener("keydown", (ev) => this.#toucheJours(ev));
      // sorti de la barre des jours, l'arret revient au premier pli en vue
      jours.addEventListener("focusout", (ev) => {
        if (!jours.contains(ev.relatedTarget)) this.#pliFocus = null;
      });
      bascule.addEventListener("click", () => {
        this.#tableau = !this.#tableau;
        bascule.setAttribute("aria-pressed", String(this.#tableau));
        this.#rendVue();
      });
      telephone.addEventListener("click", (ev) => {
        const b = ev.target.closest("button.fiche-tel");
        const info = b && this.#infos.get(b);
        if (info) this.#choisit(info.ligne, info.element);
      });
      ctx.hoverLink(this, (n) => this.#refs.get(n) ?? null);
    }

    // un planning recu avant d'etre dans la page se centre a sa premiere mise en page ; la liste du telephone se fait
    // quand l'ecran passe sous 600 px
    #auTelephone = () => {
      if (TELEPHONE?.matches && this.#etat) this.#rendTelephone();
    };
    connectedCallback() {
      TELEPHONE?.addEventListener("change", this.#auTelephone);
      if (this.#etat && this.#premier)
        requestAnimationFrame(() => {
          if (!this.#premier || !this.isConnected) return;
          this.#premier = false;
          this.#centre();
        });
      this.#planifie();
    }

    disconnectedCallback() {
      TELEPHONE?.removeEventListener("change", this.#auTelephone);
      cancelAnimationFrame(this.#raf);
      this.#raf = 0;
    }

    get data() {
      return this.#data;
    }
    // { timeline } : la premiere chronologie est l'etat de depart ; une mise a jour s'applique sur ce qui est la
    set data(value) {
      this.#data = value && typeof value === "object" ? value : {};
      const t = this.#data.timeline;
      if (t === undefined || t === null) {
        this.#etat = null;
        this.#illisible = null;
      } else if (!lisible(t)) {
        this.#illisible =
          t && typeof t === "object" ? (t.schema ?? "absent") : "absent";
        this.#etat = null;
      } else {
        this.#illisible = null;
        this.#etat = fusionne(this.#etat, t);
      }
      this.#construit();
    }

    get highlight() {
      return this.#highlight;
    }
    // la reference survolee ailleurs : pose ou retire la marque, sans redessiner
    set highlight(ref) {
      this.#highlight = ref ?? null;
      this.#marque();
    }

    get selected() {
      return this.#selected;
    }
    // le dernier gdc-select relaye par GDC, d'ou qu'il vienne : une ref ouvre les lignes qui la portent et defile jusqu'a
    // elles ; etape ouvre l'etape ; evt marque son trait
    set selected(value) {
      this.#selected = value && typeof value === "object" ? value : null;
      this.#appliqueChoix(true);
    }

    // ---- construction ----

    #construit() {
      const { message, zone } = this.#els;
      const ancre = this.#ancre();
      if (!this.#etat) {
        message.hidden = false;
        message.textContent =
          this.#illisible === null
            ? "Chargement du planning…"
            : `Données illisibles : la chronologie porte le schéma ${this.#illisible}, le planning lit le schéma 1.`;
        zone.hidden = true;
        this.#els.bascule.hidden = true;
        this.#els.tableau.hidden = true;
        this.#els.telephone.replaceChildren();
        this.#els.regime.hidden = true;
        this.#els.detail.textContent = "";
        return;
      }
      message.hidden = true;
      zone.hidden = false;
      this.#arbre = arbre(this.#etat);
      this.#coches = coches(this.#etat, this.#arbre);
      this.#jalons = jalonsParLigne(this.#etat);
      // une decision qui t'attend reste visible : repliee, une ligne montre les jalons attendus de ses descendants
      this.#attentesSous = new Map();
      for (const j of this.#etat.jalons) {
        if (j.etat !== "attendue" || !this.#arbre.lignes.has(j.ligne)) continue;
        for (const p of ancetres(this.#arbre, j.ligne)) {
          if (!this.#attentesSous.has(p)) this.#attentesSous.set(p, []);
          this.#attentesSous.get(p).push(j);
        }
      }
      // ce qui est deplie reste ; une ligne disparue s'oublie
      for (const id of [...this.#deplies])
        if (!this.#arbre.lignes.has(id)) this.#deplies.delete(id);
      if (this.#premier) {
        for (const id of this.#arbre.racines)
          if (this.#arbre.lignes.get(id).etat === "en_cours")
            this.#deplies.add(id);
      }
      this.#axe = axe(this.#etat, this.#pliesOuverts);
      this.#relit();
      this.#rendTete();
      this.#rendRegime();
      this.#vide();
      this.#appliqueChoix(false);
      if (this.#premier && this.isConnected) {
        this.#premier = false;
        this.#centre();
      } else if (ancre) this.#retrouve(ancre);
      this.#rendVue();
    }

    // les lignes visibles et leur rang
    #relit() {
      this.#version += 1;
      this.#visibles = visibles(this.#arbre, this.#deplies);
      this.#index = new Map(this.#visibles.map((v, i) => [v.id, i]));
      const { contenu, grille, escalier, maintenant } = this.#els;
      const largeur = this.#axe.largeur;
      const hauteur = TETE + this.#visibles.length * LIGNE;
      contenu.style.width = `calc(var(--nom) + ${largeur}px)`;
      contenu.style.height = `${hauteur}px`;
      grille.setAttribute("aria-rowcount", String(this.#visibles.length));
      escalier.setAttribute("width", "1");
      escalier.style.width = `calc(var(--nom) + ${largeur}px)`;
      escalier.style.height = `${this.#visibles.length * LIGNE}px`;
      const xm = this.#axe.xMaintenant;
      for (const m of [maintenant, this.#els.repereTete]) {
        m.hidden = xm === null;
        if (xm !== null) m.style.left = `calc(var(--nom) + ${xm}px)`;
      }
      // les lignes ont bouge : l'escalier se redessine
      this.#escalier();
    }

    // l'en-tete : les jours, les plis, le futur
    #rendTete() {
      const { jours, coin } = this.#els;
      const f = this.#etat.fuseau;
      const enfants = [];
      const actifs = this.#axe.colonnes.filter(
        (c) => c.sorte === "jour",
      ).length;
      for (const c of this.#axe.colonnes) {
        const d = el("div", `col ${c.sorte}`);
        d.style.left = `${c.x}px`;
        d.style.width = `${c.w}px`;
        const date = new Date(c.t0 + JOUR_MS / 2);
        if (c.sorte === "jour") {
          d.textContent = fuseauFormat(
            f,
            actifs === 1 ? "semaine" : "jour",
          ).format(date);
          d.title = `${c.evenements ?? 0} événement(s)`;
        } else if (c.sorte === "vide") {
          d.title = `${fuseauFormat(f, "jour").format(date)} : aucune activité`;
          d.setAttribute("aria-label", d.title);
        } else if (c.sorte === "deplie") {
          d.textContent = fuseauFormat(f, "numero").format(date);
          d.title = `${fuseauFormat(f, "jour").format(date)} : aucune activité`;
        } else if (c.sorte === "pli") {
          const b = el("button", "pli-bouton", `${c.jours.length} j`);
          b.type = "button";
          b.dataset.pli = c.date;
          b.tabIndex = -1;
          b.setAttribute("aria-expanded", "false");
          const de = fuseauFormat(f, "jour").format(
            new Date(c.t0 + JOUR_MS / 2),
          );
          const a = fuseauFormat(f, "jour").format(
            new Date(c.t1 - JOUR_MS / 2),
          );
          b.setAttribute(
            "aria-label",
            `${c.jours.length} jours sans activité, du ${de} au ${a} : déplier`,
          );
          b.title = `${c.jours.length} jours sans activité (${de} – ${a})`;
          d.append(b);
        }
        enfants.push(d);
      }
      // un pli deplie se replie par un bouton pose sur son premier jour
      for (const cle of this.#pliesOuverts) {
        const c = this.#axe.colonnes.find((x) => x.pli === cle);
        if (!c) continue;
        const n = this.#axe.colonnes.filter((x) => x.pli === cle).length;
        const b = el("button", "repli", `Replier ${n} j`);
        b.type = "button";
        b.dataset.pli = cle;
        b.tabIndex = -1;
        b.setAttribute("aria-expanded", "true");
        b.setAttribute("aria-label", `${n} jours sans activité : replier`);
        b.style.left = `${c.x + 2}px`;
        enfants.push(b);
      }
      if (this.#axe.futur.size) {
        const d = el("div", "col avenir", "À venir, sans date");
        d.style.left = `${this.#axe.futur0}px`;
        d.style.width = `${this.#axe.largeur - this.#axe.futur0}px`;
        enfants.push(d);
      }
      // dans l'ordre des dates : le bouton « Replier » d'un pli deplie vient a sa place, pour le clavier aussi
      enfants.sort((p, q) => parseFloat(p.style.left) - parseFloat(q.style.left));
      jours.replaceChildren(...enfants);
      jours.style.left = "var(--nom)";
      jours.style.width = `${this.#axe.largeur}px`;
      this.#arretJours();
      coin.textContent = this.#etat.debut ? "" : "Projet non ouvert";
    }

    // la bande du regime, sous l'en-tete ; une pause en cours, ouverte jusqu'a maintenant
    #rendRegime() {
      const { bande, regime } = this.#els;
      const parts = [];
      let enCours = null;
      for (const r of this.#etat.regime) {
        const sorte = REGIMES[r.valeur];
        if (!sorte) continue;
        const x0 = this.#axe.xDe(ms(r.de));
        const fin = r.a === null || r.a === undefined;
        const x1 = fin ? this.#axe.xMaintenant : this.#axe.xDe(ms(r.a));
        if (fin) enCours = r;
        if (x0 === null || x1 === null) continue;
        const s = el("span", r.valeur);
        s.style.left = `${x0}px`;
        s.style.width = `${Math.max(3, x1 - x0)}px`;
        parts.push(s);
      }
      bande.replaceChildren(...parts);
      bande.style.left = "var(--nom)";
      bande.style.width = `${this.#axe.largeur}px`;
      regime.hidden = !enCours;
      if (enCours) {
        const de = ms(enCours.de);
        regime.textContent = `Chantier ${REGIMES[enCours.valeur] === "fermé" ? "fermé" : "en pause"} depuis ${de === null ? "?" : fuseauFormat(this.#etat.fuseau, "heure").format(new Date(de))}`;
      }
    }

    // ---- la liste virtuelle ----

    #planifie() {
      if (this.#raf || !this.isConnected) return;
      this.#raf = requestAnimationFrame(() => {
        this.#raf = 0;
        this.#rendLignes();
        this.#arretJours();
      });
    }

    // refait toutes les lignes ; celle qui avait le focus (ou son element) le retrouve
    #vide() {
      const avait = this.#els.grille.contains(this.shadowRoot.activeElement);
      for (const n of this.#pool.values()) n.remove();
      this.#pool.clear();
      this.#version += 1;
      this.#rendLignes();
      const { ligne, element } = this.#focus;
      if (avait && ligne && this.#index.has(ligne)) this.#va(ligne, element);
    }

    #rendLignes() {
      if (!this.#etat || this.#els.zone.hidden) return;
      const { zone, grille } = this.#els;
      // la ligne i occupe [TETE + i * LIGNE, TETE + (i + 1) * LIGNE] ; la vue, [scrollTop + TETE, scrollTop + hauteur]
      // sous l'en-tete. Rien au-dessus de la vue : le nom colle a gauche d'une ligne cachee sous l'en-tete deborde sur
      // la barre du titre ; en dessous, DEBORD lignes d'avance.
      const haut = zone.scrollTop;
      const h = zone.clientHeight || 400;
      const premier = Math.max(0, Math.floor(haut / LIGNE));
      const dernier = Math.min(this.#visibles.length - 1, Math.ceil((haut + h - TETE) / LIGNE) + DEBORD);
      // la meme plage, les memes lignes : rien a refaire (le defilement d'une fraction de ligne)
      this.#premiereRendue = premier;
      const plage = `${premier}:${dernier}:${this.#version}:${this.#focus.ligne}`;
      if (plage === this.#plage && this.#pool.size) return;
      this.#plage = plage;
      const garde = new Set();
      for (let i = premier; i <= dernier; i++) garde.add(this.#visibles[i].id);
      // la ligne qui a le focus reste dans la page, meme hors de vue
      if (this.#focus.ligne && this.#index.has(this.#focus.ligne))
        garde.add(this.#focus.ligne);
      for (const [id, n] of this.#pool)
        if (!garde.has(id)) {
          n.remove();
          this.#pool.delete(id);
        }
      const nouveaux = [];
      for (const id of garde) {
        const i = this.#index.get(id);
        let n = this.#pool.get(id);
        if (!n) {
          n = this.#ligne(this.#visibles[i]);
          this.#pool.set(id, n);
          nouveaux.push(n);
        }
        // seulement ce qui change : une ecriture, meme identique, invalide le style de la ligne
        const ouvert = this.#visibles[i].enfants ? String(this.#deplies.has(id)) : null;
        const avant = this.#places.get(n);
        if (avant?.i === i && avant.ouvert === ouvert) continue;
        this.#places.set(n, { i, ouvert });
        n.style.top = `${i * LIGNE}px`;
        n.setAttribute("aria-rowindex", String(i + 1));
        if (ouvert !== null) n.setAttribute("aria-expanded", ouvert);
      }
      if (nouveaux.length) grille.append(...nouveaux);
      this.#tabulation();
    }

    // une ligne : son nom (colle a gauche) et son temps
    #ligne(v) {
      const l = this.#arbre.lignes.get(v.id);
      const ref = refDe(l);
      const n = el("div", `ligne ${l.niveau}`);
      n.setAttribute("role", "row");
      n.setAttribute("aria-level", String(v.niveau));
      n.dataset.id = l.id;
      n.tabIndex = -1;
      if (ref) this.#refs.set(n, ref);
      this.#infos.set(n, { ligne: l, element: null });
      n.style.setProperty("--niveau", String(v.niveau));
      const nom = el("div", "nom");
      nom.setAttribute("role", "rowheader");
      const ouvre = el("span", v.enfants ? "ouvre" : "ouvre sans");
      ouvre.append(chevron());
      const signe = el("span", "signe");
      const s = signeDe(l);
      if (s) signe.append(signIcon(document, s, 16));
      const texte = el("span", "texte", nomDe(l));
      nom.append(ouvre, signe, texte);
      if (
        l.niveau === "piece" ||
        l.niveau === "lot" ||
        l.etat === "abandonnee" ||
        l.etat === "livree"
      )
        nom.append(el("span", "etat", ETATS[l.etat] ?? String(l.etat ?? "")));
      const temps = el("div", "temps");
      temps.setAttribute("role", "gridcell");
      temps.style.width = `${this.#axe.largeur}px`;
      const replie = v.enfants && !this.#deplies.has(l.id);
      const jalons = [...(this.#jalons.get(l.id) || []), ...(replie ? this.#attentesSous.get(l.id) || [] : [])];
      const items = elements(l, this.#axe, jalons, this.#coches.parLigne.get(l.id), this.#etat.fuseau);
      for (const it of items) temps.append(this.#element(l, it));
      n.append(nom, temps);
      n.setAttribute("aria-label", this.#decrit(l, null));
      this.#marqueLigne(n);
      return n;
    }

    // un element de la ligne : barre, jalon, coche, groupe de coches, repere
    #element(l, it) {
      const choisissable = [
        "barre",
        "jalon",
        "coche",
        "groupe",
        "repere",
        "prevu",
      ].includes(it.sorte);
      const n = el(choisissable ? "button" : "span", `el ${it.sorte}`);
      if (choisissable) {
        n.type = "button";
        n.tabIndex = -1;
      }
      n.dataset.cle = it.cle;
      n.style.left = `${it.x}px`;
      if (it.w !== undefined) n.style.width = `${it.w}px`;
      const ref = refDe(l);
      if (it.sorte === "barre") {
        const s =
          l.etat === "en_cours" ||
          (l.niveau === "defaut" && l.etat === "ouvert")
            ? signeDe(l)
            : null;
        if (it.enCours && s) n.classList.add(s);
        if (it.enCours) n.classList.add("ouverte");
        else if (it.fin === "abandon") n.classList.add("abandon");
        else if (it.fin === "archivee") n.classList.add("archivee");
        if (ref) this.#refs.set(n, ref);
      } else if (it.sorte === "jalon") {
        n.classList.add(it.jalon.etat);
        n.append(jalonSvg(it.jalon.etat, signIcon));
        // un jalon porte par une ligne repliee garde la reference de sa propre ligne
        const rj = refDe(this.#arbre.lignes.get(it.jalon.ligne));
        if (rj) this.#refs.set(n, rj);
      } else if (it.sorte === "coche") {
        const r = refDe(it.evenement);
        if (r) this.#refs.set(n, r);
      } else if (it.sorte === "groupe") {
        n.append(el("span", "", String(it.evenements.length)));
        if (ref) this.#refs.set(n, ref);
      } else if (it.sorte === "prevu") {
        if (l.etat === "abandonne") n.classList.add("abandonne");
        if (ref) this.#refs.set(n, ref);
      } else if (it.sorte === "repere" && ref) this.#refs.set(n, ref);
      if (choisissable) n.setAttribute("aria-label", this.#decrit(l, it));
      this.#infos.set(n, { ligne: l, element: it });
      return n;
    }

    // ---- les marques : survol, choix, escalier ----

    #marque() {
      for (const n of this.#pool.values()) this.#marqueLigne(n);
      for (const b of this.#els.telephone.querySelectorAll(".fiche-tel")) {
        const r = this.#refs.get(b);
        b.toggleAttribute(
          "data-highlight",
          Boolean(this.#highlight && r) && correspond(this.#highlight, r),
        );
      }
      this.#escalier();
    }

    #marqueLigne(n) {
      const l = this.#infos.get(n).ligne;
      const r = refDe(l);
      const h = this.#highlight;
      n.toggleAttribute("data-highlight", Boolean(h && r) && correspond(h, r));
      n.setAttribute("aria-selected", String(this.#choix.lignes.has(l.id)));
      n.toggleAttribute("data-escalier", this.#escalierIds.has(l.id));
      for (const e of n.querySelectorAll(".el")) {
        const it = this.#infos.get(e)?.element;
        let choisi = false;
        if (it?.sorte === "coche") choisi = it.evenement.id === this.#choix.evt;
        else if (it?.sorte === "groupe")
          choisi = it.evenements.some((x) => x.id === this.#choix.evt);
        else if (it?.sorte === "jalon")
          choisi =
            it.jalon.id === this.#choix.jalon ||
            (Boolean(this.#choix.evt) &&
              (it.jalon.prise_par === this.#choix.evt ||
                it.jalon.demandee_par === this.#choix.evt));
        e.toggleAttribute("data-choisi", choisi);
      }
    }

    // l'escalier de la fiche survolee ou choisie : ses lignes, un trait fin de la fin d'une barre au debut de la suivante
    #escalier() {
      const { escalier } = this.#els;
      const cible = ficheDe(this.#highlight) ?? ficheDe(this.#refChoisie());
      this.#escalierIds = new Set();
      for (const n of this.#pool.values()) n.removeAttribute("data-escalier");
      if (!cible || !this.#axe) {
        escalier.replaceChildren();
        return;
      }
      const marches = [];
      for (const [i, v] of this.#visibles.entries()) {
        const l = this.#arbre.lignes.get(v.id);
        const r = refDe(l);
        if (l.niveau !== "fiche" || !r || !sameRef(ficheDe(r), cible)) continue;
        const bs = liste(l.barres);
        const debut = bs.length ? this.#axe.xDe(ms(bs[0].debut)) : null;
        const fin = bs.length
          ? bs.at(-1).fin
            ? this.#axe.xDe(ms(bs.at(-1).fin))
            : this.#axe.xMaintenant
          : null;
        this.#escalierIds.add(v.id);
        this.#pool.get(v.id)?.setAttribute("data-escalier", "");
        if (debut !== null)
          marches.push({ y: i * LIGNE + LIGNE / 2, debut, fin });
      }
      const d = [];
      for (let k = 1; k < marches.length; k++) {
        const a = marches[k - 1];
        const b = marches[k];
        if (a.fin === null) continue;
        d.push(`M${a.fin} ${a.y + 5}V${b.y}H${b.debut}`);
      }
      const p = document.createElementNS(SVG, "path");
      p.setAttribute("d", d.join(""));
      const g = document.createElementNS(SVG, "g");
      g.setAttribute("transform", `translate(${this.#nomLargeur()} 0)`);
      g.append(p);
      escalier.replaceChildren(g);
    }

    #nomLargeur() {
      return (
        parseFloat(getComputedStyle(this).getPropertyValue("--nom")) ||
        mesures.NOM
      );
    }

    #refChoisie() {
      const s = this.#selected;
      return s && refDe(s) ? s.ref : null;
    }

    // la selection relayee : marque, ouvre et defile
    #appliqueChoix(defile) {
      const s = this.#selected;
      const choix = { lignes: new Set(), evt: null, jalon: null };
      if (s && this.#arbre) {
        const a = this.#arbre;
        if (typeof s.evt === "string") choix.evt = s.evt;
        if (
          typeof s.id === "string" &&
          a.lignes.has(s.id) &&
          (a.parent.has(s.id) || a.racines.includes(s.id))
        )
          choix.lignes.add(s.id);
        if (
          typeof s.id === "string" &&
          this.#etat.jalons.some((j) => j.id === s.id)
        )
          choix.jalon = s.id;
        if (Number.isInteger(s.etape)) {
          const e = a.racines.find((id) => a.lignes.get(id).numero === s.etape);
          if (e) choix.lignes.add(e);
        }
        const r = refDe(s);
        if (r && !choix.jalon)
          for (const l of a.lignes.values())
            if (refDe(l) && sameRef(l.ref, r) && a.parent.has(l.id))
              choix.lignes.add(l.id);
        // une ligne choisie s'ouvre : ses parents ; une etape choisie, elle-meme
        let change = false;
        for (const id of choix.lignes) {
          for (const p of ancetres(a, id))
            if (!this.#deplies.has(p)) {
              this.#deplies.add(p);
              change = true;
            }
          if (
            a.lignes.get(id).niveau === "etape" &&
            Number.isInteger(s.etape) &&
            !this.#deplies.has(id)
          ) {
            this.#deplies.add(id);
            change = true;
          }
        }
        const cible = this.#cibleDe(choix);
        for (const id of [cible?.ligne].filter(Boolean))
          for (const p of ancetres(a, id))
            if (!this.#deplies.has(p)) {
              this.#deplies.add(p);
              change = true;
            }
        this.#choix = choix;
        if (change) {
          this.#relit();
          this.#vide();
        } else this.#rendLignes();
        for (const n of this.#pool.values()) this.#marqueLigne(n);
        if (defile && cible) this.#montre(cible.ligne, cible.x);
      } else {
        this.#choix = choix;
        for (const n of this.#pool.values()) this.#marqueLigne(n);
      }
      this.#escalier();
      this.#marqueTelephone();
      this.#montreDetail();
    }

    // ou aller pour un choix : le trait de l'evt, sinon le jalon, sinon la premiere ligne choisie
    #cibleDe(choix) {
      if (choix.evt) {
        for (const [id, evts] of this.#coches.parLigne) {
          const e = evts.find((x) => x.id === choix.evt);
          if (e) return { ligne: id, x: this.#axe.xDe(ms(e.ts)) };
        }
      }
      const j = this.#etat.jalons.find(
        (x) =>
          x.id === choix.jalon ||
          (choix.evt &&
            (x.prise_par === choix.evt || x.demandee_par === choix.evt)),
      );
      if (j && this.#arbre.lignes.has(j.ligne))
        return { ligne: j.ligne, x: this.#axe.xDe(ms(j.prise ?? j.demandee)) };
      const premiere = [...choix.lignes].sort(
        (a, b) => (this.#index.get(a) ?? 1e9) - (this.#index.get(b) ?? 1e9),
      )[0];
      if (!premiere) return null;
      const l = this.#arbre.lignes.get(premiere);
      const b = liste(l.barres)[0];
      return { ligne: premiere, x: b ? this.#axe.xDe(ms(b.debut)) : null };
    }

    // amene une ligne (et un x) dans la vue ; sans glissement avec moins d'animation
    #montre(id, x, instant = false) {
      const i = this.#index.get(id);
      if (i === undefined) return;
      const { zone } = this.#els;
      const y = TETE + i * LIGNE;
      const vue = zone.clientHeight;
      let top = zone.scrollTop;
      if (y < zone.scrollTop + TETE || y + LIGNE > zone.scrollTop + vue)
        top = y - TETE - Math.max(0, (vue - TETE - LIGNE) / 2);
      let left = zone.scrollLeft;
      if (x !== null && x !== undefined) {
        const nom = this.#nomLargeur();
        const largeur = zone.clientWidth - nom;
        if (x < zone.scrollLeft + 16 || x > zone.scrollLeft + largeur - 16)
          left = x - largeur / 2;
      }
      zone.scrollTo({
        top: Math.max(0, top),
        left: Math.max(0, left),
        behavior: instant || this.#calme() ? "auto" : "smooth",
      });
      this.#planifie();
    }

    // au demarrage : l'etape en cours en haut, et ce qui s'y passe dans la vue ; un choix deja recu l'emporte
    #centre() {
      const choisi = this.#selected ? this.#cibleDe(this.#choix) : null;
      if (choisi) {
        this.#montre(choisi.ligne, choisi.x, true);
        return;
      }
      const a = this.#arbre;
      const enCours = a.racines
        .map((id) => a.lignes.get(id))
        .filter((l) => l.etat === "en_cours")
        .sort(
          (p, q) =>
            (ms(liste(q.barres).at(-1)?.debut) ?? 0) -
            (ms(liste(p.barres).at(-1)?.debut) ?? 0),
        )[0];
      const { zone } = this.#els;
      if (!enCours) {
        zone.scrollTo({ top: 0, left: 0 });
        return;
      }
      const i = this.#index.get(enCours.id) ?? 0;
      const b = liste(enCours.barres).at(-1);
      const x0 = b ? this.#axe.xDe(ms(b.debut)) : 0;
      const x1 = this.#axe.xMaintenant ?? x0;
      const largeur = Math.max(100, zone.clientWidth - this.#nomLargeur());
      const left =
        x1 - x0 < largeur * 0.8
          ? (x0 + x1) / 2 - largeur / 2
          : x1 - largeur * 0.75;
      zone.scrollTo({ top: i * LIGNE, left: Math.max(0, left) });
      this.#planifie();
    }

    // la place du lecteur : la premiere ligne en vue et son decalage, retrouves apres une mise a jour
    #ancre() {
      if (!this.#visibles.length || this.#els.zone.hidden) return null;
      const { zone } = this.#els;
      const i = Math.min(
        this.#visibles.length - 1,
        Math.floor(zone.scrollTop / LIGNE),
      );
      return {
        id: this.#visibles[i].id,
        decalage: zone.scrollTop - i * LIGNE,
        left: zone.scrollLeft,
      };
    }
    #retrouve(a) {
      const { zone } = this.#els;
      const i = this.#index.get(a.id);
      if (i !== undefined) zone.scrollTop = i * LIGNE + a.decalage;
      zone.scrollLeft = a.left;
      this.#planifie();
    }

    // ---- clavier et clic ----

    // l'arret de tabulation : l'element ou la ligne qui a le focus ; sinon la ligne choisie, sinon la premiere en vue
    #tabulation() {
      let cible = null;
      const f = this.#focus;
      const n = f.ligne ? this.#pool.get(f.ligne) : null;
      if (n)
        cible = f.element
          ? n.querySelector(`.el[data-cle="${cssEchappe(f.element)}"]`) || n
          : n;
      if (!cible) {
        const choisie = [...this.#choix.lignes]
          .map((id) => this.#pool.get(id))
          .find(Boolean);
        cible = choisie || this.#premiereEnVue();
      }
      if (this.#arret === cible) return;
      if (this.#arret) this.#arret.tabIndex = -1;
      if (cible) cible.tabIndex = 0;
      this.#arret = cible;
    }

    // la premiere ligne en vue, d'apres le dernier rendu : relire scrollTop apres avoir pose des lignes forcerait le
    // navigateur a refaire la mise en page au milieu du rendu
    #premiereEnVue() {
      const i = Math.min(this.#visibles.length - 1, Math.max(0, this.#premiereRendue));
      return this.#visibles.length
        ? this.#pool.get(this.#visibles[i].id)
        : null;
    }

    #focusDe(t) {
      const n = t.closest?.(".ligne");
      if (!n) return;
      const e = t.closest(".el");
      this.#focus = { ligne: n.dataset.id, element: e ? e.dataset.cle : null };
      this.#tabulation();
      this.#montreDetail();
    }

    #va(id, cle = null) {
      const i = this.#index.get(id);
      if (i === undefined) return;
      this.#focus = { ligne: id, element: cle };
      // la ligne doit etre dans la page avant de recevoir le focus
      const { zone } = this.#els;
      const y = i * LIGNE;
      if (y < zone.scrollTop) zone.scrollTop = y;
      else if (y + LIGNE > zone.scrollTop + zone.clientHeight - TETE)
        zone.scrollTop = y + LIGNE - zone.clientHeight + TETE;
      this.#rendLignes();
      const n = this.#pool.get(id);
      const e = cle
        ? n?.querySelector(`.el[data-cle="${cssEchappe(cle)}"]`)
        : null;
      const cible = e || n;
      cible?.focus({ preventScroll: true });
      if (e) {
        const x = parseFloat(e.style.left);
        const nom = this.#nomLargeur();
        const largeur = zone.clientWidth - nom;
        if (x < zone.scrollLeft + 8 || x > zone.scrollLeft + largeur - 8)
          zone.scrollLeft = Math.max(0, x - largeur / 2);
      }
    }

    #touche(ev) {
      const { ligne, element } = this.#focus;
      if (!ligne || !this.#index.has(ligne)) return;
      const i = this.#index.get(ligne);
      const v = this.#visibles[i];
      const n = this.#pool.get(ligne);
      const items = n ? [...n.querySelectorAll("button.el")] : [];
      const k = element
        ? items.findIndex((x) => x.dataset.cle === element)
        : -1;
      const fait = () => ev.preventDefault();
      switch (ev.key) {
        case "ArrowDown":
          fait();
          if (i < this.#visibles.length - 1) this.#va(this.#visibles[i + 1].id);
          break;
        case "ArrowUp":
          fait();
          if (i > 0) this.#va(this.#visibles[i - 1].id);
          break;
        case "ArrowRight":
          fait();
          if (element) {
            if (k < items.length - 1) this.#va(ligne, items[k + 1].dataset.cle);
          } else if (v.enfants && !this.#deplies.has(ligne))
            this.#ouvre(ligne, true);
          else if (items.length) this.#va(ligne, items[0].dataset.cle);
          break;
        case "ArrowLeft":
          fait();
          if (element) this.#va(ligne, k > 0 ? items[k - 1].dataset.cle : null);
          else if (v.enfants && this.#deplies.has(ligne))
            this.#ouvre(ligne, false);
          else {
            const p = this.#arbre.parent.get(ligne);
            if (p) this.#va(p);
          }
          break;
        case "Home":
          fait();
          if (element && items.length) this.#va(ligne, items[0].dataset.cle);
          else this.#va(this.#visibles[0].id);
          break;
        case "End":
          fait();
          if (element && items.length)
            this.#va(ligne, items.at(-1).dataset.cle);
          else this.#va(this.#visibles.at(-1).id);
          break;
        case "Escape":
          if (element) {
            fait();
            this.#va(ligne);
          }
          break;
        case "Enter":
        case " ":
          fait();
          this.#choisit(
            this.#arbre.lignes.get(ligne),
            element ? this.#infos.get(items[k])?.element : null,
          );
          break;
        default:
      }
    }

    #clic(ev) {
      const n = ev.target.closest(".ligne");
      if (!n) return;
      const info = this.#infos.get(n);
      if (ev.target.closest(".ouvre") && !ev.target.closest(".ouvre.sans")) {
        this.#ouvre(n.dataset.id, !this.#deplies.has(n.dataset.id));
        return;
      }
      const e = ev.target.closest("button.el");
      this.#choisit(info.ligne, e ? this.#infos.get(e).element : null);
    }

    #ouvre(id, ouvert) {
      if (ouvert) this.#deplies.add(id);
      else this.#deplies.delete(id);
      this.#relit();
      // la ligne se refait : repliee, elle porte les jalons attendus de ses descendants
      this.#pool.get(id)?.remove();
      this.#pool.delete(id);
      this.#rendLignes();
      this.#pool.get(id)?.focus({ preventScroll: true });
    }

    #basculePli(cle) {
      this.#pliFocus = cle;
      if (this.#pliesOuverts.has(cle)) this.#pliesOuverts.delete(cle);
      else this.#pliesOuverts.add(cle);
      const ancre = this.#ancre();
      this.#axe = axe(this.#etat, this.#pliesOuverts);
      this.#relit();
      this.#rendTete();
      this.#rendRegime();
      this.#vide();
      if (ancre) this.#retrouve({ ...ancre, left: this.#els.zone.scrollLeft });
      this.#els.jours
        .querySelector(`button[data-pli="${cssEchappe(cle)}"]`)
        ?.focus();
      if (this.#tableau) this.#rendVue();
    }

    // l'arret de tabulation de la barre des jours : le pli qu'on vient de basculer, sinon le premier en vue (entrer au
    // clavier ne fait pas defiler le planning vers un pli lointain) ; il ne bouge pas tant que le focus est dans la barre
    #arretJours() {
      const { jours, zone } = this.#els;
      if (jours.contains(this.shadowRoot.activeElement)) return;
      const boutons = [...jours.querySelectorAll("button")];
      if (!boutons.length) return;
      const cible =
        boutons.find((b) => b.dataset.pli === this.#pliFocus) ??
        boutons.find((b) => parseFloat(b.style.left || b.parentElement.style.left) >= zone.scrollLeft) ??
        boutons[0];
      for (const b of boutons) b.tabIndex = b === cible ? 0 : -1;
    }

    // les plis : une barre d'outils, un seul arret de tabulation, gauche et droite
    #toucheJours(ev) {
      const boutons = [...this.#els.jours.querySelectorAll("button")];
      const i = boutons.indexOf(this.shadowRoot.activeElement);
      if (i < 0) return;
      let j = null;
      if (ev.key === "ArrowRight") j = Math.min(boutons.length - 1, i + 1);
      else if (ev.key === "ArrowLeft") j = Math.max(0, i - 1);
      else if (ev.key === "Home") j = 0;
      else if (ev.key === "End") j = boutons.length - 1;
      if (j === null) return;
      ev.preventDefault();
      for (const b of boutons) b.tabIndex = b === boutons[j] ? 0 : -1;
      boutons[j].focus();
    }

    // le choix : { id, ref } pour une ligne referencee ou un jalon de fiche ; { id: "etape:<n>", etape } pour une etape ;
    // { id, ref, evt } pour un trait ; { id, evt } pour un trait, un jalon ou une demande sans ref. Une piece du dossier
    // ne se choisit pas ; un groupe de coches non plus (il dit son nombre et ses phrases ; le fil donne chaque action).
    #choisit(l, it) {
      let detail = null;
      // un jalon porte par une ligne repliee se choisit sur sa propre ligne
      if (it?.sorte === "jalon") l = this.#arbre.lignes.get(it.jalon.ligne) ?? l;
      const ref = refDe(l);
      if (it?.sorte === "coche") {
        const e = it.evenement;
        const r = refDe(e);
        detail = r ? { id: l.id, ref: r, evt: e.id } : { id: l.id, evt: e.id };
      } else if (it?.sorte === "jalon") {
        const j = it.jalon;
        const evt = j.prise_par ?? j.demandee_par ?? null;
        if (ref) detail = { id: j.id, ref };
        else if (evt) detail = { id: j.id, evt };
        else {
          const etape =
            l.niveau === "etape"
              ? l.numero
              : this.#arbre.lignes.get(ancetres(this.#arbre, l.id).at(-1))
                  ?.numero;
          if (Number.isInteger(etape)) detail = { id: `etape:${etape}`, etape };
        }
      } else if (it?.sorte === "groupe" || l.niveau === "piece") {
        detail = null;
      } else if (l.niveau === "etape" && Number.isInteger(l.numero)) {
        detail = { id: l.id, etape: l.numero };
      } else if (ref) {
        detail = { id: l.id, ref };
      } else {
        const evt = liste(l.barres)[0]?.commence_par;
        if (typeof evt === "string") detail = { id: l.id, evt };
      }
      if (!detail) return;
      // marque tout de suite ; GDC confirme en renvoyant selected
      this.#selected = detail;
      this.#appliqueChoix(false);
      this.dispatchEvent(
        new CustomEvent("gdc-select", {
          detail,
          bubbles: true,
          composed: true,
        }),
      );
    }

    // ---- le detail, la vue tableau, le telephone ----

    #montreDetail() {
      const { detail } = this.#els;
      if (!this.#etat) return;
      const source =
        this.#survole ??
        this.shadowRoot.activeElement?.closest?.(".el, .ligne") ??
        null;
      const info = source ? this.#infos.get(source) : null;
      if (info) {
        detail.textContent = this.#decrit(info.ligne, info.element);
        return;
      }
      const s = this.#selected;
      const l = s && (this.#arbre?.lignes.get(s.id) ?? this.#arbre?.lignes.get([...this.#choix.lignes][0]));
      const j = s && this.#etat.jalons.find((x) => x.id === s.id);
      const evt = s && typeof s.evt === "string" ? this.#etat.evenements.find((e) => e.id === s.evt) : null;
      if (evt && !j) detail.textContent = `Choisi : ${evt.phrase ?? s.evt} · ${fuseauFormat(this.#etat.fuseau, "date").format(new Date(ms(evt.ts)))}`;
      else if (j && this.#arbre.lignes.has(j.ligne))
        detail.textContent = `Choisi : ${this.#decrit(this.#arbre.lignes.get(j.ligne), { sorte: "jalon", jalon: j })}`;
      else if (l) detail.textContent = `Choisi : ${this.#decrit(l, null)}`;
      else detail.textContent = this.#resume();
    }

    #resume() {
      const e = this.#etat;
      const attendus = e.jalons.filter((j) => j.etat === "attendue").length;
      const fiches = new Set(
        e.lignes
          .filter((l) => l.niveau === "fiche")
          .map((l) => refDe(l)?.fiche),
      ).size;
      const parts = [`${fiches} fiche${fiches > 1 ? "s" : ""}`];
      if (attendus)
        parts.push(
          `${attendus} décision${attendus > 1 ? "s" : ""} t'attend${attendus > 1 ? "ent" : ""}`,
        );
      if (!e.debut) parts.unshift("Projet non ouvert");
      return parts.join(" · ");
    }

    // le texte d'une ligne ou d'un de ses elements : le detail, le nom accessible, la vue tableau
    #decrit(l, it) {
      const f = this.#etat.fuseau;
      const date = (iso, source = "journal") => {
        const t = ms(iso);
        if (t === null) return "date inconnue";
        return source === "git"
          ? `vers ${fuseauFormat(f, "approche").format(new Date(t))}, d'après git`
          : fuseauFormat(f, "date").format(new Date(t));
      };
      const nom = nomDe(l);
      if (!it) {
        const parts = [nom, ETATS[l.etat] ?? String(l.etat ?? "")];
        if (l.repere?.date)
          parts.push(`repère ${date(l.repere.date, l.repere.source)}`);
        if (l.prevu_le) parts.push(`prévu ${date(l.prevu_le)}`);
        const bs = liste(l.barres);
        if (bs.length)
          parts.push(
            `${date(bs[0].debut)} → ${bs.at(-1).fin ? date(bs.at(-1).fin) : "en cours"}`,
          );
        if (this.#axe?.futur.has(l.id)) parts.push("à venir, sans date");
        return parts.filter(Boolean).join(" · ");
      }
      if (it.sorte === "barre") {
        const b = it.barre;
        const quoi = b.stade ?? b.statut ?? "barre";
        const fin = it.enCours
          ? "en cours"
          : `${date(b.fin)}${it.fin !== "normale" ? ` (${FINS[it.fin] ?? it.fin})` : ""}`;
        const src = b.source === "fichiers" ? " · vu dans les fichiers" : "";
        return `${nom} · ${quoi} · ${date(b.debut)} → ${fin}${src}`;
      }
      if (it.sorte === "jalon") {
        const j = it.jalon;
        const parts = [`${j.nom ?? "Jalon"} · ${ETATS[j.etat] ?? j.etat}`];
        if (j.demandee)
          parts.push(`demandée ${date(j.demandee, j.demandee_source)}`);
        if (j.prise) parts.push(`prise ${date(j.prise)}`);
        if (j.motif) parts.push(`motif : ${j.motif}`);
        if (j.perimee_depuis?.date)
          parts.push(
            `périmée depuis ${date(j.perimee_depuis.date, j.perimee_depuis.source)}`,
          );
        return `${parts.join(" · ")} — ${nomDe(this.#arbre.lignes.get(j.ligne) ?? l)}`;
      }
      if (it.sorte === "coche")
        return `${it.evenement.phrase ?? "Événement"} · ${date(it.evenement.ts)}`;
      if (it.sorte === "groupe") {
        const n = it.evenements.length;
        const jour = fuseauFormat(f, "jour").format(
          new Date(ms(it.evenements[0].ts)),
        );
        return `${n} déclencheurs le ${jour} sur ${nom} : ${it.evenements
          .map((e) => e.phrase)
          .filter(Boolean)
          .slice(0, 3)
          .join(" ; ")}${n > 3 ? "…" : ""}`;
      }
      if (it.sorte === "prevu") return `${nom} · prévu ${date(it.date)}`;
      if (it.sorte === "repere")
        return it.jalon
          ? `${it.jalon.nom} · périmée ${date(it.date, it.source)}`
          : `${nom} · ${ETATS[l.etat] ?? l.etat} · ${date(it.date, it.source)}`;
      return nom;
    }

    #rendVue() {
      const { zone, tableau, bascule } = this.#els;
      if (!this.#etat) return;
      bascule.hidden = false;
      zone.hidden = this.#tableau;
      tableau.hidden = !this.#tableau;
      if (this.#tableau) this.#rendTableau();
      else this.#planifie();
      // la liste du telephone, seulement quand elle se voit
      if (TELEPHONE?.matches) this.#rendTelephone();
      this.#montreDetail();
    }

    // la vue tableau : une ligne par barre et par jalon, avec les dates et leur source ; toutes les lignes, depliees ou non
    #rendTableau() {
      const t = el("table", "");
      const cap = el(
        "caption",
        "",
        "La chronologie en texte : une ligne par barre, par jalon et par repère",
      );
      const thead = el("thead", "");
      const tr = el("tr", "");
      for (const h of [
        "Étape",
        "Élément",
        "Quoi",
        "Début ou date",
        "Fin",
        "Source",
      ])
        tr.append(el("th", "", h));
      thead.append(tr);
      const tbody = el("tbody", "");
      const f = this.#etat.fuseau;
      const fmt = (iso) => {
        const t2 = ms(iso);
        return t2 === null ? "" : fuseauFormat(f, "date").format(new Date(t2));
      };
      const ligneT = (cells, approche = false) => {
        const r = el("tr", approche ? "approche" : "");
        for (const c of cells) r.append(el("td", "", c));
        tbody.append(r);
      };
      const a = this.#arbre;
      const tous = visibles(a, new Set(a.lignes.keys()));
      for (const v of tous) {
        const l = a.lignes.get(v.id);
        const etape =
          l.niveau === "etape"
            ? l.numero
            : a.lignes.get(ancetres(a, l.id).at(-1))?.numero;
        const chemin = [
          ...ancetres(a, l.id)
            .reverse()
            .slice(1)
            .map((p) => nomDe(a.lignes.get(p))),
          nomDe(l),
        ].join(" › ");
        const e = String(etape ?? "");
        for (const b of liste(l.barres))
          ligneT([
            e,
            chemin,
            `${b.stade ?? b.statut ?? "barre"} (${ETATS[l.etat] ?? l.etat ?? ""})`,
            fmt(b.debut),
            b.fin
              ? `${fmt(b.fin)}${b.fin_type && b.fin_type !== "normale" ? ` · ${FINS[b.fin_type] ?? b.fin_type}` : ""}`
              : "en cours",
            b.source === "fichiers"
              ? "journal, vu dans les fichiers"
              : "journal",
          ]);
        if (l.prevu_le)
          ligneT([
            e,
            chemin,
            `prévu (${ETATS[l.etat] ?? l.etat})`,
            fmt(l.prevu_le),
            "",
            "journal",
          ]);
        if (l.repere?.date)
          ligneT(
            [
              e,
              chemin,
              `pièce ${ETATS[l.etat] ?? l.etat}`,
              fmt(l.repere.date),
              "",
              l.repere.source === "git" ? "d'après git" : "journal",
            ],
            l.repere.source === "git",
          );
        if (l.livree?.date)
          ligneT([e, chemin, "livrée", fmt(l.livree.date), "", "journal"]);
        if (this.#axe.futur.has(l.id))
          ligneT([e, chemin, "à venir", "sans date", "", ""]);
        for (const j of this.#jalons.get(l.id) || []) {
          const git = j.demandee_source === "git";
          ligneT(
            [
              e,
              chemin,
              `jalon « ${j.nom} » ${ETATS[j.etat] ?? j.etat}${j.motif ? ` : ${j.motif}` : ""}`,
              j.demandee ? `demandée ${fmt(j.demandee)}` : "",
              j.prise ? `prise ${fmt(j.prise)}` : "",
              git ? "demande d'après git" : "journal",
            ],
            git,
          );
          if (j.perimee_depuis?.date)
            ligneT(
              [
                e,
                chemin,
                `jalon « ${j.nom} » périmé (${(j.perimee_depuis.pieces || []).join(", ")})`,
                fmt(j.perimee_depuis.date),
                "",
                j.perimee_depuis.source === "git" ? "d'après git" : "journal",
              ],
              j.perimee_depuis.source === "git",
            );
        }
      }
      t.append(cap, thead, tbody);
      this.#els.tableau.replaceChildren(t);
    }

    // sur telephone, la liste par fiche : son etape la plus avancee, son etat, ce qui l'attend
    #rendTelephone() {
      const { telephone } = this.#els;
      const a = this.#arbre;
      const fiches = new Map();
      for (const l of a.lignes.values()) {
        const r = refDe(l);
        if (l.niveau !== "fiche" || !r?.fiche || !a.parent.has(l.id)) continue;
        const cle = cleRef(ficheDe(r));
        const etape = a.lignes.get(ancetres(a, l.id).at(-1))?.numero ?? 0;
        const f = fiches.get(cle);
        const passee = l.etat !== "a_venir";
        if (!f)
          fiches.set(cle, {
            ref: ficheDe(r),
            lignes: [l],
            courante: passee ? { l, etape } : null,
            app: r.application,
          });
        else {
          f.lignes.push(l);
          if (passee && (!f.courante || etape > f.courante.etape))
            f.courante = { l, etape };
        }
      }
      const nomsApp = new Map();
      for (const l of a.lignes.values())
        if (l.niveau === "application" && refDe(l))
          nomsApp.set(l.ref.application, nomDe(l));
      const parApp = new Map();
      for (const f of fiches.values()) {
        if (!parApp.has(f.app)) parApp.set(f.app, []);
        parApp.get(f.app).push(f);
      }
      const enfants = [];
      // en tete, les decisions du projet qui t'attendent (une etape, sans fiche) : celles des fiches sont dans leur fiche
      // (decision de Pierre-Alain du 26 octobre 2026, planche a cocher, question 9)
      const projet = this.#etat.jalons.filter((j) => j.etat === "attendue" && a.lignes.has(j.ligne) && !refDe(a.lignes.get(j.ligne)));
      if (projet.length) {
        enfants.push(el("p", "app-tel", projet.length > 1 ? "Les décisions qui t'attendent" : "La décision qui t'attend"));
        const ul = el("ul", "");
        ul.setAttribute("aria-label", "Les décisions du projet qui t'attendent");
        for (const j of projet) {
          const l = a.lignes.get(j.ligne);
          const b = el("button", "fiche-tel");
          b.type = "button";
          const signe = el("span", "signe");
          signe.append(signIcon(document, "waiting"));
          const quand = j.demandee
            ? j.demandee_source === "git"
              ? `demandée vers ${fuseauFormat(this.#etat.fuseau, "approche").format(new Date(ms(j.demandee)))}, d'après git`
              : `demandée ${fuseauFormat(this.#etat.fuseau, "date").format(new Date(ms(j.demandee)))}`
            : null;
          b.append(signe, el("span", "texte", j.nom ?? "Décision"), el("span", "sous", [nomDe(l), "attend ta décision", quand].filter(Boolean).join(" · ")));
          this.#infos.set(b, { ligne: l, element: { sorte: "jalon", jalon: j } });
          const li = el("li", "");
          li.append(b);
          ul.append(li);
        }
        enfants.push(ul);
      }
      for (const [app, fs] of parApp) {
        if (parApp.size > 1 || a.applications > 1)
          enfants.push(el("p", "app-tel", nomsApp.get(app) ?? app));
        const ul = el("ul", "");
        ul.setAttribute("aria-label", nomsApp.get(app) ?? app);
        for (const f of fs) {
          const c = f.courante ?? { l: f.lignes[0], etape: null };
          const li = el("li", "");
          const b = el("button", "fiche-tel");
          b.type = "button";
          const attend = this.#etat.jalons.some(
            (j) =>
              j.etat === "attendue" && f.lignes.some((l) => l.id === j.ligne),
          );
          const s = attend
            ? "waiting"
            : f.lignes.some((l) => l.etat === "en_cours")
              ? "active"
              : null;
          const signe = el("span", "signe");
          if (s) signe.append(signIcon(document, s, 16));
          const sous = [
            c.etape ? `étape ${c.etape}` : null,
            ETATS[c.l.etat] ?? c.l.etat,
            attend ? "attend ta décision" : null,
          ]
            .filter(Boolean)
            .join(" · ");
          b.append(
            signe,
            el("span", "texte", nomDe(c.l)),
            el("span", "sous", sous),
          );
          this.#refs.set(b, f.ref);
          this.#infos.set(b, { ligne: c.l, element: null });
          li.append(b);
          ul.append(li);
        }
        enfants.push(ul);
      }
      if (!fiches.size)
        enfants.push(
          el(
            "p",
            "message",
            this.#etat.debut
              ? "Aucune fiche pour l'instant."
              : "Projet non ouvert : aucune fiche.",
          ),
        );
      telephone.replaceChildren(...enfants);
      this.#marqueTelephone();
      this.#marque();
    }

    // le choix sur telephone : la fiche de la reference choisie, ou la decision du projet choisie (par son jalon, son
    // evt ou son etape)
    #marqueTelephone() {
      const r = this.#refChoisie();
      const s = this.#selected;
      for (const b of this.#els.telephone.querySelectorAll(".fiche-tel")) {
        const br = this.#refs.get(b);
        const j = this.#infos.get(b)?.element?.jalon;
        const etape = j && this.#arbre?.lignes.get(j.ligne)?.numero;
        const choisi = j
          ? Boolean(s) && (s.id === j.id || (s.evt && (s.evt === j.prise_par || s.evt === j.demandee_par)) || (Number.isInteger(s.etape) && s.etape === etape))
          : Boolean(r && br && sameRef(ficheDe(r), br));
        if (choisi) b.setAttribute("aria-current", "true");
        else b.removeAttribute("aria-current");
      }
    }

    #calme() {
      return (
        getComputedStyle(this).getPropertyValue("--gdc-motion").trim() === "0"
      );
    }
  }

  registry.define(meta.tag, SiteSchedule);
}

const SVG = "http://www.w3.org/2000/svg";

function el(balise, classe, texte) {
  const n = document.createElement(balise);
  if (classe) n.className = classe;
  if (texte !== undefined) n.textContent = texte;
  return n;
}

// le nom d'une ligne : l'etape porte son numero
function nomDe(l) {
  const nom = typeof l.nom === "string" && l.nom ? l.nom : l.id;
  return l.niveau === "etape" && Number.isInteger(l.numero)
    ? `${l.numero}. ${nom}`
    : nom;
}

// les deux cas de couleur : Actif pour une etape, une fiche ou un lot en cours ; En erreur pour un defaut ouvert
function signeDe(l) {
  if (l.etat === "en_cours" && ["etape", "fiche", "lot"].includes(l.niveau))
    return "active";
  if (l.niveau === "defaut" && l.etat === "ouvert") return "error";
  return null;
}

// la reference d'une fiche (sans son lot), ou null
function ficheDe(r) {
  return r && r.application && r.fiche
    ? { application: r.application, fiche: r.fiche }
    : null;
}

function cssEchappe(s) {
  return globalThis.CSS?.escape
    ? globalThis.CSS.escape(s)
    : String(s).replace(/["\\]/g, "\\$&");
}

function chevron() {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 10 10");
  svg.setAttribute("aria-hidden", "true");
  const p = document.createElementNS(SVG, "path");
  p.setAttribute("d", "M3.5 1.5 7 5 3.5 8.5");
  Object.assign(p.style, {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.6",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  });
  svg.append(p);
  return svg;
}

// les formes du jalon, lisibles sans la couleur : attendu, le signe « Attend ta decision » ; accorde, un losange plein a
// l'encre ; refuse, un losange creux barre d'une croix ; perime, le losange estompe et barre en diagonale
function jalonSvg(etat, signIcon) {
  if (etat === "attendue") {
    const s = signIcon(document, "waiting", 16);
    s.setAttribute("aria-hidden", "true");
    return s;
  }
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 14 14");
  svg.setAttribute("aria-hidden", "true");
  const losange = document.createElementNS(SVG, "path");
  losange.setAttribute("d", "M7 1 13 7 7 13 1 7Z");
  const trait = (d) => {
    const p = document.createElementNS(SVG, "path");
    p.setAttribute("d", d);
    p.style.cssText =
      "fill:none;stroke:var(--gdc-ink);stroke-width:1.5;stroke-linecap:round";
    return p;
  };
  if (etat === "accordee") {
    losange.style.cssText =
      "fill:var(--gdc-ink);stroke:var(--gdc-ink);stroke-width:1";
    svg.append(losange);
  } else if (etat === "refusee") {
    losange.style.cssText =
      "fill:var(--gdc-surface);stroke:var(--gdc-ink);stroke-width:1.5";
    svg.append(losange, trait("M4.8 4.8 9.2 9.2M9.2 4.8 4.8 9.2"));
  } else if (etat === "perimee") {
    losange.style.cssText =
      "fill:var(--gdc-surface);stroke:var(--gdc-muted);stroke-width:1.5";
    const barre = trait("M2 12 12 2");
    barre.style.stroke = "var(--gdc-muted)";
    svg.append(losange, barre);
  } else {
    // un etat inconnu : le losange en pointille, sans rien deviner
    losange.style.cssText =
      "fill:none;stroke:var(--gdc-muted);stroke-width:1.2;stroke-dasharray:2 2";
    svg.append(losange);
  }
  return svg;
}
