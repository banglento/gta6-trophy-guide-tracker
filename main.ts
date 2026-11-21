// Build hand-off for the GTA VI trophy guide & tracker.
//
// This program packages the static app (app/) and the screenshots into an
// output directory and writes dossier.json, the manifest make.fun reads to
// score the entry. It only copies files and builds the dossier — the guide
// itself is plain HTML, CSS and JavaScript with no build step, so what you
// see in app/ is exactly what the judge opens.
//
// Usage:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
import { cpSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

mkdirSync(outDir, { recursive: true });

const appSrc = join(root, 'app');
const shotsSrc = join(root, 'screenshots');

if (existsSync(appSrc)) cpSync(appSrc, join(outDir, 'app'), { recursive: true });
if (existsSync(shotsSrc)) cpSync(shotsSrc, join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});

writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log('wrote', join(outDir, 'dossier.json'));
console.log('dossier.json is', statSync(join(outDir, 'dossier.json')).size, 'bytes on disk');
