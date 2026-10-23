/* Letters with Lucy accounts: who is playing, what they own, and sync with Supabase.
 *
 * Settings, rounds and stickers belong to the person and live on the server.
 * This device keeps a copy of each person who signed in here, so play works
 * offline, plus an outbox of what hasn't been uploaded yet:
 *   - rounds wait in the person's own queue, each with an id made here, so a
 *     retried upload can never count a round twice;
 *   - settings edits wait in one device outbox, tagged with who made them;
 *     the newest edit of each field wins, on the server and in what's shown.
 * What's shown is always the last copy from the server plus what is still
 * waiting, so nothing is lost and nothing is counted twice. */
(() => {
'use strict';
const CFG = window.LW_CONFIG || {};
const SELF = document.currentScript && document.currentScript.src;
const DOMAIN = '@accounts.little-woof.invalid';
const WORLDS = ['post', 'space', 'silk'];
const LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const KEY = {people: 'lw:people', outbox: 'lw:outbox', device: 'lw:device', shown: 'lw:shown', active: 'lw:active', corner: 'lw:corner'};
const dataKey = id => 'lw:data:' + id;
const MAX_UPLOAD = 500, SETTINGS_BATCH = 500, SYNC_EVERY = 30000, TIMEOUT = 15000;

/* ---------- storage (falls back to memory when the browser blocks it) ---------- */
const memory = new Map();
let storageOK = true;
function read(key, fallback) {
  let raw = null;
  try { raw = localStorage.getItem(key); } catch (e) { storageOK = false; raw = memory.has(key) ? memory.get(key) : null; }
  try { return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; }
}
function write(key, value) {
  const raw = JSON.stringify(value);
  try { localStorage.setItem(key, raw); return true; } catch (e) { storageOK = false; memory.set(key, raw); return false; }
}
function drop(key) { try { localStorage.removeItem(key); } catch (e) { memory.delete(key); } }
function tabGet(key) { try { return sessionStorage.getItem(key); } catch (e) { return memory.get('tab:' + key) || null; } }
function tabSet(key, value) {
  try { if (value == null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, value); }
  catch (e) { if (value == null) memory.delete('tab:' + key); else memory.set('tab:' + key, value); }
}

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16)); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
const deviceId = read(KEY.device, null) || (() => { const id = uuid(); write(KEY.device, id); return id; })();

/* ---------- events ---------- */
const listeners = {};
function on(name, fn) { (listeners[name] ||= new Set()).add(fn); return () => listeners[name].delete(fn); }
function emit(name, detail) { for (const fn of listeners[name] || []) { try { fn(detail); } catch (e) { console.error(e); } } }
window.addEventListener('storage', e => { if (e.key && e.key.startsWith('lw:')) emit('change', {key: e.key}); });

/* ---------- people on this device ---------- */
const people = () => read(KEY.people, {});
function person(id) { return id ? people()[id] || null : null; }
function savePerson(p) { const all = people(); all[p.id] = p; write(KEY.people, all); return p; }
function patchPerson(id, patch) { const p = person(id); if (p) savePerson({...p, ...patch}); }
function list() {
  return Object.values(people()).sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))
    .map(p => ({...publicPerson(p), waiting: waiting(p.id)}));
}
const publicPerson = p => p && ({id: p.id, login: p.login, name: p.name, avatar: p.avatar, picture: p.picture || null, role: p.role,
  lastUsed: p.lastUsed, played: !!p.played, needsSignIn: !!p.needsSignIn || !p.session});

// Who is playing in this tab. A turn ends when the tab closes, unless the
// grown-up chose "keep me signed in" (then it lasts on this device).
function activeId(slot = KEY.active) {
  const id = tabGet(slot) || read(slot, null);
  return person(id) ? id : null;
}
function setActive(id, {keep = false, slot = KEY.active} = {}) {
  tabSet(slot, id);
  if (keep) write(slot, id); else drop(slot);
  if (id) patchPerson(id, slot === KEY.active ? {lastUsed: Date.now(), played: true} : {lastUsed: Date.now()});
  emit('active', {id, slot});
}

