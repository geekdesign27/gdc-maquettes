// Le terrain : le sol du projet, sur lequel tout se pose.
// Composant d'exemple statique : il montre le contrat en entier, sans animation.

export const meta = {
  id: 'ground',
  version: '1.0.0',
  category: 'site',
  states: ['default'],
  params: {
    width: { type: 'number', default: 18, min: 4, max: 60 },
    depth: { type: 'number', default: 12, min: 4, max: 60 },
  },
  anchors: ['label'],
  budget: { triangles: 2000, materials: 3 },
  animated: false,
};

const THICKNESS = 0.3;

export function create(THREE, params, ctx) {
  const palette = ctx.palette;
  const { width, depth } = params;

  const root = new THREE.Group();
  root.name = 'ground';
  root.userData.component = meta.id;

  // La dalle : son dessus est à y = 0, pour que les autres composants s'y posent sans calcul.
  const slabGeometry = new THREE.BoxGeometry(width, THICKNESS, depth);
  const slabMaterial = new THREE.MeshLambertMaterial({ color: palette.ground });
  const slab = new THREE.Mesh(slabGeometry, slabMaterial);
  slab.position.y = -THICKNESS / 2;
  slab.receiveShadow = ctx.quality === 'high';
  root.add(slab);

  // La bordure : un trait fin qui détache le terrain du fond, en clair comme en sombre.
  const edgeGeometry = new THREE.EdgesGeometry(slabGeometry);
  const edgeMaterial = new THREE.LineBasicMaterial({ color: palette.ink, transparent: true, opacity: 0.35 });
  const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
  edges.position.copy(slab.position);
  root.add(edges);

  return {
    root,
    setState(state) {
      if (!meta.states.includes(state)) throw new Error(`état inconnu : ${state}`);
    },
    update() {
      return false;
    },
    anchor(name) {
      // Le nom du projet se pose au milieu du bord avant.
      if (name === 'label') return new THREE.Vector3(0, 0.1, depth / 2);
      throw new Error(`ancre inconnue : ${name}`);
    },
    dispose() {
      slabGeometry.dispose();
      slabMaterial.dispose();
      edgeGeometry.dispose();
      edgeMaterial.dispose();
    },
  };
}
