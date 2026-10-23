/* Picture choices for children who cannot type their name. Drawn as ink shapes,
 * in the same palette as the chooser. Lucy's photos are never reused here.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LittleWoofAvatars = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const AVATARS = {
    pup: {label: 'Puppy', svg: '<circle cx="32" cy="36" r="16"/><circle cx="16" cy="18" r="8"/><circle cx="48" cy="18" r="8"/><circle cx="26" cy="34" r="2" fill="#fffaf0"/><circle cx="38" cy="34" r="2" fill="#fffaf0"/>'},
    fox: {label: 'Fox', svg: '<path d="M10 46 18 14l14 16L46 14l8 32-22 8Z"/><circle cx="26" cy="36" r="2" fill="#fffaf0"/><circle cx="38" cy="36" r="2" fill="#fffaf0"/>'},
    bear: {label: 'Bear', svg: '<circle cx="32" cy="36" r="16"/><circle cx="14" cy="16" r="8"/><circle cx="50" cy="16" r="8"/><ellipse cx="32" cy="40" rx="6" ry="4" fill="#fffaf0"/>'},
    owl: {label: 'Owl', svg: '<ellipse cx="32" cy="36" rx="16" ry="18"/><circle cx="25" cy="34" r="6" fill="#fffaf0"/><circle cx="39" cy="34" r="6" fill="#fffaf0"/><circle cx="25" cy="34" r="2"/><circle cx="39" cy="34" r="2"/>'},
    fish: {label: 'Fish', svg: '<ellipse cx="30" cy="32" rx="16" ry="10"/><path d="M46 32 58 22v20Z"/><circle cx="22" cy="30" r="2" fill="#fffaf0"/>'},
    star: {label: 'Star', svg: '<path d="m32 8 6 14 15 2-11 10 3 15-13-8-13 8 3-15L6 24l15-2Z"/>'},
    moon: {label: 'Moon', svg: '<path d="M36 10a20 20 0 1 0 14 34 16 16 0 1 1-14-34Z"/>'},
    boat: {label: 'Boat', svg: '<path d="M8 36h40l-6 14H16Z"/><path d="M28 36V16l16 10Z"/>'}
  };
  const IDS = Object.keys(AVATARS);
  function svg(id, title) {
    const avatar = AVATARS[id] || AVATARS.pup;
    const name = title || avatar.label;
    return `<svg viewBox="0 0 64 64" role="img" aria-label="${name}"><title>${name}</title><g fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${avatar.svg}</g></svg>`;
  }
  return {AVATARS, IDS, svg};
});
