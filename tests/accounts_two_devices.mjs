/* Required check: the same child on two separate browser profiles (two
 * devices). Device A goes offline after its first load, the child plays and
 * changes a color there, then A reconnects, and the first upload's reply is
 * lost on the way back so A has to retry. Device B must end up with exactly
 * the same progress, settings and stickers: nothing lost, nothing doubled.
 * Run: CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/accounts_two_devices.mjs
 *      LW_BACKEND=live ... to run it against the real Supabase project. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {playwright, launchOptions, serveGame, backend, context, playRound, boardSignIn, waitSynced, screen} from './accounts/harness.mjs';

const be = await backend(), web = await serveGame();
const dirs = ['a', 'b'].map(n => fs.mkdtempSync(path.join(os.tmpdir(), `lw-device-${n}-`)));
const pw = playwright();
let passed = 0;
const ok = label => {passed++; console.log(`PASS ${label}`);};
const total = agg => Object.values(agg).reduce((n, w) => n + Object.values(w).reduce((m, c) => m + c.n, 0), 0);
const letters = (agg, world) => Object.keys(agg[world] || {}).sort().join('');

const devices = [];
try {
  const room = await be.classroom({children: ['Mia']});
  const mia = room.kids[0];
  for (const dir of dirs) {
    const persistent = await pw.chromium.launchPersistentContext(dir, {...launchOptions(), viewport: {width: 1366, height: 768}, reducedMotion: 'reduce'});
    devices.push(await context(null, be, {persistent}));
  }
  const [A, B] = devices;
  const a = A.pages()[0] || await A.newPage(), b = B.pages()[0] || await B.newPage();

  // Both devices: first load online, Mia signs in from her class board.
  await boardSignIn(a, web.url, room.board, 'Mia', mia.password);
  await boardSignIn(b, web.url, room.board, 'Mia', mia.password);
  assert.notEqual(await a.evaluate(() => window.LW.deviceId), await b.evaluate(() => window.LW.deviceId), 'Two separate profiles');
  // Device A's offline shell is in place: the service worker stored every game file.
  const expected = await a.evaluate(async () => {
    await navigator.serviceWorker.ready;
    const text = await (await fetch('sw.js')).text();
    return (text.match(/^ {2}"[^"]+"/gm) || []).length;
  });
  await a.waitForFunction(async n => {
    const keys = await caches.keys(); if (!keys.length) return false;
    return (await (await caches.open(keys[0])).keys()).length >= n;
  }, expected, {timeout: 60000, polling: 500});
  await a.reload();
  await a.waitForFunction(() => !!navigator.serviceWorker.controller);
  ok(`both profiles signed in as Mia; device A cached all ${expected} game files`);

  // B plays one round online first.
  await b.locator('nav a[data-world="post"]').click(); await screen(b, 'home');
  await playRound(b, 'B');
  await waitSynced(b);

  // ---- Device A goes offline: no network at all, for pages and the service worker.
  await A.setOffline(true);
  await A.route(/^https?:/, route => route.abort('internetdisconnected'));
  await a.reload();
  await a.waitForFunction(() => !document.querySelector('#playing').hidden && navigator.onLine === false);
  assert.equal(await a.locator('#playing-name').textContent(), 'Mia');
  assert.match(await a.locator('#playing-sync').textContent(), /Offline/);
  await a.locator('nav a[data-world="post"]').click(); await screen(a, 'home');
  for (const [letter, misses] of [['S', 0], ['A', 2], ['T', 0], ['P', 1], ['I', 0]]) await playRound(a, letter, misses);
  await a.selectOption('#theme', '1');
  await a.goto(web.url + '/v3-moonboat/index.html'); await screen(a, 'home');
  await playRound(a, 'N');
  await a.selectOption('#theme', '2');
  await a.goto(web.url + '/index.html');
  await a.waitForFunction(() => !document.querySelector('#playing').hidden);
  const offline = await a.evaluate(() => ({status: window.LW.status(window.LW.playerId()), badges: Object.keys(window.LW.badges(window.LW.playerId()))}));
  assert.equal(offline.status.waiting, 8, '6 rounds and 2 color changes wait on device A');
  assert(offline.badges.includes('satpin') && offline.badges.includes('five-letters'), 'Stickers are earned offline');
  assert.match(await a.locator('#playing-sync').textContent(), /Saved on this device/);
  ok('device A offline: pages load from the service worker; 6 rounds, 2 color changes and new stickers wait on the device');

  // Meanwhile, online: B picks a newer Letter Post color, and the teacher changes Mia's hints.
  await b.selectOption('#theme', '2');
  await waitSynced(b);
  await be.rpc('lw_put_settings', {p_changes: [{profile: mia.id, field: 'hintAfter', v: 1, t: Date.now()}]}, room.teacher.token);

  // ---- Device A reconnects. The first upload reaches the server but its reply is lost.
  let lost = 0;
  await A.unroute(/^https?:/);
  await A.route(/\/rest\/v1\/rpc\/lw_sync$/, async route => {
    if (lost === 0 && JSON.parse(route.request().postData()).p_rounds.length) {
      lost++;
      await route.fetch(); // the server stores the rounds...
      return route.abort('connectionreset'); // ...and A never hears back.
    }
    return route.continue();
  });
  await A.setOffline(false);
  await waitSynced(a, null, 60000);
  assert.equal(lost, 1, 'One reply was lost and the upload was retried');
  await a.evaluate(() => window.LW.sync(window.LW.playerId())); // and once more, for good measure
  ok('device A back online: first reply lost, retried, everything uploaded');

  // ---- What the server holds: each round once, the newest color edits, the teacher's change, the stickers.
  const server = await be.rpc('lw_child_state', {p_child: mia.id}, room.teacher.token);
  assert.equal(total(server.agg), 7, 'Exactly 7 rounds: 1 from B and 6 from A');
  assert.equal(letters(server.agg, 'post'), 'ABIPST'); assert.equal(letters(server.agg, 'space'), 'N');
  assert.deepEqual([server.agg.post.S.n, server.agg.post.A.n, server.agg.post.A.clean, server.agg.post.P.clean], [1, 1, 0, 0]);
  assert.equal(server.settings.theme_post.v, 2, 'B chose its Letter Post color after A did, so B\'s wins');
  assert.equal(server.settings.theme_space.v, 2, 'A\'s offline Moonboat color arrives');
  assert.equal(server.settings.hintAfter.v, 1);
  for (const key of ['first-sound', 'five-letters', 'satpin']) assert(server.badges[key], `sticker ${key}`);
  ok('server: 7 rounds, none doubled; newest color per world wins; stickers kept');

  // ---- Device B catches up and shows exactly the same.
  await b.goto(web.url + '/index.html');
  await b.waitForFunction(() => !document.querySelector('#playing').hidden);
  await waitSynced(b);
  const seen = await b.evaluate(() => {
    const id = window.LW.playerId();
    return {agg: window.LW.progress(id), badges: Object.keys(window.LW.badges(id)).sort(), settings: window.GROWN_UPS.load(id), values: window.LW.values(id)};
  });
  assert.equal(total(seen.agg), 7); assert.equal(letters(seen.agg, 'post'), 'ABIPST'); assert.equal(letters(seen.agg, 'space'), 'N');
  assert.deepEqual(seen.agg, server.agg);
  assert.deepEqual(seen.badges, Object.keys(server.badges).sort());
  assert.equal(seen.settings.hintAfter, 1); assert.equal(seen.values.theme_post, 2); assert.equal(seen.values.theme_space, 2);
  assert(await b.locator('#stickers .lw-sticker').count() >= 3);
  await b.locator('nav a[data-world="post"]').click(); await screen(b, 'home');
  assert.match(await b.locator('.collection-heading').textContent(), /6 of 26 · yours to keep/);
  assert.equal(await b.evaluate(() => document.body.dataset.theme), '2');
  await b.goto(web.url + '/v3-moonboat/index.html'); await screen(b, 'home');
  assert.match(await b.locator('.collection-heading').textContent(), /1 of 26 · yours to keep/);
  assert.equal(await b.evaluate(() => document.body.dataset.theme), '2');
  ok('device B: same 7 rounds, letters, stickers, colors and hint setting as the server; nothing lost or doubled');

  // A agrees too.
  const onA = await a.evaluate(() => window.LW.progress(window.LW.playerId()));
  assert.deepEqual(onA, server.agg);
  ok('device A: shows the same as B and the server after syncing');

  for (const d of devices) assert.deepEqual(d.errors, [], 'browser errors');
  console.log(`\n${passed} two-device checks passed (${be.mode} backend)`);
} finally {
  for (const d of devices) await d.close().catch(() => {});
  for (const dir of dirs) fs.rmSync(dir, {recursive: true, force: true});
  await web.close(); await be.close();
}
