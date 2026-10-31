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
/* font sets: one pick changes the title font and the body font together. hf / bf: CSS stacks, hw: title weight (display fonts have one weight), g: Google Fonts families loaded the first time they are needed */
var FSETS={
  book:{n:'명조 제목 + 명조 본문', hf:SERIF, bf:SERIF, hw:700, pfh:'Georgia', pfb:'Georgia', sh:1, sb:1},
  black:{n:'굵은 제목(블랙 한 산스) + 고딕 본문', hf:"'Black Han Sans','Noto Sans KR',sans-serif", bf:SANS, hw:400, pfh:'Arial Black', pfb:'Arial', g:'Black+Han+Sans'},
  jua:{n:'둥근 제목(주아) + 부드러운 본문(고운 돋움)', hf:"'Jua','Noto Sans KR',sans-serif", bf:"'Gowun Dodum','Noto Sans KR',sans-serif", hw:400, pfh:'Trebuchet MS', pfb:'Trebuchet MS', g:'Jua|Gowun+Dodum'},
  pen:{n:'손글씨 제목(개구) + 부드러운 본문(고운 돋움)', hf:"'Gaegu','Noto Sans KR',sans-serif", bf:"'Gowun Dodum','Noto Sans KR',sans-serif", hw:700, pfh:'Trebuchet MS', pfb:'Trebuchet MS', g:'Gaegu:wght@400;700|Gowun+Dodum'}
};
var FONTS=[['','테마 기본'],['sans','고딕 (제목·본문)'],['serif','명조 제목 + 고딕 본문'],['book',FSETS.book.n],['black',FSETS.black.n],['jua',FSETS.jua.n],['pen',FSETS.pen.n],['mono','고정폭 (제목·본문)']];
function withFont(t,f){ if(!f) return t; var o={}, fs=FSETS[f]; for(var k in t) o[k]=t[k]; o.f=f; o.serif=f==='serif'?1:0; o.mono=f==='mono'?1:0; if(f==='sans') o.pfh='Arial'; if(f==='serif') o.pfh='Georgia'; if(f==='mono') o.pfh=o.pfb='Courier New';
  if(fs){ o.serif=fs.sh?1:0; o.bserif=fs.sb?1:0; o.hf=fs.hf; o.bf=fs.bf; o.hw=fs.hw; o.pfh=fs.pfh; o.pfb=fs.pfb; } return o; }
/* the web fonts of a set are asked for the first time it is used (or its menu entry is shown), then the slides are fitted again */
var fontsAsked={};
function askFonts(f){ var fs=FSETS[f]; if(!fs||!fs.g||fontsAsked[f]) return; fontsAsked[f]=1;
  var l=document.createElement('link'); l.rel='stylesheet'; l.href='https://fonts.googleapis.com/css2?family='+fs.g.split('|').join('&family=')+'&display=swap';
  l.onload=function(){ requestAnimationFrame(function(){ if(document.fonts&&document.fonts.ready) document.fonts.ready.then(function(){ fitCache.clear(); if(!MODE&&deck&&deck.slides.length&&!pr.on){ drawList(); drawMain(); } }); }); };
  document.head.appendChild(l); }
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
/* sec: seconds before auto-advance when presenting (0 = the deck's, -1 = stay), ish/ibc/ibw: the picture's shape (rect | round | ell | heart | star | diamond | hex | tri | arch), border colour and width. g (on a shape): group id
   pos: boxes moved or resized by hand ({field: {x,y,w,h}}), els: shapes, build: what appears one by one when presenting ([{k,a,l,d,t,w,m}] in order; l: a list shows one line per press; d t w m: direction, seconds, delay, start mode), bld: 1/-1 = this slide's appear effects play by themselves / not (0 = the deck's), tr: this slide's transition ('' = the deck's) */
