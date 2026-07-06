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

// Bottom tab bar, confirmed from the real UI.
async function clickTab(page, label) {
  const el = page.locator(`nav >> text=${label}`).first();
  const target = (await el.count()) ? el : page.locator(`text=${label}`).first();
  if (await target.count()) {
    await target.click();
    await page.waitForTimeout(500);
    return true;
  }
  return false;
}

async function ageUp(page, times = 1) {
  for (let i = 0; i < times; i++) {
    const btn = page.locator('text=Age Up').first();
    if (await btn.count()) {
      await btn.click();
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

  // 1. Newborn / Story tab — confirmed working state
  await shot(page, '01-start');

  // 2. Age up to 18 so career/education/vehicles/bank have content
  await ageUp(page, 18);
  await shot(page, '02-adult-story');

  // 3. Career tab
  if (await clickTab(page, 'Career')) await shot(page, '03-career');

  // 4. People tab (family/relationships)
  if (await clickTab(page, 'People')) await shot(page, '04-people');

  // 5. Education tab
  if (await clickTab(page, 'Education')) await shot(page, '05-education');

  // 6. Vehicles tab
  if (await clickTab(page, 'Vehicles')) await shot(page, '06-vehicles');

  // 7. Bank tab
  if (await clickTab(page, 'Bank')) await shot(page, '07-bank');

  // 8. Business tab
  if (await clickTab(page, 'Business')) await shot(page, '08-business');

  // 9. Home tab
  if (await clickTab(page, 'Home')) await shot(page, '09-home');

  // 10. Back to Story, age up further, screenshot a richer life state
  await clickTab(page, 'Story');
  await ageUp(page, 15);
  await shot(page, '10-later-life');

  await browser.close();
  console.log('\nDone. Review screenshots/ and pick the best 3-10 for App Store Connect.');
  console.log('Note: selectors above are best-guess by button label — if a step');
  console.log('produced a blank/wrong screen, open the page manually and tell Claude');
  console.log('the exact button text so the script can be corrected.');
})();
