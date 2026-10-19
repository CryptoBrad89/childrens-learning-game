/* Pictures for people and stickers. Avatars reuse the game's own word pictures
 * (art.js) on a soft color, so no new character art is needed; stickers are
 * small drawn stamps with a typographic mark. */
(() => {
'use strict';
const AVATARS = ['cat', 'duck', 'fish', 'goat', 'kite', 'nest', 'octopus', 'pig', 'rabbit', 'sun',
  'tiger', 'umbrella', 'van', 'yak', 'zebra', 'apple', 'ball', 'moon', 'jellyfish', 'fox'];
const TONES = ['#b9dce6', '#f6e3a1', '#ffd2eb', '#c9ecd9', '#f9c9b0', '#d9d0f5'];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
function parse(avatar) {
  const [pic, tone] = String(avatar || 'sun').split(':');
  return {pic: AVATARS.includes(pic) ? pic : 'sun', tone: Math.min(5, Math.max(0, Number(tone) || 0))};
}
function avatar(value, {label = ''} = {}) {
  const {pic, tone} = parse(value), art = window.draw ? window.draw(pic) : '';
  return `<span class="lw-avatar" style="--tone:${TONES[tone]}"${label ? ` role="img" aria-label="${esc(label)}"` : ' aria-hidden="true"'}>${art}</span>`;
}
// A stamp edge: a circle with sixteen bumps.
const edge = (() => {
  let d = '';
  for (let i = 0; i <= 64; i++) {
    const a = i / 64 * Math.PI * 2, r = 29 + (i % 4 === 0 ? 2.2 : i % 2 ? .6 : -.8);
    d += `${i ? 'L' : 'M'}${(32 + r * Math.cos(a)).toFixed(2)} ${(32 + r * Math.sin(a)).toFixed(2)}`;
  }
  return d + 'Z';
})();
// Text marks, or drawn ones (no emoji: they render differently on every device).
const DRAWN = {
  star: '<path d="m32 17 4.4 9.6 10.5 1.2-7.8 7.1 2.2 10.4L32 40l-9.3 5.3 2.2-10.4-7.8-7.1 10.5-1.2Z" fill="currentColor"/>',
  mail: '<path d="M19 23h26v19H19Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="m19 23 13 10 13-10" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>',
  moon: '<path d="M38 17c-11 1-17 13-11 22 4 6 12 8 18 5-12 0-17-15-7-27Z" fill="currentColor"/>',
  heart: '<path d="M32 45C14 34 19 18 27 21l5 4 5-4c8-3 13 13-5 24Z" fill="currentColor"/>'
};
const MARKS = {
  'first-sound': ['1st', '#b9dce6'], 'five-letters': ['5', '#f6e3a1'], 'satpin': ['sat', '#ffd2eb'],
  'vowels': ['aei', '#c9ecd9'], 'three-worlds': ['3', '#d9d0f5'], 'ten-rounds': ['10', '#f9c9b0'],
  'sharp-ears': [DRAWN.star, '#f6e3a1'], 'fifty-rounds': ['50', '#b9dce6'], 'all-post': [DRAWN.mail, '#f9c9b0'],
  'all-space': [DRAWN.moon, '#d9d0f5'], 'all-silk': [DRAWN.heart, '#ffd2eb'], 'alphabet': ['az', '#c9ecd9']
};
function sticker(key, earned = true) {
  const [mark, fill] = MARKS[key] || [DRAWN.star, '#f6e3a1'], drawn = mark.startsWith('<');
  const size = mark.length > 2 ? 17 : mark.length > 1 ? 21 : 27;
  const inner = drawn ? mark : `<text x="32" y="${(32 + size * .36).toFixed(1)}" text-anchor="middle" font-family="Nunito, system-ui, sans-serif" font-weight="900" font-size="${size}" fill="currentColor">${mark}</text>`;
  return `<svg class="lw-sticker${earned ? '' : ' unearned'}" viewBox="0 0 64 64" aria-hidden="true"><path d="${edge}" fill="${earned ? fill : 'none'}" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"${earned ? '' : ' stroke-dasharray="3 4"'}/><circle cx="32" cy="32" r="21" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".45"/>${inner}</svg>`;
}
// Sync status in words, for the grown-up watching.
function syncState(st) {
  if (!st) return ['saved', ''];
  if (st.needsSignIn && st.waiting) return ['attention', 'Sign in again to finish saving'];
  if (!st.online) return ['offline', st.waiting ? 'Saved on this device. Uploads when back online' : 'Offline. Everything is saved'];
  if (st.syncing) return ['busy', 'Saving…'];
  if (st.waiting) return ['waiting', 'Saved on this device. Uploading soon'];
  return ['saved', 'All saved'];
}
window.LW_PICTURES = {AVATARS, TONES, avatar, sticker, parse, esc, syncState};
})();
