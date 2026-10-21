// Le controle de la carte vivante (fiche city-map) : les chemins, la lecture des actions et la vie du chantier, sans
// navigateur, sur l'implantation et sur les sequences reelles de GDC (fixtures/). Lance par « npm run check ».
import { implantation } from '../src/ville/implantation.js';
import { creeChemins, positionSur, MARCHE_MAX } from '../src/ville/chemins.js';

const erreurs = [];
let verifies = 0;
const verifie = (ok, message) => {
  verifies++;
  if (!ok) erreurs.push(message);
};

// --- Les chemins
const dans = ([x, z], r, marge = 0) => x > r.x[0] + marge && x < r.x[1] - marge && z > r.z[0] + marge && z < r.z[1] - marge;
// les points d'un chemin, tous les 25 cm
const echantillons = (c) => {
  const n = Math.max(2, Math.ceil(c.longueur / 0.25));
  return Array.from({ length: n + 1 }, (_, i) => positionSur(c, i / n));
};
for (let apps = 1; apps <= 4; apps++) {
  const imp = implantation(apps);
  const chemins = creeChemins(imp.voies);
  const lieux = Object.keys(imp.lieux);
  const bouts = [...lieux, ...imp.parcelles.map((p) => `allee:${p.index + 1}`)];
  // le socle de chaque parcelle : on n'y coupe jamais (on entre par sa porte, sur l'allee)
  const socles = imp.parcelles.map((p) => ({ x: [p.position[0] - 6, p.position[0] + 6], z: [31, 43] }));
  for (const de of bouts)
    for (const vers of bouts) {
      if (de === vers) continue;
      const c = chemins.chemin(de, vers);
      verifie(c, `${apps} app. : aucun chemin de ${de} à ${vers}`);
      if (!c) continue;
      verifie(c.duree <= MARCHE_MAX + 1e-9, `${apps} app. : ${de} → ${vers} dure ${c.duree} s, plus que le plafond`);
      verifie(
        echantillons(c).every((p) => socles.every((s) => !dans(p, s))),
        `${apps} app. : ${de} → ${vers} coupe à travers une parcelle`,
      );
    }
  // le client ne traverse jamais le chantier : ses chemins hors du chantier n'y entrent pas, et il n'a pas de chemin
  // vers le chantier
  const dehors = lieux.filter((id) => imp.lieux[id].zone !== 'chantier');
  for (const de of dehors)
    for (const vers of dehors) {
      if (de === vers) continue;
      const c = chemins.chemin(de, vers, { client: true });
      verifie(c, `${apps} app. : le client n'a pas de chemin de ${de} à ${vers}`);
      if (c) verifie(echantillons(c).every((p) => !dans(p, imp.chantier, 0.01)), `${apps} app. : le client traverse le chantier de ${de} à ${vers}`);
    }
  verifie(chemins.chemin('bureau-client', 'baraque', { client: true }) === null, `${apps} app. : le client a un chemin vers la baraque`);
}

// --- Le verdict
if (erreurs.length) {
  console.error(`Carte vivante : ${erreurs.length} erreur(s) sur ${verifies} vérifications`);
  for (const e of erreurs.slice(0, 40)) console.error('  ✗ ' + e);
  process.exit(1);
}
console.log(`Carte vivante : ${verifies} vérifications conformes (chemins).`);
