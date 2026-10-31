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

/* v23: CONVERT and the "AI 계산" fast path (calc.js) */
const C=require('./calc.js');
test('v23 CONVERT length, mass, temperature, prefixes',()=>eq(vals(sheet({A1:'=CONVERT(1,"in","cm")',A2:'=CONVERT(3,"mi","km")',A3:'=CONVERT(30,"C","F")',A4:'=CONVERT(212,"F","C")',A5:'=CONVERT(0,"C","K")',A6:'=CONVERT(1,"lbm","g")',A7:'=CONVERT(1500,"mg","g")'}),col('A1',7)),['2.54','4.828032','86','100','273.15','453.59237','1.5']));
test('v23 CONVERT area, volume, speed, time, data, Korean units',()=>eq(vals(sheet({A1:'=CONVERT(1,"평","m2")',A2:'=CONVERT(1,"km2","m2")',A3:'=CONVERT(1,"l","ml")',A4:'=CONVERT(100,"km/h","m/s")',A5:'=CONVERT(90,"mn","hr")',A6:'=CONVERT(1,"Gibyte","Mibyte")',A7:'=CONVERT(1,"근","g")',A8:'=CONVERT(1,"kbyte","bit")'}),col('A1',8)),['3.30578512397','1000000','1000','27.7777777778','1.5','1024','600','8000']));
test('v23 CONVERT unknown or mixed units is #N/A',()=>eq(vals(sheet({A1:'=CONVERT(1,"m","kg")',A2:'=CONVERT(1,"xx","m")',A3:'=CONVERT(1,"M","m")',A4:'=CONVERT(A5,"m","cm")'}),col('A1',4)),['#N/A','#N/A','#N/A','0']));
test('v23 Engine.calc evaluates a formula without a cell',()=>{ const e=new E.Engine(withT({})); eq([e.calc(0,'=AVERAGE(B2:B7)-5'),e.calc(0,'SUM(B:B)'),E.formatValue(e.calc(0,'=1/0')),E.formatValue(e.calc(0,'=NOPE(1)'))],[67.5,435,'#DIV/0!','#NAME?']); });
const fastF=q=>{ const r=C.fast(q); return r&&r.formula; };
test('v23 fast path: plain arithmetic and words',()=>eq(['12*7+3','123 곱하기 4','15% of 80','삼백 더하기 이십','3500원짜리 7개에 10% 할인','80의 15%','2의 10제곱','루트 16','2만5천 빼기 3천','12 x 3은 얼마야?','100에 10% 인상'].map(fastF),
  ['=12*7+3','=123*4','=80*15%','=300+20','=3500*7*(1-10%)','=80*15%','=2^10','=SQRT(16)','=25000-3000','=12*3','=100*(1+10%)']));
test('v23 fast path: results through the engine',()=>{ const e=new E.Engine(sheet({})); eq(['3500원짜리 7개에 10% 할인','15% of 80','십이 나누기 삼'].map(q=>e.calc(0,fastF(q))),[22050,12,4]); });
test('v23 fast path: unit phrases',()=>eq(['170cm는 몇 인치','섭씨 30도는 화씨','3마일 km','5 kg to lb','90분은 몇 시간','100제곱미터는 몇 평','2GB는 몇 MB','시속 100km는 몇 마일','72°F는 섭씨로','30도는 화씨로','170 cm in inches'].map(fastF),
  ['=CONVERT(170,"cm","in")','=CONVERT(30,"C","F")','=CONVERT(3,"mi","km")','=CONVERT(5,"kg","lbm")','=CONVERT(90,"mn","hr")','=CONVERT(100,"m2","평")','=CONVERT(2,"Gibyte","Mibyte")','=CONVERT(100,"km/h","mph")','=CONVERT(72,"F","C")','=CONVERT(30,"C","F")','=CONVERT(170,"cm","in")']));
