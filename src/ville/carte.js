// La carte vivante (fiche city-map) : la carte du chantier assemblee et animee a partir des scenes que GDC envoie
// (plan, elements, actions). GDC dit quoi et ou ; la carte dit comment (docs/ville.md) :
// - l'implantation fixe (implantation.js) : les lieux d'etape toujours la, une parcelle par application ;
// - les actions jouees dans l'ordre de leur horodatage, les marches le long des voies (chemins.js), plafonnees ;
// - la vie du chantier (vie.js), tiree du regime, des phases et des agents presents, a partir d'une graine ;
// - les zones jamais activees en niveaux de gris, colorees pour toujours a la premiere activation ;
// - la vue en coupe (building-interior 2.0.0) d'un etage, que GDC ouvre au clic ou au selecteur d'etages ;
// - l'heure reelle (fiche day-night, heure.js) : la lumiere suit le soleil de Fribourg sur l'heure du poste, et la nuit
//   les fenetres des bureaux et des batiments habites s'eclairent, franchement la ou un agent travaille.
// Les composants n'en savent rien : la carte les cree, les pose, leur donne un etat, et recolore des copies de leurs
// materiaux (zones grises) ; la nuit, elle allume la lampe frontale des personnes casquees qui sont dehors. Three.js,
// le chargeur des modeles et les composants sont injectes ; rien n'est charge d'ailleurs.
import {
  implantation,
  abords,
  ZONES,
  ETAPES,
  BORDURE,
  zoneDe,
} from "./implantation.js";
import { creeChemins, mesure, positionSur, VITESSE } from "./chemins.js";
import { lisScene, instants } from "./scene-gdc.js";
import {
  equipes,
  usagers,
  tache,
  tacheUsager,
  placeDePause,
  etatDePause,
} from "./vie.js";
import {
  personneDe,
  parametresDe,
  parametresOuvrier,
  parametresUsager,
  metaPersonne,
  porteCasque,
  COLORIS_VILLE,
} from "./equipe.js";
import { alea } from "./graine.js";
import {
  groupFloors,
  anchorFor,
  refOf,
  roomsFromPieces,
} from "../etages.js";
import { tokens, makeContext, paletteFor } from "../tokens.js";
import {
  MOMENTS,
  momentDe,
  horaireDe,
  recetteDe,
  regleLumieres,
  creeVitres,
  ECLAIRABLES,
  forceDe,
  eclaireBatiment,
} from "./heure.js";

const RECUL = 2; // comme la scene de reference : la carte descend d'environ 1,6 m a l'ecran
const FONDU_ZONE = 1.5; // s, la couleur qui arrive une fois
const IMPULSION = 0.4; // s, un element qui apparait ou s'efface
const MONTAGE_GRUE = 1.5; // s, la grue qui se monte ou se demonte
// L'allure du camion (decision de Pierre-Alain du 23 octobre 2026, apres la revue DA : pres de 12 m/s dans la cloture,
// ce n'etait ni pose ni credible pour un oeil SST) : sur la route, puis au pas dans l'enceinte du chantier ; il
// accelere et freine comme un camion, ralentit avant d'entrer et recule lentement.
const VITESSE_ROUTE = 6; // m/s
const VITESSE_ENCEINTE = 4; // m/s, au pas dans la cloture
const VITESSE_RECUL = 1.5; // m/s
const ACCELERATION = 2.5; // m/s2, au demarrage comme au freinage
const RAYON_VIRAGE = 2.5; // m, le camion arrondit les angles des voies
const RECUL_CAMION = 5; // m, il recule hors de sa place avant de repartir
const BRAQUAGE = 6; // 1/s, la vitesse a laquelle son cap rejoint celui de la voie
const ECART_PERSONNES = 0.75; // m, deux personnes ne se posent jamais plus pres
const ECART_PIECE = 0.9; // m, entre deux agents d'une meme piece de la vue en coupe
const PALIER = 0.6; // m, du bord avant du socle de la coupe aux agents sans piece
// Les phases du gros oeuvre, ou la grue est montee sur la parcelle (docs/ville.md : la structure et ses echafaudages,
// la grue) ; GDC la fait lever (lifting) a la fusion vers dev, et la pose meme hors de ces phases.
const PHASES_GRUE = ["structure", "envelope"];
// Une zone jamais activee : en niveaux de gris, et lavee vers le fond, pour qu'elle se lise « pas encore la » sur une
// carte dont le monde est deja peu colore (retour de Pierre-Alain du 22 octobre 2026).
const LAVIS = { light: 0.45, dark: 0.3 };
// Le sol d'une zone grise (la terre du chantier, l'enrobe : un seul terrain pour toutes les zones) : un voile du fond,
// pose juste au-dessus des dalles, sous les bordures et les objets ; il s'efface avec la couleur.
const VOILE = { opacite: 0.6, hauteur: 0.06 };
const ENTRE_INSTANTS = 0.25; // s, un souffle entre deux instants de GDC
const PAS_DE_PORTE = 1.2; // s au plus, de la porte au poste
const ANGLE_DEHORS = Math.PI / 4; // face a la camera
const ANGLE_BUREAU = Math.PI;
const HAUTEUR_REPERE = 2.4;
const PAS_HEURE = 20; // s, l'heure du poste est relue a ce rythme : une transition de 30 minutes avance par pas invisibles
// Les lieux qui ont des postes (desk:n), et ceux ou l'on se tient pres de la porte (entry).
const POSTES = [
  "architect-office",
  "client-office",
  "control-office",
  "design-office",
  "reception-area",
  "site-office",
];
// Les decisions attendues au meme lieu (decision de Pierre-Alain du 22 octobre 2026) : une grille compacte de trois
// panneaux par rang, un panneau et un badge par decision, six au plus ; au-dela, le dernier porte dans son badge les
// decisions qu'il regroupe, la sienne et celles sans panneau (« +12 » pour 17 : 1 + 1 + 1 + 1 + 1 + 12 font le total ;
// decision de Pierre-Alain du 23 octobre 2026, apres la revue DA : « 17 » a cote de cinq « 1 » se lisait 22) (panneaux()).
// Chaque panneau montre reste cliquable. pas : d'un panneau au suivant dans le rang ; rang : d'un
// rang au suivant ; un lieu peut avoir sa grille (implantation.js, le feu vert).
const MAX_PANNEAUX = 6;
const PAR_RANG = 3;
const GRILLE = { pas: [1.4, 0], rang: [0, -1.3] };
// Les elements que la carte sait poser ; ground est le socle, deja fait par site-ground.
const SIGNAUX = [
  "decision-sign",
  "permit-board",
  "blocked-sign",
  "defect-sign",
];
const PROPOSEES = [
  "consulte",
  "controle",
  "question",
  "reunion",
  "remise",
  "demande",
]; // docs/demandes-a-gdc.md, 5

const lerp = (a, b, t) => a + (b - a) * t;
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

