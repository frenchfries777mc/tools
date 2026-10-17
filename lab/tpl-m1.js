/* Fry Lab templates for middle school math (grades 7-9), set 1: new experiments for every middle school math unit of curriculum.js.
   Same object format as templates.js (fields are listed at the top of app.js); ids start with m1_. Every Korean UI string goes through T/F and
   has en, es, fr, de, ja translations in the FFT.add blocks inside this file. The units are linked at the end with LABCUR.link. */
(function(){
'use strict';
var H=LAB.H, C=H.C, TH=H.TH, fmt=H.fmt, T=FFT.T, F=FFT.F, PI=Math.PI, TAU=PI*2, D2R=PI/180;
var MINUS='−', TIMES='×';

function num(v,d){ var s=fmt(v,d==null?2:d); if(s.indexOf('.')>=0) s=s.replace(/0+$/,'').replace(/\.$/,''); return s.replace('-',MINUS); }
function R4(W,Hh,m){ m=m==null?6:m; return {l:m,t:m,w:Math.max(10,W-2*m),h:Math.max(10,Hh-2*m)}; }
function tag(g,s,x,y,c,al){ H.text(g,s,x,y,{size:12.5,w:700,c:c||TH.text,al:al||'left',bg:TH.light?'rgba(255,255,255,.8)':'rgba(11,13,19,.75)'}); }
function txt(id,l,val,max){ return {id:id,l:l,type:'text',val:val,max:max||14}; }
function msg(g,W,Hh,a,b){ H.text(g,T(a),W/2,Hh/2-(b?10:0),{al:'center',c:C.red,size:15,w:700}); if(b) H.text(g,T(b),W/2,Hh/2+16,{al:'center',c:TH.dim,size:13}); }
function polyPx(g,pts,fill,stroke,lw){ g.beginPath(); pts.forEach(function(p,i){ if(i) g.lineTo(p[0],p[1]); else g.moveTo(p[0],p[1]); }); g.closePath();
  if(fill){ g.fillStyle=fill; g.fill(); } if(stroke){ g.strokeStyle=stroke; g.lineWidth=lw||2; g.stroke(); } }
/* arc in math orientation (counterclockwise on screen) from angle a0 to a1 (radians, y axis up) */
function arcM(g,x,y,r,a0,a1,col,w){ g.beginPath(); g.arc(x,y,r,-a0,-a1,true); g.strokeStyle=col; g.lineWidth=w||2; g.stroke(); }
function wedge(g,x,y,r,a0,a1,fill,stroke){ g.beginPath(); g.moveTo(x,y); g.arc(x,y,r,-a0,-a1,true); g.closePath(); if(fill){ g.fillStyle=fill; g.fill(); } if(stroke){ g.strokeStyle=stroke; g.lineWidth=1.5; g.stroke(); } }
function rightMark(g,x,y,ux,uy,vx,vy,s,col){ g.beginPath(); g.moveTo(x+ux*s,y+uy*s); g.lineTo(x+(ux+vx)*s,y+(uy+vy)*s); g.lineTo(x+vx*s,y+vy*s); g.strokeStyle=col; g.lineWidth=1.8; g.stroke(); }
function gcd(a,b){ a=Math.abs(a); b=Math.abs(b); while(b){ var t=a%b; a=b; b=t; } return a; }
function gauss(){ return Math.sqrt(-2*Math.log(1-Math.random()))*Math.cos(TAU*Math.random()); }
function erf(x){ var s=x<0?-1:1; x=Math.abs(x); var t=1/(1+0.3275911*x); return s*(1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x)); }
function cdf(z){ return 0.5*(1+erf(z/Math.SQRT2)); }
function parseList(s,max){ return String(s).split(/[\s,;]+/).map(parseFloat).filter(isFinite).slice(0,max||300); }
function sup(e){ return String(e).replace(/\d/g,function(d){ return '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]; }); }
function fac(n){ var r=[]; for(var p=2;p*p<=n;p++){ var e=0; while(n%p===0){ n/=p; e++; } if(e) r.push([p,e]); } if(n>1) r.push([n,1]); return r; }
function facStr(f){ return f.map(function(q){ return q[0]+(q[1]>1?sup(q[1]):''); }).join(' '+TIMES+' '); }
/* line a x + b y = c across a view */
function lineABC(g,v,a,b,c,col,w){ if(Math.abs(a)<1e-12&&Math.abs(b)<1e-12) return;
  var p1,p2; if(Math.abs(b)>=Math.abs(a)){ p1=[v.x0-1,(c-a*(v.x0-1))/b]; p2=[v.x1+1,(c-a*(v.x1+1))/b]; } else { p1=[(c-b*(v.y0-1))/a,v.y0-1]; p2=[(c-b*(v.y1+1))/a,v.y1+1]; }
  g.save(); g.beginPath(); g.rect(v.l,v.t,v.w,v.h); g.clip(); H.seg(g,v.sx(p1[0]),v.sy(p1[1]),v.sx(p2[0]),v.sy(p2[1]),col,w||3); g.restore(); }
function fnPlot(g,v,f,col,w,dash){ var pts=[], n=Math.ceil(v.w/2); g.save(); g.beginPath(); g.rect(v.l,v.t,v.w,v.h); g.clip();
  for(var i=0;i<=n;i++){ var x=v.x0+(v.x1-v.x0)*i/n, y=f(x); if(isFinite(y)&&Math.abs(y)<1e6) pts.push([v.sx(x),v.sy(y)]); else { H.line(g,pts,col,w,dash); pts=[]; } }
  H.line(g,pts,col,w,dash); g.restore(); }
/* a term list -> "3x + 4" */
function lin(a,b,x){ var s=''; if(Math.abs(a)>1e-12){ s=(Math.abs(a-1)<1e-12?'':Math.abs(a+1)<1e-12?MINUS:num(a,2))+x; }
  if(Math.abs(b)>1e-12||!s){ if(!s) return num(b,2); s+=(b<0?' '+MINUS+' ':' + ')+num(Math.abs(b),2); } return s; }

/* ===================== 중1 좌표평면: 점 찍기 ===================== */
(function(){
var S={v:null};
function quad(x,y){ return x===0||y===0?0:x>0&&y>0?1:x<0&&y>0?2:x<0&&y<0?3:4; }
function mir(p){ return p.mir==='x'?[p.x,-p.y]:p.mir==='y'?[-p.x,p.y]:p.mir==='o'?[-p.x,-p.y]:null; }
LAB.add({id:'m1_pts', cat:'math', icon:'📍', name:'좌표평면에서 점 찍기', desc:'순서쌍으로 점의 위치와 사분면, 대칭점 알기',
  info:'좌표평면은 x축과 y축으로 나뉜 네 부분(사분면)으로 이루어져 있어요. 점 P(x, y)는 x축 방향으로 x, y축 방향으로 y만큼 간 곳이에요. x와 y의 부호에 따라 제1사분면(+, +), 제2사분면(−, +), 제3사분면(−, −), 제4사분면(+, −)이 정해져요. x축에 대칭이면 y의 부호만, y축에 대칭이면 x의 부호만, 원점에 대칭이면 둘 다 바뀌어요.',
  tries:['점 P를 네 사분면으로 차례로 옮기고 x, y의 부호를 비교해 보세요','대칭점을 켜고 x축, y축, 원점 대칭일 때 좌표가 어떻게 바뀌는지 보세요','x나 y를 0으로 하면 점이 어디에 놓이나요?'],
  hint:'그래프를 눌러 끌면 점 P가 따라와요.', noPlay:true,
  params:[{id:'x',l:'x 좌표',min:-9,max:9,step:1,val:3,d:0},{id:'y',l:'y 좌표',min:-9,max:9,step:1,val:2,d:0},
    {id:'mir',l:'대칭점',type:'seg',opts:[['none','없음'],['x','x축 대칭'],['y','y축 대칭'],['o','원점 대칭']],val:'none'},{id:'rg',l:'보이는 범위',min:5,max:15,step:1,val:10,d:0}],
  cols:[{k:'x',l:'x',d:0},{k:'y',l:'y',d:0},{k:'q',l:'사분면',d:0},{k:'dist',l:'원점까지 거리',d:2}], gx:'x', gy:'y',
  reset:function(){},
  draw:function(g,W,Hh){ var p=this.p, r=R4(W,Hh), v=S.v=H.view(r,-p.rg,p.rg,-p.rg,p.rg,{equal:true}); H.axes(g,v,{xl:'x',yl:'y',xs:p.rg>10?2:1,ys:p.rg>10?2:1});
    var q=quad(p.x,p.y), cs=[[1,1],[-1,1],[-1,-1],[1,-1]], ix=Math.max(0,q-1);
    if(q){ g.fillStyle='rgba(255,201,60,.08)'; g.fillRect(cs[ix][0]>0?v.sx(0):v.l, cs[ix][1]>0?v.t:v.sy(0), cs[ix][0]>0?v.l+v.w-v.sx(0):v.sx(0)-v.l, cs[ix][1]>0?v.sy(0)-v.t:v.t+v.h-v.sy(0)); }
    [[1,1],[2,-1],[3,-1],[4,1]].forEach(function(z,i){ var c2=cs[i]; H.text(g,F('제{0}사분면',i+1),v.sx(0)+c2[0]*(v.w/4)*0.9,v.sy(0)-c2[1]*(v.h/4)*0.9,{al:'center',c:TH.dim,size:12}); });
    var m=mir(p), px=v.sx(p.x), py=v.sy(p.y);
    if(m){ var mx=v.sx(m[0]), my=v.sy(m[1]); H.seg(g,px,py,mx,my,C.vio,2,[5,4]); H.dot(g,mx,my,6,C.vio,TH.stage); tag(g,"P′("+num(m[0],0)+', '+num(m[1],0)+')',mx+10,my-14,C.vio); }
    H.seg(g,px,py,px,v.sy(0),C.cyan,1.8,[5,4]); H.seg(g,px,py,v.sx(0),py,C.pink,1.8,[5,4]);
    H.dot(g,px,v.sy(0),4,C.cyan); H.dot(g,v.sx(0),py,4,C.pink); H.dot(g,px,py,7,C.or,TH.stage); tag(g,'P('+num(p.x,0)+', '+num(p.y,0)+')',px+10,py-14,C.or); },
  read:function(){ var p=this.p, q=quad(p.x,p.y), m=mir(p);
    var rows=[['점 P','('+num(p.x,0)+', '+num(p.y,0)+')','','hl'],['위치',q?F('제{0}사분면',q):'축 위','','ok'],['x의 부호',p.x>0?'+':p.x<0?MINUS:'0',''],['y의 부호',p.y>0?'+':p.y<0?MINUS:'0',''],['원점까지의 거리',num(Math.hypot(p.x,p.y),2),'']];
    if(m) rows.push(['대칭점 P′','('+num(m[0],0)+', '+num(m[1],0)+')','','wide']); return rows; },
  record:function(){ var p=this.p; return {x:p.x, y:p.y, q:quad(p.x,p.y), dist:Math.hypot(p.x,p.y)}; },
  ai:function(){ var p=this.p, m=mir(p); return 'Coordinate plane point P('+p.x+', '+p.y+'), quadrant '+(quad(p.x,p.y)||'on an axis')+', distance from origin '+fmt(Math.hypot(p.x,p.y),3)+'.'+(m?' Reflection P\' = ('+m[0]+', '+m[1]+').':''); },
  down:function(x,y){ return !!S.v&&this.move(x,y,null,true); },
  move:function(x,y,e,cap){ if(!cap||!S.v) return false; H.setP('x',Math.round(S.v.ix(x))); H.setP('y',Math.round(S.v.iy(y))); return true; }
});
})();

/* ===================== 중1 좌표평면: 이야기와 그래프 ===================== */
(function(){
var S={t:0, v:null};
function geo(p){ var T1=p.t1, T2=T1+p.rest, T3=T2+p.t2, s1=p.v1*T1, s3=s1+p.v2*p.t2; return {T1:T1,T2:T2,T3:T3,s1:s1,s3:s3}; }
function pos(p,t){ var k=geo(p); return t<=k.T1?p.v1*t:t<=k.T2?k.s1:k.s1+p.v2*(Math.min(t,k.T3)-k.T2); }
function vel(p,t){ var k=geo(p); return t<k.T1?p.v1:t<k.T2?0:t<k.T3?p.v2:0; }
function phase(p,t){ var k=geo(p); return t<k.T1?'첫 번째 구간':t<k.T2?'쉬는 중':t<k.T3?'두 번째 구간':'도착'; }
LAB.add({id:'m1_story', cat:'math', icon:'🚶', name:'이야기와 그래프', desc:'시간에 따라 변하는 위치를 그래프로 읽기',
  info:'집에서 출발한 사람의 위치를 시간에 따라 나타낸 그래프예요. 그래프가 올라가면 집에서 멀어지고, 수평이면 멈춰 있고, 내려가면 집으로 돌아오는 거예요. 그래프가 가파를수록 속력이 빨라요. 평균 속력은 전체 이동 거리를 걸린 시간으로 나눈 값이에요.',
  tries:['쉬는 시간을 0에서 10분까지 바꾸면 그래프에서 수평인 부분이 어떻게 달라지나요?','두 번째 구간의 속력을 음수로 하면 그래프가 어떻게 되고 사람은 어디로 가나요?','시작을 눌러 사람이 움직일 때 그래프의 점도 함께 보세요'],
  hint:'그래프를 눌러 끌면 시각을 고를 수 있어요.', speed:true, playLabel:'걷기 시작',
  params:[{id:'v1',l:'첫 구간의 속력',min:0,max:120,step:5,val:60,u:'m/분',d:0},{id:'t1',l:'첫 구간의 시간',min:1,max:10,step:1,val:4,u:'분',d:0},{id:'rest',l:'쉬는 시간',min:0,max:10,step:1,val:3,u:'분',d:0},
    {id:'v2',l:'두 번째 구간의 속력 (음수면 되돌아와요)',min:-100,max:150,step:5,val:90,u:'m/분',d:0},{id:'t2',l:'두 번째 구간의 시간',min:1,max:10,step:1,val:4,u:'분',d:0}],
  cols:[{k:'t',l:'시간 (분)',d:2},{k:'s',l:'집에서의 거리 (m)',d:1},{k:'v',l:'속력 (m/분)',d:1}], gx:'t', gy:'s',
  reset:function(){ S.t=0; }, onPlay:function(){ if(S.t>=geo(this.p).T3-1e-9) S.t=0; },
  change:function(){ S.t=Math.min(S.t,geo(this.p).T3); },
  step:function(dt){ var k=geo(this.p); S.t+=dt; if(S.t>=k.T3){ S.t=k.T3; return 'done'; } },
  draw:function(g,W,Hh){ var p=this.p, k=geo(p), r=R4(W,Hh,10), roadH=Math.min(70,Hh*0.2), road={l:r.l+14,t:r.t,w:r.w-28,h:roadH};
    var smin=Math.min(0,k.s1,k.s3), smax=Math.max(1,k.s1,k.s3), pad=(smax-smin)*0.12;
    var gr={l:r.l+40,t:r.t+roadH+34,w:r.w-52,h:Math.max(60,r.h-roadH-72)}, v=S.v=H.view(gr,0,k.T3,smin-pad,smax+pad);
    var sx=function(s){ return road.l+(s-smin)/(smax-smin)*road.w; };
    g.fillStyle=TH.light?'rgba(80,70,50,.08)':'rgba(138,147,166,.1)'; H.rrect(g,road.l-8,road.t+road.h/2-5,road.w+16,10,5); g.fill();
    H.text(g,T('집'),sx(0),road.t+road.h/2+22,{al:'center',c:TH.dim,size:12});
    [k.s1,k.s3].forEach(function(s,i){ H.seg(g,sx(s),road.t+road.h/2-10,sx(s),road.t+road.h/2+10,i?C.grn:C.blu,2); });
    var now=pos(p,S.t); H.dot(g,sx(now),road.t+road.h/2,9,C.or,TH.stage); H.text(g,'🚶',sx(now),road.t+road.h/2-24,{al:'center',size:18});
    H.axes(g,v,{box:true,xl:T('시간 (분)'),yl:T('집에서의 거리 (m)')});
    var seg=[[0,k.T1,C.blu],[k.T1,k.T2,C.dim||TH.dim],[k.T2,k.T3,C.grn]];
    seg.forEach(function(z){ if(z[1]>z[0]) H.seg(g,v.sx(z[0]),v.sy(pos(p,z[0])),v.sx(z[1]),v.sy(pos(p,z[1])),z[2],3.5); });
    H.seg(g,v.sx(S.t),v.t,v.sx(S.t),v.t+v.h,TH.dim,1,[4,4]); H.seg(g,v.l,v.sy(now),v.sx(S.t),v.sy(now),TH.dim,1,[4,4]);
    H.dot(g,v.sx(S.t),v.sy(now),6.5,C.or,TH.stage); tag(g,num(now,0)+' m',v.sx(S.t)+8,v.sy(now)-16,C.or); },
  read:function(){ var p=this.p, k=geo(p), dist=Math.abs(p.v1*p.t1)+Math.abs(p.v2*p.t2), T3=k.T3;
    return [['지금 시각',num(S.t,1),'분'],['집에서의 거리',num(pos(p,S.t),0),'m','hl'],['지금 속력 (기울기)',num(vel(p,S.t),0),'m/분'],['상태',phase(p,S.t),'','ok'],
      ['지금까지 간 거리 합',num(Math.abs(p.v1*Math.min(S.t,k.T1))+Math.abs(p.v2*Math.max(0,Math.min(S.t,k.T3)-k.T2)),0),'m'],['전체 평균 속력',num(dist/T3,1),'m/분','th']]; },
  record:function(){ var p=this.p; return {t:S.t, s:pos(p,S.t), v:vel(p,S.t)}; },
  ai:function(){ var p=this.p, k=geo(p); return 'Distance-time story graph: speed '+p.v1+' m/min for '+p.t1+' min, rest '+p.rest+' min, then speed '+p.v2+' m/min for '+p.t2+' min. End position '+k.s3+' m. At t = '+fmt(S.t,2)+' min position '+fmt(pos(p,S.t),1)+' m.'; },
  down:function(x){ return !!S.v&&this.move(x,0,null,true); },
  move:function(x,y,e,cap){ if(!cap||!S.v) return false; S.t=H.clamp(S.v.ix(x),0,geo(this.p).T3); H.run(false); return true; }
});
})();

/* ===================== 중1 자료의 정리: 줄기와 잎 그림 ===================== */
(function(){
function parse(p){ return parseList(p.data,200).map(Math.round).filter(function(x){ return x>=0&&x<1000; }); }
function info(p){ var d=parse(p); if(!d.length) return null; var s=d.slice().sort(function(a,b){ return a-b; }), n=s.length, st={}, mode=[], best=0, cnt={};
  s.forEach(function(x){ var k=Math.floor(x/10); (st[k]=st[k]||[]).push(x); cnt[x]=(cnt[x]||0)+1; if(cnt[x]>best) best=cnt[x]; });
  if(best>1) mode=Object.keys(cnt).filter(function(k){ return cnt[k]===best; }).map(Number);
  var lo=Math.floor(s[0]/10), hi=Math.floor(s[n-1]/10), maxc=0, bestStem=lo; for(var k=lo;k<=hi;k++){ var c=(st[k]||[]).length; if(c>maxc){ maxc=c; bestStem=k; } }
  return {d:d,s:s,n:n,st:st,lo:lo,hi:hi,maxc:maxc,bestStem:bestStem,med:n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2,mode:mode}; }
LAB.add({id:'m1_stem', cat:'math', icon:'🌿', name:'줄기와 잎 그림', desc:'자료를 줄기와 잎으로 나누어 분포 한눈에 보기',
  info:'줄기와 잎 그림은 각 자료를 앞부분(줄기)과 끝자리(잎)로 나누어 적은 그림이에요. 예를 들어 35는 줄기 3, 잎 5예요. 원래 자료의 값을 그대로 볼 수 있고, 옆으로 눕히면 막대그래프 모양이 되어 분포를 알 수 있어요. 잎이 많은 줄기가 자료가 많이 모인 곳이에요.',
  tries:['잎이 가장 많은 줄기는 어느 것이고, 그 줄기의 계급에 자료가 몇 개 있나요?','자료 하나를 아주 큰 값으로 바꾸면 그림이 어떻게 달라지나요?','무작위 자료를 만들어 분포의 모양(대칭인지 한쪽으로 치우쳤는지)을 말해 보세요'],
  hint:'아래 칸에 0 이상 999 이하의 자료를 쉼표로 구분해서 써 보세요.', noPlay:true,
  params:[txt('data','자료 (쉼표로 구분)','12, 15, 21, 23, 23, 27, 28, 31, 31, 34, 35, 35, 36, 42, 45, 48, 52',200),{id:'srt',l:'잎을 크기순으로 정리',type:'check',val:true}],
  actions:[['rnd','무작위 자료'],['out','큰 값 더하기']],
  act:function(k){ var st=info(this.p); if(k==='rnd'){ var a=[]; for(var i=0;i<24;i++) a.push(Math.max(0,Math.min(99,Math.round(48+14*gauss())))); H.setP('data',a.join(', ')); }
    else if(st) H.setP('data',(this.p.data.replace(/[\s,;]+$/,'')+', '+Math.min(999,st.s[st.n-1]+25)).slice(0,200)); },
  cols:[{k:'n',l:'자료의 개수',d:0},{k:'med',l:'중앙값',d:1},{k:'maxc',l:'가장 긴 잎의 개수',d:0}], gx:'n', gy:'maxc',
  reset:function(){},
  draw:function(g,W,Hh){ var p=this.p, st=info(p);
    if(!st){ H.text(g,T('0 이상 999 이하의 숫자 자료를 쉼표로 구분해서 써 주세요'),W/2,Hh/2,{al:'center',c:TH.dim,size:14}); return; }
    var rows=st.hi-st.lo+1; if(rows>36){ msg(g,W,Hh,'자료의 범위가 너무 넓어요','줄기가 36개 이하가 되도록 자료를 바꿔 주세요'); return; }
    var rh=Math.min(34,(Hh-84)/rows), top=44, x0=Math.max(30,W*0.08), sx=x0+44, fs=Math.max(11,Math.min(17,rh*0.6)), barX=Math.min(W-90,sx+Math.max(...[1].concat(Object.keys(st.st).map(function(k){ return st.st[k].length; })))*fs*1.5+50);
    H.text(g,T('줄기'),x0+12,18,{al:'center',c:TH.dim,size:13,w:700}); H.text(g,T('잎'),sx+16,18,{al:'left',c:TH.dim,size:13,w:700}); H.text(g,T('잎의 개수'),barX,18,{al:'left',c:TH.dim,size:13,w:700});
    H.seg(g,sx-6,34,sx-6,top+rows*rh,TH.text,2);
    for(var k=st.lo;k<=st.hi;k++){ var y=top+(k-st.lo+0.5)*rh, lv=(st.st[k]||[]).map(function(x){ return x%10; }); if(!p.srt){ lv=parse(p).filter(function(x){ return Math.floor(x/10)===k; }).map(function(x){ return x%10; }); }
      H.text(g,String(k),x0+22,y,{al:'right',c:k===st.bestStem?C.fry:TH.text,size:fs+1,w:700}); H.text(g,lv.join('  '),sx,y,{c:C.blu,size:fs,w:600});
      var bw=lv.length/Math.max(1,st.maxc)*Math.max(40,W-barX-50); if(lv.length){ g.fillStyle=k===st.bestStem?'rgba(255,201,60,.8)':'rgba(79,157,255,.45)'; g.fillRect(barX,y-rh*0.3,bw,rh*0.6); H.text(g,String(lv.length),barX+bw+6,y,{c:TH.dim,size:12}); } }
    var ex=st.s[Math.floor(st.n/2)]; H.text(g,F('예) {0} | {1}  은  {2}',Math.floor(ex/10),ex%10,ex),W-10,Hh-12,{al:'right',c:TH.dim,size:12.5}); },
  read:function(){ var st=info(this.p); if(!st) return [['자료의 개수','0','']];
    return [['자료의 개수',String(st.n),'개'],['가장 작은 값',String(st.s[0]),''],['가장 큰 값',String(st.s[st.n-1]),''],['중앙값',num(st.med,1),''],['최빈값',st.mode.length?st.mode.join(', '):'없음',''],
      ['잎이 가장 많은 줄기',String(st.bestStem),'','hl'],['그 줄기의 잎의 개수',String(st.maxc),'개','ok']]; },
  record:function(){ var st=info(this.p); if(!st) return '자료를 먼저 써 주세요'; return {n:st.n, med:st.med, maxc:st.maxc}; },
  ai:function(){ var st=info(this.p); return 'Stem-and-leaf plot. Data: '+parse(this.p).join(', ')+'.'+(st?' n = '+st.n+', median '+st.med+', longest leaf row is stem '+st.bestStem+' with '+st.maxc+' leaves.':''); }
});
})();

/* ===================== 중1 자료의 정리: 상대도수와 큰 수의 법칙 ===================== */
(function(){
var S={cnt:[], n:0, acc:0, key:''};
function setup(p){ var bw=p.bw, b0=Math.floor((p.mu-4*p.sd)/bw)*bw, nb=Math.max(2,Math.ceil((p.mu+4*p.sd-b0)/bw)), tr=[];
  for(var i=0;i<nb;i++){ var lo=i===0?-Infinity:(b0+i*bw-p.mu)/p.sd, hi=i===nb-1?Infinity:(b0+(i+1)*bw-p.mu)/p.sd; tr.push((hi===Infinity?1:cdf(hi))-(lo===-Infinity?0:cdf(lo))); }
  return {b0:b0,nb:nb,tr:tr}; }
function reinit(p){ var o=setup(p); S.cnt=[]; for(var i=0;i<o.nb;i++) S.cnt.push(0); S.n=0; S.acc=0; S.key=[p.mu,p.sd,p.bw].join('|'); }
function add(p,k){ var o=setup(p); if(S.key!==[p.mu,p.sd,p.bw].join('|')) reinit(p); for(var i=0;i<k;i++){ var x=p.mu+p.sd*gauss(), j=H.clamp(Math.floor((x-o.b0)/p.bw),0,o.nb-1); S.cnt[j]++; S.n++; } }
function maxDiff(p){ var o=setup(p), m=0; if(!S.n) return 0; for(var i=0;i<o.nb;i++) m=Math.max(m,Math.abs(S.cnt[i]/S.n-o.tr[i])); return m; }
LAB.add({id:'m1_relfreq', cat:'math', icon:'📈', name:'상대도수의 안정', desc:'자료가 많아질수록 상대도수가 일정한 값에 가까워지는 모습',
  info:'상대도수는 (계급의 도수) ÷ (전체 도수)예요. 키처럼 어떤 모집단에서 자료를 하나씩 뽑아 계급별 상대도수를 구하면, 자료의 개수가 적을 때는 들쭉날쭉하지만 많아질수록 모집단의 비율에 가까워져요. 파란 점은 이론적인 비율이고, 노란 막대는 지금까지 뽑은 자료의 상대도수예요. 상대도수의 합은 항상 1이에요.',
  tries:['자료를 20개, 200개, 2000개 모았을 때 막대가 파란 점에 얼마나 가까워지는지 비교해 보세요','계급의 크기를 바꾸면 상대도수의 모양과 합이 어떻게 달라지나요?','표준편차를 크게 하면 그래프가 어떻게 퍼지나요?'],
  speed:true, playLabel:'자료 모으기',
  params:[{id:'mu',l:'평균 키',min:140,max:180,step:1,val:165,u:'cm',d:0},{id:'sd',l:'표준편차',min:2,max:15,step:0.5,val:6,u:'cm',d:1},{id:'bw',l:'계급의 크기',min:1,max:10,step:1,val:4,u:'cm',d:0},{id:'rate',l:'1초에 모으는 자료',min:1,max:400,step:1,val:30,d:0,pre:[[10,'10'],[100,'100'],[400,'400']]}],
  actions:[['a100','100개 더하기'],['a1000','1000개 더하기']],
  act:function(k){ add(this.p,k==='a100'?100:1000); },
  cols:[{k:'n',l:'자료의 개수',d:0},{k:'diff',l:'가장 큰 차이',d:4},{k:'sum',l:'상대도수의 합',d:3}], gx:'n', gy:'diff',
  reset:function(){ reinit(this.p); }, change:function(id){ if(id==='mu'||id==='sd'||id==='bw') reinit(this.p); },
  step:function(dt){ S.acc+=dt*this.p.rate; var k=Math.floor(S.acc); S.acc-=k; if(k>0) add(this.p,k); },
  draw:function(g,W,Hh){ var p=this.p, o=setup(p), r={l:48,t:24,w:W-64,h:Hh-72}, x1=o.b0+o.nb*p.bw, ym=0.02;
    for(var i=0;i<o.nb;i++) ym=Math.max(ym,o.tr[i]*1.2,S.n?S.cnt[i]/S.n*1.05:0); var v=H.view(r,o.b0,x1,0,ym);
    H.axes(g,v,{box:true,xl:T('키 (cm)'),yl:T('상대도수'),ys:H.nice(ym,5)});
    for(i=0;i<o.nb;i++){ var rel=S.n?S.cnt[i]/S.n:0, l=v.sx(o.b0+i*p.bw), w=v.sx(o.b0+(i+1)*p.bw)-l; g.fillStyle='rgba(255,201,60,.72)'; g.fillRect(l+1,v.sy(rel),w-2,v.sy(0)-v.sy(rel)); }
    var pts=o.tr.map(function(t,i){ return [v.sx(o.b0+(i+0.5)*p.bw),v.sy(t)]; }); H.line(g,pts,C.blu,2); pts.forEach(function(z){ H.dot(g,z[0],z[1],4,C.blu,TH.stage); });
    tag(g,F('자료 {0}개',S.n),r.l+8,r.t+12,C.fry); tag(g,T('이론적인 비율'),r.l+8,r.t+36,C.blu); },
  read:function(){ var o=setup(this.p), best=0, bi=0; S.cnt.forEach(function(c,i){ if(c>best){ best=c; bi=i; } }); var p=this.p;
    return [['자료의 개수',String(S.n),'개'],['상대도수의 합',S.n?num(S.cnt.reduce(function(a,b){ return a+b; },0)/S.n,3):'0',''],['가장 높은 계급',S.n?num(o.b0+bi*p.bw,0)+' ~ '+num(o.b0+(bi+1)*p.bw,0)+' cm':'—',''],
      ['그 계급의 상대도수',S.n?num(best/S.n,3):'—','','hl'],['이론적인 비율과 가장 큰 차이',num(maxDiff(p),4),'','ok']]; },
  record:function(){ return {n:S.n, diff:maxDiff(this.p), sum:S.n?1:0}; },
  ai:function(){ var p=this.p; return 'Relative frequency stabilises: heights ~ Normal(mean '+p.mu+', sd '+p.sd+'), class width '+p.bw+'. Samples so far '+S.n+', largest gap between observed and theoretical relative frequency '+fmt(maxDiff(p),4)+'.'; }
});
})();

/* ===================== 중1 소인수분해: 에라토스테네스의 체 ===================== */
(function(){
var S={mark:[], own:[], p:2, m:4, done:false, acc:0, marks:0};
var PAL=['#ff8a3d','#4f9dff','#3fe08f','#a78bfa','#ff7ab6','#38d1e0','#ffc93c','#ff6b6b'];
function reinit(p){ S.mark=[]; S.own=[]; for(var i=0;i<=p.N;i++){ S.mark.push(i<2?1:0); S.own.push(i<2?-1:0); } S.p=2; S.m=4; S.done=p.N<4; S.acc=0; S.marks=0; }
function tick(N){ if(S.done) return; if(S.m<=N){ if(!S.mark[S.m]){ S.mark[S.m]=1; S.own[S.m]=S.p; S.marks++; } S.m+=S.p; if(S.m<=N) return; }
  var q=S.p+1; while(q<=N&&S.mark[q]) q++; if(q*q>N||q>N){ S.done=true; S.p=q; return; } S.p=q; S.m=q*q; }
function primes(N){ var c=0; for(var i=2;i<=N;i++){ var ok=true; for(var d=2;d*d<=i;d++) if(i%d===0){ ok=false; break; } if(ok) c++; } return c; }
function left(){ var c=0; for(var i=2;i<S.mark.length;i++) if(!S.mark[i]) c++; return c; }
LAB.add({id:'m1_sieve', cat:'math', icon:'🔢', name:'에라토스테네스의 체', desc:'2부터 차례로 배수를 지워 소수만 남기기',
  info:'약 2200년 전 그리스의 에라토스테네스가 소수를 찾은 방법이에요. 1은 소수가 아니라서 먼저 지워요. 2는 소수이니 남기고 2의 배수를 모두 지워요. 다음으로 남은 3은 소수이니 3의 배수를 지워요. 이렇게 √N 이하의 소수까지 배수를 지우면 남은 수가 모두 소수예요. p의 배수는 p×p부터 지우면 돼요. 그보다 작은 배수는 이미 더 작은 소수의 배수로 지워졌기 때문이에요.',
  tries:['100까지의 수에서 소수는 모두 몇 개인지 세어 보세요','N을 100에서 200으로 늘리면 몇 번째 소수까지 배수를 지우면 되나요? (p×p가 N보다 커질 때까지)','한 단계씩 눌러 3의 배수 중 이미 지워진 것과 새로 지워지는 것을 구별해 보세요'],
  hint:'시작을 누르거나 한 단계 버튼으로 소수의 배수를 차례로 지워요.', playLabel:'체 거르기',
  params:[{id:'N',l:'어디까지 (N)',min:20,max:200,step:10,val:100,d:0,pre:[[50,'50'],[100,'100'],[200,'200']]},{id:'sp',l:'1초에 지우는 수',min:1,max:60,step:1,val:8,d:0}],
  actions:[['nx','소수 하나 지우기'],['all','끝까지']],
  act:function(k){ var N=this.p.N; if(S.done) return; if(k==='all'){ for(var i=0;i<2000&&!S.done;i++) tick(N); } else { var q=S.p; for(var j=0;j<400&&!S.done&&S.p===q;j++) tick(N); } },
  cols:[{k:'N',l:'N',d:0},{k:'cnt',l:'지금 남은 수',d:0},{k:'pr',l:'소수의 개수',d:0}], gx:'N', gy:'pr',
  reset:function(){ reinit(this.p); }, change:function(id){ if(id==='N') reinit(this.p); },
  onPlay:function(){ if(S.done) reinit(this.p); },
  step:function(dt){ S.acc+=dt*this.p.sp; while(S.acc>=1&&!S.done){ S.acc-=1; tick(this.p.N); } if(S.done) return 'done'; },
  draw:function(g,W,Hh){ var N=this.p.N, cols=5, best=0; for(var c=5;c<=26;c++){ var sz=Math.min((W-12)/c,(Hh-12)/Math.ceil(N/c)); if(sz>best+0.01){ best=sz; cols=c; } }
    var rows=Math.ceil(N/cols), cw=Math.floor((W-12)/cols), ch=Math.min(cw,Math.floor((Hh-12)/rows)); cw=ch=Math.min(cw,ch); var ox=(W-cols*cw)/2, oy=Math.max(6,(Hh-rows*ch)/2);
    for(var n=1;n<=N;n++){ var i=n-1, x=ox+(i%cols)*cw, y=oy+Math.floor(i/cols)*ch, mk=S.mark[n], isP=(!mk&&S.done)||(!mk&&n===S.p), cur=!S.done&&n===S.p;
      var col=mk?(S.own[n]<0?'rgba(138,147,166,.18)':PAL[(Math.log2(S.own[n]+0.001)|0)%PAL.length]):C.fry;
      g.fillStyle=cur?C.red:mk?col:S.done?'rgba(63,224,143,.85)':'rgba(255,201,60,.22)'; if(mk&&S.own[n]>=0) g.globalAlpha=0.28; H.rrect(g,x+1.5,y+1.5,cw-3,ch-3,Math.min(8,cw*0.2)); g.fill(); g.globalAlpha=1;
      H.text(g,String(n),x+cw/2,y+ch/2,{al:'center',size:Math.max(9,Math.min(16,ch*0.42)),w:cur||isP?800:500,c:cur?'#fff':mk?TH.dim:(S.done?'#06210f':TH.text)}); } },
  read:function(){ var N=this.p.N; return [['지금 확인하는 소수 p',S.done?'—':String(S.p),'','hl'],['지운 수의 개수',String(S.marks),'개'],['남은 수 (1 제외)',String(left()),'개'],['상태',S.done?'완성 (남은 수가 모두 소수)':'거르는 중','','ok'],['소수의 개수 (직접 센 값)',S.done?String(primes(N)):'—','개']]; },
  record:function(){ return {N:this.p.N, cnt:left(), pr:primes(this.p.N)}; },
  ai:function(){ return 'Sieve of Eratosthenes up to N = '+this.p.N+'. Current prime p = '+S.p+', crossed out '+S.marks+' composites, '+left()+' numbers remain'+(S.done?', finished: they are all primes ('+primes(this.p.N)+' primes).':'.'); }
});
})();

/* ===================== 중1 소인수분해: 소인수분해 나무와 약수 ===================== */
(function(){
function divs(f){ var d=[1]; f.forEach(function(q){ var cur=d.slice(), m=1; for(var e=1;e<=q[1];e++){ m*=q[0]; cur.forEach(function(x){ d.push(x*m); }); } }); return d.sort(function(a,b){ return a-b; }); }
function chain(n){ var out=[], cur=n, f=fac(n); if(f.length===1&&f[0][1]===1) return [[n,0]]; f.forEach(function(q){ for(var i=0;i<q[1];i++){ out.push([cur,q[0]]); cur/=q[0]; } }); out.push([cur,0]); return out; }
function tree(g,x,y,n,dy,col){ var ch=chain(n), px=x, py=y;
  ch.forEach(function(z,i){ var last=i===ch.length-1, nx=px; if(!last){ H.seg(g,px,py,px-28,py+dy,TH.dim,1.6); H.seg(g,px,py,px+28,py+dy,TH.dim,1.6); H.dot(g,px-28,py+dy,13,C.fry,TH.stage); H.text(g,String(z[1]),px-28,py+dy,{al:'center',size:12.5,w:800,c:'#1c1405'}); }
    H.dot(g,px,py,13,last&&z[0]!==1?C.fry:'rgba(138,147,166,.35)',TH.stage); H.text(g,String(z[0]),px,py,{al:'center',size:12.5,w:800,c:last&&z[0]!==1?'#1c1405':TH.text});
    px=px+28; py=py+dy; }); }
LAB.add({id:'m1_ftree', cat:'math', icon:'🌳', name:'소인수분해 나무', desc:'소수의 곱으로 나누고 약수, 최대공약수, 최소공배수 구하기',
  info:'합성수를 가장 작은 소수부터 차례로 나누어 가면 소수만의 곱으로 나타낼 수 있어요. 이것이 소인수분해이고, 순서를 바꾸어도 결과가 같아요. n = a^p × b^q 꼴이면 약수의 개수는 (p+1)(q+1)이에요. 두 수의 소인수분해에서 공통인 소수를 작은 지수로 곱하면 최대공약수, 모든 소수를 큰 지수로 곱하면 최소공배수예요. 두 수의 곱은 (최대공약수)×(최소공배수)와 같아요.',
  tries:['n = 360을 소인수분해하고 약수의 개수가 (3+1)(2+1)(1+1) = 24개인지 확인해 보세요','n이 소수일 때 약수는 몇 개인가요?','n = 12, m = 18일 때 최대공약수와 최소공배수를 구하고 곱이 n×m과 같은지 보세요'],
  noPlay:true,
  params:[{id:'n',l:'수 n',min:2,max:1000,step:1,val:360,d:0,pre:[[12,'12'],[60,'60'],[360,'360'],[997,'997']]},{id:'m',l:'수 m (최대공약수와 최소공배수용)',min:2,max:1000,step:1,val:84,d:0},{id:'two',l:'m의 나무도 함께 보기',type:'check',val:true}],
  cols:[{k:'n',l:'n',d:0},{k:'m',l:'m',d:0},{k:'nd',l:'n의 약수의 개수',d:0},{k:'g',l:'최대공약수',d:0},{k:'l',l:'최소공배수',d:0}], gx:'n', gy:'nd',
  reset:function(){},
  draw:function(g,W,Hh){ var p=this.p, two=p.two, nodes=Math.max(chain(p.n).length,two?chain(p.m).length:0), dy=Math.min(46,(Hh-120)/Math.max(1,nodes-1)), y0=36;
    var cx=two?W*0.28:W*0.42, dx=Math.min(0,0); tree(g,cx-14,y0,p.n,dy);
    H.text(g,facStr(fac(p.n)).replace(/^(\d+)$/,'$1'),cx,Hh-58,{al:'center',size:16,w:800,c:C.fry}); H.text(g,'n = '+p.n,cx,Hh-86,{al:'center',size:13,c:TH.dim});
    if(two){ tree(g,W*0.7-14,y0,p.m,dy); H.text(g,facStr(fac(p.m)),W*0.7,Hh-58,{al:'center',size:16,w:800,c:C.blu}); H.text(g,'m = '+p.m,W*0.7,Hh-86,{al:'center',size:13,c:TH.dim}); } },
  read:function(){ var p=this.p, f=fac(p.n), d=divs(f), nd=f.reduce(function(a,q){ return a*(q[1]+1); },1), prime=f.length===1&&f[0][1]===1;
    var rows=[['n의 소인수분해',prime?F('{0} (소수)',p.n):p.n+' = '+facStr(f),'','wide hl'],['n의 약수의 개수',String(nd),'개','ok'],['n의 약수',d.length>24?d.slice(0,24).join(', ')+' …':d.join(', '),'','wide'],['n의 약수의 합',String(d.reduce(function(a,b){ return a+b; },0)),'']];
    if(p.two){ var g=gcd(p.n,p.m), l=p.n/g*p.m; rows.push(['m의 소인수분해',p.m+' = '+facStr(fac(p.m)),'','wide'],['최대공약수',String(g),'','hl'],['최소공배수',String(l),'','hl'],['서로소인가요?',g===1?'네':'아니요',''],['n × m = 최대공약수 × 최소공배수',p.n*p.m===g*l?'맞아요':'달라요','','th']); }
    return rows; },
  record:function(){ var p=this.p, f=fac(p.n), g=gcd(p.n,p.m); return {n:p.n, m:p.m, nd:f.reduce(function(a,q){ return a*(q[1]+1); },1), g:g, l:p.n/g*p.m}; },
  ai:function(){ var p=this.p, g=gcd(p.n,p.m); return 'Prime factorization: '+p.n+' = '+fac(p.n).map(function(q){ return q[0]+'^'+q[1]; }).join(' x ')+'; '+p.m+' = '+fac(p.m).map(function(q){ return q[0]+'^'+q[1]; }).join(' x ')+'. gcd = '+g+', lcm = '+(p.n/g*p.m)+'.'; }
});
})();

/* ===================== 중1 정수와 유리수: 수직선에서 덧셈·뺄셈 ===================== */
(function(){
var S={t:2};
function res(p){ return p.op==='add'?p.a+p.b:p.a-p.b; }
function sg(n){ return n<0?'('+MINUS+Math.abs(n)+')':String(n); }
LAB.add({id:'m1_numline', cat:'math', icon:'↔️', name:'수직선에서 정수의 덧셈과 뺄셈', desc:'수직선 위의 화살표로 정수 계산하기',
  info:'수직선에서 0을 출발해 a만큼 간 다음, 더하는 수 b가 양수이면 오른쪽으로, 음수이면 왼쪽으로 b만큼 더 가요. 도착한 곳이 a + b예요. 빼기는 부호를 바꾸어 더하는 것과 같아서 a − b = a + (−b)예요. 같은 부호끼리 더하면 절댓값은 더하고 부호는 그대로, 다른 부호끼리 더하면 절댓값이 큰 쪽에서 작은 쪽을 빼고 큰 쪽의 부호를 따라요.',
  tries:['a = 3, b = −5일 때 3 + (−5)가 −2가 되는 걸 화살표로 확인해 보세요','b를 계속 음수로 두고 덧셈을 뺄셈으로 바꾸면 도착하는 곳이 어떻게 달라지나요?','a와 b의 절댓값이 같고 부호가 다르면 결과는 얼마인가요?'],
  playLabel:'걸어 보기', speed:true,
  params:[{id:'a',l:'처음 수 a',min:-10,max:10,step:1,val:3,d:0},{id:'b',l:'두 번째 수 b',min:-10,max:10,step:1,val:-5,d:0},{id:'op',l:'계산',type:'seg',opts:[['add','덧셈 a + b'],['sub','뺄셈 a − b']],val:'add'}],
  cols:[{k:'a',l:'a',d:0},{k:'b',l:'b',d:0},{k:'r',l:'결과',d:0}], gx:'a', gy:'r',
  reset:function(){ S.t=2; }, onPlay:function(){ S.t=0; },
  change:function(){ S.t=2; },
  step:function(dt){ S.t+=dt*0.8; if(S.t>=2){ S.t=2; return 'done'; } },
  draw:function(g,W,Hh){ var p=this.p, r=res(p), step=p.op==='add'?p.b:-p.b, mx=Math.max(12,Math.abs(p.a)+Math.abs(step)+2,Math.abs(r)+2), L=Math.ceil(mx), pad=22, cy=Hh*0.62, sx=function(x){ return pad+(x+L)/(2*L)*(W-2*pad); };
    H.seg(g,sx(-L),cy,sx(L),cy,TH.dim,2.5); for(var i=-L;i<=L;i++){ var big=i%5===0; H.seg(g,sx(i),cy-(big?9:5),sx(i),cy+(big?9:5),i===0?TH.text:TH.dim,i===0?3:1.5);
      if(big||L<=12||i===0) H.text(g,i<0?MINUS+Math.abs(i):String(i),sx(i),cy+22,{al:'center',size:12,c:i===0?TH.text:TH.dim,w:i===0?800:500}); }
    var t1=H.clamp(S.t,0,1), t2=H.clamp(S.t-1,0,1), e1=p.a*t1, e2=p.a+step*t2, y1=cy-46, y2=cy-92;
    if(t1>0){ H.arrow(g,sx(0),y1,sx(e1),y1,C.blu,4,12); H.seg(g,sx(0),y1,sx(0),cy,C.blu,1,[3,4]); }
    H.text(g,'a = '+num(p.a,0),(sx(0)+sx(p.a))/2,y1-16,{al:'center',size:13,w:700,c:C.blu});
    if(t2>0){ H.arrow(g,sx(p.a),y2,sx(e2),y2,step>=0?C.grn:C.red,4,12); H.seg(g,sx(p.a),y1,sx(p.a),y2,TH.dim,1,[3,4]); }
    H.text(g,(p.op==='add'?'+ ':MINUS+' ')+sg(p.b)+'  =  '+(step>=0?'+':'')+num(step,0).replace('-',MINUS)+(p.op==='sub'?'  ('+T('부호를 바꾸어 더해요')+')':''),(sx(p.a)+sx(p.a+step))/2,y2-16,{al:'center',size:13,w:700,c:step>=0?C.grn:C.red});
    if(S.t>=2){ H.dot(g,sx(r),cy,9,C.or,TH.stage); H.seg(g,sx(r),y2,sx(r),cy,C.or,1.5,[3,4]); }
    else H.dot(g,sx(S.t<=1?e1:e2),cy,6,C.or,TH.stage);
    H.text(g,num(p.a,0)+(p.op==='add'?' + ':' '+MINUS+' ')+sg(p.b)+' = '+num(r,0),W/2,24,{al:'center',size:21,w:800,c:C.fry}); },
  read:function(){ var p=this.p, r=res(p), a2=Math.abs(p.a), b2=Math.abs(p.op==='add'?p.b:-p.b), same=(p.op==='add'?p.b:-p.b)*p.a>0, st=p.op==='add'?p.b:-p.b;
    return [['식',num(p.a,0)+(p.op==='add'?' + ':' '+MINUS+' ')+(p.b<0?'('+MINUS+Math.abs(p.b)+')':p.b)+' = '+num(r,0),'','wide hl'],['더하는 수',num(st,0),''],['결과',num(r,0),'','ok'],['결과의 절댓값',String(Math.abs(r)),''],
      ['어떤 경우인가요?',p.a===0||st===0?'0을 더해요':same?'같은 부호: 절댓값을 더해요':'다른 부호: 절댓값을 빼요','','wide th']]; },
  record:function(){ var p=this.p; return {a:p.a, b:p.b, r:res(p)}; },
  ai:function(){ var p=this.p; return 'Integer '+(p.op==='add'?'addition':'subtraction')+' on a number line: '+p.a+(p.op==='add'?' + ':' - ')+'('+p.b+') = '+res(p)+'.'; }
});
})();

/* ===================== 중1 정수와 유리수: 수직선 위의 유리수와 순환소수 ===================== */
(function(){
function dec(n,q){ var ip=Math.floor(n/q), rem=n%q, seen={}, digs=[], start=-1; while(rem&&digs.length<60){ if(seen[rem]!=null){ start=seen[rem]; break; } seen[rem]=digs.length; rem*=10; digs.push(Math.floor(rem/q)); rem%=q; }
  return {ip:ip,digs:digs,start:start}; }
LAB.add({id:'m1_frac', cat:'math', icon:'➗', name:'수직선 위의 유리수', desc:'분수의 위치와 소수 표현(유한소수, 순환소수) 알아보기',
  info:'정수 p와 0이 아닌 정수 q로 p/q 꼴로 나타낼 수 있는 수가 유리수예요. 수직선에서 두 정수 사이를 q등분하면 p/q의 위치를 찾을 수 있어요. 분수를 소수로 나타내면 나누어떨어지는 유한소수이거나 같은 숫자가 반복되는 순환소수가 돼요. 기약분수의 분모가 2나 5로만 이루어졌을 때에만 유한소수가 돼요.',
  tries:['분모를 2, 4, 5, 8, 10으로 바꾸면 모두 유한소수가 되나요?','분모가 3, 7, 9, 11, 13일 때 순환마디의 길이를 비교해 보세요','분자를 음수로 하면 수직선에서 0의 어느 쪽에 놓이나요?'],
  noPlay:true,
  params:[{id:'p',l:'분자 p',min:-30,max:30,step:1,val:5,d:0},{id:'q',l:'분모 q',min:1,max:30,step:1,val:7,d:0,pre:[[2,'2'],[3,'3'],[7,'7'],[8,'8'],[12,'12']]}],
  cols:[{k:'v',l:'값',d:6},{k:'p',l:'분자',d:0},{k:'q',l:'분모',d:0},{k:'cyc',l:'순환마디의 길이',d:0}], gx:'p', gy:'v',
  reset:function(){},
  draw:function(g,W,Hh){ var p=this.p, v=p.p/p.q, gg=gcd(p.p,p.q), rp=p.p/gg, rq=p.q/gg, L=Math.max(4,Math.ceil(Math.abs(v))+1), pad=24, y1=Hh*0.22, sx=function(x){ return pad+(x+L)/(2*L)*(W-2*pad); };
    H.seg(g,sx(-L),y1,sx(L),y1,TH.dim,2.5); for(var i=-L;i<=L;i++){ H.seg(g,sx(i),y1-6,sx(i),y1+6,i===0?TH.text:TH.dim,i===0?3:1.5); H.text(g,i<0?MINUS+Math.abs(i):String(i),sx(i),y1+22,{al:'center',size:12,c:TH.dim}); }
    H.dot(g,sx(v),y1,8,C.or,TH.stage); tag(g,rq===1?String(rp):rp+'/'+rq,sx(v),y1-22,C.or,'center');
    var k=Math.floor(v+1e-12), y2=Hh*0.5, a=pad+10, b=W-pad-10; H.seg(g,sx(k),y1+8,a,y2-8,'rgba(138,147,166,.5)',1,[4,4]); H.seg(g,sx(k+1),y1+8,b,y2-8,'rgba(138,147,166,.5)',1,[4,4]);
    H.seg(g,a,y2,b,y2,TH.text,3); for(var j=0;j<=rq;j++){ var xx=a+(b-a)*j/rq; H.seg(g,xx,y2-8,xx,y2+8,TH.dim,1.5); }
    H.text(g,k<0?MINUS+Math.abs(k):String(k),a,y2+24,{al:'center',size:13,w:700}); H.text(g,(k+1)<0?MINUS+Math.abs(k+1):String(k+1),b,y2+24,{al:'center',size:13,w:700});
    H.text(g,F('{0}와 {1} 사이를 {2}등분',k,k+1,rq),W/2,y2-26,{al:'center',size:12.5,c:TH.dim});
    var d=dec(Math.abs(p.p),p.q), ds=d.digs, nonrep=d.start<0?ds:ds.slice(0,d.start), rep=d.start<0?[]:ds.slice(d.start), x=W/2, y3=Hh*0.78;
    var a1=(p.p<0?MINUS:'')+d.ip+(ds.length?'.':''), a2=nonrep.join(''), a3=rep.join('')+(rep.length?'…':'');
    g.font=H.font(24,800); var w1=g.measureText(a1).width, w2=g.measureText(a2).width, w3=g.measureText(a3).width, x0=x-(w1+w2+w3)/2;
    H.text(g,a1,x0,y3,{size:24,w:800,c:C.fry}); H.text(g,a2,x0+w1,y3,{size:24,w:800,c:C.blu}); H.text(g,a3,x0+w1+w2,y3,{size:24,w:800,c:C.pink});
    if(rep.length){ g.strokeStyle=C.pink; g.lineWidth=2.5; g.beginPath(); g.moveTo(x0+w1+w2,y3-20); g.lineTo(x0+w1+w2+Math.min(w3,g.measureText(rep.join('')).width),y3-20); g.stroke(); }
    H.text(g,p.p+'/'+p.q+' = '+(rq!==p.q?rp+'/'+rq+' = ':''),W/2,y3-40,{al:'center',size:14,c:TH.dim}); },
  read:function(){ var p=this.p, v=p.p/p.q, gg=gcd(p.p,p.q), rq=p.q/gg, rp=p.p/gg, d=dec(Math.abs(p.p),p.q), fin=d.start<0, e=rq; while(e%2===0) e/=2; while(e%5===0) e/=5;
    var cyc=fin?0:d.digs.length-d.start; return [['기약분수',rq===1?String(rp):rp+'/'+rq,'','hl'],['소수로 나타내기',num(v,6),''],['종류',fin?(rq===1?'정수':'유한소수'):'순환소수','','ok'],
      ['순환마디의 길이',fin?'—':String(cyc),''],['분모의 소인수',fac(rq).map(function(q){ return q[0]; }).join(', ')||'—',''],['절댓값',num(Math.abs(v),4),''],['2나 5 이외의 소인수',e>1?'있어요':'없어요','','th']]; },
  record:function(){ var p=this.p, d=dec(Math.abs(p.p),p.q); return {v:p.p/p.q, p:p.p, q:p.q, cyc:d.start<0?0:d.digs.length-d.start}; },
  ai:function(){ var p=this.p, d=dec(Math.abs(p.p),p.q); return 'Rational number '+p.p+'/'+p.q+' = '+fmt(p.p/p.q,8)+', '+(d.start<0?'terminating decimal':'repeating decimal with period '+(d.digs.length-d.start))+'.'; }
});
})();

/* ===================== 중1 문자와 식: 천칭으로 방정식 풀기 ===================== */
(function(){
var S={e:[3,4,1,10]};
function fromP(p){ S.e=[p.a,p.b,p.c,p.d]; }
function side(a,b){ return lin(a,b,'x'); }
LAB.add({id:'m1_balance', cat:'math', icon:'⚖️', name:'천칭으로 방정식 풀기', desc:'양쪽에 같은 일을 해서 x의 값 구하기',
  info:'천칭이 평형일 때 양쪽에 같은 무게를 더하거나 빼도, 양쪽을 같은 수로 나누어도 평형은 그대로예요. 방정식도 마찬가지로 양변에 같은 수를 더하거나 빼고 같은 수로 나누어도 해는 변하지 않아요. 상자 하나의 무게가 x이고 작은 정사각형은 무게 1이에요. 먼저 양쪽에서 x 상자를 빼고, 상수를 빼서 x 상자만 남긴 다음, 계수로 나누면 x의 값이 나와요.',
  tries:['3x + 4 = x + 10에서 양쪽에서 x를 하나씩 빼 보세요. 식이 어떻게 되나요?','x의 값을 바꾸어 천칭이 평형이 되는 값을 찾아보세요. 그 값이 방정식의 해예요','a = c이면 해가 어떻게 되나요?'],
  hint:'아래 버튼으로 양쪽에 같은 일을 해 보세요. 슬라이더로 x를 정하면 천칭이 기울어요.', noPlay:true,
  params:[{id:'a',l:'왼쪽의 x 상자 수',min:0,max:6,step:1,val:3,d:0},{id:'b',l:'왼쪽의 상수',min:0,max:15,step:1,val:4,d:0},{id:'c',l:'오른쪽의 x 상자 수',min:0,max:6,step:1,val:1,d:0},{id:'d',l:'오른쪽의 상수',min:0,max:15,step:1,val:10,d:0},
    {id:'gx',l:'x 상자의 무게 (시험해 보기)',min:0,max:15,step:0.5,val:1,d:1}],
  actions:[['sx','양쪽에서 x 빼기'],['sc','양쪽에서 상수 빼기'],['dv','양쪽을 x의 계수로 나누기'],['rs','처음 식으로']],
  act:function(k){ var e=S.e; if(k==='rs'){ fromP(this.p); return; }
    if(k==='sx'){ var m=Math.min(e[0],e[2]); if(m<=0){ H.toast(T('양쪽에 모두 x 상자가 있을 때만 뺄 수 있어요')); return; } S.e=[e[0]-m,e[1],e[2]-m,e[3]]; }
    else if(k==='sc'){ var m2=Math.min(e[1],e[3]); if(m2<=0){ H.toast(T('양쪽에 모두 상수가 있을 때만 뺄 수 있어요')); return; } S.e=[e[0],e[1]-m2,e[2],e[3]-m2]; }
    else { var k1=e[0]>0&&e[2]===0&&e[1]===0, k2=e[2]>0&&e[0]===0&&e[3]===0; if(k1) S.e=[1,0,0,e[3]/e[0]]; else if(k2) S.e=[0,e[1]/e[2],1,0]; else H.toast(T('먼저 x 상자와 상수를 한쪽씩 모아요')); } },
  cols:[{k:'xs',l:'x의 값',d:3},{k:'gx',l:'시험한 x',d:2},{k:'diff',l:'왼쪽 − 오른쪽',d:2}], gx:'gx', gy:'diff',
  reset:function(){ fromP(this.p); }, change:function(id){ if(id!=='gx') fromP(this.p); },
  sol:function(){ var e=S.e, da=e[0]-e[2], db=e[3]-e[1]; if(Math.abs(da)<1e-12) return Math.abs(db)<1e-12?{k:'all'}:{k:'none'}; return {k:'one',x:db/da}; },
  draw:function(g,W,Hh){ var p=this.p, e=S.e, x=p.gx, Lw=e[0]*x+e[1], Rw=e[2]*x+e[3], diff=Lw-Rw, ang=H.clamp(diff/Math.max(Lw,Rw,1)*0.9,-0.38,0.38);
    var cx=W/2, cy=Hh*0.30, L=Math.min(W*0.78,560)/2, lx=cx-L*Math.cos(ang), ly=cy+L*Math.sin(ang), rx=cx+L*Math.cos(ang), ry=cy-L*Math.sin(ang), drop=Hh*0.18;
    g.fillStyle=TH.dim; g.beginPath(); g.moveTo(cx-34,Hh-26); g.lineTo(cx+34,Hh-26); g.lineTo(cx+5,cy+6); g.lineTo(cx-5,cy+6); g.closePath(); g.fill();
    H.seg(g,lx,ly,rx,ry,TH.text,6); H.dot(g,cx,cy,9,C.fry,TH.stage);
    function pan(px,py,a,b,col){ H.seg(g,px,py,px-34,py+drop,TH.dim,1.5); H.seg(g,px,py,px+34,py+drop,TH.dim,1.5); g.fillStyle=TH.dim; g.fillRect(px-52,py+drop,104,6);
      var bx=px-48, by=py+drop-1, n=Math.floor(a+1e-9), fr=a-n, bs=Math.min(28,(104)/Math.max(1,Math.min(n+(fr>1e-9?1:0),3))); var cnt=0;
      for(var i=0;i<n&&i<6;i++){ var xx=px-46+(i%3)*32, yy=by-Math.floor(i/3)*30-28; g.fillStyle=C.or; H.rrect(g,xx,yy,28,28,5); g.fill(); H.text(g,'x',xx+14,yy+14,{al:'center',size:15,w:800,c:'#1c1405'}); cnt++; }
      if(n>6) H.text(g,F('x 상자 {0}개',num(a,2)),px,by-72,{al:'center',size:13,w:700,c:C.or});
      else if(fr>1e-9){ var xx2=px-46+(n%3)*32, yy2=by-Math.floor(n/3)*30-28; g.fillStyle=C.or; g.globalAlpha=.55; H.rrect(g,xx2,yy2,28*fr+2,28,5); g.fill(); g.globalAlpha=1; H.text(g,num(a,2),xx2+14,yy2-8,{al:'center',size:11,c:C.or}); }
      var nb=Math.floor(b+1e-9), ry0=by-(n>3?64:34)-2; for(var j=0;j<nb&&j<24;j++){ g.fillStyle=C.blu; g.fillRect(px-46+(j%8)*12,ry0-Math.floor(j/8)*13-(nb>24?0:0),10,10); }
      if(nb>24) H.text(g,String(num(b,2)),px,ry0-30,{al:'center',size:13,w:700,c:C.blu}); else if(b-nb>1e-9) H.text(g,'+'+num(b-nb,2),px+50,ry0,{size:11,c:C.blu}); }
    pan(lx,ly,e[0],e[1]); pan(rx,ry,e[2],e[3]);
    H.text(g,side(e[0],e[1])+'  =  '+side(e[2],e[3]),cx,22,{al:'center',size:20,w:800,c:C.fry});
    var st=Math.abs(diff)<1e-9?'평형':diff>0?'왼쪽이 무거워요':'오른쪽이 무거워요'; H.text(g,T(st),cx,50,{al:'center',size:15,w:700,c:Math.abs(diff)<1e-9?C.grn:C.red}); },
  read:function(){ var p=this.p, e=S.e, s=this.sol(), x=p.gx, Lw=e[0]*x+e[1], Rw=e[2]*x+e[3];
    return [['지금 식',side(e[0],e[1])+' = '+side(e[2],e[3]),'','wide hl'],['해',s.k==='one'?'x = '+num(s.x,3):s.k==='all'?'해가 무수히 많아요':'해가 없어요','','ok'],['시험한 x',num(x,1),''],['왼쪽 무게',num(Lw,2),''],['오른쪽 무게',num(Rw,2),''],
      ['천칭',Math.abs(Lw-Rw)<1e-9?'평형':Lw>Rw?'왼쪽이 무거워요':'오른쪽이 무거워요','','th']]; },
  record:function(){ var s=this.sol(), e=S.e, x=this.p.gx; return {xs:s.k==='one'?s.x:null, gx:x, diff:(e[0]-e[2])*x+e[1]-e[3]}; },
  ai:function(){ var e=S.e, s=this.sol(); return 'Balance scale model of the linear equation '+side(e[0],e[1])+' = '+side(e[2],e[3])+' (original '+side(this.p.a,this.p.b)+' = '+side(this.p.c,this.p.d)+'). '+(s.k==='one'?'Solution x = '+fmt(s.x,4)+'.':s.k==='all'?'Infinitely many solutions.':'No solution.')+' Trying x = '+this.p.gx+'.'; }
});
})();

/* ===================== 중1 문자와 식: 성냥개비와 규칙 찾기 ===================== */
(function(){
var S={drawn:0};
function cnt(p,n){ return p.shape==='tri'?2*n+1:3*n+1; }
LAB.add({id:'m1_match', cat:'math', icon:'🔥', name:'성냥개비로 규칙 찾기', desc:'도형을 이어 붙일 때 필요한 개수를 문자로 나타내기',
  info:'성냥개비로 정사각형을 한 줄로 이어 붙이면, 처음 하나는 4개가 필요하고 하나를 더 만들 때마다 3개씩 더 필요해요. 정사각형이 n개일 때 필요한 개수는 3n + 1이에요. 이렇게 규칙을 문자 n을 사용한 식으로 나타내면 n에 수를 넣어 값을 바로 구할 수 있고, 성냥개비가 정해져 있을 때 만들 수 있는 개수도 일차방정식으로 구할 수 있어요.',
  tries:['정사각형 10개를 만들려면 성냥개비가 몇 개 필요한지 식에 n = 10을 넣어 구해 보세요','성냥개비 50개로 정사각형을 최대 몇 개 만들 수 있나요? 식 3n + 1 = 50을 풀어 보세요','삼각형으로 바꾸면 식이 어떻게 달라지나요?'],
  hint:'도형의 개수 n을 바꾸어 성냥개비가 몇 개 필요한지 보세요.', noPlay:true,
  params:[{id:'shape',l:'도형',type:'seg',opts:[['sq','정사각형'],['tri','정삼각형']],val:'sq'},{id:'n',l:'도형의 개수 n',min:1,max:12,step:1,val:4,d:0},{id:'m',l:'가지고 있는 성냥개비',min:5,max:100,step:1,val:50,d:0}],
  cols:[{k:'n',l:'도형의 개수 n',d:0},{k:'c',l:'성냥개비의 수',d:0},{k:'mx',l:'만들 수 있는 최대 개수',d:0}], gx:'n', gy:'c', fit:true,
  fitHint:function(m,b,x,y){ if(x==='n'&&y==='c') return F('추세선의 기울기 {0}, 절편 {1}: 식의 계수와 비교해 보세요',fmt(m,2),fmt(b,2)); },
  reset:function(){},
  draw:function(g,W,Hh){ var p=this.p, n=p.n, tri=p.shape==='tri', uw=tri?0.5:1, tw=n*uw+(tri?0.5:0), hh=tri?Math.sqrt(3)/2:1, ar=W*0.9/tw, s=Math.min(ar,(Hh*0.5)/hh,60), ox=(W-tw*s)/2, oy=Hh*0.2, k=0;
    function m(x1,y1,x2,y2){ k++; H.seg(g,ox+x1*s,oy+y1*s,ox+x2*s,oy+y2*s,C.or,Math.max(3,s*0.09)); H.dot(g,ox+x1*s,oy+y1*s,Math.max(2.5,s*0.07),C.red); }
    if(!tri){ for(var i=0;i<=n;i++) m(i,0,i,1); for(i=0;i<n;i++){ m(i,0,i+1,0); m(i,1,i+1,1); } }
    else { for(i=0;i<n;i++){ var up=i%2===0, bx=i*0.5; if(up){ if(i===0) m(bx,hh,bx+0.5,0); m(bx+0.5,0,bx+1,hh); m(bx,hh,bx+1,hh); } else { m(bx,0,bx+1,0); m(bx+0.5,hh,bx+1,0); } } }
    S.drawn=k;
    var c=cnt(p,n);
    var gr={l:40,t:Hh*0.2+hh*s+46,w:W-60,h:Hh-(Hh*0.2+hh*s+46)-26}, nmax=12, cmax=cnt(p,nmax)+2;
    if(gr.h>60){ var v=H.view(gr,0,nmax+0.5,0,cmax); H.axes(g,v,{box:true,xl:'n',yl:T('성냥개비 수'),xs:1,ys:H.nice(cmax,4)});
      var pts=[]; for(i=1;i<=nmax;i++){ pts.push([v.sx(i),v.sy(cnt(p,i))]); } H.line(g,pts,C.blu,1.5,[4,4]); pts.forEach(function(z,j){ H.dot(g,z[0],z[1],j+1===n?7:3.5,j+1===n?C.or:C.blu,j+1===n?TH.stage:null); }); }
    H.text(g,(tri?'2n + 1':'3n + 1')+'  →  n = '+n+' : '+c+T('개'),W/2,22,{al:'center',size:19,w:800,c:C.fry}); },
  read:function(){ var p=this.p, c=cnt(p,p.n), mx=p.shape==='tri'?Math.floor((p.m-1)/2):Math.floor((p.m-1)/3);
    return [['규칙의 식',p.shape==='tri'?'2n + 1':'3n + 1','','hl'],[F('n = {0}일 때 필요한 개수',p.n),String(c),'개','ok'],['한 개 더 만들 때 늘어나는 개수',p.shape==='tri'?'2':'3','개'],[F('성냥개비 {0}개로 만들 수 있는 최대 개수',p.m),String(Math.max(0,mx)),'개','wide'],['쓰고 남는 성냥개비',String(Math.max(0,p.m-cnt(p,Math.max(0,mx)))),'개']]; },
  record:function(){ var p=this.p; return {n:p.n, c:cnt(p,p.n), mx:Math.max(0,p.shape==='tri'?Math.floor((p.m-1)/2):Math.floor((p.m-1)/3))}; },
  ai:function(){ var p=this.p; return 'Matchstick pattern: '+(p.shape==='tri'?'triangles in a row need 2n + 1':'squares in a row need 3n + 1')+' matches. For n = '+p.n+' you need '+cnt(p,p.n)+'. With '+p.m+' matches at most '+Math.max(0,p.shape==='tri'?Math.floor((p.m-1)/2):Math.floor((p.m-1)/3))+' shapes.'; }
});
})();

/* ===================== 중1 기본 도형: 평행선과 각 ===================== */
(function(){
var VP=[3,4,1,2,7,8,5,6];
function geo(p){ var th=p.th*D2R, ph=(p.par?0:p.dev)*D2R;
  var a=[th,PI-th,th,PI-th,th-ph,PI-th+ph,th-ph,PI-th+ph]; return {th:th,ph:ph,a:a.map(function(x){ return x/D2R; })}; }
function corr(s){ return s<=4?s+4:s-4; }
function alt(s){ return {3:5,4:6,5:3,6:4}[s]||0; }
function coin(s){ return {3:6,4:5,5:4,6:3}[s]||0; }
LAB.add({id:'m1_angles', cat:'math', icon:'🔀', name:'평행선과 각', desc:'맞꼭지각, 동위각, 엇각의 크기 관계 알아보기',
  info:'두 직선이 한 직선과 만나면 8개의 각이 생겨요. 마주 보는 각은 맞꼭지각으로 항상 같아요. 같은 위치에 있는 각은 동위각, 엇갈린 위치의 안쪽 각은 엇각이에요. 두 직선이 평행하면 동위각과 엇각의 크기가 서로 같고, 반대로 동위각이나 엇각이 같으면 두 직선이 평행해요. 평행선에서 같은 쪽 안쪽 두 각(동측내각)의 합은 180°예요.',
  tries:['두 직선이 평행할 때 각 ①의 동위각과 엇각이 어느 각인지 번호를 바꿔 가며 찾아보세요','평행 조건을 끄고 기울기를 바꾸면 동위각이 같지 않게 되는 것을 확인해 보세요','동측내각의 합이 언제 180°가 되나요?'],
  hint:'각 번호를 바꾸면 색칠된 각과 짝이 되는 각이 표시돼요.', noPlay:true,
  params:[{id:'th',l:'직선과 만나는 각',min:30,max:150,step:1,val:65,u:'°',d:0},{id:'par',l:'두 직선이 평행',type:'check',val:true},{id:'dev',l:'아래 직선을 기울인 정도',min:-20,max:20,step:1,val:8,u:'°',d:0,show:function(p){ return !p.par; }},
    {id:'sel',l:'살펴볼 각의 번호',min:1,max:8,step:1,val:3,d:0}],
  cols:[{k:'sel',l:'각 번호',d:0},{k:'v',l:'그 각',u:'°',d:1},{k:'cr',l:'동위각',u:'°',d:1},{k:'df',l:'동위각의 차',u:'°',d:1}], gx:'v', gy:'cr',
  reset:function(){},
  draw:function(g,W,Hh){ var p=this.p, k=geo(p), s=p.sel, r=R4(W,Hh), v=H.view(r,-4.2,4.2,-2.6,2.6,{equal:true}), th=k.th, ph=k.ph;
    var P=[1.2/Math.sin(th)*Math.cos(th),1.2], Q=[-1.2/Math.sin(th)*Math.cos(th),-1.2], X=function(q){ return [v.sx(q[0]),v.sy(q[1])]; };
    var dl=function(c,d,col){ var a=[c[0]-6*Math.cos(d),c[1]-6*Math.sin(d)], b=[c[0]+6*Math.cos(d),c[1]+6*Math.sin(d)]; g.save(); g.beginPath(); g.rect(v.l,v.t,v.w,v.h); g.clip(); H.seg(g,v.sx(a[0]),v.sy(a[1]),v.sx(b[0]),v.sy(b[1]),col,3); g.restore(); };
    dl(P,0,C.blu); dl(Q,ph,C.blu); dl([0,0],th,C.fry);
    tag(g,'l',v.sx(-3.9),v.sy(1.2)-14,C.blu); tag(g,'m',v.sx(-3.9)-0,v.sy(-1.2-3.9*Math.tan(ph))-14+0,C.blu);
    var starts=[[0,th],[th,PI],[PI,th+PI],[th+PI,TAU],[ph,th],[th,PI+ph],[PI+ph,th+PI],[th+PI,TAU+ph]], cen=[P,P,P,P,Q,Q,Q,Q], rad=Math.min(v.w,v.h)*0.1;
    var vs=VP[s-1], cs=corr(s), as=alt(s), cn=coin(s);
    for(var i=1;i<=8;i++){ var st=starts[i-1], c=X(cen[i-1]), col=i===s?'rgba(255,201,60,.8)':i===vs?'rgba(255,122,182,.6)':i===cs?'rgba(56,209,224,.6)':i===as?'rgba(63,224,143,.6)':null;
      wedge(g,c[0],c[1],rad*(i===s?1.15:1),st[0],st[1],col||'rgba(138,147,166,.12)',col?null:'rgba(138,147,166,.35)');
      var mid=(st[0]+st[1])/2; H.text(g,String(i),c[0]+Math.cos(mid)*rad*1.75,c[1]-Math.sin(mid)*rad*1.75,{al:'center',size:12.5,w:800,c:i===s?C.fry:TH.dim}); }
    var items=[[s,C.fry,''],[vs,C.pink,'맞꼭지각'],[cs,C.cyan,'동위각'],[as,C.grn,'엇각']].filter(function(z){ return z[0]; }); items.forEach(function(z,i){ H.text(g,'∠'+z[0]+' = '+num(k.a[z[0]-1],1)+'°  '+(z[2]?T(z[2]):''),r.l+10,r.t+14+i*20,{size:13,w:700,c:z[1]}); }); },
  read:function(){ var p=this.p, k=geo(p), s=p.sel, vs=VP[s-1], cs=corr(s), as=alt(s), cn=coin(s), rows=[[F('선택한 각 ∠{0}',s),num(k.a[s-1],1)+'°','','hl'],[F('맞꼭지각 ∠{0}',vs),num(k.a[vs-1],1)+'°',''],[F('동위각 ∠{0}',cs),num(k.a[cs-1],1)+'°','']];
    if(as) rows.push([F('엇각 ∠{0}',as),num(k.a[as-1],1)+'°','']); if(cn) rows.push([F('동측내각 ∠{0}와의 합',cn),num(k.a[s-1]+k.a[cn-1],1)+'°','']);
    rows.push(['동위각의 차 (0이면 평행)',num(Math.abs(k.a[s-1]-k.a[cs-1]),1)+'°','','ok'],['두 직선',Math.abs(k.a[s-1]-k.a[cs-1])<1e-6?'평행해요':'평행하지 않아요','','th']); return rows.map(function(r){ r[0]=r[0].replace(/∠(\d)/,function(m){ return m; }); return r; }); },
  record:function(){ var p=this.p, k=geo(p), s=p.sel, cs=corr(s); return {sel:s, v:k.a[s-1], cr:k.a[cs-1], df:Math.abs(k.a[s-1]-k.a[cs-1])}; },
  ai:function(){ var p=this.p, k=geo(p); return 'Two lines cut by a transversal. Angle with transversal '+p.th+' deg, lines '+(p.par?'parallel':'not parallel (tilt '+p.dev+' deg)')+'. Angles 1..8: '+k.a.map(function(x){ return fmt(x,1); }).join(', ')+'. Selected angle '+p.sel+'.'; }
});
})();

/* ===================== 중1 기본 도형: 작도 ===================== */
(function(){
var S={t:0};
var NST={perp:5,bis:4,tri:4};
LAB.add({id:'m1_construct', cat:'math', icon:'📐', name:'눈금 없는 자와 컴퍼스로 작도', desc:'수직이등분선, 각의 이등분선, 정삼각형을 차례로 작도하기',
  info:'작도는 눈금 없는 자와 컴퍼스만으로 도형을 그리는 일이에요. 자는 두 점을 잇는 선을 긋는 데, 컴퍼스는 원이나 같은 길이를 옮기는 데 써요. 선분의 수직이등분선은 두 끝점에서 같은 반지름의 원을 그려 만나는 두 점을 잇고, 각의 이등분선은 꼭짓점에서 그린 호와 두 변의 교점에서 같은 반지름의 호를 그려 만난 점을 지나요. 정삼각형은 선분의 길이를 반지름으로 두 호를 그려서 만들어요.',
  tries:['단계를 한 칸씩 올리며 어디에서 컴퍼스를 꽂고 어떤 반지름으로 호를 그리는지 확인해 보세요','선분의 길이나 각의 크기를 바꾸어도 작도가 같은 방법으로 되는지 보세요','정삼각형의 세 각이 모두 몇 도인지 읽어 보세요'],
  hint:'단계 슬라이더나 시작 버튼으로 작도를 차례로 따라가 보세요.', playLabel:'따라 그리기', speed:true,
  params:[{id:'mode',l:'작도',type:'seg',opts:[['perp','수직이등분선'],['bis','각의 이등분선'],['tri','정삼각형']],val:'perp'},{id:'st',l:'작도 단계',min:0,max:5,step:1,val:2,d:0},
    {id:'len',l:'선분의 길이',min:3,max:8,step:0.5,val:6,d:1,show:function(p){ return p.mode!=='bis'; }},{id:'ang',l:'각의 크기',min:30,max:160,step:1,val:70,u:'°',d:0,show:function(p){ return p.mode==='bis'; }},
    {id:'rot',l:'돌려 놓기',min:-45,max:45,step:1,val:12,u:'°',d:0,show:function(p){ return p.mode!=='bis'; }}],
  cols:[{k:'st',l:'단계',d:0},{k:'e1',l:'확인하는 값 1',d:3},{k:'e2',l:'확인하는 값 2',d:3}], gx:'st', gy:'e1',
  reset:function(){ S.t=this.p.st; }, onPlay:function(){ var mx=NST[this.p.mode]; S.t=this.p.st>=mx?0:this.p.st; if(this.p.st>=mx) H.setP('st',0); },
  change:function(id){ if(id==='mode'){ var mx=NST[this.p.mode]; if(this.p.st>mx) H.setP('st',mx); } S.t=this.p.st; },
  step:function(dt){ var mx=NST[this.p.mode]; S.t+=dt*0.8; var k=Math.min(mx,Math.floor(S.t)); if(k!==this.p.st) H.setP('st',k); if(S.t>=mx+0.4) return 'done'; },
  calc:function(){ var p=this.p, mode=p.mode, o={};
    if(mode==='bis'){ var a=p.ang*D2R, r1=2.4, r2=2.2; o.O=[0,0]; o.P=[r1,0]; o.Q=[r1*Math.cos(a),r1*Math.sin(a)]; o.r1=r1; o.r2=r2;
      var mid=(o.P[0]+o.Q[0])/2, mid2=(o.P[1]+o.Q[1])/2, half=Math.hypot(o.P[0]-o.Q[0],o.P[1]-o.Q[1])/2, d=Math.sqrt(Math.max(0,r2*r2-half*half)); var u=[Math.cos(a/2),Math.sin(a/2)];
      var om=Math.hypot(mid,mid2); o.R=[mid+u[0]*d,mid2+u[1]*d]; o.e1=Math.atan2(o.R[1],o.R[0])/D2R; o.e2=p.ang-o.e1; return o; }
    var L=p.len, rot=p.rot*D2R, cr=Math.cos(rot), sr=Math.sin(rot), R=function(q){ return [q[0]*cr-q[1]*sr,q[0]*sr+q[1]*cr]; };
    o.A=R([-L/2,0]); o.B=R([L/2,0]); o.L=L;
    if(mode==='perp'){ var r=L*0.75, h=Math.sqrt(r*r-L*L/4); o.r=r; o.P=R([0,h]); o.Q=R([0,-h]); o.M=R([0,0]); o.e1=Math.hypot(o.A[0]-o.M[0],o.A[1]-o.M[1]); o.e2=Math.hypot(o.B[0]-o.M[0],o.B[1]-o.M[1]); }
    else { o.r=L; o.C=R([0,L*Math.sqrt(3)/2]); o.e1=Math.hypot(o.C[0]-o.A[0],o.C[1]-o.A[1]); o.e2=Math.hypot(o.C[0]-o.B[0],o.C[1]-o.B[1]); }
    return o; },
  draw:function(g,W,Hh){ var p=this.p, o=this.calc(), st=p.st, r=R4(W,Hh), mode=p.mode, v=mode==='bis'?H.view(r,-1.8,6.2,-1.2,5.6,{equal:true,ax:0.25,ay:0.3}):H.view(r,-6.5,6.5,-5.2,5.2,{equal:true}), X=function(q){ return [v.sx(q[0]),v.sy(q[1])]; }, k=v.kx;
    function arcAround(c,rad,towards,span,col,w){ var cc=X(c), ang=Math.atan2(towards[1]-c[1],towards[0]-c[0]); arcM(g,cc[0],cc[1],rad*k,ang-span,ang+span,col,w); }
    function pt(q,lb,col,dx,dy){ var z=X(q); H.dot(g,z[0],z[1],5,col||C.fry,TH.stage); if(lb) tag(g,lb,z[0]+(dx==null?9:dx),z[1]+(dy==null?-14:dy),col||C.fry); }
    function cur(i){ return st===i?C.fry:C.cyan; }
    function seg2(q1,q2,col,w,dash){ var a=X(q1), b=X(q2); H.seg(g,a[0],a[1],b[0],b[1],col,w,dash); }
    if(mode==='bis'){ var a=p.ang*D2R; var e=X([6,0]), f=X([6*Math.cos(a),6*Math.sin(a)]), O=X(o.O); H.arrow(g,O[0],O[1],e[0],e[1],TH.text,2.2,0); H.arrow(g,O[0],O[1],f[0],f[1],TH.text,2.2,0);
      pt(o.O,'O',C.fry,-14,14); H.text(g,'A',e[0],e[1]-12,{al:'center',size:13,w:700}); H.text(g,'B',f[0],f[1]-12,{al:'center',size:13,w:700});
      if(st>=1){ arcM(g,O[0],O[1],o.r1*k,-0.14,a+0.14,cur(1),2); pt(o.P,'P',C.cyan); pt(o.Q,'Q',C.cyan); }
      if(st>=2){ arcAround(o.P,o.r2,o.R,0.55,cur(2),2); } if(st>=3){ arcAround(o.Q,o.r2,o.R,0.55,cur(3),2); pt(o.R,'R',C.pink); }
      if(st>=4){ var R2=X([o.R[0]*2.4,o.R[1]*2.4]); H.arrow(g,O[0],O[1],R2[0],R2[1],C.pink,2.6,0); arcM(g,O[0],O[1],36,0,a/2,C.grn,2.5); arcM(g,O[0],O[1],46,a/2,a,C.vio,2.5);
        H.text(g,num(p.ang/2,1)+'°',O[0]+62*Math.cos(a/4),O[1]-62*Math.sin(a/4),{al:'center',size:12.5,w:700,c:C.grn}); H.text(g,num(p.ang/2,1)+'°',O[0]+72*Math.cos(a*3/4),O[1]-72*Math.sin(a*3/4),{al:'center',size:12.5,w:700,c:C.vio}); }
      var tx=[ '', '꼭짓점 O를 중심으로 호를 그려 두 변과의 교점 P, Q를 찾아요','P, Q를 중심으로 같은 반지름의 호를 그려요','Q를 중심으로 같은 반지름의 호를 그려 점 R에서 만나요','반직선 OR이 각의 이등분선이에요'];
      H.text(g,st?T(tx[st]):T('컴퍼스를 꽂을 곳과 반지름을 따라가 보세요'),W/2,20,{al:'center',size:13.5,c:TH.dim}); return; }
    var A=X(o.A), B=X(o.B);
    if(mode==='perp'){ seg2(o.A,o.B,TH.text,3); pt(o.A,'A',C.fry,-14,14); pt(o.B,'B',C.fry,6,14);
      if(st>=1) arcAround(o.A,o.r,o.P,0.7,cur(1),2), arcAround(o.A,o.r,o.Q,0.7,cur(1),2); if(st>=2) arcAround(o.B,o.r,o.P,0.7,cur(2),2), arcAround(o.B,o.r,o.Q,0.7,cur(2),2);
      if(st>=3){ pt(o.P,'P',C.pink); pt(o.Q,'Q',C.pink); } if(st>=4) seg2([o.P[0]+(o.P[0]-o.M[0])*0.25,o.P[1]+(o.P[1]-o.M[1])*0.25],[o.Q[0]+(o.Q[0]-o.M[0])*0.25,o.Q[1]+(o.Q[1]-o.M[1])*0.25],C.pink,2.5);
      if(st>=5){ pt(o.M,'M',C.grn,8,14); var M=X(o.M), pB=X(o.B), pP=X(o.P), l1=Math.hypot(pB[0]-M[0],pB[1]-M[1]), l2=Math.hypot(pP[0]-M[0],pP[1]-M[1]); rightMark(g,M[0],M[1],(pB[0]-M[0])/l1,(pB[1]-M[1])/l1,(pP[0]-M[0])/l2,(pP[1]-M[1])/l2,14,C.grn); }
      var t2=['','점 A를 중심으로 반지름 AB의 반 이상의 호를 위아래로 그려요','점 B를 중심으로 같은 반지름의 호를 그려요','두 호가 만나는 점 P, Q를 찾아요','P와 Q를 이은 직선을 그어요','AB와 만나는 점 M은 중점이고 AB ⊥ PQ예요'];
      H.text(g,st?T(t2[st]):T('컴퍼스를 꽂을 곳과 반지름을 따라가 보세요'),W/2,20,{al:'center',size:13.5,c:TH.dim}); return; }
    seg2(o.A,o.B,TH.text,3); pt(o.A,'A',C.fry,-14,14); pt(o.B,'B',C.fry,6,14);
    if(st>=1) arcAround(o.A,o.r,o.C,0.8,cur(1),2); if(st>=2) arcAround(o.B,o.r,o.C,0.8,cur(2),2); if(st>=3){ pt(o.C,'C',C.pink); }
    if(st>=3){ seg2(o.A,o.C,C.pink,2.6); seg2(o.B,o.C,C.pink,2.6); }
    if(st>=4){ [[o.A,o.B,o.C],[o.B,o.C,o.A],[o.C,o.A,o.B]].forEach(function(z){ var q=X(z[0]), a1=Math.atan2(-(z[1][1]-z[0][1]),z[1][0]-z[0][0]), a2=Math.atan2(-(z[2][1]-z[0][1]),z[2][0]-z[0][0]); var d=a2-a1; while(d>PI) d-=TAU; while(d<-PI) d+=TAU;
        g.beginPath(); g.arc(q[0],q[1],24,a1,a1+d,d<0); g.strokeStyle=C.grn; g.lineWidth=2.5; g.stroke(); var m=a1+d/2; H.text(g,'60°',q[0]+Math.cos(m)*40,q[1]+Math.sin(m)*40,{al:'center',size:12,w:700,c:C.grn}); }); }
    var t3=['','점 A를 중심으로 반지름 AB인 호를 그려요','점 B를 중심으로 같은 반지름의 호를 그려 점 C에서 만나요','AC와 BC를 이어요','세 변이 모두 같아 세 각이 모두 60°예요'];
    H.text(g,st?T(t3[st]):T('컴퍼스를 꽂을 곳과 반지름을 따라가 보세요'),W/2,20,{al:'center',size:13.5,c:TH.dim}); },
  read:function(){ var p=this.p, o=this.calc(), st=p.st, mx=NST[p.mode];
    if(p.mode==='perp') return [['단계',st+' / '+mx,'','hl'],['AM의 길이',num(o.e1,3),''],['BM의 길이',num(o.e2,3),''],['AM − BM',num(o.e1-o.e2,6),'','ok'],['PQ와 AB가 이루는 각','90°','','th']];
    if(p.mode==='bis') return [['단계',st+' / '+mx,'','hl'],['∠AOR',num(o.e1,2)+'°',''],['∠ROB',num(o.e2,2)+'°',''],['각 B의 반',num(p.ang/2,2)+'°','','ok']];
    return [['단계',st+' / '+mx,'','hl'],['AC의 길이',num(o.e1,3),''],['BC의 길이',num(o.e2,3),''],['AB의 길이',num(o.L,3),'','ok'],['세 각','60° · 60° · 60°','','th']]; },
  record:function(){ var o=this.calc(), p=this.p; return {st:p.st, e1:o.e1, e2:o.e2}; },
  ai:function(){ var p=this.p, o=this.calc(); return 'Compass-and-straightedge construction (mode '+p.mode+', step '+p.st+' of '+NST[p.mode]+'). Check values: '+fmt(o.e1,4)+' and '+fmt(o.e2,4)+'.'; }
});
})();

/* ===================== 중1 기본 도형: 다각형의 내각의 합 ===================== */
(function(){
var S={t:1};
function poly(n,sk){ var P=[]; for(var i=0;i<n;i++){ var a=TAU*i/n+Math.PI/2+sk*0.025*Math.sin(7.3*i+1.7); P.push([Math.cos(a),Math.sin(a)]); } return P; }
function angs(P){ var n=P.length, out=[]; for(var i=0;i<n;i++){ var a=P[(i+n-1)%n], b=P[i], c=P[(i+1)%n], u=[a[0]-b[0],a[1]-b[1]], w=[c[0]-b[0],c[1]-b[1]]; out.push(Math.acos(H.clamp((u[0]*w[0]+u[1]*w[1])/(Math.hypot(u[0],u[1])*Math.hypot(w[0],w[1])),-1,1))/D2R); } return out; }
var COLS=[C.fry,C.blu,C.grn,C.pink,C.cyan,C.or,C.vio,C.red,C.fry,C.blu];
LAB.add({id:'m1_tri', cat:'math', icon:'🔺', name:'삼각형과 다각형의 내각의 합', desc:'세 각을 모으면 180°, 다각형은 (n − 2) × 180°',
  info:'삼각형의 세 내각을 한 점에 모으면 일직선(180°)이 돼요. 평행선의 엇각이 같다는 성질로 증명할 수 있어요. n각형은 한 꼭짓점에서 대각선을 그으면 (n − 2)개의 삼각형으로 나뉘므로 내각의 합은 180° × (n − 2)예요. 한 꼭짓점의 외각은 180°에서 내각을 뺀 값이고, 외각의 합은 변의 수와 관계없이 항상 360°예요.',
  tries:['시작을 눌러 삼각형의 세 각을 한 점으로 모으고 합이 180°인지 확인해 보세요','변의 수를 3에서 10까지 바꾸고 내각의 합이 (n − 2) × 180°인지 표로 확인해 보세요','모양을 일그러뜨려도 합이 변하지 않나요?'],
  playLabel:'각 모으기', speed:true,
  params:[{id:'n',l:'변의 수',min:3,max:10,step:1,val:3,d:0},{id:'sk',l:'일그러뜨린 정도',min:0,max:10,step:1,val:4,d:0},{id:'fan',l:'대각선으로 삼각형 나누기',type:'check',val:true}],
  cols:[{k:'n',l:'변의 수 n',d:0},{k:'sum',l:'내각의 합',u:'°',d:1},{k:'ext',l:'외각의 합',u:'°',d:1}], gx:'n', gy:'sum', fit:true,
  fitHint:function(m,b,x,y){ if(x==='n'&&y==='sum') return F('추세선의 기울기 {0}: 변이 하나 늘 때마다 내각의 합이 늘어나는 양이에요',fmt(m,1)); },
  reset:function(){ S.t=1; }, onPlay:function(){ S.t=0; }, step:function(dt){ S.t+=dt*0.35; if(S.t>=1){ S.t=1; return 'done'; } },
  draw:function(g,W,Hh){ var p=this.p, P=poly(p.n,p.sk), A=angs(P), wide=W>Hh*1.15, r1=wide?{l:6,t:6,w:W*0.5-12,h:Hh-12}:{l:6,t:6,w:W-12,h:Hh*0.52-6}, r2=wide?{l:W*0.5,t:6,w:W*0.5-6,h:Hh-12}:{l:6,t:Hh*0.52,w:W-12,h:Hh*0.48-6};
    var v=H.view(r1,-1.35,1.35,-1.35,1.35,{equal:true}), Q=P.map(function(q){ return [v.sx(q[0]),v.sy(q[1])]; });
    polyPx(g,Q,'rgba(79,157,255,.10)',TH.text,2.5);
    if(p.fan) for(var i=2;i<p.n-1;i++) H.seg(g,Q[0][0],Q[0][1],Q[i][0],Q[i][1],TH.dim,1.5,[5,4]);
    for(i=0;i<p.n;i++){ var a=P[(i+p.n-1)%p.n], b=P[i], c=P[(i+1)%p.n], a1=Math.atan2(a[1]-b[1],a[0]-b[0]), a2=Math.atan2(c[1]-b[1],c[0]-b[0]), d=a2-a1; while(d>PI) d-=TAU; while(d<-PI) d+=TAU;
      var s0=d>0?a1:a2, e0=d>0?a1+d:a1; wedge(g,Q[i][0],Q[i][1],Math.min(30,v.kx*0.35),Math.min(s0,e0),Math.max(s0,e0),COLS[i]+'66',COLS[i]);
      var mid=a1+d/2; H.text(g,num(A[i],0)+'°',Q[i][0]+Math.cos(mid)*(Math.min(30,v.kx*0.35)+18),Q[i][1]-Math.sin(mid)*(Math.min(30,v.kx*0.35)+18),{al:'center',size:12,w:700,c:COLS[i]}); }
    var R=Math.min(r2.w*0.4,r2.h*0.34,170), cx=r2.l+r2.w/2, cy=r2.t+r2.h*0.55, tot=A.reduce(function(a,b){ return a+b; },0), shown=S.t*tot, cum=0;
    for(i=0;i<p.n;i++){ if(shown<=cum) break; var e1=Math.min(A[i],shown-cum), rr=R*(1-0.08*Math.floor(cum/360)); wedge(g,cx,cy,rr,cum*D2R,(cum+e1)*D2R,COLS[i]+'99',COLS[i]); cum+=A[i]; }
    H.seg(g,cx-R*1.15,cy,cx+R*1.15,cy,TH.dim,1.5); if(p.n===3&&S.t>=1) H.text(g,T('일직선 = 180°'),cx,cy+18,{al:'center',size:13,w:700,c:C.fry});
    H.text(g,F('내각의 합 = {0}°',num(Math.min(shown,tot),0)),cx,r2.t+14,{al:'center',size:16,w:800,c:C.fry}); H.text(g,(p.n-2)+' '+TIMES+' 180° = '+(p.n-2)*180+'°',cx,r2.t+r2.h-12,{al:'center',size:13,c:TH.dim}); },
  read:function(){ var p=this.p, A=angs(poly(p.n,p.sk)), sum=A.reduce(function(a,b){ return a+b; },0);
    return [['변의 수',String(p.n),'개'],['내각의 합',num(sum,1),'°','hl'],['(n − 2) × 180°',String((p.n-2)*180),'°','ok'],['삼각형의 개수 (한 꼭짓점에서 나눌 때)',String(p.n-2),'개'],['외각의 합',num(A.reduce(function(a,b){ return a+180-b; },0),1),'°','th'],['각각의 내각',A.map(function(x){ return num(x,0); }).join(', '),'°','wide']]; },
  record:function(){ var p=this.p, A=angs(poly(p.n,p.sk)); return {n:p.n, sum:A.reduce(function(a,b){ return a+b; },0), ext:A.reduce(function(a,b){ return a+180-b; },0)}; },
  ai:function(){ var p=this.p, A=angs(poly(p.n,p.sk)); return 'Polygon with '+p.n+' sides: interior angles '+A.map(function(x){ return fmt(x,1); }).join(', ')+', sum '+fmt(A.reduce(function(a,b){ return a+b; },0),1)+' = (n-2)*180 = '+(p.n-2)*180+'. Exterior angles sum to 360.'; }
});
})();

/* ===================== 중2 일차함수와 그래프: 물통에 물 채우기 ===================== */
(function(){
var S={t:0, v:null};
function vol(p,t){ return H.clamp(p.b+p.a*t,0,p.cap); }
function tmax(p){ return p.a>0?(p.cap-p.b)/p.a:p.a<0?p.b/(-p.a):10; }
LAB.add({id:'m1_water', cat:'math', icon:'🚰', name:'물통에 물 채우기', desc:'처음 양과 1분당 변화량으로 일차함수 V = at + b 만들기',
  info:'물통에 처음 b L의 물이 있고 1분마다 a L씩 물을 채우면, t분 뒤 물의 양은 V = at + b예요. 이것은 일차함수이고, 기울기 a는 1분 동안 변하는 물의 양(변화율), y절편 b는 처음 물의 양이에요. a가 음수이면 물이 빠지는 경우이고 그래프가 내려가요. 시작을 누르면 물통과 그래프의 점이 함께 움직여요.',
  tries:['처음 물의 양 b를 바꾸면 그래프가 어떻게 움직이나요? 기울기는 그대로인가요?','가득 찰 때까지 걸리는 시간을 식 at + b = 100에서 구해서 실제와 비교해 보세요','기울기를 음수로 하면 물통은 어떻게 되나요?'],
  hint:'그래프를 눌러 끌면 시각을 고를 수 있어요.', speed:true, playLabel:'물 틀기',
  params:[{id:'b',l:'처음 물의 양 b',min:0,max:60,step:1,val:20,u:'L',d:0},{id:'a',l:'1분당 변하는 양 a',min:-8,max:10,step:0.5,val:4,u:'L/분',d:1,pre:[[2,'2'],[4,'4'],[-3,'−3']]},{id:'cap',l:'물통의 크기',min:40,max:200,step:10,val:100,u:'L',d:0}],
  cols:[{k:'t',l:'시간 (분)',d:2},{k:'V',l:'물의 양 (L)',d:2}], gx:'t', gy:'V', fit:true,
  fitHint:function(m,b,x,y){ if(x==='t'&&y==='V') return F('추세선의 기울기 {0}, 절편 {1}을 a, b와 비교해 보세요',fmt(m,2),fmt(b,2)); },
  reset:function(){ S.t=0; }, onPlay:function(){ if(S.t>=tmax(this.p)-1e-9) S.t=0; }, change:function(){ S.t=Math.min(S.t,tmax(this.p)); },
  step:function(dt){ var tm=tmax(this.p); S.t+=dt; if(S.t>=tm){ S.t=tm; return 'done'; } },
  draw:function(g,W,Hh){ var p=this.p, r=R4(W,Hh,10), tm=tmax(p), tx=Math.max(tm*1.15,5), V=vol(p,S.t), wide=W>400, tk={l:r.l+20,t:r.t+58,w:Math.min(140,r.w*0.26),h:r.h-102};
    var gr={l:tk.l+tk.w+70,t:r.t+16,w:r.w-(tk.w+100)-30,h:r.h-56}, v=S.v=H.view(gr,0,tx,0,p.cap*1.05);
    g.fillStyle='rgba(79,157,255,.65)'; var hh=tk.h*V/p.cap; g.fillRect(tk.l,tk.t+tk.h-hh,tk.w,hh); g.strokeStyle=TH.text; g.lineWidth=3; g.beginPath(); g.moveTo(tk.l,tk.t); g.lineTo(tk.l,tk.t+tk.h); g.lineTo(tk.l+tk.w,tk.t+tk.h); g.lineTo(tk.l+tk.w,tk.t); g.stroke();
    for(var i=1;i<4;i++){ var yy=tk.t+tk.h*(1-i/4); H.seg(g,tk.l,yy,tk.l+8,yy,TH.text,1.5); H.text(g,num(p.cap*i/4,0),tk.l-6,yy,{al:'right',size:10.5,c:TH.dim}); }
    if(p.a>0&&V<p.cap){ g.fillStyle=C.blu; g.fillRect(tk.l+tk.w/2-3,tk.t-30,6,tk.h-hh+30); H.text(g,'🚰',tk.l+tk.w/2,tk.t-40,{al:'center',size:20}); } else if(p.a<0&&V>0){ H.text(g,'⬇',tk.l+tk.w/2,tk.t+tk.h+14,{al:'center',size:16,c:C.red}); }
    H.text(g,num(V,1)+' L',tk.l+tk.w/2,tk.t+tk.h-hh-12,{al:'center',size:13,w:800,c:C.cyan,bg:'rgba(0,0,0,0)'});
    H.axes(g,v,{box:true,xl:T('시간 (분)'),yl:T('물의 양 (L)')}); var pts=[]; for(i=0;i<=40;i++){ var t=tm*i/40; pts.push([v.sx(t),v.sy(vol(p,t))]); } if(p.a===0) pts=[[v.sx(0),v.sy(p.b)],[v.sx(tx),v.sy(p.b)]]; H.line(g,pts,C.fry,3.5);
    H.dot(g,v.sx(0),v.sy(p.b),5.5,C.vio,TH.stage); H.seg(g,v.sx(S.t),v.sy(0),v.sx(S.t),v.sy(V),C.or,1.2,[4,4]); H.seg(g,v.sx(0),v.sy(V),v.sx(S.t),v.sy(V),C.or,1.2,[4,4]); H.dot(g,v.sx(S.t),v.sy(V),7,C.or,TH.stage);
    tag(g,'V = '+lin(p.a,p.b,'t'),gr.l+8,gr.t+14,C.fry); },
  read:function(){ var p=this.p, tm=tmax(p), V=vol(p,S.t);
    return [['식','V = '+lin(p.a,p.b,'t'),'','wide hl'],['지금 시각',num(S.t,1),'분'],['물의 양',num(V,1),'L','ok'],['기울기 a (1분당 변화)',num(p.a,1),'L/분'],['처음 물의 양 b (y절편)',num(p.b,1),'L'],
      [p.a>0?'가득 찰 때까지':p.a<0?'다 빠질 때까지':'변화 없음',p.a===0?'—':num(tm,1),p.a===0?'':'분','th']]; },
  record:function(){ var p=this.p; return {t:S.t, V:vol(p,S.t)}; },
  ai:function(){ var p=this.p; return 'Water tank as a linear function V = a t + b with a = '+p.a+' L/min, b = '+p.b+' L, capacity '+p.cap+' L. At t = '+fmt(S.t,2)+' min V = '+fmt(vol(p,S.t),2)+' L.'; },
  down:function(x){ return !!S.v&&this.move(x,0,null,true); },
  move:function(x,y,e,cap){ if(!cap||!S.v) return false; S.t=H.clamp(S.v.ix(x),0,tmax(this.p)); H.run(false); return true; }
});
})();

/* ===================== 중2 일차함수와 일차방정식: 두 직선의 교점 ===================== */
(function(){
LAB.add({id:'m1_lineq', cat:'math', icon:'✖️', name:'일차방정식과 직선의 교점', desc:'ax + b = cx + d의 해는 두 직선 y = ax + b, y = cx + d의 교점의 x 좌표',
  info:'일차방정식 ax + b = cx + d의 해는 두 일차함수 y = ax + b와 y = cx + d의 그래프가 만나는 점의 x 좌표예요. 두 직선의 기울기가 다르면 교점이 하나 있어서 해가 하나이고, 기울기는 같고 y절편이 다르면 평행해서 해가 없고, 완전히 겹치면 해가 무수히 많아요. 또한 (a − c)x + (b − d) = 0으로 정리하면 y = (a − c)x + (b − d)의 x절편이 해예요.',
  tries:['y = 2x + 1과 y = −x + 7의 교점을 찾고 방정식 2x + 1 = −x + 7을 풀어 비교해 보세요','기울기를 같게 하고 b와 d를 다르게 하면 어떻게 되나요?','차의 그래프를 켜고 x절편이 교점의 x 좌표와 같은지 확인해 보세요'],
  noPlay:true,
  params:[{id:'a',l:'첫째 직선의 기울기 a',min:-6,max:6,step:0.5,val:2,d:1},{id:'b',l:'첫째 직선의 y절편 b',min:-8,max:8,step:0.5,val:1,d:1},{id:'c',l:'둘째 직선의 기울기 c',min:-6,max:6,step:0.5,val:-1,d:1},{id:'d',l:'둘째 직선의 y절편 d',min:-8,max:8,step:0.5,val:7,d:1},
    {id:'rg',l:'보이는 범위',min:4,max:20,step:1,val:8,d:0},{id:'df',l:'차의 그래프도 보기',type:'check',val:false}],
  cols:[{k:'a',l:'a',d:1},{k:'b',l:'b',d:1},{k:'c',l:'c',d:1},{k:'d',l:'d',d:1},{k:'xs',l:'해 x',d:3}], gx:'a', gy:'xs',
  reset:function(){},
  sol:function(){ var p=this.p, da=p.a-p.c, db=p.d-p.b; if(Math.abs(da)<1e-12) return Math.abs(db)<1e-12?{k:'all'}:{k:'none'}; var x=db/da; return {k:'one',x:x,y:p.a*x+p.b}; },
  draw:function(g,W,Hh){ var p=this.p, r=R4(W,Hh), v=H.view(r,-p.rg,p.rg,-p.rg,p.rg,{equal:true}), s=this.sol(); H.axes(g,v,{xl:'x',yl:'y'});
    fnPlot(g,v,function(x){ return p.a*x+p.b; },C.fry,3); fnPlot(g,v,function(x){ return p.c*x+p.d; },C.blu,3); if(p.df) fnPlot(g,v,function(x){ return (p.a-p.c)*x+(p.b-p.d); },C.pink,2,[6,4]);
    if(s.k==='one'){ H.seg(g,v.sx(s.x),v.sy(s.y),v.sx(s.x),v.sy(0),C.grn,1.6,[5,4]); H.dot(g,v.sx(s.x),v.sy(0),5.5,C.grn,TH.stage); H.dot(g,v.sx(s.x),v.sy(s.y),7,C.or,TH.stage);
      tag(g,'x = '+num(s.x,2),v.sx(s.x),v.sy(0)+(s.y>0?18:-16),C.grn,'center'); tag(g,'('+num(s.x,2)+', '+num(s.y,2)+')',v.sx(s.x)+10,v.sy(s.y)-14,C.or); }
    tag(g,'y = '+lin(p.a,p.b,'x'),r.l+8,r.t+16,C.fry); tag(g,'y = '+lin(p.c,p.d,'x'),r.l+8,r.t+40,C.blu); },
  read:function(){ var p=this.p, s=this.sol(); return [['방정식',lin(p.a,p.b,'x')+' = '+lin(p.c,p.d,'x'),'','wide hl'],['해 x',s.k==='one'?num(s.x,3):s.k==='all'?'무수히 많아요':'없어요','','ok'],['교점의 y 좌표',s.k==='one'?num(s.y,3):'—',''],
    ['정리한 식',lin(p.a-p.c,p.b-p.d,'x')+' = 0','','wide'],['두 직선',s.k==='one'?'한 점에서 만나요':s.k==='all'?'일치해요':'평행해요','','th']]; },
  record:function(){ var s=this.sol(), p=this.p; return {a:p.a, b:p.b, c:p.c, d:p.d, xs:s.k==='one'?s.x:null}; },
  ai:function(){ var p=this.p, s=this.sol(); return 'Linear equation '+p.a+'x + '+p.b+' = '+p.c+'x + '+p.d+' solved as the intersection of y = '+p.a+'x + '+p.b+' and y = '+p.c+'x + '+p.d+'. '+(s.k==='one'?'x = '+fmt(s.x,4)+', y = '+fmt(s.y,4)+'.':s.k==='all'?'The lines coincide.':'The lines are parallel, no solution.'); }
});
})();

/* ===================== 중2 피타고라스 정리: 넓이로 증명하기 ===================== */
(function(){
LAB.add({id:'m1_pythproof', cat:'math', icon:'🧩', name:'피타고라스 정리의 넓이 증명', desc:'같은 직각삼각형 4개를 다르게 놓아 a² + b² = c² 확인하기',
  info:'한 변의 길이가 a + b인 큰 정사각형 안에 합동인 직각삼각형 4개를 놓아 볼게요. 처음 배치에서는 가운데 비어 있는 부분이 한 변이 c인 정사각형이에요. 삼각형 4개를 움직여 다시 놓으면 비어 있는 부분이 한 변이 a인 정사각형과 한 변이 b인 정사각형 두 개로 바뀌어요. 큰 정사각형과 삼각형 4개의 넓이는 그대로이니 빈 부분의 넓이도 같아서 c² = a² + b²예요.',
  tries:['a = 3, b = 4에서 모양 슬라이더를 0에서 1로 움직이며 빈 부분이 c²에서 a²과 b²로 바뀌는 것을 보세요','a와 b를 바꾸어도 빈 부분의 넓이가 일정한지 확인해 보세요','a = b일 때는 어떤 삼각형과 어떤 모양이 되나요?'],
  hint:'모양 슬라이더를 움직이거나 시작을 눌러 삼각형을 옮겨 보세요.', playLabel:'옮겨 보기', speed:true,
  params:[{id:'a',l:'변 a',min:1,max:10,step:0.5,val:3,d:1},{id:'b',l:'변 b',min:1,max:10,step:0.5,val:4,d:1},{id:'t',l:'모양 (0: c² · 1: a²과 b²)',min:0,max:1,step:0.01,val:0,d:2,pre:[[0,'0'],[0.5,'0.5'],[1,'1']]}],
  cols:[{k:'a',l:'a',d:1},{k:'b',l:'b',d:1},{k:'c2',l:'c²',d:2},{k:'s',l:'a² + b²',d:2}], gx:'s', gy:'c2', fit:true,
  fitHint:function(m,b,x,y){ if(x==='s'&&y==='c2') return F('기울기가 1에 가까워요 (지금 {0})',fmt(m,3)); },
  reset:function(){}, onPlay:function(){ if(this.p.t>=1) H.setP('t',0); },
  step:function(dt){ var t=this.p.t+dt*0.35; if(t>=1){ H.setP('t',1); return 'done'; } H.setP('t',t); },
  draw:function(g,W,Hh){ var p=this.p, a=p.a, b=p.b, s=a+b, t=p.t, r=R4(W,Hh,14), v=H.view(r,-0.2,s+0.2,-0.2,s+0.2,{equal:true}), X=function(q){ return [v.sx(q[0]),v.sy(q[1])]; };
    var sh=[[0,a*t],[0,0],[-b*t,0],[a*t,-b*t]], T0=[[[0,0],[a,0],[0,b]],[[a,0],[s,0],[s,a]],[[s,a],[s,s],[b,s]],[[b,s],[0,s],[0,b]]];
    function quad(q,fill){ polyPx(g,q.map(X),fill); }
    g.fillStyle=TH.light?'rgba(80,70,50,.06)':'rgba(138,147,166,.08)'; var o0=X([0,s]); g.fillRect(o0[0],o0[1],s*v.kx,s*v.kx);
    quad([[a,0],[s,a],[b,s],[0,b]],'rgba(255,107,107,'+(0.55*(1-t))+')'); quad([[0,0],[a,0],[a,a],[0,a]],'rgba(79,157,255,'+(0.55*t)+')'); quad([[a,a],[s,a],[s,s],[a,s]],'rgba(63,224,143,'+(0.55*t)+')');
    T0.forEach(function(tr,i){ polyPx(g,tr.map(function(q){ return X([q[0]+sh[i][0],q[1]+sh[i][1]]); }),'rgba(255,201,60,.82)',TH.light?'#8a6300':'#3a2b00',1.5); });
    polyPx(g,[[0,0],[s,0],[s,s],[0,s]].map(X),null,TH.text,2.5);
    var cc=X([s/2,s/2]); if(t<0.35) H.text(g,'c²',cc[0],cc[1],{al:'center',size:Math.min(28,v.kx*Math.min(a,b)*0.5+8),w:800,c:'#fff'});
    if(t>0.65){ var qa=X([a/2,a/2]), qb=X([a+b/2,a+b/2]); H.text(g,'a²',qa[0],qa[1],{al:'center',size:Math.min(26,v.kx*a*0.5+6),w:800,c:'#fff'}); H.text(g,'b²',qb[0],qb[1],{al:'center',size:Math.min(26,v.kx*b*0.5+6),w:800,c:'#fff'}); }
    H.text(g,'a + b',v.sx(s/2),v.sy(0)+12,{al:'center',size:13,w:700,c:TH.dim}); H.text(g,'a + b',v.sx(0)-4,v.sy(s/2),{al:'right',size:13,w:700,c:TH.dim}); },
  read:function(){ var p=this.p, a=p.a, b=p.b, c2=a*a+b*b; return [['a²',num(a*a,2),''],['b²',num(b*b,2),''],['c² (빈 부분의 넓이)',num(c2,2),'','hl'],['큰 정사각형 (a + b)²',num((a+b)*(a+b),2),''],['삼각형 4개의 넓이 2ab',num(2*a*b,2),''],
    ['빈 부분 = (a + b)² − 2ab',num((a+b)*(a+b)-2*a*b,2),'','ok'],['빗변 c',num(Math.sqrt(c2),3),'']]; },
  record:function(){ var p=this.p; return {a:p.a, b:p.b, c2:p.a*p.a+p.b*p.b, s:p.a*p.a+p.b*p.b}; },
  ai:function(){ var p=this.p; return 'Area proof of the Pythagorean theorem: four right triangles with legs a = '+p.a+', b = '+p.b+' inside a square of side a + b leave a gap of area c^2 = '+fmt(p.a*p.a+p.b*p.b,2)+' or equivalently a^2 + b^2. Shape slider t = '+p.t+'.'; }
});
})();

/* ===================== 중2 피타고라스 정리: 피타고라스 수 ===================== */
(function(){
var LIST=(function(){ var o=[]; for(var m=2;m<=9;m++) for(var n=1;n<m;n++){ if(gcd(m,n)===1&&(m-n)%2===1){ var a=m*m-n*n, b=2*m*n; o.push([Math.min(a,b),Math.max(a,b),m*m+n*n]); } } return o.sort(function(x,y){ return x[2]-y[2]||x[0]-y[0]; }).filter(function(z){ return z[2]<=100; }); })();
function tri(p){ var n=Math.min(p.n,p.m-1), a=p.m*p.m-n*n, b=2*p.m*n, c=p.m*p.m+n*n, prim=gcd(p.m,n)===1&&(p.m-n)%2===1; return {n:n,a:a*p.k,b:b*p.k,c:c*p.k,prim:prim,base:[Math.min(a,b),Math.max(a,b),c]}; }
LAB.add({id:'m1_triples', cat:'math', icon:'🔺', name:'피타고라스 수 찾기', desc:'a² + b² = c²을 만족하는 세 자연수 (3, 4, 5), (5, 12, 13) …',
  info:'a² + b² = c²을 만족하는 세 자연수 (a, b, c)를 피타고라스 수라고 해요. 2 이상의 자연수 m > n에 대해 a = m² − n², b = 2mn, c = m² + n²이라고 하면 항상 피타고라스 수가 돼요. m, n이 서로소이고 한 쪽이 짝수, 다른 쪽이 홀수이면 공약수가 없는 기본 수가 되고, 모두 k배 한 것도 피타고라스 수예요. 고대 이집트 사람들이 3, 4, 5로 직각을 만들었다고 전해져요.',
  tries:['m = 2, n = 1일 때 (3, 4, 5)가 나오는지 확인하고 m = 3, n = 2도 해 보세요','k를 2로 하면 (6, 8, 10)이 되는데 직각삼각형이 맞는지 a² + b²을 계산해 보세요','m과 n이 모두 홀수일 때는 기본 수가 되지 않는 이유를 생각해 보세요'],
  noPlay:true,
  params:[{id:'m',l:'m',min:2,max:12,step:1,val:2,d:0},{id:'n',l:'n (m보다 작은 수)',min:1,max:11,step:1,val:1,d:0},{id:'k',l:'몇 배 할까요 (k)',min:1,max:5,step:1,val:1,d:0}],
  cols:[{k:'a',l:'a',d:0},{k:'b',l:'b',d:0},{k:'c',l:'c',d:0},{k:'s',l:'a² + b²',d:0},{k:'c2',l:'c²',d:0}], gx:'s', gy:'c2', fit:true,
  reset:function(){},
  draw:function(g,W,Hh){ var p=this.p, q=tri(p), wide=W>=560, area=wide?{l:6,t:6,w:W*0.62,h:Hh-12}:{l:6,t:6,w:W-12,h:Hh*0.62}, v=H.view({l:area.l+60,t:area.t+24,w:area.w-100,h:area.h-100},0,q.a,0,q.b,{equal:true,ax:0.5,ay:0.5});
    var O=[v.sx(0),v.sy(0)], A=[v.sx(q.a),v.sy(0)], B=[v.sx(0),v.sy(q.b)]; polyPx(g,[O,A,B],'rgba(255,201,60,.18)',C.fry,3);
    if(q.a*v.kx>30) for(var i=1;i<q.a;i++) H.seg(g,v.sx(i),v.sy(0),v.sx(i),v.sy(0)-4,TH.dim,1); if(q.b*v.kx>30) for(i=1;i<q.b;i++) H.seg(g,v.sx(0),v.sy(i),v.sx(0)+4,v.sy(i),TH.dim,1);
    rightMark(g,O[0],O[1],1,0,0,-1,12,TH.text); tag(g,'a = '+q.a,(O[0]+A[0])/2,O[1]+16,C.blu,'center'); tag(g,'b = '+q.b,O[0]-8,(O[1]+B[1])/2,C.grn,'right'); tag(g,'c = '+q.c,(A[0]+B[0])/2+16,(A[1]+B[1])/2-12,C.red);
    H.text(g,q.a+'² + '+q.b+'² = '+(q.a*q.a+q.b*q.b),area.l+area.w/2,area.t+area.h-8,{al:'center',size:14,w:700,c:C.fry,bl:'bottom'}); H.text(g,q.c+'² = '+q.c*q.c,area.l+area.w/2,area.t+area.h-30,{al:'center',size:14,w:700,c:C.red,bl:'bottom'});
    var lx=wide?W*0.66:12, ly=wide?20:Hh*0.66+8; H.text(g,T('기본 피타고라스 수'),lx,ly,{size:13,w:700,c:TH.dim}); var cols=wide?1:2, rows=Math.min(LIST.length,wide?Math.floor((Hh-50)/22):8);
    for(i=0;i<rows;i++){ var z=LIST[i], on=z[0]===q.base[0]&&z[1]===q.base[1]; H.text(g,'('+z.join(', ')+')',lx+(wide?0:(i%2)*100),ly+22+(wide?i:Math.floor(i/2))*22,{size:13.5,w:on?800:500,c:on?C.fry:TH.text}); } },
  read:function(){ var p=this.p, q=tri(p); return [['세 변 (a, b, c)','('+q.a+', '+q.b+', '+q.c+')','','wide hl'],['a² + b²',String(q.a*q.a+q.b*q.b),''],['c²',String(q.c*q.c),'','ok'],['기본 수인가요?',q.prim?(p.k===1?'네 (공약수가 없어요)':F('기본 수의 {0}배',p.k)):'아니요 (공약수가 있어요)','','th'],['둘레',String(q.a+q.b+q.c),''],['넓이',num(q.a*q.b/2,1),'']]; },
  record:function(){ var q=tri(this.p); return {a:q.a, b:q.b, c:q.c, s:q.a*q.a+q.b*q.b, c2:q.c*q.c}; },
  ai:function(){ var p=this.p, q=tri(p); return 'Pythagorean triple from Euclid formula with m = '+p.m+', n = '+q.n+', k = '+p.k+': ('+q.a+', '+q.b+', '+q.c+'). '+q.a+'^2 + '+q.b+'^2 = '+(q.a*q.a+q.b*q.b)+' = '+q.c+'^2. Primitive: '+q.prim+'.'; }
});
})();

/* ===================== 중2 경우의 수와 확률: 두 주사위 ===================== */
(function(){
var S={cnt:{}, n:0, last:null, acc:0, hit:0};
function ok(rule,s,a,b){ return rule==='sum'?a+b===s:rule==='prod'?a*b===s:a+b>=s; }
function cases(p){ var k=0; for(var a=1;a<=6;a++) for(var b=1;b<=6;b++) if(ok(p.rule,p.s,a,b)) k++; return k; }
function roll(p,k){ for(var i=0;i<k;i++){ var a=1+Math.floor(Math.random()*6), b=1+Math.floor(Math.random()*6); S.cnt[a+b]=(S.cnt[a+b]||0)+1; S.n++; S.last=[a,b]; if(ok(p.rule,p.s,a,b)) S.hit++; } }
function reinit(){ S.cnt={}; S.n=0; S.last=null; S.acc=0; S.hit=0; }
function rule(p){ return p.rule==='sum'?F('두 눈의 합이 {0}',p.s):p.rule==='prod'?F('두 눈의 곱이 {0}',p.s):F('두 눈의 합이 {0} 이상',p.s); }
function rf(k,n){ var g=gcd(k,n)||1; return k===0?'0':(k/g)+'/'+(n/g); }
LAB.add({id:'m1_dice2', cat:'math', icon:'🎲', name:'두 주사위의 경우의 수', desc:'36가지 경우를 표로 세어 확률을 구하고 직접 던져 비교하기',
  info:'주사위 두 개를 던질 때 나오는 경우는 모두 6 × 6 = 36가지예요. 표에서 조건에 맞는 칸의 수가 그 사건이 일어나는 경우의 수이고, 확률은 (사건이 일어나는 경우의 수) ÷ (모든 경우의 수)예요. 예를 들어 합이 7인 경우는 (1,6), (2,5), (3,4), (4,3), (5,2), (6,1)의 6가지라서 확률이 6/36 = 1/6이에요. 던지는 횟수가 많아지면 상대도수가 이 확률에 가까워져요.',
  tries:['합이 7이 될 확률과 합이 2가 될 확률을 표에서 세어 비교해 보세요','1000번쯤 던져 보고 합이 7인 상대도수가 1/6 ≈ 0.167에 가까워지는지 확인해 보세요','두 눈의 곱이 12가 되는 경우를 모두 찾아보세요'],
  speed:true, playLabel:'던지기',
  params:[{id:'rule',l:'구하는 사건',type:'seg',opts:[['sum','합이 s'],['prod','곱이 s'],['ge','합이 s 이상']],val:'sum'},{id:'s',l:'s의 값',min:1,max:36,step:1,val:7,d:0,pre:[[7,'7'],[12,'12'],[2,'2']]},{id:'rate',l:'1초에 던지는 횟수',min:1,max:100,step:1,val:8,d:0}],
  actions:[['a100','100번 던지기'],['a1000','1000번 던지기']],
  act:function(k){ roll(this.p,k==='a100'?100:1000); },
  cols:[{k:'k',l:'경우의 수',d:0},{k:'pt',l:'확률 (이론)',d:4},{k:'n',l:'던진 횟수',d:0},{k:'rf',l:'상대도수',d:4}], gx:'n', gy:'rf',
  reset:function(){ reinit(); }, change:function(id){ if(id==='rule'||id==='s') { S.hit=0; S.n=0; S.cnt={}; S.last=null; } },
  step:function(dt){ S.acc+=dt*this.p.rate; var k=Math.floor(S.acc); S.acc-=k; if(k>0) roll(this.p,k); },
  draw:function(g,W,Hh){ var p=this.p, wide=W>=620, gr=wide?{l:8,t:8,w:W*0.5,h:Hh-16}:{l:8,t:8,w:W-16,h:Hh*0.5-8}, ch=wide?{l:W*0.5+30,t:30,w:W*0.5-48,h:Hh-90}:{l:40,t:Hh*0.5+30,w:W-60,h:Hh*0.5-72};
    var cs=Math.min((gr.w-34)/7,(gr.h-34)/7), ox=gr.l+(gr.w-cs*7)/2+8, oy=gr.t+(gr.h-cs*7)/2+8;
    H.text(g,T('첫째 주사위'),ox+cs*3.5+cs*0.5,oy-4,{al:'center',size:11.5,c:TH.dim,bl:'bottom'}); H.text(g,T('둘째'),ox-6,oy+cs*0.5,{al:'right',size:11.5,c:TH.dim});
    for(var a=0;a<=6;a++) for(var b=0;b<=6;b++){ var x=ox+a*cs, y=oy+b*cs;
      if(a===0&&b===0) continue; if(a===0||b===0){ H.text(g,String(a||b),x+cs/2,y+cs/2,{al:'center',size:13,w:800,c:TH.dim}); continue; }
      var hit=ok(p.rule,p.s,a,b), isL=S.last&&S.last[0]===a&&S.last[1]===b; g.fillStyle=hit?'rgba(255,201,60,.75)':'rgba(138,147,166,.12)'; H.rrect(g,x+2,y+2,cs-4,cs-4,5); g.fill();
      if(isL){ g.strokeStyle=C.red; g.lineWidth=3; H.rrect(g,x+2,y+2,cs-4,cs-4,5); g.stroke(); }
      H.text(g,String(p.rule==='prod'?a*b:a+b),x+cs/2,y+cs/2,{al:'center',size:Math.min(15,cs*0.4),w:hit?800:500,c:hit?'#1c1405':TH.dim}); }
    var th=[]; for(var sm=2;sm<=12;sm++) th.push(6-Math.abs(sm-7)); var ym=Math.max(6,S.n?Math.max.apply(null,Object.keys(S.cnt).map(function(k){ return S.cnt[k]/S.n*36; }))+0.5:0)*1.1, v=H.view(ch,1.4,12.6,0,ym);
    H.axes(g,v,{box:true,xl:T('두 눈의 합'),yl:T('36번 중'),xs:1,ys:1,noVGrid:true});
    for(sm=2;sm<=12;sm++){ var l=v.sx(sm-0.4), w=v.sx(sm+0.4)-l, hi=p.rule==='sum'&&sm===p.s; g.strokeStyle=hi?C.fry:C.blu; g.lineWidth=hi?2.5:1.5; g.strokeRect(l,v.sy(th[sm-2]),w,v.sy(0)-v.sy(th[sm-2]));
      if(S.n){ var o=(S.cnt[sm]||0)/S.n*36; g.fillStyle='rgba(255,201,60,.6)'; g.fillRect(l+3,v.sy(o),w-6,v.sy(0)-v.sy(o)); } }
    H.text(g,T('파란 선: 이론, 노란 막대: 던진 결과'),ch.l,ch.t-14,{size:12,c:TH.dim}); },
  read:function(){ var p=this.p, k=cases(p), rfv=S.n?S.hit/S.n:null;
    return [['사건',rule(p),'','wide hl'],['경우의 수',String(k),'가지'],['확률 (이론)',rf(k,36)+' ≈ '+num(k/36,4),'','ok'],['던진 횟수',String(S.n),'번'],['사건이 일어난 횟수',String(S.hit),'번'],['상대도수',rfv==null?'—':num(rfv,4),'','th'],['이론과의 차이',rfv==null?'—':num(Math.abs(rfv-k/36),4),'']]; },
  record:function(){ var p=this.p, k=cases(p); if(!S.n) return '먼저 주사위를 던져 보세요'; return {k:k, pt:k/36, n:S.n, rf:S.hit/S.n}; },
  ai:function(){ var p=this.p, k=cases(p); return 'Two dice: event "'+p.rule+' s = '+p.s+'" has '+k+' of 36 equally likely outcomes, probability '+fmt(k/36,4)+'. Rolled '+S.n+' times, event happened '+S.hit+' times'+(S.n?' (relative frequency '+fmt(S.hit/S.n,4)+')':'')+'.'; }
});
})();

/* ===================== 중2 경우의 수와 확률: 몬테카를로로 원주율 ===================== */
(function(){
var MAXP=20000, S={xs:new Float32Array(MAXP), ys:new Float32Array(MAXP), ins:new Uint8Array(MAXP), n:0, k:0, inside:0, hist:[], acc:0};
function reinit(){ S.n=0; S.inside=0; S.hist=[]; S.acc=0; }
function add(k){ for(var i=0;i<k;i++){ var x=Math.random(), y=Math.random(), ok=x*x+y*y<=1; if(S.n<MAXP){ S.xs[S.n]=x; S.ys[S.n]=y; S.ins[S.n]=ok?1:0; } S.n++; if(ok) S.inside++; }
  if(S.n>0){ S.hist.push([S.n,4*S.inside/S.n]); if(S.hist.length>500){ S.hist=S.hist.filter(function(z,i){ return i%2===0; }); } } }
LAB.add({id:'m1_mcpi', cat:'math', icon:'🎯', name:'몬테카를로로 원주율 구하기', desc:'정사각형 안에 점을 무작위로 찍어 π를 어림하기',
  info:'한 변이 1인 정사각형 안에 점을 무작위로 찍어요. 반지름이 1인 사분원 안에 들어가는 점의 비율은 (사분원의 넓이) ÷ (정사각형의 넓이) = (π/4) ÷ 1이에요. 그래서 4 × (원 안의 점의 개수) ÷ (전체 점의 개수)가 π에 가까워져요. 점이 많아질수록 오차가 줄지만 점을 100배 늘려야 오차가 약 10분의 1이 되어요. 이렇게 무작위 실험으로 값을 구하는 방법을 몬테카를로 방법이라고 해요.',
  tries:['점을 100개, 1000개, 10000개 찍었을 때 π의 어림값과 오차를 비교해 보세요','같은 개수로 여러 번 다시 해서 어림값이 얼마나 달라지는지 보세요','오른쪽 그래프에서 점이 많아질수록 어림값이 어떻게 변하나요?'],
  speed:true, playLabel:'점 찍기',
  params:[{id:'rate',l:'1초에 찍는 점',min:10,max:3000,step:10,val:200,d:0,pre:[[100,'100'],[1000,'1000'],[3000,'3000']]}],
  actions:[['a1k','1000개 더 찍기'],['a100k','100000개 더 찍기']],
  act:function(k){ add(k==='a1k'?1000:100000); },
  cols:[{k:'n',l:'점의 개수',d:0},{k:'est',l:'π의 어림값',d:5},{k:'err',l:'오차',d:5}], gx:'n', gy:'est',
  reset:function(){ reinit(); },
  step:function(dt){ S.acc+=dt*this.p.rate; var k=Math.floor(S.acc); S.acc-=k; if(k>0) add(k); },
  draw:function(g,W,Hh){ var wide=W>=620, sq=Math.min(wide?W*0.5-12:W-40,wide?Hh-30:Hh*0.6-14), ox=wide?24:(W-sq)/2, oy=wide?(Hh-sq)/2:10, ch=wide?{l:W*0.5+50,t:30,w:W*0.5-70,h:Hh-90}:{l:46,t:oy+sq+34,w:W-66,h:Hh-oy-sq-72};
    g.fillStyle=TH.light?'rgba(80,70,50,.05)':'rgba(138,147,166,.06)'; g.fillRect(ox,oy,sq,sq); g.strokeStyle=TH.text; g.lineWidth=2; g.strokeRect(ox,oy,sq,sq);
    var m=Math.min(S.n,MAXP); for(var i=0;i<m;i++){ g.fillStyle=S.ins[i]?'rgba(79,157,255,.8)':'rgba(255,122,182,.8)'; g.fillRect(ox+S.xs[i]*sq-0.8,oy+sq-S.ys[i]*sq-0.8,1.7,1.7); }
    g.beginPath(); g.arc(ox,oy+sq,sq,-PI/2,0); g.strokeStyle=C.fry; g.lineWidth=2.5; g.stroke(); H.text(g,'1',ox+sq+6,oy+sq,{size:12,c:TH.dim}); H.text(g,'1',ox-6,oy,{al:'right',size:12,c:TH.dim});
    if(ch.h>50){ var mx=Math.max(100,S.n), lg=function(n){ return Math.log10(Math.max(1,n)); }, v={l:ch.l,t:ch.t,w:ch.w,h:ch.h}, x0=1, x1=lg(mx), sx=function(n){ return ch.l+(lg(n)-x0)/(x1-x0)*ch.w; }, sy=function(y){ return ch.t+ch.h*(1-(y-2.6)/1.1); };
      g.strokeStyle=TH.grid; g.lineWidth=1; for(var y=2.6;y<=3.71;y+=0.2){ g.beginPath(); g.moveTo(ch.l,sy(y)); g.lineTo(ch.l+ch.w,sy(y)); g.stroke(); H.text(g,num(y,1),ch.l-6,sy(y),{al:'right',size:10.5,c:TH.dim}); }
      for(var e=1;e<=Math.floor(x1);e++){ H.text(g,'10'+sup(e),sx(Math.pow(10,e)),ch.t+ch.h+12,{al:'center',size:11,c:TH.dim}); }
      H.seg(g,ch.l,sy(PI),ch.l+ch.w,sy(PI),C.grn,1.6,[6,4]); H.text(g,'π',ch.l+ch.w+4,sy(PI),{size:13,w:800,c:C.grn});
      var up=[],lo=[]; for(var q=10;q<=Math.pow(10,x1);q*=1.15){ var d=2*1.6422/Math.sqrt(q); up.push([sx(q),sy(Math.min(3.7,PI+d))]); lo.push([sx(q),sy(Math.max(2.6,PI-d))]); } H.line(g,up,'rgba(63,224,143,.45)',1.2); H.line(g,lo,'rgba(63,224,143,.45)',1.2);
      var pts=S.hist.filter(function(z){ return z[0]>=10; }).map(function(z){ return [sx(z[0]),sy(H.clamp(z[1],2.6,3.7))]; }); H.line(g,pts,C.fry,2);
      H.text(g,T('점의 개수 (로그 눈금)'),ch.l+ch.w,ch.t+ch.h+28,{al:'right',size:11.5,c:TH.dim}); H.text(g,T('π의 어림값'),ch.l,ch.t-12,{size:12,c:TH.dim}); }
    H.text(g,S.n?'π ≈ '+num(4*S.inside/S.n,4):'π ≈ ?',ox+sq/2,oy+14,{al:'center',size:16,w:800,c:C.fry,bg:TH.light?'rgba(255,255,255,.75)':'rgba(11,13,19,.7)'}); },
  read:function(){ var est=S.n?4*S.inside/S.n:null; return [['점의 개수',String(S.n),'개'],['원 안의 점',String(S.inside),'개'],['π의 어림값 (4 × 원 안 ÷ 전체)',est==null?'—':num(est,5),'','hl'],['실제 π',num(PI,5),''],['오차',est==null?'—':num(Math.abs(est-PI),5),'','ok'],['예상되는 오차의 크기 (≈ 1.64 ÷ √n)',S.n?num(1.6422/Math.sqrt(S.n),5):'—','','th']]; },
  record:function(){ if(!S.n) return '먼저 점을 찍어 보세요'; var est=4*S.inside/S.n; return {n:S.n, est:est, err:Math.abs(est-PI)}; },
  ai:function(){ return 'Monte Carlo estimate of pi: '+S.n+' random points in the unit square, '+S.inside+' inside the quarter circle, estimate 4*inside/n = '+(S.n?fmt(4*S.inside/S.n,5):'n/a')+' (true '+fmt(PI,5)+').'; }
});
})();

/* ===================== 중2 연립일차방정식: 두 직선과 연립방정식의 해 ===================== */
(function(){
function eq(a,b,c){ var l=''; if(a) l=(a===1?'':a===-1?MINUS:num(a,0))+'x'; if(b){ l+=(l?(b<0?' '+MINUS+' ':' + '):(b<0?MINUS:''))+(Math.abs(b)===1?'':num(Math.abs(b),0))+'y'; } if(!l) l='0'; return l+' = '+num(c,0); }
function solve(p){ if((!p.a1&&!p.b1)||(!p.a2&&!p.b2)) return {k:'bad'}; var D=p.a1*p.b2-p.a2*p.b1;
  if(D!==0) return {k:'one',D:D,x:(p.c1*p.b2-p.c2*p.b1)/D,y:(p.a1*p.c2-p.a2*p.c1)/D};
  return (p.a1*p.c2-p.a2*p.c1===0&&p.b1*p.c2-p.b2*p.c1===0)?{k:'all',D:0}:{k:'none',D:0}; }
LAB.add({id:'m1_sys', cat:'math', icon:'🔀', name:'연립방정식과 두 직선', desc:'두 일차방정식의 그래프가 만나는 점이 연립방정식의 해',
  info:'미지수가 x, y 두 개인 일차방정식 ax + by = c의 해는 무수히 많고, 그 점들을 모으면 직선이 돼요. 연립방정식 두 개를 동시에 만족하는 (x, y)는 두 직선이 만나는 점이에요. 한 점에서 만나면 해가 하나, 평행하면 해가 없고, 두 직선이 겹치면 해가 무수히 많아요. 두 식의 x 또는 y의 계수를 맞추어 더하거나 빼서 한 문자를 없애는 방법이 가감법이에요.',
  tries:['x + y = 5와 x − y = 1의 해 (3, 2)가 두 직선의 교점인지 확인해 보세요','한 식의 양변에 같은 수를 곱한 것을 두 번째 식으로 하면 직선이 어떻게 되나요?','계수는 같고 상수항만 다르게 하면 해가 몇 개인가요?'],
  noPlay:true,
  params:[{id:'a1',l:'식 ①의 x 계수',min:-9,max:9,step:1,val:1,d:0},{id:'b1',l:'식 ①의 y 계수',min:-9,max:9,step:1,val:1,d:0},{id:'c1',l:'식 ①의 우변',min:-20,max:20,step:1,val:5,d:0},
    {id:'a2',l:'식 ②의 x 계수',min:-9,max:9,step:1,val:1,d:0},{id:'b2',l:'식 ②의 y 계수',min:-9,max:9,step:1,val:-1,d:0},{id:'c2',l:'식 ②의 우변',min:-20,max:20,step:1,val:1,d:0},{id:'rg',l:'보이는 범위',min:5,max:20,step:1,val:8,d:0}],
  actions:[['one','해가 하나'],['par','평행 (해가 없음)'],['same','일치 (해가 무수히 많음)']],
  act:function(k){ var set={one:[1,1,5,1,-1,1],par:[1,1,5,2,2,6],same:[1,1,5,2,2,10]}[k]; ['a1','b1','c1','a2','b2','c2'].forEach(function(id,i){ H.setP(id,set[i]); }); },
  cols:[{k:'D',l:'a₁b₂ − a₂b₁',d:0},{k:'x',l:'해 x',d:3},{k:'y',l:'해 y',d:3}], gx:'x', gy:'y',
  reset:function(){},
  draw:function(g,W,Hh){ var p=this.p, r=R4(W,Hh), v=H.view(r,-p.rg,p.rg,-p.rg,p.rg,{equal:true}), s=solve(p); H.axes(g,v,{xl:'x',yl:'y'});
    lineABC(g,v,p.a1,p.b1,p.c1,C.fry,3); lineABC(g,v,p.a2,p.b2,p.c2,C.blu,3);
    if(s.k==='one'){ H.dot(g,v.sx(s.x),v.sy(s.y),7,C.or,TH.stage); tag(g,'('+num(s.x,2)+', '+num(s.y,2)+')',v.sx(s.x)+10,v.sy(s.y)-14,C.or); }
    tag(g,'① '+eq(p.a1,p.b1,p.c1),r.l+8,r.t+16,C.fry); tag(g,'② '+eq(p.a2,p.b2,p.c2),r.l+8,r.t+40,C.blu); },
  read:function(){ var p=this.p, s=solve(p); if(s.k==='bad') return [['알림','두 식 모두 x나 y가 들어 있어야 해요','','wide']];
    return [['식 ①',eq(p.a1,p.b1,p.c1),'','wide'],['식 ②',eq(p.a2,p.b2,p.c2),'','wide'],['a₁b₂ − a₂b₁',String(s.D),''],['해',s.k==='one'?'x = '+num(s.x,3)+', y = '+num(s.y,3):s.k==='all'?'무수히 많아요':'없어요','','wide hl'],
      ['두 직선',s.k==='one'?'한 점에서 만나요':s.k==='all'?'일치해요':'평행해요','','th']]; },
  record:function(){ var s=solve(this.p); return {D:s.D, x:s.k==='one'?s.x:null, y:s.k==='one'?s.y:null}; },
  ai:function(){ var p=this.p, s=solve(p); return 'Linear system: '+eq(p.a1,p.b1,p.c1)+' and '+eq(p.a2,p.b2,p.c2)+'. '+(s.k==='one'?'Unique solution x = '+fmt(s.x,4)+', y = '+fmt(s.y,4)+'.':s.k==='all'?'Same line, infinitely many solutions.':s.k==='none'?'Parallel lines, no solution.':'Degenerate equation.'); }
});
})();

/* ===================== 중2 연립일차방정식: 닭과 토끼 ===================== */
(function(){
function sol(p){ var r=(p.l-2*p.h)/2; if(r<0||r>p.h||r!==Math.floor(r)) return null; return {r:r,c:p.h-r}; }
function glyph(g,x,y,s,rabbit){ var lc=rabbit?'#e8e0d0':'#ffc93c';
  g.strokeStyle=TH.light?'#6d6658':'#aab2c5'; g.lineWidth=Math.max(1.5,s*0.07); g.lineCap='round'; var legs=rabbit?[-0.28,-0.1,0.1,0.28]:[-0.12,0.12]; legs.forEach(function(d){ g.beginPath(); g.moveTo(x+d*s,y+s*0.18); g.lineTo(x+d*s,y+s*0.42); g.stroke(); }); g.lineCap='butt';
  g.fillStyle=lc; g.beginPath(); g.ellipse(x,y,s*(rabbit?0.38:0.28),s*0.22,0,0,TAU); g.fill();
  if(rabbit){ g.beginPath(); g.ellipse(x+s*0.28,y-s*0.2,s*0.14,s*0.14,0,0,TAU); g.fill(); g.beginPath(); g.ellipse(x+s*0.25,y-s*0.42,s*0.04,s*0.16,0,0,TAU); g.fill(); g.beginPath(); g.ellipse(x+s*0.34,y-s*0.42,s*0.04,s*0.16,0,0,TAU); g.fill(); }
  else { g.beginPath(); g.arc(x+s*0.2,y-s*0.2,s*0.12,0,TAU); g.fill(); g.fillStyle='#ff6b6b'; g.beginPath(); g.moveTo(x+s*0.31,y-s*0.22); g.lineTo(x+s*0.42,y-s*0.18); g.lineTo(x+s*0.31,y-s*0.14); g.fill(); g.beginPath(); g.arc(x+s*0.2,y-s*0.34,s*0.05,0,TAU); g.fill(); }
  g.fillStyle='#111'; g.beginPath(); g.arc(x+(rabbit?0.3:0.22)*s,y-(rabbit?0.22:0.22)*s,Math.max(1,s*0.025),0,TAU); g.fill(); }
LAB.add({id:'m1_chicken', cat:'math', icon:'🐔', name:'닭과 토끼 (연립방정식)', desc:'머리 수와 다리 수로 닭과 토끼의 수 알아내기',
  info:'옛날 중국의 수학책 「손자산경」에 나오는 문제예요. 닭과 토끼가 모두 35마리이고 다리가 모두 94개일 때 닭과 토끼는 각각 몇 마리일까요? 닭을 x마리, 토끼를 y마리라고 하면 x + y = 35, 2x + 4y = 94이에요. 처음에 모두 닭이라고 가정하면 다리가 2 × 35 = 70개이고, 토끼로 바꿀 때마다 다리가 2개씩 늘어나므로 (94 − 70) ÷ 2 = 12마리가 토끼예요.',
  tries:['머리 35, 다리 94에서 토끼 수를 하나씩 늘리며 다리 수가 94가 되는 때를 찾아보세요','다리 수를 머리 수의 2배로 하면 토끼가 몇 마리인가요?','다리 수가 머리 수의 4배보다 크면 어떻게 되나요?'],
  hint:'토끼 수를 바꾸어 다리 수가 목표와 같아지는 곳을 찾아보세요.', noPlay:true,
  params:[{id:'h',l:'머리의 수',min:5,max:50,step:1,val:35,d:0},{id:'l',l:'다리의 수',min:10,max:200,step:2,val:94,d:0},{id:'g',l:'토끼라고 가정한 수',min:0,max:50,step:1,val:0,d:0}],
  cols:[{k:'g',l:'가정한 토끼 수',d:0},{k:'legs',l:'그때의 다리 수',d:0},{k:'diff',l:'목표와의 차',d:0}], gx:'g', gy:'legs', fit:true,
  reset:function(){},
  draw:function(g,W,Hh){ var p=this.p, h=p.h, gg=Math.min(p.g,h), cols=Math.ceil(Math.sqrt(h*W/Hh*1.0)), rows=Math.ceil(h/cols), s=Math.min((W-20)/cols,(Hh-70)/rows,64), ox=(W-cols*s)/2, oy=60+((Hh-70)-rows*s)/2;
    for(var i=0;i<h;i++){ var rabbit=i<gg; glyph(g,ox+(i%cols+0.5)*s,oy+(Math.floor(i/cols)+0.5)*s,s*0.9,rabbit); }
    var legs=2*(h-gg)+4*gg; H.text(g,F('닭 {0}마리 · 토끼 {1}마리',h-gg,gg),W/2,16,{al:'center',size:15,w:700}); H.text(g,F('다리 {0}개 (목표 {1}개)',legs,p.l),W/2,40,{al:'center',size:15,w:800,c:legs===p.l?C.grn:legs>p.l?C.red:C.fry}); },
  read:function(){ var p=this.p, s=sol(p), gg=Math.min(p.g,p.h), legs=2*(p.h-gg)+4*gg;
    return [['연립방정식','x + y = '+p.h+',  2x + 4y = '+p.l,'','wide'],['가정한 다리 수',String(legs),'개'],['목표와의 차',String(legs-p.l),'개','th'],['답',s?F('닭 {0}마리, 토끼 {1}마리',s.c,s.r):'조건에 맞는 경우가 없어요','','wide hl'],['모두 닭이라고 가정한 다리 수',String(2*p.h),'개']]; },
  record:function(){ var p=this.p, gg=Math.min(p.g,p.h), legs=2*(p.h-gg)+4*gg; return {g:gg, legs:legs, diff:legs-p.l}; },
  ai:function(){ var p=this.p, s=sol(p); return 'Chickens and rabbits: '+p.h+' heads and '+p.l+' legs, x + y = '+p.h+', 2x + 4y = '+p.l+'. '+(s?'Chickens '+s.c+', rabbits '+s.r+'.':'No valid whole-number solution.')+' Currently guessing '+Math.min(p.g,p.h)+' rabbits.'; }
});
})();

/* ===================== 중2 연립일차방정식과 일차부등식: 부등식의 해 ===================== */
(function(){
var OPS={gt:'>',ge:'≥',lt:'<',le:'≤'}, FL={gt:'lt',ge:'le',lt:'gt',le:'ge'};
function one(a,b,op,c){ if(a===0){ var t=op==='gt'?b>c:op==='ge'?b>=c:op==='lt'?b<c:b<=c; return t?{all:true}:{none:true}; }
  var x=(c-b)/a, o=a>0?op:FL[op]; return o==='gt'?{lo:x,li:false,hi:Infinity,hiInc:false}:o==='ge'?{lo:x,li:true,hi:Infinity,hiInc:false}:o==='lt'?{lo:-Infinity,li:false,hi:x,hiInc:false}:{lo:-Infinity,li:false,hi:x,hiInc:true}; }
function norm(s){ if(s.all) return {lo:-Infinity,li:false,hi:Infinity,hiInc:false}; return s; }
function meet(A,B){ if(A.none||B.none) return {none:true}; A=norm(A); B=norm(B); var lo,li,hi,hiInc;
  if(A.lo>B.lo||(A.lo===B.lo&&!A.li)){ lo=A.lo; li=A.li; } else { lo=B.lo; li=B.li; } if(A.lo===B.lo) li=A.li&&B.li;
  if(A.hi<B.hi||(A.hi===B.hi&&!A.hiInc)){ hi=A.hi; hiInc=A.hiInc; } else { hi=B.hi; hiInc=B.hiInc; } if(A.hi===B.hi) hiInc=A.hiInc&&B.hiInc;
  if(lo>hi||(lo===hi&&!(li&&hiInc))) return {none:true}; return {lo:lo,li:li,hi:hi,hiInc:hiInc}; }
function show(s){ if(s.none) return '해가 없어요'; if(s.all||(s.lo===-Infinity&&s.hi===Infinity)) return '모든 수'; var f=function(v){ return num(v,2); };
  if(s.lo===-Infinity) return 'x '+(s.hiInc?'≤':'<')+' '+f(s.hi); if(s.hi===Infinity) return 'x '+(s.li?'≥':'>')+' '+f(s.lo); if(s.lo===s.hi) return 'x = '+f(s.lo); return f(s.lo)+' '+(s.li?'≤':'<')+' x '+(s.hiInc?'≤':'<')+' '+f(s.hi); }
function holds(a,b,op,c,x){ var v=a*x+b; return op==='gt'?v>c:op==='ge'?v>=c:op==='lt'?v<c:v<=c; }
function ineq(a,b,op,c){ return lin(a,b,'x')+' '+OPS[op]+' '+num(c,0); }
LAB.add({id:'m1_ineq', cat:'math', icon:'📏', name:'일차부등식과 수직선', desc:'부등식의 해를 수직선에 나타내고 부등호 방향이 바뀌는 때 알기',
  info:'일차부등식 ax + b > c의 해는 x의 범위로 나타내요. 양변에서 b를 빼고 a로 나누면 x의 범위가 나와요. 이때 a가 음수이면 양변을 음수로 나눌 때 부등호의 방향이 바뀌어요. 수직선에서 속이 빈 동그라미(○)는 그 수를 포함하지 않고(> 또는 <), 속이 찬 동그라미(●)는 포함해요(≥ 또는 ≤). 두 부등식을 동시에 만족하는 연립부등식의 해는 두 해의 공통 범위예요.',
  tries:['a를 양수에서 음수로 바꾸고 부등호의 방향이 왜 바뀌는지 확인해 보세요','x의 값을 해의 경계 근처에서 바꾸며 부등식이 참인지 거짓인지 확인해 보세요','연립부등식을 켜고 두 해의 공통 범위가 어디인지 찾아보세요'],
  noPlay:true,
  params:[{id:'a',l:'첫째 부등식의 x 계수',min:-5,max:5,step:1,val:2,d:0},{id:'b',l:'첫째 부등식의 상수',min:-10,max:10,step:1,val:-3,d:0},{id:'op',l:'부등호',type:'seg',opts:[['gt','>'],['ge','≥'],['lt','<'],['le','≤']],val:'gt'},{id:'c',l:'첫째 부등식의 우변',min:-10,max:10,step:1,val:5,d:0},
    {id:'two',l:'연립부등식으로 보기',type:'check',val:false},{id:'a2',l:'둘째 부등식의 x 계수',min:-5,max:5,step:1,val:-1,d:0,show:function(p){ return p.two; }},{id:'b2',l:'둘째 부등식의 상수',min:-10,max:10,step:1,val:6,d:0,show:function(p){ return p.two; }},
    {id:'op2',l:'둘째 부등호',type:'seg',opts:[['gt','>'],['ge','≥'],['lt','<'],['le','≤']],val:'ge',show:function(p){ return p.two; }},{id:'c2',l:'둘째 부등식의 우변',min:-10,max:10,step:1,val:2,d:0,show:function(p){ return p.two; }},{id:'xt',l:'시험해 볼 x',min:-10,max:10,step:0.5,val:3,d:1}],
  cols:[{k:'xt',l:'시험한 x',d:1},{k:'ok',l:'참이면 1',d:0}], gx:'xt', gy:'ok',
  reset:function(){},
  sol:function(){ var p=this.p, s1=one(p.a,p.b,p.op,p.c); return {s1:s1, s2:p.two?one(p.a2,p.b2,p.op2,p.c2):null, all:p.two?meet(s1,one(p.a2,p.b2,p.op2,p.c2)):s1}; },
  draw:function(g,W,Hh){ var p=this.p, S=this.sol(), pad=26, sx=function(x){ return pad+(x+10)/20*(W-2*pad); }, rowY=p.two?[Hh*0.22,Hh*0.42,Hh*0.66]:[Hh*0.4];
    function line(y,col){ H.seg(g,sx(-10),y,sx(10),y,TH.dim,2); for(var i=-10;i<=10;i++){ H.seg(g,sx(i),y-5,sx(i),y+5,i===0?TH.text:TH.dim,i===0?2.5:1.2); if(i%2===0) H.text(g,i<0?MINUS+Math.abs(i):String(i),sx(i),y+20,{al:'center',size:11.5,c:TH.dim}); } }
    function draw1(s,y,col){ line(y); if(s.none) return; s=norm(s); var l=Math.max(-10.6,s.lo), h=Math.min(10.6,s.hi); H.seg(g,sx(l),y,sx(h),y,col,6);
      if(s.lo>-Infinity){ g.beginPath(); g.arc(sx(s.lo),y,8,0,TAU); g.fillStyle=s.li?col:TH.stage; g.fill(); g.strokeStyle=col; g.lineWidth=3; g.stroke(); } else H.arrow(g,sx(-9.6),y,sx(-10.6),y,col,6,10);
      if(s.hi<Infinity){ g.beginPath(); g.arc(sx(s.hi),y,8,0,TAU); g.fillStyle=s.hiInc?col:TH.stage; g.fill(); g.strokeStyle=col; g.lineWidth=3; g.stroke(); } else H.arrow(g,sx(9.6),y,sx(10.6),y,col,6,10); }
    draw1(S.s1,rowY[0],C.fry); H.text(g,ineq(p.a,p.b,p.op,p.c),pad,rowY[0]-30,{size:14,w:700,c:C.fry}); H.text(g,T(show(S.s1)),W-pad,rowY[0]-30,{al:'right',size:14,w:800,c:C.fry});
    if(p.two){ draw1(S.s2,rowY[1],C.blu); H.text(g,ineq(p.a2,p.b2,p.op2,p.c2),pad,rowY[1]-30,{size:14,w:700,c:C.blu}); H.text(g,T(show(S.s2)),W-pad,rowY[1]-30,{al:'right',size:14,w:800,c:C.blu});
      draw1(S.all,rowY[2],C.grn); H.text(g,T('공통 범위'),pad,rowY[2]-30,{size:14,w:700,c:C.grn}); H.text(g,T(show(S.all)),W-pad,rowY[2]-30,{al:'right',size:14,w:800,c:C.grn}); }
    var yy=rowY[rowY.length-1]; var ok1=holds(p.a,p.b,p.op,p.c,p.xt)&&(!p.two||holds(p.a2,p.b2,p.op2,p.c2,p.xt)); var xx=sx(p.xt); H.dot(g,xx,yy-24,6,ok1?C.grn:C.red,TH.stage); H.seg(g,xx,yy-18,xx,yy,ok1?C.grn:C.red,1.5,[3,3]); H.text(g,'x = '+num(p.xt,1)+'  '+T(ok1?'참':'거짓'),xx,yy-42,{al:'center',size:13,w:800,c:ok1?C.grn:C.red}); },
  read:function(){ var p=this.p, S=this.sol(), t=holds(p.a,p.b,p.op,p.c,p.xt), rows=[['부등식',ineq(p.a,p.b,p.op,p.c),'','wide'],['해',show(S.s1),'','hl'],['부등호의 방향',p.a<0?'x의 계수가 음수라서 방향이 바뀌어요':p.a===0?'x가 없어요':'그대로예요','','wide th']];
    if(p.two) rows.push(['둘째 부등식',ineq(p.a2,p.b2,p.op2,p.c2),'','wide'],['둘째 해',show(S.s2),''],['연립부등식의 해',show(S.all),'','wide ok']); rows.push([F('x = {0}일 때',num(p.xt,1)),(p.two?(t&&holds(p.a2,p.b2,p.op2,p.c2,p.xt)):t)?'참':'거짓','']); return rows; },
  record:function(){ var p=this.p; return {xt:p.xt, ok:(holds(p.a,p.b,p.op,p.c,p.xt)&&(!p.two||holds(p.a2,p.b2,p.op2,p.c2,p.xt)))?1:0}; },
  ai:function(){ var p=this.p, S=this.sol(); return 'Linear inequality '+ineq(p.a,p.b,p.op,p.c)+' has solution '+show(S.s1)+'.'+(p.two?' System with '+ineq(p.a2,p.b2,p.op2,p.c2)+': common solution '+show(S.all)+'.':''); }
});
})();

/* ===================== 중2 도형의 닮음: 닮음비, 넓이비, 부피비 ===================== */
(function(){
function cube(g,x,y,s,col){ var d=s*0.4; polyPx(g,[[x,y],[x+s,y],[x+s,y-s],[x,y-s]],col+'66',col,2); polyPx(g,[[x,y-s],[x+s,y-s],[x+s+d,y-s-d],[x+d,y-s-d]],col+'aa',col,2); polyPx(g,[[x+s,y],[x+s+d,y-d],[x+s+d,y-s-d],[x+s,y-s]],col+'44',col,2); }
LAB.add({id:'m1_similar', cat:'math', icon:'🔍', name:'닮음비와 넓이비·부피비', desc:'닮음비가 1 : k이면 넓이의 비는 1 : k², 부피의 비는 1 : k³',
  info:'한 도형을 일정한 비율로 확대하거나 축소한 도형은 원래 도형과 닮음이에요. 대응하는 변의 길이의 비를 닮음비라고 하고, 대응하는 각의 크기는 같아요. 닮음비가 1 : k이면 둘레의 비도 1 : k이고, 넓이의 비는 1 : k²이에요. 입체도형이면 부피의 비는 1 : k³이에요. 가로와 세로가 모두 k배가 되니 넓이는 k × k배이고, 높이까지 k배가 되니 부피는 k × k × k배이기 때문이에요.',
  tries:['닮음비 k = 2일 때 넓이와 부피는 각각 몇 배가 되나요?','k = 0.5로 줄이면 넓이와 부피의 비는 어떻게 되나요?','삼각형의 밑변을 바꾸어도 넓이의 비가 k²인지 확인해 보세요'],
  noPlay:true,
  params:[{id:'k',l:'닮음비 1 : k',min:0.5,max:3,step:0.1,val:2,d:1,pre:[[0.5,'0.5'],[2,'2'],[3,'3']]},{id:'bs',l:'삼각형의 밑변',min:2,max:6,step:0.5,val:4,d:1},{id:'ht',l:'삼각형의 높이',min:1,max:5,step:0.5,val:3,d:1},{id:'mode',l:'아래 그림',type:'seg',opts:[['ar','정사각형 (넓이)'],['vol','정육면체 (부피)']],val:'ar'}],
  cols:[{k:'k',l:'닮음비 k',d:1},{k:'S',l:'넓이의 비',d:2},{k:'V',l:'부피의 비',d:2}], gx:'k', gy:'S', fit:true,
  reset:function(){},
  draw:function(g,W,Hh){ var p=this.p, k=p.k, tw=p.bs*(1+k)+1.2, sc=Math.min((W-24)/tw,(Hh*0.4)/(Math.max(1,k)*p.ht)), x0=(W-tw*sc)/2, yb=14+Math.max(1,k)*p.ht*sc;
    function tri(x,y,s,col,lb){ var B=[x,y],Cc=[x+p.bs*s,y],A=[x+p.bs*0.35*s,y-p.ht*s]; polyPx(g,[B,Cc,A],col+'33',col,3); tag(g,lb(0),(B[0]+Cc[0])/2,y+14,col,'center'); tag(g,lb(1),(B[0]+A[0])/2-14,(B[1]+A[1])/2,col,'right'); }
    tri(x0,yb,sc,C.blu,function(i){ return i?'h':'a'; }); tri(x0+(p.bs+1.2)*sc,yb,sc*k,C.fry,function(i){ return i?'k·h':'k·a'; });
    var by=yb+34, bh=Hh-by-14; if(bh>50){ var s0=Math.min(bh/(1+Math.max(1,k)*1.15),(W-60)/(1+k)/1.5)*0.9, s1=s0*k, cx0=W*0.28-s0/2, cx1=W*0.56;
      if(p.mode==='ar'){ var q=Math.min(bh/(Math.max(1,k)+0.3),(W-60)/(1+k)*0.5); var y1=Hh-12; g.fillStyle='rgba(79,157,255,.45)'; g.fillRect(W*0.2,y1-q,q,q); g.strokeStyle=C.blu; g.lineWidth=2; g.strokeRect(W*0.2,y1-q,q,q); g.fillStyle='rgba(255,201,60,.35)'; g.fillRect(W*0.2+q+30,y1-q*k,q*k,q*k); g.strokeStyle=C.fry; g.strokeRect(W*0.2+q+30,y1-q*k,q*k,q*k);
        for(var i=1;i<Math.ceil(k);i++){ H.seg(g,W*0.2+q+30+i*q,y1-q*k,W*0.2+q+30+i*q,y1,'rgba(255,201,60,.6)',1); H.seg(g,W*0.2+q+30,y1-i*q,W*0.2+q+30+q*k,y1-i*q,'rgba(255,201,60,.6)',1); }
        tag(g,'1',W*0.2+q/2,y1-q/2,C.blu,'center'); tag(g,F('{0}칸 = {1}',num(k*k,2),'k²'),W*0.2+q+30+q*k/2,y1-q*k/2,C.fry,'center'); }
      else { var q2=Math.min((bh-10)/(Math.max(1,k)*1.4),(W-80)/(1+k)/1.4)*0.9, y2=Hh-14; cube(g,W*0.2,y2,q2,C.blu); cube(g,W*0.2+q2*1.4+30,y2,q2*k,C.fry); tag(g,'1',W*0.2+q2/2,y2-q2/2,C.blu,'center'); tag(g,F('{0}배 = {1}',num(k*k*k,2),'k³'),W*0.2+q2*1.4+30+q2*k/2,y2-q2*k/2,C.fry,'center'); } } },
  read:function(){ var p=this.p, k=p.k, S1=p.bs*p.ht/2; var l1=Math.hypot(p.bs*0.35,p.ht), l2=Math.hypot(p.bs*0.65,p.ht), per=p.bs+l1+l2;
    return [['닮음비','1 : '+num(k,1),'','hl'],['둘레의 비','1 : '+num(k,1),''],['넓이의 비','1 : '+num(k*k,2),'','ok'],['부피의 비','1 : '+num(k*k*k,2),'','ok'],['삼각형의 넓이 (작은 것)',num(S1,2),''],['삼각형의 넓이 (큰 것)',num(S1*k*k,2),''],['둘레 (작은 것 → 큰 것)',num(per,2)+' → '+num(per*k,2),'','wide']]; },
  record:function(){ var k=this.p.k; return {k:k, S:k*k, V:k*k*k}; },
  ai:function(){ var p=this.p; return 'Similar figures with ratio 1 : '+p.k+'. Lengths scale by '+p.k+', areas by '+fmt(p.k*p.k,3)+', volumes by '+fmt(p.k*p.k*p.k,3)+'. Triangle base '+p.bs+', height '+p.ht+'.'; }
});
})();

/* ===================== 중2 도형의 닮음: 그림자로 높이 재기 ===================== */
(function(){
var S={dir:1};
function geo(p){ var th=p.th*D2R, tn=Math.tan(th); return {th:th,tn:tn,ss:p.s/tn,ts:p.Ht/tn}; }
LAB.add({id:'m1_thales', cat:'math', icon:'🏛️', name:'그림자로 높이 재기 (탈레스)', desc:'닮음을 이용해 막대의 그림자로 나무의 높이 알아내기',
  info:'고대 그리스의 탈레스는 피라미드의 그림자로 높이를 쟀다고 해요. 같은 시각에는 햇빛이 평행하게 들어와서, 막대와 그림자가 이루는 직각삼각형과 나무와 그림자가 이루는 직각삼각형이 닮음(AA 닮음)이에요. 그래서 (막대의 높이) : (막대 그림자) = (나무의 높이) : (나무 그림자)이고, 나무의 높이는 (막대의 높이) × (나무 그림자) ÷ (막대 그림자)예요. 해가 움직여 그림자가 길어져도 이 비는 항상 같아요.',
  tries:['태양의 높이를 바꾸어 그림자가 달라져도 높이의 추정값이 일정한지 확인해 보세요','막대 높이 1.5 m, 막대 그림자 1 m, 나무 그림자 12 m일 때 나무 높이를 직접 계산해 보세요','시작을 눌러 해가 움직일 때 두 그림자의 길이의 비가 변하나요?'],
  speed:true, playLabel:'해 움직이기',
  params:[{id:'s',l:'막대의 높이',min:0.5,max:3,step:0.1,val:1.5,u:'m',d:1},{id:'Ht',l:'나무의 실제 높이',min:5,max:60,step:1,val:20,u:'m',d:0},{id:'th',l:'태양의 높이 (각도)',min:20,max:80,step:1,val:40,u:'°',d:0}],
  cols:[{k:'th',l:'태양의 높이',u:'°',d:0},{k:'ss',l:'막대 그림자',u:'m',d:2},{k:'ts',l:'나무 그림자',u:'m',d:2},{k:'est',l:'높이의 추정값',u:'m',d:2}], gx:'ts', gy:'ss', fit:true,
  reset:function(){ S.dir=1; }, step:function(dt){ var t=this.p.th+S.dir*dt*8; if(t>=80){ t=80; S.dir=-1; } else if(t<=20){ t=20; S.dir=1; } H.setP('th',t); },
  draw:function(g,W,Hh){ var p=this.p, k=geo(p), tm=1/Math.tan(20*D2R), width=p.s*tm+1+p.Ht*tm+1, sc=Math.min((W-50)/width,(Hh*0.62)/p.Ht), gy=Hh-34, xs=34+0.3*sc, xt=34+(p.s*tm+1)*sc;
    g.fillStyle=TH.light?'rgba(120,100,60,.18)':'rgba(138,147,166,.14)'; g.fillRect(0,gy,W,Hh-gy); H.seg(g,0,gy,W,gy,TH.dim,2);
    var dx=Math.cos(k.th), dy=Math.sin(k.th);
    function obj(x,h,ss,col,tree){ var top=[x,gy-h*sc], tip=[x+ss*sc,gy]; H.seg(g,x,gy,x+ss*sc,gy,'rgba(0,0,0,.55)',7); H.seg(g,top[0],top[1],tip[0],tip[1],'rgba(255,201,60,.8)',1.6,[5,4]);
      polyPx(g,[[x,gy],tip,top],col+'22',null); if(tree){ g.fillStyle='#8a5a2b'; g.fillRect(x-4,gy-h*sc,8,h*sc); g.fillStyle='rgba(63,224,143,.75)'; g.beginPath(); g.arc(x,gy-h*sc,Math.max(10,h*sc*0.17),0,TAU); g.fill(); } else { g.strokeStyle=TH.text; g.lineWidth=4; g.beginPath(); g.moveTo(x,gy); g.lineTo(x,top[1]); g.stroke(); H.dot(g,x,top[1],4,C.red); } }
    obj(xs,p.s,k.ss,C.blu,false); obj(xt,p.Ht,k.ts,C.grn,true);
    H.text(g,'☀',14+18,22,{size:26,c:C.fry}); H.text(g,num(p.th,0)+'°',14+44,22,{size:13,w:700,c:C.fry});
    tag(g,num(p.s,1)+' m',xs+10,gy-p.s*sc/2,C.blu); tag(g,num(k.ss,2)+' m',xs+k.ss*sc/2,gy+16,C.blu,'center'); tag(g,F('{0} m (추정)',num(k.ts*p.s/k.ss,1)),xt+14,gy-p.Ht*sc/2,C.grn); tag(g,num(k.ts,2)+' m',xt+k.ts*sc/2,gy+16,C.grn,'center'); },
  read:function(){ var p=this.p, k=geo(p), est=k.ts*p.s/k.ss; return [['태양의 높이 (각도)',num(p.th,0)+'°',''],['막대 : 막대 그림자',num(p.s,1)+' : '+num(k.ss,2),''],['나무 : 나무 그림자','? : '+num(k.ts,2),''],['막대 높이 ÷ 그림자',num(k.tn,3),'','th'],['나무 높이의 추정값',num(est,2),'m','hl'],['나무의 실제 높이',num(p.Ht,1),'m','ok']]; },
  record:function(){ var p=this.p, k=geo(p); return {th:p.th, ss:k.ss, ts:k.ts, est:k.ts*p.s/k.ss}; },
  ai:function(){ var p=this.p, k=geo(p); return 'Measuring a tree with shadows (similar right triangles). Stick '+p.s+' m with shadow '+fmt(k.ss,3)+' m, tree shadow '+fmt(k.ts,3)+' m, so tree height = '+fmt(k.ts*p.s/k.ss,3)+' m. Sun elevation '+p.th+' deg.'; }
});
})();

/* ===================== 중2 도형의 닮음: 평행선과 선분의 길이의 비 ===================== */
(function(){
var A=[3.6,7.4], B=[0,0], Cc=[10,0.8];
function pt(P,Q,t){ return [P[0]+(Q[0]-P[0])*t,P[1]+(Q[1]-P[1])*t]; }
function dist(P,Q){ return Math.hypot(P[0]-Q[0],P[1]-Q[1]); }
function geo(p){ var u=p.lock?p.t:p.u, D=pt(A,B,p.t), E=pt(A,Cc,u); return {u:u,D:D,E:E,AD:dist(A,D),DB:dist(D,B),AE:dist(A,E),EC:dist(E,Cc),DE:dist(D,E),BC:dist(B,Cc),AB:dist(A,B),AC:dist(A,Cc)}; }
LAB.add({id:'m1_parallel', cat:'math', icon:'📐', name:'평행선과 선분의 길이의 비', desc:'삼각형에서 DE ∥ BC이면 AD : AB = AE : AC = DE : BC',
  info:'삼각형 ABC에서 변 AB 위의 점 D와 변 AC 위의 점 E에 대해 DE ∥ BC이면 삼각형 ADE와 삼각형 ABC는 닮음이에요. 그래서 AD : AB = AE : AC = DE : BC이고, AD : DB = AE : EC예요. 거꾸로 AD : DB = AE : EC이면 DE ∥ BC예요. 특히 D, E가 각각 AB, AC의 중점이면 DE ∥ BC이고 DE = ½BC(삼각형의 중점연결정리)예요.',
  tries:['점 D를 AB 위에서 움직이며 AD : DB와 AE : EC가 같은지 확인해 보세요','D와 E가 모두 중점일 때 DE와 BC의 길이의 비를 구해 보세요','평행 조건을 끄고 점 E만 움직이면 두 비가 같아지는 곳이 DE ∥ BC인 곳인가요?'],
  noPlay:true,
  params:[{id:'t',l:'AD ÷ AB (점 D의 위치)',min:0.1,max:0.9,step:0.05,val:0.4,d:2,pre:[[0.5,'½'],[0.4,'0.4'],[0.25,'¼']]},{id:'lock',l:'DE를 BC와 평행하게 두기',type:'check',val:true},{id:'u',l:'AE ÷ AC (점 E의 위치)',min:0.1,max:0.9,step:0.05,val:0.6,d:2,show:function(p){ return !p.lock; }}],
  cols:[{k:'r1',l:'AD ÷ DB',d:3},{k:'r2',l:'AE ÷ EC',d:3},{k:'r3',l:'DE ÷ BC',d:3},{k:'t',l:'AD ÷ AB',d:2}], gx:'r1', gy:'r2', fit:true,
  reset:function(){},
  draw:function(g,W,Hh){ var p=this.p, k=geo(p), r=R4(W,Hh,16), v=H.view(r,-0.8,10.8,-0.8,8.2,{equal:true}), X=function(q){ return [v.sx(q[0]),v.sy(q[1])]; }, par=Math.abs(k.AD/k.DB-k.AE/k.EC)<1e-9;
    polyPx(g,[A,B,Cc].map(X),'rgba(79,157,255,.10)',TH.text,2.5); polyPx(g,[A,k.D,k.E].map(X),'rgba(255,201,60,.22)',null); H.seg(g,X(k.D)[0],X(k.D)[1],X(k.E)[0],X(k.E)[1],par?C.grn:C.red,3.5);
    [[A,'A',0,-16],[B,'B',-14,12],[Cc,'C',12,12],[k.D,'D',-16,0],[k.E,'E',14,-2]].forEach(function(z){ var q=X(z[0]); H.dot(g,q[0],q[1],4.5,z[1]==='D'||z[1]==='E'?C.or:C.fry,TH.stage); H.text(g,z[1],q[0]+z[2],q[1]+z[3],{al:'center',size:14,w:800}); });
    var m1=X(pt(A,k.D,0.5)), m2=X(pt(k.D,B,0.5)), m3=X(pt(A,k.E,0.5)), m4=X(pt(k.E,Cc,0.5)); tag(g,num(k.AD,2),m1[0]-18,m1[1],C.blu,'right'); tag(g,num(k.DB,2),m2[0]-18,m2[1],C.vio,'right'); tag(g,num(k.AE,2),m3[0]+18,m3[1]-4,C.blu); tag(g,num(k.EC,2),m4[0]+18,m4[1]-4,C.vio);
    var md=X(pt(k.D,k.E,0.5)); tag(g,'DE '+num(k.DE,2),md[0],md[1]-18,par?C.grn:C.red,'center'); tag(g,'BC '+num(k.BC,2),X(pt(B,Cc,0.5))[0],X(B)[1]+16,C.fry,'center'); },
  read:function(){ var p=this.p, k=geo(p), par=Math.abs(k.AD/k.DB-k.AE/k.EC)<1e-9;
    return [['AD : DB',num(k.AD,2)+' : '+num(k.DB,2),'','wide'],['AD ÷ DB',num(k.AD/k.DB,3),'','hl'],['AE ÷ EC',num(k.AE/k.EC,3),'','hl'],['AD ÷ AB',num(k.AD/k.AB,3),''],['AE ÷ AC',num(k.AE/k.AC,3),''],['DE ÷ BC',num(k.DE/k.BC,3),''],['DE와 BC',par?'평행해요 (비가 같아요)':'평행하지 않아요','','ok th']]; },
  record:function(){ var k=geo(this.p); return {r1:k.AD/k.DB, r2:k.AE/k.EC, r3:k.DE/k.BC, t:this.p.t}; },
  ai:function(){ var p=this.p, k=geo(p); return 'Triangle ABC with D on AB (AD/AB = '+p.t+') and E on AC (AE/AC = '+fmt(k.u,2)+'). AD:DB = '+fmt(k.AD/k.DB,3)+', AE:EC = '+fmt(k.AE/k.EC,3)+', DE/BC = '+fmt(k.DE/k.BC,3)+'. DE is parallel to BC exactly when AD:DB = AE:EC.'; }
});
})();

/* ===================== 중3 이차함수와 그래프: 공을 던졌을 때의 높이 ===================== */
(function(){
var S={t:0, v:null};
function land(p){ return (p.v0+Math.sqrt(p.v0*p.v0+2*p.g*p.h0))/p.g; }
function hh(p,t){ return Math.max(0,p.h0+p.v0*t-p.g/2*t*t); }
function hmax(p){ return p.h0+p.v0*p.v0/(2*p.g); }
function eqS(p){ var s='h = '+MINUS+num(p.g/2,2)+'t²'; if(p.v0>0) s+=' + '+num(p.v0,1)+'t'; if(p.h0>0) s+=' + '+num(p.h0,1); return s; }
LAB.add({id:'m1_ball', cat:'math', icon:'⚽', name:'공을 던졌을 때의 높이', desc:'시간에 따른 높이 h = −(g/2)t² + v₀t + h₀ 의 꼭짓점과 땅에 닿는 시각',
  info:'공을 위로 던지면 t초 뒤의 높이는 h = −(g/2)t² + v₀t + h₀예요. 중력 가속도 g가 9.8 m/s²이면 계수는 −4.9예요. 이것은 위로 볼록한 이차함수라서 꼭짓점에서 가장 높이 올라가요. 꼭짓점의 t 좌표는 v₀ ÷ g이고 그때의 높이가 최고점이에요. 높이가 0이 되는 t는 이차방정식의 해이고, 땅에 닿는 시각을 알려 줘요. g가 작은 달에서는 공이 훨씬 오래, 높이 날아가요.',
  tries:['처음 속도 v₀를 두 배로 하면 최고 높이는 몇 배가 되나요?','중력을 달(1.62)로 바꾸면 최고점과 땅에 닿는 시각이 어떻게 변하나요?','공이 올라갈 때와 내려올 때 같은 높이를 지나는 두 시각의 가운데가 꼭짓점의 t인지 확인해 보세요'],
  speed:true, playLabel:'던지기',
  params:[{id:'v0',l:'처음 속도 v₀',min:0,max:40,step:1,val:20,u:'m/s',d:0},{id:'h0',l:'처음 높이 h₀',min:0,max:50,step:1,val:2,u:'m',d:0},{id:'g',l:'중력 가속도 g',min:1,max:25,step:0.01,val:9.8,u:'m/s²',d:2,pre:[[9.8,'지구'],[1.62,'달'],[3.71,'화성']]}],
  cols:[{k:'t',l:'시간',u:'s',d:2},{k:'h',l:'높이',u:'m',d:2},{k:'v',l:'속도',u:'m/s',d:2}], gx:'t', gy:'h',
  reset:function(){ S.t=0; }, onPlay:function(){ if(S.t>=land(this.p)-1e-9) S.t=0; }, change:function(){ S.t=Math.min(S.t,land(this.p)); },
  step:function(dt){ var T3=land(this.p); S.t+=dt; if(S.t>=T3){ S.t=T3; return 'done'; } },
  draw:function(g,W,Hh){ var p=this.p, r=R4(W,Hh,10), T3=land(p), hm=hmax(p), sx0=r.l+60, gr={l:r.l+130,t:r.t+14,w:r.w-146,h:r.h-52}, v=S.v=H.view(gr,0,T3*1.08,0,hm*1.15), gy=gr.t+gr.h, ps=gr.h;
    var py=function(h){ return gy-h/(hm*1.15)*ps; }; H.seg(g,sx0,gy,sx0,gr.t,TH.dim,2); for(var i=0;i<=4;i++){ var hv=hm*1.1*i/4; H.seg(g,sx0-5,py(hv),sx0+5,py(hv),TH.dim,1.5); H.text(g,num(hv,0),sx0-9,py(hv),{al:'right',size:10.5,c:TH.dim}); }
    H.seg(g,r.l,gy,sx0+30,gy,TH.dim,3); var hn=hh(p,S.t); H.dot(g,sx0,py(hn),11,C.or,TH.stage); H.seg(g,sx0,py(hm),sx0+16,py(hm),C.pink,2,[3,3]);
    H.axes(g,v,{box:true,xl:T('시간 (초)'),yl:T('높이 (m)')}); var pts=[]; for(i=0;i<=80;i++){ var t=T3*i/80; pts.push([v.sx(t),v.sy(hh(p,t))]); } H.line(g,pts,C.fry,3.5);
    var ts=p.v0/p.g; H.seg(g,v.sx(ts),v.sy(hm),v.sx(ts),v.sy(0),C.vio,1.5,[5,4]); H.dot(g,v.sx(ts),v.sy(hm),6.5,C.pink,TH.stage); tag(g,F('꼭짓점 ({0}, {1})',num(ts,2),num(hm,1)),v.sx(ts)+(ts>T3/2?-10:10),v.sy(hm)-16,C.pink,ts>T3/2?'right':'left');
    H.dot(g,v.sx(T3),v.sy(0),5.5,C.grn,TH.stage); tag(g,num(T3,2)+' s',v.sx(T3),v.sy(0)-18,C.grn,'center');
    H.seg(g,v.sx(S.t),v.sy(0),v.sx(S.t),v.sy(hn),C.or,1.2,[4,4]); H.dot(g,v.sx(S.t),v.sy(hn),7,C.or,TH.stage); tag(g,eqS(p),gr.l+8,gr.t+12,C.fry); },
  read:function(){ var p=this.p, ts=p.v0/p.g; return [['식',eqS(p),'','wide hl'],['꼭짓점 (최고점)','('+num(ts,2)+' s, '+num(hmax(p),2)+' m)','','wide ok'],['땅에 닿는 시각',num(land(p),2),'s'],['지금 시각',num(S.t,2),'s'],['지금 높이',num(hh(p,S.t),2),'m','hl'],['지금 속도',num(p.v0-p.g*S.t,2),'m/s','th']]; },
  record:function(){ var p=this.p; return {t:S.t, h:hh(p,S.t), v:p.v0-p.g*S.t}; },
  ai:function(){ var p=this.p; return 'Ball thrown upward: h = -(g/2) t^2 + v0 t + h0 with g = '+p.g+', v0 = '+p.v0+', h0 = '+p.h0+'. Vertex at t = '+fmt(p.v0/p.g,3)+' s, max height '+fmt(hmax(p),3)+' m, lands at t = '+fmt(land(p),3)+' s. Now t = '+fmt(S.t,2)+' s, h = '+fmt(hh(p,S.t),2)+' m.'; },
  down:function(x){ return !!S.v&&this.move(x,0,null,true); },
  move:function(x,y,e,cap){ if(!cap||!S.v) return false; S.t=H.clamp(S.v.ix(x),0,land(this.p)); H.run(false); return true; }
});
})();

/* ===================== 중3 이차함수와 그래프: 울타리로 만든 직사각형의 넓이 ===================== */
(function(){
function dims(p){ var lim=p.wall?p.L/2:p.L/2, x=Math.min(p.x,lim-0.5), y=p.wall?p.L-2*x:p.L/2-x; return {x:x,y:y,A:x*y}; }
function amax(p){ return p.wall?p.L*p.L/8:p.L*p.L/16; }
LAB.add({id:'m1_fence', cat:'math', icon:'🐄', name:'울타리로 만든 넓이의 최댓값', desc:'길이가 정해진 울타리로 가장 넓은 직사각형을 만드는 가로 길이 찾기',
  info:'길이가 L m인 울타리로 직사각형 모양의 우리를 만들 때 가로를 x라고 하면 세로는 L/2 − x이고 넓이는 y = x(L/2 − x)예요. 이것은 위로 볼록한 이차함수이고, 꼭짓점인 x = L/4일 때 넓이가 가장 커요. 이때 가로와 세로가 같아서 정사각형이에요. 벽 한쪽을 이용하면 울타리는 세 면만 필요해서 가로가 x이면 세로는 L − 2x이고 넓이 x(L − 2x)가 최대가 되는 x는 역시 L/4예요.',
  tries:['L = 40일 때 가로를 5, 10, 15로 바꾸며 넓이를 비교하고 가장 넓은 때를 찾아보세요','넓이가 같은 가로 길이가 두 개 있나요? 두 값의 가운데는 어디인가요?','벽을 이용하면 최대 넓이가 어떻게 달라지나요?'],
  noPlay:true,
  params:[{id:'L',l:'울타리의 길이 L',min:10,max:100,step:2,val:40,u:'m',d:0},{id:'x',l:'가로 x',min:0.5,max:49.5,step:0.5,val:6,u:'m',d:1},{id:'wall',l:'벽 한쪽을 이용',type:'check',val:false}],
  cols:[{k:'x',l:'가로 x',u:'m',d:1},{k:'y',l:'세로',u:'m',d:1},{k:'A',l:'넓이',u:'m²',d:2}], gx:'x', gy:'A',
  reset:function(){},
  draw:function(g,W,Hh){ var p=this.p, d=dims(p), wide=W>=560, r1=wide?{l:6,t:6,w:W*0.42,h:Hh-12}:{l:6,t:6,w:W-12,h:Hh*0.4}, r2=wide?{l:W*0.46+40,t:30,w:W*0.54-60,h:Hh-86}:{l:44,t:Hh*0.4+30,w:W-64,h:Hh*0.6-72};
    var lim=p.L/2, sc=Math.min((r1.w-30)/lim, (r1.h-40)/(p.wall?p.L:p.L/2)), ox=r1.l+20, oy=r1.t+r1.h-14;
    g.fillStyle='rgba(63,224,143,.28)'; g.fillRect(ox,oy-d.y*sc,d.x*sc,d.y*sc); g.strokeStyle=C.or; g.lineWidth=4; g.beginPath(); g.moveTo(ox,oy-d.y*sc); g.lineTo(ox,oy); g.lineTo(ox+d.x*sc,oy); g.lineTo(ox+d.x*sc,oy-d.y*sc); if(!p.wall) g.lineTo(ox,oy-d.y*sc); g.stroke();
    if(p.wall){ H.seg(g,ox-10,oy-d.y*sc,ox+d.x*sc+10,oy-d.y*sc,TH.dim,6); H.text(g,T('벽'),ox+d.x*sc/2,oy-d.y*sc-12,{al:'center',size:12,c:TH.dim}); }
    tag(g,'x = '+num(d.x,1),ox+d.x*sc/2,oy+2,C.or,'center'); tag(g,num(d.y,1),ox-4,oy-d.y*sc/2,C.or,'right'); H.text(g,F('넓이 = {0} m²',num(d.A,2)),ox+d.x*sc/2,oy-d.y*sc/2,{al:'center',size:14,w:800,c:C.grn});
    var xl=p.L/2, ym=amax(p)*1.18, v=H.view(r2,0,xl,0,ym); H.axes(g,v,{box:true,xl:'x (m)',yl:T('넓이 (m²)'),ys:H.nice(ym,4)}); fnPlot(g,v,function(x){ return p.wall?x*(p.L-2*x):x*(p.L/2-x); },C.fry,3.5);
    H.dot(g,v.sx(p.L/4),v.sy(amax(p)),6.5,C.pink,TH.stage); tag(g,'('+num(p.L/4,1)+', '+num(amax(p),1)+')',v.sx(p.L/4),v.sy(amax(p))-18,C.pink,'center'); H.seg(g,v.sx(d.x),v.sy(0),v.sx(d.x),v.sy(d.A),C.or,1.2,[4,4]); H.dot(g,v.sx(d.x),v.sy(d.A),7,C.or,TH.stage); },
  read:function(){ var p=this.p, d=dims(p); return [['식','y = '+(p.wall?'x(L − 2x)':'x(L/2 − x)'),'','wide'],['가로 x',num(d.x,1),'m'],['세로',num(d.y,1),'m'],['넓이',num(d.A,2),'m²','hl'],['최대 넓이',num(amax(p),2),'m²','ok'],['최대가 되는 가로 x = L/4',num(p.L/4,2),'m'],['지금 넓이 / 최대 넓이',num(d.A/amax(p)*100,1),'%','th']]; },
  record:function(){ var d=dims(this.p); return {x:d.x, y:d.y, A:d.A}; },
  ai:function(){ var p=this.p, d=dims(p); return 'Fence problem: total fence '+p.L+' m'+(p.wall?' with one side along a wall':'')+'. Width x = '+fmt(d.x,2)+', other side '+fmt(d.y,2)+', area '+fmt(d.A,2)+'. Maximum area '+fmt(amax(p),2)+' at x = L/4 = '+fmt(p.L/4,2)+'.'; }
});
})();

/* ===================== 중3 이차방정식: 완전제곱식과 넓이 ===================== */
(function(){
function sol(p){ var D=p.b*p.b+4*p.c; return {D:D, x1:-p.b/2+Math.sqrt(p.c+p.b*p.b/4), x2:-p.b/2-Math.sqrt(p.c+p.b*p.b/4)}; }
LAB.add({id:'m1_square', cat:'math', icon:'🟦', name:'넓이로 이차방정식 풀기 (완전제곱식)', desc:'x² + bx = c를 정사각형을 완성하여 풀기',
  info:'x² + bx = c를 넓이 모델로 풀어 볼게요. 한 변이 x인 정사각형(x²)에 가로 b, 세로 x인 직사각형(bx)을 반으로 나누어 양옆에 붙이면 모서리가 비어 있어요. 이 빈 곳에 한 변이 b/2인 작은 정사각형((b/2)²)을 채우면 한 변이 x + b/2인 큰 정사각형이 되어요. 즉 (x + b/2)² = c + (b/2)²이고, 제곱근을 취하면 x = −b/2 ± √(c + (b/2)²)예요. 길이가 되는 x는 양수인 해예요.',
  tries:['b = 6, c = 16일 때 모서리를 채워서 한 변이 5인 큰 정사각형이 되는지 확인해 보세요','b와 c를 바꾸어 큰 정사각형의 한 변과 양의 해 x의 관계를 찾아보세요','시작을 눌러 모서리 조각이 채워지는 것을 보세요'],
  playLabel:'모서리 채우기', speed:true,
  params:[{id:'b',l:'b (x의 계수)',min:1,max:14,step:1,val:6,d:0},{id:'c',l:'c (오른쪽 상수)',min:1,max:80,step:1,val:16,d:0},{id:'t',l:'모서리 조각 채우기',min:0,max:1,step:0.01,val:1,d:2}],
  cols:[{k:'b',l:'b',d:0},{k:'c',l:'c',d:0},{k:'x1',l:'양의 해',d:3},{k:'x2',l:'음의 해',d:3}], gx:'c', gy:'x1',
  reset:function(){}, onPlay:function(){ if(this.p.t>=1) H.setP('t',0); }, step:function(dt){ var t=this.p.t+dt*0.4; if(t>=1){ H.setP('t',1); return 'done'; } H.setP('t',t); },
  draw:function(g,W,Hh){ var p=this.p, s=sol(p), x=s.x1, h=p.b/2, tot=x+h, r=R4(W,Hh,20), sc=Math.min((r.w-20)/tot,(r.h-70)/tot), ox=r.l+(r.w-tot*sc)/2, oy=r.t+50+(r.h-70-tot*sc)/2+tot*sc;
    var X=function(u){ return ox+u*sc; }, Y=function(u){ return oy-u*sc; };
    g.fillStyle='rgba(79,157,255,.55)'; g.fillRect(X(0),Y(x),x*sc,x*sc); g.fillStyle='rgba(63,224,143,.55)'; g.fillRect(X(x),Y(x),h*sc,x*sc); g.fillRect(X(0),Y(tot),x*sc,h*sc);
    var ts=Math.sqrt(p.t); g.fillStyle='rgba(255,201,60,.65)'; g.fillRect(X(x),Y(tot)+(h*sc)*(1-ts),h*sc*ts,h*sc*ts); g.strokeStyle=C.fry; g.lineWidth=2; g.setLineDash([5,4]); g.strokeRect(X(x),Y(tot),h*sc,h*sc); g.setLineDash([]);
    g.strokeStyle=TH.text; g.lineWidth=2; g.strokeRect(X(0),Y(x),x*sc,x*sc); g.strokeRect(X(x),Y(x),h*sc,x*sc); g.strokeRect(X(0),Y(tot),x*sc,h*sc);
    H.text(g,'x²',X(x/2),Y(x/2),{al:'center',size:22,w:800,c:'#fff'}); H.text(g,num(h*x,2)+' = ½bx',X(x+h/2),Y(x/2),{al:'center',size:11.5,w:700,c:'#fff'}); H.text(g,num(h*x,2),X(x/2),Y(x+h/2),{al:'center',size:12,w:700,c:'#fff'}); H.text(g,'('+num(h,2)+')² = '+num(h*h,2),X(x+h/2),Y(x+h/2)-h*sc/2-10,{al:'center',size:12,w:700,c:C.fry});
    H.text(g,'x²  +  '+p.b+'x  =  '+p.c,r.l+r.w/2,18,{al:'center',size:19,w:800,c:C.fry}); H.text(g,'(x + '+num(h,2)+')²  =  '+num(p.c+h*h,2),r.l+r.w/2,40,{al:'center',size:15,w:700,c:p.t>=1?C.grn:TH.dim}); },
  read:function(){ var p=this.p, s=sol(p); return [['방정식','x² + '+p.b+'x = '+p.c,'','wide'],['완전제곱식','(x + '+num(p.b/2,2)+')² = '+num(p.c+p.b*p.b/4,2),'','wide hl'],['큰 정사각형의 한 변 √(c + (b/2)²)',num(Math.sqrt(p.c+p.b*p.b/4),3),''],['양의 해 x',num(s.x1,3),'','ok'],['음의 해 x',num(s.x2,3),'(길이가 아니에요)'],['판별식 D = b² + 4c',num(s.D,0),'','th']]; },
  record:function(){ var p=this.p, s=sol(p); return {b:p.b, c:p.c, x1:s.x1, x2:s.x2}; },
  ai:function(){ var p=this.p, s=sol(p); return 'Completing the square: x^2 + '+p.b+'x = '+p.c+' becomes (x + '+p.b/2+')^2 = '+(p.c+p.b*p.b/4)+', so x = '+fmt(s.x1,4)+' or '+fmt(s.x2,4)+'.'; }
});
})();

/* ===================== 중3 이차방정식: 두 근과 계수의 관계 ===================== */
(function(){
function co(p){ return {a:p.a, b:-p.a*(p.al+p.be), c:p.a*p.al*p.be}; }
function expd(k){ var s=(k.a===1?'':num(k.a,0))+'x²'; if(k.b) s+=(k.b<0?' '+MINUS+' ':' + ')+(Math.abs(k.b)===1?'':num(Math.abs(k.b),0))+'x'; if(k.c) s+=(k.c<0?' '+MINUS+' ':' + ')+num(Math.abs(k.c),0); return s; }
function fct(p){ var f=function(r){ return r===0?'x':r>0?'(x '+MINUS+' '+num(r,0)+')':'(x + '+num(-r,0)+')'; }; return (p.a===1?'':num(p.a,0))+(p.al===0?'x':f(p.al))+(p.be===0?'x':f(p.be)); }
LAB.add({id:'m1_vieta', cat:'math', icon:'🧮', name:'두 근과 계수의 관계', desc:'두 근 α, β로 이차방정식을 만들고 합과 곱 확인하기',
  info:'두 근이 α, β인 이차방정식은 a(x − α)(x − β) = 0으로 쓸 수 있어요. 전개하면 ax² − a(α + β)x + aαβ = 0이에요. 그래서 ax² + bx + c = 0의 두 근에 대해 두 근의 합은 α + β = −b/a, 두 근의 곱은 αβ = c/a예요. 근을 직접 구하지 않고도 합과 곱을 계수에서 바로 알 수 있고, 두 근의 합과 곱이 주어지면 이차방정식을 만들 수 있어요. 그래프는 x축과 x = α, β에서 만나요.',
  tries:['α = 2, β = −3일 때 식을 전개하고 합 −1, 곱 −6이 계수와 맞는지 확인해 보세요','a를 1에서 3으로 바꾸면 합과 곱의 값이 변하나요?','α = β로 하면 판별식과 그래프가 어떻게 되나요?'],
  noPlay:true,
  params:[{id:'al',l:'한 근 α',min:-8,max:8,step:1,val:2,d:0},{id:'be',l:'다른 근 β',min:-8,max:8,step:1,val:-3,d:0},{id:'a',l:'이차항의 계수 a',min:1,max:3,step:1,val:1,d:0}],
  cols:[{k:'al',l:'α',d:0},{k:'be',l:'β',d:0},{k:'s',l:'두 근의 합',d:2},{k:'pr',l:'두 근의 곱',d:2}], gx:'s', gy:'pr',
  reset:function(){},
  draw:function(g,W,Hh){ var p=this.p, k=co(p), r=R4(W,Hh), mid=(p.al+p.be)/2, half=Math.max(4,Math.abs(p.al-p.be)/2+3), vy=p.a*(mid-p.al)*(mid-p.be), ym=Math.max(8,p.a*half*half*0.8), v=H.view(r,mid-half*1.25,mid+half*1.25,Math.min(vy,0)-2,Math.max(ym,2)+vy*0,{});
    H.axes(g,v,{xl:'x',yl:'y'}); fnPlot(g,v,function(x){ return p.a*(x-p.al)*(x-p.be); },C.fry,3); H.seg(g,v.sx(mid),v.t,v.sx(mid),v.t+v.h,C.vio,1.4,[6,5]);
    [p.al,p.be].forEach(function(z,i){ H.dot(g,v.sx(z),v.sy(0),6,C.grn,TH.stage); tag(g,(i?'β = ':'α = ')+num(z,0),v.sx(z),v.sy(0)+(i?-18:18),C.grn,'center'); });
    H.dot(g,v.sx(mid),v.sy(vy),5.5,C.pink,TH.stage); tag(g,'y = '+expd(k),r.l+8,r.t+16,C.fry); tag(g,'y = '+fct(p),r.l+8,r.t+40,C.blu); },
  read:function(){ var p=this.p, k=co(p); return [['인수분해한 꼴',fct(p)+' = 0','','wide hl'],['전개한 식',expd(k)+' = 0','','wide'],['두 근의 합 α + β',num(p.al+p.be,0),'','ok'],['−b ÷ a',num(-k.b/k.a,2),''],['두 근의 곱 αβ',num(p.al*p.be,0),'','ok'],['c ÷ a',num(k.c/k.a,2),''],['판별식 D = b² − 4ac',num(k.b*k.b-4*k.a*k.c,0),'','th']]; },
  record:function(){ var p=this.p; return {al:p.al, be:p.be, s:p.al+p.be, pr:p.al*p.be}; },
  ai:function(){ var p=this.p, k=co(p); return 'Quadratic with roots '+p.al+' and '+p.be+' and leading coefficient '+p.a+': '+expd(k)+' = 0. Sum of roots '+(p.al+p.be)+' = -b/a, product '+(p.al*p.be)+' = c/a.'; }
});
})();

/* ===================== 중3 삼각비: 건물의 높이 재기 ===================== */
(function(){
function geo(p){ var th=p.th*D2R, up=p.d*Math.tan(th); return {th:th,up:up,H:up+p.e,hyp:p.d/Math.cos(th)}; }
LAB.add({id:'m1_height', cat:'math', icon:'🏢', name:'각도로 건물의 높이 재기', desc:'올려다본 각과 거리로 tan을 이용해 높이 구하기',
  info:'건물에서 d m 떨어진 곳에서 꼭대기를 올려다본 각(앙각)을 θ라고 하면 눈높이 위로 건물의 높이는 d × tan θ예요. 직각삼각형에서 tan θ = (높이) ÷ (밑변)이기 때문이에요. 여기에 눈높이를 더하면 건물의 전체 높이가 되어요. 시선의 길이(빗변)는 d ÷ cos θ이고, sin θ = (높이) ÷ (빗변)이에요. 같은 각이면 거리가 달라져도 세 변의 비 sin, cos, tan은 변하지 않아요.',
  tries:['거리 40 m, 각 35°일 때 건물의 높이를 tan 35° ≈ 0.700으로 계산해 보세요','거리를 두 배로 하면 같은 건물을 보는 각이 어떻게 달라지나요?','각을 45°로 하면 높이와 거리의 관계는 어떻게 되나요?'],
  noPlay:true,
  params:[{id:'d',l:'건물까지의 거리 d',min:5,max:100,step:1,val:40,u:'m',d:0},{id:'th',l:'올려다본 각 θ',min:5,max:70,step:1,val:35,u:'°',d:0,pre:[[30,'30°'],[45,'45°'],[60,'60°']]},{id:'e',l:'눈높이',min:1,max:2,step:0.05,val:1.6,u:'m',d:2}],
  cols:[{k:'th',l:'각 θ',u:'°',d:0},{k:'d',l:'거리 d',u:'m',d:0},{k:'H',l:'건물의 높이',u:'m',d:2},{k:'tan',l:'tan θ',d:4}], gx:'d', gy:'H',
  reset:function(){},
  draw:function(g,W,Hh){ var p=this.p, k=geo(p), gy=Hh-40, sc=Math.min((W*0.72)/p.d,(Hh-90)/k.H), ox=W*0.08, bx=ox+p.d*sc, ey=gy-p.e*sc, top=gy-k.H*sc;
    g.fillStyle=TH.light?'rgba(120,100,60,.18)':'rgba(138,147,166,.14)'; g.fillRect(0,gy,W,Hh-gy); H.seg(g,0,gy,W,gy,TH.dim,2);
    g.fillStyle='rgba(79,157,255,.35)'; g.fillRect(bx,top,Math.min(70,W*0.1),gy-top); g.strokeStyle=C.blu; g.lineWidth=2.5; g.strokeRect(bx,top,Math.min(70,W*0.1),gy-top);
    H.seg(g,ox,gy,ox,ey,TH.text,5); H.dot(g,ox,ey,6,C.fry,TH.stage);
    polyPx(g,[[ox,ey],[bx,ey],[bx,top]],'rgba(255,201,60,.14)',null); H.seg(g,ox,ey,bx,ey,TH.dim,1.5,[5,4]); H.seg(g,ox,ey,bx,top,C.fry,2.8); H.seg(g,bx,ey,bx,top,C.pink,2.5); rightMark(g,bx,ey,-1,0,0,-1,12,TH.text);
    arcM(g,ox,ey,44,0,k.th,C.or,3); H.text(g,num(p.th,0)+'°',ox+64*Math.cos(k.th/2),ey-64*Math.sin(k.th/2),{size:14,w:800,c:C.or});
    tag(g,'d = '+num(p.d,0)+' m',(ox+bx)/2,ey+18,TH.dim,'center'); tag(g,num(k.up,1)+' m  (d × tan θ)',bx-10,(ey+top)/2,C.pink,'right'); tag(g,num(k.hyp,1)+' m',(ox+bx)/2-10,(ey+top)/2-14,C.fry,'right');
    H.text(g,F('건물의 높이 = {0} m',num(k.H,1)),W/2,18,{al:'center',size:18,w:800,c:C.fry}); },
  read:function(){ var p=this.p, k=geo(p); return [['건물의 높이 (눈높이 포함)',num(k.H,2),'m','hl'],['눈높이 위의 높이 d × tan θ',num(k.up,2),'m'],['시선의 길이 d ÷ cos θ',num(k.hyp,2),'m'],['sin θ',num(Math.sin(k.th),4),''],['cos θ',num(Math.cos(k.th),4),''],['tan θ',num(Math.tan(k.th),4),'','ok'],['(높이) ÷ (거리)',num(k.up/p.d,4),'','th']]; },
  record:function(){ var p=this.p, k=geo(p); return {th:p.th, d:p.d, H:k.H, tan:Math.tan(k.th)}; },
  ai:function(){ var p=this.p, k=geo(p); return 'Measuring a building with trigonometry: distance '+p.d+' m, elevation angle '+p.th+' deg, eye height '+p.e+' m. Height above eye d*tan(theta) = '+fmt(k.up,3)+' m, total '+fmt(k.H,3)+' m, line of sight '+fmt(k.hyp,3)+' m.'; }
});
})();

/* ===================== 중3 삼각비: 30°, 45°, 60°의 삼각비 ===================== */
(function(){
var EX={30:['1/2','√3/2','√3/3'],45:['√2/2','√2/2','1'],60:['√3/2','1/2','√3']};
function val(a){ var t=a*D2R; return [Math.sin(t),Math.cos(t),Math.tan(t)]; }
LAB.add({id:'m1_special', cat:'math', icon:'📐', name:'30°, 45°, 60°의 삼각비', desc:'정삼각형의 반과 정사각형의 반으로 특수각의 삼각비 구하기',
  info:'한 변의 길이가 2인 정삼각형을 반으로 자르면 세 변이 1 : √3 : 2인 직각삼각형(30°, 60°, 90°)이 돼요. 한 변이 1인 정사각형을 대각선으로 자르면 세 변이 1 : 1 : √2인 직각삼각형(45°, 45°, 90°)이 돼요. 여기서 sin 30° = 1/2, cos 30° = √3/2, tan 30° = √3/3 같은 값을 얻어요. 삼각비는 세 변의 길이의 비라서 삼각형의 크기와 관계없이 각에만 정해져요.',
  tries:['빗변의 길이를 2에서 10으로 바꿔도 sin 30°가 항상 0.5인지 확인해 보세요','sin 60°와 cos 30°를 비교해 보세요. 어떤 관계가 있나요?','45°일 때 tan이 1인 이유를 변의 길이로 설명해 보세요'],
  noPlay:true,
  params:[{id:'ang',l:'각 A',type:'seg',opts:[['30','30°'],['45','45°'],['60','60°']],val:'30'},{id:'r',l:'빗변의 길이',min:1,max:10,step:0.5,val:2,d:1}],
  cols:[{k:'ang',l:'각 A',u:'°',d:0},{k:'r',l:'빗변',d:1},{k:'sin',l:'sin A',d:4},{k:'cos',l:'cos A',d:4},{k:'tan',l:'tan A',d:4}], gx:'cos', gy:'sin',
  reset:function(){},
  draw:function(g,W,Hh){ var p=this.p, a=+p.ang, t=a*D2R, wide=W>=560, ar=wide?{l:6,t:6,w:W*0.58,h:Hh-12}:{l:6,t:6,w:W-12,h:Hh*0.62}, sc=Math.min((ar.w-120)/(p.r*Math.cos(t)),(ar.h-120)/(p.r*Math.sin(t)),150), tw=p.r*Math.cos(t)*sc, th=p.r*Math.sin(t)*sc, ox=ar.l+(ar.w-tw)/2-10, oy=ar.t+(ar.h+th)/2;
    var A=[ox,oy], B=[ox+tw,oy], Cc=[ox+tw,oy-th]; polyPx(g,[A,B,Cc],'rgba(255,201,60,.16)',C.fry,3); rightMark(g,B[0],B[1],-1,0,0,-1,13,TH.text); arcM(g,A[0],A[1],38,0,t,C.or,3); H.text(g,a+'°',A[0]+60*Math.cos(t/2),A[1]-60*Math.sin(t/2),{size:14,w:800,c:C.or});
    var ex=EX[a]; tag(g,F('빗변 {0}',num(p.r,1)),(A[0]+Cc[0])/2-14,(A[1]+Cc[1])/2-10,C.fry,'right'); tag(g,num(p.r*Math.cos(t),3)+'  ('+p.r+' × '+ex[1]+')',(A[0]+B[0])/2,A[1]+18,C.blu,'center'); tag(g,num(p.r*Math.sin(t),3)+'  ('+p.r+' × '+ex[0]+')',B[0]+8,(B[1]+Cc[1])/2,C.pink);
    var tx=wide?W*0.64:12, ty=wide?30:Hh*0.66; H.text(g,T('특수각의 삼각비'),tx,ty-16,{size:13,w:700,c:TH.dim}); var cw=wide?(W*0.36-12)/4:(W-24)/4;
    ['각','sin','cos','tan'].forEach(function(h,i){ H.text(g,h==='각'?T('각'):h,tx+i*cw+cw/2,ty+8,{al:'center',size:13,w:800,c:TH.dim}); });
    [30,45,60].forEach(function(an,j){ var on=an===a, y=ty+38+j*34; if(on){ g.fillStyle='rgba(255,201,60,.18)'; H.rrect(g,tx-4,y-15,cw*4+8,30,6); g.fill(); } H.text(g,an+'°',tx+cw/2,y,{al:'center',size:14,w:on?800:600,c:on?C.fry:TH.text}); EX[an].forEach(function(s,i){ H.text(g,s,tx+(i+1)*cw+cw/2,y,{al:'center',size:14,w:on?800:600,c:on?C.fry:TH.text}); }); }); },
  read:function(){ var p=this.p, a=+p.ang, v=val(a), ex=EX[a]; return [['sin '+a+'°',ex[0]+' ≈ '+num(v[0],4),'','wide hl'],['cos '+a+'°',ex[1]+' ≈ '+num(v[1],4),'','wide hl'],['tan '+a+'°',ex[2]+' ≈ '+num(v[2],4),'','wide hl'],['마주 보는 변',num(p.r*v[0],3),''],['이웃한 변',num(p.r*v[1],3),''],['(마주 변) ÷ (빗변)',num(p.r*v[0]/p.r,4),'','ok'],['sin² + cos²',num(v[0]*v[0]+v[1]*v[1],4),'','th']]; },
  record:function(){ var p=this.p, v=val(+p.ang); return {ang:+p.ang, r:p.r, sin:v[0], cos:v[1], tan:v[2]}; },
  ai:function(){ var p=this.p, v=val(+p.ang); return 'Special right triangle with angle '+p.ang+' deg and hypotenuse '+p.r+': sin = '+EX[p.ang][0]+' ('+fmt(v[0],4)+'), cos = '+EX[p.ang][1]+' ('+fmt(v[1],4)+'), tan = '+EX[p.ang][2]+' ('+fmt(v[2],4)+').'; }
});
})();

/* ===================== 중3 대푯값과 산포도: 편차와 분산 ===================== */
(function(){
function st(p){ var d=parseList(p.data,30); if(!d.length) return null; var n=d.length, m=d.reduce(function(a,b){ return a+b; },0)/n, dv=d.map(function(x){ return x-m; }), ss=dv.reduce(function(a,b){ return a+b*b; },0); return {d:d,n:n,m:m,dv:dv,ss:ss,vr:ss/n,sd:Math.sqrt(ss/n)}; }
LAB.add({id:'m1_dev', cat:'math', icon:'📊', name:'편차와 분산', desc:'평균에서 떨어진 정도(편차)의 제곱의 평균이 분산',
  info:'편차는 (변량) − (평균)이에요. 편차의 합은 항상 0이라서 흩어진 정도를 나타내려면 편차를 제곱해서 평균을 구해요. 이것이 분산이고, 분산의 양의 제곱근이 표준편차예요. 편차를 한 변으로 하는 정사각형의 넓이가 편차의 제곱이니, 분산은 이 정사각형들의 넓이의 평균이에요. 자료가 평균 가까이 모여 있을수록 분산과 표준편차는 작아요.',
  tries:['기본 자료 2, 4, 4, 4, 5, 5, 7, 9의 평균은 5이고 분산이 4, 표준편차가 2인지 확인해 보세요','자료 하나를 평균에서 멀리 옮기면 분산이 얼마나 커지나요?','모든 자료를 같은 값으로 하면 편차와 분산은 얼마인가요?'],
  hint:'아래 칸에 자료를 쉼표로 구분해서 써 보세요.', noPlay:true,
  params:[txt('data','자료 (쉼표로 구분)','2, 4, 4, 4, 5, 5, 7, 9',100)],
  actions:[['rnd','무작위 자료'],['out','이상한 값 더하기']],
  act:function(k){ var s=st(this.p); if(k==='rnd'){ var a=[]; for(var i=0;i<8;i++) a.push(Math.max(0,Math.round(10+3*gauss()))); H.setP('data',a.join(', ')); } else if(s) H.setP('data',(this.p.data.replace(/[\s,;]+$/,'')+', '+Math.round(s.m+3*s.sd+4)).slice(0,100)); },
  cols:[{k:'n',l:'자료의 개수',d:0},{k:'m',l:'평균',d:2},{k:'vr',l:'분산',d:3},{k:'sd',l:'표준편차',d:3}], gx:'m', gy:'sd',
  reset:function(){},
  draw:function(g,W,Hh){ var s=st(this.p); if(!s){ H.text(g,T('숫자 자료를 쉼표로 구분해서 써 주세요'),W/2,Hh/2,{al:'center',c:TH.dim,size:14}); return; }
    var lo=Math.min.apply(null,s.d), hi=Math.max.apply(null,s.d), pad=Math.max(1,(hi-lo)*0.12), x0=lo-pad, x1=hi+pad, L=30, sx=function(x){ return L+(x-x0)/(x1-x0)*(W-2*L); }, ly=Hh*0.3;
    H.seg(g,sx(x0),ly,sx(x1),ly,TH.dim,2); var xs=H.nice(x1-x0,8); for(var x=Math.ceil(x0/xs)*xs;x<=x1+1e-9;x+=xs){ H.seg(g,sx(x),ly-4,sx(x),ly+4,TH.dim,1); H.text(g,num(x,1),sx(x),ly+16,{al:'center',size:10.5,c:TH.dim}); }
    var stack={}; s.d.forEach(function(v,i){ var k=String(v), c=stack[k]=(stack[k]||0)+1, y=ly-10-(c-1)*15; H.seg(g,sx(s.m),ly-18,sx(v),ly-18,s.dv[i]<0?C.blu:C.pink,1.6); H.dot(g,sx(v),y,6,s.dv[i]<0?C.blu:C.pink,TH.stage); });
    g.fillStyle=C.red; g.beginPath(); g.moveTo(sx(s.m),ly+3); g.lineTo(sx(s.m)-7,ly+15); g.lineTo(sx(s.m)+7,ly+15); g.closePath(); g.fill(); H.text(g,F('평균 {0}',num(s.m,2)),sx(s.m),ly+30,{al:'center',size:12.5,w:800,c:C.red});
    var by=Hh*0.5, bh=Hh-by-30, srt=s.dv.map(function(d,i){ return {d:d,i:i}; }).sort(function(a,b){ return Math.abs(a.d)-Math.abs(b.d); }), maxd=Math.max.apply(null,s.dv.map(Math.abs).concat([1e-9])), sumd=s.dv.reduce(function(a,b){ return a+Math.abs(b); },0);
    var k=Math.min(bh*0.85/maxd,(W-70-Math.sqrt(s.vr)*0)/(sumd+s.n*0.35+Math.sqrt(s.vr)*1.3+0.5)), x=14, base=Hh-26; H.text(g,T('편차를 한 변으로 하는 정사각형'),14,by-6,{size:12,c:TH.dim});
    s.dv.forEach(function(d,i){ var w=Math.abs(d)*k; if(w<1.5) { x+=4; return; } g.fillStyle=d<0?'rgba(79,157,255,.5)':'rgba(255,122,182,.5)'; g.fillRect(x,base-w,w,w); g.strokeStyle=d<0?C.blu:C.pink; g.lineWidth=1.5; g.strokeRect(x,base-w,w,w); if(w>22) H.text(g,num(d*d,1),x+w/2,base-w/2,{al:'center',size:Math.min(12,w*0.4),w:700}); x+=w+5; });
    var vw=Math.sqrt(s.vr)*k; if(vw>1.5){ x=Math.max(x+10,W-vw-16); g.setLineDash([5,4]); g.strokeStyle=C.grn; g.lineWidth=2.5; g.strokeRect(x,base-vw,vw,vw); g.setLineDash([]); g.fillStyle='rgba(63,224,143,.2)'; g.fillRect(x,base-vw,vw,vw); H.text(g,F('분산 {0}',num(s.vr,2)),x+vw/2,base-vw-12,{al:'center',size:12.5,w:800,c:C.grn}); } },
  read:function(){ var s=st(this.p); if(!s) return [['자료의 개수','0','']]; return [['자료의 개수',String(s.n),'개'],['평균',num(s.m,3),'','hl'],['편차의 합',num(s.dv.reduce(function(a,b){ return a+b; },0),6),'','ok'],['(편차)²의 합',num(s.ss,3),''],['분산',num(s.vr,3),'','hl'],['표준편차',num(s.sd,3),'','hl']]; },
  record:function(){ var s=st(this.p); if(!s) return '자료를 먼저 써 주세요'; return {n:s.n, m:s.m, vr:s.vr, sd:s.sd}; },
  ai:function(){ var s=st(this.p); return 'Deviation and variance. Data: '+parseList(this.p.data,30).join(', ')+'.'+(s?' mean '+fmt(s.m,3)+', sum of squared deviations '+fmt(s.ss,3)+', variance '+fmt(s.vr,3)+', standard deviation '+fmt(s.sd,3)+'.':''); }
});
})();

/* ===================== 중3 대푯값과 산포도: 사분위수와 상자그림 ===================== */
(function(){
function med(a){ var n=a.length; return n%2?a[(n-1)/2]:(a[n/2-1]+a[n/2])/2; }
function q(p){ var d=parseList(p.data,60).sort(function(a,b){ return a-b; }); if(d.length<2) return null; var n=d.length, lo=d.slice(0,Math.floor(n/2)), hi=d.slice(Math.ceil(n/2)), q1=med(lo), q3=med(hi), iqr=q3-q1, f1=q1-1.5*iqr, f2=q3+1.5*iqr, inn=d.filter(function(x){ return x>=f1&&x<=f2; }), out=d.filter(function(x){ return x<f1||x>f2; });
  return {d:d,n:n,q1:q1,q2:med(d),q3:q3,iqr:iqr,mn:d[0],mx:d[n-1],wl:inn[0],wh:inn[inn.length-1],out:out}; }
LAB.add({id:'m1_box', cat:'math', icon:'📦', name:'사분위수와 상자그림', desc:'자료를 4등분하는 값으로 분포를 한눈에 보기',
  info:'자료를 크기순으로 늘어놓고 가운데 값이 중앙값(제2사분위수 Q₂)이에요. 중앙값을 기준으로 아래쪽 절반의 중앙값이 Q₁, 위쪽 절반의 중앙값이 Q₃이고, 이 세 값이 자료를 네 부분으로 나눠요. 상자그림은 최솟값, Q₁, Q₂, Q₃, 최댓값을 상자와 선으로 나타낸 그림이에요. Q₃ − Q₁을 사분위수 범위라고 하고, 이 범위가 클수록 자료가 넓게 흩어져 있어요. Q₁보다 1.5배 사분위수 범위 이상 벗어난 값은 이상치로 점으로 나타내요.',
  tries:['자료 하나를 아주 큰 값으로 바꾸면 상자와 이상치가 어떻게 달라지나요?','상자의 길이(사분위수 범위)가 짧을수록 자료의 분포는 어떤가요?','자료가 홀수 개일 때와 짝수 개일 때 Q₁과 Q₃을 구하는 방법을 비교해 보세요'],
  hint:'아래 칸에 자료를 쉼표로 구분해서 써 보세요.', noPlay:true,
  params:[txt('data','자료 (쉼표로 구분)','3, 5, 6, 7, 7, 8, 9, 10, 10, 11, 12, 14, 15, 30',160),{id:'ol',l:'이상치를 점으로 표시',type:'check',val:true}],
  actions:[['rnd','무작위 자료'],['out','큰 값 더하기']],
  act:function(k){ var s=q(this.p); if(k==='rnd'){ var a=[]; for(var i=0;i<15;i++) a.push(Math.max(0,Math.round(20+8*gauss()))); H.setP('data',a.join(', ')); } else if(s) H.setP('data',(this.p.data.replace(/[\s,;]+$/,'')+', '+Math.round(s.q3+3*s.iqr+6)).slice(0,160)); },
  cols:[{k:'q1',l:'Q₁',d:2},{k:'q2',l:'중앙값',d:2},{k:'q3',l:'Q₃',d:2},{k:'iqr',l:'사분위수 범위',d:2}], gx:'q1', gy:'q3',
  reset:function(){},
  draw:function(g,W,Hh){ var p=this.p, s=q(p); if(!s){ H.text(g,T('자료를 2개 이상 써 주세요'),W/2,Hh/2,{al:'center',c:TH.dim,size:14}); return; }
    var lo=s.mn, hi=s.mx, pad=Math.max(1,(hi-lo)*0.08), x0=lo-pad, x1=hi+pad, L=34, sx=function(x){ return L+(x-x0)/(x1-x0)*(W-2*L); }, by=Hh*0.42, bh=Math.min(70,Hh*0.2), ay=Hh*0.8;
    H.seg(g,sx(x0),ay,sx(x1),ay,TH.dim,2); var xs=H.nice(x1-x0,9); for(var x=Math.ceil(x0/xs)*xs;x<=x1+1e-9;x+=xs){ H.seg(g,sx(x),ay-4,sx(x),ay+4,TH.dim,1); H.text(g,num(x,1),sx(x),ay+18,{al:'center',size:11,c:TH.dim}); }
    var cnt={}; s.d.forEach(function(v){ var c=cnt[v]=(cnt[v]||0)+1; H.dot(g,sx(v),ay-12-(c-1)*11,4.5,'rgba(255,201,60,.8)'); });
    var wl=p.ol?s.wl:s.mn, wh=p.ol?s.wh:s.mx; H.seg(g,sx(wl),by,sx(s.q1),by,TH.text,2.5); H.seg(g,sx(s.q3),by,sx(wh),by,TH.text,2.5); H.seg(g,sx(wl),by-12,sx(wl),by+12,TH.text,2.5); H.seg(g,sx(wh),by-12,sx(wh),by+12,TH.text,2.5);
    g.fillStyle='rgba(79,157,255,.35)'; g.fillRect(sx(s.q1),by-bh/2,sx(s.q3)-sx(s.q1),bh); g.strokeStyle=C.blu; g.lineWidth=2.5; g.strokeRect(sx(s.q1),by-bh/2,sx(s.q3)-sx(s.q1),bh); H.seg(g,sx(s.q2),by-bh/2,sx(s.q2),by+bh/2,C.red,3.5);
    if(p.ol) s.out.forEach(function(v){ g.beginPath(); g.arc(sx(v),by,5,0,TAU); g.strokeStyle=C.pink; g.lineWidth=2.5; g.stroke(); });
    [['최솟값',s.mn,TH.dim,by+bh/2+34],['Q₁',s.q1,C.blu,by-bh/2-22],['중앙값',s.q2,C.red,by+bh/2+16],['Q₃',s.q3,C.blu,by-bh/2-22],['최댓값',s.mx,TH.dim,by+bh/2+34]].forEach(function(z){ H.text(g,(z[0].length>2&&z[0]!=='최솟값'&&z[0]!=='최댓값'?T(z[0]):T(z[0]))+' '+num(z[1],1),sx(z[1]),z[3],{al:'center',size:12,w:700,c:z[2]}); }); },
  read:function(){ var s=q(this.p); if(!s) return [['자료의 개수','0','']]; return [['최솟값',num(s.mn,2),''],['제1사분위수 Q₁',num(s.q1,2),'','hl'],['중앙값 (Q₂)',num(s.q2,2),'','hl'],['제3사분위수 Q₃',num(s.q3,2),'','hl'],['최댓값',num(s.mx,2),''],['사분위수 범위 Q₃ − Q₁',num(s.iqr,2),'','ok'],['이상치',s.out.length?s.out.map(function(v){ return num(v,2); }).join(', '):'없어요','','wide th']]; },
  record:function(){ var s=q(this.p); if(!s) return '자료를 먼저 써 주세요'; return {q1:s.q1, q2:s.q2, q3:s.q3, iqr:s.iqr}; },
  ai:function(){ var s=q(this.p); return 'Box plot. Data: '+parseList(this.p.data,60).join(', ')+'.'+(s?' min '+s.mn+', Q1 '+s.q1+', median '+s.q2+', Q3 '+s.q3+', max '+s.mx+', IQR '+s.iqr+', outliers: '+(s.out.join(', ')||'none')+'.':''); }
});
})();

/* ===================== 중3 제곱근과 실수: 넓이와 제곱근 ===================== */
(function(){
function isSq(A){ var r=Math.round(Math.sqrt(A)); return r*r===A; }
LAB.add({id:'m1_sqrtarea', cat:'math', icon:'⬛', name:'정사각형의 넓이와 제곱근', desc:'넓이가 A인 정사각형의 한 변의 길이 √A 알아보기',
  info:'넓이가 A인 정사각형의 한 변의 길이는 제곱해서 A가 되는 양수예요. 이 수를 A의 (양의) 제곱근이라 하고 √A로 나타내요. A = 4이면 한 변이 2이고, A = 2이면 한 변이 √2 ≈ 1.41421…예요. 어떤 수 A의 제곱근은 +√A와 −√A 두 개이고, 이 둘을 제곱하면 모두 A예요. A가 제곱수(1, 4, 9, 16, …)이면 제곱근이 자연수이고, 제곱수가 아닌 자연수의 제곱근은 소수점 아래가 불규칙하게 끝없이 이어지는 무리수예요.',
  tries:['A를 1, 4, 9, 16, 25로 바꾸며 한 변이 자연수가 되는 때를 찾아보세요','A = 2, 3, 5의 한 변이 어느 두 자연수 사이에 있는지 말해 보세요','(√A)²이 왜 항상 A인지 정사각형으로 설명해 보세요'],
  noPlay:true,
  params:[{id:'A',l:'정사각형의 넓이 A',min:1,max:200,step:1,val:20,d:0,pre:[[2,'2'],[9,'9'],[20,'20'],[100,'100']]}],
  cols:[{k:'A',l:'넓이 A',d:0},{k:'rt',l:'√A',d:6},{k:'sq',l:'제곱수이면 1',d:0}], gx:'A', gy:'rt', fit:true,
  reset:function(){},
  draw:function(g,W,Hh){ var A=this.p.A, s=Math.sqrt(A), n=Math.floor(s+1e-9), wide=W>=560, ar=wide?{l:6,t:6,w:W-12,h:Hh*0.72}:{l:6,t:6,w:W-12,h:Hh*0.66}, sc=Math.min((ar.w-60)/s,(ar.h-40)/s), ox=ar.l+(ar.w-s*sc)/2, oy=ar.t+ar.h-6;
    g.fillStyle='rgba(255,138,61,.4)'; g.fillRect(ox,oy-s*sc,s*sc,s*sc); g.fillStyle='rgba(79,157,255,.5)'; g.fillRect(ox,oy-n*sc,n*sc,n*sc);
    if(A<=100){ g.strokeStyle='rgba(255,255,255,.2)'; g.lineWidth=1; for(var i=1;i<A;i++){ var u=Math.sqrt(i); } }
    g.strokeStyle=TH.text; g.lineWidth=2.5; g.strokeRect(ox,oy-s*sc,s*sc,s*sc); if(n>0){ g.strokeStyle=C.blu; g.lineWidth=2; g.strokeRect(ox,oy-n*sc,n*sc,n*sc); for(i=1;i<n;i++){ H.seg(g,ox+i*sc,oy-n*sc,ox+i*sc,oy,'rgba(79,157,255,.5)',1); H.seg(g,ox,oy-i*sc,ox+n*sc,oy-i*sc,'rgba(79,157,255,.5)',1); } }
    H.text(g,F('넓이 {0}',A),ox+s*sc/2,oy-s*sc/2,{al:'center',size:Math.min(24,s*sc*0.18+8),w:800,c:'#fff'}); tag(g,'√'+A+' ≈ '+num(s,4),ox+s*sc/2,oy+14,C.fry,'center'); tag(g,'√'+A,ox-8,oy-s*sc/2,C.fry,'right');
    var ny=Hh-34, nx0=30, nx1=W-30, mx=Math.max(4,Math.ceil(s)+1), sx=function(x){ return nx0+x/mx*(nx1-nx0); }; H.seg(g,nx0,ny,nx1,ny,TH.dim,2.5); for(i=0;i<=mx;i++){ H.seg(g,sx(i),ny-5,sx(i),ny+5,TH.dim,1.5); H.text(g,String(i),sx(i),ny+16,{al:'center',size:11.5,c:TH.dim}); }
    H.dot(g,sx(s),ny,7,C.fry,TH.stage); tag(g,'√'+A,sx(s),ny-20,C.fry,'center'); },
  read:function(){ var A=this.p.A, s=Math.sqrt(A), n=Math.floor(s+1e-9), sq=isSq(A); return [['제곱근 √A',num(s,6),'','hl'],['제곱근',sq?'±'+Math.round(s):'± √'+A,'','ok'],['(√A)²',num(s*s,6),''],['종류',sq?'제곱수 (제곱근이 자연수)':'무리수 (순환하지 않는 무한소수)','','wide th'],[F('{0}과 {1} 사이',n,n+1),sq?'—':n+' < √'+A+' < '+(n+1),'','wide']]; },
  record:function(){ var A=this.p.A; return {A:A, rt:Math.sqrt(A), sq:isSq(A)?1:0}; },
  ai:function(){ var A=this.p.A; return 'Square of area '+A+' has side sqrt('+A+') = '+fmt(Math.sqrt(A),6)+'. '+(isSq(A)?'It is a perfect square so the root is an integer.':'It is not a perfect square, so the root is irrational.'); }
});
})();

/* ===================== 중3 제곱근과 실수: 피타고라스 나선 ===================== */
(function(){
var S={t:0};
function pts(n){ var P=[[0,0],[1,0]]; for(var k=1;k<=n;k++){ var a=P[k], l=Math.hypot(a[0],a[1]), u=[a[0]/l,a[1]/l]; P.push([a[0]+(-u[1]),a[1]+u[0]]); } return P; }
var COL=[C.fry,C.blu,C.grn,C.pink,C.cyan,C.or,C.vio];
LAB.add({id:'m1_spiral', cat:'math', icon:'🌀', name:'피타고라스 나선과 제곱근', desc:'직각삼각형을 이어 붙여 √2, √3, √4, … 의 길이 만들기',
  info:'한 변이 1인 직각이등변삼각형에서 빗변의 길이는 피타고라스 정리에 의해 √2예요. 이 빗변과 길이 1인 선분을 두 변으로 하는 직각삼각형을 이어 붙이면 새 빗변은 √3, 다시 √4 = 2, √5, … 가 돼요. 이렇게 계속 이어 붙이면 나선 모양이 되고 고대 그리스의 테오도로스가 만들었다고 해요. 원점에서 각 점까지의 길이를 컴퍼스로 수직선에 옮기면 √2, √3, √5, … 를 수직선 위에 나타낼 수 있어요.',
  tries:['삼각형을 하나씩 늘리며 새 빗변의 길이가 √3, √4, √5로 늘어나는 것을 확인해 보세요','수직선의 점 가운데 √4는 어디에 놓이나요?','삼각형의 수가 17개에 가까워질 때 나선이 한 바퀴를 거의 다 돌아요. 이유를 생각해 보세요'],
  playLabel:'나선 그리기', speed:true,
  params:[{id:'n',l:'이어 붙인 삼각형의 수',min:1,max:17,step:1,val:8,d:0}],
  cols:[{k:'n',l:'삼각형의 수',d:0},{k:'h',l:'마지막 빗변',d:4},{k:'ang',l:'돌아간 각',u:'°',d:2}], gx:'n', gy:'h', fit:true,
  reset:function(){ S.t=this.p.n; }, onPlay:function(){ S.t=0; H.setP('n',1); },
  step:function(dt){ S.t+=dt*1.2; var k=Math.min(17,Math.max(1,Math.floor(S.t)+1)); if(k!==this.p.n) H.setP('n',k); if(S.t>=17) return 'done'; },
  draw:function(g,W,Hh){ var n=this.p.n, P=pts(n), R=Math.sqrt(n+1), wide=W>=560, ar={l:6,t:6,w:W-12,h:Hh*0.78}, sc=Math.min(ar.w/(2*R+0.6),ar.h/(2*R+0.6)), cx=ar.l+ar.w/2, cy=ar.t+ar.h/2, X=function(q){ return [cx+q[0]*sc,cy-q[1]*sc]; };
    for(var k=1;k<=n;k++){ var a=X(P[0]), b=X(P[k]), c=X(P[k+1]); polyPx(g,[a,b,c],COL[(k-1)%COL.length]+'55',COL[(k-1)%COL.length],1.6); }
    var o=X(P[0]); for(k=1;k<=n;k++){ var q=X(P[k+1]), l=Math.sqrt(k+1); if(n<=10||k===n||k%2===0){ H.text(g,'√'+(k+1),q[0]+(q[0]-o[0])*0.07,q[1]+(q[1]-o[1])*0.07,{al:'center',size:Math.max(10,Math.min(14,sc*0.3)),w:700,c:k===n?C.fry:TH.text}); } }
    H.dot(g,o[0],o[1],4,TH.text); var ny=Hh-34, nx0=26, nx1=W-26, mx=Math.ceil(R)+0.4, sx=function(x){ return nx0+x/mx*(nx1-nx0); }; H.seg(g,nx0,ny,nx1,ny,TH.dim,2.5);
    for(var i=0;i<=Math.ceil(R);i++){ H.seg(g,sx(i),ny-5,sx(i),ny+5,TH.dim,1.5); H.text(g,String(i),sx(i),ny+16,{al:'center',size:11.5,c:TH.dim}); }
    for(k=1;k<=n;k++){ var r=Math.sqrt(k+1); H.dot(g,sx(r),ny,k===n?5.5:3.5,k===n?C.fry:C.blu); if(k===n||n<=8) H.text(g,'√'+(k+1),sx(r),ny-16-(k%2)*12,{al:'center',size:10.5,c:k===n?C.fry:TH.dim,w:k===n?800:500}); } },
  read:function(){ var n=this.p.n, ang=0; for(var k=1;k<=n;k++) ang+=Math.atan(1/Math.sqrt(k)); return [['삼각형의 수',String(n),'개'],['마지막 빗변',n+1===Math.round(Math.sqrt(n+1))*Math.round(Math.sqrt(n+1))?'√'+(n+1)+' = '+Math.round(Math.sqrt(n+1)):'√'+(n+1)+' ≈ '+num(Math.sqrt(n+1),4),'','wide hl'],['마지막 삼각형의 세 변','√'+n+', 1, √'+(n+1),'','wide'],['(밑변)² + 1² = (빗변)²',num(n,0)+' + 1 = '+(n+1),'','ok'],['원점에서 돌아간 각',num(ang/D2R,1),'°','th']]; },
  record:function(){ var n=this.p.n, ang=0; for(var k=1;k<=n;k++) ang+=Math.atan(1/Math.sqrt(k)); return {n:n, h:Math.sqrt(n+1), ang:ang/D2R}; },
  ai:function(){ var n=this.p.n; return 'Spiral of Theodorus with '+n+' right triangles: hypotenuses sqrt(2), sqrt(3), ..., sqrt('+(n+1)+') = '+fmt(Math.sqrt(n+1),4)+'. Each new triangle has legs sqrt(k) and 1.'; }
});
})();

/* ===================== 중3 제곱근과 실수: 제곱근 어림하기 ===================== */
(function(){
var S={t:0};
function run(n,k){ var lo=Math.floor(Math.sqrt(n)), hi=lo+1, rows=[]; for(var i=1;i<=k;i++){ var m=(lo+hi)/2, sq=m*m, low=sq<n; rows.push({i:i,lo:lo,hi:hi,m:m,sq:sq,low:low}); if(sq===n){ lo=hi=m; } else if(low) lo=m; else hi=m; } return {lo:lo,hi:hi,rows:rows}; }
LAB.add({id:'m1_approx', cat:'math', icon:'🔬', name:'제곱근의 값 어림하기', desc:'구간을 반으로 나누어 √n에 점점 가까이 다가가기',
  info:'√2는 제곱해서 2가 되는 수예요. 1² = 1 < 2 < 4 = 2²이므로 1 < √2 < 2예요. 구간의 가운데 값 1.5의 제곱이 2.25로 2보다 크니 1 < √2 < 1.5이에요. 이렇게 구간을 반으로 줄이는 일을 계속하면 √2 = 1.41421356…에 한없이 가까워져요. 단계마다 구간의 길이는 절반이 되어 한 단계에 약 0.3자리씩 정확해져요. 무리수의 소수 표현은 끝나지도 않고 반복되지도 않아요.',
  tries:['n = 2에서 단계를 늘리며 구간이 1 < √2 < 2에서 어떻게 좁혀지는지 보세요','n = 10으로 바꾸어 3 < √10 < 4에서 시작하는 것을 확인해 보세요','n = 16처럼 제곱수이면 구간이 어떻게 되나요?'],
  playLabel:'어림하기', speed:true,
  params:[{id:'n',l:'어림할 수 n',min:2,max:99,step:1,val:2,d:0,pre:[[2,'2'],[3,'3'],[5,'5'],[10,'10']]},{id:'st',l:'단계',min:0,max:20,step:1,val:4,d:0}],
  cols:[{k:'st',l:'단계',d:0},{k:'est',l:'근삿값',d:8},{k:'err',l:'오차',d:8}], gx:'st', gy:'err',
  reset:function(){ S.t=this.p.st; }, onPlay:function(){ if(this.p.st>=20){ H.setP('st',0); } S.t=this.p.st; },
  change:function(id){ S.t=this.p.st; },
  step:function(dt){ S.t+=dt*1.2; var k=Math.min(20,Math.floor(S.t)); if(k!==this.p.st) H.setP('st',k); if(S.t>=20) return 'done'; },
  draw:function(g,W,Hh){ var p=this.p, r=run(p.n,p.st), rt=Math.sqrt(p.n), w=r.hi-r.lo, pad=26, x0=r.lo-w*0.15, x1=r.hi+w*0.15, sx=function(x){ return pad+(x-x0)/(x1-x0)*(W-2*pad); }, y=Hh*0.2;
    H.seg(g,sx(x0),y,sx(x1),y,TH.dim,2); H.seg(g,sx(r.lo),y,sx(r.hi),y,C.fry,6); [r.lo,r.hi].forEach(function(v,i){ H.seg(g,sx(v),y-10,sx(v),y+10,C.fry,3); H.text(g,num(v,Math.min(10,2+Math.floor(p.st*0.31)+1)),sx(v),y+26,{al:'center',size:12,w:700,c:C.fry}); });
    H.dot(g,sx(rt),y,6.5,C.grn,TH.stage); tag(g,'√'+p.n,sx(rt),y-24,C.grn,'center'); H.text(g,F('구간의 길이 = {0}',num(w,8)),W/2,y-58,{al:'center',size:14,w:700});
    var rows=run(p.n,p.st).rows.slice(-9), ty=Hh*0.36, rh=Math.min(28,(Hh-ty-16)/Math.max(1,rows.length+1)), cw=[0.08,0.28,0.5,0.72,0.92];
    ['단계','작은 쪽','가운데 값 m','m²','m²과 n'].forEach(function(h,i){ H.text(g,T(h),W*cw[i],ty,{al:'center',size:12,w:800,c:TH.dim}); });
    rows.forEach(function(z,j){ var yy=ty+(j+1)*rh; H.text(g,String(z.i),W*cw[0],yy,{al:'center',size:12.5}); H.text(g,num(z.lo,6),W*cw[1],yy,{al:'center',size:12.5}); H.text(g,num(z.m,6),W*cw[2],yy,{al:'center',size:12.5,c:C.fry}); H.text(g,num(z.sq,6),W*cw[3],yy,{al:'center',size:12.5}); H.text(g,z.sq===p.n?'= '+p.n:z.low?'< '+p.n:'> '+p.n,W*cw[4],yy,{al:'center',size:12.5,w:700,c:z.low?C.blu:C.pink}); }); },
  read:function(){ var p=this.p, r=run(p.n,p.st), rt=Math.sqrt(p.n), est=(r.lo+r.hi)/2; return [['단계',String(p.st),''],['구간',num(r.lo,8)+' ≤ √'+p.n+' ≤ '+num(r.hi,8),'','wide hl'],['구간의 길이',num(r.hi-r.lo,8),''],['근삿값 (구간의 가운데)',num(est,8),'','ok'],['실제 √'+p.n,num(rt,8),''],['오차',num(Math.abs(est-rt),8),'','th']]; },
  record:function(){ var p=this.p, r=run(p.n,p.st), rt=Math.sqrt(p.n), est=(r.lo+r.hi)/2; return {st:p.st, est:est, err:Math.abs(est-rt)}; },
  ai:function(){ var p=this.p, r=run(p.n,p.st); return 'Approximating sqrt('+p.n+') by bisection, step '+p.st+': '+fmt(r.lo,8)+' <= sqrt('+p.n+') <= '+fmt(r.hi,8)+' (true value '+fmt(Math.sqrt(p.n),8)+').'; }
});
})();

/* ===================== 중3 다항식의 곱셈과 인수분해: 곱셈 공식의 넓이 모델 ===================== */
(function(){
function ab(p){ var a=p.a, b=p.mode==='p'?p.b:Math.min(p.b,a-1); return {a:a,b:b}; }
LAB.add({id:'m1_areamul', cat:'math', icon:'🟩', name:'곱셈 공식의 넓이 모델', desc:'(a + b)², (a − b)², (a + b)(a − b)를 넓이로 확인하기',
  info:'한 변이 a + b인 정사각형을 a², ab, ab, b² 네 조각으로 나누면 (a + b)² = a² + 2ab + b²임을 알 수 있어요. 한 변이 a인 정사각형에서 폭이 b인 띠 두 개를 빼면 겹친 b²를 두 번 뺀 셈이라서 다시 더해 (a − b)² = a² − 2ab + b²이에요. 한 변이 a인 정사각형에서 한 변이 b인 정사각형을 잘라 낸 ㄴ자 모양을 재배열하면 가로 a + b, 세로 a − b인 직사각형이 되어 (a + b)(a − b) = a² − b²이에요.',
  tries:['a = 5, b = 2일 때 (a + b)² = 49를 네 조각의 넓이 25 + 10 + 10 + 4로 확인해 보세요','b를 키우며 (a − b)² 의 파란 정사각형이 어떻게 작아지는지 보세요','합차 공식에서 ㄴ자 모양과 직사각형의 넓이가 같은지 확인해 보세요'],
  noPlay:true,
  params:[{id:'mode',l:'공식',type:'seg',opts:[['p','(a + b)²'],['m','(a − b)²'],['d','(a + b)(a − b)']],val:'p'},{id:'a',l:'a',min:2,max:12,step:1,val:5,d:0},{id:'b',l:'b',min:1,max:10,step:1,val:2,d:0}],
  cols:[{k:'a',l:'a',d:0},{k:'b',l:'b',d:0},{k:'lhs',l:'왼쪽의 값',d:0},{k:'rhs',l:'오른쪽의 값',d:0}], gx:'lhs', gy:'rhs',
  reset:function(){},
  val:function(){ var o=ab(this.p), a=o.a, b=o.b, m=this.p.mode; return m==='p'?[(a+b)*(a+b),a*a+2*a*b+b*b]:m==='m'?[(a-b)*(a-b),a*a-2*a*b+b*b]:[(a+b)*(a-b),a*a-b*b]; },
  draw:function(g,W,Hh){ var p=this.p, o=ab(p), a=o.a, b=o.b, m=p.mode, r=R4(W,Hh,16), top=44;
    function rect(x,y,w,h,col,lb,dim,sc,oy,ox){ g.fillStyle=col+'88'; g.fillRect(ox+x*sc,oy-(y+h)*sc,w*sc,h*sc); g.strokeStyle=col; g.lineWidth=2; g.strokeRect(ox+x*sc,oy-(y+h)*sc,w*sc,h*sc); if(lb) H.text(g,lb,ox+(x+w/2)*sc,oy-(y+h/2)*sc,{al:'center',size:Math.max(10,Math.min(16,Math.min(w,h)*sc*0.45)),w:800,c:'#fff'}); }
    if(m==='p'){ var s=a+b, sc=Math.min((r.w-20)/s,(r.h-top-20)/s), ox=r.l+(r.w-s*sc)/2, oy=r.t+top+s*sc+(r.h-top-s*sc)/2-6;
      rect(0,0,a,a,C.blu,'a² = '+a*a,0,sc,oy,ox); rect(a,0,b,a,C.grn,'ab = '+a*b,0,sc,oy,ox); rect(0,a,a,b,C.grn,'ab = '+a*b,0,sc,oy,ox); rect(a,a,b,b,C.fry,'b² = '+b*b,0,sc,oy,ox);
      H.text(g,'(a + b)² = a² + 2ab + b²',r.l+r.w/2,20,{al:'center',size:18,w:800,c:C.fry}); H.text(g,'('+a+' + '+b+')² = '+(a*a)+' + '+(2*a*b)+' + '+(b*b)+' = '+(a+b)*(a+b),r.l+r.w/2,42,{al:'center',size:13,c:TH.dim}); }
    else if(m==='m'){ var sc2=Math.min((r.w-20)/a,(r.h-top-20)/a), ox2=r.l+(r.w-a*sc2)/2, oy2=r.t+top+a*sc2+(r.h-top-a*sc2)/2-6, c=a-b;
      rect(0,0,c,c,C.blu,'(a − b)² = '+c*c,0,sc2,oy2,ox2); rect(c,0,b,c,C.pink,'b(a − b)',0,sc2,oy2,ox2); rect(0,c,c,b,C.pink,'b(a − b)',0,sc2,oy2,ox2); rect(c,c,b,b,C.fry,'b² = '+b*b,0,sc2,oy2,ox2);
      H.text(g,'(a − b)² = a² − 2ab + b²',r.l+r.w/2,20,{al:'center',size:18,w:800,c:C.fry}); H.text(g,'('+a+' − '+b+')² = '+(a*a)+' − '+(2*a*b)+' + '+(b*b)+' = '+c*c,r.l+r.w/2,42,{al:'center',size:13,c:TH.dim}); }
    else { var tw=a+(a+b)+1.5, sc3=Math.min((r.w-20)/tw,(r.h-top-30)/a), ox3=r.l+(r.w-tw*sc3)/2, oy3=r.t+top+a*sc3+(r.h-top-a*sc3)/2-10, c3=a-b;
      rect(0,0,a,c3,C.blu,'a(a − b)',0,sc3,oy3,ox3); rect(0,c3,c3,b,C.pink,'',0,sc3,oy3,ox3); g.strokeStyle=C.fry; g.lineWidth=2; g.setLineDash([5,4]); g.strokeRect(ox3+c3*sc3,oy3-a*sc3,b*sc3,b*sc3); g.setLineDash([]); H.text(g,'b²',ox3+(c3+b/2)*sc3,oy3-(a-b/2)*sc3,{al:'center',size:12,w:700,c:C.fry});
      var x2=a+1.5; rect(x2,0,a,c3,C.blu,'',0,sc3,oy3,ox3); rect(x2+a,0,b,c3,C.pink,'b(a − b)',0,sc3,oy3,ox3); H.text(g,'a² − b²',ox3+(c3/2)*sc3,oy3-(a-b/2)*sc3,{al:'center',size:13,w:800,c:'#fff'}); H.text(g,'(a + b)(a − b)',ox3+(x2+(a+b)/2)*sc3,oy3-c3*sc3-12,{al:'center',size:13,w:800,c:C.fry}); H.text(g,'→',ox3+(a+0.75)*sc3,oy3-a*sc3/2,{al:'center',size:22,c:TH.dim});
      H.text(g,'(a + b)(a − b) = a² − b²',r.l+r.w/2,20,{al:'center',size:18,w:800,c:C.fry}); H.text(g,'('+a+' + '+b+')('+a+' − '+b+') = '+(a*a)+' − '+(b*b)+' = '+(a*a-b*b),r.l+r.w/2,42,{al:'center',size:13,c:TH.dim}); } },
  read:function(){ var o=ab(this.p), v=this.val(), m=this.p.mode; return [['공식',m==='p'?'(a + b)² = a² + 2ab + b²':m==='m'?'(a − b)² = a² − 2ab + b²':'(a + b)(a − b) = a² − b²','','wide'],['a, b',o.a+', '+o.b,''],['왼쪽의 값',String(v[0]),'','hl'],['오른쪽의 값',String(v[1]),'','hl'],['두 값이',v[0]===v[1]?'같아요':'달라요','','ok']]; },
  record:function(){ var o=ab(this.p), v=this.val(); return {a:o.a, b:o.b, lhs:v[0], rhs:v[1]}; },
  ai:function(){ var o=ab(this.p), v=this.val(); return 'Area model of the product formula '+this.p.mode+' with a = '+o.a+', b = '+o.b+': left side '+v[0]+', right side '+v[1]+'.'; }
});
})();

/* ===================== 중3 다항식의 곱셈과 인수분해: 타일로 인수분해 ===================== */
(function(){
function pairs(p,q){ var o=[]; for(var m=0;m<=Math.floor(p/2);m++){ var n=p-m; if(m*n===q) o.push([m,n]); } return o; }
function qf(q){ var o=[]; for(var m=1;m*m<=Math.max(q,1);m++) if(q%m===0) o.push([m,q/m]); return o; }
LAB.add({id:'m1_xtiles', cat:'math', icon:'🧱', name:'타일로 인수분해하기', desc:'x² 타일 1개, x 타일 p개, 1 타일 q개로 직사각형 만들기',
  info:'한 변이 x인 정사각형 타일(x²) 1개, 가로 1 세로 x인 직사각형 타일(x) p개, 한 변이 1인 정사각형 타일(1) q개를 모아 직사각형을 만들어 볼게요. 가로가 x + m, 세로가 x + n인 직사각형이면 넓이는 (x + m)(x + n) = x² + (m + n)x + mn이에요. 그래서 x² + px + q를 인수분해하려면 합이 p이고 곱이 q인 두 수 m, n을 찾으면 돼요. 그런 두 수가 없으면 직사각형이 만들어지지 않아요.',
  tries:['p = 5, q = 6일 때 합이 5, 곱이 6인 두 수를 찾아 직사각형이 되는지 확인해 보세요','p = 4, q = 4이면 어떤 모양의 직사각형이 되나요?','p = 5, q = 7처럼 직사각형이 안 되는 경우를 찾아보세요'],
  noPlay:true,
  params:[{id:'p',l:'x 타일의 수 p',min:0,max:20,step:1,val:5,d:0},{id:'q',l:'1 타일의 수 q',min:0,max:100,step:1,val:6,d:0},{id:'xv',l:'x의 길이 (그림)',min:2.5,max:5.5,step:0.1,val:3.3,d:1}],
  cols:[{k:'p',l:'p',d:0},{k:'q',l:'q',d:0},{k:'m',l:'작은 수 m',d:0},{k:'n',l:'큰 수 n',d:0}], gx:'p', gy:'q',
  reset:function(){},
  draw:function(g,W,Hh){ var p=this.p, ps=pairs(p.p,p.q), X=p.xv; H.text(g,'x² + '+p.p+'x + '+p.q,W/2,20,{al:'center',size:19,w:800,c:C.fry});
    if(!ps.length){ H.text(g,T('직사각형이 만들어지지 않아요'),W/2,Hh*0.4,{al:'center',size:17,w:800,c:C.red}); H.text(g,F('합이 {0}이고 곱이 {1}인 두 정수가 없어요',p.p,p.q),W/2,Hh*0.4+28,{al:'center',size:13.5,c:TH.dim});
      var us=Math.min(34,(W-40)/(X+p.p*0.3+4)); var x=20,y=Hh*0.58; g.fillStyle='rgba(79,157,255,.55)'; g.fillRect(x,y-X*us,X*us,X*us); H.text(g,'x²',x+X*us/2,y-X*us/2,{al:'center',size:16,w:800,c:'#fff'}); x+=X*us+10; for(var i=0;i<Math.min(p.p,10);i++){ g.fillStyle='rgba(63,224,143,.6)'; g.fillRect(x,y-X*us,us,X*us); x+=us+4; } for(i=0;i<Math.min(p.q,20);i++){ g.fillStyle='rgba(255,201,60,.7)'; g.fillRect(x+(i%5)*(us*0.5+2),y-us*0.5-Math.floor(i/5)*(us*0.5+2),us*0.5,us*0.5); }
      var pr=qf(p.q).map(function(z){ return z[0]+' × '+z[1]+' → '+(z[0]+z[1]); }); H.text(g,F('곱이 {0}인 두 수와 그 합',p.q)+': '+pr.join(',  '),W/2,Hh-24,{al:'center',size:12.5,c:TH.dim}); return; }
    var mn=ps[0], m=mn[0], n=mn[1], tw=X+m, th=X+n, u=Math.min((W-40)/tw,(Hh-90)/th,50), ox=(W-tw*u)/2, oy=Hh-26-((Hh-70)-th*u)/2;
    function R(x,y,w,h,col,lb){ g.fillStyle=col; g.fillRect(ox+x*u,oy-(y+h)*u,w*u,h*u); g.strokeStyle=TH.light?'#fff':'#0b0d13'; g.lineWidth=1.5; g.strokeRect(ox+x*u,oy-(y+h)*u,w*u,h*u); if(lb) H.text(g,lb,ox+(x+w/2)*u,oy-(y+h/2)*u,{al:'center',size:Math.min(18,w*u*0.4+4),w:800,c:'#fff'}); }
    R(0,0,X,X,'rgba(79,157,255,.7)','x²'); for(var i=0;i<m;i++) R(X+i,0,1,X,'rgba(63,224,143,.75)',i===0&&u>16?'x':''); for(i=0;i<n;i++) R(0,X+i,X,1,'rgba(63,224,143,.75)',i===0&&u>16?'x':'');
    for(i=0;i<m;i++) for(var j=0;j<n;j++) R(X+i,X+j,1,1,'rgba(255,201,60,.85)','');
    H.text(g,'x + '+m,ox+tw*u/2,oy+14,{al:'center',size:14,w:800,c:C.fry}); H.text(g,'x + '+n,ox-8,oy-th*u/2,{al:'right',size:14,w:800,c:C.fry});
    H.text(g,'(x + '+m+')(x + '+n+')',W/2,Hh-8,{al:'center',size:16,w:800,c:C.grn,bl:'bottom'}); },
  read:function(){ var p=this.p, ps=pairs(p.p,p.q), mn=ps[0]; return [['식','x² + '+p.p+'x + '+p.q,'','wide'],['합이 p, 곱이 q인 두 수',mn?mn[0]+', '+mn[1]:'없어요','','ok'],['인수분해',mn?'(x + '+mn[0]+')(x + '+mn[1]+')':'정수 범위에서 안 돼요','','wide hl'],['합 m + n',mn?String(mn[0]+mn[1]):'—',''],['곱 m × n',mn?String(mn[0]*mn[1]):'—',''],['곱이 q인 두 수의 쌍',qf(p.q).map(function(z){ return z[0]+'×'+z[1]; }).join(', '),'','wide']]; },
  record:function(){ var p=this.p, mn=pairs(p.p,p.q)[0]; return {p:p.p, q:p.q, m:mn?mn[0]:null, n:mn?mn[1]:null}; },
  ai:function(){ var p=this.p, mn=pairs(p.p,p.q)[0]; return 'Factoring x^2 + '+p.p+'x + '+p.q+' with algebra tiles: '+(mn?'(x + '+mn[0]+')(x + '+mn[1]+')':'no integer pair has sum '+p.p+' and product '+p.q+', so no rectangle.'); }
});
})();

/* ===================== 중3 원의 성질: 원주각과 중심각 ===================== */
(function(){
var S={v:null,O:null,R:0};
function geo(p){ var A=270-p.cen/2, B=270+p.cen/2, pa=B+p.u*(360-p.cen), qa=B+p.u2*(360-p.cen); return {A:A,B:B,pa:pa,qa:qa}; }
function ang(P,Q,Rr){ var u=[Q[0]-P[0],Q[1]-P[1]], w=[Rr[0]-P[0],Rr[1]-P[1]]; return Math.acos(H.clamp((u[0]*w[0]+u[1]*w[1])/(Math.hypot(u[0],u[1])*Math.hypot(w[0],w[1])),-1,1))/D2R; }
function pt(a){ return [Math.cos(a*D2R),Math.sin(a*D2R)]; }
function angles(p){ var k=geo(p), A=pt(k.A), B=pt(k.B), P=pt(k.pa), Q=pt(k.qa); return {p:ang(P,A,B),q:ang(Q,A,B)}; }
LAB.add({id:'m1_inscribed', cat:'math', icon:'⭕', name:'원주각과 중심각', desc:'한 호에 대한 원주각의 크기는 중심각의 반',
  info:'원 위의 두 점 A, B가 만드는 호 AB에 대한 중심각은 ∠AOB이고, 호 AB가 아닌 쪽의 원 위의 점 P에서 본 ∠APB를 원주각이라고 해요. 원주각의 크기는 중심각의 크기의 반이에요. 그래서 같은 호에 대한 원주각은 P의 위치에 관계없이 모두 같아요. 호가 반원이면 중심각이 180°이므로 원주각은 90°예요(지름에 대한 원주각).',
  tries:['점 P를 호 위에서 움직여도 ∠APB가 변하지 않는지 확인해 보세요','중심각을 180°로 하면 원주각이 몇 도가 되나요?','점 Q를 켜고 ∠APB와 ∠AQB를 비교해 보세요'],
  hint:'그래프를 눌러 끌면 점 P가 원 위에서 움직여요.', noPlay:true,
  params:[{id:'cen',l:'호 AB의 중심각',min:30,max:330,step:1,val:100,u:'°',d:0,pre:[[60,'60°'],[90,'90°'],[180,'180°'],[270,'270°']]},{id:'u',l:'점 P의 위치',min:0.05,max:0.95,step:0.01,val:0.5,d:2},{id:'q2',l:'점 Q도 보기',type:'check',val:true},{id:'u2',l:'점 Q의 위치',min:0.05,max:0.95,step:0.01,val:0.85,d:2,show:function(p){ return p.q2; }}],
  cols:[{k:'cen',l:'중심각',u:'°',d:1},{k:'ap',l:'∠APB',u:'°',d:2},{k:'aq',l:'∠AQB',u:'°',d:2}], gx:'cen', gy:'ap', fit:true,
  reset:function(){},
  draw:function(g,W,Hh){ var p=this.p, k=geo(p), r=Math.min(W,Hh)*0.38, cx=W/2, cy=Hh/2+6; S.O=[cx,cy]; S.R=r; var X=function(a){ return [cx+Math.cos(a*D2R)*r,cy-Math.sin(a*D2R)*r]; };
    g.beginPath(); g.arc(cx,cy,r,0,TAU); g.strokeStyle=TH.text; g.lineWidth=2.5; g.stroke(); var A=X(k.A), B=X(k.B), P=X(k.pa), Q=X(k.qa);
    wedge(g,cx,cy,r*0.28,k.A*D2R,k.B*D2R,'rgba(255,201,60,.35)',C.fry); arcM(g,cx,cy,r,k.A*D2R,k.B*D2R,C.fry,5);
    H.seg(g,cx,cy,A[0],A[1],C.fry,2); H.seg(g,cx,cy,B[0],B[1],C.fry,2); H.seg(g,P[0],P[1],A[0],A[1],C.blu,2.5); H.seg(g,P[0],P[1],B[0],B[1],C.blu,2.5);
    function mark(Pp,col){ var a1=Math.atan2(-(A[1]-Pp[1]),A[0]-Pp[0]), a2=Math.atan2(-(B[1]-Pp[1]),B[0]-Pp[0]), d=a2-a1; while(d>PI) d-=TAU; while(d<-PI) d+=TAU; g.beginPath(); g.arc(Pp[0],Pp[1],26,-a1,-(a1+d),d>0); g.strokeStyle=col; g.lineWidth=3; g.stroke(); }
    mark(P,C.blu); if(p.q2){ H.seg(g,Q[0],Q[1],A[0],A[1],C.grn,2); H.seg(g,Q[0],Q[1],B[0],B[1],C.grn,2); mark(Q,C.grn); }
    H.dot(g,cx,cy,4,TH.text); [[A,'A'],[B,'B'],[P,'P']].concat(p.q2?[[Q,'Q']]:[]).forEach(function(z){ H.dot(g,z[0][0],z[0][1],5.5,z[1]==='P'?C.or:C.fry,TH.stage); H.text(g,z[1],z[0][0]+(z[0][0]-cx)*0.14,z[0][1]+(z[0][1]-cy)*0.14,{al:'center',size:15,w:800}); }); H.text(g,'O',cx-12,cy+14,{size:13,c:TH.dim});
    var an=angles(p); tag(g,F('중심각 {0}°',num(p.cen,0)),12,22,C.fry); tag(g,'∠APB = '+num(an.p,1)+'°',12,48,C.blu); if(p.q2) tag(g,'∠AQB = '+num(an.q,1)+'°',12,74,C.grn); },
  read:function(){ var p=this.p, an=angles(p), rows=[['호 AB의 중심각',num(p.cen,1)+'°',''],['원주각 ∠APB',num(an.p,2)+'°','','hl']]; if(p.q2) rows.push(['원주각 ∠AQB',num(an.q,2)+'°','','hl']); rows.push(['중심각의 반',num(p.cen/2,2)+'°','','ok'],['지름에 대한 원주각',p.cen===180?'90° (반원)':'—','','th']); return rows; },
  record:function(){ var p=this.p, an=angles(p); return {cen:p.cen, ap:an.p, aq:an.q}; },
  ai:function(){ var p=this.p, an=angles(p); return 'Inscribed angle theorem: central angle '+p.cen+' deg, inscribed angle APB = '+fmt(an.p,3)+' deg'+(p.q2?', AQB = '+fmt(an.q,3)+' deg':'')+' (half of the central angle).'; },
  down:function(x,y){ return !!S.O&&this.move(x,y,null,true); },
  move:function(x,y,e,cap){ if(!cap||!S.O) return false; var p=this.p, a=Math.atan2(-(y-S.O[1]),x-S.O[0])/D2R, B=270+p.cen/2, u=(((a-B)%360)+360)%360/(360-p.cen); if(u>0.03&&u<0.97) H.setP('u',Math.round(u*100)/100); return true; }
});
})();

/* ===================== 중3 원의 성질: 접선의 성질 ===================== */
(function(){
var S={v:null};
function geo(p){ var a=p.ang*D2R, P=[p.d*Math.cos(a),p.d*Math.sin(a)], al=Math.acos(Math.min(1,p.r/p.d)), T1=[p.r*Math.cos(a+al),p.r*Math.sin(a+al)], T2=[p.r*Math.cos(a-al),p.r*Math.sin(a-al)]; return {P:P,T1:T1,T2:T2,al:al,len:Math.sqrt(Math.max(0,p.d*p.d-p.r*p.r))}; }
LAB.add({id:'m1_tangent', cat:'math', icon:'🎯', name:'원의 접선의 성질', desc:'접선은 접점을 지나는 반지름에 수직이고, 한 점에서 그은 두 접선의 길이는 같아요',
  info:'원 밖의 한 점 P에서 원에 접선을 그으면 접점이 두 개 생기고, 이 두 접점 T₁, T₂에 대해 몇 가지 성질이 있어요. 접선은 접점을 지나는 반지름과 수직이라서 ∠OTP = 90°예요. 직각삼각형 OTP에서 피타고라스 정리로 접선의 길이는 PT = √(OP² − r²)이고, 두 접선의 길이 PT₁ = PT₂예요. 또 사각형 OT₁PT₂의 두 각이 90°이므로 ∠T₁OT₂ + ∠T₁PT₂ = 180°예요.',
  tries:['점 P를 원에서 멀리 보내며 접선의 길이와 ∠T₁PT₂가 어떻게 변하는지 보세요','OP = 5, r = 3일 때 접선의 길이가 4인지 피타고라스 정리로 확인해 보세요','점 P가 원에 가까워지면 두 접점은 어떻게 되나요?'],
  hint:'그래프를 눌러 끌면 점 P가 움직여요.', noPlay:true,
  params:[{id:'r',l:'원의 반지름 r',min:1,max:6,step:0.5,val:3,d:1},{id:'d',l:'중심에서 P까지의 거리 OP',min:1.2,max:12,step:0.1,val:5,d:1},{id:'ang',l:'P의 방향',min:0,max:360,step:1,val:30,u:'°',d:0}],
  cols:[{k:'r',l:'반지름 r',d:1},{k:'d',l:'OP',d:1},{k:'len',l:'접선의 길이',d:3},{k:'ap',l:'∠T₁PT₂',u:'°',d:2}], gx:'d', gy:'len', fit:true,
  reset:function(){},
  draw:function(g,W,Hh){ var p=this.p; if(p.d<=p.r){ msg(g,W,Hh,'점 P가 원 안이나 원 위에 있어요','OP를 반지름보다 크게 해 주세요'); return; } var k=geo(p), R=Math.max(8,p.d+1.5), r=R4(W,Hh), v=S.v=H.view(r,-R,R,-R,R,{equal:true}), X=function(q){ return [v.sx(q[0]),v.sy(q[1])]; }, O=X([0,0]), P=X(k.P), T1=X(k.T1), T2=X(k.T2);
    H.axes(g,v,{noGrid:true}); g.beginPath(); g.arc(O[0],O[1],p.r*v.kx,0,TAU); g.fillStyle='rgba(79,157,255,.12)'; g.fill(); g.strokeStyle=C.blu; g.lineWidth=3; g.stroke();
    polyPx(g,[O,T1,P,T2],'rgba(255,201,60,.10)',null); H.seg(g,P[0],P[1],T1[0],T1[1],C.fry,3); H.seg(g,P[0],P[1],T2[0],T2[1],C.fry,3); H.seg(g,O[0],O[1],T1[0],T1[1],C.grn,2.2); H.seg(g,O[0],O[1],T2[0],T2[1],C.grn,2.2); H.seg(g,O[0],O[1],P[0],P[1],TH.dim,1.5,[5,4]);
    [[T1,P],[T2,P]].forEach(function(z){ var t=z[0], ux=(O[0]-t[0]), uy=(O[1]-t[1]), l1=Math.hypot(ux,uy), vx=P[0]-t[0], vy=P[1]-t[1], l2=Math.hypot(vx,vy); rightMark(g,t[0],t[1],ux/l1,uy/l1,vx/l2,vy/l2,11,TH.text); });
    [[O,'O',-12,12],[P,'P',12,-10],[T1,'T₁',10,-10],[T2,'T₂',10,12]].forEach(function(z){ H.dot(g,z[0][0],z[0][1],5,z[1]==='P'?C.or:C.fry,TH.stage); H.text(g,z[1],z[0][0]+z[2],z[0][1]+z[3],{al:'center',size:14,w:800}); });
    tag(g,'PT = '+num(k.len,2),(P[0]+T1[0])/2+12,(P[1]+T1[1])/2-8,C.fry); tag(g,'PT′ = '+num(k.len,2),(P[0]+T2[0])/2+12,(P[1]+T2[1])/2+14,C.fry); },
  read:function(){ var p=this.p; if(p.d<=p.r) return [['알림','OP를 반지름보다 크게 해 주세요','','wide']]; var k=geo(p), ap=2*Math.asin(p.r/p.d)/D2R; return [['접선의 길이 PT₁',num(k.len,3),'','hl'],['접선의 길이 PT₂',num(k.len,3),'','hl'],['√(OP² − r²)',num(Math.sqrt(p.d*p.d-p.r*p.r),3),'','ok'],['∠OT₁P',num(90,0)+'°',''],['∠T₁PT₂',num(ap,2)+'°',''],['∠T₁OT₂',num(180-ap,2)+'°',''],['두 각의 합 ∠T₁OT₂ + ∠T₁PT₂','180°','','th']]; },
  record:function(){ var p=this.p; if(p.d<=p.r) return '점 P를 원 밖에 놓아 주세요'; var k=geo(p); return {r:p.r, d:p.d, len:k.len, ap:2*Math.asin(p.r/p.d)/D2R}; },
  ai:function(){ var p=this.p; if(p.d<=p.r) return 'Point P is not outside the circle.'; var k=geo(p); return 'Tangents from P to a circle of radius '+p.r+' with OP = '+p.d+': tangent length '+fmt(k.len,3)+' each (sqrt(OP^2 - r^2)), angle between tangents '+fmt(2*Math.asin(p.r/p.d)/D2R,2)+' deg.'; },
  down:function(x,y){ return !!S.v&&this.move(x,y,null,true); },
  move:function(x,y,e,cap){ if(!cap||!S.v) return false; var wx=S.v.ix(x), wy=S.v.iy(y); H.setP('d',Math.round(Math.hypot(wx,wy)*10)/10); H.setP('ang',Math.round((Math.atan2(wy,wx)/D2R+360)%360)); return true; }
});
})();

/* ===================== 중3 원의 성질: 아르키메데스의 원주율 ===================== */
(function(){
function lo(n){ return n*Math.sin(PI/n); } function hi(n){ return n*Math.tan(PI/n); }
LAB.add({id:'m1_archpi', cat:'math', icon:'🥧', name:'아르키메데스의 원주율', desc:'원에 내접·외접하는 정다각형으로 π의 범위 좁히기',
  info:'지름이 2인 원에 내접하는 정n각형의 둘레는 2n sin(π/n)이고, 외접하는 정n각형의 둘레는 2n tan(π/n)이에요. 원의 둘레는 이 둘 사이에 있으므로 (지름이 2일 때) n sin(π/n) < π < n tan(π/n)이에요. 약 2200년 전 아르키메데스는 정96각형까지 계산해서 3 + 10/71 < π < 3 + 1/7, 즉 3.1408 < π < 3.1429임을 알아냈어요. 변의 수가 늘어날수록 두 다각형이 원에 가까워지고 범위가 좁아져요.',
  tries:['변의 수를 6, 12, 24, 48, 96으로 늘리며 π의 아랫값과 윗값이 어떻게 변하는지 보세요','정육각형일 때 내접 다각형의 둘레와 지름의 비는 얼마인가요?','변의 수를 두 배로 할 때마다 범위의 폭이 약 몇 분의 1이 되나요?'],
  noPlay:true,
  params:[{id:'n',l:'정다각형의 변의 수 n',min:3,max:200,step:1,val:6,d:0,pre:[[6,'6'],[12,'12'],[24,'24'],[48,'48'],[96,'96']]}],
  cols:[{k:'n',l:'변의 수 n',d:0},{k:'lo',l:'π의 아랫값',d:6},{k:'hi',l:'π의 윗값',d:6}], gx:'n', gy:'lo',
  reset:function(){},
  draw:function(g,W,Hh){ var n=this.p.n, wide=W>=560, ar=wide?{l:6,t:6,w:W,h:Hh-60}:{l:6,t:6,w:W-12,h:Hh-70}, rad=Math.min(ar.w/2.3,(ar.h)/2.2)/(1/Math.cos(PI/n))*1, cx=W/2, cy=ar.t+ar.h/2+8, Rr=Math.min(ar.w/2,ar.h/2)*0.88/(1/Math.cos(PI/Math.max(n,3)))*(n<5?0.9:1);
    Rr=Math.min(ar.w/2,ar.h/2-6)*0.86/Math.max(1,1/Math.cos(PI/n)); var po=function(R,off){ var q=[]; for(var i=0;i<n;i++){ var a=TAU*i/n+off; q.push([cx+R*Math.cos(a),cy-R*Math.sin(a)]); } return q; };
    polyPx(g,po(Rr/Math.cos(PI/n),PI/n+PI/2),'rgba(255,122,182,.10)',C.pink,2.2); polyPx(g,po(Rr,PI/2),'rgba(79,157,255,.14)',C.blu,2.2);
    g.beginPath(); g.arc(cx,cy,Rr,0,TAU); g.strokeStyle=C.fry; g.lineWidth=2.5; g.stroke(); H.dot(g,cx,cy,3,TH.text);
    var ax=26, ay=Hh-30, w0=lo(n), w1=hi(n), pad=(w1-w0)*0.4+1e-6, x0=w0-pad, x1=w1+pad, sx=function(x){ return ax+(x-x0)/(x1-x0)*(W-2*ax); }; H.seg(g,ax,ay,W-ax,ay,TH.dim,2); H.seg(g,sx(w0),ay,sx(w1),ay,C.vio,6); H.seg(g,sx(w0),ay-9,sx(w0),ay+9,C.blu,3); H.seg(g,sx(w1),ay-9,sx(w1),ay+9,C.pink,3);
    H.dot(g,sx(PI),ay,6.5,C.grn,TH.stage); H.text(g,'π',sx(PI),ay-20,{al:'center',size:15,w:800,c:C.grn}); H.text(g,num(w0,5),sx(w0),ay+20,{al:'center',size:11.5,w:700,c:C.blu}); H.text(g,num(w1,5),sx(w1),ay+20,{al:'center',size:11.5,w:700,c:C.pink});
    H.text(g,F('정{0}각형',n),12,16,{size:14,w:800}); },
  read:function(){ var n=this.p.n; return [['내접 정n각형 (둘레 ÷ 지름)',num(lo(n),6),'','hl'],['외접 정n각형 (둘레 ÷ 지름)',num(hi(n),6),'','hl'],['π는 둘 사이에 있어요',num(lo(n),5)+' < π < '+num(hi(n),5),'','wide ok'],['범위의 폭',num(hi(n)-lo(n),6),''],['두 값의 평균',num((lo(n)+hi(n))/2,6),''],['실제 π',num(PI,6),'','th']]; },
  record:function(){ var n=this.p.n; return {n:n, lo:lo(n), hi:hi(n)}; },
  ai:function(){ var n=this.p.n; return 'Archimedes pi: regular '+n+'-gons inscribed and circumscribed in a circle give '+fmt(lo(n),6)+' < pi < '+fmt(hi(n),6)+' (perimeter / diameter).'; }
});
})();

  FFT.add({
    '좌표평면에서 점 찍기':['Plotting points on the coordinate plane','Ubicar puntos en el plano cartesiano','Placer des points dans le plan','Punkte in der Koordinatenebene einzeichnen','座標平面に点をとる'],
    '순서쌍으로 점의 위치와 사분면, 대칭점 알기':['Use ordered pairs to find a point\'s position, quadrant and reflections','Usar pares ordenados para hallar la posición, el cuadrante y los simétricos de un punto','Utiliser les couples pour trouver la position, le quadrant et les symétriques d’un point','Mit geordneten Paaren Lage, Quadrant und Spiegelpunkte bestimmen','順序対で点の位置・象限・対称点を調べる'],
    '좌표평면은 x축과 y축으로 나뉜 네 부분(사분면)으로 이루어져 있어요. 점 P(x, y)는 x축 방향으로 x, y축 방향으로 y만큼 간 곳이에요. x와 y의 부호에 따라 제1사분면(+, +), 제2사분면(−, +), 제3사분면(−, −), 제4사분면(+, −)이 정해져요. x축에 대칭이면 y의 부호만, y축에 대칭이면 x의 부호만, 원점에 대칭이면 둘 다 바뀌어요.':['The coordinate plane is divided by the x-axis and y-axis into four parts (quadrants). The point P(x, y) is x units along the x-axis and y units along the y-axis. The signs of x and y decide the quadrant: Quadrant I (+, +), II (−, +), III (−, −), IV (+, −). A reflection in the x-axis changes only the sign of y, in the y-axis only the sign of x, and through the origin both signs change.','El plano cartesiano queda dividido por el eje x y el eje y en cuatro partes (cuadrantes). El punto P(x, y) está x unidades sobre el eje x e y unidades sobre el eje y. Los signos de x e y determinan el cuadrante: I (+, +), II (−, +), III (−, −), IV (+, −). La simetría respecto del eje x cambia solo el signo de y, respecto del eje y solo el de x, y respecto del origen cambian ambos.','Le plan est partagé par l’axe x et l’axe y en quatre parties (quadrants). Le point P(x, y) est à x unités sur l’axe x et y unités sur l’axe y. Les signes de x et y donnent le quadrant : I (+, +), II (−, +), III (−, −), IV (+, −). La symétrie par rapport à l’axe x change seulement le signe de y, par rapport à l’axe y seulement celui de x, et par rapport à l’origine les deux changent.','Die Koordinatenebene wird von x- und y-Achse in vier Teile (Quadranten) geteilt. Der Punkt P(x, y) liegt x Einheiten in x-Richtung und y Einheiten in y-Richtung. Die Vorzeichen von x und y bestimmen den Quadranten: I (+, +), II (−, +), III (−, −), IV (+, −). Spiegelung an der x-Achse ändert nur das Vorzeichen von y, an der y-Achse nur das von x, am Ursprung beide.','座標平面はx軸とy軸で4つの部分(象限)に分かれます。点P(x, y)はx軸方向にx、y軸方向にyだけ進んだ場所です。xとyの符号で象限が決まり、第1象限(+, +)、第2象限(−, +)、第3象限(−, −)、第4象限(+, −)です。x軸対称ならyの符号だけ、y軸対称ならxの符号だけ、原点対称なら両方が変わります。'],
    '점 P를 네 사분면으로 차례로 옮기고 x, y의 부호를 비교해 보세요':['Move P through the four quadrants in turn and compare the signs of x and y','Mueve P por los cuatro cuadrantes y compara los signos de x e y','Déplace P dans les quatre quadrants et compare les signes de x et y','Verschiebe P nacheinander in die vier Quadranten und vergleiche die Vorzeichen von x und y','点Pを4つの象限に順に動かして、xとyの符号を比べてみよう'],
    '대칭점을 켜고 x축, y축, 원점 대칭일 때 좌표가 어떻게 바뀌는지 보세요':['Turn on the reflection and see how the coordinates change for the x-axis, y-axis and origin','Activa el simétrico y observa cómo cambian las coordenadas respecto del eje x, del eje y y del origen','Active le symétrique et regarde comment changent les coordonnées pour l’axe x, l’axe y et l’origine','Schalte den Spiegelpunkt ein und beobachte, wie sich die Koordinaten bei x-Achse, y-Achse und Ursprung ändern','対称点をオンにして、x軸・y軸・原点対称で座標がどう変わるか見てみよう'],
    'x나 y를 0으로 하면 점이 어디에 놓이나요?':['Where does the point lie if x or y is 0?','¿Dónde queda el punto si x o y vale 0?','Où se trouve le point si x ou y vaut 0 ?','Wo liegt der Punkt, wenn x oder y gleich 0 ist?','xかyを0にすると点はどこにありますか?'],
    'x 좌표':['x coordinate','Coordenada x','Abscisse x','x-Koordinate','x座標'],
    'y 좌표':['y coordinate','Coordenada y','Ordonnée y','y-Koordinate','y座標'],
    '대칭점':['Reflection','Simétrico','Symétrique','Spiegelpunkt','対称点'],
    'x축 대칭':['Reflect in x-axis','Simetría en el eje x','Symétrie d’axe x','Spiegelung an der x-Achse','x軸対称'],
    'y축 대칭':['Reflect in y-axis','Simetría en el eje y','Symétrie d’axe y','Spiegelung an der y-Achse','y軸対称'],
    '원점 대칭':['Reflect through origin','Simetría respecto del origen','Symétrie par rapport à l’origine','Spiegelung am Ursprung','原点対称'],
    '사분면':['Quadrant','Cuadrante','Quadrant','Quadrant','象限'],
    '원점까지 거리':['Distance from origin','Distancia al origen','Distance à l’origine','Abstand vom Ursprung','原点までの距離'],
    '제{0}사분면':['Quadrant {0}','Cuadrante {0}','Quadrant {0}','Quadrant {0}','第{0}象限'],
    '위치':['Position','Posición','Position','Lage','位置'],
    '축 위':['On an axis','Sobre un eje','Sur un axe','Auf einer Achse','軸上'],
    'x의 부호':['Sign of x','Signo de x','Signe de x','Vorzeichen von x','xの符号'],
    'y의 부호':['Sign of y','Signo de y','Signe de y','Vorzeichen von y','yの符号'],
    '원점까지의 거리':['Distance from the origin','Distancia al origen','Distance à l’origine','Abstand vom Ursprung','原点からの距離'],
    '대칭점 P′':['Reflection P′','Simétrico P′','Symétrique P′','Spiegelpunkt P′','対称点 P′'],
    '첫 번째 구간':['First stage','Primer tramo','Première étape','Erster Abschnitt','1番目の区間'],
    '쉬는 중':['Resting','Descansando','En pause','Pause','休憩中'],
    '두 번째 구간':['Second stage','Segundo tramo','Deuxième étape','Zweiter Abschnitt','2番目の区間'],
    '도착':['Arrived','Llegó','Arrivé','Angekommen','到着'],
    '이야기와 그래프':['Stories and graphs','Historias y gráficas','Histoires et graphiques','Geschichten und Graphen','お話とグラフ'],
    '시간에 따라 변하는 위치를 그래프로 읽기':['Read a changing position from a graph','Leer en una gráfica una posición que cambia con el tiempo','Lire sur un graphique une position qui change avec le temps','Eine sich ändernde Position aus einem Graphen ablesen','時間とともに変わる位置をグラフで読む'],
    '집에서 출발한 사람의 위치를 시간에 따라 나타낸 그래프예요. 그래프가 올라가면 집에서 멀어지고, 수평이면 멈춰 있고, 내려가면 집으로 돌아오는 거예요. 그래프가 가파를수록 속력이 빨라요. 평균 속력은 전체 이동 거리를 걸린 시간으로 나눈 값이에요.':['This graph shows the position of a person who left home over time. When the graph rises, the person moves away from home; when it is flat, the person is standing still; when it falls, the person is coming back. The steeper the graph, the faster the speed. The average speed is the total distance travelled divided by the time taken.','Esta gráfica muestra la posición de una persona que sale de casa a lo largo del tiempo. Si la gráfica sube, se aleja de casa; si es horizontal, está parada; si baja, vuelve. Cuanto más empinada, mayor la rapidez. La rapidez media es la distancia total recorrida dividida por el tiempo empleado.','Ce graphique montre la position d’une personne partie de chez elle au fil du temps. Quand il monte, elle s’éloigne de la maison ; quand il est horizontal, elle est arrêtée ; quand il descend, elle revient. Plus il est raide, plus la vitesse est grande. La vitesse moyenne est la distance totale parcourue divisée par la durée.','Der Graph zeigt die Position einer Person, die von zu Hause losgeht, im Zeitverlauf. Steigt er, entfernt sich die Person vom Haus; ist er waagerecht, steht sie still; fällt er, kommt sie zurück. Je steiler der Graph, desto schneller. Die Durchschnittsgeschwindigkeit ist die gesamte Strecke geteilt durch die benötigte Zeit.','家を出発した人の位置を時間とともに表したグラフです。グラフが上がると家から遠ざかり、水平なら止まっていて、下がると家に戻っています。グラフが急なほど速さが速いです。平均の速さは、全体の移動距離を、かかった時間で割った値です。'],
    '쉬는 시간을 0에서 10분까지 바꾸면 그래프에서 수평인 부분이 어떻게 달라지나요?':['If you change the rest time from 0 to 10 minutes, how does the flat part of the graph change?','Si cambias el descanso de 0 a 10 minutos, ¿cómo cambia la parte horizontal de la gráfica?','Si tu changes le temps de pause de 0 à 10 minutes, comment la partie horizontale du graphique change-t-elle ?','Wie verändert sich der waagerechte Teil des Graphen, wenn du die Pause von 0 auf 10 Minuten änderst?','休む時間を0分から10分まで変えると、グラフの水平な部分はどう変わりますか?'],
    '두 번째 구간의 속력을 음수로 하면 그래프가 어떻게 되고 사람은 어디로 가나요?':['If the second speed is negative, what happens to the graph and where does the person go?','Si la segunda rapidez es negativa, ¿qué pasa con la gráfica y adónde va la persona?','Si la deuxième vitesse est négative, que devient le graphique et où va la personne ?','Was passiert mit dem Graphen und wohin geht die Person, wenn die zweite Geschwindigkeit negativ ist?','2番目の区間の速さを負にすると、グラフはどうなり、人はどこへ行きますか?'],
    '시작을 눌러 사람이 움직일 때 그래프의 점도 함께 보세요':['Press start and watch the point on the graph move along with the person','Pulsa iniciar y observa cómo el punto de la gráfica se mueve junto con la persona','Appuie sur démarrer et regarde le point du graphique bouger avec la personne','Drücke Start und beobachte, wie sich der Punkt im Graphen mit der Person bewegt','スタートを押して、人が動くときグラフの点も一緒に動くのを見てみよう'],
    '그래프를 눌러 끌면 시각을 고를 수 있어요.':['Press and drag on the graph to choose a time.','Pulsa y arrastra sobre la gráfica para elegir un instante.','Appuie et fais glisser sur le graphique pour choisir un instant.','Tippe und ziehe im Graphen, um eine Zeit zu wählen.','グラフを押して動かすと時刻を選べます。'],
    '걷기 시작':['Start walking','Empezar a caminar','Se mettre en marche','Losgehen','歩き始める'],
    '첫 구간의 속력':['Speed of the first stage','Rapidez del primer tramo','Vitesse de la première étape','Geschwindigkeit im ersten Abschnitt','最初の区間の速さ'],
    'm/분':['m/min','m/min','m/min','m/min','m/分'],
    '첫 구간의 시간':['Time of the first stage','Tiempo del primer tramo','Durée de la première étape','Dauer des ersten Abschnitts','最初の区間の時間'],
    '분':['min','min','min','Min.','分'],
    '쉬는 시간':['Rest time','Tiempo de descanso','Temps de pause','Pausendauer','休む時間'],
    '두 번째 구간의 속력 (음수면 되돌아와요)':['Speed of the second stage (negative means coming back)','Rapidez del segundo tramo (negativa: vuelve)','Vitesse de la deuxième étape (négative : retour)','Geschwindigkeit im zweiten Abschnitt (negativ heißt Rückweg)','2番目の区間の速さ(負なら戻ります)'],
    '두 번째 구간의 시간':['Time of the second stage','Tiempo del segundo tramo','Durée de la deuxième étape','Dauer des zweiten Abschnitts','2番目の区間の時間'],
    '집에서의 거리':['Distance from home','Distancia a casa','Distance à la maison','Abstand vom Haus','家からの距離'],
    '집':['Home','Casa','Maison','Haus','家'],
    '시간 (분)':['Time (min)','Tiempo (min)','Temps (min)','Zeit (Min.)','時間(分)'],
    '집에서의 거리 (m)':['Distance from home (m)','Distancia a casa (m)','Distance à la maison (m)','Abstand vom Haus (m)','家からの距離(m)'],
    '지금 시각':['Current time','Instante actual','Instant actuel','Aktuelle Zeit','今の時刻'],
    '지금 속력 (기울기)':['Current speed (slope)','Rapidez actual (pendiente)','Vitesse actuelle (pente)','Aktuelle Geschwindigkeit (Steigung)','今の速さ(傾き)'],
    '상태':['Status','Estado','État','Zustand','状態'],
    '지금까지 간 거리 합':['Total distance walked so far','Distancia total recorrida hasta ahora','Distance totale parcourue jusqu’ici','Bisher zurückgelegte Gesamtstrecke','ここまで歩いた距離の合計'],
    '전체 평균 속력':['Overall average speed','Rapidez media total','Vitesse moyenne totale','Gesamte Durchschnittsgeschwindigkeit','全体の平均の速さ'],
    '줄기와 잎 그림':['Stem-and-leaf plot','Diagrama de tallo y hojas','Diagramme tige-feuilles','Stängel-Blätter-Diagramm','幹葉図'],
    '자료를 줄기와 잎으로 나누어 분포 한눈에 보기':['Split data into stems and leaves to see the distribution at a glance','Separar los datos en tallos y hojas para ver la distribución de un vistazo','Séparer les données en tiges et feuilles pour voir la répartition d’un coup d’œil','Daten in Stängel und Blätter teilen und die Verteilung auf einen Blick sehen','データを幹と葉に分けて分布をひと目で見る'],
    '줄기와 잎 그림은 각 자료를 앞부분(줄기)과 끝자리(잎)로 나누어 적은 그림이에요. 예를 들어 35는 줄기 3, 잎 5예요. 원래 자료의 값을 그대로 볼 수 있고, 옆으로 눕히면 막대그래프 모양이 되어 분포를 알 수 있어요. 잎이 많은 줄기가 자료가 많이 모인 곳이에요.':['A stem-and-leaf plot splits each data value into a front part (the stem) and the last digit (the leaf). For example 35 has stem 3 and leaf 5. You can still read the original values, and turned on its side it looks like a bar graph, so you can see the distribution. The stem with the most leaves is where most of the data gathers.','Un diagrama de tallo y hojas separa cada dato en la parte inicial (tallo) y la última cifra (hoja). Por ejemplo, 35 tiene tallo 3 y hoja 5. Se siguen leyendo los valores originales y, girado de lado, parece un gráfico de barras que muestra la distribución. El tallo con más hojas es donde se concentran más datos.','Un diagramme tige-feuilles sépare chaque donnée en une partie avant (la tige) et le dernier chiffre (la feuille). Par exemple 35 a pour tige 3 et pour feuille 5. On lit encore les valeurs d’origine et, couché sur le côté, il ressemble à un diagramme en barres qui montre la répartition. La tige qui a le plus de feuilles est celle où se concentrent les données.','Ein Stängel-Blätter-Diagramm teilt jeden Wert in einen vorderen Teil (Stängel) und die letzte Ziffer (Blatt). Zum Beispiel hat 35 den Stängel 3 und das Blatt 5. Die Originalwerte bleiben ablesbar, und seitlich gedreht sieht es wie ein Balkendiagramm aus und zeigt die Verteilung. Der Stängel mit den meisten Blättern ist dort, wo sich die Daten häufen.','幹葉図は、各データを前の部分(幹)と一の位(葉)に分けて書いた図です。例えば35は幹3、葉5です。元のデータの値をそのまま読め、横に倒すと棒グラフの形になって分布がわかります。葉が多い幹がデータが多く集まっているところです。'],
    '잎이 가장 많은 줄기는 어느 것이고, 그 줄기의 계급에 자료가 몇 개 있나요?':['Which stem has the most leaves, and how many data values are in that stem\'s class?','¿Qué tallo tiene más hojas y cuántos datos hay en esa clase?','Quelle tige a le plus de feuilles et combien de données y a-t-il dans cette classe ?','Welcher Stängel hat die meisten Blätter und wie viele Werte liegen in dieser Klasse?','葉がいちばん多い幹はどれで、その階級にデータはいくつありますか?'],
    '자료 하나를 아주 큰 값으로 바꾸면 그림이 어떻게 달라지나요?':['How does the plot change if you replace one value with a very large one?','¿Cómo cambia el diagrama si cambias un dato por uno muy grande?','Comment le diagramme change-t-il si tu remplaces une donnée par une très grande valeur ?','Wie ändert sich das Diagramm, wenn du einen Wert durch einen sehr großen ersetzt?','データを1つとても大きな値に変えると、図はどう変わりますか?'],
    '무작위 자료를 만들어 분포의 모양(대칭인지 한쪽으로 치우쳤는지)을 말해 보세요':['Make random data and describe the shape of the distribution (symmetric or skewed to one side)','Genera datos aleatorios y describe la forma de la distribución (simétrica o sesgada)','Génère des données aléatoires et décris la forme de la répartition (symétrique ou penchée d’un côté)','Erzeuge Zufallsdaten und beschreibe die Form der Verteilung (symmetrisch oder schief)','ランダムなデータを作り、分布の形(対称か、片側に偏っているか)を言ってみよう'],
    '아래 칸에 0 이상 999 이하의 자료를 쉼표로 구분해서 써 보세요.':['Type data from 0 to 999 in the box below, separated by commas.','Escribe en la casilla datos de 0 a 999 separados por comas.','Écris dans la case des données de 0 à 999 séparées par des virgules.','Gib unten Werte von 0 bis 999 durch Kommas getrennt ein.','下の欄に0以上999以下のデータをコンマで区切って書いてみよう。'],
    '잎을 크기순으로 정리':['Sort the leaves by size','Ordenar las hojas por tamaño','Trier les feuilles par taille','Blätter der Größe nach ordnen','葉を大きさ順に整理'],
    '큰 값 더하기':['Add a big value','Añadir un valor grande','Ajouter une grande valeur','Großen Wert hinzufügen','大きな値を加える'],
    '가장 긴 잎의 개수':['Number of leaves on the longest row','Número de hojas de la fila más larga','Nombre de feuilles de la ligne la plus longue','Blätter in der längsten Zeile','いちばん長い葉の数'],
    '0 이상 999 이하의 숫자 자료를 쉼표로 구분해서 써 주세요':['Type numeric data from 0 to 999, separated by commas','Escribe datos numéricos de 0 a 999 separados por comas','Écris des données numériques de 0 à 999 séparées par des virgules','Gib Zahlen von 0 bis 999 durch Kommas getrennt ein','0以上999以下の数のデータをコンマで区切って書いてください'],
    '자료의 범위가 너무 넓어요':['The data range is too wide','El rango de los datos es demasiado amplio','L’étendue des données est trop grande','Der Wertebereich ist zu groß','データの範囲が広すぎます'],
    '줄기가 36개 이하가 되도록 자료를 바꿔 주세요':['Change the data so there are 36 stems or fewer','Cambia los datos para que haya 36 tallos o menos','Change les données pour avoir 36 tiges ou moins','Ändere die Daten, sodass es höchstens 36 Stängel gibt','幹が36個以下になるようにデータを変えてください'],
    '줄기':['Stem','Tallo','Tige','Stängel','幹'],
    '잎':['Leaf','Hoja','Feuille','Blatt','葉'],
    '잎의 개수':['Number of leaves','Número de hojas','Nombre de feuilles','Anzahl Blätter','葉の数'],
    '예) {0} | {1}  은  {2}':['e.g. {0} | {1} means {2}','p. ej. {0} | {1} significa {2}','ex. {0} | {1} signifie {2}','z. B. {0} | {1} bedeutet {2}','例) {0} | {1} は {2}'],
    '가장 작은 값':['Smallest value','Valor mínimo','Plus petite valeur','Kleinster Wert','最小の値'],
    '가장 큰 값':['Largest value','Valor máximo','Plus grande valeur','Größter Wert','最大の値'],
    '잎이 가장 많은 줄기':['Stem with the most leaves','Tallo con más hojas','Tige avec le plus de feuilles','Stängel mit den meisten Blättern','葉が最も多い幹'],
    '그 줄기의 잎의 개수':['Leaves in that stem','Hojas de ese tallo','Feuilles de cette tige','Blätter dieses Stängels','その幹の葉の数'],
    '상대도수의 안정':['Stability of relative frequency','Estabilidad de la frecuencia relativa','Stabilité de la fréquence relative','Stabilität der relativen Häufigkeit','相対度数の安定'],
    '자료가 많아질수록 상대도수가 일정한 값에 가까워지는 모습':['Relative frequencies settle near fixed values as the data grows','Las frecuencias relativas se acercan a valores fijos al crecer los datos','Les fréquences relatives se rapprochent de valeurs fixes quand les données augmentent','Relative Häufigkeiten nähern sich festen Werten, wenn die Daten mehr werden','資料が増えるほど相対度数が一定の値に近づくようす'],
    '상대도수는 (계급의 도수) ÷ (전체 도수)예요. 키처럼 어떤 모집단에서 자료를 하나씩 뽑아 계급별 상대도수를 구하면, 자료의 개수가 적을 때는 들쭉날쭉하지만 많아질수록 모집단의 비율에 가까워져요. 파란 점은 이론적인 비율이고, 노란 막대는 지금까지 뽑은 자료의 상대도수예요. 상대도수의 합은 항상 1이에요.':['Relative frequency is (frequency of a class) ÷ (total frequency). If you draw data one by one from a population such as heights and find the relative frequency of each class, the values jump around when there is little data but get closer to the population’s proportions as the data grows. The blue dots are the theoretical proportions and the yellow bars are the relative frequencies of the data drawn so far. The relative frequencies always add up to 1.','La frecuencia relativa es (frecuencia de la clase) ÷ (frecuencia total). Si se extraen datos uno a uno de una población, como las estaturas, y se calcula la frecuencia relativa de cada clase, los valores saltan con pocos datos pero se acercan a las proporciones de la población al aumentar los datos. Los puntos azules son las proporciones teóricas y las barras amarillas las frecuencias relativas de los datos obtenidos. La suma de las frecuencias relativas siempre es 1.','La fréquence relative est (effectif de la classe) ÷ (effectif total). Si l’on tire des données une à une dans une population, comme des tailles, et qu’on calcule la fréquence relative de chaque classe, les valeurs varient beaucoup avec peu de données mais se rapprochent des proportions de la population quand elles augmentent. Les points bleus sont les proportions théoriques et les barres jaunes les fréquences relatives des données tirées jusqu’ici. La somme des fréquences relatives vaut toujours 1.','Die relative Häufigkeit ist (Häufigkeit der Klasse) ÷ (Gesamthäufigkeit). Zieht man aus einer Grundgesamtheit, etwa Körpergrößen, nacheinander Werte und bestimmt die relative Häufigkeit jeder Klasse, schwanken die Werte bei wenigen Daten, nähern sich aber bei mehr Daten den Anteilen der Grundgesamtheit. Die blauen Punkte sind die theoretischen Anteile, die gelben Balken die relativen Häufigkeiten der bisher gezogenen Daten. Die relativen Häufigkeiten ergeben immer die Summe 1.','相対度数は(階級の度数)÷(度数の合計)です。身長のように母集団からデータを1つずつ取り出して階級ごとの相対度数を求めると、データが少ないときはばらつきますが、増えるほど母集団の割合に近づきます。青い点は理論上の割合、黄色の棒はここまでに取り出したデータの相対度数です。相対度数の合計はいつも1です。'],
    '자료를 20개, 200개, 2000개 모았을 때 막대가 파란 점에 얼마나 가까워지는지 비교해 보세요':['Compare how close the bars get to the blue dots with 20, 200 and 2000 data values','Compara lo cerca que están las barras de los puntos azules con 20, 200 y 2000 datos','Compare à quel point les barres se rapprochent des points bleus avec 20, 200 et 2000 données','Vergleiche, wie nah die Balken den blauen Punkten bei 20, 200 und 2000 Daten kommen','データが20個、200個、2000個のとき、棒が青い点にどれだけ近いか比べてみよう'],
    '계급의 크기를 바꾸면 상대도수의 모양과 합이 어떻게 달라지나요?':['How do the shape and the sum of the relative frequencies change if you change the class width?','¿Cómo cambian la forma y la suma de las frecuencias relativas si cambias el ancho de clase?','Comment la forme et la somme des fréquences relatives changent-elles si tu changes la largeur de classe ?','Wie ändern sich Form und Summe der relativen Häufigkeiten, wenn du die Klassenbreite änderst?','階級の幅を変えると、相対度数の形と合計はどう変わりますか?'],
    '표준편차를 크게 하면 그래프가 어떻게 퍼지나요?':['How does the graph spread out if you increase the standard deviation?','¿Cómo se ensancha la gráfica si aumentas la desviación típica?','Comment le graphique s’étale-t-il si tu augmentes l’écart type ?','Wie breitet sich der Graph aus, wenn du die Standardabweichung vergrößerst?','標準偏差を大きくすると、グラフはどう広がりますか?'],
    '자료 모으기':['Collect data','Reunir datos','Collecter des données','Daten sammeln','データを集める'],
    '평균 키':['Mean height','Estatura media','Taille moyenne','Mittlere Körpergröße','平均身長'],
    '1초에 모으는 자료':['Data collected per second','Datos por segundo','Données par seconde','Daten pro Sekunde','1秒に集めるデータ'],
    '100개 더하기':['Add 100','Añadir 100','Ajouter 100','100 hinzufügen','100個加える'],
    '1000개 더하기':['Add 1000','Añadir 1000','Ajouter 1000','1000 hinzufügen','1000個加える'],
    '가장 큰 차이':['Largest difference','Mayor diferencia','Plus grand écart','Größte Abweichung','最大の差'],
    '상대도수의 합':['Sum of relative frequencies','Suma de las frecuencias relativas','Somme des fréquences relatives','Summe der relativen Häufigkeiten','相対度数の合計'],
    '키 (cm)':['Height (cm)','Estatura (cm)','Taille (cm)','Körpergröße (cm)','身長 (cm)'],
    '자료 {0}개':['{0} data values','{0} datos','{0} données','{0} Daten','データ{0}個'],
    '이론적인 비율':['Theoretical proportion','Proporción teórica','Proportion théorique','Theoretischer Anteil','理論上の割合'],
    '가장 높은 계급':['Tallest class','Clase más alta','Classe la plus haute','Höchste Klasse','最も高い階級'],
    '그 계급의 상대도수':['Relative frequency of that class','Frecuencia relativa de esa clase','Fréquence relative de cette classe','Relative Häufigkeit dieser Klasse','その階級の相対度数'],
    '이론적인 비율과 가장 큰 차이':['Largest gap from the theoretical proportion','Mayor diferencia con la proporción teórica','Plus grand écart avec la proportion théorique','Größte Abweichung vom theoretischen Anteil','理論上の割合との最大の差'],
    '에라토스테네스의 체':['Sieve of Eratosthenes','Criba de Eratóstenes','Crible d’Ératosthène','Sieb des Eratosthenes','エラトステネスのふるい'],
    '2부터 차례로 배수를 지워 소수만 남기기':['Cross out multiples starting from 2 so only primes remain','Tachar los múltiplos desde el 2 para que queden solo los primos','Barrer les multiples à partir de 2 pour ne garder que les nombres premiers','Vielfache ab 2 streichen, bis nur Primzahlen übrig bleiben','2から順に倍数を消して素数だけを残す'],
    '약 2200년 전 그리스의 에라토스테네스가 소수를 찾은 방법이에요. 1은 소수가 아니라서 먼저 지워요. 2는 소수이니 남기고 2의 배수를 모두 지워요. 다음으로 남은 3은 소수이니 3의 배수를 지워요. 이렇게 √N 이하의 소수까지 배수를 지우면 남은 수가 모두 소수예요. p의 배수는 p×p부터 지우면 돼요. 그보다 작은 배수는 이미 더 작은 소수의 배수로 지워졌기 때문이에요.':['This is the method Eratosthenes of Greece used about 2200 years ago to find primes. 1 is not prime, so cross it out first. 2 is prime, so keep it and cross out all multiples of 2. The next number left, 3, is prime, so cross out its multiples. If you cross out multiples of primes up to √N, every number left is prime. For a prime p you can start crossing out from p×p, because smaller multiples were already crossed out as multiples of smaller primes.','Es el método que usó hace unos 2200 años el griego Eratóstenes para hallar primos. El 1 no es primo, así que se tacha primero. El 2 es primo: se deja y se tachan todos sus múltiplos. El siguiente que queda, el 3, es primo, y se tachan sus múltiplos. Si se tachan los múltiplos de los primos hasta √N, todos los números que quedan son primos. Para un primo p se puede empezar a tachar desde p×p, porque los múltiplos menores ya se tacharon como múltiplos de primos menores.','C’est la méthode qu’Ératosthène, en Grèce, a utilisée il y a environ 2200 ans pour trouver les nombres premiers. 1 n’est pas premier, on le barre d’abord. 2 est premier : on le garde et on barre tous ses multiples. Le nombre suivant resté, 3, est premier : on barre ses multiples. Si l’on barre les multiples des nombres premiers jusqu’à √N, tous les nombres restants sont premiers. Pour un nombre premier p, on peut commencer à barrer à partir de p×p, car les multiples plus petits ont déjà été barrés comme multiples de plus petits nombres premiers.','Mit dieser Methode suchte der Grieche Eratosthenes vor etwa 2200 Jahren Primzahlen. 1 ist keine Primzahl, also streicht man sie zuerst. 2 ist prim, bleibt stehen, und alle Vielfachen von 2 werden gestrichen. Die nächste übrige Zahl 3 ist prim, ihre Vielfachen werden gestrichen. Streicht man die Vielfachen der Primzahlen bis √N, sind alle übrigen Zahlen prim. Bei einer Primzahl p kann man ab p×p streichen, denn kleinere Vielfache sind schon als Vielfache kleinerer Primzahlen gestrichen.','約2200年前、ギリシャのエラトステネスが素数を見つけた方法です。1は素数ではないので先に消します。2は素数なので残して、2の倍数をすべて消します。次に残った3は素数なので、3の倍数を消します。こうして√N以下の素数まで倍数を消すと、残った数はすべて素数です。pの倍数はp×pから消せば十分です。それより小さい倍数は、すでにもっと小さい素数の倍数として消えているからです。'],
    '100까지의 수에서 소수는 모두 몇 개인지 세어 보세요':['Count how many primes there are among the numbers up to 100','Cuenta cuántos primos hay entre los números hasta 100','Compte combien il y a de nombres premiers jusqu’à 100','Zähle, wie viele Primzahlen es bis 100 gibt','100までの数に素数が全部でいくつあるか数えてみよう'],
    'N을 100에서 200으로 늘리면 몇 번째 소수까지 배수를 지우면 되나요? (p×p가 N보다 커질 때까지)':['If you raise N from 100 to 200, up to which prime must you cross out multiples? (until p×p exceeds N)','Si subes N de 100 a 200, ¿hasta qué primo hay que tachar múltiplos? (hasta que p×p supere N)','Si tu passes N de 100 à 200, jusqu’à quel nombre premier faut-il barrer les multiples ? (jusqu’à ce que p×p dépasse N)','Wenn du N von 100 auf 200 erhöhst, bis zu welcher Primzahl muss man Vielfache streichen? (bis p×p größer als N ist)','Nを100から200に増やすと、どの素数まで倍数を消せばよいですか?(p×pがNより大きくなるまで)'],
    '한 단계씩 눌러 3의 배수 중 이미 지워진 것과 새로 지워지는 것을 구별해 보세요':['Step one prime at a time and tell apart the multiples of 3 already crossed out from those newly crossed out','Avanza de primo en primo y distingue los múltiplos de 3 ya tachados de los que se tachan ahora','Avance d’un nombre premier à la fois et distingue les multiples de 3 déjà barrés de ceux qui le sont maintenant','Gehe Primzahl für Primzahl vor und unterscheide die schon gestrichenen Vielfachen von 3 von den neu gestrichenen','1つずつ進めて、3の倍数のうち、すでに消えているものと新しく消えるものを見分けてみよう'],
    '시작을 누르거나 한 단계 버튼으로 소수의 배수를 차례로 지워요.':['Press start or use the step button to cross out multiples of primes one after another.','Pulsa iniciar o el botón de paso para tachar los múltiplos de los primos uno tras otro.','Appuie sur démarrer ou sur le bouton d’étape pour barrer les multiples des nombres premiers l’un après l’autre.','Drücke Start oder den Schritt-Knopf, um die Vielfachen der Primzahlen nacheinander zu streichen.','スタートか1ステップのボタンで、素数の倍数を順に消していきます。'],
    '체 거르기':['Sift','Cribar','Cribler','Sieben','ふるいにかける'],
    '어디까지 (N)':['Up to (N)','Hasta (N)','Jusqu’à (N)','Bis (N)','どこまで (N)'],
    '1초에 지우는 수':['Numbers crossed out per second','Números tachados por segundo','Nombres barrés par seconde','Gestrichene Zahlen pro Sekunde','1秒に消す数'],
    '소수 하나 지우기':['Cross out one prime','Tachar un primo','Barrer un nombre premier','Eine Primzahl streichen','素数1つ分を消す'],
    '끝까지':['To the end','Hasta el final','Jusqu’au bout','Bis zum Ende','最後まで'],
    '지금 남은 수':['Numbers left now','Números que quedan','Nombres restants','Jetzt übrige Zahlen','今残っている数'],
    '소수의 개수':['Number of primes','Cantidad de primos','Nombre de nombres premiers','Anzahl der Primzahlen','素数の個数'],
    '지금 확인하는 소수 p':['Prime p being checked','Primo p que se examina','Nombre premier p examiné','Gerade geprüfte Primzahl p','今調べている素数 p'],
    '지운 수의 개수':['Numbers crossed out','Números tachados','Nombres barrés','Gestrichene Zahlen','消した数の個数'],
    '남은 수 (1 제외)':['Numbers left (excluding 1)','Números que quedan (sin el 1)','Nombres restants (sans 1)','Übrige Zahlen (ohne 1)','残った数(1を除く)'],
    '완성 (남은 수가 모두 소수)':['Done (all numbers left are prime)','Terminado (todos los que quedan son primos)','Terminé (tous les nombres restants sont premiers)','Fertig (alle übrigen Zahlen sind prim)','完成(残った数はすべて素数)'],
    '거르는 중':['Sifting','Cribando','Crible en cours','Wird gesiebt','ふるい中'],
    '소수의 개수 (직접 센 값)':['Number of primes (counted directly)','Cantidad de primos (contados directamente)','Nombre de nombres premiers (compté directement)','Anzahl der Primzahlen (direkt gezählt)','素数の個数(直接数えた値)'],
    '소인수분해 나무':['Prime factorization tree','Árbol de factorización en primos','Arbre de décomposition en facteurs premiers','Primfaktorbaum','素因数分解の木'],
    '소수의 곱으로 나누고 약수, 최대공약수, 최소공배수 구하기':['Split into primes and find divisors, GCD and LCM','Descomponer en primos y hallar divisores, MCD y mcm','Décomposer en nombres premiers et trouver diviseurs, PGCD et PPCM','In Primzahlen zerlegen und Teiler, ggT und kgV bestimmen','素数の積に分けて、約数・最大公約数・最小公倍数を求める'],
    '합성수를 가장 작은 소수부터 차례로 나누어 가면 소수만의 곱으로 나타낼 수 있어요. 이것이 소인수분해이고, 순서를 바꾸어도 결과가 같아요. n = a^p × b^q 꼴이면 약수의 개수는 (p+1)(q+1)이에요. 두 수의 소인수분해에서 공통인 소수를 작은 지수로 곱하면 최대공약수, 모든 소수를 큰 지수로 곱하면 최소공배수예요. 두 수의 곱은 (최대공약수)×(최소공배수)와 같아요.':['If you keep dividing a composite number by the smallest prime possible, you can write it as a product of primes only. This is prime factorization, and the result is the same whatever the order. If n = a^p × b^q, the number of divisors is (p+1)(q+1). For two numbers, multiplying the common primes with the smaller exponents gives the GCD, and multiplying all the primes with the larger exponents gives the LCM. The product of the two numbers equals GCD × LCM.','Si se divide un número compuesto por el menor primo posible una y otra vez, se escribe como producto de primos. Es la factorización en primos y el resultado es el mismo sea cual sea el orden. Si n = a^p × b^q, el número de divisores es (p+1)(q+1). Para dos números, multiplicar los primos comunes con el menor exponente da el MCD, y multiplicar todos los primos con el mayor exponente da el mcm. El producto de los dos números es igual a MCD × mcm.','Si l’on divise un nombre composé par le plus petit nombre premier possible, encore et encore, on l’écrit comme produit de nombres premiers. C’est la décomposition en facteurs premiers, et le résultat ne dépend pas de l’ordre. Si n = a^p × b^q, le nombre de diviseurs est (p+1)(q+1). Pour deux nombres, multiplier les facteurs communs avec le plus petit exposant donne le PGCD, et multiplier tous les facteurs avec le plus grand exposant donne le PPCM. Le produit des deux nombres est égal à PGCD × PPCM.','Teilt man eine zusammengesetzte Zahl immer wieder durch die kleinstmögliche Primzahl, erhält man ein Produkt aus Primzahlen. Das ist die Primfaktorzerlegung, und das Ergebnis hängt nicht von der Reihenfolge ab. Für n = a^p × b^q gibt es (p+1)(q+1) Teiler. Bei zwei Zahlen ergibt das Produkt der gemeinsamen Primzahlen mit dem kleineren Exponenten den ggT und das Produkt aller Primzahlen mit dem größeren Exponenten das kgV. Das Produkt der beiden Zahlen ist gleich ggT × kgV.','合成数を、いちばん小さい素数から順に割っていくと、素数だけの積で表せます。これが素因数分解で、順番を変えても結果は同じです。n = a^p × b^q の形なら、約数の個数は(p+1)(q+1)です。2つの数の素因数分解で、共通の素数を小さいほうの指数でかけると最大公約数、すべての素数を大きいほうの指数でかけると最小公倍数です。2数の積は(最大公約数)×(最小公倍数)に等しくなります。'],
    'n = 360을 소인수분해하고 약수의 개수가 (3+1)(2+1)(1+1) = 24개인지 확인해 보세요':['Factor n = 360 and check that the number of divisors is (3+1)(2+1)(1+1) = 24','Factoriza n = 360 y comprueba que el número de divisores es (3+1)(2+1)(1+1) = 24','Décompose n = 360 et vérifie que le nombre de diviseurs est (3+1)(2+1)(1+1) = 24','Zerlege n = 360 und prüfe, dass es (3+1)(2+1)(1+1) = 24 Teiler gibt','n = 360を素因数分解して、約数の個数が(3+1)(2+1)(1+1) = 24個か確かめてみよう'],
    'n이 소수일 때 약수는 몇 개인가요?':['How many divisors does a prime n have?','¿Cuántos divisores tiene un primo n?','Combien de diviseurs a un nombre premier n ?','Wie viele Teiler hat eine Primzahl n?','nが素数のとき、約数はいくつありますか?'],
    'n = 12, m = 18일 때 최대공약수와 최소공배수를 구하고 곱이 n×m과 같은지 보세요':['For n = 12, m = 18 find the GCD and LCM and check that their product equals n×m','Con n = 12, m = 18 halla el MCD y el mcm y comprueba que su producto es n×m','Pour n = 12, m = 18 trouve le PGCD et le PPCM et vérifie que leur produit vaut n×m','Bestimme für n = 12, m = 18 ggT und kgV und prüfe, ob ihr Produkt n×m ergibt','n = 12、m = 18のとき最大公約数と最小公倍数を求め、積がn×mと等しいか見てみよう'],
    '수 n':['Number n','Número n','Nombre n','Zahl n','数 n'],
    '수 m (최대공약수와 최소공배수용)':['Number m (for GCD and LCM)','Número m (para MCD y mcm)','Nombre m (pour PGCD et PPCM)','Zahl m (für ggT und kgV)','数 m (最大公約数・最小公倍数用)'],
    'm의 나무도 함께 보기':['Also show the tree of m','Mostrar también el árbol de m','Afficher aussi l’arbre de m','Auch den Baum von m zeigen','mの木も一緒に見る'],
    'n의 약수의 개수':['Number of divisors of n','Número de divisores de n','Nombre de diviseurs de n','Anzahl der Teiler von n','nの約数の個数'],
    '최대공약수':['GCD','MCD','PGCD','ggT','最大公約数'],
    '최소공배수':['LCM','mcm','PPCM','kgV','最小公倍数'],
    'n의 소인수분해':['Prime factorization of n','Factorización de n en primos','Décomposition de n en facteurs premiers','Primfaktorzerlegung von n','nの素因数分解'],
    '{0} (소수)':['{0} (prime)','{0} (primo)','{0} (premier)','{0} (Primzahl)','{0}(素数)'],
    'n의 약수':['Divisors of n','Divisores de n','Diviseurs de n','Teiler von n','nの約数'],
    'n의 약수의 합':['Sum of the divisors of n','Suma de los divisores de n','Somme des diviseurs de n','Summe der Teiler von n','nの約数の和'],
    'm의 소인수분해':['Prime factorization of m','Factorización de m en primos','Décomposition de m en facteurs premiers','Primfaktorzerlegung von m','mの素因数分解'],
    '서로소인가요?':['Are they coprime?','¿Son primos entre sí?','Sont-ils premiers entre eux ?','Sind sie teilerfremd?','互いに素ですか?'],
    '네':['Yes','Sí','Oui','Ja','はい'],
    '아니요':['No','No','Non','Nein','いいえ'],
    'n × m = 최대공약수 × 최소공배수':['n × m = GCD × LCM','n × m = MCD × mcm','n × m = PGCD × PPCM','n × m = ggT × kgV','n × m = 最大公約数 × 最小公倍数'],
    '맞아요':['True','Cierto','Vrai','Stimmt','成り立ちます'],
    '달라요':['Different','Distinto','Différent','Verschieden','違います'],
    '수직선에서 정수의 덧셈과 뺄셈':['Adding and subtracting integers on a number line','Sumar y restar enteros en la recta numérica','Additionner et soustraire des entiers sur la droite graduée','Ganze Zahlen auf dem Zahlenstrahl addieren und subtrahieren','数直線で整数のたし算とひき算'],
    '수직선 위의 화살표로 정수 계산하기':['Calculate integers with arrows on a number line','Calcular con enteros usando flechas en la recta numérica','Calculer avec des entiers à l’aide de flèches sur la droite graduée','Mit Pfeilen auf dem Zahlenstrahl ganze Zahlen berechnen','数直線上の矢印で整数を計算する'],
    '수직선에서 0을 출발해 a만큼 간 다음, 더하는 수 b가 양수이면 오른쪽으로, 음수이면 왼쪽으로 b만큼 더 가요. 도착한 곳이 a + b예요. 빼기는 부호를 바꾸어 더하는 것과 같아서 a − b = a + (−b)예요. 같은 부호끼리 더하면 절댓값은 더하고 부호는 그대로, 다른 부호끼리 더하면 절댓값이 큰 쪽에서 작은 쪽을 빼고 큰 쪽의 부호를 따라요.':['Start at 0 on the number line and move a. Then move b more: to the right if the number you add is positive, to the left if it is negative. Where you land is a + b. Subtracting is the same as adding the opposite, so a − b = a + (−b). Adding numbers with the same sign: add the absolute values and keep the sign. With different signs: subtract the smaller absolute value from the larger and take the sign of the larger.','En la recta numérica sal de 0 y avanza a. Luego avanza b más: a la derecha si el número que sumas es positivo, a la izquierda si es negativo. Donde llegas es a + b. Restar es lo mismo que sumar el opuesto, así que a − b = a + (−b). Con el mismo signo se suman los valores absolutos y se conserva el signo. Con signos distintos se resta el menor valor absoluto del mayor y se toma el signo del mayor.','Sur la droite graduée, pars de 0 et avance de a. Avance ensuite de b : vers la droite si le nombre ajouté est positif, vers la gauche s’il est négatif. Le point d’arrivée est a + b. Soustraire revient à ajouter l’opposé, donc a − b = a + (−b). Avec le même signe, on additionne les valeurs absolues et on garde le signe. Avec des signes différents, on soustrait la plus petite valeur absolue de la plus grande et on prend le signe de la plus grande.','Starte auf dem Zahlenstrahl bei 0 und gehe a Schritte. Gehe dann b weiter: nach rechts, wenn die addierte Zahl positiv ist, nach links, wenn sie negativ ist. Dort kommst du bei a + b an. Subtrahieren ist Addieren der Gegenzahl: a − b = a + (−b). Bei gleichen Vorzeichen addiert man die Beträge und behält das Vorzeichen; bei verschiedenen Vorzeichen zieht man den kleineren Betrag vom größeren ab und übernimmt das Vorzeichen des größeren.','数直線で0を出発してaだけ進み、足す数bが正なら右へ、負なら左へbだけ進みます。着いた場所がa + bです。引き算は符号を変えて足すのと同じなので、a − b = a + (−b)です。同じ符号どうしを足すと絶対値は足して符号はそのまま、異なる符号どうしを足すと絶対値が大きいほうから小さいほうを引いて大きいほうの符号になります。'],
    'a = 3, b = −5일 때 3 + (−5)가 −2가 되는 걸 화살표로 확인해 보세요':['Check with arrows that 3 + (−5) is −2 when a = 3, b = −5','Comprueba con flechas que 3 + (−5) es −2 cuando a = 3, b = −5','Vérifie avec les flèches que 3 + (−5) vaut −2 quand a = 3, b = −5','Prüfe mit Pfeilen, dass 3 + (−5) = −2 ist, wenn a = 3, b = −5','a = 3、b = −5のとき、3 + (−5)が−2になることを矢印で確かめてみよう'],
    'b를 계속 음수로 두고 덧셈을 뺄셈으로 바꾸면 도착하는 곳이 어떻게 달라지나요?':['Keep b negative and switch from addition to subtraction. How does the landing point change?','Deja b negativo y cambia la suma por la resta. ¿Cómo cambia el punto de llegada?','Garde b négatif et passe de l’addition à la soustraction. Comment le point d’arrivée change-t-il ?','Lass b negativ und wechsle von Addition zu Subtraktion. Wie ändert sich der Zielpunkt?','bをずっと負にしたまま、たし算をひき算に変えると、着く場所はどう変わりますか?'],
    'a와 b의 절댓값이 같고 부호가 다르면 결과는 얼마인가요?':['What is the result if a and b have the same absolute value but different signs?','¿Cuánto da si a y b tienen el mismo valor absoluto y distinto signo?','Quel est le résultat si a et b ont la même valeur absolue mais des signes différents ?','Was ergibt sich, wenn a und b den gleichen Betrag, aber verschiedene Vorzeichen haben?','aとbの絶対値が同じで符号が違うと、結果はいくつですか?'],
    '걸어 보기':['Walk it','Recorrerlo','Le parcourir','Abgehen','歩いてみる'],
    '처음 수 a':['First number a','Primer número a','Premier nombre a','Erste Zahl a','最初の数 a'],
    '두 번째 수 b':['Second number b','Segundo número b','Deuxième nombre b','Zweite Zahl b','2番目の数 b'],
    '계산':['Operation','Operación','Opération','Rechnung','計算'],
    '덧셈 a + b':['Addition a + b','Suma a + b','Addition a + b','Addition a + b','たし算 a + b'],
    '뺄셈 a − b':['Subtraction a − b','Resta a − b','Soustraction a − b','Subtraktion a − b','ひき算 a − b'],
    '결과':['Result','Resultado','Résultat','Ergebnis','結果'],
    '부호를 바꾸어 더해요':['change the sign and add','cambia el signo y suma','change le signe et ajoute','Vorzeichen wechseln und addieren','符号を変えて足す'],
    '더하는 수':['Number added','Número que se suma','Nombre ajouté','Addierte Zahl','足す数'],
    '결과의 절댓값':['Absolute value of the result','Valor absoluto del resultado','Valeur absolue du résultat','Betrag des Ergebnisses','結果の絶対値'],
    '어떤 경우인가요?':['Which case is it?','¿De qué caso se trata?','De quel cas s’agit-il ?','Welcher Fall ist es?','どんな場合ですか?'],
    '0을 더해요':['Adding 0','Se suma 0','On ajoute 0','Es wird 0 addiert','0を足します'],
    '같은 부호: 절댓값을 더해요':['Same sign: add the absolute values','Mismo signo: se suman los valores absolutos','Même signe : on additionne les valeurs absolues','Gleiches Vorzeichen: Beträge addieren','同じ符号: 絶対値を足します'],
    '다른 부호: 절댓값을 빼요':['Different signs: subtract the absolute values','Signos distintos: se restan los valores absolutos','Signes différents : on soustrait les valeurs absolues','Verschiedene Vorzeichen: Beträge subtrahieren','異なる符号: 絶対値を引きます'],
    '수직선 위의 유리수':['Rational numbers on a number line','Números racionales en la recta numérica','Nombres rationnels sur la droite graduée','Rationale Zahlen auf dem Zahlenstrahl','数直線上の有理数'],
    '분수의 위치와 소수 표현(유한소수, 순환소수) 알아보기':['Find where a fraction lies and its decimal form (terminating or repeating)','Hallar la posición de una fracción y su forma decimal (exacta o periódica)','Trouver la place d’une fraction et son écriture décimale (finie ou périodique)','Lage eines Bruchs und seine Dezimaldarstellung (endlich oder periodisch) bestimmen','分数の位置と小数での表し方(有限小数・循環小数)を調べる'],
    '정수 p와 0이 아닌 정수 q로 p/q 꼴로 나타낼 수 있는 수가 유리수예요. 수직선에서 두 정수 사이를 q등분하면 p/q의 위치를 찾을 수 있어요. 분수를 소수로 나타내면 나누어떨어지는 유한소수이거나 같은 숫자가 반복되는 순환소수가 돼요. 기약분수의 분모가 2나 5로만 이루어졌을 때에만 유한소수가 돼요.':['A number that can be written as p/q with an integer p and a nonzero integer q is a rational number. On a number line, divide the space between two integers into q equal parts to find the position of p/q. Written as a decimal, a fraction is either a terminating decimal (the division ends) or a repeating decimal (the same digits repeat). It is a terminating decimal only when the denominator of the reduced fraction has no prime factors other than 2 and 5.','Un número que se puede escribir como p/q, con p entero y q entero distinto de 0, es un número racional. En la recta numérica, se divide en q partes iguales el espacio entre dos enteros para hallar la posición de p/q. Al escribir una fracción como decimal, resulta un decimal exacto (la división termina) o un decimal periódico (se repiten las mismas cifras). Es exacto solo si el denominador de la fracción irreducible no tiene más factores primos que 2 y 5.','Un nombre qui s’écrit p/q avec p entier et q entier non nul est un nombre rationnel. Sur la droite graduée, on partage en q parties égales l’espace entre deux entiers pour trouver la place de p/q. En écriture décimale, une fraction donne un décimal fini (la division s’arrête) ou un décimal périodique (les mêmes chiffres se répètent). Il est fini seulement si le dénominateur de la fraction irréductible n’a pas d’autre facteur premier que 2 et 5.','Eine Zahl, die sich als p/q mit ganzem p und ganzem q ≠ 0 schreiben lässt, ist eine rationale Zahl. Auf dem Zahlenstrahl teilt man den Abstand zwischen zwei ganzen Zahlen in q gleiche Teile, um die Lage von p/q zu finden. Als Dezimalzahl ist ein Bruch entweder endlich (die Division geht auf) oder periodisch (dieselben Ziffern wiederholen sich). Endlich ist er nur, wenn der Nenner des gekürzten Bruchs nur die Primfaktoren 2 und 5 hat.','整数pと0でない整数qでp/qの形に表せる数が有理数です。数直線で2つの整数の間をq等分すると、p/qの位置がわかります。分数を小数で表すと、割り切れる有限小数か、同じ数字が繰り返される循環小数になります。既約分数の分母が2と5だけでできているときに限って有限小数になります。'],
    '분모를 2, 4, 5, 8, 10으로 바꾸면 모두 유한소수가 되나요?':['Do all denominators 2, 4, 5, 8 and 10 give terminating decimals?','¿Todos los denominadores 2, 4, 5, 8 y 10 dan decimales exactos?','Les dénominateurs 2, 4, 5, 8 et 10 donnent-ils tous des décimaux finis ?','Ergeben die Nenner 2, 4, 5, 8 und 10 alle endliche Dezimalzahlen?','分母を2、4、5、8、10にすると、すべて有限小数になりますか?'],
    '분모가 3, 7, 9, 11, 13일 때 순환마디의 길이를 비교해 보세요':['Compare the length of the repeating block for denominators 3, 7, 9, 11 and 13','Compara la longitud del periodo para los denominadores 3, 7, 9, 11 y 13','Compare la longueur de la période pour les dénominateurs 3, 7, 9, 11 et 13','Vergleiche die Periodenlänge bei den Nennern 3, 7, 9, 11 und 13','分母が3、7、9、11、13のときの循環節の長さを比べてみよう'],
    '분자를 음수로 하면 수직선에서 0의 어느 쪽에 놓이나요?':['If the numerator is negative, on which side of 0 does the point lie?','Si el numerador es negativo, ¿en qué lado del 0 queda el punto?','Si le numérateur est négatif, de quel côté de 0 le point se trouve-t-il ?','Auf welcher Seite von 0 liegt der Punkt, wenn der Zähler negativ ist?','分子を負にすると、数直線で0のどちら側に置かれますか?'],
    '분자 p':['Numerator p','Numerador p','Numérateur p','Zähler p','分子 p'],
    '분모 q':['Denominator q','Denominador q','Dénominateur q','Nenner q','分母 q'],
    '값':['Value','Valor','Valeur','Wert','値'],
    '분자':['Numerator','Numerador','Numérateur','Zähler','分子'],
    '분모':['Denominator','Denominador','Dénominateur','Nenner','分母'],
    '순환마디의 길이':['Length of the repeating block','Longitud del periodo','Longueur de la période','Länge der Periode','循環節の長さ'],
    '{0}와 {1} 사이를 {2}등분':['{0} to {1} split into {2} equal parts','{0} a {1} dividido en {2} partes iguales','De {0} à {1} partagé en {2} parties égales','{0} bis {1} in {2} gleiche Teile geteilt','{0}と{1}の間を{2}等分'],
    '기약분수':['Reduced fraction','Fracción irreducible','Fraction irréductible','Gekürzter Bruch','既約分数'],
    '소수로 나타내기':['As a decimal','En forma decimal','En écriture décimale','Als Dezimalzahl','小数で表すと'],
    '정수':['Integer','Entero','Entier','Ganze Zahl','整数'],
    '유한소수':['Terminating decimal','Decimal exacto','Décimal fini','Endliche Dezimalzahl','有限小数'],
    '순환소수':['Repeating decimal','Decimal periódico','Décimal périodique','Periodische Dezimalzahl','循環小数'],
    '분모의 소인수':['Prime factors of the denominator','Factores primos del denominador','Facteurs premiers du dénominateur','Primfaktoren des Nenners','分母の素因数'],
    '절댓값':['Absolute value','Valor absoluto','Valeur absolue','Betrag','絶対値'],
    '2나 5 이외의 소인수':['Prime factors other than 2 and 5','Factores primos distintos de 2 y 5','Facteurs premiers autres que 2 et 5','Primfaktoren außer 2 und 5','2や5以外の素因数'],
    '있어요':['Yes, there are','Sí hay','Oui','Ja, es gibt welche','あります'],
    '없어요':['None','No hay','Aucun','Keine','ありません'],
    '천칭으로 방정식 풀기':['Solving equations with a balance scale','Resolver ecuaciones con una balanza','Résoudre des équations avec une balance','Gleichungen mit der Balkenwaage lösen','天びんで方程式を解く'],
    '양쪽에 같은 일을 해서 x의 값 구하기':['Do the same thing to both sides to find x','Hacer lo mismo a los dos lados para hallar x','Faire la même chose des deux côtés pour trouver x','Auf beiden Seiten dasselbe tun, um x zu finden','両側に同じことをしてxの値を求める'],
    '천칭이 평형일 때 양쪽에 같은 무게를 더하거나 빼도, 양쪽을 같은 수로 나누어도 평형은 그대로예요. 방정식도 마찬가지로 양변에 같은 수를 더하거나 빼고 같은 수로 나누어도 해는 변하지 않아요. 상자 하나의 무게가 x이고 작은 정사각형은 무게 1이에요. 먼저 양쪽에서 x 상자를 빼고, 상수를 빼서 x 상자만 남긴 다음, 계수로 나누면 x의 값이 나와요.':['When a balance scale is level, adding or removing the same weight on both sides, or dividing both sides by the same number, keeps it level. In the same way, adding or subtracting the same number on both sides of an equation, or dividing both sides by the same number, does not change the solution. One box weighs x and each small square weighs 1. First remove x boxes from both sides, then remove constants so only x boxes remain on one side, then divide by the coefficient to get x.','Cuando una balanza está equilibrada, quitar o añadir el mismo peso en ambos platos, o dividir ambos lados por el mismo número, mantiene el equilibrio. Igual en una ecuación: sumar o restar el mismo número en ambos miembros, o dividir ambos miembros por el mismo número, no cambia la solución. Una caja pesa x y cada cuadradito pesa 1. Primero quita cajas x de ambos lados, luego quita constantes para que solo queden cajas x en un lado y divide por el coeficiente para obtener x.','Quand une balance est en équilibre, ajouter ou retirer le même poids des deux côtés, ou diviser les deux côtés par le même nombre, la laisse en équilibre. De même, ajouter ou soustraire le même nombre des deux membres d’une équation, ou diviser les deux membres par le même nombre, ne change pas la solution. Une boîte pèse x et chaque petit carré pèse 1. Retire d’abord des boîtes x des deux côtés, puis des constantes pour ne garder que des boîtes x d’un côté, puis divise par le coefficient pour obtenir x.','Ist eine Waage im Gleichgewicht, bleibt sie es, wenn man auf beiden Seiten dasselbe Gewicht wegnimmt oder dazulegt oder beide Seiten durch dieselbe Zahl teilt. Ebenso ändert sich die Lösung einer Gleichung nicht, wenn man auf beiden Seiten dieselbe Zahl addiert oder subtrahiert oder beide Seiten durch dieselbe Zahl teilt. Eine Kiste wiegt x, jedes kleine Quadrat wiegt 1. Nimm zuerst auf beiden Seiten x-Kisten weg, dann Konstanten, sodass nur x-Kisten auf einer Seite bleiben, und teile durch den Koeffizienten, um x zu erhalten.','天びんがつり合っているとき、両側に同じ重さを加えたり取り除いたり、両側を同じ数で割ったりしても、つり合いは変わりません。方程式も同じで、両辺に同じ数を足したり引いたり、同じ数で割ったりしても解は変わりません。箱1つの重さがxで、小さな正方形の重さは1です。まず両側からx箱を取り除き、次に定数を取り除いてx箱だけを残し、最後に係数で割るとxの値が出ます。'],
    '3x + 4 = x + 10에서 양쪽에서 x를 하나씩 빼 보세요. 식이 어떻게 되나요?':['In 3x + 4 = x + 10, remove one x from each side. What does the equation become?','En 3x + 4 = x + 10, quita una x de cada lado. ¿En qué se convierte la ecuación?','Dans 3x + 4 = x + 10, retire un x de chaque côté. Que devient l’équation ?','Nimm in 3x + 4 = x + 10 auf jeder Seite ein x weg. Wie sieht die Gleichung dann aus?','3x + 4 = x + 10で、両側からxを1つずつ取り除いてみよう。式はどうなりますか?'],
    'x의 값을 바꾸어 천칭이 평형이 되는 값을 찾아보세요. 그 값이 방정식의 해예요':['Change x until the scale balances. That value is the solution of the equation','Cambia x hasta que la balanza se equilibre. Ese valor es la solución de la ecuación','Change x jusqu’à ce que la balance s’équilibre. Cette valeur est la solution de l’équation','Ändere x, bis die Waage im Gleichgewicht ist. Dieser Wert ist die Lösung der Gleichung','xの値を変えて、天びんがつり合う値を探そう。その値が方程式の解です'],
    'a = c이면 해가 어떻게 되나요?':['What happens to the solution if a = c?','¿Qué pasa con la solución si a = c?','Que devient la solution si a = c ?','Was passiert mit der Lösung, wenn a = c ist?','a = cのとき、解はどうなりますか?'],
    '아래 버튼으로 양쪽에 같은 일을 해 보세요. 슬라이더로 x를 정하면 천칭이 기울어요.':['Use the buttons below to do the same thing to both sides. Choose x with the slider and the scale tilts.','Usa los botones para hacer lo mismo en ambos lados. Elige x con el deslizador y la balanza se inclina.','Utilise les boutons pour faire la même chose des deux côtés. Choisis x avec le curseur et la balance penche.','Mit den Knöpfen kannst du auf beiden Seiten dasselbe tun. Wähle x mit dem Regler, dann kippt die Waage.','下のボタンで両側に同じことをしてみよう。スライダーでxを決めると天びんが傾きます。'],
    '왼쪽의 x 상자 수':['x boxes on the left','Cajas x a la izquierda','Boîtes x à gauche','x-Kisten links','左のx箱の数'],
    '왼쪽의 상수':['Constant on the left','Constante a la izquierda','Constante à gauche','Konstante links','左の定数'],
    '오른쪽의 x 상자 수':['x boxes on the right','Cajas x a la derecha','Boîtes x à droite','x-Kisten rechts','右のx箱の数'],
    '오른쪽의 상수':['Constant on the right','Constante a la derecha','Constante à droite','Konstante rechts','右の定数'],
    'x 상자의 무게 (시험해 보기)':['Weight of an x box (to test)','Peso de una caja x (para probar)','Poids d’une boîte x (pour tester)','Gewicht einer x-Kiste (zum Testen)','x箱の重さ(試してみる)'],
    '양쪽에서 x 빼기':['Remove x from both sides','Quitar x de ambos lados','Retirer x des deux côtés','x auf beiden Seiten wegnehmen','両側からxを引く'],
    '양쪽에서 상수 빼기':['Remove constants from both sides','Quitar constantes de ambos lados','Retirer les constantes des deux côtés','Konstanten auf beiden Seiten wegnehmen','両側から定数を引く'],
    '양쪽을 x의 계수로 나누기':['Divide both sides by the coefficient of x','Dividir ambos lados por el coeficiente de x','Diviser les deux côtés par le coefficient de x','Beide Seiten durch den Koeffizienten von x teilen','両側をxの係数で割る'],
    '처음 식으로':['Back to the original equation','Volver a la ecuación inicial','Revenir à l’équation de départ','Zurück zur Ausgangsgleichung','最初の式に戻す'],
    '양쪽에 모두 x 상자가 있을 때만 뺄 수 있어요':['You can only remove x when both sides have x boxes','Solo se puede quitar x si ambos lados tienen cajas x','On ne peut retirer x que si les deux côtés ont des boîtes x','Man kann x nur wegnehmen, wenn beide Seiten x-Kisten haben','両側にx箱があるときだけ引けます'],
    '양쪽에 모두 상수가 있을 때만 뺄 수 있어요':['You can only remove constants when both sides have constants','Solo se pueden quitar constantes si ambos lados tienen constantes','On ne peut retirer des constantes que si les deux côtés en ont','Man kann Konstanten nur wegnehmen, wenn beide Seiten welche haben','両側に定数があるときだけ引けます'],
    '먼저 x 상자와 상수를 한쪽씩 모아요':['First gather the x boxes and the constants on one side each','Primero reúne las cajas x y las constantes, cada una en un lado','Rassemble d’abord les boîtes x d’un côté et les constantes de l’autre','Sammle zuerst die x-Kisten auf einer Seite und die Konstanten auf der anderen','まずx箱と定数を片側ずつにまとめましょう'],
    'x의 값':['Value of x','Valor de x','Valeur de x','Wert von x','xの値'],
    '시험한 x':['Tested x','x probado','x testé','Getestetes x','試したx'],
    '왼쪽 − 오른쪽':['Left − right','Izquierda − derecha','Gauche − droite','Links − rechts','左 − 右'],
    'x 상자 {0}개':['{0} x boxes','{0} cajas x','{0} boîtes x','{0} x-Kisten','x箱{0}個'],
    '평형':['Balanced','Equilibrio','Équilibre','Gleichgewicht','つり合い'],
    '왼쪽이 무거워요':['The left is heavier','La izquierda pesa más','La gauche est plus lourde','Links ist schwerer','左が重いです'],
    '오른쪽이 무거워요':['The right is heavier','La derecha pesa más','La droite est plus lourde','Rechts ist schwerer','右が重いです'],
    '지금 식':['Current equation','Ecuación actual','Équation actuelle','Aktuelle Gleichung','今の式'],
    '해':['Solution','Solución','Solution','Lösung','解'],
    '해가 무수히 많아요':['Infinitely many solutions','Infinitas soluciones','Une infinité de solutions','Unendlich viele Lösungen','解は無数にあります'],
    '해가 없어요':['No solution','Sin solución','Aucune solution','Keine Lösung','解はありません'],
    '왼쪽 무게':['Weight on the left','Peso a la izquierda','Poids à gauche','Gewicht links','左の重さ'],
    '오른쪽 무게':['Weight on the right','Peso a la derecha','Poids à droite','Gewicht rechts','右の重さ'],
    '천칭':['Balance scale','Balanza','Balance','Waage','天びん'],
    '성냥개비로 규칙 찾기':['Finding patterns with matchsticks','Hallar patrones con cerillas','Trouver des régularités avec des allumettes','Muster mit Streichhölzern finden','マッチ棒で規則を見つける'],
    '도형을 이어 붙일 때 필요한 개수를 문자로 나타내기':['Express with a letter how many are needed when shapes are joined','Expresar con una letra cuántas hacen falta al unir figuras','Exprimer avec une lettre le nombre nécessaire quand on assemble des figures','Mit einer Variablen ausdrücken, wie viele man beim Aneinanderlegen von Figuren braucht','図形をつなぐときに必要な本数を文字で表す'],
    '성냥개비로 정사각형을 한 줄로 이어 붙이면, 처음 하나는 4개가 필요하고 하나를 더 만들 때마다 3개씩 더 필요해요. 정사각형이 n개일 때 필요한 개수는 3n + 1이에요. 이렇게 규칙을 문자 n을 사용한 식으로 나타내면 n에 수를 넣어 값을 바로 구할 수 있고, 성냥개비가 정해져 있을 때 만들 수 있는 개수도 일차방정식으로 구할 수 있어요.':['If you join squares in a row with matchsticks, the first one needs 4 and each extra square needs 3 more. For n squares you need 3n + 1 matchsticks. Writing the rule as an expression with the letter n lets you put in a number for n to get the value at once, and when the number of matchsticks is fixed you can find how many shapes you can make with a linear equation.','Si se unen cuadrados en fila con cerillas, el primero necesita 4 y cada cuadrado más necesita 3 más. Para n cuadrados hacen falta 3n + 1 cerillas. Al escribir la regla como expresión con la letra n, se puede sustituir n por un número y obtener el valor enseguida, y cuando el número de cerillas es fijo, se halla cuántas figuras se pueden hacer con una ecuación de primer grado.','Si l’on assemble des carrés en ligne avec des allumettes, le premier en demande 4 et chaque carré de plus en demande 3 de plus. Pour n carrés il faut 3n + 1 allumettes. Écrire la règle comme expression avec la lettre n permet de remplacer n par un nombre et d’obtenir aussitôt la valeur, et quand le nombre d’allumettes est fixé, une équation du premier degré donne le nombre de figures possibles.','Legt man Quadrate mit Streichhölzern in einer Reihe aneinander, braucht das erste 4 und jedes weitere Quadrat 3 mehr. Für n Quadrate braucht man 3n + 1 Streichhölzer. Schreibt man die Regel als Term mit der Variablen n, kann man für n eine Zahl einsetzen und den Wert sofort berechnen; und bei festgelegter Streichholzzahl findet man mit einer linearen Gleichung, wie viele Figuren man legen kann.','マッチ棒で正方形を一列につなぐと、最初の1個に4本、1個増やすごとに3本ずつ必要です。正方形がn個のとき必要な本数は3n + 1です。このように規則を文字nを使った式で表すと、nに数を入れてすぐに値が求められ、マッチ棒の本数が決まっているときに作れる個数も一次方程式で求められます。'],
    '정사각형 10개를 만들려면 성냥개비가 몇 개 필요한지 식에 n = 10을 넣어 구해 보세요':['Find how many matchsticks 10 squares need by putting n = 10 in the expression','Halla cuántas cerillas necesitan 10 cuadrados sustituyendo n = 10 en la expresión','Trouve combien d’allumettes il faut pour 10 carrés en mettant n = 10 dans l’expression','Berechne, wie viele Streichhölzer 10 Quadrate brauchen, indem du n = 10 einsetzt','式にn = 10を入れて、正方形10個を作るのに必要なマッチ棒の数を求めてみよう'],
    '성냥개비 50개로 정사각형을 최대 몇 개 만들 수 있나요? 식 3n + 1 = 50을 풀어 보세요':['How many squares can you make at most with 50 matchsticks? Solve 3n + 1 = 50','¿Cuántos cuadrados puedes hacer como máximo con 50 cerillas? Resuelve 3n + 1 = 50','Combien de carrés peux-tu faire au maximum avec 50 allumettes ? Résous 3n + 1 = 50','Wie viele Quadrate kannst du mit 50 Streichhölzern höchstens legen? Löse 3n + 1 = 50','マッチ棒50本で正方形を最大いくつ作れますか? 式3n + 1 = 50を解いてみよう'],
    '삼각형으로 바꾸면 식이 어떻게 달라지나요?':['How does the expression change if you switch to triangles?','¿Cómo cambia la expresión si pasas a triángulos?','Comment l’expression change-t-elle si on passe aux triangles ?','Wie ändert sich der Term, wenn du zu Dreiecken wechselst?','三角形に変えると、式はどう変わりますか?'],
    '도형의 개수 n을 바꾸어 성냥개비가 몇 개 필요한지 보세요.':['Change the number of shapes n and see how many matchsticks are needed.','Cambia el número de figuras n y mira cuántas cerillas hacen falta.','Change le nombre de figures n et regarde combien d’allumettes il faut.','Ändere die Anzahl n der Figuren und sieh, wie viele Streichhölzer nötig sind.','図形の個数nを変えて、マッチ棒が何本必要か見てみよう。'],
    '도형':['Shape','Figura','Figure','Figur','図形'],
    '정사각형':['Square','Cuadrado','Carré','Quadrat','正方形'],
    '정삼각형':['Equilateral triangle','Triángulo equilátero','Triangle équilatéral','Gleichseitiges Dreieck','正三角形'],
    '도형의 개수 n':['Number of shapes n','Número de figuras n','Nombre de figures n','Anzahl der Figuren n','図形の個数 n'],
    '가지고 있는 성냥개비':['Matchsticks you have','Cerillas que tienes','Allumettes dont tu disposes','Vorhandene Streichhölzer','持っているマッチ棒'],
    '성냥개비의 수':['Number of matchsticks','Número de cerillas','Nombre d’allumettes','Anzahl Streichhölzer','マッチ棒の数'],
    '만들 수 있는 최대 개수':['Most shapes you can make','Máximo de figuras posibles','Maximum de figures possibles','Höchstzahl möglicher Figuren','作れる最大の個数'],
    '추세선의 기울기 {0}, 절편 {1}: 식의 계수와 비교해 보세요':['Trend line slope {0}, intercept {1}: compare with the coefficients of the expression','Pendiente de la recta de tendencia {0}, ordenada {1}: compáralas con los coeficientes de la expresión','Pente de la droite de tendance {0}, ordonnée à l’origine {1} : compare avec les coefficients de l’expression','Steigung der Trendgeraden {0}, Achsenabschnitt {1}: vergleiche mit den Koeffizienten des Terms','近似直線の傾き{0}、切片{1}: 式の係数と比べてみよう'],
    '성냥개비 수':['Matchsticks','Cerillas','Allumettes','Streichhölzer','マッチ棒の数'],
    '규칙의 식':['Expression for the pattern','Expresión de la regla','Expression de la règle','Term der Regel','規則の式'],
    'n = {0}일 때 필요한 개수':['Matchsticks needed when n = {0}','Cerillas necesarias cuando n = {0}','Allumettes nécessaires pour n = {0}','Benötigte Streichhölzer bei n = {0}','n = {0}のとき必要な本数'],
    '한 개 더 만들 때 늘어나는 개수':['Increase for each extra shape','Aumento por cada figura más','Augmentation pour chaque figure en plus','Zunahme pro weiterer Figur','1個増やすごとに増える本数'],
    '성냥개비 {0}개로 만들 수 있는 최대 개수':['Most shapes with {0} matchsticks','Máximo de figuras con {0} cerillas','Maximum de figures avec {0} allumettes','Höchstzahl an Figuren mit {0} Streichhölzern','マッチ棒{0}本で作れる最大の個数'],
    '쓰고 남는 성냥개비':['Matchsticks left over','Cerillas que sobran','Allumettes restantes','Übrig bleibende Streichhölzer','使って余るマッチ棒'],
    '평행선과 각':['Parallel lines and angles','Rectas paralelas y ángulos','Droites parallèles et angles','Parallele Geraden und Winkel','平行線と角'],
    '맞꼭지각, 동위각, 엇각의 크기 관계 알아보기':['Learn how vertical, corresponding and alternate angles are related','Conocer la relación entre ángulos opuestos por el vértice, correspondientes y alternos internos','Découvrir les relations entre angles opposés par le sommet, correspondants et alternes-internes','Beziehungen zwischen Scheitel-, Stufen- und Wechselwinkeln kennenlernen','対頂角・同位角・錯角の大きさの関係を調べる'],
    '두 직선이 한 직선과 만나면 8개의 각이 생겨요. 마주 보는 각은 맞꼭지각으로 항상 같아요. 같은 위치에 있는 각은 동위각, 엇갈린 위치의 안쪽 각은 엇각이에요. 두 직선이 평행하면 동위각과 엇각의 크기가 서로 같고, 반대로 동위각이나 엇각이 같으면 두 직선이 평행해요. 평행선에서 같은 쪽 안쪽 두 각(동측내각)의 합은 180°예요.':['When two lines are cut by a third line, 8 angles are formed. Angles facing each other are vertical angles and are always equal. Angles in the same position are corresponding angles, and angles on opposite sides of the transversal between the lines are alternate interior angles. If the two lines are parallel, corresponding angles and alternate interior angles are equal, and conversely if they are equal the lines are parallel. For parallel lines, the two interior angles on the same side add up to 180°.','Cuando dos rectas son cortadas por una tercera, se forman 8 ángulos. Los ángulos opuestos por el vértice siempre son iguales. Los que están en la misma posición son correspondientes, y los internos situados a lados distintos de la transversal son alternos internos. Si las dos rectas son paralelas, los correspondientes y los alternos internos son iguales; y al revés, si son iguales las rectas son paralelas. En paralelas, los dos ángulos internos del mismo lado suman 180°.','Quand deux droites sont coupées par une troisième, il se forme 8 angles. Les angles opposés par le sommet sont toujours égaux. Les angles à la même position sont correspondants, et les angles intérieurs situés de part et d’autre de la sécante sont alternes-internes. Si les deux droites sont parallèles, les angles correspondants et les alternes-internes sont égaux ; réciproquement, s’ils sont égaux, les droites sont parallèles. Pour des parallèles, les deux angles intérieurs du même côté ont pour somme 180°.','Schneidet eine Gerade zwei andere, entstehen 8 Winkel. Gegenüberliegende Winkel sind Scheitelwinkel und immer gleich. Winkel an gleicher Stelle sind Stufenwinkel, innen liegende Winkel auf verschiedenen Seiten der Schneidenden sind Wechselwinkel. Sind die beiden Geraden parallel, sind Stufen- und Wechselwinkel gleich, und umgekehrt sind die Geraden parallel, wenn sie gleich sind. Bei Parallelen ergänzen sich die beiden innen liegenden Winkel auf derselben Seite zu 180°.','2本の直線が1本の直線と交わると8つの角ができます。向かい合う角が対頂角で、いつも等しいです。同じ位置にある角が同位角、互い違いの位置にある内側の角が錯角です。2本の直線が平行なら同位角と錯角は等しく、逆に同位角や錯角が等しければ2直線は平行です。平行線では、同じ側の内側の2つの角(同側内角)の和は180°です。'],
    '두 직선이 평행할 때 각 ①의 동위각과 엇각이 어느 각인지 번호를 바꿔 가며 찾아보세요':['When the lines are parallel, change the angle number and find which angles are the corresponding and alternate angles of ∠①','Con las rectas paralelas, cambia el número del ángulo y busca cuáles son el correspondiente y el alterno de ∠①','Quand les droites sont parallèles, change le numéro de l’angle et cherche l’angle correspondant et l’alterne de ∠①','Ändere bei parallelen Geraden die Winkelnummer und finde Stufen- und Wechselwinkel von ∠①','2直線が平行なとき、角の番号を変えながら、角①の同位角と錯角がどれか探してみよう'],
    '평행 조건을 끄고 기울기를 바꾸면 동위각이 같지 않게 되는 것을 확인해 보세요':['Turn off the parallel option and change the tilt to see that corresponding angles are no longer equal','Desactiva la opción de paralelas y cambia la inclinación para ver que los correspondientes ya no son iguales','Désactive l’option parallèle et change l’inclinaison pour voir que les angles correspondants ne sont plus égaux','Schalte die Parallelität aus und ändere die Neigung, um zu sehen, dass die Stufenwinkel nicht mehr gleich sind','平行の条件を切って傾きを変えると、同位角が等しくなくなることを確かめてみよう'],
    '동측내각의 합이 언제 180°가 되나요?':['When do the co-interior angles add up to 180°?','¿Cuándo suman 180° los ángulos internos del mismo lado?','Quand les angles intérieurs du même côté ont-ils pour somme 180° ?','Wann ergeben die Winkel auf derselben Innenseite 180°?','同側内角の和はいつ180°になりますか?'],
    '각 번호를 바꾸면 색칠된 각과 짝이 되는 각이 표시돼요.':['Change the angle number and the highlighted angle and its partner angles are shown.','Cambia el número de ángulo y se muestran el ángulo resaltado y sus ángulos pareja.','Change le numéro de l’angle et l’angle coloré avec ses angles associés s’affichent.','Ändere die Winkelnummer, dann werden der markierte Winkel und seine Partnerwinkel angezeigt.','角の番号を変えると、色のついた角とそのペアの角が表示されます。'],
    '직선과 만나는 각':['Angle with the transversal','Ángulo con la transversal','Angle avec la sécante','Winkel mit der Schneidenden','直線と交わる角'],
    '두 직선이 평행':['Lines are parallel','Rectas paralelas','Droites parallèles','Geraden parallel','2直線が平行'],
    '아래 직선을 기울인 정도':['Tilt of the lower line','Inclinación de la recta inferior','Inclinaison de la droite du bas','Neigung der unteren Geraden','下の直線の傾き'],
    '살펴볼 각의 번호':['Number of the angle to examine','Número del ángulo que se examina','Numéro de l’angle à examiner','Nummer des betrachteten Winkels','調べる角の番号'],
    '각 번호':['Angle number','Número del ángulo','Numéro de l’angle','Winkelnummer','角の番号'],
    '그 각':['That angle','Ese ángulo','Cet angle','Dieser Winkel','その角'],
    '동위각':['Corresponding angle','Ángulo correspondiente','Angle correspondant','Stufenwinkel','同位角'],
    '동위각의 차':['Difference of corresponding angles','Diferencia de los correspondientes','Écart des angles correspondants','Differenz der Stufenwinkel','同位角の差'],
    '맞꼭지각':['Vertical angle','Ángulo opuesto por el vértice','Angle opposé par le sommet','Scheitelwinkel','対頂角'],
    '엇각':['Alternate angle','Ángulo alterno interno','Angle alterne-interne','Wechselwinkel','錯角'],
    '선택한 각 ∠{0}':['Selected angle ∠{0}','Ángulo seleccionado ∠{0}','Angle sélectionné ∠{0}','Gewählter Winkel ∠{0}','選んだ角 ∠{0}'],
    '맞꼭지각 ∠{0}':['Vertical angle ∠{0}','Ángulo opuesto por el vértice ∠{0}','Angle opposé par le sommet ∠{0}','Scheitelwinkel ∠{0}','対頂角 ∠{0}'],
    '동위각 ∠{0}':['Corresponding angle ∠{0}','Ángulo correspondiente ∠{0}','Angle correspondant ∠{0}','Stufenwinkel ∠{0}','同位角 ∠{0}'],
    '엇각 ∠{0}':['Alternate angle ∠{0}','Ángulo alterno ∠{0}','Angle alterne ∠{0}','Wechselwinkel ∠{0}','錯角 ∠{0}'],
    '동측내각 ∠{0}와의 합':['Sum with co-interior angle ∠{0}','Suma con el ángulo coladual ∠{0}','Somme avec l\'angle co-intérieur ∠{0}','Summe mit dem Nebenwinkel ∠{0} (innen, gleiche Seite)','同側内角 ∠{0} との和'],
    '동위각의 차 (0이면 평행)':['Difference of corresponding angles (0 means parallel)','Diferencia de correspondientes (0 significa paralelas)','Écart des angles correspondants (0 signifie parallèles)','Differenz der Stufenwinkel (0 heißt parallel)','同位角の差(0なら平行)'],
    '두 직선':['The two lines','Las dos rectas','Les deux droites','Die beiden Geraden','2直線'],
    '평행해요':['They are parallel','Son paralelas','Elles sont parallèles','Sie sind parallel','平行です'],
    '평행하지 않아요':['They are not parallel','No son paralelas','Elles ne sont pas parallèles','Sie sind nicht parallel','平行ではありません'],
    '눈금 없는 자와 컴퍼스로 작도':['Constructions with a straightedge and compass','Construcciones con regla y compás','Constructions à la règle et au compas','Konstruktionen mit Lineal und Zirkel','定規とコンパスで作図'],
    '수직이등분선, 각의 이등분선, 정삼각형을 차례로 작도하기':['Construct a perpendicular bisector, an angle bisector and an equilateral triangle step by step','Construir paso a paso una mediatriz, una bisectriz y un triángulo equilátero','Construire pas à pas une médiatrice, une bissectrice et un triangle équilatéral','Schrittweise Mittelsenkrechte, Winkelhalbierende und gleichseitiges Dreieck konstruieren','垂直二等分線・角の二等分線・正三角形を順に作図する'],
    '작도는 눈금 없는 자와 컴퍼스만으로 도형을 그리는 일이에요. 자는 두 점을 잇는 선을 긋는 데, 컴퍼스는 원이나 같은 길이를 옮기는 데 써요. 선분의 수직이등분선은 두 끝점에서 같은 반지름의 원을 그려 만나는 두 점을 잇고, 각의 이등분선은 꼭짓점에서 그린 호와 두 변의 교점에서 같은 반지름의 호를 그려 만난 점을 지나요. 정삼각형은 선분의 길이를 반지름으로 두 호를 그려서 만들어요.':['A construction draws figures using only an unmarked straightedge and a compass. The straightedge draws lines through two points; the compass draws circles or carries equal lengths. For the perpendicular bisector of a segment, draw circles of the same radius from both endpoints and join the two points where they meet. The angle bisector passes through the point where equal-radius arcs, drawn from the points where an arc around the vertex meets the two sides, cross. An equilateral triangle comes from two arcs whose radius is the segment length.','Una construcción dibuja figuras solo con una regla sin marcas y un compás. La regla traza rectas por dos puntos; el compás traza circunferencias o traslada longitudes iguales. La mediatriz de un segmento se obtiene trazando circunferencias del mismo radio desde ambos extremos y uniendo los dos puntos donde se cortan. La bisectriz de un ángulo pasa por el punto donde se cortan arcos de igual radio trazados desde los puntos en que un arco con centro en el vértice corta los dos lados. Un triángulo equilátero sale de dos arcos cuyo radio es la longitud del segmento.','Une construction trace des figures avec seulement une règle non graduée et un compas. La règle trace une droite par deux points ; le compas trace des cercles ou reporte des longueurs égales. Pour la médiatrice d’un segment, on trace des cercles de même rayon depuis les deux extrémités et on joint les deux points d’intersection. La bissectrice passe par le point où se coupent des arcs de même rayon tracés depuis les points où un arc centré au sommet coupe les deux côtés. Un triangle équilatéral s’obtient avec deux arcs dont le rayon est la longueur du segment.','Eine Konstruktion zeichnet Figuren nur mit einem Lineal ohne Skala und einem Zirkel. Das Lineal zieht Geraden durch zwei Punkte, der Zirkel zeichnet Kreise oder überträgt gleiche Längen. Für die Mittelsenkrechte einer Strecke zeichnet man von beiden Endpunkten Kreise mit gleichem Radius und verbindet ihre beiden Schnittpunkte. Die Winkelhalbierende geht durch den Punkt, in dem sich gleich große Bögen schneiden, die man von den Punkten zieht, wo ein Bogen um den Scheitel die beiden Schenkel trifft. Ein gleichseitiges Dreieck entsteht aus zwei Bögen, deren Radius die Streckenlänge ist.','作図は、目盛りのない定規とコンパスだけで図形をかくことです。定規は2点を通る線をひくのに、コンパスは円や同じ長さを写すのに使います。線分の垂直二等分線は、両端から同じ半径の円をかいて交わる2点を結びます。角の二等分線は、頂点を中心にかいた弧と2辺との交点から同じ半径の弧をかいて交わった点を通ります。正三角形は線分の長さを半径にして2つの弧をかいて作ります。'],
    '단계를 한 칸씩 올리며 어디에서 컴퍼스를 꽂고 어떤 반지름으로 호를 그리는지 확인해 보세요':['Raise the step one at a time and check where the compass point goes and what radius the arc has','Sube el paso de uno en uno y comprueba dónde se clava el compás y qué radio tiene el arco','Monte d’une étape à la fois et vérifie où l’on pique le compas et quel rayon a l’arc','Erhöhe den Schritt jeweils um 1 und prüfe, wo der Zirkel eingestochen wird und welchen Radius der Bogen hat','段階を1つずつ上げて、どこにコンパスの針を刺し、どんな半径で弧をかくか確かめてみよう'],
    '선분의 길이나 각의 크기를 바꾸어도 작도가 같은 방법으로 되는지 보세요':['See whether the construction works the same way when you change the segment length or the angle','Mira si la construcción funciona igual al cambiar la longitud del segmento o el ángulo','Regarde si la construction marche de la même façon quand tu changes la longueur du segment ou l’angle','Prüfe, ob die Konstruktion genauso funktioniert, wenn du Streckenlänge oder Winkel änderst','線分の長さや角の大きさを変えても、同じ方法で作図できるか見てみよう'],
    '정삼각형의 세 각이 모두 몇 도인지 읽어 보세요':['Read how many degrees each of the three angles of the equilateral triangle is','Lee cuántos grados mide cada uno de los tres ángulos del triángulo equilátero','Lis combien de degrés mesure chacun des trois angles du triangle équilatéral','Lies ab, wie viele Grad jeder der drei Winkel des gleichseitigen Dreiecks hat','正三角形の3つの角がそれぞれ何度か読んでみよう'],
    '단계 슬라이더나 시작 버튼으로 작도를 차례로 따라가 보세요.':['Follow the construction step by step with the step slider or the start button.','Sigue la construcción paso a paso con el deslizador de pasos o el botón de inicio.','Suis la construction étape par étape avec le curseur d’étapes ou le bouton démarrer.','Verfolge die Konstruktion Schritt für Schritt mit dem Schritt-Regler oder dem Start-Knopf.','段階スライダーかスタートボタンで、作図を順にたどってみよう。'],
    '따라 그리기':['Follow along','Seguir el dibujo','Suivre le tracé','Mitzeichnen','なぞって描く'],
    '작도':['Construction','Construcción','Construction','Konstruktion','作図'],
    '수직이등분선':['Perpendicular bisector','Mediatriz','Médiatrice','Mittelsenkrechte','垂直二等分線'],
    '각의 이등분선':['Angle bisector','Bisectriz','Bissectrice','Winkelhalbierende','角の二等分線'],
    '작도 단계':['Construction step','Paso de la construcción','Étape de la construction','Konstruktionsschritt','作図の段階'],
    '선분의 길이':['Length of the segment','Longitud del segmento','Longueur du segment','Länge der Strecke','線分の長さ'],
    '각의 크기':['Size of the angle','Medida del ángulo','Mesure de l’angle','Größe des Winkels','角の大きさ'],
    '돌려 놓기':['Rotate','Girar','Faire pivoter','Drehen','回転'],
    '단계':['Step','Paso','Étape','Schritt','段階'],
    '확인하는 값 1':['Value to check 1','Valor a comprobar 1','Valeur à vérifier 1','Zu prüfender Wert 1','確かめる値 1'],
    '확인하는 값 2':['Value to check 2','Valor a comprobar 2','Valeur à vérifier 2','Zu prüfender Wert 2','確かめる値 2'],
    '꼭짓점 O를 중심으로 호를 그려 두 변과의 교점 P, Q를 찾아요':['Draw an arc centered at the vertex O to find the points P and Q where it meets the two sides','Traza un arco con centro en el vértice O para hallar los puntos P y Q donde corta a los dos lados','Trace un arc centré au sommet O pour trouver les points P et Q où il coupe les deux côtés','Zeichne einen Bogen um den Scheitel O und finde die Punkte P und Q, wo er die beiden Schenkel trifft','頂点Oを中心に弧をかいて、2辺との交点P、Qを見つけます'],
    'P, Q를 중심으로 같은 반지름의 호를 그려요':['Draw an arc of the same radius centered at P','Traza un arco del mismo radio con centro en P','Trace un arc de même rayon centré en P','Zeichne einen Bogen mit gleichem Radius um P','Pを中心に同じ半径の弧をかきます'],
    'Q를 중심으로 같은 반지름의 호를 그려 점 R에서 만나요':['Draw an arc of the same radius centered at Q; they meet at the point R','Traza un arco del mismo radio con centro en Q; se cortan en el punto R','Trace un arc de même rayon centré en Q ; ils se coupent au point R','Zeichne einen Bogen mit gleichem Radius um Q; sie schneiden sich im Punkt R','Qを中心に同じ半径の弧をかくと、点Rで交わります'],
    '반직선 OR이 각의 이등분선이에요':['The ray OR is the angle bisector','La semirrecta OR es la bisectriz del ángulo','La demi-droite OR est la bissectrice de l’angle','Der Strahl OR ist die Winkelhalbierende','半直線ORが角の二等分線です'],
    '컴퍼스를 꽂을 곳과 반지름을 따라가 보세요':['Follow where to put the compass point and what radius to use','Sigue dónde clavar el compás y qué radio usar','Suis l’endroit où piquer le compas et le rayon à utiliser','Verfolge, wo der Zirkel eingestochen wird und welchen Radius man nimmt','コンパスの針を刺す場所と半径をたどってみよう'],
    '점 A를 중심으로 반지름 AB의 반 이상의 호를 위아래로 그려요':['Draw arcs above and below with center A and a radius more than half of AB','Traza arcos arriba y abajo con centro en A y radio mayor que la mitad de AB','Trace des arcs au-dessus et en dessous centrés en A avec un rayon supérieur à la moitié de AB','Zeichne mit Mittelpunkt A und einem Radius größer als die Hälfte von AB Bögen nach oben und unten','点Aを中心に、ABの半分より大きい半径の弧を上下にかきます'],
    '점 B를 중심으로 같은 반지름의 호를 그려요':['Draw arcs of the same radius with center B','Traza arcos del mismo radio con centro en B','Trace des arcs de même rayon centrés en B','Zeichne Bögen mit gleichem Radius um B','点Bを中心に同じ半径の弧をかきます'],
    '두 호가 만나는 점 P, Q를 찾아요':['Find the points P and Q where the two arcs meet','Halla los puntos P y Q donde se cortan los dos arcos','Trouve les points P et Q où les deux arcs se coupent','Finde die Punkte P und Q, in denen sich die beiden Bögen schneiden','2つの弧が交わる点P、Qを見つけます'],
    'P와 Q를 이은 직선을 그어요':['Draw the line through P and Q','Traza la recta que pasa por P y Q','Trace la droite passant par P et Q','Ziehe die Gerade durch P und Q','PとQを結ぶ直線をひきます'],
    'AB와 만나는 점 M은 중점이고 AB ⊥ PQ예요':['The point M where it meets AB is the midpoint and AB ⊥ PQ','El punto M donde corta a AB es el punto medio y AB ⊥ PQ','Le point M où elle coupe AB est le milieu et AB ⊥ PQ','Der Schnittpunkt M mit AB ist der Mittelpunkt und AB ⊥ PQ','ABと交わる点Mは中点で、AB ⊥ PQです'],
    '점 A를 중심으로 반지름 AB인 호를 그려요':['Draw an arc with center A and radius AB','Traza un arco con centro en A y radio AB','Trace un arc centré en A de rayon AB','Zeichne einen Bogen um A mit Radius AB','点Aを中心に半径ABの弧をかきます'],
    '점 B를 중심으로 같은 반지름의 호를 그려 점 C에서 만나요':['Draw an arc of the same radius with center B; they meet at the point C','Traza un arco del mismo radio con centro en B; se cortan en el punto C','Trace un arc de même rayon centré en B ; ils se coupent au point C','Zeichne einen Bogen mit gleichem Radius um B; sie schneiden sich im Punkt C','点Bを中心に同じ半径の弧をかくと、点Cで交わります'],
    'AC와 BC를 이어요':['Join AC and BC','Une AC y BC','Joins AC et BC','Verbinde AC und BC','ACとBCを結びます'],
    '세 변이 모두 같아 세 각이 모두 60°예요':['All three sides are equal, so all three angles are 60°','Los tres lados son iguales, así que los tres ángulos miden 60°','Les trois côtés sont égaux, donc les trois angles mesurent 60°','Alle drei Seiten sind gleich, also sind alle drei Winkel 60°','3辺がすべて等しいので、3つの角はすべて60°です'],
    'AM의 길이':['Length of AM','Longitud de AM','Longueur de AM','Länge von AM','AMの長さ'],
    'BM의 길이':['Length of BM','Longitud de BM','Longueur de BM','Länge von BM','BMの長さ'],
    'PQ와 AB가 이루는 각':['Angle between PQ and AB','Ángulo entre PQ y AB','Angle entre PQ et AB','Winkel zwischen PQ und AB','PQとABがなす角'],
    '각 B의 반':['Half of angle B','Mitad del ángulo B','Moitié de l’angle B','Hälfte des Winkels B','角Bの半分'],
    'AC의 길이':['Length of AC','Longitud de AC','Longueur de AC','Länge von AC','ACの長さ'],
    'BC의 길이':['Length of BC','Longitud de BC','Longueur de BC','Länge von BC','BCの長さ'],
    'AB의 길이':['Length of AB','Longitud de AB','Longueur de AB','Länge von AB','ABの長さ'],
    '세 각':['The three angles','Los tres ángulos','Les trois angles','Die drei Winkel','3つの角'],
    '삼각형과 다각형의 내각의 합':['Angle sum of triangles and polygons','Suma de los ángulos de triángulos y polígonos','Somme des angles des triangles et des polygones','Winkelsumme in Dreiecken und Vielecken','三角形と多角形の内角の和'],
    '세 각을 모으면 180°, 다각형은 (n − 2) × 180°':['Three angles together make 180°; a polygon has (n − 2) × 180°','Los tres ángulos juntos suman 180°; un polígono, (n − 2) × 180°','Les trois angles réunis font 180° ; un polygone a (n − 2) × 180°','Die drei Winkel ergeben zusammen 180°; ein Vieleck hat (n − 2) × 180°','3つの角を集めると180°、多角形は(n − 2) × 180°'],
    '삼각형의 세 내각을 한 점에 모으면 일직선(180°)이 돼요. 평행선의 엇각이 같다는 성질로 증명할 수 있어요. n각형은 한 꼭짓점에서 대각선을 그으면 (n − 2)개의 삼각형으로 나뉘므로 내각의 합은 180° × (n − 2)예요. 한 꼭짓점의 외각은 180°에서 내각을 뺀 값이고, 외각의 합은 변의 수와 관계없이 항상 360°예요.':['If you gather the three interior angles of a triangle at one point, they form a straight line (180°). You can prove it with the fact that alternate angles of parallel lines are equal. A diagonal from one vertex splits an n-gon into (n − 2) triangles, so the sum of the interior angles is 180° × (n − 2). An exterior angle at a vertex is 180° minus the interior angle, and the exterior angles always add up to 360° whatever the number of sides.','Si se juntan en un punto los tres ángulos interiores de un triángulo, forman una línea recta (180°). Se puede demostrar con la igualdad de los ángulos alternos internos de las paralelas. Las diagonales desde un vértice dividen un n-ágono en (n − 2) triángulos, así que la suma de los ángulos interiores es 180° × (n − 2). El ángulo exterior de un vértice es 180° menos el interior, y los ángulos exteriores siempre suman 360°, sea cual sea el número de lados.','Si l’on réunit en un point les trois angles intérieurs d’un triangle, ils forment une ligne droite (180°). On peut le démontrer avec l’égalité des angles alternes-internes de droites parallèles. Les diagonales issues d’un sommet partagent un polygone à n côtés en (n − 2) triangles, donc la somme des angles intérieurs vaut 180° × (n − 2). L’angle extérieur d’un sommet vaut 180° moins l’angle intérieur, et les angles extérieurs ont toujours pour somme 360°, quel que soit le nombre de côtés.','Legt man die drei Innenwinkel eines Dreiecks an einem Punkt zusammen, bilden sie eine Gerade (180°). Das lässt sich mit der Gleichheit der Wechselwinkel an Parallelen beweisen. Diagonalen von einer Ecke aus zerlegen ein n-Eck in (n − 2) Dreiecke, also ist die Innenwinkelsumme 180° × (n − 2). Ein Außenwinkel ist 180° minus Innenwinkel, und die Außenwinkel ergeben unabhängig von der Seitenzahl immer 360°.','三角形の3つの内角を1点に集めると一直線(180°)になります。平行線の錯角が等しいという性質で証明できます。n角形は1つの頂点から対角線をひくと(n − 2)個の三角形に分かれるので、内角の和は180° × (n − 2)です。頂点の外角は180°から内角を引いた値で、外角の和は辺の数に関係なくいつも360°です。'],
    '시작을 눌러 삼각형의 세 각을 한 점으로 모으고 합이 180°인지 확인해 보세요':['Press start to gather the three angles of the triangle at one point and check that they add up to 180°','Pulsa iniciar para juntar los tres ángulos del triángulo en un punto y comprobar que suman 180°','Appuie sur démarrer pour réunir les trois angles du triangle en un point et vérifier qu’ils font 180°','Drücke Start, um die drei Winkel des Dreiecks an einem Punkt zu sammeln und zu prüfen, dass sie 180° ergeben','スタートを押して三角形の3つの角を1点に集め、合計が180°か確かめてみよう'],
    '변의 수를 3에서 10까지 바꾸고 내각의 합이 (n − 2) × 180°인지 표로 확인해 보세요':['Change the number of sides from 3 to 10 and check in the table that the angle sum is (n − 2) × 180°','Cambia el número de lados de 3 a 10 y comprueba que la suma es (n − 2) × 180°','Change le nombre de côtés de 3 à 10 et vérifie que la somme est (n − 2) × 180°','Ändere die Seitenzahl von 3 bis 10 und prüfe, ob die Winkelsumme (n − 2) × 180° ist','辺の数を3から10まで変えて、内角の和が(n − 2) × 180°か表で確かめてみよう'],
    '모양을 일그러뜨려도 합이 변하지 않나요?':['Does the sum stay the same even if you distort the shape?','¿La suma sigue igual aunque deformes la figura?','La somme reste-t-elle la même si tu déformes la figure ?','Bleibt die Summe gleich, auch wenn du die Form verzerrst?','形をゆがめても合計は変わりませんか?'],
    '각 모으기':['Gather the angles','Juntar los ángulos','Réunir les angles','Winkel sammeln','角を集める'],
    '변의 수':['Number of sides','Número de lados','Nombre de côtés','Anzahl der Seiten','辺の数'],
    '일그러뜨린 정도':['Amount of distortion','Grado de deformación','Degré de déformation','Grad der Verzerrung','ゆがみの大きさ'],
    '대각선으로 삼각형 나누기':['Split into triangles with diagonals','Dividir en triángulos con diagonales','Partager en triangles avec des diagonales','Mit Diagonalen in Dreiecke zerlegen','対角線で三角形に分ける'],
    '변의 수 n':['Number of sides n','Número de lados n','Nombre de côtés n','Seitenzahl n','辺の数 n'],
    '내각의 합':['Sum of interior angles','Suma de ángulos interiores','Somme des angles intérieurs','Summe der Innenwinkel','内角の和'],
    '외각의 합':['Sum of exterior angles','Suma de ángulos exteriores','Somme des angles extérieurs','Summe der Außenwinkel','外角の和'],
    '추세선의 기울기 {0}: 변이 하나 늘 때마다 내각의 합이 늘어나는 양이에요':['Trend line slope {0}: how much the angle sum grows for each extra side','Pendiente de la recta de tendencia {0}: cuánto crece la suma por cada lado más','Pente de la droite de tendance {0} : de combien la somme augmente pour chaque côté en plus','Steigung der Trendgeraden {0}: so viel wächst die Winkelsumme mit jeder weiteren Seite','近似直線の傾き{0}: 辺が1つ増えるごとに内角の和が増える量です'],
    '일직선 = 180°':['Straight line = 180°','Línea recta = 180°','Ligne droite = 180°','Gerade = 180°','一直線 = 180°'],
    '내각의 합 = {0}°':['Sum of interior angles = {0}°','Suma de ángulos interiores = {0}°','Somme des angles intérieurs = {0}°','Summe der Innenwinkel = {0}°','内角の和 = {0}°'],
    '삼각형의 개수 (한 꼭짓점에서 나눌 때)':['Number of triangles (splitting from one vertex)','Número de triángulos (dividiendo desde un vértice)','Nombre de triangles (en partageant depuis un sommet)','Anzahl der Dreiecke (Zerlegung von einer Ecke aus)','三角形の個数(1つの頂点から分けるとき)'],
    '각각의 내각':['Each interior angle','Cada ángulo interior','Chaque angle intérieur','Jeder Innenwinkel','それぞれの内角'],
    '물통에 물 채우기':['Filling a water tank','Llenar un depósito de agua','Remplir un réservoir d’eau','Wassertank füllen','水そうに水を入れる'],
    '처음 양과 1분당 변화량으로 일차함수 V = at + b 만들기':['Build the linear function V = at + b from the starting amount and the change per minute','Construir la función lineal V = at + b con la cantidad inicial y el cambio por minuto','Construire la fonction affine V = at + b à partir de la quantité initiale et de la variation par minute','Die lineare Funktion V = at + b aus Anfangsmenge und Änderung pro Minute aufstellen','最初の量と1分あたりの変化量で一次関数 V = at + b を作る'],
    '물통에 처음 b L의 물이 있고 1분마다 a L씩 물을 채우면, t분 뒤 물의 양은 V = at + b예요. 이것은 일차함수이고, 기울기 a는 1분 동안 변하는 물의 양(변화율), y절편 b는 처음 물의 양이에요. a가 음수이면 물이 빠지는 경우이고 그래프가 내려가요. 시작을 누르면 물통과 그래프의 점이 함께 움직여요.':['If a tank starts with b L of water and a L of water is added every minute, the amount of water after t minutes is V = at + b. This is a linear function: the slope a is the amount that changes in one minute (rate of change) and the y-intercept b is the starting amount. If a is negative, water is draining and the graph goes down. Press start and the tank and the point on the graph move together.','Si un depósito empieza con b L de agua y cada minuto se añaden a L, la cantidad tras t minutos es V = at + b. Es una función lineal: la pendiente a es lo que cambia en un minuto (tasa de cambio) y la ordenada en el origen b es la cantidad inicial. Si a es negativa, el agua se vacía y la gráfica baja. Al pulsar iniciar, el depósito y el punto de la gráfica se mueven a la vez.','Si un réservoir contient b L d’eau au départ et qu’on ajoute a L chaque minute, la quantité après t minutes est V = at + b. C’est une fonction affine : la pente a est ce qui change en une minute (taux de variation) et l’ordonnée à l’origine b est la quantité initiale. Si a est négatif, l’eau s’écoule et le graphique descend. Quand tu appuies sur démarrer, le réservoir et le point du graphique bougent ensemble.','Hat ein Tank anfangs b L Wasser und kommen jede Minute a L dazu, ist die Wassermenge nach t Minuten V = at + b. Das ist eine lineare Funktion: Die Steigung a ist die Änderung in einer Minute (Änderungsrate), der y-Achsenabschnitt b die Anfangsmenge. Ist a negativ, läuft Wasser ab und der Graph fällt. Mit Start bewegen sich Tank und Punkt im Graphen gemeinsam.','水そうに最初b Lの水があり、1分ごとにa Lずつ水を入れると、t分後の水の量はV = at + bです。これは一次関数で、傾きaは1分間に変わる水の量(変化の割合)、y切片bは最初の水の量です。aが負なら水が減る場合でグラフは下がります。スタートを押すと、水そうとグラフの点が一緒に動きます。'],
    '처음 물의 양 b를 바꾸면 그래프가 어떻게 움직이나요? 기울기는 그대로인가요?':['How does the graph move if you change the starting amount b? Does the slope stay the same?','¿Cómo se mueve la gráfica si cambias la cantidad inicial b? ¿Sigue igual la pendiente?','Comment le graphique bouge-t-il si tu changes la quantité initiale b ? La pente reste-t-elle la même ?','Wie bewegt sich der Graph, wenn du die Anfangsmenge b änderst? Bleibt die Steigung gleich?','最初の水の量bを変えると、グラフはどう動きますか? 傾きはそのままですか?'],
    '가득 찰 때까지 걸리는 시간을 식 at + b = 100에서 구해서 실제와 비교해 보세요':['Find the time to fill up from the equation at + b = 100 and compare it with what you see','Halla el tiempo en llenarse con la ecuación at + b = 100 y compáralo con lo que ves','Trouve le temps de remplissage avec l’équation at + b = 100 et compare avec ce que tu vois','Berechne die Füllzeit aus der Gleichung at + b = 100 und vergleiche mit dem, was du siehst','満水になるまでの時間を式at + b = 100から求めて、実際と比べてみよう'],
    '기울기를 음수로 하면 물통은 어떻게 되나요?':['What happens to the tank if the slope is negative?','¿Qué le pasa al depósito si la pendiente es negativa?','Que se passe-t-il pour le réservoir si la pente est négative ?','Was passiert mit dem Tank, wenn die Steigung negativ ist?','傾きを負にすると、水そうはどうなりますか?'],
    '물 틀기':['Turn on the tap','Abrir el grifo','Ouvrir le robinet','Wasser aufdrehen','水を出す'],
    '처음 물의 양 b':['Starting amount of water b','Cantidad inicial de agua b','Quantité d’eau initiale b','Anfängliche Wassermenge b','最初の水の量 b'],
    '1분당 변하는 양 a':['Change per minute a','Cambio por minuto a','Variation par minute a','Änderung pro Minute a','1分あたりの変化量 a'],
    'L/분':['L/min','L/min','L/min','L/Min.','L/分'],
    '물통의 크기':['Size of the tank','Capacidad del depósito','Capacité du réservoir','Größe des Tanks','水そうの大きさ'],
    '물의 양':['Amount of water','Cantidad de agua','Quantité d’eau','Wassermenge','水の量'],
    '추세선의 기울기 {0}, 절편 {1}을 a, b와 비교해 보세요':['Compare the trend line slope {0} and intercept {1} with a and b','Compara la pendiente {0} y la ordenada {1} de la recta de tendencia con a y b','Compare la pente {0} et l’ordonnée à l’origine {1} de la droite de tendance avec a et b','Vergleiche Steigung {0} und Achsenabschnitt {1} der Trendgeraden mit a und b','近似直線の傾き{0}、切片{1}をa、bと比べてみよう'],
    '물의 양 (L)':['Amount of water (L)','Cantidad de agua (L)','Quantité d’eau (L)','Wassermenge (L)','水の量 (L)'],
    '기울기 a (1분당 변화)':['Slope a (change per minute)','Pendiente a (cambio por minuto)','Pente a (variation par minute)','Steigung a (Änderung pro Minute)','傾き a (1分あたりの変化)'],
    '처음 물의 양 b (y절편)':['Starting amount b (y-intercept)','Cantidad inicial b (ordenada en el origen)','Quantité initiale b (ordonnée à l’origine)','Anfangsmenge b (y-Achsenabschnitt)','最初の水の量 b (y切片)'],
    '가득 찰 때까지':['Until full','Hasta llenarse','Jusqu’à ce qu’il soit plein','Bis er voll ist','満水になるまで'],
    '다 빠질 때까지':['Until empty','Hasta vaciarse','Jusqu’à ce qu’il soit vide','Bis er leer ist','空になるまで'],
    '변화 없음':['No change','Sin cambio','Pas de changement','Keine Änderung','変化なし'],
    '일차방정식과 직선의 교점':['Linear equations and the intersection of lines','Ecuaciones lineales y el punto de corte de rectas','Équations du premier degré et intersection de droites','Lineare Gleichungen und der Schnittpunkt von Geraden','一次方程式と直線の交点'],
    'ax + b = cx + d의 해는 두 직선 y = ax + b, y = cx + d의 교점의 x 좌표':['The solution of ax + b = cx + d is the x coordinate of the intersection of y = ax + b and y = cx + d','La solución de ax + b = cx + d es la coordenada x del punto de corte de y = ax + b e y = cx + d','La solution de ax + b = cx + d est l’abscisse du point d’intersection de y = ax + b et y = cx + d','Die Lösung von ax + b = cx + d ist die x-Koordinate des Schnittpunkts von y = ax + b und y = cx + d','ax + b = cx + dの解は、2直線y = ax + b、y = cx + dの交点のx座標'],
    '일차방정식 ax + b = cx + d의 해는 두 일차함수 y = ax + b와 y = cx + d의 그래프가 만나는 점의 x 좌표예요. 두 직선의 기울기가 다르면 교점이 하나 있어서 해가 하나이고, 기울기는 같고 y절편이 다르면 평행해서 해가 없고, 완전히 겹치면 해가 무수히 많아요. 또한 (a − c)x + (b − d) = 0으로 정리하면 y = (a − c)x + (b − d)의 x절편이 해예요.':['The solution of the linear equation ax + b = cx + d is the x coordinate of the point where the graphs of the two linear functions y = ax + b and y = cx + d meet. If the slopes differ, the lines meet at one point and there is one solution. If the slopes are equal and the y-intercepts differ, the lines are parallel and there is no solution; if they coincide, there are infinitely many solutions. Also, rewriting it as (a − c)x + (b − d) = 0, the solution is the x-intercept of y = (a − c)x + (b − d).','La solución de la ecuación lineal ax + b = cx + d es la coordenada x del punto donde se cortan las gráficas de las funciones lineales y = ax + b e y = cx + d. Si las pendientes son distintas, las rectas se cortan en un punto y hay una solución. Si las pendientes son iguales y las ordenadas distintas, son paralelas y no hay solución; si coinciden, hay infinitas soluciones. Además, al escribirla como (a − c)x + (b − d) = 0, la solución es el punto de corte con el eje x de y = (a − c)x + (b − d).','La solution de l’équation ax + b = cx + d est l’abscisse du point où se coupent les graphiques des fonctions affines y = ax + b et y = cx + d. Si les pentes sont différentes, les droites se coupent en un point et il y a une solution. Si les pentes sont égales et les ordonnées à l’origine différentes, elles sont parallèles et il n’y a pas de solution ; si elles sont confondues, il y a une infinité de solutions. De plus, en écrivant (a − c)x + (b − d) = 0, la solution est l’abscisse du point où y = (a − c)x + (b − d) coupe l’axe x.','Die Lösung der linearen Gleichung ax + b = cx + d ist die x-Koordinate des Punkts, in dem sich die Graphen der linearen Funktionen y = ax + b und y = cx + d schneiden. Sind die Steigungen verschieden, schneiden sich die Geraden in einem Punkt und es gibt eine Lösung. Sind die Steigungen gleich und die y-Achsenabschnitte verschieden, sind sie parallel und es gibt keine Lösung; fallen sie zusammen, gibt es unendlich viele. Umgeformt zu (a − c)x + (b − d) = 0 ist die Lösung die Nullstelle von y = (a − c)x + (b − d).','一次方程式ax + b = cx + dの解は、2つの一次関数y = ax + bとy = cx + dのグラフが交わる点のx座標です。2直線の傾きが違えば交点が1つあって解が1つ、傾きが同じでy切片が違えば平行で解がなく、完全に重なれば解は無数にあります。また(a − c)x + (b − d) = 0と整理すると、y = (a − c)x + (b − d)のx切片が解です。'],
    'y = 2x + 1과 y = −x + 7의 교점을 찾고 방정식 2x + 1 = −x + 7을 풀어 비교해 보세요':['Find the intersection of y = 2x + 1 and y = −x + 7 and compare it with solving 2x + 1 = −x + 7','Halla el punto de corte de y = 2x + 1 e y = −x + 7 y compáralo con resolver 2x + 1 = −x + 7','Trouve l’intersection de y = 2x + 1 et y = −x + 7 et compare avec la résolution de 2x + 1 = −x + 7','Bestimme den Schnittpunkt von y = 2x + 1 und y = −x + 7 und vergleiche mit der Lösung von 2x + 1 = −x + 7','y = 2x + 1とy = −x + 7の交点を見つけ、方程式2x + 1 = −x + 7を解いた結果と比べてみよう'],
    '기울기를 같게 하고 b와 d를 다르게 하면 어떻게 되나요?':['What happens if you make the slopes equal and b and d different?','¿Qué pasa si igualas las pendientes y haces distintos b y d?','Que se passe-t-il si tu rends les pentes égales et b et d différents ?','Was passiert, wenn du die Steigungen gleich und b und d verschieden machst?','傾きを同じにして、bとdを違う値にするとどうなりますか?'],
    '차의 그래프를 켜고 x절편이 교점의 x 좌표와 같은지 확인해 보세요':['Turn on the difference graph and check that its x-intercept equals the x coordinate of the intersection','Activa la gráfica de la diferencia y comprueba que su corte con el eje x coincide con la coordenada x del punto de corte','Active le graphique de la différence et vérifie que son point sur l’axe x est l’abscisse de l’intersection','Schalte den Differenzgraphen ein und prüfe, ob seine Nullstelle gleich der x-Koordinate des Schnittpunkts ist','差のグラフをオンにして、x切片が交点のx座標と同じか確かめてみよう'],
    '첫째 직선의 기울기 a':['Slope a of the first line','Pendiente a de la primera recta','Pente a de la première droite','Steigung a der ersten Geraden','1本目の直線の傾き a'],
    '첫째 직선의 y절편 b':['y-intercept b of the first line','Ordenada b de la primera recta','Ordonnée à l’origine b de la première droite','y-Achsenabschnitt b der ersten Geraden','1本目の直線のy切片 b'],
    '둘째 직선의 기울기 c':['Slope c of the second line','Pendiente c de la segunda recta','Pente c de la deuxième droite','Steigung c der zweiten Geraden','2本目の直線の傾き c'],
    '둘째 직선의 y절편 d':['y-intercept d of the second line','Ordenada d de la segunda recta','Ordonnée à l’origine d de la deuxième droite','y-Achsenabschnitt d der zweiten Geraden','2本目の直線のy切片 d'],
    '차의 그래프도 보기':['Also show the difference graph','Mostrar también la gráfica de la diferencia','Afficher aussi le graphique de la différence','Auch den Differenzgraphen zeigen','差のグラフも見る'],
    '해 x':['Solution x','Solución x','Solution x','Lösung x','解 x'],
    '방정식':['Equation','Ecuación','Équation','Gleichung','方程式'],
    '무수히 많아요':['Infinitely many','Infinitas','Une infinité','Unendlich viele','無数にあります'],
    '교점의 y 좌표':['y coordinate of the intersection','Coordenada y del punto de corte','Ordonnée du point d’intersection','y-Koordinate des Schnittpunkts','交点のy座標'],
    '정리한 식':['Simplified equation','Ecuación simplificada','Équation simplifiée','Vereinfachte Gleichung','整理した式'],
    '한 점에서 만나요':['They meet at one point','Se cortan en un punto','Elles se coupent en un point','Sie schneiden sich in einem Punkt','1点で交わります'],
    '일치해요':['They coincide','Coinciden','Elles sont confondues','Sie fallen zusammen','一致します'],
    '피타고라스 정리의 넓이 증명':['Area proof of the Pythagorean theorem','Demostración del teorema de Pitágoras con áreas','Démonstration du théorème de Pythagore par les aires','Flächenbeweis des Satzes des Pythagoras','ピタゴラスの定理の面積による証明'],
    '같은 직각삼각형 4개를 다르게 놓아 a² + b² = c² 확인하기':['Place the same four right triangles in different ways to confirm a² + b² = c²','Colocar de dos formas los mismos cuatro triángulos rectángulos para confirmar a² + b² = c²','Placer de deux façons les mêmes quatre triangles rectangles pour confirmer a² + b² = c²','Dieselben vier rechtwinkligen Dreiecke anders legen, um a² + b² = c² zu bestätigen','同じ直角三角形4つを違う置き方にして a² + b² = c² を確かめる'],
    '한 변의 길이가 a + b인 큰 정사각형 안에 합동인 직각삼각형 4개를 놓아 볼게요. 처음 배치에서는 가운데 비어 있는 부분이 한 변이 c인 정사각형이에요. 삼각형 4개를 움직여 다시 놓으면 비어 있는 부분이 한 변이 a인 정사각형과 한 변이 b인 정사각형 두 개로 바뀌어요. 큰 정사각형과 삼각형 4개의 넓이는 그대로이니 빈 부분의 넓이도 같아서 c² = a² + b²예요.':['Place four congruent right triangles inside a big square of side a + b. In the first arrangement, the empty part in the middle is a square of side c. If you move the four triangles and place them again, the empty part becomes two squares, one of side a and one of side b. The areas of the big square and of the four triangles do not change, so the empty area is the same and c² = a² + b².','Coloquemos cuatro triángulos rectángulos congruentes dentro de un cuadrado grande de lado a + b. En la primera disposición, la parte vacía del centro es un cuadrado de lado c. Si movemos los cuatro triángulos y los colocamos de nuevo, la parte vacía pasa a ser dos cuadrados, uno de lado a y otro de lado b. El área del cuadrado grande y la de los cuatro triángulos no cambian, así que el área vacía es la misma y c² = a² + b².','Plaçons quatre triangles rectangles superposables dans un grand carré de côté a + b. Dans le premier arrangement, la partie vide au milieu est un carré de côté c. Si l’on déplace les quatre triangles et qu’on les replace, la partie vide devient deux carrés, un de côté a et un de côté b. Les aires du grand carré et des quatre triangles ne changent pas, donc l’aire vide est la même et c² = a² + b².','Lege vier kongruente rechtwinklige Dreiecke in ein großes Quadrat mit Seite a + b. In der ersten Anordnung ist der leere Teil in der Mitte ein Quadrat mit Seite c. Verschiebt man die vier Dreiecke und legt sie neu, besteht der leere Teil aus zwei Quadraten, eins mit Seite a und eins mit Seite b. Die Flächen des großen Quadrats und der vier Dreiecke bleiben gleich, also ist auch die leere Fläche gleich und c² = a² + b².','1辺がa + bの大きな正方形の中に、合同な直角三角形4つを置いてみましょう。最初の配置では、真ん中の空いた部分は1辺がcの正方形です。三角形4つを動かして置き直すと、空いた部分は1辺がaの正方形と1辺がbの正方形の2つに変わります。大きな正方形と三角形4つの面積は変わらないので、空いた部分の面積も同じで、c² = a² + b²です。'],
    'a = 3, b = 4에서 모양 슬라이더를 0에서 1로 움직이며 빈 부분이 c²에서 a²과 b²로 바뀌는 것을 보세요':['With a = 3, b = 4, move the shape slider from 0 to 1 and see the empty part change from c² to a² and b²','Con a = 3, b = 4, mueve el deslizador de forma de 0 a 1 y observa cómo la parte vacía pasa de c² a a² y b²','Avec a = 3, b = 4, déplace le curseur de forme de 0 à 1 et vois la partie vide passer de c² à a² et b²','Bewege bei a = 3, b = 4 den Formregler von 0 auf 1 und sieh, wie der leere Teil von c² zu a² und b² wird','a = 3、b = 4で形のスライダーを0から1へ動かして、空いた部分がc²からa²とb²に変わるのを見てみよう'],
    'a와 b를 바꾸어도 빈 부분의 넓이가 일정한지 확인해 보세요':['Change a and b and check that the empty area stays equal','Cambia a y b y comprueba que el área vacía sigue siendo igual','Change a et b et vérifie que l’aire vide reste égale','Ändere a und b und prüfe, dass die leere Fläche gleich bleibt','aとbを変えても、空いた部分の面積が一定か確かめてみよう'],
    'a = b일 때는 어떤 삼각형과 어떤 모양이 되나요?':['What triangle and what shape do you get when a = b?','¿Qué triángulo y qué figura salen cuando a = b?','Quel triangle et quelle figure obtient-on quand a = b ?','Welches Dreieck und welche Form ergeben sich bei a = b?','a = bのときは、どんな三角形とどんな形になりますか?'],
    '모양 슬라이더를 움직이거나 시작을 눌러 삼각형을 옮겨 보세요.':['Move the shape slider or press start to move the triangles.','Mueve el deslizador de forma o pulsa iniciar para mover los triángulos.','Déplace le curseur de forme ou appuie sur démarrer pour déplacer les triangles.','Bewege den Formregler oder drücke Start, um die Dreiecke zu verschieben.','形のスライダーを動かすか、スタートを押して三角形を動かしてみよう。'],
    '옮겨 보기':['Move them','Moverlos','Les déplacer','Verschieben','動かしてみる'],
    '모양 (0: c² · 1: a²과 b²)':['Shape (0: c² · 1: a² and b²)','Forma (0: c² · 1: a² y b²)','Forme (0 : c² · 1 : a² et b²)','Form (0: c² · 1: a² und b²)','形 (0: c² · 1: a²とb²)'],
    '기울기가 1에 가까워요 (지금 {0})':['The slope is close to 1 (now {0})','La pendiente es cercana a 1 (ahora {0})','La pente est proche de 1 (maintenant {0})','Die Steigung ist nahe 1 (jetzt {0})','傾きが1に近いです(今 {0})'],
    'c² (빈 부분의 넓이)':['c² (area of the empty part)','c² (área de la parte vacía)','c² (aire de la partie vide)','c² (Fläche des leeren Teils)','c²(空いた部分の面積)'],
    '큰 정사각형 (a + b)²':['Big square (a + b)²','Cuadrado grande (a + b)²','Grand carré (a + b)²','Großes Quadrat (a + b)²','大きな正方形 (a + b)²'],
    '삼각형 4개의 넓이 2ab':['Area of the 4 triangles 2ab','Área de los 4 triángulos 2ab','Aire des 4 triangles 2ab','Fläche der 4 Dreiecke 2ab','三角形4つの面積 2ab'],
    '빈 부분 = (a + b)² − 2ab':['Empty part = (a + b)² − 2ab','Parte vacía = (a + b)² − 2ab','Partie vide = (a + b)² − 2ab','Leerer Teil = (a + b)² − 2ab','空いた部分 = (a + b)² − 2ab'],
    '피타고라스 수 찾기':['Finding Pythagorean triples','Hallar ternas pitagóricas','Trouver des triplets pythagoriciens','Pythagoreische Tripel finden','ピタゴラス数を見つける'],
    'a² + b² = c²을 만족하는 세 자연수 (3, 4, 5), (5, 12, 13) …':['Three whole numbers with a² + b² = c²: (3, 4, 5), (5, 12, 13) …','Tres números naturales con a² + b² = c²: (3, 4, 5), (5, 12, 13) …','Trois entiers naturels avec a² + b² = c² : (3, 4, 5), (5, 12, 13) …','Drei natürliche Zahlen mit a² + b² = c²: (3, 4, 5), (5, 12, 13) …','a² + b² = c²を満たす3つの自然数 (3, 4, 5)、(5, 12, 13) …'],
    'a² + b² = c²을 만족하는 세 자연수 (a, b, c)를 피타고라스 수라고 해요. 2 이상의 자연수 m > n에 대해 a = m² − n², b = 2mn, c = m² + n²이라고 하면 항상 피타고라스 수가 돼요. m, n이 서로소이고 한 쪽이 짝수, 다른 쪽이 홀수이면 공약수가 없는 기본 수가 되고, 모두 k배 한 것도 피타고라스 수예요. 고대 이집트 사람들이 3, 4, 5로 직각을 만들었다고 전해져요.':['Three natural numbers (a, b, c) with a² + b² = c² are called a Pythagorean triple. For natural numbers m > n with n ≥ 1, a = m² − n², b = 2mn, c = m² + n² always gives a Pythagorean triple. If m and n are coprime and one is even and the other odd, the triple has no common factor (a primitive triple), and any multiple by k is also a Pythagorean triple. It is said that the ancient Egyptians made right angles with 3, 4, 5.','Tres números naturales (a, b, c) con a² + b² = c² forman una terna pitagórica. Para naturales m > n ≥ 1, a = m² − n², b = 2mn, c = m² + n² siempre da una terna pitagórica. Si m y n son primos entre sí y uno es par y el otro impar, la terna no tiene factor común (terna primitiva), y cualquier múltiplo k de ella también es una terna pitagórica. Se dice que los antiguos egipcios formaban ángulos rectos con 3, 4, 5.','Trois entiers naturels (a, b, c) tels que a² + b² = c² forment un triplet pythagoricien. Pour des entiers m > n ≥ 1, a = m² − n², b = 2mn, c = m² + n² donne toujours un triplet pythagoricien. Si m et n sont premiers entre eux et que l’un est pair et l’autre impair, le triplet n’a pas de facteur commun (triplet primitif), et tout multiple par k est aussi un triplet pythagoricien. On dit que les anciens Égyptiens fabriquaient des angles droits avec 3, 4, 5.','Drei natürliche Zahlen (a, b, c) mit a² + b² = c² heißen pythagoreisches Tripel. Für natürliche Zahlen m > n ≥ 1 ergeben a = m² − n², b = 2mn, c = m² + n² immer ein pythagoreisches Tripel. Sind m und n teilerfremd und ist eine gerade und die andere ungerade, hat das Tripel keinen gemeinsamen Teiler (primitives Tripel), und jedes k-Fache davon ist ebenfalls ein Tripel. Man erzählt, dass die alten Ägypter mit 3, 4, 5 rechte Winkel legten.','a² + b² = c²を満たす3つの自然数(a, b, c)をピタゴラス数といいます。n ≥ 1の自然数m > nについて、a = m² − n²、b = 2mn、c = m² + n²とすると、いつもピタゴラス数になります。mとnが互いに素で、一方が偶数、他方が奇数なら公約数のない基本の数になり、それをk倍したものもピタゴラス数です。古代エジプトの人々は3、4、5で直角を作ったと伝えられています。'],
    'm = 2, n = 1일 때 (3, 4, 5)가 나오는지 확인하고 m = 3, n = 2도 해 보세요':['Check that m = 2, n = 1 gives (3, 4, 5), and try m = 3, n = 2 too','Comprueba que m = 2, n = 1 da (3, 4, 5) y prueba también m = 3, n = 2','Vérifie que m = 2, n = 1 donne (3, 4, 5) et essaie aussi m = 3, n = 2','Prüfe, dass m = 2, n = 1 das Tripel (3, 4, 5) ergibt, und probiere auch m = 3, n = 2','m = 2、n = 1のとき(3, 4, 5)になるか確かめ、m = 3、n = 2も試してみよう'],
    'k를 2로 하면 (6, 8, 10)이 되는데 직각삼각형이 맞는지 a² + b²을 계산해 보세요':['With k = 2 you get (6, 8, 10). Compute a² + b² to check it is a right triangle','Con k = 2 sale (6, 8, 10). Calcula a² + b² para comprobar que es un triángulo rectángulo','Avec k = 2 on obtient (6, 8, 10). Calcule a² + b² pour vérifier que c’est un triangle rectangle','Mit k = 2 ergibt sich (6, 8, 10). Berechne a² + b², um zu prüfen, ob es ein rechtwinkliges Dreieck ist','kを2にすると(6, 8, 10)になります。a² + b²を計算して直角三角形になるか確かめてみよう'],
    'm과 n이 모두 홀수일 때는 기본 수가 되지 않는 이유를 생각해 보세요':['Think about why the triple is not primitive when m and n are both odd','Piensa por qué la terna no es primitiva cuando m y n son ambos impares','Réfléchis à pourquoi le triplet n’est pas primitif quand m et n sont tous deux impairs','Überlege, warum das Tripel nicht primitiv ist, wenn m und n beide ungerade sind','mとnがどちらも奇数のとき、基本の数にならない理由を考えてみよう'],
    'n (m보다 작은 수)':['n (a number smaller than m)','n (un número menor que m)','n (un nombre plus petit que m)','n (eine Zahl kleiner als m)','n (mより小さい数)'],
    '몇 배 할까요 (k)':['How many times larger (k)','Cuántas veces mayor (k)','Combien de fois plus grand (k)','Wievielfaches (k)','何倍にするか (k)'],
    '기본 피타고라스 수':['Primitive Pythagorean triples','Ternas pitagóricas primitivas','Triplets pythagoriciens primitifs','Primitive pythagoreische Tripel','基本のピタゴラス数'],
    '세 변 (a, b, c)':['Three sides (a, b, c)','Tres lados (a, b, c)','Trois côtés (a, b, c)','Drei Seiten (a, b, c)','3つの辺 (a, b, c)'],
    '기본 수인가요?':['Is it primitive?','¿Es primitiva?','Est-il primitif ?','Ist es primitiv?','基本の数ですか?'],
    '네 (공약수가 없어요)':['Yes (no common factor)','Sí (sin factor común)','Oui (pas de facteur commun)','Ja (kein gemeinsamer Teiler)','はい(公約数がありません)'],
    '기본 수의 {0}배':['{0} times a primitive triple','{0} veces una primitiva','{0} fois un triplet primitif','{0}-faches eines primitiven Tripels','基本の数の{0}倍'],
    '아니요 (공약수가 있어요)':['No (there is a common factor)','No (hay un factor común)','Non (il y a un facteur commun)','Nein (es gibt einen gemeinsamen Teiler)','いいえ(公約数があります)'],
    '둘레':['Perimeter','Perímetro','Périmètre','Umfang','周の長さ'],
    '넓이':['Area','Área','Aire','Fläche','面積'],
    '두 눈의 합이 {0}':['The sum of the two dice is {0}','La suma de los dos dados es {0}','La somme des deux dés est {0}','Die Augensumme der beiden Würfel ist {0}','2つの目の和が{0}'],
    '두 눈의 곱이 {0}':['The product of the two dice is {0}','El producto de los dos dados es {0}','Le produit des deux dés est {0}','Das Produkt der beiden Augenzahlen ist {0}','2つの目の積が{0}'],
    '두 눈의 합이 {0} 이상':['The sum of the two dice is {0} or more','La suma de los dos dados es {0} o más','La somme des deux dés est {0} ou plus','Die Augensumme ist {0} oder mehr','2つの目の和が{0}以上'],
    '두 주사위의 경우의 수':['Outcomes of two dice','Casos posibles de dos dados','Cas possibles avec deux dés','Ergebnisse bei zwei Würfeln','2つのさいころの場合の数'],
    '36가지 경우를 표로 세어 확률을 구하고 직접 던져 비교하기':['Count the 36 outcomes in a table to find the probability, then roll and compare','Contar en una tabla los 36 casos para hallar la probabilidad y luego lanzar y comparar','Compter les 36 cas dans un tableau pour trouver la probabilité, puis lancer et comparer','Die 36 Fälle in einer Tabelle zählen, die Wahrscheinlichkeit bestimmen und dann würfeln und vergleichen','36通りを表で数えて確率を求め、実際に投げて比べる'],
    '주사위 두 개를 던질 때 나오는 경우는 모두 6 × 6 = 36가지예요. 표에서 조건에 맞는 칸의 수가 그 사건이 일어나는 경우의 수이고, 확률은 (사건이 일어나는 경우의 수) ÷ (모든 경우의 수)예요. 예를 들어 합이 7인 경우는 (1,6), (2,5), (3,4), (4,3), (5,2), (6,1)의 6가지라서 확률이 6/36 = 1/6이에요. 던지는 횟수가 많아지면 상대도수가 이 확률에 가까워져요.':['When two dice are rolled there are 6 × 6 = 36 possible outcomes. The number of cells in the table that match the condition is the number of outcomes of that event, and the probability is (number of outcomes of the event) ÷ (number of all outcomes). For example, a sum of 7 happens in 6 ways: (1,6), (2,5), (3,4), (4,3), (5,2), (6,1), so the probability is 6/36 = 1/6. As the number of rolls grows, the relative frequency gets close to this probability.','Al lanzar dos dados hay 6 × 6 = 36 resultados posibles. El número de casillas de la tabla que cumplen la condición es el número de casos del suceso, y la probabilidad es (casos del suceso) ÷ (casos posibles). Por ejemplo, suma 7 ocurre de 6 formas: (1,6), (2,5), (3,4), (4,3), (5,2), (6,1), así que la probabilidad es 6/36 = 1/6. Al aumentar los lanzamientos, la frecuencia relativa se acerca a esta probabilidad.','Quand on lance deux dés, il y a 6 × 6 = 36 issues possibles. Le nombre de cases du tableau qui vérifient la condition est le nombre de cas favorables, et la probabilité est (cas favorables) ÷ (cas possibles). Par exemple, une somme de 7 arrive de 6 façons : (1,6), (2,5), (3,4), (4,3), (5,2), (6,1), donc la probabilité est 6/36 = 1/6. Quand le nombre de lancers augmente, la fréquence relative se rapproche de cette probabilité.','Beim Werfen zweier Würfel gibt es 6 × 6 = 36 mögliche Ergebnisse. Die Zahl der Felder in der Tabelle, die die Bedingung erfüllen, ist die Zahl der günstigen Fälle, und die Wahrscheinlichkeit ist (günstige Fälle) ÷ (alle Fälle). Eine Augensumme von 7 gibt es zum Beispiel auf 6 Arten: (1,6), (2,5), (3,4), (4,3), (5,2), (6,1), also ist die Wahrscheinlichkeit 6/36 = 1/6. Mit mehr Würfen nähert sich die relative Häufigkeit dieser Wahrscheinlichkeit.','さいころ2個を投げると、出方は全部で6 × 6 = 36通りです。表で条件に合うマスの数がその事柄の起こる場合の数で、確率は(事柄の起こる場合の数)÷(すべての場合の数)です。例えば和が7になるのは(1,6)、(2,5)、(3,4)、(4,3)、(5,2)、(6,1)の6通りなので、確率は6/36 = 1/6です。投げる回数が多くなると、相対度数がこの確率に近づきます。'],
    '합이 7이 될 확률과 합이 2가 될 확률을 표에서 세어 비교해 보세요':['Count in the table the probability of a sum of 7 and of a sum of 2 and compare them','Cuenta en la tabla la probabilidad de suma 7 y de suma 2 y compáralas','Compte dans le tableau la probabilité d’une somme de 7 et d’une somme de 2 et compare-les','Zähle in der Tabelle die Wahrscheinlichkeit für Summe 7 und für Summe 2 und vergleiche','和が7になる確率と和が2になる確率を表で数えて比べてみよう'],
    '1000번쯤 던져 보고 합이 7인 상대도수가 1/6 ≈ 0.167에 가까워지는지 확인해 보세요':['Roll about 1000 times and check whether the relative frequency of a sum of 7 gets close to 1/6 ≈ 0.167','Lanza unas 1000 veces y comprueba si la frecuencia relativa de suma 7 se acerca a 1/6 ≈ 0,167','Lance environ 1000 fois et vérifie si la fréquence relative de la somme 7 se rapproche de 1/6 ≈ 0,167','Würfle etwa 1000-mal und prüfe, ob sich die relative Häufigkeit der Summe 7 an 1/6 ≈ 0,167 annähert','1000回ほど投げて、和が7になる相対度数が1/6 ≈ 0.167に近づくか確かめてみよう'],
    '두 눈의 곱이 12가 되는 경우를 모두 찾아보세요':['Find all the outcomes where the product of the two dice is 12','Encuentra todos los casos en que el producto de los dos dados es 12','Trouve tous les cas où le produit des deux dés vaut 12','Finde alle Fälle, in denen das Produkt der beiden Augenzahlen 12 ist','2つの目の積が12になる場合をすべて探してみよう'],
    '던지기':['Roll','Lanzar','Lancer','Würfeln','投げる'],
    '구하는 사건':['Event to find','Suceso buscado','Événement cherché','Gesuchtes Ereignis','求める事柄'],
    '합이 s':['Sum is s','La suma es s','La somme est s','Summe ist s','和が s'],
    '곱이 s':['Product is s','El producto es s','Le produit est s','Produkt ist s','積が s'],
    '합이 s 이상':['Sum is s or more','La suma es s o más','La somme est s ou plus','Summe ist s oder mehr','和が s 以上'],
    's의 값':['Value of s','Valor de s','Valeur de s','Wert von s','sの値'],
    '1초에 던지는 횟수':['Rolls per second','Lanzamientos por segundo','Lancers par seconde','Würfe pro Sekunde','1秒に投げる回数'],
    '100번 던지기':['Roll 100 times','Lanzar 100 veces','Lancer 100 fois','100-mal würfeln','100回投げる'],
    '1000번 던지기':['Roll 1000 times','Lanzar 1000 veces','Lancer 1000 fois','1000-mal würfeln','1000回投げる'],
    '확률 (이론)':['Probability (theory)','Probabilidad (teórica)','Probabilité (théorique)','Wahrscheinlichkeit (Theorie)','確率(理論)'],
    '던진 횟수':['Number of rolls','Número de lanzamientos','Nombre de lancers','Anzahl der Würfe','投げた回数'],
    '첫째 주사위':['First die','Primer dado','Premier dé','Erster Würfel','1つ目のさいころ'],
    '둘째':['Second','Segundo','Deuxième','Zweiter','2つ目'],
    '두 눈의 합':['Sum of the two dice','Suma de los dos dados','Somme des deux dés','Augensumme','2つの目の和'],
    '36번 중':['Out of 36','De cada 36','Sur 36','Von 36','36回のうち'],
    '파란 선: 이론, 노란 막대: 던진 결과':['Blue lines: theory, yellow bars: rolled results','Líneas azules: teoría; barras amarillas: resultados','Lignes bleues : théorie, barres jaunes : résultats obtenus','Blaue Linien: Theorie, gelbe Balken: Würfelergebnisse','青い線: 理論、黄色の棒: 投げた結果'],
    '사건':['Event','Suceso','Événement','Ereignis','事柄'],
    '가지':['outcomes','casos','cas','Fälle','通り'],
    '사건이 일어난 횟수':['Times the event happened','Veces que ocurrió el suceso','Fois où l’événement s’est produit','Wie oft das Ereignis eintrat','事柄が起こった回数'],
    '이론과의 차이':['Difference from theory','Diferencia con la teoría','Écart avec la théorie','Abweichung von der Theorie','理論との差'],
    '먼저 주사위를 던져 보세요':['Roll the dice first','Lanza primero los dados','Lance d’abord les dés','Würfle zuerst','先にさいころを投げてみよう'],
    '몬테카를로로 원주율 구하기':['Estimating pi with Monte Carlo','Estimar pi con Monte Carlo','Estimer pi avec Monte-Carlo','Pi mit Monte-Carlo schätzen','モンテカルロ法で円周率を求める'],
    '정사각형 안에 점을 무작위로 찍어 π를 어림하기':['Scatter random points in a square to estimate π','Esparcir puntos al azar en un cuadrado para estimar π','Placer des points au hasard dans un carré pour estimer π','Zufällige Punkte in einem Quadrat verteilen, um π zu schätzen','正方形の中にランダムに点を打ってπを見積もる'],
    '한 변이 1인 정사각형 안에 점을 무작위로 찍어요. 반지름이 1인 사분원 안에 들어가는 점의 비율은 (사분원의 넓이) ÷ (정사각형의 넓이) = (π/4) ÷ 1이에요. 그래서 4 × (원 안의 점의 개수) ÷ (전체 점의 개수)가 π에 가까워져요. 점이 많아질수록 오차가 줄지만 점을 100배 늘려야 오차가 약 10분의 1이 되어요. 이렇게 무작위 실험으로 값을 구하는 방법을 몬테카를로 방법이라고 해요.':['Scatter points at random inside a square with side 1. The proportion of points that fall inside the quarter circle of radius 1 is (area of the quarter circle) ÷ (area of the square) = (π/4) ÷ 1. So 4 × (number of points in the circle) ÷ (total number of points) gets close to π. The more points, the smaller the error, but you need 100 times as many points to make the error about 10 times smaller. Finding a value by a random experiment like this is called the Monte Carlo method.','Se esparcen puntos al azar dentro de un cuadrado de lado 1. La proporción de puntos que caen dentro del cuarto de círculo de radio 1 es (área del cuarto de círculo) ÷ (área del cuadrado) = (π/4) ÷ 1. Así, 4 × (puntos dentro del círculo) ÷ (puntos totales) se acerca a π. Cuantos más puntos, menor el error, pero hacen falta 100 veces más puntos para reducir el error unas 10 veces. Hallar un valor con un experimento aleatorio así se llama método de Monte Carlo.','On place des points au hasard dans un carré de côté 1. La proportion de points qui tombent dans le quart de disque de rayon 1 est (aire du quart de disque) ÷ (aire du carré) = (π/4) ÷ 1. Donc 4 × (points dans le disque) ÷ (nombre total de points) se rapproche de π. Plus il y a de points, plus l’erreur diminue, mais il faut 100 fois plus de points pour diviser l’erreur par environ 10. Trouver une valeur par une expérience aléatoire de ce genre s’appelle la méthode de Monte-Carlo.','Man verteilt Punkte zufällig in einem Quadrat mit Seitenlänge 1. Der Anteil der Punkte im Viertelkreis mit Radius 1 ist (Fläche des Viertelkreises) ÷ (Fläche des Quadrats) = (π/4) ÷ 1. Daher nähert sich 4 × (Punkte im Kreis) ÷ (alle Punkte) der Zahl π. Je mehr Punkte, desto kleiner der Fehler, aber für einen etwa 10-mal kleineren Fehler braucht man 100-mal so viele Punkte. Einen Wert durch ein solches Zufallsexperiment zu bestimmen, nennt man Monte-Carlo-Methode.','1辺が1の正方形の中に点をランダムに打ちます。半径1の四分円の中に入る点の割合は(四分円の面積)÷(正方形の面積)=(π/4)÷1です。そこで4 ×(円の中の点の数)÷(点の総数)がπに近づきます。点が多くなるほど誤差は小さくなりますが、誤差を約10分の1にするには点を100倍に増やす必要があります。このようにランダムな実験で値を求める方法をモンテカルロ法といいます。'],
    '점을 100개, 1000개, 10000개 찍었을 때 π의 어림값과 오차를 비교해 보세요':['Compare the estimate of π and its error with 100, 1000 and 10000 points','Compara la estimación de π y su error con 100, 1000 y 10000 puntos','Compare l’estimation de π et son erreur avec 100, 1000 et 10000 points','Vergleiche die Schätzung von π und ihren Fehler bei 100, 1000 und 10000 Punkten','点が100個、1000個、10000個のときのπの見積もりと誤差を比べてみよう'],
    '같은 개수로 여러 번 다시 해서 어림값이 얼마나 달라지는지 보세요':['Repeat several times with the same number of points and see how much the estimate varies','Repite varias veces con el mismo número de puntos y mira cuánto varía la estimación','Recommence plusieurs fois avec le même nombre de points et vois de combien l’estimation varie','Wiederhole mehrmals mit gleicher Punktzahl und sieh, wie stark die Schätzung schwankt','同じ個数で何回かやり直して、見積もりがどれくらい変わるか見てみよう'],
    '오른쪽 그래프에서 점이 많아질수록 어림값이 어떻게 변하나요?':['In the graph on the right, how does the estimate change as the points increase?','En la gráfica de la derecha, ¿cómo cambia la estimación al aumentar los puntos?','Sur le graphique de droite, comment l’estimation change-t-elle quand les points augmentent ?','Wie ändert sich die Schätzung im rechten Graphen, wenn die Punkte mehr werden?','右のグラフで、点が多くなると見積もりはどう変わりますか?'],
    '점 찍기':['Scatter points','Esparcir puntos','Placer des points','Punkte setzen','点を打つ'],
    '1초에 찍는 점':['Points per second','Puntos por segundo','Points par seconde','Punkte pro Sekunde','1秒に打つ点'],
    '1000개 더 찍기':['Add 1000 more points','Añadir 1000 puntos más','Ajouter 1000 points','1000 Punkte mehr','1000個多く打つ'],
    '100000개 더 찍기':['Add 100000 more points','Añadir 100000 puntos más','Ajouter 100000 points','100000 Punkte mehr','100000個多く打つ'],
    '점의 개수':['Number of points','Número de puntos','Nombre de points','Anzahl der Punkte','点の個数'],
    'π의 어림값':['Estimate of π','Estimación de π','Estimation de π','Schätzwert für π','πの見積もり'],
    '오차':['Error','Error','Erreur','Fehler','誤差'],
    '점의 개수 (로그 눈금)':['Number of points (log scale)','Número de puntos (escala logarítmica)','Nombre de points (échelle logarithmique)','Anzahl der Punkte (logarithmische Skala)','点の個数(対数目盛)'],
    '원 안의 점':['Points inside the circle','Puntos dentro del círculo','Points dans le disque','Punkte im Kreis','円の中の点'],
    'π의 어림값 (4 × 원 안 ÷ 전체)':['Estimate of π (4 × inside ÷ total)','Estimación de π (4 × dentro ÷ total)','Estimation de π (4 × dedans ÷ total)','Schätzwert für π (4 × innen ÷ gesamt)','πの見積もり(4 × 円の中 ÷ 全体)'],
    '실제 π':['Actual π','π real','π réel','Tatsächliches π','本当のπ'],
    '예상되는 오차의 크기 (≈ 1.64 ÷ √n)':['Expected size of the error (≈ 1.64 ÷ √n)','Tamaño esperado del error (≈ 1,64 ÷ √n)','Ordre de grandeur de l’erreur attendue (≈ 1,64 ÷ √n)','Erwartete Größe des Fehlers (≈ 1,64 ÷ √n)','予想される誤差の大きさ(≈ 1.64 ÷ √n)'],
    '먼저 점을 찍어 보세요':['Scatter some points first','Esparce primero algunos puntos','Place d’abord quelques points','Setze zuerst ein paar Punkte','先に点を打ってみよう'],
    '연립방정식과 두 직선':['Simultaneous equations and two lines','Sistemas de ecuaciones y dos rectas','Systèmes d’équations et deux droites','Gleichungssysteme und zwei Geraden','連立方程式と2直線'],
    '두 일차방정식의 그래프가 만나는 점이 연립방정식의 해':['The intersection of the graphs of two linear equations is the solution of the system','El punto de corte de las gráficas de dos ecuaciones lineales es la solución del sistema','L’intersection des graphiques de deux équations du premier degré est la solution du système','Der Schnittpunkt der Graphen zweier linearer Gleichungen ist die Lösung des Systems','2つの一次方程式のグラフの交点が連立方程式の解'],
    '미지수가 x, y 두 개인 일차방정식 ax + by = c의 해는 무수히 많고, 그 점들을 모으면 직선이 돼요. 연립방정식 두 개를 동시에 만족하는 (x, y)는 두 직선이 만나는 점이에요. 한 점에서 만나면 해가 하나, 평행하면 해가 없고, 두 직선이 겹치면 해가 무수히 많아요. 두 식의 x 또는 y의 계수를 맞추어 더하거나 빼서 한 문자를 없애는 방법이 가감법이에요.':['A linear equation ax + by = c in the two unknowns x and y has infinitely many solutions, and those points together form a line. The pair (x, y) that satisfies two equations at once is the point where the two lines meet. If they meet at one point there is one solution, if they are parallel there is none, and if the lines coincide there are infinitely many. The method of adding or subtracting equations after matching the coefficients of x or y to eliminate one unknown is called the elimination method.','Una ecuación lineal ax + by = c con dos incógnitas x e y tiene infinitas soluciones, y esos puntos forman una recta. El par (x, y) que cumple dos ecuaciones a la vez es el punto donde se cortan las dos rectas. Si se cortan en un punto hay una solución, si son paralelas no hay ninguna y si coinciden hay infinitas. El método de sumar o restar ecuaciones tras igualar los coeficientes de x o y para eliminar una incógnita se llama método de reducción.','Une équation du premier degré ax + by = c à deux inconnues x et y a une infinité de solutions, et ces points forment une droite. Le couple (x, y) qui vérifie deux équations à la fois est le point d’intersection des deux droites. Si elles se coupent en un point il y a une solution, si elles sont parallèles il n’y en a pas, et si elles sont confondues il y en a une infinité. La méthode qui consiste à additionner ou soustraire les équations après avoir égalisé les coefficients de x ou de y pour éliminer une inconnue s’appelle la méthode par combinaison.','Eine lineare Gleichung ax + by = c mit den zwei Unbekannten x und y hat unendlich viele Lösungen, und diese Punkte bilden eine Gerade. Das Paar (x, y), das zwei Gleichungen gleichzeitig erfüllt, ist der Schnittpunkt der beiden Geraden. Schneiden sie sich in einem Punkt, gibt es eine Lösung, sind sie parallel keine, fallen sie zusammen unendlich viele. Das Addieren oder Subtrahieren der Gleichungen nach Angleichen der Koeffizienten von x oder y, um eine Unbekannte zu eliminieren, heißt Additionsverfahren.','未知数がx、yの2つの一次方程式ax + by = cの解は無数にあり、その点を集めると直線になります。2つの方程式を同時に満たす(x, y)は、2直線が交わる点です。1点で交われば解が1つ、平行なら解がなく、2直線が重なれば解は無数にあります。2つの式のxまたはyの係数をそろえて足したり引いたりして1つの文字を消す方法が加減法です。'],
    'x + y = 5와 x − y = 1의 해 (3, 2)가 두 직선의 교점인지 확인해 보세요':['Check that the solution (3, 2) of x + y = 5 and x − y = 1 is the intersection of the two lines','Comprueba que la solución (3, 2) de x + y = 5 y x − y = 1 es el punto de corte de las dos rectas','Vérifie que la solution (3, 2) de x + y = 5 et x − y = 1 est l’intersection des deux droites','Prüfe, dass die Lösung (3, 2) von x + y = 5 und x − y = 1 der Schnittpunkt der beiden Geraden ist','x + y = 5とx − y = 1の解(3, 2)が2直線の交点か確かめてみよう'],
    '한 식의 양변에 같은 수를 곱한 것을 두 번째 식으로 하면 직선이 어떻게 되나요?':['What happens to the line if the second equation is the first one multiplied on both sides by the same number?','¿Qué pasa con la recta si la segunda ecuación es la primera multiplicada por el mismo número en ambos miembros?','Que devient la droite si la deuxième équation est la première multipliée des deux côtés par le même nombre ?','Was passiert mit der Geraden, wenn die zweite Gleichung die erste mit demselben Faktor auf beiden Seiten ist?','1つ目の式の両辺に同じ数をかけたものを2つ目の式にすると、直線はどうなりますか?'],
    '계수는 같고 상수항만 다르게 하면 해가 몇 개인가요?':['How many solutions are there if the coefficients are equal and only the constant term differs?','¿Cuántas soluciones hay si los coeficientes son iguales y solo difiere el término independiente?','Combien y a-t-il de solutions si les coefficients sont égaux et que seul le terme constant diffère ?','Wie viele Lösungen gibt es, wenn die Koeffizienten gleich sind und nur das konstante Glied verschieden ist?','係数は同じで定数項だけ違うと、解はいくつありますか?'],
    '식 ①의 x 계수':['x coefficient of equation ①','Coeficiente de x de la ecuación ①','Coefficient de x de l’équation ①','x-Koeffizient der Gleichung ①','式①のxの係数'],
    '식 ①의 y 계수':['y coefficient of equation ①','Coeficiente de y de la ecuación ①','Coefficient de y de l’équation ①','y-Koeffizient der Gleichung ①','式①のyの係数'],
    '식 ①의 우변':['Right side of equation ①','Segundo miembro de la ecuación ①','Second membre de l’équation ①','Rechte Seite der Gleichung ①','式①の右辺'],
    '식 ②의 x 계수':['x coefficient of equation ②','Coeficiente de x de la ecuación ②','Coefficient de x de l’équation ②','x-Koeffizient der Gleichung ②','式②のxの係数'],
    '식 ②의 y 계수':['y coefficient of equation ②','Coeficiente de y de la ecuación ②','Coefficient de y de l’équation ②','y-Koeffizient der Gleichung ②','式②のyの係数'],
    '식 ②의 우변':['Right side of equation ②','Segundo miembro de la ecuación ②','Second membre de l’équation ②','Rechte Seite der Gleichung ②','式②の右辺'],
    '해가 하나':['One solution','Una solución','Une solution','Eine Lösung','解が1つ'],
    '평행 (해가 없음)':['Parallel (no solution)','Paralelas (sin solución)','Parallèles (aucune solution)','Parallel (keine Lösung)','平行(解なし)'],
    '일치 (해가 무수히 많음)':['Coincide (infinitely many solutions)','Coincidentes (infinitas soluciones)','Confondues (une infinité de solutions)','Zusammenfallend (unendlich viele Lösungen)','一致(解は無数)'],
    '해 y':['Solution y','Solución y','Solution y','Lösung y','解 y'],
    '알림':['Note','Aviso','Remarque','Hinweis','お知らせ'],
    '두 식 모두 x나 y가 들어 있어야 해요':['Both equations must contain x or y','Las dos ecuaciones deben contener x o y','Les deux équations doivent contenir x ou y','Beide Gleichungen müssen x oder y enthalten','2つの式とも、xかyが入っていなければなりません'],
    '식 ①':['Equation ①','Ecuación ①','Équation ①','Gleichung ①','式①'],
    '식 ②':['Equation ②','Ecuación ②','Équation ②','Gleichung ②','式②'],
    '닭과 토끼 (연립방정식)':['Chickens and Rabbits (Simultaneous Equations)','Gallinas y conejos (sistema de ecuaciones)','Poules et lapins (système d\'équations)','Hühner und Kaninchen (Gleichungssystem)','ツルとウサギ（連立方程式）'],
    '머리 수와 다리 수로 닭과 토끼의 수 알아내기':['Find the numbers of chickens and rabbits from heads and legs','Hallar cuántas gallinas y conejos hay a partir de cabezas y patas','Trouver le nombre de poules et de lapins à partir des têtes et des pattes','Anzahl der Hühner und Kaninchen aus Köpfen und Beinen bestimmen','頭の数と足の数からツルとウサギの数を求める'],
    '옛날 중국의 수학책 「손자산경」에 나오는 문제예요. 닭과 토끼가 모두 35마리이고 다리가 모두 94개일 때 닭과 토끼는 각각 몇 마리일까요? 닭을 x마리, 토끼를 y마리라고 하면 x + y = 35, 2x + 4y = 94이에요. 처음에 모두 닭이라고 가정하면 다리가 2 × 35 = 70개이고, 토끼로 바꿀 때마다 다리가 2개씩 늘어나므로 (94 − 70) ÷ 2 = 12마리가 토끼예요.':['This problem comes from the ancient Chinese book "Sunzi Suanjing". If there are 35 chickens and rabbits in total and 94 legs, how many of each are there? Let x be the chickens and y the rabbits: x + y = 35, 2x + 4y = 94. If we first assume all are chickens, there are 2 × 35 = 70 legs, and each swap to a rabbit adds 2 legs, so there are (94 − 70) ÷ 2 = 12 rabbits.','Este problema viene del antiguo libro chino «Sunzi Suanjing». Si hay 35 gallinas y conejos en total y 94 patas, ¿cuántos hay de cada uno? Sean x las gallinas e y los conejos: x + y = 35, 2x + 4y = 94. Si suponemos primero que todos son gallinas, hay 2 × 35 = 70 patas, y cada cambio a conejo añade 2 patas, así que hay (94 − 70) ÷ 2 = 12 conejos.','Ce problème vient de l\'ancien livre chinois « Sunzi Suanjing ». S\'il y a 35 poules et lapins en tout et 94 pattes, combien y a-t-il de chaque ? Soit x les poules et y les lapins : x + y = 35, 2x + 4y = 94. Si l\'on suppose d\'abord que tous sont des poules, il y a 2 × 35 = 70 pattes, et chaque remplacement par un lapin ajoute 2 pattes, donc il y a (94 − 70) ÷ 2 = 12 lapins.','Diese Aufgabe stammt aus dem alten chinesischen Buch „Sunzi Suanjing“. Wenn es insgesamt 35 Hühner und Kaninchen mit zusammen 94 Beinen gibt, wie viele sind es jeweils? Seien x die Hühner und y die Kaninchen: x + y = 35, 2x + 4y = 94. Nimmt man zuerst an, alle seien Hühner, gibt es 2 × 35 = 70 Beine, und jeder Austausch gegen ein Kaninchen bringt 2 Beine mehr, also sind es (94 − 70) ÷ 2 = 12 Kaninchen.','古代中国の数学書『孫子算経』に出てくる問題です。ニワトリとウサギが合わせて35匹、足が合わせて94本のとき、それぞれ何匹でしょう。ニワトリをx匹、ウサギをy匹とすると x + y = 35、2x + 4y = 94 です。まず全部ニワトリだと仮定すると足は 2 × 35 = 70本で、ウサギに替えるたびに足が2本ずつ増えるので、ウサギは (94 − 70) ÷ 2 = 12匹です。'],
    '머리 35, 다리 94에서 토끼 수를 하나씩 늘리며 다리 수가 94가 되는 때를 찾아보세요':['With 35 heads and 94 legs, raise the number of rabbits one at a time and find when the legs reach 94','Con 35 cabezas y 94 patas, aumenta los conejos de uno en uno y halla cuándo las patas llegan a 94','Avec 35 têtes et 94 pattes, augmentez les lapins un par un et trouvez quand les pattes atteignent 94','Bei 35 Köpfen und 94 Beinen die Kaninchen einzeln erhöhen und finden, wann die Beine 94 erreichen','頭35、足94で、ウサギを1匹ずつ増やして足が94本になるときを探してみよう'],
    '다리 수를 머리 수의 2배로 하면 토끼가 몇 마리인가요?':['If the number of legs is twice the number of heads, how many rabbits are there?','Si el número de patas es el doble que el de cabezas, ¿cuántos conejos hay?','Si le nombre de pattes est le double du nombre de têtes, combien y a-t-il de lapins ?','Wenn die Beinzahl doppelt so groß ist wie die Kopfzahl, wie viele Kaninchen gibt es?','足の数が頭の数の2倍のとき、ウサギは何匹？'],
    '다리 수가 머리 수의 4배보다 크면 어떻게 되나요?':['What happens if the legs exceed 4 times the heads?','¿Qué pasa si las patas superan 4 veces las cabezas?','Que se passe-t-il si les pattes dépassent 4 fois les têtes ?','Was passiert, wenn die Beine mehr als das Vierfache der Köpfe sind?','足の数が頭の数の4倍より大きいとどうなる？'],
    '토끼 수를 바꾸어 다리 수가 목표와 같아지는 곳을 찾아보세요.':['Change the number of rabbits and find where the legs equal the target.','Cambia el número de conejos y halla dónde las patas igualan el objetivo.','Changez le nombre de lapins et trouvez où les pattes égalent la cible.','Ändere die Kaninchenzahl und finde, wo die Beine dem Ziel entsprechen.','ウサギの数を変えて、足の数が目標と等しくなるところを探そう。'],
    '머리의 수':['Number of heads','Número de cabezas','Nombre de têtes','Anzahl der Köpfe','頭の数'],
    '다리의 수':['Number of legs','Número de patas','Nombre de pattes','Anzahl der Beine','足の数'],
    '토끼라고 가정한 수':['Assumed number of rabbits','Número supuesto de conejos','Nombre supposé de lapins','Angenommene Kaninchenzahl','仮定したウサギの数'],
    '가정한 토끼 수':['Assumed rabbits','Conejos supuestos','Lapins supposés','Angenommene Kaninchen','仮定したウサギ'],
    '그때의 다리 수':['Legs then','Patas entonces','Pattes alors','Beine dann','そのときの足の数'],
    '목표와의 차':['Difference from target','Diferencia con el objetivo','Écart avec la cible','Abweichung vom Ziel','目標との差'],
    '닭 {0}마리 · 토끼 {1}마리':['{0} chickens · {1} rabbits','{0} gallinas · {1} conejos','{0} poules · {1} lapins','{0} Hühner · {1} Kaninchen','ニワトリ{0}匹・ウサギ{1}匹'],
    '다리 {0}개 (목표 {1}개)':['{0} legs (target {1})','{0} patas (objetivo {1})','{0} pattes (cible {1})','{0} Beine (Ziel {1})','足{0}本（目標{1}本）'],
    '연립방정식':['Simultaneous equations','Sistema de ecuaciones','Système d\'équations','Gleichungssystem','連立方程式'],
    '가정한 다리 수':['Assumed legs','Patas supuestas','Pattes supposées','Angenommene Beine','仮定した足の数'],
    '답':['Answer','Respuesta','Réponse','Antwort','答え'],
    '닭 {0}마리, 토끼 {1}마리':['{0} chickens, {1} rabbits','{0} gallinas, {1} conejos','{0} poules, {1} lapins','{0} Hühner, {1} Kaninchen','ニワトリ{0}匹、ウサギ{1}匹'],
    '조건에 맞는 경우가 없어요':['No case satisfies the conditions','Ningún caso cumple las condiciones','Aucun cas ne satisfait les conditions','Kein Fall erfüllt die Bedingungen','条件に合う場合がありません'],
    '모두 닭이라고 가정한 다리 수':['Legs if all were chickens','Patas si todos fueran gallinas','Pattes si tous étaient des poules','Beine, wenn alle Hühner wären','全部ニワトリと仮定した足の数'],
    '모든 수':['All numbers','Todos los números','Tous les nombres','Alle Zahlen','すべての数'],
    '일차부등식과 수직선':['Linear Inequalities and the Number Line','Inecuaciones lineales y la recta numérica','Inéquations linéaires et droite numérique','Lineare Ungleichungen und der Zahlenstrahl','一次不等式と数直線'],
    '부등식의 해를 수직선에 나타내고 부등호 방향이 바뀌는 때 알기':['Show solutions on the number line and see when the inequality sign flips','Mostrar las soluciones en la recta numérica y ver cuándo cambia el signo de desigualdad','Représenter les solutions sur la droite et voir quand le signe s\'inverse','Lösungen am Zahlenstrahl darstellen und sehen, wann sich das Ungleichheitszeichen umkehrt','不等式の解を数直線に表し、不等号の向きが変わるときを知る'],
    '일차부등식 ax + b > c의 해는 x의 범위로 나타내요. 양변에서 b를 빼고 a로 나누면 x의 범위가 나와요. 이때 a가 음수이면 양변을 음수로 나눌 때 부등호의 방향이 바뀌어요. 수직선에서 속이 빈 동그라미(○)는 그 수를 포함하지 않고(> 또는 <), 속이 찬 동그라미(●)는 포함해요(≥ 또는 ≤). 두 부등식을 동시에 만족하는 연립부등식의 해는 두 해의 공통 범위예요.':['The solution of a linear inequality ax + b > c is a range of x. Subtract b from both sides and divide by a to get the range. If a is negative, the inequality sign flips when you divide both sides by a negative number. On the number line, an open circle (○) excludes the number (> or <) and a filled circle (●) includes it (≥ or ≤). The solution of a system of inequalities satisfying both at once is the common range of the two solutions.','La solución de una inecuación lineal ax + b > c es un rango de x. Resta b a ambos lados y divide por a para obtener el rango. Si a es negativo, el signo de la desigualdad se invierte al dividir ambos lados por un número negativo. En la recta numérica, un círculo vacío (○) excluye el número (> o <) y uno lleno (●) lo incluye (≥ o ≤). La solución de un sistema de inecuaciones que cumple ambas a la vez es el rango común de las dos soluciones.','La solution d\'une inéquation linéaire ax + b > c est un intervalle de x. Soustrayez b des deux côtés puis divisez par a. Si a est négatif, le signe s\'inverse quand on divise les deux côtés par un nombre négatif. Sur la droite numérique, un cercle vide (○) exclut le nombre (> ou <) et un cercle plein (●) l\'inclut (≥ ou ≤). La solution d\'un système d\'inéquations vérifiées simultanément est l\'intervalle commun des deux solutions.','Die Lösung einer linearen Ungleichung ax + b > c ist ein Bereich von x. Subtrahiere b auf beiden Seiten und teile durch a. Ist a negativ, kehrt sich das Ungleichheitszeichen beim Teilen durch eine negative Zahl um. Am Zahlenstrahl schließt ein offener Kreis (○) die Zahl aus (> oder <), ein gefüllter Kreis (●) schließt sie ein (≥ oder ≤). Die Lösung eines Ungleichungssystems, das beide zugleich erfüllt, ist der gemeinsame Bereich beider Lösungen.','一次不等式 ax + b > c の解は x の範囲で表します。両辺から b を引いて a で割ると範囲が出ます。このとき a が負の数なら、両辺を負の数で割るので不等号の向きが変わります。数直線では、白丸（○）はその数を含まず（> または <）、黒丸（●）は含みます（≥ または ≤）。2つの不等式を同時に満たす連立不等式の解は、2つの解の共通範囲です。'],
    'a를 양수에서 음수로 바꾸고 부등호의 방향이 왜 바뀌는지 확인해 보세요':['Change a from positive to negative and see why the sign flips','Cambia a de positivo a negativo y comprueba por qué se invierte el signo','Faites passer a de positif à négatif et voyez pourquoi le signe s\'inverse','Ändere a von positiv zu negativ und sieh, warum sich das Zeichen umkehrt','aを正から負に変えて、不等号の向きがなぜ変わるか確かめよう'],
    'x의 값을 해의 경계 근처에서 바꾸며 부등식이 참인지 거짓인지 확인해 보세요':['Change x near the boundary of the solution and check whether the inequality is true or false','Cambia x cerca del límite de la solución y comprueba si la desigualdad es verdadera o falsa','Changez x près de la frontière de la solution et vérifiez si l\'inéquation est vraie ou fausse','Ändere x nahe der Grenze der Lösung und prüfe, ob die Ungleichung wahr oder falsch ist','xの値を解の境界の近くで変えて、不等式が真か偽か確かめよう'],
    '연립부등식을 켜고 두 해의 공통 범위가 어디인지 찾아보세요':['Turn on the system of inequalities and find where the two solutions overlap','Activa el sistema de inecuaciones y busca dónde se solapan las dos soluciones','Activez le système d\'inéquations et trouvez où les deux solutions se recoupent','Schalte das Ungleichungssystem ein und finde, wo sich beide Lösungen überlappen','連立不等式をオンにして、2つの解の共通範囲を探そう'],
    '첫째 부등식의 x 계수':['x coefficient of the first inequality','Coeficiente de x de la primera inecuación','Coefficient de x de la première inéquation','x-Koeffizient der ersten Ungleichung','1つ目の不等式のxの係数'],
    '첫째 부등식의 상수':['Constant of the first inequality','Constante de la primera inecuación','Constante de la première inéquation','Konstante der ersten Ungleichung','1つ目の不等式の定数'],
    '부등호':['Inequality sign','Signo de desigualdad','Signe d\'inégalité','Ungleichheitszeichen','不等号'],
    '첫째 부등식의 우변':['Right side of the first inequality','Lado derecho de la primera inecuación','Membre de droite de la première inéquation','Rechte Seite der ersten Ungleichung','1つ目の不等式の右辺'],
    '연립부등식으로 보기':['View as a system of inequalities','Ver como sistema de inecuaciones','Voir comme système d\'inéquations','Als Ungleichungssystem anzeigen','連立不等式として見る'],
    '둘째 부등식의 x 계수':['x coefficient of the second inequality','Coeficiente de x de la segunda inecuación','Coefficient de x de la deuxième inéquation','x-Koeffizient der zweiten Ungleichung','2つ目の不等式のxの係数'],
    '둘째 부등식의 상수':['Constant of the second inequality','Constante de la segunda inecuación','Constante de la deuxième inéquation','Konstante der zweiten Ungleichung','2つ目の不等式の定数'],
    '둘째 부등호':['Second inequality sign','Segundo signo de desigualdad','Deuxième signe d\'inégalité','Zweites Ungleichheitszeichen','2つ目の不等号'],
    '둘째 부등식의 우변':['Right side of the second inequality','Lado derecho de la segunda inecuación','Membre de droite de la deuxième inéquation','Rechte Seite der zweiten Ungleichung','2つ目の不等式の右辺'],
    '시험해 볼 x':['x to test','x a probar','x à tester','Zu testendes x','試してみるx'],
    '참이면 1':['1 if true','1 si es verdadero','1 si vrai','1, wenn wahr','真なら1'],
    '공통 범위':['Common range','Rango común','Intervalle commun','Gemeinsamer Bereich','共通範囲'],
    '참':['True','Verdadero','Vrai','Wahr','真'],
    '거짓':['False','Falso','Faux','Falsch','偽'],
    '부등식':['Inequality','Inecuación','Inéquation','Ungleichung','不等式'],
    '부등호의 방향':['Direction of the sign','Sentido del signo','Sens du signe','Richtung des Zeichens','不等号の向き'],
    'x의 계수가 음수라서 방향이 바뀌어요':['The coefficient of x is negative, so the direction flips','El coeficiente de x es negativo, así que el sentido cambia','Le coefficient de x est négatif, donc le sens s\'inverse','Der Koeffizient von x ist negativ, also kehrt sich die Richtung um','xの係数が負なので向きが変わります'],
    'x가 없어요':['There is no x','No hay x','Il n\'y a pas de x','Es gibt kein x','xがありません'],
    '그대로예요':['It stays the same','Se mantiene','Il reste identique','Es bleibt gleich','そのままです'],
    '둘째 부등식':['Second inequality','Segunda inecuación','Deuxième inéquation','Zweite Ungleichung','2つ目の不等式'],
    '둘째 해':['Second solution','Segunda solución','Deuxième solution','Zweite Lösung','2つ目の解'],
    '연립부등식의 해':['Solution of the system','Solución del sistema','Solution du système','Lösung des Systems','連立不等式の解'],
    'x = {0}일 때':['When x = {0}','Cuando x = {0}','Quand x = {0}','Für x = {0}','x = {0}のとき'],
    '닮음비와 넓이비·부피비':['Similarity Ratio, Area Ratio and Volume Ratio','Razón de semejanza, razón de áreas y de volúmenes','Rapport de similitude, d\'aires et de volumes','Ähnlichkeitsverhältnis, Flächen- und Volumenverhältnis','相似比と面積比・体積比'],
    '닮음비가 1 : k이면 넓이의 비는 1 : k², 부피의 비는 1 : k³':['If the ratio of similarity is 1 : k, the area ratio is 1 : k² and the volume ratio is 1 : k³','Si la razón de semejanza es 1 : k, la de áreas es 1 : k² y la de volúmenes 1 : k³','Si le rapport de similitude est 1 : k, le rapport des aires est 1 : k² et celui des volumes 1 : k³','Bei Ähnlichkeitsverhältnis 1 : k ist das Flächenverhältnis 1 : k² und das Volumenverhältnis 1 : k³','相似比が1 : kなら、面積比は1 : k²、体積比は1 : k³'],
    '한 도형을 일정한 비율로 확대하거나 축소한 도형은 원래 도형과 닮음이에요. 대응하는 변의 길이의 비를 닮음비라고 하고, 대응하는 각의 크기는 같아요. 닮음비가 1 : k이면 둘레의 비도 1 : k이고, 넓이의 비는 1 : k²이에요. 입체도형이면 부피의 비는 1 : k³이에요. 가로와 세로가 모두 k배가 되니 넓이는 k × k배이고, 높이까지 k배가 되니 부피는 k × k × k배이기 때문이에요.':['A figure enlarged or reduced by a fixed ratio is similar to the original. The ratio of corresponding side lengths is the similarity ratio, and corresponding angles are equal. If the ratio is 1 : k, the ratio of perimeters is also 1 : k and the ratio of areas is 1 : k². For solids the ratio of volumes is 1 : k³. The width and height both grow k times, so the area grows k × k times, and with the height k times too, the volume grows k × k × k times.','Una figura ampliada o reducida en una razón fija es semejante a la original. La razón de los lados correspondientes es la razón de semejanza, y los ángulos correspondientes son iguales. Si la razón es 1 : k, la razón de perímetros también es 1 : k y la de áreas es 1 : k². En los sólidos, la razón de volúmenes es 1 : k³. El ancho y el alto se multiplican por k, así que el área se multiplica por k × k, y con la altura también k veces, el volumen por k × k × k.','Une figure agrandie ou réduite selon un rapport fixe est semblable à l\'originale. Le rapport des longueurs correspondantes est le rapport de similitude, et les angles correspondants sont égaux. Si le rapport est 1 : k, le rapport des périmètres est aussi 1 : k et celui des aires est 1 : k². Pour les solides, le rapport des volumes est 1 : k³. La largeur et la hauteur sont multipliées par k, donc l\'aire par k × k, et avec la profondeur aussi k fois, le volume par k × k × k.','Eine Figur, die um ein festes Verhältnis vergrößert oder verkleinert wird, ist dem Original ähnlich. Das Verhältnis entsprechender Seitenlängen ist das Ähnlichkeitsverhältnis, entsprechende Winkel sind gleich. Bei 1 : k ist auch das Umfangsverhältnis 1 : k und das Flächenverhältnis 1 : k². Bei Körpern ist das Volumenverhältnis 1 : k³. Breite und Höhe wachsen auf das k-Fache, die Fläche also auf das k × k-Fache, und mit der ebenfalls k-fachen Höhe das Volumen auf das k × k × k-Fache.','図形を一定の比率で拡大・縮小した図形は、もとの図形と相似です。対応する辺の長さの比を相似比といい、対応する角の大きさは等しいです。相似比が1 : kなら周の長さの比も1 : kで、面積の比は1 : k²です。立体なら体積の比は1 : k³です。縦と横がどちらもk倍になるので面積はk × k倍、高さもk倍になるので体積はk × k × k倍になるからです。'],
    '닮음비 k = 2일 때 넓이와 부피는 각각 몇 배가 되나요?':['When the ratio k = 2, how many times do the area and volume become?','Cuando k = 2, ¿cuántas veces se vuelven el área y el volumen?','Quand k = 2, combien de fois l\'aire et le volume sont-ils multipliés ?','Wievielfach werden Fläche und Volumen bei k = 2?','相似比k = 2のとき、面積と体積は何倍になる？'],
    'k = 0.5로 줄이면 넓이와 부피의 비는 어떻게 되나요?':['If you shrink to k = 0.5, what happens to the area and volume ratios?','Si reduces a k = 0,5, ¿qué ocurre con las razones de área y volumen?','Si vous réduisez à k = 0,5, que deviennent les rapports d\'aire et de volume ?','Was passiert mit Flächen- und Volumenverhältnis, wenn du auf k = 0,5 verkleinerst?','k = 0.5に縮めると、面積比と体積比はどうなる？'],
    '삼각형의 밑변을 바꾸어도 넓이의 비가 k²인지 확인해 보세요':['Change the base of the triangle and check that the area ratio is still k²','Cambia la base del triángulo y comprueba que la razón de áreas sigue siendo k²','Changez la base du triangle et vérifiez que le rapport des aires reste k²','Ändere die Grundseite des Dreiecks und prüfe, dass das Flächenverhältnis weiterhin k² ist','三角形の底辺を変えても、面積比がk²のままか確かめよう'],
    '닮음비 1 : k':['Similarity ratio 1 : k','Razón de semejanza 1 : k','Rapport de similitude 1 : k','Ähnlichkeitsverhältnis 1 : k','相似比 1 : k'],
    '삼각형의 밑변':['Base of the triangle','Base del triángulo','Base du triangle','Grundseite des Dreiecks','三角形の底辺'],
    '삼각형의 높이':['Height of the triangle','Altura del triángulo','Hauteur du triangle','Höhe des Dreiecks','三角形の高さ'],
    '아래 그림':['Figure below','Figura inferior','Figure ci-dessous','Abbildung unten','下の図'],
    '정사각형 (넓이)':['Square (area)','Cuadrado (área)','Carré (aire)','Quadrat (Fläche)','正方形（面積）'],
    '정육면체 (부피)':['Cube (volume)','Cubo (volumen)','Cube (volume)','Würfel (Volumen)','立方体（体積）'],
    '닮음비 k':['Similarity ratio k','Razón de semejanza k','Rapport de similitude k','Ähnlichkeitsverhältnis k','相似比 k'],
    '넓이의 비':['Area ratio','Razón de áreas','Rapport des aires','Flächenverhältnis','面積比'],
    '부피의 비':['Volume ratio','Razón de volúmenes','Rapport des volumes','Volumenverhältnis','体積比'],
    '{0}칸 = {1}':['{0} cells = {1}','{0} casillas = {1}','{0} cases = {1}','{0} Kästchen = {1}','{0}マス = {1}'],
    '{0}배 = {1}':['{0} times = {1}','{0} veces = {1}','{0} fois = {1}','{0}-fach = {1}','{0}倍 = {1}'],
    '닮음비':['Similarity ratio','Razón de semejanza','Rapport de similitude','Ähnlichkeitsverhältnis','相似比'],
    '둘레의 비':['Perimeter ratio','Razón de perímetros','Rapport des périmètres','Umfangsverhältnis','周の長さの比'],
    '삼각형의 넓이 (작은 것)':['Triangle area (small)','Área del triángulo (pequeño)','Aire du triangle (petit)','Dreiecksfläche (klein)','三角形の面積（小）'],
    '삼각형의 넓이 (큰 것)':['Triangle area (large)','Área del triángulo (grande)','Aire du triangle (grand)','Dreiecksfläche (groß)','三角形の面積（大）'],
    '둘레 (작은 것 → 큰 것)':['Perimeter (small → large)','Perímetro (pequeño → grande)','Périmètre (petit → grand)','Umfang (klein → groß)','周の長さ（小→大）'],
    '그림자로 높이 재기 (탈레스)':['Measuring Height by Shadow (Thales)','Medir la altura con la sombra (Tales)','Mesurer la hauteur par l\'ombre (Thalès)','Höhe durch Schatten messen (Thales)','影で高さを測る（タレス）'],
    '닮음을 이용해 막대의 그림자로 나무의 높이 알아내기':['Use similarity to find a tree\'s height from a stick\'s shadow','Usar la semejanza para hallar la altura de un árbol con la sombra de un palo','Utiliser la similitude pour trouver la hauteur d\'un arbre grâce à l\'ombre d\'un bâton','Mit Ähnlichkeit die Höhe eines Baums aus dem Schatten eines Stabs bestimmen','相似を使って、棒の影から木の高さを求める'],
    '고대 그리스의 탈레스는 피라미드의 그림자로 높이를 쟀다고 해요. 같은 시각에는 햇빛이 평행하게 들어와서, 막대와 그림자가 이루는 직각삼각형과 나무와 그림자가 이루는 직각삼각형이 닮음(AA 닮음)이에요. 그래서 (막대의 높이) : (막대 그림자) = (나무의 높이) : (나무 그림자)이고, 나무의 높이는 (막대의 높이) × (나무 그림자) ÷ (막대 그림자)예요. 해가 움직여 그림자가 길어져도 이 비는 항상 같아요.':['The ancient Greek Thales is said to have measured the pyramid by its shadow. At the same time of day, sunlight arrives in parallel, so the right triangle of the stick and its shadow and the right triangle of the tree and its shadow are similar (AA similarity). So (stick height) : (stick shadow) = (tree height) : (tree shadow), and the tree height is (stick height) × (tree shadow) ÷ (stick shadow). Even as the sun moves and the shadows lengthen, this ratio stays the same.','Se dice que el griego Tales midió la pirámide con su sombra. A la misma hora la luz solar llega en paralelo, así que el triángulo rectángulo del palo y su sombra y el del árbol y su sombra son semejantes (semejanza AA). Por tanto (altura del palo) : (sombra del palo) = (altura del árbol) : (sombra del árbol), y la altura del árbol es (altura del palo) × (sombra del árbol) ÷ (sombra del palo). Aunque el sol se mueva y las sombras se alarguen, esta razón no cambia.','On dit que le Grec Thalès a mesuré la pyramide grâce à son ombre. À un même moment, les rayons du soleil sont parallèles, donc le triangle rectangle du bâton et de son ombre et celui de l\'arbre et de son ombre sont semblables (similitude AA). Ainsi (hauteur du bâton) : (ombre du bâton) = (hauteur de l\'arbre) : (ombre de l\'arbre), et la hauteur de l\'arbre vaut (hauteur du bâton) × (ombre de l\'arbre) ÷ (ombre du bâton). Même quand le soleil bouge et que les ombres s\'allongent, ce rapport reste le même.','Der Grieche Thales soll die Pyramide anhand ihres Schattens gemessen haben. Zur gleichen Tageszeit fällt das Sonnenlicht parallel ein, daher sind das rechtwinklige Dreieck aus Stab und Schatten und das aus Baum und Schatten ähnlich (WW-Ähnlichkeit). Also gilt (Stabhöhe) : (Stabschatten) = (Baumhöhe) : (Baumschatten), und die Baumhöhe ist (Stabhöhe) × (Baumschatten) ÷ (Stabschatten). Auch wenn die Sonne wandert und die Schatten länger werden, bleibt dieses Verhältnis gleich.','古代ギリシャのタレスは、ピラミッドの影で高さを測ったといわれます。同じ時刻には日光が平行に入るので、棒と影でできる直角三角形と、木と影でできる直角三角形は相似（AA相似）です。だから（棒の高さ）:（棒の影）＝（木の高さ）:（木の影）で、木の高さは（棒の高さ）×（木の影）÷（棒の影）です。太陽が動いて影が長くなっても、この比はいつも同じです。'],
    '태양의 높이를 바꾸어 그림자가 달라져도 높이의 추정값이 일정한지 확인해 보세요':['Change the sun\'s height so the shadows change and check that the height estimate stays constant','Cambia la altura del sol para que cambien las sombras y comprueba que la estimación de la altura sigue constante','Changez la hauteur du soleil pour modifier les ombres et vérifiez que l\'estimation de la hauteur reste constante','Ändere die Sonnenhöhe, sodass sich die Schatten ändern, und prüfe, dass die Höhenschätzung gleich bleibt','太陽の高さを変えて影が変わっても、高さの推定値が一定か確かめよう'],
    '막대 높이 1.5 m, 막대 그림자 1 m, 나무 그림자 12 m일 때 나무 높이를 직접 계산해 보세요':['With stick height 1.5 m, stick shadow 1 m and tree shadow 12 m, calculate the tree height yourself','Con un palo de 1,5 m, sombra del palo de 1 m y sombra del árbol de 12 m, calcula tú mismo la altura del árbol','Avec un bâton de 1,5 m, une ombre de bâton de 1 m et une ombre d\'arbre de 12 m, calculez vous-même la hauteur de l\'arbre','Berechne bei 1,5 m Stabhöhe, 1 m Stabschatten und 12 m Baumschatten die Baumhöhe selbst','棒の高さ1.5 m、棒の影1 m、木の影12 mのとき、木の高さを自分で計算してみよう'],
    '시작을 눌러 해가 움직일 때 두 그림자의 길이의 비가 변하나요?':['Press start so the sun moves. Does the ratio of the two shadow lengths change?','Pulsa iniciar para que el sol se mueva. ¿Cambia la razón de las longitudes de las dos sombras?','Appuyez sur démarrer pour que le soleil bouge. Le rapport des longueurs des deux ombres change-t-il ?','Drücke Start, damit sich die Sonne bewegt. Ändert sich das Verhältnis der beiden Schattenlängen?','スタートを押して太陽を動かそう。2つの影の長さの比は変わるかな？'],
    '해 움직이기':['Move the sun','Mover el sol','Déplacer le soleil','Sonne bewegen','太陽を動かす'],
    '막대의 높이':['Stick height','Altura del palo','Hauteur du bâton','Stabhöhe','棒の高さ'],
    '나무의 실제 높이':['Actual height of the tree','Altura real del árbol','Hauteur réelle de l\'arbre','Tatsächliche Höhe des Baums','木の実際の高さ'],
    '태양의 높이 (각도)':['Sun height (angle)','Altura del sol (ángulo)','Hauteur du soleil (angle)','Sonnenhöhe (Winkel)','太陽の高さ（角度）'],
    '태양의 높이':['Sun height','Altura del sol','Hauteur du soleil','Sonnenhöhe','太陽の高さ'],
    '막대 그림자':['Stick shadow','Sombra del palo','Ombre du bâton','Stabschatten','棒の影'],
    '나무 그림자':['Tree shadow','Sombra del árbol','Ombre de l\'arbre','Baumschatten','木の影'],
    '높이의 추정값':['Height estimate','Altura estimada','Hauteur estimée','Höhenschätzung','高さの推定値'],
    '{0} m (추정)':['{0} m (estimate)','{0} m (estimado)','{0} m (estimation)','{0} m (Schätzung)','{0} m（推定）'],
    '막대 : 막대 그림자':['Stick : stick shadow','Palo : sombra del palo','Bâton : ombre du bâton','Stab : Stabschatten','棒 : 棒の影'],
    '나무 : 나무 그림자':['Tree : tree shadow','Árbol : sombra del árbol','Arbre : ombre de l\'arbre','Baum : Baumschatten','木 : 木の影'],
    '막대 높이 ÷ 그림자':['Stick height ÷ shadow','Altura del palo ÷ sombra','Hauteur du bâton ÷ ombre','Stabhöhe ÷ Schatten','棒の高さ ÷ 影'],
    '나무 높이의 추정값':['Tree height estimate','Altura estimada del árbol','Hauteur estimée de l\'arbre','Geschätzte Baumhöhe','木の高さの推定値'],
    '평행선과 선분의 길이의 비':['Parallel Lines and Ratios of Segments','Rectas paralelas y razones de segmentos','Droites parallèles et rapports de segments','Parallelen und Streckenverhältnisse','平行線と線分の長さの比'],
    '삼각형에서 DE ∥ BC이면 AD : AB = AE : AC = DE : BC':['In a triangle, if DE ∥ BC then AD : AB = AE : AC = DE : BC','En un triángulo, si DE ∥ BC entonces AD : AB = AE : AC = DE : BC','Dans un triangle, si DE ∥ BC alors AD : AB = AE : AC = DE : BC','Im Dreieck gilt bei DE ∥ BC: AD : AB = AE : AC = DE : BC','三角形でDE ∥ BCなら AD : AB = AE : AC = DE : BC'],
    '삼각형 ABC에서 변 AB 위의 점 D와 변 AC 위의 점 E에 대해 DE ∥ BC이면 삼각형 ADE와 삼각형 ABC는 닮음이에요. 그래서 AD : AB = AE : AC = DE : BC이고, AD : DB = AE : EC예요. 거꾸로 AD : DB = AE : EC이면 DE ∥ BC예요. 특히 D, E가 각각 AB, AC의 중점이면 DE ∥ BC이고 DE = ½BC(삼각형의 중점연결정리)예요.':['In triangle ABC, for a point D on side AB and a point E on side AC, if DE ∥ BC then triangles ADE and ABC are similar. So AD : AB = AE : AC = DE : BC, and AD : DB = AE : EC. Conversely, if AD : DB = AE : EC then DE ∥ BC. In particular, if D and E are the midpoints of AB and AC, then DE ∥ BC and DE = ½BC (the midsegment theorem).','En el triángulo ABC, para un punto D del lado AB y un punto E del lado AC, si DE ∥ BC los triángulos ADE y ABC son semejantes. Así AD : AB = AE : AC = DE : BC, y AD : DB = AE : EC. Recíprocamente, si AD : DB = AE : EC entonces DE ∥ BC. En particular, si D y E son los puntos medios de AB y AC, entonces DE ∥ BC y DE = ½BC (teorema del segmento medio).','Dans le triangle ABC, pour un point D du côté AB et un point E du côté AC, si DE ∥ BC alors les triangles ADE et ABC sont semblables. Donc AD : AB = AE : AC = DE : BC, et AD : DB = AE : EC. Réciproquement, si AD : DB = AE : EC alors DE ∥ BC. En particulier, si D et E sont les milieux de AB et AC, alors DE ∥ BC et DE = ½BC (théorème des milieux).','Im Dreieck ABC sind für einen Punkt D auf AB und einen Punkt E auf AC die Dreiecke ADE und ABC ähnlich, wenn DE ∥ BC. Also gilt AD : AB = AE : AC = DE : BC und AD : DB = AE : EC. Umgekehrt folgt aus AD : DB = AE : EC, dass DE ∥ BC. Sind D und E die Mittelpunkte von AB und AC, gilt DE ∥ BC und DE = ½BC (Mittelparallelensatz).','三角形ABCで、辺AB上の点Dと辺AC上の点Eについて DE ∥ BC なら、三角形ADEと三角形ABCは相似です。だから AD : AB = AE : AC = DE : BC で、AD : DB = AE : EC です。逆に AD : DB = AE : EC なら DE ∥ BC です。特にD、EがそれぞれAB、ACの中点なら、DE ∥ BC で DE = ½BC です（三角形の中点連結定理）。'],
    '점 D를 AB 위에서 움직이며 AD : DB와 AE : EC가 같은지 확인해 보세요':['Move point D along AB and check whether AD : DB and AE : EC are equal','Mueve el punto D sobre AB y comprueba si AD : DB y AE : EC son iguales','Déplacez le point D sur AB et vérifiez si AD : DB et AE : EC sont égaux','Bewege Punkt D auf AB und prüfe, ob AD : DB und AE : EC gleich sind','点DをAB上で動かして、AD : DBとAE : ECが等しいか確かめよう'],
    'D와 E가 모두 중점일 때 DE와 BC의 길이의 비를 구해 보세요':['When D and E are both midpoints, find the ratio of DE to BC','Cuando D y E son ambos puntos medios, halla la razón de DE a BC','Quand D et E sont tous deux des milieux, trouvez le rapport de DE à BC','Wenn D und E beide Mittelpunkte sind, bestimme das Verhältnis von DE zu BC','DとEがどちらも中点のとき、DEとBCの長さの比を求めてみよう'],
    '평행 조건을 끄고 점 E만 움직이면 두 비가 같아지는 곳이 DE ∥ BC인 곳인가요?':['Turn off the parallel condition and move only point E. Is the place where the two ratios are equal where DE ∥ BC?','Desactiva la condición de paralelismo y mueve solo el punto E. ¿El lugar donde las dos razones son iguales es donde DE ∥ BC?','Désactivez la condition de parallélisme et ne déplacez que le point E. L\'endroit où les deux rapports sont égaux est-il celui où DE ∥ BC ?','Schalte die Parallelbedingung aus und bewege nur Punkt E. Ist die Stelle, an der beide Verhältnisse gleich sind, die mit DE ∥ BC?','平行の条件をオフにして点Eだけ動かそう。2つの比が等しくなるところがDE ∥ BCのところかな？'],
    'AD ÷ AB (점 D의 위치)':['AD ÷ AB (position of point D)','AD ÷ AB (posición del punto D)','AD ÷ AB (position du point D)','AD ÷ AB (Lage von Punkt D)','AD ÷ AB（点Dの位置）'],
    'DE를 BC와 평행하게 두기':['Keep DE parallel to BC','Mantener DE paralela a BC','Garder DE parallèle à BC','DE parallel zu BC halten','DEをBCと平行にする'],
    'AE ÷ AC (점 E의 위치)':['AE ÷ AC (position of point E)','AE ÷ AC (posición del punto E)','AE ÷ AC (position du point E)','AE ÷ AC (Lage von Punkt E)','AE ÷ AC（点Eの位置）'],
    'DE와 BC':['DE and BC','DE y BC','DE et BC','DE und BC','DEとBC'],
    '평행해요 (비가 같아요)':['Parallel (the ratios are equal)','Paralelas (las razones son iguales)','Parallèles (les rapports sont égaux)','Parallel (die Verhältnisse sind gleich)','平行です（比が等しい）'],
    '공을 던졌을 때의 높이':['Height of a Thrown Ball','Altura de una pelota lanzada','Hauteur d\'une balle lancée','Höhe eines geworfenen Balls','投げたボールの高さ'],
    '시간에 따른 높이 h = −(g/2)t² + v₀t + h₀ 의 꼭짓점과 땅에 닿는 시각':['The vertex and landing time of h = −(g/2)t² + v₀t + h₀ over time','El vértice y el instante de caída de h = −(g/2)t² + v₀t + h₀ con el tiempo','Le sommet et l\'instant d\'atterrissage de h = −(g/2)t² + v₀t + h₀ au cours du temps','Scheitel und Landezeit von h = −(g/2)t² + v₀t + h₀ im Zeitverlauf','時間に伴う h = −(g/2)t² + v₀t + h₀ の頂点と地面に着く時刻'],
    '공을 위로 던지면 t초 뒤의 높이는 h = −(g/2)t² + v₀t + h₀예요. 중력 가속도 g가 9.8 m/s²이면 계수는 −4.9예요. 이것은 위로 볼록한 이차함수라서 꼭짓점에서 가장 높이 올라가요. 꼭짓점의 t 좌표는 v₀ ÷ g이고 그때의 높이가 최고점이에요. 높이가 0이 되는 t는 이차방정식의 해이고, 땅에 닿는 시각을 알려 줘요. g가 작은 달에서는 공이 훨씬 오래, 높이 날아가요.':['When a ball is thrown upward, its height after t seconds is h = −(g/2)t² + v₀t + h₀. If gravity g is 9.8 m/s², the coefficient is −4.9. This is a downward-opening quadratic, so it rises highest at the vertex. The t coordinate of the vertex is v₀ ÷ g, and the height there is the peak. The t where the height is 0 is a root of the quadratic equation and gives the landing time. On the Moon, where g is small, the ball flies much longer and higher.','Al lanzar una pelota hacia arriba, su altura tras t segundos es h = −(g/2)t² + v₀t + h₀. Si la gravedad g es 9,8 m/s², el coeficiente es −4,9. Es una función cuadrática abierta hacia abajo, así que sube más alto en el vértice. La coordenada t del vértice es v₀ ÷ g y la altura allí es el punto máximo. El t donde la altura es 0 es una raíz de la ecuación cuadrática y da el instante de caída. En la Luna, donde g es pequeña, la pelota vuela mucho más tiempo y más alto.','Quand on lance une balle vers le haut, sa hauteur après t secondes est h = −(g/2)t² + v₀t + h₀. Si la gravité g vaut 9,8 m/s², le coefficient est −4,9. C\'est une fonction quadratique ouverte vers le bas, donc elle monte le plus haut au sommet. L\'abscisse t du sommet est v₀ ÷ g et la hauteur correspondante est le point culminant. Le t où la hauteur vaut 0 est une racine de l\'équation du second degré et donne l\'instant d\'atterrissage. Sur la Lune, où g est petit, la balle vole beaucoup plus longtemps et plus haut.','Wirft man einen Ball nach oben, ist seine Höhe nach t Sekunden h = −(g/2)t² + v₀t + h₀. Bei g = 9,8 m/s² ist der Koeffizient −4,9. Das ist eine nach unten geöffnete quadratische Funktion, die im Scheitel am höchsten steigt. Die t-Koordinate des Scheitels ist v₀ ÷ g, die Höhe dort ist der höchste Punkt. Das t, bei dem die Höhe 0 ist, ist eine Lösung der quadratischen Gleichung und gibt die Landezeit an. Auf dem Mond mit kleinem g fliegt der Ball viel länger und höher.','ボールを真上に投げると、t秒後の高さは h = −(g/2)t² + v₀t + h₀ です。重力加速度gが9.8 m/s²なら係数は−4.9です。これは上に凸の二次関数なので、頂点でいちばん高くなります。頂点のt座標は v₀ ÷ g で、そのときの高さが最高点です。高さが0になるtは二次方程式の解で、地面に着く時刻を教えてくれます。gが小さい月では、ボールはずっと長く、高く飛びます。'],
    '처음 속도 v₀를 두 배로 하면 최고 높이는 몇 배가 되나요?':['If you double the initial speed v₀, how many times does the maximum height become?','Si duplicas la velocidad inicial v₀, ¿cuántas veces se vuelve la altura máxima?','Si vous doublez la vitesse initiale v₀, combien de fois la hauteur maximale est-elle multipliée ?','Wievielfach wird die maximale Höhe, wenn du die Anfangsgeschwindigkeit v₀ verdoppelst?','初速度v₀を2倍にすると、最高の高さは何倍になる？'],
    '중력을 달(1.62)로 바꾸면 최고점과 땅에 닿는 시각이 어떻게 변하나요?':['If you change gravity to the Moon\'s (1.62), how do the peak and landing time change?','Si cambias la gravedad a la de la Luna (1,62), ¿cómo cambian el punto máximo y el instante de caída?','Si vous changez la gravité pour celle de la Lune (1,62), comment changent le sommet et l\'instant d\'atterrissage ?','Wie ändern sich Höchstpunkt und Landezeit, wenn du die Schwerkraft auf die des Mondes (1,62) stellst?','重力を月（1.62）に変えると、最高点と地面に着く時刻はどう変わる？'],
    '공이 올라갈 때와 내려올 때 같은 높이를 지나는 두 시각의 가운데가 꼭짓점의 t인지 확인해 보세요':['Check whether the midpoint of the two times at which the ball passes the same height going up and coming down is the t of the vertex','Comprueba si el punto medio de los dos instantes en que la pelota pasa por la misma altura al subir y al bajar es la t del vértice','Vérifiez si le milieu des deux instants où la balle passe par la même hauteur en montant et en descendant est le t du sommet','Prüfe, ob die Mitte der beiden Zeitpunkte, zu denen der Ball beim Steigen und Fallen dieselbe Höhe hat, das t des Scheitels ist','ボールが上るときと下りるときに同じ高さを通る2つの時刻の真ん中が頂点のtか確かめよう'],
    '처음 높이 h₀':['Initial height h₀','Altura inicial h₀','Hauteur initiale h₀','Anfangshöhe h₀','初めの高さ h₀'],
    '높이':['Height','Altura','Hauteur','Höhe','高さ'],
    '속도':['Speed','Velocidad','Vitesse','Geschwindigkeit','速さ'],
    '시간 (초)':['Time (s)','Tiempo (s)','Temps (s)','Zeit (s)','時間（秒）'],
    '높이 (m)':['Height (m)','Altura (m)','Hauteur (m)','Höhe (m)','高さ（m）'],
    '꼭짓점 ({0}, {1})':['Vertex ({0}, {1})','Vértice ({0}, {1})','Sommet ({0}, {1})','Scheitel ({0}, {1})','頂点（{0}, {1}）'],
    '꼭짓점 (최고점)':['Vertex (peak)','Vértice (punto máximo)','Sommet (point culminant)','Scheitel (Höchstpunkt)','頂点（最高点）'],
    '땅에 닿는 시각':['Landing time','Instante de caída','Instant d\'atterrissage','Landezeit','地面に着く時刻'],
    '지금 높이':['Current height','Altura actual','Hauteur actuelle','Aktuelle Höhe','今の高さ'],
    '지금 속도':['Current speed','Velocidad actual','Vitesse actuelle','Aktuelle Geschwindigkeit','今の速さ'],
    '울타리로 만든 넓이의 최댓값':['Maximum Area Made with a Fence','Área máxima con una valla','Aire maximale avec une clôture','Maximale Fläche mit einem Zaun','フェンスで囲んだ面積の最大値'],
    '길이가 정해진 울타리로 가장 넓은 직사각형을 만드는 가로 길이 찾기':['Find the width that makes the largest rectangle from a fence of fixed length','Hallar el ancho que da el rectángulo más grande con una valla de longitud fija','Trouver la largeur qui donne le plus grand rectangle avec une clôture de longueur fixée','Die Breite finden, die aus einem Zaun fester Länge das größte Rechteck ergibt','長さが決まったフェンスでいちばん広い長方形を作る横の長さを見つける'],
    '길이가 L m인 울타리로 직사각형 모양의 우리를 만들 때 가로를 x라고 하면 세로는 L/2 − x이고 넓이는 y = x(L/2 − x)예요. 이것은 위로 볼록한 이차함수이고, 꼭짓점인 x = L/4일 때 넓이가 가장 커요. 이때 가로와 세로가 같아서 정사각형이에요. 벽 한쪽을 이용하면 울타리는 세 면만 필요해서 가로가 x이면 세로는 L − 2x이고 넓이 x(L − 2x)가 최대가 되는 x는 역시 L/4예요.':['When making a rectangular pen from L m of fence, if the width is x then the length is L/2 − x and the area is y = x(L/2 − x). This is a downward-opening quadratic, and the area is largest at the vertex x = L/4. Then width and length are equal, so it is a square. If one side uses a wall, only three sides need fence: with width x the length is L − 2x, and the x that maximizes x(L − 2x) is again L/4.','Al hacer un corral rectangular con L m de valla, si el ancho es x el largo es L/2 − x y el área es y = x(L/2 − x). Es una función cuadrática abierta hacia abajo y el área es máxima en el vértice x = L/4. Entonces ancho y largo son iguales, es un cuadrado. Si un lado usa una pared, solo hacen falta tres lados de valla: con ancho x el largo es L − 2x, y el x que maximiza x(L − 2x) es de nuevo L/4.','Pour faire un enclos rectangulaire avec L m de clôture, si la largeur est x alors la longueur est L/2 − x et l\'aire est y = x(L/2 − x). C\'est une fonction quadratique ouverte vers le bas, et l\'aire est maximale au sommet x = L/4. Alors largeur et longueur sont égales : c\'est un carré. Si un côté s\'appuie sur un mur, il ne faut que trois côtés de clôture : avec la largeur x la longueur est L − 2x, et le x qui maximise x(L − 2x) est encore L/4.','Baut man aus L m Zaun ein rechteckiges Gehege und ist die Breite x, so ist die Länge L/2 − x und die Fläche y = x(L/2 − x). Das ist eine nach unten geöffnete quadratische Funktion, die Fläche ist im Scheitel x = L/4 am größten. Dann sind Breite und Länge gleich, also ein Quadrat. Nutzt man eine Wand als eine Seite, braucht man nur drei Zaunseiten: bei Breite x ist die Länge L − 2x, und das x, das x(L − 2x) maximiert, ist wieder L/4.','長さL mのフェンスで長方形の囲いを作るとき、横をxとすると縦は L/2 − x で、面積は y = x(L/2 − x) です。これは上に凸の二次関数で、頂点の x = L/4 のとき面積が最大になります。このとき横と縦が等しいので正方形です。壁を1面使うとフェンスは3面だけでよく、横がxなら縦は L − 2x で、面積 x(L − 2x) が最大になるxはやはり L/4 です。'],
    'L = 40일 때 가로를 5, 10, 15로 바꾸며 넓이를 비교하고 가장 넓은 때를 찾아보세요':['With L = 40, change the width to 5, 10, 15, compare the areas and find where it is largest','Con L = 40, cambia el ancho a 5, 10, 15, compara las áreas y halla cuándo es mayor','Avec L = 40, changez la largeur à 5, 10, 15, comparez les aires et trouvez où elle est maximale','Setze bei L = 40 die Breite auf 5, 10, 15, vergleiche die Flächen und finde die größte','L = 40で横を5、10、15に変えて面積を比べ、いちばん広いときを探そう'],
    '넓이가 같은 가로 길이가 두 개 있나요? 두 값의 가운데는 어디인가요?':['Are there two widths with the same area? Where is the middle of the two values?','¿Hay dos anchos con la misma área? ¿Dónde está el punto medio de los dos valores?','Y a-t-il deux largeurs de même aire ? Où est le milieu des deux valeurs ?','Gibt es zwei Breiten mit gleicher Fläche? Wo liegt die Mitte der beiden Werte?','面積が同じになる横の長さが2つあるかな？ 2つの値の真ん中はどこ？'],
    '벽을 이용하면 최대 넓이가 어떻게 달라지나요?':['How does the maximum area change if you use a wall?','¿Cómo cambia el área máxima si usas una pared?','Comment l\'aire maximale change-t-elle si l\'on utilise un mur ?','Wie ändert sich die maximale Fläche, wenn du eine Wand nutzt?','壁を使うと最大の面積はどう変わる？'],
    '울타리의 길이 L':['Fence length L','Longitud de la valla L','Longueur de la clôture L','Zaunlänge L','フェンスの長さ L'],
    '가로 x':['Width x','Ancho x','Largeur x','Breite x','横 x'],
    '벽 한쪽을 이용':['Use a wall for one side','Usar una pared como un lado','Utiliser un mur pour un côté','Eine Wand als eine Seite nutzen','壁を1面使う'],
    '벽':['Wall','Pared','Mur','Wand','壁'],
    '넓이 = {0} m²':['Area = {0} m²','Área = {0} m²','Aire = {0} m²','Fläche = {0} m²','面積 = {0} m²'],
    '넓이 (m²)':['Area (m²)','Área (m²)','Aire (m²)','Fläche (m²)','面積（m²）'],
    '최대 넓이':['Maximum area','Área máxima','Aire maximale','Maximale Fläche','最大の面積'],
    '최대가 되는 가로 x = L/4':['Width that gives the maximum x = L/4','Ancho que da el máximo x = L/4','Largeur donnant le maximum x = L/4','Breite für das Maximum x = L/4','最大になる横 x = L/4'],
    '지금 넓이 / 최대 넓이':['Current area / maximum area','Área actual / área máxima','Aire actuelle / aire maximale','Aktuelle Fläche / maximale Fläche','今の面積 / 最大の面積'],
    '넓이로 이차방정식 풀기 (완전제곱식)':['Solving Quadratics by Area (Completing the Square)','Resolver ecuaciones cuadráticas con áreas (completar el cuadrado)','Résoudre des équations du second degré par les aires (complétion du carré)','Quadratische Gleichungen über Flächen lösen (quadratische Ergänzung)','面積で二次方程式を解く（平方完成）'],
    'x² + bx = c를 정사각형을 완성하여 풀기':['Solve x² + bx = c by completing the square','Resolver x² + bx = c completando el cuadrado','Résoudre x² + bx = c en complétant le carré','x² + bx = c durch quadratische Ergänzung lösen','x² + bx = c を平方完成で解く'],
    'x² + bx = c를 넓이 모델로 풀어 볼게요. 한 변이 x인 정사각형(x²)에 가로 b, 세로 x인 직사각형(bx)을 반으로 나누어 양옆에 붙이면 모서리가 비어 있어요. 이 빈 곳에 한 변이 b/2인 작은 정사각형((b/2)²)을 채우면 한 변이 x + b/2인 큰 정사각형이 되어요. 즉 (x + b/2)² = c + (b/2)²이고, 제곱근을 취하면 x = −b/2 ± √(c + (b/2)²)예요. 길이가 되는 x는 양수인 해예요.':['Let\'s solve x² + bx = c with an area model. Take a square of side x (x²) and split the rectangle of width b and height x (bx) in half, attaching the halves to two sides; a corner is left empty. Filling this gap with a small square of side b/2 ((b/2)²) gives a big square of side x + b/2. So (x + b/2)² = c + (b/2)², and taking the square root gives x = −b/2 ± √(c + (b/2)²). Since x is a length, it is the positive solution.','Resolvamos x² + bx = c con un modelo de áreas. Toma un cuadrado de lado x (x²) y divide por la mitad el rectángulo de ancho b y alto x (bx), pegando las mitades en dos lados; queda una esquina vacía. Rellenando ese hueco con un cuadrado pequeño de lado b/2 ((b/2)²) se obtiene un cuadrado grande de lado x + b/2. Así (x + b/2)² = c + (b/2)², y al sacar la raíz x = −b/2 ± √(c + (b/2)²). Como x es una longitud, es la solución positiva.','Résolvons x² + bx = c avec un modèle d\'aires. Prenez un carré de côté x (x²) et coupez en deux le rectangle de largeur b et de hauteur x (bx), en collant les moitiés sur deux côtés ; un coin reste vide. En comblant ce vide avec un petit carré de côté b/2 ((b/2)²), on obtient un grand carré de côté x + b/2. Donc (x + b/2)² = c + (b/2)², et en prenant la racine x = −b/2 ± √(c + (b/2)²). Comme x est une longueur, c\'est la solution positive.','Lösen wir x² + bx = c mit einem Flächenmodell. Nimm ein Quadrat der Seite x (x²) und teile das Rechteck mit Breite b und Höhe x (bx) in zwei Hälften, die an zwei Seiten angelegt werden; eine Ecke bleibt leer. Füllt man die Lücke mit einem kleinen Quadrat der Seite b/2 ((b/2)²), entsteht ein großes Quadrat der Seite x + b/2. Also (x + b/2)² = c + (b/2)², und durch Wurzelziehen x = −b/2 ± √(c + (b/2)²). Da x eine Länge ist, gilt die positive Lösung.','x² + bx = c を面積モデルで解いてみましょう。1辺がxの正方形（x²）に、横b・縦xの長方形（bx）を半分に分けて両側にくっつけると、角が空いています。この空きに1辺がb/2の小さな正方形（(b/2)²）を埋めると、1辺が x + b/2 の大きな正方形になります。つまり (x + b/2)² = c + (b/2)² で、平方根をとると x = −b/2 ± √(c + (b/2)²) です。長さになるxは正の解です。'],
    'b = 6, c = 16일 때 모서리를 채워서 한 변이 5인 큰 정사각형이 되는지 확인해 보세요':['With b = 6, c = 16, check that filling the corner makes a big square of side 5','Con b = 6, c = 16, comprueba que al rellenar la esquina sale un cuadrado grande de lado 5','Avec b = 6, c = 16, vérifiez qu\'en comblant le coin on obtient un grand carré de côté 5','Prüfe bei b = 6, c = 16, dass das Füllen der Ecke ein großes Quadrat der Seite 5 ergibt','b = 6、c = 16のとき、角を埋めると1辺が5の大きな正方形になるか確かめよう'],
    'b와 c를 바꾸어 큰 정사각형의 한 변과 양의 해 x의 관계를 찾아보세요':['Change b and c and find the relation between the big square\'s side and the positive solution x','Cambia b y c y halla la relación entre el lado del cuadrado grande y la solución positiva x','Changez b et c et trouvez la relation entre le côté du grand carré et la solution positive x','Ändere b und c und finde den Zusammenhang zwischen der Seite des großen Quadrats und der positiven Lösung x','bとcを変えて、大きな正方形の1辺と正の解xの関係を見つけよう'],
    '시작을 눌러 모서리 조각이 채워지는 것을 보세요':['Press start to watch the corner piece being filled in','Pulsa iniciar para ver cómo se rellena la pieza de la esquina','Appuyez sur démarrer pour voir la pièce du coin se remplir','Drücke Start, um zu sehen, wie das Eckstück gefüllt wird','スタートを押して、角のかけらが埋まるところを見よう'],
    '모서리 채우기':['Fill the corner','Rellenar la esquina','Combler le coin','Ecke füllen','角を埋める'],
    'b (x의 계수)':['b (coefficient of x)','b (coeficiente de x)','b (coefficient de x)','b (Koeffizient von x)','b（xの係数）'],
    'c (오른쪽 상수)':['c (constant on the right)','c (constante de la derecha)','c (constante de droite)','c (Konstante rechts)','c（右側の定数）'],
    '모서리 조각 채우기':['Fill the corner piece','Rellenar la pieza de la esquina','Combler la pièce du coin','Eckstück füllen','角のかけらを埋める'],
    '양의 해':['Positive solution','Solución positiva','Solution positive','Positive Lösung','正の解'],
    '음의 해':['Negative solution','Solución negativa','Solution négative','Negative Lösung','負の解'],
    '완전제곱식':['Perfect square','Cuadrado perfecto','Carré parfait','Vollständiges Quadrat','完全平方式'],
    '큰 정사각형의 한 변 √(c + (b/2)²)':['Side of the big square √(c + (b/2)²)','Lado del cuadrado grande √(c + (b/2)²)','Côté du grand carré √(c + (b/2)²)','Seite des großen Quadrats √(c + (b/2)²)','大きな正方形の1辺 √(c + (b/2)²)'],
    '양의 해 x':['Positive solution x','Solución positiva x','Solution positive x','Positive Lösung x','正の解 x'],
    '음의 해 x':['Negative solution x','Solución negativa x','Solution négative x','Negative Lösung x','負の解 x'],
    '(길이가 아니에요)':['(not a length)','(no es una longitud)','(n\'est pas une longueur)','(keine Länge)','（長さではありません）'],
    '판별식 D = b² + 4c':['Discriminant D = b² + 4c','Discriminante D = b² + 4c','Discriminant D = b² + 4c','Diskriminante D = b² + 4c','判別式 D = b² + 4c'],
    '두 근과 계수의 관계':['Relations Between the Two Roots and Coefficients','Relaciones entre las dos raíces y los coeficientes','Relations entre les deux racines et les coefficients','Zusammenhang zwischen den beiden Lösungen und den Koeffizienten','2つの解と係数の関係'],
    '두 근 α, β로 이차방정식을 만들고 합과 곱 확인하기':['Build a quadratic from roots α and β and check the sum and product','Construir una ecuación cuadrática con raíces α y β y comprobar la suma y el producto','Construire une équation du second degré de racines α et β et vérifier la somme et le produit','Aus den Lösungen α und β eine quadratische Gleichung bauen und Summe und Produkt prüfen','2つの解α、βから二次方程式を作り、和と積を確かめる'],
    '두 근이 α, β인 이차방정식은 a(x − α)(x − β) = 0으로 쓸 수 있어요. 전개하면 ax² − a(α + β)x + aαβ = 0이에요. 그래서 ax² + bx + c = 0의 두 근에 대해 두 근의 합은 α + β = −b/a, 두 근의 곱은 αβ = c/a예요. 근을 직접 구하지 않고도 합과 곱을 계수에서 바로 알 수 있고, 두 근의 합과 곱이 주어지면 이차방정식을 만들 수 있어요. 그래프는 x축과 x = α, β에서 만나요.':['A quadratic equation with roots α and β can be written a(x − α)(x − β) = 0. Expanding gives ax² − a(α + β)x + aαβ = 0. So for the two roots of ax² + bx + c = 0, the sum is α + β = −b/a and the product is αβ = c/a. You can read the sum and product straight from the coefficients without solving, and given a sum and product you can build the equation. The graph meets the x-axis at x = α and β.','Una ecuación cuadrática con raíces α y β se puede escribir a(x − α)(x − β) = 0. Al desarrollar: ax² − a(α + β)x + aαβ = 0. Así, para las dos raíces de ax² + bx + c = 0, la suma es α + β = −b/a y el producto es αβ = c/a. Se pueden leer la suma y el producto directamente de los coeficientes sin resolver, y dados la suma y el producto se puede construir la ecuación. La gráfica corta el eje x en x = α y β.','Une équation du second degré de racines α et β s\'écrit a(x − α)(x − β) = 0. En développant : ax² − a(α + β)x + aαβ = 0. Donc pour les deux racines de ax² + bx + c = 0, la somme est α + β = −b/a et le produit est αβ = c/a. On lit la somme et le produit directement sur les coefficients sans résoudre, et, la somme et le produit étant donnés, on peut construire l\'équation. Le graphe coupe l\'axe des x en x = α et β.','Eine quadratische Gleichung mit den Lösungen α und β lässt sich als a(x − α)(x − β) = 0 schreiben. Ausmultipliziert: ax² − a(α + β)x + aαβ = 0. Für die beiden Lösungen von ax² + bx + c = 0 gilt daher: Summe α + β = −b/a, Produkt αβ = c/a. Summe und Produkt lassen sich direkt aus den Koeffizienten ablesen, ohne zu lösen, und aus gegebener Summe und gegebenem Produkt kann man die Gleichung bauen. Der Graph schneidet die x-Achse bei x = α und β.','解がα、βの二次方程式は a(x − α)(x − β) = 0 と書けます。展開すると ax² − a(α + β)x + aαβ = 0 です。だから ax² + bx + c = 0 の2つの解について、解の和は α + β = −b/a、解の積は αβ = c/a です。解を求めなくても和と積が係数からすぐ分かり、和と積が与えられれば二次方程式を作れます。グラフはx軸と x = α、β で交わります。'],
    'α = 2, β = −3일 때 식을 전개하고 합 −1, 곱 −6이 계수와 맞는지 확인해 보세요':['With α = 2, β = −3, expand the expression and check that the sum −1 and product −6 match the coefficients','Con α = 2, β = −3, desarrolla la expresión y comprueba que la suma −1 y el producto −6 coinciden con los coeficientes','Avec α = 2, β = −3, développez l\'expression et vérifiez que la somme −1 et le produit −6 correspondent aux coefficients','Entwickle mit α = 2, β = −3 den Term und prüfe, dass Summe −1 und Produkt −6 zu den Koeffizienten passen','α = 2、β = −3のとき式を展開して、和−1と積−6が係数と合うか確かめよう'],
    'a를 1에서 3으로 바꾸면 합과 곱의 값이 변하나요?':['If you change a from 1 to 3, do the values of the sum and product change?','Si cambias a de 1 a 3, ¿cambian los valores de la suma y del producto?','Si vous changez a de 1 à 3, les valeurs de la somme et du produit changent-elles ?','Ändern sich Summe und Produkt, wenn du a von 1 auf 3 änderst?','aを1から3に変えると、和と積の値は変わる？'],
    'α = β로 하면 판별식과 그래프가 어떻게 되나요?':['What happens to the discriminant and the graph if α = β?','¿Qué pasa con el discriminante y la gráfica si α = β?','Que deviennent le discriminant et le graphe si α = β ?','Was passiert mit Diskriminante und Graph, wenn α = β?','α = βにすると、判別式とグラフはどうなる？'],
    '한 근 α':['One root α','Una raíz α','Une racine α','Eine Lösung α','1つの解 α'],
    '다른 근 β':['The other root β','La otra raíz β','L\'autre racine β','Die andere Lösung β','もう1つの解 β'],
    '이차항의 계수 a':['Coefficient a of the quadratic term','Coeficiente a del término cuadrático','Coefficient a du terme du second degré','Koeffizient a des quadratischen Glieds','二次の項の係数 a'],
    '두 근의 합':['Sum of the roots','Suma de las raíces','Somme des racines','Summe der Lösungen','解の和'],
    '두 근의 곱':['Product of the roots','Producto de las raíces','Produit des racines','Produkt der Lösungen','解の積'],
    '인수분해한 꼴':['Factored form','Forma factorizada','Forme factorisée','Faktorisierte Form','因数分解した形'],
    '두 근의 합 α + β':['Sum of roots α + β','Suma de raíces α + β','Somme des racines α + β','Summe der Lösungen α + β','解の和 α + β'],
    '두 근의 곱 αβ':['Product of roots αβ','Producto de raíces αβ','Produit des racines αβ','Produkt der Lösungen αβ','解の積 αβ'],
    '판별식 D = b² − 4ac':['Discriminant D = b² − 4ac','Discriminante D = b² − 4ac','Discriminant D = b² − 4ac','Diskriminante D = b² − 4ac','判別式 D = b² − 4ac'],
    '각도로 건물의 높이 재기':['Measuring a Building\'s Height by Angle','Medir la altura de un edificio por el ángulo','Mesurer la hauteur d\'un bâtiment par l\'angle','Gebäudehöhe über den Winkel messen','角度で建物の高さを測る'],
    '올려다본 각과 거리로 tan을 이용해 높이 구하기':['Use tan with the angle of elevation and distance to find the height','Usar tan con el ángulo de elevación y la distancia para hallar la altura','Utiliser tan avec l\'angle d\'élévation et la distance pour trouver la hauteur','Mit tan aus Elevationswinkel und Entfernung die Höhe bestimmen','見上げた角と距離からtanを使って高さを求める'],
    '건물에서 d m 떨어진 곳에서 꼭대기를 올려다본 각(앙각)을 θ라고 하면 눈높이 위로 건물의 높이는 d × tan θ예요. 직각삼각형에서 tan θ = (높이) ÷ (밑변)이기 때문이에요. 여기에 눈높이를 더하면 건물의 전체 높이가 되어요. 시선의 길이(빗변)는 d ÷ cos θ이고, sin θ = (높이) ÷ (빗변)이에요. 같은 각이면 거리가 달라져도 세 변의 비 sin, cos, tan은 변하지 않아요.':['If you look up at the top from d m away at an angle of elevation θ, the building\'s height above eye level is d × tan θ, because in a right triangle tan θ = (height) ÷ (base). Adding the eye height gives the building\'s full height. The line of sight (hypotenuse) is d ÷ cos θ, and sin θ = (height) ÷ (hypotenuse). For the same angle, the ratios sin, cos and tan of the three sides do not change even if the distance changes.','Si miras la parte superior desde d m de distancia con un ángulo de elevación θ, la altura del edificio sobre el nivel de los ojos es d × tan θ, porque en un triángulo rectángulo tan θ = (altura) ÷ (base). Sumando la altura de los ojos se obtiene la altura total. La línea de visión (hipotenusa) es d ÷ cos θ, y sin θ = (altura) ÷ (hipotenusa). Para el mismo ángulo, las razones sin, cos y tan de los tres lados no cambian aunque cambie la distancia.','Si vous regardez le sommet depuis d m avec un angle d\'élévation θ, la hauteur du bâtiment au-dessus des yeux est d × tan θ, car dans un triangle rectangle tan θ = (hauteur) ÷ (base). En ajoutant la hauteur des yeux, on obtient la hauteur totale. La ligne de visée (hypoténuse) vaut d ÷ cos θ, et sin θ = (hauteur) ÷ (hypoténuse). Pour un même angle, les rapports sin, cos et tan des trois côtés ne changent pas même si la distance change.','Blickt man aus d m Entfernung unter dem Elevationswinkel θ zur Spitze, ist die Gebäudehöhe über Augenhöhe d × tan θ, denn im rechtwinkligen Dreieck gilt tan θ = (Höhe) ÷ (Grundseite). Mit der Augenhöhe ergibt sich die Gesamthöhe. Die Sichtlinie (Hypotenuse) ist d ÷ cos θ, und sin θ = (Höhe) ÷ (Hypotenuse). Bei gleichem Winkel ändern sich die Verhältnisse sin, cos und tan der drei Seiten auch bei anderer Entfernung nicht.','建物からd m離れた所で頂上を見上げた角（仰角）をθとすると、目の高さより上の建物の高さは d × tan θ です。直角三角形で tan θ = （高さ）÷（底辺）だからです。ここに目の高さを足すと建物全体の高さになります。視線の長さ（斜辺）は d ÷ cos θ で、sin θ = （高さ）÷（斜辺）です。同じ角なら、距離が変わっても3辺の比 sin、cos、tan は変わりません。'],
    '거리 40 m, 각 35°일 때 건물의 높이를 tan 35° ≈ 0.700으로 계산해 보세요':['With distance 40 m and angle 35°, calculate the building\'s height using tan 35° ≈ 0.700','Con distancia 40 m y ángulo 35°, calcula la altura del edificio con tan 35° ≈ 0,700','Avec une distance de 40 m et un angle de 35°, calculez la hauteur du bâtiment avec tan 35° ≈ 0,700','Berechne bei 40 m Entfernung und 35° die Gebäudehöhe mit tan 35° ≈ 0,700','距離40 m、角35°のとき、tan 35° ≈ 0.700で建物の高さを計算してみよう'],
    '거리를 두 배로 하면 같은 건물을 보는 각이 어떻게 달라지나요?':['If you double the distance, how does the angle to see the same building change?','Si duplicas la distancia, ¿cómo cambia el ángulo para ver el mismo edificio?','Si vous doublez la distance, comment change l\'angle pour voir le même bâtiment ?','Wie ändert sich der Winkel zum selben Gebäude, wenn du die Entfernung verdoppelst?','距離を2倍にすると、同じ建物を見る角はどう変わる？'],
    '각을 45°로 하면 높이와 거리의 관계는 어떻게 되나요?':['With the angle at 45°, what is the relation between height and distance?','Con el ángulo a 45°, ¿cuál es la relación entre altura y distancia?','Avec un angle de 45°, quelle est la relation entre hauteur et distance ?','Wie hängen Höhe und Entfernung bei einem Winkel von 45° zusammen?','角を45°にすると、高さと距離の関係はどうなる？'],
    '건물까지의 거리 d':['Distance to the building d','Distancia al edificio d','Distance au bâtiment d','Entfernung zum Gebäude d','建物までの距離 d'],
    '올려다본 각 θ':['Angle of elevation θ','Ángulo de elevación θ','Angle d\'élévation θ','Elevationswinkel θ','見上げた角 θ'],
    '눈높이':['Eye height','Altura de los ojos','Hauteur des yeux','Augenhöhe','目の高さ'],
    '거리 d':['Distance d','Distancia d','Distance d','Entfernung d','距離 d'],
    '건물의 높이':['Building height','Altura del edificio','Hauteur du bâtiment','Gebäudehöhe','建物の高さ'],
    '건물의 높이 = {0} m':['Building height = {0} m','Altura del edificio = {0} m','Hauteur du bâtiment = {0} m','Gebäudehöhe = {0} m','建物の高さ = {0} m'],
    '건물의 높이 (눈높이 포함)':['Building height (including eye height)','Altura del edificio (con la altura de los ojos)','Hauteur du bâtiment (hauteur des yeux comprise)','Gebäudehöhe (mit Augenhöhe)','建物の高さ（目の高さを含む）'],
    '눈높이 위의 높이 d × tan θ':['Height above eye level d × tan θ','Altura sobre los ojos d × tan θ','Hauteur au-dessus des yeux d × tan θ','Höhe über Augenhöhe d × tan θ','目の高さより上の高さ d × tan θ'],
    '시선의 길이 d ÷ cos θ':['Line of sight d ÷ cos θ','Línea de visión d ÷ cos θ','Ligne de visée d ÷ cos θ','Sichtlinie d ÷ cos θ','視線の長さ d ÷ cos θ'],
    '(높이) ÷ (거리)':['(height) ÷ (distance)','(altura) ÷ (distancia)','(hauteur) ÷ (distance)','(Höhe) ÷ (Entfernung)','（高さ）÷（距離）'],
    '30°, 45°, 60°의 삼각비':['Trigonometric Ratios of 30°, 45°, 60°','Razones trigonométricas de 30°, 45°, 60°','Rapports trigonométriques de 30°, 45°, 60°','Trigonometrische Verhältnisse von 30°, 45°, 60°','30°、45°、60°の三角比'],
    '정삼각형의 반과 정사각형의 반으로 특수각의 삼각비 구하기':['Get the ratios of special angles from half an equilateral triangle and half a square','Obtener las razones de los ángulos especiales con medio triángulo equilátero y medio cuadrado','Obtenir les rapports des angles remarquables avec la moitié d\'un triangle équilatéral et la moitié d\'un carré','Die Verhältnisse spezieller Winkel aus einem halben gleichseitigen Dreieck und einem halben Quadrat gewinnen','正三角形の半分と正方形の半分から特別な角の三角比を求める'],
    '한 변의 길이가 2인 정삼각형을 반으로 자르면 세 변이 1 : √3 : 2인 직각삼각형(30°, 60°, 90°)이 돼요. 한 변이 1인 정사각형을 대각선으로 자르면 세 변이 1 : 1 : √2인 직각삼각형(45°, 45°, 90°)이 돼요. 여기서 sin 30° = 1/2, cos 30° = √3/2, tan 30° = √3/3 같은 값을 얻어요. 삼각비는 세 변의 길이의 비라서 삼각형의 크기와 관계없이 각에만 정해져요.':['Cutting an equilateral triangle of side 2 in half gives a right triangle (30°, 60°, 90°) with sides 1 : √3 : 2. Cutting a square of side 1 along its diagonal gives a right triangle (45°, 45°, 90°) with sides 1 : 1 : √2. From these we get values such as sin 30° = 1/2, cos 30° = √3/2, tan 30° = √3/3. A trigonometric ratio is a ratio of side lengths, so it depends only on the angle, not on the size of the triangle.','Al cortar por la mitad un triángulo equilátero de lado 2 se obtiene un triángulo rectángulo (30°, 60°, 90°) con lados 1 : √3 : 2. Al cortar por la diagonal un cuadrado de lado 1 se obtiene un triángulo rectángulo (45°, 45°, 90°) con lados 1 : 1 : √2. De ahí salen valores como sin 30° = 1/2, cos 30° = √3/2, tan 30° = √3/3. Una razón trigonométrica es una razón entre longitudes de lados, así que depende solo del ángulo, no del tamaño del triángulo.','En coupant en deux un triangle équilatéral de côté 2, on obtient un triangle rectangle (30°, 60°, 90°) de côtés 1 : √3 : 2. En coupant un carré de côté 1 selon sa diagonale, on obtient un triangle rectangle (45°, 45°, 90°) de côtés 1 : 1 : √2. On en tire des valeurs comme sin 30° = 1/2, cos 30° = √3/2, tan 30° = √3/3. Un rapport trigonométrique est un rapport de longueurs de côtés ; il ne dépend donc que de l\'angle, pas de la taille du triangle.','Halbiert man ein gleichseitiges Dreieck der Seite 2, entsteht ein rechtwinkliges Dreieck (30°, 60°, 90°) mit den Seiten 1 : √3 : 2. Schneidet man ein Quadrat der Seite 1 entlang der Diagonale, entsteht ein rechtwinkliges Dreieck (45°, 45°, 90°) mit den Seiten 1 : 1 : √2. Daraus erhält man Werte wie sin 30° = 1/2, cos 30° = √3/2, tan 30° = √3/3. Ein trigonometrisches Verhältnis ist ein Verhältnis von Seitenlängen und hängt daher nur vom Winkel ab, nicht von der Größe des Dreiecks.','1辺の長さが2の正三角形を半分に切ると、3辺が 1 : √3 : 2 の直角三角形（30°、60°、90°）になります。1辺が1の正方形を対角線で切ると、3辺が 1 : 1 : √2 の直角三角形（45°、45°、90°）になります。ここから sin 30° = 1/2、cos 30° = √3/2、tan 30° = √3/3 のような値が得られます。三角比は3辺の長さの比なので、三角形の大きさに関係なく角だけで決まります。'],
    '빗변의 길이를 2에서 10으로 바꿔도 sin 30°가 항상 0.5인지 확인해 보세요':['Change the hypotenuse from 2 to 10 and check that sin 30° is always 0.5','Cambia la hipotenusa de 2 a 10 y comprueba que sin 30° es siempre 0,5','Changez l\'hypoténuse de 2 à 10 et vérifiez que sin 30° vaut toujours 0,5','Ändere die Hypotenuse von 2 auf 10 und prüfe, dass sin 30° immer 0,5 ist','斜辺の長さを2から10に変えても、sin 30°がいつも0.5か確かめよう'],
    'sin 60°와 cos 30°를 비교해 보세요. 어떤 관계가 있나요?':['Compare sin 60° and cos 30°. How are they related?','Compara sin 60° y cos 30°. ¿Qué relación tienen?','Comparez sin 60° et cos 30°. Quelle relation y a-t-il ?','Vergleiche sin 60° und cos 30°. Wie hängen sie zusammen?','sin 60°とcos 30°を比べてみよう。どんな関係がある？'],
    '45°일 때 tan이 1인 이유를 변의 길이로 설명해 보세요':['Explain with side lengths why tan is 1 at 45°','Explica con las longitudes de los lados por qué tan vale 1 a 45°','Expliquez avec les longueurs des côtés pourquoi tan vaut 1 à 45°','Erkläre mit Seitenlängen, warum tan bei 45° gleich 1 ist','45°でtanが1になる理由を辺の長さで説明してみよう'],
    '각 A':['Angle A','Ángulo A','Angle A','Winkel A','角A'],
    '빗변의 길이':['Hypotenuse length','Longitud de la hipotenusa','Longueur de l\'hypoténuse','Länge der Hypotenuse','斜辺の長さ'],
    '빗변':['Hypotenuse','Hipotenusa','Hypoténuse','Hypotenuse','斜辺'],
    '빗변 {0}':['Hypotenuse {0}','Hipotenusa {0}','Hypoténuse {0}','Hypotenuse {0}','斜辺 {0}'],
    '특수각의 삼각비':['Trigonometric ratios of special angles','Razones trigonométricas de ángulos especiales','Rapports trigonométriques des angles remarquables','Trigonometrische Verhältnisse spezieller Winkel','特別な角の三角比'],
    '각':['Angle','Ángulo','Angle','Winkel','角'],
    '마주 보는 변':['Opposite side','Cateto opuesto','Côté opposé','Gegenkathete','向かい合う辺'],
    '이웃한 변':['Adjacent side','Cateto adyacente','Côté adjacent','Ankathete','隣り合う辺'],
    '(마주 변) ÷ (빗변)':['(opposite) ÷ (hypotenuse)','(opuesto) ÷ (hipotenusa)','(opposé) ÷ (hypoténuse)','(Gegenkathete) ÷ (Hypotenuse)','（向かい合う辺）÷（斜辺）'],
    '편차와 분산':['Deviation and Variance','Desviación y varianza','Écart et variance','Abweichung und Varianz','偏差と分散'],
    '평균에서 떨어진 정도(편차)의 제곱의 평균이 분산':['The variance is the mean of the squared distances (deviations) from the mean','La varianza es la media de los cuadrados de las distancias (desviaciones) a la media','La variance est la moyenne des carrés des écarts à la moyenne','Die Varianz ist der Mittelwert der quadrierten Abstände (Abweichungen) vom Mittelwert','平均からの離れ具合（偏差）の2乗の平均が分散'],
    '편차는 (변량) − (평균)이에요. 편차의 합은 항상 0이라서 흩어진 정도를 나타내려면 편차를 제곱해서 평균을 구해요. 이것이 분산이고, 분산의 양의 제곱근이 표준편차예요. 편차를 한 변으로 하는 정사각형의 넓이가 편차의 제곱이니, 분산은 이 정사각형들의 넓이의 평균이에요. 자료가 평균 가까이 모여 있을수록 분산과 표준편차는 작아요.':['Deviation is (value) − (mean). The sum of deviations is always 0, so to show spread we square the deviations and take the mean. This is the variance, and its positive square root is the standard deviation. The area of a square whose side is a deviation equals the squared deviation, so the variance is the mean area of these squares. The closer the data are to the mean, the smaller the variance and standard deviation.','La desviación es (valor) − (media). La suma de las desviaciones siempre es 0, así que para mostrar la dispersión se elevan al cuadrado y se promedian. Eso es la varianza, y su raíz cuadrada positiva es la desviación típica. El área de un cuadrado cuyo lado es una desviación es la desviación al cuadrado, así que la varianza es el área media de esos cuadrados. Cuanto más cerca de la media están los datos, menores son la varianza y la desviación típica.','L\'écart est (valeur) − (moyenne). La somme des écarts vaut toujours 0 ; pour mesurer la dispersion, on élève donc les écarts au carré et on prend la moyenne. C\'est la variance, et sa racine carrée positive est l\'écart-type. L\'aire d\'un carré dont le côté est un écart vaut l\'écart au carré, donc la variance est l\'aire moyenne de ces carrés. Plus les données sont proches de la moyenne, plus la variance et l\'écart-type sont petits.','Die Abweichung ist (Wert) − (Mittelwert). Die Summe der Abweichungen ist immer 0, daher quadriert man sie und bildet den Mittelwert, um die Streuung zu zeigen. Das ist die Varianz, ihre positive Quadratwurzel die Standardabweichung. Die Fläche eines Quadrats mit einer Abweichung als Seite ist die quadrierte Abweichung, also ist die Varianz die mittlere Fläche dieser Quadrate. Je näher die Daten am Mittelwert liegen, desto kleiner sind Varianz und Standardabweichung.','偏差は（変量）−（平均）です。偏差の合計はいつも0なので、散らばりを表すには偏差を2乗して平均を求めます。これが分散で、分散の正の平方根が標準偏差です。偏差を1辺とする正方形の面積が偏差の2乗なので、分散はこの正方形の面積の平均です。データが平均の近くに集まっているほど、分散と標準偏差は小さくなります。'],
    '기본 자료 2, 4, 4, 4, 5, 5, 7, 9의 평균은 5이고 분산이 4, 표준편차가 2인지 확인해 보세요':['Check that the basic data 2, 4, 4, 4, 5, 5, 7, 9 have mean 5, variance 4 and standard deviation 2','Comprueba que los datos básicos 2, 4, 4, 4, 5, 5, 7, 9 tienen media 5, varianza 4 y desviación típica 2','Vérifiez que les données de base 2, 4, 4, 4, 5, 5, 7, 9 ont pour moyenne 5, variance 4 et écart-type 2','Prüfe, dass die Grunddaten 2, 4, 4, 4, 5, 5, 7, 9 den Mittelwert 5, die Varianz 4 und die Standardabweichung 2 haben','基本データ 2, 4, 4, 4, 5, 5, 7, 9 の平均が5、分散が4、標準偏差が2か確かめよう'],
    '자료 하나를 평균에서 멀리 옮기면 분산이 얼마나 커지나요?':['If you move one value far from the mean, how much does the variance grow?','Si alejas un dato de la media, ¿cuánto crece la varianza?','Si vous éloignez une valeur de la moyenne, de combien la variance augmente-t-elle ?','Wie stark wächst die Varianz, wenn du einen Wert weit vom Mittelwert wegschiebst?','データを1つ平均から遠く動かすと、分散はどれだけ大きくなる？'],
    '모든 자료를 같은 값으로 하면 편차와 분산은 얼마인가요?':['If all values are the same, what are the deviations and the variance?','Si todos los valores son iguales, ¿cuánto valen las desviaciones y la varianza?','Si toutes les valeurs sont identiques, que valent les écarts et la variance ?','Wie groß sind Abweichungen und Varianz, wenn alle Werte gleich sind?','すべてのデータを同じ値にすると、偏差と分散はいくつ？'],
    '이상한 값 더하기':['Add an outlier','Añadir un valor atípico','Ajouter une valeur aberrante','Ausreißer hinzufügen','外れ値を加える'],
    '평균 {0}':['Mean {0}','Media {0}','Moyenne {0}','Mittelwert {0}','平均 {0}'],
    '편차를 한 변으로 하는 정사각형':['Square whose side is the deviation','Cuadrado cuyo lado es la desviación','Carré dont le côté est l\'écart','Quadrat mit der Abweichung als Seite','偏差を1辺とする正方形'],
    '분산 {0}':['Variance {0}','Varianza {0}','Variance {0}','Varianz {0}','分散 {0}'],
    '편차의 합':['Sum of deviations','Suma de desviaciones','Somme des écarts','Summe der Abweichungen','偏差の合計'],
    '(편차)²의 합':['Sum of (deviation)²','Suma de (desviación)²','Somme des (écarts)²','Summe der (Abweichung)²','(偏差)²の合計'],
    '사분위수와 상자그림':['Quartiles and the Box Plot','Cuartiles y diagrama de caja','Quartiles et boîte à moustaches','Quartile und Boxplot','四分位数と箱ひげ図'],
    '자료를 4등분하는 값으로 분포를 한눈에 보기':['See the distribution at a glance with the values that split data into four parts','Ver la distribución de un vistazo con los valores que dividen los datos en cuatro partes','Voir la distribution d\'un coup d\'œil avec les valeurs qui partagent les données en quatre','Die Verteilung auf einen Blick mit den Werten, die die Daten in vier Teile teilen','データを4等分する値で分布をひと目で見る'],
    '자료를 크기순으로 늘어놓고 가운데 값이 중앙값(제2사분위수 Q₂)이에요. 중앙값을 기준으로 아래쪽 절반의 중앙값이 Q₁, 위쪽 절반의 중앙값이 Q₃이고, 이 세 값이 자료를 네 부분으로 나눠요. 상자그림은 최솟값, Q₁, Q₂, Q₃, 최댓값을 상자와 선으로 나타낸 그림이에요. Q₃ − Q₁을 사분위수 범위라고 하고, 이 범위가 클수록 자료가 넓게 흩어져 있어요. Q₁보다 1.5배 사분위수 범위 이상 벗어난 값은 이상치로 점으로 나타내요.':['Line the data up in order; the middle value is the median (second quartile Q₂). The median of the lower half is Q₁ and the median of the upper half is Q₃, and these three values split the data into four parts. A box plot shows the minimum, Q₁, Q₂, Q₃ and maximum with a box and lines. Q₃ − Q₁ is the interquartile range; the larger it is, the more widely the data are spread. Values more than 1.5 times the interquartile range beyond the box are outliers, shown as dots.','Ordena los datos; el valor central es la mediana (segundo cuartil Q₂). La mediana de la mitad inferior es Q₁ y la de la mitad superior es Q₃, y estos tres valores dividen los datos en cuatro partes. El diagrama de caja muestra el mínimo, Q₁, Q₂, Q₃ y el máximo con una caja y líneas. Q₃ − Q₁ es el rango intercuartílico; cuanto mayor es, más dispersos están los datos. Los valores a más de 1,5 veces el rango intercuartílico fuera de la caja son atípicos y se dibujan como puntos.','Rangez les données dans l\'ordre ; la valeur centrale est la médiane (deuxième quartile Q₂). La médiane de la moitié inférieure est Q₁ et celle de la moitié supérieure est Q₃ ; ces trois valeurs partagent les données en quatre parties. La boîte à moustaches montre le minimum, Q₁, Q₂, Q₃ et le maximum avec une boîte et des lignes. Q₃ − Q₁ est l\'écart interquartile ; plus il est grand, plus les données sont dispersées. Les valeurs situées à plus de 1,5 fois l\'écart interquartile hors de la boîte sont des valeurs aberrantes, dessinées en points.','Ordne die Daten der Größe nach; der mittlere Wert ist der Median (zweites Quartil Q₂). Der Median der unteren Hälfte ist Q₁, der der oberen Hälfte Q₃; diese drei Werte teilen die Daten in vier Teile. Ein Boxplot zeigt Minimum, Q₁, Q₂, Q₃ und Maximum mit einer Box und Linien. Q₃ − Q₁ ist der Interquartilsabstand; je größer er ist, desto breiter streuen die Daten. Werte, die mehr als das 1,5-Fache des Interquartilsabstands außerhalb der Box liegen, sind Ausreißer und werden als Punkte gezeichnet.','データを大きさの順に並べたとき、真ん中の値が中央値（第2四分位数 Q₂）です。中央値を境に下半分の中央値が Q₁、上半分の中央値が Q₃で、この3つの値がデータを4つに分けます。箱ひげ図は、最小値、Q₁、Q₂、Q₃、最大値を箱と線で表した図です。Q₃ − Q₁ を四分位範囲といい、これが大きいほどデータが広く散らばっています。箱から四分位範囲の1.5倍以上離れた値は外れ値として点で表します。'],
    '자료 하나를 아주 큰 값으로 바꾸면 상자와 이상치가 어떻게 달라지나요?':['If you change one value to a very large one, how do the box and outliers change?','Si cambias un dato por uno muy grande, ¿cómo cambian la caja y los atípicos?','Si vous remplacez une valeur par une très grande, comment changent la boîte et les valeurs aberrantes ?','Wie ändern sich Box und Ausreißer, wenn du einen Wert durch einen sehr großen ersetzt?','データを1つとても大きな値に変えると、箱と外れ値はどう変わる？'],
    '상자의 길이(사분위수 범위)가 짧을수록 자료의 분포는 어떤가요?':['The shorter the box (interquartile range), what is the distribution of the data like?','Cuanto más corta es la caja (rango intercuartílico), ¿cómo es la distribución de los datos?','Plus la boîte (écart interquartile) est courte, comment est la distribution des données ?','Wie ist die Verteilung der Daten, je kürzer die Box (Interquartilsabstand) ist?','箱の長さ（四分位範囲）が短いほど、データの分布はどうなっている？'],
    '자료가 홀수 개일 때와 짝수 개일 때 Q₁과 Q₃을 구하는 방법을 비교해 보세요':['Compare how to find Q₁ and Q₃ for an odd and an even number of values','Compara cómo hallar Q₁ y Q₃ con una cantidad impar y par de datos','Comparez la façon de trouver Q₁ et Q₃ pour un nombre impair et pair de valeurs','Vergleiche, wie man Q₁ und Q₃ bei ungerader und gerader Datenanzahl bestimmt','データの個数が奇数のときと偶数のときで、Q₁とQ₃の求め方を比べてみよう'],
    '이상치를 점으로 표시':['Show outliers as dots','Mostrar atípicos como puntos','Afficher les valeurs aberrantes en points','Ausreißer als Punkte anzeigen','外れ値を点で表示'],
    '사분위수 범위':['Interquartile range','Rango intercuartílico','Écart interquartile','Interquartilsabstand','四分位範囲'],
    '자료를 2개 이상 써 주세요':['Please enter at least 2 values','Escribe al menos 2 datos','Saisissez au moins 2 valeurs','Bitte mindestens 2 Werte eingeben','データを2つ以上入力してください'],
    '제1사분위수 Q₁':['First quartile Q₁','Primer cuartil Q₁','Premier quartile Q₁','Erstes Quartil Q₁','第1四分位数 Q₁'],
    '중앙값 (Q₂)':['Median (Q₂)','Mediana (Q₂)','Médiane (Q₂)','Median (Q₂)','中央値 (Q₂)'],
    '제3사분위수 Q₃':['Third quartile Q₃','Tercer cuartil Q₃','Troisième quartile Q₃','Drittes Quartil Q₃','第3四分位数 Q₃'],
    '사분위수 범위 Q₃ − Q₁':['Interquartile range Q₃ − Q₁','Rango intercuartílico Q₃ − Q₁','Écart interquartile Q₃ − Q₁','Interquartilsabstand Q₃ − Q₁','四分位範囲 Q₃ − Q₁'],
    '이상치':['Outliers','Valores atípicos','Valeurs aberrantes','Ausreißer','外れ値'],
    '정사각형의 넓이와 제곱근':['Area of a Square and Square Roots','Área de un cuadrado y raíces cuadradas','Aire d\'un carré et racines carrées','Quadratfläche und Quadratwurzeln','正方形の面積と平方根'],
    '넓이가 A인 정사각형의 한 변의 길이 √A 알아보기':['Learn that the side of a square of area A is √A','Aprender que el lado de un cuadrado de área A es √A','Découvrir que le côté d\'un carré d\'aire A est √A','Lernen, dass die Seite eines Quadrats mit Fläche A gleich √A ist','面積Aの正方形の1辺の長さが√Aであることを知る'],
    '넓이가 A인 정사각형의 한 변의 길이는 제곱해서 A가 되는 양수예요. 이 수를 A의 (양의) 제곱근이라 하고 √A로 나타내요. A = 4이면 한 변이 2이고, A = 2이면 한 변이 √2 ≈ 1.41421…예요. 어떤 수 A의 제곱근은 +√A와 −√A 두 개이고, 이 둘을 제곱하면 모두 A예요. A가 제곱수(1, 4, 9, 16, …)이면 제곱근이 자연수이고, 제곱수가 아닌 자연수의 제곱근은 소수점 아래가 불규칙하게 끝없이 이어지는 무리수예요.':['The side of a square of area A is the positive number whose square is A. This number is called the (positive) square root of A and written √A. If A = 4 the side is 2, and if A = 2 the side is √2 ≈ 1.41421…. A number A has two square roots, +√A and −√A, and squaring either gives A. If A is a square number (1, 4, 9, 16, …) the square root is a natural number; the square root of a natural number that is not a square is an irrational number whose decimal digits continue irregularly without end.','El lado de un cuadrado de área A es el número positivo cuyo cuadrado es A. Ese número se llama raíz cuadrada (positiva) de A y se escribe √A. Si A = 4 el lado es 2, y si A = 2 el lado es √2 ≈ 1,41421…. Un número A tiene dos raíces cuadradas, +√A y −√A, y al elevar cualquiera al cuadrado se obtiene A. Si A es un cuadrado perfecto (1, 4, 9, 16, …), la raíz cuadrada es un número natural; la raíz cuadrada de un natural que no es cuadrado perfecto es un número irracional cuyos decimales continúan sin fin y sin patrón.','Le côté d\'un carré d\'aire A est le nombre positif dont le carré est A. Ce nombre s\'appelle la racine carrée (positive) de A et se note √A. Si A = 4 le côté est 2, et si A = 2 le côté est √2 ≈ 1,41421…. Un nombre A a deux racines carrées, +√A et −√A, et le carré de l\'une ou l\'autre donne A. Si A est un carré parfait (1, 4, 9, 16, …), la racine carrée est un entier naturel ; la racine carrée d\'un entier naturel qui n\'est pas un carré parfait est un irrationnel dont les décimales se poursuivent sans fin ni régularité.','Die Seite eines Quadrats mit der Fläche A ist die positive Zahl, deren Quadrat A ist. Diese Zahl heißt die (positive) Quadratwurzel von A und wird √A geschrieben. Für A = 4 ist die Seite 2, für A = 2 ist sie √2 ≈ 1,41421…. Eine Zahl A hat zwei Quadratwurzeln, +√A und −√A, und beide ergeben quadriert A. Ist A eine Quadratzahl (1, 4, 9, 16, …), ist die Wurzel eine natürliche Zahl; die Wurzel einer natürlichen Zahl, die keine Quadratzahl ist, ist eine irrationale Zahl mit unregelmäßigen, endlos weitergehenden Nachkommastellen.','面積がAの正方形の1辺の長さは、2乗してAになる正の数です。この数をAの（正の）平方根といい、√Aと書きます。A = 4なら1辺は2、A = 2なら1辺は √2 ≈ 1.41421… です。数Aの平方根は +√A と −√A の2つで、どちらも2乗するとAになります。Aが平方数（1, 4, 9, 16, …）なら平方根は自然数で、平方数でない自然数の平方根は、小数点以下が不規則に限りなく続く無理数です。'],
    'A를 1, 4, 9, 16, 25로 바꾸며 한 변이 자연수가 되는 때를 찾아보세요':['Change A to 1, 4, 9, 16, 25 and find when the side is a natural number','Cambia A a 1, 4, 9, 16, 25 y busca cuándo el lado es un número natural','Changez A à 1, 4, 9, 16, 25 et trouvez quand le côté est un entier naturel','Setze A auf 1, 4, 9, 16, 25 und finde, wann die Seite eine natürliche Zahl ist','Aを1, 4, 9, 16, 25に変えて、1辺が自然数になるときを探そう'],
    'A = 2, 3, 5의 한 변이 어느 두 자연수 사이에 있는지 말해 보세요':['Say between which two natural numbers the side lies for A = 2, 3, 5','Di entre qué dos números naturales está el lado para A = 2, 3, 5','Dites entre quels deux entiers naturels se trouve le côté pour A = 2, 3, 5','Sage, zwischen welchen zwei natürlichen Zahlen die Seite für A = 2, 3, 5 liegt','A = 2, 3, 5の1辺が、どの2つの自然数の間にあるか言ってみよう'],
    '(√A)²이 왜 항상 A인지 정사각형으로 설명해 보세요':['Explain with the square why (√A)² is always A','Explica con el cuadrado por qué (√A)² es siempre A','Expliquez avec le carré pourquoi (√A)² vaut toujours A','Erkläre mit dem Quadrat, warum (√A)² immer A ist','(√A)²がなぜいつもAになるか、正方形で説明してみよう'],
    '정사각형의 넓이 A':['Area of the square A','Área del cuadrado A','Aire du carré A','Fläche des Quadrats A','正方形の面積 A'],
    '넓이 A':['Area A','Área A','Aire A','Fläche A','面積 A'],
    '제곱수이면 1':['1 if a square number','1 si es cuadrado perfecto','1 si carré parfait','1, wenn Quadratzahl','平方数なら1'],
    '넓이 {0}':['Area {0}','Área {0}','Aire {0}','Fläche {0}','面積 {0}'],
    '제곱근 √A':['Square root √A','Raíz cuadrada √A','Racine carrée √A','Quadratwurzel √A','平方根 √A'],
    '제곱근':['Square root','Raíz cuadrada','Racine carrée','Quadratwurzel','平方根'],
    '제곱수 (제곱근이 자연수)':['Square number (square root is natural)','Cuadrado perfecto (la raíz es natural)','Carré parfait (la racine est un entier naturel)','Quadratzahl (Wurzel ist natürlich)','平方数（平方根が自然数）'],
    '무리수 (순환하지 않는 무한소수)':['Irrational (non-repeating infinite decimal)','Irracional (decimal infinito no periódico)','Irrationnel (décimal infini non périodique)','Irrational (nichtperiodischer unendlicher Dezimalbruch)','無理数（循環しない無限小数）'],
    '{0}과 {1} 사이':['Between {0} and {1}','Entre {0} y {1}','Entre {0} et {1}','Zwischen {0} und {1}','{0}と{1}の間'],
    '피타고라스 나선과 제곱근':['The Spiral of Theodorus and Square Roots','La espiral de Teodoro y las raíces cuadradas','La spirale de Théodore et les racines carrées','Die Theodorus-Spirale und Quadratwurzeln','ピタゴラスの螺旋と平方根'],
    '직각삼각형을 이어 붙여 √2, √3, √4, … 의 길이 만들기':['Join right triangles to make lengths √2, √3, √4, …','Unir triángulos rectángulos para obtener longitudes √2, √3, √4, …','Assembler des triangles rectangles pour obtenir des longueurs √2, √3, √4, …','Rechtwinklige Dreiecke aneinanderfügen, um Längen √2, √3, √4, … zu erzeugen','直角三角形をつなげて √2, √3, √4, … の長さを作る'],
    '한 변이 1인 직각이등변삼각형에서 빗변의 길이는 피타고라스 정리에 의해 √2예요. 이 빗변과 길이 1인 선분을 두 변으로 하는 직각삼각형을 이어 붙이면 새 빗변은 √3, 다시 √4 = 2, √5, … 가 돼요. 이렇게 계속 이어 붙이면 나선 모양이 되고 고대 그리스의 테오도로스가 만들었다고 해요. 원점에서 각 점까지의 길이를 컴퍼스로 수직선에 옮기면 √2, √3, √5, … 를 수직선 위에 나타낼 수 있어요.':['In an isosceles right triangle with legs 1, the hypotenuse is √2 by the Pythagorean theorem. Attaching a right triangle whose legs are this hypotenuse and a segment of length 1 gives a new hypotenuse √3, then √4 = 2, √5, …. Continuing makes a spiral, said to have been made by the ancient Greek Theodorus. Transferring the length from the origin to each point onto the number line with a compass shows √2, √3, √5, … on the number line.','En un triángulo rectángulo isósceles de catetos 1, la hipotenusa es √2 por el teorema de Pitágoras. Al unir un triángulo rectángulo cuyos catetos son esa hipotenusa y un segmento de longitud 1, la nueva hipotenusa es √3, luego √4 = 2, √5, …. Al continuar se forma una espiral, que se dice hizo el griego Teodoro. Trasladando con un compás la longitud del origen a cada punto sobre la recta numérica, se ven √2, √3, √5, … en la recta numérica.','Dans un triangle rectangle isocèle de côtés 1, l\'hypoténuse vaut √2 d\'après le théorème de Pythagore. En accolant un triangle rectangle dont les côtés sont cette hypoténuse et un segment de longueur 1, la nouvelle hypoténuse vaut √3, puis √4 = 2, √5, …. En continuant, on obtient une spirale, que le Grec Théodore aurait construite. En reportant au compas sur la droite numérique la longueur de l\'origine à chaque point, on place √2, √3, √5, … sur la droite numérique.','In einem gleichschenklig-rechtwinkligen Dreieck mit Katheten 1 ist die Hypotenuse nach dem Satz des Pythagoras √2. Fügt man ein rechtwinkliges Dreieck an, dessen Katheten diese Hypotenuse und eine Strecke der Länge 1 sind, ist die neue Hypotenuse √3, dann √4 = 2, √5, …. So entsteht eine Spirale, die der Grieche Theodorus gebaut haben soll. Überträgt man die Länge vom Ursprung zu jedem Punkt mit dem Zirkel auf den Zahlenstrahl, lassen sich √2, √3, √5, … auf dem Zahlenstrahl darstellen.','直角を挟む2辺が1の直角二等辺三角形の斜辺は、ピタゴラスの定理により √2 です。この斜辺と長さ1の線分を2辺とする直角三角形をつなげると、新しい斜辺は √3、次は √4 = 2、√5、… となります。こうして続けると螺旋の形になり、古代ギリシャのテオドロスが作ったといわれます。原点から各点までの長さをコンパスで数直線に移すと、√2, √3, √5, … を数直線上に表せます。'],
    '삼각형을 하나씩 늘리며 새 빗변의 길이가 √3, √4, √5로 늘어나는 것을 확인해 보세요':['Add triangles one at a time and see the new hypotenuse grow as √3, √4, √5','Añade triángulos uno a uno y comprueba que la nueva hipotenusa crece como √3, √4, √5','Ajoutez les triangles un par un et voyez la nouvelle hypoténuse devenir √3, √4, √5','Füge Dreiecke einzeln hinzu und sieh, wie die neue Hypotenuse √3, √4, √5 wird','三角形を1つずつ増やして、新しい斜辺が√3、√4、√5と増えるのを確かめよう'],
    '수직선의 점 가운데 √4는 어디에 놓이나요?':['Among the points on the number line, where does √4 lie?','Entre los puntos de la recta numérica, ¿dónde queda √4?','Parmi les points de la droite numérique, où se place √4 ?','Wo liegt √4 unter den Punkten auf dem Zahlenstrahl?','数直線の点のうち、√4はどこに置かれる？'],
    '삼각형의 수가 17개에 가까워질 때 나선이 한 바퀴를 거의 다 돌아요. 이유를 생각해 보세요':['As the number of triangles nears 17, the spiral almost completes one turn. Think about why.','Cuando el número de triángulos se acerca a 17, la espiral casi completa una vuelta. Piensa por qué.','Quand le nombre de triangles approche 17, la spirale fait presque un tour. Réfléchissez-y.','Bei etwa 17 Dreiecken hat die Spirale fast eine volle Umdrehung gemacht. Überlege, warum.','三角形の数が17個に近づくと、螺旋はほぼ1周します。理由を考えてみよう。'],
    '나선 그리기':['Draw the spiral','Dibujar la espiral','Dessiner la spirale','Spirale zeichnen','螺旋を描く'],
    '이어 붙인 삼각형의 수':['Number of joined triangles','Número de triángulos unidos','Nombre de triangles assemblés','Anzahl der angefügten Dreiecke','つなげた三角形の数'],
    '삼각형의 수':['Number of triangles','Número de triángulos','Nombre de triangles','Anzahl der Dreiecke','三角形の数'],
    '마지막 빗변':['Last hypotenuse','Última hipotenusa','Dernière hypoténuse','Letzte Hypotenuse','最後の斜辺'],
    '돌아간 각':['Angle turned','Ángulo girado','Angle parcouru','Gedrehter Winkel','回った角'],
    '마지막 삼각형의 세 변':['Three sides of the last triangle','Tres lados del último triángulo','Trois côtés du dernier triangle','Drei Seiten des letzten Dreiecks','最後の三角形の3辺'],
    '(밑변)² + 1² = (빗변)²':['(base)² + 1² = (hypotenuse)²','(base)² + 1² = (hipotenusa)²','(base)² + 1² = (hypoténuse)²','(Grundseite)² + 1² = (Hypotenuse)²','(底辺)² + 1² = (斜辺)²'],
    '원점에서 돌아간 각':['Angle turned from the origin','Ángulo girado desde el origen','Angle parcouru depuis l\'origine','Vom Ursprung gedrehter Winkel','原点から回った角'],
    '제곱근의 값 어림하기':['Estimating Square Root Values','Estimar valores de raíces cuadradas','Estimer des valeurs de racines carrées','Quadratwurzelwerte abschätzen','平方根の値を見積もる'],
    '구간을 반으로 나누어 √n에 점점 가까이 다가가기':['Halve the interval to get closer and closer to √n','Dividir el intervalo por la mitad para acercarse cada vez más a √n','Couper l\'intervalle en deux pour s\'approcher de plus en plus de √n','Das Intervall halbieren, um √n immer näher zu kommen','区間を半分にして√nにだんだん近づく'],
    '√2는 제곱해서 2가 되는 수예요. 1² = 1 < 2 < 4 = 2²이므로 1 < √2 < 2예요. 구간의 가운데 값 1.5의 제곱이 2.25로 2보다 크니 1 < √2 < 1.5이에요. 이렇게 구간을 반으로 줄이는 일을 계속하면 √2 = 1.41421356…에 한없이 가까워져요. 단계마다 구간의 길이는 절반이 되어 한 단계에 약 0.3자리씩 정확해져요. 무리수의 소수 표현은 끝나지도 않고 반복되지도 않아요.':['√2 is the number whose square is 2. Since 1² = 1 < 2 < 4 = 2², we have 1 < √2 < 2. The square of the middle value 1.5 is 2.25, greater than 2, so 1 < √2 < 1.5. Keep halving the interval and you get endlessly close to √2 = 1.41421356…. Each step halves the interval, adding about 0.3 digits of accuracy per step. The decimal expansion of an irrational number neither ends nor repeats.','√2 es el número cuyo cuadrado es 2. Como 1² = 1 < 2 < 4 = 2², se tiene 1 < √2 < 2. El cuadrado del valor medio 1,5 es 2,25, mayor que 2, así que 1 < √2 < 1,5. Si sigues dividiendo el intervalo por la mitad te acercas sin límite a √2 = 1,41421356…. Cada paso reduce el intervalo a la mitad, ganando unos 0,3 dígitos de precisión por paso. El desarrollo decimal de un irracional ni termina ni se repite.','√2 est le nombre dont le carré vaut 2. Comme 1² = 1 < 2 < 4 = 2², on a 1 < √2 < 2. Le carré de la valeur médiane 1,5 est 2,25, supérieur à 2, donc 1 < √2 < 1,5. En continuant de couper l\'intervalle en deux, on s\'approche indéfiniment de √2 = 1,41421356…. Chaque étape divise l\'intervalle par deux, ce qui apporte environ 0,3 chiffre de précision par étape. Le développement décimal d\'un irrationnel ne se termine pas et ne se répète pas.','√2 ist die Zahl, deren Quadrat 2 ist. Da 1² = 1 < 2 < 4 = 2², gilt 1 < √2 < 2. Das Quadrat des mittleren Werts 1,5 ist 2,25 und größer als 2, also 1 < √2 < 1,5. Halbiert man das Intervall immer weiter, kommt man √2 = 1,41421356… beliebig nahe. Jeder Schritt halbiert das Intervall und bringt etwa 0,3 Stellen Genauigkeit. Die Dezimaldarstellung einer irrationalen Zahl endet nicht und wiederholt sich nicht.','√2は2乗して2になる数です。1² = 1 < 2 < 4 = 2² なので 1 < √2 < 2 です。区間の真ん中の値1.5を2乗すると2.25で2より大きいので 1 < √2 < 1.5 です。こうして区間を半分にすることを続けると、√2 = 1.41421356… に限りなく近づきます。1段階ごとに区間の長さが半分になり、1段階で約0.3桁ずつ正確になります。無理数の小数表示は、終わりもなく繰り返しもしません。'],
    'n = 2에서 단계를 늘리며 구간이 1 < √2 < 2에서 어떻게 좁혀지는지 보세요':['Starting with n = 2, add steps and see how the interval narrows from 1 < √2 < 2','Empezando con n = 2, añade pasos y mira cómo se estrecha el intervalo desde 1 < √2 < 2','En partant de n = 2, ajoutez des étapes et voyez comment l\'intervalle se resserre depuis 1 < √2 < 2','Starte mit n = 2, füge Schritte hinzu und sieh, wie sich das Intervall von 1 < √2 < 2 aus verengt','n = 2で段階を増やして、区間が 1 < √2 < 2 からどう狭まるか見よう'],
    'n = 10으로 바꾸어 3 < √10 < 4에서 시작하는 것을 확인해 보세요':['Change to n = 10 and check that it starts from 3 < √10 < 4','Cambia a n = 10 y comprueba que empieza en 3 < √10 < 4','Passez à n = 10 et vérifiez que cela commence à 3 < √10 < 4','Wechsle zu n = 10 und prüfe, dass es bei 3 < √10 < 4 beginnt','n = 10に変えて、3 < √10 < 4 から始まるのを確かめよう'],
    'n = 16처럼 제곱수이면 구간이 어떻게 되나요?':['What happens to the interval if n is a square number like 16?','¿Qué pasa con el intervalo si n es un cuadrado perfecto como 16?','Que devient l\'intervalle si n est un carré parfait comme 16 ?','Was passiert mit dem Intervall, wenn n eine Quadratzahl wie 16 ist?','n = 16のように平方数だと、区間はどうなる？'],
    '어림하기':['Estimation','Estimación','Estimation','Abschätzung','見積もり'],
    '어림할 수 n':['Number to estimate n','Número a estimar n','Nombre à estimer n','Zu schätzende Zahl n','見積もる数 n'],
    '근삿값':['Approximation','Aproximación','Valeur approchée','Näherungswert','近似値'],
    '구간의 길이 = {0}':['Interval length = {0}','Longitud del intervalo = {0}','Longueur de l\'intervalle = {0}','Intervalllänge = {0}','区間の長さ = {0}'],
    '작은 쪽':['Smaller side','Lado menor','Côté inférieur','Kleinere Seite','小さい方'],
    '가운데 값 m':['Middle value m','Valor medio m','Valeur médiane m','Mittlerer Wert m','真ん中の値 m'],
    'm²과 n':['m² and n','m² y n','m² et n','m² und n','m²とn'],
    '구간':['Interval','Intervalo','Intervalle','Intervall','区間'],
    '구간의 길이':['Interval length','Longitud del intervalo','Longueur de l\'intervalle','Intervalllänge','区間の長さ'],
    '근삿값 (구간의 가운데)':['Approximation (middle of the interval)','Aproximación (mitad del intervalo)','Valeur approchée (milieu de l\'intervalle)','Näherungswert (Intervallmitte)','近似値（区間の真ん中）'],
    '실제 √':['Actual √','√ real','√ réelle','Tatsächliche √','実際の√'],
    '곱셈 공식의 넓이 모델':['Area Models of Multiplication Formulas','Modelos de área de las fórmulas de multiplicación','Modèles d\'aires des formules de multiplication','Flächenmodelle der Multiplikationsformeln','乗法公式の面積モデル'],
    '(a + b)², (a − b)², (a + b)(a − b)를 넓이로 확인하기':['Check (a + b)², (a − b)², (a + b)(a − b) with areas','Comprobar (a + b)², (a − b)², (a + b)(a − b) con áreas','Vérifier (a + b)², (a − b)², (a + b)(a − b) avec des aires','(a + b)², (a − b)², (a + b)(a − b) mit Flächen überprüfen','(a + b)²、(a − b)²、(a + b)(a − b)を面積で確かめる'],
    '한 변이 a + b인 정사각형을 a², ab, ab, b² 네 조각으로 나누면 (a + b)² = a² + 2ab + b²임을 알 수 있어요. 한 변이 a인 정사각형에서 폭이 b인 띠 두 개를 빼면 겹친 b²를 두 번 뺀 셈이라서 다시 더해 (a − b)² = a² − 2ab + b²이에요. 한 변이 a인 정사각형에서 한 변이 b인 정사각형을 잘라 낸 ㄴ자 모양을 재배열하면 가로 a + b, 세로 a − b인 직사각형이 되어 (a + b)(a − b) = a² − b²이에요.':['Split a square of side a + b into four pieces a², ab, ab, b² and you see (a + b)² = a² + 2ab + b². From a square of side a, removing two strips of width b subtracts the overlapping b² twice, so we add it back: (a − b)² = a² − 2ab + b². Cutting a square of side b out of a square of side a leaves an L shape; rearranging it gives a rectangle of width a + b and height a − b, so (a + b)(a − b) = a² − b².','Si divides un cuadrado de lado a + b en cuatro piezas a², ab, ab, b², ves que (a + b)² = a² + 2ab + b². A un cuadrado de lado a se le quitan dos franjas de ancho b; el b² solapado se resta dos veces, así que se vuelve a sumar: (a − b)² = a² − 2ab + b². Si recortas un cuadrado de lado b de un cuadrado de lado a queda una forma de L; reordenándola sale un rectángulo de ancho a + b y alto a − b, así (a + b)(a − b) = a² − b².','Si l\'on découpe un carré de côté a + b en quatre morceaux a², ab, ab, b², on voit que (a + b)² = a² + 2ab + b². Dans un carré de côté a, on retire deux bandes de largeur b ; le b² commun est soustrait deux fois, donc on le rajoute : (a − b)² = a² − 2ab + b². Si l\'on découpe un carré de côté b dans un carré de côté a, il reste une forme en L ; en la réarrangeant on obtient un rectangle de largeur a + b et de hauteur a − b, donc (a + b)(a − b) = a² − b².','Teilt man ein Quadrat der Seite a + b in vier Stücke a², ab, ab, b², sieht man (a + b)² = a² + 2ab + b². Vom Quadrat der Seite a zieht man zwei Streifen der Breite b ab; das überlappende b² wird zweimal abgezogen, also addiert man es wieder: (a − b)² = a² − 2ab + b². Schneidet man aus einem Quadrat der Seite a ein Quadrat der Seite b heraus, bleibt eine L-Form; umgelegt ergibt sie ein Rechteck der Breite a + b und Höhe a − b, also (a + b)(a − b) = a² − b².','1辺が a + b の正方形を a²、ab、ab、b² の4つに分けると、(a + b)² = a² + 2ab + b² だと分かります。1辺がaの正方形から幅bの帯を2本引くと、重なったb²を2回引くことになるので、もう一度足して (a − b)² = a² − 2ab + b² です。1辺がaの正方形から1辺がbの正方形を切り取ったL字形を並べ替えると、横 a + b、縦 a − b の長方形になり、(a + b)(a − b) = a² − b² です。'],
    'a = 5, b = 2일 때 (a + b)² = 49를 네 조각의 넓이 25 + 10 + 10 + 4로 확인해 보세요':['With a = 5, b = 2, check (a + b)² = 49 as the four areas 25 + 10 + 10 + 4','Con a = 5, b = 2, comprueba (a + b)² = 49 como las cuatro áreas 25 + 10 + 10 + 4','Avec a = 5, b = 2, vérifiez (a + b)² = 49 comme les quatre aires 25 + 10 + 10 + 4','Prüfe mit a = 5, b = 2: (a + b)² = 49 als die vier Flächen 25 + 10 + 10 + 4','a = 5、b = 2のとき、(a + b)² = 49を4つの面積 25 + 10 + 10 + 4 で確かめよう'],
    'b를 키우며 (a − b)² 의 파란 정사각형이 어떻게 작아지는지 보세요':['Increase b and watch the blue square of (a − b)² shrink','Aumenta b y observa cómo se encoge el cuadrado azul de (a − b)²','Augmentez b et regardez le carré bleu de (a − b)² rétrécir','Vergrößere b und sieh, wie das blaue Quadrat von (a − b)² schrumpft','bを大きくして、(a − b)²の青い正方形が小さくなるのを見よう'],
    '합차 공식에서 ㄴ자 모양과 직사각형의 넓이가 같은지 확인해 보세요':['In the difference-of-squares formula, check that the L shape and the rectangle have the same area','En la fórmula de la diferencia de cuadrados, comprueba que la forma de L y el rectángulo tienen la misma área','Dans la formule de la différence de carrés, vérifiez que la forme en L et le rectangle ont la même aire','Prüfe bei der dritten binomischen Formel, dass L-Form und Rechteck gleiche Fläche haben','和と差の公式で、L字形と長方形の面積が等しいか確かめよう'],
    '공식':['Formula','Fórmula','Formule','Formel','公式'],
    '왼쪽의 값':['Value on the left','Valor de la izquierda','Valeur de gauche','Wert links','左辺の値'],
    '오른쪽의 값':['Value on the right','Valor de la derecha','Valeur de droite','Wert rechts','右辺の値'],
    '두 값이':['The two values','Los dos valores','Les deux valeurs','Die beiden Werte','2つの値'],
    '같아요':['are equal','son iguales','sont égales','sind gleich','等しいです'],
    '타일로 인수분해하기':['Factoring with Tiles','Factorizar con fichas','Factoriser avec des tuiles','Mit Plättchen faktorisieren','タイルで因数分解する'],
    'x² 타일 1개, x 타일 p개, 1 타일 q개로 직사각형 만들기':['Make a rectangle from one x² tile, p x tiles and q 1 tiles','Formar un rectángulo con 1 ficha x², p fichas x y q fichas 1','Former un rectangle avec 1 tuile x², p tuiles x et q tuiles 1','Aus einem x²-Plättchen, p x-Plättchen und q 1-Plättchen ein Rechteck bauen','x²タイル1個、xタイルp個、1タイルq個で長方形を作る'],
    '한 변이 x인 정사각형 타일(x²) 1개, 가로 1 세로 x인 직사각형 타일(x) p개, 한 변이 1인 정사각형 타일(1) q개를 모아 직사각형을 만들어 볼게요. 가로가 x + m, 세로가 x + n인 직사각형이면 넓이는 (x + m)(x + n) = x² + (m + n)x + mn이에요. 그래서 x² + px + q를 인수분해하려면 합이 p이고 곱이 q인 두 수 m, n을 찾으면 돼요. 그런 두 수가 없으면 직사각형이 만들어지지 않아요.':['Let\'s gather one square tile of side x (x²), p rectangular tiles of width 1 and height x (x), and q square tiles of side 1 (1) and make a rectangle. A rectangle of width x + m and height x + n has area (x + m)(x + n) = x² + (m + n)x + mn. So to factor x² + px + q we need two numbers m, n whose sum is p and product is q. If no such numbers exist, no rectangle can be made.','Juntemos 1 ficha cuadrada de lado x (x²), p fichas rectangulares de ancho 1 y alto x (x) y q fichas cuadradas de lado 1 (1) y formemos un rectángulo. Un rectángulo de ancho x + m y alto x + n tiene área (x + m)(x + n) = x² + (m + n)x + mn. Así, para factorizar x² + px + q hay que hallar dos números m, n con suma p y producto q. Si no existen, no se puede formar el rectángulo.','Rassemblons 1 tuile carrée de côté x (x²), p tuiles rectangulaires de largeur 1 et de hauteur x (x) et q tuiles carrées de côté 1 (1) pour former un rectangle. Un rectangle de largeur x + m et de hauteur x + n a pour aire (x + m)(x + n) = x² + (m + n)x + mn. Donc, pour factoriser x² + px + q, il faut deux nombres m, n de somme p et de produit q. S\'il n\'en existe pas, on ne peut pas former le rectangle.','Nimm ein quadratisches Plättchen der Seite x (x²), p rechteckige Plättchen der Breite 1 und Höhe x (x) und q quadratische Plättchen der Seite 1 (1) und bilde ein Rechteck. Ein Rechteck der Breite x + m und Höhe x + n hat die Fläche (x + m)(x + n) = x² + (m + n)x + mn. Um x² + px + q zu faktorisieren, braucht man also zwei Zahlen m, n mit Summe p und Produkt q. Gibt es sie nicht, lässt sich kein Rechteck bilden.','1辺がxの正方形タイル（x²）1個、横1縦xの長方形タイル（x）p個、1辺が1の正方形タイル（1）q個を集めて長方形を作ってみましょう。横が x + m、縦が x + n の長方形なら面積は (x + m)(x + n) = x² + (m + n)x + mn です。だから x² + px + q を因数分解するには、和がp、積がqになる2つの数m、nを見つければよいのです。そんな2つの数がなければ長方形は作れません。'],
    'p = 5, q = 6일 때 합이 5, 곱이 6인 두 수를 찾아 직사각형이 되는지 확인해 보세요':['With p = 5, q = 6, find two numbers with sum 5 and product 6 and check that a rectangle forms','Con p = 5, q = 6, halla dos números con suma 5 y producto 6 y comprueba que se forma un rectángulo','Avec p = 5, q = 6, trouvez deux nombres de somme 5 et de produit 6 et vérifiez qu\'un rectangle se forme','Finde mit p = 5, q = 6 zwei Zahlen mit Summe 5 und Produkt 6 und prüfe, dass ein Rechteck entsteht','p = 5、q = 6のとき、和が5・積が6の2つの数を見つけて長方形になるか確かめよう'],
    'p = 4, q = 4이면 어떤 모양의 직사각형이 되나요?':['With p = 4, q = 4, what shape of rectangle do you get?','Con p = 4, q = 4, ¿qué forma de rectángulo sale?','Avec p = 4, q = 4, quelle forme de rectangle obtient-on ?','Welche Form hat das Rechteck bei p = 4, q = 4?','p = 4、q = 4だと、どんな形の長方形になる？'],
    'p = 5, q = 7처럼 직사각형이 안 되는 경우를 찾아보세요':['Find cases like p = 5, q = 7 where no rectangle can be made','Busca casos como p = 5, q = 7 en que no se puede formar un rectángulo','Trouvez des cas comme p = 5, q = 7 où aucun rectangle n\'est possible','Finde Fälle wie p = 5, q = 7, in denen sich kein Rechteck bilden lässt','p = 5、q = 7のように長方形が作れない場合を探そう'],
    'x 타일의 수 p':['Number of x tiles p','Número de fichas x p','Nombre de tuiles x p','Anzahl der x-Plättchen p','xタイルの数 p'],
    '1 타일의 수 q':['Number of 1 tiles q','Número de fichas 1 q','Nombre de tuiles 1 q','Anzahl der 1-Plättchen q','1タイルの数 q'],
    'x의 길이 (그림)':['Length of x (in the picture)','Longitud de x (en la figura)','Longueur de x (sur la figure)','Länge von x (in der Abbildung)','xの長さ（図）'],
    '작은 수 m':['Smaller number m','Número menor m','Plus petit nombre m','Kleinere Zahl m','小さい数 m'],
    '큰 수 n':['Larger number n','Número mayor n','Plus grand nombre n','Größere Zahl n','大きい数 n'],
    '직사각형이 만들어지지 않아요':['No rectangle can be made','No se puede formar un rectángulo','Aucun rectangle ne peut être formé','Es lässt sich kein Rechteck bilden','長方形が作れません'],
    '합이 {0}이고 곱이 {1}인 두 정수가 없어요':['There are no two integers with sum {0} and product {1}','No hay dos enteros con suma {0} y producto {1}','Il n\'existe pas deux entiers de somme {0} et de produit {1}','Es gibt keine zwei ganzen Zahlen mit Summe {0} und Produkt {1}','和が{0}で積が{1}になる2つの整数がありません'],
    '곱이 {0}인 두 수와 그 합':['The pairs of numbers with product {0} and their sums','Los pares de números con producto {0} y sus sumas','Les paires de nombres de produit {0} et leurs sommes','Die Zahlenpaare mit Produkt {0} und ihre Summen','積が{0}になる2つの数とその和'],
    '합이 p, 곱이 q인 두 수':['Two numbers with sum p and product q','Dos números con suma p y producto q','Deux nombres de somme p et de produit q','Zwei Zahlen mit Summe p und Produkt q','和がp、積がqになる2つの数'],
    '인수분해':['Factoring','Factorización','Factorisation','Faktorisierung','因数分解'],
    '정수 범위에서 안 돼요':['Not possible over the integers','No es posible con enteros','Impossible avec des entiers','Mit ganzen Zahlen nicht möglich','整数の範囲ではできません'],
    '합 m + n':['Sum m + n','Suma m + n','Somme m + n','Summe m + n','和 m + n'],
    '곱 m × n':['Product m × n','Producto m × n','Produit m × n','Produkt m × n','積 m × n'],
    '곱이 q인 두 수의 쌍':['Pairs of numbers with product q','Pares de números con producto q','Paires de nombres de produit q','Zahlenpaare mit Produkt q','積がqになる2つの数の組'],
    '원주각과 중심각':['Inscribed Angle and Central Angle','Ángulo inscrito y ángulo central','Angle inscrit et angle au centre','Umfangswinkel und Mittelpunktswinkel','円周角と中心角'],
    '한 호에 대한 원주각의 크기는 중심각의 반':['An inscribed angle on an arc is half the central angle','Un ángulo inscrito en un arco es la mitad del ángulo central','Un angle inscrit sur un arc vaut la moitié de l\'angle au centre','Ein Umfangswinkel über einem Bogen ist halb so groß wie der Mittelpunktswinkel','1つの弧に対する円周角の大きさは中心角の半分'],
    '원 위의 두 점 A, B가 만드는 호 AB에 대한 중심각은 ∠AOB이고, 호 AB가 아닌 쪽의 원 위의 점 P에서 본 ∠APB를 원주각이라고 해요. 원주각의 크기는 중심각의 크기의 반이에요. 그래서 같은 호에 대한 원주각은 P의 위치에 관계없이 모두 같아요. 호가 반원이면 중심각이 180°이므로 원주각은 90°예요(지름에 대한 원주각).':['For arc AB made by two points A, B on a circle, the central angle is ∠AOB, and the angle ∠APB seen from a point P on the circle on the side other than arc AB is called the inscribed angle. The inscribed angle is half the central angle. So inscribed angles on the same arc are all equal, wherever P is. If the arc is a semicircle the central angle is 180°, so the inscribed angle is 90° (the angle in a semicircle).','Para el arco AB formado por dos puntos A, B de una circunferencia, el ángulo central es ∠AOB, y el ángulo ∠APB visto desde un punto P de la circunferencia en el lado distinto del arco AB se llama ángulo inscrito. El ángulo inscrito es la mitad del ángulo central. Por eso los ángulos inscritos en el mismo arco son todos iguales, esté donde esté P. Si el arco es una semicircunferencia, el ángulo central es 180° y el inscrito es 90° (ángulo en una semicircunferencia).','Pour l\'arc AB formé par deux points A, B d\'un cercle, l\'angle au centre est ∠AOB, et l\'angle ∠APB vu depuis un point P du cercle situé de l\'autre côté que l\'arc AB s\'appelle l\'angle inscrit. L\'angle inscrit vaut la moitié de l\'angle au centre. Ainsi les angles inscrits sur le même arc sont tous égaux, où que soit P. Si l\'arc est un demi-cercle, l\'angle au centre vaut 180°, donc l\'angle inscrit vaut 90° (angle inscrit dans un demi-cercle).','Für den Bogen AB zweier Punkte A, B auf einem Kreis ist ∠AOB der Mittelpunktswinkel, und der Winkel ∠APB von einem Punkt P des Kreises auf der anderen Seite als Bogen AB heißt Umfangswinkel. Der Umfangswinkel ist halb so groß wie der Mittelpunktswinkel. Daher sind Umfangswinkel über demselben Bogen alle gleich, egal wo P liegt. Ist der Bogen ein Halbkreis, beträgt der Mittelpunktswinkel 180°, der Umfangswinkel also 90° (Satz des Thales).','円周上の2点A、Bがつくる弧ABに対する中心角は∠AOBで、弧ABでない側の円周上の点Pから見た∠APBを円周角といいます。円周角の大きさは中心角の半分です。だから同じ弧に対する円周角は、Pの位置に関係なくすべて等しいです。弧が半円なら中心角が180°なので、円周角は90°です（直径に対する円周角）。'],
    '점 P를 호 위에서 움직여도 ∠APB가 변하지 않는지 확인해 보세요':['Move point P along the arc and check that ∠APB does not change','Mueve el punto P sobre el arco y comprueba que ∠APB no cambia','Déplacez le point P sur l\'arc et vérifiez que ∠APB ne change pas','Bewege Punkt P auf dem Bogen und prüfe, dass sich ∠APB nicht ändert','点Pを弧の上で動かしても∠APBが変わらないか確かめよう'],
    '중심각을 180°로 하면 원주각이 몇 도가 되나요?':['If the central angle is 180°, how many degrees is the inscribed angle?','Si el ángulo central es 180°, ¿cuántos grados mide el ángulo inscrito?','Si l\'angle au centre vaut 180°, combien de degrés mesure l\'angle inscrit ?','Wie viel Grad hat der Umfangswinkel, wenn der Mittelpunktswinkel 180° beträgt?','中心角を180°にすると、円周角は何度になる？'],
    '점 Q를 켜고 ∠APB와 ∠AQB를 비교해 보세요':['Turn on point Q and compare ∠APB and ∠AQB','Activa el punto Q y compara ∠APB y ∠AQB','Activez le point Q et comparez ∠APB et ∠AQB','Schalte Punkt Q ein und vergleiche ∠APB und ∠AQB','点Qをオンにして、∠APBと∠AQBを比べよう'],
    '그래프를 눌러 끌면 점 P가 원 위에서 움직여요.':['Press and drag on the graph to move point P around the circle.','Pulsa y arrastra sobre el gráfico para mover el punto P por la circunferencia.','Appuyez et faites glisser sur le graphique pour déplacer le point P sur le cercle.','Drücke und ziehe auf dem Diagramm, um Punkt P auf dem Kreis zu bewegen.','グラフを押してドラッグすると、点Pが円周上を動きます。'],
    '호 AB의 중심각':['Central angle of arc AB','Ángulo central del arco AB','Angle au centre de l\'arc AB','Mittelpunktswinkel des Bogens AB','弧ABの中心角'],
    '점 P의 위치':['Position of point P','Posición del punto P','Position du point P','Lage von Punkt P','点Pの位置'],
    '점 Q도 보기':['Also show point Q','Mostrar también el punto Q','Afficher aussi le point Q','Auch Punkt Q anzeigen','点Qも表示'],
    '점 Q의 위치':['Position of point Q','Posición del punto Q','Position du point Q','Lage von Punkt Q','点Qの位置'],
    '중심각':['Central angle','Ángulo central','Angle au centre','Mittelpunktswinkel','中心角'],
    '중심각 {0}°':['Central angle {0}°','Ángulo central {0}°','Angle au centre {0}°','Mittelpunktswinkel {0}°','中心角 {0}°'],
    '원주각 ∠APB':['Inscribed angle ∠APB','Ángulo inscrito ∠APB','Angle inscrit ∠APB','Umfangswinkel ∠APB','円周角 ∠APB'],
    '원주각 ∠AQB':['Inscribed angle ∠AQB','Ángulo inscrito ∠AQB','Angle inscrit ∠AQB','Umfangswinkel ∠AQB','円周角 ∠AQB'],
    '중심각의 반':['Half the central angle','La mitad del ángulo central','La moitié de l\'angle au centre','Halber Mittelpunktswinkel','中心角の半分'],
    '지름에 대한 원주각':['Inscribed angle on a diameter','Ángulo inscrito sobre un diámetro','Angle inscrit sur un diamètre','Umfangswinkel über dem Durchmesser','直径に対する円周角'],
    '90° (반원)':['90° (semicircle)','90° (semicircunferencia)','90° (demi-cercle)','90° (Halbkreis)','90°（半円）'],
    '원의 접선의 성질':['Properties of Tangents to a Circle','Propiedades de las tangentes a una circunferencia','Propriétés des tangentes à un cercle','Eigenschaften von Kreistangenten','円の接線の性質'],
    '접선은 접점을 지나는 반지름에 수직이고, 한 점에서 그은 두 접선의 길이는 같아요':['A tangent is perpendicular to the radius at the point of tangency, and the two tangents from one point have equal length','La tangente es perpendicular al radio en el punto de tangencia, y las dos tangentes desde un punto tienen la misma longitud','La tangente est perpendiculaire au rayon au point de contact, et les deux tangentes issues d\'un point ont la même longueur','Die Tangente steht senkrecht auf dem Radius im Berührpunkt, und die beiden Tangenten von einem Punkt aus sind gleich lang','接線は接点を通る半径に垂直で、1点から引いた2本の接線の長さは等しい'],
    '원 밖의 한 점 P에서 원에 접선을 그으면 접점이 두 개 생기고, 이 두 접점 T₁, T₂에 대해 몇 가지 성질이 있어요. 접선은 접점을 지나는 반지름과 수직이라서 ∠OTP = 90°예요. 직각삼각형 OTP에서 피타고라스 정리로 접선의 길이는 PT = √(OP² − r²)이고, 두 접선의 길이 PT₁ = PT₂예요. 또 사각형 OT₁PT₂의 두 각이 90°이므로 ∠T₁OT₂ + ∠T₁PT₂ = 180°예요.':['Drawing tangents to a circle from a point P outside it gives two points of tangency T₁, T₂, with several properties. A tangent is perpendicular to the radius through the point of tangency, so ∠OTP = 90°. In the right triangle OTP, the Pythagorean theorem gives the tangent length PT = √(OP² − r²), and the two tangent lengths are equal: PT₁ = PT₂. Also, since two angles of quadrilateral OT₁PT₂ are 90°, ∠T₁OT₂ + ∠T₁PT₂ = 180°.','Al trazar tangentes a una circunferencia desde un punto P exterior hay dos puntos de tangencia T₁, T₂, con varias propiedades. La tangente es perpendicular al radio que pasa por el punto de tangencia, así que ∠OTP = 90°. En el triángulo rectángulo OTP, el teorema de Pitágoras da la longitud de la tangente PT = √(OP² − r²), y las dos longitudes son iguales: PT₁ = PT₂. Además, como dos ángulos del cuadrilátero OT₁PT₂ miden 90°, ∠T₁OT₂ + ∠T₁PT₂ = 180°.','En menant des tangentes à un cercle depuis un point P extérieur, on obtient deux points de contact T₁, T₂, avec plusieurs propriétés. La tangente est perpendiculaire au rayon passant par le point de contact, donc ∠OTP = 90°. Dans le triangle rectangle OTP, le théorème de Pythagore donne la longueur de la tangente PT = √(OP² − r²), et les deux longueurs sont égales : PT₁ = PT₂. De plus, comme deux angles du quadrilatère OT₁PT₂ valent 90°, ∠T₁OT₂ + ∠T₁PT₂ = 180°.','Zieht man von einem Punkt P außerhalb Tangenten an einen Kreis, erhält man zwei Berührpunkte T₁, T₂ mit mehreren Eigenschaften. Die Tangente steht senkrecht auf dem Radius durch den Berührpunkt, also ∠OTP = 90°. Im rechtwinkligen Dreieck OTP liefert der Satz des Pythagoras die Tangentenlänge PT = √(OP² − r²), und beide Tangentenlängen sind gleich: PT₁ = PT₂. Da im Viereck OT₁PT₂ zwei Winkel 90° betragen, gilt außerdem ∠T₁OT₂ + ∠T₁PT₂ = 180°.','円の外の1点Pから円に接線を引くと接点が2つでき、この2つの接点T₁、T₂についていくつかの性質があります。接線は接点を通る半径に垂直なので ∠OTP = 90° です。直角三角形OTPでピタゴラスの定理により、接線の長さは PT = √(OP² − r²) で、2本の接線の長さは等しく PT₁ = PT₂ です。また四角形OT₁PT₂の2つの角が90°なので ∠T₁OT₂ + ∠T₁PT₂ = 180° です。'],
    '점 P를 원에서 멀리 보내며 접선의 길이와 ∠T₁PT₂가 어떻게 변하는지 보세요':['Send point P far from the circle and see how the tangent length and ∠T₁PT₂ change','Aleja el punto P de la circunferencia y observa cómo cambian la longitud de la tangente y ∠T₁PT₂','Éloignez le point P du cercle et voyez comment la longueur de la tangente et ∠T₁PT₂ changent','Schicke Punkt P weit vom Kreis weg und sieh, wie sich Tangentenlänge und ∠T₁PT₂ ändern','点Pを円から遠ざけて、接線の長さと∠T₁PT₂がどう変わるか見よう'],
    'OP = 5, r = 3일 때 접선의 길이가 4인지 피타고라스 정리로 확인해 보세요':['With OP = 5, r = 3, check with the Pythagorean theorem that the tangent length is 4','Con OP = 5, r = 3, comprueba con el teorema de Pitágoras que la longitud de la tangente es 4','Avec OP = 5, r = 3, vérifiez avec le théorème de Pythagore que la longueur de la tangente est 4','Prüfe mit OP = 5, r = 3 per Satz des Pythagoras, dass die Tangentenlänge 4 ist','OP = 5、r = 3のとき、接線の長さが4かピタゴラスの定理で確かめよう'],
    '점 P가 원에 가까워지면 두 접점은 어떻게 되나요?':['What happens to the two points of tangency as P gets close to the circle?','¿Qué pasa con los dos puntos de tangencia cuando P se acerca a la circunferencia?','Que deviennent les deux points de contact quand P s\'approche du cercle ?','Was passiert mit den beiden Berührpunkten, wenn P dem Kreis nahekommt?','点Pが円に近づくと、2つの接点はどうなる？'],
    '그래프를 눌러 끌면 점 P가 움직여요.':['Press and drag on the graph to move point P.','Pulsa y arrastra sobre el gráfico para mover el punto P.','Appuyez et faites glisser sur le graphique pour déplacer le point P.','Drücke und ziehe auf dem Diagramm, um Punkt P zu bewegen.','グラフを押してドラッグすると、点Pが動きます。'],
    '원의 반지름 r':['Radius of the circle r','Radio de la circunferencia r','Rayon du cercle r','Radius des Kreises r','円の半径 r'],
    '중심에서 P까지의 거리 OP':['Distance from the center to P, OP','Distancia del centro a P, OP','Distance du centre à P, OP','Entfernung vom Mittelpunkt zu P, OP','中心からPまでの距離 OP'],
    'P의 방향':['Direction of P','Dirección de P','Direction de P','Richtung von P','Pの方向'],
    '반지름 r':['Radius r','Radio r','Rayon r','Radius r','半径 r'],
    '접선의 길이':['Tangent length','Longitud de la tangente','Longueur de la tangente','Tangentenlänge','接線の長さ'],
    '점 P가 원 안이나 원 위에 있어요':['Point P is inside or on the circle','El punto P está dentro o sobre la circunferencia','Le point P est à l\'intérieur ou sur le cercle','Punkt P liegt innerhalb oder auf dem Kreis','点Pが円の内側か円の上にあります'],
    'OP를 반지름보다 크게 해 주세요':['Make OP larger than the radius','Haz OP mayor que el radio','Rendez OP supérieur au rayon','Mache OP größer als den Radius','OPを半径より大きくしてください'],
    '접선의 길이 PT₁':['Tangent length PT₁','Longitud de la tangente PT₁','Longueur de la tangente PT₁','Tangentenlänge PT₁','接線の長さ PT₁'],
    '접선의 길이 PT₂':['Tangent length PT₂','Longitud de la tangente PT₂','Longueur de la tangente PT₂','Tangentenlänge PT₂','接線の長さ PT₂'],
    '두 각의 합 ∠T₁OT₂ + ∠T₁PT₂':['Sum of two angles ∠T₁OT₂ + ∠T₁PT₂','Suma de dos ángulos ∠T₁OT₂ + ∠T₁PT₂','Somme de deux angles ∠T₁OT₂ + ∠T₁PT₂','Summe zweier Winkel ∠T₁OT₂ + ∠T₁PT₂','2つの角の和 ∠T₁OT₂ + ∠T₁PT₂'],
    '점 P를 원 밖에 놓아 주세요':['Place point P outside the circle','Coloca el punto P fuera de la circunferencia','Placez le point P à l\'extérieur du cercle','Setze Punkt P außerhalb des Kreises','点Pを円の外に置いてください'],
    '아르키메데스의 원주율':['Archimedes\' Pi','El número pi de Arquímedes','Le pi d\'Archimède','Das Pi des Archimedes','アルキメデスの円周率'],
    '원에 내접·외접하는 정다각형으로 π의 범위 좁히기':['Narrow the range of π with regular polygons inscribed in and circumscribed about a circle','Acotar el rango de π con polígonos regulares inscritos y circunscritos a una circunferencia','Resserrer l\'encadrement de π avec des polygones réguliers inscrits et circonscrits à un cercle','Den Bereich von π mit einbeschriebenen und umbeschriebenen regelmäßigen Vielecken eingrenzen','円に内接・外接する正多角形でπの範囲を狭める'],
    '지름이 2인 원에 내접하는 정n각형의 둘레는 2n sin(π/n)이고, 외접하는 정n각형의 둘레는 2n tan(π/n)이에요. 원의 둘레는 이 둘 사이에 있으므로 (지름이 2일 때) n sin(π/n) < π < n tan(π/n)이에요. 약 2200년 전 아르키메데스는 정96각형까지 계산해서 3 + 10/71 < π < 3 + 1/7, 즉 3.1408 < π < 3.1429임을 알아냈어요. 변의 수가 늘어날수록 두 다각형이 원에 가까워지고 범위가 좁아져요.':['In a circle of diameter 2, the perimeter of the inscribed regular n-gon is 2n sin(π/n) and that of the circumscribed regular n-gon is 2n tan(π/n). The circle\'s circumference lies between them, so (for diameter 2) n sin(π/n) < π < n tan(π/n). About 2200 years ago Archimedes calculated up to the regular 96-gon and found 3 + 10/71 < π < 3 + 1/7, that is 3.1408 < π < 3.1429. As the number of sides grows, both polygons come closer to the circle and the range narrows.','En una circunferencia de diámetro 2, el perímetro del n-ágono regular inscrito es 2n sin(π/n) y el del circunscrito es 2n tan(π/n). La longitud de la circunferencia está entre ambos, así que (con diámetro 2) n sin(π/n) < π < n tan(π/n). Hace unos 2200 años Arquímedes calculó hasta el polígono regular de 96 lados y halló 3 + 10/71 < π < 3 + 1/7, es decir 3,1408 < π < 3,1429. Al aumentar el número de lados, ambos polígonos se acercan a la circunferencia y el rango se estrecha.','Dans un cercle de diamètre 2, le périmètre du n-gone régulier inscrit vaut 2n sin(π/n) et celui du circonscrit vaut 2n tan(π/n). La circonférence du cercle se situe entre les deux, donc (pour un diamètre 2) n sin(π/n) < π < n tan(π/n). Il y a environ 2200 ans, Archimède a calculé jusqu\'au polygone régulier à 96 côtés et a trouvé 3 + 10/71 < π < 3 + 1/7, soit 3,1408 < π < 3,1429. Quand le nombre de côtés augmente, les deux polygones se rapprochent du cercle et l\'encadrement se resserre.','In einem Kreis mit Durchmesser 2 hat das einbeschriebene regelmäßige n-Eck den Umfang 2n sin(π/n) und das umbeschriebene 2n tan(π/n). Der Kreisumfang liegt dazwischen, also gilt (bei Durchmesser 2) n sin(π/n) < π < n tan(π/n). Vor etwa 2200 Jahren rechnete Archimedes bis zum regelmäßigen 96-Eck und fand 3 + 10/71 < π < 3 + 1/7, also 3,1408 < π < 3,1429. Mit wachsender Seitenzahl nähern sich beide Vielecke dem Kreis und der Bereich wird enger.','直径が2の円に内接する正n角形の周の長さは 2n sin(π/n)、外接する正n角形の周の長さは 2n tan(π/n) です。円周はこの2つの間にあるので、（直径が2のとき）n sin(π/n) < π < n tan(π/n) です。約2200年前、アルキメデスは正96角形まで計算して 3 + 10/71 < π < 3 + 1/7、つまり 3.1408 < π < 3.1429 を見つけました。辺の数が増えるほど2つの多角形が円に近づき、範囲が狭まります。'],
    '변의 수를 6, 12, 24, 48, 96으로 늘리며 π의 아랫값과 윗값이 어떻게 변하는지 보세요':['Raise the number of sides through 6, 12, 24, 48, 96 and see how the lower and upper values of π change','Aumenta el número de lados a 6, 12, 24, 48, 96 y observa cómo cambian los valores inferior y superior de π','Faites passer le nombre de côtés par 6, 12, 24, 48, 96 et voyez comment les valeurs inférieure et supérieure de π évoluent','Erhöhe die Seitenzahl auf 6, 12, 24, 48, 96 und sieh, wie sich untere und obere Schranke von π ändern','辺の数を6, 12, 24, 48, 96と増やして、πの下の値と上の値がどう変わるか見よう'],
    '정육각형일 때 내접 다각형의 둘레와 지름의 비는 얼마인가요?':['For a regular hexagon, what is the ratio of the inscribed polygon\'s perimeter to the diameter?','Para un hexágono regular, ¿cuál es la razón entre el perímetro del polígono inscrito y el diámetro?','Pour un hexagone régulier, quel est le rapport du périmètre du polygone inscrit au diamètre ?','Wie groß ist beim regelmäßigen Sechseck das Verhältnis von Umfang des einbeschriebenen Vielecks zum Durchmesser?','正六角形のとき、内接する多角形の周の長さと直径の比はいくつ？'],
    '변의 수를 두 배로 할 때마다 범위의 폭이 약 몇 분의 1이 되나요?':['Each time the number of sides doubles, the width of the range becomes about what fraction?','Cada vez que se duplica el número de lados, ¿a qué fracción se reduce aproximadamente la amplitud del rango?','Chaque fois que le nombre de côtés double, à quelle fraction l\'amplitude de l\'encadrement est-elle réduite environ ?','Auf etwa welchen Bruchteil sinkt die Breite des Bereichs, wenn sich die Seitenzahl verdoppelt?','辺の数を2倍にするたびに、範囲の幅は約何分の1になる？'],
    '정다각형의 변의 수 n':['Number of sides of the regular polygon n','Número de lados del polígono regular n','Nombre de côtés du polygone régulier n','Seitenzahl des regelmäßigen Vielecks n','正多角形の辺の数 n'],
    'π의 아랫값':['Lower value of π','Valor inferior de π','Valeur inférieure de π','Untere Schranke von π','πの下の値'],
    'π의 윗값':['Upper value of π','Valor superior de π','Valeur supérieure de π','Obere Schranke von π','πの上の値'],
    '정{0}각형':['Regular {0}-gon','{0}-ágono regular','{0}-gone régulier','Regelmäßiges {0}-Eck','正{0}角形'],
    '내접 정n각형 (둘레 ÷ 지름)':['Inscribed regular n-gon (perimeter ÷ diameter)','n-ágono regular inscrito (perímetro ÷ diámetro)','n-gone régulier inscrit (périmètre ÷ diamètre)','Einbeschriebenes regelmäßiges n-Eck (Umfang ÷ Durchmesser)','内接する正n角形（周の長さ ÷ 直径）'],
    '외접 정n각형 (둘레 ÷ 지름)':['Circumscribed regular n-gon (perimeter ÷ diameter)','n-ágono regular circunscrito (perímetro ÷ diámetro)','n-gone régulier circonscrit (périmètre ÷ diamètre)','Umbeschriebenes regelmäßiges n-Eck (Umfang ÷ Durchmesser)','外接する正n角形（周の長さ ÷ 直径）'],
    'π는 둘 사이에 있어요':['π lies between the two','π está entre los dos','π se situe entre les deux','π liegt dazwischen','πは2つの間にあります'],
    '범위의 폭':['Width of the range','Amplitud del rango','Amplitude de l\'encadrement','Breite des Bereichs','範囲の幅'],
    '두 값의 평균':['Average of the two values','Promedio de los dos valores','Moyenne des deux valeurs','Mittelwert der beiden Werte','2つの値の平均'],
    '속력 (m/분)':['Speed (m/min)','Velocidad (m/min)','Vitesse (m/min)','Geschwindigkeit (m/min)','速さ(m/分)'],
  });
  if(window.LABCUR&&LABCUR.link){
    LABCUR.link('좌표평면과 그래프',['m1_pts','m1_story']);
    LABCUR.link('자료의 정리와 해석',['m1_stem','m1_relfreq']);
    LABCUR.link('소인수분해',['m1_sieve','m1_ftree']);
    LABCUR.link('정수와 유리수',['m1_numline','m1_frac']);
    LABCUR.link('문자와 식, 일차방정식',['m1_balance','m1_match']);
    LABCUR.link('기본 도형과 작도',['m1_angles','m1_construct','m1_tri']);
    LABCUR.link('일차함수와 그래프',['m1_water']);
    LABCUR.link('일차함수와 일차방정식',['m1_lineq']);
    LABCUR.link('피타고라스 정리',['m1_pythproof','m1_triples']);
    LABCUR.link('경우의 수와 확률',['m1_dice2','m1_mcpi']);
    LABCUR.link('연립일차방정식과 일차부등식',['m1_sys','m1_chicken','m1_ineq']);
    LABCUR.link('도형의 닮음',['m1_similar','m1_thales','m1_parallel']);
    LABCUR.link('이차함수와 그래프',['m1_ball','m1_fence']);
    LABCUR.link('이차방정식',['m1_square','m1_vieta']);
    LABCUR.link('삼각비',['m1_height','m1_special']);
    LABCUR.link('대푯값과 산포도',['m1_dev','m1_box']);
    LABCUR.link('제곱근과 실수',['m1_sqrtarea','m1_spiral','m1_approx']);
    LABCUR.link('다항식의 곱셈과 인수분해',['m1_areamul','m1_xtiles']);
    LABCUR.link('원의 성질',['m1_inscribed','m1_tangent','m1_archpi']);
  }
})();
