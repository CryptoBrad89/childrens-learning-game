/* Grown-up settings shared by the chooser, every world and the grown-ups' corner.
 * Account choices are projected into this synchronous renderer API. */
(() => {
'use strict';
const KEY = 'little-woof-grown-ups';
const ALL = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const GAMES = ['post', 'space', 'silk'];
const DEFAULTS = Object.freeze({
  voice: true, volume: 100, effects: true, calm: false,
  letters: ALL, hintAfter: 2, games: GAMES, kidControls: true
});
let storageOK = true;

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
    hintAfter: [0, 1, 2].includes(value.hintAfter) ? value.hintAfter : DEFAULTS.hintAfter,
    games: games.length ? games : [...GAMES]
  };
}
function load() {
  if (window.ACCOUNTS && location.protocol !== 'file:') return normalize(window.ACCOUNTS.effectiveSettings(window.ACCOUNTS.guest?null:window.ACCOUNTS.owner?.role==='child'?window.ACCOUNTS.owner.id:null));
  if(window.ACCOUNTS?.guest)return normalize(null);
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { storageOK = false; }
  try { return normalize(JSON.parse(saved)); } catch (e) { return normalize(null); }
}
function save(next) {
  const clean = normalize(next);
  api.settings = clean;
  try {
    if (window.ACCOUNTS?.guest) api.whenSaved = Promise.resolve();
    else if (window.ACCOUNTS?.owner && location.protocol !== 'file:') {
      api.whenSaved = window.ACCOUNTS.setSettings(clean);
      api.whenSaved.catch(() => { storageOK = false; });
    } else localStorage.setItem(KEY, JSON.stringify(clean));
    storageOK = true;
  }
  catch (e) { storageOK = false; }
  apply(clean);
  return storageOK;
}
// Page-wide switches that CSS can see before anything renders.
function apply(settings) {
  const root = document.documentElement;
  if (settings.calm) root.dataset.calm = ''; else delete root.dataset.calm;
}
const api = {KEY, ALL, GAMES, DEFAULTS, normalize, load, save,
  whenSaved: Promise.resolve(), settings: load(), get storageOK() { return storageOK; }};
apply(api.settings);
window.GROWN_UPS = api;
if (window.ACCOUNTS) {
  const refresh = () => { api.settings = load(); apply(api.settings); };
  window.ACCOUNTS.ready.then(refresh).catch(() => {});
  window.ACCOUNTS.subscribe(refresh);
}
})();
