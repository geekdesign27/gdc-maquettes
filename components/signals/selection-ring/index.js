// L'anneau de sélection : montre l'élément survolé ou choisi.
// Composant d'exemple animé : la respiration passe par update(dt), jamais par un minuteur.

export const meta = {
  id: 'selection-ring',
  version: '1.0.0',
  category: 'signals',
  states: ['hidden', 'hover', 'selected'],
  params: {
    radius: { type: 'number', default: 1, min: 0.3, max: 10 },
  },
  anchors: [],
  budget: { triangles: 600, materials: 1 },
  animated: true,
};

const OPACITY = { hidden: 0, hover: 0.35, selected: 0.9 };
const BREATH_PERIOD = 2.4; // secondes
const BREATH_AMPLITUDE = 0.04;

export function create(THREE, params, ctx) {
  const palette = ctx.palette;
  const segments = ctx.quality === 'high' ? 48 : 24;
  const r = params.radius;

  const root = new THREE.Group();
  root.name = 'selection-ring';
  root.userData.component = meta.id;

  const geometry = new THREE.RingGeometry(r * 0.92, r * 1.05, segments);
  const material = new THREE.MeshBasicMaterial({
    color: palette.ink,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(geometry, material);
  ring.rotation.x = -Math.PI / 2; // à plat sur le sol
  ring.position.y = 0.02; // juste au-dessus, pour éviter le scintillement
  ring.renderOrder = 1;
  root.add(ring);

  let state = 'hidden';
  let time = 0;
  root.visible = false;

  return {
    root,
    setState(next) {
      if (!meta.states.includes(next)) throw new Error(`état inconnu : ${next}`);
      state = next;
      time = 0;
      root.visible = state !== 'hidden';
      material.opacity = OPACITY[state];
      ring.scale.setScalar(1);
    },
    update(dt) {
      // Sans animation, ou hors sélection : un état fixe, lisible, et aucune image en plus.
      if (state !== 'selected' || ctx.reducedMotion) return false;
      time = (time + dt) % BREATH_PERIOD;
      ring.scale.setScalar(1 + BREATH_AMPLITUDE * Math.sin((time / BREATH_PERIOD) * Math.PI * 2));
      return true;
    },
    anchor(name) {
      throw new Error(`ancre inconnue : ${name}`);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
