#!/usr/bin/env node
/* Node tests for the Fry Sheet formula engine (engine.js). Run: node sheet/engine.test.js
   Each test builds a one-sheet doc from {A1:'raw', …}, evaluates with a fresh Engine and compares shown values. */
'use strict';
const assert=require('assert'), E=require('./engine.js');

function sheet(t){ const cells={}; for(const a in t){ const p=E.parseAddr(a); cells[E.K(p.r,p.c)]={v:t[a]}; } return {sheets:[{name:'S',cells}]}; }
/* values of the listed cells, read in that order with one engine (order matters for spills, so tests also try other orders) */
function vals(doc,addrs){ const e=new E.Engine(doc); return addrs.map(a=>{ const p=E.parseAddr(a); return E.formatValue(e.value(0,p.r,p.c)); }); }
function col(a,n){ const p=E.parseAddr(a); return Array.from({length:n},(_,i)=>E.addr(p.r+i,p.c)); }
function row(a,n){ const p=E.parseAddr(a); return Array.from({length:n},(_,i)=>E.addr(p.r,p.c+i)); }

let pass=0, failed=0;
function test(name,fn){ try{ fn(); pass++; }catch(e){ failed++; console.log('FAIL '+name+'\n  '+(e.message||e).split('\n').join('\n  ')); } }
const eq=(a,b)=>assert.deepStrictEqual(a,b);

/* scores: A1 header, A2:A7 names, B2:B7 scores, C2:C7 class */
const T={A1:'이름',B1:'점수',C1:'반',A2:'민수',B2:'72',C2:'1',A3:'지현',B3:'95',C3:'2',A4:'Tom',B4:'58',C4:'1',A5:'유나',B5:'88',C5:'2',A6:'tom',B6:'58',C6:'1',A7:'하늘',B7:'64',C7:'3'};
function withT(extra){ return sheet(Object.assign({},T,extra)); }

test('SEQUENCE rows only',()=>eq(vals(sheet({A1:'=SEQUENCE(4)'}),col('A1',5)),['1','2','3','4','']));
test('SEQUENCE rows, columns, start, step',()=>eq(vals(sheet({A1:'=SEQUENCE(2,3,10,5)'}),['A1','B1','C1','A2','B2','C2']),['10','15','20','25','30','35']));
test('SEQUENCE decimal step stays clean',()=>eq(vals(sheet({A1:'=SEQUENCE(3,1,0,0.1)'}),col('A1',3)),['0','0.1','0.2']));
test('SEQUENCE(0) is #CALC!',()=>eq(vals(sheet({A1:'=SEQUENCE(0)'}),['A1']),['#CALC!']));

test('FILTER rows by a condition',()=>eq(vals(withT({E1:'=FILTER(A2:A7,B2:B7>=70)'}),col('E1',4)),['민수','지현','유나','']));
test('FILTER keeps all columns of the block',()=>eq(vals(withT({E1:'=FILTER(A2:B7,C2:C7=2)'}),['E1','F1','E2','F2','E3']),['지현','95','유나','88','']));
test('FILTER with two conditions multiplied',()=>eq(vals(withT({E1:'=FILTER(A2:A7,(B2:B7>60)*(C2:C7=1))'}),col('E1',2)),['민수','']));
test('FILTER with nothing found uses if_empty',()=>eq(vals(withT({E1:'=FILTER(A2:A7,B2:B7>100,"없음")'}),['E1']),['없음']));
test('FILTER with nothing found and no if_empty is #CALC!',()=>eq(vals(withT({E1:'=FILTER(A2:A7,B2:B7>100)'}),['E1']),['#CALC!']));
test('FILTER with mismatched sizes is #VALUE!',()=>eq(vals(withT({E1:'=FILTER(A2:A7,B2:B5>1)'}),['E1']),['#VALUE!']));
test('FILTER columns with a row condition',()=>eq(vals(sheet({A1:'1',B1:'2',C1:'3',A2:'x',B2:'y',C2:'z',A4:'=FILTER(A2:C2,A1:C1<>2)'}),['A4','B4','C4']),['x','z','']));

