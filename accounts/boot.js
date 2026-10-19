(() => {
'use strict';
if (location.protocol === 'file:') return;
const base = new URL('../', document.currentScript.src);
const A = window.ACCOUNTS;
const style = document.createElement('style');
style.textContent = '#account-strip{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:center;margin:0 auto 24px;padding:12px;max-width:1040px;background:#fff8e5;color:#253f65;border:2px solid #253f65;border-radius:16px;font:700 16px/1.5 system-ui,sans-serif}#account-strip a,#account-strip button{display:inline-flex;align-items:center;justify-content:center;min-height:60px;padding:8px 18px;border:2px solid #253f65;border-radius:14px;background:#b9dce6;color:#253f65;box-shadow:none;text-decoration:none;font:inherit;cursor:pointer}#account-strip small{display:block;flex-basis:100%;text-align:center;font-size:14px}#account-strip :focus-visible{outline:3px solid #007a95;outline-offset:4px}';
document.head.append(style);
const strip = document.createElement('aside'); strip.id='account-strip';strip.setAttribute('aria-label','Your account');
const name = document.createElement('span'), link = document.createElement('a'), done = document.createElement('button');
const progress = document.createElement('small');progress.id='account-progress';
const status = document.createElement('small'), offline = document.createElement('small');
status.id='account-sync-status';status.setAttribute('role','status');offline.id='offline-status';offline.setAttribute('role','status');
link.href=new URL('accounts/index.html',base).href; done.type='button';done.textContent="I'm done";
strip.append(name,link,done,progress,status,offline); document.body.prepend(strip);
function render() {
  name.textContent=A.profile ? 'Playing as '+A.profile.display_name : 'Keep your little discoveries.';
  link.textContent=A.profile?'Your notebook':'Sign in';done.hidden=!A.profile;
  progress.textContent=A.profile ? A.snapshot.count+' rounds in your notebook'+(A.snapshot.achievements.length?' · '+A.snapshot.achievements.join(' · '):'') : '';
  status.textContent=A.status+(A.pending?' '+A.pending+' waiting to sync.':'');
  const nav = document.querySelector('nav[aria-label="Choose a game"]');
  if(nav){
    nav.hidden=!A.session;
    const settings=A.snapshot.settings;
    const worlds=[...nav.querySelectorAll('[data-world]')];
    worlds.forEach(world=>{world.hidden=!(settings.games||['post','space','silk']).includes(world.dataset.world);});
    nav.style.setProperty('--worlds',worlds.filter(world=>!world.hidden).length);
  }
}
done.addEventListener('click',async()=>{done.disabled=true;await A.signOut();location.href=link.href;});
A.subscribe(render);A.ready.then(render).catch(()=>{status.textContent='Browser storage is unavailable. Open your notebook for help.';});render();
if ('serviceWorker' in navigator) {
  offline.textContent='Saving the games for offline play…';
  navigator.serviceWorker.register(new URL('sw.js',base),{scope:base.pathname,updateViaCache:'none'})
    .then(()=>navigator.serviceWorker.ready)
    .then(()=>{offline.textContent='Games ready for offline play.';navigator.storage?.persist?.().catch(()=>{});})
    .catch(()=>{offline.textContent='Offline copy is not ready. Keep this page online and reload to try again.';});
} else offline.textContent='This browser needs an internet connection to reopen the games.';
})();
