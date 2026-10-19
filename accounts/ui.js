(() => {
'use strict';
const $ = id => document.getElementById(id);
const A = window.ACCOUNTS;
let roster = [], classes = [], memberships = [], rosterFor = null, rosterVersion = 0, switchingOwner = false;
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
  choices('.class-choice', classes, item => item.name);
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
      try { await A.selectOwner(child); $('progress').scrollIntoView({block: 'start'}); notice(`Opened ${child.display_name}'s notebook. You are still signed in as ${A.profile.display_name}.`); }
      catch (error) { notice(errorText(error), true); }
      finally {
        switchingOwner = false; open.disabled = false;
        $('settings-link').inert = false;
        $('settings-link').removeAttribute('aria-disabled');
      }
    });
    item.append(copy, open); list.append(item);
  }
  $('roster-status').textContent = roster.length ? `${roster.length} linked ${roster.length === 1 ? 'child' : 'children'} · ${classes.length} ${classes.length === 1 ? 'group' : 'groups'}` : 'No children linked yet. Make a login below, or link one from another grown-up.';
  const classList = $('classes-list'); classList.replaceChildren();
  for (const classroom of classes) {
    const item = element('li');
    const names = memberships.filter(member => member.class_id === classroom.id).map(member => roster.find(child => child.id === member.child_id)?.display_name).filter(Boolean);
    item.append(element('strong', classroom.name), element('small', names.length ? names.join(' · ') : 'No children assigned yet.'));
    classList.append(item);
  }
  if (!classes.length) classList.append(element('li', 'No groups yet. Create one below when you need it.'));
}
async function loadRoster() {
  const profile = A.profile;
  if (!profile || profile.role !== 'grownup') return;
  const version = ++rosterVersion;
  $('roster-status').textContent = 'Opening your kids and groups…';
  try {
    const [links, ownedClasses] = await Promise.all([
      A.rest(`guardians?adult_id=eq.${encodeURIComponent(profile.id)}&select=child_id`),
      A.rest(`classes?owner_id=eq.${encodeURIComponent(profile.id)}&select=id,name,owner_id&order=name`)
    ]);
    const ids = links.map(link => link.child_id);
    const children = ids.length ? await A.rest(`profiles?id=in.(${ids.map(encodeURIComponent).join(',')})&select=*&order=display_name`) : [];
    const members = ownedClasses.length ? await A.rest(`class_children?class_id=in.(${ownedClasses.map(item => encodeURIComponent(item.id)).join(',')})&select=class_id,child_id`) : [];
    if (version !== rosterVersion || A.profile?.id !== profile.id) return;
    roster = children; classes = ownedClasses; memberships = members;
    renderRoster();
  } catch (error) {
    if (version === rosterVersion) $('roster-status').textContent = `Kids and groups need a connection. ${errorText(error)}`;
  }
}
function render() {
  const profile = A.profile;
  const signedIn = Boolean(A.session && profile);
  $('signed-out').hidden = signedIn;
  $('signed-in').hidden = !signedIn;
  document.querySelectorAll('[data-adult]').forEach(node => { node.hidden = !signedIn || profile.role !== 'grownup'; });
  if (!signedIn) {
    rosterFor = null; roster = []; classes = []; rosterVersion++;
    notice('Sign in to open your notebook.');
    return;
  }
  const owner = A.owner || profile;
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
  notice(owner.id === profile.id ? `Welcome, ${profile.display_name}. Your notebook is ready.` : `Viewing ${owner.display_name}'s notebook. Playing uses ${profile.display_name}'s login.`);
}
if (!A) { notice('Accounts could not open. Reload this page when you are online.', true); return; }
wireForm('signin-form', fields => A.signIn(fields.handle.trim(), fields.password, {role:'grownup'}), 'Signed in. Your notebook is ready.');
wireForm('register-form', fields => A.register({...fields, handle: fields.handle.trim()}), 'Your grown-up account is ready.');
wireForm('create-child-form', async fields => {
  if (!fields.class_id) delete fields.class_id;
  fields.handle = fields.handle.trim();
  await A.manage('create-child', fields); await loadRoster();
}, 'Child account created. Keep their login name and password wherever they play.');
wireForm('link-child-form', async fields => { await A.manage('link-child', {...fields, handle: fields.handle.trim()}); await loadRoster(); }, 'Child linked. Their existing progress stays in the same notebook.');
wireForm('reset-password-form', fields => A.manage('reset-child-password', fields), 'Password changed. Use the new password next time this child signs in.');
wireForm('own-password-form', fields => A.changePassword(fields.password), 'Your password changed. Use the new password next time you sign in.');
wireForm('create-class-form', async fields => {
  await A.rest('classes', {method: 'POST', body: {id: crypto.randomUUID(), owner_id: A.profile.id, name: fields.name.trim()}});
  await loadRoster();
}, 'Group created. You can add children to it below.');
wireForm('assign-class-form', async fields => { await A.rest('class_children', {method: 'POST', body: fields}); await loadRoster(); }, 'Child added to the group.');
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
