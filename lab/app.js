/* Fry Lab: science and math experiments that run in the browser (canvas, no server).
   app.js is the shell: experiment list, controls, readouts, play/pause loop, records table, graph with a
   least-squares line, CSV copy/download, auto record, sending the records to Fry Sheet and saving (localStorage 'fflab.v1').
   The experiments are in experiments.js (LAB.add), the AI helper in ai-lab.js (uses ../ai.js).
   An experiment is an object:
     id, cat ('math'|'sci'), icon, name, desc, info, tries[], hint,
     params:[{id, l, min, max, step, val, u, d, pre:[[v,label]]} | {id, l, type:'seg', opts:[[v,label]], val} | {id, l, type:'check', val}]
       (show(p) hides a control when it returns false),
     cols:[{k, l, u, d}], gx, gy, fit, fitHint(slope, intercept, xk, yk),
     reset(), step(dt) -> 'done' stops the clock, draw(g, W, H), read() -> [[label, value, unit, cls]], record() -> {k:v} or a message,
     (a param {id, l, type:'text', val, max} is a one-line text box; the value is a string)
     change(id), onPlay(), down/move/up(x, y, e), actions:[[id, label]], act(id), ai() -> English summary for the AI,
     save()/restore(o) for extra state, playLabel, noPlay, live (always animated), speed (shows the speed menu), autoRun. */
