/* Fry together (같이 고치기) for the tools that keep one document: Code, Blocks, Draw, Score. Needs ../peer-room.js (FFRoom, PeerJS).
   A tool gives FFCo.init() an adapter and calls FFCo.touch() whenever its document changed; the rest (room, dialog, sending, merging) is here.
     adapter = { app:'code', noun:'파일'|'작품'|..., read()->{meta:{key:json}, items:{id:json|string}, order:[id]|null}, name()->string,
                 write(chg), copy(state,name)->bool, mount(btn), get(id)? }
       write(chg): {meta:{key:v}, set:{id:v}, del:[id], order:[id]|null, at:{id:{at,del,ins}}}  what other people changed (at = where a text patch landed, to keep a caret)
       copy(state,name): the guest gets the host's document as a document of its own (state has the same shape as read()).
   The host's document is the real one. Every change is found by comparing read() with what was last sent or received (base), and goes as small ops:
     s {id,v} set item   t {id,s,r,i,pre,post} text patch   d {id} delete   o {ord} order   m {key,v} meta
   Text (a string item) is merged: a patch carries the text it removes and a few letters around it, and every copy finds that place again, so two people typing in one text keep both edits.
   Anything else is last-writer-wins at the host; a guest ignores other people's ops on a key of its own that the host has not acknowledged yet.
   The host sends a short checksum of every key every few seconds; a guest whose copy differs twice asks for that key again, so a lost edit never stays. */
(function(root){
'use strict';
if(!root.document||root.FFCo) return;
var T=function(s){ return root.FFT&&FFT.T?FFT.T(s):s; }, F=function(s){ var a=arguments; s=T(s); return josa(s.replace(/\{(\d)\}/g,function(m,i){ return a[+i+1]; })); };
/* Korean: 파일을(를) -> 파일을, 그림을(를) -> 그림을, 악보을(를) -> 악보를 (other languages never contain these) */
function josa(s){ return s.replace(/([가-힣])(을\(를\)|이\(가\)|은\(는\)|와\(과\))/g,function(m,c,p){ var b=(c.charCodeAt(0)-0xAC00)%28!==0, k=p.charAt(0); return c+(k==='을'?(b?'을':'를'):k==='이'?(b?'이':'가'):k==='은'?(b?'은':'는'):(b?'과':'와')); }); }
function sj(o){ if(o==null||typeof o!=='object') return JSON.stringify(o); if(Array.isArray(o)) return '['+o.map(sj).join(',')+']';
  return '{'+Object.keys(o).sort().map(function(k){ return JSON.stringify(k)+':'+sj(o[k]); }).join(',')+'}'; }
function clean(o){ var c; try{ c=JSON.parse(JSON.stringify(o)); }catch(e){ return null; }
  (function strip(x){ if(x&&typeof x==='object'){ ['__proto__','constructor','prototype'].forEach(function(k){ if(Object.prototype.hasOwnProperty.call(x,k)) delete x[k]; }); Object.keys(x).forEach(function(k){ strip(x[k]); }); } })(c); return c; }
function hash(s){ var h1=0xdeadbeef, h2=0x41c6ce57, ch; for(var i=0;i<s.length;i++){ ch=s.charCodeAt(i); h1=Math.imul(h1^ch,2654435761); h2=Math.imul(h2^ch,1597334677); }
  h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909); h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909); return (h2>>>0).toString(36)+(h1>>>0).toString(36); }
function okId(s){ return typeof s==='string'&&s.length>0&&s.length<80; }
function okKey(s){ return typeof s==='string'&&/^[A-Za-z0-9_.-]{1,40}$/.test(s); }

/* ---------- text patches ---------- */
var CTX=12, MAXR=2000;
function mkPatch(a,b){ var n=Math.min(a.length,b.length), p=0; while(p<n&&a.charCodeAt(p)===b.charCodeAt(p)) p++;
  var q=0, m=n-p; while(q<m&&a.charCodeAt(a.length-1-q)===b.charCodeAt(b.length-1-q)) q++;
  var r=a.slice(p,a.length-q), i=b.slice(p,b.length-q); if(r.length>MAXR||i.length>3e6) return null;
  return {s:p,r:r,i:i,pre:a.slice(Math.max(0,p-CTX),p),post:a.slice(a.length-q,a.length-q+CTX)}; }