test('SORT ascending by first column',()=>eq(vals(withT({E1:'=SORT(B2:B7)'}),col('E1',6)),['58','58','64','72','88','95']));
test('SORT descending by the second column',()=>eq(vals(withT({E1:'=SORT(A2:B7,2,-1)'}),['E1','F1','E2','F2','E5','F5','E6']),['지현','95','유나','88','Tom','58','tom']));
test('SORT is stable for ties',()=>eq(vals(withT({E1:'=SORT(A2:B7,2)'}),['E1','E2']),['Tom','tom']));
test('SORT text: case-insensitive, blanks last',()=>eq(vals(sheet({A1:'b',A2:'',A3:'C',A4:'a',C1:'=SORT(A1:A4)'}),col('C1',4)),['a','b','C','']));
test('SORT by columns',()=>eq(vals(sheet({A1:'3',B1:'1',C1:'2',A2:'c',B2:'a',C2:'b',A4:'=SORT(A1:C2,1,1,TRUE)'}),['A4','B4','C4','A5','B5','C5']),['1','2','3','a','b','c']));
test('SORT with a bad index is #VALUE!',()=>eq(vals(withT({E1:'=SORT(A2:B7,3)'}),['E1']),['#VALUE!']));

test('SORTBY one key, descending',()=>eq(vals(withT({E1:'=SORTBY(A2:A7,B2:B7,-1)'}),col('E1',3)),['지현','유나','민수']));
test('SORTBY two keys',()=>eq(vals(withT({E1:'=SORTBY(A2:A7,C2:C7,1,B2:B7,-1)'}),col('E1',6)),['민수','Tom','tom','지현','유나','하늘']));
test('SORTBY with a key of the wrong size is #VALUE!',()=>eq(vals(withT({E1:'=SORTBY(A2:A7,B2:B4)'}),['E1']),['#VALUE!']));

test('UNIQUE values in order of appearance',()=>eq(vals(withT({E1:'=UNIQUE(C2:C7)'}),col('E1',4)),['1','2','3','']));
test('UNIQUE ignores case',()=>eq(vals(withT({E1:'=UNIQUE(B2:B7)'}),col('E1',6)),['72','95','58','88','64','']));
test('UNIQUE rows, exactly once',()=>eq(vals(withT({E1:'=UNIQUE(C2:C7,FALSE,TRUE)'}),col('E1',2)),['3','']));
test('UNIQUE by columns',()=>eq(vals(sheet({A1:'1',B1:'2',C1:'1',A3:'=UNIQUE(A1:C1,TRUE)'}),row('A3',3)),['1','2','']));

test('nested: SORT(UNIQUE(FILTER()))',()=>eq(vals(withT({E1:'=SORT(UNIQUE(FILTER(B2:B7,C2:C7=1)),1,-1)'}),col('E1',3)),['72','58','']));
test('COUNTA, ROWS and INDEX over an array',()=>eq(vals(withT({E1:'=ROWS(FILTER(A2:A7,C2:C7=1))',E2:'=INDEX(SORT(B2:B7,1,-1),2)',E3:'=COUNTA(UNIQUE(A2:A7))'}),['E1','E2','E3']),['3','88','5']));

