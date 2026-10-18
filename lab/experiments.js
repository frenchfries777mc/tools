/* Fry Lab experiments. Each one is registered with LAB.add (see the list of fields at the top of app.js).
   Physics uses SI units and RK4 integration with small fixed steps; the screen only shows the result. */
(function(){
'use strict';
var H=LAB.H, C=H.C, TH=H.TH, fmt=H.fmt, T=FFT.T, F=FFT.F, D2R=Math.PI/180, TAU=Math.PI*2;
var PLANETS=[[9.8,'지구'],[1.62,'달'],[3.71,'화성'],[24.79,'목성']];
function gParam(){ return {id:'g', l:'중력 가속도 g', min:1, max:25, step:0.01, val:9.8, u:'m/s²', d:2, pre:PLANETS}; }
function short(v){ if(!isFinite(v)) return '—'; var s=String(+v.toFixed(3)); return s==='-0'?'0':s; }
function agm(a,b){ for(var i=0;i<60&&Math.abs(a-b)>1e-15;i++){ var m=(a+b)/2; b=Math.sqrt(a*b); a=m; } return a; }
/* period from upward zero crossings (times in seconds) */
function period(cr){ return cr.length>=2?(cr[cr.length-1]-cr[0])/(cr.length-1):null; }
function sub(r,a,b,c,d){ return {l:r.l+a, t:r.t+b, w:r.w-a-c, h:r.h-b-d}; }

/* =====================================================================
   1. Function graphs
   ===================================================================== */
(function(){
var FN={sin:Math.sin,cos:Math.cos,tan:Math.tan,asin:Math.asin,acos:Math.acos,atan:Math.atan,sinh:Math.sinh,cosh:Math.cosh,tanh:Math.tanh,
  sqrt:Math.sqrt,abs:Math.abs,ln:Math.log,log:Math.log10,exp:Math.exp,floor:Math.floor,ceil:Math.ceil,round:Math.round,sign:Math.sign};
var CONST={pi:Math.PI,e:Math.E}, VARS={x:1,a:1,b:1,c:1};
var NAMES=Object.keys(FN).concat(Object.keys(VARS),Object.keys(CONST)).sort(function(p,q){ return q.length-p.length; });
function pw(a,b){ if(a<0&&b!==Math.round(b)){ for(var q=3;q<=9;q+=2){ var p=b*q; if(Math.abs(p-Math.round(p))<1e-9){ var r=Math.pow(-a,b); return Math.round(p)%2?-r:r; } } return NaN; } return Math.pow(a,b); }
function norm(s){ return String(s||'').replace(/^\s*(?:y|f\s*\(\s*x\s*\)|g\s*\(\s*x\s*\)|h\s*\(\s*x\s*\))\s*=/i,'').replace(/[−–—]/g,'-').replace(/[×·∙]/g,'*').replace(/÷/g,'/')
  .replace(/π/g,'pi').replace(/²/g,'^2').replace(/³/g,'^3').replace(/√/g,'sqrt').replace(/\*\*/g,'^').trim(); }
function lex(s){ var t=[], i=0;
  while(i<s.length){ var ch=s[i], m;
    if(/\s/.test(ch)){ i++; continue; }
    if(/[0-9.]/.test(ch)){ m=/^(\d+\.?\d*|\.\d+)/.exec(s.slice(i)); if(!m) throw new Error('num'); t.push({k:'n',v:parseFloat(m[1])}); i+=m[1].length; continue; }
    if(/[a-z]/i.test(ch)){ var w=/^[a-z]+/i.exec(s.slice(i))[0], lw=w.toLowerCase(), j=0; i+=w.length;
      while(j<lw.length){ var hit=null; for(var q=0;q<NAMES.length;q++){ if(lw.substr(j,NAMES[q].length)===NAMES[q]){ hit=NAMES[q]; break; } } if(!hit) throw new Error('name');
        t.push(FN[hit]?{k:'f',v:hit}:{k:'v',v:hit}); j+=hit.length; } continue; }
    if('+-*/^(),'.indexOf(ch)>=0){ t.push({k:'o',v:ch}); i++; continue; }
    throw new Error('char'); }
  return t; }
function compile(src){
  var s=norm(src); if(!s) return null; var t=lex(s), i=0;
  function op(c){ var k=t[i]; return k&&k.k==='o'&&k.v===c; }
  function starts(){ var k=t[i]; return k&&(k.k==='n'||k.k==='v'||k.k==='f'||(k.k==='o'&&k.v==='(')); }
  function bin(o,l,r){ return o==='+'?function(e){ return l(e)+r(e); }:o==='-'?function(e){ return l(e)-r(e); }:o==='*'?function(e){ return l(e)*r(e); }:function(e){ return l(e)/r(e); }; }
  function expr(){ var n=term(); while(op('+')||op('-')){ var o=t[i++].v; n=bin(o,n,term()); } return n; }
  function term(){ var n=unary(); for(;;){
      if(op('*')||op('/')){ var o=t[i++].v; n=bin(o,n,unary()); }
      else if(starts()) n=bin('*',n,power());
      else break; }
    return n; }
  function unary(){ if(op('-')){ i++; var u=unary(); return function(e){ return -u(e); }; } if(op('+')){ i++; return unary(); } return power(); }
  function power(){ var b=call(); if(op('^')){ i++; var x=unary(); return function(e){ return pw(b(e),x(e)); }; } return b; }
  function call(){ var k=t[i]; if(!k) throw new Error('end');
    if(k.k==='f'){ i++; var fn=FN[k.v], a; if(op('(')){ i++; a=expr(); if(op(')')) i++; else if(i<t.length) throw new Error(')'); } else a=power();
      return function(e){ return fn(a(e)); }; }
    return prim(); }
  function prim(){ var k=t[i++]; if(!k) throw new Error('end');
    if(k.k==='n'){ var v=k.v; return function(){ return v; }; }
    if(k.k==='v'){ if(CONST[k.v]!=null){ var c=CONST[k.v]; return function(){ return c; }; } var nm=k.v; return function(e){ return e[nm]; }; }
    if(k.k==='o'&&k.v==='('){ var n=expr(); if(op(')')) i++; else if(i<t.length) throw new Error(')'); return n; }
    throw new Error('tok'); }
  var f=expr(); if(i<t.length) throw new Error('rest'); return f;
}
var COLS=[C.fry,C.blu,C.grn], NM=['f','g','h'];
var S={ex:['a*(x-b)^2+c','',''], fn:[null,null,null], bad:[false,false,false], cx:0, cy:0, span:20, roots:[], meets:[], pts:{}, drag:null, pinch:null, moved:false};
function build(i){ try{ S.fn[i]=compile(S.ex[i]); S.bad[i]=false; }catch(e){ S.fn[i]=null; S.bad[i]=!!norm(S.ex[i]); } }
function rebuild(){ for(var i=0;i<3;i++) build(i); }
function ev(i,x,p){ var f=S.fn[i]; if(!f) return NaN; var y=f({x:x,a:p.a,b:p.b,c:p.c}); return typeof y==='number'?y:NaN; }
function vw(W,Hh){ var k=W/S.span, ys=Hh/k; return H.view({l:0,t:0,w:W,h:Hh},S.cx-S.span/2,S.cx+S.span/2,S.cy-ys/2,S.cy+ys/2); }
function zeros(f,x0,x1,n){ var out=[], step=(x1-x0)/n, px=x0, py=f(px);
  for(var j=1;j<=n&&out.length<12;j++){ var x=x0+j*step, y=f(x);
    if(isFinite(py)&&isFinite(y)){
      if(py===0) add(px); else if(py*y<0){ var a=px, b=x, fa=py; for(var q=0;q<60;q++){ var m=(a+b)/2, fm=f(m); if(!isFinite(fm)) break; if(fa*fm<=0) b=m; else { a=m; fa=fm; } }
        var r=(a+b)/2, fr=f(r); if(isFinite(fr)&&Math.abs(fr)<1e-6*(1+Math.abs(py)+Math.abs(y))) add(r); } }
    px=x; py=y; }
  /* touching roots (no sign change), e.g. (x-1)^2: a local minimum of |f| that reaches 0 */
  var ys=[]; for(j=0;j<=n;j++) ys.push(f(x0+j*step));
  for(j=1;j<n&&out.length<12;j++){ var a0=Math.abs(ys[j-1]), a1=Math.abs(ys[j]), a2=Math.abs(ys[j+1]);
    if(!(a1<=a0&&a1<=a2)||!isFinite(a0+a1+a2)||ys[j-1]*ys[j+1]<0||ys[j-1]*ys[j]<0) continue;
    var lo=x0+(j-1)*step, hi=x0+(j+1)*step; for(var q2=0;q2<80;q2++){ var m1=lo+(hi-lo)/3, m2=hi-(hi-lo)/3; if(Math.abs(f(m1))<Math.abs(f(m2))) hi=m2; else lo=m1; }
    var rr=(lo+hi)/2, fv=Math.abs(f(rr)); if(fv<1e-7*(1+a0+a2)&&!out.some(function(o){ return Math.abs(o-rr)<step; })) add(rr); }
  out.sort(function(a,b){ return a-b; });
  function add(r){ if(!out.length||Math.abs(out[out.length-1]-r)>step*0.5) out.push(Math.abs(r)<1e-10?0:r); }
  return out; }
var E={id:'func', cat:'math', icon:'📈', name:'함수 그래프', desc:'식을 쓰고 a, b, c를 움직여 그래프 탐구',
  info:'y = f(x)의 x에 여러 값을 넣어 점을 이으면 그래프가 돼요. a, b, c를 바꾸면 그래프가 옮겨지거나 늘어나요. f(x) = 0이 되는 x가 x절편(근)이고, 두 그래프가 만나는 점은 두 식이 같아지는 x예요.',
  tries:['y = a(x − b)² + c 에서 b와 c를 움직이면 꼭짓점이 어디로 가는지 보세요','a를 음수로 바꾸면 그래프가 어떻게 바뀌나요?','g(x) 칸에 x + 2를 쓰고 두 그래프가 만나는 점을 찾아보세요','sin(b*x)에서 b를 2로 바꾸면 주기가 어떻게 되나요?'],
  hint:'끌어서 옮기고, 두 손가락이나 휠로 확대해요. 그래프를 누르면 점 P가 옮겨져요.',
  noPlay:true,
  params:[{id:'a',l:'a',min:-5,max:5,step:0.1,val:1},{id:'b',l:'b',min:-5,max:5,step:0.1,val:0},{id:'c',l:'c',min:-5,max:5,step:0.1,val:0},
    {id:'tx',l:'점 P의 x 좌표',min:-20,max:20,step:0.01,val:1}],
  cols:[{k:'x',l:'x',d:2},{k:'f',l:'f(x)',d:3},{k:'g',l:'g(x)',d:3},{k:'h',l:'h(x)',d:3},{k:'a',l:'a',d:1},{k:'b',l:'b',d:1},{k:'c',l:'c',d:1}],
  gx:'x', gy:'f', join:true,
  actions:[['zin','확대'],['zout','축소']],
  act:function(k){ var z=k==='zin'?0.5:2; S.span=H.clamp(S.span*z,0.02,2000); },
  save:function(){ return {ex:S.ex.slice(), cx:S.cx, cy:S.cy, span:S.span}; },
  restore:function(o){ if(o&&Array.isArray(o.ex)) S.ex=[0,1,2].map(function(i){ return typeof o.ex[i]==='string'?o.ex[i].slice(0,200):''; });
    if(o&&isFinite(o.span)&&o.span>0){ S.cx=+o.cx||0; S.cy=+o.cy||0; S.span=H.clamp(+o.span,0.02,2000); } rebuild(); },
  reset:function(){ S.cx=0; S.cy=0; S.span=20; },
  custom:function(box){
    var h=document.createElement('div'); box.appendChild(h);
    NM.forEach(function(n,i){ var r=document.createElement('div'); r.className='fx'; r.innerHTML='<i></i><span></span><input data-notr spellcheck="false" autocomplete="off" autocapitalize="off"><button aria-label="">×</button>';
      r.querySelector('i').style.background=COLS[i]; r.querySelector('span').textContent=n+'(x) ='; var inp=r.querySelector('input'); inp.value=S.ex[i]; inp.placeholder=i?T('비워 두면 안 그려요'):'a*(x-b)^2+c';
      inp.setAttribute('aria-label',n+'(x)'); r.querySelector('button').setAttribute('aria-label',T('지우기'));
      var err=document.createElement('div'); err.className='fxErr'; err.hidden=true; err.textContent=T('식을 이해하지 못했어요. 예: 2*x^2 - 3, sin(x), sqrt(x)');
      function upd(){ S.ex[i]=inp.value; build(i); inp.classList.toggle('bad',S.bad[i]); err.hidden=!S.bad[i]; H.redraw(); LAB.saveNow(); }
      inp.addEventListener('input',upd); inp.addEventListener('keydown',function(e){ e.stopPropagation(); if(e.key==='Enter') inp.blur(); });
      r.querySelector('button').onclick=function(){ inp.value=''; upd(); };
      h.appendChild(r); h.appendChild(err); inp.classList.toggle('bad',S.bad[i]); err.hidden=!S.bad[i]; });
    var ch=document.createElement('div'); ch.className='pre'; ch.style.margin='0 0 14px';
    ['a*(x-b)^2+c','a*x+b','a*sin(b*x)+c','a*x^3+b*x','2^x','sqrt(x)','1/x','abs(x)'].forEach(function(s){ var b=document.createElement('button'); b.textContent=s; b.setAttribute('data-notr','');
      b.onclick=function(){ var ins=h.querySelectorAll('.fx input'), k=0; for(var j=0;j<3;j++){ if(!ins[j].value.trim()){ k=j; break; } } ins[k].value=s; ins[k].dispatchEvent(new Event('input')); }; ch.appendChild(b); });
    box.appendChild(ch);
  },
  draw:function(g,W,Hh){
    var p=this.p, v=vw(W,Hh); H.axes(g,v,{xl:'x',yl:'y'});
    var step=1/Math.max(1,Math.min(2,window.devicePixelRatio||1));
    for(var i=2;i>=0;i--){ if(!S.fn[i]) continue; g.beginPath(); var pen=false, py=null, psy=0;
      for(var px=0;px<=W+step;px+=step){ var x=v.ix(px), y=ev(i,x,p), sy=v.sy(y);
        if(!isFinite(y)||!isFinite(sy)){ pen=false; py=null; continue; }
        if(pen&&py!=null&&Math.abs(sy-psy)>Hh*0.5){ var ym=ev(i,v.ix(px-step/2),p); if(!isFinite(ym)||ym<Math.min(py,y)-1e-9||ym>Math.max(py,y)+1e-9) pen=false; }
        var cy=H.clamp(sy,-Hh*3,Hh*4); if(!pen){ g.moveTo(px,cy); pen=true; } else g.lineTo(px,cy); py=y; psy=sy; }
      g.strokeStyle=COLS[i]; g.lineWidth=2.6; g.lineJoin='round'; g.stroke(); }
    S.roots=S.fn[0]?zeros(function(x){ return ev(0,x,p); },v.x0,v.x1,Math.ceil(W/2)):[];
    S.meets=S.fn[0]&&S.fn[1]?zeros(function(x){ return ev(0,x,p)-ev(1,x,p); },v.x0,v.x1,Math.ceil(W/2)):[];
    S.roots.forEach(function(r){ H.dot(g,v.sx(r),v.sy(0),5,TH.stage,C.fry); });
    S.meets.forEach(function(r){ H.dot(g,v.sx(r),v.sy(ev(0,r,p)),5,TH.stage,C.vio); });
    var tx=p.tx, X=v.sx(tx);
    if(X>-20&&X<W+20){ H.seg(g,X,0,X,Hh,TH.dim,1,[4,5]);
      for(var j=0;j<3;j++){ var ty=ev(j,tx,p); if(!S.fn[j]||!isFinite(ty)) continue; var Y=v.sy(ty); if(Y<-20||Y>Hh+20) continue;
        H.dot(g,X,Y,6.5,COLS[j],TH.stage);
        var lab=(j?NM[j]+': ':'P ')+'('+short(tx)+', '+short(ty)+')', right=X<W-150;
        H.text(g,lab,X+(right?12:-12),Y-14,{al:right?'left':'right',size:12.5,w:700,c:COLS[j],bg:'rgba(8,9,13,.78)'}); } }
  },
  read:function(){ var p=this.p, r=[];
    if(!S.fn[0]) return [['f(x)','식을 써 주세요','','wide']];
    r.push(['y절편 f(0)',short(ev(0,0,p)),'','hl']);
    r.push(['x절편 (f(x) = 0인 x)',S.roots.length?S.roots.slice(0,5).map(short).join(', ')+(S.roots.length>5?' …':''):'보이는 범위에 없음','','wide']);
    if(S.fn[1]) r.push(['f와 g가 만나는 x',S.meets.length?S.meets.slice(0,5).map(short).join(', ')+(S.meets.length>5?' …':''):'보이는 범위에 없음','','wide']);
    r.push(['점 P','('+short(p.tx)+', '+short(ev(0,p.tx,p))+')','','wide']);
    if(S.fn[1]) r.push(['g(P의 x)',short(ev(1,p.tx,p)),'']); if(S.fn[2]) r.push(['h(P의 x)',short(ev(2,p.tx,p)),'']);
    return r; },
  record:function(){ var p=this.p; if(!S.fn[0]) return '먼저 f(x) 칸에 식을 써 주세요';
    return {x:p.tx, f:ev(0,p.tx,p), g:ev(1,p.tx,p), h:ev(2,p.tx,p), a:p.a, b:p.b, c:p.c}; },
  ai:function(){ var p=this.p, L=['Function grapher (y = f(x)). Parameters a='+p.a+', b='+p.b+', c='+p.c+'.'];
    NM.forEach(function(n,i){ if(S.ex[i].trim()) L.push(n+'(x) = '+S.ex[i].trim()+(S.bad[i]?' (cannot be read)':'')); });
    L.push('Visible x range: '+short(S.cx-S.span/2)+' to '+short(S.cx+S.span/2)+'.');
    if(S.fn[0]){ L.push('f(0) = '+short(ev(0,0,p))+'. Roots of f in view: '+(S.roots.length?S.roots.slice(0,6).map(short).join(', '):'none')+'.');
      if(S.fn[1]) L.push('f and g meet at x = '+(S.meets.length?S.meets.slice(0,6).map(short).join(', '):'none in view')+'.');
      L.push('Point P: x = '+short(p.tx)+', f(x) = '+short(ev(0,p.tx,p))+'.'); }
    return L.join('\n'); },
  down:function(x,y,e){ S.pts[e.pointerId]=[x,y]; var ids=Object.keys(S.pts);
    if(ids.length===1){ S.drag={x:x,y:y,cx:S.cx,cy:S.cy}; S.moved=false; S.pinch=null; }
    else if(ids.length===2){ var a=S.pts[ids[0]], b=S.pts[ids[1]], v=vw(H.W,H.H); S.pinch={d:Math.hypot(a[0]-b[0],a[1]-b[1])||1, span:S.span, wx:v.ix((a[0]+b[0])/2), wy:v.iy((a[1]+b[1])/2)}; S.moved=true; }
    return true; },
  move:function(x,y,e){ if(!S.pts[e.pointerId]) return false; S.pts[e.pointerId]=[x,y]; var ids=Object.keys(S.pts), W=H.W, Hh=H.H;
    if(ids.length>=2&&S.pinch){ var a=S.pts[ids[0]], b=S.pts[ids[1]], d=Math.hypot(a[0]-b[0],a[1]-b[1])||1; S.span=H.clamp(S.pinch.span*S.pinch.d/d,0.02,2000);
      var k=W/S.span, mx=(a[0]+b[0])/2, my=(a[1]+b[1])/2; S.cx=S.pinch.wx-(mx-W/2)/k; S.cy=S.pinch.wy+(my-Hh/2)/k; return true; }
    if(S.drag){ var dx=x-S.drag.x, dy=y-S.drag.y; if(!S.moved&&Math.hypot(dx,dy)>6) S.moved=true;
      if(S.moved){ var k2=W/S.span; S.cx=S.drag.cx-dx/k2; S.cy=S.drag.cy+dy/k2; return true; } }
    return false; },
  up:function(x,y,e){ if(!S.pts[e.pointerId]) return false; delete S.pts[e.pointerId]; var ids=Object.keys(S.pts);
    if(!ids.length){ if(S.drag&&!S.moved){ var v=vw(H.W,H.H), tx=Math.round(v.ix(x)*100)/100; H.setP('tx',tx); } S.drag=null; S.pinch=null; LAB.saveNow(); }
    else if(ids.length===1){ var q=S.pts[ids[0]]; S.drag={x:q[0],y:q[1],cx:S.cx,cy:S.cy}; S.pinch=null; }
    return true; },
  wheel:function(x,y,e){ var W=H.W, Hh=H.H, v=vw(W,Hh), wx=v.ix(x), wy=v.iy(y); S.span=H.clamp(S.span*Math.exp(e.deltaY*0.0015),0.02,2000);
    var k=W/S.span; S.cx=wx-(x-W/2)/k; S.cy=wy+(y-Hh/2)/k; clearTimeout(E._wt); E._wt=setTimeout(LAB.saveNow,400); return true; }
};
rebuild();
LAB.add(E);
LAB.compileExpr=compile;
})();

/* =====================================================================
   2. Probability: coin, one die, sum of two dice, Monte Carlo π
   ===================================================================== */
(function(){
var S={n:0, counts:[], hist:[], next:1, last:null, last2:null, anim:0, acc:0, dots:null, dn:0};
function model(p){
  if(p.mode==='coin') return {lab:['앞면','뒷면'], th:[.5,.5], tgt:0, frac:'1/2'};
  if(p.mode==='die') return {lab:['1','2','3','4','5','6'], th:[1,1,1,1,1,1].map(function(){ return 1/6; }), tgt:p.face-1, frac:'1/6'};
  if(p.mode==='dice2'){ var th=[]; for(var s=2;s<=12;s++) th.push((6-Math.abs(s-7))/36); return {lab:['2','3','4','5','6','7','8','9','10','11','12'], th:th, tgt:p.sum-2, frac:(6-Math.abs(p.sum-7))+'/36'}; }
  return {lab:['원 안','원 밖'], th:[Math.PI/4,1-Math.PI/4], tgt:0, frac:'π/4', pi:true};
}
function measured(p){ if(!S.n) return null; var m=model(p), f=S.counts[m.tgt]/S.n; return m.pi?4*f:f; }
function theory(p){ var m=model(p); return m.pi?Math.PI:m.th[m.tgt]; }
function trial(p){
  var o, r=Math.random;
  if(p.mode==='coin') o=r()<0.5?0:1;
  else if(p.mode==='die'){ o=Math.floor(r()*6); S.last2=[o+1]; }
  else if(p.mode==='dice2'){ var a=1+Math.floor(r()*6), b=1+Math.floor(r()*6); o=a+b-2; S.last2=[a,b]; }
  else { var x=r(), y=r(), inn=x*x+y*y<=1; o=inn?0:1; S.lastPt=[x,y];
    if(S.dn<40000){ var c=S.dots.getContext('2d'); c.fillStyle=inn?'rgba(255,201,60,.85)':'rgba(79,157,255,.85)'; c.fillRect(x*400-1,(1-y)*400-1,2.2,2.2); S.dn++; } }
  S.counts[o]++; S.n++; S.last=o;
  if(S.n>=S.next){ S.hist.push([S.n,measured(p)]); S.next=Math.max(S.n+1,Math.ceil(S.n*1.03)); }
}
function many(p,k){ for(var i=0;i<k;i++) trial(p); S.hist.length&&S.hist[S.hist.length-1][0]!==S.n&&S.hist.push([S.n,measured(p)]); }
function pips(g,cx,cy,s,v,col){
  H.rrect(g,cx-s/2,cy-s/2,s,s,s*0.18); g.fillStyle='#f6f3ec'; g.fill(); g.strokeStyle='rgba(0,0,0,.25)'; g.lineWidth=2; g.stroke();
  var P={1:[[0,0]],2:[[-1,-1],[1,1]],3:[[-1,-1],[0,0],[1,1]],4:[[-1,-1],[1,-1],[-1,1],[1,1]],5:[[-1,-1],[1,-1],[0,0],[-1,1],[1,1]],6:[[-1,-1],[1,-1],[-1,0],[1,0],[-1,1],[1,1]]}[v]||[];
  P.forEach(function(q){ H.dot(g,cx+q[0]*s*0.27,cy+q[1]*s*0.27,s*0.085,v===1?'#e0313b':(col||'#1f1b14')); });
}
var E={id:'prob', cat:'math', icon:'🎲', name:'확률 실험', desc:'동전·주사위를 많이 던지면 상대도수가 확률에 가까워져요',
  info:'한 번 던질 때는 무엇이 나올지 몰라도, 아주 많이 던지면 (나온 횟수 ÷ 던진 횟수)인 상대도수가 수학적 확률에 가까워져요. 이것을 큰 수의 법칙이라고 해요. 원주율 모드는 정사각형 안에 점을 마구 찍어 원 안에 들어간 비율로 π를 어림해요.',
  tries:['10번만 던졌을 때와 1000번 던졌을 때 상대도수를 비교해 보세요','주사위 2개의 합에서 7이 가장 자주 나오는 까닭을 생각해 보세요','원주율 모드에서 점을 1만 개 넘게 찍으면 π에 얼마나 가까워지나요?','기록을 여러 번 남기고 시행 횟수와 차이의 그래프를 그려 보세요'],
  playLabel:'자동', live:true,
  params:[{id:'mode',l:'실험',type:'seg',opts:[['coin','동전'],['die','주사위 1개'],['dice2','주사위 2개의 합'],['pi','원주율 π 어림']],val:'coin'},
    {id:'face',l:'관찰할 눈',min:1,max:6,step:1,val:6,show:function(p){ return p.mode==='die'; }},
    {id:'sum',l:'관찰할 합',min:2,max:12,step:1,val:7,show:function(p){ return p.mode==='dice2'; }},
    {id:'rate',l:'자동으로 던지는 빠르기',type:'seg',opts:[[5,'1초에 5번'],[60,'1초에 60번'],[1000,'1초에 1000번']],val:60}],
  cols:[{k:'n',l:'시행 횟수',d:0},{k:'m',l:'측정값',d:4},{k:'th',l:'이론값',d:4},{k:'err',l:'차이',d:4}],
  gx:'n', gy:'m', join:true,
  actions:[['t1','1번'],['t10','10번'],['t100','100번'],['t1000','1000번']],
  act:function(k){ var n=+k.slice(1); many(this.p,n); S.anim=n===1?0.5:0.25; },
  reset:function(){ var m=model(this.p); S.n=0; S.counts=m.lab.map(function(){ return 0; }); S.hist=[]; S.next=1; S.last=null; S.last2=null; S.lastPt=null; S.anim=0; S.acc=0;
    if(!S.dots){ S.dots=document.createElement('canvas'); S.dots.width=S.dots.height=400; } S.dots.getContext('2d').clearRect(0,0,400,400); S.dn=0; },
  change:function(k){ if(k!=='rate') this.reset(); },
  step:function(dt){ if(S.anim>0) S.anim=Math.max(0,S.anim-dt); if(!H.running) return; S.acc+=this.p.rate*dt; var k=Math.min(5000,Math.floor(S.acc)); S.acc-=k; if(k>0){ many(this.p,k); if(this.p.rate<=5) S.anim=0.35; } },
  draw:function(g,W,Hh){
    var p=this.p, m=model(p), wide=W>=Hh*1.15&&W>=520, viz, bars, conv;
    if(wide){ viz={l:14,t:14,w:W*0.36-20,h:Hh-28}; bars={l:W*0.36+46,t:34,w:W*0.64-62,h:(Hh-34)*0.5-48}; conv={l:W*0.36+46,t:34+(Hh-34)*0.5,w:W*0.64-62,h:(Hh-34)*0.5-40}; }
    else { viz={l:12,t:10,w:W-24,h:Hh*0.27}; bars={l:46,t:Hh*0.27+34,w:W-62,h:Hh*0.33-46}; conv={l:46,t:Hh*0.6+30,w:W-62,h:Hh*0.4-66}; }
    /* the last throw */
    var cx=viz.l+viz.w/2, cy=viz.t+viz.h*0.46, sz=Math.min(viz.w,viz.h)*0.62;
    if(p.mode==='coin'){ var face=S.last==null?0:S.last, k=S.anim>0?Math.abs(Math.cos(S.anim*TAU*2.2)):1, r=sz*0.5;
      g.save(); g.translate(cx,cy); g.scale(1,Math.max(0.06,k)); g.beginPath(); g.arc(0,0,r,0,TAU); var gr=g.createRadialGradient(-r*.3,-r*.3,r*.1,0,0,r);
      gr.addColorStop(0,face?'#e7ecf5':'#ffe28a'); gr.addColorStop(1,face?'#8f9ab0':'#d99a1e'); g.fillStyle=gr; g.fill(); g.lineWidth=3; g.strokeStyle=face?'#6c7690':'#a8740f'; g.stroke();
      g.beginPath(); g.arc(0,0,r*0.8,0,TAU); g.strokeStyle='rgba(0,0,0,.18)'; g.lineWidth=2; g.stroke();
      H.text(g,T(face?'뒤':'앞'),0,2,{al:'center',size:r*0.75,w:800,c:face?'#4a5368':'#7a4f00'}); g.restore(); }
    else if(p.mode==='die'||p.mode==='dice2'){ var dv=S.last2||(p.mode==='die'?[p.face]:[3,4]); if(S.anim>0) dv=dv.map(function(){ return 1+Math.floor(Math.random()*6); });
      var s=p.mode==='die'?sz*0.8:Math.min(sz*0.7,viz.w*0.36);
      dv.forEach(function(v,i){ var x=dv.length===1?cx:cx+(i?1:-1)*s*0.62; g.save(); g.translate(x,cy); g.rotate(S.anim>0?(Math.random()-.5)*0.5:(i?0.06:-0.05)); pips(g,0,0,s,v); g.restore(); }); }
    else { var q=Math.min(viz.w,viz.h)*0.86, x0=cx-q/2, y0=cy-q/2+viz.h*0.04; g.fillStyle=TH.light?'#f1ede4':'#0d1018'; g.fillRect(x0,y0,q,q);
      g.drawImage(S.dots,x0,y0,q,q); g.strokeStyle=TH.dim; g.lineWidth=1.5; g.strokeRect(x0,y0,q,q);
      g.beginPath(); g.arc(x0,y0+q,q,-Math.PI/2,0); g.strokeStyle=C.fry; g.lineWidth=2; g.stroke(); }
    var cap=S.n?(p.mode==='pi'?'π ≈ '+fmt(measured(p),4):p.mode==='dice2'&&S.last2?S.last2[0]+' + '+S.last2[1]+' = '+(S.last2[0]+S.last2[1]):T(m.lab[S.last])):T('버튼을 눌러 던져 보세요');
    H.text(g,cap,cx,viz.t+viz.h-8,{al:'center',size:15,w:700,c:S.n?TH.text:TH.dim});
    /* relative frequency bars */
    var K=m.lab.length, fr=m.lab.map(function(_,i){ return S.n?S.counts[i]/S.n:0; }), top=Math.max.apply(null,m.th.concat(fr))*1.18;
    top=Math.min(1,Math.max(top,0.05)); var v=H.view(bars,-0.5,K-0.5,0,top);
    H.axes(g,v,{box:true,noVGrid:true,xs:1,xf:function(){ return ''; },yf:function(y){ return Math.round(y*100)+'%'; },ys:H.nice(top,4)});
    for(var i=0;i<K;i++){ var bw=Math.min(54,v.kx*0.7), x=v.sx(i);
      g.fillStyle=i===m.tgt?C.or:'rgba(79,157,255,.75)'; var y1=v.sy(fr[i]); g.fillRect(x-bw/2,y1,bw,v.sy(0)-y1);
      H.seg(g,x-v.kx*0.45,v.sy(m.th[i]),x+v.kx*0.45,v.sy(m.th[i]),C.grn,2,[5,3]);
      H.text(g,T(m.lab[i]),x,bars.t+bars.h+12,{al:'center',size:K>8?10.5:12,c:i===m.tgt?C.or:TH.dim,w:i===m.tgt?700:500}); }
    H.text(g,T('상대도수'),bars.l,bars.t-14,{size:12.5,w:700});
    var lx=bars.l+bars.w; H.seg(g,lx-118,bars.t-14,lx-98,bars.t-14,C.grn,2,[5,3]); H.text(g,T('수학적 확률'),lx-92,bars.t-14,{size:11.5,c:TH.dim});
    /* convergence */
    var nmax=Math.max(100,S.n), lo, hi, th=theory(p);
    if(m.pi){ lo=2.6; hi=3.8; } else { lo=0; hi=Math.min(1,Math.max(th*2.4,0.06)); }
    var cv=H.view(conv,0,Math.log10(nmax),lo,hi);
    H.axes(g,cv,{box:true,xs:1,xf:function(x){ var n=Math.round(Math.pow(10,x)); return n>=1e6?n/1e6+'M':n>=1000?n/1000+'k':String(n); },ys:H.nice(hi-lo,4),yf:m.pi?null:function(y){ return Math.round(y*1000)/10+'%'; }});
    g.save(); g.beginPath(); g.rect(conv.l,conv.t,conv.w,conv.h); g.clip();
    H.seg(g,conv.l,cv.sy(th),conv.l+conv.w,cv.sy(th),C.grn,2,[6,4]);
    H.line(g,S.hist.map(function(q){ return [cv.sx(Math.log10(q[0])),cv.sy(H.clamp(q[1],lo-1,hi+1))]; }),C.or,2.2); g.restore();
    H.text(g,T(m.pi?'던진 횟수에 따른 π 어림값':'던진 횟수에 따른 상대도수'),conv.l,conv.t-14,{size:12.5,w:700});
    H.text(g,T('시행 횟수 (로그 눈금)'),conv.l+conv.w,conv.t+conv.h+22,{al:'right',size:11,c:TH.dim});
  },
  read:function(){ var p=this.p, m=model(p), me=measured(p), th=theory(p);
    if(m.pi) return [['찍은 점의 수',String(S.n),''],['원 안에 들어간 점',String(S.counts[0]||0),''],['π 어림값 (4 × 비율)',fmt(me,4),'','hl'],['참값 π','3.1416','','th'],['차이',me==null?'—':fmt(Math.abs(me-th),4),'']];
    var what=p.mode==='coin'?'앞면이 나온 횟수':p.mode==='die'?F('{0}의 눈이 나온 횟수',p.face):F('합이 {0}인 횟수',p.sum);
    return [['시행 횟수',String(S.n),''],[what,String(S.counts[m.tgt]||0),''],['상대도수',fmt(me,4),'','hl'],['수학적 확률',m.frac+' ≈ '+fmt(th,4),'','th'],['차이',me==null?'—':fmt(Math.abs(me-th),4),'']]; },
  record:function(){ var p=this.p; if(!S.n) return '먼저 몇 번 던져 보세요'; var me=measured(p), th=theory(p); return {n:S.n, m:me, th:th, err:Math.abs(me-th)}; },
  ai:function(){ var p=this.p, m=model(p), me=measured(p);
    var what=p.mode==='coin'?'fair coin, watching heads':p.mode==='die'?'one fair die, watching the face '+p.face:p.mode==='dice2'?'sum of two fair dice, watching the sum '+p.sum:'Monte Carlo estimate of pi (random points in a unit square, ratio inside the quarter circle times 4)';
    return 'Probability experiment: '+what+'.\nTrials n = '+S.n+(S.n?', target count = '+S.counts[m.tgt]+', measured '+(m.pi?'pi estimate':'relative frequency')+' = '+fmt(me,4):'')+', theoretical value = '+fmt(theory(p),4)+' ('+m.frac+').'; }
};
LAB.add(E);
})();

/* =====================================================================
   3. Unit circle and trigonometric functions
   ===================================================================== */
(function(){
var S={drag:null, lay:null};
function layout(W,Hh){ var wide=W>=Hh*1.25, L={wide:wide};
  if(wide){ L.R=Math.min(Hh*0.34,W*0.19); L.cx=26+L.R*1.3; L.cy=Hh/2; var gl=L.cx+L.R*1.45+30; L.gr={l:gl,t:16,w:W-gl-18,h:Hh-46}; L.yr=(L.gr.h/2)/L.R; L.gcy=L.cy; }
  else { L.R=Math.min(W*0.27,Hh*0.17); L.cx=W/2; L.cy=16+L.R*1.3; var gt=L.cy+L.R*1.42+22; L.gr={l:42,t:gt,w:W-58,h:Math.max(60,Hh-gt-34)}; L.yr=1.6; }
  return L; }
var E={id:'trig', cat:'math', icon:'🔵', name:'단위원과 삼각함수', desc:'원 위의 점으로 sin, cos, tan 보기',
  info:'반지름이 1인 원 위에서 각 θ만큼 돈 점 P의 좌표가 (cos θ, sin θ)예요. 점을 계속 돌리면 sin θ와 cos θ는 위아래로 출렁이는 물결 모양 그래프가 되고, 360°마다 같은 모양이 되풀이돼요. tan θ = sin θ ÷ cos θ예요.',
  tries:['θ = 30°, 45°, 60°일 때 sin θ를 기록해 특수각 표와 비교해 보세요','θ가 90°에 가까워지면 tan θ는 어떻게 되나요?','sin θ = cos θ가 되는 각을 두 개 찾아보세요','어느 각에서든 sin²θ + cos²θ가 1인지 확인해 보세요'],
  hint:'원 위의 점을 끌거나 그래프를 눌러 각을 바꿔요.',
  playLabel:'돌리기',
  params:[{id:'th',l:'각 θ',min:0,max:360,step:1,val:30,u:'°'},{id:'w',l:'돌아가는 빠르기',min:5,max:120,step:5,val:30,u:'°/s'},
    {id:'tan',l:'tan θ 보이기',type:'check',val:true},{id:'cosg',l:'cos θ 그래프 보이기',type:'check',val:true}],
  cols:[{k:'th',l:'각 θ',u:'°',d:1},{k:'s',l:'sin θ',d:4},{k:'c',l:'cos θ',d:4},{k:'t',l:'tan θ',d:4}],
  gx:'th', gy:'s', join:true,
  reset:function(){},
  step:function(dt){ var t=this.p.th+this.p.w*dt; if(t>=360) t-=360; this.p.th=t; H.setP('th',t); },
  draw:function(g,W,Hh){
    var p=this.p, L=S.lay=layout(W,Hh), R=L.R, cx=L.cx, cy=L.cy, a=p.th*D2R, cs=Math.cos(a), sn=Math.sin(a), Px=cx+R*cs, Py=cy-R*sn;
    if(Math.abs(cs)<1e-12) cs=0; if(Math.abs(sn)<1e-12) sn=0;
    H.seg(g,cx-R*1.35,cy,cx+R*1.35,cy,TH.dim,1); H.seg(g,cx,cy-R*1.35,cx,cy+R*1.35,TH.dim,1);
    for(var d=0;d<360;d+=30){ var q=d*D2R; H.seg(g,cx+R*0.95*Math.cos(q),cy-R*0.95*Math.sin(q),cx+R*1.05*Math.cos(q),cy-R*1.05*Math.sin(q),TH.dim,1); }
    g.beginPath(); g.arc(cx,cy,R,0,TAU); g.strokeStyle=TH.text; g.globalAlpha=.55; g.lineWidth=1.5; g.stroke(); g.globalAlpha=1;
    H.text(g,'1',cx+R+4,cy+10,{size:11,c:TH.dim}); H.text(g,'-1',cx-R-4,cy+10,{size:11,c:TH.dim,al:'right'});
    if(p.tan&&Math.abs(cs)>1e-9){ var tn=sn/cs, ty=H.clamp(cy-R*tn,cy-R*1.6,cy+R*1.6);
      H.seg(g,cx+R,cy-R*1.6,cx+R,cy+R*1.6,'rgba(63,224,143,.35)',1,[3,4]);
      var ex=cs>0?1:-1; H.seg(g,cx,cy,cx+R*ex*1,cy-R*tn*ex,'rgba(63,224,143,.5)',1.2,[5,4]);
      H.seg(g,cx+R,cy,cx+R,ty,C.grn,4); if(Math.abs(tn)<1.6) H.text(g,'tan θ',cx+R+8,(cy+ty)/2,{size:12,w:700,c:C.grn}); }
    g.beginPath(); g.arc(cx,cy,R*0.2,0,-a,true); g.strokeStyle=C.vio; g.lineWidth=2; g.stroke();
    H.text(g,'θ',cx+R*0.3*Math.cos(a/2),cy-R*0.3*Math.sin(a/2),{size:13,w:700,c:C.vio,al:'center'});
    H.seg(g,cx,cy,Px,Py,TH.text,2);
    H.seg(g,cx,cy,Px,cy,C.blu,4.5); H.seg(g,Px,cy,Px,Py,C.fry,4.5);
    H.text(g,'cos θ',(cx+Px)/2,cy+(sn>=0?14:-14),{al:'center',size:12,w:700,c:C.blu});
    H.text(g,'sin θ',Px+(cs>=0?-8:8),(cy+Py)/2,{al:cs>=0?'right':'left',size:12,w:700,c:C.fry});
    H.dot(g,Px,Py,8,TH.stage,TH.text); H.dot(g,Px,Py,4.5,C.vio);
    H.text(g,'P('+fmt(cs,2)+', '+fmt(sn,2)+')',Px+(cs>=0?12:-12),Py+(sn>=0?-14:14),{al:cs>=0?'left':'right',size:12,w:700,bg:'rgba(8,9,13,.7)',c:'#eef0f5'});
    /* graph */
    var gv=H.view(L.gr,0,360,-L.yr,L.yr);
    H.axes(g,gv,{box:true,xs:90,xf:function(x){ return Math.round(x)+'°'; },ys:L.yr>2.2?1:0.5});
    g.save(); g.beginPath(); g.rect(L.gr.l,L.gr.t,L.gr.w,L.gr.h); g.clip();
    function curve(f,c,dash){ var pts=[], all=[]; for(var x=0;x<=360;x+=1){ var y=f(x*D2R); if(!isFinite(y)||Math.abs(y)>L.yr*1.4){ if(pts.length) all.push(pts); pts=[]; continue; } pts.push([gv.sx(x),gv.sy(y)]); } if(pts.length) all.push(pts);
      all.forEach(function(s){ H.line(g,s,c,2.4,dash); }); }
    if(p.tan) curve(function(t){ var c=Math.cos(t); return Math.abs(c)<1e-6?NaN:Math.tan(t); },'rgba(63,224,143,.8)',[6,4]);
    if(p.cosg) curve(Math.cos,C.blu); curve(Math.sin,C.fry);
    var gx=gv.sx(p.th); H.seg(g,gx,L.gr.t,gx,L.gr.t+L.gr.h,C.vio,1.5,[4,4]);
    if(p.cosg) H.dot(g,gx,gv.sy(cs),5,C.blu,TH.stage); H.dot(g,gx,gv.sy(sn),6,C.fry,TH.stage);
    g.restore();
    if(L.wide) H.seg(g,Px,Py,gx,gv.sy(sn),'rgba(255,201,60,.45)',1.2,[3,4]);
    H.text(g,'y = sin θ',L.gr.l+8,L.gr.t+12,{size:12,w:700,c:C.fry}); if(p.cosg) H.text(g,'y = cos θ',L.gr.l+86,L.gr.t+12,{size:12,w:700,c:C.blu});
  },
  read:function(){ var t=this.p.th, a=t*D2R, s=Math.sin(a), c=Math.cos(a); if(Math.abs(c)<1e-12) c=0; if(Math.abs(s)<1e-12) s=0;
    return [['각 θ',fmt(t,1),'°','hl'],['라디안',fmt(a,4)+' = '+fmt(t/180,3)+'π',''],['sin θ',fmt(s,4),''],['cos θ',fmt(c,4),''],['tan θ',Math.abs(c)<1e-9?'정할 수 없어요':fmt(s/c,4),''],['sin²θ + cos²θ',fmt(s*s+c*c,4),'','ok']]; },
  record:function(){ var t=this.p.th, a=t*D2R, s=Math.sin(a), c=Math.cos(a); if(Math.abs(c)<1e-12) c=0; return {th:t, s:Math.abs(s)<1e-12?0:s, c:c, t:Math.abs(c)<1e-9?null:s/c}; },
  ai:function(){ var t=this.p.th, a=t*D2R; return 'Unit circle. Angle θ = '+fmt(t,1)+'° ('+fmt(a,4)+' rad). Point P = (cos θ, sin θ) = ('+fmt(Math.cos(a),4)+', '+fmt(Math.sin(a),4)+'). tan θ = '+(Math.abs(Math.cos(a))<1e-9?'undefined':fmt(Math.tan(a),4))+'.'; },
  down:function(x,y){ var L=S.lay; if(!L) return false; var d=Math.hypot(x-L.cx,y-L.cy);
    if(d<L.R*1.5){ S.drag='c'; this.move(x,y,null,true); H.run(false); return true; }
    if(x>=L.gr.l&&x<=L.gr.l+L.gr.w&&y>=L.gr.t-10&&y<=L.gr.t+L.gr.h+10){ S.drag='g'; this.move(x,y,null,true); H.run(false); return true; } return false; },
  move:function(x,y,e,cap){ var L=S.lay; if(!cap||!S.drag||!L) return false; var t;
    if(S.drag==='c'){ t=Math.atan2(L.cy-y,x-L.cx)/D2R; if(t<0) t+=360; }
    else t=H.clamp((x-L.gr.l)/L.gr.w*360,0,360);
    H.setP('th',Math.round(t)%361); return true; },
  up:function(){ S.drag=null; return true; }
};
LAB.add(E);
LAB._trig={S:S};
})();

/* =====================================================================
   4. Projectile motion
   ===================================================================== */
(function(){
var S={shot:null, t:0, landed:false, ghosts:[]};
function launch(p){
  var th=p.ang*D2R, vx=p.v*Math.cos(th), vy=p.v*Math.sin(th), g=p.g, h0=p.h0, q={ang:p.ang,v:p.v,g:g,k:p.k,h0:h0};
  if(Math.abs(vx)<1e-12) vx=0;
  if(!(p.k>0)){ var Tf=(vy+Math.sqrt(vy*vy+2*g*h0))/g; if(!(Tf>0)) Tf=0;
    return {an:true, vx:vx, vy:vy, g:g, h0:h0, T:Tf, R:vx*Tf, Hm:h0+(vy>0?vy*vy/(2*g):0), tTop:Math.max(0,vy/g), p:q}; }
  var k=p.k, dt=0.002, y=[0,h0,vx,vy], t=0, s=[[0,0,h0,vx,vy]], Hm=h0, tTop=0;
  var f=function(u){ var sp=Math.hypot(u[2],u[3]); return [u[2],u[3],-k*sp*u[2],-g-k*sp*u[3]]; };
  while(t<600){ var n=H.rk4(y,f,dt); t+=dt;
    if(n[1]<0){ var fr=y[1]/(y[1]-n[1]), tl=t-dt+fr*dt; s.push([tl,y[0]+fr*(n[0]-y[0]),0,y[2]+fr*(n[2]-y[2]),y[3]+fr*(n[3]-y[3])]);
      return {an:false, s:s, dt:dt, T:tl, R:s[s.length-1][1], Hm:Hm, tTop:tTop, p:q}; }
    y=n; if(y[1]>Hm){ Hm=y[1]; tTop=t; } s.push([t,y[0],y[1],y[2],y[3]]); }
  return {an:false, s:s, dt:dt, T:t, R:y[0], Hm:Hm, tTop:tTop, p:q};
}
function at(sh,t){ t=H.clamp(t,0,sh.T);
  if(sh.an) return [sh.vx*t, sh.h0+sh.vy*t-sh.g*t*t/2, sh.vx, sh.vy-sh.g*t];
  var s=sh.s, i=Math.min(Math.floor(t/sh.dt),s.length-2); if(i<0) return s[0].slice(1); var a=s[i], b=s[i+1], f=(t-a[0])/((b[0]-a[0])||1);
  return [a[1]+f*(b[1]-a[1]),a[2]+f*(b[2]-a[2]),a[3]+f*(b[3]-a[3]),a[4]+f*(b[4]-a[4])]; }
function path(sh,t){ var n=Math.max(2,Math.min(400,Math.ceil(t/sh.T*160)+2)), out=[]; for(var i=0;i<=n;i++){ var q=at(sh,t*i/n); out.push([q[0],q[1]]); } return out; }
function theoryR(p){ var th=p.ang*D2R, vx=p.v*Math.cos(th), vy=p.v*Math.sin(th), Tf=(vy+Math.sqrt(vy*vy+2*p.g*p.h0))/p.g; return {R:vx*Tf, Hm:p.h0+(vy>0?vy*vy/(2*p.g):0), T:Tf}; }
var E={id:'proj', cat:'sci', icon:'🎯', name:'포물선 운동', desc:'던진 각도와 속력에 따라 날아가는 거리',
  info:'비스듬히 던진 물체는 가로로는 같은 빠르기로 가고(등속), 세로로는 중력 때문에 속력이 일정하게 바뀌어요(등가속도). 그래서 길이 포물선이 돼요. 공기 저항이 없고 같은 높이에 떨어지면 도달 거리 R = v²·sin 2θ ÷ g이고, 45°일 때 가장 멀리 가요.',
  tries:['각도 15°와 75°로 던지면 도달 거리가 어떻게 되나요?','각도를 5°씩 바꿔 가며 기록하고, 그래프에서 가장 멀리 가는 각도를 찾아보세요','처음 속력을 2배로 하면 도달 거리는 몇 배가 되나요?','공기 저항을 켜면 가장 멀리 가는 각도가 바뀌나요?','달(g = 1.62)에서 던지면 얼마나 멀리 갈까요?'],
  playLabel:'발사', speed:true,
  params:[{id:'v',l:'처음 속력 v',min:1,max:60,step:0.5,val:20,u:'m/s',d:1},{id:'ang',l:'던지는 각도 θ',min:0,max:90,step:1,val:45,u:'°'},
    {id:'h0',l:'던지는 높이 h',min:0,max:50,step:1,val:0,u:'m'},gParam(),
    {id:'k',l:'공기 저항 계수 k',min:0,max:0.05,step:0.001,val:0,u:'1/m',pre:[[0,'없음'],[0.005,'조금'],[0.02,'많이']]},
    {id:'vec',l:'속도 화살표 보이기',type:'check',val:true}],
  cols:[{k:'ang',l:'각도 θ',u:'°',d:0},{k:'v',l:'처음 속력',u:'m/s',d:1},{k:'g',l:'g',u:'m/s²',d:2},{k:'k',l:'공기 저항 k',u:'1/m',d:3},
    {k:'R',l:'도달 거리',u:'m',d:2},{k:'Hm',l:'최고 높이',u:'m',d:2},{k:'T',l:'비행 시간',u:'s',d:2}],
  gx:'ang', gy:'R', join:true,
  actions:[['clear','지난 자국 지우기']],
  act:function(){ S.ghosts=[]; },
  reset:function(){ S.shot=null; S.t=0; S.landed=false; S.ghosts=[]; },
  onPlay:function(){ if(!S.shot||S.landed){ if(S.shot){ S.ghosts.push(S.shot); if(S.ghosts.length>5) S.ghosts.shift(); } S.shot=launch(this.p); S.t=0; S.landed=S.shot.T<=0; } },
  change:function(k){ if(k==='vec') return; if(S.shot){ if(S.landed){ S.ghosts.push(S.shot); if(S.ghosts.length>5) S.ghosts.shift(); } S.shot=null; S.landed=false; S.t=0; H.run(false); } },
  step:function(dt){ if(!S.shot||S.landed) return 'done'; S.t+=dt; if(S.t>=S.shot.T){ S.t=S.shot.T; S.landed=true; return 'done'; } },
  draw:function(g,W,Hh){
    var p=this.p, th=theoryR(p), xm=Math.max(5,th.R), ym=Math.max(3,th.Hm,p.h0);
    S.ghosts.concat(S.shot?[S.shot]:[]).forEach(function(s){ xm=Math.max(xm,s.R); ym=Math.max(ym,s.Hm); });
    var r={l:46,t:16,w:W-64,h:Hh-50}, v=H.view(r,-xm*0.03,xm*1.06,0,ym*1.12,{equal:true,ax:0,ay:0});
    g.fillStyle=TH.light?'rgba(120,100,60,.12)':'rgba(63,224,143,.06)'; g.fillRect(0,v.sy(0),W,Hh-v.sy(0));
    H.axes(g,v,{xl:'x (m)',yl:'y (m)'});
    H.seg(g,0,v.sy(0),W,v.sy(0),TH.dim,2);
    if(p.h0>0){ g.fillStyle=TH.light?'#cfc6b4':'#2a3042'; g.fillRect(v.sx(0)-10,v.sy(p.h0),12,v.sy(0)-v.sy(p.h0)); }
    S.ghosts.forEach(function(s){ H.line(g,path(s,s.T).map(function(q){ return [v.sx(q[0]),v.sy(q[1])]; }),'rgba(167,139,250,.45)',1.8);
      var X=v.sx(s.R); H.seg(g,X-4,v.sy(0)-4,X+4,v.sy(0)+4,C.vio,2); H.seg(g,X-4,v.sy(0)+4,X+4,v.sy(0)-4,C.vio,2);
      H.text(g,s.p.ang+'°',X,v.sy(0)+14,{al:'center',size:10.5,c:C.vio}); });
    /* cannon */
    var cx=v.sx(0), cy=v.sy(p.h0), a=p.ang*D2R; g.save(); g.translate(cx,cy); g.rotate(-a); H.rrect(g,-4,-6,34,12,4); g.fillStyle=TH.light?'#5d6678':'#c9cfdc'; g.fill(); g.restore();
    H.dot(g,cx,cy,9,TH.light?'#3a4152':'#8a93a6');
    g.beginPath(); g.arc(cx,cy,30,0,-a,true); g.strokeStyle='rgba(167,139,250,.6)'; g.lineWidth=1.5; g.stroke();
    H.text(g,p.ang+'°',cx+36*Math.cos(a/2),cy-36*Math.sin(a/2),{size:11.5,w:700,c:C.vio});
    if(!S.shot){ H.text(g,T('발사를 누르면 공이 날아가요'),r.l+r.w/2,r.t+24,{al:'center',size:13,c:TH.dim}); return; }
    var sh=S.shot, pts=path(sh,S.t).map(function(q){ return [v.sx(q[0]),v.sy(q[1])]; }); H.line(g,pts,C.fry,2.6);
    var dtm=H.nice(sh.T,10)||1; for(var tm=dtm;tm<=S.t+1e-9;tm+=dtm){ var q=at(sh,tm); H.dot(g,v.sx(q[0]),v.sy(q[1]),2.6,'rgba(255,201,60,.9)'); }
    if(S.t>=sh.tTop&&sh.p.ang>0){ var tp=at(sh,sh.tTop), X=v.sx(tp[0]), Y=v.sy(tp[1]); H.seg(g,X,Y,v.sx(0),Y,'rgba(255,201,60,.4)',1,[4,4]);
      H.text(g,'H = '+fmt(sh.Hm,2)+' m',X,Y-14,{al:'center',size:12,w:700,c:C.fry,bg:'rgba(8,9,13,.7)'}); }
    var b=at(sh,S.t), bx=v.sx(b[0]), by=v.sy(b[1]);
    if(p.vec&&!S.landed){ var sv=Math.min(2.4,90/Math.max(1,sh.p.v)); H.arrow(g,bx,by,bx+b[2]*sv,by,C.blu,2,8); H.arrow(g,bx,by,bx,by-b[3]*sv,C.grn,2,8); H.arrow(g,bx,by,bx+b[2]*sv,by-b[3]*sv,TH.text,2.4,10); }
    H.dot(g,bx,by,7,C.or,'#fff');
    if(S.landed){ H.text(g,'R = '+fmt(sh.R,2)+' m',bx,v.sy(0)-16,{al:'center',size:13,w:800,c:'#1c1405',bg:C.fry}); }
  },
  read:function(){ var p=this.p, sh=S.shot, b=sh?at(sh,S.t):[0,p.h0,0,0], th=theoryR(p), done=sh&&S.landed;
    return [['시간 t',fmt(sh?S.t:0,2),'s'],['수평 거리 x',fmt(b[0],2),'m'],['높이 y',fmt(b[1],2),'m'],['속력',fmt(sh?Math.hypot(b[2],b[3]):p.v,2),'m/s'],
      ['도달 거리 (측정)',done?fmt(sh.R,2):'—','m','hl'],['최고 높이',sh&&(S.landed||S.t>=sh.tTop)?fmt(sh.Hm,2):'—','m','hl'],['비행 시간',done?fmt(sh.T,2):'—','s','hl'],
      ['도달 거리 이론값 (공기 저항 없을 때)',fmt(th.R,2),'m','th wide']]; },
  record:function(){ var sh=S.shot; if(!sh||!S.landed) return '공이 땅에 떨어진 뒤에 기록할 수 있어요'; var q=sh.p; return {ang:q.ang, v:q.v, g:q.g, k:q.k, R:sh.R, Hm:sh.Hm, T:sh.T}; },
  ai:function(){ var p=this.p, th=theoryR(p), sh=S.shot, L=['Projectile motion. Launch speed '+p.v+' m/s at '+p.ang+' degrees from height '+p.h0+' m, g = '+p.g+' m/s^2, quadratic air drag coefficient k = '+p.k+' 1/m.'];
    L.push('No-drag theory: range '+fmt(th.R,2)+' m, max height '+fmt(th.Hm,2)+' m, flight time '+fmt(th.T,2)+' s.');
    if(sh) L.push(S.landed?'Last shot (simulated): range '+fmt(sh.R,2)+' m, max height '+fmt(sh.Hm,2)+' m, flight time '+fmt(sh.T,2)+' s.':'The ball is in flight, t = '+fmt(S.t,2)+' s.');
    else L.push('Not launched yet.');
    return L.join('\n'); }
};
LAB.add(E);
LAB._proj={launch:launch, S:S};
})();

/* =====================================================================
   5. Simple pendulum
   ===================================================================== */
(function(){
var S={th:0, w:0, t:0, cr:[], hist:[], sign:1, drag:false, lay:null, hT:0};
function f(p){ var k=p.g/p.L, b=p.b; return function(u){ return [u[1],-k*Math.sin(u[0])-b*u[1]]; }; }
function layout(W,Hh){ var wide=W>=Hh*1.2, a, gr;
  if(wide){ a={l:0,t:0,w:W*0.47,h:Hh}; gr={l:W*0.47+44,t:30,w:W*0.53-62,h:Hh-74}; } else { a={l:0,t:0,w:W,h:Hh*0.6}; gr={l:46,t:Hh*0.6+26,w:W-62,h:Hh*0.4-62}; }
  return {a:a, gr:gr}; }
var E={id:'pend', cat:'sci', icon:'🕰️', name:'진자', desc:'줄 길이와 중력에 따른 진자의 주기',
  info:'진자가 한 번 왕복하는 시간을 주기 T라고 해요. 흔들리는 각이 작을 때 T = 2π√(L/g)로, 줄의 길이 L과 중력 가속도 g로만 정해지고 추의 무게와는 상관이 없어요. 각이 커지면 주기가 조금씩 길어져요.',
  tries:['줄 길이를 바꿔 가며 주기를 기록하고, 가로 L, 세로 T² 그래프가 직선인지 보세요','처음 각도를 10°와 60°로 바꾸면 주기가 같을까요?','줄 길이를 4배로 하면 주기는 몇 배가 되나요?','달(g = 1.62)에서는 주기가 얼마나 길어지나요?'],
  hint:'추를 끌어서 각도를 정하고 놓아 보세요.',
  autoRun:true, speed:true,
  params:[{id:'L',l:'줄 길이 L',min:0.1,max:3,step:0.01,val:1,u:'m'},{id:'th0',l:'처음 각도 θ₀',min:1,max:80,step:1,val:10,u:'°'},gParam(),
    {id:'b',l:'공기 저항 (감쇠)',min:0,max:0.5,step:0.01,val:0,u:'1/s'}],
  cols:[{k:'L',l:'줄 길이 L',u:'m',d:2},{k:'th0',l:'처음 각도 θ₀',u:'°',d:0},{k:'g',l:'g',u:'m/s²',d:2},{k:'T',l:'주기 T',u:'s',d:3},{k:'T2',l:'T²',u:'s²',d:3}],
  gx:'L', gy:'T2', fit:true,
  fitHint:function(m,b,x,y){ if(x==='L'&&y==='T2'&&m>0) return F('기울기 = 4π²/g 이므로 g ≈ {0} m/s²',fmt(4*Math.PI*Math.PI/m,2));
    if(x==='L'&&y==='T'&&m>0) return T('T와 L은 직선 관계가 아니에요. 세로축을 T²으로 바꿔 보세요'); },
  reset:function(){ S.th=S.sign*this.p.th0*D2R; S.w=0; S.t=0; S.cr=[]; S.hist=[[0,S.th/D2R]]; S.hT=0; },
  change:function(){ this.reset(); },
  step:function(dt){ if(S.drag) return; var p=this.p, fn=f(p), n=Math.max(1,Math.ceil(dt/0.0005)), h=dt/n, y=[S.th,S.w];
    for(var i=0;i<n;i++){ var z=H.rk4(y,fn,h); if(y[0]<0&&z[0]>=0){ S.cr.push(S.t+h*(-y[0]/(z[0]-y[0]))); if(S.cr.length>60) S.cr.splice(1,1); } y=z; S.t+=h; }
    S.th=y[0]; S.w=y[1]; if(S.t-S.hT>=1/90){ S.hT=S.t; S.hist.push([S.t,S.th/D2R]); if(S.hist.length>2000) S.hist.splice(0,S.hist.length-1500); } },
  geo:function(W,Hh){ var L=S.lay=layout(W,Hh), a=L.a, scaleL=Math.max(this.p.L,1), px=Math.min((a.h-70)/scaleL,(a.w/2-26)/(scaleL*0.99));
    var ox=a.l+a.w/2, oy=a.t+30, len=this.p.L*px; return {ox:ox, oy:oy, len:len, px:px, bx:ox+len*Math.sin(S.th), by:oy+len*Math.cos(S.th)}; },
  draw:function(g,W,Hh){
    var p=this.p, q=this.geo(W,Hh), L=S.lay, a=L.a;
    g.fillStyle=TH.light?'#cfc6b4':'#2a3042'; g.fillRect(q.ox-60,q.oy-8,120,8);
    H.seg(g,q.ox,q.oy,q.ox,q.oy+q.len+30,TH.dim,1,[4,5]);
    var A=p.th0*D2R; g.beginPath(); g.arc(q.ox,q.oy,q.len,Math.PI/2-A,Math.PI/2+A); g.strokeStyle='rgba(167,139,250,.35)'; g.lineWidth=1.5; g.setLineDash([3,4]); g.stroke(); g.setLineDash([]);
    H.seg(g,q.ox,q.oy,q.bx,q.by,TH.text,2);
    if(Math.abs(S.th)>0.02){ g.beginPath(); var r=Math.min(46,q.len*0.4); g.arc(q.ox,q.oy,r,Math.PI/2,Math.PI/2-S.th,S.th>0); g.strokeStyle=C.vio; g.lineWidth=2; g.stroke(); }
    var br=Math.max(9,Math.min(16,q.len*0.12)), gr=g.createRadialGradient(q.bx-br*.35,q.by-br*.35,br*.1,q.bx,q.by,br); gr.addColorStop(0,'#ffe28a'); gr.addColorStop(1,'#d9861e');
    g.beginPath(); g.arc(q.bx,q.by,br,0,TAU); g.fillStyle=gr; g.fill();
    H.dot(g,q.ox,q.oy,4,TH.text);
    H.text(g,'L = '+fmt(p.L,2)+' m',q.ox+8,q.oy+q.len*0.45,{size:12,c:TH.dim});
    H.text(g,'θ = '+fmt(S.th/D2R,1)+'°',a.l+12,a.t+a.h-14,{size:13,w:700,c:C.vio});
    var Tm=period(S.cr); H.text(g,'t = '+fmt(S.t,2)+' s',a.l+a.w-12,a.t+a.h-14,{al:'right',size:13,w:700,c:TH.text});
    var amp=Math.max(p.th0*1.15,5), v=H.trace(g,L.gr,S.hist,10,-amp,amp,C.fry,{xl:'t (s)',yl:'θ (°)',ref:0});
    g.save(); g.beginPath(); g.rect(L.gr.l,L.gr.t,L.gr.w,L.gr.h); g.clip(); S.cr.forEach(function(c){ var X=v.sx(c); H.seg(g,X,v.sy(0)-7,X,v.sy(0)+7,C.grn,2); }); g.restore();
    H.text(g,T('각도의 변화')+(Tm?' · T = '+fmt(Tm,3)+' s':''),L.gr.l,L.gr.t-14,{size:12.5,w:700});
  },
  read:function(){ var p=this.p, Tm=period(S.cr), T0=TAU*Math.sqrt(p.L/p.g), Tx=T0/agm(1,Math.cos(p.th0*D2R/2));
    return [['시간 t',fmt(S.t,2),'s'],['각도 θ',fmt(S.th/D2R,1),'°'],['왕복한 횟수',String(Math.max(0,S.cr.length-1)),''],['측정한 주기 T',Tm?fmt(Tm,3):'—','s','hl'],
      ['이론 주기 2π√(L/g)',fmt(T0,3),'s','th'],['큰 각도까지 따진 주기',fmt(Tx,3),'s','th'],['측정값과 2π√(L/g)의 차이',Tm?fmt((Tm-T0)/T0*100,2):'—','%']]; },
  record:function(){ var p=this.p, Tm=period(S.cr); if(!Tm) return '한 번 왕복할 때까지 기다려 주세요'; return {L:p.L, th0:p.th0, g:p.g, T:Tm, T2:Tm*Tm}; },
  ai:function(){ var p=this.p, Tm=period(S.cr), T0=TAU*Math.sqrt(p.L/p.g);
    return 'Simple pendulum (RK4 simulation of the full equation). Length L = '+p.L+' m, starting angle '+p.th0+' degrees, g = '+p.g+' m/s^2, damping b = '+p.b+' 1/s.\nMeasured period '+(Tm?fmt(Tm,3)+' s over '+(S.cr.length-1)+' swings':'not measured yet')+'; small-angle theory 2*pi*sqrt(L/g) = '+fmt(T0,3)+' s; large-angle exact '+fmt(T0/agm(1,Math.cos(p.th0*D2R/2)),3)+' s.'; },
  down:function(x,y){ var q=this.geo(H.W,H.H); if(Math.hypot(x-q.bx,y-q.by)>34) return false; S.drag=true; H.run(false); this.move(x,y,null,true); return true; },
  move:function(x,y,e,cap){ if(!cap||!S.drag) return false; var q=this.geo(H.W,H.H); var a=Math.atan2(x-q.ox,y-q.oy); a=H.clamp(a,-80*D2R,80*D2R); S.th=a; S.w=0; S.t=0; S.cr=[]; S.hist=[[0,a/D2R]]; return true; },
  up:function(){ if(!S.drag) return false; S.drag=false; var d=Math.max(1,Math.round(Math.abs(S.th/D2R))); S.sign=S.th<0?-1:1; this.p.th0=-1; H.setP('th0',d); H.run(true); return true; },
  cursor:function(x,y){ var q=this.geo(H.W,H.H); return Math.hypot(x-q.bx,y-q.by)<34?'grab':''; }
};
LAB.add(E);
LAB._pend={S:S};
})();

/* =====================================================================
   6. Spring: Hooke's law and oscillation
   ===================================================================== */
(function(){
var L0=0.25, S={y:0, v:0, t:0, cr:[], hist:[], drag:null, hT:0, lay:null};
function layout(W,Hh){ var wide=W>=Hh*1.2; if(wide) return {a:{l:0,t:0,w:W*0.46,h:Hh}, gr:{l:W*0.46+44,t:30,w:W*0.54-62,h:Hh-74}};
  return {a:{l:0,t:0,w:W,h:Hh*0.6}, gr:{l:46,t:Hh*0.6+26,w:W-62,h:Hh*0.4-62}}; }
var E={id:'spring', cat:'sci', icon:'🌀', name:'용수철과 훅의 법칙', desc:'추의 무게에 따라 늘어나는 길이와 진동',
  info:'용수철이 늘어난 길이 x는 당기는 힘 F에 비례해요(훅의 법칙, F = kx). k는 용수철 상수로, 클수록 단단한 용수철이에요. 추를 당겼다 놓으면 위아래로 진동하는데, 주기는 T = 2π√(m/k)로 중력과는 상관이 없어요.',
  tries:['추의 질량을 바꿔 가며 기록하고, 가로 x, 세로 F 그래프의 기울기가 k와 같은지 보세요','질량을 4배로 하면 주기는 몇 배가 되나요?','같은 추를 달에 가져가면 늘어난 길이와 주기는 어떻게 될까요?','추를 손으로 끌었다가 놓아 보세요'],
  hint:'추를 위아래로 끌었다가 놓아 보세요.',
  autoRun:true, speed:true,
  params:[{id:'m',l:'추의 질량 m',min:0.05,max:2,step:0.05,val:0.5,u:'kg'},{id:'k',l:'용수철 상수 k',min:5,max:100,step:1,val:20,u:'N/m'},
    {id:'A',l:'처음에 당긴 길이',min:0,max:0.3,step:0.01,val:0.1,u:'m'},gParam(),{id:'c',l:'공기 저항 (감쇠)',min:0,max:2,step:0.05,val:0,u:'kg/s'},
    {id:'force',l:'힘 화살표 보이기',type:'check',val:true}],
  cols:[{k:'m',l:'질량 m',u:'kg',d:2},{k:'k',l:'용수철 상수 k',u:'N/m',d:0},{k:'F',l:'추의 무게 F = mg',u:'N',d:2},{k:'x0',l:'늘어난 길이 x',u:'m',d:3},{k:'T',l:'주기 T',u:'s',d:3},{k:'T2',l:'T²',u:'s²',d:3}],
  gx:'x0', gy:'F', fit:true,
  fitHint:function(m,b,x,y){ if(x==='x0'&&y==='F') return F('기울기 = 용수철 상수 k ≈ {0} N/m',fmt(m,1)); if(x==='m'&&y==='T2'&&m>0) return F('기울기 = 4π²/k 이므로 k ≈ {0} N/m',fmt(4*Math.PI*Math.PI/m,1)); },
  reset:function(){ S.y=this.p.A; S.v=0; S.t=0; S.cr=[]; S.hist=[[0,S.y*100]]; S.hT=0; },
  change:function(k){ if(k!=='force') this.reset(); },
  step:function(dt){ if(S.drag) return; var p=this.p, w2=p.k/p.m, cm=p.c/p.m, fn=function(u){ return [u[1],-w2*u[0]-cm*u[1]]; }, n=Math.max(1,Math.ceil(dt/0.0005)), h=dt/n, y=[S.y,S.v];
    for(var i=0;i<n;i++){ var z=H.rk4(y,fn,h); if(y[0]<0&&z[0]>=0){ S.cr.push(S.t+h*(-y[0]/(z[0]-y[0]))); if(S.cr.length>60) S.cr.splice(1,1); } y=z; S.t+=h; }
    S.y=y[0]; S.v=y[1]; if(S.t-S.hT>=1/90){ S.hT=S.t; S.hist.push([S.t,S.y*100]); if(S.hist.length>2000) S.hist.splice(0,S.hist.length-1500); } },
  geo:function(W,Hh){ var p=this.p, L=S.lay=layout(W,Hh), a=L.a, xeq=p.m*p.g/p.k, bh=24+20*Math.cbrt(p.m), bw=36+30*Math.cbrt(p.m);
    var need=L0+xeq+0.32, px=(a.h-50-bh)/need, top=a.t+16, cx=a.l+a.w/2+16;
    var len=Math.max(0.03,L0+xeq+S.y); return {px:px, top:top, cx:cx, bh:bh, bw:bw, xeq:xeq, by:top+len*px, eqY:top+(L0+xeq)*px, natY:top+L0*px}; },
  draw:function(g,W,Hh){
    var p=this.p, q=this.geo(W,Hh), L=S.lay, a=L.a;
    g.fillStyle=TH.light?'#cfc6b4':'#2a3042'; g.fillRect(q.cx-70,q.top-10,140,10);
    /* ruler */
    var rx=q.cx-q.bw/2-46, st=H.nice(80/q.px,1); if(st<0.01) st=0.01;
    H.seg(g,rx,q.top,rx,a.t+a.h-8,TH.dim,1);
    for(var m=0;q.top+m*q.px<=a.t+a.h-8;m+=st/2){ var Y=q.top+m*q.px, big=Math.abs(m/st-Math.round(m/st))<1e-6; H.seg(g,rx,Y,rx+(big?10:5),Y,TH.dim,1);
      if(big) H.text(g,m===0?'0 cm':String(Math.round(m*100)),rx-4,Y,{al:'right',size:10.5,c:TH.dim}); }
    H.seg(g,rx,q.natY,q.cx+q.bw/2+30,q.natY,'rgba(138,147,166,.6)',1,[4,4]); H.text(g,T('원래 길이'),q.cx+q.bw/2+34,q.natY,{size:11,c:TH.dim});
    H.seg(g,rx,q.eqY,q.cx+q.bw/2+30,q.eqY,'rgba(63,224,143,.7)',1,[4,4]); H.text(g,T('평형 위치'),q.cx+q.bw/2+34,q.eqY,{size:11,c:C.grn});
    /* coil */
    var y0=q.top, y1=q.by, lead=Math.min(10,(y1-y0)*0.15), n=16, w=15; g.beginPath(); g.moveTo(q.cx,y0); g.lineTo(q.cx,y0+lead);
    for(var i=1;i<=n;i++){ g.lineTo(q.cx+(i%2?w:-w),y0+lead+(y1-y0-2*lead)*(i-0.5)/n); } g.lineTo(q.cx,y1-lead); g.lineTo(q.cx,y1);
    g.strokeStyle=TH.light?'#5d6678':'#c9cfdc'; g.lineWidth=2.2; g.lineJoin='round'; g.stroke();
    /* mass */
    var gr=g.createLinearGradient(0,q.by,0,q.by+q.bh); gr.addColorStop(0,'#7db6ff'); gr.addColorStop(1,'#2f6fd0');
    H.rrect(g,q.cx-q.bw/2,q.by,q.bw,q.bh,6); g.fillStyle=gr; g.fill();
    H.text(g,fmt(p.m,2)+' kg',q.cx,q.by+q.bh/2,{al:'center',size:11.5,w:700,c:'#fff'});
    if(p.force){ var mg=p.m*p.g, fe=p.k*(q.xeq+S.y), sc=48/mg, mx=q.cx+q.bw/2+12, my=q.by+q.bh/2;
      H.arrow(g,mx,my,mx,my+mg*sc,C.red,2.5,9);
      var fl=H.clamp(fe*sc,-150,150); H.arrow(g,q.cx-q.bw/2-12,my,q.cx-q.bw/2-12,my-fl,C.grn,2.5,9);
      H.text(g,'↑ kx = '+fmt(fe,2)+' N',a.l+a.w-12,a.t+a.h-54,{al:'right',size:12,w:700,c:C.grn}); H.text(g,'↓ mg = '+fmt(mg,2)+' N',a.l+a.w-12,a.t+a.h-36,{al:'right',size:12,w:700,c:C.red}); }
    var amp=Math.max(Math.abs(p.A)*120,2,Math.max.apply(null,S.hist.slice(-400).map(function(h){ return Math.abs(h[1]); }))*1.1);
    var v=H.trace(g,L.gr,S.hist,10,-amp,amp,C.blu,{xl:'t (s)',yl:T('변위 (cm)'),ref:0}), Tm=period(S.cr);
    g.save(); g.beginPath(); g.rect(L.gr.l,L.gr.t,L.gr.w,L.gr.h); g.clip(); S.cr.forEach(function(c){ var X=v.sx(c); H.seg(g,X,v.sy(0)-7,X,v.sy(0)+7,C.grn,2); }); g.restore();
    H.text(g,T('평형 위치에서 벗어난 거리')+(Tm?' · T = '+fmt(Tm,3)+' s':''),L.gr.l,L.gr.t-14,{size:12.5,w:700});
    H.text(g,'t = '+fmt(S.t,2)+' s',a.l+a.w-12,a.t+a.h-14,{al:'right',size:13,w:700});
  },
  read:function(){ var p=this.p, xeq=p.m*p.g/p.k, x=xeq+S.y, Tm=period(S.cr);
    return [['늘어난 길이 x',fmt(x*100,1),'cm','hl'],['평형일 때 늘어난 길이 mg/k',fmt(xeq*100,1),'cm'],['탄성력 kx',fmt(p.k*x,2),'N'],['추의 무게 mg',fmt(p.m*p.g,2),'N'],
      ['측정한 주기 T',Tm?fmt(Tm,3):'—','s','hl'],['이론 주기 2π√(m/k)',fmt(TAU*Math.sqrt(p.m/p.k),3),'s','th']]; },
  record:function(){ var p=this.p, Tm=period(S.cr); return {m:p.m, k:p.k, F:p.m*p.g, x0:p.m*p.g/p.k, T:Tm, T2:Tm?Tm*Tm:null}; },
  ai:function(){ var p=this.p, xeq=p.m*p.g/p.k, Tm=period(S.cr);
    return 'Vertical spring (Hooke\'s law F = kx), RK4 simulation. Mass m = '+p.m+' kg, spring constant k = '+p.k+' N/m, g = '+p.g+' m/s^2, damping c = '+p.c+' kg/s, released '+fmt(p.A*100,1)+' cm below equilibrium.\nEquilibrium stretch mg/k = '+fmt(xeq*100,2)+' cm. Current displacement from equilibrium '+fmt(S.y*100,2)+' cm. Measured period '+(Tm?fmt(Tm,3)+' s':'not yet')+'; theory 2*pi*sqrt(m/k) = '+fmt(TAU*Math.sqrt(p.m/p.k),3)+' s.'; },
  down:function(x,y){ var q=this.geo(H.W,H.H); if(Math.abs(x-q.cx)>q.bw/2+22||y<q.by-22||y>q.by+q.bh+22) return false; S.drag={dy:y-q.by}; H.run(false); return true; },
  move:function(x,y,e,cap){ if(!cap||!S.drag) return false; var q=this.geo(H.W,H.H); S.y=H.clamp((y-S.drag.dy-q.eqY)/q.px,-Math.min(0.3,q.xeq+L0-0.03),0.3); S.v=0; S.t=0; S.cr=[]; S.hist=[[0,S.y*100]]; return true; },
  up:function(){ if(!S.drag) return false; S.drag=null; S.t=0; S.cr=[]; S.hist=[[0,S.y*100]]; H.run(true); return true; },
  cursor:function(x,y){ var q=this.geo(H.W,H.H); return Math.abs(x-q.cx)<=q.bw/2+22&&y>=q.by-22&&y<=q.by+q.bh+22?'grab':''; }
};
LAB.add(E);
LAB._spring={S:S};
})();

/* =====================================================================
   7. Refraction of light (Snell's law)
   ===================================================================== */
(function(){
var MED=[[1.00,'공기'],[1.33,'물'],[1.5,'유리'],[2.42,'다이아몬드']];
function name(n){ for(var i=0;i<MED.length;i++) if(Math.abs(MED[i][0]-n)<0.005) return T(MED[i][1]); return ''; }
function calc(p){ var t1=p.th1*D2R, s1=Math.sin(t1), s2=p.n1*s1/p.n2, tir=s2>1+1e-12, t2=tir?null:Math.asin(Math.min(1,s2)), c1=Math.cos(t1), R;
  if(tir) R=1; else { var c2=Math.cos(t2), rs=(p.n1*c1-p.n2*c2)/(p.n1*c1+p.n2*c2), rp=(p.n2*c1-p.n1*c2)/(p.n2*c1+p.n1*c2); R=(rs*rs+rp*rp)/2; }
  return {t1:t1, s1:s1, s2:tir?null:s2, t2:t2, tir:tir, R:R, crit:p.n1>p.n2?Math.asin(p.n2/p.n1):null}; }
var E={id:'refr', cat:'sci', icon:'🔦', name:'빛의 굴절', desc:'물이나 유리로 들어가는 빛이 꺾이는 정도',
  info:'빛이 다른 물질로 들어가면 빠르기가 바뀌면서 꺾여요. 굴절률이 n₁인 곳에서 n₂인 곳으로 갈 때 n₁ sin θ₁ = n₂ sin θ₂ (스넬의 법칙)가 성립해요. 굴절률이 큰 곳에서 작은 곳으로 갈 때 입사각이 임계각보다 크면 빛이 모두 반사돼요(전반사).',
  tries:['공기 → 물에서 입사각을 바꿔 가며 기록하고, 가로 sin θ₁, 세로 sin θ₂ 그래프의 기울기를 구해 보세요','물 → 공기로 바꾸고 입사각을 키우면 무슨 일이 일어나나요?','다이아몬드 → 공기의 임계각을 찾아보세요. 다이아몬드가 반짝이는 까닭과 관계가 있어요','입사각이 0°이면 빛이 꺾이나요?'],
  hint:'화면을 끌어서 빛이 들어오는 방향을 바꿔요.',
  noPlay:true,
  params:[{id:'n1',l:'위쪽 물질의 굴절률 n₁',min:1,max:2.5,step:0.01,val:1,pre:MED},{id:'n2',l:'아래쪽 물질의 굴절률 n₂',min:1,max:2.5,step:0.01,val:1.33,pre:MED},
    {id:'th1',l:'입사각 θ₁',min:0,max:89,step:1,val:40,u:'°'},{id:'refl',l:'반사되는 빛 보이기',type:'check',val:true}],
  cols:[{k:'n1',l:'n₁',d:2},{k:'n2',l:'n₂',d:2},{k:'th1',l:'입사각 θ₁',u:'°',d:1},{k:'th2',l:'굴절각 θ₂',u:'°',d:1},{k:'s1',l:'sin θ₁',d:4},{k:'s2',l:'sin θ₂',d:4}],
  gx:'s1', gy:'s2', fit:true,
  fitHint:function(m,b,x,y){ if(x==='s1'&&y==='s2') return F('기울기 = n₁ ÷ n₂ ≈ {0} (지금 설정은 {1})',fmt(m,3),fmt(this.p.n1/this.p.n2,3)); if(x==='th1'&&y==='th2') return T('각도끼리는 정확한 직선이 아니에요. sin 값으로 바꿔 보세요'); },
  reset:function(){},
  draw:function(g,W,Hh){
    var p=this.p, c=calc(p), ox=W/2, oy=Hh/2, far=Math.hypot(W,Hh), src=Math.min(W,Hh)*0.42;
    g.fillStyle='rgba(56,209,224,'+(0.03+(p.n1-1)*0.14)+')'; g.fillRect(0,0,W,oy);
    g.fillStyle='rgba(56,209,224,'+(0.03+(p.n2-1)*0.14)+')'; g.fillRect(0,oy,W,Hh-oy);
    H.seg(g,0,oy,W,oy,'rgba(56,209,224,.7)',1.5);
    H.text(g,(name(p.n1)||T('물질 1'))+'  n₁ = '+fmt(p.n1,2),12,16,{size:12.5,w:700,c:C.cyan});
    H.text(g,(name(p.n2)||T('물질 2'))+'  n₂ = '+fmt(p.n2,2),12,Hh-16,{size:12.5,w:700,c:C.cyan});
    H.seg(g,ox,0,ox,Hh,TH.dim,1,[5,5]); H.text(g,T('법선'),ox+6,12,{size:11,c:TH.dim});
    var sx=ox-src*Math.sin(c.t1), sy=oy-src*Math.cos(c.t1);
    function ray(x1,y1,x2,y2,al,w){ g.save(); g.globalAlpha=al; g.shadowColor=C.laser; g.shadowBlur=12; H.seg(g,x1,y1,x2,y2,C.laser,w||3); g.restore(); }
    ray(sx,sy,ox,oy,1); H.arrow(g,sx+(ox-sx)*0.45,sy+(oy-sy)*0.45,sx+(ox-sx)*0.55,sy+(oy-sy)*0.55,C.laser,0.1,11);
    if(!c.tir){ var al=Math.max(0.2,1-c.R); ray(ox,oy,ox+far*Math.sin(c.t2),oy+far*Math.cos(c.t2),al); var rx=ox+src*0.55*Math.sin(c.t2), ry=oy+src*0.55*Math.cos(c.t2); H.arrow(g,rx-Math.sin(c.t2)*5,ry-Math.cos(c.t2)*5,rx+Math.sin(c.t2)*5,ry+Math.cos(c.t2)*5,'rgba(255,77,94,'+al+')',0.1,11); }
    if(p.refl||c.tir){ var ra=c.tir?1:Math.max(0.12,c.R*1.6); ray(ox,oy,ox+far*Math.sin(c.t1),oy-far*Math.cos(c.t1),Math.min(1,ra),c.tir?3:2); }
    g.save(); g.translate(sx,sy); g.rotate(Math.atan2(oy-sy,ox-sx)); H.rrect(g,-30,-8,34,16,4); g.fillStyle=TH.light?'#3a4152':'#c9cfdc'; g.fill(); g.restore();
    var r1=Math.min(60,src*0.4);
    if(p.th1>0.5){ g.beginPath(); g.arc(ox,oy,r1,-Math.PI/2-c.t1,-Math.PI/2); g.strokeStyle=C.fry; g.lineWidth=2; g.stroke();
      H.text(g,'θ₁ = '+fmt(p.th1,0)+'°',ox-r1*Math.sin(c.t1/2)-8,oy-r1*Math.cos(c.t1/2)-12,{al:'right',size:12.5,w:700,c:C.fry,bg:'rgba(8,9,13,.65)'}); }
    if(!c.tir&&c.t2>0.008){ g.beginPath(); g.arc(ox,oy,r1,Math.PI/2-c.t2,Math.PI/2); g.strokeStyle=C.grn; g.lineWidth=2; g.stroke();
      H.text(g,'θ₂ = '+fmt(c.t2/D2R,1)+'°',ox+r1*Math.sin(c.t2/2)+8,oy+r1*Math.cos(c.t2/2)+12,{size:12.5,w:700,c:C.grn,bg:'rgba(8,9,13,.65)'}); }
    if(c.tir) H.text(g,T('전반사!'),ox,oy+38,{al:'center',size:15,w:800,c:'#fff',bg:'rgba(255,77,94,.85)'});
    H.dot(g,ox,oy,3.5,'#fff');
  },
  read:function(){ var p=this.p, c=calc(p);
    return [['입사각 θ₁',fmt(p.th1,1),'°'],['굴절각 θ₂',c.tir?'없어요 (전반사)':fmt(c.t2/D2R,1),c.tir?'':'°','hl'],['n₁ sin θ₁',fmt(p.n1*c.s1,4),''],['n₂ sin θ₂',c.tir?'—':fmt(p.n2*c.s2,4),''],
      ['임계각',c.crit!=null?fmt(c.crit/D2R,1)+'°':'없어요 (n₁ ≤ n₂)','','th'],['반사되는 빛',fmt(c.R*100,1),'%']]; },
  record:function(){ var p=this.p, c=calc(p); return {n1:p.n1, n2:p.n2, th1:p.th1, th2:c.tir?null:c.t2/D2R, s1:c.s1, s2:c.s2}; },
  ai:function(){ var p=this.p, c=calc(p);
    return 'Refraction (Snell\'s law n1 sin(theta1) = n2 sin(theta2)). Light goes from the upper medium n1 = '+p.n1+(name(p.n1)?' ('+name(p.n1)+')':'')+' into the lower medium n2 = '+p.n2+(name(p.n2)?' ('+name(p.n2)+')':'')+'. Incidence angle '+p.th1+' degrees.\n'+(c.tir?'Total internal reflection: no refracted ray.':'Refraction angle '+fmt(c.t2/D2R,2)+' degrees.')+' Critical angle: '+(c.crit!=null?fmt(c.crit/D2R,2)+' degrees':'none (n1 <= n2)')+'. Reflected fraction (Fresnel, unpolarized) '+fmt(c.R*100,1)+'%.'; },
  down:function(x,y){ this.move(x,y,null,true); return true; },
  move:function(x,y,e,cap){ if(!cap) return false; var ox=H.W/2, oy=H.H/2, dx=Math.abs(x-ox), dy=Math.abs(y-oy); if(dx+dy<6) return false;
    H.setP('th1',Math.round(H.clamp(Math.atan2(dx,dy)/D2R,0,89))); return true; },
  up:function(){ return false; },
  cursor:function(){ return 'crosshair'; }
};
LAB.add(E);
LAB._refr={calc:calc};
})();

/* =====================================================================
   8. Interference of two waves (ripple tank)
   ===================================================================== */
(function(){
var WCM=24, S={t:0, P:null, grid:null, need:true, drag:false, oc:null};
function world(W,Hh){ var k=WCM/W; return {k:k, hcm:Hh*k, ys:Math.min(Hh*k*0.16,4)}; }
function prep(p,W,Hh){
  var cell=W>900?4:3, gw=Math.ceil(W/cell), gh=Math.ceil(Hh/cell), w=world(W,Hh), kw=TAU/p.lam, ph=p.ph*D2R, A=new Float32Array(gw*gh), B=new Float32Array(gw*gh), M=new Float32Array(gw*gh);
  for(var j=0;j<gh;j++){ var Y=(j+0.5)*cell*w.k-w.ys; for(var i=0;i<gw;i++){ var X=((i+0.5)*cell-W/2)*w.k, r1=Math.hypot(X+p.d/2,Y), r2=Math.hypot(X-p.d/2,Y);
    var a1=1/Math.sqrt(1+r1/(3*p.lam)), a2=1/Math.sqrt(1+r2/(3*p.lam)), q1=-kw*r1, q2=ph-kw*r2, o=j*gw+i;
    A[o]=a1*Math.cos(q1)+a2*Math.cos(q2); B[o]=a1*Math.sin(q1)+a2*Math.sin(q2); M[o]=Math.hypot(A[o],B[o]); } }
  if(!S.oc) S.oc=document.createElement('canvas'); S.oc.width=gw; S.oc.height=gh;
  S.grid={cell:cell, gw:gw, gh:gh, A:A, B:B, M:M, img:S.oc.getContext('2d').createImageData(gw,gh), W:W, Hh:Hh}; S.need=false;
}
function probe(p,W,Hh){ fixP(W,Hh); var w=world(W,Hh), P=S.P, r1=Math.hypot(P.x+p.d/2,P.y-w.ys), r2=Math.hypot(P.x-p.d/2,P.y-w.ys), dl=r1-r2, amp=2*Math.abs(Math.cos((p.ph*D2R+TAU/p.lam*dl)/2));
  return {r1:r1, r2:r2, dl:dl, amp:amp}; }
function fixP(W,Hh){ var w=world(W,Hh); if(!S.P) S.P={x:WCM*0.16, y:w.ys+w.hcm*0.55}; S.P.x=H.clamp(S.P.x,-WCM/2+0.3,WCM/2-0.3); S.P.y=H.clamp(S.P.y,0.3,w.hcm-0.3); }
var E={id:'wave', cat:'sci', icon:'🌊', name:'파동의 간섭', desc:'두 물결이 만나 커지고 작아지는 무늬',
  info:'두 파원에서 나온 물결이 만나면 서로 더해져요. 두 파원까지의 거리 차(경로차)가 파장의 정수 배인 곳에서는 마루와 마루가 만나 크게 흔들리고(보강 간섭), 반 파장의 홀수 배인 곳에서는 마루와 골이 만나 거의 흔들리지 않아요(상쇄 간섭).',
  tries:['P를 움직여 경로차 ÷ λ가 0.5, 1.5인 곳을 찾아보세요. 진폭이 어떻게 되나요?','두 파원 사이 거리 d를 늘리면 마디선의 개수가 어떻게 바뀌나요?','파장 λ를 줄이면 무늬가 어떻게 바뀌나요?','위상차를 180°로 바꾸면 한가운데 줄은 어떻게 되나요?','P를 여러 곳에 두고 기록한 뒤, 경로차 ÷ λ와 합성 진폭의 그래프를 그려 보세요'],
  hint:'P를 끌거나 눌러서 옮겨 보세요.',
  autoRun:true, speed:true,
  params:[{id:'lam',l:'파장 λ',min:0.6,max:4,step:0.1,val:1.5,u:'cm'},{id:'d',l:'두 파원 사이 거리 d',min:0,max:10,step:0.1,val:4,u:'cm'},
    {id:'ph',l:'두 파원의 위상차',min:0,max:360,step:15,val:0,u:'°'},{id:'f',l:'진동수 f',min:0.5,max:3,step:0.1,val:1,u:'Hz'},
    {id:'mode',l:'보기',type:'seg',opts:[['wave','물결'],['amp','흔들림의 크기']],val:'wave'},{id:'nodes',l:'마디선 (상쇄 간섭) 보이기',type:'check',val:true}],
  cols:[{k:'lam',l:'파장 λ',u:'cm',d:1},{k:'d',l:'파원 사이 거리 d',u:'cm',d:1},{k:'ph',l:'위상차',u:'°',d:0},{k:'dl',l:'경로차 ÷ λ',d:3},{k:'amp',l:'합성 진폭',d:3}],
  gx:'dl', gy:'amp',
  save:function(){ return {P:S.P}; },
  restore:function(o){ if(o&&o.P&&isFinite(o.P.x)&&isFinite(o.P.y)) S.P={x:+o.P.x, y:+o.P.y}; },
  reset:function(){ S.t=0; S.need=true; },
  change:function(){ S.need=true; },
  resize:function(){ S.need=true; },
  step:function(dt){ S.t+=dt; },
  draw:function(g,W,Hh){
    var p=this.p; fixP(W,Hh); if(S.need||!S.grid||S.grid.W!==W||S.grid.Hh!==Hh) prep(p,W,Hh);
    var G=S.grid, d=G.img.data, n=G.gw*G.gh, wt=TAU*p.f*S.t, cw=Math.cos(wt), sw=Math.sin(wt), amp=p.mode==='amp';
    for(var o=0,q=0;o<n;o++,q+=4){ var r,gg,b;
      if(amp){ var m=Math.min(1,G.M[o]*0.5); m=m*m; r=6+m*170; gg=10+m*215; b=20+m*235; }
      else { var v=(G.A[o]*cw-G.B[o]*sw)*0.62; if(v>1) v=1; else if(v<-1) v=-1;
        if(v>=0){ r=12+v*120; gg=36+v*190; b=64+v*190; } else { r=12+v*10; gg=36+v*30; b=64+v*48; } }
      d[q]=r; d[q+1]=gg; d[q+2]=b; d[q+3]=255; }
    S.oc.getContext('2d').putImageData(G.img,0,0); g.imageSmoothingEnabled=true; g.drawImage(S.oc,0,0,G.gw*G.cell,G.gh*G.cell);
    var w=world(W,Hh), sx=function(X){ return W/2+X/w.k; }, sy=function(Y){ return Y/w.k; };
    if(p.nodes&&p.d>0){ var kw=TAU/p.lam, ph=p.ph*D2R;
      for(var mm=-60;mm<=60;mm++){ var D=((2*mm+1)*Math.PI-ph)/kw; if(Math.abs(D)>=p.d-1e-9) continue; var pts=[];
        for(var s=0;s<=140;s++){ var Y=-w.ys+(w.hcm)*s/140, lo=-WCM*2, hi=WCM*2; for(var it=0;it<50;it++){ var mid=(lo+hi)/2, fd=Math.hypot(mid+p.d/2,Y)-Math.hypot(mid-p.d/2,Y); if(fd<D) lo=mid; else hi=mid; }
          pts.push([sx((lo+hi)/2),sy(Y+w.ys)]); }
        H.line(g,pts,'rgba(255,107,107,.75)',1.6,[6,5]); } }
    [[-p.d/2,'S₁'],[p.d/2,'S₂']].forEach(function(s,i){ var X=sx(s[0]), Y=sy(w.ys); g.save(); g.shadowColor='#fff'; g.shadowBlur=10; H.dot(g,X,Y,5.5,'#fff'); g.restore();
      H.text(g,s[1],X+(i?9:-9),Y-12,{al:i?'left':'right',size:12,w:800,c:'#fff'}); });
    var pr=probe(p,W,Hh), PX=sx(S.P.x), PY=sy(S.P.y);
    H.seg(g,sx(-p.d/2),sy(w.ys),PX,PY,'rgba(255,255,255,.35)',1,[3,4]); H.seg(g,sx(p.d/2),sy(w.ys),PX,PY,'rgba(255,255,255,.35)',1,[3,4]);
    g.beginPath(); g.arc(PX,PY,10,0,TAU); g.strokeStyle=C.fry; g.lineWidth=2.5; g.stroke(); H.seg(g,PX-15,PY,PX-5,PY,C.fry,2); H.seg(g,PX+5,PY,PX+15,PY,C.fry,2); H.seg(g,PX,PY-15,PX,PY-5,C.fry,2); H.seg(g,PX,PY+5,PX,PY+15,C.fry,2);
    H.text(g,'P · '+F('경로차 {0}λ',fmt(Math.abs(pr.dl)/p.lam,2)),PX+(PX<W-170?16:-16),PY-16,{al:PX<W-170?'left':'right',size:12,w:700,c:'#1c1405',bg:C.fry});
    var bl=p.lam/w.k, bx=W-16-bl, by=Hh-16; H.seg(g,bx,by,bx+bl,by,'#fff',2.5); H.seg(g,bx,by-5,bx,by+5,'#fff',2); H.seg(g,bx+bl,by-5,bx+bl,by+5,'#fff',2);
    H.text(g,'λ = '+fmt(p.lam,1)+' cm',bx+bl,by-14,{al:'right',size:11.5,w:700,c:'#fff'});
  },
  read:function(){ var p=this.p, pr=probe(p,H.W,H.H), a=pr.amp;
    return [['파동의 속력 v = fλ',fmt(p.f*p.lam,2),'cm/s'],['S₁에서 P까지',fmt(pr.r1,2),'cm'],['S₂에서 P까지',fmt(pr.r2,2),'cm'],['경로차',fmt(Math.abs(pr.dl),2),'cm'],
      ['경로차 ÷ 파장',fmt(Math.abs(pr.dl)/p.lam,2),'','hl'],['P의 합성 진폭 (파원 하나 = 1)',fmt(a,2),'','hl'],
      ['P에서는',a>=1.8?'보강 간섭 (크게 흔들려요)':a<=0.2?'상쇄 간섭 (거의 안 흔들려요)':'중간 정도로 흔들려요','','wide '+(a>=1.8?'ok':'')]]; },
  record:function(){ var p=this.p, pr=probe(p,H.W,H.H); return {lam:p.lam, d:p.d, ph:p.ph, dl:Math.abs(pr.dl)/p.lam, amp:pr.amp}; },
  ai:function(){ var p=this.p, pr=probe(p,H.W,H.H);
    return 'Two-source interference (ripple tank). Wavelength '+p.lam+' cm, frequency '+p.f+' Hz (speed '+fmt(p.f*p.lam,2)+' cm/s), source separation d = '+p.d+' cm, source 2 leads by '+p.ph+' degrees.\nProbe P: distances '+fmt(pr.r1,2)+' cm and '+fmt(pr.r2,2)+' cm, path difference '+fmt(Math.abs(pr.dl),2)+' cm = '+fmt(Math.abs(pr.dl)/p.lam,3)+' wavelengths, combined amplitude '+fmt(pr.amp,2)+' (one source alone = 1, distance fading ignored).'; },
  down:function(x,y){ var w=world(H.W,H.H); S.P={x:(x-H.W/2)*w.k, y:y*w.k}; fixP(H.W,H.H); S.drag=true; return true; },
  move:function(x,y,e,cap){ if(!cap||!S.drag) return false; var w=world(H.W,H.H); S.P={x:(x-H.W/2)*w.k, y:y*w.k}; fixP(H.W,H.H); return true; },
  up:function(){ if(!S.drag) return false; S.drag=false; LAB.saveNow(); return true; },
  cursor:function(){ return 'crosshair'; }
};
LAB.add(E);
LAB._wave={S:S, probe:probe};
})();

/* =====================================================================
   9. Electric circuit (Ohm's law)
   ===================================================================== */
(function(){
var S={s:[0,0,0,0], mode:null};
function calc(p){ var V=p.V, R1=p.R1, R2=p.R2, o={V:V};
  if(p.mode==='one'){ o.R=R1; o.I=V/R1; o.I1=o.I; o.V1=V; o.I2=0; o.V2=0; }
  else if(p.mode==='series'){ o.R=R1+R2; o.I=V/o.R; o.I1=o.I2=o.I; o.V1=o.I*R1; o.V2=o.I*R2; }
  else { o.R=R1*R2/(R1+R2); o.I1=V/R1; o.I2=V/R2; o.I=o.I1+o.I2; o.V1=o.V2=V; }
  o.P=V*o.I; return o; }
function geo(W,Hh,mode){ var L=Math.max(74,W*0.14), R=W-Math.max(40,W*0.1), Tt=Math.max(64,Hh*0.2), B=Hh-Math.max(62,Hh*0.17), my=(Tt+B)/2, g={L:L,R:R,Tt:Tt,B:B,my:my};
  var bat=[[L,my-12],[L,Tt],[R,Tt],[R,B],[L,B],[L,my+12]];
  if(mode==='parallel'){ var xa=L+(R-L)*0.24, xb=L+(R-L)*0.76, Tm=Tt+(B-Tt)*0.42; g.xa=xa; g.xb=xb; g.Tm=Tm;
    g.paths=[{pts:[[L,my-12],[L,Tt],[xa,Tt]],k:'I'},{pts:[[xa,Tt],[xb,Tt]],k:'I1'},{pts:[[xa,Tt],[xa,Tm],[xb,Tm],[xb,Tt]],k:'I2'},{pts:[[xb,Tt],[R,Tt],[R,B],[L,B],[L,my+12]],k:'I'}];
    g.res=[{x:(xa+xb)/2,y:Tt,n:1},{x:(xa+xb)/2,y:Tm,n:2}]; }
  else { g.paths=[{pts:bat,k:'I'}]; g.res=mode==='one'?[{x:(L+R)/2,y:Tt,n:1}]:[{x:L+(R-L)*0.32,y:Tt,n:1},{x:L+(R-L)*0.68,y:Tt,n:2}]; }
  return g; }
function plen(pts){ var s=0; for(var i=1;i<pts.length;i++) s+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]); return s; }
function along(pts,d){ for(var i=1;i<pts.length;i++){ var l=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]); if(d<=l){ var f=d/l; return [pts[i-1][0]+f*(pts[i][0]-pts[i-1][0]),pts[i-1][1]+f*(pts[i][1]-pts[i-1][1])]; } d-=l; } return pts[pts.length-1]; }
var GAP=26;
function spd(I){ return Math.min(560,Math.max(0,I)*300); }
var E={id:'ohm', cat:'sci', icon:'🔋', name:'전기 회로와 옴의 법칙', desc:'전압, 전류, 저항의 관계와 직렬·병렬 연결',
  info:'저항에 흐르는 전류 I는 전압 V에 비례하고 저항 R에 반비례해요(옴의 법칙, V = IR). 저항을 직렬로 이으면 전체 저항이 R₁ + R₂로 커지고, 병렬로 이으면 1/R = 1/R₁ + 1/R₂로 작아져요.',
  tries:['전압을 바꿔 가며 기록하고, 가로 V, 세로 I 그래프가 원점을 지나는 직선인지 보세요','같은 저항 두 개를 직렬과 병렬로 이었을 때 전체 전류를 비교해 보세요','병렬 연결에서 R₂를 키우면 R₁에 흐르는 전류는 바뀌나요?','직렬 연결에서 V₁ + V₂가 전지 전압과 같은지 확인해 보세요'],
  hint:'노란 점은 전류의 방향(+ → −)으로 움직이고, 빠를수록 전류가 세요.',
  noPlay:true, live:true,
  params:[{id:'mode',l:'연결 방법',type:'seg',opts:[['one','저항 1개'],['series','직렬 연결'],['parallel','병렬 연결']],val:'series'},
    {id:'V',l:'전지 전압 V',min:0,max:12,step:0.5,val:6,u:'V',d:1},{id:'R1',l:'저항 R₁',min:1,max:100,step:1,val:10,u:'Ω'},
    {id:'R2',l:'저항 R₂',min:1,max:100,step:1,val:20,u:'Ω',show:function(p){ return p.mode!=='one'; }}],
  cols:[{k:'V',l:'전압 V',u:'V',d:1},{k:'I',l:'전류 I',u:'A',d:3},{k:'R',l:'전체 저항 R',u:'Ω',d:2},{k:'P',l:'전력 P',u:'W',d:2}],
  gx:'V', gy:'I', fit:true,
  fitHint:function(m,b,x,y){ if(x==='V'&&y==='I'&&m>0) return F('기울기 = 1/R 이므로 R ≈ {0} Ω',fmt(1/m,1)); if(x==='I'&&y==='V') return F('기울기 = 저항 R ≈ {0} Ω',fmt(m,1)); },
  reset:function(){ S.s=[0,0,0,0]; },
  change:function(k){ if(k==='mode') S.s=[0,0,0,0]; },
  step:function(dt){ var c=calc(this.p), gg=geo(H.W,H.H,this.p.mode); gg.paths.forEach(function(pa,i){ S.s[i]=(S.s[i]+spd(c[pa.k])*dt)%GAP; }); },
  draw:function(g,W,Hh){
    var p=this.p, c=calc(p), G=geo(W,Hh,p.mode), wire=TH.light?'#8a8170':'#56607a';
    G.paths.forEach(function(pa){ H.line(g,pa.pts,wire,3.5); });
    /* battery: long plate = + */
    g.fillStyle=TH.stage; g.fillRect(G.L-30,G.my-12,60,24);
    H.seg(g,G.L-22,G.my-8,G.L+22,G.my-8,TH.text,3); H.seg(g,G.L-11,G.my+8,G.L+11,G.my+8,TH.text,6);
    H.seg(g,G.L,G.my-12,G.L,G.my-8,wire,3.5); H.seg(g,G.L,G.my+8,G.L,G.my+12,wire,3.5);
    H.text(g,'+',G.L+26,G.my-14,{size:15,w:800,c:C.red}); H.text(g,'−',G.L+16,G.my+16,{size:15,w:800,c:C.blu});
    H.text(g,fmt(p.V,1)+' V',G.L-30,G.my,{al:'right',size:W<480?12.5:14,w:800,c:C.fry});
    /* resistors */
    var rw=Math.min(84,(G.R-G.L)*0.2);
    G.res.forEach(function(r){ var I=r.n===1?c.I1:c.I2, V=r.n===1?c.V1:c.V2, R=r.n===1?p.R1:p.R2, P=I*V;
      g.fillStyle=TH.stage; g.fillRect(r.x-rw/2,r.y-14,rw,28);
      if(P>0){ g.save(); g.shadowColor='rgba(255,138,61,.9)'; g.shadowBlur=Math.min(30,6+P*4); H.rrect(g,r.x-rw/2,r.y-10,rw,20,5); g.fillStyle='rgba(255,138,61,'+Math.min(0.55,0.08+P*0.06)+')'; g.fill(); g.restore(); }
      g.beginPath(); g.moveTo(r.x-rw/2,r.y); for(var i=1;i<12;i++) g.lineTo(r.x-rw/2+rw*i/12,r.y+(i%2?-9:9)); g.lineTo(r.x+rw/2,r.y); g.strokeStyle=TH.text; g.lineWidth=2.4; g.lineJoin='round'; g.stroke();
      H.text(g,'R'+(r.n===1?'₁':'₂')+' = '+fmt(R,0)+' Ω',r.x,r.y-26,{al:'center',size:12.5,w:700});
      H.text(g,'V'+(r.n===1?'₁':'₂')+' = '+fmt(V,2)+' V',r.x,r.y+24,{al:'center',size:11.5,c:TH.dim}); H.text(g,'I'+(r.n===1?'₁':'₂')+' = '+fmt(I,3)+' A',r.x,r.y+39,{al:'center',size:11.5,c:TH.dim}); });
    /* ammeter */
    var ax=(G.L+G.R)/2, ay=G.B; g.beginPath(); g.arc(ax,ay,17,0,TAU); g.fillStyle=TH.stage; g.fill(); g.strokeStyle=C.cyan; g.lineWidth=2.5; g.stroke();
    H.text(g,'A',ax,ay+1,{al:'center',size:15,w:800,c:C.cyan}); H.text(g,'I = '+fmt(c.I,3)+' A',ax,ay+32,{al:'center',size:13,w:800,c:C.cyan});
    /* current dots */
    G.paths.forEach(function(pa,i){ var I=c[pa.k]; if(!(I>0)) return; var len=plen(pa.pts); for(var d=S.s[i]%GAP;d<len;d+=GAP){ var q=along(pa.pts,d); H.dot(g,q[0],q[1],3.6,C.fry); } });
    H.text(g,T(p.mode==='one'?'저항 1개':p.mode==='series'?'직렬 연결':'병렬 연결')+' · R = '+fmt(c.R,2)+' Ω',12,16,{size:12.5,w:700,c:TH.dim});
  },
  read:function(){ var p=this.p, c=calc(p), r=[['전체 저항 R',fmt(c.R,2),'Ω'],['전체 전류 I',fmt(c.I,3),'A','hl'],['R₁에 걸린 전압 V₁',fmt(c.V1,2),'V'],['R₁에 흐르는 전류 I₁',fmt(c.I1,3),'A']];
    if(p.mode!=='one') r.push(['R₂에 걸린 전압 V₂',fmt(c.V2,2),'V'],['R₂에 흐르는 전류 I₂',fmt(c.I2,3),'A']);
    r.push(['전체 전력 P = VI',fmt(c.P,2),'W','th']); return r; },
  record:function(){ var c=calc(this.p); return {V:c.V, I:c.I, R:c.R, P:c.P}; },
  ai:function(){ var p=this.p, c=calc(p);
    return 'DC circuit (Ohm\'s law V = IR), ideal battery and wires. Battery '+p.V+' V; '+(p.mode==='one'?'one resistor R1 = '+p.R1+' ohm':(p.mode==='series'?'series':'parallel')+' R1 = '+p.R1+' ohm and R2 = '+p.R2+' ohm')+'.\nTotal resistance '+fmt(c.R,3)+' ohm, total current '+fmt(c.I,4)+' A, V1 = '+fmt(c.V1,3)+' V, I1 = '+fmt(c.I1,4)+' A'+(p.mode!=='one'?', V2 = '+fmt(c.V2,3)+' V, I2 = '+fmt(c.I2,4)+' A':'')+', power '+fmt(c.P,3)+' W.'; }
};
LAB.add(E);
LAB._ohm={calc:calc};
})();

})();
