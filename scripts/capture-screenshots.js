// Captures App Store screenshots (6.7" iPhone: 1290x2796) by driving the
// live game in a headless browser and clicking through to interesting states.
//
// Run locally (not in this sandbox — needs a real Chromium download):
//   npm install playwright
//   npx playwright install chromium
//   node scripts/capture-screenshots.js
//
// Output lands in ./screenshots/*.png — upload those directly to
// App Store Connect under the 6.7" Display screenshot slot.

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const URL = 'https://harnoorbrar.github.io/wayfare/';
const OUT_DIR = path.join(__dirname, '..', 'screenshots');
const SIZE = { width: 1290, height: 2796 }; // 6.7" @3x, App Store required size

async function shot(page, name) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`) });
  console.log('saved', name);
}

async function clickText(page, text) {
  const el = page.locator(`text=${text}`).first();
  if (await el.count()) {
    await el.click();
    await page.waitForTimeout(400);
    return true;
  }
  return false;
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: SIZE,
    deviceScaleFactor: 1,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Fresh start / character creation screen
  await shot(page, '01-start');

  // 2. Try to start a new life if a name/start prompt exists
  for (const label of ['New Life', 'Start', 'Begin', 'Play']) {
    if (await clickText(page, label)) break;
  }
  await page.waitForTimeout(500);
  await shot(page, '02-life-begins');

  // 3. Age up a handful of times to reach a populated stats screen
  for (let i = 0; i < 6; i++) {
    for (const label of ['Age Up', 'Next Year', 'Continue']) {
      if (await clickText(page, label)) break;
    }
    await page.waitForTimeout(300);
  }
  await shot(page, '03-growing-up');

  // 4. Open achievements/trophy view if present
  for (const label of ['Achievements', 'Trophies', 'Trophy']) {
    if (await clickText(page, label)) {
      await page.waitForTimeout(400);
      await shot(page, '04-achievements');
      await page.keyboard.press('Escape').catch(() => {});
      break;
    }
  }

  // 5. Open pets/adoption view if present
  for (const label of ['Pets', 'Adopt', 'Adoption Center']) {
    if (await clickText(page, label)) {
      await page.waitForTimeout(400);
      await shot(page, '05-pets');
      await page.keyboard.press('Escape').catch(() => {});
      break;
    }
  }

  // 6. Age further toward a career/money-heavy state
  for (let i = 0; i < 10; i++) {
    for (const label of ['Age Up', 'Next Year', 'Continue']) {
      if (await clickText(page, label)) break;
    }
    await page.waitForTimeout(200);
  }
  await shot(page, '06-adult-life');

  await browser.close();
  console.log('\nDone. Review screenshots/ and pick the best 3-10 for App Store Connect.');
  console.log('Note: selectors above are best-guess by button label — if a step');
  console.log('produced a blank/wrong screen, open the page manually and tell Claude');
  console.log('the exact button text so the script can be corrected.');
})();
