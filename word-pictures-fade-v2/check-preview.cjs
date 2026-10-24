// Usage: NODE_PATH=/path/to/node_modules node word-pictures-fade-v2/check-preview.cjs
const { chromium } = require('playwright-core');
const path = require('node:path');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox']});
  const page = await browser.newPage({viewport: {width: 1440, height: 1000}, deviceScaleFactor: 1});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => errors.push(request.url()));
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto('file://' + path.join(__dirname, 'index.html'));
  await page.evaluate(() => Promise.all(Array.from(document.images, image => image.decode())));
  const out = path.join(__dirname, 'checks');
  fs.mkdirSync(out, {recursive: true});
  const results = [];
  for (const section of await page.locator('section').all()) {
    const id = await section.getAttribute('id');
    const images = await section.locator('.choice img').evaluateAll(images => images.map(image => ({src: image.getAttribute('src'), ok: image.complete && image.naturalWidth === 512})));
    if (images.length !== 26 || images.some(image => !image.ok)) throw new Error(id + ': missing images');
    await section.screenshot({path: path.join(out, id + '.png'), animations: 'disabled'});
    results.push({theme: await section.locator('h2').innerText(), cards: images.length, circleExamples: await section.locator('.circle').count()});
  }
  await page.setViewportSize({width: 390, height: 844});
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  if (overflow) throw new Error('Mobile horizontal overflow');
  if (errors.length || requests.some(url => !url.startsWith('file:'))) throw new Error(JSON.stringify({errors, requests}));
  const result = {browser: await browser.version(), desktop: '1440px', mobile: '390px; no horizontal overflow', themes: results, loadedImages: await page.locator('img').count(), errors, externalRequests: 0};
  fs.writeFileSync(path.join(out, 'browser.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})().catch(error => {console.error(error); process.exit(1);});
