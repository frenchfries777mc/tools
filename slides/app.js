/* Fry Slides: decks of 16:9 slides drawn in HTML (1280 x 720, scaled), edited in place, presented full screen
   and exported as an editable .pptx (lib/pptxgen.bundle.js, PptxGenJS 4.0.1, loaded only when exporting).
   The same layout boxes and fitted font sizes are used for the screen, printing and the .pptx, so they match.
   Decks are saved in this browser (localStorage 'ffslides.v1'). The AI part is in ai-slides.js (uses ../ai.js). */
(function(){
'use strict';
var T=FFT.T, F=FFT.F, $=function(id){ return document.getElementById(id); };
var W=1280, H=720, LS='ffslides.v1';
/* MODE: '' = the editor, 'pv' = presenter view window (#presenter), which gets the deck from the presenting window, 'view' = read-only viewer for a shared link (#v=...); neither of them saves */
var MODE=/^#presenter/.test(location.hash)?'pv':/^#v=/.test(location.hash)?'view':'';

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
  live:[HEAD,{f:'live',x:90,y:196,w:1100,h:428,k:'l',view:'live'}],
  timer:[HEAD,{f:'stat',x:90,y:206,w:1100,h:300,fs:230,min:40,k:'a',al:'center',va:'center'},{f:'caption',x:150,y:520,w:980,h:140,fs:34,min:15,k:'b',al:'center'}]
};
var LAYS=['title','section','bullets','two','stat','quote','closing','image','agenda','timeline','table','chart','quiz','timer','live'], AILAYS=LAYS.slice(0,7);
var LISTS=['bullets','left','right'], TEXTS=['title','subtitle','leftTitle','rightTitle','stat','caption','quote','by','notes','img','data','ctype','bg','live'];
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
/* sec: seconds before auto-advance when presenting (0 = the deck's, -1 = stay), ish/ibc/ibw: the picture's shape (rect | round | ell), border colour and width. g (on a shape): group id
   pos: boxes moved or resized by hand ({field: {x,y,w,h}}), els: shapes, build: what appears one by one when presenting ([{k,a}] in order), tr: this slide's transition ('' = the deck's) */
function blank(lay){ return {id:uid(), layout:lay||'bullets', title:'', subtitle:'', bullets:[], left:[], right:[], leftTitle:'', rightTitle:'', stat:'', caption:'', quote:'', by:'', notes:'', img:'', iw:0, ih:0, data:'', ctype:'bar', bg:'', live:'', hide:false, pos:{}, els:[], build:[], tr:'', sec:0, ish:'rect', ibc:'', ibw:0}; }
var SHK=['rect','round','ell','tri','star','line','arrow'], ISH=['rect','round','ell'], ANIMS=['fade','fly'], TRS=['fade','slide','zoom','none'];
function num(v,d,lo,hi){ v=+v; return isFinite(v)?Math.max(lo,Math.min(hi,Math.round(v))):d; }
function fixCol(v,d){ v=v==null?d:String(v); return v===''||v==='ac'||v==='fg'||/^#[0-9a-f]{6}$/i.test(v)?v:d; }
function isLine(e){ return e.k==='line'||e.k==='arrow'; }
/* a shape: closed ones are a box (x,y,w,h); a line or an arrow runs from (x,y) to (x+w,y+h), so w and h can be negative */
function fixEl(e){ if(!e||typeof e!=='object'||SHK.indexOf(e.k)<0) return null; var L=isLine(e);
  return {id:String(e.id||uid()).slice(0,40), k:e.k, x:num(e.x,400,-2000,3000), y:num(e.y,250,-2000,3000), w:L?num(e.w,300,-4000,4000):num(e.w,300,20,4000), h:L?num(e.h,0,-4000,4000):num(e.h,200,20,4000),
    fill:L?'':fixCol(e.fill,'ac'), line:fixCol(e.line,L?'fg':'')||(L?'fg':''), sw:num(e.sw,L?6:0,L?1:0,40), text:L?'':String(e.text==null?'':e.text).slice(0,2000), back:!!e.back, op:L?100:num(e.op,100,10,100), al:['l','c','r'].indexOf(e.al)>=0?e.al:'c', fs:L?0:num(e.fs,0,0,400), g:String(e.g||'').slice(0,40)}; }
function fixPos(p){ var o={}; if(p&&typeof p==='object'&&!Array.isArray(p)) for(var k in p){ var r=p[k]; if(r&&typeof r==='object'&&isFinite(+r.x)&&isFinite(+r.y)) o[k]={x:num(r.x,0,-2000,3000), y:num(r.y,0,-2000,3000), w:num(r.w,200,20,4000), h:num(r.h,100,20,4000)}; } return o; }
function fixSlide(s){ var b=blank(); s=s&&typeof s==='object'?s:{};
  if(LAYS.indexOf(s.layout)<0) s.layout='bullets'; if(!s.id) s.id=uid();
  LISTS.forEach(function(k){ s[k]=Array.isArray(s[k])?s[k].map(function(x){ return String(x==null?'':x); }).filter(function(x){ return x.trim(); }):[]; });
  TEXTS.forEach(function(k){ s[k]=s[k]==null?'':String(s[k]); });
  for(var k in b) if(s[k]===undefined) s[k]=b[k];
  s.hide=!!s.hide; if(['bar','line','pie'].indexOf(s.ctype)<0) s.ctype='bar'; if(!/^#[0-9a-f]{6}$/i.test(s.bg)) s.bg='';
  /* decks saved before free placement, shapes and builds simply get none */
  s.pos=fixPos(s.pos); var ids={}; s.els=(Array.isArray(s.els)?s.els:[]).slice(0,80).map(fixEl).filter(function(e){ if(!e||ids[e.id]) return false; ids[e.id]=1; return true; });
  var gc={}; s.els.forEach(function(e){ if(e.g) gc[e.g]=(gc[e.g]||0)+1; }); s.els.forEach(function(e){ if(e.g&&gc[e.g]<2) e.g=''; }); // a group needs two shapes
  s.sec=num(s.sec,0,-1,3600); if(ISH.indexOf(s.ish)<0) s.ish='rect'; s.ibc=fixCol(s.ibc,''); s.ibw=num(s.ibw,0,0,40);
  var seen={}; s.build=(Array.isArray(s.build)?s.build:[]).filter(function(b){ if(!b||typeof b.k!=='string'||ANIMS.indexOf(b.a)<0||seen[b.k]) return false; seen[b.k]=1; return true; }).slice(0,80).map(function(b){ return {k:b.k, a:b.a}; });
  if(TRS.indexOf(s.tr)<0) s.tr='';
  return s; }
function newDeck(){ return {id:uid(), name:T('새 발표 자료'), theme:'light', slides:[], t:Date.now(), topic:'', aud:'', n:8, nums:false, footer:'', font:'', trans:'fade', master:fixMaster(), auto:fixAuto()}; }
/* master slide (logo, footer text, slide number on every slide) and auto-advance when presenting; the footer text and number switch live in deck.footer / deck.nums */
var MPOS=['tl','tr','bl','br'], APOS=['l','c','r'], LSZ={sm:44, md:68, lg:104};
function fixMaster(m){ m=m&&typeof m==='object'?m:{}; var lg=typeof m.logo==='string'&&/^data:image\//.test(m.logo)?m.logo:'';
  return {on:m.on!==false, logo:lg, lw:lg?num(m.lw,100,1,4000):0, lh:lg?num(m.lh,100,1,4000):0, lpos:MPOS.indexOf(m.lpos)>=0?m.lpos:'tr', lsz:LSZ[m.lsz]?m.lsz:'md', fpos:APOS.indexOf(m.fpos)>=0?m.fpos:'l', npos:APOS.indexOf(m.npos)>=0?m.npos:'r', ttl:!!m.ttl}; }
function fixAuto(a){ a=a&&typeof a==='object'?a:{}; return {on:!!a.on, sec:num(a.sec,10,1,600), loop:!!a.loop}; }
function fixDeck(d){ d.slides=(Array.isArray(d.slides)?d.slides:[]).map(fixSlide); d.theme=themeOf(d.theme).id; d.name=String(d.name||T('새 발표 자료')); d.nums=!!d.nums; d.footer=String(d.footer||''); d.font=FONTS.some(function(f){ return f[0]===d.font; })?d.font:''; d.trans=['fade','slide','zoom','none'].indexOf(d.trans)<0?'fade':d.trans; d.master=fixMaster(d.master); d.auto=fixAuto(d.auto); if(!d.t) d.t=Date.now(); return d; }
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
function snap(){ return JSON.stringify({n:deck.name, th:deck.theme, s:deck.slides, c:cur, f:deck.footer, nm:deck.nums, fo:deck.font, tr:deck.trans, ma:deck.master, au:deck.auto}); }
function pushUndo(s){ undo.push(s||snap()); if(undo.length>100) undo.shift(); redo=[]; updUR(); }
function restore(j){ var o=JSON.parse(j); deck.name=o.n; deck.theme=o.th; deck.footer=o.f||''; deck.nums=!!o.nm; deck.font=o.fo||''; deck.trans=o.tr||'fade'; deck.master=fixMaster(o.ma); deck.auto=fixAuto(o.au); deck.slides=o.s.map(fixSlide); cur=Math.max(0,Math.min(o.c,deck.slides.length-1)); $('deckName').value=deck.name; refresh(); saveSoon(); }
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
  var shp=function(back){ s.els.forEach(function(e){ if(!!e.back===back) el.appendChild(shapeEl(e,th,edit)); }); };
  shp(true);
  (LAY[s.layout]||LAY.bullets).forEach(function(b0){
    var b=boxOf(s,b0), em=empty(s,b.f); if(em&&!edit) return;
    if(b.f==='img'){ var pc=document.createElement('div'); pc.className='pic'+(em?' empty':''); pc.dataset.f='img'; pc.dataset.bk='img';
      pc.style.cssText='left:'+b.x+'px;top:'+b.y+'px;width:'+b.w+'px;height:'+b.h+'px;';
      if(em) pc.textContent='🖼  '+T('그림 넣기'); else { var im=new Image(); im.src=s.img; im.draggable=false; im.alt=''; picStyle(im,s,b,th); pc.classList.toggle('shaped',s.ish!=='rect'); pc.appendChild(im);
        if(edit){ var rm=document.createElement('button'); rm.className='rm'; rm.dataset.rm='1'; rm.textContent='×'; rm.title=T('그림 빼기'); pc.appendChild(rm); } }
      el.appendChild(pc); return; }
    if(b.view==='live'){ el.appendChild(liveView(s,b,th,edit,opt)).dataset.bk='live'; return; }
    if(b.view){ el.appendChild(dataView(s,b,th)).dataset.bk='data'; return; }
    if(b.cls==='ans'&&opt.hideAns) return;
    var box=document.createElement('div'); box.className='fld k-'+b.k+(b.cls==='ans'?' ans':''); box.dataset.f=b.f; box.dataset.bk=b.f;
    box.style.cssText='left:'+b.x+'px;top:'+b.y+'px;width:'+b.w+'px;height:'+b.h+'px;justify-content:'+(b.va||'flex-start')+';text-align:'+(b.al||'left')+';';
    var inn=document.createElement(b.list?'ul':'div'); inn.className='in'+(b.list&&b.cls?' '+b.cls:'');
    if(b.list) fillList(inn,s[b.f]); else { inn.textContent=(opt.over&&opt.over[b.f]!=null?opt.over[b.f]:s[b.f])||''; if(em) inn.classList.add('ph'); }
    if(edit){ inn.contentEditable=b.list?'true':CE; inn.spellcheck=false; inn.setAttribute('data-ph',T(ph(b.f,s.layout))); inn.setAttribute('autocapitalize','sentences'); }
    box.appendChild(inn); el.appendChild(box);
  });
  shp(false);
  /* builds: in the editor a small number shows the order; when presenting (opt.step) the ones not reached yet are hidden */
  var nb=0; s.build.forEach(function(bd){ var e=el.querySelector('[data-bk="'+bd.k+'"]'); if(!e) return; e.dataset.bi=nb; e.dataset.ba=bd.a;
    if(edit){ var n=document.createElement('span'); n.className='bn'; n.textContent=nb+1; n.title=T(bd.a==='fly'?'날아 들어오기':'서서히 나타나기'); e.appendChild(n); }
    else if(opt.step!=null&&nb>=opt.step) e.classList.add('bh');
    nb++; }); el.dataset.nb=nb;
  if(opt.hint&&s.layout==='live'&&liveCfg(s)){ var hn=document.createElement('div'); hn.className='liveHint'; hn.innerHTML='<span class="h1"></span><span class="h2"></span>'; hn.firstChild.textContent='👆 '+T('iframe 안에서 누르기 / Esc'); hn.lastChild.textContent=T('Esc: 슬라이드 넘기기로 돌아가기'); el.appendChild(hn); }
  footOf(s,th).forEach(function(f){ var e=document.createElement(f.logo?'img':'div'); e.className='ft'+(f.logo?' logo':''); if(f.logo){ e.src=f.logo; e.alt=''; e.draggable=false; } else e.textContent=f.t;
    e.style.cssText='left:'+f.x+'px;top:'+f.y+'px;width:'+f.w+'px;height:'+f.h+'px;'+(f.logo?'':'font-size:'+f.fs+'px;color:'+f.c+';text-align:'+f.al+';'); el.appendChild(e); });
  return el;
}
/* a picture can be cropped into a shape (round | ell: fills the box, the rest is cut off) and have a border */
function picRadius(s,b){ return s.ish==='ell'?'50%':s.ish==='round'?Math.round(Math.min(b.w,b.h)*.16667)+'px':'8px'; }
function picStyle(im,s,b,th){ var st='border-radius:'+picRadius(s,b)+';'; if(s.ish!=='rect') st+='width:100%;height:100%;max-width:none;max-height:none;object-fit:cover;'; if(s.ibw&&s.ibc) st+='box-sizing:border-box;border:'+s.ibw+'px solid '+colOf(s.ibc,th)+';'; im.style.cssText=st; }
/* tables and charts from pasted text (HTML/SVG on screen, native table and chart in the .pptx) */
function esc(t){ return String(t).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function parseTable(t){ var L=String(t||'').replace(/\r/g,'').split('\n').filter(function(x){ return x.trim(); }).slice(0,9); if(!L.length) return [];
  var sep=L.some(function(x){ return x.indexOf('\t')>=0; })?'\t':L.some(function(x){ return x.indexOf('|')>=0; })?'|':',';
  var R=L.map(function(x){ x=sep==='\t'?x.replace(/^ +| +$/g,''):x.trim(); if(sep==='|') x=x.replace(/^\|/,'').replace(/\|$/,''); return x.split(sep).slice(0,6).map(function(c){ return c.trim(); }); });
  var n=Math.max.apply(null,R.map(function(r){ return r.length; })); R.forEach(function(r){ while(r.length<n) r.push(''); }); return R; }
function parseChart(t){ var o=[]; String(t||'').replace(/\r/g,'').split('\n').forEach(function(l){ l=l.trim(); if(!l||o.length>=12) return;
  var m=/^(.*?)\s*[:：\t=,]\s*(-?\d[\d,]*(?:\.\d+)?)\s*(\S*)$/.exec(l)||/^(.*\S)\s+(-?\d[\d,]*(?:\.\d+)?)\s*(\S*)$/.exec(l); if(!m) return;
  var v=parseFloat(m[2].replace(/,/g,'')); if(isNaN(v)) return; o.push({l:m[1].trim()||String(o.length+1), v:v, s:m[2]+m[3]}); }); return o; }
function tableFS(nr){ return Math.max(14,Math.min(28,Math.floor(380/(nr*1.8)))); }
function rowBg(th,ri){ return ri%2?mix(th.bg,th.fg,.08):th.bg; }
var CPAL=['#3d7fe0','#ff8a3d','#2fb27a','#e0526b','#8a5ce0','#e0b93c','#3db5e0','#a0a7b8'];
function chartCols(th){ return [th.ac].concat(CPAL.filter(function(c){ return c!==th.ac; })); }
function clip(t,wpx,fs){ var w=0, o=''; for(var i=0;i<t.length;i++){ var c=t.charCodeAt(i), cw=(c>0x2e80?1:.56)*fs; if(w+cw>wpx){ return o.replace(/\s+$/,'')+'…'; } w+=cw; o+=t[i]; } return o; }
/* live screen: a mini app in a sandboxed iframe (Block HTML snapshot or pasted HTML: srcdoc, allow-scripts only; Fry Lab: same-origin page).
   Only the editor's main view and presenting run it; thumbnails, the sorter, print and the presenter view show a placeholder card. */
function liveCfg(s){ try{ var c=JSON.parse(s.live||'null'); if(c&&(c.k==='lab'&&typeof c.e==='string'||(c.k==='block'||c.k==='html')&&typeof c.h==='string')) return c; }catch(e){} return null; }
var ESC_JS='<scr'+'ipt>addEventListener("keydown",function(e){if(e.key==="Escape")parent.postMessage({ffslLive:"esc"},"*")},true)</scr'+'ipt>';
function liveName(c){ if(c.k!=='lab') return c.n||''; var x=labCat&&labCat.by[c.e]; return x?x.tn:T(c.n||''); }
function liveView(s,b,th,edit,opt){
  var d=document.createElement('div'), c=liveCfg(s); d.className='dv live'+(c?'':' empty'); d.dataset.f='live';
  d.style.cssText='left:'+b.x+'px;top:'+b.y+'px;width:'+b.w+'px;height:'+b.h+'px;color:'+th.fg+';';
  if(!c){ d.textContent='🎬  '+T('살아있는 화면 고르기'); return d; }
  if(!opt.live){ d.classList.add('ph'); d.style.background=mix(th.bg,th.fg,.08); d.style.border='3px dashed '+mix(th.bg,th.fg,.4);
    var a=document.createElement('div'); a.className='lv'; a.innerHTML='<b></b><span></span>'; a.firstChild.textContent='🎬 '+liveName(c); a.lastChild.textContent=T('발표 때 직접 실행하는 화면이에요'); d.appendChild(a); return d; }
  var fr=document.createElement('iframe'); fr.className='lvf'; fr.title=liveName(c)||T('살아있는 화면'); fr.setAttribute('data-notr','');
  if(c.k==='lab'){ fr.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms'); fr.src='../lab/index.html#'+encodeURIComponent(c.e);
    fr.addEventListener('load',function(){ try{ fr.contentWindow.addEventListener('keydown',function(e){ if(e.key==='Escape') liveEsc(fr); },true); }catch(err){} }); }
  else { fr.setAttribute('sandbox','allow-scripts allow-forms'); fr.srcdoc=c.h+ESC_JS; }
  d.appendChild(fr);
  if(edit){ var bt=document.createElement('button'); bt.className='lvEdit'; bt.dataset.liveEdit='1'; bt.textContent=T('화면 바꾸기'); d.appendChild(bt);
    /* the running screen takes every press, so this grip picks the box to move it or pull its handles */
    var gp=document.createElement('button'); gp.className='lvSize'; gp.dataset.liveSize='1'; gp.textContent='⤡ '+T('크기·위치'); gp.title=T('끌어서 옮기거나, 누른 뒤 모서리를 당겨 크기를 바꿔요'); d.appendChild(gp); }
  return d; }
function liveEsc(fr){ try{ fr.blur(); }catch(e){} try{ window.focus(); }catch(e){} document.getElementById('present').classList.remove('inLive'); }
window.addEventListener('message',function(e){ if(!e.data||e.data.ffslLive!=='esc') return; var fr=[].slice.call(document.querySelectorAll('iframe.lvf')).filter(function(x){ return x.contentWindow===e.source; })[0]; if(fr) liveEsc(fr); });
window.addEventListener('blur',function(){ setTimeout(function(){ var a=document.activeElement; if(pr&&pr.on&&a&&a.tagName==='IFRAME') $('present').classList.add('inLive'); },0); });
window.addEventListener('focus',function(){ $('present').classList.remove('inLive'); });
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
/* ---------- shapes: SVG on screen, native shapes in the .pptx (text inside the closed ones) ---------- */
var SHAPES=[['rect','네모'],['round','둥근 네모'],['ell','동그라미'],['tri','세모'],['star','별'],['text','글상자'],['line','선'],['arrow','화살표']], SH_FS=34;
function colOf(v,th){ return v==='ac'?th.ac:v==='fg'?th.fg:v||''; }
function shTextCol(e,th){ var f=colOf(e.fill,th); return f?(lum(f)>.4?'#111111':'#ffffff'):th.fg; }
/* a five-point star filling the box like PowerPoint's star5 */
function starPts(x0,y0,w,h){ var o=[], rx=w/1.902, ry=h/1.809, cx=x0+w/2, cy=y0+ry; for(var i=0;i<10;i++){ var a=(-90+36*i)*Math.PI/180, r=i%2?.382:1; o.push((cx+rx*r*Math.cos(a)).toFixed(1)+','+(cy+ry*r*Math.sin(a)).toFixed(1)); } return o.join(' '); }
function shTextBox(e){ var w=e.w, h=e.h; return e.k==='ell'?{x:w*.15,y:h*.15,w:w*.7,h:h*.7}:e.k==='tri'?{x:w*.22,y:h*.42,w:w*.56,h:h*.52}:e.k==='star'?{x:w*.3,y:h*.36,w:w*.4,h:h*.38}:{x:14,y:10,w:Math.max(10,w-28),h:Math.max(10,h-20)}; }
function shapeEl(e,th,edit){
  var d=document.createElement('div'), sw=e.sw, st=colOf(e.line,th), g='', bw, bh; d.className='shp'+(isLine(e)?' ln':''); d.dataset.bk='e:'+e.id; d.dataset.e=e.id;
  if(isLine(e)){ var ah=e.k==='arrow'?Math.max(22,sw*3.2):0, P=Math.max(24,sw+ah), l=Math.min(e.x,e.x+e.w)-P, t=Math.min(e.y,e.y+e.h)-P;
    bw=Math.abs(e.w)+2*P; bh=Math.abs(e.h)+2*P;
    var x1=e.x-l, y1=e.y-t, x2=x1+e.w, y2=y1+e.h, len=Math.hypot(e.w,e.h)||1, ux=e.w/len, uy=e.h/len, ex=ah?x2-ux*ah*.8:x2, ey=ah?y2-uy*ah*.8:y2;
    g='<line x1="'+x1+'" y1="'+y1+'" x2="'+ex+'" y2="'+ey+'" stroke="'+st+'" stroke-width="'+sw+'" stroke-linecap="'+(ah?'butt':'round')+'"/>';
    if(ah){ var bx=x2-ux*ah, by=y2-uy*ah, q=ah*.6; g+='<polygon points="'+x2+','+y2+' '+(bx-uy*q)+','+(by+ux*q)+' '+(bx+uy*q)+','+(by-ux*q)+'" fill="'+st+'"/>'; }
    if(edit) g+='<line class="hit" x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="transparent" stroke-width="'+Math.max(34,sw+24)+'" stroke-linecap="round"/>';
    d.style.cssText='left:'+l+'px;top:'+t+'px;width:'+bw+'px;height:'+bh+'px;'; }
  else { var w=e.w, h=e.h, f=colOf(e.fill,th)||'none', ln=sw&&st, s2=ln?sw/2:0, iw=Math.max(1,w-2*s2), ih=Math.max(1,h-2*s2), a=' fill="'+f+'"'+(ln?' stroke="'+st+'" stroke-width="'+sw+'" stroke-linejoin="round"':'')+(e.op<100&&f!=='none'?' fill-opacity="'+e.op/100+'"':'');
    bw=w; bh=h;
    g=e.k==='ell'?'<ellipse cx="'+w/2+'" cy="'+h/2+'" rx="'+iw/2+'" ry="'+ih/2+'"'+a+'/>':e.k==='tri'?'<polygon points="'+w/2+','+s2+' '+(w-s2)+','+(h-s2)+' '+s2+','+(h-s2)+'"'+a+'/>':
      e.k==='star'?'<polygon points="'+starPts(s2,s2,iw,ih)+'"'+a+'/>':'<rect x="'+s2+'" y="'+s2+'" width="'+iw+'" height="'+ih+'" rx="'+(e.k==='round'?Math.min(w,h)*.16667:0)+'"'+a+'/>';
    d.style.cssText='left:'+e.x+'px;top:'+e.y+'px;width:'+w+'px;height:'+h+'px;'; }
  d.innerHTML='<svg width="'+bw+'" height="'+bh+'" viewBox="0 0 '+bw+' '+bh+'" xmlns="http://www.w3.org/2000/svg">'+g+'</svg>';
  if(!isLine(e)&&(e.text||edit)){ var tb=shTextBox(e), x=document.createElement('div'), inn=document.createElement('div'); x.className='stx';
    x.style.cssText='left:'+tb.x+'px;top:'+tb.y+'px;width:'+tb.w+'px;height:'+tb.h+'px;color:'+shTextCol(e,th)+';text-align:'+({l:'left',c:'center',r:'right'}[e.al]||'center')+';'; if(e.fs) x.dataset.fm=e.fs;
    inn.className='in'; inn.textContent=e.text; if(edit){ inn.setAttribute('data-ph',T('글 쓰기')); inn.spellcheck=false; if(!e.text) inn.classList.add('ph'); } x.appendChild(inn); d.appendChild(x); }
  return d; }
/* the master: logo, footer text and slide number (the title and closing slides only when the master says so); shared by screen, print and .pptx.
   fpos / npos: l | c | r along the bottom, lpos: tl | tr | bl | br for the logo */
function footOf(s,th){ var i=deck?deck.slides.indexOf(s):-1, o=[], m=deck&&deck.master; if(i<0||!m||!m.on||((s.layout==='title'||s.layout==='closing')&&!m.ttl)) return o;
  if(m.logo&&m.lw&&m.lh){ var hh=LSZ[m.lsz], k=Math.min(hh/m.lh,hh*3.5/m.lw), w=Math.round(m.lw*k), h=Math.round(m.lh*k); o.push({logo:m.logo, w:w, h:h, x:m.lpos[1]==='l'?40:W-40-w, y:m.lpos[0]==='t'?24:H-24-h}); }
  var same=deck.footer&&deck.nums&&m.fpos===m.npos;
  if(deck.footer){ var fb=m.fpos==='l'?{x:same?200:90,w:same?790:900,al:'left'}:m.fpos==='c'?{x:340,w:600,al:'center'}:{x:90,w:same?990:1100,al:'right'}; o.push({t:deck.footer, x:fb.x, y:664, w:fb.w, h:20, fs:15, c:th.sub, al:fb.al}); }
  if(deck.nums){ var nb=m.npos==='l'?{x:90,al:'left'}:m.npos==='c'?{x:590,al:'center'}:{x:1090,al:'right'}; o.push({t:String(i+1), x:nb.x, y:same&&m.npos==='c'?640:664, w:100, h:20, fs:15, c:th.sub, al:nb.al}); }
  return o; }
/* a layout box, moved or resized by hand when the slide says so (s.pos) */
function boxOf(s,b){ var p=s.pos&&s.pos[b.f]; if(!p) return b; var o={}, k; for(k in b) o[k]=b[k]; o.x=p.x; o.y=p.y; o.w=p.w; o.h=p.h; return o; }
function boxDef(s,f){ var L=LAY[s.layout]||LAY.bullets; for(var i=0;i<L.length;i++) if(L[i].f===f) return boxOf(s,L[i]); return null; }
/* shrink the font until the text fits its box (results cached by content) */
var fitCache=new Map();
function fitBox(box,b,th,lay,fresh){
  var inn=box.firstChild, txt=inn.classList.contains('ph')?'\u0000'+inn.getAttribute('data-ph'):inn.innerText, key=th.id+(th.f||'')+'|'+lay+'|'+b.f+'|'+b.w+'x'+b.h+'|'+txt;
  fitIn(inn,box,b.fs,b.min,key,fresh); }
function fitIn(inn,box,hi,lo,key,fresh){
  var set=function(v){ inn.style.fontSize=v+'px'; };
  var over=function(){ return inn.scrollHeight>box.clientHeight+1||inn.scrollWidth>box.clientWidth+1; };
  if(!fresh&&fitCache.has(key)){ set(fitCache.get(key)); return; }
  var v=hi; set(hi);
  if(over()){ set(lo); if(!over()){ for(var i=0;i<7;i++){ var m=(lo+hi)/2; set(m); if(over()) hi=m; else lo=m; } } v=Math.floor(lo*2)/2; set(v); }
  if(fitCache.size>3000) fitCache.clear(); fitCache.set(key,v);
}
function fitShapes(el,th,fresh){ el.querySelectorAll('.stx').forEach(function(x){ var inn=x.firstChild, t=inn.classList.contains('ph')?'':inn.innerText, hi=+x.dataset.fm||SH_FS; if(!t.trim()){ inn.style.fontSize=hi+'px'; return; }
  fitIn(inn,x,hi,12,'shp'+hi+'|'+th.id+(th.f||'')+'|'+x.style.width+'x'+x.style.height+'|'+t,fresh); }); }
function fitAll(el,s,th,fresh){ el.querySelectorAll('.fld').forEach(function(box){ var b=boxDef(s,box.dataset.f); if(b) fitBox(box,b,th,s.layout,fresh); }); fitShapes(el,th,fresh); }
/* font size (slide px) of every field, measured off screen */
function measure(s,th){ var m=$('measure'); m.innerHTML=''; var el=slideEl(s,th,false); m.appendChild(el); fitAll(el,s,th);
  var o={}; el.querySelectorAll('.fld').forEach(function(box){ o[box.dataset.f]=parseFloat(box.firstChild.style.fontSize)||boxDef(s,box.dataset.f).fs; });
  el.querySelectorAll('.stx').forEach(function(x){ o['e:'+x.parentNode.dataset.e]=parseFloat(x.firstChild.style.fontSize)||SH_FS; }); m.innerHTML=''; return o; }

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
  ['dupBtn','delBtn','laySel','aiBtn','addBtn','themeBtn','notes','picBtn','shapeBtn','optBtn','sortBtn'].forEach(function(id){ $(id).disabled=!s||gen||busyOn||(id==='aiBtn'&&AILAYS.indexOf(s.layout)<0); });
  if(!s){ $('notes').value=''; selK=null; selBar(); return; }
  var el=slideEl(s,t,!gen&&!busyOn,{live:1}); host.appendChild(el); scaleMain(); fitAll(el,s,t,true);
  $('laySel').value=s.layout; if(document.activeElement!==$('notes')) $('notes').value=s.notes||''; drawSel();
}
function scaleMain(){
  /* the bottom strip (SELH) is kept for the bar of the picked box, so picking one never resizes the slide */
  var w=$('canvasWrap'), host=$('slideHost'), pad=w.clientWidth<600?12:22, wh=w.clientHeight-SELH, cw=w.clientWidth-pad*2, ch=wh-pad*2; if(cw<=0||ch<=0) return;
  var k=Math.min(cw/W,ch/H); host.style.width=W*k+'px'; host.style.height=H*k+'px'; host.style.left=(w.clientWidth-W*k)/2+'px'; host.style.top=(wh-H*k)/2+'px';
  var el=host.firstChild; if(el){ el.style.transform='scale('+k+')'; el.style.setProperty('--hk',(1/k).toFixed(3)); }
}
if(window.ResizeObserver) new ResizeObserver(function(){ scaleMain(); }).observe($('canvasWrap')); else window.addEventListener('resize',scaleMain);
function select(i,keepFocus){ blurEdit(); if(!deck.slides.length) return; if(i!==cur) selK=null; cur=Math.max(0,Math.min(i,deck.slides.length-1)); drawList(); drawMain();
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
  if(box.classList.contains('stx')){ var se=shapeOf(s,box.parentNode.dataset.e); if(!se) return; se.text=inn.innerText.replace(/\u00a0/g,' ').replace(/[ \t]*\n[ \t]*/g,'\n').replace(/^\n+|\n+$/g,''); inn.classList.toggle('ph',!se.text);
    fitShapes(box.parentNode,th(),true); saveSoon(); thumbSoon(cur); return; }
  s[f]=readField(inn,f); inn.classList.toggle('ph',empty(s,f));
  var b=boxDef(s,f); if(b) fitBox(box,b,th(),s.layout,true);
  saveSoon(); thumbSoon(cur);
});
host.addEventListener('focusout',function(e){
  var inn=e.target.closest&&e.target.closest('.in'); if(!inn) return; editSnap=null; var f=inn.parentNode.dataset.f, s=deck.slides[cur]; if(!s) return;
  if(inn.parentNode.classList.contains('stx')){ inn.contentEditable='false'; var se=shapeOf(s,inn.parentNode.parentNode.dataset.e); if(se&&!se.text){ inn.textContent=''; inn.classList.add('ph'); } updateThumb(cur); return; }
  if(LISTS.indexOf(f)>=0){ fillList(inn,s[f]); } else if(empty(s,f)){ inn.textContent=''; inn.classList.add('ph'); }
  var b=boxDef(s,f); if(b) fitBox(inn.parentNode,b,th(),s.layout,true);
  updateThumb(cur);
});
host.addEventListener('keydown',function(e){
  var inn=e.target.closest('.in'); if(!inn) return; e.stopPropagation(); var f=inn.parentNode.dataset.f;
  if(e.key==='Escape'){ inn.blur(); return; }
  if(e.key==='Enter'&&LISTS.indexOf(f)<0&&!(e.shiftKey&&(f==='quote'||f==='caption'||f==='subtitle'||!f))){ e.preventDefault(); inn.blur(); }
});
host.addEventListener('paste',function(e){
  var inn=e.target.closest&&e.target.closest('.in'); if(!inn) return; e.preventDefault();
  var t=(e.clipboardData||window.clipboardData).getData('text')||''; if(LISTS.indexOf(inn.parentNode.dataset.f)<0) t=t.replace(/\s*\n\s*/g,' ');
  document.execCommand('insertText',false,t);
});
host.addEventListener('click',function(e){
  if(noClick()) return; var box=e.target.closest('.fld'); if(!box||gen||busyOn) return; var inn=box.firstChild, ph=inn.classList.contains('ph');
  if(document.activeElement===inn&&e.target!==box&&!ph) return; // a press inside text being edited: the browser already put the caret there
  if(document.activeElement!==inn) inn.focus();
  /* the press on a box was held back (it may become a drag), so put the caret where it was pressed */
  try{ var r=null, gs=getSelection();
    if(!ph&&e.target!==box){ if(document.caretRangeFromPoint) r=document.caretRangeFromPoint(e.clientX,e.clientY); else if(document.caretPositionFromPoint){ var cp=document.caretPositionFromPoint(e.clientX,e.clientY); if(cp){ r=document.createRange(); r.setStart(cp.offsetNode,cp.offset); } } if(r&&!inn.contains(r.startContainer)) r=null; }
    if(r) r.collapse(true); else { r=document.createRange(); r.selectNodeContents(ph?inn.lastChild||inn:inn); r.collapse(ph); }
    gs.removeAllRanges(); gs.addRange(r); }catch(err){}
});
var nt=$('notes'), notesSnap=null;
nt.addEventListener('focus',function(){ notesSnap=snap(); });
nt.addEventListener('input',function(){ var s=deck.slides[cur]; if(!s) return; if(notesSnap){ pushUndo(notesSnap); notesSnap=null; } s.notes=nt.value; saveSoon(); });
nt.addEventListener('keydown',function(e){ e.stopPropagation(); });
$('deckName').addEventListener('input',function(){ deck.name=this.value; saveSoon(); });
$('deckName').addEventListener('change',function(){ if(!this.value.trim()){ deck.name=T('새 발표 자료'); this.value=deck.name; } saveNow(); });
$('deckName').addEventListener('keydown',function(e){ e.stopPropagation(); if(e.key==='Enter'||e.key==='Escape') this.blur(); });

/* ---------- free placement: press a box, picture or shape to pick it; drag it to move, drag the handles to resize (mouse, pen and touch).
   A press on text that is not being edited waits to see if it becomes a drag; a plain tap still starts typing. Moved layout boxes are kept in s.pos,
   shapes keep their own box. The frame and handles are drawn inside the slide (sizes times --hk = 1 / scale), so they stay the same size on screen. ---------- */
var selK=null, selNew=false, drg=null, SELH=46, nudgeT=0;
function shapeOf(s,id){ for(var i=0;i<s.els.length;i++) if(s.els[i].id===id) return s.els[i]; return null; }
function selShape(){ var s=deck&&deck.slides[cur]; return s&&selK&&selK.slice(0,2)==='e:'?shapeOf(s,selK.slice(2)):null; }
/* what is picked: 'e:id' one shape, 'g:gid' a whole group, 'm' several shapes picked together (selM = their ids), or a layout box / 'img' */
var selM=[], multiOn=false;
function selEls(s,k){ k=k||selK; if(!s||!k) return []; if(k==='m') return s.els.filter(function(e){ return selM.indexOf(e.id)>=0; }); if(k.slice(0,2)==='g:') return s.els.filter(function(e){ return e.g===k.slice(2); }); var e=k.slice(0,2)==='e:'&&shapeOf(s,k.slice(2)); return e?[e]:[]; }
function isMany(k){ return k==='m'||(k||'').slice(0,2)==='g:'; }
function unionBox(a){ var x0=1e9,y0=1e9,x1=-1e9,y1=-1e9; a.forEach(function(e){ x0=Math.min(x0,e.x,e.x+e.w); y0=Math.min(y0,e.y,e.y+e.h); x1=Math.max(x1,e.x,e.x+e.w); y1=Math.max(y1,e.y,e.y+e.h); }); return a.length?{x:x0,y:y0,w:x1-x0,h:y1-y0,ln:false}:null; }
function keyBox(s,k){ if(isMany(k)) return unionBox(selEls(s,k)); if(k.slice(0,2)==='e:'){ var e=shapeOf(s,k.slice(2)); return e?{x:e.x,y:e.y,w:e.w,h:e.h,ln:isLine(e)}:null; } var b=boxDef(s,k); return b?{x:b.x,y:b.y,w:b.w,h:b.h}:null; }
/* a group or a picked set moves and resizes as one: every member keeps its place inside the union box (sizes of text follow the smaller scale) */
function mapMembers(a,r0,r){ var sx=r0.w?r.w/r0.w:1, sy=r0.h?r.h/r0.h:1, q=Math.min(sx,sy);
  return a.map(function(e){ var c=JSON.parse(JSON.stringify(e)), L=isLine(e); c.x=Math.round(r.x+(e.x-r0.x)*sx); c.y=Math.round(r.y+(e.y-r0.y)*sy); c.w=Math.round(e.w*sx); c.h=Math.round(e.h*sy);
    if(!L){ c.w=Math.max(20,c.w); c.h=Math.max(20,c.h); if(e.fs) c.fs=num(e.fs*q,e.fs,8,400); } return c; }); }
function putBox(s,k,r){ if(isMany(k)){ var a=selEls(s,k), r0=unionBox(a); if(!r0) return; mapMembers(a,r0,r).forEach(function(c,i){ var e=a[i]; e.x=c.x; e.y=c.y; e.w=c.w; e.h=c.h; e.fs=c.fs; }); return; }
  if(k.slice(0,2)==='e:'){ var e=shapeOf(s,k.slice(2)); if(e){ e.x=r.x; e.y=r.y; e.w=r.w; e.h=r.h; } } else s.pos[k]={x:r.x, y:r.y, w:r.w, h:r.h}; }
function noClick(){ return host._noClick&&Date.now()-host._noClick<350; }
function frameEl(r){
  var f=document.createElement('div'); f.className='selFr'+(r.ln?' ln':'')+(r.y<70&&!r.ln?' low':'');
  var hd=function(h,x,y){ var d=document.createElement('div'); d.className='hd h-'+h; d.dataset.h=h; if(x!=null){ d.style.left=x+'px'; d.style.top=y+'px'; } f.appendChild(d); };
  if(r.ln){ f.style.cssText='left:0;top:0;width:0;height:0;'; hd('p0',r.x,r.y); hd('p1',r.x+r.w,r.y+r.h); return f; }
  f.style.cssText='left:'+r.x+'px;top:'+r.y+'px;width:'+r.w+'px;height:'+r.h+'px;';
  [['nw',0,0],['n',.5,0],['ne',1,0],['e',1,.5],['se',1,1],['s',.5,1],['sw',0,1],['w',0,.5]].forEach(function(q){ hd(q[0],q[1]*r.w,q[2]*r.h); });
  hd('mv'); f.lastChild.title=T('끌어서 옮기기'); return f; }
function drawSel(){
  var el=host.querySelector('.sl'), s=deck&&deck.slides[cur]; if(!el||!s||gen||busyOn){ selBar(); return; }
  [].forEach.call(el.querySelectorAll('.selFr'),function(x){ x.remove(); }); [].forEach.call(el.querySelectorAll('.isSel'),function(x){ x.classList.remove('isSel'); });
  var many=isMany(selK), mem=many?selEls(s,selK):[], node=selK&&el.querySelector('[data-bk="'+(many?(mem[0]?'e:'+mem[0].id:'-'):selK)+'"]'), r=node&&keyBox(s,selK); if(!r){ selK=null; selBar(); return; }
  var f=frameEl(r); if(many) mem.forEach(function(m){ var n=el.querySelector('[data-bk="e:'+m.id+'"]'); if(n) n.classList.add('isSel'); }); else node.classList.add('isSel'); f.classList.toggle('grp',many); el.appendChild(f); selBar();
  /* right after a tap picks a box, the handles let the tap's own click through (on touch it lands after the frame is drawn) */
  if(selNew){ selNew=false; f.classList.add('fresh'); setTimeout(function(){ f.classList.remove('fresh'); },450); } }
function setSel(k,force){ if(selK===k&&!force) return; selK=k; if(k!=='m') selM=[]; if(!k) multiOn=false; selNew=true; closeMenus(); drawSel(); }
/* snapping while moving: the slide's centre lines and the layout margins (90 px), with a guide line */
function snapMove(r,el){ var G=[], d=8, c;
  [[r.x,0],[r.x+r.w/2,r.w/2],[r.x+r.w,r.w]].some(function(q){ return [90,W/2,W-90].some(function(v){ if(Math.abs(q[0]-v)<d){ r.x=v-q[1]; G.push(['v',v]); return true; } }); });
  [[r.y,0],[r.y+r.h/2,r.h/2],[r.y+r.h,r.h]].some(function(q){ return [H/2].some(function(v){ if(Math.abs(q[0]-v)<d){ r.y=v-q[1]; G.push(['h',v]); return true; } }); });
  [].forEach.call(el.querySelectorAll('.guide'),function(x){ x.remove(); });
  G.forEach(function(g){ c=document.createElement('div'); c.className='guide '+g[0]; if(g[0]==='v') c.style.left=g[1]+'px'; else c.style.top=g[1]+'px'; el.appendChild(c); }); }
function dragRect(d,dx,dy,shift,el){ var r0=d.r0, r={x:r0.x,y:r0.y,w:r0.w,h:r0.h,ln:r0.ln}, h=d.h, M=24, a, L, q;
  if(h==='mv'){ r.x=r0.x+dx; r.y=r0.y+dy; if(!r.ln) snapMove(r,el); }
  else if(h==='p0'||h==='p1'){ /* one end of a line moves, the other stays */
    if(h==='p0'){ r.x=r0.x+dx; r.y=r0.y+dy; r.w=r0.w-dx; r.h=r0.h-dy; } else { r.w=r0.w+dx; r.h=r0.h+dy; }
    if(shift){ a=Math.atan2(r.h,r.w); L=Math.hypot(r.w,r.h); q=Math.round(a/(Math.PI/4))*(Math.PI/4); r.w=L*Math.cos(q); r.h=L*Math.sin(q); }
    else { if(Math.abs(r.h)<10) r.h=0; if(Math.abs(r.w)<10) r.w=0; }
    if(h==='p0'){ r.x=r0.x+r0.w-r.w; r.y=r0.y+r0.h-r.h; } }
  else { var l=r0.x, t=r0.y, rr=r0.x+r0.w, b=r0.y+r0.h;
    if(h.indexOf('w')>=0) l=Math.min(l+dx,rr-M); if(h.indexOf('e')>=0) rr=Math.max(rr+dx,l+M); if(h.indexOf('n')>=0) t=Math.min(t+dy,b-M); if(h.indexOf('s')>=0) b=Math.max(b+dy,t+M);
    if((shift||d.k==='img')&&h.length===2){ var ar=r0.w/r0.h, nw=rr-l, nh=b-t; if(nw/nh>ar) nw=nh*ar; else nh=nw/ar; if(h.indexOf('w')>=0) l=rr-nw; else rr=l+nw; if(h.indexOf('n')>=0) t=b-nh; else b=t+nh; }
    r.x=l; r.y=t; r.w=rr-l; r.h=b-t; }
  ['x','y','w','h'].forEach(function(k){ r[k]=Math.round(r[k]); }); return r; }
/* shows the new place while dragging, without redrawing the whole slide */
function livePlace(d){ var el=host.querySelector('.sl'), s=deck.slides[cur], r=d.r, node=el&&(isMany(d.k)?el:el.querySelector('[data-bk="'+d.k+'"]')); if(!node) return;
  if(isMany(d.k)){ var a=selEls(s,d.k); mapMembers(a,d.r0,r).forEach(function(c,i){ var n0=el.querySelector('[data-bk="e:'+a[i].id+'"]'), n2=shapeEl(c,th(),true); n2.classList.add('isSel'); if(n0) n0.parentNode.replaceChild(n2,n0); fitShapes(n2,th()); }); }
  else if(d.k.slice(0,2)==='e:'){ var e=shapeOf(s,d.k.slice(2)), c={}, q; for(q in e) c[q]=e[q]; c.x=r.x; c.y=r.y; c.w=r.w; c.h=r.h; var n2=shapeEl(c,th(),true); n2.classList.add('isSel'); node.parentNode.replaceChild(n2,node); fitShapes(n2,th()); }
  else { node.style.left=r.x+'px'; node.style.top=r.y+'px'; node.style.width=r.w+'px'; node.style.height=r.h+'px';
    if(node.classList.contains('fld')){ var b=boxDef(s,d.k), o={}, k; for(k in b) o[k]=b[k]; o.w=r.w; o.h=r.h; fitBox(node,o,th(),s.layout); } }
  var f=el.querySelector('.selFr'); if(f){ var nf=frameEl(r); if(isMany(d.k)) nf.classList.add('grp'); el.replaceChild(nf,f); } }
host.addEventListener('pointerdown',function(e){
  if(gen||busyOn||(e.pointerType==='mouse'&&e.button)) return; var s=deck.slides[cur], el=host.querySelector('.sl'); if(!s||!el) return;
  var hd=e.target.closest('.hd');
  if(hd&&selK){ e.preventDefault(); blurEdit(); drg={k:selK, h:hd.dataset.h, id:e.pointerId, x0:e.clientX, y0:e.clientY, r0:keyBox(s,selK), kk:host.offsetWidth/W, on:true}; try{ host.setPointerCapture(e.pointerId); }catch(err){} host.classList.add('dragging'); return; }
  if(e.target.closest('[data-rm],.lvEdit,iframe')) return;
  var node=e.target.closest('[data-bk]'); if(!node||!el.contains(node)){ var addm=e.shiftKey||e.ctrlKey||e.metaKey||multiOn; if(selK&&!addm){ blurEdit(); setSel(null); }
    if(e.pointerType!=='touch'&&!e.target.closest('.selFr,.ft')){ var rc=el.getBoundingClientRect(), kk=host.offsetWidth/W; mq={id:e.pointerId, x0:(e.clientX-rc.left)/kk, y0:(e.clientY-rc.top)/kk, rc:rc, kk:kk, on:false, add:addm, base:addm?selIdsNow():[]}; }
    return; }
  var k=node.dataset.bk, a=document.activeElement, editing=!!(a&&a.classList&&a.classList.contains('in')&&node.contains(a)), was=selK===k, sub=null;
  /* shapes: Shift / Ctrl (or the add-to-pick button) adds or takes away a shape; a shape in a group picks the whole group; a press on a member of the picked group or set moves them all, a tap on it picks just that shape */
  if(k.slice(0,2)==='e:'){ var se=shapeOf(s,k.slice(2));
    if(se&&(e.shiftKey||e.ctrlKey||e.metaKey||multiOn)){ e.preventDefault(); blurEdit(); toggleSel(s,se); return; }
    if(se&&(selK==='g:'+se.g&&se.g||selK==='m'&&selM.indexOf(se.id)>=0)){ sub=k; k=selK; was=false; }
    else if(se&&se.g) k='g:'+se.g; }
  setSel(k); if(editing) return; // pressing inside text being typed: normal text selection
  var txt=node.classList.contains('fld')||node.classList.contains('shp');
  if(e.pointerType==='mouse'&&txt){ e.preventDefault(); blurEdit(); }
  drg={k:k, h:'mv', id:e.pointerId, x0:e.clientX, y0:e.clientY, r0:keyBox(s,k), kk:host.offsetWidth/W, on:false, was:was, sub:sub, hold:e.pointerType==='mouse'&&txt};
});
/* picking several shapes: drag a rectangle on an empty place, or Shift / Ctrl + click; the result is one shape, one whole group, or a loose set */
var mq=null;
function selIdsNow(){ return selEls(deck.slides[cur]).map(function(e){ return e.id; }); }
function selectIds(ids,nodraw){ var s=deck.slides[cur]; ids=ids.filter(function(id,i){ return ids.indexOf(id)===i&&shapeOf(s,id); });
  var gs={}; ids.forEach(function(id){ var g=shapeOf(s,id).g; if(g) gs[g]=1; }); s.els.forEach(function(e){ if(e.g&&gs[e.g]&&ids.indexOf(e.id)<0) ids.push(e.id); }); // a group is never half picked
  var gk=Object.keys(gs);
  var k=!ids.length?null:ids.length===1?'e:'+ids[0]:gk.length===1&&s.els.filter(function(e){ return e.g===gk[0]; }).length===ids.length?'g:'+gk[0]:'m'; if(k==='m') selM=ids;
  if(nodraw){ selK=k; if(k!=='m') selM=[]; selNew=true; } else setSel(k,true); }
function toggleSel(s,se){ var unit=se.g?s.els.filter(function(e){ return e.g===se.g; }).map(function(e){ return e.id; }):[se.id], cur=selIdsNow(), has=unit.every(function(id){ return cur.indexOf(id)>=0; });
  selectIds(has?cur.filter(function(id){ return unit.indexOf(id)<0; }):cur.concat(unit)); }
host.addEventListener('pointermove',function(e){ if(!mq||e.pointerId!==mq.id) return; var x=(e.clientX-mq.rc.left)/mq.kk, y=(e.clientY-mq.rc.top)/mq.kk;
  if(!mq.on){ if(Math.hypot(x-mq.x0,y-mq.y0)*mq.kk<5) return; mq.on=true; blurEdit(); try{ host.setPointerCapture(e.pointerId); }catch(err){} mq.d=document.createElement('div'); mq.d.className='mq'; host.querySelector('.sl').appendChild(mq.d); }
  e.preventDefault(); mq.r={x:Math.min(x,mq.x0), y:Math.min(y,mq.y0), w:Math.abs(x-mq.x0), h:Math.abs(y-mq.y0)}; mq.d.style.cssText='left:'+mq.r.x+'px;top:'+mq.r.y+'px;width:'+mq.r.w+'px;height:'+mq.r.h+'px;'; });
function endMq(e,cancel){ if(!mq||e.pointerId!==mq.id) return; var m=mq; mq=null; if(!m.on) return; host._noClick=Date.now(); if(m.d) m.d.remove();
  var s=deck.slides[cur], r=m.r; if(cancel||!s||!r) return;
  var hit=s.els.filter(function(el2){ var b=unionBox([el2]); return b.x<r.x+r.w&&b.x+b.w>r.x&&b.y<r.y+r.h&&b.y+b.h>r.y; }).map(function(el2){ return el2.id; });
  selectIds(m.add?m.base.concat(hit):hit); }
host.addEventListener('pointerup',function(e){ endMq(e); }); host.addEventListener('pointercancel',function(e){ endMq(e,true); });
/* a held-back mouse press must not focus the text or start selecting it */
host.addEventListener('mousedown',function(e){ if(drg&&drg.hold) e.preventDefault(); });
host.addEventListener('pointermove',function(e){ if(!drg||e.pointerId!==drg.id) return;
  if(!drg.on){ if(Math.hypot(e.clientX-drg.x0,e.clientY-drg.y0)<(e.pointerType==='mouse'?4:8)) return; drg.on=true; blurEdit(); try{ host.setPointerCapture(e.pointerId); }catch(err){} host.classList.add('dragging'); }
  e.preventDefault(); drg.r=dragRect(drg,(e.clientX-drg.x0)/drg.kk,(e.clientY-drg.y0)/drg.kk,e.shiftKey,host.querySelector('.sl')); livePlace(drg); });
function endDrg(e,cancel){ if(!drg||e.pointerId!==drg.id) return; var d=drg; drg=null; host.classList.remove('dragging');
  if(!d.on){ host._tap={k:d.k, was:d.was, t:Date.now()}; if(d.sub) setSel(d.sub); return; }
  host._noClick=Date.now(); var s=deck.slides[cur];
  if(!cancel&&d.r&&s&&['x','y','w','h'].some(function(q){ return d.r[q]!==d.r0[q]; })){ pushUndo(); putBox(s,d.k,d.r); saveSoon(); updateThumb(cur); }
  drawMain(); }
host.addEventListener('pointerup',function(e){ endDrg(e); });
host.addEventListener('pointercancel',function(e){ endDrg(e,true); });
/* a second tap on a picked shape (or a double click) types inside it */
host.addEventListener('click',function(e){ var n=e.target.closest('.shp'), t=host._tap; if(!n||gen||busyOn||noClick()) return;
  if(t&&t.k===n.dataset.bk&&t.was&&Date.now()-t.t<1000) editShapeText(n.dataset.bk); });
host.addEventListener('dblclick',function(e){ var n=e.target.closest('.shp'); if(n&&!gen&&!busyOn) editShapeText(n.dataset.bk); });
function editShapeText(k){ if(selK!==k) setSel(k); var e=selShape(), inn=host.querySelector('[data-bk="'+k+'"] .stx .in'); if(!inn||!e||isLine(e)) return;
  if(document.activeElement===inn) return; inn.contentEditable=CE; inn.focus();
  try{ var r=document.createRange(); r.selectNodeContents(inn); r.collapse(false); var gs=getSelection(); gs.removeAllRanges(); gs.addRange(r); }catch(err){} }
/* arrow keys nudge the picked box (Shift: more); a run of presses is one undo step */
function nudge(dx,dy){ var s=deck.slides[cur], r=s&&selK&&keyBox(s,selK); if(!r) return; if(Date.now()-nudgeT>900) pushUndo(); nudgeT=Date.now(); r.x+=dx; r.y+=dy; putBox(s,selK,r); saveSoon(); thumbSoon(cur); drawMain(); }
function delSel(){ var s=deck.slides[cur], a=selEls(s); if(!s||!selK) return;
  if(a.length){ pushUndo(); var ks=a.map(function(e){ return 'e:'+e.id; }); s.els=s.els.filter(function(e){ return a.indexOf(e)<0; }); s.build=s.build.filter(function(b){ return ks.indexOf(b.k)<0; }); selK=null; selM=[]; changed(); toast(T('도형을 지웠어요')); }
  else if(selK==='img'&&s.img){ pushUndo(); s.img=''; s.iw=s.ih=0; changed(true); } }

/* ---------- shapes, builds and the bar of the picked box ---------- */
var SWC=['#ffffff','#111111','#3d7fe0','#ff8a3d','#2fb27a','#e0526b','#8a5ce0','#ffc93c'];
var SHI={rect:'<rect x="3" y="6" width="18" height="12"/>', round:'<rect x="3" y="6" width="18" height="12" rx="4"/>', ell:'<circle cx="12" cy="12" r="8"/>', tri:'<path d="M12 4l9 16H3z"/>',
  star:'<path d="M12 3l2.6 6 6.4.5-4.9 4.2 1.5 6.3L12 16.7 6.4 20l1.5-6.3L3 9.5l6.4-.5z"/>', text:'<path d="M5 6h14M12 6v13M9 19h6"/>', line:'<path d="M4 20L20 4"/>', arrow:'<path d="M4 20L19 5M11 5h8v8"/>'};
function addShape(k){ var s=deck.slides[cur]; if(!s||gen||busyOn) return; blurEdit(); pushUndo(); if(k==='text'){ var te=fixEl({id:uid(), k:'rect', x:380+s.els.length%6*24, y:300+s.els.length%6*24, w:520, h:140, fill:'', line:'', sw:0, text:'', al:'l'}); s.els.push(te); selK='e:'+te.id; changed(); setTimeout(function(){ editShapeText(selK); },60); return; }
  var n=s.els.length%6*24, L=k==='line'||k==='arrow', sq=k==='ell'||k==='star'||k==='tri';
  var e=fixEl({id:uid(), k:k, x:(L?440:sq?520:490)+n, y:(L?360:240)+n, w:L?400:sq?240:300, h:L?0:sq?240:200, fill:'ac', line:'fg', sw:L?6:0}); s.els.push(e); selK='e:'+e.id; changed(); }
/* emoji and icons: a big text-only shape (no fill, no outline), so it moves, resizes, builds and exports like any shape */
var EMOJIS=['⭐','❤️','👍','👏','🎉','✅','❌','❓','❗','💡','🎯','📌','🔥','🚀','🏆','📖','✏️','🔬','🧪','🌍','🌱','☀️','🌙','☁️','⚡','🍎','🎵','😀','😎','🤔','😮','😢','👀','🙌','🧠','⏰','📅','💬','🔔','🏳️','➡️','⬅️','⬆️','⬇️','➕','➖','✖️','➗'];
function addEmoji(ch){ var s=deck.slides[cur]; if(!s||gen||busyOn) return; blurEdit(); pushUndo(); var n=s.els.length%6*24;
  var e=fixEl({id:uid(), k:'rect', x:520+n, y:240+n, w:240, h:240, fill:'', line:'', sw:0, text:ch, fs:200}); s.els.push(e); selK='e:'+e.id; changed(); }
/* crop the picture into a shape; a circle starts as a square in the middle of the picture's box */
function setPicShape(v){ var s=deck.slides[cur]; if(!s||!s.img||s.ish===v) return; blurEdit(); pushUndo(); s.ish=v; var b=boxDef(s,'img');
  if(v==='ell'&&b&&Math.abs(b.w-b.h)>2){ var q=Math.min(b.w,b.h); s.pos.img={x:Math.round(b.x+(b.w-q)/2), y:Math.round(b.y+(b.h-q)/2), w:q, h:q}; } changed(); }
/* line things up on the slide (picked box, picture or shape) */
function alignSel(m){ var s=deck.slides[cur], r=s&&selK&&keyBox(s,selK); if(!r) return; var M=48, bx=r.ln?Math.min(r.x,r.x+r.w):r.x, by=r.ln?Math.min(r.y,r.y+r.h):r.y, bw=Math.abs(r.w), bh=Math.abs(r.h), dx=0, dy=0;
  if(m==='l') dx=M-bx; else if(m==='ch') dx=Math.round((W-bw)/2)-bx; else if(m==='r') dx=W-M-bw-bx; else if(m==='t') dy=M-by; else if(m==='cv') dy=Math.round((H-bh)/2)-by; else if(m==='b') dy=H-M-bh-by; else return;
  blurEdit(); pushUndo(); putBox(s,selK,{x:r.x+dx,y:r.y+dy,w:r.w,h:r.h,ln:r.ln}); changed(); }
/* copy a shape and paste it on any slide or deck (also through the system clipboard, so Ctrl+C / Ctrl+V work) */
var CLIPK='ffslides.clip', CLIPP='FFSLIDES_EL:', clipEl=null;
function readClip(){ if(!clipEl){ try{ var j=localStorage.getItem(CLIPK); if(j) clipEl=JSON.parse(j); }catch(x){} } return clipEl&&!Array.isArray(clipEl)?[clipEl]:clipEl; }
function copySel(){ var s=deck.slides[cur], a=selEls(s); if(!a.length) return toast(T('복사할 도형을 먼저 골라 주세요')); clipEl=JSON.parse(JSON.stringify(a)); var j=JSON.stringify(clipEl);
  try{ localStorage.setItem(CLIPK,j); }catch(x){} try{ if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(CLIPP+j).catch(function(){}); }catch(x){}
  toast(T('복사했어요. 다른 슬라이드에서 붙여넣기를 눌러요')); selBar(); }
/* copies of shapes (a group stays a group, with a new group id), put on top and picked */
function addCopies(s,src,dx,dy,clamp){ src=Array.isArray(src)?src:[src]; var gm={}, out=[];
  src.forEach(function(o){ var c=fixEl(JSON.parse(JSON.stringify(o))); if(!c) return; c.id=uid(); if(c.g){ gm[c.g]=gm[c.g]||uid(); c.g=gm[c.g]; }
    c.x=c.x+dx; c.y=c.y+dy; if(clamp){ c.x=Math.max(-100,Math.min(1200,c.x)); c.y=Math.max(-100,Math.min(640,c.y)); } out.push(c); });
  var gc={}; out.forEach(function(c){ if(c.g) gc[c.g]=(gc[c.g]||0)+1; }); out.forEach(function(c){ if(c.g&&gc[c.g]<2) c.g=''; });
  out.forEach(function(c){ s.els.push(c); }); selectIds(out.map(function(c){ return c.id; }),true); return out; }
function pasteEl(src){ var s=deck&&deck.slides[cur]; src=src||readClip(); if(!s||!src||gen||busyOn) return; src=Array.isArray(src)?src:[src]; if(s.els.length+src.length>80) return toast(T('도형이 너무 많아요'));
  blurEdit(); pushUndo(); var n=s.els.length%6*24||20; addCopies(s,src,n,n,src.length===1); changed(); }
function dupSel(){ var s=deck.slides[cur], a=selEls(s); if(!s||!a.length) return; if(s.els.length+a.length>80) return toast(T('도형이 너무 많아요')); pushUndo(); addCopies(s,a,30,30,false); changed(); }
/* group / ungroup, and the order of the layers: back shapes (behind the text), the text boxes, front shapes */
function zItems(s){ return s.els.filter(function(e){ return e.back; }).concat([null],s.els.filter(function(e){ return !e.back; })); }
function zApply(s,items){ var t=items.indexOf(null); items.forEach(function(e,i){ if(e) e.back=i<t; }); s.els=items.filter(Boolean); }
function zKey(items){ return items.map(function(e){ return e?e.id:'-'; }).join(); }
function groupSel(){ var s=deck.slides[cur], a=selEls(s); if(selK!=='m'||a.length<2) return; pushUndo(); var gid=uid(), items=zItems(s), top=0;
  items.forEach(function(e,i){ if(e&&a.indexOf(e)>=0) top=i; }); var mem=items.filter(function(e){ return e&&a.indexOf(e)>=0; }), rest=items.filter(function(e){ return !e||a.indexOf(e)<0; });
  rest.splice.apply(rest,[top-mem.length+1,0].concat(mem)); mem.forEach(function(e){ e.g=gid; }); zApply(s,rest); selK=null; setSel('g:'+gid); changed(); toast(T('도형을 묶었어요')); }
function ungroupSel(){ var s=deck.slides[cur], a=selEls(s); if(!isMany(selK)||selK==='m'||!a.length) return; pushUndo(); var ids=a.map(function(e){ return e.id; }); a.forEach(function(e){ e.g=''; }); selK=null; selM=ids; setSel('m',true); changed(); toast(T('도형 묶음을 풀었어요')); }
function layerSel(m){ var s=deck.slides[cur], a=selEls(s); if(!s||!a.length) return; var items=zItems(s), before=zKey(items)+items.map(function(e){ return e?+!!e.back:''; }).join();
  var isM=function(it){ return it&&a.indexOf(it)>=0; }, sw=function(i,j){ var t=items[i]; items[i]=items[j]; items[j]=t; }, i;
  if(m==='front') items=items.filter(function(it){ return !isM(it); }).concat(items.filter(isM));
  else if(m==='back') items=items.filter(isM).concat(items.filter(function(it){ return !isM(it); }));
  else if(m==='fwd'){ for(i=items.length-2;i>=0;i--) if(isM(items[i])&&!isM(items[i+1])) sw(i,i+1); }
  else if(m==='bwd'){ for(i=1;i<items.length;i++) if(isM(items[i])&&!isM(items[i-1])) sw(i,i-1); }
  var t=items.indexOf(null), after=zKey(items)+items.map(function(e,k){ return e?+(k<t):''; }).join(); if(after===before) return toast(T(m==='front'||m==='fwd'?'이미 맨 앞이에요':'이미 맨 뒤예요'));
  pushUndo(); zApply(s,items); changed(); toast(T(m==='front'?'맨 앞으로 가져왔어요':m==='back'?'맨 뒤로 보냈어요':m==='fwd'?'한 칸 앞으로':'한 칸 뒤로')); }
/* a table-of-contents slide from the other slides' titles */
function makeToc(){ if(!deck.slides.length||gen||busyOn) return; var t=[]; deck.slides.forEach(function(x,i){ if(x.hide||x.layout==='title'||x.layout==='closing') return; var h=(x.title||(x.layout==='quote'?'':x.stat)||'').trim(); if(h) t.push((x.layout==='section'?'':'')+h); });
  if(!t.length) return toast(T('제목이 있는 슬라이드가 없어요'));
  blurEdit(); pushUndo(); var ns=blank('bullets'); ns.title=T('차례'); ns.bullets=t.slice(0,12); var at=deck.slides[0]&&deck.slides[0].layout==='title'?1:0; deck.slides.splice(at,0,ns); cur=at; selK=null; changed(true); toast(F('차례 슬라이드를 만들었어요 ({0}개 제목)',ns.bullets.length)); }
/* find and replace in every slide's text (titles, lists, shape text, notes) */
function frFields(f){ var o=[]; deck.slides.forEach(function(s){ LISTS.forEach(function(k){ (s[k]||[]).forEach(function(v,i){ o.push({g:s[k],i:i,v:v,set:function(x){ s[k][i]=x; }}); }); }); TEXTS.forEach(function(k){ if(k==='ctype'||k==='bg') return; if(typeof s[k]==='string'&&s[k]) o.push({v:s[k],set:function(x){ s[k]=x; }}); }); (s.els||[]).forEach(function(e){ if(e.text) o.push({v:e.text,set:function(x){ e.text=x; }}); }); }); return o; }
function frCount(q,cs){ if(!q) return 0; var n=0, re=new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),cs?'g':'gi'); frFields().forEach(function(o){ var m=o.v.match(re); if(m) n+=m.length; }); return n; }
function frDo(q,r,cs){ var re=new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),cs?'g':'gi'), n=0; var fl=frFields(); fl.forEach(function(o){ var m=o.v.match(re); if(m){ n+=m.length; } }); if(!n) return 0;
  blurEdit(); pushUndo(); fl.forEach(function(o){ if(re.test(o.v)){ re.lastIndex=0; o.set(o.v.replace(re,function(){ return r; })); } re.lastIndex=0; }); fitCache.clear(); changed(true); return n; }
