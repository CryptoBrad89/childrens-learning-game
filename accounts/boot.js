(() => {
'use strict';
if (location.protocol === 'file:') return;
const base=new URL('../',document.currentScript.src), A=window.ACCOUNTS;
const isHome=document.body.dataset.page==='home';
let offline=document.getElementById('offline-status');
const isAdmin=location.pathname.includes('/accounts/')||location.pathname.includes('/grown-ups/');
if(!offline&&isAdmin){offline=document.createElement('p');offline.id='offline-status';offline.setAttribute('role','status');document.querySelector('main')?.append(offline);}
if(isAdmin){
  const existing=document.getElementById('sign-out');
  const button=existing||document.createElement('button');
  button.id='sign-out';button.type='button';button.className='quiet-button auth-signout';button.textContent='Sign out';
  document.querySelector('.masthead')?.append(button);
  const update=()=>{button.hidden=!A.profile;};
  if(!existing)button.addEventListener('click',async()=>{button.disabled=true;await A.signOut();location.href=new URL('accounts/index.html',base).href;});
  A.subscribe(update);A.ready.then(update).catch(()=>{});update();
  if(new URL(location.href).searchParams.has('expired')){
    const note=document.createElement('p');note.className='notice';note.setAttribute('role','status');note.textContent='Signed out for safety. Please sign in again.';document.querySelector('main')?.prepend(note);
  }
}
if(!isHome&&!isAdmin){
  const style=document.createElement('style');
  style.textContent=`#account-strip{display:flex;align-items:center;gap:8px;margin-left:auto;font:700 14px/1.3 system-ui,sans-serif}#account-strip summary,#account-strip a,#account-strip button{display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;padding:6px 10px;border:1px solid var(--line);border-radius:12px;background:var(--surface);color:var(--ink);text-decoration:none;font:inherit;cursor:pointer}#account-strip details{position:relative}#account-strip .account-menu{position:absolute;right:0;top:100%;z-index:20;display:grid;gap:8px;padding:12px;min-width:190px;background:var(--surface);border:1px solid var(--line);border-radius:12px;box-shadow:0 8px 24px #0003}#account-strip img{width:32px;height:32px;object-fit:cover;border-radius:50%}#account-strip summary{font-size:26px;list-style:none}#account-strip [hidden]{display:none!important}#account-strip :focus-visible{outline:3px solid var(--focus);outline-offset:3px}.controls{gap:8px!important}.player-controls{display:flex;align-items:center;gap:8px}`;
  document.head.append(style);
  const strip=document.createElement('aside');strip.id='account-strip';strip.setAttribute('aria-label','Your account');
  const menu=document.createElement('details'),avatar=document.createElement('summary'),items=document.createElement('div');items.className='account-menu';
  avatar.setAttribute('aria-label','Open your profile');
  const name=document.createElement('strong'),link=document.createElement('a'),settings=document.createElement('a'),done=document.createElement('button');
  link.href=new URL('accounts/index.html',base).href;link.textContent='Profile and progress';
  settings.href=new URL('grown-ups/index.html',base).href;settings.textContent='Settings';done.type='button';done.textContent='👋 Sign out';
  items.append(name,link,settings,done);menu.append(avatar,items);
  const guestLink=document.createElement('a');guestLink.href=new URL('index.html',base).href;guestLink.textContent='Sign in to save';
  strip.append(menu,guestLink);
  offline=document.createElement('span');offline.id='offline-status';offline.hidden=true;document.body.append(offline);
  function render(){
    menu.hidden=!A.profile;guestLink.hidden=Boolean(A.profile);
    name.textContent=A.profile?.display_name||'';
    avatar.replaceChildren();
    if(A.profile?.avatar?.startsWith('data:image/')){const img=document.createElement('img');img.src=A.profile.avatar;img.alt='';avatar.append(img);}else avatar.textContent=A.profile?.avatar||'🐶';
  }
  function place(){const header=document.querySelector('#header'),controls=header.querySelector('.controls');if(controls&&!header.contains(strip)){const group=document.createElement('div');group.className='player-controls';controls.replaceWith(group);group.append(controls,strip);}}
  new MutationObserver(place).observe(document.querySelector('#header'),{childList:true,subtree:true});place();
  done.addEventListener('click',async()=>{done.disabled=true;await A.signOut();location.href=new URL('index.html',base).href;});
  A.subscribe(render);A.ready.then(render).catch(()=>{});render();
}
if('serviceWorker' in navigator){
  offline.textContent='Saving the games for offline play…';
  navigator.serviceWorker.register(new URL('sw.js',base),{scope:base.pathname,updateViaCache:'none'})
    .then(()=>navigator.serviceWorker.ready).then(()=>{offline.textContent='Games ready for offline play.';navigator.storage?.persist?.().catch(()=>{});})
    .catch(()=>{offline.textContent='Offline copy is not ready. Keep this page online and reload to try again.';});
}else offline.textContent='This browser needs an internet connection to reopen the games.';
})();
