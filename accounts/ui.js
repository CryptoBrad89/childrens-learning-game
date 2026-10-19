(() => {
'use strict';
const $ = id => document.getElementById(id);
const A = window.ACCOUNTS;
let roster = [], rosterFor = null, rosterVersion = 0, switchingOwner = false;
const worlds = {post: "Lucy's Letter Post", space: "Lucy's Moonboat", silk: "Ribbon Road"};
const notice = (message, error = false) => {
  $('account-status').textContent = message;
  $('account-status').classList.toggle('error', error);
};
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function errorText(error) { return error && error.message ? error.message : 'That did not work. Please try again.'; }
function wireForm(id, action, success) {
  const form = $(id);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (form.getAttribute('aria-busy') === 'true') return;
    const output = form.querySelector('.form-result');
    const button = form.querySelector('button[type="submit"]');
    output.classList.remove('error');
    output.textContent = 'One moment…';
    form.setAttribute('aria-busy', 'true'); button.disabled = true;
    const fields = Object.fromEntries(new FormData(form));
    try {
      await action(fields);
      output.textContent = success;
      form.reset();
      if (id === 'create-child-form') $('avatar-preview').hidden = true;
    } catch (error) {
      output.textContent = errorText(error);
      output.classList.add('error');
    } finally {
      form.removeAttribute('aria-busy'); button.disabled = false;
      form.querySelectorAll('input[type="password"]').forEach(input => { input.value = ''; });
    }
  });
}
function choices(selector, records, label) {
  document.querySelectorAll(selector).forEach(select => {
    const selected = select.value;
    const first = select.options[0].cloneNode(true);
    select.replaceChildren(first);
    records.forEach(record => {
      const option = element('option', label(record));
      option.value = record.id; select.append(option);
    });
    if (records.some(record => record.id === selected)) select.value = selected;
  });
}
function renderRoster() {
  choices('.child-choice', roster, child => `${child.display_name} (${child.handle})`);
  const list = $('children-list'); list.replaceChildren();
  for (const child of roster) {
    const item = element('li');
    const copy = element('div');
    copy.append(element('strong', child.display_name), element('small', `Login: ${child.handle}`));
    const open = element('button', 'Open notebook', 'quiet-button');
    open.type = 'button'; open.setAttribute('aria-label', `Open ${child.display_name}'s notebook`);
    open.addEventListener('click', async () => {
      if (switchingOwner) return;
      switchingOwner = true; open.disabled = true;
      $('settings-link').inert = true;
      $('settings-link').setAttribute('aria-disabled', 'true');
      try { await A.selectOwner(child); $('progress').scrollIntoView({block: 'start'}); notice(`Opened ${child.display_name}'s notebook.`); }
      catch (error) { notice(errorText(error), true); }
      finally {
        switchingOwner = false; open.disabled = false;
        $('settings-link').inert = false;
        $('settings-link').removeAttribute('aria-disabled');
      }
    });
    const avatar = element('span', child.avatar || '🐶', 'child-avatar');
    if (child.avatar?.startsWith('data:image/')) { const picture = element('img'); picture.src = child.avatar; picture.alt = ''; avatar.replaceChildren(picture); }
    item.append(avatar, copy, open); list.append(item);
  }
  $('roster-status').textContent = roster.length ? `${roster.length} linked ${roster.length === 1 ? 'child' : 'children'}` : 'No children linked yet. Make a login below, or link an existing child.';
}
async function loadRoster() {
  const profile = A.profile;
  if (!profile || profile.role !== 'grownup') return;
  const version = ++rosterVersion;
  $('roster-status').textContent = 'Opening your kids…';
  try {
    const links = await A.rest(`guardians?adult_id=eq.${encodeURIComponent(profile.id)}&select=child_id`);
    const ids = links.map(link => link.child_id);
    const children = ids.length ? await A.rest(`profiles?id=in.(${ids.map(encodeURIComponent).join(',')})&select=*&order=display_name`) : [];
    if (version !== rosterVersion || A.profile?.id !== profile.id) return;
    roster = children;
    renderRoster();
  } catch (error) {
    if (version === rosterVersion) $('roster-status').textContent = `Kids need a connection. ${errorText(error)}`;
  }
}
function render() {
  const profile = A.profile;
  const signedIn = Boolean(A.session && profile);
  $('signed-out').hidden = signedIn;
  $('signed-in').hidden = !signedIn;
  document.querySelectorAll('[data-adult]').forEach(node => { node.hidden = !signedIn || profile.role !== 'grownup'; });
  if (!signedIn) {
    rosterFor = null; roster = []; rosterVersion++;
    document.querySelector('.title').textContent = 'Grown-up portal';
    notice('Sign in to manage your kids.');
    return;
  }
  const owner = A.owner || profile;
  const adult = profile.role === 'grownup';
  document.querySelectorAll('[data-child]').forEach(node => { node.hidden = adult; });
  document.querySelector('.title').textContent = adult ? 'Grown-up portal' : 'Your notebook';
  $('progress').hidden = adult && owner.id === profile.id;
  $('progress-link').hidden = adult && owner.id === profile.id;
  $('back-to-me').textContent = adult ? 'Close child notebook' : 'Back to my notebook';
  const snapshot = A.snapshot || {};
  const rounds = snapshot.rounds || [];
  $('identity-title').textContent = profile.display_name;
  $('login-name').textContent = `Login: ${profile.handle} · ${profile.role === 'child' ? 'Child' : 'Grown-up'}`;
  $('owner-label').textContent = owner.id === profile.id ? `This notebook belongs to ${profile.display_name}.` : `Viewing ${owner.display_name}'s notebook · login ${owner.handle}`;
  $('progress-title').lastChild.textContent = owner.id === profile.id ? 'Your progress' : `${owner.display_name}'s progress`;
  $('back-to-me').hidden = owner.id === profile.id;
  $('round-count').textContent = String(snapshot.count ?? rounds.length);
  $('letter-total').textContent = String(new Set(rounds.map(round => round.letter).filter(Boolean)).size);
  const worldList = $('world-progress'); worldList.replaceChildren();
  for (const [key, name] of Object.entries(worlds)) {
    const item = element('li');
    item.append(element('b', name), element('strong', String(rounds.filter(round => round.world === key).length)), element('span', 'rounds completed'));
    worldList.append(item);
  }
  const achievements = $('achievements'); achievements.replaceChildren();
  (snapshot.achievements?.length ? snapshot.achievements : ['Your first milestone is waiting. Play a round to begin.']).forEach(text => achievements.append(element('li', text)));
  $('sync-status').textContent = A.status || 'Your notebook is open.';
  if (rosterFor !== profile.id && profile.role === 'grownup') { rosterFor = profile.id; loadRoster(); }
  notice(owner.id === profile.id ? `Welcome, ${profile.display_name}. ${adult ? 'Manage your kids below.' : 'Your notebook is ready.'}` : `Viewing ${owner.display_name}'s notebook.`);
}
if (!A) { notice('Accounts could not open. Reload this page when you are online.', true); return; }
async function avatarPicture(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url;
    try { await image.decode(); } catch { throw new Error('Choose a picture this browser can open.'); }
    const canvas = document.createElement('canvas');
    const ratio = Math.min(1, 256 / Math.max(image.width, image.height));
    canvas.width = Math.max(1, Math.round(image.width * ratio)); canvas.height = Math.max(1, Math.round(image.height * ratio));
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff8e5'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', .85);
  } finally { URL.revokeObjectURL(url); }
}
$('avatar-upload').addEventListener('change', async () => {
  const preview = $('avatar-preview'); preview.hidden = true;
  if (!$('avatar-upload').files.length) return;
  try { preview.src = await avatarPicture($('avatar-upload').files[0]); preview.hidden = false; }
  catch (error) { $('avatar-upload').value = ''; notice(errorText(error), true); }
});
document.querySelectorAll('[name="avatar"]').forEach(input => input.addEventListener('change', () => {
  $('avatar-upload').value = ''; $('avatar-preview').hidden = true;
}));
wireForm('signin-form', fields => A.signIn(fields.handle.trim(), fields.password, {role:'grownup'}), 'Signed in. Your notebook is ready.');
wireForm('create-grownup-form', fields => A.manage('create-grownup', {...fields, handle: fields.handle.trim()}), 'Grown-up account created. Share their login with them.');
wireForm('create-child-form', async fields => {
  delete fields.avatar_file;
  if ($('avatar-upload').files.length) fields.avatar = await avatarPicture($('avatar-upload').files[0]);
  fields.handle = fields.handle.trim();
  await A.manage('create-child', fields); await loadRoster();
}, 'Child account created. Keep their login name and password wherever they play.');
wireForm('link-child-form', async fields => { await A.manage('link-child', {...fields, handle: fields.handle.trim()}); await loadRoster(); }, 'Child linked. Their existing progress stays in the same notebook.');
wireForm('reset-password-form', fields => A.manage('reset-child-password', fields), 'Password changed. Use the new password next time this child signs in.');
wireForm('own-password-form', fields => A.changePassword(fields.password), 'Your password changed. Use the new password next time you sign in.');
$('sync-now').addEventListener('click', async () => {
  $('sync-now').disabled = true;
  try { await A.sync(); if (A.profile?.role === 'grownup') await loadRoster(); render(); }
  catch (error) { notice(errorText(error), true); }
  finally { $('sync-now').disabled = false; }
});
$('back-to-me').addEventListener('click', async () => {
  try { await A.selectOwner(A.profile); render(); }
  catch (error) { notice(errorText(error), true); }
});
$('sign-out').addEventListener('click', async () => {
  $('sign-out').disabled = true;
  try {
    await A.signOut(); render();
    notice('Signed out. Anything waiting to sync is kept for this same login. The next person can sign in now.');
    $('signin-form').elements.handle.focus();
  } catch (error) { notice(errorText(error), true); }
  finally { $('sign-out').disabled = false; }
});
A.subscribe(render);
Promise.resolve(A.ready).then(render).catch(error => {
  render(); notice(errorText(error), true);
});
})();