/* ---------- each person's copy ---------- */
function load(id) {
  const d = read(dataKey(id), null) || {};
  d.snap ||= {settings: {}, agg: {}, badges: {}};
  d.pending ||= []; d.localBadges ||= {};
  return d;
}
const save = (id, d) => write(dataKey(id), d);
const outbox = () => read(KEY.outbox, []);

function settingsOf(id) {
  const fields = {...(load(id).snap.settings || {})};
  for (const e of outbox()) if (e.profile === id && (!fields[e.field] || e.t >= fields[e.field].t)) fields[e.field] = {v: e.v, t: e.t};
  return fields;
}
function values(id) {
  const out = {};
  for (const [field, entry] of Object.entries(settingsOf(id))) out[field] = entry.v;
  return out;
}
function addRound(agg, r) {
  const w = agg[r.world] ||= {}, cell = w[r.letter] ||= {n: 0, clean: 0, first: r.at};
  cell.n++; if (!r.misses) cell.clean++; cell.first = Math.min(cell.first, r.at);
}
function progress(id) {
  const d = load(id), agg = JSON.parse(JSON.stringify(d.snap.agg || {}));
  for (const r of d.pending) addRound(agg, r);
  return agg;
}
function summary(agg) {
  const s = {rounds: 0, clean: 0, letters: new Set(), byWorld: {}, worlds: {}};
  for (const w of WORLDS) {
    s.byWorld[w] = new Set(); s.worlds[w] = 0;
    for (const [letter, cell] of Object.entries(agg[w] || {})) {
      if (!cell.n) continue;
      s.rounds += cell.n; s.clean += cell.clean; s.worlds[w] += cell.n;
      s.letters.add(letter); s.byWorld[w].add(letter);
    }
  }
  return s;
}
const has = (set, letters) => [...letters].every(l => set.has(l));
const BADGES = [
  {key: 'first-sound', title: 'First sound', about: 'Found a first sound.', test: s => s.rounds >= 1},
  {key: 'five-letters', title: 'Five letters', about: 'Found five different letters.', test: s => s.letters.size >= 5},
  {key: 'satpin', title: 's a t p i n', about: 'Found s, a, t, p, i and n.', test: s => has(s.letters, 'SATPIN')},
  {key: 'vowels', title: 'Vowels', about: 'Found a, e, i, o and u.', test: s => has(s.letters, 'AEIOU')},
  {key: 'three-worlds', title: 'Three worlds', about: 'Played in Letter Post, Moonboat and Ribbon Road.', test: s => WORLDS.every(w => s.worlds[w] > 0)},
  {key: 'ten-rounds', title: 'Ten rounds', about: 'Finished ten rounds.', test: s => s.rounds >= 10},
  {key: 'sharp-ears', title: 'Sharp ears', about: 'Ten rounds right the first time.', test: s => s.clean >= 10},
  {key: 'fifty-rounds', title: 'Fifty rounds', about: 'Finished fifty rounds.', test: s => s.rounds >= 50},
  {key: 'all-post', title: 'Full mailbag', about: 'All 26 letters in Letter Post.', test: s => s.byWorld.post.size === 26},
  {key: 'all-space', title: 'Full sky', about: 'All 26 letters in Moonboat.', test: s => s.byWorld.space.size === 26},
  {key: 'all-silk', title: 'Full ribbon', about: 'All 26 letters in Ribbon Road.', test: s => s.byWorld.silk.size === 26},
  {key: 'alphabet', title: 'A to Z', about: 'Found every letter from a to z.', test: s => s.letters.size === 26}
];
// Stickers come from play, so a device works them out itself (offline too) and
// the server keeps the earliest time each was earned.
function badges(id, {remember = true} = {}) {
  const d = load(id), s = summary(progress(id)), earned = {...d.snap.badges};
  let changed = false;
  for (const b of BADGES) {
    if (!b.test(s)) continue;
    if (!d.localBadges[b.key]) { d.localBadges[b.key] = Date.now(); changed = true; }
    earned[b.key] = Math.min(earned[b.key] || Infinity, d.localBadges[b.key]);
  }
  for (const [key, t] of Object.entries(d.localBadges)) earned[key] = Math.min(earned[key] || Infinity, t);
  if (changed && remember) save(id, d);
  return earned;
}
function waiting(id) {
  return load(id).pending.length + outbox().filter(e => e.actor === id).length;
}

