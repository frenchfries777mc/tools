/* Fry Draw: a small vector drawing tool. Objects are plain SVG elements kept as data, so PNG / SVG export is exact. */
(function(){
'use strict';
var NS='http://www.w3.org/2000/svg', KEY='ffdraw.v1';
var $=function(id){ return document.getElementById(id); };
var stage=$('stage'), desk=$('desk');
var doc={w:1200,h:800,bg:'#ffffff',bgOn:true,name:'이름 없는 그림',objs:[],guides:[]};
var sel=[], tool='sel', zoom=1, uid=1, hist=[], hi=-1;
var st={fill:'#ffc93c',fillOn:false,stroke:'#1b2a49',sw:4,op:1,dash:0,sides:5,star:5,inner:45,round:0,sym:1,mirror:false,closed:false,cap:'round',join:'round',miter:4,mk1:'',mk2:'',mks:1,gap:0,smart:true,swT:'fill',swDel:false,gridType:'sq',bsize:14,bdyn:'auto',btaper:true,shp:'heart',trT:50,trN:1,trD:3,trInv:false,rulers:window.innerWidth>820,offr:10,arr:{mode:'grid',cols:3,rows:2,gx:20,gy:20,n:8,deg:360,pivot:'canvas'},grid:false,gridSize:50,snap:false,font:48,txt:'글자',sizeLock:true};
var PAT_SEL='spiro', patVals={}, patOpt={rainbow:true,fill:false,scale:100,rot:0};

function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function f(n){ return +(+n).toFixed(2); }
function f4(n){ return +(+n).toFixed(4); }
function toast(t){ var d=document.createElement('div'); d.className='toast'; d.textContent=t; document.body.appendChild(d); setTimeout(function(){ d.remove(); },2600); }
function el(tag,attrs){ var e=document.createElementNS(NS,tag); for(var k in attrs) e.setAttribute(k,attrs[k]); return e; }

/* ---------- model -> svg ---------- */
var IMGS={}, warned=0;
function oS(o){ return objStr(o); }
function gradStops(g){ return (g.st&&g.st.length>1)?g.st:[{o:0,c:g.c1},{o:1,c:g.c2}]; }
function gradDef(o){ var g=o.grad, id='g'+o.id, stp=gradStops(g).map(function(q){ return '<stop offset="'+f(q.o)+'" stop-color="'+esc(q.c)+'"'+(q.a!=null&&q.a<1?' stop-opacity="'+f(q.a)+'"':'')+'/>'; }).join('');
  if(g.t==='rad') return '<radialGradient id="'+id+'" cx="'+f(g.cx==null?50:g.cx)+'%" cy="'+f(g.cy==null?50:g.cy)+'%" r="'+f(g.r||70)+'%">'+stp+'</radialGradient>';
  var an=(g.ang||0)*Math.PI/180, c=Math.cos(an), sn=Math.sin(an);
  return '<linearGradient id="'+id+'" x1="'+f(.5-c/2)+'" y1="'+f(.5-sn/2)+'" x2="'+f(.5+c/2)+'" y2="'+f(.5+sn/2)+'">'+stp+'</linearGradient>'; }
function patDef(o){ var p=o.pat, sz=p.s||12, w=Math.min(p.w||sz/3,sz), c=esc(p.c||'#000000'), bg=p.bg?'<rect width="'+sz+'" height="'+sz+'" fill="'+esc(p.bg)+'"/>':'', b;
  if(p.t==='dots') b='<circle cx="'+f(sz/2)+'" cy="'+f(sz/2)+'" r="'+f(w/2)+'" fill="'+c+'"/>';
  else if(p.t==='cross') b='<rect width="'+f(w)+'" height="'+sz+'" fill="'+c+'"/><rect width="'+sz+'" height="'+f(w)+'" fill="'+c+'"/>';
  else if(p.t==='check') b='<rect width="'+f(sz/2)+'" height="'+f(sz/2)+'" fill="'+c+'"/><rect x="'+f(sz/2)+'" y="'+f(sz/2)+'" width="'+f(sz/2)+'" height="'+f(sz/2)+'" fill="'+c+'"/>';
  else b='<rect width="'+f(w)+'" height="'+sz+'" fill="'+c+'"/>';
  return '<pattern id="p'+o.id+'" width="'+sz+'" height="'+sz+'" patternUnits="userSpaceOnUse" patternTransform="rotate('+f(p.a||0)+')">'+bg+b+'</pattern>'; }
function hasAdj(o){ return (o.fbr!=null&&o.fbr!==100)||(o.fct!=null&&o.fct!==100)||(o.fsa!=null&&o.fsa!==100)||!!o.fhue||!!o.fgr||!!o.finv; }
function filtDef(o){ var b=+o.blur||0, inner='';
  if(hasAdj(o)){ var br=(o.fbr==null?100:o.fbr)/100, ct=(o.fct==null?100:o.fct)/100, sl=ct*br, ic=(.5-.5*ct)*br, fn=function(t){ return '<feFunc'+t+' type="linear" slope="'+f4(sl)+'" intercept="'+f4(ic)+'"/>'; };
    if(br!==1||ct!==1) inner+='<feComponentTransfer>'+fn('R')+fn('G')+fn('B')+'</feComponentTransfer>';
    if(o.fsa!=null&&o.fsa!==100) inner+='<feColorMatrix type="saturate" values="'+f4(o.fsa/100)+'"/>';
    if(o.fhue) inner+='<feColorMatrix type="hueRotate" values="'+f(o.fhue)+'"/>';
    if(o.fgr){ var g=o.fgr/100, a1=1-g+g*.2126, a2=g*.7152, a3=g*.0722, rowx=function(x,y,z){ return f4(x)+' '+f4(y)+' '+f4(z)+' 0 0'; }; inner+='<feColorMatrix type="matrix" values="'+rowx(1-g+g*.2126,g*.7152,g*.0722)+' '+rowx(g*.2126,1-g+g*.7152,g*.0722)+' '+rowx(g*.2126,g*.7152,1-g+g*.0722)+' 0 0 0 1 0"/>'; }
    if(o.finv){ var iv=o.finv/100, tb=f4(iv)+' '+f4(1-iv), ft=function(t){ return '<feFunc'+t+' type="table" tableValues="'+tb+'"/>'; }; inner+='<feComponentTransfer>'+ft('R')+ft('G')+ft('B')+'</feComponentTransfer>'; } }
  if(b>0) inner+='<feGaussianBlur stdDeviation="'+f(b)+'" result="bl"/>';
  if(o.shadow) inner+='<feDropShadow '+(b>0?'in="bl" ':'')+'dx="'+f(o.sdx==null?6:o.sdx)+'" dy="'+f(o.sdy==null?6:o.sdy)+'" stdDeviation="'+f(o.sdb==null?5:o.sdb)+'" flood-color="'+esc(o.sdc||'#000000')+'" flood-opacity="'+f(o.sdo==null?.5:o.sdo)+'"/>';
  return '<filter id="f'+o.id+'" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB">'+inner+'</filter>'; }
var MK={arrow:['M0 0L10 5L0 10z',4,1],open:['M1 1L9 5L1 9',8,0],dot:['M5 .5a4.5 4.5 0 1 0 .01 0z',5,1],diamond:['M5 0L10 5L5 10L0 5z',5,1],bar:['M4 0h2v10h-2z',5,1]};
function mkDef(o,pos,type,col){ var m=MK[type]; if(!m) return ''; var z=3*(o.mks||1);
  return '<marker id="m'+pos+o.id+'" viewBox="0 0 10 10" refX="'+m[1]+'" refY="5" markerUnits="strokeWidth" markerWidth="'+f(z)+'" markerHeight="'+f(z)+'" orient="'+(pos==='s'?'auto-start-reverse':'auto')+'" overflow="visible"><path d="'+m[0]+'" '+(m[2]?'fill="'+esc(col)+'" stroke="none"':'fill="none" stroke="'+esc(col)+'" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"')+'/></marker>'; }
function objStr(o,nested){
  if(o.hid) return '';
  var a='', defs='';
  for(var k in o.a){ if(o.tp&&(k==='x'||k==='y')) continue; a+=' '+k+'="'+esc(o.a[k])+'"'; }
  var fv=o.fill; if(o.grad){ defs+=gradDef(o); fv='url(#g'+o.id+')'; } else if(o.pat){ defs+=patDef(o); fv='url(#p'+o.id+')'; }
  if(o.clip&&o.tag==='grp'){ defs+='<clipPath id="cp'+o.id+'">'+objStr(o.clip,true)+'</clipPath>'; a+=' clip-path="url(#cp'+o.id+')"'; }
  if(fv!=null) a+=' fill="'+esc(fv)+'"';
  if(o.stroke!=null) a+=' stroke="'+esc(o.stroke)+'"';
  if(o.sw!=null) a+=' stroke-width="'+f(o.sw)+'"';
  if(o.op!=null&&o.op<1) a+=' opacity="'+f(o.op)+'"';
  if(o.dash) a+=' stroke-dasharray="'+f(o.dash)+' '+f(o.gap>0?o.gap:o.dash*.8)+'"';
  if(o.tag!=='text'&&o.tag!=='g'&&o.tag!=='grp'){ a+=' stroke-linecap="'+(o.cap||'round')+'" stroke-linejoin="'+(o.join||'round')+'"'; if(o.join==='miter') a+=' stroke-miterlimit="'+f(o.miter||4)+'"'; }
  if(o.mk1||o.mk2){ var mc=(o.stroke&&o.stroke!=='none')?o.stroke:'#000000'; if(o.mk1){ defs+=mkDef(o,'s',o.mk1,mc); a+=' marker-start="url(#ms'+o.id+')"'; } if(o.mk2){ defs+=mkDef(o,'e',o.mk2,mc); a+=' marker-end="url(#me'+o.id+')"'; } }
  var sty=''; if(o.blend&&o.blend!=='normal') sty+='mix-blend-mode:'+esc(o.blend)+';'; if(o.tag==='text') sty+='white-space:pre;'; if(sty) a+=' style="'+sty+'"';
  if(o.blur>0||o.shadow||hasAdj(o)){ defs+=filtDef(o); a+=' filter="url(#f'+o.id+')"'; }
  if(o.lock&&!nested) a+=' pointer-events="none"';
  if(o.tag==='image') a+=' href="'+esc(IMGS[o.imgId]||'')+'"';
  var tf='';
  if(o.tx||o.ty) tf+='translate('+f(o.tx)+' '+f(o.ty)+') ';
  if(o.rot||(o.sx!=null&&(o.sx!==1||o.sy!==1))){ tf+='translate('+f(o.cx||0)+' '+f(o.cy||0)+') rotate('+f4(o.rot||0)+') scale('+f4(o.sx==null?1:o.sx)+' '+f4(o.sy==null?1:o.sy)+') translate('+f(-(o.cx||0))+' '+f(-(o.cy||0))+')'; }
  if(tf) a+=' transform="'+tf.trim()+'"';
  var tag=o.tag==='grp'?'g':o.tag, idA=nested?'':' data-id="'+o.id+'"';
  if(tag==='text'){ var fs0=+o.a['font-size']||48, ln=String(o.txt||'').split('\n'), body;
    if(o.tp){ defs+='<path id="tp'+o.id+'" d="'+esc(o.tp)+'" fill="none" stroke="none"/>'; body='<textPath href="#tp'+o.id+'" startOffset="'+f(o.tpo||0)+'%">'+esc(ln.join(' '))+'</textPath>'; }
    else if(ln.length>1) body=ln.map(function(l,i){ return '<tspan x="'+esc(o.a.x)+'" dy="'+(i?f((o.lh||1.2)*fs0):0)+'">'+esc(l)+'</tspan>'; }).join('');
    else body=esc(ln[0]);
    return defs+'<text'+a+idA+'>'+body+'</text>'; }
  if(tag==='g') return defs+'<g'+a+idA+'>'+(o.tag==='grp'?(o.kids||[]).map(function(q){ return objStr(q,true); }).join(''):(o.inner||''))+'</g>';
  return defs+'<'+tag+a+idA+'/>';
}
function bgStr(){ return doc.bgOn?'<rect width="'+doc.w+'" height="'+doc.h+'" fill="'+esc(doc.bg)+'" data-bg="1"/>':''; }
function syncPage(){ if(doc.pages) doc.pages[doc.pi]={n:doc.pn||('페이지 '+(doc.pi+1)),w:doc.w,h:doc.h,bg:doc.bg,bgOn:doc.bgOn,objs:doc.objs,guides:doc.guides||[]}; }
function gotoPage(i){ if(doc.edit){ toast('심볼 고치기를 끝낸 뒤에 옮길 수 있어요'); return; } if(!doc.pages||i<0||i>=doc.pages.length||i===doc.pi) return; syncPage(); var r=doc.pages[i]; doc.pi=i; doc.pn=r.n; doc.w=r.w; doc.h=r.h; doc.bg=r.bg; doc.bgOn=r.bgOn; doc.objs=r.objs; doc.guides=r.guides||[]; sel=[]; commit(); fit(); }
function pageOp(op,arg){ if(doc.edit){ toast('심볼 고치기를 끝낸 뒤에 할 수 있어요'); return; } if(!doc.pages){ doc.pages=[]; doc.pi=0; doc.pn='페이지 1'; syncPage(); } syncPage(); var pg=doc.pages, i=doc.pi;
  if(op==='add'){ pg.push({n:'페이지 '+(pg.length+1),w:doc.w,h:doc.h,bg:doc.bg,bgOn:doc.bgOn,objs:[],guides:[]}); gotoPage(pg.length-1); return; }
  if(op==='dup'){ var cp=JSON.parse(JSON.stringify(pg[i])); cp.n=cp.n+' 복사'; cp.objs.forEach(function(o){ o.id=uid++; }); pg.splice(i+1,0,cp); gotoPage(i+1); return; }
  if(op==='del'){ if(pg.length<2){ toast('페이지가 하나뿐이에요'); return; } pg.splice(i,1); var j=Math.min(i,pg.length-1); var r=pg[j]; doc.pi=j; doc.pn=r.n; doc.w=r.w; doc.h=r.h; doc.bg=r.bg; doc.bgOn=r.bgOn; doc.objs=r.objs; doc.guides=r.guides||[]; if(pg.length===1) doc.pages=null; sel=[]; commit(); fit(); return; }
  if(op==='left'||op==='right'){ var k=op==='left'?i-1:i+1; if(k<0||k>=pg.length) return; var t=pg[i]; pg[i]=pg[k]; pg[k]=t; doc.pi=k; commit(); return; }
  if(op==='send'||op==='copy'){ var to=+arg; if(isNaN(to)||to===i||!pg[to]){ toast('다른 페이지를 골라 주세요'); return; } var so=selObjs(); if(!so.length){ toast('보낼 도형을 골라 주세요'); return; }
    so.forEach(function(o){ var c=op==='copy'?cloneObj(o):o; if(op==='send') doc.objs=doc.objs.filter(function(q){ return q!==o; }); pg[to].objs.push(c); }); if(op==='send') sel=[]; commit(); toast((to+1)+'페이지로 '+(op==='copy'?'복사':'보')+'냈어요'); } }
function pagesUI(){ var pg=doc.pages||[{n:doc.pn||'페이지 1'}], n=pg.length, cur=doc.pi||0;
  var h='<div class="sec"><h4>페이지 ('+(cur+1)+' / '+n+')</h4><div class="swr">'+pg.map(function(p,i){ return '<button class="tbtn'+(i===cur?' on':'')+'" data-pgo="goto:'+i+'" title="'+esc(p.n||'')+'">'+(i+1)+'</button>'; }).join('')+'<button class="tbtn" data-pgo="add" title="새 페이지">＋</button></div>';
  h+='<div class="row" style="margin-top:8px"><label>이름</label><input type="text" data-pgn="1" value="'+esc(doc.pn||'페이지 '+(cur+1))+'" maxlength="30"></div><div class="btns"><button class="tbtn" data-pgo="dup">복제</button><button class="tbtn" data-pgo="left"'+(cur<1?' disabled':'')+'>◀ 앞으로</button><button class="tbtn" data-pgo="right"'+(cur>=n-1?' disabled':'')+'>뒤로 ▶</button><button class="tbtn" data-pgo="del"'+(n<2?' disabled':'')+'>지우기</button></div>';
  if(n>1&&sel.length) h+='<div class="row"><label>고른 도형</label><select id="pgTo">'+pg.map(function(p,i){ return i===cur?'':'<option value="'+i+'">'+(i+1)+'. '+esc(p.n||'')+'</option>'; }).join('')+'</select></div><div class="btns"><button class="tbtn" data-pgo="send">그 페이지로 보내기</button><button class="tbtn" data-pgo="copy">복사해서 보내기</button></div>';
  return h+'<div class="note">페이지마다 크기와 그림이 따로예요. 받을 때 \'모든 페이지\'를 고를 수 있어요.</div></div>'; }
function buildSvg(opt){ opt=opt||{}; var box=opt.box||{x:0,y:0,w:doc.w,h:doc.h}, objs=opt.objs||doc.objs, sc=opt.scale||1;
  var meta=opt.embed?'<metadata id="fdraw-data">'+btoa(unescape(encodeURIComponent(snap(true))))+'</metadata>':'';
  var bgOn=opt.bgOn!=null?opt.bgOn:doc.bgOn, bgc=opt.bgc||doc.bg, bg=(opt.bg!==false&&bgOn)?'<rect x="'+f(box.x)+'" y="'+f(box.y)+'" width="'+f(box.w)+'" height="'+f(box.h)+'" fill="'+esc(bgc)+'" data-bg="1"/>':'';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+f(box.x)+' '+f(box.y)+' '+f(box.w)+' '+f(box.h)+'" width="'+Math.round(box.w*sc)+'" height="'+Math.round(box.h*sc)+'">'+meta+bg+objs.map(oS).join('')+'</svg>'; }
function docSvg(forExport,embed){ return buildSvg({embed:embed}); }
function byId(id){ for(var i=0;i<doc.objs.length;i++) if(doc.objs[i].id===id) return doc.objs[i]; }
function render(){
  stage.setAttribute('viewBox','0 0 '+doc.w+' '+doc.h);
  stage.style.width=f(doc.w*zoom)+'px'; stage.style.height=f(doc.h*zoom)+'px';
  var bgp=doc.bgOn?'':'<defs><pattern id="chk" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#ffffff"/><rect width="10" height="10" fill="#d9d9d9"/><rect x="10" y="10" width="10" height="10" fill="#d9d9d9"/></pattern></defs><rect width="'+doc.w+'" height="'+doc.h+'" fill="url(#chk)"/>';
  stage.innerHTML=bgp+bgStr()+'<g id="gobj">'+doc.objs.map(oS).join('')+'</g><g id="ggrid" pointer-events="none"></g><g id="gguide"></g><g id="ov"></g>';
  var need=false;
  doc.objs.forEach(function(o){ if(o.cx==null){ var e=stage.querySelector('[data-id="'+o.id+'"]'); if(e){ try{ var b=e.getBBox(); o.cx=b.x+b.width/2; o.cy=b.y+b.height/2; need=true; }catch(x){ o.cx=0; o.cy=0; } } } });
  if(need) stage.querySelector('#gobj').innerHTML=doc.objs.map(oS).join('');
  drawGrid(); drawGuides(); drawOv(); drawRulers();
  $('zl').textContent=Math.round(zoom*100)+'%';
  $('bUndo').disabled=hi<=0; $('bRedo').disabled=hi>=hist.length-1; var bpg=$('bPg'); if(bpg) bpg.textContent='📄 '+((doc.pi||0)+1)+'/'+(doc.pages?doc.pages.length:1);
}
function drawGrid(){
  var g=$('ggrid'); if(!g) return; g.innerHTML='';
  if(!st.grid) return; var sz=st.gridSize, d='', gt=st.gridType;
  if(gt==='dots'){ for(var y0=sz;y0<doc.h;y0+=sz) for(var x0=sz;x0<doc.w;x0+=sz) d+='M'+x0+' '+y0+'h.01'; g.appendChild(el('path',{d:d,stroke:'#7a8296','stroke-opacity':'.8','stroke-width':3/zoom,'stroke-linecap':'round',fill:'none'})); return; }
  if(gt==='iso'){ var hh=sz*Math.sqrt(3)/2; for(var yy=hh;yy<doc.h;yy+=hh) d+='M0 '+f(yy)+'H'+doc.w; var run=doc.h*.57735;
    for(var jx=Math.floor(-run/sz)-1;jx<=Math.ceil(doc.w/sz)+1;jx++){ d+='M'+f(jx*sz)+' 0L'+f(jx*sz+run)+' '+doc.h; d+='M'+f(jx*sz+run)+' 0L'+f(jx*sz)+' '+doc.h; }
    g.appendChild(el('path',{d:d,stroke:'#7a8296','stroke-opacity':'.4','stroke-width':1/zoom,fill:'none'})); return; }
  for(var x=sz;x<doc.w;x+=sz) d+='M'+x+' 0V'+doc.h; for(var y=sz;y<doc.h;y+=sz) d+='M0 '+y+'H'+doc.w;
  g.appendChild(el('path',{d:d,stroke:'#7a8296','stroke-opacity':'.45','stroke-width':1/zoom,fill:'none'}));
}
var gTmp=null;
function drawGuides(){ var g=$('gguide'); if(!g) return; g.innerHTML=''; if(doc.ghide) return; var u=1/zoom, all=(doc.guides||[]).concat(gTmp?[gTmp]:[]);
  all.forEach(function(q,i){ var vx=q.v==='x', a=vx?{x1:q.p,y1:0,x2:q.p,y2:doc.h}:{x1:0,y1:q.p,x2:doc.w,y2:q.p};
    g.appendChild(el('line',{x1:a.x1,y1:a.y1,x2:a.x2,y2:a.y2,stroke:'#19d3ff','stroke-width':u,'pointer-events':'none'}));
    if(q!==gTmp&&!doc.glock){ g.appendChild(el('line',{x1:a.x1,y1:a.y1,x2:a.x2,y2:a.y2,stroke:'transparent','stroke-width':8*u,'data-g':i,'pointer-events':'stroke',style:'cursor:'+(vx?'ew':'ns')+'-resize'})); } }); }
function niceStep(z){ var arr=[1,2,5,10,20,25,50,100,200,250,500,1000,2000,5000]; for(var i=0;i<arr.length;i++) if(arr[i]*z>=60) return arr[i]; return 10000; }
function drawRulers(){ var w=$('deskw'), rh=$('rh'), rv=$('rv'); if(!w||!rh) return; w.classList.toggle('norul',!st.rulers); if(!st.rulers) return;
  var dr=desk.getBoundingClientRect(), sr=stage.getBoundingClientRect(), dpr=window.devicePixelRatio||1, z=sr.width/doc.w;
  var cs=getComputedStyle(document.documentElement), col=cs.getPropertyValue('--dim').trim()||'#888', bgc=cs.getPropertyValue('--panel').trim()||'#111', ln=cs.getPropertyValue('--line').trim()||'#333';
  var W=Math.max(1,Math.round(dr.width)), Hh=Math.max(1,Math.round(dr.height));
  rh.width=W*dpr; rh.height=20*dpr; rv.width=20*dpr; rv.height=Hh*dpr; rh.style.height='20px'; rv.style.width='20px';
  var step=niceStep(z), minor=step/5;
  function paint(cv,horiz){ var x=cv.getContext('2d'); x.scale(dpr,dpr); x.fillStyle=bgc; x.fillRect(0,0,horiz?W:20,horiz?20:Hh); x.strokeStyle=ln; x.fillStyle=col; x.font='10px sans-serif'; x.lineWidth=1;
    var o0=horiz?sr.left-dr.left:sr.top-dr.top, lim=horiz?doc.w:doc.h, len=horiz?W:Hh;
    for(var v=0;v<=lim;v+=minor){ var p=o0+v*z; if(p<0||p>len) continue; var major=Math.abs(v/step-Math.round(v/step))<1e-6, tl=major?14:(Math.abs(v/(step/2)-Math.round(v/(step/2)))<1e-6?9:5);
      x.beginPath(); if(horiz){ x.moveTo(Math.round(p)+.5,20); x.lineTo(Math.round(p)+.5,20-tl); } else { x.moveTo(20,Math.round(p)+.5); x.lineTo(20-tl,Math.round(p)+.5); } x.stroke();
      if(major){ if(horiz) x.fillText(String(Math.round(v)),p+3,10); else { x.save(); x.translate(10,p+3); x.rotate(-Math.PI/2); x.fillText(String(Math.round(v)),-12,0); x.restore(); } } }
    x.setTransform(1,0,0,1,0,0); }
  paint(rh,true); paint(rv,false); }
function rulerDrag(e,v){ e.preventDefault(); var elx=e.currentTarget; elx.setPointerCapture&&elx.setPointerCapture(e.pointerId); gTmp={v:v,p:0};
  var mv=function(ev){ var r=stage.getBoundingClientRect(), z=r.width/doc.w; gTmp.p=f(v==='x'?(ev.clientX-r.left)/z:(ev.clientY-r.top)/z); drawGuides(); };
  var up=function(ev){ elx.removeEventListener('pointermove',mv); elx.removeEventListener('pointerup',up); var t=gTmp; gTmp=null; var lim=v==='x'?doc.w:doc.h, dr=desk.getBoundingClientRect();
    var inside=ev.clientX>=dr.left&&ev.clientX<=dr.right&&ev.clientY>=dr.top&&ev.clientY<=dr.bottom; if(inside&&t.p>=0&&t.p<=lim){ doc.guides=(doc.guides||[]).concat([t]); commit(); } else drawGuides(); };
  elx.addEventListener('pointermove',mv); elx.addEventListener('pointerup',up); mv(e); }

/* ---------- history / save ---------- */
function snap(full){ syncPage(); var o={syms:doc.syms||{},edit:doc.edit||null,pn:doc.pn,pi:doc.pi,pages:doc.pages?doc.pages.map(function(p,i){ return i===doc.pi?{n:p.n}:p; }):undefined,w:doc.w,h:doc.h,bg:doc.bg,bgOn:doc.bgOn,name:doc.name,objs:doc.objs,guides:doc.guides||[],uid:uid};
  if(full){ var im={}; var use=function(os){ os.forEach(function(x){ if(x.imgId!=null&&IMGS[x.imgId]) im[x.imgId]=IMGS[x.imgId]; if(x.kids) use(x.kids); }); }; use(doc.objs); Object.keys(doc.syms||{}).forEach(function(k){ use(doc.syms[k].kids||[]); }); if(doc.edit&&doc.edit.stash) use(doc.edit.stash); if(doc.pages) doc.pages.forEach(function(p,i){ if(i!==doc.pi&&p&&p.objs) use(p.objs); }); o.imgs=im; }
  return JSON.stringify(o); }
function load(s){ var o=JSON.parse(s); if(o.imgs) for(var ik in o.imgs) IMGS[ik]=o.imgs[ik]; doc.w=o.w; doc.h=o.h; doc.bg=o.bg; doc.bgOn=o.bgOn!==false; doc.name=o.name||'이름 없는 그림'; doc.objs=o.objs||[]; doc.guides=o.guides||[]; uid=Math.max(uid,o.uid||1); doc.objs.forEach(function(x){ if(x.id>=uid) uid=x.id+1; }); doc.syms=o.syms||{}; doc.edit=o.edit||null; doc.pages=o.pages||null; doc.pi=o.pi||0; doc.pn=o.pn||''; if(doc.pages){ if(doc.pi>=doc.pages.length) doc.pi=0; doc.pages.forEach(function(p,i){ if(i!==doc.pi&&p&&p.objs) p.objs.forEach(function(x){ if(x.id>=uid) uid=x.id+1; }); }); syncPage(); } }
var saveT;
function commit(){
  hist=hist.slice(0,hi+1); hist.push(snap()); if(hist.length>80) hist.shift(); hi=hist.length-1;
  clearTimeout(saveT); saveT=setTimeout(persist,400);
  render(); panel();
}
function undo(){ if(hi>0){ hi--; load(hist[hi]); sel=sel.filter(function(i){ return byId(i); }); persist(); render(); panel(); $('dname').value=doc.name; } }
function redo(){ if(hi<hist.length-1){ hi++; load(hist[hi]); persist(); render(); panel(); $('dname').value=doc.name; } }
function persist(){ try{ localStorage.setItem(KEY,snap(true)); }catch(e){ if(!warned){ warned=1; toast('저장 공간이 부족해요. 그림을 .fdraw 파일로 받아 두세요'); } } }

/* ---------- geometry helpers ---------- */
function P(e){ var r=stage.getBoundingClientRect(); var p={x:(e.clientX-r.left)*doc.w/r.width,y:(e.clientY-r.top)*doc.h/r.height}; if(st.snap){ var sz=st.gridSize;
    if(st.gridType==='iso'){ var hh=sz*Math.sqrt(3)/2, r0=Math.round(p.y/hh), bd=1e18, bp=null; for(var rr=r0-1;rr<=r0+1;rr++){ var off=(((rr%2)+2)%2)?sz/2:0, cc=Math.round((p.x-off)/sz), qx=cc*sz+off, qy=rr*hh, dd=(qx-p.x)*(qx-p.x)+(qy-p.y)*(qy-p.y); if(dd<bd){ bd=dd; bp={x:qx,y:qy}; } } p=bp; }
    else { p.x=Math.round(p.x/sz)*sz; p.y=Math.round(p.y/sz)*sz; } } return p; }
function newObj(tag,a,extra){
  var o={id:uid++,tag:tag,a:a,fill:st.fillOn?st.fill:'none',stroke:st.stroke,sw:st.sw,op:st.op,dash:st.dash,tx:0,ty:0,rot:0,sx:1,sy:1};
  if(st.gap>0) o.gap=st.gap; if(st.cap!=='round') o.cap=st.cap; if(st.join!=='round') o.join=st.join; if(st.join==='miter') o.miter=st.miter;
  if((tag==='line'||tag==='path'||tag==='polyline')&&(st.mk1||st.mk2)){ o.mk1=st.mk1; o.mk2=st.mk2; if(st.mks!==1) o.mks=st.mks; }
  if(tag==='text'){ o.fill=st.fill; o.stroke='none'; o.sw=0; }
  if(extra) for(var k in extra) o[k]=extra[k];
  return o;
}
function smooth(pts,closed){
  if(pts.length<2) return '';
  if(pts.length===2) return 'M'+f(pts[0].x)+' '+f(pts[0].y)+'L'+f(pts[1].x)+' '+f(pts[1].y);
  var d='M'+f(pts[0].x)+' '+f(pts[0].y), n=pts.length;
  for(var i=0;i<(closed?n:n-1);i++){
    var p0=pts[(i-1+n)%n], p1=pts[i], p2=pts[(i+1)%n], p3=pts[(i+2)%n];
    if(!closed){ p0=pts[Math.max(i-1,0)]; p3=pts[Math.min(i+2,n-1)]; }
    d+='C'+f(p1.x+(p2.x-p0.x)/6)+' '+f(p1.y+(p2.y-p0.y)/6)+' '+f(p2.x-(p3.x-p1.x)/6)+' '+f(p2.y-(p3.y-p1.y)/6)+' '+f(p2.x)+' '+f(p2.y);
  }
  return d+(closed?'Z':'');
}
function symPts(pts){
  var n=Math.max(1,st.sym|0), cx=doc.w/2, cy=doc.h/2, out=[];
  for(var k=0;k<n;k++){
    var a=2*Math.PI*k/n, c=Math.cos(a), s=Math.sin(a);
    [false,true].forEach(function(m){ if(m&&!st.mirror) return;
      out.push(pts.map(function(p){ var x=(m?cx-(p.x-cx):p.x)-cx, y=p.y-cy; return {x:cx+x*c-y*s,y:cy+x*s+y*c}; })); });
  }
  return out;
}
function symPath(pts,closed){ return symPts(pts).map(function(l){ return smooth(l,closed); }).join(''); }
function polyPts(cx,cy,r,n,rot0){ var a=[]; for(var i=0;i<n;i++){ var t=rot0+2*Math.PI*i/n; a.push([cx+r*Math.cos(t),cy+r*Math.sin(t)]); } return a; }
function ptsStr(a){ return a.map(function(p){ return f(p[0])+','+f(p[1]); }).join(' '); }
var SHAPES={heart:['하트','M.5 .92 C.1 .62 0 .42 0 .28 C0 .1 .14 0 .3 0 C.4 0 .47 .06 .5 .15 C.53 .06 .6 0 .7 0 C.86 0 1 .1 1 .28 C1 .42 .9 .62 .5 .92Z'],
 arrow:['화살표','M0 .35 L.6 .35 L.6 .08 L1 .5 L.6 .92 L.6 .65 L0 .65Z'],chevron:['꺾쇠','M0 0 L.6 0 L1 .5 L.6 1 L0 1 L.4 .5Z'],cross:['더하기','M.35 0 L.65 0 L.65 .35 L1 .35 L1 .65 L.65 .65 L.65 1 L.35 1 L.35 .65 L0 .65 L0 .35 L.35 .35Z'],
 bubble:['말풍선','M.1 0 L.9 0 Q1 0 1 .1 L1 .6 Q1 .7 .9 .7 L.45 .7 L.2 1 L.25 .7 L.1 .7 Q0 .7 0 .6 L0 .1 Q0 0 .1 0Z'],
 cloud:['구름','M.25 .85 C.1 .85 0 .75 0 .6 C0 .45 .1 .37 .22 .38 C.25 .18 .4 .08 .55 .13 C.65 .02 .88 .1 .9 .32 C1 .36 1 .5 1 .6 C1 .75 .92 .85 .75 .85Z'],
 drop:['물방울','M.5 0 C.5 0 .05 .5 .05 .68 C.05 .87 .25 1 .5 1 C.75 1 .95 .87 .95 .68 C.95 .5 .5 0 .5 0Z'],bolt:['번개','M.62 0 L.12 .56 L.45 .56 L.33 1 L.88 .4 L.55 .4Z'],
 half:['반원','M0 1 C0 .45 .22 0 .5 0 C.78 0 1 .45 1 1Z'],ring:['고리','M.5 0 C.78 0 1 .22 1 .5 C1 .78 .78 1 .5 1 C.22 1 0 .78 0 .5 C0 .22 .22 0 .5 0Z M.5 .22 C.35 .22 .22 .35 .22 .5 C.22 .65 .35 .78 .5 .78 C.65 .78 .78 .65 .78 .5 C.78 .35 .65 .22 .5 .22Z'],
 banner:['리본','M0 .2 L1 .2 L.9 .5 L1 .8 L0 .8 L.1 .5Z'],moon:['달','M.6 0 C.3 .05 .1 .25 .1 .5 C.1 .75 .3 .95 .6 1 C.45 .85 .38 .68 .38 .5 C.38 .32 .45 .15 .6 0Z'],
 check:['체크','M.05 .55 L.2 .4 L.4 .6 L.8 .15 L.95 .3 L.4 .9Z'],trap:['사다리꼴','M.2 0 L.8 0 L1 1 L0 1Z'],para:['평행사변형','M.25 0 L1 0 L.75 1 L0 1Z'],
 gear:['톱니','']};
(function(){ var pts=[], n=10; for(var i=0;i<n*4;i++){ var a=2*Math.PI*(i-.5)/(n*4)-Math.PI/2, k=i%4, r=(k===0||k===1)?.5:.38; pts.push([.5+r*Math.cos(a),.5+r*Math.sin(a)]); } SHAPES.gear[1]='M'+pts.map(function(p){ return f4(p[0])+' '+f4(p[1]); }).join('L')+'Z'; })();
function scaleD(d,x0,y0,w,h){ var tk=String(d).match(/[A-Za-z]|-?\d*\.?\d+/g), out='', k=0; tk.forEach(function(t){ if(/[A-Za-z]/.test(t)){ out+=t; k=0; } else { out+=f(k%2===0?x0+parseFloat(t)*w:y0+parseFloat(t)*h)+' '; k++; } }); return out.replace(/ ([A-Za-z])/g,'$1'); }
function shapeFor(t,p0,p1,shift){
  var dx=p1.x-p0.x, dy=p1.y-p0.y;
  if(t==='shape'){ if(shift){ var ms=Math.max(Math.abs(dx),Math.abs(dy)); dx=Math.sign(dx||1)*ms; dy=Math.sign(dy||1)*ms; } var sh=SHAPES[st.shp]||SHAPES.heart; return {tag:'path',a:{d:scaleD(sh[1],Math.min(p0.x,p0.x+dx),Math.min(p0.y,p0.y+dy),Math.abs(dx),Math.abs(dy)),'fill-rule':'evenodd'},shp:1}; }
  if(t==='line'){ if(shift){ var an=Math.round(Math.atan2(dy,dx)/(Math.PI/12))*Math.PI/12, l=Math.hypot(dx,dy); p1={x:p0.x+l*Math.cos(an),y:p0.y+l*Math.sin(an)}; } return {tag:'line',a:{x1:f(p0.x),y1:f(p0.y),x2:f(p1.x),y2:f(p1.y)}}; }
  if(t==='rect'){ if(shift){ var m=Math.max(Math.abs(dx),Math.abs(dy)); dx=Math.sign(dx||1)*m; dy=Math.sign(dy||1)*m; }
    var a={x:f(Math.min(p0.x,p0.x+dx)),y:f(Math.min(p0.y,p0.y+dy)),width:f(Math.abs(dx)),height:f(Math.abs(dy))}; if(st.round) a.rx=f(Math.min(a.width,a.height)*st.round/200); return {tag:'rect',a:a}; }
  if(t==='ellipse'){ if(shift){ var m2=Math.max(Math.abs(dx),Math.abs(dy)); dx=Math.sign(dx||1)*m2; dy=Math.sign(dy||1)*m2; }
    return {tag:'ellipse',a:{cx:f(p0.x+dx/2),cy:f(p0.y+dy/2),rx:f(Math.abs(dx)/2),ry:f(Math.abs(dy)/2)}}; }
  var r=Math.hypot(dx,dy), rot=Math.atan2(dy,dx);
  if(t==='poly') return {tag:'polygon',a:{points:ptsStr(polyPts(p0.x,p0.y,r,st.sides,rot))}};
  if(t==='star'){ var n=st.star, pts=[]; for(var i=0;i<n*2;i++){ var rr=i%2?r*st.inner/100:r, tt=rot+Math.PI*i/n; pts.push([p0.x+rr*Math.cos(tt),p0.y+rr*Math.sin(tt)]); } return {tag:'polygon',a:{points:ptsStr(pts)}}; }
  return null;
}

/* ---------- pointer interaction ---------- */
var drag=null, tmp=null, curvePts=[], bezPts=[], nodeSel=-1;
function setTool(t){ tool=t; curvePts=[]; bezPts=[]; nodeSel=-1; tmp=null; stage.style.cursor=t==='sel'?'default':(t==='hand'?'grab':'crosshair'); renderTools(); drawOv(); panel(); }
function targetId(e){ var n=e.target; while(n&&n!==stage){ if(n.getAttribute&&n.getAttribute('data-id')) return +n.getAttribute('data-id'); n=n.parentNode; } return null; }
function ovEl(){ return $('ov'); }
stage.addEventListener('pointerdown',function(e){
  if(e.button>0) return; ptrs[e.pointerId]={x:e.clientX,y:e.clientY};
  if(e.pointerType==='touch'&&Object.keys(ptrs).length>=2){ stage.setPointerCapture&&stage.setPointerCapture(e.pointerId); startPinch(); return; }
  stage.setPointerCapture&&stage.setPointerCapture(e.pointerId);
  var p=P(e), id=targetId(e), h=e.target.getAttribute&&e.target.getAttribute('data-h');
  var gh=e.target.getAttribute&&e.target.getAttribute('data-gh'); if(gh&&tool==='sel'){ var gO=byId(sel[0]), gP=gO&&gradPts(gO); if(gP){ drag={k:'gh',o:gO,w:gh,bb:gP.bb,m:gP.m,moved:false}; return; } }
  var gg=e.target.getAttribute&&e.target.getAttribute('data-g'); if(gg!=null&&tool==='sel'&&doc.guides[+gg]){ drag={k:'guide',i:+gg}; return; }
  if(tool==='hand'){ drag={k:'pan',x:e.clientX,y:e.clientY,sl:desk.scrollLeft,st:desk.scrollTop}; return; }
  if(tool==='bez'){ var bf=bezPts[0], bl=bezPts[bezPts.length-1];
    if(bezPts.length>=2&&Math.hypot(p.x-bf.x,p.y-bf.y)<10/zoom){ finishBez(true); return; }
    if(bezPts.length>=2&&Math.hypot(p.x-bl.x,p.y-bl.y)<6/zoom){ finishBez(false); return; }
    var np={x:p.x,y:p.y}; bezPts.push(np); drag={k:'bez',pt:np}; drawOv(); return; }
  if(tool==='node'){ var nn=e.target.getAttribute&&e.target.getAttribute('data-n'), nhh=e.target.getAttribute&&e.target.getAttribute('data-nh'), o3=byId(sel[0]);
    if(nhh&&o3&&o3.pts&&nodeSel>=0){ drag={k:'nh',o:o3,i:nodeSel,w:nhh,moved:false}; return; }
    if(nn!=null&&o3&&o3.pts){ nodeSel=+nn; drag={k:'node',o:o3,i:+nn,moved:false}; drawOv(); panel(); return; }
    if(id==null&&o3&&o3.pts&&nearNode(o3,nodePt(o3,e))) return;
    nodeSel=-1; sel=(id!=null&&!(byId(id)||{}).lock)?[id]:[]; drawOv(); panel(); return; }
  if(tool==='sel'){
    if(h&&sel.length){ var bx=selBox(); if(!bx) return; drag={k:'rs',h:h,box:bx,start:p,orig:bx.list.map(function(o){ return {o:o,tx:o.tx,ty:o.ty,sx:o.sx==null?1:o.sx,sy:o.sy==null?1:o.sy,rot:o.rot||0}; })};
      drag.pv=bx.list.length===1?{x:bx.list[0].tx+(bx.list[0].cx||0),y:bx.list[0].ty+(bx.list[0].cy||0)}:{x:bx.x+bx.w/2,y:bx.y+bx.h/2}; drag.a0=Math.atan2(p.y-drag.pv.y,p.x-drag.pv.x); return; }
    if(id!=null){ if(e.shiftKey){ var ix=sel.indexOf(id); if(ix>=0) sel.splice(ix,1); else sel.push(id); } else if(sel.indexOf(id)<0) sel=[id]; drag={k:'move',start:p,orig:sel.map(function(i){ var o=byId(i); return [o,o.tx,o.ty]; }),moved:false}; if(st.smart&&!st.snap){ drag.box=selBox(); drag.tg=snapTargets(); } }
    else { sel=[]; drag={k:'box',start:p}; }
    drawOv(); panel(); return;
  }
  if(tool==='erase'){ if(id!=null){ doc.objs=doc.objs.filter(function(o){ return o.id!==id; }); sel=sel.filter(function(i){ return i!==id; }); commit(); } drag={k:'erase'}; return; }
  if(tool==='eye'){ if(id!=null) eyedrop(id); return; }
  if(tool==='bucket'){ if(id!=null){ var o2=byId(id); o2.fill=st.fill; delete o2.grad; delete o2.pat; commit(); } return; }
  if(tool==='text'){ var tid0=id!=null?byId(id):null; if(tid0&&tid0.tag==='text'&&!tid0.lock){ sel=[id]; openTextEdit(tid0,false); return; }
    var tno=newObj('text',{x:f(p.x),y:f(p.y),'font-size':st.font,'font-family':"'Noto Sans KR',sans-serif"},{txt:st.txt}); doc.objs.push(tno); sel=[tno.id]; commit(); setTool('sel'); setTimeout(function(){ openTextEdit(tno,true); },0); return; }
  if(tool==='curve'){
    if(curvePts.length>1&&Math.hypot(p.x-curvePts[curvePts.length-1].x,p.y-curvePts[curvePts.length-1].y)<4/zoom*2){ finishCurve(); return; }
    curvePts.push(p); drawOv(); return;
  }
  if(tool==='brush'){ drag={k:'brush',pts:[{x:p.x,y:p.y,w:st.bsize,t:performance.now()}]}; tmp=el('path',{fill:st.stroke,opacity:st.op,'pointer-events':'none'}); ovEl().appendChild(tmp); tmp.setAttribute('d',brushD(drag.pts,false)); return; }
  if(tool==='pen'){ drag={k:'pen',pts:[p]}; tmp=el('path',{fill:'none',stroke:st.stroke,'stroke-width':st.sw,'stroke-linecap':'round','stroke-linejoin':'round',opacity:st.op}); ovEl().appendChild(tmp); return; }
  drag={k:'shape',start:p}; // line rect ellipse poly star
  tmp=el('g',{}); ovEl().appendChild(tmp);
});
stage.addEventListener('pointermove',function(e){
  if(ptrs[e.pointerId]){ ptrs[e.pointerId].x=e.clientX; ptrs[e.pointerId].y=e.clientY; } if(pinch){ movePinch(); return; }
  var p=P(e);
  if(!drag){ if(tool==='curve'&&curvePts.length){ drawOv(p); } else if(tool==='bez'&&bezPts.length){ drawOv(p); } return; }
  if(drag.k==='pan'){ desk.scrollLeft=drag.sl-(e.clientX-drag.x); desk.scrollTop=drag.st-(e.clientY-drag.y); return; }
  if(drag.k==='erase'){ var t=document.elementFromPoint(e.clientX,e.clientY), id=t&&t.closest?targetIdFrom(t):null; if(id!=null){ doc.objs=doc.objs.filter(function(o){ return o.id!==id; }); render(); } return; }
  if(drag.k==='move'){ var dx=p.x-drag.start.x, dy=p.y-drag.start.y; if(!drag.moved&&Math.hypot(dx,dy)<2/zoom) return; drag.moved=true;
    drag.gx=null; drag.gy=null;
    if(drag.box&&drag.tg&&!e.altKey){ var th=6/zoom, bq=drag.box, bs=null, bt=null;
      [bq.x+dx,bq.x+bq.w/2+dx,bq.x+bq.w+dx].forEach(function(c){ drag.tg.xs.forEach(function(t){ var d=t-c; if(Math.abs(d)<th&&(!bs||Math.abs(d)<Math.abs(bs.d))) bs={d:d,t:t}; }); });
      [bq.y+dy,bq.y+bq.h/2+dy,bq.y+bq.h+dy].forEach(function(c){ drag.tg.ys.forEach(function(t){ var d=t-c; if(Math.abs(d)<th&&(!bt||Math.abs(d)<Math.abs(bt.d))) bt={d:d,t:t}; }); });
      if(bs){ dx+=bs.d; drag.gx=bs.t; } if(bt){ dy+=bt.d; drag.gy=bt.t; } }
    drag.orig.forEach(function(r){ r[0].tx=r[1]+dx; r[0].ty=r[2]+dy; }); softRender(); return; }
  if(drag.k==='gh'){ gradDrag(drag,p,e.shiftKey); return; }
  if(drag.k==='guide'){ var gq=doc.guides[drag.i]; if(gq){ gq.p=f(gq.v==='x'?p.x:p.y); drawGuides(); } return; }
  if(drag.k==='bez'){ var bp=drag.pt, bdx=p.x-bp.x, bdy=p.y-bp.y; if(Math.hypot(bdx,bdy)>3/zoom){ bp.ox=p.x; bp.oy=p.y; bp.ix=bp.x-bdx; bp.iy=bp.y-bdy; bp.sm=true; } drawOv(); return; }
  if(drag.k==='nh'){ var lh=nodePt(drag.o,e), pt=drag.o.pts[drag.i], w=drag.w, ow=w==='i'?'o':'i'; pt[w+'x']=lh[0]; pt[w+'y']=lh[1]; drag.o.bz=true;
    if(e.altKey) pt.sm=false; else if(pt.sm&&pt[ow+'x']!=null){ var vx=pt.x-lh[0], vy=pt.y-lh[1], vl=Math.hypot(vx,vy)||1, ol=Math.hypot(pt[ow+'x']-pt.x,pt[ow+'y']-pt.y); pt[ow+'x']=pt.x+vx/vl*ol; pt[ow+'y']=pt.y+vy/vl*ol; }
    setD(drag.o); drag.moved=true; softRender(); return; }
  if(drag.k==='node'){ var l=nodePt(drag.o,e), pn=drag.o.pts[drag.i], ddx=l[0]-pn.x, ddy=l[1]-pn.y; pn.x=l[0]; pn.y=l[1]; ['i','o'].forEach(function(k){ if(pn[k+'x']!=null){ pn[k+'x']+=ddx; pn[k+'y']+=ddy; } }); setD(drag.o); drag.moved=true; softRender(); return; }
  if(drag.k==='rs'){ var b=drag.box, hh=drag.h;
    if(hh==='rot'){ var dg=(Math.atan2(p.y-drag.pv.y,p.x-drag.pv.x)-drag.a0)*180/Math.PI; if(e.shiftKey) dg=Math.round(dg/15)*15; var cs=Math.cos(dg*Math.PI/180), sn=Math.sin(dg*Math.PI/180);
      drag.orig.forEach(function(r){ var o=r.o, cx=o.cx||0, cy=o.cy||0, wx=r.tx+cx-drag.pv.x, wy=r.ty+cy-drag.pv.y; o.rot=r.rot+dg; o.tx=drag.pv.x+wx*cs-wy*sn-cx; o.ty=drag.pv.y+wx*sn+wy*cs-cy; }); softRender(); return; }
    var ax=b.x, ay=b.y, kx=1, ky=1, sx0=drag.start.x, sy0=drag.start.y;
    if(hh.indexOf('w')>=0) ax=b.x+b.w; if(hh.indexOf('n')>=0) ay=b.y+b.h;
    if(hh.indexOf('e')>=0||hh.indexOf('w')>=0){ var dx0=sx0-ax; if(Math.abs(dx0)>1e-3) kx=(p.x-ax)/dx0; }
    if(hh.indexOf('n')>=0||hh.indexOf('s')>=0){ var dy0=sy0-ay; if(Math.abs(dy0)>1e-3) ky=(p.y-ay)/dy0; }
    if(hh.length===2&&e.shiftKey){ var km=Math.max(Math.abs(kx),Math.abs(ky)); kx=(kx<0?-1:1)*km; ky=(ky<0?-1:1)*km; }
    if(Math.abs(kx)<.01) kx=kx<0?-.01:.01; if(Math.abs(ky)<.01) ky=ky<0?-.01:.01;
    drag.orig.forEach(function(r){ var o=r.o; o.tx=r.tx; o.ty=r.ty; o.sx=r.sx; o.sy=r.sy; if(!scaleAbout(o,ax,ay,kx,ky)){ var u=Math.sqrt(Math.abs(kx*ky)); scaleAbout(o,ax,ay,u*(kx<0?-1:1),u*(ky<0?-1:1)); } }); softRender(); return; }

  if(drag.k==='box'){ drag.cur=p; drawOv(); return; }
  if(drag.k==='brush'){ var bl=drag.pts[drag.pts.length-1], bdist=Math.hypot(p.x-bl.x,p.y-bl.y); if(bdist<1.5/zoom) return; var now=performance.now(), tw=st.bsize;
    if(st.bdyn==='auto'){ if(e.pointerType==='pen'&&e.pressure>0) tw=st.bsize*Math.min(1.25,.15+1.5*e.pressure); else { var sp=bdist*zoom/Math.max(1,now-bl.t); tw=st.bsize*Math.max(.3,Math.min(1.15,1.2-sp*.35)); } }
    drag.pts.push({x:p.x,y:p.y,w:bl.w*.6+tw*.4,t:now}); tmp.setAttribute('d',brushD(drag.pts,false)); return; }
  if(drag.k==='pen'){ var l=drag.pts[drag.pts.length-1]; if(Math.hypot(p.x-l.x,p.y-l.y)>2/zoom){ drag.pts.push(p); tmp.setAttribute('d',symPts(drag.pts).map(function(q){ return 'M'+q.map(function(z){ return f(z.x)+' '+f(z.y); }).join('L'); }).join('')); } return; }
  if(drag.k==='shape'){ var s=shapeFor(tool,drag.start,p,e.shiftKey); if(!s) return; tmp.innerHTML=''; var pe=el(s.tag,s.a); pe.setAttribute('fill',(st.fillOn||tool==='shape')?st.fill:'none'); pe.setAttribute('stroke',st.stroke); pe.setAttribute('stroke-width',st.sw); pe.setAttribute('opacity',st.op); tmp.appendChild(pe); }
});
function targetIdFrom(t){ var n=t; while(n&&n!==stage){ if(n.getAttribute&&n.getAttribute('data-id')) return +n.getAttribute('data-id'); n=n.parentNode; } return null; }
function softRender(){ var g=stage.querySelector('#gobj'); if(g) g.innerHTML=doc.objs.map(oS).join(''); drawOv(); }
stage.addEventListener('pointercancel',function(e){ delete ptrs[e.pointerId]; if(Object.keys(ptrs).length<2) pinch=null; if(drag&&drag.k!=='pan'){ try{ load(hist[hi]); render(); }catch(x){} } drag=null; if(tmp){ tmp.remove(); tmp=null; } });
stage.addEventListener('pointerup',function(e){
  delete ptrs[e.pointerId]; if(pinch){ if(Object.keys(ptrs).length<2) pinch=null; drag=null; return; }
  if(!drag) return; var d=drag; drag=null; var p=P(e);
  if(d.k==='move'){ if(d.moved) commit(); else panel(); return; }
  if(d.k==='gh'){ if(d.moved) commit(); else drawOv(); return; }
  if(d.k==='node'||d.k==='nh'){ if(d.moved) commit(); else drawOv(); return; }
  if(d.k==='bez'){ drawOv(); return; }
  if(d.k==='guide'){ var gq2=doc.guides[d.i]; if(gq2&&(gq2.p<0||gq2.p>(gq2.v==='x'?doc.w:doc.h))) doc.guides.splice(d.i,1); commit(); return; }
  if(d.k==='rs'){ commit(); return; }
  if(d.k==='pan'||d.k==='erase') return;
  if(d.k==='box'){ if(d.cur){ var x0=Math.min(d.start.x,d.cur.x),x1=Math.max(d.start.x,d.cur.x),y0=Math.min(d.start.y,d.cur.y),y1=Math.max(d.start.y,d.cur.y); sel=[];
      doc.objs.forEach(function(o){ if(o.hid||o.lock) return; var b=bbox(o); if(b&&b.x>=x0&&b.x+b.w<=x1&&b.y>=y0&&b.y+b.h<=y1) sel.push(o.id); }); }
    drawOv(); panel(); return; }
  if(d.k==='brush'){ if(tmp) tmp.remove(); tmp=null; var bo=newObj('path',{d:brushD(d.pts,st.btaper)}); bo.fill=st.stroke; bo.stroke='none'; bo.sw=0; bo.dash=0; bo.brush=true; doc.objs.push(bo); sel=[bo.id]; commit(); return; }
  if(d.k==='pen'){ if(tmp) tmp.remove(); tmp=null; if(d.pts.length<2) return; var pts=simplify(d.pts);
    var pex={fill:'none'}; if(st.sym<=1&&!st.mirror){ pex.pts=pts.map(function(q){ return {x:q.x,y:q.y}; }); pex.cl=false; pex.sh=false; } doc.objs.push(newObj('path',{d:symPath(pts,false)},pex)); sel=[doc.objs[doc.objs.length-1].id]; commit(); return; }
  if(d.k==='shape'){ if(tmp) tmp.remove(); tmp=null; if(Math.hypot(p.x-d.start.x,p.y-d.start.y)<3) return; var s=shapeFor(tool,d.start,p,e.shiftKey); if(!s) return;
    var o=newObj(s.tag,s.a); if(s.shp){ o.fill=st.fill; o.shp=st.shp; } doc.objs.push(o); sel=[o.id]; commit(); }
});
function brushD(P,taper){ var n=P.length, i, k, out=[];
  if(n===1){ var r0=P[0].w/2; for(k=0;k<14;k++){ var a0=2*Math.PI*k/14; out.push([P[0].x+r0*Math.cos(a0),P[0].y+r0*Math.sin(a0)]); } return 'M'+out.map(function(q){ return f(q[0])+' '+f(q[1]); }).join('L')+'Z'; }
  var Q=P.map(function(p,j){ if(j===0||j===n-1) return {x:p.x,y:p.y,w:p.w}; return {x:(P[j-1].x+2*p.x+P[j+1].x)/4,y:(P[j-1].y+2*p.y+P[j+1].y)/4,w:(P[j-1].w+2*p.w+P[j+1].w)/4}; });
  if(taper){ var kk=Math.min(8,Math.floor(n/2)); for(i=0;i<kk;i++){ var sc=(i+1)/(kk+1); Q[i].w*=.25+.75*sc; Q[n-1-i].w*=.12+.88*sc; } }
  var L=[], R=[], ang=[]; for(i=0;i<n;i++){ var a=Q[Math.max(0,i-1)], b=Q[Math.min(n-1,i+1)], tx=b.x-a.x, ty=b.y-a.y, tl=Math.hypot(tx,ty)||1; tx/=tl; ty/=tl; var r=Math.max(.2,Q[i].w/2); ang.push(Math.atan2(ty,tx)); L.push([Q[i].x-ty*r,Q[i].y+tx*r]); R.push([Q[i].x+ty*r,Q[i].y-tx*r]); }
  var poly=L.slice(), e=Q[n-1], re=Math.max(.2,e.w/2); for(k=1;k<8;k++){ var an=ang[n-1]+Math.PI/2-Math.PI*k/8; poly.push([e.x+re*Math.cos(an),e.y+re*Math.sin(an)]); }
  poly=poly.concat(R.slice().reverse()); var s0=Q[0], rs=Math.max(.2,s0.w/2); for(k=1;k<8;k++){ var an2=ang[0]-Math.PI/2-Math.PI*k/8; poly.push([s0.x+rs*Math.cos(an2),s0.y+rs*Math.sin(an2)]); }
  return 'M'+poly.map(function(q){ return f(q[0])+' '+f(q[1]); }).join('L')+'Z'; }
function simplify(pts){ var out=[pts[0]]; for(var i=1;i<pts.length-1;i++){ var l=out[out.length-1]; if(Math.hypot(pts[i].x-l.x,pts[i].y-l.y)>3/zoom) out.push(pts[i]); } out.push(pts[pts.length-1]); return out; }
stage.addEventListener('dblclick',function(e){ if(tool==='sel'||tool==='text'){ var dti=targetId(e), dto=dti!=null?byId(dti):null; if(!dto){ var pp=P(e); for(var qi=doc.objs.length-1;qi>=0&&!dto;qi--){ var sq=doc.objs[qi]; if(sq.tag!=='text'||sq.hid||sq.lock) continue; var sb=bbox(sq); if(sb&&pp.x>=sb.x&&pp.x<=sb.x+sb.w&&pp.y>=sb.y&&pp.y<=sb.y+sb.h) dto=sq; } } if(dto&&dto.tag==='text'&&!dto.lock){ sel=[dto.id]; openTextEdit(dto,false); return; } }
  if(tool==='curve'){ finishCurve(); return; }
  if(tool==='node'){ var o=byId(sel[0]); if(!o||!o.pts) return; var tg=document.elementFromPoint(e.clientX,e.clientY), nn=tg&&tg.getAttribute&&tg.getAttribute('data-n');
    if(nn!=null){ if(o.pts.length>(o.cl?3:2)){ o.pts.splice(+nn,1); nodeSel=-1; setD(o); commit(); } return; }
    if(addNode(o,nodePt(o,e))) commit(); } });
var txEd=null;
function openTextEdit(o,isNew){ if(txEd) txEd.fin(true); var e0=stage.querySelector('[data-id="'+o.id+'"]'); if(!e0) return; var r=e0.getBoundingClientRect(), fs=(+o.a['font-size']||48)*zoom*Math.abs(o.sy==null?1:o.sy);
  var ta=document.createElement('textarea'); ta.value=o.txt||''; ta.className='txed'; ta.spellcheck=false;
  var an=o.a['text-anchor']||'start'; ta.style.cssText='position:fixed;z-index:70;left:'+(r.left-6)+'px;top:'+(r.top-4)+'px;min-width:120px;width:'+Math.max(r.width+36,120)+'px;height:'+(Math.max(r.height,fs*1.3)+10)+'px;font-size:'+fs+'px;line-height:'+(o.lh||1.2)+';font-family:'+(o.a['font-family']||'sans-serif').replace(/"/g,"'")+';font-weight:'+(o.a['font-weight']||400)+';font-style:'+(o.a['font-style']||'normal')+';letter-spacing:'+((+o.a['letter-spacing']||0)*zoom)+'px;text-align:'+(an==='middle'?'center':an==='end'?'right':'left')+';color:'+(o.fill&&o.fill!=='none'?o.fill:'#000')+';white-space:pre;overflow:hidden;';
  document.body.appendChild(ta); e0.style.visibility='hidden'; ta.focus(); ta.select();
  var done=false, fin=function(keep){ if(done) return; done=true; txEd=null; var v=ta.value; ta.remove(); e0.style.visibility='';
    if(!keep){ if(isNew){ doc.objs=doc.objs.filter(function(q){ return q!==o; }); sel=[]; commit(); } return; }
    if(!v.trim()){ doc.objs=doc.objs.filter(function(q){ return q!==o; }); sel=[]; commit(); return; }
    if(v!==o.txt||isNew){ o.txt=v; if(isNew) st.txt=v.split('\n')[0]||st.txt; commit(); } };
  ta.addEventListener('keydown',function(ev){ if(ev.key==='Escape'){ ev.stopPropagation(); fin(!isNew||ta.value.trim()!==''); } else if(ev.key==='Enter'&&(ev.ctrlKey||ev.metaKey)){ ev.preventDefault(); fin(true); } });
  ta.addEventListener('input',function(){ ta.style.width=Math.max(parseFloat(ta.style.width),ta.scrollWidth+4)+'px'; ta.style.height=Math.max(parseFloat(ta.style.height),ta.scrollHeight)+'px'; });
  ta.addEventListener('blur',function(){ fin(true); }); txEd={fin:fin}; }
function textOnPath(){ var so=selObjs(), t=so.filter(function(o){ return o.tag==='text'; })[0], sh=so.filter(function(o){ return o.tag!=='text'&&!o.hid; })[0];
  if(!t||!sh){ toast('글자 하나와 따라 쓸 선(또는 도형)을 같이 골라 주세요'); return; }
  var pl=flat(sh,true); if(!pl||!pl.length){ toast('이 도형은 따라 쓸 수 없어요 (그림·묶음은 안 돼요)'); return; }
  var pts=pl[0].slice(); var closed=['rect','ellipse','circle','polygon'].indexOf(sh.tag)>=0||(sh.tag==='path'&&(sh.cl||/z\s*$/i.test(String(sh.a.d||'')))); if(closed) pts.push(pts[0]); else { try{ var e=document.createElementNS(NS,sh.tag==='line'?'line':sh.tag); for(var k in sh.a) if(k!=='transform') e.setAttribute(k,sh.a[k]); stage.appendChild(e); var L=e.getTotalLength(), q=e.getPointAtLength(L), m=mat(sh), w=mapPt(m,q.x,q.y); e.remove(); pts.push({x:w[0],y:w[1]}); }catch(x){} }
  t.tp='M'+pts.map(function(p){ var x=p.x!=null?p.x:p[0], y=p.y!=null?p.y:p[1]; return f(x)+' '+f(y); }).join('L'); t.tpo=0; t.tx=0; t.ty=0; t.rot=0; t.sx=1; t.sy=1; t.cx=null; t.cy=null; sel=[t.id]; commit(); toast('글자를 따라 쓰게 했어요. 선은 그대로 남아 있으니 필요 없으면 지워요'); }
function finishBez(close){ if(bezPts.length<2){ bezPts=[]; drawOv(); return; }
  var o=newObj('path',{d:''},{fill:st.fillOn?st.fill:'none',pts:bezPts.map(function(q){ return JSON.parse(JSON.stringify(q)); }),cl:!!close,sh:false,bz:true}); setD(o); doc.objs.push(o); sel=[o.id]; bezPts=[]; commit(); }
function finishCurve(){ if(curvePts.length<2){ curvePts=[]; drawOv(); return; }
  var cex={fill:st.fillOn?st.fill:'none'}; if(st.sym<=1&&!st.mirror){ cex.pts=curvePts.map(function(q){ return {x:q.x,y:q.y}; }); cex.cl=st.closed; cex.sh=false; } doc.objs.push(newObj('path',{d:symPath(curvePts,st.closed)},cex)); sel=[doc.objs[doc.objs.length-1].id]; curvePts=[]; commit(); }
function gradEnsure(g){ if(!g.st||g.st.length<2) g.st=[{o:0,c:g.c1},{o:1,c:g.c2}]; return g.st; }
function gradSync(g){ var q=g.st.slice().sort(function(a,b){ return a.o-b.o; }); g.st=q; g.c1=q[0].c; g.c2=q[q.length-1].c; }
function gradUI(g){ var stp=gradStops(g), h='<div class="note" style="margin:6px 0 2px">색 · 위치(%) · 투명도(%)</div>';
  stp.forEach(function(q,i){ h+='<div class="row gs"><input type="color" data-gs="'+i+':c" value="'+hex(q.c)+'"><input type="number" min="0" max="100" step="1" data-gs="'+i+':o" value="'+Math.round(q.o*100)+'"><input type="number" min="0" max="100" step="5" data-gs="'+i+':a" value="'+Math.round((q.a==null?1:q.a)*100)+'">'+(stp.length>2?'<button class="tbtn" data-gsdel="'+i+'" title="이 색 지우기">✕</button>':'<span style="width:34px"></span>')+'</div>'; });
  h+='<div class="btns"><button class="tbtn" data-a="gsadd">+ 색 추가</button><button class="tbtn" data-a="grev">거꾸로</button></div>';
  if(g.t==='lin') h+=rowRange('방향','gang',-180,180,g.ang||0,'°'); else h+=rowRange('가운데 가로','gcx',0,100,g.cx==null?50:g.cx,'%')+rowRange('가운데 세로','gcy',0,100,g.cy==null?50:g.cy,'%')+rowRange('퍼짐','gr',10,150,g.r||70,'%');
  return h; }
function patFillUI(p){ var T=[['lines','줄무늬'],['cross','격자'],['dots','점'],['check','체크']];
  return '<div class="row"><label>무늬 모양</label><select data-ps="t">'+T.map(function(x){ return '<option value="'+x[0]+'"'+((p.t||'lines')===x[0]?' selected':'')+'>'+x[1]+'</option>'; }).join('')+'</select></div>'
   +'<div class="row"><label>무늬 색</label><input type="color" data-ps="c" value="'+hex(p.c||'#000000')+'"><label class="chk" style="margin:0;flex:1"><input type="checkbox" data-ps="bgOn"'+(p.bg?' checked':'')+'> 바탕</label><input type="color" data-ps="bg" value="'+hex(p.bg||'#ffffff')+'"></div>'
   +rowRange('칸 크기','ps_s',4,80,p.s||12,'px')+rowRange('무늬 굵기','ps_w',1,40,p.w||(p.s||12)/3,'px',.5)+rowRange('각도','ps_a',-90,90,p.a||0,'°'); }
function shadowUI(o){ return rowRange('그림자 가로','sdx',-60,60,o.sdx==null?6:o.sdx,'px')+rowRange('그림자 세로','sdy',-60,60,o.sdy==null?6:o.sdy,'px')+rowRange('그림자 번짐','sdb',0,40,o.sdb==null?5:o.sdb,'px')+rowRange('그림자 진하기','sdo',0,1,o.sdo==null?.5:o.sdo,'',.05)+'<div class="row"><label>그림자 색</label><input type="color" data-sdc="1" value="'+hex(o.sdc||'#000000')+'"></div>'; }
function simUI(o){ return '<div class="sec"><h4>비슷한 도형 고르기</h4><div class="btns"><button class="tbtn" data-a="simf">같은 안쪽 색</button><button class="tbtn" data-a="sims">같은 선 색</button><button class="tbtn" data-a="simt">같은 종류</button><button class="tbtn" data-a="siminv">고른 것 뒤집기</button></div></div>'; }
function selSimilar(kind){ var o=selObjs()[0]; if(!o&&kind!=='siminv') return; var key=function(c){ return c==null?'':String(c); }, out=[];
  doc.objs.forEach(function(q){ if(q.hid||q.lock) return; var on=sel.indexOf(q.id)>=0;
    if(kind==='simf'&&key(q.fill)===key(o.fill)&&!!q.grad===!!o.grad) out.push(q.id); else if(kind==='sims'&&key(q.stroke)===key(o.stroke)) out.push(q.id); else if(kind==='simt'&&q.tag===o.tag) out.push(q.id); else if(kind==='siminv'&&!on) out.push(q.id); });
  sel=out; drawOv(); panel(); toast(out.length+'개를 골랐어요'); }
function traceUI(){ return '<div class="sec"><h4>그림을 벡터로 따기</h4>'+rowRange('밝기 기준','trT',5,95,st.trT,'%')+rowRange('단계 수','trN',1,4,st.trN)+rowRange('단순하게','trD',1,10,st.trD)+'<label class="chk"><input type="checkbox" data-k="trInv"'+(st.trInv?' checked':'')+'> 밝은 쪽을 따기 (뒤집기)</label><div class="btns"><button class="tbtn pri" data-a="trace">벡터로 따기</button></div><div class="note">그림의 어두운 부분을 윤곽선 도형으로 바꿔요. 단계 수가 많으면 회색 단계가 겹쳐 쌓여요. 원래 그림은 그대로 남아요.</div></div>'; }
function traceImage(o){ var im=new Image(); im.onload=function(){ var iw=im.naturalWidth||im.width, ih=im.naturalHeight||im.height, k=Math.min(1,440/Math.max(iw,ih)), cw=Math.max(2,Math.round(iw*k)), ch=Math.max(2,Math.round(ih*k)), c=document.createElement('canvas'); c.width=cw; c.height=ch; var cx=c.getContext('2d'); cx.drawImage(im,0,0,cw,ch);
    var d; try{ d=cx.getImageData(0,0,cw,ch).data; }catch(x){ toast('이 그림은 읽을 수 없어요'); return; }
    var lum=new Float32Array(cw*ch), i; for(i=0;i<cw*ch;i++){ var a=d[i*4+3]/255, l=(.299*d[i*4]+.587*d[i*4+1]+.114*d[i*4+2])/255; lum[i]=l*a+(1-a); if(st.trInv) lum[i]=1-lum[i]; }
    var T=st.trT/100, N=Math.round(st.trN), m=mat(o), x0=+o.a.x||0, y0=+o.a.y||0, w0=+o.a.width||cw, h0=+o.a.height||ch, made=[], eps=.35*st.trD/3*Math.max(1,Math.max(cw,ch)/300);
    for(var lv=N;lv>=1;lv--){ var thr=T*lv/N, bw=cw+2, bh=ch+2, B=new Uint8Array(bw*bh); for(var yy=0;yy<ch;yy++) for(var xx=0;xx<cw;xx++) B[(yy+1)*bw+xx+1]=lum[yy*cw+xx]<thr?1:0;
      var loops=traceLoops(B,bw,bh), dd='';
      loops.forEach(function(lp){ var pts=lp.map(function(q){ return [q[0]-.5,q[1]-.5]; }); if(Math.abs(polyArea(pts))<6) return; pts=rdpRing(pts,eps); if(pts.length<3) return;
        dd+='M'+pts.map(function(q){ var wp=mapPt(m,x0+q[0]/cw*w0,y0+q[1]/ch*h0); return f(wp[0])+' '+f(wp[1]); }).join('L')+'Z'; });
      if(!dd) continue; var g=Math.round(255*thr*.55), no=newObj('path',{d:dd,'fill-rule':'evenodd'}); no.fill=N===1?'#000000':'rgb('+g+','+g+','+g+')'; no.stroke='none'; no.sw=0; no.dash=0; no.name='따온 윤곽 '+(N-lv+1); doc.objs.push(no); made.push(no.id); }
    if(!made.length){ toast('따올 윤곽이 없어요. 밝기 기준을 바꿔 보세요'); return; } sel=made; commit(); toast(made.length+'개의 벡터 도형을 만들었어요'); };
  im.onerror=function(){ toast('그림을 읽지 못했어요'); }; im.src=IMGS[o.imgId]||''; }
function polyArea(p){ var a=0; for(var i=0;i<p.length;i++){ var q=p[(i+1)%p.length]; a+=p[i][0]*q[1]-q[0]*p[i][1]; } return a/2; }
function traceLoops(B,bw,bh){ var segs=[], adj={}, E=[[ ],[['B','L']],[['R','B']],[['R','L']],[['T','R']],[['T','R'],['B','L']],[['T','B']],[['T','L']],[['T','L']],[['T','B']],[['T','L'],['R','B']],[['T','R']],[['L','R']],[['R','B']],[['B','L']],[]];
  function key(cx,cy,e){ var x=e==='T'?2*cx+1:e==='B'?2*cx+1:e==='L'?2*cx:2*cx+2, y=e==='T'?2*cy:e==='B'?2*cy+2:2*cy+1; return x*100000+y; }
  for(var cy=0;cy<bh-1;cy++) for(var cx=0;cx<bw-1;cx++){ var idx=B[cy*bw+cx]*8+B[cy*bw+cx+1]*4+B[(cy+1)*bw+cx+1]*2+B[(cy+1)*bw+cx]; var L=E[idx]; for(var q=0;q<L.length;q++){ var a=key(cx,cy,L[q][0]), b=key(cx,cy,L[q][1]), si=segs.length; segs.push([a,b,false]); (adj[a]=adj[a]||[]).push(si); (adj[b]=adj[b]||[]).push(si); } }
  var loops=[]; for(var s0=0;s0<segs.length;s0++){ if(segs[s0][2]) continue; var seg=segs[s0], start=seg[0], cur=seg[1], pts=[[Math.floor(start/100000)/2,(start%100000)/2]]; seg[2]=true; var guard=0;
    while(cur!==start&&guard++<200000){ pts.push([Math.floor(cur/100000)/2,(cur%100000)/2]); var nx=null, ls=adj[cur]||[]; for(var z=0;z<ls.length;z++){ if(!segs[ls[z]][2]){ nx=ls[z]; break; } } if(nx==null) break; segs[nx][2]=true; cur=segs[nx][0]===cur?segs[nx][1]:segs[nx][0]; }
    if(pts.length>=3) loops.push(pts); }
  return loops; }
function adjUI(o){ return '<div class="sec"><h4>색 보정 (그림·도형 모두)</h4>'+rowRange('밝기','fbr',0,200,o.fbr==null?100:o.fbr,'%')+rowRange('대비','fct',0,200,o.fct==null?100:o.fct,'%')+rowRange('채도','fsa',0,300,o.fsa==null?100:o.fsa,'%')+rowRange('색조 돌리기','fhue',-180,180,o.fhue||0,'°')+rowRange('흑백','fgr',0,100,o.fgr||0,'%')+rowRange('색 뒤집기','finv',0,100,o.finv||0,'%')+'<div class="btns"><button class="tbtn" data-a="fxreset">색 보정 지우기</button></div></div>'; }
function rdp(pts,eps){ if(pts.length<3) return pts; var keep=[], i; for(i=0;i<pts.length;i++) keep.push(false); keep[0]=keep[pts.length-1]=true; var stack=[[0,pts.length-1]];
  while(stack.length){ var r=stack.pop(), a=pts[r[0]], b=pts[r[1]], md=0, mi=-1, dx=b[0]-a[0], dy=b[1]-a[1], L=Math.hypot(dx,dy)||1;
    for(i=r[0]+1;i<r[1];i++){ var d=Math.abs((pts[i][0]-a[0])*dy-(pts[i][1]-a[1])*dx)/L; if(d>md){ md=d; mi=i; } } if(md>eps&&mi>0){ keep[mi]=true; stack.push([r[0],mi],[mi,r[1]]); } }
  return pts.filter(function(p,i){ return keep[i]; }); }
function rdpRing(pts,eps){ var n=pts.length; if(n<4) return pts; var m=0, md=0; for(var i=1;i<n;i++){ var d=Math.hypot(pts[i][0]-pts[0][0],pts[i][1]-pts[0][1]); if(d>md){ md=d; m=i; } }
  var A=rdp(pts.slice(0,m+1),eps), B=rdp(pts.slice(m).concat([pts[0]]),eps); return A.slice(0,-1).concat(B.slice(0,-1)); }
function pbUnion(a,b){ var C=PolyBool.combine(PolyBool.segments(a),PolyBool.segments(b)); return PolyBool.polygon(PolyBool.selectUnion(C)); }
function pbDiff(a,b){ var C=PolyBool.combine(PolyBool.segments(a),PolyBool.segments(b)); return PolyBool.polygon(PolyBool.selectDifference(C)); }
function pbUnionAll(L,lo,hi){ if(hi-lo===1) return L[lo]; var mid=(lo+hi)>>1; return pbUnion(pbUnionAll(L,lo,mid),pbUnionAll(L,mid,hi)); }
function strokePieces(pts,closed,r){ var n=pts.length, out=[], segs=closed?n:n-1, i, k;
  for(i=0;i<segs;i++){ var A=pts[i], B=pts[(i+1)%n], dx=B[0]-A[0], dy=B[1]-A[1], L=Math.hypot(dx,dy); if(L<1e-6) continue; var nx=-dy/L*r, ny=dx/L*r; out.push({regions:[[[A[0]+nx,A[1]+ny],[B[0]+nx,B[1]+ny],[B[0]-nx,B[1]-ny],[A[0]-nx,A[1]-ny]]],inverted:false}); }
  for(i=0;i<n;i++){ var c=[]; for(k=0;k<14;k++){ var an=2*Math.PI*k/14; c.push([pts[i][0]+r*Math.cos(an),pts[i][1]+r*Math.sin(an)]); } out.push({regions:[c],inverted:false}); }
  return out; }
function offsetSel(kind){ if(!window.PolyBool){ toast('합치기 도구를 불러오지 못했어요'); return; } var so=selObjs().filter(function(o){ return !o.hid; }); if(!so.length){ toast('도형을 골라 주세요'); return; }
  var made=[], fail=0;
  so.forEach(function(o){ var pl=flat(o,true,true); if(!pl||!pl.length){ fail++; return; }
    var closed=['rect','ellipse','circle','polygon'].indexOf(o.tag)>=0||(o.tag==='path'&&(o.cl||/z/i.test(String(o.a.d||'')))), sc=Math.max(Math.abs(o.sx==null?1:o.sx),Math.abs(o.sy==null?1:o.sy));
    var r=kind==='o'?(o.sw||0)/2*sc:st.offr; if(r<=0){ fail++; return; }
    var acc=null;
    pl.forEach(function(p00){ var p0=p00; if(closed&&p0.length>1&&Math.hypot(p0[0][0]-p0[p0.length-1][0],p0[0][1]-p0[p0.length-1][1])<1e-6) p0=p0.slice(0,-1);
      var rd=closed?rdpRing:rdp, eps=.25, pts=rd(p0,eps); while(pts.length>100&&eps<30){ eps*=1.6; pts=rd(p0,eps); }
      if(pts.length<2) return;
      var U=pbUnionAll(strokePieces(pts,closed,r),0,strokePieces(pts,closed,r).length), res=U;
      if(closed&&pts.length>=3){ var poly={regions:[pts],inverted:false}; if(kind==='p') res=pbUnion(poly,U); else if(kind==='m') res=pbDiff(poly,U); }
      else if(kind==='m'){ res={regions:[],inverted:false}; }
      acc=acc?pbUnion(acc,res):res; });
    if(!acc||!acc.regions.length){ fail++; return; }
    var d=acc.regions.map(function(rg){ return 'M'+rg.map(function(p){ return f(p[0])+' '+f(p[1]); }).join('L')+'Z'; }).join('');
    var no=newObj('path',{d:d,'fill-rule':'evenodd'}); if(kind==='o'){ no.fill=(o.stroke&&o.stroke!=='none')?o.stroke:'#000000'; no.stroke='none'; no.sw=0; no.dash=0; no.op=o.op; } else { no.fill=o.fill==null?'none':o.fill; if(o.grad) no.grad=JSON.parse(JSON.stringify(o.grad)); if(o.pat) no.pat=JSON.parse(JSON.stringify(o.pat)); no.stroke=o.stroke; no.sw=o.sw; no.op=o.op; no.dash=o.dash; if(o.cap) no.cap=o.cap; if(o.join) no.join=o.join; }
    placeNew([o],no); made.push(no.id); });
  if(!made.length){ toast(fail?'이 도형은 바꿀 수 없어요. 좁히면 사라질 수도 있어요':'바꿀 도형이 없어요'); return; }
  sel=made; commit(); if(fail) toast('일부는 바꾸지 못했어요'); }
function cloneObj(o){ var c=JSON.parse(JSON.stringify(o)); c.id=uid++; return c; }
function mirrorObj(o,axis,pos){ var cx=o.cx||0, cy=o.cy||0, wx=o.tx+cx, wy=o.ty+cy; o.rot=-(o.rot||0); if(axis==='x'){ o.tx=2*pos-wx-cx; o.sx=-(o.sx==null?1:o.sx); } else { o.ty=2*pos-wy-cy; o.sy=-(o.sy==null?1:o.sy); } }
function arrGo(kind){ var b=selBox(); if(!b){ toast('도형을 골라 주세요'); return; } var a=st.arr, out=[], cl=function(v,lo,hi){ return Math.max(lo,Math.min(hi,Math.round(+v)||lo)); };
  if(kind==='mir-r'||kind==='mir-b'||kind==='mir-cx'||kind==='mir-cy'){ var ax=(kind==='mir-r'||kind==='mir-cx')?'x':'y', pos=kind==='mir-r'?b.x+b.w:kind==='mir-b'?b.y+b.h:(ax==='x'?doc.w/2:doc.h/2);
    b.list.forEach(function(o){ var c=cloneObj(o); mirrorObj(c,ax,pos); out.push(c); }); }
  else if(a.mode==='grid'){ var cols=cl(a.cols,1,50), rows=cl(a.rows,1,50); if(cols*rows*b.list.length>800){ toast('너무 많아요. 800개 이하로 해 주세요'); return; }
    for(var r=0;r<rows;r++) for(var c=0;c<cols;c++){ if(!r&&!c) continue; b.list.forEach(function(o){ var q=cloneObj(o); q.tx+=c*(b.w+(+a.gx||0)); q.ty+=r*(b.h+(+a.gy||0)); out.push(q); }); } }
  else { var n=cl(a.n,2,72), deg=Math.max(10,Math.min(360,+a.deg||360)), pv=a.pivot==='obj'?{x:b.x+b.w/2,y:b.y+b.h/2}:{x:doc.w/2,y:doc.h/2}; if(n*b.list.length>800){ toast('너무 많아요'); return; }
    for(var k=1;k<n;k++){ var an=deg*k/(deg>=360?n:n-1), cs=Math.cos(an*Math.PI/180), sn=Math.sin(an*Math.PI/180);
      b.list.forEach(function(o){ var q=cloneObj(o), cx=q.cx||0, cy=q.cy||0, wx=q.tx+cx-pv.x, wy=q.ty+cy-pv.y; q.rot=(q.rot||0)+an; q.tx=pv.x+wx*cs-wy*sn-cx; q.ty=pv.y+wx*sn+wy*cs-cy; out.push(q); }); } }
  if(!out.length){ toast('만들 게 없어요'); return; } var ids=b.list.map(function(o){ return o.id; }); out.forEach(function(q){ doc.objs.push(q); ids.push(q.id); }); sel=ids; commit(); toast(out.length+'개를 만들었어요'); }
function arrUI(){ var a=st.arr, num=function(l,k,mn,mx){ return '<div class="row"><label>'+l+'</label><input type="number" data-ar="'+k+'" min="'+mn+'" max="'+mx+'" value="'+a[k]+'"></div>'; };
  var h='<div class="sec"><h4>반복 복제</h4><div class="row"><label>방식</label><select data-ar="mode">'+[['grid','격자로 늘어놓기'],['radial','둥글게 돌려 놓기'],['mirror','거울 복사']].map(function(x){ return '<option value="'+x[0]+'"'+(a.mode===x[0]?' selected':'')+'>'+x[1]+'</option>'; }).join('')+'</select></div>';
  if(a.mode==='grid') h+=num('가로 개수','cols',1,50)+num('세로 개수','rows',1,50)+num('가로 간격','gx',-500,500)+num('세로 간격','gy',-500,500)+'<div class="btns"><button class="tbtn pri" data-a="arrgo">만들기</button></div>';
  else if(a.mode==='radial') h+=num('개수','n',2,72)+num('펼칠 각도','deg',10,360)+'<div class="row"><label>가운데</label><select data-ar="pivot"><option value="canvas"'+(a.pivot==='canvas'?' selected':'')+'>캔버스 가운데</option><option value="obj"'+(a.pivot==='obj'?' selected':'')+'>고른 도형 가운데</option></select></div><div class="btns"><button class="tbtn pri" data-a="arrgo">만들기</button></div>';
  else h+='<div class="btns"><button class="tbtn" data-a="mir-r">오른쪽에 거울 복사</button><button class="tbtn" data-a="mir-b">아래쪽에 거울 복사</button><button class="tbtn" data-a="mir-cx">캔버스 가운데 기준 좌우</button><button class="tbtn" data-a="mir-cy">캔버스 가운데 기준 위아래</button></div>';
  return h+'<div class="note">복사본은 원본과 따로 움직여요. 만든 뒤 전체가 골라져요.</div></div>'; }
function offUI(){ return '<div class="sec"><h4>윤곽 · 넓히기</h4>'+rowRange('크기','offr',1,100,st.offr,'px')+'<div class="btns"><button class="tbtn" data-a="offp">도형 넓히기</button><button class="tbtn" data-a="offm">도형 좁히기</button><button class="tbtn" data-a="outl">선을 도형으로</button></div><div class="note">넓히기·좁히기는 모양을 바깥·안쪽으로 크기만큼 옮긴 새 도형이 돼요. 선을 도형으로는 선 굵기만큼의 띠를 채운 도형으로 바꿔요(점선은 실선이 돼요).</div></div>'; }
function clipBox(o){ var m=mat(o), w=document.createElementNS(NS,'g'); w.setAttribute('transform','matrix('+m.join(' ')+')'); w.innerHTML=objStr(o.clip,true); stage.appendChild(w); var r=w.getBoundingClientRect(), sr=stage.getBoundingClientRect(), k=doc.w/sr.width; w.remove(); if(!r.width&&!r.height) return null; return {x:(r.left-sr.left)*k,y:(r.top-sr.top)*k,w:r.width*k,h:r.height*k}; }
function clipSel(){ var s=doc.objs.filter(function(o){ return sel.indexOf(o.id)>=0; }); if(s.length<2){ toast('2개 이상 골라 주세요. 맨 위에 있는 도형이 틀이 돼요'); return; }
  var mask=s[s.length-1], kids=s.slice(0,-1); if(mask.tag==='image'){ toast('그림은 틀로 쓸 수 없어요'); return; }
  var mb=bbox(mask); mask.hid=false; mask.lock=false; kids.forEach(function(k){ k.hid=false; k.lock=false; });
  var g={id:uid++,tag:'grp',a:{},kids:kids,clip:mask,tx:0,ty:0,rot:0,sx:1,sy:1,fill:null,stroke:null,sw:null,op:null,dash:0}; if(mb){ g.cx=mb.x+mb.w/2; g.cy=mb.y+mb.h/2; }
  placeNew(s,g); sel=[g.id]; commit(); toast('맨 위 도형 모양으로 잘랐어요. 풀기를 누르면 되돌아가요'); }
function bbox(o){ if(o.clip){ var cb=clipBox(o); if(cb) return cb; }
  var e=stage.querySelector('[data-id="'+o.id+'"]'); if(!e) return null; var r=e.getBoundingClientRect(), s=stage.getBoundingClientRect(), k=doc.w/s.width;
  return {x:(r.left-s.left)*k,y:(r.top-s.top)*k,w:r.width*k,h:r.height*k};
}
function gradPts(o){ var e=stage.querySelector('[data-id="'+o.id+'"]'); if(!e||!o.grad) return null; var bb; try{ bb=e.getBBox(); }catch(x){ return null; } if(!bb.width||!bb.height) return null; var g=o.grad, L;
  if(g.t==='rad'){ var cx=bb.x+bb.width*(g.cx==null?50:g.cx)/100, cy=bb.y+bb.height*(g.cy==null?50:g.cy)/100; L={c:[cx,cy],r:[cx+bb.width*(g.r||70)/100,cy]}; }
  else { var an=(g.ang||0)*Math.PI/180, c=Math.cos(an), sn=Math.sin(an); L={a:[bb.x+bb.width*(.5-c/2),bb.y+bb.height*(.5-sn/2)],b:[bb.x+bb.width*(.5+c/2),bb.y+bb.height*(.5+sn/2)]}; }
  return {bb:bb,m:mat(o),L:L}; }
function gradDrag(d,p,shift){ var o=d.o, g=o.grad, bb=d.bb, l=mapPt(minv(d.m),p.x,p.y);
  if(d.w==='c'){ g.cx=f(Math.max(-50,Math.min(150,(l[0]-bb.x)/bb.width*100))); g.cy=f(Math.max(-50,Math.min(150,(l[1]-bb.y)/bb.height*100))); }
  else if(d.w==='r'){ var cx=bb.x+bb.width*(g.cx==null?50:g.cx)/100, cy=bb.y+bb.height*(g.cy==null?50:g.cy)/100; g.r=f(Math.max(5,Math.min(300,Math.hypot(l[0]-cx,(l[1]-cy)*bb.width/bb.height)/bb.width*100))); }
  else { var ux=(l[0]-bb.x-bb.width/2)/bb.width, uy=(l[1]-bb.y-bb.height/2)/bb.height; if(d.w==='a'){ ux=-ux; uy=-uy; } if(Math.hypot(ux,uy)<.01) return; var an=Math.atan2(uy,ux)*180/Math.PI; if(shift) an=Math.round(an/15)*15; g.ang=Math.round(an*10)/10; }
  d.moved=true; softRender(); }
function textOutline(o){ var b=bbox(o); if(!b) return; var pad=6, bx=b.x-pad, by=b.y-pad, bw=b.w+pad*2, bh=b.h+pad*2, k=Math.min(4,1200/Math.max(bw,bh));
  var c=JSON.parse(JSON.stringify(o)); c.fill='#000000'; delete c.grad; delete c.pat; delete c.clip; c.stroke='none'; c.sw=0; c.op=1; c.blur=0; c.shadow=false; c.blend=null; ['fbr','fct','fsa','fhue','fgr','finv'].forEach(function(q){ delete c[q]; });
  var svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+Math.round(bw*k)+'" height="'+Math.round(bh*k)+'" viewBox="'+f(bx)+' '+f(by)+' '+f(bw)+' '+f(bh)+'">'+objStr(c,true)+'</svg>';
  var im=new Image(); im.onload=function(){ var cw=Math.round(bw*k), ch=Math.round(bh*k), cv=document.createElement('canvas'); cv.width=cw; cv.height=ch; var cx=cv.getContext('2d'); cx.drawImage(im,0,0,cw,ch); var d;
    try{ d=cx.getImageData(0,0,cw,ch).data; }catch(x){ toast('글자를 읽지 못했어요'); return; }
    var bw2=cw+2, bh2=ch+2, B=new Uint8Array(bw2*bh2); for(var yy=0;yy<ch;yy++) for(var xx=0;xx<cw;xx++) B[(yy+1)*bw2+xx+1]=d[(yy*cw+xx)*4+3]>127?1:0;
    var dd='', eps=.45; traceLoops(B,bw2,bh2).forEach(function(lp){ var pts=lp.map(function(q){ return [q[0]-.5,q[1]-.5]; }); if(Math.abs(polyArea(pts))<4) return; pts=rdpRing(pts,eps); if(pts.length<3) return; dd+='M'+pts.map(function(q){ return f(bx+q[0]/k)+' '+f(by+q[1]/k); }).join('L')+'Z'; });
    if(!dd){ toast('글자 윤곽을 만들지 못했어요'); return; }
    var no=newObj('path',{d:dd,'fill-rule':'evenodd'}); ['fill','stroke','sw','op','dash','gap','cap','join','grad','pat','blend','blur','shadow','sdx','sdy','sdb','sdc','sdo','fbr','fct','fsa','fhue','fgr','finv'].forEach(function(q){ if(o[q]!=null) no[q]=JSON.parse(JSON.stringify(o[q])); });
    if(o.stroke==null){ no.stroke='none'; no.sw=0; } if(o.op==null) no.op=1; if(o.dash==null) no.dash=0;
    if(!no.fill||no.fill==='none') no.fill='#000000'; no.name=((o.txt||'글자').split('\n')[0].slice(0,12))+' 윤곽';
    var ix=doc.objs.indexOf(o); if(ix<0) return; doc.objs.splice(ix,1,no); sel=[no.id]; commit(); toast('글자를 도형으로 바꿨어요. 이제 점을 고칠 수 있어요'); };
  im.onerror=function(){ toast('글자를 읽지 못했어요'); }; im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg); }
function drawOv(cur){
  var g=ovEl(); if(!g) return; g.innerHTML=''; var u=1/zoom;
  if(tool==='curve'&&curvePts.length){
    var pts=curvePts.concat(cur?[cur]:[]); g.appendChild(el('path',{d:smooth(pts,false),fill:'none',stroke:'#ff8a3d','stroke-width':2*u,'stroke-dasharray':(6*u)+' '+(4*u)}));
    curvePts.forEach(function(q){ g.appendChild(el('circle',{cx:q.x,cy:q.y,r:4*u,fill:'#ffc93c',stroke:'#000','stroke-width':u})); });
  }
  if(tool==='bez'&&bezPts.length){ var bpp=bezPts.concat(cur?[{x:cur.x,y:cur.y}]:[]);
    if(bpp.length>1) g.appendChild(el('path',{d:bezD({pts:bpp,cl:false}),fill:'none',stroke:'#ff8a3d','stroke-width':2*u,'pointer-events':'none'}));
    bezPts.forEach(function(q,qi){ ['i','o'].forEach(function(k){ if(q[k+'x']!=null){ g.appendChild(el('line',{x1:q.x,y1:q.y,x2:q[k+'x'],y2:q[k+'y'],stroke:'#ff8a3d','stroke-width':u,'pointer-events':'none'})); g.appendChild(el('circle',{cx:q[k+'x'],cy:q[k+'y'],r:3.5*u,fill:'#ff8a3d','pointer-events':'none'})); } });
      g.appendChild(el('rect',{x:q.x-4*u,y:q.y-4*u,width:8*u,height:8*u,fill:qi===0?'#ffc93c':'#ffffff',stroke:'#ff8a3d','stroke-width':1.5*u,'pointer-events':'none'})); }); }
  if(drag&&drag.k==='box'&&drag.cur){ g.appendChild(el('rect',{x:Math.min(drag.start.x,drag.cur.x),y:Math.min(drag.start.y,drag.cur.y),width:Math.abs(drag.cur.x-drag.start.x),height:Math.abs(drag.cur.y-drag.start.y),fill:'rgba(255,201,60,.12)',stroke:'#ffc93c','stroke-width':u,'stroke-dasharray':(4*u)+' '+(3*u)})); }
  if(tool==='node'){ var no=byId(sel[0]); if(no&&no.pts){ var mm=mat(no), q=no.pts.map(function(p){ return mapPt(mm,p.x,p.y); });
      if(!no.bz) g.appendChild(el('path',{d:'M'+q.map(function(z){ return f(z[0])+' '+f(z[1]); }).join('L')+(no.cl?'Z':''),fill:'none',stroke:'#ff8a3d','stroke-width':u,'stroke-dasharray':(4*u)+' '+(3*u),'pointer-events':'none'}));
      var sp=no.pts[nodeSel]; if(sp&&nodeSel>=0) ['i','o'].forEach(function(k){ if(sp[k+'x']!=null){ var hp=mapPt(mm,sp[k+'x'],sp[k+'y']), np2=q[nodeSel];
          g.appendChild(el('line',{x1:np2[0],y1:np2[1],x2:hp[0],y2:hp[1],stroke:'#ff8a3d','stroke-width':u,'pointer-events':'none'}));
          g.appendChild(el('circle',{cx:hp[0],cy:hp[1],r:5*u,fill:'#ff8a3d',stroke:'#fff','stroke-width':u,'data-nh':k,style:'cursor:move'})); } });
      q.forEach(function(z,i){ g.appendChild(el('circle',{cx:z[0],cy:z[1],r:6*u,fill:i===nodeSel?'#ff8a3d':'#ffffff',stroke:'#ff8a3d','stroke-width':2*u,'data-n':i,style:'cursor:move'})); }); }
    return; }
  if(tool!=='sel') return;
  var bx=null, hs=(window.matchMedia&&matchMedia('(pointer:coarse)').matches?9:5.5)*u;
  sel.forEach(function(i){ var o=byId(i); if(!o) return; var b=bbox(o); if(!b) return;
    g.appendChild(el('rect',{x:b.x,y:b.y,width:b.w,height:b.h,fill:'none',stroke:'#ffc93c','stroke-width':1.5*u,'stroke-dasharray':(5*u)+' '+(3*u),'pointer-events':'none'})); });
  bx=selBox();
  if(bx&&!(drag&&drag.k==='box')){
    if(sel.length>1) g.appendChild(el('rect',{x:bx.x,y:bx.y,width:bx.w,height:bx.h,fill:'none',stroke:'#ff8a3d','stroke-width':u,'pointer-events':'none'}));
    var cx=bx.x+bx.w/2, cy=bx.y+bx.h/2, H=[['nw',bx.x,bx.y,'nwse'],['n',cx,bx.y,'ns'],['ne',bx.x+bx.w,bx.y,'nesw'],['e',bx.x+bx.w,cy,'ew'],['se',bx.x+bx.w,bx.y+bx.h,'nwse'],['s',cx,bx.y+bx.h,'ns'],['sw',bx.x,bx.y+bx.h,'nesw'],['w',bx.x,cy,'ew']];
    g.appendChild(el('line',{x1:cx,y1:bx.y,x2:cx,y2:bx.y-24*u,stroke:'#ffc93c','stroke-width':1.5*u,'pointer-events':'none'}));
    g.appendChild(el('circle',{cx:cx,cy:bx.y-24*u,r:hs*1.25,fill:'#ffc93c',stroke:'#000','stroke-width':u,'data-h':'rot',style:'cursor:grab'}));
    H.forEach(function(q){ g.appendChild(el('rect',{x:q[1]-hs,y:q[2]-hs,width:hs*2,height:hs*2,fill:'#ffc93c',stroke:'#000','stroke-width':u,'data-h':q[0],style:'cursor:'+q[3]+'-resize'})); });
  }
  if(drag&&drag.k==='move'){ if(drag.gx!=null) g.appendChild(el('line',{x1:drag.gx,y1:0,x2:drag.gx,y2:doc.h,stroke:'#ff2bd6','stroke-width':u,'pointer-events':'none'})); if(drag.gy!=null) g.appendChild(el('line',{x1:0,y1:drag.gy,x2:doc.w,y2:drag.gy,stroke:'#ff2bd6','stroke-width':u,'pointer-events':'none'})); }
  if(sel.length===1){ var go=byId(sel[0]), gp=go&&go.grad&&!go.hid&&!go.lock?gradPts(go):null; if(gp){ var gm=gp.m, W=function(q){ return mapPt(gm,q[0],q[1]); }, gs=gradStops(go.grad), gu=1/zoom;
    if(go.grad.t==='rad'){ var gc=W(gp.L.c), gr=W(gp.L.r); g.appendChild(el('line',{x1:gc[0],y1:gc[1],x2:gr[0],y2:gr[1],stroke:'#fff','stroke-width':3*gu,'pointer-events':'none'})); g.appendChild(el('line',{x1:gc[0],y1:gc[1],x2:gr[0],y2:gr[1],stroke:'#111','stroke-width':gu,'stroke-dasharray':(4*gu)+' '+(3*gu),'pointer-events':'none'}));
      g.appendChild(el('circle',{cx:gc[0],cy:gc[1],r:7*gu,fill:gs[0].c,stroke:'#fff','stroke-width':2*gu,'data-gh':'c',style:'cursor:move'})); g.appendChild(el('circle',{cx:gr[0],cy:gr[1],r:7*gu,fill:gs[gs.length-1].c,stroke:'#fff','stroke-width':2*gu,'data-gh':'r',style:'cursor:ew-resize'})); }
    else { var ga=W(gp.L.a), gb=W(gp.L.b); g.appendChild(el('line',{x1:ga[0],y1:ga[1],x2:gb[0],y2:gb[1],stroke:'#fff','stroke-width':3*gu,'pointer-events':'none'})); g.appendChild(el('line',{x1:ga[0],y1:ga[1],x2:gb[0],y2:gb[1],stroke:'#111','stroke-width':gu,'stroke-dasharray':(4*gu)+' '+(3*gu),'pointer-events':'none'}));
      g.appendChild(el('circle',{cx:ga[0],cy:ga[1],r:7*gu,fill:gs[0].c,stroke:'#fff','stroke-width':2*gu,'data-gh':'a',style:'cursor:move'})); g.appendChild(el('circle',{cx:gb[0],cy:gb[1],r:7*gu,fill:gs[gs.length-1].c,stroke:'#fff','stroke-width':2*gu,'data-gh':'b',style:'cursor:move'})); } } }
}


/* ---------- matrix, nodes, boolean, align, group ---------- */
function mmul(A,B){ return [A[0]*B[0]+A[2]*B[1],A[1]*B[0]+A[3]*B[1],A[0]*B[2]+A[2]*B[3],A[1]*B[2]+A[3]*B[3],A[0]*B[4]+A[2]*B[5]+A[4],A[1]*B[4]+A[3]*B[5]+A[5]]; }
function mat(o){ var cx=o.cx||0, cy=o.cy||0, rr=(o.rot||0)*Math.PI/180, m=[1,0,0,1,o.tx||0,o.ty||0];
  m=mmul(m,[1,0,0,1,cx,cy]); m=mmul(m,[Math.cos(rr),Math.sin(rr),-Math.sin(rr),Math.cos(rr),0,0]); m=mmul(m,[o.sx==null?1:o.sx,0,0,o.sy==null?1:o.sy,0,0]); return mmul(m,[1,0,0,1,-cx,-cy]); }
function mapPt(m,x,y){ return [m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]]; }
function minv(m){ var d=m[0]*m[3]-m[1]*m[2]||1e-9; return [m[3]/d,-m[1]/d,-m[2]/d,m[0]/d,(m[2]*m[5]-m[3]*m[4])/d,(m[1]*m[4]-m[0]*m[5])/d]; }
function polyD(pts,cl){ return 'M'+pts.map(function(p){ return f(p.x)+' '+f(p.y); }).join('L')+(cl?'Z':''); }
function bezD(o){ var P=o.pts, n=P.length, d='M'+f(P[0].x)+' '+f(P[0].y), segs=o.cl?n:n-1;
  for(var i=0;i<segs;i++){ var A=P[i], B=P[(i+1)%n], has1=A.ox!=null, has2=B.ix!=null;
    if(!has1&&!has2) d+='L'+f(B.x)+' '+f(B.y); else d+='C'+f(has1?A.ox:A.x)+' '+f(has1?A.oy:A.y)+' '+f(has2?B.ix:B.x)+' '+f(has2?B.iy:B.y)+' '+f(B.x)+' '+f(B.y); }
  return d+(o.cl?'Z':''); }
function setD(o){ o.a.d=o.bz?bezD(o):(o.sh?polyD(o.pts,o.cl):smooth(o.pts,o.cl)); }
function parsePathD(d){ var tk=String(d).match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g)||[], i=0, cmd='', pts=[], cur=[0,0], st0=null, cl=false, lastC=null, lastQ=null, bad=false;
  function num(){ return parseFloat(tk[i++]); }
  function add(x,y){ var q={x:x,y:y}; pts.push(q); cur=[x,y]; return q; }
  while(i<tk.length&&!bad){ if(/[a-zA-Z]/.test(tk[i])) cmd=tk[i++]; else if(!cmd){ bad=true; break; }
    var rel=cmd===cmd.toLowerCase(), C=cmd.toUpperCase(), ox=rel?cur[0]:0, oy=rel?cur[1]:0;
    if(C==='Z'){ cl=true; lastC=lastQ=null; if(i>=tk.length||/[a-zA-Z]/.test(tk[i])) { if(i<tk.length&&/[mM]/.test(tk[i])) bad=true; } continue; }
    if(C==='M'){ if(pts.length) { bad=true; break; } var mx=ox+num(), my=oy+num(); st0=add(mx,my); cmd=rel?'l':'L'; lastC=lastQ=null; continue; }
    if(!pts.length){ bad=true; break; }
    if(C==='L'){ add(ox+num(),oy+num()); lastC=lastQ=null; }
    else if(C==='H'){ add(rel?cur[0]+num():num(),cur[1]); lastC=lastQ=null; }
    else if(C==='V'){ add(cur[0],rel?cur[1]+num():num()); lastC=lastQ=null; }
    else if(C==='C'||C==='S'){ var A=pts[pts.length-1], c1;
      if(C==='C'){ c1=[ox+num(),oy+num()]; } else c1=lastC?[2*cur[0]-lastC[0],2*cur[1]-lastC[1]]:[cur[0],cur[1]];
      var c2=[ox+num(),oy+num()], ex=ox+num(), ey=oy+num(); A.ox=c1[0]; A.oy=c1[1]; var q=add(ex,ey); q.ix=c2[0]; q.iy=c2[1]; lastC=c2; lastQ=null; }
    else if(C==='Q'||C==='T'){ var A2=pts[pts.length-1], qc; if(C==='Q') qc=[ox+num(),oy+num()]; else qc=lastQ?[2*cur[0]-lastQ[0],2*cur[1]-lastQ[1]]:[cur[0],cur[1]];
      var qx=ox+num(), qy=oy+num(); A2.ox=A2.x+2/3*(qc[0]-A2.x); A2.oy=A2.y+2/3*(qc[1]-A2.y); var q2=add(qx,qy); q2.ix=qx+2/3*(qc[0]-qx); q2.iy=qy+2/3*(qc[1]-qy); lastQ=qc; lastC=null; }
    else { bad=true; } }
  if(bad||pts.some(function(p){ return !isFinite(p.x)||!isFinite(p.y); })) return null;
  if(cl&&pts.length>2){ var l0=pts[pts.length-1], f0=pts[0]; if(Math.abs(l0.x-f0.x)<1e-6&&Math.abs(l0.y-f0.y)<1e-6){ if(l0.ix!=null){ f0.ix=l0.ix; f0.iy=l0.iy; } pts.pop(); } }
  return {pts:pts,cl:cl}; }
