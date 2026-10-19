/* Hard rules for the grown-up portal and the layout picker.
 * file:// only, plus the source that enforces them on the server.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const root = path.resolve(__dirname, '..');
const url = file => pathToFileURL(path.join(root, file)).href;
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function playwright() {
  if (process.env.PLAYWRIGHT_MODULE) return require(process.env.PLAYWRIGHT_MODULE);
  try { return require('playwright'); } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
    return require('/usr/local/lib/pnpm/5/.pnpm/node_modules/playwright');
  }
}

const BANNED = /Playing as|Create a grown-up account|Group code|classroom|invite code|board code|sync-test|notebook/i;

function assertSources() {
  const home = read('index.html');
  const grownPage = read('grown-ups/index.html');
  const grownJs = read('accounts/grown.js');
  const pub = read('supabase/functions/accounts-public/index.ts');
  const manage = read('supabase/functions/accounts-manage/index.ts');
  const sql = read('supabase/migrations/20261019193000_portal_admin_avatars.sql');
  assert.equal(home.includes('id="play-chosen"'), false);
  assert.equal(home.includes('Play Ribbon Road'), false);
  assert.equal(BANNED.test(grownPage), false, 'Grown-up page stays free of codes and play banners');
  assert.equal(grownJs.includes('accounts-public'), false);
  assert.equal(grownJs.includes('Create a grown-up account'), false);
  assert.equal(grownJs.includes('data-swap'), false);
  assert.equal(/classroom|group code|invite|board code/i.test(grownJs), false);
  assert.match(grownJs, /accept="image\/\*"/);
  assert.match(grownJs, /data-avatar/);
  assert.match(grownJs, /create-grownup/);
  assert.equal(pub.includes('createUser'), false);
  assert.match(pub, /403/);
  assert.match(manage, /create-grownup/);
  assert.match(manage, /is_admin/);
  assert.match(manage, /avatar_image/);
  assert.equal(manage.includes('classroom_code'), false);
  assert.match(sql, /is_admin/);
  assert.match(sql, /avatar_image/);
  assert.equal(fs.existsSync(path.join(root, 'supabase/migrations/20261019160000_grownup_groups.sql')), false);
}

async function run() {
  assertSources();
  const browser = await playwright().chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath: process.env.CHROMIUM_EXECUTABLE} : {}),
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  try {
    const home = await browser.newContext({viewport: {width: 390, height: 844}, reducedMotion: 'reduce', colorScheme: 'dark'});
    await home.route(/^https?:/, route => route.abort());
    const page = await home.newPage();
    await page.goto(url('index.html'));
    await page.locator('#login:not([hidden])').waitFor();
    await page.locator('#play-guest').click();
    await page.locator('#layouts:not([hidden])').waitFor();
    const cards = await page.locator('#layouts nav a[data-world]').evaluateAll(nodes => nodes.map(node => ({
      world: node.dataset.world,
      current: node.getAttribute('aria-current'),
      chosen: node.classList.contains('is-chosen'),
      text: node.querySelector('strong').textContent
    })));
    assert.deepEqual(cards.map(card => card.world), ['post', 'space', 'silk']);
    assert.deepEqual(cards.map(card => card.text), ['Lucy’s Letter Post', 'Lucy’s Moonboat', 'Ribbon Road']);
    assert.equal(cards.filter(card => card.current === 'true' && card.chosen).length, 1);
    assert.equal(cards.find(card => card.world === 'silk').current, 'true');
    assert.equal(await page.locator('#play-chosen, .play-row, a[id^="play-"]').count(), 0);
    const paint = await page.evaluate(() => {
      const body = getComputedStyle(document.body);
      return {color: body.color, background: body.backgroundColor, image: body.backgroundImage};
    });
    assert.equal(paint.background, 'rgb(250, 242, 223)');
    assert.equal(paint.color, 'rgb(37, 63, 101)');
    assert.match(paint.image, /radial-gradient/);
    await home.close();

    const grown = await browser.newContext({viewport: {width: 390, height: 844}, reducedMotion: 'reduce', colorScheme: 'dark'});
    await grown.route(/^https?:/, route => route.abort());
    const portal = await grown.newPage();
    const errors = [];
    portal.on('pageerror', error => errors.push(error.message));
    await portal.goto(url('grown-ups/index.html'));
    await portal.waitForFunction(() => document.body?.dataset.view === 'gate');
    const look = await portal.evaluate(() => {
      const body = getComputedStyle(document.body);
      return {
        background: body.backgroundColor,
        color: body.color,
        image: body.backgroundImage,
        chrome: document.querySelector('.chrome')?.innerText || '',
        text: document.body.innerText
      };
    });
    assert.equal(look.background, 'rgb(250, 242, 223)', 'Grown-up entry stays cream in a dark color scheme');
    assert.equal(look.color, 'rgb(37, 63, 101)');
    assert.match(look.image, /radial-gradient/);
    assert.match(look.chrome, /Letters with Lucy/);
    assert.match(look.chrome, /Little Sounds Big Discovery/);
    assert.equal(BANNED.test(look.text), false, look.text.slice(0, 240));
    assert.equal(await portal.locator('#paper').evaluate(node => Number(node.dataset.drawn || 0)) >= 1, true);
    assert.equal(await portal.locator('img[alt="Lucy the golden retriever"]').count(), 1);
    assert.deepEqual(errors, []);
    await grown.close();
    console.log('PASS portal rules: cream chrome, three cards, no public signup, no codes');
  } finally {
    await browser.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
