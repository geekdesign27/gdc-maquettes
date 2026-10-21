// Le hasard a graine de la vie du chantier : la meme scene donne toujours les memes ouvriers, aux memes taches.

// Un entier de 32 bits tire d'un texte (FNV-1a).
export function hache(texte) {
  let h = 0x811c9dc5;
  for (let i = 0; i < texte.length; i++) {
    h ^= texte.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Un tirage entre 0 et 1, rejouable (mulberry32) ; graine : un nombre ou un texte.
export function alea(graine) {
  let a = typeof graine === "number" ? graine >>> 0 : hache(String(graine));
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const choisis = (tirage, liste) =>
  liste[Math.floor(tirage() * liste.length) % liste.length];
export const entre = (tirage, min, max) => min + tirage() * (max - min);