function nums(str){ return (String(str).match(/-?\d*\.?\d+(?:e-?\d+)?/gi)||[]).map(Number); }
function toPath(o){
  var t=o.tag, a=o.a, pts=[], cl=false, sh=true, n, bzf=false;
  if(t==='path'){ if(o.pts) return true; var d=String(a.d||''); if(/[^MLZ0-9eE.\-\s,]/.test(d)){ var pp=parsePathD(d); if(!pp||pp.pts.length<2) return false; pp.pts.forEach(function(q){ if(q.ix!=null||q.ox!=null) q.sm=false; }); o.tag='path'; o.a={}; o.pts=pp.pts; o.cl=pp.cl; o.sh=false; o.bz=true; setD(o); return true; }
    if((d.match(/M/g)||[]).length!==1) return false;
    n=nums(d.replace(/[MLZ]/g,' ')); for(var i=0;i+1<n.length;i+=2) pts.push({x:n[i],y:n[i+1]}); cl=/Z/.test(d); }
  else if(t==='line'){ pts=[{x:+a.x1,y:+a.y1},{x:+a.x2,y:+a.y2}]; }
  else if(t==='rect'){ var x=+a.x,y=+a.y,w=+a.width,h=+a.height; pts=[{x:x,y:y},{x:x+w,y:y},{x:x+w,y:y+h},{x:x,y:y+h}]; cl=true; }
  else if(t==='polygon'||t==='polyline'){ n=nums(a.points); for(var j=0;j+1<n.length;j+=2) pts.push({x:n[j],y:n[j+1]}); cl=t==='polygon'; }
  else if(t==='ellipse'||t==='circle'){ var ex=+a.cx,ey=+a.cy,rx=+(a.rx||a.r),ry=+(a.ry||a.r), kk=.5523;
    if(!(rx>0&&ry>0)) return false;
    pts=[{x:ex+rx,y:ey,ix:ex+rx,iy:ey-ry*kk,ox:ex+rx,oy:ey+ry*kk,sm:true},{x:ex,y:ey+ry,ix:ex+rx*kk,iy:ey+ry,ox:ex-rx*kk,oy:ey+ry,sm:true},{x:ex-rx,y:ey,ix:ex-rx,iy:ey+ry*kk,ox:ex-rx,oy:ey-ry*kk,sm:true},{x:ex,y:ey-ry,ix:ex-rx*kk,iy:ey-ry,ox:ex+rx*kk,oy:ey-ry,sm:true}]; cl=true; sh=false; bzf=true; }
  else return false;
  if(pts.length<2||pts.some(function(p){ return !isFinite(p.x)||!isFinite(p.y); })) return false;
  o.tag='path'; o.a={}; o.pts=pts; o.cl=cl; o.sh=sh; if(bzf) o.bz=true; setD(o); return true; }
