/* Fry Slides: decks of 16:9 slides drawn in HTML (1280 x 720, scaled), edited in place, presented full screen
   and exported as an editable .pptx (lib/pptxgen.bundle.js, PptxGenJS 4.0.1, loaded only when exporting).
   The same layout boxes and fitted font sizes are used for the screen, printing and the .pptx, so they match.
   Decks are saved in this browser (localStorage 'ffslides.v1'). The AI part is in ai-slides.js (uses ../ai.js). */
(function(){
'use strict';
var T=FFT.T, F=FFT.F, $=function(id){ return document.getElementById(id); };
var W=1280, H=720, LS='ffslides.v1';
/* MODE: '' = the editor, 'pv' = presenter view window (#presenter), which gets the deck from the presenting window and never saves */
var MODE=/^#presenter/.test(location.hash)?'pv':'';

/* ---------- themes ---------- */
var SANS="'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',system-ui,sans-serif", SERIF="'Noto Serif KR','Apple SD Gothic Neo',Georgia,'Batang',serif";
var THEMES=[
  {id:'light',  name:'밝은',     bg:'#ffffff', fg:'#1d2330', sub:'#5d6678', ac:'#3d7fe0', ac2:'#dfeafc', serif:0, pfh:'Arial', pfb:'Arial'},
  {id:'dark',   name:'어두운',   bg:'#10131b', fg:'#eef0f5', sub:'#9aa3b5', ac:'#ffc93c', ac2:'#ff8a3d', serif:0, pfh:'Arial', pfb:'Arial'},
  {id:'school', name:'칠판',     bg:'#2e4b3b', fg:'#f6f1e3', sub:'#cbd8c6', ac:'#ffd66b', ac2:'#b98b55', serif:0, pfh:'Trebuchet MS', pfb:'Trebuchet MS'},
  {id:'bold',   name:'선명한 색', bg:'#4b2fe0', fg:'#ffffff', sub:'#dcd6ff', ac:'#ffd23f', ac2:'#ff5fa2', serif:0, pfh:'Arial Black', pfb:'Arial'},
  {id:'minimal',name:'미니멀',   bg:'#f7f5f0', fg:'#161616', sub:'#6e6a62', ac:'#161616', ac2:'#d9d3c7', serif:1, pfh:'Georgia', pfb:'Arial'},
  {id:'nature', name:'자연',     bg:'#eef3e7', fg:'#1f3a2b', sub:'#556e5d', ac:'#3f8f5b', ac2:'#c6dca2', serif:0, pfh:'Trebuchet MS', pfb:'Trebuchet MS'},
  {id:'sunset', name:'노을',     bg:'#2b1b3d', fg:'#fff4ea', sub:'#e6c7d4', ac:'#ff8a5b', ac2:'#ff4f7b', serif:0, pfh:'Arial', pfb:'Arial'},
  {id:'ocean',  name:'바다',     bg:'#0b3954', fg:'#f2fbff', sub:'#a9d3e6', ac:'#4fd1c5', ac2:'#2b78b7', serif:0, pfh:'Trebuchet MS', pfb:'Trebuchet MS'},
  {id:'sakura', name:'벚꽃',     bg:'#fff1f4', fg:'#4a2a35', sub:'#8a6470', ac:'#e0568a', ac2:'#f9c6d4', serif:0, pfh:'Arial', pfb:'Arial'},
  {id:'neon',   name:'네온',     bg:'#070b14', fg:'#e8fff7', sub:'#7fb5a6', ac:'#00f5a0', ac2:'#ff2bd6', serif:0, pfh:'Arial Black', pfb:'Arial'},
  {id:'paper',  name:'종이',     bg:'#fbf7ee', fg:'#2d2a24', sub:'#7a7366', ac:'#b5472f', ac2:'#e8dcc0', serif:1, pfh:'Georgia', pfb:'Arial'},
  {id:'mono',   name:'흑백',     bg:'#ffffff', fg:'#000000', sub:'#555555', ac:'#000000', ac2:'#dddddd', serif:0, pfh:'Arial Black', pfb:'Arial'}
];
/* colour helpers: luminance, mixing, and a per-slide background that keeps the text readable */
function hx(c){ c=String(c).replace('#',''); if(c.length===3) c=c.replace(/./g,'$&$&'); return [parseInt(c.slice(0,2),16)||0,parseInt(c.slice(2,4),16)||0,parseInt(c.slice(4,6),16)||0]; }
function lum(c){ var a=hx(c).map(function(v){ v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4); }); return .2126*a[0]+.7152*a[1]+.0722*a[2]; }
function mix(a,b,t){ var x=hx(a), y=hx(b); return '#'+x.map(function(v,i){ return ('0'+Math.round(v+(y[i]-v)*t).toString(16)).slice(-2); }).join(''); }
var FONTS=[['','테마 기본'],['sans','고딕'],['serif','명조'],['mono','고정폭']];
function withFont(t,f){ if(!f) return t; var o={}; for(var k in t) o[k]=t[k]; o.f=f; o.serif=f==='serif'?1:0; o.mono=f==='mono'?1:0; if(f==='sans') o.pfh='Arial'; if(f==='serif') o.pfh='Georgia'; if(f==='mono') o.pfh=o.pfb='Courier New'; return o; }
function parseTime(t){ var m=/(\d+):(\d{1,2})(?::(\d{1,2}))?/.exec(String(t||'')), n; if(m) return m[3]!=null?(+m[1]*3600+ +m[2]*60+ +m[3]):(+m[1]*60+ +m[2]); m=/(\d+)/.exec(String(t||'')); return m?+m[1]*60:null; }
function fmtTime(n){ n=Math.max(0,n|0); var h=Math.floor(n/3600), m=Math.floor(n%3600/60), x=n%60; return (h?h+':'+('0'+m).slice(-2):m)+':'+('0'+x).slice(-2); }
function eth(s,t){ if(!s||!s.bg) return t; var o={}, k, dk=lum(s.bg)<.4; for(k in t) o[k]=t[k]; o.bg=s.bg; o.fg=dk?'#f4f5f8':'#1d2330'; o.sub=dk?'#c3c8d6':'#5d6678';
  if(dk?lum(t.ac)<.3:lum(t.ac)>.6) o.ac=dk?'#ffc93c':'#3d7fe0'; o.id=t.id+'~'+s.bg; return o; }
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
  image:[HEAD,{f:'img',x:90,y:204,w:1100,h:396,k:'i'},{f:'caption',x:90,y:608,w:1100,h:50,fs:26,min:14,k:'s',al:'center'}],
  agenda:[HEAD,{f:'bullets',x:90,y:214,w:1100,h:452,fs:34,min:14,k:'b',list:1,cls:'agenda'}],
  timeline:[HEAD,{f:'bullets',x:90,y:230,w:1100,h:420,fs:28,min:12,k:'b',list:1,cls:'timeline'}],
  table:[HEAD,{f:'data',x:90,y:214,w:1100,h:440,k:'t',view:'table'}],
  chart:[HEAD,{f:'data',x:90,y:206,w:1100,h:456,k:'c',view:'chart'}],
  quiz:[HEAD,{f:'quote',x:150,y:196,w:980,h:240,fs:46,min:18,k:'q',al:'center',va:'center'},{f:'caption',x:150,y:456,w:980,h:190,fs:46,min:16,k:'a',al:'center',va:'center',cls:'ans'}],
  timer:[HEAD,{f:'stat',x:90,y:206,w:1100,h:300,fs:230,min:40,k:'a',al:'center',va:'center'},{f:'caption',x:150,y:520,w:980,h:140,fs:34,min:15,k:'b',al:'center'}]
};
var LAYS=['title','section','bullets','two','stat','quote','closing','image','agenda','timeline','table','chart','quiz','timer'], AILAYS=LAYS.slice(0,7);
var LISTS=['bullets','left','right'], TEXTS=['title','subtitle','leftTitle','rightTitle','stat','caption','quote','by','notes','img','data','ctype','bg'];
var PH={title:'제목', subtitle:'부제목', bullets:'내용 (한 줄에 하나씩)', leftTitle:'왼쪽 제목', left:'왼쪽 내용', rightTitle:'오른쪽 제목', right:'오른쪽 내용', stat:'숫자', caption:'숫자 설명', quote:'인용할 말', by:'말한 사람'};
function ph(f,lay){ return f==='title'&&lay==='title'?'발표 제목':f==='title'&&lay==='closing'?'마무리 인사':lay==='quiz'&&f==='quote'?'문제':lay==='quiz'&&f==='caption'?'정답 (발표할 때 눌러야 보여요)':lay==='timer'&&f==='stat'?'시간 (예: 5:00)':lay==='timer'&&f==='caption'?'안내 글 (예: 모둠 토의)':PH[f]; }
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
    case 'sunset': if(cov){ R(W-420,-300,720,720,th.ac,.18,'ell'); R(-180,H-170,360,360,th.ac2,.22,'ell'); } else R(0,H-14,W,14,th.ac2); bar(); glyph(th.ac,.9); break;
    case 'ocean': R(0,H-30,W,30,th.ac2,.55); if(cov) R(W-300,-160,480,480,th.ac,.14,'ell'); bar(); glyph(th.ac,.9); break;
    case 'sakura': R(0,0,W,14,th.ac); if(cov){ R(W-250,-130,420,420,th.ac2,.9,'ell'); R(-110,H-200,300,300,th.ac2,.6,'ell'); } bar(); glyph(th.ac,.8); break;
    case 'neon': R(26,26,W-52,H-52,th.ac,1,'frame'); if(cov) R(W-300,-200,500,500,th.ac2,.10,'ell'); bar(); glyph(th.ac2,.9); break;
    case 'paper': if(cov) R(560,418,160,2,th.ac); else if(lay==='section') R(130,448,70,3,th.ac); else if(lay!=='quote') R(90,186,1100,2,th.ac); R(0,H-10,W,10,th.ac2); glyph(th.ac,.8); break;
    case 'mono': R(0,0,22,H,th.fg); if(!cov&&lay!=='section') bar(); glyph(th.fg,1); break;
    case 'nature': R(0,H-26,W,26,th.ac2); if(cov){ R(W-270,-150,440,440,th.ac2,.75,'ell'); R(W-150,190,170,170,th.ac,.22,'ell'); } bar(); glyph(th.ac,.6); break;
  }
  return d;
}