test('v23 fast path leaves the rest to the AI',()=>eq(['A열 평균에서 5 빼기','평균 구해줘','B열 합계','3분의 1','안녕','5'].map(fastF),[null,null,null,null,null,null]));
test('v23 typed formulas pass through, unit words map to codes',()=>eq([fastF('SUM(B2:B5)*2'),fastF('=A1/3'),C.unitCode('inch'),C.unitCode('킬로그램'),C.unitCode('°F'),C.unitCode('Gibyte'),C.unitCode('banana')],['=SUM(B2:B5)*2','=A1/3','in','kg','F','Gibyte',null]));
test('v23 Korean number words',()=>eq(['삼백오십','2만5천','3.5만','십이','일억'].map(C.koNum),[350,25000,35000,12,1e8]));

/* v41: more functions. expected values are the ones in Excel's help pages */
const ev1=(f,extra)=>vals(sheet(Object.assign({A1:f},extra||{})),['A1'])[0];
const nr=(f,x,extra,d=1e-6)=>{ const v=parseFloat(ev1(f,extra)); assert.ok(Math.abs(v-x)<d,f+' = '+v+', wanted '+x); };
test('v41 ROW and COLUMN of a plain cell reference',()=>eq([ev1('=ROW(B5)'),ev1('=COLUMN(C2)'),ev1('=ROW(B5:B9)')],['5','3','5']));
test('v41 time functions',()=>eq([ev1('=HOUR(TIME(13,45,30))'),ev1('=MINUTE("2026-10-31 13:45:30")'),ev1('=SECOND("13:45:30")'),ev1('=TIMEVALUE("6:00")'),ev1('=HOUR(0.75)'),ev1('=TIME(25,0,0)'),ev1('=HOUR("abc")')],['13','45','30','0.25','18','0.0416666666667','#VALUE!']));
test('v41 DAYS360 and YEARFRAC',()=>{ eq([ev1('=DAYS360("2026-01-30","2026-03-31")'),ev1('=DAYS360("2026-01-30","2026-03-31",TRUE)'),ev1('=YEARFRAC("2026-01-01","2026-07-01")')],['60','60','0.5']); nr('=YEARFRAC("2026-01-01","2026-07-01",3)',181/365); nr('=YEARFRAC("2024-01-01","2024-07-01",1)',182/366); });
test('v41 NETWORKDAYS.INTL and WORKDAY.INTL',()=>eq([ev1('=NETWORKDAYS.INTL("2024-01-01","2024-01-07")'),ev1('=NETWORKDAYS.INTL("2024-01-01","2024-01-07",11)'),ev1('=NETWORKDAYS.INTL("2024-01-01","2024-01-07","1111100")'),ev1('=NETWORKDAYS.INTL("2024-01-01","2024-01-07",7)'),ev1('=WORKDAY.INTL("2024-01-05",1,11)'),ev1('=WORKDAY.INTL("2024-01-05",1)')],['5','6','2','5','2024-01-06','2024-01-08']));
test('v41 INDIRECT',()=>eq([ev1('=INDIRECT("A"&2)',{A2:'9'}),ev1('=SUM(INDIRECT("A2:A4"))',{A2:'1',A3:'2',A4:'3'}),ev1('=INDIRECT("S!A2")',{A2:'4'}),ev1('=INDIRECT("zz")'),ev1('=INDIRECT("A2",FALSE)',{A2:'1'})],['9','6','4','#REF!','#REF!']));
test('v41 INDIRECT reads a named range',()=>{ const d=sheet({A2:'5',A3:'6',B1:'=SUM(INDIRECT("Pts"))'}); d.names=[{name:'Pts',ref:'S!$A$2:$A$3'}]; eq(vals(d,['B1']),['11']); });
test('v41 OFFSET',()=>eq([ev1('=OFFSET(A2,1,0)',{A2:'1',A3:'7'}),ev1('=SUM(OFFSET(A2,0,0,3,1))',{A2:'1',A3:'2',A4:'3'}),ev1('=OFFSET(A2,-5,0)')],['7','6','#REF!']));
test('v41 ADDRESS',()=>eq([ev1('=ADDRESS(2,3)'),ev1('=ADDRESS(2,3,4)'),ev1('=ADDRESS(1,1,1,TRUE,"Sheet 2")'),ev1('=ADDRESS(2,3,1,FALSE)')],['$C$2','C2',"'Sheet 2'!$A$1",'R2C3']));
test('v41 FORMULATEXT, ISFORMULA, ISREF, TYPE, SHEET',()=>eq([ev1('=FORMULATEXT(B1)',{B1:'=1+2'}),ev1('=FORMULATEXT(B1)',{B1:'5'}),ev1('=ISFORMULA(B1)',{B1:'=2'}),ev1('=ISFORMULA(B1)',{B1:'2'}),ev1('=ISREF(B1)'),ev1('=ISREF(5)'),ev1('=TYPE(1)'),ev1('=TYPE("a")'),ev1('=TYPE(TRUE)'),ev1('=SHEET()'),ev1('=SHEETS()')],['=1+2','#N/A','TRUE','FALSE','TRUE','FALSE','1','2','4','1','1']));
test('v41 ERROR.TYPE and CELL',()=>eq([ev1('=ERROR.TYPE(1/0)'),ev1('=ERROR.TYPE(NA())'),ev1('=ERROR.TYPE(5)'),ev1('=CELL("row",B3)'),ev1('=CELL("col",B3)'),ev1('=CELL("address",B3)')],['2','7','#N/A','3','2','$B$3']));
test('v41 XMATCH',()=>eq([ev1('=XMATCH(3,A2:A5)',{A2:'1',A3:'2',A4:'3',A5:'4'}),ev1('=XMATCH("b",A2:A4)',{A2:'a',A3:'B',A4:'c'}),ev1('=XMATCH(2.5,A2:A4,1)',{A2:'1',A3:'2',A4:'3'}),ev1('=XMATCH(2.5,A2:A4,-1)',{A2:'1',A3:'2',A4:'3'}),ev1('=XMATCH(1,A2:A4,0,-1)',{A2:'1',A3:'2',A4:'1'}),ev1('=XMATCH("a*",A2:A3,2)',{A2:'xa',A3:'ab'}),ev1('=XMATCH(9,A2:A3)',{A2:'1',A3:'2'})],['3','2','3','2','3','2','#N/A']));
test('v41 LET',()=>eq([ev1('=LET(x,2,y,3,x*y)'),ev1('=LET(x,A2,x+1)',{A2:'4'}),ev1('=LET(x,2,x,x+1)'),ev1('=LET(x,2,x,x+1,x)'),ev1('=LET(a,5,b,a*2,LET(a,1,a+b))'),ev1('=LET(x,2)')],['6','5','#VALUE!','3','11','#VALUE!']));
test('v41 LET with ranges spills',()=>eq(vals(sheet({A1:'=LET(r,B1:B3,r*2)',B1:'1',B2:'2',B3:'3'}),col('A1',3)),['2','4','6']));
test('v41 MAP, REDUCE, SCAN, BYROW, BYCOL, MAKEARRAY',()=>{
  eq(vals(sheet({A1:'=MAP(C1:C3,LAMBDA(v,v*2))',C1:'1',C2:'2',C3:'3'}),col('A1',3)),['2','4','6']);
  eq(vals(sheet({A1:'=MAP(C1:C2,D1:D2,LAMBDA(a,b,a+b))',C1:'1',C2:'2',D1:'10',D2:'20'}),col('A1',2)),['11','22']);
  eq(ev1('=REDUCE(0,C1:C3,LAMBDA(a,v,a+v))',{C1:'1',C2:'2',C3:'3'}),'6');
  eq(ev1('=REDUCE(1,C1:C3,LAMBDA(a,v,a*v))',{C1:'2',C2:'3',C3:'4'}),'24');
  eq(vals(sheet({A1:'=SCAN(0,C1:C3,LAMBDA(a,v,a+v))',C1:'1',C2:'2',C3:'3'}),col('A1',3)),['1','3','6']);
  eq(vals(sheet({A1:'=BYROW(C1:D2,LAMBDA(r,SUM(r)))',C1:'1',D1:'2',C2:'3',D2:'4'}),col('A1',2)),['3','7']);
  eq(vals(sheet({A1:'=BYCOL(C1:D2,LAMBDA(c,MAX(c)))',C1:'1',D1:'2',C2:'3',D2:'4'}),row('A1',2)),['3','4']);
  eq(vals(sheet({A1:'=MAKEARRAY(2,3,LAMBDA(i,j,i*j))'}),['A1','B1','C1','A2','B2','C2']),['1','2','3','2','4','6']); });