test('a spill fills cells that other formulas can read',()=>eq(vals(sheet({A1:'=SEQUENCE(5)',C1:'=SUM(A1:A5)',C2:'=A4*10'}),['C1','C2']),['15','40']));
test('reading a spilled cell before its anchor gives the same answer',()=>eq(vals(sheet({A1:'=SEQUENCE(5)',C1:'=SUM(A1:A5)',C2:'=A4*10'}),['C2','C1','A1']),['40','15','1']));
test('a value in the way gives #SPILL!',()=>eq(vals(sheet({A1:'=SEQUENCE(3)',A3:'x'}),col('A1',3)),['#SPILL!','','x']));
test('clearing the way spills again',()=>{ const d=sheet({A1:'=SEQUENCE(3)',A3:'x'}); delete d.sheets[0].cells[E.K(2,0)]; eq(vals(d,col('A1',3)),['1','2','3']); });
test('two spills that would overlap: one is #SPILL!',()=>{ const v=vals(sheet({B1:'=SEQUENCE(3)',A2:'=SEQUENCE(1,3)'}),['B1','A2','B2']); assert.ok(v.indexOf('#SPILL!')>=0,v.join(',')); });
test('SUM over a spill that is #SPILL! reads nothing there',()=>eq(vals(sheet({A1:'=SEQUENCE(3)',A2:'5',C1:'=SUM(A1:A3)'}),['C1']),['#SPILL!']));

test('element-wise operators spill',()=>eq(vals(sheet({A1:'1',A2:'2',A3:'3',B1:'=A1:A3*2'}),col('B1',3)),['2','4','6']));
test('a range by itself spills',()=>eq(vals(sheet({A1:'1',A2:'2',B1:'=A1:A2'}),col('B1',2)),['1','2']));
test('a row and a column stretch into a table',()=>eq(vals(sheet({A1:'=SEQUENCE(3)*SEQUENCE(1,3)'}),['A1','C1','A3','C3']),['1','3','3','9']));
test('SUM and SUMPRODUCT of element-wise products',()=>eq(vals(sheet({A1:'1',A2:'2',A3:'3',B1:'4',B2:'5',B3:'6',C1:'=SUM(A1:A3*B1:B3)',C2:'=SUMPRODUCT((A1:A3>1)*B1:B3)'}),['C1','C2']),['32','11']));
test('shape mismatch gives #N/A for the missing cells',()=>eq(vals(sheet({A1:'1',A2:'2',A3:'3',B1:'1',B2:'2',D1:'=A1:A3+B1:B2'}),col('D1',3)),['2','4','#N/A']));
test('errors stay in their own cell',()=>eq(vals(sheet({A1:'1',A2:'0',A3:'2',B1:'=1/A1:A3'}),col('B1',3)),['1','#DIV/0!','0.5']));
test('IF over a range works per cell',()=>eq(vals(withT({E1:'=IF(B2:B7>=60,"통과","재시험")'}),col('E1',3)),['통과','통과','재시험']));
test('IFERROR over an array replaces each error',()=>eq(vals(sheet({A1:'1',A2:'0',B1:'=IFERROR(1/A1:A2,"-")'}),col('B1',2)),['1','-']));
test('array literal spills across',()=>eq(vals(sheet({A1:'={1,2,3}'}),row('A1',3)),['1','2','3']));

test('old scalar formulas are unchanged',()=>eq(vals(withT({E1:'=SUM(B2:B7)',E2:'=IF(B2>70,"a","b")',E3:'=VLOOKUP("유나",A2:B7,2,FALSE)',E4:'=COUNTIF(B2:B7,">60")'}),['E1','E2','E3','E4']),['435','a','88','4']));
test('a real cycle is still #CYCLE!',()=>eq(vals(sheet({A1:'=B1',B1:'=A1'}),['A1']),['#CYCLE!']));
test('no false cycle when a sorted cell reads an empty cell below the sort',()=>{
  const d=sheet({A1:'=SUM(E5:E6)+1',A2:'3',A3:'2',D1:'=SORT(A1:A3)'});
  eq(vals(d,['A1','D1','D2','D3']),['1','1','2','3']); eq(vals(d,['D2','A1']),['2','1']); });
test('spills from a cycle do not stick',()=>eq(vals(sheet({A1:'=SEQUENCE(B5+2)',B5:'=A1'}),['B5','A1']).every(v=>v==='#CYCLE!'||v==='1'),true));

