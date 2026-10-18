/* Fry Lab templates: small, parameter-driven experiments for the curriculum gallery (see curriculum.js).
   Same object format as experiments.js (fields are listed at the top of app.js). Every key value is a param,
   so a student can change it and save the result as "my version". Param type 'text' is a one-line text box
   (axis names, a data list). */
(function(){
'use strict';
var H=LAB.H, C=H.C, TH=H.TH, fmt=H.fmt, T=FFT.T, F=FFT.F, PI=Math.PI, TAU=PI*2, D2R=PI/180;
var MINUS='−';

function num(v,d){ var s=fmt(v,d==null?2:d); if(s.indexOf('.')>=0) s=s.replace(/0+$/,'').replace(/\.$/,''); return s.replace('-',MINUS); }
function R4(W,Hh,m){ m=m==null?6:m; return {l:m,t:m,w:Math.max(10,W-2*m),h:Math.max(10,Hh-2*m)}; }
function fnPlot(g,v,f,col,w,dash){ var pts=[], n=Math.ceil(v.w/2); g.save(); g.beginPath(); g.rect(v.l,v.t,v.w,v.h); g.clip();
  for(var i=0;i<=n;i++){ var x=v.x0+(v.x1-v.x0)*i/n, y=f(x); if(isFinite(y)&&Math.abs(y)<1e6) pts.push([v.sx(x),v.sy(y)]); else { H.line(g,pts,col,w,dash); pts=[]; } }
  H.line(g,pts,col,w,dash); g.restore(); }
function tag(g,s,x,y,c,al){ H.text(g,s,x,y,{size:12.5,w:700,c:c||TH.text,al:al||'left',bg:TH.light?'rgba(255,255,255,.8)':'rgba(11,13,19,.75)'}); }
function txt(id,l,val,max){ return {id:id,l:l,type:'text',val:val,max:max||14}; }
function clampBox(x,y,W,Hh,w,h){ return [H.clamp(x,4,W-w-4),H.clamp(y,4,Hh-h-4)]; }
function polyPx(g,pts,fill,stroke){ g.beginPath(); pts.forEach(function(p,i){ if(i) g.lineTo(p[0],p[1]); else g.moveTo(p[0],p[1]); }); g.closePath();
  if(fill){ g.fillStyle=fill; g.fill(); } if(stroke){ g.strokeStyle=stroke; g.lineWidth=2; g.stroke(); } }

/* ===================== 1. 일차함수 y = ax + b (middle 2) ===================== */
(function(){
var S={v:null};
function eq(a,b){ var x=a===0?'':a===1?'x':a===-1?MINUS+'x':num(a)+'x'; if(!x) return 'y = '+num(b);
  return 'y = '+x+(b>0?' + '+num(b):b<0?' '+MINUS+' '+num(-b):''); }
var E={id:'linear', cat:'math', icon:'📏', name:'일차함수 그래프', desc:'기울기 a와 y절편 b로 직선 그리기',
  info:'일차함수 y = ax + b의 그래프는 직선이에요. a는 기울기로, x가 1 늘 때 y가 얼마나 변하는지를 말해요. b는 직선이 y축과 만나는 높이(y절편)예요. a > 0이면 오른쪽 위로, a < 0이면 오른쪽 아래로 가요. y = 0이 되는 x가 x절편이에요.',
  tries:['a를 0에서 5까지 키우면 직선이 어떻게 변하나요?','b만 바꾸면 직선이 어떻게 움직이나요? 기울기는 그대로인가요?','a를 음수로 바꾸고 x절편이 어디로 가는지 보세요','점 P를 옮겨 여러 번 기록하고 추세선의 기울기를 a와 비교해 보세요'],
  hint:'그래프를 눌러 끌면 점 P가 따라와요.', noPlay:true,
  params:[{id:'a',l:'기울기 a',min:-5,max:5,step:0.1,val:2,pre:[[0,'0'],[1,'1'],[-1,'−1'],[3,'3']]},{id:'b',l:'y절편 b',min:-8,max:8,step:0.5,val:1,d:1},
    {id:'xp',l:'점 P의 x 좌표',min:-20,max:20,step:0.1,val:2},{id:'rg',l:'보이는 범위',min:3,max:30,step:1,val:8},
    {id:'tri',l:'기울기 삼각형 보이기',type:'check',val:true},txt('xl','가로축 이름','x'),txt('yl','세로축 이름','y')],
  cols:[{k:'x',l:'x',d:2},{k:'y',l:'y',d:2},{k:'a',l:'기울기 a',d:1},{k:'b',l:'y절편 b',d:1}], gx:'x', gy:'y', fit:true,
  fitHint:function(m,b,x,y){ if(x==='x'&&y==='y') return F('추세선의 기울기 {0}, y절편 {1}을 a, b와 비교해 보세요',fmt(m,2),fmt(b,2)); },
  reset:function(){},
  draw:function(g,W,Hh){ var p=this.p, r=R4(W,Hh), v=S.v=H.view(r,-p.rg,p.rg,-p.rg,p.rg,{equal:true});
    H.axes(g,v,{xl:p.xl,yl:p.yl}); var f=function(x){ return p.a*x+p.b; }; fnPlot(g,v,f,C.fry,3);
    if(p.tri){ var x0=p.xp, x1=p.xp+1; H.seg(g,v.sx(x0),v.sy(f(x0)),v.sx(x1),v.sy(f(x0)),C.cyan,2,[5,4]); H.seg(g,v.sx(x1),v.sy(f(x0)),v.sx(x1),v.sy(f(x1)),C.pink,2,[5,4]);
      tag(g,'1',v.sx(x0+0.5),v.sy(f(x0))+(p.a>=0?14:-14),C.cyan,'center'); tag(g,'a = '+num(p.a,1),v.sx(x1)+6,v.sy((f(x0)+f(x1))/2),C.pink); }
    H.dot(g,v.sx(0),v.sy(p.b),5,C.vio,TH.stage); if(Math.abs(p.a)>1e-9) H.dot(g,v.sx(-p.b/p.a),v.sy(0),5,C.grn,TH.stage);
    H.dot(g,v.sx(p.xp),v.sy(f(p.xp)),6.5,C.or,TH.stage); tag(g,'P('+num(p.xp,1)+', '+num(f(p.xp),1)+')',v.sx(p.xp)+10,v.sy(f(p.xp))-14,C.or);
    tag(g,eq(p.a,p.b),r.l+8,r.t+16,C.fry); },
  read:function(){ var p=this.p, xi=Math.abs(p.a)<1e-9?'—':num(-p.b/p.a,2);
    return [['식',eq(p.a,p.b),'','wide hl'],['기울기 a',num(p.a,1),''],['y절편',num(p.b,1),''],['x절편',xi,'','ok'],['점 P의 y',num(p.a*p.xp+p.b,2),''],
      ['모양',p.a>0?'오른쪽 위로 (증가)':p.a<0?'오른쪽 아래로 (감소)':'수평선','']]; },
  record:function(){ var p=this.p; return {x:p.xp, y:p.a*p.xp+p.b, a:p.a, b:p.b}; },
  ai:function(){ var p=this.p; return 'Linear function y = a x + b. a = '+p.a+' (slope), b = '+p.b+' (y-intercept). Point P at x = '+p.xp+' gives y = '+fmt(p.a*p.xp+p.b,3)+'. x-intercept '+(p.a?fmt(-p.b/p.a,3):'none')+'.'; },
  down:function(x,y){ return !!S.v&&this.move(x,y,null,true); },
  move:function(x,y,e,cap){ if(!cap||!S.v) return false; H.setP('xp',Math.round(S.v.ix(x)*10)/10); return true; }
};
LAB.add(E);
})();

/* ===================== 2. 이차함수 y = a(x-p)² + q (middle 3) ===================== */
(function(){
var E={id:'quad', cat:'math', icon:'🌈', name:'이차함수 꼭짓점', desc:'y = a(x − p)² + q 에서 꼭짓점과 x절편 찾기',
  info:'이차함수 y = a(x − p)² + q의 그래프는 포물선이에요. 꼭짓점은 (p, q), 대칭축은 x = p예요. a > 0이면 아래로 볼록, a < 0이면 위로 볼록하고, |a|가 클수록 폭이 좁아져요. 판별식 D = b² − 4ac의 부호로 x축과 만나는 점의 개수(2개, 1개, 0개)를 알 수 있어요.',
  tries:['p와 q를 바꾸면 꼭짓점이 어디로 가는지 보세요','a가 양수일 때 q를 올리면 x절편이 몇 개로 변하나요?','판별식 D가 0이 될 때 그래프와 x축은 어떤 모습인가요?','a를 −1, 1, 2로 바꿔 폭이 어떻게 변하는지 비교해 보세요'],
  noPlay:true,
  params:[{id:'a',l:'a (폭과 방향)',min:-4,max:4,step:0.1,val:1,pre:[[1,'1'],[-1,'−1'],[2,'2'],[0.5,'0.5']]},{id:'p',l:'p (꼭짓점의 x)',min:-6,max:6,step:0.5,val:1,d:1},
    {id:'q',l:'q (꼭짓점의 y)',min:-8,max:8,step:0.5,val:-2,d:1},{id:'rg',l:'보이는 범위',min:3,max:20,step:1,val:8},
    txt('xl','가로축 이름','x'),txt('yl','세로축 이름','y')],
  cols:[{k:'a',l:'a',d:1},{k:'p',l:'p',d:1},{k:'q',l:'q',d:1},{k:'D',l:'판별식 D',d:2},{k:'n',l:'x절편의 개수',d:0}], gx:'q', gy:'D', fit:true,
  reset:function(){},
  calc:function(){ var p=this.p, a=Math.abs(p.a)<1e-9?0:p.a, B=-2*a*p.p, Cc=a*p.p*p.p+p.q, D=B*B-4*a*Cc, roots=[];
    if(a!==0){ var s=-p.q/a; if(s>1e-12){ roots=[p.p-Math.sqrt(s),p.p+Math.sqrt(s)]; } else if(Math.abs(s)<=1e-12) roots=[p.p]; } return {a:a,B:B,C:Cc,D:D,roots:roots}; },
  draw:function(g,W,Hh){ var p=this.p, k=this.calc(), r=R4(W,Hh), v=H.view(r,-p.rg,p.rg,-p.rg,p.rg,{equal:true});
    H.axes(g,v,{xl:p.xl,yl:p.yl}); H.seg(g,v.sx(p.p),r.t,v.sx(p.p),r.t+r.h,C.vio,1.5,[6,5]); fnPlot(g,v,function(x){ return k.a*(x-p.p)*(x-p.p)+p.q; },C.fry,3);
    k.roots.forEach(function(x){ H.dot(g,v.sx(x),v.sy(0),5.5,C.grn,TH.stage); tag(g,num(x,2),v.sx(x),v.sy(0)+16,C.grn,'center'); });
    H.dot(g,v.sx(0),v.sy(k.C),4.5,C.blu,TH.stage); H.dot(g,v.sx(p.p),v.sy(p.q),6.5,C.or,TH.stage);
    tag(g,'('+num(p.p,1)+', '+num(p.q,1)+')',v.sx(p.p)+10,v.sy(p.q)+(k.a>=0?18:-16),C.or); tag(g,'x = '+num(p.p,1),v.sx(p.p)+4,r.t+14,C.vio);
    tag(g,'y = '+(k.a===1?'':k.a===-1?MINUS:num(k.a,1))+'(x '+(p.p>=0?MINUS+' '+num(p.p,1):'+ '+num(-p.p,1))+')² '+(p.q>=0?'+ '+num(p.q,1):MINUS+' '+num(-p.q,1)),r.l+8,r.t+16,C.fry); },
  read:function(){ var p=this.p, k=this.calc(); if(!k.a) return [['식','a가 0이면 이차함수가 아니에요 (직선이 돼요)','','wide']];
    var gen='y = '+num(k.a,2)+'x² '+(k.B<0?MINUS+' '+num(-k.B,2):'+ '+num(k.B,2))+'x '+(k.C<0?MINUS+' '+num(-k.C,2):'+ '+num(k.C,2));
    return [['꼭짓점','('+num(p.p,1)+', '+num(p.q,1)+')','','hl'],['대칭축','x = '+num(p.p,1),''],['전개한 식',gen,'','wide'],['판별식 D',num(k.D,2),'','th'],
      ['x절편',k.roots.length?k.roots.map(function(x){ return num(x,2); }).join(', '):'없음','','ok'],['y절편',num(k.C,2),''],['모양',k.a>0?'아래로 볼록':'위로 볼록','']]; },
  record:function(){ var k=this.calc(), p=this.p; return {a:k.a, p:p.p, q:p.q, D:k.D, n:k.roots.length}; },
  ai:function(){ var p=this.p, k=this.calc(); return 'Quadratic y = a(x-p)^2 + q with a = '+p.a+', p = '+p.p+', q = '+p.q+'. Vertex ('+p.p+', '+p.q+'). Expanded: a='+fmt(k.a,2)+', b='+fmt(k.B,2)+', c='+fmt(k.C,2)+'. Discriminant D = '+fmt(k.D,3)+', real roots: '+(k.roots.map(function(x){ return fmt(x,3); }).join(', ')||'none')+'.'; }
};
LAB.add(E);
})();

/* ===================== 3. 평균·분산 히스토그램 (middle 1 stats, middle 3) ===================== */
(function(){
function parse(s){ return String(s).split(/[\s,;]+/).map(parseFloat).filter(isFinite).slice(0,300); }
function stats(p){ var d=parse(p.data), n=d.length; if(!n) return null; var s=d.slice().sort(function(a,b){ return a-b; }), sum=0; d.forEach(function(x){ sum+=x; });
  var mean=sum/n, vr=0; d.forEach(function(x){ vr+=(x-mean)*(x-mean); }); vr/=n;
  var med=n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2, cnt={}, best=0; s.forEach(function(x){ cnt[x]=(cnt[x]||0)+1; if(cnt[x]>best) best=cnt[x]; });
  var modes=best>1?Object.keys(cnt).filter(function(k){ return cnt[k]===best; }).map(Number):[];
  var lo=s[0], hi=s[n-1], bw=Math.max(p.bw,(hi-lo)/60,1e-6), b0=Math.floor(lo/bw+1e-9)*bw, nb=Math.floor((hi-b0)/bw+1e-9)+1, bins=[]; for(var i=0;i<nb;i++) bins.push(0);
  s.forEach(function(x){ var k=Math.min(nb-1,Math.floor((x-b0)/bw+1e-9)); bins[k]++; });
  return {d:d,n:n,mean:mean,vr:vr,sd:Math.sqrt(vr),med:med,modes:modes,lo:lo,hi:hi,bw:bw,b0:b0,bins:bins,maxc:Math.max.apply(null,bins)}; }
function gauss(){ return Math.sqrt(-2*Math.log(1-Math.random()))*Math.cos(TAU*Math.random()); }
var E={id:'stats', cat:'math', icon:'📊', name:'평균·분산 히스토그램', desc:'자료를 직접 쓰고 평균, 분산, 표준편차 보기',
  info:'자료를 계급으로 나눈 막대그래프가 히스토그램이에요. 평균은 자료를 모두 더해 개수로 나눈 값, 분산은 (편차)²의 평균, 표준편차는 분산의 제곱근이에요. 표준편차가 클수록 자료가 평균에서 멀리 흩어져 있어요.',
  tries:['자료를 모두 같은 수로 바꾸면 분산은 얼마가 되나요?','자료 하나를 아주 큰 값으로 바꾸면 평균과 중앙값 중 어느 쪽이 더 많이 변하나요?','계급의 크기를 바꾸면 히스토그램 모양이 어떻게 달라지나요?','자료의 모든 값에 10을 더하면 평균과 표준편차는 어떻게 되나요?'],
  hint:'아래 칸에 자료를 쉼표로 구분해서 써 보세요.', noPlay:true,
  params:[txt('data','자료 (쉼표로 구분)','4, 5, 5, 6, 7, 7, 7, 8, 9, 10, 12',200),{id:'bw',l:'계급의 크기',min:0.5,max:20,step:0.5,val:2,d:1},
    {id:'ms',l:'평균과 중앙값 선 보이기',type:'check',val:true},{id:'sd',l:'평균 ± 표준편차 구간 보이기',type:'check',val:true},txt('xl','자료 이름','점수'),txt('yl','세로축 이름','도수')],
  actions:[['rnd','무작위 자료'],['out','이상치 더하기']],
  act:function(k){ var p=this.p, st=stats(p); if(k==='rnd'){ var a=[]; for(var i=0;i<20;i++) a.push(Math.round(60+12*gauss())); H.setP('data',a.join(', ')); }
    else if(st){ H.setP('data',(p.data.replace(/[\s,;]+$/,'')+', '+Math.round(st.mean+4*st.sd+5)).slice(0,200)); } },
  cols:[{k:'n',l:'자료의 개수',d:0},{k:'mean',l:'평균',d:2},{k:'med',l:'중앙값',d:2},{k:'vr',l:'분산',d:2},{k:'sd',l:'표준편차',d:2}], gx:'mean', gy:'sd',
  reset:function(){},
  draw:function(g,W,Hh){ var p=this.p, st=stats(p), r={l:44,t:30,w:W-60,h:Hh-76};
    if(!st){ H.text(g,T('숫자 자료를 쉼표로 구분해서 써 주세요'),W/2,Hh/2,{al:'center',c:TH.dim,size:14}); return; }
    var x0=st.b0, x1=st.b0+st.bins.length*st.bw, pad=st.bw*0.3, ym=Math.max(2,st.maxc+1), v=H.view(r,Math.min(x0,st.mean-st.sd)-pad,Math.max(x1,st.mean+st.sd)+pad,0,ym);
    H.axes(g,v,{box:true,xl:p.xl,yl:p.yl,ys:Math.max(1,Math.round(H.nice(ym,5)))});
    if(p.sd){ g.fillStyle='rgba(167,139,250,.16)'; g.fillRect(v.sx(st.mean-st.sd),r.t,v.sx(st.mean+st.sd)-v.sx(st.mean-st.sd),r.h); }
    st.bins.forEach(function(c,i){ if(!c) return; var l=v.sx(st.b0+i*st.bw), w=v.sx(st.b0+(i+1)*st.bw)-l; g.fillStyle='rgba(255,201,60,.78)'; g.fillRect(l+1,v.sy(c),w-2,v.sy(0)-v.sy(c)); H.text(g,String(c),l+w/2,v.sy(c)-8,{al:'center',size:11.5,c:TH.dim}); });
    if(p.ms){ H.seg(g,v.sx(st.mean),r.t,v.sx(st.mean),r.t+r.h,C.red,2.2); H.seg(g,v.sx(st.med),r.t,v.sx(st.med),r.t+r.h,C.cyan,2,[6,4]); }
    g.font=H.font(12,700); var m1=T('평균')+' '+num(st.mean,2), m2=T('중앙값')+' '+num(st.med,2);
    H.text(g,m1,r.l+6,12,{size:12.5,w:700,c:C.red}); H.text(g,m2,r.l+16+g.measureText(m1).width,12,{size:12.5,w:700,c:C.cyan}); },
  read:function(){ var st=stats(this.p); if(!st) return [['자료의 개수','0','']];
    return [['자료의 개수',String(st.n),'개'],['평균',num(st.mean,2),'','hl'],['중앙값',num(st.med,2),''],['최빈값',st.modes.length?st.modes.map(function(x){ return num(x,2); }).join(', '):'없음',''],
      ['분산',num(st.vr,2),'','hl'],['표준편차',num(st.sd,2),'','hl'],['범위 (최대 − 최소)',num(st.hi-st.lo,2),''],['계급의 개수',String(st.bins.length),'개']]; },
  record:function(){ var st=stats(this.p); if(!st) return '자료를 먼저 써 주세요'; return {n:st.n, mean:st.mean, med:st.med, vr:st.vr, sd:st.sd}; },
  ai:function(){ var p=this.p, st=stats(p); return 'Statistics histogram. Data: '+parse(p.data).join(', ')+'. Class width '+p.bw+'.'+(st?' n = '+st.n+', mean '+fmt(st.mean,3)+', median '+fmt(st.med,3)+', population variance '+fmt(st.vr,3)+' (mean of squared deviations), standard deviation '+fmt(st.sd,3)+'.':''); }
};
LAB.add(E);
})();

/* ===================== 4. 피타고라스 정리 (middle 2) ===================== */
(function(){
var E={id:'pyth', cat:'math', icon:'📐', name:'피타고라스 정리', desc:'세 변 위의 정사각형 넓이를 비교하기',
  info:'직각삼각형에서 직각을 낀 두 변의 길이를 a, b, 빗변의 길이를 c라고 하면 a² + b² = c²이에요. 각 변 위에 정사각형을 그리면 두 작은 정사각형의 넓이의 합이 가장 큰 정사각형의 넓이와 같아요. 세 변이 이 식을 만족하면 그 삼각형은 직각삼각형이에요.',
  tries:['a = 3, b = 4일 때 c는 얼마인가요?','5, 12, 13이나 8, 15, 17처럼 세 변이 모두 자연수가 되는 경우를 찾아보세요','모드를 바꿔 a = 3, b = 4, c = 6으로 놓으면 어떤 삼각형이 되나요?','a²+b²와 c²의 크기 관계에 따라 삼각형의 모양이 어떻게 달라지는지 보세요'],
  noPlay:true,
  params:[{id:'mode',l:'모드',type:'seg',opts:[['right','직각삼각형 (c는 자동)'],['free','세 변을 마음대로']],val:'right'},
    {id:'a',l:'변 a',min:1,max:12,step:0.5,val:3,d:1},{id:'b',l:'변 b',min:1,max:12,step:0.5,val:4,d:1},
    {id:'c',l:'변 c',min:1,max:20,step:0.5,val:6,d:1,show:function(p){ return p.mode==='free'; }}],
  cols:[{k:'a',l:'a',d:1},{k:'b',l:'b',d:1},{k:'c',l:'c',d:2},{k:'s',l:'a²+b²',d:2},{k:'c2',l:'c²',d:2}], gx:'s', gy:'c2', fit:true,
  fitHint:function(m,b,x,y){ if(x==='s'&&y==='c2') return F('직각삼각형이면 기울기가 1에 가까워요 (지금 {0})',fmt(m,3)); },
  reset:function(){},
  sides:function(){ var p=this.p; return {a:p.a, b:p.b, c:p.mode==='right'?Math.hypot(p.a,p.b):p.c}; },
  draw:function(g,W,Hh){ var s=this.sides(), a=s.a, b=s.b, c=s.c;
    if(!(Math.abs(a-b)<c&&c<a+b)){ H.text(g,T('이 길이로는 삼각형을 만들 수 없어요'),W/2,Hh/2,{al:'center',c:C.red,size:15,w:700}); H.text(g,T('가장 긴 변은 나머지 두 변의 합보다 짧아야 해요'),W/2,Hh/2+24,{al:'center',c:TH.dim,size:12.5}); return; }
    var cg=(a*a+b*b-c*c)/(2*a*b), sg=Math.sqrt(Math.max(0,1-cg*cg)), Cp=[0,0], Bp=[a,0], Ap=[b*cg,b*sg];
    function sq(P,Q,Rr){ var dx=Q[0]-P[0], dy=Q[1]-P[1], nx=-dy, ny=dx; if(nx*(Rr[0]-P[0])+ny*(Rr[1]-P[1])>0){ nx=-nx; ny=-ny; } return [P,Q,[Q[0]+nx,Q[1]+ny],[P[0]+nx,P[1]+ny]]; }
    var S=[[sq(Cp,Bp,Ap),C.blu,a*a,'a'],[sq(Cp,Ap,Bp),C.grn,b*b,'b'],[sq(Ap,Bp,Cp),C.red,c*c,'c']], pts=[Cp,Bp,Ap]; S.forEach(function(q){ q[0].forEach(function(z){ pts.push(z); }); });
    var xs=pts.map(function(z){ return z[0]; }), ys=pts.map(function(z){ return z[1]; }), v=H.view({l:10,t:10,w:W-20,h:Hh-20},Math.min.apply(null,xs),Math.max.apply(null,xs),Math.min.apply(null,ys),Math.max.apply(null,ys),{equal:true});
    function px(z){ return [v.sx(z[0]),v.sy(z[1])]; }
    S.forEach(function(q){ var P=q[0].map(px); polyPx(g,P,q[1]+'38',q[1]); var cx=0, cy=0; P.forEach(function(z){ cx+=z[0]/4; cy+=z[1]/4; });
      H.text(g,q[3]+'² = '+num(q[2],2),cx,cy,{al:'center',size:Math.max(11,Math.min(15,Math.sqrt(q[2])*v.kx*0.16)),w:700,c:q[1]}); });
    polyPx(g,[px(Cp),px(Bp),px(Ap)],'rgba(255,201,60,.35)',C.fry);
    if(Math.abs(cg)<1e-6){ var u=px(Cp), w=px(Bp), z=px(Ap), d=12, ex=Math.sign(w[0]-u[0])*d, ey=Math.sign(z[1]-u[1])*d; g.strokeStyle=TH.text; g.lineWidth=1.5; g.strokeRect(Math.min(u[0],u[0]+ex),Math.min(u[1],u[1]+ey),d,d); }
  },
  read:function(){ var s=this.sides(), q=s.a*s.a+s.b*s.b, d=q-s.c*s.c, ok=Math.abs(d)<1e-9, r=[['a²',num(s.a*s.a,2),''],['b²',num(s.b*s.b,2),''],['a² + b²',num(q,2),'','hl'],['c²',num(s.c*s.c,2),''],['빗변 c',num(s.c,3),'','th']];
    r.push(['삼각형의 모양',!(Math.abs(s.a-s.b)<s.c&&s.c<s.a+s.b)?'삼각형이 아니에요':ok?'직각삼각형 (a² + b² = c²)':d>0?'예각삼각형 (a² + b² > c²)':'둔각삼각형 (a² + b² < c²)','','wide ok']); return r; },
  record:function(){ var s=this.sides(); if(!(Math.abs(s.a-s.b)<s.c&&s.c<s.a+s.b)) return '삼각형이 만들어지는 길이로 맞춰 주세요'; return {a:s.a,b:s.b,c:s.c,s:s.a*s.a+s.b*s.b,c2:s.c*s.c}; },
  ai:function(){ var s=this.sides(); return 'Pythagorean theorem. Sides a = '+s.a+', b = '+s.b+', c = '+fmt(s.c,3)+(this.p.mode==='right'?' (c computed as the hypotenuse)':' (free mode)')+'. a^2+b^2 = '+fmt(s.a*s.a+s.b*s.b,3)+', c^2 = '+fmt(s.c*s.c,3)+'.'; }
};
LAB.add(E);
})();

/* ===================== 5. 등차·등비수열 (high 2) ===================== */
(function(){
function terms(p){ var a=[], s=[], tot=0; for(var k=1;k<=p.n;k++){ var v=p.kind==='ar'?p.a1+(k-1)*p.d:p.a1*Math.pow(p.r,k-1); a.push(v); tot+=v; s.push(tot); } return {a:a,s:s}; }
function panel(g,r,vals,col,hiCol,bars,xl,yl){ var mn=Math.min(0,Math.min.apply(null,vals)), mx=Math.max(0,Math.max.apply(null,vals)); if(mx-mn<1e-9){ mx=1; } var pad=(mx-mn)*0.12, n=vals.length;
  var v=H.view(r,0,n+1,mn-(mn<0?pad:0),mx+pad); H.axes(g,v,{box:true,xl:xl,yl:yl,xs:n>12?H.nice(n,6):1});
  if(bars){ vals.forEach(function(y,i){ var x=v.sx(i+1), w=Math.max(3,Math.min(26,v.kx*0.6)); g.fillStyle=i===n-1?hiCol:col; g.fillRect(x-w/2,Math.min(v.sy(y),v.sy(0)),w,Math.abs(v.sy(y)-v.sy(0))||1); }); }
  else { H.line(g,vals.map(function(y,i){ return [v.sx(i+1),v.sy(y)]; }),col,2); vals.forEach(function(y,i){ H.dot(g,v.sx(i+1),v.sy(y),i===n-1?5.5:3,i===n-1?hiCol:col); }); } }
var E={id:'seq', cat:'math', icon:'🪜', name:'등차·등비수열', desc:'첫째항, 공차·공비, 항의 수에 따른 일반항과 합',
  info:'등차수열은 이웃한 두 항의 차가 일정한 수열로, 일반항은 aₙ = a₁ + (n − 1)d이고 첫째항부터 n번째 항까지의 합은 Sₙ = n(2a₁ + (n − 1)d)/2예요. 등비수열은 이웃한 두 항의 비가 일정해서 aₙ = a₁rⁿ⁻¹이고 Sₙ = a₁(rⁿ − 1)/(r − 1)이에요(r ≠ 1).',
  tries:['등차수열에서 공차 d를 음수로 바꾸면 항이 어떻게 변하나요?','공비 r을 0.5, 1, 1.5로 바꾸면 합 Sₙ은 어떻게 달라지나요?','|r| < 1일 때 항의 수 n을 늘리면 Sₙ은 어떤 값에 가까워지나요?','같은 a₁에서 시작해 등차와 등비의 n = 10일 때 합을 비교해 보세요'],
  noPlay:true,
  params:[{id:'kind',l:'수열의 종류',type:'seg',opts:[['ar','등차수열'],['ge','등비수열']],val:'ar'},{id:'a1',l:'첫째항 a₁',min:-10,max:10,step:0.5,val:2,d:1},
    {id:'d',l:'공차 d',min:-5,max:5,step:0.5,val:3,d:1,show:function(p){ return p.kind==='ar'; }},{id:'r',l:'공비 r',min:-2,max:2,step:0.05,val:1.5,d:2,show:function(p){ return p.kind==='ge'; }},
    {id:'n',l:'항의 수 n',min:2,max:20,step:1,val:10},txt('xl','가로축 이름','n'),txt('yl','세로축 이름','aₙ')],
  cols:[{k:'n',l:'n',d:0},{k:'a1',l:'a₁',d:1},{k:'q',l:'공차 d 또는 공비 r',d:2},{k:'an',l:'aₙ',d:3},{k:'sn',l:'Sₙ',d:3}], gx:'n', gy:'an', fit:true,
  fitHint:function(m,b,x,y){ if(x==='n'&&y==='an') return F('등차수열이면 기울기 {0}이 공차 d예요',fmt(m,2)); },
  reset:function(){},
  draw:function(g,W,Hh){ var p=this.p, t=terms(p), h2=(Hh-20)/2, hh=h2-30;
    panel(g,{l:50,t:14,w:W-64,h:hh},t.a,'rgba(167,139,250,.75)',C.fry,true,p.xl,p.yl);
    panel(g,{l:50,t:14+h2+10,w:W-64,h:hh},t.s,C.cyan,C.fry,false,p.xl,'Sₙ'); },
  read:function(){ var p=this.p, t=terms(p), an=t.a[p.n-1], sn=t.s[p.n-1];
    return [['일반항',p.kind==='ar'?'aₙ = '+num(p.a1,1)+' + (n '+MINUS+' 1) × '+num(p.d,1):'aₙ = '+num(p.a1,1)+' × '+num(p.r,2)+'ⁿ⁻¹','','wide'],['n번째 항 aₙ',num(an,3),'','hl'],['합 Sₙ',num(sn,3),'','hl'],
      [p.kind==='ar'?'공차 d':'공비 r',num(p.kind==='ar'?p.d:p.r,2),''],['평균 Sₙ / n',num(sn/p.n,3),'','th']]; },
  record:function(){ var p=this.p, t=terms(p); return {n:p.n, a1:p.a1, q:p.kind==='ar'?p.d:p.r, an:t.a[p.n-1], sn:t.s[p.n-1]}; },
  ai:function(){ var p=this.p, t=terms(p); return (p.kind==='ar'?'Arithmetic':'Geometric')+' sequence with a1 = '+p.a1+', '+(p.kind==='ar'?'common difference d = '+p.d:'common ratio r = '+p.r)+', n = '+p.n+'. a_n = '+fmt(t.a[p.n-1],3)+', S_n = '+fmt(t.s[p.n-1],3)+'.'; }
};
LAB.add(E);
})();

/* ===================== 6. 삼각함수 그래프 y = A sin(B(x - C)) + D (high 2) ===================== */
(function(){
function piLab(x){ var k=Math.round(x/(PI/2)); if(Math.abs(x-k*PI/2)>1e-6) return ''; if(k===0) return '0'; var s=k<0?MINUS:''; k=Math.abs(k); var w=k%2===0?(k/2===1?'π':(k/2)+'π'):(k===1?'π/2':k+'π/2'); return s+w; }
var E={id:'sinwave', cat:'math', icon:'〰️', name:'삼각함수 그래프', desc:'y = A sin(B(x − C)) + D 의 진폭, 주기, 평행이동',
  info:'y = A sin(B(x − C)) + D에서 |A|는 진폭(중심선에서 최댓값까지의 거리), 주기는 2π/|B|, C는 오른쪽으로 옮긴 양, D는 중심선의 높이예요. cos 함수는 sin 함수를 왼쪽으로 π/2만큼 옮긴 모양과 같아요.',
  tries:['B를 2로 바꾸면 주기가 어떻게 되나요?','C를 π/2 ≈ 1.57로 바꾸면 sin 그래프가 어떤 그래프와 같아지나요?','A와 D를 바꿔 최댓값이 3, 최솟값이 −1이 되도록 만들어 보세요','sin 대신 cos를 고르고 같은 값으로 비교해 보세요'],
  noPlay:true,
  params:[{id:'fn',l:'함수',type:'seg',opts:[['sin','사인 sin'],['cos','코사인 cos']],val:'sin'},{id:'A',l:'진폭 A',min:-4,max:4,step:0.1,val:2,pre:[[1,'1'],[2,'2'],[3,'3']]},
    {id:'B',l:'B (주기를 결정)',min:0.25,max:4,step:0.05,val:1,d:2,pre:[[0.5,'0.5'],[1,'1'],[2,'2']]},{id:'C',l:'C (오른쪽으로 옮긴 양)',min:-6.3,max:6.3,step:0.1,val:0,d:1,u:'rad'},
    {id:'D',l:'D (중심선의 높이)',min:-3,max:3,step:0.5,val:0,d:1},{id:'ref',l:'기본 그래프 y = sin x 함께 보기',type:'check',val:true},txt('xl','가로축 이름','x'),txt('yl','세로축 이름','y')],
  cols:[{k:'A',l:'A',d:1},{k:'B',l:'B',d:2},{k:'C',l:'C',d:1},{k:'D',l:'D',d:1},{k:'T',l:'주기',d:3}], gx:'B', gy:'T',
  reset:function(){},
  f:function(x){ var p=this.p, u=p.B*(x-p.C); return p.A*(p.fn==='sin'?Math.sin(u):Math.cos(u))+p.D; },
  draw:function(g,W,Hh){ var p=this.p, r={l:8,t:8,w:W-16,h:Hh-16}, v=H.view(r,-7,7,-7.5,7.5);
    H.axes(g,v,{xs:PI/2,ys:2,xf:piLab,xl:p.xl,yl:p.yl}); var me=this;
    if(p.ref) fnPlot(g,v,p.fn==='sin'?Math.sin:Math.cos,TH.dim,1.5,[5,5]);
    H.seg(g,r.l,v.sy(p.D),r.l+r.w,v.sy(p.D),C.vio,1,[3,5]); fnPlot(g,v,function(x){ return me.f(x); },C.fry,3);
    var T0=TAU/p.B, mx=p.fn==='sin'?p.C+T0/4:p.C;
    H.arrow(g,v.sx(mx),v.sy(p.D),v.sx(mx),v.sy(p.D+p.A),C.pink,2); tag(g,'|A| = '+num(Math.abs(p.A),1),v.sx(mx)+6,v.sy(p.D+p.A/2),C.pink);
    var y0=v.sy(p.D)+(p.A>=0?20:-20); H.arrow(g,v.sx(p.C),y0,v.sx(p.C+T0),y0,C.grn,2); tag(g,'T = 2π/B = '+num(T0,2),v.sx(p.C)+6,y0+(p.A>=0?14:-14),C.grn); },
  read:function(){ var p=this.p, T0=TAU/p.B; return [['진폭 |A|',num(Math.abs(p.A),2),''],['주기 2π/B',num(T0,3)+' ('+num(2/p.B,2)+'π)','rad','hl'],['최댓값',num(p.D+Math.abs(p.A),2),'','th'],['최솟값',num(p.D-Math.abs(p.A),2),'','th'],['중심선','y = '+num(p.D,1),''],['오른쪽 이동량 C',num(p.C,1),'rad']]; },
  record:function(){ var p=this.p; return {A:p.A,B:p.B,C:p.C,D:p.D,T:TAU/p.B}; },
  ai:function(){ var p=this.p; return 'Graph of y = A '+p.fn+'(B(x - C)) + D with A = '+p.A+', B = '+p.B+', C = '+p.C+' rad, D = '+p.D+'. Amplitude '+Math.abs(p.A)+', period 2*pi/B = '+fmt(TAU/p.B,3)+', max '+fmt(p.D+Math.abs(p.A),2)+', min '+fmt(p.D-Math.abs(p.A),2)+'.'; }
};
LAB.add(E);
})();

/* ===================== 7. 등속·등가속 운동 (middle 3, high 1) ===================== */
(function(){
var S={t:0};
function acc(p){ return p.mode==='acc'?p.a:0; }
function xt(p,t){ return p.x0+p.v0*t+0.5*acc(p)*t*t; }
function vt(p,t){ return p.v0+acc(p)*t; }
function range(p,fn){ var lo=Infinity, hi=-Infinity; for(var i=0;i<=60;i++){ var y=fn(p,p.tm*i/60); lo=Math.min(lo,y); hi=Math.max(hi,y); } return [lo,hi]; }
function graph(g,r,p,fn,cur,col,yl,fillArea){ var rg=range(p,fn), lo=Math.min(0,rg[0]), hi=Math.max(0,rg[1]); if(hi-lo<1e-6){ hi=lo+1; } var pad=(hi-lo)*0.12;
  var v=H.view(r,0,p.tm,lo-(lo<0?pad:0),hi+pad); H.axes(g,v,{box:true,xl:'t (s)',yl:yl});
  var pts=[]; for(var i=0;i<=80;i++){ var t=p.tm*i/80; pts.push([v.sx(t),v.sy(fn(p,t))]); }
  if(fillArea&&S.t>0){ g.beginPath(); g.moveTo(v.sx(0),v.sy(0)); for(var k=0;k<=40;k++){ var tt=S.t*k/40; g.lineTo(v.sx(tt),v.sy(fn(p,tt))); } g.lineTo(v.sx(S.t),v.sy(0)); g.closePath(); g.fillStyle='rgba(79,157,255,.22)'; g.fill(); }
  H.line(g,pts,col,2.4); H.dot(g,v.sx(S.t),v.sy(fn(p,S.t)),5.5,C.fry,TH.stage); return v; }
var E={id:'kin', cat:'sci', icon:'🛷', name:'등속·등가속 운동', desc:'시간에 따른 위치와 속도 그래프 읽기',
  info:'속도가 일정한 운동이 등속 운동이고, 속도가 일정하게 변하는 운동이 등가속도 운동이에요. 등가속도 운동에서 v = v₀ + at, 위치는 x = x₀ + v₀t + ½at²예요. 시간-속도 그래프의 기울기는 가속도, 그래프 아래 넓이는 이동한 거리(변위)를 나타내요.',
  tries:['등속 운동일 때 시간-위치 그래프는 어떤 모양인가요?','가속도를 0.5, 2, 4로 바꿔 시간-속도 그래프의 기울기를 비교해 보세요','처음 속도를 음수로 하고 가속도를 양수로 하면 수레가 어떻게 움직이나요?','시간-속도 그래프 아래 넓이가 이동한 거리와 같은지 확인해 보세요'],
  hint:'시작을 누르면 수레가 달려요. 값을 바꾸면 그래프가 바로 바뀌어요.', speed:true,
  params:[{id:'mode',l:'운동의 종류',type:'seg',opts:[['uni','등속 운동'],['acc','등가속도 운동']],val:'acc'},{id:'x0',l:'처음 위치 x₀',min:-10,max:20,step:1,val:0,u:'m'},
    {id:'v0',l:'처음 속도 v₀',min:-10,max:30,step:0.5,val:4,u:'m/s',d:1},{id:'a',l:'가속도 a',min:-6,max:6,step:0.1,val:2,u:'m/s²',d:1,show:function(p){ return p.mode==='acc'; }},
    {id:'tm',l:'관찰 시간',min:2,max:20,step:1,val:10,u:'s'}],
  cols:[{k:'t',l:'시간 t',u:'s',d:2},{k:'x',l:'위치 x',u:'m',d:2},{k:'v',l:'속도 v',u:'m/s',d:2},{k:'a',l:'가속도 a',u:'m/s²',d:2}], gx:'t', gy:'v', fit:true,
  fitHint:function(m,b,x,y){ if(x==='t'&&y==='v') return F('기울기 {0} m/s²가 가속도 a, y절편 {1} m/s가 처음 속도예요',fmt(m,2),fmt(b,2)); },
  reset:function(){ S.t=0; }, onPlay:function(){ if(S.t>=this.p.tm-1e-9) S.t=0; },
  change:function(){ S.t=Math.min(S.t,this.p.tm); },
  step:function(dt){ S.t+=dt; if(S.t>=this.p.tm){ S.t=this.p.tm; return 'done'; } },
  draw:function(g,W,Hh){ var p=this.p, rx=range(p,xt), x0=Math.min(rx[0],p.x0), x1=Math.max(rx[1],p.x0); if(x1-x0<1) x1=x0+1; var wide=W>=560, th=wide?Hh*0.3:Hh*0.2, ty=th*0.62;
    var tl=30, tr=W-30, sx=function(x){ return tl+(x-x0)/(x1-x0)*(tr-tl); };
    H.seg(g,tl-10,ty+16,tr+10,ty+16,TH.dim,2); var st=H.nice(x1-x0,6); for(var x=Math.ceil(x0/st)*st;x<=x1+1e-9;x+=st){ H.seg(g,sx(x),ty+16,sx(x),ty+22,TH.dim,1.5); H.text(g,num(x,1),sx(x),ty+34,{al:'center',size:11,c:TH.dim}); }
    var cx=sx(xt(p,S.t)); g.fillStyle=C.blu; H.rrect(g,cx-17,ty-12,34,22,5); g.fill(); H.dot(g,cx-9,ty+13,4,TH.text); H.dot(g,cx+9,ty+13,4,TH.text);
    var v=vt(p,S.t); if(Math.abs(v)>0.05) H.arrow(g,cx,ty-18,cx+H.clamp(v*5,-90,90),ty-18,C.fry,2.5);
    var top=th+12, gh=Hh-top-8;
    if(wide){ var hw=(W-24)/2; graph(g,{l:46,t:top+8,w:hw-46,h:gh-44},p,xt,0,C.vio,'x (m)',false); graph(g,{l:hw+46,t:top+8,w:hw-58,h:gh-44},p,vt,0,C.cyan,'v (m/s)',true); }
    else { var h2=(gh-10)/2; graph(g,{l:46,t:top+6,w:W-62,h:h2-34},p,xt,0,C.vio,'x (m)',false); graph(g,{l:46,t:top+h2+10,w:W-62,h:h2-34},p,vt,0,C.cyan,'v (m/s)',true); } },
  read:function(){ var p=this.p, t=S.t, x=xt(p,t); return [['시간 t',num(t,2),'s'],['위치 x',num(x,2),'m','hl'],['속도 v',num(vt(p,t),2),'m/s','hl'],['가속도 a',num(acc(p),2),'m/s²'],['변위 (x − x₀)',num(x-p.x0,2),'m','th'],['평균 속도',t>0?num((x-p.x0)/t,2):'—','m/s']]; },
  record:function(){ var p=this.p; return {t:S.t, x:xt(p,S.t), v:vt(p,S.t), a:acc(p)}; },
  ai:function(){ var p=this.p; return (p.mode==='acc'?'Uniformly accelerated':'Uniform')+' motion on a line. x0 = '+p.x0+' m, v0 = '+p.v0+' m/s, a = '+acc(p)+' m/s^2. At t = '+fmt(S.t,2)+' s: x = '+fmt(xt(p,S.t),2)+' m, v = '+fmt(vt(p,S.t),2)+' m/s.'; }
};
LAB.add(E);
})();

/* ===================== 8. 산·염기 pH 혼합 (high 1) ===================== */
(function(){
var KA=1.8e-5, KW=1e-14;
function calc(p){ var V=p.Va+p.Vb, Ct=p.Ca*p.Va/V, Na=p.Cb*p.Vb/V, ka=p.acid==='strong'?1e9:KA, lo=-14, hi=1;
  var f=function(h){ return h+Na-KW/h-Ct*ka/(ka+h); };
  for(var i=0;i<80;i++){ var m=(lo+hi)/2; if(f(Math.pow(10,m))>0) hi=m; else lo=m; }
  var h=Math.pow(10,(lo+hi)/2), ph=-Math.log10(h); return {pH:ph,h:h,V:V,nA:p.Ca*p.Va,nB:p.Cb*p.Vb,Ve:p.Ca*p.Va/p.Cb}; }
function pHcol(ph){ var s=[[0,[229,36,43]],[2,[242,106,33]],[4,[247,164,29]],[6,[243,229,28]],[7,[92,184,92]],[8,[47,181,159]],[10,[58,123,213]],[12,[91,63,168]],[14,[74,36,120]]];
  ph=H.clamp(ph,0,14); for(var i=1;i<s.length;i++){ if(ph<=s[i][0]){ var t=(ph-s[i-1][0])/(s[i][0]-s[i-1][0]), a=s[i-1][1], b=s[i][1]; return 'rgb('+[0,1,2].map(function(k){ return Math.round(a[k]+(b[k]-a[k])*t); }).join(',')+')'; } } return 'rgb(74,36,120)'; }
var E={id:'ph', cat:'sci', icon:'🧪', name:'산·염기 pH 혼합', desc:'산과 염기를 섞을 때 pH가 변하는 모습',
  info:'수용액의 pH는 −log[H⁺]로, 7보다 작으면 산성, 7이면 중성, 7보다 크면 염기성이에요. 산(H⁺)과 염기(OH⁻)가 만나면 물이 되는 중화 반응이 일어나고, H⁺와 OH⁻의 양이 같아지는 점이 중화점(당량점)이에요. 강산에 강염기를 넣으면 중화점 부근에서 pH가 급격히 바뀌어요.',
  tries:['염기를 조금씩 넣으며 pH가 7이 되는 부피를 찾아보세요','산의 농도를 두 배로 하면 중화점의 부피는 어떻게 되나요?','강산과 약산(CH₃COOH)의 처음 pH와 중화점의 pH를 비교해 보세요','기록한 점으로 pH 변화 그래프를 만들어 보세요'],
  hint:'염기를 넣은 부피 슬라이더를 움직여 보세요.', noPlay:true,
  params:[{id:'acid',l:'산의 종류',type:'seg',opts:[['strong','강산 (HCl)'],['weak','약산 (CH₃COOH)']],val:'strong'},{id:'Ca',l:'산의 농도',min:0.01,max:1,step:0.01,val:0.1,u:'M'},
    {id:'Va',l:'산의 부피',min:10,max:100,step:1,val:25,u:'mL'},{id:'Cb',l:'염기(NaOH)의 농도',min:0.01,max:1,step:0.01,val:0.1,u:'M'},{id:'Vb',l:'넣은 염기의 부피',min:0,max:100,step:0.5,val:10,u:'mL',d:1}],
  cols:[{k:'Vb',l:'넣은 염기 부피',u:'mL',d:1},{k:'pH',l:'pH',d:2},{k:'Ca',l:'산의 농도',u:'M',d:2},{k:'Cb',l:'염기의 농도',u:'M',d:2}], gx:'Vb', gy:'pH', join:true,
  reset:function(){},
  draw:function(g,W,Hh){ var p=this.p, c=calc(p), wide=W>=Hh*1.15, bx=wide?{l:0,t:0,w:W*0.4,h:Hh}:{l:0,t:0,w:W,h:Hh*0.44}, gr=wide?{l:W*0.4+44,t:34,w:W*0.6-62,h:Hh-92}:{l:46,t:Hh*0.44+26,w:W-62,h:Hh*0.56-76};
    var bw=Math.min(bx.w*0.5,150), bh=Math.min(bx.h-70,170), cx=bx.l+bx.w/2, top=bx.t+22, lvl=bh*H.clamp(c.V/200,0.12,1);
    g.beginPath(); g.moveTo(cx-bw/2,top); g.lineTo(cx-bw/2+6,top+bh); g.lineTo(cx+bw/2-6,top+bh); g.lineTo(cx+bw/2,top); g.strokeStyle=TH.dim; g.lineWidth=3; g.stroke();
    var wl=6*(bh-lvl)/bh; g.beginPath(); g.moveTo(cx-bw/2+wl,top+bh-lvl); g.lineTo(cx-bw/2+6,top+bh); g.lineTo(cx+bw/2-6,top+bh); g.lineTo(cx+bw/2-wl,top+bh-lvl); g.closePath(); g.fillStyle=pHcol(c.pH); g.globalAlpha=0.85; g.fill(); g.globalAlpha=1;
    H.text(g,'pH '+num(c.pH,2),cx,top+bh+22,{al:'center',size:18,w:800,c:pHcol(c.pH)}); H.text(g,T(c.pH<6.95?'산성':c.pH>7.05?'염기성':'중성'),cx,top+bh+42,{al:'center',size:12.5,c:TH.dim});
    var sw=bx.w-30, sl=bx.l+15; for(var i=0;i<sw;i++){ g.fillStyle=pHcol(i/sw*14); g.fillRect(sl+i,bx.t+4,1.5,8); } H.dot(g,sl+c.pH/14*sw,bx.t+8,5,TH.text,TH.stage);
    var v=H.view(gr,0,100,0,14); H.axes(g,v,{box:true,xl:'Vb (mL)',yl:'pH',ys:2,xs:20});
    var pts=[]; for(var x=0;x<=100;x+=1){ pts.push([v.sx(x),v.sy(calc({acid:p.acid,Ca:p.Ca,Va:p.Va,Cb:p.Cb,Vb:x}).pH)]); } H.line(g,pts,C.fry,2.5);
    if(c.Ve<=100){ H.seg(g,v.sx(c.Ve),gr.t,v.sx(c.Ve),gr.t+gr.h,C.grn,1.5,[5,4]); tag(g,T('당량점')+' '+num(c.Ve,1)+' mL',Math.min(v.sx(c.Ve)+6,gr.l+gr.w-110),gr.t+14,C.grn); }
    H.dot(g,v.sx(p.Vb),v.sy(c.pH),6.5,C.or,TH.stage); },
  read:function(){ var p=this.p, c=calc(p); return [['pH',num(c.pH,2),'','hl'],['액성',c.pH<6.95?'산성':c.pH>7.05?'염기성':'중성',''],['[H⁺]',c.h.toExponential(2),'M'],['섞인 용액의 부피',num(c.V,1),'mL'],
    ['산의 양',num(c.nA,2),'mmol'],['염기의 양',num(c.nB,2),'mmol'],['당량점의 부피',num(c.Ve,1),'mL','th']]; },
  record:function(){ var p=this.p, c=calc(p); return {Vb:p.Vb, pH:c.pH, Ca:p.Ca, Cb:p.Cb}; },
  ai:function(){ var p=this.p, c=calc(p); return 'Acid-base mixing. '+(p.acid==='strong'?'Strong acid (HCl)':'Weak acid (acetic acid, Ka 1.8e-5)')+' '+p.Va+' mL at '+p.Ca+' M; NaOH '+p.Vb+' mL at '+p.Cb+' M added. Acid '+fmt(c.nA,2)+' mmol, base '+fmt(c.nB,2)+' mmol, equivalence at '+fmt(c.Ve,1)+' mL. Mixture pH = '+fmt(c.pH,2)+'.'; }
};
LAB.add(E);
})();

/* ===================== 9. 파동의 중첩 (high 2 physics) ===================== */
(function(){
var S={t:0};
function y1(p,x,t){ var k=TAU/p.L1; return p.A1*Math.sin(k*x-k*p.v*t); }
function y2(p,x,t){ var k=TAU/p.L2; return p.A2*Math.sin(k*x-p.dir*k*p.v*t+p.ph*D2R); }
var E={id:'wsup', cat:'sci', icon:'🎼', name:'파동의 중첩', desc:'두 파동이 만나 합쳐지는 모습 (보강, 상쇄, 정상파)',
  info:'두 파동이 같은 곳에서 만나면 변위를 더한 합성파가 만들어져요(중첩의 원리). 마루와 마루가 만나면 진폭이 커지는 보강 간섭, 마루와 골이 만나면 서로 줄어드는 상쇄 간섭이 일어나요. 진폭과 파장이 같은 두 파동이 서로 반대 방향으로 가면 제자리에서 진동하는 정상파가 생겨요.',
  tries:['두 파동의 위상차를 0°와 180°로 바꾸면 합성파가 어떻게 달라지나요?','진행 방향을 반대 방향으로 하고 두 파장을 같게 해서 정상파를 만들어 보세요','파장을 조금 다르게 하면 합성파의 크기가 오르락내리락해요. 이를 맥놀이라고 해요','진폭 A₁과 A₂가 다를 때 합성파의 최소 진폭은 얼마인가요?'],
  autoRun:true, speed:true,
  params:[{id:'A1',l:'파동 1의 진폭 A₁',min:0,max:3,step:0.1,val:1,u:'m',d:1},{id:'L1',l:'파동 1의 파장 λ₁',min:0.5,max:5,step:0.1,val:2,u:'m',d:1},
    {id:'A2',l:'파동 2의 진폭 A₂',min:0,max:3,step:0.1,val:1,u:'m',d:1},{id:'L2',l:'파동 2의 파장 λ₂',min:0.5,max:5,step:0.1,val:2,u:'m',d:1},
    {id:'ph',l:'파동 2의 위상차',min:0,max:360,step:15,val:0,u:'°',pre:[[0,'0°'],[90,'90°'],[180,'180°']]},
    {id:'dir',l:'파동 2의 진행 방향',type:'seg',opts:[[1,'같은 방향'],[-1,'반대 방향']],val:1},{id:'v',l:'파동의 속력',min:0.2,max:3,step:0.1,val:1,u:'m/s',d:1}],
  cols:[{k:'A1',l:'A₁',u:'m',d:1},{k:'A2',l:'A₂',u:'m',d:1},{k:'ph',l:'위상차',u:'°',d:0},{k:'Am',l:'합성파의 최대 변위',u:'m',d:2}], gx:'ph', gy:'Am', join:true,
  reset:function(){ S.t=0; }, step:function(dt){ S.t+=dt; },
  maxSum:function(){ var p=this.p, m=0; for(var i=0;i<=200;i++){ var x=10*i/200; m=Math.max(m,Math.abs(y1(p,x,S.t)+y2(p,x,S.t))); } return m; },
  draw:function(g,W,Hh){ var p=this.p, ym=Math.max(1,p.A1+p.A2)*1.15, h3=(Hh-16)/3, items=[[y1,C.blu,'파동 1',0],[y2,C.red,'파동 2',1],[function(pp,x,t){ return y1(pp,x,t)+y2(pp,x,t); },C.fry,'합성파',2]];
    items.forEach(function(it){ var r={l:44,t:8+it[3]*h3+16,w:W-58,h:h3-30}, v=H.view(r,0,10,-ym,ym); H.axes(g,v,{box:true,xl:it[3]===2?'x (m)':'',ys:Math.max(1,Math.round(H.nice(2*ym,2)))});
      var pts=[]; for(var i=0;i<=160;i++){ var x=10*i/160; pts.push([v.sx(x),v.sy(it[0](p,x,S.t))]); } g.save(); g.beginPath(); g.rect(r.l,r.t,r.w,r.h); g.clip(); H.line(g,pts,it[1],it[3]===2?3:2); g.restore();
      H.text(g,T(it[2]),r.l+4,r.t-9,{size:12.5,w:700,c:it[1]}); }); },
  read:function(){ var p=this.p; return [['합성파의 최대 변위 (지금)',num(this.maxSum(),2),'m','hl'],['가능한 가장 큰 진폭 A₁ + A₂',num(p.A1+p.A2,2),'m','th'],['가능한 가장 작은 진폭 |A₁ − A₂|',num(Math.abs(p.A1-p.A2),2),'m','th'],
    ['종류',p.dir===-1&&p.L1===p.L2&&p.A1===p.A2?'정상파':p.L1===p.L2&&p.dir===1?(p.ph%360===0?'보강 간섭':p.ph===180&&p.A1===p.A2?'상쇄 간섭':'위상차에 따라 달라요'):'파장이 달라 맥놀이가 생겨요','','wide']]; },
  record:function(){ var p=this.p; return {A1:p.A1,A2:p.A2,ph:p.ph,Am:this.maxSum()}; },
  ai:function(){ var p=this.p; return 'Superposition of two sine waves, speed '+p.v+' m/s. Wave 1: amplitude '+p.A1+' m, wavelength '+p.L1+' m. Wave 2: amplitude '+p.A2+' m, wavelength '+p.L2+' m, phase '+p.ph+' degrees, travelling '+(p.dir===1?'in the same direction':'in the opposite direction')+'. Current largest displacement of the sum: '+fmt(this.maxSum(),2)+' m.'; }
};
LAB.add(E);
})();

/* ===================== 10. 힘과 운동 (middle 3) ===================== */
(function(){
var G=9.8, S={x:0,v:0,t:0,hist:[]}, LEN=20;
function fr(p){ var mk=Math.min(p.muk,p.mus); return {fs:p.mus*p.m*G, fk:mk*p.m*G}; }
function accel(p,moving){ var f=fr(p); if(!moving&&p.F<=f.fs) return 0; return (p.F-f.fk)/p.m; }
var E={id:'force', cat:'sci', icon:'📦', name:'힘과 운동 (F = ma)', desc:'당기는 힘, 질량, 마찰이 가속도에 미치는 영향',
  info:'물체에 작용하는 알짜힘 F는 질량 m과 가속도 a의 곱이에요(F = ma). 바닥에서 미는 힘이 최대 정지 마찰력(μₛmg)보다 작으면 물체는 움직이지 않고, 그보다 크면 운동 마찰력(μₖmg)을 뺀 알짜힘만큼 가속돼요.',
  tries:['힘을 조금씩 키워 물체가 처음 움직이는 순간의 힘을 찾아보세요','같은 힘으로 질량만 2배로 하면 가속도는 어떻게 되나요?','힘을 바꿔 가며 기록하고 가로 F, 세로 a 그래프의 기울기로 질량을 구해 보세요','마찰 계수를 0으로 하면 가속도는 얼마인가요?'],
  speed:true,
  params:[{id:'m',l:'물체의 질량 m',min:0.5,max:20,step:0.5,val:5,u:'kg',d:1},{id:'F',l:'미는 힘 F',min:0,max:100,step:1,val:30,u:'N'},
    {id:'mus',l:'정지 마찰 계수 μₛ',min:0,max:1,step:0.01,val:0.4,d:2},{id:'muk',l:'운동 마찰 계수 μₖ',min:0,max:1,step:0.01,val:0.3,d:2}],
  cols:[{k:'m',l:'질량 m',u:'kg',d:1},{k:'F',l:'힘 F',u:'N',d:1},{k:'a',l:'가속도 a',u:'m/s²',d:3}], gx:'F', gy:'a', fit:true,
  fitHint:function(m,b,x,y){ if(x==='F'&&y==='a'&&m>0) return F('기울기 = 1/m 이므로 m ≈ {0} kg',fmt(1/m,2)); },
  reset:function(){ S.x=0; S.v=0; S.t=0; S.hist=[[0,0]]; }, change:function(){ if(S.v===0) S.x=Math.min(S.x,LEN); },
  step:function(dt){ var p=this.p, n=Math.ceil(dt/0.01), h=dt/n; for(var i=0;i<n;i++){ var a=accel(p,S.v>0); S.v+=a*h; if(S.v<0) S.v=0; S.x+=S.v*h; S.t+=h; }
    if(S.t-(S.hist[S.hist.length-1][0])>=0.05) S.hist.push([S.t,S.v]); if(S.hist.length>1500) S.hist.splice(0,300); if(S.x>=LEN){ S.x=LEN; return 'done'; } },
  draw:function(g,W,Hh){ var p=this.p, f=fr(p), sh=Hh*0.6, fy=sh*0.72, x0=24, x1=W-24, a=accel(p,S.v>0), static_=S.v===0&&p.F<=f.fs;
    H.seg(g,x0-10,fy,x1+10,fy,TH.dim,3); for(var m=0;m<=LEN;m+=5){ var X=x0+(x1-x0)*m/LEN; H.seg(g,X,fy,X,fy+6,TH.dim,1.5); H.text(g,m+' m',X,fy+18,{al:'center',size:11,c:TH.dim}); }
    var bs=26+Math.sqrt(p.m)*8, bx=x0+(x1-x0)*S.x/LEN; g.fillStyle=C.blu; H.rrect(g,bx-bs/2,fy-bs,bs,bs,5); g.fill(); H.text(g,p.m+' kg',bx,fy-bs/2,{al:'center',size:12,w:700,c:'#fff'});
    var sc=Math.min(2.2,(W*0.3)/120), cy=fy-bs/2;
    if(p.F>0) H.arrow(g,bx-bs/2-2-p.F*sc*0.9,cy,bx-bs/2-2,cy,C.fry,3.5,10), 0;
    var fricF=static_?Math.min(p.F,f.fs):f.fk; if(fricF>0) H.arrow(g,bx+bs/2+2+fricF*sc*0.9,cy+10,bx+bs/2+2,cy+10,C.red,3.5,10);
    if(p.F>0) tag(g,'F = '+num(p.F,0)+' N',bx-bs/2-8-p.F*sc*0.9,cy-16,C.fry); if(fricF>0) tag(g,(static_?T('정지 마찰력'):T('운동 마찰력'))+' '+num(fricF,1)+' N',bx+bs/2+8,cy+28,C.red);
    H.text(g,static_?T('움직이지 않아요 (정지 마찰력이 힘과 같아요)'):'a = '+num(a,2)+' m/s²',12,16,{size:13,w:700,c:static_?TH.dim:C.grn});
    var r={l:46,t:sh+22,w:W-62,h:Hh-sh-52}; H.trace(g,r,S.hist,Math.max(5,S.t),0,Math.max(2,Math.abs(a)*5,S.v*1.2),C.cyan,{xl:'t (s)',yl:'v (m/s)'}); },
  read:function(){ var p=this.p, f=fr(p), a=accel(p,S.v>0); return [['최대 정지 마찰력 μₛmg',num(f.fs,1),'N'],['운동 마찰력 μₖmg',num(f.fk,1),'N'],['알짜힘',num(S.v===0&&p.F<=f.fs?0:p.F-f.fk,1),'N','hl'],['가속도 a',num(a,2),'m/s²','hl'],['속도 v',num(S.v,2),'m/s'],['위치 x',num(S.x,2),'m'],['시간 t',num(S.t,2),'s']]; },
  record:function(){ var p=this.p; return {m:p.m, F:p.F, a:accel(p,false)}; },
  ai:function(){ var p=this.p, f=fr(p); return 'Block of mass '+p.m+' kg pushed by a constant force F = '+p.F+' N on a rough floor (mu_s '+p.mus+', mu_k '+p.muk+', g 9.8). Max static friction '+fmt(f.fs,1)+' N, kinetic friction '+fmt(f.fk,1)+' N. Acceleration now '+fmt(accel(p,S.v>0),2)+' m/s^2, v = '+fmt(S.v,2)+' m/s.'; }
};
LAB.add(E);
})();

/* ===================== 11. 개체군 변화 (high 1 ecology) ===================== */
(function(){
var S={t:0,x:10,y:20,hist:[]};
function deriv(p){ return function(u){ var x=u[0], y=u[1];
  if(p.model==='exp') return [p.r*x,0]; if(p.model==='log') return [p.r*x*(1-x/p.K),0];
  return [p.r*x*(1-x/p.K)-p.b*x*y, p.e*p.b*x*y-p.m*y]; }; }
var E={id:'pop', cat:'sci', icon:'🦌', name:'개체군과 생태계', desc:'환경 수용력과 포식자-피식자 관계에 따른 개체 수 변화',
  info:'먹이와 공간이 충분하면 개체 수는 지수적으로 늘어나지만, 실제 환경에는 한계가 있어요. 환경이 수용할 수 있는 최대 개체 수를 환경 수용력(K)이라 하고, 개체 수가 K에 가까워지면 증가가 느려져 S자 곡선이 돼요. 포식자와 피식자의 수는 서로 영향을 주며 오르내리는 주기를 보여요.',
  tries:['지수 성장과 로지스틱 성장의 그래프를 비교해 보세요','환경 수용력 K를 바꾸면 개체 수가 어디에서 멈추나요?','증가율 r을 키우면 K에 도달하는 시간이 어떻게 달라지나요?','포식자-피식자 모드에서 포식자의 수가 먹이의 수보다 늦게 오르내리는지 보세요'],
  autoRun:true, speed:true,
  params:[{id:'model',l:'모형',type:'seg',opts:[['log','로지스틱 성장'],['exp','지수 성장'],['pp','포식자-피식자']],val:'log'},
    {id:'x0',l:'처음 개체 수 (먹이)',min:1,max:200,step:1,val:10},{id:'r',l:'증가율 r',min:0.05,max:1,step:0.01,val:0.3,d:2},
    {id:'K',l:'환경 수용력 K',min:100,max:2000,step:50,val:800,show:function(p){ return p.model!=='exp'; }},
    {id:'y0',l:'처음 포식자 수',min:1,max:100,step:1,val:20,show:function(p){ return p.model==='pp'; }},
    {id:'b',l:'포식률 (잡아먹는 정도)',min:0.0005,max:0.01,step:0.0005,val:0.002,d:4,show:function(p){ return p.model==='pp'; }},
    {id:'e',l:'먹이가 새끼로 바뀌는 비율',min:0.05,max:1,step:0.05,val:0.5,d:2,show:function(p){ return p.model==='pp'; }},
    {id:'m',l:'포식자의 사망률',min:0.05,max:1,step:0.05,val:0.4,d:2,show:function(p){ return p.model==='pp'; }},
    txt('xl','가로축 이름','시간',12),txt('yl','세로축 이름','개체 수',12)],
  cols:[{k:'t',l:'시간',d:1},{k:'N',l:'개체 수',d:1},{k:'r',l:'증가율 r',d:2},{k:'K',l:'환경 수용력 K',d:0}], gx:'t', gy:'N', join:true,
  reset:function(){ var p=this.p; S.t=0; S.x=p.x0; S.y=p.y0; S.hist=[[0,S.x,S.y]]; }, change:function(k){ if(k!=='xl'&&k!=='yl') this.reset(); },
  step:function(dt){ var p=this.p, T0=dt*5, n=Math.max(1,Math.ceil(T0/0.02)), h=T0/n, u=[S.x,S.y], fn=deriv(p);
    for(var i=0;i<n;i++){ u=H.rk4(u,fn,h); S.t+=h; if(u[0]<0) u[0]=0; if(u[1]<0) u[1]=0; }
    S.x=u[0]; S.y=u[1]; var last=S.hist[S.hist.length-1]; if(S.t-last[0]>=0.25) S.hist.push([S.t,S.x,S.y]); if(S.hist.length>3000) S.hist.splice(0,600);
    if(S.x>1e7||S.t>=300) return 'done'; },
  draw:function(g,W,Hh){ var p=this.p, h=S.hist, tm=Math.max(40,S.t*1.05), ym=1;
    h.forEach(function(q){ ym=Math.max(ym,q[1],p.model==='pp'?q[2]:0); }); if(p.model!=='exp') ym=Math.max(ym,p.K*(p.model==='pp'?1:1.05)); ym*=1.1;
    var r={l:52,t:20,w:W-68,h:Hh-68}, v=H.view(r,0,tm,0,ym); H.axes(g,v,{box:true,xl:p.xl,yl:p.yl});
    if(p.model!=='exp'){ H.seg(g,r.l,v.sy(p.K),r.l+r.w,v.sy(p.K),C.vio,1.5,[6,5]); tag(g,'K = '+num(p.K,0),r.l+r.w-6,v.sy(p.K)-12,C.vio,'right'); }
    g.save(); g.beginPath(); g.rect(r.l,r.t,r.w,r.h); g.clip(); H.line(g,h.map(function(q){ return [v.sx(q[0]),v.sy(q[1])]; }),C.grn,2.6);
    if(p.model==='pp') H.line(g,h.map(function(q){ return [v.sx(q[0]),v.sy(q[2])]; }),C.red,2.6); g.restore();
    H.dot(g,v.sx(S.t),v.sy(S.x),5,C.grn,TH.stage); if(p.model==='pp'){ H.dot(g,v.sx(S.t),v.sy(S.y),5,C.red,TH.stage); tag(g,T('먹이'),r.l+8,r.t+12,C.grn); tag(g,T('포식자'),r.l+56,r.t+12,C.red); } },
  read:function(){ var p=this.p, d=deriv(p)([S.x,S.y]), r=[['시간',num(S.t,1),''],[p.model==='pp'?'먹이의 수':'개체 수',num(S.x,1),'','hl']];
    if(p.model==='pp') r.push(['포식자의 수',num(S.y,1),'','hl']); r.push(['지금 늘어나는 속도',num(d[0],2),'/시간']); if(p.model==='log') r.push(['가장 빨리 느는 개체 수 K/2',num(p.K/2,0),'','th']);
    if(p.model==='pp') r.push(['균형에 가까운 먹이 수 m/(eb)',num(p.m/(p.e*p.b),0),'','th']); return r; },
  record:function(){ var p=this.p; return {t:S.t, N:S.x, r:p.r, K:p.model==='exp'?null:p.K}; },
  ai:function(){ var p=this.p; return 'Population model: '+(p.model==='log'?'logistic growth':p.model==='exp'?'exponential growth':'predator-prey (Lotka-Volterra with a carrying capacity for the prey)')+'. Start '+p.x0+', growth rate r = '+p.r+(p.model!=='exp'?', carrying capacity K = '+p.K:'')+(p.model==='pp'?', predators start '+p.y0+', predation '+p.b+', conversion '+p.e+', predator death '+p.m:'')+'. At t = '+fmt(S.t,1)+': '+fmt(S.x,1)+(p.model==='pp'?' prey, '+fmt(S.y,1)+' predators':' individuals')+'.'; }
};
LAB.add(E);
})();

/* ===================== 12. 화학 반응과 질량 보존 (middle 3) ===================== */
(function(){
var AT={H:['#e8eefc',6],O:['#ff5a5a',8],N:['#4f9dff',8],C:['#8b93a6',8],Mg:['#3fe08f',9]};
var SP={H2:{f:'H₂',m:2,at:[['H',-6,0],['H',6,0]]},O2:{f:'O₂',m:32,at:[['O',-7,0],['O',7,0]]},H2O:{f:'H₂O',m:18,at:[['O',0,-3],['H',-9,5],['H',9,5]]},
  N2:{f:'N₂',m:28,at:[['N',-7,0],['N',7,0]]},NH3:{f:'NH₃',m:17,at:[['N',0,-4],['H',-10,5],['H',10,5],['H',0,10]]},CH4:{f:'CH₄',m:16,at:[['C',0,0],['H',-10,-9],['H',10,-9],['H',-10,9],['H',10,9]]},
  CO2:{f:'CO₂',m:44,at:[['O',-14,0],['C',0,0],['O',14,0]]},Mg:{f:'Mg',m:24,at:[['Mg',0,0]]},MgO:{f:'MgO',m:40,at:[['Mg',-7,0],['O',7,0]]}};
var RX={h2o:{A:['H2',2],B:['O2',1],P:[['H2O',2]]},nh3:{A:['N2',1],B:['H2',3],P:[['NH3',2]]},ch4:{A:['CH4',1],B:['O2',2],P:[['CO2',1],['H2O',2]]},mg:{A:['Mg',2],B:['O2',1],P:[['MgO',2]]}};
function co(n){ return n===1?'':String(n); }
function eqS(rx){ return co(rx.A[1])+SP[rx.A[0]].f+' + '+co(rx.B[1])+SP[rx.B[0]].f+' → '+rx.P.map(function(q){ return co(q[1])+SP[q[0]].f; }).join(' + '); }
function calc(p){ var rx=RX[p.rx], k=Math.min(Math.floor(p.nA/rx.A[1]),Math.floor(p.nB/rx.B[1])), la=p.nA-k*rx.A[1], lb=p.nB-k*rx.B[1];
  var mb=p.nA*SP[rx.A[0]].m+p.nB*SP[rx.B[0]].m, ma=la*SP[rx.A[0]].m+lb*SP[rx.B[0]].m; rx.P.forEach(function(q){ ma+=k*q[1]*SP[q[0]].m; });
  return {rx:rx,k:k,la:la,lb:lb,mb:mb,ma:ma}; }
function box(g,r,list,label){ if(r.h<30||r.w<30) return; g.strokeStyle=TH.dim; g.globalAlpha=.5; g.lineWidth=1.5; H.rrect(g,r.l,r.t,r.w,r.h,10); g.stroke(); g.globalAlpha=1; H.text(g,label,r.l+10,r.t+12,{size:12,w:700,c:TH.dim});
  var n=list.length; if(!n) return; var top=r.t+24, w=r.w-12, h=r.h-30, cs=Math.min(50,Math.floor(Math.sqrt(w*h/n)));
  while(cs>14&&Math.floor(w/cs)*Math.floor(h/cs)<n) cs--; var cols=Math.max(1,Math.floor(w/cs));
  list.forEach(function(it,i){ var cx=r.l+6+(i%cols+0.5)*cs, cy=top+(Math.floor(i/cols)+0.5)*cs, s=cs/42; g.globalAlpha=it.dim?0.55:1;
    SP[it.sp].at.forEach(function(a){ var d=AT[a[0]]; H.dot(g,cx+a[1]*s,cy+a[2]*s,d[1]*s,d[0],TH.light?'rgba(0,0,0,.25)':'rgba(255,255,255,.2)'); }); g.globalAlpha=1; }); }
var E={id:'react', cat:'sci', icon:'⚗️', name:'화학 반응과 질량 보존', desc:'반응물의 개수에 따라 생성물과 남는 물질 알아보기',
  info:'화학 반응에서는 원자의 종류와 개수가 변하지 않아서, 반응 전후의 전체 질량이 같아요(질량 보존 법칙). 반응물이 정해진 비율로 반응하기 때문에 한쪽이 먼저 떨어지고, 그 물질이 반응의 양을 정하는 한계 반응물이에요. 남은 쪽 반응물은 반응하지 않고 그대로 남아요.',
  tries:['2H₂ + O₂ → 2H₂O에서 H₂ 6개, O₂ 4개로 반응시키면 무엇이 남나요?','남는 물질 없이 딱 맞게 반응하는 개수를 찾아보세요','반응 전후의 질량이 같은지 읽어 보세요','반응을 바꿔 보며 계수 비가 개수 비와 같은지 확인해 보세요'],
  noPlay:true,
  params:[{id:'rx',l:'반응',type:'seg',opts:[['h2o','수소 + 산소'],['nh3','질소 + 수소'],['ch4','메테인 + 산소'],['mg','마그네슘 + 산소']],val:'h2o'},
    {id:'nA',l:'앞의 반응물 개수',min:0,max:20,step:1,val:6},{id:'nB',l:'뒤의 반응물 개수',min:0,max:20,step:1,val:4}],
  cols:[{k:'nA',l:'앞의 반응물',d:0},{k:'nB',l:'뒤의 반응물',d:0},{k:'k',l:'반응 횟수',d:0},{k:'m',l:'전체 질량',u:'u',d:0}], gx:'nA', gy:'k',
  reset:function(){},
  draw:function(g,W,Hh){ var p=this.p, c=calc(p), rx=c.rx, ah=Hh*0.4, r1={l:8,t:34,w:W-16,h:ah}, r2={l:8,t:34+ah+34,w:W-16,h:Hh-(34+ah+34)-8};
    H.text(g,eqS(rx),W/2,16,{al:'center',size:Math.min(17,W/18),w:800,c:C.fry});
    var before=[], after=[]; for(var i=0;i<p.nA;i++) before.push({sp:rx.A[0]}); for(var j=0;j<p.nB;j++) before.push({sp:rx.B[0]});
    rx.P.forEach(function(q){ for(var i=0;i<c.k*q[1];i++) after.push({sp:q[0]}); }); for(var i2=0;i2<c.la;i2++) after.push({sp:rx.A[0],dim:true}); for(var j2=0;j2<c.lb;j2++) after.push({sp:rx.B[0],dim:true});
    box(g,r1,before,T('반응 전')+' · '+p.nA+SP[rx.A[0]].f+' + '+p.nB+SP[rx.B[0]].f);
    H.arrow(g,W/2,r1.t+r1.h+6,W/2,r2.t-6,C.fry,3,10); H.text(g,'k = '+c.k,W/2+14,r1.t+r1.h+17,{size:12.5,w:700,c:C.fry});
    box(g,r2,after,T('반응 후')+(c.la+c.lb?' · '+T('흐린 것은 남은 반응물'):'')); },
  read:function(){ var p=this.p, c=calc(p), rx=c.rx, lim=c.la>0&&c.lb===0&&p.nB>0?SP[rx.B[0]].f:c.lb>0&&c.la===0&&p.nA>0?SP[rx.A[0]].f:(c.la===0&&c.lb===0?'딱 맞게 반응해요':'—');
    return [['반응한 횟수',String(c.k),'번','hl'],[F('남는 {0}',SP[rx.A[0]].f),String(c.la),'개'],[F('남는 {0}',SP[rx.B[0]].f),String(c.lb),'개'],['한계 반응물',lim,'','th'],['반응 전 전체 질량',String(c.mb),'u'],['반응 후 전체 질량',String(c.ma),'u','ok']]; },
  record:function(){ var p=this.p, c=calc(p); return {nA:p.nA, nB:p.nB, k:c.k, m:c.mb}; },
  ai:function(){ var p=this.p, c=calc(p); return 'Chemical reaction counting model: '+eqS(c.rx)+'. Starting molecules/atoms: '+p.nA+' of '+SP[c.rx.A[0]].f+' and '+p.nB+' of '+SP[c.rx.B[0]].f+'. The reaction runs '+c.k+' times; leftover '+c.la+' and '+c.lb+'. Total mass before '+c.mb+' u and after '+c.ma+' u (conserved).'; }
};
LAB.add(E);
})();
})();