/* ---------- recording play and settings ---------- */
function recordRound({world, letter, misses = 0, hinted = false}) {
  const id = activeId();
  if (!id || !WORLDS.includes(world) || !LETTERS.includes(letter)) return {saved: false, newBadges: []};
  const before = badges(id);
  const d = load(id);
  d.pending.push({id: uuid(), world, letter, misses: Math.max(0, Math.min(99, misses | 0)), hinted: !!hinted, at: Date.now()});
  const saved = save(id, d);
  const after = badges(id);
  const newBadges = BADGES.filter(b => after[b.key] && !before[b.key]);
  emit('change', {id});
  if (newBadges.length) emit('badges', {id, badges: newBadges});
  soon(id, 1500);
  return {saved, newBadges};
}
// A settings edit by `actor` for each person in `targets`.
function setSettings(actor, targets, changes) {
  const box = outbox(), t = Date.now();
  for (const profile of targets) for (const [field, v] of Object.entries(changes)) {
    box.push({n: uuid(), actor, profile, field, v, t});
  }
  const ok = write(KEY.outbox, box);
  emit('change', {id: actor});
  soon(actor, 800);
  return ok;
}
function settle(sent) {
  const done = new Set(sent.map(e => e.n));
  write(KEY.outbox, outbox().filter(e => !done.has(e.n)));
  // Mirror the server's rule so the copy shown here matches it straight away.
  const byProfile = {};
  for (const e of sent) (byProfile[e.profile] ||= []).push(e);
  for (const [profile, edits] of Object.entries(byProfile)) {
    const d = load(profile);
    for (const e of edits) {
      const cur = d.snap.settings[e.field];
      if (!cur || e.t > cur.t) d.snap.settings[e.field] = {v: e.v, t: e.t};
    }
    save(profile, d);
  }
}
// After a grown-up resets someone's progress, play from before then no longer
// counts: the server ignores it, so this device lets it go too.
function prune(d, from) {
  if (!from) return d;
  d.pending = d.pending.filter(r => r.at >= from);
  for (const [key, t] of Object.entries(d.localBadges)) if (t < from) delete d.localBadges[key];
  return d;
}
function adopt(id, state) {
  if (!state || !state.profile) return;
  const d = load(id);
  if (!d.snap.server_time || state.server_time >= d.snap.server_time) d.snap = state;
  save(id, prune(d, state.progress_from));
  const p = person(id);
  const picture = state.profile.picture || null;
  if (p && (p.name !== state.profile.name || p.avatar !== state.profile.avatar || (p.picture || null) !== picture)) {
    patchPerson(id, {name: state.profile.name, avatar: state.profile.avatar, picture});
  }
}