// options : { components (par identifiant), chargeur (prepare, assetsPour), theme, quality, reducedMotion, graine,
// force (la mesure de fluidite : chaque parcelle en chantier prend son plafond d'ouvriers), lumieres ({ ciel, soleil,
// scene } : la HemisphereLight, la DirectionalLight et la scene de la page, que la carte regle sur l'heure ; sans elles,
// la page les regle avec recette()), heure ("jour", "aube", "nuit" ou de 0 a 1 : un moment fixe pour les revues ;
// absente, l'heure du poste), maintenant (l'horloge, Date.now par defaut) }.
export async function creeCarte(THREE, options) {
  const { components, chargeur } = options;
  // le registre commun des materiaux du chargeur (plan D-1) : ctx.materiau des composants, et les teintes des tenues
  const registre = chargeur.registre ?? null;
  const materiauPartage = chargeur.materiau?.(THREE);
  const ctxOptions = {
    theme: options.theme,
    quality: options.quality,
    reducedMotion: options.reducedMotion,
  };
  const anime = !options.reducedMotion;
  const graine = options.graine ?? "gdc";
  const connus = new Set(Object.keys(components));
  const signalements = [];
  const signale = (m) => {
    if (!signalements.includes(m)) signalements.push(m);
  };

  const root = new THREE.Group();
  root.name = "carte-vivante";
  const plateau = new THREE.Group();
  root.add(plateau);

  // --- creer une instance de composant, ou de personne (ses seuls fichiers)
  async function cree(id, params = {}, personne = false) {
    const mod = components[id];
    const defauts = Object.fromEntries(
      Object.entries(mod.meta.params || {}).map(([k, p]) => [k, p.default]),
    );
    const tous = { ...defauts, ...params };
    const meta = personne ? metaPersonne(tous) : mod.meta;
    await chargeur.prepare(meta);
    return mod.create(
      THREE,
      tous,
      makeContext(ctxOptions, await chargeur.assetsPour(meta), materiauPartage),
    );
  }

  // --- les zones grises : des copies des materiaux, melangees vers leur luminance ; par zone, car les modeles partagent
  // leurs materiaux d'une zone a l'autre
  const gris = Object.fromEntries(
    Object.keys(ZONES).map((z) => [
      z,
      { actif: false, clones: new Map(), fondu: null },
    ]),
  );
  const fondTheme = ctxOptions.theme === "dark" ? "dark" : "light";
  const fond = new THREE.Color(paletteFor(fondTheme).paper);
  function copieGrise(zone, m) {
    if (m.userData.villeCopie) return m;
    const z = gris[zone];
    if (!z.clones.has(m)) {
      const c = m.clone();
      c.userData = { villeCopie: true, origine: m };
      if (c.color) {
        const v = 0.2126 * c.color.r + 0.7152 * c.color.g + 0.0722 * c.color.b;
        c.userData.gris = new THREE.Color(v, v, v).lerp(fond, LAVIS[fondTheme]);
        c.color.copy(c.userData.gris);
      }
      z.clones.set(m, c);
    }
    return z.clones.get(m);
  }
  function grise(objet, zone) {
    if (!zone || gris[zone].actif) return;
    objet.traverse((o) => {
      if (!o.isMesh || o.userData.villePropre) return;
      o.material = Array.isArray(o.material)
        ? o.material.map((m) => copieGrise(zone, m))
        : copieGrise(zone, o.material);
    });
  }
  function colore(objet) {
    objet.traverse((o) => {
      if (!o.isMesh) return;
      const rend = (m) =>
        m.userData.villeCopie && m.userData.origine ? m.userData.origine : m;
      o.material = Array.isArray(o.material)
        ? o.material.map(rend)
        : rend(o.material);
    });
  }

  // --- l'heure reelle (fiche day-night) : la recette de l'instant, et les vitres eclairees sur des copies des materiaux.
  // Le passage est trop lent pour une animation : la recette suit l'horloge par pas, rien de particulier sans animation.
  const vitres = creeVitres();
  const maintenant = options.maintenant || Date.now;
  let heureFixe = options.heure ?? null;
  // un moment choisi par l'utilisateur tombe au prochain passage (decision de Pierre-Alain du 22 octobre 2026) ;
  // celui de l'option heure (les revues) reste
  let finChoix = null;
  let jour = null;
  let moment = null; // le nom du moment de la lumiere posee
  let horloge = 0;
  const lieuxOccupes = new Set(); // les lieux ou se trouve un agent, selon la derniere scene
  const jourDe = () =>
    heureFixe === null
      ? momentDe(maintenant()).jour
      : typeof heureFixe === "number"
        ? heureFixe
        : Object.hasOwn(MOMENTS, heureFixe)
          ? MOMENTS[heureFixe]
          : 1;
  function majHeure() {
    if (finChoix !== null && maintenant() >= finChoix) {
      heureFixe = null;
      finChoix = null;
    }
    const j = jourDe();
    moment =
      heureFixe === null
        ? momentDe(maintenant()).moment
        : j >= 1
          ? "jour"
          : j <= 0
            ? "nuit"
            : "aube";
    if (j === jour) return false;
    jour = j;
    for (const m of membres.values()) {
      if (m.id === "floodlight") projecteurDe(m);
      if (m.casque) lampeDe(m);
    }
    const r = recetteDe(j, fondTheme);
    if (options.lumieres) regleLumieres(options.lumieres, r);
    vitres.regle(r.fenetres);
    return true;
  }
  // une zone grise n'a pas de fenetre eclairee ; une zone qui se colore s'eclaire a la fin de son fondu
  function fenetresDe(m) {
    if (m.id === "floodlight") return projecteurDe(m);
    if (!ECLAIRABLES.has(m.id)) return;
    const z = m.zone && gris[m.zone];
    if (z && (!z.actif || z.fondu !== null)) return;
    if (m.id === "building") eclaireBatiment(vitres, m.inst.root);
    else
      vitres.pose(
        m.inst.root,
        forceDe(m.id, {
          actif: m.state === "active",
          agent: lieuxOccupes.has(m.cle),
        }),
      );
  }

  // les projecteurs du chantier (floodlight, plan D-2) : allumes la nuit (des le coucher du soleil, quand le jour passe
  // sous 0,5), en regime ouvert, dans une zone en couleur comme les fenetres ; eteints sinon, la pause comprise. Le
  // composant joue son fondu d'allumage
  function projecteurDe(m) {
    const z = m.zone && gris[m.zone];
    const allume =
      regime === "ouvert" &&
      jour !== null &&
      jour < 0.5 &&
      !(z && (!z.actif || z.fondu !== null));
    const s = allume ? "on" : "off";
    if (m.state === s) return;
    m.inst.setState(s);
    m.state = s;
  }

  // le portail de la cloture (site-fence 1.1.0) : ferme en regime ferme et en pause, ouvert en regime ouvert. Joue (un
  // passage, une action de GDC), il tourne doucement ; pose tel quel (une scene recue), il est d'emblee a sa place : la
  // carte avance alors son temps jusqu'au bout de la rotation
  function portailDe(m, doucement) {
    const s = regime === "ouvert" ? "default" : "closed";
    if (m.state === s) return;
    etat(m, s, {});
    if (!doucement) m.inst.update(60);
  }
  // Joue, le portail ne se ferme qu'une fois les ouvriers passes : en pause, ils sortent vers le cabanon de la fete ; a
  // la fermeture, ils en reviennent jusqu'au vestiaire. Il s'ouvre tout de suite.
  let portailEnAttente = false;
  function portails(transition) {
    portailEnAttente = transition && anime && regime !== "ouvert";
    if (portailEnAttente) return;
    for (const m of membres.values()) if (m.id === "site-fence") portailDe(m, transition);
  }
  const ouvriersEnMarche = () => [...acteurs.values()].some((a) => a.marche && a.m.vie);

  // le cabanon de la fete (party-shed) : la fete en pause, ferme sinon. Pose tel quel, il est d'emblee en fete (porte
  // ouverte, lanterne allumee) : la carte avance son temps jusque-la
  function feteDe(m, doucement) {
    const s = regime === "pause" ? "party" : "closed";
    if (m.state === s) return;
    etat(m, s, {});
    if (!doucement) m.inst.update(10);
  }

  // la lampe frontale (character 1.2.0) : allumee la nuit, comme les projecteurs (le jour sous 0,5), pour toute personne
  // casquee qui est dehors (m.casque) ; eteinte dans un bureau, a son poste (m.auBureau). Rien ne clignote.
  function lampeDe(m) {
    const voulue = jour !== null && jour < 0.5 && !m.auBureau;
    m.inst.root.userData.villeAuBureau = !!m.auBureau; // pour le controle de la carte
    if (m.lampe === voulue) return;
    m.lampe = voulue;
    m.inst.setState(m.state || "idle", { headlamp: voulue });
  }

  // --- les membres : une instance chacun, avec sa zone et, pour un element de GDC, l'element recu
  const membres = new Map(); // cle -> { cle, id, inst, zone, el, lieu, acteur, sortie }
  function pose(cle, id, inst, position = [0, 0, 0], rotation = 0) {
    inst.root.position.set(...position);
    inst.root.rotation.y = rotation;
    plateau.add(inst.root);
    const m = {
      cle,
      id,
      inst,
      zone: zoneDe(imp.cadres, position[0], position[2]),
    };
    membres.set(cle, m);
    grise(inst.root, m.zone);
    return m;
  }
  function etat(m, state, data) {
    m.inst.setState(state, data);
    m.state = state;
    if (m.casque) lampeDe(m);
    grise(m.inst.root, m.zone); // un composant peut refaire ses maillages a chaque etat (building)
    fenetresDe(m);
  }
  function retire(cle) {
    const m = membres.get(cle);
    if (!m) return;
    acteurs.delete(cle); // une personne qui s'en va marche jusqu'a sa porte, puis seulement elle est retiree
    places.delete(cle);
    colore(m.inst.root); // les copies grises restent a la zone, qui les libere
    m.inst.root.removeFromParent();
    m.inst.dispose();
    for (const c of m.copies || []) c.dispose();
    membres.delete(cle);
  }
  const pointAncre = (m, nom) => {
    m.inst.root.updateMatrix();
    return m.inst.anchor(nom).clone().applyMatrix4(m.inst.root.matrix);
  };

  // --- la couche fixe : terrain, clotures, bordures, decor et lieux d'etape ; refaite si le nombre de parcelles change
  let imp = null;
  let chemins = null;
  let fixes = [];
  const peintures = [];
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const plan = new THREE.PlaneGeometry(1, 1);
  // types : le type de chaque parcelle (house, block, hall) ; la couche se refait quand ils changent
  async function coucheFixe(types) {
    const cle = types.slice(0, 4).join(",");
    if (imp && imp.types === cle) return;
    for (const cle of fixes) retire(cle);
    for (const b of peintures.splice(0)) {
      b.removeFromParent();
      b.material.dispose();
    }
    for (const z of Object.values(gris)) retireVoile(z);
    imp = implantation(types.length, types);
    imp.types = cle;
    chemins = creeChemins(imp.voies);
    fixes = [];
    const T = imp.terrain;
    const sol = await cree("site-ground", {
      width: T.x[1] - T.x[0],
      depth: T.z[1] - T.z[0],
    });
    const centre = [(T.x[0] + T.x[1]) / 2, 0, (T.z[0] + T.z[1]) / 2];
    const ms = pose("site-ground", "site-ground", sol, centre);
    ms.zone = null; // le sol couvre toutes les zones : il reste dans ses couleurs (terre, beton, enrobe)
    colore(sol.root);
    etat(ms, "default", { zones: imp.dalles });
    // le terrain et ses dalles ne se designent pas : un rayon (clic, survol) les traverse. Leur dessus, a 5 mm sous zero,
    // recouvre la parcelle creusee d'un batiment en fouille ou en fondations : sans cela, on ne pourrait pas la cliquer
    sol.root.traverse((o) => {
      if (o.isMesh) o.raycast = () => {};
    });
    fixes.push("site-ground");
    for (const c of [...imp.clotures, ...imp.decor, ...imp.projecteurs]) {
      const inst = await cree(c.id, c.params);
      const m = pose(c.cle, c.id, inst, c.position, c.rotation || 0);
      if (c.zone) m.zone = c.zone; // un projecteur pose derriere la cloture reste de la zone du chantier
      if (c.couleur) {
        m.zone = null; // le cabanon de la fete garde ses couleurs, meme dans une zone encore grise
        colore(inst.root);
      }
      etat(m, components[c.id].meta.states[0], {});
      if (c.id === "site-fence") portailDe(m, false);
      if (c.id === "party-shed") feteDe(m, false);
      fixes.push(c.cle);
    }
    for (const [id, l] of Object.entries(imp.lieux)) {
      if (SIGNAUX.includes(l.element)) continue; // les panneaux viennent de GDC
      const inst = await cree(l.element, l.params);
      etat(
        pose(id, l.element, inst, l.position),
        components[l.element].meta.states[0],
        {},
      );
      fixes.push(id);
    }
    // les bordures des zones, peintes au sol : une copie du materiau d'equipe par zone
    for (const [cle, { x, z }] of Object.entries(imp.cadres)) {
      const d = tokens.materiaux[ZONES[cle].materiau];
      const mat = new THREE.MeshStandardMaterial({
        name: ZONES[cle].materiau,
        color: new THREE.Color(
          tokens.monde[d.couleur] ?? tokens.team[d.couleur] ?? d.couleur,
        ),
        roughness: d.rugosite,
        metalness: d.metal,
      });
      const l = BORDURE.largeur;
      const cx = (x[0] + x[1]) / 2;
      const cz = (z[0] + z[1]) / 2;
      for (const [px, pz, w, p] of [
        [cx, z[0], x[1] - x[0] + l, l],
        [cx, z[1], x[1] - x[0] + l, l],
        [x[0], cz, l, z[1] - z[0]],
        [x[1], cz, l, z[1] - z[0]],
      ]) {
        const bande = new THREE.Mesh(cube, mat);
        bande.scale.set(w, BORDURE.epaisseur, p);
        bande.position.set(px, BORDURE.dessus - BORDURE.epaisseur / 2, pz);
        bande.receiveShadow = ctxOptions.quality === "high";
        bande.userData.zone = cle;
        plateau.add(bande);
        peintures.push(bande);
      }
    }
    for (const b of peintures) grise(b, b.userData.zone);
    // le voile du sol de chaque zone encore grise
    for (const [cle, { x, z }] of Object.entries(imp.cadres)) {
      if (gris[cle].actif) continue;
      const voile = new THREE.Mesh(
        plan,
        new THREE.MeshBasicMaterial({ color: fond, transparent: true, opacity: VOILE.opacite, depthWrite: false }),
      );
      voile.rotation.x = -Math.PI / 2;
      voile.scale.set(x[1] - x[0], z[1] - z[0], 1);
      voile.position.set((x[0] + x[1]) / 2, VOILE.hauteur, (z[0] + z[1]) / 2);
      voile.userData.villePropre = true;
      voile.raycast = () => {}; // comme le terrain, il ne se designe pas : un clic le traverse jusqu'aux lieux de la zone
      plateau.add(voile);
      gris[cle].voile = voile;
    }
    // le plateau recentre sur le terrain, avance vers la camera
    plateau.position.set(RECUL - centre[0], 0, RECUL - centre[2]);
    plateau.updateMatrix();
  }

  // --- placer un element de GDC
  let lu = null;
  // les abords d'un batiment, selon son type (implantation.js)
  const abordsDe = (idBatiment) =>
    abords(parcelleDe(idBatiment), lu.batiments.find((b) => b.id === idBatiment)?.type);
  const parcelleDe = (idBatiment) => {
    const k = lu?.parcelle.get(idBatiment);
    return k === undefined
      ? null
      : imp.parcelles[Math.min(k, imp.parcelles.length - 1)];
  };
  // les panneaux d'un meme lieu se rangent cote a cote
  function placeSignal(el, rangs) {
    const cle = `${el.element}@${el.ancre}`;
    const n = rangs.get(cle) || 0;
    rangs.set(cle, n + 1);
    const l = imp.lieux[el.ancre];
    if (l) {
      // la grille du lieu, six panneaux au plus ; les suivants comptent dans le badge du dernier
      const groupe = groupesPanneaux.get(cle) || { lieu: el.ancre, element: el.element, montres: [], total: 0 };
      groupesPanneaux.set(cle, groupe);
      groupe.total++;
      if (n >= MAX_PANNEAUX) return { surplus: true };
      groupe.montres.push(el.id);
      const [x, y, z] = l.panneau || l.position;
      const g = l.grille || GRILLE;
      const i = n % PAR_RANG;
      const r = Math.floor(n / PAR_RANG);
      const k = g.centre ? [0, 1, -1][i] : i; // centre : le premier au milieu du rang, puis de part et d'autre
      return {
        position: [x + k * g.pas[0] + r * g.rang[0], y, z + k * g.pas[1] + r * g.rang[1]],
        rotation: 0,
      };
    }
    const p = parcelleDe(el.ancre);
    if (!p) return null;
    const [x, , z] = p.position;
    if (el.element === "defect-sign")
      return { position: [x - 2 + n * 1.2, 0, z + 4.2], rotation: 0 };
    return { position: [x + 2.6 + n * 1.4, 0, p.porte[1] - 0.6], rotation: 0 };
  }
  function placeDe(el, rangs) {
    if (imp.lieux[el.id] && !SIGNAUX.includes(el.element))
      return { fixe: el.id };
    if (el.element === "building") {
      const p = parcelleDe(el.id);
      return (
        p && {
          position: p.position,
          rotation: 0,
          params: { type: lu.batiments.find((b) => b.id === el.id).type },
        }
      );
    }
    if (SIGNAUX.includes(el.element)) return placeSignal(el, rangs);
    const p = parcelleDe(el.ancre);
    if (!p) return null;
    if (el.element === "survey-poles") {
      // les gabarits de chaque fiche encore a l'etude d'un batiment ont le meme volume, au meme endroit : un seul jeu
      // par parcelle (volume : 33 jeux empiles, 660 maillages identiques, coutaient un quart des images par seconde)
      const cle = `survey-poles@${el.ancre}`;
      if (rangs.get(cle)) return { surplus: true };
      rangs.set(cle, 1);
      return {
        position: p.position,
        rotation: 0,
        params: { width: 8, depth: 6, height: 6 },
      };
    }
    if (el.element === "crane")
      return { position: p.grue.position, rotation: p.grue.rotation };
    if (el.element === "delivery-truck")
      return { position: p.camion.position, rotation: p.camion.rotation };
    if (el.element === "excavator")
      return { position: [p.position[0] - 2, 0, p.position[2] + 3.5], rotation: 0 };
    return null;
  }
  // les donnees d'un element pour setState : seules les cles de la fiche du composant
  function donneesDe(el) {
    if (el.element === "building") {
      const b = lu.batiments.find((x) => x.id === el.id);
      return { floors: b.floors };
    }
    if (typeof el.quantite === "number") return { count: el.quantite };
    return {};
  }
  const etatValide = (el) => {
    const states = components[el.element].meta.states;
    if (states.includes(el.etat)) return el.etat;
    signale(
      `${el.element} « ${el.id} » : état ${el.etat} inconnu du composant, état ${states[0]} montré`,
    );
    return states[0];
  };

  // --- les personnes qui bougent : les agents de GDC, les ouvriers et les usagers (des acteurs)
  // acteur : { m, pos [x, z], y, marche, apres, attente, visible }
  const acteurs = new Map(); // cle -> acteur
  function acteur(m) {
    const a = {
      m,
      pos: [m.inst.root.position.x, m.inst.root.position.z],
      y: 0,
      marche: null,
      apres: null,
      attente: 0,
      suite: null,
    };
    acteurs.set(m.cle, a);
    m.acteur = a;
    return a;
  }
  function placeActeur(a, [x, z], y = 0, facing) {
    a.pos = [x, z];
    a.y = y;
    a.marche = null;
    a.m.inst.root.position.set(x, y, z);
    if (facing !== undefined)
      a.m.inst.setState(a.m.state || "idle", { facing });
  }
  // marcher le long de points du sol, puis apres() ; sans animation, on y est tout de suite. clip : walk, ou carry pour
  // un ouvrier qui porte (character 1.2.0)
  // libre : la marche n'est pas plafonnee (chemins.js) ; elle va au pas, quelle que soit la longueur (l'equipe qui va au
  // cabanon de la fete, hors du chantier, ou qui en revient)
  function marche(a, points, apres, clip = "walk", libre = false) {
    const chemin = mesure(
      [a.pos, ...points].filter(
        (p, i, l) => i === 0 || dist(l[i - 1], p) > 1e-6,
      ),
    );
    if (libre) chemin.duree = Math.max(chemin.duree, chemin.longueur / VITESSE);
    a.y = 0;
    if (!anime || chemin.longueur < 0.05) {
      const fin = chemin.points[chemin.points.length - 1];
      placeActeur(a, fin);
      apres?.();
      return 0;
    }
    a.marche = { chemin, t: 0, clip };
    a.apres = apres;
    a.m.inst.root.visible = true;
    a.m.auBureau = false; // en marche, on est dehors
    a.m.inst.setState(clip, { facing: positionSur(chemin, 0)[2] });
    a.m.state = clip;
    if (a.m.casque) lampeDe(a.m);
    return chemin.duree;
  }
  function avance(a, dt) {
    if (a.marche) {
      a.marche.t += dt;
      const f = Math.min(a.marche.t / a.marche.chemin.duree, 1);
      const [x, z, cap] = positionSur(a.marche.chemin, f);
      a.pos = [x, z];
      a.m.inst.root.position.set(x, 0, z);
      a.m.inst.setState(a.marche.clip, { facing: cap }); // le meme etat ne relance pas le clip : seul le regard tourne
      if (f >= 1) {
        a.marche = null;
        const apres = a.apres;
        a.apres = null;
        apres?.();
      }
      return true;
    }
    if (a.attente > 0) {
      a.attente -= dt;
      if (a.attente <= 0) a.suite?.();
    }
    return false;
  }
  // le chemin d'une porte a une autre, par les voies ; client : il ne traverse pas le chantier
  function cheminEntre(de, vers, client) {
    const c = chemins.chemin(de, vers, { client });
    return c ? c.points : null;
  }

  // --- les agents de GDC : leur poste (ou ils se tiennent) et leur porte (par ou ils entrent)
  function porteDe(p) {
    if (p.batiment) {
      const pa = parcelleDe(p.batiment);
      return pa ? { noeud: `allee:${pa.index + 1}`, point: pa.porte } : null;
    }
    const l = imp.lieux[p.lieu];
    return l ? { noeud: p.lieu, point: l.porte } : null;
  }
  function posteDe(p, rang) {
    if (p.batiment) {
      const mb = membres.get(`gdc:${p.batiment}`);
      const pa = parcelleDe(p.batiment);
      if (!mb || !pa) return null;
      const b = lu.batiments.find((x) => x.id === p.batiment);
      const visibles = groupFloors(b.floors, b.etat);
      const ancre =
        (p.etage || p.piece) &&
        anchorFor(
          visibles,
          { application: b.id },
          { application: b.id, fiche: p.etage, lot: p.piece },
        );
      if (ancre) {
        try {
          const v = pointAncre(mb, ancre);
          return {
            pos: [v.x + (rang % 2) * 0.6, v.z + 0.4],
            y: v.y,
            facing: ANGLE_DEHORS,
          };
        } catch {
          /* l'ancre n'existe pas dans cet etat : au pied du batiment */
        }
      }
      return {
        pos: abordsDe(p.batiment).pied[rang % 5],
        y: 0,
        facing: ANGLE_DEHORS,
      };
    }
    const l = imp.lieux[p.lieu];
    if (!l) return null;
    const mf = membres.get(p.lieu);
    if (mf && POSTES.includes(l.element)) {
      for (const nom of [`desk:${rang + 1}`, `crew:${rang + 1}`]) {
        try {
          const v = pointAncre(mf, nom);
          // desk:n est dedans, a un poste ; crew:n, devant la baraque, est dehors (la lampe frontale)
          return { pos: [v.x, v.z], y: 0, facing: ANGLE_BUREAU, auBureau: nom.startsWith("desk:") };
        } catch {
          /* poste suivant */
        }
      }
    }
    if (mf && l.element === "site-container") {
      const v = pointAncre(mf, "entry");
      return { pos: [v.x + rang * 0.7, v.z + 0.6], y: 0, facing: ANGLE_DEHORS };
    }
    // un panneau, ou un lieu plein : on se rassemble en arc derriere lui, vu de la camera, et on le regarde ; devant, on
    // cachait le panneau et volait son clic
    const [x, , z] = l.panneau || l.position;
    const angle = (5 * Math.PI) / 4 + (rang - 1) * 0.7;
    return {
      pos: [x + Math.sin(angle) * 1.6, z + Math.cos(angle) * 1.6],
      y: 0,
      facing: ANGLE_DEHORS,
    };
  }
  // les rangs des personnages par lieu, dans l'ordre de la scene
  function rangs(scene) {
    const r = new Map();
    const compte = new Map();
    for (const p of scene.personnages) {
      const cle = p.batiment ? `b:${p.batiment}` : `l:${p.lieu}`;
      const n = compte.get(cle) || 0;
      compte.set(cle, n + 1);
      r.set(p.id, n);
    }
    return r;
  }
  // Personne ne se pose sur un autre (retour de Pierre-Alain du 22 octobre 2026 : a l'etape 15, deux ouvriers tiraient le
  // meme point d'echafaudage et n'en faisaient qu'un) : chacun retient sa place, agent, ouvrier ou usager ; une place prise
  // fait tourner autour d'elle jusqu'a une place libre.
  const places = new Map(); // cle du membre -> { pos, y }
  function placeLibre(cle, voulue, y) {
    const autres = [...places].filter(([c]) => c !== cle).map(([, q]) => q);
    const pris = (pos) => autres.some((q) => Math.abs(q.y - y) < 1 && dist(q.pos, pos) < ECART_PERSONNES);
    let pos = voulue;
    for (let k = 1; k < 16 && pris(pos); k++) {
      const r = ECART_PERSONNES * (1 + Math.floor((k - 1) / 6) * 0.8);
      pos = [voulue[0] + Math.cos(k * 1.05) * r, voulue[1] + Math.sin(k * 1.05) * r];
    }
    places.set(cle, { pos, y });
    return pos;
  }
  // Le poste d'un agent, a une place libre.
  function posteAgent(p) {
    const brut = posteDe(p, rangsAgents.get(p.id) || 0);
    if (!brut)
      signale(
        `${p.nom || p.id} : lieu ${p.lieu} inconnu de la carte, posé au carrefour`,
      );
    const poste = brut || { pos: [27, 26], y: 0, facing: ANGLE_DEHORS };
    return { ...poste, pos: placeLibre(`gdc:${p.id}`, poste.pos, poste.y) };
  }
  function installeAgent(a, p) {
    const poste = posteAgent(p);
    placeActeur(a, poste.pos, poste.y);
    a.m.auBureau = !!poste.auBureau;
    a.m.inst.root.visible = true;
    etat(a.m, etatValide(p), { facing: poste.facing });
  }
  // un agent marche d'un lieu a un autre, de porte a porte, puis prend son poste et son etat
  function deplaceAgent(a, p, de) {
    const depart = de ? porteDe(de) : null;
    const arrivee = porteDe(p);
    if (!arrivee) return 0;
    const poste = posteAgent(p);
    const client = p.role === "client";
    const voie =
      (depart && cheminEntre(depart.noeud, arrivee.noeud, client)) ||
      (arrivee && cheminEntre(a.pos, arrivee.noeud, client)) ||
      [];
    a.m.inst.root.visible = true;
    return marche(a, [...voie, poste.pos], () => {
      placeActeur(a, poste.pos, poste.y);
      a.m.auBureau = !!poste.auBureau;
      etat(a.m, etatValide(p), { facing: poste.facing });
    });
  }

  // --- la vie du chantier : ouvriers et usagers
  let regime = "ferme";
  const vivants = new Map(); // cle -> { spec, a, n, phase }
  const porteBatiment = (id) => {
    const mb = membres.get(`gdc:${id}`);
    const pa = parcelleDe(id);
    try {
      const v = pointAncre(mb, "door");
      return [v.x, v.z + 0.5];
    } catch {
      return pa ? [pa.porte[0], pa.porte[1] - 1] : [27, 26];
    }
  };
  const hauteurEtage = (id, n) => {
    const mb = membres.get(`gdc:${id}`);
    try {
      return mb ? pointAncre(mb, `floor:${n}`).y : 0;
    } catch {
      return 0;
    }
  };
  const dansParcelle = (p, pa) =>
    pa && Math.abs(p[0] - pa.position[0]) < 7 && Math.abs(p[1] - pa.position[2]) < 7.5; // sa parcelle, dans sa rangee
  const horsChantier = ([x, z]) =>
    x < imp.chantier.x[0] || x > imp.chantier.x[1] || z < imp.chantier.z[0] || z > imp.chantier.z[1];
  // un trajet dans le chantier : droit dans sa parcelle, sinon par l'allee
  function trajet(a, vers, pa) {
    if (dansParcelle(a.pos, pa) && dansParcelle(vers, pa)) return [vers];
    const c = chemins.chemin(a.pos, vers);
    return c ? c.points.slice(1) : [vers];
  }
  function tacheSuivante(v) {
    const { spec, a } = v;
    const pa = parcelleDe(spec.batiment);
    if (!pa) return;
    const t = v.usager
      ? tacheUsager(spec, v.n, {
          parcelle: pa,
          porte: porteBatiment(spec.batiment),
        })
      : tache(spec, v.n, {
          parcelle: pa,
          abords: abordsDe(spec.batiment),
          points: imp.points,
          porte: porteBatiment(spec.batiment),
        });
    v.n++;
    const y = t.echafaudage ? hauteurEtage(spec.batiment, t.echafaudage) : 0;
    if (t.dedans) places.delete(spec.cle);
    else t.vers = placeLibre(spec.cle, t.vers, y);
    const arrive = () => {
      placeActeur(a, a.pos, y);
      a.m.inst.root.visible = !t.dedans;
      etat(a.m, t.etat, {
        facing: ANGLE_DEHORS + (alea(`${spec.graine}:${v.n}`)() - 0.5) * 1.6,
      });
      if (!anime) return; // moins d'animations : chacun reste a son poste, posture fixe
      a.attente = t.duree;
      a.suite = () => tacheSuivante(v);
    };
    a.m.inst.root.visible = true;
    if (!anime) {
      placeActeur(a, t.vers);
      arrive();
    } else marche(a, trajet(a, t.vers, pa), arrive, t.porte ? "carry" : "walk", horsChantier(a.pos));
  }
  // direct : une scene posee telle quelle, l'equipe est deja au cabanon ; jouee, elle y va a pied
  function pause(v, k, direct = false) {
    const place = placeLibre(v.spec.cle, placeDePause(v.spec, k, imp.points.rassemblement), 0);
    const reste = () => {
      const e = etatDePause(v.spec, v.n++);
      placeActeur(v.a, v.a.pos, 0);
      v.a.m.inst.root.visible = true;
      etat(v.a.m, e.etat, {
        facing: Math.atan2(
          imp.points.rassemblement[0] - place[0],
          imp.points.rassemblement[1] - place[1],
        ),
      });
      if (!anime) return;
      v.a.attente = e.duree;
      v.a.suite = reste;
    };
    v.a.attente = 0;
    v.a.m.inst.root.visible = true;
    if (!anime || direct) {
      placeActeur(v.a, place);
      reste();
    } else marche(v.a, trajet(v.a, place, null), reste, "walk", true);
  }
  // les ouvriers et usagers voulus par une scene (le regime peut etre celui d'une action en cours de lecture)
  const voulusPar = (scene) => [
    ...equipes(scene, { quality: ctxOptions.quality, graine, force: options.force }),
    ...usagers(scene, { quality: ctxOptions.quality, graine }),
  ];
  // creer ceux qui manquent, caches, avant de jouer la scene (le chargement est asynchrone, la lecture ne l'est pas)
  async function prepareVie(scene) {
    for (const spec of voulusPar(scene)) {
      if (vivants.has(spec.cle)) continue;
      const usager = spec.cle.startsWith("usager:");
      const tirage = alea(`${spec.graine}:visage`);
      const params = usager
        ? parametresUsager(tirage, COLORIS_VILLE[spec.rang % COLORIS_VILLE.length])
        : parametresOuvrier(tirage, spec.phase === "excavation" && spec.rang === 0);
      const inst = await cree("character", params, true);
      const m = pose(spec.cle, "character", inst, [0, 0, 0]);
      m.zone = null;
      m.vie = true;
      m.casque = porteCasque(params);
      inst.root.visible = false;
      etat(m, "idle", {});
      vivants.set(spec.cle, { spec, a: acteur(m), n: 0, usager, pret: false });
    }
  }
  // Le regime s'applique : ouverture (on sort du vestiaire), ouvert, pause (au rassemblement), fermeture (on rentre au
  // vestiaire). transition : un passage joue (une action de GDC), et non l'etat d'une scene posee telle quelle.
  // Un ouvrier qui n'est plus voulu s'en va ; un ouvrier voulu mais pas encore cree attend la scene suivante.
  function vie(scene, transition) {
    const ancien = regime;
    regime = scene.regime;
    if (ancien !== regime) {
      for (const m of membres.values()) {
        if (m.id === "floodlight") projecteurDe(m);
        if (m.id === "party-shed") feteDe(m, transition);
      }
      portails(transition);
    }
    const specs = new Map(voulusPar(scene).map((s) => [s.cle, s]));
    let k = 0;
    for (const [cle, v] of [...vivants]) {
      const spec = specs.get(cle);
      if (!spec) {
        // il s'en va : par le vestiaire a la fermeture, sinon il s'efface
        vivants.delete(cle);
        v.a.suite = null;
        if (v.pret && transition && anime && !v.usager) {
          v.a.attente = 0;
          marche(v.a, trajet(v.a, imp.points.vestiaire, null), () => retire(cle), "walk", horsChantier(v.a.pos));
        } else retire(cle);
        continue;
      }
      const change =
        !v.pret ||
        spec.phase !== v.spec.phase ||
        spec.rangement !== v.spec.rangement ||
        spec.bloque !== v.spec.bloque ||
        ancien !== regime;
      v.spec = spec;
      if (!change) continue;
      if (!v.pret) {
        // il arrive : du vestiaire a l'ouverture, sinon il est deja a son poste
        v.pret = true;
        const pa = imp.parcelles[Math.min(spec.index, imp.parcelles.length - 1)];
        placeActeur(v.a, v.usager ? porteBatiment(spec.batiment) : transition && anime ? imp.points.vestiaire : abordsDe(spec.batiment).pied[spec.rang % 5]);
      }
      v.n = 0;
      if (regime === "pause" && !v.usager) pause(v, k++, !transition);
      else tacheSuivante(v);
    }
  }
  // Une lecture interrompue par la scene suivante : les marches et les impulsions finissent net, l'etat recu s'applique.
  function termine() {
    file = [];
    for (const a of [...acteurs.values()]) {
      if (!a.marche) continue;
      const { points } = a.marche.chemin;
      const apres = a.apres;
      a.marche = null;
      a.apres = null;
      placeActeur(a, points[points.length - 1]);
      apres?.();
    }
    for (const e of effets.splice(0)) {
      e.m.inst.root.scale.setScalar(1);
      e.fin?.();
    }
    while (roulages.length) {
      // une fin peut lancer un autre trajet (le camion qui recule, puis repart) : on les finit tous
      const r = roulages.shift();
      if (r.rotation !== undefined) r.m.inst.root.rotation.y = r.rotation;
      r.fin?.();
    }
    if (portailEnAttente) portails(false);
    concilie(lu, false);
    vie(lu, false);
  }

  // --- la lecture d'une scene : les actions jouees dans l'ordre, puis l'etat recu, qui a toujours le dernier mot
  let rangsAgents = new Map();
  let file = []; // les instants a jouer, puis la conciliation
  let attente = 0;
  const actives = new Set(); // les zones deja activees : pour toujours (decision de Pierre-Alain du 21 octobre 2026)
  let effets = []; // les impulsions : { m, de, vers, t, fin }

  let groupesPanneaux = new Map(); // element@lieu -> { lieu, element, montres, total }
  async function prepare(scene) {
    rangsAgents = rangs(scene);
    const placeRangs = new Map();
    groupesPanneaux = new Map();
    for (const el of scene.elements.values()) {
      if (el.element === "ground") continue;
      if (el.element === "crane") {
        grueDe.set(el.id, el.ancre); // la grue de sa parcelle (grues)
        continue;
      }
      const cle = `gdc:${el.id}`;
      if (el.element === "character") {
        if (!membres.has(cle)) {
          const p = personneDe(el);
          if (!p)
            signale(
              `${el.nom || el.id} (rôle ${el.role}) : personne inconnue d'equipe.json, tenue d'études`,
            );
          const params = p
            ? parametresDe(p)
            : { trade: "engineer", team: "studies" };
          const m = pose(
            cle,
            "character",
            await cree("character", params, true),
          );
          m.zone = null;
          m.casque = porteCasque(params);
          m.inst.root.visible = false;
          m.el = el;
          acteur(m);
        }
        membres.get(cle).el = el;
        continue;
      }
      const place = placeDe(el, placeRangs);
      if (place?.surplus) {
        retire(cle); // un panneau au-dela de six (il compte dans le badge du dernier), ou des gabarits deja poses
        continue;
      }
      if (!place) {
        signale(
          `${el.element} « ${el.id} » : pas de place sur la carte (ancre ${el.ancre ?? "absente"}), ignoré`,
        );
        continue;
      }
      if (place.fixe) {
        membres.get(place.fixe).el = el;
        continue;
      }
      const ancien = membres.get(cle);
      if (ancien && ancien.id !== el.element) retire(cle);
      if (!membres.has(cle)) {
        const m = pose(
          cle,
          el.element,
          await cree(el.element, place.params),
          place.position,
          place.rotation,
        );
        m.inst.root.visible = false;
      }
      const m = membres.get(cle);
      m.el = el;
      m.inst.root.position.set(...place.position); // un panneau peut changer de rang
      m.zone = zoneDe(imp.cadres, place.position[0], place.position[2]);
    }
    for (const b of scene.batiments) {
      const cle = `grue:${b.id}`;
      const pa = parcelleDe(b.id);
      if (!pa || membres.has(cle) || !veutGrue(b, scene)) continue;
      const m = pose(cle, "crane", await cree("crane"), pa.grue.position, pa.grue.rotation);
      m.inst.root.visible = false;
      m.batiment = b.id;
    }
  }

  // --- la grue de chaque parcelle : montee pendant le gros oeuvre, ou quand GDC la pose (lifting, la fusion vers dev) ;
  // elle se monte et se demonte (retour de Pierre-Alain du 22 octobre 2026 : elle apparaissait « comme par magie »)
  const grueDe = new Map(); // identifiant de la grue de GDC -> batiment
  const grueGdc = (b, scene) =>
    [...scene.elements.values()].find((e) => e.element === "crane" && e.ancre === b.id) || null;
  const veutGrue = (b, scene) => Boolean(grueGdc(b, scene)) || PHASES_GRUE.includes(b.phase);
  function grues(scene, doucement) {
    let duree = 0;
    for (const [cle, m] of [...membres]) {
      if (!cle.startsWith("grue:")) continue;
      const b = scene.batiments.find((x) => x.id === m.batiment);
      if (!b || !veutGrue(b, scene)) {
        if (!m.inst.root.visible || m.demonte) continue;
        m.demonte = true;
        if (doucement && anime) {
          impulsion(m, 1, 0, () => retire(cle), "y", MONTAGE_GRUE);
          duree = MONTAGE_GRUE;
        } else retire(cle);
        continue;
      }
      const el = grueGdc(b, scene);
      m.el = el;
      etat(m, el && components.crane.meta.states.includes(el.etat) ? el.etat : "idle", {});
      if (!m.inst.root.visible) {
        m.inst.root.visible = true;
        if (doucement && anime) {
          impulsion(m, 0, 1, null, "y", MONTAGE_GRUE);
          duree = MONTAGE_GRUE;
        }
      }
    }
    return duree;
  }

  // --- le camion de livraison : il arrive par la voie et le portail jusqu'a sa place sur la parcelle, et repart par le
  // meme chemin (retours de Pierre-Alain du 22 octobre 2026 : il apparaissait « comme par miracle », puis vidait sa
  // benne en roulant et tournait « tres carre »). Il roule benne baissee (idle) et ne la leve (arriving) qu'a l'arret ;
  // il prend les angles en arc, accelere au depart et ralentit avant l'arret ; il recule hors de sa place pour repartir.
  let roulages = []; // { m, chemin, duree, t, fin, rotation, recul }
  // Les angles d'un chemin arrondis : un arc (une courbe de Bezier) de rayon au plus r, sans depasser la moitie des
  // segments voisins.
  function arrondit(points, r = RAYON_VIRAGE) {
    if (points.length < 3) return points;
    const sortie = [points[0]];
    for (let i = 1; i < points.length - 1; i++) {
      const [a, b, c] = [points[i - 1], points[i], points[i + 1]];
      const k = Math.min(r, dist(a, b) / 2, dist(b, c) / 2);
      if (k < 0.05) {
        sortie.push(b);
        continue;
      }
      const vers = (p, q, d) => [q[0] + ((p[0] - q[0]) * d) / dist(p, q), q[1] + ((p[1] - q[1]) * d) / dist(p, q)];
      const [p0, p2] = [vers(a, b, k), vers(c, b, k)];
      for (let n = 0; n <= 6; n++) {
        const t = n / 6;
        sortie.push([
          (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * b[0] + t ** 2 * p2[0],
          (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * b[1] + t ** 2 * p2[1],
        ]);
      }
    }
    sortie.push(points[points.length - 1]);
    return sortie.filter((p, i) => i === 0 || dist(sortie[i - 1], p) > 1e-6);
  }
  function trajetCamion(m) {
    const pa = parcelleDe(m.el?.ancre);
    if (!pa) return null;
    const [x, , z] = pa.camion.position;
    const voie = imp.voies.points["voie:entree"];
    const dehors = [voie.x, imp.terrain.z[1] - 0.4];
    const c = chemins.chemin(dehors, `allee:${pa.index + 1}`);
    return [dehors, ...(c ? c.points.slice(1) : []), [x - 6, z - 3.4], [x - 4, z], [x, z]];
  }
  // rouler le long de points ; recul : en marche arriere (le cap reste celui de l'avant)
  // aligne : il part deja dans l'axe de la voie (il arrive de hors de la carte)
  function roule(m, points, fin, { rotation, recul = false, aligne = false } = {}) {
    if (!points || !anime) {
      fin?.();
      return 0;
    }
    const chemin = mesure(recul ? points : arrondit(points));
    m.inst.root.visible = true;
    m.inst.root.position.set(points[0][0], 0, points[0][1]);
    if (aligne) m.inst.root.rotation.y = positionSur(chemin, 0)[2];
    m.roule = true;
    roulages.push({ m, chemin, s: 0, v: 0, fin, rotation, recul });
    return dureeDe(chemin, recul);
  }
  const benneBaissee = (m) => etat(m, "idle", {}); // il roule benne baissee
  function arriveCamion(m) {
    const pa = parcelleDe(m.el?.ancre);
    benneBaissee(m);
    return roule(
      m,
      trajetCamion(m),
      () => {
        m.roule = false;
        if (pa) {
          m.inst.root.position.set(...pa.camion.position);
          m.inst.root.rotation.y = pa.camion.rotation;
        }
        if (m.el) etat(m, etatValide(m.el), donneesDe(m.el)); // garé : la benne se leve
      },
      { rotation: pa?.camion.rotation, aligne: true },
    );
  }
  // dans l'enceinte du chantier, ou il roule au pas
  const dansEnceinte = ([x, z]) => x > imp.chantier.x[0] && x < imp.chantier.x[1] && z > imp.chantier.z[0] && z < imp.chantier.z[1];
  // l'allure voulue a la distance s d'un chemin : au pas dans l'enceinte, et deja au pas quand il y entre bientot
  function allure(r, v) {
    if (r.recul) return VITESSE_RECUL;
    const freinage = (v * v) / (2 * ACCELERATION) + 1;
    const ici = positionSur(r.chemin, r.s / r.chemin.longueur);
    const devant = positionSur(r.chemin, Math.min(r.s + freinage, r.chemin.longueur) / r.chemin.longueur);
    return dansEnceinte(ici) || dansEnceinte(devant) ? VITESSE_ENCEINTE : VITESSE_ROUTE;
  }
  // la duree d'un trajet a cette allure, pour la lecture des actions (une estimation : la vitesse de croisiere par
  // morceau de 0,5 m, plus le demarrage et le freinage)
  function dureeDe(chemin, recul) {
    if (recul) return chemin.longueur / VITESSE_RECUL + VITESSE_RECUL / ACCELERATION;
    let t = 0;
    for (let s = 0; s < chemin.longueur; s += 0.5)
      t += Math.min(0.5, chemin.longueur - s) / (dansEnceinte(positionSur(chemin, s / chemin.longueur)) ? VITESSE_ENCEINTE : VITESSE_ROUTE);
    return t + VITESSE_ROUTE / ACCELERATION;
  }
  function repartCamion(m) {
    m.part = true;
    const t = trajetCamion(m);
    if (!t || !anime) {
      retire(m.cle);
      return 0;
    }
    benneBaissee(m);
    // il recule en biais hors de sa place, vers l'allee, puis repart en avant par la voie
    const [x, z] = t[t.length - 1];
    const recule = [x - RECUL_CAMION, z - 3.5];
    const aller = [recule, ...t.slice(0, -3).reverse()];
    const d1 = roule(m, [[x, z], recule], () => roule(m, aller, () => retire(m.cle)), { recul: true });
    return d1 + dureeDe(mesure(arrondit(aller)), false);
  }

  // l'etat recu : chaque element a sa place et son etat ; ce qui n'est plus dans la scene s'en va
  function concilie(scene, doucement) {
    lieuxOccupes.clear();
    for (const p of scene.personnages) if (p.lieu) lieuxOccupes.add(p.lieu);
    // les objets d'abord (un batiment change d'etage, et ses ancres avec), puis les agents a leur poste
    const agents = [];
    for (const [cle, m] of [...membres]) {
      if (!cle.startsWith("gdc:")) continue;
      const id = cle.slice(4);
      const el = scene.elements.get(id);
      if (!el) {
        if (m.acteur && m.acteur.marche) continue; // il rentre deja
        if (m.part) continue; // le camion repart deja
        if (m.id === "delivery-truck" && doucement && anime) repartCamion(m);
        else if (doucement && anime && !m.acteur)
          impulsion(m, 1, 0, () => retire(cle));
        else retire(cle);
        continue;
      }
      if (m.acteur) {
        agents.push([m, id]);
        continue;
      }
      if (!m.inst.root.visible) {
        m.inst.root.visible = true;
        if (m.id === "delivery-truck" && doucement && anime) arriveCamion(m);
        else if (doucement && anime) impulsion(m, 0, 1);
      }
      if (!m.roule) etat(m, etatValide(el), donneesDe(el)); // un camion qui roule garde sa benne baissee
    }
    for (const c of [...places.keys()]) if (c.startsWith("gdc:")) places.delete(c); // les postes des agents sont refaits
    for (const [m, id] of agents)
      if (!m.acteur.marche)
        installeAgent(
          m.acteur,
          scene.personnages.find((p) => p.id === id),
        );
    grues(scene, doucement);
    for (const id of Object.keys(imp.lieux)) {
      const m = membres.get(id);
      if (!m) continue;
      const el = scene.elements.get(id);
      if (el) etat(m, etatValide(el), donneesDe(el));
    }
    // les zones : celles qui s'activent prennent leur couleur, une fois, pour toujours
    for (const [zone, oui] of Object.entries(scene.zones))
      if (oui && !actives.has(zone)) active(zone, doucement);
    for (const m of membres.values()) fenetresDe(m);
    vitres.purge(root); // les copies des membres retires
  }
  function active(zone, doucement) {
    actives.add(zone);
    const z = gris[zone];
    if (!z || z.actif) return;
    z.actif = true;
    if (doucement && anime) z.fondu = 0;
    else finitFondu(zone);
  }
  function retireVoile(z) {
    if (!z.voile) return;
    z.voile.removeFromParent();
    z.voile.material.dispose();
    z.voile = null;
  }
  function finitFondu(zone) {
    const z = gris[zone];
    retireVoile(z);
    for (const m of membres.values()) if (m.zone === zone) colore(m.inst.root);
    for (const b of peintures) if (b.userData.zone === zone) colore(b);
    for (const c of z.clones.values()) c.dispose();
    z.clones.clear();
    z.fondu = null;
    for (const m of membres.values()) if (m.zone === zone) fenetresDe(m);
  }
  // une impulsion : l'echelle de de a vers ; axe « y » : seulement la hauteur (une grue qui se monte)
  function impulsion(m, de, vers, fin, axe = "tout", duree = IMPULSION) {
    effets.push({ m, de, vers, t: 0, fin, axe, duree });
    echelle(m, de, axe);
  }
  function echelle(m, v, axe) {
    const k = Math.max(v, 0.001);
    if (axe === "y") m.inst.root.scale.set(1, k, 1);
    else m.inst.root.scale.setScalar(k);
  }

  // un instant de GDC : ses actions ensemble ; rend sa duree (la plus longue marche)
  function joue(instant, scene) {
    let duree = 0;
    for (const a of instant.actions) {
      const fait = jouAction(a, scene);
      duree = Math.max(duree, fait ?? 0);
    }
    return duree;
  }
  function jouAction(a, scene) {
    if (["ouverture", "pause", "fermeture"].includes(a.action)) {
      vie(
        {
          ...scene,
          regime:
            a.action === "fermeture"
              ? "ferme"
              : a.vers || (a.action === "pause" ? "pause" : "ouvert"),
        },
        true,
      );
      return IMPULSION;
    }
    if (PROPOSEES.includes(a.action)) return actionProposee(a, scene);
    if (a.element === "crane") return grues(scene, true); // elle se monte, leve ou se demonte avec sa parcelle
    if (!connus.has(a.element)) {
      signale(
        `action ${a.action} sur ${a.element} « ${a.id} » : composant absent du catalogue, ignorée`,
      );
      return 0;
    }
    const m =
      membres.get(`gdc:${a.id}`) || (imp.lieux[a.id] && membres.get(a.id));
    if (!m) return 0;
    const el = scene.elements.get(a.id);
    if (m.acteur) {
      const p = scene.personnages.find((x) => x.id === a.id);
      const ac = m.acteur;
      if (a.action === "apparait" && p) {
        // il sort de la porte de son lieu
        const porte = porteDe(p);
        placeActeur(ac, porte ? porte.point : posteAgent(p).pos);
        ac.m.inst.root.visible = true;
        const poste = posteAgent(p);
        return marche(ac, [poste.pos], () => installeAgent(ac, p));
      }
      if (a.action === "deplace" && p)
        return deplaceAgent(ac, p, { ...lisLieuSimple(a.de) });
      if (a.action === "change" && p) {
        if (!ac.marche)
          etat(
            ac.m,
            components.character.meta.states.includes(a.vers)
              ? a.vers
              : etatValide(p),
            {},
          );
        return IMPULSION;
      }
      if (a.action === "disparait") {
        // il rentre par la porte de son lieu
        const ancien = ac.m.el && { ...lisLieuSimple(ac.m.el.lieu) };
        const porte = ancien && porteDe(ancien);
        if (!porte || !anime) {
          retire(ac.m.cle);
          return 0;
        }
        return marche(ac, [porte.point], () => retire(ac.m.cle));
      }
      return 0;
    }
    if (a.action === "apparait") {
      if (!m.inst.root.visible) {
        m.inst.root.visible = true;
        if (m.id === "delivery-truck") return arriveCamion(m);
        if (el) etat(m, etatValide(el), donneesDe(el));
        if (anime) impulsion(m, 0, 1);
      }
      return IMPULSION;
    }
    if (a.action === "change" && el) {
      const states = components[m.id].meta.states;
      etat(m, states.includes(a.vers) ? a.vers : etatValide(el), donneesDe(el));
      // un batiment qui entre dans le gros oeuvre, ou qui en sort : sa grue se monte ou se demonte avec lui
      if (m.id === "building") return Math.max(IMPULSION, grues(scene, true));
      return IMPULSION;
    }
    if (a.action === "quantite") {
      etat(m, m.state || components[m.id].meta.states[0], {
        ...(el ? donneesDe(el) : {}),
        count: Number(a.vers) || 0,
      });
      return IMPULSION;
    }
    if (a.action === "disparait") {
      if (m.id === "delivery-truck") return repartCamion(m);
      if (anime) impulsion(m, 1, 0, () => retire(m.cle));
      else retire(m.cle);
      return IMPULSION;
    }
    signale(`action ${a.action} inconnue, ignorée`);
    return 0;
  }
  // les actions proposees a GDC (docs/demandes-a-gdc.md, section 5), si elles arrivent : un ou plusieurs agents vont a
  // un lieu ; l'etat recu dit ensuite ou ils restent
  function actionProposee(a, scene) {
    if (a.action === "demande")
      return jouAction(
        { ...a, action: "quantite", element: "parking", id: "parking" },
        scene,
      );
    const qui = [a.id, ...(a.participants || [])].filter(
      (id) => membres.get(`gdc:${id}`)?.acteur,
    );
    const vers =
      a.vers ||
      a.lieu ||
      (a.aupres && scene.personnages.find((p) => p.id === a.aupres)?.lieu) ||
      (a.batiment && `batiment:${a.batiment}`) ||
      (a.action === "remise" && "cabane-cles");
    if (!qui.length || !vers) {
      signale(`action ${a.action} : agent ou lieu introuvable, ignorée`);
      return 0;
    }
    let duree = 0;
    qui.forEach((id, k) => {
      const ac = membres.get(`gdc:${id}`).acteur;
      const cible = {
        ...lisLieuSimple(vers),
        role: scene.personnages.find((p) => p.id === id)?.role,
        etat: "talk",
        id,
      };
      const poste = posteDe(cible, k) || { pos: ac.pos };
      const arrivee = porteDe(cible);
      const voie = arrivee
        ? cheminEntre(ac.pos, arrivee.noeud, cible.role === "client") || []
        : [];
      duree = Math.max(
        duree,
        marche(ac, [...voie, poste.pos], () =>
          etat(ac.m, a.action === "controle" ? "inspect" : "talk", {
            facing: ANGLE_DEHORS,
          }),
        ),
      );
    });
    return duree;
  }
  const lisLieuSimple = (lieu) =>
    String(lieu || "").startsWith("batiment:")
      ? { batiment: String(lieu).slice(9) }
      : { lieu };

  // --- l'interface de la carte, pour GDC et la galerie
  let premiere = true;
  let coupe = null;
  let ouvertures = 0; // le numero de la derniere ouverture ou fermeture de la coupe demandee

  const carte = {
    root,
    signalements,
    // Une nouvelle scene de GDC. La premiere se pose telle quelle ; les suivantes jouent leurs actions dans l'ordre,
    // puis l'etat recu s'applique. Une scene qui arrive pendant la lecture de la precedente la termine d'abord.
    // actions: false pose la scene telle quelle (un saut de plusieurs etapes).
    async applique(scene, { force = options.force, actions = true } = {}) {
      options.force = force;
      if (file.length) termine();
      const suivante = lisScene(scene, connus);
      for (const m of suivante.inconnus) signale(m);
      await coucheFixe(suivante.types);
      lu = suivante;
      await prepare(lu);
      await prepareVie(lu);
      if (premiere || !anime || !actions) {
        premiere = false;
        concilie(lu, false);
        vie(lu, false);
        return;
      }
      file = instants(scene.actions).map((i) => ({ instant: i }));
      file.push({ fin: true });
      attente = 0;
    },
    update(dt) {
      let encore = false;
      // la file des instants
      if (file.length) {
        encore = true;
        attente -= dt;
        while (file.length && attente <= 0) {
          const etape = file.shift();
          if (etape.fin) {
            concilie(lu, true);
            vie(lu, false);
          } else attente = joue(etape.instant, lu) + ENTRE_INSTANTS;
        }
      }
      for (const a of [...acteurs.values()]) if (avance(a, dt)) encore = true;
      if (portailEnAttente && !ouvriersEnMarche()) {
        portailEnAttente = false;
        for (const m of membres.values()) if (m.id === "site-fence") portailDe(m, true);
        encore = true;
      }
      // l'anneau de la selection suit l'agent choisi ; il respire, comme celui du survol
      if (choixAgent && membres.has(choixAgent.cle)) aSesPieds(anneauChoix.petit, choixAgent);
      if (anneauChoix) for (const r of Object.values(anneauChoix)) if (r.update(dt)) encore = true;
      // l'anneau de l'agent survole le suit ; un agent qui s'en va l'emporte
      if (agentSurvole) {
        if (!membres.has(agentSurvole.cle) || !visibleDe(agentSurvole.inst.root)) {
          agentSurvole = null;
          anneauAgent.setState("hidden");
        } else aSesPieds(anneauAgent, agentSurvole);
        if (anneauAgent.update(dt)) encore = true;
      }
      for (const r of [...roulages]) {
        encore = true;
        // son allure : il accelere jusqu'a la vitesse du lieu (la route, l'enceinte), et freine pour s'arreter juste
        const reste = r.chemin.longueur - r.s;
        const vmax = Math.min(allure(r, r.v), Math.sqrt(2 * ACCELERATION * reste));
        r.v = r.v < vmax ? Math.min(r.v + ACCELERATION * dt, vmax) : Math.max(r.v - ACCELERATION * dt, vmax);
        r.s = Math.min(r.s + Math.max(r.v, 0.3) * dt, r.chemin.longueur);
        r.vitesse = r.v; // pour le controle
        const f = r.chemin.longueur ? r.s / r.chemin.longueur : 1;
        // son cap rejoint celui de la voie sans a-coup
        const [x, z, cap] = positionSur(r.chemin, f);
        r.m.inst.root.position.set(x, 0, z);
        const vise = r.recul ? cap + Math.PI : cap;
        const ecart = Math.atan2(Math.sin(vise - r.m.inst.root.rotation.y), Math.cos(vise - r.m.inst.root.rotation.y));
        r.m.inst.root.rotation.y += ecart * Math.min(1, dt * BRAQUAGE);
        if (f >= 1) {
          roulages.splice(roulages.indexOf(r), 1);
          if (r.rotation !== undefined) r.m.inst.root.rotation.y = r.rotation;
          r.fin?.();
        }
      }
      if (effets.length) {
        encore = true;
        for (const e of [...effets]) {
          e.t += dt;
          const f = Math.min(e.t / e.duree, 1);
          echelle(e.m, lerp(e.de, e.vers, f * f * (3 - 2 * f)), e.axe);
          if (f >= 1) {
            effets.splice(effets.indexOf(e), 1);
            e.m.inst.root.scale.setScalar(1);
            e.fin?.();
          }
        }
      }
      for (const [zone, z] of Object.entries(gris)) {
        if (z.fondu === null) continue;
        encore = true;
        z.fondu += dt;
        const f = Math.min(z.fondu / FONDU_ZONE, 1);
        for (const c of z.clones.values())
          if (c.userData.gris)
            c.color.copy(c.userData.gris).lerp(c.userData.origine.color, f);
        if (z.voile) z.voile.material.opacity = VOILE.opacite * (1 - f);
        if (f >= 1) finitFondu(zone);
      }
      for (const m of membres.values())
        if (m.inst.root.visible && m.inst.update(dt)) encore = true;
      if (coupe) encore = majCoupe(dt) || encore;
      horloge += dt;
      // un choix qui retombe se voit tout de suite, sans attendre le pas de l'horloge
      if (finChoix !== null && maintenant() >= finChoix) horloge = PAS_HEURE;
      if (horloge >= PAS_HEURE) {
        horloge = 0;
        if (majHeure()) encore = true;
      }
      return encore || (anime && vivants.size > 0);
    },
    // Les panneaux de decision de chaque lieu : ceux qui sont montres (six au plus, chacun avec son badge) et le total ;
    // badges : ce que porte le badge de chacun, 1, et pour le dernier quand il y en a plus de six, les decisions qu'il
    // regroupe (le reste : total - 5, ecrit « +12 ») ; reste : l'identifiant de ce dernier, ou null.
    panneaux() {
      return [...groupesPanneaux.values()].map((g) => ({
        lieu: g.lieu,
        element: g.element,
        total: g.total,
        montres: [...g.montres],
        badges: Object.fromEntries(g.montres.map((id, k) => [id, k === g.montres.length - 1 && g.total > g.montres.length ? g.total - k : 1])),
        reste: g.total > g.montres.length ? g.montres[g.montres.length - 1] : null,
      }));
    },
    // La selection (gdc-select, derniere passe de GDC, section 6) : ou la carte va, et l'anneau de selection pose.
    // { id, ref } et { id, ref, evt } : l'ancre trouvee par src/etages.js (la piece d'un lot, l'etage d'une fiche) ou le
    // batiment de l'application, et l'anneau ; { id: "etape:<n>", etape } : le centre de la zone de l'etape, sans
    // anneau ; { id } d'un agent (son repere, sa prise) : ses pieds, et l'anneau ; { id } d'un lieu : ce lieu.
    // Rend { point } dans le repere de la carte (l'hote y conduit sa camera, camera.js), ou null.
    async selectionne(detail) {
      if (!anneauChoix) {
        anneauChoix = {
          grand: await cree("selection-ring", { radius: 6.2 }),
          petit: await cree("selection-ring", { radius: 0.9 }),
        };
        for (const r of Object.values(anneauChoix)) {
          plateau.add(r.root);
          r.setState("hidden");
        }
      }
      anneauChoix.grand.setState("hidden");
      anneauChoix.petit.setState("hidden");
      choixAgent = null;
      if (!detail || !lu) return null;
      const versCarte = (v) => v.clone().applyMatrix4(plateau.matrix);
      const pose = (r, v) => {
        r.root.position.copy(v).setY(v.y + 0.02); // a la hauteur de son ancre : un etage en hauteur, une piece
        r.setState("selected");
      };
      // une etape : le centre de sa zone
      const n = Number(detail.etape ?? String(detail.id || "").match(/^etape:(\d+)$/)?.[1]);
      if (ETAPES[n]) {
        const c = imp.cadres[ETAPES[n].zone];
        return { point: versCarte(new THREE.Vector3((c.x[0] + c.x[1]) / 2, 0, (c.z[0] + c.z[1]) / 2)), zone: ETAPES[n].zone };
      }
      // un agent, par l'identifiant de GDC ou par celui d'equipe.json (son repere), avant la fiche ou il travaille : la
      // carte va a lui, la ou il se tient vraiment (dans la coupe ouverte, a sa piece ou sur le palier)
      const agent = [...membres.values()].find(
        (m) => m.acteur && !m.vie && m.el && m.cle.startsWith("gdc:") && (m.el.id === detail.id || personneDe(m.el)?.id === detail.id),
      );
      if (agent) {
        choixAgent = agent;
        aSesPieds(anneauChoix.petit, agent);
        anneauChoix.petit.setState("selected");
        return { point: versCarte(agent.inst.root.position), agent: agent.el.id };
      }
      // une reference : la piece, l'etage ou le batiment
      const ref = detail.ref;
      // la coupe ouverte sur cette fiche : le batiment est cache, la carte va a la piece du lot, ou a la coupe
      if (ref?.application && coupe && coupe.fiche !== undefined && ref.fiche === coupe.fiche) {
        const bc = lu.batiments.find((x) => x.id === coupe.id);
        if (bc && (bc.ref?.application || bc.id) === ref.application) {
          coupe.inst.root.updateMatrix();
          const k = (coupe.rooms || []).findIndex((r) => r.id === ref.lot);
          if (k >= 0) {
            const v = coupe.inst.anchor(`room:${k + 1}`).applyMatrix4(coupe.inst.root.matrix);
            pose(anneauChoix.petit, v);
            return { point: versCarte(v), ancre: `room:${k + 1}`, coupe: true };
          }
          return { point: versCarte(coupe.inst.root.position), ancre: null, coupe: true };
        }
      }
      if (ref?.application) {
        const b = lu.batiments.find((x) => (x.ref?.application || x.id) === ref.application);
        const m = b && membres.get(`gdc:${b.id}`);
        if (!m) return null;
        const ancre = anchorFor(groupFloors(b.floors, b.etat), { application: ref.application }, ref);
        if (!ancre) {
          pose(anneauChoix.grand, m.inst.root.position);
          return { point: versCarte(m.inst.root.position), ancre: null };
        }
        const v = pointAncre(m, ancre);
        pose(anneauChoix.petit, v);
        return { point: versCarte(v), ancre };
      }
      // un lieu fixe
      const lieu = membres.get(detail.id);
      if (lieu && imp.lieux[detail.id]) return { point: versCarte(lieu.inst.root.position), lieu: detail.id };
      return null;
    },
    // Les agents de la carte, pour leur repere (agent-marker) et leur prise au pointeur (prise.js) : jamais d'ouvrier ni
    // d'usager. id : celui de GDC ; personne : celui d'equipe.json (les portraits) ; tete : l'ancre label de character
    // (2,05 m) ; pieds : sa place au sol ; les deux dans le repere de la carte, que l'hote projette a l'ecran.
    agents() {
      const liste = [];
      for (const m of membres.values()) {
        if (!m.acteur || m.vie || !m.el || !m.cle.startsWith("gdc:") || !visibleDe(m.inst.root)) continue;
        let tete;
        try {
          tete = pointAncre(m, "label").applyMatrix4(plateau.matrix);
        } catch {
          continue;
        }
        liste.push({
          id: m.el.id,
          personne: personneDe(m.el)?.id ?? m.el.id,
          name: m.el.nom || m.el.id,
          state: m.state || m.el.etat,
          tete,
          pieds: m.inst.root.position.clone().applyMatrix4(plateau.matrix),
        });
      }
      return liste;
    },
    // L'agent survole (la prise, cote carte) : l'anneau de selection, au survol et a l'encre, a ses pieds ; il le suit
    // quand il marche. null : l'anneau s'en va.
    async survoleAgent(id) {
      if (!anneauAgent) {
        anneauAgent = await cree("selection-ring", { radius: 0.55 });
        plateau.add(anneauAgent.root);
        anneauAgent.setState("hidden");
      }
      agentSurvole = id ? membres.get(`gdc:${id}`) || null : null;
      anneauAgent.setState(agentSurvole ? "hover" : "hidden");
      if (agentSurvole) aSesPieds(anneauAgent, agentSurvole);
    },
    // Le point d'une ancre d'un element de GDC pose sur la carte (son badge, son label), dans le repere de la carte ;
    // null s'il n'est pas montre.
    ancreElement(id, nom = "badge") {
      const m = membres.get(`gdc:${id}`);
      if (!m || !m.inst.root.visible) return null;
      try {
        return pointAncre(m, nom).applyMatrix4(plateau.matrix);
      } catch {
        return null;
      }
    },
    // Les reperes HTML : les etapes et les passages sur leurs lieux fixes, la pastille de chaque batiment.
    reperes() {
      const noms = [
        "etape:1",
        "passage:continue",
        "etape:2",
        "etape:3",
        "etape:4",
        "passage:feu-vert",
        "etape:7",
        "etape:8",
        "etape:9",
        "etape:10",
      ];
      return [
        ...noms,
        ...(lu ? lu.batiments.map((b) => `batiment:${b.id}`) : []),
      ];
    },
    anchor(nom) {
      const v = pointRepere(nom);
      return v.applyMatrix4(plateau.matrix);
    },
    // ce que dit un repere : numero, titre, icone, zone ; attenue : sa zone n'a jamais ete activee
    repere(nom) {
      const def = REPERES[nom];
      if (def) {
        const e = def.etape ? ETAPES[def.etape] : {};
        const zone = def.zone || e.zone;
        return {
          numero: def.etape,
          titre: def.titre || e.titre,
          icone: def.icone || e.icone,
          zone,
          passage: Boolean(def.passage),
          pastille: false,
          attenue: !gris[zone].actif,
        };
      }
      if (nom.startsWith("batiment:") && lu) {
        const b = lu.batiments.find((x) => x.id === nom.slice(9));
        if (!b) return null;
        const n = b.etape;
        const e = n ? ETAPES[n] : {};
        return {
          numero: n,
          titre: `${b.nom} : ${e.titre ?? b.etat}`,
          icone: e.icone,
          zone: e.zone || "chantier",
          passage: false,
          pastille: true,
          ref: b.ref || { application: b.id },
          attenue: false,
        };
      }
      return null;
    },
    // les cadres des zones, au sol : quatre coins chacun, dans le repere de la carte ; activee : sa couleur est venue
    cadres() {
      return Object.entries(imp.cadres).map(([cle, { x, z }]) => ({
        cle,
        ...ZONES[cle],
        activee: gris[cle].actif,
        coins: [
          [x[0], z[0]],
          [x[1], z[0]],
          [x[1], z[1]],
          [x[0], z[1]],
        ].map(([a, b]) =>
          new THREE.Vector3(a, 0.06, b).applyMatrix4(plateau.matrix),
        ),
      }));
    },
    // L'element de GDC sous un objet touche (le clic de GDC) : { element, id, ref, ancre } ; ancre, le batiment ou le lieu
    // sur lequel GDC l'a pose (les gabarits d'un batiment en plot), ou null. null pour le decor, les ouvriers et les
    // usagers, qui ne s'ouvrent pas.
    cible(objet) {
      const m = membreDe(objet);
      if (!m || !m.el) return null;
      return {
        element: m.el.element,
        id: m.el.id,
        ref: m.el.ref || null,
        ancre: m.el.ancre || null,
      };
    },
    // Parmi les objets qu'un rayon touche (le clic ou le survol de GDC : intersectObject sur root, du plus proche au plus
    // loin, les objets visibles), le premier qui designe un element de GDC ou une piece de la coupe ; null sinon. Le
    // rayon traverse ainsi les ouvriers, les usagers et le decor poses devant ou sur un batiment.
    designe(objets) {
      return (
        objets.find((o) => carte.cible(o) || carte.refSous(o)) || null
      );
    },
    // La reference survolee sous un objet (le survol partage) : le batiment, l'etage ou la piece ; null ailleurs.
    refSous(objet) {
      if (coupe) {
        // une piece de la vue en coupe : son lot ; le reste de la coupe : la fiche de l'etage ouvert
        let o = objet;
        while (o && o !== coupe.inst.root && !o.userData.room) o = o.parent;
        if (o) {
          const b = lu.batiments.find((x) => x.id === coupe.id);
          const etage = { grouped: false, ids: [coupe.fiche] };
          const r = o.userData.room
            ? coupe.rooms[o.userData.room.index - 1]
            : null;
          return refOf(b.ref || { application: b.id }, etage, r);
        }
      }
      const m = membreDe(objet);
      if (!m || m.id !== "building" || !m.el) return null;
      const b = lu.batiments.find((x) => x.id === m.el.id);
      const visibles = groupFloors(b.floors, b.etat);
      let etage = null;
      let piece = null;
      for (let o = objet; o && o !== m.inst.root; o = o.parent) {
        if (o.userData.room && !piece) piece = o.userData.room;
        if (o.userData.floor && !etage) etage = o.userData.floor;
      }
      const f = etage && visibles.find((v) => v.index === etage.index);
      const r = f && piece ? f.rooms[piece.index - 1] : null;
      return refOf(b.ref || { application: b.id }, f, r);
    },
    // Le survol partage cote carte : l'anneau (selection-ring, hover) sur ce qui correspond le plus precisement.
    async surligne(ref) {
      if (!anneau) {
        anneau = {
          grand: await cree("selection-ring", { radius: 6.2 }),
          petit: await cree("selection-ring", { radius: 0.9 }),
        };
        for (const r of Object.values(anneau)) {
          plateau.add(r.root);
          r.setState("hidden");
        }
      }
      anneau.grand.setState("hidden");
      anneau.petit.setState("hidden");
      if (!ref || !lu) return;
      if (coupe && ref.fiche !== undefined && ref.fiche !== null) {
        const b = lu.batiments.find((x) => x.id === coupe.id);
        if ((b.ref?.application || b.id) === ref.application) {
          // dans la coupe ouverte, l'anneau va a la piece du lot ; la fiche seule n'en pose pas (toute la vue l'est),
          // ni une autre fiche du batiment, cache le temps de la vue
          if (ref.fiche !== coupe.fiche) return;
          const m = coupe.rooms.findIndex((r) => r.id === ref.lot);
          if (m < 0) return;
          coupe.inst.root.updateMatrix();
          anneau.petit.root.position.copy(
            coupe.inst
              .anchor(`room:${m + 1}`)
              .applyMatrix4(coupe.inst.root.matrix),
          );
          anneau.petit.setState("hover");
          return;
        }
      }
      const b = lu.batiments.find(
        (x) => (x.ref?.application || x.id) === ref.application,
      );
      const m = b && membres.get(`gdc:${b.id}`);
      if (!m) return;
      const ancre = anchorFor(
        groupFloors(b.floors, b.etat),
        { application: ref.application },
        ref,
      );
      if (!ancre) {
        anneau.grand.root.position.copy(m.inst.root.position);
        anneau.grand.setState("hover");
        return;
      }
      anneau.petit.root.position.copy(pointAncre(m, ancre));
      anneau.petit.setState("hover");
    },
    // La vue en coupe d'un etage (building-interior 2.0.0 : une piece par lot, les agents a leur piece ou sur le palier) :
    // fiche, l'etage clique ou choisi au selecteur d'etages ; sans fiche, l'etage en chantier le plus haut.
    // L'heure (fiche day-night) : { moment, jour }, jour de 0 (la nuit) a 1 (le jour). regleHeure fixe un moment pour les
    // revues ("jour", "aube", "nuit" ou de 0 a 1 ; null : l'heure du poste) et rend true s'il faut redessiner. recette() :
    // le ciel, le soleil ou la lune, le fond et l'allumage des fenetres de l'instant, pour une page qui regle ses lumieres.
    get heure() {
      return { moment, jour };
    },
    regleHeure(h, { garde = false } = {}) {
      const connu =
        h === null ||
        h === undefined ||
        (typeof h === "number" && h >= 0 && h <= 1) ||
        Object.hasOwn(MOMENTS, h);
      if (!connu) signale(`heure : moment ${h} inconnu, l'heure réelle est reprise`);
      heureFixe = connu ? (h ?? null) : null;
      finChoix =
        heureFixe === null || garde
          ? null
          : (horaireDe(maintenant()).prochain?.instant ?? null);
      horloge = 0;
      return majHeure();
    },
    // L'horaire, pour le selecteur de l'interface (time-of-day) : mode ("auto", ou le moment choisi), le moment reel,
    // le lever et le coucher du jour a Fribourg, le prochain passage, et fin, l'instant ou le choix retombe en auto.
    horaire() {
      const h = horaireDe(maintenant());
      // un choix echu se dit tout de suite en auto ; la lumiere suit au prochain update
      const echu = finChoix !== null && h.maintenant >= finChoix;
      const mode =
        heureFixe === null || echu
          ? "auto"
          : typeof heureFixe === "number"
            ? moment
            : heureFixe;
      return { ...h, mode, fin: echu ? null : finChoix };
    },
    recette: () => recetteDe(jour, fondTheme),
    ouvreCoupe: (id, fiche) => ouvreCoupe(id, fiche),
    fermeCoupe: () => fermeCoupe(),
    get coupe() {
      return coupe ? coupe.id : null;
    },
    // ce que la coupe montre : l'etage ouvert, ses pieces (data.rooms) et la place de chaque agent (room:n ou palier)
    get vueCoupe() {
      if (!coupe) return null;
      const { id, fiche, rooms, places } = coupe;
      return { id, fiche, rooms, places };
    },
    get regime() {
      return regime;
    },
    get applications() {
      return imp.apps;
    },
    // ce que la carte montre : pour le rapport de la galerie et la mesure de fluidite
    compte() {
      let ouvriers = 0;
      let gens = 0;
      for (const v of vivants.values())
        if (v.usager) gens++;
        else ouvriers++;
      return {
        composants: membres.size,
        ouvriers,
        usagers: gens,
        agents: [...membres.values()].filter((m) => m.acteur && !m.vie).length,
        personnes: [...membres.values()].filter((m) => m.id === "character").length, // tous ceux qui sont poses
        // les camions de livraison : leur etat et s'ils roulent
        camions: [...membres.values()].filter((m) => m.id === "delivery-truck").map((m) => ({ state: m.state, roule: Boolean(m.roule) })),
        // les grues montees, par batiment
        grues: [...membres.values()].filter((m) => m.batiment && m.id === "crane" && m.inst.root.visible).map((m) => m.batiment),
        // les paires de personnes arretees trop pres l'une de l'autre (au meme niveau)
        chevauchements: (() => {
          const poses = [...membres.values()].filter((m) => m.acteur && !m.acteur.marche && m.inst.root.visible).map((m) => m.inst.root.position);
          let n = 0;
          for (let i = 0; i < poses.length; i++)
            for (let j = i + 1; j < poses.length; j++)
              if (Math.abs(poses[i].y - poses[j].y) < 1 && Math.hypot(poses[i].x - poses[j].x, poses[i].z - poses[j].z) < ECART_PERSONNES - 0.05) n++;
          return n;
        })(),
      };
    },
    dispose() {
      file = [];
      fermeCoupe(true);
      for (const cle of [...membres.keys()]) retire(cle);
      for (const z of Object.keys(gris)) finitFondu(z);
      for (const b of peintures) b.material.dispose();
      plan.dispose();
      cube.dispose();
      if (anneau) for (const r of Object.values(anneau)) r.dispose();
      anneauAgent?.dispose();
      if (anneauChoix) for (const r of Object.values(anneauChoix)) r.dispose();
      vitres.libere();
    },
  };
  let anneau = null;
  let anneauAgent = null; // l'anneau de l'agent survole (agent-marker)
  let anneauChoix = null; // l'anneau de la selection (selectionne)
  let choixAgent = null; // l'agent choisi : l'anneau le suit
  // un anneau aux pieds d'un agent, a la hauteur ou il se tient (une aire, un plancher, un etage), juste au-dessus
  const aSesPieds = (anneau, m) => anneau.root.position.copy(m.inst.root.position).setY(m.inst.root.position.y + 0.02);
  let agentSurvole = null;
  const visibleDe = (o) => {
    for (let x = o; x && x !== root; x = x.parent) if (!x.visible) return false;
    return true;
  };

  // un objet touche -> le membre qui le contient
  const parRacine = () =>
    new Map([...membres.values()].map((m) => [m.inst.root, m]));
  function membreDe(objet) {
    const index = parRacine();
    for (let o = objet; o; o = o.parent) if (index.has(o)) return index.get(o);
    return null;
  }

  // les reperes fixes : une etape ou un passage, sur un lieu (son ancre label) ou sur la place d'un panneau
  const REPERES = {
    "etape:1": { etape: 1, lieu: "bureau-architecte" },
    "passage:continue": {
      titre: "On continue ?",
      zone: "bureaux",
      passage: true,
      panneau: "bureau-client",
    },
    "etape:2": { etape: 2, lieu: "bureau-etudes" },
    "etape:3": { etape: 3, passage: true, panneau: "panneau-permis" },
    "etape:4": { etape: 4, lieu: "baraque" },
    "passage:feu-vert": {
      titre: "Feu vert",
      icone: "feu-vert",
      zone: "chantier",
      passage: true,
      panneau: "panneau-feu-vert",
    },
    "etape:7": { etape: 7, passage: true, lieu: "aire-reception" },
    "etape:8": { etape: 8, passage: true, lieu: "cabane-cles" },
    "etape:9": { etape: 9, lieu: "cabane-garantie" },
    "etape:10": { etape: 10, lieu: "cabane-transformations" },
  };
  function pointRepere(nom) {
    const def = REPERES[nom];
    if (def?.lieu) return pointAncre(membres.get(def.lieu), "label");
    if (def?.panneau) {
      const l = imp.lieux[def.panneau];
      const [x, , z] = l.panneau || l.position;
      return new THREE.Vector3(x, HAUTEUR_REPERE, z);
    }
    if (nom.startsWith("batiment:")) {
      const m = membres.get(`gdc:${nom.slice(9)}`);
      if (m) return pointAncre(m, "label");
    }
    throw new Error(`ancre inconnue : ${nom}`);
  }

  // --- la vue en coupe (building-interior 2.0.0) : un etage ouvert, une piece par lot
  // L'etage d'un batiment a ouvrir : la fiche demandee (l'etage clique, ou choisi au selecteur d'etages) ; sinon l'etage
  // en chantier le plus haut, sinon le dernier (decision de Pierre-Alain du 22 octobre 2026). Un batiment sans etage
  // s'ouvre sur un etage vide a son stade.
  function etageAOuvrir(b, fiche) {
    const etages = b.etages || [];
    if (fiche !== undefined && fiche !== null) {
      const e = etages.find((x) => x.fiche === fiche);
      if (e) return e;
    }
    const enChantier = etages.filter((e) => !e.livre);
    return (
      enChantier[enChantier.length - 1] ||
      etages[etages.length - 1] || { fiche: null, stade: b.etat, pieces: [] }
    );
  }
  async function ouvreCoupe(id, fiche) {
    if (coupe) fermeCoupe(true);
    const jeton = ++ouvertures;
    const b = lu?.batiments.find((x) => x.id === id);
    const mb = membres.get(`gdc:${id}`);
    if (!b || !mb) return false;
    const etage = etageAOuvrir(b, fiche);
    const sesAgents = lu.personnages.filter(
      (p) => p.batiment === id && (p.etage ?? null) === etage.fiche,
    );
    // les metiers presents par lot, et les lots qu'un defect-sign de cette application designe (un defaut sur la fiche
    // seule n'en designe aucun : decision de Pierre-Alain du 22 octobre 2026)
    const app = b.ref?.application || b.id;
    const trades = {};
    for (const p of sesAgents)
      if (p.piece)
        (trades[p.piece] ||= []).push(
          parametresDe(personneDe(p) || { metier: "engineer" }).trade,
        );
    const defects = [...lu.elements.values()]
      .filter(
        (x) =>
          x.element === "defect-sign" &&
          x.ref?.application === app &&
          x.ref?.fiche === etage.fiche &&
          x.ref?.lot,
      )
      .map((x) => x.ref.lot);
    // douze pieces au plus (la fiche) : les agents des lots suivants attendent sur le palier
    const rooms = roomsFromPieces(etage.pieces, { defects, trades }).slice(
      0,
      components["building-interior"].meta.params.rooms.max,
    );
    const inst = await cree("building-interior", {
      rooms: Math.max(rooms.length, 1),
    });
    // une autre ouverture, ou une fermeture, est passee pendant le chargement : celle-ci n'a plus lieu d'etre
    if (jeton !== ouvertures) {
      inst.dispose();
      return false;
    }
    inst.root.position.copy(mb.inst.root.position);
    plateau.add(inst.root);
    inst.setState("default", { floor: { stage: etage.stade }, rooms });
    // le batiment et ce qui l'entoure (engins, grue de la parcelle) s'effacent, avec les agents des autres etages ; ceux
    // de l'etage vont a leur piece, ou sur le palier, devant, s'ils n'en ont pas (controle, mission, relecture)
    const autres = lu.personnages
      .filter((p) => p.batiment === id && !sesAgents.includes(p))
      .map((p) => membres.get(`gdc:${p.id}`))
      .filter(Boolean);
    const caches = [...membres.values()].filter(
      (m) =>
        m.inst.root.visible &&
        (m === mb ||
          autres.includes(m) ||
          m.batiment === id ||
          m.el?.ancre === id ||
          (m.vie && vivants.get(m.cle)?.spec.batiment === id)),
    );
    for (const m of caches) m.inst.root.visible = false;
    inst.root.updateMatrixWorld(true);
    const boite = new THREE.Box3()
      .setFromObject(inst.root)
      .applyMatrix4(inst.root.matrixWorld.clone().invert());
    const surPalier = sesAgents.filter(
      (p) => !rooms.some((r) => r.id === p.piece),
    );
    const parPiece = {};
    const deplaces = [];
    const places = {};
    for (const p of sesAgents) {
      const a = membres.get(`gdc:${p.id}`)?.acteur;
      if (!a) continue;
      const m = rooms.findIndex((r) => r.id === p.piece);
      let local;
      if (m >= 0) {
        // dans sa piece, les agents d'une meme piece cote a cote
        const k = (parPiece[m] = (parPiece[m] ?? -1) + 1);
        const n = sesAgents.filter((x) => x.piece === p.piece).length;
        local = inst
          .anchor(`room:${m + 1}`)
          .add(new THREE.Vector3((k - (n - 1) / 2) * ECART_PIECE, 0, 0));
        places[p.id] = `room:${m + 1}`;
      } else {
        const k = surPalier.indexOf(p);
        local = new THREE.Vector3(
          (k - (surPalier.length - 1) / 2) * ECART_PIECE,
          0,
          boite.max.z - PALIER,
        );
        places[p.id] = "palier";
      }
      const v = local.add(inst.root.position);
      deplaces.push({
        a,
        avant: [...a.pos],
        y: a.y,
        visible: a.m.inst.root.visible,
      });
      placeActeur(a, [v.x, v.z], v.y);
      a.m.inst.root.visible = true;
    }
    coupe = {
      id,
      fiche: etage.fiche,
      rooms,
      places,
      inst,
      caches,
      deplaces,
      fermeture: null,
    };
    return true;
  }
  function fermeCoupe(net = false) {
    ouvertures++; // annule une ouverture encore en chargement
    if (!coupe) return;
    if (net || !anime) return finitCoupe();
    coupe.inst.setState("hidden");
    coupe.fermeture = 0;
  }
  function majCoupe(dt) {
    const bouge = coupe.inst.update(dt);
    if (coupe.fermeture === null) return bouge;
    coupe.fermeture += dt;
    if (!bouge || coupe.fermeture > 2) finitCoupe();
    return true;
  }
  function finitCoupe() {
    const { inst, caches, deplaces } = coupe;
    inst.root.removeFromParent();
    inst.dispose();
    for (const m of caches) if (membres.has(m.cle)) m.inst.root.visible = true;
    for (const d of deplaces) {
      placeActeur(d.a, d.avant, d.y);
      d.a.m.inst.root.visible = d.visible;
    }
    coupe = null;
  }

  // la carte commence vide (le terrain, chantier ferme), jusqu'a la premiere scene
  await coucheFixe(["block"]);
  majHeure();
  return carte;
}
