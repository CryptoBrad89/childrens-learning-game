/* Inside a world: shows who is playing in the footer, with "I'm done", and a
 * sticker toast when a round earns one. Nothing shows for play without saving. */
(() => {
'use strict';
const L = window.LW, P = window.LW_PICTURES, me = L && L.player();
if (!me || !P) return;
const footer = document.querySelector('#footer');
if (footer) {
  const chip = document.createElement('span');
  chip.className = 'lw-player';
  chip.innerHTML = `${P.avatar(me.avatar)}<span>${P.esc(me.name)}</span><a href="../index.html" id="lw-done">I'm done</a>`;
  footer.insertBefore(chip, footer.lastElementChild);
  chip.querySelector('#lw-done').addEventListener('click', () => L.endTurn());
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
