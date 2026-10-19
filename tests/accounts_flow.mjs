/* Accounts end to end in a real browser: a grown-up makes an account, a class
 * and children in the grown-ups' corner and picks their settings; a child signs
 * in from the class board on another device, plays, earns a sticker and hands
 * over; the gate guards a grown-up who stays signed in. No screenshots.
 * Run: CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/accounts_flow.mjs */
import assert from 'node:assert/strict';
import {playwright, launchOptions, serveGame, backend, context, playRound, boardSignIn, waitSynced, fits, screen} from './accounts/harness.mjs';

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const be = await backend(), web = await serveGame(), browser = await playwright().chromium.launch(launchOptions());
const suffix = Date.now().toString(36);
let passed = 0;
const ok = label => {passed++; console.log(`PASS ${label}`);};
const sizes = [{name: 'phone', width: 390, height: 844}, {name: 'chromebook', width: 1366, height: 768}, {name: 'whiteboard', width: 1920, height: 1080}];

try {
  // ---- A teacher on her laptop.
  const teacher = await context(browser, be);
  const t = await teacher.newPage();
  await t.goto(web.url + '/index.html');
  await t.locator('footer a.grown').click();
  await t.waitForFunction(() => document.body.dataset.view === 'signin');
  assert(await t.locator('#settings').isHidden() && await t.locator('#gate').isHidden());
  await fits(t, 'corner sign-in');
  await t.locator('.segments label:has(input[value="new"])').click();
  await t.locator('#signin-display').fill('Ms Lee');
  await t.locator('#signin-login').fill(`lee-${suffix}`);
  await t.locator('#signin-password').fill('12345');
  await t.locator('#signin-go').click();
  assert.match(await t.locator('#signin-status').textContent(), /six characters/);
  await t.locator('#signin-password').fill('lucy12');
  await t.locator('#signin-go').click();
  await t.waitForFunction(() => document.body.dataset.view === 'settings', null, {timeout: 20000});
  assert.match(await t.locator('#hello').textContent(), new RegExp(`lee-${suffix}`));
  assert(await t.locator('#groups-empty').isVisible());
  ok('corner: new grown-up account with a six-character password and nothing else');

  await t.locator('#new-group').click();
  await t.locator('#form-fields input[name="name"]').fill('Sunflower Class');
  await t.locator('#form-go').click();
  await t.waitForSelector('.group-card h3:text("Sunflower Class")');
  for (const [name, pw] of [['Mia', '7234mk'], ['Leo', '7234lb']]) {
    await t.locator('.group-card [data-act="add"]').click();
    await t.locator('#form-fields input[name="name"]').fill(name);
    await t.locator('#form-fields input[name="password"]').fill(pw.slice(0, 4));
    await t.locator('#form-go').click();
    assert.match(await t.locator('#form-error').textContent(), /six characters/);
    await t.locator('#form-fields input[name="password"]').fill(pw);
    await t.locator('#form-go').click();
    await t.waitForFunction(n => document.querySelector('#groups-status').textContent.startsWith(n + ' is ready'), name);
  }
  const logins = await t.locator('.kid .login').allTextContents();
  assert.equal(logins.length, 2); assert.match(logins[0], /^leo-[a-z0-9]{3}$/); assert.match(logins[1], /^mia-[a-z0-9]{3}$/);
  const board = (await t.locator('.codes dd').first().textContent()).trim();
  assert.match(board, /^[A-Z0-9]{6}$/);
  ok('corner: class with two children, readable sign-in names and a board code');

  // Settings for the whole class: starter letters and calm motion.
  assert.equal(await t.locator('#target').inputValue(), `group:${await t.locator('.group-card').getAttribute('data-group')}`);
  await t.locator('[data-preset="starter"]').click();
  await t.locator('label.row:has([data-setting="calm"])').click();
  await t.waitForFunction(() => /Saved for all 2 children/.test(document.querySelector('#save-status').textContent));
  await waitSynced(t, await t.evaluate(() => window.LW.grownupId()));
  const {token: leeToken} = {token: await be.token(`lee-${suffix}`, 'lucy12')};
  const [g] = await be.rpc('lw_groups', {}, leeToken);
  const states = await be.rpc('lw_group_states', {p_group: g.id}, leeToken);
  for (const s of Object.values(states)) {
    assert.deepEqual(s.settings.letters.v, [...'SATPIN'].sort((a, b) => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(a) - 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(b)));
    assert.equal(s.settings.calm.v, true);
  }
  // One child only: Leo's hints after one miss.
  await t.locator('.kid:has-text("Leo") [data-act="settings"]').click();
  assert.match(await t.locator('#target-note').textContent(), /Leo only/);
  await t.locator('.segments label:has(input[value="1"])').click();
  await waitSynced(t, await t.evaluate(() => window.LW.grownupId()));
  const leo = g.members.find(m => m.name === 'Leo'), mia = g.members.find(m => m.name === 'Mia');
  assert.equal((await be.rpc('lw_child_state', {p_child: leo.id}, leeToken)).settings.hintAfter.v, 1);
  assert.equal((await be.rpc('lw_child_state', {p_child: mia.id}, leeToken)).settings.hintAfter, undefined);
  for (const size of sizes) { await t.setViewportSize(size); await fits(t, `corner settings ${size.name}`, size.width >= 1600 ? 72 : 60); }
  await t.setViewportSize({width: 1366, height: 768});
  ok('corner: settings for a whole class and for one child reach the server');

  // ---- A shared classroom Chromebook: nobody has played here yet.
  const cb = await context(browser, be);
  const c = await cb.newPage();
  await c.goto(web.url + '/index.html');
  assert(await c.locator('#who').isVisible());
  assert(await c.locator('nav').isHidden(), 'Worlds wait until someone is playing');
  assert(await c.locator('#who-empty').isVisible());
  for (const size of sizes) { await c.setViewportSize(size); await fits(c, `who's playing ${size.name}`); }
  await c.locator('#open-board').click();
  await c.locator('#code-input').fill('ZZZZZZ');
  await c.locator('#code-form .go').click();
  await c.waitForFunction(() => /No group has that code/.test(document.querySelector('#code-error').textContent));
  await c.locator('#code-input').fill(board.toLowerCase());
  await c.locator('#code-form .go').click();
  await c.waitForFunction(() => !document.querySelector('#board').hidden);
  assert.deepEqual(await c.locator('#board-people .person .name').allTextContents(), ['Leo', 'Mia']);
  await fits(c, 'class board');
  await c.locator('#board-people .person[data-name="Mia"]').click();
  assert(await c.locator('#pw-go').isDisabled());
  await c.locator('#pw-input').fill('7234mx');
  await c.locator('#pw-go').click();
  await c.waitForFunction(() => /doesn't match/.test(document.querySelector('#pw-error').textContent));
  await c.locator('#pw-input').fill('7234mk');
  await c.locator('#pw-go').click();
  await c.waitForFunction(() => !document.querySelector('#playing').hidden);
  assert.equal(await c.locator('#playing-name').textContent(), 'Mia');
  assert(await c.locator('nav').isVisible());
  assert.deepEqual(await c.evaluate(() => window.GROWN_UPS.settings.letters), ['A', 'I', 'N', 'P', 'S', 'T']);
  assert.equal(await c.evaluate(() => document.documentElement.hasAttribute('data-calm')), true);
  await fits(c, 'playing strip');
  ok('chromebook: class board by code, wrong password refused, Mia signs in with her class settings');

  // Mia plays in Letter Post: only the class's letters, and the round is kept.
  await c.locator('nav a[data-world="post"]').click();
  await screen(c, 'home');
  assert.deepEqual(await c.locator('.letter-list [data-letter]').evaluateAll(n => n.map(x => x.dataset.letter)), ['A', 'I', 'N', 'P', 'S', 'T']);
  assert.match(await c.locator('.collection-heading').textContent(), /0 of 6 · yours to keep/);
  assert.match(await c.locator('#footer .lw-player').textContent(), /Mia/);
  await playRound(c, 'S');
  await c.waitForSelector('.lw-toast:has-text("First sound")');
  await playRound(c, 'A', 2);
  assert.match(await c.locator('.collection-heading').textContent(), /2 of 6 · yours to keep/);
  await c.selectOption('#theme', '1');
  await waitSynced(c);
  let state = await be.rpc('lw_child_state', {p_child: mia.id}, leeToken);
  assert.deepEqual([state.agg.post.S.n, state.agg.post.A.n, state.agg.post.A.clean], [1, 1, 0]);
  assert(state.badges['first-sound']); assert.equal(state.settings.theme_post.v, 1);
  ok('chromebook: rounds, a sticker and a color choice are saved to Mia\'s account');

  // "I'm done" hands the Chromebook to the next child.
  await c.locator('#lw-done').click();
  await c.waitForFunction(() => !document.querySelector('#who').hidden);
  assert.deepEqual(await c.locator('#people .person .name').allTextContents(), ['Mia']);
  await c.locator('#people .person[data-name="Mia"]').click();
  await c.locator('#pw-input').fill('7234mk');
  await c.locator('#pw-go').click();
  await c.waitForFunction(() => !document.querySelector('#playing').hidden);
  assert.equal(await c.locator('#stickers .lw-sticker').count(), 1);
  await c.locator('#sticker-button').click();
  assert.equal(await c.locator('#book li.earned').count(), 1);
  await c.locator('#book-dialog .go').click();
  await c.locator('#done').click();
  await c.waitForFunction(() => !document.querySelector('#who').hidden);
  // A new tab on the same Chromebook starts with "Who's playing?", not the last child.
  const c2 = await cb.newPage();
  await c2.goto(web.url + '/v1-letter-post/index.html');
  await screen(c2, 'home');
  assert.equal(await c2.locator('#footer .lw-player').count(), 0);
  assert.match(await c2.locator('.collection-heading').textContent(), /this visit/);
  await c2.close();
  ok('chromebook: I\'m done returns to the pictures; a new tab never continues as the last child');

  // Play without saving still works and keeps nothing.
  await c.locator('#just-play').click();
  assert(await c.locator('#guest-bar').isVisible());
  assert.equal(await c.locator('nav a:not([hidden])').count(), 3);
  await c.locator('#guest-who').click();
  ok('chromebook: play without saving keeps the old one-visit game');

  // ---- Back on the laptop: progress shows in the corner.
  await t.reload();
  await t.waitForFunction(() => document.body.dataset.view === 'settings', null, {timeout: 20000});
  await t.waitForFunction(() => /1 round · 1 letter|2 rounds · 2 letters/.test(document.querySelector('.group-card').textContent), null, {timeout: 20000});
  await t.locator('.kid:has-text("Mia") [data-act="settings"]').click();
  await t.waitForFunction(() => /2 rounds, 2 letters of 26/.test(document.querySelector('#progress-body').textContent));
  assert.equal(await t.locator('#progress-body .sticker-shelf li.earned').count(), 1);
  ok('corner: Mia\'s rounds, letters and sticker show for the teacher');

  // Grown-up who stays signed in: the number-word gate guards re-entry.
  await t.locator('#signout').click();
  await t.waitForFunction(() => document.body.dataset.view === 'signin');
  await t.locator('#signin-login').fill(`lee-${suffix}`);
  await t.locator('#signin-password').fill('lucy12');
  await t.locator('label.row.keep').click();
  await t.locator('#signin-go').click();
  await t.waitForFunction(() => document.body.dataset.view === 'settings', null, {timeout: 20000});
  assert.equal(await t.locator('#leave .fill-label').first().textContent(), 'Lock and go to games');
  await t.locator('#leave').click();
  await t.waitForURL(/\/index\.html$/);
  await t.locator('footer a.grown').click();
  await t.waitForFunction(() => document.body.dataset.view === 'gate');
  const digits = (await t.locator('#challenge span').allTextContents()).map(w => WORDS.indexOf(w));
  for (const d of digits) await t.locator(`[data-digit="${d}"]`).click();
  await t.waitForFunction(() => document.body.dataset.view === 'settings');
  ok('corner: staying signed in brings back the reading gate as a re-entry check');

  // Linking at home: a parent adds Mia with her sign-in name and password.
  const home = await context(browser, be);
  const h = await home.newPage();
  await h.goto(web.url + '/grown-ups/index.html');
  await h.locator('.segments label:has(input[value="new"])').click();
  await h.locator('#signin-login').fill(`dad-${suffix}`);
  await h.locator('#signin-password').fill('home12');
  await h.locator('#signin-go').click();
  await h.waitForFunction(() => document.body.dataset.view === 'settings', null, {timeout: 20000});
  await h.locator('#new-group').click();
  await h.locator('#form-fields input[name="name"]').fill('Home');
  await h.locator('#form-go').click();
  await h.waitForSelector('.group-card h3:text("Home")');
  await h.locator('.group-card [data-act="link"]').click();
  await h.locator('#form-fields input[name="login"]').fill(logins[1]);
  await h.locator('#form-fields input[name="password"]').fill('7234mk');
  await h.locator('#form-go').click();
  await h.waitForFunction(() => /Mia is now in Home/.test(document.querySelector('#groups-status').textContent));
  await h.locator('.kid:has-text("Mia") [data-act="settings"]').click();
  await h.waitForFunction(() => /2 rounds, 2 letters of 26/.test(document.querySelector('#progress-body').textContent));
  ok('home: a parent links the school account; the same progress shows at home');

  for (const ctx of [teacher, cb, home]) assert.deepEqual(ctx.errors, [], 'browser errors');
  console.log(`\n${passed} accounts flow checks passed (${be.mode} backend)`);
} finally {
  await browser.close(); await web.close(); await be.close();
}