test('v41 TAKE, DROP, CHOOSEROWS, CHOOSECOLS, EXPAND',()=>{ const m={H1:'1',I1:'2',J1:'3',H2:'4',I2:'5',J2:'6'};
  eq(vals(sheet(Object.assign({A1:'=TAKE(H1:J2,1,2)'},m)),['A1','B1']),['1','2']);
  eq(vals(sheet(Object.assign({A1:'=TAKE(H1:J2,-1,-2)'},m)),['A1','B1']),['5','6']);
  eq(vals(sheet(Object.assign({A1:'=DROP(H1:J2,1,1)'},m)),['A1','B1']),['5','6']);
  eq(vals(sheet(Object.assign({A1:'=CHOOSEROWS(H1:J2,2,1)'},m)),['A1','B1','C1','A2']),['4','5','6','1']);
  eq(vals(sheet(Object.assign({A1:'=CHOOSECOLS(H1:J2,3,1)'},m)),['A1','B1','A2','B2']),['3','1','6','4']);
  eq(vals(sheet(Object.assign({A1:'=EXPAND(H1:I1,2,3,0)'},m)),['A1','B1','C1','A2','C2']),['1','2','0','0','0']); });
test('v41 TOCOL, TOROW, WRAPROWS, WRAPCOLS',()=>{ const m={H1:'1',I1:'2',H2:'3',I2:'4'};
  eq(vals(sheet(Object.assign({A1:'=TOCOL(H1:I2)'},m)),col('A1',4)),['1','2','3','4']);
  eq(vals(sheet(Object.assign({A1:'=TOCOL(H1:I2,0,TRUE)'},m)),col('A1',4)),['1','3','2','4']);
  eq(vals(sheet(Object.assign({A1:'=TOROW(H1:I2)'},m)),row('A1',4)),['1','2','3','4']);
  eq(vals(sheet(Object.assign({A1:'=WRAPROWS(H1:I2,3,0)'},m)),['A1','B1','C1','A2','B2','C2']),['1','2','3','4','0','0']);
  eq(vals(sheet(Object.assign({A1:'=WRAPCOLS(H1:I2,2)'},m)),['A1','B1','A2','B2']),['1','3','2','4']); });
