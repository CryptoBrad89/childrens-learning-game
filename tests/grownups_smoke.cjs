'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const root = path.resolve(__dirname, '..');
const answers = {
  'What is eight plus five?': 'Thirteen',
  'What is four plus seven?': 'Eleven',
  'What is six plus six?': 'Twelve',
  'What is nine minus four?': 'Five'
};

function playwright() {
  if (process.env.PLAYWRIGHT_MODULE) return require(process.env.PLAYWRIGHT_MODULE);
  try { return require('playwright'); } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
    return require('/usr/local/lib/pnpm/5/.pnpm/node_modules/playwright');
  }
}

function file(name) {
  return pathToFileURL(path.join(root, name)).href;
}

async function fits(page, label) {
  const failures = await page.evaluate(() => {
    const failures = [];
    if (document.documentElement.scrollWidth > innerWidth + 1) failures.push('Horizontal overflow');
    for (const node of document.querySelectorAll('button, a, label')) {
      if (node.closest('[hidden]')) continue;
      const box = node.getBoundingClientRect();
      if (!box.width || !box.height || box.bottom < 0 || box.top > innerHeight) continue;
      if (box.width < 59.5 || box.height < 59.5) failures.push(`${node.id || node.textContent.trim()}: ${Math.round(box.width)} × ${Math.round(box.height)}`);
    }
    return failures;
  });
  assert.deepEqual(failures, [], `${label}: layout or 60px targets`);
}

async function hold(page, mode) {
  if (mode === 'keys') {
    await page.locator('#hold').focus();
    await page.keyboard.down('Space');
    await page.waitForSelector('#gate-question:not([hidden])');
    await page.keyboard.up('Space');
    return;
  }
  await page.locator('#hold').hover();
  await page.mouse.down();
  await page.waitForSelector('#gate-question:not([hidden])');
  await page.mouse.up();
}

async function answer(page, correct) {
  const prompt = (await page.locator('#gate-prompt').textContent()).trim();
  const expected = answers[prompt];
  assert.ok(expected, `Unknown question: ${prompt}`);
  const buttons = page.locator('#gate-choices button');
  const count = await buttons.count();
  for (let index = 0; index < count; index++) {
    const text = (await buttons.nth(index).textContent()).trim();
    if ((text === expected) === correct) {
      await buttons.nth(index).click();
      return;
    }
  }
  throw new Error(`No ${correct ? 'correct' : 'wrong'} choice for ${prompt}`);
}

