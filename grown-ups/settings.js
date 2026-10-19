(function (root) {
  'use strict';
  var KEY = 'little-woof-grown-ups';
  var OPEN = 'little-woof-grown-ups-open';
  var ALL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var GAME_NAMES = ['post', 'space', 'silk'];

  function blankGames(on) {
    return {post: on, space: on, silk: on};
  }

  function defaults() {
    return {
      version: 1,
      sound: 'on',
      motion: 'device',
      letters: ALL,
      games: blankGames(true),
      hintAfter: 2
    };
  }

  function copy(settings) {
    return {
      version: 1,
      sound: settings.sound,
      motion: settings.motion,
      letters: settings.letters,
      games: {post: settings.games.post, space: settings.games.space, silk: settings.games.silk},
      hintAfter: settings.hintAfter
    };
  }

  function parse(raw) {
    var data;
    try {
      data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (error) {
      return defaults();
    }
    if (!data || typeof data !== 'object') return defaults();
    var chosen = {};
    if (typeof data.letters === 'string') {
      var source = data.letters.toUpperCase();
      var tokens = /^[A-Z]+$/.test(source) ? source.split('') : source.split(/[^A-Z]+/);
      tokens.forEach(function (token) {
        if (token.length === 1 && ALL.indexOf(token) >= 0) chosen[token] = true;
      });
    }
    var letters = ALL.split('').filter(function (letter) { return chosen[letter]; }).join('');
    var games = blankGames(true);
    if (data.games && typeof data.games === 'object') {
      GAME_NAMES.forEach(function (name) {
        if (data.games[name] === false) games[name] = false;
      });
    }
    if (!games.post && !games.space && !games.silk) games = blankGames(true);
    return {
      version: 1,
      sound: data.sound === 'off' ? 'off' : 'on',
      motion: data.motion === 'calm' || data.motion === 'full' ? data.motion : 'device',
      letters: letters || ALL,
      games: games,
      hintAfter: data.hintAfter === 1 ? 1 : 2
    };
  }

  function storage(name) {
    try {
      return root[name];
    } catch (error) {
      return null;
    }
  }

  function load() {
    var local = storage('localStorage');
    if (!local) return defaults();
    try {
      return parse(local.getItem(KEY));
    } catch (error) {
      return defaults();
    }
  }

  function save(next) {
    var local = storage('localStorage');
    if (!local) return false;
    try {
      local.setItem(KEY, JSON.stringify(parse(next)));
      return true;
    } catch (error) {
      return false;
    }
  }

  function unlocked() {
    var session = storage('sessionStorage');
    if (!session) return false;
    try {
      return session.getItem(OPEN) === '1';
    } catch (error) {
      return false;
    }
  }

  function unlock() {
    var session = storage('sessionStorage');
    if (!session) return;
    try { session.setItem(OPEN, '1'); } catch (error) {}
  }

  function lock() {
    var session = storage('sessionStorage');
    if (!session) return;
    try { session.removeItem(OPEN); } catch (error) {}
  }

  function applyMotion(doc) {
    if (!doc || !doc.documentElement) return;
    var mode = load().motion;
    if (mode === 'calm' || mode === 'full') doc.documentElement.dataset.motion = mode;
    else delete doc.documentElement.dataset.motion;
  }

  root.GrownUps = {
    KEY: KEY,
    ALL: ALL,
    defaults: defaults,
    parse: parse,
    load: load,
    save: save,
    unlocked: unlocked,
    unlock: unlock,
    lock: lock,
    applyMotion: applyMotion,
    copy: copy
  };
})(window);
