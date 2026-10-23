/* Catch-up checks: laptop pages, no hints, wrong-tap audio, immediate cheer, badges, cache. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const root = path.resolve(__dirname, '..');

function playwright() {
  if (process.env.PLAYWRIGHT_MODULE) return require(process.env.PLAYWRIGHT_MODULE);
  try { return require('playwright'); } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
    return require('/usr/local/lib/pnpm/5/.pnpm/node_modules/playwright');
  }
}

function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }

function sourceChecks() {
  for (const game of ['v1-letter-post', 'v3-moonboat']) {
    const app = read(`${game}/app.js`);
    assert.equal(app.includes('hintAfter'), false, `${game} must not read a stored hint setting`);
    assert.equal(app.includes('open-sign'), false);
    assert.equal(app.includes('Open for mail'), false);
    assert.equal(app.includes('post-sticker'), false);
    assert.equal(app.includes("classList.add('hint')"), false);
    assert.match(app, /voice\(\[A\.feedback\.cheers\[visited\.size%2\]\]\)/);
    assert.match(app, /voice\(\[wordAudio\(selected\)\]\)/);
  }
  assert.equal(read('v1-letter-post/app.js'), read('v3-moonboat/app.js'));
  assert.equal(read('v1-letter-post/fun.js'), read('v3-moonboat/fun.js'));
  assert.match(read('sw.js'), /little-woof-shell-4/);
  assert.doesNotMatch(read('sw.js'), /little-woof-shell-3/);
  assert.match(read('supabase/functions/accounts-manage/index.ts'), /role === "child" \|\| role === ""/);
  const chip = read('accounts/player-chip.js');
  assert.match(chip, /Kids/);
  assert.match(chip, /My account/);
  assert.equal(chip.includes('grown-ups/index.html') && chip.slice(chip.indexOf('function kidSheet'), chip.indexOf('function toggleGrownMenu')).includes('grown-ups'), false);
  const grown = read('grown-ups/index.html');
  assert.equal(grown.includes('id="hint"'), false);
  assert.equal(grown.includes('Help when stuck'), false);
  console.log('PASS catch-up sources: no hints, shared copies, cache bump, child refusal, grown-up menu');
}

async function showLetter(page, letter) {
  for (let i = 0; i < 8; i++) {
    if (await page.locator(`[data-letter="${letter}"]`).count()) return;
    const previous = page.locator('[data-page="-1"]');
    if (await previous.isEnabled()) { await previous.click(); continue; }
    break;
  }
  for (let i = 0; i < 8; i++) {
    if (await page.locator(`[data-letter="${letter}"]`).count()) return;
    await page.locator('[data-page="1"]').click();
  }
}

async function browserChecks() {
  const {chromium} = playwright();
  const browser = await chromium.launch({headless: true,
    ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath: process.env.CHROMIUM_EXECUTABLE} : {}),
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required']});
  try {
    for (const game of ['v1-letter-post', 'v3-moonboat']) {
      for (const viewport of [{width: 1024, height: 576}, {width: 1366, height: 768}]) {
        for (let theme = 0; theme < 3; theme++) {
          const context = await browser.newContext({viewport});
          const page = await context.newPage();
          await page.goto(pathToFileURL(path.join(root, game, 'index.html')).href);
          await page.waitForFunction(() => document.body.dataset.screen === 'home');
          await page.selectOption('#theme', String(theme));
          const fit = await page.evaluate(() => {
            const outside = [];
            for (const node of document.querySelectorAll('[data-letter], .page-arrow, .page-label, h1, #footer')) {
              const box = node.getBoundingClientRect();
              if (box.width < 1) continue;
              if (box.top < -1 || box.left < -1 || box.bottom > innerHeight + 1 || box.right > innerWidth + 1) {
                outside.push(node.dataset.letter || node.id || node.className);
              }
            }
            return {
              scroll: document.documentElement.scrollHeight > innerHeight + 1 || document.documentElement.scrollWidth > innerWidth + 1,
              outside
            };
          });
          assert.equal(fit.scroll, false, `${game} ${viewport.width}x${viewport.height} theme ${theme} scrolls`);
          assert.deepEqual(fit.outside, [], `${game} ${viewport.width}x${viewport.height} theme ${theme} clips ${fit.outside}`);
          await context.close();
        }
      }
    }
    console.log('PASS catch-up layout: Letter Post and Moonboat fit 1024×576 and 1366×768 in every theme');

    const context = await browser.newContext({viewport: {width: 1024, height: 576}});
    await context.addInitScript(() => {
      window.__plays = [];
      window.__cheer = 0;
      window.__tap = 0;
      const orig = Audio.prototype.play;
      Audio.prototype.play = function () {
        const src = String(this.currentSrc || this.src || '');
        window.__plays.push(src.split('/').pop());
        if (src.includes('cheer') && !window.__cheer) window.__cheer = performance.now();
        setTimeout(() => this.dispatchEvent(new Event('ended')), 20);
        return Promise.resolve();
      };
      document.addEventListener('pointerdown', event => {
        if (event.target.closest && event.target.closest('[data-answer]')) window.__tap = performance.now();
      }, true);
    });
    const page = await context.newPage();
    await page.goto(pathToFileURL(path.join(root, 'v1-letter-post/index.html')).href);
    await page.waitForFunction(() => document.body.dataset.screen === 'home');
    assert.match(await page.locator('.collection-summary').textContent(), /this visit/);
    await showLetter(page, 'J');
    await page.evaluate(() => { window.__plays = []; });
    await page.locator('[data-letter="J"]').click();
    await page.waitForFunction(() => document.body.dataset.screen === 'listen' && window.__plays.length >= 2);
    const opened = await page.evaluate(() => window.__plays);
    assert.ok(opened.some(file => file.includes('j-name')), `letter page speaks the name: ${opened}`);
    assert.ok(opened.some(file => file.includes('j-sound')), `letter page speaks the sound: ${opened}`);
    const atListen = opened.length;
    await page.locator('[data-action="match"]').click();
    await page.waitForFunction(() => document.body.dataset.screen === 'match');
    assert.equal(await page.evaluate(() => window.__plays.length), atListen, 'Find the picture does not replay the letter');
    await page.evaluate(() => { window.__plays = []; });
    await page.locator('.back[data-action="listen"]').click();
    await page.waitForFunction(() => document.body.dataset.screen === 'listen' && window.__plays.length >= 2);
    const returned = await page.evaluate(() => window.__plays);
    assert.ok(returned.some(file => file.includes('j-name')), `Listen back speaks the name: ${returned}`);
    assert.ok(returned.some(file => file.includes('j-sound')), `Listen back speaks the sound: ${returned}`);
    assert.equal(returned.some(file => file.includes('word-') || file.includes('cheer')), false);
    await page.locator('[data-action="match"]').click();
    await page.waitForFunction(() => document.body.dataset.screen === 'match');
    const wrong = page.locator('.choice:not([data-answer="J"])').first();
    const wrongLetter = await wrong.getAttribute('data-answer');
    await page.evaluate(() => { window.__plays = []; });
    await wrong.click();
    await page.waitForFunction(() => window.__plays.length >= 2);
    const played = await page.evaluate(() => window.__plays);
    assert.equal(played.length, 2);
    assert.match(played[0], new RegExp(`word-`));
    assert.match(played[1], /lucy-(uh-oh|try-again|oops-try-again)/);
    assert.equal(played.some(file => file.includes(`${wrongLetter.toLowerCase()}-name`) || file.includes('-sound-')), false);
    assert.equal(await page.locator('.hint').count(), 0);
    assert.equal((await page.locator('.feedback').textContent()).includes('Try this picture'), false);
    await page.evaluate(() => { window.__plays = []; window.__cheer = 0; window.__tap = 0; });
    await page.locator('[data-answer="J"]').click();
    await page.waitForFunction(() => window.__cheer > 0);
    const delay = await page.evaluate(() => Math.round(window.__cheer - window.__tap));
    assert.ok(delay >= 0 && delay < 250, `cheer started after ${delay}ms`);
    await page.waitForFunction(() => document.body.dataset.screen === 'celebrate');
    await page.locator('.secondary[data-action="home"]').click();
    await page.waitForFunction(() => document.body.dataset.screen === 'home');
    assert.match(await page.locator('.page-label').textContent(), /Page 2 of 5/);
    const badge = await page.locator('[data-letter="J"] .done-badge').evaluate(node => {
      const style = getComputedStyle(node);
      return {bg: style.backgroundColor, w: Math.round(parseFloat(style.width))};
    });
    assert.equal(badge.bg, 'rgb(23, 107, 58)');
    assert.equal(badge.w, 36);
    assert.equal(await page.locator('[data-letter="J"] .pick-caption').textContent(), 'Done');
    await context.close();
    console.log('PASS catch-up play: wrong word plus one retry clip, cheer under 250ms, page remembered, green badge');
  } finally { await browser.close(); }
}

function serve() {
  const types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp'};
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      const file = path.join(root, decodeURIComponent(url.pathname));
      if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end('missing'); return;
      }
      res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream'});
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function cacheChecks() {
  const server = await serve();
  const {port} = server.address();
  const {chromium} = playwright();
  const browser = await chromium.launch({headless: true,
    ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath: process.env.CHROMIUM_EXECUTABLE} : {}),
    args: ['--no-sandbox', '--disable-dev-shm-usage']});
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${port}/v1-letter-post/index.html`);
    await page.waitForFunction(() => document.body.dataset.build === 'catchup-4');
    await page.waitForFunction(async () => (await caches.keys()).includes('little-woof-shell-4'));
    await page.evaluate(async () => {
      await caches.open('little-woof-shell-3');
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) await registration.unregister();
    });
    await page.reload();
    await page.waitForFunction(() => document.body.dataset.build === 'catchup-4');
    await page.waitForFunction(async () => {
      const keys = await caches.keys();
      return keys.includes('little-woof-shell-4') && !keys.includes('little-woof-shell-3');
    });
    const keys = await page.evaluate(async () => caches.keys());
    assert.deepEqual(keys, ['little-woof-shell-4']);
    await context.close();
    console.log('PASS catch-up cache: shell-4 replaces shell-3');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

(async () => {
  sourceChecks();
  await browserChecks();
  await cacheChecks();
})().catch(error => { console.error(error); process.exitCode = 1; });
