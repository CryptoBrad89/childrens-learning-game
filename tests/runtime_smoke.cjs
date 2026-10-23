/* No dependencies. Exercises the real game renderers and audio sequencing in a
 * VM with minimal browser API stubs. This does not measure layout or play sound. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const alphabet = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];

async function smoke(game) {
  const nodes = new Map(), played = [];
  const makeNode = () => ({
    innerHTML: '', textContent: '', value: '', dataset: {}, listeners: {},
    attributes: {}, children: alphabet.map((_, i) => ({offsetLeft: i * 60, offsetWidth: 54})),
    clientWidth: 300, scrollLeft: 0,
    classList: {values: new Set(), add(v) {this.values.add(v);}, remove(v) {this.values.delete(v);}},
    addEventListener(name, handler) {this.listeners[name] = handler;},
    setAttribute(name, value) {this.attributes[name] = value;},
    removeAttribute(name) {delete this.attributes[name];},
    getAttribute(name) {return this.attributes[name] ?? null;},
    focus() {}, contains() {return true;}, closest() {return this;},
    querySelector() {return null;}, querySelectorAll() {return [];}
  });
  // Parts only the browser lays out (pages of letters, the collection sheet) aren't stubbed.
  const ABSENT = /paged|collection-sheet|collection-summary|summary-text/;
  const getNode = selector => {
    if (ABSENT.test(selector)) return null;
    if (!nodes.has(selector)) nodes.set(selector, makeNode());
    return nodes.get(selector);
  };
  const document = {
    body: makeNode(), hidden: false,
    querySelector: getNode,
    querySelectorAll(selector) {
      if (selector !== '.choice') throw new Error(`Unhandled selector: ${selector}`);
      return [...getNode('#main').innerHTML.matchAll(/data-answer="([A-Z])"/g)]
        .map(match => getNode(`[data-answer="${match[1]}"]`));
    },
    addEventListener() {}, dispatchEvent() {}
  };
  class Audio {
    constructor(file) {
      assert.equal(typeof file, 'string', 'Undefined audio path');
      assert(fs.existsSync(path.resolve(root, game, file)), `Missing audio: ${file}`);
      this.file = file;
    }
    play() {played.push(this.file); queueMicrotask(() => this.onended?.()); return Promise.resolve();}
    pause() {}
  }
  const noEffect = async () => true;
  const Fun = {
    cancel() {}, voice() {}, mute() {}, home: noEffect, open: noEffect,
    press: noEffect, replay: noEffect, miss: noEffect, lucy: noEffect,
    exit: noEffect, correct: noEffect, reward: noEffect, weather: noEffect, evidence: {reduced: false}
  };
  const window = {Fun, scrollTo() {}};
  // Timers run straight away; the pauses asked for are kept to check.
  const pauses = [];
  const context = vm.createContext({
    window, document, Audio, queueMicrotask, CustomEvent: class {},
    setTimeout(fn, ms) {pauses.push(ms); setImmediate(fn); return pauses.length;}, clearTimeout() {},
    matchMedia: () => ({matches: false, addEventListener() {}}), ResizeObserver: class {observe() {}},
    localStorage: {getItem() {return null;}, setItem() {}}
  });
  const scripts = [...fs.readFileSync(path.join(root, game, 'index.html'), 'utf8').matchAll(/<script src="([^"]+)"/g)].map(match => match[1]);
  const script = name => path.resolve(root, game, scripts.find(file => path.basename(file) === name));
  for (const file of ['config.js', 'art.js']) {
    vm.runInContext(fs.readFileSync(script(file), 'utf8'), context);
  }
  context.draw = window.draw; context.ico = window.ico;
  vm.runInContext(fs.readFileSync(path.join(root, 'audio-map.js'), 'utf8'), context);
  const source = fs.readFileSync(script('app.js'), 'utf8');
  assert(source.endsWith('})();\n'), 'Unrecognized app wrapper');
  vm.runInContext(source.slice(0, -6) + `
    window.testGame = {start, continueMatch, answer, replay, go, setTheme,
      get choices(){return choices;}, get current(){return current;}};
  })();`, context);
  const app = window.testGame;
  const audioPath = file => file.startsWith('assets/') ? (window.CONCEPT.assetBase || 'assets') + file.slice(6) : file;
  const flush = () => new Promise(resolve => setImmediate(resolve));
  const html = () => getNode('#main').innerHTML;
  let rounds = 0;
  for (let theme = 0; theme < window.CONCEPT.themes.length; theme++) {
    app.setTheme(theme);
    assert.equal(document.body.dataset.theme, String(theme));
    await app.go('home');
    assert.deepEqual([...html().matchAll(/data-letter="([A-Z])"/g)].map(m => m[1]), alphabet);
    assert(!html().includes('undefined'), 'Invalid card tilt or markup');
    for (const letter of alphabet) {
      played.length = 0;
      await app.start(letter); await flush();
      assert.equal(document.body.dataset.screen, 'listen');
      assert.deepEqual(played, [window.GAME_AUDIO.letters[letter].name, window.GAME_AUDIO.letters[letter].sound]);
      await app.replay(); await flush();
      assert.deepEqual(played.slice(-2), [window.GAME_AUDIO.letters[letter].name, window.GAME_AUDIO.letters[letter].sound]);
      const beforeMatch = played.length;
      await app.continueMatch(makeNode()); await flush();
      assert.equal(document.body.dataset.screen, 'match');
      assert.equal(played.length, beforeMatch, '"Find the picture" opens without replaying the letter');
      assert(html().includes(letter === 'X' ? 'What ends' : 'What starts'));
      assert.equal(app.choices.length, 3);
      assert.equal(new Set(app.choices.map(l => l.letter)).size, 3);
      const wrong = app.choices.filter(l => l.letter !== letter);
      for (const choice of wrong) {
        assert.notEqual(choice.sound, app.current.sound, 'Ambiguous phoneme distractor');
        if (letter !== 'X') assert.notEqual(choice.word[0], app.current.word[0], 'Ambiguous starting-word distractor');
        const button = getNode(`[data-answer="${choice.letter}"]`);
        button.dataset.answer = choice.letter;
        button.removeAttribute('aria-disabled'); // the stub outlives the screen; a real one is new each round
        const before = played.length; pauses.length = 0;
        await app.answer(button); await flush(); await flush();
        assert.equal(document.body.dataset.screen, 'match');
        assert.equal(button.getAttribute('aria-disabled'), null);
        // Only the tapped word, a short pause, then one try-again clip.
        assert.deepEqual(played.slice(before), [audioPath(window.GAME_AUDIO.words[choice.word]), audioPath(window.GAME_AUDIO.feedback.retry[0])]);
        assert(pauses.length === 1 && pauses[0] >= 150 && pauses[0] <= 250, `Pause between word and try-again: ${pauses}`);
        assert.equal(getNode('.feedback').textContent, `That’s ${choice.word}. Try another picture.`);
      }
      const correct = getNode(`[data-answer="${letter}"]`);
      assert(!correct.classList.values.has('hint') && !html().includes('hint'), 'No hint, ever');
      assert(!played.includes(audioPath(window.GAME_AUDIO.words[app.current.word])), 'Misses never say the right word');
      correct.dataset.answer = letter;
      await app.answer(correct); await flush(); await flush();
      assert.equal(document.body.dataset.screen, 'celebrate');
      assert(html().includes('of 26 · this visit'));
      assert(window.GAME_AUDIO.feedback.cheers.map(audioPath).includes(played.at(-1)), 'The cheer plays on the found-it page');
      if (letter === 'X') assert(html().includes('Fox ends with x.'));
      await app.replay(true); await flush();
      assert.equal(played.at(-1), audioPath(window.GAME_AUDIO.words[app.current.word]));
      const button = makeNode(); button.dataset.action = 'next';
      getNode('#main').listeners.click({target: button}); await flush();
      assert.equal(app.current.letter, alphabet[(alphabet.indexOf(letter) + 1) % 26]);
      assert.equal(document.body.dataset.screen, 'listen');
      rounds++;
    }
    await app.go('home');
    assert(html().includes('26 of 26 · this visit'));
    assert.equal((html().match(/, done"/g) || []).length, 26);
    assert.equal((html().match(/class="done-badge"/g) || []).length, 26 * 2, 'Every card and collection slot has the done badge');
    assert(!html().includes('played this visit'));
    const mute = getNode('#mute');
    mute.onclick(); played.length = 0;
    await app.start('X'); await flush();
    await app.replay(); await flush();
    assert.equal(played.length, 0, 'Mute must suppress all voice clips');
    mute.onclick();
  }
  console.log(`PASS ${game}: ${rounds} rounds, all themes, listen/replay, quiet match step, misses with only the word and a try-again, no hints, cheer, done badges, collection, next/wrap and mute (browser APIs stubbed)`);
}

(async () => {
  for (const game of ['v1-letter-post', 'v3-moonboat', 'v4-ribbon-road']) await smoke(game);
})().catch(error => {console.error(error); process.exitCode = 1;});
