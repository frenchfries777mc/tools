/* Fry Docs: 같이 고치기 (several people in one document at the same time), on the shared room layer ../peer-room.js (PeerJS).
   The host keeps the real document and sends every change on to the others; a guest who joins gets the whole document first (the layer cuts big messages into frames).
   The document is split into its top-level blocks (paragraphs, headings, lists, tables). Each block carries a hidden id (data-b) and a version the host counts up.
   Changes travel as small block operations: set (new text of one block, and where it sits) and del. Two people typing in different blocks never lose anything.
   Two people changing the same block at the same moment: the one the host hears last wins, and the colour name tags show who is in which block so people stay out of each other's way.
   The host's order of blocks is the real one: after a change that adds, moves or removes blocks the host also sends the whole order. Everything that comes from outside goes through clean() again. */
(function(){
'use strict';
var D=window.FDOCS; if(!D||!window.FFRoom) return;
var T=function(s){ return window.FFT&&FFT.T?FFT.T(s):s; }, F=function(s){ var a=arguments; s=T(s); return s.replace(/\{(\d)\}/g,function(m,i){ return a[+i+1]; }); };
function $(id){ return document.getElementById(id); }
var page=D.page, R=null;

/* ---------- blocks ---------- */
function nid(){ return Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-3); }
function okId(id){ return typeof id==='string'&&/^[a-z0-9]{4,16}$/.test(id); }
function byId(id){ return okId(id)?page.querySelector(':scope > [data-b="'+id+'"]'):null; }
function ensureIds(){ var seen={}; Array.prototype.forEach.call(page.children,function(el){ var id=el.getAttribute('data-b'); if(!okId(id)||seen[id]){ id=nid(); el.setAttribute('data-b',id); } seen[id]=1; }); }
function ser(el){ var c=el.cloneNode(true); c.removeAttribute('data-b'); Array.prototype.forEach.call(c.querySelectorAll('.sel,.flash'),function(x){ x.classList.remove('sel','flash'); if(!x.getAttribute('class')) x.removeAttribute('class'); }); return c.outerHTML; }
function blockFrom(html){ if(typeof html!=='string'||html.length>6e6) return null; var d=document.createElement('div'); d.innerHTML=D.clean(html); return d.firstElementChild; }
function orderIds(){ return Array.prototype.map.call(page.children,function(el){ return el.getAttribute('data-b'); }); }
function setPreds(){ var prev=null; R.S.pred={}; Array.prototype.forEach.call(page.children,function(el){ var id=el.getAttribute('data-b'); R.S.pred[id]=prev; prev=id; }); }
function caretIn(el){ var s=getSelection(); if(!s.rangeCount||!el.contains(s.anchorNode)) return -1; var r=document.createRange(); r.selectNodeContents(el); r.setEnd(s.anchorNode,s.anchorOffset); return r.toString().length; }
function putCaret(el,off){ var w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT), n, left=off, r=document.createRange(), s=getSelection();
  while((n=w.nextNode())){ if(n.length>=left){ r.setStart(n,left); r.collapse(true); s.removeAllRanges(); s.addRange(r); return; } left-=n.length; } r.selectNodeContents(el); r.collapse(false); s.removeAllRanges(); s.addRange(r); }
/* a block that comes from outside: new text for an old block keeps the caret of whoever is typing in it */
function morph(el,ne){ if(el.tagName!==ne.tagName){ ne.setAttribute('data-b',el.getAttribute('data-b')); el.replaceWith(ne); return ne; }
  var off=caretIn(el); Array.prototype.slice.call(el.attributes).forEach(function(a){ if(a.name!=='data-b') el.removeAttribute(a.name); }); Array.prototype.forEach.call(ne.attributes,function(a){ el.setAttribute(a.name,a.value); });
  el.innerHTML=ne.innerHTML; if(off>=0) putCaret(el,off); return el; }
function place(el,after,isNew){ var pv=el.parentNode===page&&el.previousElementSibling?el.previousElementSibling.getAttribute('data-b'):null; if(el.parentNode===page&&pv===after) return;
  var a=after?byId(after):null; if(after&&!a){ if(isNew){ page.appendChild(el); R.mv=true; } return; } page.insertBefore(el,a?a.nextSibling:page.firstChild); R.mv=true; }