/* ---------- deck data ---------- */
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function blank(lay){ return {id:uid(), layout:lay||'bullets', title:'', subtitle:'', bullets:[], left:[], right:[], leftTitle:'', rightTitle:'', stat:'', caption:'', quote:'', by:'', notes:'', img:'', iw:0, ih:0, data:'', ctype:'bar', bg:'', hide:false}; }
function fixSlide(s){ var b=blank(); s=s&&typeof s==='object'?s:{};
  if(LAYS.indexOf(s.layout)<0) s.layout='bullets'; if(!s.id) s.id=uid();
  LISTS.forEach(function(k){ s[k]=Array.isArray(s[k])?s[k].map(function(x){ return String(x==null?'':x); }).filter(function(x){ return x.trim(); }):[]; });
  TEXTS.forEach(function(k){ s[k]=s[k]==null?'':String(s[k]); });
  for(var k in b) if(s[k]===undefined) s[k]=b[k];
  s.hide=!!s.hide; if(['bar','line','pie'].indexOf(s.ctype)<0) s.ctype='bar'; if(!/^#[0-9a-f]{6}$/i.test(s.bg)) s.bg='';
  return s; }
function newDeck(){ return {id:uid(), name:T('새 발표 자료'), theme:'light', slides:[], t:Date.now(), topic:'', aud:'', n:8, nums:false, footer:'', font:'', trans:'fade'}; }
function fixDeck(d){ d.slides=(Array.isArray(d.slides)?d.slides:[]).map(fixSlide); d.theme=themeOf(d.theme).id; d.name=String(d.name||T('새 발표 자료')); d.nums=!!d.nums; d.footer=String(d.footer||''); d.font=FONTS.some(function(f){ return f[0]===d.font; })?d.font:''; d.trans=['fade','slide','zoom','none'].indexOf(d.trans)<0?'fade':d.trans; if(!d.t) d.t=Date.now(); return d; }
function loadStore(){ var o=null; try{ o=JSON.parse(localStorage.getItem(LS)||'null'); }catch(e){}
  /* older saves: a single deck object, or a bare array of decks, become the first entries of the list */
  if(Array.isArray(o)) o={v:1, last:null, decks:o};
  else if(o&&typeof o==='object'&&!Array.isArray(o.decks)&&Array.isArray(o.slides)) o={v:1, last:o.id||null, decks:[o]};
  if(!o||typeof o!=='object'||!Array.isArray(o.decks)) o={v:1, last:null, decks:[]};
  o.decks=o.decks.filter(function(d){ return d&&typeof d==='object'; }).map(function(d){ if(!d.id) d.id=uid(); return fixDeck(d); }); return o; }
var store=loadStore(), deck=null, cur=0, undo=[], redo=[], gen=false, busyOn=false, saveT=null;
function isDefaultName(n){ return !n||!String(n).trim()||n===T('새 발표 자료')||n==='새 발표 자료'; }
function saveNow(){ clearTimeout(saveT); saveT=null; if(!deck||MODE) return; deck.t=Date.now(); store.last=deck.id;
  if(store.decks.indexOf(deck)<0) store.decks.unshift(deck);
  try{ localStorage.setItem(LS,JSON.stringify(store)); $('saved').textContent=T('저장됨'); }catch(e){ $('saved').textContent=''; toast(T('저장 공간이 부족해서 저장하지 못했어요')); } }
function saveSoon(){ $('saved').textContent=''; clearTimeout(saveT); saveT=setTimeout(saveNow,400); }
function openDeck(d){
  if(deck&&deck!==d&&!deck.slides.length&&isDefaultName(deck.name)&&!deck.topic) store.decks=store.decks.filter(function(x){ return x!==deck; }); // drop an untouched empty deck
  deck=d; cur=0; undo=[]; redo=[]; if(store.decks.indexOf(d)<0) store.decks.unshift(d);
  $('deckName').value=deck.name; refresh(); saveNow();
}

/* ---------- undo ---------- */
function snap(){ return JSON.stringify({n:deck.name, th:deck.theme, s:deck.slides, c:cur, f:deck.footer, nm:deck.nums, fo:deck.font, tr:deck.trans}); }
function pushUndo(s){ undo.push(s||snap()); if(undo.length>100) undo.shift(); redo=[]; updUR(); }
function restore(j){ var o=JSON.parse(j); deck.name=o.n; deck.theme=o.th; deck.footer=o.f||''; deck.nums=!!o.nm; deck.font=o.fo||''; deck.trans=o.tr||'fade'; deck.slides=o.s.map(fixSlide); cur=Math.max(0,Math.min(o.c,deck.slides.length-1)); $('deckName').value=deck.name; refresh(); saveSoon(); }
function doUndo(){ blurEdit(); if(!undo.length||gen||busyOn) return; redo.push(snap()); restore(undo.pop()); updUR(); }
function doRedo(){ blurEdit(); if(!redo.length||gen||busyOn) return; undo.push(snap()); restore(redo.pop()); updUR(); }
function updUR(){ $('undoBtn').disabled=!undo.length||gen||busyOn; $('redoBtn').disabled=!redo.length||gen||busyOn; }

/* ---------- drawing a slide ---------- */
var CE=(function(){ var d=document.createElement('div'); try{ d.contentEditable='plaintext-only'; if(d.contentEditable==='plaintext-only') return 'plaintext-only'; }catch(e){} return 'true'; })();
function empty(s,f){ var v=s[f]; return Array.isArray(v)?!v.length:!String(v||'').trim(); }
var MONO="'D2Coding','Consolas','Courier New',monospace";
function cssVars(th){ return '--s-bg:'+th.bg+';--s-fg:'+th.fg+';--s-sub:'+th.sub+';--s-ac:'+th.ac+';--s-card:'+mix(th.bg,th.fg,.08)+';--s-on:'+onAc(th)+';--s-head:'+(th.mono?MONO:th.serif?SERIF:SANS)+';--s-body:'+(th.mono?MONO:SANS)+';--s-hw:'+(th.serif?700:800); }
function onAc(th){ return lum(th.ac)>.4?'#111111':'#ffffff'; }
function fillList(ul,items){ ul.innerHTML=''; (items.length?items:['']).forEach(function(t){ var li=document.createElement('li'); if(t) li.textContent=t; else li.appendChild(document.createElement('br')); ul.appendChild(li); }); ul.classList.toggle('ph',!items.length); }
function slideEl(s,th,edit,opt){
  th=eth(s,th); opt=opt||{};
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
    if(b.view){ el.appendChild(dataView(s,b,th)); return; }
    if(b.cls==='ans'&&opt.hideAns) return;
    var box=document.createElement('div'); box.className='fld k-'+b.k+(b.cls==='ans'?' ans':''); box.dataset.f=b.f;
    box.style.cssText='left:'+b.x+'px;top:'+b.y+'px;width:'+b.w+'px;height:'+b.h+'px;justify-content:'+(b.va||'flex-start')+';text-align:'+(b.al||'left')+';';
    var inn=document.createElement(b.list?'ul':'div'); inn.className='in'+(b.list&&b.cls?' '+b.cls:'');
    if(b.list) fillList(inn,s[b.f]); else { inn.textContent=(opt.over&&opt.over[b.f]!=null?opt.over[b.f]:s[b.f])||''; if(em) inn.classList.add('ph'); }
    if(edit){ inn.contentEditable=b.list?'true':CE; inn.spellcheck=false; inn.setAttribute('data-ph',T(ph(b.f,s.layout))); inn.setAttribute('autocapitalize','sentences'); }
    box.appendChild(inn); el.appendChild(box);
  });
  footOf(s,th).forEach(function(f){ var e=document.createElement('div'); e.className='ft'; e.textContent=f.t;
    e.style.cssText='left:'+f.x+'px;top:'+f.y+'px;width:'+f.w+'px;height:'+f.h+'px;font-size:'+f.fs+'px;color:'+f.c+';text-align:'+f.al+';'; el.appendChild(e); });
  return el;
}
/* tables and charts from pasted text (HTML/SVG on screen, native table and chart in the .pptx) */
function esc(t){ return String(t).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function parseTable(t){ var L=String(t||'').replace(/\r/g,'').split('\n').filter(function(x){ return x.trim(); }).slice(0,9); if(!L.length) return [];
  var sep=L.some(function(x){ return x.indexOf('\t')>=0; })?'\t':L.some(function(x){ return x.indexOf('|')>=0; })?'|':',';
  var R=L.map(function(x){ x=x.trim(); if(sep==='|') x=x.replace(/^\|/,'').replace(/\|$/,''); return x.split(sep).slice(0,6).map(function(c){ return c.trim(); }); });
  var n=Math.max.apply(null,R.map(function(r){ return r.length; })); R.forEach(function(r){ while(r.length<n) r.push(''); }); return R; }
function parseChart(t){ var o=[]; String(t||'').replace(/\r/g,'').split('\n').forEach(function(l){ l=l.trim(); if(!l||o.length>=12) return;
  var m=/^(.*?)\s*[:：\t=,]\s*(-?\d[\d,]*(?:\.\d+)?)\s*(\S*)$/.exec(l)||/^(.*\S)\s+(-?\d[\d,]*(?:\.\d+)?)\s*(\S*)$/.exec(l); if(!m) return;
  var v=parseFloat(m[2].replace(/,/g,'')); if(isNaN(v)) return; o.push({l:m[1].trim()||String(o.length+1), v:v, s:m[2]+m[3]}); }); return o; }
function tableFS(nr){ return Math.max(14,Math.min(28,Math.floor(380/(nr*1.8)))); }
function rowBg(th,ri){ return ri%2?mix(th.bg,th.fg,.08):th.bg; }
var CPAL=['#3d7fe0','#ff8a3d','#2fb27a','#e0526b','#8a5ce0','#e0b93c','#3db5e0','#a0a7b8'];
function chartCols(th){ return [th.ac].concat(CPAL.filter(function(c){ return c!==th.ac; })); }
function clip(t,wpx,fs){ var w=0, o=''; for(var i=0;i<t.length;i++){ var c=t.charCodeAt(i), cw=(c>0x2e80?1:.56)*fs; if(w+cw>wpx){ return o.replace(/\s+$/,'')+'…'; } w+=cw; o+=t[i]; } return o; }
function dataView(s,b,th){
  var d=document.createElement('div'), em=empty(s,'data'); d.className='dv'+(em?' empty':''); d.dataset.f='data';
  d.style.cssText='left:'+b.x+'px;top:'+b.y+'px;width:'+b.w+'px;height:'+b.h+'px;color:'+th.fg+';';
  if(em){ d.textContent=(b.view==='chart'?'📊  '+T('그래프 만들기'):'▦  '+T('표 만들기')); return d; }
  if(b.view==='table'){ var R=parseTable(s.data), fs=tableFS(R.length), rh=Math.min(64,Math.floor(b.h/R.length)), t=document.createElement('table');
    t.style.cssText='width:100%;border-collapse:collapse;table-layout:fixed;font-size:'+fs+'px;';
    R.forEach(function(r,ri){ var tr=document.createElement('tr'); tr.style.height=rh+'px'; r.forEach(function(c){ var td=document.createElement(ri?'td':'th'); td.textContent=c;
      td.style.cssText='padding:4px 14px;border:1px solid '+mix(th.bg,th.fg,.28)+';text-align:'+(ri?'left':'center')+';vertical-align:middle;word-break:keep-all;overflow-wrap:anywhere;font-weight:'+(ri?400:800)+';background:'+(ri?rowBg(th,ri):th.ac)+';color:'+(ri?th.fg:onAc(th))+';';
      tr.appendChild(td); }); t.appendChild(tr); }); d.appendChild(t); return d; }
  var rows=parseChart(s.data); if(!rows.length){ d.className+=' empty'; d.textContent='📊  '+T('숫자를 한 줄에 하나씩 써 주세요'); return d; }
  d.innerHTML=chartSVG(rows,s.ctype,th,b.w,b.h); return d; }
function chartSVG(rows,type,th,w,h){
  var n=rows.length, cols=chartCols(th), o='<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" xmlns="http://www.w3.org/2000/svg" style="display:block;font-family:inherit">', fg=th.fg;
  var tx=function(x,y,t,fs,a,wt,c){ return '<text x="'+x+'" y="'+y+'" font-size="'+fs+'" text-anchor="'+(a||'middle')+'" font-weight="'+(wt||400)+'" fill="'+(c||fg)+'">'+esc(t)+'</text>'; };
  if(type==='pie'){ var P=rows.filter(function(r){ return r.v>0; }), tot=P.reduce(function(a,r){ return a+r.v; },0)||1, r0=Math.min(h/2-12,w*.3), cx=r0+24, cy=h/2, ang=-Math.PI/2;
    if(P.length===1) o+='<circle cx="'+cx+'" cy="'+cy+'" r="'+r0+'" fill="'+cols[0]+'"/>';
    else P.forEach(function(r,i){ var a2=ang+r.v/tot*Math.PI*2, big=a2-ang>Math.PI?1:0;
      o+='<path d="M'+cx+' '+cy+' L'+(cx+r0*Math.cos(ang))+' '+(cy+r0*Math.sin(ang))+' A'+r0+' '+r0+' 0 '+big+' 1 '+(cx+r0*Math.cos(a2))+' '+(cy+r0*Math.sin(a2))+' Z" fill="'+cols[i%cols.length]+'" stroke="'+th.bg+'" stroke-width="3"/>'; ang=a2; });
    var lh=Math.min(48,(h-16)/Math.max(1,P.length)), lf=Math.max(14,Math.min(28,lh*.58)), lx=cx+r0+56;
    P.forEach(function(r,i){ var y=h/2-lh*P.length/2+lh*i+lh/2; o+='<rect x="'+lx+'" y="'+(y-lf*.45)+'" width="'+lf*.9+'" height="'+lf*.9+'" rx="4" fill="'+cols[i%cols.length]+'"/>'+
      tx(lx+lf*1.4,y+lf*.35,clip(r.l,w-lx-lf*1.4-170,lf)+'  '+r.s+' ('+Math.round(r.v/tot*100)+'%)',lf,'start'); }); return o+'</svg>'; }
  var top=46, bot=70, padL=16, ph=h-top-bot, slot=(w-padL*2)/n, lf=n>8?16:n>5?20:24, vf=lf+2;
  var vals=rows.map(function(r){ return r.v; }), mx=Math.max.apply(null,vals.concat([0])), mn=type==='line'?Math.min.apply(null,vals.concat([0])):0; if(mx===mn) mx=mn+1;
  var Y=function(v){ return top+ph-(Math.max(mn,v)-mn)/(mx-mn)*ph; };
  o+='<line x1="'+padL+'" x2="'+(w-padL)+'" y1="'+Y(0)+'" y2="'+Y(0)+'" stroke="'+mix(th.bg,fg,.35)+'" stroke-width="2"/>';
  if(type==='line'){ var pts=rows.map(function(r,i){ return (padL+slot*(i+.5))+','+Y(r.v); }).join(' '); o+='<polyline points="'+pts+'" fill="none" stroke="'+cols[0]+'" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>'; }
  rows.forEach(function(r,i){ var cx=padL+slot*(i+.5);
    if(type==='line'){ o+='<circle cx="'+cx+'" cy="'+Y(r.v)+'" r="9" fill="'+cols[0]+'" stroke="'+th.bg+'" stroke-width="3"/>'+tx(cx,Y(r.v)-18,r.s,vf,'middle',700); }
    else { var bw=Math.min(160,slot*.62), y=Y(r.v); o+='<rect x="'+(cx-bw/2)+'" y="'+y+'" width="'+bw+'" height="'+Math.max(2,Y(0)-y)+'" rx="8" fill="'+cols[0]+'"/>'+tx(cx,y-12,r.s,vf,'middle',700); }
    o+=tx(cx,h-bot+lf+22,clip(r.l,slot-8,lf),lf,'middle',400,th.sub); });
  return o+'</svg>'; }
/* slide number and footer text (not on the title and closing slides); shared by screen, print and .pptx */
function footOf(s,th){ var i=deck?deck.slides.indexOf(s):-1, o=[]; if(i<0||s.layout==='title'||s.layout==='closing') return o;
  if(deck.footer) o.push({t:deck.footer, x:90, y:664, w:900, h:20, fs:15, c:th.sub, al:'left'});
  if(deck.nums) o.push({t:String(i+1), x:1090, y:664, w:100, h:20, fs:15, c:th.sub, al:'right'}); return o; }
function boxDef(lay,f){ var L=LAY[lay]||LAY.bullets; for(var i=0;i<L.length;i++) if(L[i].f===f) return L[i]; return null; }
/* shrink the font until the text fits its box (results cached by content) */
var fitCache=new Map();
function fitBox(box,b,th,lay,fresh){
  var inn=box.firstChild, txt=inn.classList.contains('ph')?'\u0000'+inn.getAttribute('data-ph'):inn.innerText, key=th.id+(th.f||'')+'|'+lay+'|'+b.f+'|'+txt;
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
function th(){ return withFont(themeOf(deck.theme),deck.font); }
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
    var d=document.createElement('div'); d.className='thumb'+(i===cur?' on':'')+(s.hide?' hid':''); d.dataset.i=i;
    d.innerHTML='<div class="no"><span>'+(i+1)+'</span><span class="grip" title="'+T('끌어서 순서 바꾸기')+'">⋮⋮</span></div><div class="tv">'+(s.hide?'<i class="hb" title="'+T('발표할 때 건너뛰어요')+'">⊘</i>':'')+'</div>'+
      (i===cur&&!gen?'<span class="mv"><button data-mv="-1" title="'+T('앞으로')+'"'+(i===0?' disabled':'')+'>↑</button><button data-mv="1" title="'+T('뒤로')+'"'+(i===deck.slides.length-1?' disabled':'')+'>↓</button></span>':'');
    var el=slideEl(s,t,false); d.querySelector('.tv').appendChild(el); l.appendChild(d); fitAll(el,s,t);
  });
  if(!gen){ var a=document.createElement('button'); a.className='addSl'; a.id='addSl'; a.title=T('새 슬라이드'); a.innerHTML='<b>+</b>'; l.appendChild(a); }
}
function updateThumb(i){ var d=$('list').querySelector('.thumb[data-i="'+i+'"]'), s=deck.slides[i]; if(!d||!s) return; var tv=d.querySelector('.tv'), t=th(); tv.innerHTML=''; d.classList.toggle('hid',!!s.hide); if(s.hide) tv.innerHTML='<i class="hb" title="'+T('발표할 때 건너뛰어요')+'">⊘</i>'; var el=slideEl(s,t,false); tv.appendChild(el); fitAll(el,s,t); }
var thumbT=null; function thumbSoon(i){ clearTimeout(thumbT); thumbT=setTimeout(function(){ updateThumb(i); },250); }
function drawMain(){
  var host=$('slideHost'), s=deck.slides[cur], t=th(); host.innerHTML='';
  $('waitMsg').hidden=!!s; $('waitMsg').textContent=gen?T('AI가 발표 자료를 쓰고 있어요…'):'';
  host.hidden=!s;
  ['dupBtn','delBtn','laySel','aiBtn','addBtn','themeBtn','notes','picBtn','optBtn','sortBtn'].forEach(function(id){ $(id).disabled=!s||gen||busyOn||(id==='aiBtn'&&AILAYS.indexOf(s.layout)<0); });
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
  if((lay==='bullets'||lay==='agenda'||lay==='timeline')&&!s.bullets.length) s.bullets=s.left.concat(s.right);
  if(lay==='quiz'&&!s.quote&&s.title&&s.layout!=='quote'){ s.quote=s.title; s.title=''; }
  if(lay==='timer'&&!s.stat) s.stat='5:00';
  if(lay==='quote'&&!s.quote&&s.layout!=='quote'&&s.title){ s.quote=s.title; }
  if(lay==='stat'&&!s.caption&&s.bullets.length) s.caption=s.bullets[0];
  s.layout=lay; changed(); if(lay==='image'&&!s.img) pickImage(); else if((lay==='table'||lay==='chart')&&!s.data.trim()) openData(); }
