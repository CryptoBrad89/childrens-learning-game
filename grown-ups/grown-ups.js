/* Grown-ups' corner: a real grown-up sign-in, then settings that save as they
 * change, for one child, a whole class or home, or the grown-up themselves.
 * A grown-up who stays signed in on their own device passes the reading gate
 * to come back in. Children and groups are handled in people.js. */
(() => {
'use strict';
const G = window.GROWN_UPS, L = window.LW, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const PRESETS = {all: G.ALL, starter: [...'SATPIN'], vowels: [...'AEIOU']};
const PAUSE_MS = 10000, GATE_OK = 'lw:gate-ok';
let code = [], typed = [], misses = 0, pausedUntil = 0, checking = false, sample = null;

/* ---------- shared with people.js ---------- */
const C = window.CORNER = {
  me: () => L.grownup(),
  groups: () => (C.me() && L.cache('groups:' + C.me().id)) || [],
  target: null,
  // The people a settings change goes to.
  ids(target = C.target) {
    if (!target || target.kind === 'me') return [C.me().id];
    if (target.kind === 'child') return [target.id];
    const g = C.groups().find(x => x.id === target.id);
    return g ? g.members.filter(m => m.member_role === 'child').map(m => m.id) : [];
  },
  label(target = C.target) {
    if (!target || target.kind === 'me') return 'you';
    if (target.kind === 'child') return target.name;
    const g = C.groups().find(x => x.id === target.id);
    return g ? `everyone in ${g.name}` : 'this group';
  },
  render: () => {}, renderTarget, setTarget, refresh: async () => {},
  // Until a grown-up picks someone, settings go to their first class or home.
  retarget() { if (!C.chosen || !C.ids().length) { C.chosen = false; C.target = defaultTarget(); } }
};

/* ---------- views ---------- */
function show(view) {
  $('#signin').hidden = view !== 'signin';
  $('#gate').hidden = view !== 'gate';
  const settings = $('#settings');
  settings.hidden = view !== 'settings';
  document.body.dataset.view = view;
  const label = view === 'settings' ? (L.keptGrownup() ? 'Lock and go to games' : 'Sign out and go to games') : 'Back to the games';
  $$('#leave .fill-label').forEach(el => { el.textContent = label; });
  if (view === 'settings') {
    requestAnimationFrame(() => { settings.dataset.open = 'true'; });
  } else delete settings.dataset.open;
}
function start() {
  const me = C.me();
  if (!me) { show('signin'); signinMode(); return; }
  let passed = false;
  try { passed = sessionStorage.getItem(GATE_OK) === me.id; } catch (e) { passed = false; }
  if (L.keptGrownup() && !passed) { $('#gate-name').textContent = me.name; newChallenge(); show('gate'); return; }
  openSettings();
}
function openSettings() {
  const me = C.me();
  G.apply(G.load(me.id));
  $('#hello').textContent = `Signed in as ${me.name} (${me.login}). Changes save straight away and follow each person to every device.`;
  if (!C.target) C.retarget();
  show('settings');
  renderTarget(); render(); C.render();
  $('#sheet').focus({preventScroll: true}); window.scrollTo({top: 0});
  C.refresh().then(() => { C.retarget(); renderTarget(); render(); C.render(); });
}
function defaultTarget() {
  const g = C.groups().find(x => x.members.some(m => m.member_role === 'child'));
  return g ? {kind: 'group', id: g.id} : {kind: 'me'};
}

/* ---------- sign-in ---------- */
const mode = () => document.querySelector('input[name="signin-mode"]:checked').value;
function signinMode() {
  const fresh = mode() === 'new';
  $('#name-field').hidden = !fresh;
  $('#signin-go').textContent = fresh ? 'Make my account' : 'Sign in';
  $('#login-help').textContent = fresh ? 'Pick one to type when you sign in: 3 to 32 letters, numbers, dots or dashes, like ms-lee.' : 'The name you chose when you made your account.';
  $('#signin-password').autocomplete = fresh ? 'new-password' : 'current-password';
  $('#signin-mode .segments').style.setProperty('--index', fresh ? 1 : 0);
  $('#signin-status').textContent = '';
  $('#signin-offline').hidden = navigator.onLine !== false;
}
const SIGNIN_ERRORS = {
  bad_login: 'That sign-in name and password don\'t match. Check both and try again.',
  grownups_only: 'That\'s a child\'s account. Children sign in from the games page.',
  login_taken: 'That sign-in name is taken. Try adding a number or your initials.',
  login_shape: 'Sign-in names use 3 to 32 letters, numbers, dots or dashes, starting with a letter or number.',
  password_short: 'Passwords need at least six characters.',
  password_long: 'That password is too long. Use 72 characters or fewer.',
  needs_internet: 'This device is offline, and you haven\'t signed in here before. Connect to the internet once, then try again.',
  offline: 'This device is offline. Making an account needs the internet.',
  slow_down: 'Too many tries in a row. Wait a minute, then try again.'
};
async function signin(e) {
  e.preventDefault();
  const login = $('#signin-login').value.trim(), password = $('#signin-password').value, status = $('#signin-status'), go = $('#signin-go');
  if (!login) { status.textContent = 'Type your sign-in name.'; $('#signin-login').focus(); return; }
  if (password.length < 6) { status.textContent = SIGNIN_ERRORS.password_short; $('#signin-password').focus(); return; }
  go.disabled = true; status.textContent = mode() === 'new' ? 'Making your account…' : 'Signing in…';
  try {
    if (mode() === 'new') await L.signUp(login, password, $('#signin-display').value.trim());
    await L.signIn(login, password, {as: 'grownup', keep: $('#signin-keep').checked});
    try { sessionStorage.setItem(GATE_OK, C.me().id); } catch (err) { /* gate shows again next time */ }
    $('#signin-password').value = '';
    openSettings();
  } catch (err) {
    status.textContent = SIGNIN_ERRORS[err.code] || 'Couldn\'t reach the sign-in service just now. Check the internet connection and try again.';
  } finally { go.disabled = false; }
}
function signout() {
  L.endCorner();
  try { sessionStorage.removeItem(GATE_OK); } catch (e) { /* nothing kept */ }
  C.target = null; C.chosen = false;
  show('signin'); signinMode();
  $('#signin-login').focus();
}

/* ---------- gate (for a grown-up who stays signed in) ---------- */
function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy;
}
// No easy runs (1-2-3, 9-8-7): those are what small fingers tap by chance.
function easyRun([a, b, c]) { return (b - a === 1 && c - b === 1) || (a - b === 1 && b - c === 1); }
function newChallenge() {
  do code = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 3); while (easyRun(code));
  typed = [];
  $('#challenge').innerHTML = code.map(n => `<span>${WORDS[n]}</span>`).join('<i aria-hidden="true">·</i>');
  $('#challenge').setAttribute('aria-label', code.map(n => WORDS[n]).join(', '));
  renderSlots();
}
function renderSlots() {
  $$('#slots span').forEach((slot, i) => {
    const filled = i < typed.length;
    slot.textContent = filled ? String(typed[i]) : '';
    slot.classList.toggle('filled', filled);
  });
}
function setPaused(on) {
  $$('#keypad button').forEach(b => { b.disabled = on; });
  $('#keypad').toggleAttribute('data-paused', on);
}
function press(digit) {
  if (checking || Date.now() < pausedUntil || typed.length >= 3) return;
  typed.push(digit); renderSlots();
  if (typed.length === 3) check();
}
function check() {
  checking = true;
  if (typed.every((d, i) => d === code[i])) { checking = false; unlock(); return; }
  misses++;
  $('#slots').classList.remove('wrong'); void $('#slots').offsetWidth; $('#slots').classList.add('wrong');
  if (misses % 3 === 0) {
    pausedUntil = Date.now() + PAUSE_MS; setPaused(true); typed = []; renderSlots();
    $('#gate-status').textContent = 'Not quite. Let\'s pause for 10 seconds, then try a new set of numbers.';
    setTimeout(() => { setPaused(false); checking = false; newChallenge(); $('#gate-status').textContent = 'Ready. Here is a new set of numbers.'; }, PAUSE_MS);
  } else {
    $('#gate-status').textContent = 'Not quite. Here is a new set of numbers to tap.';
    setTimeout(() => { checking = false; newChallenge(); }, 650);
  }
}
function unlock() {
  try { sessionStorage.setItem(GATE_OK, C.me().id); } catch (e) { /* this visit only */ }
  openSettings();
}
function buildKeypad() {
  $('#keypad').innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button type="button" data-digit="${n}" aria-label="${WORDS[n]}">${n}</button>`).join('');
  $('#keypad').addEventListener('click', e => { const b = e.target.closest('[data-digit]'); if (b) press(Number(b.dataset.digit)); });
  document.addEventListener('keydown', e => {
    if (!$('#gate').hidden && /^[1-9]$/.test(e.key)) { e.preventDefault(); press(Number(e.key)); }
    else if (!$('#gate').hidden && e.key === 'Backspace' && !checking) { typed.pop(); renderSlots(); }
  });
}

/* ---------- whose settings ---------- */
function renderTarget() {
  const me = C.me(); if (!me) return;
  const options = [`<option value="me">Me (${esc(me.name)})</option>`];
  for (const g of C.groups()) {
    const kids = g.members.filter(m => m.member_role === 'child');
    if (!kids.length) continue;
    options.push(`<optgroup label="${esc(g.name)}"><option value="group:${g.id}">Everyone in ${esc(g.name)} (${kids.length})</option>${kids.map(k => `<option value="child:${k.id}">${esc(k.name)}</option>`).join('')}</optgroup>`);
  }
  $('#target').innerHTML = options.join('');
  const t = C.target || {kind: 'me'};
  $('#target').value = t.kind === 'me' ? 'me' : `${t.kind}:${t.id}`;
  if (!$('#target').value) { C.target = {kind: 'me'}; $('#target').value = 'me'; }
  const n = C.ids().length;
  $('#target-note').textContent = C.target.kind === 'group'
    ? `Changes go to all ${n} ${n === 1 ? 'child' : 'children'}. Shown: ${firstName()}'s current settings.`
    : C.target.kind === 'me' ? 'Your own settings, for when you play.' : `Changes go to ${C.target.name} only.`;
  $('#confirm-who').textContent = C.label();
}
const esc = s => window.LW_PICTURES ? window.LW_PICTURES.esc(s) : String(s);
function firstName() {
  const id = C.ids()[0];
  for (const g of C.groups()) { const m = g.members.find(x => x.id === id); if (m) return m.name; }
  return 'the first child';
}
function setTarget(target) {
  C.target = target; C.chosen = true; renderTarget(); render(); C.render();
}

