// Post-build step: mirror the compiled core bundle into www/ (the directory
// Capacitor ships). Run via `npm run build`, which does `vite build` first.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'js', 'core.js');
const destDir = path.join(root, 'www', 'js');

if (!fs.existsSync(src)) {
  console.error('js/core.js not found — did vite build fail?');
  process.exit(1);
}
fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, path.join(destDir, 'core.js'));
const driveSrc = path.join(root, 'js', 'drive3d.js');
if (!fs.existsSync(driveSrc)) {
  console.error('js/drive3d.js not found — did the WebGL build fail?');
  process.exit(1);
}
fs.copyFileSync(driveSrc, path.join(destDir, 'drive3d.js'));

// The Capacitor shell ships from www/, so keep its document shell and cache
// manifest in lockstep with the source files too. This prevents a polished UI
// change in index.html from being accidentally omitted from an iOS build.
for (const file of ['index.html', 'service-worker.js']) {
  fs.copyFileSync(path.join(root, file), path.join(root, 'www', file));
}

console.log('Synced core bundle, WebGL driving bundle, app shell, and service worker -> www/');