test('v41 RANDARRAY shape and range',()=>{ const e=new E.Engine(sheet({A1:'=RANDARRAY(2,3,5,6,TRUE)'})); for(const a of ['A1','B1','C1','A2','B2','C2']){ const p=E.parseAddr(a), v=e.value(0,p.r,p.c); assert.ok(v===5||v===6,a+' '+v); } assert.strictEqual(e.value(0,2,0),null); });
test('v41 matrices',()=>{ const m={C1:'1',D1:'2',C2:'3',D2:'4'};
  eq(ev1('=MDETERM(C1:D2)',m),'-2'); eq(vals(sheet(Object.assign({A1:'=MINVERSE(C1:D2)'},m)),['A1','B1','A2','B2']),['-2','1','1.5','-0.5']);
  eq(vals(sheet(Object.assign({A1:'=MMULT(C1:D2,C1:D2)'},m)),['A1','B1','A2','B2']),['7','10','15','22']);
  eq(vals(sheet({A1:'=MUNIT(2)'}),['A1','B1','A2','B2']),['1','0','0','1']); eq(ev1('=MINVERSE(C1:D2)',{C1:'1',D1:'2',C2:'2',D2:'4'}),'#NUM!');
  const s={C1:'2',C2:'3',C3:'9',D1:'6',D2:'5',D3:'11'}; eq([ev1('=SUMX2MY2(C1:C3,D1:D3)',s),ev1('=SUMX2PY2(C1:C3,D1:D3)',s),ev1('=SUMXMY2(C1:C3,D1:D3)',s)],['-88','276','24']); });
