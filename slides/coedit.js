/* Fry Slides: 실시간 함께 편집 (people editing the same deck at the same time, straight between browsers over PeerJS).
   The person who opens a room is the host (the room layer is the root peer-room.js, FFRoom, shared with Docs and Sheet): the host's deck is the document. A guest enters with a 6 letter code (or #r=CODE),
   gets a snapshot of the deck, and from then on every change is sent as small element-level operations (slide added / removed / moved, a slide field set, a shape added / replaced / removed, shape order).
   Guests send their operations to the host, the host applies them in the order they arrive and tells everybody (the sender too), so every browser ends up with the host's order.
   A browser skips an operation of someone else for a thing it has sent a change for that the host has not confirmed yet, so its own newest change is never overwritten for a moment.
   What each person has picked is passed on too, and the others see it as a coloured name tag on that box. The names are the Frenchfries777 account names (a guest without an account is 손님 + a number).
   Nothing is stored on a server: the PeerJS cloud server only helps the browsers find each other. */
(function(){
'use strict';
var X=window.FSLX, RM=window.FFRoom; if(!X||X.mode||!RM) return;
var T=FFT.T, F=FFT.F, $=function(id){ return document.getElementById(id); };

var DK=['name','theme','font','trans','footer','nums','master','auto'];
var R=null; // the room: {role:'host'|'guest', code, room (FFRoom host or guest), users:{id:{id,n,c}}, me:{id,n,c}, base, pend:{}, queue:[], seq, sels:{}, mine:{s:'',k:[]}}

/* ---------- small helpers ---------- */
function clone(v){ return v===undefined?undefined:JSON.parse(JSON.stringify(v)); }
function canon(v){ if(Array.isArray(v)) return '['+v.map(canon).join(',')+']'; if(v&&typeof v==='object') return '{'+Object.keys(v).sort().map(function(k){ return JSON.stringify(k)+':'+canon(v[k]); }).join(',')+'}'; return JSON.stringify(v===undefined?null:v); }
function same(a,b){ return a===b||canon(a)===canon(b); }
function ids(a){ return a.map(function(x){ return x.id; }); }
function payload(d){ var o={}; DK.forEach(function(k){ o[k]=clone(d[k]==null?'':d[k]); }); o.slides=clone(d.slides); return o; }
/* ---------- operations ---------- */
function diff(b,c){ var ops=[], bi={}, ci={}; DK.forEach(function(k){ if(!same(b[k],c[k])) ops.push({o:'d',k:k,v:c[k]}); });
  b.slides.forEach(function(s){ bi[s.id]=s; }); c.slides.forEach(function(s){ ci[s.id]=s; });
  b.slides.forEach(function(s){ if(!ci[s.id]) ops.push({o:'sl-',id:s.id}); });
  c.slides.forEach(function(s,i){ var o=bi[s.id]; if(!o){ ops.push({o:'sl+',s:s,after:i?c.slides[i-1].id:''}); return; }
    Object.keys(s).forEach(function(k){ if(k!=='els'&&!same(o[k],s[k])) ops.push({o:'sf',id:s.id,k:k,v:s[k]}); });
    Object.keys(o).forEach(function(k){ if(k!=='els'&&!(k in s)) ops.push({o:'sf',id:s.id,k:k,del:1}); });
    var oe={}, ce={}; o.els.forEach(function(e){ oe[e.id]=e; }); s.els.forEach(function(e){ ce[e.id]=e; });
    o.els.forEach(function(e){ if(!ce[e.id]) ops.push({o:'e-',id:s.id,e:e.id}); });
    s.els.forEach(function(e){ if(!oe[e.id]) ops.push({o:'e+',id:s.id,e:e}); else if(!same(oe[e.id],e)) ops.push({o:'e~',id:s.id,e:e}); });
    if(!same(ids(o.els).filter(function(x){ return ce[x]; }),ids(s.els).filter(function(x){ return oe[x]; }))) ops.push({o:'eo',id:s.id,ids:ids(s.els)}); });
  if(!same(ids(b.slides).filter(function(x){ return ci[x]; }),ids(c.slides).filter(function(x){ return bi[x]; }))) ops.push({o:'mv',ids:ids(c.slides)});
  return ops; }
/* the thing an operation is about: two of them with the same key replace each other */
function keyOf(op){ switch(op.o){ case 'd': return 'd:'+op.k; case 'sl+': return 'sl:'+op.s.id; case 'sl-': return 'sl:'+op.id; case 'sf': return 'sf:'+op.id+':'+op.k; case 'e+': case 'e~': return 'e:'+op.id+':'+op.e.id; case 'e-': return 'e:'+op.id+':'+op.e; case 'eo': return 'eo:'+op.id; case 'mv': return 'mv'; } return ''; }
function inPlace(a,b){ a.length=0; b.forEach(function(x){ a.push(x); }); }
function order(a,list){ var m={}; a.forEach(function(x){ m[x.id]=x; }); var out=list.map(function(i){ return m[i]; }).filter(Boolean); a.forEach(function(x){ if(list.indexOf(x.id)<0) out.push(x); }); inPlace(a,out); }
/* put one operation into C (a deck or a payload); returns the slide it touched */
function put(C,op){ var sl=function(id){ for(var i=0;i<C.slides.length;i++) if(C.slides[i].id===id) return C.slides[i]; return null; }, s;
  switch(op.o){
    case 'd': C[op.k]=clone(op.v); return null;
    case 'sl+': if(sl(op.s.id)) return null; var at=C.slides.length; if(!op.after) at=0; else for(var i=0;i<C.slides.length;i++) if(C.slides[i].id===op.after){ at=i+1; break; } C.slides.splice(at,0,clone(op.s)); return C.slides[at];
    case 'sl-': for(var j=0;j<C.slides.length;j++) if(C.slides[j].id===op.id){ C.slides.splice(j,1); break; } return null;
    case 'mv': order(C.slides,op.ids); return null;
    case 'sf': s=sl(op.id); if(s){ if(op.del) delete s[op.k]; else s[op.k]=clone(op.v); } return s;
    case 'e+': case 'e~': s=sl(op.id); if(!s) return null; var x=-1; s.els.forEach(function(e,q){ if(e.id===op.e.id) x=q; }); if(x<0) s.els.push(clone(op.e)); else s.els[x]=clone(op.e); return s;
    case 'e-': s=sl(op.id); if(s) inPlace(s.els,s.els.filter(function(e){ return e.id!==op.e; })); return s;
    case 'eo': s=sl(op.id); if(s) order(s.els,op.ids); return s; }
  return null; }
function okOp(op){ return op&&typeof op==='object'&&typeof op.o==='string'&&((op.o==='d'&&DK.indexOf(op.k)>=0)||(op.o==='sl+'&&op.s&&typeof op.s.id==='string')||(op.o==='sl-'&&typeof op.id==='string')||(op.o==='mv'&&Array.isArray(op.ids))||(op.o==='sf'&&typeof op.id==='string'&&typeof op.k==='string'&&op.k!=='els'&&op.k!=='id')||((op.o==='e+'||op.o==='e~')&&op.e&&typeof op.e.id==='string')||(op.o==='e-'&&typeof op.e==='string')||(op.o==='eo'&&Array.isArray(op.ids))); }

/* ---------- applying what others did to the open deck, the last agreed copy (base) and the undo steps ---------- */
function applyRemote(ops,mine){ var d=X.deck, cur=d.slides[X.cur]&&d.slides[X.cur].id, touched={};
  ops.forEach(function(op){ if(!okOp(op)) return;
    var k=keyOf(op); if(mine&&(R.pend[k]>0||(op.o!=='d'&&op.o!=='mv'&&R.pend['sl:'+(op.id||(op.s&&op.s.id))]>0))) return; // I have a newer change of this thing on its way
    put(R.base,op); var s=put(d,op); if(s) touched[s.id]=s; });
  Object.keys(touched).forEach(function(i){ X.fixSlide(touched[i]); }); X.fixDeck(d);
  X.patchUndo(function(sl){ if(!Array.isArray(sl)) return; var C={slides:sl}; ops.forEach(function(op){ if(okOp(op)&&op.o!=='d') put(C,op); }); });
  var at=-1; d.slides.forEach(function(s,i){ if(s.id===cur) at=i; }); X.setCur(at<0?X.cur:at);
  /* the slide on the screen is drawn again only when something on it changed (a box being typed in must not be torn down for a change on another slide) */
  if(ops.some(function(op){ return op.o==='d'||(op.id||(op.s&&op.s.id))===cur; })||at<0){ if(X.quiet()){ X.refresh(); R.redraw=false; } else { X.drawList(); R.redraw=true; } } else X.drawList(); X.saveSoon(); }
/* the host's order of shapes and slides is the one everybody gets: after shapes or slides were added or removed the host tells the whole order */
function orders(ops){ var d=X.deck, out=[], seen={}, sl=false; ops.forEach(function(op){ if(op.o==='sl+'||op.o==='sl-') sl=true; if((op.o==='e+'||op.o==='e-')&&!seen[op.id]){ seen[op.id]=1; var s=d.slides.filter(function(x){ return x.id===op.id; })[0]; if(s) out.push({o:'eo',id:s.id,ids:ids(s.els)}); } });
  if(sl) out.push({o:'mv',ids:ids(d.slides)}); return out; }
/* the changes of this browser since the base: send them (guest: to the host, host: to everybody) */
function flush(){ if(!R||!R.base||!R.ready) return; var d=X.deck, c=payload(d), ops=diff(R.base,c); if(!ops.length) return; R.base=c;
  if(R.role==='guest'){ ops.forEach(function(op){ var k=keyOf(op); R.pend[k]=(R.pend[k]||0)+1; }); R.room.send({t:'ops',ops:ops}); }
  else castOps('host',ops); }
function castOps(u,ops){ R.seq++; R.room.all({t:'ops',u:u,seq:R.seq,ops:ops}); }
var soonT=null;
function soon(){ clearTimeout(soonT); soonT=setTimeout(function(){ if(R) flush(); },120); }
var prevSaved=X.onSaved; X.onSaved=function(){ if(prevSaved) prevSaved(); if(R) soon(); };
/* remote changes wait while something is being typed or dragged here */
function drain(){ if(!R||!X.still()) return; if(R.redraw&&X.quiet()){ R.redraw=false; X.refresh(); } if(!R.queue.length) return; flush();
  var q=R.queue, ed=X.editing(), cur=X.deck.slides[X.cur]&&X.deck.slides[X.cur].id; R.queue=[];
  /* a change to the very thing being typed in or dragged here waits; everything else is put in at once (the slide on the screen is drawn again when the typing stops) */
  var hold=function(op){ var id=op.id||(op.s&&op.s.id); if(id!==cur) return false; if(ed.all) return true; if(!ed.k) return false;
    return (op.o==='sf'&&op.k===ed.k)||((op.o==='e~'||op.o==='e+'||op.o==='e-')&&'e:'+(op.e.id||op.e)===ed.k)||op.o==='sl-'; };
  q.forEach(function(m){ if(m.own){ m.ops.forEach(function(op){ var k=keyOf(op); if(R.pend[k]>0) R.pend[k]--; }); return; }
    var now=m.ops.filter(function(op){ return !hold(op); }), wait=m.ops.filter(function(op){ return now.indexOf(op)<0; });
    if(wait.length) R.queue.push({u:m.u,ops:wait});
    if(!now.length) return; if(R.role==='host'){ applyRemote(now,false); castOps(m.u,now.concat(orders(now))); } else applyRemote(now,true); });
  paint(); }
setInterval(function(){ drain(); },250);

/* ---------- who is here, who picked what ---------- */
function usersList(){ return Object.keys(R.users).map(function(i){ return R.users[i]; }); }
function setUsers(list){ R.users={}; (list||[]).forEach(function(p){ R.users[p.id]={id:p.id,n:p.name,c:p.color}; }); Object.keys(R.sels).forEach(function(i){ if(!R.users[i]) delete R.sels[i]; }); X.redrawTags(); paint(); }
var selT=null;
X.onSel=function(s,k){ if(!R||!R.ready) return; R.mine={s:s,k:k}; clearTimeout(selT); selT=setTimeout(function(){ if(!R) return; var m={t:'sel',s:R.mine.s,k:R.mine.k};
  if(R.role==='guest') R.room.send(m); else { m.u='host'; R.room.all(m); } },80); };
X.peers=function(sid){ if(!R) return []; var o=[]; Object.keys(R.sels).forEach(function(u){ var p=R.sels[u], w=R.users[u]; if(w&&p.s===sid&&p.k.length&&u!==R.me.id) o.push({id:u,n:w.n,c:w.c,k:p.k}); }); return o; };
function setSel(u,m){ if(!R||!R.users[u]) return; R.sels[u]={s:String(m.s||''), k:(Array.isArray(m.k)?m.k:[]).filter(function(k){ return typeof k==='string'&&k.length<60; }).slice(0,60)}; X.redrawTags(); }
function myName(){ return RM.account().then(function(n){ return n==='?'?'':n; },function(){ return ''; }); }
function errText(k){ return k==='taken'?'방 코드가 겹쳤어요. 다시 만들어 주세요':k==='lib'?'연결 도구를 불러오지 못했어요':k==='nohost'?'그 코드의 방이 없어요':k==='full'?'방이 가득 찼어요':'연결할 수 없어요. 인터넷을 확인해 주세요'; }

/* ---------- the host ---------- */
function startHost(){ if(R) return; var d=X.deck; if(!d||!d.slides.length){ say('슬라이드가 하나 이상 있어야 방을 만들 수 있어요',true); return; }
  say('방을 만드는 중…'); var mine=R={role:'host', code:'', room:null, users:{}, me:{id:'host'}, base:payload(d), pend:{}, queue:[], seq:0, sels:{}, mine:{s:'',k:[]}, ready:false};
  myName().then(function(n){ if(R!==mine) return; n=n||T('방장');
    mine.room=RM.host({app:'slides', name:n,
      open:function(code){ if(R!==mine) return; mine.code=code; mine.ready=true; setUsers(mine.room.peers()); X.resel(); say(''); paint(); X.toast(T('방을 만들었어요')); },
      error:function(k){ if(R!==mine) return; say(errText(k),true); stop(true); },
      peers:function(l){ if(R===mine){ mine.me=mine.me||{id:'host'}; setUsers(l); } },
      join:function(p){ if(R!==mine) return; flush(); mine.room.send(p.id,{t:'snap', you:p.id, seq:mine.seq, p:payload(X.deck), sels:Object.assign({host:mine.mine},mine.sels)}); X.toast(F('{0}님이 들어왔어요',p.name)); },
      leave:function(p){ if(R!==mine) return; delete mine.sels[p.id]; X.redrawTags(); X.toast(F('{0}님이 나갔어요',p.name)); },
      msg:function(id,o){ if(R!==mine||!o) return;
        if(o.t==='ops'&&Array.isArray(o.ops)){ mine.queue.push({u:id,ops:o.ops.filter(okOp).slice(0,400)}); drain(); }
        else if(o.t==='sel'){ setSel(id,o); mine.room.all({t:'sel',u:id,s:o.s,k:o.k},id); } } });
    mine.code=mine.room.code; paint(); }); }

/* ---------- a guest ---------- */
function startGuest(code){ if(R) return; code=String(code||'').toUpperCase().replace(/[^A-Z0-9]/g,''); if(code.length<6){ say('방 코드는 6글자예요',true); return; } say('들어가는 중…');
  var mine=R={role:'guest', code:code, room:null, users:{}, me:null, base:null, pend:{}, queue:[], seq:0, sels:{}, mine:{s:'',k:[]}, ready:false}, gotSnap=false, give=setTimeout(function(){ if(R===mine&&!gotSnap){ say('방이 열려 있는지 확인해 주세요',true); stop(true); } },20000);
  paint();
  myName().then(function(n){ if(R!==mine) return;
    mine.room=RM.join(code,{app:'slides', name:n||T('손님')+' '+(1+Math.floor(Math.random()*98)),
      peers:function(l){ if(R===mine&&mine.me) setUsers(l); },
      msg:function(o){ if(R!==mine||!o) return;
        if(o.t==='snap'&&o.p&&Array.isArray(o.p.slides)){ gotSnap=true; clearTimeout(give); mine.seq=o.seq|0; mine.me={id:String(o.you)}; mine.users={}; setUsers(mine.room.peers());
          var d=X.fixDeck({id:X.uid(), name:o.p.name, theme:o.p.theme, font:o.p.font, trans:o.p.trans, footer:o.p.footer, nums:o.p.nums, master:o.p.master, auto:o.p.auto, slides:o.p.slides, t:Date.now()});
          X.openDeck(d); mine.base=payload(X.deck); mine.ready=true; X.resel(); mine.sels={}; Object.keys(o.sels||{}).forEach(function(i){ setSel(i,o.sels[i]); }); say(''); paint(); X.toast(T('함께 편집하는 방에 들어왔어요')); return; }
        if(!mine.ready) return;
        if(o.t==='ops'&&Array.isArray(o.ops)){ mine.queue.push({own:o.u===mine.me.id, u:o.u, ops:o.ops.filter(okOp).slice(0,400)}); drain(); }
        else if(o.t==='sel'&&o.u!==mine.me.id) setSel(o.u,o); },
      end:function(why){ if(R!==mine) return; if(mine.ready) stop(false,why==='closed'?'방장이 방을 닫았어요. 이 기기에는 자료가 남아 있어요':'함께 편집하는 방과 연결이 끊겼어요. 이 기기에는 자료가 남아 있어요'); else { say('방이 열려 있는지 확인해 주세요',true); stop(true); } },
      error:function(k){ if(R!==mine) return; say(errText(k),true); stop(true); } }); }); }

function stop(quiet,msg){ var r=R; if(!r) return; R=null; clearTimeout(soonT); clearTimeout(selT); try{ if(r.room) r.room.close(); }catch(e){} X.redrawTags(); paint(); if(msg) X.toast(T(msg)); else if(!quiet) X.toast(T('함께 편집을 끝냈어요')); }

/* ---------- the share dialog and the chip in the top bar ---------- */
function say(t,bad){ var e=$('rtMsg'); if(!e) return; e.textContent=t?T(t):''; e.className='coMsg'+(bad?' bad':''); }
function paint(){ var box=$('rtBox'); if(!box) return;
  $('rtOff').hidden=!!R; $('rtOn').hidden=!R;
  if(R){ var us=usersList(); $('rtWho').textContent=F('{0}명이 함께 고치는 중: {1}',us.length,us.map(function(w){ return w.n; }).join(', ')||'…'); $('rtLink').value=R.role==='host'?RM.link(R.code):R.code;
    $('rtCopy').hidden=R.role!=='host'; $('rtLink').hidden=R.role!=='host'; $('rtStop').textContent=T(R.role==='host'?'방 닫기 (모두 나가요)':'방에서 나가기'); }
  var c=$('rtSt'); if(c){ c.hidden=!R; if(R){ var n=usersList().length; c.textContent=R.ready?F('실시간 함께 편집 · {0}명',n||1):T('들어가는 중…'); c.className='coSt rt'; } } }
$('rtMake').onclick=function(){ startHost(); };
$('rtJoin').onclick=function(){ startGuest($('rtCode').value); };
$('rtCode').addEventListener('keydown',function(e){ e.stopPropagation(); if(e.key==='Enter'){ e.preventDefault(); $('rtJoin').click(); } });
$('rtCopy').onclick=function(){ var t=$('rtLink').value, ok=function(){ X.toast(T('링크를 복사했어요')); }, fb=function(){ $('rtLink').select(); try{ if(document.execCommand('copy')) return ok(); }catch(e){} X.toast(T('링크를 길게 눌러 복사해 주세요')); };
  if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok,fb); else fb(); };
$('rtLink').addEventListener('focus',function(){ this.select(); });
$('rtStop').onclick=function(){ stop(false); };
$('rtSt').onclick=function(){ var b=$('shareBtn'); if(b) b.click(); };
new MutationObserver(function(){ if($('shareDlg').classList.contains('open')){ paint(); say(''); } }).observe($('shareDlg'),{attributes:true,attributeFilter:['class']});
addEventListener('beforeunload',function(){ if(R&&R.room) try{ R.room.close(); }catch(e){} });
/* a link with #r=CODE: go into that room */
(function(){ var c=RM.codeFromUrl(); if(!c) return; try{ history.replaceState(null,'',location.href.split('#')[0]); }catch(e){} startGuest(c); })();
paint();
window.__frt={get room(){ return R; }, host:startHost, join:startGuest, stop:stop, diff:diff, put:put, payload:payload};
})();
