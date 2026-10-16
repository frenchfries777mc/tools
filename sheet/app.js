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
function newSheet(name){ return {name:name, cells:{}, cw:{}, rows:ROWS, cols:COLS, cfs:[], charts:[]}; }
function newDoc(){ return {v:1, name:T('새 시트'), active:0, sheets:[newSheet(T('시트')+'1')]}; }
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function fixDoc(d){
  if(!d||!d.sheets||!d.sheets.length) return newDoc();
  d.sheets.forEach(function(s){ s.cells=s.cells||{}; s.cw=s.cw||{}; s.cfs=s.cfs||[]; s.charts=s.charts||[]; s.rows=Math.max(s.rows||ROWS,10); s.cols=Math.max(s.cols||COLS,5); });
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
function snap(){ return JSON.stringify({a:doc.active,s:doc.sheets}); }
function pushUndo(){ undoS.push(snap()); if(undoS.length>80) undoS.shift(); redoS=[]; }
function restore(s){ var o=JSON.parse(s); doc.sheets=o.s; doc.active=Math.min(o.a,o.s.length-1); fixDoc(doc); eng=new E.Engine(doc); switchSheet(doc.active,true); saveSoon(); }
function undo(){ commitEdit(); if(!undoS.length) return toast(T('되돌릴 작업이 없어요')); redoS.push(snap()); restore(undoS.pop()); }
function redo(){ commitEdit(); if(!redoS.length) return; undoS.push(snap()); restore(redoS.pop()); }

/* ---------- grid build ---------- */
function cw(c){ return sh.cw[c]||DEF_W; }
function buildGrid(){
  var h='<col style="width:46px">'; for(var c=0;c<sh.cols;c++) h+='<col style="width:'+cw(c)+'px">'; colsEl.innerHTML=h;
  h='<th class="corner"></th>'; for(c=0;c<sh.cols;c++) h+='<th data-c="'+c+'">'+E.colName(c)+'<span class="rz" data-rz="'+c+'"></span></th>'; hrow.innerHTML=h;
  var rowTpl=''; for(c=0;c<sh.cols;c++) rowTpl+='<td></td>';
  var parts=[]; for(var r=0;r<sh.rows;r++) parts.push('<tr><th>'+(r+1)+'</th>'+rowTpl+'</tr>');
  gbody.innerHTML=parts.join(''); painted=new Set(); paintAll();
}
function tdAt(r,c){ var tr=gbody.rows[r]; return tr?tr.cells[c+1]:null; }
function growTo(r,c){
  var ch=false;
  if(r>=sh.rows&&sh.rows<MAXR){ sh.rows=Math.min(MAXR,Math.max(r+1,sh.rows+50)); ch=true; }
  if(c>=sh.cols&&sh.cols<MAXC){ sh.cols=Math.min(MAXC,Math.max(c+1,sh.cols+10)); ch=true; }
  if(ch){ buildGrid(); saveSoon(); }
}

/* ---------- painting ---------- */
function cfCompute(){
  cfStats=sh.cfs.map(function(f){
    var lo=Infinity, hi=-Infinity;
    for(var r=f.r1;r<=f.r2;r++) for(var c=f.c1;c<=f.c2;c++){ var v=eng.value(doc.active,r,c); if(typeof v==='number'){ if(v<lo) lo=v; if(v>hi) hi=v; } }
    return {f:f,lo:lo,hi:hi};
  });
}
function mix(a,b,t){ return [0,1,2].map(function(i){ return Math.round(a[i]+(b[i]-a[i])*t); }); }
function scaleColor(t){ var R=[235,87,87], Y=[255,201,60], G=[63,200,120]; var c=t<.5?mix(R,Y,t*2):mix(Y,G,(t-.5)*2); return 'rgba('+c.join(',')+',.42)'; }
function paintCell(r,c){
  var td=tdAt(r,c); if(!td) return;
  var k=K(r,c), cell=sh.cells[k], v=cell?eng.value(doc.active,r,c):null;
  var cls='', st=td.style;
  if(E.isErr(v)) cls='err'; else if(typeof v==='number') cls='num'; else if(typeof v==='boolean') cls='ctr';
  if(cell&&cell.al) cls+=' al-'+cell.al;
  if(cell&&cell.cb&&!E.isErr(v)){ td.innerHTML='<span class="cb'+(v===true?' on':'')+'" data-cb="1"></span>'; cls='ctr'+(cell.al?' al-'+cell.al:''); }
  else td.textContent=E.formatValue(v,cell&&cell.nf);
  td.className=cls+(r===act.r&&c===act.c?' act':'');
  st.fontWeight=cell&&cell.b?'700':''; st.fontStyle=cell&&cell.i?'italic':''; st.color=cell&&cell.fc||'';
  var bg=cell&&cell.bg||'', bgi='';
  for(var i=0;i<cfStats.length;i++){ var s=cfStats[i], f=s.f;
    if(r<f.r1||r>f.r2||c<f.c1||c>f.c2||typeof v!=='number'||!(s.hi>=s.lo)) continue;
    var t=s.hi===s.lo?1:(v-s.lo)/(s.hi-s.lo);
    if(f.t==='scale') bg=scaleColor(t);
    else { var lo0=Math.min(0,s.lo), t2=s.hi===lo0?1:(v-lo0)/(s.hi-lo0); bgi='linear-gradient(90deg,rgba(255,170,60,.55) '+(t2*100).toFixed(1)+'%,transparent '+(t2*100).toFixed(1)+'%)'; }
  }
  st.backgroundColor=bg; st.backgroundImage=bgi;
  if(cell) painted.add(k); else painted.delete(k);
}
function paintAll(){
  eng.reset(); cfCompute();
  var keys=new Set(painted); for(var k in sh.cells) keys.add(+k);
  keys.forEach(function(k){ var rc=E.RC(k); if(rc[0]<sh.rows&&rc[1]<sh.cols) paintCell(rc[0],rc[1]); else painted.delete(k); });
}
function changed(){ paintAll(); overlay(); updateBar(); saveSoon(); if($('drawer').classList.contains('open')) renderCharts(); }

/* ---------- selection & overlay ---------- */
function norm(a,b){ return {r1:Math.min(a.r,b.r),c1:Math.min(a.c,b.c),r2:Math.max(a.r,b.r),c2:Math.max(a.c,b.c)}; }
var anchor={r:0,c:0};
function select(r,c,extend){
  r=Math.max(0,r); c=Math.max(0,c); growTo(r,c); r=Math.min(r,sh.rows-1); c=Math.min(c,sh.cols-1);
  var old=tdAt(act.r,act.c); if(old) old.classList.remove('act');
  if(extend){ sel=norm(anchor,{r:r,c:c}); act={r:r,c:c}; act={r:anchor.r,c:anchor.c}; }
  else { anchor={r:r,c:c}; act={r:r,c:c}; sel={r1:r,c1:c,r2:r,c2:c}; }
  overlay(); updateBar(); scrollTo(extend?r:act.r,extend?c:act.c);
}
function selectRange(g){ var old=tdAt(act.r,act.c); if(old) old.classList.remove('act'); growTo(g.r2,g.c2); sel={r1:g.r1,c1:g.c1,r2:Math.min(g.r2,sh.rows-1),c2:Math.min(g.c2,sh.cols-1)}; act={r:sel.r1,c:sel.c1}; anchor={r:act.r,c:act.c}; overlay(); updateBar(); scrollTo(act.r,act.c); }
function box(el,g){
  var a=tdAt(g.r1,g.c1), b=tdAt(g.r2,g.c2); if(!a||!b){ el.style.display='none'; return; }
  el.style.display='block'; el.style.left=(a.offsetLeft-1)+'px'; el.style.top=(a.offsetTop-1)+'px';
  el.style.width=(b.offsetLeft+b.offsetWidth-a.offsetLeft+1)+'px'; el.style.height=(b.offsetTop+b.offsetHeight-a.offsetTop+1)+'px';
}
function overlay(){
  var single=sel.r1===sel.r2&&sel.c1===sel.c2;
  box($('selBox'),sel); $('selBox').style.background=single?'transparent':'';
  box($('actBox'),{r1:act.r,c1:act.c,r2:act.r,c2:act.c}); $('actBox').style.display=single?'none':'block';
  var b=tdAt(sel.r2,sel.c2), fh=$('fillH');
  if(b&&!editing){ fh.style.display='block'; fh.style.left=(b.offsetLeft+b.offsetWidth-7)+'px'; fh.style.top=(b.offsetTop+b.offsetHeight-7)+'px'; } else fh.style.display='none';
  var td=tdAt(act.r,act.c); if(td) td.classList.add('act');
  var ths=hrow.cells; for(var i=1;i<ths.length;i++) ths[i].classList.toggle('hl',i-1>=sel.c1&&i-1<=sel.c2);
  hl.forEach(function(t){ t.classList.remove('hl'); }); hl=[];
  for(var r=sel.r1;r<=Math.min(sel.r2,sel.r1+400);r++){ var th=gbody.rows[r]&&gbody.rows[r].cells[0]; if(th){ th.classList.add('hl'); hl.push(th); } }
  if(!editing) placeGhost();
  stats();
}
var hl=[];
function scrollTo(r,c){
  var td=tdAt(r,c); if(!td) return;
  var z=zoom, x=td.offsetLeft*z, y=td.offsetTop*z, w=td.offsetWidth*z, h=td.offsetHeight*z, hw=46*z, hh=hrow.offsetHeight*z;
  if(x-hw<wrap.scrollLeft) wrap.scrollLeft=x-hw; else if(x+w>wrap.scrollLeft+wrap.clientWidth) wrap.scrollLeft=x+w-wrap.clientWidth;
  if(y-hh<wrap.scrollTop) wrap.scrollTop=y-hh; else if(y+h>wrap.scrollTop+wrap.clientHeight) wrap.scrollTop=y+h-wrap.clientHeight;
}
function selName(){ return E.rangeStr(sel); }
function updateBar(){
  nameBox.value=selName();
  if(!editing||editing.src!=='bar'){ var c=sh.cells[K(act.r,act.c)]; fin.value=c&&c.v!=null?c.v:''; }
  var cell=sh.cells[K(act.r,act.c)]||{};
  $('bBold').classList.toggle('on',!!cell.b); $('bItal').classList.toggle('on',!!cell.i);
  $('nfSel').value=cell.nf||'';
}
function stats(){
  var el=$('stats'), n=(sel.r2-sel.r1+1)*(sel.c2-sel.c1+1);
  if(n<2||n>200000){ el.innerHTML=''; return; }
  var cnt=0, num=0, sum=0, mn=Infinity, mx=-Infinity;
  for(var k in sh.cells){ var rc=E.RC(k); if(rc[0]<sel.r1||rc[0]>sel.r2||rc[1]<sel.c1||rc[1]>sel.c2) continue;
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
  var e=editing, val=edInput().value; editing=null; refDrag=null; $('refBox').style.display='none'; refMode();
  if(val!==e.orig){
    pushUndo();
    if(val.length&&val[0]==='='&&val.length>1) val=closeParens(val);
    setRaw(e.r,e.c,val);
  }
  ed.value=''; ed.className='ghost';
  if(move) select(e.r+move[0],e.c+move[1]); else { overlay(); }
  changed(); return true;
}
function cancelEdit(){ if(!editing) return; editing=null; refMode(); ed.value=''; ed.className='ghost'; refDrag=null; $('refBox').style.display='none'; updateBar(); overlay(); }
function closeParens(s){ var o=0, q=false; for(var i=0;i<s.length;i++){ var ch=s[i]; if(ch==='"') q=!q; else if(!q){ if(ch==='(') o++; else if(ch===')') o--; } } while(o-->0) s+=')'; return s; }
function setRaw(r,c,val){
  var k=K(r,c), cell=sh.cells[k];
  if(val===''||val==null){ if(cell){ delete cell.v; if(!hasFmt(cell)) delete sh.cells[k]; } return; }
  if(!cell) cell=sh.cells[k]={}; cell.v=val; growTo(r,c);
}
function hasFmt(c){ return c.b||c.i||c.fc||c.bg||c.al||c.nf||c.cb; }
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
  if(!editing){ var v=ed.value; startEdit(v,true); return; }
  refDrag=null; $('refBox').style.display='none'; fit(); fin.value=ed.value; refMode();
});
ed.addEventListener('compositionstart',function(){ if(!editing){ startEdit('',true); } });
fin.addEventListener('focus',function(){ if(editing&&editing.src==='cell'){ var v=ed.value; editing.src='bar'; ed.className='ghost'; fin.value=v; } else if(!editing){ startEdit(null,false,'bar'); fin.value=(sh.cells[K(act.r,act.c)]||{}).v||''; } });
fin.addEventListener('input',function(){ refDrag=null; syncFromBar(); refMode(); });
nameBox.addEventListener('keydown',function(e){
  if(e.key!=='Enter') return; e.preventDefault(); var g=E.parseRange(nameBox.value.trim());
  if(g){ selectRange(g); nameBox.blur(); } else { toast(T('주소를 알 수 없어요')); nameBox.value=selName(); }
});
nameBox.addEventListener('focus',function(){ commitEdit(); setTimeout(function(){ nameBox.select(); },0); });

