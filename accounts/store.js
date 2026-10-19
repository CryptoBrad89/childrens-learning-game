/* Local cache for one signed-in learner. The browser keeps a copy so play
 * continues offline. The copy is keyed by person. The device-wide settings key
 * is only a projection of the person currently playing, because the games
 * already read it. Signing out removes that projection.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LittleWoofStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const Merge = typeof globalThis !== 'undefined' && globalThis.LittleWoofMerge
    ? globalThis.LittleWoofMerge
    : require('./merge.js');
  const DEVICE_SETTINGS = 'little-woof-grown-ups';
  const ACTIVE = 'little-woof-active';
  const REPLICA = 'little-woof-replica';
  const CLASS_CODE = 'little-woof-class-code';
  const ROSTER = 'little-woof-roster';
  const DEFAULTS = {
    voice: true, volume: 100, effects: true, calm: false, kidControls: true,
    letters: [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'], hintAfter: 2,
    games: ['post', 'space', 'silk']
  };

  function memory() {
    const data = new Map();
    return {
      getItem: key => data.has(key) ? data.get(key) : null,
      setItem: (key, value) => data.set(key, String(value)),
      removeItem: key => data.delete(key),
      key: index => [...data.keys()][index] || null,
      get length() { return data.size; }
    };
  }
  function bucket() {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) return localStorage;
    } catch (error) { /* private windows */ }
    return memory();
  }
  function readJson(storage, key) {
    try { return JSON.parse(storage.getItem(key)); } catch (error) { return null; }
  }
  function replicaId(storage = bucket()) {
    const current = storage.getItem(REPLICA);
    if (current && /^[0-9a-f-]{36}$/.test(current)) return current;
    const created = (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : '00000000-0000-4000-8000-' + Date.now().toString().padStart(12, '0').slice(-12);
    storage.setItem(REPLICA, created);
    return created;
  }
  function stateKey(id) { return `little-woof-state:${id}`; }
  function blank() { return Merge.emptyState(); }
  function readState(id, storage = bucket()) {
    const saved = id ? readJson(storage, stateKey(id)) : null;
    return Merge.mergeState(saved, blank());
  }
  function writeState(id, state, storage = bucket()) {
    storage.setItem(stateKey(id), JSON.stringify(Merge.mergeState(state, blank())));
  }
  function readActive(storage = bucket()) {
    const active = readJson(storage, ACTIVE);
    if (!active || !active.learnerId) return null;
    return active;
  }
  function writeActive(active, storage = bucket()) {
    storage.setItem(ACTIVE, JSON.stringify(active));
  }
  function clearActive(storage = bucket()) {
    storage.removeItem(ACTIVE);
  }
  function projectSettings(state) {
    const flat = {};
    for (const [key, fallback] of Object.entries(DEFAULTS)) {
      const register = state.settings && state.settings[key];
      const value = register && Object.prototype.hasOwnProperty.call(register, 'v') ? register.v : fallback;
      flat[key] = Array.isArray(value) ? [...value] : value;
    }
    return flat;
  }
  function stampSettings(previous, flat, now) {
    const next = {...(previous || {})};
    for (const key of Object.keys(DEFAULTS)) {
      const before = previous && previous[key] ? Merge.canon(previous[key].v) : null;
      const after = Merge.canon(flat[key]);
      if (before === null) {
        if (after !== Merge.canon(DEFAULTS[key])) next[key] = {v: flat[key], t: now};
      } else if (before !== after) {
        next[key] = {v: flat[key], t: now};
      }
    }
    return next;
  }
  function projectThemes(state, storage = bucket()) {
    for (const world of Merge.WORLDS) {
      const key = `little-woof-${world}-theme`;
      const register = state.themes && state.themes[world];
      if (register && Number.isInteger(register.v)) storage.setItem(key, String(register.v));
      else storage.removeItem(key);
    }
  }
  function clearProjection(storage = bucket()) {
    storage.removeItem(DEVICE_SETTINGS);
    for (const world of Merge.WORLDS) storage.removeItem(`little-woof-${world}-theme`);
  }
  function project(state, storage = bucket()) {
    storage.setItem(DEVICE_SETTINGS, JSON.stringify(projectSettings(state)));
    projectThemes(state, storage);
  }
  function authPresent(storage = bucket()) {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = storage.getItem(key);
        if (raw && raw !== 'null') return true;
      }
    }
    return false;
  }
  function rememberClass(code, roster, storage = bucket()) {
    storage.setItem(CLASS_CODE, code);
    storage.setItem(ROSTER, JSON.stringify(roster));
  }
  function classCode(storage = bucket()) { return storage.getItem(CLASS_CODE) || ''; }
  function roster(storage = bucket()) { return readJson(storage, ROSTER) || null; }
  function forgetClass(storage = bucket()) {
    storage.removeItem(CLASS_CODE);
    storage.removeItem(ROSTER);
  }

  return {
    DEVICE_SETTINGS, ACTIVE, REPLICA, CLASS_CODE, ROSTER, DEFAULTS,
    memory, replicaId, stateKey, blank, readState, writeState, readActive, writeActive, clearActive,
    projectSettings, stampSettings, project, clearProjection, authPresent,
    rememberClass, classCode, roster, forgetClass
  };
});