function locate(text,o){ var r=o.r, pre=o.pre||'', post=o.post||'', want=Math.max(0,(o.s|0));
  function near(needle,off){ if(!needle) return Math.min(want,text.length); var best=-1, bd=1e15, at=text.indexOf(needle); while(at>=0){ var q=at+off, d=Math.abs(q-want); if(d<bd){ bd=d; best=q; } at=text.indexOf(needle,at+1); } return best; }
  var pe=pre.length<CTX, po=post.length<CTX, q=near(pre+r+post,pre.length);
  if(q>=0&&(!pe||q===pre.length)&&(!po||q+r.length+post.length===text.length)) return q;
  q=near(pre+r,pre.length); if(q>=0&&(!pe||q===pre.length)) return q;
  q=near(r+post,0); if(q>=0&&r.length&&(!po||q+r.length+post.length===text.length)) return q;
  /* somebody else changed the letters right next to it: look for shorter neighbours */
  var ks=[8,5,3], i, k, x, y;
  for(i=0;i<3;i++){ k=ks[i]; x=pre.slice(-k); y=post.slice(0,k); if(x.length===k&&y.length===k){ q=near(x+r+y,k); if(q>=0) return q; } }
  for(i=0;i<3;i++){ k=ks[i]; x=pre.slice(-k); if(x.length===k){ q=near(x+r,k); if(q>=0) return q; } }
  for(i=0;i<3;i++){ k=ks[i]; y=post.slice(0,k); if(y.length===k){ q=near(r+y,0); if(q>=0) return q; } }
  return -1; }
function applyPatch(text,o){ var q=locate(text,o); return q<0?null:{text:text.slice(0,q)+o.i+text.slice(q+o.r.length),at:q}; }

/* ---------- the engine ---------- */
var COLORS=null, ERR={taken:'이미 쓰고 있는 코드예요. 다시 만들어 주세요',nohost:'그 코드의 방을 찾지 못했어요. 코드를 다시 확인해 주세요',net:'연결 서버에 닿지 못했어요. 인터넷 연결을 확인해 주세요',lib:'같이 고치기에 필요한 연결 도구를 불러오지 못했어요. 인터넷 연결을 확인해 주세요',full:'이 방은 사람이 가득 찼어요',app:'다른 도구의 방이에요. 그 도구에서 들어가 주세요'};
var A=null, room=null, guest=null, role='', myId='', code='', peers=[], base=null, ready=false, applying=false, touchT=null, joinT=null, hbT=null, bseq=0, pend={}, sent={}, sus={}, remoteSince=false;
var LSN='ffco.name', $=function(id){ return document.getElementById(id); };
function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function lsSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }

function mkBase(st){ var b={m:{},i:{},o:null}; Object.keys(st.meta||{}).forEach(function(k){ b.m[k]=sj(st.meta[k]); });
  Object.keys(st.items||{}).forEach(function(id){ var v=st.items[id]; b.i[id]=typeof v==='string'?v:sj(v); }); b.o=st.order?st.order.join('\n'):null; return b; }
function pure(st){ var ops=[], nb=mkBase(st), k;
  Object.keys(st.meta||{}).forEach(function(k){ if(nb.m[k]!==base.m[k]) ops.push({k:'m',key:k,v:st.meta[k]}); });
  Object.keys(st.items||{}).forEach(function(id){ var v=st.items[id], bv=base.i[id];
    if(bv===undefined){ ops.push({k:'s',id:id,v:v}); return; }
    if(nb.i[id]===bv) return;
    if(typeof v==='string'&&typeof bv==='string'){ var p=mkPatch(bv,v); if(p) ops.push({k:'t',id:id,s:p.s,r:p.r,i:p.i,pre:p.pre,post:p.post}); else ops.push({k:'s',id:id,v:v}); }
    else ops.push({k:'s',id:id,v:v}); });
  Object.keys(base.i).forEach(function(id){ if(!(id in (st.items||{}))) ops.push({k:'d',id:id}); });
  if(st.order&&nb.o!==base.o) ops.push({k:'o',ord:st.order});
  return {ops:ops,nb:nb}; }