function buildIx(s,k){ for(var i=0;i<s.build.length;i++) if(s.build[i].k===k) return i; return -1; }
function selKeys(s){ var a=selEls(s); return a.length?a.map(function(e){ return 'e:'+e.id; }):selK?[selK]:[]; }
function setAnim(a){ var s=deck.slides[cur]; if(!s||!selK) return; var ks=selKeys(s), i=buildIx(s,ks[0]); if(a==='none'&&ks.every(function(k){ return buildIx(s,k)<0; })||ks.length===1&&i>=0&&s.build[i].a===a) return; pushUndo();
  ks.forEach(function(k){ var j=buildIx(s,k); if(a==='none'){ if(j>=0) s.build.splice(j,1); } else if(j>=0) s.build[j].a=a; else s.build.push({k:k, a:a}); }); changed(); }
function moveBuild(d){ var s=deck.slides[cur], i=s?buildIx(s,selKeys(s)[0]):-1, j=i+d; if(i<0||j<0||j>=s.build.length) return; pushUndo(); var x=s.build.splice(i,1)[0]; s.build.splice(j,0,x); changed(); }
function selBar(){ var b=$('selBar'), s=deck&&deck.slides[cur]; b.innerHTML=''; b.hidden=!s||gen||busyOn;
  if(!selK){ b.className='selBar hint'; b.textContent=T('글상자·그림·도형을 누르면 끌어서 옮기고 모서리로 크기를 바꿀 수 있어요. 빈 곳을 끌거나 Shift를 누르고 누르면 여러 개를 고를 수 있어요'); if(readClip()){ var pb=document.createElement('button'); pb.className='tbtn'; pb.dataset.sb='paste'; pb.textContent=T('붙여넣기'); b.appendChild(pb); } return; }
  b.className='selBar'; var e=selShape(), mem=selEls(s), bi=mem.length?buildIx(s,'e:'+mem[0].id):buildIx(s,selK), many=isMany(selK);
  var add=function(k,txt,dis){ var x=document.createElement('button'); x.className='tbtn'; x.dataset.sb=k; x.textContent=T(txt); if(dis) x.disabled=true; b.appendChild(x); return x; };
  if(e){ if(!isLine(e)) add('fill','채우기'); add('line',isLine(e)?'선 색·굵기':'테두리'); if(!isLine(e)) add('text','글 쓰기'); }
  if(selK==='img'&&s.img){ add('pshape','모양 자르기').classList.toggle('on',s.ish!=='rect'); add('pborder','테두리').classList.toggle('on',!!(s.ibw&&s.ibc)); }
  if(many) add('many',F('{0}개 골랐어요',mem.length),true);
  if(selK==='m') add('group','그룹으로 묶기');
  if(selK.slice(0,2)==='g:') add('ungroup','그룹 풀기');
  add('anim',bi>=0?F('나타나기 {0}번',bi+1):'나타나는 효과').classList.toggle('on',bi>=0);
  if(e&&!isLine(e)) add('talign','글 정렬');
  add('align','맞추기');
  if(mem.length){ add('layer','겹침 순서'); add('multi','여러 개 고르기').classList.toggle('on',multiOn); add('dup','복제'); add('copy','복사'); add('del','지우기').classList.add('dang'); }
  else { add('reset','원래 자리로',!s.pos[selK]); if(selK==='img'&&s.img) add('del','그림 빼기').classList.add('dang'); } }