/* ---------- keyboard ---------- */
function dlgOpen(){ return !!document.querySelector('.ov.open'); }
document.addEventListener('keydown',function(e){
  if(dlgOpen()){ if(e.key==='Escape') closeDlgs(); return; }
  closeMenus();
  var t=e.target, mod=e.ctrlKey||e.metaKey;
  if(isOtherInput(t)&&t!==nameBox) return;
  if(t===nameBox) return;
  if(editing){
    if(e.isComposing||e.keyCode===229) return;
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
    else select(act.r+d[0],act.c+d[1]); return; }
  if(k==='Enter'){ e.preventDefault(); select(act.r+(e.shiftKey?-1:1),act.c); return; }
  if(k==='Tab'){ e.preventDefault(); select(act.r,act.c+(e.shiftKey?-1:1)); return; }
  if(k==='Delete'||k==='Backspace'){ e.preventDefault(); clearSel(); return; }
  if(k==='F2'){ e.preventDefault(); startEdit(null,false); return; }
  if(k==='Escape'){ return; }
  if(mod){
    var l=k.toLowerCase();
    if(l==='z'&&!e.shiftKey){ e.preventDefault(); undo(); return; }
    if(l==='y'||(l==='z'&&e.shiftKey)){ e.preventDefault(); redo(); return; }
    if(l==='b'){ e.preventDefault(); cmd('bold'); return; }
    if(l==='i'){ e.preventDefault(); cmd('italic'); return; }
    if(l==='a'){ e.preventDefault(); selectRange({r1:0,c1:0,r2:sh.rows-1,c2:sh.cols-1}); return; }
    if(l==='f'||l==='h'){ e.preventDefault(); cmd('find'); return; }
    return;
  }
  if(k.length===1&&document.activeElement!==ed){ e.preventDefault(); startEdit(k,true); }
});
var lastExt={r:0,c:0};
function extendTo(r,c){ r=Math.max(0,r); c=Math.max(0,c); growTo(r,c); r=Math.min(r,sh.rows-1); c=Math.min(c,sh.cols-1); lastExt={r:r,c:c}; sel=norm(anchor,lastExt); act={r:anchor.r,c:anchor.c}; overlay(); updateBar(); scrollTo(r,c); }
function jump(d){ var r=act.r, c=act.c, has=function(r,c){ var x=sh.cells[K(r,c)]; return x&&x.v!=null&&x.v!==''; };
  var maxR=sh.rows-1, maxC=sh.cols-1, cur=has(r,c), nr=r+d[0], nc=c+d[1];
  if(nr<0||nc<0||nr>maxR||nc>maxC) return;
  if(cur&&has(nr,nc)){ while(nr+d[0]>=0&&nc+d[1]>=0&&nr+d[0]<=maxR&&nc+d[1]<=maxC&&has(nr+d[0],nc+d[1])){ nr+=d[0]; nc+=d[1]; } }
  else { while(!has(nr,nc)&&nr+d[0]>=0&&nc+d[1]>=0&&nr+d[0]<=maxR&&nc+d[1]<=maxC){ nr+=d[0]; nc+=d[1]; } }
  select(nr,nc);
}
function clearSel(){ pushUndo(); forSel(function(r,c){ setRaw(r,c,''); }); changed(); }
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
      sel=norm(anchor,{r:r,c:sh.cols-1}); act={r:anchor.r,c:0}; overlay(); updateBar(); drag={mode:'rows',id:e.pointerId}; if(e.pointerType==='mouse') e.preventDefault(); } return; }
  var p=cellFromEl(e.target); if(!p) return;
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
  var rz=e.target.dataset.rz; if(rz!=null){ e.preventDefault(); e.stopPropagation(); commitEdit(); drag={mode:'rz',c:+rz,x:e.clientX,w:cw(+rz),id:e.pointerId}; try{ hrow.setPointerCapture(e.pointerId); }catch(_){} return; }
  var th=e.target.closest('th[data-c]'); if(!th) return; var c=+th.dataset.c;
  commitEdit(); if(!e.shiftKey) anchor={r:0,c:c}; sel=norm({r:0,c:anchor.c},{r:sh.rows-1,c:c}); act={r:0,c:anchor.c}; overlay(); updateBar(); drag={mode:'cols',id:e.pointerId};
  if(e.pointerType==='mouse') e.preventDefault();
});
$('fillH').addEventListener('pointerdown',function(e){ e.preventDefault(); e.stopPropagation(); commitEdit(); drag={mode:'fill',src:Object.assign({},sel),dst:null,id:e.pointerId}; try{ e.target.setPointerCapture(e.pointerId); }catch(_){} });
var autoT=null, lastPt=null;
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
  e.preventDefault(); lastPt={x:e.clientX,y:e.clientY}; moveDrag(e.clientX,e.clientY);
  if(!autoT&&drag.mode!=='rz') autoT=requestAnimationFrame(autoScroll);
},{passive:false});
function endDrag(e,cancel){
  var d=drag, dn=down; drag=null; down=null; lastPt=null;
  if(d&&d.mode==='rz'){ buildGrid(); overlay(); saveSoon(); return; }
  if(d&&d.mode==='fill'){ $('fillBox').style.display='none'; if(d.dst&&!cancel) doFill(d.src,d.dst); return; }
  if(d&&d.mode==='ref') return;
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

function toggleCheck(r,c){ var cell=sh.cells[K(r,c)]; if(!cell) return; var v=eng.value(doc.active,r,c); if(String(cell.v||'')[0]==='=') return toast(T('수식이 든 칸은 체크할 수 없어요')); pushUndo(); cell.v=v===true?'FALSE':'TRUE'; changed(); }

/* ---------- fill ---------- */
function incText(s,n){ var m=/^([\s\S]*?)(\d+)(\D*)$/.exec(s); if(!m) return null; var num=String(+m[2]+n); while(num.length<m[2].length) num='0'+num; return m[1]+num+m[3]; }
function doFill(s,d){
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
      else if(raw!=null&&typeof E.literal(raw)==='string'){ var cyc=Math.floor(off/len); var it=len===1?incText(String(raw),off):null; if(it!=null) nc.v=it; }
      sh.cells[k]=nc;
    }
  });
  var old=tdAt(act.r,act.c); if(old) old.classList.remove('act');
  sel=norm({r:d.r1,c:d.c1},{r:d.r2,c:d.c2}); growTo(sel.r2,sel.c2); changed();
}

