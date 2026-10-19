#!/usr/bin/env node
/* FF777 1.5 (Premus continue) generated rows, checked against an independent JS oracle:
     raw/calc-2.jsonl     calculations in words / Korean number words -> one formula (calc task)
     raw/formula-5.jsonl  formulas with nested parentheses, values recomputed here and again by check.js
     raw/table-4.jsonl    tables with an exact size (구구단, 시간표, 번호 목록, 제곱표 ...)
     raw/ask-5.jsonl      made-up words / names / functions: say "I don't know", never invent a meaning
   node train/gen15.js ; then node train/check.js formula|table|ask <file> */
'use strict';
const fs=require('fs'), path=require('path');
const DIR=__dirname, RAW=path.join(DIR,'raw');
const E=require(path.join(DIR,'..','sheet','engine.js'));
let seed=20261019; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
const ri=(a,b)=>a+Math.floor(rnd()*(b-a+1));
const pick=a=>a[Math.floor(rnd()*a.length)];
const shuffle=a=>{ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const out=(f,rows)=>fs.writeFileSync(path.join(RAW,f),rows.map(r=>JSON.stringify(r)).join('\n')+'\n');

/* ---------- Korean number words (sino-Korean, up to 99,999,999) ---------- */
const D='영일이삼사오육칠팔구';
function seg(x){ let s=''; const d=[Math.floor(x/1000)%10,Math.floor(x/100)%10,Math.floor(x/10)%10,x%10], u=['천','백','십',''];
  d.forEach((v,i)=>{ if(!v) return; s+=(v===1&&i<3?'':D[v])+u[i]; }); return s; }
function toKo(n){ if(n===0) return '영'; const man=Math.floor(n/10000), rest=n%10000;
  return (man?(man===1?'':seg(man))+'만':'')+(rest?seg(rest):''); }
const wd=n=>toKo(n);                    // 351 -> 삼백오십일
const num=n=>String(n);
const sh=n=>rnd()<0.5&&n<100000000?wd(n):num(n);   // words or digits
const comma=n=>String(n).replace(/\B(?=(\d{3})+(?!\d))/g,',');

/* ---------- calc ---------- */
const evalF=f=>{ const doc={sheets:[{name:'S',cells:{},cw:{},rows:50,cols:10,cfs:[],charts:[]}],active:0}; doc.sheets[0].cells[E.K(0,0)]={v:f}; const g=new E.Engine(doc); return g.value(0,0,0); };
function calcRows(){
  const rows=[], seen=new Set();
  const add=(q,formula,js,cols)=>{ const key=q+'|'+(cols||''); if(seen.has(key)) return;
    if(js!==undefined){ const v=evalF(formula); if(typeof v!=='number'||Math.abs(v-js)>1e-6*Math.max(1,Math.abs(js))) throw new Error('calc oracle '+q+' '+formula+' '+v+' vs '+js); }
    else { E.parse(formula.slice(1)); }
    const o=(formula.match(/\(/g)||[]).length, c=(formula.match(/\)/g)||[]).length; if(o!==c) throw new Error('paren '+formula);
    seen.add(key); rows.push({task:'calc',cols:cols||'',q,formula}); };
  const big=()=>pick([ri(2,99),ri(100,999),ri(100,999),ri(1000,9999),ri(10000,99999)]);
  const mid=()=>pick([ri(2,99),ri(100,999),ri(100,999),ri(1000,9999)]);
  let tries=0;
  while(rows.length<190&&tries++<5000){ // squares and cubes, cube roots avoided
    const n=pick([ri(11,99),ri(100,999),ri(100,999),ri(1000,9999)]), w=sh(n);
    const k=ri(0,5);
    if(k===0) add(`${w}의 제곱`,`=${n}^2`,n*n);
    else if(k===1) add(`${w} 제곱`,`=${n}^2`,n*n);
    else if(k===2) add(`${w}의 세제곱`,`=${n}^3`,n**3);
    else if(k===3) add(`${w}를 제곱한 값`,`=${n}^2`,n*n);
    else if(k===4) add(`${n}의 제곱근`,`=SQRT(${n})`,Math.sqrt(n));
    else { const m=ri(2,9); add(`${w}의 ${wd(m)}제곱`,`=${n}^${m}`,n**m); }
  }
  tries=0;
  while(rows.length<400&&tries++<9000){ // plain operations
    const a=big(), b=mid(), wa=sh(a), wb=sh(b), k=ri(0,9), m=ri(2,9);
    if(k===0) add(`${wa} 더하기 ${wb}`,`=${a}+${b}`,a+b);
    else if(k===1) add(`${wa} 빼기 ${wb}`,`=${a}-${b}`,a-b);
    else if(k===2) add(`${wa} 곱하기 ${wb}`,`=${a}*${b}`,a*b);
    else if(k===3){ const c=a*b; add(`${sh(c)} 나누기 ${wb}`,`=${c}/${b}`,c/b); }
    else if(k===4) add(`${wa}에서 ${wb}를 뺀 값`,`=${a}-${b}`,a-b);
    else if(k===5) add(`${wa}과 ${wb}의 합`,`=${a}+${b}`,a+b);
    else if(k===6) add(`${wa}과 ${wb}의 곱`,`=${a}*${b}`,a*b);
    else if(k===7) add(`${wa}와 ${wb}의 차`,`=ABS(${a}-${b})`,Math.abs(a-b));
    else if(k===8) add(`${wa}를 ${wd(m)}로 나눈 나머지`,`=MOD(${a},${m})`,a%m);
    else add(`${wa}에 ${wb}를 더하고 ${wd(m)}를 곱하기`,`=(${a}+${b})*${m}`,(a+b)*m);
  }
  tries=0;
  while(rows.length<480&&tries++<9000){ // percent, discount, tax, two steps, parentheses
    const a=ri(1,200)*pick([10,50,100,1000]), p=pick([5,10,12,15,20,25,30,40,50,60,70,80,90]), k=ri(0,6);
    if(k===0) add(`${a}의 ${p}%`,`=${a}*${p}%`,a*p/100);
    else if(k===1) add(`${wd(a)}의 ${p}퍼센트`,`=${a}*${p}%`,a*p/100);
    else if(k===2) add(`${a}원에서 ${p}% 할인한 가격`,`=${a}*(1-${p}%)`,a*(1-p/100));
    else if(k===3) add(`${a}원에 ${p}% 더한 값`,`=${a}*(1+${p}%)`,a*(1+p/100));
    else if(k===4){ const b=ri(2,40), c=ri(1,9)*10; add(`${a} 곱하기 ${b} 더하기 ${c}`,`=${a}*${b}+${c}`,a*b+c); }
    else if(k===5){ const b=ri(2,20), c=ri(2,20); add(`(${a}+${b})*${c}`,`=(${a}+${b})*${c}`,(a+b)*c); }
    else { const b=ri(2,20), c=ri(2,9); add(`${a}에서 ${b}를 빼고 ${c}로 나누기`,`=(${a}-${b})/${c}`,(a-b)/c); }
  }
  // with columns (parse + paren check only; the engine checks them in the formula task too)
  const colsets=[['A=이름, B=점수',['B']],['A=이름, B=가격, C=수량',['B','C']],['A=품목, B=가격',['B']],['A=날짜, B=지출',['B']],['A=반, B=평균, C=인원',['B','C']],['A=이름, B=국어, C=수학',['B','C']]];
  const colTpl=[
    (c)=>[`${c}열 합계`,`=SUM(${c}:${c})`],
    (c)=>[`${c}열 평균`,`=AVERAGE(${c}:${c})`],
    (c)=>[`${c}열 최댓값과 최솟값의 차이`,`=MAX(${c}:${c})-MIN(${c}:${c})`],
    (c)=>[`${c}열 합계에서 10% 빼기`,`=SUM(${c}:${c})*(1-10%)`],
    (c)=>[`${c}열 합계에 부가세 10% 더하기`,`=SUM(${c}:${c})*(1+10%)`],
    (c)=>{ const n=ri(2,9)*10; return [`${c}열 평균에 ${wd(n)} 더하기`,`=AVERAGE(${c}:${c})+${n}`]; },
    (c)=>{ const n=ri(2,9); return [`${c}열 평균을 소수 ${n>5?'둘':'첫'}째 자리까지 반올림`,`=ROUND(AVERAGE(${c}:${c}),${n>5?2:1})`]; },
    (c)=>{ const n=ri(2,9)*100; return [`${c}열 합계가 ${wd(n)} 넘으면 1 아니면 0`,`=IF(SUM(${c}:${c})>${n},1,0)`]; },
    (c)=>[`${c}열 개수`,`=COUNT(${c}:${c})`],
    (c)=>{ const n=ri(2,9)*10; return [`${c}열에서 ${n} 넘는 칸 개수`,`=COUNTIF(${c}:${c},">${n}")`]; }
  ];
  tries=0;
  while(rows.length<584&&tries++<9000){
    const [cols,cs]=pick(colsets), c=pick(cs), [q,f]=pick(colTpl)(c); add(q,f,undefined,cols);
    if(rnd()<0.4&&cs.length>1){ const [a,b]=cs; const t=ri(0,3);
      if(t===0) add(`${a}열과 ${b}열 곱해서 합계`,`=SUMPRODUCT(${a}:${a},${b}:${b})`,undefined,cols);
      else if(t===1) add(`2행의 ${a}와 ${b} 곱하기`,`=${a}2*${b}2`,undefined,cols);
      else if(t===2) add(`${a}2 곱하기 ${b}2를 반올림해서 백 원 단위로`,`=ROUND(${a}2*${b}2,-2)`,undefined,cols);
      else add(`${a}열 합계를 ${b}열 합계로 나누기`,`=SUM(${a}:${a})/SUM(${b}:${b})`,undefined,cols); }
  }
  return rows;
}

/* ---------- formula: random tables, oracle in JS ---------- */
const NAMES=['민지','준호','서연','지훈','하은','도윤','수아','예준','지우','서준','하린','시우','유나','주원','채원','건우','소윤','현우','다은','태양'];
const SCH=['국어','영어','수학','과학','사회'];
const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
const r1=(x,k)=>Math.round(x*10**k)/10**k;
const colL=i=>String.fromCharCode(65+i);
function formulaRows(){
  const rows=[], seen=new Set();
  const push=(table,cell,q,formula,explain,expect)=>{
    const key=q+'|'+formula+'|'+JSON.stringify(table); if(seen.has(key)) return; seen.add(key);
    const o=(formula.match(/\(/g)||[]).length, c=(formula.match(/\)/g)||[]).length; if(o!==c) throw new Error('paren '+formula);
    rows.push({table,at:'A1',cell,q,formula,explain,expect}); };
  let guard=0;
  while(rows.length<400&&guard++<200000){
    const kind=ri(0,2);
    if(kind<2){ // score table: name + 3..4 subjects
      const subs=shuffle(SCH).slice(0,ri(2,4)), n=ri(4,9), names=shuffle(NAMES).slice(0,n);
      const data=names.map(nm=>[nm,...subs.map(()=>ri(45,100))]);
      const table=[['이름',...subs],...data]; const last=n+1, tc=colL(subs.length+1); // empty column after the table
      const cellBelow=`B${last+2}`, cellRight=`${tc}2`;
      const ci=ri(0,subs.length-1), c=colL(ci+1), col=data.map(r=>r[ci+1]), sn=subs[ci];
      const rng=`${c}2:${c}${last}`;
      const T=ri(0,22);
      if(T===0) push(table,cellBelow,`${sn} 평균을 소수 첫째 자리까지`,`=ROUND(AVERAGE(${rng}),1)`,`${sn} 평균을 소수 첫째 자리까지 반올림해요.`,r1(avg(col),1));
      else if(T===1){ const t=pick([60,70,80]); push(table,cellBelow,`${sn} 평균이 ${t} 이상이면 합격 아니면 불합격`,`=IF(AVERAGE(${rng})>=${t},"합격","불합격")`,`평균이 ${t} 이상인지 보고 합격 여부를 보여줘요.`,avg(col)>=t?'합격':'불합격'); }
      else if(T===2){ const i=ri(0,n-1), a=pick([60,70,80]); push(table,cellRight,`${names[i]}의 총점이 ${a*subs.length} 이상이면 통과 아니면 재시험`,`=IF(SUM(B${i+2}:${tc==='B'?'B':colL(subs.length)}${i+2})>=${a*subs.length},"통과","재시험")`,`총점이 기준 이상이면 통과로 보여줘요.`,data[i].slice(1).reduce((x,y)=>x+y,0)>=a*subs.length?'통과':'재시험'); }
      else if(T===3){ const t=pick([60,70,80,90]); push(table,cellBelow,`${sn} ${t}점 이상인 사람 수`,`=COUNTIF(${rng},">=${t}")`,`${sn}이 ${t}점 이상인 사람 수를 세요.`,col.filter(x=>x>=t).length); }
      else if(T===4) push(table,cellBelow,`${sn} 최고점과 최저점의 차이`,`=MAX(${rng})-MIN(${rng})`,`최고점에서 최저점을 뺀 값이에요.`,Math.max(...col)-Math.min(...col));
      else if(T===5){ const i=ri(0,n-1); push(table,cellRight,`${names[i]} ${sn}이 반에서 몇 등인지`,`=RANK(${c}${i+2},${c}$2:${c}$${last})`,`${sn} 점수의 등수를 구해요.`,1+col.filter(x=>x>col[i]).length); }
      else if(T===6) push(table,cellBelow,`${sn} 평균을 정수로 내림`,`=INT(AVERAGE(${rng}))`,`${sn} 평균에서 소수점 아래를 버려요.`,Math.floor(avg(col)));
      else if(T===7){ const i=ri(0,n-1), a=pick([90,80,70]); push(table,cellRight,`${names[i]} ${sn}을 90 이상 A, 80 이상 B, 70 이상 C, 나머지 D로`,`=IF(${c}${i+2}>=90,"A",IF(${c}${i+2}>=80,"B",IF(${c}${i+2}>=70,"C","D")))`,`점수 구간에 따라 A~D를 보여줘요.`,col[i]>=90?'A':col[i]>=80?'B':col[i]>=70?'C':'D'); }
      else if(T===8){ const s=[...col].sort((x,y)=>y-x); push(table,cellBelow,`${sn} 상위 두 명 평균`,`=AVERAGE(LARGE(${rng},1),LARGE(${rng},2))`,`가장 높은 두 점수의 평균이에요.`,(s[0]+s[1])/2); }
      else if(T===9){ const i=ri(0,n-1); push(table,cellRight,`${names[i]}의 평균을 소수 둘째 자리까지 반올림`,`=ROUND(AVERAGE(B${i+2}:${colL(subs.length)}${i+2}),2)`,`한 사람의 과목 평균을 소수 둘째 자리까지 구해요.`,r1(avg(data[i].slice(1)),2)); }
      else if(T===10){ const t=pick([60,70]); push(table,cellBelow,`${sn} ${t}점 이상인 사람의 비율을 퍼센트로`,`=ROUND(COUNTIF(${rng},">=${t}")/COUNT(${rng})*100,1)`,`${t}점 이상인 비율을 퍼센트로 보여줘요.`,r1(col.filter(x=>x>=t).length/col.length*100,1)); }
      else if(T===11) push(table,cellBelow,`${sn} 평균이 전체 최고점에서 얼마나 모자란지`,`=MAX(${rng})-AVERAGE(${rng})`,`최고점과 평균의 차이예요.`,Math.max(...col)-avg(col));
      else if(T===12){ const t=pick([60,70,80]); push(table,cellBelow,`${sn} ${t}점 미만인 사람의 평균 점수`,`=IFERROR(AVERAGEIF(${rng},"<${t}"),0)`,`기준 미만인 점수들의 평균이고 없으면 0이에요.`,(()=>{ const f=col.filter(x=>x<t); return f.length?avg(f):0; })()); }
      else if(T===13){ const k=ri(1,Math.min(3,n)); const s=[...col].sort((x,y)=>y-x); push(table,cellBelow,`${sn} 상위 ${k}명 점수 합계`,k===1?`=LARGE(${rng},1)`:`=SUM(${Array.from({length:k},(_,j)=>`LARGE(${rng},${j+1})`).join(',')})`,`상위 ${k}명 점수를 더해요.`,s.slice(0,k).reduce((x,y)=>x+y,0)); }
      else if(T===14){ const a=pick([60,70]), b=pick([60,70,80]); const i1=ci, i2=(ci+1)%subs.length; if(i1===i2) continue; const c2=colL(i2+1); const i=ri(0,n-1);
        push(table,cellRight,`${names[i]}의 ${subs[i1]}이 ${a} 이상이고 ${subs[i2]}가 ${b} 이상이면 통과, 아니면 보충`,`=IF(AND(${c}${i+2}>=${a},${c2}${i+2}>=${b}),"통과","보충")`,`두 과목이 모두 기준 이상이면 통과예요.`,data[i][i1+1]>=a&&data[i][i2+1]>=b?'통과':'보충'); }
      else if(T===15){ const i1=ci, i2=(ci+1)%subs.length; if(i1===i2) continue; const c2=colL(i2+1), a=pick([60,70,80]); push(table,cellBelow,`${subs[i1]} ${a}점 이상 또는 ${subs[i2]} ${a}점 이상인 사람 수`,`=COUNTIF(${rng},">=${a}")+COUNTIF(${c2}2:${c2}${last},">=${a}")-COUNTIFS(${rng},">=${a}",${c2}2:${c2}${last},">=${a}")`,`두 조건 중 하나라도 맞는 사람을 겹치지 않게 세요.`,data.filter(r=>r[i1+1]>=a||r[i2+1]>=a).length); }
      else if(T===16) push(table,cellBelow,`${sn} 표준편차를 소수 첫째 자리까지`,`=ROUND(STDEV(${rng}),1)`,`점수가 얼마나 퍼져 있는지 보여줘요.`,(()=>{ const m=avg(col); return r1(Math.sqrt(col.reduce((x,y)=>x+(y-m)**2,0)/(col.length-1)),1); })());
      else if(T===17){ const w=ri(2,4); push(table,cellBelow,`${sn} 평균에 ${w}점 가산점을 더하되 100점을 넘지 않게`,`=MIN(100,AVERAGE(${rng})+${w})`,`가산점을 더한 평균이고 최대 100이에요.`,Math.min(100,avg(col)+w)); }
      else if(T===18){ const i=ri(0,n-1); push(table,cellRight,`${names[i]}의 가장 높은 과목 점수와 가장 낮은 과목 점수의 평균`,`=AVERAGE(MAX(B${i+2}:${colL(subs.length)}${i+2}),MIN(B${i+2}:${colL(subs.length)}${i+2}))`,`한 사람의 최고점과 최저점을 평균내요.`,(Math.max(...data[i].slice(1))+Math.min(...data[i].slice(1)))/2); }
      else if(T===19){ const t=pick([60,70,80]); push(table,cellBelow,`${sn} ${t}점 이상인 사람이 몇 명인지 '○명'으로`,`=COUNTIF(${rng},">=${t}")&"명"`,`기준 이상인 사람 수 뒤에 '명'을 붙여요.`,col.filter(x=>x>=t).length+'명'); }
      else if(T===20) push(table,cellBelow,`${sn} 합계의 10%를 반올림해서 정수로`,`=ROUND(SUM(${rng})*10%,0)`,`합계의 10%를 정수로 반올림해요.`,Math.round(col.reduce((x,y)=>x+y,0)*0.1));
      else if(T===21){ const i=ri(0,n-1); push(table,cellRight,`${names[i]} ${sn}과 평균의 차이 (절댓값)`,`=ABS(${c}${i+2}-AVERAGE(${rng}))`,`점수와 평균이 얼마나 다른지 보여줘요.`,Math.abs(col[i]-avg(col))); }
      else { const t=pick([60,70]); push(table,cellBelow,`${sn} ${t}점 미만이면 빈칸 아니면 평균`,`=IF(AVERAGE(${rng})<${t},"",ROUND(AVERAGE(${rng}),1))`,`평균이 기준 미만이면 비워 두고 아니면 평균을 보여줘요.`,avg(col)<t?'':r1(avg(col),1)); }
    } else { // sales: item, price, qty
      const items=shuffle(['사과','귤','연필','공책','지우개','우유','빵','주스','과자','볼펜','풀','가위']).slice(0,ri(4,8));
      const data=items.map(it=>[it,ri(5,60)*100,ri(1,30)]); const table=[['상품','가격','수량'],...data]; const last=data.length+1, cb=`B${last+2}`, cr='D2';
      const P=data.map(r=>r[1]), Q=data.map(r=>r[2]);
      const T=ri(0,10);
      if(T===0) push(table,cb,`가격 곱하기 수량의 총합`,`=SUMPRODUCT(B2:B${last},C2:C${last})`,`가격과 수량을 곱해서 모두 더해요.`,data.reduce((x,r)=>x+r[1]*r[2],0));
      else if(T===1) push(table,cb,`총 매출에 부가세 10%를 더한 금액을 정수로`,`=ROUND(SUMPRODUCT(B2:B${last},C2:C${last})*(1+10%),0)`,`총 매출에 부가세를 더해서 정수로 반올림해요.`,Math.round(data.reduce((x,r)=>x+r[1]*r[2],0)*1.1));
      else if(T===2){ const i=ri(0,data.length-1); push(table,cr,`${data[i][0]} 매출을 천 원 단위로 반올림`,`=ROUND(B${i+2}*C${i+2},-3)`,`가격과 수량을 곱해 천 원 단위로 반올림해요.`,Math.round(data[i][1]*data[i][2]/1000)*1000); }
      else if(T===3){ const t=pick([1000,2000,3000]); push(table,cb,`가격이 ${t}원 이상인 상품의 수량 합계`,`=SUMIF(B2:B${last},">=${t}",C2:C${last})`,`가격이 기준 이상인 상품의 수량을 더해요.`,data.filter(r=>r[1]>=t).reduce((x,r)=>x+r[2],0)); }
      else if(T===4) push(table,cb,`평균 가격을 정수로 반올림`,`=ROUND(AVERAGE(B2:B${last}),0)`,`가격의 평균을 정수로 반올림해요.`,Math.round(avg(P)));
      else if(T===5){ const i=ri(0,data.length-1); push(table,cr,`${data[i][0]} 수량이 10개 넘으면 10% 할인 가격 아니면 그대로`,`=IF(C${i+2}>10,B${i+2}*(1-10%),B${i+2})`,`수량이 많으면 10% 할인한 가격을 보여줘요.`,data[i][2]>10?data[i][1]*0.9:data[i][1]); }
      else if(T===6) push(table,cb,`가장 비싼 상품 가격과 가장 싼 상품 가격의 평균`,`=AVERAGE(MAX(B2:B${last}),MIN(B2:B${last}))`,`최고가와 최저가의 평균이에요.`,(Math.max(...P)+Math.min(...P))/2);
      else if(T===7){ const i=ri(0,data.length-1); push(table,cr,`${data[i][0]}의 수량이 전체 수량에서 차지하는 비율을 퍼센트로, 소수 첫째 자리까지`,`=ROUND(C${i+2}/SUM(C2:C${last})*100,1)`,`전체에서 차지하는 비율을 퍼센트로 보여줘요.`,r1(data[i][2]/Q.reduce((x,y)=>x+y,0)*100,1)); }
      else if(T===8){ const t=pick([5,10]); push(table,cb,`수량이 ${t}개 이하인 상품 개수`,`=COUNTIF(C2:C${last},"<=${t}")`,`수량이 기준 이하인 상품을 세요.`,Q.filter(x=>x<=t).length); }
      else if(T===9){ const t=pick([2000,3000]); push(table,cb,`가격이 ${t}원 이상이고 수량이 5개 이상인 상품 수`,`=COUNTIFS(B2:B${last},">=${t}",C2:C${last},">=5")`,`두 조건을 모두 만족하는 상품을 세요.`,data.filter(r=>r[1]>=t&&r[2]>=5).length); }
      else push(table,cb,`수량 합계 대비 가장 많이 팔린 상품의 비율을 퍼센트로 정수 반올림`,`=ROUND(MAX(C2:C${last})/SUM(C2:C${last})*100,0)`,`가장 많이 팔린 상품이 차지하는 비율이에요.`,Math.round(Math.max(...Q)/Q.reduce((x,y)=>x+y,0)*100));
    }
  }
  return rows;
}

/* ---------- table: exact sizes ---------- */
function tableRows(){
  const rows=[]; const add=(q,r)=>rows.push({q,rows:r});
  for(let n=2;n<=9;n++){ // 구구단
    add(pick([`${n}단 구구단 표`,`구구단 ${n}단`,`${n}단 만들어줘`,`${n}단 곱셈표 만들어 주세요`]),[['식','값'],...Array.from({length:9},(_,i)=>[`${n}×${i+1}`,n*(i+1)])]);
    add(`${n}단을 곱하는 수, 결과 두 칸으로`,[['곱하는 수','결과'],...Array.from({length:9},(_,i)=>[i+1,n*(i+1)])]);
  }
  for(let a=2;a<=8;a++) add(`${a}단부터 ${a+1}단까지 구구단 표`,[['곱하는 수',`${a}단`,`${a+1}단`],...Array.from({length:9},(_,i)=>[i+1,a*(i+1),(a+1)*(i+1)])]);
  add('구구단 2단부터 9단까지 한 표에',[['곱하는 수',...Array.from({length:8},(_,j)=>`${j+2}단`)],...Array.from({length:9},(_,i)=>[i+1,...Array.from({length:8},(_,j)=>(j+2)*(i+1))])]);
  add('1단부터 5단까지 구구단 표',[['곱하는 수',...Array.from({length:5},(_,j)=>`${j+1}단`)],...Array.from({length:9},(_,i)=>[i+1,...Array.from({length:5},(_,j)=>(j+1)*(i+1))])]);
  const days=['월','화','수','목','금'];
  for(let p=3;p<=8;p++){ // timetable
    add(pick([`월~금 ${p}교시까지 시간표 (빈칸으로)`,`${p}교시 시간표 표 만들어줘`,`월화수목금 ${p}교시 빈 시간표`]),[['교시',...days],...Array.from({length:p},(_,i)=>[i+1,'','','','',''])]);
  }
  const subj=['국어','수학','영어','과학','사회','체육','음악','미술','도덕','기술'];
  for(let t=0;t<40;t++){ const p=ri(4,6), g=[['교시',...days]]; for(let i=0;i<p;i++) g.push([i+1,...days.map(()=>pick(subj))]); add(`월~금 ${p}교시 시간표 채워서 만들어줘`,g); }
  for(let n=5;n<=30;n++){ // numbered lists
    const names=shuffle(NAMES.concat(['지안','서현','현서','도현','은우','아윤','가온','하준','이든','라희'])).slice(0,n);
    add(`우리 반 ${n}명 명단 만들어줘. 번호와 이름`,[['번호','이름'],...names.map((x,i)=>[i+1,x])]);
    add(`${n}명 출석부 (번호, 이름, 출석 칸은 비워 둬)`,[['번호','이름','출석'],...names.map((x,i)=>[i+1,x,''])]);
  }
  for(let n=4;n<=20;n+=2){ add(`1부터 ${n}까지 제곱 표`,[['수','제곱'],...Array.from({length:n},(_,i)=>[i+1,(i+1)**2])]);
    add(`1부터 ${n}까지 수와 두 배`,[['수','두 배'],...Array.from({length:n},(_,i)=>[i+1,(i+1)*2])]); }
  for(const n of [5,10,20]) add(`1부터 ${n}까지 수, 제곱, 세제곱 표`,[['수','제곱','세제곱'],...Array.from({length:n},(_,i)=>[i+1,(i+1)**2,(i+1)**3])]);
  add('요일별 운동 기록 표 (월~일, 시간은 비워서)',[['요일','운동','시간(분)'],...['월','화','수','목','금','토','일'].map(d=>[d,'',''])]);
  add('12개월 용돈 기록표 (월, 수입, 지출 빈칸)',[['월','수입','지출'],...Array.from({length:12},(_,i)=>[`${i+1}월`,'',''])]);
  add('12개월 이름과 일수 표',[['월','일수'],...[31,28,31,30,31,30,31,31,30,31,30,31].map((d,i)=>[`${i+1}월`,d])]);
  add('일주일 요일 표',[['번호','요일'],...['월','화','수','목','금','토','일'].map((d,i)=>[i+1,d])]);
  add('태양계 행성 8개 이름과 순서',[['순서','행성'],...['수성','금성','지구','화성','목성','토성','천왕성','해왕성'].map((x,i)=>[i+1,x])]);
  add('계절 4개와 해당 달',[['계절','달'],['봄','3~5월'],['여름','6~8월'],['가을','9~11월'],['겨울','12~2월']]);
  for(const n of [6,9,12]){ const st=shuffle(['민지','준호','서연','지훈','하은','도윤','수아','예준','지우','서준','하린','시우']).slice(0,n);
    add(`${n}명 점수 입력표 (이름, 국어, 영어, 수학 점수는 빈칸)`,[['이름','국어','영어','수학'],...st.map(x=>[x,'','',''])]); }
  for(const [r,c] of [[3,3],[4,4],[5,3],[6,2],[5,5]]) add(`${r}행 ${c}열짜리 빈 표 (머리글은 1열, 2열 …)`,[Array.from({length:c},(_,i)=>`${i+1}열`),...Array.from({length:r},()=>Array(c).fill(''))]);
  for(const n of [4,6,8,10]) add(`1주차부터 ${n}주차까지 독서 기록표 (주차, 책 제목, 쪽수 빈칸)`,[['주차','책 제목','쪽수'],...Array.from({length:n},(_,i)=>[`${i+1}주차`,'',''])]);
  for(const n of [7,10,14]) add(`1일부터 ${n}일까지 날짜와 요일 칸 만들어줘`,[['일','요일'],...Array.from({length:n},(_,i)=>[`${i+1}일`,''])]);
  for(const n of [3,5,10]) add(`학급 투표 결과표 후보 ${n}명 (후보, 득표수는 빈칸)`,[['후보','득표수'],...NAMES.slice(0,n).map(x=>[x,''])]);
  for(const f of [10,12,16]) add(`섭씨 0도부터 ${f*5}도까지 5도 간격으로 섭씨와 화씨 표`,(()=>{ const r=[['섭씨','화씨']]; for(let c=0;c<=f*5;c+=5) r.push([c,c*9/5+32]); return r; })());
  for(const n of [3,5,7,9,11]) add(`1부터 ${n*10}까지 10씩 건너뛰며 쓴 표 (수, 절반)`,[['수','절반'],...Array.from({length:n},(_,i)=>[(i+1)*10,(i+1)*5])]);
  return rows;
}

/* ---------- unknown words ---------- */
function unknownRows(){
  const rows=[], seen=new Set();
  const SYL='가갸거겨고교구규그기나냐너녀노뇨누뉴느니다댜더뎌도됴두듀드디라랴러려로료루류르리마먀머며모묘무뮤므미바뱌버벼보뵤부뷰브비사샤서셔소쇼수슈스시아야어여오요우유으이자쟈저져조죠주쥬즈지차챠처쳐초쵸추츄츠치카캬커켜코쿄쿠큐크키타탸터텨토툐투튜트티파퍄퍼펴포표푸퓨프피하햐허혀호효후휴흐히뿌쀼꾸뀨끄뽀쁘떼뚜쏘쓰짜쪼찌콩롱뽕탕땡똥팅링냥쿵덩';
  const fake=()=>{ let w=''; const n=ri(2,4); for(let i=0;i<n;i++) w+=SYL[ri(0,SYL.length-1)]; return w; };
  const fakeEn=()=>{ const cs='bcdfghjklmnpqrstvwxz', vs='aeiou'; let w=''; const n=ri(2,3); for(let i=0;i<n;i++) w+=cs[ri(0,cs.length-1)]+vs[ri(0,4)]+(rnd()<0.4?cs[ri(0,cs.length-1)]:''); return w; };
  const fakeName=()=>pick(['김','이','박','최','정','강','조','윤'])+fake().slice(0,2);
  const fakeFn=()=>{ const cs='BCDFGHJKLMNPQRSTVWXZ', vs='AEIOU'; let w=''; for(let i=0;i<ri(2,3);i++) w+=cs[ri(0,cs.length-1)]+vs[ri(0,4)]+cs[ri(0,cs.length-1)]; return w; };
  const Q=[w=>`${w}`,w=>`${w}?`,w=>`${w} 뭐야`,w=>`${w}이 뭐예요?`,w=>`${w}가 무슨 뜻이야`,w=>`${w} 알아?`,w=>`${w}에 대해 알려줘`,w=>`${w} 설명해줘`,w=>`"${w}"의 뜻은?`,w=>`${w}가 뭔지 궁금해요`,w=>`${w}이란?`,w=>`${w} 정의 좀`,w=>`혹시 ${w} 알아요?`,w=>`${w}의 유래가 뭐야`,w=>`${w}를 한 문장으로 설명해줘`,w=>`${w} 뜻 알려주세요`];
  const A=[w=>`'${w}'은 제가 모르는 말이에요. 어디서 보셨는지 알려 주시면 그에 맞춰 도와드릴게요.`,
    w=>`'${w}'가 무엇인지는 제가 알지 못해요. 뜻을 지어내지 않을게요. 어떤 상황에서 쓰는 말인지 알려 주실래요?`,
    w=>`죄송하지만 '${w}'는 처음 봐요. 정확한 뜻을 모르는데 추측해서 답하면 틀릴 수 있어서, 알려 주시면 같이 살펴볼게요.`,
    w=>`'${w}'에 대한 정보는 저한테 없어요. 맞춤법이 다르거나 다른 말을 말씀하신 걸 수도 있으니 한 번 더 알려 주세요.`,
    w=>`제가 아는 단어 중에는 '${w}'가 없어요. 어디서 들으셨는지 알려 주시면 시트나 표 정리처럼 제가 할 수 있는 일을 도와드릴게요.`,
    w=>`'${w}'는 잘 모르겠어요. 없는 뜻을 만들어 드리기보다, 원래 알고 싶으셨던 내용을 조금 더 말씀해 주세요.`];
  let guard=0;
  while(rows.length<340&&guard++<5000){
    const w=fake(); if(seen.has(w)) continue; seen.add(w);
    const q=pick(Q)(w); rows.push({table:null,q,answer:pick(A)(w)});
  }
  const AE=[w=>`'${w}'는 제가 모르는 말이에요. 어디서 보셨는지, 어떤 뜻으로 쓰시는지 알려 주세요.`,w=>`'${w}'가 무엇인지 저는 알지 못해요. 지어서 답하지 않을게요. 문장 속에서 어떻게 쓰였는지 알려 주실래요?`];
  for(let i=0;i<30;i++){ const w=fakeEn(); if(seen.has(w)) continue; seen.add(w); { const q=pick([`${w} 뜻이 뭐야`,`what is ${w}?`,`${w}?`,`${w} 알아?`,`do you know ${w}?`]); const en=/^[a-z ?]+$/.test(q)||/^(what|do)/.test(q); rows.push({table:null,q,answer:en?pick([`I don't know what '${w}' means. I won't make up an answer. Could you tell me where you saw it?`,`'${w}' is not a word I know. Tell me more about where it came from and I will help as best I can.`]):pick(AE)(w)}); } }
  for(let i=0;i<20;i++){ const n=fakeName(); if(seen.has(n)) continue; seen.add(n); rows.push({table:null,q:pick([`${n} 선수 누구야`,`${n}이 누구예요?`,`${n} 알아?`,`${n}라는 사람 소개해줘`]),answer:pick([`'${n}'라는 이름은 제가 아는 사람이 아니에요. 누구인지 알려 주시면 그에 맞춰 도와드릴게요.`,`'${n}'에 대해서는 알고 있는 정보가 없어요. 없는 내용을 지어내지 않을게요. 어떤 분인지 알려 주실래요?`])}); }
  for(let i=0;i<25;i++){ const f=fakeFn(); if(seen.has(f)) continue; seen.add(f); rows.push({table:null,q:pick([`=${f}() 함수 뭐야`,`${f} 함수 쓰는 법`,`시트에서 ${f} 어떻게 써?`,`${f} 함수가 뭐야?`]),answer:pick([`${f}라는 함수는 Fry Sheet에 없어요. 합계는 SUM, 평균은 AVERAGE, 조건 개수는 COUNTIF처럼 있는 함수로 도와드릴게요. 하려는 계산을 알려 주세요.`,`'${f}' 함수는 제가 알지 못하고 시트에도 없는 것 같아요. 어떤 계산을 하려고 하시는지 알려 주시면 맞는 함수를 찾아 드릴게요.`])}); }
  return rows;
}

const calc=calcRows(), formula=formulaRows(), table=tableRows(), unk=unknownRows();
out('calc-2.jsonl',calc); out('formula-5.jsonl',formula); out('table-4.jsonl',table); out('ask-5.jsonl',unk);
console.log({calc:calc.length,formula:formula.length,table:table.length,unknown:unk.length});
console.log(calc.slice(0,3),calc[200],calc[300],calc[500]);