/* ---------- talking to Supabase ---------- */
const online = () => navigator.onLine !== false;
class LWError extends Error { constructor(code, message) { super(message || code); this.code = code; } }
async function request(path, body, token) {
  if (!CFG.url || !CFG.key) throw new LWError('not_set_up');
  if (!online()) throw new LWError('offline');
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  let res;
  try {
    res = await fetch(CFG.url + path, {method: 'POST', signal: ctrl.signal, cache: 'no-store',
      headers: {apikey: CFG.key, 'content-type': 'application/json', ...(token ? {authorization: 'Bearer ' + token} : {})},
      body: JSON.stringify(body || {})});
  } catch (e) { throw new LWError('offline'); } finally { clearTimeout(timer); }
  const text = await res.text().catch(() => '');
  let json = null; try { json = text ? JSON.parse(text) : null; } catch (e) { json = null; }
  return {status: res.status, ok: res.ok, body: json};
}
function failure(res) {
  const message = (res.body && (res.body.message || res.body.msg)) || `HTTP ${res.status}`;
  const code = (message.match(/LW:([a-z_]+)/) || [])[1] || (res.status === 401 ? 'signed_out' : res.status >= 500 ? 'server' : 'refused');
  return new LWError(code, message);
}
const locks = new Map();
function lock(name, fn) {
  if (navigator.locks && navigator.locks.request) return navigator.locks.request(name, fn);
  const run = (locks.get(name) || Promise.resolve()).then(fn, fn);
  locks.set(name, run.catch(() => {}));
  return run;
}
function keepSession(id, s) {
  patchPerson(id, {session: {access: s.access_token, refresh: s.refresh_token, exp: s.expires_at || Math.floor(Date.now() / 1000) + (s.expires_in || 3600)}, needsSignIn: false});
}
async function accessToken(id, force = false) {
  return lock('lw-auth-' + id, async () => {
    const p = person(id);
    if (!p || !p.session) throw new LWError('signed_out');
    if (!force && p.session.exp * 1000 - 60000 > Date.now()) return p.session.access;
    const res = await request('/auth/v1/token?grant_type=refresh_token', {refresh_token: p.session.refresh});
    if (res.ok) { keepSession(id, res.body); return res.body.access_token; }
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      patchPerson(id, {session: null, needsSignIn: true});
      emit('change', {id});
      throw new LWError('signed_out');
    }
    throw failure(res);
  });
}
async function api(id, fn, args) {
  let token = id ? await accessToken(id) : null;
  let res = await request('/rest/v1/rpc/' + fn, args, token);
  if (res.status === 401 && id) { token = await accessToken(id, true); res = await request('/rest/v1/rpc/' + fn, args, token); }
  if (!res.ok) throw failure(res);
  return res.body;
}