/* ---------- clipboard ---------- */
var clip=null;
function selTSV(){ var rows=[]; for(var r=sel.r1;r<=sel.r2;r++){ var a=[]; for(var c=sel.c1;c<=sel.c2;c++){ var cell=sh.cells[K(r,c)]; a.push(cell?E.formatValue(eng.value(doc.active,r,c),cell.nf):''); } rows.push(a.join('\t')); } return rows.join('\n'); }
function grab(cut){
  var cells=[]; for(var r=sel.r1;r<=sel.r2;r++){ var row=[]; for(var c=sel.c1;c<=sel.c2;c++){ var x=sh.cells[K(r,c)]; row.push(x?JSON.parse(JSON.stringify(x)):null); } cells.push(row); }
  clip={cells:cells,r:sel.r1,c:sel.c1,tsv:selTSV(),cut:cut?{si:doc.active,g:Object.assign({},sel)}:null};
  return clip.tsv;
}
function pasteInternal(){
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
  pushUndo(); rows.forEach(function(row,i){ row.forEach(function(v,j){ setRaw(act.r+i,act.c+j,v); }); });
  var w=Math.max.apply(null,rows.map(function(r){ return r.length; }));
  growTo(act.r+rows.length-1,act.c+w-1); sel={r1:act.r,c1:act.c,r2:Math.min(sh.rows-1,act.r+rows.length-1),c2:Math.min(sh.cols-1,act.c+w-1)}; changed();
}
function doPaste(text){ if(clip&&(text==null||text.replace(/\r/g,'')===clip.tsv)) pasteInternal(); else if(text!=null&&text!=='') pasteText(text); }
document.addEventListener('copy',function(e){ if(editing||isOtherInput(document.activeElement)) return; e.preventDefault(); e.clipboardData.setData('text/plain',grab(false)); toast(T('복사했어요')); });
document.addEventListener('cut',function(e){ if(editing||isOtherInput(document.activeElement)) return; e.preventDefault(); e.clipboardData.setData('text/plain',grab(true)); toast(T('잘라냈어요. 붙여넣을 곳을 고르세요')); });
document.addEventListener('paste',function(e){ if(editing||isOtherInput(document.activeElement)) return; e.preventDefault(); doPaste(e.clipboardData.getData('text/plain')); });