function setTheme(id){ if(deck.theme===id) return; blurEdit(); if(deck.slides.length) pushUndo(); deck.theme=id; saveSoon(); if(deck.slides.length){ drawList(); drawMain(); } else drawStart(); drawThemes(); }
$('undoBtn').onclick=doUndo; $('redoBtn').onclick=doRedo;
$('addBtn').onclick=function(){ addSlide('bullets'); };
$('dupBtn').onclick=dupSlide; $('delBtn').onclick=delSlide;

/* ---------- slide options: skip when presenting, background colour, order, deck font and transition ---------- */
var BGS=['#ffffff','#fff4c2','#ffe0e0','#dcecff','#dcf5e3','#2b2b3a','#0b3954'], TRANS=[['fade','부드럽게 나타나기'],['slide','옆으로 밀기'],['zoom','커지며 나타나기'],['none','효과 없음']];
function toggleHide(){ var s=deck.slides[cur]; if(!s||gen||busyOn) return; blurEdit(); pushUndo(); s.hide=!s.hide; changed(true); toast(s.hide?T('발표할 때 이 슬라이드를 건너뛰어요'):T('이 슬라이드를 다시 보여 줘요')); }
function setBg(c){ var s=deck.slides[cur]; if(!s) return; blurEdit(); pushUndo(); s.bg=c; changed(); }
function setFont(f){ if(deck.font===f) return; blurEdit(); pushUndo(); deck.font=f; fitCache.clear(); changed(true); }
function setTrans(t){ if(deck.trans===t) return; pushUndo(); deck.trans=t; saveSoon(); }
function drawOptMenu(){ var m=$('optMenu'), s=deck.slides[cur]; m.innerHTML=''; if(!s) return;
  var add=function(k,txt,on,dis){ var b=document.createElement('button'); b.dataset.o=k; b.textContent=(on?'✓ ':'')+T(txt); if(dis) b.disabled=true; m.appendChild(b); return b; };
  var hd=function(txt){ var d=document.createElement('div'); d.className='mh'; d.textContent=T(txt); m.appendChild(d); };
  add('hide',s.hide?'숨긴 슬라이드 보이기 (H)':'발표할 때 건너뛰기 (H)');
  if(s.layout==='table'||s.layout==='chart') add('data',s.layout==='chart'?'그래프 내용 고치기':'표 내용 고치기');
  add('first','맨 앞으로 보내기',0,cur===0); add('last','맨 뒤로 보내기',0,cur===deck.slides.length-1);
  m.appendChild(document.createElement('hr')); hd('이 슬라이드 배경색');
  var row=document.createElement('div'); row.className='swr';
  BGS.forEach(function(c){ var b=document.createElement('button'); b.className='sw'+(s.bg===c?' on':''); b.dataset.o='bg:'+c; b.style.background=c; b.setAttribute('aria-label',c); row.appendChild(b); });
  var ci=document.createElement('input'); ci.type='color'; ci.id='bgIn'; ci.value=s.bg||'#ffffff'; ci.title=T('직접 고르기'); ci.setAttribute('aria-label',T('직접 고르기')); row.appendChild(ci);
  m.appendChild(row); add('bg:','테마 배경으로 되돌리기',0,!s.bg);
  m.appendChild(document.createElement('hr')); hd('글꼴 (모든 슬라이드)');
  FONTS.forEach(function(f){ add('font:'+f[0],f[1],deck.font===f[0]); });
  m.appendChild(document.createElement('hr')); hd('넘어가는 효과 (발표할 때)');
  TRANS.forEach(function(t){ add('tr:'+t[0],t[1],deck.trans===t[0]); });
  ci.addEventListener('input',function(){ var s=deck.slides[cur]; if(s){ s.bg=ci.value; updateThumb(cur); drawMain(); saveSoon(); } });
  ci.addEventListener('change',function(){ closeMenus(); });
  ci.addEventListener('pointerdown',function(){ if(!ci._u){ ci._u=1; pushUndo(); } });
}
$('optBtn').onclick=function(){ if(!deck.slides.length) return; blurEdit(); drawOptMenu(); openMenu($('optMenu'),this); };
$('optMenu').addEventListener('click',function(e){ var b=e.target.closest('[data-o]'); if(!b||b.disabled) return; var k=b.dataset.o; closeMenus();
  if(k==='hide') toggleHide(); else if(k==='data') openData(); else if(k==='first') moveSlide(cur,0); else if(k==='last') moveSlide(cur,deck.slides.length-1);
  else if(k.indexOf('bg:')===0) setBg(k.slice(3)); else if(k.indexOf('font:')===0) setFont(k.slice(5)); else if(k.indexOf('tr:')===0){ setTrans(k.slice(3)); toast(T('저장했어요')); } });

