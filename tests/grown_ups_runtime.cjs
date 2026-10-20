/* No dependencies. Checks grown-up settings parsing, and that every world's real
 * renderer obeys them, in a VM with minimal browser API stubs (as runtime_smoke.cjs). */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const alphabet = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const settingsSource = fs.readFileSync(path.join(root, 'grown-ups/settings.js'), 'utf8');

function storage(initial = {}, {broken = false} = {}) {
  const data = {...initial};
  return {
    data,
    getItem(key) {if (broken) throw new Error('blocked'); return key in data ? data[key] : null;},
    setItem(key, value) {if (broken) throw new Error('blocked'); data[key] = String(value);}
  };
}
function loadSettings(localStorage) {
  const documentElement = {dataset: {}};
  const window = {};
  vm.runInContext(settingsSource, vm.createContext({window, document: {documentElement}, localStorage}));
  return {api: window.GROWN_UPS, documentElement};
}

function settingsChecks() {
  const {api, documentElement} = loadSettings(storage());
  assert.deepEqual(JSON.parse(JSON.stringify(api.settings)), {
    voice: true, effects: true, calm: false, kidControls: true, volume: 100,
    letters: alphabet, hintAfter: 2, games: ['post', 'space', 'silk']
  }, 'Defaults must leave the game exactly as before');
  assert(!('calm' in documentElement.dataset));
  const junk = api.normalize({voice: 'no', volume: 250, letters: ['z', 'Q', 'A', 'Q', 7], hintAfter: 5, games: ['moon'], calm: 1});
  assert.equal(junk.voice, true); assert.equal(junk.calm, false);
  assert.equal(junk.volume, 100); assert.equal(api.normalize({volume: -4}).volume, 0); assert.equal(api.normalize({volume: '35'}).volume, 35);
  assert.deepEqual([...junk.letters], ['A', 'Q'], 'Letters are upper case A-Z, unique and in order');
  assert.equal(junk.hintAfter, 2);
  assert.deepEqual([...junk.games], ['post', 'space', 'silk'], 'At least one world always stays');
  assert.deepEqual([...api.normalize({letters: []}).letters], alphabet, 'At least one letter always stays');
  assert.equal(api.normalize({hintAfter: 0}).hintAfter, 0);

  const store = storage();
  const first = loadSettings(store);
  assert.equal(first.api.save({...first.api.settings, calm: true, letters: ['S', 'A', 'T']}), true);
  assert('calm' in first.documentElement.dataset, 'Calm motion is visible to CSS straight away');
  const second = loadSettings(store);
  assert.equal(second.api.settings.calm, true);
  assert.deepEqual([...second.api.settings.letters], ['A', 'S', 'T']);
  assert('calm' in second.documentElement.dataset);

  const corrupt = loadSettings(storage({'little-woof-grown-ups': '{not json'}));
  assert.equal(corrupt.api.settings.volume, 100); assert.equal(corrupt.api.storageOK, true);
  const blocked = loadSettings(storage({}, {broken: true}));
  assert.equal(blocked.api.storageOK, false); assert.equal(blocked.api.save({calm: true}), false);
  assert.equal(blocked.api.settings.calm, true, 'Blocked storage still applies for this page');
  console.log('PASS grown-up settings: defaults, validation, save/load, corrupt and blocked storage');
}

