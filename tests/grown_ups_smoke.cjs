/* Local Playwright check of the grown-ups' corner: the reading gate, every setting,
 * and their effect on the chooser and all three worlds. Offline, file URLs only.
 * Screenshots go to /tmp/grown-ups-shots. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const root = path.resolve(__dirname, '..'), shots = '/tmp/grown-ups-shots';
const url = file => pathToFileURL(path.join(root, file)).href;
const KEY = 'little-woof-grown-ups';
const viewports = [
  {name: 'phone', width: 390, height: 844},
  {name: 'tablet', width: 768, height: 1024},
  {name: 'chromebook', width: 1366, height: 768},
  {name: 'whiteboard', width: 1920, height: 1080}
];

function playwright() {
  if (process.env.PLAYWRIGHT_MODULE) return require(process.env.PLAYWRIGHT_MODULE);
  try {return require('playwright');} catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
    return require('/usr/local/lib/pnpm/5/.pnpm/node_modules/playwright');
  }
}
const CONTROLS = 'button,a,select,input:not([type="radio"]),.segments label';
async function fits(page, label, minimum = 60, selector = CONTROLS) {
  const failures = await page.evaluate(([minimum, selector]) => {
    const failures = [];
    if (document.documentElement.scrollWidth > innerWidth + 1) failures.push('Horizontal overflow');
    for (const node of document.querySelectorAll(selector)) {
      const box = node.getBoundingClientRect();
      if (!box.width || !box.height || node.closest('[hidden],dialog:not([open])')) continue;
      const tall = node.matches('input[role="switch"]') ? 44 : minimum;
      if (box.width < 44 || box.height < tall - .5) failures.push(`${node.id || node.dataset.letter || node.textContent.trim().slice(0, 30)}: ${box.width} × ${box.height}`);
    }
    return failures;
  }, [minimum, selector]);
  assert.deepEqual(failures, [], `${label}: layout and touch targets`);
}
async function openSettings(page) {
  await page.waitForFunction(() => document.body?.dataset.view === 'settings');
  await page.waitForFunction(() => document.querySelector('#settings') && !document.querySelector('#settings').hidden);
}
const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);

async function run() {
  fs.mkdirSync(shots, {recursive: true});
  const browser = await playwright().chromium.launch({headless: true,
    ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath: process.env.CHROMIUM_EXECUTABLE} : {}),
    args: ['--no-sandbox', '--disable-dev-shm-usage']});
  const fresh = async (viewport, options = {}) => {
    const context = await browser.newContext({viewport, reducedMotion: 'no-preference', ...options});
    const network = [], errors = [];
    await context.route(/^https?:/, route => {network.push(route.request().url()); route.abort();});
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {if (message.type() === 'error') errors.push(message.text());});
    const done = async label => {
      assert.deepEqual(errors, [], `${label}: browser errors`);
      assert.deepEqual(network, [], `${label}: network requests`);
      await context.close();
    };
    return {context, page, done};
  };
  try {
    for (const viewport of viewports) {
      const label = `grown-ups-${viewport.name}`;
      const {page, done} = await fresh(viewport);
      // The chooser keeps its three worlds and adds a separate grown-up door.
      await page.goto(url('index.html'));
      await page.locator('#login:not([hidden])').waitFor();
      assert.equal(await page.locator('#layouts').isHidden(), true, 'Login is the first interactive screen');
      assert.equal(await page.locator('nav a').count(), 3);
      const door = page.locator('footer a.grown');
      assert.equal(await door.getAttribute('href'), 'grown-ups/index.html');
      await fits(page, `${label} chooser`);
      await door.click();
      await openSettings(page);
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator('#keypad, [data-digit]').count(), 0, 'No number keypad');
      const drawn = await page.locator('#paper').evaluate(n => Number(n.dataset.drawn || 0));
      assert(drawn >= 1, 'Paper band should render once');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'sheet');
      assert.equal(await page.locator('#leave .fill-label').first().textContent(), 'Back to the games');
      await page.waitForTimeout(450);
      await fits(page, `${label} settings`, viewport.width >= 1600 ? 72 : 60);
      assert.equal(await page.locator('#letter-grid button[aria-pressed="true"]').count(), 26);
      assert.equal(await page.locator('[data-preset="all"]').getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('.index').isVisible(), viewport.width >= 960, 'Section index only on wide screens');
      await page.screenshot({path: path.join(shots, `${label}-settings.png`), fullPage: true});

      // Every control saves straight away.
      await page.locator('label.row:has([data-setting="voice"])').click();
      await page.locator('#volume').fill('40');
      await page.locator('label.row:has([data-setting="effects"])').click();
      await page.locator('[data-preset="starter"]').click();
      assert.equal(await page.locator('#hint, .segments').count(), 0, 'No control can turn hints on');
      await page.locator('label.row:has([data-setting="calm"])').click();
      await page.locator('label.row:has([data-game="silk"])').click();
      await page.locator('label.row:has([data-setting="kidControls"])').click();
      await page.locator('[data-letter="T"]').click();
      assert.deepEqual(await saved(page), {voice: false, effects: false, calm: true, kidControls: false, volume: 40,
        letters: ['A', 'I', 'N', 'P', 'S'], hintAfter: 2, games: ['post', 'space']});
      assert.match(await page.locator('#save-status').textContent(), /^Saved\./);
      assert.equal(await page.locator('#volume-value').textContent(), '40%');
      assert.equal(await page.locator('#letter-count').textContent(), '5 of 26 letters in play: a i n p s.');
      assert.equal(await page.locator('[data-preset="starter"]').getAttribute('aria-pressed'), 'false');
      assert(await page.evaluate(() => document.documentElement.hasAttribute('data-calm')), 'Calm applies to this page too');

      // The last world and the last letter can't be switched off.
      await page.locator('label.row:has([data-game="space"])').click();
      await page.locator('label.row:has([data-game="post"])').click();
      assert.deepEqual((await saved(page)).games, ['post']);
      assert(await page.locator('[data-game="post"]').isChecked());
      assert.match(await page.locator('#save-status').textContent(), /at least one world/);
      for (const letter of ['A', 'I', 'N', 'P', 'S']) await page.locator(`[data-letter="${letter}"]`).click();
      assert.deepEqual((await saved(page)).letters, ['S']);
      assert.equal(await page.locator('[data-letter="S"]').getAttribute('aria-pressed'), 'true');
      assert.match(await page.locator('#save-status').textContent(), /at least one letter/);

      // Reset asks first; keeping cancels it.
      await page.locator('#reset').click();
      assert(await page.locator('#confirm').evaluate(n => n.open));
      await fits(page, `${label} dialog`);
      await page.screenshot({path: path.join(shots, `${label}-reset.png`)});
      await page.locator('#confirm button[value="cancel"]').click();
      await page.waitForFunction(() => document.activeElement.id === 'reset');
      assert.deepEqual((await saved(page)).letters, ['S']);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'reset');
      await page.locator('#reset').click();
      await page.locator('#confirm-reset').click();
      await page.waitForFunction(() => /back to how they started/.test(document.querySelector('#save-status').textContent));
      const defaults = await saved(page);
      assert.deepEqual(defaults.letters.length, 26); assert.equal(defaults.calm, false); assert.equal(defaults.games.length, 3);
      assert.equal(defaults.hintAfter, 2, 'Reset leaves the stored hint value unused');
      assert.equal(await page.locator('#letter-grid button[aria-pressed="true"]').count(), 26);
      assert.match(await page.locator('#save-status').textContent(), /back to how they started/);

      await page.locator('#leave').click();
      await page.waitForURL(/\/index\.html$/);
      await page.locator('#login:not([hidden])').waitFor();
      await page.locator('#play-guest').click();
      await page.locator('#layouts:not([hidden])').waitFor();
      assert.equal(await page.locator('nav a:visible').count(), 3);
      await page.goto(url('grown-ups/index.html'));
      await openSettings(page);
      assert.equal(await page.locator('#keypad').count(), 0, 'A later visit still has no keypad');
      await done(label);
      console.log(`PASS ${label}: chooser door, every setting, guards, reset, layout and offline`);
    }

    // Settings reach the chooser and every world.
    const settings = {voice: false, effects: false, calm: true, kidControls: false, volume: 40,
      letters: ['S', 'A', 'T', 'P', 'I', 'N'], hintAfter: 1, games: ['post', 'silk']};
    for (const viewport of [viewports[0], viewports[3]]) {
      const label = `worlds-${viewport.name}`;
      const {context, page, done} = await fresh(viewport);
      await context.addInitScript(([key, value]) => {
        if (!sessionStorage.getItem('seeded')) {localStorage.setItem(key, value); sessionStorage.setItem('seeded', '1');}
        const volumes = window.__volumes = [];
        const setter = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume').set;
        Object.defineProperty(HTMLMediaElement.prototype, 'volume', {set(v) {volumes.push(v); setter.call(this, v);}, get() {return 1;}});
        HTMLMediaElement.prototype.play = function () {setTimeout(() => this.dispatchEvent(new Event('ended')), 30); return Promise.resolve();};
      }, [KEY, JSON.stringify(settings)]);
      await page.goto(url('index.html'));
      await page.locator('#login:not([hidden])').waitFor();
      await page.locator('#play-guest').click();
      await page.locator('#layouts:not([hidden])').waitFor();
      assert.deepEqual(await page.locator('nav a:visible').evaluateAll(n => n.map(a => a.dataset.world)), ['post', 'silk']);
      assert.equal(await page.locator('nav').evaluate(n => n.style.getPropertyValue('--worlds')), '2');
      assert(await page.evaluate(() => document.documentElement.hasAttribute('data-calm')));
      await fits(page, `${label} chooser`);
      await page.screenshot({path: path.join(shots, `${label}-chooser.png`), fullPage: true});
      for (const world of ['v1-letter-post', 'v3-moonboat', 'v4-silk-thread']) {
        await page.goto(url(`${world}/index.html`));
        await page.waitForFunction(() => document.body?.dataset.screen === 'home');
        assert.deepEqual(await page.locator('[data-letter]').evaluateAll(n => n.map(b => b.dataset.letter)), ['A', 'I', 'N', 'P', 'S', 'T']);
        assert(await page.locator('.controls').isHidden(), `${world}: children's buttons hidden`);
        assert.equal(await page.locator('#mute').getAttribute('aria-pressed'), 'true');
        assert.equal(await page.evaluate(() => window.Fun.evidence.reduced), true, `${world}: calm motion`);
        assert(await page.locator('.collection-heading').textContent().then(t => t.includes('0 of 6')));
        await fits(page, `${label} ${world} home`, 44, '[data-letter],.primary,.secondary');
        await page.locator('[data-letter="P"]').click();
        await page.waitForFunction(() => document.body?.dataset.screen === 'listen');
        assert.equal(await page.evaluate(() => window.__volumes.length), 0, `${world}: voice off plays nothing`);
        await page.locator('[data-action="match"]').click();
        await page.waitForFunction(() => document.body?.dataset.screen === 'match');
        await page.locator('.choice:not([data-answer="P"])').first().click();
        await page.waitForFunction(() => document.querySelector('.choice.tried'));
        await page.waitForFunction(() => [...document.querySelectorAll('.choice')].every(n => !n.hasAttribute('aria-disabled')));
        assert.equal(await page.locator('.hint').count(), 0, `${world}: a stored hint setting never outlines`);
        await page.locator('[data-answer="P"]').click();
        await page.waitForFunction(() => document.body?.dataset.screen === 'celebrate');
        assert.equal(await page.locator('#confetti [data-particle]').count(), 0, `${world}: no confetti in calm motion`);
        assert(await page.locator('.collection-heading').textContent().then(t => t.includes('1 of 6')));
        await page.locator('[data-action="next"]').click();
        await page.waitForFunction(() => document.body?.dataset.screen === 'listen');
        assert((await page.locator('.listen-letter').getAttribute('aria-label')).includes('letter S '));
        await page.screenshot({path: path.join(shots, `${label}-${world}-listen.png`)});
      }
      // Voice on: clips play at the chosen volume.
      await page.evaluate(([key, value]) => localStorage.setItem(key, value), [KEY, JSON.stringify({...settings, voice: true})]);
      await page.goto(url('v1-letter-post/index.html'));
      await page.waitForFunction(() => document.body?.dataset.screen === 'home');
      await page.locator('[data-letter="A"]').click();
      await page.waitForFunction(() => window.__volumes.length >= 2);
      assert(await page.evaluate(() => window.__volumes.every(v => v === .4)), 'Voice volume applied in the browser');
      await done(label);
      console.log(`PASS ${label}: hidden world, chosen letters, quiet start, hidden buttons, calm motion, hints stay off and volume`);
    }

    // Reduced motion and dark mode render cleanly.
    for (const options of [{reducedMotion: 'reduce'}, {colorScheme: 'dark'}]) {
      const label = `grown-ups-${options.reducedMotion ? 'reduced' : 'dark'}`;
      const {page, done} = await fresh(viewports[2], options);
      await page.goto(url('grown-ups/index.html'));
      await openSettings(page);
      await page.waitForFunction(() => getComputedStyle(document.querySelector('#settings')).opacity === '1');
      if (options.reducedMotion) assert.equal(await page.locator('.stamp').evaluate(n => getComputedStyle(n).display), 'none');
      else assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(250, 242, 223)');
      await page.screenshot({path: path.join(shots, `${label}.png`), fullPage: true});
      await done(label);
      console.log(`PASS ${label}: unlock and settings render`);
    }
    console.log(`PASS grown-ups' corner; screenshots: ${shots}`);
  } finally {await browser.close();}
}

run().catch(error => {console.error(error); process.exitCode = 1;});
