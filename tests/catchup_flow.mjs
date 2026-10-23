/* The catch-up job, end to end in a real browser:
 *   D  done letters come from saved progress, in every game; wrong taps never count;
 *      reload, sign out and in, other games; guests stay visit-only; no leaks between
 *      accounts; a progress reset clears them (local backend only until the live
 *      project has the reset function).
 *   B  a real correct answer gives one settle; it never replays (paging, replaying).
 *   C2 grown-ups get the corner from their picture, straight in; children never do,
 *      and the server refuses a child who tries.
 *   C3/C4 the match step opens silently; a miss plays only the tapped word, a pause and
 *      one try-again clip; a new tap cuts it off.
 *   C6 the picture button is 50px (60px in Ribbon Road) and lines up with the sound button.
 *   C7 the picture menu closes on a screen change, a tap outside and Escape.
 * Run: CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/catchup_flow.mjs
 *      LW_BACKEND=live ... uses demo-grownup to make two disposable children, and
 *      deletes them (by id) at the end. */
import assert from 'node:assert/strict';
import {playwright, launchOptions, serveGame, backend, context, signInChild, waitSynced, screen, showLetter} from './accounts/harness.mjs';

const be = await backend(), web = await serveGame(), browser = await playwright().chromium.launch(launchOptions());
const live = be.mode === 'live', made = [];
let passed = 0;
const ok = label => { passed++; console.log(`PASS ${label}`); };
const GAMES = [['post', 'v1-letter-post'], ['space', 'v3-moonboat'], ['silk', 'v4-ribbon-road']];
const done = page => page.locator('.letter-list .is-done').evaluateAll(n => n.map(b => b.dataset.letter).sort().join(''));
async function open(page, slug) { await page.goto(`${web.url}/${slug}/index.html`); await screen(page, 'home'); }
async function toMatch(page, letter) {
  await showLetter(page, letter);
  await page.locator(`.letter-list [data-letter="${letter}"]`).click(); await screen(page, 'listen');
  await page.locator('[data-action="match"]').click(); await screen(page, 'match');
}
async function rawRpc(fn, args, token) {
  const r = await fetch(`${be.url}/rest/v1/rpc/${fn}`, {method: 'POST', headers: {apikey: be.key, 'content-type': 'application/json', authorization: `Bearer ${token}`}, body: JSON.stringify(args || {})});
  return {status: r.status, body: await r.text()};
}
// Every clip the page starts, with the time it starts, plays and ends.
const listenToClips = ctx => ctx.addInitScript(() => {
  const log = window.__clips = [];
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    const src = (this.currentSrc || this.src || '').split('/').pop();
    log.push({kind: 'play', src, t: performance.now()});
    this.addEventListener('ended', () => log.push({kind: 'ended', src, t: performance.now()}), {once: true});
    return play.call(this);
  };
});
const clips = (page, from = 0) => page.evaluate(n => window.__clips.slice(n).filter(c => c.kind === 'play').map(c => c.src), from);

