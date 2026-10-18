/* Fry Lab cards: the "단위·공식" window (header button #cardBtn). Tab 1 converts units (length, mass, time, speed, temperature,
   area, volume, energy) with every unit of the kind shown at once; tab 2 is a searchable collection of formula cards (math and science),
   a card with a matching experiment has a button that opens it (LAB.open). It uses the picker window styles (.gpkback / .gpk). */
(function(){
'use strict';
var T=FFT.T, F=FFT.F, $=function(id){ return document.getElementById(id); };
/* units: [label, factor to the base unit]; temperature is converted through degrees Celsius */
var UNITS=[
  {id:'len',n:'길이',base:'m',u:[['mm',0.001],['cm',0.01],['m',1],['km',1000],['인치(in)',0.0254],['피트(ft)',0.3048],['야드(yd)',0.9144],['마일(mi)',1609.344],['자(尺)',0.30303],['광년',9.4607304725808e15]]},
  {id:'mass',n:'질량',base:'kg',u:[['mg',1e-6],['g',0.001],['kg',1],['t(톤)',1000],['온스(oz)',0.028349523125],['파운드(lb)',0.45359237],['근(600g)',0.6],['관',3.75]]},
  {id:'time',n:'시간',base:'s',u:[['ms',0.001],['초(s)',1],['분(min)',60],['시간(h)',3600],['일',86400],['주',604800],['365일(년)',31536000]]},
  {id:'speed',n:'속력',base:'m/s',u:[['m/s',1],['km/h',1/3.6],['mph',0.44704],['노트(kn)',0.514444],['cm/s',0.01],['마하(15°C)',340.3]]},
  {id:'temp',n:'온도',t:1,u:[['°C'],['°F'],['K']]},
  {id:'area',n:'넓이',base:'m²',u:[['cm²',1e-4],['m²',1],['km²',1e6],['a(아르)',100],['ha(헥타르)',1e4],['평',400/121],['제곱피트(ft²)',0.09290304],['에이커',4046.8564224]]},
  {id:'vol',n:'부피',base:'L',u:[['mL(cm³)',0.001],['L',1],['m³',1000],['컵(200mL)',0.2],['갤런(US)',3.785411784],['되',1.8039],['말',18.039]]},
  {id:'energy',n:'에너지',base:'J',u:[['J',1],['kJ',1000],['cal',4.184],['kcal',4184],['Wh',3600],['kWh',3.6e6],['eV',1.602176634e-19]]}
];
var FORMULAS=[
  ['math','직사각형의 넓이','S = a × b','a 가로, b 세로',null],
  ['math','삼각형의 넓이','S = ½ × a × h','a 밑변, h 높이',null],
  ['math','원의 넓이와 둘레','S = πr²,  l = 2πr','r 반지름, π ≈ 3.14159',null],
  ['math','직육면체의 부피','V = a × b × c','가로, 세로, 높이를 곱해요',null],
  ['math','원기둥의 부피','V = πr²h','r 밑면 반지름, h 높이',null],
  ['math','구의 부피와 겉넓이','V = (4/3)πr³,  S = 4πr²','r 반지름',null],
  ['math','피타고라스 정리','a² + b² = c²','직각삼각형에서 c가 가장 긴 변(빗변)','m1_pythproof'],
  ['math','이차방정식의 근의 공식','x = (−b ± √(b² − 4ac)) / 2a','ax² + bx + c = 0 (a ≠ 0)','m1_vieta'],
  ['math','일차함수의 기울기','기울기 = (y₂ − y₁) / (x₂ − x₁)','두 점 (x₁, y₁), (x₂, y₂)를 지나는 직선','func'],
  ['math','두 점 사이의 거리','d = √((x₂ − x₁)² + (y₂ − y₁)²)','피타고라스 정리에서 나와요',null],
  ['math','등차수열의 일반항과 합','aₙ = a + (n − 1)d,  Sₙ = n(a + aₙ) / 2','a 첫째항, d 공차',null],
  ['math','등비수열의 일반항','aₙ = a × rⁿ⁻¹','a 첫째항, r 공비',null],
  ['math','삼각비의 기본 관계','sin²θ + cos²θ = 1,  tanθ = sinθ / cosθ','단위원 위의 점 (cosθ, sinθ)','trig'],
  ['math','평균','평균 = (모든 값의 합) / (값의 개수)','자료를 하나의 수로 나타내요',null],
  ['math','경우의 수와 확률','확률 = (일어나는 경우의 수) / (모든 경우의 수)','각 경우가 일어날 가능성이 같을 때','prob'],
  ['sci','속력','v = s / t','v 속력, s 거리, t 시간',null],
  ['sci','가속도','a = (v − v₀) / t','v₀ 처음 속력, v 나중 속력, t 걸린 시간',null],
  ['sci','뉴턴의 운동 제2법칙','F = m × a','F 힘(N), m 질량(kg), a 가속도(m/s²)','force'],
  ['sci','운동 에너지','Eₖ = ½mv²','m 질량, v 속력',null],
  ['sci','중력 위치 에너지','Eₚ = m × g × h','g ≈ 9.8 m/s², h 기준면에서의 높이',null],
  ['sci','일과 일률','W = F × s,  P = W / t','W 일(J), F 힘, s 움직인 거리, P 일률(W)',null],
  ['sci','밀도','ρ = m / V','m 질량, V 부피',null],
  ['sci','압력','P = F / A','F 누르는 힘, A 닿는 넓이',null],
  ['sci','훅의 법칙 (용수철)','F = k × x','k 용수철 상수, x 늘어난 길이','spring'],
  ['sci','옴의 법칙','V = I × R','V 전압(V), I 전류(A), R 저항(Ω)','ohm'],
  ['sci','전력과 전력량','P = V × I,  E = P × t','P 전력(W), t 시간',null],
  ['sci','열량','Q = c × m × ΔT','c 비열, m 질량, ΔT 온도 변화',null],
  ['sci','파동의 속력','v = f × λ','f 진동수(Hz), λ 파장(m)','wave'],
  ['sci','단진자의 주기','T = 2π√(L / g)','L 실의 길이, g 중력 가속도','pend'],
  ['sci','빛의 굴절 (스넬의 법칙)','n₁ sinθ₁ = n₂ sinθ₂','n 굴절률, θ 법선과 이루는 각','refr'],
  ['sci','수평으로 던진 물체와 비스듬히 던진 물체','x = v₀cosθ · t,  y = v₀sinθ · t − ½gt²','v₀ 처음 속력, θ 던진 각','proj'],
  ['sci','몰 농도','M = n / V','n 녹은 물질의 몰 수, V 용액의 부피(L)',null],
  ['sci','섭씨와 화씨','°F = °C × 9/5 + 32,  K = °C + 273.15','물이 어는 점 0°C = 32°F = 273.15 K',null]
];
function cvt(cat,v,from,to){
  if(cat.t){ var c=from===0?v:from===1?(v-32)*5/9:v-273.15; return to===0?c:to===1?c*9/5+32:c+273.15; }
  return v*cat.u[from][1]/cat.u[to][1];
}
function num(v){ if(!isFinite(v)) return '—'; if(v===0) return '0'; var a=Math.abs(v);
  if(a>=1e12||a<1e-6) return v.toExponential(6).replace(/\.?0+e/,'e').replace('e+','e'); var s=String(+v.toPrecision(10)); if(/e/.test(s)) return v.toExponential(6).replace(/\.?0+e/,'e').replace('e+','e');
  var p=s.split('.'); p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g,','); return p.join('.'); }
var back=null, tabNow='unit', cat=UNITS[0], from=2, to=1, val='1', q='', from0=null;
function el(t,c,x){ var e=document.createElement(t); if(c) e.className=c; if(x!=null) e.textContent=x; return e; }
function close(){ if(!back) return; document.removeEventListener('keydown',key,true); back.remove(); back=null; if(from0&&from0.focus&&document.contains(from0)) from0.focus(); }
function key(ev){ if(ev.key==='Escape'){ ev.preventDefault(); ev.stopPropagation(); close(); } }
function open(btn){
  close(); from0=btn||null; back=el('div','gpkback'); back.onclick=function(ev){ if(ev.target===back) close(); };
  var box=el('div','gpk cardBox'); box.setAttribute('role','dialog'); box.setAttribute('aria-modal','true'); box.setAttribute('aria-label',T('단위·공식'));
  var hd=el('div','gpkhd'), tt=el('div','gpkt'); tt.appendChild(el('h3','',T('단위·공식'))); tt.appendChild(el('span','',T('단위를 바꾸고 공식 카드를 찾아봐요')));
  var x=el('button','x','×'); x.type='button'; x.setAttribute('aria-label',T('닫기')); x.title=T('닫기'); x.onclick=close; hd.appendChild(tt); hd.appendChild(x); box.appendChild(hd);
  var sg=el('div','seg cardTabs'); [['unit','단위 변환'],['form','공식 카드']].forEach(function(t){ var b=el('button','',T(t[1])); b.type='button'; b.dataset.t=t[0]; b.onclick=function(){ tabNow=t[0]; draw(); }; sg.appendChild(b); });
  var body=el('div','gpkls cardBody'); body.id='cardBody'; box.appendChild(sg); box.appendChild(body); back.appendChild(box); document.body.appendChild(back); document.addEventListener('keydown',key,true); draw();
}
function draw(){
  Array.prototype.forEach.call(back.querySelectorAll('.cardTabs button'),function(b){ var on=b.dataset.t===tabNow; b.classList.toggle('on',on); b.setAttribute('aria-pressed',String(on)); });
  var b=$('cardBody'); b.innerHTML=''; if(tabNow==='unit') drawUnit(b); else drawForm(b);
}
function drawUnit(b){
  var kinds=el('div','seg'); UNITS.forEach(function(c){ var k=el('button','',T(c.n)); k.type='button'; k.classList.toggle('on',c===cat); k.onclick=function(){ cat=c; from=Math.min(from,c.u.length-1); to=Math.min(to,c.u.length-1); if(from===to) to=(from+1)%c.u.length; draw(); }; kinds.appendChild(k); });
  b.appendChild(kinds);
  var row=el('div','cardRow'), inp=el('input','cardNum'); inp.type='text'; inp.inputMode='decimal'; inp.value=val; inp.setAttribute('aria-label',T('바꿀 값')); inp.setAttribute('data-notr','');
  function sel(v,fn){ var s=el('select','cardSel'); cat.u.forEach(function(u,i){ var o=el('option','',T(u[0])); o.value=i; s.appendChild(o); }); s.value=v; s.onchange=function(){ fn(+s.value); upd(); }; s.setAttribute('data-notr',''); return s; }
  var sf=sel(from,function(v){ from=v; }), st=sel(to,function(v){ to=v; });
  sf.setAttribute('aria-label',T('처음 단위')); st.setAttribute('aria-label',T('바꿀 단위'));
  var sw=el('button','tbtn','⇄'); sw.type='button'; sw.title=T('단위 서로 바꾸기'); sw.setAttribute('aria-label',T('단위 서로 바꾸기'));
  sw.onclick=function(){ var t=from; from=to; to=t; sf.value=from; st.value=to; upd(); };
  row.appendChild(inp); row.appendChild(sf); row.appendChild(sw); row.appendChild(st); b.appendChild(row);
  var res=el('div','cardRes'); res.setAttribute('aria-live','polite'); res.setAttribute('data-notr',''); b.appendChild(res);
  var all=el('div','cardAll'); all.setAttribute('data-notr',''); b.appendChild(all); b.appendChild(el('p','cardNote',T('고른 종류의 모든 단위로 한꺼번에 바꾼 값이에요')));
  function n(){ var s=inp.value.replace(/,/g,'').trim(); return s===''||!isFinite(+s)?NaN:+s; }
  function upd(){ val=inp.value; var v=n(); all.innerHTML='';
    if(isNaN(v)){ res.textContent='—'; return; }
    res.textContent=num(v)+' '+T(cat.u[from][0])+' = '+num(cvt(cat,v,from,to))+' '+T(cat.u[to][0]);
    cat.u.forEach(function(u,i){ var r=el('div','cardAr'+(i===from?' on':'')); r.appendChild(el('span','',T(u[0]))); r.appendChild(el('b','',num(cvt(cat,v,from,i)))); all.appendChild(r); }); }
  inp.oninput=upd; upd(); setTimeout(function(){ inp.focus(); inp.select(); },30);
}
function drawForm(b){
  var s=el('input','cardSearch'); s.type='search'; s.placeholder=T('공식 이름이나 글자로 찾기'); s.setAttribute('aria-label',T('공식 찾기')); s.value=q; b.appendChild(s);
  var list=el('div','cardList'); b.appendChild(list);
  function paint(){ list.innerHTML=''; var qq=q.toLowerCase(), n=0;
    [['math','수학'],['sci','과학']].forEach(function(g){
      var fs=FORMULAS.filter(function(f){ return f[0]===g[0]&&(!qq||(f[1]+' '+T(f[1])+' '+f[2]+' '+T(f[2])+' '+f[3]+' '+T(f[3])).toLowerCase().indexOf(qq)>=0); }); if(!fs.length) return;
      list.appendChild(el('h4','cardH',T(g[1])));
      fs.forEach(function(f){ n++; var c=el('div','fcard'); c.appendChild(el('div','fn',T(f[1]))); var fm=el('div','ff',T(f[2])); fm.setAttribute('data-notr',''); c.appendChild(fm); c.appendChild(el('div','fv',T(f[3])));
        if(f[4]&&window.LAB&&LAB.list.some(function(e){ return e.id===f[4]; })){ var go=el('button','tbtn',T('이 실험 열기')); go.type='button'; go.onclick=function(){ close(); LAB.open(f[4]); }; c.appendChild(go); }
        list.appendChild(c); }); });
    if(!n) list.appendChild(el('div','gempty',T('맞는 공식이 없어요. 다른 말로 찾아보세요.'))); }
  s.oninput=function(){ q=s.value.trim(); paint(); }; paint();
}
window.LABCARDS={open:open,close:close,convert:function(c,v,f,t){ var k=UNITS.filter(function(u){ return u.id===c; })[0]; return k?cvt(k,v,f,t):NaN; },units:UNITS,formulas:FORMULAS};
document.addEventListener('DOMContentLoaded',function(){ var bt=$('cardBtn'); if(bt) bt.onclick=function(){ open(bt); }; });
})();