/* table and chart data: one text box, the slide draws it */
function openData(){ var s=deck.slides[cur]; if(!s||(s.layout!=='table'&&s.layout!=='chart')||gen||busyOn) return; var ch=s.layout==='chart'; blurEdit();
  $('dataTitle').textContent=ch?T('그래프 내용'):T('표 내용');
  $('dataNote').textContent=ch?T('한 줄에 하나씩 "이름: 숫자"로 써요. 예) 사과: 12 (12줄까지)'):T('한 줄이 한 행이고, 칸은 쉼표·탭·|로 나눠요. 첫 줄은 제목 줄이에요. (9줄, 6칸까지)');
  $('dataIn').placeholder=ch?T('사과: 12\n바나나: 7\n포도: 9'):T('이름, 점수, 등수\n하늘, 92, 1\n바다, 88, 2');
  $('dataIn').value=s.data; $('dataTypeRow').hidden=!ch; $('dataType').value=s.ctype; openDlg('dataDlg'); setTimeout(function(){ $('dataIn').focus(); },60); }
$('dataOk').onclick=function(){ var s=deck.slides[cur]; if(!s) return closeDlg('dataDlg',null); pushUndo(); s.data=$('dataIn').value.replace(/\r/g,'').trim(); s.ctype=$('dataType').value; closeDlg('dataDlg',null); changed(); };
$('dataIn').addEventListener('keydown',function(e){ e.stopPropagation(); if(e.key==='Escape') closeDlg('dataDlg',null); });
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
document.addEventListener('pointerdown',function(e){ if(!e.target.closest('.menu')&&!e.target.closest('#deckBtn,#aiBtn,#themeBtn,#optBtn')) closeMenus(); },true);
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
$('newDeckBtn').onclick=function(){ if(gen) return toast(T('AI가 다 만들 때까지 기다려 주세요')); blurEdit(); newDeckAction(); };
$('mgrBtn').onclick=function(){ if(gen) return toast(T('AI가 다 만들 때까지 기다려 주세요')); blurEdit(); openMgr(); };
$('delDeckBtn').onclick=function(){ if(gen) return toast(T('AI가 다 만들 때까지 기다려 주세요')); blurEdit(); deleteDeck(deck); };
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
/* the AI dialogs (data-xonly) close only with their own buttons; a click on the dark area must not throw away what was typed */
document.querySelectorAll('.ov').forEach(function(o){ o.addEventListener('click',function(e){ if((e.target===o&&!o.hasAttribute('data-xonly'))||e.target.closest('[data-close]')) closeDlg(o.id,null); }); });
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
function blankSlide(s){ return LISTS.concat(TEXTS).every(function(f){ return f==='ctype'||f==='bg'||empty(s,f); }); }
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
  if(e.target.closest('.pic.empty')) pickImage();
  else if(e.target.closest('.dv')) openData(); });
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
  deck.slides.forEach(function(s,i){ if(s.hide) return; var L=[], hd=(s.layout==='title'&&i===0)?'# ':(s.layout==='section'?'# ':'## ');
    var title=s.title||(s.layout==='quote'?'':s.stat)||''; if(title||s.layout!=='quote') L.push(hd+title);
    if(s.subtitle) L.push('',s.subtitle.replace(/\n/g,' '));
    if(s.bullets.length) L.push('',s.bullets.map(function(x){ return '- '+x; }).join('\n'));
    if(s.layout==='table'){ var R=parseTable(s.data); if(R.length){ L.push('','| '+R[0].join(' | ')+' |','|'+R[0].map(function(){ return ' --- |'; }).join('')); R.slice(1).forEach(function(r){ L.push('| '+r.join(' | ')+' |'); }); } }
    if(s.layout==='chart'){ var C0=parseChart(s.data); if(C0.length) L.push('',C0.map(function(r){ return '- '+r.l+': '+r.s; }).join('\n')); }
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
var KEYS=[['Ctrl+Z / Ctrl+Shift+Z','되돌리기 · 다시 하기'],['↑ ↓ ← →','슬라이드 이동'],['Ctrl+D','슬라이드 복제'],['Ctrl+Enter','새 슬라이드 넣기'],['Alt+↑ Alt+↓','슬라이드 순서 바꾸기'],['H','발표할 때 건너뛰기 켜고 끄기'],['Delete','슬라이드 지우기'],['Home End','첫·마지막 슬라이드'],['Ctrl+Alt+N','새 슬라이드 쇼 만들기'],['F5','처음부터 발표'],['Shift+F5','지금 슬라이드부터 발표'],['?','이 단축키 목록'],
  ['→ Space Enter','(발표) 다음'],['← Backspace','(발표) 이전'],['Home End','(발표) 처음 · 끝'],['S','(발표) 발표자 메모 보기'],['V','(발표) 발표자 화면 새 창으로 열기'],['L','(발표) 레이저 포인터'],['D · M · E','(발표) 펜 · 형광펜 · 낙서 지우기'],['B','(발표) 화면 끄기'],['숫자 + Enter','(발표) 그 번호 슬라이드로'],['A','(발표) 퀴즈 정답 보기'],['T','(발표) 타이머 멈춤·다시'],['Esc','(발표) 나가기']];
function showKeys(){ var b=$('keysBody'); b.innerHTML=''; KEYS.forEach(function(k){ var r=document.createElement('div'); r.className='kr'; var a=document.createElement('kbd'); a.textContent=k[0]; var t=document.createElement('span'); t.textContent=T(k[1]); r.appendChild(a); r.appendChild(t); b.appendChild(r); }); openDlg('keysDlg'); }

/* ---------- presenting ---------- */
var pr={on:false, i:0, end:false, fs:false, notes:false, laser:false, black:false, t0:0, tm:null, cd:null, shown:-1, rev:-1, go:'', goT:null};
function beep(){ try{ var C=window.AudioContext||window.webkitAudioContext, c=new C(), o=c.createOscillator(), g=c.createGain(); o.connect(g); g.connect(c.destination); g.gain.value=.15; o.frequency.value=880; o.start(); o.stop(c.currentTime+.5); setTimeout(function(){ c.close(); },900); }catch(e){} }
function cdPaint(){ if(!pr.cd) return; var f=$('pStage').querySelector('.fld[data-f="stat"] .in'); if(f){ f.textContent=fmtTime(pr.cd.left); f.style.color=pr.cd.left===0?'#ff5a5a':''; } }
function tick(){ var t=Math.floor((Date.now()-pr.t0)/1000), m=Math.floor(t/60); $('pClock').textContent='⏱ '+(m<10?'0':'')+m+':'+('0'+(t%60)).slice(-2);
  if(pr.on&&pr.cd&&pr.cd.run&&pr.cd.left>0){ pr.cd.left--; cdPaint(); if(pr.cd.left===0){ beep(); toast(T('시간이 다 됐어요')); } } }
function vis(i){ var s=deck.slides[i]; return !!s&&!s.hide; }
function nextVis(i,d){ for(var j=i+d;j>=0&&j<deck.slides.length;j+=d) if(vis(j)) return j; return -1; }
function present(from){
  blurEdit(); closeMenus(); if(!deck.slides.length) return;
  if(!deck.slides.some(function(s){ return !s.hide; })) return toast(T('모든 슬라이드를 숨겨서 발표할 수 없어요'));
  from=Math.max(0,Math.min(from||0,deck.slides.length-1)); if(!vis(from)){ var j=nextVis(from,1); from=j>=0?j:nextVis(from,-1); }
  pr.on=true; pr.i=from; pr.end=false; pr.black=false; pr.cd=null; pr.shown=-1; pr.rev=-1; pr.go=''; inkKey=-1; setInk(''); inkClear(); pr.t0=Date.now(); clearInterval(pr.tm); pr.tm=setInterval(tick,1000); tick(); pvDeck();
  var el=$('present'); el.classList.add('on'); setLaser(false); drawPresent();
  try{ var fn=el.requestFullscreen||el.webkitRequestFullscreen; if(fn){ var p=fn.call(el); pr.fs=true; if(p&&p.catch) p.catch(function(){ pr.fs=false; }); } }catch(e){ pr.fs=false; }
}
function drawPresent(){ drawPresent0(); pvState(); }
function drawPresent0(){
  var ik=pr.end?-2:pr.i; if(inkKey!==ik){ inkKey=ik; inkClear(); }
  var st=$('pStage'), n=deck.slides.length; st.innerHTML=''; $('pEnd').hidden=!pr.end; st.hidden=pr.end; st.style.visibility=pr.black?'hidden':'';
  $('pNum').textContent=pr.end?n+' / '+n:(pr.i+1)+' / '+n; $('pProg').firstChild.style.width=(pr.end?100:Math.round((pr.i+1)/n*100))+'%';
  var sl=pr.end?null:deck.slides[pr.i], nt=$('pNotes'); nt.textContent=sl?sl.notes||'':''; nt.hidden=!(pr.notes&&sl&&sl.notes&&sl.notes.trim()); $('pNotesB').classList.toggle('on',pr.notes);
  if(pr.end) return; var t=th(), moved=pr.shown!==pr.i;
  if(moved){ var tm=sl.layout==='timer'?parseTime(sl.stat):null; pr.cd=tm==null?null:{left:tm,total:tm,run:true}; }
  var opt={hideAns:sl.layout==='quiz'&&pr.rev!==pr.i}; if(pr.cd&&sl.layout==='timer') opt.over={stat:fmtTime(pr.cd.left)};
  var el=slideEl(sl,t,false,opt); st.appendChild(el); fitAll(el,sl,t); scalePresent(); inkFit(); cdPaint();
  if(moved&&deck.trans!=='none'){ st.className='tf-'+deck.trans; void st.offsetWidth; } else st.className='';
  pr.shown=pr.i;
}
function setLaser(on){ if(on&&ink.tool) setInk(''); pr.laser=on; $('present').classList.toggle('laser',on); $('pLaserB').classList.toggle('on',on); if(!on) $('pDot').hidden=true; }
function setNotesView(on){ pr.notes=on; drawPresent(); }
function setBlack(on){ pr.black=on; drawPresent(); }
function scalePresent(){ var st=$('pStage'), k=Math.min(innerWidth/W,innerHeight/H); st.style.width=W*k+'px'; st.style.height=H*k+'px'; var el=st.firstChild; if(el) el.style.transform='scale('+k+')'; }
function pNext(){ if(pr.end) return exitPresent(); var cs=deck.slides[pr.i];
  if(cs&&cs.layout==='quiz'&&pr.rev!==pr.i&&cs.caption.trim()){ pr.rev=pr.i; drawPresent(); return; }
  var j=nextVis(pr.i,1); if(j>=0) pr.i=j; else pr.end=true; drawPresent(); }
function pPrev(){ if(pr.end){ pr.end=false; pr.shown=-1; } else { var j=nextVis(pr.i,-1); if(j>=0) pr.i=j; } drawPresent(); }
function pHome(){ pr.end=false; var f=vis(0)?0:nextVis(0,1); pr.i=f<0?0:f; drawPresent(); }
function pLast(){ pr.end=false; var L=deck.slides.length-1, la=vis(L)?L:nextVis(L,-1); pr.i=la<0?L:la; drawPresent(); }
function pAns(){ pr.rev=pr.rev===pr.i?-1:pr.i; drawPresent(); }
function pGo(){ var n=+pr.go; pr.go=''; clearTimeout(pr.goT); if(!n) return drawPresent(); var i=Math.max(0,Math.min(n-1,deck.slides.length-1)); if(!vis(i)){ var j=nextVis(i,1); i=j>=0?j:nextVis(i,-1); } pr.end=false; pr.i=i; drawPresent(); }
function exitPresent(){ if(!pr.on) return; pr.on=false; pvPost({type:'exit'}); setInk(''); inkClear(); clearInterval(pr.tm); clearTimeout(pr.goT); pr.go=''; setLaser(false); $('present').classList.remove('on');
  try{ var fe=document.fullscreenElement||document.webkitFullscreenElement; if(fe){ (document.exitFullscreen||document.webkitExitFullscreen).call(document); } }catch(e){}
  if(!pr.end) select(pr.i); }
['fullscreenchange','webkitfullscreenchange'].forEach(function(ev){ document.addEventListener(ev,function(){ if(pr.on&&pr.fs&&!(document.fullscreenElement||document.webkitFullscreenElement)) exitPresent(); }); });
window.addEventListener('resize',function(){ if(pr.on){ scalePresent(); inkFit(); } });
var pd=null;
$('present').addEventListener('pointerdown',function(e){ if(e.target.closest('.pbar')||e.target.id==='pInk') return; pd={x:e.clientX,y:e.clientY}; });
$('present').addEventListener('pointermove',function(e){ if(!pr.laser||(e.pointerType==='touch'&&!pd)) return; var d=$('pDot'); d.hidden=false; d.style.left=e.clientX+'px'; d.style.top=e.clientY+'px'; });
$('present').addEventListener('pointerleave',function(e){ if(e.pointerType!=='touch') $('pDot').hidden=true; });
$('present').addEventListener('pointerup',function(e){ if(e.pointerType==='touch') $('pDot').hidden=true; if(!pd||e.target.closest('.pbar')){ pd=null; return; } var dx=e.clientX-pd.x, dy=e.clientY-pd.y; pd=null;
  if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)){ if(dx<0) pNext(); else pPrev(); }
  else if(Math.abs(dx)<12&&Math.abs(dy)<12){ if(pr.black){ setBlack(false); return; } if(pr.laser&&e.pointerType==='touch') return; if(e.clientX<innerWidth*0.3) pPrev(); else pNext(); } });
