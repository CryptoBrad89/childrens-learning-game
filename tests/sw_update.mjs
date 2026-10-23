/* C1: a new build takes over from an older installed offline copy, with no tab
 * closing, private window or cache clearing. The files are served like a static
 * host that lets browsers keep them for 10 minutes.
 *   1. the start build (offline copy 4, which answered from its store first) is
 *      installed some time before the deploy, as on a real device;
 *   2. this build is deployed: the old copy may answer the first load, but this
 *      build must show on the next load or, at most, after one refresh;
 *   3. a later build (a copy of this one with a visible change) must show on the
 *      very next load;
 *   4. offline play still works, and only the newest offline store is kept.
 * No request routing: Playwright's routing changes how service workers behave.
 * Needs git (for the start build). Takes about two minutes. Run:
 *   CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/sw_update.mjs */
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execSync} from 'node:child_process';
import {playwright, launchOptions, root} from './accounts/harness.mjs';

const START = process.env.SW_START_COMMIT || 'f9da662';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lw-sw-'));
const old = path.join(tmp, 'old'), later = path.join(tmp, 'later'), profile = path.join(tmp, 'profile');
fs.mkdirSync(old);
execSync(`git -C "${root}" archive ${START} | tar -x -C "${old}"`);
// The later build: this one, with a visible change and the next store version.
fs.cpSync(root, later, {recursive: true, filter: src => !/[\\/](\.git|node_modules|reports|tests)([\\/]|$)/.test(src.slice(root.length))});
fs.writeFileSync(path.join(later, 'v1-letter-post/config.js'), fs.readFileSync(path.join(later, 'v1-letter-post/config.js'), 'utf8').replace('Lucy\\u2019s Letter Post', 'Lucy\\u2019s Letter Post (later build)'));
fs.writeFileSync(path.join(later, 'sw.js'), fs.readFileSync(path.join(later, 'sw.js'), 'utf8').replace(/little-woof-shell-(\d+)/, (m, n) => `little-woof-shell-${Number(n) + 1}`));

const TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2'};
let serving = old;
// Like a static host: files may be cached by the browser for a while.
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let file = path.join(serving, decodeURIComponent(url.pathname));
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, {'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'max-age=600'});
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const ctx = await playwright().chromium.launchPersistentContext(profile, {...launchOptions(), viewport: {width: 1366, height: 768}});
// No routing here: Playwright's request routing changes how service workers are used.
const page = ctx.pages()[0] || await ctx.newPage();
const state = () => page.evaluate(async () => ({paged: !!document.querySelector('.page-nav'), title: document.querySelector('.post-home h1')?.textContent || '',
  later: document.title.includes('later build') || !!window.CONCEPT?.title?.includes('later build'), stores: await caches.keys()}));
const home = () => page.waitForFunction(() => document.body?.dataset.screen === 'home', null, {timeout: 20000});
// Copy n is in control: it stored the files, deleted every older store, and answers
// this page. (Copy 4 predates the version reply, so for it the store is enough.)
const installed = n => page.waitForFunction(async n => {
  const keys = await caches.keys();
  if (keys.length !== 1 || !keys[0].endsWith('-' + n) || !navigator.serviceWorker.controller || (await (await caches.open(keys[0])).keys()).length <= 100) return false;
  if (n < 5) return true;
  const answer = await new Promise(resolve => {
    navigator.serviceWorker.addEventListener('message', e => resolve(e.data && e.data.version), {once: true});
    navigator.serviceWorker.controller.postMessage('version'); setTimeout(() => resolve(null), 500);
  });
  return answer === 'little-woof-shell-' + n;
}, n, {timeout: 60000, polling: 300});
try {
  // 1. The start build, installed.
  await page.goto(base + '/v1-letter-post/index.html'); await home();
  await installed(4); await page.reload(); await home();
  // Like a real device, the old copy was installed a while before the new build:
  // the browser doesn't look for a new sw.js again in the first half minute or so.
  await page.waitForTimeout(Number(process.env.SW_AGE_MS || 65000));
  assert.equal((await state()).paged, false, 'start build');
  console.log('PASS the start build (offline copy 4) is installed and in control');

  // 2. This build is deployed. Count the loads until it shows.
  // The old copy answers the first load straight from its store (it was written
  // that way); while that page is open the browser finds the new sw.js, which
  // installs and takes over. So: the next load, or after one refresh.
  serving = root;
  let loads = 1, now;
  await page.reload(); await home(); now = await state();
  if (!now.paged) {
    await page.waitForTimeout(20000); // a child spends a little while on the page
    await page.reload(); await home(); loads++; now = await state();
  }
  assert(now.paged, `this build didn't show after ${loads} loads`);
  await installed(5);
  console.log(`PASS this build shows ${loads === 1 ? 'on the next load' : 'after one refresh'} over the old offline copy, with no cache clearing`);

  // 3. From this build on, a new build shows on the very next load: pages, scripts
  // and styles come from the network first, and the browser can't hold them back.
  serving = later;
  await page.reload(); await home(); now = await state();
  assert(now.later, 'the later build shows on the next load');
  console.log('PASS a later build shows on the very next load (network first for pages, scripts and styles)');

  // 4. Offline still works, with only the newest store kept.
  await installed(6);
  await ctx.setOffline(true);
  await page.reload(); await home();
  assert((await state()).later, 'offline: the newest copy plays');
  await page.locator('.letter-list [data-letter="A"]').click();
  await page.waitForFunction(() => document.body.dataset.screen === 'listen');
  console.log('PASS offline play works from the newest copy; older stores are gone');
} finally {
  await ctx.close(); server.close(); fs.rmSync(tmp, {recursive: true, force: true});
}