function nodePt(o,e){ var p=P(e), m=minv(mat(o)); return mapPt(m,p.x,p.y); }
function segCurve(o,i){ var P=o.pts, n=P.length, A=P[i], B=P[(i+1)%n]; if(!o.bz||(A.ox==null&&B.ix==null)) return null;
  return [[A.x,A.y],[A.ox!=null?A.ox:A.x,A.ox!=null?A.oy:A.y],[B.ix!=null?B.ix:B.x,B.ix!=null?B.iy:B.y],[B.x,B.y]]; }
function bzAt(c,t){ var u=1-t; return [u*u*u*c[0][0]+3*u*u*t*c[1][0]+3*u*t*t*c[2][0]+t*t*t*c[3][0],u*u*u*c[0][1]+3*u*u*t*c[1][1]+3*u*t*t*c[2][1]+t*t*t*c[3][1]]; }
function nearNode(o,l){ var n=o.pts.length, best=-1, bd=1e9, bp=null, bt=0, bc=null, segs=o.cl?n:n-1;
  for(var i=0;i<segs;i++){ var c=segCurve(o,i);
    if(c){ for(var k=0;k<=30;k++){ var t=k/30, q=bzAt(c,t), d=Math.hypot(l[0]-q[0],l[1]-q[1]); if(d<bd){ bd=d; best=i; bp={x:q[0],y:q[1]}; bt=t; bc=c; } } continue; }
    var A=o.pts[i], B=o.pts[(i+1)%n], dx=B.x-A.x, dy=B.y-A.y, L2=dx*dx+dy*dy||1, t2=Math.max(0,Math.min(1,((l[0]-A.x)*dx+(l[1]-A.y)*dy)/L2)), px=A.x+t2*dx, py=A.y+t2*dy, d2=Math.hypot(l[0]-px,l[1]-py); if(d2<bd){ bd=d2; best=i; bp={x:px,y:py}; bt=t2; bc=null; } }
  return (best<0||bd>16/zoom)?null:{i:best,p:bp,t:bt,c:bc}; }