function drawElMenu(kind){ var m=$('elMenu'), s=deck.slides[cur], e=selShape(), t=eth(s,th()); m.innerHTML='';
  var hd=function(txt){ var d=document.createElement('div'); d.className='mh'; d.textContent=T(txt); m.appendChild(d); };
  var add=function(k,txt,on,dis){ var b=document.createElement('button'); b.dataset.o=k; b.textContent=(on?'✓ ':'')+T(txt); if(dis) b.disabled=true; m.appendChild(b); return b; };
  if(kind==='shape'){ hd('도형 넣기'); var g=document.createElement('div'); g.className='shg'; m.appendChild(g);
    SHAPES.forEach(function(q){ var b=document.createElement('button'); b.dataset.o='sh:'+q[0]; b.innerHTML='<svg viewBox="0 0 24 24">'+SHI[q[0]]+'</svg><span></span>'; b.lastChild.textContent=T(q[1]); g.appendChild(b); }); return; }
  if(kind==='layer'){ hd('겹치는 순서'); add('ly:front','맨 앞으로'); add('ly:fwd','앞으로'); add('ly:bwd','뒤로'); add('ly:back','맨 뒤로'); m.appendChild(document.createElement('hr')); hd('맨 뒤로 보낸 도형은 글 뒤에 놓여요'); return; }
  if(kind==='pshape'){ hd('그림을 이 모양으로 자르기'); [['rect','네모 (그대로)'],['round','둥근 네모'],['ell','원']].forEach(function(q){ add('ps:'+q[0],q[1],s.ish===q[0]); }); return; }
  if(kind==='pborder'){ hd('그림 테두리 색'); var rw=document.createElement('div'); rw.className='swr'; m.appendChild(rw);
    var sw0=function(v,bg,label){ var b=document.createElement('button'); b.className='sw'+(s.ibc===v?' on':'')+(v===''?' none':''); b.dataset.o='pc:'+v; b.style.background=bg; b.title=T(label||v); b.setAttribute('aria-label',T(label||v)); rw.appendChild(b); };
    sw0('','transparent','없음'); sw0('ac',t.ac,'테마 강조색'); sw0('fg',t.fg,'테마 글자색'); SWC.forEach(function(c){ sw0(c,c); });
    var pc=document.createElement('input'); pc.type='color'; pc.value=/^#/.test(s.ibc)?s.ibc:colOf(s.ibc,t)||'#3d7fe0'; pc.title=T('직접 고르기'); pc.setAttribute('aria-label',T('직접 고르기')); rw.appendChild(pc);
    pc.addEventListener('pointerdown',function(){ if(!pc._u){ pc._u=1; pushUndo(); } });
    pc.addEventListener('input',function(){ var x=deck.slides[cur]; if(!x) return; if(!pc._u){ pc._u=1; pushUndo(); } x.ibc=pc.value; if(!x.ibw) x.ibw=6; saveSoon(); updateThumb(cur); drawMain(); });
    pc.addEventListener('change',function(){ closeMenus(); });
    m.appendChild(document.createElement('hr')); hd('굵기'); [0,3,6,10,16].forEach(function(w){ add('pw:'+w,w?F('{0}px',w):'없음',s.ibw===w&&(w===0||!!s.ibc)); }); return; }
  if(kind==='anim'){ var i=buildIx(s,selKeys(s)[0]), a=i>=0?s.build[i].a:'none'; hd('발표할 때 누를 때마다 하나씩 나타나요');
    add('an:none','효과 없음 (처음부터 보이기)',a==='none'); add('an:fade','서서히 나타나기',a==='fade'); add('an:fly','날아 들어오기',a==='fly');
    if(i>=0&&selKeys(s).length===1){ m.appendChild(document.createElement('hr')); hd(F('{0}번째로 나타나요 (모두 {1}개)',i+1,s.build.length)); add('an:up','더 먼저 나타나기',0,i===0); add('an:down','더 나중에 나타나기',0,i===s.build.length-1); }
    return; }
  if(kind==='align'){ hd('슬라이드에서 맞추기'); [['l','왼쪽'],['ch','가로 가운데'],['r','오른쪽'],['t','위쪽'],['cv','세로 가운데'],['b','아래쪽']].forEach(function(q){ add('al2:'+q[0],q[1]); }); return; }
  if(kind==='talign'){ hd('글자 정렬'); [['l','왼쪽'],['c','가운데'],['r','오른쪽']].forEach(function(q){ add('al:'+q[0],q[1],e&&e.al===q[0]); }); return; }
  if(kind==='emoji'){ hd('이모지 넣기'); var g2=document.createElement('div'); g2.className='emg'; m.appendChild(g2); EMOJIS.forEach(function(c){ var b=document.createElement('button'); b.dataset.o='em:'+c; b.textContent=c; g2.appendChild(b); }); return; }
  if(!e) return; var key=kind==='fill'?'fill':'line', L=isLine(e); m._k=key;
  hd(kind==='fill'?'채우기 색':L?'선 색':'테두리 색'); var row=document.createElement('div'); row.className='swr'; m.appendChild(row);
  var sw=function(v,bg,label){ var b=document.createElement('button'); b.className='sw'+(e[key]===v?' on':'')+(v===''?' none':''); b.dataset.o='c:'+v; b.style.background=bg; b.title=T(label||v); b.setAttribute('aria-label',T(label||v)); row.appendChild(b); };
  if(!L) sw('','transparent','없음'); sw('ac',t.ac,'테마 강조색'); sw('fg',t.fg,'테마 글자색'); SWC.forEach(function(c){ sw(c,c); });
  var ci=document.createElement('input'); ci.type='color'; ci.value=/^#/.test(e[key])?e[key]:colOf(e[key],t)||'#3d7fe0'; ci.title=T('직접 고르기'); ci.setAttribute('aria-label',T('직접 고르기')); row.appendChild(ci);
  ci.addEventListener('pointerdown',function(){ if(!ci._u){ ci._u=1; pushUndo(); } });
  ci.addEventListener('input',function(){ var x=selShape(); if(!x) return; if(!ci._u){ ci._u=1; pushUndo(); } x[key]=ci.value; if(key==='line'&&!x.sw) x.sw=4; saveSoon(); updateThumb(cur); drawMain(); });
  ci.addEventListener('change',function(){ closeMenus(); });
  if(kind==='fill'&&!L){ m.appendChild(document.createElement('hr')); hd('투명도'); [100,80,60,40,20].forEach(function(v){ add('o:'+v,v+'%',(e.op||100)===v); }); }
  if(kind==='line'){ m.appendChild(document.createElement('hr')); hd('굵기'); (L?[2,4,6,10,16]:[2,4,8,12]).forEach(function(w){ add('w:'+w,F('{0}px',w),e.sw===w&&(L||!!e.line)); }); } }
