// serve.ts — a tiny static server for app/ (Node 22, standard library only).
// Usage: node serve.ts [--port 8080]  — serves app/ on http://localhost:8080
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), 'app');
const args = process.argv.slice(2);
let port = 8080;
const portIdx = args.indexOf('--port');
if (portIdx !== -1 && args[portIdx + 1]) port = Number(args[portIdx + 1]);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/') rel = '/index.html';
    const filePath = resolve(join(root, normalize(rel)));
    if (!filePath.startsWith(root + '/') && filePath !== root) {
      res.writeHead(403, { 'content-type': 'text/plain' });
      res.end('Forbidden\n');
      return;
    }
    if (!existsSync(filePath)) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('Not found\n');
      return;
    }
    const body = await readFile(filePath);
    res.writeHead(200, {
      'content-type': MIME[extname(filePath)] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(body);
  } catch (err) {
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end('Server error\n');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log('app/ is on http://localhost:' + port);
});
