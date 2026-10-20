/* Fry Sheet UI: grid, editing, selection, formatting, files, charts. Formula work lives in engine.js (FSE). */
(function(){
'use strict';
var E=FSE, K=E.K, KC=E.KC, T=FFT.T, F=FFT.F;
var $=function(id){ return document.getElementById(id); };
var wrap=$('gridWrap'), gin=$('gridIn'), gbody=$('gbody'), hrow=$('hrow'), colsEl=$('cols'), ed=$('cellEd'), fin=$('fin'), nameBox=$('nameBox');
var DEF_W=96, ROWS=100, COLS=26, MAXR=5000, MAXC=200;
var LSI='ffsheet.docs', LSD='ffsheet.doc.', LSL='ffsheet.last';

/* ---------- storage ---------- */
function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function lsSet(k,v){ try{ localStorage.setItem(k,v); return true; }catch(e){ return false; } }
function lsDel(k){ try{ localStorage.removeItem(k); }catch(e){} }
function docIndex(){ try{ return JSON.parse(lsGet(LSI)||'[]'); }catch(e){ return []; } }
function newSheet(name){ return {name:name, cells:{}, cw:{}, rows:ROWS, cols:COLS, cfs:[], dv:[], charts:[], merges:[]}; }
function newDoc(){ return {v:1, name:T('새 시트'), active:0, sheets:[newSheet(T('시트')+'1')]}; }
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function fixDoc(d){
  if(!d||!d.sheets||!d.sheets.length) return newDoc();
  d.sheets.forEach(function(s){ s.cells=s.cells||{}; s.cw=s.cw||{}; s.cfs=s.cfs||[]; s.dv=s.dv||[]; s.charts=s.charts||[]; s.merges=s.merges||[]; s.fr=Math.max(0,s.fr|0); s.fc=Math.max(0,s.fc|0); s.rows=Math.max(s.rows||ROWS,10); s.cols=Math.max(s.cols||COLS,5);
    if(s.lock){ var lk=s.lock; s.lock={all:lk.all?1:0,rg:(Array.isArray(lk.rg)?lk.rg:[]).filter(function(g){ return g&&g.r1>=0&&g.c1>=0&&g.r2>=g.r1&&g.c2>=g.c1; }).slice(0,200)}; if(!s.lock.all&&!s.lock.rg.length) delete s.lock; } });
  d.names=Array.isArray(d.names)?d.names.filter(function(n){ return n&&typeof n.name==='string'&&typeof n.ref==='string'; }):[];
  if(!(d.active>=0&&d.active<d.sheets.length)) d.active=0; return d;
}

var doc, docId, eng, sh;
var sel={r1:0,c1:0,r2:0,c2:0}, act={r:0,c:0};
var editing=null; // {r,c,src,typed,orig}
var undoS=[], redoS=[], zoom=1, painted=new Set(), cfStats=[];
var mouseMode=!('ontouchstart' in window);

function loadDoc(id){
  var d=null; if(id){ try{ d=JSON.parse(lsGet(LSD+id)||'null'); }catch(e){} }
  if(!d){ id=uid(); d=newDoc(); }
  docId=id; doc=fixDoc(d); eng=new E.Engine(doc); undoS=[]; redoS=[];
  lsSet(LSL,docId); $('docName').value=doc.name; switchSheet(doc.active,true);
}
var saveT=null;
function saveSoon(){ $('saved').textContent=''; clearTimeout(saveT); saveT=setTimeout(saveNow,400); }
function saveNow(){
  clearTimeout(saveT);
  var ok=lsSet(LSD+docId,JSON.stringify(doc)); var idx=docIndex().filter(function(x){ return x.id!==docId; });
  idx.unshift({id:docId,name:doc.name,t:Date.now()}); lsSet(LSI,JSON.stringify(idx.slice(0,50))); lsSet(LSL,docId);
  $('saved').textContent=ok?T('저장됨'):T('저장 공간이 가득 찼어요');
}

/* ---------- undo ---------- */
function snap(){ return JSON.stringify({a:doc.active,s:doc.sheets,n:doc.names}); }
function pushUndo(){ undoS.push(snap()); if(undoS.length>80) undoS.shift(); redoS=[]; }
function restore(s){ var o=JSON.parse(s); doc.sheets=o.s; doc.names=o.n||[]; doc.active=Math.min(o.a,o.s.length-1); fixDoc(doc); eng=new E.Engine(doc); switchSheet(doc.active,true); saveSoon(); }
function undo(){ commitEdit(); if(!undoS.length) return toast(T('되돌릴 작업이 없어요')); redoS.push(snap()); restore(undoS.pop()); }
function redo(){ commitEdit(); if(!redoS.length) return; undoS.push(snap()); restore(redoS.pop()); }

/* ---------- grid build ---------- */
function cw(c){ return sh.cw[c]||DEF_W; }
function buildGrid(){
  var h='<col style="width:46px">'; for(var c=0;c<sh.cols;c++) h+='<col style="width:'+cw(c)+'px">'; colsEl.innerHTML=h;
  h='<th class="corner"></th>'; for(c=0;c<sh.cols;c++) h+='<th data-c="'+c+'">'+E.colName(c)+'<span class="rz" data-rz="'+c+'"></span></th>'; hrow.innerHTML=h;
  var rowTpl=''; for(c=0;c<sh.cols;c++) rowTpl+='<td></td>';
  var parts=[]; for(var r=0;r<sh.rows;r++) parts.push('<tr><th>'+(r+1)+'</th>'+rowTpl+'</tr>');
  gbody.innerHTML=parts.join(''); painted=new Set(); applyFreeze(); applyMerges(); paintAll(); applyFilter();
}
/* freeze: first sh.fr rows and sh.fc columns stay put while scrolling */
function fzCls(r,c){ var f=''; if(r<sh.fr||c<sh.fc) f=' fz'; if(sh.fr&&r===sh.fr-1) f+=' fzr'; if(sh.fc&&c===sh.fc-1) f+=' fzc'; return f; }
var fzW=0, fzH=0;
function applyFreeze(){
  var fr=Math.min(sh.fr,sh.rows), fc=Math.min(sh.fc,sh.cols), hh=hrow.offsetHeight||26, x=46, y=hh, r, c, tr, td;
  var lefts=[]; for(c=0;c<fc;c++){ lefts.push(x); x+=cw(c); } fzW=fc?x-46:0;
  var th=hrow.cells; for(c=0;c<fc;c++){ var h=th[c+1]; if(h){ h.classList.add('fz'); h.style.left=lefts[c]+'px'; h.style.zIndex=5; if(c===fc-1) h.classList.add('fzc'); } }
  fzH=0;
  for(r=0;r<fr;r++){ tr=gbody.rows[r]; if(!tr) break; var hgt=tr.offsetHeight||26;
    tr.cells[0].classList.add('fz'); tr.cells[0].style.top=y+'px'; tr.cells[0].style.zIndex=4; if(r===fr-1) tr.cells[0].classList.add('fzr');
    for(c=0;c<sh.cols;c++){ td=tr.cells[c+1]; td.style.position='sticky'; td.style.top=y+'px'; td.style.zIndex=c<fc?4:2; if(c<fc) td.style.left=lefts[c]+'px'; td.className=fzCls(r,c).trim(); }
    y+=hgt; fzH+=hgt; }
  for(r=fr;r<sh.rows&&fc;r++){ tr=gbody.rows[r]; for(c=0;c<fc;c++){ td=tr.cells[c+1]; td.style.position='sticky'; td.style.left=lefts[c]+'px'; td.style.zIndex=2; td.className=fzCls(r,c).trim(); } }
}
function tdRaw(r,c){ var tr=gbody.rows[r]; return tr?tr.cells[c+1]:null; }
/* the cell element that shows (r,c): inside a merged block that is the block's top-left cell */
function tdAt(r,c){ var m=sh.merges.length?mergeAt(r,c):null; if(m){ r=m.r1; c=m.c1; } return tdRaw(r,c); }
function mergeAt(r,c){ var m=sh.merges; for(var i=0;i<m.length;i++){ var g=m[i]; if(r>=g.r1&&r<=g.r2&&c>=g.c1&&c<=g.c2) return g; } return null; }
function growMerges(g){ var ch=true; while(ch){ ch=false; sh.merges.forEach(function(m){ if(m.r2<g.r1||m.r1>g.r2||m.c2<g.c1||m.c1>g.c2) return;
  if(m.r1<g.r1){ g.r1=m.r1; ch=true; } if(m.r2>g.r2){ g.r2=m.r2; ch=true; } if(m.c1<g.c1){ g.c1=m.c1; ch=true; } if(m.c2>g.c2){ g.c2=m.c2; ch=true; } }); } return g; }
function applyMerges(){
  sh.merges.forEach(function(m){ for(var r=m.r1;r<=m.r2&&r<sh.rows;r++) for(var c=m.c1;c<=m.c2&&c<sh.cols;c++){ var td=tdRaw(r,c); if(!td) continue;
    if(r===m.r1&&c===m.c1){ td.rowSpan=Math.min(m.r2,sh.rows-1)-m.r1+1; td.colSpan=Math.min(m.c2,sh.cols-1)-m.c1+1; } else td.style.display='none'; } });
}
/* where an arrow key from (r,c) lands: a merged block is stepped over as one cell */
function stepOver(r,c,d){ var m=sh.merges.length?mergeAt(r,c):null; if(m){ if(d[0]>0) r=m.r2; else if(d[0]<0) r=m.r1; if(d[1]>0) c=m.c2; else if(d[1]<0) c=m.c1; } return [r+d[0],c+d[1]]; }
function growTo(r,c){
  var ch=false;
  if(r>=sh.rows&&sh.rows<MAXR){ sh.rows=Math.min(MAXR,Math.max(r+1,sh.rows+50)); ch=true; }
  if(c>=sh.cols&&sh.cols<MAXC){ sh.cols=Math.min(MAXC,Math.max(c+1,sh.cols+10)); ch=true; }
  if(ch){ buildGrid(); saveSoon(); }
}

/* ---------- painting ---------- */
function cfCompute(){
  cfStats=sh.cfs.map(function(f){
    if(f.t==='rule'){ var o={f:f,dup:null}; if(f.op==='dup'){ var cnt={}; o.dup=cnt; for(var r0=f.r1;r0<=f.r2;r0++) for(var c0=f.c1;c0<=f.c2;c0++){ var v0=eng.value(doc.active,r0,c0); if(v0==null||v0===''||E.isErr(v0)) continue; var k0=typeof v0+':'+String(v0).toLowerCase(); cnt[k0]=(cnt[k0]||0)+1; } } return o; }
    if(f.t==='spark') return {f:f};
    var lo=Infinity, hi=-Infinity;
    for(var r=f.r1;r<=f.r2;r++) for(var c=f.c1;c<=f.c2;c++){ var v=eng.value(doc.active,r,c); if(typeof v==='number'){ if(v<lo) lo=v; if(v>hi) hi=v; } }
    return {f:f,lo:lo,hi:hi};
  });
}
function mix(a,b,t){ return [0,1,2].map(function(i){ return Math.round(a[i]+(b[i]-a[i])*t); }); }
function scaleColor(t){ var R=[235,87,87], Y=[255,201,60], G=[63,200,120]; var c=t<.5?mix(R,Y,t*2):mix(Y,G,(t-.5)*2); return 'rgba('+c.join(',')+',.42)'; }
function ruleHit(s,v){
  var f=s.f, a=E.literal(f.a), b=E.literal(f.b), e=v==null||v==='';
  if(f.op==='bl') return e;
  if(e||E.isErr(v)) return false;
  if(f.op==='dup') return s.dup[typeof v+':'+String(v).toLowerCase()]>1;
  if(f.op==='tx') return f.a!=null&&f.a!==''&&String(E.formatValue(v)).toLowerCase().indexOf(String(f.a).toLowerCase())>=0;
  if(f.a==null||f.a==='') return false;
  if(typeof v==='number'&&typeof a==='number'){
    switch(f.op){ case 'gt': return v>a; case 'ge': return v>=a; case 'lt': return v<a; case 'le': return v<=a; case 'eq': return v===a; case 'ne': return v!==a;
      case 'bt': return typeof b==='number'&&v>=Math.min(a,b)&&v<=Math.max(a,b); } return false; }
  if(f.op==='eq') return E.cmpVals(v,a)===0;
  if(f.op==='ne') return E.cmpVals(v,a)!==0;
  return false;
}
var AIRE=/^=.*\bAI\s*\(/i;   // a cell the AI fills (=AI(...)) or wrote (cell.ai); cell.ar = 1 checked right, 2 reported wrong
function paintCell(r,c){
  var td=tdRaw(r,c); if(!td) return;
  var mg=sh.merges.length?mergeAt(r,c):null; if(mg&&(mg.r1!==r||mg.c1!==c)) return;
  var k=K(r,c), cell=sh.cells[k], v=cell||spl.length?eng.value(doc.active,r,c):null;
  var cls='', st=td.style;
  if(E.isErr(v)) cls='err'; else if(typeof v==='number') cls='num'; else if(typeof v==='boolean') cls='ctr';
  if(cell&&cell.al) cls+=' al-'+cell.al;
  if(cell&&cell.cb&&!E.isErr(v)){ td.innerHTML='<span class="cb'+(v===true?' on':'')+'" data-cb="1"></span>'; cls='ctr'+(cell.al?' al-'+cell.al:''); }
  else td.textContent=E.formatValue(v,cell&&cell.nf);
  if(cell&&cell.nt) cls+=' nt';
  if(cell&&(cell.ai||(typeof cell.v==='string'&&AIRE.test(cell.v)))) cls+=cell.ar===1?' aiok':cell.ar===2?' aibad':' aim';
  if(sh.lock&&locked(r,c)) cls+=' lk';
  if(sh.flt&&r===sh.flt.r1&&c>=sh.flt.c1&&c<=sh.flt.c2) cls+=' flt'+(sh.flt.h[c]&&sh.flt.h[c].length?' flton':'');
  td.className=cls+fzCls(r,c)+(r===act.r&&c===act.c?' act':'');
  td.title=(E.isErr(v)?T(E.errHint(v)):'')||(cell&&cell.nt)||'';
  st.fontWeight=cell&&cell.b?'700':''; st.fontStyle=cell&&cell.i?'italic':''; st.color=cell&&cell.fc||'';
  var bg=cell&&cell.bg||'', layers=[], icon=null;
  for(var i=0;i<cfStats.length;i++){ var s=cfStats[i], f=s.f;
    if(f.t==='rule'){ if(r>=f.r1&&r<=f.r2&&c>=f.c1&&c<=f.c2&&ruleHit(s,v)) bg=f.col; continue; }
    if(f.t==='spark'){ if(c===f.dc&&r>=f.r1&&r<=f.r2){ var su=sparkUri(f,r); if(su) layers.push([su,'100% 100%','0 0']); } continue; }
    if(r<f.r1||r>f.r2||c<f.c1||c>f.c2||typeof v!=='number'||!(s.hi>=s.lo)) continue;
    var t=s.hi===s.lo?1:(v-s.lo)/(s.hi-s.lo);
    if(f.t==='scale') bg=scaleColor(t);
    else if(f.t==='icons') icon=E.iconFor(f,t);
    else { var lo0=Math.min(0,s.lo), t2=s.hi===lo0?1:(v-lo0)/(s.hi-lo0), pc=(t2*100).toFixed(1)+'%';
      if(f.t==='mbar') layers.push(['linear-gradient(90deg,'+(f.col||'#ffc93c')+' '+pc+',rgba(255,255,255,.10) '+pc+')','calc(100% - 10px) 5px','5px calc(100% - 3px)']);
      else layers.push(['linear-gradient(90deg,rgba(255,170,60,.55) '+pc+',transparent '+pc+')','100% 100%','0 0']); }
  }
  if(icon){ var sp=document.createElement('span'); sp.className='ico'; sp.textContent=icon[0]; sp.style.color=icon[1]; td.insertBefore(sp,td.firstChild); td.classList.add('ic'); }
  var bgi=layers.map(function(l){ return l[0]; }).join(',');
  st.backgroundSize=layers.map(function(l){ return l[1]; }).join(','); st.backgroundPosition=layers.map(function(l){ return l[2]; }).join(','); st.backgroundRepeat=layers.length?'no-repeat':'';
  st.backgroundColor=bg; st.backgroundImage=bgi; st.boxShadow=borderShadow(r,c,cell,mg);
  if(cell||layers.length||icon||v!=null) painted.add(k); else painted.delete(k);
}
var SIDE_SH={t:function(w,c){ return 'inset 0 '+w+'px 0 0 '+c; }, r:function(w,c){ return 'inset -'+w+'px 0 0 0 '+c; }, b:function(w,c){ return 'inset 0 -'+w+'px 0 0 '+c; }, l:function(w,c){ return 'inset '+w+'px 0 0 0 '+c; }};
var FACING={t:['b',-1,0],b:['t',1,0],l:['r',0,-1],r:['l',0,1]};
/* a border side stored on the cell that owns it (a merged block owns its outer edges through its top-left cell) */
function sideAt(r,c,side){
  var m=sh.merges.length?mergeAt(r,c):null;
  if(m){ if((side==='t'&&r!==m.r1)||(side==='b'&&r!==m.r2)||(side==='l'&&c!==m.c1)||(side==='r'&&c!==m.c2)) return null; r=m.r1; c=m.c1; }
  var x=sh.cells[K(r,c)]; return x&&x.bx&&x.bx[side]||null;
}
function borderShadow(r,c,cell,mg){
  var out=[]; if(cell&&cell.bx){ ['t','r','b','l'].forEach(function(sd){ var o=cell.bx[sd]; if(!o) return;
    if(!mg){ var f=FACING[sd]; if(r+f[1]>=0&&c+f[2]>=0&&(sd==='t'||sd==='l')&&sideAt(r+f[1],c+f[2],f[0])) return; } // the neighbour already draws this shared edge
    out.push(SIDE_SH[sd](o.w||1,o.c)); }); }
  if(cell&&cell.bd) out.push('inset 0 0 0 1px #8b94a8');
  return out.join(',');
}
/* v15: sparklines and icon sets (pure parts live in engine.js: iconFor, sparkSvg) */
var ICOL=E.ICOL;
var sparkCache=new Map();
function sparkUri(f,r){
  var vals=[]; for(var c=f.c1;c<=f.c2;c++){ var v=eng.value(doc.active,r,c); vals.push(typeof v==='number'?v:null); }
  var svg=E.sparkSvg(vals,f.kind,f.col||'#ffc93c'); if(!svg) return null;
  var u=sparkCache.get(svg); if(!u){ u='url("data:image/svg+xml,'+encodeURIComponent(svg)+'")'; if(sparkCache.size>400) sparkCache.clear(); sparkCache.set(svg,u); } return u;
}
var spl=[]; // v19: blocks spilled by array formulas on this sheet ({r1,c1,r2,c2,rows})
function paintAll(){
  eng.reset(); spl=eng.spills(doc.active); cfCompute();
  var keys=new Set(painted), gr=0, gc=0; for(var k in sh.cells) keys.add(+k);
  spl.forEach(function(g){ for(var r=g.r1;r<=Math.min(g.r2,sh.rows-1,g.r1+MAXR);r++) for(var c=g.c1;c<=Math.min(g.c2,sh.cols-1);c++) keys.add(K(r,c)); if(g.r2>gr) gr=g.r2; if(g.c2>gc) gc=g.c2; });
  cfStats.forEach(function(o){ var f=o.f; if(f.t==='spark') for(var r=f.r1;r<=f.r2&&r<sh.rows;r++) keys.add(K(r,f.dc)); }); // sparklines are drawn in cells that may be empty
  keys.forEach(function(k){ var rc=E.RC(k); if(rc[0]<sh.rows&&rc[1]<sh.cols) paintCell(rc[0],rc[1]); else painted.delete(k); });
  if((gr>=sh.rows&&sh.rows<MAXR)||(gc>=sh.cols&&sh.cols<MAXC)) setTimeout(function(){ growTo(gr,gc); overlay(); },0); // a spill reaches past the grid
}
function splAt(r,c){ for(var i=0;i<spl.length;i++){ var g=spl[i]; if(r>=g.r1&&r<=g.r2&&c>=g.c1&&c<=g.c2) return g; } return null; }
function changed(){ paintAll(); overlay(); updateBar(); saveSoon(); if($('drawer').classList.contains('open')) renderCharts(); }

/* ---------- selection & overlay ---------- */
function norm(a,b){ return {r1:Math.min(a.r,b.r),c1:Math.min(a.c,b.c),r2:Math.max(a.r,b.r),c2:Math.max(a.c,b.c)}; }
var anchor={r:0,c:0};
function select(r,c,extend){
  r=Math.max(0,r); c=Math.max(0,c); growTo(r,c); r=Math.min(r,sh.rows-1); c=Math.min(c,sh.cols-1);
  if(!extend&&sh.merges.length){ var mg0=mergeAt(r,c); if(mg0){ r=mg0.r1; c=mg0.c1; } }
  var old=tdAt(act.r,act.c); if(old) old.classList.remove('act');
  if(extend){ sel=norm(anchor,{r:r,c:c}); act={r:r,c:c}; act={r:anchor.r,c:anchor.c}; }
  else { anchor={r:r,c:c}; act={r:r,c:c}; sel={r1:r,c1:c,r2:r,c2:c}; lastExt={r:r,c:c}; }
  overlay(); updateBar(); scrollTo(extend?r:act.r,extend?c:act.c);
}
function selectRange(g){ var old=tdAt(act.r,act.c); if(old) old.classList.remove('act'); growTo(g.r2,g.c2); sel={r1:g.r1,c1:g.c1,r2:Math.min(g.r2,sh.rows-1),c2:Math.min(g.c2,sh.cols-1)}; act={r:sel.r1,c:sel.c1}; anchor={r:act.r,c:act.c}; overlay(); updateBar(); scrollTo(act.r,act.c); }
function box(el,g){
  var a=tdAt(g.r1,g.c1), b=tdAt(g.r2,g.c2); if(!a||!b){ el.style.display='none'; return; }
  el.style.display='block'; el.style.left=(a.offsetLeft-1)+'px'; el.style.top=(a.offsetTop-1)+'px';
  el.style.width=(b.offsetLeft+b.offsetWidth-a.offsetLeft+1)+'px'; el.style.height=(b.offsetTop+b.offsetHeight-a.offsetTop+1)+'px';
}
function overlay(){
  if(sh.merges.length){ growMerges(sel); var mg=mergeAt(act.r,act.c); if(mg&&(mg.r1!==act.r||mg.c1!==act.c)) act={r:mg.r1,c:mg.c1}; }
  var single=sel.r1===sel.r2&&sel.c1===sel.c2;
  box($('selBox'),sel); $('selBox').style.background=single?'transparent':'';
  box($('actBox'),{r1:act.r,c1:act.c,r2:act.r,c2:act.c}); $('actBox').style.display=single?'none':'block';
  var sg=splAt(act.r,act.c); if(sg) box($('splBox'),{r1:sg.r1,c1:sg.c1,r2:Math.min(sg.r2,sh.rows-1),c2:Math.min(sg.c2,sh.cols-1)}); else $('splBox').style.display='none';
  var b=tdAt(sel.r2,sel.c2), fh=$('fillH');
  if(b&&!editing){ fh.style.display='block'; fh.style.left=(b.offsetLeft+b.offsetWidth-7)+'px'; fh.style.top=(b.offsetTop+b.offsetHeight-7)+'px'; } else fh.style.display='none';
  var td=tdAt(act.r,act.c); if(td) td.classList.add('act');
  var ths=hrow.cells; for(var i=1;i<ths.length;i++) ths[i].classList.toggle('hl',i-1>=sel.c1&&i-1<=sel.c2);
  hl.forEach(function(t){ t.classList.remove('hl'); }); hl=[];
  for(var r=sel.r1;r<=Math.min(sel.r2,sel.r1+400);r++){ var th=gbody.rows[r]&&gbody.rows[r].cells[0]; if(th){ th.classList.add('hl'); hl.push(th); } }
  if(!editing) placeGhost();
  placeDv(); stats();
}
var hl=[];
function scrollTo(r,c){
  var td=tdAt(r,c); if(!td) return;
  var z=zoom, x=td.offsetLeft*z, y=td.offsetTop*z, w=td.offsetWidth*z, h=td.offsetHeight*z, hw=(46+(c<sh.fc?0:fzW))*z, hh=(hrow.offsetHeight+(r<sh.fr?0:fzH))*z;
  if(x-hw<wrap.scrollLeft) wrap.scrollLeft=x-hw; else if(x+w>wrap.scrollLeft+wrap.clientWidth) wrap.scrollLeft=x+w-wrap.clientWidth;
  if(y-hh<wrap.scrollTop) wrap.scrollTop=y-hh; else if(y+h>wrap.scrollTop+wrap.clientHeight) wrap.scrollTop=y+h-wrap.clientHeight;
}
function selName(){
  var nm=doc.names.filter(function(n){ var p=E.parseNameRef(n.ref); return p&&p.sh===sh.name&&p.t==='rng'&&!p.col&&p.a.r===sel.r1&&p.a.c===sel.c1&&p.b.r===sel.r2&&p.b.c===sel.c2||p&&p.sh===sh.name&&p.t==='ref'&&p.a.r===sel.r1&&p.a.c===sel.c1&&sel.r1===sel.r2&&sel.c1===sel.c2; })[0];
  return nm?nm.name:E.rangeStr(sel);
}
/* ---------- 수식 풀이 (sheet/explain.js): the formula of the active cell, step by step, in Korean ---------- */
var fxDesc=null;
function fxDescOf(n){ if(!fxDesc){ fxDesc={}; (window.FNDOC||[]).forEach(function(f){ fxDesc[f[1]]=(FFT.lang==='ko'?f[3]:f[4]||f[3])||''; }); } return fxDesc[n]||''; }
function fxShow(v){
  if(v&&typeof v==='object'&&!E.isErr(v)) return v.rows?F('{0}줄 × {1}칸 표',v.rows.length,v.rows[0]?v.rows[0].length:0):T('칸 범위');
  if(E.isErr(v)) return v.e; if(v==null||v==='') return T('(빈칸)'); return E.formatValue(v);
}
function fxVal(n){ try{ return fxShow(eng.ev(n,doc.active)); }catch(e){ return E.isErr(e)?e.e:'#ERROR!'; } }
function fxText(t,cls){ var s=document.createElement('span'); if(cls) s.className=cls; s.textContent=t; return s; }
function fxRender(){
  var p=$('fxPanel'); if(p.hidden) return;
  var cell=sh.cells[K(act.r,act.c)], raw=cell&&cell.v!=null?String(cell.v):'', x=window.FSExplain.explain(raw,{parse:E.parse,val:fxVal,ref:fxVal,desc:fxDescOf,addr:E.addr,rangeStr:E.rangeStr,F:F});
  p.textContent=''; var h=document.createElement('h4'), cl=document.createElement('button'); cl.className='fxx'; cl.type='button'; cl.textContent='×'; cl.setAttribute('aria-label',T('닫기')); cl.onclick=function(){ fxToggle(false); };
  p.appendChild(cl); h.appendChild(fxText(T('수식 풀이')+' · '+E.addr(act.r,act.c))); p.appendChild(h);
  function line(t,cls){ var d=document.createElement('div'); d.appendChild(fxText(t,cls)); p.appendChild(d); return d; }
  if(x.kind==='text') return void line(raw?T('이 칸은 수식이 아니라 글자나 숫자예요. 수식은 =로 시작해요.'):T('빈 칸이에요. 수식이 있는 칸을 눌러 보세요.'));
  if(x.kind==='bad'){ line(T('수식을 읽지 못했어요.'),'fxbad'); line(F('여는 괄호 {0}개, 닫는 괄호 {1}개예요.',x.open,x.close)); line(x.hint); return; }
  if(x.kind==='ai'){ line(T('AI가 칸 내용을 보고 답을 채우는 함수예요.')); if(x.prompt){ var d1=line(T('시킨 일')+': '); d1.appendChild(fxText(x.prompt,'fxv')); } var d2=line(T('지금 답')+': '); d2.appendChild(fxText(x.value,'fxv')); line(T('AI의 답은 틀릴 수 있어요. 아래 ✨ 검수에서 맞는지 확인해 주세요.'),'fxn'); return; }
  if(x.refs.length){ var rr=document.createElement('div'); rr.className='fxr'; rr.appendChild(fxText(T('쓰는 칸')+':','fxn')); x.refs.forEach(function(q){ var c=document.createElement('code'); c.textContent=q.t+' = '+q.v; rr.appendChild(c); }); p.appendChild(rr); }
  if(x.simple){ var d3=line(T('값을 그대로 가져와요')+' → '); d3.appendChild(fxText(x.result,'fxv')); return; }
  var ol=document.createElement('ol'); x.steps.forEach(function(s){ var li=document.createElement('li'), c=document.createElement('code'); c.textContent=s.expr; li.appendChild(c);
    if(s.note) li.appendChild(fxText(' — '+T(s.note),'fxn')); li.appendChild(fxText(' → ')); li.appendChild(fxText(s.value,'fxv')); ol.appendChild(li); });
  p.appendChild(ol); if(x.more) line(F('이어서 {0}단계가 더 있어요.',x.more),'fxn');
  var d4=line(T('결과')+': '); d4.appendChild(fxText(x.result,'fxv'));
}
function fxToggle(on){ var p=$('fxPanel'); p.hidden=on===undefined?!p.hidden:!on; $('fxHelp').classList.toggle('on',!p.hidden); $('fxHelp').setAttribute('aria-expanded',String(!p.hidden)); fxRender(); }
$('fxHelp').onclick=function(){ fxToggle(); };
function updateBar(){
  nameBox.value=selName();
  if(!$('fxPanel').hidden) fxRender(); if(window.FSReview) FSReview.refresh();
  if(!editing||editing.src!=='bar'){ var c=sh.cells[K(act.r,act.c)]; fin.value=c&&c.v!=null?c.v:'';
    var sg=!fin.value&&splAt(act.r,act.c), ac=sg&&sh.cells[K(sg.r1,sg.c1)]; fin.placeholder=ac?ac.v:''; fin.classList.toggle('spl',!!ac); } // a spilled cell shows its anchor's formula, greyed
  var cell=sh.cells[K(act.r,act.c)]||{};
  $('bBold').classList.toggle('on',!!cell.b); $('bItal').classList.toggle('on',!!cell.i);
  var nso=$('nfSel'); nso.querySelectorAll('.tmp').forEach(function(x){ x.remove(); }); nso.value=cell.nf||''; if(nso.value!==(cell.nf||'')){ var op=document.createElement('option'); op.value=cell.nf; op.textContent=nfLabel(cell.nf); op.setAttribute('data-notr',''); op.className='tmp'; nso.appendChild(op); nso.value=cell.nf; }
  $('bNote').classList.toggle('on',!!cell.nt); $('bMerge').classList.toggle('on',!!mergeAt(act.r,act.c)); $('bFilter').classList.toggle('on',!!sh.flt);
}
function stats(){
  var el=$('stats'), n=(sel.r2-sel.r1+1)*(sel.c2-sel.c1+1);
  if(n<2||n>200000){ var ev=eng.value(doc.active,act.r,act.c), eh=E.errHint(ev), ac=sh.cells[K(act.r,act.c)], ps=[];
    if(eh) ps.push(ev.e+' · '+T(eh)); if(ac&&ac.nt) ps.push('📝 '+ac.nt); if(sh.flt&&sh.flt.shown!=null) ps.push(F('{0}/{1}행 표시',sh.flt.shown,sh.flt.r2-sh.flt.r1));
    el.textContent=ps.join('  ·  '); return; }
  var cnt=0, num=0, sum=0, mn=Infinity, mx=-Infinity;
  var ks=Object.keys(sh.cells); spl.forEach(function(g){ for(var r=Math.max(g.r1,sel.r1);r<=Math.min(g.r2,sel.r2);r++) for(var c=Math.max(g.c1,sel.c1);c<=Math.min(g.c2,sel.c2);c++) if(r!==g.r1||c!==g.c1) ks.push(K(r,c)); });
  for(var i=0;i<ks.length;i++){ var rc=E.RC(ks[i]); if(rc[0]<sel.r1||rc[0]>sel.r2||rc[1]<sel.c1||rc[1]>sel.c2) continue;
    var v=eng.value(doc.active,rc[0],rc[1]); if(v==null||v==='') continue; cnt++; if(typeof v==='number'){ num++; sum+=v; if(v<mn) mn=v; if(v>mx) mx=v; } }
  var f=E.fmtGeneral, h=T('개수')+' <b>'+cnt+'</b>';
  if(num) h=T('합계')+' <b>'+f(+sum.toPrecision(12))+'</b> · '+T('평균')+' <b>'+f(+(sum/num).toPrecision(10))+'</b> · '+h+' · '+T('최소')+' <b>'+f(mn)+'</b> · '+T('최대')+' <b>'+f(mx)+'</b>';
  el.innerHTML=h;
}

/* ---------- editing ---------- */
function placeGhost(){
  var td=tdAt(act.r,act.c); if(!td) return;
  ed.className='ghost'; ed.style.left=td.offsetLeft+'px'; ed.style.top=td.offsetTop+'px';
  if(mouseMode&&!dlgOpen()&&document.activeElement!==fin&&!isOtherInput(document.activeElement)) try{ ed.focus({preventScroll:true}); }catch(e){}
}
function isOtherInput(el){ return el&&el!==ed&&el!==fin&&(el.tagName==='INPUT'||el.tagName==='TEXTAREA'||el.tagName==='SELECT'); }
function startEdit(initial,typed,src){
  if(editing) return;
  var td=tdAt(act.r,act.c); if(!td) return;
  if(guard(cellBox(act.r,act.c))) return;
  var cell=sh.cells[K(act.r,act.c)], raw=cell&&cell.v!=null?String(cell.v):'';
  editing={r:act.r,c:act.c,src:src||'cell',typed:!!typed,orig:raw};
  $('fillH').style.display='none';
  if(editing.src==='bar'){ return; }
  ed.className='on'; ed.value=initial!=null?initial:raw;
  ed.style.left=(td.offsetLeft-1)+'px'; ed.style.top=(td.offsetTop-1)+'px'; ed.style.height=(td.offsetHeight+1)+'px'; ed.style.width=(td.offsetWidth+1)+'px';
  fit(); try{ ed.focus({preventScroll:true}); }catch(e){ ed.focus(); }
  var L=ed.value.length; try{ ed.setSelectionRange(L,L); }catch(e){}
  fin.value=ed.value; refMode();
}
function fit(){ var td=tdAt(editing.r,editing.c); if(!td) return; ed.style.width='0px'; var w=Math.max(td.offsetWidth+1,Math.min(ed.scrollWidth+14,620)); ed.style.width=w+'px'; }
function refMode(){ var on=!!editing&&edInput().value[0]==='='; wrap.classList.toggle('refmode',on); }
function edInput(){ return editing&&editing.src==='bar'?fin:ed; }
function commitEdit(move){
  if(!editing) return false;
  var e=editing, val=edInput().value; acHide(); editing=null; refDrag=null; $('refBox').style.display='none'; refMode();
  if(val!==e.orig&&val!==''&&!dvOk(e.r,e.c,val)){ toast(F('목록에 없는 값이에요: {0}',val)); val=e.orig; }
  if(val!==e.orig){
    pushUndo();
    if(val.length&&val[0]==='='&&val.length>1) val=closeParens(val);
    setRaw(e.r,e.c,val);
  }
  ed.value=''; ed.className='ghost';
  if(move){ var mv2=stepOver(e.r,e.c,move); select(visRow(mv2[0],move[0]),mv2[1]); } else { overlay(); }
  changed(); return true;
}
function cancelEdit(){ if(!editing) return; acHide(); editing=null; refMode(); ed.value=''; ed.className='ghost'; refDrag=null; $('refBox').style.display='none'; updateBar(); overlay(); }
function closeParens(s){ var o=0, q=false; for(var i=0;i<s.length;i++){ var ch=s[i]; if(ch==='"') q=!q; else if(!q){ if(ch==='(') o++; else if(ch===')') o--; } } while(o-->0) s+=')'; return s; }
function setRaw(r,c,val){
  var k=K(r,c), cell=sh.cells[k];
  if(val===''||val==null){ if(cell){ delete cell.v; delete cell.ai; delete cell.ar; if(!hasFmt(cell)) delete sh.cells[k]; } return; }
  if(!cell) cell=sh.cells[k]={}; if(cell.v!==val){ delete cell.ai; delete cell.ar; } cell.v=val; growTo(r,c);
}
/* v21: sheet protection. sh.lock={all:1,rg:[{r1,c1,r2,c2}]}; every way of changing a cell asks guard() first */
function locked(r,c){ return E.lockHit(sh.lock,r,c); }
function guard(g,s2){ if(!E.lockAny((s2||sh).lock,g)) return false; toast(T('잠긴 칸이라 고칠 수 없어요. 데이터 메뉴에서 잠금을 풀 수 있어요')); return true; }
function cellBox(r,c){ return {r1:r,c1:c,r2:r,c2:c}; }
function hasFmt(c){ return c.b||c.i||c.fc||c.bg||c.al||c.nf||c.cb||c.bd||c.bx||c.nt; }
function refPoint(){
  if(!editing) return false; var inp=edInput(), v=inp.value; if(v[0]!=='=') return false;
  var p=inp.selectionStart==null?v.length:inp.selectionStart, before=v.slice(0,p).replace(/\s+$/,'');
  if(refDrag) return true;
  return before==='='||/[=(+\-*/^,;&<>:]$/.test(before);
}
var refDrag=null;
function insertRef(r,c,extend){
  var inp=edInput(); var t;
  if(!refDrag){ var p=inp.selectionStart==null?inp.value.length:inp.selectionStart; refDrag={at:p,len:0,a:{r:r,c:c}}; }
  else if(!extend) refDrag.a={r:r,c:c};
  var g=norm(refDrag.a,{r:r,c:c}), si=doc.active, es=editing.sheet;
  t=E.rangeStr(g); if(es!=null&&es!==si) t=E.quoteSheet(sh.name)+'!'+t;
  var v=inp.value; inp.value=v.slice(0,refDrag.at)+t+v.slice(refDrag.at+refDrag.len); refDrag.len=t.length;
  var L=refDrag.at+t.length; try{ inp.focus({preventScroll:true}); inp.setSelectionRange(L,L); }catch(e){}
  box($('refBox'),g); if(inp===ed){ fit(); fin.value=ed.value; } else syncFromBar();
}
function syncFromBar(){ if(editing&&editing.src==='cell'){ ed.value=fin.value; fit(); } }

ed.addEventListener('input',function(){
  if(!editing){ var v=ed.value; startEdit(v,true); if(!editing){ ed.value=''; return; } acUpdate(); return; }
  refDrag=null; $('refBox').style.display='none'; fit(); fin.value=ed.value; refMode(); acUpdate();
});
ed.addEventListener('compositionstart',function(){ if(!editing){ startEdit('',true); if(!editing) ed.value=''; } });
fin.addEventListener('focus',function(){ if(editing&&editing.src==='cell'){ var v=ed.value; editing.src='bar'; ed.className='ghost'; fin.value=v; } else if(!editing){ startEdit(null,false,'bar'); if(!editing){ fin.blur(); return; } fin.value=(sh.cells[K(act.r,act.c)]||{}).v||''; } });
fin.addEventListener('input',function(){ refDrag=null; syncFromBar(); refMode(); acUpdate(); });
nameBox.addEventListener('keydown',function(e){
  if(e.key!=='Enter') return; e.preventDefault(); var txt=nameBox.value.trim(), g=E.parseRange(txt), nd=findName(txt);
  if(g){ selectRange(g); nameBox.blur(); }
  else if(nd){ goName(nd); nameBox.blur(); }
  else if(txt&&!E.validName(txt)){ setName(txt,E.nameRef(E.rangeStr(sel),sh.name)); toast(F('"{0}" 이름을 붙였어요',txt)); nameBox.blur(); }
  else { toast(T('주소를 알 수 없어요')); nameBox.value=selName(); }
});
nameBox.addEventListener('focus',function(){ commitEdit(); setTimeout(function(){ nameBox.select(); },0); });

/* ---------- keyboard ---------- */
function dlgOpen(){ return !!document.querySelector('.ov.open'); }
document.addEventListener('keydown',function(e){
  if(dlgOpen()){ if(e.key==='Escape'&&!$('aiDlg').classList.contains('open')) closeDlgs(); return; }
  closeMenus();
  var t=e.target, mod=e.ctrlKey||e.metaKey;
  if(isOtherInput(t)&&t!==nameBox) return;
  if(t===nameBox) return;
  if(editing){
    if(e.isComposing||e.keyCode===229) return;
    if(acOpen()){ if(e.key==='Tab'){ e.preventDefault(); acPick(acIdx); return; } if(e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault(); acMove(e.key==='ArrowDown'?1:-1); return; } if(e.key==='Escape'){ e.preventDefault(); acHide(); return; } }
    if(e.key==='Enter'){ e.preventDefault(); commitEdit([e.shiftKey?-1:1,0]); return; }
    if(e.key==='Tab'){ e.preventDefault(); commitEdit([0,e.shiftKey?-1:1]); return; }
    if(e.key==='Escape'){ e.preventDefault(); cancelEdit(); return; }
    if(editing.typed&&editing.src==='cell'&&!refPoint()&&!mod){ var mv={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]}[e.key]; if(mv){ e.preventDefault(); commitEdit(mv); } }
    return;
  }
  var k=e.key, mvs={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]};
  if(mvs[k]){ e.preventDefault(); var d=mvs[k];
    if(e.shiftKey){ var tgt={r:(act.r===anchor.r&&act.c===anchor.c)?lastExt.r:lastExt.r,c:lastExt.c}; tgt={r:Math.max(0,lastExt.r+d[0]),c:Math.max(0,lastExt.c+d[1])}; extendTo(tgt.r,tgt.c); }
    else if(mod){ jump(d); }
    else { var nv=stepOver(act.r,act.c,d); select(visRow(nv[0],d[0]),nv[1]); } return; }
  if(k==='Enter'){ e.preventDefault(); var ev2=stepOver(act.r,act.c,[e.shiftKey?-1:1,0]); select(visRow(ev2[0],e.shiftKey?-1:1),act.c); return; }
  if(k==='Tab'){ e.preventDefault(); var tv=stepOver(act.r,act.c,[0,e.shiftKey?-1:1]); select(act.r,tv[1]); return; }
  if(k==='Delete'||k==='Backspace'){ e.preventDefault(); clearSel(); return; }
  if(k==='F2'){ e.preventDefault(); startEdit(null,false); return; }
  if(k==='Escape'){ return; }
  if(k==='Home'){ e.preventDefault(); if(mod) select(0,0); else select(act.r,0); return; }
  if(k==='PageDown'||k==='PageUp'){ e.preventDefault(); var pg=Math.max(5,Math.floor(wrap.clientHeight/(26*zoom))-2); select(act.r+(k==='PageDown'?pg:-pg),act.c); return; }
  if(e.altKey&&!mod&&k==='='){ e.preventDefault(); cmd('sum'); return; }
  if(mod){
    var l=k.toLowerCase();
    if(l==='z'&&!e.shiftKey){ e.preventDefault(); undo(); return; }
    if(l==='y'||(l==='z'&&e.shiftKey)){ e.preventDefault(); redo(); return; }
    if(l==='b'){ e.preventDefault(); cmd('bold'); return; }
    if(l==='i'){ e.preventDefault(); cmd('italic'); return; }
    if(l==='a'){ e.preventDefault(); selectRange({r1:0,c1:0,r2:sh.rows-1,c2:sh.cols-1}); return; }
    if(l==='f'||l==='h'){ e.preventDefault(); cmd('find'); return; }
    if(l==='d'){ e.preventDefault(); fillDown(); return; }
    if(l===';'){ e.preventDefault(); var nw=new Date(), pz=function(n){ return (n<10?'0':'')+n; }, ds=nw.getFullYear()+'-'+pz(nw.getMonth()+1)+'-'+pz(nw.getDate()); if(guard(sel)) return; pushUndo(); forSel(function(r,c){ setRaw(r,c,e.shiftKey?ds+' '+pz(nw.getHours())+':'+pz(nw.getMinutes()):ds); }); changed(); return; }
    if(l==='l'&&e.shiftKey){ e.preventDefault(); if(sh.flt) openFilter(act.c); else cmd('filter'); return; }
    if(l==='s'){ e.preventDefault(); saveNow(); toast(T('저장됨')); return; }
    if(l==='p'){ e.preventDefault(); cmd('print'); return; }
    if(k==='/'){ e.preventDefault(); openDlg('keyDlg'); return; }
    return;
  }
  if(k===' '&&cur_cb()){ e.preventDefault(); if(guard(sel)) return; pushUndo(); var on2=null; forSel(function(r,c){ var x=sh.cells[K(r,c)]; if(!x||!x.cb||String(x.v||'')[0]==='=') return; if(on2===null) on2=eng.value(doc.active,r,c)!==true; x.v=on2?'TRUE':'FALSE'; }); changed(); return; }
  if(k.length===1&&document.activeElement!==ed){ e.preventDefault(); startEdit(k,true); }
});
function cur_cb(){ var x=sh.cells[K(act.r,act.c)]; return !!(x&&x.cb); }
var lastExt={r:0,c:0};
function extendTo(r,c){ r=Math.max(0,r); c=Math.max(0,c); growTo(r,c); r=Math.min(r,sh.rows-1); c=Math.min(c,sh.cols-1); lastExt={r:r,c:c}; sel=norm(anchor,lastExt); act={r:anchor.r,c:anchor.c}; overlay(); updateBar(); scrollTo(r,c); }
function jump(d){ var r=act.r, c=act.c, has=function(r,c){ var x=sh.cells[K(r,c)]; return x&&x.v!=null&&x.v!==''; };
  var maxR=sh.rows-1, maxC=sh.cols-1, cur=has(r,c), nr=r+d[0], nc=c+d[1];
  if(nr<0||nc<0||nr>maxR||nc>maxC) return;
  if(cur&&has(nr,nc)){ while(nr+d[0]>=0&&nc+d[1]>=0&&nr+d[0]<=maxR&&nc+d[1]<=maxC&&has(nr+d[0],nc+d[1])){ nr+=d[0]; nc+=d[1]; } }
  else { while(!has(nr,nc)&&nr+d[0]>=0&&nc+d[1]>=0&&nr+d[0]<=maxR&&nc+d[1]<=maxC){ nr+=d[0]; nc+=d[1]; } }
  select(nr,nc);
}
function fillDown(){ if(sel.r2<=sel.r1) return toast(T('채울 범위를 아래로 넓게 고르세요')); doFill({r1:sel.r1,c1:sel.c1,r2:sel.r1,c2:sel.c2},{r1:sel.r1,c1:sel.c1,r2:sel.r2,c2:sel.c2}); }
function clearSel(){ if(guard(sel)) return; pushUndo(); forSel(function(r,c){ setRaw(r,c,''); }); changed(); }
function forSel(fn){ for(var r=sel.r1;r<=sel.r2;r++) for(var c=sel.c1;c<=sel.c2;c++) fn(r,c); }

/* ---------- pointer ---------- */
var drag=null, down=null;
function cellFromEl(el){ var td=el&&el.closest&&el.closest('#gbody td'); if(!td) return null; return {r:td.parentNode.sectionRowIndex,c:td.cellIndex-1,td:td}; }
function cellAtPoint(x,y){
  var el=document.elementFromPoint(x,y); var c=cellFromEl(el); if(c) return c;
  if(el&&el.closest&&el.closest('#gbody th')){ var tr=el.closest('tr'); return {r:tr.sectionRowIndex,c:0}; }
  if(el&&el.closest&&el.closest('#hrow th[data-c]')) return {r:0,c:+el.closest('th').dataset.c,hdr:true};
  return null;
}
gbody.addEventListener('pointerdown',function(e){
  if(e.button>0) return;
  var th=e.target.closest('th');
  if(th){ var r=th.parentNode.sectionRowIndex; if(e.pointerType==='mouse'||true){ commitEdit(); if(e.shiftKey){ anchor={r:anchor.r,c:0}; } else anchor={r:r,c:0};
      sel=norm(anchor,{r:r,c:sh.cols-1}); act={r:anchor.r,c:0}; overlay(); updateBar(); drag={mode:'rows',id:e.pointerId,pt:e.pointerType,el:th}; if(e.pointerType==='mouse') e.preventDefault(); } return; }
  var p=cellFromEl(e.target); if(!p) return;
  if(sh.flt&&p.r===sh.flt.r1&&p.td.classList.contains('flt')&&e.clientX>p.td.getBoundingClientRect().right-26*zoom){ e.preventDefault(); commitEdit(); select(p.r,p.c); openFilter(p.c); return; }
  if(editing&&refPoint()){ e.preventDefault(); insertRef(p.r,p.c,false); drag={mode:'ref',id:e.pointerId}; try{ gbody.setPointerCapture(e.pointerId); }catch(_){} return; }
  if(e.pointerType==='mouse'){
    e.preventDefault();
    if(e.target.dataset.cb&&!e.shiftKey){ commitEdit(); select(p.r,p.c); toggleCheck(p.r,p.c); return; }
    if(editing&&editing.r===p.r&&editing.c===p.c) return;
    commitEdit(); if(e.shiftKey) extendTo(p.r,p.c); else { select(p.r,p.c); lastExt={r:p.r,c:p.c}; }
    drag={mode:'sel',id:e.pointerId}; return;
  }
  var single=sel.r1===sel.r2&&sel.c1===sel.c2, isAct=!editing&&single&&act.r===p.r&&act.c===p.c;
  down={r:p.r,c:p.c,x:e.clientX,y:e.clientY,isAct:isAct,cb:!!e.target.dataset.cb,id:e.pointerId,moved:false};
  if(isAct&&!down.cb){ drag={mode:'sel',id:e.pointerId,touch:true}; lastExt={r:p.r,c:p.c}; }
});
hrow.addEventListener('pointerdown',function(e){
  var rz=e.target.dataset.rz; if(rz!=null){ e.preventDefault(); e.stopPropagation(); commitEdit(); var nowT=Date.now(); if(lastRz.c===+rz&&nowT-lastRz.t<400){ lastRz={c:-1,t:0}; fitCols(+rz,+rz); return; } lastRz={c:+rz,t:nowT}; drag={mode:'rz',c:+rz,x:e.clientX,w:cw(+rz),id:e.pointerId}; try{ hrow.setPointerCapture(e.pointerId); }catch(_){} return; }
  var th=e.target.closest('th[data-c]'); if(!th) return; var c=+th.dataset.c;
  commitEdit(); if(!e.shiftKey) anchor={r:0,c:c}; sel=norm({r:0,c:anchor.c},{r:sh.rows-1,c:c}); act={r:0,c:anchor.c}; overlay(); updateBar(); drag={mode:'cols',id:e.pointerId,pt:e.pointerType,el:th};
  if(e.pointerType==='mouse') e.preventDefault();
});
$('fillH').addEventListener('pointerdown',function(e){ e.preventDefault(); e.stopPropagation(); commitEdit(); drag={mode:'fill',src:Object.assign({},sel),dst:null,id:e.pointerId}; try{ e.target.setPointerCapture(e.pointerId); }catch(_){} });
var autoT=null, lastPt=null, lastRz={c:-1,t:0};
function autoScroll(){
  if(!drag||!lastPt){ autoT=null; return; }
  var b=wrap.getBoundingClientRect(), dx=0, dy=0, m=30;
  if(lastPt.x<b.left+m+46*zoom) dx=-14; else if(lastPt.x>b.right-m) dx=14;
  if(lastPt.y<b.top+m+26*zoom) dy=-14; else if(lastPt.y>b.bottom-m) dy=14;
  if(dx||dy){ wrap.scrollLeft+=dx; wrap.scrollTop+=dy; moveDrag(lastPt.x,lastPt.y); }
  autoT=requestAnimationFrame(autoScroll);
}
function moveDrag(x,y){
  if(drag.mode==='rz'){ var w=Math.max(30,Math.round(drag.w+(x-drag.x)/zoom)); sh.cw[drag.c]=w; colsEl.children[drag.c+1].style.width=w+'px'; overlay(); return; }
  var p=cellAtPoint(x,y); if(!p) return;
  if(drag.mode==='sel'){ if(p.hdr) return; if(lastExt.r!==p.r||lastExt.c!==p.c) extendTo(p.r,p.c); }
  else if(drag.mode==='rows'){ sel=norm({r:anchor.r,c:0},{r:p.r,c:sh.cols-1}); overlay(); updateBar(); }
  else if(drag.mode==='cols'){ sel=norm({r:0,c:anchor.c},{r:sh.rows-1,c:p.c}); overlay(); updateBar(); }
  else if(drag.mode==='ref'){ if(!p.hdr) insertRef(p.r,p.c,true); }
  else if(drag.mode==='fill'){ var s=drag.src, d;
    if(p.r>s.r2) d={r1:s.r1,c1:s.c1,r2:p.r,c2:s.c2}; else if(p.r<s.r1) d={r1:p.r,c1:s.c1,r2:s.r2,c2:s.c2};
    else if(p.c>s.c2) d={r1:s.r1,c1:s.c1,r2:s.r2,c2:p.c}; else if(p.c<s.c1) d={r1:s.r1,c1:p.c,r2:s.r2,c2:s.c2}; else d=null;
    drag.dst=d; if(d) box($('fillBox'),d); else $('fillBox').style.display='none'; }
}
document.addEventListener('pointermove',function(e){
  if(down&&!down.moved&&(Math.abs(e.clientX-down.x)>8||Math.abs(e.clientY-down.y)>8)){ down.moved=true; if(!down.isAct) down=null; }
  if(!drag||drag.id!==e.pointerId) return;
  if(drag.touch&&!down) return;
  if(drag.sx==null){ drag.sx=e.clientX; drag.sy=e.clientY; } else if(Math.abs(e.clientX-drag.sx)>8||Math.abs(e.clientY-drag.sy)>8) drag.moved=true;
  e.preventDefault(); lastPt={x:e.clientX,y:e.clientY}; moveDrag(e.clientX,e.clientY);
  if(!autoT&&drag.mode!=='rz') autoT=requestAnimationFrame(autoScroll);
},{passive:false});
function endDrag(e,cancel){
  var d=drag, dn=down; drag=null; down=null; lastPt=null;
  if(d&&d.mode==='rz'){ buildGrid(); overlay(); saveSoon(); return; }
  if(d&&d.mode==='fill'){ $('fillBox').style.display='none'; if(d.dst&&!cancel) doFill(d.src,d.dst); return; }
  if(d&&d.mode==='ref') return;
  if(d&&(d.mode==='rows'||d.mode==='cols')){ if(!cancel&&d.pt==='touch'&&!d.moved&&d.id===e.pointerId) openMenu($('rowMenu'),d.el); return; }
  if(cancel||!dn||dn.id!==e.pointerId) return;
  if(dn.moved&&!dn.isAct) return;
  if(dn.isAct&&dn.moved) return;
  // a tap
  if(dn.cb){ commitEdit(); select(dn.r,dn.c); toggleCheck(dn.r,dn.c); return; }
  if(dn.isAct){ startEdit(null,false); return; }
  if(editing&&refPoint()){ insertRef(dn.r,dn.c,false); return; }
  commitEdit(); select(dn.r,dn.c);
}
document.addEventListener('pointerup',function(e){ endDrag(e,false); });
document.addEventListener('pointercancel',function(e){ if(drag&&drag.touch){ drag=null; } endDrag(e,true); });
gbody.addEventListener('dblclick',function(e){ var p=cellFromEl(e.target); if(!p||e.target.dataset.cb||!mouseMode||(editing&&refPoint())) return; commitEdit(); select(p.r,p.c); startEdit(null,false); });
wrap.addEventListener('scroll',function(){ closeMenus(); },{passive:true});

function toggleCheck(r,c){ var cell=sh.cells[K(r,c)]; if(!cell||guard(cellBox(r,c))) return; var v=eng.value(doc.active,r,c); if(String(cell.v||'')[0]==='=') return toast(T('수식이 든 칸은 체크할 수 없어요')); pushUndo(); cell.v=v===true?'FALSE':'TRUE'; changed(); }

/* ---------- fill ---------- */
function incText(s,n){ var m=/^([\s\S]*?)(\d+)(\D*)$/.exec(s); if(!m) return null; var num=String(+m[2]+n); while(num.length<m[2].length) num='0'+num; return m[1]+num+m[3]; }
var LISTS=[['월','화','수','목','금','토','일'],['월요일','화요일','수요일','목요일','금요일','토요일','일요일'],['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  ['mon','tue','wed','thu','fri','sat','sun'],['monday','tuesday','wednesday','thursday','friday','saturday','sunday'],['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'],
  ['january','february','march','april','may','june','july','august','september','october','november','december'],['갑','을','병','정','무','기','경','신','임','계'],['봄','여름','가을','겨울']];
function listNext(t,off){
  var key=t.trim().toLowerCase(); for(var i=0;i<LISTS.length;i++){ var j=LISTS[i].indexOf(key); if(j<0) continue; var w=LISTS[i][((j+off)%LISTS[i].length+LISTS[i].length)%LISTS[i].length];
    if(/^[a-z]/i.test(t)){ if(t===t.toUpperCase()&&t.length>1) w=w.toUpperCase(); else if(t[0]===t[0].toUpperCase()) w=w[0].toUpperCase()+w.slice(1); } return w; }
  return null;
}
function doFill(s,d){
  if(guard(d)) return;
  pushUndo();
  var vert=d.r1!==s.r1||d.r2!==s.r2, lines, len;
  if(vert){ lines=[]; for(var c=s.c1;c<=s.c2;c++) lines.push(c); len=s.r2-s.r1+1; } else { lines=[]; for(var r=s.r1;r<=s.r2;r++) lines.push(r); len=s.c2-s.c1+1; }
  var start=vert?s.r1:s.c1, from=vert?d.r1:d.c1, to=vert?d.r2:d.c2;
  lines.forEach(function(line){
    var src=[]; for(var i=0;i<len;i++){ var rr=vert?start+i:line, cc=vert?line:start+i; src.push(sh.cells[K(rr,cc)]||null); }
    var nums=src.map(function(x){ return x&&x.v!=null&&String(x.v)[0]!=='='?E.literal(x.v):null; });
    var allNum=len>=2&&nums.every(function(v){ return typeof v==='number'; }), step=allNum?(nums[len-1]-nums[0])/(len-1):0;
    for(var p=from;p<=to;p++){
      var off=p-start; if(off>=0&&off<len) continue;
      var ti=((off%len)+len)%len, base=src[ti], rr=vert?p:line, cc=vert?line:p, k=K(rr,cc);
      if(!base){ delete sh.cells[k]; continue; }
      var nc=JSON.parse(JSON.stringify(base)), raw=base.v;
      if(raw!=null&&String(raw)[0]==='=') nc.v=E.shiftFormula(raw,vert?p-(start+ti):0,vert?0:p-(start+ti));
      else if(allNum) nc.v=E.fmtGeneral(+(nums[0]+step*off).toPrecision(12));
      else if(raw!=null&&typeof E.literal(raw)==='string'){ var cyc=Math.floor(off/len); var it=len===1?(listNext(String(raw),off)||incText(String(raw),off)):null; if(it!=null) nc.v=it; }
      sh.cells[k]=nc;
    }
  });
  var old=tdAt(act.r,act.c); if(old) old.classList.remove('act');
  sel=norm({r:d.r1,c:d.c1},{r:d.r2,c:d.c2}); growTo(sel.r2,sel.c2); changed();
}

/* ---------- clipboard ---------- */
var clip=null;
function selTSV(){ var rows=[]; for(var r=sel.r1;r<=sel.r2;r++){ var a=[]; for(var c=sel.c1;c<=sel.c2;c++) a.push(cellText(r,c)); rows.push(a.join('\t')); } return rows.join('\n'); }
/* a spilled cell copies as its value (like Excel), since the formula lives in the block's first cell */
function spillCopy(r,c){ if(!splAt(r,c)) return null; var v=eng.value(doc.active,r,c); if(v==null||E.isErr(v)) return null; var t=E.formatValue(v); return {v:typeof v==='string'&&E.literal(t)!==t?"'"+t:t}; }
function grab(cut){
  var cells=[]; for(var r=sel.r1;r<=sel.r2;r++){ var row=[]; for(var c=sel.c1;c<=sel.c2;c++){ var x=sh.cells[K(r,c)]; row.push(x?JSON.parse(JSON.stringify(x)):spillCopy(r,c)); } cells.push(row); }
  clip={cells:cells,r:sel.r1,c:sel.c1,tsv:selTSV(),cut:cut?{si:doc.active,g:Object.assign({},sel)}:null};
  return clip.tsv;
}
function pasteInternal(){
  var ph=clip.cells.length, pw=clip.cells[0].length; if(guard({r1:act.r,c1:act.c,r2:act.r+ph-1,c2:act.c+pw-1})||(clip.cut&&guard(clip.cut.g,doc.sheets[clip.cut.si]))) return;
  pushUndo(); var dr=act.r-clip.r, dc=act.c-clip.c;
  if(clip.cut){ var cs=doc.sheets[clip.cut.si], g=clip.cut.g; for(var r=g.r1;r<=g.r2;r++) for(var c=g.c1;c<=g.c2;c++) delete cs.cells[K(r,c)]; }
  clip.cells.forEach(function(row,i){ row.forEach(function(x,j){ var k=K(act.r+i,act.c+j); if(!x){ delete sh.cells[k]; return; }
    var n=JSON.parse(JSON.stringify(x)); if(!clip.cut&&n.v!=null&&String(n.v)[0]==='=') n.v=E.shiftFormula(n.v,dr,dc); sh.cells[k]=n; }); });
  var h=clip.cells.length, w=clip.cells[0].length; growTo(act.r+h-1,act.c+w-1);
  if(clip.cut) clip.cut=null;
  sel={r1:act.r,c1:act.c,r2:act.r+h-1,c2:act.c+w-1}; changed();
}
function pasteText(text){
  text=String(text).replace(/\r\n?/g,'\n'); if(text.slice(-1)==='\n') text=text.slice(0,-1);
  var rows=text.split('\n').map(function(l){ return l.split('\t'); });
  if(guard({r1:act.r,c1:act.c,r2:act.r+rows.length-1,c2:act.c+Math.max.apply(null,rows.map(function(r){ return r.length; }))-1})) return;
  pushUndo(); rows.forEach(function(row,i){ row.forEach(function(v,j){ setRaw(act.r+i,act.c+j,v); }); });
  var w=Math.max.apply(null,rows.map(function(r){ return r.length; }));
  growTo(act.r+rows.length-1,act.c+w-1); sel={r1:act.r,c1:act.c,r2:Math.min(sh.rows-1,act.r+rows.length-1),c2:Math.min(sh.cols-1,act.c+w-1)}; changed();
}
function doPaste(text){ if(clip&&(text==null||text.replace(/\r/g,'')===clip.tsv)) pasteInternal(); else if(text!=null&&text!=='') pasteText(text); }
document.addEventListener('copy',function(e){ if(editing||isOtherInput(document.activeElement)) return; e.preventDefault(); e.clipboardData.setData('text/plain',grab(false)); toast(T('복사했어요')); });
document.addEventListener('cut',function(e){ if(editing||isOtherInput(document.activeElement)) return; e.preventDefault(); e.clipboardData.setData('text/plain',grab(true)); toast(T('잘라냈어요. 붙여넣을 곳을 고르세요')); });
document.addEventListener('paste',function(e){ if(editing||isOtherInput(document.activeElement)) return; e.preventDefault(); doPaste(e.clipboardData.getData('text/plain')); });

/* ---------- commands ---------- */
function fmtSel(fn){ if(guard(sel)) return; pushUndo(); forSel(function(r,c){ var k=K(r,c), x=sh.cells[k]||(sh.cells[k]={}); fn(x); if(x.v==null&&!hasFmt(x)) delete sh.cells[k]; }); changed(); }
function cmd(n){
  if(n!=='fn'&&n!=='sum') commitEdit();
  var cur=sh.cells[K(act.r,act.c)]||{};
  switch(n){
    case 'undo': return undo();
    case 'redo': return redo();
    case 'copy': { var t=grab(false); try{ navigator.clipboard.writeText(t).catch(function(){}); }catch(e){} return toast(T('복사했어요')); }
    case 'cut': { var t2=grab(true); try{ navigator.clipboard.writeText(t2).catch(function(){}); }catch(e){} return toast(T('잘라냈어요. 붙여넣을 곳을 고르세요')); }
    case 'paste': {
      if(clip) return doPaste(null);
      try{ navigator.clipboard.readText().then(function(t){ doPaste(t); },function(){ toast(T('붙여넣을 내용이 없어요')); }); }catch(e){ toast(T('붙여넣을 내용이 없어요')); }
      return; }
    case 'bold': { var b=!cur.b; return fmtSel(function(x){ if(b) x.b=1; else delete x.b; }); }
    case 'italic': { var it=!cur.i; return fmtSel(function(x){ if(it) x.i=1; else delete x.i; }); }
    case 'al-l': case 'al-c': case 'al-r': { var a=n.slice(3); return fmtSel(function(x){ if(x.al===a&&cur.al===a) delete x.al; else x.al=a; }); }
    case 'clearfmt': return fmtSel(function(x){ ['b','i','fc','bg','al','nf','cb','bd','bx'].forEach(function(p){ delete x[p]; }); });
    case 'check': { var on=!cur.cb; return fmtSel(function(x){ if(on){ x.cb=1; var l=E.literal(x.v); if(typeof l!=='boolean'&&String(x.v||'')[0]!=='=') x.v='FALSE'; } else { delete x.cb; } }); }
    case 'sum': return autoSum();
    case 'fn': return openFn();
    case 'sortA': return sortSel(true);
    case 'sortD': return sortSel(false);
    case 'find': return fOpen();
    case 'print': closeMenus(); return setTimeout(function(){ window.print(); },60);
    case 'keys': return openDlg('keyDlg');
    case 'viz': if(window.FSViz) window.FSViz.open(); return;
    case 'ai': if(window.FSAI) window.FSAI.open(); return;
    case 'chart': openDrawer(); if(!(sel.r1===sel.r2&&sel.c1===sel.c2)||(!sh.charts.length&&region(act.r,act.c))) addChart(); return;
    case 'scale': case 'bars': return addCf(n==='scale'?'scale':'bar');
    case 'decUp': case 'decDn': return stepDecimals(n==='decUp'?1:-1);
    case 'border': { var on2=!cur.bd; return fmtSel(function(x){ if(on2) x.bd=1; else delete x.bd; }); }
    case 'filter': return openFilter(act.c);
    case 'cfrule': return openCf();
    case 'cfviz': return openCfViz();
    case 'dv': return openDv();
    case 'note': return editNote();
    case 'merge': return mergeCmd();
    case 'borderdlg': return openBorder();
    case 'tstyle': return openMenu($('tsMenu'),menuAnchor('tstyle'));
  }
}
/* every ribbon button and command-search entry (commands.js) runs through here: plain ids are cmd() names,
   r.* the row/column menu, d.* the data tools, f.* the file menu, t.* the sheet tab menu, ai.* the AI window */
function menuAnchor(id){ var b=document.querySelector('#ribbon [data-k="'+id+'"]'); return b&&!b.hidden?b:$('ribbon'); }
function runCmd(id){
  id=String(id||''); var p=id.indexOf('.'), ns=p>0?id.slice(0,p):'', n=p>0?id.slice(p+1):id;
  if(ns==='r'&&n==='fzMenu'){ commitEdit(); $('fzNow').textContent=sh.fr||sh.fc?F('{0}행·{1}열 고정 중',sh.fr,sh.fc):T('고정 안 함'); return openMenu($('fzMenu'),menuAnchor(id)); }
  if(ns==='r'){ if(n==='clr'){ closeMenus(); commitEdit(); return clearSel(); } return rowCmd(n); }
  if(ns==='d'){ closeMenus(); return dataCmd(n); }
  if(ns==='f'){ closeMenus(); commitEdit(); return fileCmd(n); }
  if(ns==='t'){ closeMenus(); if(n==='add') return $('addTab').click(); return tabCmd(n); }
  if(ns==='ai'){ commitEdit();
    if(n==='set'){ if(window.FFAI) FFAI.settings(); return; }
    if(n==='fn') return $('aiFn').click();
    if(n==='rerun'){ if(window.FSAI) FSAI.rerun(); return; }
    if(window.FSAI){ FSAI.open(); var tb=document.querySelector('#aiDlg .atab[data-m="'+n+'"]'); if(tb) tb.click(); } return; }
  if(n==='fc'||n==='bg'){ var pk=$(n==='fc'?'fcPick':'bgPick'); try{ if(pk.showPicker) pk.showPicker(); else pk.click(); }catch(e){ pk.click(); } return; }
  if(n==='nf'){ $('nfSel').focus(); return; }
  return cmd(n);
}
document.getElementById('ribbon').addEventListener('click',function(e){ var b=e.target.closest('[data-cmd]'); if(b) runCmd(b.dataset.cmd); });
document.getElementById('ribbon').addEventListener('pointerdown',function(e){ if(e.target.closest('[data-cmd=fn],[data-cmd=sum]')&&editing) e.preventDefault(); });
$('nfSel').addEventListener('change',function(){ var v=this.value; commitEdit(); fmtSel(function(x){ if(v) x.nf=v; else delete x.nf; }); });
$('fcPick').addEventListener('input',function(){ $('fcChip').style.background=this.value; });
$('fcPick').addEventListener('change',function(){ var v=this.value; commitEdit(); fmtSel(function(x){ x.fc=v; }); });
$('bgPick').addEventListener('input',function(){ $('bgChip').style.background=this.value; });
$('bgPick').addEventListener('change',function(){ var v=this.value; commitEdit(); fmtSel(function(x){ x.bg=v; }); });

function isNumCell(r,c){ var x=sh.cells[K(r,c)]; return x&&x.v!=null&&x.v!==''&&typeof eng.value(doc.active,r,c)==='number'; }
function autoSum(){
  if(editing) { insertAtCaret('SUM('); return; }
  if(!(sel.r1===sel.r2&&sel.c1===sel.c2)){
    pushUndo(); var single=sel.r1===sel.r2;
    if(!single){ for(var c=sel.c1;c<=sel.c2;c++) setRaw(sel.r2+1,c,'=SUM('+E.addr(sel.r1,c)+':'+E.addr(sel.r2,c)+')'); }
    else setRaw(sel.r1,sel.c2+1,'=SUM('+E.addr(sel.r1,sel.c1)+':'+E.addr(sel.r1,sel.c2)+')');
    changed(); return;
  }
  var r=act.r-1, c=act.c, f;
  if(r>=0&&isNumCell(r,c)){ var r0=r; while(r0-1>=0&&isNumCell(r0-1,c)) r0--; f='=SUM('+E.addr(r0,c)+':'+E.addr(r,c)+')'; }
  else if(c-1>=0&&isNumCell(act.r,c-1)){ var c0=c-1; while(c0-1>=0&&isNumCell(act.r,c0-1)) c0--; f='=SUM('+E.addr(act.r,c0)+':'+E.addr(act.r,c-1)+')'; }
  else { startEdit('=SUM(',true); return; }
  startEdit(f,true);
}
function insertAtCaret(s){
  var inp=edInput(); var p=inp.selectionStart==null?inp.value.length:inp.selectionStart, q=inp.selectionEnd==null?p:inp.selectionEnd;
  inp.value=inp.value.slice(0,p)+s+inp.value.slice(q); var L=p+s.length; try{ inp.focus({preventScroll:true}); inp.setSelectionRange(L,L); }catch(e){}
  if(inp===ed){ fit(); fin.value=ed.value; } else syncFromBar();
}
/* contiguous block around a cell (like Ctrl+A in Excel) */
function region(r,c){
  var has=function(r,c){ var x=sh.cells[K(r,c)]; return x&&x.v!=null&&x.v!==''; };
  if(!has(r,c)) return null; var g={r1:r,c1:c,r2:r,c2:c}, grew=true;
  while(grew){ grew=false;
    if(g.r1>0){ for(var cc=g.c1;cc<=g.c2;cc++) if(has(g.r1-1,cc)){ g.r1--; grew=true; break; } }
    if(g.r2<sh.rows-1){ for(cc=g.c1;cc<=g.c2;cc++) if(has(g.r2+1,cc)){ g.r2++; grew=true; break; } }
    if(g.c1>0){ for(var rr=g.r1;rr<=g.r2;rr++) if(has(rr,g.c1-1)){ g.c1--; grew=true; break; } }
    if(g.c2<sh.cols-1){ for(rr=g.r1;rr<=g.r2;rr++) if(has(rr,g.c2+1)){ g.c2++; grew=true; break; } } }
  return g;
}
function hasHeader(g){
  if(g.r2<=g.r1) return false; var si=doc.active, hdrText=false, bodyNum=false;
  for(var c=g.c1;c<=g.c2;c++){ var v=eng.value(si,g.r1,c); if(typeof v==='string'&&v!=='') hdrText=true; var b=eng.value(si,g.r1+1,c); if(typeof b==='number') bodyNum=true; }
  var allText=true; for(c=g.c1;c<=g.c2;c++){ var v2=eng.value(si,g.r1,c); if(v2!=null&&typeof v2!=='string') allText=false; }
  return hdrText&&allText&&bodyNum;
}
function sortSel(asc,force){
  var g=force?force.g:(sel.r1===sel.r2&&sel.c1===sel.c2)?region(act.r,act.c):Object.assign({},sel);
  if(!g) return toast(T('정렬할 데이터가 없어요'));
  if(!force&&((sel.c1===0&&sel.c2===sh.cols-1)||(sel.r1===0&&sel.r2===sh.rows-1))){ var rg=region(act.r,act.c);
    if(!rg&&sel.r1===0&&sel.r2===sh.rows-1){ var top=-1; for(var k0 in sh.cells){ var rc0=E.RC(k0), x0=sh.cells[k0]; if(rc0[1]===act.c&&x0.v!=null&&x0.v!==''&&(top<0||rc0[0]<top)) top=rc0[0]; } if(top>=0) rg=region(top,act.c); } // a whole column picked from its header: the table in that column
    if(rg) g=rg; else return toast(T('정렬할 데이터가 없어요')); }
  var start=g.r1+(force?(force.hdr?1:0):(hasHeader(g)?1:0)); if(start>=g.r2) return;
  if(guard(g)) return;
  pushUndo(); var key=force?force.key:act.c, si=doc.active, rows=[];
  for(var r=start;r<=g.r2;r++){ var row=[]; for(var c=g.c1;c<=g.c2;c++) row.push(sh.cells[K(r,c)]||null); rows.push({row:row,v:eng.value(si,r,key),r:r}); }
  rows.sort(function(a,b){ var ea=a.v==null||a.v==='', eb=b.v==null||b.v===''; if(ea||eb) return ea===eb?0:ea?1:-1; var x=E.cmpVals(a.v,b.v); return asc?x:-x; });
  rows.forEach(function(o,i){ o.row.forEach(function(x,j){ var k=K(start+i,g.c1+j); if(!x){ delete sh.cells[k]; return; }
    if(x.v!=null&&String(x.v)[0]==='='&&o.r!==start+i){ x=JSON.parse(JSON.stringify(x)); x.v=E.shiftFormula(x.v,start+i-o.r,0); } sh.cells[k]=x; }); });
  changed(); applyFilter(); toast(F('{0}열 기준으로 정렬했어요',E.colName(key)));
}
function addCf(t){
  var g=(sel.r1===sel.r2&&sel.c1===sel.c2)?region(act.r,act.c):Object.assign({},sel);
  if(!g) return toast(T('숫자가 든 범위를 먼저 고르세요'));
  if(g.r2-g.r1>2000) g.r2=g.r1+2000;
  pushUndo(); sh.cfs=sh.cfs.filter(function(f){ return !(f.r1===g.r1&&f.c1===g.c1&&f.r2===g.r2&&f.c2===g.c2); });
  sh.cfs.push({r1:g.r1,c1:g.c1,r2:g.r2,c2:g.c2,t:t}); changed(); toast(t==='scale'?T('색 단계를 넣었어요'):T('데이터 막대를 넣었어요'));
}

/* ---------- rows and columns ---------- */
function structural(isRow,at,count){
  // move cells on the active sheet, fix formulas everywhere
  var si=doc.active, name=sh.name, cells={};
  for(var k in sh.cells){ var rc=E.RC(k), r=rc[0], c=rc[1], x=isRow?r:c;
    if(count>0){ if(x>=at) x+=count; } else { if(x>=at&&x<at-count) continue; if(x>=at-count) x+=count; }
    cells[isRow?K(x,c):K(r,x)]=sh.cells[k]; }
  sh.cells=cells;
  doc.names.forEach(function(n){ n.ref=E.adjustFormula('='+n.ref,'',name,isRow,at,count).slice(1); });
  doc.sheets.forEach(function(s){ if(s.pv) s.pv.ref=E.adjustFormula('='+s.pv.ref,'',name,isRow,at,count).slice(1); });
  doc.sheets.forEach(function(s){ for(var k in s.cells){ var cl=s.cells[k]; if(cl.v&&String(cl.v)[0]==='=') cl.v=E.adjustFormula(cl.v,s.name,name,isRow,at,count); } });
  if(!isRow){ var cwn={}; for(var c in sh.cw){ var x=+c; if(count>0){ if(x>=at) x+=count; } else { if(x>=at&&x<at-count) continue; if(x>=at-count) x+=count; } cwn[x]=sh.cw[c]; } sh.cw=cwn; }
  function adj(o){ var a=isRow?'r1':'c1', b=isRow?'r2':'c2';
    if(count>0){ if(o[a]>=at) o[a]+=count; if(o[b]>=at) o[b]+=count; return true; }
    var d=-count, e=at+d-1; if(o[b]<at) return true; if(o[a]>e){ o[a]-=d; o[b]-=d; return true; }
    var na=o[a]<at?o[a]:at, nb=o[b]>e?o[b]-d:at-1; if(nb<na) return false; o[a]=na; o[b]=nb; return true; }
  if(!isRow) sh.cfs=sh.cfs.filter(function(f){ if(f.t!=='spark') return true; var x=f.dc, d=-count; if(count>0){ if(x>=at) x+=count; } else { if(x>=at&&x<at+d) return false; if(x>=at+d) x-=d; } f.dc=x; return true; });
  sh.cfs=sh.cfs.filter(adj); sh.dv=sh.dv.filter(adj); sh.charts=sh.charts.filter(adj); sh.merges=sh.merges.filter(adj).filter(function(m){ return m.r2>m.r1||m.c2>m.c1; });
  if(sh.flt){ var ft=sh.flt; if(adj(ft)&&ft.r2>ft.r1){ var nh={}; for(var hc in ft.h){ var hx=+hc; if(!isRow){ if(count>0){ if(hx>=at) hx+=count; } else { if(hx>=at&&hx<at-count) continue; if(hx>=at-count) hx+=count; } } nh[hx]=ft.h[hc]; } ft.h=nh; } else sh.flt=null; }
  if(!isRow) sh.charts.forEach(function(ch){ if(!ch.cols) return; // picked series columns move with the columns too
    ch.cols=ch.cols.map(function(x){ if(count>0) return x>=at?x+count:x; return x>=at&&x<at-count?-1:x>=at-count?x+count:x; }).filter(function(x){ return x>=0; });
    if(!ch.cols.length) delete ch.cols; });
  if(isRow) sh.rows=Math.max(10,Math.min(MAXR,sh.rows+count)); else sh.cols=Math.max(5,Math.min(MAXC,sh.cols+count));
  buildGrid();
}
var mctx=null;
function fitCols(c1,c2){
  pushUndo(); var cv=mctx||(mctx=document.createElement('canvas').getContext('2d')), si=doc.active;
  for(var c=c1;c<=c2;c++){ var w=0;
    for(var k in sh.cells){ var rc=E.RC(k); if(rc[1]!==c) continue; var cell=sh.cells[k], v=eng.value(si,rc[0],c); if(v==null||v==='') continue;
      cv.font=(cell.b?'700 ':'')+'13.5px "Noto Sans KR",sans-serif'; var t=cell.cb?'0000':E.formatValue(v,cell.nf); w=Math.max(w,cv.measureText(t).width); }
    if(w>0) sh.cw[c]=Math.max(40,Math.min(420,Math.ceil(w+22))); else delete sh.cw[c]; }
  buildGrid(); overlay(); saveSoon(); toast(T('열 너비를 맞췄어요'));
}
function rowCmd(n){
  commitEdit(); closeMenus();
  if(/^(ins|del)/.test(n)&&sh.lock){ toast(T('잠금이 있는 시트에서는 행·열을 넣거나 지울 수 없어요')); return; }
  pushUndo();
  var nr=sel.r2-sel.r1+1, nc=sel.c2-sel.c1+1;
  if(n==='insRowA') structural(true,sel.r1,nr);
  else if(n==='insRowB') structural(true,sel.r2+1,nr);
  else if(n==='delRow') structural(true,sel.r1,-nr);
  else if(n==='insColL') structural(false,sel.c1,nc);
  else if(n==='insColR') structural(false,sel.c2+1,nc);
  else if(n==='delCol') structural(false,sel.c1,-nc);
  else if(n==='fitCol'){ fitCols(sel.c1,sel.c2); return; }
  else if(n==='fzRow'){ sh.fr=act.r+1; buildGrid(); toast(F('{0}행까지 고정했어요',act.r+1)); }
  else if(n==='fzCol'){ sh.fc=act.c+1; buildGrid(); toast(F('{0}열까지 고정했어요',E.colName(act.c))); }
  else if(n==='fzTop'){ sh.fr=1; buildGrid(); toast(F('{0}행까지 고정했어요',1)); }
  else if(n==='fzLeft'){ sh.fc=1; buildGrid(); toast(F('{0}열까지 고정했어요','A')); }
  else if(n==='fzBoth'){ sh.fr=1; sh.fc=1; buildGrid(); toast(F('{0}행과 {1}열까지 고정했어요',1,'A')); }
  else if(n==='fzOff'){ sh.fr=0; sh.fc=0; buildGrid(); toast(T('고정을 풀었어요')); }
  else if(n==='fzHere'){ if(!act.r&&!act.c){ toast(T('A1이 아닌 칸을 고르세요. 그 칸의 위쪽 행과 왼쪽 열이 고정돼요')); return; } sh.fr=act.r; sh.fc=act.c; buildGrid();
    toast(act.r&&act.c?F('{0}행과 {1}열까지 고정했어요',act.r,E.colName(act.c-1)):act.r?F('{0}행까지 고정했어요',act.r):F('{0}열까지 고정했어요',E.colName(act.c-1))); }
  else if(n==='unmerge'){ var gm=sel; sh.merges=sh.merges.filter(function(m){ return m.r2<gm.r1||m.r1>gm.r2||m.c2<gm.c1||m.c1>gm.c2; }); buildGrid(); toast(T('병합을 풀었어요')); }
  else if(n==='clearCf'){ var g=sel; sh.cfs=sh.cfs.filter(function(f){ return f.r2<g.r1||f.r1>g.r2||f.c2<g.c1||f.c1>g.c2; }); }
  sel={r1:Math.min(sel.r1,sh.rows-1),c1:Math.min(sel.c1,sh.cols-1),r2:Math.min(sel.r2,sh.rows-1),c2:Math.min(sel.c2,sh.cols-1)}; act={r:sel.r1,c:sel.c1};
  changed();
}
$('fzMenu').addEventListener('click',function(e){ var b=e.target.closest('[data-r]'); if(b) rowCmd(b.dataset.r); });
/* table style presets: header row h/hf + two banded row colors b1/b2 (f = text color, kept dark on the light bands) */
var TSTY={blue:{h:'#2f6fdb',hf:'#ffffff',b1:'#e6eefc',b2:'#ffffff',f:'#1a1a1a'}, green:{h:'#2e9e5e',hf:'#ffffff',b1:'#e4f5ea',b2:'#ffffff',f:'#1a1a1a'},
  orange:{h:'#e8832a',hf:'#ffffff',b1:'#fdeede',b2:'#ffffff',f:'#1a1a1a'}, gray:{h:'#4a5160',hf:'#ffffff',b1:'#eceef2',b2:'#ffffff',f:'#1a1a1a'},
  dark:{h:'#ffc93c',hf:'#1c1405',b1:'#1d2230',b2:'#151925'}, head:{h:'#2f6fdb',hf:'#ffffff'}};
function tableStyle(id){
  commitEdit(); closeMenus();
  var g=sel; if(g.r1===g.r2&&g.c1===g.c2) g=region(act.r,act.c)||g;
  if(g.r1===g.r2&&g.c1===g.c2&&id!=='off'){ var x0=sh.cells[K(g.r1,g.c1)]; if(!x0||x0.v==null||x0.v==='') return toast(T('표 스타일을 입힐 범위를 먼저 고르세요')); }
  if(guard(g)) return; pushUndo();
  var p=TSTY[id], hd=p&&g.r2>g.r1||p&&id==='head';
  for(var r=g.r1;r<=g.r2;r++) for(var c=g.c1;c<=g.c2;c++){
    var k=K(r,c), x=sh.cells[k]||(sh.cells[k]={});
    delete x.bg; delete x.fc; delete x.b;
    if(p){ if(r===g.r1&&hd){ x.bg=p.h; x.fc=p.hf; x.b=1; } else if(p.b1){ var odd=(r-g.r1-(hd?1:0))%2===0; x.bg=odd?p.b1:p.b2; if(p.f) x.fc=p.f; } }
    if(x.v==null&&!hasFmt(x)) delete sh.cells[k];
  }
  changed(); toast(p?T('표 스타일을 입혔어요'):T('표 스타일을 지웠어요'));
}
$('tsMenu').addEventListener('click',function(e){ var b=e.target.closest('[data-ts]'); if(b) tableStyle(b.dataset.ts); });
$('rowMenu').addEventListener('click',function(e){ var b=e.target.closest('[data-r]'); if(!b) return; var r=b.dataset.r;
  if(r==='sortA'||r==='sortD'||r==='filter'){ closeMenus(); return cmd(r); }
  if(r==='clr'){ closeMenus(); commitEdit(); return clearSel(); }
  rowCmd(r); });
$('addRows').onclick=function(){ commitEdit(); if(sh.rows>=MAXR) return; sh.rows=Math.min(MAXR,sh.rows+50); buildGrid(); overlay(); saveSoon(); };
$('addCols').onclick=function(){ commitEdit(); if(sh.cols>=MAXC) return; sh.cols=Math.min(MAXC,sh.cols+10); buildGrid(); overlay(); saveSoon(); };

/* ---------- sheets ---------- */
function switchSheet(i,rebuild){
  commitEdit(); doc.active=i; sh=doc.sheets[i];
  sel={r1:0,c1:0,r2:0,c2:0}; act={r:0,c:0}; anchor={r:0,c:0}; lastExt={r:0,c:0};
  buildGrid(); renderTabs(); overlay(); updateBar(); wrap.scrollTop=0; wrap.scrollLeft=0;
  if($('drawer').classList.contains('open')) renderCharts();
}
function renderTabs(){
  var t=$('tabs'); t.innerHTML='';
  doc.sheets.forEach(function(s,i){ var d=document.createElement('div'); d.className='tab'+(i===doc.active?' on':''); d.textContent=(s.lock&&s.lock.all?'🔒 ':'')+s.name; d.setAttribute('data-notr','');
    d.onclick=function(){ if(i===doc.active) openMenu($('tabMenu'),d,true); else { switchSheet(i); saveSoon(); } }; t.appendChild(d); });
}
function uniqueName(base){ var n=1, names=doc.sheets.map(function(s){ return s.name; }); while(names.indexOf(base+n)>=0) n++; return base+n; }
$('addTab').onclick=function(){ commitEdit(); pushUndo(); doc.sheets.push(newSheet(uniqueName(T('시트')))); switchSheet(doc.sheets.length-1); saveSoon(); };
$('tabMenu').addEventListener('click',function(e){
  var b=e.target.closest('[data-t]'); if(!b) return; closeMenus(); tabCmd(b.dataset.t); });
function tabCmd(t){
  var i=doc.active; commitEdit();
  if(t==='rename') ask(T('시트 이름 바꾸기'),'',sh.name).then(function(v){ v=(v||'').trim().replace(/[\[\]:*?\/\\]/g,'').slice(0,31); if(!v||v===sh.name) return;
      if(doc.sheets.some(function(s){ return s.name===v; })) return toast(T('같은 이름의 시트가 있어요'));
      pushUndo(); var old=sh.name; doc.sheets.forEach(function(s){ for(var k in s.cells){ var c=s.cells[k]; if(c.v&&String(c.v)[0]==='=') c.v=E.renameSheetInFormula(c.v,old,v); } });
      doc.names.forEach(function(n){ n.ref=E.renameSheetInFormula('='+n.ref,old,v).slice(1); });
      doc.sheets.forEach(function(s){ if(s.pv) s.pv.ref=E.renameSheetInFormula('='+s.pv.ref,old,v).slice(1); });
      sh.name=v; renderTabs(); changed(); });
  else if(t==='pvr') pvRefresh();
  else if(t==='dup'){ pushUndo(); var c=JSON.parse(JSON.stringify(sh)); c.name=uniqueName(sh.name+' '); doc.sheets.splice(i+1,0,c); switchSheet(i+1); saveSoon(); }
  else if(t==='left'&&i>0){ pushUndo(); doc.sheets.splice(i-1,0,doc.sheets.splice(i,1)[0]); doc.active=i-1; renderTabs(); changed(); }
  else if(t==='right'&&i<doc.sheets.length-1){ pushUndo(); doc.sheets.splice(i+1,0,doc.sheets.splice(i,1)[0]); doc.active=i+1; renderTabs(); changed(); }
  else if(t==='del'){ if(doc.sheets.length<2) return toast(T('시트가 하나뿐이에요'));
    confirmDlg(F('"{0}" 시트를 지울까요?',sh.name)).then(function(ok){ if(!ok) return; pushUndo(); doc.sheets.splice(i,1); eng=new E.Engine(doc); switchSheet(Math.max(0,i-1)); saveSoon(); }); }
}

/* ---------- menus & dialogs ---------- */
function openMenu(m,anchorEl,up){
  var was=m.classList.contains('open'); closeMenus(); if(was) return;
  m.classList.add('open'); var r=anchorEl.getBoundingClientRect(), w=m.offsetWidth, h=m.offsetHeight;
  var x=Math.min(Math.max(8,r.left),innerWidth-w-8), y=up?r.top-h-6:r.bottom+6; if(y+h>innerHeight-8) y=Math.max(8,r.top-h-6); if(y<8) y=8;
  m.style.left=x+'px'; m.style.top=y+'px';
}
function closeMenus(){ document.querySelectorAll('.menu.open').forEach(function(m){ m.classList.remove('open'); }); }
document.addEventListener('pointerdown',function(e){ if(!e.target.closest('.menu')&&!e.target.closest('#fileBtn,.tab')) closeMenus(); },true);
function openDlg(id,focusEl){ commitEdit(); $(id).classList.add('open'); if(focusEl) setTimeout(function(){ focusEl.focus(); },30); }
function closeDlgs(){ document.querySelectorAll('.ov.open').forEach(function(o){ if(o.id==='aiDlg') return; o.classList.remove('open'); if(o.id==='askDlg'&&askRes){ var f=askRes; askRes=null; f(null); } }); overlay(); }
document.querySelectorAll('.ov').forEach(function(o){ o.addEventListener('click',function(e){ if(o.id==='aiDlg') return; if(e.target===o||e.target.closest('[data-close]')) closeDlgs(); }); });
var askRes=null;
function ask(title,text,val,noInput){
  return new Promise(function(res){ $('askT').textContent=title; $('askP').textContent=text||''; $('askP').style.display=text?'':'none';
    var i=$('askI'); i.style.display=noInput?'none':''; i.value=val||''; askRes=res; openDlg('askDlg',noInput?null:i); if(!noInput) setTimeout(function(){ i.select(); },40); });
}
function confirmDlg(text){ return ask(T('확인'),text,'',true).then(function(v){ return v!==null; }); }
$('askOk').onclick=function(){ var f=askRes; askRes=null; $('askDlg').classList.remove('open'); if(f) f($('askI').value); overlay(); };
$('askI').addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); $('askOk').click(); } });
var tt=null; function toast(s){ var t=$('toast'); t.textContent=s; t.classList.add('on'); clearTimeout(tt); tt=setTimeout(function(){ t.classList.remove('on'); },1800); }

