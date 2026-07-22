// Creates polished App Store previews at Apple's accepted 6.5/6.7-inch
// portrait size (1284x2778).
// Each preview uses a real, deterministic Wayfare screen inside a branded
// editorial frame. Run with: node scripts/capture-screenshots.js

const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'screenshots', 'store-preview-v14');
const RAW_DIR = path.join(OUT_DIR, 'raw');
const BACKGROUND = path.join(OUT_DIR, 'wayfare-journey-background.png');
const PORT = process.env.PORT || '8086';
const APP_URL = process.env.SCREENSHOT_URL || `http://localhost:${PORT}/`;
const APP_SIZE = { width: 430, height: 932 };
const STORE_SIZE = { width: 1284, height: 2778 };
const BROWSER_PATH = process.env.BROWSER_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const scenes = [
  {
    file: '01-live-your-story',
    headline: 'Live a life that feels like yours.',
    subtitle: 'Every year brings a new choice, consequence, and chapter.',
    tab: 'story',
    patch: {
      name: 'Jordan Reyes', age: 27, health: 82, happiness: 76, smarts: 68, looks: 61,
      money: 68400, savings: 24000, peakMoney: 68400, ambition: { id: 'fortune', claimed: ['foundation'] },
      feed: [
        { age: 27, text: 'Jordan and Avery found a small place that finally feels like home.', deltas: [['happiness', 5]] },
        { age: 27, text: 'A difficult project paid off with a promotion and a bigger future.', deltas: [['happiness', 3], ['money', 6200]] },
        { age: 26, text: 'Jordan chose stability without giving up the dream.', deltas: [['smarts', 2]] },
        { age: 25, text: 'Avery brought up marriage. The answer was an easy yes.', deltas: [['happiness', 7]] },
      ],
    },
  },
  {
    file: '02-shape-who-you-become',
    headline: 'Shape who you become.',
    subtitle: 'Spend your focus. Build strengths. Create your own path.',
    tab: 'activities',
    patch: {
      name: 'Jordan Reyes', age: 24, health: 79, happiness: 73, smarts: 66, looks: 61,
      money: 12500, activities: { age: 24, used: 0, performed: [] },
      skills: { fitness: 31, programming: 38, creativity: 26, cooking: 18, charisma: 22, negotiation: 16, leadership: 12 },
    },
  },
  {
    file: '03-build-your-career',
    headline: 'Build a career, not just a resume.',
    subtitle: 'Learn skills, earn promotions, and climb your chosen ladder.',
    tab: 'job',
    patch: {
      name: 'Jordan Reyes', age: 35, health: 74, happiness: 78, smarts: 84, looks: 63,
      money: 186400, job: 'senior_engineer', salary: 2850, yearsAtJob: 4,
      degrees: ['hs', 'deg_cs'],
      skills: { programming: 62, leadership: 34, creativity: 29, charisma: 24, negotiation: 21, finance: 15 },
    },
  },
  {
    file: '04-build-a-family',
    headline: 'Build bonds that change everything.',
    subtitle: 'Love, friendship, children, and the family you choose.',
    tab: 'people',
    patch: {
      name: 'Jordan Reyes', age: 42, health: 71, happiness: 89, smarts: 81, looks: 62,
      money: 248000, partner: 'Avery',
      children: [{ name: 'Maya', age: 9, relId: 21 }, { name: 'Leo', age: 6, relId: 22 }],
      relationships: [
        { id: 20, name: 'Avery', type: 'Spouse', closeness: 96, trust: 94, lastInteractedAge: 42, memories: [{ age: 41, text: 'Took the long way home together.' }] },
        { id: 21, name: 'Maya', type: 'Child', age: 9, closeness: 91, trust: 88, lastInteractedAge: 42, memories: [{ age: 42, text: 'Built a blanket fort in the living room.' }] },
        { id: 22, name: 'Leo', type: 'Child', age: 6, closeness: 87, trust: 90, lastInteractedAge: 42, memories: [{ age: 42, text: 'Learned to ride a bike.' }] },
        { id: 23, name: 'Samira', type: 'Friend', closeness: 84, trust: 86, lastInteractedAge: 41, memories: [{ age: 40, text: 'Showed up when it mattered.' }] },
      ],
      nextRelId: 24,
      ambition: { id: 'family', claimed: ['partner', 'children'] },
    },
  },
  {
    file: '05-leave-a-legacy',
    headline: 'Leave a legacy worth inheriting.',
    subtitle: 'Build a dynasty, pass on your story, and begin again.',
    tab: 'story',
    patch: {
      name: 'Jordan Reyes', age: 68, generation: 2, legacyTotal: 1280,
      health: 66, happiness: 92, smarts: 88, looks: 59, money: 820000, savings: 310000, peakMoney: 910000,
      partner: 'Avery', children: [{ name: 'Maya', age: 35, relId: 21 }, { name: 'Leo', age: 32, relId: 22 }],
      relationships: [
        { id: 20, name: 'Avery', type: 'Spouse', closeness: 97, trust: 98, lastInteractedAge: 68 },
        { id: 21, name: 'Maya', type: 'Child', age: 35, closeness: 94, trust: 93, lastInteractedAge: 68 },
        { id: 22, name: 'Leo', type: 'Child', age: 32, closeness: 92, trust: 95, lastInteractedAge: 68 },
        { id: 23, name: 'Samira', type: 'Friend', closeness: 88, trust: 91, lastInteractedAge: 67 },
        { id: 24, name: 'Noah', type: 'Friend', closeness: 85, trust: 89, lastInteractedAge: 68 },
      ],
      ambition: { id: 'family', claimed: ['partner', 'children', 'circle'] },
      feed: [
        { age: 68, text: 'The whole family gathered around one table. Jordan looked at what a lifetime had built.', deltas: [['happiness', 8]] },
        { age: 67, text: 'Maya asked Jordan to tell the old stories again. Some things deserve to be remembered.', deltas: [['happiness', 4]] },
        { age: 66, text: 'The Reyes legacy crossed another milestone.', deltas: [['money', 42000]] },
        { age: 65, text: 'Jordan finally stepped away from work. The next chapter belongs to family.', deltas: [['happiness', 6]] },
      ],
    },
  },
];

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