test('spills() lists every block',()=>{ const e=new E.Engine(sheet({A1:'=SEQUENCE(2,2)',D1:'=UNIQUE({1,1,2})',G1:'=SUM(1,2)'})); const s=e.spills(0).map(g=>E.rangeStr(g)).sort(); eq(s,['A1:B2','D1:F1']); });
test('spillAt finds the block of a spilled cell',()=>{ const e=new E.Engine(sheet({B2:'=SEQUENCE(3)'})); e.spills(0); eq(E.rangeStr(e.spillAt(0,3,1)),'B2:B4'); eq(e.spillAt(0,4,1),null); });

test('toXl adds the Excel prefix to new functions only',()=>eq(E.toXl('SUM(FILTER(A1:A3,A1:A3>1))+XLOOKUP(1,A:A,B:B)'),'SUM(_xlfn._xlws.FILTER(A1:A3,A1:A3>1))+_xlfn.XLOOKUP(1,A:A,B:B)'));
test('toXl leaves text and cell names alone',()=>eq(E.toXl('"SORT("&SORT1&IFS(A1,1)'),'"SORT("&SORT1&_xlfn.IFS(A1,1)'));
test('fromXl removes the prefixes',()=>eq(E.fromXl('_xlfn._xlws.SORT(_xlfn.UNIQUE(A1:A3))+_xlfn.SEQUENCE(2)'),'SORT(UNIQUE(A1:A3))+SEQUENCE(2)'));

test('fromXl also takes a lone _xlws. prefix',()=>eq(E.fromXl('_xlws.FILTER(A1:A3,A1:A3>1)'),'FILTER(A1:A3,A1:A3>1)'));

const f=(x,a)=>{ const r=vals(sheet(Object.assign({A1:x},a||{})),['A1']); return r[0]; };
const near=(x,v,tol,a)=>{ const r=parseFloat(f(x,a)); assert.ok(Math.abs(r-v)<(tol||1e-4),x+' = '+r+' wanted '+v); };
test('v20 trig',()=>{ near('=SIN(0)',0); near('=COS(0)',1); near('=ATAN2(1,1)',Math.PI/4); near('=DEGREES(PI())',180); near('=RADIANS(180)',Math.PI); });
test('v20 combinatorics',()=>{ eq(f('=FACT(5)'),'120'); eq(f('=COMBIN(5,2)'),'10'); eq(f('=PERMUT(5,2)'),'20'); eq(f('=GCD(12,18)'),'6'); eq(f('=LCM(4,6)'),'12'); eq(f('=EVEN(3)'),'4'); eq(f('=ODD(2)'),'3'); eq(f('=QUOTIENT(7,2)'),'3'); });
test('v20 stats',()=>{ near('=NORM.S.DIST(1.96,TRUE)',0.975,0.001); near('=NORM.S.INV(0.975)',1.95996,0.001); near('=GEOMEAN(2,8)',4); near('=HARMEAN(2,2)',2); near('=BINOM.DIST(2,4,0.5,FALSE)',0.375); near('=POISSON.DIST(0,1,FALSE)',0.367879,1e-4); });
test('v20 regression',()=>{ const a={B1:'1',B2:'2',B3:'3',C1:'2',C2:'4',C3:'6'}; near('=RSQ(C1:C3,B1:B3)',1,1e-6,a); near('=FORECAST(4,C1:C3,B1:B3)',8,1e-6,a); });
test('v20 logic/info',()=>{ eq(f('=SWITCH(2,1,"a",2,"b","z")'),'b'); eq(f('=SWITCH(9,1,"a","z")'),'z'); eq(f('=ISNA(NA())'),'TRUE'); eq(f('=ISLOGICAL(TRUE)'),'TRUE'); });
test('v20 text',()=>{ eq(f('=TEXTBEFORE("a-b-c","-")'),'a'); eq(f('=TEXTAFTER("a-b-c","-")'),'b-c'); eq(f('=CODE("A")'),'65'); eq(f('=UNICHAR(65)'),'A'); eq(f('=NUMBERVALUE("1,5",",")'),'1.5'); });
test('v20 TEXTSPLIT spills',()=>eq(vals(sheet({A1:'=TEXTSPLIT("a,b,c",",")'}),['A1','B1','C1']),['a','b','c']));
test('v20 TRANSPOSE/VSTACK/HSTACK',()=>{ eq(vals(sheet({A1:'1',A2:'2',C1:'=TRANSPOSE(A1:A2)'}),['C1','D1']),['1','2']); eq(vals(sheet({A1:'1',B1:'2',D1:'=VSTACK(A1:A1,B1:B1)'}),['D1','D2']),['1','2']); eq(vals(sheet({A1:'1',B1:'2',D1:'=HSTACK(A1,B1)'}),['D1','E1']),['1','2']); });
test('v20 dates',()=>{ eq(f('=EOMONTH(DATE(2024,1,15),1)').length>0,true); eq(f('=TEXT(EOMONTH(DATE(2024,1,15),1),"yyyy-mm-dd")'),'2024-02-29'); eq(f('=TEXT(WORKDAY(DATE(2024,1,5),1),"yyyy-mm-dd")'),'2024-01-08'); eq(f('=NETWORKDAYS(DATE(2024,1,1),DATE(2024,1,7))'),'5'); eq(f('=ISOWEEKNUM(DATE(2024,1,1))'),'1'); });
test('v20 finance',()=>{ near('=PMT(0.05/12,360,-200000)',1073.64,0.01); near('=FV(0.05,10,-100)',1257.79,0.01); near('=PV(0.05,10,-100)',772.17,0.01); near('=NPV(0.1,100,100)',173.55,0.01); near('=SLN(1000,100,9)',100); near('=IRR(B1:B3)',0.1,1e-4,{B1:'-100',B2:'55',B3:'60.5'}); });
test('v20 LOOKUP',()=>eq(f('=LOOKUP(2,B1:B3,C1:C3)',{B1:'1',B2:'2',B3:'3',C1:'a',C2:'b',C3:'c'}),'b'));

