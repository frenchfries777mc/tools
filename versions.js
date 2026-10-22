/* Frenchfries777 Tools 버전 기록 (FFVer): named snapshots of a document kept in this browser (localStorage), shared by
   Fry Sheet, Fry Slides and Block HTML. A tool gives the document's snapshot string and a way to put one back; this file keeps
   the list, saves automatic versions now and then, and draws the dialog (no browser pop-ups: restore asks twice on the button).
   Works in the browser (FFVer) and in Node (module.exports, storage passed in) for the tests. */
(function(root){
'use strict';
var MAX=15, MAXAUTO=4, AUTO_MS=30*60*1000, MAXLEN=600000, PRE='ffver.v1.';
function ls(){ try{ return root.localStorage; }catch(e){ return null; } }
function read(key,st){ st=st||ls(); try{ var a=JSON.parse(st.getItem(PRE+key)||'[]'); return Array.isArray(a)?a.filter(function(x){ return x&&typeof x.d==='string'; }):[]; }catch(e){ return []; } }
function write(key,list,st){
  st=st||ls(); if(!st) return false;
  while(list.length){ try{ st.setItem(PRE+key,JSON.stringify(list)); return true; }catch(e){ list.pop(); } }   // full: drop the oldest until it fits
  try{ st.removeItem(PRE+key); }catch(e){} return false;
}
function trim(list){
  var auto=0; list=list.filter(function(x){ if(!x.auto) return true; return ++auto<=MAXAUTO; });
  return list.slice(0,MAX);
}
function newId(){ return Date.now().toString(36)+Math.floor(Math.random()*1296).toString(36); }
/* newest first. Returns the saved entry, or null when the data is too big or storage is full */
function save(key,name,data,auto,st,now){
  data=String(data); if(data.length>MAXLEN) return null;
  var list=read(key,st), e={id:newId(),t:now||Date.now(),name:String(name||'').slice(0,40),d:data}; if(auto) e.auto=1;
  list.unshift(e); list=trim(list);
  return write(key,list,st)&&read(key,st).some(function(x){ return x.id===e.id; })?e:null;
}
function remove(key,id,st){ write(key,read(key,st).filter(function(x){ return x.id!==id; }),st); }
/* call after every save of the document: an automatic version is kept when the content changed and the last version is old enough */
function tick(key,get,st,now){
  now=now||Date.now(); var list=read(key,st), last=list[0], d; if(last&&now-last.t<AUTO_MS) return false;
  try{ d=String(get()); }catch(e){ return false; } if(last&&last.d===d) return false;
  return !!save(key,'',d,true,st,now);
}
function ago(t,now){ var s=Math.max(0,((now||Date.now())-t)/1000);
  if(s<60) return '방금'; if(s<3600) return Math.floor(s/60)+'분 전'; if(s<86400) return Math.floor(s/3600)+'시간 전'; if(s<86400*30) return Math.floor(s/86400)+'일 전'; return Math.floor(s/86400/30)+'달 전'; }
var api={save:save,list:read,remove:remove,tick:tick,ago:ago,MAX:MAX,MAXAUTO:MAXAUTO,AUTO_MS:AUTO_MS};
if(typeof module!=='undefined'&&module.exports){ module.exports=api; return; }

/* ---------- dialog (browser only) ---------- */
var T=function(s){ return root.FFT&&FFT.T?FFT.T(s):s; };
function css(){ if(document.getElementById('ffverCss')) return; var s=document.createElement('style'); s.id='ffverCss';
  s.textContent='.ffv{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px}'+
  '.ffv>div{background:Canvas;color:CanvasText;border:1px solid rgba(128,128,128,.4);border-radius:14px;width:min(440px,100%);max-height:86vh;display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,.4);font:14px/1.4 system-ui,sans-serif}'+
  '.ffv h3{margin:0;padding:14px 16px 6px;font-size:16px}.ffv .ffvs{padding:0 16px 8px;opacity:.7;font-size:12px}'+
  '.ffv .ffvn{display:flex;gap:6px;padding:4px 16px 10px}.ffv input{flex:1;min-width:0;padding:7px 9px;border-radius:8px;border:1px solid rgba(128,128,128,.5);background:Field;color:FieldText;font:inherit}'+
  '.ffv button{padding:6px 10px;border-radius:8px;border:1px solid rgba(128,128,128,.5);background:ButtonFace;color:ButtonText;font:inherit;cursor:pointer}.ffv button.ffvd{border-color:#e5484d;color:#e5484d}'+
  '.ffv ul{list-style:none;margin:0;padding:0 16px;overflow:auto;flex:1}.ffv li{display:flex;align-items:center;gap:8px;padding:8px 0;border-top:1px solid rgba(128,128,128,.25)}'+
  '.ffv li .ffvt{flex:1;min-width:0}.ffv li b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ffv li small{opacity:.65}.ffv .ffvx{padding:10px 16px;text-align:right}.ffv .ffve{padding:14px 0;opacity:.65;text-align:center}';
  document.head.appendChild(s); }
/* o: {key, title, get():string, put(data), describe(data):string, toast(msg)} */
function open(o){
  css(); var ov=document.createElement('div'); ov.className='ffv'; var box=document.createElement('div'); ov.appendChild(box);
  function close(){ document.removeEventListener('keydown',kd,true); ov.remove(); } function kd(e){ if(e.key==='Escape'){ e.stopPropagation(); close(); } }
  document.addEventListener('keydown',kd,true); ov.addEventListener('mousedown',function(e){ if(e.target===ov) close(); });
  function el(t,c,x){ var e=document.createElement(t); if(c) e.className=c; if(x!=null) e.textContent=x; return e; }
  function draw(){
    box.textContent=''; box.appendChild(el('h3','',T(o.title||'버전 기록')));
    box.appendChild(el('div','ffvs',T('이 브라우저에만 저장돼요. 30분이 지나 내용이 바뀌면 자동 버전도 남아요.')));
    var nr=el('div','ffvn'), ni=el('input'); ni.placeholder=T('버전 이름 (비워도 돼요)'); ni.maxLength=40; var nb=el('button','',T('지금 상태 저장'));
    nb.onclick=function(){ var e=save(o.key,ni.value.trim()||T('내가 저장한 버전'),o.get(),false); if(e){ if(o.toast) o.toast(T('버전을 저장했어요')); draw(); } else if(o.toast) o.toast(T('저장하지 못했어요. 문서가 너무 크거나 저장 공간이 부족해요')); };
    ni.onkeydown=function(e){ if(e.key==='Enter') nb.click(); }; nr.appendChild(ni); nr.appendChild(nb); box.appendChild(nr);
    var ul=el('ul'), list=read(o.key); if(!list.length) ul.appendChild(el('li','ffve',T('아직 저장된 버전이 없어요')));
    list.forEach(function(v){ var li=el('li'), tx=el('div','ffvt'); tx.appendChild(el('b','',v.name||(v.auto?T('자동 저장'):T('이름 없는 버전'))));
      var d=''; try{ d=o.describe?o.describe(v.d):''; }catch(e){} tx.appendChild(el('small','',T(ago(v.t))+(d?' · '+d:''))); li.appendChild(tx);
      var rb=el('button','',T('되돌리기')), armed=false; rb.onclick=function(){
        if(!armed){ armed=true; rb.textContent=T('정말요?'); setTimeout(function(){ armed=false; rb.textContent=T('되돌리기'); },3000); return; }
        save(o.key,T('되돌리기 전 상태'),o.get(),true); try{ o.put(v.d); }catch(e){ if(o.toast) o.toast(T('되돌리지 못했어요')); return; } if(o.toast) o.toast(T('이 버전으로 되돌렸어요')); close(); };
      var db=el('button','ffvd','✕'); db.title=T('지우기'); db.setAttribute('aria-label',T('지우기')); db.onclick=function(){ remove(o.key,v.id); draw(); };
      li.appendChild(rb); li.appendChild(db); ul.appendChild(li); });
    box.appendChild(ul); var x=el('div','ffvx'), cb=el('button','',T('닫기')); cb.onclick=close; x.appendChild(cb); box.appendChild(x); }
  draw(); document.body.appendChild(ov);
}
api.open=open; root.FFVer=api;
})(typeof window!=='undefined'?window:this);