function asDataUrl(file) {
  const mime = path.extname(file).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
}

async function seedScene(page, scene) {
  await page.evaluate(({ patch, tab }) => {
    state = {
      ...state,
      ...patch,
      activeTab: tab,
      alive: true,
      pendingChoice: null,
      investments: { stocks: 0, bonds: 0, crypto: 0, ...(state.investments || {}), ...(patch.investments || {}) },
      skills: { ...(state.skills || {}), ...(patch.skills || {}) },
    };
    document.getElementById('gameover').classList.remove('show');
    render();
    window.scrollTo(0, 0);
  }, { patch: scene.patch, tab: scene.tab });
  await page.waitForTimeout(150);
}

async function composePreview(page, scene, rawFile, backgroundData) {
  const rawData = asDataUrl(rawFile);
  await page.setViewportSize(STORE_SIZE);
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{width:1284px;height:2778px;margin:0;overflow:hidden}
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff;background:#17120f}
    .bg{position:fixed;inset:0;background-image:linear-gradient(180deg,rgba(22,13,9,.36) 0%,rgba(22,13,9,.08) 31%,rgba(22,13,9,.38) 100%),url('${backgroundData}');background-size:cover;background-position:center}
    .wash{position:fixed;inset:0;background:radial-gradient(circle at 50% 25%,rgba(194,84,47,.18),transparent 38%)}
    .brand{position:fixed;top:86px;left:88px;padding:14px 22px;border:1px solid rgba(255,255,255,.32);border-radius:999px;background:rgba(31,20,15,.42);font-size:26px;font-weight:800;letter-spacing:8px;backdrop-filter:blur(14px)}
    h1{position:fixed;top:164px;left:86px;right:86px;margin:0;font-family:Georgia,"Times New Roman",serif;font-size:86px;line-height:.98;letter-spacing:-3px;text-shadow:0 4px 26px rgba(22,12,8,.35)}
    .sub{position:fixed;top:380px;left:91px;right:91px;font-size:35px;line-height:1.3;font-weight:550;color:rgba(255,248,238,.9);text-shadow:0 2px 14px rgba(22,12,8,.4)}
    .phone{position:fixed;top:616px;left:195px;width:900px;height:1951px;overflow:hidden;border:9px solid rgba(255,245,232,.72);border-radius:68px;background:#11100e;box-shadow:0 52px 110px rgba(21,10,5,.52),0 0 0 2px rgba(57,31,19,.28)}
    .phone img{display:block;width:100%;height:100%;object-fit:cover}
    .footer{position:fixed;left:0;right:0;bottom:73px;text-align:center;font-size:25px;font-weight:700;letter-spacing:2.5px;color:rgba(255,247,236,.82)}
  </style></head><body><div class="bg"></div><div class="wash"></div><div class="brand">WAYFARE</div><h1></h1><div class="sub"></div><div class="phone"><img alt="Wayfare gameplay"></div><div class="footer">A WHOLE LIFE, ONE YEAR AT A TIME</div></body></html>`);
  await page.locator('h1').evaluate((el, text) => { el.textContent = text; }, scene.headline);
  await page.locator('.sub').evaluate((el, text) => { el.textContent = text; }, scene.subtitle);
  await page.locator('.phone img').evaluate((el, src) => { el.src = src; }, rawData);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(OUT_DIR, `${scene.file}.png`) });
}

(async () => {
  fs.mkdirSync(RAW_DIR, { recursive: true });
  if (!fs.existsSync(BACKGROUND)) throw new Error(`Missing background: ${BACKGROUND}`);

  let server = null;
  if (!process.env.SCREENSHOT_URL) {
    server = spawn(process.execPath, [path.join(ROOT, 'scripts', 'serve.js')], {
      cwd: ROOT,
      env: { ...process.env, PORT },
      stdio: 'ignore',
      windowsHide: true,
    });
  }

  let browser;
  try {
    await waitForServer(APP_URL);
    browser = await chromium.launch({ executablePath: BROWSER_PATH });
    const appContext = await browser.newContext({ viewport: APP_SIZE, deviceScaleFactor: 3, isMobile: true });
    await appContext.addInitScript(() => {
      localStorage.setItem('wayfare-theme', 'dark');
      localStorage.setItem('wayfare-reduce-motion', '1');
      localStorage.removeItem('wayfare-save-v1');
    });
    const appPage = await appContext.newPage();
    await appPage.goto(APP_URL, { waitUntil: 'networkidle' });

    const marketingContext = await browser.newContext({ viewport: STORE_SIZE, deviceScaleFactor: 1 });
    const marketingPage = await marketingContext.newPage();
    const backgroundData = asDataUrl(BACKGROUND);

    for (const scene of scenes) {
      await appPage.reload({ waitUntil: 'networkidle' });
      await seedScene(appPage, scene);
      const rawFile = path.join(RAW_DIR, `${scene.file}.png`);
      await appPage.screenshot({ path: rawFile });
      await composePreview(marketingPage, scene, rawFile, backgroundData);
      console.log(`saved ${scene.file}.png`);
    }
    fs.rmSync(RAW_DIR, { recursive: true, force: true });
  } finally {
    if (browser) await browser.close();
    if (server) server.kill();
  }

  console.log(`\nDone. App Store previews are in ${OUT_DIR}`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