/* ---------- commands ---------- */
function fmtSel(fn){ pushUndo(); forSel(function(r,c){ var k=K(r,c), x=sh.cells[k]||(sh.cells[k]={}); fn(x); if(x.v==null&&!hasFmt(x)) delete sh.cells[k]; }); changed(); }
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
    case 'clearfmt': return fmtSel(function(x){ ['b','i','fc','bg','al','nf','cb'].forEach(function(p){ delete x[p]; }); });
    case 'check': { var on=!cur.cb; return fmtSel(function(x){ if(on){ x.cb=1; var l=E.literal(x.v); if(typeof l!=='boolean'&&String(x.v||'')[0]!=='=') x.v='FALSE'; } else { delete x.cb; } }); }
    case 'sum': return autoSum();
    case 'fn': return openFn();
    case 'sortA': return sortSel(true);
    case 'sortD': return sortSel(false);
    case 'find': return openDlg('findDlg',$('fFind'));
    case 'viz': if(window.FSViz) window.FSViz.open(); return;
    case 'ai': if(window.FSAI) window.FSAI.open(); return;
    case 'chart': openDrawer(); if(!(sel.r1===sel.r2&&sel.c1===sel.c2)||(!sh.charts.length&&region(act.r,act.c))) addChart(); return;
    case 'scale': case 'bars': return addCf(n==='scale'?'scale':'bar');
    case 'rowmenu': return openMenu($('rowMenu'),document.querySelector('[data-cmd=rowmenu]'));
  }
}
document.getElementById('ribbon').addEventListener('click',function(e){ var b=e.target.closest('[data-cmd]'); if(b) cmd(b.dataset.cmd); });
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
function sortSel(asc){
  var g=(sel.r1===sel.r2&&sel.c1===sel.c2)?region(act.r,act.c):Object.assign({},sel);
  if(!g) return toast(T('정렬할 데이터가 없어요'));
  if((sel.c1===0&&sel.c2===sh.cols-1)||(sel.r1===0&&sel.r2===sh.rows-1)){ var rg=region(act.r,act.c); if(rg) g=rg; }
  var start=g.r1+(hasHeader(g)?1:0); if(start>=g.r2) return;
  pushUndo(); var key=act.c, si=doc.active, rows=[];
  for(var r=start;r<=g.r2;r++){ var row=[]; for(var c=g.c1;c<=g.c2;c++) row.push(sh.cells[K(r,c)]||null); rows.push({row:row,v:eng.value(si,r,key),r:r}); }
  rows.sort(function(a,b){ var ea=a.v==null||a.v==='', eb=b.v==null||b.v===''; if(ea||eb) return ea===eb?0:ea?1:-1; var x=E.cmpVals(a.v,b.v); return asc?x:-x; });
  rows.forEach(function(o,i){ o.row.forEach(function(x,j){ var k=K(start+i,g.c1+j); if(!x){ delete sh.cells[k]; return; }
    if(x.v!=null&&String(x.v)[0]==='='&&o.r!==start+i){ x=JSON.parse(JSON.stringify(x)); x.v=E.shiftFormula(x.v,start+i-o.r,0); } sh.cells[k]=x; }); });
  changed(); toast(F('{0}열 기준으로 정렬했어요',E.colName(key)));
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
  doc.sheets.forEach(function(s){ for(var k in s.cells){ var cl=s.cells[k]; if(cl.v&&String(cl.v)[0]==='=') cl.v=E.adjustFormula(cl.v,s.name,name,isRow,at,count); } });
  if(!isRow){ var cwn={}; for(var c in sh.cw){ var x=+c; if(count>0){ if(x>=at) x+=count; } else { if(x>=at&&x<at-count) continue; if(x>=at-count) x+=count; } cwn[x]=sh.cw[c]; } sh.cw=cwn; }
  function adj(o){ var a=isRow?'r1':'c1', b=isRow?'r2':'c2';
    if(count>0){ if(o[a]>=at) o[a]+=count; if(o[b]>=at) o[b]+=count; return true; }
    var d=-count, e=at+d-1; if(o[b]<at) return true; if(o[a]>e){ o[a]-=d; o[b]-=d; return true; }
    var na=o[a]<at?o[a]:at, nb=o[b]>e?o[b]-d:at-1; if(nb<na) return false; o[a]=na; o[b]=nb; return true; }
  sh.cfs=sh.cfs.filter(adj); sh.charts=sh.charts.filter(adj);
  if(isRow) sh.rows=Math.max(10,Math.min(MAXR,sh.rows+count)); else sh.cols=Math.max(5,Math.min(MAXC,sh.cols+count));
  buildGrid();
}
function rowCmd(n){
  commitEdit(); closeMenus(); pushUndo();
  var nr=sel.r2-sel.r1+1, nc=sel.c2-sel.c1+1;
  if(n==='insRowA') structural(true,sel.r1,nr);
  else if(n==='insRowB') structural(true,sel.r2+1,nr);
  else if(n==='delRow') structural(true,sel.r1,-nr);
  else if(n==='insColL') structural(false,sel.c1,nc);
  else if(n==='insColR') structural(false,sel.c2+1,nc);
  else if(n==='delCol') structural(false,sel.c1,-nc);
  else if(n==='clearCf'){ var g=sel; sh.cfs=sh.cfs.filter(function(f){ return f.r2<g.r1||f.r1>g.r2||f.c2<g.c1||f.c1>g.c2; }); }
  sel={r1:Math.min(sel.r1,sh.rows-1),c1:Math.min(sel.c1,sh.cols-1),r2:Math.min(sel.r2,sh.rows-1),c2:Math.min(sel.c2,sh.cols-1)}; act={r:sel.r1,c:sel.c1};
  changed();
}
$('rowMenu').addEventListener('click',function(e){ var b=e.target.closest('[data-r]'); if(b) rowCmd(b.dataset.r); });
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
  doc.sheets.forEach(function(s,i){ var d=document.createElement('div'); d.className='tab'+(i===doc.active?' on':''); d.textContent=s.name; d.setAttribute('data-notr','');
    d.onclick=function(){ if(i===doc.active) openMenu($('tabMenu'),d,true); else { switchSheet(i); saveSoon(); } }; t.appendChild(d); });
}
function uniqueName(base){ var n=1, names=doc.sheets.map(function(s){ return s.name; }); while(names.indexOf(base+n)>=0) n++; return base+n; }
$('addTab').onclick=function(){ commitEdit(); pushUndo(); doc.sheets.push(newSheet(uniqueName(T('시트')))); switchSheet(doc.sheets.length-1); saveSoon(); };
$('tabMenu').addEventListener('click',function(e){
  var b=e.target.closest('[data-t]'); if(!b) return; closeMenus(); var i=doc.active;
  if(b.dataset.t==='rename') ask(T('시트 이름 바꾸기'),'',sh.name).then(function(v){ v=(v||'').trim().replace(/[\[\]:*?\/\\]/g,'').slice(0,31); if(!v||v===sh.name) return;
      if(doc.sheets.some(function(s){ return s.name===v; })) return toast(T('같은 이름의 시트가 있어요'));
      pushUndo(); var old=sh.name; doc.sheets.forEach(function(s){ for(var k in s.cells){ var c=s.cells[k]; if(c.v&&String(c.v)[0]==='=') c.v=E.renameSheetInFormula(c.v,old,v); } });
      sh.name=v; renderTabs(); changed(); });
  else if(b.dataset.t==='dup'){ pushUndo(); var c=JSON.parse(JSON.stringify(sh)); c.name=uniqueName(sh.name+' '); doc.sheets.splice(i+1,0,c); switchSheet(i+1); saveSoon(); }
  else if(b.dataset.t==='left'&&i>0){ pushUndo(); doc.sheets.splice(i-1,0,doc.sheets.splice(i,1)[0]); doc.active=i-1; renderTabs(); changed(); }
  else if(b.dataset.t==='right'&&i<doc.sheets.length-1){ pushUndo(); doc.sheets.splice(i+1,0,doc.sheets.splice(i,1)[0]); doc.active=i+1; renderTabs(); changed(); }
  else if(b.dataset.t==='del'){ if(doc.sheets.length<2) return toast(T('시트가 하나뿐이에요'));
    confirmDlg(F('"{0}" 시트를 지울까요?',sh.name)).then(function(ok){ if(!ok) return; pushUndo(); doc.sheets.splice(i,1); eng=new E.Engine(doc); switchSheet(Math.max(0,i-1)); saveSoon(); }); }
});