function applySet(id,html,after){ var el=byId(id), ne=html!==undefined?blockFrom(html):null;
  if(html!==undefined&&!ne) return el;
  if(ne){ if(el){ if(ser(el)!==ser(ne)) el=morph(el,ne); } else { el=ne; el.setAttribute('data-b',id); place(el,after===undefined?null:after,true); R.mv=true; } }
  if(el&&after!==undefined) place(el,after,false);
  return el; }
function applyOrder(ord){ if(!Array.isArray(ord)) return; var want=ord.filter(function(id){ return byId(id); }), set={}; want.forEach(function(id){ set[id]=1; });
  var cur=orderIds(), mine=cur.filter(function(id){ return set[id]; }); if(want.join()===mine.join()) return;
  var anchors={'':[]}, last=''; cur.forEach(function(id){ if(set[id]){ last=id; anchors[id]=anchors[id]||[]; } else anchors[last].push(id); });
  var res=anchors[''].slice(); want.forEach(function(id){ res.push(id); (anchors[id]||[]).forEach(function(x){ res.push(x); }); });
  var ref=page.firstChild; res.forEach(function(id){ var el=byId(id); if(el===ref) ref=ref.nextSibling; else page.insertBefore(el,ref); }); }

/* ---------- what this browser last agreed on (S) and what changed since ---------- */
function localOps(){ ensureIds(); var ops=[], seen={}, struct=false, prev=null, host=R.role==='host';
  Array.prototype.forEach.call(page.children,function(el){ var id=el.getAttribute('data-b'), h=ser(el), s=R.S.map[id]; seen[id]=1;
    var chg=!s||s.h!==h, mv=R.S.pred[id]!==prev||!s; if(!s||mv) struct=true;
    if(chg||mv){ var op={k:'set',id:id,after:prev,bv:s?s.v:0}; if(chg) op.html=h; if(host){ op.v=(s?s.v:0)+1; keep(id,op.v,h); } R.S.map[id]={h:h,v:host?op.v:(s?s.v:0),by:host?'host':'me'}; ops.push(op); }
    R.S.pred[id]=prev; prev=id; });
  Object.keys(R.S.map).forEach(function(id){ if(!seen[id]){ ops.push({k:'del',id:id}); delete R.S.map[id]; delete R.S.pred[id]; struct=true; } });
  return {ops:ops,struct:struct}; }
function out(d){ if(R.role==='host') R.h.all(d); else R.g.send(d); }
function tickNow(){ if(!R||!R.ready) return; clearTimeout(R.tt); R.tt=0; if(R.applying) return; var r=localOps();
  if(r.ops.length){ if(R.role==='host'){ var o={k:'ops',ops:r.ops,by:'host'}; if(r.struct) o.ord=orderIds(); R.h.all(o); } else R.g.send({k:'ops',ops:r.ops}); }
  metaTick(); drawCursors(); }
function tickSoon(){ if(!R||!R.ready||R.applying||R.tt) return; R.tt=setTimeout(tickNow,150); }
function afterRemote(){ D.count(); D.saveSoon(); drawCursors(); }
function later(fn){ if(R.comp) R.queue.push(fn); else fn(); }
function startObs(){ R.obs=new MutationObserver(function(){ tickSoon(); }); R.obs.observe(page,{childList:true,characterData:true,attributes:true,subtree:true}); }

/* lists and tables are one block each: when two people changed the same one, the host merges them item by item (list item, table cell) from the version the sender started with */
function items(el){ return el.tagName==='TABLE'?Array.prototype.slice.call(el.querySelectorAll('td,th')):Array.prototype.filter.call(el.children,function(x){ return x.tagName==='LI'; }); }
function shape(el){ return el.tagName==='TABLE'?Array.prototype.map.call(el.rows,function(r){ return r.cells.length; }).join(','):String(items(el).length); }
function mergeBlock(b,m,t){ if(!b) return null; var B=blockFrom(b), M=blockFrom(m), X=blockFrom(t); if(!B||!M||!X||B.tagName!==M.tagName||B.tagName!==X.tagName||shape(B)!==shape(M)||shape(B)!==shape(X)) return null;
  var bi=items(B), mi=items(M); items(X).forEach(function(x,i){ if(mi[i].innerHTML!==bi[i].innerHTML) x.innerHTML=mi[i].innerHTML; }); return X.outerHTML; }
function keep(id,v,h){ if(!/^<(ul|ol|table)/i.test(h)) return; var o=R.hist[id]||(R.hist[id]={}); o[v]=h; Object.keys(o).sort(function(a,b){ return a-b; }).slice(0,-8).forEach(function(k){ delete o[k]; }); }

