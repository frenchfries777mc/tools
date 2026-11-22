/* Fry Lab middle school science templates, set 3 (중3 과학): experiments that follow the sections of a real textbook.
   Source: the table of contents of 천재교육 (Vivasam) 「중학교 과학 3」 (2022 revised curriculum), read from the publisher's PDF. Only the section titles
   were used; the simulations are Fry Lab's own simplified models (not copied from the book), so the numbers are typical textbook-level values.
   Same object format as experiments.js / tpl-s1.js (fields are listed at the top of app.js). Ids start with s3_.
   Korean text goes through T / F; translations are not written yet (see i18n-todo.md), unknown strings show in Korean. */
(function(){
'use strict';
var H=LAB.H, C=H.C, TH=H.TH, fmt=H.fmt, T=FFT.T, F=FFT.F, PI=Math.PI, TAU=PI*2, MINUS='−', CAT='sci';

function num(v,d){ if(v==null||typeof v!=='number'||!isFinite(v)) return '—'; var s=fmt(v,d==null?2:d); if(s.indexOf('.')>=0) s=s.replace(/0+$/,'').replace(/\.$/,''); return s.replace('-',MINUS); }
function R4(W,Hh,m){ m=m==null?6:m; return {l:m,t:m,w:Math.max(10,W-2*m),h:Math.max(10,Hh-2*m)}; }
function tag(g,s,x,y,c,al,sz){ H.text(g,T(s),x,y,{size:sz||12.5,w:700,c:c||TH.text,al:al||'left',bg:TH.light?'rgba(255,255,255,.8)':'rgba(11,13,19,.75)'}); }
function lab(g,s,x,y,c,al,sz){ H.text(g,T(s),x,y,{size:sz||12,w:600,c:c||TH.dim,al:al||'left'}); }
function P(id,l,min,max,step,val,u,pre,more){ var q={id:id,l:l,min:min,max:max,step:step,val:val}; if(u) q.u=u; if(pre) q.pre=pre; if(more) for(var k in more) q[k]=more[k]; return q; }
function SG(id,l,opts,val,show){ var q={id:id,l:l,type:'seg',opts:opts,val:val}; if(show) q.show=show; return q; }
function CK(id,l,val){ return {id:id,l:l,type:'check',val:val}; }
function RD(l,v,u,cls){ return [l,v,u||'',cls||'']; }
function pane(g,r,x0,x1,y0,y1,o){ o=o||{}; var v=H.view(r,x0,x1,y0,y1); H.axes(g,v,{box:true,xl:o.xl?T(o.xl):'',yl:o.yl?T(o.yl):'',xs:o.xs,ys:o.ys,xf:o.xf,yf:o.yf,noVGrid:o.nv}); return v; }
function curve(g,v,f,col,w,dash,xa,xb){ xa=xa==null?v.x0:xa; xb=xb==null?v.x1:xb; var n=Math.ceil(v.w/2), pts=[]; g.save(); g.beginPath(); g.rect(v.l,v.t,v.w,v.h); g.clip();
  for(var i=0;i<=n;i++){ var x=xa+(xb-xa)*i/n, y=f(x); if(isFinite(y)) pts.push([v.sx(x),v.sy(y)]); else { H.line(g,pts,col,w,dash); pts=[]; } }
  H.line(g,pts,col,w,dash); g.restore(); }
function rgb(a){ return 'rgb('+Math.round(a[0])+','+Math.round(a[1])+','+Math.round(a[2])+')'; }
function mixc(a,b,t){ t=H.clamp(t,0,1); return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]; }
function wide(W,Hh){ return W>=Hh*1.15&&W>=620; }

/* ===================== 1. 기체 반응에서 기체의 부피비 (화학 반응의 규칙) ===================== */
(function(){
/* same temperature and pressure: volumes react in small whole-number ratios (Gay-Lussac) = the coefficients of the equation */
var RX={h2o:{eq:'2H₂ + O₂ → 2H₂O',a:'수소',b:'산소',c:'수증기',k:[2,1,2],ca:'#4f9dff',cb:'#ff6b6b',cc:'#38d1e0'},
        nh3:{eq:'N₂ + 3H₂ → 2NH₃',a:'질소',b:'수소',c:'암모니아',k:[1,3,2],ca:'#a78bfa',cb:'#4f9dff',cc:'#3fe08f'},
        hcl:{eq:'H₂ + Cl₂ → 2HCl',a:'수소',b:'염소',c:'염화 수소',k:[1,1,2],ca:'#4f9dff',cb:'#c8e04a',cc:'#ffc93c'}};
function calc(p){ var r=RX[p.rx], k=r.k, x=Math.min(p.A/k[0],p.B/k[1]); return {x:x,ra:x*k[0],rb:x*k[1],pc:x*k[2],la:p.A-x*k[0],lb:p.B-x*k[1],lim:(p.A/k[0]<p.B/k[1]-1e-9)?'A':(p.B/k[1]<p.A/k[0]-1e-9?'B':'-')}; }
function bar(g,x,y0,w,vals,cols,sc){ var y=y0; for(var i=0;i<vals.length;i++){ var h=vals[i]*sc; if(h<=0) continue; g.fillStyle=cols[i]; g.globalAlpha=0.85; g.fillRect(x,y-h,w,h); g.globalAlpha=1; g.strokeStyle=TH.stage; g.lineWidth=1; g.strokeRect(x+.5,y-h+.5,w-1,h-1); y-=h; } }
var E={id:'s3_gasvol', cat:CAT, icon:'🧪', name:'기체 반응에서 기체의 부피비', desc:'같은 온도와 압력에서 기체끼리 반응할 때 부피가 간단한 정수비를 이루는 모습',
  info:'같은 온도와 압력에서 기체가 반응할 때, 반응하는 기체와 생성되는 기체의 부피 사이에는 간단한 정수비가 성립해요(기체 반응 법칙). 이 비는 화학 반응식의 계수비와 같아요. 이것은 같은 온도와 압력에서 기체의 부피가 기체 분자의 수에 비례하기 때문이에요(아보가드로 법칙). 예를 들어 수소 2 mL와 산소 1 mL가 반응하면 수증기 2 mL가 생겨요. 한쪽 기체가 먼저 다 쓰이면 남은 기체는 반응하지 않고 남아요. 수증기는 100 ℃ 이상의 기체 상태일 때의 부피예요.',
  tries:['수소 40 mL와 산소 20 mL를 반응시키면 수증기는 몇 mL가 생기나요?','수소 40 mL와 산소 40 mL를 반응시키면 어느 기체가 남고, 얼마나 남나요?','질소와 수소가 반응할 때 부피비가 1 : 3 : 2인 까닭을 반응식으로 설명해 보세요','수소 30 mL에 염소를 0부터 60 mL까지 늘려 가며 기록하고, 생성되는 기체의 부피가 어떻게 달라지는지 그래프로 보세요'],
  hint:'반응을 고르고 두 기체의 부피를 바꿔 보세요. 반응 전과 후의 부피를 막대로 비교해요.', live:true, noPlay:true,
  params:[SG('rx','반응',[['h2o','수소 + 산소'],['nh3','질소 + 수소'],['hcl','수소 + 염소']],'h2o'),P('A','첫째 반응물의 부피',0,100,5,40,'mL',[[20,'20'],[40,'40'],[60,'60']]),P('B','둘째 반응물의 부피',0,100,5,20,'mL',[[20,'20'],[40,'40'],[60,'60']])],
  cols:[{k:'A',l:'첫째 반응물',u:'mL',d:0},{k:'B',l:'둘째 반응물',u:'mL',d:0},{k:'C',l:'생성된 기체',u:'mL',d:0},{k:'left',l:'남은 기체',u:'mL',d:0}], gx:'B', gy:'C', join:true,
  reset:function(){},
  draw:function(g,W,Hh){ var p=this.p, r=R4(W,Hh,10), R=RX[p.rx], k=R.k, c=calc(p), mx=Math.max(100,p.A+p.B), sc=(r.h-120)/mx, base=r.t+r.h-44, bw=Math.min(70,(r.w-120)/5);
    H.text(g,T(R.eq),r.l+r.w/2,r.t+22,{al:'center',size:18,w:800,c:C.fry});
    H.text(g,T('부피비')+'  '+T(R.a)+' : '+T(R.b)+' : '+T(R.c)+' = '+k.join(' : '),r.l+r.w/2,r.t+46,{al:'center',size:13,w:700,c:TH.dim});
    var x1=r.l+r.w*0.14, x2=r.l+r.w*0.6;
    H.seg(g,r.l+8,base,r.l+r.w-8,base,TH.dim,1.5);
    bar(g,x1,base,bw,[p.A,p.B],[R.ca,R.cb],sc); bar(g,x2,base,bw,[c.la,c.lb,c.pc],[R.ca,R.cb,R.cc],sc);
    lab(g,'반응 전',x1+bw/2,base+16,TH.text,'center',13); lab(g,'반응 후',x2+bw/2,base+16,TH.text,'center',13);
    H.arrow(g,x1+bw+Math.min(110,r.w*0.2),base-22,x2-30,base-22,C.fry,3,10);
    var y=base; [[p.A,R.ca,R.a],[p.B,R.cb,R.b]].forEach(function(q){ if(q[0]>0){ lab(g,T(q[2])+' '+num(q[0],0)+' mL',x1+bw+10,y-q[0]*sc/2,q[1],'left',12); y-=q[0]*sc; } });
    y=base; [[c.la,R.ca,R.a],[c.lb,R.cb,R.b],[c.pc,R.cc,R.c]].forEach(function(q){ if(q[0]>0){ lab(g,T(q[2])+' '+num(q[0],0)+' mL',x2+bw+10,y-q[0]*sc/2,q[1],'left',12); y-=q[0]*sc; } });
  },
  read:function(){ var p=this.p, R=RX[p.rx], c=calc(p), left=c.la>1e-9?[R.a,c.la]:(c.lb>1e-9?[R.b,c.lb]:null);
    return [RD('반응 부피비',R.k.join(' : '),'','th'),RD(F('{0}의 부피',T(R.c)),num(c.pc,0),'mL','hl'),RD(F('반응한 {0}',T(R.a)),num(c.ra,0),'mL'),RD(F('반응한 {0}',T(R.b)),num(c.rb,0),'mL'),RD('먼저 다 쓰이는 기체',c.lim==='A'?T(R.a):(c.lim==='B'?T(R.b):T('둘 다')),''),RD('남은 기체',left?T(left[0])+' '+num(left[1],0):T('없음'),left?'mL':'')]; },
  record:function(){ var p=this.p, c=calc(p); return {A:p.A,B:p.B,C:c.pc,left:c.la+c.lb}; },
  ai:function(){ var p=this.p, R=RX[p.rx], c=calc(p); return 'Gas reaction law at constant T and P: '+R.eq+' (volume ratio '+R.k.join(':')+'). Reactant volumes '+p.A+' mL and '+p.B+' mL give product '+fmt(c.pc,0)+' mL, leftover '+fmt(c.la+c.lb,0)+' mL.'; }
};
LAB.add(E);
})();

/* ===================== 2. 열에너지가 출입하는 화학 반응 (화학 반응의 규칙) ===================== */
(function(){
var SUB={naoh:{n:'수산화 나트륨',M:40,dH:-44.5},cacl:{n:'염화 칼슘',M:111,dH:-82.8},nh4:{n:'질산 암모늄',M:80,dH:25.7}}, CW=4.18, T0=20, S={t:0,tr:[]};
function dTmax(p){ var s=SUB[p.sub], n=p.m/s.M; return -n*s.dH*1000/((p.w+p.m)*CW); }
function temp(p,t){ return T0+dTmax(p)*(1-Math.exp(-t/6))*Math.exp(-t/500); }
var E={id:'s3_heatrxn', cat:CAT, icon:'🌡️', name:'열에너지가 출입하는 반응', desc:'물에 녹을 때 열을 내놓거나 흡수하는 물질의 온도 변화',
  info:'화학 반응이나 용해가 일어날 때 열에너지가 출입해요. 열을 방출해 주변의 온도가 올라가는 반응을 발열 반응, 열을 흡수해 주변의 온도가 내려가는 반응을 흡열 반응이라고 해요. 수산화 나트륨이나 염화 칼슘이 물에 녹으면 발열(손난로, 제설제), 질산 암모늄이 녹으면 흡열(냉찜질 팩)이에요. 온도 변화는 ΔT = (출입한 열) ÷ (용액의 질량 × 비열)로 계산해요. 이 실험은 물 100 g에 녹일 때의 몰당 용해열(약 값)로 계산한 간단한 모델이에요.',
  tries:['수산화 나트륨 5 g을 물 100 g에 녹이면 온도는 몇 ℃ 올라가나요?','같은 질량에서 질산 암모늄은 온도를 어떻게 바꾸나요? 발열일까요, 흡열일까요?','물의 양을 두 배로 하면 온도 변화는 어떻게 되나요? 그 까닭은 무엇인가요?','녹이는 양을 0 g부터 20 g까지 바꾸며 기록하고, 온도 변화와 질량 사이의 관계를 그래프로 보세요'],
  hint:'물질을 고르고 재생 단추를 눌러 보세요. 물질이 녹으면서 온도가 변하는 모습을 보세요.', speed:true, autoRun:false,
  params:[SG('sub','녹이는 물질',[['naoh','수산화 나트륨'],['cacl','염화 칼슘'],['nh4','질산 암모늄']],'naoh'),P('m','물질의 질량',0,20,0.5,5,'g',[[2,'2'],[5,'5'],[10,'10']],{d:1}),P('w','물의 질량',50,200,10,100,'g',[[50,'50'],[100,'100'],[200,'200']])],
  cols:[{k:'m',l:'물질의 질량',u:'g',d:1},{k:'dt',l:'온도 변화',u:'℃',d:1},{k:'Tf',l:'최종 온도',u:'℃',d:1}], gx:'m', gy:'dt', fit:true, join:false,
  fitHint:function(m,b,x,y){ if(x==='m'&&y==='dt') return F('질량이 1 g 늘 때마다 온도 변화가 {0} ℃씩 커져요 (물질의 양이 많을수록 출입하는 열이 많아요)',fmt(m,2)); },
  reset:function(){ S.t=0; S.tr=[]; },
  change:function(k){ if(k==='sub'||k==='m'||k==='w') this.reset(); },
  step:function(dt){ var p=this.p; S.t+=dt; if(S.t>120) S.t=120; S.tr.push([S.t,temp(p,S.t)]); if(S.tr.length>1200) S.tr.shift(); return S.t>=120?'done':undefined; },
  draw:function(g,W,Hh){ var p=this.p, r=R4(W,Hh,10), wd=wide(W,Hh), left=wd?{l:r.l,t:r.t,w:r.w*0.42,h:r.h}:{l:r.l,t:r.t,w:r.w,h:r.h*0.5}, right=wd?{l:r.l+r.w*0.42+36,t:r.t+16,w:r.w*0.58-52,h:r.h-70}:{l:r.l+46,t:r.t+r.h*0.5+14,w:r.w-62,h:r.h*0.5-64};
    var Tn=temp(p,S.t), dT=Tn-T0, hot=dT>0.05, cold=dT<-0.05, cx=left.l+left.w*0.45, by=left.t+left.h-26, bw=Math.min(left.w*0.5,150), bh=Math.min(left.h*0.55,170), top=by-bh;
    g.fillStyle=rgb(mixc(mixc([120,190,235],[255,110,60],dT/20),[70,90,200],-dT/20)); g.globalAlpha=0.65; g.fillRect(cx-bw/2+3,top+bh*0.28,bw-6,bh*0.72-3); g.globalAlpha=1;
    g.strokeStyle=TH.dim; g.lineWidth=3; g.beginPath(); g.moveTo(cx-bw/2,top); g.lineTo(cx-bw/2,by); g.lineTo(cx+bw/2,by); g.lineTo(cx+bw/2,top); g.stroke();
    var tx=cx+bw/2+26, th=bh*0.95, f=H.clamp((Tn+5)/70,0.02,1); g.strokeStyle=TH.dim; g.lineWidth=2; H.rrect(g,tx-5,by-th,10,th,5); g.stroke(); g.fillStyle=hot?C.red:cold?C.blu:C.grn; g.fillRect(tx-3,by-th*f,6,th*f); H.dot(g,tx,by+2,8,hot?C.red:cold?C.blu:C.grn);
    H.text(g,num(Tn,1)+' ℃',cx,top-24,{al:'center',size:24,w:800,c:hot?C.red:cold?C.cyan:C.fry});
    if(hot||cold){ for(var i=-1;i<=1;i++){ var ax=cx+i*bw*0.32, ay=top+bh*0.6; if(hot) H.arrow(g,ax,ay,ax,top-6,C.red,3,8); else H.arrow(g,ax,top-6,ax,ay,C.cyan,3,8); } }
    H.text(g,T(hot?'발열 반응: 주변으로 열 방출':cold?'흡열 반응: 주변에서 열 흡수':'온도 변화 없음'),cx,by+16,{al:'center',size:13,w:700,c:hot?C.red:cold?C.cyan:TH.dim});
    var dm=dTmax(p), lo=Math.min(-2,Math.min(T0,T0+dm)-5), hi=Math.max(T0+2,Math.max(T0,T0+dm)+5), v=pane(g,right,0,120,lo,hi,{xl:'시간 (s)',yl:'온도 (℃)',xs:20});
    H.seg(g,v.sx(0),v.sy(T0),v.sx(120),v.sy(T0),C.grn,1.2,[4,4]); curve(g,v,function(t){ return temp(p,t); },TH.dim,1.5,[3,4]);
    if(S.tr.length>1) H.line(g,S.tr.map(function(q){ return [v.sx(q[0]),v.sy(q[1])]; }),hot?C.red:cold?C.cyan:C.fry,3); H.dot(g,v.sx(S.t),v.sy(Tn),6,C.or,TH.stage); },
  read:function(){ var p=this.p, s=SUB[p.sub], dm=dTmax(p), q=p.m/s.M*s.dH, Tn=temp(p,S.t); return [RD('반응의 종류',T(dm>0.05?'발열 반응':dm<-0.05?'흡열 반응':'열 출입 없음'),'','wide hl'),RD('지금 온도',num(Tn,1),'℃'),RD('최종 온도 (이론)',num(T0+dm,1),'℃'),RD('온도 변화 ΔT',num(dm,1),'℃','th'),RD('출입한 열',num(Math.abs(q),2),'kJ'),RD('녹인 물질의 양',num(p.m/s.M,3),'mol')]; },
  record:function(){ var p=this.p, dm=dTmax(p); return {m:p.m, dt:dm, Tf:T0+dm}; },
  ai:function(){ var p=this.p, s=SUB[p.sub], dm=dTmax(p); return 'Dissolving heat model: '+p.m+' g of '+p.sub+' (molar mass '+s.M+', enthalpy of solution '+s.dH+' kJ/mol) in '+p.w+' g of water starting at '+T0+' C gives a temperature change of '+fmt(dm,1)+' C ('+(dm>0?'exothermic':'endothermic')+').'; }
};
LAB.add(E);
})();

/* ===================== 3. 위도와 깊이에 따른 해수의 수온과 염분 (수권과 해수의 순환) ===================== */
(function(){
var TD=2.5;
function Ts(lat){ var c=Math.cos(lat*PI/180); return 29*Math.pow(Math.max(0,c),1.5)-1.8; }
function Ss(lat){ return 33.2+2.5*Math.exp(-Math.pow((lat-24)/26,2)); }
function zmix(lat){ return 100+0.5*lat; }
function tz(lat,z){ var ts=Ts(lat), zm=zmix(lat); return z<=zm?ts:TD+(ts-TD)*Math.exp(-(z-zm)/160); }
var E={id:'s3_seatemp', cat:CAT, icon:'🌊', name:'위도와 깊이에 따른 해수의 수온과 염분', desc:'위도에 따라 바다 표층의 수온과 염분이 어떻게 다르고, 깊이에 따라 수온이 어떻게 층을 이루는지',
  info:'바다는 깊이에 따라 혼합층, 수온 약층, 심해층으로 나뉘어요. 혼합층은 햇빛을 받아 따뜻하고 바람의 영향으로 섞여 수온이 거의 일정해요. 수온 약층은 깊어질수록 수온이 급격히 낮아지는 층이고, 심해층은 수온이 낮고 거의 일정해요. 저위도는 표층 수온이 높아 수온 약층이 뚜렷하지만, 고위도는 표층 수온이 낮아 수온 약층이 거의 나타나지 않아요. 표층 염분은 증발량이 강수량보다 많은 중위도 바다에서 높고, 강수량이 많은 적도와 빙하가 녹는 극지방에서 낮아요. 이 그래프는 교과서 수준의 모식(단순화) 모델이에요.',
  tries:['위도 0°와 60°에서 수온이 깊이에 따라 어떻게 다른지 비교해 보세요','수온 약층이 거의 사라지는 위도는 대략 어디인가요? 그 까닭은 무엇일까요?','표층 염분이 가장 높은 위도는 어디인가요? 증발량과 강수량으로 설명해 보세요','깊이 1000 m에서 수온은 위도가 달라져도 거의 같아요. 왜 그럴까요?'],
  hint:'위도를 바꿔 보세요. 왼쪽은 깊이에 따른 수온, 오른쪽은 위도에 따른 표층 염분이에요.', live:true, noPlay:true,
  params:[P('lat','위도',0,80,5,0,'°',[[0,'0'],[30,'30'],[60,'60']]),P('z','깊이',0,1000,10,0,'m',[[0,'0'],[200,'200'],[1000,'1000']])],
  cols:[{k:'lat',l:'위도',u:'°',d:0},{k:'ts',l:'표층 수온',u:'℃',d:1},{k:'tz',l:'그 깊이의 수온',u:'℃',d:1},{k:'ss',l:'표층 염분',u:'‰',d:1}], gx:'lat', gy:'ts', join:true,
  reset:function(){},
  draw:function(g,W,Hh){ var p=this.p, r=R4(W,Hh,10), wd=wide(W,Hh), a=wd?{l:r.l+46,t:r.t+26,w:r.w*0.5-60,h:r.h-82}:{l:r.l+46,t:r.t+22,w:r.w-62,h:r.h*0.52-70}, b=wd?{l:r.l+r.w*0.5+44,t:r.t+26,w:r.w*0.5-60,h:r.h-82}:{l:r.l+46,t:r.t+r.h*0.52+24,w:r.w-62,h:r.h*0.48-80};
    var v=pane(g,a,-2,30,-1000,0,{xl:'수온 (℃)',yl:'깊이 (m)',xs:5,ys:200,yf:function(y){ return String(Math.round(-y)); }}), ts=Ts(p.lat), zm=zmix(p.lat), strong=ts-TD>=4;
    if(strong){ g.save(); g.beginPath(); g.rect(v.l,v.t,v.w,v.h); g.clip(); var zt=zm+160*Math.log((ts-TD)/0.5);
      [[0,zm,'혼합층','rgba(255,138,61,.16)'],[zm,Math.min(1000,zt),'수온 약층','rgba(167,139,250,.16)'],[Math.min(1000,zt),1000,'심해층','rgba(79,157,255,.14)']].forEach(function(q){ if(q[1]-q[0]<6) return; g.fillStyle=q[3]; g.fillRect(v.l,v.sy(-q[0]),v.w,v.sy(-q[1])-v.sy(-q[0])); lab(g,q[2],v.l+v.w-8,v.sy(-(q[0]+q[1])/2),TH.text,'right',12); }); g.restore(); }
    else lab(g,'수온 약층이 거의 없어요',v.l+v.w-8,v.t+24,TH.dim,'right',12);
    curve(g,v,function(x){ return -1; },'rgba(0,0,0,0)',1);
    var pts=[]; for(var z=0;z<=1000;z+=10) pts.push([v.sx(tz(p.lat,z)),v.sy(-z)]); H.line(g,pts,C.red,3); H.seg(g,v.l,v.sy(-p.z),v.l+v.w,v.sy(-p.z),C.fry,1.2,[4,4]); H.dot(g,v.sx(tz(p.lat,p.z)),v.sy(-p.z),6.5,C.or,TH.stage);
    var rt=v.sx(tz(p.lat,p.z))>v.l+v.w*0.6; tag(g,num(tz(p.lat,p.z),1)+' ℃',v.sx(tz(p.lat,p.z))+(rt?-10:10),v.sy(-p.z)-14,C.or,rt?'right':'left');
    var w=pane(g,b,0,80,30,37,{xl:'위도 (°)',yl:'표층 염분 (‰)',xs:20,ys:1}); curve(g,w,Ss,C.cyan,3); H.seg(g,w.sx(p.lat),w.t,w.sx(p.lat),w.t+w.h,C.fry,1.2,[4,4]); H.dot(g,w.sx(p.lat),w.sy(Ss(p.lat)),6.5,C.or,TH.stage);
    tag(g,num(Ss(p.lat),1)+' ‰',w.sx(p.lat)+10,w.sy(Ss(p.lat))-16,C.cyan); },
  read:function(){ var p=this.p, ts=Ts(p.lat); return [RD('표층 수온',num(ts,1),'℃','hl'),RD(F('깊이 {0} m의 수온',p.z),num(tz(p.lat,p.z),1),'℃'),RD('깊이 1000 m의 수온',num(tz(p.lat,1000),1),'℃'),RD('혼합층의 두께',ts-TD>=4?num(zmix(p.lat),0):'—',ts-TD>=4?'m':''),RD('표층 염분',num(Ss(p.lat),1),'‰','th'),RD('수온 약층',ts-TD>=4?'뚜렷해요':'거의 없어요','')]; },
  record:function(){ var p=this.p; return {lat:p.lat, ts:Ts(p.lat), tz:tz(p.lat,p.z), ss:Ss(p.lat)}; },
  ai:function(){ var p=this.p; return 'Simplified ocean model: at latitude '+p.lat+' deg the surface temperature is '+fmt(Ts(p.lat),1)+' C, at depth '+p.z+' m '+fmt(tz(p.lat,p.z),1)+' C, surface salinity '+fmt(Ss(p.lat),1)+' per mille. Mixed layer / thermocline / deep layer; thermocline is weak at high latitude.'; }
};
LAB.add(E);
})();

/* ===================== 4. 에너지를 운반하는 대기 대순환 (날씨와 기후 변화) ===================== */
(function(){
var CELLS=[[0,30,1,'해들리 순환','#ff8a3d'],[30,60,-1,'페렐 순환','#3fe08f'],[60,90,1,'극순환','#4f9dff']];
function belt(lat){ if(lat<15) return ['적도 저압대','저압','상승 기류가 강해 비가 많이 와요']; if(lat<45) return ['아열대 고압대','고압','하강 기류가 있어 맑고 건조해요 (사막)']; if(lat<75) return ['한대 전선대','저압','따뜻한 공기와 찬 공기가 만나 흐리고 비가 와요']; return ['극 고압대','고압','차갑고 건조한 공기가 내려와요']; }
function wind(lat,rot){ if(!rot) return ['북풍 (극 → 적도)','북']; if(lat<30) return ['무역풍','북동풍']; if(lat<60) return ['편서풍','남서풍']; return ['극동풍','북동풍']; }
var E={id:'s3_circ', cat:CAT, icon:'🌀', name:'대기 대순환', desc:'위도별 바람과 기압대가 3개의 순환 세포로 만들어지는 모습',
  info:'적도 지방은 태양 에너지를 많이 받고 극 지방은 적게 받아 에너지 차이가 생겨요. 대기는 이 에너지를 저위도에서 고위도로 운반해요. 지구가 자전하지 않는다면 적도에서 상승한 공기가 극에서 내려오는 하나의 순환이 생겨요. 지구가 자전하면 전향력 때문에 순환이 위도 0°~30°(해들리 순환), 30°~60°(페렐 순환), 60°~90°(극순환)의 세 개 세포로 나뉘어요. 지표 부근에서는 무역풍(북동풍), 편서풍(남서풍), 극동풍(북동풍)이 불고 기압대는 적도 저압대, 아열대 고압대, 한대 전선대(저압대), 극 고압대가 번갈아 나타나요.',
  tries:['지구 자전을 끄면 순환 세포가 몇 개가 되나요? 지표 바람은 어떻게 부나요?','위도 30° 근처에 사막이 많은 까닭을 순환 세포의 공기 흐름으로 설명해 보세요','우리나라(위도 약 37°)에서 지표 바람은 어느 방향에서 부나요? 순환 세포는 무엇인가요?','위도 0°, 30°, 60°, 90°에서 상승 기류와 하강 기류 중 무엇이 있나요?'],
  hint:'위도를 바꾸고 지구 자전을 켜고 꺼 보세요. 화살표가 공기의 흐름이에요.', live:true, noPlay:true,
  params:[P('lat','위도 (북반구)',0,90,5,37,'°',[[0,'0'],[30,'30'],[60,'60'],[90,'90']]),CK('rot','지구 자전 (전향력)',true)],
  cols:[{k:'lat',l:'위도',u:'°',d:0}], gx:'lat', gy:'lat',
  reset:function(){},
  draw:function(g,W,Hh){ var p=this.p, r=R4(W,Hh,10), a={l:r.l+34,t:r.t+54,w:r.w-68,h:r.h-130}, X=function(l){ return a.l+l/90*a.w; }, base=a.t+a.h, sy=a.h;
    g.fillStyle=TH.light?'rgba(80,130,200,.08)':'rgba(79,157,255,.07)'; g.fillRect(a.l,a.t,a.w,a.h); g.fillStyle=TH.light?'rgba(60,150,90,.35)':'rgba(63,224,143,.3)'; g.fillRect(a.l,base,a.w,8);
    for(var l=0;l<=90;l+=30){ lab(g,l+'°',X(l),base+24,TH.dim,'center',12); H.seg(g,X(l),a.t,X(l),base,TH.grid,1,[3,5]); } lab(g,'적도',a.l,base+42,TH.dim,'left',12); lab(g,'극',a.l+a.w,base+42,TH.dim,'right',12);
    var cells=p.rot?CELLS:[[0,90,1,'하나의 순환','#ff8a3d']];
    cells.forEach(function(c){ var x0=X(c[0]), x1=X(c[1]), cx=(x0+x1)/2, rx=(x1-x0)/2-8, ry=sy*0.4, cy=a.t+sy*0.46, dir=c[2]; g.strokeStyle=c[4]; g.lineWidth=3; g.globalAlpha=0.9; g.beginPath(); g.ellipse(cx,cy,rx,ry,0,0,TAU); g.stroke(); g.globalAlpha=1;
      var tt=cy-ry, bt=cy+ry; if(dir>0){ H.arrow(g,cx-rx*0.15,tt,cx+rx*0.3,tt,c[4],3,11); H.arrow(g,cx+rx*0.15,bt,cx-rx*0.3,bt,c[4],3,11); } else { H.arrow(g,cx+rx*0.15,tt,cx-rx*0.3,tt,c[4],3,11); H.arrow(g,cx-rx*0.15,bt,cx+rx*0.3,bt,c[4],3,11); }
      var up=dir>0?[cx-rx,cx+rx]:[cx+rx,cx-rx]; H.arrow(g,up[0],cy+26,up[0],cy-26,c[4],3,11); H.arrow(g,up[1],cy-26,up[1],cy+26,c[4],3,11);
      H.text(g,T(c[3]),cx,cy,{al:'center',size:14,w:800,c:c[4]}); });
    var ws=p.rot?[[0,30,'무역풍'],[30,60,'편서풍'],[60,90,'극동풍']]:[[0,90,'북풍']];
    ws.forEach(function(q){ var x0=X(q[0])+14, x1=X(q[1])-14, w2=(q[2]==='편서풍'); if(w2) H.arrow(g,x0,base-14,x1,base-14,C.fry,3,10); else H.arrow(g,x1,base-14,x0,base-14,C.fry,3,10); tag(g,q[2],(x0+x1)/2,base-34,C.fry,'center',12); });
    var mx=X(p.lat); H.seg(g,mx,a.t-6,mx,base+8,C.fry,2,[5,4]); H.dot(g,mx,a.t-10,6,C.fry); tag(g,F('위도 {0}°',p.lat),mx,a.t-26,C.fry,'center',12);
    var sym=p.rot?[[0,'저'],[30,'고'],[60,'저'],[90,'고']]:[[0,'저'],[90,'고']]; sym.forEach(function(s){ H.text(g,T(s[1]==='저'?'L':'H'),X(s[0]),a.t+14,{al:'center',size:16,w:800,c:s[1]==='저'?C.red:C.blu}); }); },
  read:function(){ var p=this.p, b=belt(p.lat), w=wind(p.lat,p.rot); return [RD('지표 바람',w[0],'','hl wide'),RD('바람이 불어오는 방향',w[1],''),RD('가까운 기압대',p.rot?b[0]:(p.lat<45?'적도 저압대':'극 고압대'),'','th'),RD('공기의 움직임',p.rot?b[2]:(p.lat<45?'상승 기류가 강해요':'하강 기류가 있어요'),'','wide'),RD('순환 세포',p.rot?(p.lat<30?'해들리 순환':p.lat<60?'페렐 순환':'극순환'):'하나의 순환','')]; },
  record:function(){ return {lat:this.p.lat}; },
  ai:function(){ var p=this.p, w=wind(p.lat,p.rot); return 'General circulation: latitude '+p.lat+' N, rotation '+(p.rot?'on (3 cells: Hadley, Ferrel, Polar)':'off (single cell)')+'. Surface wind: '+w[0]+' ('+w[1]+').'; }
};
LAB.add(E);
})();

/* ===================== 5. 자극과 반응 시간 (자극과 반응) ===================== */
(function(){
var G=9.8;
function parts(p){ if(p.kind==='reflex') return [['무릎뼈 아래 자극 → 척수',0.0143],['척수에서 연결 (뇌를 거치지 않음)',0.002],['근육의 수축',0.025]];
  var att=p.att/100; return [['눈의 시각 처리',0.05],['대뇌의 판단 (집중할수록 빨라요)',0.06+0.08*(1-att)],['신경 신호 전달 (약 1.1 m)',0.016],['근육의 수축',0.03]]; }
function tot(p){ if(p.kind==='ruler') return Math.sqrt(2*p.d/100/G); return parts(p).reduce(function(s,q){ return s+q[1]; },0); }
function dist(p){ return p.kind==='ruler'?p.d:0.5*G*Math.pow(tot(p),2)*100; }
var E={id:'s3_reaction', cat:CAT, icon:'📏', name:'자극에서 반응까지 걸리는 시간', desc:'자를 떨어뜨려 반응 시간을 재고, 의식적 반응과 무조건 반사의 경로를 비교',
  info:'자극이 감각 기관에서 감각 신경, 연합 신경(뇌와 척수), 운동 신경을 거쳐 반응 기관에 전달되면 반응이 일어나요. 자를 떨어뜨리고 잡을 때(의식적 반응)는 신호가 대뇌까지 갔다 오기 때문에 약 0.2초가 걸려요. 무릎 반사 같은 무조건 반사는 신호가 척수에서 바로 연결되어 대뇌의 판단을 거치지 않으므로 훨씬 빨라요(약 0.04초). 자가 떨어진 거리 d를 재면 d = ½ g t²에서 반응 시간 t = √(2d/g)를 구할 수 있어요. 값은 교과서에 나오는 대략적인 크기를 바탕으로 한 모델이에요.',
  tries:['자를 잡은 위치가 15 cm였다면 반응 시간은 얼마인가요?','집중도를 100%와 0%로 바꾸면 반응 시간이 어떻게 달라지나요? 이유는 무엇일까요?','무조건 반사로 바꾸면 반응 시간이 몇 배 짧아지나요? 어느 부분을 거치지 않아서일까요?','직접 재 본 값을 [자로 재기]에 넣고 반응 시간을 구해 보세요'],
  hint:'반응 방법을 고르고 집중도를 바꿔 보세요. 자는 반응하는 동안 얼마나 떨어질까요?', live:true, noPlay:true,
  params:[SG('kind','반응 방법',[['catch','자 잡기 (의식적 반응)'],['reflex','무릎 반사 (무조건 반사)'],['ruler','자로 재기 (직접 입력)']],'catch'),P('att','집중도',0,100,5,80,'%',[[20,'20'],[80,'80'],[100,'100']],{show:function(p){ return p.kind==='catch'; }}),P('d','자가 떨어진 거리 d',1,40,0.5,15,'cm',[[10,'10'],[15,'15'],[25,'25']],{d:1,show:function(p){ return p.kind==='ruler'; }})],
  cols:[{k:'att',l:'집중도',u:'%',d:0},{k:'d',l:'자가 떨어진 거리',u:'cm',d:1},{k:'t',l:'반응 시간',u:'s',d:3}], gx:'d', gy:'t', fit:false, join:false,
  reset:function(){},
  draw:function(g,W,Hh){ var p=this.p, r=R4(W,Hh,10), wd=wide(W,Hh), rl={l:r.l+8,t:r.t+10,w:wd?r.w*0.22:r.w*0.22,h:r.h-28}, rest=wd?{l:r.l+r.w*0.27,t:r.t+10,w:r.w*0.73-8,h:r.h-20}:{l:r.l+r.w*0.27,t:r.t+10,w:r.w*0.73-8,h:r.h-20};
    var sc=rl.h/46, d=dist(p), x=rl.l+rl.w*0.3, y0=rl.t+4; g.fillStyle=TH.light?'rgba(255,201,60,.35)':'rgba(255,201,60,.2)'; g.fillRect(x,y0,rl.w*0.45,40*sc); g.strokeStyle=TH.dim; g.lineWidth=1.5; g.strokeRect(x,y0,rl.w*0.45,40*sc);
    for(var c=0;c<=40;c++){ var yy=y0+c*sc, len=c%10===0?rl.w*0.3:c%5===0?rl.w*0.2:rl.w*0.1; H.seg(g,x,yy,x+len,yy,TH.dim,1); if(c%10===0) lab(g,c+'',x+rl.w*0.33,yy,TH.dim,'left',11); }
    var ys=y0+Math.min(40,d)*sc; H.seg(g,x-8,ys,x+rl.w*0.45+8,ys,C.red,3); tag(g,num(d,1)+' cm',x+rl.w*0.5,ys,C.red,'left',12);
    var t=tot(p), pa=p.kind==='ruler'?[['직접 잰 거리로 계산한 시간',t]]:parts(p), bx=rest.l+20, bw=rest.w-40, by=rest.t+rest.h*0.5, bh=30, tot0=Math.max(0.3,t), cols=[C.cyan,C.vio,C.or,C.grn];
    H.text(g,num(t*1000,0)+' ms',rest.l+rest.w/2,rest.t+30,{al:'center',size:30,w:800,c:C.fry}); H.text(g,'t = '+num(t,3)+' s   (d = ½ g t²)',rest.l+rest.w/2,rest.t+62,{al:'center',size:13,w:700,c:TH.dim});
    var x1=bx; pa.forEach(function(q,i){ var w=bw*q[1]/tot0; g.fillStyle=cols[i%4]; g.globalAlpha=0.85; g.fillRect(x1,by,w,bh); g.globalAlpha=1; g.strokeStyle=TH.stage; g.lineWidth=1; g.strokeRect(x1+.5,by+.5,w-1,bh-1); x1+=w; });
    H.seg(g,bx,by+bh+6,bx+bw,by+bh+6,TH.dim,1); lab(g,'0',bx,by+bh+20,TH.dim,'left',11); lab(g,num(tot0*1000,0)+' ms',bx+bw,by+bh+20,TH.dim,'right',11);
    var ly=by+bh+36; pa.forEach(function(q,i){ g.fillStyle=cols[i%4]; g.fillRect(bx,ly-6,12,12); lab(g,T(q[0])+'  '+num(q[1]*1000,0)+' ms',bx+20,ly,TH.text,'left',12); ly+=17; });
    var path=p.kind==='reflex'?['자극(무릎)','감각 신경','척수','운동 신경','반응(다리)']:['자극(눈)','감각 신경','대뇌','운동 신경','반응(손)']; var px=rest.l+14, py=rest.t+rest.h*0.28, sw=(rest.w-28)/5; path.forEach(function(s,i){ var cx=px+sw*i+sw/2; g.fillStyle=i===2?(p.kind==='reflex'?'rgba(63,224,143,.3)':'rgba(167,139,250,.3)'):'rgba(150,160,180,.15)'; H.rrect(g,cx-sw*0.45,py-14,sw*0.9,28,8); g.fill(); H.text(g,T(s),cx,py,{al:'center',size:Math.max(10,Math.min(12.5,sw*0.15)),w:700,c:TH.text}); if(i<4) H.arrow(g,cx+sw*0.46,py,cx+sw*0.54,py,C.fry,2,5); }); },
  read:function(){ var p=this.p, t=tot(p); return [RD('반응 시간',num(t,3),'s','hl'),RD('자가 떨어진 거리',num(dist(p),1),'cm'),RD('거치는 기관',p.kind==='reflex'?'척수 (뇌를 거치지 않음)':'대뇌','','th wide'),RD('반응의 종류',p.kind==='reflex'?'무조건 반사':'의식적 반응','')]; },
  record:function(){ var p=this.p; return {att:p.kind==='catch'?p.att:null, d:dist(p), t:tot(p)}; },
  ai:function(){ var p=this.p; return 'Reaction time model: '+p.kind+' (attention '+p.att+'%): total '+fmt(tot(p)*1000,0)+' ms, ruler drop distance '+fmt(dist(p),1)+' cm (d = 1/2 g t^2). Reflexes skip the cerebrum and are about 5 times faster than conscious reactions.'; }
};
LAB.add(E);
})();

/* ===================== 6. 맹점 찾기 (감각 기관: 눈) ===================== */
(function(){
var BS=15.5, HW=2.8, RD0=0.8;
function ang(p){ return Math.atan(p.sep/p.dist)*180/PI; }
function vis(p){ var a=ang(p), d=Math.abs(a-BS); return H.clamp((d-(HW-RD0))/(2*RD0),0,1); }
var E={id:'s3_blind', cat:CAT, icon:'👁️', name:'맹점 찾기', desc:'눈의 맹점에 물체의 상이 맺히면 보이지 않는 까닭 알아보기',
  info:'눈의 망막에는 시각 세포가 있어요. 그런데 시각 신경이 모여 눈 밖으로 나가는 부분(시신경 다발이 나가는 곳)에는 시각 세포가 없어 상이 맺혀도 보이지 않아요. 이곳이 맹점이에요. 맹점은 노란 점(황반, 상이 가장 선명한 곳)에서 코 쪽으로 약 15° 떨어져 있어요. 한쪽 눈을 감고 십자(+)를 보며 화면과의 거리를 조절하면 점이 사라지는 지점이 있어요. 점과 십자 사이의 간격 s와 눈과 화면의 거리 L에서 각도 θ = tan⁻¹(s / L)이고, θ가 약 15°일 때 점이 사라져요.',
  tries:['오른쪽 눈으로 십자를 보면서 거리를 바꿔 점이 사라지는 곳을 찾아보세요','점과 십자 사이의 간격을 두 배로 하면 점이 사라지는 거리는 어떻게 되나요?','점이 사라질 때 각도 θ는 몇 도인가요? 그때 점의 상은 망막의 어디에 맺히나요?','맹점이 있는데도 평소에 시야에 구멍이 보이지 않는 까닭은 무엇일까요?'],
  hint:'눈과 화면의 거리를 바꿔 점을 사라지게 해 보세요. 오른쪽에서는 화면의 점이 오른쪽에 있어요.', live:true, noPlay:true,
  params:[SG('eye','뜬 눈',[['R','오른쪽 눈'],['L','왼쪽 눈']],'R'),P('dist','눈과 화면 사이의 거리 L',10,60,1,40,'cm',[[20,'20'],[30,'30'],[40,'40']]),P('sep','십자와 점 사이의 간격 s',3,20,0.5,8,'cm',[[6,'6'],[8,'8'],[10,'10']],{d:1})],
  cols:[{k:'L',l:'눈과 화면의 거리',u:'cm',d:0},{k:'th',l:'각도 θ',u:'°',d:1},{k:'see',l:'점이 보이는 정도',u:'%',d:0}], gx:'L', gy:'th', join:true,
  reset:function(){},
  draw:function(g,W,Hh){ var p=this.p, r=R4(W,Hh,10), wd=wide(W,Hh), s={l:r.l+8,t:r.t+8,w:wd?r.w*0.5-12:r.w-16,h:wd?r.h-16:r.h*0.4}, e={l:wd?r.l+r.w*0.5+8:r.l+8,t:wd?r.t+8:r.t+r.h*0.4+14,w:wd?r.w*0.5-16:r.w-16,h:wd?r.h-16:r.h*0.6-22};
    g.fillStyle=TH.light?'#fbfbf4':'#10131b'; H.rrect(g,s.l,s.t,s.w,s.h,10); g.fill(); g.strokeStyle=TH.dim; g.lineWidth=1.5; g.stroke();
    var u=Math.min(s.w*0.8/20,s.h*0.3), cxm=s.l+s.w/2-(p.eye==='R'?1:-1)*p.sep*u/2, dxm=cxm+(p.eye==='R'?1:-1)*p.sep*u, cym=s.t+s.h*0.5, v=vis(p);
    g.strokeStyle=TH.text; g.lineWidth=3; g.beginPath(); g.moveTo(cxm-14,cym); g.lineTo(cxm+14,cym); g.moveTo(cxm,cym-14); g.lineTo(cxm,cym+14); g.stroke();
    g.globalAlpha=0.15+0.85*v; H.dot(g,dxm,cym,12,C.red); g.globalAlpha=1; if(v<0.15){ g.strokeStyle=C.red; g.lineWidth=1.5; g.setLineDash([3,4]); g.beginPath(); g.arc(dxm,cym,12,0,TAU); g.stroke(); g.setLineDash([]); }
    lab(g,p.eye==='R'?'왼쪽 눈을 감고 오른쪽 눈으로 +를 보세요':'오른쪽 눈을 감고 왼쪽 눈으로 +를 보세요',s.l+s.w/2,s.t+s.h-18,TH.dim,'center',12.5);
    var cx=e.l+e.w*0.62, cy=e.t+e.h*0.5, R=Math.min(e.h*0.3,e.w*0.2), dirN=(p.eye==='R'?-1:1), th=ang(p)*PI/180;
    g.strokeStyle=TH.dim; g.lineWidth=2.5; g.beginPath(); g.arc(cx,cy,R,0,TAU); g.stroke(); g.strokeStyle=C.cyan; g.lineWidth=5; g.beginPath(); g.arc(cx,cy,R,-PI/3+PI*0.0+PI/2*0,PI/3); g.stroke();
    var fx=cx+R, fy=cy; H.dot(g,fx,fy,5,C.fry); tag(g,'황반',fx+10,fy+0,C.fry,'left',11.5);
    var bsA=BS*PI/180*dirN*-1; H.dot(g,cx+R*Math.cos(bsA),cy+R*Math.sin(bsA),Math.max(5,R*0.09),TH.light?'#222':'#000',C.cyan); tag(g,'맹점',cx+R*Math.cos(bsA)+10,cy+R*Math.sin(bsA)+(dirN<0?-16:16),TH.text,'left',11.5);
    var lx=cx-R*1.5; H.seg(g,lx,cy-R*0.55,lx,cy+R*0.55,C.fry,5); lab(g,'렌즈',lx,cy-R*0.55-12,TH.dim,'center',11.5);
    var hitA=th*dirN*-1; var hx=cx+R*Math.cos(hitA), hy=cy+R*Math.sin(hitA); var sx2=cx-R*2.6, sy2=cy+Math.tan(th)*R*2.6*dirN;
    g.globalAlpha=0.35+0.65*v; H.seg(g,sx2,sy2,lx,cy+(sy2-cy)*0.0,C.red,2.5); H.seg(g,lx,cy,hx,hy,C.red,2.5); H.dot(g,hx,hy,5.5,C.red,TH.stage); g.globalAlpha=1;
    H.seg(g,cx-R*2.6,cy,lx,cy,C.fry,2); H.seg(g,lx,cy,fx,fy,C.fry,2);
    lab(g,'눈을 위에서 본 모습',e.l+e.w/2,e.t+12,TH.dim,'center',12); },
  read:function(){ var p=this.p, a=ang(p), v=vis(p), Lneed=p.sep/Math.tan(BS*PI/180); return [RD('각도 θ',num(a,1),'°','hl'),RD('점이 보이는 정도',num(v*100,0),'%'),RD('점의 상이 맺히는 곳',Math.abs(a-BS)<=HW-RD0?'맹점':Math.abs(a-BS)<HW+RD0?'맹점의 가장자리':'시각 세포가 있는 곳',''),RD('점이 사라지는 거리 (맹점 15.5°)',num(Lneed,1),'cm','th')]; },
  record:function(){ var p=this.p; return {L:p.dist, th:ang(p), see:vis(p)*100}; },
  ai:function(){ var p=this.p; return 'Blind spot model: blind spot center '+BS+' deg from the fovea, half width '+HW+' deg. Screen distance '+p.dist+' cm, dot spacing '+p.sep+' cm gives angle '+fmt(ang(p),1)+' deg, dot visibility '+fmt(vis(p)*100,0)+' %.'; }
};
LAB.add(E);
})();

/* ===================== 7. 일과 일의 원리 (일과 에너지) ===================== */
(function(){
var G=9.8;
function calc(p){ var m=p.m, h=p.h, W0=m*G*h, F,s;
  if(p.way==='lift'){ F=m*G; s=h; } else if(p.way==='ramp'){ var L=Math.max(p.L,h+0.01), sn=h/L, cs=Math.sqrt(1-sn*sn); F=m*G*(sn+p.mu*cs); s=L; } else { F=m*G/2/(1-p.mu*0.5); s=2*h; }
  return {F:F,s:s,W:F*s,W0:W0}; }
var E={id:'s3_work', cat:CAT, icon:'🏗️', name:'일과 일의 원리', desc:'같은 높이로 물체를 올릴 때 직접 들기, 빗면, 도르래에서 힘과 거리, 한 일 비교',
  info:'물체에 힘 F를 작용하여 힘의 방향으로 거리 s만큼 움직이면 한 일은 W = F × s 예요(단위 J). 물체를 같은 높이 h만큼 들어 올릴 때 빗면이나 움직도르래 같은 도구를 쓰면 필요한 힘은 줄어들지만 힘을 작용하는 거리는 그만큼 늘어나요. 그래서 마찰이 없다면 한 일은 도구를 쓰지 않을 때(mgh)와 같아요. 이것을 일의 원리라고 해요. 도구를 써도 일이 줄어드는 것은 아니에요. 마찰이 있으면 한 일이 mgh보다 커져요.',
  tries:['10 kg의 물체를 1 m 높이로 직접 들 때 한 일은 몇 J인가요?','빗면의 길이를 3 m, 6 m로 바꿔 보세요. 필요한 힘과 한 일은 어떻게 되나요?','움직도르래를 쓰면 힘이 어떻게 되고, 줄을 당기는 거리는 어떻게 되나요? 한 일은 같은가요?','마찰 계수를 0.2로 하면 빗면에서 한 일이 직접 드는 일보다 얼마나 커지나요?'],
  hint:'방법을 바꾸며 힘 F, 거리 s, 한 일 W를 비교해 보세요. 마찰을 0으로 두면 한 일이 같아요.', live:true, noPlay:true,
  params:[SG('way','방법',[['lift','직접 들기'],['ramp','빗면'],['pulley','움직도르래']],'ramp'),P('m','물체의 질량',1,20,1,10,'kg',[[5,'5'],[10,'10'],[20,'20']]),P('h','올리는 높이',0.5,3,0.1,1,'m',[[1,'1'],[2,'2']],{d:1}),P('L','빗면의 길이',1,6,0.5,3,'m',[[2,'2'],[3,'3'],[6,'6']],{d:1,show:function(p){ return p.way==='ramp'; }}),P('mu','마찰 계수',0,0.4,0.05,0,'',[[0,'0'],[0.2,'0.2']],{d:2,show:function(p){ return p.way!=='lift'; }})],
  cols:[{k:'F',l:'필요한 힘',u:'N',d:1},{k:'s',l:'힘을 작용한 거리',u:'m',d:2},{k:'W',l:'한 일',u:'J',d:1}], gx:'s', gy:'F', join:false,
  reset:function(){},
  draw:function(g,W,Hh){ var p=this.p, r=R4(W,Hh,10), wd=wide(W,Hh), c=calc(p), A={l:r.l+8,t:r.t+8,w:wd?r.w*0.52:r.w-16,h:wd?r.h-16:r.h*0.5}, B={l:wd?r.l+r.w*0.52+30:r.l+40,t:wd?r.t+30:r.t+r.h*0.5+20,w:wd?r.w*0.48-46:r.w-56,h:wd?r.h-96:r.h*0.5-86};
    var gx=A.l+30, gy=A.t+A.h-30, sc=Math.min((A.w-70)/Math.max(p.L,3),(A.h-90)/Math.max(p.h,1.5)); H.seg(g,A.l+10,gy,A.l+A.w-10,gy,TH.dim,3);
    if(p.way==='lift'){ var bx=gx+A.w*0.35, hh=p.h*sc; g.fillStyle=C.or; g.fillRect(bx-18,gy-hh-36,36,36); H.dot(g,bx,gy-hh-60,0.1,'#0000'); H.arrow(g,bx,gy-hh-40,bx,gy-hh-40-Math.min(70,c.F/4),C.fry,4,10); H.seg(g,bx+34,gy,bx+34,gy-hh,C.cyan,1.5,[4,4]); tag(g,'h = '+num(p.h,1)+' m',bx+42,gy-hh/2,C.cyan); }
    else if(p.way==='ramp'){ var L=Math.max(p.L,p.h+0.01), run=Math.sqrt(L*L-p.h*p.h), x1=gx+run*sc, y1=gy-p.h*sc; g.fillStyle=TH.light?'rgba(120,130,150,.35)':'rgba(150,160,180,.25)'; g.beginPath(); g.moveTo(gx,gy); g.lineTo(x1,gy); g.lineTo(x1,y1); g.closePath(); g.fill(); g.strokeStyle=TH.dim; g.lineWidth=2.5; g.stroke();
      var t=0.62, bx2=gx+(x1-gx)*t, by2=gy-(gy-y1)*t, an=Math.atan2(y1-gy,x1-gx); g.save(); g.translate(bx2,by2); g.rotate(an); g.fillStyle=C.or; g.fillRect(-16,-32,32,32); H.arrow(g,0,-16,Math.min(120,10+c.F*0.9),-16,C.fry,4,10); g.restore(); tag(g,'L = '+num(L,1)+' m',(gx+x1)/2-30,(gy+y1)/2-30,C.vio); tag(g,'h = '+num(p.h,1)+' m',x1+8,(gy+y1)/2,C.cyan); }
    else { var px=gx+A.w*0.42, top=A.t+22, hh2=p.h*sc*0.7, bw=px; H.seg(g,px-60,top-4,px+60,top-4,TH.dim,4); H.dot(g,px,top+34,22,'rgba(167,139,250,.25)',C.vio); H.seg(g,px-22,top-4,px-22,top+34,TH.dim,2); H.seg(g,px+22,top-4,px+22,top+34,TH.dim,2); g.fillStyle=C.or; g.fillRect(px-17,top+34+hh2*0.2,34,34); H.seg(g,px,top+34,px,top+34+hh2*0.2,TH.dim,2); H.seg(g,px-22,top+34,px-22,top-4,TH.dim,2);
      H.arrow(g,px+22,top+8,px+22,top-36,C.fry,4,10); tag(g,'F = '+num(c.F,1)+' N',px+34,top-26,C.fry); tag(g,F('줄을 {0} m 당겨요',num(c.s,1)),px+34,top+16,C.cyan,'left',12); }
    var cats=[['힘 F (N)',c.F,C.fry,Math.max(c.F,p.m*G)],['거리 s (m)',c.s,C.vio,Math.max(c.s,p.h*2)],['한 일 W (J)',c.W,C.grn,Math.max(c.W,c.W0)]], bw2=B.w/3-14;
    cats.forEach(function(q,i){ var x=B.l+i*(bw2+14), full=q[3]*1.15, h1=B.h*q[1]/full, hr=B.h*(i===0?p.m*G:i===1?p.h:c.W0)/full; g.fillStyle=q[2]; g.globalAlpha=0.85; g.fillRect(x,B.t+B.h-h1,bw2,h1); g.globalAlpha=1; if(true){ H.seg(g,x-4,B.t+B.h-hr,x+bw2+4,B.t+B.h-hr,TH.text,1.5,[4,3]); } H.text(g,num(q[1],i===2?0:1),x+bw2/2,B.t+B.h-h1-12,{al:'center',size:13,w:800,c:q[2]}); lab(g,q[0],x+bw2/2,B.t+B.h+14,TH.dim,'center',11.5); });
    lab(g,'점선 = 도구 없이 직접 들 때',B.l+B.w/2,B.t-12,TH.dim,'center',11.5); },
  read:function(){ var p=this.p, c=calc(p); return [RD('필요한 힘 F',num(c.F,1),'N','hl'),RD('힘을 작용한 거리 s',num(c.s,2),'m'),RD('한 일 W = F × s',num(c.W,1),'J','th'),RD('직접 들 때 한 일 mgh',num(c.W0,1),'J'),RD('도구를 써서 달라진 일',c.W-c.W0>0.05?F('+{0} J (마찰)',num(c.W-c.W0,1)):'없음 (일의 원리)','','wide')]; },
  record:function(){ var c=calc(this.p); return {F:c.F, s:c.s, W:c.W}; },
  ai:function(){ var p=this.p, c=calc(p); return 'Work and the work principle: '+p.m+' kg raised '+p.h+' m by '+p.way+' (friction coefficient '+p.mu+'): force '+fmt(c.F,1)+' N over '+fmt(c.s,2)+' m does W = '+fmt(c.W,1)+' J versus direct lift m g h = '+fmt(c.W0,1)+' J. Tools reduce force but not work.'; }
};
LAB.add(E);
})();

/* ===================== English (other languages fall back to English; see i18n-todo.md) ===================== */
FFT.add({"암모니아": ["Ammonia"], "염화 수소": ["Hydrogen chloride"], "기체 반응에서 기체의 부피비": ["Volume ratio of gases in a reaction"], "같은 온도와 압력에서 기체끼리 반응할 때 부피가 간단한 정수비를 이루는 모습": ["Gases that react at the same temperature and pressure combine in simple whole-number volume ratios"], "같은 온도와 압력에서 기체가 반응할 때, 반응하는 기체와 생성되는 기체의 부피 사이에는 간단한 정수비가 성립해요(기체 반응 법칙). 이 비는 화학 반응식의 계수비와 같아요. 이것은 같은 온도와 압력에서 기체의 부피가 기체 분자의 수에 비례하기 때문이에요(아보가드로 법칙). 예를 들어 수소 2 mL와 산소 1 mL가 반응하면 수증기 2 mL가 생겨요. 한쪽 기체가 먼저 다 쓰이면 남은 기체는 반응하지 않고 남아요. 수증기는 100 ℃ 이상의 기체 상태일 때의 부피예요.": ["When gases react at the same temperature and pressure, the volumes of the reacting and produced gases are in a simple whole-number ratio (law of combining volumes). This ratio equals the ratio of the coefficients in the chemical equation, because at the same temperature and pressure the volume of a gas is proportional to the number of molecules (Avogadro's law). For example, 2 mL of hydrogen and 1 mL of oxygen react to give 2 mL of water vapor. If one gas is used up first, the rest of the other gas stays unreacted. The volume of water vapor is for the gas state above 100 ℃."], "수소 40 mL와 산소 20 mL를 반응시키면 수증기는 몇 mL가 생기나요?": ["If 40 mL of hydrogen reacts with 20 mL of oxygen, how many mL of water vapor are made?"], "수소 40 mL와 산소 40 mL를 반응시키면 어느 기체가 남고, 얼마나 남나요?": ["If 40 mL of hydrogen reacts with 40 mL of oxygen, which gas is left over and how much?"], "질소와 수소가 반응할 때 부피비가 1 : 3 : 2인 까닭을 반응식으로 설명해 보세요": ["Use the equation to explain why nitrogen and hydrogen react in the volume ratio 1 : 3 : 2"], "수소 30 mL에 염소를 0부터 60 mL까지 늘려 가며 기록하고, 생성되는 기체의 부피가 어떻게 달라지는지 그래프로 보세요": ["Keep hydrogen at 30 mL, record chlorine from 0 to 60 mL, and graph how the volume of gas produced changes"], "반응을 고르고 두 기체의 부피를 바꿔 보세요. 반응 전과 후의 부피를 막대로 비교해요.": ["Pick a reaction and change the two gas volumes. Compare the volumes before and after with the bars."], "수소 + 산소": ["Hydrogen + oxygen"], "질소 + 수소": ["Nitrogen + hydrogen"], "수소 + 염소": ["Hydrogen + chlorine"], "첫째 반응물의 부피": ["Volume of the first reactant"], "둘째 반응물의 부피": ["Volume of the second reactant"], "첫째 반응물": ["First reactant"], "둘째 반응물": ["Second reactant"], "생성된 기체": ["Gas produced"], "남은 기체": ["Gas left over"], "부피비": ["Volume ratio"], "반응 전": ["Before"], "반응 후": ["After"], "반응 부피비": ["Reaction volume ratio"], "{0}의 부피": ["Volume of {0}"], "반응한 {0}": ["{0} that reacted"], "먼저 다 쓰이는 기체": ["Gas used up first"], "둘 다": ["Both"], "수산화 나트륨": ["Sodium hydroxide"], "질산 암모늄": ["Ammonium nitrate"], "열에너지가 출입하는 반응": ["Reactions that release or absorb heat"], "물에 녹을 때 열을 내놓거나 흡수하는 물질의 온도 변화": ["Temperature change of substances that give off or absorb heat when they dissolve in water"], "화학 반응이나 용해가 일어날 때 열에너지가 출입해요. 열을 방출해 주변의 온도가 올라가는 반응을 발열 반응, 열을 흡수해 주변의 온도가 내려가는 반응을 흡열 반응이라고 해요. 수산화 나트륨이나 염화 칼슘이 물에 녹으면 발열(손난로, 제설제), 질산 암모늄이 녹으면 흡열(냉찜질 팩)이에요. 온도 변화는 ΔT = (출입한 열) ÷ (용액의 질량 × 비열)로 계산해요. 이 실험은 물 100 g에 녹일 때의 몰당 용해열(약 값)로 계산한 간단한 모델이에요.": ["Heat energy goes in or out when a chemical reaction or dissolving happens. A reaction that releases heat and warms its surroundings is exothermic; one that absorbs heat and cools its surroundings is endothermic. Sodium hydroxide or calcium chloride dissolving in water is exothermic (hand warmers, de-icers), and ammonium nitrate dissolving is endothermic (cold packs). The temperature change is ΔT = (heat released or absorbed) ÷ (mass of solution × specific heat). This is a simple model that uses approximate molar heats of solution for dissolving in water."], "수산화 나트륨 5 g을 물 100 g에 녹이면 온도는 몇 ℃ 올라가나요?": ["If 5 g of sodium hydroxide dissolves in 100 g of water, by how many ℃ does the temperature rise?"], "같은 질량에서 질산 암모늄은 온도를 어떻게 바꾸나요? 발열일까요, 흡열일까요?": ["For the same mass, how does ammonium nitrate change the temperature? Is it exothermic or endothermic?"], "물의 양을 두 배로 하면 온도 변화는 어떻게 되나요? 그 까닭은 무엇인가요?": ["What happens to the temperature change if you double the amount of water? Why?"], "녹이는 양을 0 g부터 20 g까지 바꾸며 기록하고, 온도 변화와 질량 사이의 관계를 그래프로 보세요": ["Change the mass from 0 g to 20 g, record it, and graph the relation between temperature change and mass"], "물질을 고르고 재생 단추를 눌러 보세요. 물질이 녹으면서 온도가 변하는 모습을 보세요.": ["Pick a substance and press play. Watch the temperature change as it dissolves."], "녹이는 물질": ["Substance to dissolve"], "물질의 질량": ["Mass of the substance"], "물의 질량": ["Mass of water"], "최종 온도": ["Final temperature"], "질량이 1 g 늘 때마다 온도 변화가 {0} ℃씩 커져요 (물질의 양이 많을수록 출입하는 열이 많아요)": ["Each extra 1 g of the substance raises the temperature change by {0} ℃ (more substance means more heat exchanged)"], "발열 반응: 주변으로 열 방출": ["Exothermic: heat released to the surroundings"], "흡열 반응: 주변에서 열 흡수": ["Endothermic: heat absorbed from the surroundings"], "온도 변화 없음": ["No temperature change"], "시간 (s)": ["Time (s)"], "온도 (℃)": ["Temperature (℃)"], "반응의 종류": ["Type of reaction"], "발열 반응": ["Exothermic reaction"], "흡열 반응": ["Endothermic reaction"], "열 출입 없음": ["No heat exchange"], "지금 온도": ["Temperature now"], "최종 온도 (이론)": ["Final temperature (theory)"], "출입한 열": ["Heat released or absorbed"], "녹인 물질의 양": ["Amount dissolved"], "위도와 깊이에 따른 해수의 수온과 염분": ["Seawater temperature and salinity by latitude and depth"], "위도에 따라 바다 표층의 수온과 염분이 어떻게 다르고, 깊이에 따라 수온이 어떻게 층을 이루는지": ["How the surface temperature and salinity of the sea differ with latitude, and how temperature forms layers with depth"], "바다는 깊이에 따라 혼합층, 수온 약층, 심해층으로 나뉘어요. 혼합층은 햇빛을 받아 따뜻하고 바람의 영향으로 섞여 수온이 거의 일정해요. 수온 약층은 깊어질수록 수온이 급격히 낮아지는 층이고, 심해층은 수온이 낮고 거의 일정해요. 저위도는 표층 수온이 높아 수온 약층이 뚜렷하지만, 고위도는 표층 수온이 낮아 수온 약층이 거의 나타나지 않아요. 표층 염분은 증발량이 강수량보다 많은 중위도 바다에서 높고, 강수량이 많은 적도와 빙하가 녹는 극지방에서 낮아요. 이 그래프는 교과서 수준의 모식(단순화) 모델이에요.": ["The sea is divided by depth into the mixed layer, the thermocline and the deep layer. The mixed layer is warm from sunlight and mixed by wind, so its temperature is almost constant. In the thermocline the temperature drops quickly with depth, and the deep layer is cold and almost constant. At low latitudes the surface is warm so the thermocline is clear, but at high latitudes the surface is cold and the thermocline almost disappears. Surface salinity is high in mid-latitude seas where evaporation exceeds precipitation, and low near the equator (heavy rain) and at the poles (melting ice). This graph is a simplified textbook-level model."], "위도 0°와 60°에서 수온이 깊이에 따라 어떻게 다른지 비교해 보세요": ["Compare how the temperature changes with depth at latitudes 0° and 60°"], "수온 약층이 거의 사라지는 위도는 대략 어디인가요? 그 까닭은 무엇일까요?": ["At about what latitude does the thermocline almost disappear? Why?"], "표층 염분이 가장 높은 위도는 어디인가요? 증발량과 강수량으로 설명해 보세요": ["At what latitude is the surface salinity highest? Explain with evaporation and precipitation"], "깊이 1000 m에서 수온은 위도가 달라져도 거의 같아요. 왜 그럴까요?": ["At 1000 m depth the temperature is almost the same at any latitude. Why?"], "위도를 바꿔 보세요. 왼쪽은 깊이에 따른 수온, 오른쪽은 위도에 따른 표층 염분이에요.": ["Change the latitude. The left graph shows temperature by depth and the right graph surface salinity by latitude."], "표층 수온": ["Surface temperature"], "그 깊이의 수온": ["Temperature at that depth"], "표층 염분": ["Surface salinity"], "수온 (℃)": ["Temperature (℃)"], "깊이 (m)": ["Depth (m)"], "혼합층": ["Mixed layer"], "수온 약층": ["Thermocline"], "심해층": ["Deep layer"], "수온 약층이 거의 없어요": ["Almost no thermocline"], "표층 염분 (‰)": ["Surface salinity (‰)"], "깊이 {0} m의 수온": ["Temperature at {0} m depth"], "깊이 1000 m의 수온": ["Temperature at 1000 m depth"], "혼합층의 두께": ["Thickness of the mixed layer"], "뚜렷해요": ["Clear"], "거의 없어요": ["Almost none"], "해들리 순환": ["Hadley cell"], "페렐 순환": ["Ferrel cell"], "극순환": ["Polar cell"], "적도 저압대": ["Equatorial low-pressure belt"], "저압": ["Low pressure"], "상승 기류가 강해 비가 많이 와요": ["Strong rising air brings a lot of rain"], "아열대 고압대": ["Subtropical high-pressure belt"], "고압": ["High pressure"], "하강 기류가 있어 맑고 건조해요 (사막)": ["Sinking air makes it clear and dry (deserts)"], "한대 전선대": ["Polar front"], "따뜻한 공기와 찬 공기가 만나 흐리고 비가 와요": ["Warm and cold air meet, so it is cloudy and rainy"], "극 고압대": ["Polar high-pressure belt"], "차갑고 건조한 공기가 내려와요": ["Cold, dry air sinks"], "북풍 (극 → 적도)": ["North wind (pole → equator)"], "북": ["N"], "무역풍": ["Trade winds"], "북동풍": ["Northeasterly"], "편서풍": ["Westerlies"], "남서풍": ["Southwesterly"], "극동풍": ["Polar easterlies"], "대기 대순환": ["Global atmospheric circulation"], "위도별 바람과 기압대가 3개의 순환 세포로 만들어지는 모습": ["How winds and pressure belts by latitude form from three circulation cells"], "적도 지방은 태양 에너지를 많이 받고 극 지방은 적게 받아 에너지 차이가 생겨요. 대기는 이 에너지를 저위도에서 고위도로 운반해요. 지구가 자전하지 않는다면 적도에서 상승한 공기가 극에서 내려오는 하나의 순환이 생겨요. 지구가 자전하면 전향력 때문에 순환이 위도 0°~30°(해들리 순환), 30°~60°(페렐 순환), 60°~90°(극순환)의 세 개 세포로 나뉘어요. 지표 부근에서는 무역풍(북동풍), 편서풍(남서풍), 극동풍(북동풍)이 불고 기압대는 적도 저압대, 아열대 고압대, 한대 전선대(저압대), 극 고압대가 번갈아 나타나요.": ["The equator gets a lot of solar energy and the poles little, so there is an energy difference. The atmosphere carries this energy from low to high latitudes. If the Earth did not rotate, air rising at the equator would sink at the poles in a single cell. With rotation, the Coriolis effect splits it into three cells: 0°–30° (Hadley), 30°–60° (Ferrel) and 60°–90° (Polar). Near the ground the trade winds (northeasterly), westerlies (southwesterly) and polar easterlies (northeasterly) blow, and the equatorial low, subtropical high, polar front (low) and polar high belts alternate."], "지구 자전을 끄면 순환 세포가 몇 개가 되나요? 지표 바람은 어떻게 부나요?": ["With Earth's rotation off, how many circulation cells are there? How does the surface wind blow?"], "위도 30° 근처에 사막이 많은 까닭을 순환 세포의 공기 흐름으로 설명해 보세요": ["Explain why there are many deserts near latitude 30° using the air flow of the cells"], "우리나라(위도 약 37°)에서 지표 바람은 어느 방향에서 부나요? 순환 세포는 무엇인가요?": ["At Korea's latitude (about 37°), from which direction does the surface wind blow? Which cell is it?"], "위도 0°, 30°, 60°, 90°에서 상승 기류와 하강 기류 중 무엇이 있나요?": ["At latitudes 0°, 30°, 60° and 90°, is there rising or sinking air?"], "위도를 바꾸고 지구 자전을 켜고 꺼 보세요. 화살표가 공기의 흐름이에요.": ["Change the latitude and turn Earth's rotation on and off. The arrows show the air flow."], "위도 (북반구)": ["Latitude (Northern Hemisphere)"], "지구 자전 (전향력)": ["Earth's rotation (Coriolis effect)"], "극": ["Pole"], "하나의 순환": ["A single cell"], "북풍": ["North wind"], "위도 {0}°": ["Latitude {0}°"], "저": ["L"], "고": ["H"], "지표 바람": ["Surface wind"], "바람이 불어오는 방향": ["Direction the wind comes from"], "가까운 기압대": ["Nearest pressure belt"], "공기의 움직임": ["Air movement"], "상승 기류가 강해요": ["Strong rising air"], "하강 기류가 있어요": ["Sinking air"], "순환 세포": ["Circulation cell"], "무릎뼈 아래 자극 → 척수": ["Stimulus below the kneecap → spinal cord"], "척수에서 연결 (뇌를 거치지 않음)": ["Connected in the spinal cord (skips the brain)"], "근육의 수축": ["Muscle contraction"], "눈의 시각 처리": ["Visual processing in the eye"], "대뇌의 판단 (집중할수록 빨라요)": ["Judgment in the cerebrum (faster when you concentrate)"], "신경 신호 전달 (약 1.1 m)": ["Nerve signal travel (about 1.1 m)"], "자극에서 반응까지 걸리는 시간": ["Time from stimulus to response"], "자를 떨어뜨려 반응 시간을 재고, 의식적 반응과 무조건 반사의 경로를 비교": ["Drop a ruler to measure reaction time and compare the paths of a conscious response and a reflex"], "자극이 감각 기관에서 감각 신경, 연합 신경(뇌와 척수), 운동 신경을 거쳐 반응 기관에 전달되면 반응이 일어나요. 자를 떨어뜨리고 잡을 때(의식적 반응)는 신호가 대뇌까지 갔다 오기 때문에 약 0.2초가 걸려요. 무릎 반사 같은 무조건 반사는 신호가 척수에서 바로 연결되어 대뇌의 판단을 거치지 않으므로 훨씬 빨라요(약 0.04초). 자가 떨어진 거리 d를 재면 d = ½ g t²에서 반응 시간 t = √(2d/g)를 구할 수 있어요. 값은 교과서에 나오는 대략적인 크기를 바탕으로 한 모델이에요.": ["When a stimulus passes from a sense organ through sensory neurons, association neurons (brain and spinal cord) and motor neurons to the effector, a response happens. Catching a dropped ruler (a conscious response) takes about 0.2 s because the signal goes to the cerebrum and back. A reflex such as the knee-jerk is connected directly in the spinal cord without the cerebrum's judgment, so it is much faster (about 0.04 s). If you measure the distance d the ruler falls, the reaction time is t = √(2d/g) from d = ½ g t². The values are a model based on approximate sizes found in textbooks."], "자를 잡은 위치가 15 cm였다면 반응 시간은 얼마인가요?": ["If you caught the ruler at 15 cm, what is the reaction time?"], "집중도를 100%와 0%로 바꾸면 반응 시간이 어떻게 달라지나요? 이유는 무엇일까요?": ["How does the reaction time change if you set concentration to 100% and then 0%? Why?"], "무조건 반사로 바꾸면 반응 시간이 몇 배 짧아지나요? 어느 부분을 거치지 않아서일까요?": ["Switch to the reflex. How many times shorter is the reaction time? Which part is skipped?"], "직접 재 본 값을 [자로 재기]에 넣고 반응 시간을 구해 보세요": ["Put your own measured value into [Measure with ruler] and find the reaction time"], "반응 방법을 고르고 집중도를 바꿔 보세요. 자는 반응하는 동안 얼마나 떨어질까요?": ["Pick a way to react and change concentration. How far does the ruler fall during the reaction?"], "반응 방법": ["Way of reacting"], "자 잡기 (의식적 반응)": ["Catch the ruler (conscious response)"], "무릎 반사 (무조건 반사)": ["Knee-jerk (reflex)"], "자로 재기 (직접 입력)": ["Measure with ruler (enter yourself)"], "집중도": ["Concentration"], "자가 떨어진 거리 d": ["Distance d the ruler fell"], "자가 떨어진 거리": ["Distance the ruler fell"], "반응 시간": ["Reaction time"], "직접 잰 거리로 계산한 시간": ["Time calculated from the measured distance"], "자극(무릎)": ["Stimulus (knee)"], "감각 신경": ["Sensory neuron"], "척수": ["Spinal cord"], "운동 신경": ["Motor neuron"], "반응(다리)": ["Response (leg)"], "자극(눈)": ["Stimulus (eye)"], "대뇌": ["Cerebrum"], "반응(손)": ["Response (hand)"], "거치는 기관": ["Organ it passes through"], "척수 (뇌를 거치지 않음)": ["Spinal cord (skips the brain)"], "무조건 반사": ["Reflex"], "의식적 반응": ["Conscious response"], "맹점 찾기": ["Find the blind spot"], "눈의 맹점에 물체의 상이 맺히면 보이지 않는 까닭 알아보기": ["Learn why an object cannot be seen when its image falls on the blind spot of the eye"], "눈의 망막에는 시각 세포가 있어요. 그런데 시각 신경이 모여 눈 밖으로 나가는 부분(시신경 다발이 나가는 곳)에는 시각 세포가 없어 상이 맺혀도 보이지 않아요. 이곳이 맹점이에요. 맹점은 노란 점(황반, 상이 가장 선명한 곳)에서 코 쪽으로 약 15° 떨어져 있어요. 한쪽 눈을 감고 십자(+)를 보며 화면과의 거리를 조절하면 점이 사라지는 지점이 있어요. 점과 십자 사이의 간격 s와 눈과 화면의 거리 L에서 각도 θ = tan⁻¹(s / L)이고, θ가 약 15°일 때 점이 사라져요.": ["The retina of the eye has photoreceptor cells. But where the optic nerve fibers gather and leave the eye there are no photoreceptors, so an image that falls there cannot be seen. This is the blind spot. It lies about 15° from the yellow spot (the fovea, where the image is sharpest) toward the nose. Close one eye, look at the cross (+) and change the distance to the screen: there is a point where the dot disappears. With the spacing s between dot and cross and the distance L from eye to screen, the angle is θ = tan⁻¹(s / L), and the dot disappears when θ is about 15°."], "오른쪽 눈으로 십자를 보면서 거리를 바꿔 점이 사라지는 곳을 찾아보세요": ["Look at the cross with your right eye and change the distance to find where the dot disappears"], "점과 십자 사이의 간격을 두 배로 하면 점이 사라지는 거리는 어떻게 되나요?": ["If you double the spacing between the dot and the cross, what happens to the distance at which the dot disappears?"], "점이 사라질 때 각도 θ는 몇 도인가요? 그때 점의 상은 망막의 어디에 맺히나요?": ["What is the angle θ when the dot disappears? Where on the retina does its image fall?"], "맹점이 있는데도 평소에 시야에 구멍이 보이지 않는 까닭은 무엇일까요?": ["Why can't you usually see a hole in your field of view even though there is a blind spot?"], "눈과 화면의 거리를 바꿔 점을 사라지게 해 보세요. 오른쪽에서는 화면의 점이 오른쪽에 있어요.": ["Change the distance from the eye to the screen to make the dot disappear. For the right eye, the dot is on the right of the screen."], "뜬 눈": ["Eye that is open"], "오른쪽 눈": ["Right eye"], "왼쪽 눈": ["Left eye"], "눈과 화면 사이의 거리 L": ["Distance L between eye and screen"], "십자와 점 사이의 간격 s": ["Spacing s between cross and dot"], "눈과 화면의 거리": ["Distance between eye and screen"], "각도 θ": ["Angle θ"], "점이 보이는 정도": ["How visible the dot is"], "왼쪽 눈을 감고 오른쪽 눈으로 +를 보세요": ["Close your left eye and look at the + with your right eye"], "오른쪽 눈을 감고 왼쪽 눈으로 +를 보세요": ["Close your right eye and look at the + with your left eye"], "황반": ["Fovea"], "맹점": ["Blind spot"], "렌즈": ["Lens"], "눈을 위에서 본 모습": ["The eye seen from above"], "점의 상이 맺히는 곳": ["Where the dot's image falls"], "맹점의 가장자리": ["Edge of the blind spot"], "시각 세포가 있는 곳": ["Where photoreceptors are"], "점이 사라지는 거리 (맹점 15.5°)": ["Distance where the dot disappears (blind spot 15.5°)"], "일과 일의 원리": ["Work and the work principle"], "같은 높이로 물체를 올릴 때 직접 들기, 빗면, 도르래에서 힘과 거리, 한 일 비교": ["Compare force, distance and work when raising an object the same height by lifting directly, with a ramp or a pulley"], "물체에 힘 F를 작용하여 힘의 방향으로 거리 s만큼 움직이면 한 일은 W = F × s 예요(단위 J). 물체를 같은 높이 h만큼 들어 올릴 때 빗면이나 움직도르래 같은 도구를 쓰면 필요한 힘은 줄어들지만 힘을 작용하는 거리는 그만큼 늘어나요. 그래서 마찰이 없다면 한 일은 도구를 쓰지 않을 때(mgh)와 같아요. 이것을 일의 원리라고 해요. 도구를 써도 일이 줄어드는 것은 아니에요. 마찰이 있으면 한 일이 mgh보다 커져요.": ["When a force F moves an object a distance s in the direction of the force, the work is W = F × s (unit J). When you raise an object the same height h with a tool such as a ramp or a movable pulley, the force needed gets smaller but the distance over which you apply it gets longer by the same factor. So without friction the work is the same as without a tool (mgh). This is called the work principle. A tool does not reduce the work. With friction, the work becomes larger than mgh."], "10 kg의 물체를 1 m 높이로 직접 들 때 한 일은 몇 J인가요?": ["How much work is done lifting a 10 kg object 1 m by hand, in J?"], "빗면의 길이를 3 m, 6 m로 바꿔 보세요. 필요한 힘과 한 일은 어떻게 되나요?": ["Change the ramp length to 3 m and 6 m. What happens to the force needed and the work done?"], "움직도르래를 쓰면 힘이 어떻게 되고, 줄을 당기는 거리는 어떻게 되나요? 한 일은 같은가요?": ["With a movable pulley, what happens to the force and the distance you pull the rope? Is the work the same?"], "마찰 계수를 0.2로 하면 빗면에서 한 일이 직접 드는 일보다 얼마나 커지나요?": ["With a friction coefficient of 0.2, how much more work does the ramp need than lifting directly?"], "방법을 바꾸며 힘 F, 거리 s, 한 일 W를 비교해 보세요. 마찰을 0으로 두면 한 일이 같아요.": ["Change the way and compare the force F, distance s and work W. With zero friction the work is the same."], "방법": ["Way"], "직접 들기": ["Lift directly"], "빗면": ["Ramp"], "움직도르래": ["Movable pulley"], "물체의 질량": ["Mass of the object"], "올리는 높이": ["Height raised"], "빗면의 길이": ["Length of the ramp"], "마찰 계수": ["Friction coefficient"], "필요한 힘": ["Force needed"], "힘을 작용한 거리": ["Distance the force acts"], "한 일": ["Work done"], "줄을 {0} m 당겨요": ["Pull the rope {0} m"], "힘 F (N)": ["Force F (N)"], "거리 s (m)": ["Distance s (m)"], "한 일 W (J)": ["Work W (J)"], "점선 = 도구 없이 직접 들 때": ["Dashed line = lifting directly without a tool"], "필요한 힘 F": ["Force needed F"], "힘을 작용한 거리 s": ["Distance the force acts s"], "한 일 W = F × s": ["Work W = F × s"], "직접 들 때 한 일 mgh": ["Work when lifting directly mgh"], "도구를 써서 달라진 일": ["Work changed by using a tool"], "+{0} J (마찰)": ["+{0} J (friction)"], "없음 (일의 원리)": ["None (work principle)"], "화학 반응의 규칙": ["Rules of chemical reactions"], "수권과 해수의 순환": ["The hydrosphere and ocean circulation"], "기권과 날씨": ["The atmosphere and weather"], "자극과 반응": ["Stimulus and response"], "에너지 전환과 보존": ["Energy conversion and conservation"]});

/* ===================== unit links ===================== */
(function(){
  if(!(window.LABCUR&&LABCUR.link)) return;
  LABCUR.link('화학 반응의 규칙',['s3_gasvol','s3_heatrxn']);
  LABCUR.link('수권과 해수의 순환',['s3_seatemp']);
  LABCUR.link('기권과 날씨',['s3_circ']);
  LABCUR.link('자극과 반응',['s3_reaction','s3_blind']);
  LABCUR.link('에너지 전환과 보존',['s3_work']);
})();
})();
