/* Fry Slides: decks of 16:9 slides drawn in HTML (1280 x 720, scaled), edited in place, presented full screen
   and exported as an editable .pptx (lib/pptxgen.bundle.js, PptxGenJS 4.0.1, loaded only when exporting).
   The same layout boxes and fitted font sizes are used for the screen, printing and the .pptx, so they match.
   Decks are saved in this browser (localStorage 'ffslides.v1'). The AI part is in ai-slides.js (uses ../ai.js). */
(function(){
'use strict';
var T=FFT.T, F=FFT.F, $=function(id){ return document.getElementById(id); };
var W=1280, H=720, LS='ffslides.v1';

/* ---------- themes ---------- */
var SANS="'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',system-ui,sans-serif", SERIF="'Noto Serif KR','Apple SD Gothic Neo',Georgia,'Batang',serif";
var THEMES=[
  {id:'light',  name:'밝은',     bg:'#ffffff', fg:'#1d2330', sub:'#5d6678', ac:'#3d7fe0', ac2:'#dfeafc', serif:0, pfh:'Arial', pfb:'Arial'},
  {id:'dark',   name:'어두운',   bg:'#10131b', fg:'#eef0f5', sub:'#9aa3b5', ac:'#ffc93c', ac2:'#ff8a3d', serif:0, pfh:'Arial', pfb:'Arial'},
  {id:'school', name:'칠판',     bg:'#2e4b3b', fg:'#f6f1e3', sub:'#cbd8c6', ac:'#ffd66b', ac2:'#b98b55', serif:0, pfh:'Trebuchet MS', pfb:'Trebuchet MS'},
  {id:'bold',   name:'선명한 색', bg:'#4b2fe0', fg:'#ffffff', sub:'#dcd6ff', ac:'#ffd23f', ac2:'#ff5fa2', serif:0, pfh:'Arial Black', pfb:'Arial'},
  {id:'minimal',name:'미니멀',   bg:'#f7f5f0', fg:'#161616', sub:'#6e6a62', ac:'#161616', ac2:'#d9d3c7', serif:1, pfh:'Georgia', pfb:'Arial'},
  {id:'nature', name:'자연',     bg:'#eef3e7', fg:'#1f3a2b', sub:'#556e5d', ac:'#3f8f5b', ac2:'#c6dca2', serif:0, pfh:'Trebuchet MS', pfb:'Trebuchet MS'}
];
function themeOf(id){ for(var i=0;i<THEMES.length;i++) if(THEMES[i].id===id) return THEMES[i]; return THEMES[0]; }

/* ---------- layouts: boxes in slide pixels; k = text role ---------- */
var HEAD={f:'title',x:90,y:48,w:1100,h:120,fs:50,min:22,k:'h',va:'flex-end'};
var LAY={
  title:[{f:'title',x:100,y:140,w:1080,h:262,fs:76,min:28,k:'h',al:'center',va:'flex-end'},{f:'subtitle',x:140,y:446,w:1000,h:140,fs:32,min:15,k:'s',al:'center'}],
  section:[{f:'title',x:130,y:236,w:1020,h:204,fs:66,min:26,k:'h',va:'flex-end'},{f:'subtitle',x:130,y:458,w:1020,h:130,fs:30,min:15,k:'s'}],
  bullets:[HEAD,{f:'bullets',x:90,y:214,w:1100,h:452,fs:32,min:13,k:'b',list:1}],
  two:[HEAD,{f:'leftTitle',x:90,y:212,w:525,h:58,fs:30,min:15,k:'a2',va:'flex-end'},{f:'left',x:90,y:284,w:525,h:382,fs:28,min:12,k:'b',list:1},
       {f:'rightTitle',x:665,y:212,w:525,h:58,fs:30,min:15,k:'a2',va:'flex-end'},{f:'right',x:665,y:284,w:525,h:382,fs:28,min:12,k:'b',list:1}],
  stat:[HEAD,{f:'stat',x:90,y:206,w:1100,h:256,fs:200,min:40,k:'a',al:'center',va:'center'},{f:'caption',x:150,y:474,w:980,h:186,fs:34,min:15,k:'b',al:'center'}],
  quote:[{f:'quote',x:150,y:178,w:980,h:334,fs:48,min:18,k:'q',al:'center',va:'center'},{f:'by',x:150,y:530,w:980,h:72,fs:28,min:14,k:'s',al:'center'}],
  closing:[{f:'title',x:100,y:140,w:1080,h:262,fs:84,min:30,k:'h',al:'center',va:'flex-end'},{f:'subtitle',x:140,y:446,w:1000,h:140,fs:30,min:15,k:'s',al:'center'}],
  image:[HEAD,{f:'img',x:90,y:204,w:1100,h:396,k:'i'},{f:'caption',x:90,y:608,w:1100,h:50,fs:26,min:14,k:'s',al:'center'}]
};
var LAYS=['title','section','bullets','two','stat','quote','closing','image'], AILAYS=LAYS.slice(0,7);
var LISTS=['bullets','left','right'], TEXTS=['title','subtitle','leftTitle','rightTitle','stat','caption','quote','by','notes','img'];
var PH={title:'제목', subtitle:'부제목', bullets:'내용 (한 줄에 하나씩)', leftTitle:'왼쪽 제목', left:'왼쪽 내용', rightTitle:'오른쪽 제목', right:'오른쪽 내용', stat:'숫자', caption:'숫자 설명', quote:'인용할 말', by:'말한 사람'};
function ph(f,lay){ return f==='title'&&lay==='title'?'발표 제목':f==='title'&&lay==='closing'?'마무리 인사':PH[f]; }
/* role -> style (also used for the .pptx) */
function role(th,k){
  return {h:{c:th.fg, w:th.serif?700:800, lh:1.15, head:1}, s:{c:th.sub, w:400, lh:1.35}, b:{c:th.fg, w:400, lh:1.38},
    a:{c:th.ac, w:800, lh:1.05, head:1}, a2:{c:th.ac, w:700, lh:1.2, head:1}, q:{c:th.fg, w:600, lh:1.35, head:1}}[k];
}
/* decorations: r = rect | ell | frame | glyph */
function deco(th,lay){
  var d=[], cov=lay==='title'||lay==='closing', R=function(x,y,w,h,c,o,r){ d.push({x:x,y:y,w:w,h:h,c:c,o:o==null?1:o,r:r||'rect'}); };
  var bar=function(){ if(cov) R(580,416,120,8,th.ac); else if(lay==='section') R(90,250,10,330,th.ac); else if(lay!=='quote') R(90,182,80,8,th.ac); };
  var glyph=function(c,o){ if(lay==='quote') d.push({x:540,y:30,w:200,h:200,c:c,o:o,r:'glyph',t:'“',fs:240}); };
  switch(th.id){
    case 'light': if(cov||lay==='quote') R(0,0,W,16,th.ac); bar(); glyph(th.ac,.9); break;
    case 'dark': if(cov) R(W-400,-280,680,680,th.ac,.10,'ell'); if(cov) R(-160,H-150,320,320,th.ac2,.14,'ell'); bar(); glyph(th.ac,.9); break;
    case 'school': R(26,26,W-52,H-52,th.ac2,1,'frame'); bar(); glyph(th.ac,.8); break;
    case 'bold': if(cov){ R(-170,H-250,440,440,th.ac,1,'ell'); R(W-210,70,130,130,th.ac2,1,'ell'); } else R(0,0,22,H,th.ac); if(!cov&&lay!=='section') bar(); glyph(th.ac,1); break;
    case 'minimal': if(cov) R(560,418,160,2,th.fg); else if(lay==='section') R(130,448,70,3,th.fg); else if(lay!=='quote') R(90,186,1100,2,th.fg); glyph(th.ac2,1); break;
    case 'nature': R(0,H-26,W,26,th.ac2); if(cov){ R(W-270,-150,440,440,th.ac2,.75,'ell'); R(W-150,190,170,170,th.ac,.22,'ell'); } bar(); glyph(th.ac,.6); break;
  }
  return d;
}

/* ---------- deck data ---------- */
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function blank(lay){ return {id:uid(), layout:lay||'bullets', title:'', subtitle:'', bullets:[], left:[], right:[], leftTitle:'', rightTitle:'', stat:'', caption:'', quote:'', by:'', notes:'', img:'', iw:0, ih:0}; }
function fixSlide(s){ var b=blank(); s=s&&typeof s==='object'?s:{};
  if(LAYS.indexOf(s.layout)<0) s.layout='bullets'; if(!s.id) s.id=uid();
  LISTS.forEach(function(k){ s[k]=Array.isArray(s[k])?s[k].map(function(x){ return String(x==null?'':x); }).filter(function(x){ return x.trim(); }):[]; });
  TEXTS.forEach(function(k){ s[k]=s[k]==null?'':String(s[k]); });
  for(var k in b) if(s[k]===undefined) s[k]=b[k];
  return s; }
function newDeck(){ return {id:uid(), name:T('새 발표 자료'), theme:'light', slides:[], t:Date.now(), topic:'', aud:'', n:8, nums:false, footer:''}; }
function fixDeck(d){ d.slides=(Array.isArray(d.slides)?d.slides:[]).map(fixSlide); d.theme=themeOf(d.theme).id; d.name=String(d.name||T('새 발표 자료')); d.nums=!!d.nums; d.footer=String(d.footer||''); if(!d.t) d.t=Date.now(); return d; }
function loadStore(){ var o=null; try{ o=JSON.parse(localStorage.getItem(LS)||'null'); }catch(e){}
  /* older saves: a single deck object, or a bare array of decks, become the first entries of the list */
  if(Array.isArray(o)) o={v:1, last:null, decks:o};
  else if(o&&typeof o==='object'&&!Array.isArray(o.decks)&&Array.isArray(o.slides)) o={v:1, last:o.id||null, decks:[o]};
  if(!o||typeof o!=='object'||!Array.isArray(o.decks)) o={v:1, last:null, decks:[]};
  o.decks=o.decks.filter(function(d){ return d&&typeof d==='object'; }).map(function(d){ if(!d.id) d.id=uid(); return fixDeck(d); }); return o; }
var store=loadStore(), deck=null, cur=0, undo=[], redo=[], gen=false, busyOn=false, saveT=null;
function isDefaultName(n){ return !n||!String(n).trim()||n===T('새 발표 자료')||n==='새 발표 자료'; }
function saveNow(){ clearTimeout(saveT); saveT=null; if(!deck) return; deck.t=Date.now(); store.last=deck.id;
  if(store.decks.indexOf(deck)<0) store.decks.unshift(deck);
  try{ localStorage.setItem(LS,JSON.stringify(store)); $('saved').textContent=T('저장됨'); }catch(e){ $('saved').textContent=''; toast(T('저장 공간이 부족해서 저장하지 못했어요')); } }
function saveSoon(){ $('saved').textContent=''; clearTimeout(saveT); saveT=setTimeout(saveNow,400); }
function openDeck(d){
  if(deck&&deck!==d&&!deck.slides.length&&isDefaultName(deck.name)&&!deck.topic) store.decks=store.decks.filter(function(x){ return x!==deck; }); // drop an untouched empty deck
  deck=d; cur=0; undo=[]; redo=[]; if(store.decks.indexOf(d)<0) store.decks.unshift(d);
  $('deckName').value=deck.name; refresh(); saveNow();
}

/* ---------- undo ---------- */
function snap(){ return JSON.stringify({n:deck.name, th:deck.theme, s:deck.slides, c:cur, f:deck.footer, nm:deck.nums}); }
function pushUndo(s){ undo.push(s||snap()); if(undo.length>100) undo.shift(); redo=[]; updUR(); }
function restore(j){ var o=JSON.parse(j); deck.name=o.n; deck.theme=o.th; deck.footer=o.f||''; deck.nums=!!o.nm; deck.slides=o.s.map(fixSlide); cur=Math.max(0,Math.min(o.c,deck.slides.length-1)); $('deckName').value=deck.name; refresh(); saveSoon(); }
function doUndo(){ blurEdit(); if(!undo.length||gen||busyOn) return; redo.push(snap()); restore(undo.pop()); updUR(); }
function doRedo(){ blurEdit(); if(!redo.length||gen||busyOn) return; undo.push(snap()); restore(redo.pop()); updUR(); }
function updUR(){ $('undoBtn').disabled=!undo.length||gen||busyOn; $('redoBtn').disabled=!redo.length||gen||busyOn; }

/* ---------- drawing a slide ---------- */
var CE=(function(){ var d=document.createElement('div'); try{ d.contentEditable='plaintext-only'; if(d.contentEditable==='plaintext-only') return 'plaintext-only'; }catch(e){} return 'true'; })();
function empty(s,f){ var v=s[f]; return Array.isArray(v)?!v.length:!String(v||'').trim(); }
function cssVars(th){ return '--s-bg:'+th.bg+';--s-fg:'+th.fg+';--s-sub:'+th.sub+';--s-ac:'+th.ac+';--s-head:'+(th.serif?SERIF:SANS)+';--s-body:'+SANS+';--s-hw:'+(th.serif?700:800); }
function fillList(ul,items){ ul.innerHTML=''; (items.length?items:['']).forEach(function(t){ var li=document.createElement('li'); if(t) li.textContent=t; else li.appendChild(document.createElement('br')); ul.appendChild(li); }); ul.classList.toggle('ph',!items.length); }
function slideEl(s,th,edit){
  var el=document.createElement('div'); el.className='sl'+(edit?' edit':''); el.style.cssText=cssVars(th); el.setAttribute('data-notr','');
  deco(th,s.layout).forEach(function(d){ var e=document.createElement('div'); e.className='dc';
    var st='left:'+d.x+'px;top:'+d.y+'px;width:'+d.w+'px;height:'+d.h+'px;opacity:'+d.o+';';
    if(d.r==='frame') st+='border:10px solid '+d.c+';border-radius:6px;';
    else if(d.r==='glyph'){ st+='color:'+d.c+';font:700 '+d.fs+'px/1 Georgia,serif;text-align:center;'; e.textContent=d.t; }
    else st+='background:'+d.c+';'+(d.r==='ell'?'border-radius:50%;':'border-radius:'+(d.h<=10||d.w<=24?Math.min(d.h,d.w)/2:0)+'px;');
    e.style.cssText=st; el.appendChild(e); });
  (LAY[s.layout]||LAY.bullets).forEach(function(b){
    var em=empty(s,b.f); if(em&&!edit) return;
    if(b.f==='img'){ var pc=document.createElement('div'); pc.className='pic'+(em?' empty':''); pc.dataset.f='img';
      pc.style.cssText='left:'+b.x+'px;top:'+b.y+'px;width:'+b.w+'px;height:'+b.h+'px;';
      if(em) pc.textContent='🖼  '+T('그림 넣기'); else { var im=new Image(); im.src=s.img; im.draggable=false; im.alt=''; pc.appendChild(im);
        if(edit){ var rm=document.createElement('button'); rm.className='rm'; rm.dataset.rm='1'; rm.textContent='×'; rm.title=T('그림 빼기'); pc.appendChild(rm); } }
      el.appendChild(pc); return; }
    var box=document.createElement('div'); box.className='fld k-'+b.k; box.dataset.f=b.f;
    box.style.cssText='left:'+b.x+'px;top:'+b.y+'px;width:'+b.w+'px;height:'+b.h+'px;justify-content:'+(b.va||'flex-start')+';text-align:'+(b.al||'left')+';';
    var inn=document.createElement(b.list?'ul':'div'); inn.className='in';
    if(b.list) fillList(inn,s[b.f]); else { inn.textContent=s[b.f]||''; if(em) inn.classList.add('ph'); }
    if(edit){ inn.contentEditable=b.list?'true':CE; inn.spellcheck=false; inn.setAttribute('data-ph',T(ph(b.f,s.layout))); inn.setAttribute('autocapitalize','sentences'); }
    box.appendChild(inn); el.appendChild(box);
  });
  footOf(s,th).forEach(function(f){ var e=document.createElement('div'); e.className='ft'; e.textContent=f.t;
    e.style.cssText='left:'+f.x+'px;top:'+f.y+'px;width:'+f.w+'px;height:'+f.h+'px;font-size:'+f.fs+'px;color:'+f.c+';text-align:'+f.al+';'; el.appendChild(e); });
  return el;
}
/* slide number and footer text (not on the title and closing slides); shared by screen, print and .pptx */
function footOf(s,th){ var i=deck?deck.slides.indexOf(s):-1, o=[]; if(i<0||s.layout==='title'||s.layout==='closing') return o;
  if(deck.footer) o.push({t:deck.footer, x:90, y:664, w:900, h:20, fs:15, c:th.sub, al:'left'});
  if(deck.nums) o.push({t:String(i+1), x:1090, y:664, w:100, h:20, fs:15, c:th.sub, al:'right'}); return o; }
function boxDef(lay,f){ var L=LAY[lay]||LAY.bullets; for(var i=0;i<L.length;i++) if(L[i].f===f) return L[i]; return null; }
/* shrink the font until the text fits its box (results cached by content) */
var fitCache=new Map();
function fitBox(box,b,th,lay,fresh){
  var inn=box.firstChild, txt=inn.classList.contains('ph')?'\u0000'+inn.getAttribute('data-ph'):inn.innerText, key=th.id+'|'+lay+'|'+b.f+'|'+txt;
  var set=function(v){ inn.style.fontSize=v+'px'; };
  var over=function(){ return inn.scrollHeight>box.clientHeight+1||inn.scrollWidth>box.clientWidth+1; };
  if(!fresh&&fitCache.has(key)){ set(fitCache.get(key)); return; }
  var lo=b.min, hi=b.fs, v=hi; set(hi);
  if(over()){ set(lo); if(!over()){ for(var i=0;i<7;i++){ var m=(lo+hi)/2; set(m); if(over()) hi=m; else lo=m; } } v=Math.floor(lo*2)/2; set(v); }
  if(fitCache.size>3000) fitCache.clear(); fitCache.set(key,v);
}
function fitAll(el,s,th,fresh){ el.querySelectorAll('.fld').forEach(function(box){ var b=boxDef(s.layout,box.dataset.f); if(b) fitBox(box,b,th,s.layout,fresh); }); }
/* font size (slide px) of every field, measured off screen */
function measure(s,th){ var m=$('measure'); m.innerHTML=''; var el=slideEl(s,th,false); m.appendChild(el); fitAll(el,s,th);
  var o={}; el.querySelectorAll('.fld').forEach(function(box){ o[box.dataset.f]=parseFloat(box.firstChild.style.fontSize)||boxDef(s.layout,box.dataset.f).fs; }); m.innerHTML=''; return o; }

/* ---------- screen ---------- */
function th(){ return themeOf(deck.theme); }
function refresh(){
  var start=!deck.slides.length&&!gen;
  $('start').hidden=!start; $('editor').hidden=start;
  $('playBtn').disabled=$('pptxBtn').disabled=!deck.slides.length||gen;
  if(start) drawStart(); else { cur=Math.max(0,Math.min(cur,deck.slides.length-1)); drawList(); drawMain(); }
  updUR();
}
function drawList(){
  var l=$('list'), t=th(); l.innerHTML='';
  deck.slides.forEach(function(s,i){
    var d=document.createElement('div'); d.className='thumb'+(i===cur?' on':''); d.dataset.i=i;
    d.innerHTML='<div class="no"><span>'+(i+1)+'</span><span class="grip" title="'+T('끌어서 순서 바꾸기')+'">⋮⋮</span></div><div class="tv"></div>'+
      (i===cur&&!gen?'<span class="mv"><button data-mv="-1" title="'+T('앞으로')+'"'+(i===0?' disabled':'')+'>↑</button><button data-mv="1" title="'+T('뒤로')+'"'+(i===deck.slides.length-1?' disabled':'')+'>↓</button></span>':'');
    var el=slideEl(s,t,false); d.querySelector('.tv').appendChild(el); l.appendChild(d); fitAll(el,s,t);
  });
  if(!gen){ var a=document.createElement('button'); a.className='addSl'; a.id='addSl'; a.title=T('새 슬라이드'); a.innerHTML='<b>+</b>'; l.appendChild(a); }
}
function updateThumb(i){ var d=$('list').querySelector('.thumb[data-i="'+i+'"]'), s=deck.slides[i]; if(!d||!s) return; var tv=d.querySelector('.tv'), t=th(); tv.innerHTML=''; var el=slideEl(s,t,false); tv.appendChild(el); fitAll(el,s,t); }
var thumbT=null; function thumbSoon(i){ clearTimeout(thumbT); thumbT=setTimeout(function(){ updateThumb(i); },250); }
function drawMain(){
  var host=$('slideHost'), s=deck.slides[cur], t=th(); host.innerHTML='';
  $('waitMsg').hidden=!!s; $('waitMsg').textContent=gen?T('AI가 발표 자료를 쓰고 있어요…'):'';
  host.hidden=!s;
  ['dupBtn','delBtn','laySel','aiBtn','addBtn','themeBtn','notes','picBtn'].forEach(function(id){ $(id).disabled=!s||gen||busyOn||(id==='aiBtn'&&s.layout==='image'); });
  if(!s){ $('notes').value=''; return; }
  var el=slideEl(s,t,!gen&&!busyOn); host.appendChild(el); scaleMain(); fitAll(el,s,t,true);
  $('laySel').value=s.layout; if(document.activeElement!==$('notes')) $('notes').value=s.notes||'';
}
function scaleMain(){
  var w=$('canvasWrap'), host=$('slideHost'), pad=w.clientWidth<600?12:22, cw=w.clientWidth-pad*2, ch=w.clientHeight-pad*2; if(cw<=0||ch<=0) return;
  var k=Math.min(cw/W,ch/H); host.style.width=W*k+'px'; host.style.height=H*k+'px'; host.style.left=(w.clientWidth-W*k)/2+'px'; host.style.top=(w.clientHeight-H*k)/2+'px';
  var el=host.firstChild; if(el) el.style.transform='scale('+k+')';
}
if(window.ResizeObserver) new ResizeObserver(function(){ scaleMain(); }).observe($('canvasWrap')); else window.addEventListener('resize',scaleMain);
function select(i,keepFocus){ blurEdit(); if(!deck.slides.length) return; cur=Math.max(0,Math.min(i,deck.slides.length-1)); drawList(); drawMain();
  var on=$('list').querySelector('.thumb.on'); if(on&&on.scrollIntoView) on.scrollIntoView({block:'nearest',inline:'nearest'}); }
function blurEdit(){ var a=document.activeElement; if(a&&(a.classList.contains('in')||a.id==='notes')) a.blur(); }

/* ---------- editing text in place ---------- */
var editSnap=null;
function readField(inn,f){ var t=inn.innerText.replace(/ /g,' ');
  if(LISTS.indexOf(f)>=0) return t.split('\n').map(function(x){ return x.trim(); }).filter(Boolean);
  return t.replace(/\s*\n\s*/g,f==='quote'||f==='caption'||f==='subtitle'?'\n':' ').trim(); }
var host=$('slideHost');
host.addEventListener('focusin',function(e){ if(e.target.classList.contains('in')) editSnap=snap(); });
host.addEventListener('input',function(e){
  var inn=e.target.closest('.in'); if(!inn) return; var box=inn.parentNode, f=box.dataset.f, s=deck.slides[cur]; if(!s) return;
  if(editSnap){ pushUndo(editSnap); editSnap=null; }
  s[f]=readField(inn,f); inn.classList.toggle('ph',empty(s,f));
  var b=boxDef(s.layout,f); if(b) fitBox(box,b,th(),s.layout,true);
  saveSoon(); thumbSoon(cur);
});
host.addEventListener('focusout',function(e){
  var inn=e.target.closest&&e.target.closest('.in'); if(!inn) return; editSnap=null; var f=inn.parentNode.dataset.f, s=deck.slides[cur]; if(!s) return;
  if(LISTS.indexOf(f)>=0){ fillList(inn,s[f]); } else if(empty(s,f)){ inn.textContent=''; inn.classList.add('ph'); }
  var b=boxDef(s.layout,f); if(b) fitBox(inn.parentNode,b,th(),s.layout,true);
  updateThumb(cur);
});
host.addEventListener('keydown',function(e){
  var inn=e.target.closest('.in'); if(!inn) return; e.stopPropagation(); var f=inn.parentNode.dataset.f;
  if(e.key==='Escape'){ inn.blur(); return; }
  if(e.key==='Enter'&&LISTS.indexOf(f)<0&&!(e.shiftKey&&(f==='quote'||f==='caption'||f==='subtitle'))){ e.preventDefault(); inn.blur(); }
});
host.addEventListener('paste',function(e){
  var inn=e.target.closest&&e.target.closest('.in'); if(!inn) return; e.preventDefault();
  var t=(e.clipboardData||window.clipboardData).getData('text')||''; if(LISTS.indexOf(inn.parentNode.dataset.f)<0) t=t.replace(/\s*\n\s*/g,' ');
  document.execCommand('insertText',false,t);
});
host.addEventListener('click',function(e){
  var box=e.target.closest('.fld'); if(!box||gen||busyOn) return; var inn=box.firstChild; if(e.target!==box&&!inn.classList.contains('ph')) return;
  if(document.activeElement!==inn) inn.focus();
  try{ var r=document.createRange(); r.selectNodeContents(inn.classList.contains('ph')?inn.lastChild||inn:inn); r.collapse(!inn.classList.contains('ph')?false:true); var sel=getSelection(); sel.removeAllRanges(); sel.addRange(r); }catch(err){}
});
var nt=$('notes'), notesSnap=null;
nt.addEventListener('focus',function(){ notesSnap=snap(); });
nt.addEventListener('input',function(){ var s=deck.slides[cur]; if(!s) return; if(notesSnap){ pushUndo(notesSnap); notesSnap=null; } s.notes=nt.value; saveSoon(); });
nt.addEventListener('keydown',function(e){ e.stopPropagation(); });
$('deckName').addEventListener('input',function(){ deck.name=this.value; saveSoon(); });
$('deckName').addEventListener('change',function(){ if(!this.value.trim()){ deck.name=T('새 발표 자료'); this.value=deck.name; } saveNow(); });
$('deckName').addEventListener('keydown',function(e){ e.stopPropagation(); if(e.key==='Enter'||e.key==='Escape') this.blur(); });

/* ---------- slide commands ---------- */
function changed(all){ saveSoon(); if(all){ drawList(); drawMain(); } else { updateThumb(cur); drawMain(); } updUR(); }
function addSlide(lay,after){ blurEdit(); pushUndo(); var s=blank(lay||'bullets'), i=after==null?cur+1:after+1; if(!deck.slides.length) i=0; deck.slides.splice(i,0,s); cur=i; refresh(); saveSoon(); focusField('title'); return s; }
function focusField(f){ setTimeout(function(){ var b=host.querySelector('.fld[data-f="'+f+'"] .in'); if(b&&!gen) b.focus(); },30); }
function dupSlide(){ blurEdit(); var s=deck.slides[cur]; if(!s) return; pushUndo(); var c=JSON.parse(JSON.stringify(s)); c.id=uid(); deck.slides.splice(cur+1,0,c); cur++; changed(true); toast(T('슬라이드를 복제했어요')); }
function delSlide(){ blurEdit(); if(deck.slides.length<=1) return toast(T('마지막 슬라이드는 지울 수 없어요')); pushUndo(); deck.slides.splice(cur,1); cur=Math.min(cur,deck.slides.length-1); changed(true); toast(T('슬라이드를 지웠어요 · 되돌리기로 살릴 수 있어요')); }
function moveSlide(from,to){ if(to<0||to>=deck.slides.length||from===to) return; blurEdit(); pushUndo(); var s=deck.slides.splice(from,1)[0]; deck.slides.splice(to,0,s); cur=to; changed(true); }
function setLayout(lay){ var s=deck.slides[cur]; if(!s||s.layout===lay) return; blurEdit(); pushUndo();
  if(lay==='two'&&!s.left.length&&!s.right.length&&s.bullets.length){ var h=Math.ceil(s.bullets.length/2); s.left=s.bullets.slice(0,h); s.right=s.bullets.slice(h); }
  if(lay==='bullets'&&!s.bullets.length) s.bullets=s.left.concat(s.right);
  if(lay==='quote'&&!s.quote&&s.layout!=='quote'&&s.title){ s.quote=s.title; }
  if(lay==='stat'&&!s.caption&&s.bullets.length) s.caption=s.bullets[0];
  s.layout=lay; changed(); if(lay==='image'&&!s.img) pickImage(); }
function setTheme(id){ if(deck.theme===id) return; blurEdit(); if(deck.slides.length) pushUndo(); deck.theme=id; saveSoon(); if(deck.slides.length){ drawList(); drawMain(); } else drawStart(); drawThemes(); }
$('undoBtn').onclick=doUndo; $('redoBtn').onclick=doRedo;
$('addBtn').onclick=function(){ addSlide('bullets'); };
$('dupBtn').onclick=dupSlide; $('delBtn').onclick=delSlide;
$('laySel').onchange=function(){ setLayout(this.value); };

/* ---------- slide list: tap to open, drag to reorder (mouse anywhere, finger on the grip), up/down buttons ---------- */
var dragS=null, list=$('list');
function horiz(){ return getComputedStyle(list).flexDirection==='row'&&getComputedStyle(list).display==='flex'; }
function dropIndex(x,y){ var th=[].slice.call(list.querySelectorAll('.thumb')), h=horiz(), n=0;
  th.forEach(function(t){ var r=t.getBoundingClientRect(); if((h?r.left+r.width/2:r.top+r.height/2)<(h?x:y)) n++; }); return n; }
function showDrop(n){ var d=list.querySelector('.drop'); if(!d){ d=document.createElement('div'); d.className='drop'; list.appendChild(d); }
  var th=list.querySelectorAll('.thumb'), h=horiz(), lr=list.getBoundingClientRect(), ref=th[Math.min(n,th.length-1)], r=ref.getBoundingClientRect();
  if(h){ d.style.left=((n<th.length?r.left:r.right)-lr.left+list.scrollLeft-2)+'px'; }
  else d.style.top=((n<th.length?r.top:r.bottom)-lr.top+list.scrollTop-2)+'px'; }
function autoScroll(){ if(!dragS||!dragS.on) return; var r=list.getBoundingClientRect(), h=horiz(), p=h?dragS.x:dragS.y, a=h?r.left:r.top, b=h?r.right:r.bottom, v=0;
  if(p<a+40) v=-Math.max(4,(a+40-p)/3); else if(p>b-40) v=Math.max(4,(p-(b-40))/3);
  if(v){ if(h) list.scrollLeft+=v; else list.scrollTop+=v; showDrop(dropIndex(dragS.x,dragS.y)); } dragS.raf=requestAnimationFrame(autoScroll); }
list.addEventListener('pointerdown',function(e){
  if(gen||busyOn) return; var t=e.target.closest('.thumb'); if(!t||e.target.closest('.mv')) return; if(e.button) return;
  var grip=!!e.target.closest('.grip'); if(e.pointerType!=='mouse'&&!grip){ return; }
  dragS={i:+t.dataset.i, el:t, x:e.clientX, y:e.clientY, x0:e.clientX, y0:e.clientY, on:false, id:e.pointerId};
  try{ t.setPointerCapture(e.pointerId); }catch(err){}
  if(grip) e.preventDefault();
});
list.addEventListener('pointermove',function(e){ if(!dragS||e.pointerId!==dragS.id) return; dragS.x=e.clientX; dragS.y=e.clientY;
  if(!dragS.on&&Math.hypot(e.clientX-dragS.x0,e.clientY-dragS.y0)>6){ dragS.on=true; blurEdit(); dragS.el.classList.add('drag'); autoScroll(); }
  if(dragS.on){ e.preventDefault(); showDrop(dropIndex(e.clientX,e.clientY)); } });
function endDrag(e,cancel){ if(!dragS||(e&&e.pointerId!==dragS.id)) return; var d=dragS; dragS=null; cancelAnimationFrame(d.raf); d.el.classList.remove('drag'); var dr=list.querySelector('.drop'); if(dr) dr.remove();
  if(d.on){ list._noClick=Date.now(); if(!cancel){ var n=dropIndex(d.x,d.y); if(n>d.i) n--; moveSlide(d.i,n); } } }
list.addEventListener('pointerup',function(e){ endDrag(e); });
list.addEventListener('pointercancel',function(e){ endDrag(e,true); });
list.addEventListener('click',function(e){
  if(list._noClick&&Date.now()-list._noClick<300) return;
  var mv=e.target.closest('[data-mv]'); if(mv){ moveSlide(cur,cur+(+mv.dataset.mv)); return; }
  if(e.target.closest('#addSl')){ addSlide('bullets',deck.slides.length-1); return; }
  var t=e.target.closest('.thumb'); if(t&&!e.target.closest('.grip')) select(+t.dataset.i); else if(t) select(+t.dataset.i);
});

/* ---------- start screen ---------- */
var CHIPS=[['🌍 기후 변화','기후 변화가 우리 생활에 주는 영향과 우리가 할 수 있는 일'],['🪐 태양계','태양계 행성 소개'],['📚 동아리 소개','우리 학교 동아리를 새 친구들에게 소개하기'],['💡 앱 아이디어','친구들이 함께 공부하는 앱 아이디어 발표'],['🥗 건강한 식습관','건강한 식습관을 만드는 다섯 가지 방법']];
CHIPS.forEach(function(c){ var b=document.createElement('button'), full=T(c[1]); b.textContent=T(c[0]); b.title=full; b.onclick=function(){ $('topic').value=full; deck.topic=full; saveSoon(); $('topic').focus(); }; $('topicChips').appendChild(b); });
function themeCards(box,onPick,sc){
  box.innerHTML=''; var s=blank('title'); s.title=T('발표 제목'); s.subtitle=T('부제목을 여기에 써요');
  THEMES.forEach(function(t){ var b=document.createElement('button'); b.className='thc'+(t.id===deck.theme?' on':''); b.dataset.t=t.id;
    b.innerHTML='<div class="tv"></div><span></span>'; b.lastChild.textContent=T(t.name); box.appendChild(b);
    var tv=b.firstChild, el=slideEl(s,t,false); tv.appendChild(el); fitAll(el,s,t);
    var k=(tv.clientWidth||sc*W)/W; el.style.transform='scale('+k+')'; b.onclick=function(){ onPick(t.id); }; });
}
function drawThemes(){ document.querySelectorAll('.thc').forEach(function(b){ b.classList.toggle('on',b.dataset.t===deck.theme); }); }
function drawStart(){ $('topic').value=deck.topic||''; $('aud').value=deck.aud||''; var n=Math.max(3,Math.min(15,deck.n||8)); $('count').value=n; $('countV').textContent=n;
  themeCards($('themePick'),setTheme,.12); aiNote(); }
function aiNote(){ var n=''; try{ if(window.FFAI&&FFAI.isLocal()) n=T('기기 안에서 도는 자체 AI는 작아서 목차를 먼저 짜고 슬라이드를 몇 장씩 나눠 써요. 더 좋은 결과가 필요하면 AI 설정에서 Claude, Gemini, OpenAI 키를 넣어 보세요.'); }catch(e){} $('aiNote').textContent=n; }
$('topic').placeholder=T('예: 우리 동네 환경 문제와 해결 방법'); $('aud').placeholder=T('예: 5학년 친구들에게 수업 시간에 발표'); $('notes').placeholder=T('발표자 메모 (발표할 때 할 말을 적어 두세요)');
$('count').addEventListener('input',function(){ $('countV').textContent=this.value; deck.n=+this.value; saveSoon(); });
$('topic').addEventListener('input',function(){ deck.topic=this.value; saveSoon(); });
$('aud').addEventListener('input',function(){ deck.aud=this.value; saveSoon(); });
$('topic').addEventListener('keydown',function(e){ e.stopPropagation(); if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){ e.preventDefault(); $('genBtn').click(); } });
$('aud').addEventListener('keydown',function(e){ e.stopPropagation(); if(e.key==='Enter') $('genBtn').click(); });
$('blankBtn').onclick=function(){ pushUndo(); var s=blank('title'); if(deck.topic&&deck.topic.trim()) s.title=deck.topic.trim().split('\n')[0].slice(0,80); deck.slides=[s]; cur=0; refresh(); saveNow(); focusField('title'); };
$('aiSetBtn').onclick=function(){ if(window.FFAI) FFAI.settings(aiNote,aiNote); };

/* ---------- menus and dialogs ---------- */
function openMenu(m,btn){ closeMenus(); var r=btn.getBoundingClientRect(); m.classList.add('open');
  var w=m.offsetWidth, h=m.offsetHeight, x=Math.min(r.left,innerWidth-w-8), y=r.bottom+6; if(y+h>innerHeight-8) y=Math.max(8,r.top-h-6);
  m.style.left=Math.max(8,x)+'px'; m.style.top=y+'px'; }
function closeMenus(){ document.querySelectorAll('.menu.open').forEach(function(m){ m.classList.remove('open'); }); }
document.addEventListener('pointerdown',function(e){ if(!e.target.closest('.menu')&&!e.target.closest('#deckBtn,#aiBtn,#themeBtn')) closeMenus(); },true);
$('deckBtn').onclick=function(){ blurEdit(); drawDeckList(); drawDeckMenu(); openMenu($('deckMenu'),this); };
$('themeBtn').onclick=function(){ blurEdit(); openMenu($('themeMenu'),this); themeCards($('themeList'),function(id){ setTheme(id); },.1); };
function when(t){ var d=new Date(t); return (d.getMonth()+1)+'/'+d.getDate()+' '+('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2); }
function drawDeckList(){ var l=$('deckList'); l.innerHTML='';
  store.decks.slice().sort(function(a,b){ return (b===deck)-(a===deck)||b.t-a.t; }).forEach(function(d){
    var b=document.createElement('button'); b.className='doc'+(d===deck?' on':''); b.setAttribute('data-notr','');
    b.innerHTML='<span></span><small></small>'; b.firstChild.textContent=(d===deck?'● ':'')+(d.name||T('이름 없음')); b.lastChild.textContent=F('{0}장',d.slides.length)+' · '+when(d.t);
    b.onclick=function(){ closeMenus(); if(d===deck||gen) return; saveNow(); openDeck(d); }; l.appendChild(b); }); }
function drawDeckMenu(){ var m=$('deckMenu'); m.querySelector('[data-d="nums"]').textContent=deck.nums?T('슬라이드 번호 끄기'):T('슬라이드 번호 켜기'); m.querySelector('[data-d="footer"]').textContent=deck.footer?T('바닥글 고치기'):T('바닥글 쓰기'); }
function newDeckAction(){ saveNow(); if(!deck.slides.length&&isDefaultName(deck.name)){ deck.topic=''; deck.aud=''; refresh(); } else openDeck(newDeck()); $('topic').focus(); }
function renameDeck(d){ ask(T('이름 바꾸기'),'',T('발표 자료 이름'),T('확인'),d.name).then(function(v){ if(!v) return; d.name=v; if(d===deck) $('deckName').value=v; saveNow(); drawMgr(); }); }
function deleteDeck(d){ confirmDlg(F('"{0}" 발표 자료를 지울까요? 되돌릴 수 없어요.',d.name||T('이름 없음'))).then(function(ok){ if(!ok) return;
  var wasOpen=d===deck; store.decks=store.decks.filter(function(x){ return x!==d; });
  if(wasOpen){ deck=null; var rest=store.decks.slice().sort(function(a,b){ return b.t-a.t; }); openDeck(rest.length?rest[0]:newDeck()); } else saveNow();
  drawMgr(); toast(T('지웠어요')); }); }
function copyDeck(d){ saveNow(); var c=JSON.parse(JSON.stringify(d)); c.id=uid(); c.name=F('{0} 사본',d.name||T('이름 없음')); c.t=Date.now(); c.slides.forEach(function(x){ x.id=uid(); }); store.decks.unshift(c); saveNow(); drawMgr(); toast(T('복사했어요')); }
function drawMgr(){ var l=$('mgrList'); l.innerHTML=''; saveNow();
  store.decks.slice().sort(function(a,b){ return (b===deck)-(a===deck)||b.t-a.t; }).forEach(function(d){
    var r=document.createElement('div'); r.className='mrow'+(d===deck?' on':''); r.setAttribute('data-notr','');
    r.innerHTML='<button class="mo"><b></b><small></small></button><button class="ib" data-k="ren"></button><button class="ib" data-k="dup"></button><button class="ib dang" data-k="del"></button>';
    r.querySelector('b').textContent=(d===deck?'● ':'')+(d.name||T('이름 없음')); r.querySelector('small').textContent=F('{0}장',d.slides.length)+' · '+when(d.t);
    var ic={ren:'<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>', dup:'<svg viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>', del:'<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>'}, tt={ren:T('이름 바꾸기'),dup:T('복제'),del:T('지우기')};
    ['ren','dup','del'].forEach(function(k){ var b=r.querySelector('[data-k="'+k+'"]'); b.innerHTML=ic[k]; b.title=tt[k]; b.setAttribute('aria-label',tt[k]); b.onclick=function(){ if(k==='ren') renameDeck(d); else if(k==='dup') copyDeck(d); else deleteDeck(d); }; });
    r.querySelector('.mo').onclick=function(){ if(gen) return toast(T('AI가 다 만들 때까지 기다려 주세요')); closeDlg('mgrDlg',null); if(d!==deck){ saveNow(); openDeck(d); } };
    l.appendChild(r); }); }
function openMgr(){ drawMgr(); openDlg('mgrDlg'); }
$('mgrNew').onclick=function(){ if(gen) return toast(T('AI가 다 만들 때까지 기다려 주세요')); closeDlg('mgrDlg',null); newDeckAction(); };
$('deckMenu').addEventListener('click',function(e){
  var b=e.target.closest('[data-d]'); if(!b) return; closeMenus(); var k=b.dataset.d;
  if(k==='keys') return showKeys();
  if(gen&&k!=='print'&&k!=='md') return toast(T('AI가 다 만들 때까지 기다려 주세요'));
  if(k==='new') newDeckAction();
  else if(k==='mgr') openMgr();
  else if(k==='rename'){ var n=$('deckName'); n.focus(); n.select(); }
  else if(k==='print') printDeck();
  else if(k==='nums'){ if(!deck.slides.length) return; pushUndo(); deck.nums=!deck.nums; changed(true); }
  else if(k==='footer'){ if(!deck.slides.length) return; ask(T('바닥글'),T('제목·마무리를 뺀 모든 슬라이드 아래쪽에 작게 들어가요. 비우면 없어져요.'),T('예: 3학년 2반 · 김하늘'),T('확인'),deck.footer,true).then(function(v){ if(v==null) return; pushUndo(); deck.footer=v; changed(true); }); }
  else if(k==='imp') openImport();
  else if(k==='md') exportMD();
  else if(k==='del') deleteDeck(deck);
});
var dlgRes=null;
function openDlg(id){ $(id).classList.add('open'); }
function closeDlg(id,v){ $(id).classList.remove('open'); var f=dlgRes; dlgRes=null; if(f) f(v); }
document.querySelectorAll('.ov').forEach(function(o){ o.addEventListener('click',function(e){ if(e.target===o||e.target.closest('[data-close]')) closeDlg(o.id,null); }); });
var askEmpty=false;
function ask(title,note,ph,okText,init,allowEmpty){ return new Promise(function(res){ dlgRes=res; askEmpty=!!allowEmpty; $('askTitle').textContent=title; $('askNote').textContent=note||''; $('askIn').value=init||''; $('askIn').placeholder=ph||''; $('askOk').textContent=okText||T('확인'); openDlg('askDlg'); setTimeout(function(){ $('askIn').focus(); $('askIn').select(); },60); }); }
$('askOk').onclick=function(){ var v=$('askIn').value.trim(); if(!v&&!askEmpty) return $('askIn').focus(); closeDlg('askDlg',v); };
$('askIn').addEventListener('keydown',function(e){ e.stopPropagation(); if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); $('askOk').click(); } if(e.key==='Escape') closeDlg('askDlg',null); });
function confirmDlg(t){ return new Promise(function(res){ dlgRes=res; $('cfmTxt').textContent=t; openDlg('cfmDlg'); }); }
$('cfmOk').onclick=function(){ closeDlg('cfmDlg',true); };
var toastT=null; function toast(t){ var e=$('toast'); e.textContent=t; e.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(function(){ e.classList.remove('on'); },2600); }

/* ---------- pictures from the device (shrunk to 1600 px, kept inside the deck and the .pptx) ---------- */
function readImg(file){ return new Promise(function(res,rej){ if(!file||!/^image\//.test(file.type)) return rej(new Error('type'));
  var fr=new FileReader(); fr.onerror=rej; fr.onload=function(){ var im=new Image(); im.onerror=rej; im.onload=function(){
    var k=Math.min(1,1600/Math.max(im.naturalWidth,im.naturalHeight)), w=Math.max(1,Math.round(im.naturalWidth*k)), h=Math.max(1,Math.round(im.naturalHeight*k)), c=document.createElement('canvas'); c.width=w; c.height=h;
    var x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,w,h); x.drawImage(im,0,0,w,h); var d; try{ d=c.toDataURL('image/jpeg',.82); }catch(e){ return rej(e); } res({d:d,w:w,h:h}); };
    im.src=fr.result; }; fr.readAsDataURL(file); }); }
function blankSlide(s){ return LISTS.concat(TEXTS).every(function(f){ return empty(s,f); }); }
function putPictures(files){ files=[].slice.call(files||[]).filter(function(f){ return /^image\//.test(f.type); }); if(!files.length||gen||busyOn||!deck.slides.length) return;
  var n=0, p=Promise.resolve();
  files.forEach(function(f,fi){ p=p.then(function(){ return readImg(f); }).then(function(r){ blurEdit(); pushUndo(); var s=deck.slides[cur];
    if(!s||(fi>0)||(s.layout!=='image'&&!blankSlide(s))){ s=blank('image'); deck.slides.splice(cur+1,0,s); cur=cur+1; } else s.layout='image';
    s.img=r.d; s.iw=r.w; s.ih=r.h; n++; changed(true); }); });
  p.then(function(){ toast(T('그림을 넣었어요')); },function(){ if(n) changed(true); toast(T('그림을 읽지 못했어요')); }); }
function pickImage(){ var i=document.createElement('input'); i.type='file'; i.accept='image/*'; i.multiple=true; i.onchange=function(){ putPictures(i.files); }; i.click(); }
$('picBtn').onclick=pickImage;
host.addEventListener('click',function(e){ if(gen||busyOn) return;
  if(e.target.closest('[data-rm]')){ var s=deck.slides[cur]; if(!s) return; pushUndo(); s.img=''; s.iw=s.ih=0; changed(true); return; }
  if(e.target.closest('.pic.empty')) pickImage(); });
var cw=$('canvasWrap');
cw.addEventListener('dragover',function(e){ if(e.dataTransfer&&[].indexOf.call(e.dataTransfer.types||[],'Files')>=0){ e.preventDefault(); } });
cw.addEventListener('drop',function(e){ var fs=e.dataTransfer&&e.dataTransfer.files; if(fs&&fs.length){ e.preventDefault(); putPictures(fs); } });
document.addEventListener('paste',function(e){ if(e.target.closest&&(e.target.closest('.in')||e.target.closest('input,textarea'))||pr.on||$('editor').hidden) return;
  var fs=[].slice.call((e.clipboardData&&e.clipboardData.files)||[]).filter(function(f){ return /^image\//.test(f.type); }); if(fs.length){ e.preventDefault(); putPictures(fs); } });

/* ---------- outline in, Markdown out ---------- */
function parseOutline(t){ var slides=[], c=null, any=/^\s*#{1,6}\s+\S/m.test(t);
  var push=function(lay,title){ c=blank(lay); c.title=title||''; slides.push(c); };
  String(t||'').replace(/\r/g,'').split('\n').forEach(function(raw){ var l=raw.trim();
    if(!l){ if(!any) c=null; return; }
    var h=/^(#{1,6})\s+(.*)$/.exec(l); if(h){ push(h[1].length===1?(slides.length?'section':'title'):'bullets',h[2].replace(/[*_`]/g,'')); return; }
    if(l[0]==='>'){ if(!c) push('bullets',''); c.notes=(c.notes?c.notes+'\n':'')+l.replace(/^>\s*/,''); return; }
    var b=/^(?:[-*+•·]|\d+[.)])\s+(.*)$/.exec(l); if(b){ if(!c) push('bullets',''); c.bullets.push(b[1].replace(/[*_`]/g,'')); return; }
    l=l.replace(/[*_`]/g,'');
    if(!c){ push(any?(slides.length?'bullets':'title'):'bullets',l); return; }
    if((c.layout==='title'||c.layout==='section')&&!c.subtitle&&!c.bullets.length) c.subtitle=l; else c.bullets.push(l); });
  slides=slides.slice(0,80); slides.forEach(function(x,i){ if(x.layout==='bullets'&&!x.bullets.length) x.layout=i===0?'title':'section'; if(x.layout==='bullets'&&!x.title&&x.bullets.length>1&&!any){ x.title=x.bullets.shift(); } }); return slides; }
$('impIn').placeholder=T('# 발표 제목\n## 첫 슬라이드\n- 내용 하나\n- 내용 둘');
function openImport(){ $('impIn').value=''; openDlg('impDlg'); setTimeout(function(){ $('impIn').focus(); },60); }
$('impOk').onclick=function(){ var sl=parseOutline($('impIn').value); if(!sl.length) return toast(T('가져올 내용이 없어요')); closeDlg('impDlg',null);
  var firstNew=deck.slides.length; pushUndo(); if(!deck.slides.length&&isDefaultName(deck.name)&&sl[0].layout==='title'&&sl[0].title){ deck.name=sl[0].title.slice(0,80); $('deckName').value=deck.name; }
  deck.slides=deck.slides.concat(sl); cur=firstNew; refresh(); saveNow(); toast(F('슬라이드 {0}장을 만들었어요',sl.length)); };
$('impIn').addEventListener('keydown',function(e){ e.stopPropagation(); if(e.key==='Escape') closeDlg('impDlg',null); });
function toMD(){ var o=[];
  deck.slides.forEach(function(s,i){ var L=[], hd=(s.layout==='title'&&i===0)?'# ':(s.layout==='section'?'# ':'## ');
    var title=s.title||(s.layout==='quote'?'':s.stat)||''; if(title||s.layout!=='quote') L.push(hd+title);
    if(s.subtitle) L.push('',s.subtitle.replace(/\n/g,' '));
    if(s.bullets.length) L.push('',s.bullets.map(function(x){ return '- '+x; }).join('\n'));
    if(s.layout==='two'){ [['leftTitle','left'],['rightTitle','right']].forEach(function(p){ if(s[p[0]]) L.push('','### '+s[p[0]]); if(s[p[1]].length) L.push('',s[p[1]].map(function(x){ return '- '+x; }).join('\n')); }); }
    if(s.layout==='stat'&&s.stat) L.push('','**'+s.stat+'**'+(s.caption?' '+s.caption.replace(/\n/g,' '):''));
    else if(s.caption&&s.layout!=='stat') L.push('',s.caption.replace(/\n/g,' '));
    if(s.quote) L.push('','“'+s.quote.replace(/\n/g,' ')+'”'+(s.by?' — '+s.by:''));
    if(s.notes&&s.notes.trim()) L.push('',s.notes.trim().split('\n').map(function(x){ return '> '+x; }).join('\n'));
    o.push(L.join('\n').replace(/^\n+/,'')); });
  return o.join('\n\n')+'\n'; }
function exportMD(){ if(!deck.slides.length) return toast(T('먼저 슬라이드를 만들어 주세요')); blurEdit(); download(new Blob([toMD()],{type:'text/markdown;charset=utf-8'}),fileName(deck.name)+'.md'); toast(T('Markdown 파일을 받았어요')); }

/* ---------- templates (no AI needed) ---------- */
var TPLS=[
  {name:'🙋 자기소개', title:'자기소개', sl:[
    {layout:'title', title:'나를 소개합니다', subtitle:'이름 · 학교 · 반'},
    {layout:'bullets', title:'나는 이런 사람이에요', bullets:['이름과 나이','사는 곳','가족과 친구'], notes:'가장 먼저 나를 한 줄로 소개해요.'},
    {layout:'bullets', title:'좋아하는 것', bullets:['취미','좋아하는 음식','좋아하는 과목']},
    {layout:'stat', title:'나의 자랑', stat:'1', caption:'내가 가장 자신 있는 것 하나'},
    {layout:'quote', quote:'꿈을 이루는 사람이 되고 싶어요', by:'내 꿈'},
    {layout:'closing', title:'들어 주셔서 감사합니다', subtitle:'궁금한 점이 있으면 물어보세요'}]},
  {name:'📊 보고서', title:'보고서 발표', sl:[
    {layout:'title', title:'보고서 제목', subtitle:'발표자 · 날짜'},
    {layout:'bullets', title:'목적과 배경', bullets:['왜 이 주제를 골랐나요','무엇을 알아보려고 했나요']},
    {layout:'two', title:'조사 방법과 결과', leftTitle:'방법', left:['조사 대상','조사 기간'], rightTitle:'결과', right:['알게 된 점','표와 그림']},
    {layout:'stat', title:'핵심 숫자', stat:'00%', caption:'가장 중요한 결과를 한 문장으로'},
    {layout:'bullets', title:'결론과 제안', bullets:['한 줄 결론','앞으로 할 일']},
    {layout:'closing', title:'발표를 마칩니다', subtitle:'질문 받겠습니다'}]},
  {name:'🏫 수업 발표', title:'수업 발표', sl:[
    {layout:'title', title:'수업 제목', subtitle:'학년 · 과목 · 이름'},
    {layout:'bullets', title:'오늘의 학습 목표', bullets:['오늘 배울 것','끝나고 할 수 있는 것']},
    {layout:'section', title:'개념 알아보기', subtitle:'먼저 핵심 말을 이해해요'},
    {layout:'bullets', title:'핵심 내용', bullets:['첫째 개념','둘째 개념','셋째 개념']},
    {layout:'two', title:'예시와 연습', leftTitle:'예시', left:['쉬운 예','생활 속 예'], rightTitle:'연습', right:['문제 1','문제 2']},
    {layout:'bullets', title:'오늘 배운 것 정리', bullets:['핵심 한 줄','더 알아보고 싶은 것']},
    {layout:'closing', title:'수고했어요', subtitle:'다음 시간에 만나요'}]}];
TPLS.forEach(function(tp){ var b=document.createElement('button'); b.textContent=T(tp.name); b.onclick=function(){
  pushUndo(); deck.slides=tp.sl.map(function(x){ var s=blank(x.layout); for(var k in x) if(k!=='layout') s[k]=Array.isArray(x[k])?x[k].map(T):T(x[k]); return s; });
  if(isDefaultName(deck.name)) deck.name=T(tp.title); $('deckName').value=deck.name; cur=0; refresh(); saveNow(); }; $('tplChips').appendChild(b); });

/* ---------- shortcut sheet ---------- */
var KEYS=[['Ctrl+Z / Ctrl+Shift+Z','되돌리기 · 다시 하기'],['↑ ↓ ← →','슬라이드 이동'],['Ctrl+D','슬라이드 복제'],['F5','처음부터 발표'],['Shift+F5','지금 슬라이드부터 발표'],['?','이 단축키 목록'],
  ['→ Space Enter','(발표) 다음'],['← Backspace','(발표) 이전'],['Home End','(발표) 처음 · 끝'],['S','(발표) 발표자 메모 보기'],['L','(발표) 레이저 포인터'],['B','(발표) 화면 끄기'],['Esc','(발표) 나가기']];
function showKeys(){ var b=$('keysBody'); b.innerHTML=''; KEYS.forEach(function(k){ var r=document.createElement('div'); r.className='kr'; var a=document.createElement('kbd'); a.textContent=k[0]; var t=document.createElement('span'); t.textContent=T(k[1]); r.appendChild(a); r.appendChild(t); b.appendChild(r); }); openDlg('keysDlg'); }

/* ---------- presenting ---------- */
var pr={on:false, i:0, end:false, fs:false, notes:false, laser:false, black:false, t0:0, tm:null};
function tick(){ var t=Math.floor((Date.now()-pr.t0)/1000), m=Math.floor(t/60); $('pClock').textContent='⏱ '+(m<10?'0':'')+m+':'+('0'+(t%60)).slice(-2); }
function present(from){
  blurEdit(); closeMenus(); if(!deck.slides.length) return;
  pr.on=true; pr.i=Math.max(0,Math.min(from||0,deck.slides.length-1)); pr.end=false; pr.black=false; pr.t0=Date.now(); clearInterval(pr.tm); pr.tm=setInterval(tick,1000); tick();
  var el=$('present'); el.classList.add('on'); setLaser(false); drawPresent();
  try{ var fn=el.requestFullscreen||el.webkitRequestFullscreen; if(fn){ var p=fn.call(el); pr.fs=true; if(p&&p.catch) p.catch(function(){ pr.fs=false; }); } }catch(e){ pr.fs=false; }
}
function drawPresent(){
  var st=$('pStage'), n=deck.slides.length; st.innerHTML=''; $('pEnd').hidden=!pr.end; st.hidden=pr.end; st.style.visibility=pr.black?'hidden':'';
  $('pNum').textContent=pr.end?n+' / '+n:(pr.i+1)+' / '+n; $('pProg').firstChild.style.width=(pr.end?100:Math.round((pr.i+1)/n*100))+'%';
  var sl=pr.end?null:deck.slides[pr.i], nt=$('pNotes'); nt.textContent=sl?sl.notes||'':''; nt.hidden=!(pr.notes&&sl&&sl.notes&&sl.notes.trim()); $('pNotesB').classList.toggle('on',pr.notes);
  if(pr.end) return; var t=th(), el=slideEl(sl,t,false); st.appendChild(el); fitAll(el,sl,t); scalePresent();
  st.classList.remove('tf'); void st.offsetWidth; st.classList.add('tf');
}
function setLaser(on){ pr.laser=on; $('present').classList.toggle('laser',on); $('pLaserB').classList.toggle('on',on); if(!on) $('pDot').hidden=true; }
function setNotesView(on){ pr.notes=on; drawPresent(); }
function setBlack(on){ pr.black=on; drawPresent(); }
function scalePresent(){ var st=$('pStage'), k=Math.min(innerWidth/W,innerHeight/H); st.style.width=W*k+'px'; st.style.height=H*k+'px'; var el=st.firstChild; if(el) el.style.transform='scale('+k+')'; }
function pNext(){ if(pr.end) return exitPresent(); if(pr.i<deck.slides.length-1) pr.i++; else pr.end=true; drawPresent(); }
function pPrev(){ if(pr.end) pr.end=false; else if(pr.i>0) pr.i--; drawPresent(); }
function exitPresent(){ if(!pr.on) return; pr.on=false; clearInterval(pr.tm); setLaser(false); $('present').classList.remove('on');
  try{ var fe=document.fullscreenElement||document.webkitFullscreenElement; if(fe){ (document.exitFullscreen||document.webkitExitFullscreen).call(document); } }catch(e){}
  if(!pr.end) select(pr.i); }
['fullscreenchange','webkitfullscreenchange'].forEach(function(ev){ document.addEventListener(ev,function(){ if(pr.on&&pr.fs&&!(document.fullscreenElement||document.webkitFullscreenElement)) exitPresent(); }); });
window.addEventListener('resize',function(){ if(pr.on) scalePresent(); });
var pd=null;
$('present').addEventListener('pointerdown',function(e){ if(e.target.closest('.pbar')) return; pd={x:e.clientX,y:e.clientY}; });
$('present').addEventListener('pointermove',function(e){ if(!pr.laser||(e.pointerType==='touch'&&!pd)) return; var d=$('pDot'); d.hidden=false; d.style.left=e.clientX+'px'; d.style.top=e.clientY+'px'; });
$('present').addEventListener('pointerleave',function(e){ if(e.pointerType!=='touch') $('pDot').hidden=true; });
$('present').addEventListener('pointerup',function(e){ if(e.pointerType==='touch') $('pDot').hidden=true; if(!pd||e.target.closest('.pbar')){ pd=null; return; } var dx=e.clientX-pd.x, dy=e.clientY-pd.y; pd=null;
  if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)){ if(dx<0) pNext(); else pPrev(); }
  else if(Math.abs(dx)<12&&Math.abs(dy)<12){ if(pr.black){ setBlack(false); return; } if(pr.laser&&e.pointerType==='touch') return; if(e.clientX<innerWidth*0.3) pPrev(); else pNext(); } });
$('pNotesB').onclick=function(){ setNotesView(!pr.notes); }; $('pLaserB').onclick=function(){ setLaser(!pr.laser); };
$('pPrev').onclick=pPrev; $('pNext').onclick=pNext; $('pExit').onclick=exitPresent;
$('playBtn').onclick=function(){ present(0); };

/* ---------- keyboard ---------- */
document.addEventListener('keydown',function(e){
  if(pr.on){ var k=e.key;
    if(k==='ArrowRight'||k==='ArrowDown'||k==='PageDown'||k===' '||k==='Enter'||k==='n'){ e.preventDefault(); pNext(); }
    else if(k==='ArrowLeft'||k==='ArrowUp'||k==='PageUp'||k==='Backspace'||k==='p'){ e.preventDefault(); pPrev(); }
    else if(k==='Home'){ e.preventDefault(); pr.end=false; pr.i=0; drawPresent(); }
    else if(k==='End'){ e.preventDefault(); pr.end=false; pr.i=deck.slides.length-1; drawPresent(); }
    else if(k==='Escape'){ e.preventDefault(); exitPresent(); }
    else if(k==='s'||k==='S'){ e.preventDefault(); setNotesView(!pr.notes); }
    else if(k==='l'||k==='L'){ e.preventDefault(); setLaser(!pr.laser); }
    else if(k==='b'||k==='B'||k==='.'){ e.preventDefault(); setBlack(!pr.black); }
    return; }
  if(document.querySelector('.ov.open')){ if(e.key==='Escape') document.querySelectorAll('.ov.open').forEach(function(o){ closeDlg(o.id,null); }); return; }
  if(e.key==='Escape') closeMenus();
  var t=e.target; if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.tagName==='SELECT'||t.isContentEditable)) return;
  var mod=e.ctrlKey||e.metaKey;
  if(mod&&(e.key==='z'||e.key==='Z')){ e.preventDefault(); if(e.shiftKey) doRedo(); else doUndo(); }
  else if(mod&&(e.key==='y'||e.key==='Y')){ e.preventDefault(); doRedo(); }
  else if(mod&&(e.key==='d'||e.key==='D')){ e.preventDefault(); if(!$('editor').hidden&&!gen&&!busyOn) dupSlide(); }
  else if(e.key==='?'&&!mod){ e.preventDefault(); showKeys(); }
  else if(e.key==='F5'){ e.preventDefault(); present(e.shiftKey?cur:0); }
  else if(!$('editor').hidden&&!mod&&(e.key==='ArrowDown'||e.key==='ArrowRight'||e.key==='PageDown')){ e.preventDefault(); select(cur+1); }
  else if(!$('editor').hidden&&!mod&&(e.key==='ArrowUp'||e.key==='ArrowLeft'||e.key==='PageUp')){ e.preventDefault(); select(cur-1); }
});

/* ---------- PDF / print ---------- */
function printDeck(){
  if(!deck.slides.length) return toast(T('먼저 슬라이드를 만들어 주세요'));
  blurEdit(); var r=$('printRoot'), t=th(); r.innerHTML='';
  deck.slides.forEach(function(s){ var p=document.createElement('div'); p.className='pp'; var el=slideEl(s,t,false); el.style.transform='none'; p.appendChild(el); r.appendChild(p); fitAll(el,s,t); });
  var old=document.title; document.title=fileName(deck.name);
  setTimeout(function(){ window.print(); document.title=old; },60);
}
window.addEventListener('afterprint',function(){ $('printRoot').innerHTML=''; });

/* ---------- .pptx ---------- */
var pptxP=null;
function needPPTX(){ if(window.PptxGenJS) return Promise.resolve(window.PptxGenJS); if(pptxP) return pptxP;
  pptxP=new Promise(function(res,rej){ var s=document.createElement('script'); s.src='lib/pptxgen.bundle.js'; s.onload=function(){ res(window.PptxGenJS); }; s.onerror=function(){ pptxP=null; rej(); }; document.head.appendChild(s); }); return pptxP; }
function fileName(n){ return String(n||'').replace(/[\\\/:*?"<>|\u0000-\u001f]+/g,' ').replace(/\s+/g,' ').trim().slice(0,80)||'slides'; }
function deckText(){ return deck.name+' '+deck.slides.map(function(s){ return [s.title,s.subtitle,s.bullets.join(' '),s.left.join(' '),s.right.join(' '),s.leftTitle,s.rightTitle,s.stat,s.caption,s.quote,s.by].join(' '); }).join(' '); }
function pptxFace(t,head,txt){ if(/[぀-ヿ]/.test(txt)) return t.serif&&head?'Yu Mincho':'Yu Gothic'; if(/[가-힣]/.test(txt)) return t.serif&&head?'Batang':'Malgun Gothic'; if(/[一-鿿]/.test(txt)) return 'Microsoft YaHei'; return head?t.pfh:t.pfb; }
function buildPPTX(P){
  var t=th(), txt=deckText(), fh=pptxFace(t,1,txt), fb=pptxFace(t,0,txt);
  var I=function(px){ return Math.round(px/96*1000)/1000; }, C=function(h){ return h.replace('#','').toUpperCase(); }, PT=function(px){ return Math.round(px*0.75*2)/2; };
  var VA={'flex-start':'top', center:'middle', 'flex-end':'bottom'};
  var p=new P(); p.layout='LAYOUT_WIDE'; p.title=deck.name; p.author='Fry Slides'; p.company='Frenchfries777 Tools';
  deck.slides.forEach(function(s){
    var sl=p.addSlide(); sl.background={color:C(t.bg)};
    deco(t,s.layout).forEach(function(d){
      var box={x:I(d.x), y:I(d.y), w:I(d.w), h:I(d.h)};
      if(d.r==='glyph'){ box.fontFace='Georgia'; box.fontSize=PT(d.fs); box.color=C(d.c); box.bold=true; box.align='center'; box.valign='top'; box.margin=0; box.transparency=Math.round((1-d.o)*100); sl.addText(d.t,box); return; }
      if(d.r==='frame'){ box.x=I(d.x+5); box.y=I(d.y+5); box.w=I(d.w-10); box.h=I(d.h-10); box.fill={type:'none'}; box.line={color:C(d.c), width:7.5}; sl.addShape(p.ShapeType.rect,box); return; }
      box.fill={color:C(d.c), transparency:Math.round((1-d.o)*100)}; box.line={type:'none'};
      sl.addShape(d.r==='ell'?p.ShapeType.ellipse:p.ShapeType.rect,box);
    });
    var fs=measure(s,t);
    (LAY[s.layout]||LAY.bullets).forEach(function(b){
      if(b.f==='img'){ if(s.img&&s.iw&&s.ih){ var k=Math.min(b.w/s.iw,b.h/s.ih), w=s.iw*k, h=s.ih*k; sl.addImage({data:s.img.replace(/^data:/,''), x:I(b.x+(b.w-w)/2), y:I(b.y+(b.h-h)/2), w:I(w), h:I(h)}); } return; }
      if(empty(s,b.f)) return; var r=role(t,b.k), pt=PT(fs[b.f]||b.fs);
      var o={x:I(b.x), y:I(b.y), w:I(b.w), h:I(b.h), fontFace:r.head?fh:fb, fontSize:pt, color:C(r.c), bold:r.w>=700, align:b.al||'left', valign:VA[b.va||'flex-start'],
        margin:0, lineSpacingMultiple:Math.round(r.lh/1.2*100)/100, fit:'shrink', paraSpaceAfter:0};
      if(b.list){ var items=s[b.f]; sl.addText(items.map(function(x,i){ return {text:x, options:{bullet:{indent:Math.round(pt*1.15)}, paraSpaceAfter:i<items.length-1?Math.round(pt*0.5):0, breakLine:i<items.length-1}}; }),o); }
      else sl.addText(String(s[b.f]),o);
    });
    footOf(s,t).forEach(function(f){ sl.addText(f.t,{x:I(f.x), y:I(f.y), w:I(f.w), h:I(f.h), fontFace:fb, fontSize:PT(f.fs), color:C(f.c), align:f.al, valign:'middle', margin:0}); });
    if(s.notes&&s.notes.trim()) sl.addNotes(s.notes);
  });
  return p;
}
function download(blob,name){ var u=URL.createObjectURL(blob), a=document.createElement('a'); a.href=u; a.download=name; a.style.display='none'; document.body.appendChild(a); a.click();
  setTimeout(function(){ URL.revokeObjectURL(u); a.remove(); },4000); }
function exportPPTX(){
  if(!deck.slides.length) return toast(T('먼저 슬라이드를 만들어 주세요'));
  blurEdit(); saveNow(); var b=$('pptxBtn'); b.disabled=true;
  needPPTX().then(function(P){ return buildPPTX(P).write({outputType:'blob', compression:true}); }).then(function(blob){ download(blob,fileName(deck.name)+'.pptx'); })
    .then(function(){ toast(T('PPTX 파일을 받았어요')); },function(e){ console.error(e); toast(T('PPTX 파일을 만들지 못했어요')); })
    .then(function(){ b.disabled=!deck.slides.length; });
}
$('pptxBtn').onclick=exportPPTX;

/* ---------- start ---------- */
window.addEventListener('beforeunload',function(){ blurEdit(); saveNow(); });
document.addEventListener('visibilitychange',function(){ if(document.hidden) saveNow(); });
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(function(){ fitCache.clear(); if(deck&&deck.slides.length){ drawList(); drawMain(); } else if(deck) drawStart(); });
var first=null; store.decks.forEach(function(d){ if(d.id===store.last) first=d; });
if(!first&&store.decks.length) first=store.decks.slice().sort(function(a,b){ return b.t-a.t; })[0];
openDeck(first||newDeck());

/* used by ai-slides.js */
window.FSL={
  get deck(){ return deck; }, get cur(){ return cur; }, get busy(){ return gen||busyOn; }, LAYS:AILAYS, LAY:LAY, blank:blank, fixSlide:fixSlide, toast:toast, ask:ask, pushUndo:pushUndo, snap:snap,
  saveSoon:saveSoon, saveNow:saveNow, refresh:refresh, select:select, isDefaultName:isDefaultName, openMenu:openMenu, closeMenus:closeMenus, blurEdit:blurEdit,
  setName:function(n){ deck.name=n; $('deckName').value=n; saveSoon(); },
  setGen:function(on){ gen=on; $('genBar').hidden=!on; refresh(); },
  setBusy:function(on){ busyOn=on; $('busy').hidden=!on; drawMain(); updUR(); },
  pushSlide:function(s){ deck.slides.push(fixSlide(s)); cur=deck.slides.length-1; refresh(); saveSoon(); },
  putSlide:function(i,s){ var o=deck.slides[i]; if(!o) return; s=fixSlide(s); s.id=o.id; s.img=o.img; s.iw=o.iw; s.ih=o.ih; deck.slides[i]=s; if(i===cur) drawMain(); updateThumb(i); saveSoon(); },
  insertSlide:function(i,s){ deck.slides.splice(i,0,fixSlide(s)); cur=i; refresh(); saveSoon(); }
};
window.__fsl={get deck(){ return deck; }, get store(){ return store; }, get cur(){ return cur; }, select:select, present:present, exitPresent:exitPresent, get pr(){ return pr; }, buildPPTX:buildPPTX, needPPTX:needPPTX, measure:measure, undo:doUndo, redo:doRedo, moveSlide:moveSlide};
})();
