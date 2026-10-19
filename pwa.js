/* Installable app + offline: registers sw.js (scope = this site's /tools/) on every page; on the start page it also shows the "앱으로 설치" link. */
(function(){
'use strict';
var base=document.currentScript?document.currentScript.src.replace(/pwa\.js[^\/]*$/,''):'';
if('serviceWorker' in navigator&&base) window.addEventListener('load',function(){ navigator.serviceWorker.register(base+'sw.js').catch(function(){}); });
var link=document.getElementById('installLink'), hint=document.getElementById('installHint'); if(!link) return;
var standalone=(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone, ev=null;
if(standalone) return;
window.addEventListener('beforeinstallprompt',function(e){ e.preventDefault(); ev=e; link.hidden=false; });
window.addEventListener('appinstalled',function(){ link.hidden=true; if(hint) hint.hidden=true; ev=null; });
if(/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)) link.hidden=false;   // iOS Safari has no install prompt: show the how-to
link.addEventListener('click',function(e){
  e.preventDefault();
  if(ev){ ev.prompt(); ev.userChoice.finally(function(){ ev=null; link.hidden=true; }); }
  else if(hint) hint.hidden=!hint.hidden;
});
})();