/* v21: pivot with several row fields, max/min; locks; name rename; checkboxes and cross-sheet refs in formulas */
const PV=[['A',1,10],['A',2,20],['B',1,5],['A',1,30],['B',2,'']];
test('v21 pivot two keys sum',()=>{ const r=E.pivot(PV,[0,1],2,'sum','first'); eq(r.rows,[['A',1,40],['A',2,20],['B',1,5],['B',2,0]]); eq(r.total,65); });
test('v21 pivot max/min/avg/count',()=>{ eq(E.pivot(PV,[0],2,'max','first').rows,[['A',30],['B',5]]); eq(E.pivot(PV,[0],2,'min','first').rows,[['A',10],['B',5]]); eq(E.pivot(PV,[0],2,'avg','first').rows,[['A',20],['B',5]]); eq(E.pivot(PV,[0],2,'count','first').rows,[['A',3],['B',1]]); });
test('v21 pivot single key keeps old shape and sorts',()=>{ eq(E.pivot(PV,0,2,'sum','val').rows,[['A',60],['B',5]]); eq(E.pivot(PV,[0,1],2,'sum','key').rows[0],['A',1,40]); });
test('v21 pivot max of nothing is empty',()=>eq(E.pivot([['x','']],[0],1,'max','first').rows,[['x',null]]));
test('v21 lockHit/lockAny',()=>{ const lk={rg:[{r1:1,c1:1,r2:3,c2:2}]}; eq(E.lockHit(lk,2,2),true); eq(E.lockHit(lk,0,0),false); eq(E.lockAny(lk,{r1:3,c1:2,r2:9,c2:9}),true); eq(E.lockAny(lk,{r1:4,c1:0,r2:9,c2:9}),false); eq(E.lockHit({all:1},50,50),true); eq(E.lockHit(null,0,0),false); });
test('v21 lockCut leaves the rest of a range',()=>{ const l=E.lockCut([{r1:0,c1:0,r2:4,c2:4}],{r1:1,c1:1,r2:2,c2:2}); let n=0; for(let r=0;r<5;r++) for(let c=0;c<5;c++){ const hit=E.lockHit({rg:l},r,c); eq(hit,!(r>=1&&r<=2&&c>=1&&c<=2)); if(hit) n++; } eq(n,21); eq(E.lockCut([{r1:0,c1:0,r2:1,c2:1}],{r1:5,c1:5,r2:6,c2:6}).length,1); eq(E.lockCut([{r1:1,c1:1,r2:2,c2:2}],{r1:0,c1:0,r2:9,c2:9}).length,0); });
test('v21 renameNameInFormula',()=>{ eq(E.renameNameInFormula('=SUM(sales)+sales2','sales','합계'),'=SUM(합계)+sales2'); eq(E.renameNameInFormula('=SUM(A1)','sales','x'),'=SUM(A1)'); eq(E.renameNameInFormula('=sales*2','SALES','b'),'=b*2'); });
test('v21 named range in SUM, rename keeps working',()=>{ const d={names:[{name:'성적합계',ref:"S!$B$1:$B$3"}],sheets:[{name:'S',cells:{}}]}; ['1','2','3'].forEach((v,i)=>d.sheets[0].cells[E.K(i,1)]={v}); d.sheets[0].cells[E.K(0,3)]={v:'=SUM(성적합계)'};
  eq(E.formatValue(new E.Engine(d).value(0,0,3)),'6'); d.names[0].name='점수'; d.sheets[0].cells[E.K(0,3)].v=E.renameNameInFormula('=SUM(성적합계)','성적합계','점수'); eq(E.formatValue(new E.Engine(d).value(0,0,3)),'6'); });