function addNode(o,l){ var r=nearNode(o,l); if(!r) return false; var n=o.pts.length;
  if(r.c){ var c=r.c, t=r.t, L=function(a,b){ return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]; }, a=L(c[0],c[1]), b=L(c[1],c[2]), cc=L(c[2],c[3]), d=L(a,b), e=L(b,cc), m=L(d,e), A=o.pts[r.i], B=o.pts[(r.i+1)%n];
    A.ox=a[0]; A.oy=a[1]; B.ix=cc[0]; B.iy=cc[1]; o.pts.splice(r.i+1,0,{x:m[0],y:m[1],ix:d[0],iy:d[1],ox:e[0],oy:e[1],sm:true}); }
  else o.pts.splice(r.i+1,0,r.p);
  nodeSel=r.i+1; setD(o); return true; }
function toSmooth(o,i){ var P=o.pts, n=P.length, p=P[i], pr=(i>0||o.cl)?P[(i-1+n)%n]:null, nx=(i<n-1||o.cl)?P[(i+1)%n]:null; if(!pr&&!nx) return;
  var a=pr||p, b=nx||p, vx=b.x-a.x, vy=b.y-a.y, vl=Math.hypot(vx,vy)||1; vx/=vl; vy/=vl;
  var lp=pr?Math.hypot(p.x-pr.x,p.y-pr.y)/3:0, ln=nx?Math.hypot(nx.x-p.x,nx.y-p.y)/3:0;
  if(pr){ p.ix=p.x-vx*lp; p.iy=p.y-vy*lp; } if(nx){ p.ox=p.x+vx*ln; p.oy=p.y+vy*ln; } p.sm=true; o.bz=true; }
