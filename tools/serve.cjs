'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', process.argv.includes('--dist') ? 'dist' : '.');
const port = Number(process.env.PORT || 4317);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const files = new Map(require('./production-files.cjs').map(file => [`/${file}`, mime[path.extname(file)]]));
const server = http.createServer((req, res) => {
  let route;
  try { route = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400); res.end('Bad request'); return; }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return; }
  if (route === '/') route = '/index.html';
  if (!files.has(route)) { res.writeHead(404); res.end('Not found'); return; }
  fs.readFile(path.join(root, route.slice(1)), (error, data) => {
    if (error) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, {
      'Content-Type': files.get(route), 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'none'; object-src 'none'; base-uri 'none'"
    });
    res.end(req.method === 'HEAD' ? undefined : data);
  });
});
server.on('error', error => { console.error(`Cannot start local preview: ${error.message}. Set PORT to use a different port.`); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`FeiSheng preview: http://127.0.0.1:${server.address().port}\nRoot: ${root}\nOnly production assets are served. Ctrl+C to stop.`));