test('v41 math functions',()=>{ eq([ev1('=ACOSH(1)'),ev1('=FACTDOUBLE(7)'),ev1('=COMBINA(4,3)'),ev1('=MULTINOMIAL(2,3,4)'),ev1('=DELTA(5,5)'),ev1('=GESTEP(5,4)'),ev1('=ROMAN(1994)'),ev1('=ARABIC("MCMXCIV")'),ev1('=BASE(255,16)'),ev1('=BASE(7,2,8)'),ev1('=DECIMAL("FF",16)'),ev1('=ROMAN(0)'),ev1('=ROMAN(4000)')],
  ['0','105','20','1260','1','1','MCMXCIV','1994','FF','00000111','255','','#VALUE!']);
  nr('=ASINH(1)',0.881373587); nr('=ATANH(0.5)',0.549306144); nr('=SQRTPI(1)',1.772453851); nr('=ERF(1)',0.842700793,null,1e-8); nr('=ERF(0,1)',0.842700793,null,1e-8); nr('=ERFC(1)',0.157299207,null,1e-8); nr('=COT(1)',0.642092616); nr('=SEC(0)',1); });
test('v41 GAMMALN and GAMMA',()=>{ nr('=GAMMALN(10)',12.8018275,null,1e-6); nr('=GAMMALN(4.5)',2.453736571,null,1e-6); eq(ev1('=GAMMA(5)'),'24'); nr('=GAMMA(0.5)',1.772453851); eq(ev1('=GAMMALN(0)'),'#NUM!'); });
test('v41 base conversion',()=>eq([ev1('=DEC2BIN(10)'),ev1('=DEC2BIN(-1)'),ev1('=DEC2BIN(5,8)'),ev1('=DEC2HEX(255)'),ev1('=DEC2HEX(-1)'),ev1('=DEC2OCT(58)'),ev1('=HEX2DEC("FF")'),ev1('=HEX2DEC("FFFFFFFFFF")'),ev1('=BIN2DEC("1111111111")'),ev1('=BIN2DEC("101")'),ev1('=BIN2HEX("11111011",4)'),ev1('=BIN2OCT("1001")'),ev1('=HEX2BIN("F")'),ev1('=OCT2DEC("7777777777")'),ev1('=DEC2BIN(512)'),ev1('=BIN2DEC("12")')],
  ['1010','1111111111','00000101','FF','FFFFFFFFFF','72','255','-1','-1','5','00FB','11','1111','-1','#NUM!','#NUM!']));
test('v41 bit functions',()=>eq([ev1('=BITAND(12,10)'),ev1('=BITOR(12,10)'),ev1('=BITXOR(12,10)'),ev1('=BITLSHIFT(4,2)'),ev1('=BITRSHIFT(16,2)'),ev1('=BITAND(-1,1)')],['8','14','6','16','4','#NUM!']));
test('v41 AVERAGEA, MAXA, MINA count text as 0 and TRUE as 1',()=>{ const d={C1:'10',C2:'abc',C3:'TRUE',C4:'4'}; eq([ev1('=AVERAGEA(C1:C4)',d),ev1('=MAXA(C1:C4)',d),ev1('=MINA(C1:C4)',d),ev1('=AVERAGEA(C5:C6)')],['3.75','10','0','#DIV/0!']); });
test('v41 SKEW and KURT',()=>{ const d={}; [3,4,5,2,3,4,5,6,4,7].forEach((v,i)=>d['C'+(i+1)]=String(v)); nr('=SKEW(C1:C10)',0.359543,d); nr('=KURT(C1:C10)',-0.151799637,d,1e-6); });
test('v41 PERCENTILE.EXC and QUARTILE.EXC',()=>{ const d={}; [1,2,3,6,6,6,7,8,9].forEach((v,i)=>d['C'+(i+1)]=String(v)); eq([ev1('=PERCENTILE.EXC(C1:C9,0.25)',d),ev1('=PERCENTILE.EXC(C1:C9,0.01)',d),ev1('=QUARTILE.EXC(C1:C9,3)',d)],['2.5','#NUM!','7.5']); });
test('v41 FISHER, CONFIDENCE.NORM, EXPON.DIST',()=>{ nr('=FISHER(0.75)',0.972955); nr('=FISHERINV(0.972955)',0.75,null,1e-5); nr('=CONFIDENCE.NORM(0.05,2.5,50)',0.692952); nr('=EXPON.DIST(0.2,10,TRUE)',0.864665); nr('=EXPON.DIST(0.2,10,FALSE)',1.353353); });
test('v41 t and chi-square distributions',()=>{ nr('=T.DIST(60,1,TRUE)',0.99469533,null,1e-7); nr('=T.DIST(1,10,FALSE)',0.2303619,null,1e-6); nr('=T.DIST.2T(1.959999998,60)',0.054645,null,1e-6); nr('=T.DIST.RT(1.959999998,60)',0.0273225,null,1e-6);
  nr('=T.INV.2T(0.054645,60)',1.96,null,1e-4); nr('=T.INV(0.75,2)',0.8164966,null,1e-6); nr('=T.INV(0.25,2)',-0.8164966,null,1e-6);
  nr('=CHISQ.DIST.RT(18.307,10)',0.0500006,null,1e-6); nr('=CHISQ.DIST(0.5,1,TRUE)',0.52049988,null,1e-6); nr('=CHISQ.DIST(2,3,FALSE)',0.20755375,null,1e-6); nr('=CHISQ.INV.RT(0.050001,10)',18.30697,null,1e-4); });