function keysOf(o){ return [o.k==='m'?'m:'+o.key:o.k==='o'?'o':'i:'+o.id]; }
function flush(){
  if(!role||!ready||applying) return; var st; try{ st=A.read(); }catch(e){ return; } if(!st) return; var d=pure(st); if(!d.ops.length) return; base=d.nb;
  if(role==='host') room.all({t:'ops',ops:d.ops,by:'host'});
  else { var bid=++bseq, ks=[]; d.ops.forEach(function(o){ keysOf(o).forEach(function(k){ if(o.k!=='t') pend[k]=(pend[k]||0)+1; ks.push(k); }); }); sent[bid]=ks; guest.send({t:'ops',bid:bid,ops:d.ops}); }
}
function touch(){ if(!role||!ready||applying) return; clearTimeout(touchT); touchT=setTimeout(flush,120); }

/* other people's ops -> the document. returns {fix:[ops for the sender], need:[keys to ask the host for]} */
function apply(ops,force){
  var out={fix:[],need:[]}; if(!Array.isArray(ops)||!ops.length) return out; var cur=null;
  function now(){ if(!cur) cur=A.read()||{meta:{},items:{},order:null}; return cur; }
  var chg={meta:{},set:{},del:[],order:null,at:{}}, any=false;
  ops.forEach(function(o){ if(!o||typeof o!=='object') return; var id=o.id, key;
    if(o.k==='s'){ if(!okId(id)||(!force&&pend['i:'+id])) return; var v=typeof o.v==='string'?o.v:clean(o.v); if(v===null||v===undefined) return; chg.set[id]=v; delete chg.at[id]; base.i[id]=typeof v==='string'?v:sj(v); any=true; }
    else if(o.k==='t'){ if(!okId(id)||typeof o.r!=='string'||typeof o.i!=='string'||o.i.length>3e6||o.r.length>MAXR) return;
      var txt=id in chg.set?chg.set[id]:now().items[id], bt=base.i[id];
      if(typeof txt!=='string'||typeof bt!=='string'){ if(role==='guest') out.need.push('i:'+id); else out.fix.push({k:'s',id:id,v:now().items[id]}); return; }
      var r=applyPatch(txt,o), rb=applyPatch(bt,o);
      if(!r||!rb){ if(role==='guest') out.need.push('i:'+id); else out.fix.push({k:'s',id:id,v:txt}); return; }
      chg.set[id]=r.text; chg.at[id]={at:r.at,del:o.r.length,ins:o.i.length}; base.i[id]=rb.text; any=true; }
    else if(o.k==='d'){ if(!okId(id)||(!force&&pend['i:'+id])) return; chg.del.push(id); delete chg.set[id]; delete base.i[id]; any=true; }
    else if(o.k==='o'){ if(!Array.isArray(o.ord)||(!force&&pend.o)) return; chg.order=o.ord.filter(okId).slice(0,30000); base.o=chg.order.join('\n'); any=true; }
    else if(o.k==='m'){ key=o.key; if(!okKey(key)||(!force&&pend['m:'+key])) return; var mv=clean(o.v); chg.meta[key]=mv; base.m[key]=sj(mv); any=true; } });
  if(any){ applying=true; try{ A.write(chg); }catch(e){ if(root.console) console.error(e); } finally{ applying=false; } remoteSince=true; }
  return out; }

/* ---------- messages ---------- */
function stateHashes(st){ var h={}; Object.keys(st.meta||{}).forEach(function(k){ h['m:'+k]=hash(sj(st.meta[k])); });
  Object.keys(st.items||{}).forEach(function(id){ var v=st.items[id]; h['i:'+id]=hash(typeof v==='string'?v:sj(v)); }); if(st.order) h.o=hash(st.order.join('\n')); return h; }
function opsFor(st,keys){ var ops=[]; keys.forEach(function(k){ if(k==='o'){ if(st.order) ops.push({k:'o',ord:st.order}); }
  else if(k.slice(0,2)==='m:'){ var m=k.slice(2); if(m in (st.meta||{})) ops.push({k:'m',key:m,v:st.meta[m]}); }
  else if(k.slice(0,2)==='i:'){ var id=k.slice(2); if(id in (st.items||{})) ops.push({k:'s',id:id,v:st.items[id]}); else ops.push({k:'d',id:id}); } }); return ops; }
