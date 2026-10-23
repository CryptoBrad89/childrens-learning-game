/* Grown-up settings shared by the chooser, every world and the grown-ups' corner.
 * They belong to the person who is playing (see accounts/accounts.js) and follow
 * them to any device. Nobody signed in plays with the defaults; nothing is kept
 * for the device itself. */
(() => {
'use strict';
const ALL = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const GAMES = ['post', 'space', 'silk'];
// The fields grown-ups set. The games give no hints, so `hintAfter` (the old "Help when
// stuck" setting) is no longer one of them: nothing reads it or saves it, and a value
// already stored for someone stays as it is.
const FIELDS = ['voice', 'volume', 'effects', 'calm', 'letters', 'games', 'kidControls'];
const DEFAULTS = Object.freeze({
  voice: true, volume: 100, effects: true, calm: false,
  letters: ALL, games: GAMES, kidControls: true
});

function normalize(raw) {
  const value = raw && typeof raw === 'object' ? raw : {};
  const flag = (name) => typeof value[name] === 'boolean' ? value[name] : DEFAULTS[name];
  const volume = Number(value.volume);
  const letters = Array.isArray(value.letters) ? ALL.filter(l => value.letters.includes(l)) : [];
  const games = Array.isArray(value.games) ? GAMES.filter(g => value.games.includes(g)) : [];
  return {
    voice: flag('voice'), effects: flag('effects'), calm: flag('calm'), kidControls: flag('kidControls'),
    volume: Number.isFinite(volume) ? Math.round(Math.min(100, Math.max(0, volume))) : DEFAULTS.volume,
    letters: letters.length ? letters : [...ALL],
    games: games.length ? games : [...GAMES]
  };
}
// The settings of a person on this device (the player when no id is given).
function load(id) {
  const L = window.LW, who = id || (L && L.playerId());
  return normalize(who && L ? L.values(who) : null);
}
// Fields of `next` that differ from `from`, ready to save.
function changes(from, next) {
  const a = normalize(from), b = normalize(next), out = {};
  for (const f of FIELDS) if (JSON.stringify(a[f]) !== JSON.stringify(b[f])) out[f] = b[f];
  return out;
}
// Page-wide switches that CSS can see before anything renders.
function apply(settings) {
  const root = document.documentElement;
  if (settings.calm) root.dataset.calm = ''; else delete root.dataset.calm;
}
const api = {ALL, GAMES, FIELDS, DEFAULTS, normalize, load, changes, apply, settings: load()};
apply(api.settings);
window.GROWN_UPS = api;
})();