$('pNotesB').onclick=function(){ setNotesView(!pr.notes); }; $('pLaserB').onclick=function(){ setLaser(!pr.laser); };
/* pen and highlighter: strokes live on a canvas over the slide, stored relative to the slide so they survive resizing, and are dropped on the next slide */
var ink={tool:'', pc:'#ff3b3b', hc:'#ffe14d', strokes:[], cur:null}, inkKey=-2, INKC={pen:['#ff3b3b','#2f7bff','#22c55e','#ffffff','#111111'], hi:['#ffe14d','#7cf58a','#ff9ad5','#6fd6ff']};
function inkFit(){ var c=$('pInk'), d=window.devicePixelRatio||1, w=Math.max(1,Math.round(innerWidth*d)), h=Math.max(1,Math.round(innerHeight*d)); if(c.width!==w||c.height!==h){ c.width=w; c.height=h; } inkDraw(); }
function inkDraw(){ var c=$('pInk'), x=c.getContext('2d'), d=window.devicePixelRatio||1, r=$('pStage').getBoundingClientRect(), k=r.width/W; x.setTransform(1,0,0,1,0,0); x.clearRect(0,0,c.width,c.height); x.setTransform(d,0,0,d,0,0);
  x.lineCap='round'; x.lineJoin='round';
  ink.strokes.concat(ink.cur?[ink.cur]:[]).forEach(function(s){ if(!s.p.length) return; x.globalAlpha=s.t==='hi'?.4:1; x.strokeStyle=s.c; x.lineWidth=(s.t==='hi'?30:5)*k; x.beginPath();
    x.moveTo(r.left+s.p[0][0]*r.width,r.top+s.p[0][1]*r.height); if(s.p.length===1) x.lineTo(r.left+s.p[0][0]*r.width+.01,r.top+s.p[0][1]*r.height); else for(var i=1;i<s.p.length;i++) x.lineTo(r.left+s.p[i][0]*r.width,r.top+s.p[i][1]*r.height); x.stroke(); });
  x.globalAlpha=1; }
