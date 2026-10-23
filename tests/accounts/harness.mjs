/* Shared pieces for the accounts browser tests.
 *   LW_BACKEND=local (default): the PGlite stand-in running supabase/migrations.
 *   LW_BACKEND=live: the real Supabase project in accounts/config.js. Each run
 *   makes its own accounts with a unique suffix. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const root = path.resolve(here, '../..');
export const DOMAIN = '@accounts.little-woof.invalid';
const require = createRequire(import.meta.url);

export function playwright() {
  if (process.env.PLAYWRIGHT_MODULE) return require(process.env.PLAYWRIGHT_MODULE);
  try {return require('playwright');} catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
    return require('/usr/local/lib/pnpm/5/.pnpm/node_modules/playwright');
  }
}
export const launchOptions = () => ({headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'],
  ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath: process.env.CHROMIUM_EXECUTABLE} : {})});

const TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2'};
/** Serves the repository over http://127.0.0.1, so the service worker can run. */
export async function serveGame() {
  const hits = [];
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    let file = path.join(root, decodeURIComponent(url.pathname));
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file) || /[\\/](\.job|\.git|node_modules)[\\/]/.test(file)) { res.writeHead(404); return res.end(); }
    hits.push(url.pathname);
    res.writeHead(200, {'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache'});
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {url: `http://127.0.0.1:${server.address().port}`, hits, close: () => new Promise(r => {server.closeAllConnections?.(); server.close(r);})};
}

/** The backend the game talks to, and a small API client for setting up and checking. */
export async function backend() {
  const mode = process.env.LW_BACKEND || 'local';
  let url, key, close = async () => {}, override = null, standIn = null;
  if (mode === 'live') {
    const config = fs.readFileSync(path.join(root, 'accounts/config.js'), 'utf8');
    url = config.match(/url: '([^']+)'/)[1]; key = config.match(/key: '([^']+)'/)[1];
  } else {
    const {startStandIn} = await import('../db/supabase-stand-in.mjs');
    standIn = await startStandIn();
    ({url, key} = standIn); close = standIn.close; override = {url, key};
  }
  async function post(p, body, token) {
    const res = await fetch(url + p, {method: 'POST', headers: {apikey: key, 'content-type': 'application/json', ...(token ? {authorization: `Bearer ${token}`} : {})}, body: JSON.stringify(body || {})});
    const text = await res.text();
    return {status: res.status, body: text ? JSON.parse(text) : null};
  }
  const api = {
    mode, url, key, override, standIn, close,
    async rpc(fn, args, token) {
      const r = await post(`/rest/v1/rpc/${fn}`, args, token);
      assert.equal(r.status, 200, `${fn}: ${JSON.stringify(r.body)}`);
      return r.body;
    },
    async token(login, password) {
      const r = await post('/auth/v1/token?grant_type=password', {email: login + DOMAIN, password});
      assert.equal(r.status, 200, `sign in ${login}: ${JSON.stringify(r.body)}`);
      return r.body.access_token;
    },
    // A grown-up account. There is no public sign-up: locally the project owner's
    // SQL function makes it; live, the demo grown-up adds it from their corner.
    async makeGrownup(login, password, name) {
      if (standIn) {
        const {rows: [{p}]} = await standIn.db.query('select lw_private.make_grownup($1, $2, $3) as p', [login, password, name]);
        return p;
      }
      // The new grown-up joins the demo grown-up's children; take them off again so
      // each test grown-up starts with an empty corner of their own.
      const adminPassword = process.env.LW_ADMIN_PASSWORD || '7234ab';
      const admin = await api.token(process.env.LW_ADMIN_LOGIN || 'demo-grownup', adminPassword);
      const {ok, ...made} = await api.rpc('lw_create_grownup', {p_login: login, p_password: password, p_name: name, p_my_password: adminPassword}, admin);
      assert.equal(ok, true);
      await api.rpc('lw_remove_grownups', {p_grownups: [made.id], p_my_password: adminPassword}, admin);
      return made;
    },
    // A grown-up with children, all made through the public API.
    async family({suffix = Date.now().toString(36), children = ['Mia', 'Leo']} = {}) {
      const login = `grownup-${suffix}`, password = 'lucy-1234';
      await api.makeGrownup(login, password, 'Sam Lee');
      const token = await api.token(login, password);
      const kids = [];
      for (const [i, name] of children.entries()) {
        const pw = `7234${name.slice(0, 2).toLowerCase()}`;
        kids.push({...await api.rpc('lw_add_child', {p_name: name, p_avatar: `${['cat', 'fox', 'sun'][i % 3]}:${i}`, p_password: pw}, token), password: pw});
      }
      return {grownup: {login, password, token}, kids};
    }
  };
  return api;
}