test('v21 checkbox values count in COUNTIF/SUMIF',()=>{ const a={A1:'TRUE',A2:'FALSE',A3:'TRUE',B1:'5',B2:'6',B3:'7',D1:'=COUNTIF(A1:A3,TRUE)',D2:'=SUMIF(A1:A3,TRUE,B1:B3)',D3:'=IF(A1,"v","x")',D4:'=COUNTIF(A1:A3,FALSE)'}; eq(vals(sheet(a),['D1','D2','D3','D4']),['2','12','v','1']); });
test('v21 cross-sheet references, quoted and plain names',()=>{ const d={sheets:[{name:'S',cells:{}},{name:'시트2',cells:{}},{name:'My Data',cells:{}}]}; const set=(si,a,v)=>{ const p=E.parseAddr(a); d.sheets[si].cells[E.K(p.r,p.c)]={v}; };
  set(1,'A1','5'); set(1,'A2','6'); set(2,'B1','10'); set(0,'A1','=SUM(시트2!A1:A2)'); set(0,'A2',"='My Data'!B1*2"); set(0,'A3','=시트2!A1+시트2!A2'); set(0,'A4','=없는시트!A1');
  const e=new E.Engine(d); eq([0,1,2,3].map(r=>E.formatValue(e.value(0,r,0))),['11','20','11','#REF!']); eq(E.quoteSheet('시트2'),'시트2'); eq(E.quoteSheet('My Data'),"'My Data'"); });

