/* Optional local Playwright smoke test. No server or internet required.
 * PLAYWRIGHT_MODULE and CHROMIUM_EXECUTABLE can point to existing installs. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const root = path.resolve(__dirname, '..'), shots = '/tmp/lpmb-shots';
const alphabet = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const shard = process.env.BROWSER_SMOKE_SHARD;
assert(shard === undefined || /^[0-5]$/.test(shard), 'BROWSER_SMOKE_SHARD must be 0 through 5');

function playwright() {
  if (process.env.PLAYWRIGHT_MODULE) return require(process.env.PLAYWRIGHT_MODULE);
  try {return require('playwright');} catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
    return require('/usr/local/lib/pnpm/5/.pnpm/node_modules/playwright');
  }
}

async function run() {
  fs.mkdirSync(shots, {recursive: true});
  const {chromium} = playwright();
  const browser = await chromium.launch({headless: true,
    ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath: process.env.CHROMIUM_EXECUTABLE} : {}),
    args: ['--no-sandbox', '--disable-dev-shm-usage']});
  let cases = 0;
  try {
    for (const [gameIndex, game] of ['v1-letter-post', 'v3-moonboat'].entries()) {
      for (const [viewportIndex, viewport] of [{width: 390, height: 844}, {width: 768, height: 1024}, {width: 1440, height: 1000}].entries()) {
        if (shard !== undefined && gameIndex * 3 + viewportIndex !== Number(shard)) continue;
        for (let theme = 0; theme < 3; theme++) {
          const context = await browser.newContext({viewport, reducedMotion: 'no-preference'});
          await context.route(/^https?:/, route => route.abort());
          const page = await context.newPage(), errors = [];
          page.on('pageerror', error => errors.push(error.message));
          const prefix = `${game}-${viewport.width}-theme${theme}`;
          const settle = () => page.waitForFunction(() => !document.body.dataset.effect && !document.body.classList.contains('talking'));
          const screen = value => page.waitForFunction(value => document.body.dataset.screen === value, value);
          const capture = label => process.env.NO_SCREENSHOTS ? Promise.resolve() : page.screenshot({path: path.join(shots, `${prefix}-${label}.png`), fullPage: true});
          const fits = async () => {
            const failures = await page.evaluate(() => {
              const failures = [];
              if (document.documentElement.scrollWidth > innerWidth + 1) failures.push('Page overflows horizontally');
              for (const node of document.querySelectorAll('[data-letter],.choice,.primary,.secondary,.replay-prompt')) {
                const box = node.getBoundingClientRect();
                if (box.width < 44 || box.height < 44) failures.push(`Small touch target: ${node.textContent.trim()}`);
              }
              for (const node of document.querySelectorAll('.choice .word')) {
                const card = node.closest('.choice').getBoundingClientRect();
                const range = document.createRange(); range.selectNodeContents(node);
                for (const rect of range.getClientRects()) {
                  if (rect.left < card.left || rect.right > card.right) failures.push(`Word overflows card: ${node.textContent}`);
                }
              }
              return failures;
            });
            assert.deepEqual(failures, [], `${prefix}: layout or touch target failure`);
          };
          await page.goto(pathToFileURL(path.join(root, game, 'index.html')).href);
          await page.selectOption('#theme', String(theme));
          await settle(); await page.evaluate(() => document.fonts.ready);
          const shown = [];
          for (let index = 0; index < 5; index++) {
            shown.push(...await page.locator('[data-letter]').evaluateAll(nodes => nodes.map(n => n.dataset.letter)));
            if (index < 4) await page.locator('[data-action=letters-next]').click();
          }
          assert.deepEqual(shown, alphabet);
          for (let index = 0; index < 4; index++) await page.locator('[data-action=letters-previous]').click();
          const showLetter = async letter => {
            while (!await page.locator(`[data-letter="${letter}"]`).count()) {
              const range = await page.locator('.page-range').innerText();
              await page.locator(`[data-action=letters-${letter < range[0] ? 'previous' : 'next'}]`).click();
            }
          };
          assert.equal(await page.locator('.picker-shelf').evaluate(n => getComputedStyle(n).overflowY), 'visible', 'Paged cards keep their decorative shadows without an inner scroller');
          await page.locator('.collection-preview summary').click();
          assert(await page.locator('.collection-slots').evaluate(n => n.scrollWidth <= n.clientWidth+2 && n.scrollHeight <= n.clientHeight+2), 'All collection rows fit without an inner scroller');
          await page.locator('.collection-preview summary').click();
          if (game === 'v3-moonboat') assert.match(await page.locator('.captain-panel .lead').innerText(), /A whole sky\s+of little sounds\./, 'Introduction keeps spaces on phones');
          await fits(); await capture('home');
          let count = 0;
          for (const letter of ['B', 'J', 'X', 'Z']) {
            await showLetter(letter);
            await page.locator(`[data-letter="${letter}"]`).click();
            await screen('listen'); await settle(); await fits();
            if (letter === 'J') await capture('listen-J');
            await page.locator('.listen-letter').click(); await settle();
            await page.locator('[data-action="match"]').click();
            await screen('match'); await settle(); await fits();
            assert.match(await page.locator('.match-prompt h1').innerText(), letter === 'X' ? /What ends\s+with \/ks\// : /What starts\s+with /, 'Question keeps spaces when its line break is hidden');
            const wrong = page.locator(`.choice:not([data-answer="${letter}"])`);
            assert.equal(await wrong.count(), 2);
            for (let miss = 0; miss < 2; miss++) {
              await wrong.nth(miss).click();
              await page.waitForFunction(() => [...document.querySelectorAll('.choice')].every(n => !n.hasAttribute('aria-disabled')));
            }
            assert(await page.locator(`[data-answer="${letter}"]`).evaluate(n => n.classList.contains('hint')));
            if (letter === 'X') {
              assert((await page.locator('.feedback').textContent()).includes('ends with /ks/'));
              await fits(); await capture('match-X-hint');
            }
            await page.locator(`[data-answer="${letter}"]`).click();
            await screen('celebrate'); await settle(); await fits(); count++;
            assert((await page.locator('.collection-heading').textContent()).includes(`${count} of 26`));
            if (letter === 'X') {
              assert.equal(await page.locator('.word-line').textContent(), 'Fox ends with x.');
              await capture('celebrate-X');
            }
            await page.locator('[data-action="reward-replay"]').click(); await settle();
            await page.locator('[data-action="next"]').click();
            await screen('listen'); await settle();
            const next = alphabet[(alphabet.indexOf(letter) + 1) % 26];
            assert((await page.locator('.listen-letter').getAttribute('aria-label')).includes(`letter ${next} `));
            await page.locator('.back[data-action="home"]').click(); await screen('home'); await settle();
            assert((await page.locator('.collection-heading').innerText()).includes(`${count} of 26`));
          }
          await showLetter('Z');
          await page.locator('[data-letter="Z"]').focus(); await page.keyboard.press('ArrowRight');
          assert.equal(await page.locator(':focus').getAttribute('data-letter'), 'A');
          await showLetter('Z');
          await page.locator('[data-letter=Z]').scrollIntoViewIfNeeded();
          await page.locator('.collection-preview summary').click();
          await page.locator('.collection-slot').last().scrollIntoViewIfNeeded();
          await fits(); await capture('home-end-of-alphabet');
          assert.deepEqual(errors, [], `${prefix}: browser errors`);
          await context.close(); cases++;
          console.log(`PASS ${prefix}: B/J/X/Z flow, hints, replay, collection, wrap, keyboard and layout`);
        }
      }
    }
    console.log(`PASS ${cases} browser cases; screenshots ${process.env.NO_SCREENSHOTS ? "disabled" : shots}`);
  } finally {await browser.close();}
}

run().catch(error => {
  fs.mkdirSync(shots, {recursive: true});
  fs.writeFileSync(path.join(shots, 'browser-error.txt'), String(error) + '\n');
  console.error(error); process.exitCode = 1;
});
