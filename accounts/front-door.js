/* The chooser's home flow: splash, then the sign-in dialog (child first, with
 * "Play without saving" and "Are you a grown-up?"), then the layout picker with
 * Ribbon Road ready to go. */
(() => {
'use strict';
const L = window.LW, P = window.LW_PICTURES, G = window.GROWN_UPS;
const $ = s => document.querySelector(s), esc = P.esc;
const GUEST = 'lw:guest', SPLASHED = 'lw:splashed', DEFAULT_WORLD = 'silk';
const session = {
  get: k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { /* this page only */ } }
};
const guest = () => session.get(GUEST) === '1';
const setGuest = on => session.set(GUEST, on ? '1' : null);
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.hasAttribute('data-calm');

const MESSAGES = {
  bad_login: 'That sign-in name and password don\'t match. Check them with a grown-up, then try again.',
  needs_internet: 'This device is offline, and this is the first time signing in here. Connect to the internet once, then try again.',
  offline: 'This device is offline. Connect to the internet, then try again.',
  slow_down: 'Too many tries in a row. Wait a minute, then try again.',
  not_set_up: 'Accounts aren\'t set up in this copy of the game.'
};
const message = e => MESSAGES[e && e.code] || 'Couldn\'t reach the sign-in service just now. Check the internet connection and try again.';

/* ---------- splash ---------- */
// Plays once per visit. A <video> placed inside #splash later is played to its end
// (up to 20 seconds); until then the short card shows briefly.
function splash() {
  const el = $('#splash');
  if (session.get(SPLASHED)) return Promise.resolve();
  session.set(SPLASHED, '1');
  el.hidden = false; document.body.dataset.home = 'splash';
  const video = el.querySelector('video');
  const wait = video
    ? new Promise(resolve => { video.addEventListener('ended', resolve, {once: true}); video.addEventListener('error', resolve, {once: true}); video.play().catch(resolve); setTimeout(resolve, 20000); })
    : new Promise(resolve => setTimeout(resolve, calm() ? 500 : 1400));
  return wait.then(() => new Promise(resolve => {
    el.classList.add('leaving');
    setTimeout(() => { el.hidden = true; el.classList.remove('leaving'); resolve(); }, calm() ? 0 : 260);
  }));
}
function wordmark() {
  const name = $('#splash-name'), text = name.textContent;
  name.innerHTML = [...text].map((c, i) => `<span style="--i:${i}">${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('');
}

/* ---------- sign-in dialog ---------- */
// People who played on this device, then pictures a grown-up chose to show here.
function tiles() {
  const seen = new Set(), out = [];
  for (const p of L.list().filter(x => x.played)) { seen.add(p.login); out.push(p); }
  for (const b of L.boards()) for (const c of b.children || []) if (!seen.has(c.login)) { seen.add(c.login); out.push(c); }
  return out;
}
function renderTiles() {
  const list = tiles();
  $('#tiles-wrap').hidden = !list.length;
  $('#people').innerHTML = list.map((p, i) => `<li style="--i:${i}"><button type="button" class="person" data-login="${esc(p.login)}" aria-pressed="false">
    ${P.avatar(p.avatar)}<span class="name">${esc(p.name)}</span>${p.waiting ? '<i class="wait" title="Play waiting to upload"></i><span class="sr-only">, play waiting to upload</span>' : ''}</button></li>`).join('');
}
function dots() {
  const n = $('#login-pw').value.length;
  $('#login-dots').querySelectorAll('i').forEach((dot, i) => dot.classList.toggle('on', i < n));
  $('#login-dots span').textContent = n >= 6 ? 'Ready' : `${6 - n} more`;
  $('#login-go').disabled = n < 6 || !$('#login-name').value.trim();
}
function openLogin() {
  document.body.dataset.home = 'login';
  render();
  renderTiles();
  $('#login-name').value = '';
  $('#login-pw').value = ''; $('#login-pw').type = 'password'; $('#login-show').textContent = 'Show';
  $('#login-error').textContent = ''; $('#login-keep').checked = false;
  dots();
  const d = $('#login');
  if (!d.open) d.showModal();
  ($('#people .person') || $('#login-name')).focus();
}
async function signIn(e) {
  e.preventDefault();
  const login = $('#login-name').value.trim(), password = $('#login-pw').value, go = $('#login-go');
  if (password.length < 6 || !login) return;
  go.disabled = true; go.textContent = 'Checking…'; $('#login-error').textContent = '';
  try {
    const who = await L.signIn(login, password, {as: 'player', keep: $('#login-keep').checked});
    // On a device they haven't used before, wait briefly for their settings before showing the games.
    go.textContent = `Getting ${who.name}'s things…`;
    await Promise.race([who.ready, new Promise(resolve => setTimeout(resolve, 5000))]);
    setGuest(false);
    $('#login').close();
    showPicker();
  } catch (err) {
    $('#login-error').textContent = message(err);
  } finally { go.textContent = 'Let\'s play'; dots(); }
}

/* ---------- picker ---------- */
function defaultCard() {
  const shown = [...document.querySelectorAll('nav a[data-world]:not([hidden])')];
  return shown.find(a => a.dataset.world === DEFAULT_WORLD) || shown[0];
}
function renderPlaying() {
  const me = L.player();
  if (!me) return;
  $('#playing-avatar').innerHTML = P.avatar(me.avatar);
  $('#playing-name').textContent = me.name;
  const earned = L.badges(me.id), keys = L.BADGES.filter(b => earned[b.key]);
  $('#stickers').innerHTML = keys.slice(0, 6).map(b => `<span>${P.sticker(b.key)}</span>`).join('')
    + (keys.length > 6 ? `<span class="more">+${keys.length - 6}</span>` : '');
  $('#sticker-button').setAttribute('aria-label', `${keys.length} ${keys.length === 1 ? 'sticker' : 'stickers'}. Open the sticker book`);
  $('#sticker-count').textContent = keys.length ? '' : 'No stickers yet';
  const [state, text] = P.syncState(L.status(me.id));
  $('#playing-sync').dataset.state = state;
  $('#playing-sync span').textContent = text;
}
function render() {
  const me = L.player(), playing = !!(me || guest());
  G.settings = G.load(); G.apply(G.settings);
  if (window.applyWorlds) window.applyWorlds();
  $('header').hidden = !playing; $('nav').hidden = !playing;
  $('#playing').hidden = !me;
  $('#guest-bar').hidden = !(!me && guest());
  document.querySelectorAll('nav a[data-world]').forEach(a => a.classList.remove('is-default'));
  const card = defaultCard();
  if (card) card.classList.add('is-default');
  if (me) renderPlaying();
}
function showPicker() {
  document.body.dataset.home = 'picker';
  render();
  window.scrollTo({top: 0});
  const card = defaultCard();
  if (card) card.focus({preventScroll: true});
}

/* ---------- wiring ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.matches('#people .person')) {
    document.querySelectorAll('#people .person').forEach(b => b.setAttribute('aria-pressed', String(b === t)));
    $('#login-name').value = t.dataset.login; $('#login-error').textContent = '';
    dots(); $('#login-pw').focus();
  } else if (t.id === 'play-unsaved') {
    setGuest(true); $('#login').close(); showPicker();
  } else if (t.id === 'guest-signin') { setGuest(false); openLogin(); }
  else if (t.id === 'done') { L.endTurn(); setGuest(false); openLogin(); }
  else if (t.id === 'sticker-button') openStickers();
  else if (t.id === 'login-show') {
    const input = $('#login-pw'); input.type = input.type === 'password' ? 'text' : 'password';
    t.textContent = input.type === 'password' ? 'Show' : 'Hide'; t.setAttribute('aria-pressed', String(input.type === 'text'));
  }
});
$('#login-form').addEventListener('submit', signIn);
$('#login-pw').addEventListener('input', dots);
$('#login-name').addEventListener('input', () => {
  dots();
  document.querySelectorAll('#people .person').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.login === $('#login-name').value.trim().toLowerCase())));
});
// The sign-in is the front door: Escape doesn't close it onto an empty page.
$('#login').addEventListener('cancel', e => e.preventDefault());
function openStickers() {
  const me = L.player(); if (!me) return;
  const earned = L.badges(me.id);
  $('#book-title').textContent = `${me.name}'s stickers`;
  $('#book').innerHTML = L.BADGES.map(b => `<li class="${earned[b.key] ? 'earned' : ''}">${P.sticker(b.key, !!earned[b.key])}<strong>${esc(b.title)}</strong><small>${earned[b.key] ? esc(b.about) : 'Not yet'}</small></li>`).join('');
  $('#book-dialog').showModal();
}
L.on('change', () => {
  if (document.body.dataset.home === 'picker' && !document.querySelector('dialog[open]')) render();
  else if (L.player()) renderPlaying();
});
L.on('status', () => { if (L.player()) renderPlaying(); });
// Pictures a grown-up put on this device may have changed (new children, new names).
if (L.boards().length && navigator.onLine !== false) {
  Promise.allSettled(L.boards().map(b => L.board(b.code))).then(() => { if ($('#login').open) renderTiles(); });
}

wordmark();
if (L.player() || guest()) showPicker();
else splash().then(openLogin);
})();