async function game(name, saved) {
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
    focus() {}, contains() {return true;}, closest() {return this;}
  });
  const getNode = selector => {
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
    addEventListener() {}
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
    hint: noEffect, lucy: noEffect, exit: noEffect, correct: noEffect, reward: noEffect, weather: noEffect, evidence: {reduced: false}};
  const window = {Fun, scrollTo() {}};
  const localStorage = storage({'little-woof-grown-ups': JSON.stringify(saved)});
  const context = vm.createContext({window, document, Audio, queueMicrotask, localStorage, location: {protocol: 'file:'}});
  const html = fs.readFileSync(path.join(root, name, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
  assert(scripts.indexOf('../grown-ups/settings.js') > -1 && scripts.indexOf('../grown-ups/settings.js') < scripts.findIndex(s => s.endsWith('app.js')),
    `${name}: settings must load before the app`);
  assert(scripts.indexOf('../grown-ups/settings.js') < scripts.findIndex(s => s.endsWith('fun.js')), `${name}: settings must load before effects`);
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
  return {app, flush, main, getNode, played, volumes, window, makeNode};
}

async function worldChecks(name) {
  const letters = ['S', 'A', 'T', 'P', 'I', 'N'], pool = ['A', 'I', 'N', 'P', 'S', 'T'];
  {
    const t = await game(name, {letters, hintAfter: 1, voice: false, volume: 40, kidControls: false});
    await t.app.go('home');
    assert.deepEqual([...t.main().matchAll(/data-letter="([A-Z])"/g)].map(m => m[1]), pool, `${name}: pickers show only the chosen letters, A-Z`);
    assert(t.main().includes('0 of 6 · this visit'), `${name}: collection counts the chosen letters`);
    assert(!t.main().includes('undefined'), `${name}: invalid markup`);
    if (name === 'v3-moonboat') assert(t.main().includes('6 LITTLE WORLDS'));
    if (name === 'v4-silk-thread') assert(t.main().includes('6 letters chosen for today'));
    const header = t.getNode('#header').innerHTML;
    assert(header.includes('class="controls" hidden'), `${name}: children's buttons hidden`);
    assert(header.includes('aria-pressed="true"') && header.includes('Turn sound on'), `${name}: starts muted`);
    assert(!t.getNode('#footer').innerHTML.includes('Take your time.'),'No misleading sound count or instruction in the footer');
    await t.app.start('S'); await t.flush();
    assert.equal(t.played.length, 0, `${name}: voice off means no clips`);
    await t.app.continueMatch(t.makeNode()); await t.flush();
    const wrong = t.app.choices.find(l => l.letter !== 'S'), button = t.getNode(`[data-answer="${wrong.letter}"]`);
    button.dataset.answer = wrong.letter;
    await t.app.answer(button); await t.flush();
    assert(t.getNode('[data-answer="S"]').classList.values.has('hint'), `${name}: hint after one miss`);
    const correct = t.getNode('[data-answer="S"]'); correct.dataset.answer = 'S';
    await t.app.answer(correct); await t.flush();
    assert(t.main().includes('1 of 6 · this visit'));
    const order = [];
    for (let i = 0; i < 7; i++) {
      const next = t.makeNode(); next.dataset.action = 'next';
      t.getNode('#main').listeners.click({target: next}); await t.flush();
      order.push(t.app.current.letter);
    }
    assert.deepEqual(order, ['T', 'A', 'I', 'N', 'P', 'S', 'T'], `${name}: "Another sound" stays within the chosen letters`);
    if (name === 'v4-silk-thread') {
      const start = t.makeNode(); start.dataset.action = 'start';
      t.getNode('#main').listeners.click({target: start}); await t.flush();
      assert.equal(t.app.current.letter, 'A', 'Play with Lucy starts at the first chosen letter');
    }
  }
  {
    const t = await game(name, {hintAfter: 0, volume: 40});
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
    assert(!t.getNode('[data-answer="B"]').classList.values.has('hint'), `${name}: "Don't outline" never outlines`);
    assert(!t.played.includes(t.window.GAME_AUDIO.words.ball), `${name}: no hint word without the outline`);
  }
  {
    const t = await game(name, {letters: ['Q']});
    await t.app.go('home');
    assert(t.main().includes('0 of 1 · this visit'));
    if (name === 'v3-moonboat') assert(t.main().includes('1 LITTLE WORLD<'));
    await t.app.start('Q'); await t.flush();
    const next = t.makeNode(); next.dataset.action = 'next';
    t.getNode('#main').listeners.click({target: next}); await t.flush();
    assert.equal(t.app.current.letter, 'Q', `${name}: a single letter wraps to itself`);
  }
  console.log(`PASS ${name}: chosen letters, counts, wrap, hints (1 / never), voice off, volume and hidden children's buttons`);
}

(async () => {
  settingsChecks();
  for (const name of ['v1-letter-post', 'v3-moonboat', 'v4-silk-thread']) await worldChecks(name);
})().catch(error => {console.error(error); process.exitCode = 1;});
