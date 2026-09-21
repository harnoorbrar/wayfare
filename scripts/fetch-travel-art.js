// Downloads the Travel postcard art (generated on Higgsfield, gpt_image_2_5,
// 3:2) and writes optimized WebP files the app ships:
//   img/travel/<destinationId>.webp  and  www/img/travel/<destinationId>.webp
//
// Run once from the repo root:  node scripts/fetch-travel-art.js
// Then commit img/travel and www/img/travel. Safe to re-run; it overwrites.
// The game falls back to each destination's flag if a file is missing, so a
// partial run never breaks the Travel tab.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const BASE = 'https://d8j0ntlcm91z4.cloudfront.net/user_3FHGt8bzRyCQRWFwJhvYmmVk7TX/';
const ART = {
  banff: 'hf_20260921_033106_f83a20ba-aec0-472b-8d84-58582b84c071.png',
  nyc: 'hf_20260921_033106_cfc7f080-d4ad-44cc-9020-3496e3ae27f4.png',
  mexico_city: 'hf_20260921_033106_c70bcbd9-d4aa-4749-bf59-b8a4b2ae4dc4.png',
  cusco: 'hf_20260921_033106_c3dabce1-f6db-4073-b9ea-803092ed1182.png',
  lisbon: 'hf_20260921_033106_d17858af-ba61-4a68-9524-55cd92d323e7.png',
  rome: 'hf_20260921_033106_13fc1562-044b-4e98-adec-fa1f5f8f1761.png',
  reykjavik: 'hf_20260921_033106_51f976ef-5d31-4163-becc-c00ad3fcadfc.png',
  paris: 'hf_20260921_033106_a1dd0a9d-ab0e-488b-b30d-24f0e2f3dd8d.png',
  marrakech: 'hf_20260921_033106_2d45d05e-ea67-402e-8f7d-9db54f2aef6c.png',
  cape_town: 'hf_20260921_033106_336a6780-b117-4b62-9ab7-b8ff8a90d43d.png',
  cairo: 'hf_20260921_033106_1f023f6c-8201-49b6-8b6f-96173c270ebf.png',
  kyoto: 'hf_20260921_033106_30961b0b-580f-41d0-a232-6a08eedc7dfc.png',
  seoul: 'hf_20260921_033133_3684bda5-13bb-4650-add7-0001da820c0d.png',
  bangkok: 'hf_20260921_033133_0c002248-b3fa-4492-bab7-e8c7eec8d0d8.png',
  sydney: 'hf_20260921_033133_fd6ec8a4-9ed8-451a-98d2-470bdba521f8.png',
  queenstown: 'hf_20260921_033133_69bcf72a-0ada-4e88-b732-6f379abde616.png',
};

// 2x the largest on-screen size (a full-width card on a 430pt phone).
const WIDTH = 840;
const HEIGHT = 560;
const QUALITY = 74;

const root = path.join(__dirname, '..');
const outDirs = [path.join(root, 'img', 'travel'), path.join(root, 'www', 'img', 'travel')];

async function main() {
  outDirs.forEach((dir) => fs.mkdirSync(dir, { recursive: true }));
  let failures = 0;
  for (const [id, file] of Object.entries(ART)) {
    try {
      const response = await fetch(BASE + file);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const input = Buffer.from(await response.arrayBuffer());
      const webp = await sharp(input)
        .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'attention' })
        .webp({ quality: QUALITY, effort: 6 })
        .toBuffer();
      outDirs.forEach((dir) => fs.writeFileSync(path.join(dir, `${id}.webp`), webp));
      console.log(`✓ ${id.padEnd(12)} ${(webp.length / 1024).toFixed(0)} KB`);
    } catch (error) {
      failures += 1;
      console.error(`✗ ${id}: ${error.message}`);
    }
  }
  if (failures) {
    console.error(`${failures} image(s) failed. Re-run to retry.`);
    process.exit(1);
  }
  console.log('All travel art written to img/travel and www/img/travel.');
}

main();