/* ---------- functions dialog ---------- */
var FNDOC=window.FNDOC||[];
function openFn(){
  var wasEditing=!!editing; fnTarget=wasEditing;
  $('fnDlg').classList.add('open'); $('fnSearch').value=''; drawFns(''); if(mouseMode) setTimeout(function(){ $('fnSearch').focus(); },30);
}
var fnTarget=false;
function drawFns(q){
  q=q.trim().toLowerCase(); var h='', cat=null;
  FNDOC.forEach(function(f){ var desc=FFT.lang==='ko'?f[3]:f[4];
    if(q&&f[1].toLowerCase().indexOf(q)<0&&f[3].toLowerCase().indexOf(q)<0&&String(f[4]).toLowerCase().indexOf(q)<0) return;
    if(f[0]!==cat){ cat=f[0]; h+='<div class="fnCat">'+T(cat)+'</div>'; }
    h+='<button class="fn" data-fn="'+f[1]+'" data-notr><code>'+f[2].replace(/</g,'&lt;')+'</code><span>'+desc+'</span></button>'; });
  $('fnList').innerHTML=h||'<div class="empty">'+T('찾는 함수가 없어요')+'</div>';
}
$('fnSearch').addEventListener('input',function(){ drawFns(this.value); });
$('fnList').addEventListener('click',function(e){ var b=e.target.closest('[data-fn]'); if(!b) return; $('fnDlg').classList.remove('open');
  var n=b.dataset.fn+'(';
  if(editing){ var inp=edInput(); if(inp.value==='') inp.value='='; else if(inp.value[0]!=='='){ inp.value='='+inp.value; } insertAtCaret(n); }
  else startEdit('='+n,true);
});

