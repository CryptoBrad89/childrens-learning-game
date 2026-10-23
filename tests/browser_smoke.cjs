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
          const capture = label => page.screenshot({path: path.join(shots, `${prefix}-${label}.png`), fullPage: true});
          const fits = async () => {
            const failures = await page.evaluate(() => {
              const failures = [];
              if (document.documentElement.scrollWidth > innerWidth + 1) failures.push('Page overflows horizontally');
              for (const node of document.querySelectorAll('[data-letter],.choice,.primary,.secondary,.replay-prompt')) {
                if (!node.offsetParent) continue; // on another page of letters
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
          const phone = viewport.width < 700;
          // Phones scroll the letters; bigger screens show a page at a time, with arrows.
          const showLetter = async letter => {
            for (let i = 0; i < 30 && await page.locator(`[data-letter="${letter}"]`).isHidden(); i++) {
              const on = await page.locator('[data-letter]:not([hidden])').first().getAttribute('data-letter');
              await page.locator(`.page-arrow[data-page="${letter < on ? -1 : 1}"]`).click();
            }
          };
          await page.goto(pathToFileURL(path.join(root, game, 'index.html')).href);
          await page.selectOption('#theme', String(theme));
          await settle(); await page.evaluate(() => document.fonts.ready);
          assert.deepEqual(await page.locator('[data-letter]').evaluateAll(nodes => nodes.map(n => n.dataset.letter)), alphabet);
          if (phone) {
            assert(await page.locator('.picker-shelf').evaluate(n => n.scrollHeight > n.clientHeight), 'Letter shelf must scroll');
            assert(await page.locator('.collection-slots').evaluate(n => n.scrollWidth > n.clientWidth), 'Collection must scroll');
          } else {
            assert(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1), 'Home fits with no page scroll');
            assert(/page 1 of \d/.test(await page.locator('.page-label').textContent()), 'Page label');
            // The collection opens from its summary and closes on a tap outside and on Escape.
            await page.locator('.collection-summary').click();
            assert(await page.locator('.collection-sheet').isVisible());
            assert.equal(await page.locator('.collection-sheet .collection-slot').count(), 26);
            await page.mouse.click(5, viewport.height - 5);
            assert(await page.locator('.collection-sheet').isHidden(), 'Collection closes on a tap outside');
            await page.locator('.collection-summary').click(); await page.keyboard.press('Escape');
            assert(await page.locator('.collection-sheet').isHidden(), 'Collection closes on Escape');
          }
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
            assert((await page.locator('.match-prompt h1').textContent()).includes(letter === 'X' ? 'ends' : 'starts'));
            const wrong = page.locator(`.choice:not([data-answer="${letter}"])`);
            assert.equal(await wrong.count(), 2);
            for (let miss = 0; miss < 2; miss++) {
              await wrong.nth(miss).click();
              assert(await page.locator('.choice').evaluateAll(nodes => nodes.every(n => !n.hasAttribute('aria-disabled'))), 'Pictures stay live after a miss');
              assert.match(await page.locator('.feedback').textContent(), /^That’s \w+\. Try another picture\.$/);
            }
            assert.equal(await page.locator('.hint,.hint-tag').count(), 0, 'No hints');
            if (letter === 'X') { await settle(); await fits(); await capture('match-X-misses'); }
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
            assert.equal(await page.locator('.letter-list .is-done').count(), count);
            assert.equal(await page.locator('.letter-list .done-badge').count(), count);
            // Home opens on the page with the letter just played.
            assert(await page.locator(`[data-letter="${next}"]`).isVisible() || await page.locator(`[data-letter="${letter}"]`).isVisible(), 'Back on the letter\'s page');
          }
          if (phone) {
            await page.locator('[data-letter="Z"]').focus(); await page.keyboard.press('ArrowRight');
            assert.equal(await page.locator(':focus').getAttribute('data-letter'), 'A');
            await page.locator('.picker-shelf').evaluate(n => {n.scrollTop = n.scrollHeight;});
            await page.locator('.collection-slots').evaluate(n => {n.scrollLeft = n.scrollWidth;});
          } else {
            // Arrow keys move on to the next page at the end of one.
            await showLetter('A');
            const last = page.locator('[data-letter]:not([hidden])').last();
            const after = alphabet[alphabet.indexOf(await last.getAttribute('data-letter')) + 1];
            await last.focus(); await page.keyboard.press('ArrowRight');
            assert.equal(await page.locator(':focus').getAttribute('data-letter'), after);
            await showLetter('Z');
          }
          await fits(); await capture('home-end-of-alphabet');
          assert.deepEqual(errors, [], `${prefix}: browser errors`);
          await context.close(); cases++;
          console.log(`PASS ${prefix}: B/J/X/Z flow, quiet misses, no hints, done badges, pages, replay, collection, wrap, keyboard and layout`);
        }
      }
    }
    console.log(`PASS ${cases} browser cases; screenshots: ${shots}`);
  } finally {await browser.close();}
}

run().catch(error => {
  fs.mkdirSync(shots, {recursive: true});
  fs.writeFileSync(path.join(shots, 'browser-error.txt'), String(error) + '\n');
  console.error(error); process.exitCode = 1;
});