/* ---------- the host takes changes from a guest, puts them in its document and tells the others ---------- */
function hostOps(from,ops){ tickNow(); var outOps=[], vs={}, redo=[]; R.applying=true; R.mv=false; var struct=false;
  (Array.isArray(ops)?ops:[]).slice(0,3000).forEach(function(op){ if(!op||!okId(op.id)) return;
    if(op.k==='del'){ var el=byId(op.id); if(el) el.remove(); if(R.S.map[op.id]){ delete R.S.map[op.id]; outOps.push({k:'del',id:op.id}); struct=true; } return; }
    if(op.k!=='set') return; var cur=R.S.map[op.id], conflict=!!cur&&(op.bv||0)<cur.v&&cur.by!==from, after=op.after===null||okId(op.after)?op.after:undefined;
    var html=typeof op.html==='string'?op.html:undefined; if(conflict&&html!==undefined&&/^<(ul|ol|table)/i.test(cur.h)){ var mg=mergeBlock((R.hist[op.id]||{})[op.bv||0],html,cur.h); if(mg) html=mg; } var el2=applySet(op.id,html,after); if(!el2) return; if(!cur) struct=true;
    var nv=(cur?cur.v:0)+1; R.S.map[op.id]={h:ser(el2),v:nv,by:from}; vs[op.id]=nv; var h2=R.S.map[op.id].h; keep(op.id,nv,h2);
    outOps.push({k:'set',id:op.id,after:after,html:html!==undefined?h2:undefined,v:nv}); if(conflict) redo.push({k:'set',id:op.id,after:after,html:h2,v:nv}); });
  if(R.mv) struct=true; setPreds(); R.obs.takeRecords(); R.applying=false; afterRemote();
  var ord=struct?orderIds():undefined; R.h.all({k:'ops',ops:outOps,ord:ord,by:from},from); R.h.send(from,{k:'ack',vs:vs,ord:ord,redo:redo}); }

/* ---------- a guest takes changes from the host ---------- */
function applyRemote(ops,ord,by){ later(function(){ if(!R||!R.ready) return; tickNow(); R.applying=true; R.mv=false;
  (Array.isArray(ops)?ops:[]).forEach(function(op){ if(!op||!okId(op.id)) return;
    if(op.k==='del'){ var el=byId(op.id); if(el) el.remove(); delete R.S.map[op.id]; return; }
    if(op.k!=='set') return; var after=op.after===null||okId(op.after)?op.after:undefined, el2=applySet(op.id,typeof op.html==='string'?op.html:undefined,after);
    if(el2) R.S.map[op.id]={h:ser(el2),v:+op.v||0,by:by||'host'}; });
  if(ord) applyOrder(ord); if(!page.firstChild) page.innerHTML='<p><br></p>'; ensureIds(); setPreds(); Array.prototype.forEach.call(page.children,function(el){ var id=el.getAttribute('data-b'); if(!R.S.map[id]) R.S.map[id]={h:ser(el),v:0,by:'me'}; });
  R.obs.takeRecords(); R.applying=false; afterRemote(); tickSoon(); }); }