/* ---------- find & replace ---------- */
/* options: scope 이 시트 / 선택 범위 (the box picked when the dialog opened) / 모든 시트, match case. Cells are visited sheet by sheet, row by row. */
var fBox=null;
function fOpts(){ return {q:$('fFind').value, cs:$('fCase').checked, sc:$('fScope').value}; }
function fOpen(){
  var multi=!(sel.r1===sel.r2&&sel.c1===sel.c2); fBox=multi?Object.assign({},sel):null;
  $('fScope').querySelector('option[value="sel"]').disabled=!multi; $('fScope').value=multi?'sel':'sheet'; $('fSelRg').textContent=multi?E.rangeStr(sel):'';
  openDlg('findDlg',$('fFind'));
}
function fList(o){
  var out=[], sis=o.sc==='all'?doc.sheets.map(function(_,i){ return i; }):[doc.active];
  sis.forEach(function(si){ var cs=doc.sheets[si].cells; Object.keys(cs).map(Number).sort(function(a,b){ return a-b; }).forEach(function(k){
    if(o.sc==='sel'&&fBox){ var rc=E.RC(k); if(rc[0]<fBox.r1||rc[0]>fBox.r2||rc[1]<fBox.c1||rc[1]>fBox.c2) return; } out.push([si,k]); }); });
  return out;
}
function fHas(hay,o){ return o.cs?hay.indexOf(o.q)>=0:hay.toLowerCase().indexOf(o.q.toLowerCase())>=0; }
function fCellHit(si,k,o){ var c=doc.sheets[si].cells[k], rc=E.RC(k); return fHas(E.formatValue(eng.value(si,rc[0],rc[1]),c.nf)+'\u0000'+(c.v||''),o); }
function findNext(){
  var o=fOpts(); if(!o.q) return; var list=fList(o), hit=null, cur=[doc.active,K(act.r,act.c)];
  for(var i=0;i<list.length&&!hit;i++){ var x=list[i]; if((x[0]>cur[0]||(x[0]===cur[0]&&x[1]>cur[1]))&&fCellHit(x[0],x[1],o)) hit=x; }
  for(i=0;i<list.length&&!hit;i++) if(fCellHit(list[i][0],list[i][1],o)) hit=list[i];
  if(!hit) return toast(T('찾는 내용이 없어요'));
  if(hit[0]!==doc.active){ switchSheet(hit[0]); saveSoon(); }
  var rc=E.RC(hit[1]); select(rc[0],rc[1]);
}
function escRe(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
function fReplace(c,o){ var re=new RegExp(escRe(o.q),o.cs?'g':'gi'); if(!c.v||!re.test(String(c.v))) return false; re.lastIndex=0; c.v=String(c.v).replace(re,function(){ return $('fRep').value; }); return true; }
$('fNext').onclick=findNext;
$('fOne').onclick=function(){ var o=fOpts(); if(!o.q) return; var c=sh.cells[K(act.r,act.c)];
  if(c&&c.v&&fHas(String(c.v),o)&&(o.sc!=='sel'||!fBox||(act.r>=fBox.r1&&act.r<=fBox.r2&&act.c>=fBox.c1&&act.c<=fBox.c2))){ if(guard(cellBox(act.r,act.c))) return; pushUndo(); fReplace(c,o); changed(); } findNext(); };
$('fAll').onclick=function(){ var o=fOpts(); if(!o.q) return; var n=0, skip=0, list=fList(o); pushUndo();
  list.forEach(function(x){ var s=doc.sheets[x[0]], c=s.cells[x[1]], rc=E.RC(x[1]); if(!c||!c.v||!fHas(String(c.v),o)) return; if(E.lockHit(s.lock,rc[0],rc[1])){ skip++; return; } if(fReplace(c,o)) n++; });
  changed(); toast(F('{0}칸을 바꿨어요',n)+(skip?' · '+F('잠긴 {0}칸은 건너뛰었어요',skip):'')); };
$('fFind').addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); findNext(); } });