/* ---------- settings ---------- */
const current = () => ({...G.settings, letters: [...G.settings.letters], games: [...G.settings.games]});
function render() {
  if (!C.me()) return;
  G.settings = G.load(C.ids()[0] || C.me().id);
  const s = G.settings;
  $$('input[data-setting]').forEach(input => {
    const name = input.dataset.setting;
    if (input.type === 'checkbox') input.checked = s[name];
    else if (input.type === 'radio') input.checked = Number(input.value) === s[name];
    else input.value = s[name];
  });
  $('#volume-value').textContent = `${s.volume}%`;
  $('#volume').style.setProperty('--fill', `${s.volume}%`);
  $('#volume').setAttribute('aria-valuetext', `${s.volume} percent`);
  $$('[data-game]').forEach(input => { input.checked = s.games.includes(input.dataset.game); });
  $$('#letter-grid button').forEach(b => b.setAttribute('aria-pressed', String(s.letters.includes(b.dataset.letter))));
  for (const [name, set] of Object.entries(PRESETS)) {
    $(`[data-preset="${name}"]`).setAttribute('aria-pressed', String(set.length === s.letters.length && set.every(l => s.letters.includes(l))));
  }
  const n = s.letters.length;
  $('#letter-count').textContent = n === 26 ? 'All 26 letters are in play.' : `${n} of 26 letters in play: ${s.letters.join(' ').toLowerCase()}.`;
  const checked = [...$$('#hint input')].findIndex(input => input.checked);
  $('#hint .segments').style.setProperty('--index', Math.max(0, checked));
}
function commit(next, message) {
  const ids = C.ids(), diff = G.changes(G.settings, next);
  const ok = !Object.keys(diff).length || L.setSettings(C.me().id, ids, diff);
  render();
  const status = $('#save-status');
  // Alternate a trailing space so screen readers announce a repeated message.
  status.dataset.flip = status.dataset.flip === '1' ? '0' : '1';
  const who = C.target.kind === 'me' ? 'you' : C.target.kind === 'child' ? C.target.name : `all ${ids.length} children in ${C.label().replace(/^everyone in /, '')}`;
  const text = (message || `Saved for ${who}.`) + (navigator.onLine === false ? ' It uploads when this device is back online.' : '');
  status.textContent = ok ? text + (status.dataset.flip === '1' ? ' ' : '') : 'Couldn\'t save. This browser is blocking storage, which often happens in private windows. Open the corner in a normal window and try again.';
  status.classList.toggle('error', !ok);
  if (ok) stamp();
  C.render();
}
function stamp() {
  const el = $('#stamp');
  el.classList.remove('landed'); void el.offsetWidth; el.classList.add('landed');
}
function refuse(message) {
  const status = $('#save-status');
  status.textContent = message; status.classList.add('error');
  render();
}
function bindSettings() {
  $('#letter-grid').innerHTML = G.ALL.map(l => `<button type="button" data-letter="${l}" aria-pressed="true" aria-label="Letter ${l}">${l}<small>${l.toLowerCase()}</small></button>`).join('');
  document.addEventListener('change', e => {
    const input = e.target;
    if (input.id === 'target') {
      const [kind, id] = input.value.split(':');
      let target = {kind};
      if (kind !== 'me') {
        target.id = id;
        if (kind === 'child') for (const g of C.groups()) { const m = g.members.find(x => x.id === id); if (m) target.name = m.name; }
      }
      setTarget(target); return;
    }
    if (input.name === 'signin-mode') { signinMode(); return; }
    if (!C.me() || $('#settings').hidden) return;
    const next = current();
    if (input.dataset.setting) {
      const name = input.dataset.setting;
      next[name] = input.type === 'checkbox' ? input.checked : Number(input.value);
      commit(next);
    } else if (input.dataset.game) {
      next.games = input.checked ? [...next.games, input.dataset.game] : next.games.filter(g => g !== input.dataset.game);
      if (!next.games.length) { refuse('Keep at least one world on, so there is something to play.'); return; }
      commit(next);
    }
  });
  $('#volume').addEventListener('input', e => {
    $('#volume-value').textContent = `${e.target.value}%`;
    e.target.style.setProperty('--fill', `${e.target.value}%`);
  });
  $('#letter-grid').addEventListener('click', e => {
    const b = e.target.closest('[data-letter]'); if (!b) return;
    const next = current(), l = b.dataset.letter;
    next.letters = next.letters.includes(l) ? next.letters.filter(x => x !== l) : [...next.letters, l];
    if (!next.letters.length) { refuse('Keep at least one letter, so there is something to play.'); return; }
    commit(next);
  });
  $('.presets').addEventListener('click', e => {
    const b = e.target.closest('[data-preset]'); if (!b) return;
    commit({...current(), letters: [...PRESETS[b.dataset.preset]]});
  });
  $('#sample').addEventListener('click', playSample);
  const dialog = $('#confirm');
  $('#reset').addEventListener('click', () => { dialog.showModal(); $('#confirm-reset').focus(); });
  dialog.addEventListener('close', () => {
    if (dialog.returnValue === 'reset') commit({...G.DEFAULTS}, `Settings are back to how they started for ${C.label()}.`);
    $('#reset').focus();
  });
}
async function playSample() {
  const A = window.GAME_AUDIO; if (!A) return;
  if (sample) { sample.pause(); sample = null; }
  const volume = G.settings.volume / 100, button = $('#sample');
  button.setAttribute('aria-busy', 'true');
  for (const file of [A.letters.A.name, A.letters.A.sound]) {
    const clip = new Audio(file); clip.volume = volume; sample = clip;
    const ok = await new Promise(resolve => { clip.onended = () => resolve(true); clip.onerror = () => resolve(false); clip.play().catch(() => resolve(false)); });
    if (!ok || sample !== clip) break;
  }
  button.removeAttribute('aria-busy');
}

