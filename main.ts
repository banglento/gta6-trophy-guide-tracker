// main.ts — build hand-off for the GTA VI trophy guide & tracker.
//
// This little program bundles the entry for make.fun: it copies the static
// app (the offline checklist, the 55 cited guides and the Road to Platinum)
// and the four screenshots into an output directory, then writes the
// dossier.json that describes the entry. Nothing here needs the network —
// the app itself runs with the network off, straight from disk.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
mkdirSync(outDir, { recursive: true });

const appSrc = join(repoRoot, 'app');
const shotsSrc = join(repoRoot, 'screenshots');
if (existsSync(appSrc)) cpSync(appSrc, join(outDir, 'app'), { recursive: true });
if (existsSync(shotsSrc)) cpSync(shotsSrc, join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier, 'utf8');
console.log('wrote ' + join(outDir, 'dossier.json'));