/* ---------- charts ---------- */
var PAL=['#ffc93c','#ff8a3d','#4fd0ff','#ff5d8f','#3fe08f','#a78bfa','#5b8cff','#f0f3f8'];
function openDrawer(){ commitEdit(); $('drawer').classList.add('open'); renderCharts(); setTimeout(overlay,0); }
$('closeDrawer').onclick=function(){ $('drawer').classList.remove('open'); };
$('addChart').onclick=function(){ addChart(); };
function addChart(){
  var g=(sel.r1===sel.r2&&sel.c1===sel.c2)?region(act.r,act.c):Object.assign({},sel);
  if(!g) return toast(T('차트로 만들 범위를 먼저 고르세요'));
  if(g.r1===0&&g.r2===sh.rows-1||g.c1===0&&g.c2===sh.cols-1){ var rg=region(act.r,act.c); if(rg) g=rg; }
  pushUndo(); sh.charts.push({id:uid(),r1:g.r1,c1:g.c1,r2:Math.min(g.r2,g.r1+500),c2:Math.min(g.c2,g.c1+20),type:'bar',title:''}); saveSoon(); renderCharts();
  var body=$('charts'); body.scrollTop=body.scrollHeight;
}
function chartData(ch,si0){
  var si=si0==null?doc.active:si0, v=function(r,c){ return eng.value(si,r,c); };
  var hdr=false, lab=false, r, c;
  if(ch.r2>ch.r1) for(c=ch.c1+(ch.c2>ch.c1?1:0);c<=ch.c2;c++){ var x=v(ch.r1,c); if(typeof x==='string'&&x!=='') hdr=true; }
  var lc=ch.c1, r0=ch.r1+(hdr?1:0);
  function textCol(c){ var t=0,n=0; for(var r=r0;r<=ch.r2;r++){ var y=v(r,c); if(typeof y==='string'&&y!=='') t++; else if(typeof y==='number') n++; } return t>0&&t>=n; }
  if(ch.c2>ch.c1&&textCol(ch.c1)){ lab=true; while(lc+1<ch.c2&&textCol(lc+1)) lc++; } // label = the last of the leading text columns
  var c0=lab?lc+1:ch.c1, labels=[], series=[];
  for(r=r0;r<=ch.r2;r++) labels.push(lab?E.formatValue(v(r,lc)):String(r-r0+1));
  for(c=c0;c<=ch.c2;c++){ if(ch.cols&&ch.cols.indexOf(c)<0) continue; var vals=[]; for(r=r0;r<=ch.r2;r++){ var z=v(r,c); vals.push(typeof z==='number'?z:(typeof z==='boolean'?(z?1:0):null)); }
    if(vals.some(function(x){ return x!=null; })) series.push({name:hdr?E.formatValue(v(ch.r1,c)):F('계열 {0}',c-c0+1),vals:vals,col:c}); }
  return {labels:labels,series:series,hdr:hdr,r0:r0,lc:lab?lc:-1};
}
function niceStep(range){ var e=Math.pow(10,Math.floor(Math.log10(range||1))), f=range/e; return (f<=1?1:f<=2?2:f<=5?5:10)*e; }
function drawChart(cv,ch){
  var dpr=Math.min(3,window.devicePixelRatio||1), W=cv.clientWidth||320, H=cv.clientHeight||220;
  cv.width=W*dpr; cv.height=H*dpr; var g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0);
  g.fillStyle='#08090d'; g.fillRect(0,0,W,H);
  var d=chartData(ch), font='12px "Noto Sans KR",sans-serif'; g.font=font; g.textBaseline='middle';
  if(ch.type==='dual'&&d.series.length<2) ch=Object.assign({},ch,{type:'bar'}); // two axes need at least two series
  var top=ch.title?30:12;
  if(ch.title){ g.fillStyle='#eef0f5'; g.font='600 14px "Noto Sans KR",sans-serif'; g.textAlign='center'; g.fillText(ch.title,W/2,15); g.font=font; }
  if(!d.series.length||!d.labels.length){ g.fillStyle='#8a93a6'; g.textAlign='center'; g.fillText(T('숫자 데이터가 없어요'),W/2,H/2); return; }
  // legend
  var lg=(ch.type==='scatter'?d.series.length>2:d.series.length>1)||ch.type==='pie', lx=10, ly=H-12;
  var items=ch.type==='pie'?d.labels:(ch.type==='scatter'&&d.series.length>1?d.series.slice(1):d.series).map(function(s,i){ return ch.type==='dual'?s.name+(i?' ▶':' ◀'):s.name; });
  if(lg){ g.textAlign='left'; items.slice(0,12).forEach(function(n,i){ var w=g.measureText(n).width+26; if(lx+w>W-6){ lx=10; ly-=18; } g.fillStyle=PAL[i%PAL.length]; g.fillRect(lx,ly-5,10,10); g.fillStyle='#b8bfcc'; g.fillText(n,lx+14,ly); lx+=w; }); }
  var bottom=lg?(H-ly)+16:8;
  if(ch.type==='pie'){
    var vals=d.series[0].vals.map(function(x){ return x>0?x:0; }), tot=vals.reduce(function(a,b){ return a+b; },0);
    if(!tot){ g.fillStyle='#8a93a6'; g.textAlign='center'; g.fillText(T('숫자 데이터가 없어요'),W/2,H/2); return; }
    var cx=W/2, cy=top+(H-top-bottom)/2, R=Math.max(10,Math.min(W/2-20,(H-top-bottom)/2-6)), a=-Math.PI/2;
    vals.forEach(function(x,i){ var s=x/tot*Math.PI*2; g.beginPath(); g.moveTo(cx,cy); g.arc(cx,cy,R,a,a+s); g.closePath(); g.fillStyle=PAL[i%PAL.length]; g.fill(); g.strokeStyle='#08090d'; g.lineWidth=2; g.stroke();
      if(x/tot>.05){ var m=a+s/2; g.fillStyle='#14161d'; g.textAlign='center'; g.font='700 12px "Noto Sans KR",sans-serif'; g.fillText(Math.round(x/tot*100)+'%',cx+Math.cos(m)*R*.66,cy+Math.sin(m)*R*.66); g.font=font; }
      a+=s; });
    return;
  }
  if(ch.type==='scatter'){ drawScatter(g,d,W,H,top,bottom,font); return; }
  if(ch.type==='dual'){ drawDual(g,d,W,H,top,bottom); return; }
  var all=[]; d.series.forEach(function(s){ s.vals.forEach(function(x){ if(x!=null) all.push(x); }); });
  if(!all.length){ g.fillStyle='#8a93a6'; g.textAlign='center'; g.fillText(T('숫자 데이터가 없어요'),W/2,H/2); return; }
  var mn=Math.min(0,Math.min.apply(null,all)), mx=Math.max(0,Math.max.apply(null,all)); if(mn===mx) mx=mn+1;
  var st=niceStep((mx-mn)/4); mn=Math.floor(mn/st)*st; mx=Math.ceil(mx/st)*st;
  var horiz=ch.type==='hbar';
  var labW=horiz?Math.min(110,Math.max.apply(null,d.labels.map(function(l){ return g.measureText(l).width; }))+12):0;
  var ticks=[]; for(var t=mn;t<=mx+st/2;t+=st) ticks.push(+t.toPrecision(10));
  var tw=horiz?0:Math.max.apply(null,ticks.map(function(t){ return g.measureText(E.fmtGeneral(t)).width; }))+10;
  var X0=10+Math.max(tw,labW), X1=W-12, Y0=top+4, Y1=H-bottom-(horiz?18:20);
  g.strokeStyle='#1f2533'; g.lineWidth=1; g.fillStyle='#8a93a6';
  ticks.forEach(function(t){ var p; if(horiz){ p=X0+(t-mn)/(mx-mn)*(X1-X0); g.beginPath(); g.moveTo(p,Y0); g.lineTo(p,Y1); g.stroke(); g.textAlign='center'; g.fillText(E.fmtGeneral(t),p,Y1+10); }
    else { p=Y1-(t-mn)/(mx-mn)*(Y1-Y0); g.beginPath(); g.moveTo(X0,p); g.lineTo(X1,p); g.stroke(); g.textAlign='right'; g.fillText(E.fmtGeneral(t),X0-6,p); } });
  var n=d.labels.length, ns=d.series.length;
  if(horiz){
    var band=(Y1-Y0)/n, bh=Math.max(1,band*.75/ns), zx=X0+(0-mn)/(mx-mn)*(X1-X0);
    d.labels.forEach(function(l,i){ g.fillStyle='#b8bfcc'; g.textAlign='right'; g.fillText(l.length>14?l.slice(0,13)+'…':l,X0-6,Y0+band*(i+.5)); });
    d.series.forEach(function(s,j){ g.fillStyle=PAL[j%PAL.length]; s.vals.forEach(function(x,i){ if(x==null) return; var p=X0+(x-mn)/(mx-mn)*(X1-X0), y=Y0+band*i+band*.125+bh*j; g.fillRect(Math.min(p,zx),y,Math.abs(p-zx),bh-1); }); });
    return;
  }
  var bw=(X1-X0)/n, zy=Y1-(0-mn)/(mx-mn)*(Y1-Y0), every=Math.ceil(n/Math.max(1,Math.floor((X1-X0)/48)));
  g.fillStyle='#b8bfcc'; g.textAlign='center';
  d.labels.forEach(function(l,i){ if(i%every) return; g.fillText(l.length>8?l.slice(0,7)+'…':l,X0+bw*(i+.5),Y1+11); });
  if(ch.type==='line'){
    d.series.forEach(function(s,j){ g.strokeStyle=PAL[j%PAL.length]; g.fillStyle=PAL[j%PAL.length]; g.lineWidth=2.4; g.beginPath(); var on=false;
      s.vals.forEach(function(x,i){ if(x==null){ on=false; return; } var px=X0+bw*(i+.5), py=Y1-(x-mn)/(mx-mn)*(Y1-Y0); if(on) g.lineTo(px,py); else g.moveTo(px,py); on=true; }); g.stroke();
      if(n<=40) s.vals.forEach(function(x,i){ if(x==null) return; g.beginPath(); g.arc(X0+bw*(i+.5),Y1-(x-mn)/(mx-mn)*(Y1-Y0),3,0,7); g.fill(); }); });
  } else {
    var w2=Math.max(1,bw*.75/ns);
    d.series.forEach(function(s,j){ g.fillStyle=PAL[j%PAL.length]; s.vals.forEach(function(x,i){ if(x==null) return; var py=Y1-(x-mn)/(mx-mn)*(Y1-Y0), px=X0+bw*i+bw*.125+w2*j; g.fillRect(px,Math.min(py,zy),w2-1,Math.max(1,Math.abs(py-zy))); }); });
  }
}
/* two axes: the first series is drawn as bars on the left axis, the others as lines on the right axis */
function drawDual(g,d,W,H,top,bottom){
  var bars=d.series[0], lines=d.series.slice(1), n=d.labels.length;
  function scale(vals){ var a=vals.filter(function(x){ return x!=null; }); if(!a.length) a=[0,1]; var mn=Math.min(0,Math.min.apply(null,a)), mx=Math.max(0,Math.max.apply(null,a)); if(mn===mx) mx=mn+1; var st=niceStep((mx-mn)/4); return {mn:Math.floor(mn/st)*st,mx:Math.ceil(mx/st)*st,st:st}; }
  var lv=[]; lines.forEach(function(s){ lv=lv.concat(s.vals); });
  var A=scale(bars.vals), B=scale(lv), ta=[], tb=[], t;
  for(t=A.mn;t<=A.mx+A.st/2;t+=A.st) ta.push(+t.toPrecision(10)); for(t=B.mn;t<=B.mx+B.st/2;t+=B.st) tb.push(+t.toPrecision(10));
  var wA=Math.max.apply(null,ta.map(function(t){ return g.measureText(E.fmtGeneral(t)).width; }))+10, wB=Math.max.apply(null,tb.map(function(t){ return g.measureText(E.fmtGeneral(t)).width; }))+10;
  var X0=10+wA, X1=W-10-wB, Y0=top+4, Y1=H-bottom-20, bw=(X1-X0)/n, every=Math.ceil(n/Math.max(1,Math.floor((X1-X0)/48)));
  var ya=function(v){ return Y1-(v-A.mn)/(A.mx-A.mn)*(Y1-Y0); }, yb=function(v){ return Y1-(v-B.mn)/(B.mx-B.mn)*(Y1-Y0); };
  g.strokeStyle='#1f2533'; g.lineWidth=1;
  ta.forEach(function(t){ var p=ya(t); g.beginPath(); g.moveTo(X0,p); g.lineTo(X1,p); g.stroke(); g.fillStyle=PAL[0]; g.textAlign='right'; g.fillText(E.fmtGeneral(t),X0-6,p); });
  tb.forEach(function(t){ g.fillStyle=PAL[1]; g.textAlign='left'; g.fillText(E.fmtGeneral(t),X1+6,yb(t)); });
  g.fillStyle='#b8bfcc'; g.textAlign='center'; d.labels.forEach(function(l,i){ if(i%every) return; g.fillText(l.length>8?l.slice(0,7)+'…':l,X0+bw*(i+.5),Y1+11); });
  var zy=ya(0), w2=Math.max(1,bw*.6); g.fillStyle=PAL[0];
  bars.vals.forEach(function(x,i){ if(x==null) return; var py=ya(x); g.fillRect(X0+bw*i+(bw-w2)/2,Math.min(py,zy),w2,Math.max(1,Math.abs(py-zy))); });
  lines.forEach(function(s,j){ var col=PAL[(j+1)%PAL.length]; g.strokeStyle=col; g.fillStyle=col; g.lineWidth=2.4; g.beginPath(); var on=false;
    s.vals.forEach(function(x,i){ if(x==null){ on=false; return; } var px=X0+bw*(i+.5), py=yb(x); if(on) g.lineTo(px,py); else g.moveTo(px,py); on=true; }); g.stroke();
    if(n<=40) s.vals.forEach(function(x,i){ if(x==null) return; g.beginPath(); g.arc(X0+bw*(i+.5),yb(x),3,0,7); g.fill(); }); });
}
function drawScatter(g,d,W,H,top,bottom,font){
  // first numeric column is x, the others are y
  var xs=d.series.length>1?d.series[0].vals:d.labels.map(function(_,i){ return i+1; }), ys=d.series.length>1?d.series.slice(1):d.series;
  var px=[], py=[]; ys.forEach(function(s){ s.vals.forEach(function(y,i){ if(y!=null&&xs[i]!=null){ px.push(xs[i]); py.push(y); } }); });
  if(!px.length){ g.fillStyle='#8a93a6'; g.textAlign='center'; g.fillText(T('숫자 데이터가 없어요'),W/2,H/2); return; }
  function rng(a){ var lo=Math.min.apply(null,a), hi=Math.max.apply(null,a); if(lo===hi){ lo-=1; hi+=1; } var st=niceStep((hi-lo)/4); return [Math.floor(lo/st)*st,Math.ceil(hi/st)*st,st]; }
  var rx=rng(px), ry=rng(py), tw=0, t;
  for(t=ry[0];t<=ry[1]+ry[2]/2;t+=ry[2]) tw=Math.max(tw,g.measureText(E.fmtGeneral(+t.toPrecision(10))).width);
  var X0=16+tw, X1=W-14, Y0=top+4, Y1=H-bottom-(d.series.length>1?34:20);
  g.strokeStyle='#1f2533'; g.lineWidth=1; g.fillStyle='#8a93a6';
  for(t=ry[0];t<=ry[1]+ry[2]/2;t+=ry[2]){ var yy=Y1-(t-ry[0])/(ry[1]-ry[0])*(Y1-Y0); g.beginPath(); g.moveTo(X0,yy); g.lineTo(X1,yy); g.stroke(); g.textAlign='right'; g.fillText(E.fmtGeneral(+t.toPrecision(10)),X0-6,yy); }
  for(t=rx[0];t<=rx[1]+rx[2]/2;t+=rx[2]){ var xx=X0+(t-rx[0])/(rx[1]-rx[0])*(X1-X0); g.beginPath(); g.moveTo(xx,Y0); g.lineTo(xx,Y1); g.stroke(); g.textAlign='center'; g.fillText(E.fmtGeneral(+t.toPrecision(10)),xx,Y1+11); }
  if(d.series.length>1){ g.fillStyle='#b8bfcc'; g.textAlign='center'; g.fillText(d.series[0].name,(X0+X1)/2,Y1+27); }
  ys.forEach(function(s,j){ g.fillStyle=PAL[(j+(d.series.length>1?1:0))%PAL.length]; s.vals.forEach(function(y,i){ if(y==null||xs[i]==null) return;
    g.beginPath(); g.arc(X0+(xs[i]-rx[0])/(rx[1]-rx[0])*(X1-X0),Y1-(y-ry[0])/(ry[1]-ry[0])*(Y1-Y0),4.5,0,7); g.fill(); }); });
}
function renderCharts(){
  var body=$('charts'); body.innerHTML='';
  if(!sh.charts.length){ body.innerHTML='<div class="empty">'+T('숫자가 든 표를 고른 뒤')+'<br>'+T('"+ 선택 범위로"를 누르면 차트가 생겨요.')+'<br>'+T('표를 고치면 차트도 바로 바뀌어요.')+'</div>'; return; }
  sh.charts.forEach(function(ch){
    var d=document.createElement('div'); d.className='chart';
    d.innerHTML='<div class="row"><input class="ct" placeholder="차트 제목" data-notr><select data-notr><option value="bar">'+T('세로 막대')+'</option><option value="hbar">'+T('가로 막대')+'</option><option value="line">'+T('꺾은선')+'</option><option value="pie">'+T('원형')+'</option><option value="scatter">'+T('산점도')+'</option><option value="dual">'+T('두 축')+'</option></select></div>'+
      '<canvas></canvas><div class="row" style="margin:8px 0 0"><span class="rg" data-notr></span><span style="flex:1"></span><button class="sm" data-a="rg">'+T('범위를 지금 선택으로')+'</button><button class="sm" data-a="sl">'+T('슬라이드로')+'</button><button class="sm" data-a="png">PNG</button><button class="sm" data-a="del">'+T('지우기')+'</button></div>';
    var ti=d.querySelector('.ct'), sl=d.querySelector('select'), cv=d.querySelector('canvas');
    ti.placeholder=T('차트 제목'); ti.value=ch.title||''; sl.value=ch.type; d.querySelector('.rg').textContent=E.rangeStr(ch);
    ti.oninput=function(){ ch.title=ti.value; drawChart(cv,ch); saveSoon(); };
    sl.onchange=function(){ ch.type=sl.value; drawChart(cv,ch); saveSoon(); };
    d.querySelector('.rg').onclick=function(){ selectRange(ch); };
    d.addEventListener('click',function(e){ var a=e.target.dataset.a; if(!a) return;
      if(a==='del'){ pushUndo(); sh.charts=sh.charts.filter(function(x){ return x!==ch; }); saveSoon(); renderCharts(); }
      if(a==='rg'){ if(sel.r1===sel.r2&&sel.c1===sel.c2) return toast(T('차트로 만들 범위를 먼저 고르세요')); pushUndo(); ch.r1=sel.r1; ch.c1=sel.c1; ch.r2=Math.min(sel.r2,sel.r1+500); ch.c2=Math.min(sel.c2,sel.c1+20); delete ch.cols; saveSoon(); renderCharts(); }
      if(a==='sl') openSlideSend(ch);
      if(a==='png'){ cv.toBlob(function(b){ download(b,(ch.title||doc.name||'chart')+'.png'); }); } });
    body.appendChild(d); drawChart(cv,ch);
  });
}
/* send a chart to Fry Slides: adds a chart slide to a deck saved in this browser (localStorage 'ffslides.v1', the store Slides reads),
   optionally linked to the cells so Slides keeps it in step with this sheet. A slide chart has one series of up to 12 bars. */