$('emojiBtn').onclick=function(){ if(!deck.slides.length||gen||busyOn) return; blurEdit(); drawElMenu('emoji'); openMenu($('elMenu'),this); };
$('shapeBtn').onclick=function(){ if(!deck.slides.length||gen||busyOn) return; blurEdit(); drawElMenu('shape'); openMenu($('elMenu'),this); };
$('selBar').addEventListener('click',function(e){ var x=e.target.closest('[data-sb]'); if(!x||x.disabled) return; var k=x.dataset.sb, s=deck.slides[cur], sh=selShape(); if(k==='paste') return pasteEl(); if(!s||!selK) return;
  if(k==='fill'||k==='line'||k==='anim'||k==='align'||k==='talign'||k==='layer'||k==='pshape'||k==='pborder'){ blurEdit(); drawElMenu(k); openMenu($('elMenu'),x); return; }
  if(k==='group') return groupSel();
  if(k==='ungroup') return ungroupSel();
  if(k==='multi'){ multiOn=!multiOn; selBar(); toast(T(multiOn?'도형을 누르면 하나씩 더하거나 빼요':'여러 개 고르기를 껐어요')); return; }
  if(k==='copy') return copySel();
  if(k==='text') return editShapeText(selK);
  blurEdit();
  if(k==='reset'){ if(!s.pos[selK]) return; pushUndo(); delete s.pos[selK]; changed(); }
  else if(k==='del') delSel();
  else if(k==='dup') dupSel(); });
$('elMenu').addEventListener('click',function(ev){ var b=ev.target.closest('[data-o]'); if(!b||b.disabled) return; var k=b.dataset.o, e=selShape(), s=deck.slides[cur];
  if(k.indexOf('sh:')===0){ closeMenus(); return addShape(k.slice(3)); }
  if(k.indexOf('em:')===0){ closeMenus(); return addEmoji(k.slice(3)); }
  if(k.indexOf('al2:')===0){ closeMenus(); return alignSel(k.slice(4)); }
  if(k.indexOf('ly:')===0){ closeMenus(); return layerSel(k.slice(3)); }
  if(k.indexOf('ps:')===0){ closeMenus(); return setPicShape(k.slice(3)); }
  if(k.indexOf('pc:')===0){ closeMenus(); if(s.ibc===k.slice(3)) return; pushUndo(); s.ibc=k.slice(3); if(s.ibc&&!s.ibw) s.ibw=6; changed(); return; }
  if(k.indexOf('pw:')===0){ closeMenus(); var w=+k.slice(3); pushUndo(); s.ibw=w; if(w&&!s.ibc) s.ibc='fg'; changed(); return; }
  if(k==='an:up'||k==='an:down'){ moveBuild(k==='an:up'?-1:1); drawElMenu('anim'); return; }
  if(k.indexOf('an:')===0){ closeMenus(); return setAnim(k.slice(3)); }
  if(!e||!s) return; closeMenus(); pushUndo();
  if(k.indexOf('c:')===0){ var key=$('elMenu')._k; e[key]=k.slice(2); if(key==='line'&&e[key]&&!e.sw) e.sw=4; }
  else if(k.indexOf('w:')===0){ e.sw=+k.slice(2); if(!e.line) e.line='fg'; }
  else if(k.indexOf('o:')===0){ e.op=+k.slice(2); }
  else if(k.indexOf('al:')===0){ e.al=k.slice(3); }
  changed(); });

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
  s.layout=lay; s.pos={}; changed(); if(lay==='image'&&!s.img) pickImage(); else if((lay==='table'||lay==='chart')&&!s.data.trim()) openData(); else if(lay==='live'&&!liveCfg(s)) openLive(); }
function setTheme(id){ if(deck.theme===id) return; blurEdit(); if(deck.slides.length) pushUndo(); deck.theme=id; saveSoon(); if(deck.slides.length){ drawList(); drawMain(); } else drawStart(); drawThemes(); }
$('undoBtn').onclick=doUndo; $('redoBtn').onclick=doRedo;
$('addBtn').onclick=function(){ addSlide('bullets'); };
$('dupBtn').onclick=dupSlide; $('delBtn').onclick=delSlide;