(function(){
'use strict';
var T=FFT.T, F=FFT.F, $=function(id){ return document.getElementById(id); };
var LS='fflab.v1', EXPS=[], byId={}, cur=null, running=false, speed=1, dirty=true;
var COL={fry:'#ffc93c', or:'#ff8a3d', grn:'#3fe08f', blu:'#4f9dff', red:'#ff6b6b', vio:'#a78bfa', cyan:'#38d1e0', pink:'#ff7ab6', laser:'#ff4d5e'};

/* ---------- saved state ---------- */
var st=(function(){ var o=null; try{ o=JSON.parse(localStorage.getItem(LS)||'null'); }catch(e){} if(!o||typeof o!=='object'||Array.isArray(o)) o={};
  ['p','rec','g','x','tries','v','ttl','gf'].forEach(function(k){ if(!o[k]||typeof o[k]!=='object'||Array.isArray(o[k])) o[k]={}; }); return o; })();
var saveT=null;
function saveSoon(){ clearTimeout(saveT); saveT=setTimeout(saveNow,500); }
function saveNow(){ clearTimeout(saveT); if(cur){ st.last=cur.id; st.p[cur.id]=cur.p; if(cur.save){ try{ st.x[cur.id]=cur.save(); }catch(e){} } } st.speed=speed;
  try{ localStorage.setItem(LS,JSON.stringify(st)); }catch(e){} }

/* ---------- drawing helpers (used by experiments.js) ---------- */
var TH={};
function readTheme(){ var cs=getComputedStyle(document.documentElement); ['bg','panel','panel2','line','text','dim','stage','grid','lab'].forEach(function(k){ TH[k]=cs.getPropertyValue('--'+k).trim(); });
  TH.light=document.documentElement.getAttribute('data-ff-theme')==='light'; }
function fmt(v,d){ if(v==null||typeof v!=='number'||!isFinite(v)) return '—'; if(d==null) d=2; var s=v.toFixed(d); if(/^-0(\.0+)?$/.test(s)) s=s.slice(1); return s; }
function nice(span,n){ if(!(span>0)) return 1; var raw=span/Math.max(1,n), p=Math.pow(10,Math.floor(Math.log10(raw))), f=raw/p; return (f<1.5?1:f<3?2:f<7?5:10)*p; }
function tick(v,step){ var d=Math.max(0,Math.min(6,-Math.floor(Math.log10(step)+1e-9))); return fmt(Math.abs(v)<step*1e-6?0:v,d); }
function font(sz,w){ return (w||500)+' '+sz+"px 'Noto Sans KR','Apple SD Gothic Neo',system-ui,sans-serif"; }
function text(g,s,x,y,o){ o=o||{}; g.font=o.font||font(o.size||12,o.w); g.textAlign=o.al||'left'; g.textBaseline=o.bl||'middle';
  if(o.bg){ var w=g.measureText(s).width, ph=(o.size||12)+8, px=o.al==='center'?x-w/2:o.al==='right'?x-w:x;
    var py=o.bl==='top'?y:o.bl==='bottom'?y-ph:y-ph/2; g.fillStyle=o.bg; rrect(g,px-6,py,w+12,ph,6); g.fill(); }
  g.fillStyle=o.c||TH.text; g.fillText(s,x,y); }
function rrect(g,x,y,w,h,r){ r=Math.min(r,w/2,h/2); g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
function line(g,pts,c,w,dash){ if(pts.length<2) return; g.beginPath(); g.moveTo(pts[0][0],pts[0][1]); for(var i=1;i<pts.length;i++) g.lineTo(pts[i][0],pts[i][1]);
  g.strokeStyle=c; g.lineWidth=w||1.5; g.setLineDash(dash||[]); g.stroke(); g.setLineDash([]); }
function seg(g,x1,y1,x2,y2,c,w,dash){ line(g,[[x1,y1],[x2,y2]],c,w,dash); }
function arrow(g,x1,y1,x2,y2,c,w,hs){ var dx=x2-x1, dy=y2-y1, L=Math.hypot(dx,dy); if(L<1) return; hs=Math.min(hs||9,L*0.6); w=w||2;
  var ux=dx/L, uy=dy/L, bx=x2-ux*hs, by=y2-uy*hs; seg(g,x1,y1,bx+ux*1,by+uy*1,c,w);
  g.beginPath(); g.moveTo(x2,y2); g.lineTo(bx-uy*hs*0.5,by+ux*hs*0.5); g.lineTo(bx+uy*hs*0.5,by-ux*hs*0.5); g.closePath(); g.fillStyle=c; g.fill(); }
function dot(g,x,y,r,c,stroke){ g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.fillStyle=c; g.fill(); if(stroke){ g.strokeStyle=stroke; g.lineWidth=2; g.stroke(); } }
/* world -> screen. rect {l,t,w,h}; equal: same scale on both axes, the range grows to fill (ax, ay: 0 = keep low end, .5 = centre) */
function view(rect,x0,x1,y0,y1,o){ o=o||{}; var kx=rect.w/(x1-x0), ky=rect.h/(y1-y0);
  if(o.equal){ var k=Math.min(kx,ky); var ex=rect.w/k-(x1-x0), ey=rect.h/k-(y1-y0), ax=o.ax==null?.5:o.ax, ay=o.ay==null?.5:o.ay;
    x0-=ex*ax; x1+=ex*(1-ax); y0-=ey*ay; y1+=ey*(1-ay); kx=ky=k; }
  return {l:rect.l, t:rect.t, w:rect.w, h:rect.h, x0:x0, x1:x1, y0:y0, y1:y1, kx:kx, ky:ky,
    sx:function(x){ return rect.l+(x-x0)*kx; }, sy:function(y){ return rect.t+rect.h-(y-y0)*ky; },
    ix:function(px){ return x0+(px-rect.l)/kx; }, iy:function(py){ return y0+(rect.t+rect.h-py)/ky; }};
}
/* grid, axes and tick labels for a view. o: {xl, yl (axis titles), xs, ys (fixed steps), xf, yf (label formatters), box, noGrid} */
function axes(g,v,o){ o=o||{}; g.save(); g.beginPath(); g.rect(v.l,v.t,v.w,v.h); g.clip();
  var xs=o.xs||nice(v.x1-v.x0,Math.max(2,v.w/90)), ys=o.ys||nice(v.y1-v.y0,Math.max(2,v.h/60));
  var X0=v.sx(0), Y0=v.sy(0), ax=Math.min(Math.max(Y0,v.t),v.t+v.h), ay=Math.min(Math.max(X0,v.l),v.l+v.w);
  g.lineWidth=1; g.strokeStyle=TH.grid; g.beginPath();
  if(!o.noGrid&&!o.noVGrid){ for(var x=Math.ceil(v.x0/xs)*xs;x<=v.x1+xs*1e-6;x+=xs){ var px=Math.round(v.sx(x))+.5; g.moveTo(px,v.t); g.lineTo(px,v.t+v.h); }
  } if(!o.noGrid){ for(var y=Math.ceil(v.y0/ys)*ys;y<=v.y1+ys*1e-6;y+=ys){ var py=Math.round(v.sy(y))+.5; g.moveTo(v.l,py); g.lineTo(v.l+v.w,py); } }
  g.stroke();
  g.strokeStyle=TH.dim; g.globalAlpha=.7; g.beginPath(); g.moveTo(v.l,Math.round(ax)+.5); g.lineTo(v.l+v.w,Math.round(ax)+.5); if(!o.noVGrid){ g.moveTo(Math.round(ay)+.5,v.t); g.lineTo(Math.round(ay)+.5,v.t+v.h); } g.stroke(); g.globalAlpha=1;
  g.restore();
  g.font=font(11); g.fillStyle=TH.dim; var xf=o.xf||function(x){ return tick(x,xs); }, yf=o.yf||function(y){ return tick(y,ys); };
  var lx=o.box?v.t+v.h+4:Math.min(ax+4,v.t+v.h-14), ly=o.box?v.l-5:Math.max(ay-5,28);
  g.textAlign='center'; g.textBaseline='top';
  for(var x=Math.ceil(v.x0/xs)*xs;x<=v.x1+xs*1e-6;x+=xs){ if(!o.box&&Math.abs(x)<xs*1e-6) continue; var sx=v.sx(x); if(sx<v.l+8||sx>v.l+v.w-8) continue; g.fillText(xf(x),sx,lx); }
  g.textAlign='right'; g.textBaseline='middle';
  for(var y=Math.ceil(v.y0/ys)*ys;y<=v.y1+ys*1e-6;y+=ys){ if(!o.box&&Math.abs(y)<ys*1e-6) continue; var sy=v.sy(y); if(sy<v.t+6||sy>v.t+v.h-6) continue; g.fillText(yf(y),ly,sy); }
  if(o.xl) text(g,o.xl,v.l+v.w-2,o.box?v.t+v.h+20:lx+15,{al:'right',bl:'top',c:TH.dim,size:11.5});
  if(o.yl) text(g,o.yl,o.box?v.l+4:ay+6,v.t+2,{al:'left',bl:'top',c:TH.dim,size:11.5});
}
/* a time trace: data [[t,v]...] in a box with the last `span` seconds */
function trace(g,rect,data,span,vmin,vmax,c,o){ o=o||{}; var tEnd=data.length?Math.max(span,data[data.length-1][0]):span, v=view(rect,tEnd-span,tEnd,vmin,vmax);
  axes(g,v,{box:true,xl:o.xl,yl:o.yl,ys:o.ys}); g.save(); g.beginPath(); g.rect(rect.l,rect.t,rect.w,rect.h); g.clip();
  if(o.ref!=null) seg(g,rect.l,v.sy(o.ref),rect.l+rect.w,v.sy(o.ref),TH.dim,1,[4,4]);
  var pts=[]; for(var i=0;i<data.length;i++){ if(data[i][0]>=tEnd-span-0.1) pts.push([v.sx(data[i][0]),v.sy(data[i][1])]); } line(g,pts,c,2); g.restore(); return v; }
function rk4(y,f,h){ var k1=f(y), a=y.map(function(v,i){ return v+h/2*k1[i]; }), k2=f(a), b=y.map(function(v,i){ return v+h/2*k2[i]; }), k3=f(b), c=y.map(function(v,i){ return v+h*k3[i]; }), k4=f(c);
  return y.map(function(v,i){ return v+h/6*(k1[i]+2*k2[i]+2*k3[i]+k4[i]); }); }
function clamp(v,a,b){ return v<a?a:v>b?b:v; }
var H={C:COL, TH:TH, fmt:fmt, nice:nice, tick:tick, font:font, text:text, rrect:rrect, line:line, seg:seg, arrow:arrow, dot:dot, view:view, axes:axes, trace:trace, rk4:rk4, clamp:clamp,
  T:T, F:F, toast:toast, redraw:function(){ dirty=true; }, setP:function(k,v){ setP(k,v); }, run:function(on){ setRunning(on); }, get running(){ return running; }, get W(){ return W; }, get H(){ return Hh; }};

/* ---------- registry ---------- */
function add(e){ EXPS.push(e); byId[e.id]=e; }

/* ---------- canvas ---------- */
var cv=$('cv'), g=cv.getContext('2d'), W=1, Hh=1, DPR=1;
function resize(){ var r=$('cvWrap').getBoundingClientRect(); DPR=Math.min(window.devicePixelRatio||1,2.5);
  var w=Math.max(1,Math.floor(r.width)), h=Math.max(1,Math.floor(r.height)); if(w===W&&h===Hh&&cv.width===Math.round(w*DPR)) return;
  W=w; Hh=h; cv.width=Math.round(W*DPR); cv.height=Math.round(Hh*DPR); cv.style.width=W+'px'; cv.style.height=Hh+'px'; if(cur&&cur.resize) cur.resize(W,Hh); dirty=true; }
function draw(){ g.setTransform(DPR,0,0,DPR,0,0); g.clearRect(0,0,W,Hh); g.fillStyle=TH.stage||'#0b0d13'; g.fillRect(0,0,W,Hh);
  if(cur&&cur.draw){ g.save(); try{ cur.draw(g,W,Hh); }catch(e){ console.error(e); } g.restore(); }
  var tt=cur&&st.ttl[cur.id]; if(tt){ g.save(); g.font=font(13,700); var tw=Math.min(g.measureText(tt).width,W-32); g.textAlign='right'; g.textBaseline='middle';
    g.fillStyle=TH.light?'rgba(255,255,255,.82)':'rgba(8,9,13,.78)'; rrect(g,W-tw-26,6,tw+20,24,7); g.fill(); g.fillStyle=TH.lab; g.fillText(tt,W-16,18,W-32); g.restore(); } }

/* ---------- loop ---------- */
var last=0, readT=0;
function frame(t){
  requestAnimationFrame(frame);
  var dt=last?Math.min(0.05,(t-last)/1000):0; last=t; if(!cur||curView==='gallery') return;
  if((running||cur.live)&&cur.step&&dt>0){ var r; try{ r=cur.step(dt*(cur.speed?speed:1)); }catch(e){ console.error(e); r='done'; } if(r==='done') setRunning(false); dirty=true; }
  if(dirty){ dirty=false; draw(); if(t-readT>90){ readT=t; drawReads(); } else readLater=true; }
  else if(readLater&&t-readT>90){ readLater=false; readT=t; drawReads(); }
}
var readLater=false;

/* ---------- play / reset / speed ---------- */
function setRunning(on){ running=!!on; var b=$('playBtn'); b.classList.toggle('on',running);
  $('playIc').innerHTML=running?'<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>':'<path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/>';
  $('playLb').textContent=T(running?'멈춤':(cur&&cur.playLabel)||'시작'); b.title=$('playLb').textContent; dirty=true; }
$('playBtn').onclick=function(){ if(!cur) return; if(running){ setRunning(false); return; } if(cur.onPlay) cur.onPlay(); setRunning(true); };
$('resetBtn').onclick=function(){ if(!cur) return; cur.reset(); setRunning(!!cur.autoRun); dirty=true; drawReads(); };
$('speedSel').onchange=function(){ speed=+this.value||1; saveSoon(); };

/* ---------- experiment list ---------- */
var CATS=[['math','수학'],['sci','과학']];
function drawNav(){ var n=$('nav'); n.innerHTML='';
  CATS.forEach(function(c){ var h=document.createElement('div'); h.className='cat'; h.textContent=T(c[1]); n.appendChild(h);
    EXPS.filter(function(e){ return e.cat===c[0]; }).forEach(function(e){ var b=document.createElement('button'); b.className='ex'; b.dataset.id=e.id;
      b.innerHTML='<span class="ic"></span><span><span class="nm"></span><span class="ds"></span></span>';
      b.querySelector('.ic').textContent=e.icon; b.querySelector('.nm').textContent=T(e.name); b.querySelector('.ds').textContent=T(e.desc);
      b.onclick=function(){ open(e.id); }; n.appendChild(b); }); }); }

/* ---------- controls ---------- */
function decimals(s){ var t=String(s); return t.indexOf('.')<0?0:t.length-t.indexOf('.')-1; }
function pdef(p){ return p.d!=null?p.d:decimals(p.step||1); }
function cleanP(e){ var o=st.p[e.id]&&typeof st.p[e.id]==='object'?st.p[e.id]:{}, p={};
  e.params.forEach(function(q){ var v=o[q.id];
    if(q.type==='check') p[q.id]=typeof v==='boolean'?v:!!q.val;
    else if(q.type==='text') p[q.id]=typeof v==='string'?v.slice(0,q.max||40):q.val;
    else if(q.type==='seg') p[q.id]=q.opts.some(function(x){ return x[0]===v; })?v:q.val;
    else p[q.id]=typeof v==='number'&&isFinite(v)?clamp(v,q.min,q.max):q.val; });
  return p; }
function buildCtl(){
  var box=$('ctl'); box.innerHTML='';
  if(cur.custom) cur.custom(box);
  cur.params.forEach(function(q){
    var row=document.createElement('div'); row.className='prm'; row.dataset.k=q.id; box.appendChild(row);
    if(q.type==='check'){ row.innerHTML='<label class="chk"><input type="checkbox"><span></span></label>'; row.querySelector('span').textContent=T(q.l);
      var cb=row.querySelector('input'); cb.checked=!!cur.p[q.id]; cb.onchange=function(){ setP(q.id,cb.checked); }; return; }
    if(q.type==='text'){ row.innerHTML='<div class="ph"><label></label></div><input class="txin" type="text" data-notr autocomplete="off" spellcheck="false">';
      var tl=row.querySelector('label'), ti=row.querySelector('input'); tl.textContent=T(q.l); ti.id='p_'+cur.id+'_'+q.id; tl.htmlFor=ti.id; ti.maxLength=q.max||40; ti.value=cur.p[q.id];
      ti.addEventListener('input',function(){ setP(q.id,ti.value,'t'); }); ti.addEventListener('keydown',function(e){ if(e.key==='Enter') ti.blur(); }); return; }
    if(q.type==='seg'){ row.innerHTML='<div class="ph"><span class="lbl"></span></div><div class="seg"></div>'; row.querySelector('.lbl').textContent=T(q.l);
      q.opts.forEach(function(o){ var b=document.createElement('button'); b.textContent=T(o[1]); b.dataset.v=String(o[0]); b.onclick=function(){ setP(q.id,o[0]); }; row.querySelector('.seg').appendChild(b); });
      return; }
    var id='p_'+cur.id+'_'+q.id;
    row.innerHTML='<div class="ph"><label></label><span class="pv"><input class="num" type="number" inputmode="decimal"><span class="u"></span></span></div><input type="range">';
    var lb=row.querySelector('label'); lb.textContent=T(q.l); lb.htmlFor=id;
    row.querySelector('.u').textContent=q.u||'';
    var r=row.querySelector('input[type=range]'), nb=row.querySelector('.num'); r.id=id; r.min=q.min; r.max=q.max; r.step=q.step; nb.min=q.min; nb.max=q.max; nb.step=q.step; nb.setAttribute('aria-label',T(q.l));
    r.addEventListener('input',function(){ setP(q.id,+r.value,'r'); });
    var pv=row.querySelector('.pv'); [['−',-1,'값 줄이기'],['+',1,'값 늘리기']].forEach(function(o){ var b=document.createElement('button'); b.type='button'; b.className='stp'; b.textContent=o[0]; b.setAttribute('aria-label',T(o[2])+' · '+T(q.l)); b.title=T(o[2]);
      pv.insertBefore(b,o[1]<0?nb:row.querySelector('.u')); stepper(b,q,o[1]); });
    nb.addEventListener('change',function(){ var v=parseFloat(String(nb.value).replace(',','.')); if(!isFinite(v)){ syncCtl(); return; } setP(q.id,clamp(v,q.min,q.max)); });
    nb.addEventListener('keydown',function(e){ if(e.key==='Enter') nb.blur(); });
    if(q.pre){ var pr=document.createElement('div'); pr.className='pre'; q.pre.forEach(function(o){ var b=document.createElement('button'); b.textContent=T(o[1]); b.dataset.v=o[0]; b.title=o[0]+(q.u?' '+q.u:''); b.onclick=function(){ setP(q.id,o[0]); }; pr.appendChild(b); }); row.appendChild(pr); }
  });
  syncCtl();
}
/* − / + buttons: one step per tap, repeating while held (pointer events, so mouse, pen and touch all work) */
function stepP(q,dir){ if(!cur) return; var st0=q.step||1, dd=Math.max(decimals(st0),pdef(q)), v=+cur.p[q.id]+dir*st0;
  v=clamp(+v.toFixed(dd+2),q.min,q.max); setP(q.id,+v.toFixed(dd+2)); }
function stepper(b,q,dir){ var t1=null,t2=null,held=false; function stop(){ clearTimeout(t1); clearInterval(t2); t1=t2=null; }
  b.addEventListener('pointerdown',function(e){ if(e.button>0) return; e.preventDefault(); held=true; stop(); stepP(q,dir); t1=setTimeout(function(){ t2=setInterval(function(){ stepP(q,dir); },70); },420); try{ b.setPointerCapture(e.pointerId); }catch(er){} });
  ['pointerup','pointercancel','lostpointercapture'].forEach(function(n){ b.addEventListener(n,stop); });
  b.addEventListener('click',function(e){ if(held){ held=false; return; } stepP(q,dir); }); /* keyboard (Enter / Space) has no pointerdown */
  b.addEventListener('contextmenu',function(e){ e.preventDefault(); }); }
function syncCtl(from){
  cur.params.forEach(function(q){ var row=$('ctl').querySelector('.prm[data-k="'+q.id+'"]'); if(!row) return; var v=cur.p[q.id];
    row.hidden=q.show?!q.show(cur.p):false;
    if(q.type==='check'){ row.querySelector('input').checked=!!v; return; }
    if(q.type==='text'){ var ti=row.querySelector('input'); if(document.activeElement!==ti) ti.value=v; return; }
    if(q.type==='seg'){ row.querySelectorAll('.seg button').forEach(function(b){ b.classList.toggle('on',b.dataset.v===String(v)); }); return; }
    var r=row.querySelector('input[type=range]'), nb=row.querySelector('.num');
    if(from!==q.id+'r') r.value=v; if(document.activeElement!==nb) nb.value=fmt(v,pdef(q));
    row.querySelectorAll('.pre button').forEach(function(b){ b.classList.toggle('on',Math.abs(+b.dataset.v-v)<1e-9); });
  });
}
function setP(k,v,from){ if(!cur) return; var q=cur.params.filter(function(x){ return x.id===k; })[0]; if(q&&q.type!=='check'&&q.type!=='seg'&&q.type!=='text') v=clamp(+v,q.min,q.max); if(q&&q.type==='text') v=String(v).slice(0,q.max||40);
  if(cur.p[k]===v&&!from) { syncCtl(); return; } cur.p[k]=v; syncCtl(from?k+from:null); if(cur.change) cur.change(k); dirty=true; drawReads(); saveSoon(); }

/* ---------- readouts ---------- */
var readKey='';
function drawReads(){
  if(!cur) return; var rs=[]; try{ rs=cur.read?cur.read():[]; }catch(e){ console.error(e); }
  var box=$('reads'), key=rs.map(function(r){ return r[0]+'|'+(r[2]||'')+'|'+(r[3]||''); }).join(';');
  if(key!==readKey){ readKey=key; box.innerHTML='';
    rs.forEach(function(r){ var d=document.createElement('div'); d.className='rd'+(r[3]?' '+r[3]:''); d.innerHTML='<span class="l"></span><span class="v"><span class="n"></span><small></small></span>';
      d.querySelector('.l').textContent=T(r[0]); d.querySelector('small').textContent=r[2]?T(r[2]):''; box.appendChild(d); }); }
  var ns=box.querySelectorAll('.rd .n');
  rs.forEach(function(r,i){ var s=String(r[1]); if(/[가-힣]/.test(s)) s=T(s); if(ns[i]&&ns[i].textContent!==s) ns[i].textContent=s; });
}

/* ---------- try this ---------- */
function drawTries(){ var u=$('try'); u.innerHTML=''; var done=st.tries[cur.id]||[];
  cur.tries.forEach(function(t,i){ var li=document.createElement('li'); li.textContent=T(t); li.classList.toggle('done',done.indexOf(i)>=0);
    li.title=T('눌러서 해 본 것으로 표시'); li.onclick=function(){ var d=st.tries[cur.id]||(st.tries[cur.id]=[]), j=d.indexOf(i); if(j<0) d.push(i); else d.splice(j,1); li.classList.toggle('done',j<0); saveSoon(); };
    u.appendChild(li); }); }

/* ---------- records ---------- */
function rows(){ var r=st.rec[cur.id]; if(!Array.isArray(r)) r=st.rec[cur.id]=[]; return r; }
/* quiet: called by auto record (no toast per row, a "not yet" message only once, an unchanged row is skipped) */
function record(quiet){
  quiet=quiet===true; if(!cur||!cur.record) return; var r; try{ r=cur.record(); }catch(e){ console.error(e); return; }
  if(typeof r==='string'){ if(!quiet||autoMsg!==r){ autoMsg=quiet?r:''; toast(T(r)); } return; } if(!r) return; autoMsg='';
  var R=rows(), row=cur.cols.map(function(c){ var v=r[c.k]; return typeof v==='number'&&isFinite(v)?v:null; });
  if(quiet&&R.length&&JSON.stringify(R[R.length-1])===JSON.stringify(row)) return;
  R.push(row); if(R.length>500) R.shift();
  saveSoon(); drawData(); var n=$('recN'); n.classList.remove('bump'); void n.offsetWidth; n.classList.add('bump');
  if(!quiet) toast(F('{0}번째 기록을 남겼어요',R.length));
}
$('recBtn').onclick=function(){ record(); }; $('recBtn2').onclick=function(){ record(); };

/* ---------- auto record: one row every N seconds while the toggle is on ---------- */
var autoT=null, autoMsg='', AUTOS=[0.5,1,2,5,10];
function setAuto(on,silent){ clearInterval(autoT); autoT=null; autoMsg='';
  if(on&&cur&&cur.record){ var n=autoSec(); autoT=setInterval(function(){ if(cur&&curView==='lab'&&!document.hidden) record(true); },n*1000); record(true); }
  var b=$('autoBtn'); b.classList.toggle('on',!!autoT); b.setAttribute('aria-pressed',String(!!autoT)); $('recBtn').classList.toggle('auto',!!autoT);
  if(!silent) toast(autoT?F('자동 기록을 켰어요 ({0}초마다)',autoSec()):T('자동 기록을 껐어요')); }
function autoSec(){ return AUTOS.indexOf(st.autoSec)>=0?st.autoSec:1; }
(function(){ var s=$('autoSec'); AUTOS.forEach(function(n){ var o=document.createElement('option'); o.value=String(n); o.textContent=F('{0}초마다',n); s.appendChild(o); }); })();
$('autoBtn').onclick=function(){ setAuto(!autoT); };
$('autoSec').onchange=function(){ st.autoSec=+this.value; saveSoon(); if(autoT) setAuto(true,true); };

/* ---------- send to Fry Sheet: a new doc in Fry Sheet's own storage (see sheet/app.js: ffsheet.docs index,
   ffsheet.doc.<id> = {v, name, active, sheets:[{name, cells:{r*16384+c:{v}}, cw, rows, cols, fr, charts:[{id,r1,c1,r2,c2,type,title,cols}]}]})
   with a header row, the rows, and a scatter chart of the graph's x / y; then open it there (../sheet/#open=<id>) ---------- */
function sheetDoc(){
  var R=rows(), o=graphCfg(), ks=cur.cols.map(function(c){ return c.k; }), xi=ks.indexOf(o.x), yi=ks.indexOf(o.y), order=[xi];
  if(yi!==xi) order.push(yi); ks.forEach(function(k,i){ if(order.indexOf(i)<0) order.push(i); });
  order=order.filter(function(j,n){ return n<2||R.some(function(r){ return r[j]!=null; }); }); // drop a column that never got a number
  var KC=16384, cells={}, cw={}, ms=document.createElement('canvas').getContext('2d'); ms.font="700 13.5px 'Noto Sans KR',sans-serif";
  order.forEach(function(j,c){ var h=colTitle(cur.cols[j]); cells[c]={v:(/^[=+\-'\d.]/.test(h)?"'":'')+h, b:1, al:'c'}; cw[c]=Math.round(clamp(ms.measureText(h).width+26,96,260)); });
  R.forEach(function(r,i){ order.forEach(function(j,c){ var v=r[j]; if(v==null) return; var d=cur.cols[j].d; cells[(i+1)*KC+c]={v:String(+v.toPrecision(12)), nf:'d'+clamp(d==null?2:d|0,0,9)}; }); });
  var nm=(st.ttl[cur.id]||T(cur.name)), now=new Date(), p2=function(n){ return (n<10?'0':'')+n; };
  var date=now.getFullYear()+'-'+p2(now.getMonth()+1)+'-'+p2(now.getDate())+' '+p2(now.getHours())+':'+p2(now.getMinutes());
  var id=Date.now().toString(36)+Math.random().toString(36).slice(2,6), ch=[];
  if(order.length) ch.push({id:id+'c', r1:0, c1:0, r2:R.length, c2:order.length-1, type:'scatter', title:order.length>1?colTitle(cur.cols[order[1]])+' · '+colTitle(cur.cols[order[0]]):colTitle(cur.cols[order[0]]), cols:order.length>1?[0,1]:[0]});
  return {id:id, doc:{v:1, name:(nm+' '+date).slice(0,80), active:0, sheets:[{name:T('실험 기록'), cells:cells, cw:cw, rows:Math.max(100,R.length+21), cols:Math.max(26,order.length+3), fr:1, fc:0, cfs:[], dv:[], charts:ch, merges:[]}]}};
}
function toSheet(){
  if(!cur) return; if(!rows().length){ toast(T('먼저 값을 기록해 주세요')); return; }
  var o=sheetDoc(), idx=[]; try{ idx=JSON.parse(localStorage.getItem('ffsheet.docs')||'[]'); }catch(e){} if(!Array.isArray(idx)) idx=[];
  try{ localStorage.setItem('ffsheet.doc.'+o.id,JSON.stringify(o.doc)); idx=idx.filter(function(x){ return x&&x.id!==o.id; }); idx.unshift({id:o.id,name:o.doc.name,t:Date.now()});
    localStorage.setItem('ffsheet.docs',JSON.stringify(idx.slice(0,50))); localStorage.setItem('ffsheet.last',o.id); }
  catch(e){ try{ localStorage.removeItem('ffsheet.doc.'+o.id); }catch(er){} toast(T('저장 공간이 가득 차서 보내지 못했어요')); return; }
  setAuto(false,true); setRunning(false); saveNow(); location.href='../sheet/#open='+o.id;
}
$('toSheet').onclick=toSheet;
function colTitle(c){ return T(c.l)+(c.u?' ('+c.u+')':''); }
function drawData(){
  var R=rows(), cols=cur.cols; $('recN').textContent=R.length;
  var w=$('tblWrap'); w.innerHTML='';
  if(!R.length){ var e=document.createElement('div'); e.className='empty'; e.textContent=T('아직 기록이 없어요. 실험하다가 기록하기를 누르면 지금 값이 여기에 쌓여요.'); w.appendChild(e); }
  else { var t=document.createElement('table'), hr=document.createElement('tr'); var th0=document.createElement('th'); th0.textContent='#'; hr.appendChild(th0);
    cols.forEach(function(c){ var th=document.createElement('th'); th.textContent=colTitle(c); hr.appendChild(th); }); hr.appendChild(document.createElement('th'));
    var thead=document.createElement('thead'); thead.appendChild(hr); t.appendChild(thead); var tb=document.createElement('tbody');
    R.forEach(function(r,i){ var tr=document.createElement('tr'), td=document.createElement('td'); td.textContent=i+1; tr.appendChild(td);
      cols.forEach(function(c,j){ var d=document.createElement('td'); d.textContent=fmt(r[j],c.d); tr.appendChild(d); });
      var dl=document.createElement('td'), b=document.createElement('button'); b.className='del'; b.textContent='×'; b.setAttribute('aria-label',T('이 줄 지우기')); b.title=T('이 줄 지우기');
      b.onclick=function(){ R.splice(i,1); saveSoon(); drawData(); }; dl.appendChild(b); tr.appendChild(dl); tb.appendChild(tr); });
    t.appendChild(tb); w.appendChild(t); w.scrollTop=w.scrollHeight; }
  ['csvCopy','csvSave','recClear','toSheet'].forEach(function(id){ $(id).disabled=!R.length; });
  drawGraph();
}
function graphCfg(){ var o=st.g[cur.id]&&typeof st.g[cur.id]==='object'?st.g[cur.id]:{}; var ks=cur.cols.map(function(c){ return c.k; });
  if(ks.indexOf(o.x)<0) o.x=cur.gx||ks[0]; if(ks.indexOf(o.y)<0) o.y=cur.gy||ks[1]||ks[0]; if(typeof o.fit!=='boolean') o.fit=!!cur.fit; st.g[cur.id]=o; return o; }
function buildGraphSel(){ var o=graphCfg(); ['gx','gy'].forEach(function(id){ var s=$(id); s.innerHTML=''; cur.cols.forEach(function(c){ var op=document.createElement('option'); op.value=c.k; op.textContent=colTitle(c); s.appendChild(op); }); s.value=id==='gx'?o.x:o.y; });
  $('gfit').checked=o.fit; }
$('gx').onchange=function(){ graphCfg().x=this.value; saveSoon(); drawGraph(); };
$('gy').onchange=function(){ graphCfg().y=this.value; saveSoon(); drawGraph(); };
$('gfit').onchange=function(){ graphCfg().fit=this.checked; saveSoon(); drawGraph(); };
function linfit(P){ var n=P.length; if(n<2) return null; var sx=0,sy=0,sxx=0,sxy=0,syy=0; P.forEach(function(p){ sx+=p[0]; sy+=p[1]; sxx+=p[0]*p[0]; sxy+=p[0]*p[1]; syy+=p[1]*p[1]; });
  var d=n*sxx-sx*sx; if(Math.abs(d)<1e-12) return null; var m=(n*sxy-sx*sy)/d, b=(sy-m*sx)/n, ssr=0, sst=0, my=sy/n;
  P.forEach(function(p){ var e=p[1]-(m*p[0]+b); ssr+=e*e; sst+=(p[1]-my)*(p[1]-my); }); return {m:m, b:b, r2:sst>1e-15?1-ssr/sst:1}; }
var lastFit=null;
function drawGraph(){
  var c=$('gcv'); if(!c||$('paneData').hidden) return; var r=c.getBoundingClientRect(); if(r.width<10) return;
  var w=Math.floor(r.width), h=Math.floor(r.height), d=Math.min(window.devicePixelRatio||1,2.5); c.width=Math.round(w*d); c.height=Math.round(h*d);
  var q=c.getContext('2d'); q.setTransform(d,0,0,d,0,0); q.clearRect(0,0,w,h);
  var o=graphCfg(), ix=cur.cols.map(function(x){ return x.k; }), xi=ix.indexOf(o.x), yi=ix.indexOf(o.y), cx=cur.cols[xi], cy=cur.cols[yi];
  var P=rows().map(function(r){ return [r[xi],r[yi]]; }).filter(function(p){ return p[0]!=null&&p[1]!=null; });
  lastFit=null; $('fitTxt').innerHTML='';
  if(!P.length){ text(q,T('기록한 값이 여기에 점으로 찍혀요'),w/2,h/2,{al:'center',c:TH.dim,size:13}); return; }
  var x0=Math.min.apply(null,P.map(function(p){ return p[0]; })), x1=Math.max.apply(null,P.map(function(p){ return p[0]; }));
  var y0=Math.min.apply(null,P.map(function(p){ return p[1]; })), y1=Math.max.apply(null,P.map(function(p){ return p[1]; }));
  if(x0>0&&x0<(x1-x0)*0.6) x0=0; if(y0>0&&y0<(y1-y0)*0.6) y0=0; if(x1<0&&-x1<(x1-x0)*0.6) x1=0; if(y1<0&&-y1<(y1-y0)*0.6) y1=0;
  if(x1-x0<1e-9){ x0-=1; x1+=1; } if(y1-y0<1e-9){ y0-=Math.abs(y0)*0.1+1; y1+=Math.abs(y1)*0.1+1; }
  var px=(x1-x0)*0.06, py=(y1-y0)*0.08; x0-=px; x1+=px; y0-=py; y1+=py;
  q.font=font(11); var lw=Math.max(q.measureText(tick(y1,nice(y1-y0,4))).width,q.measureText(tick(y0,nice(y1-y0,4))).width)+12;
  var v=view({l:Math.max(34,lw),t:12,w:w-Math.max(34,lw)-12,h:h-48},x0,x1,y0,y1);
  axes(q,v,{box:true,xl:colTitle(cx),yl:colTitle(cy)});
  var fit=o.fit?linfit(P):null;
  q.save(); q.beginPath(); q.rect(v.l,v.t,v.w,v.h); q.clip();
  if(fit){ seg(q,v.sx(x0),v.sy(fit.m*x0+fit.b),v.sx(x1),v.sy(fit.m*x1+fit.b),COL.or,2,[6,4]); }
  else if(P.length>1&&cur.join){ var S=P.slice().sort(function(a,b){ return a[0]-b[0]; }); line(q,S.map(function(p){ return [v.sx(p[0]),v.sy(p[1])]; }),'rgba(167,139,250,.6)',1.5); }
  P.forEach(function(p){ dot(q,v.sx(p[0]),v.sy(p[1]),4.5,COL.fry,TH.stage); });
  q.restore();
  if(fit){ lastFit=fit; var s=F('기울기 {0} · y절편 {1} · R² {2}','<b>'+sigf(fit.m)+'</b>',sigf(fit.b),fmt(fit.r2,4)), hint='';
    if(cur.fitHint){ try{ hint=cur.fitHint(fit.m,fit.b,o.x,o.y)||''; }catch(e){} }
    $('fitTxt').innerHTML=s+(hint?'<br>'+esc(hint):''); }
  else if(o.fit&&P.length<2) $('fitTxt').textContent=T('추세선은 점이 두 개 이상일 때 그려요');
}
function sigf(v){ if(!isFinite(v)) return '—'; var a=Math.abs(v); var d=a>=100?1:a>=10?2:a>=1?3:a>=0.01?4:6; return fmt(v,d); }
function esc(s){ return String(s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }

/* ---------- CSV ---------- */
function csv(){ var q=function(s){ s=String(s); return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; };
  var L=[cur.cols.map(function(c){ return q(colTitle(c)); }).join(',')];
  rows().forEach(function(r){ L.push(r.map(function(v){ return v==null?'':String(+v.toPrecision(10)); }).join(',')); }); return L.join('\r\n')+'\r\n'; }
$('csvCopy').onclick=function(){ var s=csv(), ok=function(){ toast(T('CSV를 복사했어요. 스프레드시트에 붙여 넣어 보세요')); };
  var fb=function(){ var ta=document.createElement('textarea'); ta.value=s; ta.setAttribute('readonly',''); ta.style.position='fixed'; ta.style.left='-9999px'; document.body.appendChild(ta); ta.select();
    var r=false; try{ r=document.execCommand('copy'); }catch(e){} ta.remove(); if(r) ok(); else toast(T('복사하지 못했어요. CSV 받기를 써 주세요')); };
  if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(s).then(ok,fb); else fb(); };
$('csvSave').onclick=function(){ var b=new Blob(['﻿'+csv()],{type:'text/csv;charset=utf-8'}), u=URL.createObjectURL(b), a=document.createElement('a');
  a.href=u; a.download='fry-lab-'+cur.id+'.csv'; a.style.display='none'; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(u); a.remove(); },4000); toast(T('CSV 파일을 받았어요')); };
var clrT=0;
$('recClear').onclick=function(){ if(Date.now()-clrT>3000){ clrT=Date.now(); toast(T('한 번 더 누르면 기록을 모두 지워요')); return; } clrT=0; st.rec[cur.id]=[]; saveSoon(); drawData(); toast(T('기록을 지웠어요')); };

/* ---------- tabs ---------- */
function tab(which){ var d=which==='data'; $('tabSet').classList.toggle('on',!d); $('tabData').classList.toggle('on',d); $('paneSet').hidden=d; $('paneData').hidden=!d;
  $('tabSet').setAttribute('aria-selected',String(!d)); $('tabData').setAttribute('aria-selected',String(d)); if(d) drawGraph(); }
$('tabSet').onclick=function(){ tab('set'); }; $('tabData').onclick=function(){ tab('data'); };

/* ---------- pointer on the stage ---------- */
var ptr=null, hintT=null;
function showHint(){ var h=$('hint'); h.classList.remove('fade'); clearTimeout(hintT); hintT=setTimeout(fadeHint,7000); }
function fadeHint(){ $('hint').classList.add('fade'); }
function pos(e){ var r=cv.getBoundingClientRect(); return [e.clientX-r.left,e.clientY-r.top]; }
cv.addEventListener('pointerdown',function(e){ fadeHint(); if(!cur||!cur.down) return; var p=pos(e); if(cur.down(p[0],p[1],e)){ ptr=e.pointerId; try{ cv.setPointerCapture(e.pointerId); }catch(er){} e.preventDefault(); dirty=true; } });
cv.addEventListener('pointermove',function(e){ if(!cur) return; var p=pos(e); if(cur.move){ if(cur.move(p[0],p[1],e,ptr!=null)) dirty=true; } if(cur.cursor) cv.style.cursor=cur.cursor(p[0],p[1])||''; });
function up(e){ if(!cur) return; var p=pos(e); if(cur.up&&cur.up(p[0],p[1],e)) dirty=true; if(e.pointerId===ptr) ptr=null; }
cv.addEventListener('pointerup',up); cv.addEventListener('pointercancel',up);
cv.addEventListener('wheel',function(e){ if(cur&&cur.wheel){ var p=pos(e); if(cur.wheel(p[0],p[1],e)){ e.preventDefault(); dirty=true; } } },{passive:false});

/* ---------- open an experiment ---------- */
function open(id){
  var e=byId[id]||EXPS[0]; show('lab'); if(cur===e){ resize(); if(e.autoRun&&!running) setRunning(true); return; }
  if(cur){ saveNow(); if(cur.leave) cur.leave(); } if(autoT) setAuto(false,true);
  cur=e; cur.p=cleanP(e); if(e.restore){ try{ e.restore(st.x[e.id]||null); }catch(er){ console.error(er); } }
  document.querySelectorAll('#nav .ex').forEach(function(b){ b.classList.toggle('on',b.dataset.id===e.id); });
  var on=document.querySelector('#nav .ex.on'); if(on&&on.scrollIntoView&&$('nav').scrollWidth>$('nav').clientWidth) on.scrollIntoView({block:'nearest',inline:'center'});
  curVer=null; $('vTitle').value=st.ttl[e.id]||''; $('vName').value=''; drawVers();
  $('expName').textContent=st.ttl[e.id]||T(e.name); $('expDesc').textContent=T(e.desc); $('info').textContent=T(e.info); $('hint').textContent=e.hint?T(e.hint):''; $('hint').hidden=!e.hint; showHint();
  document.title=T(e.name)+' · Fry Lab';
  $('playBtn').hidden=!!e.noPlay; $('speedSel').hidden=!e.speed;
  var xa=$('xActs'); xa.innerHTML=''; (e.actions||[]).forEach(function(a){ var b=document.createElement('button'); b.className='tbtn'; b.textContent=T(a[1]); b.dataset.a=a[0]; b.onclick=function(){ e.act(a[0]); dirty=true; drawReads(); }; xa.appendChild(b); });
  cv.style.touchAction=e.down?'none':'pan-y';
  buildCtl(); drawTries(); readKey=''; buildGraphSel(); drawData();
  resize(); if(e.resize) e.resize(W,Hh);
  e.reset(); setRunning(!!e.autoRun); dirty=true; drawReads();
  try{ history.replaceState(null,'','#'+e.id); }catch(er){}
  saveNow(); if(window.LABGAL) LABGAL.refresh();
  if(window.LABAI&&LABAI.onOpen) LABAI.onOpen();
}

/* ---------- views: gallery (template picker) and lab (one experiment) ---------- */
var curView='lab';
function show(v){ if(v===curView&&!(v==='lab'&&$('labMain').hidden)&&!(v==='gallery'&&$('gallery').hidden)) return; curView=v; var gal=v==='gallery';
  $('gallery').hidden=!gal; $('labMain').hidden=gal; $('galBtn').hidden=gal; $('aiBtn').hidden=gal; $('subTxt').textContent=T(gal?'교과 단원별 템플릿':'과학·수학 실험실');
  if(gal){ if(running) setRunning(false); if(autoT) setAuto(false,true); saveNow(); if(window.LABAI&&LABAI.close) LABAI.close(); document.title=T('템플릿 갤러리')+' · Fry Lab'; try{ history.replaceState(null,'',location.pathname+location.search); }catch(er){} if(window.LABGAL) LABGAL.refresh(); }
  else { if(cur) document.title=T(cur.name)+' · Fry Lab'; setTimeout(function(){ resize(); dirty=true; },0); } }
$('galBtn').onclick=function(){ show('gallery'); };

/* ---------- my versions: save the values (and any extra state) of the open template under a name ---------- */
var curVer=null;
function vlist(){ var a=st.v[cur.id]; if(!Array.isArray(a)) a=st.v[cur.id]=[]; return a; }
function vcount(id){ var a=st.v[id]; return Array.isArray(a)?a.length:0; }
function clone(o){ try{ return JSON.parse(JSON.stringify(o)); }catch(e){ return null; } }
function drawVers(){ var ul=$('vList'); ul.innerHTML=''; if(!cur) return; var a=vlist();
  if(!a.length){ var li=document.createElement('li'); li.className='vempty'; li.textContent=T('아직 저장한 버전이 없어요. 값을 바꾸고 이름을 붙여 저장해 보세요.'); ul.appendChild(li); return; }
  a.forEach(function(v){ var li=document.createElement('li'); li.dataset.id=v.id; li.classList.toggle('on',v.id===curVer);
    var nm=document.createElement('button'); nm.className='vn'; nm.textContent=v.name; nm.title=T('불러오기'); nm.onclick=function(){ loadVer(v.id); };
    var ed=document.createElement('button'); ed.className='vi ren'; ed.textContent='✎'; ed.title=T('이름 바꾸기'); ed.setAttribute('aria-label',T('이름 바꾸기'));
    var dl=document.createElement('button'); dl.className='vi del'; dl.textContent='×'; dl.title=T('지우기'); dl.setAttribute('aria-label',T('지우기'));
    ed.onclick=function(){ var inp=document.createElement('input'); inp.className='vedit'; inp.type='text'; inp.maxLength=30; inp.value=v.name; inp.setAttribute('data-notr','');
      li.replaceChild(inp,nm); inp.focus(); inp.select(); var done=false;
      function fin(ok){ if(done) return; done=true; var n=inp.value.trim(); if(ok&&n&&n!==v.name){ v.name=n.slice(0,30); saveNow(); toast(T('이름을 바꿨어요')); } drawVers(); }
      inp.onkeydown=function(e){ if(e.key==='Enter') fin(true); else if(e.key==='Escape') fin(false); }; inp.onblur=function(){ fin(true); }; };
    var armed=0; dl.onclick=function(){ if(Date.now()-armed>2500){ armed=Date.now(); dl.textContent='?'; dl.classList.add('arm'); toast(T('한 번 더 누르면 이 버전을 지워요')); setTimeout(function(){ dl.textContent='×'; dl.classList.remove('arm'); },2500); return; }
      var i=a.indexOf(v); if(i>=0) a.splice(i,1); if(curVer===v.id) curVer=null; saveNow(); drawVers(); if(window.LABGAL) LABGAL.refresh(); toast(T('버전을 지웠어요')); };
    li.appendChild(nm); li.appendChild(ed); li.appendChild(dl); ul.appendChild(li); }); }
function saveVer(){ if(!cur) return; var n=$('vName').value.trim().slice(0,30); if(!n){ n=F('내 버전 {0}',vlist().length+1); }
  var a=vlist(), x=null; if(cur.save){ try{ x=clone(cur.save()); }catch(e){} }
  var ex=a.filter(function(v){ return v.name===n; })[0], rec={id:ex?ex.id:'v'+Date.now().toString(36)+Math.random().toString(36).slice(2,5), name:n, p:clone(cur.p), x:x, ttl:st.ttl[cur.id]||'', t:Date.now()};
  if(ex) a[a.indexOf(ex)]=rec; else { a.push(rec); if(a.length>20) a.shift(); }
  curVer=rec.id; $('vName').value=''; saveNow(); drawVers(); if(window.LABGAL) LABGAL.refresh(); toast(F(ex?'"{0}" 버전을 덮어썼어요':'"{0}" 버전으로 저장했어요',n)); }
function applyState(p,x,ttl){ st.p[cur.id]=clone(p)||{}; cur.p=cleanP(cur); if(ttl!=null){ if(ttl) st.ttl[cur.id]=ttl; else delete st.ttl[cur.id]; }
  if(cur.restore){ try{ cur.restore(x||null); }catch(er){ console.error(er); } }
  $('vTitle').value=st.ttl[cur.id]||''; $('expName').textContent=st.ttl[cur.id]||T(cur.name); buildCtl(); cur.reset(); setRunning(!!cur.autoRun); readKey=''; dirty=true; drawReads(); saveSoon(); }
function loadVer(id){ var v=vlist().filter(function(q){ return q.id===id; })[0]; if(!v) return; applyState(v.p,v.x,v.ttl||''); curVer=id; drawVers(); toast(F('"{0}" 버전을 불러왔어요',v.name)); }
function defaults(){ var p={}; cur.params.forEach(function(q){ p[q.id]=q.val; }); applyState(p,null,''); curVer=null; drawVers(); toast(T('처음 값으로 되돌렸어요')); }
$('vSave').onclick=saveVer; $('vName').addEventListener('keydown',function(e){ if(e.key==='Enter') saveVer(); }); $('vDefault').onclick=defaults;
$('vTitle').addEventListener('input',function(){ if(!cur) return; var t=this.value.slice(0,40); if(t.trim()) st.ttl[cur.id]=t; else delete st.ttl[cur.id]; $('expName').textContent=st.ttl[cur.id]||T(cur.name); dirty=true; saveSoon(); });

/* ---------- toast ---------- */
var toastT=null; function toast(t){ var e=$('toast'); e.textContent=t; e.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(function(){ e.classList.remove('on'); },2600); }

/* ---------- keyboard ---------- */
document.addEventListener('keydown',function(e){
  var t=e.target; if(t&&(t.tagName==='INPUT'&&t.type!=='range'&&t.type!=='checkbox'||t.tagName==='TEXTAREA'||t.tagName==='SELECT'||t.isContentEditable)) return;
  if(e.ctrlKey||e.metaKey||e.altKey) return;
  if(e.key===' '&&cur&&!cur.noPlay&&!(t&&t.tagName==='BUTTON')){ e.preventDefault(); $('playBtn').click(); }
  else if((e.key==='r'||e.key==='R')&&cur){ $('resetBtn').click(); }
  else if((e.key==='Enter'&&!(t&&t.tagName==='BUTTON'))&&cur){ record(); }
});

/* ---------- start ---------- */
function start(){
  readTheme(); drawNav();
  speed=[0.25,0.5,1,2,4].indexOf(st.speed)>=0?st.speed:1; $('speedSel').value=String(speed); $('autoSec').value=String(autoSec());
  if(window.ResizeObserver) new ResizeObserver(function(){ resize(); if(!$('paneData').hidden) drawGraph(); }).observe($('cvWrap'));
  window.addEventListener('resize',function(){ resize(); drawGraph(); });
  new MutationObserver(function(){ readTheme(); dirty=true; drawGraph(); }).observe(document.documentElement,{attributes:true,attributeFilter:['data-ff-theme']});
  var h=(location.hash||'').slice(1); if(byId[h]) open(h); else show('gallery');
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(function(){ dirty=true; drawGraph(); });
  window.addEventListener('hashchange',function(){ var k=(location.hash||'').slice(1); if(byId[k]) open(k); else if(!k) show('gallery'); });
  window.addEventListener('beforeunload',saveNow); document.addEventListener('visibilitychange',function(){ if(document.hidden) saveNow(); });
  requestAnimationFrame(frame);
}
document.addEventListener('DOMContentLoaded',start);

window.LAB={add:add, show:show, vcount:vcount, get view(){ return curView; }, versions:function(){ return cur?vlist():[]; }, loadVersion:loadVer, saveVersion:saveVer, get last(){ return st.last; }, H:H, open:open, record:record, toast:toast,
  get cur(){ return cur; }, get list(){ return EXPS; }, get rows(){ return cur?rows():[]; }, get running(){ return running; }, get speed(){ return speed; },
  colTitle:colTitle, csv:csv, setAuto:setAuto, get auto(){ return !!autoT; }, sheetDoc:function(){ return cur?sheetDoc():null; }, toSheet:toSheet, linfit:linfit, get fit(){ return lastFit; }, setP:setP, tab:tab, saveNow:saveNow};
})();