var LSS='ffslides.v1', slCh=null;
function slStore(){ var o=null; try{ o=JSON.parse(lsGet(LSS)||'null'); }catch(e){}
  if(Array.isArray(o)) o={v:1,last:null,decks:o}; if(!o||typeof o!=='object'||!Array.isArray(o.decks)) o={v:1,last:null,decks:[]}; return o; }
function slPlan(ch){
  if(ch.type==='scatter'||ch.type==='dual') return {err:T('산점도와 두 축 그래프는 슬라이드로 보낼 수 없어요. 막대, 꺾은선, 원형만 돼요')};
  var d=chartData(ch); if(!d.series.length) return {err:T('숫자가 든 차트만 슬라이드로 보낼 수 있어요')};
  var se=d.series[0], L=[];
  d.labels.forEach(function(l,i){ var v=se.vals[i]; if(v==null) return; L.push(String(l).replace(/[:\n\r]+/g,' ').trim()+': '+(+v.toPrecision(12))); });
  if(!L.length) return {err:T('숫자가 든 차트만 슬라이드로 보낼 수 없어요')};
  var c1=d.lc>=0?d.lc:se.col, r1=d.hdr?ch.r1:d.r0;
  return {data:L.slice(0,12).join('\n'), cut:L.length>12, multi:d.series.length>1, title:ch.title||(d.hdr?se.name:''), ctype:ch.type==='line'?'line':ch.type==='pie'?'pie':'bar',
    rg:E.rangeStr({r1:r1,c1:c1,r2:Math.min(ch.r2,r1+59),c2:se.col})};
}
function openSlideSend(ch){
  var p=slPlan(ch); if(p.err) return toast(p.err); slCh=ch;
  var st=slStore(), sl=$('slDeck'); sl.innerHTML='<option value="">'+T('새 발표 자료')+'</option>';
  st.decks.slice().sort(function(a,b){ return (b.t||0)-(a.t||0); }).forEach(function(d){ var o=document.createElement('option'); o.value=d.id; o.textContent=String(d.name||T('새 발표 자료')); sl.appendChild(o); });
  if(st.last&&st.decks.some(function(d){ return d.id===st.last; })) sl.value=st.last;
  $('slInfo').textContent=(p.multi?T('계열이 여러 개면 첫 계열만 넣어요')+'. ':'')+(p.cut?T('앞의 12개만 넣어요')+'. ':'')+F('{0} 범위가 슬라이드의 그래프가 돼요',p.rg);
  openDlg('slDlg');
}
function sendSlide(go){
  var ch=slCh, p=ch&&slPlan(ch); if(!p||p.err) return; saveNow();
  var st=slStore(), id=$('slDeck').value, d=null; st.decks.forEach(function(x){ if(x.id===id) d=x; });
  if(!d){ d={id:uid(),name:doc.name||T('새 발표 자료'),theme:'light',slides:[],t:Date.now(),topic:'',aud:'',n:8,nums:false,footer:'',font:'',trans:'fade'}; st.decks.unshift(d); }
  var s={id:uid(),layout:'chart',title:p.title,data:p.data,ctype:p.ctype}; if($('slLink').checked) s.link={doc:docId,sh:sh.name,rg:p.rg,dn:doc.name||''};
  d.slides.push(s); d.t=Date.now(); st.last=d.id;
  if(!lsSet(LSS,JSON.stringify(st))) return toast(T('저장 공간이 부족해서 슬라이드에 넣지 못했어요'));
  closeDlgs(); if(go) location.href='../slides/index.html'; else toast(F('"{0}"에 슬라이드를 넣었어요',d.name));
}
$('slOk').onclick=function(){ sendSlide(false); }; $('slOpen').onclick=function(){ sendSlide(true); };
window.addEventListener('resize',function(){ if($('drawer').classList.contains('open')) renderCharts(); overlay(); });