/* while the person is in the middle of typing a composed letter (한글 etc.) other people's changes wait a moment, or the letter would break */
var inq=[], inT=null, bypass=false;
function gate(fn){ if(bypass) return false; var b=false; try{ b=!!(A.busy&&A.busy()); }catch(e){} if(!inq.length&&!b) return false; inq.push(fn); clearTimeout(inT); inT=setTimeout(drain,150); return true; }
function drain(){ inT=null; while(inq.length){ var b=false; try{ b=!!(A.busy&&A.busy()); }catch(e){} if(b){ inT=setTimeout(drain,150); return; } var f=inq.shift(); bypass=true; try{ f(); }catch(e){ if(root.console) console.error(e); } finally{ bypass=false; } } }
function onHost(from,d){
  if(!d||typeof d!=='object'||!ready) return; if(gate(function(){ if(room) onHost(from,d); })) return;
  if(d.t==='ops'&&Array.isArray(d.ops)){ var ops=d.ops.slice(0,5000); clearTimeout(touchT); flush(); var r=apply(ops,false);
    room.relay(from,{t:'ops',ops:ops,by:from}); room.send(from,{t:'ack',bid:d.bid,fix:r.fix}); touch(); }
  else if(d.t==='need'&&Array.isArray(d.keys)){ var st=A.read(); if(st) room.send(from,{t:'ops',ops:opsFor(st,d.keys.filter(function(k){ return typeof k==='string'; }).slice(0,500)),by:'host',force:true}); }
}
function onGuest(d){
  if(!d||typeof d!=='object') return;
  if(d.t==='snap') return takeSnap(d);
  if(!ready) return; if(gate(function(){ if(guest) onGuest(d); })) return;
  if(d.t==='ops'){ var r=apply(d.ops,!!d.force); if(r.need.length) guest.send({t:'need',keys:r.need}); }
  else if(d.t==='ack'){ (sent[d.bid]||[]).forEach(function(k){ if(pend[k]&&--pend[k]<=0) delete pend[k]; }); delete sent[d.bid]; if(Array.isArray(d.fix)&&d.fix.length) apply(d.fix,true); }
  else if(d.t==='forced'&&Array.isArray(d.ops)) apply(d.ops,true);
  else if(d.t==='h'&&d.h&&typeof d.h==='object') checkSum(d.h);
}
function busy(){ var b={}; Object.keys(pend).forEach(function(k){ b[k]=1; }); Object.keys(sent).forEach(function(i){ sent[i].forEach(function(k){ b[k]=1; }); }); return b; }
function checkSum(h){ var st; try{ st=A.read(); }catch(e){ return; } if(!st) return; var mine=stateHashes(st), b=busy(), ask=[], mark={};
  var d=pure(st).ops; d.forEach(function(o){ keysOf(o).forEach(function(k){ b[k]=1; }); });   // changes not sent yet are not a difference
  Object.keys(h).forEach(function(k){ if(b[k]) return; if(mine[k]!==h[k]){ mark[k]=1; sus[k]=(sus[k]||0)+1; if(sus[k]>=2) ask.push(k); } });
  Object.keys(mine).forEach(function(k){ if(b[k]||k in h) return; mark[k]=1; sus[k]=(sus[k]||0)+1; if(sus[k]>=2) ask.push(k); });
  Object.keys(sus).forEach(function(k){ if(!mark[k]) delete sus[k]; });
  if(ask.length){ ask.forEach(function(k){ delete sus[k]; }); guest.send({t:'need',keys:ask.slice(0,500)}); } }
function takeSnap(d){
  clearTimeout(joinT); if(ready||!d.state||typeof d.state!=='object') return;
  var st={meta:clean(d.state.meta)||{},items:clean(d.state.items)||{},order:Array.isArray(d.state.order)?d.state.order.filter(okId):null};
  var nm=F('{0} ({1})',String(d.name||T('이름 없음')).slice(0,60),T('같이 고치기'));
  var ok=false; applying=true; try{ ok=A.copy(st,nm); }catch(e){ if(root.console) console.error(e); } finally{ applying=false; }
  if(!ok){ setSt(T('같이 고치기 문서를 받지 못했어요')); leave(true); return; }
  base=mkBase(A.read()); ready=true; show(); setSt(''); toast(T('같이 고치기에 들어왔어요')); if(A.joined) A.joined(false); }

