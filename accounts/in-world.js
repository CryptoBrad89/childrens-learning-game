/* Inside a world: the player's picture at the top right, opening a small menu
 * (a grown-up also gets their corner and account there; a child never does), who is
 * playing in the footer with "I'm done", and a sticker toast when a round earns one.
 * Play without saving shows a small reminder that nothing is kept. */
(() => {
'use strict';
const L = window.LW, P = window.LW_PICTURES, me = L && L.player();
const footer = document.querySelector('#footer');
let unsaved = false;
try { unsaved = sessionStorage.getItem('lw:guest') === '1'; } catch (e) { unsaved = false; }
if (!me && unsaved && footer) {
  const note = document.createElement('span');
  note.className = 'lw-unsaved'; note.textContent = 'Playing without saving';
  footer.insertBefore(note, footer.lastElementChild);
}
if (!me || !P) return;
if (footer) {
  const chip = document.createElement('span');
  chip.className = 'lw-player';
  chip.innerHTML = `${P.avatar(me)}<span>${P.esc(me.name)}</span><a href="../index.html" id="lw-done">I'm done</a>`;
  footer.insertBefore(chip, footer.lastElementChild);
  chip.querySelector('#lw-done').addEventListener('click', () => L.endTurn());
}
const end = document.querySelector('#header .header-end');
if (end) {
  const grownup = me.role === 'grownup', box = document.createElement('div');
  box.className = 'lw-profile';
  box.innerHTML = `<button type="button" class="lw-profile-button" id="lw-profile" aria-haspopup="menu" aria-expanded="false" aria-controls="lw-menu" aria-label="${P.esc(me.name)}: menu">${P.avatar(me)}</button>`
    + `<div class="lw-menu" id="lw-menu" role="menu" aria-labelledby="lw-profile" hidden><p class="lw-menu-name">${P.avatar(me)}<span>${P.esc(me.name)}</span></p>`
    + (grownup ? `<a role="menuitem" href="../grown-ups/index.html" data-corner>Grown-ups' corner<small>Your children and their settings</small></a><a role="menuitem" href="../grown-ups/index.html#you" data-corner>My account<small>Your sign-in and password</small></a>` : '')
    + `<a role="menuitem" href="../index.html" data-done>I'm done</a></div>`;
  end.append(box);
  const button = box.querySelector('button'), menu = box.querySelector('.lw-menu');
  const open = () => { menu.hidden = false; button.setAttribute('aria-expanded', 'true'); menu.querySelector('a').focus(); };
  // The menu never stays open across screens: it closes on any change of screen,
  // a tap outside it, Escape, following a link, or leaving the page.
  const close = (refocus = false) => {
    if (menu.hidden) return;
    menu.hidden = true; button.setAttribute('aria-expanded', 'false');
    if (refocus) button.focus();
  };
  button.addEventListener('click', () => { if (menu.hidden) open(); else close(); });
  menu.addEventListener('click', e => {
    const a = e.target.closest('a'); if (!a) return;
    // A grown-up goes straight into their corner, with the session they're playing in.
    if (a.hasAttribute('data-corner') && grownup) L.enterCorner(me.id);
    if (a.hasAttribute('data-done')) L.endTurn();
    close();
  });
  menu.addEventListener('keydown', e => {
    if (!['ArrowDown', 'ArrowUp'].includes(e.key)) return;
    const items = [...menu.querySelectorAll('a')], i = items.indexOf(document.activeElement);
    e.preventDefault(); items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus();
  });
  document.addEventListener('lw:screen', () => close());
  document.addEventListener('pointerdown', e => { if (!box.contains(e.target)) close(); }, true);
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { e.stopImmediatePropagation(); close(true); } }, true);
  document.addEventListener('focusin', e => { if (!box.contains(e.target)) close(); });
  window.addEventListener('pagehide', () => close());
  document.addEventListener('visibilitychange', () => { if (document.hidden) close(); });
}
const queue = [];
let showing = false;
function next() {
  const b = queue.shift();
  if (!b) { showing = false; return; }
  showing = true;
  document.querySelector('.lw-toast')?.remove();
  const toast = document.createElement('div');
  toast.className = 'lw-toast'; toast.setAttribute('role', 'status');
  toast.innerHTML = `${P.sticker(b.key)}<span>New sticker: ${P.esc(b.title)}<small>${P.esc(b.about)}</small></span>`;
  document.body.append(toast);
  setTimeout(() => { toast.remove(); next(); }, 4300);
}
L.on('badges', ({badges}) => { queue.push(...badges); if (!showing) next(); });
})();
