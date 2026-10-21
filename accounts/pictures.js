/* Six approved Lucy pictures, cropped square with the face in frame.
 * Paths are relative to the page so they work on the home screen,
 * in a world, and in the grown-ups' corner. Uploads stay separate.
 */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LittleWoofPictures = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';
  const PICTURES = [
    {id: 'garden', label: 'Garden', file: 'garden.jpg'},
    {id: 'nap', label: 'Nap', file: 'nap.jpg'},
    {id: 'mail', label: 'Mailbox', file: 'mail.jpg'},
    {id: 'leap', label: 'Leap', file: 'leap.jpg'},
    {id: 'wave', label: 'Wave', file: 'wave.jpg'},
    {id: 'nudge', label: 'Nudge', file: 'nudge.jpg'}
  ];
  const IDS = PICTURES.map(item => item.id);
  const BY_ID = Object.fromEntries(PICTURES.map(item => [item.id, item]));

  function prefix() {
    const path = (root && root.location && root.location.pathname) || '';
    if (/\/grown-ups\//.test(path) || /\/v\d-/.test(path)) return '../';
    return '';
  }
  function src(id) {
    const item = BY_ID[id];
    return item ? `${prefix()}accounts/pictures/${item.file}` : '';
  }
  function isPicture(id) { return !!BY_ID[id]; }

  return {PICTURES, IDS, src, isPicture};
});