function toCorner(o,i){ var p=o.pts[i]; delete p.ix; delete p.iy; delete p.ox; delete p.oy; p.sm=false; }
function placeNew(list,no){ var out=[], last=-1; doc.objs.forEach(function(o,i){ if(list.indexOf(o)>=0) last=i; });
  doc.objs.forEach(function(o,i){ if(list.indexOf(o)>=0){ if(i===last) out.push(no); } else out.push(o); }); doc.objs=out; }
function deepClone(o){ var c=JSON.parse(JSON.stringify(o)); (function ri(x){ x.id=uid++; if(x.kids) x.kids.forEach(ri); if(x.clip) ri(x.clip); })(c); return c; }
function findObj(list,id){ for(var i=0;i<list.length;i++){ var o=list[i]; if(o.id===id) return o; if(o.kids){ var r=findObj(o.kids,id); if(r) return r; } } return null; }
function symDefs(){ if(!doc.syms) doc.syms={}; return doc.syms; }
function eachInst(sid,fn){ var walk=function(l){ (l||[]).forEach(function(o){ if(o.tag==='grp'){ if(o.sym===sid) fn(o); if(o.kids) walk(o.kids); } }); };
  walk(doc.objs); if(doc.edit&&doc.edit.stash) walk(doc.edit.stash); (doc.pages||[]).forEach(function(p,i){ if(i!==doc.pi&&p&&p.objs) walk(p.objs); }); Object.keys(symDefs()).forEach(function(k){ if(k!==sid) walk(symDefs()[k].kids); }); }
function symRefresh(sid){ var d=symDefs()[sid]; if(!d) return; eachInst(sid,function(g){ g.kids=d.kids.map(deepClone); }); }
function symMake(){ if(doc.edit){ toast('고치는 중에는 새 심볼을 만들 수 없어요'); return; } var list=selObjs(); if(!list.length){ toast('심볼로 만들 도형을 골라 주세요'); return; }
  var g;
  if(list.length===1&&list[0].tag==='grp'&&!list[0].sym&&!list[0].clip) g=list[0];
  else { list.forEach(function(k){ k.hid=false; k.lock=false; }); g={id:uid++,tag:'grp',a:{},kids:list,tx:0,ty:0,rot:0,sx:1,sy:1,fill:null,stroke:null,sw:null,op:null,dash:0}; var b0=selBox(); if(b0){ g.cx=b0.x+b0.w/2; g.cy=b0.y+b0.h/2; } placeNew(list,g); }
  var sid='s'+(uid++), n=Object.keys(symDefs()).length+1, cx=g.cx==null?0:g.cx, cy=g.cy==null?0:g.cy;
  symDefs()[sid]={name:'심볼 '+n,kids:g.kids.map(deepClone),cx:cx,cy:cy}; g.sym=sid; g.name=symDefs()[sid].name; sel=[g.id]; commit(); toast('심볼로 만들었어요. 레이어 탭 아래 목록에서 또 놓을 수 있어요'); }
function symPut(sid){ var d=symDefs()[sid]; if(!d){ return; } if(doc.edit){ toast('고치는 중에는 놓을 수 없어요'); return; } var n=0; eachInst(sid,function(){ n++; });
  var g={id:uid++,tag:'grp',a:{},kids:d.kids.map(deepClone),sym:sid,name:d.name,tx:doc.w/2-(d.cx||0)+(n*24)%144,ty:doc.h/2-(d.cy||0)+(n*24)%144,rot:0,sx:1,sy:1,cx:d.cx||0,cy:d.cy||0,fill:null,stroke:null,sw:null,op:null,dash:0};
  doc.objs.push(g); sel=[g.id]; commit(); }
function symEdit(o){ if(doc.edit) return; var d=o&&o.sym?symDefs()[o.sym]:null;
  if(d){ doc.edit={k:'sym',id:o.sym,stash:doc.objs,name:d.name}; doc.objs=d.kids; }
  else if(o&&o.tag==='grp'&&!o.sym&&!o.clip){ if(o.rot||(o.sx!=null&&o.sx!==1)||(o.sy!=null&&o.sy!==1)||o.tx||o.ty){ toast('옮기거나 돌린 묶음은 먼저 풀었다가 다시 묶어 주세요'); return; } doc.edit={k:'grp',id:o.id,stash:doc.objs,name:o.name||'묶음'}; doc.objs=o.kids; }
  else { toast('묶음이나 심볼을 골라 주세요'); return; }
  sel=[]; commit(); fit(); }
function symDone(){ var e=doc.edit; if(!e) return; var cur=doc.objs; doc.objs=e.stash; doc.edit=null;
  if(e.k==='sym'){ var d=symDefs()[e.id]; if(d){ d.kids=cur; symRefresh(e.id); } } else { var g=findObj(doc.objs,e.id); if(g) g.kids=cur; }
  sel=[]; commit(); }
function symDetach(o){ delete o.sym; commit(); }
function symDelete(sid){ eachInst(sid,function(g){ delete g.sym; }); delete symDefs()[sid]; commit(); }
function symUI(so,o){ if(doc.edit) return ''; var one=so.length===1&&o.tag==='grp'&&!o.clip, d=one&&o.sym?symDefs()[o.sym]:null, h='<div class="sec"><h4>심볼</h4><div class="btns">';
  if(d) h+='<button class="tbtn pri" data-a="symedit">심볼 고치기</button><button class="tbtn" data-a="symput" data-sid="'+o.sym+'">복사본 놓기</button><button class="tbtn" data-a="symdet">심볼에서 떼기</button>';
  else { h+='<button class="tbtn pri" data-a="symmk">심볼로 만들기</button>'; if(one) h+='<button class="tbtn" data-a="symedit">묶음 안 고치기</button>'; }
  return h+'</div><div class="note">'+(d?'"'+esc(d.name)+'" 심볼이에요. 고치면 놓아 둔 모든 복사본이 함께 바뀌어요.':'여러 번 쓰는 그림을 심볼로 만들어 두고 놓으면, 한 번만 고쳐도 모두 바뀌어요.')+'</div></div>'; }
function symLibUI(){ var ks=Object.keys(symDefs()); if(!ks.length) return ''; var h='<div class="sec"><h4>심볼 ('+ks.length+')</h4>';
  ks.forEach(function(k){ var d=symDefs()[k], n=0; eachInst(k,function(){ n++; }); h+='<div class="row"><input type="text" data-symn="'+k+'" value="'+esc(d.name)+'" maxlength="30" style="flex:1"><span class="v">'+n+'개</span></div><div class="btns"><button class="tbtn" data-a="symput" data-sid="'+k+'">놓기</button><button class="tbtn" data-a="symdel" data-sid="'+k+'">심볼 지우기</button></div>'; });
  return h+'<div class="note">심볼을 지우면 놓아 둔 것들은 그냥 묶음으로 남아요.</div></div>'; }
function symBar(){ var bar=document.getElementById('symbar'); if(!doc.edit){ if(bar) bar.remove(); return; }
  if(!bar){ bar=document.createElement('div'); bar.id='symbar'; bar.style.cssText='position:fixed;top:56px;left:50%;transform:translateX(-50%);z-index:60;background:#ffc93c;color:#111;border-radius:10px;padding:8px 12px;display:flex;gap:10px;align-items:center;box-shadow:0 4px 16px rgba(0,0,0,.4);font:600 14px system-ui,sans-serif';
    bar.innerHTML='<span id="symt"></span><button id="symdone" style="background:#111;color:#fff;border:0;border-radius:8px;padding:6px 12px;font:inherit;cursor:pointer">고치기 끝내기</button>'; document.body.appendChild(bar); bar.querySelector('#symdone').onclick=symDone; }
  bar.querySelector('#symt').textContent=(doc.edit.k==='sym'?'심볼 고치는 중: ':'묶음 고치는 중: ')+(doc.edit.name||''); }
function groupSel(){ var kids=doc.objs.filter(function(o){ return sel.indexOf(o.id)>=0; }); if(kids.length<2){ toast('2개 이상 골라서 묶어요'); return; }
  var g={id:uid++,tag:'grp',a:{},kids:kids,tx:0,ty:0,rot:0,sx:1,sy:1,fill:null,stroke:null,sw:null,op:null,dash:0};
  kids.forEach(function(k){ k.hid=false; k.lock=false; }); placeNew(kids,g); sel=[g.id]; commit(); }
function ungroupSel(){ var out=[], ns=[], did=false;
  doc.objs.forEach(function(o){ if(sel.indexOf(o.id)>=0&&o.tag==='grp'){ did=true; var plain=!o.rot&&(o.sx==null||o.sx===1)&&(o.sy==null||o.sy===1);
      (o.kids||[]).concat(o.clip?[o.clip]:[]).forEach(function(k){ if(plain){ k.tx=(k.tx||0)+o.tx; k.ty=(k.ty||0)+o.ty; out.push(k); ns.push(k.id); } else { var w=JSON.parse(JSON.stringify(o)); w.id=uid++; w.kids=[k]; out.push(w); ns.push(w.id); } }); }
    else out.push(o); });
  if(!did){ toast('묶음을 골라 주세요'); return; } doc.objs=out; sel=ns; commit(); }
function align(how){ var s=selObjs().filter(function(o){ return !o.hid; }); if(!s.length) return; var bs=s.map(bbox); if(bs.some(function(b){ return !b; })) return;
  var ref; if(s.length===1) ref={x:0,y:0,w:doc.w,h:doc.h}; else { var x0=Math.min.apply(0,bs.map(function(b){ return b.x; })), y0=Math.min.apply(0,bs.map(function(b){ return b.y; })), x1=Math.max.apply(0,bs.map(function(b){ return b.x+b.w; })), y1=Math.max.apply(0,bs.map(function(b){ return b.y+b.h; })); ref={x:x0,y:y0,w:x1-x0,h:y1-y0}; }
  if(how==='dh'||how==='dv'){ if(s.length<3){ toast('3개 이상 골라야 간격을 맞춰요'); return; } var h=how==='dh', idx=s.map(function(o,i){ return i; }).sort(function(i,j){ return h?bs[i].x-bs[j].x:bs[i].y-bs[j].y; });
    var tot=idx.reduce(function(a,i){ return a+(h?bs[i].w:bs[i].h); },0), gap=((h?ref.w:ref.h)-tot)/(s.length-1), pos=h?ref.x:ref.y;
    idx.forEach(function(i){ var d=pos-(h?bs[i].x:bs[i].y); if(h) s[i].tx+=d; else s[i].ty+=d; pos+=(h?bs[i].w:bs[i].h)+gap; }); commit(); return; }
  s.forEach(function(o,i){ var b=bs[i], dx=0, dy=0;
    if(how==='l') dx=ref.x-b.x; else if(how==='c') dx=ref.x+ref.w/2-(b.x+b.w/2); else if(how==='r') dx=ref.x+ref.w-(b.x+b.w);
    else if(how==='t') dy=ref.y-b.y; else if(how==='m') dy=ref.y+ref.h/2-(b.y+b.h/2); else if(how==='b') dy=ref.y+ref.h-(b.y+b.h);
    o.tx+=dx; o.ty+=dy; }); commit(); }
function flat(o,any,incl){ var tg=o.tag; if(['rect','ellipse','circle','polygon','path'].concat(any?['line','polyline']:[]).indexOf(tg)<0) return null;
  var m=mat(o), polys=[], pieces=tg==='path'?String(o.a.d||'').split(/(?=[Mm])/).filter(function(x){ return x.trim(); }):[null];
  pieces.forEach(function(pc){ var e=document.createElementNS(NS,tg); for(var k in o.a) if(k!=='transform') e.setAttribute(k,o.a[k]); if(pc!=null) e.setAttribute('d',pc); stage.appendChild(e);
    try{ var L=e.getTotalLength(), n=Math.max(24,Math.min(700,Math.round(L/3))), pts=[]; for(var i=0;i<(incl?n+1:n);i++){ var q=e.getPointAtLength(L*i/n); pts.push(mapPt(m,q.x,q.y)); } if(pts.length>=3) polys.push(pts); }catch(x){}
    e.remove(); });
  return polys; }
function boolOp(kind){ if(!window.PolyBool){ toast('합치기 도구를 불러오지 못했어요'); return; }
  var s=doc.objs.filter(function(o){ return sel.indexOf(o.id)>=0; }); if(s.length<2){ toast('2개 이상 골라요'); return; }
  var polys=[]; for(var i=0;i<s.length;i++){ var r0=flat(s[i]); if(!r0||!r0.length){ toast('네모·원·다각형·닫힌 곡선만 합칠 수 있어요'); return; } polys.push({regions:r0,inverted:false}); }
  var acc=polys[0];
  for(var j=1;j<polys.length;j++){ var C=PolyBool.combine(PolyBool.segments(acc),PolyBool.segments(polys[j]));
    var sg=kind==='u'?PolyBool.selectUnion(C):kind==='i'?PolyBool.selectIntersect(C):kind==='s'?PolyBool.selectDifference(C):PolyBool.selectXor(C); acc=PolyBool.polygon(sg); }
  if(!acc.regions.length){ toast('겹치는 곳이 없어서 아무것도 남지 않아요'); return; }
  var d=acc.regions.map(function(rg){ return 'M'+rg.map(function(p){ return f(p[0])+' '+f(p[1]); }).join('L')+'Z'; }).join('');
  var b0=s[0], no=newObj('path',{d:d,'fill-rule':'evenodd'}); no.fill=(b0.fill&&b0.fill!=='none')?b0.fill:st.fill; if(b0.grad) no.grad=b0.grad; no.stroke=b0.stroke; no.sw=b0.sw; no.op=b0.op; no.dash=b0.dash;
  placeNew(s,no); sel=[no.id]; commit(); }
function addImage(file){ var rd=new FileReader(); rd.onload=function(){ var im=new Image(); im.onload=function(){ var iw=im.width||300, ih=im.height||300, k=Math.min(1,1400/Math.max(iw,ih)), c=document.createElement('canvas'); c.width=Math.max(1,Math.round(iw*k)); c.height=Math.max(1,Math.round(ih*k)); c.getContext('2d').drawImage(im,0,0,c.width,c.height);
      var url=/jpe?g/i.test(file.type)?c.toDataURL('image/jpeg',.88):c.toDataURL('image/png'), fk=Math.min(1,doc.w*.8/c.width,doc.h*.8/c.height), w=c.width*fk, h=c.height*fk, iid=uid++; IMGS[iid]=url;
      var o=newObj('image',{x:f((doc.w-w)/2),y:f((doc.h-h)/2),width:f(w),height:f(h),preserveAspectRatio:'none'},{fill:null,stroke:null,sw:null,dash:0,imgId:iid}); doc.objs.push(o); sel=[o.id]; commit(); setTool('sel'); };
    im.onerror=function(){ toast('이 그림 파일을 열지 못했어요'); }; im.src=rd.result; }; rd.readAsDataURL(file); }
function layerName(o){ if(o.name) return o.name; if(o.brush) return '붓 선'; if(o.shp&&SHAPES[o.shp]) return SHAPES[o.shp][0]; if(o.clip) return '클리핑 묶음'; var m={rect:'네모',ellipse:'원',path:'선·곡선',polygon:'다각형',polyline:'꺾은선',line:'직선',image:'그림',grp:'묶음',g:'가져온 그룹',circle:'원'}; return o.tag==='text'?'글자: '+(o.txt||'').slice(0,12):(m[o.tag]||o.tag); }

/* ---------- editing ops ---------- */
function selObjs(){ return sel.map(byId).filter(Boolean); }
function delSel(){ if(!sel.length) return; doc.objs=doc.objs.filter(function(o){ return sel.indexOf(o.id)<0; }); sel=[]; commit(); }
function dupSel(){ var n=[]; selObjs().forEach(function(o){ var c=JSON.parse(JSON.stringify(o)); c.id=uid++; c.tx+=20; c.ty+=20; doc.objs.push(c); n.push(c.id); }); if(n.length){ sel=n; commit(); } }
function order(dir){ var s=selObjs(); if(!s.length) return; var rest=doc.objs.filter(function(o){ return sel.indexOf(o.id)<0; });
  if(dir==='front') doc.objs=rest.concat(s); else if(dir==='back') doc.objs=s.concat(rest);
  else { var a=doc.objs.slice(); if(dir==='up'){ for(var i=a.length-2;i>=0;i--) if(sel.indexOf(a[i].id)>=0&&sel.indexOf(a[i+1].id)<0){ var t=a[i]; a[i]=a[i+1]; a[i+1]=t; } } else { for(var j=1;j<a.length;j++) if(sel.indexOf(a[j].id)>=0&&sel.indexOf(a[j-1].id)<0){ var t2=a[j]; a[j]=a[j-1]; a[j-1]=t2; } } doc.objs=a; }
  commit(); }
function flip(ax){ selObjs().forEach(function(o){ if(ax==='h') o.sx=-(o.sx==null?1:o.sx); else o.sy=-(o.sy==null?1:o.sy); }); commit(); }
function snapTargets(){ var xs=[0,doc.w/2,doc.w], ys=[0,doc.h/2,doc.h], n=0;
  doc.objs.forEach(function(o){ if(o.hid||sel.indexOf(o.id)>=0||n>80) return; var b=bbox(o); if(!b) return; n++; xs.push(b.x,b.x+b.w/2,b.x+b.w); ys.push(b.y,b.y+b.h/2,b.y+b.h); });
  (doc.guides||[]).forEach(function(g){ if(g.v==='x') xs.push(g.p); else ys.push(g.p); });
  return {xs:xs,ys:ys}; }
var STYK=['fill','stroke','sw','op','dash','gap','cap','join','miter','grad','pat','blur','fbr','fct','fsa','fhue','fgr','finv','shadow','sdx','sdy','sdb','sdc','sdo','blend'];
function pickStyle(src,dst){ dst.forEach(function(o){ STYK.forEach(function(k){ if(src[k]==null||src[k]===false){ delete o[k]; } else o[k]=JSON.parse(JSON.stringify(src[k])); }); }); }
function eyedrop(id){ var so=byId(id); if(!so) return; var tg=selObjs().filter(function(o){ return o.id!==id; });
  if(so.fill&&so.fill!=='none'){ st.fill=hex(so.fill); st.fillOn=true; } else st.fillOn=false;
  if(so.stroke&&so.stroke!=='none') st.stroke=hex(so.stroke); if(so.sw) st.sw=so.sw; if(so.op!=null) st.op=so.op; st.dash=so.dash||0; st.gap=so.gap||0; st.cap=so.cap||'round'; st.join=so.join||'round';
  if(tg.length){ pickStyle(so,tg); toast('색과 선 모양을 입혔어요'); commit(); } else { toast('색과 선 모양을 가져왔어요. 이제 그리면 이 모양으로 그려져요'); panel(); } }
var PAL=['#000000','#ffffff','#e53935','#fb8c00','#ffc93c','#43a047','#00acc1','#1e88e5','#5e35b1','#d81b60','#8d6e63','#9e9e9e','#1b2a49','#ffd6a5','#a8e6cf','#cdb4ff'], SW=[];
try{ SW=JSON.parse(localStorage.getItem('ffdraw.sw')||'[]')||[]; }catch(e){}
function saveSw(){ try{ localStorage.setItem('ffdraw.sw',JSON.stringify(SW)); }catch(e){} }
function swUI(){ var o=selObjs()[0], b=function(c,x){ return '<button class="swb" data-sw="'+c+'" title="'+c+'" style="background:'+c+'"></button>'; };
  var h='<div class="sec"><h4>색 팔레트</h4><div class="row"><label>적용 대상</label><select data-st="swT"><option value="fill"'+(st.swT==='fill'?' selected':'')+'>안쪽 색</option><option value="stroke"'+(st.swT==='stroke'?' selected':'')+'>선 색</option></select></div><div class="swr">'+PAL.map(b).join('')+'</div>';
  h+='<div class="note" style="margin:8px 0 4px">내 색'+(st.swDel?' (눌러서 지우는 중)':'')+'</div><div class="swr">'+(SW.length?SW.map(function(c,i){ return '<button class="swb'+(st.swDel?' del':'')+'" '+(st.swDel?'data-swdel="'+i+'"':'data-sw="'+c+'"')+' title="'+c+'" style="background:'+c+'"></button>'; }).join(''):'<span class="note">아직 없어요</span>')+'</div>';
  h+='<div class="btns"><button class="tbtn" data-swadd="fill">안쪽 색 저장</button><button class="tbtn" data-swadd="stroke">선 색 저장</button>'+(SW.length?'<button class="tbtn'+(st.swDel?' on':'')+'" data-swedit="1">지우기</button>':'')+(window.EyeDropper?'<button class="tbtn" id="swPick">화면에서 고르기</button>':'')+'</div></div>';
  return h; }
function applyColor(c){ var so=selObjs(), k=st.swT==='stroke'?'stroke':'fill'; st[k]=c; if(k==='fill') st.fillOn=true;
  if(so.length){ so.forEach(function(o){ if(k==='fill'){ if(o.grad){ o.grad.c1=c; if(o.grad.st) o.grad.st[0].c=c; } else if(o.pat) o.pat.c=c; else o.fill=c; } else o.stroke=c; }); commit(); } else panel(); }
function dashPreset(k){ var so=selObjs(), sw=Math.max(1,so.length?(so[0].sw||1):st.sw), p={dash:0,gap:0};
  if(k==='dash'){ p.dash=Math.max(6,sw*3); p.gap=p.dash*.6; } else if(k==='long'){ p.dash=Math.max(14,sw*6); p.gap=Math.max(8,sw*2.5); } else if(k==='dot'){ p.dash=.01; p.gap=Math.max(2,sw*2); p.cap='round'; }
  var apply=function(t){ t.dash=p.dash; if(p.gap) t.gap=p.gap; else delete t.gap; if(p.cap) t.cap=p.cap; };
  if(so.length){ so.forEach(apply); commit(); } else { st.dash=p.dash; st.gap=p.gap; if(p.cap) st.cap=p.cap; panel(); } }
function selBox(){ var s=selObjs().filter(function(o){ return !o.hid; }), x0=1e9,y0=1e9,x1=-1e9,y1=-1e9; if(!s.length) return null;
  for(var i=0;i<s.length;i++){ var b=bbox(s[i]); if(!b) return null; x0=Math.min(x0,b.x); y0=Math.min(y0,b.y); x1=Math.max(x1,b.x+b.w); y1=Math.max(y1,b.y+b.h); }
  return {x:x0,y:y0,w:x1-x0,h:y1-y0,list:s}; }
function boxUI(){ var b=selBox(); if(!b) return '<div class="note">보이는 도형을 골라야 숫자로 고칠 수 있어요.</div>';
  var inp=function(l,k,v){ return '<label class="nb"><span>'+l+'</span><input type="number" step="1" data-nb="'+k+'" value="'+f(v)+'"></label>'; };
  return '<div class="nbg">'+inp('X','x',b.x)+inp('Y','y',b.y)+inp('가로','w',b.w)+inp('세로','h',b.h)+'</div><label class="chk"><input type="checkbox" data-k="sizeLock"'+(st.sizeLock?' checked':'')+'> 가로·세로 비율 지키기</label>'; }
function scaleAbout(o,ox,oy,kx,ky){ var r=((Math.round(o.rot||0)%360)+360)%360, ax=kx, ay=ky;
  if(r===90||r===270){ ax=ky; ay=kx; } else if(r!==0&&r!==180&&Math.abs(kx-ky)>1e-6) return false;
  var cx=o.cx||0, cy=o.cy||0, wx=o.tx+cx, wy=o.ty+cy;
  o.sx=(o.sx==null?1:o.sx)*ax; o.sy=(o.sy==null?1:o.sy)*ay; o.tx=kx*(wx-ox)+ox-cx; o.ty=ky*(wy-oy)+oy-cy; return true; }
function boxSet(k,v){ var b=selBox(); if(!b||!isFinite(v)) return;
  if(k==='x'||k==='y'){ b.list.forEach(function(o){ if(k==='x') o.tx+=v-b.x; else o.ty+=v-b.y; }); commit(); return; }
  if(v<=0.01){ toast('0보다 크게 넣어 주세요'); panel(); return; }
  var kx=1, ky=1; if(k==='w'){ kx=v/b.w; ky=st.sizeLock?kx:1; } else { ky=v/b.h; kx=st.sizeLock?ky:1; }
  var ok=true; b.list.forEach(function(o){ if(!scaleAbout(o,b.x,b.y,kx,ky)) ok=false; });
  if(!ok){ b.list.forEach(function(o){ scaleAbout(o,b.x,b.y,1/kx,1/ky); }); toast('기울어진 도형은 비율을 지켜서 바꿔요'); panel(); return; }
  commit(); }
function setProp(k,v){ var s=selObjs(); s.forEach(function(o){ o[k]=v; }); if(s.length){ softRender(); clearTimeout(saveT); saveT=setTimeout(function(){ commitQuiet(); },300); } }
function commitQuiet(){ hist=hist.slice(0,hi+1); hist.push(snap()); if(hist.length>80) hist.shift(); hi=hist.length-1; persist(); $('bUndo').disabled=hi<=0; $('bRedo').disabled=true; }

