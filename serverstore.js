/* Frenchfries777 Tools 서버 전용 저장 (FFSrv): the documents of Fry Docs, Sheet, Slides, Block HTML and Python are kept ONLY on the Oracle
   server (server/fry-store), not in this browser. Load this file first on each program page. It makes localStorage send the document keys
   (ffdocs.* ffsheet.* ffslides.v1 ffblocks.* ffpy.* ffver.v1.*) to the server and read them from there; every other key stays in the browser.
   Reads are synchronous (the list of keys is fetched once when the page starts; a document is fetched the first time it is read), writes are sent
   a moment later. Old copies still in this browser are moved to the server once, then removed. When the server cannot be reached nothing is
   written (so the real documents on the server can never be overwritten by an empty list) and a red bar says so. */
(function(root){
'use strict';
if(!root.document||!root.Storage||root.FFSrv) return;
var BASE=root.FFSRV_URL||'https://140-238-55-153.sslip.io', MAXK=4e6, MAXO=16e6, DELAY=400;
var ROUTE=/^(ffdocs\.v1|ffdocs\.doc\.[A-Za-z0-9_-]+|ffsheet\.docs|ffsheet\.doc\.[A-Za-z0-9_-]+|ffslides\.v1|ffblocks\.projects|ffblocks\.(p|store|ai)\.[A-Za-z0-9_-]+|ffpy\.v1|ffpy\.file\.[A-Za-z0-9_-]+|ffver\.v1\.[A-Za-z0-9._-]+)$/;
var P=Storage.prototype, oGet=P.getItem, oSet=P.setItem, oDel=P.removeItem, oKey=P.key, oLen=Object.getOwnPropertyDescriptor(P,'length').get;
var real=root.localStorage;
function isLS(s){ return s===real; }
function owner(){ var o=''; try{ o=oGet.call(real,'ffstore.owner')||''; }catch(e){} if(!/^[0-9a-f]{32}$/.test(o)){ o=''; for(var i=0;i<32;i++) o+=Math.floor(Math.random()*16).toString(16); try{ oSet.call(real,'ffstore.owner',o); }catch(e){} } return o; }
var OWN=owner(), cache={}, sizes={}, queue={}, timer=0, up=false, dirty=true, snap=[], failed=0, bar=null, busy=false;
function url(k){ return BASE+'/k/'+OWN+(k?'/'+encodeURIComponent(k):''); }
function xhr(m,u,body,type){ var x=new XMLHttpRequest(); x.open(m,u,false); if(body!=null) x.setRequestHeader('content-type',type||'text/plain; charset=utf-8'); try{ x.send(body==null?null:body); }catch(e){ return {s:0,t:''}; } return {s:x.status,t:x.responseText}; }
function total(){ var n=0; for(var k in sizes) n+=sizes[k]; return n; }
function say(msg){
  try{ if(!msg){ if(bar){ bar.remove(); bar=null; } return; }
    if(!bar){ bar=document.createElement('div'); bar.style.cssText='position:fixed;left:0;right:0;top:0;z-index:2147483600;padding:8px 14px;text-align:center;font:600 14px/1.4 sans-serif;background:#c0392b;color:#fff'; (document.body||document.documentElement).appendChild(bar); }
    bar.textContent=msg; }catch(e){} }
var T=function(s){ return root.FFT&&root.FFT.T?root.FFT.T(s):s; };
/* 1) the list of keys on the server (blocking, once) */
var r=xhr('GET',url());
if(r.s===404){ root.FFSrv={up:false,legacy:true}; return; }   // the server is not updated yet: keep saving in this browser as before
if(r.s===200){ try{ JSON.parse(r.t).forEach(function(e){ sizes[e.k]=e.n; }); up=true; }catch(e){} }
/* 2) old copies in this browser: move to the server, then remove them here */
if(up){ try{ var ks=[]; for(var i=0;i<oLen.call(real);i++){ var k=oKey.call(real,i); if(k&&ROUTE.test(k)) ks.push(k); }
  ks.forEach(function(k){ var v=oGet.call(real,k); if(v==null) return;
    if(sizes[k]!=null){ oDel.call(real,k); return; }   // the server already has it: the server's copy wins
    if(v.length>MAXK||total()+v.length>MAXO) return;     // too big for the server: stays here, still readable
    var q=xhr('PUT',url(k),v); if(q.s===200){ sizes[k]=v.length; cache[k]=v; oDel.call(real,k); } }); }catch(e){} }
else say(T('서버에 연결할 수 없어요. 저장하려면 연결부터 확인해 주세요'));
function routed(k){ return up&&ROUTE.test(String(k)); }
function get(k){
  if(k in cache) return cache[k];
  if(sizes[k]==null){ try{ var l=oGet.call(real,k); return l; }catch(e){ return null; } }   // not on the server (yet): only a not-yet-moved local copy can exist
  var q=xhr('GET',url(k)); if(q.s===200){ cache[k]=q.t; return q.t; } if(q.s===404){ delete sizes[k]; dirty=true; return null; } return null;
}
function flush(sync){
  if(busy&&!sync) return; var ks=Object.keys(queue); if(!ks.length){ if(!failed) say(''); return; }
  if(sync){ ks.forEach(function(k){ var v=queue[k]; var q=v==null?xhr('DELETE',url(k)):xhr('PUT',url(k),v); if(q.s===200) delete queue[k]; }); return; }
  busy=true; var k=ks[0], v=queue[k], snapv=v;
  fetch(url(k),v==null?{method:'DELETE'}:{method:'PUT',headers:{'content-type':'text/plain; charset=utf-8'},body:v}).then(function(rs){
    busy=false;
    if(rs.ok||rs.status===404){ if(queue[k]===snapv) delete queue[k]; failed=0; say(''); }
    else if(rs.status===413||rs.status===507){ if(queue[k]===snapv) delete queue[k]; failed++; say(T(rs.status===507?'서버 저장 공간이 가득 차서 저장하지 못했어요':'문서가 너무 커서 저장하지 못했어요')); }
    else { failed++; say(T('서버에 저장하지 못했어요. 다시 시도하고 있어요')); }
    if(Object.keys(queue).length) schedule(rs.ok||rs.status<500?30:4000);
  },function(){ busy=false; failed++; say(T('서버에 연결할 수 없어요. 다시 시도하고 있어요')); schedule(4000); });
}
function schedule(ms){ if(timer) clearTimeout(timer); timer=setTimeout(function(){ timer=0; flush(); },ms==null?DELAY:ms); }
P.getItem=function(k){ if(isLS(this)&&routed(k)) return get(String(k)); return oGet.apply(this,arguments); };
P.setItem=function(k,v){
  if(isLS(this)&&ROUTE.test(String(k))){
    if(!up) throw new DOMException('server not reachable','QuotaExceededError');
    k=String(k); v=String(v); var old=sizes[k]||0;
    if(v.length>MAXK||total()-old+v.length>MAXO) throw new DOMException('server storage full','QuotaExceededError');
    cache[k]=v; sizes[k]=v.length; queue[k]=v; dirty=true; try{ oDel.call(real,k); }catch(e){} schedule(); return; }
  return oSet.apply(this,arguments); };
P.removeItem=function(k){
  if(isLS(this)&&routed(k)){ k=String(k); delete cache[k]; delete sizes[k]; queue[k]=null; dirty=true; try{ oDel.call(real,k); }catch(e){} schedule(); return; }
  return oDel.apply(this,arguments); };
function all(){ if(!dirty) return snap; var a=[]; for(var i=0;i<oLen.call(real);i++){ var k=oKey.call(real,i); if(!(up&&ROUTE.test(k))) a.push(k); } for(var s in sizes) a.push(s); snap=a; dirty=false; return a; }
P.key=function(i){ if(isLS(this)){ var a=all(); return i>=0&&i<a.length?a[i]:null; } return oKey.apply(this,arguments); };
Object.defineProperty(P,'length',{configurable:true,get:function(){ return isLS(this)?all().length:oLen.call(this); }});
/* keys other code writes straight to the real storage keep the list fresh */
var oClear=P.clear; P.clear=function(){ if(isLS(this)){ Object.keys(sizes).forEach(function(k){ delete cache[k]; delete sizes[k]; queue[k]=null; }); dirty=true; schedule(); } return oClear.apply(this,arguments); };
root.addEventListener('beforeunload',function(){ if(Object.keys(queue).length) flush(true); });
root.addEventListener('pagehide',function(){ if(Object.keys(queue).length) flush(true); });
document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='hidden'&&Object.keys(queue).length){ if(timer){ clearTimeout(timer); timer=0; } flush(); } });
root.FFSrv={up:up,size:function(k){ return sizes[k]||0; },keys:function(){ return Object.keys(sizes); },total:total,max:MAXO,pending:function(){ return Object.keys(queue).length; },flush:function(){ return flush(true); },route:ROUTE};
})(window);
