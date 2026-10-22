// Les modeles 3D (GLB produits par les scripts Blender) : charges une fois par l'hote (galerie, controle, GDC),
// puis copies pour chaque instance. Un composant ne charge jamais rien lui-meme : il recoit ctx.assets.
//
// Nom d'un asset dans meta.assets : 'FICHIER.glb' (dossier du composant) ou '<categorie>:<id>/FICHIER.glb' (dossier
// d'un autre composant ou d'un kit : 'kit:building-kit/...', 'machine:excavator/...').
//
// Le chargeur tient le registre commun des materiaux (src/materiaux.js, plan D-1) : a l'ouverture d'un modele, chaque
// MAT_ deja connu est remplace par le meme objet partage, pour toute la page.
import { creeRegistre } from './materiaux.js';

export function cleAsset(meta, nom) {
  const deux = nom.indexOf(':');
  if (deux > 0) return nom.slice(0, deux) + '/' + nom.slice(deux + 1);
  return meta.category + '/' + meta.id + '/' + nom;
}

function versArrayBuffer(source) {
  if (source instanceof ArrayBuffer) return source;
  if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
  if (typeof source === 'string' && source.startsWith('data:')) {
    const binaire = atob(source.slice(source.indexOf(',') + 1));
    const octets = new Uint8Array(binaire.length);
    for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
    return octets.buffer;
  }
  throw new Error('source de modele illisible');
}

// sources : { 'categorie/id/FICHIER.glb': ArrayBuffer | data URL } ; GLTFLoader et SkeletonUtils fournis par l'hote.
export function creeChargeur({ GLTFLoader, SkeletonUtils }, sources) {
  const caches = new Map();
  const registre = creeRegistre();
  const loader = new GLTFLoader();
  const charge = (cle) => {
    if (!caches.has(cle)) {
      if (!(cle in sources)) return Promise.reject(new Error('modele absent de la bibliotheque : ' + cle));
      caches.set(cle, new Promise((ok, ko) => loader.parse(versArrayBuffer(sources[cle]), '', (g) => { registre.adopte(g.scene); ok(g); }, ko)));
    }
    return caches.get(cle);
  };
  return {
    registre,
    // ctx.materiau, a passer a makeContext : le materiau partage d'un MAT_ de la palette, jamais libere par un composant.
    materiau: (THREE) => (nom) => registre.palette(THREE, nom),
    // A appeler avant create() : charge les modeles d'un composant (une seule fois).
    async prepare(meta) {
      await Promise.all((meta.assets || []).map((n) => charge(cleAsset(meta, n))));
    },
    // Une copie par instance : la geometrie et les materiaux restent partages, donc jamais liberes par le composant.
    async assetsPour(meta) {
      const out = {};
      for (const n of meta.assets || []) {
        const g = await charge(cleAsset(meta, n));
        out[n] = { scene: SkeletonUtils.clone(g.scene), animations: g.animations };
      }
      return out;
    },
    // Les ressources partagees d'un composant, et tout le registre (y compris ce que le composant lui demandera) : le
    // controle verifie qu'il ne les libere pas. Seul has() sert.
    async partagees(meta) {
      const s = new Set();
      for (const n of meta.assets || []) {
        const g = await charge(cleAsset(meta, n));
        g.scene.traverse((o) => {
          if (o.geometry) s.add(o.geometry);
          for (const m of [].concat(o.material || [])) { s.add(m); for (const v of Object.values(m)) if (v && v.isTexture) s.add(v); }
        });
      }
      return { has: (x) => s.has(x) || registre.possede(x) };
    },
  };
}
