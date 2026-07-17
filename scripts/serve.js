#!/usr/bin/env node
// Minimal zero-dependency static file server for local Wayfare PWA development.
// Serves the project root over HTTP so the service worker, manifest, and
// ES modules load with correct MIME types. No external dependencies.

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const ROOT = __dirname.replace(/[/\\]scripts$/, '');
const PORT = process.env.PORT || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

const server = http.createServer((req, res) => {
  try {
    const parsed = url.parse(req.url);
    let pathname = decodeURIComponent(parsed.pathname);
    if (pathname === '/') pathname = '/index.html';

    // Prevent path traversal outside the project root.
    const safePath = path.normalize(path.join(ROOT, pathname));
    if (safePath !== ROOT && !safePath.startsWith(ROOT + path.sep)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    fs.stat(safePath, (err, stat) => {
      if (err || !stat.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found: ' + pathname);
        return;
      }
      const ext = path.extname(safePath).toLowerCase();
      const base = path.basename(safePath).toLowerCase();
      let type = MIME[ext] || 'application/octet-stream';
      // PWA manifest must be served with the manifest MIME type.
      if (base === 'manifest.json') type = 'application/manifest+json; charset=utf-8';
      res.writeHead(200, {
        'Content-Type': type,
        'Cache-Control': 'no-cache',
      });
      fs.createReadStream(safePath).pipe(res);
    });
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('500 Server error');
  }
});

server.listen(PORT, () => {
  console.log(`Wayfare dev server running at http://localhost:${PORT}`);
  console.log(`Serving: ${ROOT}`);
});