/* ---------- wiring ---------- */
function dots() {
  const n = $('#signin-password').value.length;
  $$('#signin-dots i').forEach((dot, i) => dot.classList.toggle('on', i < n));
  $('#signin-dots span').textContent = n >= 6 ? 'Long enough' : `${6 - n} more`;
}
$('#signin-form').addEventListener('submit', signin);
$('#signin-password').addEventListener('input', dots);
$('#signin-show').addEventListener('click', e => {
  const input = $('#signin-password'), shown = input.type === 'password';
  input.type = shown ? 'text' : 'password'; e.target.textContent = shown ? 'Hide' : 'Show'; e.target.setAttribute('aria-pressed', String(shown));
});
$('#gate-signout').addEventListener('click', signout);
$('#signout').addEventListener('click', signout);
$('#leave').addEventListener('click', () => {
  if (C.me() && !L.keptGrownup()) L.endCorner();
  try { sessionStorage.removeItem(GATE_OK); } catch (e) { /* nothing kept */ }
});
window.addEventListener('online', signinMode); window.addEventListener('offline', signinMode);
L.on('change', () => { if (!$('#settings').hidden && !document.querySelector('dialog[open]')) { render(); C.render(); } });

buildKeypad(); bindSettings(); dots();
// people.js (loaded next) fills in the children, progress and device parts first.
document.addEventListener('DOMContentLoaded', start);
})();
