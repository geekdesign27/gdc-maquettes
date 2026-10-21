// Le survol partage (lot G8, hover-link) : la carte, le fil des declencheurs et l'arbre des fiches se repondent.
// Une reference { application, fiche?, lot? } est un chemin ; deux references correspondent quand l'une prolonge
// l'autre. La regle et le suivi du pointeur et du focus sont ecrits ici une fois, et injectes dans chaque element
// (ctx.correspond, ctx.sameRef, ctx.hoverLink), comme la signaletique.

const LEVELS = ["application", "fiche", "lot"];

// Le chemin d'une reference, coupe au premier niveau absent : { application: 'a', lot: 'L1' } donne ['a'],
// car un lot n'a de sens que dans sa fiche (GDC numerote les lots L1, L2… dans chaque fiche).
function path(ref) {
  const p = [];
  if (!ref || typeof ref !== "object") return p;
  for (const level of LEVELS) {
    const v = ref[level];
    if (v === undefined || v === null || v === "") break;
    p.push(String(v));
  }
  return p;
}

// La reference propre, telle qu'elle est emise : seulement ses niveaux valides, ou null.
function clean(ref) {
  const p = path(ref);
  return p.length ? Object.fromEntries(p.map((v, i) => [LEVELS[i], v])) : null;
}

// Survoler un lot allume sa fiche et son application ; survoler une application allume ses fiches et ses lots.
// Deux voisins (deux fiches d'une meme application) ne correspondent pas ; une reference vide ne correspond a rien.
export function correspond(a, b) {
  const pa = path(a);
  const pb = path(b);
  if (!pa.length || !pb.length) return false;
  for (let i = 0; i < Math.min(pa.length, pb.length); i++)
    if (pa[i] !== pb[i]) return false;
  return true;
}

// La meme reference, niveau pour niveau ; deux references vides (null) sont la meme.
export function sameRef(a, b) {
  const pa = path(a);
  const pb = path(b);
  return pa.length === pb.length && pa.every((v, i) => v === pb[i]);
}

// Suit le pointeur et le focus clavier dans un element et emet gdc-hover a chaque changement de reference, une seule
// fois : detail.ref = la reference sous le pointeur, sinon celle de l'element qui a le focus, sinon null.
// element : l'element qui emet ; refOf(node) : la reference d'un noeud de sa liste, ou null pour les autres noeuds.
// Les evenements sont ecoutes dans le shadow DOM de l'element s'il en a un, sinon sur l'element lui-meme.
export function hoverLink(element, refOf) {
  const root = element.shadowRoot || element;
  let pointed = null;
  let focused = null;
  let emitted = null;
  const refAt = (event) => {
    for (const node of event.composedPath()) {
      if (node === root || node === element) break;
      const ref = node.nodeType === 1 ? clean(refOf(node)) : null;
      if (ref) return ref;
    }
    return null;
  };
  const emit = () => {
    const ref = pointed || focused;
    if (sameRef(ref, emitted)) return;
    emitted = ref;
    element.dispatchEvent(
      new CustomEvent("gdc-hover", {
        detail: { ref },
        bubbles: true,
        composed: true,
      }),
    );
  };
  // passer d'un noeud a l'autre dans la liste ne fait qu'un evenement : la sortie vers l'interieur est ignoree
  const inside = (node) => Boolean(node) && root.contains(node);
  root.addEventListener("pointerover", (e) => {
    pointed = refAt(e);
    emit();
  });
  root.addEventListener("pointerout", (e) => {
    if (inside(e.relatedTarget)) return;
    pointed = null;
    emit();
  });
  root.addEventListener("focusin", (e) => {
    focused = refAt(e);
    emit();
  });
  root.addEventListener("focusout", (e) => {
    if (inside(e.relatedTarget)) return;
    focused = null;
    emit();
  });
}
