/* Fry Slides: 같이 고치기 (two people editing the same deck through a share link).
   The deck lives in Supabase table public.ff_slides_share (supabase-ff-slides-share.sql, run by the owner). The link holds a random id (#c=<uuid>);
   the browser talks to it only through four functions (create / get / put / delete), with the Frenchfries777 account script's client (ff-auth.js, loaded when needed, like blocks/shared.js).
   Every few seconds each browser asks "anything newer than revision N?"; saving sends the whole deck with the revision it started from.
   If somebody saved in between, the server answers with its copy and the two copies are merged per slide and per field (three-way, using the copy both sides last agreed on), then saved again.
   Until the SQL has been run the dialog only says that it will turn on later. */
(function(){
'use strict';
var X=window.FSLX; if(!X||X.mode) return;
var T=FFT.T, $=function(id){ return document.getElementById(id); };
var AUTH_URL='https://frenchfries777mc.github.io/games/ff-auth.js', POLL=3000, SOON=1200, BK='ffslides.co.';
var authP=null, sb=null, busy=false, sqlOk=null, st={k:'', t:0}, soonT=null, again=false;

/* ---------- account / client ---------- */
function auth(){
  if(authP) return authP;
  authP=new Promise(function(res){
    if(window.FFAuth) return res();
    var s=document.createElement('script'); s.src=AUTH_URL; s.onload=function(){ res(); }; s.onerror=function(){ s.remove(); res(); }; document.head.appendChild(s);
  }).then(function(){
    if(!window.FFAuth||!FFAuth.ready) throw new Error('auth');
    return FFAuth.ready.then(function(c){ if(!c) throw new Error('auth'); sb=c; if(FFAuth.onChange) FFAuth.onChange(paintDlg); return c; });
  });
  authP.catch(function(){ authP=null; });
  return authP;
}
function me(){ return window.FFAuth&&FFAuth.user&&FFAuth.user(); }
function missing(e){ if(!e) return false; var c=String(e.code||''); return c==='PGRST205'||c==='42P01'||c==='PGRST202'||c==='42883'||/does not exist|schema cache|Could not find the function/i.test(String(e.message||'')); }
function rpc(name,args){ return auth().then(function(c){ return c.rpc(name,args); }).then(function(r){ if(r.error){ var e=new Error(r.error.message||'rpc'); e.code=r.error.code; e.miss=missing(r.error); e.big=/too_big/.test(r.error.message||''); e.many=/too_many/.test(r.error.message||''); e.login=/login_required/.test(r.error.message||'')||r.error.code==='28000'; throw e; } return r.data; }); }

/* ---------- the deck as plain data, and putting a copy into the open deck ---------- */
var DK=['name','theme','font','trans','footer','nums','master','auto'];
function payload(d){ var o={v:1}; DK.forEach(function(k){ o[k]=JSON.parse(JSON.stringify(d[k]==null?'':d[k])); }); o.slides=JSON.parse(JSON.stringify(d.slides)); return o; }
function canon(v){ if(Array.isArray(v)) return '['+v.map(canon).join(',')+']'; if(v&&typeof v==='object') return '{'+Object.keys(v).sort().map(function(k){ return JSON.stringify(k)+':'+canon(v[k]); }).join(',')+'}'; return JSON.stringify(v===undefined?null:v); }
function same(a,b){ return canon(a)===canon(b); }
function apply(d,p){ var n=X.fixDeck({name:p.name, theme:p.theme, font:p.font, trans:p.trans, footer:p.footer, nums:p.nums, master:p.master, auto:p.auto, slides:Array.isArray(p.slides)?p.slides:[]});
  var keep=d.slides[X.cur]&&d.slides[X.cur].id; DK.forEach(function(k){ d[k]=n[k]; }); d.slides=n.slides; if(!d.slides.length) return;
  var i=-1; d.slides.forEach(function(s,j){ if(s.id===keep) i=j; }); X.setCur(i<0?Math.min(X.cur,d.slides.length-1):i); }

/* ---------- three-way merge: base = what both sides last agreed on, mine = this browser, theirs = the server ---------- */
function pick(b,m,t){ return same(m,b)?t:m; } // only they changed: theirs; otherwise mine (also when both changed)
function mergeSlide(b,m,t){ if(!b) return m; var o={}, ks={}; Object.keys(m).concat(Object.keys(t)).forEach(function(k){ ks[k]=1; });
  Object.keys(ks).forEach(function(k){ o[k]=pick(b[k],m[k],t[k]); if(o[k]===undefined) delete o[k]; }); return o; }
function merge(base,mine,theirs){ var out={v:1}, bi={}, mi={}, ti={}, bs=base.slides||[];
  DK.forEach(function(k){ out[k]=pick(base[k],mine[k],theirs[k]); });
  bs.forEach(function(s){ bi[s.id]=s; }); mine.slides.forEach(function(s){ mi[s.id]=s; }); theirs.slides.forEach(function(s){ ti[s.id]=s; });
  var res={}; // id -> merged slide or null (gone)
  var ids={}; bs.concat(mine.slides,theirs.slides).forEach(function(s){ ids[s.id]=1; });
  Object.keys(ids).forEach(function(id){ var b=bi[id], m=mi[id], t=ti[id];
    if(m&&t) res[id]=mergeSlide(b,m,t);
    else if(m&&!t) res[id]=b&&same(m,b)?null:m;      // they deleted it: gone, unless I changed it meanwhile (or I added it)
    else if(t&&!m) res[id]=b&&same(t,b)?null:t;      // I deleted it: gone, unless they changed it meanwhile (or they added it)
    else res[id]=null; });
  var ord=function(a){ return a.map(function(s){ return s.id; }); }, bo=ord(bs), mo=ord(mine.slides), to=ord(theirs.slides);
  var theyMoved=!same(to.filter(function(i){ return bi[i]; }),bo.filter(function(i){ return ti[i]; })), skel=(theyMoved?to:mo).slice(), other=theyMoved?mo:to;
  other.forEach(function(id,k){ if(skel.indexOf(id)>=0) return; var at=0; for(var j=k-1;j>=0;j--){ var q=skel.indexOf(other[j]); if(q>=0){ at=q+1; break; } } skel.splice(at,0,id); });
  out.slides=skel.filter(function(id){ return res[id]; }).map(function(id){ return res[id]; });
  if(!out.slides.length) out.slides=mine.slides.length?mine.slides:theirs.slides; return out; }

/* ---------- the last copy both sides agreed on (kept in this browser so a reload does not forget it) ---------- */
var bases={};
function getBase(id){ if(bases[id]!==undefined) return bases[id]; var v=null; try{ v=localStorage.getItem(BK+id); }catch(e){} return bases[id]=v?JSON.parse(v):null; }
function setBase(id,p){ bases[id]=p; try{ localStorage.setItem(BK+id,JSON.stringify(p)); }catch(e){} }
function dropBase(id){ delete bases[id]; try{ localStorage.removeItem(BK+id); }catch(e){} }

/* ---------- status chip in the top bar ---------- */
function setSt(k,hold){ st.k=k; st.t=Date.now(); var e=$('coSt'), d=X.deck; if(!e) return; if(!d||!d.co){ e.hidden=true; return; }
  var tx={ok:'함께 편집 중 · 맞춰졌어요', sync:'함께 편집 중 · 맞추는 중…', got:'함께 편집 중 · 다른 사람이 고친 것을 가져왔어요', off:'함께 편집 중 · 연결할 수 없어요 (다시 시도해요)', wait:'함께 편집 중 · 글을 쓰는 동안은 잠시 기다려요', gone:'같이 고치기가 끝났어요', big:'자료가 너무 커서 맞출 수 없어요 (그림을 줄여 주세요)', sql:'같이 고치기는 SQL을 실행하면 켜져요'}[k]||'';
  e.hidden=!tx; e.textContent=T(tx); e.className='coSt '+k; if(hold) setTimeout(function(){ if(st.k===k) setSt('ok'); },hold); }

/* ---------- one round: ask, merge, save ---------- */
function stopCo(d,msg){ if(d.co) dropBase(d.co.id); d.co=null; X.saveNow(); setSt(''); paintDlg(); if(msg) X.toast(T(msg)); }
function step(d){
  var co=d.co, id=co.id;
  return rpc('ff_slides_share_get',{p_id:id, p_since:co.rev}).then(function(r){
    if(r&&r.gone) return stopCo(d,'같이 고치던 자료가 없어졌어요. 이 기기에는 사본이 남아 있어요');
    var remote=r&&!r.same?r.data:null, local=payload(d), base=getBase(id), dirty=!base||!same(local,base);
    if(!remote&&!dirty){ setSt(st.k==='got'&&Date.now()-st.t<3000?'got':'ok'); return; }
    if(remote){
      if(!X.quiet()){ setSt('wait'); return; }
      var out=merge(base||remote,local,remote); // no saved agreement (browser data cleared): this browser's copy wins where they differ
      if(!same(out,local)){ apply(d,out); X.refresh(); local=payload(d); }
      co.rev=r.rev;
      if(same(local,remote)){ setBase(id,local); X.saveSoon(); setSt('got',3000); return; }
      return push(d,local,r.rev); }
    return push(d,local,co.rev); });
}
function push(d,local,rev,n){ n=n||0; var co=d.co; setSt('sync');
  return rpc('ff_slides_share_put',{p_id:co.id, p_base:rev, p_data:local}).then(function(r){
    if(r.gone) return stopCo(d,'같이 고치던 자료가 없어졌어요. 이 기기에는 사본이 남아 있어요');
    if(r.conflict&&n<3){ var b=getBase(co.id)||r.data, out=merge(b,local,r.data); if(!same(out,local)){ if(!X.quiet()){ setSt('wait'); return; } apply(d,out); X.refresh(); } return push(d,payload(d),r.rev,n+1); }
    if(r.ok){ co.rev=r.rev; setBase(co.id,local); X.saveSoon(); setSt('ok'); } });
}
function tick(){ if(busy){ again=true; return; } var d=X.deck; if(!d||!d.co){ setSt(''); return; } if(document.hidden) return; busy=true;
  step(d).then(function(){ sqlOk=true; },function(e){ if(e&&e.miss){ sqlOk=false; setSt('sql'); } else if(e&&e.big) setSt('big'); else setSt('off'); }).then(function(){ busy=false; paintDlg(); if(again){ again=false; kick(); } }); }
function kick(){ clearTimeout(soonT); soonT=setTimeout(tick,SOON); }
X.onSaved=function(){ if(X.deck&&X.deck.co) kick(); };
setInterval(tick,POLL); document.addEventListener('visibilitychange',function(){ if(!document.hidden) tick(); });

/* ---------- the share dialog part ---------- */
function linkOf(d){ return location.href.split('#')[0]+'#c='+d.co.id; }
function say(t,bad){ var e=$('coMsg'); e.textContent=t?T(t):''; e.className='coMsg'+(bad?' bad':''); }
function paintDlg(){ var box=$('coBox'); if(!box) return; var d=X.deck, on=!!(d&&d.co), u=me();
  $('coOff').hidden=on; $('coOn').hidden=!on;
  $('coLogin').hidden=on||!!u||sqlOk===false; $('coMake').hidden=on||!u||sqlOk===false; $('coMake').disabled=busy;
  if(sqlOk===false) say('같이 고치기는 SQL을 실행하면 켜져요',true); else if(!on&&!u) say('만들려면 먼저 로그인해 주세요 (같이 고치는 사람은 로그인하지 않아도 돼요)'); else if(!$('coMsg').classList.contains('bad')) say('');
  if(on){ $('coLink').value=linkOf(d); $('coStop').textContent=T(d.co.own?'같이 고치기 끝내기 (모두에게서 끊어요)':'이 기기에서 연결 끊기'); } }
function openedDlg(){ paintDlg(); say(''); auth().then(function(){ paintDlg(); return rpc('ff_slides_share_get',{p_id:'00000000-0000-0000-0000-000000000000',p_since:0}).then(function(){ sqlOk=true; },function(e){ if(e&&e.miss) sqlOk=false; }); }).then(paintDlg,function(){ say('연결할 수 없어요',true); }); }
new MutationObserver(function(){ if($('shareDlg').classList.contains('open')) openedDlg(); }).observe($('shareDlg'),{attributes:true,attributeFilter:['class']});
$('coLogin').onclick=function(){ if(window.FFAuth) FFAuth.openLogin(); };
$('coMake').onclick=function(){ var d=X.deck; if(!d||d.co||busy) return;
  X.confirmDlg(T('이 링크를 아는 사람은 누구나 이 발표 자료를 고칠 수 있어요. 같이 고치기를 켤까요?')).then(function(ok){ if(!ok) return; busy=true; paintDlg(); say('만드는 중…');
    var p=payload(d); rpc('ff_slides_share_create',{p_name:d.name,p_data:p}).then(function(id){ d.co={id:String(id),rev:1,own:true}; setBase(d.co.id,p); X.saveNow(); setSt('ok'); say(''); $('coMsg').className='coMsg'; },
      function(e){ say(e.miss?'같이 고치기는 SQL을 실행하면 켜져요':e.login?'만들려면 먼저 로그인해 주세요':e.big?'자료가 너무 커서 같이 고칠 수 없어요 (그림을 줄여 주세요)':e.many?'같이 고치는 자료가 너무 많아요. 안 쓰는 것을 끝내 주세요':'만들지 못했어요. 잠시 뒤에 다시 해 보세요',true); if(e.miss) sqlOk=false; }).then(function(){ busy=false; paintDlg(); }); }); };
$('coCopy').onclick=function(){ var t=$('coLink').value, ok=function(){ X.toast(T('링크를 복사했어요')); }, fb=function(){ $('coLink').select(); try{ if(document.execCommand('copy')) return ok(); }catch(e){} X.toast(T('링크를 길게 눌러 복사해 주세요')); };
  if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok,fb); else fb(); };
$('coLink').addEventListener('focus',function(){ this.select(); });
$('coStop').onclick=function(){ var d=X.deck; if(!d||!d.co) return; var own=d.co.own;
  X.confirmDlg(T(own?'같이 고치기를 끝낼까요? 서버에서 지워지고 링크가 더는 열리지 않아요. 이 기기의 발표 자료는 그대로 남아요.':'이 기기에서 같이 고치기 연결을 끊을까요? 이 기기의 발표 자료는 그대로 남아요.')).then(function(ok){ if(!ok) return; var id=d.co.id;
    if(!own) return stopCo(d,'연결을 끊었어요');
    rpc('ff_slides_share_delete',{p_id:id}).then(function(){ stopCo(d,'같이 고치기를 끝냈어요'); },function(){ say('끝내지 못했어요. 잠시 뒤에 다시 해 보세요',true); }); }); };
$('coSt').onclick=function(){ var b=$('shareBtn'); if(b) b.click(); };

/* ---------- opening a link: #c=<uuid> ---------- */
function join(){ var m=/^#c=([0-9a-f-]{36})$/i.exec(location.hash); if(!m) return; var id=m[1].toLowerCase(); try{ history.replaceState(null,'',location.href.split('#')[0]); }catch(e){}
  var have=X.store.decks.filter(function(d){ return d.co&&d.co.id===id; })[0]; if(have){ X.openDeck(have); tick(); return; }
  X.toast(T('같이 고치는 발표 자료를 여는 중…'));
  rpc('ff_slides_share_get',{p_id:id,p_since:0}).then(function(r){
    if(!r||r.gone||!r.data||!Array.isArray(r.data.slides)) return X.toast(T('이 링크의 발표 자료는 없어졌어요'));
    var d=X.fixDeck({id:X.uid(), name:r.data.name||r.name, theme:r.data.theme, font:r.data.font, trans:r.data.trans, footer:r.data.footer, nums:r.data.nums, master:r.data.master, auto:r.data.auto, slides:r.data.slides, t:Date.now(), co:{id:id,rev:r.rev,own:false}});
    X.openDeck(d); setBase(id,payload(d)); setSt('ok'); X.toast(T('같이 고치는 발표 자료를 열었어요')); },
    function(e){ X.toast(T(e&&e.miss?'같이 고치기는 SQL을 실행하면 켜져요':'열지 못했어요. 인터넷 연결을 확인해 주세요')); }); }
join(); setSt('ok'); if(X.deck&&X.deck.co) tick();
window.__fco={merge:merge, payload:payload, tick:tick, canon:canon};
})();
