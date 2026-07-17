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
console.log('Copied js/core.js -> www/js/core.js');
