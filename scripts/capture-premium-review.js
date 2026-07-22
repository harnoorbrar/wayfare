// Captures the Wayfare Plus paywall for App Store Connect review metadata.
// Run with: node scripts/capture-premium-review.js

const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'screenshots', 'iap-review');
const OUT_FILE = path.join(OUT_DIR, 'wayfare-plus-review.png');
const PORT = '8087';
const APP_URL = `http://localhost:${PORT}/`;
const BROWSER_PATH = process.env.BROWSER_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function waitForServer(url, attempts = 50) {
  return new Promise((resolve, reject) => {
    const tryOnce = (remaining) => {
      const request = http.get(url, (response) => {
        response.resume();
        if (response.statusCode && response.statusCode < 500) return resolve();
        retry(remaining);
      });
      request.on('error', () => retry(remaining));
      request.setTimeout(500, () => request.destroy());
    };
    const retry = (remaining) => {
      if (remaining <= 0) return reject(new Error(`Wayfare did not start at ${url}`));
      setTimeout(() => tryOnce(remaining - 1), 100);
    };
    tryOnce(attempts);
  });
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const server = spawn(process.execPath, [path.join(ROOT, 'scripts', 'serve.js')], {
    cwd: ROOT,
    env: { ...process.env, PORT },
    stdio: 'ignore',
    windowsHide: true,
  });

  let browser;
  try {
    await waitForServer(APP_URL);
    browser = await chromium.launch({ executablePath: BROWSER_PATH });
    const context = await browser.newContext({
      viewport: { width: 430, height: 932 },
      deviceScaleFactor: 3,
      isMobile: true,
      colorScheme: 'dark',
    });
    await context.addInitScript(() => {
      localStorage.setItem('wayfare-theme', 'dark');
      localStorage.setItem('wayfare-reduce-motion', '1');
      localStorage.removeItem('wayfare-plus');
    });
    const page = await context.newPage();
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await page.locator('#plus-btn').click();
    await page.locator('#paywall-packages').evaluate((box) => {
      box.innerHTML = `
        <button class="pw-buy"><span>Monthly</span><span class="pw-price">$1.99/mo</span></button>
        <button class="pw-buy pw-life"><span>Lifetime — pay once</span><span class="pw-price">$9.99</span></button>`;
    });
    await page.waitForTimeout(150);
    await page.screenshot({ path: OUT_FILE });
    console.log(OUT_FILE);
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