/** A browser context pointed at the backend, recording page errors. */
export async function context(browser, be, options = {}) {
  const ctx = options.persistent || await browser.newContext({viewport: {width: 1366, height: 768}, reducedMotion: 'reduce', ...options});
  if (be.override) await ctx.addInitScript(o => { window.LW_CONFIG_OVERRIDE = o; }, be.override);
  ctx.errors = [];
  ctx.on('page', p => watch(p, ctx.errors));
  for (const p of ctx.pages()) watch(p, ctx.errors);
  return ctx;
}
function watch(page, errors) {
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_INTERNET_DISCONNECTED|net::ERR/.test(m.text())) errors.push(m.text()); });
}

export const screen = (page, name) => page.waitForFunction(n => document.body.dataset.screen === n, name, {timeout: 20000});
const idle = page => page.waitForFunction(() => [...document.querySelectorAll('.choice')].every(n => !n.hasAttribute('aria-disabled')), null, {timeout: 20000});
/** Turns the pages of letters (Letter Post and Moonboat on bigger screens) to `letter`. */
export async function showLetter(page, letter) {
  for (let i = 0; i < 30 && await page.locator(`.letter-list [data-letter="${letter}"]`).isHidden(); i++) {
    const on = await page.locator('.letter-list [data-letter]:not([hidden])').first().getAttribute('data-letter');
    await page.locator(`.page-arrow[data-page="${letter < on ? -1 : 1}"]`).click();
  }
}
/** Plays one round of the current world through its real buttons. */
export async function playRound(page, letter, misses = 0) {
  await showLetter(page, letter);
  await page.locator(`.letter-list [data-letter="${letter}"]`).click();
  await screen(page, 'listen');
  await page.locator('[data-action="match"]').click();
  await screen(page, 'match');
  await idle(page);
  for (let i = 0; i < misses; i++) {
    await page.locator(`.choice:not([data-answer="${letter}"]):not(.tried)`).first().click();
    await idle(page);
  }
  await page.locator(`[data-answer="${letter}"]`).click();
  await screen(page, 'celebrate');
  await page.locator('.secondary[data-action="home"]').click();
  await screen(page, 'home');
}
/** Waits for the chooser's sign-in dialog (after the splash, on a first visit). */
export const loginOpen = page => page.waitForFunction(() => document.querySelector('#login')?.open, null, {timeout: 20000});
/** Signs someone in from the chooser's dialog with their sign-in name and password. */
export async function signInChild(page, base, login, password, {keep = false} = {}) {
  await page.goto(base + '/index.html');
  await loginOpen(page);
  await page.locator('#login-name').fill(login);
  await page.locator('#login-pw').fill(password);
  if (keep) await page.locator('#login-keep').check();
  await page.locator('#login-go').click();
  await page.waitForFunction(() => document.body.dataset.home === 'picker' && !document.querySelector('#playing').hidden, null, {timeout: 20000});
}
export const waitSynced = (page, id, timeout = 30000) => page.waitForFunction(i => {
  const s = window.LW.status(i || window.LW.playerId());
  return s.online && !s.waiting && !s.syncing && s.syncedAt;
}, id || null, {timeout});
export async function fits(page, label, minimum = 60, selector = 'button,a,select,input:not([type="radio"]):not([type="checkbox"])') {
  // Measure after entrances finish (dialogs scale in), ignoring endless loops.
  await page.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity), null, {timeout: 5000}).catch(() => {});
  const failures = await page.evaluate(([minimum, selector]) => {
    const out = [];
    if (document.documentElement.scrollWidth > innerWidth + 1) {
      const wide = [...document.querySelectorAll('body *')].filter(n => n.getBoundingClientRect().right > innerWidth + 1 && !n.closest('[hidden],dialog:not([open])'))
        .filter((n, i, all) => !all.includes(n.parentElement)).slice(0, 4).map(n => `${n.tagName}.${n.className}#${n.id}:${Math.round(n.getBoundingClientRect().right)}`);
      out.push('Horizontal overflow: ' + wide.join(', '));
    }
    for (const node of document.querySelectorAll(selector)) {
      const box = node.getBoundingClientRect();
      if (!box.width || !box.height || node.closest('[hidden],dialog:not([open])') || getComputedStyle(node).visibility === 'hidden') continue;
      if (node.closest('.sr-only') || node.matches('.skip')) continue;
      const tall = node.matches('input[role="switch"]') ? 44 : minimum;
      if (box.width < 44 || box.height < tall - .5) out.push(`${node.id || node.className || node.tagName} "${node.textContent.trim().slice(0, 30)}": ${Math.round(box.width)}×${Math.round(box.height)}`);
    }
    return out;
  }, [minimum, selector]);
  assert.deepEqual(failures, [], `${label}: layout and touch targets`);
}
