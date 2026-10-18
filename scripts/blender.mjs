// Lance un script Blender de l'atelier : npm run blender -- crane [autre-id ...] (construit et exporte le GLB)
// ou npm run atelier -- crane (construit sans exporter et rend les captures dans blender/.captures/<id>/).
// Cherche Blender dans BLENDER, puis le PATH, puis les emplacements habituels ; a defaut, BLENDER_PYTHON
// (un Python qui a le module bpy). Blender tourne sans fenetre, avec ses reglages d'usine.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const atelier = process.argv[2] === '--atelier';
const ids = process.argv.slice(atelier ? 3 : 2);
if (!ids.length) { console.error(`usage : npm run ${atelier ? 'atelier' : 'blender'} -- <id du catalogue> [...]`); process.exit(2); }

function trouveBlender() {
  if (process.env.BLENDER) return process.env.BLENDER;
  const which = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['blender'], { encoding: 'utf8' });
  if (which.status === 0 && which.stdout.trim()) return which.stdout.trim().split(/\r?\n/)[0];
  const mac = '/Applications/Blender.app/Contents/MacOS/Blender';
  if (existsSync(mac)) return mac;
  const win = 'C:\\Program Files\\Blender Foundation';
  if (process.platform === 'win32' && existsSync(win)) {
    const v = readdirSync(win).filter((d) => d.startsWith('Blender')).sort().pop();
    if (v && existsSync(join(win, v, 'blender.exe'))) return join(win, v, 'blender.exe');
  }
  return null;
}

const script = join(ROOT, 'blender', atelier ? 'atelier.py' : 'construit.py');
const blender = trouveBlender();
let r;
if (blender) r = spawnSync(blender, ['-b', '--factory-startup', '--python-exit-code', '1', '-P', script, '--', ...ids], { stdio: 'inherit', cwd: ROOT });
else if (process.env.BLENDER_PYTHON) r = spawnSync(process.env.BLENDER_PYTHON, [script, ...ids], { stdio: 'inherit', cwd: ROOT });
else { console.error('Blender introuvable : installe-le, ou indique son chemin dans BLENDER (ou un Python avec bpy dans BLENDER_PYTHON).'); process.exit(2); }
process.exit(r.status ?? 1);
