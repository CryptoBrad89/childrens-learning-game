/* Two browsers, one child. One plays offline, the other plays online,
 * and after reconnect both show both letters.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
const configText = fs.readFileSync(path.join(__dirname, '..', 'accounts', 'config.js'), 'utf8');
const url = configText.match(/url: '([^']+)'/)[1];
const key = configText.match(/key: '([^']+)'/)[1];

function playwright() {
  if (process.env.PLAYWRIGHT_MODULE) return require(process.env.PLAYWRIGHT_MODULE);
  try { return require('playwright'); } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
    return require('/usr/local/lib/pnpm/5/.pnpm/node_modules/playwright');
  }
}
async function api(pathname, body, token) {
  const response = await fetch(url + pathname, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${token || key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (error) { data = {error: text}; }
  if (!response.ok) throw new Error(`${pathname} ${response.status}: ${data && data.error ? data.error : text}`);
  return data;
}
function suffix() { return Math.random().toString(36).slice(2, 8); }

async function seed() {
  const tag = suffix();
  const login = `k${tag}`.replace(/[^a-z0-9]/g, '').slice(0, 12);
  const childPassword = '7234ab';
  const session = await api('/auth/v1/token?grant_type=password', {email: 'ada@littlewoof.test', password: 'sunnyday'});
  await api('/functions/v1/accounts-manage', {
    action: 'create-child', display_name: 'Sync Kid', login_name: login, password: childPassword, avatar: 'fox'
  }, session.access_token);
  return {login, childPassword};
}

function listen(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  return errors;
}
async function signChild(page, seeded) {
  await page.goto('http://127.0.0.1:8765/index.html');
  await page.locator('#child-form').waitFor();
  await page.locator('#login-name').fill(seeded.login);
  await page.locator('#login-secret').fill(seeded.childPassword);
  await page.locator('#child-form button[type="submit"]').click();
  await page.waitForFunction(() => !document.documentElement.dataset.account && document.querySelector('#player-name')?.textContent.includes('Sync Kid'));
}
async function play(page, letter) {
  if (!page.url().includes('/v1-letter-post/')) await page.goto('http://127.0.0.1:8765/v1-letter-post/index.html');
  await page.waitForFunction(() => document.body?.dataset.screen === 'home');
  await page.locator(`[data-letter="${letter}"]`).click();
  await page.waitForFunction(() => document.body?.dataset.screen === 'listen');
  await page.locator('[data-action="match"]').click();
  await page.waitForFunction(() => document.body?.dataset.screen === 'match');
  await page.locator(`[data-answer="${letter}"]`).click();
  await page.waitForFunction(() => document.body?.dataset.screen === 'celebrate');
  await page.waitForFunction(expected => (document.querySelector('#kept')?.dataset.letters || '').includes(expected), letter);
}

async function run() {
  const seeded = await seed();
  const server = spawn('python3', ['-m', 'http.server', '8765', '--bind', '127.0.0.1'], {cwd: path.resolve(__dirname, '..'), stdio: 'ignore'});
  let browser;
  try {
  await new Promise(resolve => setTimeout(resolve, 300));
  browser = await playwright().chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath: process.env.CHROMIUM_EXECUTABLE} : {}),
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const stub = () => {
    HTMLMediaElement.prototype.play = function () {
      setTimeout(() => this.dispatchEvent(new Event('ended')), 20);
      return Promise.resolve();
    };
  };
    const contextA = await browser.newContext({viewport: {width: 1280, height: 800}});
    const contextB = await browser.newContext({viewport: {width: 1280, height: 800}});
    await contextA.addInitScript(stub);
    await contextB.addInitScript(stub);
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    const errorsA = listen(pageA);
    const errorsB = listen(pageB);
    await signChild(pageA, seeded);
    await signChild(pageB, seeded);

    await pageA.goto('http://127.0.0.1:8765/v1-letter-post/index.html');
    await pageA.waitForFunction(() => navigator.serviceWorker.ready);
    await pageA.reload();
    await pageA.waitForFunction(() => navigator.serviceWorker.controller);

    await contextA.setOffline(true);
    await play(pageA, 'B');
    await pageA.reload();
    await pageA.waitForFunction(() => document.body?.dataset.screen === 'home');
    await pageA.waitForFunction(() => (document.querySelector('#kept')?.dataset.letters || '').includes('B'), null, {timeout: 10000});

    await play(pageB, 'C');
    await pageB.evaluate(() => window.LittleWoof.sync());
    await contextA.setOffline(false);
    await pageA.evaluate(() => window.LittleWoof.sync());
    await pageA.waitForFunction(() => {
      const letters = document.querySelector('#kept')?.dataset.letters || '';
      return letters.includes('B') && letters.includes('C');
    }, null, {timeout: 20000});
    await pageB.goto('http://127.0.0.1:8765/index.html');
    await pageB.waitForFunction(() => {
      const letters = document.querySelector('#kept')?.dataset.letters || '';
      return letters.includes('B') && letters.includes('C');
    }, null, {timeout: 20000});
    assert.deepEqual(errorsA, [], 'browser A errors');
    assert.deepEqual(errorsB, [], 'browser B errors');
    console.log(`PASS two devices: offline B and online C both show for ${seeded.login}`);
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