/* ---------- the paper and style settings of the document ---------- */
var PAPERS={A4:1,A5:1,B5:1,Letter:1,Legal:1}, MARS={n:1,s:1,m:1,w:1}, PNS={'':1,bc:1,br:1,bl:1,tr:1};
function metaOf(){ var d=D.getDoc(); return JSON.stringify({pg:d.pg||null,font:d.font||'sans',sty:d.sty||null}); }
function metaTick(){ if(!R||!R.ready) return; var m=metaOf(); if(m===R.meta) return; R.meta=m; out({k:'meta',m:JSON.parse(m)}); }
function applyMeta(m){ if(!m||typeof m!=='object') return; var d=D.getDoc(), g=m.pg, pg=null;
  if(g&&typeof g==='object') pg={paper:PAPERS[g.paper]?g.paper:'A4', land:g.land?1:0, mar:MARS[g.mar]?g.mar:'n', cols:[1,2,3].indexOf(+g.cols)>=0?+g.cols:1, hd:String(g.hd||'').slice(0,120), ft:String(g.ft||'').slice(0,120), pn:PNS[g.pn]?g.pn:'', wm:String(g.wm||'').slice(0,30)};
  var sty=null; if(m.sty&&typeof m.sty==='object'){ sty={}; ['h1','h2','h3'].forEach(function(k){ var v=m.sty[k]; if(Array.isArray(v)) sty[k]=[Math.max(0,Math.min(72,+v[0]||0)),/^#[0-9a-f]{6}$/i.test(v[1]||'')?v[1]:'']; }); }
  d.pg=pg; d.sty=sty; D.setFont(m.font==='serif'?'serif':'sans',true); D.applyPg(); R.meta=metaOf(); D.saveSoon(); }

/* ---------- messages ---------- */
function hostMsg(from,d){ if(!R||!d) return;
  if(d.k==='ops') hostOps(from,d.ops);
  else if(d.k==='cur'){ if(okId(d.b)&&d.o>=0){ R.cur[from]={b:d.b,o:Math.min(1e6,+d.o|0)}; R.h.relay(from,{k:'cur',b:d.b,o:R.cur[from].o}); drawCursors(); } }
  else if(d.k==='meta'){ applyMeta(d.m); R.h.relay(from,{k:'meta',m:d.m}); } }
function guestMsg(d,from){ if(!R||!d) return;
  if(d.k==='snap') return gotSnap(d);
  if(!R.ready) return;
  if(d.k==='ops') applyRemote(d.ops,d.ord,d.by);
  else if(d.k==='ack'){ Object.keys(d.vs||{}).forEach(function(id){ if(R.S.map[id]) R.S.map[id].v=+d.vs[id]||0; }); if((d.redo&&d.redo.length)||d.ord) applyRemote(d.redo||[],d.ord,'host'); }
  else if(d.k==='cur'){ if(okId(d.b)&&d.o>=0&&from){ R.cur[from]={b:d.b,o:Math.min(1e6,+d.o|0)}; drawCursors(); } }
  else if(d.k==='meta') applyMeta(d.m); }
function gotSnap(d){ if(R.ready||!Array.isArray(d.blocks)) return; var meta=d.meta||{}; R.joining=true; var nd=D.newDoc(String(meta.name||T('제목 없는 문서')).slice(0,80),''); R.joining=false; R.doc=nd;
  page.innerHTML=''; R.S={map:{},pred:{}};
  d.blocks.forEach(function(b){ if(!b||!okId(b.id)) return; var ne=blockFrom(b.html); if(!ne) return; ne.setAttribute('data-b',b.id); page.appendChild(ne); R.S.map[b.id]={h:ser(ne),v:+b.v||0,by:'host'}; });
  if(!page.firstChild) page.innerHTML='<p><br></p>'; ensureIds(); Array.prototype.forEach.call(page.children,function(el){ var id=el.getAttribute('data-b'); if(!R.S.map[id]) R.S.map[id]={h:ser(el),v:0,by:'me'}; }); setPreds();
  applyMeta(meta); R.ready=true; startObs(); D.count(); D.saveNow(); paintRm(); tickSoon(); }

/* ---------- other people's carets and name tags ---------- */
function layer(){ var l=$('rmLayer'); if(!l){ l=document.createElement('div'); l.id='rmLayer'; $('desk').appendChild(l); } return l; }
function drawCursors(){ var l=$('rmLayer'); if(l) l.innerHTML=''; if(!R||!R.ready) return; l=layer(); var dk=$('desk'), dr=dk.getBoundingClientRect();
  R.peers.forEach(function(p){ if(p.id===R.me||p.id===R.mineId) return; var c=R.cur[p.id], el=c&&byId(c.b); if(!el) return;
    var rc=null, w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT), n, left=c.o, r=document.createRange(); while((n=w.nextNode())){ if(n.length>=left){ r.setStart(n,left); r.collapse(true); rc=r.getClientRects()[0]||null; break; } left-=n.length; }
    var er=el.getBoundingClientRect(); if(!rc||!rc.height) rc={left:er.left,top:er.top,height:er.height>40?20:er.height};
    var x=rc.left-dr.left+dk.scrollLeft, y=rc.top-dr.top+dk.scrollTop, bar=document.createElement('i'); bar.className='rmbar'; bar.style.cssText='left:'+(er.left-dr.left+dk.scrollLeft-8)+'px;top:'+(er.top-dr.top+dk.scrollTop)+'px;height:'+er.height+'px;background:'+p.color; l.appendChild(bar);
    var cu=document.createElement('i'); cu.className='rmcur'; cu.style.cssText='left:'+x+'px;top:'+y+'px;height:'+rc.height+'px;background:'+p.color; l.appendChild(cu);
    var tg=document.createElement('b'); tg.className='rmtag'; tg.textContent=p.name; tg.style.cssText='left:'+x+'px;top:'+(y-16)+'px;background:'+p.color; l.appendChild(tg); }); }
function sendCursor(){ if(!R||!R.ready) return; var s=getSelection(); if(!s.rangeCount||!page.contains(s.anchorNode)) return; var n=s.anchorNode; while(n&&n.parentNode!==page) n=n.parentNode; if(!n||n.nodeType!==1) return;
  var id=n.getAttribute('data-b'); if(!id) return; var r=document.createRange(); r.selectNodeContents(n); r.setEnd(s.anchorNode,s.anchorOffset); var o=r.toString().length, k=id+':'+o; if(k===R.lastCur) return; R.lastCur=k; out({k:'cur',b:id,o:o}); }
document.addEventListener('selectionchange',function(){ if(!R||!R.ready) return; clearTimeout(R.ct); R.ct=setTimeout(sendCursor,120); });
window.addEventListener('resize',function(){ drawCursors(); });
page.addEventListener('compositionstart',function(){ if(R) R.comp=true; });
page.addEventListener('compositionend',function(){ if(!R) return; R.comp=false; var q=R.queue; R.queue=[]; q.forEach(function(f){ f(); }); });

/* ---------- the dialog, the button and the room itself ---------- */
var ERR={net:'연결할 수 없어요. 인터넷을 확인해 주세요',lib:'같이 고치기 도구를 불러오지 못했어요',nohost:'그 코드의 방이 없어요. 방장이 방을 열어 두었는지 확인해 주세요',full:'방이 가득 찼어요',taken:'방을 만들지 못했어요. 다시 해 보세요',app:'문서 방이 아니에요'};
function say(t,bad){ var e=$('rmMsg'); e.textContent=t?T(t):''; e.style.color=bad?'#ff7b7b':''; }
function stopRoom(){ if(!R) return; clearTimeout(R.tt); clearTimeout(R.ct); clearInterval(R.mi); try{ if(R.obs) R.obs.disconnect(); }catch(e){} R=null; var l=$('rmLayer'); if(l) l.innerHTML=''; paintRm(); }
function failRm(k){ stopRoom(); say(ERR[k]||ERR.net,true); D.openDlg('rmDlg'); }
function paintRm(){ var on=!!R, host=on&&R.role==='host'; $('rmOff').hidden=on; $('rmOn').hidden=!on; $('rmHostBox').hidden=!host; $('rmEnd').hidden=!on; $('rmEnd').textContent=T(host?'방 닫기':'방에서 나가기'); $('rmEnd').dataset.sure='';
  $('rmBadge').hidden=!on; $('rmBadge').textContent='👥 '+F('같이 고치는 중 ({0}명)',on?Math.max(1,R.peers.length):1); var b=$('rmBtn'); if(b) b.classList.toggle('on',on);
  if(!on) return; $('rmCodeShow').textContent=R.code||'…'; $('rmLink').value=R.code?FFRoom.link(R.code):''; var box=$('rmPeers'); box.innerHTML='';
  R.peers.forEach(function(p){ var row=document.createElement('div'); row.className='rmp'; var dot=document.createElement('i'); dot.style.background=p.color; var nm=document.createElement('span'); nm.setAttribute('data-notr',''); nm.textContent=p.name;
    var tg=document.createElement('small'); tg.textContent=(p.id==='host'?T('방장'):'')+(p.id===R.me||(R.role==='host'&&p.id==='host')?(p.id==='host'?' · ':'')+T('나'):''); row.appendChild(dot); row.appendChild(nm); row.appendChild(tg); box.appendChild(row); }); }
function nameOk(){ var n=$('rmName').value.replace(/\s+/g,' ').trim().slice(0,20); if(!n){ say('내 이름을 써 주세요',true); $('rmName').focus(); } return n; }
function startHost(name){ if(R) return; R={role:'host',name:name,peers:[],S:{map:{},pred:{}},hist:{},cur:{},queue:[],doc:D.getDoc(),ready:true,me:'host',mineId:'host'}; ensureIds();
  Array.prototype.forEach.call(page.children,function(el){ var id=el.getAttribute('data-b'); var h0=ser(el); R.S.map[id]={h:h0,v:1,by:'host'}; keep(id,1,h0); }); setPreds(); R.meta=metaOf(); startObs(); R.mi=setInterval(metaTick,1500);
  say('방을 만드는 중…'); paintRm();
  R.h=FFRoom.host({app:'docs',name:name,
    open:function(code){ R.code=code; R.peers=R.h.peers(); say(''); paintRm(); },
    error:function(k){ failRm(k); },
    join:function(p){ if(!R) return; tickNow(); R.cur={}; var blocks=Array.prototype.map.call(page.children,function(el){ var id=el.getAttribute('data-b'), s=R.S.map[id]; return {id:id,html:s.h,v:s.v}; }); var d=D.getDoc();
      R.h.send(p.id,{k:'snap',blocks:blocks,meta:{name:d.name,pg:d.pg||null,font:d.font||'sans',sty:d.sty||null}}); D.toast(F('{0}님이 들어왔어요',p.name)); },
    leave:function(p){ if(!R) return; delete R.cur[p.id]; drawCursors(); D.toast(F('{0}님이 나갔어요',p.name)); },
    msg:hostMsg,
    peers:function(l){ if(!R) return; R.peers=l; paintRm(); drawCursors(); } }); }
function startGuest(code,name){ if(R) return; R={role:'guest',name:name,peers:[],S:{map:{},pred:{}},cur:{},queue:[],ready:false}; say('들어가는 중…'); paintRm();
  R.mi=setInterval(metaTick,1500);
  R.g=FFRoom.join(code,{app:'docs',name:name,
    open:function(i){ if(!R) return; R.me=i.id; say(''); paintRm(); },
    msg:guestMsg,
    peers:function(l){ if(!R) return; R.peers=l; paintRm(); drawCursors(); },
    end:function(why){ if(!R) return; D.saveNow(); stopRoom(); say(why==='closed'?'방장이 방을 닫았어요. 지금 문서는 이 기기에 남아 있어요. 파일로 받거나 내 문서에서 다시 열 수 있어요.':'연결이 끊어졌어요. 지금 문서는 이 기기에 남아 있어요. 파일로 받거나 내 문서에서 다시 열 수 있어요.',true); D.openDlg('rmDlg'); },
    error:function(k){ failRm(k); } }); }
function openRm(){ paintRm(); if(!R) say(''); D.openDlg('rmDlg'); if(!$('rmName').value){ $('rmName').value=T('손님')+' '+(1+Math.floor(Math.random()*99)); } FFRoom.account().then(function(n){ if(n&&!R&&/^손님 \d+$|^Guest \d+$/.test($('rmName').value+'')) $('rmName').value=n; else if(n&&!$('rmName').value) $('rmName').value=n; }); }
$('rmMake').onclick=function(){ var n=nameOk(); if(n) startHost(n); };
$('rmJoin').onclick=function(){ var n=nameOk(); if(!n) return; var c=FFRoom.cleanCode($('rmCode').value); if(c.length<6){ say('방 코드 6글자를 써 주세요',true); $('rmCode').focus(); return; } startGuest(c,n); };
$('rmCode').addEventListener('input',function(){ this.value=FFRoom.cleanCode(this.value); });
$('rmCopy').onclick=function(){ var v=$('rmLink').value; function ok(){ D.toast('링크를 복사했어요'); } if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(v).then(ok,function(){ $('rmLink').select(); }); else $('rmLink').select(); };
$('rmEnd').onclick=function(){ if(!R) return; var b=this; if(R.role==='host'&&!b.dataset.sure){ b.dataset.sure='1'; b.textContent=T('정말 닫을까요? 한 번 더 누르세요'); clearTimeout(b.t); b.t=setTimeout(function(){ if(R){ b.dataset.sure=''; b.textContent=T('방 닫기'); } },4000); return; }
  var host=R.role==='host'; tickNow(); D.saveNow(); try{ (host?R.h:R.g).close(); }catch(e){} stopRoom(); say(host?'방을 닫았어요. 문서는 이 기기에 그대로 남아 있어요.':'방에서 나왔어요. 문서는 이 기기에 남아 있어요.'); };
D.hb('review','👥 같이 고치기','rmBtn',openRm);
D.inRoom=function(){ return !!R&&!!R.ready; };
D.onDoc=function(d){ if(!R||R.joining||!R.doc||d===R.doc) return; var host=R.role==='host'; try{ (host?R.h:R.g).close(); }catch(e){} stopRoom(); D.toast('다른 문서를 열어서 같이 고치기를 끝냈어요'); };
window.addEventListener('pagehide',function(){ if(R){ try{ (R.role==='host'?R.h:R.g).close(); }catch(e){} } });
(function(){ var c=FFRoom.codeFromUrl(); if(c){ $('rmCode').value=c; setTimeout(openRm,400); } })();
})();
