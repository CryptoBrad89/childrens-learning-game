/* No dependencies. Checks grown-up settings parsing, and that every world's real
 * renderer obeys the signed-in player's settings and records their rounds, in a
 * VM with minimal browser API stubs (as runtime_smoke.cjs). Settings belong to
 * the person (accounts/accounts.js, stubbed here as window.LW). */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const alphabet = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const settingsSource = fs.readFileSync(path.join(root, 'grown-ups/settings.js'), 'utf8');

// A stand-in for accounts/accounts.js: one person signed in, with these settings.
// `saved` is their saved correct answers by game, as the server keeps them.
function account(values, {signedIn = true, saved = {}} = {}) {
  const rounds = [], edits = [], listeners = [];
  return {rounds, edits, saved, WORLDS: ['post', 'space', 'silk'], playerId: () => signedIn ? 'child-1' : null, values: id => id === 'child-1' ? values : {},
    lettersIn: (id, world) => id === 'child-1' ? [...(saved[world] || []), ...rounds.filter(r => r.world === world).map(r => r.letter)] : [],
    on(name, fn) { if (name === 'change') listeners.push(fn); }, change() { listeners.forEach(fn => fn({})); },
    recordRound(r) { rounds.push(r); return {saved: true, newBadges: []}; },
    setSettings(actor, targets, changes) { edits.push({actor, targets, changes}); return true; }};
}
function loadSettings(LW) {
  const documentElement = {dataset: {}};
  const window = {LW};
  vm.runInContext(settingsSource, vm.createContext({window, document: {documentElement}}));
  return {api: window.GROWN_UPS, documentElement};
}

function settingsChecks() {
  const {api, documentElement} = loadSettings(undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(api.settings)), {
    voice: true, effects: true, calm: false, kidControls: true, volume: 100,
    letters: alphabet, games: ['post', 'space', 'silk']
  }, 'Defaults must leave the game exactly as before');
  assert(!('calm' in documentElement.dataset));
  const junk = api.normalize({voice: 'no', volume: 250, letters: ['z', 'Q', 'A', 'Q', 7], hintAfter: 5, games: ['moon'], calm: 1});
  assert.equal(junk.voice, true); assert.equal(junk.calm, false);
  assert.equal(junk.volume, 100); assert.equal(api.normalize({volume: -4}).volume, 0); assert.equal(api.normalize({volume: '35'}).volume, 35);
  assert.deepEqual([...junk.letters], ['A', 'Q'], 'Letters are upper case A-Z, unique and in order');
  assert(!('hintAfter' in junk) && !api.FIELDS.includes('hintAfter'), 'No hint setting');
  assert.deepEqual([...junk.games], ['post', 'space', 'silk'], 'At least one world always stays');
  assert.deepEqual([...api.normalize({letters: []}).letters], alphabet, 'At least one letter always stays');
  // A value stored before hints were removed is left alone: never read, never saved over.
  assert.equal(api.normalize({hintAfter: 1}).hintAfter, undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(api.changes({hintAfter: 1}, {...api.DEFAULTS, hintAfter: 2}))), {});

  // The signed-in player's own settings apply, before anything renders.
  const mine = loadSettings(account({calm: true, letters: ['T', 'S', 'A'], theme_post: 2}));
  assert.equal(mine.api.settings.calm, true);
  assert.deepEqual([...mine.api.settings.letters], ['A', 'S', 'T']);
  assert('calm' in mine.documentElement.dataset, 'Calm motion is visible to CSS straight away');
  // Nobody signed in: defaults, whatever this device had saved before.
  const nobody = loadSettings(account({calm: true}, {signedIn: false}));
  assert.equal(nobody.api.settings.calm, false);
  // Only changed fields are saved, so editing one field never overwrites another.
  assert.deepEqual(JSON.parse(JSON.stringify(api.changes(api.DEFAULTS, {...api.DEFAULTS, volume: 40, letters: ['S', 'A']}))), {volume: 40, letters: ['A', 'S']});
  assert.equal(Object.keys(api.changes(api.DEFAULTS, {...api.DEFAULTS})).length, 0);
  console.log('PASS grown-up settings: defaults, validation, the player\'s own settings, nobody signed in, changed fields only');
}

