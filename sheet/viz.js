/* Fry Sheet "시각화": show the selected table as a graph, a clean table, a diagram (flow, tree, Venn) or a mind map.
   Everything is drawn on one canvas so it can be saved as PNG. */
(function(){
'use strict';
var A=window.FSAPI, E=FSE, T=FFT.T, F=FFT.F, $=function(id){ return document.getElementById(id); };
var PAL=['#ffc93c','#ff8a3d','#4fd0ff','#ff5d8f','#3fe08f','#a78bfa','#5b8cff','#f0a35e'];
var BG='#0b0d13', FONT='"Noto Sans KR","Apple SD Gothic Neo",sans-serif';
var mode='graph', gtype='bar', dtype='tree', vcols=null, sortCol=-1, sortAsc=true, rng=null, scale=1, hits=[];
var cv=$('vizCv'), box=$('vizBox');

/* ---------- data ---------- */
function pickRange(){
  var s=A.sel(), a=A.act();
  var g=(s.r1===s.r2&&s.c1===s.c2)?A.region(a.r,a.c):{r1:s.r1,c1:s.c1,r2:s.r2,c2:s.c2};
  if(g&&(g.r2-g.r1>1000||g.c2-g.c1>40)){ var rg=A.region(a.r,a.c); if(rg) g=rg; g.r2=Math.min(g.r2,g.r1+1000); g.c2=Math.min(g.c2,g.c1+40); }
  return g;
}
function table(){
  var g=rng, si=A.doc.active, sh=A.sheet, vals=[], disp=[];
  for(var r=g.r1;r<=g.r2;r++){ var vr=[], dr=[]; for(var c=g.c1;c<=g.c2;c++){ var v=A.eng.value(si,r,c), cell=sh.cells[E.K(r,c)]; if(E.isErr(v)) v=null; vr.push(v); dr.push(E.formatValue(v,cell&&cell.nf)); } vals.push(vr); disp.push(dr); }
  var hdr=vals.length>1&&vals[0].every(function(v){ return typeof v==='string'&&v!==''; });
  var heads=hdr?disp[0].slice():vals[0].map(function(_,j){ return E.colName(g.c1+j); });
  var rows=[]; for(var i=hdr?1:0;i<vals.length;i++) if(vals[i].some(function(v){ return v!=null&&v!==''; })) rows.push({v:vals[i],d:disp[i]});
  var kinds=heads.map(function(_,j){ var n=0,s=0,b=0; rows.forEach(function(r){ var v=r.v[j]; if(typeof v==='number') n++; else if(typeof v==='boolean') b++; else if(v!=null&&v!=='') s++; }); return b&&!n&&!s?'bool':n>=s?'num':'text'; });
  return {heads:heads,rows:rows,kinds:kinds,hdr:hdr};
}
function labelCol(t){ var j=0; while(j+1<t.heads.length&&t.kinds[j+1]==='text') j++; return t.kinds[0]==='text'?j:0; }
function binCol(t,j){ return t.rows.every(function(r){ var v=r.v[j]; return v==null||v===''||v===0||v===1; }); }
function truthy(v){ if(v===true) return true; if(typeof v==='number') return v>0; if(typeof v==='string'){ var t=v.trim().toLowerCase(); return ['o','○','◯','v','✓','✔','y','yes','예','네','true','있음','함','완료'].indexOf(t)>=0; } return false; }

/* ---------- canvas helpers ---------- */
function setup(w,h){
  var dpr=Math.min(3,window.devicePixelRatio||1)*1; cv.width=Math.round(w*dpr); cv.height=Math.round(h*dpr); cv.style.width=w+'px'; cv.style.height=h+'px';
  var g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); g.fillStyle=BG; g.fillRect(0,0,w,h); g.textBaseline='middle'; return g;
}
function fnt(g,px,w){ g.font=(w||'500')+' '+px+'px '+FONT; }
function rr(g,x,y,w,h,r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
function clip(g,s,max){ s=String(s); if(g.measureText(s).width<=max) return s; while(s.length>1&&g.measureText(s+'…').width>max) s=s.slice(0,-1); return s+'…'; }
function avail(){ return {w:Math.max(280,box.clientWidth-2), h:Math.max(220,box.clientHeight-2)}; }

/* ---------- graph ---------- */
function drawGraph(){
  var a=avail(); setup(a.w,a.h); cv.getContext('2d');
  A.drawChart(cv,{r1:rng.r1,c1:rng.c1,r2:rng.r2,c2:rng.c2,type:gtype,title:$('vizTitle').value});
}

/* ---------- table ---------- */
function drawTable(){
  var t=table(), g=setup(10,10); fnt(g,14);
  var rows=t.rows.slice(0,500);
  if(sortCol>=0){ rows.sort(function(x,y){ var a=x.v[sortCol], b=y.v[sortCol], ea=a==null||a==='', eb=b==null||b===''; if(ea||eb) return ea===eb?0:ea?1:-1; var c=E.cmpVals(a,b); return sortAsc?c:-c; }); }
  var title=$('vizTitle').value, pad=12, rh=36, hh=42, top=title?54:16;
  var ws=t.heads.map(function(h,j){ fnt(g,14,'700'); var w=g.measureText(h).width+34; fnt(g,14); rows.forEach(function(r){ w=Math.max(w,g.measureText(r.d[j]).width+26); }); return Math.min(260,Math.max(70,w)); });
  var W=Math.max(avail().w,ws.reduce(function(a,b){ return a+b; },0)+pad*2), H=top+hh+rows.length*rh+pad+10;
  var tw=ws.reduce(function(a,b){ return a+b; },0), x0=Math.max(pad,(W-tw)/2);
  g=setup(W,H); hits=[];
  if(title){ fnt(g,20,'700'); g.fillStyle='#eef0f5'; g.textAlign='center'; g.fillText(title,W/2,28); }
  rr(g,x0,top,tw,hh+rows.length*rh,12); g.fillStyle='#10131b'; g.fill(); g.save(); g.clip();
  g.fillStyle='#1c1708'; g.fillRect(x0,top,tw,hh);
  rows.forEach(function(r,i){ if(i%2){ g.fillStyle='#141824'; g.fillRect(x0,top+hh+i*rh,tw,rh); } });
  g.restore();
  var x=x0;
  t.heads.forEach(function(h,j){
    fnt(g,14,'700'); g.fillStyle='#ffc93c'; g.textAlign=t.kinds[j]==='num'?'right':'left';
    var label=clip(g,h,ws[j]-30)+(sortCol===j?(sortAsc?' ▲':' ▼'):'');
    g.fillText(label,t.kinds[j]==='num'?x+ws[j]-12:x+12,top+hh/2); hits.push({x:x,y:top,w:ws[j],h:hh,col:j});
    fnt(g,14);
    rows.forEach(function(r,i){ var v=r.v[j], y=top+hh+i*rh+rh/2;
      if(typeof v==='boolean'){ g.fillStyle=v?'#ffc93c':'#4a5163'; g.textAlign='center'; g.fillText(v?'✔':'—',x+ws[j]/2,y); return; }
      g.fillStyle=typeof v==='number'?'#eef0f5':'#cfd5e1'; g.textAlign=typeof v==='number'?'right':'left';
      g.fillText(clip(g,r.d[j],ws[j]-24),typeof v==='number'?x+ws[j]-12:x+12,y); });
    x+=ws[j];
    if(j<t.heads.length-1){ g.strokeStyle='#222837'; g.beginPath(); g.moveTo(x,top); g.lineTo(x,top+hh+rows.length*rh); g.stroke(); }
  });
  if(t.rows.length>rows.length){ g.fillStyle='#8a93a6'; g.textAlign='center'; fnt(g,12); g.fillText(F('처음 {0}줄만 보여요',rows.length),W/2,H-8); }
}

/* ---------- hierarchy (mind map and tree) ---------- */
function hierarchy(){
  var t=table(), lev=[];
  for(var j=0;j<t.heads.length&&t.kinds[j]==='text';j++) lev.push(j);
  if(!lev.length) lev=[0];
  var rootName=$('vizTitle').value||(t.hdr?t.heads[0]:A.sheet.name);
  var root={label:rootName,kids:[],depth:0};
  t.rows.forEach(function(r){
    var node=root;
    for(var k=0;k<lev.length;k++){ var s=r.d[lev[k]]; if(s==null||s==='') break;
      var ch=null; for(var i=0;i<node.kids.length;i++) if(node.kids[i].label===s&&!node.kids[i].leaf){ ch=node.kids[i]; break; }
      if(!ch){ ch={label:s,kids:[],depth:node.depth+1}; node.kids.push(ch); } node=ch; }
    if(node===root) return;
    for(var j2=0;j2<t.heads.length;j2++){ if(lev.indexOf(j2)>=0) continue; var d=r.d[j2]; if(d==null||d==='') continue;
      if(node.kids.length>=8) break; node.kids.push({label:(t.hdr?t.heads[j2]+': ':'')+d,kids:[],depth:node.depth+1,leaf:true}); }
  });
  return root;
}
function fit(x,y){ return Math.max(.5,Math.min(1,x,y)); }
function textW(g,s,px,w){ fnt(g,px,w); return g.measureText(s).width; }
function nodeStyle(n){ return n.depth===0?{px:20,w:'700',ph:16,h:48}:n.depth===1?{px:16,w:'700',ph:14,h:38}:{px:14,w:'500',ph:11,h:30}; }
function measure(g,n){ var st=nodeStyle(n); n.lab=n.label.length>40?n.label.slice(0,39)+'…':n.label; n.w=textW(g,n.lab,st.px,st.w)+st.ph*2; n.h=st.h; n.kids.forEach(function(k){ measure(g,k); }); }
function drawNode(g,n,col){
  var st=nodeStyle(n); rr(g,n.x-n.w/2,n.y-n.h/2,n.w,n.h,n.h/2);
  if(n.depth===0){ var gr=g.createLinearGradient(n.x-n.w/2,0,n.x+n.w/2,0); gr.addColorStop(0,'#ffc93c'); gr.addColorStop(1,'#ff8a3d'); g.fillStyle=gr; g.fill(); g.fillStyle='#1c1405'; }
  else if(n.depth===1){ g.fillStyle=col; g.fill(); g.fillStyle='#14161d'; }
  else { g.fillStyle='#151925'; g.fill(); g.strokeStyle=col; g.lineWidth=1.6; g.stroke(); g.fillStyle='#e6e9f0'; }
  fnt(g,st.px,st.w); g.textAlign='center'; g.fillText(n.lab,n.x,n.y+1);
}
function drawMind(){
  var g=setup(10,10), root=hierarchy(); measure(g,root);
  if(!root.kids.length) return empty(T('글자로 된 첫 열이 있는 표를 골라 주세요'));
  var gapY=12, gapX=46;
  // split first-level branches into right and left halves by leaf count
  function leaves(n){ return n.kids.length?n.kids.reduce(function(a,k){ return a+leaves(k); },0):1; }
  var total=leaves(root), acc=0, right=[], left=[];
  root.kids.forEach(function(k,i){ (acc<total/2||root.kids.length<3&&i===0?right:left).push(k); acc+=leaves(k); });
  if(root.kids.length===2&&!left.length){ left.push(right.pop()); }
  function place(n,y){ // returns height used, sets n.y
    if(!n.kids.length){ n.y=y+n.h/2; return n.h+gapY; }
    var h=0; n.kids.forEach(function(k){ h+=place(k,y+h); });
    n.y=(n.kids[0].y+n.kids[n.kids.length-1].y)/2; return Math.max(h,n.h+gapY);
  }
  function setX(n,x,dir){ n.x=x+dir*n.w/2; n.kids.forEach(function(k){ setX(k,x+dir*(n.w+gapX),dir); }); }
  function side(list,dir){ var h=0; list.forEach(function(k){ h+=place(k,h); }); list.forEach(function(k){ setX(k,dir*(root.w/2+gapX*1.4),dir); }); return h; }
  var hr=side(right,1), hl=side(left,-1);
  function shift(n,dy){ n.y+=dy; n.kids.forEach(function(k){ shift(k,dy); }); }
  right.forEach(function(k){ shift(k,-hr/2); }); left.forEach(function(k){ shift(k,-hl/2); });
  root.x=0; root.y=0;
  var b={x0:-root.w/2,x1:root.w/2,y0:-root.h/2,y1:root.h/2};
  (function bb(n){ b.x0=Math.min(b.x0,n.x-n.w/2); b.x1=Math.max(b.x1,n.x+n.w/2); b.y0=Math.min(b.y0,n.y-n.h/2); b.y1=Math.max(b.y1,n.y+n.h/2); n.kids.forEach(bb); })(root);
  var m=30, title=0, a=avail(); if(!scale) scale=fit(a.w/(b.x1-b.x0+m*2),a.h/(b.y1-b.y0+m*2)); var W=Math.max(a.w,(b.x1-b.x0+m*2)*scale), H=Math.max(a.h,(b.y1-b.y0+m*2)*scale);
  g=setup(W,H); g.save(); g.translate(W/2-((b.x0+b.x1)/2)*scale,H/2-((b.y0+b.y1)/2)*scale); g.scale(scale,scale);
  function edges(n,col){ n.kids.forEach(function(k,i){ var c=n.depth===0?PAL[(root.kids.indexOf(k))%PAL.length]:col, dir=k.x>n.x?1:-1;
      var x1=n.x+dir*n.w/2, x2=k.x-dir*k.w/2, mx=(x1+x2)/2; g.strokeStyle=c; g.lineWidth=n.depth===0?3.2:2; g.globalAlpha=.85;
      g.beginPath(); g.moveTo(x1,n.y); g.bezierCurveTo(mx,n.y,mx,k.y,x2,k.y); g.stroke(); g.globalAlpha=1; edges(k,c); }); }
  edges(root,null);
  (function dn(n,col){ drawNode(g,n,col); n.kids.forEach(function(k){ dn(k,n.depth===0?PAL[root.kids.indexOf(k)%PAL.length]:col); }); })(root,null);
  g.restore();
}
function drawTree(){
  var g=setup(10,10), root=hierarchy(); measure(g,root);
  if(!root.kids.length) return empty(T('글자로 된 첫 열이 있는 표를 골라 주세요'));
  var gapX=18, levH=78, lh=34;
  // a node whose children are all data leaves shows them as a short list under it
  function stacked(n){ return n.kids.length&&n.kids.every(function(k){ return k.leaf; }); }
  function place(n,x){
    if(stacked(n)){ var lw=Math.max.apply(null,n.kids.map(function(k){ return k.w; })), cw=Math.max(n.w,lw+22)+gapX; n.x=x+cw/2;
      n.kids.forEach(function(k){ k.x=n.x-cw/2+gapX/2+22+k.w/2; }); return cw; }
    if(!n.kids.length){ n.x=x+n.w/2; return n.w+gapX; }
    var w=0; n.kids.forEach(function(k){ w+=place(k,x+w); }); var cw=Math.max(w,n.w+gapX);
    if(w<n.w+gapX){ var off=(n.w+gapX-w)/2; (function sh(m){ m.x+=off; m.kids.forEach(sh); })({x:0,kids:n.kids}); }
    n.x=(n.kids[0].x+n.kids[n.kids.length-1].x)/2; return cw; }
  var tw=place(root,0), maxY=0;
  (function d(n,y){ n.y=y; maxY=Math.max(maxY,y+n.h/2);
    if(stacked(n)) n.kids.forEach(function(k,i){ k.y=y+n.h/2+14+lh/2+i*lh; maxY=Math.max(maxY,k.y+k.h/2); });
    else n.kids.forEach(function(k){ d(k,y+levH); }); })(root,0);
  var m=30, a=avail(), th=maxY+root.h/2; if(!scale) scale=fit(a.w/(tw+m*2),a.h/(th+m*2+20)); var W=Math.max(a.w,(tw+m*2)*scale), H=Math.max(a.h,(th+m*2+20)*scale);
  g=setup(W,H); g.save(); g.translate((W-tw*scale)/2,m+root.h/2*scale); g.scale(scale,scale);
  function edges(n,col){
    if(stacked(n)){ var sx=n.kids[0].x-n.kids[0].w/2-12; g.strokeStyle=col; g.lineWidth=2; g.globalAlpha=.8; g.beginPath(); g.moveTo(n.x,n.y+n.h/2); g.lineTo(n.x,n.y+n.h/2+7); g.lineTo(sx,n.y+n.h/2+7); g.lineTo(sx,n.kids[n.kids.length-1].y); g.stroke();
      n.kids.forEach(function(k){ g.beginPath(); g.moveTo(sx,k.y); g.lineTo(k.x-k.w/2,k.y); g.stroke(); }); g.globalAlpha=1; return; }
    n.kids.forEach(function(k){ var c=n.depth===0?PAL[root.kids.indexOf(k)%PAL.length]:col; g.strokeStyle=c; g.lineWidth=2; g.globalAlpha=.8;
    var y1=n.y+n.h/2, y2=k.y-k.h/2, my=(y1+y2)/2; g.beginPath(); g.moveTo(n.x,y1); g.lineTo(n.x,my); g.lineTo(k.x,my); g.lineTo(k.x,y2); g.stroke(); g.globalAlpha=1; edges(k,c); }); }
  edges(root,'#ffc93c');
  (function dn(n,col){ drawNode(g,n,col); n.kids.forEach(function(k){ dn(k,n.depth===0?PAL[root.kids.indexOf(k)%PAL.length]:col); }); })(root,null);
  g.restore();
}

/* ---------- flow ---------- */
function drawFlow(){
  var t=table(), g=setup(10,10); if(!t.rows.length) return empty(T('표에 내용이 없어요'));
  var lc=labelCol(t), items=t.rows.slice(0,40).map(function(r){ return {title:r.d[lc]||'', sub:t.heads.map(function(h,j){ var d=r.d[j]; return j===lc||d===''?null:(t.hdr?h+': ':'')+d; }).filter(Boolean).slice(0,3)}; });
  var bw=190, bh=56+18*Math.max.apply(null,items.map(function(i){ return i.sub.length; })), gx=46, gy=46, a=avail();
  var per=Math.max(1,Math.floor((a.w/scale-40+gx)/(bw+gx))), rowsN=Math.ceil(items.length/per);
  var W=Math.max(a.w,(per*(bw+gx)-gx+60)*scale), H=Math.max(a.h,(rowsN*(bh+gy)-gy+60+($('vizTitle').value?40:0))*scale);
  g=setup(W,H); g.save(); var ttl=$('vizTitle').value; if(ttl){ fnt(g,20,'700'); g.fillStyle='#eef0f5'; g.textAlign='center'; g.fillText(ttl,W/2,26); }
  var ox=(W-(Math.min(per,items.length)*(bw+gx)-gx)*scale)/2; g.translate(ox,(ttl?50:30)); g.scale(scale,scale);
  var pos=items.map(function(it,i){ var row=Math.floor(i/per), k=i%per; if(row%2) k=per-1-k; return {x:k*(bw+gx),y:row*(bh+gy)}; });
  g.strokeStyle='#5b6478'; g.fillStyle='#5b6478'; g.lineWidth=2.2;
  for(var i=0;i<items.length-1;i++){ var p=pos[i], q=pos[i+1], x1,y1,x2,y2;
    if(p.y===q.y){ var dir=q.x>p.x?1:-1; x1=p.x+(dir>0?bw:0); y1=p.y+bh/2; x2=q.x+(dir>0?0:bw); y2=y1; }
    else { x1=p.x+bw/2; y1=p.y+bh; x2=q.x+bw/2; y2=q.y; }
    g.beginPath(); g.moveTo(x1,y1); g.lineTo(x2,y2); g.stroke(); var ang=Math.atan2(y2-y1,x2-x1);
    g.beginPath(); g.moveTo(x2,y2); g.lineTo(x2-10*Math.cos(ang-.45),y2-10*Math.sin(ang-.45)); g.lineTo(x2-10*Math.cos(ang+.45),y2-10*Math.sin(ang+.45)); g.closePath(); g.fill(); }
  items.forEach(function(it,i){ var p=pos[i], c=PAL[i%PAL.length];
    rr(g,p.x,p.y,bw,bh,12); g.fillStyle='#151925'; g.fill(); g.strokeStyle=c; g.lineWidth=2; g.stroke();
    g.fillStyle=c; rr(g,p.x+10,p.y+12,26,22,6); g.fill(); fnt(g,12,'700'); g.fillStyle='#14161d'; g.textAlign='center'; g.fillText(i+1,p.x+23,p.y+23);
    fnt(g,15,'700'); g.fillStyle='#eef0f5'; g.textAlign='left'; g.fillText(clip(g,it.title,bw-56),p.x+44,p.y+23);
    fnt(g,12.5); g.fillStyle='#a3acbd'; it.sub.forEach(function(s,j){ g.fillText(clip(g,s,bw-24),p.x+12,p.y+48+j*18); }); });
  g.restore();
}

/* ---------- Venn ---------- */
function vennCandidates(t){ var lc=t.kinds[0]==='text'?labelCol(t):-1; return t.heads.map(function(_,j){ return j; }).filter(function(j){ if(j<=lc&&t.heads.length>1) return false; if(t.kinds[j]==='num'&&!binCol(t,j)) return false; return t.kinds[j]==='bool'||t.rows.some(function(r){ return truthy(r.v[j]); }); }); }
function drawVenn(){
  var t=table(); if(!t.rows.length) return empty(T('표에 내용이 없어요'));
  var cand=vennCandidates(t), sets=(vcols||cand.slice(0,3)).filter(function(j){ return j<t.heads.length; });
  if(sets.length<2) return empty(T('O/X나 체크박스처럼 예·아니오로 된 열이 2개 이상 있어야 해요'));
  sets=sets.slice(0,3);
  var a=avail(), W=a.w, H=a.h, g=setup(W,H), n=sets.length;
  var ttl=$('vizTitle').value; if(ttl){ fnt(g,20,'700'); g.fillStyle='#eef0f5'; g.textAlign='center'; g.fillText(ttl,W/2,24); }
  var cx=W/2, cy=H/2+(ttl?14:4), R=Math.min(W,H-(ttl?40:0))*(n===2?.3:.27), d=R*.62;
  var C=n===2?[[cx-d*.8,cy],[cx+d*.8,cy]]:[[cx-d*.82,cy-d*.48],[cx+d*.82,cy-d*.48],[cx,cy+d*.92]];
  sets.forEach(function(j,i){ g.beginPath(); g.arc(C[i][0],C[i][1],R,0,7); g.fillStyle=PAL[[0,2,3][i]]; g.globalAlpha=.16; g.fill(); g.globalAlpha=1; g.strokeStyle=PAL[[0,2,3][i]]; g.lineWidth=2.4; g.stroke(); });
  // labels of the sets
  fnt(g,15,'700'); sets.forEach(function(j,i){ g.fillStyle=PAL[[0,2,3][i]]; var lx=C[i][0]+(n===2?(i?1:-1)*R*.55:(i===0?-R*.6:i===1?R*.6:0)), ly=C[i][1]+(n===2?-R-14:(i<2?-R-14:R+16)); g.textAlign='center'; g.fillText(t.heads[j],lx,ly); });
  // place items by membership
  var groups={}, outside=[];
  t.rows.forEach(function(r){ var m=0; sets.forEach(function(j,i){ if(truthy(r.v[j])) m|=1<<i; }); var name=r.d[labelCol(t)]||'?'; if(!m) outside.push(name); else (groups[m]=groups[m]||[]).push(name); });
  var spot=n===2?{1:[cx-d*1.35,cy],2:[cx+d*1.35,cy],3:[cx,cy]}:
    {1:[cx-d*1.45,cy-d*.85],2:[cx+d*1.45,cy-d*.85],4:[cx,cy+d*1.6],3:[cx,cy-d*.95],5:[cx-d*.82,cy+d*.45],6:[cx+d*.82,cy+d*.45],7:[cx,cy-d*.05]};
  fnt(g,13); g.textAlign='center';
  Object.keys(groups).forEach(function(m){ var list=groups[m], p=spot[m], maxN=n===2&&m!=='3'?8:4, lh=17, show=list.slice(0,maxN);
    if(list.length>maxN) show.push(F('외 {0}개',list.length-maxN)); var y0=p[1]-(show.length-1)*lh/2;
    show.forEach(function(s,i){ g.fillStyle=i===maxN?'#8a93a6':'#eef0f5'; g.fillText(clip(g,s,R*.8),p[0],y0+i*lh); }); });
  if(outside.length){ fnt(g,12.5); g.fillStyle='#8a93a6'; g.textAlign='left'; g.fillText(T('어디에도 없음')+': '+clip(g,outside.join(', '),W-140),14,H-14); }
}

function empty(msg){ var a=avail(), g=setup(a.w,a.h); fnt(g,15); g.fillStyle='#8a93a6'; g.textAlign='center'; g.fillText(msg,a.w/2,a.h/2); }

/* ---------- UI ---------- */
function opts(){
  var o=$('vizOpts'), t=table(), h='';
  if(mode==='graph') h='<select id="vGtype" data-notr>'+[['bar','세로 막대'],['hbar','가로 막대'],['line','꺾은선'],['pie','원형'],['scatter','산점도']].map(function(x){ return '<option value="'+x[0]+'"'+(x[0]===gtype?' selected':'')+'>'+T(x[1])+'</option>'; }).join('')+'</select><button class="tbtn" id="vPin">'+T('시트에 차트로 고정')+'</button>';
  if(mode==='diagram'){ h='<select id="vDtype" data-notr>'+[['tree','트리'],['flow','흐름도'],['venn','벤 다이어그램']].map(function(x){ return '<option value="'+x[0]+'"'+(x[0]===dtype?' selected':'')+'>'+T(x[1])+'</option>'; }).join('')+'</select>';
    if(dtype==='venn'){ var cand=vennCandidates(t), cur=(vcols||cand.slice(0,3)); h+=t.heads.map(function(hd,j){ if(cand.indexOf(j)<0&&cur.indexOf(j)<0) return ''; return '<label class="vchk" data-notr><input type="checkbox" data-vc="'+j+'"'+(cur.indexOf(j)>=0?' checked':'')+'> '+hd.replace(/</g,'&lt;')+'</label>'; }).join(''); } }
  if(mode==='table') h='<span class="vhint">'+T('제목 칸을 누르면 정렬돼요')+'</span>';
  if(mode==='mind'||mode==='diagram'&&dtype!=='venn'||mode==='table') h+='<span class="vz"><button id="vzOut">−</button><button id="vzIn">+</button></span>';
  o.innerHTML=h;
  var gt=$('vGtype'); if(gt) gt.onchange=function(){ gtype=this.value; draw(); };
  var dt=$('vDtype'); if(dt) dt.onchange=function(){ dtype=this.value; scale=0; opts(); draw(); };
  o.querySelectorAll('[data-vc]').forEach(function(c){ c.onchange=function(){ vcols=[].map.call(o.querySelectorAll('[data-vc]:checked'),function(x){ return +x.dataset.vc; }); if(vcols.length>3){ this.checked=false; vcols.pop(); A.toast(T('3개까지 고를 수 있어요')); } draw(); }; });
  var pin=$('vPin'); if(pin) pin.onclick=function(){ A.pushUndo(); A.sheet.charts.push({id:A.uid(),r1:rng.r1,c1:rng.c1,r2:rng.r2,c2:rng.c2,type:gtype,title:$('vizTitle').value}); A.saveSoon(); close(); A.openDrawer(); };
  var zi=$('vzIn'), zo=$('vzOut'); if(zi){ zi.onclick=function(){ scale=Math.min(2.5,(scale||1)*1.2); draw(); }; zo.onclick=function(){ scale=Math.max(.3,(scale||1)/1.2); draw(); }; }
}
function draw(){
  hits=[]; if(!scale&&!(mode==='mind'||mode==='diagram'&&dtype==='tree')) scale=1;
  if(mode==='graph') drawGraph(); else if(mode==='table') drawTable(); else if(mode==='mind') drawMind();
  else if(dtype==='flow') drawFlow(); else if(dtype==='venn') drawVenn(); else drawTree();
  box.classList.toggle('scroll',mode!=='graph'&&!(mode==='diagram'&&dtype==='venn'));
}
function setMode(m){ mode=m; scale=0; document.querySelectorAll('.vtab').forEach(function(b){ b.classList.toggle('on',b.dataset.m===m); }); opts(); draw(); }
function open(){
  A.commitEdit(); rng=pickRange(); if(!rng) return A.toast(T('표를 먼저 고르세요'));
  $('vizRange').textContent=E.rangeStr(rng); sortCol=-1; vcols=null;
  $('vizDlg').classList.add('open'); setTimeout(function(){ setMode(mode); },20);
}
function close(){ $('vizDlg').classList.remove('open'); }
document.querySelectorAll('.vtab').forEach(function(b){ b.onclick=function(){ setMode(b.dataset.m); }; });
$('vizTitle').addEventListener('input',function(){ draw(); });
$('vizClose').onclick=close;
$('vizDlg').addEventListener('click',function(e){ if(e.target.id==='vizDlg') close(); });
$('vizPng').onclick=function(){ cv.toBlob(function(b){ A.download(b,($('vizTitle').value||A.doc.name||'chart')+'.png'); }); };
cv.addEventListener('click',function(e){
  if(mode!=='table') return; var r=cv.getBoundingClientRect(), x=(e.clientX-r.left)*(parseFloat(cv.style.width)/r.width), y=(e.clientY-r.top)*(parseFloat(cv.style.height)/r.height);
  hits.forEach(function(h){ if(x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h){ if(sortCol===h.col) sortAsc=!sortAsc; else { sortCol=h.col; sortAsc=true; } draw(); } });
});
window.addEventListener('resize',function(){ if($('vizDlg').classList.contains('open')) draw(); });
window.FSViz={open:open,setMode:setMode,draw:draw};
})();
