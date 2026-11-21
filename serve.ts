// Tiny static server for the trophy guide app: serves app/ on localhost.
// Usage: node serve.ts [--port 8080]
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'app');
const args = process.argv.slice(2);
const portIdx = args.indexOf('--port');
const port = portIdx !== -1 ? parseInt(args[portIdx + 1], 10) || 8080 : 8080;

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

const server = createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  const file = resolve(join(root, normalize(pathname)));
  if (!file.startsWith(resolve(root) + '/') && file !== resolve(root)) {
    res.writeHead(403, { 'content-type': 'text/plain' });
    res.end('403 forbidden\n');
    return;
  }
  if (!existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('404 not found\n');
    return;
  }
  const ext = file.slice(file.lastIndexOf('.'));
  res.writeHead(200, {
    'content-type': MIME[ext] || 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(res);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`app/ is on http://localhost:${port}`);
});