function inkClear(){ ink.strokes=[]; ink.cur=null; $('pClrB').hidden=!ink.tool; inkDraw(); }
function inkCols(){ var b=$('pInkCols'); b.innerHTML=''; if(!ink.tool) return; var key=ink.tool==='hi'?'hc':'pc'; INKC[ink.tool].forEach(function(c){ var s=document.createElement('button'); s.className='ink-c'+(ink[key]===c?' on':''); s.style.background=c; s.setAttribute('aria-label',c); s.onclick=function(e){ e.stopPropagation(); ink[key]=c; inkCols(); }; b.appendChild(s); }); }
function setInk(t){ if(ink.tool===t) t=''; ink.tool=t; ink.cur=null; if(t) setLaser(false); $('present').classList.toggle('ink',!!t); $('pPenB').classList.toggle('on',t==='pen'); $('pHiB').classList.toggle('on',t==='hi'); $('pClrB').hidden=!t; inkCols(); inkDraw(); }
(function(){ var c=$('pInk'), pid=null;
  var pt=function(e){ var r=$('pStage').getBoundingClientRect(); return [(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height]; };
  c.addEventListener('pointerdown',function(e){ if(!ink.tool||(e.button&&e.pointerType==='mouse')) return; e.preventDefault(); pid=e.pointerId; try{ c.setPointerCapture(pid); }catch(err){}
    ink.cur={t:ink.tool, c:ink.tool==='hi'?ink.hc:ink.pc, p:[pt(e)]}; inkDraw(); });
  c.addEventListener('pointermove',function(e){ if(!ink.cur||e.pointerId!==pid) return; e.preventDefault(); (e.getCoalescedEvents?e.getCoalescedEvents():[e]).forEach(function(q){ ink.cur.p.push(pt(q)); }); inkDraw(); });
  var end=function(e){ if(!ink.cur||e.pointerId!==pid) return; ink.strokes.push(ink.cur); ink.cur=null; pid=null; inkDraw(); };
  c.addEventListener('pointerup',end); c.addEventListener('pointercancel',end);
})();
$('pPenB').onclick=function(){ setInk('pen'); }; $('pHiB').onclick=function(){ setInk('hi'); }; $('pClrB').onclick=inkClear;
$('pPrev').onclick=pPrev; $('pNext').onclick=pNext; $('pExit').onclick=exitPresent;
$('playBtn').onclick=function(){ present(0); };

/* ---------- presenter view: a second window (same page, #presenter) that shows the current and next slide, the notes and a timer.
   The two windows talk over a BroadcastChannel (same browser only): the presenting window sends the deck and its position, the presenter window sends back next / previous. ---------- */
var bc=null; try{ bc=new BroadcastChannel('ffslides.presenter'); }catch(e){}
function pvPost(m){ if(bc&&!MODE){ try{ bc.postMessage(m); }catch(e){} } }
function pvDeck(){ if(bc&&!MODE) pvPost({type:'deck', deck:JSON.parse(JSON.stringify(deck))}); }
function pvState(){ if(pr.on) pvPost({type:'state', id:deck.id, i:pr.i, end:pr.end, rev:pr.rev, black:pr.black, t0:pr.t0}); }
if(bc&&!MODE) bc.onmessage=function(e){ var m=e.data||{}; if(m.type==='hello'){ if(pr.on){ pvDeck(); pvState(); } else pvPost({type:'idle'}); return; }
  if(m.type!=='cmd'||!pr.on) return; var c=m.cmd;
  if(c==='next') pNext(); else if(c==='prev') pPrev(); else if(c==='home') pHome(); else if(c==='last') pLast(); else if(c==='ans') pAns(); else if(c==='black') setBlack(!pr.black); else if(c==='exit') exitPresent(); };
function openPV(){ if(!deck.slides.length||gen) return; var w=null; try{ w=window.open(location.href.split('#')[0]+'#presenter','ffpresenter','popup=yes,width=1180,height=740'); }catch(e){}
  if(!w) toast(T('팝업이 막혀 있어요. 주소창에서 팝업을 허용해 주세요'));
  if(!pr.on) present(0); else { pvDeck(); pvState(); } }
$('pvBtn').onclick=openPV; $('pPvB').onclick=openPV;
var pv={on:false, st:'wait', i:0, end:false, rev:-1, black:false, t0:0, acc:0, since:0, run:false, fs:22, tm:null, id:''};
function pvSay(el,t){ el.innerHTML=''; var d=document.createElement('div'); d.className='pvMsg'; d.textContent=t; el.appendChild(d); }
function pvFrame(box,s,opt){ box.innerHTML=''; var t=th(), el=slideEl(s,t,false,opt||{}); box.appendChild(el); el.style.transform='scale('+(box.clientWidth||W)/W+')'; fitAll(el,s,t); }
function pvScale(){ ['pvCur','pvNextFr'].forEach(function(id){ var b=$(id), el=b.querySelector('.sl'); if(el&&b.clientWidth) el.style.transform='scale('+b.clientWidth/W+')'; }); }
function pvRender(){
  var d=deck, n=d.slides.length, S=$('pvStatus'), cur=$('pvCur'), nx=$('pvNextFr'), nt=$('pvNotes');
  $('pvName').textContent=d.name;
  S.textContent=pv.st==='end'?T('발표가 끝났어요'):pv.black?T('화면이 꺼져 있어요'):T('발표 중');
  cur.style.opacity=pv.black?.3:'';
  if(pv.end||pv.st==='end'){ pvSay(cur,T('발표가 끝났어요')); pvSay(nx,''); nt.textContent=''; $('pvNum').textContent=n+' / '+n; return; }
  var s=d.slides[pv.i]; if(!s) return;
  pvFrame(cur,s,{hideAns:s.layout==='quiz'&&pv.rev!==pv.i});
  var j=nextVis(pv.i,1); if(j>=0) pvFrame(nx,d.slides[j],{hideAns:true}); else pvSay(nx,T('마지막 슬라이드예요'));
  nt.textContent=(s.notes||'').trim()||''; if(s.layout==='quiz'&&s.caption.trim()) nt.textContent=(nt.textContent?nt.textContent+'\n\n':'')+T('정답')+': '+s.caption;
  if(!nt.textContent) nt.textContent=T('이 슬라이드에는 메모가 없어요');
  $('pvNum').textContent=(pv.i+1)+' / '+n; $('pvAns').hidden=s.layout!=='quiz';
}
function pvElapsed(){ return pv.acc+(pv.run?Date.now()-pv.since:0); }
function pvTick(){ $('pvTime').textContent=fmtTime(Math.floor(pvElapsed()/1000)); var t=new Date(); $('pvWall').textContent=('0'+t.getHours()).slice(-2)+':'+('0'+t.getMinutes()).slice(-2); }
function pvCmd(c){ if(bc) bc.postMessage({type:'cmd',cmd:c}); }
function pvKey(e){ if(e.ctrlKey||e.metaKey||e.altKey) return; var k=e.key, c=null;
  if(k==='ArrowRight'||k==='ArrowDown'||k==='PageDown'||k===' '||k==='Enter'||k==='n') c='next'; else if(k==='ArrowLeft'||k==='ArrowUp'||k==='PageUp'||k==='Backspace'||k==='p') c='prev';
  else if(k==='Home') c='home'; else if(k==='End') c='last'; else if(k==='b'||k==='B'||k==='.') c='black'; else if(k==='a'||k==='A') c='ans';
  if(c){ e.preventDefault(); pvCmd(c); } }
function startPV(){
  document.body.classList.add('mode-pv'); $('pv').hidden=false; deck=newDeck(); deck.name=''; document.title=T('발표자 화면')+' · Fry Slides';
  try{ var f=parseInt(localStorage.getItem('ffslides.pvfs'),10); if(f>=12&&f<=60) pv.fs=f; }catch(e){}
  $('pvNotes').style.fontSize=pv.fs+'px'; pvSay($('pvCur'),T('발표 화면을 기다리고 있어요. 편집 창에서 발표하기를 누르면 여기에 이어져요.')); pvSay($('pvNextFr'),''); $('pvNotes').textContent=''; $('pvStatus').textContent=T('기다리는 중'); $('pvNum').textContent=''; $('pvAns').hidden=true;
  var hello=function(){ if(bc) bc.postMessage({type:'hello'}); };
  if(bc) bc.onmessage=function(e){ var m=e.data||{};
    if(m.type==='deck'){ deck=fixDeck(m.deck); fitCache.clear(); pv.on=true; pv.id=deck.id; }
    else if(m.type==='state'){ if(!pv.on||pv.id!==m.id){ hello(); return; } if(pv.st==='end'||!pv.run&&!pv.acc||pv.t0!==m.t0){ pv.t0=m.t0; pv.acc=Math.max(0,Date.now()-m.t0); pv.since=Date.now(); pv.run=true; $('pvPause').textContent=T('멈춤'); }
      pv.st='on'; pv.i=m.i; pv.end=m.end; pv.rev=m.rev; pv.black=m.black; pvRender(); }
    else if(m.type==='exit'){ pv.st='end'; pv.end=true; if(pv.run){ pv.acc=pvElapsed(); pv.run=false; } pvRender(); }
    else if(m.type==='idle'&&pv.st==='wait'){} };
  hello(); setInterval(function(){ if(pv.st==='wait') hello(); },1500); pv.tm=setInterval(pvTick,500); pvTick();
  $('pvPrev').onclick=function(){ pvCmd('prev'); }; $('pvNext').onclick=function(){ pvCmd('next'); }; $('pvBlack').onclick=function(){ pvCmd('black'); }; $('pvAns').onclick=function(){ pvCmd('ans'); };
  $('pvExit').onclick=function(){ pvCmd('exit'); };
  $('pvPause').onclick=function(){ if(pv.run){ pv.acc=pvElapsed(); pv.run=false; this.textContent=T('다시 가기'); } else { pv.since=Date.now(); pv.run=true; this.textContent=T('멈춤'); } pvTick(); };
  $('pvReset').onclick=function(){ pv.acc=0; pv.since=Date.now(); pv.run=true; $('pvPause').textContent=T('멈춤'); pvTick(); };
  var fsz=function(d){ pv.fs=Math.max(12,Math.min(60,pv.fs+d)); $('pvNotes').style.fontSize=pv.fs+'px'; try{ localStorage.setItem('ffslides.pvfs',String(pv.fs)); }catch(e){} };
  $('pvFsM').onclick=function(){ fsz(-2); }; $('pvFsP').onclick=function(){ fsz(2); };
  window.addEventListener('resize',pvScale); if(window.ResizeObserver){ var ro=new ResizeObserver(pvScale); ro.observe($('pvCur')); ro.observe($('pvNextFr')); }
}

/* ---------- keyboard ---------- */
document.addEventListener('keydown',function(e){
  if(MODE){ if(MODE==='pv') pvKey(e); return; }
  if(pr.on){ var k=e.key;
    if(/^\d$/.test(k)&&!e.ctrlKey&&!e.metaKey){ e.preventDefault(); pr.go=(pr.go+k).slice(0,3); $('pNum').textContent='→ '+pr.go; clearTimeout(pr.goT); pr.goT=setTimeout(function(){ pr.go=''; drawPresent(); },2500); return; }
    if(pr.go&&k==='Enter'){ e.preventDefault(); pGo(); return; }
    if(pr.go&&k==='Escape'){ e.preventDefault(); pr.go=''; drawPresent(); return; }
    if(k==='ArrowRight'||k==='ArrowDown'||k==='PageDown'||k===' '||k==='Enter'||k==='n'){ e.preventDefault(); pNext(); }
    else if(k==='ArrowLeft'||k==='ArrowUp'||k==='PageUp'||k==='Backspace'||k==='p'){ e.preventDefault(); pPrev(); }
    else if(k==='Home'){ e.preventDefault(); pHome(); }
    else if(k==='End'){ e.preventDefault(); pLast(); }
    else if(k==='v'||k==='V'){ e.preventDefault(); openPV(); }
    else if(k==='a'||k==='A'){ e.preventDefault(); pAns(); }
    else if(k==='t'||k==='T'){ e.preventDefault(); if(pr.cd){ if(pr.cd.left===0){ pr.cd.left=pr.cd.total; pr.cd.run=true; } else pr.cd.run=!pr.cd.run; cdPaint(); toast(pr.cd.run?T('타이머가 다시 가요'):T('타이머를 멈췄어요')); } }
    else if(k==='Escape'){ e.preventDefault(); if(ink.tool) setInk(''); else exitPresent(); }
    else if(k==='d'||k==='D'){ e.preventDefault(); setInk('pen'); }
    else if(k==='m'||k==='M'){ e.preventDefault(); setInk('hi'); }
    else if(k==='e'||k==='E'){ e.preventDefault(); inkClear(); }
    else if(k==='s'||k==='S'){ e.preventDefault(); setNotesView(!pr.notes); }
    else if(k==='l'||k==='L'){ e.preventDefault(); setLaser(!pr.laser); }
    else if(k==='b'||k==='B'||k==='.'){ e.preventDefault(); setBlack(!pr.black); }
    return; }
  if($('sortDlg').classList.contains('open')&&(e.ctrlKey||e.metaKey)&&(e.key==='a'||e.key==='A')&&!(e.target.tagName==='INPUT')){ e.preventDefault(); $('sAll').click(); return; }
  if(document.querySelector('.ov.open')){ if(e.key==='Escape') document.querySelectorAll('.ov.open').forEach(function(o){ closeDlg(o.id,null); }); return; }
  if(e.key==='Escape') closeMenus();
  if(e.ctrlKey&&e.altKey&&(e.code==='KeyN'||e.key==='n'||e.key==='N')){ e.preventDefault(); if(gen) toast(T('AI가 다 만들 때까지 기다려 주세요')); else { blurEdit(); newDeckAction(); } return; }
  var t=e.target; if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.tagName==='SELECT'||t.isContentEditable)) return;
  var mod=e.ctrlKey||e.metaKey;
  if(mod&&(e.key==='z'||e.key==='Z')){ e.preventDefault(); if(e.shiftKey) doRedo(); else doUndo(); }
  else if(mod&&(e.key==='y'||e.key==='Y')){ e.preventDefault(); doRedo(); }
  else if(mod&&(e.key==='d'||e.key==='D')){ e.preventDefault(); if(!$('editor').hidden&&!gen&&!busyOn) dupSlide(); }
  else if(e.key==='?'&&!mod){ e.preventDefault(); showKeys(); }
  else if(e.key==='F5'){ e.preventDefault(); present(e.shiftKey?cur:0); }
  else if(!$('editor').hidden&&!gen&&!busyOn&&e.altKey&&!mod&&(e.key==='ArrowUp'||e.key==='ArrowDown')){ e.preventDefault(); moveSlide(cur,cur+(e.key==='ArrowUp'?-1:1)); }
  else if(!$('editor').hidden&&!gen&&!busyOn&&mod&&e.key==='Enter'){ e.preventDefault(); addSlide('bullets'); }
  else if(!$('editor').hidden&&!gen&&!busyOn&&!mod&&!e.altKey&&(e.key==='h'||e.key==='H')){ e.preventDefault(); toggleHide(); }
  else if(!$('editor').hidden&&!gen&&!busyOn&&!mod&&e.key==='Delete'){ e.preventDefault(); delSlide(); }
  else if(!$('editor').hidden&&!mod&&e.key==='Home'){ e.preventDefault(); select(0); }
  else if(!$('editor').hidden&&!mod&&e.key==='End'){ e.preventDefault(); select(deck.slides.length-1); }
  else if(!$('editor').hidden&&!mod&&(e.key==='ArrowDown'||e.key==='ArrowRight'||e.key==='PageDown')){ e.preventDefault(); select(cur+1); }
  else if(!$('editor').hidden&&!mod&&(e.key==='ArrowUp'||e.key==='ArrowLeft'||e.key==='PageUp')){ e.preventDefault(); select(cur-1); }
});