/* ---------- menus & dialogs ---------- */
function openMenu(m,anchorEl,up){
  var was=m.classList.contains('open'); closeMenus(); if(was) return;
  m.classList.add('open'); var r=anchorEl.getBoundingClientRect(), w=m.offsetWidth, h=m.offsetHeight;
  var x=Math.min(Math.max(8,r.left),innerWidth-w-8), y=up?r.top-h-6:r.bottom+6; if(y+h>innerHeight-8) y=Math.max(8,r.top-h-6); if(y<8) y=8;
  m.style.left=x+'px'; m.style.top=y+'px';
}
function closeMenus(){ document.querySelectorAll('.menu.open').forEach(function(m){ m.classList.remove('open'); }); }
document.addEventListener('pointerdown',function(e){ if(!e.target.closest('.menu')&&!e.target.closest('#fileBtn,[data-cmd=rowmenu],.tab')) closeMenus(); },true);
function openDlg(id,focusEl){ commitEdit(); $(id).classList.add('open'); if(focusEl) setTimeout(function(){ focusEl.focus(); },30); }
function closeDlgs(){ document.querySelectorAll('.ov.open').forEach(function(o){ o.classList.remove('open'); if(o.id==='askDlg'&&askRes){ var f=askRes; askRes=null; f(null); } }); overlay(); }
document.querySelectorAll('.ov').forEach(function(o){ o.addEventListener('click',function(e){ if(e.target===o||e.target.closest('[data-close]')) closeDlgs(); }); });
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
function findNext(){
  var q=$('fFind').value; if(!q) return; var ql=q.toLowerCase(), keys=Object.keys(sh.cells).map(Number).sort(function(a,b){ return a-b; });
  var cur=K(act.r,act.c), hit=null;
  function txt(k){ var rc=E.RC(k), c=sh.cells[k]; return (E.formatValue(eng.value(doc.active,rc[0],rc[1]),c.nf)+'\u0000'+(c.v||'')).toLowerCase(); }
  for(var i=0;i<keys.length;i++){ if(keys[i]>cur&&txt(keys[i]).indexOf(ql)>=0){ hit=keys[i]; break; } }
  if(hit==null) for(i=0;i<keys.length;i++){ if(txt(keys[i]).indexOf(ql)>=0){ hit=keys[i]; break; } }
  if(hit==null) return toast(T('찾는 내용이 없어요'));
  var rc=E.RC(hit); select(rc[0],rc[1]);
}
function escRe(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
$('fNext').onclick=findNext;
$('fOne').onclick=function(){ var q=$('fFind').value; if(!q) return; var c=sh.cells[K(act.r,act.c)];
  if(c&&c.v&&String(c.v).toLowerCase().indexOf(q.toLowerCase())>=0){ pushUndo(); c.v=String(c.v).replace(new RegExp(escRe(q),'i'),$('fRep').value); changed(); } findNext(); };
$('fAll').onclick=function(){ var q=$('fFind').value; if(!q) return; var re=new RegExp(escRe(q),'gi'), n=0; pushUndo();
  for(var k in sh.cells){ var c=sh.cells[k]; if(c.v&&re.test(String(c.v))){ re.lastIndex=0; c.v=String(c.v).replace(re,$('fRep').value); n++; } re.lastIndex=0; }
  changed(); toast(F('{0}칸을 바꿨어요',n)); };
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
function chartData(ch){
  var si=doc.active, v=function(r,c){ return eng.value(si,r,c); };
  var hdr=false, lab=false, r, c;
  if(ch.r2>ch.r1) for(c=ch.c1+(ch.c2>ch.c1?1:0);c<=ch.c2;c++){ var x=v(ch.r1,c); if(typeof x==='string'&&x!=='') hdr=true; }
  var lc=ch.c1, r0=ch.r1+(hdr?1:0);
  function textCol(c){ var t=0,n=0; for(var r=r0;r<=ch.r2;r++){ var y=v(r,c); if(typeof y==='string'&&y!=='') t++; else if(typeof y==='number') n++; } return t>0&&t>=n; }
  if(ch.c2>ch.c1&&textCol(ch.c1)){ lab=true; while(lc+1<ch.c2&&textCol(lc+1)) lc++; } // label = the last of the leading text columns
  var c0=lab?lc+1:ch.c1, labels=[], series=[];
  for(r=r0;r<=ch.r2;r++) labels.push(lab?E.formatValue(v(r,lc)):String(r-r0+1));
  for(c=c0;c<=ch.c2;c++){ var vals=[]; for(r=r0;r<=ch.r2;r++){ var z=v(r,c); vals.push(typeof z==='number'?z:(typeof z==='boolean'?(z?1:0):null)); }
    if(vals.some(function(x){ return x!=null; })) series.push({name:hdr?E.formatValue(v(ch.r1,c)):F('계열 {0}',c-c0+1),vals:vals}); }
  return {labels:labels,series:series};
}
function niceStep(range){ var e=Math.pow(10,Math.floor(Math.log10(range||1))), f=range/e; return (f<=1?1:f<=2?2:f<=5?5:10)*e; }
function drawChart(cv,ch){
  var dpr=Math.min(3,window.devicePixelRatio||1), W=cv.clientWidth||320, H=cv.clientHeight||220;
  cv.width=W*dpr; cv.height=H*dpr; var g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0);
  g.fillStyle='#08090d'; g.fillRect(0,0,W,H);
  var d=chartData(ch), font='12px "Noto Sans KR",sans-serif'; g.font=font; g.textBaseline='middle';
  var top=ch.title?30:12;
  if(ch.title){ g.fillStyle='#eef0f5'; g.font='600 14px "Noto Sans KR",sans-serif'; g.textAlign='center'; g.fillText(ch.title,W/2,15); g.font=font; }
  if(!d.series.length||!d.labels.length){ g.fillStyle='#8a93a6'; g.textAlign='center'; g.fillText(T('숫자 데이터가 없어요'),W/2,H/2); return; }
  // legend
  var lg=(ch.type==='scatter'?d.series.length>2:d.series.length>1)||ch.type==='pie', lx=10, ly=H-12;
  var items=ch.type==='pie'?d.labels:(ch.type==='scatter'&&d.series.length>1?d.series.slice(1):d.series).map(function(s){ return s.name; });
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
    d.innerHTML='<div class="row"><input class="ct" placeholder="차트 제목" data-notr><select data-notr><option value="bar">'+T('세로 막대')+'</option><option value="hbar">'+T('가로 막대')+'</option><option value="line">'+T('꺾은선')+'</option><option value="pie">'+T('원형')+'</option><option value="scatter">'+T('산점도')+'</option></select></div>'+
      '<canvas></canvas><div class="row" style="margin:8px 0 0"><span class="rg" data-notr></span><span style="flex:1"></span><button class="sm" data-a="rg">'+T('범위를 지금 선택으로')+'</button><button class="sm" data-a="png">PNG</button><button class="sm" data-a="del">'+T('지우기')+'</button></div>';
    var ti=d.querySelector('.ct'), sl=d.querySelector('select'), cv=d.querySelector('canvas');
    ti.placeholder=T('차트 제목'); ti.value=ch.title||''; sl.value=ch.type; d.querySelector('.rg').textContent=E.rangeStr(ch);
    ti.oninput=function(){ ch.title=ti.value; drawChart(cv,ch); saveSoon(); };
    sl.onchange=function(){ ch.type=sl.value; drawChart(cv,ch); saveSoon(); };
    d.querySelector('.rg').onclick=function(){ selectRange(ch); };
    d.addEventListener('click',function(e){ var a=e.target.dataset.a; if(!a) return;
      if(a==='del'){ pushUndo(); sh.charts=sh.charts.filter(function(x){ return x!==ch; }); saveSoon(); renderCharts(); }
      if(a==='rg'){ if(sel.r1===sel.r2&&sel.c1===sel.c2) return toast(T('차트로 만들 범위를 먼저 고르세요')); pushUndo(); ch.r1=sel.r1; ch.c1=sel.c1; ch.r2=Math.min(sel.r2,sel.r1+500); ch.c2=Math.min(sel.c2,sel.c1+20); saveSoon(); renderCharts(); }
      if(a==='png'){ cv.toBlob(function(b){ download(b,(ch.title||doc.name||'chart')+'.png'); }); } });
    body.appendChild(d); drawChart(cv,ch);
  });
}
window.addEventListener('resize',function(){ if($('drawer').classList.contains('open')) renderCharts(); overlay(); });

