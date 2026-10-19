/* Progress sync is a tiny CRDT. These rules are the whole conflict policy.
 * Invariants (also enforced in supabase/migrations):
 * 1. Letters are add-only. A letter earned on any device stays earned.
 * 2. The kept timestamp for a letter is the earliest one.
 * 3. Play counts are a G-counter: each device increments only its own key,
 *    and merge takes the max per device, so a replay cannot double-count
 *    and two devices cannot wipe each other.
 * 4. Each setting and each colour theme is its own last-write-wins register.
 *    An older edit never replaces a newer edit of a different field.
 * 5. Achievements are add-only, keeping the earliest timestamp.
 * 6. Merge is commutative, associative, and idempotent.
 * A device id exists only so the counter has a replica key. It is not a profile.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LittleWoofMerge = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const WORLDS = ['post', 'space', 'silk'];
  const SETTING_KEYS = ['voice', 'volume', 'effects', 'calm', 'letters', 'hintAfter', 'games', 'kidControls'];
  const ACHIEVEMENTS = [
    ['first-sound', state => distinctLetters(state).size >= 1],
    ['five-sounds', state => distinctLetters(state).size >= 5],
    ['ten-sounds', state => distinctLetters(state).size >= 10],
    ['every-sound', state => distinctLetters(state).size >= 26],
    ['three-worlds', state => WORLDS.every(world => Object.keys(state.progress[world].letters).length > 0)]
  ];

  function emptyProgress() {
    return {
      post: {letters: {}, counts: {}},
      space: {letters: {}, counts: {}},
      silk: {letters: {}, counts: {}}
    };
  }
  function emptyState() {
    return {settings: {}, progress: emptyProgress(), achievements: {}, themes: {}};
  }
  function clone(state) {
    return JSON.parse(JSON.stringify(state || emptyState()));
  }
  function canon(value) {
    return JSON.stringify(value);
  }
  // Object key order is not part of the value. Postgres jsonb sorts keys,
  // and two devices may insert letters in different orders.
  function structural(value) {
    if (Array.isArray(value)) return '[' + value.map(structural).join(',') + ']';
    if (value && typeof value === 'object') {
      return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + structural(value[key])).join(',') + '}';
    }
    return JSON.stringify(value);
  }
  function validTime(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
  }
  function pickRegister(left, right) {
    const ok = item => item && validTime(item.t) && Object.prototype.hasOwnProperty.call(item, 'v');
    if (!ok(left)) return ok(right) ? {v: right.v, t: right.t} : null;
    if (!ok(right)) return {v: left.v, t: left.t};
    if (left.t !== right.t) return left.t > right.t ? {v: left.v, t: left.t} : {v: right.v, t: right.t};
    return canon(left.v) >= canon(right.v) ? {v: left.v, t: left.t} : {v: right.v, t: right.t};
  }
  function mergeRegisters(left, right, keys) {
    const sourceLeft = left && typeof left === 'object' ? left : {};
    const sourceRight = right && typeof right === 'object' ? right : {};
    const names = keys || [...new Set([...Object.keys(sourceLeft), ...Object.keys(sourceRight)])];
    const out = {};
    for (const key of names) {
      const picked = pickRegister(sourceLeft[key], sourceRight[key]);
      if (picked) out[key] = picked;
    }
    return out;
  }
  function mergeLetters(left, right) {
    const out = {};
    for (const source of [left, right]) {
      if (!source || typeof source !== 'object') continue;
      for (const [letter, time] of Object.entries(source)) {
        if (!/^[A-Z]$/.test(letter) || !validTime(time)) continue;
        if (!out[letter] || time < out[letter]) out[letter] = time;
      }
    }
    return out;
  }
  function mergeCounts(left, right) {
    const out = {};
    for (const source of [left, right]) {
      if (!source || typeof source !== 'object') continue;
      for (const [replica, count] of Object.entries(source)) {
        if (!/^[0-9a-f-]{36}$/.test(replica)) continue;
        const value = Number(count);
        if (!Number.isInteger(value) || value < 0) continue;
        out[replica] = Math.max(out[replica] || 0, Math.min(1000000, value));
      }
    }
    return out;
  }
  function mergeProgress(left, right) {
    const out = emptyProgress();
    for (const world of WORLDS) {
      const a = left && left[world] ? left[world] : {};
      const b = right && right[world] ? right[world] : {};
      out[world] = {
        letters: mergeLetters(a.letters, b.letters),
        counts: mergeCounts(a.counts, b.counts)
      };
    }
    return out;
  }
  function mergeAchievements(left, right) {
    const out = {};
    for (const source of [left, right]) {
      if (!source || typeof source !== 'object') continue;
      for (const [id, time] of Object.entries(source)) {
        if (!/^[a-z0-9-]{1,40}$/.test(id) || !validTime(time)) continue;
        if (!out[id] || time < out[id]) out[id] = time;
      }
    }
    return out;
  }
  function mergeState(left, right) {
    const a = left || emptyState();
    const b = right || emptyState();
    return {
      settings: mergeRegisters(a.settings, b.settings, SETTING_KEYS),
      progress: mergeProgress(a.progress, b.progress),
      achievements: mergeAchievements(a.achievements, b.achievements),
      themes: mergeRegisters(a.themes, b.themes, WORLDS)
    };
  }
  function distinctLetters(state) {
    const letters = new Set();
    for (const world of WORLDS) {
      for (const letter of Object.keys(state.progress[world].letters)) letters.add(letter);
    }
    return letters;
  }
  function withAchievements(state, now) {
    const next = clone(state);
    next.progress = mergeProgress(next.progress, emptyProgress());
    for (const [id, earned] of ACHIEVEMENTS) {
      if (earned(next) && !next.achievements[id]) next.achievements[id] = now;
    }
    for (const world of WORLDS) {
      const id = 'alphabet-' + world;
      if (Object.keys(next.progress[world].letters).length >= 26 && !next.achievements[id]) next.achievements[id] = now;
    }
    return next;
  }
  function lettersOf(state, world) {
    return Object.keys((state && state.progress && state.progress[world] && state.progress[world].letters) || {}).sort();
  }
  function sameState(left, right) {
    return structural(mergeState(left, emptyState())) === structural(mergeState(right, emptyState()));
  }

  return {
    WORLDS, SETTING_KEYS, ACHIEVEMENTS, emptyState, emptyProgress, clone, canon, structural,
    mergeState, mergeProgress, withAchievements, lettersOf, distinctLetters, sameState, validTime
  };
});