/* ---------- PDF / print ---------- */
function printDeck(){
  if(!deck.slides.length) return toast(T('먼저 슬라이드를 만들어 주세요'));
  blurEdit(); var r=$('printRoot'), t=th(); r.innerHTML='';
  deck.slides.filter(function(s){ return !s.hide; }).forEach(function(s){ var p=document.createElement('div'); p.className='pp'; var el=slideEl(s,t,false); el.style.transform='none'; p.appendChild(el); r.appendChild(p); fitAll(el,s,t); });
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
  var t0=th(), txt=deckText(), fh=pptxFace(t0,1,txt), fb=pptxFace(t0,0,txt);
  var I=function(px){ return Math.round(px/96*1000)/1000; }, C=function(h){ return h.replace('#','').toUpperCase(); }, PT=function(px){ return Math.round(px*0.75*2)/2; };
  var VA={'flex-start':'top', center:'middle', 'flex-end':'bottom'};
  function pptxData(sl,s,b,t){ if(empty(s,'data')) return;
    if(b.view==='table'){ var R=parseTable(s.data); if(!R.length) return; var n=R[0].length;
      sl.addTable(R.map(function(r,ri){ return r.map(function(c){ return {text:c, options:{bold:!ri, color:C(ri?t.fg:onAc(t)), fill:{color:C(ri?rowBg(t,ri):t.ac)}, align:ri?'left':'center', valign:'middle'}}; }); }),
        {x:I(b.x), y:I(b.y), w:I(b.w), colW:R[0].map(function(){ return I(b.w/n); }), rowH:I(Math.min(64,b.h/R.length)), fontFace:fb, fontSize:PT(tableFS(R.length)), border:{type:'solid', pt:1, color:C(mix(t.bg,t.fg,.28))}}); return; }
    var rows=parseChart(s.data); if(!rows.length) return; var pie=s.ctype==='pie', ty=pie?p.charts.PIE:s.ctype==='line'?p.charts.LINE:p.charts.BAR;
    sl.addChart(ty,[{name:s.title||'Data', labels:rows.map(function(r){ return r.l; }), values:rows.map(function(r){ return r.v; })}],
      {x:I(b.x), y:I(b.y), w:I(b.w), h:I(b.h), chartColors:pie?chartCols(t).slice(0,rows.length).map(C):[C(t.ac)], showValue:!pie, showPercent:pie, dataLabelColor:C(t.fg), dataLabelFontSize:14, dataLabelFontFace:fb,
       catAxisLabelColor:C(t.sub), valAxisLabelColor:C(t.sub), catAxisLabelFontFace:fb, catAxisLabelFontSize:14, valAxisLabelFontSize:12, valGridLine:{style:'none'}, showLegend:pie, legendPos:'r', legendColor:C(t.fg), legendFontSize:16, barDir:'col', lineSize:4, lineDataSymbolSize:10}); }
  var p=new P(); p.layout='LAYOUT_WIDE'; p.title=deck.name; p.author='Fry Slides'; p.company='Frenchfries777 Tools';
  deck.slides.forEach(function(s){
    var t=eth(s,t0), sl=p.addSlide(); sl.background={color:C(t.bg)}; if(s.hide) sl.hidden=true;
    deco(t,s.layout).forEach(function(d){
      var box={x:I(d.x), y:I(d.y), w:I(d.w), h:I(d.h)};
      if(d.r==='glyph'){ box.fontFace='Georgia'; box.fontSize=PT(d.fs); box.color=C(d.c); box.bold=true; box.align='center'; box.valign='top'; box.margin=0; box.transparency=Math.round((1-d.o)*100); sl.addText(d.t,box); return; }
      if(d.r==='frame'){ box.x=I(d.x+5); box.y=I(d.y+5); box.w=I(d.w-10); box.h=I(d.h-10); box.fill={type:'none'}; box.line={color:C(d.c), width:7.5}; sl.addShape(p.ShapeType.rect,box); return; }
      box.fill={color:C(d.c), transparency:Math.round((1-d.o)*100)}; box.line={type:'none'};
      sl.addShape(d.r==='ell'?p.ShapeType.ellipse:p.ShapeType.rect,box);
    });
    var fs=measure(s,t);
    (LAY[s.layout]||LAY.bullets).forEach(function(b){
      if(b.view){ pptxData(sl,s,b,t); return; } if(b.cls==='ans') return;
      if(b.f==='img'){ if(s.img&&s.iw&&s.ih){ var k=Math.min(b.w/s.iw,b.h/s.ih), w=s.iw*k, h=s.ih*k; sl.addImage({data:s.img.replace(/^data:/,''), x:I(b.x+(b.w-w)/2), y:I(b.y+(b.h-h)/2), w:I(w), h:I(h)}); } return; }
      if(empty(s,b.f)) return; var r=role(t,b.k), pt=PT(fs[b.f]||b.fs);
      var o={x:I(b.x), y:I(b.y), w:I(b.w), h:I(b.h), fontFace:r.head?fh:fb, fontSize:pt, color:C(r.c), bold:r.w>=700, align:b.al||'left', valign:VA[b.va||'flex-start'],
        margin:0, lineSpacingMultiple:Math.round(r.lh/1.2*100)/100, fit:'shrink', paraSpaceAfter:0};
      if(b.list){ var items=s[b.f]; sl.addText(items.map(function(x,i){ return {text:x, options:{bullet:{indent:Math.round(pt*1.15)}, paraSpaceAfter:i<items.length-1?Math.round(pt*0.5):0, breakLine:i<items.length-1}}; }),o); }
      else sl.addText(String(s[b.f]),o);
    });
    footOf(s,t).forEach(function(f){ sl.addText(f.t,{x:I(f.x), y:I(f.y), w:I(f.w), h:I(f.h), fontFace:fb, fontSize:PT(f.fs), color:C(f.c), align:f.al, valign:'middle', margin:0}); });
    var nts=[s.notes&&s.notes.trim(), s.layout==='quiz'&&s.caption.trim()?T('정답')+': '+s.caption:''].filter(Boolean).join('\n\n'); if(nts) sl.addNotes(nts);
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

/* ---------- slide sorter: all slides in a grid, select several, move / copy / delete together ---------- */
var sortSel=[], sortAnchor=-1;
function sortIdx(){ return deck.slides.map(function(s,i){ return sortSel.indexOf(s.id)>=0?i:-1; }).filter(function(i){ return i>=0; }); }
function openSort(){ if(gen||busyOn||!deck.slides.length) return; blurEdit(); closeMenus(); sortSel=[deck.slides[cur].id]; sortAnchor=cur; openDlg('sortDlg'); drawSort(); }
function drawSort(){
  var g=$('sortGrid'), t=th(), keep=g.scrollTop; g.innerHTML=''; sortSel=sortSel.filter(function(id){ return deck.slides.some(function(s){ return s.id===id; }); });
  deck.slides.forEach(function(s,i){
    var c=document.createElement('div'); c.className='sc'+(sortSel.indexOf(s.id)>=0?' on':'')+(i===cur?' cur':'')+(s.hide?' hid':''); c.dataset.i=i; c.setAttribute('role','checkbox'); c.setAttribute('aria-checked',sortSel.indexOf(s.id)>=0?'true':'false');
    c.innerHTML='<div class="tv"></div><div class="sn"><b>'+(i+1)+'</b><span class="ck">✓</span></div>'; g.appendChild(c);
    var tv=c.firstChild, el=slideEl(s,t,false); tv.appendChild(el); el.style.transform='scale('+((tv.clientWidth||200)/W)+')'; fitAll(el,s,t);
  });
  g.scrollTop=keep; sortBar();
}
function sortBar(){ var n=sortSel.length, tot=deck.slides.length, idx=sortIdx();
  $('sortInfo').textContent=n?F('{0}장 선택 · 전체 {1}장',n,tot):F('전체 {0}장',tot);
  ['sFirst','sLeft','sRight','sLast','sMoveTo','sCopy','sDel'].forEach(function(id){ $(id).disabled=!n; });
  if(n){ $('sFirst').disabled=$('sLeft').disabled=idx[0]===0&&idx.every(function(v,k){ return v===k; }); $('sLast').disabled=$('sRight').disabled=idx.every(function(v,k){ return v===tot-n+k; }); }
  $('sDel').disabled=!n||n>=tot; $('sPos').max=tot; $('sUndo').disabled=!undo.length; }
function sortClick(i,e){
  var id=deck.slides[i].id, k=sortSel.indexOf(id);
  if(e.shiftKey&&sortAnchor>=0){ var a=Math.min(sortAnchor,i), b=Math.max(sortAnchor,i); sortSel=deck.slides.slice(a,b+1).map(function(s){ return s.id; }); }
  else { if(k>=0) sortSel.splice(k,1); else sortSel.push(id); sortAnchor=i; }
  sortPaint(); }
function sortPaint(){ [].forEach.call($('sortGrid').children,function(c){ var on=sortSel.indexOf(deck.slides[+c.dataset.i].id)>=0; c.classList.toggle('on',on); c.setAttribute('aria-checked',on?'true':'false'); }); sortBar(); }
$('sortGrid').addEventListener('click',function(e){ var c=e.target.closest('.sc'); if(c) sortClick(+c.dataset.i,e); });
$('sortGrid').addEventListener('dblclick',function(e){ var c=e.target.closest('.sc'); if(!c) return; closeDlg('sortDlg',null); select(+c.dataset.i); });
/* every change goes through here: one undo step, selection kept by slide id */
function sortApply(fn,msg){ var before=snap(); var curId=deck.slides[cur]&&deck.slides[cur].id; var r=fn(); if(r===false) return; pushUndo(before);
  var ni=deck.slides.findIndex(function(s){ return s.id===curId; }); cur=ni>=0?ni:Math.min(cur,deck.slides.length-1); refresh(); saveSoon(); drawSort(); if(msg) toast(msg); }
function sortMove(dir){ var S=sortSel.slice(); sortApply(function(){ var a=deck.slides, sel=function(s){ return S.indexOf(s.id)>=0; }, i, moved=false;
  if(dir<0){ for(i=1;i<a.length;i++) if(sel(a[i])&&!sel(a[i-1])){ var x=a[i]; a[i]=a[i-1]; a[i-1]=x; moved=true; } }
  else { for(i=a.length-2;i>=0;i--) if(sel(a[i])&&!sel(a[i+1])){ var y=a[i]; a[i]=a[i+1]; a[i+1]=y; moved=true; } }
  return moved?true:false; }); }
function sortTo(pos){ var S=sortSel.slice(); sortApply(function(){ var all=deck.slides, picked=all.filter(function(s){ return S.indexOf(s.id)>=0; }), rest=all.filter(function(s){ return S.indexOf(s.id)<0; });
  var at=Math.max(0,Math.min(pos,rest.length)); var out=rest.slice(0,at).concat(picked,rest.slice(at));
  if(out.every(function(s,i){ return s===all[i]; })) return false; deck.slides=out; return true; },F('{0}장을 옮겼어요',S.length)); }
function sortCopy(){ var S=sortSel.slice(); sortApply(function(){ var idx=sortIdx(); if(!idx.length) return false;
  var copies=idx.map(function(i){ var c=JSON.parse(JSON.stringify(deck.slides[i])); c.id=uid(); return c; }); deck.slides.splice.apply(deck.slides,[idx[idx.length-1]+1,0].concat(copies));
  sortSel=copies.map(function(c){ return c.id; }); sortAnchor=-1; return true; },F('{0}장을 복사했어요',S.length)); }
function sortDel(){ var n=sortSel.length; if(!n) return; if(n>=deck.slides.length) return toast(T('모든 슬라이드를 지울 수는 없어요'));
  confirmDlg(F('선택한 슬라이드 {0}장을 지울까요? 되돌리기로 살릴 수 있어요.',n)).then(function(ok){ if(!ok) return; var S=sortSel.slice();
    sortApply(function(){ deck.slides=deck.slides.filter(function(s){ return S.indexOf(s.id)<0; }); sortSel=[]; sortAnchor=-1; return true; },F('{0}장을 지웠어요',n)); }); }
$('sortBtn').onclick=openSort;
$('sAll').onclick=function(){ sortSel=deck.slides.map(function(s){ return s.id; }); sortPaint(); };
$('sNone').onclick=function(){ sortSel=[]; sortAnchor=-1; sortPaint(); };
$('sFirst').onclick=function(){ sortTo(0); }; $('sLast').onclick=function(){ sortTo(deck.slides.length); };
$('sLeft').onclick=function(){ sortMove(-1); }; $('sRight').onclick=function(){ sortMove(1); };
$('sMoveTo').onclick=function(){ var v=parseInt($('sPos').value,10); if(!v) return $('sPos').focus(); sortTo(v-1); };
$('sPos').addEventListener('keydown',function(e){ e.stopPropagation(); if(e.key==='Enter'){ e.preventDefault(); $('sMoveTo').click(); } if(e.key==='Escape') closeDlg('sortDlg',null); });
$('sCopy').onclick=sortCopy; $('sDel').onclick=sortDel;
$('sUndo').onclick=function(){ if(!undo.length) return; redo.push(snap()); restore(undo.pop()); updUR(); sortSel=sortSel.filter(function(id){ return deck.slides.some(function(s){ return s.id===id; }); }); drawSort(); };

/* ---------- start ---------- */
window.addEventListener('beforeunload',function(){ blurEdit(); saveNow(); });
document.addEventListener('visibilitychange',function(){ if(document.hidden) saveNow(); });
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(function(){ fitCache.clear(); if(MODE) return; if(deck&&deck.slides.length){ drawList(); drawMain(); } else if(deck) drawStart(); });
var first=null; store.decks.forEach(function(d){ if(d.id===store.last) first=d; });
if(!first&&store.decks.length) first=store.decks.slice().sort(function(a,b){ return b.t-a.t; })[0];
if(MODE==='pv') startPV(); else openDeck(first||newDeck());

/* used by ai-slides.js */
window.FSL={
  get deck(){ return deck; }, get cur(){ return cur; }, get busy(){ return gen||busyOn; }, LAYS:AILAYS, LAY:LAY, blank:blank, fixSlide:fixSlide, toast:toast, ask:ask, pushUndo:pushUndo, snap:snap,
  saveSoon:saveSoon, saveNow:saveNow, refresh:refresh, select:select, isDefaultName:isDefaultName, openMenu:openMenu, closeMenus:closeMenus, blurEdit:blurEdit,
  newDeckWith:function(topic){ blurEdit(); saveNow(); if(deck.slides.length||!isDefaultName(deck.name)) openDeck(newDeck()); deck.topic=topic; $('topic').value=topic; saveSoon(); return Promise.resolve(); },
  setName:function(n){ deck.name=n; $('deckName').value=n; saveSoon(); },
  setGen:function(on){ gen=on; $('genBar').hidden=!on; refresh(); },
  setBusy:function(on){ busyOn=on; $('busy').hidden=!on; drawMain(); updUR(); },
  pushSlide:function(s){ deck.slides.push(fixSlide(s)); cur=deck.slides.length-1; refresh(); saveSoon(); },
  putSlide:function(i,s){ var o=deck.slides[i]; if(!o) return; s=fixSlide(s); s.id=o.id; s.img=o.img; s.iw=o.iw; s.ih=o.ih; s.hide=o.hide; s.bg=o.bg; s.data=o.data; s.ctype=o.ctype; deck.slides[i]=s; if(i===cur) drawMain(); updateThumb(i); saveSoon(); },
  insertSlide:function(i,s){ deck.slides.splice(i,0,fixSlide(s)); cur=i; refresh(); saveSoon(); }
};
window.__fsl={get deck(){ return deck; }, get store(){ return store; }, get cur(){ return cur; }, select:select, present:present, exitPresent:exitPresent, get pr(){ return pr; }, buildPPTX:buildPPTX, needPPTX:needPPTX, measure:measure, undo:doUndo, redo:doRedo, moveSlide:moveSlide};
})();
