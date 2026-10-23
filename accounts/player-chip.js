/* Small picture in the game header. The theme chooser stays where it is.
 * A child can sign out. A child cannot change their name here.
 * A grown-up's picture opens a menu: Kids, and My account.
 * The menu closes on an outside tap and when the screen changes.
 */
(function (root) {
  'use strict';
  const Pictures = () => root.LittleWoofPictures;
  const Store = () => root.LittleWoofStore;
  const Client = () => root.LittleWoofClient;

  function guest() {
    try { return sessionStorage.getItem('lw-guest') === '1'; } catch (error) { return false; }
  }
  function person() {
    const store = Store();
    return store ? store.readActive() : null;
  }
  function face(holder, active) {
    holder.replaceChildren();
    const image = active && active.avatarImage;
    if (image && /^data:image\/(jpeg|png|webp|gif);base64,/i.test(image)) {
      const img = document.createElement('img');
      img.alt = '';
      img.src = image;
      holder.append(img);
      return;
    }
    const pictures = Pictures();
    if (pictures && pictures.isPicture(active && active.avatar)) {
      const img = document.createElement('img');
      img.alt = '';
      img.src = pictures.src(active.avatar);
      holder.append(img);
      return;
    }
    const mark = document.createElement('span');
    mark.className = 'chip-mark';
    mark.textContent = (active && active.displayName || '?').slice(0, 1);
    holder.append(mark);
  }
  async function signOutKid() {
    const client = Client();
    const store = Store();
    try { if (client) await client.syncNow(); } catch (error) { /* keep the queued copy */ }
    if (store) {
      store.clearActive();
      store.clearProjection();
    }
    if (client) client.setLearner(null);
    try {
      const user = client ? await client.sessionUser() : null;
      if (user && client.roleOf(user) === 'child') await client.signOut();
    } catch (error) { /* already signed out */ }
    location.href = '../index.html';
  }
  function closeMenus() {
    const menu = document.getElementById('chip-menu');
    if (menu) menu.remove();
    const opener = document.querySelector('.player-chip[aria-expanded="true"]');
    if (opener) opener.setAttribute('aria-expanded', 'false');
    const dialog = document.getElementById('kid-sheet');
    if (dialog && dialog.open) dialog.close();
  }
  function kidSheet(active) {
    let dialog = document.getElementById('kid-sheet');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'kid-sheet';
      dialog.innerHTML = '<p class="chip-name"></p><p class="chip-note">Your grown-up looks after your name.</p><form method="dialog" class="chip-actions"><button value="stay" class="secondary">Keep playing</button><button value="out" class="primary" id="kid-sign-out">All done</button></form>';
      document.body.append(dialog);
      dialog.addEventListener('click', event => {
        if (event.target === dialog) dialog.close();
      });
      dialog.addEventListener('close', () => {
        if (dialog.returnValue === 'out') signOutKid();
      });
    }
    dialog.querySelector('.chip-name').textContent = active.displayName || 'Hello';
    if (!dialog.open) dialog.showModal();
  }
  function toggleGrownMenu(button) {
    const existing = document.getElementById('chip-menu');
    if (existing) {
      existing.remove();
      button.setAttribute('aria-expanded', 'false');
      return;
    }
    const menu = document.createElement('div');
    menu.id = 'chip-menu';
    menu.className = 'chip-menu';
    menu.innerHTML = '<a href="../grown-ups/index.html">Kids</a><a href="../grown-ups/account.html">My account</a>';
    button.parentElement.append(menu);
    button.setAttribute('aria-expanded', 'true');
  }
  function mount() {
    const slot = document.getElementById('player-chip');
    if (!slot) return;
    slot.replaceChildren();
    const active = person();
    if (guest() || !active) {
      const note = document.createElement('span');
      note.className = 'visit-note';
      note.textContent = 'Not saved';
      slot.append(note);
      return;
    }
    const grown = active.role && active.role !== 'child';
    const control = document.createElement('button');
    control.type = 'button';
    control.className = 'player-chip';
    if (grown) {
      control.setAttribute('aria-label', 'Your picture, Kids, and My account');
      control.setAttribute('aria-expanded', 'false');
      control.addEventListener('click', event => {
        event.stopPropagation();
        toggleGrownMenu(control);
      });
    } else {
      control.setAttribute('aria-label', 'Your picture and sign out');
      control.addEventListener('click', () => kidSheet(active));
    }
    face(control, active);
    slot.append(control);
  }

  document.addEventListener('little-woof-screen', closeMenus);
  document.addEventListener('pointerdown', event => {
    const menu = document.getElementById('chip-menu');
    if (!menu) return;
    if (menu.contains(event.target) || (event.target.closest && event.target.closest('.player-chip'))) return;
    closeMenus();
  });

  root.LittleWoofChip = {mount, closeMenus};
})(typeof globalThis !== 'undefined' ? globalThis : this);
