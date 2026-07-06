// Captures App Store screenshots (6.7" iPhone: 1290x2796) by driving the
// live game in a headless browser and clicking through to interesting states.
//
// Run locally:
//   cd wayfare
//   git pull
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

// Click via direct DOM dispatch instead of simulated mouse input.
// Headless Chromium sometimes flags real UI elements as "not visible/stable"
// due to layout timing quirks that don't affect real usage — this sidesteps
// that entirely by just invoking the click handler.
async function clickId(page, id) {
  return page.evaluate((elId) => {
    const el = document.getElementById(elId);
    if (el) { el.click(); return true; }
    return false;
  }, id);
}

async function clickTab(page, dataTab) {
  const ok = await page.evaluate((tab) => {
    const el = document.querySelector(`.nav-btn[data-tab="${tab}"]`);
    if (el) { el.click(); return true; }
    return false;
  }, dataTab);
  await page.waitForTimeout(500);
  return ok;
}

async function ageUp(page, times = 1) {
  for (let i = 0; i < times; i++) {
    const clicked = await clickId(page, 'ageup-btn');
    if (!clicked) break;
    await page.waitForTimeout(350);

    // Some ages trigger a choice modal instead of advancing directly.
    // If a modal is open, dismiss it by picking the first choice so the
    // age-up loop doesn't stall waiting on user input.
    const modalOpen = await page.evaluate(() => {
      const m = document.getElementById('modal-overlay');
      return !!m && getComputedStyle(m).display !== 'none';
    }).catch(() => false);

    if (modalOpen) {
      await page.evaluate(() => {
        const choice = document.querySelector('.choice-btn, .modal-action, .panel-action');
        if (choice) choice.click();
      });
      await page.waitForTimeout(350);
    }
  }
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

  // 1. Newborn / Story tab
  await shot(page, '01-start');

  // 2. Age up to ~18 so career/education/vehicles/bank have content
  await ageUp(page, 18);
  await shot(page, '02-adult-story');

  // 3. Career tab
  if (await clickTab(page, 'job')) await shot(page, '03-career');

  // 4. People tab (family/relationships)
  if (await clickTab(page, 'people')) await shot(page, '04-people');

  // 5. Education tab
  if (await clickTab(page, 'education')) await shot(page, '05-education');

  // 6. Vehicles tab
  if (await clickTab(page, 'vehicles')) await shot(page, '06-vehicles');

  // 7. Bank tab
  if (await clickTab(page, 'bank')) await shot(page, '07-bank');

  // 8. Business tab
  if (await clickTab(page, 'business')) await shot(page, '08-business');

  // 9. Home tab
  if (await clickTab(page, 'home')) await shot(page, '09-home');

  // 10. Back to Story, age further, capture a richer life state
  await clickTab(page, 'story');
  await ageUp(page, 15);
  await shot(page, '10-later-life');

  await browser.close();
  console.log('\nDone. Review screenshots/ and pick the best 3-10 for App Store Connect.');
})();
