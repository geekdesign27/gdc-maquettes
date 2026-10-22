// L'arbre de la navigation 2.0.0 (side-nav, lot G8), tel que GDC le tirera de sa scene (schema 3) : les lieux des
// quatre zones, les batiments jusqu'aux fiches (les etages) et aux lots (les pieces), les agents. L'identifiant d'un lot
// est compose par GDC, fiche/lot ; la fraction des lots finis est { done, total } (decisions de Pierre-Alain du
// 22 octobre 2026). Les signes d'etat sont ceux de la demonstration : c'est GDC qui les choisit. Outil de fabrication,
// pour la page de demonstration et la galerie : pas livre a GDC.
const signeDe = { waiting: "waiting", active: "active", error: "error" };
export const arbreDe = (scene, extra = {}) => {
  const elements = scene.elements || [];
  const etatDe = (id) => elements.find((e) => e.id === id)?.etat;
  const batiments = elements
    .filter((e) => e.element === "building")
    .map((b) => ({
      id: b.id,
      name: b.nom,
      ref: b.ref,
      children: (b.etages || []).map((e) => {
        const ref = e.fiche ? { ...b.ref, fiche: e.fiche } : b.ref;
        const pieces = e.pieces || [];
        const id = e.fiche ?? `${b.id}/existant`;
        return {
          id,
          name: e.nom,
          ref,
          etape: e.etape,
          delivered: Boolean(e.livre),
          state: e.livre ? "done" : pieces.some((p) => p.statut === "en_cours") ? "active" : undefined,
          progress: pieces.length ? { done: pieces.filter((p) => p.statut === "fini").length, total: pieces.length } : undefined,
          children: pieces.map((p) => ({
            id: `${id}/${p.lot}`,
            name: `${p.lot} · ${p.nom}`,
            ref: { ...ref, lot: p.lot },
            state: p.statut === "fini" ? "done" : p.statut === "en_cours" ? "active" : undefined,
          })),
        };
      }),
    }));
  const agents = elements
    .filter((e) => e.element === "character")
    .map((c) => ({ id: c.id, name: c.nom, ref: c.ref ?? undefined, state: c.etat === "waiting" ? "waiting" : undefined }));
  return {
    groups: [
      ...scene.plan.zones.map((z) => ({
        title: z.nom,
        items: z.lieux.map((l) => ({ id: l.id, name: l.nom, state: signeDe[etatDe(l.id)] })),
      })),
      { title: "Les bâtiments", items: batiments },
      { title: "Les agents", items: agents },
    ],
    ...extra,
  };
};
