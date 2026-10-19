(() => {
'use strict';
if (location.protocol === 'file:') return;
const base=new URL('../',document.currentScript.src), A=window.ACCOUNTS;
const isHome=document.body.dataset.page==='home';
let offline=document.getElementById('offline-status');
const isAdmin=location.pathname.includes('/accounts/')||location.pathname.includes('/grown-ups/');
if(!offline&&isAdmin){offline=document.createElement('p');offline.id='offline-status';offline.setAttribute('role','status');document.querySelector('main')?.append(offline);}
if(!isHome&&!isAdmin){
  const style=document.createElement('style');
  style.textContent='#account-strip{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:center;margin:16px auto 24px;padding:12px;max-width:1040px;background:#fff8e5;color:#253f65;border:2px solid #253f65;border-radius:16px;font:700 16px/1.5 system-ui,sans-serif}#account-strip a,#account-strip button{display:inline-flex;align-items:center;justify-content:center;min-height:60px;padding:8px 18px;border:2px solid #253f65;border-radius:14px;background:#b9dce6;color:#253f65;box-shadow:none;text-decoration:none;font:inherit;cursor:pointer}#account-strip small{display:block;flex-basis:100%;text-align:center;font-size:14px}#account-strip :focus-visible{outline:3px solid #007a95;outline-offset:4px}';
  document.head.append(style);
  const strip=document.createElement('aside');strip.id='account-strip';strip.setAttribute('aria-label','Your account');
  const name=document.createElement('span'), link=document.createElement('a'), done=document.createElement('button');
  const progress=document.createElement('small'), status=document.createElement('small');
  offline=document.createElement('small');offline.id='offline-status';offline.setAttribute('role','status');
  progress.id='account-progress';status.id='account-sync-status';status.setAttribute('role','status');done.type='button';
  strip.append(name,link,done,progress,status,offline);
  const header=document.querySelector('#header,.masthead');if(header)header.after(strip);else document.body.prepend(strip);
  function render(){
    name.textContent=A.guest?'Playing without saving':A.profile?'Playing as '+A.profile.display_name:'Keep your discoveries.';
    link.href=new URL(A.profile?'accounts/index.html':'index.html',base).href;link.textContent=A.profile?'Your progress page':'Sign in';
    done.hidden=!A.profile&&!A.guest;done.textContent=A.guest?'Finish playing':"I'm done";
    progress.textContent=A.profile?A.snapshot.count+' rounds completed'+(A.snapshot.achievements.length?' · '+A.snapshot.achievements.join(' · '):''):'';
    status.textContent=A.guest?'Progress, achievements and settings will not be saved.':A.status+(A.pending?' '+A.pending+' waiting to sync.':'');
  }
  done.addEventListener('click',async()=>{done.disabled=true;await A.signOut();location.href=new URL('index.html',base).href;});
  A.subscribe(render);A.ready.then(render).catch(()=>{status.textContent='Sign-in storage is unavailable. You can play without saving from the home page.';});render();
}
if('serviceWorker' in navigator){
  offline.textContent='Saving the games for offline play…';
  navigator.serviceWorker.register(new URL('sw.js',base),{scope:base.pathname,updateViaCache:'none'})
    .then(()=>navigator.serviceWorker.ready).then(()=>{offline.textContent='Games ready for offline play.';navigator.storage?.persist?.().catch(()=>{});})
    .catch(()=>{offline.textContent='Offline copy is not ready. Keep this page online and reload to try again.';});
}else offline.textContent='This browser needs an internet connection to reopen the games.';
})();