/* ---------- signing in ---------- */
const cleanLogin = login => String(login || '').trim().toLowerCase();
const hex = buf => [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join('');
// A salted check kept on this device so someone who signed in here before can
// sign in again while offline. Their play uploads with their saved session.
async function stretch(password, salt) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 120000}, base, 256));
}
async function makeVerifier(password) {
  if (!crypto.subtle) return null;
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  return {salt, hash: await stretch(password, salt)};
}
async function signIn(login, password, {as = 'player', keep = false} = {}) {
  login = cleanLogin(login); password = String(password || '');
  let res;
  try { res = await request('/auth/v1/token?grant_type=password', {email: login + DOMAIN, password}); }
  catch (e) {
    if (e.code !== 'offline') throw e;
    return offlineSignIn(login, password, {as, keep});
  }
  if (!res.ok) {
    const code = res.body && res.body.error_code;
    if (res.status === 400 && (code === 'invalid_credentials' || code === 'invalid_grant' || !code)) throw new LWError('bad_login');
    if (res.status === 429) throw new LWError('slow_down');
    if (res.status >= 500 || res.status === 0) return offlineSignIn(login, password, {as, keep});
    throw failure(res);
  }
  const s = res.body, id = s.user.id;
  const me = await request('/rest/v1/rpc/lw_me', {}, s.access_token);
  if (!me.ok) throw failure(me);
  const verifier = await makeVerifier(password).catch(() => null);
  const old = person(id) || {};
  savePerson({...old, id, login: me.body.login, name: me.body.name, avatar: me.body.avatar, picture: me.body.picture || null, role: me.body.role,
    verifier: verifier || old.verifier || null, lastUsed: Date.now(), needsSignIn: false,
    session: {access: s.access_token, refresh: s.refresh_token, exp: s.expires_at || Math.floor(Date.now() / 1000) + (s.expires_in || 3600)}});
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  return begin(id, {as, keep, offline: false});
}
async function offlineSignIn(login, password, opts) {
  const p = Object.values(people()).find(x => x.login === login);
  if (!p || !p.verifier || !crypto.subtle) throw new LWError('needs_internet');
  if (await stretch(password, p.verifier.salt) !== p.verifier.hash) throw new LWError('bad_login');
  return begin(p.id, {...opts, offline: true});
}
function begin(id, {as, keep, offline}) {
  if (as === 'grownup' && person(id).role !== 'grownup') throw new LWError('grownups_only');
  setActive(id, {keep, slot: as === 'grownup' ? KEY.corner : KEY.active});
  // `ready` settles once this device has the person's latest settings (or couldn't get them).
  const ready = sync(id).catch(() => {});
  return {...publicPerson(person(id)), offline, ready};
}
function endTurn(slot = KEY.active) { setActive(null, {slot}); }
// A grown-up who is playing opens their corner from the game in one tap: the same
// session, in this tab, past the reading gate (the corner's own `lw:gate-ok`).
// Children are never let in here, and the corner's functions refuse them anyway.
function enterCorner(id) {
  const p = person(id);
  if (!p || p.role !== 'grownup' || !p.session || activeId() !== id) return false;
  tabSet(KEY.corner, id); tabSet('lw:gate-ok', id);
  emit('active', {id, slot: KEY.corner});
  return true;
}
// Removes a person's copy from this device. Refused while anything waits to upload.
async function forget(id) {
  if (waiting(id)) throw new LWError('still_waiting');
  const p = person(id);
  if (p && p.session) request('/auth/v1/logout', {}, p.session.access).catch(() => {});
  const all = people(); delete all[id]; write(KEY.people, all); drop(dataKey(id));
  for (const slot of [KEY.active, KEY.corner]) if (tabGet(slot) === id || read(slot, null) === id) endTurn(slot);
  emit('change', {id});
}

/* ---------- children's pictures on this device's sign-in ---------- */
// A grown-up can choose to show their children's pictures in the sign-in
// dialog here (names and pictures only; each child still types a password).
// The corner refreshes the copy whenever that grown-up opens it.
drop('lw:boards'); // the accounts build kept group boards here, by code
function shown() { return read(KEY.shown, []); }
function showHere(by, children) {
  const list = (children || []).map(c => ({id: c.id, login: c.login, name: c.name, avatar: c.avatar, picture: c.picture || null}));
  write(KEY.shown, [{by, children: list, at: Date.now()}, ...shown().filter(x => x.by !== by)].slice(0, 20));
}
function hideHere(by) { write(KEY.shown, shown().filter(x => x.by !== by)); }

