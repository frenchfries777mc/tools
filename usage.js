/* Frenchfries777 Tools 현재 사용량 (FFUsage): a window that shows how full this browser and the Oracle server store are,
   and lists the big files nobody opened for a week (click one: that program opens it in a new window).
   Every program adds a "현재 사용량 보기" button to its file menu that calls FFUsage.open().
   Works in the browser (FFUsage) and in Node (module.exports, storage passed in) for the tests. */
(function(root){
'use strict';
var BROWSER_MAX=5000000, SERVER_MAX=16000000, WEEK=7*864e5, TOP=10;
var PROGS=[
 {id:'docs',  name:'Fry Docs',  ico:'📝', path:'../docs/',   idx:'ffdocs.v1',       list:function(o){ return o&&o.docs; },   keys:function(i){ return ['ffdocs.doc.'+i,'ffver.v1.docs.'+i]; }},
 {id:'sheet', name:'Fry Sheet', ico:'📊', path:'../sheet/',  idx:'ffsheet.docs',    list:function(o){ return o; },           keys:function(i){ return ['ffsheet.doc.'+i,'ffver.v1.sheet.'+i]; }},
 {id:'slides',name:'Fry Slides',ico:'🎞️', path:'../slides/', idx:'ffslides.v1',     list:function(o){ return o&&o.decks; },  keys:function(i){ return ['ffver.v1.slides.'+i]; }, inline:true},
 {id:'blocks',name:'Block HTML',ico:'🧱', path:'../blocks/', idx:'ffblocks.projects',list:function(o){ return o&&o.list; },   keys:function(i){ return ['ffblocks.p.'+i,'ffblocks.store.'+i,'ffblocks.ai.'+i,'ffver.v1.blocks.'+i]; }},
 {id:'python',name:'Fry Python',ico:'🐍', path:'../python/', idx:'ffpy.v1',         list:function(o){ return o&&o.files; }, keys:function(i){ return ['ffpy.file.'+i,'ffver.v1.python.'+i]; }}
];
var MINE=/^(ffdocs|ffsheet|ffslides|ffblocks|ffpy|ffver|fflab|ffai|ffchat|ffstore)/;
function ls(){ try{ return root.localStorage; }catch(e){ return null; } }
function J(st,k){ try{ return JSON.parse(st.getItem(k)||'null'); }catch(e){ return null; } }
function L(st,k){ try{ var v=st.getItem(k); return v==null?0:v.length; }catch(e){ return 0; } }
/* st: a Storage. now: ms. Returns {browser:{used,mine,max}, server:{used,max}, files:[{prog,pname,ico,path,id,name,t,size}]} (files = every file; callers filter) */
function collect(st,now){
  st=st||ls(); now=now||Date.now(); var out={browser:{used:0,mine:0,max:BROWSER_MAX},server:{used:0,max:SERVER_MAX},files:[]}; if(!st) return out;
  try{ for(var i=0;i<st.length;i++){ var k=st.key(i), n=k.length+L(st,k); out.browser.used+=n; if(MINE.test(k)) out.browser.mine+=n;
    if(k.indexOf('ffver.v1.')===0){ var a=J(st,k); if(Array.isArray(a)) a.forEach(function(x){ if(x&&x.remote&&x.len) out.server.used+=x.len; }); } } }catch(e){}
  PROGS.forEach(function(p){ var l=p.list(J(st,p.idx)); if(!Array.isArray(l)) return;
    l.forEach(function(f){ if(!f||!f.id) return; var size=0; if(p.inline){ try{ size+=JSON.stringify(f).length; }catch(e){} }
      p.keys(f.id).forEach(function(k){ size+=L(st,k); });
      out.files.push({prog:p.id,pname:p.name,ico:p.ico,path:p.path,id:f.id,name:f.name||'',t:+f.t||0,size:size}); }); });
  return out;
}
/* the big files not opened for a week, biggest first */
function idle(files,now){ now=now||Date.now(); return files.filter(function(f){ return f.t&&now-f.t>=WEEK; }).sort(function(a,b){ return b.size-a.size; }).slice(0,TOP); }
function fmt(n){ return n>=1e6?(n/1e6).toFixed(1)+'MB':Math.max(1,Math.round(n/1e3))+'KB'; }
var api={collect:collect,idle:idle,fmt:fmt,BROWSER_MAX:BROWSER_MAX,SERVER_MAX:SERVER_MAX,PROGS:PROGS};
if(typeof module!=='undefined'&&module.exports){ module.exports=api; return; }

/* ---------- window (browser only) ---------- */
var T=function(s){ return root.FFT&&FFT.T?FFT.T(s):s; };
function css(){ if(document.getElementById('ffuCss')) return; var s=document.createElement('style'); s.id='ffuCss';
  s.textContent='.ffu{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px}'+
  '.ffu>div{background:Canvas;color:CanvasText;border:1px solid rgba(128,128,128,.4);border-radius:14px;width:min(460px,100%);max-height:86vh;display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,.4);font:14px/1.4 system-ui,sans-serif}'+
  '.ffu h3{margin:0;padding:14px 16px 6px;font-size:16px}.ffu .ffug{padding:6px 16px}.ffu .ffug b{display:flex;justify-content:space-between;font-weight:600}'+
  '.ffu .ffub{height:12px;border-radius:7px;background:rgba(128,128,128,.25);overflow:hidden;margin:5px 0 3px}.ffu .ffub i{display:block;height:100%;border-radius:7px;background:#2ea043}'+
  '.ffu .ffub i.w{background:#d4a017}.ffu .ffub i.r{background:#e5484d}.ffu small{opacity:.65}'+
  '.ffu h4{margin:10px 16px 4px;font-size:13px}.ffu ul{list-style:none;margin:0;padding:0 16px;overflow:auto;flex:1}'+
  '.ffu li{display:flex;align-items:center;gap:8px;padding:8px 0;border-top:1px solid rgba(128,128,128,.25);cursor:pointer}.ffu li:hover{background:rgba(128,128,128,.1)}'+
  '.ffu li .ffut{flex:1;min-width:0}.ffu li b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ffu .ffue{padding:12px 0;opacity:.65;text-align:center;cursor:default}'+
  '.ffu .ffux{padding:10px 16px;text-align:right}.ffu button{padding:6px 12px;border-radius:8px;border:1px solid rgba(128,128,128,.5);background:ButtonFace;color:ButtonText;font:inherit;cursor:pointer}';
  document.head.appendChild(s); }
function el(t,c,x){ var e=document.createElement(t); if(c) e.className=c; if(x!=null) e.textContent=x; return e; }
function gauge(label,used,max,note){ var g=el('div','ffug'), p=Math.min(100,Math.round(used/max*100)), b=el('b'); b.appendChild(el('span','',label)); b.appendChild(el('span','',fmt(used)+' / '+fmt(max)+' ('+p+'%)')); g.appendChild(b);
  var bar=el('div','ffub'), i=el('i',p>=90?'r':p>=70?'w':''); i.style.width=Math.max(p,used?2:0)+'%'; bar.appendChild(i); g.appendChild(bar); if(note) g.appendChild(el('small','',note)); return g; }
function open(){
  css(); var d=collect(), ov=el('div','ffu'), box=el('div'); ov.appendChild(box);
  function close(){ document.removeEventListener('keydown',kd,true); ov.remove(); } function kd(e){ if(e.key==='Escape'){ e.stopPropagation(); close(); } }
  document.addEventListener('keydown',kd,true); ov.addEventListener('mousedown',function(e){ if(e.target===ov) close(); });
  box.appendChild(el('h3','',T('현재 사용량')));
  box.appendChild(gauge(T('이 브라우저'),d.browser.used,d.browser.max,T('Tools 사용분')+' '+fmt(d.browser.mine)+' · '+T('같은 사이트의 다른 게임·도구가 나머지를 써요')));
  box.appendChild(gauge(T('서버 보관'),d.server.used,d.server.max,T('저장 공간이 부족할 때 오래된 기록이 옮겨져요')));
  box.appendChild(el('h4','',T('1주일 넘게 안 연 큰 파일')));
  var ul=el('ul'), l=idle(d.files); if(!l.length) ul.appendChild(el('li','ffue',T('1주일 넘게 안 연 파일이 없어요')));
  l.forEach(function(f){ var li=el('li'), tx=el('div','ffut'); tx.appendChild(el('b','',f.ico+' '+(f.name||T('이름 없음')))); tx.appendChild(el('small','',f.pname+' · '+T(ago(f.t)))); li.appendChild(tx); li.appendChild(el('span','',fmt(f.size)));
    li.onclick=function(){ try{ window.open(f.path+'#open='+f.id,'_blank','noopener'); }catch(e){} }; ul.appendChild(li); });
  box.appendChild(ul); var x=el('div','ffux'), cb=el('button','',T('닫기')); cb.onclick=close; x.appendChild(cb); box.appendChild(x);
  document.body.appendChild(ov);
}
function ago(t){ var s=Math.max(0,(Date.now()-t)/1000); if(s<86400*30) return Math.floor(s/86400)+'일 전'; return Math.floor(s/86400/30)+'달 전'; }
api.open=open; root.FFUsage=api;
})(typeof window!=='undefined'?window:this);
