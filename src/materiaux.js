// Le registre commun des materiaux (plan D-1, bible 18.4) : un seul objet par materiau de la palette pour toute la page.
// Chaque GLB apporte ses propres copies des MAT_ ; a l'ouverture d'un modele, le chargeur (src/assets.js) remplace
// chaque MAT_ deja connu par le meme objet partage. Les composants qui fabriquent un materiau de la palette le
// demandent au registre (ctx.materiau) au lieu d'en creer un par instance ; les teintes d'une tenue (les remplacants
// de la carte) y sont partagees aussi, une par couleur.
// Le registre appartient a l'hote (la galerie, le controle, GDC) : un composant ne libere jamais un materiau partage,
// comme il ne libere jamais une ressource d'un modele (docs/contrat-composant.md).
import palette from "./palette.json" with { type: "json" };

// La couleur d'un materiau : une cle de monde, d'equipe ou de personnages (comme commun.couleur cote Blender).
export function couleurPalette(cle) {
  return (
    palette.monde[cle] ??
    palette.equipe[cle] ??
    palette.personnages?.[cle] ??
    cle
  );
}

// Un materiau MAT_ de la palette, neuf, tel que le GLB l'apporterait : couleur sRGB, rugosite, metal.
export function nouveauMateriau(THREE, nom) {
  const d = palette.materiaux[nom];
  if (!d) throw new Error(`matériau absent de la palette : ${nom}`);
  return new THREE.MeshStandardMaterial({
    name: nom,
    color: new THREE.Color(couleurPalette(d.couleur)),
    roughness: d.rugosite,
    metalness: d.metal,
  });
}

const hex = (c) => (c && c.isColor ? c.getHexString() : "-");
const aTexture = (m) => Object.values(m).some((v) => v && v.isTexture);
// Deux materiaux sont le meme quand tout ce qui se voit est egal : couleurs a l'octet pres (sRGB), rugosite, metal,
// lueur, faces, transparence, couleurs de sommets. Un MAT_ arrive avec d'autres reglages reste a part (ecarts).
function signature(m) {
  const n = (x) => (typeof x === "number" ? +x.toFixed(3) : "-");
  return [
    m.type,
    m.name,
    hex(m.color),
    n(m.roughness),
    n(m.metalness),
    hex(m.emissive),
    n(m.emissiveIntensity),
    m.side,
    m.transparent,
    n(m.opacity),
    n(m.alphaTest),
    m.vertexColors,
    m.flatShading,
    m.depthWrite,
    m.depthTest,
    m.visible,
    // les materiaux physiques (extensions KHR_materials_*) : aucun GLB n'en a, mais ils ne se fondent pas en silence
    n(m.transmission),
    n(m.ior),
    n(m.specularIntensity),
    n(m.clearcoat),
    n(m.sheen),
    n(m.iridescence),
  ].join("|");
}

export function creeRegistre() {
  const parSignature = new Map();
  const signatureDuNom = new Map();
  const ecarts = new Set();
  const palettes = new Map(); // nom -> materiau partage, pour ctx.materiau
  const teintes = new Map(); // materiau de base + couleur -> copie teinte partagee

  // Le materiau partage equivalent a m (m lui-meme s'il est le premier de son espece). Un materiau a texture ou hors
  // palette (sans nom MAT_) n'est pas range : il reste a son proprietaire. Les ecarts ne se comparent qu'entre modeles :
  // les GLB exportent leurs faces doubles, les materiaux faits par le code non, et chacun garde son rendu.
  function range(m, duModele = false) {
    if (!/^MAT_/.test(m.name || "") || aTexture(m)) return m;
    const s = signature(m);
    if (!parSignature.has(s)) parSignature.set(s, m);
    if (duModele) {
      if (!signatureDuNom.has(m.name)) signatureDuNom.set(m.name, s);
      else if (signatureDuNom.get(m.name) !== s) ecarts.add(m.name);
    }
    return parSignature.get(s);
  }

  return {
    // A l'ouverture d'un modele, avant toute copie : ses MAT_ deja connus deviennent les objets partages. Ses propres
    // exemplaires, remplaces avant d'avoir servi, sont liberes.
    adopte(scene) {
      const remplaces = new Set();
      const partage = (m) => {
        const r = range(m, true);
        if (r !== m) remplaces.add(m);
        return r;
      };
      scene.traverse((o) => {
        if (!o.material) return;
        o.material = Array.isArray(o.material)
          ? o.material.map(partage)
          : partage(o.material);
      });
      for (const m of remplaces) m.dispose();
    },
    // Le materiau partage d'un MAT_ de la palette (ctx.materiau) : le meme que celui des modeles quand ils l'ont.
    palette(THREE, nom) {
      if (!palettes.has(nom)) {
        const neuf = nouveauMateriau(THREE, nom);
        const r = range(neuf);
        if (r !== neuf) neuf.dispose();
        palettes.set(nom, r);
      }
      return palettes.get(nom);
    },
    // Une copie teinte d'un materiau partage, la meme pour toutes les tenues de cette couleur.
    teinte(base, couleur) {
      const cle = `${base.uuid}|${couleur}`;
      if (!teintes.has(cle)) {
        const c = base.clone();
        c.color.set(couleur);
        teintes.set(cle, c);
      }
      return teintes.get(cle);
    },
    // Tout ce que le registre possede : le controle verifie qu'aucun composant ne le libere.
    materiaux() {
      return new Set([...parSignature.values(), ...teintes.values()]);
    },
    possede(m) {
      return this.materiaux().has(m);
    },
    // Les MAT_ arrives sous le meme nom avec des reglages differents (gardes a part, a corriger dans leur script).
    get ecarts() {
      return [...ecarts];
    },
    // Pour l'hote seulement, quand il quitte la page du chantier : le chargeur qui le tient ne sert plus ensuite (ses
    // modeles deja ouverts gardent des materiaux liberes) ; en creer un neuf pour revenir.
    dispose() {
      for (const m of this.materiaux()) m.dispose();
      parSignature.clear();
      signatureDuNom.clear();
      palettes.clear();
      teintes.clear();
    },
  };
}