try {
  let grownup, kids;
  if (live) {
    const suffix = Date.now().toString(36);
    const token = await be.token('demo-grownup', '7234ab');
    grownup = {login: 'demo-grownup', password: '7234ab', token};
    kids = [];
    for (const [i, name] of [`Catchup Ann ${suffix}`, `Catchup Bo ${suffix}`].entries()) {
      const password = `7234c${i}`;
      const kid = await be.rpc('lw_add_child', {p_name: name, p_avatar: `cat:${i}`, p_password: password}, token);
      made.push(kid.id); kids.push({...kid, password});
    }
    console.log(`(live) disposable children: ${kids.map(k => `${k.login} ${k.id}`).join(', ')}`);
  } else {
    const room = await be.family({children: ['Mia', 'Leo']});
    grownup = room.grownup; kids = room.kids;
  }
  const [mia, leo] = kids;

  // ---------- Mia: a miss doesn't count; a correct answer does, everywhere ----------
  const A = await context(browser, be, {reducedMotion: 'no-preference'});
  await listenToClips(A);
  const a = await A.newPage();
  await signInChild(a, web.url, mia.login, mia.password);
  await open(a, 'v1-letter-post');
  await showLetter(a, 'B');
  await a.locator('.letter-list [data-letter="B"]').click(); await screen(a, 'listen');
  await a.waitForFunction(() => window.__clips.some(c => c.kind === 'ended' && /b-sound/.test(c.src)), null, {timeout: 15000});
  assert.deepEqual(await clips(a, 0).then(list => list.filter(c => !/cheer|nudge/.test(c))), ['b-name-trim.mp3', 'b-sound-trim.mp3'], 'The letter page says the letter and its sound');
  await a.locator('[data-action="match"]').click(); await screen(a, 'match');
  const atMatch = await a.evaluate(() => window.__clips.length);
  await a.waitForTimeout(700);
  assert.deepEqual(await clips(a, atMatch), [], '"Find the picture" opens silently');
  ok('C3: the letter page speaks once; "find the picture" is silent');

  // A wrong picture: its word, a short pause, one try-again clip. Nothing else, no hint.
  const wrong = a.locator('.choice:not([data-answer="B"])');
  const before = await a.evaluate(() => window.__clips.length);
  await wrong.first().click();
  await a.waitForFunction(n => window.__clips.slice(n).some(c => c.kind === 'ended' && /nudge/.test(c.src)), before, {timeout: 15000});
  const seq = await a.evaluate(n => window.__clips.slice(n), before);
  const word = await wrong.first().getAttribute('aria-label');
  assert.deepEqual(seq.filter(c => c.kind === 'play').map(c => c.src), [await a.evaluate(w => window.GAME_AUDIO.words[w].split('/').pop(), word), 'lucy-nudge-1.mp3']);
  const gap = seq.find(c => c.kind === 'play' && /nudge/.test(c.src)).t - seq.find(c => c.kind === 'ended').t;
  assert(gap >= 140 && gap <= 400, `pause before the try-again clip: ${Math.round(gap)}ms`);
  assert.equal(await a.locator('.hint,.hint-tag').count(), 0);
  assert.equal(await a.locator('.feedback').textContent(), `That’s ${word}. Try another picture.`);
  // A new tap cuts off the try-again: tap the second wrong picture, then the letter, quickly.
  const cut = await a.evaluate(() => window.__clips.length);
  await wrong.nth(1).click();
  await a.waitForTimeout(150);
  await a.locator('.match .listen-letter').click();
  await a.waitForTimeout(2500);
  const after = await clips(a, cut);
  assert(!after.includes('lucy-nudge-1.mp3'), `the letter tap cut off the try-again: ${after}`);
  assert.deepEqual(after.slice(-2), ['b-name-trim.mp3', 'b-sound-trim.mp3'], 'the letter tap plays the letter');
  ok(`C4/C5: a miss plays only the tapped word, ${Math.round(gap)}ms, then "Not quite!"; no hint; a new tap cuts it off`);

  await a.locator('.back').click(); await screen(a, 'listen');
  await a.locator('.back[data-action="home"]').click(); await screen(a, 'home');
  assert.equal(await done(a), '', 'Wrong taps never make a letter done');

  await toMatch(a, 'B');
  await a.locator('[data-answer="B"]').click(); await screen(a, 'celebrate');
  await a.locator('.secondary[data-action="home"]').click(); await screen(a, 'home');
  assert.equal(await done(a), 'B');
  const card = a.locator('.letter-list [data-letter="B"]');
  assert.equal(await card.locator('.pick-caption').textContent(), 'Done');
  assert.equal(await card.getAttribute('aria-label'), 'Play letter B, done');
  assert(await card.evaluate(b => b.classList.contains('settle') && getComputedStyle(b.querySelector('.done-badge')).animationName === 'done-settle'), 'The new badge settles');
  const settleMs = await card.evaluate(b => parseFloat(getComputedStyle(b.querySelector('.done-badge')).animationDuration) * 1000);
  assert(settleMs >= 180 && settleMs <= 260, `settle ${settleMs}ms`);
  await a.waitForTimeout(500);
  assert.equal(await a.locator('.settle').count(), 0, 'Settles once');
  // Not again on paging, replaying the letter, or opening the collection.
  if (await a.locator('.page-arrow[data-page="1"]').isEnabled()) {
    await a.locator('.page-arrow[data-page="1"]').click(); await a.locator('.page-arrow[data-page="-1"]').click();
  }
  await a.locator('.collection-summary').click(); await a.keyboard.press('Escape');
  assert.equal(await a.evaluate(() => document.getAnimations().filter(x => x.animationName === 'done-settle').length), 0, 'No settle on paging or the collection');
  await toMatch(a, 'B'); await a.locator('[data-answer="B"]').click(); await screen(a, 'celebrate');
  await a.locator('.secondary[data-action="home"]').click(); await screen(a, 'home');
  assert.equal(await a.locator('.settle').count(), 0, 'No settle when a finished letter is played again');
  ok('B: a real correct answer gives the badge, "Done" and one 220ms settle; a miss gives nothing; no replays');

  await waitSynced(a);
  await a.reload(); await screen(a, 'home');
  assert.equal(await done(a), 'B'); assert.equal(await a.locator('.settle').count(), 0, 'Saved letters don\'t animate');
  for (const [, slug] of GAMES.slice(1)) {
    await open(a, slug);
    assert.equal(await done(a), 'B', `${slug}: B saved in Letter Post shows done`);
    assert.match(await a.locator('.collection-heading').first().textContent(), /1 of 26 · yours to keep/);
    assert.equal(await a.locator('text=/this visit/').count(), 0, `${slug}: no visit-only wording when signed in`);
  }
  // Mia plays D in Ribbon Road: it shows in Letter Post and Moonboat too.
  await open(a, 'v4-ribbon-road');
  await toMatch(a, 'D'); await a.locator('[data-answer="D"]').click(); await screen(a, 'celebrate');
  await waitSynced(a);
  for (const [, slug] of GAMES) { await open(a, slug); assert.equal(await done(a), 'BD', `${slug}: done letters from every game`); }
  // Sign out and back in.
  await a.locator('#lw-done').click();
  await signInChild(a, web.url, mia.login, mia.password);
  await open(a, 'v3-moonboat');
  assert.equal(await done(a), 'BD');
  ok('D: done letters load from saved progress after a reload, a new sign-in and in every game');

  // ---------- Leo on the same device sees only his own ----------
  await a.locator('#lw-done').click();
  await signInChild(a, web.url, leo.login, leo.password);
  for (const [, slug] of GAMES) { await open(a, slug); assert.equal(await done(a), '', `${slug}: nothing of Mia's leaks to Leo`); }
  ok('D: switching accounts shows only that account\'s progress');

  // ---------- A guest: this visit only, and no account touched ----------
  const G = await context(browser, be);
  const g = await G.newPage();
  await g.goto(web.url + '/index.html');
  await g.waitForFunction(() => document.querySelector('#login')?.open, null, {timeout: 20000});
  await g.locator('#play-unsaved').click();
  await open(g, 'v1-letter-post');
  await toMatch(g, 'C'); await g.locator('[data-answer="C"]').click(); await screen(g, 'celebrate');
  assert.match(await g.locator('.collection-heading').textContent(), /1 of 26 · this visit/);
  await g.locator('.secondary[data-action="home"]').click(); await screen(g, 'home');
  assert.equal(await done(g), 'C');
  assert.match(await g.locator('.collection-summary').textContent(), /this visit: 1 of 26/);
  await g.reload(); await screen(g, 'home');
  assert.equal(await done(g), '', 'A guest\'s letters last for the visit only');
  const miaNow = await be.rpc('lw_child_state', {p_child: mia.id}, grownup.token);
  assert.deepEqual(Object.keys(miaNow.agg.post || {}).sort(), ['B'], 'The guest added nothing to anyone');
  await G.close();
  ok('D: a guest is visit-only, with visit wording, and never touches an account');

  // ---------- A reset clears the badges in every game (next sync) ----------
  if (!live) {
    await a.locator('#lw-done').click();
    await signInChild(a, web.url, mia.login, mia.password);
    await open(a, 'v1-letter-post');
    assert.equal(await done(a), 'BD');
    const reset = await be.rpc('lw_reset_children_progress', {p_children: [mia.id], p_my_password: grownup.password}, grownup.token);
    assert.equal(reset.ok, true);
    await a.evaluate(() => window.LW.sync(window.LW.playerId()));
    await a.waitForFunction(() => !document.querySelector('.letter-list .is-done'), null, {timeout: 15000});
    for (const [, slug] of GAMES) { await open(a, slug); assert.equal(await done(a), '', `${slug}: reset clears the badges`); }
    ok('D: a progress reset clears done letters in all three games on the next sync, without a reload');
  } else console.log('SKIP reset: the live project doesn\'t have lw_reset_children_progress yet (risky-actions migration not applied)');
  await A.close();

  // ---------- The picture button and its menu ----------
  const K = await context(browser, be);
  const k = await K.newPage();
  await signInChild(k, web.url, leo.login, leo.password);
  for (const [, slug] of GAMES) {
    await open(k, slug);
    for (const theme of ['0', '1', '2']) {
      await k.selectOption('#theme', theme);
      const box = await k.evaluate(() => {
        const r = s => document.querySelector(s).getBoundingClientRect();
        const b = r('#lw-profile'), m = r('#mute'), p = r('#lw-profile .lw-avatar');
        return {w: b.width, h: b.height, pic: p.width, mid: b.top + b.height / 2, muteMid: m.top + m.height / 2, muteH: m.height};
      });
      const want = slug === 'v4-ribbon-road' ? 60 : 50;
      assert(Math.abs(box.w - want) < 1 && Math.abs(box.h - want) < 1, `${slug} theme ${theme}: picture button ${box.w}×${box.h}`);
      assert(box.pic >= want * .83, `${slug}: picture ${box.pic}px`); // 42px in 50px, 50px in 60px
      assert(Math.abs(box.mid - box.muteMid) < 1 && Math.abs(box.h - box.muteH) < 1, `${slug} theme ${theme}: lined up with the sound button`);
    }
    await k.locator('#lw-profile').click();
    assert(await k.locator('#lw-menu').isVisible());
    assert.equal(await k.locator('#lw-menu [data-corner]').count(), 0, `${slug}: no corner link for a child`);
    assert.equal(await k.locator('#lw-menu a').count(), 1);
  }
  ok('C6: the picture button is 50px (60px in Ribbon Road) with a 42px+ picture, lined up with the sound button, in every game and theme');

  // The menu closes on a screen change, a tap outside, Escape.
  await open(k, 'v1-letter-post');
  await k.locator('#lw-profile').click();
  await k.evaluate(() => document.querySelector('.letter-list [data-letter="A"]').click()); // a screen change with no tap outside
  await screen(k, 'listen');
  assert(await k.locator('#lw-menu').isHidden(), 'Closes when a letter opens');
  await k.locator('#lw-profile').click();
  await k.evaluate(() => document.querySelector('[data-action="match"]').click()); await screen(k, 'match');
  assert(await k.locator('#lw-menu').isHidden(), 'Closes on "find the picture"');
  await k.locator('#lw-profile').click();
  await k.mouse.click(10, 300);
  assert(await k.locator('#lw-menu').isHidden(), 'Closes on a tap outside');
  await k.locator('#lw-profile').click(); await k.keyboard.press('Escape');
  assert(await k.locator('#lw-menu').isHidden(), 'Closes on Escape');
  assert.equal(await k.evaluate(() => document.body.dataset.screen), 'match', 'Escape on the menu only closes the menu');
  await k.locator('#lw-profile').click();
  await k.evaluate(() => document.querySelector('.brand').click()); await screen(k, 'home');
  assert(await k.locator('#lw-menu').isHidden(), 'Closes on Home');
  ok('C7: the picture menu closes on any screen change, a tap outside and Escape');

  // A child can't get into the corner another way either.
  const kidToken = await be.token(leo.login, leo.password);
  const refused = await rawRpc('lw_portal', {}, kidToken);
  assert.notEqual(refused.status, 200, `the server lets a child into the portal: ${refused.body}`);
  await k.goto(web.url + '/grown-ups/index.html');
  await k.waitForFunction(() => document.querySelector('#signin')?.open, null, {timeout: 20000});
  assert(await k.locator('#portal').isHidden(), 'A child at the corner page sees the grown-up sign-in, not the portal');
  await K.close();
  ok('C2: no portal link for a child; the server and the corner page both refuse a child');

  // A grown-up playing goes straight into the corner, then to My account.
  const P = await context(browser, be);
  const p = await P.newPage();
  await signInChild(p, web.url, grownup.login, grownup.password);
  for (const [, slug] of GAMES) {
    await open(p, slug);
    await p.locator('#lw-profile').click();
    assert.deepEqual(await p.locator('#lw-menu a').evaluateAll(n => n.map(a => a.firstChild.textContent)), ['Grown-ups\' corner', 'My account', 'I\'m done']);
  }
  await p.locator('#lw-menu a:has-text("Grown-ups\' corner")').click();
  await p.waitForURL(/grown-ups\/index\.html$/);
  await p.waitForFunction(() => !document.querySelector('#portal').hidden, null, {timeout: 20000});
  assert.equal(await p.evaluate(() => document.querySelector('#gate').open || document.querySelector('#signin').open), false, 'No gate, no sign-in');
  assert(await p.locator('#children').isVisible());
  await p.locator('#leave').click(); await p.waitForURL(/\/index\.html$/);
  await open(p, 'v3-moonboat');
  await p.locator('#lw-profile').click();
  await p.locator('#lw-menu a:has-text("My account")').click();
  await p.waitForFunction(() => !document.querySelector('#portal').hidden, null, {timeout: 20000}).catch(() => {});
  const dbg = await p.evaluate(() => ({url: location.href, portal: !document.querySelector('#portal').hidden, gate: document.querySelector('#gate').open, signin: document.querySelector('#signin').open, active: document.activeElement?.id || document.activeElement?.tagName}));
  assert(dbg.portal && !dbg.gate && !dbg.signin && dbg.active === 'you-title', JSON.stringify(dbg));
  await P.close();
  ok('C2: a grown-up playing opens the corner (Children) and My account in one tap, with no gate');
} finally {
  if (live && made.length) {
    const token = await be.token('demo-grownup', '7234ab');
    for (const id of made) { const r = await rawRpc('lw_delete_child', {p_child: id}, token); console.log(`(live) deleted disposable child ${id}: ${r.status}`); }
  }
  await browser.close(); await web.close(); await be.close();
}
console.log(`\n${passed} catch-up checks passed (${be.mode} backend)`);
