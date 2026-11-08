#!/usr/bin/env node
/* FF777 extra data (2026-11-08): ~50,000 rows whose answers are COMPUTED, not guessed.
   Sheet formula, graph, table, unit conversion, calc and plain arithmetic. Every formula is evaluated by the site's own engine (sheet/engine.js) and compared with an
   independently computed number; every table has exactly the asked shape; every unit answer is converted with the engine's CONVERT table.
   node train/gen22.js            -> train/raw/gen22-{formula,graph,table,unit,calc,math}.jsonl (raw formats of check.js / build files)
   node train/gen22.js --check    -> also runs check.js on the raw files and writes data/v22-extra.jsonl (+ data/v22-extra-stats.json) with the passing rows only */
'use strict';
const fs=require('fs'), path=require('path'), cp=require('child_process');
const DIR=__dirname, RAW=path.join(DIR,'raw'), OUT=path.join(DIR,'data'), ROOT=path.join(DIR,'..');
const E=require(path.join(ROOT,'sheet','engine.js'));
const N={formula:+process.env.NF||16000, graph:+process.env.NG||8000, table:+process.env.NT||8000, unit:+process.env.NU||7000, calc:+process.env.NC||6000, math:+process.env.NM||5000};
let seed=20261108; const rnd=()=>{ seed=(seed+0x6D2B79F5)|0; let t=Math.imul(seed^(seed>>>15),1|seed); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; };
const int=(a,b)=>a+Math.floor(rnd()*(b-a+1)), pick=a=>a[Math.floor(rnd()*a.length)], chance=p=>rnd()<p;
const shuffle=a=>{ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const sample=(a,n)=>shuffle(a).slice(0,n);
const col=i=>E.colName(i);                       // 0 -> A
const r2=x=>+(+x).toFixed(10);
const fmtNum=x=>String(+(+x).toFixed(2));


/* Korean particles: write 은(는) 이(가) 을(를) 와(과) (으)로 이랑 (이)면 after any word; this picks the right one from the last sound */
function batch(tok){ const ch=tok.slice(-1), code=ch.charCodeAt(0);
  if(code>=0xAC00&&code<=0xD7A3) return (code-0xAC00)%28;
  if(/[0-9]/.test(ch)) return '013678'.indexOf(ch)>=0?(('178'.indexOf(ch)>=0)?8:1):0;
  return 0; }
function K(str){ return String(str).replace(/([^\s·,.()?!"]+?)(은\(는\)|이\(가\)|을\(를\)|와\(과\)|\(으\)로|이랑|\(이\)면|\(이\)에요)/g,(m,w,j)=>{ const b=batch(w);
    const r={'은(는)':b?'은':'는','이(가)':b?'이':'가','을(를)':b?'을':'를','와(과)':b?'과':'와','(으)로':(b&&b!==8)?'으로':'로','이랑':b?'이랑':'랑','(이)면':b?'이면':'면','(이)에요':b?'이에요':'예요'}[j]; return w+r; }); }

/* ---------- word pools ---------- */
const KNAMES='민지 준호 서연 지훈 하은 도윤 수아 예준 지우 시우 서준 하준 지호 은우 주원 하윤 지안 서윤 다은 유진 채원 지민 현우 건우 연우 소율 아윤 나은 윤서 태양 승현 민재 재윤 수빈 예린 가은 시현 준서 도현 라온 이안 해든 보람 하늘 나래 슬기 다솜 가람 한결 새롬 아름 미소 소망 은별 해솔 누리 다온 시온 로아 유나 리아 세아 채아 지유 서아 하린 아린 예나 수현 민서 현서 지원 태민 성민 동현 영호 철수 영희 민수 정우 상민 광수 미나 소라 혜진 은지 보라 지은'.split(' ');
const ENAMES='Mia Noah Liam Emma Olivia Ethan Ava Lucas Sophia Mason Amelia Logan Harper Elijah Ella Jack Chloe Leo Grace Owen Zoe Ryan Lily Dylan Nora'.split(' ');
const SUBJ=['국어','영어','수학','과학','사회','역사','음악','미술','체육','기술','도덕','한문','정보','지리','물리','화학','생물'];
const ESUBJ=['Math','English','Science','History','Art','Music','Reading','Writing','Biology','Physics'];
const ITEMS=[['사과',800,3000],['바나나',500,2500],['귤',300,1500],['우유',1500,3200],['달걀',3000,8000],['빵',1500,5000],['라면',900,1800],['과자',1000,3500],['주스',1200,3000],['공책',800,3000],['연필',300,1500],['볼펜',500,2500],['지우개',400,1500],['가위',1500,4000],['풀',700,2000],['색연필',2500,6000],['물감',3000,9000],['도화지',500,2000],['도시락',3500,7000],['샌드위치',2500,5500],['김밥',2500,4500],['떡볶이',3000,6000],['아이스크림',800,3000],['초콜릿',1000,3500],['젤리',700,2500],['양말',1000,4000],['모자',5000,20000],['장갑',3000,12000],['우산',4000,15000],['텀블러',5000,18000]];
const EITEMS=[['Apple',1,3],['Banana',1,2],['Bread',2,5],['Milk',2,4],['Eggs',3,7],['Pen',1,3],['Notebook',2,6],['Cheese',3,9],['Juice',2,5],['Rice',5,15]];
const CITIES='서울 부산 대구 인천 광주 대전 울산 수원 창원 청주 전주 제주 춘천 강릉 포항 목포 여수 안동 원주 천안'.split(' ');
const TEAMS=['사자','호랑이','독수리','곰','늑대','상어','돌고래','매','여우','고래'];
const CLASSES=['1반','2반','3반','4반','5반','가','나','다','A조','B조','C조'];
const FRUITS='사과 바나나 딸기 포도 수박 귤 복숭아 배 감 참외 오렌지 키위 망고 체리'.split(' ');
const ANIMALS='강아지 고양이 토끼 햄스터 앵무새 거북이 금붕어 기니피그 오리 말'.split(' ');
const SPORTS='축구 야구 농구 배구 수영 탁구 배드민턴 달리기 줄넘기 태권도 피구 테니스'.split(' ');
const EXP_ITEMS='교통비 식비 간식 문구 도서 통신비 옷 영화 게임 학원 선물 병원'.split(' ');
const MON=i=>(i+1)+'월';
const sample1=a=>a[Math.floor(rnd()*a.length)];

/* ---------- table builders: {rows, label:0, nums:[{c,name}], texts:[{c,name}]} ---------- */
function mk(rows,nums,texts,extra){ return Object.assign({rows,nums,texts:texts||[]},extra||{}); }
function tScores(en){ const n=int(4,10), k=int(2,5), names=sample(en?ENAMES:KNAMES,n), subj=sample(en?ESUBJ:SUBJ,k);
  const rows=[[en?'Name':'이름'].concat(subj)]; names.forEach(nm=>rows.push([nm].concat(subj.map(()=>int(45,100)))));
  return mk(rows,subj.map((s,i)=>({c:i+1,name:s})),[],{kind:'score',unit:en?'points':'점'}); }
function tSales(en){ const n=int(4,9), it=sample(en?EITEMS:ITEMS,n), tot=chance(.3);
  const rows=[en?['Item','Price','Qty']:['품목','가격','수량']]; it.forEach(x=>{ const p=en?int(x[1],x[2])*100:Math.round(int(x[1],x[2])/100)*100; rows.push([x[0],p,int(2,40)]); });
  return mk(rows,[{c:1,name:en?'Price':'가격'},{c:2,name:en?'Qty':'수량'}],[],{kind:'sales'}); }
function tMonthly(en){ const n=int(4,12), start=int(0,12-n), kinds=en?[['Sales',100,900],['Visitors',50,500],['Rain',0,300]]:[['매출',100,900],['방문자',50,500],['강수량',0,300],['기온',-5,33],['판매량',10,200],['독서량',1,20]];
  const ks=sample(kinds,int(1,Math.min(3,kinds.length))), rows=[[en?'Month':'월'].concat(ks.map(k=>k[0]))];
  for(let i=0;i<n;i++) rows.push([en?['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][start+i]:MON(start+i)].concat(ks.map(k=>int(k[1],k[2]))));
  return mk(rows,ks.map((k,i)=>({c:i+1,name:k[0]})),[],{kind:'monthly',time:true}); }
function tGroups(en){ const n=int(5,10), names=sample(en?ENAMES:KNAMES,n), groups=sample(en?['Red','Blue','Green']:CLASSES,int(2,3)), subj=pick(en?ESUBJ:SUBJ);
  const rows=[en?['Name','Team',subj]:['이름','반',subj]]; names.forEach(nm=>rows.push([nm,pick(groups),int(40,100)]));
  return mk(rows,[{c:2,name:subj}],[{c:1,name:en?'Team':'반',vals:groups}],{kind:'group'}); }
function tExpense(en){ const n=int(4,9), its=EXP_ITEMS, rows=[en?['Date','Category','Amount']:['날짜','항목','금액']];
  for(let i=0;i<n;i++) rows.push([(en?'Mar ':int(1,12)+'월 ')+int(1,28)+(en?'':'일'),pick(en?['Food','Bus','Books','Snacks']:its),Math.round(int(500,30000)/100)*100]);
  return mk(rows,[{c:2,name:en?'Amount':'금액'}],[{c:1,name:en?'Category':'항목',vals:Array.from(new Set(rows.slice(1).map(r=>r[1])))}],{kind:'expense'}); }
const TB=[tScores,tScores,tSales,tMonthly,tGroups,tExpense];

/* ---------- address helpers: table placed at (ar, ac) ---------- */
const ATS=['A1','A1','A1','A1','A1','A1','A1','B2','B2','C3','A3'];
function place(at){ const a=E.parseAddr(at); return {r:a.r,c:a.c}; }
const A=(P,c,r)=>col(P.c+c)+(P.r+r+1);                    // table cell (column index inside table, row index inside table)
const RNG=(P,c,r1,r2)=>A(P,c,r1)+':'+A(P,c,r2);
const ABS=(P,c,r1,r2)=>'$'+col(P.c+c)+'$'+(P.r+r1+1)+':$'+col(P.c+c)+'$'+(P.r+r2+1);

/* ---------- formula generator ---------- */
const QV={ // column phrase variants
  ko:(s)=>[s,s+' 점수',s+' 열',s+' 쪽'] };
function fq(ko,en,t){ // choose language
  return t.en?pick(en):pick(ko); }
function formulaItem(){
  const en=chance(.1), t=pick(TB)(en), P=place(pick(ATS)), rows=t.rows, n=rows.length-1;
  const last=n;                                   // last data row index inside table (header = 0)
  const tc=pick(t.nums), nm=tc.name, c=tc.c, vals=rows.slice(1).map(r=>r[c]);
  const S=vals.reduce((a,b)=>a+b,0), avg=S/n, srt=vals.slice().sort((a,b)=>a-b);
  const med=n%2?srt[(n-1)/2]:(srt[n/2-1]+srt[n/2])/2;
  const R=RNG(P,c,1,last), below=A(P,c,last+2), qcol=en?nm:pick(QV.ko(nm).slice(0,3));
  const o={table:rows,at:A(P,0,0),cell:below};
  const ops=[]; const add=(w,f)=>{ for(let i=0;i<w;i++) ops.push(f); };
  const unitWord=en?'':(t.kind==='score'?'점수':'');
  const KO={ // ops
    sum:()=>({q:fq([nm+' 합계',nm+' 다 더해줘',nm+' 총합',nm+'의 합',nm+' 모두 더한 값',nm+' 합계 구해줘',nm+' 전부 합치면'],['sum of '+nm,'total '+nm,'add up '+nm,'what is the total of '+nm+'?'],t),f:'=SUM('+R+')',e:S,x:fq([nm+'의 합계예요.',nm+'을(를) 모두 더해요.',nm+' 전체를 더한 값이에요.'],['Adds up all values of '+nm+'.'],t)}),
    avg:()=>({q:fq([nm+' 평균',nm+' 평균 구해줘',nm+' 평균은?',nm+'의 평균값',nm+' 평균 내줘'],['average '+nm,'mean of '+nm,'what is the average '+nm+'?'],t),f:'=AVERAGE('+R+')',e:avg,x:fq([nm+'의 평균이에요.',nm+' 값들의 평균을 구해요.'],['Averages '+nm+'.'],t)}),
    max:()=>({q:fq([nm+' 최고값',nm+' 제일 큰 값',nm+' 최댓값',nm+' 가장 높은 거',nm+' 최대'],['highest '+nm,'max of '+nm,'largest '+nm],t),f:'=MAX('+R+')',e:srt[n-1],x:fq([nm+'의 최댓값이에요.',nm+' 중 가장 큰 값이에요.'],['The largest '+nm+'.'],t)}),
    min:()=>({q:fq([nm+' 최저값',nm+' 제일 작은 값',nm+' 최솟값',nm+' 가장 낮은 거',nm+' 최소'],['lowest '+nm,'min of '+nm,'smallest '+nm],t),f:'=MIN('+R+')',e:srt[0],x:fq([nm+'의 최솟값이에요.',nm+' 중 가장 작은 값이에요.'],['The smallest '+nm+'.'],t)}),
    med:()=>({q:fq([nm+' 중앙값',nm+' 가운데 값',nm+' 메디안'],['median '+nm,'middle value of '+nm],t),f:'=MEDIAN('+R+')',e:med,x:fq([nm+'의 중앙값이에요.'],['The median of '+nm+'.'],t)}),
    cnt:()=>({q:fq([nm+' 몇 개 있는지',nm+' 개수 세어줘',nm+' 값이 몇 개야',nm+' 숫자 개수'],['how many '+nm+' values','count of '+nm],t),f:'=COUNT('+R+')',e:n,x:fq([nm+'에 숫자가 몇 개 있는지 세요.'],['Counts the numbers in '+nm+'.'],t)}),
    rnd:()=>{ const d=int(0,2); return {q:fq([nm+' 평균을 '+(d?'소수 '+(d===1?'첫째':'둘째')+' 자리까지':'정수로')+' 반올림해줘',nm+' 평균 '+(d?'소수 '+(d===1?'첫째':'둘째')+' 자리':'일의 자리')+'까지만',nm+' 평균 반올림'+(d?' ('+d+'자리)':'')],['average '+nm+' rounded to '+d+' decimals'],t),f:'=ROUND(AVERAGE('+R+'),'+d+')',e:+avg.toFixed(d),x:fq([nm+' 평균을 반올림해요.'],['Rounds the average of '+nm+'.'],t)}; },
    big:()=>{ const k=int(1,Math.min(3,n)); return {q:fq([nm+' '+k+'번째로 큰 값',nm+' 높은 순서로 '+k+'등 값',nm+' 상위 '+k+'번째'],[(k===1?'largest':'#'+k+' largest')+' '+nm],t),f:'=LARGE('+R+','+k+')',e:srt[n-k],x:fq([nm+'에서 '+k+'번째로 큰 값이에요.'],['The '+k+'th largest '+nm+'.'],t)}; },
    small:()=>{ const k=int(1,Math.min(3,n)); return {q:fq([nm+' '+k+'번째로 작은 값',nm+' 낮은 순서로 '+k+'등 값'],[(k===1?'smallest':'#'+k+' smallest')+' '+nm],t),f:'=SMALL('+R+','+k+')',e:srt[k-1],x:fq([nm+'에서 '+k+'번째로 작은 값이에요.'],['The '+k+'th smallest '+nm+'.'],t)}; },
    range:()=>({q:fq([nm+' 최고와 최저 차이',nm+' 최댓값에서 최솟값 뺀 값',nm+' 편차 범위'],['difference between highest and lowest '+nm],t),f:'=MAX('+R+')-MIN('+R+')',e:srt[n-1]-srt[0],x:fq(['최댓값에서 최솟값을 빼요.'],['Max minus min.'],t)}),
    cntif:()=>{ const th=pick(vals); const op=pick(['>=','>','<','<=']); const w={'>=':'이상','>':'초과','<':'미만','<=':'이하'}[op]; const e=vals.filter(v=>op==='>='?v>=th:op==='>'?v>th:op==='<'?v<th:v<=th).length;
      return {q:fq([nm+' '+th+' '+w+'인 개수',nm+'이(가) '+th+' '+w+'인 사람 수',nm+' '+th+w+' 몇 명인지'],[ 'how many '+nm+' '+(op==='>='?'at least':op==='>'?'over':op==='<'?'under':'at most')+' '+th],t),f:'=COUNTIF('+R+',"'+op+th+'")',e,x:fq([nm+'이(가) '+th+' '+w+'인 칸을 세요.'],['Counts matching cells.'],t)}; },
    sumif:()=>{ const th=pick(vals), e=vals.filter(v=>v>=th).reduce((a,b)=>a+b,0);
      return {q:fq([nm+' '+th+' 이상인 것만 더해줘',nm+' 중 '+th+' 이상 합계'],['sum of '+nm+' that are at least '+th],t),f:'=SUMIF('+R+',">='+th+'")',e,x:fq([th+' 이상인 값만 더해요.'],['Adds values of at least '+th+'.'],t)}; },
    pct:()=>{ const k=int(1,n), v=vals[k-1], nmRow=rows[k][0]; return {q:fq([nmRow+'의 '+nm+'이 전체에서 차지하는 비율(%)',nmRow+' '+nm+' 비중 퍼센트로',nmRow+'가 전체 '+nm+'의 몇 퍼센트인지'],[ nmRow+"'s share of total "+nm+' in %'],t),f:'='+A(P,c,k)+'/SUM('+R+')*100',e:v/S*100,x:fq([nmRow+'의 값을 전체 합계로 나눠 100을 곱해요.'],['Divides by the total and multiplies by 100.'],t)}; },
    lookup:()=>{ const k=int(1,n), key=rows[k][0]; return {q:fq([key+'의 '+nm+' 찾아줘',key+' '+nm+' 얼마야',key+'의 '+nm+'은?'],['find '+nm+' of '+key,key+"'s "+nm],t),f:'=INDEX('+R+',MATCH("'+key+'",'+RNG(P,0,1,last)+',0))',e:rows[k][c],x:fq([key+'의 행에서 '+nm+' 값을 찾아요.'],['Looks up '+key+'.'],t)}; },
    first:()=>{ const k=int(1,n), key=rows[k][0]; return {q:fq([key+'의 '+nm,key+' '+nm+' 가져와',key+' '+nm+' 값만'],[key+"'s "+nm],t),f:'=INDEX('+R+',MATCH("'+key+'",'+RNG(P,0,1,last)+',0))',e:rows[k][c],x:fq([key+'의 '+nm+' 값이에요.'],['The value of '+key+'.'],t)}; },
    bestName:()=>{ const mx=srt[n-1], k=vals.indexOf(mx); if(vals.filter(v=>v===mx).length>1) return null; return {q:fq([nm+' 제일 높은 사람 이름',nm+' 1등이 누구야',nm+' 가장 높은 사람'],['who has the highest '+nm],t),f:'=INDEX('+RNG(P,0,1,last)+',MATCH(MAX('+R+'),'+R+',0))',e:rows[k+1][0],x:fq([nm+'이 가장 높은 행의 이름이에요.'],['Name with the highest '+nm+'.'],t)}; },
    worstName:()=>{ const mn=srt[0], k=vals.indexOf(mn); if(vals.filter(v=>v===mn).length>1) return null; return {q:fq([nm+' 제일 낮은 사람 이름',nm+' 꼴찌가 누구야',nm+' 가장 낮은 사람'],['who has the lowest '+nm],t),f:'=INDEX('+RNG(P,0,1,last)+',MATCH(MIN('+R+'),'+R+',0))',e:rows[k+1][0],x:fq([nm+'이 가장 낮은 행의 이름이에요.'],['Name with the lowest '+nm+'.'],t)}; },
    grpSum:()=>{ if(!t.texts.length) return null; const g=t.texts[0], gv=pick(g.vals), e=rows.slice(1).filter(r=>r[g.c]===gv).reduce((a,r)=>a+r[c],0);
      return {q:fq([gv+' '+nm+' 합계',g.name+'이(가) '+gv+'인 '+nm+' 다 더해줘',gv+'만 '+nm+' 합치면'],['total '+nm+' for '+gv],t),f:'=SUMIF('+RNG(P,g.c,1,last)+',"'+gv+'",'+R+')',e,x:fq([g.name+'이(가) '+gv+'인 행의 '+nm+'을 더해요.'],['Adds '+nm+' where '+g.name+' is '+gv+'.'],t)}; },
    grpAvg:()=>{ if(!t.texts.length) return null; const g=t.texts[0], gv=pick(g.vals), sel=rows.slice(1).filter(r=>r[g.c]===gv); const e=sel.reduce((a,r)=>a+r[c],0)/sel.length;
      return {q:fq([gv+' '+nm+' 평균',g.name+'이(가) '+gv+'인 사람의 '+nm+' 평균',gv+' 평균 구해줘'],['average '+nm+' for '+gv],t),f:'=AVERAGEIF('+RNG(P,g.c,1,last)+',"'+gv+'",'+R+')',e,x:fq([gv+'의 '+nm+' 평균이에요.'],['Averages '+nm+' for '+gv+'.'],t)}; },
    grpCnt:()=>{ if(!t.texts.length) return null; const g=t.texts[0], gv=pick(g.vals), e=rows.slice(1).filter(r=>r[g.c]===gv).length;
      return {q:fq([gv+' 몇 명이야',g.name+'이(가) '+gv+'인 행이 몇 개',gv+' 인원 세어줘'],['how many rows have '+gv],t),f:'=COUNTIF('+RNG(P,g.c,1,last)+',"'+gv+'")',e,x:fq([gv+'이(가) 몇 번 나오는지 세요.'],['Counts '+gv+'.'],t)}; }
  };
  // row-wise ops: target cell right of the table, on data row k
  const nn=t.nums;
  const ROW={
    rowSum:()=>{ if(nn.length<2) return null; const k=int(1,n), cs=nn.map(x=>x.c), e=cs.reduce((a,x)=>a+rows[k][x],0), who=rows[k][0];
      const cell=col(P.c+rows[0].length)+(P.r+k+1);
      return {cell,q:fq([who+' 총점',who+' 합계 구해줘',who+'의 합계',who+' 점수 다 더해줘'],['total for '+who,who+"'s sum"],t),f:'=SUM('+col(P.c+cs[0])+(P.r+k+1)+':'+col(P.c+cs[cs.length-1])+(P.r+k+1)+')',e,x:fq([who+'의 값을 모두 더해요.'],['Adds the row of '+who+'.'],t),needContig:cs.every((x,i)=>i===0||x===cs[i-1]+1)}; },
    rowAvg:()=>{ if(nn.length<2) return null; const k=int(1,n), cs=nn.map(x=>x.c), e=cs.reduce((a,x)=>a+rows[k][x],0)/cs.length, who=rows[k][0];
      const cell=col(P.c+rows[0].length)+(P.r+k+1);
      return {cell,q:fq([who+' 평균',who+' 평균 점수',who+'의 평균 구해줘'],['average for '+who],t),f:'=AVERAGE('+col(P.c+cs[0])+(P.r+k+1)+':'+col(P.c+cs[cs.length-1])+(P.r+k+1)+')',e,x:fq([who+'의 평균이에요.'],['Averages the row of '+who+'.'],t),needContig:cs.every((x,i)=>i===0||x===cs[i-1]+1)}; },
    two:()=>{ if(nn.length<2) return null; const [a,b]=sample(nn,2).sort((x,y)=>x.c-y.c), k=int(1,n), who=rows[k][0], cell=col(P.c+rows[0].length)+(P.r+k+1);
      const kind=t.kind==='sales'?'mul':t.kind==='expense'?'sum':pick(['sum','sum','avg','diff','mul']), va=rows[k][a.c], vb=rows[k][b.c];
      const F={sum:['+',va+vb,'더한 값','plus'],diff:['-',va-vb,'뺀 값','minus'],avg:['avg',(va+vb)/2,'평균','average'],mul:['*',va*vb,'곱한 값','times']}[kind];
      const fa=col(P.c+a.c)+(P.r+k+1), fb=col(P.c+b.c)+(P.r+k+1), f=kind==='avg'?'=AVERAGE('+fa+','+fb+')':'='+fa+F[0]+fb;
      return {cell,q:fq([who+'의 '+a.name+'와(과) '+b.name+' '+F[2],who+' '+a.name+' '+(kind==='sum'?'더하기':kind==='diff'?'빼기':kind==='mul'?'곱하기':'이랑')+' '+b.name+(kind==='avg'?' 평균':''),who+'의 '+a.name+'와(과) '+b.name+' '+F[2]+' 구해줘'],[kind==='sum'?a.name+' plus '+b.name+' for '+who:kind==='diff'?a.name+' minus '+b.name+' for '+who:kind==='mul'?a.name+' times '+b.name+' for '+who:'average of '+a.name+' and '+b.name+' for '+who],t),f,e:F[1],x:fq([who+'의 '+a.name+'와(과) '+b.name+'을(를) 계산해요.'],['Calculates it for '+who+'.'],t)}; },
    passIf:()=>{ if(t.kind!=='score') return null; const k=int(1,n), who=rows[k][0], th=pick([50,60,70,80,90]), cell=col(P.c+rows[0].length)+(P.r+k+1), v=rows[k][c];
      const yes=en?'Pass':'합격', no=en?'Fail':'불합격';
      return {cell,q:fq([who+' '+nm+' '+th+'점 이상이면 합격 아니면 불합격',who+'의 '+nm+'이 '+th+'점 넘으면 합격이라고 표시',who+' '+nm+' '+th+' 이상 합격 판정'],[who+' '+nm+' at least '+th+' means Pass otherwise Fail'],t),f:'=IF('+A(P,c,k)+'>='+th+',"'+yes+'","'+no+'")',e:v>=th?yes:no,x:fq([nm+'이 '+th+'점 이상이면 합격으로 표시해요.'],['Shows Pass when it is '+th+' or more.'],t)}; },
    mulCols:()=>{ if(t.kind!=='sales') return null; const k=int(1,n), who=rows[k][0], cell=col(P.c+rows[0].length)+(P.r+k+1), e=rows[k][1]*rows[k][2];
      return {cell,q:fq([who+' 가격 곱하기 수량',who+' 매출 계산',who+' 총액 구해줘',who+' 얼마어치인지'],['total for '+who+': price times quantity'],t),f:'='+A(P,1,k)+'*'+A(P,2,k),e,x:fq([who+'의 가격에 수량을 곱해요.'],['Price times quantity.'],t)}; },
    total:()=>{ if(t.kind!=='sales') return null; const e=rows.slice(1).reduce((a,r)=>a+r[1]*r[2],0), cell=below;
      return {cell:A(P,1,last+2),q:fq(['전체 매출 합계','가격 곱하기 수량 다 더해줘','총 매출 얼마야','전부 팔면 얼마'],['total revenue (price times quantity)'],t),f:'=SUMPRODUCT('+RNG(P,1,1,last)+','+RNG(P,2,1,last)+')',e,x:fq(['가격과 수량을 곱해서 모두 더해요.'],['Sums price times quantity.'],t)}; },
    chg:()=>{ if(!t.time||n<3) return null; const k=int(2,n), a=rows[k-1][c], b=rows[k][c]; if(!a) return null; const cell=col(P.c+rows[0].length)+(P.r+k+1);
      return {cell,q:fq([rows[k-1][0]+'에서 '+rows[k][0]+'으로 '+nm+' 몇 % 변했는지',rows[k][0]+' '+nm+' 증감률',rows[k-1][0]+' 대비 '+rows[k][0]+' 변화율'],['percent change of '+nm+' from '+rows[k-1][0]+' to '+rows[k][0]],t),f:'=('+A(P,c,k)+'-'+A(P,c,k-1)+')/'+A(P,c,k-1)+'*100',e:(b-a)/a*100,x:fq(['앞 값 대비 변한 비율(%)이에요.'],['Percent change from the earlier value.'],t)}; }
  };
  const all=Object.assign({},KO,ROW), names=Object.keys(all), W={sum:3,avg:3,max:2,min:2,med:1,cnt:1,rnd:2,big:1,small:1,range:1,cntif:2,sumif:1,pct:1,lookup:1,first:1,bestName:2,worstName:1,grpSum:2,grpAvg:1,grpCnt:1,rowSum:2,rowAvg:2,two:2,passIf:2,mulCols:1,total:1,chg:1};
  const bag=[]; names.forEach(k=>{ for(let i=0;i<(W[k]||1);i++) bag.push(k); });
  for(let tries=0;tries<20;tries++){
    const r=all[pick(bag)](); if(!r||r.needContig===false) continue;
    const cell=r.cell||below;
    let e=r.e; if(typeof e==='number') e=r2(e);
    return {table:rows,at:A(P,0,0),cell,q:r.q,formula:r.f,explain:r.x,expect:e};
  }
  return null;
}

/* ---------- graph generator ---------- */
function graphItem(){
  const en=chance(.1); let t, P, rows, n, nums; const kindPick=pick(['bar','bar','bar','hbar','line','line','pie','scatter']);
  if(kindPick==='line'){ t=tMonthly(en); } else if(kindPick==='scatter'){ t=pick([tScores,tScores,tMonthly])(en); if(t.nums.length<2){ t=tScores(en); if(t.nums.length<2) return null; } }
  else t=pick([tScores,tSales,tMonthly,tGroups,tExpense])(en);
  P=place(pick(ATS)); rows=t.rows; n=rows.length-1; nums=t.nums;
  const lastCol=rows[0].length-1, rg=A(P,0,0)+':'+A(P,lastCol,n);
  // label column must hold text: tGroups has 2 text cols (name, team) -> label col 0 ok; tExpense dates are text ok
  const L=c=>col(P.c+c);
  let type=kindPick, ser, title, q;
  const who=en?'':'';
  if(type==='pie'){ const s=pick(nums); if(rows.slice(1).some(r=>r[s.c]<0)) return null; ser=[L(s.c)]; title=en?s.name+' share':s.name+' 비율';
    q=pick(en?['pie chart of '+s.name,'show '+s.name+' as a pie','make a pie chart for '+s.name]:[s.name+' 비율을 원그래프로',s.name+' 원 그래프 그려줘',s.name+' 비중 파이 차트로 보여줘',s.name+'을(를) 원그래프로 나타내줘','전체에서 '+s.name+' 차지하는 비율 원그래프']); }
  else if(type==='scatter'){ const [a,b]=sample(nums,2).sort((x,y)=>x.c-y.c); ser=[L(a.c),L(b.c)]; title=en?a.name+' vs '+b.name:a.name+'와(과) '+b.name+' 관계';
    q=pick(en?['scatter plot of '+a.name+' and '+b.name,'is '+a.name+' related to '+b.name+'?','plot '+a.name+' against '+b.name]:[a.name+'이랑 '+b.name+' 관계 보여줘',a.name+'와(과) '+b.name+' 산점도로',a.name+'이(가) 높으면 '+b.name+'도 높은지 그래프로',a.name+' '+b.name+' 상관관계 점으로 찍어줘']); }
  else { const k=type==='line'?int(1,nums.length):int(1,Math.min(3,nums.length)); const sel=sample(nums,k).sort((x,y)=>x.c-y.c); ser=sel.map(s=>L(s.c));
    const names=sel.map(s=>s.name), joined=names.join('·'), word=names.join('이랑 ');
    title=en?names.join(' & '):(k===1?names[0]+(type==='line'?' 변화':''):names.join('·')+(k>1?' 비교':''));
    const T=type==='bar'?(en?['bar chart of ','columns for ']:['막대그래프로','막대 그래프 그려줘','세로 막대로']):type==='hbar'?(en?['horizontal bar chart of ']:['가로 막대그래프로','가로 막대로 보여줘']):(en?['line chart of ','trend of ']:['꺾은선 그래프로','선 그래프로 변화 보여줘','추이를 선으로']);
    q=en?pick(T)+word.replace(/이랑 /g,' and '):pick([word+' '+pick(T),word+' '+pick(T),word+(type==='line'?' 변화 그래프':' 비교 그래프')]).replace(/\s+/g,' ').trim();
    if(type==='line'&&!t.time) type='bar'; }
  return {table:rows,at:A(P,0,0),q,answer:{type,range:rg,series:ser,title}};
}

/* ---------- table generator ---------- */
const C={ // column generators: [headerKo, headerEn, fn(i)->value, kind]
  no:['번호','No',i=>i+1], name:['이름','Name',()=>pick(KNAMES)], ename:['이름','Name',()=>pick(ENAMES)], gender:['성별','Gender',()=>pick(['남','여'])],
  birth:['생일','Birthday',()=>int(1,12)+'월 '+int(1,28)+'일'], score:['점수','Score',()=>int(40,100)], grade:['등급','Grade',()=>pick(['A','B','C','D'])],
  subj:['과목','Subject',()=>pick(SUBJ)], date:['날짜','Date',()=>int(1,12)+'월 '+int(1,28)+'일'], item:['품목','Item',()=>pick(ITEMS)[0]], price:['가격','Price',()=>Math.round(int(500,20000)/100)*100],
  qty:['수량','Qty',()=>int(1,30)], city:['도시','City',()=>pick(CITIES)], pop:['인구(만 명)','Population',()=>int(20,950)], fruit:['과일','Fruit',()=>pick(FRUITS)],
  animal:['동물','Animal',()=>pick(ANIMALS)], sport:['종목','Sport',()=>pick(SPORTS)], team:['팀','Team',()=>pick(TEAMS)], wins:['승','Wins',()=>int(0,20)], loss:['패','Losses',()=>int(0,20)],
  ht:['키(cm)','Height',()=>int(120,185)], wt:['몸무게(kg)','Weight',()=>int(25,85)], age:['나이','Age',()=>int(8,15)], month:['월','Month',i=>(i%12+1)+'월'],
  amount:['금액','Amount',()=>Math.round(int(500,50000)/100)*100], cat:['항목','Category',()=>pick(EXP_ITEMS)], pages:['쪽수','Pages',()=>int(80,420)],
  time:['시간(분)','Minutes',()=>pick([30,45,60,90,120])], room:['교실','Room',()=>int(1,9)+'-'+int(1,12)], temp:['기온','Temp',()=>int(-8,35)], rain:['강수량(mm)','Rain',()=>int(0,250)],
  cls:['반','Class',()=>pick(CLASSES)], todo:['할 일','Task',null], done:['완료','Done',()=>pick(['O','X'])], book:['책 제목','Title',null], author:['지은이','Author',null]
};
const TODOS='청소하기 숙제하기 책 읽기 운동하기 빨래 개기 장보기 일기 쓰기 피아노 연습 설거지 분리수거 강아지 산책 편지 쓰기 준비물 챙기기'.split(' ');
const BOOKS=['어린 왕자','마당을 나온 암탉','나의 라임 오렌지나무','해리 포터','아낌없이 주는 나무','샬롯의 거미줄','드래곤 길들이기','우리 동네 이야기','비밀의 정원','삼국유사 이야기'];
const AUTH=['생텍쥐페리','황선미','J.M. 바스콘셀로스','J.K. 롤링','셸 실버스타인','E.B. 화이트','크레시다 코웰','김서윤','프랜시스 버넷','일연'];
const THEMES=[ // [ko topic, en topic, [col keys]]
  ['우리 반 명단','class roster',['no','name','gender','birth']],['성적표','grade report',['name','subj','score','grade','cls','date']],['장보기 목록','shopping list',['item','price','qty']],
  ['도시별 인구','city population',['city','pop','temp','rain']],['월별 기온과 강수량','monthly weather',['month','temp','rain']],['반려동물 조사','pet survey',['name','animal','age','gender']],
  ['좋아하는 과일 조사','favorite fruit survey',['fruit','qty']],['체육 대회 점수표','sports day scores',['team','sport','score','wins','loss','date']],['리그 순위표','league table',['team','wins','loss']],
  ['신체 검사 결과','health check',['name','ht','wt','age','gender','cls']],['용돈 기입장','allowance log',['date','cat','amount']],['독서 기록','reading log',['date','book','author','pages']],
  ['시간표','timetable',['no','subj','room']],['할 일 목록','to-do list',['no','todo','done']],['공부 시간 기록','study log',['date','subj','time','score','done']],['판매 현황','sales report',['item','price','qty','date','city']],
  ['시험 일정표','exam schedule',['date','subj','time','room','cls']],['모둠 편성표','group list',['cls','name','score']]
];
const EN={ team:['Lions','Tigers','Eagles','Bears','Wolves','Sharks','Dolphins','Hawks','Foxes','Whales'], item:['Apple','Banana','Bread','Milk','Eggs','Pen','Notebook','Cheese','Juice','Rice','Soap','Cookies'],
  animal:['Dog','Cat','Rabbit','Hamster','Parrot','Turtle','Goldfish','Duck','Horse'], fruit:['Apple','Banana','Strawberry','Grape','Watermelon','Orange','Peach','Pear','Mango','Cherry','Kiwi'],
  city:['Seoul','Busan','Daegu','Incheon','Gwangju','Daejeon','Ulsan','Jeju','Suwon','Changwon'], cat:['Food','Bus','Books','Snacks','Clothes','Movies','Gifts','Games'],
  subj:['Math','English','Science','History','Art','Music','Reading','Biology'], sport:['Soccer','Baseball','Basketball','Swimming','Tennis','Running','Golf'], gender:['M','F'],
  todo:['Clean the room','Do homework','Read a book','Exercise','Fold laundry','Go shopping','Write a diary','Practice piano','Wash dishes','Walk the dog'],
  book:["Charlotte's Web",'Matilda','The Giving Tree','Holes','Charlie and the Chocolate Factory','The Little Prince','Wonder','Hatchet'], author:['E. B. White','Roald Dahl','Shel Silverstein','Louis Sachar','Roald Dahl','Saint-Exupery','R. J. Palacio','Gary Paulsen'], cls:['Red','Blue','Green'] };
const UNIQ=new Set(['name','ename','item','team','city','fruit','animal','todo','book','author']);
const EN_OK=th=>th[2].every(k=>!['cls'].includes(k)||true);
function tableItem(){
  const en=chance(.12), th=pick(THEMES); let n=int(3,12);
  let keys=th[2].slice(); if(keys.length>2&&chance(.8)){ const first=keys[0], rest=keys.slice(1), k=int(1,rest.length); const keep=sample(rest,k); keys=[first].concat(rest.filter(x=>keep.includes(x)||false)); if(chance(.5)) keys=shuffle(keys.slice(1)).length?[first].concat(shuffle(keys.slice(1))):keys; }
  if(keys.length<2) keys=th[2].slice(0,2);
  const pools={}; keys.forEach(k=>{ let pool=null;
    if(k==='name') pool=en?ENAMES:KNAMES; else if(k==='item') pool=en?EN.item:ITEMS.map(x=>x[0]); else if(k==='team') pool=en?EN.team:TEAMS; else if(k==='city') pool=en?EN.city:CITIES;
    else if(k==='fruit') pool=en?EN.fruit:FRUITS; else if(k==='animal') pool=en?EN.animal:ANIMALS; else if(k==='todo') pool=en?EN.todo:TODOS; else if(k==='book') pool=en?EN.book:BOOKS; else if(k==='author') pool=en?EN.author:AUTH;
    if(pool&&UNIQ.has(k)) pools[k]=pool; });
  Object.keys(pools).forEach(k=>{ n=Math.min(n,pools[k].length); });
  const order={}; Object.keys(pools).forEach(k=>{ order[k]=shuffle(pools[k]); });
  const MONE=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const val=(k,i)=>{
    if(order[k]) return order[k][i];
    if(!en) return C[k][2](i);
    switch(k){ case 'subj': return pick(EN.subj); case 'sport': return pick(EN.sport); case 'cat': return pick(EN.cat); case 'gender': return pick(EN.gender); case 'cls': return pick(EN.cls);
      case 'birth': case 'date': return pick(MONE)+' '+int(1,28); case 'month': return MONE[i%12]; case 'room': return 'Room '+int(1,9); default: return C[k][2](i); } };
  const hdr=keys.map(k=>C[k][en?1:0]), blank=chance(.12)&&keys[0]==='no';
  const rows=[hdr]; for(let i=0;i<n;i++){ const r=keys.map(k=>val(k,i)); if(blank) for(let j=1;j<r.length;j++) r[j]=''; rows.push(r); }
  const cols=hdr.join(', '), orderKo=pick(['순서로','순으로','칸으로','열로']);
  const q=en?pick(['Make a '+th[1]+' table with columns: '+cols+'. '+n+' rows.','Create a '+th[1]+' with '+cols+' ('+n+' rows)','I need a '+th[1]+': '+cols+'. Fill in '+n+' sample rows.','Table of '+th[1]+', columns '+cols+', '+n+' rows']):
    pick([th[0]+' 표 만들어줘. '+cols+' '+orderKo+' '+n+'줄',th[0]+' 만들어 주세요 ('+cols+', '+n+'행)',th[0]+' '+n+'개 항목 표로. '+cols,n+'줄짜리 '+th[0]+' 표: '+cols,th[0]+' 표 하나 만들어줘. '+cols+' '+n+'줄',th[0]+' 틀 '+n+'줄 '+cols]);
  const q2=q.replace('표 표','표').replace('표 틀','틀'); return {q: blank&&!/빈칸/.test(q2)?q2+(en?' (leave the cells empty)':' 빈칸으로'):q2, rows};
}

/* ---------- unit generator ---------- */
const U=[ // [code, ko names[], en names[], category, typical values]
  ['m',['미터','메터'],['meter','meters','m'],'len',[1,2,5,10,50,100,250,1000]],['cm',['센티미터','센티','cm'],['centimeter','centimeters','cm'],'len',[5,10,15,30,50,100,180]],['mm',['밀리미터','밀리'],['millimeter','millimeters','mm'],'len',[5,10,25,100,500]],
  ['km',['킬로미터','킬로'],['kilometer','kilometers','km'],'len',[1,2,3,5,10,21,42,100]],['in',['인치'],['inch','inches'],'len',[1,6,12,24,32,55]],['ft',['피트','푸트'],['foot','feet','ft'],'len',[1,3,5,6,10,100]],['yd',['야드'],['yard','yards'],'len',[1,10,50,100]],['mi',['마일'],['mile','miles'],'len',[0.5,1,2,5,10,26.2,100]],
  ['g',['그램','g'],['gram','grams'],'mass',[1,50,100,250,500,1000]],['kg',['킬로그램','킬로','kg'],['kilogram','kilograms','kg'],'mass',[1,2,5,10,50,70,100]],['mg',['밀리그램'],['milligram','milligrams'],'mass',[50,100,500,1000]],['t',['톤'],['ton','tonne','tonnes'],'mass',[1,2,5,10]],
  ['근',['근'],[],'mass',[1,2,3,5,10]],['돈',['돈'],[],'mass',[1,3,5,10]],['lbm',['파운드'],['pound','pounds','lb'],'mass',[1,5,10,50,150,200]],['ozm',['온스'],['ounce','ounces','oz'],'mass',[1,4,8,16]],
  ['C',['섭씨'],['celsius','C'],'tmp',[-10,0,10,20,25,30,37,100]],['F',['화씨'],['fahrenheit','F'],'tmp',[0,32,50,68,86,98.6,100,212]],['K',['켈빈'],['kelvin','K'],'tmp',[0,100,273.15,300]],
  ['l',['리터','L'],['liter','liters','litre'],'vol',[1,2,5,10,20,100]],['ml',['밀리리터','미리','ml'],['milliliter','milliliters','ml'],'vol',[100,200,350,500,1000,1500]],['gal',['갤런'],['gallon','gallons'],'vol',[1,2,5,10,15]],['cup',['컵'],['cup','cups'],'vol',[1,2,3,4]],
  ['m2',['제곱미터','㎡'],['square meter','square meters','m2'],'area',[1,10,50,100,330]],['ha',['헥타르'],['hectare','hectares'],'area',[1,2,5,10]],['평',['평'],[],'area',[1,5,10,25,32,100]],['km2',['제곱킬로미터'],['square kilometer','square kilometers'],'area',[1,5,100]],['ft2',['제곱피트'],['square feet','square foot'],'area',[100,500,1000]],
  ['km/h',[],['km/h','kph'],'spd',[10,30,50,60,100,120]],['m/s',[],['m/s'],'spd',[1,5,10,30,340]],['mph',[],['mph'],'spd',[10,30,60,70]],['kn',['노트'],['knot','knots'],'spd',[5,10,20]],
  ['sec',['초'],['second','seconds','sec'],'time',[1,30,60,90,120,3600]],['mn',['분'],['minute','minutes','min'],'time',[1,5,10,30,60,90,120]],['hr',['시간'],['hour','hours','hr'],'time',[1,2,3,6,12,24,48]],['day',['일'],['day','days'],'time',[1,2,7,30,100,365]],['wk',['주'],['week','weeks'],'time',[1,2,4,8,52]],['yr',['년'],['year','years'],'time',[1,2,5,10,100]],
  ['byte',['바이트'],['byte','bytes'],'data',[1,8,100,1024]],['kibyte',['킬로바이트','KB'],['kilobyte','kilobytes','KB'],'data',[1,10,100,512]],['Mibyte',['메가바이트','MB'],['megabyte','megabytes','MB'],'data',[1,5,10,100,700]],['Gibyte',['기가바이트','GB'],['gigabyte','gigabytes','GB'],'data',[1,2,4,8,16,64,256]],['Tibyte',['테라바이트','TB'],['terabyte','terabytes','TB'],'data',[1,2,4]],['bit',['비트'],['bit','bits'],'data',[8,16,32,64]]
];
const NUMKO={0.5:['반','0.5'],1:['한','일','1'],2:['두','이','2'],3:['세','삼','3'],4:['네','사','4'],5:['다섯','오','5'],6:['여섯','6'],10:['열','십','10'],12:['열두','12'],100:['백','100']};
const SENT_KO=['{v}{f}은(는) 몇 {t}','{v}{f}(이)면 몇 {t}','{v}{f}을(를) {t}(으)로 바꾸면','{v}{f}은(는) {t}(으)로 얼마','{v}{f}은(는) {t}(으)로 몇이야','{v}{f} -> {t}','{v}{f}을(를) {t}(으)로 환산','{v}{f}을(를) {t}(으)로 변환해줘','{v}{f} {t}(으)로 알려줘'];
const SENT_EN=['convert {v} {f} to {t}','how many {t} is {v} {f}','{v} {f} in {t}','{v} {f} to {t}','what is {v} {f} in {t}?'];
function unitItem(){
  const a=pick(U), cands=U.filter(b=>b[3]===a[3]&&b[0]!==a[0]); if(!cands.length) return null; const b=pick(cands);
  const v=pick(a[4]), en=chance(.18)&&a[2].length&&b[2].length;
  const sf=en?pick(a[2]):pick(a[1]), st=en?pick(b[2]):pick(b[1]);
  if(!sf||!st) return null;
  let vs=String(v); if(!en&&NUMKO[v]&&chance(.35)) vs=pick(NUMKO[v]);
  const tmpl=en?pick(SENT_EN):pick(SENT_KO);
  let q=tmpl.replace('{v}',vs).replace('{f}',sf).replace('{t}',st);
  if(a[3]==='tmp'&&!en){ q=pick(['{f} {v}도는 {t}(으)로 몇 도','{f} {v}도(이)면 {t}(으)로 몇 도야','{f} {v}도를 {t}(으)로 바꾸면']).replace('{f}',sf).replace('{v}',vs).replace('{t}',st); }
  if(a[3]==='tmp'&&en) q='convert '+v+' degrees '+sf+' to '+st;
  const res=E.convertUnit(v,a[0],b[0]); if(res==null) return null;
  return {q:q.replace(/\s+/g,' ').trim(),value:v,from:a[0],to:b[0],expect:res};
}

/* ---------- calc generator (words -> one formula) ---------- */
const NUMW=['','한','두','세','네','다섯','여섯','일곱','여덟','아홉','열'];
function calcItem(){
  const kind=int(0,17);
  const a=int(2,99), b=int(2,40), c=int(2,12), d=int(2,20), e=int(100,900)*10, f=int(1,9)*100;
  const mk=(q,formula,cols,expect)=>({task:'calc',cols:cols||'',q,formula,expect});
  switch(kind){
    case 0: return mk(a+' 더하기 '+b+' 곱하기 '+c,'='+a+'+'+b+'*'+c,'',a+b*c);
    case 1: return mk(a+'에서 '+b+'을(를) 빼고 '+c+'(으)로 나눠','=('+a+'-'+b+')/'+c,'',(a-b)/c);
    case 2: return mk(e+'원짜리 '+int(2,9)+'개랑 '+f+'원짜리 '+int(2,9)+'개 합치면',null,'',null);
    case 3: { const x=int(50,100),y=int(50,100),z=int(50,100); return mk(x+', '+y+', '+z+'의 평균','=AVERAGE('+x+','+y+','+z+')','',(x+y+z)/3); }
    case 4: return mk(a+'의 제곱','='+a+'^2','',a*a);
    case 5: return mk(c+'의 '+d+'제곱','='+c+'^'+Math.min(d,6),'',null);
    case 6: return mk(a+'의 제곱근','=SQRT('+a+')','',Math.sqrt(a));
    case 7: { const p=pick([5,10,15,20,25,30,40,50]); return mk(e+'의 '+p+'%','='+e+'*'+p+'%','',e*p/100); }
    case 8: { const p=pick([5,10,15,20,25,30]); return mk(e+'원짜리 물건을 '+p+'% 할인하면','='+e+'*(1-'+p+'%)','',e*(1-p/100)); }
    case 9: { const m=int(2,9); return mk(e+'원을 '+m+'명이 똑같이 나누면','='+e+'/'+m,'',e/m); }
    case 10: return mk(a+'을(를) '+c+'(으)로 나눈 나머지','=MOD('+a+','+c+')','',a%c);
    case 11: { const dd=int(0,2); return mk(a+' 나누기 '+c+'을(를) 소수 '+['','첫째','둘째'][dd||1]+' 자리까지 반올림','=ROUND('+a+'/'+c+','+(dd||1)+')','',null); }
    case 12: { const cols=pick(['A=이름, B=점수','A=이름, B=가격, C=수량','A=날짜, B=지출','A=품목, B=판매량']); const cn=cols.split(', ')[1].split('=')[1];
      const cl=cols.includes('C=')?pick(['B','C']):'B', nm2=cols.split(', ').find(s=>s[0]===cl).split('=')[1]; const fns=[['합계','SUM'],['평균','AVERAGE'],['최댓값','MAX'],['최솟값','MIN'],['개수','COUNT']]; const [kw,fn]=pick(fns);
      return mk(nm2+' '+kw+'에서 '+int(1,20)+' 빼기',null,cols,null); }
    case 13: { const cols=pick(['A=이름, B=점수','A=품목, B=가격, C=수량']); const fns=[['합계','SUM'],['평균','AVERAGE'],['최고점','MAX'],['최저점','MIN']]; const [kw,fn]=pick(fns); const cl='B';
      const nm2=cols.split(', ')[1].split('=')[1]; const k=pick([1,2,3,5,10]); const op=pick([['에 '+k+' 더하기','+'],['에서 '+k+' 빼기','-'],['에 '+k+' 곱하기','*'],[' 나누기 '+k,'/']]);
      return mk(nm2+' '+kw+op[0],'='+fn+'('+cl+':'+cl+')'+op[1]+k,cols,null); }
    case 14: { const cols='A=이름, B=점수'; const k=pick([60,70,80,90]); return mk('B열에서 '+k+'점 넘는 사람 수','=COUNTIF(B:B,">'+k+'")',cols,null); }
    case 15: { const cols='A=품목, B=가격, C=수량'; return mk('가격 곱하기 수량을 다 더한 값','=SUMPRODUCT(B:B,C:C)',cols,null); }
    case 16: { const x=int(2,30),y=int(2,30); return mk(x+'와(과) '+y+' 중 큰 수','=MAX('+x+','+y+')','',Math.max(x,y)); }
    default: { const x=int(10,500),y=int(2,50); return mk(x+'에서 '+y+'을(를) 뺀 값을 '+int(2,9)+'배 하면',null,'',null); }
  }
}
// kinds with null formula need building after picking numbers
function calcItem2(){
  for(let i=0;i<30;i++){
    const kind=int(0,17), a=int(2,99), b=int(2,40), c=int(2,12), e=int(100,900)*10, f=int(1,9)*100;
    if(kind===2){ const p=int(2,9), q=int(2,9); return {task:'calc',cols:'',q:e+'원짜리 '+p+'개랑 '+f+'원짜리 '+q+'개 합치면',formula:'='+e+'*'+p+'+'+f+'*'+q,expect:e*p+f*q}; }
    if(kind===5){ const x=int(2,12), y=int(2,6); return {task:'calc',cols:'',q:x+'의 '+y+'제곱',formula:'='+x+'^'+y,expect:Math.pow(x,y)}; }
    if(kind===11){ const d=pick([1,2]); const x=int(5,200), y=int(3,13); return {task:'calc',cols:'',q:x+' 나누기 '+y+'을(를) 소수 '+(d===1?'첫째':'둘째')+' 자리까지 반올림',formula:'=ROUND('+x+'/'+y+','+d+')',expect:+(x/y).toFixed(d)}; }
    if(kind===12){ const cols=pick(['A=이름, B=점수','A=이름, B=가격, C=수량','A=날짜, B=지출','A=품목, B=판매량']); const parts=cols.split(', ').map(s=>s.split('=')); const pc=pick(parts.slice(1)); const [kw,fn]=pick([['합계','SUM'],['평균','AVERAGE'],['최댓값','MAX'],['최솟값','MIN']]); const k=int(1,20);
      return {task:'calc',cols,q:pc[1]+' '+kw+'에서 '+k+' 빼기',formula:'='+fn+'('+pc[0]+':'+pc[0]+')-'+k}; }
    if(kind===17){ const x=int(10,500), y=int(2,50), m=int(2,9); return {task:'calc',cols:'',q:x+'에서 '+y+'을(를) 뺀 값을 '+m+'배 하면',formula:'=('+x+'-'+y+')*'+m,expect:(x-y)*m}; }
    const r=calcItem(); if(r&&r.formula) return r;
  }
  return null;
}

/* ---------- plain arithmetic chat (answers are computed) ---------- */
function mathItem(){
  const k=int(0,9), a=int(2,99), b=int(2,99), c=int(2,30);
  const F=x=>x.toLocaleString('en-US'), n=(x)=>+(+x).toFixed(4);
  const Q=(q,a2)=>({messages:[{role:'user',content:q},{role:'assistant',content:a2}]});
  switch(k){
    case 0: return Q(pick([a+' 곱하기 '+b+'은(는)?',a+' × '+b+' 는?',a+'x'+b+' 계산해줘',a+'이랑 '+b+' 곱하면?']),a+' × '+b+' = '+F(a*b)+'(이)에요.');
    case 1: { const x=int(100,9999), y=int(100,9999); return Q(pick([x+' + '+y,x+' 더하기 '+y+'은(는)?',x+'이랑 '+y+' 합']),x+' + '+y+' = '+F(x+y)+'(이)에요.'); }
    case 2: { const x=int(500,9999), y=int(10,499); return Q(pick([x+' - '+y,x+' 빼기 '+y+'은(는)?',x+'에서 '+y+' 빼면?']),x+' - '+y+' = '+F(x-y)+'(이)에요.'); }
    case 3: { const y=pick([3,4,6,7,8,9,12,15,25]), x=y*int(5,80); return Q(pick([x+' 나누기 '+y,x+' / '+y+' 는?',x+'을(를) '+y+'(으)로 나누면?']),x+' ÷ '+y+' = '+F(x/y)+'(이)에요.'); }
    case 4: { const y=pick([7,13,17,19,23,27,29]), x=int(100,999); const q=Math.floor(x/y), r=x%y; return Q(x+' 나누기 '+y+'의 몫과 나머지',x+' ÷ '+y+'은 몫이 '+q+', 나머지가 '+r+'(이)에요.'); }
    case 5: { const m=int(3,30); const s=m*(m+1)/2; return Q(pick(['1부터 '+m+'까지 다 더하면?','1에서 '+m+'까지의 합']),'1부터 '+m+'까지 더하면 '+F(s)+'(이)에요.'); }
    case 6: { const p=int(2,12); return Q(pick([p+'의 제곱은?',p+' 제곱',p+'을 제곱하면?']),p+'의 제곱은 '+(p*p)+'(이)에요.'); }
    case 7: { const x=int(2,30)*int(2,9)*10, p=pick([10,20,25,30,40,50,5,15]); return Q(pick([x+'의 '+p+'%는?',x+' 중에 '+p+'퍼센트',x+'의 '+p+' 퍼센트 구해줘']),x+'의 '+p+'%는 '+n(x*p/100)+'(이)에요.'); }
    case 8: { const u=int(3,30)*100, q2=int(2,9), t2=int(2,9); return Q(u+'원짜리 '+NUMW[q2]+' 개랑 '+(u+500)+'원짜리 '+NUMW[t2]+' 개 사면 얼마야?',u+' × '+q2+' = '+F(u*q2)+', '+(u+500)+' × '+t2+' = '+F((u+500)*t2)+'이고, 합치면 '+F(u*q2+(u+500)*t2)+'원이에요.'); }
    default: { const x=int(-99,-3), y=int(2,9), z=pick([2,4,5]); const v=x*y/z; return Q(x+' × '+y+' / '+z+' 는?',x+' × '+y+' = '+x*y+', 이를 '+z+'로 나누면 '+n(v)+'(이)에요.'); }
  }
}

/* ---------- run ---------- */
function gen(name,fn,count,tag){
  const out=[], seen=new Set(); let tries=0;
  while(out.length<count&&tries<count*30){ tries++; let it; try{ it=fn(); }catch(e){ continue; } if(!it) continue;
    if(it.q) it.q=K(it.q); if(it.explain) it.explain=K(it.explain); if(it.answer&&it.answer.title) it.answer.title=K(it.answer.title); if(it.messages) it.messages.forEach(m=>{ m.content=K(m.content); });
    const key=JSON.stringify(it.messages?it.messages[0].content+'|'+it.messages[1].content:[it.q,it.table&&JSON.stringify(it.table),it.cell,it.cols,it.rows&&it.rows.length,it.formula]);
    if(seen.has(key)) continue; seen.add(key); out.push(it); }
  fs.writeFileSync(path.join(RAW,'gen22-'+name+'.jsonl'),out.map(x=>JSON.stringify(x)).join('\n')+'\n');
  console.log(name+':',out.length,'rows ('+tries+' tries)'); return out.length;
}
gen('formula',formulaItem,N.formula); gen('graph',graphItem,N.graph); gen('table',tableItem,N.table);
gen('unit',()=>{ const u=unitItem(); return u&&{task:'unit',q:u.q,value:u.value,from:u.from,to:u.to,expect:u.expect}; },N.unit);
gen('calc',calcItem2,N.calc); gen('math',mathItem,N.math);

if(process.argv.includes('--check')){
  const P=require(path.join(ROOT,'ai-prompts.js')); const rows=[]; const stats={};
  const jl=f=>fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
  for(const [kind,file] of [['formula','gen22-formula'],['graph','gen22-graph'],['table','gen22-table']]){
    const tmp=path.join(OUT,'.gen22-'+kind+'.jsonl'); const r=cp.spawnSync('node',[path.join(DIR,'check.js'),kind,path.join(RAW,file+'.jsonl'),'--out',tmp],{encoding:'utf8',maxBuffer:1<<28});
    const lines=(r.stdout||'').trim().split('\n'); console.log(kind+':',lines[lines.length-1]); const ok=fs.existsSync(tmp)?jl(tmp):[]; fs.rmSync(tmp,{force:true});
    ok.forEach(x=>rows.push(Object.assign({task:'gen22-'+kind},x.task?{}:{},{messages:x.messages}))); stats[kind]=ok.length; }
  // unit + calc: verified here with the engine
  let uOk=0,uBad=0; for(const it of jl(path.join(RAW,'gen22-unit.jsonl'))){ const v=E.convertUnit(it.value,it.from,it.to);
    if(v==null||Math.abs(v-it.expect)>1e-9*Math.max(1,Math.abs(v))){ uBad++; continue; }
    rows.push({task:'gen22-unit',messages:[{role:'system',content:P.unitSys},{role:'user',content:P.unitPrompt(it.q)},{role:'assistant',content:JSON.stringify({value:it.value,from:it.from,to:it.to})}]}); uOk++; }
  console.log('unit:',uOk,'ok',uBad,'bad'); stats.unit=uOk;
  let cOk=0,cBad=0; for(const it of jl(path.join(RAW,'gen22-calc.jsonl'))){ let good=true;
    try{ E.parse(it.formula.slice(1)); if(it.formula.split('(').length!==it.formula.split(')').length) good=false;
      if(it.expect!=null&&!it.cols){ const doc={sheets:[{name:'Sheet1',cells:{},cw:{},rows:200,cols:40,cfs:[],charts:[]}],active:0}; doc.sheets[0].cells[E.K(0,0)]={v:it.formula}; const eng=new E.Engine(doc); const v=eng.value(0,0,0); if(typeof v!=='number'||Math.abs(v-it.expect)>1e-6*Math.max(1,Math.abs(it.expect))) good=false; } }catch(e){ good=false; }
    if(!good){ cBad++; continue; }
    rows.push({task:'gen22-calc',messages:[{role:'system',content:P.calcSys},{role:'user',content:P.calcPrompt(it.cols,it.q)},{role:'assistant',content:JSON.stringify({formula:it.formula})}]}); cOk++; }
  console.log('calc:',cOk,'ok',cBad,'bad'); stats.calc=cOk;
  const mrows=jl(path.join(RAW,'gen22-math.jsonl')); mrows.forEach(x=>rows.push({task:'gen22-math',messages:x.messages})); stats.math=mrows.length;
  const shuf=shuffle(rows); fs.writeFileSync(path.join(OUT,'v22-extra.jsonl'),shuf.map(x=>JSON.stringify(x)).join('\n')+'\n');
  fs.writeFileSync(path.join(OUT,'v22-extra-stats.json'),JSON.stringify({total:shuf.length,byTask:stats},null,1)+'\n'); console.log('v22-extra.jsonl:',shuf.length,'rows',JSON.stringify(stats));
}
