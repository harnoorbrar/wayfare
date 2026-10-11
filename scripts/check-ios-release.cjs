/* A release must ship the files that were tested, including the native purchase bridge. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const config = JSON.parse(read('capacitor.config.json'));
assert.equal(config.appId, 'com.harnoorbrar.wayfare');
assert.equal(config.webDir, 'www');
assert.ok(!config.server?.url, 'Ship the local app, not a hosted sign-in page');
assert.equal(config.ios.contentInset, 'never');
const html = read('www/index.html');
assert.equal(html, read('index.html'), 'Rebuild the changed document before uploading');
const version = html.match(/const APP_VERSION = "([^"]+)"/)[1];
const versions = [...read('ios/App/App.xcodeproj/project.pbxproj').matchAll(/MARKETING_VERSION = ([^;]+);/g)].map(m=>m[1]);
assert.ok(versions.length > 0 && versions.every(v=>v===version), 'iOS and game versions must agree');
for (const match of html.matchAll(/<(?:script|link)\b[^>]*?(?:src|href)="([^"]+)"[^>]*>/g)) {
 const url=match[1]; if (/^(?:https?:|data:|#|\/\/)/.test(url)) continue;
 assert.ok(fs.existsSync(path.join(root,'www',url.split('?')[0])), 'Missing app asset: '+url);
}
for (const file of ['plus-store.js','plus-ui.js','crossroads-stories.js','crossroads-stories-later.js','crossroads.js','crossroads-ui.js','crossroads-chronicle.js']) {
 assert.equal(read('assets/'+file),read('www/js/'+file),'Stale bundled module: '+file);
}
assert.match(read('www/js/core.js'), /WayfareNative/,'RevenueCat registration must be in the compiled core');
assert.equal(read('www/crossroads.css'),read('crossroads.css'));
assert.equal(read('www/service-worker.js'),read('service-worker.js'));
for (const file of ['privacy.html','terms.html','support.html','img/travel/banff.webp','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png']) assert.ok(fs.existsSync(path.join(root,'www',file)), 'Missing native file: '+file);
console.log('Release check passed: Wayfare '+version+', native SDK registration, local content, and current bundled assets.');