/* ---------- start, join, leave ---------- */
function myName(){ var n=$('ffcoName').value.trim().slice(0,20)||T('손님'); lsSet(LSN,n); return n; }
function fail(kind){ setSt(T(ERR[kind]||ERR.net)); reset(); }
function reset(){ inq=[]; clearTimeout(inT); clearTimeout(joinT); clearTimeout(touchT); clearInterval(hbT); try{ if(room) room.close(); }catch(e){} try{ if(guest) guest.close(); }catch(e){}
  room=guest=null; role=''; myId=''; code=''; peers=[]; base=null; ready=false; pend={}; sent={}; sus={}; remoteSince=false; show(); if(A&&A.left) A.left(); }
function leave(keepMsg){ var was=role; reset(); if(!keepMsg&&was){ setSt(''); toast(T('같이 고치기를 마쳤어요')); } }
function make(){
  if(role) return; role='host'; myId='host'; setSt(T('방을 만드는 중…')); var st0=A.read(); if(!st0){ role=''; return setSt(T('같이 고치기 문서를 받지 못했어요')); } base=mkBase(st0); ready=false; var nm=myName();
  room=FFRoom.host({app:A.app,name:nm,
    open:function(c){ code=c; ready=true; peers=room.peers(); show(); setSt(''); hbT=setInterval(heartbeat,6000); if(A.joined) A.joined(true); },
    error:fail,
    join:function(p){ clearTimeout(touchT); flush(); room.send(p.id,{t:'snap',name:A.name(),state:A.read()}); toast(F('{0} 님이 들어왔어요',p.name)); },
    leave:function(p){ toast(F('{0} 님이 나갔어요',p.name)); },
    msg:onHost,
    peers:function(l){ peers=l; renderPeers(); } });
}
function heartbeat(){ if(role!=='host'||!ready||applying||peers.length<2) return; var st; try{ st=A.read(); }catch(e){ return; } if(st) room.all({t:'h',h:stateHashes(st)}); }
function join(txt){
  if(role) return; var m=/[#&]r=([A-Za-z0-9]{6})/.exec(txt)||[0,txt], c=FFRoom.cleanCode(m[1]);
  if(c.length<6) return setSt(T('초대 코드는 영문과 숫자 6자리예요'));
  role='guest'; ready=false; setSt(T('방에 들어가는 중…')); var nm=myName();
  guest=FFRoom.join(c,{app:A.app,name:nm,
    open:function(info){ myId=info.id; code=c; setSt(T('문서를 받는 중…')); },
    msg:onGuest,
    peers:function(l){ peers=l; renderPeers(); },
    end:function(why){ var r=why==='closed'?T('방을 만든 사람이 같이 고치기를 끝냈어요. 받은 문서는 내 문서로 남아 있어요'):T('연결이 끊겼어요. 받은 문서는 내 문서로 남아 있어요'); reset(); toast(r); },
    error:fail });
  joinT=setTimeout(function(){ if(role==='guest'&&!ready){ setSt(T('문서를 받지 못했어요. 다시 해 보세요')); reset(); } },25000);
}

/* ---------- dialog ---------- */
var CSS='.ffco-ov{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.55);display:none;align-items:center;justify-content:center;padding:16px;font:14px/1.5 "Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif}'
 +'.ffco-ov.open{display:flex}.ffco-dlg{background:var(--panel,#1c1c1c);color:var(--text,#eee);border:1px solid var(--line,#333);border-radius:16px;width:min(520px,100%);max-height:86vh;overflow:auto;box-shadow:0 30px 80px rgba(0,0,0,.6)}'
 +'.ffco-dh{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--line,#333)}.ffco-dh h3{margin:0;font-size:17px}.ffco-x{background:none;border:0;color:inherit;font-size:24px;line-height:1;cursor:pointer;padding:0 4px}'
 +'.ffco-db{padding:14px 18px}.ffco-db label{display:block;font-size:13px;color:var(--dim,#999);margin:12px 0 4px}.ffco-db input{width:100%;box-sizing:border-box;padding:8px 10px;border-radius:8px;border:1px solid var(--line,#333);background:var(--bg,#111);color:inherit;font:inherit}'
 +'.ffco-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0}.ffco-row span{color:var(--dim,#999);font-size:13px}.ffco-row input{flex:1;min-width:120px;width:auto}'
 +'.ffco-b{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 12px;border-radius:8px;border:1px solid var(--line,#333);background:var(--panel2,#262626);color:inherit;font:inherit;cursor:pointer;white-space:nowrap}.ffco-b:disabled{opacity:.5;cursor:default}'
 +'.ffco-b.pri,.ffco-pri{background:var(--fry,#d9b45f);color:#1c1405;border-color:transparent;font-weight:600}'
 +'.ffco-code{font:700 30px "JetBrains Mono",monospace;letter-spacing:6px;color:var(--fry,#d9b45f);text-align:center;padding:10px 0}.ffco-note{color:var(--dim,#999);font-size:13px;margin:10px 0 0}'
 +'.ffco-p{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--line,#333)}.ffco-p i{width:12px;height:12px;border-radius:50%;flex:none}.ffco-p em{color:var(--dim,#999);font-size:12px;font-style:normal;margin-left:auto}'
 +'.ffco-acts{display:flex;justify-content:flex-end;gap:8px;padding:12px 18px;border-top:1px solid var(--line,#333)}.ffco-st{color:var(--fry,#d9b45f);font-size:13px;margin:10px 0 0}'
 +'.ffco-btn{position:relative}.ffco-btn.on{border-color:var(--fry,#d9b45f)!important;color:var(--fry,#d9b45f)!important}.ffco-n{font-size:11px;background:var(--fry,#d9b45f);color:#1c1405;border-radius:9px;padding:0 6px;line-height:16px;margin-left:4px}'
 +'.ffco-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:2147483100;background:#222;color:#fff;border:1px solid #444;border-radius:99px;padding:8px 16px;font:14px "Noto Sans KR",system-ui,sans-serif;max-width:92vw}';
function setSt(t){ var p=$('ffcoSt'); if(!p) return; p.hidden=!t; p.textContent=t||''; }
var tt=null; function toast(m){ if(A&&A.toast){ try{ A.toast(m); return; }catch(e){} } var e=document.createElement('div'); e.className='ffco-toast'; e.textContent=m; document.body.appendChild(e); clearTimeout(tt); setTimeout(function(){ e.remove(); },2600); }
function renderPeers(){ var l=$('ffcoPeers'); if(!l) return; l.innerHTML='';
  peers.forEach(function(p){ var r=document.createElement('div'), dot=document.createElement('i'), nm=document.createElement('span'), tag=document.createElement('em');
    r.className='ffco-p'; dot.style.background=p.color; nm.textContent=p.name; nm.setAttribute('data-notr',''); tag.textContent=(p.id==='host'?T('방장'):'')+(p.id===myId?(p.id==='host'?' · ':'')+T('나'):'');
    r.appendChild(dot); r.appendChild(nm); r.appendChild(tag); l.appendChild(r); });
  var n=$('ffcoN'); if(n){ n.hidden=!role; n.textContent=peers.length||''; } var b=$('ffcoBtn'); if(b) b.classList.toggle('on',!!role); }
function show(){ if(!$('ffcoDlg')) return; var on=!!role&&!!code&&ready; $('ffcoOff').hidden=on; $('ffcoOn').hidden=!on; $('ffcoEnd').hidden=!role;
  $('ffcoEnd').textContent=role==='host'?T('같이 고치기 끝내기'):T('나가기'); $('ffcoBig').textContent=code; $('ffcoMake').disabled=$('ffcoJoin').disabled=!!role; renderPeers(); }
function openDlg(){ if(A.before) A.before(); show(); $('ffcoDlg').classList.add('open'); }
function build(){
  var st=document.createElement('style'); st.id='ffcoCss'; st.textContent=CSS; document.head.appendChild(st);
  var noun=T(A.noun||'문서');
  var ov=document.createElement('div'); ov.className='ffco-ov'; ov.id='ffcoDlg';
  ov.innerHTML='<div class="ffco-dlg"><div class="ffco-dh"><h3>'+T('같이 고치기')+'</h3><button class="ffco-x" type="button" data-c aria-label="'+T('닫기')+'">×</button></div><div class="ffco-db">'
   +'<div id="ffcoOff"><label for="ffcoName">'+T('내 이름')+'</label><input type="text" id="ffcoName" maxlength="20" data-notr><div class="ffco-note" id="ffcoAcc"></div>'
   +'<div class="ffco-row"><button class="ffco-b ffco-pri" type="button" id="ffcoMake">'+T('방 만들기')+'</button><span id="ffcoWhat"></span></div>'
   +'<label for="ffcoCode">'+T('초대 코드나 링크로 들어가기')+'</label><div class="ffco-row"><input type="text" id="ffcoCode" maxlength="80" placeholder="'+T('예: K7M2QX')+'" data-notr><button class="ffco-b" type="button" id="ffcoJoin">'+T('들어가기')+'</button></div>'
   +'<p class="ffco-note" id="ffcoHelp"></p></div>'
   +'<div id="ffcoOn" hidden><div class="ffco-code" id="ffcoBig" data-notr></div><div class="ffco-row"><button class="ffco-b" type="button" id="ffcoLink">'+T('링크 복사')+'</button><button class="ffco-b" type="button" id="ffcoCopy">'+T('코드 복사')+'</button></div>'
   +'<label>'+T('같이 고치는 사람')+'</label><div id="ffcoPeers"></div></div><p class="ffco-st" id="ffcoSt" hidden></p></div>'
   +'<div class="ffco-acts"><button class="ffco-b" type="button" data-c>'+T('닫기')+'</button><button class="ffco-b" type="button" id="ffcoEnd" hidden>'+T('나가기')+'</button></div></div>';
  document.body.appendChild(ov);
  $('ffcoWhat').textContent=F('내 {0}을(를) 보여 주고 같이 고쳐요',noun);
  $('ffcoHelp').textContent=F('한 방에 8명까지 들어올 수 있어요. 방을 만든 사람의 {0}이(가) 기준이고, 들어온 사람은 그것의 사본을 내 문서로 받아요. 방을 만든 사람이 창을 닫으면 끝나요.',noun)+(A.note?' '+T(A.note):'');
  ov.addEventListener('mousedown',function(e){ if(e.target===ov) ov.classList.remove('open'); });
  Array.prototype.forEach.call(ov.querySelectorAll('[data-c]'),function(b){ b.onclick=function(){ ov.classList.remove('open'); }; });
  $('ffcoMake').onclick=make; $('ffcoJoin').onclick=function(){ join($('ffcoCode').value); };
  $('ffcoCode').addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); $('ffcoJoin').click(); } });
  $('ffcoEnd').onclick=function(){ leave(); };
  $('ffcoCopy').onclick=function(){ try{ navigator.clipboard.writeText(code).catch(function(){}); }catch(e){} toast(T('복사했어요')); };
  $('ffcoLink').onclick=function(){ try{ navigator.clipboard.writeText(FFRoom.link(code)).catch(function(){}); }catch(e){} toast(T('복사했어요')); };
  $('ffcoName').value=lsGet(LSN)||'';
  FFRoom.account().then(function(a){ if(a){ $('ffcoAcc').textContent=F('Frenchfries777 계정 이름: {0}',a); if(!$('ffcoName').value) $('ffcoName').value=a; } });
  var btn=document.createElement('button'); btn.type='button'; btn.id='ffcoBtn'; btn.className=(A.btnClass||'tbtn')+' ffco-btn'; btn.title=F('여럿이 한 {0}을(를) 같이 고쳐요',noun);
  btn.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M17 14.2c2.4 0 4 1.8 4 4.3"/></svg><span class="lb">'+T('같이 고치기')+'</span><b class="ffco-n" id="ffcoN" hidden data-notr></b>';
  btn.onclick=openDlg; if(A.mount) A.mount(btn); else document.body.appendChild(btn);
  var c0=FFRoom.codeFromUrl(); if(c0){ $('ffcoCode').value=c0; setSt(T('초대 링크로 오셨어요. 이름을 확인하고 들어가기를 눌러 주세요')); setTimeout(openDlg,300); }
}
root.FFCo={ init:function(adapter){ if(A||!root.FFRoom) return false; A=adapter; if(document.body) build(); else document.addEventListener('DOMContentLoaded',build); return true; },
  touch:touch, active:function(){ return !!role; }, applying:function(){ return applying; },
  warnUndo:function(){ var w=!!role&&remoteSince; remoteSince=false; return w; },
  state:function(){ return {role:role,code:code,ready:ready,id:myId,peers:peers,pend:Object.keys(pend).length}; },
  patch:{make:mkPatch,apply:applyPatch,locate:locate}, hash:hash, sj:sj };
})(window);
