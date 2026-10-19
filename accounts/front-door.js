/* The chooser's front door: "Who's playing?", class boards, password step,
 * and the player strip above the worlds. */
(() => {
'use strict';
const L = window.LW, P = window.LW_PICTURES, G = window.GROWN_UPS;
const $ = s => document.querySelector(s), esc = P.esc;
const GUEST = 'lw:guest';
let board = null, pending = null;

const guest = () => { try { return sessionStorage.getItem(GUEST) === '1'; } catch (e) { return false; } };
const setGuest = on => { try { if (on) sessionStorage.setItem(GUEST, '1'); else sessionStorage.removeItem(GUEST); } catch (e) { /* this visit only */ } };

const MESSAGES = {
  bad_login: 'That password doesn\'t match. Check it with the grown-up who set it up, then try again.',
  needs_internet: 'This device is offline, and this is the first time signing in here. Connect to the internet once, then try again.',
  offline: 'This device is offline. Connect to the internet, then try again.',
  slow_down: 'Too many tries in a row. Wait a minute, then try again.',
  no_board: 'No class or home has that code. Check the six letters and numbers, then try again.',
  not_set_up: 'Accounts aren\'t set up in this copy of the game.',
  storage: 'This browser is blocking storage (often a private window), so nothing can be saved here.'
};
const message = e => MESSAGES[e && e.code] || 'Couldn\'t reach the sign-in service just now. Check the internet connection and try again.';

function tile(p, i) {
  return `<li style="--i:${i}"><button type="button" class="person" data-login="${esc(p.login)}" data-id="${esc(p.id || '')}" data-name="${esc(p.name)}" data-avatar="${esc(p.avatar)}">
    ${P.avatar(p.avatar)}<span class="name">${esc(p.name)}</span>${p.waiting ? '<i class="wait" title="Play waiting to upload"></i><span class="sr-only">, play waiting to upload</span>' : ''}</button></li>`;
}
function renderWho() {
  const players = L.list().filter(p => p.played).sort((a, b) => (a.role === 'child' ? 0 : 1) - (b.role === 'child' ? 0 : 1));
  $('#people').innerHTML = players.map(tile).join('');
  $('#people').hidden = !players.length;
  $('#who-empty').hidden = !!players.length;
  $('#who-lead').textContent = players.length ? 'Tap your picture.' : 'A grown-up can help you sign in.';
  $('#saved-boards').innerHTML = L.boards().map(b => `<button type="button" class="board-link" data-code="${esc(b.code)}">${boardIcon()}${esc(b.name)}</button>`).join('');
}
const boardIcon = () => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="2"/><circle cx="15.5" cy="10" r="2"/><path d="M5.5 16c.6-1.6 1.7-2.4 3-2.4s2.4.8 3 2.4m1 0c.6-1.6 1.7-2.4 3-2.4s2.4.8 3 2.4"/></svg>';
function renderBoard() {
  $('#board-title').textContent = board.name;
  $('#board-code').textContent = (board.kind === 'home' ? 'Home code ' : 'Class code ') + board.code;
  $('#board-people').innerHTML = board.children.map(tile).join('');
  $('#board-note').textContent = board.children.length
    ? (board.offline ? 'Offline: showing the pictures saved on this device. ' : '') + 'Each child signs in with their own password.'
    : 'No children in this group yet. A grown-up can add them in the grown-ups\' corner.';
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
  const me = L.player(), isGuest = !me && guest();
  G.settings = G.load(); G.apply(G.settings);
  if (window.applyWorlds) window.applyWorlds();
  $('#playing').hidden = !me;
  $('#guest-bar').hidden = !isGuest;
  $('nav').hidden = !(me || isGuest);
  $('#who').hidden = !!(me || isGuest || board);
  $('#board').hidden = !!(me || isGuest || !board);
  if (me) renderPlaying();
  else if (board) renderBoard();
  else if (!isGuest) renderWho();
}

/* ---------- password step ---------- */
function dots(input, holder) {
  const n = input.value.length;
  holder.querySelectorAll('i').forEach((dot, i) => dot.classList.toggle('on', i < n));
  holder.querySelector('span').textContent = n >= 6 ? 'Ready' : `${6 - n} more`;
}
function askPassword(p) {
  pending = p;
  const d = $('#pw-dialog');
  $('#pw-avatar').innerHTML = P.avatar(p.avatar);
  $('#pw-title').textContent = p.name;
  $('#pw-helper').textContent = `Grown-up: type ${p.name}'s password.`;
  $('#pw-input').value = ''; $('#pw-input').type = 'password'; $('#pw-show').textContent = 'Show';
  $('#pw-error').textContent = ''; $('#pw-keep').checked = false;
  dots($('#pw-input'), $('#pw-dots')); $('#pw-go').disabled = true;
  d.showModal(); $('#pw-input').focus();
}
async function submit(form, login, password, keep, errorEl, button) {
  button.disabled = true; button.textContent = 'Checking…'; errorEl.textContent = '';
  try {
    await L.signIn(login, password, {as: 'player', keep});
    setGuest(false); board = null;
    form.closest('dialog').close();
    render();
    window.scrollTo({top: 0});
    $('#playing-name').focus({preventScroll: true});
  } catch (e) {
    errorEl.textContent = message(e);
  } finally {
    button.textContent = 'Let\'s play'; button.disabled = password.length < 6;
  }
}

/* ---------- wiring ---------- */
document.addEventListener('click', async e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.matches('.person')) askPassword(t.dataset);
  else if (t.matches('.board-link[data-code]')) openBoard(t.dataset.code);
  else if (t.id === 'open-board') { $('#code-input').value = ''; $('#code-error').textContent = ''; $('#code-dialog').showModal(); $('#code-input').focus(); }
  else if (t.id === 'name-sign-in') { $('#name-input').value = ''; $('#name-pw').value = ''; $('#name-error').textContent = ''; dots($('#name-pw'), $('#name-dots')); $('#name-go').disabled = true; $('#name-dialog').showModal(); $('#name-input').focus(); }
  else if (t.id === 'just-play') { setGuest(true); render(); $('nav a:not([hidden])')?.focus(); }
  else if (t.id === 'guest-who') { setGuest(false); render(); $('#who-title').focus(); }
  else if (t.id === 'board-back') { board = null; render(); $('#who-title').focus(); }
  else if (t.id === 'board-forget') { L.forgetBoard(board.code); board = null; render(); }
  else if (t.id === 'done') { L.endTurn(); setGuest(false); render(); $('#who-title').focus(); }
  else if (t.id === 'sticker-button') openStickers();
  else if (t.id === 'pw-show' || t.id === 'name-show') {
    const input = t.id === 'pw-show' ? $('#pw-input') : $('#name-pw');
    input.type = input.type === 'password' ? 'text' : 'password';
    t.textContent = input.type === 'password' ? 'Show' : 'Hide'; t.setAttribute('aria-pressed', String(input.type === 'text'));
  } else if (t.dataset.close) t.closest('dialog').close();
});
async function openBoard(code, errorEl) {
  try {
    board = await L.board(code);
    if (errorEl) errorEl.closest('dialog').close();
    render(); $('#board-title').focus();
  } catch (e) {
    if (errorEl) errorEl.textContent = message(e);
    else { board = null; render(); }
  }
}
$('#pw-input').addEventListener('input', e => { dots(e.target, $('#pw-dots')); $('#pw-go').disabled = e.target.value.length < 6; });
$('#name-pw').addEventListener('input', e => { dots(e.target, $('#name-dots')); $('#name-go').disabled = e.target.value.length < 6; });
$('#pw-form').addEventListener('submit', e => {
  e.preventDefault();
  if ($('#pw-input').value.length < 6) return;
  submit(e.target, pending.login, $('#pw-input').value, $('#pw-keep').checked, $('#pw-error'), $('#pw-go'));
});
$('#name-form').addEventListener('submit', e => {
  e.preventDefault();
  if ($('#name-pw').value.length < 6 || !$('#name-input').value.trim()) return;
  submit(e.target, $('#name-input').value, $('#name-pw').value, $('#name-keep').checked, $('#name-error'), $('#name-go'));
});
$('#code-form').addEventListener('submit', e => {
  e.preventDefault();
  const code = L.cleanCode($('#code-input').value);
  if (code.length !== 6) { $('#code-error').textContent = 'Codes have six letters and numbers.'; return; }
  openBoard(code, $('#code-error'));
});
function openStickers() {
  const me = L.player(); if (!me) return;
  const earned = L.badges(me.id);
  $('#book-title').textContent = `${me.name}'s stickers`;
  $('#book').innerHTML = L.BADGES.map(b => `<li class="${earned[b.key] ? 'earned' : ''}">${P.sticker(b.key, !!earned[b.key])}<strong>${esc(b.title)}</strong><small>${earned[b.key] ? esc(b.about) : 'Not yet'}</small></li>`).join('');
  $('#book-dialog').showModal();
}
L.on('change', () => { if (!document.querySelector('dialog[open]')) render(); else if (L.player()) renderPlaying(); });
L.on('status', () => { if (L.player()) renderPlaying(); });
render();
})();