/* ---------- files ---------- */
function download(blob,name){ var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name.replace(/[\\/:*?"<>|]/g,'_'); document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },4000); }
var xlsxP=null;
function needXLSX(){ if(window.XLSX) return Promise.resolve(window.XLSX); if(xlsxP) return xlsxP;
  xlsxP=new Promise(function(res,rej){ var s=document.createElement('script'); s.src='xlsx.full.min.js'; s.onload=function(){ res(window.XLSX); }; s.onerror=function(){ xlsxP=null; rej(); }; document.head.appendChild(s); }); return xlsxP; }
function exportXLSX(){
  commitEdit(); toast(T('엑셀 파일을 만드는 중…'));
  needXLSX().then(function(X){
    var wb=X.utils.book_new(); eng.reset();
    doc.sheets.forEach(function(s,si){
      var ws={}, mr=0, mc=0;
      for(var k in s.cells){ var rc=E.RC(k), c=s.cells[k]; if(c.v==null||c.v==='') continue; var a=E.addr(rc[0],rc[1]), raw=String(c.v), o;
        if(raw[0]==='='&&c.nf!=='t'){ var v=eng.value(si,rc[0],rc[1]); o=E.isErr(v)?{t:'e',v:0,w:v.e}:typeof v==='number'?{t:'n',v:v}:typeof v==='boolean'?{t:'b',v:v}:{t:'s',v:v==null?'':String(v)}; o.f=raw.slice(1); }
        else { var l=c.nf==='t'?raw:E.literal(raw); o=typeof l==='number'?{t:'n',v:l}:typeof l==='boolean'?{t:'b',v:l}:{t:'s',v:String(l)}; }
        if(o.t==='n'&&c.nf){ o.z={n0:'#,##0',n2:'#,##0.00',p0:'0%',p1:'0.0%'}[c.nf]; }
        ws[a]=o; if(rc[0]>mr) mr=rc[0]; if(rc[1]>mc) mc=rc[1]; }
      ws['!ref']='A1:'+E.addr(mr,mc); var cols=[]; for(var c2=0;c2<=mc;c2++) cols.push({wpx:s.cw[c2]||DEF_W}); ws['!cols']=cols;
      var nm=s.name.replace(/[\[\]:*?\/\\]/g,'').slice(0,31)||('Sheet'+(si+1));
      X.utils.book_append_sheet(wb,ws,nm);
    });
    var out=X.write(wb,{bookType:'xlsx',type:'array'});
    download(new Blob([out],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),(doc.name||'sheet')+'.xlsx');
  },function(){ toast(T('엑셀 기능을 불러오지 못했어요')); });
}
function csvCell(s){ s=String(s); return /[",\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; }
function exportCSV(){
  commitEdit(); var mr=-1, mc=-1; for(var k in sh.cells){ var rc=E.RC(k); var c=sh.cells[k]; if(c.v==null||c.v==='') continue; if(rc[0]>mr) mr=rc[0]; if(rc[1]>mc) mc=rc[1]; }
  var lines=[]; for(var r=0;r<=mr;r++){ var a=[]; for(var c=0;c<=mc;c++){ var cell=sh.cells[K(r,c)]; a.push(csvCell(cell?E.formatValue(eng.value(doc.active,r,c),null):'')); } lines.push(a.join(',')); }
  download(new Blob(['﻿'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}),(doc.name||'sheet')+' - '+sh.name+'.csv');
}
function importFile(file){
  toast(T('파일을 여는 중…'));
  needXLSX().then(function(X){
    var rd=new FileReader();
    rd.onload=function(){
      try{
        var wb=X.read(new Uint8Array(rd.result),{type:'array',cellFormula:true,cellNF:true,cellDates:false});
        saveNow(); var d=newDoc(); d.name=file.name.replace(/\.[^.]+$/,''); d.sheets=[];
        wb.SheetNames.forEach(function(n){
          var ws=wb.Sheets[n], s=newSheet(n), ref=ws['!ref']; if(ref){ var g=X.utils.decode_range(ref);
            for(var R=g.s.r;R<=Math.min(g.e.r,MAXR-1);R++) for(var C=g.s.c;C<=Math.min(g.e.c,MAXC-1);C++){
              var c=ws[X.utils.encode_cell({r:R,c:C})]; if(!c) continue; var raw;
              if(c.f) raw='='+c.f;
              else if(c.t==='n'){ var z=String(c.z||''); if(/[ymdhs]/i.test(z.replace(/"[^"]*"/g,''))&&!/^General$/i.test(z)) raw=c.w!=null?String(c.w):String(c.v); else { raw=String(c.v); if(/%/.test(z)) s.cells[K(R,C)]={v:raw,nf:/\.0/.test(z)?'p1':'p0'}; else if(/#,##0\.00/.test(z)) s.cells[K(R,C)]={v:raw,nf:'n2'}; else if(/#,##0/.test(z)) s.cells[K(R,C)]={v:raw,nf:'n0'}; } }
              else if(c.t==='b') raw=c.v?'TRUE':'FALSE';
              else if(c.t==='e') raw=c.w||'#ERROR!';
              else { raw=c.v==null?'':String(c.v); var l=E.literal(raw); if(typeof l!=='string'||raw[0]==='=') raw="'"+raw; }
              if(raw===''||raw==null) continue;
              var cell=s.cells[K(R,C)]||(s.cells[K(R,C)]={}); cell.v=raw; }
            s.rows=Math.max(ROWS,Math.min(MAXR,g.e.r+21)); s.cols=Math.max(COLS,Math.min(MAXC,g.e.c+3)); }
          (ws['!cols']||[]).forEach(function(ci,i){ if(ci&&(ci.wpx||ci.wch)) s.cw[i]=Math.round(ci.wpx||ci.wch*7.5); });
          d.sheets.push(s);
        });
        if(!d.sheets.length) d.sheets.push(newSheet(T('시트')+'1'));
        docId=uid(); doc=fixDoc(d); eng=new E.Engine(doc); undoS=[]; redoS=[]; $('docName').value=doc.name; switchSheet(0); saveNow(); toast(T('파일을 열었어요'));
      }catch(err){ console.error(err); toast(T('이 파일은 열 수 없어요')); }
    };
    rd.readAsArrayBuffer(file);
  },function(){ toast(T('엑셀 기능을 불러오지 못했어요')); });
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
  var b=e.target.closest('[data-f]'); if(!b) return; closeMenus(); var f=b.dataset.f;
  if(f==='new'){ saveNow(); loadDoc(null); saveNow(); }
  else if(f==='open') $('fileIn').click();
  else if(f==='xlsx') exportXLSX();
  else if(f==='csv') exportCSV();
  else if(f==='del') confirmDlg(F('"{0}" 문서를 지울까요? 되돌릴 수 없어요.',doc.name)).then(function(ok){ if(!ok) return;
    lsDel(LSD+docId); lsSet(LSI,JSON.stringify(docIndex().filter(function(x){ return x.id!==docId; }))); var rest=docIndex(); loadDoc(rest.length?rest[0].id:null); saveNow(); });
});
$('docName').addEventListener('input',function(){ doc.name=this.value; saveSoon(); });
$('docName').addEventListener('keydown',function(e){ if(e.key==='Enter') this.blur(); });

/* ---------- zoom ---------- */
var ZS=[.6,.75,.9,1,1.15,1.3,1.5,1.75];
function setZoom(z){ zoom=z; gin.style.zoom=z; $('zLbl').textContent=Math.round(z*100)+'%'; lsSet('ffsheet.zoom',String(z)); overlay(); }
$('zIn').onclick=function(){ var i=ZS.indexOf(zoom); if(i<ZS.length-1) setZoom(ZS[i+1]); };
$('zOut').onclick=function(){ var i=ZS.indexOf(zoom); if(i>0) setZoom(ZS[i-1]); };

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
if(!last||!lsGet(LSD+last)){ loadDoc(null); saveNow(); } else loadDoc(last);
setZoom(z0);
window.FSAPI={get doc(){ return doc; }, get eng(){ return eng; }, get sheet(){ return sh; }, sel:function(){ return sel; }, act:function(){ return act; }, region:region, hasHeader:hasHeader,
  drawChart:drawChart, chartData:chartData, PAL:PAL, toast:toast, download:download, commitEdit:commitEdit, uid:uid, pushUndo:pushUndo, saveSoon:saveSoon, openDrawer:openDrawer, renderCharts:renderCharts,
  changed:changed, setRaw:setRaw, pasteText:pasteText, selectRange:selectRange, select:select, forSel:forSel};
window.__fs={get doc(){ return doc; }, get eng(){ return eng; }, select:select, cmd:cmd, sel:function(){ return sel; }, act:function(){ return act; }, setRaw:setRaw, changed:changed, startEdit:startEdit, commitEdit:commitEdit};
})();