/* ---------- sync ---------- */
const syncing = new Set(), lastError = {};
async function sync(id) {
  if (!id || !person(id)) return {skipped: 'unknown'};
  return lock('lw-sync-' + id, async () => {
    const p = person(id);
    if (!p || !p.session) return {skipped: 'signed_out'};
    if (!online()) return {skipped: 'offline'};
    syncing.add(id); emit('status', {id});
    try {
      // Settings for many children go up in batches; each settles as it lands.
      const mine = outbox().filter(e => e.actor === id);
      for (let i = 0; i < mine.length; i += SETTINGS_BATCH) {
        const batch = mine.slice(i, i + SETTINGS_BATCH);
        await api(id, 'lw_put_settings', {p_changes: batch.map(({profile, field, v, t}) => ({profile, field, v, t}))});
        settle(batch);
      }
      let more = true, sent = 0;
      while (more) {
        const d = load(id), batch = d.pending.slice(0, MAX_UPLOAD);
        badges(id);
        const known = load(id).snap.badges || {};
        const earned = Object.entries(load(id).localBadges).filter(([key, t]) => !(known[key] <= t)).map(([key, t]) => ({key, t}));
        const state = await api(id, 'lw_sync', {p_profile: id, p_rounds: batch, p_settings: [], p_badges: earned, p_device: deviceId});
        const fresh = load(id), done = new Set(batch.map(r => r.id));
        fresh.pending = fresh.pending.filter(r => !done.has(r.id));
        fresh.snap = state; fresh.syncedAt = Date.now();
        save(id, prune(fresh, state.progress_from));
        adopt(id, state);
        sent += batch.length;
        more = batch.length === MAX_UPLOAD && fresh.pending.length > 0;
      }
      delete lastError[id];
      return {sent};
    } catch (e) {
      lastError[id] = e.code || 'error';
      throw e;
    } finally {
      syncing.delete(id);
      emit('status', {id}); emit('change', {id});
    }
  });
}
// Everyone on this device with something waiting, plus whoever is signed in.
function syncAll() {
  const ids = new Set([activeId(), activeId(KEY.corner)].filter(Boolean));
  for (const p of Object.values(people())) if (waiting(p.id)) ids.add(p.id);
  return Promise.allSettled([...ids].map(id => sync(id)));
}
const timers = {};
function soon(id, ms) {
  clearTimeout(timers[id]);
  timers[id] = setTimeout(() => { sync(id).catch(() => {}); }, ms);
}
function status(id) {
  const p = person(id), d = id ? load(id) : null;
  return {online: online(), waiting: id ? waiting(id) : 0, syncing: syncing.has(id), syncedAt: d && d.syncedAt,
    error: lastError[id] || null, needsSignIn: !p || !p.session || !!p.needsSignIn};
}
window.addEventListener('online', () => { syncAll(); emit('status', {}); });
window.addEventListener('offline', () => emit('status', {}));
document.addEventListener('visibilitychange', () => { if (!document.hidden) syncAll(); });
setInterval(() => { if (!document.hidden && online()) syncAll(); }, SYNC_EVERY);
setTimeout(() => syncAll(), 0);

// The game shell works offline once a page has been opened over http(s).
if (SELF && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !CFG.noServiceWorker) {
  // `updateViaCache: 'none'`: the browser always asks the server for a new sw.js.
  const start = () => navigator.serviceWorker.register(new URL('../sw.js', SELF), {scope: new URL('../', SELF).pathname, updateViaCache: 'none'}).catch(() => {});
  if (document.readyState === 'complete') start(); else window.addEventListener('load', start);
}

window.LW = {
  WORLDS, LETTERS, BADGES, DOMAIN, deviceId, Error: LWError, get storageOK() { return storageOK; },
  configured: !!(CFG.url && CFG.key), on, list, person: id => publicPerson(person(id)),
  player: () => publicPerson(person(activeId())), playerId: () => activeId(),
  grownup: () => publicPerson(person(activeId(KEY.corner))), grownupId: () => activeId(KEY.corner),
  keptGrownup: () => read(KEY.corner, null) === activeId(KEY.corner) && !!activeId(KEY.corner),
  signIn, endTurn, endCorner: () => endTurn(KEY.corner), enterCorner, forget,
  values, settingsOf, setSettings, progress, summary, badges, recordRound, adopt,
  lettersIn: (id, world) => Object.entries(progress(id)[world] || {}).filter(([, c]) => c.n > 0).map(([l]) => l),
  shown, showHere, hideHere, isShownHere: by => shown().some(x => x.by === by),
  cache: (key, value) => value === undefined ? read('lw:cache:' + key, null) : write('lw:cache:' + key, value),
  sync, syncAll, status, api: (id, fn, args) => api(id, fn, args)
};
})();