test('v41 Z.TEST, T.TEST',()=>{ const z={}; [3,6,7,8,6,5,4,2,1,9].forEach((v,i)=>z['C'+(i+1)]=String(v)); nr('=Z.TEST(C1:C10,4)',0.090574,z); nr('=Z.TEST(C1:C10,6)',0.863043,z);
  const t={}; [3,4,5,8,9,1,2,4,5].forEach((v,i)=>t['C'+(i+1)]=String(v)); [6,19,3,2,14,4,5,17,1].forEach((v,i)=>t['D'+(i+1)]=String(v)); nr('=T.TEST(C1:C9,D1:D9,2,1)',0.196016,t); nr('=T.TEST(C1:C9,D1:D9,2,2)',0.191996,t,1e-5); nr('=T.TEST(C1:C9,D1:D9,1,3)',0.101147,t,1e-4); });
test('v41 BINOM.INV, FREQUENCY, TREND, LINEST, STEYX',()=>{ eq(ev1('=BINOM.INV(6,0.5,0.75)'),'4');
  const f={}; [79,85,78,85,50,81,95,88,97].forEach((v,i)=>f['C'+(i+1)]=String(v)); [70,79,89].forEach((v,i)=>f['D'+(i+1)]=String(v)); eq(vals(sheet(Object.assign({A1:'=FREQUENCY(C1:C9,D1:D3)'},f)),col('A1',4)),['1','2','4','2']);
  const l={C1:'3',C2:'5',C3:'7',C4:'9',D1:'1',D2:'2',D3:'3',D4:'4'}; eq(vals(sheet(Object.assign({A1:'=LINEST(C1:C4,D1:D4)'},l)),['A1','B1']),['2','1']); eq(ev1('=TREND(C1:C4,D1:D4,5)',l),'11'); eq(vals(sheet(Object.assign({A1:'=TREND(C1:C4,D1:D4)'},l)),col('A1',4)),['3','5','7','9']);
  nr('=STEYX(C1:C7,D1:D7)',3.305719,{C1:'2',C2:'3',C3:'9',C4:'1',C5:'8',C6:'7',C7:'5',D1:'6',D2:'5',D3:'11',D4:'7',D5:'5',D6:'4',D7:'4'},1e-5); });