/* ---------- slide options: skip when presenting, background colour, order, deck font and transition ---------- */
var BGS=['#ffffff','#fff4c2','#ffe0e0','#dcecff','#dcf5e3','#2b2b3a','#0b3954'], TRANS=[['fade','부드럽게 나타나기'],['slide','옆으로 밀기'],['zoom','커지며 나타나기'],['none','효과 없음']];
function toggleHide(){ var s=deck.slides[cur]; if(!s||gen||busyOn) return; blurEdit(); pushUndo(); s.hide=!s.hide; changed(true); toast(s.hide?T('발표할 때 이 슬라이드를 건너뛰어요'):T('이 슬라이드를 다시 보여 줘요')); }
function setBg(c){ var s=deck.slides[cur]; if(!s) return; blurEdit(); pushUndo(); s.bg=c; changed(); }
function setFont(f){ if(deck.font===f) return; blurEdit(); pushUndo(); deck.font=f; fitCache.clear(); changed(true); }
/* each slide can have its own transition (s.tr); '' follows the deck's (deck.trans) */
function trOf(s){ return s&&s.tr||deck.trans; }
function setTrans(t){ var s=deck.slides[cur]; if(!s) return; var v=t===deck.trans?'':t; if(s.tr===v) return; pushUndo(); s.tr=v; saveSoon(); }
function setTransAll(){ var t=trOf(deck.slides[cur]); pushUndo(); deck.trans=t; deck.slides.forEach(function(x){ x.tr=''; }); saveSoon(); }
function drawOptMenu(){ var m=$('optMenu'), s=deck.slides[cur]; m.innerHTML=''; if(!s) return;
  var add=function(k,txt,on,dis){ var b=document.createElement('button'); b.dataset.o=k; b.textContent=(on?'✓ ':'')+T(txt); if(dis) b.disabled=true; m.appendChild(b); return b; };
  var hd=function(txt){ var d=document.createElement('div'); d.className='mh'; d.textContent=T(txt); m.appendChild(d); };
  add('hide',s.hide?'숨긴 슬라이드 보이기 (H)':'발표할 때 건너뛰기 (H)');
  if(s.layout==='table'||s.layout==='chart') add('data',s.layout==='chart'?'그래프 내용 고치기':'표 내용 고치기');
  if(s.layout==='live') add('live','살아있는 화면 고치기');
  add('auto',s.sec?(s.sec<0?'자동 넘기기: 이 슬라이드에서 멈춤':F('자동 넘기기: 이 슬라이드 {0}초',s.sec)):'자동 넘기기 시간…');
  add('first','맨 앞으로 보내기',0,cur===0); add('last','맨 뒤로 보내기',0,cur===deck.slides.length-1);
  m.appendChild(document.createElement('hr')); hd('이 슬라이드 배경색');
  var row=document.createElement('div'); row.className='swr';
  BGS.forEach(function(c){ var b=document.createElement('button'); b.className='sw'+(s.bg===c?' on':''); b.dataset.o='bg:'+c; b.style.background=c; b.setAttribute('aria-label',c); row.appendChild(b); });
  var ci=document.createElement('input'); ci.type='color'; ci.id='bgIn'; ci.value=s.bg||'#ffffff'; ci.title=T('직접 고르기'); ci.setAttribute('aria-label',T('직접 고르기')); row.appendChild(ci);
  m.appendChild(row); add('bg:','테마 배경으로 되돌리기',0,!s.bg);
  m.appendChild(document.createElement('hr')); hd('글꼴 (모든 슬라이드)');
  FONTS.forEach(function(f){ add('font:'+f[0],f[1],deck.font===f[0]); });
  m.appendChild(document.createElement('hr')); hd('넘어가는 효과 (이 슬라이드)');
  var tr=trOf(s); TRANS.forEach(function(t){ add('tr:'+t[0],t[1],tr===t[0]); });
  add('trAll','모든 슬라이드에 같은 효과',0,deck.trans===tr&&deck.slides.every(function(x){ return !x.tr; }));
  ci.addEventListener('input',function(){ var s=deck.slides[cur]; if(s){ s.bg=ci.value; updateThumb(cur); drawMain(); saveSoon(); } });
  ci.addEventListener('change',function(){ closeMenus(); });
  ci.addEventListener('pointerdown',function(){ if(!ci._u){ ci._u=1; pushUndo(); } });
}
$('optBtn').onclick=function(){ if(!deck.slides.length) return; blurEdit(); drawOptMenu(); openMenu($('optMenu'),this); };
$('optMenu').addEventListener('click',function(e){ var b=e.target.closest('[data-o]'); if(!b||b.disabled) return; var k=b.dataset.o; closeMenus();
  if(k==='hide') toggleHide(); else if(k==='data') openData(); else if(k==='live') openLive(); else if(k==='auto') openAuto(); else if(k==='first') moveSlide(cur,0); else if(k==='last') moveSlide(cur,deck.slides.length-1);
  else if(k.indexOf('bg:')===0) setBg(k.slice(3)); else if(k.indexOf('font:')===0) setFont(k.slice(5)); else if(k.indexOf('tr:')===0){ setTrans(k.slice(3)); toast(T('저장했어요')); } else if(k==='trAll'){ setTransAll(); toast(T('모든 슬라이드에 같은 효과를 넣었어요')); } });

/* table and chart data: one text box, the slide draws it */
function openData(){ var s=deck.slides[cur]; if(!s||(s.layout!=='table'&&s.layout!=='chart')||gen||busyOn) return; var ch=s.layout==='chart'; blurEdit();
  $('dataTitle').textContent=ch?T('그래프 내용'):T('표 내용');
  $('dataNote').textContent=ch?T('한 줄에 하나씩 "이름: 숫자"로 써요. 예) 사과: 12 (12줄까지)'):T('한 줄이 한 행이고, 칸은 쉼표·탭·|로 나눠요. 첫 줄은 제목 줄이에요. (9줄, 6칸까지)');
  $('dataIn').placeholder=ch?T('사과: 12\n바나나: 7\n포도: 9'):T('이름, 점수, 등수\n하늘, 92, 1\n바다, 88, 2');
  $('dataIn').value=s.data; $('dataTypeRow').hidden=!ch; $('dataType').value=s.ctype; openDlg('dataDlg'); setTimeout(function(){ $('dataIn').focus(); },60); }
$('dataOk').onclick=function(){ var s=deck.slides[cur]; if(!s) return closeDlg('dataDlg',null); pushUndo(); s.data=$('dataIn').value.replace(/\r/g,'').trim(); s.ctype=$('dataType').value; closeDlg('dataDlg',null); changed(); };
$('dataIn').addEventListener('keydown',function(e){ e.stopPropagation(); if(e.key==='Escape') closeDlg('dataDlg',null); });
/* live screen dialog */
/* LABX: only the fallback names of the first 9 experiments (old decks, and if the Lab page cannot be read); the real list comes from Lab itself (loadLabCat) */
var LABX=[['func','함수 그래프'],['prob','확률 실험'],['trig','단위원과 삼각함수'],['proj','포물선 운동'],['pend','진자'],['spring','용수철과 훅의 법칙'],['refr','빛의 굴절'],['wave','파동의 간섭'],['ohm','전기 회로와 옴의 법칙']], LIVE_MAX=1500000;
function bhProjects(){ try{ var o=JSON.parse(localStorage.getItem('ffblocks.projects')||'null'); return o&&Array.isArray(o.list)?o.list.filter(function(e){ return e&&e.id&&localStorage.getItem('ffblocks.p.'+e.id); }):[]; }catch(e){ return []; } }
/* builds the final HTML of a saved Block HTML project in a hidden same-origin Block HTML page (#embed=<id>: read only, nothing is saved there) */
function buildBlock(id){ return new Promise(function(res,rej){ var fr=document.createElement('iframe'), done=false, tm;
  function fin(v,err){ if(done) return; done=true; clearTimeout(tm); window.removeEventListener('message',on); fr.remove(); if(err) rej(err); else res(v); }
  function on(e){ if(e.source===fr.contentWindow&&e.data&&e.data.ffbhBuilt&&e.data.id===id){ if(typeof e.data.html==='string'&&e.data.html) fin(e.data.html); else fin(null,new Error('empty')); } }
  window.addEventListener('message',on); tm=setTimeout(function(){ fin(null,new Error('timeout')); },20000);
  fr.style.cssText='position:fixed;left:-9999px;top:0;width:900px;height:700px;border:0;visibility:hidden'; fr.setAttribute('aria-hidden','true'); fr.src='../blocks/index.html#embed='+encodeURIComponent(id); document.body.appendChild(fr); }); }
function liveSrc(){ var r=document.querySelector('input[name="liveK"]:checked'); return r?r.value:'block'; }
function livePanels(){ var k=liveSrc(); ['block','lab','html'].forEach(function(p){ $('livePan_'+p).hidden=p!==k; }); }
/* Fry Lab catalog: read at runtime from a hidden same-origin Lab page (LAB.list = every experiment, LABCUR = curriculum units), so new Lab experiments show up here by themselves */
var labCat=null, labCatP=null, labPick='';
function loadLabCat(){ if(labCat) return Promise.resolve(labCat); if(labCatP) return labCatP;
  labCatP=new Promise(function(res,rej){ var fr=document.createElement('iframe'), done=false, tm;
    function fin(v,err){ if(done) return; done=true; clearTimeout(tm); try{ fr.remove(); }catch(e){} if(err){ labCatP=null; rej(err); } else res(labCat=v); }
    function read(){ try{ var w=fr.contentWindow, L=w.LAB, C=w.LABCUR, TT=w.FFT.T; if(!L||!C||!L.list||!L.list.length) return false;
      var by={}, ex=L.list.map(function(e){ var o={id:e.id,cat:e.cat,icon:e.icon||'🔬',name:e.name,tn:TT(e.name),desc:TT(e.desc||'')}; by[e.id]=o; return o; });
      var used={}, units=C.units.map(function(r){ var ids=C.ids(r).filter(function(i){ return by[i]; }); ids.forEach(function(i){ used[i]=1; }); return {g:r[0],s:r[1],u:r[2],tu:TT(r[2]),ids:ids}; }).filter(function(u){ return u.ids.length; });
      fin({ex:ex,by:by,units:units,grades:C.grades.slice(),rest:ex.filter(function(e){ return !used[e.id]; })}); return true; }catch(e){ return false; } }
    fr.addEventListener('load',function(){ var n=0; (function t(){ if(done) return; if(!read()&&n++<100) setTimeout(t,100); else if(!done) fin(null,new Error('empty')); })(); });
    tm=setTimeout(function(){ fin(null,new Error('timeout')); },20000);
    fr.style.cssText='position:fixed;left:-9999px;top:0;width:900px;height:700px;border:0;visibility:hidden'; fr.setAttribute('aria-hidden','true'); fr.src='../lab/index.html#catalog'; document.body.appendChild(fr); });
  return labCatP; }
function drawLabLs(){ var box=$('liveLs'), q=$('liveFind').value.trim().toLowerCase(), C=labCat; box.innerHTML=''; var shown=0;
  if(!C){ var m=document.createElement('div'); m.className='empty'; m.textContent=T(labCatP?'실험 목록을 불러오는 중…':'실험 목록을 불러오지 못했어요'); box.appendChild(m); $('liveCnt').textContent=''; return; }
  function row(e){ var b=document.createElement('button'); b.type='button'; b.className='lvi'+(e.id===labPick?' on':''); b.dataset.id=e.id; b.setAttribute('role','option'); b.setAttribute('aria-selected',String(e.id===labPick));
    b.innerHTML='<span class="ic"></span><span class="nm"></span>'; b.firstChild.textContent=e.icon; b.lastChild.textContent=e.tn; b.onclick=function(){ labPick=e.id; $('liveOk').disabled=false; box.querySelectorAll('.lvi').forEach(function(x){ var on=x.dataset.id===labPick; x.classList.toggle('on',on); x.setAttribute('aria-selected',String(on)); }); }; return b; }
  function hit(e,u){ return !q||(e.name+' '+e.tn+' '+e.desc+' '+e.id+' '+(u?u.u+' '+u.tu+' '+u.g:'')).toLowerCase().indexOf(q)>=0; }
  C.grades.forEach(function(g){ var us=C.units.filter(function(u){ return u.g===g; }), g0=null;
    us.forEach(function(u){ var es=u.ids.map(function(i){ return C.by[i]; }).filter(function(e){ return hit(e,u); }); if(!es.length) return;
      if(!g0){ g0=document.createElement('div'); g0.className='lvg'; g0.textContent=T(g); box.appendChild(g0); }
      var h=document.createElement('div'); h.className='lvu'; h.textContent=(u.s==='math'?'📐 ':'🔬 ')+u.tu; box.appendChild(h); es.forEach(function(e){ box.appendChild(row(e)); shown++; }); }); });
  var rs=C.rest.filter(function(e){ return hit(e,null); }); if(rs.length){ var h2=document.createElement('div'); h2.className='lvg'; h2.textContent=T('그 밖의 실험'); box.appendChild(h2); rs.forEach(function(e){ box.appendChild(row(e)); shown++; }); }
  if(!shown){ var m2=document.createElement('div'); m2.className='empty'; m2.textContent=T('검색 결과가 없어요'); box.appendChild(m2); }
  $('liveCnt').textContent=C.ex.length+T('개 실험·템플릿');
  var on=box.querySelector('.lvi.on'); if(on&&!q) box.scrollTop=Math.max(0,on.offsetTop-box.offsetTop-60); }
$('liveFind').addEventListener('input',drawLabLs);
$('liveFind').addEventListener('keydown',function(e){ e.stopPropagation(); if(e.key==='Escape') closeDlg('liveDlg',null); else if(e.key==='Enter'){ e.preventDefault(); var f=$('liveLs').querySelector('.lvi'); if(f) f.click(); } });
function openLive(){ var s=deck.slides[cur]; if(!s||s.layout!=='live'||gen||busyOn) return; blurEdit(); var c=liveCfg(s);
  var pl=bhProjects(), sel=$('liveBlk'); sel.innerHTML=''; pl.forEach(function(e){ var o=document.createElement('option'); o.value=e.id; o.textContent=e.name||e.id; sel.appendChild(o); });
  $('liveBlkNone').hidden=!!pl.length; sel.hidden=!pl.length; $('liveBlkMsg').textContent='';
  labPick=c&&c.k==='lab'?c.e:'func'; $('liveFind').value=''; drawLabLs(); loadLabCat().then(function(){ drawLabLs(); },function(err){ console.warn(err); drawLabLs(); });
  var k=c?c.k:(pl.length?'block':'lab'); document.querySelector('input[name="liveK"][value="'+k+'"]').checked=true;
  if(c&&c.k==='block'&&pl.some(function(e){ return e.name===c.n; })) sel.value=pl.filter(function(e){ return e.name===c.n; })[0].id;
  $('liveHtml').value=c&&c.k==='html'?c.h:''; $('liveOk').disabled=false; livePanels(); openDlg('liveDlg'); }
document.querySelectorAll('input[name="liveK"]').forEach(function(r){ r.onchange=livePanels; });
$('liveHtml').addEventListener('keydown',function(e){ e.stopPropagation(); if(e.key==='Escape') closeDlg('liveDlg',null); });
$('liveOk').onclick=function(){ var s=deck.slides[cur]; if(!s) return closeDlg('liveDlg',null); var k=liveSrc(), msg=$('liveBlkMsg');
  function put(c){ var j=JSON.stringify(c); if(j.length>LIVE_MAX){ msg.textContent=T('너무 커서 담을 수 없어요 (1.5MB까지)'); return false; } pushUndo(); s.live=j; closeDlg('liveDlg',null); changed(true); return true; }
  if(k==='lab'){ var x=labCat&&labCat.by[labPick], o=!x&&LABX.filter(function(q){ return q[0]===labPick; })[0]; if(!x&&!o){ msg.textContent=T('실험을 골라 주세요'); return; } put({k:'lab',e:labPick,n:x?x.name:o[1]}); }
  else if(k==='html'){ var h=$('liveHtml').value.trim(); if(!h){ msg.textContent=T('HTML을 붙여 넣어 주세요'); return; } put({k:'html',n:'HTML',h:h}); }
  else { var id=$('liveBlk').value; if(!id){ msg.textContent=T('Block HTML에 저장된 프로젝트가 없어요'); return; } var nm=($('liveBlk').selectedOptions[0]||{}).textContent||'';
    msg.textContent=T('프로젝트를 불러오는 중…'); $('liveOk').disabled=true;
    buildBlock(id).then(function(h){ $('liveOk').disabled=false; if(!$('liveDlg').classList.contains('open')) return; if(put({k:'block',n:nm,h:h})) msg.textContent=''; },function(err){ console.warn(err); $('liveOk').disabled=false; msg.textContent=T('프로젝트를 불러오지 못했어요'); }); } };
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
  else if(k==='master') openMaster();
  else if(k==='auto') openAuto();
  else if(k==='imp') openImport();
  else if(k==='toc') makeToc();
  else if(k==='find') openFind();
  else if(k==='csv') openCsv();
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

/* ---------- master slide (logo, footer text, slide number on every slide) ---------- */
var maSnap=null;
function maPush(){ if(maSnap){ pushUndo(maSnap); maSnap=null; } }
function maDraw(){ var m=deck.master; $('maOn').checked=m.on; $('maLogoPrev').hidden=!m.logo; $('maLogoPrev').src=m.logo||''; $('maLogoDel').hidden=!m.logo; $('maLogoPick').textContent=T(m.logo?'로고 그림 바꾸기':'로고 그림 고르기');
  $('maLpos').value=m.lpos; $('maLsz').value=m.lsz; $('maFoot').value=deck.footer; $('maFpos').value=m.fpos; $('maNum').checked=deck.nums; $('maNpos').value=m.npos; $('maTtl').checked=m.ttl;
  $('maBody').classList.toggle('off',!m.on); $('maLrow').hidden=!m.logo; }