/* ---------- pattern generators ---------- */
function rng(seed){ var a=seed|0; return function(){ a|=0; a=a+0x6D2B79F5|0; var t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function gcd(a,b){ return b?gcd(b,a%b):a; }
function poly(pts,close){ return 'M'+pts.map(function(p){ return f(p[0])+' '+f(p[1]); }).join('L')+(close?'Z':''); }
function circ(cx,cy,r){ return 'M'+f(cx-r)+' '+f(cy)+'a'+f(r)+' '+f(r)+' 0 1 0 '+f(2*r)+' 0a'+f(r)+' '+f(r)+' 0 1 0 '+f(-2*r)+' 0Z'; }
var PATS={
  spiro:{name:'스피로그래프',p:[['R','큰 원',3,24,8,1],['r','작은 원',1,23,3,1],['d','펜 위치',1,30,5,1]],g:function(v,c){ var R=v.R,r=Math.min(v.r,R-1)||1,d=v.d,T=2*Math.PI*r/gcd(R,r),m=R-r+d,pts=[];for(var i=0;i<=2400;i++){var t=T*i/2400;pts.push([c.cx+c.S*((R-r)*Math.cos(t)+d*Math.cos((R-r)/r*t))/m,c.cy+c.S*((R-r)*Math.sin(t)-d*Math.sin((R-r)/r*t))/m]);}return[poly(pts)];}},
  rose:{name:'장미 곡선',p:[['n','n',1,13,5,1],['m','m',1,8,2,1]],g:function(v,c){ var k=v.n/v.m,pts=[],T=2*Math.PI*v.m;for(var i=0;i<=1800;i++){var t=T*i/1800,r=c.S*Math.cos(k*t);pts.push([c.cx+r*Math.cos(t),c.cy+r*Math.sin(t)]);}return[poly(pts)];}},
  lissa:{name:'리사주',p:[['a','가로',1,12,3,1],['b','세로',1,12,2,1],['ph','어긋남',0,180,90,1]],g:function(v,c){ var pts=[];for(var i=0;i<=1600;i++){var t=2*Math.PI*i/1600;pts.push([c.cx+c.S*Math.sin(v.a*t+v.ph*Math.PI/180),c.cy+c.S*Math.sin(v.b*t)]);}return[poly(pts)];}},
  spiral:{name:'나선',p:[['t','감은 수',1,24,6,1]],g:function(v,c){ var pts=[],N=v.t*120;for(var i=0;i<=N;i++){var t=2*Math.PI*v.t*i/N,r=c.S*i/N;pts.push([c.cx+r*Math.cos(t),c.cy+r*Math.sin(t)]);}return[poly(pts)];}},
  golden:{name:'황금 나선',p:[['t','감은 수',2,10,5,1]],g:function(v,c){ var pts=[],N=v.t*140,ph=1.618034,mx=Math.pow(ph,2*v.t*4/Math.PI);for(var i=0;i<=N;i++){var t=2*Math.PI*v.t*i/N,r=c.S*Math.pow(ph,2*t/Math.PI)/Math.pow(ph,2*2*Math.PI*v.t/Math.PI);pts.push([c.cx+r*Math.cos(t),c.cy+r*Math.sin(t)]);}return[poly(pts)];}},
  phyllo:{name:'해바라기 점',p:[['n','점 수',30,1500,400,10],['s','점 크기',1,12,4,1]],g:function(v,c){ var d='',ga=Math.PI*(3-Math.sqrt(5));for(var i=1;i<=v.n;i++){var r=c.S*Math.sqrt(i/v.n),t=i*ga;d+=circ(c.cx+r*Math.cos(t),c.cy+r*Math.sin(t),v.s*c.S/400);}return{d:[d],fill:true};}},
  rosette:{name:'꽃 무늬',p:[['n','꽃잎 수',3,36,12,1],['k','겹',1,10,3,1],['w','꽃잎 폭',10,100,45,1]],g:function(v,c){ var out=[];for(var j=1;j<=v.k;j++){var R=c.S*j/v.k,d='';for(var i=0;i<v.n;i++){var a=2*Math.PI*i/v.n,ca=Math.cos(a),sa=Math.sin(a),h=R*v.w/100;function T(x,y){return f(c.cx+x*ca-y*sa)+' '+f(c.cy+x*sa+y*ca);}d+='M'+T(0,0)+'C'+T(R*.3,-h)+' '+T(R*.7,-h)+' '+T(R,0)+'C'+T(R*.7,h)+' '+T(R*.3,h)+' '+T(0,0)+'Z';}out.push(d);}return out;}},
  star:{name:'별 도형',p:[['n','꼭짓점',3,36,7,1],['k','건너뛰기',1,17,3,1]],g:function(v,c){ var n=v.n,k=Math.min(v.k,n-1)||1,seen={},d='';for(var s=0;s<n;s++){if(seen[s])continue;var pts=[],i=s;while(!seen[i]){seen[i]=1;var t=-Math.PI/2+2*Math.PI*i/n;pts.push([c.cx+c.S*Math.cos(t),c.cy+c.S*Math.sin(t)]);i=(i+k)%n;}d+=poly(pts,true);}return[d];}},
  cardio:{name:'실 그림',p:[['n','점 수',20,300,120,5],['m','곱',2,12,2,1]],g:function(v,c){ var d='';for(var i=0;i<v.n;i++){var a=-Math.PI/2+2*Math.PI*i/v.n,b=-Math.PI/2+2*Math.PI*((i*v.m)%v.n)/v.n;d+='M'+f(c.cx+c.S*Math.cos(a))+' '+f(c.cy+c.S*Math.sin(a))+'L'+f(c.cx+c.S*Math.cos(b))+' '+f(c.cy+c.S*Math.sin(b));}return[d];}},
  rings:{name:'동심 도형',p:[['n','개수',3,60,18,1],['s','변 (0=원)',0,12,0,1]],g:function(v,c){ var out=[];for(var i=1;i<=v.n;i++){var r=c.S*i/v.n;out.push(v.s>=3?poly(polyPts(c.cx,c.cy,r,v.s,-Math.PI/2),true):circ(c.cx,c.cy,r));}return out;}},
  wave:{name:'물결',p:[['n','줄 수',3,60,22,1],['a','높이',1,60,18,1],['f','주름',1,12,3,1]],g:function(v,c){ var out=[];for(var j=0;j<v.n;j++){var y=c.cy-c.S+2*c.S*j/(v.n-1),pts=[];for(var i=0;i<=120;i++){var x=c.cx-c.S+2*c.S*i/120;pts.push([x,y+c.S*v.a/100*Math.sin(v.f*Math.PI*i/60+j*.35)]);}out.push(poly(pts));}return out;}},
  grid:{name:'점·타일 격자',p:[['n','칸 수',2,30,10,1],['s','모양 1원 2네모 3마름모',1,3,1,1],['v','크기 변화',0,100,70,1]],g:function(v,c){ var out=[],cell=2*c.S/v.n;for(var j=0;j<v.n;j++){var d='';for(var i=0;i<v.n;i++){var x=c.cx-c.S+cell*(i+.5),y=c.cy-c.S+cell*(j+.5),dist=Math.hypot(i-(v.n-1)/2,j-(v.n-1)/2)/(v.n/1.4),k=1-v.v/100*Math.min(1,Math.abs(Math.sin(dist*Math.PI*1.5))),r=cell*.48*Math.max(.08,k);
      if(v.s===1)d+=circ(x,y,r);else if(v.s===2)d+=poly([[x-r,y-r],[x+r,y-r],[x+r,y+r],[x-r,y+r]],true);else d+=poly([[x,y-r],[x+r,y],[x,y+r],[x-r,y]],true);}out.push(d);}return{d:out,fill:true};}},
  truchet:{name:'호 타일',p:[['n','칸 수',4,30,10,1],['seed','무작위',1,99,7,1]],g:function(v,c){ var R=rng(v.seed),cell=2*c.S/v.n,d='';for(var j=0;j<v.n;j++)for(var i=0;i<v.n;i++){var x=c.cx-c.S+cell*i,y=c.cy-c.S+cell*j,h=cell/2,fl=R()<.5;
      if(fl)d+='M'+f(x+h)+' '+f(y)+'A'+f(h)+' '+f(h)+' 0 0 1 '+f(x)+' '+f(y+h)+'M'+f(x+cell)+' '+f(y+h)+'A'+f(h)+' '+f(h)+' 0 0 1 '+f(x+h)+' '+f(y+cell);
      else d+='M'+f(x+h)+' '+f(y)+'A'+f(h)+' '+f(h)+' 0 0 0 '+f(x+cell)+' '+f(y+h)+'M'+f(x)+' '+f(y+h)+'A'+f(h)+' '+f(h)+' 0 0 0 '+f(x+h)+' '+f(y+cell);}return[d];}},
  koch:{name:'코흐 눈송이',p:[['o','단계',0,5,3,1]],g:function(v,c){ var base=polyPts(c.cx,c.cy+c.S*.1,c.S,3,-Math.PI/2),pts=base.slice();for(var o=0;o<v.o;o++){var nx=[];for(var i=0;i<pts.length;i++){var a=pts[i],b=pts[(i+1)%pts.length],dx=(b[0]-a[0])/3,dy=(b[1]-a[1])/3,p1=[a[0]+dx,a[1]+dy],p2=[a[0]+2*dx,a[1]+2*dy],pk=[p1[0]+dx*.5+dy*.866,p1[1]+dy*.5-dx*.866];nx.push(a,p1,pk,p2);}pts=nx;}return{d:[poly(pts,true)],fill:true};}},
  sier:{name:'시어핀스키 삼각형',p:[['o','단계',0,6,4,1]],g:function(v,c){ var A=[c.cx,c.cy-c.S],B=[c.cx-c.S*.866,c.cy+c.S*.5],C=[c.cx+c.S*.866,c.cy+c.S*.5],d='';function rec(a,b,cc,n){if(!n){d+=poly([a,b,cc],true);return;}var ab=[(a[0]+b[0])/2,(a[1]+b[1])/2],bc=[(b[0]+cc[0])/2,(b[1]+cc[1])/2],ca=[(cc[0]+a[0])/2,(cc[1]+a[1])/2];rec(a,ab,ca,n-1);rec(ab,b,bc,n-1);rec(ca,bc,cc,n-1);}rec(A,B,C,v.o);return{d:[d],fill:true};}},
  heart:{name:'하트',p:[['k','겹',1,12,1,1]],g:function(v,c){ var out=[];for(var j=1;j<=v.k;j++){var pts=[],s=c.S*j/v.k/17;for(var i=0;i<=200;i++){var t=2*Math.PI*i/200;pts.push([c.cx+s*16*Math.pow(Math.sin(t),3),c.cy-s*(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))+c.S*.05]);}out.push(poly(pts,true));}return out;}}
};
function patUI(){
  var P0=PATS[PAT_SEL], h='<div class="pgrid">'+Object.keys(PATS).map(function(k){ return '<button data-pat="'+k+'"'+(k===PAT_SEL?' class="on"':'')+'>'+PATS[k].name+'</button>'; }).join('')+'</div>';
  P0.p.forEach(function(q){ var key=PAT_SEL+'.'+q[0]; if(patVals[key]==null) patVals[key]=q[4]; h+='<div class="row"><label>'+q[1]+'</label><input type="range" data-pv="'+key+'" min="'+q[2]+'" max="'+q[3]+'" step="'+q[5]+'" value="'+patVals[key]+'"><span class="v">'+patVals[key]+'</span></div>'; });
  h+='<div class="row"><label>크기</label><input type="range" data-po="scale" min="20" max="120" value="'+patOpt.scale+'"><span class="v">'+patOpt.scale+'%</span></div>';
  h+='<div class="row"><label>돌리기</label><input type="range" data-po="rot" min="0" max="360" value="'+patOpt.rot+'"><span class="v">'+patOpt.rot+'°</span></div>';
  h+='<label class="chk"><input type="checkbox" data-pc="rainbow"'+(patOpt.rainbow?' checked':'')+'> 무지개 색</label><label class="chk"><input type="checkbox" data-pc="fill"'+(patOpt.fill?' checked':'')+'> 안쪽 채우기</label>';
  h+='<div class="btns"><button class="tbtn pri" id="patGo">캔버스에 그리기</button></div><div class="note">선 색과 굵기는 \'속성\' 탭 값을 써요. 그린 뒤에는 하나의 도형처럼 움직이고 색을 바꿀 수 있어요.</div>';
  return h;
}
function hsl(i,n){ return 'hsl('+Math.round(360*i/Math.max(1,n))+',78%,55%)'; }
function drawPattern(){
  var c={cx:doc.w/2,cy:doc.h/2,S:Math.min(doc.w,doc.h)*.46*patOpt.scale/100}, v={};
  PATS[PAT_SEL].p.forEach(function(q){ v[q[0]]=+patVals[PAT_SEL+'.'+q[0]]; });
  var r=PATS[PAT_SEL].g(v,c), ds=Array.isArray(r)?r:r.d, forceFill=!Array.isArray(r)&&r.fill, made=[];
  ds.forEach(function(d,i){ var col=patOpt.rainbow&&ds.length>1?hsl(i,ds.length):st.stroke, fill=(patOpt.fill||forceFill)?(patOpt.rainbow&&ds.length>1?col:st.fill):'none';
    var o=newObj('path',{d:d,'fill-rule':'evenodd'},{stroke:forceFill&&!patOpt.fill?'none':col,fill:fill,sw:st.sw,rot:patOpt.rot,cx:c.cx,cy:c.cy}); if(forceFill&&!patOpt.fill) o.stroke='none'; doc.objs.push(o); made.push(o.id); });
  if(patOpt.rainbow&&ds.length===1&&!forceFill){ var o1=doc.objs[doc.objs.length-1]; o1.stroke=hsl(0,1); }
  sel=made; commit();
}

/* ---------- AI ---------- */
var aiBusy=false;
function cleanNode(n){
  var okTag={rect:1,circle:1,ellipse:1,line:1,polyline:1,polygon:1,path:1,text:1,g:1,tspan:1};
  var okAttr={x:1,y:1,x1:1,y1:1,x2:1,y2:1,cx:1,cy:1,r:1,rx:1,ry:1,width:1,height:1,d:1,points:1,fill:1,stroke:1,'stroke-width':1,opacity:1,'font-style':1,'letter-spacing':1,'text-decoration':1,'fill-opacity':1,'stroke-opacity':1,transform:1,'font-size':1,'font-family':1,'font-weight':1,'text-anchor':1,'stroke-linecap':1,'stroke-linejoin':1,'stroke-dasharray':1,'fill-rule':1,dx:1,dy:1};
  var tag=n.nodeName.toLowerCase(); if(!okTag[tag]) return '';
  var a=''; for(var i=0;i<n.attributes.length;i++){ var at=n.attributes[i]; if(!okAttr[at.name]) continue; if(/url\(|javascript|<|expression/i.test(at.value)) continue; a+=' '+at.name+'="'+esc(at.value)+'"'; }
  var inner=''; for(var j=0;j<n.childNodes.length;j++){ var ch=n.childNodes[j]; if(ch.nodeType===3) inner+=esc(ch.nodeValue); else if(ch.nodeType===1) inner+=cleanNode(ch); }
  return '<'+tag+a+'>'+inner+'</'+tag+'>';
}
function importSvg(markup,asSvgRoot){
  var d=new DOMParser().parseFromString('<svg xmlns="'+NS+'">'+markup+'</svg>','image/svg+xml'); if(d.querySelector('parsererror')) return 0;
  var made=[], root=d.documentElement;
  for(var i=0;i<root.childNodes.length&&made.length<400;i++){ var n=root.childNodes[i]; if(n.nodeType!==1) continue; var tag=n.nodeName.toLowerCase();
    if(tag==='svg'||tag==='defs') continue;
    var cs=cleanNode(n); if(!cs) continue;
    var tmpd=new DOMParser().parseFromString('<svg xmlns="'+NS+'">'+cs+'</svg>','image/svg+xml').documentElement.firstChild; if(!tmpd) continue;
    var o={id:uid++,tag:tag,a:{},tx:0,ty:0,rot:0,sx:1,sy:1,fill:null,stroke:null,sw:null,op:null,dash:0};
    if(tag==='g'){ var inner=''; for(var q=0;q<tmpd.childNodes.length;q++) inner+=new XMLSerializer().serializeToString(tmpd.childNodes[q]); o.inner=inner.replace(/ xmlns="[^"]*"/g,''); if(tmpd.getAttribute('transform')) o.a.transform=tmpd.getAttribute('transform'); }
    else { for(var k=0;k<tmpd.attributes.length;k++){ var an=tmpd.attributes[k].name, av=tmpd.attributes[k].value;
        if(an==='fill') o.fill=av; else if(an==='stroke') o.stroke=av; else if(an==='stroke-width') o.sw=+av||0; else if(an==='opacity') o.op=+av;
        else if(an==='stroke-linecap') o.cap=av; else if(an==='stroke-linejoin') o.join=av; else if(an==='stroke-miterlimit') o.miter=+av||4;
        else if(an==='stroke-dasharray'){ var dn=nums(av); if(dn.length&&dn[0]>0){ o.dash=dn[0]; o.gap=dn.length>1?dn[1]:dn[0]; } }
        else o.a[an]=av; }
      if(tag!=='text'&&tag!=='g'){ if(!o.cap) o.cap='butt'; if(!o.join) o.join='miter'; }
      if(tag==='text'){ var tsp=tmpd.querySelectorAll('tspan'); o.txt=tsp.length>1?[].map.call(tsp,function(q){ return q.textContent; }).join('\n'):tmpd.textContent; } }
    if(tag!=='g'&&tag!=='text'&&o.fill==null&&o.stroke==null) o.fill='#888888';
    doc.objs.push(o); made.push(o.id); }
  if(made.length){ sel=made; commit(); }
  return made.length;
}
function askAI(){
  if(aiBusy||!window.FFAI) return; var q=($('aiQ').value||'').trim(); if(!q){ toast('그리고 싶은 걸 써 주세요'); return; }
  aiBusy=true; $('aiGo').disabled=true; $('aiOut').textContent='그리는 중이에요…';
  var sys='You draw pictures as SVG. Reply with ONLY SVG shape elements, no <svg> wrapper, no markdown, no explanation. The canvas is '+doc.w+' by '+doc.h+' units, origin top left. Allowed: rect, circle, ellipse, line, polyline, polygon, path, text, g. Always give fill and/or stroke as hex colors. Use at most 60 elements. Put the main subject near the center ('+doc.w/2+','+doc.h/2+'). Use simple flat shapes.';
  FFAI.ask({system:sys,prompt:q,maxTokens:2500}).then(function(t){
    t=String(t||'').replace(/```[a-z]*/gi,'').replace(/<\/?svg[^>]*>/gi,'').trim();
    var n=importSvg(t); $('aiOut').textContent=n?(n+'개 도형을 넣었어요. 마음에 안 들면 되돌리기나 다시 시키기를 눌러요.'):'AI 답을 도형으로 바꾸지 못했어요. 다른 말로 다시 시켜 보세요.';
  }).catch(function(e){ $('aiOut').textContent=(e&&e.message)||'AI를 쓸 수 없어요. 설정에서 AI를 골라 주세요.'; }).then(function(){ aiBusy=false; var b=$('aiGo'); if(b) b.disabled=false; });
}

/* ---------- export / import ---------- */
function download(name,blob){ var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },1500); }
function fname(ext){ return (doc.name||'draw').replace(/[\\/:*?"<>|]/g,'_')+'.'+ext; }
var EX={fmt:'png',area:'canvas',scale:2,q:.92,bg:true,embed:true};
function exArea(mode){ var vis=doc.objs.filter(function(o){ return !o.hid; }), list=mode==='sel'?vis.filter(function(o){ return sel.indexOf(o.id)>=0; }):vis;
  if(mode==='canvas'||mode==='all') return {box:{x:0,y:0,w:doc.w,h:doc.h},objs:doc.objs};
  if(!list.length) return null; var x0=1e9,y0=1e9,x1=-1e9,y1=-1e9, pad=4;
  for(var i=0;i<list.length;i++){ var b=bbox(list[i]); if(!b) continue; x0=Math.min(x0,b.x); y0=Math.min(y0,b.y); x1=Math.max(x1,b.x+b.w); y1=Math.max(y1,b.y+b.h); pad=Math.max(pad,(list[i].sw||0)/2*Math.max(Math.abs(list[i].sx||1),Math.abs(list[i].sy||1))+4,(list[i].blur||0)*2,list[i].shadow?30:0); }
  if(x1<x0) return null; pad=Math.min(pad,60); return {box:{x:Math.floor(x0-pad),y:Math.floor(y0-pad),w:Math.ceil(x1-x0+pad*2),h:Math.ceil(y1-y0+pad*2)},objs:mode==='sel'?list:doc.objs}; }
function rasterBlob(svg,w,h,fmt,q,bgc){ return new Promise(function(res,rej){ var img=new Image(); img.onload=function(){ var c=document.createElement('canvas'); c.width=w; c.height=h; var x=c.getContext('2d'), mime=fmt==='jpg'?'image/jpeg':fmt==='webp'?'image/webp':'image/png';
    if(fmt!=='png'){ x.fillStyle=bgc||(doc.bgOn?doc.bg:'#ffffff'); x.fillRect(0,0,w,h); } x.drawImage(img,0,0,w,h); c.toBlob(function(b){ b?res(b):rej(new Error('blob')); },mime,q); }; img.onerror=function(){ rej(new Error('img')); }; img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg); }); }
function exBuild(){ var ar=exArea(EX.area); if(!ar) return null; var sc=EX.fmt==='svg'||EX.fmt==='pdf'?1:EX.scale;
  return {ar:ar,sc:sc,w:Math.max(1,Math.round(ar.box.w*sc)),h:Math.max(1,Math.round(ar.box.h*sc)),svg:buildSvg({box:ar.box,objs:ar.objs,scale:sc,bg:EX.bg,embed:EX.fmt==='svg'&&EX.embed&&EX.area==='canvas'})}; }
function printMulti(items){ var fr=document.createElement('iframe'); fr.style.cssText='position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;';
  var css='html,body{margin:0;background:#fff}', body=''; items.forEach(function(it,i){ css+='@page pg'+i+'{size:'+it.pw+'px '+it.ph+'px;margin:0}.p'+i+'{page:pg'+i+';break-after:page;width:'+it.pw+'px;height:'+it.ph+'px;overflow:hidden}.p'+i+' svg{display:block;width:'+it.pw+'px;height:'+it.ph+'px}'; body+='<div class="p'+i+'">'+it.svg+'</div>'; });
  fr.srcdoc='<!doctype html><meta charset="utf-8"><style>'+css+'</style>'+body; fr.onload=function(){ try{ fr.contentWindow.focus(); fr.contentWindow.print(); }catch(e){ toast('인쇄 창을 열지 못했어요'); } setTimeout(function(){ fr.remove(); },60000); }; document.body.appendChild(fr); }
function exportAllPages(){ syncPage(); var pgs=doc.pages, ext=EX.fmt, sc=(ext==='svg'||ext==='pdf')?1:EX.scale;
  var items=pgs.map(function(p,i){ return {i:i,pw:p.w,ph:p.h,bgc:p.bgOn?p.bg:'#ffffff',w:Math.round(p.w*sc),h:Math.round(p.h*sc),svg:buildSvg({box:{x:0,y:0,w:p.w,h:p.h},objs:p.objs,scale:sc,bg:EX.bg,bgc:p.bg,bgOn:p.bgOn})}; });
  if(ext==='pdf'){ printMulti(items); return; }
  var wait=function(){ return new Promise(function(r){ setTimeout(r,300); }); }, chain=Promise.resolve();
  items.forEach(function(it){ chain=chain.then(function(){ var nm=fname(ext).replace(/\.([^.]+)$/,'-'+(it.i+1)+'.$1');
    if(ext==='svg'){ download(nm,new Blob([it.svg],{type:'image/svg+xml'})); return wait(); }
    return rasterBlob(it.svg,it.w,it.h,ext,EX.q,it.bgc).then(function(bl){ download(nm,bl); return wait(); }); }); });
  chain.then(function(){ toast(items.length+'장을 받았어요'); }).catch(function(){ toast('일부를 그림으로 바꾸지 못했어요'); }); }
function printSvg(svg,w,h){ var fr=document.createElement('iframe'); fr.style.cssText='position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;';
  fr.srcdoc='<!doctype html><meta charset="utf-8"><style>@page{size:'+w+'px '+h+'px;margin:0}html,body{margin:0;background:#fff}svg{display:block;width:'+w+'px;height:'+h+'px}</style>'+svg;
  fr.onload=function(){ try{ fr.contentWindow.focus(); fr.contentWindow.print(); }catch(e){ toast('인쇄 창을 열지 못했어요'); } setTimeout(function(){ fr.remove(); },60000); }; document.body.appendChild(fr); }
function openExport(){ var old=document.querySelector('.dlgbg'); if(old) old.remove();
  var bgd=document.createElement('div'); bgd.className='dlgbg';
  bgd.innerHTML='<div class="dlg"><h3>내보내기</h3><div class="row"><label>형식</label><select id="exF"><option value="png">PNG (투명 가능)</option><option value="jpg">JPG (작은 용량)</option><option value="webp">WebP</option><option value="svg">SVG (벡터)</option><option value="pdf">PDF·인쇄</option></select></div>'
   +'<div class="row"><label>범위</label><select id="exA"><option value="canvas">캔버스 전체</option><option value="content">그림 내용에 맞춰 자르기</option><option value="sel">고른 도형만</option>'+(doc.pages?'<option value="all">모든 페이지 ('+doc.pages.length+'장)</option>':'')+'</select></div>'
   +'<div class="row" id="exSr"><label>배율</label><select id="exS"><option value="0.5">0.5배</option><option value="1">1배 (원래 크기)</option><option value="2">2배</option><option value="3">3배</option><option value="4">4배</option></select></div>'
   +'<div class="row" id="exQr"><label>품질</label><input type="range" id="exQ" min="40" max="100" value="92"><span class="v" id="exQv">92</span></div>'
   +'<label class="chk" id="exBr"><input type="checkbox" id="exB"> 배경 색 포함 (끄면 투명)</label><label class="chk" id="exEr"><input type="checkbox" id="exE"> SVG에 편집 정보 넣기 (다시 열면 그대로 고칠 수 있어요)</label>'
   +'<div class="note" id="exInfo"></div><div class="btns"><button class="tbtn pri" id="exGo">내보내기</button><button class="tbtn" id="exCp">그림으로 복사</button><button class="tbtn" id="exX">닫기</button></div></div>';
  document.body.appendChild(bgd); var q=function(id){ return bgd.querySelector('#'+id); };
  q('exF').value=EX.fmt; q('exA').value=EX.area; q('exS').value=String(EX.scale); q('exQ').value=Math.round(EX.q*100); q('exB').checked=EX.bg; q('exE').checked=EX.embed;
  function sync(){ EX.fmt=q('exF').value; EX.area=q('exA').value; EX.scale=+q('exS').value; EX.q=+q('exQ').value/100; EX.bg=q('exB').checked; EX.embed=q('exE').checked; q('exQv').textContent=Math.round(EX.q*100);
    var r=EX.fmt==='png'||EX.fmt==='jpg'||EX.fmt==='webp'; q('exSr').hidden=!r; q('exQr').hidden=!(EX.fmt==='jpg'||EX.fmt==='webp'); q('exBr').hidden=EX.fmt==='jpg'; q('exEr').hidden=!(EX.fmt==='svg'&&EX.area==='canvas'); q('exCp').hidden=!r||EX.area==='all'; q('exGo').textContent=EX.fmt==='pdf'?'인쇄 창 열기 (PDF로 저장 가능)':'내보내기';
    var b=exBuild(); if(!b){ q('exInfo').textContent='고른 도형이 없어요. 먼저 도형을 골라 주세요.'; q('exGo').disabled=true; q('exCp').disabled=true; return; } q('exGo').disabled=false; q('exCp').disabled=false;
    q('exInfo').textContent=b.w+' × '+b.h+' px'+(EX.fmt==='svg'?' · 약 '+Math.max(1,Math.round(b.svg.length/1024))+'KB':'')+(b.w*b.h>1.2e8?' · 너무 커요, 배율을 줄여 주세요':''); }
  bgd.addEventListener('input',sync); bgd.addEventListener('change',sync); sync();
  q('exX').onclick=function(){ bgd.remove(); }; bgd.addEventListener('pointerdown',function(e){ if(e.target===bgd) bgd.remove(); });
  q('exGo').onclick=function(){ var b=exBuild(); if(!b) return; if(EX.area==='all'&&doc.pages){ exportAllPages(); return; } var nm=fname(EX.fmt==='pdf'?'pdf':EX.fmt);
    if(EX.fmt==='svg'){ download(nm,new Blob([b.svg],{type:'image/svg+xml'})); toast('SVG를 받았어요'); return; }
    if(EX.fmt==='pdf'){ printSvg(b.svg,b.ar.box.w,b.ar.box.h); return; }
    if(b.w*b.h>1.2e8){ toast('그림이 너무 커요. 배율을 줄여 주세요'); return; }
    rasterBlob(b.svg,b.w,b.h,EX.fmt,EX.q).then(function(bl){ download(nm,bl); toast('받았어요 ('+Math.max(1,Math.round(bl.size/1024))+'KB)'); }).catch(function(){ toast('그림으로 바꾸지 못했어요. SVG로 받아 보세요.'); }); };
  q('exCp').onclick=function(){ var b=exBuild(); if(!b) return; if(!(navigator.clipboard&&window.ClipboardItem)){ toast('이 브라우저는 그림 복사를 지원하지 않아요. 받기를 써 주세요'); return; }
    var pr=rasterBlob(b.svg,b.w,b.h,'png',1); navigator.clipboard.write([new ClipboardItem({'image/png':pr})]).then(function(){ toast('클립보드에 복사했어요'); }).catch(function(){ toast('복사하지 못했어요. 받기를 써 주세요'); }); }; }
function cropToContent(){ var vis=doc.objs.filter(function(o){ return !o.hid; }); var ar=exArea('content'); if(!ar){ toast('자를 내용이 없어요'); return; } var bx=ar.box, pad=20, dx=bx.x-pad, dy=bx.y-pad;
  doc.objs.forEach(function(o){ o.tx-=dx; o.ty-=dy; }); (doc.guides||[]).forEach(function(g){ g.p-=(g.v==='x'?dx:dy); }); doc.w=Math.max(16,Math.min(8000,Math.ceil(bx.w+pad*2))); doc.h=Math.max(16,Math.min(8000,Math.ceil(bx.h+pad*2))); commit(); fit(); toast('캔버스를 그림 크기에 맞췄어요'); }
function exportPng(scale){
  var svg=docSvg(true), img=new Image(); img.onload=function(){ var c=document.createElement('canvas'); c.width=Math.round(doc.w*scale); c.height=Math.round(doc.h*scale); var x=c.getContext('2d'); x.drawImage(img,0,0,c.width,c.height); c.toBlob(function(b){ download(fname('png'),b); },'image/png'); };
  img.onerror=function(){ toast('PNG로 바꾸지 못했어요. SVG로 받아 보세요.'); }; img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
function openFile(file){
  var r=new FileReader(); r.onload=function(){ var t=String(r.result);
    try{
      if(/\.svg$/i.test(file.name)||/^\s*<(\?xml|svg)/i.test(t)){ var d=new DOMParser().parseFromString(t,'image/svg+xml'), root=d.documentElement, md=d.querySelector('metadata'); if(md&&md.getAttribute('id')==='fdraw-data'){ load(decodeURIComponent(escape(atob(md.textContent.trim())))); sel=[]; commit(); $('dname').value=doc.name; fit(); toast('편집 정보가 들어 있는 SVG를 그대로 열었어요'); return; }
        var vb=(root.getAttribute('viewBox')||'').split(/[ ,]+/).map(Number);
        if(vb.length===4&&vb[2]>0){ doc.w=Math.round(vb[2]); doc.h=Math.round(vb[3]); } else { doc.w=parseInt(root.getAttribute('width'))||doc.w; doc.h=parseInt(root.getAttribute('height'))||doc.h; }
        var inner=''; for(var i=0;i<root.childNodes.length;i++) if(root.childNodes[i].nodeType===1) inner+=new XMLSerializer().serializeToString(root.childNodes[i]);
        doc.objs=[]; sel=[]; var n=importSvg(inner.replace(/ xmlns="[^"]*"/g,'')); doc.name=file.name.replace(/\.[^.]+$/,''); $('dname').value=doc.name; if(!n) commit(); fit(); toast(n+'개 도형을 열었어요 (SVG의 그림·글자·기울임 일부는 빠질 수 있어요)'); }
      else { load(t); sel=[]; commit(); $('dname').value=doc.name; fit(); }
    }catch(e){ toast('이 파일을 열지 못했어요'); } };
  r.readAsText(file);
}

/* ---------- ui ---------- */
var TOOLS=[['sel','↖','고르기 (V)'],['hand','✋','화면 옮기기 (H)'],['pen','✏️','자유 선 (P)'],['line','╱','직선 (L)'],['brush','🖌️','붓: 속도·필압에 따라 굵기가 변하는 선'],['bez','✒️','펜: 눌러 점을 찍고 끌면 곡선 손잡이가 생겨요'],['shape','🔷','도형 모음: 하트·말풍선·구름 등'],['curve','〰️','곡선: 눌러 점 찍기, 두 번 누르면 끝'],['rect','▭','네모 (R)'],['ellipse','◯','원 (O)'],['poly','⬡','다각형 (G)'],['star','☆','별 (S)'],['node','◇','점 고치기 (N): 흰 점을 끌어 옮겨요'],['text','T','글자 (T)'],['eye','💧','스포이트: 도형을 누르면 색·선 모양을 가져와요. 다른 도형을 먼저 골라 두면 그 도형에 입혀요'],['bucket','🪣','색 채우기'],['erase','🧽','지우개 (E)']];
function renderTools(){ $('tools').innerHTML=TOOLS.map(function(t){ return '<button class="tl'+(t[0]===tool?' on':'')+'" data-t="'+t[0]+'" title="'+t[2]+'">'+t[1]+'</button>'; }).join(''); }
var ptab='prop';
function rowRange(lbl,id,min,max,val,unit,step){ return '<div class="row"><label>'+lbl+'</label><input type="range" data-s="'+id+'" min="'+min+'" max="'+max+'" step="'+(step||1)+'" value="'+val+'"><span class="v">'+f(val)+(unit||'')+'</span></div>'; }
function panel(){ symBar();
  var b=$('pbody'), h='';
  document.querySelectorAll('#ptabs button').forEach(function(x){ x.classList.toggle('on',x.dataset.p===ptab); });
  if(ptab==='prop'){
    var so=selObjs(), o=so[0];
    if(tool==='bez') h+='<div class="sec"><h4>펜 (곡선 손잡이)</h4><div class="btns"><button class="tbtn pri" data-a="bezend">여기서 끝내기</button><button class="tbtn" data-a="bezclose">닫아서 끝내기</button><button class="tbtn" data-a="bezcancel">취소</button></div><div class="note">캔버스를 눌러 점을 찍어요. 누른 채 끌면 부드러운 곡선 손잡이가 생겨요. 처음 점을 누르면 닫히고, 마지막 점을 다시 누르면 끝나요.</div></div>';
    if(tool==='node') h+='<div class="sec"><h4>점 고치기</h4>'+(o&&o.pts?(o.bz?'':'<label class="chk"><input type="checkbox" data-o="sh"'+(o.sh?' checked':'')+'> 꺾인(뾰족한) 선으로</label>')+'<div class="btns"><button class="tbtn" data-a="nsmooth"'+(nodeSel<0?' disabled':'')+'>고른 점 부드럽게</button><button class="tbtn" data-a="ncorner"'+(nodeSel<0?' disabled':'')+'>고른 점 꺾기</button><button class="tbtn" data-a="ndel"'+(nodeSel<0?' disabled':'')+'>고른 점 지우기</button></div><div class="btns"><button class="tbtn" data-a="nallsmooth">모두 부드럽게</button><button class="tbtn" data-a="nallcorner">모두 꺾기</button></div><div class="note">점을 눌러 고르면 주황 손잡이가 보여요. 손잡이를 끌어 곡선을 다듬어요 (Alt: 한쪽만). 선 위를 두 번 누르면 점이 늘고, 점을 두 번 누르면 없어져요.</div>':(o?'<div class="btns"><button class="tbtn pri" data-a="topath">점 고칠 수 있게 바꾸기</button></div><div class="note">네모·원·직선·다각형과 곡선 선은 바꿀 수 있어요.</div>':'<div class="note">고칠 도형을 눌러서 골라요.</div>'))+'</div>';
      if(tool==='brush') h+='<div class="sec"><h4>붓</h4>'+rowRange('붓 굵기','bsize',2,80,st.bsize,'px')+'<div class="row"><label>굵기 변화</label><select data-st="bdyn"><option value="auto"'+(st.bdyn==='auto'?' selected':'')+'>속도·필압에 따라</option><option value="fixed"'+(st.bdyn==='fixed'?' selected':'')+'>일정하게</option></select></div><label class="chk"><input type="checkbox" data-k="btaper"'+(st.btaper?' checked':'')+'> 처음과 끝을 뾰족하게</label><div class="note">선 색으로 칠해진 하나의 도형이 돼요. 빠르게 그으면 가늘고, 천천히 그으면 굵어져요. 펜이 있으면 누르는 힘도 반영돼요.</div></div>';
      if(tool==='shape') h+='<div class="sec"><h4>도형 모음</h4><div class="pgrid">'+Object.keys(SHAPES).map(function(k){ return '<button data-shp="'+k+'"'+(k===st.shp?' class="on"':'')+'>'+SHAPES[k][0]+'</button>'; }).join('')+'</div><div class="note">캔버스에서 끌어 크기를 정해요. 안쪽 색으로 칠해져요 (Shift: 정사각형 비율).</div></div>';
    h+='<div class="sec"><h4>'+(o?'고른 도형 ('+so.length+'개)':'새로 그릴 도형')+'</h4>';
    var fill=o?(o.fill==null||o.fill==='none'?'none':o.fill):st.fill, strokeC=o?(o.stroke==null||o.stroke==='none'?'none':o.stroke):st.stroke;
    var gr=o&&o.grad;
    if(!gr&&!(o&&o.pat)) h+='<div class="row"><label>안쪽 색</label><input type="color" data-c="fill" value="'+hex(fill==='none'?st.fill:fill)+'"><label class="chk" style="margin:0;flex:1"><input type="checkbox" data-k="fillOn"'+((o?fill!=='none':st.fillOn)?' checked':'')+'> 채우기</label></div>';
    if(o&&o.tag!=='image'){ var pt=o.pat; h+='<div class="row"><label>채우는 법</label><select data-gt="1"><option value=""'+(gr||pt?'':' selected')+'>한 가지 색</option><option value="lin"'+(gr&&gr.t==='lin'?' selected':'')+'>그라데이션 (직선)</option><option value="rad"'+(gr&&gr.t==='rad'?' selected':'')+'>그라데이션 (둥글게)</option><option value="pat"'+(pt?' selected':'')+'>무늬 (줄·점·격자)</option></select></div>';
      if(gr) h+=gradUI(gr); if(pt) h+=patFillUI(pt); }
    h+='<div class="row"><label>선 색</label><input type="color" data-c="stroke" value="'+hex(strokeC==='none'?st.stroke:strokeC)+'"></div>';
    h+=rowRange('선 굵기','sw',0,60,o&&o.sw!=null?o.sw:st.sw,'px');
    h+=rowRange('투명도','op',0.05,1,o&&o.op!=null?o.op:st.op,'',0.05);
    var dsh=o?(o.dash||0):st.dash, gpv=o?(o.gap>0?o.gap:dsh*.8):(st.gap>0?st.gap:dsh*.8), cp=o?(o.cap||'round'):st.cap, jn=o?(o.join||'round'):st.join, sw0=o&&o.sw!=null?o.sw:st.sw;
    h+='</div>';
    h+=swUI();
    if(!o||(o.tag!=='text'&&o.tag!=='image')){
      h+='<div class="sec"><h4>선 모양</h4><div class="btns">'+[['solid','실선'],['dash','점선'],['long','긴 점선'],['dot','동그란 점']].map(function(x){ return '<button class="tbtn" data-dp="'+x[0]+'">'+x[1]+'</button>'; }).join('')+'</div>';
      h+=rowRange('점선 길이','dash',0,60,dsh,'px',.5)+(dsh?rowRange('점선 간격','gap',0.5,60,gpv,'px',.5):'');
      h+='<div class="row"><label>끝 모양</label><select data-oa="cap">'+[['round','둥글게'],['butt','평평하게'],['square','네모로']].map(function(x){ return '<option value="'+x[0]+'"'+(cp===x[0]?' selected':'')+'>'+x[1]+'</option>'; }).join('')+'</select></div>';
      h+='<div class="row"><label>꺾이는 곳</label><select data-oa="join">'+[['round','둥글게'],['miter','뾰족하게'],['bevel','깎아서']].map(function(x){ return '<option value="'+x[0]+'"'+(jn===x[0]?' selected':'')+'>'+x[1]+'</option>'; }).join('')+'</select></div>';
      if(jn==='miter') h+=rowRange('뾰족함 한계','miter',1,20,o?(o.miter||4):st.miter,'x',.5);
      if(!o?(tool==='line'||tool==='curve'||tool==='pen'):(o.tag==='line'||o.tag==='path'||o.tag==='polyline')){
        var AH=[['','없음'],['arrow','화살표'],['open','열린 화살표'],['dot','동그라미'],['diamond','마름모'],['bar','막대']], m1=o?o.mk1||'':st.mk1, m2=o?o.mk2||'':st.mk2;
        h+='<div class="row"><label>시작 끝</label><select data-oa="mk1">'+AH.map(function(x){ return '<option value="'+x[0]+'"'+(m1===x[0]?' selected':'')+'>'+x[1]+'</option>'; }).join('')+'</select></div>';
        h+='<div class="row"><label>마지막 끝</label><select data-oa="mk2">'+AH.map(function(x){ return '<option value="'+x[0]+'"'+(m2===x[0]?' selected':'')+'>'+x[1]+'</option>'; }).join('')+'</select></div>';
        if(m1||m2) h+=rowRange('머리 크기','mks',.4,4,o?(o.mks||1):st.mks,'x',.1);
      }
      h+='</div>';
    }
    if(o) h+='<div class="sec"><h4>위치와 크기</h4>'+boxUI()+'</div>';
    if(o){
      h+='<div class="sec"><h4>모양 바꾸기</h4>'+rowRange('돌리기','rot',-180,180,o.rot||0,'°')+rowRange('크기 배율','scl',0.1,4,Math.abs(o.sx==null?1:o.sx),'x',0.05);
      h+='<div class="btns"><button class="tbtn" data-a="hflip">좌우 뒤집기</button><button class="tbtn" data-a="vflip">위아래 뒤집기</button><button class="tbtn" data-a="dup">복제</button><button class="tbtn" data-a="front">맨 앞</button><button class="tbtn" data-a="up">앞으로</button><button class="tbtn" data-a="down">뒤로</button><button class="tbtn" data-a="back">맨 뒤</button><button class="tbtn" data-a="del">지우기</button></div>';
      h+='<div class="sec" style="margin-top:10px"><h4>효과</h4>'+'<div class="row"><label>섞기 방식</label><select data-oa="blend">'+[['normal','보통'],['multiply','곱하기 (어둡게)'],['screen','스크린 (밝게)'],['overlay','오버레이'],['darken','어두운 쪽'],['lighten','밝은 쪽'],['color-dodge','색 번쩍'],['color-burn','색 태우기'],['difference','차이'],['exclusion','제외'],['hue','색조'],['luminosity','밝기']].map(function(x){ return '<option value="'+x[0]+'"'+((o.blend||'normal')===x[0]?' selected':'')+'>'+x[1]+'</option>'; }).join('')+'</select></div>'+rowRange('흐리게','blur',0,40,o.blur||0,'px')+'<label class="chk"><input type="checkbox" data-o="shadow"'+(o.shadow?' checked':'')+'> 그림자</label>'+(o.shadow?shadowUI(o):'')+'</div>';
      h+='<div class="sec"><h4>정렬</h4><div class="btns">'+[['l','⇤ 왼쪽'],['c','↔ 가운데'],['r','⇥ 오른쪽'],['t','⇧ 위'],['m','↕ 가운데'],['b','⇩ 아래'],['dh','가로 간격 같게'],['dv','세로 간격 같게']].map(function(x){ return '<button class="tbtn" data-al="'+x[0]+'">'+x[1]+'</button>'; }).join('')+'</div><div class="note">'+(so.length===1?'하나만 골랐으면 캔버스에 맞춰요.':'고른 것들끼리 맞춰요.')+'</div></div>';
      h+='<div class="sec"><h4>묶기 · 합치기</h4><div class="btns"><button class="tbtn" data-a="group">묶기 (Ctrl+G)</button><button class="tbtn" data-a="ungroup">풀기 (Ctrl+Shift+G)</button><button class="tbtn" data-a="clipmk">클리핑 마스크</button></div><div class="btns"><button class="tbtn" data-a="bu">하나로 합치기</button><button class="tbtn" data-a="bi">겹친 곳만</button><button class="tbtn" data-a="bs">빼기 (아래 − 위)</button><button class="tbtn" data-a="bx">겹친 곳 빼기</button></div><div class="note">합치기는 네모·원·다각형·닫힌 곡선을 두 개 이상 골랐을 때 돼요. 클리핑 마스크는 맨 위 도형 모양으로 아래 도형들을 잘라 보여줘요.</div></div>';
      h+=symUI(so,o)+simUI(o)+(o.tag==='image'?traceUI():'')+adjUI(o)+arrUI()+offUI();
      var txo=so.length===1&&o.tag==='text'?o:null, hasShape=so.length>=2&&so.some(function(q){ return q.tag==='text'; })&&so.some(function(q){ return q.tag!=='text'; });
      if(hasShape) h+='<div class="sec"><h4>글자 + 선</h4><div class="btns"><button class="tbtn pri" data-a="top">글자를 선 따라 쓰기</button></div><div class="note">글자 하나와 선·도형 하나를 같이 골랐어요.</div></div>';
      if(txo){ var FAM=[['\'Noto Sans KR\',sans-serif','고딕'],['serif','명조'],['Georgia,serif','Georgia (세리프)'],['\'Trebuchet MS\',sans-serif','Trebuchet'],['monospace','고정폭'],['\'Courier New\',monospace','Courier'],['cursive','필기체'],['\'Comic Sans MS\',cursive','Comic'],['Impact,sans-serif','굵은 제목']], an0=txo.a['text-anchor']||'start';
        h+='<div class="sec"><h4>글자</h4><textarea data-txt="1" rows="3" style="min-height:60px">'+esc(txo.txt||'')+'</textarea><div class="btns"><button class="tbtn" data-a="tedit">캔버스에서 고치기</button><button class="tbtn" data-a="tout">윤곽선 도형으로 바꾸기</button></div>'+rowRange('글자 크기','fs',8,300,+txo.a['font-size']||48,'px')+'<div class="row"><label>글꼴</label><select data-tf="family">'+FAM.map(function(x){ return '<option value="'+esc(x[0])+'"'+((txo.a['font-family']||'')===x[0]?' selected':'')+'>'+x[1]+'</option>'; }).join('')+'</select></div>'
          +'<div class="btns"><label class="chk" style="margin:0"><input type="checkbox" data-tf="bold"'+((txo.a['font-weight']||'')==='700'?' checked':'')+'> 굵게</label><label class="chk" style="margin:0"><input type="checkbox" data-tf="italic"'+(txo.a['font-style']==='italic'?' checked':'')+'> 기울임</label><label class="chk" style="margin:0"><input type="checkbox" data-tf="under"'+(txo.a['text-decoration']==='underline'?' checked':'')+'> 밑줄</label></div>'
          +(txo.tp?'':'<div class="row"><label>맞춤</label><select data-tf="anchor">'+[['start','왼쪽'],['middle','가운데'],['end','오른쪽']].map(function(x){ return '<option value="'+x[0]+'"'+(an0===x[0]?' selected':'')+'>'+x[1]+'</option>'; }).join('')+'</select></div>')
          +rowRange('글자 간격','ls',-5,40,+txo.a['letter-spacing']||0,'px',.5)+(txo.tp?rowRange('시작 위치','tpo',0,100,txo.tpo||0,'%')+'<div class="btns"><button class="tbtn" data-a="topoff">선 따라 쓰기 풀기</button></div>':rowRange('줄 간격','lh',.8,3,txo.lh||1.2,'x',.05))+'</div>'; }
      h+='</div>';
    } else {
      if(tool==='poly') h+='<div class="sec"><h4>다각형</h4>'+rowRange('변 개수','sides',3,24,st.sides)+'</div>';
      if(tool==='star') h+='<div class="sec"><h4>별</h4>'+rowRange('꼭짓점','star',3,24,st.star)+rowRange('안쪽 깊이','inner',10,90,st.inner,'%')+'</div>';
      if(tool==='rect') h+='<div class="sec"><h4>네모</h4>'+rowRange('둥글게','round',0,100,st.round,'%')+'</div>';
      if(tool==='text') h+='<div class="sec"><h4>글자</h4><div class="row"><label>내용</label><input type="text" data-st="txt" value="'+esc(st.txt)+'"></div>'+rowRange('크기','font',8,300,st.font,'px')+'</div>';
      if(tool==='pen'||tool==='curve') h+='<div class="sec"><h4>대칭으로 그리기</h4>'+rowRange('돌려 겹치기','sym',1,24,st.sym,'겹')+'<label class="chk"><input type="checkbox" data-k="mirror"'+(st.mirror?' checked':'')+'> 거울처럼 뒤집어 겹치기</label>'+(tool==='curve'?'<label class="chk"><input type="checkbox" data-k="closed"'+(st.closed?' checked':'')+'> 끝을 이어서 닫기</label>':'')+'<div class="note">대칭의 가운데는 캔버스 가운데예요. 2~12겹이면 눈송이·꽃 같은 무늬가 돼요.</div></div>';
      h+='<div class="note">도구를 고르고 캔버스에서 끌어 그려요. 고르기(↖)로 도형을 눌러 고치고, Shift를 누르면 비율·각도가 맞춰져요.</div>';
    }
  } else if(ptab==='pat') h=patUI();
  else if(ptab==='ly'){
    h=pagesUI()+symLibUI()+'<div class="sec"><h4>레이어 (위쪽이 앞에 있어요)</h4><div class="note" style="margin:0 0 6px">이름을 두 번 누르면 이름을 바꿔요. ⠿를 끌면 순서가 바뀌고, Shift를 누른 채 누르면 여러 개를 골라요.</div>'+(doc.objs.length?doc.objs.slice().reverse().map(function(o){ return '<div class="lyr'+(sel.indexOf(o.id)>=0?' on':'')+'" data-row="'+o.id+'"><span class="grip" data-ly="grip" data-i="'+o.id+'" title="끌어서 순서 바꾸기">⠿</span><button data-ly="eye" data-i="'+o.id+'" title="보이기/숨기기">'+(o.hid?'🚫':'👁')+'</button><button data-ly="lock" data-i="'+o.id+'" title="잠그기">'+(o.lock?'🔒':'🔓')+'</button><button class="nm" data-ly="pick" data-i="'+o.id+'">'+esc(layerName(o))+'</button><button data-ly="up" data-i="'+o.id+'" title="앞으로">▲</button><button data-ly="down" data-i="'+o.id+'" title="뒤로">▼</button></div>'; }).join(''):'<div class="note">아직 도형이 없어요</div>')+'<div class="btns"><button class="tbtn" data-a="showall">모두 보이기</button><button class="tbtn" data-a="unlockall">잠금 모두 풀기</button></div></div>'; }
  else if(ptab==='ai'){
    h='<div class="sec"><h4>AI에게 그림 시키기 (시험 기능)</h4><textarea id="aiQ" placeholder="예: 파란 별 12개를 원 모양으로 배치해줘 / 노란 해와 초록 언덕 / 무지개색 동심원"></textarea><div class="btns"><button class="tbtn pri" id="aiGo">그리기</button><button class="tbtn" id="aiSet">AI 설정</button></div><div class="note" id="aiOut">AI는 도형·무늬·간단한 그림만 그려요. 사진 같은 그림은 못 그리고 결과가 엉뚱할 수 있어요. 마음에 안 들면 되돌리기를 눌러요.</div></div>';
  } else {
    h='<div class="sec"><h4>캔버스 크기</h4><div class="row"><label>가로</label><input type="number" id="cw" min="16" max="8000" value="'+doc.w+'"><span class="v">px</span></div><div class="row"><label>세로</label><input type="number" id="ch" min="16" max="8000" value="'+doc.h+'"><span class="v">px</span></div>';
    var PRE=[['SNS',[['인스타 정사각 1080×1080',1080,1080],['인스타 세로 1080×1350',1080,1350],['스토리·릴스 1080×1920',1080,1920],['유튜브 썸네일 1280×720',1280,720],['유튜브 채널 배너 2560×1440',2560,1440],['트위터 헤더 1500×500',1500,500],['페이스북 커버 820×312',820,312],['프로필 사진 400×400',400,400]]],['화면',[['풀HD 1920×1080',1920,1080],['4K 3840×2160',3840,2160],['아이폰 390×844',390,844],['태블릿 820×1180',820,1180],['웹 배너 728×90',728,90],['웹 사각 배너 300×250',300,250]]],['종이 (96dpi)',[['A3 세로',1123,1587],['A4 세로',794,1123],['A4 가로',1123,794],['A5 세로',559,794],['B5 세로',665,945],['레터 8.5×11in',816,1056],['엽서 100×148mm',378,559],['명함 90×50mm',340,189]]],['아이콘',[['16',16,16],['32',32,32],['64',64,64],['128',128,128],['256',256,256],['512',512,512],['1024',1024,1024]]]];
    h+='<div class="row"><label>크기 목록</label><select data-presel="1"><option value="">고르세요</option>'+PRE.map(function(g){ return '<optgroup label="'+g[0]+'">'+g[1].map(function(x){ return '<option value="'+x[1]+','+x[2]+'">'+x[0]+'</option>'; }).join('')+'</optgroup>'; }).join('')+'</select></div><div class="btns"><button class="tbtn" id="cvSwap">가로↔세로 바꾸기</button><button class="tbtn pri" id="cvApply">크기 적용</button></div></div>';
    h+='<div class="sec"><h4>배경</h4><div class="row"><label>배경 색</label><input type="color" id="bgc" value="'+hex(doc.bg)+'"><label class="chk" style="margin:0;flex:1"><input type="checkbox" id="bgOn"'+(doc.bgOn?' checked':'')+'> 배경 칠하기</label></div><div class="note">배경을 끄면 PNG가 투명해져요.</div></div>';
    h+='<div class="sec"><h4>격자</h4><label class="chk"><input type="checkbox" data-k="grid"'+(st.grid?' checked':'')+'> 격자 보기</label><div class="row"><label>모양</label><select data-st="gridType">'+[['sq','네모 격자'],['dots','점 격자'],['iso','삼각(아이소메트릭) 격자']].map(function(x){ return '<option value="'+x[0]+'"'+(st.gridType===x[0]?' selected':'')+'>'+x[1]+'</option>'; }).join('')+'</select></div><label class="chk"><input type="checkbox" data-k="snap"'+(st.snap?' checked':'')+'> 격자에 맞추기</label><label class="chk"><input type="checkbox" data-k="smart"'+(st.smart?' checked':'')+'> 옮길 때 다른 도형·캔버스 가운데와 가장자리에 달라붙기 (분홍 줄)</label>'+rowRange('격자 간격','gridSize',10,200,st.gridSize,'px',5)+'</div>';
    h+='<div class="sec"><h4>눈금자 · 가이드</h4><label class="chk"><input type="checkbox" data-k="rulers"'+(st.rulers?' checked':'')+'> 눈금자 보기 (눈금자에서 캔버스로 끌면 가이드 선이 생겨요)</label><label class="chk"><input type="checkbox" data-gopt="ghide"'+(doc.ghide?' checked':'')+'> 가이드 숨기기</label><label class="chk"><input type="checkbox" data-gopt="glock"'+(doc.glock?' checked':'')+'> 가이드 잠그기</label>'
      +(doc.guides||[]).map(function(q,i){ return '<div class="row"><label>'+(q.v==='x'?'세로 선 X':'가로 선 Y')+'</label><input type="number" step="1" data-gi="'+i+'" value="'+f(q.p)+'"><button class="tbtn" data-gdel="'+i+'">✕</button></div>'; }).join('')
      +'<div class="btns"><button class="tbtn" data-a="gaddv">세로 가이드 추가</button><button class="tbtn" data-a="gaddh">가로 가이드 추가</button><button class="tbtn" data-a="gsel">고른 도형 가장자리에</button><button class="tbtn" data-a="gclr">가이드 모두 지우기</button></div><div class="note">도형을 옮길 때 가이드에도 달라붙어요.</div></div>';
    h+='<div class="sec"><div class="btns"><button class="tbtn" id="cvCrop">캔버스를 그림 크기에 맞추기</button></div><button class="tbtn" id="bClear">모두 지우고 새로 시작</button></div>';
  }
  b.innerHTML=h;
}
function hex(c){ if(/^#[0-9a-f]{6}$/i.test(c)) return c; if(/^#[0-9a-f]{3}$/i.test(c)) return '#'+c[1]+c[1]+c[2]+c[2]+c[3]+c[3]; var cv=document.createElement('canvas').getContext('2d'); cv.fillStyle='#000'; cv.fillStyle=c; var v=cv.fillStyle; return /^#/.test(v)?v:'#000000'; }

$('tools').addEventListener('click',function(e){ var b=e.target.closest('.tl'); if(b) setTool(b.dataset.t); });
$('ptabs').addEventListener('click',function(e){ var b=e.target.closest('button'); if(b){ ptab=b.dataset.p; panel(); } });
var pb=$('pbody');
pb.addEventListener('input',function(e){
  var t=e.target;
  if(t.dataset.pv){ patVals[t.dataset.pv]=+t.value; t.nextElementSibling.textContent=t.value; return; }
  if(t.dataset.po){ patOpt[t.dataset.po]=+t.value; t.nextElementSibling.textContent=t.value+(t.dataset.po==='scale'?'%':'°'); return; }
  if(t.dataset.gc){ selObjs().forEach(function(o){ if(o.grad) o.grad[t.dataset.gc]=t.value; }); softRender(); return; }
  if(t.dataset.gs){ var gq=t.dataset.gs.split(':'), gi=+gq[0], gk=gq[1]; selObjs().forEach(function(o){ if(!o.grad) return; var stq=gradEnsure(o.grad); if(!stq[gi]) return; if(gk==='c') stq[gi].c=t.value; else if(gk==='o') stq[gi].o=Math.max(0,Math.min(1,(+t.value||0)/100)); else stq[gi].a=Math.max(0,Math.min(1,(+t.value||0)/100)); o.grad.c1=stq[0].c; o.grad.c2=stq[stq.length-1].c; }); softRender(); clearTimeout(saveT); saveT=setTimeout(commitQuiet,300); return; }
  if(t.dataset.ps&&t.type!=='checkbox'&&t.tagName!=='SELECT'){ selObjs().forEach(function(o){ if(o.pat){ o.pat[t.dataset.ps]=t.type==='color'?t.value:+t.value; } }); softRender(); clearTimeout(saveT); saveT=setTimeout(commitQuiet,300); return; }
  if(t.dataset.sdc){ selObjs().forEach(function(o){ o.sdc=t.value; }); softRender(); clearTimeout(saveT); saveT=setTimeout(commitQuiet,300); return; }
  if(t.dataset.c){ var k=t.dataset.c; if(selObjs().length){ setProp(k,t.value); } st[k]=t.value; return; }
  if(t.dataset.txt){ setProp('txt',t.value); return; }
  if(t.dataset.st){ st[t.dataset.st]=t.value; if(t.dataset.st==='gridType') drawGrid(); return; }
  if(t.dataset.s){ var id=t.dataset.s, v=+t.value, u=t.nextElementSibling; var unit=u.textContent.replace(/[-0-9.]/g,''); u.textContent=f(v)+unit;
    var so=selObjs();
    if(/^ps_/.test(id)){ so.forEach(function(o){ if(o.pat) o.pat[id.slice(3)]=v; }); softRender(); clearTimeout(saveT); saveT=setTimeout(commitQuiet,300); return; }
    if(id==='sdx'||id==='sdy'||id==='sdb'||id==='sdo'||id==='gcx'||id==='gcy'||id==='gr'){ so.forEach(function(o){ if(id[0]==='s'){ o[id]=v; } else if(o.grad){ o.grad[id==='gcx'?'cx':id==='gcy'?'cy':'r']=v; } }); softRender(); clearTimeout(saveT); saveT=setTimeout(commitQuiet,300); return; }
    if(id==='ls'||id==='lh'||id==='tpo'){ so.forEach(function(o){ if(id==='ls') o.a['letter-spacing']=v; else if(id==='lh') o.lh=v; else o.tpo=v; }); softRender(); clearTimeout(saveT); saveT=setTimeout(commitQuiet,300); return; }
    if(id==='rot'||id==='scl'||id==='fs'||id==='gang'){ so.forEach(function(o){ if(id==='rot') o.rot=v; else if(id==='scl'){ o.sx=(o.sx<0?-1:1)*v; o.sy=(o.sy<0?-1:1)*v; } else if(id==='gang'){ if(o.grad) o.grad.ang=v; } else o.a['font-size']=v; }); softRender(); clearTimeout(saveT); saveT=setTimeout(commitQuiet,300); return; }
    if(so.length&&(id==='sw'||id==='op'||id==='dash'||id==='blur'||id==='gap'||id==='miter'||id==='mks'||id==='fbr'||id==='fct'||id==='fsa'||id==='fhue'||id==='fgr'||id==='finv')){ setProp(id,v); }
    if(id==='trT'||id==='trN'||id==='trD'||id==='bsize'||id==='offr'||id==='sw'||id==='op'||id==='dash'||id==='gap'||id==='miter'||id==='mks'||id==='sides'||id==='star'||id==='inner'||id==='round'||id==='sym'||id==='font'||id==='gridSize') st[id]=v;
    if(id==='gridSize') drawGrid();
  }
});
pb.addEventListener('change',function(e){
  var t=e.target;
  if(t.dataset.gc){ commit(); return; }
  if(t.dataset.gt!=null){ var gv=t.value; selObjs().forEach(function(o){ if(!gv){ delete o.grad; delete o.pat; } else if(gv==='pat'){ delete o.grad; o.pat=o.pat||{t:'lines',c:hex(o.stroke&&o.stroke!=='none'?o.stroke:st.stroke),bg:'',s:12,w:4,a:45}; } else { delete o.pat; var c1=hex(o.fill&&o.fill!=='none'&&!/^url/.test(o.fill)?o.fill:st.fill); o.grad={t:gv,c1:o.grad?o.grad.c1:c1,c2:o.grad?o.grad.c2:'#ff5a8a',ang:o.grad?o.grad.ang:0}; if(o.grad.st) delete o.grad.st; if(o.fill==='none'||o.fill==null) o.fill=c1; } }); commit(); return; }
  if(t.dataset.ps){ selObjs().forEach(function(o){ if(!o.pat) return; var k=t.dataset.ps; if(k==='bgOn') o.pat.bg=t.checked?(o.pat.bgc||'#ffffff'):''; else if(k==='bg'){ o.pat.bg=t.value; o.pat.bgc=t.value; } else if(t.type==='color') o.pat[k]=t.value; else if(t.tagName==='SELECT') o.pat[k]=t.value; else o.pat[k]=+t.value; }); clearTimeout(saveT); commit(); return; }
  if(t.dataset.gs||t.dataset.sdc){ clearTimeout(saveT); selObjs().forEach(function(o){ if(o.grad&&o.grad.st) gradSync(o.grad); }); commit(); return; }
  if(t.dataset.presel!=null){ if(t.value){ var pq2=t.value.split(','); $('cw').value=pq2[0]; $('ch').value=pq2[1]; } return; }
  if(t.dataset.symn){ var sd=symDefs()[t.dataset.symn]; if(sd){ sd.name=t.value.trim().slice(0,30)||sd.name; eachInst(t.dataset.symn,function(g){ g.name=sd.name; }); commit(); } return; }
  if(t.dataset.pgn){ doc.pn=t.value.trim()||('페이지 '+((doc.pi||0)+1)); commit(); return; }
  if(t.dataset.ar){ var ark=t.dataset.ar; st.arr[ark]=(ark==='mode'||ark==='pivot')?t.value:+t.value; if(ark==='mode') panel(); return; }
  if(t.dataset.gopt){ doc[t.dataset.gopt]=t.checked; drawGuides(); commit(); return; }
  if(t.dataset.gi!=null){ var gqq=doc.guides[+t.dataset.gi]; if(gqq){ gqq.p=+t.value||0; commit(); } return; }
  if(t.dataset.oa){ var ok=t.dataset.oa, ov=t.value; if(ok!=='blend') st[ok]=ov; var so2=selObjs(); if(so2.length){ so2.forEach(function(o){ o[ok]=ov; if(ok==='join'&&ov==='miter'&&!o.miter) o.miter=4; }); commit(); } else panel(); return; }
  if(t.dataset.nb){ boxSet(t.dataset.nb,+t.value); return; }
  if(t.dataset.o){ selObjs().forEach(function(o){ o[t.dataset.o]=t.checked; if(t.dataset.o==='sh'&&o.pts) setD(o); }); commit(); return; }
  if(t.dataset.tf){ selObjs().forEach(function(o){ if(o.tag!=='text') return; var tfk=t.dataset.tf;
      if(tfk==='italic'){ if(t.checked) o.a['font-style']='italic'; else delete o.a['font-style']; return; } if(tfk==='under'){ if(t.checked) o.a['text-decoration']='underline'; else delete o.a['text-decoration']; return; }
      if(tfk==='anchor'){ var b0=bbox(o); o.a['text-anchor']=t.value; stage.querySelector('#gobj').innerHTML=doc.objs.map(oS).join(''); var b1=bbox(o); if(b0&&b1) o.tx+=b0.x-b1.x; return; }
      if(t.dataset.tf==='family') o.a['font-family']=t.value; else o.a['font-weight']=t.checked?'700':'400'; }); commit(); return; }
  if(t.dataset.pc){ patOpt[t.dataset.pc]=t.checked; return; }
  if(t.dataset.k){ st[t.dataset.k]=t.checked; if(t.dataset.k==='fillOn'&&selObjs().length){ selObjs().forEach(function(o){ o.fill=t.checked?st.fill:'none'; }); commit(); } if(t.dataset.k==='grid') drawGrid(); if(t.dataset.k==='rulers'){ drawRulers(); fit(); } return; }
  if(t.id==='bgc'){ doc.bg=t.value; commit(); return; }
  if(t.id==='bgOn'){ doc.bgOn=t.checked; commit(); return; }
  if(t.dataset.c&&selObjs().length) commit();
  else if(t.dataset.s&&selObjs().length) commit();
});
pb.addEventListener('click',function(e){
  var t=e.target.closest('button'); if(!t) return;
  if(t.dataset.pat){ PAT_SEL=t.dataset.pat; panel(); return; }
  if(t.dataset.shp){ st.shp=t.dataset.shp; panel(); return; }
  if(t.dataset.al){ align(t.dataset.al); return; }
  if(t.dataset.dp){ dashPreset(t.dataset.dp); return; }
  if(t.dataset.sw){ applyColor(t.dataset.sw); return; }
  if(t.dataset.pgo){ var pq=t.dataset.pgo.split(':'); if(pq[0]==='goto') gotoPage(+pq[1]); else if(pq[0]==='send'||pq[0]==='copy') pageOp(pq[0],$('pgTo')&&$('pgTo').value); else pageOp(pq[0]); return; }
  if(t.dataset.gdel!=null){ doc.guides.splice(+t.dataset.gdel,1); commit(); return; }
  if(t.dataset.gsdel!=null){ var go2=selObjs()[0]; if(go2&&go2.grad){ var s2=gradEnsure(go2.grad); if(s2.length>2){ s2.splice(+t.dataset.gsdel,1); gradSync(go2.grad); commit(); } } return; }
  if(t.dataset.swdel!=null){ SW.splice(+t.dataset.swdel,1); saveSw(); if(!SW.length) st.swDel=false; panel(); return; }
  if(t.dataset.swadd){ var sc=hex(selObjs()[0]&&selObjs()[0][t.dataset.swadd]&&selObjs()[0][t.dataset.swadd]!=='none'?selObjs()[0][t.dataset.swadd]:st[t.dataset.swadd]); if(SW.indexOf(sc)<0) SW.push(sc); saveSw(); panel(); return; }
  if(t.dataset.swedit){ st.swDel=!st.swDel; panel(); return; }
  if(t.id==='swPick'){ new EyeDropper().open().then(function(r){ applyColor(r.sRGBHex); }).catch(function(){}); return; }
  if(t.dataset.ly){ var oid=+t.dataset.i, oo=byId(oid), ly=t.dataset.ly; if(!oo) return;
    if(ly==='eye'){ oo.hid=!oo.hid; commit(); } else if(ly==='lock'){ oo.lock=!oo.lock; commit(); } else if(ly==='pick'){ if(e.shiftKey||e.ctrlKey||e.metaKey){ var qx=sel.indexOf(oid); if(qx>=0) sel.splice(qx,1); else sel.push(oid); } else sel=[oid]; drawOv(); pb.querySelectorAll('.lyr[data-row]').forEach(function(r){ r.classList.toggle('on',sel.indexOf(+r.dataset.row)>=0); }); }
    else { var ix=doc.objs.indexOf(oo), jx=ly==='up'?ix+1:ix-1; if(jx>=0&&jx<doc.objs.length){ doc.objs[ix]=doc.objs[jx]; doc.objs[jx]=oo; commit(); } }
    return; }
  if(t.id==='patGo'){ drawPattern(); return; }
  if(t.id==='aiGo'){ askAI(); return; }
  if(t.id==='aiSet'){ if(window.FFAI) FFAI.settings(); return; }
  if(t.id==='cvSwap'){ var sw0=$('cw').value; $('cw').value=$('ch').value; $('ch').value=sw0; return; }
  if(t.dataset.sz){ var a=t.dataset.sz.split(','); $('cw').value=a[0]; $('ch').value=a[1]; return; }
  if(t.id==='cvApply'){ var w=Math.max(16,Math.min(8000,+$('cw').value||doc.w)), h=Math.max(16,Math.min(8000,+$('ch').value||doc.h)); doc.w=w; doc.h=h; commit(); fit(); return; }
  if(t.id==='cvCrop'){ cropToContent(); return; }
  if(t.id==='bClear'){ if(doc.objs.length&&!confirmOnce(t)) return; doc.objs=[]; doc.edit=null; sel=[]; commit(); return; }
  var a=t.dataset.a; if(!a) return;
  if(a==='symmk'){ symMake(); return; } if(a==='symedit'){ symEdit(selObjs()[0]); return; } if(a==='symput'){ symPut(t.dataset.sid); return; } if(a==='symdet'){ var sdo=selObjs()[0]; if(sdo) symDetach(sdo); return; } if(a==='symdel'){ symDelete(t.dataset.sid); return; }
  if(a==='clipmk'){ clipSel(); return; }
  if(a==='simf'||a==='sims'||a==='simt'||a==='siminv'){ selSimilar(a); return; } if(a==='trace'){ var tio=selObjs()[0]; if(tio&&tio.tag==='image') traceImage(tio); return; }
  if(a==='showall'||a==='unlockall'){ doc.objs.forEach(function(o){ if(a==='showall') o.hid=false; else o.lock=false; }); commit(); return; }
  if(a==='fxreset'){ selObjs().forEach(function(o){ ['fbr','fct','fsa','fhue','fgr','finv'].forEach(function(k){ delete o[k]; }); }); commit(); return; }
  if(a==='arrgo'||a.indexOf('mir-')===0){ arrGo(a); return; } if(a==='offp'){ offsetSel('p'); return; } if(a==='offm'){ offsetSel('m'); return; } if(a==='outl'){ offsetSel('o'); return; }
  if(a==='gaddv'||a==='gaddh'){ doc.guides=(doc.guides||[]).concat([a==='gaddv'?{v:'x',p:doc.w/2}:{v:'y',p:doc.h/2}]); commit(); return; } if(a==='gclr'){ doc.guides=[]; commit(); return; }
  if(a==='gsel'){ var gb=selBox(); if(!gb){ toast('도형을 골라 주세요'); return; } doc.guides=(doc.guides||[]).concat([{v:'x',p:f(gb.x)},{v:'x',p:f(gb.x+gb.w/2)},{v:'x',p:f(gb.x+gb.w)},{v:'y',p:f(gb.y)},{v:'y',p:f(gb.y+gb.h/2)},{v:'y',p:f(gb.y+gb.h)}]); commit(); return; }
  if(a==='gsadd'||a==='grev'){ var go=selObjs()[0]; if(go&&go.grad){ var st0=gradEnsure(go.grad); if(a==='grev'){ st0.reverse(); st0.forEach(function(q){ q.o=1-q.o; }); } else { var bi=0,bg=0; for(var gi=0;gi<st0.length-1;gi++){ var gg=st0[gi+1].o-st0[gi].o; if(gg>bg){ bg=gg; bi=gi; } } st0.splice(bi+1,0,{o:(st0[bi].o+st0[bi+1].o)/2,c:st0[bi].c}); } gradSync(go.grad); commit(); } return; }
  if(a==='tout'){ var tuo=selObjs()[0]; if(tuo&&tuo.tag==='text') textOutline(tuo); return; }
  if(a==='tedit'){ var teo=selObjs()[0]; if(teo&&teo.tag==='text') openTextEdit(teo,false); return; } if(a==='top'){ textOnPath(); return; } if(a==='topoff'){ selObjs().forEach(function(o){ if(o.tp){ delete o.tp; delete o.tpo; o.cx=null; o.cy=null; } }); commit(); return; }
  if(a==='bezend'){ finishBez(false); return; } if(a==='bezclose'){ finishBez(true); return; } if(a==='bezcancel'){ bezPts=[]; drawOv(); return; }
  if(a.charAt(0)==='n'&&a!=='nodes'){ var no2=selObjs()[0]; if(no2&&no2.pts){ if(a==='nsmooth'&&nodeSel>=0) toSmooth(no2,nodeSel); else if(a==='ncorner'&&nodeSel>=0){ toCorner(no2,nodeSel); no2.bz=true; } else if(a==='ndel'&&nodeSel>=0){ if(no2.pts.length>(no2.cl?3:2)){ no2.pts.splice(nodeSel,1); nodeSel=-1; } } else if(a==='nallsmooth'){ no2.pts.forEach(function(q,qi){ toSmooth(no2,qi); }); } else if(a==='nallcorner'){ no2.pts.forEach(function(q,qi){ toCorner(no2,qi); }); no2.bz=true; } setD(no2); commit(); } return; }
  if(a==='del') delSel(); else if(a==='dup') dupSel(); else if(a==='hflip') flip('h'); else if(a==='vflip') flip('v'); else if(a==='group') groupSel(); else if(a==='ungroup') ungroupSel(); else if(a==='bu'||a==='bi'||a==='bs'||a==='bx') boolOp(a.charAt(1)); else if(a==='topath'){ var po=selObjs()[0]; if(po&&toPath(po)){ commit(); } else toast('이 도형은 점으로 바꾸지 못해요'); } else order(a);
});
var lyDrag=null;
pb.addEventListener('pointerdown',function(e){ var g=e.target.closest&&e.target.closest('[data-ly=grip]'); if(!g) return; e.preventDefault(); g.setPointerCapture&&g.setPointerCapture(e.pointerId);
  lyDrag={id:+g.dataset.i,rows:[].slice.call(pb.querySelectorAll('.lyr[data-row]')),to:-1}; var r0=lyDrag.rows.filter(function(r){ return +r.dataset.row===lyDrag.id; })[0]; if(r0) r0.classList.add('drag'); });
pb.addEventListener('pointermove',function(e){ if(!lyDrag) return; var rs=lyDrag.rows, to=-1; rs.forEach(function(r,i){ var q=r.getBoundingClientRect(); r.classList.remove('dropt','dropb'); if(e.clientY>=q.top&&e.clientY<q.bottom) to=i; });
  if(to<0&&rs.length){ to=e.clientY<rs[0].getBoundingClientRect().top?0:rs.length-1; } lyDrag.to=to; if(to>=0) rs[to].classList.add('dropb'); });
function lyEnd(){ if(!lyDrag) return; var d=lyDrag; lyDrag=null; if(d.to<0){ panel(); return; } var n=doc.objs.length, from=-1; doc.objs.forEach(function(o,i){ if(o.id===d.id) from=i; }); var to=n-1-d.to; if(from<0||from===to){ panel(); return; } var it=doc.objs.splice(from,1)[0]; doc.objs.splice(to,0,it); commit(); }
pb.addEventListener('pointerup',lyEnd); pb.addEventListener('pointercancel',function(){ lyDrag=null; panel(); });
pb.addEventListener('dblclick',function(e){ var b=e.target.closest&&e.target.closest('[data-ly=pick]'); if(!b) return; var o=byId(+b.dataset.i); if(!o) return;
  var inp=document.createElement('input'); inp.type='text'; inp.value=layerName(o); inp.className='lyin'; inp.maxLength=40; b.replaceWith(inp); inp.focus(); inp.select();
  var done=false, fin=function(ok){ if(done) return; done=true; if(ok){ var v=inp.value.trim(); if(v&&v!==layerName(o)){ o.name=v.slice(0,40); commit(); return; } if(!v&&o.name){ delete o.name; commit(); return; } } panel(); };
  inp.addEventListener('keydown',function(ev){ if(ev.key==='Enter') fin(true); else if(ev.key==='Escape') fin(false); }); inp.addEventListener('blur',function(){ fin(true); }); });
var cf=0; function confirmOnce(b){ if(cf){ cf=0; return true; } cf=1; b.textContent='한 번 더 누르면 지워요'; setTimeout(function(){ cf=0; if(b.isConnected) b.textContent='모두 지우고 새로 시작'; },3000); return false; }

function fit(){ var w=desk.clientWidth-70, h=desk.clientHeight-70; zoom=Math.max(.05,Math.min(4,Math.min(w/doc.w,h/doc.h))); render(); }
function applyZoom(){ stage.style.width=f(doc.w*zoom)+'px'; stage.style.height=f(doc.h*zoom)+'px'; $('zl').textContent=Math.round(zoom*100)+'%'; drawGrid(); drawGuides(); drawOv(); drawRulers(); }
function zoomAt(k,cx,cy){ var sr=stage.getBoundingClientRect(), ax=(cx-sr.left)/zoom, ay=(cy-sr.top)/zoom; zoom=Math.max(.05,Math.min(8,zoom*k)); applyZoom(); var s2=stage.getBoundingClientRect(); desk.scrollLeft+=(s2.left+ax*zoom)-cx; desk.scrollTop+=(s2.top+ay*zoom)-cy; drawRulers(); }
function zoomBy(k){ var dr=desk.getBoundingClientRect(); zoomAt(k,dr.left+dr.width/2,dr.top+dr.height/2); }
var ptrs={}, pinch=null;
function pinchPts(){ var ks=Object.keys(ptrs); if(ks.length<2) return null; var a=ptrs[ks[0]], b=ptrs[ks[1]]; return {d:Math.hypot(a.x-b.x,a.y-b.y)||1,x:(a.x+b.x)/2,y:(a.y+b.y)/2}; }
function startPinch(){ if(drag&&(drag.k==='move'||drag.k==='rs'||drag.k==='node'||drag.k==='nh'||drag.k==='gh')){ try{ load(hist[hi]); render(); }catch(x){} } drag=null; if(tmp){ tmp.remove(); tmp=null; } var pp=pinchPts(); if(!pp) return; var sr=stage.getBoundingClientRect(); pinch={d0:pp.d,z0:zoom,ax:(pp.x-sr.left)/zoom,ay:(pp.y-sr.top)/zoom}; drawOv(); }
function movePinch(){ var pp=pinchPts(); if(!pp||!pinch) return; zoom=Math.max(.05,Math.min(8,pinch.z0*pp.d/pinch.d0)); applyZoom(); var s2=stage.getBoundingClientRect(); desk.scrollLeft+=(s2.left+pinch.ax*zoom)-pp.x; desk.scrollTop+=(s2.top+pinch.ay*zoom)-pp.y; drawRulers(); }
$('bZp').onclick=function(){ zoomBy(1.25); }; $('bZm').onclick=function(){ zoomBy(.8); }; $('bFit').onclick=fit;
desk.addEventListener('wheel',function(e){ if(e.ctrlKey||e.metaKey){ e.preventDefault(); zoomAt(e.deltaY<0?1.1:.9,e.clientX,e.clientY); } },{passive:false});
$('bUndo').onclick=undo; $('bRedo').onclick=redo;
$('dname').addEventListener('change',function(){ doc.name=this.value||'이름 없는 그림'; commit(); });
$('bOpen').onclick=function(){ $('fileIn').click(); };
$('bPg').onclick=function(){ ptab='ly'; panel(); };
$('bImg').onclick=function(){ $('imgIn').click(); };
$('imgIn').addEventListener('change',function(){ var fl=this.files[0]; this.value=''; if(fl) addImage(fl); });
$('fileIn').addEventListener('change',function(){ if(this.files[0]) openFile(this.files[0]); this.value=''; });
$('bSave').onclick=function(e){
  var old=document.querySelector('.menu'); if(old){ old.remove(); return; }
  var m=document.createElement('div'); m.className='menu'; var r=this.getBoundingClientRect(); m.style.top=(r.bottom+4)+'px'; m.style.right='8px';
  m.innerHTML='<button data-x="dlg">내보내기 설정…</button><button data-x="png1">PNG (원래 크기)</button><button data-x="png2">PNG (2배 크게)</button><button data-x="svg">SVG (벡터)</button><button data-x="json">프로젝트 파일 (.fdraw)</button>';
  m.onclick=function(ev){ var x=ev.target.dataset.x; if(!x) return; m.remove();
    if(x==='dlg') openExport(); else if(x==='png1') exportPng(1); else if(x==='png2') exportPng(2); else if(x==='svg') download(fname('svg'),new Blob([docSvg(true,true)],{type:'image/svg+xml'})); else download(fname('fdraw'),new Blob([snap(true)],{type:'application/json'})); };
  document.body.appendChild(m); setTimeout(function(){ document.addEventListener('click',function h(ev){ if(!m.contains(ev.target)){ m.remove(); } document.removeEventListener('click',h); }); },0);
};
document.addEventListener('keydown',function(e){
  var tg=e.target.tagName; if(tg==='INPUT'||tg==='TEXTAREA'||tg==='SELECT') return;
  var ctrl=e.ctrlKey||e.metaKey, k=e.key.toLowerCase();
  if(ctrl&&k==='z'){ e.preventDefault(); if(e.shiftKey) redo(); else undo(); return; }
  if(ctrl&&k==='y'){ e.preventDefault(); redo(); return; }
  if(ctrl&&k==='g'){ e.preventDefault(); if(e.shiftKey) ungroupSel(); else groupSel(); return; }
  if(ctrl&&k==='d'){ e.preventDefault(); dupSel(); return; }
  if(ctrl&&k==='a'){ e.preventDefault(); sel=doc.objs.map(function(o){ return o.id; }); drawOv(); panel(); return; }
  if(e.key==='Delete'||e.key==='Backspace'){ if(sel.length){ e.preventDefault(); delSel(); } return; }
  if(e.key==='Escape'){ curvePts=[]; bezPts=[]; sel=[]; drawOv(); panel(); return; }
  if(e.key==='Enter'&&tool==='curve'){ finishCurve(); return; }
  if(e.key==='Enter'&&tool==='bez'){ finishBez(false); return; }
  if(e.key.indexOf('Arrow')===0&&sel.length){ e.preventDefault(); var s=e.shiftKey?10:1, dx=e.key==='ArrowLeft'?-s:e.key==='ArrowRight'?s:0, dy=e.key==='ArrowUp'?-s:e.key==='ArrowDown'?s:0; selObjs().forEach(function(o){ o.tx+=dx; o.ty+=dy; }); softRender(); clearTimeout(saveT); saveT=setTimeout(commit,300); return; }
  var map={n:'node',v:'sel',h:'hand',p:'pen',l:'line',r:'rect',o:'ellipse',g:'poly',s:'star',t:'text',e:'erase'};
  if(!ctrl&&map[k]) setTool(map[k]);
});
window.addEventListener('resize',function(){ drawOv(); drawRulers(); });
desk.addEventListener('scroll',drawRulers); $('rh').addEventListener('pointerdown',function(e){ rulerDrag(e,'y'); }); $('rv').addEventListener('pointerdown',function(e){ rulerDrag(e,'x'); });

/* ---------- start ---------- */
(function init(){
  var s=null; try{ s=localStorage.getItem(KEY); }catch(e){}
  if(s){ try{ load(s); }catch(e){} }
  $('dname').value=doc.name; hist=[snap()]; hi=0;
  renderTools(); render(); fit(); panel();
  window.FDRAW={symMake:symMake,symPut:symPut,symEdit:symEdit,symDone:symDone,gradPts:gradPts,textOutline:textOutline,traceImage:traceImage,SHAPES:SHAPES,flat:flat,rdp:rdp,strokePieces:strokePieces,pbUnionAll:pbUnionAll,getSel:function(){ return sel; },groupSel:groupSel,ungroupSel:ungroupSel,boolOp:boolOp,align:align,toPath:toPath,select:function(a){ sel=a; drawOv(); panel(); },addNode:addNode,mat:mat,doc:doc,importSvg:importSvg,drawPattern:drawPattern,setTool:setTool,st:st,PATS:PATS,svg:docSvg,buildSvg:buildSvg,openExport:openExport,exArea:exArea};
})();
})();