function blank(lay){ return {id:uid(), layout:lay||'bullets', title:'', subtitle:'', bullets:[], left:[], right:[], leftTitle:'', rightTitle:'', stat:'', caption:'', quote:'', by:'', notes:'', img:'', iw:0, ih:0, data:'', ctype:'bar', bg:'', live:'', hide:false, pos:{}, els:[], build:[], tr:'', sec:0, ish:'rect', ibc:'', ibw:0, ialt:'', tf:{}, link:null, choices:[], qok:-1}; }
var SHK=['rect','round','ell','tri','star','line','arrow','media','pic','dia','hex','pent','chev','plus','para','heart','call','ring'], MTS=['video','audio','yt'], ISH=['rect','round','ell','heart','star','diamond','hex','tri','arch'], ANIMS=['fade','fly','zoom','shrink','spin','bounce','shake','wipe','blur','flip','unfold','type','pulse','drop'], TRS=['fade','slide','zoom','none'];
/* appear effects: [id, label, has a direction, default seconds, default direction]; a build item is {k,a,l, d: direction it comes from (l r t b), t: seconds, w: delay seconds, m: 'w' with the one before / 'a' right after it (self-starting), none = on press} */
var FX=[['fade','서서히 나타나기',0,.9,''],['fly','날아 들어오기',1,.9,'b'],['zoom','확대하며 나타나기',0,.8,''],['shrink','축소하며 나타나기',0,.8,''],['spin','회전하며 나타나기',0,1.1,''],['bounce','튀어 오르기',1,1.3,'b'],['shake','흔들며 나타나기',0,1,''],['wipe','닦아내기',1,.9,'l'],['blur','흐림에서 선명하게',0,1.1,''],['flip','뒤집기',1,.9,'l'],['unfold','펼치기',1,.9,'t'],['type','글자 하나씩',0,0,''],['pulse','번쩍이며 강조',0,1,''],['drop','위에서 떨어지기',0,1.1,'']], BDIRS=['l','r','t','b'];
function fxOf(a){ for(var i=0;i<FX.length;i++) if(FX[i][0]===a) return FX[i]; return FX[0]; }
function num(v,d,lo,hi){ v=+v; return isFinite(v)?Math.max(lo,Math.min(hi,Math.round(v))):d; }
function fixCol(v,d){ v=v==null?d:String(v); return v===''||v==='ac'||v==='fg'||/^#[0-9a-f]{6}$/i.test(v)?v:d; }
function isLine(e){ return e.k==='line'||e.k==='arrow'; }
/* a shape: closed ones are a box (x,y,w,h); a line or an arrow runs from (x,y) to (x+w,y+h), so w and h can be negative.
   A connector is a line or an arrow with c = [from, to] (shape keys 'e:id' or layout box names): its x, y, w, h are worked out from the two boxes (connSync), so old decks and old versions just see a plain line. */
function fixConn(c){ if(!Array.isArray(c)||c.length!==2) return null; var o=c.map(function(v){ return String(v==null?'':v); });
  return o[0]!==o[1]&&o.every(function(v){ return /^(e:[\w-]{1,40}|[a-z]\w{0,19})$/i.test(v); })?o:null; }
/* text style of a whole box: tf = {b: 1 bold | -1 not bold | 0 as the theme has it, i: italic, u: underline, s: strikethrough, c: colour ('' = the theme's)}; a slide keeps one per layout box (s.tf), a shape one of its own */
var TFK=['title','subtitle','bullets','leftTitle','left','rightTitle','right','stat','caption','quote','by'];
function fixTf(t){ if(!t||typeof t!=='object') return null; var o={b:t.b>0?1:t.b<0?-1:0, i:t.i?1:0, u:t.u?1:0, s:t.s?1:0, c:fixCol(t.c,'')}; return o.b||o.i||o.u||o.s||o.c?o:null; }
function tfCss(o,th){ var c=colOf(o.c,th), d=(o.u?'underline ':'')+(o.s?'line-through':''); return (o.b?'font-weight:'+(o.b>0?800:400)+';':'')+(o.i?'font-style:italic;':'')+(d?'text-decoration:'+d.trim()+';':'')+(c?'color:'+c+';':''); }
function fixEl(e){ var o=fixEl0(e), tf=o&&!isLine(o)&&o.k!=='media'&&o.k!=='pic'?fixTf(e.tf):null, al=o&&e.alt!=null?String(e.alt).slice(0,300):''; if(tf) o.tf=tf; if(al) o.alt=al;
  if(o&&o.k!=='media'){ if(!isLine(o)){ var gl=num(e.gl,0,0,2), fl=num(e.fl,0,0,3); if(gl) o.gl=gl; if(fl) o.fl=fl; } if(o.k!=='pic'){ var ds=num(e.ds,0,0,2); if(ds) o.ds=ds; } } return o; }
function fixEl0(e){ if(!e||typeof e!=='object'||SHK.indexOf(e.k)<0) return null; var L=isLine(e), c=L?fixConn(e.c):null;
  if(e.k==='media'){ var src=String(e.src||'').slice(0,2000); if(MTS.indexOf(e.mt)<0||!(/^idb:[\w-]{1,60}$/.test(src)||/^https:\/\//i.test(src))) return null;
    return {id:String(e.id||uid()).slice(0,40), k:'media', mt:e.mt, src:src, nm:String(e.nm||'').slice(0,120), auto:!!e.auto, x:num(e.x,320,-2000,3000), y:num(e.y,180,-2000,3000), w:num(e.w,640,40,4000), h:num(e.h,360,30,4000),
      fill:'', line:'', sw:0, text:'', back:!!e.back, op:100, al:'c', fs:0, g:String(e.g||'').slice(0,40)}; }
  if(e.k==='pic'){ var ps=String(e.src||''); if(!/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(ps)||ps.length>6e6) return null;
    var po={id:String(e.id||uid()).slice(0,40), k:'pic', src:ps, iw:num(e.iw,100,1,8000), ih:num(e.ih,100,1,8000), x:num(e.x,320,-2000,3000), y:num(e.y,180,-2000,3000), w:num(e.w,400,20,4000), h:num(e.h,300,20,4000),
      fill:'', line:fixCol(e.line,''), sw:num(e.sw,0,0,40), text:'', back:!!e.back, op:num(e.op,100,10,100), al:'c', fs:0, g:String(e.g||'').slice(0,40),
      ish:ISH.indexOf(e.ish)>=0?e.ish:'rect', br:num(e.br,100,40,160), ct:num(e.ct,100,40,160), gs:num(e.gs,0,0,2), px:num(e.px,50,0,100), py:num(e.py,50,0,100)};
    var prt=num(e.rot,0,0,359); if(prt) po.rot=prt; var psd=num(e.sd,0,0,2); if(psd) po.sd=psd; var pu=String(e.url||''); if(/^https?:\/\/[^\s]{1,500}$/i.test(pu)) po.url=pu; return po; }
  var o={id:String(e.id||uid()).slice(0,40), k:e.k, x:num(e.x,400,-2000,3000), y:num(e.y,250,-2000,3000), w:L?num(e.w,300,-4000,4000):num(e.w,300,20,4000), h:L?num(e.h,0,-4000,4000):num(e.h,200,20,4000),
    fill:L?'':fixCol(e.fill,'ac'), line:fixCol(e.line,L?'fg':'')||(L?'fg':''), sw:num(e.sw,L?6:0,L?1:0,40), text:L?'':String(e.text==null?'':e.text).slice(0,2000), back:!!e.back, op:L?100:num(e.op,100,10,100), al:['l','c','r'].indexOf(e.al)>=0?e.al:'c', fs:L?0:num(e.fs,0,0,400), g:c?'':String(e.g||'').slice(0,40)}; if(c) o.c=c; if(!L){ var rt=num(e.rot,0,0,359); if(rt) o.rot=rt; var sd=num(e.sd,0,0,2); if(sd) o.sd=sd; var uu=String(e.url||''); if(/^https?:\/\/[^\s]{1,500}$/i.test(uu)) o.url=uu; } if(!L&&o.fill){ var gr=fixCol(e.gr,''); if(gr){ o.gr=gr; o.ga=num(e.ga,90,0,359); } } return o; }
function fixPos(p){ var o={}; if(p&&typeof p==='object'&&!Array.isArray(p)) for(var k in p){ var r=p[k]; if(r&&typeof r==='object'&&isFinite(+r.x)&&isFinite(+r.y)) o[k]={x:num(r.x,0,-2000,3000), y:num(r.y,0,-2000,3000), w:num(r.w,200,20,4000), h:num(r.h,100,20,4000)}; } return o; }
function fixSlide(s){ var b=blank(); s=s&&typeof s==='object'?s:{};
  if(LAYS.indexOf(s.layout)<0) s.layout='bullets'; if(!s.id) s.id=uid();
  LISTS.forEach(function(k){ s[k]=Array.isArray(s[k])?s[k].map(function(x){ return String(x==null?'':x); }).filter(function(x){ return x.trim(); }):[]; });
  TEXTS.forEach(function(k){ s[k]=s[k]==null?'':String(s[k]); });
  for(var k in b) if(s[k]===undefined) s[k]=b[k];
  s.hide=!!s.hide; if(['bar','line','pie'].indexOf(s.ctype)<0) s.ctype='bar'; if(!/^#[0-9a-f]{6}$/i.test(s.bg)) s.bg=''; if(!/^#[0-9a-f]{6}$/i.test(s.bg2)) s.bg2=''; s.bga=num(s.bga,90,0,359);
  /* decks saved before free placement, shapes and builds simply get none */
  s.pos=fixPos(s.pos); var ids={}; s.els=(Array.isArray(s.els)?s.els:[]).slice(0,80).map(fixEl).filter(function(e){ if(!e||ids[e.id]) return false; ids[e.id]=1; return true; });
  s.els=s.els.filter(function(e){ return !e.c||e.c.every(function(k){ return connOk(s,k); }); }); // a connector needs both of its ends
  var gc={}; s.els.forEach(function(e){ if(e.g) gc[e.g]=(gc[e.g]||0)+1; }); s.els.forEach(function(e){ if(e.g&&gc[e.g]<2) e.g=''; }); // a group needs two shapes
  s.sec=num(s.sec,0,-1,3600); if(ISH.indexOf(s.ish)<0) s.ish='rect'; s.ibc=fixCol(s.ibc,''); s.ibw=num(s.ibw,0,0,40); s.ialt=String(s.ialt||'').slice(0,300); var tfo={}; TFK.forEach(function(k){ var t=s.tf&&fixTf(s.tf[k]); if(t) tfo[k]=t; }); s.tf=tfo;
  var seen={}; s.build=(Array.isArray(s.build)?s.build:[]).filter(function(b){ if(!b||typeof b.k!=='string'||ANIMS.indexOf(b.a)<0||seen[b.k]) return false; seen[b.k]=1; return true; }).slice(0,80).map(function(b){ var o={k:b.k, a:b.a}; if(b.l&&LISTS.indexOf(b.k)>=0) o.l=1; if(BDIRS.indexOf(b.d)>=0) o.d=b.d; var bt=+b.t, bw=+b.w; if(bt>0) o.t=Math.round(Math.min(20,Math.max(.1,bt))*10)/10; if(bw>0) o.w=Math.round(Math.min(20,bw)*10)/10; if(b.m==='w'||b.m==='a') o.m=b.m; return o; });
  s.bld=s.bld===1||s.bld===-1?s.bld:0;
  if(TRS.indexOf(s.tr)<0) s.tr='';
  s.link=fixLink(s.link); s.choices=(Array.isArray(s.choices)?s.choices:[]).map(function(x){ return String(x==null?'':x).replace(/\s+/g,' ').trim().slice(0,80); }).filter(Boolean).slice(0,6); s.qok=num(s.qok,-1,-1,5);
  return s; }
function newDeck(){ return {id:uid(), name:T('새 발표 자료'), theme:'light', slides:[], t:Date.now(), topic:'', aud:'', n:8, nums:false, footer:'', font:'', trans:'fade', master:fixMaster(), auto:fixAuto()}; }
/* master slide (logo, footer text, slide number on every slide) and auto-advance when presenting; the footer text and number switch live in deck.footer / deck.nums */
var MPOS=['tl','tr','bl','br'], APOS=['l','c','r'], LSZ={sm:44, md:68, lg:104};
function fixMaster(m){ m=m&&typeof m==='object'?m:{}; var lg=typeof m.logo==='string'&&/^data:image\//.test(m.logo)?m.logo:'';
  return {on:m.on!==false, logo:lg, lw:lg?num(m.lw,100,1,4000):0, lh:lg?num(m.lh,100,1,4000):0, lpos:MPOS.indexOf(m.lpos)>=0?m.lpos:'tr', lsz:LSZ[m.lsz]?m.lsz:'md', fpos:APOS.indexOf(m.fpos)>=0?m.fpos:'l', npos:APOS.indexOf(m.npos)>=0?m.npos:'r', ttl:!!m.ttl}; }
function fixAuto(a){ a=a&&typeof a==='object'?a:{}; return {on:!!a.on, sec:num(a.sec,10,1,600), loop:!!a.loop, bld:!!a.bld}; }
function fixDeck(d){ d.slides=(Array.isArray(d.slides)?d.slides:[]).map(fixSlide); d.theme=themeOf(d.theme).id; d.name=String(d.name||T('새 발표 자료')); d.nums=!!d.nums; d.footer=String(d.footer||''); d.font=FONTS.some(function(f){ return f[0]===d.font; })?d.font:''; d.trans=['fade','slide','zoom','none'].indexOf(d.trans)<0?'fade':d.trans; d.master=fixMaster(d.master); d.auto=fixAuto(d.auto); d.co=d.co&&typeof d.co==='object'&&/^[0-9a-f-]{36}$/i.test(String(d.co.id))?{id:String(d.co.id), rev:num(d.co.rev,0,0,1e9), own:!!d.co.own}:null; if(!d.t) d.t=Date.now(); return d; }
function loadStore(){ var o=null; try{ o=JSON.parse(localStorage.getItem(LS)||'null'); }catch(e){}
  /* older saves: a single deck object, or a bare array of decks, become the first entries of the list */
  if(Array.isArray(o)) o={v:1, last:null, decks:o};
  else if(o&&typeof o==='object'&&!Array.isArray(o.decks)&&Array.isArray(o.slides)) o={v:1, last:o.id||null, decks:[o]};
  if(!o||typeof o!=='object'||!Array.isArray(o.decks)) o={v:1, last:null, decks:[]};
  o.decks=o.decks.filter(function(d){ return d&&typeof d==='object'; }).map(function(d){ if(!d.id) d.id=uid(); return fixDeck(d); }); return o; }
var store=loadStore(), deck=null, cur=0, undo=[], redo=[], gen=false, busyOn=false, saveT=null;
function isDefaultName(n){ return !n||!String(n).trim()||n===T('새 발표 자료')||n==='새 발표 자료'; }
function saveNow(){ clearTimeout(saveT); saveT=null; if(!deck||MODE) return; deck.slides.forEach(connSync); deck.t=Date.now(); store.last=deck.id;
  if(store.decks.indexOf(deck)<0) store.decks.unshift(deck);
  try{ localStorage.setItem(LS,JSON.stringify(store)); $('saved').textContent=T('저장됨'); }catch(e){ $('saved').textContent=''; toast(T('저장 공간이 부족해서 저장하지 못했어요')); }
  if(window.FSLX&&FSLX.onSaved) FSLX.onSaved();
  if(window.FFVer) FFVer.tick('slides.'+deck.id,snap); }
function saveSoon(){ $('saved').textContent=''; clearTimeout(saveT); saveT=setTimeout(saveNow,400); }
function openDeck(d){
  if(deck&&deck!==d&&!deck.slides.length&&isDefaultName(deck.name)&&!deck.topic) store.decks=store.decks.filter(function(x){ return x!==deck; }); // drop an untouched empty deck
  deck=d; cur=0; undo=[]; redo=[]; if(store.decks.indexOf(d)<0) store.decks.unshift(d);
  $('deckName').value=deck.name; syncLinks(false); refresh(); saveNow();
}

/* ---------- undo ---------- */
function snap(){ return JSON.stringify({n:deck.name, th:deck.theme, s:deck.slides, c:cur, f:deck.footer, nm:deck.nums, fo:deck.font, tr:deck.trans, ma:deck.master, au:deck.auto}); }
function pushUndo(s){ undo.push(s||snap()); if(undo.length>100) undo.shift(); redo=[]; updUR(); }
function restore(j){ var o=JSON.parse(j); deck.name=o.n; deck.theme=o.th; deck.footer=o.f||''; deck.nums=!!o.nm; deck.font=o.fo||''; deck.trans=o.tr||'fade'; deck.master=fixMaster(o.ma); deck.auto=fixAuto(o.au); deck.slides=o.s.map(fixSlide); cur=Math.max(0,Math.min(o.c,deck.slides.length-1)); $('deckName').value=deck.name; refresh(); saveSoon(); }
$('verBtn').onclick=function(){ blurEdit(); if(gen||busyOn||!window.FFVer) return; FFVer.open({key:'slides.'+deck.id,title:'버전 기록',get:snap,toast:toast,
  put:function(d){ pushUndo(); restore(d); },
  describe:function(d){ var o=JSON.parse(d); return F('슬라이드 {0}장',o.s.length); }}); };
function doUndo(){ blurEdit(); if(!undo.length||gen||busyOn) return; redo.push(snap()); restore(undo.pop()); updUR(); }
function doRedo(){ blurEdit(); if(!redo.length||gen||busyOn) return; undo.push(snap()); restore(redo.pop()); updUR(); }
function updUR(){ $('undoBtn').disabled=!undo.length||gen||busyOn; $('redoBtn').disabled=!redo.length||gen||busyOn; if(window.FRB) FRB.sync(); }

/* ---------- drawing a slide ---------- */
var CE=(function(){ var d=document.createElement('div'); try{ d.contentEditable='plaintext-only'; if(d.contentEditable==='plaintext-only') return 'plaintext-only'; }catch(e){} return 'true'; })();
function empty(s,f){ var v=s[f]; return Array.isArray(v)?!v.length:!String(v||'').trim(); }
var MONO="'D2Coding','Consolas','Courier New',monospace";
function cssVars(th){ return '--s-bg:'+th.bg+';--s-fg:'+th.fg+';--s-sub:'+th.sub+';--s-ac:'+th.ac+';--s-card:'+mix(th.bg,th.fg,.08)+';--s-on:'+onAc(th)+';--s-head:'+(th.hf||(th.mono?MONO:th.serif?SERIF:SANS))+';--s-body:'+(th.bf||(th.mono?MONO:SANS))+';--s-hw:'+(th.hw||(th.serif?700:800)); }
function onAc(th){ return lum(th.ac)>.4?'#111111':'#ffffff'; }
function fillList(ul,items){ ul.innerHTML=''; (items.length?items:['']).forEach(function(t){ var li=document.createElement('li'); if(t) li.textContent=t; else li.appendChild(document.createElement('br')); ul.appendChild(li); }); ul.classList.toggle('ph',!items.length); }
function slideEl(s,th,edit,opt){
  th=eth(s,th); opt=opt||{}; connSync(s);
  var el=document.createElement('div'); el.className='sl'+(edit?' edit':''); el.style.cssText=cssVars(th); el.setAttribute('data-notr','');
  deco(th,s.layout).forEach(function(d){ var e=document.createElement('div'); e.className='dc';
    var st='left:'+d.x+'px;top:'+d.y+'px;width:'+d.w+'px;height:'+d.h+'px;opacity:'+d.o+';';
    if(d.r==='frame') st+='border:10px solid '+d.c+';border-radius:6px;';
    else if(d.r==='glyph'){ st+='color:'+d.c+';font:700 '+d.fs+'px/1 Georgia,serif;text-align:center;'; e.textContent=d.t; }
    else st+='background:'+d.c+';'+(d.r==='ell'?'border-radius:50%;':'border-radius:'+(d.h<=10||d.w<=24?Math.min(d.h,d.w)/2:0)+'px;');
    e.style.cssText=st; el.appendChild(e); });
  var shp=function(back){ s.els.forEach(function(e){ if(!!e.back===back) el.appendChild(shapeEl(e,th,edit,opt)); }); };
  if(s.bg2) el.style.background='linear-gradient('+((s.bga==null?90:s.bga)+90)+'deg,'+th.bg+','+s.bg2+')';
  shp(true);
  (LAY[s.layout]||LAY.bullets).forEach(function(b0){
    var b=boxOf(s,b0), em=empty(s,b.f); if(em&&!edit) return;
    if(b.f==='img'){ var pc=document.createElement('div'); pc.className='pic'+(em?' empty':''); pc.dataset.f='img'; pc.dataset.bk='img';
      pc.style.cssText='left:'+b.x+'px;top:'+b.y+'px;width:'+b.w+'px;height:'+b.h+'px;';
      if(em) pc.textContent='🖼  '+T('그림 넣기'); else { var im=new Image(); im.src=s.img; im.draggable=false; im.alt=s.ialt||''; picStyle(im,s,b,th); pc.classList.toggle('shaped',s.ish!=='rect'); pc.appendChild(im);
        /* the clip would cut a border off, so a frame's outline is drawn around the cut picture */
        if(PICP[s.ish]&&s.ibw&&s.ibc){ var oc=colOf(s.ibc,th), ow=s.ibw; pc.style.filter=[[ow,0],[-ow,0],[0,ow],[0,-ow]].map(function(q){ return 'drop-shadow('+q[0]+'px '+q[1]+'px 0 '+oc+')'; }).join(' '); }
        if(edit){ var rm=document.createElement('button'); rm.className='rm'; rm.dataset.rm='1'; rm.textContent='×'; rm.title=T('그림 빼기'); pc.appendChild(rm); } }
      el.appendChild(pc); return; }
    if(b.view==='live'){ el.appendChild(liveView(s,b,th,edit,opt)).dataset.bk='live'; return; }
    if(b.view){ var dv=el.appendChild(dataView(s,b,th)); dv.dataset.bk='data'; if(edit&&s.link) dv.appendChild(linkBadge(s)); return; }
    if(b.cls==='ans'&&opt.hideAns) return;
    var box=document.createElement('div'); box.className='fld k-'+b.k+(b.cls==='ans'?' ans':''); box.dataset.f=b.f; box.dataset.bk=b.f;
    box.style.cssText='left:'+b.x+'px;top:'+b.y+'px;width:'+b.w+'px;height:'+b.h+'px;justify-content:'+(b.va||'flex-start')+';text-align:'+(b.al||'left')+';';
    var inn=document.createElement(b.list?'ul':'div'); inn.className='in'+(b.list&&b.cls?' '+b.cls:'');
    if(b.list) fillList(inn,s[b.f]); else { inn.textContent=(opt.over&&opt.over[b.f]!=null?opt.over[b.f]:s[b.f])||''; if(em) inn.classList.add('ph'); }
    if(edit){ inn.contentEditable=b.list?'true':CE; inn.spellcheck=false; inn.setAttribute('data-ph',T(ph(b.f,s.layout))); inn.setAttribute('autocapitalize','sentences'); }
    if(s.tf[b.f]) inn.style.cssText+=tfCss(s.tf[b.f],th);
    box.appendChild(inn); el.appendChild(box);
  });
  shp(false);
  /* builds: in the editor a small number shows the order; when presenting (opt.step) the ones not reached yet are hidden */
  var nb=0, bauto=s.bld===1||(s.bld!==-1&&deck.auto&&deck.auto.bld), bset=function(e,bd,j){ e.dataset.ba=bd.a; e.dataset.bdr=bd.d||fxOf(bd.a)[4]; e.dataset.bt=bd.t||0; e.dataset.bw=bd.w||0; e.dataset.bm=bauto?'a':j?(bd.m?'a':'c'):(bd.m||'c'); };
  s.build.forEach(function(bd){ var e=el.querySelector('[data-bk="'+bd.k+'"]'); if(!e) return;
    /* a list built line by line: every line is its own step, the box itself stays */
    var lis=bd.l&&LISTS.indexOf(bd.k)>=0&&!empty(s,bd.k)?e.querySelectorAll('li'):[];
    if(lis.length){ [].forEach.call(lis,function(li,j){ li.dataset.bi=nb+j; bset(li,bd,j); if(!edit&&opt.step!=null&&nb+j>=opt.step) li.classList.add('bh'); });
      if(edit){ var n2=document.createElement('span'); n2.className='bn'; n2.textContent=(nb+1)+(lis.length>1?'–'+(nb+lis.length):''); n2.title=T('줄마다 한 번씩 눌러서 나타나요'); e.appendChild(n2); }
      nb+=lis.length; return; }
    e.dataset.bi=nb; bset(e,bd,0);
    if(edit){ var n=document.createElement('span'); n.className='bn'; n.textContent=nb+1; n.title=T(fxOf(bd.a)[1]); e.appendChild(n); }
    else if(opt.step!=null&&nb>=opt.step) e.classList.add('bh');
    nb++; }); el.dataset.nb=nb;
  if(opt.hint&&s.layout==='live'&&liveCfg(s)){ var hn=document.createElement('div'); hn.className='liveHint'; hn.innerHTML='<span class="h1"></span><span class="h2"></span>'; hn.firstChild.textContent='👆 '+T('iframe 안에서 누르기 / Esc'); hn.lastChild.textContent=T('Esc: 슬라이드 넘기기로 돌아가기'); el.appendChild(hn); }
  footOf(s,th).forEach(function(f){ var e=document.createElement(f.logo?'img':'div'); e.className='ft'+(f.logo?' logo':''); if(f.logo){ e.src=f.logo; e.alt=''; e.draggable=false; } else e.textContent=f.t;
    e.style.cssText='left:'+f.x+'px;top:'+f.y+'px;width:'+f.w+'px;height:'+f.h+'px;'+(f.logo?'':'font-size:'+f.fs+'px;color:'+f.c+';text-align:'+f.al+';'); el.appendChild(e); });
  return el;
}
/* photo frames: shapes drawn in a 1 x 1 box (SVG path text), used as a CSS clip-path (<clipPath id="ffslp-..."> kept in the page) and as the canvas clip for the .pptx */
function starUnit(){ var o=[]; for(var i=0;i<10;i++){ var a=(-90+36*i)*Math.PI/180, r=i%2?.382:1; o.push((.5+Math.cos(a)*r/1.902).toFixed(3)+' '+((1+Math.sin(a)*r)/1.809).toFixed(3)); } return 'M'+o.join('L')+'Z'; }
var PICP={heart:'M.5 .95C.12 .66 0 .46 0 .29C0 .13 .12 .03 .27 .03C.38 .03 .46 .09 .5 .18C.54 .09 .62 .03 .73 .03C.88 .03 1 .13 1 .29C1 .46 .88 .66 .5 .95Z', star:starUnit(), diamond:'M.5 0L1 .5L.5 1L0 .5Z', hex:'M.25 .03L.75 .03L1 .5L.75 .97L.25 .97L0 .5Z', tri:'M.5 0L1 1L0 1Z', arch:'M0 1V.5A.5 .5 0 0 1 1 .5V1Z'};
var PICN=[['rect','네모 (그대로)'],['round','둥근 네모'],['ell','원'],['heart','하트'],['star','별'],['diamond','마름모'],['hex','육각형'],['tri','세모'],['arch','아치']];
(function(){ var d=document.createElement('div'); d.style.cssText='position:absolute;width:0;height:0;overflow:hidden'; d.setAttribute('aria-hidden','true'); d.setAttribute('data-notr','');
  d.innerHTML='<svg width="0" height="0"><defs>'+Object.keys(PICP).map(function(k){ return '<clipPath id="ffslp-'+k+'" clipPathUnits="objectBoundingBox"><path d="'+PICP[k]+'"/></clipPath>'; }).join('')+'</defs></svg>'; document.body.appendChild(d); })();
/* a picture can be cropped into a shape (round | ell | a frame from PICP: fills the box, the rest is cut off) and have a border */
function picRadius(s,b){ return s.ish==='ell'?'50%':s.ish==='round'?Math.round(Math.min(b.w,b.h)*.16667)+'px':'8px'; }
function picStyle(im,s,b,th){ var st='border-radius:'+(PICP[s.ish]?'0':picRadius(s,b))+';'; if(s.ish!=='rect') st+='width:100%;height:100%;max-width:none;max-height:none;object-fit:cover;'; if(PICP[s.ish]) st+='clip-path:url(#ffslp-'+s.ish+');'; else if(s.ibw&&s.ibc) st+='box-sizing:border-box;border:'+s.ibw+'px solid '+colOf(s.ibc,th)+';'; im.style.cssText=st; }
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
/* live screen: a mini app in a sandboxed iframe (Fry Blocks snapshot or pasted HTML: srcdoc, allow-scripts only; Fry Lab: same-origin page).
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
var SHAPES=[['rect','네모'],['round','둥근 네모'],['ell','동그라미'],['tri','세모'],['star','별'],['dia','마름모'],['hex','육각형'],['pent','오각형'],['para','평행사변형'],['chev','갈매기'],['plus','더하기'],['heart','하트'],['call','말풍선'],['ring','도넛'],['text','글상자'],['line','선'],['arrow','화살표']], SH_FS=34;
function colOf(v,th){ return v==='ac'?th.ac:v==='fg'?th.fg:v||''; }
function shTextCol(e,th){ var f=colOf(e.fill,th); if(f&&e.gr) f=mix(f,colOf(e.gr,th),.5); return f?(lum(f)>.4?'#111111':'#ffffff'):th.fg; }
/* the new shapes are one SVG path each (the same path is used on screen, on the canvas for gradients, and named after PowerPoint's shape in the .pptx) */
var SHP={dia:'diamond',hex:'hexagon',pent:'pentagon',para:'parallelogram',chev:'chevron',plus:'mathPlus',heart:'heart',call:'wedgeRoundRectCallout',ring:'donut'};
function shapePath(k,w,h,s2,iw,ih){ var x0=s2, y0=s2, x1=s2+iw, y1=s2+ih, cx=x0+iw/2, cy=y0+ih/2, f=function(a){ return a.map(function(q){ return (q[0]===0&&q[1]===0?'':'')+q[0].toFixed(1)+' '+q[1].toFixed(1); }).join('L')+'Z'; }, X=function(r){ return x0+iw*r; }, Y=function(r){ return y0+ih*r; };
  if(k==='dia') return 'M'+f([[cx,y0],[x1,cy],[cx,y1],[x0,cy]]);
  if(k==='hex') return 'M'+f([[X(.25),y0],[X(.75),y0],[x1,cy],[X(.75),y1],[X(.25),y1],[x0,cy]]);
  if(k==='pent') return 'M'+f([[cx,y0],[x1,Y(.38)],[X(.81),y1],[X(.19),y1],[x0,Y(.38)]]);
  if(k==='para') return 'M'+f([[X(.22),y0],[x1,y0],[X(.78),y1],[x0,y1]]);
  if(k==='chev') return 'M'+f([[x0,y0],[X(.7),y0],[x1,cy],[X(.7),y1],[x0,y1],[X(.3),cy]]);
  if(k==='plus'){ var a=.33; return 'M'+f([[X(a),y0],[X(1-a),y0],[X(1-a),Y(a)],[x1,Y(a)],[x1,Y(1-a)],[X(1-a),Y(1-a)],[X(1-a),y1],[X(a),y1],[X(a),Y(1-a)],[x0,Y(1-a)],[x0,Y(a)],[X(a),Y(a)]]); }
  if(k==='heart') return 'M'+cx+' '+Y(.28)+'C'+cx+' '+y0+' '+x0+' '+y0+' '+x0+' '+Y(.32)+'C'+x0+' '+Y(.62)+' '+cx+' '+Y(.8)+' '+cx+' '+y1+'C'+cx+' '+Y(.8)+' '+x1+' '+Y(.62)+' '+x1+' '+Y(.32)+'C'+x1+' '+y0+' '+cx+' '+y0+' '+cx+' '+Y(.28)+'Z';
  if(k==='call'){ var by=Y(.78), r=Math.min(iw,ih)*.12; return 'M'+(x0+r)+' '+y0+'H'+(x1-r)+'Q'+x1+' '+y0+' '+x1+' '+(y0+r)+'V'+(by-r)+'Q'+x1+' '+by+' '+(x1-r)+' '+by+'H'+X(.4)+'L'+X(.2)+' '+y1+'L'+X(.25)+' '+by+'H'+(x0+r)+'Q'+x0+' '+by+' '+x0+' '+(by-r)+'V'+(y0+r)+'Q'+x0+' '+y0+' '+(x0+r)+' '+y0+'Z'; }
  if(k==='ring'){ var rx=iw/2, ry=ih/2, ix=rx*.5, iy=ry*.5; return 'M'+x0+' '+cy+'A'+rx+' '+ry+' 0 1 0 '+x1+' '+cy+'A'+rx+' '+ry+' 0 1 0 '+x0+' '+cy+'ZM'+(cx-ix)+' '+cy+'A'+ix+' '+iy+' 0 1 1 '+(cx+ix)+' '+cy+'A'+ix+' '+iy+' 0 1 1 '+(cx-ix)+' '+cy+'Z'; }
  return ''; }
/* a five-point star filling the box like PowerPoint's star5 */
function starPts(x0,y0,w,h){ var o=[], rx=w/1.902, ry=h/1.809, cx=x0+w/2, cy=y0+ry; for(var i=0;i<10;i++){ var a=(-90+36*i)*Math.PI/180, r=i%2?.382:1; o.push((cx+rx*r*Math.cos(a)).toFixed(1)+','+(cy+ry*r*Math.sin(a)).toFixed(1)); } return o.join(' '); }
function shTextBox(e){ var w=e.w, h=e.h; if(e.k==='dia'||e.k==='ring') return {x:w*.25,y:h*.25,w:w*.5,h:h*.5}; if(e.k==='heart') return {x:w*.2,y:h*.2,w:w*.6,h:h*.5}; if(e.k==='call') return {x:14,y:10,w:Math.max(10,w-28),h:Math.max(10,h*.78-20)}; if(SHP[e.k]) return {x:w*.14,y:h*.12,w:w*.72,h:h*.76}; return e.k==='ell'?{x:w*.15,y:h*.15,w:w*.7,h:h*.7}:e.k==='tri'?{x:w*.22,y:h*.42,w:w*.56,h:h*.52}:e.k==='star'?{x:w*.3,y:h*.36,w:w*.4,h:h*.38}:{x:14,y:10,w:Math.max(10,w-28),h:Math.max(10,h-20)}; }
/* a free picture: a shape of kind 'pic' (src = the shrunk picture). The box crops it (it fills the box, px / py say which part stays), ish cuts it into a frame, line / sw is the border;
   br / ct: brightness and contrast in %, gs: 0 as it is, 1 grey, 2 sepia */
/* glow and shadow of a shape or picture as one CSS filter (f: filters that come first) */
function fxFilter(e,th,f){ f=f||[]; if(e.sd) f.push('drop-shadow(0 '+(e.sd>1?8:4)+'px '+(e.sd>1?12:6)+'px rgba(0,0,0,'+(e.sd>1?.5:.35)+'))');
  if(e.gl){ var c=colOf(e.fill,th)||colOf(e.line,th)||th.ac, r=e.gl>1?22:11; f.push('drop-shadow(0 0 '+r+'px '+c+')','drop-shadow(0 0 '+Math.round(r/3)+'px '+c+')'); } return f.length?'filter:'+f.join(' ')+';':''; }
function dashAttr(e,sw){ return e.ds===1?' stroke-dasharray="'+sw*3+' '+sw*2+'"':e.ds===2?' stroke-dasharray="0 '+sw*2+'" stroke-linecap="round"':''; }
function picFilter(e){ var f=[]; if(e.br!==100) f.push('brightness('+e.br/100+')'); if(e.ct!==100) f.push('contrast('+e.ct/100+')'); if(e.gs===1) f.push('grayscale(1)'); else if(e.gs===2) f.push('sepia(1)'); return f.join(' '); }
function picEl(e,th,edit){
  var d=document.createElement('div'), im=new Image(), fr=PICP[e.ish], oc=colOf(e.line,th), ow=e.sw, f=[]; d.className='shp pel'; d.dataset.bk='e:'+e.id; d.dataset.e=e.id;
  im.src=e.src; im.draggable=false; im.alt=e.alt||''; im.style.cssText='width:100%;height:100%;display:block;object-fit:cover;object-position:'+e.px+'% '+e.py+'%;'+(fr?'clip-path:url(#ffslp-'+e.ish+');':'border-radius:'+(e.ish==='ell'?'50%':e.ish==='round'?Math.round(Math.min(e.w,e.h)*.16667)+'px':'0')+';')
    +(!fr&&ow&&oc?'box-sizing:border-box;border:'+ow+'px solid '+oc+';':'')+(picFilter(e)?'filter:'+picFilter(e)+';':'')+(e.fl?'transform:scale('+(e.fl&1?-1:1)+','+(e.fl&2?-1:1)+');':'');
  /* a clip would cut a border off, so a frame's outline is drawn around the cut picture */
  if(fr&&ow&&oc) f=[[ow,0],[-ow,0],[0,ow],[0,-ow]].map(function(q){ return 'drop-shadow('+q[0]+'px '+q[1]+'px 0 '+oc+')'; });
  d.style.cssText='left:'+e.x+'px;top:'+e.y+'px;width:'+e.w+'px;height:'+e.h+'px;'+(e.rot?'transform:rotate('+e.rot+'deg);':'')+fxFilter(e,th,f)+(e.op<100?'opacity:'+e.op/100+';':'');
  if(e.url&&!edit){ d.dataset.url=e.url; d.style.cursor='pointer'; } d.appendChild(im); return d; }
function shapeEl(e,th,edit,opt){
  if(e.k==='media') return mediaEl(e,th,edit,opt);
  if(e.k==='pic') return picEl(e,th,edit);
  var d=document.createElement('div'), sw=e.sw, st=colOf(e.line,th), g='', bw, bh; d.className='shp'+(isLine(e)?' ln':''); d.dataset.bk='e:'+e.id; d.dataset.e=e.id;
  if(isLine(e)){ var ah=e.k==='arrow'?Math.max(22,sw*3.2):0, P=Math.max(24,sw+ah), l=Math.min(e.x,e.x+e.w)-P, t=Math.min(e.y,e.y+e.h)-P;
    bw=Math.abs(e.w)+2*P; bh=Math.abs(e.h)+2*P;
    var x1=e.x-l, y1=e.y-t, x2=x1+e.w, y2=y1+e.h, len=Math.hypot(e.w,e.h)||1, ux=e.w/len, uy=e.h/len, ex=ah?x2-ux*ah*.8:x2, ey=ah?y2-uy*ah*.8:y2;
    g='<line x1="'+x1+'" y1="'+y1+'" x2="'+ex+'" y2="'+ey+'" stroke="'+st+'" stroke-width="'+sw+'" stroke-linecap="'+(ah?'butt':'round')+'"'+dashAttr(e,sw)+'/>';
    if(ah){ var bx=x2-ux*ah, by=y2-uy*ah, q=ah*.6; g+='<polygon points="'+x2+','+y2+' '+(bx-uy*q)+','+(by+ux*q)+' '+(bx+uy*q)+','+(by-ux*q)+'" fill="'+st+'"/>'; }
    if(edit) g+='<line class="hit" x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="transparent" stroke-width="'+Math.max(34,sw+24)+'" stroke-linecap="round"/>';
    d.style.cssText='left:'+l+'px;top:'+t+'px;width:'+bw+'px;height:'+bh+'px;'; }
  else { var w=e.w, h=e.h, f=colOf(e.fill,th)||'none', ln=sw&&st, s2=ln?sw/2:0, iw=Math.max(1,w-2*s2), ih=Math.max(1,h-2*s2), a=' fill="'+f+'"'+(ln?' stroke="'+st+'" stroke-width="'+sw+'" stroke-linejoin="round"'+dashAttr(e,sw):'')+(e.op<100&&f!=='none'?' fill-opacity="'+e.op/100+'"':'');
    bw=w; bh=h; if(e.gr&&f!=='none'){ var gid='fsg'+(++gradN), gv=gradVec(e.ga); g='<defs><linearGradient id="'+gid+'" x1="'+gv[0]+'" y1="'+gv[1]+'" x2="'+gv[2]+'" y2="'+gv[3]+'"><stop offset="0" stop-color="'+f+'"/><stop offset="1" stop-color="'+colOf(e.gr,th)+'"/></linearGradient></defs>'; a=a.replace(' fill="'+f+'"',' fill="url(#'+gid+')"'); }
    g+=SHP[e.k]?'<path d="'+shapePath(e.k,w,h,s2,iw,ih)+'" fill-rule="evenodd"'+a+'/>':e.k==='ell'?'<ellipse cx="'+w/2+'" cy="'+h/2+'" rx="'+iw/2+'" ry="'+ih/2+'"'+a+'/>':e.k==='tri'?'<polygon points="'+w/2+','+s2+' '+(w-s2)+','+(h-s2)+' '+s2+','+(h-s2)+'"'+a+'/>':
      e.k==='star'?'<polygon points="'+starPts(s2,s2,iw,ih)+'"'+a+'/>':'<rect x="'+s2+'" y="'+s2+'" width="'+iw+'" height="'+ih+'" rx="'+(e.k==='round'?Math.min(w,h)*.16667:0)+'"'+a+'/>';
    d.style.cssText='left:'+e.x+'px;top:'+e.y+'px;width:'+w+'px;height:'+h+'px;'+(e.rot?'transform:rotate('+e.rot+'deg);':'')+fxFilter(e,th); if(e.url&&!edit){ d.dataset.url=e.url; d.style.cursor='pointer'; } }
  d.innerHTML='<svg width="'+bw+'" height="'+bh+'" viewBox="0 0 '+bw+' '+bh+'" xmlns="http://www.w3.org/2000/svg">'+g+'</svg>';
  if(e.fl) d.firstChild.style.transform='scale('+(e.fl&1?-1:1)+','+(e.fl&2?-1:1)+')';
  if(!isLine(e)&&(e.text||edit)){ var tb=shTextBox(e), x=document.createElement('div'), inn=document.createElement('div'); x.className='stx';
    x.style.cssText='left:'+tb.x+'px;top:'+tb.y+'px;width:'+tb.w+'px;height:'+tb.h+'px;color:'+shTextCol(e,th)+';text-align:'+({l:'left',c:'center',r:'right'}[e.al]||'center')+';'; if(e.fs) x.dataset.fm=e.fs; if(e.tf) x.style.cssText+=tfCss(e.tf,th);
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
  var inn=box.firstChild, txt=inn.classList.contains('ph')?'\u0000'+inn.getAttribute('data-ph'):inn.innerText+'\u0001'+inn.textContent.length, key=th.id+(th.f||'')+'|'+lay+'|'+b.f+'|'+b.w+'x'+b.h+'|'+txt;
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
function th(){ askFonts(deck.font); return withFont(themeOf(deck.theme),deck.font); }
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
  ['dupBtn','delBtn','laySel','addBtn','themeBtn','notes','picBtn','shapeBtn','optBtn','sortBtn'].forEach(function(id){ $(id).disabled=!s||gen||busyOn; });
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
function select(i,keepFocus){ blurEdit(); cnOff(); if(!deck.slides.length) return; if(i!==cur) selK=null; cur=Math.max(0,Math.min(i,deck.slides.length-1)); drawList(); drawMain();
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
/* connectors: a line or an arrow joining two boxes (picture, text box or shape) of one slide. Both ends sit on the middle of a side, the closest pair of sides. They are worked out again
   whenever the slide is drawn (connSync), live while a box is dragged (liveConns), and before saving or exporting; deleting a box takes its connectors with it. */
var cn=null;
function connOk(s,k){ if(k.slice(0,2)==='e:'){ var x=shapeOf(s,k.slice(2)); return !!x&&!isLine(x); } return (LAY[s.layout]||[]).some(function(b){ return b.f===k; }); }
function connPick(s,k){ return !isMany(k)&&connOk(s,k)&&(k!=='img'||!!s.img); }
function connGeom(s,e,ov){ var A=(ov&&ov[e.c[0]])||keyBox(s,e.c[0]), B=(ov&&ov[e.c[1]])||keyBox(s,e.c[1]); if(!A||!B) return null; var best=null;
  var sides=function(b){ return [[b.x+b.w/2,b.y],[b.x+b.w,b.y+b.h/2],[b.x+b.w/2,b.y+b.h],[b.x,b.y+b.h/2]].map(function(q){ return [Math.round(q[0]),Math.round(q[1])]; }); };
  sides(A).forEach(function(p){ sides(B).forEach(function(q){ var d=Math.hypot(p[0]-q[0],p[1]-q[1]); if(!best||d<best.d-.01) best={d:d,p:p,q:q}; }); });
  return {x:best.p[0], y:best.p[1], w:best.q[0]-best.p[0], h:best.q[1]-best.p[1]}; }
function connSync(s){ s.els.forEach(function(e){ if(!e.c) return; var g=connGeom(s,e); if(g) Object.assign(e,g); }); }
/* while dragging: ov = the new boxes by key; the connector nodes are drawn again */
function liveConns(s,el,ov){ s.els.forEach(function(e){ if(!e.c) return; var g=connGeom(s,e,ov), n0=g&&el.querySelector('[data-bk="e:'+e.id+'"]'); if(!n0) return;
  var n2=shapeEl(Object.assign({},e,g),th(),true); if(n0.classList.contains('isSel')) n2.classList.add('isSel'); n0.parentNode.replaceChild(n2,n0); }); }
function dropConns(s){ var gone=s.els.filter(function(e){ return e.c&&!e.c.every(function(k){ return connOk(s,k); }); }); if(!gone.length) return;
  var ks=gone.map(function(e){ return 'e:'+e.id; }); s.els=s.els.filter(function(e){ return gone.indexOf(e)<0; }); s.build=s.build.filter(function(b){ return ks.indexOf(b.k)<0; }); }
function connStart(){ var s=deck.slides[cur]; if(!s||gen||busyOn) return; if(!selK||!connPick(s,selK)) return toast(T('이어 줄 도형·그림·글상자를 먼저 하나 골라 주세요'));
  blurEdit(); closeMenus(); cn={k:selK, sid:s.id}; host.classList.add('cnOn'); toast(T('이어 줄 다른 도형을 눌러요. 그만두려면 Esc를 눌러요')); }
function cnOff(){ if(!cn) return; cn=null; host.classList.remove('cnOn'); }
function makeConn(s,a,b){ if(s.els.length>=80) return toast(T('도형이 너무 많아요'));
  if(s.els.some(function(e){ return e.c&&e.c.indexOf(a)>=0&&e.c.indexOf(b)>=0; })) return toast(T('이미 이어져 있어요'));
  pushUndo(); nudgeT=0; var e=fixEl({id:uid(), k:'arrow', x:0, y:0, w:0, h:0, line:'fg', sw:4, c:[a,b]}); Object.assign(e,connGeom(s,e)); s.els.push(e); selK='e:'+e.id; changed(); toast(T('연결선을 만들었어요. 도형을 옮기면 따라 움직여요')); }
function selShape(){ var s=deck&&deck.slides[cur]; return s&&selK&&selK.slice(0,2)==='e:'?shapeOf(s,selK.slice(2)):null; }
/* text style (bold, italic, underline, strikethrough, colour) of the picked text boxes and shapes */
function tfTxt(e){ return e&&!isLine(e)&&e.k!=='media'&&e.k!=='pic'; }
function tfList(s){ if(!s||!selK) return []; if(TFK.indexOf(selK)>=0) return [{s:s,k:selK}]; return selEls(s).filter(tfTxt).map(function(e){ return {e:e}; }); }
function tfGet(t,mk){ var o=t.e?t.e.tf:t.s.tf[t.k]; if(!o&&mk){ o={b:0,i:0,u:0,s:0,c:''}; if(t.e) t.e.tf=o; else t.s.tf[t.k]=o; } return o; }
function tfClean(t){ var o=tfGet(t); if(o&&!o.b&&!o.i&&!o.u&&!o.s&&!o.c){ if(t.e) delete t.e.tf; else delete t.s.tf[t.k]; } }
function tfSet(fn){ var s=deck.slides[cur], a=tfList(s); if(!a.length||gen||busyOn) return; blurEdit(); pushUndo(); a.forEach(function(t){ var o=tfGet(t,1); fn(o,t); tfClean(t); }); fitCache.clear(); changed(true); }
function tfNode(t){ return host.querySelector('[data-bk="'+(t.e?'e:'+t.e.id:t.k)+'"] .in'); }
function tfToggle(k){ tfSet(function(o,t){ if(k==='b'){ var n=tfNode(t), bold=n?+getComputedStyle(n).fontWeight>=600:false; o.b=bold?-1:1; } else o[k]=o[k]?0:1; }); }
function tfState(){ var s=deck&&deck.slides[cur], a=tfList(s), o=a.length&&tfGet(a[0]), n=a.length&&tfNode(a[0]); return a.length?{b:n?+getComputedStyle(n).fontWeight>=600:false, i:!!(o&&o.i), u:!!(o&&o.u), s:!!(o&&o.s), c:o?o.c:''}:null; }
/* what is picked: 'e:id' one shape, 'g:gid' a whole group, 'm' several shapes picked together (selM = their ids), or a layout box / 'img' */
var selM=[], multiOn=false;
function selEls(s,k){ k=k||selK; if(!s||!k) return []; if(k==='m') return s.els.filter(function(e){ return selM.indexOf(e.id)>=0; }); if(k.slice(0,2)==='g:') return s.els.filter(function(e){ return e.g===k.slice(2); }); var e=k.slice(0,2)==='e:'&&shapeOf(s,k.slice(2)); return e?[e]:[]; }
function isMany(k){ return k==='m'||(k||'').slice(0,2)==='g:'; }
function unionBox(a){ var x0=1e9,y0=1e9,x1=-1e9,y1=-1e9; a.forEach(function(e){ x0=Math.min(x0,e.x,e.x+e.w); y0=Math.min(y0,e.y,e.y+e.h); x1=Math.max(x1,e.x,e.x+e.w); y1=Math.max(y1,e.y,e.y+e.h); }); return a.length?{x:x0,y:y0,w:x1-x0,h:y1-y0,ln:false}:null; }
function keyBox(s,k){ if(isMany(k)) return unionBox(selEls(s,k)); if(k.slice(0,2)==='e:'){ var e=shapeOf(s,k.slice(2)); return e?{x:e.x,y:e.y,w:e.w,h:e.h,ln:isLine(e),cn:!!e.c}:null; } var b=boxDef(s,k); return b?{x:b.x,y:b.y,w:b.w,h:b.h}:null; }
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
  if(r.cn){ f.style.cssText='left:0;top:0;width:0;height:0;'; return f; } // a connector has no handles: it follows its two ends
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
/* smart guides while moving: the box snaps (within 8 px) to the slide's centre lines and margins, to the edges and centres of the other boxes and shapes
   (a pink line), and to equal gaps between neighbours (pink bars between them). k = what is dragged; it and the members of its group are left out. */
function snapOthers(s,k){ var o=[], skip={}; selEls(s,k).forEach(function(e){ skip[e.id]=1; });
  (LAY[s.layout]||[]).forEach(function(b0){ if(b0.f===k) return; var b=boxOf(s,b0); if(b.w>0&&b.h>0) o.push({x:b.x,y:b.y,w:b.w,h:b.h}); });
  s.els.forEach(function(e){ if(!skip[e.id]) o.push(unionBox([e])); }); return o; }
/* line up edges / centres: the pairs (mine, theirs) closer than d give the move; every line that ends up on the same place is shown */
function alignAxis(p,sz,T0,d){ var mine=[p,p+sz/2,p+sz], best=null, G=[];
  mine.forEach(function(m){ T0.forEach(function(t){ var dl=t-m; if(Math.abs(dl)<d&&(!best||Math.abs(dl)<Math.abs(best.dl))) best={dl:dl}; }); });
  if(!best) return null; mine.forEach(function(m){ T0.forEach(function(t){ if(Math.abs(t-(m+best.dl))<.5&&G.indexOf(t)<0) G.push(t); }); }); best.g=G; return best; }
/* equal gaps along one axis (a = 'x' or 'y'): the same gap as between two neighbours, or the middle between two of them. Only boxes sharing the other axis are neighbours. */
function spaceAxis(r,O,a,d){ var b=a==='x'?'y':'x', sa=a==='x'?'w':'h', sb=b==='x'?'w':'h', best=null;
  var P=O.filter(function(o){ return o[b]<r[b]+r[sb]&&o[b]+o[sb]>r[b]; }).sort(function(u,v){ return u[a]-v[a]; });
  var cross=function(){ var lo=r[b], hi=r[b]+r[sb]; P.forEach(function(o){ lo=Math.max(lo,o[b]); hi=Math.min(hi,o[b]+o[sb]); }); return (lo+hi)/2; };
  var cand=function(pos,segs){ var dl=pos-r[a]; if(Math.abs(dl)<d&&(!best||Math.abs(dl)<Math.abs(best.dl))) best={dl:dl, segs:segs}; };
  for(var i=0;i<P.length;i++) for(var j=i+1;j<P.length;j++){ var A=P[i], B=P[j], ae=A[a]+A[sa], g=B[a]-ae; if(g<6) continue;
    cand(B[a]+B[sa]+g,[[ae,B[a]],[B[a]+B[sa],B[a]+B[sa]+g]]); cand(A[a]-g-r[sa],[[A[a]-g,A[a]],[ae,B[a]]]);
    var g2=(g-r[sa])/2; if(g2>=6) cand(ae+g2,[[ae,ae+g2],[ae+g2+r[sa],B[a]]]); }
  if(!best) return null; best.cross=cross(); best.a=a; return best; }
function snapMove(r,el,k){ var s=deck.slides[cur], O=s?snapOthers(s,k):[], d=8, G=[], S=[], c, ay, ax, sy, sx;
  var TX=[90,W/2,W-90], TY=[H/2]; O.forEach(function(o){ TX.push(o.x,o.x+o.w/2,o.x+o.w); TY.push(o.y,o.y+o.h/2,o.y+o.h); });
  ay=alignAxis(r.y,r.h,TY,d); sy=spaceAxis(r,O,'y',d); if(sy&&(!ay||Math.abs(sy.dl)<Math.abs(ay.dl)-.5)){ ay=null; } else sy=null;
  if(ay){ r.y+=ay.dl; ay.g.forEach(function(v){ G.push(['h',v]); }); } else if(sy){ r.y+=sy.dl; S.push(sy); }
  ax=alignAxis(r.x,r.w,TX,d); sx=spaceAxis(r,O,'x',d); if(sx&&(!ax||Math.abs(sx.dl)<Math.abs(ax.dl)-.5)){ ax=null; } else sx=null;
  if(ax){ r.x+=ax.dl; ax.g.forEach(function(v){ G.push(['v',v]); }); } else if(sx){ r.x+=sx.dl; S.push(sx); }
  [].forEach.call(el.querySelectorAll('.guide,.gsp'),function(x){ x.remove(); });
  G.forEach(function(g){ c=document.createElement('div'); c.className='guide '+g[0]; if(g[0]==='v') c.style.left=g[1]+'px'; else c.style.top=g[1]+'px'; el.appendChild(c); });
  S.forEach(function(q){ q.segs.forEach(function(sg){ c=document.createElement('div'); c.className='gsp '+(q.a==='x'?'x':'y'); c.dataset.gap=Math.round(sg[1]-sg[0]);
    if(q.a==='x'){ c.style.left=sg[0]+'px'; c.style.width=(sg[1]-sg[0])+'px'; c.style.top=q.cross+'px'; } else { c.style.top=sg[0]+'px'; c.style.height=(sg[1]-sg[0])+'px'; c.style.left=q.cross+'px'; } el.appendChild(c); }); }); }
function dragRect(d,dx,dy,shift,el){ var r0=d.r0, r={x:r0.x,y:r0.y,w:r0.w,h:r0.h,ln:r0.ln}, h=d.h, M=24, a, L, q;
  if(h==='mv'){ r.x=r0.x+dx; r.y=r0.y+dy; if(!r.ln) snapMove(r,el,d.k); }
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
  var ov={}; if(isMany(d.k)) mapMembers(selEls(s,d.k),d.r0,r).forEach(function(c){ ov['e:'+c.id]=c; }); else ov[d.k]=r; liveConns(s,el,ov);
  var f=el.querySelector('.selFr'); if(f){ var nf=frameEl(r); if(isMany(d.k)) nf.classList.add('grp'); el.replaceChild(nf,f); } }
host.addEventListener('pointerdown',function(e){
  if(gen||busyOn||(e.pointerType==='mouse'&&e.button)) return; var s=deck.slides[cur], el=host.querySelector('.sl'); if(!s||!el) return;
  if(cn){ e.preventDefault(); var cnode=e.target.closest('[data-bk]'), ck=cnode&&el.contains(cnode)?cnode.dataset.bk:'', from=cn.k, same=cn.sid===s.id; cnOff();
    if(same&&ck&&ck!==from&&connPick(s,ck)) makeConn(s,from,ck); else toast(T('연결선을 그만뒀어요')); return; }
  var hd=e.target.closest('.hd');
  if(hd&&selK){ e.preventDefault(); blurEdit(); drg={k:selK, h:hd.dataset.h, id:e.pointerId, x0:e.clientX, y0:e.clientY, r0:keyBox(s,selK), kk:host.offsetWidth/W, on:true}; try{ host.setPointerCapture(e.pointerId); }catch(err){} host.classList.add('dragging'); return; }
  if(e.target.closest('[data-rm],.lvEdit,iframe')) return;
  var node=e.target.closest('[data-bk]'); if(!node||!el.contains(node)){ var addm=e.shiftKey||e.ctrlKey||e.metaKey||multiOn; if(selK&&!addm){ blurEdit(); setSel(null); }
    if(e.pointerType!=='touch'&&!e.target.closest('.selFr,.ft')){ var rc=el.getBoundingClientRect(), kk=host.offsetWidth/W; mq={id:e.pointerId, x0:(e.clientX-rc.left)/kk, y0:(e.clientY-rc.top)/kk, rc:rc, kk:kk, on:false, add:addm, base:addm?selIdsNow():[]}; }
    return; }
  if(fp.on){ e.preventDefault(); var pk=node.dataset.bk, pe=pk.slice(0,2)==='e:'&&shapeOf(s,pk.slice(2)); if(pe||pk==='img'&&s.img){ blurEdit(); setSel(pk); if(fpPaint(s,[pk])&&!fp.keep) fpOff(); } else toast(T('이 상자에는 서식을 붙일 수 없어요 (글상자·그림·도형에서 쓸 수 있어요)')); return; }
  var k=node.dataset.bk, a=document.activeElement, editing=!!(a&&a.classList&&a.classList.contains('in')&&node.contains(a)), was=selK===k, sub=null;
  /* shapes: Shift / Ctrl (or the add-to-pick button) adds or takes away a shape; a shape in a group picks the whole group; a press on a member of the picked group or set moves them all, a tap on it picks just that shape */
  if(k.slice(0,2)==='e:'){ var se=shapeOf(s,k.slice(2));
    if(se&&(e.shiftKey||e.ctrlKey||e.metaKey||multiOn)){ e.preventDefault(); blurEdit(); toggleSel(s,se); return; }
    if(se&&(selK==='g:'+se.g&&se.g||selK==='m'&&selM.indexOf(se.id)>=0)){ sub=k; k=selK; was=false; }
    else if(se&&se.g) k='g:'+se.g; }
  setSel(k); if(editing) return; // pressing inside text being typed: normal text selection
  if(se&&se.c) return; // a connector is picked, never dragged
  var txt=node.classList.contains('fld')||node.classList.contains('shp');
  if(e.pointerType==='mouse'&&txt){ e.preventDefault(); blurEdit(); }
  drg={k:k, h:'mv', id:e.pointerId, x0:e.clientX, y0:e.clientY, r0:keyBox(s,k), kk:host.offsetWidth/W, on:false, was:was, sub:sub, hold:e.pointerType==='mouse'&&txt};
});
/* picking several shapes: drag a rectangle on an empty place, or Shift / Ctrl + click; the result is one shape, one whole group, or a loose set */
var mq=null;
function selIdsNow(){ return selEls(deck.slides[cur]).map(function(e){ return e.id; }); }
function selectIds(ids,nodraw){ var s=deck.slides[cur]; ids=ids.filter(function(id,i){ return ids.indexOf(id)===i&&shapeOf(s,id)&&!shapeOf(s,id).c; });
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
host.addEventListener('dblclick',function(e){ var n=e.target.closest('.shp'); if(n&&!n.classList.contains('media')&&!n.classList.contains('pel')&&!gen&&!busyOn&&!fp.on) editShapeText(n.dataset.bk); });
function editShapeText(k){ if(selK!==k) setSel(k); var e=selShape(), inn=host.querySelector('[data-bk="'+k+'"] .stx .in'); if(!inn||!e||isLine(e)) return;
  if(document.activeElement===inn) return; inn.contentEditable=CE; inn.focus();
  try{ var r=document.createRange(); r.selectNodeContents(inn); r.collapse(false); var gs=getSelection(); gs.removeAllRanges(); gs.addRange(r); }catch(err){} }
/* arrow keys nudge the picked box (Shift: more); a run of presses is one undo step */
function nudge(dx,dy){ var s=deck.slides[cur], r=s&&selK&&keyBox(s,selK); if(!r||r.cn) return; if(Date.now()-nudgeT>900) pushUndo(); nudgeT=Date.now(); r.x+=dx; r.y+=dy; putBox(s,selK,r); saveSoon(); thumbSoon(cur); drawMain(); }
function delSel(){ var s=deck.slides[cur], a=selEls(s); if(!s||!selK) return;
  if(a.length){ pushUndo(); var ks=a.map(function(e){ return 'e:'+e.id; }); s.els=s.els.filter(function(e){ return a.indexOf(e)<0; }); s.build=s.build.filter(function(b){ return ks.indexOf(b.k)<0; }); dropConns(s); selK=null; selM=[]; changed(); toast(T('도형을 지웠어요')); }
  else if(selK==='img'&&s.img){ pushUndo(); s.img=''; s.iw=s.ih=0; dropConns(s); changed(true); }
  else if(selK==='live'&&liveCfg(s)){ pushUndo(); s.live=''; selK=null; dropConns(s); changed(true); toast(T('살아있는 화면을 지웠어요')); } }

/* ---------- shapes, builds and the bar of the picked box ---------- */
var SWC=['#ffffff','#111111','#3d7fe0','#ff8a3d','#2fb27a','#e0526b','#8a5ce0','#ffc93c'];
var SHI={rect:'<rect x="3" y="6" width="18" height="12"/>', round:'<rect x="3" y="6" width="18" height="12" rx="4"/>', ell:'<circle cx="12" cy="12" r="8"/>', tri:'<path d="M12 4l9 16H3z"/>',
  star:'<path d="M12 3l2.6 6 6.4.5-4.9 4.2 1.5 6.3L12 16.7 6.4 20l1.5-6.3L3 9.5l6.4-.5z"/>', text:'<path d="M5 6h14M12 6v13M9 19h6"/>', line:'<path d="M4 20L20 4"/>', arrow:'<path d="M4 20L19 5M11 5h8v8"/>',
  dia:'<path d="M12 3l9 9-9 9-9-9z"/>', hex:'<path d="M7 4h10l5 8-5 8H7l-5-8z"/>', pent:'<path d="M12 3l9 7-3.5 10h-11L3 10z"/>', para:'<path d="M7 5h14l-4 14H3z"/>', chev:'<path d="M3 5h12l6 7-6 7H3l6-7z"/>', plus:'<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
  heart:'<path d="M12 20S3 14 3 8.5A4.5 4.5 0 0 1 12 6.5 4.5 4.5 0 0 1 21 8.5C21 14 12 20 12 20z"/>', call:'<path d="M5 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H11l-4 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>', ring:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/>'};
function addShape(k){ var s=deck.slides[cur]; if(!s||gen||busyOn) return; blurEdit(); pushUndo(); if(k==='text'){ var te=fixEl({id:uid(), k:'rect', x:380+s.els.length%6*24, y:300+s.els.length%6*24, w:520, h:140, fill:'', line:'', sw:0, text:'', al:'l'}); s.els.push(te); selK='e:'+te.id; changed(); setTimeout(function(){ editShapeText(selK); },60); return; }
  var n=s.els.length%6*24, L=k==='line'||k==='arrow', sq=k==='ell'||k==='star'||k==='tri'||k==='heart'||k==='ring'||k==='plus'||k==='dia'||k==='pent';
  var e=fixEl({id:uid(), k:k, x:(L?440:sq?520:490)+n, y:(L?360:240)+n, w:L?400:sq?240:300, h:L?0:sq?240:200, fill:'ac', line:'fg', sw:L?6:0}); s.els.push(e); selK='e:'+e.id; changed(); }
/* emoji and icons: a big text-only shape (no fill, no outline), so it moves, resizes, builds and exports like any shape */
var EMOJIS=['⭐','❤️','👍','👏','🎉','✅','❌','❓','❗','💡','🎯','📌','🔥','🚀','🏆','📖','✏️','🔬','🧪','🌍','🌱','☀️','🌙','☁️','⚡','🍎','🎵','😀','😎','🤔','😮','😢','👀','🙌','🧠','⏰','📅','💬','🔔','🏳️','➡️','⬅️','⬆️','⬇️','➕','➖','✖️','➗'];
function addEmoji(ch){ var s=deck.slides[cur]; if(!s||gen||busyOn) return; blurEdit(); pushUndo(); var n=s.els.length%6*24;
  var e=fixEl({id:uid(), k:'rect', x:520+n, y:240+n, w:240, h:240, fill:'', line:'', sw:0, text:ch, fs:200}); s.els.push(e); selK='e:'+e.id; changed(); }
/* crop the picture into a shape; a circle starts as a square in the middle of the picture's box */
function setPicShape(v){ var s=deck.slides[cur], pe=selShape(); if(pe&&pe.k==='pic'){ if(pe.ish===v) return; blurEdit(); pushUndo(); pe.ish=v;
    if(v!=='rect'&&v!=='round'&&Math.abs(pe.w-pe.h)>2){ var q0=Math.min(pe.w,pe.h); pe.x+=Math.round((pe.w-q0)/2); pe.y+=Math.round((pe.h-q0)/2); pe.w=pe.h=q0; } changed(); return; }
  if(!s||!s.img||s.ish===v) return; blurEdit(); pushUndo(); s.ish=v; var b=boxDef(s,'img');
  if(v!=='rect'&&v!=='round'&&b&&Math.abs(b.w-b.h)>2){ var q=Math.min(b.w,b.h); s.pos.img={x:Math.round(b.x+(b.w-q)/2), y:Math.round(b.y+(b.h-q)/2), w:q, h:q}; } changed(); }
/* alt text: what a screen reader says about a shape, picture or video (kept in the .pptx for pictures) */
function openAlt(){ var s=deck.slides[cur], e=selShape(); if(!s||!selK||(!e&&!(selK==='img'&&s.img))) return; blurEdit();
  ask(T('대체 텍스트'),T('화면을 읽어 주는 프로그램이 이 그림이나 도형을 설명할 때 읽는 글이에요. 비워 두면 없애요.'),T('예: 학생들이 실험하는 모습'),T('확인'),e?e.alt||'':s.ialt||'',true).then(function(v){
    if(v==null) return; v=v.replace(/\s+/g,' ').trim().slice(0,300); var t=selShape(), x=deck.slides[cur]; if(!x) return; pushUndo(); if(t) { if(v) t.alt=v; else delete t.alt; } else x.ialt=v; changed(); toast(T(v?'대체 텍스트를 넣었어요':'대체 텍스트를 없앴어요')); }); }
/* line things up on the slide (picked box, picture or shape) */
function alignSel(m){ var s=deck.slides[cur], r=s&&selK&&keyBox(s,selK); if(!r||r.cn) return; var M=48, bx=r.ln?Math.min(r.x,r.x+r.w):r.x, by=r.ln?Math.min(r.y,r.y+r.h):r.y, bw=Math.abs(r.w), bh=Math.abs(r.h), dx=0, dy=0;
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
  src.forEach(function(o){ var c=fixEl(JSON.parse(JSON.stringify(o))); if(!c) return; c.id=uid(); delete c.c; // a copy of a connector is a plain line
     if(c.g){ gm[c.g]=gm[c.g]||uid(); c.g=gm[c.g]; }
    c.x=c.x+dx; c.y=c.y+dy; if(clamp){ c.x=Math.max(-100,Math.min(1200,c.x)); c.y=Math.max(-100,Math.min(640,c.y)); } out.push(c); });
  var gc={}; out.forEach(function(c){ if(c.g) gc[c.g]=(gc[c.g]||0)+1; }); out.forEach(function(c){ if(c.g&&gc[c.g]<2) c.g=''; });
  out.forEach(function(c){ s.els.push(c); }); selectIds(out.map(function(c){ return c.id; }),true); return out; }
function pasteEl(src){ var s=deck&&deck.slides[cur]; src=src||readClip(); if(!s||!src||gen||busyOn) return; src=Array.isArray(src)?src:[src]; if(s.els.length+src.length>80) return toast(T('도형이 너무 많아요'));
  blurEdit(); pushUndo(); var n=s.els.length%6*24||20; addCopies(s,src,n,n,src.length===1); changed(); }
function dupSel(){ var s=deck.slides[cur], a=selEls(s); if(!s||!a.length) return; if(s.els.length+a.length>80) return toast(T('도형이 너무 많아요')); pushUndo(); addCopies(s,a,30,30,false); changed(); }
/* format painter: take the look of a shape, line or picture (fp.f) and put it on others. A shape has fill, op (see-through), line, sw (line width), al, fs (text size) and a rect <-> round corner; a picture has ish, ibc, ibw.
   What does not exist in the model is not copied: font, weight and text colour belong to the whole deck, and the layout boxes (title, bullets ...) only have a place, so they can be neither source nor target.
   fp.on: waiting for a click on the target, fp.keep: stays on until Esc (double press), fp.t: when it was pressed (the 2nd click of a double click must not cancel) */
var fp={on:false, keep:false, f:null, t:0};
function fpGrab(s){ var a=selEls(s), e=a[0];
  if(e) return {src:'el', k:e.k, line:isLine(e), fill:e.fill, gr:e.gr||'', ga:e.ga, op:e.op, ln:e.line, sw:e.sw, al:e.al, fs:e.fs};
  if(selK==='img'&&s.img) return {src:'img', ish:s.ish, ibc:s.ibc, ibw:s.ibw};
  return null; }
function fpCopy(){ var s=deck&&deck.slides[cur]; if(!s||gen||busyOn) return false; var f=fpGrab(s);
  if(!f){ toast(T('글상자·그림·도형을 골라야 서식을 복사할 수 있어요')); return false; } fp.f=f; return true; }
/* the changes F would make on one shape ({} when none); the result is checked by fixEl, so only valid values stay */
function fpPatch(e,F){ var L=isLine(e), p={};
  if(F.src==='el'){
    if(!L&&!F.line){ p.fill=F.fill; p.gr=F.gr; p.ga=F.ga; p.op=F.op; p.al=F.al; p.fs=F.fs; if((F.k==='rect'||F.k==='round')&&(e.k==='rect'||e.k==='round')) p.k=F.k; }
    if(F.ln||!L){ p.line=F.ln; p.sw=F.sw; } }
  else { if(F.ibc||!L){ p.line=F.ibc; p.sw=F.ibc?F.ibw:0; } }
  if(L&&!p.line) delete p.sw; if(L&&p.sw===0) delete p.sw;
  var n=fixEl(Object.assign({},e,p)), o={}; if(!n) return o; for(var k in p) if(n[k]!==e[k]) o[k]=n[k]; return o; }
function fpPatchImg(s,F){ var o={};
  if(F.src==='img'){ o.ish=F.ish; o.ibc=F.ibc; o.ibw=F.ibw; }
  else { if(F.k==='rect'||F.k==='round') o.ish=F.k; o.ibc=F.ln; o.ibw=F.ln?F.sw:0; }
  var r={}; if(o.ish!==undefined&&ISH.indexOf(o.ish)>=0&&o.ish!==s.ish) r.ish=o.ish; if(o.ibc!==undefined&&fixCol(o.ibc,'')===o.ibc&&o.ibc!==s.ibc) r.ibc=o.ibc; if(o.ibw!==undefined&&num(o.ibw,0,0,40)!==s.ibw) r.ibw=num(o.ibw,0,0,40); return r; }
/* paint the picked shapes (or the picture) k; one undo step. Returns true when the target can take a format at all */
function fpPaint(s,keys){ var F=fp.f; if(!F) return false; var jobs=[], ok=false;
  keys.forEach(function(k){ if(k==='img'&&s.img){ ok=true; var r=fpPatchImg(s,F); if(Object.keys(r).length) jobs.push(function(){ for(var q in r) s[q]=r[q]; }); }
    else { var e=k.slice(0,2)==='e:'&&shapeOf(s,k.slice(2)); if(e){ ok=true; var o=fpPatch(e,F); if(Object.keys(o).length) jobs.push(function(){ for(var q in o) e[q]=o[q]; }); } } });
  if(!ok){ toast(T('이 상자에는 서식을 붙일 수 없어요 (글상자·그림·도형에서 쓸 수 있어요)')); return false; }
  if(!jobs.length){ toast(T('이미 같은 서식이에요')); return true; }
  blurEdit(); pushUndo(); jobs.forEach(function(j){ j(); }); changed(); toast(T('서식을 붙였어요')); return true; }
function fpDraw(){ host.classList.toggle('fpOn',fp.on); selBar(); }
function fpOff(){ if(!fp.on) return; fp.on=false; fp.keep=false; fpDraw(); }
/* the button: one press = paint once, a double press = paint until Esc; pressing again cancels */
function fpBtn(dbl){ var s=deck&&deck.slides[cur]; if(!s||gen||busyOn) return;
  if(fp.on&&!dbl){ if(Date.now()-fp.t<450) return; fpOff(); return; }
  if(!fp.on&&!fpCopy()) return; fp.on=true; fp.keep=!!dbl; fp.t=Date.now(); blurEdit(); closeMenus(); fpDraw();
  toast(T(dbl?'서식 복사를 켜 뒀어요. 도형을 계속 눌러 붙이고, 끝내려면 Esc를 눌러요':'서식을 복사했어요. 붙일 도형·그림을 눌러요')); }
/* Ctrl+Alt+V: paint what is picked now */
function fpPasteSel(){ var s=deck&&deck.slides[cur]; if(!s||gen||busyOn) return; if(!fp.f) return toast(T('복사한 서식이 없어요. Ctrl+Alt+C로 먼저 복사해 주세요'));
  var a=selEls(s); fpPaint(s,a.length?a.map(function(e){ return 'e:'+e.id; }):selK?[selK]:[]); }
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
/* a list (bullets, left, right) can show one line per press instead of the whole box at once */
function setLines(){ var s=deck.slides[cur]; if(!s||!selK||LISTS.indexOf(selK)<0) return; pushUndo(); var i=buildIx(s,selK); if(i<0) s.build.push({k:selK, a:'fade', l:1}); else if(s.build[i].l) delete s.build[i].l; else s.build[i].l=1; changed(); }
function moveBuild(d){ var s=deck.slides[cur], i=s?buildIx(s,selKeys(s)[0]):-1, j=i+d; if(i<0||j<0||j>=s.build.length) return; pushUndo(); var x=s.build.splice(i,1)[0]; s.build.splice(j,0,x); changed(); }
function selBar(){ selBar0(); if(window.FRB) FRB.sync(); }
function selBar0(){ var b=$('selBar'), s=deck&&deck.slides[cur]; b.innerHTML=''; b.hidden=!s||gen||busyOn;
  if(!selK){ b.className='selBar hint'; b.textContent=T('글상자·그림·도형을 누르면 끌어서 옮기고 모서리로 크기를 바꿀 수 있어요. 빈 곳을 끌거나 Shift를 누르고 누르면 여러 개를 고를 수 있어요'); if(readClip()){ var pb=document.createElement('button'); pb.className='tbtn'; pb.dataset.sb='paste'; pb.textContent=T('붙여넣기'); b.appendChild(pb); } return; }
  b.className='selBar'; var e=selShape(), mem=selEls(s), bi=mem.length?buildIx(s,'e:'+mem[0].id):buildIx(s,selK), many=isMany(selK);
  var add=function(k,txt,dis){ var x=document.createElement('button'); x.className='tbtn'; x.dataset.sb=k; x.textContent=T(txt); if(dis) x.disabled=true; b.appendChild(x); return x; };
  if(e&&e.k==='media'){ add('mauto','발표할 때 저절로 재생').classList.toggle('on',!!e.auto); }
  else if(e&&e.k==='pic'){ add('pfx','그림 효과').classList.toggle('on',!!(e.br!==100||e.ct!==100||e.gs)); add('pshape','모양 자르기').classList.toggle('on',e.ish!=='rect'); add('line','테두리').classList.toggle('on',!!(e.sw&&e.line));
    add('fx','효과').classList.toggle('on',!!(e.rot||e.sd||e.gl||e.fl||e.url)); add('pratio','원래 비율'); add('prepl','그림 바꾸기'); }
  else if(e){ if(!isLine(e)) add('fill','채우기'); if(!isLine(e)) add('fx','효과').classList.toggle('on',!!(e.rot||e.sd||e.gl||e.fl||e.url)); add('line',isLine(e)?'선 색·굵기':'테두리'); if(!isLine(e)) add('text','글 쓰기'); if(e.c){ var ca=add('carrow','화살표'); ca.classList.toggle('on',e.k==='arrow'); ca.title=T('끝에 화살표 달기 · 빼기'); } }
  if(connPick(s,selK)) add('conn','연결선').title=T('다른 도형과 이어요. 도형을 옮기면 같이 따라 움직여요');
  if(selK==='img'&&s.img){ add('pshape','모양 자르기').classList.toggle('on',s.ish!=='rect'); add('pborder','테두리').classList.toggle('on',!!(s.ibw&&s.ibc)); }
  if(e||selK==='img'&&s.img) add('alt','대체 텍스트').classList.toggle('on',!!(e?e.alt:s.ialt));
  if(many) add('many',F('{0}개 골랐어요',mem.length),true);
  if(selK==='m') add('group','그룹으로 묶기');
  if(selK.slice(0,2)==='g:') add('ungroup','그룹 풀기');
  add('anim',bi>=0?F('나타나기 {0}번',bi+1):'나타나는 효과').classList.toggle('on',bi>=0);
  if(tfList(s).length){ var tfs=tfState(); add('tf','글자 모양').classList.toggle('on',!!(tfs&&(tfs.i||tfs.u||tfs.s||tfs.c)||(tfList(s).some(function(t){ var o=tfGet(t); return o&&o.b; })))); }
  if(e&&!isLine(e)&&e.k!=='media') add('talign','글 정렬');
  if(e||selK==='img'&&s.img) add('fpaint','서식 복사').classList.toggle('on',fp.on);
  add('align','맞추기');
  if(mem.length){ add('layer','겹침 순서'); add('multi','여러 개 고르기').classList.toggle('on',multiOn); add('dup','복제'); add('copy','복사'); add('del','지우기').classList.add('dang'); }
  else { add('reset','원래 자리로',!s.pos[selK]); if(selK==='img'&&s.img) add('del','그림 빼기').classList.add('dang'); } }
/* my colours: up to 12 colours kept in this browser, filled by the eyedropper (the browser's EyeDropper where it has one; otherwise a tap on a picture on the slide) */
var MYK='ffslides.mycolors', MYN=12, eye=null;
function myRead(){ var a=[]; try{ a=JSON.parse(localStorage.getItem(MYK)||'[]'); }catch(e){} return (Array.isArray(a)?a:[]).filter(function(c){ return /^#[0-9a-f]{6}$/i.test(c); }).slice(0,MYN); }
function myAdd(c){ c=String(c).toLowerCase(); var a=myRead().filter(function(x){ return x!==c; }); a.unshift(c); try{ localStorage.setItem(MYK,JSON.stringify(a.slice(0,MYN))); }catch(e){} }
function myRow(m,kind){ m._kind=kind; m.appendChild(document.createElement('hr')); var h=document.createElement('div'); h.className='mh'; h.textContent=T('내 색 모음'); m.appendChild(h);
  var r=document.createElement('div'); r.className='swr'; m.appendChild(r);
  var ey=document.createElement('button'); ey.type='button'; ey.className='tbtn'; ey.dataset.o='ey:'; ey.textContent=T('스포이트'); ey.title=T('슬라이드의 그림에서 색을 집어 와요'); r.appendChild(ey);
  var a=myRead(); a.forEach(function(c){ var b=document.createElement('button'); b.className='sw'; b.dataset.o='mc:'+c; b.style.background=c; b.title=c; b.setAttribute('aria-label',c); r.appendChild(b); });
  if(a.length){ var cl=document.createElement('button'); cl.type='button'; cl.className='tbtn'; cl.dataset.o='mc:clear'; cl.textContent=T('모음 비우기'); r.appendChild(cl); }
  else { var n=document.createElement('p'); n.className='mnote'; n.textContent=T('스포이트로 집은 색이 여기에 모여요 (12개까지)'); m.appendChild(n); } }
/* put a colour on what the open menu is about */
function myApply(kind,c){ var s=deck.slides[cur], e=selShape(); if(!s) return;
  if(kind==='tf'){ tfSet(function(o){ o.c=c; }); return; }
  pushUndo();
  if(kind==='pborder'){ s.ibc=c; if(!s.ibw) s.ibw=6; } else if(e&&kind==='fill'){ e.fill=c; } else if(e&&kind==='line'){ e.line=c; if(!e.sw) e.sw=4; } else return;
  changed(); }
function eyeDone(kind,c){ myAdd(c); myApply(kind,c); toast(F('{0} 색을 내 색 모음에 담고 칠했어요',c)); }
/* no EyeDropper (Safari, Firefox): the next tap on a picture on the slide gives its colour */
function eyeSample(img,x,y){ var r=img.getBoundingClientRect(), nw=img.naturalWidth, nh=img.naturalHeight; if(!nw||!nh) return '';
  var cs=getComputedStyle(img), k=(cs.objectFit==='cover'?Math.max:Math.min)(r.width/nw,r.height/nh), pp=cs.objectPosition.split(' ').map(parseFloat), ox=(r.width-nw*k)*(pp[0]/100), oy=(r.height-nh*k)*(pp[1]/100),
    ix=Math.floor((x-r.left-ox)/k), iy=Math.floor((y-r.top-oy)/k); if(ix<0||iy<0||ix>=nw||iy>=nh) return '';
  var c=document.createElement('canvas'); c.width=c.height=1; var g=c.getContext('2d'); g.drawImage(img,ix,iy,1,1,0,0,1,1); try{ var d=g.getImageData(0,0,1,1).data; return d[3]<8?'':'#'+[d[0],d[1],d[2]].map(function(v){ return ('0'+v.toString(16)).slice(-2); }).join(''); }catch(err){ return ''; } }
function eyeOff(){ if(!eye) return; document.removeEventListener('pointerdown',eye.h,true); host.classList.remove('eyeOn'); eye=null; }
function eyeStart(kind){ closeMenus(); blurEdit();
  if(window.EyeDropper){ new EyeDropper().open().then(function(r){ eyeDone(kind,r.sRGBHex); },function(){}); return; }
  eyeOff(); eye={kind:kind, h:function(ev){ var img=document.elementsFromPoint(ev.clientX,ev.clientY).filter(function(n){ return n.tagName==='IMG'&&host.contains(n); })[0]; ev.preventDefault(); ev.stopPropagation(); var k=eye.kind, c=img?eyeSample(img,ev.clientX,ev.clientY):''; eyeOff();
    if(c) eyeDone(k,c); else toast(T(img?'그 자리는 비어 있어요':'스포이트를 그만뒀어요')); }};
  document.addEventListener('pointerdown',eye.h,true); host.classList.add('eyeOn'); toast(T('색을 집을 그림을 눌러 주세요 (그림이 아닌 곳을 누르면 그만둬요)')); }
function drawElMenu(kind){ var m=$('elMenu'), s=deck.slides[cur], e=selShape(), t=eth(s,th()); m.innerHTML='';
  var hd=function(txt){ var d=document.createElement('div'); d.className='mh'; d.textContent=T(txt); m.appendChild(d); };
  var add=function(k,txt,on,dis){ var b=document.createElement('button'); b.dataset.o=k; b.textContent=(on?'✓ ':'')+T(txt); if(dis) b.disabled=true; m.appendChild(b); return b; };
  if(kind==='shape'){ hd('도형 넣기'); var g=document.createElement('div'); g.className='shg'; m.appendChild(g);
    SHAPES.forEach(function(q){ var b=document.createElement('button'); b.dataset.o='sh:'+q[0]; b.innerHTML='<svg viewBox="0 0 24 24">'+SHI[q[0]]+'</svg><span></span>'; b.lastChild.textContent=T(q[1]); g.appendChild(b); }); return; }
  if(kind==='fx'&&e){ hd('돌리기'); [[-90,'← 90°'],[-15,'← 15°'],[15,'15° →'],[90,'90° →']].forEach(function(q){ add('rt:'+q[0],q[1]); }); add('rt:0','똑바로',!e.rot); m.appendChild(document.createElement('hr'));
    hd('그림자'); add('sd:0','없음',!e.sd); add('sd:1','약하게',e.sd===1); add('sd:2','진하게',e.sd===2); m.appendChild(document.createElement('hr'));
    hd('빛나기'); add('gl:0','없음',!e.gl); add('gl:1','은은하게',e.gl===1); add('gl:2','환하게',e.gl===2); m.appendChild(document.createElement('hr'));
    hd('뒤집기'); add('fp:h','좌우로 뒤집기',!!(e.fl&1)); add('fp:v','위아래로 뒤집기',!!(e.fl&2)); m.appendChild(document.createElement('hr'));
    hd('링크'); add('lk:set',e.url?'주소 바꾸기':'누르면 열리는 주소 넣기'); if(e.url){ add('lk:del','링크 빼기'); var lp=document.createElement('p'); lp.className='mnote'; lp.textContent=e.url.slice(0,60); lp.setAttribute('data-notr',''); m.appendChild(lp); } return; }
  if(kind==='pfx'&&e&&e.k==='pic'){ hd(F('밝기 {0}%',e.br)); add('pf:br:-10','더 어둡게'); add('pf:br:10','더 밝게'); m.appendChild(document.createElement('hr'));
    hd(F('대비 {0}%',e.ct)); add('pf:ct:-10','대비 낮추기'); add('pf:ct:10','대비 높이기'); m.appendChild(document.createElement('hr'));
    hd('색 효과'); add('pf:gs:0','원래 색',!e.gs); add('pf:gs:1','흑백',e.gs===1); add('pf:gs:2','세피아',e.gs===2); m.appendChild(document.createElement('hr'));
    hd('그림 안에서 보이는 곳 옮기기 (상자보다 큰 그림일 때)'); var pr=document.createElement('div'); pr.className='gdir'; m.appendChild(pr);
    [['x:-15','←'],['x:15','→'],['y:-15','↑'],['y:15','↓']].forEach(function(q){ var b=document.createElement('button'); b.className='tbtn'; b.dataset.o='pf:p'+q[0]; b.textContent=q[1]; pr.appendChild(b); });
    m.appendChild(document.createElement('hr')); add('pf:reset','그림 효과 모두 없애기'); return; }
  if(kind==='tf'){ var ts=tfState(); if(!ts) return; hd('글자 모양'); add('tf:b','굵게',ts.b); add('tf:i','기울임',ts.i); add('tf:u','밑줄',ts.u); add('tf:s','취소선',ts.s); m.appendChild(document.createElement('hr')); hd('글자 색');
    var tr=document.createElement('div'); tr.className='swr'; m.appendChild(tr);
    var tsw=function(v,bg,label){ var b=document.createElement('button'); b.className='sw'+(ts.c===v?' on':'')+(v===''?' none':''); b.dataset.o='tc:'+v; b.style.background=bg; b.title=T(label||v); b.setAttribute('aria-label',T(label||v)); tr.appendChild(b); };
    tsw('','transparent','테마 기본 색'); tsw('ac',t.ac,'테마 강조색'); tsw('fg',t.fg,'테마 글자색'); SWC.forEach(function(c){ tsw(c,c); });
    var tci=document.createElement('input'); tci.type='color'; tci.value=/^#/.test(ts.c)?ts.c:'#3d7fe0'; tci.title=T('직접 고르기'); tci.setAttribute('aria-label',T('직접 고르기')); tr.appendChild(tci);
    tci.addEventListener('pointerdown',function(){ if(!tci._u){ tci._u=1; pushUndo(); } });
    tci.addEventListener('input',function(){ var x=deck.slides[cur]; if(!x) return; tfList(x).forEach(function(q){ tfGet(q,1).c=tci.value; }); saveSoon(); updateThumb(cur); drawMain(); });
    tci.addEventListener('change',function(){ tfList(deck.slides[cur]).forEach(tfClean); closeMenus(); });
    myRow(m,'tf');
    m.appendChild(document.createElement('hr')); add('tf:reset','글자 모양 모두 지우기'); return; }
  if(kind==='layer'){ hd('겹치는 순서'); add('ly:front','맨 앞으로'); add('ly:fwd','앞으로'); add('ly:bwd','뒤로'); add('ly:back','맨 뒤로'); m.appendChild(document.createElement('hr')); hd('맨 뒤로 보낸 도형은 글 뒤에 놓여요'); return; }
  if(kind==='pshape'){ var PT0=e&&e.k==='pic'?e:s; hd('그림을 이 모양으로 자르기'); var pg=document.createElement('div'); pg.className='shg'; m.appendChild(pg);
    var PI={rect:'M0 .12H1V.88H0Z', round:'M.2 .12H.8A.2 .2 0 0 1 1 .32V.68A.2 .2 0 0 1 .8 .88H.2A.2 .2 0 0 1 0 .68V.32A.2 .2 0 0 1 .2 .12Z', ell:'M.5 0A.5 .5 0 1 1 .5 1A.5 .5 0 1 1 .5 0Z'};
    PICN.forEach(function(q){ var b=document.createElement('button'); b.dataset.o='ps:'+q[0]; if(PT0.ish===q[0]) b.classList.add('on'); b.innerHTML='<svg viewBox="0 0 24 24"><path transform="translate(1 1) scale(22)" vector-effect="non-scaling-stroke" d="'+(PICP[q[0]]||PI[q[0]])+'"/></svg><span></span>'; b.lastChild.textContent=(PT0.ish===q[0]?'✓ ':'')+T(q[1]); pg.appendChild(b); }); return; }
  if(kind==='pborder'){ hd('그림 테두리 색'); var rw=document.createElement('div'); rw.className='swr'; m.appendChild(rw);
    var sw0=function(v,bg,label){ var b=document.createElement('button'); b.className='sw'+(s.ibc===v?' on':'')+(v===''?' none':''); b.dataset.o='pc:'+v; b.style.background=bg; b.title=T(label||v); b.setAttribute('aria-label',T(label||v)); rw.appendChild(b); };
    sw0('','transparent','없음'); sw0('ac',t.ac,'테마 강조색'); sw0('fg',t.fg,'테마 글자색'); SWC.forEach(function(c){ sw0(c,c); });
    var pc=document.createElement('input'); pc.type='color'; pc.value=/^#/.test(s.ibc)?s.ibc:colOf(s.ibc,t)||'#3d7fe0'; pc.title=T('직접 고르기'); pc.setAttribute('aria-label',T('직접 고르기')); rw.appendChild(pc);
    pc.addEventListener('pointerdown',function(){ if(!pc._u){ pc._u=1; pushUndo(); } });
    pc.addEventListener('input',function(){ var x=deck.slides[cur]; if(!x) return; if(!pc._u){ pc._u=1; pushUndo(); } x.ibc=pc.value; if(!x.ibw) x.ibw=6; saveSoon(); updateThumb(cur); drawMain(); });
    pc.addEventListener('change',function(){ closeMenus(); });
    myRow(m,'pborder');
    m.appendChild(document.createElement('hr')); hd('굵기'); [0,3,6,10,16].forEach(function(w){ add('pw:'+w,w?F('{0}px',w):'없음',s.ibw===w&&(w===0||!!s.ibc)); }); return; }
  if(kind==='anim'){ var i=buildIx(s,selKeys(s)[0]), a=i>=0?s.build[i].a:'none'; hd('발표할 때 누를 때마다 하나씩 나타나요');
    add('an:none','효과 없음 (처음부터 보이기)',a==='none'); add('an:fade','서서히 나타나기',a==='fade'); add('an:fly','날아 들어오기',a==='fly'); add('an:set',a==='none'||a==='fade'||a==='fly'?'더 많은 효과 · 방향 · 시간 · 자동 재생 설정…':F('{0} · 방향 · 시간 · 자동 재생 설정…',fxOf(a)[1]));
    if(selKeys(s).length===1&&LISTS.indexOf(selKeys(s)[0])>=0){ m.appendChild(document.createElement('hr')); add('an:lines','줄마다 한 번씩 누르기',i>=0&&!!s.build[i].l); }
    if(i>=0&&selKeys(s).length===1){ m.appendChild(document.createElement('hr')); hd(F('{0}번째로 나타나요 (모두 {1}개)',i+1,s.build.length)); add('an:up','더 먼저 나타나기',0,i===0); add('an:down','더 나중에 나타나기',0,i===s.build.length-1); }
    return; }
  if(kind==='align'){ hd('슬라이드에서 맞추기'); [['l','왼쪽'],['ch','가로 가운데'],['r','오른쪽'],['t','위쪽'],['cv','세로 가운데'],['b','아래쪽']].forEach(function(q){ add('al2:'+q[0],q[1]); }); return; }
  if(kind==='talign'){ hd('글자 정렬'); [['l','왼쪽'],['c','가운데'],['r','오른쪽']].forEach(function(q){ add('al:'+q[0],q[1],e&&e.al===q[0]); }); return; }
  if(kind==='emoji'){ hd('이모지 넣기'); var g2=document.createElement('div'); g2.className='emg'; m.appendChild(g2); EMOJIS.forEach(function(c){ var b=document.createElement('button'); b.dataset.o='em:'+c; b.textContent=c; g2.appendChild(b); }); return; }
  if(!e) return; if(e.k==='media'){ hd('동영상·소리에는 채우기와 테두리가 없어요'); return; } if(e.k==='pic'&&kind==='fill'){ hd('그림에는 채우기가 없어요'); return; } var key=kind==='fill'?'fill':'line', L=isLine(e); m._k=key;
  hd(kind==='fill'?'채우기 색':L?'선 색':'테두리 색'); var row=document.createElement('div'); row.className='swr'; m.appendChild(row);
  var sw=function(v,bg,label){ var b=document.createElement('button'); b.className='sw'+(e[key]===v?' on':'')+(v===''?' none':''); b.dataset.o='c:'+v; b.style.background=bg; b.title=T(label||v); b.setAttribute('aria-label',T(label||v)); row.appendChild(b); };
  if(!L) sw('','transparent','없음'); sw('ac',t.ac,'테마 강조색'); sw('fg',t.fg,'테마 글자색'); SWC.forEach(function(c){ sw(c,c); });
  var ci=document.createElement('input'); ci.type='color'; ci.value=/^#/.test(e[key])?e[key]:colOf(e[key],t)||'#3d7fe0'; ci.title=T('직접 고르기'); ci.setAttribute('aria-label',T('직접 고르기')); row.appendChild(ci);
  ci.addEventListener('pointerdown',function(){ if(!ci._u){ ci._u=1; pushUndo(); } });
  ci.addEventListener('input',function(){ var x=selShape(); if(!x) return; if(!ci._u){ ci._u=1; pushUndo(); } x[key]=ci.value; if(key==='line'&&!x.sw) x.sw=4; saveSoon(); updateThumb(cur); drawMain(); });
  ci.addEventListener('change',function(){ closeMenus(); });
  myRow(m,kind);
  if(kind==='fill'&&!L&&e.k!=='media'){ m.appendChild(document.createElement('hr')); hd('그라데이션'); var gw=document.createElement('div'); gw.className='swr'; m.appendChild(gw);
    var gsw=function(v,bg,label){ var b=document.createElement('button'); b.className='sw'+((e.gr||'')===v?' on':'')+(v===''?' none':''); b.dataset.o='gr:'+v; b.style.background=v?'linear-gradient(180deg,'+(colOf(e.fill,t)||t.ac)+','+bg+')':'transparent'; b.title=T(label); b.setAttribute('aria-label',T(label)); gw.appendChild(b); };
    gsw('','','그라데이션 없음'); gsw('#ffffff','#ffffff','흰색으로'); gsw('#111111','#111111','검은색으로'); gsw('ac',t.ac,'테마 강조색으로'); gsw('fg',t.fg,'테마 글자색으로'); ['#ff8a3d','#e0526b','#8a5ce0','#2fb27a','#ffc93c'].forEach(function(c){ gsw(c,c,c); });
    var gi=document.createElement('input'); gi.type='color'; gi.value=/^#/.test(e.gr||'')?e.gr:'#ffffff'; gi.title=T('직접 고르기'); gi.setAttribute('aria-label',T('직접 고르기')); gw.appendChild(gi);
    gi.addEventListener('input',function(){ var x=selShape(); if(!x||!x.fill) return; if(!gi._u){ gi._u=1; pushUndo(); } x.gr=gi.value; if(x.ga==null) x.ga=90; saveSoon(); updateThumb(cur); drawMain(); });
    gi.addEventListener('change',function(){ closeMenus(); });
    if(e.gr){ var dr=document.createElement('div'); dr.className='gdir'; m.appendChild(dr); [[90,'↓','위에서 아래로'],[0,'→','왼쪽에서 오른쪽으로'],[45,'↘','대각선 아래로'],[315,'↗','대각선 위로']].forEach(function(q){ var b=document.createElement('button'); b.className='tbtn'+(e.ga===q[0]?' on':''); b.dataset.o='ga:'+q[0]; b.textContent=q[1]; b.title=T(q[2]); dr.appendChild(b); }); }
    if(!e.fill){ var gn=document.createElement('p'); gn.className='mnote'; gn.textContent=T('채우기 색을 먼저 고르면 그라데이션을 넣을 수 있어요'); m.appendChild(gn); } }
  if(kind==='fill'&&!L&&e.k!=='media'){ m.appendChild(document.createElement('hr')); hd('투명도'); [100,80,60,40,20].forEach(function(v){ add('o:'+v,v+'%',(e.op||100)===v); }); }
  if(kind==='line'){ m.appendChild(document.createElement('hr')); hd('굵기'); (L?[2,4,6,10,16]:[2,4,8,12]).forEach(function(w){ add('w:'+w,F('{0}px',w),e.sw===w&&(L||!!e.line)); });
    if(e.k!=='pic'){ m.appendChild(document.createElement('hr')); hd('선 모양'); add('ds:0','실선',!e.ds); add('ds:1','점선',e.ds===1); add('ds:2','동그란 점선',e.ds===2); } } }
$('emojiBtn').onclick=function(){ if(!deck.slides.length||gen||busyOn) return; blurEdit(); drawElMenu('emoji'); openMenu($('elMenu'),this); };
$('shapeBtn').onclick=function(){ if(!deck.slides.length||gen||busyOn) return; blurEdit(); drawElMenu('shape'); openMenu($('elMenu'),this); };
$('selBar').addEventListener('click',function(e){ var x=e.target.closest('[data-sb]'); if(!x||x.disabled) return; var k=x.dataset.sb, s=deck.slides[cur], sh=selShape(); if(k==='paste') return pasteEl(); if(!s||!selK) return;
  if(k==='fill'||k==='fx'||k==='pfx'||k==='tf'||k==='line'||k==='anim'||k==='align'||k==='talign'||k==='layer'||k==='pshape'||k==='pborder'){ blurEdit(); drawElMenu(k); openMenu($('elMenu'),x); return; }
  if(k==='group') return groupSel();
  if(k==='ungroup') return ungroupSel();
  if(k==='multi'){ multiOn=!multiOn; selBar(); toast(T(multiOn?'도형을 누르면 하나씩 더하거나 빼요':'여러 개 고르기를 껐어요')); return; }
  if(k==='copy') return copySel();
  if(k==='fpaint') return fpBtn(false);
  if(k==='alt') return openAlt();
  if(k==='prepl') return pickImage(sh);
  if(k==='pratio'){ if(!sh||sh.k!=='pic') return; pushUndo(); sh.h=num(sh.w*sh.ih/sh.iw,sh.h,20,4000); sh.px=sh.py=50; changed(); return; }
  if(k==='conn') return connStart();
  if(k==='text') return editShapeText(selK);
  if(k==='mauto'){ if(!sh||sh.k!=='media') return; pushUndo(); sh.auto=!sh.auto; changed(); toast(T(sh.auto?'발표할 때 이 슬라이드에서 저절로 재생해요':'발표할 때 눌러야 재생해요')); return; }
  blurEdit();
  if(k==='carrow'){ if(!sh||!sh.c) return; pushUndo(); sh.k=sh.k==='arrow'?'line':'arrow'; changed(); }
  else if(k==='reset'){ if(!s.pos[selK]) return; pushUndo(); delete s.pos[selK]; changed(); }
  else if(k==='del') delSel();
  else if(k==='dup') dupSel(); });
$('elMenu').addEventListener('click',function(ev){ var b=ev.target.closest('[data-o]'); if(!b||b.disabled) return; var k=b.dataset.o, e=selShape(), s=deck.slides[cur];
  if(k.indexOf('sh:')===0){ closeMenus(); return addShape(k.slice(3)); }
  if(k.indexOf('em:')===0){ closeMenus(); return addEmoji(k.slice(3)); }
  if(k.indexOf('al2:')===0){ closeMenus(); return alignSel(k.slice(4)); }
  if(k.indexOf('ly:')===0){ closeMenus(); return layerSel(k.slice(3)); }
  if(k==='ey:'){ return eyeStart($('elMenu')._kind); }
  if(k==='mc:clear'){ try{ localStorage.removeItem(MYK); }catch(err){} drawElMenu($('elMenu')._kind); return; }
  if(k.indexOf('mc:')===0){ closeMenus(); return myApply($('elMenu')._kind,k.slice(3)); }
  if(k.indexOf('tf:')===0){ if(k==='tf:reset'){ closeMenus(); return tfSet(function(o){ o.b=o.i=o.u=o.s=0; o.c=''; }); } tfToggle(k.slice(3)); drawElMenu('tf'); return; }
  if(k.indexOf('tc:')===0){ closeMenus(); var tv=k.slice(3); return tfSet(function(o){ o.c=tv; }); }
  if(k.indexOf('ps:')===0){ closeMenus(); return setPicShape(k.slice(3)); }
  if(k.indexOf('pf:')===0&&e&&e.k==='pic'){ var pq=k.split(':'); pushUndo();
    if(pq[1]==='br'||pq[1]==='ct') e[pq[1]]=num(e[pq[1]]+ +pq[2],100,40,160); else if(pq[1]==='gs') e.gs=+pq[2]; else if(pq[1]==='px'||pq[1]==='py') e[pq[1]]=num(e[pq[1]]+ +pq[2],50,0,100); else e.br=e.ct=100, e.gs=0;
    changed(); drawElMenu('pfx'); return; }
  if(k.indexOf('pc:')===0){ closeMenus(); if(s.ibc===k.slice(3)) return; pushUndo(); s.ibc=k.slice(3); if(s.ibc&&!s.ibw) s.ibw=6; changed(); return; }
  if(k.indexOf('pw:')===0){ closeMenus(); var w=+k.slice(3); pushUndo(); s.ibw=w; if(w&&!s.ibc) s.ibc='fg'; changed(); return; }
  if(k==='an:up'||k==='an:down'){ moveBuild(k==='an:up'?-1:1); drawElMenu('anim'); return; }
  if(k==='lk:set'){ closeMenus(); return openUrl(); }
  if(k==='an:set'){ closeMenus(); return openAnim(); }
  if(k==='an:lines'){ closeMenus(); return setLines(); }
  if(k.indexOf('an:')===0){ closeMenus(); return setAnim(k.slice(3)); }
  if(!e||!s) return; closeMenus(); pushUndo();
  if(k.indexOf('c:')===0){ var key=$('elMenu')._k; e[key]=k.slice(2); if(key==='line'&&e[key]&&!e.sw) e.sw=4; }
  else if(k.indexOf('w:')===0){ e.sw=+k.slice(2); if(!e.line) e.line='fg'; }
  else if(k.indexOf('o:')===0){ e.op=+k.slice(2); }
  else if(k.indexOf('rt:')===0){ var dg=+k.slice(3); e.rot=dg?((e.rot||0)+dg+360)%360:0; if(!e.rot) delete e.rot; }
  else if(k.indexOf('sd:')===0){ e.sd=+k.slice(3); if(!e.sd) delete e.sd; }
  else if(k.indexOf('gl:')===0){ e.gl=+k.slice(3); if(!e.gl) delete e.gl; }
  else if(k.indexOf('fp:')===0){ e.fl=(e.fl||0)^(k==='fp:h'?1:2); if(!e.fl) delete e.fl; }
  else if(k.indexOf('ds:')===0){ e.ds=+k.slice(3); if(!e.ds) delete e.ds; else if(!isLine(e)&&!(e.sw&&e.line)){ e.line='fg'; e.sw=4; } }
  else if(k==='lk:del'){ delete e.url; }
  else if(k.indexOf('gr:')===0){ if(!e.fill&&k.length>3) e.fill='ac'; e.gr=k.slice(3); if(!e.gr){ delete e.gr; delete e.ga; } else if(e.ga==null) e.ga=90; }
  else if(k.indexOf('ga:')===0){ e.ga=+k.slice(3); }
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
  s.layout=lay; s.pos={}; dropConns(s); syncLink(s); changed(); if(lay==='image'&&!s.img) pickImage(); else if((lay==='table'||lay==='chart')&&!s.data.trim()) openData(); else if(lay==='live'&&!liveCfg(s)) openLive(); }
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
/* part: '' = the whole menu, 'bg' / 'font' / 'tr' = only that section (the Design and Present tabs open those) */
function drawOptMenu(part){ var m=$('optMenu'), s=deck.slides[cur]; m.innerHTML=''; if(!s) return; part=part||'';
  var add=function(k,txt,on,dis){ var b=document.createElement('button'); b.dataset.o=k; b.textContent=(on?'✓ ':'')+T(txt); if(dis) b.disabled=true; m.appendChild(b); return b; };
  var hd=function(txt){ var d=document.createElement('div'); d.className='mh'; d.textContent=T(txt); m.appendChild(d); };
  var ci=document.createElement('input'), tr=trOf(s), hr=function(){ if(m.firstChild) m.appendChild(document.createElement('hr')); };
  if(!part){ add('hide',s.hide?'숨긴 슬라이드 보이기 (H)':'발표할 때 건너뛰기 (H)');
  if(s.layout==='table'||s.layout==='chart'){ add('data',s.layout==='chart'?'그래프 내용 고치기':'표 내용 고치기'); add('link',s.link?'시트 연결 바꾸기':'프라이 시트에서 가져오기 (연결)'); if(s.link){ add('relink','지금 새로 고침'); add('unlink','연결 끊기'); } }
  if(s.layout==='quiz') add('choices','실시간 퀴즈 보기 고치기…');
  if(s.layout==='live'){ add('live','살아있는 화면 고치기'); if(liveCfg(s)) add('liveclear','살아있는 화면 지우기'); }
  add('auto',s.sec?(s.sec<0?'자동 넘기기: 이 슬라이드에서 멈춤':F('자동 넘기기: 이 슬라이드 {0}초',s.sec)):'자동 넘기기 시간…');
  add('first','맨 앞으로 보내기',0,cur===0); add('last','맨 뒤로 보내기',0,cur===deck.slides.length-1); }
  if(!part||part==='bg'){ hr(); hd('이 슬라이드 배경색');
  var row=document.createElement('div'); row.className='swr';
  BGS.forEach(function(c){ var b=document.createElement('button'); b.className='sw'+(s.bg===c?' on':''); b.dataset.o='bg:'+c; b.style.background=c; b.setAttribute('aria-label',c); row.appendChild(b); });
  ci.type='color'; ci.id='bgIn'; ci.value=s.bg||'#ffffff'; ci.title=T('직접 고르기'); ci.setAttribute('aria-label',T('직접 고르기')); row.appendChild(ci);
  m.appendChild(row); add('bg:','테마 배경으로 되돌리기',0,!s.bg);
  hd('그라데이션 배경 (아래쪽 색)'); var row2=document.createElement('div'); row2.className='swr';
  BGS.concat(['#ffd7a8','#c9b6ff']).forEach(function(c){ var b=document.createElement('button'); b.className='sw'+(s.bg2===c?' on':''); b.dataset.o='bg2:'+c; b.style.background='linear-gradient(180deg,'+(s.bg||th().bg)+','+c+')'; b.setAttribute('aria-label',c); row2.appendChild(b); });
  m.appendChild(row2); if(s.bg2){ var dr2=document.createElement('div'); dr2.className='gdir'; m.appendChild(dr2); [[90,'↓'],[0,'→'],[45,'↘']].forEach(function(q){ var b=document.createElement('button'); b.className='tbtn'+(s.bga===q[0]?' on':''); b.dataset.o='bga:'+q[0]; b.textContent=q[1]; dr2.appendChild(b); }); }
  add('bg2:','그라데이션 빼기',0,!s.bg2); }
  if(!part||part==='font'){ hr(); hd('글꼴 세트: 제목 + 본문 (모든 슬라이드)');
  FONTS.forEach(function(f){ var b=add('font:'+f[0],f[1],deck.font===f[0]), fs=FSETS[f[0]]; askFonts(f[0]); if(fs) b.style.fontFamily=fs.hf; else if(f[0]==='sans') b.style.fontFamily=SANS; else if(f[0]==='serif') b.style.fontFamily=SERIF; else if(f[0]==='mono') b.style.fontFamily=MONO; }); }
  if(!part||part==='tr'){ hr(); hd('넘어가는 효과 (이 슬라이드)');
  TRANS.forEach(function(t){ add('tr:'+t[0],t[1],tr===t[0]); });
  add('trAll','모든 슬라이드에 같은 효과',0,deck.trans===tr&&deck.slides.every(function(x){ return !x.tr; })); }
  ci.addEventListener('input',function(){ var s=deck.slides[cur]; if(s){ s.bg=ci.value; updateThumb(cur); drawMain(); saveSoon(); } });
  ci.addEventListener('change',function(){ closeMenus(); });
  ci.addEventListener('pointerdown',function(){ if(!ci._u){ ci._u=1; pushUndo(); } });
}
$('optBtn').onclick=function(){ if(!deck.slides.length) return; blurEdit(); drawOptMenu(); openMenu($('optMenu'),this); };
$('optMenu').addEventListener('click',function(e){ var b=e.target.closest('[data-o]'); if(!b||b.disabled) return; closeMenus(); optAct(b.dataset.o); });
function optAct(k){
  if(k==='hide') toggleHide(); else if(k==='data') openData(); else if(k==='link') openLink(); else if(k==='relink') refreshSlideLink(); else if(k==='unlink') unlinkSlide(); else if(k==='choices') openChoices(); else if(k==='liveclear'){ var ls=deck.slides[cur]; if(ls){ pushUndo(); ls.live=''; changed(true); } } else if(k==='live') openLive(); else if(k==='auto') openAuto(); else if(k==='first') moveSlide(cur,0); else if(k==='last') moveSlide(cur,deck.slides.length-1);
  else if(k.indexOf('bg2:')===0){ var sb=deck.slides[cur]; if(sb){ blurEdit(); pushUndo(); sb.bg2=k.slice(4); changed(); } }
  else if(k.indexOf('bga:')===0){ var sa=deck.slides[cur]; if(sa){ blurEdit(); pushUndo(); sa.bga=+k.slice(4); changed(); } }
  else if(k.indexOf('bg:')===0) setBg(k.slice(3)); else if(k.indexOf('font:')===0) setFont(k.slice(5)); else if(k.indexOf('tr:')===0){ setTrans(k.slice(3)); toast(T('저장했어요')); } else if(k==='trAll'){ setTransAll(); toast(T('모든 슬라이드에 같은 효과를 넣었어요')); } }

/* table and chart data: one text box, the slide draws it */
function openData(){ var s=deck.slides[cur]; if(!s||(s.layout!=='table'&&s.layout!=='chart')||gen||busyOn) return; var ch=s.layout==='chart'; blurEdit();
  $('dataTitle').textContent=ch?T('그래프 내용'):T('표 내용');
  $('dataNote').textContent=ch?T('한 줄에 하나씩 "이름: 숫자"로 써요. 예) 사과: 12 (12줄까지)'):T('한 줄이 한 행이고, 칸은 쉼표·탭·|로 나눠요. 첫 줄은 제목 줄이에요. (9줄, 6칸까지)');
  $('dataIn').placeholder=ch?T('사과: 12\n바나나: 7\n포도: 9'):T('이름, 점수, 등수\n하늘, 92, 1\n바다, 88, 2');
  $('dataIn').value=s.data; $('dataTypeRow').hidden=!ch; $('dataType').value=s.ctype; dataLinkUI(); openDlg('dataDlg'); if(!s.link) setTimeout(function(){ $('dataIn').focus(); },60); }
$('dataOk').onclick=function(){ var s=deck.slides[cur]; if(!s) return closeDlg('dataDlg',null); pushUndo(); if(!s.link) s.data=$('dataIn').value.replace(/\r/g,'').trim(); s.ctype=$('dataType').value; closeDlg('dataDlg',null); changed(); };
$('dataIn').addEventListener('keydown',function(e){ e.stopPropagation(); if(e.key==='Escape') closeDlg('dataDlg',null); });
/* ---------- link a table or chart slide to a Fry Sheet range. Fry Sheet is on the same site, so its documents are in this browser's storage
   ('ffsheet.docs' = the list, 'ffsheet.doc.<id>' = one document). s.link = {doc, sh (sheet name), rg ('A1:C6'), dn (the document's name)}.
   s.data keeps the values last read, so everything that draws or exports (editor, presenting, PDF, share link, .pptx) just uses s.data after
   syncLinks() refreshed it, and a document that is gone still shows its last values. Formulas are worked out by Fry Sheet's own engine
   (../sheet/engine.js, loaded the first time a link is needed). Another tab saving the sheet fires a 'storage' event here, which refreshes. ---------- */
var SHI_K='ffsheet.docs', SHD_K='ffsheet.doc.', LINK_R=60, LINK_C=12, engP=null, shDocC={}, linkMiss={};
function fixLink(l){ if(!l||typeof l!=='object'||typeof l.doc!=='string'||!l.doc) return null; var g=String(l.rg||'').toUpperCase().replace(/\s+/g,''); if(!/^[A-Z]{1,3}\d+(:[A-Z]{1,3}\d+)?$/.test(g)) return null;
  return {doc:l.doc.slice(0,60), sh:String(l.sh==null?'':l.sh).slice(0,100), rg:g, dn:String(l.dn||'').slice(0,120)}; }
function needEngine(){ if(window.FSE) return Promise.resolve(window.FSE); if(engP) return engP;
  engP=new Promise(function(res,rej){ var s=document.createElement('script'); s.src='../sheet/engine.js'; s.onload=function(){ if(window.FSE) res(window.FSE); else { engP=null; rej(new Error('engine')); } }; s.onerror=function(){ engP=null; rej(new Error('engine')); }; document.head.appendChild(s); }); return engP; }
function lsRead(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function sheetList(){ var o=[]; try{ o=JSON.parse(lsRead(SHI_K)||'[]'); }catch(e){} return (Array.isArray(o)?o:[]).filter(function(x){ return x&&x.id&&lsRead(SHD_K+x.id); }); }
/* a parsed document and its engine, kept while the stored text stays the same */
function sheetDoc(id){ var raw=lsRead(SHD_K+id); if(!raw){ delete shDocC[id]; return null; } var c=shDocC[id]; if(c&&c.raw===raw){ if(!c.eng&&window.FSE) c.eng=new FSE.Engine(c.doc); return c; }
  var d=null; try{ d=JSON.parse(raw); }catch(e){} if(!d||!Array.isArray(d.sheets)||!d.sheets.length) return null;
  d.sheets.forEach(function(x,i){ x.cells=x.cells&&typeof x.cells==='object'?x.cells:{}; if(typeof x.name!=='string') x.name=T('시트')+(i+1); }); d.names=Array.isArray(d.names)?d.names:[];
  c=shDocC[id]={raw:raw, doc:d, eng:window.FSE?new FSE.Engine(d):null}; return c; }
function sheetIx(d,name){ for(var i=0;i<d.sheets.length;i++) if(d.sheets[i].name===name) return i; return -1; }
/* the cells that hold something, as a range like A1:C6 (or '' for an empty sheet) */
function usedRange(sh){ var r1=1e9,c1=1e9,r2=-1,c2=-1; for(var k in sh.cells){ var x=sh.cells[k]; if(!x||x.v==null||x.v==='') continue; var rc=FSE.RC(k); r1=Math.min(r1,rc[0]); c1=Math.min(c1,rc[1]); r2=Math.max(r2,rc[0]); c2=Math.max(c2,rc[1]); }
  return r2<0?'':FSE.rangeStr({r1:r1,c1:c1,r2:Math.min(r2,r1+LINK_R-1),c2:Math.min(c2,c1+LINK_C-1)}); }
/* the range's values as the sheet shows them: {rows:[[{v,t}]]} or {miss:'doc'|'sheet'|'range'|'eng'} */
function linkGrid(l){ if(!window.FSE) return {miss:'eng'}; var c=sheetDoc(l.doc); if(!c) return {miss:'doc'}; var si=sheetIx(c.doc,l.sh); if(si<0) return {miss:'sheet'};
  var g=FSE.parseRange(l.rg); if(!g) return {miss:'range'}; var r2=Math.min(g.r2,g.r1+LINK_R-1), c2=Math.min(g.c2,g.c1+LINK_C-1), cells=c.doc.sheets[si].cells, rows=[], r, k;
  for(r=g.r1;r<=r2;r++){ var row=[]; for(k=g.c1;k<=c2;k++){ var x=cells[FSE.K(r,k)], v=null; try{ v=c.eng.value(si,r,k); }catch(e){ v=null; } row.push({v:v, t:x||v!=null?String(FSE.formatValue(v,x&&x.nf)):''}); } rows.push(row); }
  return {rows:rows, name:c.doc.name||'', cut:g.r2>r2||g.c2>c2}; }
function cellNum(c){ if(typeof c.v==='number'&&isFinite(c.v)){ var n=csvNum(c.t); return n||{v:c.v, s:String(+c.v.toPrecision(12))}; } return csvNum(c.t); }
/* rows of cells -> the slide's own data text (what the table / chart slide draws); info for the dialog */
function gridData(rows,lay){ rows=rows.map(function(r){ return r.map(function(c){ return {v:c.v, t:String(c.t).replace(/[\t\r\n]+/g,' ').trim()}; }); });
  while(rows.length&&rows[rows.length-1].every(function(c){ return !c.t; })) rows.pop();
  var nc=rows.reduce(function(m,r){ var n=r.length; while(n&&!r[n-1].t) n--; return Math.max(m,n); },0); rows=rows.map(function(r){ return r.slice(0,nc); });
  if(!rows.length||!nc) return {data:'', n:0};
  if(lay==='table'){ var R=rows.slice(0,9).map(function(r){ return r.slice(0,6).map(function(c){ return nc===1?c.t.replace(/,/g,'，').replace(/\|/g,'｜'):c.t; }); });
    return {data:R.map(function(r){ return r.join('\t'); }).join('\n'), n:R.length, w:Math.min(6,nc), cutR:rows.length>9, cutC:nc>6}; }
  /* chart: the first column holds the names (unless it is all numbers), the first column after it with numbers holds the values; a first row of words is a header */
  var isNumCol=function(i){ var ne=0, nn=0; rows.forEach(function(r,ri){ if(!ri) return; if(r[i]&&r[i].t){ ne++; if(cellNum(r[i])) nn++; } }); return nn&&nn>=ne*.6; };
  var lab=nc>1?0:-1, val=-1, i; for(i=lab+1;i<nc;i++) if(isNumCol(i)||rows.length===1&&rows[0][i]&&cellNum(rows[0][i])){ val=i; break; }
  if(val<0&&nc===1) val=0; if(val<0) return {data:'', n:0, nonum:1};
  var body=rows; if(rows[0][val]&&rows[0][val].t&&!cellNum(rows[0][val])) body=rows.slice(1);
  var L=[]; body.forEach(function(r){ var n=r[val]&&cellNum(r[val]); if(!n) return; var nm=lab>=0&&r[lab]?r[lab].t:''; L.push((nm||String(L.length+1))+': '+n.s); });
  return {data:L.slice(0,12).join('\n'), n:Math.min(12,L.length), cutR:L.length>12, col:val, head:body!==rows?rows[0][val].t:''}; }
/* read one slide's link again; true when its values changed */
function syncLink(s){ if(!s.link||(s.layout!=='table'&&s.layout!=='chart')) return false; var g=linkGrid(s.link), was=linkMiss[s.id]||'';
  if(g.miss){ if(g.miss!=='eng') linkMiss[s.id]=g.miss; return was!==(linkMiss[s.id]||''); }
  delete linkMiss[s.id]; if(g.name) s.link.dn=g.name.slice(0,120); var d=gridData(g.rows,s.layout).data; if(d===s.data) return !!was; s.data=d; return true; }
/* every linked slide of the open deck; redraw: also redraw what changed (and save the new values) */
function syncLinks(redraw){ if(MODE||!deck) return false; var has=deck.slides.some(function(s){ return s.link; }); if(!has) return false;
  if(!window.FSE){ needEngine().then(function(){ syncLinks(true); },function(e){ console.warn(e); }); return false; }
  var chg=[]; deck.slides.forEach(function(s,i){ if(syncLink(s)) chg.push(i); }); if(!chg.length) return false;
  if(redraw){ saveSoon(); if(pr.on){ if(!pr.end&&chg.indexOf(pr.i)>=0) drawPresent0(); }
    else if(!$('editor').hidden&&deck.slides.length){ chg.forEach(function(i){ if(i===cur) drawMain(); updateThumb(i); }); if($('dataDlg').classList.contains('open')) dataLinkUI(); } }
  return true; }
window.addEventListener('storage',function(e){ if(!e.key||e.key===SHI_K||e.key.indexOf(SHD_K)===0) syncLinks(true); });
document.addEventListener('visibilitychange',function(){ if(!document.hidden) syncLinks(true); });
function linkMissText(k){ return T(k==='doc'?'연결한 시트 문서를 찾을 수 없어요':k==='sheet'?'연결한 시트(탭)를 찾을 수 없어요':'연결한 범위를 읽을 수 없어요')+' · '+T('마지막으로 가져온 값을 보여 줘요'); }
function linkBadge(s){ var b=document.createElement('button'), m=linkMiss[s.id]; b.className='lnkB'+(m?' miss':''); b.dataset.linkOpen='1'; b.setAttribute('data-notr','');
  b.textContent='🔗 '+T('시트 연결')+(m?' · '+T('시트를 찾을 수 없어요'):' · '+(s.link.dn||'')+' '+s.link.rg); b.title=m?linkMissText(m):T('Fry Sheet와 연결되어 있어요. 시트를 고치면 여기도 바뀌어요'); return b; }
/* the link part of the table / chart dialog */
function dataLinkUI(){ var s=deck.slides[cur]; if(!s) return; var l=s.link, m=l&&linkMiss[s.id];
  $('dataLinkTxt').textContent=l?'🔗 '+T('시트 연결')+': '+(l.dn||T('이름 없음'))+' › '+l.sh+' › '+l.rg:''; $('dataLinkTxt').hidden=!l;
  $('dataLinkMiss').textContent=m?linkMissText(m):''; $('dataLinkMiss').hidden=!m;
  $('dataLinkBtn').textContent=T(l?'연결 바꾸기':'프라이 시트에서 가져오기 (연결)'); $('dataRefresh').hidden=$('dataUnlink').hidden=!l;
  $('dataIn').readOnly=!!l; $('dataIn').classList.toggle('ro',!!l); if(l) $('dataIn').value=s.data; }
$('dataLinkBtn').onclick=function(){ openLink(); };
$('dataRefresh').onclick=function(){ var s=deck.slides[cur]; if(!s||!s.link) return; needEngine().then(function(){ var ch=syncLink(s); dataLinkUI(); if(ch){ saveSoon(); updateThumb(cur); drawMain(); } toast(linkMiss[s.id]?linkMissText(linkMiss[s.id]):T(ch?'시트에서 새로 가져왔어요':'바뀐 값이 없어요')); },function(){ toast(T('Fry Sheet 계산기를 불러오지 못했어요')); }); };
$('dataUnlink').onclick=function(){ unlinkSlide(); dataLinkUI(); };
function unlinkSlide(){ var s=deck.slides[cur]; if(!s||!s.link) return; blurEdit(); pushUndo(); s.link=null; delete linkMiss[s.id]; changed(); toast(T('연결을 끊었어요. 지금 값은 그대로 남아요')); }
function refreshSlideLink(){ var s=deck.slides[cur]; if(!s||!s.link) return; needEngine().then(function(){ var ch=syncLink(s); if(ch){ saveSoon(); changed(); } toast(linkMiss[s.id]?linkMissText(linkMiss[s.id]):T(ch?'시트에서 새로 가져왔어요':'바뀐 값이 없어요')); },function(){ toast(T('Fry Sheet 계산기를 불러오지 못했어요')); }); }
/* the picker: document, sheet, range (A1:C6), with a preview of the values that will be used */
var lk={rows:null};
function openLink(){ var s=deck.slides[cur]; if(!s||(s.layout!=='table'&&s.layout!=='chart')||gen||busyOn) return; blurEdit(); closeMenus();
  var L=sheetList(), sel=$('lkDoc'); sel.innerHTML=''; L.forEach(function(x){ var o=document.createElement('option'); o.value=x.id; o.textContent=x.name||T('이름 없음'); sel.appendChild(o); });
  $('lkNone').hidden=!!L.length; $('lkForm').hidden=!L.length; $('lkPrev').innerHTML=''; $('lkNote').textContent=''; $('lkOk').disabled=true; openDlg('linkDlg');
  if(!L.length) return;
  if(s.link&&L.some(function(x){ return x.id===s.link.doc; })) sel.value=s.link.doc;
  $('lkNote').textContent=T('불러오는 중…');
  needEngine().then(function(){ lkSheets(s.link&&s.link.doc===sel.value?s.link.sh:null); if(s.link&&s.link.doc===sel.value) $('lkRg').value=s.link.rg; lkShow(); },function(){ $('lkNote').textContent=T('Fry Sheet 계산기를 불러오지 못했어요'); }); }
function lkSheets(keep){ var c=sheetDoc($('lkDoc').value), ss=$('lkSh'); ss.innerHTML=''; if(!c) return; c.doc.sheets.forEach(function(x){ var o=document.createElement('option'); o.value=x.name; o.textContent=x.name; ss.appendChild(o); });
  ss.value=keep!=null&&sheetIx(c.doc,keep)>=0?keep:c.doc.sheets[c.doc.active>=0&&c.doc.active<c.doc.sheets.length?c.doc.active:0].name; lkAll(); }
function lkAll(){ var c=sheetDoc($('lkDoc').value), si=c?sheetIx(c.doc,$('lkSh').value):-1; $('lkRg').value=si>=0?usedRange(c.doc.sheets[si]):''; }
function lkLink(){ return fixLink({doc:$('lkDoc').value, sh:$('lkSh').value, rg:$('lkRg').value, dn:($('lkDoc').selectedOptions[0]||{}).textContent||''}); }
function lkShow(){ var s=deck.slides[cur], p=$('lkPrev'), note=$('lkNote'), l=lkLink(); p.innerHTML=''; $('lkOk').disabled=true; if(!s) return;
  if(!l){ note.textContent=$('lkRg').value.trim()?T('범위를 A1:C6처럼 써 주세요'):T('이 시트는 비어 있어요'); return; }
  var g=linkGrid(l); if(g.miss){ note.textContent=T(g.miss==='eng'?'Fry Sheet 계산기를 불러오지 못했어요':'범위를 A1:C6처럼 써 주세요'); return; }
  var G=FSE.parseRange(l.rg), t=document.createElement('table'), hr=document.createElement('tr'), d=gridData(g.rows,s.layout);
  hr.appendChild(document.createElement('th')); g.rows[0].forEach(function(c,i){ var h=document.createElement('th'); h.textContent=FSE.colName(G.c1+i); hr.appendChild(h); }); t.appendChild(hr);
  g.rows.slice(0,14).forEach(function(r,ri){ var tr=document.createElement('tr'), h=document.createElement('th'); h.textContent=G.r1+ri+1; tr.appendChild(h);
    r.forEach(function(c,ci){ var td=document.createElement('td'); td.textContent=c.t; if(typeof c.v==='number') td.className='n'; if(s.layout==='chart'&&d.col===ci) td.classList.add('use'); tr.appendChild(td); }); t.appendChild(tr); });
  if(g.rows.length>14){ var cut=document.createElement('tr'); cut.className='cut'; var td=document.createElement('td'); td.colSpan=g.rows[0].length+1; td.textContent=F('… 아래 {0}줄 더',g.rows.length-14); cut.appendChild(td); t.appendChild(cut); }
  p.appendChild(t);
  if(!d.n){ note.textContent=T(d.nonum?'숫자가 들어 있는 칸이 없어서 그래프는 만들 수 없어요':'고른 칸이 비어 있어요'); return; }
  var w=[]; if(s.layout==='table'){ w.push(F('표 {0}줄 × {1}칸으로 들어가요',d.n,d.w)); if(d.cutR) w.push(T('표는 9줄까지라 앞의 9줄만 담아요')); if(d.cutC) w.push(T('표는 6칸까지라 앞의 6칸만 담아요')); }
  else { w.push(F('그래프에 {0}개가 들어가요',d.n)+(d.head?' ('+d.head+')':'')); if(d.cutR) w.push(T('그래프는 12줄까지라 앞의 12줄만 담아요')); }
  if(g.cut) w.push(F('범위가 커서 {0}줄 × {1}칸까지만 읽어요',LINK_R,LINK_C));
  note.textContent=w.join(' · '); $('lkOk').disabled=false; }
$('lkDoc').onchange=function(){ lkSheets(null); lkShow(); }; $('lkSh').onchange=function(){ lkAll(); lkShow(); }; $('lkAllB').onclick=function(){ lkAll(); lkShow(); };
$('lkRg').addEventListener('input',lkShow);
$('lkRg').addEventListener('keydown',function(e){ e.stopPropagation(); if(e.key==='Escape') closeDlg('linkDlg',null); if(e.key==='Enter'){ e.preventDefault(); if(!$('lkOk').disabled) $('lkOk').click(); } });
$('lkOk').onclick=function(){ var s=deck.slides[cur], l=lkLink(); if(!s||!l) return; var g=linkGrid(l); if(g.miss) return; blurEdit(); pushUndo(); s.link=l; delete linkMiss[s.id]; s.data=gridData(g.rows,s.layout).data;
  closeDlg('linkDlg',null); if($('dataDlg').classList.contains('open')) closeDlg('dataDlg',null); changed(); toast(T('시트와 연결했어요. 시트에서 값을 바꾸면 여기도 바뀌어요')); };
/* live screen dialog */
/* LABX: only the fallback names of the first 9 experiments (old decks, and if the Lab page cannot be read); the real list comes from Lab itself (loadLabCat) */
var LABX=[['func','함수 그래프'],['prob','확률 실험'],['trig','단위원과 삼각함수'],['proj','포물선 운동'],['pend','진자'],['spring','용수철과 훅의 법칙'],['refr','빛의 굴절'],['wave','파동의 간섭'],['ohm','전기 회로와 옴의 법칙']], LIVE_MAX=1500000;
function bhProjects(){ try{ var o=JSON.parse(localStorage.getItem('ffblocks.projects')||'null'); return o&&Array.isArray(o.list)?o.list.filter(function(e){ return e&&e.id&&localStorage.getItem('ffblocks.p.'+e.id); }):[]; }catch(e){ return []; } }
/* builds the final HTML of a saved Fry Blocks project in a hidden same-origin Fry Blocks page (#embed=<id>: read only, nothing is saved there) */
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
  else { var id=$('liveBlk').value; if(!id){ msg.textContent=T('Fry Blocks에 저장된 프로젝트가 없어요'); return; } var nm=($('liveBlk').selectedOptions[0]||{}).textContent||'';
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
document.addEventListener('pointerdown',function(e){ if(!e.target.closest('.menu')&&!e.target.closest('.rb[data-menu]')) closeMenus(); },true);
$('deckBtn').onclick=function(){ blurEdit(); drawDeckList(); drawDeckMenu(); openMenu($('deckMenu'),this); };
$('themeBtn').onclick=function(){ blurEdit(); openMenu($('themeMenu'),this); themeCards($('themeList'),function(id){ setTheme(id); },.1); };
function when(t){ var d=new Date(t); return (d.getMonth()+1)+'/'+d.getDate()+' '+('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2); }
function drawDeckList(){ var l=$('deckList'); l.innerHTML='';
  store.decks.slice().sort(function(a,b){ return (b===deck)-(a===deck)||b.t-a.t; }).forEach(function(d){
    var b=document.createElement('button'); b.className='doc'+(d===deck?' on':''); b.setAttribute('data-notr','');
    b.innerHTML='<span></span><small></small>'; b.firstChild.textContent=(d===deck?'● ':'')+(d.name||T('이름 없음')); b.lastChild.textContent=F('{0}장',d.slides.length)+' · '+when(d.t);
    b.onclick=function(){ closeMenus(); if(d===deck||gen) return; saveNow(); openDeck(d); }; l.appendChild(b); }); }
function drawDeckMenu(){}
function newDeckAction(){ saveNow(); if(!deck.slides.length&&isDefaultName(deck.name)){ deck.topic=''; deck.aud=''; refresh(); } else openDeck(newDeck()); $('topic').focus(); }
function renameDeck(d){ ask(T('이름 바꾸기'),'',T('발표 자료 이름'),T('확인'),d.name).then(function(v){ if(!v) return; d.name=v; if(d===deck) $('deckName').value=v; saveNow(); drawMgr(); }); }
function deleteDeck(d){ { var wasOpen=d===deck, at=store.decks.indexOf(d); store.decks=store.decks.filter(function(x){ return x!==d; });
  if(wasOpen){ deck=null; var rest=store.decks.slice().sort(function(a,b){ return b.t-a.t; }); openDeck(rest.length?rest[0]:newDeck()); } else saveNow();
  drawMgr(); FFUndo.show('지웠어요',function(){ if(store.decks.indexOf(d)<0) store.decks.splice(Math.min(Math.max(at,0),store.decks.length),0,d); saveNow(); drawMgr(); }); } }
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
  var b=e.target.closest('[data-d]'); if(!b) return; closeMenus(); deckAct(b.dataset.d); });
/* the deck commands (the ribbon's File, Insert and Design tabs and the command search use them too) */
function deckAct(k){
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
}
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
/* the appear-effect box: effect, direction, time, delay and start mode of the picked items */
var animKs=[];
function animSync(){ var f=fxOf($('animEf').value), hasD=!!f[2]; $('animDir').disabled=!hasD; $('animT').placeholder=f[0]==='type'?T('글자 수에 맞춰요'):String(f[3]);
  $('animHint').textContent=T(f[0]==='type'?'글자가 하나씩 나타나요. 글이 없는 것은 닦아내기로 나타나요.':hasD?'':'이 효과는 방향이 없어요'); }
function openAnim(){ var s=deck.slides[cur]; if(!s||!selK||gen||busyOn) return; blurEdit(); animKs=selKeys(s); if(!animKs.length) return;
  var i=buildIx(s,animKs[0]), b=i>=0?s.build[i]:{a:'fade'}, ef=$('animEf');
  if(!ef.options.length) FX.forEach(function(f){ var o=document.createElement('option'); o.value=f[0]; o.textContent=T(f[1]); ef.appendChild(o); });
  ef.value=b.a; $('animDir').value=b.d||fxOf(b.a)[4]||'b'; $('animT').value=b.t||''; $('animW').value=b.w||''; $('animM').value=b.m||'c'; animSync(); openDlg('animDlg'); }
function animRead(){ var a=$('animEf').value, f=fxOf(a), t=parseFloat($('animT').value), w=parseFloat($('animW').value); return {a:a, d:f[2]?$('animDir').value:'', t:t>0?Math.round(Math.min(20,Math.max(.1,t))*10)/10:0, w:w>0?Math.round(Math.min(20,w)*10)/10:0, m:$('animM').value}; }
$('animEf').addEventListener('change',function(){ var f=fxOf($('animEf').value); if(f[2]&&f[4]) $('animDir').value=f[4]; animSync(); });
$('animPv').onclick=function(){ var s=deck.slides[cur], node=s&&animKs[0]&&host.querySelector('[data-bk="'+animKs[0]+'"]'); if(!node) return; var o=animRead(); o.d=o.d||'b'; o.t=o.t||null; var r=fxPlay(node,0,{a:o.a,d:o.d,t:o.t,w:o.w});
  if(o.a==='type') setTimeout(function(){ if(!$('present').classList.contains('on')) drawMain(); },r.end+150); };
['animT','animW'].forEach(function(id){ $(id).addEventListener('keydown',function(e){ e.stopPropagation(); if(e.key==='Enter'){ e.preventDefault(); $('animOk').click(); } if(e.key==='Escape') closeDlg('animDlg',null); }); });
$('animOk').onclick=function(){ var s=deck.slides[cur]; if(!s) return closeDlg('animDlg',null); var o=animRead(); pushUndo();
  animKs.forEach(function(k){ var j=buildIx(s,k), b=j>=0?s.build[j]:null; if(!b){ b={k:k, a:o.a}; s.build.push(b); } b.a=o.a;
    if(o.d) b.d=o.d; else delete b.d; if(o.t) b.t=o.t; else delete b.t; if(o.w) b.w=o.w; else delete b.w; if(o.m!=='c') b.m=o.m; else delete b.m; });
  closeDlg('animDlg',null); changed(); };
function openAuto(){ if(!deck.slides.length||gen||busyOn) return; blurEdit(); closeMenus(); var a=deck.auto, s=deck.slides[cur]; $('auOn').checked=a.on; $('auSec').value=a.sec; $('auLoop').checked=a.loop; $('auBld').checked=a.bld; $('auBldOne').value=String(s.bld||0); $('auBn').textContent=F('{0}번 슬라이드의',cur+1); $('auOne').value=s.sec>0?s.sec:s.sec<0?0:'';
  $('auNo').textContent=F('{0}번 슬라이드만 다르게',cur+1); openDlg('auDlg'); setTimeout(function(){ $('auSec').focus(); },60); }
$('auOk').onclick=function(){ var s=deck.slides[cur]; pushUndo(); deck.auto={on:$('auOn').checked, sec:num($('auSec').value,10,1,600), loop:$('auLoop').checked, bld:$('auBld').checked}; s.bld=+$('auBldOne').value||0;
  var v=$('auOne').value.trim(); if(s) s.sec=v===''?0:+v===0?-1:num(v,0,1,3600); closeDlg('auDlg',null); saveSoon(); drawList(); toast(T(deck.auto.on?'발표할 때 저절로 넘어가요':'자동 넘기기를 껐어요')); };
['auSec','auOne'].forEach(function(id){ $(id).addEventListener('keydown',function(e){ e.stopPropagation(); if(e.key==='Enter'){ e.preventDefault(); $('auOk').click(); } if(e.key==='Escape') closeDlg('auDlg',null); }); });
/* ---------- pictures from the device (shrunk to 1600 px, kept inside the deck and the .pptx) ---------- */
function readImg(file){ return new Promise(function(res,rej){ if(!file||!/^image\//.test(file.type)) return rej(new Error('type'));
  var fr=new FileReader(); fr.onerror=rej; fr.onload=function(){ var im=new Image(); im.onerror=rej; im.onload=function(){
    var k=Math.min(1,1600/Math.max(im.naturalWidth,im.naturalHeight)), w=Math.max(1,Math.round(im.naturalWidth*k)), h=Math.max(1,Math.round(im.naturalHeight*k)), c=document.createElement('canvas'); c.width=w; c.height=h;
    var x=c.getContext('2d'); if(!file.ffObj){ x.fillStyle='#fff'; x.fillRect(0,0,w,h); } x.drawImage(im,0,0,w,h); var d; try{ d=c.toDataURL(file.ffObj?'image/png':'image/jpeg',.82); }catch(e){ return rej(e); } res({d:d,w:w,h:h}); };
    im.src=fr.result; }; fr.readAsDataURL(file); }); }
function blankSlide(s){ return !s.els.length&&LISTS.concat(TEXTS).every(function(f){ return f==='ctype'||f==='bg'||empty(s,f); }); }
/* a picture goes into the picture box of an empty slide or an empty picture slide; on any other slide it is a free picture that can be moved, resized, cropped and turned like a shape */
function addPicEl(s,r,at){ var k=Math.min(600/r.w,420/r.h), w=Math.max(40,Math.round(r.w*k)), h=Math.max(40,Math.round(r.h*k)), n=s.els.length%6*24;
  var e=fixEl({id:uid(), k:'pic', src:r.d, iw:r.w, ih:r.h, x:Math.round((W-w)/2)+n, y:Math.round((H-h)/2)+n, w:w, h:h}); if(!e) return null; s.els.push(e); selK='e:'+e.id; return e; }
function putPictures(files){ files=[].slice.call(files||[]).filter(function(f){ return /^image\//.test(f.type); }); if(!files.length||gen||busyOn||!deck.slides.length) return;
  var n=0, p=Promise.resolve();
  files.forEach(function(f,fi){ p=p.then(function(){ return readImg(f); }).then(function(r){ blurEdit(); pushUndo(); var s=deck.slides[cur];
    if(s&&fi===0&&((s.layout==='image'&&!s.img)||(s.layout!=='image'&&blankSlide(s)))){ s.layout='image'; s.img=r.d; s.iw=r.w; s.ih=r.h; }
    else if(!addPicEl(s,r)) throw new Error('pic');
    n++; changed(true); }); });
  p.then(function(){ toast(T('그림을 넣었어요')); },function(){ if(n) changed(true); toast(T('그림을 읽지 못했어요')); }); }
function pickImage(rep){ var i=document.createElement('input'); i.type='file'; i.accept='image/*'; i.multiple=!rep; i.onchange=function(){ if(rep&&rep.k==='pic'){ var id=rep.id; readImg(i.files[0]).then(function(r){ var x=deck.slides[cur], t=x&&shapeOf(x,id); if(!t) return; pushUndo(); t.src=r.d; t.iw=r.w; t.ih=r.h; changed(); },function(){ toast(T('그림을 읽지 못했어요')); }); } else putPictures(i.files); }; i.click(); }
$('picBtn').onclick=function(){ pickImage(); };
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
function exportMD(){ if(!deck.slides.length) return toast(T('먼저 슬라이드를 만들어 주세요')); blurEdit(); syncLinks(true); download(new Blob([toMD()],{type:'text/markdown;charset=utf-8'}),fileName(deck.name)+'.md'); toast(T('Markdown 파일을 받았어요')); }

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
var KEYS=[['Ctrl+Z / Ctrl+Shift+Z','되돌리기 · 다시 하기'],['↑ ↓ ← →','슬라이드 이동'],['Ctrl+D','슬라이드 복제'],['Ctrl+Enter','새 슬라이드 넣기'],['Ctrl+C · Ctrl+V','고른 도형 복사 · 붙여넣기'],['Ctrl+Alt+C · Ctrl+Alt+V','서식 복사 · 붙여넣기 (색·테두리·글 정렬 등, 버튼을 두 번 누르면 Esc까지 계속)'],['Ctrl+G · Ctrl+Shift+G','고른 도형 묶기 · 풀기'],['Ctrl+] · Ctrl+[','도형을 한 칸 앞으로 · 뒤로 (Shift: 맨 앞 · 맨 뒤)'],['Ctrl+A','도형 모두 고르기'],['Shift + Click · Drag','여러 도형 고르기 (Shift+누르기 · 빈 곳 끌기)'],['Alt+↑ Alt+↓','슬라이드 순서 바꾸기'],['H','발표할 때 건너뛰기 켜고 끄기'],['Delete','슬라이드 지우기'],['Home End','첫·마지막 슬라이드'],['Ctrl+Alt+N','새 슬라이드 쇼 만들기'],['F5','처음부터 발표'],['Shift+F5','지금 슬라이드부터 발표'],['?','이 단축키 목록'],['Ctrl+K','기능 찾기'],['← ↑ → ↓','(고른 상자) 조금씩 옮기기 · Shift는 크게'],['Delete','(고른 도형·그림) 지우기'],['Shift + 끌기','(도형) 비율 지키기 · 선은 45도씩'],
  ['→ Space Enter','(발표) 다음'],['← Backspace','(발표) 이전'],['Home End','(발표) 처음 · 끝'],['S','(발표) 발표자 메모 보기'],['V','(발표) 발표자 화면 새 창으로 열기'],['L','(발표) 레이저 포인터'],['D · M · E','(발표) 펜 · 형광펜 · 낙서 지우기'],['X','(발표) 지우개 (닿은 줄을 지워요)'],['W','(발표) 칠판 켜고 끄기'],['K','(발표) 자동 넘기기 멈춤 · 이어가기'],['B','(발표) 화면 끄기'],['숫자 + Enter','(발표) 그 번호 슬라이드로'],['A','(발표) 퀴즈 정답 보기'],['Q','(발표) 실시간 퀴즈 열기 · 숨기기'],['T','(발표) 타이머 멈춤·다시'],['Esc','(발표) 나가기']];
function showKeys(){ var b=$('keysBody'); b.innerHTML=''; KEYS.forEach(function(k){ var r=document.createElement('div'); r.className='kr'; var a=document.createElement('kbd'); a.textContent=k[0]; var t=document.createElement('span'); t.textContent=T(k[1]); r.appendChild(a); r.appendChild(t); b.appendChild(r); }); openDlg('keysDlg'); }

/* ---------- presenting ---------- */
var pr={on:false, i:0, step:0, nb:0, busy:0, end:false, fs:false, notes:false, laser:false, black:false, t0:0, tm:null, cd:null, shown:-1, rev:-1, go:'', goT:null, au:{dur:0, left:0, last:0, paused:false, tm:null}, bb:false};
function beep(){ try{ var C=window.AudioContext||window.webkitAudioContext, c=new C(), o=c.createOscillator(), g=c.createGain(); o.connect(g); g.connect(c.destination); g.gain.value=.15; o.frequency.value=880; o.start(); o.stop(c.currentTime+.5); setTimeout(function(){ c.close(); },900); }catch(e){} }
function cdPaint(){ if(!pr.cd) return; var f=$('pStage').querySelector('.fld[data-f="stat"] .in'); if(f){ f.textContent=fmtTime(pr.cd.left); f.style.color=pr.cd.left===0?'#ff5a5a':''; } }
function tick(){ var t=Math.floor((Date.now()-pr.t0)/1000), m=Math.floor(t/60); $('pClock').textContent='⏱ '+(m<10?'0':'')+m+':'+('0'+(t%60)).slice(-2);
  if(pr.on&&pr.cd&&pr.cd.run&&pr.cd.left>0){ pr.cd.left--; cdPaint(); if(pr.cd.left===0){ beep(); toast(T('시간이 다 됐어요')); } } }
function vis(i){ var s=deck.slides[i]; return !!s&&!s.hide; }
function nextVis(i,d){ for(var j=i+d;j>=0&&j<deck.slides.length;j+=d) if(vis(j)) return j; return -1; }
function present(from){
  blurEdit(); closeMenus(); if(!deck.slides.length) return;
  if(!deck.slides.some(function(s){ return !s.hide; })) return toast(T('모든 슬라이드를 숨겨서 발표할 수 없어요'));
  if(syncLinks(false)) saveSoon();
  from=Math.max(0,Math.min(from||0,deck.slides.length-1)); if(!vis(from)){ var j=nextVis(from,1); from=j>=0?j:nextVis(from,-1); }
  pr.on=true; pr.i=from; pr.step=0; pr.end=false; pr.black=false; pr.cd=null; pr.shown=-1; pr.rev=-1; pr.go=''; inkKey=-1; setInk(''); setBoard(false); inkClear(); pr.au.paused=false; pr.au.dur=0; clearInterval(pr.au.tm); pr.au.tm=setInterval(auTick,100); pr.t0=Date.now(); clearInterval(pr.tm); pr.tm=setInterval(tick,1000); tick(); pvDeck();
  var el=$('present'); el.classList.add('on'); setLaser(false); drawPresent(); armAuto();
  try{ var fn=el.requestFullscreen||el.webkitRequestFullscreen; if(fn){ var p=fn.call(el); pr.fs=true; if(p&&p.catch) p.catch(function(){ pr.fs=false; }); } }catch(e){ pr.fs=false; }
}
function drawPresent(){ drawPresent0(); pvState(); lqSync(); }
function drawPresent0(){
  var ik=pr.end?-2:pr.i; if(inkKey!==ik){ inkKey=ik; inkClear(); setBoard(false); }
  var st=$('pStage'), n=deck.slides.length; st.innerHTML=''; $('pEnd').hidden=!pr.end; st.hidden=pr.end; st.style.visibility=pr.black?'hidden':'';
  $('pNum').textContent=pr.end?n+' / '+n:(pr.i+1)+' / '+n; $('pProg').firstChild.style.width=(pr.end?100:Math.round((pr.i+1)/n*100))+'%';
  var sl=pr.end?null:deck.slides[pr.i], nt=$('pNotes'); nt.textContent=sl?sl.notes||'':''; nt.hidden=!(pr.notes&&sl&&sl.notes&&sl.notes.trim()); $('pNotesB').classList.toggle('on',pr.notes);
  if(pr.end) return; var t=th(), moved=pr.shown!==pr.i;
  if(moved) mediaStop();
  if(moved){ var tm=sl.layout==='timer'?parseTime(sl.stat):null; pr.cd=tm==null?null:{left:tm,total:tm,run:true}; }
  var opt={hideAns:sl.layout==='quiz'&&pr.rev!==pr.i}; if(pr.cd&&sl.layout==='timer') opt.over={stat:fmtTime(pr.cd.left)};
  opt.live=1; opt.hint=1; opt.step=pr.step; var el=slideEl(sl,t,false,opt); st.appendChild(el); fitAll(el,sl,t); scalePresent(); inkFit(); cdPaint();
  pr.nb=+el.dataset.nb||0; pr.step=Math.min(pr.step,pr.nb); pr.busy=0;
  if(moved&&pr.step===0&&pr.nb>0&&!pr.black&&bmAt(0)!=='c') playGroup(trOf(sl)==='none'?0:450); /* self-starting effects wait for the slide change */
  var tr=trOf(sl); if(moved&&tr!=='none'){ st.className='tf-'+tr; void st.offsetWidth; } else st.className='';
  pr.shown=pr.i;
}
function setLaser(on){ if(on&&ink.tool) setInk(''); pr.laser=on; $('present').classList.toggle('laser',on); $('pLaserB').classList.toggle('on',on); if(!on) $('pDot').hidden=true; }
function setNotesView(on){ pr.notes=on; drawPresent(); }
function setBlack(on){ pr.black=on; drawPresent(); }
function scalePresent(){ var st=$('pStage'), k=Math.min(innerWidth/W,innerHeight/H); st.style.width=W*k+'px'; st.style.height=H*k+'px'; var el=st.firstChild; if(el) el.style.transform='scale('+k+')'; }
/* builds: the next press shows the next element (or hides the last one going back) without redrawing the slide */
function buildShow(i,on){ var e=$('pStage').querySelector('[data-bi="'+i+'"]'); if(!e) return; fxStop(e);
  if(on){ e.classList.remove('bh'); fxPlay(e,0); } else e.classList.add('bh'); }
function fxStop(e){ try{ e.getAnimations({subtree:true}).forEach(function(a){ a.cancel(); }); }catch(x){} }
/* the frames of one effect; dir = where it comes from (l r t b) */
function fxFrames(a,dir){ var X=dir==='l'?-1:dir==='r'?1:0, Y=dir==='t'?-1:dir==='b'?1:0, hz=!!X, K=hz?620:380, tx=function(k){ return (X*k)+'px '+(Y*k)+'px'; }, z='0px 0px', o,
    org=dir==='l'?'left center':dir==='r'?'right center':dir==='t'?'center top':'center bottom', glow='drop-shadow(0 0 0 rgba(255,214,64,0))';
  if(a==='fade') return {f:[{opacity:0,translate:'0px 36px'},{opacity:1,translate:z}], e:'cubic-bezier(.2,.7,.3,1)'};
  if(a==='fly') return {f:[{opacity:0,translate:tx(K)},{opacity:1,translate:z}], e:'cubic-bezier(.16,.84,.3,1)'};
  if(a==='zoom') return {f:[{opacity:0,scale:'.05'},{opacity:1,scale:'1'}], e:'cubic-bezier(.2,1.25,.4,1)'};
  if(a==='shrink') return {f:[{opacity:0,scale:'3.4'},{opacity:1,scale:'1'}], e:'cubic-bezier(.2,.8,.3,1)'};
  if(a==='spin') return {f:[{opacity:0,rotate:'-540deg',scale:'.1'},{opacity:1,rotate:'0deg',scale:'1'}], e:'cubic-bezier(.2,.75,.25,1)'};
  if(a==='bounce') return {f:[{opacity:0,translate:tx(K),easing:'cubic-bezier(.55,0,.9,.6)'},{offset:.4,opacity:1,translate:z,easing:'ease-out'},{offset:.58,translate:tx(-110),easing:'ease-in'},{offset:.74,translate:z,easing:'ease-out'},{offset:.86,translate:tx(-38),easing:'ease-in'},{translate:z}], e:'linear'};
  if(a==='shake') return {f:[{opacity:0,translate:'-90px 0px',rotate:'-14deg'},{offset:.18,opacity:1,translate:'70px 0px',rotate:'9deg'},{offset:.38,translate:'-52px 0px',rotate:'-7deg'},{offset:.58,translate:'34px 0px',rotate:'4deg'},{offset:.78,translate:'-16px 0px',rotate:'-2deg'},{opacity:1,translate:z,rotate:'0deg'}], e:'ease-out'};
  if(a==='wipe'){ var m=60, from=X<0?'inset(-'+m+'px 100% -'+m+'px -'+m+'px)':X>0?'inset(-'+m+'px -'+m+'px -'+m+'px 100%)':Y<0?'inset(-'+m+'px -'+m+'px 100% -'+m+'px)':'inset(100% -'+m+'px -'+m+'px -'+m+'px)'; return {f:[{opacity:1,clipPath:from},{opacity:1,clipPath:'inset(-'+m+'px -'+m+'px -'+m+'px -'+m+'px)'}], e:'cubic-bezier(.4,0,.2,1)'}; }
  if(a==='blur') return {f:[{opacity:0,filter:'blur(34px)',scale:'1.18'},{opacity:1,filter:'blur(0px)',scale:'1'}], e:'ease-out'};
  if(a==='flip'){ var f0=hz?'-1 1':'1 -1'; return {f:[{opacity:0,scale:f0},{offset:.5,opacity:1},{opacity:1,scale:'1 1'}], e:'cubic-bezier(.3,0,.2,1)'}; }
  if(a==='unfold') return {f:[{opacity:0,scale:hz?'0 1':'1 0',transformOrigin:org},{offset:.15,opacity:1},{opacity:1,scale:'1 1',transformOrigin:org}], e:'cubic-bezier(.25,1.2,.4,1)'};
  if(a==='pulse') return {f:[{opacity:0,scale:'.2',filter:'brightness(2.2) '+glow},{offset:.45,opacity:1,scale:'1.4',filter:'brightness(1.5) drop-shadow(0 0 44px rgba(255,214,64,.95))'},{offset:.72,scale:'.92',filter:'brightness(1.2) drop-shadow(0 0 20px rgba(255,214,64,.6))'},{opacity:1,scale:'1',filter:'brightness(1) '+glow}], e:'ease-in-out'};
  if(a==='drop') return {f:[{opacity:0,translate:'0px -620px',scale:'1 1',easing:'cubic-bezier(.55,0,.95,.55)'},{offset:.62,opacity:1,translate:z,scale:'1 1'},{offset:.76,scale:'1.1 .82',translate:z},{offset:.9,scale:'.97 1.05'},{scale:'1 1',translate:z}], e:'ease-out'};
  return {f:[{opacity:0},{opacity:1}], e:'ease-out'}; }
/* plays one appear effect on element e after startMs; returns when it ends (ms from now). Settings come from the element unless o says otherwise */
function fxPlay(e,startMs,o){ o=o||{}; var a=o.a||e.dataset.ba||'fade', def=fxOf(a), dir=o.d||e.dataset.bdr||def[4]||'b', dt=o.t!=null?o.t:+e.dataset.bt, dw=o.w!=null?o.w:+e.dataset.bw, dur, delay=Math.round((startMs||0)+(dw||0)*1000);
  if(!window.Element||!e.animate) return {end:delay};
  fxStop(e);
  if(a==='type'){ var sp=e._ty; if(!sp||!sp.length||!e.contains(sp[0])){ sp=[]; var wk=document.createTreeWalker(e,NodeFilter.SHOW_TEXT,null), nodes=[], n0; while((n0=wk.nextNode())) if(n0.nodeValue&&!(n0.parentNode.closest&&n0.parentNode.closest('.bn'))&&n0.nodeValue.trim()) nodes.push(n0);
      nodes.forEach(function(nd){ var f=document.createDocumentFragment(); Array.from(nd.nodeValue).forEach(function(ch){ var c=document.createElement('span'); c.textContent=ch; f.appendChild(c); if(ch.trim()) sp.push(c); }); nd.parentNode.replaceChild(f,nd); }); e._ty=sp; }
    if(sp.length){ var n=sp.length; dur=Math.round((dt>0?dt:Math.min(4,Math.max(1.2,n*.06)))*1000); var per=Math.min(dur,Math.max(160,Math.round(dur*.22))), gap=n>1?(dur-per)/(n-1):0;
      sp.forEach(function(c,i){ c.animate([{opacity:0,translate:'0px .35em'},{opacity:1,translate:'0px 0px'}],{duration:per,delay:Math.round(delay+i*gap),fill:'backwards',easing:'ease-out'}); });
      return {end:delay+dur}; }
    a='wipe'; dir='l'; }
  dur=Math.round((dt>0?dt:def[3]||.9)*1000); var q=fxFrames(a,dir); e.animate(q.f,{duration:dur,delay:delay,easing:q.e,fill:'backwards'}); return {end:delay+dur}; }
/* one press: the item and the ones that follow it with 'with previous' / 'after previous' (self-starting) */
function playGroup(base){ var prevS=0, prevE=0, first=true, maxE=0;
  while(pr.step<pr.nb){ var e=$('pStage').querySelector('[data-bi="'+pr.step+'"]'); if(!e){ pr.step++; continue; } var m=e.dataset.bm||'c'; if(!first&&m==='c') break;
    e.classList.remove('bh'); var st=first||m==='c'?(base||0):m==='w'?prevS:prevE, r=fxPlay(e,st); prevS=st; prevE=r.end; maxE=Math.max(maxE,r.end); first=false; pr.step++; }
  pr.busy=Date.now()+maxE; }
function bmAt(i){ var e=$('pStage').querySelector('[data-bi="'+i+'"]'); return e&&e.dataset.bm||'c'; }
function pNext0(){ if(pr.end) return exitPresent(); var cs=deck.slides[pr.i];
  if(!pr.black&&pr.step<pr.nb){ playGroup(0); pvState(); return; }
  if(cs&&cs.layout==='quiz'&&pr.rev!==pr.i&&cs.caption.trim()){ pr.rev=pr.i; drawPresent(); return; }
  var j=nextVis(pr.i,1); if(j>=0){ pr.i=j; pr.step=0; } else pr.end=true; drawPresent(); }
function pPrev0(){ if(!pr.end&&!pr.black&&pr.step>0){ do{ pr.step--; buildShow(pr.step,false); }while(pr.step>0&&bmAt(pr.step)!=='c'); pr.busy=0; pvState(); return; }
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
  var quiz=s.layout==='quiz'&&pr.rev!==pr.i&&s.caption.trim()?1:0; var nc=0; [].forEach.call($('pStage').querySelectorAll('[data-bi]'),function(x){ if((x.dataset.bm||'c')==='c') nc++; }); /* the self-starting ones need no share of the time */
  u.dur=u.left=Math.round(sec*1000/(nc+quiz+1)); u.last=Date.now(); auPaint(); }
function auTick(){ var u=pr.au; if(!pr.on) return; var now=Date.now(), dt=Math.min(now-u.last,500); u.last=now; if(u.dur<=0||u.paused||ink.tool||pr.black||pr.end||document.hidden||Date.now()<pr.busy) return auPaint();
  u.left-=dt; if(u.left<=0){ var s=deck.slides[pr.i], last=s&&pr.step>=pr.nb&&nextVis(pr.i,1)<0&&!(s.layout==='quiz'&&pr.rev!==pr.i&&s.caption.trim()); if(last&&deck.auto.loop) pHome(); else pNext(); return; } auPaint(); }
function auPaint(){ var u=pr.au, b=$('pAutoB'), on=deck.auto.on&&pr.on; b.hidden=!on; $('pAuto').hidden=!on||u.dur<=0; $('pAuto').firstChild.style.width=u.dur>0?Math.round((1-u.left/u.dur)*1000)/10+'%':'0';
  $('pAuto').classList.toggle('paused',u.paused||!!ink.tool||pr.black); b.classList.toggle('on',u.paused); b.textContent=u.paused?'▶':'⏸'; b.title=T(u.paused?'자동 넘기기 이어가기 (K)':'자동 넘기기 멈추기 (K)')+(u.dur>0&&!u.paused?' · '+F('{0}초 남음',Math.ceil(u.left/1000)):''); }
function auToggle(){ if(!deck.auto.on) return toast(T('자동 넘기기가 꺼져 있어요 (메뉴 > 자동 넘기기)')); var u=pr.au; u.paused=!u.paused; u.last=Date.now(); auPaint(); toast(T(u.paused?'자동 넘기기를 멈췄어요':'자동 넘기기를 이어가요')); }
function exitPresent(){ if(!pr.on) return; lqStop(); mediaStop(); recStop(); pr.on=false; pvPost({type:'exit'}); setInk(''); setBoard(false); inkClear(); clearInterval(pr.au.tm); pr.au.dur=0; clearInterval(pr.tm); clearTimeout(pr.goT); pr.go=''; setLaser(false); $('present').classList.remove('on');
  try{ var fe=document.fullscreenElement||document.webkitFullscreenElement; if(fe){ (document.exitFullscreen||document.webkitExitFullscreen).call(document); } }catch(e){}
  if(!pr.end) select(pr.i); }
['fullscreenchange','webkitfullscreenchange'].forEach(function(ev){ document.addEventListener(ev,function(){ if(pr.on&&pr.fs&&!(document.fullscreenElement||document.webkitFullscreenElement)) exitPresent(); }); });
window.addEventListener('resize',function(){ if(pr.on){ scalePresent(); inkFit(); } });
var pd=null;
$('present').addEventListener('pointerdown',function(e){ if(e.target.closest('.pbar,#lq,#qaCap,.pmedia,[data-url]')||e.target.id==='pInk') return; pd={x:e.clientX,y:e.clientY}; });
$('present').addEventListener('pointermove',function(e){ if(!pr.laser||(e.pointerType==='touch'&&!pd)) return; var d=$('pDot'); d.hidden=false; d.style.left=e.clientX+'px'; d.style.top=e.clientY+'px'; });
$('present').addEventListener('pointerleave',function(e){ if(e.pointerType!=='touch') $('pDot').hidden=true; });
$('present').addEventListener('pointerup',function(e){ if(e.pointerType==='touch') $('pDot').hidden=true; if(!pd||e.target.closest('.pbar,#lq,#qaCap,.pmedia,[data-url]')){ pd=null; return; } var dx=e.clientX-pd.x, dy=e.clientY-pd.y; pd=null;
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

/* ---------- live audience quiz: while presenting a quiz slide, phones join with a code / QR (join.html#CODE), see the choices, tap an answer;
   this screen shows the answers as a live bar chart, then reveals the right one. Up to 40 people, names only, nothing is stored anywhere:
   the message layer is lq-net.js (PeerJS data channels by default; the PeerJS cloud server only introduces the two sides).
   Each quiz slide's choices: s.choices (or lines like "1) ..." / "① ..." in the question, or O / X when the answer is O or X), the right one: s.qok or the answer text. ---------- */
var QLINE=/^\s*(?:\(?([1-9]|[A-Fa-f])[.):\]]|([①-⑨]))\s*(\S.*)$/, CIRC='①②③④⑤⑥⑦⑧⑨';
function quizParse(s){ var ch=[], rest=[]; String(s.quote||'').split('\n').forEach(function(l){ var m=QLINE.exec(l); if(m) ch.push(m[3].trim()); else rest.push(l); }); return {ch:ch, rest:rest.join('\n').trim()}; }
function quizChoices(s){ if(s.choices.length>=2) return s.choices.slice(0,6); var q=quizParse(s); if(q.ch.length>=2) return q.ch.slice(0,6);
  return /^(O|X|○|×|⭕|❌)$/i.test(s.caption.trim())?['O','X']:[]; }
function qNorm(t){ return String(t||'').toLowerCase().replace(/^\s*(?:\(?([1-9]|[a-f])[.):\]]|[①-⑨])\s*/,'').replace(/[○⭕]/g,'o').replace(/[×❌✕]/g,'x').replace(/[\s.,!?'"“”()]/g,''); }
function quizOk(s,ch){ if(s.qok>=0&&s.qok<ch.length) return s.qok; var a=s.caption.trim(), n=qNorm(a), i, m; if(!a||!ch.length) return -1;
  for(i=0;i<ch.length;i++) if(qNorm(ch[i])===n) return i;
  if((m=/^\(?([1-9])\)?\s*번?\s*(?:[.):]|$|\s)/.exec(a))&&+m[1]<=ch.length) return +m[1]-1;
  if((i=CIRC.indexOf(a[0]))>=0&&i<ch.length) return i;
  if((m=/^([A-Fa-f])(?:[.):]|$|\s)/.exec(a))&&m[1].toUpperCase().charCodeAt(0)-65<ch.length) return m[1].toUpperCase().charCodeAt(0)-65;
  var hit=ch.map(function(c,j){ return qNorm(c).length>1&&n.indexOf(qNorm(c))>=0?j:-1; }).filter(function(j){ return j>=0; }); return hit.length===1?hit[0]:-1; }
function quizText(s){ return s.choices.length>=2?String(s.quote||'').trim():quizParse(s).rest||String(s.quote||'').trim(); }
/* choices dialog (slide options) */
function openChoices(){ var s=deck.slides[cur]; if(!s||s.layout!=='quiz'||gen||busyOn) return; blurEdit(); closeMenus(); $('qzIn').value=quizChoices(s).join('\n'); qzOkSel(s.qok>=0?s.qok:quizOk(s,quizChoices(s))); openDlg('qzDlg'); setTimeout(function(){ $('qzIn').focus(); },60); }
function qzLines(){ return $('qzIn').value.split('\n').map(function(x){ return x.replace(/\s+/g,' ').trim(); }).filter(Boolean).slice(0,6); }
function qzOkSel(v){ var L=qzLines(), sel=$('qzOkSel'), o=document.createElement('option'); sel.innerHTML=''; o.value='-1'; o.textContent=T('정답 글로 알아서 찾기'); sel.appendChild(o);
  L.forEach(function(c,i){ var x=document.createElement('option'); x.value=String(i); x.textContent=CIRC[i]+' '+c; sel.appendChild(x); }); sel.value=String(v!=null&&v<L.length?v:-1); if(sel.selectedIndex<0) sel.value='-1'; }
$('qzIn').addEventListener('input',function(){ qzOkSel(+$('qzOkSel').value); });
$('qzIn').addEventListener('keydown',function(e){ e.stopPropagation(); if(e.key==='Escape') closeDlg('qzDlg',null); });
$('qzOk').onclick=function(){ var s=deck.slides[cur]; if(!s) return closeDlg('qzDlg',null); var L=qzLines(); if(L.length===1) return toast(T('보기는 두 개 이상 써 주세요')); pushUndo(); s.choices=L; s.qok=L.length?num($('qzOkSel').value,-1,-1,L.length-1):-1; closeDlg('qzDlg',null); changed(); toast(T(L.length?'보기를 저장했어요':'보기를 지웠어요')); };
/* the session (presenter side) */
var lq={on:false, code:'', h:null, st:'off', err:'', ppl:{}, ans:{}, q:null, key:'', show:true, qr:true, tries:0, ping:null, rx:true, rxN:{}, qa:true, qaL:[], qaN:0, qaC:{}, qaCap:0, qaSig:null};
function lqUrl(){ return location.href.split('#')[0].replace(/[?].*$/,'').replace(/[^\/]*$/,'')+'join.html#'+lq.code; }
function lqOnline(){ var now=Date.now(); return Object.keys(lq.ppl).filter(function(p){ var x=lq.ppl[p]; return x.on&&now-x.last<16000; }); }
function lqCur(){ if(!pr.on||pr.end) return null; var s=deck.slides[pr.i]; if(!s||s.layout!=='quiz') return null; var ch=quizChoices(s), n=0;
  deck.slides.forEach(function(x,i){ if(i<=pr.i&&!x.hide&&x.layout==='quiz') n++; });
  if(ch.length<2) return {id:s.id, none:true, n:n}; return {id:s.id, n:n, text:quizText(s), ch:ch, ok:quizOk(s,ch), rev:pr.rev===pr.i}; }
function lqCounts(q){ var c=q.ch.map(function(){ return 0; }), a=lq.ans[q.id]||{}; Object.keys(a).forEach(function(p){ if(a[p]>=0&&a[p]<c.length) c[a[p]]++; }); return c; }
function lqMsg(pid){ var q=lq.q; if(!q||q.none) return {t:'wait'}; var a=lq.ans[q.id]||{}, m={t:'q', q:q.id, n:q.n, text:q.text, ch:q.ch, my:a[pid]!=null?a[pid]:null, rev:q.rev};
  if(q.rev){ m.ok=q.ok; m.cnt=lqCounts(q); } return m; }
function lqPush(){ Object.keys(lq.ppl).forEach(function(p){ var x=lq.ppl[p]; if(x.on) x.c.send(lqMsg(p)); }); }
/* called after every move while presenting: a new question (or the answer shown) goes to the phones */
function lqSync(){ if(!lq.on){ lqDraw(); return; } var q=lqCur(), key=q?q.id+'|'+(q.none?'n':q.ch.join('\u0001')+'|'+q.rev):'-'; lq.q=q; if(key!==lq.key){ lq.key=key; lqPush(); } lqDraw(); }
function lqConn(c){ c.on.data=function(m){ if(!m||typeof m!=='object') return; var p=c.pid, x=p&&lq.ppl[p]; if(x&&x.c===c) x.last=Date.now();
    if(m.t==='join'){ var pid=String(m.pid||'').slice(0,40), nm=String(m.name||'').replace(/\s+/g,' ').trim().slice(0,20)||T('이름 없음'); if(!pid) return;
      if(!lq.ppl[pid]&&Object.keys(lq.ppl).length>=FFLQ.MAX){ c.send({t:'full'}); setTimeout(function(){ c.close(); },500); return; }
      var old=lq.ppl[pid]; if(old&&old.c!==c){ old.c.on.close=null; old.c.close(); }
      c.pid=pid; lq.ppl[pid]={name:nm, c:c, on:true, last:Date.now()}; c.send({t:'hi', name:nm, rx:lq.rx, qa:lq.qa}); c.send(lqMsg(pid)); lqDraw(); return; }
    if(!x||x.c!==c) return;
    if(m.t==='rx'){ lqReact(x,m.e); return; }
    if(m.t==='qa'){ lqAsk(c.pid,m.q); return; }
    if(m.t==='ans'){ var q=lq.q; if(!q||q.none||q.rev||m.q!==q.id) return; var a=m.a|0; if(a<0||a>=q.ch.length) return; (lq.ans[q.id]=lq.ans[q.id]||{})[p]=a; c.send({t:'got', q:q.id, a:a}); lqDraw(); } };
  c.on.close=function(){ var x=c.pid&&lq.ppl[c.pid]; if(x&&x.c===c){ x.on=false; lqDraw(); } }; }
/* an audience reaction: only the fixed emoji, only while the session runs with reactions on, at most FFLQ.RX_RATE a second from one phone, at most FFLQ.RX_FLOAT floating at once */
function lqReact(x,e){ var now=Date.now(); if(!lq.on||!lq.rx||!pr.on||typeof e!=='string'||FFLQ.RX.indexOf(e)<0) return;
  x.rt=(x.rt||[]).filter(function(t){ return now-t<1000; }); if(x.rt.length>=FFLQ.RX_RATE) return; x.rt.push(now);
  lq.rxN[e]=(lq.rxN[e]||0)+1; rxCount(); var f=$('rxFloat'); if(f.children.length>=FFLQ.RX_FLOAT) return;
  var i=document.createElement('i'); i.textContent=e; i.style.left=(6+Math.random()*86)+'%'; i.style.setProperty('--sx',Math.round((Math.random()-.5)*14)+'vw'); i.style.animationDelay=Math.round(Math.random()*120)+'ms';
  var gone=function(){ if(i.parentNode) i.parentNode.removeChild(i); }; i.addEventListener('animationend',gone); setTimeout(gone,4500); f.appendChild(i); }
/* an audience question: only text, only while the session runs with questions on, control characters stripped, at most FFLQ.QA_LEN long, one per FFLQ.QA_GAP ms and FFLQ.QA_MAX in all from one phone (counted per phone id, so coming back does not reset it) */
function lqAsk(p,s){ if(!lq.on||!lq.qa||!pr.on||typeof s!=='string') return; s=s.slice(0,FFLQ.QA_LEN*4).replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]+/g,' ').replace(/\s+/g,' ').trim().slice(0,FFLQ.QA_LEN).trim(); if(!s) return;
  var now=Date.now(), c=lq.qaC[p]||(lq.qaC[p]={n:0,t:0}); if(c.n>=FFLQ.QA_MAX||now-c.t<FFLQ.QA_GAP) return; c.n++; c.t=now;
  lq.qaL.unshift({id:++lq.qaN, q:s}); lqDraw(); }
function qaShow(id){ var o=lq.qaL.filter(function(x){ return x.id===id; })[0], b=$('qaCap'); lq.qaCap=o?id:0; b.hidden=!o; if(o) $('qaTx').textContent=o.q; }
function qaDel(id){ lq.qaL=lq.qaL.filter(function(x){ return x.id!==id; }); if(lq.qaCap===id) qaShow(0); lqDraw(); }
function qaClear(){ lq.qaL=[]; lq.qaSig=null; $('lqQaLs').innerHTML=''; qaShow(0); }
function qaDraw(){ var box=$('lqQa'), L=lq.qaL, sig=L.map(function(x){ return x.id; }).join(); $('lqQaOn').checked=lq.qa; box.hidden=!L.length; if(sig===lq.qaSig) return; lq.qaSig=sig;
  var ls=$('lqQaLs'); ls.innerHTML=''; $('lqQaN').textContent=F('받은 질문 {0}개',L.length);
  L.forEach(function(o){ var r=document.createElement('div'), t=document.createElement('span'), a=document.createElement('button'), d=document.createElement('button'); r.className='lqQr'; t.className='qt'; t.setAttribute('data-notr',''); t.textContent=o.q;
    a.textContent=T('화면에 띄우기'); a.onclick=function(e){ e.stopPropagation(); qaShow(o.id); }; d.textContent=T('지우기'); d.className='dang'; d.onclick=function(e){ e.stopPropagation(); qaDel(o.id); }; r.appendChild(t); r.appendChild(a); r.appendChild(d); ls.appendChild(r); }); }
function rxCount(){ var b=$('rxCnt'), on=lq.on&&lq.rx&&FFLQ.RX.some(function(e){ return lq.rxN[e]; }); b.hidden=!on; b.innerHTML=''; if(!on) return;
  FFLQ.RX.forEach(function(e){ if(!lq.rxN[e]) return; var sp=document.createElement('span'), n=document.createElement('b'); sp.textContent=e; n.textContent=lq.rxN[e]; sp.appendChild(n); b.appendChild(sp); }); }
function rxClear(){ $('rxFloat').innerHTML=''; lq.rxN={}; rxCount(); }
function lqStart(){ if(lq.on||!pr.on) return; lq.on=true; lq.show=true; lq.qr=true; lq.rx=true; rxClear(); lq.qa=true; lq.qaC={}; lq.qaN=0; qaClear(); lq.ppl={}; lq.ans={}; lq.key=''; lq.tries=0; lqOpen(); clearInterval(lq.ping);
  lq.ping=setInterval(function(){ Object.keys(lq.ppl).forEach(function(p){ var x=lq.ppl[p]; if(x.on) x.c.send({t:'ping'}); }); lqDraw(); },5000); lqSync(); }
function lqOpen(){ lq.code=FFLQ.makeCode(); lq.st='wait'; lq.err=''; lqDrawJoin(); var code=lq.code;
  lq.h=FFLQ.net().host(code,{open:function(){ if(lq.code!==code) return; lq.st='open'; lqDraw(); }, conn:function(c){ if(lq.code===code&&lq.on) lqConn(c); else c.close(); },
    error:function(k){ if(lq.code!==code||!lq.on) return; if(k==='taken'&&lq.tries++<3){ try{ lq.h.close(); }catch(e){} lqOpen(); return; } lq.st='err'; lq.err=k; lqDraw(); }}); }
function lqStop(){ if(!lq.on) return; Object.keys(lq.ppl).forEach(function(p){ var x=lq.ppl[p]; if(x.on){ x.c.send({t:'end'}); } x.c.on.close=null; }); var h=lq.h, ppl=lq.ppl;
  setTimeout(function(){ Object.keys(ppl).forEach(function(p){ ppl[p].c.close(); }); try{ if(h) h.close(); }catch(e){} },400);
  clearInterval(lq.ping); lq.on=false; rxClear(); qaClear(); lq.qaC={}; lq.h=null; lq.st='off'; lq.ppl={}; lq.ans={}; lq.q=null; lq.key=''; lqDraw(); }
function lqToggle(){ if(!pr.on) return; if(!lq.on){ if(!deck.slides.some(function(s){ return s.layout==='quiz'&&!s.hide; })) return toast(T('퀴즈 슬라이드가 없어요')); lqStart(); return; } lq.show=!lq.show; lqDraw(); }
function lqDrawJoin(){ var url=lqUrl(); $('lqCode').textContent=lq.code.slice(0,3)+' '+lq.code.slice(3); $('lqUrl').textContent=url.replace(/^https?:\/\//,'');
  var q=null; try{ q=window.FFQR&&FFQR.make(url); }catch(e){} if(q) FFQR.draw($('lqQr'),q,Math.max(2,Math.floor(220/(q.size+8)))); $('lqQr').hidden=!q; }
function lqDraw(){ var box=$('lq'), b=$('pLqB'); b.hidden=!pr.on||!(lq.on||deck.slides.some(function(s){ return s.layout==='quiz'&&!s.hide; })); b.classList.toggle('on',lq.on);
  var on=lqOnline().length; b.textContent=lq.on?'📲 '+on+(lq.qaL.length?' 💬'+lq.qaL.length:''):'📲'; box.hidden=!lq.on||!lq.show||!pr.on; if(box.hidden) return;
  $('lqRxOn').checked=lq.rx; qaDraw(); $('lqPpl').textContent=F('참여 {0}명',on); $('lqJoin').hidden=!lq.qr; $('lqQrB').textContent=T(lq.qr?'QR 접기':'QR 보기');
  $('lqMsg').textContent=lq.st==='wait'?T('연결 준비 중…'):lq.st==='err'?T(lq.err==='lib'?'실시간 연결 도구를 불러오지 못했어요. 인터넷 연결을 확인해 주세요':lq.err==='net'?'연결 서버에 닿지 못했어요. 인터넷 연결을 확인해 주세요':'연결하지 못했어요. 다시 해 주세요'):T('휴대폰으로 QR을 찍거나 주소를 열고 코드를 넣어요');
  $('lqMsg').classList.toggle('bad',lq.st==='err');
  var q=lq.q, bars=$('lqBars'), stat=$('lqStat'), rv=$('lqRev'); bars.innerHTML=''; stat.textContent=''; rv.hidden=true;
  if(!q){ bars.innerHTML='<p class="lqTip"></p>'; bars.firstChild.textContent=T('퀴즈 슬라이드가 나오면 문제가 휴대폰으로 가요'); return; }
  if(q.none){ bars.innerHTML='<p class="lqTip"></p>'; bars.firstChild.textContent=T('이 퀴즈에는 보기가 없어요. 편집 화면의 슬라이드 옵션 > 실시간 퀴즈 보기에서 넣어 주세요'); return; }
  var cnt=lqCounts(q), tot=cnt.reduce(function(a,v){ return a+v; },0), mx=Math.max.apply(null,cnt.concat([1]));
  q.ch.forEach(function(c,i){ var r=document.createElement('div'); r.className='lqBar'+(q.rev&&i===q.ok?' ok':q.rev&&q.ok>=0?' dim':''); r.innerHTML='<span class="lb"></span><span class="tr"><i></i></span><b></b>';
    r.firstChild.textContent=CIRC[i]+' '+c; r.querySelector('i').style.width=Math.round(cnt[i]/mx*100)+'%'; r.lastChild.textContent=cnt[i]; r.setAttribute('data-notr',''); bars.appendChild(r); });
  stat.textContent=F('{0}명이 답했어요',tot)+(q.rev?(q.ok>=0?' · '+F('정답률 {0}% ({1}/{2}명)',tot?Math.round(cnt[q.ok]/tot*100):0,cnt[q.ok],tot):' · '+T('정답이 보기에 없어서 맞힌 비율은 셀 수 없어요')):'');
  rv.hidden=false; rv.textContent=T(q.rev?'정답 숨기기':'정답 공개'); }
$('lqRev').onclick=function(e){ e.stopPropagation(); if(!pr.on||pr.end) return; pr.rev=pr.rev===pr.i?-1:pr.i; drawPresent(); armAuto(); };
$('lqQrB').onclick=function(e){ e.stopPropagation(); lq.qr=!lq.qr; lqDraw(); };
$('lqRxOn').onchange=function(){ lq.rx=this.checked; Object.keys(lq.ppl).forEach(function(p){ var x=lq.ppl[p]; if(x.on) x.c.send({t:'rx', on:lq.rx}); }); if(!lq.rx) rxClear(); toast(T(lq.rx?'청중 반응을 받아요':'청중 반응을 껐어요')); };
$('lqRxOn').onclick=function(e){ e.stopPropagation(); };
$('lqQaOn').onchange=function(){ lq.qa=this.checked; Object.keys(lq.ppl).forEach(function(p){ var x=lq.ppl[p]; if(x.on) x.c.send({t:'qa', on:lq.qa}); }); toast(T(lq.qa?'청중 질문을 받아요':'청중 질문을 껐어요')); };
$('lqQaOn').onclick=function(e){ e.stopPropagation(); };
$('lqQaAll').onclick=function(e){ e.stopPropagation(); qaClear(); lqDraw(); };
$('qaX').onclick=function(e){ e.stopPropagation(); qaShow(0); };
$('lqHide').onclick=function(e){ e.stopPropagation(); lq.show=false; lqDraw(); };
$('lqEnd').onclick=function(e){ e.stopPropagation(); lqStop(); toast(T('실시간 퀴즈를 끝냈어요')); };
$('pLqB').onclick=function(e){ e.stopPropagation(); lqToggle(); };

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
  d.s=vis.map(function(s){ connSync(s); var x={l:s.layout}; SH_TEXT.forEach(function(k){ if(s[k]&&!(k==='caption'&&s.layout==='quiz'&&!o.ans)) x[k]=s[k]; }); LISTS.forEach(function(k){ if(s[k].length) x[k]=s[k]; });
    if(s.layout==='chart'&&s.ctype!=='bar') x.c=s.ctype; if(s.bg) x.bg=s.bg; if(s.bg2){ x.bg2=s.bg2; x.bga=s.bga; } if(Object.keys(s.pos).length) x.p=s.pos; if(s.els.length) x.e=s.els; if(o.notes&&s.notes&&s.notes.trim()) x.notes=s.notes; return x; });
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
function shBuild(){ syncLinks(true); var tok=++shTok, o=shOpts(), j=shareJSON(o), qb=$('shQrBox'); $('shLink').value=''; $('shInfo').textContent=T('링크를 만드는 중…'); qb.hidden=true; $('shWarn').hidden=true; ['shCopy','shOpen','shShare'].forEach(function(id){ $(id).disabled=true; });
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
    else if(k==='q'||k==='Q'){ e.preventDefault(); lqToggle(); }
    else if(k==='t'||k==='T'){ e.preventDefault(); if(pr.cd){ if(pr.cd.left===0){ pr.cd.left=pr.cd.total; pr.cd.run=true; } else pr.cd.run=!pr.cd.run; cdPaint(); toast(pr.cd.run?T('타이머가 다시 가요'):T('타이머를 멈췄어요')); } }
    else if(k==='Escape'){ e.preventDefault(); if(ink.tool) setInk(''); else if(pr.bb) setBoard(false); else if(lq.qaCap) qaShow(0); else exitPresent(); }
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
  if(e.key==='Escape'){ closeMenus(); if(cn){ cnOff(); toast(T('연결선을 그만뒀어요')); return; } if(fp.on){ fpOff(); toast(T('서식 복사를 껐어요')); return; } }
  if(e.ctrlKey&&e.altKey&&(e.code==='KeyN'||e.key==='n'||e.key==='N')){ e.preventDefault(); if(gen) toast(T('AI가 다 만들 때까지 기다려 주세요')); else { blurEdit(); newDeckAction(); } return; }
  var t=e.target; if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.tagName==='SELECT'||t.isContentEditable)) return;
  var mod=e.ctrlKey||e.metaKey;
  if(e.ctrlKey&&e.altKey&&!e.shiftKey&&!$('editor').hidden&&(e.code==='KeyC'||e.code==='KeyV')){ e.preventDefault(); if(e.code==='KeyC'){ if(fpCopy()) toast(T('서식을 복사했어요. Ctrl+Alt+V로 붙여요')); } else fpPasteSel(); return; }
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
  else if(!$('editor').hidden&&!gen&&!busyOn&&!mod&&e.key==='Delete'&&deck.slides[cur]&&deck.slides[cur].layout==='live'&&liveCfg(deck.slides[cur])){ e.preventDefault(); selK='live'; delSel(); }
  else if(!$('editor').hidden&&!gen&&!busyOn&&!mod&&e.key==='Delete'){ e.preventDefault(); delSlide(); }
  else if(!$('editor').hidden&&!mod&&e.key==='Home'){ e.preventDefault(); select(0); }
  else if(!$('editor').hidden&&!mod&&e.key==='End'){ e.preventDefault(); select(deck.slides.length-1); }
  else if(!$('editor').hidden&&!mod&&(e.key==='ArrowDown'||e.key==='ArrowRight'||e.key==='PageDown')){ e.preventDefault(); select(cur+1); }
  else if(!$('editor').hidden&&!mod&&(e.key==='ArrowUp'||e.key==='ArrowLeft'||e.key==='PageUp')){ e.preventDefault(); select(cur-1); }
});

/* ---------- PDF / print ---------- */
function printDeck(){
  if(!deck.slides.length) return toast(T('먼저 슬라이드를 만들어 주세요'));
  blurEdit(); syncLinks(true); var r=$('printRoot'), t=th(); r.innerHTML='';
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
function pptxFace(t,head,txt){ if(/[぀-ヿ]/.test(txt)) return t.serif&&head?'Yu Mincho':'Yu Gothic'; if(/[가-힣]/.test(txt)) return (head?t.serif:t.bserif)?'Batang':'Malgun Gothic'; if(/[一-鿿]/.test(txt)) return 'Microsoft YaHei'; return head?t.pfh:t.pfb; }
/* pictures cropped into a round shape or a circle are cut on a canvas (the image fills the box, the rest is cropped; PNG keeps the cut corners clear), because PowerPoint's own picture crop cannot be written by the library */
var picCache={};
function cropPic(s,b,o){ o=o||{}; return new Promise(function(res){ var im=new Image(); im.onerror=function(){ res(''); }; im.onload=function(){ var k=Math.min(2,1600/Math.max(b.w,b.h)), cw=Math.max(1,Math.round(b.w*k)), ch=Math.max(1,Math.round(b.h*k)), c=document.createElement('canvas'); c.width=cw; c.height=ch; var x=c.getContext('2d');
    if(PICP[s.ish]){ var pp=new Path2D(); pp.addPath(new Path2D(PICP[s.ish]),new DOMMatrix([cw,0,0,ch,0,0])); x.clip(pp); }
    else { x.beginPath(); if(s.ish==='ell') x.ellipse(cw/2,ch/2,cw/2,ch/2,0,0,Math.PI*2); else { var r=Math.min(cw,ch)*.16667; x.moveTo(r,0); x.arcTo(cw,0,cw,ch,r); x.arcTo(cw,ch,0,ch,r); x.arcTo(0,ch,0,0,r); x.arcTo(0,0,cw,0,r); x.closePath(); } x.clip(); }
    var q=Math.max(cw/im.width,ch/im.height), w=im.width*q, h=im.height*q; if(o.f) x.filter=o.f; x.drawImage(im,(cw-w)*(o.px==null?50:o.px)/100,(ch-h)*(o.py==null?50:o.py)/100,w,h); var d=''; try{ d=c.toDataURL('image/png'); }catch(e){} res(d); }; im.src=s.img; }); }
function prepPics(){ picCache={}; var jobs=[];
  deck.slides.forEach(function(s){ var b=s.img&&s.ish!=='rect'&&boxDef(s,'img'); if(b) jobs.push(cropPic(s,b).then(function(d){ if(d) picCache[s.id]=d; }));
    /* a free picture is cut on a canvas too when it is cropped to a shape or by its box, or has a colour effect */
    s.els.forEach(function(e){ if(e.k==='pic'&&(e.ish!=='rect'||picFilter(e)||Math.abs(e.w/e.h-e.iw/e.ih)>.02)) jobs.push(cropPic({ish:e.ish,img:e.src},e,{px:e.px,py:e.py,f:picFilter(e)}).then(function(d){ if(d) picCache['e:'+e.id]=d; })); }); });
  return Promise.all(jobs); }
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
  /* the text style of a box goes into the options of its text */
  function pptxTf(o,tf,t){ if(!tf) return o; if(tf.b) o.bold=tf.b>0; if(tf.i) o.italic=true; if(tf.u) o.underline={style:'sng'}; if(tf.s) o.strike='sngStrike'; if(tf.c) o.color=C(colOf(tf.c,t)); return o; }
  function pptxShape(sl,e,t,fs){ var c=function(v){ return C(colOf(v,t)); };
    if(e.k==='media') return pptxMedia(sl,e,I);
    if(e.k==='pic'){ var po={data:(picCache['e:'+e.id]||e.src).replace(/^data:/,''), x:I(e.x), y:I(e.y), w:I(e.w), h:I(e.h), rotate:e.rot||0}; if(e.fl&1) po.flipH=true; if(e.fl&2) po.flipV=true; if(e.op<100) po.transparency=100-e.op; if(e.url) po.hyperlink={url:e.url}; if(e.alt) po.altText=e.alt; sl.addImage(po);
      if(e.sw&&e.line&&!PICP[e.ish]){ var pb=e.sw/2; sl.addShape(e.ish==='ell'?p.ShapeType.ellipse:e.ish==='round'?p.ShapeType.roundRect:p.ShapeType.rect,{x:I(e.x+pb), y:I(e.y+pb), w:I(e.w-e.sw), h:I(e.h-e.sw), fill:{type:'none'}, line:{color:c(e.line), width:PT(e.sw)}, rotate:e.rot||0, rectRadius:I(Math.min(e.w,e.h)*.16667)}); } return; }
    if(gradCache[e.id]){ sl.addImage({data:gradCache[e.id].replace(/^data:/,''), x:I(e.x), y:I(e.y), w:I(e.w), h:I(e.h), rotate:e.rot||0, flipH:!!(e.fl&1), flipV:!!(e.fl&2)}); if(e.text.trim()){ var tb=shTextBox(e); sl.addText(e.text,pptxTf({x:I(e.x+tb.x), y:I(e.y+tb.y), w:I(tb.w), h:I(tb.h), fontFace:fb, fontSize:PT(fs['e:'+e.id]||e.fs||SH_FS), color:C(shTextCol(e,t)), align:{l:'left',c:'center',r:'right'}[e.al]||'center', valign:'middle', margin:0, rotate:e.rot||0},e.tf,t)); } return; }
    if(isLine(e)){ var o={x:I(Math.min(e.x,e.x+e.w)), y:I(Math.min(e.y,e.y+e.h)), w:I(Math.abs(e.w)), h:I(Math.abs(e.h)), line:{color:c(e.line), width:PT(e.sw)}};
      if(e.ds) o.line.dashType=e.ds===1?'dash':'sysDot'; if((e.w<0)!==(e.h<0)) o.flipH=true; if(e.k==='arrow') o.line[e.h>=0?'endArrowType':'beginArrowType']='triangle'; sl.addShape(p.ShapeType.line,o); return; }
    var ln=e.sw&&e.line, h2=ln?e.sw/2:0, ty={rect:p.ShapeType.rect, round:p.ShapeType.roundRect, ell:p.ShapeType.ellipse, tri:p.ShapeType.triangle, star:p.ShapeType.star5}[e.k]||(SHP[e.k]&&p.ShapeType[SHP[e.k]])||p.ShapeType.rect;
    var q={x:I(e.x+h2), y:I(e.y+h2), w:I(e.w-2*h2), h:I(e.h-2*h2), fill:e.fill?(e.op<100?{color:c(e.fill), transparency:100-e.op}:{color:c(e.fill)}):{type:'none'}, line:ln?{color:c(e.line), width:PT(e.sw)}:{type:'none'}};
    if(e.k==='round') q.rectRadius=I(Math.min(e.w,e.h)*.16667);
    if(e.fl&1) q.flipH=true; if(e.fl&2) q.flipV=true; if(e.ds&&ln) q.line.dashType=e.ds===1?'dash':'sysDot';
    if(e.rot) q.rotate=e.rot; if(e.sd) q.shadow={type:'outer', color:'000000', opacity:e.sd>1?.5:.35, blur:e.sd>1?9:5, offset:e.sd>1?6:3, angle:90}; if(e.url) q.hyperlink={url:e.url};
    if(e.text.trim()){ q.shape=ty; q.fontFace=fb; q.fontSize=PT(fs['e:'+e.id]||e.fs||SH_FS); q.color=C(shTextCol(e,t)); q.align={l:'left',c:'center',r:'right'}[e.al]||'center'; q.valign='middle'; q.margin=0; sl.addText(e.text,pptxTf(q,e.tf,t)); }
    else sl.addShape(ty,q); }
  var p=new P(); p.layout='LAYOUT_WIDE'; p.title=deck.name; p.author='Fry Slides'; p.company='Frenchfries777 Tools';
  deck.slides.forEach(function(s){
    connSync(s); var t=eth(s,t0), sl=p.addSlide(); sl.background=bgCache[s.id]?{data:bgCache[s.id].replace(/^data:/,'')}:{color:C(t.bg)}; if(s.hide) sl.hidden=true;
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
          if(s.ish!=='rect'&&picCache[s.id]){ sl.addImage({data:picCache[s.id].replace(/^data:/,''), x:I(b.x), y:I(b.y), w:I(b.w), h:I(b.h), altText:s.ialt||''});
            if(bd&&!PICP[s.ish]) sl.addShape(s.ish==='ell'?p.ShapeType.ellipse:p.ShapeType.roundRect,{x:I(b.x+h2), y:I(b.y+h2), w:I(b.w-2*h2), h:I(b.h-2*h2), fill:{type:'none'}, line:bd, rectRadius:I(Math.min(b.w,b.h)*.16667)}); return; }
          var k=Math.min(b.w/s.iw,b.h/s.ih), w=s.iw*k, h=s.ih*k; sl.addImage({data:s.img.replace(/^data:/,''), x:I(b.x+(b.w-w)/2), y:I(b.y+(b.h-h)/2), w:I(w), h:I(h), altText:s.ialt||''});
          if(bd) sl.addShape(p.ShapeType.rect,{x:I(b.x+(b.w-w)/2+h2), y:I(b.y+(b.h-h)/2+h2), w:I(w-2*h2), h:I(h-2*h2), fill:{type:'none'}, line:bd}); } return; }
      if(empty(s,b.f)) return; var r=role(t,b.k), pt=PT(fs[b.f]||b.fs);
      var o={x:I(b.x), y:I(b.y), w:I(b.w), h:I(b.h), fontFace:r.head?fh:fb, fontSize:pt, color:C(r.c), bold:r.w>=700, align:b.al||'left', valign:VA[b.va||'flex-start'],
        margin:0, lineSpacingMultiple:Math.round(r.lh/1.2*100)/100, fit:'shrink', paraSpaceAfter:0}; pptxTf(o,s.tf[b.f],t);
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
  blurEdit(); syncLinks(true); saveNow(); var b=$('pptxBtn'); b.disabled=true;
  needPPTX().then(function(P){ return Promise.all([prepPics(),prepExtras()]).then(function(){ return buildPPTX(P).write({outputType:'blob', compression:true}); }); }).then(function(blob){ download(blob,fileName(deck.name)+'.pptx'); })
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
  var S=sortSel.slice();
  sortApply(function(){ deck.slides=deck.slides.filter(function(s){ return S.indexOf(s.id)<0; }); sortSel=[]; sortAnchor=-1; return true; });
  FFUndo.show(F('{0}장을 지웠어요',n),function(){ doUndo(); drawSort(); }); }
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

/* used by collab.js (editing the same deck together through a share link; the editor only) */
window.FSLX={ mode:MODE, get deck(){ return deck; }, get store(){ return store; }, get cur(){ return cur; }, setCur:function(i){ cur=Math.max(0,Math.min(i,deck.slides.length-1)); },
  fixDeck:fixDeck, fixSlide:fixSlide, uid:uid, toast:toast, confirmDlg:confirmDlg, refresh:refresh, saveSoon:saveSoon, saveNow:saveNow, openDeck:openDeck, onSaved:null,
  /* remote changes wait while something is being typed or dragged, presenting or generating */
  quiet:function(){ var a=document.activeElement; return !pr.on&&!drg&&!mq&&!gen&&!busyOn&&!(a&&(a.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)))&&!document.querySelector('.ov.open:not(#shareDlg)'); } };
/* used by ai-slides.js */
window.FSL={
  get deck(){ return deck; }, get cur(){ return cur; }, get busy(){ return gen||busyOn; }, LAYS:AILAYS, LAY:LAY, blank:blank, fixSlide:fixSlide, toast:toast, ask:ask, pushUndo:pushUndo, snap:snap,
  saveSoon:saveSoon, saveNow:saveNow, refresh:refresh, select:select, isDefaultName:isDefaultName, openMenu:openMenu, closeMenus:closeMenus, blurEdit:blurEdit,
  newDeckWith:function(topic){ blurEdit(); saveNow(); if(deck.slides.length||!isDefaultName(deck.name)) openDeck(newDeck()); deck.topic=topic; $('topic').value=topic; saveSoon(); return Promise.resolve(); },
  setName:function(n){ deck.name=n; $('deckName').value=n; saveSoon(); },
  setGen:function(on){ gen=on; $('genBar').hidden=!on; refresh(); },
  setBusy:function(on){ busyOn=on; $('busy').hidden=!on; drawMain(); updUR(); },
  pushSlide:function(s){ deck.slides.push(fixSlide(s)); cur=deck.slides.length-1; refresh(); saveSoon(); },
  putSlide:function(i,s){ var o=deck.slides[i]; if(!o) return; s=fixSlide(s); s.id=o.id; s.img=o.img; s.iw=o.iw; s.ih=o.ih; s.hide=o.hide; s.bg=o.bg; s.bg2=o.bg2; s.bga=o.bga; s.data=o.data; s.ctype=o.ctype; s.pos=o.pos; s.els=o.els; s.build=o.build; s.tr=o.tr; s.sec=o.sec; s.ish=o.ish; s.ibc=o.ibc; s.ibw=o.ibw; deck.slides[i]=s; if(i===cur) drawMain(); updateThumb(i); saveSoon(); },
  insertSlide:function(i,s){ deck.slides.splice(i,0,fixSlide(s)); cur=i; refresh(); saveSoon(); }
};
/* used by ribbon.js (the tabs and the command search) */
/* ---------- gradients: a shape's gr is the second colour, ga the direction in degrees (0 = left to right, 90 = top to bottom). Screen: an SVG gradient;
   .pptx: the library has no gradient fill, so the shape is drawn on a canvas and put in as a picture with its text on top ---------- */
var gradN=0;
function gradVec(a){ var r=(a==null?90:a)*Math.PI/180, c=Math.cos(r)/2, s=Math.sin(r)/2, f=function(v){ return Math.round(v*1000)/1000; }; return [f(.5-c),f(.5-s),f(.5+c),f(.5+s)]; }
function gradPic(e,t){ var k=2, w=Math.max(1,Math.round(e.w*k)), h=Math.max(1,Math.round(e.h*k)), c=document.createElement('canvas'); c.width=w; c.height=h; var x=c.getContext('2d'), v=gradVec(e.ga);
  var g=x.createLinearGradient(v[0]*w,v[1]*h,v[2]*w,v[3]*h); g.addColorStop(0,colOf(e.fill,t)); g.addColorStop(1,colOf(e.gr,t));
  var sw=e.sw&&e.line?e.sw*k:0, s2=sw/2, iw=w-sw, ih=h-sw, P2=null; x.beginPath();
  if(e.k==='ell') x.ellipse(w/2,h/2,iw/2,ih/2,0,0,Math.PI*2);
  else if(e.k==='tri'){ x.moveTo(w/2,s2); x.lineTo(w-s2,h-s2); x.lineTo(s2,h-s2); x.closePath(); }
  else if(e.k==='star'){ starPts(s2,s2,iw,ih).split(' ').forEach(function(q,i){ var p=q.split(','); x[i?'lineTo':'moveTo'](+p[0],+p[1]); }); x.closePath(); }
  else if(SHP[e.k]){ P2=new Path2D(shapePath(e.k,w,h,s2,iw,ih)); }
  else { var r=e.k==='round'?Math.min(w,h)*.16667:0; x.moveTo(s2+r,s2); x.arcTo(w-s2,s2,w-s2,h-s2,r); x.arcTo(w-s2,h-s2,s2,h-s2,r); x.arcTo(s2,h-s2,s2,s2,r); x.arcTo(s2,s2,w-s2,s2,r); x.closePath(); }
  x.globalAlpha=(e.op||100)/100; x.fillStyle=g; if(P2) x.fill(P2,'evenodd'); else x.fill(); x.globalAlpha=1; if(sw){ x.lineWidth=sw; x.lineJoin='round'; x.strokeStyle=colOf(e.line,t); if(P2) x.stroke(P2); else x.stroke(); }
  return c.toDataURL('image/png'); }
function gradBg(s,t){ var c=document.createElement('canvas'); c.width=1280; c.height=720; var x=c.getContext('2d'), v=gradVec(s.bga), g=x.createLinearGradient(v[0]*1280,v[1]*720,v[2]*1280,v[3]*720);
  g.addColorStop(0,t.bg); g.addColorStop(1,s.bg2); x.fillStyle=g; x.fillRect(0,0,1280,720); return c.toDataURL('image/png'); }

/* ---------- video and sound: a shape of kind 'media'. A file is kept in this browser's IndexedDB (src 'idb:<key>'; too big for the deck's
   localStorage), a YouTube link or a web file by its https address. The editor shows a cover; presenting plays it. ---------- */
var MDB=null, mediaURLs={}, presMedia={};
function mdb(){ if(MDB) return MDB; MDB=new Promise(function(res,rej){ try{ var q=indexedDB.open('ffslides-media',1); q.onupgradeneeded=function(){ q.result.createObjectStore('m'); }; q.onsuccess=function(){ res(q.result); }; q.onerror=function(){ MDB=null; rej(q.error); }; }catch(e){ MDB=null; rej(e); } }); return MDB; }
function mdbPut(k,blob){ return mdb().then(function(d){ return new Promise(function(res,rej){ var tx=d.transaction('m','readwrite'); tx.objectStore('m').put(blob,k); tx.oncomplete=function(){ res(); }; tx.onerror=function(){ rej(tx.error); }; }); }); }
function mdbGet(k){ return mdb().then(function(d){ return new Promise(function(res,rej){ var q=d.transaction('m').objectStore('m').get(k); q.onsuccess=function(){ res(q.result||null); }; q.onerror=function(){ rej(q.error); }; }); }); }
function ytId(u){ var m=/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i.exec(String(u||'')); return m?m[1]:''; }
function ytEmbed(u,auto){ var id=ytId(u); return id?'https://www.youtube-nocookie.com/embed/'+id+'?rel=0'+(auto?'&autoplay=1':''):''; }
function mediaURL(e){ if(e.mt==='yt') return Promise.resolve(ytEmbed(e.src,e.auto)); if(!/^idb:/.test(e.src)) return Promise.resolve(e.src);
  if(mediaURLs[e.src]) return Promise.resolve(mediaURLs[e.src]);
  return mdbGet(e.src.slice(4)).then(function(b){ if(!b) return ''; return mediaURLs[e.src]=URL.createObjectURL(b); },function(){ return ''; }); }
function mediaEl(e,th,edit,opt){ var d=document.createElement('div'); d.className='shp media mt-'+e.mt; d.dataset.bk='e:'+e.id; d.dataset.e=e.id;
  d.style.cssText='left:'+e.x+'px;top:'+e.y+'px;width:'+e.w+'px;height:'+e.h+'px;';
  if(opt&&opt.step!=null&&pr.on){ var keep=presMedia[e.id];
    if(!keep){ keep=document.createElement(e.mt==='yt'?'iframe':e.mt); keep.className='pmedia';
      if(e.mt==='yt'){ keep.allow='autoplay; encrypted-media; picture-in-picture; fullscreen'; keep.setAttribute('allowfullscreen',''); keep.setAttribute('referrerpolicy','strict-origin-when-cross-origin'); }
      else { keep.controls=true; keep.preload='auto'; keep.setAttribute('playsinline',''); }
      mediaURL(e).then(function(u){ if(!u){ var miss=document.createElement('div'); miss.className='mmiss'; miss.textContent=T('이 기기에는 영상·소리 파일이 없어요'); keep.replaceWith(miss); return; }
        keep.src=u; if(e.auto&&e.mt!=='yt'){ var pl=keep.play(); if(pl&&pl.catch) pl.catch(function(){}); } });
      presMedia[e.id]=keep; }
    d.appendChild(keep); return d; }
  var cv=document.createElement('div'); cv.className='mcover';
  cv.innerHTML='<svg viewBox="0 0 24 24" width="'+Math.min(96,e.h*.45)+'" height="'+Math.min(96,e.h*.45)+'" fill="currentColor">'+(e.mt==='audio'?'<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>':'<path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z"/>')+'</svg>';
  var nm=document.createElement('span'); nm.textContent=(e.mt==='yt'?'YouTube · ':'')+(e.nm||T(e.mt==='audio'?'소리':'동영상')); cv.appendChild(nm); d.appendChild(cv); return d; }
function mediaStop(){ for(var k in presMedia){ var n=presMedia[k]; try{ if(n.pause) n.pause(); else n.src='about:blank'; }catch(x){} } presMedia={}; }
var MEDIA_MAX=200*1024*1024;
/* a link on a shape: pressing it while presenting opens the address in a new tab (in the .pptx it is a shape hyperlink) */
function openUrl(){ var e=selShape(); if(!e) return; $('uUrl').value=e.url||''; openDlg('urlDlg'); setTimeout(function(){ $('uUrl').focus(); },30); }
$('urlOk').onclick=function(){ var e=selShape(), u=$('uUrl').value.trim(); if(!e) return closeDlg('urlDlg',null); if(u&&!/^https?:\/\//i.test(u)) u='https://'+u; if(!/^https?:\/\/[^\s]{1,500}$/i.test(u)) return toast(T('주소를 확인해 주세요'));
  pushUndo(); e.url=u; closeDlg('urlDlg',null); changed(); };
$('present').addEventListener('click',function(e){ var a=e.target.closest&&e.target.closest('[data-url]'); if(a){ e.stopPropagation(); window.open(a.dataset.url,'_blank','noopener'); } },true);
function openMedia(){ var s=deck.slides[cur]; if(!s||gen||busyOn) return; blurEdit(); $('mFile').value=''; $('mUrl').value=''; $('mAuto').checked=false; $('mInfo').textContent=''; openDlg('mediaDlg'); }
$('mFile').addEventListener('change',function(){ var f=this.files[0]; $('mInfo').textContent=f?f.name+' · '+(Math.round(f.size/1048576*10)/10)+' MB':''; if(f) $('mUrl').value=''; });
$('mediaOk').onclick=function(){ var s=deck.slides[cur]; if(!s) return closeDlg('mediaDlg',null); var f=$('mFile').files[0], u=$('mUrl').value.trim(), auto=$('mAuto').checked;
  if(s.els.length>=80) return toast(T('도형이 너무 많아요'));
  var put=function(mt,src,nm,w,h){ pushUndo(); var e=fixEl({id:uid(), k:'media', mt:mt, src:src, nm:nm, auto:auto, x:Math.round((W-w)/2)+s.els.length%5*24, y:Math.round((H-h)/2)+20+s.els.length%5*24, w:w, h:h}); if(!e) return toast(T('넣지 못했어요'));
    s.els.push(e); selK='e:'+e.id; closeDlg('mediaDlg',null); changed(); toast(T(mt==='audio'?'소리를 넣었어요. 발표할 때 재생 단추가 나와요':'동영상을 넣었어요. 끌어서 옮기고 모서리로 크기를 바꿔요')); };
  if(f){ var mt=/^audio\//.test(f.type)||/\.(mp3|m4a|wav|ogg|aac|flac)$/i.test(f.name)?'audio':/^video\//.test(f.type)||/\.(mp4|webm|mov|m4v|ogv)$/i.test(f.name)?'video':'';
    if(!mt) return toast(T('동영상(mp4, webm)이나 소리(mp3, wav) 파일을 골라 주세요')); if(f.size>MEDIA_MAX) return toast(T('200MB보다 작은 파일을 골라 주세요'));
    var key=uid(); $('mediaOk').disabled=true;
    mdbPut(key,f).then(function(){ $('mediaOk').disabled=false; if(mt==='audio') put('audio','idb:'+key,f.name,420,90); else put('video','idb:'+key,f.name,640,360); },
      function(){ $('mediaOk').disabled=false; toast(T('이 브라우저에 파일을 저장하지 못했어요 (저장 공간을 확인해 주세요)')); }); return; }
  if(!u) return toast(T('파일을 고르거나 주소를 넣어 주세요'));
  if(!/^https?:\/\//i.test(u)) u='https://'+u; u=u.replace(/^http:/i,'https:');
  if(ytId(u)) return put('yt',u,'',640,360);
  if(/\.(mp3|m4a|wav|ogg|aac)(\?|#|$)/i.test(u)) return put('audio',u,u.split('/').pop().split('?')[0],420,90);
  if(/\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(u)) return put('video',u,u.split('/').pop().split('?')[0],640,360);
  toast(T('YouTube 주소나 mp4, mp3로 끝나는 주소를 넣어 주세요')); };
/* .pptx: files go in as real media (PowerPoint plays them), YouTube as an online video; a web file is fetched when the site allows it */
var mediaCache={}, gradCache={}, bgCache={};
function blobData(b){ return new Promise(function(res){ var r=new FileReader(); r.onload=function(){ res(String(r.result)); }; r.onerror=function(){ res(''); }; r.readAsDataURL(b); }); }
function mediaCover(e){ var c=document.createElement('canvas'); c.width=640; c.height=Math.max(1,Math.round(640*e.h/e.w)); var x=c.getContext('2d'); x.fillStyle='#14161c'; x.fillRect(0,0,c.width,c.height);
  x.fillStyle='#ffffff'; var r=Math.min(c.width,c.height)*.16, cx=c.width/2, cy=c.height/2; x.beginPath(); if(e.mt==='audio'){ x.fillRect(cx-r*.9,cy-r*.35,r*.5,r*.7); x.moveTo(cx-r*.4,cy-r*.35); x.lineTo(cx+r*.3,cy-r*.9); x.lineTo(cx+r*.3,cy+r*.9); x.lineTo(cx-r*.4,cy+r*.35); }
  else { x.moveTo(cx-r*.6,cy-r); x.lineTo(cx+r,cy); x.lineTo(cx-r*.6,cy+r); } x.closePath(); x.fill(); return c.toDataURL('image/png'); }
function prepExtras(){ mediaCache={}; gradCache={}; bgCache={}; var t0=th(), jobs=[], miss=0;
  deck.slides.forEach(function(s){ var t=eth(s,t0); if(s.bg2) bgCache[s.id]=gradBg(s,t);
    s.els.forEach(function(e){ if(e.gr&&e.fill&&!isLine(e)) gradCache[e.id]=gradPic(e,t);
      if(e.k!=='media'||e.mt==='yt') return;
      var get=/^idb:/.test(e.src)?mdbGet(e.src.slice(4)):fetch(e.src).then(function(r){ if(!r.ok) throw 0; return r.blob(); });
      jobs.push(get.then(function(b){ if(!b) throw 0; return blobData(b).then(function(d){ if(!d) throw 0; var ext=(e.nm||e.src).split('?')[0].split('.').pop().toLowerCase(); if(!/^[a-z0-9]{2,4}$/.test(ext)) ext=e.mt==='audio'?'mp3':'mp4';
        mediaCache[e.id]={data:d.replace(/^data:/,'').replace(/^application\/octet-stream/,(e.mt==='audio'?'audio/':'video/')+ext), extn:ext}; }); }).catch(function(){ miss++; })); }); });
  return Promise.all(jobs).then(function(){ if(miss) toast(F('영상·소리 {0}개는 PPTX에 넣지 못했어요 (그 사이트가 막았어요)',miss)); }); }
function pptxMedia(sl,e,I){ var box={x:I(e.x), y:I(e.y), w:I(e.w), h:I(e.h)};
  if(e.mt==='yt'){ var em=ytEmbed(e.src); if(em) sl.addMedia(Object.assign({type:'online', link:em, cover:mediaCover(e)},box)); return; }
  var m=mediaCache[e.id]; if(!m) return; sl.addMedia(Object.assign({type:e.mt, data:m.data, extn:m.extn, cover:mediaCover(e)},box)); }

/* ---------- SmartArt: lines of text drawn as a picture made of ordinary shapes (one group), so moving, colours and .pptx all just work ---------- */
var SMART=[['process','단계 (화살표로 이어진 상자)'],['cycle','순환 (돌아가는 동그라미)'],['blocks','목록 상자'],['pyramid','피라미드'],['tree','계층 (위 하나, 아래 여러 개)'],['steps','계단']];
function openSmart(){ var s=deck.slides[cur]; if(!s||gen||busyOn) return; blurEdit(); var src=(s.bullets||[]).concat(s.left||[],s.right||[]);
  $('smIn').value=src.length?src.join('\n'):''; $('smClear').checked=!!src.length; $('smClearRow').hidden=!src.length; drawSmartPick(); openDlg('smartDlg'); setTimeout(function(){ $('smIn').focus(); },60); }
function drawSmartPick(){ var g=$('smPick'); if(!g.firstChild) SMART.forEach(function(q,i){ var b=document.createElement('button'); b.type='button'; b.className='tbtn'+(i?'':' on'); b.dataset.t=q[0]; b.textContent=T(q[1]); g.appendChild(b); }); }
$('smPick').addEventListener('click',function(e){ var b=e.target.closest('[data-t]'); if(!b) return; [].forEach.call(this.children,function(x){ x.classList.toggle('on',x===b); }); });
function smartEls(type,items){ var n=items.length, o=[], X0=90, Y0=200, AW=1100, AH=460, box=function(k,x,y,w,h,txt,op){ o.push({k:k, x:Math.round(x), y:Math.round(y), w:Math.round(w), h:Math.round(h), fill:'ac', op:op||100, line:'', sw:0, text:txt, al:'c'}); },
    arr=function(x1,y1,x2,y2){ o.push({k:'arrow', x:Math.round(x1), y:Math.round(y1), w:Math.round(x2-x1), h:Math.round(y2-y1), line:'fg', sw:5}); };
  if(type==='process'){ var gp=60, w=(AW-gp*(n-1))/n, h=Math.min(220,w*.75), y=Y0+(AH-h)/2; items.forEach(function(t,i){ var x=X0+i*(w+gp); box('round',x,y,w,h,t); if(i<n-1) arr(x+w+8,y+h/2,x+w+gp-8,y+h/2); }); }
  else if(type==='cycle'){ var cx=640, cy=Y0+AH/2, R=Math.min(190,AH/2-60)+(n>5?20:0), d=Math.min(170,2*Math.PI*R/n*.62), pts=[]; for(var i=0;i<n;i++){ var a=-Math.PI/2+2*Math.PI*i/n; pts.push([cx+R*Math.cos(a)*1.45,cy+R*Math.sin(a)]); }
    pts.forEach(function(p,i){ box('ell',p[0]-d*.65,p[1]-d/2,d*1.3,d,items[i]); });
    pts.forEach(function(p,i){ var q=pts[(i+1)%n], dx=q[0]-p[0], dy=q[1]-p[1], L=Math.hypot(dx,dy)||1, ux=dx/L, uy=dy/L, cut=d*.62; if(L>2*cut+20) arr(p[0]+ux*cut,p[1]+uy*cut,q[0]-ux*cut,q[1]-uy*cut); }); }
  else if(type==='blocks'){ var cols=n<=4?n:Math.ceil(n/2), rows=Math.ceil(n/cols), g2=28, bw=(AW-g2*(cols-1))/cols, bh=Math.min(200,(AH-g2*(rows-1))/rows), y0=Y0+(AH-(bh*rows+g2*(rows-1)))/2;
    items.forEach(function(t,i){ var r=Math.floor(i/cols), c=i%cols, inRow=Math.min(cols,n-r*cols), off=(AW-(inRow*bw+(inRow-1)*g2))/2; box('round',X0+off+c*(bw+g2),y0+r*(bh+g2),bw,bh,t,100-(i%2)*18); }); }
  else if(type==='pyramid'){ var lh=AH/n, cx2=640, wTop=AW*.28; items.forEach(function(t,i){ var w=wTop+(AW*.9-wTop)*(n>1?i/(n-1):1); box(i===0&&n>1?'tri':'rect',cx2-w/2,Y0+i*lh,w,lh-8,t,100-Math.round(i*45/Math.max(1,n-1))); }); }
  else if(type==='tree'){ var top=items[0], kids=items.slice(1), tw=360, th2=110; box('round',640-tw/2,Y0,tw,th2,top);
    if(kids.length){ var k=kids.length, gp2=30, kw=Math.min(300,(AW-gp2*(k-1))/k), kh=110, ky=Y0+AH-kh-20, x0=640-(kw*k+gp2*(k-1))/2;
      kids.forEach(function(t,i){ var x=x0+i*(kw+gp2); box('round',x,ky,kw,kh,t,80); o.push({k:'line', x:640, y:Y0+th2, w:Math.round(x+kw/2-640), h:Math.round(ky-Y0-th2), line:'fg', sw:4}); }); } }
  else { var sw2=AW/n, sh2=AH/n; items.forEach(function(t,i){ box('rect',X0+i*sw2,Y0+AH-(i+1)*sh2,sw2-10,(i+1)*sh2,t,100-Math.round(i*40/Math.max(1,n-1))); }); }
  return o; }
$('smOk').onclick=function(){ var s=deck.slides[cur]; if(!s) return closeDlg('smartDlg',null); var items=$('smIn').value.split('\n').map(function(x){ return x.replace(/^\s*[-*•·\d.)]+\s*/,'').trim(); }).filter(Boolean).slice(0,8);
  var b=$('smPick').querySelector('.on'), type=b?b.dataset.t:'process'; if(items.length<(type==='tree'?2:1)) return toast(T(type==='tree'?'두 줄 이상 써 주세요 (첫 줄이 맨 위)':'한 줄에 하나씩 써 주세요'));
  var raw=smartEls(type,items); if(s.els.length+raw.length>80) return toast(T('도형이 너무 많아요'));
  pushUndo(); var gid=raw.length>1?uid():'', ids=[]; raw.forEach(function(r){ r.id=uid(); r.g=gid; var e=fixEl(r); if(e){ s.els.push(e); ids.push(e.id); } });
  if($('smClear').checked&&!$('smClearRow').hidden){ s.bullets=[]; s.left=[]; s.right=[]; }
  selK=gid?'g:'+gid:ids.length?'e:'+ids[0]:null; closeDlg('smartDlg',null); changed(); toast(T('스마트아트를 넣었어요. 하나로 묶여 있어서 같이 움직이고, 두 번 누르면 글을 고쳐요')); };

/* ---------- recording a talk: the screen (this tab) and the microphone go into a .webm file while presenting; it downloads when the show ends ---------- */
var rec=null;
function recStart(){ if(rec) return recStop(); if(!deck.slides.length||gen||busyOn) return;
  if(!navigator.mediaDevices||!navigator.mediaDevices.getDisplayMedia||!window.MediaRecorder) return toast(T('이 브라우저에서는 녹화할 수 없어요 (컴퓨터의 크롬·엣지에서 돼요)'));
  var from=cur; toast(T('녹화할 화면으로 "이 탭"을 골라 주세요'));
  navigator.mediaDevices.getDisplayMedia({video:{frameRate:30}, audio:true, preferCurrentTab:true, selfBrowserSurface:'include'}).then(function(scr){
    return navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true, noiseSuppression:true}}).catch(function(){ return null; }).then(function(mic){
      var tracks=scr.getVideoTracks().slice(), ac=null, aud=scr.getAudioTracks().length||mic;
      if(aud){ try{ ac=new (window.AudioContext||window.webkitAudioContext)(); var dst=ac.createMediaStreamDestination(); if(scr.getAudioTracks().length) ac.createMediaStreamSource(new MediaStream(scr.getAudioTracks())).connect(dst); if(mic) ac.createMediaStreamSource(mic).connect(dst); tracks=tracks.concat(dst.stream.getAudioTracks()); }catch(x){ ac=null; } }
      var mime=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm','video/mp4'].filter(function(m){ return MediaRecorder.isTypeSupported(m); })[0]||'';
      var mr=new MediaRecorder(new MediaStream(tracks),mime?{mimeType:mime}:{}), parts=[];
      rec={mr:mr, all:[scr,mic], ac:ac, t0:Date.now()};
      mr.ondataavailable=function(ev){ if(ev.data&&ev.data.size) parts.push(ev.data); };
      mr.onstop=function(){ var ty=(mr.mimeType||'video/webm').split(';')[0], blob=new Blob(parts,{type:ty}); if(blob.size) download(blob,fileName(deck.name)+' '+T('녹화')+(ty==='video/mp4'?'.mp4':'.webm')); toast(T('녹화 파일을 받았어요')); };
      scr.getVideoTracks()[0].addEventListener('ended',function(){ recStop(); });
      mr.start(1000); $('pRec').hidden=false; present(from); }); }).catch(function(){ toast(T('녹화를 시작하지 않았어요')); }); }
function recStop(){ if(!rec) return; var r=rec; rec=null; $('pRec').hidden=true; try{ if(r.mr.state!=='inactive') r.mr.stop(); }catch(x){} setTimeout(function(){ r.all.forEach(function(st){ if(st) st.getTracks().forEach(function(tk){ tk.stop(); }); }); if(r.ac) try{ r.ac.close(); }catch(x){} },300); }
window.FSLC={
  state:function(){ var s=deck&&deck.slides[cur], sh=selShape(), n=s?selEls(s).length:0, busy=gen||busyOn;
    return {slide:!!s, busy:busy, gen:gen, editor:!$('editor').hidden, pres:pr.on, lay:s?s.layout:'', ai:!!s&&AILAYS.indexOf(s.layout)>=0, hide:!!(s&&s.hide), link:!!(s&&s.link),
      fp:fp.on, sel:!!(s&&selK), nSel:n, group:selK==='m'&&n>=2, ungroup:isMany(selK)&&selK!=='m'&&n>0, txt:!!(s&&tfList(s).length), tf:tfState(), shape:!!sh, pic:!!(sh&&sh.k==='pic'), pimg:!!(sh&&sh.k==='pic'||selK==='img'&&s&&s.img), alt:!!(sh||selK==='img'&&s&&s.img), line:!!(sh&&isLine(sh)), conn:!!(s&&selK&&connPick(s,selK)), clip:!!readClip(), nums:!!(deck&&deck.nums), footer:!!(deck&&deck.footer), master:!!(deck&&deck.master&&deck.master.on), auto:!!(deck&&deck.auto&&deck.auto.on), rec:!!rec}; },
  deck:deckAct, opt:optAct,
  optMenu:function(part,btn){ if(!deck.slides.length||gen||busyOn) return; blurEdit(); drawOptMenu(part); openMenu($('optMenu'),btn); },
  elMenu:function(kind,btn){ if(!deck.slides[cur]||gen||busyOn) return; blurEdit(); drawElMenu(kind); openMenu($('elMenu'),btn); },
  alt:openAlt, tfToggle:tfToggle,
  objPic:function(){ if(!deck.slides.length||gen||busyOn) return; blurEdit(); FFOBJ.open(function(f){ putPictures([f]); }); },
  addShape:addShape, media:openMedia, smart:openSmart, rec:recStart, recording:function(){ return !!rec; }, connect:connStart, fpaint:fpBtn, group:groupSel, ungroup:ungroupSel, copy:copySel, paste:function(){ pasteEl(); }, present:function(here){ present(here?cur:0); },
  live:function(){ var s=deck.slides[cur]; if(!s||gen||busyOn) return; if(s.layout==='live') openLive(); else { addSlide('live'); openLive(); } },
  setLayout:function(l){ setLayout(l); $('laySel').value=deck.slides[cur]?deck.slides[cur].layout:l; },
  rename:function(){ var n=$('deckName'); n.focus(); n.select(); }
};
window.__fsl={get lq(){ return lq; }, quizChoices:quizChoices, quizOk:quizOk, syncLinks:syncLinks, gridData:gridData, shareEncode:shareEncode, shareDecode:shareDecode, shareJSON:shareJSON, get deck(){ return deck; }, get store(){ return store; }, get cur(){ return cur; }, select:select, present:present, exitPresent:exitPresent, get pr(){ return pr; }, buildPPTX:buildPPTX, prepPics:prepPics, needPPTX:needPPTX, measure:measure, undo:doUndo, redo:doRedo, moveSlide:moveSlide};
})();
