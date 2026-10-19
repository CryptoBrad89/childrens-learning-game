'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function memory(throwOn) {
  const data = new Map();
  return {
    getItem(key) {
      if (throwOn === 'get') throw new Error('get blocked');
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      if (throwOn === 'set') throw new Error('set blocked');
      data.set(key, String(value));
    },
    removeItem(key) {
      if (throwOn === 'remove') throw new Error('remove blocked');
      data.delete(key);
    }
  };
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function load(local, session) {
  const window = {localStorage: local, sessionStorage: session};
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../grown-ups/settings.js'), 'utf8'), vm.createContext({window}));
  return window.GrownUps;
}

const fresh = load(memory(), memory());
assert.deepEqual(plain(fresh.load()), plain(fresh.defaults()));
assert.equal(fresh.unlocked(), false);

const messy = fresh.parse({
  sound: 'loud',
  motion: 'wild',
  letters: 'b, a, hello',
  games: {post: false, space: false, silk: false},
  hintAfter: 9
});
assert.deepEqual(plain(messy), {
  version: 1,
  sound: 'on',
  motion: 'device',
  letters: 'AB',
  games: {post: true, space: true, silk: true},
  hintAfter: 2
});

assert.equal(fresh.parse('{').letters, fresh.parse(null).letters);
assert.equal(fresh.parse({letters: 'bba hello'}).letters, fresh.ALL);
assert.equal(fresh.parse('not json').sound, 'on');
assert.deepEqual(plain(fresh.parse({sound: 'off', motion: 'calm', letters: 'satpinmd', games: {silk: false}, hintAfter: 1})), {
  version: 1,
  sound: 'off',
  motion: 'calm',
  letters: 'ADIMNPST',
  games: {post: true, space: true, silk: false},
  hintAfter: 1
});
assert.equal(fresh.parse({motion: 'full'}).motion, 'full');
assert.equal(fresh.parse({letters: ''}).letters, fresh.ALL);
assert.equal(fresh.parse({games: {post: false}}).games.post, false);
assert.equal(fresh.parse({games: {post: false}}).games.space, true);

const local = memory();
const session = memory();
const api = load(local, session);
assert.equal(api.save({sound: 'off', letters: 'B', hintAfter: 1, motion: 'full', games: {post: true, space: false, silk: true}}), true);
assert.deepEqual(plain(api.load()), {
  version: 1,
  sound: 'off',
  motion: 'full',
  letters: 'B',
  games: {post: true, space: false, silk: true},
  hintAfter: 1
});
api.save(api.load());
assert.equal(local.getItem(api.KEY), JSON.stringify(api.load()));

api.unlock();
assert.equal(api.unlocked(), true);
api.lock();
assert.equal(api.unlocked(), false);

const blocked = load(memory('set'), memory('set'));
assert.equal(blocked.save({sound: 'off'}), false);
blocked.unlock();
assert.equal(blocked.unlocked(), false);
assert.equal(blocked.load().sound, 'on');

const doc = {documentElement: {dataset: {}}};
api.applyMotion(doc);
assert.equal(doc.documentElement.dataset.motion, 'full');
api.save(api.defaults());
api.applyMotion(doc);
assert.equal(doc.documentElement.dataset.motion, undefined);

console.log('PASS grown-ups model: defaults, rejected values, one-letter shelf, session lock');
