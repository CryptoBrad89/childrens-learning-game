/* Home flow: splash, child login, then a layout pick. Ribbon Road is the default.
 * Play without saving must not write progress, stars, or settings.
 * file:// only. No network.
 */
'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const root = path.resolve(__dirname, '..');
const url = file => pathToFileURL(path.join(root, file)).href;

function playwright() {
  if (process.env.PLAYWRIGHT_MODULE) return require(process.env.PLAYWRIGHT_MODULE);
  try { return require('playwright'); } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
    return require('/usr/local/lib/pnpm/5/.pnpm/node_modules/playwright');
  }
}

async function run() {
  const browser = await playwright().chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath: process.env.CHROMIUM_EXECUTABLE} : {}),
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const context = await browser.newContext({viewport: {width: 390, height: 844}, reducedMotion: 'reduce'});
  const network = [];
  await context.route(/^https?:/, route => { network.push(route.request().url()); return route.abort(); });
  await context.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () {
      setTimeout(() => this.dispatchEvent(new Event('ended')), 20);
      return Promise.resolve();
    };
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(url('index.html'));
    await page.locator('#login:not([hidden])').waitFor();
    assert.equal(await page.locator('#splash').isHidden(), true, 'Splash is not the interactive screen');
    assert.equal(await page.locator('#splash button, #splash a').count(), 0, 'Splash has no controls');
    assert.equal(await page.locator('#layouts').isHidden(), true, 'Layouts wait until login or play without saving');
    assert.equal(await page.locator('#class-code, #class-form').count(), 0, 'No classroom code on the login dialog');
    const loginText = await page.locator('#login').innerText();
    assert.equal(/classroom|teacher|parent|group code/i.test(loginText), false, 'Login stays child-first');
    assert.match(await page.locator('.chrome').innerText(), /Letters with Lucy/);
    assert.match(await page.locator('.chrome').innerText(), /Little Sounds Big Discovery/);
    assert.equal(await page.title(), 'Letters with Lucy');
    assert.match(await page.locator('#guest-warning').innerText(), /Progress will not be saved/);
    assert.equal(await page.locator('footer a.grown').innerText(), 'Are you a grown-up?');
    assert.equal(await page.locator('footer a.grown').getAttribute('href'), 'grown-ups/index.html');
    await page.locator('#play-guest').click();
    await page.locator('#layouts:not([hidden])').waitFor();
    assert.equal(await page.locator('a[data-world="silk"]').getAttribute('aria-current'), 'true');
    assert.equal(await page.locator('a[data-world="silk"]').evaluate(node => node.classList.contains('is-chosen')), true);
    assert.equal(await page.locator('#layouts nav a[data-world]').count(), 3);
    assert.equal(await page.locator('#play-chosen, .play-row').count(), 0, 'The three cards start the game');
    assert.equal(await page.locator('a[href="v4-silk-thread/index.html"]').count(), 1);
    assert.equal(await page.evaluate(() => sessionStorage.getItem('lw-guest')), '1');

    await page.goto(url('v4-silk-thread/index.html'));
    await page.waitForFunction(() => document.body.dataset.screen === 'home');
    assert.match(await page.locator('.brand').innerText(), /Letters with Lucy/);
    assert.match(await page.locator('.brand').innerText(), /Little Sounds Big Discovery/);
    assert.match(await page.locator('h1').innerText(), /Ribbon/);
    assert.equal(await page.title(), 'Ribbon Road · Letters with Lucy');
    assert.equal(/Little Woof|Silk Thread|Ready Set ABC/i.test(await page.locator('body').innerText()), false);
    await page.selectOption('#theme', '2');
    assert.equal(await page.locator('body').getAttribute('data-theme'), '2');
    await page.locator('[data-letter="A"]').click();
    await page.waitForFunction(() => document.body.dataset.screen === 'listen');
    await page.locator('[data-action="match"]').click();
    await page.waitForFunction(() => document.body.dataset.screen === 'match');
    await page.locator('[data-answer="A"]').click();
    await page.waitForFunction(() => document.body.dataset.screen === 'celebrate');
    const stored = await page.evaluate(() => ({
      theme: localStorage.getItem('little-woof-silk-theme'),
      active: localStorage.getItem('little-woof-active'),
      settings: localStorage.getItem('little-woof-grown-ups'),
      states: Object.keys(localStorage).filter(key => key.startsWith('little-woof-state'))
    }));
    assert.equal(stored.theme, null, 'Guest theme is not saved');
    assert.equal(stored.active, null, 'Guest does not become a saved player');
    assert.equal(stored.settings, null, 'Guest settings are not saved');
    assert.deepEqual(stored.states, [], 'Guest progress is not saved');
    await page.reload();
    await page.waitForFunction(() => document.body.dataset.screen === 'home');
    assert.equal(await page.locator('#theme').inputValue(), '0', 'Theme resets after a guest visit');
    assert.match(await page.locator('.collection-heading').innerText(), /0 of 26/);
    assert.deepEqual(errors, [], 'browser errors');
    assert.deepEqual(network, [], 'network requests');
    console.log('PASS home flow: login first, Ribbon Road default, play without saving writes nothing');
  } finally {
    await browser.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
