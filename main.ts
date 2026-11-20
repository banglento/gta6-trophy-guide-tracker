// Build hand-off for my GTA VI trophy guide & tracker (Node 22, standard library only).
// The entry itself is the static app/ folder: a single-page offline tracker for all 55
// PS5 trophies — official names/descriptions/grades kept verbatim in app/data/trophies.json,
// my own cited guides per trophy, a five-phase Road to Platinum, filters, a spoiler guard,
// and localStorage progress with JSON export/import. No build step, no runtime network.
// This program copies app/ and screenshots/ from beside this file into /output and writes
// /output/dossier.json (the judge's summary of screenshots, first-load bytes and source)
// using the vendored make.fun library. vendor/makefun-frontend.ts stays untouched: the
// scorer requires dossier.json to be byte for byte what its own copy writes.
//
// Try it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files and directories in app/ or
// 48 MiB of app files: app/ counts beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
