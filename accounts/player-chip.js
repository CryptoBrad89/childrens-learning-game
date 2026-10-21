/* Small picture in the game header. The theme chooser stays where it is.
 * A child can sign out. A child cannot change their name here.
 * A grown-up's picture opens My account.
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
  function kidSheet(active) {
    let dialog = document.getElementById('kid-sheet');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'kid-sheet';
      dialog.innerHTML = '<p class="chip-name"></p><p class="chip-note">Your grown-up looks after your name.</p><form method="dialog" class="chip-actions"><button value="stay" class="secondary">Keep playing</button><button value="out" class="primary" id="kid-sign-out">All done</button></form>';
      document.body.append(dialog);
      dialog.addEventListener('close', () => {
        if (dialog.returnValue === 'out') signOutKid();
      });
    }
    dialog.querySelector('.chip-name').textContent = active.displayName || 'Hello';
    dialog.showModal();
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
    const control = document.createElement(grown ? 'a' : 'button');
    control.className = 'player-chip';
    if (grown) {
      control.href = '../grown-ups/account.html';
      control.setAttribute('aria-label', 'My account');
    } else {
      control.type = 'button';
      control.setAttribute('aria-label', 'Your picture and sign out');
      control.addEventListener('click', () => kidSheet(active));
    }
    face(control, active);
    slot.append(control);
  }

  root.LittleWoofChip = {mount};
})(typeof globalThis !== 'undefined' ? globalThis : this);