test('v41 AGGREGATE',()=>{ const d={C1:'4',C2:'=1/0',C3:'6',C4:'10'}; eq([ev1('=AGGREGATE(9,6,C1:C4)',d),ev1('=AGGREGATE(9,0,C1:C4)',d),ev1('=AGGREGATE(14,6,C1:C4,1)',d),ev1('=AGGREGATE(15,6,C1:C4,2)',d),ev1('=AGGREGATE(4,6,C1:C4)',d),ev1('=AGGREGATE(1,6,C1:C4)',d),ev1('=AGGREGATE(14,6,C1:C4)',d)],['20','#DIV/0!','10','6','10','6.66666666667','#VALUE!']); });
test('v41 RATE, IPMT, PPMT',()=>{ nr('=RATE(48,-200,8000)',0.0077014725,null,1e-9); nr('=IPMT(0.1/12,1,36,8000)',-66.6666667,null,1e-6); nr('=PPMT(0.1/12,1,24,2000)',-75.62318601,null,1e-6); nr('=IPMT(0.1,1,3,1000,0,1)',0); nr('=IPMT(0.1,2,3,1000,0,1)+PPMT(0.1,2,3,1000,0,1)',-365.558912,null,1e-5); eq(ev1('=IPMT(0.1,5,3,1000)'),'#NUM!'); });
test('v41 CUMIPMT and CUMPRINC',()=>{ nr('=CUMIPMT(0.09/12,360,125000,1,1,0)',-937.5,null,1e-6); nr('=CUMIPMT(0.09/12,360,125000,13,24,0)',-11135.23213,null,1e-4); nr('=CUMPRINC(0.09/12,360,125000,13,24,0)',-934.1071234,null,1e-4); eq(ev1('=CUMIPMT(0,360,125000,1,1,0)'),'#NUM!'); });
test('v41 XNPV, XIRR, MIRR',()=>{ const d={C1:'-10000',C2:'2750',C3:'4250',C4:'3250',C5:'2750',D1:'2008-01-01',D2:'2008-03-01',D3:'2008-10-30',D4:'2009-02-15',D5:'2009-04-01'};
  nr('=XNPV(0.09,C1:C5,D1:D5)',2086.647602,d,1e-4); nr('=XIRR(C1:C5,D1:D5)',0.373362535,d,1e-6);
  const m={C1:'-120000',C2:'39000',C3:'30000',C4:'21000',C5:'37000',C6:'46000'}; nr('=MIRR(C1:C6,0.1,0.12)',0.126094,m,1e-6); });
test('v41 EFFECT, NOMINAL, RRI, SYD, DDB, DB, ISPMT, DOLLARDE, DOLLARFR',()=>{ nr('=EFFECT(0.0525,4)',0.053543,null,1e-6); nr('=NOMINAL(0.053543,4)',0.0525,null,1e-6); nr('=RRI(96,10000,11000)',0.000993,null,1e-6); nr('=SYD(30000,7500,10,1)',4090.909091); nr('=SYD(30000,7500,10,10)',409.090909);
  nr('=DDB(2400,300,3650,1)',1.31506849,null,1e-6); nr('=DDB(2400,300,120,1)',40,null,1e-9); nr('=DDB(2400,300,10,1,2)',480); nr('=DDB(2400,300,10,2,1.5)',306); nr('=DDB(2400,300,10,10)',22.1225472,null,1e-6);
  nr('=DB(1000000,100000,6,1,7)',186083.3333,null,1e-3); nr('=DB(1000000,100000,6,2,7)',259639.4167,null,1e-3); nr('=DB(1000000,100000,6,7,7)',15845.0985,null,1e-3);
  nr('=ISPMT(0.1,1,3,8000000)',-533333.3333,null,1e-3); nr('=DOLLARDE(1.02,16)',1.125); nr('=DOLLARFR(1.125,16)',1.02); });
test('v41 ENCODEURL, ARRAYTOTEXT, VALUETOTEXT',()=>eq([ev1('=ENCODEURL("a b&c/한")'),ev1('=ARRAYTOTEXT(C1:C3)',{C1:'1',C2:'a',C3:'TRUE'}),ev1('=ARRAYTOTEXT(C1:C3,1)',{C1:'1',C2:'a',C3:'TRUE'}),ev1('=VALUETOTEXT("x",1)')],['a%20b%26c%2F%ED%95%9C','1, a, TRUE','1, "a", TRUE','"x"']));
test('v41 new functions get the _xlfn prefix in .xlsx and lose it again',()=>{ eq(E.toXl('LET(x,1,x)+XMATCH(1,A1:A2)+NETWORKDAYS.INTL(A1,B1)'),'_xlfn.LET(x,1,x)+_xlfn.XMATCH(1,A1:A2)+NETWORKDAYS.INTL(A1,B1)'); eq(E.fromXl('_xlfn.LET(x,1,x)'),'LET(x,1,x)'); });

console.log(pass+' passed, '+failed+' failed');
process.exit(failed?1:0);