/* ---------- files ---------- */
function download(blob,name){ var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name.replace(/[\\/:*?"<>|]/g,'_'); document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },4000); }
var xlsxP=null;
function needXLSX(){ if(window.XLSX) return Promise.resolve(window.XLSX); if(xlsxP) return xlsxP;
  xlsxP=new Promise(function(res,rej){ var s=document.createElement('script'); s.src='xlsx.full.min.js'; s.onload=function(){ res(window.XLSX); }; s.onerror=function(){ xlsxP=null; rej(); }; document.head.appendChild(s); }); return xlsxP; }
var fsxP=null;
function needFSX(){ if(window.FSX) return Promise.resolve(window.FSX); if(fsxP) return fsxP;
  fsxP=new Promise(function(res,rej){ var s=document.createElement('script'); s.src='xlsxio.js'; s.onload=function(){ res(window.FSX); }; s.onerror=function(){ fsxP=null; rej(); }; document.head.appendChild(s); }); return fsxP; }
function exportXLSX(){
  commitEdit(); toast(T('엑셀 파일을 만드는 중…'));
  needFSX().then(function(X){
    eng.reset(); var used={}, nms=doc.sheets.map(function(s,si){ var b=s.name.replace(/[\[\]:*?\/\\]/g,'').slice(0,31)||('Sheet'+(si+1)), n=b, i=1; while(used[n.toLowerCase()]){ i++; n=b.slice(0,31-String(i).length-1)+'_'+i; } used[n.toLowerCase()]=1; return n; });
    var exn=[]; doc.names.forEach(function(n){ var p=E.parseNameRef(n.ref), si=p?eng.sheetIndex(p.sh,0):-1; if(si<0) return;
      exn.push({name:n.name,ref:"'"+nms[si].replace(/'/g,"''")+"'!"+E.refText(p.a)+(p.t==='rng'?':'+E.refText(p.b):'')}); });
    return X.write(doc,{E:E,val:function(si,r,c){ return eng.value(si,r,c); },spills:function(si){ return eng.spills(si); },
      text:function(si,r,c){ var x=doc.sheets[si].cells[K(r,c)], v=eng.value(si,r,c); return x||v!=null?E.formatValue(v,x&&x.nf):''; },sheetName:function(si){ return nms[si]; },names:exn,charts:function(si){ return xlsxCharts(si,nms[si]); }});
  }).then(function(res){
    download(new Blob([res.bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),(doc.name||'sheet')+'.xlsx');
  },function(err){ console.error(err); toast(T('엑셀 기능을 불러오지 못했어요')); });
}
/* charts as Excel sees them: ranges plus cached values (same reading rules as chartData) */
function xlsxCharts(si,nm){
  var out=[]; doc.sheets[si].charts.forEach(function(ch){
    var d=chartData(ch,si); if(!d.series.length) return;
    var ref=function(r1,c1,r2,c2){ return "'"+nm.replace(/'/g,"''")+"'!$"+E.colName(c1)+'$'+(r1+1)+(r1===r2&&c1===c2?'':':$'+E.colName(c2)+'$'+(r2+1)); };
    var ser=d.series.map(function(s){ return {name:s.name,nameRef:d.hdr?ref(ch.r1,s.col,ch.r1,s.col):null,ref:ref(d.r0,s.col,ch.r2,s.col),vals:s.vals}; }), xy=null;
    if(ch.type==='scatter'){ if(ser.length>1){ xy={ref:ser[0].ref,vals:ser[0].vals}; ser=ser.slice(1); } else xy={ref:null,vals:d.labels.map(function(_,i){ return i+1; })}; }
    out.push({type:ch.type,title:ch.title||'',c1:ch.c1,c2:ch.c2,r1:ch.r1,r2:ch.r2,cat:d.lc>=0&&ch.type!=='scatter'?{ref:ref(d.r0,d.lc,ch.r2,d.lc),vals:d.labels}:null,ser:ser,xy:xy}); });
  return out;
}
function csvCell(s){ s=String(s); return /[",\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; }
function exportCSV(){
  commitEdit(); var mr=-1, mc=-1; for(var k in sh.cells){ var rc=E.RC(k); var c=sh.cells[k]; if(c.v==null||c.v==='') continue; if(rc[0]>mr) mr=rc[0]; if(rc[1]>mc) mc=rc[1]; }
  spl.forEach(function(g){ if(g.r2>mr) mr=g.r2; if(g.c2>mc) mc=g.c2; });
  var lines=[]; for(var r=0;r<=mr;r++){ var a=[]; for(var c=0;c<=mc;c++){ var cell=sh.cells[K(r,c)], v=eng.value(doc.active,r,c); a.push(csvCell(cell||v!=null?E.formatValue(v,null):'')); } lines.push(a.join(',')); }
  download(new Blob(['﻿'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}),(doc.name||'sheet')+' - '+sh.name+'.csv');
}
function importFile(file){
  toast(T('파일을 여는 중…'));
  Promise.all([needXLSX(),needFSX().catch(function(){ return null; })]).then(function(libs){
    var X=libs[0], FX=libs[1], rd=new FileReader();
    rd.onload=function(){
      var bytes=new Uint8Array(rd.result);
      (FX?FX.read(bytes).catch(function(e){ console.warn('xlsx styles skipped',e); return null; }):Promise.resolve(null)).then(function(extras){
      try{
        var wb=X.read(bytes,{type:'array',cellFormula:true,cellNF:true,cellDates:false});
        saveNow(); var d=newDoc(); d.name=file.name.replace(/\.[^.]+$/,''); d.sheets=[];
        wb.SheetNames.forEach(function(n,idx){
          var ws=wb.Sheets[n], s=newSheet(n), ref=ws['!ref'], ex=extras&&extras.names[idx]===n?extras.sheets[idx]:null, dateAt={}; if(ref){ var g=X.utils.decode_range(ref);
            for(var R=g.s.r;R<=Math.min(g.e.r,MAXR-1);R++) for(var C=g.s.c;C<=Math.min(g.e.c,MAXC-1);C++){
              var c=ws[X.utils.encode_cell({r:R,c:C})]; if(!c) continue; var raw;
              if(c.F&&!c.f) continue; // a cell an array formula spills into: the formula fills it again
              if(c.f) raw='='+E.fromXl(c.f);
              else if(c.t==='n'){ var z=String(c.z||''); if(/[ymdhs]/i.test(z.replace(/"[^"]*"/g,''))&&!/^General$/i.test(z)){ raw=c.w!=null?String(c.w):String(c.v); dateAt[K(R,C)]=1; } else { raw=String(c.v); if(!ex) importNf(s,R,C,raw,z); } }
              else if(c.t==='b') raw=c.v?'TRUE':'FALSE';
              else if(c.t==='e') raw=c.w||'#ERROR!';
              else { raw=c.v==null?'':String(c.v); var l=E.literal(raw); if(typeof l!=='string'||raw[0]==='=') raw="'"+raw; }
              if(raw===''||raw==null) continue;
              var cell=s.cells[K(R,C)]||(s.cells[K(R,C)]={}); cell.v=raw; }
            s.rows=Math.max(ROWS,Math.min(MAXR,g.e.r+21)); s.cols=Math.max(COLS,Math.min(MAXC,g.e.c+3)); }
          if(ex) applyXlsxExtras(X,wb,s,ex,dateAt);
          else (ws['!cols']||[]).forEach(function(ci,i){ if(ci&&(ci.wpx||ci.wch)) s.cw[i]=Math.round(ci.wpx||ci.wch*7.5); });
          d.sheets.push(s);
        });
        if(extras) extras.sheets.forEach(function(ex){ (ex.charts||[]).forEach(function(ch){ var s=d.sheets.filter(function(x){ return x.name===ch.sheet; })[0]; if(!s||d.sheets.reduce(function(n,x){ return n+x.charts.length; },0)>=30) return;
          var b=ch.box; s.charts.push({id:uid(),r1:b.r1,c1:b.c1,r2:Math.min(b.r2,b.r1+500,MAXR-1),c2:Math.min(b.c2,b.c1+20,MAXC-1),type:ch.type,title:ch.title||''}); }); });
        if(!d.sheets.length) d.sheets.push(newSheet(T('시트')+'1'));
        d.names=[]; ((wb.Workbook&&wb.Workbook.Names)||[]).forEach(function(n){ if(n.Sheet!=null||!n.Name||/^_xlnm/i.test(n.Name)||E.validName(n.Name)||d.names.length>=200) return; var rf=E.nameRef(String(n.Ref||'').replace(/^=/,''),null); if(rf) d.names.push({name:n.Name,ref:rf}); });
        docId=uid(); doc=fixDoc(d); eng=new E.Engine(doc); undoS=[]; redoS=[]; doc.sheets.forEach(fltFromXlsx); $('docName').value=doc.name; switchSheet(0); saveNow(); toast(T('파일을 열었어요'));
      }catch(err){ console.error(err); toast(T('이 파일은 열 수 없어요')); }
      });
    };
    rd.readAsArrayBuffer(file);
  },function(){ toast(T('엑셀 기능을 불러오지 못했어요')); });
}
/* fallback number format guess from SheetJS's format string (used only when the style reader is unavailable) */
function importNf(s,R,C,raw,z){ var o=null; if(/%/.test(z)) o=/\.0/.test(z)?'p1':'p0'; else if(/\$/.test(z)&&/0/.test(z)) o='u2'; else if(/[₩￦]/.test(z)) o='w0'; else if(/#,##0\.00/.test(z)) o='n2'; else if(/#,##0/.test(z)) o='n0'; if(o) s.cells[K(R,C)]={v:raw,nf:o}; }
/* styles, merges, freeze panes, widths, conditional formats, drop-downs and notes read from the .xlsx XML (see xlsxio.js) */
function applyXlsxExtras(X,wb,s,ex,dateAt){
  var maxR=0, maxC=0, ws=wb.Sheets[s.name];
  function inMerge(r,c){ return ex.merges.some(function(g){ return r>=g.r1&&r<=g.r2&&c>=g.c1&&c<=g.c2; }); }
  var FACE={t:[-1,0,'b'],b:[1,0,'t'],l:[0,-1,'r'],r:[0,1,'l']};
  Object.keys(ex.cells).forEach(function(key){
    var p=key.split(','), R=+p[0], C=+p[1]; if(R>=MAXR||C>=MAXC) return;
    var xf=ex.cells[key], k=K(R,C), cell=s.cells[k], pr={};
    if(xf.b) pr.b=1; if(xf.i) pr.i=1; if(xf.al) pr.al=xf.al; if(xf.bg) pr.bg=xf.bg;
    if(xf.fc&&!(xf.fc==='#000000'&&!xf.bg)) pr.fc=xf.fc;
    if(xf.bg&&!pr.fc&&window.FSX.lum(xf.bg.slice(1))>0.6) pr.fc='#000000'; // Excel's black text: keep it readable on a light fill
    if(xf.bx){ pr.bx={}; for(var sd in xf.bx) pr.bx[sd]={c:xf.bx[sd].c,w:xf.bx[sd].w}; }
    if(xf.nf&&xf.nf!=='date'&&cell&&!dateAt[k]){ var raw=String(cell.v==null?'':cell.v); if(raw[0]==='='||typeof E.literal(raw)==='number') pr.nf=xf.nf; }
    if(!Object.keys(pr).length) return;
    if(!cell) cell=s.cells[k]={}; Object.assign(cell,pr); if(R>maxR) maxR=R; if(C>maxC) maxC=C; });
  // merged blocks: the top-left cell owns the outer edges, the covered cells are emptied
  ex.merges.forEach(function(g){ if(g.r1>=MAXR||g.c1>=MAXC) return; g={r1:g.r1,c1:g.c1,r2:Math.min(g.r2,MAXR-1),c2:Math.min(g.c2,MAXC-1)};
    var side=function(r,c,sd){ var x=ex.cells[r+','+c]; return x&&x.bx&&x.bx[sd]?{c:x.bx[sd].c,w:x.bx[sd].w}:null; };
    var bx={t:side(g.r1,g.c1,'t'),l:side(g.r1,g.c1,'l'),b:side(g.r2,g.c1,'b'),r:side(g.r1,g.c2,'r')}, k0=K(g.r1,g.c1), tl=s.cells[k0];
    for(var r=g.r1;r<=g.r2;r++) for(var c=g.c1;c<=g.c2;c++) if(r!==g.r1||c!==g.c1) delete s.cells[K(r,c)];
    var any=false; for(var sd in bx){ if(!bx[sd]) delete bx[sd]; else any=true; }
    if(any){ if(!tl) tl=s.cells[k0]={}; tl.bx=bx; } else if(tl) delete tl.bx;
    s.merges.push(g); if(g.r2>maxR) maxR=g.r2; if(g.c2>maxC) maxC=g.c2; });
  // an edge is written on both cells that share it
  Object.keys(s.cells).forEach(function(key){ var x=s.cells[key]; if(!x.bx) return; var rc=E.RC(key);
    if(s.merges.length&&inMerge(rc[0],rc[1])) return;
    for(var sd in x.bx){ var f=FACE[sd], nr=rc[0]+f[0], nc=rc[1]+f[1]; if(nr<0||nc<0||nr>=MAXR||nc>=MAXC||(s.merges.length&&inMerge(nr,nc))) continue;
      var nk=K(nr,nc), nx=s.cells[nk]||(s.cells[nk]={}); nx.bx=nx.bx||{}; if(!nx.bx[f[2]]) nx.bx[f[2]]={c:x.bx[sd].c,w:x.bx[sd].w}; } });
  Object.keys(ex.cw).forEach(function(c){ if(+c<MAXC) s.cw[c]=ex.cw[c]; });
  s.fr=Math.min(ex.fr,500); s.fc=Math.min(ex.fc,50);
  if(ex.flt&&ex.flt.g.r1<MAXR&&ex.flt.g.c1<MAXC){ var fg=ex.flt.g; s.flt={r1:fg.r1,c1:fg.c1,r2:Math.min(fg.r2,fg.r1+4000,MAXR-1),c2:Math.min(fg.c2,MAXC-1),h:{},xshow:ex.flt.cols}; }
  ex.cfs.slice(0,200).forEach(function(f){ if(f.r1>=MAXR||f.c1>=MAXC) return; f.r2=Math.min(f.r2,f.r1+2000,MAXR-1); f.c2=Math.min(f.c2,MAXC-1); s.cfs.push(f); });
  ex.dv.slice(0,200).forEach(function(v){ var list=v.items;
    if(!Array.isArray(list)){ list=[]; var m=/^(?:'((?:[^']|'')+)'|([^!']+))!(.+)$/.exec(list0(v.items.ref)), rs=m?(m[1]!=null?m[1].replace(/''/g,"'"):m[2]):s.name, g2=parseRef(m?m[3]:v.items.ref), w2=wb.Sheets[rs];
      if(g2&&w2) for(var r=g2.s.r;r<=g2.e.r&&list.length<100;r++) for(var c=g2.s.c;c<=g2.e.c&&list.length<100;c++){ var cc=w2[X.utils.encode_cell({r:r,c:c})]; if(cc&&cc.v!=null&&cc.v!=='') list.push(String(cc.w!=null?cc.w:cc.v)); } }
    var seen={}, out=[]; list.forEach(function(t){ t=String(t).trim().slice(0,60); if(t&&!seen[t.toLowerCase()]){ seen[t.toLowerCase()]=1; out.push(t); } });
    if(out.length&&v.g.r1<MAXR&&v.g.c1<MAXC) s.dv.push({r1:v.g.r1,c1:v.g.c1,r2:Math.min(v.g.r2,MAXR-1),c2:Math.min(v.g.c2,MAXC-1),list:out.slice(0,100)}); });
  Object.keys(ex.notes).forEach(function(key){ var p=key.split(','), R=+p[0], C=+p[1]; if(R>=MAXR||C>=MAXC) return; var cell=s.cells[K(R,C)]||(s.cells[K(R,C)]={}); cell.nt=ex.notes[key].slice(0,1000); if(R>maxR) maxR=R; if(C>maxC) maxC=C; });
  s.rows=Math.max(s.rows,Math.min(MAXR,maxR+21)); s.cols=Math.max(s.cols,Math.min(MAXC,maxC+3));
  function list0(t){ return String(t||'').replace(/^=/,''); }
  function parseRef(t){ try{ return X.utils.decode_range(list0(t).replace(/^.*!/,'').replace(/\$/g,'')); }catch(e){ return null; } }
}
/* an Excel filter lists the values to show; the app keeps the values to hide (needs the doc's engine, so it runs after loading) */
function fltFromXlsx(s,si){
  var f=s.flt; if(!f||!f.xshow) return; var cols=f.xshow; delete f.xshow;
  cols.forEach(function(o){ if(o.c<f.c1||o.c>f.c2) return; var show={}, hide=[], seen={}; o.show.forEach(function(t){ show[t]=1; });
    for(var r=f.r1+1;r<=f.r2;r++){ var x=s.cells[K(r,o.c)], v=eng.value(si,r,o.c), t=x||v!=null?E.formatValue(v,x&&x.nf):''; if(seen[t]) continue; seen[t]=1; if(t===''?!o.blank:!show[t]) hide.push(t); }
    if(hide.length) f.h[o.c]=hide; });
}
$('fileIn').addEventListener('change',function(){ var f=this.files&&this.files[0]; if(f) importFile(f); this.value=''; });
$('saveBtn').onclick=exportXLSX;
$('fileBtn').onclick=function(){ commitEdit(); drawDocList(); openMenu($('fileMenu'),$('fileBtn')); };
function drawDocList(){
  var l=$('docList'); l.innerHTML=''; var idx=docIndex();
  idx.forEach(function(x){ var b=document.createElement('button'); b.className='doc'; b.setAttribute('data-notr','');
    var d=new Date(x.t), when=(d.getMonth()+1)+'/'+d.getDate()+' '+('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);
    b.innerHTML='<span></span><small></small>'; b.firstChild.textContent=(x.id===docId?'● ':'')+(x.name||T('이름 없음')); b.lastChild.textContent=when;
    b.onclick=function(){ closeMenus(); if(x.id===docId) return; saveNow(); loadDoc(x.id); }; l.appendChild(b); });
}
$('fileMenu').addEventListener('click',function(e){
  var b=e.target.closest('[data-f]'); if(!b) return; closeMenus(); fileCmd(b.dataset.f); });
function fileCmd(f){
  if(f==='new'){ saveNow(); loadDoc(null); saveNow(); }
  else if(f==='open') $('fileIn').click();
  else if(f==='url') openUrlDlg();
  else if(f==='tpl') openTpl();
  else if(f==='xlsx') exportXLSX();
  else if(f==='csv') exportCSV();
  else if(f==='print') cmd('print');
  else if(f==='docs') openDocMgr();
  else if(f==='del') deleteDoc(docId);
}
$('docName').addEventListener('input',function(){ doc.name=this.value; saveSoon(); });
$('docName').addEventListener('keydown',function(e){ if(e.key==='Enter') this.blur(); });

/* ---------- v32: import a table from a CSV web address ---------- */
var URL_MAX_CHARS=2000000, URL_MAX_ROWS=20000, urlOpt={timeout:8000}, urlTable=null, urlWarn=0;
/* CSV text -> rows of strings: quoted fields, "" quotes, newlines inside quotes, CRLF, BOM. Stops at maxRows (cut:true). */
function parseCSV(text,delim,maxRows){
  if(text.charCodeAt(0)===0xFEFF) text=text.slice(1);
  var rows=[], row=[], f='', q=false, cut=false, i=0, n=text.length, ch;
  for(;i<n;i++){
    ch=text[i];
    if(q){ if(ch==='"'){ if(text[i+1]==='"'){ f+='"'; i++; } else q=false; } else f+=ch; continue; }
    if(ch==='"'&&f==='') q=true;
    else if(ch===delim){ row.push(f); f=''; }
    else if(ch==='\n'||ch==='\r'){ if(ch==='\r'&&text[i+1]==='\n') i++; row.push(f); f=''; rows.push(row); row=[]; if(maxRows&&rows.length>=maxRows&&i<n-1){ cut=true; break; } }
    else f+=ch;
  }
  if(!cut&&(f!==''||row.length)){ row.push(f); rows.push(row); }
  rows.cut=cut; return rows;
}
/* comma, tab or semicolon: the one that gives most of the first lines the same width (more than one column) */
function sniffDelim(text){
  var head=text.slice(0,20000), best=',', bs=0;
  [',','\t',';'].forEach(function(d){
    var rs=parseCSV(head,d,10), w=rs.length?rs[0].length:0, sc=0; if(w>1) rs.forEach(function(r){ if(r.length===w) sc++; });
    if(sc>bs){ bs=sc; best=d; } });
  return best;
}
/* a cell that reads as a plain number goes in as a number; anything else that the sheet would reinterpret (007, =SUM, TRUE, 1,234) is kept as text */
function csvRaw(v){
  if(v==='') return '';
  if(/^[+-]?(0|[1-9]\d*)(\.\d+)?(e[+-]?\d+)?$/i.test(v)||/^[+-]?\.\d+$/.test(v)) return v;
  var l=E.literal(v); return (typeof l!=='string'||v[0]==='='||v[0]==="'")?"'"+v:v;
}
/* reads the address; resolves {rows,chars} or rejects with a Korean message */
function fetchCSV(url){
  url=String(url||'').trim();
  if(!/^https:\/\/[^\s\/]+/i.test(url)) return Promise.reject(T('https 로 시작하는 주소만 가져올 수 있어요'));
  var ac=new AbortController(), timedOut=false, t=setTimeout(function(){ timedOut=true; ac.abort(); },urlOpt.timeout);
  var fail=function(e){ if(typeof e==='string') throw e; throw T(timedOut?'시간이 너무 오래 걸려서 멈췄어요. 잠시 뒤에 다시 해 보세요':'주소가 허용하지 않아요 (CORS). 그 사이트가 다른 웹사이트의 읽기를 허용해야 해요. GitHub raw 파일이나 구글 시트의 웹에 게시 CSV 링크는 돼요'); };
  return fetch(url,{signal:ac.signal,credentials:'omit',referrerPolicy:'no-referrer',redirect:'follow'}).then(function(res){
    if(res.url&&!/^https:/i.test(res.url)) throw T('https 가 아닌 주소로 넘어가서 멈췄어요');
    if(!res.ok) throw F('불러오지 못했어요 ({0})',res.status);
    var ct=res.headers.get('content-type')||'';
    if(ct&&(!/^(text\/(?!html)|application\/(csv|vnd\.ms-excel|octet-stream))/i.test(ct))) throw T('글자(CSV) 파일이 아니에요');
    var big=T('파일이 너무 커요 (글자 200만 자, 2만 줄까지)');
    var rd=res.body&&res.body.getReader?res.body.getReader():null, dec=new TextDecoder('utf-8'), text='';
    if(!rd) return res.text().then(function(x){ if(x.length>URL_MAX_CHARS) throw big; return x; });
    return (function pump(){ return rd.read().then(function(o){
      if(o.done){ return text+dec.decode(); }
      text+=dec.decode(o.value,{stream:true});
      if(text.length>URL_MAX_CHARS){ try{ rd.cancel(); }catch(e){} throw big; }
      return pump(); }); })();
  }).then(function(text){
    clearTimeout(t);
    if(text.indexOf('\u0000')>=0) throw T('글자(CSV) 파일이 아니에요');
    if(text.replace(/^﻿/,'').trim()==='') throw T('내용이 비어 있어요');
    var rows=parseCSV(text,sniffDelim(text),URL_MAX_ROWS);
    if(rows.cut) throw T('파일이 너무 커요 (글자 200만 자, 2만 줄까지)');
    var w=0; rows.forEach(function(r){ if(r.length>w) w=r.length; });
    return {rows:rows,w:w,chars:text.length};
  }).catch(function(e){ clearTimeout(t); return fail(e); });
}
function openUrlDlg(){
  urlTable=null; urlWarn=0; $('urlMsg').textContent=''; $('urlMsg').className='aiCtx'; $('urlPrev').innerHTML=''; $('urlPut').disabled=true; $('urlPut').textContent=T('여기에 넣기');
  openDlg('urlDlg',$('urlIn'));
}
function urlMsg(t,err){ var m=$('urlMsg'); m.textContent=t; m.className=err?'aiErr':'aiCtx'; }
function urlLoad(){
  urlTable=null; urlWarn=0; $('urlPut').disabled=true; $('urlPut').textContent=T('여기에 넣기'); $('urlPrev').innerHTML=''; urlMsg(T('불러오는 중…'));
  $('urlGo').disabled=true;
  fetchCSV($('urlIn').value).then(function(t){
    urlTable=t; urlMsg(F('{0}줄 × {1}열 ({2}자)',t.rows.length,t.w,t.chars));
    var tb=document.createElement('table');
    t.rows.slice(0,8).forEach(function(r){ var tr=tb.insertRow(); for(var c=0;c<Math.min(t.w,12);c++){ var td=tr.insertCell(); td.textContent=r[c]==null?'':r[c]; } });
    $('urlPrev').appendChild(tb); $('urlPut').disabled=false;
  },function(e){ urlMsg(String(e),true); }).then(function(){ $('urlGo').disabled=false; });
}
function urlPut(){
  var t=urlTable; if(!t) return; var h=t.rows.length, w=t.w, r0=act.r, c0=act.c;
  if(r0+h>MAXR||c0+w>MAXC) return urlMsg(F('시트에 다 들어가지 않아요 (최대 {0}줄 × {1}열). 위쪽 칸을 골라 주세요',MAXR,MAXC),true);
  if(guard({r1:r0,c1:c0,r2:r0+h-1,c2:c0+w-1})) return;
  var used=0; for(var i=0;i<h;i++) for(var j=0;j<w;j++){ var x=sh.cells[K(r0+i,c0+j)]; if(x&&x.v!=null&&x.v!=='') used++; }
  if(used&&!urlWarn){ urlWarn=1; $('urlPut').textContent=F('덮어쓰기 ({0}칸)',used); return urlMsg(F('이미 내용이 있는 {0}칸을 덮어써요. 맞으면 한 번 더 눌러 주세요',used),true); }
  pushUndo(); growTo(r0+h-1,c0+w-1); // grow once first: setRaw would rebuild the grid on every 50 rows
  t.rows.forEach(function(row,i){ for(var j=0;j<w;j++) setRaw(r0+i,c0+j,csvRaw(row[j]==null?'':row[j])); });
  growTo(r0+h-1,c0+w-1); sel={r1:r0,c1:c0,r2:r0+h-1,c2:c0+w-1}; changed(); closeDlgs(); toast(F('{0}줄 × {1}열을 넣었어요',h,w));
}
$('urlGo').onclick=urlLoad; $('urlPut').onclick=urlPut;
$('urlIn').addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); urlLoad(); } });
$('urlIn').addEventListener('input',function(){ urlTable=null; urlWarn=0; $('urlPut').disabled=true; $('urlPut').textContent=T('여기에 넣기'); });

/* ---------- formula autocomplete ---------- */
var acItems=[], acIdx=0;
function acOpen(){ return $('acBox').classList.contains('open'); }
function acHide(){ $('acBox').classList.remove('open'); acItems=[]; }
function acToken(inp){
  var v=inp.value; if(v[0]!=='=') return null; var p=inp.selectionStart==null?v.length:inp.selectionStart, m=/[A-Za-z_가-힣][A-Za-z0-9._가-힣]*$/.exec(v.slice(0,p));
  if(!m) return null; var before=v.slice(0,p-m[0].length); if(!/(^=|[(+\-*\/^,;&<>=:])\s*$/.test(before)) return null;
  if(/^[A-Za-z]{1,3}\d+$/.test(m[0])) return null; return {t:m[0],at:p-m[0].length,end:p};
}
function acUpdate(){
  if(!editing){ acHide(); return; } var inp=edInput(), tk=acToken(inp); if(!tk){ acHide(); return; }
  var q=tk.t.toUpperCase();
  var nms=doc.names.filter(function(n){ var u=n.name.toUpperCase(); return u.indexOf(q)===0&&u!==q; }).map(function(n){ var rt=n.ref.replace(/\$/g,''); return ['이름 범위',n.name,n.name,T('이름 범위')+' · '+rt,T('이름 범위')+' · '+rt,true]; });
  acItems=nms.concat(FNDOC.filter(function(f){ return f[1].indexOf(q)===0&&f[1]!==q; })).slice(0,6);
  if(!acItems.length){ acHide(); return; } acIdx=0; var box=$('acBox');
  box.innerHTML=acItems.map(function(f,i){ var d=FFT.lang==='ko'?f[3]:f[4]; return '<button data-i="'+i+'"'+(i?'':' class="on"')+' data-notr><code>'+f[2].replace(/</g,'&lt;')+'</code><span>'+String(d).replace(/</g,'&lt;')+'</span></button>'; }).join('');
  box.classList.add('open'); var r=inp.getBoundingClientRect(), w=box.offsetWidth, h=box.offsetHeight;
  var x=Math.min(Math.max(8,r.left),innerWidth-w-8), y=r.bottom+4; if(y+h>innerHeight-8) y=Math.max(8,r.top-h-4);
  box.style.left=x+'px'; box.style.top=y+'px';
}
function acMove(d){ acIdx=(acIdx+d+acItems.length)%acItems.length; Array.prototype.forEach.call($('acBox').children,function(b,i){ b.classList.toggle('on',i===acIdx); }); }
function acPick(i){
  var f=acItems[i]; if(!f||!editing) return; var inp=edInput(), tk=acToken(inp); if(!tk) return acHide();
  inp.value=inp.value.slice(0,tk.at)+f[1]+(f[5]?'':'(')+inp.value.slice(tk.end); var L=tk.at+f[1].length+(f[5]?0:1);
  try{ inp.focus({preventScroll:true}); inp.setSelectionRange(L,L); }catch(e){}
  if(inp===ed){ fit(); fin.value=ed.value; } else syncFromBar(); refMode(); acHide();
}
$('acBox').addEventListener('pointerdown',function(e){ e.preventDefault(); });
$('acBox').addEventListener('click',function(e){ var b=e.target.closest('[data-i]'); if(b) acPick(+b.dataset.i); });

/* ---------- document manager ---------- */
var LST='ffsheet.trash';
function trashGet(){ try{ return JSON.parse(lsGet(LST)||'[]'); }catch(e){ return []; } }
function fmtWhen(t){ var d=new Date(t); return (d.getMonth()+1)+'/'+d.getDate()+' '+('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2); }
function openDocMgr(){ saveNow(); drawDocMgr(); openDlg('docDlg'); }
function drawDocMgr(){
  var l=$('dmList'); l.innerHTML=''; var idx=docIndex();
  if(!idx.length) l.innerHTML='<div class="empty">'+T('저장된 문서가 없어요')+'</div>';
  idx.forEach(function(x){
    var d=document.createElement('div'); d.className='dmRow'+(x.id===docId?' cur':'');
    d.innerHTML='<button class="nm" data-notr></button><small data-notr></small><button class="ib" data-a="ren" title="이름 바꾸기">✎</button><button class="ib" data-a="dup" title="복제">⧉</button><button class="ib dang" data-a="del" title="지우기">🗑</button>';
    d.querySelector('.nm').textContent=(x.id===docId?'● ':'')+(x.name||T('이름 없음')); d.querySelector('small').textContent=fmtWhen(x.t);
    d.onclick=function(e){ var a=e.target.closest('[data-a]'); a=a?a.dataset.a:'open';
      if(a==='open'){ if(x.id!==docId){ saveNow(); loadDoc(x.id); } closeDlgs(); }
      else if(a==='ren') renameDoc(x.id); else if(a==='dup') dupDoc(x.id); else if(a==='del') deleteDoc(x.id); };
    l.appendChild(d); FFT.walk(d); });
  var tr=trashGet(), tb=$('dmTrash'); tb.innerHTML=''; $('dmTrashBox').style.display=tr.length?'':'none';
  tr.forEach(function(x){ var d=document.createElement('div'); d.className='dmRow'; d.innerHTML='<span class="nm" data-notr></span><small data-notr></small><button class="tbtn" style="height:32px">'+T('되살리기')+'</button>';
    d.querySelector('.nm').textContent=x.name||T('이름 없음'); d.querySelector('small').textContent=fmtWhen(x.t);
    d.querySelector('button').onclick=function(){ restoreDoc(x.id); }; tb.appendChild(d); });
}
function renameDoc(id){
  var idx=docIndex(), ent=idx.filter(function(x){ return x.id===id; })[0]; if(!ent) return;
  ask(T('문서 이름 바꾸기'),'',ent.name||'').then(function(v){ v=(v||'').trim().slice(0,80); if(!v||v===ent.name) return;
    if(id===docId){ doc.name=v; $('docName').value=v; saveNow(); }
    else { var d=null; try{ d=JSON.parse(lsGet(LSD+id)||'null'); }catch(e){} if(d){ d.name=v; lsSet(LSD+id,JSON.stringify(d)); } ent.name=v; lsSet(LSI,JSON.stringify(idx)); }
    drawDocMgr(); });
}
function dupDoc(id){
  saveNow(); var raw=lsGet(LSD+id); if(!raw) return; var d; try{ d=JSON.parse(raw); }catch(e){ return; }
  var nid=uid(); d.name=(d.name||T('새 시트'))+' '+T('(복사본)'); if(!lsSet(LSD+nid,JSON.stringify(d))) return toast(T('저장 공간이 가득 찼어요'));
  var idx=docIndex(); idx.unshift({id:nid,name:d.name,t:Date.now()}); lsSet(LSI,JSON.stringify(idx.slice(0,50))); drawDocMgr(); toast(T('복제했어요'));
}
function deleteDoc(id){
  saveNow(); var ent=docIndex().filter(function(x){ return x.id===id; })[0]; var nm=(ent&&ent.name)||(id===docId?doc.name:'')||T('이름 없음');
  confirmDlg(F('"{0}" 문서를 지울까요? 되돌릴 수 없어요.',nm)+' '+T('(최근 삭제에서 되살릴 수 있어요)')).then(function(ok){ if(!ok) return;
    var raw=lsGet(LSD+id); if(raw){ var tr=trashGet().filter(function(x){ return x.id!==id; }); tr.unshift({id:id,name:nm,t:Date.now(),data:raw}); tr=tr.slice(0,5);
      while(tr.length&&!lsSet(LST,JSON.stringify(tr))) tr.pop(); }
    lsDel(LSD+id); lsSet(LSI,JSON.stringify(docIndex().filter(function(x){ return x.id!==id; })));
    if(id===docId){ var rest=docIndex(); loadDoc(rest.length?rest[0].id:null); saveNow(); }
    if($('docDlg').classList.contains('open')) drawDocMgr(); toast(T('문서를 지웠어요')); });
}
function restoreDoc(id){
  var tr=trashGet(), x=tr.filter(function(y){ return y.id===id; })[0]; if(!x) return;
  if(!lsSet(LSD+id,x.data)) return toast(T('저장 공간이 가득 찼어요'));
  var idx=docIndex().filter(function(y){ return y.id!==id; }); idx.unshift({id:id,name:x.name,t:Date.now()}); lsSet(LSI,JSON.stringify(idx.slice(0,50)));
  lsSet(LST,JSON.stringify(tr.filter(function(y){ return y.id!==id; }))); drawDocMgr(); toast(T('되살렸어요'));
}
$('dmNew').onclick=function(){ saveNow(); loadDoc(null); saveNow(); closeDlgs(); toast(T('새 문서를 만들었어요')); };

/* ---------- print ---------- */
window.addEventListener('beforeprint',function(){
  var mr=-1, mc=-1; for(var k in sh.cells){ var c=sh.cells[k]; if(c.v==null||c.v==='') continue; var rc=E.RC(k); if(rc[0]>mr) mr=rc[0]; if(rc[1]>mc) mc=rc[1]; }
  var r, c2, ths=hrow.cells;
  for(r=0;r<gbody.rows.length;r++) gbody.rows[r].classList.toggle('npr',r>mr);
  for(c2=0;c2<sh.cols;c2++){ var hide=c2>mc; ths[c2+1].classList.toggle('npr',hide); for(r=0;r<=mr&&r<gbody.rows.length;r++) gbody.rows[r].cells[c2+1].classList.toggle('npr',hide); }
});
window.addEventListener('afterprint',function(){ document.querySelectorAll('.npr').forEach(function(e){ e.classList.remove('npr'); }); });

/* ---------- zoom ---------- */
var ZS=[.6,.75,.9,1,1.15,1.3,1.5,1.75];
function setZoom(z){ zoom=z; gin.style.zoom=z; $('zLbl').textContent=Math.round(z*100)+'%'; lsSet('ffsheet.zoom',String(z)); overlay(); }
$('zIn').onclick=function(){ var i=ZS.indexOf(zoom); if(i<ZS.length-1) setZoom(ZS[i+1]); };
$('zOut').onclick=function(){ var i=ZS.indexOf(zoom); if(i>0) setZoom(ZS[i-1]); };

/* ---------- v10: filter ---------- */
function visRow(r,dir){
  if(!sh.flt) return r; var n=r, d=dir<0?-1:1;
  while(n>=0&&n<gbody.rows.length&&gbody.rows[n].style.display==='none') n+=d;
  return n<0||n>=gbody.rows.length?r:n;
}
function cellText(r,c){ var x=sh.cells[K(r,c)], v=eng.value(doc.active,r,c); return x||v!=null?E.formatValue(v,x&&x.nf):''; }
function applyFilter(){
  var f=sh.flt, rows=gbody.rows, r;
  for(r=0;r<rows.length;r++) if(rows[r].style.display) rows[r].style.display='';
  if(!f) return; f.h=f.h||{}; var shown=0;
  for(r=f.r1+1;r<=f.r2&&r<rows.length;r++){ var hide=false;
    for(var c in f.h){ var hv=f.h[c]; if(hv&&hv.length&&hv.indexOf(cellText(r,+c))>=0){ hide=true; break; } }
    if(hide) rows[r].style.display='none'; else shown++; }
  f.shown=shown; stats();
}
var fltC=0, fltHide=null, fltVals=[];
function openFilter(c){
  commitEdit();
  if(!sh.flt){
    var g=(sel.r1===sel.r2&&sel.c1===sel.c2)?region(act.r,act.c):Object.assign({},sel);
    if(!g||g.r2<=g.r1){ return toast(T('필터를 걸 표를 먼저 입력하세요')); }
    if(g.r2-g.r1>4000) g.r2=g.r1+4000;
    pushUndo(); sh.flt={r1:g.r1,c1:g.c1,r2:g.r2,c2:g.c2,h:{}}; paintAll(); saveSoon();
  }
  var f=sh.flt; c=Math.min(Math.max(c,f.c1),f.c2); fltC=c; fltHide=new Set(f.h[c]||[]);
  var cnt={}, order=[]; for(var r=f.r1+1;r<=f.r2;r++){ var t=cellText(r,c); if(!(t in cnt)){ cnt[t]=0; order.push(t); } cnt[t]++; }
  var nums=order.every(function(t){ return t===''||/^-?[\d,]*\.?\d+%?$/.test(t); });
  order.sort(function(a,b){ if(a==='') return 1; if(b==='') return -1; return nums?parseFloat(a.replace(/,/g,''))-parseFloat(b.replace(/,/g,'')):a.localeCompare(b); });
  fltVals=order.map(function(t){ return {t:t,n:cnt[t]}; });
  $('fltT').textContent=F('{0}열 필터',E.colName(c))+' · '+(cellText(f.r1,c)||''); $('fltQ').value=''; drawFlt(); openDlg('fltDlg'); if(mouseMode) setTimeout(function(){ $('fltQ').focus(); },40);
}
function drawFlt(){
  var q=$('fltQ').value.trim().toLowerCase(), l=$('fltList'); l.innerHTML=''; var shown=0;
  fltVals.forEach(function(o){
    if(q&&o.t.toLowerCase().indexOf(q)<0) return; shown++;
    var lb=document.createElement('label'); lb.className='fltItem'; lb.setAttribute('data-notr','');
    lb.innerHTML='<input type="checkbox"><span></span><small></small>'; var cb=lb.firstChild; cb.checked=!fltHide.has(o.t);
    lb.children[1].textContent=o.t===''?'':o.t; lb.lastChild.textContent=o.n;
    if(o.t===''){ lb.children[1].textContent=T('(빈 칸)'); lb.children[1].style.color='var(--dim)'; }
    cb.onchange=function(){ if(cb.checked) fltHide.delete(o.t); else fltHide.add(o.t); countFlt(); };
    l.appendChild(lb); });
  if(!shown) l.innerHTML='<div class="empty">'+T('찾는 내용이 없어요')+'</div>';
  countFlt();
}
function countFlt(){ $('fltN').textContent=F('{0}/{1}개 표시',fltVals.length-fltVals.filter(function(o){ return fltHide.has(o.t); }).length,fltVals.length); }
$('fltQ').addEventListener('input',drawFlt);
function fltVisible(){ var q=$('fltQ').value.trim().toLowerCase(); return fltVals.filter(function(o){ return !q||o.t.toLowerCase().indexOf(q)>=0; }); }
$('fltAll').onclick=function(){ fltVisible().forEach(function(o){ fltHide.delete(o.t); }); drawFlt(); };
$('fltNone').onclick=function(){ fltVisible().forEach(function(o){ fltHide.add(o.t); }); drawFlt(); };
$('fltOk').onclick=function(){ var f=sh.flt; if(!f) return closeDlgs(); pushUndo();
  if(fltHide.size) f.h[fltC]=Array.from(fltHide); else delete f.h[fltC];
  closeDlgs(); paintAll(); applyFilter(); overlay(); saveSoon(); toast(F('{0}행 중 {1}행을 보여 줘요',f.r2-f.r1,f.shown)); };
$('fltOff').onclick=function(){ if(!sh.flt) return closeDlgs(); pushUndo(); sh.flt=null; closeDlgs(); paintAll(); applyFilter(); overlay(); saveSoon(); toast(T('필터를 껐어요')); };
function fltSort(asc){ var f=sh.flt; if(!f) return; closeDlgs(); sortSel(asc,{g:{r1:f.r1,c1:f.c1,r2:f.r2,c2:f.c2},key:fltC,hdr:true}); }
$('fltA').onclick=function(){ fltSort(true); };
$('fltD').onclick=function(){ fltSort(false); };

/* ---------- v10: conditional formatting rules ---------- */
var CFCOL=['rgba(255,93,93,.45)','rgba(255,201,60,.5)','rgba(63,224,143,.42)','rgba(79,160,255,.45)','rgba(167,139,250,.5)'], cfSel=0, cfG=null;
CFCOL.forEach(function(c,i){ var b=document.createElement('button'); b.className='sw'+(i?'':' on'); b.style.background=c; b.setAttribute('aria-label',T('색')+' '+(i+1)); b.onclick=function(){ cfSel=i; Array.prototype.forEach.call($('cfSw').children,function(x,j){ x.classList.toggle('on',j===i); }); }; $('cfSw').appendChild(b); });
function cfOpUi(){ var o=$('cfOp').value; $('cfA').style.display=(o==='dup'||o==='bl')?'none':''; $('cfB').style.display=o==='bt'?'':'none'; $('cfAnd').style.display=o==='bt'?'':'none'; $('cfA').placeholder=T(o==='tx'?'글자':'값'); }
$('cfOp').addEventListener('change',cfOpUi);
function openCf(){
  commitEdit(); cfG=(sel.r1===sel.r2&&sel.c1===sel.c2)?(region(act.r,act.c)||{r1:act.r,c1:act.c,r2:act.r,c2:act.c}):Object.assign({},sel);
  if(cfG.r2-cfG.r1>2000) cfG.r2=cfG.r1+2000; $('cfRg').textContent=E.rangeStr(cfG); cfOpUi(); drawCfList(); openDlg('cfDlg');
}
function drawCfList(){
  var l=$('cfList'); l.innerHTML=''; var any=false;
  sh.cfs.forEach(function(f){ if(f.t!=='rule'&&f.t!=='scale') return; any=true; var d=document.createElement('div'); d.className='cfItem'; d.setAttribute('data-notr','');
    var o=f.t==='rule'&&$('cfOp').querySelector('option[value='+f.op+']'), txt=E.rangeStr(f)+'  '+(f.t==='scale'?T('색 단계'):(o?o.textContent:f.op)+(f.a!=null&&f.a!==''&&f.op!=='dup'&&f.op!=='bl'?'  '+f.a+(f.op==='bt'?' ~ '+f.b:''):''));
    d.innerHTML='<i class="sq"></i><span></span><button class="ib tbtn" style="height:32px" aria-label="지우기">×</button>'; d.firstChild.style.background=f.t==='scale'?'linear-gradient(90deg,#eb5757,#ffc93c,#3fc878)':f.col; d.children[1].textContent=txt;
    d.lastChild.onclick=function(){ pushUndo(); sh.cfs=sh.cfs.filter(function(x){ return x!==f; }); changed(); drawCfList(); }; l.appendChild(d); });
  if(!any) l.innerHTML='<div class="empty" style="padding:12px">'+T('아직 규칙이 없어요')+'</div>';
}
$('cfScale').onclick=function(){ if(!cfG) return; var g=cfG; pushUndo(); sh.cfs=sh.cfs.filter(function(f){ return !(f.t==='scale'&&f.r1===g.r1&&f.c1===g.c1&&f.r2===g.r2&&f.c2===g.c2); });
  sh.cfs.push({r1:g.r1,c1:g.c1,r2:g.r2,c2:g.c2,t:'scale'}); changed(); drawCfList(); toast(T('색 단계를 넣었어요')); };
$('cfAdd').onclick=function(){
  var op=$('cfOp').value, a=$('cfA').value.trim(), b=$('cfB').value.trim(); if(!cfG) return;
  if(op!=='dup'&&op!=='bl'&&a==='') return toast(T('값을 입력하세요'));
  if(op==='bt'&&b==='') return toast(T('값을 입력하세요'));
  pushUndo(); sh.cfs.push({r1:cfG.r1,c1:cfG.c1,r2:cfG.r2,c2:cfG.c2,t:'rule',op:op,a:a,b:b,col:CFCOL[cfSel]}); changed(); drawCfList(); toast(T('규칙을 넣었어요'));
};

/* ---------- v10: dropdown lists (data validation) ---------- */
function dvAt(r,c){ for(var i=sh.dv.length-1;i>=0;i--){ var d=sh.dv[i]; if(r>=d.r1&&r<=d.r2&&c>=d.c1&&c<=d.c2) return d; } return null; }
function dvOk(r,c,val){ var d=dvAt(r,c); if(!d) return true; var v=String(val).trim().toLowerCase(); return d.list.some(function(x){ return x.toLowerCase()===v; }); }
function placeDv(){
  var b=$('dvBtn'), d=!editing&&dvAt(act.r,act.c), td=tdAt(act.r,act.c);
  if(!d||!td){ b.style.display='none'; return; }
  b.style.display='flex'; b.style.left=(td.offsetLeft+td.offsetWidth-28)+'px'; b.style.top=(td.offsetTop+1)+'px';
}
$('dvBtn').addEventListener('pointerdown',function(e){ e.stopPropagation(); });
$('dvBtn').addEventListener('click',function(){
  var d=dvAt(act.r,act.c); if(!d) return; var m=$('dvMenu'); m.innerHTML='';
  d.list.forEach(function(x){ var b=document.createElement('button'); b.textContent=x; b.setAttribute('data-notr',''); b.onclick=function(){ closeMenus(); pushUndo(); setRaw(act.r,act.c,x); changed(); }; m.appendChild(b); });
  var cl=document.createElement('button'); cl.textContent=T('비우기'); cl.className='dang'; cl.onclick=function(){ closeMenus(); pushUndo(); setRaw(act.r,act.c,''); changed(); }; m.appendChild(cl);
  openMenu(m,$('dvBtn'));
});
function openDv(){
  commitEdit(); var g=Object.assign({},sel), cur=dvAt(act.r,act.c);
  if(sel.r1===sel.r2&&sel.c1===sel.c2&&!cur){ var rg=region(act.r,act.c); if(rg&&rg.c1===rg.c2&&rg.r1<act.r) g={r1:act.r,c1:act.c,r2:rg.r2,c2:act.c}; }
  $('dvRg').textContent=E.rangeStr(g); $('dvRg').dataset.g=JSON.stringify(g); $('dvList').value=cur?cur.list.join(', '):''; openDlg('dvDlg',$('dvList'));
}
function dvOverlap(g,d){ return !(d.r2<g.r1||d.r1>g.r2||d.c2<g.c1||d.c1>g.c2); }
$('dvOk').onclick=function(){
  var g=JSON.parse($('dvRg').dataset.g||'null'), seen={}, list=[]; if(!g) return;
  $('dvList').value.split(/[,\n]/).forEach(function(x){ x=x.trim(); if(x&&!seen[x.toLowerCase()]){ seen[x.toLowerCase()]=1; list.push(x.slice(0,60)); } });
  if(!list.length) return toast(T('선택지를 하나 이상 쓰세요'));
  pushUndo(); sh.dv=sh.dv.filter(function(d){ return !dvOverlap(g,d); }); sh.dv.push({r1:g.r1,c1:g.c1,r2:g.r2,c2:g.c2,list:list}); closeDlgs(); changed(); toast(T('드롭다운 목록을 만들었어요'));
};
$('dvOff').onclick=function(){ var g=JSON.parse($('dvRg').dataset.g||'null'); if(!g) return closeDlgs(); pushUndo(); sh.dv=sh.dv.filter(function(d){ return !dvOverlap(g,d); }); closeDlgs(); changed(); toast(T('목록을 없앴어요')); };

/* ---------- v10: notes, decimals ---------- */
function editNote(){
  var k=K(act.r,act.c), cell=sh.cells[k]||{};
  ask(T('메모'),T('이 칸에 붙일 메모를 쓰세요. 비우면 메모가 지워져요'),cell.nt||'').then(function(v){
    if(v===null) return; v=v.trim().slice(0,500); pushUndo(); var x=sh.cells[k]||(sh.cells[k]={});
    if(v) x.nt=v; else delete x.nt; if(x.v==null&&!hasFmt(x)) delete sh.cells[k]; changed(); });
}
function nfLabel(nf){ var m=/^([npd])(\d)$/.exec(nf||''); if(!m) return nf; var z=+m[2]?'.'+'0'.repeat(+m[2]):''; return m[1]==='n'?'1,234'+z:m[1]==='p'?'12'+z+'%':'1234'+z; }
function stepDecimals(dir){
  var cell=sh.cells[K(act.r,act.c)]||{}, v=eng.value(doc.active,act.r,act.c), nf=cell.nf||'', m=/^([npd])(\d)$/.exec(nf), kind, dc;
  if(typeof v!=='number') return toast(T('숫자가 든 칸에서 쓰세요'));
  if(m){ kind=m[1]; dc=+m[2]; } else if(!nf){ kind='d'; var g=E.fmtGeneral(v); dc=/e/.test(g)?0:(g.split('.')[1]||'').length; } else return toast(T('이 표시 형식은 소수점을 바꿀 수 없어요'));
  var nd=Math.max(0,Math.min(9,dc+dir)), val=kind+nd; fmtSel(function(x){ x.nf=val; });
}

/* ---------- v10: templates ---------- */
function tplSheet(name){ return newSheet(name); }
function put(s,r,c,v,f){ var x=Object.assign({},f||{}); if(v!=null) x.v=String(v); s.cells[K(r,c)]=x; }
var HD={b:1,bg:'#2b3550',fc:'#ffd76a',bd:1,al:'c'};
function wrapDoc(name,s){ return {v:1,name:name,active:0,sheets:[s]}; }
var TPLS=[
 {id:'grade',ico:'📝',name:'성적표',desc:'과목 점수를 넣으면 합계·평균·등수가 자동으로 나와요. 60점 미만은 빨갛게 보여요.',build:function(){
   var s=tplSheet(T('성적표')), hd=['이름','국어','영어','수학','과학','합계','평균','등수'], sc=[[85,92,78,88],[70,65,82,59],[95,88,91,97],[55,72,60,68],[88,79,93,84],[62,58,75,70],[91,96,89,94],[77,81,66,73]], r, c;
   hd.forEach(function(h,i){ put(s,0,i,T(h),HD); });
   for(r=0;r<8;r++){ var n=r+2; put(s,r+1,0,T('학생')+(r+1),{bd:1}); for(c=0;c<4;c++) put(s,r+1,c+1,sc[r][c],{bd:1,al:'c'});
     put(s,r+1,5,'=SUM(B'+n+':E'+n+')',{bd:1,al:'c'}); put(s,r+1,6,'=ROUND(AVERAGE(B'+n+':E'+n+'),1)',{bd:1,al:'c',nf:'d1'}); put(s,r+1,7,'=RANK(F'+n+',$F$2:$F$9)',{bd:1,al:'c'}); }
   put(s,9,0,T('과목 평균'),{b:1,bd:1,bg:'#2b3550',fc:'#ffd76a'}); for(c=1;c<=6;c++){ var L=E.colName(c); put(s,9,c,'=ROUND(AVERAGE('+L+'2:'+L+'9),1)',{b:1,bd:1,al:'c',nf:'d1'}); }
   s.cfs.push({r1:1,c1:1,r2:8,c2:4,t:'rule',op:'lt',a:'60',b:'',col:CFCOL[0]},{r1:1,c1:5,r2:8,c2:5,t:'bar'}); s.fr=1; s.fc=1; s.cw[0]=96;
   return wrapDoc(T('성적표'),s); }},
 {id:'budget',ico:'💰',name:'가계부',desc:'수입과 지출을 적으면 합계와 잔액이 나와요. 구분은 목록에서 골라요.',build:function(){
   var s=tplSheet(T('가계부')), hd=['날짜','구분','항목','금액','메모'], inc=T('수입'), exp=T('지출'), t0=new Date(), r;
   hd.forEach(function(h,i){ put(s,0,i,T(h),HD); });
   var rows=[[inc,'용돈',30000],[exp,'간식',3500],[exp,'문구',4200],[exp,'교통',2800],[inc,'세뱃돈',50000],[exp,'책',12000]];
   for(r=0;r<rows.length;r++){ var d=new Date(Date.UTC(t0.getFullYear(),t0.getMonth(),t0.getDate()-(rows.length-r))); put(s,r+1,0,E.dateStr(d),{bd:1,al:'c'}); put(s,r+1,1,rows[r][0],{bd:1,al:'c'}); put(s,r+1,2,T(rows[r][1]),{bd:1}); put(s,r+1,3,rows[r][2],{bd:1,nf:'w0'}); put(s,r+1,4,'',{bd:1}); delete s.cells[K(r+1,4)].v; }
   put(s,0,6,T('수입 합계'),HD); put(s,0,7,'=SUMIF(B:B,"'+inc+'",D:D)',{bd:1,nf:'w0',b:1});
   put(s,1,6,T('지출 합계'),HD); put(s,1,7,'=SUMIF(B:B,"'+exp+'",D:D)',{bd:1,nf:'w0',b:1});
   put(s,2,6,T('잔액'),HD); put(s,2,7,'=H1-H2',{bd:1,nf:'w0',b:1});
   s.dv.push({r1:1,c1:1,r2:300,c2:1,list:[inc,exp]}); s.cfs.push({r1:1,c1:1,r2:300,c2:1,t:'rule',op:'eq',a:inc,b:'',col:CFCOL[2]},{r1:1,c1:1,r2:300,c2:1,t:'rule',op:'eq',a:exp,b:'',col:CFCOL[0]});
   s.cw[0]=104; s.cw[2]=130; s.cw[3]=104; s.cw[4]=140; s.cw[6]=104; s.cw[7]=110; s.fr=1; s.rows=Math.max(s.rows,100);
   return wrapDoc(T('가계부'),s); }},
 {id:'attend',ico:'✅',name:'출석부',desc:'칸을 눌러 체크하면 출석 횟수와 출석률이 자동으로 계산돼요. 80% 미만은 빨갛게 보여요.',build:function(){
   var s=tplSheet(T('출석부')), r, c; put(s,0,0,T('이름'),HD);
   for(c=1;c<=10;c++){ put(s,0,c,F('{0}회',c),HD); s.cw[c]=58; }
   put(s,0,11,T('출석'),HD); put(s,0,12,T('출석률'),HD);
   for(r=1;r<=10;r++){ put(s,r,0,T('학생')+r,{bd:1}); for(c=1;c<=10;c++) put(s,r,c,'FALSE',{cb:1,bd:1,al:'c'});
     put(s,r,11,'=COUNTIF(B'+(r+1)+':K'+(r+1)+',TRUE)',{bd:1,al:'c'}); put(s,r,12,'=L'+(r+1)+'/COUNTA($B$1:$K$1)',{bd:1,al:'c',nf:'p0'}); }
   put(s,11,0,T('출석 인원'),{b:1,bd:1,bg:'#2b3550',fc:'#ffd76a'}); for(c=1;c<=10;c++){ var L=E.colName(c); put(s,11,c,'=COUNTIF('+L+'2:'+L+'11,TRUE)',{b:1,bd:1,al:'c'}); }
   s.cfs.push({r1:1,c1:12,r2:10,c2:12,t:'rule',op:'lt',a:'0.8',b:'',col:CFCOL[0]}); s.fr=1; s.fc=1; s.cw[0]=96; s.cw[12]=70;
   return wrapDoc(T('출석부'),s); }},
 {id:'timetable',ico:'🗓️',name:'시간표',desc:'요일별 교시 칸이 있는 빈 시간표예요. 과목을 적고 채우기 색으로 꾸며 보세요.',build:function(){
   var s=tplSheet(T('시간표')), days=['월','화','수','목','금'], per=['1교시','2교시','3교시','4교시','점심','5교시','6교시'], r, c;
   put(s,0,0,'',HD); days.forEach(function(d,i){ put(s,0,i+1,T(d),HD); s.cw[i+1]=108; }); s.cw[0]=76;
   per.forEach(function(p,i){ var lunch=p==='점심'; put(s,i+1,0,T(p),HD); for(c=1;c<=5;c++){ if(lunch) put(s,i+1,c,T('점심'),{bd:1,al:'c',bg:'#2a2f3d',fc:'#8a93a6'}); else put(s,i+1,c,null,{bd:1,al:'c'}); } });
   s.fr=1; s.fc=1; return wrapDoc(T('시간표'),s); }}
];
function openTpl(){
  var g=$('tplGrid'); g.innerHTML='';
  TPLS.forEach(function(t){ var b=document.createElement('button'); b.className='tplCard'; b.innerHTML='<b></b><span></span>'; b.firstChild.textContent=t.ico+' '+T(t.name); b.lastChild.textContent=T(t.desc);
    b.onclick=function(){ var d=t.build(); saveNow(); var id=uid(); if(!lsSet(LSD+id,JSON.stringify(d))) return toast(T('저장 공간이 가득 찼어요')); loadDoc(id); saveNow(); closeDlgs(); toast(F('"{0}" 템플릿으로 새 문서를 만들었어요',T(t.name))); };
    g.appendChild(b); });
  openDlg('tplDlg');
}

/* ---------- v12: merged cells, per-side borders ---------- */
function mergeCmd(){
  var m0=mergeAt(act.r,act.c), g=growMerges(Object.assign({},sel));
  if(m0&&(sel.r1===sel.r2&&sel.c1===sel.c2||(g.r1===m0.r1&&g.c1===m0.c1&&g.r2===m0.r2&&g.c2===m0.c2))){
    pushUndo(); sh.merges=sh.merges.filter(function(x){ return x!==m0; }); buildGrid(); changed(); return toast(T('병합을 풀었어요')); }
  if(g.r1===g.r2&&g.c1===g.c2) return toast(T('두 칸 이상 고르세요'));
  pushUndo(); var lost=0;
  for(var r=g.r1;r<=g.r2;r++) for(var c=g.c1;c<=g.c2;c++){ if(r===g.r1&&c===g.c1) continue; var k=K(r,c), x=sh.cells[k]; if(x){ if(x.v!=null&&x.v!=='') lost++; delete sh.cells[k]; } }
  sh.merges=sh.merges.filter(function(x){ return x.r2<g.r1||x.r1>g.r2||x.c2<g.c1||x.c1>g.c2; }); sh.merges.push({r1:g.r1,c1:g.c1,r2:g.r2,c2:g.c2});
  sel=g; act={r:g.r1,c:g.c1}; anchor={r:g.r1,c:g.c1}; buildGrid(); changed(); overlay(); toast(lost?T('병합했어요. 왼쪽 위 칸의 내용만 남아요'):T('병합했어요'));
}
/* border sides live in cell.bx = {t|r|b|l: {c:color, w:px}}; a side is written on both cells that share the edge */
function putSide(r,c,side,val){
  if(r<0||c<0||r>=MAXR||c>=MAXC) return;
  var m=sh.merges.length?mergeAt(r,c):null;
  if(m){ if((side==='t'&&r!==m.r1)||(side==='b'&&r!==m.r2)||(side==='l'&&c!==m.c1)||(side==='r'&&c!==m.c2)) return; r=m.r1; c=m.c1; }
  var k=K(r,c), x=sh.cells[k];
  if(val){ if(!x) x=sh.cells[k]={}; x.bx=x.bx||{}; x.bx[side]={c:val.c,w:val.w}; }
  else if(x&&x.bx){ delete x.bx[side]; if(!Object.keys(x.bx).length) delete x.bx; if(x.v==null&&!hasFmt(x)) delete sh.cells[k]; }
}
function setSide(r,c,side,val){ putSide(r,c,side,val); var f=FACING[side]; putSide(r+f[1],c+f[2],f[0],val); }
function applyBorder(kind){
  var g=Object.assign({},sel), col=$('bdColor').value, w=+$('bdW').value||1, val={c:col,w:w};
  if(kind==='none'){
    pushUndo();
    for(var k in sh.cells){ var rc=E.RC(k); if(rc[0]<g.r1||rc[0]>g.r2||rc[1]<g.c1||rc[1]>g.c2) continue; var x=sh.cells[k]; delete x.bd; if(x.bx){ delete x.bx; if(x.v==null&&!hasFmt(x)) delete sh.cells[k]; } }
    for(var r0=g.r1;r0<=g.r2;r0++){ putSide(r0,g.c1-1,'r',null); putSide(r0,g.c2+1,'l',null); }
    for(var c0=g.c1;c0<=g.c2;c0++){ putSide(g.r1-1,c0,'b',null); putSide(g.r2+1,c0,'t',null); }
    changed(); return toast(T('테두리를 없앴어요'));
  }
  if((g.r2-g.r1+1)*(g.c2-g.c1+1)>30000) return toast(T('범위가 너무 커요'));
  pushUndo();
  for(var r=g.r1;r<=g.r2;r++) for(var c=g.c1;c<=g.c2;c++){
    var top=r===g.r1, bot=r===g.r2, lef=c===g.c1, rig=c===g.c2;
    if(kind==='all'||(kind==='outer'&&top)||(kind==='top'&&top)||(kind==='inner'&&!top)) setSide(r,c,'t',val);
    if(kind==='all'||(kind==='outer'&&bot)||(kind==='bottom'&&bot)||(kind==='inner'&&!bot)) setSide(r,c,'b',val);
    if(kind==='all'||(kind==='outer'&&lef)||(kind==='left'&&lef)||(kind==='inner'&&!lef)) setSide(r,c,'l',val);
    if(kind==='all'||(kind==='outer'&&rig)||(kind==='right'&&rig)||(kind==='inner'&&!rig)) setSide(r,c,'r',val);
  }
  changed();
}
var BDSW=['#ffc93c','#ffffff','#ff5d5d','#3fe08f','#4fa0ff','#a78bfa','#8b94a8'];
BDSW.forEach(function(c,i){ var b=document.createElement('button'); b.className='sw'+(i?'':' on'); b.style.background=c; b.setAttribute('aria-label',T('색')+' '+(i+1)); b.style.width=b.style.height='34px';
  b.onclick=function(){ $('bdColor').value=c; Array.prototype.forEach.call($('bdSw').children,function(x,j){ x.classList.toggle('on',j===i); }); }; $('bdSw').appendChild(b); });
$('bdColor').addEventListener('input',function(){ Array.prototype.forEach.call($('bdSw').children,function(x){ x.classList.remove('on'); }); });
function openBorder(){ commitEdit(); $('bdRg').textContent=E.rangeStr(growMerges(Object.assign({},sel))); openDlg('bdDlg'); }
$('bdDlg').querySelector('.bdGrid').addEventListener('click',function(e){ var b=e.target.closest('[data-b]'); if(b) applyBorder(b.dataset.b); });

/* ---------- v15: mini bars, sparklines, icon sets ---------- */
var CFXCOL=['#ffc93c','#3fe08f','#4fa0ff','#ff5d8f','#a78bfa'], cfxSel=0, cfxG=null;
CFXCOL.forEach(function(c,i){ var b=document.createElement('button'); b.className='sw'+(i?'':' on'); b.style.background=c; b.setAttribute('aria-label',T('색')+' '+(i+1));
  b.onclick=function(){ cfxSel=i; Array.prototype.forEach.call($('cfxSw').children,function(x,j){ x.classList.toggle('on',j===i); }); }; $('cfxSw').appendChild(b); });
function cfxUi(){ var t=$('cfxType').value, sp=t==='spark'||t==='sparkc', ic=t==='arrows'||t==='lights';
  $('cfxSparkOpt').style.display=sp?'':'none'; $('cfxColOpt').style.display=ic?'none':''; $('cfxIcoOpt').style.display=ic?'':'none'; }
$('cfxType').addEventListener('change',cfxUi);
function openCfViz(){
  commitEdit(); cfxG=(sel.r1===sel.r2&&sel.c1===sel.c2)?(region(act.r,act.c)||{r1:act.r,c1:act.c,r2:act.r,c2:act.c}):Object.assign({},sel);
  if(cfxG.r2-cfxG.r1>2000) cfxG.r2=cfxG.r1+2000; $('cfxRg').textContent=E.rangeStr(cfxG); $('cfxDc').value=E.colName(cfxG.c2+1); cfxUi(); drawCfxList(); openDlg('cfxDlg');
}
var CFXNAME={mbar:'미니 막대',spark:'스파크라인 · 꺾은선',sparkc:'스파크라인 · 막대',arrows:'화살표 아이콘',lights:'신호등 아이콘'};
function cfxKind(f){ return f.t==='mbar'?'mbar':f.t==='spark'?(f.kind==='col'?'sparkc':'spark'):f.set; }
function drawCfxList(){
  var l=$('cfxList'); l.innerHTML=''; var any=false;
  sh.cfs.forEach(function(f){ if(f.t!=='mbar'&&f.t!=='spark'&&f.t!=='icons') return; any=true; var d=document.createElement('div'); d.className='cfItem'; d.setAttribute('data-notr','');
    var k=cfxKind(f), txt=T(CFXNAME[k])+'  '+E.rangeStr(f)+(f.t==='spark'?'  → '+E.colName(f.dc):'');
    d.innerHTML='<i class="sq"></i><span></span><button class="ib tbtn" style="height:32px" aria-label="지우기">×</button>';
    if(f.t==='icons'){ d.firstChild.style.background='linear-gradient(90deg,'+ICOL.join(',')+')'; } else d.firstChild.style.background=f.col||'#ffc93c';
    d.children[1].textContent=txt; d.lastChild.title=T('지우기');
    d.lastChild.onclick=function(){ pushUndo(); sh.cfs=sh.cfs.filter(function(x){ return x!==f; }); changed(); drawCfxList(); }; l.appendChild(d); });
  if(!any) l.innerHTML='<div class="empty" style="padding:12px">'+T('아직 없어요')+'</div>';
}
$('cfxAdd').onclick=function(){
  var g=cfxG, t=$('cfxType').value; if(!g) return; var o={r1:g.r1,c1:g.c1,r2:g.r2,c2:g.c2};
  if(t==='mbar'){ o.t='mbar'; o.col=CFXCOL[cfxSel]; }
  else if(t==='spark'||t==='sparkc'){
    var a=E.parseAddr($('cfxDc').value.trim().replace(/[^A-Za-z]/g,'')+'1'); if(!a) return toast(T('표시할 열을 알 수 없어요. 예: F'));
    if(a.c>=g.c1&&a.c<=g.c2) return toast(T('고른 범위 밖의 열을 고르세요'));
    if(a.c>=MAXC) return toast(T('열이 너무 많아져요'));
    o.t='spark'; o.kind=t==='sparkc'?'col':'line'; o.dc=a.c; o.col=CFXCOL[cfxSel]; growTo(g.r2,a.c);
  } else {
    var p1=parseFloat($('cfxP1').value), p2=parseFloat($('cfxP2').value); if(!(p1>=0&&p2<=100&&p1<p2)) return toast(T('기준은 0~100 사이, 노랑이 초록보다 작아야 해요'));
    o.t='icons'; o.set=t; o.p1=p1; o.p2=p2; o.rev=$('cfxRev').checked;
  }
  pushUndo(); sh.cfs=sh.cfs.filter(function(f){ if(f.t!==o.t) return true; if(o.t==='spark') return !(f.r1===o.r1&&f.c1===o.c1&&f.r2===o.r2&&f.c2===o.c2&&f.dc===o.dc); return !(f.r1===o.r1&&f.c1===o.c1&&f.r2===o.r2&&f.c2===o.c2); });
  sh.cfs.push(o); changed(); drawCfxList(); toast(T('넣었어요'));
};
$('cfDlg').querySelector('#cfViz').onclick=function(){ closeDlgs(); openCfViz(); };

/* ---------- v14: data cleaning (remove duplicates, split text, trim) ---------- */
function cleanRange(){ return (sel.r1===sel.r2&&sel.c1===sel.c2)?region(act.r,act.c):Object.assign({},sel); }
function rawText(r,c){ var x=sh.cells[K(r,c)]; if(!x||x.v==null) return ''; var raw=String(x.v); if(raw[0]==='=') return E.formatValue(eng.value(doc.active,r,c),x.nf); return raw[0]==="'"?raw.slice(1):raw; }
var dpG=null;
function dpFillCols(){
  var hdr=$('dpHdr').checked, g=dpG, si=doc.active, keep={}, l=$('dpCols');
  Array.prototype.forEach.call(l.querySelectorAll('input'),function(i){ keep[i.value]=i.checked; }); l.innerHTML='';
  for(var c=g.c1;c<=g.c2;c++){ var lb=document.createElement('label'), t=hdr?E.formatValue(eng.value(si,g.r1,c)):''; lb.className='dpCol'; lb.setAttribute('data-notr','');
    lb.innerHTML='<input type="checkbox"><span></span>'; lb.firstChild.value=c; lb.firstChild.checked=keep[c]!==false; lb.lastChild.textContent=E.colName(c)+(t?' · '+t:''); l.appendChild(lb); }
}
function openDedupe(){
  commitEdit(); var g=cleanRange(); if(!g||g.r2<=g.r1) return toast(T('중복을 지울 표를 먼저 고르세요'));
  if(g.r2-g.r1>20000) g.r2=g.r1+20000; dpG=g; $('dpRg').textContent=sh.name+'!'+E.rangeStr(g); $('dpHdr').checked=hasHeader(g);
  $('dpCols').innerHTML=''; dpFillCols(); openDlg('dpDlg');
}
$('dpHdr').addEventListener('change',dpFillCols);
$('dpAll').onclick=function(){ Array.prototype.forEach.call($('dpCols').querySelectorAll('input'),function(i){ i.checked=true; }); };
$('dpNone').onclick=function(){ Array.prototype.forEach.call($('dpCols').querySelectorAll('input'),function(i){ i.checked=false; }); };
$('dpOk').onclick=function(){
  var g=dpG; if(!g) return; var hdr=$('dpHdr').checked, si=doc.active, r0=g.r1+(hdr?1:0), cols=[];
  Array.prototype.forEach.call($('dpCols').querySelectorAll('input'),function(i){ if(i.checked) cols.push(+i.value); });
  if(!cols.length) return toast(T('열을 하나 이상 고르세요'));
  var rows=[]; for(var r=r0;r<=g.r2;r++){ var row=[]; cols.forEach(function(c){ row[c]=eng.value(si,r,c); }); rows.push(row); }
  var keep=E.dedupeRows(rows,cols), gone=keep.filter(function(k){ return !k; }).length;
  if(!gone){ closeDlgs(); return toast(T('중복된 줄이 없어요')); }
  if(guard(g)){ return; }
  pushUndo(); closeDlgs();
  var kept=[]; keep.forEach(function(k,i){ if(!k) return; var r=r0+i, cs=[]; for(var c=g.c1;c<=g.c2;c++){ var x=sh.cells[K(r,c)]; cs.push(x?JSON.parse(JSON.stringify(x)):null); } kept.push({r:r,cs:cs}); });
  for(r=r0;r<=g.r2;r++) for(var c2=g.c1;c2<=g.c2;c2++) delete sh.cells[K(r,c2)];
  kept.forEach(function(o,i){ o.cs.forEach(function(x,j){ if(!x) return; if(x.v!=null&&String(x.v)[0]==='='&&o.r!==r0+i) x.v=E.shiftFormula(x.v,r0+i-o.r,0); sh.cells[K(r0+i,g.c1+j)]=x; }); });
  sel={r1:g.r1,c1:g.c1,r2:g.r1+(hdr?1:0)+kept.length-1,c2:g.c2}; act={r:g.r1,c:g.c1}; anchor={r:g.r1,c:g.c1};
  changed(); applyFilter(); toast(F('중복 {0}줄을 지웠어요 ({1}줄 남음)',gone,kept.length));
};
var spG=null;
function spDelims(){ var d=[]; if($('spComma').checked) d.push(','); if($('spSemi').checked) d.push(';'); if($('spTab').checked) d.push('\t'); if($('spSpace').checked) d.push(' '); if($('spOther').checked&&$('spCustom').value) d.push($('spCustom').value); return d; }
function spParts(txt){ return E.splitText(txt,spDelims(),$('spMerge').checked,$('spTrim').checked); }
function spPreview(){
  var g=spG; if(!g) return; var t=null; for(var r=g.r1;r<=g.r2;r++){ var x=rawText(r,g.c1); if(x!==''){ t=x; break; } }
  var el=$('spPrev'); el.textContent=t==null?'':spParts(t).map(function(p){ return p===''?'·':p; }).join('  |  ');
}
function openSplit(){
  commitEdit(); var g;
  if(sel.r1===sel.r2&&sel.c1===sel.c2){ g={r1:act.r,c1:act.c,r2:act.r,c2:act.c}; while(g.r2+1<sh.rows&&rawText(g.r2+1,act.c)!=='') g.r2++; }
  else g={r1:sel.r1,c1:sel.c1,r2:sel.r2,c2:sel.c1};
  if(rawText(g.r1,g.c1)===''&&g.r1===g.r2) return toast(T('나눌 글자가 든 칸을 먼저 고르세요'));
  spG=g; $('spRg').textContent=sh.name+'!'+E.rangeStr(g)+(sel.c2>sel.c1?'  ('+T('첫 번째 열만 나눠요')+')':''); spPreview(); openDlg('spDlg');
}
['spComma','spSemi','spTab','spSpace','spOther','spMerge','spTrim'].forEach(function(id){ $(id).addEventListener('change',spPreview); });
$('spCustom').addEventListener('input',function(){ if(this.value) $('spOther').checked=true; spPreview(); });
$('spOk').onclick=function(){
  var g=spG; if(!g) return; if(!spDelims().length) return toast(T('나눌 기준을 하나 이상 고르세요'));
  var rows=[], maxN=1, over=0; for(var r=g.r1;r<=g.r2;r++){ var t=rawText(r,g.c1), p=t===''?[]:spParts(t); rows.push(p); if(p.length>maxN) maxN=p.length; }
  if(maxN<2){ closeDlgs(); return toast(T('나눌 곳이 없어요. 기준을 확인하세요')); }
  if(g.c1+maxN>MAXC) return toast(T('열이 너무 많아져요'));
  rows.forEach(function(p,i){ for(var j=1;j<p.length;j++){ var x=sh.cells[K(g.r1+i,g.c1+j)]; if(x&&x.v!=null&&x.v!=='') over++; } });
  if(guard({r1:g.r1,c1:g.c1,r2:g.r2,c2:g.c1+maxN-1})) return;
  function go(){
    pushUndo(); closeDlgs();
    rows.forEach(function(p,i){ p.forEach(function(v,j){ var raw=v!==''&&/^[=']/.test(v)?"'"+v:v; setRaw(g.r1+i,g.c1+j,raw); }); });
    growTo(g.r2,g.c1+maxN-1); sel={r1:g.r1,c1:g.c1,r2:g.r2,c2:g.c1+maxN-1}; act={r:g.r1,c:g.c1}; anchor={r:g.r1,c:g.c1}; changed(); toast(F('{0}줄을 {1}개 열로 나눴어요',g.r2-g.r1+1,maxN));
  }
  if(over){ closeDlgs(); confirmDlg(F('오른쪽 칸 {0}개의 내용을 덮어써요. 계속할까요?',over)).then(function(ok){ if(ok) go(); }); } else go();
};
function trimCells(){
  commitEdit(); var g=cleanRange(); if(!g) return toast(T('정리할 데이터가 없어요'));
  var n=0, todo=[]; for(var k in sh.cells){ var rc=E.RC(k); if(rc[0]<g.r1||rc[0]>g.r2||rc[1]<g.c1||rc[1]>g.c2) continue; var x=sh.cells[k]; if(x.v==null||typeof x.v!=='string') continue;
    var raw=x.v; if(raw[0]==='=') continue; var pre=raw[0]==="'"?"'":'', body=pre?raw.slice(1):raw, nb=E.trimText(body); if(nb!==body) todo.push([x,pre+nb]); }
  if(!todo.length) return toast(T('정리할 공백이 없어요'));
  if(guard(g)) return;
  pushUndo(); todo.forEach(function(o){ o[0].v=o[1]; n++; }); changed(); toast(F('{0}칸의 공백을 정리했어요',n)+' ('+E.rangeStr(g)+')');
}

/* ---------- v13: named ranges ---------- */
function findName(n){ var u=String(n||'').toUpperCase(); return doc.names.filter(function(x){ return x.name.toUpperCase()===u; })[0]||null; }
function setName(name,ref){
  pushUndo(); var u=name.toUpperCase(), i=-1; doc.names.forEach(function(n,j){ if(n.name.toUpperCase()===u) i=j; });
  if(i>=0) doc.names[i]={name:name,ref:ref}; else doc.names.push({name:name,ref:ref});
  changed(); return i>=0;
}
function goName(nd){
  var p=E.parseNameRef(nd.ref), si=p?eng.sheetIndex(p.sh,doc.active):-1; if(!p||si<0) return toast(T('이 이름이 가리키는 범위가 없어요'));
  if(si!==doc.active) switchSheet(si);
  selectRange({r1:p.col?0:p.a.r,c1:p.a.c,r2:p.col?sh.rows-1:p.b.r,c2:p.b.c});
}
function nameBadMsg(bad){ return bad==='cell'?'칸 주소처럼 보이는 이름은 쓸 수 없어요':bad==='function'?'함수 이름과 같은 이름은 쓸 수 없어요':'이름은 글자로 시작하고 글자·숫자·_ 만 쓸 수 있어요'; }
function drawNames(){
  var l=$('nmList'); l.innerHTML='';
  doc.names.forEach(function(n){ var d=document.createElement('div'); d.className='cfItem'; d.setAttribute('data-notr','');
    d.innerHTML='<span class="nmN"></span><span class="nmR"></span><button class="ib tbtn nmGo" style="height:32px" aria-label="이동">→</button><button class="ib tbtn" style="height:32px" aria-label="이름 바꾸기">✎</button><button class="ib tbtn" style="height:32px" aria-label="지우기">×</button>';
    d.children[0].textContent=n.name; d.children[1].textContent=n.ref.replace(/\$/g,''); d.children[2].title=T('이동'); d.children[3].title=T('이름 바꾸기'); d.children[4].title=T('지우기');
    d.children[0].onclick=d.children[1].onclick=function(){ $('nmName').value=n.name; $('nmRef').value=n.ref.replace(/\$/g,''); };
    d.children[2].onclick=function(){ closeDlgs(); goName(n); };
    d.children[3].onclick=function(){ ask(T('이름 바꾸기'),'',n.name).then(function(v){ v=(v||'').trim(); if(!v||v===n.name) return;
      var bad=E.validName(v); if(bad) return toast(T(nameBadMsg(bad))); var ex=findName(v); if(ex&&ex!==n) return toast(T('같은 이름이 이미 있어요'));
      pushUndo(); var old=n.name; doc.sheets.forEach(function(s){ for(var k in s.cells){ var c=s.cells[k]; if(c.v&&String(c.v)[0]==='=') c.v=E.renameNameInFormula(c.v,old,v); } }); n.name=v; changed(); drawNames(); toast(F('"{0}" 이름으로 바꿨어요',v)); }); };
    d.children[4].onclick=function(){ pushUndo(); doc.names=doc.names.filter(function(x){ return x!==n; }); changed(); drawNames(); };
    l.appendChild(d); });
  if(!doc.names.length) l.innerHTML='<div class="empty" style="padding:12px">'+T('아직 이름이 없어요')+'</div>';
}
function openNames(){ commitEdit(); $('nmName').value=''; $('nmRef').value=E.rangeStr(sel); drawNames(); openDlg('nmDlg',$('nmName')); }
$('nmUse').onclick=function(){ $('nmRef').value=E.rangeStr(sel); };
$('nmSave').onclick=function(){
  var name=$('nmName').value.trim(), bad=E.validName(name);
  if(bad) return toast(T(nameBadMsg(bad)));
  var ref=E.nameRef($('nmRef').value,sh.name); if(!ref) return toast(T('범위를 알 수 없어요. 예: A2:A10'));
  if(!findName(name)&&doc.names.length>=200) return toast(T('이름은 200개까지 만들 수 있어요'));
  var upd=setName(name,ref); drawNames(); $('nmName').value=''; toast(F(upd?'"{0}" 이름을 바꿨어요':'"{0}" 이름을 만들었어요',name));
};
$('nmName').addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); $('nmSave').click(); } });
$('nmRef').addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); $('nmSave').click(); } });

/* ---------- v11: data menu, pivot table ---------- */
function dataCmd(d){
  if(d==='pivot') return openPivot();
  if(d==='names') return openNames();
  if(d==='dedupe') return openDedupe();
  if(d==='pvRefresh') return pvRefresh();
  if(d==='xref') return openXref();
  if(d==='lockSel'||d==='unlockSel'||d==='lockSheet'||d==='unlockSheet') return lockCmd(d);
  if(d==='split') return openSplit();
  if(d==='trim') return trimCells();
}
var pvG=null, PVAGG=['sum','avg','count','max','min'], PVLAB={sum:'합계',avg:'평균',count:'개수',max:'최댓값',min:'최솟값'};
function pvFillCols(){
  var hdr=$('pvHdr').checked, g=pvG, si=doc.active, keep={}, kv=$('pvVal').value, l=$('pvKeys');
  Array.prototype.forEach.call(l.querySelectorAll('input'),function(i){ keep[i.value]=i.checked; }); l.innerHTML=''; $('pvVal').innerHTML='';
  for(var c=g.c1;c<=g.c2;c++){ var t=hdr?E.formatValue(eng.value(si,g.r1,c)):'', nm=E.colName(c)+(t?' · '+t:'');
    var lb=document.createElement('label'); lb.className='dpCol'; lb.setAttribute('data-notr',''); lb.innerHTML='<input type="checkbox"><span></span>'; lb.firstChild.value=c; lb.firstChild.checked=keep[c]===undefined?c===g.c1:keep[c]; lb.lastChild.textContent=nm; l.appendChild(lb);
    var o=document.createElement('option'); o.value=c; o.textContent=nm; $('pvVal').appendChild(o); }
  if(kv!==''&&$('pvVal').querySelector('option[value="'+kv+'"]')) $('pvVal').value=kv;
}
function openPivot(){
  commitEdit(); var g=(sel.r1===sel.r2&&sel.c1===sel.c2)?region(act.r,act.c):Object.assign({},sel);
  if(!g||g.r2<=g.r1) return toast(T('피벗으로 만들 표를 먼저 고르세요'));
  if(g.r2-g.r1>5000) g.r2=g.r1+5000;
  pvG=g; $('pvRg').textContent=sh.name+'!'+E.rangeStr(g); $('pvHdr').checked=hasHeader(g);
  $('pvKeys').innerHTML=''; $('pvVal').innerHTML=''; $('pvVal').value=''; pvFillCols();
  var vc=g.c2, si=doc.active;
  for(var c=g.c1+1;c<=g.c2;c++){ if(typeof eng.value(si,g.r1+1,c)==='number'){ vc=c; break; } }
  $('pvVal').value=vc; openDlg('pvDlg');
}
$('pvHdr').addEventListener('change',pvFillCols);
/* a pivot sheet remembers how it was made (sh.pv: source ref, header flag, key / value columns as offsets in the source, aggregate, sort), so "새로 고침" can rebuild it */
function pvCompute(def){
  var p=E.parseNameRef(def.ref), si=p?eng.sheetIndex(p.sh,0):-1; if(!p||si<0||p.col) return null;
  var g={r1:Math.min(p.a.r,p.b.r),c1:Math.min(p.a.c,p.b.c),r2:Math.max(p.a.r,p.b.r),c2:Math.max(p.a.c,p.b.c)}, kcs=def.keys.map(function(o){ return g.c1+o; }), vc=g.c1+def.vo, rows=[], r;
  if(vc>g.c2||kcs.some(function(c){ return c>g.c2; })) return null;
  for(r=g.r1+(def.hdr?1:0);r<=g.r2;r++){ var row=[]; kcs.forEach(function(c){ row[c]=eng.value(si,r,c); }); row[vc]=eng.value(si,r,vc); rows.push(row); }
  if(!rows.length) return null;
  var head=function(c){ return def.hdr?E.formatValue(eng.value(si,g.r1,c)):F('{0}열',E.colName(c)); };
  return {res:E.pivot(rows,kcs,vc,def.agg,def.sort),kh:kcs.map(head),vh:head(vc)};
}
function pvFill(ns,def,o){
  var nk=def.keys.length, lab=T(PVLAB[def.agg]||'합계'), nf=def.agg==='avg'?'n2':'', num=function(v){ return v==null?'':E.fmtGeneral(+v.toPrecision(12)); };
  ns.cells={}; o.kh.forEach(function(h,i){ put(ns,0,i,h,HD); }); put(ns,0,nk,lab+' · '+o.vh,HD);
  o.res.rows.forEach(function(x,i){ for(var j=0;j<nk;j++){ var kt=x[j]===''?T('(빈 칸)'):E.formatValue(x[j]); put(ns,i+1,j,/^[='@+\-]/.test(kt)&&typeof x[j]==='string'?"'"+kt:kt,{bd:1}); }
    var f={bd:1,al:'r'}; if(nf) f.nf=nf; put(ns,i+1,nk,num(x[nk]),f); });
  var n=o.res.rows.length+1, tf={b:1,bd:1,bg:'#2b3550',fc:'#ffd76a'}; put(ns,n,0,T('총합계'),tf); for(var j=1;j<nk;j++) put(ns,n,j,null,tf); var tv=Object.assign({al:'r'},tf); if(nf) tv.nf=nf; put(ns,n,nk,num(o.res.total),tv);
  for(j=0;j<nk;j++) ns.cw[j]=ns.cw[j]||150; ns.cw[nk]=ns.cw[nk]||170; ns.fr=1; ns.rows=Math.max(ROWS,n+20); ns.pv=def;
}
$('pvOk').onclick=function(){
  var g=pvG; if(!g) return; var keys=[];
  Array.prototype.forEach.call($('pvKeys').querySelectorAll('input'),function(i){ if(i.checked) keys.push(+i.value-g.c1); });
  if(!keys.length) return toast(T('묶을 열을 하나 이상 고르세요'));
  var ref=E.nameRef(E.rangeStr(g),sh.name), def={ref:ref,hdr:$('pvHdr').checked,keys:keys,vo:+$('pvVal').value-g.c1,agg:$('pvAgg').value,sort:$('pvSort').value}, o=pvCompute(def);
  if(!o) return toast(T('피벗으로 만들 표를 먼저 고르세요'));
  pushUndo(); closeDlgs();
  var ns=newSheet(uniqueName(T('피벗'))); pvFill(ns,def,o);
  doc.sheets.push(ns); eng=new E.Engine(doc); switchSheet(doc.sheets.length-1); saveSoon(); toast(F('{0}개 항목으로 피벗을 만들었어요',o.res.rows.length));
};
function pvRefresh(){
  commitEdit(); if(!sh.pv) return toast(T('피벗 시트에서만 쓸 수 있어요'));
  var o=pvCompute(sh.pv); if(!o) return toast(T('원본 표를 찾을 수 없어요. 피벗을 다시 만드세요'));
  if(guard({r1:0,c1:0,r2:sh.rows,c2:sh.cols})) return;
  pushUndo(); eng=new E.Engine(doc); pvFill(sh,sh.pv,o); buildGrid(); sel={r1:0,c1:0,r2:0,c2:0}; act={r:0,c:0}; anchor={r:0,c:0}; overlay(); updateBar(); saveSoon(); toast(F('{0}개 항목으로 피벗을 새로 고쳤어요',o.res.rows.length));
}

/* ---------- v21: protection, cross-sheet helper ---------- */
function lockCmd(d){
  commitEdit();
  if(d==='lockSel'){
    if(sh.lock&&sh.lock.all) return toast(T('시트 전체가 이미 잠겨 있어요'));
    if(E.lockAny(sh.lock,sel)&&(sh.lock.rg||[]).some(function(g){ return g.r1<=sel.r1&&g.c1<=sel.c1&&g.r2>=sel.r2&&g.c2>=sel.c2; })) return toast(T('이미 잠겨 있어요'));
    if(sh.lock&&sh.lock.rg.length>=200) return toast(T('잠금 범위는 200개까지 만들 수 있어요'));
    pushUndo(); sh.lock=sh.lock||{all:0,rg:[]}; sh.lock.rg.push({r1:sel.r1,c1:sel.c1,r2:sel.r2,c2:sel.c2}); changed(); return toast(F('{0} 범위를 잠갔어요',E.rangeStr(sel)));
  }
  if(d==='unlockSel'){
    if(sh.lock&&sh.lock.all) return toast(T('시트 전체가 잠겨 있어요. "시트 잠금 모두 풀기"를 먼저 하세요'));
    if(!E.lockAny(sh.lock,sel)) return toast(T('잠긴 칸이 없어요'));
    pushUndo(); sh.lock.rg=E.lockCut(sh.lock.rg,sel); if(!sh.lock.rg.length) delete sh.lock; changed(); return toast(F('{0} 범위의 잠금을 풀었어요',E.rangeStr(sel)));
  }
  if(d==='lockSheet'){ if(sh.lock&&sh.lock.all) return toast(T('시트 전체가 이미 잠겨 있어요')); pushUndo(); sh.lock=sh.lock||{all:0,rg:[]}; sh.lock.all=1; renderTabs(); changed(); return toast(T('시트 전체를 잠갔어요')); }
  if(d==='unlockSheet'){ if(!sh.lock) return toast(T('잠긴 칸이 없어요')); pushUndo(); delete sh.lock; renderTabs(); changed(); return toast(T('시트의 잠금을 모두 풀었어요')); }
}
function xrSheets(){
  var l=$('xrSheet'); l.innerHTML=''; doc.sheets.forEach(function(s,i){ var o=document.createElement('option'); o.value=i; o.textContent=s.name; l.appendChild(o); });
  l.value=doc.sheets.length>1?(doc.active===0?1:0):doc.active; $('xrFn').value='';
}
function xrBuild(){
  var si=+$('xrSheet').value, s=doc.sheets[si], t=$('xrRg').value.trim().replace(/\$/g,'').toUpperCase(), ok=false, txt='';
  if(s){ var toks=E.tokenize(t).filter(function(x){ return x.t!=='ws'; }); ok=toks.length===1&&(toks[0].t==='ref'||toks[0].t==='rng')&&toks[0].sh==null&&!toks[0].dead; if(ok) txt='='+E.quoteSheet(s.name)+'!'+t; }
  var fn=$('xrFn').value; $('xrOut').textContent=ok?(fn?'='+fn+'('+txt.slice(1)+')':txt):T('범위를 알 수 없어요. 예: A2:A10'); $('xrOut').classList.toggle('bad',!ok); return ok?txt:null;
}
function openXref(){
  commitEdit(); xrSheets(); $('xrRg').value=E.rangeStr(sel); $('xrOut').classList.remove('bad'); xrBuild(); openDlg('xrDlg',$('xrRg'));
}
$('xrSheet').addEventListener('change',xrBuild); $('xrRg').addEventListener('input',xrBuild);
$('xrUse').onclick=function(){ var si=+$('xrSheet').value; if(si===doc.active){ $('xrRg').value=E.rangeStr(sel); xrBuild(); } else { closeDlgs(); switchSheet(si); toast(T('범위를 고른 뒤 데이터 메뉴에서 다시 열어 주세요')); } };
function xrFormula(){ var f=xrBuild(); if(!f) return null; var fn=$('xrFn').value; return fn?'='+fn+'('+f.slice(1)+')':f; }
$('xrFn').addEventListener('change',xrBuild);
$('xrIns').onclick=function(){
  var f=xrFormula(); if(!f) return toast(T('범위를 알 수 없어요. 예: A2:A10'));
  if(guard(cellBox(act.r,act.c))) return;
  closeDlgs(); pushUndo(); setRaw(act.r,act.c,f); changed(); toast(F('{0} 에 수식을 넣었어요',E.addr(act.r,act.c)));
};
$('xrCopy').onclick=function(){ var f=xrFormula(); if(!f) return toast(T('범위를 알 수 없어요. 예: A2:A10')); try{ navigator.clipboard.writeText(f).catch(function(){}); }catch(e){} toast(T('복사했어요')); };
$('xrRg').addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); $('xrIns').click(); } });

/* ---------- start ---------- */
window.addEventListener('pointerdown',function(e){ mouseMode=e.pointerType==='mouse'; },true);
window.addEventListener('beforeunload',function(){ if(editing) commitEdit(); saveNow(); });
document.addEventListener('visibilitychange',function(){ if(document.hidden) saveNow(); });
var z0=parseFloat(lsGet('ffsheet.zoom')); if(ZS.indexOf(z0)<0) z0=('ontouchstart' in window)&&innerWidth<700?.9:1;
var last=lsGet(LSL);
// the old first-visit example ("예시: 성적표") is no longer shipped; drop it once if it was never renamed
if(!lsGet('ffsheet.noex')){ var EXN=['예시: 성적표','Example: report card','Ejemplo: boletín','Exemple : bulletin','Beispiel: Zeugnis','例: 成績表'];
  docIndex().forEach(function(x){ if(EXN.indexOf(x.name)>=0){ lsDel(LSD+x.id); lsSet(LSI,JSON.stringify(docIndex().filter(function(y){ return y.id!==x.id; }))); if(last===x.id) last=null; } });
  lsSet('ffsheet.noex','1'); if(!last){ var rest0=docIndex(); last=rest0.length?rest0[0].id:null; } }
var opn=/^#open=([a-z0-9]{4,40})$/.exec(location.hash||''); // ../sheet/#open=<id>: a doc another tool (Fry Lab) wrote; show it with its charts
if(opn){ try{ history.replaceState(null,'',location.pathname+location.search); }catch(e){} if(lsGet(LSD+opn[1])) last=opn[1]; else opn=null; }
if(!last||!lsGet(LSD+last)){ loadDoc(null); saveNow(); } else loadDoc(last);
setZoom(z0);
if(opn&&sh.charts.length) setTimeout(openDrawer,0);
window.FSAPI={run:runCmd, get doc(){ return doc; }, get eng(){ return eng; }, get sheet(){ return sh; }, sel:function(){ return sel; }, act:function(){ return act; }, region:region, hasHeader:hasHeader,
  drawChart:drawChart, chartData:chartData, PAL:PAL, toast:toast, download:download, commitEdit:commitEdit, uid:uid, pushUndo:pushUndo, saveSoon:saveSoon, openDrawer:openDrawer, renderCharts:renderCharts,
  markAI:function(r1,c1,r2,c2){ for(var r=r1;r<=r2;r++) for(var c=c1;c<=c2;c++){ var x=sh.cells[K(r,c)]; if(x&&x.v!=null&&x.v!==''){ x.ai=1; delete x.ar; } } },
  changed:changed, setRaw:function(r,c,v){ if(locked(r,c)) return toast(T('잠긴 칸이라 고칠 수 없어요. 데이터 메뉴에서 잠금을 풀 수 있어요')); return setRaw(r,c,v); }, pasteText:pasteText, selectRange:selectRange, select:select, forSel:forSel};
window.__fs={urlOpt:urlOpt, parseCSV:parseCSV, sniffDelim:sniffDelim, csvRaw:csvRaw, get doc(){ return doc; }, get eng(){ return eng; }, select:select, cmd:cmd, run:runCmd, sel:function(){ return sel; }, act:function(){ return act; }, setRaw:setRaw, changed:changed, startEdit:startEdit, commitEdit:commitEdit};
})();