/* v22: CONVERT and the "AI 계산" fast path (calc.js) */
const C=require('./calc.js');
test('v22 CONVERT length, mass, temperature, prefixes',()=>eq(vals(sheet({A1:'=CONVERT(1,"in","cm")',A2:'=CONVERT(3,"mi","km")',A3:'=CONVERT(30,"C","F")',A4:'=CONVERT(212,"F","C")',A5:'=CONVERT(0,"C","K")',A6:'=CONVERT(1,"lbm","g")',A7:'=CONVERT(1500,"mg","g")'}),col('A1',7)),['2.54','4.828032','86','100','273.15','453.59237','1.5']));
test('v22 CONVERT area, volume, speed, time, data, Korean units',()=>eq(vals(sheet({A1:'=CONVERT(1,"평","m2")',A2:'=CONVERT(1,"km2","m2")',A3:'=CONVERT(1,"l","ml")',A4:'=CONVERT(100,"km/h","m/s")',A5:'=CONVERT(90,"mn","hr")',A6:'=CONVERT(1,"Gibyte","Mibyte")',A7:'=CONVERT(1,"근","g")',A8:'=CONVERT(1,"kbyte","bit")'}),col('A1',8)),['3.30578512397','1000000','1000','27.7777777778','1.5','1024','600','8000']));
test('v22 CONVERT unknown or mixed units is #N/A',()=>eq(vals(sheet({A1:'=CONVERT(1,"m","kg")',A2:'=CONVERT(1,"xx","m")',A3:'=CONVERT(1,"M","m")',A4:'=CONVERT(A5,"m","cm")'}),col('A1',4)),['#N/A','#N/A','#N/A','0']));
test('v22 Engine.calc evaluates a formula without a cell',()=>{ const e=new E.Engine(withT({})); eq([e.calc(0,'=AVERAGE(B2:B7)-5'),e.calc(0,'SUM(B:B)'),E.formatValue(e.calc(0,'=1/0')),E.formatValue(e.calc(0,'=NOPE(1)'))],[67.5,435,'#DIV/0!','#NAME?']); });
const fastF=q=>{ const r=C.fast(q); return r&&r.formula; };
test('v22 fast path: plain arithmetic and words',()=>eq(['12*7+3','123 곱하기 4','15% of 80','삼백 더하기 이십','3500원짜리 7개에 10% 할인','80의 15%','2의 10제곱','루트 16','2만5천 빼기 3천','12 x 3은 얼마야?','100에 10% 인상'].map(fastF),
  ['=12*7+3','=123*4','=80*15%','=300+20','=3500*7*(1-10%)','=80*15%','=2^10','=SQRT(16)','=25000-3000','=12*3','=100*(1+10%)']));
test('v22 fast path: results through the engine',()=>{ const e=new E.Engine(sheet({})); eq(['3500원짜리 7개에 10% 할인','15% of 80','십이 나누기 삼'].map(q=>e.calc(0,fastF(q))),[22050,12,4]); });
test('v22 fast path: unit phrases',()=>eq(['170cm는 몇 인치','섭씨 30도는 화씨','3마일 km','5 kg to lb','90분은 몇 시간','100제곱미터는 몇 평','2GB는 몇 MB','시속 100km는 몇 마일','72°F는 섭씨로','30도는 화씨로','170 cm in inches'].map(fastF),
  ['=CONVERT(170,"cm","in")','=CONVERT(30,"C","F")','=CONVERT(3,"mi","km")','=CONVERT(5,"kg","lbm")','=CONVERT(90,"mn","hr")','=CONVERT(100,"m2","평")','=CONVERT(2,"Gibyte","Mibyte")','=CONVERT(100,"km/h","mph")','=CONVERT(72,"F","C")','=CONVERT(30,"C","F")','=CONVERT(170,"cm","in")']));
test('v22 fast path leaves the rest to the AI',()=>eq(['A열 평균에서 5 빼기','평균 구해줘','B열 합계','3분의 1','안녕','5'].map(fastF),[null,null,null,null,null,null]));
test('v22 typed formulas pass through, unit words map to codes',()=>eq([fastF('SUM(B2:B5)*2'),fastF('=A1/3'),C.unitCode('inch'),C.unitCode('킬로그램'),C.unitCode('°F'),C.unitCode('Gibyte'),C.unitCode('banana')],['=SUM(B2:B5)*2','=A1/3','in','kg','F','Gibyte',null]));
test('v22 Korean number words',()=>eq(['삼백오십','2만5천','3.5만','십이','일억'].map(C.koNum),[350,25000,35000,12,1e8]));

console.log(pass+' passed, '+failed+' failed');
process.exit(failed?1:0);