async function game(name, saved, done = {}) {
  const nodes = new Map(), played = [], volumes = [];
  const makeNode = () => ({
    innerHTML: '', textContent: '', value: '', dataset: {}, listeners: {},
    attributes: {}, children: alphabet.map((_, i) => ({offsetLeft: i * 60, offsetWidth: 54})),
    clientWidth: 300, scrollLeft: 0,
    classList: {values: new Set(), add(v) {this.values.add(v);}, remove(v) {this.values.delete(v);}},
    addEventListener(type, handler) {this.listeners[type] = handler;},
    setAttribute(key, value) {this.attributes[key] = value;},
    removeAttribute(key) {delete this.attributes[key];},
    getAttribute(key) {return this.attributes[key] ?? null;},
    focus() {}, contains() {return true;}, closest() {return this;},
    querySelector() {return null;}, querySelectorAll() {return [];}
  });
  const getNode = selector => {
    if (/paged|collection-sheet|collection-summary|summary-text/.test(selector)) return null;
    if (!nodes.has(selector)) nodes.set(selector, makeNode());
    return nodes.get(selector);
  };
  const document = {
    body: makeNode(), hidden: false, documentElement: {dataset: {}},
    querySelector: getNode,
    querySelectorAll(selector) {
      if (selector !== '.choice') throw new Error(`Unhandled selector: ${selector}`);
      return [...getNode('#main').innerHTML.matchAll(/data-answer="([A-Z])"/g)].map(m => getNode(`[data-answer="${m[1]}"]`));
    },
    addEventListener() {}, dispatchEvent() {}
  };
  class Audio {
    constructor(file) {
      assert(fs.existsSync(path.resolve(root, name, file)), `Missing audio: ${file}`);
      this.file = file;
    }
    set volume(value) {volumes.push(value);}
    play() {played.push(this.file); queueMicrotask(() => this.onended?.()); return Promise.resolve();}
    pause() {}
  }
  const noEffect = async () => true;
  const Fun = {cancel() {}, voice() {}, mute() {}, home: noEffect, open: noEffect, press: noEffect, replay: noEffect,
    miss: noEffect, lucy: noEffect, exit: noEffect, correct: noEffect, reward: noEffect, weather: noEffect, evidence: {reduced: false}};
  const LW = saved ? account(saved, {saved: done}) : account({}, {signedIn: false});
  const window = {Fun, scrollTo() {}, LW};
  const localStorage = {getItem() {return null;}, setItem() {}};
  const context = vm.createContext({window, document, Audio, queueMicrotask, localStorage, CustomEvent: class {},
    setTimeout(fn) {setImmediate(fn); return 1;}, clearTimeout() {},
    matchMedia: () => ({matches: false, addEventListener() {}}), ResizeObserver: class {observe() {}}});
  const html = fs.readFileSync(path.join(root, name, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
  assert(scripts.indexOf('../grown-ups/settings.js') > -1 && scripts.indexOf('../grown-ups/settings.js') < scripts.findIndex(s => s.endsWith('app.js')),
    `${name}: settings must load before the app`);
  assert(scripts.indexOf('../grown-ups/settings.js') < scripts.findIndex(s => s.endsWith('fun.js')), `${name}: settings must load before effects`);
  assert(scripts.indexOf('../accounts/accounts.js') > -1 && scripts.indexOf('../accounts/accounts.js') < scripts.indexOf('../grown-ups/settings.js'), `${name}: accounts load before settings`);
  assert(html.includes('href="../grown-ups/in-game.css"'), `${name}: missing in-game grown-up styles`);
  const script = base => path.resolve(root, name, scripts.find(file => path.basename(file) === base));
  for (const file of ['config.js', 'settings.js', 'art.js']) vm.runInContext(fs.readFileSync(script(file), 'utf8'), context);
  context.draw = window.draw; context.ico = window.ico;
  vm.runInContext(fs.readFileSync(path.join(root, 'audio-map.js'), 'utf8'), context);
  const source = fs.readFileSync(script('app.js'), 'utf8');
  vm.runInContext(source.slice(0, -6) + `
    window.testGame = {start, continueMatch, answer, replay, go,
      get choices(){return choices;}, get current(){return current;}};
  })();`, context);
  const app = window.testGame;
  const flush = () => new Promise(resolve => setImmediate(resolve));
  const main = () => getNode('#main').innerHTML;
  return {app, flush, main, getNode, played, volumes, window, makeNode, LW};
}

async function worldChecks(name) {
  const letters = ['S', 'A', 'T', 'P', 'I', 'N'], pool = ['A', 'I', 'N', 'P', 'S', 'T'];
  {
    // An old "outline after 1 miss" value is still stored for this child: it must do nothing.
    const t = await game(name, {letters, hintAfter: 1, voice: false, volume: 40, kidControls: false});
    await t.app.go('home');
    assert.deepEqual([...t.main().matchAll(/data-letter="([A-Z])"/g)].map(m => m[1]), pool, `${name}: pickers show only the chosen letters, A-Z`);
    assert(t.main().includes('0 of 6 · yours to keep'), `${name}: collection counts the chosen letters`);
    assert(!t.main().includes('undefined'), `${name}: invalid markup`);
    if (name === 'v3-moonboat') assert(t.main().includes('6 LITTLE WORLDS'));
    if (name === 'v4-ribbon-road') assert(t.main().includes('6 letters chosen for today'));
    const header = t.getNode('#header').innerHTML;
    assert(header.includes('class="controls" hidden'), `${name}: children's buttons hidden`);
    assert(header.includes('aria-pressed="true"') && header.includes('Turn sound on'), `${name}: starts muted`);
    assert(t.getNode('#footer').innerHTML.includes('6 sounds. Take your time.'));
    await t.app.start('S'); await t.flush();
    assert.equal(t.played.length, 0, `${name}: voice off means no clips`);
    await t.app.continueMatch(t.makeNode()); await t.flush();
    const wrong = t.app.choices.find(l => l.letter !== 'S'), button = t.getNode(`[data-answer="${wrong.letter}"]`);
    button.dataset.answer = wrong.letter;
    await t.app.answer(button); await t.flush();
    assert(!t.getNode('[data-answer="S"]').classList.values.has('hint') && !t.main().includes('hint'), `${name}: a stored hint setting never brings hints back`);
    const correct = t.getNode('[data-answer="S"]'); correct.dataset.answer = 'S';
    await t.app.answer(correct); await t.flush();
    assert(t.main().includes('1 of 6 · yours to keep'));
    assert.deepEqual(JSON.parse(JSON.stringify(t.LW.rounds)), [{world: {'v1-letter-post': 'post', 'v3-moonboat': 'space', 'v4-ribbon-road': 'silk'}[name], letter: 'S', misses: 1, hinted: false}], `${name}: the finished round is recorded once for the player`);
    const order = [];
    for (let i = 0; i < 7; i++) {
      const next = t.makeNode(); next.dataset.action = 'next';
      t.getNode('#main').listeners.click({target: next}); await t.flush();
      order.push(t.app.current.letter);
    }
    assert.deepEqual(order, ['T', 'A', 'I', 'N', 'P', 'S', 'T'], `${name}: "Another sound" stays within the chosen letters`);
    if (name === 'v4-ribbon-road') {
      const start = t.makeNode(); start.dataset.action = 'start';
      t.getNode('#main').listeners.click({target: start}); await t.flush();
      assert.equal(t.app.current.letter, 'A', 'Play with Lucy starts at the first chosen letter');
    }
  }
  {
    const t = await game(name, {volume: 40});
    await t.app.go('home');
    assert.equal([...t.main().matchAll(/data-letter="/g)].length, 26);
    assert(t.getNode('#header').innerHTML.includes('<div class="controls">'), `${name}: controls shown by default`);
    await t.app.start('B'); await t.flush();
    assert.equal(t.played.length, 2); assert(t.volumes.length >= 2 && t.volumes.every(v => v === .4), `${name}: voice volume applied`);
    await t.app.continueMatch(t.makeNode()); await t.flush();
    for (const choice of t.app.choices.filter(l => l.letter !== 'B')) {
      const button = t.getNode(`[data-answer="${choice.letter}"]`); button.dataset.answer = choice.letter;
      await t.app.answer(button); await t.flush();
    }
    assert(!t.getNode('[data-answer="B"]').classList.values.has('hint'), `${name}: two misses never outline`);
    assert(!t.played.includes(t.window.GAME_AUDIO.words.ball), `${name}: misses never say the right word`);
  }
  {
    const t = await game(name, {letters: ['Q']});
    await t.app.go('home');
    assert(t.main().includes('0 of 1 · yours to keep'));
    if (name === 'v3-moonboat') assert(t.main().includes('1 LITTLE WORLD<'));
    await t.app.start('Q'); await t.flush();
    const next = t.makeNode(); next.dataset.action = 'next';
    t.getNode('#main').listeners.click({target: next}); await t.flush();
    assert.equal(t.app.current.letter, 'Q', `${name}: a single letter wraps to itself`);
  }
  {
    const t = await game(name, null);
    await t.app.go('home');
    assert.equal([...t.main().matchAll(/data-letter="/g)].length, 26, `${name}: nobody signed in plays all 26`);
    assert(t.main().includes('0 of 26 · this visit'), `${name}: play without saving keeps the one-visit collection`);
    assert.equal(t.LW.rounds.length, 0);
  }
  {
    // Done letters come from the account's saved correct answers in every game.
    const t = await game(name, {}, {post: ['A'], space: ['B'], silk: ['C']});
    await t.app.go('home');
    for (const l of ['A', 'B', 'C']) assert(t.main().includes(`aria-label="Play letter ${l}, done"`), `${name}: ${l} saved in another game shows done`);
    assert(!t.main().includes('aria-label="Play letter D, done"') && t.main().includes('3 of 26 · yours to keep') && !t.main().includes('this visit'), `${name}: signed-in wording`);
    assert.equal((t.main().match(/>Done</g) || []).length, 3, `${name}: done cards say Done`);
  }
  console.log(`PASS ${name}: chosen letters, counts, wrap, no hints whatever is stored, voice off, volume, hidden children's buttons, rounds recorded, done from every game`);
}

(async () => {
  settingsChecks();
  for (const name of ['v1-letter-post', 'v3-moonboat', 'v4-ribbon-road']) await worldChecks(name);
})().catch(error => {console.error(error); process.exitCode = 1;});