function maApply(){ drawList(); drawMain(); saveSoon(); }
function openMaster(){ if(!deck.slides.length||gen||busyOn) return; blurEdit(); closeMenus(); maSnap=snap(); maDraw(); openDlg('maDlg'); }
function readLogo(file){ return new Promise(function(res,rej){ if(!file||!/^image\//.test(file.type)) return rej(new Error('type'));
  var fr=new FileReader(); fr.onerror=rej; fr.onload=function(){ var im=new Image(); im.onerror=rej; im.onload=function(){ var nw=im.naturalWidth||im.width||300, nh=im.naturalHeight||im.height||100, k=Math.min(1,400/Math.max(nw,nh)), w=Math.max(1,Math.round(nw*k)), h=Math.max(1,Math.round(nh*k)), c=document.createElement('canvas'); c.width=w; c.height=h;
    c.getContext('2d').drawImage(im,0,0,w,h); var d; try{ d=c.toDataURL('image/png'); }catch(e){ return rej(e); } res({d:d,w:w,h:h}); }; im.src=fr.result; }; fr.readAsDataURL(file); }); }
$('maLogoPick').onclick=function(){ var i=document.createElement('input'); i.type='file'; i.accept='image/*'; i.onchange=function(){ readLogo(i.files[0]).then(function(r){ maPush(); var m=deck.master; m.logo=r.d; m.lw=r.w; m.lh=r.h; maDraw(); maApply(); },function(){ toast(T('그림을 읽지 못했어요')); }); }; i.click(); };
$('maLogoDel').onclick=function(){ maPush(); var m=deck.master; m.logo=''; m.lw=m.lh=0; maDraw(); maApply(); };
$('maOn').onchange=function(){ maPush(); deck.master.on=this.checked; maDraw(); maApply(); };
$('maLpos').onchange=function(){ maPush(); deck.master.lpos=this.value; maApply(); }; $('maLsz').onchange=function(){ maPush(); deck.master.lsz=this.value; maApply(); };
$('maFpos').onchange=function(){ maPush(); deck.master.fpos=this.value; maApply(); }; $('maNpos').onchange=function(){ maPush(); deck.master.npos=this.value; maApply(); };
$('maNum').onchange=function(){ maPush(); deck.nums=this.checked; maApply(); }; $('maTtl').onchange=function(){ maPush(); deck.master.ttl=this.checked; maApply(); };
var maT=null; $('maFoot').addEventListener('input',function(){ maPush(); deck.footer=this.value; drawMain(); saveSoon(); clearTimeout(maT); maT=setTimeout(drawList,300); });
$('maFoot').addEventListener('keydown',function(e){ e.stopPropagation(); if(e.key==='Enter'||e.key==='Escape'){ e.preventDefault(); closeDlg('maDlg',null); } });
/* ---------- auto-advance: per deck (on, seconds, loop) and per slide (s.sec) ---------- */
function openAuto(){ if(!deck.slides.length||gen||busyOn) return; blurEdit(); closeMenus(); var a=deck.auto, s=deck.slides[cur]; $('auOn').checked=a.on; $('auSec').value=a.sec; $('auLoop').checked=a.loop; $('auOne').value=s.sec>0?s.sec:s.sec<0?0:'';
  $('auNo').textContent=F('{0}번 슬라이드만 다르게',cur+1); openDlg('auDlg'); setTimeout(function(){ $('auSec').focus(); },60); }
$('auOk').onclick=function(){ var s=deck.slides[cur]; pushUndo(); deck.auto={on:$('auOn').checked, sec:num($('auSec').value,10,1,600), loop:$('auLoop').checked};
  var v=$('auOne').value.trim(); if(s) s.sec=v===''?0:+v===0?-1:num(v,0,1,3600); closeDlg('auDlg',null); saveSoon(); drawList(); toast(T(deck.auto.on?'발표할 때 저절로 넘어가요':'자동 넘기기를 껐어요')); };
['auSec','auOne'].forEach(function(id){ $(id).addEventListener('keydown',function(e){ e.stopPropagation(); if(e.key==='Enter'){ e.preventDefault(); $('auOk').click(); } if(e.key==='Escape') closeDlg('auDlg',null); }); });
/* ---------- pictures from the device (shrunk to 1600 px, kept inside the deck and the .pptx) ---------- */
function readImg(file){ return new Promise(function(res,rej){ if(!file||!/^image\//.test(file.type)) return rej(new Error('type'));
  var fr=new FileReader(); fr.onerror=rej; fr.onload=function(){ var im=new Image(); im.onerror=rej; im.onload=function(){
    var k=Math.min(1,1600/Math.max(im.naturalWidth,im.naturalHeight)), w=Math.max(1,Math.round(im.naturalWidth*k)), h=Math.max(1,Math.round(im.naturalHeight*k)), c=document.createElement('canvas'); c.width=w; c.height=h;
    var x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,w,h); x.drawImage(im,0,0,w,h); var d; try{ d=c.toDataURL('image/jpeg',.82); }catch(e){ return rej(e); } res({d:d,w:w,h:h}); };
    im.src=fr.result; }; fr.readAsDataURL(file); }); }
function blankSlide(s){ return !s.els.length&&LISTS.concat(TEXTS).every(function(f){ return f==='ctype'||f==='bg'||empty(s,f); }); }
function putPictures(files){ files=[].slice.call(files||[]).filter(function(f){ return /^image\//.test(f.type); }); if(!files.length||gen||busyOn||!deck.slides.length) return;
  var n=0, p=Promise.resolve();
  files.forEach(function(f,fi){ p=p.then(function(){ return readImg(f); }).then(function(r){ blurEdit(); pushUndo(); var s=deck.slides[cur];
    if(!s||(fi>0)||(s.layout!=='image'&&!blankSlide(s))){ s=blank('image'); deck.slides.splice(cur+1,0,s); cur=cur+1; } else s.layout='image';
    s.img=r.d; s.iw=r.w; s.ih=r.h; n++; changed(true); }); });
  p.then(function(){ toast(T('그림을 넣었어요')); },function(){ if(n) changed(true); toast(T('그림을 읽지 못했어요')); }); }
function pickImage(){ var i=document.createElement('input'); i.type='file'; i.accept='image/*'; i.multiple=true; i.onchange=function(){ putPictures(i.files); }; i.click(); }
$('picBtn').onclick=pickImage;
host.addEventListener('click',function(e){ if(gen||busyOn||noClick()) return;
  if(e.target.closest('[data-rm]')){ var s=deck.slides[cur]; if(!s) return; pushUndo(); s.img=''; s.iw=s.ih=0; changed(true); return; }
  if(e.target.closest('.pic.empty')) pickImage();
  else if(e.target.closest('[data-live-size]')) return;
  else if(e.target.closest('[data-live-edit],.dv.live.empty')) openLive();
  else if(e.target.closest('.dv.live')) return;
  else if(e.target.closest('.dv')) openData(); });
var cw=$('canvasWrap');
cw.addEventListener('dragover',function(e){ if(e.dataTransfer&&[].indexOf.call(e.dataTransfer.types||[],'Files')>=0){ e.preventDefault(); } });
cw.addEventListener('drop',function(e){ var fs=e.dataTransfer&&e.dataTransfer.files; if(fs&&fs.length){ e.preventDefault(); putPictures(fs); } });
document.addEventListener('paste',function(e){ if(e.target.closest&&(e.target.closest('.in')||e.target.closest('input,textarea'))||pr.on||$('editor').hidden) return;
  var tx=(e.clipboardData&&e.clipboardData.getData('text'))||''; if(tx.indexOf(CLIPP)===0){ e.preventDefault(); try{ pasteEl(JSON.parse(tx.slice(CLIPP.length))); }catch(x){} return; }
  if(tx.indexOf('\t')>=0&&/\n/.test(tx.trim())) return; // spreadsheet cells (Excel also adds a picture): handled by the table dialog
  var fs=[].slice.call((e.clipboardData&&e.clipboardData.files)||[]).filter(function(f){ return /^image\//.test(f.type); }); if(fs.length){ e.preventDefault(); putPictures(fs); } });

/* ---------- paste a spreadsheet (Excel / Google Sheets cells or CSV text): table slides and chart slides ---------- */
var csv={rows:[], sep:'\t'};
function csvDetect(t){ var L=t.split('\n').filter(function(x){ return x.trim(); }).slice(0,8); if(L.some(function(x){ return x.indexOf('\t')>=0; })) return '\t'; var best=',', bn=0;
  [',',';','|'].forEach(function(c){ var n=L.reduce(function(s,x){ return s+x.split(c).length-1; },0); if(n>bn){ bn=n; best=c; } }); return best; }
function csvRows(t,sep){ t=String(t||'').replace(/^\ufeff/,'').replace(/\r\n?/g,'\n'); var rows=[], row=[], cell='', q=false, i, c;
  for(i=0;i<t.length;i++){ c=t[i];
    if(q){ if(c==='"'){ if(t[i+1]==='"'){ cell+='"'; i++; } else q=false; } else cell+=c; }
    else if(c==='"'&&!cell.trim()){ q=true; cell=''; }
    else if(c===sep){ row.push(cell); cell=''; }
    else if(c==='\n'){ row.push(cell); rows.push(row); row=[]; cell=''; }
    else cell+=c; }
  row.push(cell); rows.push(row);
  rows=rows.map(function(r){ return r.slice(0,40).map(function(x){ return x.replace(/[\t\n]+/g,' ').trim(); }); }).filter(function(r){ return r.some(Boolean); }).slice(0,500);
  var n=rows.reduce(function(m,r){ return Math.max(m,r.length); },0); rows.forEach(function(r){ while(r.length<n) r.push(''); }); return rows; }
/* a cell that is a number (1,234 · 12.5 · 3,5 · $40 · 80% · (12) · 15명): value and the text to show on the chart */
var CSVU='%|％|원|명|개|점|건|회|배|kg|km|cm|mm|ml|g|m|l|s|°C|℃|°';
function csvNum(c){ c=String(c==null?'':c).trim(); if(!c) return null; var m=new RegExp('^([-+−(]?)\\s*[$€£¥₩]?\\s*(\\d[\\d.,]*)\\s*\\)?\\s*('+CSVU+')?$').exec(c); if(!m) return null;
  var n=m[2], neg=m[1]==='-'||m[1]==='−'||m[1]==='(', v, s;
  if(/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(n)){ v=parseFloat(n.replace(/,/g,'')); s=n; }
  else if(/^\d{1,3}(\.\d{3})+,\d+$/.test(n)){ v=parseFloat(n.replace(/\./g,'').replace(',','.')); s=String(v); }
  else if(/^\d+,\d+$/.test(n)){ v=parseFloat(n.replace(',','.')); s=String(v); }
  else if(/^\d+(\.\d+)?$/.test(n)){ v=parseFloat(n); s=n; }
  else return null;
  if(isNaN(v)) return null; if(neg){ v=-v; s='-'+s; } return {v:v, s:s+(m[3]||'')}; }
function csvLetter(i){ var s=''; i++; while(i>0){ var r=(i-1)%26; s=String.fromCharCode(65+r)+s; i=Math.floor((i-1)/26); } return s; }
function csvHdr(){ var r=csv.rows; if(!r.length) return []; return $('csvHead').checked?r[0].map(function(x,i){ return x||csvLetter(i); }):r[0].map(function(x,i){ return csvLetter(i); }); }
function csvBody(){ return $('csvHead').checked?csv.rows.slice(1):csv.rows; }
function csvNumCols(){ var b=csvBody(), n=csv.rows.length?csv.rows[0].length:0, o=[]; for(var c=0;c<n;c++){ var ne=0, nn=0; b.forEach(function(r){ if(r[c]){ ne++; if(csvNum(r[c])) nn++; } }); if(nn&&nn>=ne*.6) o.push(c); } return o; }
function csvParse(){ var t=$('csvIn').value, sel=$('csvSep').value; csv.sep=sel||csvDetect(t.replace(/\r/g,'')); csv.rows=csvRows(t,csv.sep); }
function csvGuessHead(){ var r=csv.rows; if(r.length<2){ $('csvHead').checked=false; return; } $('csvHead').checked=!r[0].some(function(x){ return csvNum(x); }); }
function csvFill(){ /* column pickers follow the data and the header choice */
  var H=csvHdr(), nc=csvNumCols(), L=$('csvLab'), V=$('csvVal'), pl=L.value, pv=V.value; L.innerHTML=''; V.innerHTML='';
  H.forEach(function(h,i){ var o=document.createElement('option'); o.value=i; o.textContent=h; L.appendChild(o); });
  nc.forEach(function(i){ var o=document.createElement('option'); o.value=i; o.textContent=H[i]; V.appendChild(o); });
  if(nc.length>1){ var o=document.createElement('option'); o.value='*'; o.textContent=T('숫자 칸마다 한 장씩'); V.appendChild(o); }
  var lab=H.map(function(h,i){ return i; }).filter(function(i){ return nc.indexOf(i)<0; })[0]; L.value=pl&&pl<H.length?pl:String(lab==null?0:lab);
  if(pv&&[].some.call(V.options,function(o){ return o.value===pv; })) V.value=pv; else if(V.options.length) V.value=String(nc.filter(function(i){ return String(i)!==L.value; })[0]!=null?nc.filter(function(i){ return String(i)!==L.value; })[0]:nc[0]); }
function csvPreview(){ var p=$('csvPrev'); p.innerHTML=''; if(!csv.rows.length) return; var H=csvHdr(), nc=csvNumCols(), B=csvBody(), t=document.createElement('table'), tr=document.createElement('tr');
  H.forEach(function(h){ var th=document.createElement('th'); th.textContent=h; tr.appendChild(th); }); t.appendChild(tr);
  B.slice(0,8).forEach(function(r){ var x=document.createElement('tr'); r.forEach(function(c,i){ var td=document.createElement('td'); td.textContent=c; if(nc.indexOf(i)>=0) td.className='n'; x.appendChild(td); }); t.appendChild(x); });
  if(B.length>8){ var cut=document.createElement('tr'); cut.className='cut'; var td=document.createElement('td'); td.colSpan=H.length; td.textContent=F('… 아래 {0}줄 더',B.length-8); cut.appendChild(td); t.appendChild(cut); }
  p.appendChild(t); }
function csvKind(){ return $('csvKind').querySelector('.on').dataset.k; }
/* what will be made: slides plus the warnings about the limits of the table and chart layouts (9 rows x 6 columns, 12 chart rows) */
function csvPlan(){ var out={slides:[], warn:[]}; if(!csv.rows.length) return out; var H=csvHdr(), B=csvBody(), kind=csvKind(), title=$('csvTitle').value.trim();
  if(kind!=='chart'){ var per=8, parts=Math.max(1,Math.ceil(B.length/per)), one=H.length===1;
    var cell=function(x){ return one?String(x).replace(/,/g,'，'):String(x); };
    for(var k=0;k<parts;k++){ var rows=[H.slice(0,6)].concat(B.slice(k*per,k*per+per).map(function(r){ return r.slice(0,6); })), s=blank('table');
      s.title=(title||T('표'))+(parts>1?' ('+(k+1)+'/'+parts+')':''); s.data=rows.map(function(r){ return r.map(cell).join('\t'); }).join('\n'); out.slides.push(s); }
    if(parts>1) out.warn.push(F('표는 한 슬라이드에 8줄까지라 {0}장으로 나눠요',parts)); if(H.length>6) out.warn.push(T('표는 6칸까지라 앞의 6칸만 담아요')); }
  if(kind!=='table'){ var nc=csvNumCols(), lab=+$('csvLab').value||0, v=$('csvVal').value, cols=v==='*'?nc.filter(function(i){ return i!==lab; }):(v===''||v==null?[]:[+v]);
    if(!cols.length){ out.warn.push(T('숫자가 들어 있는 칸이 없어서 그래프는 만들 수 없어요')); }
    cols.slice(0,8).forEach(function(c){ var lines=[]; B.forEach(function(r){ var n=csvNum(r[c]); if(n) lines.push(((r[lab]||String(lines.length+1)).replace(/[\n\t]+/g,' '))+': '+n.s); });
      if(lines.length>12) out.warn.push(F('그래프는 12줄까지라 앞의 12줄만 담아요 ({0})',H[c])); if(!lines.length) return;
      var s=blank('chart'); s.ctype=$('csvType').value; s.data=lines.slice(0,12).join('\n'); s.title=cols.length>1?(title?title+' · ':'')+H[c]:(title||H[c]||T('그래프')); out.slides.push(s); });
    if(cols.length>8) out.warn.push(T('그래프는 8장까지만 만들어요')); }
  return out; }
function csvNote(){ var p=csvPlan(), ok=$('csvOk'); ok.disabled=!p.slides.length; var n=p.slides.length;
  $('csvNote').textContent=!csv.rows.length?'':(n?F('슬라이드 {0}장이 만들어져요',n)+(p.warn.length?' · '+p.warn.join(' · '):''):p.warn.join(' · ')||T('만들 내용이 없어요'));
  $('csvChartOpts').style.display=csvKind()==='table'?'none':''; }
function csvChanged(guess){ csvParse(); if(guess) csvGuessHead(); csvFill(); csvPreview(); csvNote(); }
function openCsv(text){ if(gen||busyOn) return; blurEdit(); closeMenus(); $('csvIn').value=text||''; $('csvTitle').value=''; $('csvSep').value=''; csvChanged(true); openDlg('csvDlg'); setTimeout(function(){ $('csvIn').focus(); },60); }
$('csvIn').addEventListener('input',function(){ csvChanged(true); });
$('csvSep').onchange=function(){ csvChanged(true); }; $('csvHead').onchange=function(){ csvChanged(false); };
['csvLab','csvVal','csvType'].forEach(function(id){ $(id).onchange=csvNote; }); $('csvTitle').addEventListener('input',csvNote);
$('csvKind').addEventListener('click',function(e){ var b=e.target.closest('button'); if(!b) return; [].forEach.call($('csvKind').children,function(x){ x.classList.toggle('on',x===b); }); csvNote(); });
$('csvIn').addEventListener('keydown',function(e){ e.stopPropagation(); if(e.key==='Escape') closeDlg('csvDlg',null); });
$('csvTitle').addEventListener('keydown',function(e){ e.stopPropagation(); if(e.key==='Escape') closeDlg('csvDlg',null); if(e.key==='Enter'){ e.preventDefault(); $('csvOk').click(); } });
$('csvOk').onclick=function(){ var p=csvPlan(); if(!p.slides.length) return; closeDlg('csvDlg',null); blurEdit(); pushUndo(); var at=deck.slides.length?cur+1:0; deck.slides.splice.apply(deck.slides,[at,0].concat(p.slides)); cur=at; refresh(); saveNow(); toast(F('슬라이드 {0}장을 만들었어요',p.slides.length)); };
/* pasting spreadsheet cells anywhere on the editor opens the dialog with them */
document.addEventListener('paste',function(e){ if(e.target.closest&&(e.target.closest('.in')||e.target.closest('input,textarea'))||pr.on||$('editor').hidden||gen||busyOn||document.querySelector('.ov.open')) return;
  var t=(e.clipboardData&&e.clipboardData.getData('text'))||''; if(t.indexOf('\t')>=0&&/\n/.test(t.trim())){ e.preventDefault(); openCsv(t); } });

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
var frT=null;
function openFind(){ if(!deck.slides.length) return; $('frQ').value=''; $('frR').value=''; $('frInfo').textContent=''; openDlg('frDlg'); setTimeout(function(){ $('frQ').focus(); },50); }
function frInfo(){ var q=$('frQ').value; $('frInfo').textContent=q?F('{0}곳에서 찾았어요',frCount(q,$('frCase').checked)):''; }
$('frQ').addEventListener('input',frInfo); $('frCase').addEventListener('change',frInfo);
['frQ','frR'].forEach(function(id){ $(id).addEventListener('keydown',function(e){ e.stopPropagation(); if(e.key==='Escape') closeDlg('frDlg',null); if(e.key==='Enter'){ e.preventDefault(); $('frOk').click(); } }); });
$('frOk').onclick=function(){ var q=$('frQ').value; if(!q) return; var n=frDo(q,$('frR').value,$('frCase').checked); if(!n){ $('frInfo').textContent=T('찾는 글이 없어요'); return; } closeDlg('frDlg',null); toast(F('{0}곳을 바꿨어요',n)); };
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
    if(s.layout==='live') L.push('','*'+T('발표 때 직접 실행하는 화면이에요')+'*'+(liveCfg(s)?' ('+liveName(liveCfg(s))+')':''));
    s.els.forEach(function(e){ if(e.text.trim()) L.push('',e.text.replace(/\n/g,' ')); });
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
var KEYS=[['Ctrl+Z / Ctrl+Shift+Z','되돌리기 · 다시 하기'],['↑ ↓ ← →','슬라이드 이동'],['Ctrl+D','슬라이드 복제'],['Ctrl+Enter','새 슬라이드 넣기'],['Ctrl+C · Ctrl+V','고른 도형 복사 · 붙여넣기'],['Ctrl+G · Ctrl+Shift+G','고른 도형 묶기 · 풀기'],['Ctrl+] · Ctrl+[','도형을 한 칸 앞으로 · 뒤로 (Shift: 맨 앞 · 맨 뒤)'],['Ctrl+A','도형 모두 고르기'],['Shift + Click · Drag','여러 도형 고르기 (Shift+누르기 · 빈 곳 끌기)'],['Alt+↑ Alt+↓','슬라이드 순서 바꾸기'],['H','발표할 때 건너뛰기 켜고 끄기'],['Delete','슬라이드 지우기'],['Home End','첫·마지막 슬라이드'],['Ctrl+Alt+N','새 슬라이드 쇼 만들기'],['F5','처음부터 발표'],['Shift+F5','지금 슬라이드부터 발표'],['?','이 단축키 목록'],['← ↑ → ↓','(고른 상자) 조금씩 옮기기 · Shift는 크게'],['Delete','(고른 도형·그림) 지우기'],['Shift + 끌기','(도형) 비율 지키기 · 선은 45도씩'],
  ['→ Space Enter','(발표) 다음'],['← Backspace','(발표) 이전'],['Home End','(발표) 처음 · 끝'],['S','(발표) 발표자 메모 보기'],['V','(발표) 발표자 화면 새 창으로 열기'],['L','(발표) 레이저 포인터'],['D · M · E','(발표) 펜 · 형광펜 · 낙서 지우기'],['X','(발표) 지우개 (닿은 줄을 지워요)'],['W','(발표) 칠판 켜고 끄기'],['K','(발표) 자동 넘기기 멈춤 · 이어가기'],['B','(발표) 화면 끄기'],['숫자 + Enter','(발표) 그 번호 슬라이드로'],['A','(발표) 퀴즈 정답 보기'],['T','(발표) 타이머 멈춤·다시'],['Esc','(발표) 나가기']];
function showKeys(){ var b=$('keysBody'); b.innerHTML=''; KEYS.forEach(function(k){ var r=document.createElement('div'); r.className='kr'; var a=document.createElement('kbd'); a.textContent=k[0]; var t=document.createElement('span'); t.textContent=T(k[1]); r.appendChild(a); r.appendChild(t); b.appendChild(r); }); openDlg('keysDlg'); }

/* ---------- presenting ---------- */
var pr={on:false, i:0, step:0, nb:0, end:false, fs:false, notes:false, laser:false, black:false, t0:0, tm:null, cd:null, shown:-1, rev:-1, go:'', goT:null, au:{dur:0, left:0, last:0, paused:false, tm:null}, bb:false};
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
  pr.on=true; pr.i=from; pr.step=0; pr.end=false; pr.black=false; pr.cd=null; pr.shown=-1; pr.rev=-1; pr.go=''; inkKey=-1; setInk(''); setBoard(false); inkClear(); pr.au.paused=false; pr.au.dur=0; clearInterval(pr.au.tm); pr.au.tm=setInterval(auTick,100); pr.t0=Date.now(); clearInterval(pr.tm); pr.tm=setInterval(tick,1000); tick(); pvDeck();
  var el=$('present'); el.classList.add('on'); setLaser(false); drawPresent(); armAuto();
  try{ var fn=el.requestFullscreen||el.webkitRequestFullscreen; if(fn){ var p=fn.call(el); pr.fs=true; if(p&&p.catch) p.catch(function(){ pr.fs=false; }); } }catch(e){ pr.fs=false; }
}
function drawPresent(){ drawPresent0(); pvState(); }
function drawPresent0(){
  var ik=pr.end?-2:pr.i; if(inkKey!==ik){ inkKey=ik; inkClear(); setBoard(false); }
  var st=$('pStage'), n=deck.slides.length; st.innerHTML=''; $('pEnd').hidden=!pr.end; st.hidden=pr.end; st.style.visibility=pr.black?'hidden':'';
  $('pNum').textContent=pr.end?n+' / '+n:(pr.i+1)+' / '+n; $('pProg').firstChild.style.width=(pr.end?100:Math.round((pr.i+1)/n*100))+'%';
  var sl=pr.end?null:deck.slides[pr.i], nt=$('pNotes'); nt.textContent=sl?sl.notes||'':''; nt.hidden=!(pr.notes&&sl&&sl.notes&&sl.notes.trim()); $('pNotesB').classList.toggle('on',pr.notes);
  if(pr.end) return; var t=th(), moved=pr.shown!==pr.i;
  if(moved){ var tm=sl.layout==='timer'?parseTime(sl.stat):null; pr.cd=tm==null?null:{left:tm,total:tm,run:true}; }
  var opt={hideAns:sl.layout==='quiz'&&pr.rev!==pr.i}; if(pr.cd&&sl.layout==='timer') opt.over={stat:fmtTime(pr.cd.left)};
  opt.live=1; opt.hint=1; opt.step=pr.step; var el=slideEl(sl,t,false,opt); st.appendChild(el); fitAll(el,sl,t); scalePresent(); inkFit(); cdPaint();
  pr.nb=+el.dataset.nb||0; pr.step=Math.min(pr.step,pr.nb);
  var tr=trOf(sl); if(moved&&tr!=='none'){ st.className='tf-'+tr; void st.offsetWidth; } else st.className='';
  pr.shown=pr.i;
}
function setLaser(on){ if(on&&ink.tool) setInk(''); pr.laser=on; $('present').classList.toggle('laser',on); $('pLaserB').classList.toggle('on',on); if(!on) $('pDot').hidden=true; }
function setNotesView(on){ pr.notes=on; drawPresent(); }
function setBlack(on){ pr.black=on; drawPresent(); }
function scalePresent(){ var st=$('pStage'), k=Math.min(innerWidth/W,innerHeight/H); st.style.width=W*k+'px'; st.style.height=H*k+'px'; var el=st.firstChild; if(el) el.style.transform='scale('+k+')'; }
/* builds: the next press shows the next element (or hides the last one going back) without redrawing the slide */
function buildShow(i,on){ var e=$('pStage').querySelector('[data-bi="'+i+'"]'); if(!e) return; e.classList.remove('b-fade','b-fly');
  if(on){ e.classList.remove('bh'); void e.offsetWidth; e.classList.add('b-'+(e.dataset.ba||'fade')); } else e.classList.add('bh'); }
function pNext0(){ if(pr.end) return exitPresent(); var cs=deck.slides[pr.i];
  if(!pr.black&&pr.step<pr.nb){ buildShow(pr.step,true); pr.step++; pvState(); return; }
  if(cs&&cs.layout==='quiz'&&pr.rev!==pr.i&&cs.caption.trim()){ pr.rev=pr.i; drawPresent(); return; }
  var j=nextVis(pr.i,1); if(j>=0){ pr.i=j; pr.step=0; } else pr.end=true; drawPresent(); }
function pPrev0(){ if(!pr.end&&!pr.black&&pr.step>0){ pr.step--; buildShow(pr.step,false); pvState(); return; }
  if(pr.end){ pr.end=false; pr.shown=-1; pr.step=999; } else { var j=nextVis(pr.i,-1); if(j>=0){ pr.i=j; pr.step=999; } } drawPresent(); }
function pHome0(){ pr.end=false; pr.step=0; var f=vis(0)?0:nextVis(0,1); pr.i=f<0?0:f; drawPresent(); }
function pLast0(){ pr.end=false; pr.step=0; var L=deck.slides.length-1, la=vis(L)?L:nextVis(L,-1); pr.i=la<0?L:la; drawPresent(); }
function pAns0(){ pr.rev=pr.rev===pr.i?-1:pr.i; drawPresent(); }
function pGo0(){ var n=+pr.go; pr.go=''; clearTimeout(pr.goT); if(!n) return drawPresent(); var i=Math.max(0,Math.min(n-1,deck.slides.length-1)); if(!vis(i)){ var j=nextVis(i,1); i=j>=0?j:nextVis(i,-1); } pr.end=false; pr.i=i; pr.step=0; drawPresent(); }
/* every move by hand starts the slide's time again */
function pNext(){ pNext0(); armAuto(); } function pPrev(){ pPrev0(); armAuto(); } function pHome(){ pHome0(); armAuto(); } function pLast(){ pLast0(); armAuto(); } function pAns(){ pAns0(); armAuto(); } function pGo(){ pGo0(); armAuto(); }
/* auto-advance: each slide waits its time (the slide's own, else the deck's; none on timer and live slides unless set); builds and a quiz answer share that time evenly. Pen, black screen and the pause button stop the clock. */
function autoSecs(s){ var a=deck.auto; if(!a.on||!s||s.sec<0) return 0; if(s.sec>0) return s.sec; return s.layout==='timer'||s.layout==='live'?0:a.sec; }
function armAuto(){ var u=pr.au, s=pr.end?null:deck.slides[pr.i], sec=autoSecs(s); if(!sec){ u.dur=u.left=0; auPaint(); return; }
  var quiz=s.layout==='quiz'&&pr.rev!==pr.i&&s.caption.trim()?1:0; u.dur=u.left=Math.round(sec*1000/(pr.nb+quiz+1)); u.last=Date.now(); auPaint(); }
function auTick(){ var u=pr.au; if(!pr.on) return; var now=Date.now(), dt=Math.min(now-u.last,500); u.last=now; if(u.dur<=0||u.paused||ink.tool||pr.black||pr.end||document.hidden) return auPaint();
  u.left-=dt; if(u.left<=0){ var s=deck.slides[pr.i], last=s&&pr.step>=pr.nb&&nextVis(pr.i,1)<0&&!(s.layout==='quiz'&&pr.rev!==pr.i&&s.caption.trim()); if(last&&deck.auto.loop) pHome(); else pNext(); return; } auPaint(); }
function auPaint(){ var u=pr.au, b=$('pAutoB'), on=deck.auto.on&&pr.on; b.hidden=!on; $('pAuto').hidden=!on||u.dur<=0; $('pAuto').firstChild.style.width=u.dur>0?Math.round((1-u.left/u.dur)*1000)/10+'%':'0';
  $('pAuto').classList.toggle('paused',u.paused||!!ink.tool||pr.black); b.classList.toggle('on',u.paused); b.textContent=u.paused?'▶':'⏸'; b.title=T(u.paused?'자동 넘기기 이어가기 (K)':'자동 넘기기 멈추기 (K)')+(u.dur>0&&!u.paused?' · '+F('{0}초 남음',Math.ceil(u.left/1000)):''); }
function auToggle(){ if(!deck.auto.on) return toast(T('자동 넘기기가 꺼져 있어요 (메뉴 > 자동 넘기기)')); var u=pr.au; u.paused=!u.paused; u.last=Date.now(); auPaint(); toast(T(u.paused?'자동 넘기기를 멈췄어요':'자동 넘기기를 이어가요')); }
function exitPresent(){ if(!pr.on) return; pr.on=false; pvPost({type:'exit'}); setInk(''); setBoard(false); inkClear(); clearInterval(pr.au.tm); pr.au.dur=0; clearInterval(pr.tm); clearTimeout(pr.goT); pr.go=''; setLaser(false); $('present').classList.remove('on');
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
var ink={tool:'', pc:'#ff3b3b', hc:'#ffe14d', wi:1, strokes:[], cur:null}, inkKey=-2, INKC={pen:['#ff3b3b','#2f7bff','#22c55e','#ffffff','#111111'], hi:['#ffe14d','#7cf58a','#ff9ad5','#6fd6ff']}, INKW={pen:[3,6,12], hi:[18,30,52], er:[14,28,52]};
function inkFit(){ var c=$('pInk'), d=window.devicePixelRatio||1, w=Math.max(1,Math.round(innerWidth*d)), h=Math.max(1,Math.round(innerHeight*d)); if(c.width!==w||c.height!==h){ c.width=w; c.height=h; } inkDraw(); }
function inkDraw(){ var c=$('pInk'), x=c.getContext('2d'), d=window.devicePixelRatio||1, r=$('pStage').getBoundingClientRect(), k=r.width/W; x.setTransform(1,0,0,1,0,0); x.clearRect(0,0,c.width,c.height); x.setTransform(d,0,0,d,0,0);
  x.lineCap='round'; x.lineJoin='round';
  ink.strokes.concat(ink.cur?[ink.cur]:[]).forEach(function(s){ if(!s.p.length) return; x.globalAlpha=s.t==='hi'?.4:1; x.strokeStyle=s.c; x.lineWidth=(s.w||(s.t==='hi'?30:5))*k; x.beginPath();
    x.moveTo(r.left+s.p[0][0]*r.width,r.top+s.p[0][1]*r.height); if(s.p.length===1) x.lineTo(r.left+s.p[0][0]*r.width+.01,r.top+s.p[0][1]*r.height); else for(var i=1;i<s.p.length;i++) x.lineTo(r.left+s.p[i][0]*r.width,r.top+s.p[i][1]*r.height); x.stroke(); });
  x.globalAlpha=1; }
function inkClear(){ ink.strokes=[]; ink.cur=null; $('pClrB').hidden=!ink.tool; inkDraw(); }
function inkCols(){ var b=$('pInkCols'); b.innerHTML=''; if(!ink.tool) return; var key=ink.tool==='hi'?'hc':'pc';
  if(ink.tool!=='er') INKC[ink.tool].forEach(function(c){ var s=document.createElement('button'); s.className='ink-c'+(ink[key]===c?' on':''); s.style.background=c; s.setAttribute('aria-label',c); s.onclick=function(e){ e.stopPropagation(); ink[key]=c; inkCols(); }; b.appendChild(s); });
  /* thickness: thin, medium, thick (the pen's line, the highlighter's band or the eraser's reach) */
  [0,1,2].forEach(function(i){ var s=document.createElement('button'); s.className='ink-w'+(ink.wi===i?' on':''); s.innerHTML='<i style="width:'+(6+i*5)+'px;height:'+(6+i*5)+'px"></i>'; var nm=T(['가는 선','보통 선','굵은 선'][i]); s.title=nm; s.setAttribute('aria-label',nm); s.onclick=function(e){ e.stopPropagation(); ink.wi=i; inkCols(); }; b.appendChild(s); }); }
/* the board: a chalkboard over the slide to write on (chalk white by default); gone with the next slide like any drawing */
function setBoard(on){ pr.bb=!!on; $('present').classList.toggle('bb',pr.bb); $('pBbB').classList.toggle('on',pr.bb); if(pr.bb) ink.pc='#ffffff'; if(pr.bb&&(!ink.tool||ink.tool==='er')) setInk('pen'); inkDraw(); }
/* the eraser takes away whole strokes that it touches */
function inkErase(pt,px){ var r=$('pStage').getBoundingClientRect(), rad=INKW.er[ink.wi], n=ink.strokes.length;
  var hit=function(s){ var w=s.w||(s.t==='hi'?30:5), R=rad+w*r.width/W/2; return s.p.some(function(q,i){ var x=r.left+q[0]*r.width-px[0], y=r.top+q[1]*r.height-px[1]; if(x*x+y*y<=R*R) return true; if(!i) return false;
    var a=s.p[i-1], ax=r.left+a[0]*r.width-px[0], ay=r.top+a[1]*r.height-px[1], dx=x-ax, dy=y-ay, L=dx*dx+dy*dy, t=L?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/L)):0, cx=ax+t*dx, cy=ay+t*dy; return cx*cx+cy*cy<=R*R; }); };
  ink.strokes=ink.strokes.filter(function(s){ return !hit(s); }); if(ink.strokes.length!==n) inkDraw(); }
function setInk(t){ if(ink.tool===t) t=''; ink.tool=t; ink.cur=null; if(t) setLaser(false); $('present').classList.toggle('ink',!!t); $('present').classList.toggle('er',t==='er'); $('pPenB').classList.toggle('on',t==='pen'); $('pHiB').classList.toggle('on',t==='hi'); $('pErB').classList.toggle('on',t==='er'); $('pClrB').hidden=!t; inkCols(); inkDraw(); }
(function(){ var c=$('pInk'), pid=null;
  var pt=function(e){ var r=$('pStage').getBoundingClientRect(); return [(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height]; };
  c.addEventListener('pointerdown',function(e){ if(!ink.tool||(e.button&&e.pointerType==='mouse')) return; e.preventDefault(); pid=e.pointerId; try{ c.setPointerCapture(pid); }catch(err){}
    if(ink.tool==='er'){ ink.erasing=true; inkErase(pt(e),[e.clientX,e.clientY]); return; }
    ink.cur={t:ink.tool, c:ink.tool==='hi'?ink.hc:ink.pc, w:INKW[ink.tool][ink.wi], p:[pt(e)]}; inkDraw(); });
  c.addEventListener('pointermove',function(e){ if(ink.erasing&&e.pointerId===pid){ e.preventDefault(); (e.getCoalescedEvents?e.getCoalescedEvents():[e]).forEach(function(q){ inkErase(pt(q),[q.clientX,q.clientY]); }); return; } if(!ink.cur||e.pointerId!==pid) return; e.preventDefault(); (e.getCoalescedEvents?e.getCoalescedEvents():[e]).forEach(function(q){ ink.cur.p.push(pt(q)); }); inkDraw(); });
  var end=function(e){ if(ink.erasing&&e.pointerId===pid){ ink.erasing=false; pid=null; return; } if(!ink.cur||e.pointerId!==pid) return; ink.strokes.push(ink.cur); ink.cur=null; pid=null; inkDraw(); };
  c.addEventListener('pointerup',end); c.addEventListener('pointercancel',end);
})();
$('pPenB').onclick=function(){ setInk('pen'); }; $('pHiB').onclick=function(){ setInk('hi'); }; $('pErB').onclick=function(){ setInk('er'); }; $('pBbB').onclick=function(){ setBoard(!pr.bb); }; $('pClrB').onclick=inkClear; $('pAutoB').onclick=auToggle;
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

/* ---------- share: read-only link and QR. Everything is client side: the slides are packed into the address after the # (deflate + base64url), which browsers never send to a server.
   The viewer (#v=...) unpacks them. It is not live: viewers page through on their own, and pictures are left out to keep the link short. ---------- */
function b64u(u){ var s='', i; for(i=0;i<u.length;i+=8192) s+=String.fromCharCode.apply(null,u.subarray(i,i+8192)); return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function unb64u(t){ t=String(t).replace(/-/g,'+').replace(/_/g,'/'); while(t.length%4) t+='='; var b=atob(t), u=new Uint8Array(b.length), i; for(i=0;i<b.length;i++) u[i]=b.charCodeAt(i); return u; }
function pipeBytes(kind,bytes,cap){ var S=new window[kind]('deflate-raw'), w=S.writable.getWriter(), rd=S.readable.getReader(), got=[], n=0; w.write(bytes).catch(function(){}); w.close().catch(function(){});
  return (function pump(){ return rd.read().then(function(r){ if(r.done){ var o=new Uint8Array(n), k=0; got.forEach(function(c){ o.set(c,k); k+=c.length; }); return o; } n+=r.value.length; if(cap&&n>cap){ rd.cancel(); throw new Error('size'); } got.push(r.value); return pump(); }); })(); }
var SH_TEXT=['title','subtitle','leftTitle','rightTitle','stat','caption','quote','by','data'];
function shareJSON(o){ var live=deck.slides.filter(function(s){ return !s.hide&&s.layout==='live'; }).length, vis=deck.slides.filter(function(s){ return !s.hide&&s.layout!=='live'; }), pics=0, start=0, d={v:1, n:deck.name, t:deck.theme};
  if(deck.font) d.f=deck.font; if(deck.nums) d.m=1; if(deck.footer) d.o=deck.footer; var ma=deck.master; if(ma&&(!ma.on||ma.fpos!=='l'||ma.npos!=='r'||ma.ttl)) d.ma=[ma.on?1:0,ma.fpos,ma.npos,ma.ttl?1:0];
  vis.forEach(function(s,i){ if(s.img) pics++; if(deck.slides[cur]&&deck.slides.indexOf(s)<=cur) start=i; });
  d.s=vis.map(function(s){ var x={l:s.layout}; SH_TEXT.forEach(function(k){ if(s[k]&&!(k==='caption'&&s.layout==='quiz'&&!o.ans)) x[k]=s[k]; }); LISTS.forEach(function(k){ if(s[k].length) x[k]=s[k]; });
    if(s.layout==='chart'&&s.ctype!=='bar') x.c=s.ctype; if(s.bg) x.bg=s.bg; if(Object.keys(s.pos).length) x.p=s.pos; if(s.els.length) x.e=s.els; if(o.notes&&s.notes&&s.notes.trim()) x.notes=s.notes; return x; });
  return {json:JSON.stringify(d), n:vis.length, hidden:deck.slides.length-vis.length-live, live:live, pics:pics, start:start}; }
function shareEncode(json){ var bytes=new TextEncoder().encode(json), plain='j'+b64u(bytes);
  if(!window.CompressionStream) return Promise.resolve(plain); return pipeBytes('CompressionStream',bytes).then(function(z){ var c='z'+b64u(z); return c.length<plain.length?c:plain; },function(){ return plain; }); }
function shareDecode(pl){ pl=String(pl||''); var kind=pl[0], raw; try{ raw=unb64u(pl.slice(1)); }catch(e){ return Promise.reject(e); }
  var p; if(kind==='j') p=Promise.resolve(raw); else if(kind==='z'&&window.DecompressionStream) p=pipeBytes('DecompressionStream',raw,4e6); else return Promise.reject(new Error('format'));
  return p.then(function(u){ var d=JSON.parse(new TextDecoder().decode(u)); if(!d||!Array.isArray(d.s)) throw new Error('data');
    var o={id:uid(), name:String(d.n||'').slice(0,120)||T('발표 자료'), theme:d.t, font:d.f, nums:!!d.m, footer:String(d.o||'').slice(0,200), master:Array.isArray(d.ma)?{on:d.ma[0]!==0, fpos:d.ma[1], npos:d.ma[2], ttl:!!d.ma[3]}:null, t:Date.now(), slides:d.s.slice(0,200).map(function(x){
      x=x&&typeof x==='object'?x:{}; var s={layout:x.l}; SH_TEXT.concat(['notes','bg']).forEach(function(k){ if(typeof x[k]==='string') s[k]=x[k].slice(0,20000); }); LISTS.forEach(function(k){ if(Array.isArray(x[k])) s[k]=x[k].slice(0,40).map(function(v){ return String(v).slice(0,2000); }); }); if(x.c) s.ctype=x.c; s.pos=x.p; s.els=Array.isArray(x.e)?x.e.slice(0,80):[]; return s; })};
    return fixDeck(o); }); }
function shareBase(){ return location.href.split('#')[0]; }
var shTok=0;
function shOpts(){ return {notes:$('shNotes').checked, ans:$('shAns').checked, cur:$('shCur').checked}; }
function shBuild(){ var tok=++shTok, o=shOpts(), j=shareJSON(o), qb=$('shQrBox'); $('shLink').value=''; $('shInfo').textContent=T('링크를 만드는 중…'); qb.hidden=true; $('shWarn').hidden=true; ['shCopy','shOpen','shShare'].forEach(function(id){ $(id).disabled=true; });
  shareEncode(j.json).then(function(pl){ if(tok!==shTok) return; var url=shareBase()+'#v='+pl+(o.cur&&j.start>0?'&p='+(j.start+1):''); $('shLink').value=url; ['shCopy','shOpen','shShare'].forEach(function(id){ $(id).disabled=false; });
    var info=F('{0}장 · 링크 길이 {1}자',j.n,url.length), warn=[];
    if(j.hidden) warn.push(F('건너뛰기로 숨긴 슬라이드 {0}장은 빠졌어요',j.hidden)); if(j.live) warn.push(F('살아있는 화면 슬라이드 {0}장은 링크에 담기지 않아요 (건너뛰어요)',j.live)); if(j.pics) warn.push(F('그림 {0}장은 링크에 담기지 않아요',j.pics));
    if(/^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|)$/.test(location.hostname)||location.protocol==='file:') warn.push(T('지금 주소는 이 기기 안에서만 열려요. 다른 사람의 휴대폰에서 열려면 웹사이트로 올린 주소에서 공유하세요.'));
    if(url.length>8000) warn.push(T('링크가 아주 길어서 메신저에서 잘릴 수 있어요. 슬라이드를 줄이거나 메모를 빼 보세요.'));
    $('shInfo').textContent=info; var q=null; try{ q=window.FFQR&&FFQR.make(url); }catch(e){}
    if(q){ FFQR.draw($('shQr'),q,Math.max(2,Math.floor(340/(q.size+8)))); $('shQrMsg').textContent=url.length>1100?T('QR이 아주 빽빽해요. 화면을 크게 띄우고 가까이서 찍어야 읽힐 수 있어요.'):T('휴대폰 카메라로 찍으면 바로 열려요.'); qb.hidden=false; }
    else warn.push(T('슬라이드 내용이 많아서 QR에는 담을 수 없어요 (약 2,900자까지). 링크로 보내 주세요.'));
    $('shWarn').textContent=warn.join(' '); $('shWarn').hidden=!warn.length; });
}
function openShare(){ if(!deck.slides.length||gen||busyOn) return; if(!deck.slides.some(function(s){ return !s.hide; })) return toast(T('모든 슬라이드를 숨겨서 공유할 수 없어요')); if(!deck.slides.some(function(s){ return !s.hide&&s.layout!=='live'; })) return toast(T('공유할 수 있는 슬라이드가 없어요')); blurEdit(); closeMenus(); $('shNotes').checked=$('shAns').checked=$('shCur').checked=false; $('shShare').hidden=!navigator.share; openDlg('shareDlg'); shBuild(); }
$('shareBtn').onclick=openShare; ['shNotes','shAns','shCur'].forEach(function(id){ $(id).onchange=shBuild; });
$('shCopy').onclick=function(){ var t=$('shLink').value, ok=function(){ toast(T('링크를 복사했어요')); }, fb=function(){ $('shLink').select(); try{ if(document.execCommand('copy')) return ok(); }catch(e){} toast(T('링크를 길게 눌러 복사해 주세요')); };
  if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok,fb); else fb(); };
$('shLink').addEventListener('focus',function(){ this.select(); });
$('shOpen').onclick=function(){ window.open($('shLink').value,'_blank','noopener'); };
$('shShare').onclick=function(){ try{ navigator.share({title:deck.name,url:$('shLink').value}).catch(function(){}); }catch(e){} };
$('shQrSave').onclick=function(){ $('shQr').toBlob(function(b){ if(b) download(b,fileName(deck.name)+' QR.png'); }); };
/* the viewer */
var vw={i:0, x:null};
function startView(){
  document.body.classList.add('mode-view'); $('viewer').hidden=false; deck=newDeck(); $('vMsg').textContent=T('슬라이드를 불러오는 중…'); ['vPrev','vNext','vImport'].forEach(function(id){ $(id).disabled=true; });
  var m=/^#v=([^&]*)(?:&p=(\d+))?/.exec(location.hash)||[];
  shareDecode(m[1]).then(function(d){ if(!d.slides.length) throw new Error('empty'); deck=d; fitCache.clear(); vw.i=Math.max(0,Math.min((+m[2]||1)-1,d.slides.length-1)); $('vName').textContent=d.name; document.title=d.name+' · Fry Slides'; $('vMsg').textContent=''; ['vPrev','vNext','vImport'].forEach(function(id){ $(id).disabled=false; }); vDraw(); },
    function(){ $('vMsg').textContent=T('링크를 읽지 못했어요. 링크가 중간에 잘렸거나 이 브라우저에서 열 수 없는 형식이에요.'); });
  $('vPrev').onclick=function(){ vGo(vw.i-1); }; $('vNext').onclick=function(){ vGo(vw.i+1); };
  $('vImport').onclick=function(){ var d=JSON.parse(JSON.stringify(deck)); d.id=uid(); d.t=Date.now(); d.slides.forEach(function(s){ s.id=uid(); }); var st=loadStore(); st.decks.unshift(fixDeck(d)); st.last=d.id;
    try{ localStorage.setItem(LS,JSON.stringify(st)); }catch(e){ return toast(T('저장 공간이 부족해서 저장하지 못했어요')); } location.replace(shareBase()); };
  var w=$('vWrap'); w.addEventListener('pointerdown',function(e){ vw.x=e.clientX; vw.y=e.clientY; }); w.addEventListener('pointerup',function(e){ if(vw.x==null) return; var dx=e.clientX-vw.x, dy=e.clientY-vw.y; vw.x=null; if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)) vGo(vw.i+(dx<0?1:-1)); });
  if(window.ResizeObserver) new ResizeObserver(vScale).observe(w); else window.addEventListener('resize',vScale);
}
function vGo(i){ if(i<0||i>=deck.slides.length) return; vw.i=i; vDraw(); }
function vScale(){ var w=$('vWrap'), st=$('vStage'), k=Math.min((w.clientWidth-20)/W,(w.clientHeight-20)/H); if(!(k>0)) return; st.style.width=W*k+'px'; st.style.height=H*k+'px'; var el=st.firstChild; if(el) el.style.transform='scale('+k+')'; }
function vDraw(){ var st=$('vStage'), s=deck.slides[vw.i], t=th(), n=deck.slides.length; st.innerHTML=''; if(!s) return; var el=slideEl(s,t,false,{hideAns:s.layout==='quiz'}); st.appendChild(el); fitAll(el,s,t); vScale();
  $('vNum').textContent=(vw.i+1)+' / '+n; $('vProg').firstChild.style.width=Math.round((vw.i+1)/n*100)+'%'; $('vPrev').disabled=vw.i===0; $('vNext').disabled=vw.i===n-1; }
function viewKey(e){ if(e.ctrlKey||e.metaKey||e.altKey||!deck.slides.length) return; var k=e.key;
  if(k==='ArrowRight'||k==='ArrowDown'||k==='PageDown'||k===' '||k==='Enter'){ e.preventDefault(); vGo(vw.i+1); } else if(k==='ArrowLeft'||k==='ArrowUp'||k==='PageUp'||k==='Backspace'){ e.preventDefault(); vGo(vw.i-1); } else if(k==='Home'){ e.preventDefault(); vGo(0); } else if(k==='End'){ e.preventDefault(); vGo(deck.slides.length-1); } }
window.addEventListener('hashchange',function(){ var m=/^#presenter/.test(location.hash)?'pv':/^#v=/.test(location.hash)?'view':''; if(m!==MODE||m==='view') location.reload(); });

/* ---------- keyboard ---------- */
document.addEventListener('keydown',function(e){
  if(MODE){ if(MODE==='pv') pvKey(e); else viewKey(e); return; }
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
    else if(k==='Escape'){ e.preventDefault(); if(ink.tool) setInk(''); else if(pr.bb) setBoard(false); else exitPresent(); }
    else if(k==='k'||k==='K'){ e.preventDefault(); auToggle(); }
    else if(k==='x'||k==='X'){ e.preventDefault(); setInk('er'); }
    else if(k==='w'||k==='W'){ e.preventDefault(); setBoard(!pr.bb); }
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
  /* a picked box: arrows nudge it, Delete removes a shape or the picture (never the slide), Esc lets it go */
  if(selK&&!$('editor').hidden&&!gen&&!busyOn&&!mod&&!e.altKey){ var nd={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
    if(nd){ e.preventDefault(); var stp=e.shiftKey?20:2; nudge(nd[0]*stp,nd[1]*stp); return; }
    if(e.key==='Delete'||e.key==='Backspace'){ e.preventDefault(); delSel(); return; }
    if(e.key==='Escape'){ setSel(null); return; } }
  if(mod&&selK&&!$('editor').hidden&&!gen&&!busyOn&&(e.key==='c'||e.key==='C')&&selEls(deck.slides[cur]).length){ e.preventDefault(); copySel(); return; }
  if(mod&&!$('editor').hidden&&!gen&&!busyOn&&deck.slides[cur]){ var ek=e.key.toLowerCase(), ss=deck.slides[cur];
    if(ek==='a'&&ss.els.length){ e.preventDefault(); selectIds(ss.els.map(function(x){ return x.id; })); return; }
    if(ek==='g'&&selEls(ss).length){ e.preventDefault(); if(e.shiftKey) ungroupSel(); else groupSel(); return; }
    if((e.code==='BracketRight'||e.code==='BracketLeft')&&selEls(ss).length){ e.preventDefault(); layerSel(e.code==='BracketRight'?(e.shiftKey?'front':'fwd'):(e.shiftKey?'back':'bwd')); return; } }
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
function deckText(){ return deck.name+' '+deck.slides.map(function(s){ return [s.title,s.subtitle,s.bullets.join(' '),s.left.join(' '),s.right.join(' '),s.leftTitle,s.rightTitle,s.stat,s.caption,s.quote,s.by].concat(s.els.map(function(e){ return e.text; })).join(' '); }).join(' '); }
function pptxFace(t,head,txt){ if(/[぀-ヿ]/.test(txt)) return t.serif&&head?'Yu Mincho':'Yu Gothic'; if(/[가-힣]/.test(txt)) return t.serif&&head?'Batang':'Malgun Gothic'; if(/[一-鿿]/.test(txt)) return 'Microsoft YaHei'; return head?t.pfh:t.pfb; }
/* pictures cropped into a round shape or a circle are cut on a canvas (the image fills the box, the rest is cropped; PNG keeps the cut corners clear), because PowerPoint's own picture crop cannot be written by the library */
var picCache={};
function cropPic(s,b){ return new Promise(function(res){ var im=new Image(); im.onerror=function(){ res(''); }; im.onload=function(){ var k=Math.min(2,1600/Math.max(b.w,b.h)), cw=Math.max(1,Math.round(b.w*k)), ch=Math.max(1,Math.round(b.h*k)), c=document.createElement('canvas'); c.width=cw; c.height=ch; var x=c.getContext('2d');
    x.beginPath(); if(s.ish==='ell') x.ellipse(cw/2,ch/2,cw/2,ch/2,0,0,Math.PI*2); else { var r=Math.min(cw,ch)*.16667; x.moveTo(r,0); x.arcTo(cw,0,cw,ch,r); x.arcTo(cw,ch,0,ch,r); x.arcTo(0,ch,0,0,r); x.arcTo(0,0,cw,0,r); x.closePath(); } x.clip();
    var q=Math.max(cw/im.width,ch/im.height), w=im.width*q, h=im.height*q; x.drawImage(im,(cw-w)/2,(ch-h)/2,w,h); var d=''; try{ d=c.toDataURL('image/png'); }catch(e){} res(d); }; im.src=s.img; }); }
function prepPics(){ picCache={}; return Promise.all(deck.slides.map(function(s){ var b=s.img&&s.ish!=='rect'&&boxDef(s,'img'); return b?cropPic(s,b).then(function(d){ if(d) picCache[s.id]=d; }):null; })); }
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
  /* shapes: lines become a line shape (flipped for the other diagonal, the arrowhead at the right end); closed ones carry their text.
     PowerPoint draws the outline centred on the edge, the screen inside it, so the box is shrunk by half the outline */
  function pptxShape(sl,e,t,fs){ var c=function(v){ return C(colOf(v,t)); };
    if(isLine(e)){ var o={x:I(Math.min(e.x,e.x+e.w)), y:I(Math.min(e.y,e.y+e.h)), w:I(Math.abs(e.w)), h:I(Math.abs(e.h)), line:{color:c(e.line), width:PT(e.sw)}};
      if((e.w<0)!==(e.h<0)) o.flipH=true; if(e.k==='arrow') o.line[e.h>=0?'endArrowType':'beginArrowType']='triangle'; sl.addShape(p.ShapeType.line,o); return; }
    var ln=e.sw&&e.line, h2=ln?e.sw/2:0, ty={rect:p.ShapeType.rect, round:p.ShapeType.roundRect, ell:p.ShapeType.ellipse, tri:p.ShapeType.triangle, star:p.ShapeType.star5}[e.k];
    var q={x:I(e.x+h2), y:I(e.y+h2), w:I(e.w-2*h2), h:I(e.h-2*h2), fill:e.fill?(e.op<100?{color:c(e.fill), transparency:100-e.op}:{color:c(e.fill)}):{type:'none'}, line:ln?{color:c(e.line), width:PT(e.sw)}:{type:'none'}};
    if(e.k==='round') q.rectRadius=I(Math.min(e.w,e.h)*.16667);
    if(e.text.trim()){ q.shape=ty; q.fontFace=fb; q.fontSize=PT(fs['e:'+e.id]||e.fs||SH_FS); q.color=C(shTextCol(e,t)); q.align={l:'left',c:'center',r:'right'}[e.al]||'center'; q.valign='middle'; q.margin=0; sl.addText(e.text,q); }
    else sl.addShape(ty,q); }
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
    s.els.forEach(function(e){ if(e.back) pptxShape(sl,e,t,fs); });
    (LAY[s.layout]||LAY.bullets).forEach(function(b0){ var b=boxOf(s,b0);
      if(b.view==='live'){ var lc=liveCfg(s); sl.addText([{text:(lc?liveName(lc)+'\n':''), options:{bold:true, fontSize:24, breakLine:!!lc}},{text:T('발표 때 직접 실행하는 화면이에요'), options:{fontSize:28}}],
        {x:I(b.x), y:I(b.y), w:I(b.w), h:I(b.h), fontFace:fb, color:C(t.fg), align:'center', valign:'middle', fill:{color:C(mix(t.bg,t.fg,.08))}, line:{color:C(mix(t.bg,t.fg,.4)), width:2, dashType:'dash'}}); return; }
      if(b.view){ pptxData(sl,s,b,t); return; } if(b.cls==='ans') return;
      if(b.f==='img'){ if(s.img&&s.iw&&s.ih){ var bd=s.ibw&&s.ibc?{color:C(colOf(s.ibc,t)), width:PT(s.ibw)}:null, h2=bd?s.ibw/2:0;
          /* round | ell: the picture was cropped into the shape on a canvas first (prepPics), PowerPoint gets that PNG with its corners cut away */
          if(s.ish!=='rect'&&picCache[s.id]){ sl.addImage({data:picCache[s.id].replace(/^data:/,''), x:I(b.x), y:I(b.y), w:I(b.w), h:I(b.h)});
            if(bd) sl.addShape(s.ish==='ell'?p.ShapeType.ellipse:p.ShapeType.roundRect,{x:I(b.x+h2), y:I(b.y+h2), w:I(b.w-2*h2), h:I(b.h-2*h2), fill:{type:'none'}, line:bd, rectRadius:I(Math.min(b.w,b.h)*.16667)}); return; }
          var k=Math.min(b.w/s.iw,b.h/s.ih), w=s.iw*k, h=s.ih*k; sl.addImage({data:s.img.replace(/^data:/,''), x:I(b.x+(b.w-w)/2), y:I(b.y+(b.h-h)/2), w:I(w), h:I(h)});
          if(bd) sl.addShape(p.ShapeType.rect,{x:I(b.x+(b.w-w)/2+h2), y:I(b.y+(b.h-h)/2+h2), w:I(w-2*h2), h:I(h-2*h2), fill:{type:'none'}, line:bd}); } return; }
      if(empty(s,b.f)) return; var r=role(t,b.k), pt=PT(fs[b.f]||b.fs);
      var o={x:I(b.x), y:I(b.y), w:I(b.w), h:I(b.h), fontFace:r.head?fh:fb, fontSize:pt, color:C(r.c), bold:r.w>=700, align:b.al||'left', valign:VA[b.va||'flex-start'],
        margin:0, lineSpacingMultiple:Math.round(r.lh/1.2*100)/100, fit:'shrink', paraSpaceAfter:0};
      if(b.list){ var items=s[b.f]; sl.addText(items.map(function(x,i){ return {text:x, options:{bullet:{indent:Math.round(pt*1.15)}, paraSpaceAfter:i<items.length-1?Math.round(pt*0.5):0, breakLine:i<items.length-1}}; }),o); }
      else sl.addText(String(s[b.f]),o);
    });
    s.els.forEach(function(e){ if(!e.back) pptxShape(sl,e,t,fs); });
    footOf(s,t).forEach(function(f){ if(f.logo){ sl.addImage({data:f.logo.replace(/^data:/,''), x:I(f.x), y:I(f.y), w:I(f.w), h:I(f.h)}); return; } sl.addText(f.t,{x:I(f.x), y:I(f.y), w:I(f.w), h:I(f.h), fontFace:fb, fontSize:PT(f.fs), color:C(f.c), align:f.al, valign:'middle', margin:0}); });
    var nts=[s.notes&&s.notes.trim(), s.layout==='quiz'&&s.caption.trim()?T('정답')+': '+s.caption:''].filter(Boolean).join('\n\n'); if(nts) sl.addNotes(nts);
  });
  return p;
}
function download(blob,name){ var u=URL.createObjectURL(blob), a=document.createElement('a'); a.href=u; a.download=name; a.style.display='none'; document.body.appendChild(a); a.click();
  setTimeout(function(){ URL.revokeObjectURL(u); a.remove(); },4000); }
function exportPPTX(){
  if(!deck.slides.length) return toast(T('먼저 슬라이드를 만들어 주세요'));
  blurEdit(); saveNow(); var b=$('pptxBtn'); b.disabled=true;
  needPPTX().then(function(P){ return prepPics().then(function(){ return buildPPTX(P).write({outputType:'blob', compression:true}); }); }).then(function(blob){ download(blob,fileName(deck.name)+'.pptx'); })
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
if(MODE==='pv') startPV(); else if(MODE==='view') startView(); else openDeck(first||newDeck());

/* used by ai-slides.js */
window.FSL={
  get deck(){ return deck; }, get cur(){ return cur; }, get busy(){ return gen||busyOn; }, LAYS:AILAYS, LAY:LAY, blank:blank, fixSlide:fixSlide, toast:toast, ask:ask, pushUndo:pushUndo, snap:snap,
  saveSoon:saveSoon, saveNow:saveNow, refresh:refresh, select:select, isDefaultName:isDefaultName, openMenu:openMenu, closeMenus:closeMenus, blurEdit:blurEdit,
  newDeckWith:function(topic){ blurEdit(); saveNow(); if(deck.slides.length||!isDefaultName(deck.name)) openDeck(newDeck()); deck.topic=topic; $('topic').value=topic; saveSoon(); return Promise.resolve(); },
  setName:function(n){ deck.name=n; $('deckName').value=n; saveSoon(); },
  setGen:function(on){ gen=on; $('genBar').hidden=!on; refresh(); },
  setBusy:function(on){ busyOn=on; $('busy').hidden=!on; drawMain(); updUR(); },
  pushSlide:function(s){ deck.slides.push(fixSlide(s)); cur=deck.slides.length-1; refresh(); saveSoon(); },
  putSlide:function(i,s){ var o=deck.slides[i]; if(!o) return; s=fixSlide(s); s.id=o.id; s.img=o.img; s.iw=o.iw; s.ih=o.ih; s.hide=o.hide; s.bg=o.bg; s.data=o.data; s.ctype=o.ctype; s.pos=o.pos; s.els=o.els; s.build=o.build; s.tr=o.tr; s.sec=o.sec; s.ish=o.ish; s.ibc=o.ibc; s.ibw=o.ibw; deck.slides[i]=s; if(i===cur) drawMain(); updateThumb(i); saveSoon(); },
  insertSlide:function(i,s){ deck.slides.splice(i,0,fixSlide(s)); cur=i; refresh(); saveSoon(); }
};
window.__fsl={shareEncode:shareEncode, shareDecode:shareDecode, shareJSON:shareJSON, get deck(){ return deck; }, get store(){ return store; }, get cur(){ return cur; }, select:select, present:present, exitPresent:exitPresent, get pr(){ return pr; }, buildPPTX:buildPPTX, prepPics:prepPics, needPPTX:needPPTX, measure:measure, undo:doUndo, redo:doRedo, moveSlide:moveSlide};
})();