async function run() {
  const browser = await playwright().chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath: process.env.CHROMIUM_EXECUTABLE} : {}),
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  try {
    const plain = await browser.newContext({viewport: {width: 390, height: 844}, reducedMotion: 'reduce'});
    await plain.route(/^https?:/, route => route.abort());
    const home = await plain.newPage();
    const homeErrors = [];
    home.on('pageerror', error => homeErrors.push(error.message));
    await home.goto(file('index.html'));
    assert.deepEqual(await home.locator('nav a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href'))), [
      'v1-letter-post/index.html', 'v3-moonboat/index.html', 'v4-silk-thread/index.html'
    ]);
    const entry = await home.locator('.grown-entry').boundingBox();
    assert.ok(entry && entry.height >= 59.5 && entry.width >= 59.5, 'Grown-ups entry is a 60px target');
    await home.goto(file('v1-letter-post/index.html'));
    await home.waitForFunction(() => document.body.dataset.screen === 'home');
    assert.equal(await home.locator('[data-letter]').count(), 26);
    assert.equal(await home.locator('#mute').getAttribute('aria-pressed'), 'false');
    assert.deepEqual(homeErrors, []);
    await plain.close();

    for (const viewport of [{width: 390, height: 844}, {width: 1180, height: 900}]) {
      const context = await browser.newContext({viewport, reducedMotion: 'reduce'});
      await context.route(/^https?:/, route => route.abort());
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(file('grown-ups/index.html'));
      assert.equal(await page.locator('body').getAttribute('data-screen'), 'gate');
      assert.equal(await page.locator('#sheet').getAttribute('hidden'), '');
      await page.locator('#hold').click({delay: 80});
      assert.equal(await page.locator('#gate-question').getAttribute('hidden'), '');
      await fits(page, `gate ${viewport.width}`);
      await hold(page, 'pointer');
      await answer(page, false);
      assert.equal(await page.locator('body').getAttribute('data-screen'), 'gate');
      assert.match(await page.locator('#status').textContent(), /did not open/);
      await hold(page, 'keys');
      await answer(page, true);
      assert.equal(await page.locator('body').getAttribute('data-screen'), 'settings');
      await page.reload();
      assert.equal(await page.locator('body').getAttribute('data-screen'), 'settings');
      await fits(page, `settings ${viewport.width}`);
      const contrast = await page.evaluate(() => {
        function channel(value) { const c = value / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }
        function luminance(color) {
          const parts = color.match(/\d+/g).map(Number);
          return 0.2126 * channel(parts[0]) + 0.7152 * channel(parts[1]) + 0.0722 * channel(parts[2]);
        }
        function ratio(a, b) {
          const left = luminance(a), right = luminance(b);
          const [hi, lo] = left > right ? [left, right] : [right, left];
          return (hi + 0.05) / (lo + 0.05);
        }
        const body = getComputedStyle(document.body);
        const button = getComputedStyle(document.querySelector('#hand-back'));
        return {body: ratio(body.color, body.backgroundColor), button: ratio(button.color, button.backgroundColor)};
      });
      assert.ok(contrast.body >= 4.5, `Body contrast ${contrast.body}`);
      assert.ok(contrast.button >= 4.5, `Button contrast ${contrast.button}`);
      assert.deepEqual(errors, []);
      await context.close();
    }

    const context = await browser.newContext({viewport: {width: 1180, height: 900}, reducedMotion: 'no-preference'});
    await context.route(/^https?:/, route => route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(file('grown-ups/index.html'));
    await hold(page, 'pointer');
    await answer(page, true);
    await page.locator('#letters-first').click();
    for (const letter of ['A', 'D', 'I', 'M', 'N', 'P', 'S']) {
      await page.locator(`#letter-grid button[data-letter="${letter}"]`).click();
    }
    await page.locator('#letter-grid button[data-letter="T"]').click();
    assert.equal(await page.locator('#letter-grid button[data-letter="T"]').getAttribute('aria-pressed'), 'true');
    assert.match(await page.locator('#status').textContent(), /at least one letter/);
    await page.locator('#letters-first').click();
    assert.deepEqual(await page.locator('#letter-grid button[aria-pressed="true"]').evaluateAll(nodes => nodes.map(node => node.dataset.letter)), ['A', 'D', 'I', 'M', 'N', 'P', 'S', 'T']);
    for (const value of ['post', 'space']) await page.locator(`input[name="game"][value="${value}"]`).uncheck();
    await page.locator('input[name="game"][value="silk"]').click();
    assert.equal(await page.locator('input[name="game"][value="silk"]').isChecked(), true);
    assert.match(await page.locator('#status').textContent(), /at least one adventure/);
    await page.locator('input[name="game"][value="post"]').check();
    await page.locator('input[name="game"][value="space"]').check();
    await page.locator('input[name="game"][value="silk"]').uncheck();
    await page.locator('input[name="sound"][value="off"]').check();
    await page.locator('input[name="hint"][value="1"]').check();
    await page.goto(file('index.html'));
    assert.deepEqual(await page.locator('nav a').evaluateAll(nodes => nodes.filter(node => !node.hidden).map(node => node.getAttribute('href'))), [
      'v1-letter-post/index.html', 'v3-moonboat/index.html'
    ]);
    await page.goto(file('v1-letter-post/index.html'));
    await page.waitForFunction(() => document.body.dataset.screen === 'home');
    assert.deepEqual(await page.locator('[data-letter]').evaluateAll(nodes => nodes.map(node => node.dataset.letter)), ['A', 'D', 'I', 'M', 'N', 'P', 'S', 'T']);
    assert.equal(await page.locator('#mute').getAttribute('aria-pressed'), 'true');
    await page.locator('[data-letter="T"]').click();
    await page.waitForFunction(() => document.body.dataset.screen === 'listen');
    await page.locator('[data-action="match"]').click();
    await page.waitForFunction(() => document.body.dataset.screen === 'match');
    await page.locator('.choice:not([data-answer="T"])').first().click();
    await page.waitForFunction(() => document.querySelector('.choice.hint'));
    await page.locator('[data-answer="T"]').click();
    await page.waitForFunction(() => document.body.dataset.screen === 'celebrate');
    assert.match(await page.locator('.collection-heading').textContent(), /of 26/);
    await page.locator('[data-action="next"]').click();
    await page.waitForFunction(() => document.body.dataset.screen === 'listen');
    assert.match((await page.locator('.glyph').innerText()).replace(/\s/g, ''), /^A/i);
    await page.goto(file('grown-ups/index.html'));
    await page.locator('input[name="motion"][value="calm"]').check();
    await page.goto(file('v3-moonboat/index.html'));
    await page.waitForFunction(() => document.body.dataset.screen === 'home');
    assert.equal(await page.locator('html').getAttribute('data-motion'), 'calm');
    assert.equal(await page.evaluate(() => document.getAnimations().filter(animation => animation.playState === 'running' && Number(animation.effect.getTiming().duration) > 1).length), 0);
    await page.goto(file('grown-ups/index.html'));
    await page.locator('input[name="motion"][value="full"]').check();
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.goto(file('v1-letter-post/index.html'));
    await page.locator('[data-letter="A"]').click();
    await page.waitForFunction(() => document.body.dataset.screen === 'listen');
    assert.notEqual(await page.locator('body[data-screen="listen"] .lucy-portrait img').evaluate(node => getComputedStyle(node).animationName), 'none');
    await page.goto(file('grown-ups/index.html'));
    await page.evaluate(() => localStorage.setItem('little-woof-grown-ups', '{'));
    await page.reload();
    assert.equal(await page.locator('#letter-grid button[aria-pressed="true"]').count(), 26);
    await page.locator('#hand-back').click();
    await page.waitForURL(url => url.pathname.endsWith('/index.html') && !url.pathname.includes('grown-ups'));
    await page.goto(file('grown-ups/index.html'));
    assert.equal(await page.locator('body').getAttribute('data-screen'), 'gate');
    assert.deepEqual(errors, []);
    await context.close();
    console.log('PASS grown-ups: gate, shelf, sound, hint, adventures, calm, full motion, hand-back');
  } finally {
    await browser.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
