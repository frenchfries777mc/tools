/* Fry Sheet together (같이 고치기): several people in one sheet over ../peer-room.js (FFRoom, PeerJS). The host's copy is the real one.
   Every change is found by comparing the document with what was last sent or received (base), and sent as small ops:
     c {sid, cells:{key: cell|null}}   cells changed          p {sid, p:{...}}   everything of a sheet but its cells (widths, merges, name ...)
     n {sid, sheet}  new sheet         d {sid}  sheet removed  l {ord:[sid]}      sheet order          nm {names}  named ranges
   A guest sends {t:'ops',bid,ops} to the host; the host applies them (a locked cell is refused and sent back as a fix), passes them on to the others
   {t:'ops',ops,by} and answers the sender {t:'ack',bid,fix}. Until its ack comes a guest ignores other people's ops on the same cell, so every copy ends up the host's.
   A guest receives {t:'snap'} on joining and keeps it as a document of its own. Selections go as {t:'sel'} and show as a coloured frame with a name on the cell. */
(function(){
'use strict';
var H=window.FSHost, E=FSE, T=FFT.T, F=FFT.F, $=function(id){ return document.getElementById(id); };
var room=null, guest=null, role='', myId='', code='', peers=[], pres={}, base=null, ready=false;
var pend={}, sent={}, bseq=0, applying=false, touchT=null, selT=null, lastSel='', remoteSince=false, joinT=null;
var LSN='ffsheet.coname';

function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function lsSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
/* the same text for the same value whatever the order of its keys */
function sj(o){ if(o==null||typeof o!=='object') return JSON.stringify(o); if(Array.isArray(o)) return '['+o.map(sj).join(',')+']';
  return '{'+Object.keys(o).sort().map(function(k){ return JSON.stringify(k)+':'+sj(o[k]); }).join(',')+'}'; }
function clean(o){ var c; try{ c=JSON.parse(JSON.stringify(o)); }catch(e){ return null; } (function strip(x){ if(x&&typeof x==='object'){ delete x.__proto__; ['constructor','prototype'].forEach(function(k){ if(Object.prototype.hasOwnProperty.call(x,k)) delete x[k]; }); Object.keys(x).forEach(function(k){ strip(x[k]); }); } })(c); return c; }
function okSid(s){ return typeof s==='string'&&s.length>0&&s.length<40; }
function props(s){ var o={}; for(var k in s) if(k!=='cells') o[k]=s[k]; return o; }
function ensureSids(){ var seen={}; H.doc.sheets.forEach(function(s){ if(!okSid(s.sid)||seen[s.sid]) s.sid=H.uid(); seen[s.sid]=1; }); }
function findSheet(sid){ var l=H.doc.sheets; for(var i=0;i<l.length;i++) if(l[i].sid===sid) return l[i]; return null; }
function snapSheet(s){ var c={}; for(var k in s.cells) c[k]=sj(s.cells[k]); return {c:c,p:sj(props(s))}; }
function mkBase(){ ensureSids(); var b={ord:[],sh:{},nm:sj(H.doc.names)}; H.doc.sheets.forEach(function(s){ b.ord.push(s.sid); b.sh[s.sid]=snapSheet(s); }); return b; }

/* ---------- what changed here since the last sync ---------- */
function diff(){
  ensureSids(); var d=H.doc, b=base, adds=[], gone=[], mid=[], ord=[];
  d.sheets.forEach(function(s){ ord.push(s.sid); var bs=b.sh[s.sid];
    if(!bs){ adds.push({k:'n',sid:s.sid,sheet:s}); b.sh[s.sid]=snapSheet(s); return; }
    var p=sj(props(s)); if(p!==bs.p){ mid.push({k:'p',sid:s.sid,p:props(s)}); bs.p=p; }
    var ch={}, n=0, seen={}, k, j;
    for(k in s.cells){ j=sj(s.cells[k]); seen[k]=1; if(bs.c[k]!==j){ ch[k]=s.cells[k]; bs.c[k]=j; n++; } }
    for(k in bs.c) if(!seen[k]){ ch[k]=null; delete bs.c[k]; n++; }
    if(n) mid.push({k:'c',sid:s.sid,cells:ch}); });
  Object.keys(b.sh).forEach(function(sid){ if(ord.indexOf(sid)<0){ gone.push({k:'d',sid:sid}); delete b.sh[sid]; } });
  var ops=adds.concat(gone), reorder=ord.join()!==b.ord.filter(function(x){ return ord.indexOf(x)>=0; }).concat(ord.filter(function(x){ return b.ord.indexOf(x)<0; })).join();
  if(reorder) ops.push({k:'l',ord:ord});
  b.ord=ord; ops=ops.concat(mid);
  var nm=sj(d.names); if(nm!==b.nm){ ops.push({k:'nm',names:d.names}); b.nm=nm; }
  return ops;
}
function keysOf(o){ if(o.k==='c') return Object.keys(o.cells).map(function(k){ return 'c:'+o.sid+':'+k; }); return [o.k+(o.sid?':'+o.sid:'')]; }
function flush(){
  if(!role||!ready) return; var ops=diff(); if(!ops.length) return;
  if(role==='host') room.all({t:'ops',ops:ops,by:'host'});
  else { var bid=++bseq, ks=[]; ops.forEach(function(o){ keysOf(o).forEach(function(k){ ks.push(k); pend[k]=(pend[k]||0)+1; }); }); sent[bid]=ks; guest.send({t:'ops',bid:bid,ops:ops}); }
}
function touch(){ if(!role||!ready||applying) return; clearTimeout(touchT); touchT=setTimeout(flush,100); }

/* ---------- other people's ops ---------- */
function apply(ops,force){
  if(!Array.isArray(ops)) return;
  var d=H.doc, aSid=H.sheet.sid, list=false, cells=false, rebuild=false, names=false;
  applying=true;
  try{ ops.forEach(function(o){
    if(!o||typeof o!=='object') return; var s, k, v;
    if(o.k==='n'){ if(!okSid(o.sid)||findSheet(o.sid)||!o.sheet||typeof o.sheet!=='object'||d.sheets.length>=100) return;
      s=clean(o.sheet); if(!s) return; s.sid=o.sid; H.fix({sheets:[s],names:[]}); d.sheets.push(s); base.sh[s.sid]=snapSheet(s); list=true; }
    else if(o.k==='d'){ s=findSheet(o.sid); if(!s||d.sheets.length<2) return; d.sheets.splice(d.sheets.indexOf(s),1); delete base.sh[o.sid]; list=true; }
    else if(o.k==='l'){ if(!Array.isArray(o.ord)||(!force&&pend.l)) return; var seen={}, arr=[];
      o.ord.forEach(function(sid){ var x=findSheet(sid); if(x&&!seen[sid]){ seen[sid]=1; arr.push(x); } }); d.sheets.forEach(function(x){ if(!seen[x.sid]) arr.push(x); });
      if(arr.map(function(x){ return x.sid; }).join()!==d.sheets.map(function(x){ return x.sid; }).join()){ d.sheets.length=0; arr.forEach(function(x){ d.sheets.push(x); }); list=true; } }
    else if(o.k==='c'){ s=findSheet(o.sid); if(!s||!o.cells||typeof o.cells!=='object') return;
      for(k in o.cells){ if(!/^\d{1,12}$/.test(k)||(!force&&pend['c:'+o.sid+':'+k])) continue; v=o.cells[k];
        if(v===null){ delete s.cells[k]; delete base.sh[o.sid].c[k]; }
        else if(v&&typeof v==='object'&&!Array.isArray(v)){ s.cells[k]=clean(v); base.sh[o.sid].c[k]=sj(s.cells[k]); } }
      if(o.sid===aSid) cells=true; remoteSince=true; }
    else if(o.k==='p'){ s=findSheet(o.sid); if(!s||!o.p||typeof o.p!=='object'||(!force&&pend['p:'+o.sid])) return; var np=clean(o.p); if(!np) return;
      Object.keys(s).forEach(function(x){ if(x!=='cells') delete s[x]; }); Object.keys(np).forEach(function(x){ if(x!=='cells') s[x]=np[x]; }); s.sid=o.sid;
      H.fix({sheets:[s],names:[]}); base.sh[o.sid].p=sj(props(s)); list=true; if(o.sid===aSid) rebuild=true; }
    else if(o.k==='nm'){ if(!Array.isArray(o.names)||(!force&&pend.nm)) return; d.names=clean(o.names).filter(function(n){ return n&&typeof n.name==='string'&&typeof n.ref==='string'; }); base.nm=sj(d.names); names=true; } });
    base.ord=d.sheets.map(function(x){ return x.sid; });
    if(list) H.sheetsChanged(aSid); if(rebuild&&findSheet(aSid)) H.rebuild(); else if(!list&&(cells||names)) H.changed();
  }finally{ applying=false; }
  drawPres();
}
/* the host: take a guest's ops, refuse what a lock forbids (those cells go back to the sender as fixes) */
function hostTake(from,d){
  var ok=[], fix=[];
  (Array.isArray(d.ops)?d.ops:[]).forEach(function(o){ if(!o||typeof o!=='object') return; var s=findSheet(o.sid);
    if(o.k==='c'&&s&&o.cells&&typeof o.cells==='object'){ var good={}, bad={}, ng=0, nb=0;
      Object.keys(o.cells).forEach(function(k){ var rc=/^\d{1,12}$/.test(k)?E.RC(+k):null; if(rc&&E.lockHit(s.lock,rc[0],rc[1])){ bad[k]=s.cells[k]||null; nb++; } else { good[k]=o.cells[k]; ng++; } });
      if(ng) ok.push({k:'c',sid:o.sid,cells:good}); if(nb) fix.push({k:'c',sid:o.sid,cells:bad}); }
    else if(o.k==='p'&&s&&s.lock&&s.lock.all) fix.push({k:'p',sid:o.sid,p:props(s)});
    else ok.push(o); });
  apply(ok,true);
  if(ok.length) room.all({t:'ops',ops:ok,by:from},from);
  room.send(from,{t:'ack',bid:d.bid,fix:fix});
}

/* ---------- who is where ---------- */
function peerOf(id){ for(var i=0;i<peers.length;i++) if(peers[i].id===id) return peers[i]; return null; }
function drawPres(){
  Array.prototype.slice.call(H.gin.querySelectorAll('.rsel')).forEach(function(x){ x.remove(); });
  if(!role) return; var sid=H.sheet.sid;
  Object.keys(pres).forEach(function(id){ var p=pres[id], pe=peerOf(id); if(id===myId||!p||!pe||p.s!==sid) return;
    var g=H.rect(p.r1,p.c1,p.r2,p.c2); if(!g) return; var el=document.createElement('div'), nm=document.createElement('i');
    el.className='rsel'+(p.r1===0?' lo':''); el.style.borderColor=pe.color; nm.style.background=pe.color; nm.textContent=pe.name; el.appendChild(nm); H.box(el,g); H.gin.appendChild(el); });
}
function mySel(){ var s=H.sheet, g=H.sel(); return {t:'sel',s:s.sid,r1:g.r1,c1:g.c1,r2:g.r2,c2:g.c2}; }
function sel(){ if(!role) return; drawPres(); if(!ready) return; var m=mySel(), j=JSON.stringify(m); if(j===lastSel) return; lastSel=j;
  clearTimeout(selT); selT=setTimeout(function(){ if(!role) return; if(role==='host') room.all(Object.assign({by:'host'},m)); else guest.send(m); },60); }
function okSel(d){ return d&&typeof d.s==='string'&&['r1','c1','r2','c2'].every(function(k){ return d[k]>=0&&d[k]<100000&&d[k]%1===0; }); }

/* ---------- messages ---------- */
function onHost(from,d){
  if(!d||typeof d!=='object') return;
  if(d.t==='ops') hostTake(from,d);
  else if(d.t==='sel'&&okSel(d)){ pres[from]={s:d.s,r1:d.r1,c1:d.c1,r2:d.r2,c2:d.c2}; room.all({t:'sel',by:from,s:d.s,r1:d.r1,c1:d.c1,r2:d.r2,c2:d.c2},from); drawPres(); }
}
function onGuest(d){
  if(!d||typeof d!=='object') return;
  if(d.t==='snap') takeSnap(d);
  else if(!ready) return;
  else if(d.t==='ops'){ apply(d.ops,false); }
  else if(d.t==='ack'){ (sent[d.bid]||[]).forEach(function(k){ if(--pend[k]<=0) delete pend[k]; }); delete sent[d.bid]; if(d.fix&&d.fix.length) apply(d.fix,true); }
  else if(d.t==='sel'&&okSel(d)&&typeof d.by==='string'){ pres[d.by]={s:d.s,r1:d.r1,c1:d.c1,r2:d.r2,c2:d.c2}; drawPres(); }
}
function takeSnap(d){
  clearTimeout(joinT); if(ready||!Array.isArray(d.sheets)||!d.sheets.length) return;
  var doc=clean({v:1,name:F('{0} ({1})',String(d.name||T('새 시트')).slice(0,60),T('같이 고치기')),active:0,sheets:d.sheets,names:Array.isArray(d.names)?d.names:[]});
  if(!H.openCopy(doc)) { setSt(T('저장 공간이 가득 차서 시트를 받지 못했어요')); leave(true); return; }
  base=mkBase(); pres={}; Object.keys(d.pres||{}).forEach(function(id){ var p=d.pres[id]; if(okSel(Object.assign({},p))) pres[id]=p; });
  ready=true; lastSel=''; show(); sel(); drawPres(); H.toast(T('같이 고치기에 들어왔어요')); setSt('');
}

/* ---------- start, join, leave ---------- */
var ERR={taken:'이미 쓰고 있는 코드예요. 다시 만들어 주세요',nohost:'그 코드의 방을 찾지 못했어요. 코드를 다시 확인해 주세요',net:'연결 서버에 닿지 못했어요. 인터넷 연결을 확인해 주세요',lib:'같이 고치는 도구를 불러오지 못했어요. 인터넷 연결을 확인해 주세요',full:'방이 가득 찼어요',app:'다른 도구의 방이에요'};
function myName(){ var n=$('coName').value.trim().slice(0,20)||T('손님'); lsSet(LSN,n); return n; }
function fail(kind){ setSt(T(ERR[kind]||ERR.net)); reset(); }
function reset(){ clearTimeout(joinT); clearTimeout(touchT); clearTimeout(selT); try{ if(room) room.close(); }catch(e){} try{ if(guest) guest.close(); }catch(e){}
  room=guest=null; role=''; myId=''; code=''; peers=[]; pres={}; base=null; ready=false; pend={}; sent={}; lastSel=''; remoteSince=false; show(); drawPres(); }
function leave(keepMsg){ var was=role; reset(); if(!keepMsg&&was) { setSt(''); H.toast(T('같이 고치기를 마쳤어요')); } }
function make(){
  if(role) return; role='host'; myId='host'; setSt(T('방을 만드는 중…')); base=mkBase(); ready=false; var nm=myName();
  room=FFRoom.host({app:'sheet',name:nm,
    open:function(c){ code=c; ready=true; peers=room.peers(); show(); setSt(''); sel(); },
    error:fail,
    join:function(p){ var snap={t:'snap',name:H.name(),sheets:H.doc.sheets,names:H.doc.names,pres:Object.assign({host:pres.host||mySel()},pres)}; flushNow(); room.send(p.id,snap); H.toast(F('{0} 님이 들어왔어요',p.name)); },
    leave:function(p){ delete pres[p.id]; drawPres(); H.toast(F('{0} 님이 나갔어요',p.name)); },
    msg:onHost,
    peers:function(l){ peers=l; renderPeers(); drawPres(); } });
}
function flushNow(){ clearTimeout(touchT); flush(); }
function join(txt){
  if(role) return; var m=/[#&]r=([A-Za-z0-9]{6})/.exec(txt)||[0,txt], c=FFRoom.cleanCode(m[1]);
  if(c.length<6) return setSt(T('초대 코드는 영문과 숫자 6자리예요'));
  role='guest'; ready=false; setSt(T('방에 들어가는 중…')); var nm=myName();
  guest=FFRoom.join(c,{app:'sheet',name:nm,
    open:function(info){ myId=info.id; code=c; setSt(T('시트를 받는 중…')); },
    msg:onGuest,
    peers:function(l){ peers=l; renderPeers(); drawPres(); },
    end:function(why){ var r=why==='closed'?T('방을 만든 사람이 같이 고치기를 끝냈어요. 받은 시트는 내 문서로 남아 있어요'):T('연결이 끊겼어요. 받은 시트는 내 문서로 남아 있어요'); reset(); H.toast(r); },
    error:fail });
  joinT=setTimeout(function(){ if(role==='guest'&&!ready){ setSt(T('시트를 받지 못했어요. 다시 해 보세요')); reset(); } },25000);
}

/* ---------- dialog ---------- */
function setSt(t){ var p=$('coSt'); p.hidden=!t; p.textContent=t; }
function renderPeers(){
  var l=$('coPeers'); l.innerHTML=''; peers.forEach(function(p){ var r=document.createElement('div'), dot=document.createElement('i'), nm=document.createElement('span'), tag=document.createElement('em');
    r.className='coP'; dot.style.background=p.color; nm.textContent=p.name; nm.setAttribute('data-notr',''); tag.textContent=(p.id==='host'?T('방장'):'')+(p.id===myId?(p.id==='host'?' · ':'')+T('나'):''); r.appendChild(dot); r.appendChild(nm); r.appendChild(tag); l.appendChild(r); });
  var n=$('coN'); n.hidden=!role; n.textContent=peers.length||''; $('coBtn').classList.toggle('on',!!role);
}
function show(){
  var on=!!role&&!!code&&ready; $('coOff').hidden=on||(!!role&&!ready&&false); $('coOn').hidden=!on; $('coEnd').hidden=!role;
  $('coEnd').textContent=role==='host'?T('같이 고치기 끝내기'):T('나가기'); $('coBig').textContent=code; $('coBtn').classList.toggle('on',!!role); $('coN').hidden=!role;
  if(role) renderPeers(); else { $('coN').textContent=''; }
  $('coMake').disabled=$('coJoin').disabled=!!role;
}
function openCo(){ if(window.FSAPI) FSAPI.commitEdit(); show(); $('coDlg').classList.add('open'); }
$('coBtn').onclick=openCo;
$('coMake').onclick=make;
$('coJoin').onclick=function(){ join($('coCode').value); };
$('coCode').addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); $('coJoin').click(); } });
$('coEnd').onclick=function(){ leave(); };
$('coCopy').onclick=function(){ try{ navigator.clipboard.writeText(code).catch(function(){}); }catch(e){} H.toast(T('복사했어요')); };
$('coLink').onclick=function(){ try{ navigator.clipboard.writeText(FFRoom.link(code)).catch(function(){}); }catch(e){} H.toast(T('복사했어요')); };
$('coName').value=lsGet(LSN)||'';
FFRoom.account().then(function(a){ if(a){ $('coAcc').textContent=F('Frenchfries777 계정 이름: {0}',a); if(!$('coName').value) $('coName').value=a; } });
var c0=FFRoom.codeFromUrl(); if(c0){ $('coCode').value=c0; setSt(T('초대 링크로 오셨어요. 이름을 확인하고 들어가기를 눌러 주세요')); setTimeout(openCo,300); }

window.FSCo={touch:touch, sel:sel, warnUndo:function(){ var w=!!role&&remoteSince; remoteSince=false; return w; },
  state:function(){ return {role:role,code:code,ready:ready,id:myId,peers:peers,pres:pres,pend:Object.keys(pend).length}; }};
})();
